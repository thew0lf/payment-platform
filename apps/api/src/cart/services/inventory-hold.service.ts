import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyCartSettingsService } from './company-cart-settings.service';
import { Cron } from '@nestjs/schedule';
import { InventoryHoldStatus } from '@prisma/client';

export interface InventoryHold {
  id: string;
  cartId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  expiresAt: Date;
  status: InventoryHoldStatus;
}

export interface InventoryAvailability {
  productId: string;
  variantId?: string;
  totalStock: number;
  reserved: number;
  available: number;
  isAvailable: boolean;
}

export interface HoldConfig {
  enabled: boolean;
  holdDurationMinutes: number;
  allowOversell: boolean;
  showLowStockWarning: boolean;
  lowStockThreshold: number;
}

const DEFAULT_CONFIG: HoldConfig = {
  enabled: true,
  holdDurationMinutes: 15,
  allowOversell: false,
  showLowStockWarning: true,
  lowStockThreshold: 5,
};

@Injectable()
export class InventoryHoldService {
  private readonly logger = new Logger(InventoryHoldService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly companyCartSettingsService: CompanyCartSettingsService,
  ) {}

  /**
   * Create inventory holds for cart items
   */
  async createHoldsForCart(cartId: string, companyId: string): Promise<InventoryHold[]> {
    const config = await this.getConfig(companyId);

    if (!config.enabled) {
      return [];
    }

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (!cart) {
      throw new BadRequestException('Hmm, we can\'t find that cart. It may have expired or been removed.');
    }

    const holds: InventoryHold[] = [];
    const expiresAt = new Date(Date.now() + config.holdDurationMinutes * 60 * 1000);

    for (const item of cart.items) {
      // Check availability
      const availability = await this.checkAvailability(
        item.productId,
        item.variantId || undefined,
        companyId,
      );

      if (!availability.isAvailable && !config.allowOversell) {
        // Don't expose internal productId to customers - use generic message
        throw new BadRequestException(
          'Sorry, one or more items in your cart are no longer available in the requested quantity.',
        );
      }

      // Create or update hold
      const hold = await this.prisma.inventoryHold.upsert({
        where: {
          cartId_productId_variantId: {
            cartId,
            productId: item.productId,
            variantId: item.variantId || '',
          },
        },
        create: {
          cartId,
          productId: item.productId,
          variantId: item.variantId,
          companyId,
          quantity: item.quantity,
          expiresAt,
          status: 'ACTIVE',
        },
        update: {
          quantity: item.quantity,
          expiresAt,
          status: 'ACTIVE',
        },
      });

      holds.push({
        id: hold.id,
        cartId: hold.cartId,
        productId: hold.productId,
        variantId: hold.variantId || undefined,
        quantity: hold.quantity,
        expiresAt: hold.expiresAt,
        status: hold.status,
      });
    }

    this.logger.log(`Created ${holds.length} inventory holds for cart ${cartId}`);

    return holds;
  }

  /**
   * Release holds when cart is abandoned or items removed
   */
  async releaseHoldsForCart(cartId: string): Promise<number> {
    const result = await this.prisma.inventoryHold.updateMany({
      where: {
        cartId,
        status: 'ACTIVE',
      },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
    });

    if (result.count > 0) {
      this.logger.log(`Released ${result.count} holds for cart ${cartId}`);
    }

    return result.count;
  }

  /**
   * Release hold for a specific item
   */
  async releaseHoldForItem(
    cartId: string,
    productId: string,
    variantId?: string,
  ): Promise<boolean> {
    const result = await this.prisma.inventoryHold.updateMany({
      where: {
        cartId,
        productId,
        variantId: variantId || '',
        status: 'ACTIVE',
      },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
    });

    return result.count > 0;
  }

  /**
   * Convert holds to permanent reservation (on order completion)
   */
  async convertHoldsToOrder(cartId: string, orderId: string): Promise<number> {
    const result = await this.prisma.inventoryHold.updateMany({
      where: {
        cartId,
        status: 'ACTIVE',
      },
      data: {
        status: 'CONVERTED',
        orderId,
        convertedAt: new Date(),
      },
    });

    if (result.count > 0) {
      this.logger.log(`Converted ${result.count} holds to order ${orderId}`);
    }

    return result.count;
  }

