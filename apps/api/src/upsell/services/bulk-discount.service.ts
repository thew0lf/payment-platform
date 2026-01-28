import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  BulkDiscountTier,
  BulkPriceResult,
  BulkUpsellRecommendation,
  ProductBulkDiscountConfig,
} from '../types/upsell.types';

@Injectable()
export class BulkDiscountService {
  private cache = new Map<string, { data: ProductBulkDiscountConfig; expiry: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get bulk discount configuration for a product
   */
  async getProductBulkDiscount(productId: string): Promise<ProductBulkDiscountConfig | null> {
    const cacheKey = `bulk-discount:${productId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const config = await this.prisma.productBulkDiscount.findUnique({
      where: { productId },
    });

    if (!config) {
      return null;
    }

    const configData: ProductBulkDiscountConfig = {
      productId: config.productId,
      enabled: config.enabled,
      tiers: config.tiers as unknown as BulkDiscountTier[],
      stackWithOtherDiscounts: config.stackWithOtherDiscounts,
      maxDiscountPercent: config.maxDiscountPercent,
      validFrom: config.validFrom || undefined,
      validUntil: config.validUntil || undefined,
    };

    this.cache.set(cacheKey, { data: configData, expiry: Date.now() + this.CACHE_TTL });

    return configData;
  }

  /**
   * Create or update bulk discount configuration for a product
   */
  async upsertBulkDiscount(
    productId: string,
    companyId: string,
    data: Partial<ProductBulkDiscountConfig>,
  ): Promise<ProductBulkDiscountConfig> {
    // Verify product exists and belongs to company
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const result = await this.prisma.productBulkDiscount.upsert({
      where: { productId },
      create: {
        productId,
        companyId,
        enabled: data.enabled ?? true,
        tiers: (data.tiers ?? []) as unknown as object,
        stackWithOtherDiscounts: data.stackWithOtherDiscounts ?? false,
        maxDiscountPercent: data.maxDiscountPercent ?? 30,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
      },
      update: {
        enabled: data.enabled,
        tiers: data.tiers as unknown as object,
        stackWithOtherDiscounts: data.stackWithOtherDiscounts,
        maxDiscountPercent: data.maxDiscountPercent,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
      },
    });

    // Invalidate cache
    this.cache.delete(`bulk-discount:${productId}`);

    return {
      productId: result.productId,
      enabled: result.enabled,
      tiers: result.tiers as unknown as BulkDiscountTier[],
      stackWithOtherDiscounts: result.stackWithOtherDiscounts,
      maxDiscountPercent: result.maxDiscountPercent,
      validFrom: result.validFrom || undefined,
      validUntil: result.validUntil || undefined,
    };
  }

  /**
   * Delete bulk discount configuration
   */
  async deleteBulkDiscount(productId: string, companyId: string): Promise<void> {
    await this.prisma.productBulkDiscount.deleteMany({
      where: { productId, companyId },
    });

    this.cache.delete(`bulk-discount:${productId}`);
  }

  /**
   * Calculate price for a given quantity
   */
  async calculateBulkPrice(
    productId: string,
    quantity: number,
    basePrice: number,
  ): Promise<BulkPriceResult> {
    const config = await this.getProductBulkDiscount(productId);

    if (!config?.enabled) {
      return {
        unitPrice: basePrice,
        totalPrice: basePrice * quantity,
        discount: 0,
        tier: null,
        savingsPercent: 0,
      };
    }

    // Check validity dates
    const now = new Date();
    if (config.validFrom && now < config.validFrom) {
      return {
        unitPrice: basePrice,
        totalPrice: basePrice * quantity,
        discount: 0,
        tier: null,
        savingsPercent: 0,
      };
    }
    if (config.validUntil && now > config.validUntil) {
      return {
        unitPrice: basePrice,
        totalPrice: basePrice * quantity,
        discount: 0,
        tier: null,
        savingsPercent: 0,
      };
    }

    // Find applicable tier
    const tier = config.tiers
      .filter(
        (t) =>
          quantity >= t.minQuantity && (!t.maxQuantity || quantity <= t.maxQuantity),
      )
      .sort((a, b) => b.minQuantity - a.minQuantity)[0];

    if (!tier) {
      return {
        unitPrice: basePrice,
        totalPrice: basePrice * quantity,
        discount: 0,
        tier: null,
        savingsPercent: 0,
      };
    }

    let unitPrice: number;
    let discount: number;

    switch (tier.discountType) {
      case 'PERCENTAGE':
        unitPrice = basePrice * (1 - tier.discountValue / 100);
        discount = basePrice * quantity * (tier.discountValue / 100);
        break;
      case 'FIXED_AMOUNT':
        unitPrice = basePrice - tier.discountValue;
        discount = tier.discountValue * quantity;
        break;
      case 'UNIT_PRICE':
        unitPrice = tier.discountValue;
        discount = (basePrice - tier.discountValue) * quantity;
        break;
      default:
        unitPrice = basePrice;
        discount = 0;
    }

    // Apply max discount cap
    const maxDiscount = basePrice * quantity * (config.maxDiscountPercent / 100);
    discount = Math.min(discount, maxDiscount);
    unitPrice = Math.max(unitPrice, basePrice * (1 - config.maxDiscountPercent / 100));

    const savingsPercent = (discount / (basePrice * quantity)) * 100;

    return {
      unitPrice: Math.round(unitPrice * 100) / 100,
      totalPrice: Math.round(unitPrice * quantity * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      tier,
      savingsPercent: Math.round(savingsPercent * 10) / 10,
    };
  }

  /**
   * Get upsell recommendation for bulk purchase
   */
  async getBulkUpsellRecommendation(
    productId: string,
    currentQuantity: number,
  ): Promise<BulkUpsellRecommendation | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
      },
    });

    if (!product) {
      return null;
    }

    const config = await this.getProductBulkDiscount(productId);
    if (!config?.enabled) {
      return null;
    }

    const basePrice = Number(product.price);

    // Find current tier
    const currentTier =
      config.tiers.find(
        (t) =>
          currentQuantity >= t.minQuantity &&
          (!t.maxQuantity || currentQuantity <= t.maxQuantity),
      ) || null;

    // Find next tier
    const nextTier = config.tiers
      .filter((t) => t.minQuantity > currentQuantity)
      .sort((a, b) => a.minQuantity - b.minQuantity)[0];

    if (!nextTier) {
      return null; // Already at highest tier
    }

    const quantityToAdd = nextTier.minQuantity - currentQuantity;
    const currentTotal = await this.calculateBulkPrice(productId, currentQuantity, basePrice);
    const newTotal = await this.calculateBulkPrice(productId, nextTier.minQuantity, basePrice);

    const additionalCost = newTotal.totalPrice - currentTotal.totalPrice;
    const regularAdditionalCost = basePrice * quantityToAdd;
    const savings =
      regularAdditionalCost - additionalCost + (newTotal.discount - currentTotal.discount);

    const images = product.images as string[];

    return {
      productId: product.id,
      productName: product.name,
      productPrice: basePrice,
      productImage: images?.[0],
      currentQuantity,
      recommendedQuantity: nextTier.minQuantity,
      currentTier,
      nextTier,
      quantityToAdd,
      additionalCost: Math.round(additionalCost * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      savingsPercent: nextTier.discountValue,
      message: this.generateBulkUpsellMessage(product.name, quantityToAdd, savings, nextTier),
    };
  }

  /**
   * Get all bulk recommendations for cart items
   */
  async getCartBulkRecommendations(
    items: { productId: string; quantity: number }[],
  ): Promise<BulkUpsellRecommendation[]> {
    const recommendations: BulkUpsellRecommendation[] = [];

    for (const item of items) {
      const recommendation = await this.getBulkUpsellRecommendation(
        item.productId,
        item.quantity,
      );
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Sort by savings (highest first) and limit to top 3
    return recommendations.sort((a, b) => b.savings - a.savings).slice(0, 3);
  }

  /**
   * Generate compelling upsell message
   */
  private generateBulkUpsellMessage(
    productName: string,
    quantityToAdd: number,
    savings: number,
    tier: BulkDiscountTier,
  ): string {
    // Use savings formatting without currency symbol (frontend handles localization)
    const savingsFormatted = savings.toFixed(2);
    const templates = [
      `Add ${quantityToAdd} more to save ${savingsFormatted}`,
      `${tier.label} - Save ${savingsFormatted} today`,
      `Stock up and get ${tier.discountValue}% off when you buy ${tier.minQuantity}+`,
      `Buy ${tier.minQuantity}+ and save ${tier.discountValue}%`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }
}
