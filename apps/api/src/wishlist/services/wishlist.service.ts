import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { Prisma } from '@prisma/client';
import {
  WishlistData,
  WishlistItemData,
  WishlistItemSnapshot,
  WishlistStats,
} from '../types/wishlist.types';
import {
  AddToWishlistDto,
  UpdateWishlistDto,
  UpdateWishlistItemDto,
} from '../dto/wishlist.dto';
import { AuditAction } from '../../audit-logs/types/audit-log.types';
import { randomBytes } from 'crypto';

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogsService,
  ) {}

  /**
   * Generate a unique session token for anonymous wishlists
   */
  generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate a unique shareable URL slug
   */
  private generateSharedUrl(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Get or create a wishlist for a customer/session
   */
  async getOrCreateWishlist(
    companyId: string,
    options: {
      customerId?: string;
      sessionToken?: string;
      siteId?: string;
      name?: string;
      isPublic?: boolean;
    },
  ): Promise<WishlistData> {
    const { customerId, sessionToken, siteId, name, isPublic } = options;

    // Build OR conditions for finding existing wishlist
    const orConditions: Prisma.WishlistWhereInput[] = [];
    if (customerId) {
      orConditions.push({ customerId });
    }
    if (sessionToken) {
      orConditions.push({ sessionToken });
    }

    // Try to find existing wishlist
    let wishlist = null;
    if (orConditions.length > 0) {
      wishlist = await this.prisma.wishlist.findFirst({
        where: {
          companyId,
          OR: orConditions,
        },
        include: {
          items: {
            include: { product: true },
            orderBy: { priority: 'asc' },
          },
        },
      });
    }

    if (wishlist) {
      return this.mapToWishlistData(wishlist);
    }

    // Create new wishlist
    const newSessionToken = customerId
      ? null
      : sessionToken || this.generateSessionToken();
    const shouldBePublic = isPublic || false;

    wishlist = await this.prisma.wishlist.create({
      data: {
        companyId,
        customerId,
        sessionToken: newSessionToken,
        siteId,
        name: name || 'My Wishlist',
        isPublic: shouldBePublic,
        sharedUrl: shouldBePublic ? this.generateSharedUrl() : null,
      },
      include: {
        items: {
          include: { product: true },
          orderBy: { priority: 'asc' },
        },
      },
    });

    return this.mapToWishlistData(wishlist);
  }

  /**
   * Get wishlist by ID
   */
  async getWishlistById(id: string): Promise<WishlistData> {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    return this.mapToWishlistData(wishlist);
  }

  /**
   * Get wishlist by session token
   */
  async getWishlistBySessionToken(
    sessionToken: string,
    companyId: string,
  ): Promise<WishlistData | null> {
    const wishlist = await this.prisma.wishlist.findFirst({
      where: {
        sessionToken,
        companyId,
      },
      include: {
        items: {
          include: { product: true },
          orderBy: { priority: 'asc' },
        },
      },
    });

    return wishlist ? this.mapToWishlistData(wishlist) : null;
  }

  /**
   * Get wishlist by customer ID
   */
  async getWishlistByCustomerId(
    customerId: string,
    companyId: string,
  ): Promise<WishlistData | null> {
    const wishlist = await this.prisma.wishlist.findFirst({
      where: {
        customerId,
        companyId,
      },
      include: {
        items: {
          include: { product: true },
          orderBy: { priority: 'asc' },
        },
      },
    });

    return wishlist ? this.mapToWishlistData(wishlist) : null;
  }

  /**
   * Get public wishlist by shared URL
   */
  async getWishlistBySharedUrl(sharedUrl: string): Promise<WishlistData | null> {
    const wishlist = await this.prisma.wishlist.findFirst({
      where: {
        sharedUrl,
        isPublic: true,
      },
      include: {
        items: {
          include: { product: true },
          orderBy: { priority: 'asc' },
        },
      },
    });

    return wishlist ? this.mapToWishlistData(wishlist) : null;
  }

  /**
   * Add item to wishlist
   */
  async addItem(
    wishlistId: string,
    dto: AddToWishlistDto,
    actorId?: string,
  ): Promise<WishlistData> {
    // Get wishlist and product in parallel
    const [wishlist, product] = await Promise.all([
      this.prisma.wishlist.findUnique({ where: { id: wishlistId } }),
      this.prisma.product.findUnique({ where: { id: dto.productId } }),
    ]);

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // SECURITY: Validate product belongs to the same company as the wishlist
    if (product.companyId !== wishlist.companyId) {
      throw new ForbiddenException('Product does not belong to this company');
    }

    if (product.status !== 'ACTIVE' || !product.isVisible) {
      throw new BadRequestException('Product is not available');
    }

    // Check if item already exists in wishlist
    const existingItem = await this.prisma.wishlistItem.findFirst({
      where: {
        wishlistId,
        productId: dto.productId,
        variantId: dto.variantId || null,
      },
    });

    if (existingItem) {
      // Update existing item's priority and notes if provided
      await this.prisma.wishlistItem.update({
        where: { id: existingItem.id },
        data: {
          priority: dto.priority ?? existingItem.priority,
          notes: dto.notes ?? existingItem.notes,
        },
      });
    } else {
      // Create product snapshot
      const images = product.images as { url?: string }[] | null;
      const productSnapshot: WishlistItemSnapshot = {
        name: product.name,
        sku: product.sku,
        image: images?.[0]?.url,
        price: Number(product.price),
        compareAtPrice: product.compareAtPrice
          ? Number(product.compareAtPrice)
          : undefined,
      };

      // Add new item
      await this.prisma.wishlistItem.create({
        data: {
          wishlistId,
          productId: dto.productId,
          variantId: dto.variantId,
          productSnapshot: productSnapshot as unknown as Prisma.InputJsonValue,
          priority: dto.priority || 100,
          notes: dto.notes,
        },
      });

      // Update item count
      await this.updateItemCount(wishlistId);
    }

    // Audit log
    if (actorId) {
      await this.auditLogService.log(
        AuditAction.CREATE,
        'WishlistItem',
        wishlistId,
        {
          userId: actorId,
          changes: {
            productId: { before: null, after: dto.productId },
          },
        },
      );
    }

    return this.getWishlistById(wishlistId);
  }

  /**
   * Update wishlist item
   */
  async updateItem(
    wishlistId: string,
    itemId: string,
    dto: UpdateWishlistItemDto,
    actorId?: string,
  ): Promise<WishlistData> {
    const item = await this.prisma.wishlistItem.findFirst({
      where: { id: itemId, wishlistId },
    });

    if (!item) {
      throw new NotFoundException('Wishlist item not found');
    }

    const updateData: Prisma.WishlistItemUpdateInput = {};

    if (dto.priority !== undefined) {
      updateData.priority = dto.priority;
    }
    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    await this.prisma.wishlistItem.update({
      where: { id: itemId },
      data: updateData,
    });

    if (actorId) {
      await this.auditLogService.log(AuditAction.UPDATE, 'WishlistItem', itemId, {
        userId: actorId,
        metadata: dto as unknown as Record<string, unknown>,
      });
    }

    return this.getWishlistById(wishlistId);
  }

  /**
   * Remove item from wishlist
   */
  async removeItem(
    wishlistId: string,
    itemId: string,
    actorId?: string,
  ): Promise<WishlistData> {
    const item = await this.prisma.wishlistItem.findFirst({
      where: { id: itemId, wishlistId },
    });

    if (!item) {
      throw new NotFoundException('Wishlist item not found');
    }

    await this.prisma.wishlistItem.delete({
      where: { id: itemId },
    });

    await this.updateItemCount(wishlistId);

    if (actorId) {
      await this.auditLogService.log(AuditAction.DELETE, 'WishlistItem', itemId, {
        userId: actorId,
        metadata: { productId: item.productId },
      });
    }

    return this.getWishlistById(wishlistId);
  }

  /**
   * Update wishlist metadata
   */
  async updateWishlist(
    id: string,
    dto: UpdateWishlistDto,
    actorId?: string,
  ): Promise<WishlistData> {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id },
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    const updateData: Prisma.WishlistUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    if (dto.isPublic !== undefined) {
      updateData.isPublic = dto.isPublic;
      // Generate or clear shared URL based on public status
      if (dto.isPublic && !wishlist.sharedUrl) {
        updateData.sharedUrl = this.generateSharedUrl();
      } else if (!dto.isPublic) {
        updateData.sharedUrl = null;
      }
    }

    await this.prisma.wishlist.update({
      where: { id },
      data: updateData,
    });

    if (actorId) {
      await this.auditLogService.log(AuditAction.UPDATE, 'Wishlist', id, {
        userId: actorId,
        metadata: dto as unknown as Record<string, unknown>,
      });
    }

    return this.getWishlistById(id);
  }

  /**
   * Clear all items from wishlist
   */
  async clearWishlist(id: string, actorId?: string): Promise<WishlistData> {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id },
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    await this.prisma.wishlistItem.deleteMany({
      where: { wishlistId: id },
    });

    await this.prisma.wishlist.update({
      where: { id },
      data: { itemCount: 0 },
    });

    if (actorId) {
      await this.auditLogService.log(AuditAction.DELETE, 'Wishlist', id, {
        userId: actorId,
        metadata: { action: 'clear' },
      });
    }

    return this.getWishlistById(id);
  }

  /**
   * Share/unshare wishlist (alias for setPublic)
   */
  async shareWishlist(
    id: string,
    isPublic: boolean,
    actorId?: string,
  ): Promise<WishlistData> {
    return this.setPublic(id, isPublic, actorId);
  }

  /**
   * Set wishlist public/private sharing status
   */
  async setPublic(
    id: string,
    isPublic: boolean,
    actorId?: string,
  ): Promise<WishlistData> {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id },
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    const updateData: Prisma.WishlistUpdateInput = {
      isPublic,
    };

    // Generate shared URL when making public (if not already exists)
    if (isPublic && !wishlist.sharedUrl) {
      updateData.sharedUrl = this.generateSharedUrl();
    } else if (!isPublic) {
      // Clear shared URL when making private
      updateData.sharedUrl = null;
    }

    await this.prisma.wishlist.update({
      where: { id },
      data: updateData,
    });

    if (actorId) {
      await this.auditLogService.log(AuditAction.UPDATE, 'Wishlist', id, {
        userId: actorId,
        changes: {
          isPublic: { before: wishlist.isPublic, after: isPublic },
        },
      });
    }

    return this.getWishlistById(id);
  }

  /**
   * Merge wishlists (e.g., when anonymous user logs in)
   * Moves all items from source (anonymous) wishlist to target (customer) wishlist
   */
  async mergeWishlists(
    sourceId: string,
    targetId: string,
    actorId?: string,
  ): Promise<WishlistData> {
    const [sourceWishlist, targetWishlist] = await Promise.all([
      this.prisma.wishlist.findUnique({
        where: { id: sourceId },
        include: { items: true },
      }),
      this.prisma.wishlist.findUnique({
        where: { id: targetId },
      }),
    ]);

    if (!sourceWishlist) {
      throw new NotFoundException('Source wishlist not found');
    }

    if (!targetWishlist) {
      throw new NotFoundException('Target wishlist not found');
    }

    // Validate same company
    if (sourceWishlist.companyId !== targetWishlist.companyId) {
      throw new ForbiddenException(
        'Cannot merge wishlists from different companies',
      );
    }

    // Move items from source to target
    for (const item of sourceWishlist.items) {
      // Check if product already exists in target
      const existingItem = await this.prisma.wishlistItem.findFirst({
        where: {
          wishlistId: targetId,
          productId: item.productId,
          variantId: item.variantId,
        },
      });

      if (!existingItem) {
        // Add item to target wishlist
        await this.prisma.wishlistItem.create({
          data: {
            wishlistId: targetId,
            productId: item.productId,
            variantId: item.variantId,
            productSnapshot: item.productSnapshot as Prisma.InputJsonValue,
            priority: item.priority,
            notes: item.notes,
          },
        });
      }
    }

    // Delete source wishlist (cascade deletes items)
    await this.prisma.wishlist.delete({
      where: { id: sourceId },
    });

    // Update target item count
    await this.updateItemCount(targetId);

    if (actorId) {
      await this.auditLogService.log(AuditAction.UPDATE, 'Wishlist', targetId, {
        userId: actorId,
        metadata: {
          action: 'merge',
          sourceWishlistId: sourceId,
          itemsMerged: sourceWishlist.items.length,
        },
      });
    }

    return this.getWishlistById(targetId);
  }

  /**
   * Reorder wishlist items
   */
  async reorderItems(
    wishlistId: string,
    itemIds: string[],
    actorId?: string,
  ): Promise<WishlistData> {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id: wishlistId },
      include: { items: true },
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    // Validate all itemIds belong to this wishlist
    const wishlistItemIds = new Set(wishlist.items.map((i) => i.id));
    for (const itemId of itemIds) {
      if (!wishlistItemIds.has(itemId)) {
        throw new BadRequestException(
          `Item ${itemId} does not belong to this wishlist`,
        );
      }
    }

    // Update priorities based on order in array
    await Promise.all(
      itemIds.map((itemId, index) =>
        this.prisma.wishlistItem.update({
          where: { id: itemId },
          data: { priority: index + 1 },
        }),
      ),
    );

    if (actorId) {
      await this.auditLogService.log(AuditAction.UPDATE, 'Wishlist', wishlistId, {
        userId: actorId,
        metadata: { action: 'reorder', itemIds },
      });
    }

    return this.getWishlistById(wishlistId);
  }

  /**
   * Check if a product is in the wishlist
   */
  async isProductInWishlist(
    wishlistId: string,
    productId: string,
    variantId?: string,
  ): Promise<boolean> {
    const item = await this.prisma.wishlistItem.findFirst({
      where: {
        wishlistId,
        productId,
        variantId: variantId || null,
      },
    });

    return !!item;
  }

  /**
   * Get wishlist item by product ID
   */
  async getItemByProductId(
    wishlistId: string,
    productId: string,
    variantId?: string,
  ): Promise<WishlistItemData | null> {
    const item = await this.prisma.wishlistItem.findFirst({
      where: {
        wishlistId,
        productId,
        variantId: variantId || null,
      },
      include: { product: true },
    });

    return item ? this.mapToWishlistItemData(item) : null;
  }

  /**
   * Get wishlist statistics
   */
  async getWishlistStats(wishlistId: string): Promise<WishlistStats> {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { id: wishlistId },
      include: { items: true },
    });

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    const items = wishlist.items;
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => {
      const snapshot = item.productSnapshot as { price?: number };
      return sum + (snapshot?.price || 0);
    }, 0);

    const dates = items.map((item) => item.addedAt);
    const oldestItemDate =
      dates.length > 0
        ? new Date(Math.min(...dates.map((d) => d.getTime())))
        : undefined;
    const newestItemDate =
      dates.length > 0
        ? new Date(Math.max(...dates.map((d) => d.getTime())))
        : undefined;

    return {
      totalItems,
      totalValue,
      oldestItemDate,
      newestItemDate,
    };
  }

  /**
   * Update item count on wishlist
   */
  private async updateItemCount(wishlistId: string): Promise<void> {
    const count = await this.prisma.wishlistItem.count({
      where: { wishlistId },
    });

    await this.prisma.wishlist.update({
      where: { id: wishlistId },
      data: { itemCount: count },
    });
  }

  /**
   * Convert Prisma wishlist to WishlistData
   */
  private mapToWishlistData(wishlist: any): WishlistData {
    return {
      id: wishlist.id,
      companyId: wishlist.companyId,
      siteId: wishlist.siteId || undefined,
      customerId: wishlist.customerId || undefined,
      sessionToken: wishlist.sessionToken || undefined,
      name: wishlist.name,
      isPublic: wishlist.isPublic,
      sharedUrl: wishlist.sharedUrl || undefined,
      items:
        wishlist.items?.map((item: any) => this.mapToWishlistItemData(item)) ||
        [],
      itemCount: wishlist.itemCount,
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt,
    };
  }

  /**
   * Convert Prisma wishlist item to WishlistItemData
   */
  private mapToWishlistItemData(item: any): WishlistItemData {
    return {
      id: item.id,
      wishlistId: item.wishlistId,
      productId: item.productId,
      variantId: item.variantId || undefined,
      productSnapshot: item.productSnapshot as WishlistItemSnapshot,
      priority: item.priority,
      notes: item.notes || undefined,
      addedAt: item.addedAt,
    };
  }
}
