import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import {
  CreateInventoryLevelDto,
  UpdateInventoryLevelDto,
  SetInventoryDto,
  TransferInventoryDto,
} from '../dto/inventory-level.dto';
import {
  CreateInventoryAdjustmentDto,
  AdjustmentReason,
} from '../dto/inventory-adjustment.dto';

@Injectable()
export class InventoryLevelService {
  private readonly logger = new Logger(InventoryLevelService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Get inventory levels for a location
   */
  async findByLocation(locationId: string, user: UserContext) {
    const location = await this.prisma.inventoryLocation.findUnique({
      where: { id: locationId },
      select: { companyId: true },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    await this.validateCompanyAccess(user, location.companyId);

    const levels = await this.prisma.inventoryLevel.findMany({
      where: { locationId },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
        variant: {
          select: { id: true, name: true, sku: true },
        },
      },
      orderBy: [{ product: { name: 'asc' } }, { variant: { name: 'asc' } }],
    });

    return levels;
  }

  /**
   * Get inventory levels for a product across all locations
   */
  async findByProduct(productId: string, user: UserContext) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { companyId: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.validateCompanyAccess(user, product.companyId);

    const levels = await this.prisma.inventoryLevel.findMany({
      where: { productId },
      include: {
        location: {
          select: { id: true, name: true, code: true, type: true },
        },
        variant: {
          select: { id: true, name: true, sku: true },
        },
      },
      orderBy: { location: { name: 'asc' } },
    });

    return levels;
  }

  /**
   * Get inventory levels for a variant across all locations
   */
  async findByVariant(variantId: string, user: UserContext) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: { companyId: true },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    await this.validateCompanyAccess(user, variant.product.companyId);

    const levels = await this.prisma.inventoryLevel.findMany({
      where: { variantId },
      include: {
        location: {
          select: { id: true, name: true, code: true, type: true },
        },
      },
      orderBy: { location: { name: 'asc' } },
    });

    return levels;
  }

  /**
   * Get a single inventory level
   */
  async findOne(levelId: string, user: UserContext) {
    const level = await this.prisma.inventoryLevel.findUnique({
      where: { id: levelId },
      include: {
        location: true,
        product: {
          select: { id: true, name: true, sku: true, companyId: true },
        },
        variant: {
          select: { id: true, name: true, sku: true },
        },
        adjustments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!level) {
      throw new NotFoundException('Inventory level not found');
    }

    await this.validateCompanyAccess(user, level.location.companyId);

    return level;
  }

  /**
   * Create or update inventory level
   */
  async upsert(dto: CreateInventoryLevelDto, user: UserContext) {
    const location = await this.prisma.inventoryLocation.findUnique({
      where: { id: dto.locationId },
      select: { companyId: true },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    await this.validateCompanyAccess(user, location.companyId);

    // Validate product/variant belongs to same company
    if (dto.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
        select: { companyId: true },
      });
      if (!product || product.companyId !== location.companyId) {
        throw new BadRequestException('Product not found or does not belong to this company');
      }
    }

    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: dto.variantId },
        include: { product: { select: { companyId: true } } },
      });
      if (!variant || variant.product.companyId !== location.companyId) {
        throw new BadRequestException('Variant not found or does not belong to this company');
      }
    }

    const onHand = dto.onHand ?? 0;
    const committed = dto.committed ?? 0;
    const incoming = dto.incoming ?? 0;
    const available = onHand - committed;

    const level = await this.prisma.inventoryLevel.upsert({
      where: {
        locationId_productId_variantId: {
          locationId: dto.locationId,
          productId: dto.productId ?? '',
          variantId: dto.variantId ?? '',
        },
      },
      create: {
        locationId: dto.locationId,
        productId: dto.productId,
        variantId: dto.variantId,
        onHand,
        committed,
        incoming,
        available,
        reorderPoint: dto.reorderPoint,
        reorderQuantity: dto.reorderQuantity,
      },
      update: {
        onHand,
        committed,
        incoming,
        available,
        reorderPoint: dto.reorderPoint,
        reorderQuantity: dto.reorderQuantity,
      },
    });