  /**
   * Check inventory availability for a product
   */
  async checkAvailability(
    productId: string,
    variantId: string | undefined,
    companyId: string,
  ): Promise<InventoryAvailability> {
    // Get product stock
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        companyId,
        deletedAt: null,
      },
      select: {
        stockQuantity: true,
        trackInventory: true,
      },
    });

    if (!product) {
      return {
        productId,
        variantId,
        totalStock: 0,
        reserved: 0,
        available: 0,
        isAvailable: false,
      };
    }

    // If not tracking inventory, always available
    if (!product.trackInventory) {
      return {
        productId,
        variantId,
        totalStock: 999999,
        reserved: 0,
        available: 999999,
        isAvailable: true,
      };
    }

    // Get active holds for this product
    const activeHolds = await this.prisma.inventoryHold.aggregate({
      where: {
        productId,
        variantId: variantId || '',
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      _sum: { quantity: true },
    });

    const totalStock = product.stockQuantity || 0;
    const reserved = activeHolds._sum.quantity || 0;
    const available = Math.max(0, totalStock - reserved);

    return {
      productId,
      variantId,
      totalStock,
      reserved,
      available,
      isAvailable: available > 0,
    };
  }

  /**
   * Check availability for multiple products (batch query to avoid N+1)
   */
  async checkBulkAvailability(
    items: Array<{ productId: string; variantId?: string; quantity: number }>,
    companyId: string,
  ): Promise<Map<string, InventoryAvailability>> {
    const results = new Map<string, InventoryAvailability>();

    if (items.length === 0) {
      return results;
    }

    const productIds = [...new Set(items.map((i) => i.productId))];

    // Batch fetch all products
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        stockQuantity: true,
        trackInventory: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Batch fetch all active holds for these products
    const holds = await this.prisma.inventoryHold.findMany({
      where: {
        productId: { in: productIds },
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      select: {
        productId: true,
        variantId: true,
        quantity: true,
      },
    });

    // Group holds by product:variant key
    const holdMap = new Map<string, number>();
    for (const hold of holds) {
      const key = `${hold.productId}:${hold.variantId || ''}`;
      holdMap.set(key, (holdMap.get(key) || 0) + hold.quantity);
    }

    // Compute availability for each requested item
    for (const item of items) {
      const key = `${item.productId}:${item.variantId || ''}`;
      const product = productMap.get(item.productId);

      if (!product) {
        results.set(key, {
          productId: item.productId,
          variantId: item.variantId,
          totalStock: 0,
          reserved: 0,
          available: 0,
          isAvailable: false,
        });
        continue;
      }

      // Products not tracking inventory are always available
      if (!product.trackInventory) {
        results.set(key, {
          productId: item.productId,
          variantId: item.variantId,
          totalStock: 999999,
          reserved: 0,
          available: 999999,
          isAvailable: true,
        });
        continue;
      }

      const totalStock = product.stockQuantity || 0;
      const reserved = holdMap.get(key) || 0;
      const available = Math.max(0, totalStock - reserved);

      results.set(key, {
        productId: item.productId,
        variantId: item.variantId,
        totalStock,
        reserved,
        available,
        isAvailable: available > 0,
      });
    }

    return results;
  }

  /**
   * Extend hold duration for a cart
   */
  async extendHolds(cartId: string, additionalMinutes: number): Promise<number> {
    const holds = await this.prisma.inventoryHold.findMany({
      where: {
        cartId,
        status: 'ACTIVE',
      },
    });

    let extendedCount = 0;
    for (const hold of holds) {
      const newExpiresAt = new Date(hold.expiresAt.getTime() + additionalMinutes * 60 * 1000);
      await this.prisma.inventoryHold.update({
        where: { id: hold.id },
        data: { expiresAt: newExpiresAt },
      });
      extendedCount++;
    }

    if (extendedCount > 0) {
      this.logger.log(`Extended ${extendedCount} holds for cart ${cartId} by ${additionalMinutes} minutes`);
    }

    return extendedCount;
  }

  /**
   * Get low stock warning for cart items
   */
  async getLowStockWarnings(
    cartId: string,
    companyId: string,
  ): Promise<Array<{ productId: string; variantId?: string; available: number; requested: number }>> {
    const config = await this.getConfig(companyId);

    if (!config.showLowStockWarning) {
      return [];
    }

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (!cart) {
      return [];
    }

    const warnings: Array<{ productId: string; variantId?: string; available: number; requested: number }> = [];

    for (const item of cart.items) {
      const availability = await this.checkAvailability(
        item.productId,
        item.variantId || undefined,
        companyId,
      );

      if (availability.available <= config.lowStockThreshold) {
        warnings.push({
          productId: item.productId,
          variantId: item.variantId || undefined,
          available: availability.available,
          requested: item.quantity,
        });
      }
    }

    return warnings;
  }

  /**
   * Release expired holds
   * Runs every minute
   */
  @Cron('* * * * *')
  async releaseExpiredHolds(): Promise<void> {
    const result = await this.prisma.inventoryHold.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
        releasedAt: new Date(),
      },
    });

    if (result.count > 0) {
      this.logger.log(`Released ${result.count} expired inventory holds`);
    }
  }

  /**
   * Get hold status for a cart
   */
  async getHoldStatus(cartId: string): Promise<{
    hasActiveHolds: boolean;
    holds: InventoryHold[];
    expiresAt?: Date;
  }> {
    const holds = await this.prisma.inventoryHold.findMany({
      where: {
        cartId,
        status: 'ACTIVE',
      },
      orderBy: { expiresAt: 'asc' },
    });

    return {
      hasActiveHolds: holds.length > 0,
      holds: holds.map((h) => ({
        id: h.id,
        cartId: h.cartId,
        productId: h.productId,
        variantId: h.variantId || undefined,
        quantity: h.quantity,
        expiresAt: h.expiresAt,
        status: h.status,
      })),
      expiresAt: holds.length > 0 ? holds[0].expiresAt : undefined,
    };
  }

  /**
   * Get company hold config
   * Loads from company settings with sensible defaults
   */
  private async getConfig(companyId: string): Promise<HoldConfig> {
    return this.companyCartSettingsService.getInventoryHoldSettings(companyId);
  }
}
