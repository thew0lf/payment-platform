import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuditAction } from '../../audit-logs/types/audit-log.types';
import {
  ComparisonData,
  ComparisonItemData,
  ProductComparisonSnapshot,
  ShareComparisonResult,
  MAX_COMPARISON_ITEMS,
  DEFAULT_COMPARISON_EXPIRY_DAYS,
  DEFAULT_SHARED_COMPARISON_EXPIRY_DAYS,
} from '../types/comparison.types';
import {
  CreateComparisonDto,
  AddToComparisonDto,
  UpdateComparisonDto,
  ShareComparisonDto,
  ReorderItemsDto,
} from '../dto/comparison.dto';

@Injectable()
export class ComparisonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogsService,
  ) {}

  /**
   * Generate a unique session token for anonymous comparisons
   */
  generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate a unique share token
   */
  private generateShareToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Get or create a comparison for the given context
   */
  async getOrCreateComparison(
    companyId: string,
    options: {
      sessionToken?: string;
      customerId?: string;
      visitorId?: string;
      siteId?: string;
      name?: string;
    },
  ): Promise<ComparisonData> {
    // Try to find existing comparison
    let comparison = await this.prisma.productComparison.findFirst({
      where: {
        companyId,
        mergedIntoComparisonId: null, // Not merged
        OR: [
          { sessionToken: options.sessionToken },
          { customerId: options.customerId },
          { visitorId: options.visitorId },
        ].filter((condition) =>
          Object.values(condition).some((v) => v !== undefined),
        ),
      },
      include: {
        items: {
          include: { product: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!comparison) {
      // Create new comparison
      const sessionToken = options.sessionToken || this.generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + DEFAULT_COMPARISON_EXPIRY_DAYS);

      comparison = await this.prisma.productComparison.create({
        data: {
          companyId,
          sessionToken,
          customerId: options.customerId,
          visitorId: options.visitorId,
          siteId: options.siteId,
          name: options.name,
          expiresAt,
        },
        include: {
          items: {
            include: { product: true },
            orderBy: { position: 'asc' },
          },
        },
      });
    }

    return this.toComparisonData(comparison);
  }

  /**
   * Get comparison by ID
   */
  async getComparisonById(id: string): Promise<ComparisonData> {
    const comparison = await this.prisma.productComparison.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    return this.toComparisonData(comparison);
  }

  /**
   * Get comparison by session token
   */
  async getComparisonBySessionToken(
    sessionToken: string,
    companyId: string,
  ): Promise<ComparisonData | null> {
    const comparison = await this.prisma.productComparison.findFirst({
      where: {
        sessionToken,
        companyId,
        mergedIntoComparisonId: null,
      },
      include: {
        items: {
          include: { product: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    return comparison ? this.toComparisonData(comparison) : null;
  }

  /**
   * Get comparison by customer ID
   */
  async getComparisonByCustomerId(
    customerId: string,
    companyId: string,
  ): Promise<ComparisonData | null> {
    const comparison = await this.prisma.productComparison.findFirst({
      where: {
        customerId,
        companyId,
        mergedIntoComparisonId: null,
      },
      include: {
        items: {
          include: { product: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    return comparison ? this.toComparisonData(comparison) : null;
  }

  /**
   * Get shared comparison by share token
   */
  async getComparisonByShareToken(
    shareToken: string,
  ): Promise<ComparisonData | null> {
    const comparison = await this.prisma.productComparison.findFirst({
      where: {
        shareToken,
        isShared: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        items: {
          include: { product: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    return comparison ? this.toComparisonData(comparison) : null;
  }

  /**
   * Add product to comparison (max 4 items)
   */
  async addItem(
    comparisonId: string,
    dto: AddToComparisonDto,
    actorId?: string,
  ): Promise<ComparisonData> {
    // Get comparison and product
    const [comparison, product] = await Promise.all([
      this.prisma.productComparison.findUnique({
        where: { id: comparisonId },
        include: { items: true },
      }),
      this.prisma.product.findUnique({ where: { id: dto.productId } }),
    ]);

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // SECURITY: Validate product belongs to the same company as the comparison
    if (product.companyId !== comparison.companyId) {
      throw new ForbiddenException('Product does not belong to this company');
    }

    if (product.status !== 'ACTIVE' || !product.isVisible) {
      throw new BadRequestException('Product is not available');
    }

    // Check max items limit
    if (comparison.items.length >= MAX_COMPARISON_ITEMS) {
      throw new BadRequestException(
        `Maximum of ${MAX_COMPARISON_ITEMS} items allowed in comparison`,
      );
    }

    // Check if product already exists in comparison
    const existingItem = comparison.items.find(
      (item) =>
        item.productId === dto.productId &&
        item.variantId === (dto.variantId || null),
    );

    if (existingItem) {
      throw new BadRequestException('Product already in comparison');
    }

    // Calculate position
    const position =
      dto.position !== undefined
        ? dto.position
        : comparison.items.length;

    // Shift existing items if inserting at specific position
    if (dto.position !== undefined && dto.position < comparison.items.length) {
      await this.prisma.productComparisonItem.updateMany({
        where: {
          comparisonId,
          position: { gte: dto.position },
        },
        data: {
          position: { increment: 1 },
        },
      });
    }

    // Create product snapshot
    const productSnapshot: ProductComparisonSnapshot = {
      name: product.name,
      sku: product.sku,
      image: (product.images as unknown as Array<{ url: string }>)?.[0]?.url,
      price: Number(product.price),
      compareAtPrice: product.compareAtPrice
        ? Number(product.compareAtPrice)
        : undefined,
      currency: 'USD', // TODO: Get from company settings
      description: product.description || undefined,
      attributes: (product.attributes as Record<string, string | number | boolean>) || undefined,
    };

    // Add new item
    await this.prisma.productComparisonItem.create({
      data: {
        comparisonId,
        productId: dto.productId,
        variantId: dto.variantId,
        productSnapshot: productSnapshot as unknown as Prisma.InputJsonValue,
        position,
      },
    });

    // Update comparison timestamp
    await this.prisma.productComparison.update({
      where: { id: comparisonId },
      data: { updatedAt: new Date() },
    });

    // Audit log
    if (actorId) {
      await this.auditLogService.log(AuditAction.CREATE, 'ProductComparisonItem', comparisonId, {
        userId: actorId,
        changes: {
          productId: { before: null, after: dto.productId },
          position: { before: null, after: position },
        },
      });
    }

    return this.getComparisonById(comparisonId);
  }

  /**
   * Remove item from comparison
   */
  async removeItem(
    comparisonId: string,
    itemId: string,
    actorId?: string,
  ): Promise<ComparisonData> {
    const item = await this.prisma.productComparisonItem.findFirst({
      where: { id: itemId, comparisonId },
    });

    if (!item) {
      throw new NotFoundException('Comparison item not found');
    }

    // Delete the item
    await this.prisma.productComparisonItem.delete({
      where: { id: itemId },
    });

    // Reorder remaining items to close the gap
    await this.prisma.productComparisonItem.updateMany({
      where: {
        comparisonId,
        position: { gt: item.position },
      },
      data: {
        position: { decrement: 1 },
      },
    });

    // Update comparison timestamp
    await this.prisma.productComparison.update({
      where: { id: comparisonId },
      data: { updatedAt: new Date() },
    });

    // Audit log
    if (actorId) {
      await this.auditLogService.log(AuditAction.DELETE, 'ProductComparisonItem', itemId, {
        userId: actorId,
        metadata: { productId: item.productId },
      });
    }

    return this.getComparisonById(comparisonId);
  }

  /**
   * Reorder items in comparison
   */
  async reorderItems(
    comparisonId: string,
    dto: ReorderItemsDto,
    actorId?: string,
  ): Promise<ComparisonData> {
    const comparison = await this.prisma.productComparison.findUnique({
      where: { id: comparisonId },
      include: { items: true },
    });

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    // Validate all item IDs belong to this comparison
    const existingItemIds = new Set(comparison.items.map((item) => item.id));
    for (const itemId of dto.itemIds) {
      if (!existingItemIds.has(itemId)) {
        throw new BadRequestException(`Item ${itemId} not found in comparison`);
      }
    }

    // Validate all existing items are included
    if (dto.itemIds.length !== comparison.items.length) {
      throw new BadRequestException(
        'All comparison items must be included in reorder',
      );
    }

    // Update positions
    await Promise.all(
      dto.itemIds.map((itemId, index) =>
        this.prisma.productComparisonItem.update({
          where: { id: itemId },
          data: { position: index },
        }),
      ),
    );

    // Update comparison timestamp
    await this.prisma.productComparison.update({
      where: { id: comparisonId },
      data: { updatedAt: new Date() },
    });

    // Audit log
    if (actorId) {
      await this.auditLogService.log(AuditAction.UPDATE, 'ProductComparison', comparisonId, {
        userId: actorId,
        metadata: { action: 'reorder', itemIds: dto.itemIds },
      });
    }

    return this.getComparisonById(comparisonId);
  }

  /**
   * Update comparison metadata
   */
  async updateComparison(
    id: string,
    dto: UpdateComparisonDto,
    actorId?: string,
  ): Promise<ComparisonData> {
    const comparison = await this.prisma.productComparison.findUnique({
      where: { id },
    });

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    const updateData: Prisma.ProductComparisonUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    await this.prisma.productComparison.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    if (actorId) {
      await this.auditLogService.log(AuditAction.UPDATE, 'ProductComparison', id, {
        userId: actorId,
        metadata: dto as unknown as Record<string, unknown>,
      });
    }

    return this.getComparisonById(id);
  }

  /**
   * Clear all items from comparison
   */
  async clearComparison(id: string, actorId?: string): Promise<ComparisonData> {
    const comparison = await this.prisma.productComparison.findUnique({
      where: { id },
    });

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    await this.prisma.productComparisonItem.deleteMany({
      where: { comparisonId: id },
    });

    await this.prisma.productComparison.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // Audit log
    if (actorId) {
      await this.auditLogService.log(AuditAction.DELETE, 'ProductComparison', id, {
        userId: actorId,
        metadata: { action: 'clear' },
      });
    }

    return this.getComparisonById(id);
  }

  /**
   * Create share link for comparison
   */
  async shareComparison(
    id: string,
    dto: ShareComparisonDto,
    actorId?: string,
  ): Promise<ShareComparisonResult> {
    const comparison = await this.prisma.productComparison.findUnique({
      where: { id },
    });

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    const shareToken = this.generateShareToken();
    const expiresInDays = dto.expiresInDays || DEFAULT_SHARED_COMPARISON_EXPIRY_DAYS;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await this.prisma.productComparison.update({
      where: { id },
      data: {
        shareToken,
        isShared: true,
        sharedAt: new Date(),
        expiresAt,
        name: dto.name || comparison.name,
      },
    });

    // Audit log
    if (actorId) {
      await this.auditLogService.log(AuditAction.UPDATE, 'ProductComparison', id, {
        userId: actorId,
        metadata: { action: 'share', expiresInDays },
      });
    }

    // TODO: Get base URL from config
    const baseUrl = process.env.COMPANY_PORTAL_URL || 'http://localhost:3003';
    const shareUrl = `${baseUrl}/compare/${shareToken}`;

    return {
      comparisonId: id,
      shareToken,
      shareUrl,
      expiresAt,
    };
  }

  /**
   * Remove share link from comparison
   */
  async unshareComparison(id: string, actorId?: string): Promise<ComparisonData> {
    const comparison = await this.prisma.productComparison.findUnique({
      where: { id },
    });

    if (!comparison) {
      throw new NotFoundException('Comparison not found');
    }

    await this.prisma.productComparison.update({
      where: { id },
      data: {
        shareToken: null,
        isShared: false,
        sharedAt: null,
      },
    });

    // Audit log
    if (actorId) {
      await this.auditLogService.log(AuditAction.UPDATE, 'ProductComparison', id, {
        userId: actorId,
        metadata: { action: 'unshare' },
      });
    }

    return this.getComparisonById(id);
  }

  /**
   * Merge anonymous comparison into user's comparison
   */
  async mergeComparisons(
    sourceId: string,
    targetId: string,
    actorId?: string,
  ): Promise<ComparisonData> {
    const [sourceComparison, targetComparison] = await Promise.all([
      this.prisma.productComparison.findUnique({
        where: { id: sourceId },
        include: { items: { orderBy: { position: 'asc' } } },
      }),
      this.prisma.productComparison.findUnique({
        where: { id: targetId },
        include: { items: true },
      }),
    ]);

    if (!sourceComparison) {
      throw new NotFoundException('Source comparison not found');
    }

    if (!targetComparison) {
      throw new NotFoundException('Target comparison not found');
    }

    // Validate both comparisons belong to the same company
    if (sourceComparison.companyId !== targetComparison.companyId) {
      throw new ForbiddenException('Cannot merge comparisons from different companies');
    }

    // Get existing product IDs in target
    const existingProductIds = new Set(
      targetComparison.items.map(
        (item) => `${item.productId}-${item.variantId || ''}`,
      ),
    );

    // Calculate starting position for new items
    let nextPosition = targetComparison.items.length;

    // Add items from source that don't exist in target (respecting max limit)
    for (const item of sourceComparison.items) {
      const itemKey = `${item.productId}-${item.variantId || ''}`;
      if (!existingProductIds.has(itemKey) && nextPosition < MAX_COMPARISON_ITEMS) {
        await this.prisma.productComparisonItem.create({
          data: {
            comparisonId: targetId,
            productId: item.productId,
            variantId: item.variantId,
            productSnapshot: item.productSnapshot as unknown as Prisma.InputJsonValue,
            position: nextPosition,
          },
        });
        nextPosition++;
      }
    }

    // Mark source comparison as merged
    await this.prisma.productComparison.update({
      where: { id: sourceId },
      data: {
        mergedIntoComparisonId: targetId,
        mergedAt: new Date(),
      },
    });

    // Delete source comparison items
    await this.prisma.productComparisonItem.deleteMany({
      where: { comparisonId: sourceId },
    });

    // Update target comparison timestamp
    await this.prisma.productComparison.update({
      where: { id: targetId },
      data: { updatedAt: new Date() },
    });

    // Audit log
    if (actorId) {
      await this.auditLogService.log(AuditAction.UPDATE, 'ProductComparison', targetId, {
        userId: actorId,
        metadata: { action: 'merge', sourceComparisonId: sourceId },
      });
    }

    return this.getComparisonById(targetId);
  }

  /**
   * Convert Prisma comparison to ComparisonData
   */
  private toComparisonData(comparison: any): ComparisonData {
    return {
      id: comparison.id,
      companyId: comparison.companyId,
      siteId: comparison.siteId || undefined,
      customerId: comparison.customerId || undefined,
      sessionToken: comparison.sessionToken || undefined,
      visitorId: comparison.visitorId || undefined,
      name: comparison.name || undefined,
      shareToken: comparison.shareToken || undefined,
      isShared: comparison.isShared,
      items:
        comparison.items?.map((item: any) => this.toComparisonItemData(item)) ||
        [],
      createdAt: comparison.createdAt,
      updatedAt: comparison.updatedAt,
      expiresAt: comparison.expiresAt || undefined,
    };
  }

  /**
   * Convert Prisma comparison item to ComparisonItemData
   */
  private toComparisonItemData(item: any): ComparisonItemData {
    return {
      id: item.id,
      comparisonId: item.comparisonId,
      productId: item.productId,
      variantId: item.variantId || undefined,
      productSnapshot: item.productSnapshot as ProductComparisonSnapshot,
      position: item.position,
      addedAt: item.addedAt,
    };
  }
}