    return level;
  }

  /**
   * Update inventory level
   */
  async update(levelId: string, dto: UpdateInventoryLevelDto, user: UserContext) {
    const existing = await this.findOne(levelId, user);

    const onHand = dto.onHand ?? existing.onHand;
    const committed = dto.committed ?? existing.committed;
    const incoming = dto.incoming ?? existing.incoming;
    const available = onHand - committed;

    const level = await this.prisma.inventoryLevel.update({
      where: { id: levelId },
      data: {
        onHand,
        committed,
        incoming,
        available,
        reorderPoint: dto.reorderPoint,
        reorderQuantity: dto.reorderQuantity,
      },
    });

    return level;
  }

  /**
   * Set inventory to a specific quantity (creates adjustment)
   */
  async setInventory(dto: SetInventoryDto, userId: string, user: UserContext) {
    const location = await this.prisma.inventoryLocation.findUnique({
      where: { id: dto.locationId },
      select: { companyId: true },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    await this.validateCompanyAccess(user, location.companyId);

    // Find or create inventory level
    let level = await this.prisma.inventoryLevel.findFirst({
      where: {
        locationId: dto.locationId,
        productId: dto.productId ?? null,
        variantId: dto.variantId ?? null,
      },
    });

    const previousQuantity = level?.onHand ?? 0;
    const newQuantity = dto.quantity;
    const adjustmentQuantity = newQuantity - previousQuantity;

    if (!level) {
      level = await this.prisma.inventoryLevel.create({
        data: {
          locationId: dto.locationId,
          productId: dto.productId,
          variantId: dto.variantId,
          onHand: newQuantity,
          available: newQuantity,
        },
      });
    } else {
      level = await this.prisma.inventoryLevel.update({
        where: { id: level.id },
        data: {
          onHand: newQuantity,
          available: newQuantity - level.committed,
        },
      });
    }

    // Create adjustment record
    if (adjustmentQuantity !== 0) {
      await this.prisma.inventoryAdjustment.create({
        data: {
          inventoryLevelId: level.id,
          type: 'COUNT_ADJUSTMENT',
          quantity: adjustmentQuantity,
          previousQuantity,
          newQuantity,
          reason: dto.reason,
          createdById: userId,
        },
      });
    }

    this.logger.log(
      `Set inventory for level ${level.id}: ${previousQuantity} -> ${newQuantity}`,
    );

    return level;
  }

  /**
   * Adjust inventory by a delta amount
   */
  async adjustInventory(dto: CreateInventoryAdjustmentDto, userId: string, user: UserContext) {
    const level = await this.findOne(dto.inventoryLevelId, user);

    const previousQuantity = level.onHand;
    const newQuantity = previousQuantity + dto.quantity;

    if (newQuantity < 0) {
      throw new BadRequestException('Inventory cannot be negative');
    }

    const updatedLevel = await this.prisma.inventoryLevel.update({
      where: { id: dto.inventoryLevelId },
      data: {
        onHand: newQuantity,
        available: newQuantity - level.committed,
      },
    });

    // Create adjustment record
    await this.prisma.inventoryAdjustment.create({
      data: {
        inventoryLevelId: dto.inventoryLevelId,
        type: dto.type,
        quantity: dto.quantity,
        previousQuantity,
        newQuantity,
        reason: dto.reason,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        createdById: userId,
      },
    });

    this.logger.log(
      `Adjusted inventory for level ${dto.inventoryLevelId}: ${previousQuantity} -> ${newQuantity} (${dto.type})`,
    );

    return updatedLevel;
  }

  /**
   * Transfer inventory between locations
   */
  async transferInventory(dto: TransferInventoryDto, userId: string, user: UserContext) {
    // Validate both locations
    const fromLocation = await this.prisma.inventoryLocation.findUnique({
      where: { id: dto.fromLocationId },
      select: { companyId: true },
    });

    const toLocation = await this.prisma.inventoryLocation.findUnique({
      where: { id: dto.toLocationId },
      select: { companyId: true },
    });

    if (!fromLocation || !toLocation) {
      throw new NotFoundException('Location not found');
    }

    if (fromLocation.companyId !== toLocation.companyId) {
      throw new BadRequestException('Cannot transfer between different companies');
    }

    await this.validateCompanyAccess(user, fromLocation.companyId);

    // Get source inventory level
    const fromLevel = await this.prisma.inventoryLevel.findFirst({
      where: {
        locationId: dto.fromLocationId,
        productId: dto.productId ?? null,
        variantId: dto.variantId ?? null,
      },
    });

    if (!fromLevel || fromLevel.available < dto.quantity) {
      throw new BadRequestException('Insufficient inventory at source location');
    }

    // Execute transfer in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Decrease source
      const fromPrevious = fromLevel.onHand;
      const fromNew = fromPrevious - dto.quantity;

      const updatedFromLevel = await tx.inventoryLevel.update({
        where: { id: fromLevel.id },
        data: {
          onHand: fromNew,
          available: fromNew - fromLevel.committed,
        },
      });

      await tx.inventoryAdjustment.create({
        data: {
          inventoryLevelId: fromLevel.id,
          type: 'TRANSFERRED',
          quantity: -dto.quantity,
          previousQuantity: fromPrevious,
          newQuantity: fromNew,
          reason: dto.reason || `Transfer to ${dto.toLocationId}`,
          referenceType: 'TRANSFER',
          referenceId: dto.toLocationId,
          createdById: userId,
        },
      });

      // Find or create destination inventory level
      let toLevel = await tx.inventoryLevel.findFirst({
        where: {
          locationId: dto.toLocationId,
          productId: dto.productId ?? null,
          variantId: dto.variantId ?? null,
        },
      });

      const toPrevious = toLevel?.onHand ?? 0;
      const toNew = toPrevious + dto.quantity;

      if (!toLevel) {
        toLevel = await tx.inventoryLevel.create({
          data: {
            locationId: dto.toLocationId,
            productId: dto.productId,
            variantId: dto.variantId,
            onHand: dto.quantity,
            available: dto.quantity,
          },
        });
      } else {
        toLevel = await tx.inventoryLevel.update({
          where: { id: toLevel.id },
          data: {
            onHand: toNew,
            available: toNew - toLevel.committed,
          },
        });
      }

      await tx.inventoryAdjustment.create({
        data: {
          inventoryLevelId: toLevel.id,
          type: 'TRANSFERRED',
          quantity: dto.quantity,
          previousQuantity: toPrevious,
          newQuantity: toNew,
          reason: dto.reason || `Transfer from ${dto.fromLocationId}`,
          referenceType: 'TRANSFER',
          referenceId: dto.fromLocationId,
          createdById: userId,
        },
      });

      return { from: updatedFromLevel, to: toLevel };
    });

    this.logger.log(
      `Transferred ${dto.quantity} units from ${dto.fromLocationId} to ${dto.toLocationId}`,
    );

    return result;
  }

  /**
   * Get adjustment history for an inventory level
   */
  async getAdjustmentHistory(levelId: string, user: UserContext, limit = 50) {
    const level = await this.findOne(levelId, user);

    const adjustments = await this.prisma.inventoryAdjustment.findMany({
      where: { inventoryLevelId: levelId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return adjustments;
  }

  /**
   * Get low stock items for a company
   */
  async getLowStockItems(companyId: string, user: UserContext) {
    await this.validateCompanyAccess(user, companyId);

    const levels = await this.prisma.inventoryLevel.findMany({
      where: {
        location: { companyId },
        reorderPoint: { not: null },
        available: { lte: this.prisma.inventoryLevel.fields.reorderPoint },
      },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
        product: {
          select: { id: true, name: true, sku: true },
        },
        variant: {
          select: { id: true, name: true, sku: true },
        },
      },
      orderBy: { available: 'asc' },
    });

    // Filter in JavaScript since Prisma can't compare two fields directly
    return levels.filter(
      (level) => level.reorderPoint !== null && level.available <= level.reorderPoint,
    );
  }

  /**
   * Validate user has access to company
   */
  private async validateCompanyAccess(user: UserContext, companyId: string) {
    const hasAccess = await this.hierarchyService.canAccessCompany(user, companyId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this company');
    }
  }
}
