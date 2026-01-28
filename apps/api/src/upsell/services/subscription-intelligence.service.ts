import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionFrequency } from '@prisma/client';
import {
  ProductSubscriptionConfigData,
  SubscriptionDiscountTier,
  SubscriptionEligibility,
  SubscriptionEligibilityRules,
  SubscriptionUpsellOffer,
} from '../types/upsell.types';

@Injectable()
export class SubscriptionIntelligenceService {
  private cache = new Map<string, { data: ProductSubscriptionConfigData; expiry: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get subscription configuration for a product
   */
  async getSubscriptionConfig(
    productId: string,
  ): Promise<ProductSubscriptionConfigData | null> {
    const cacheKey = `sub-config:${productId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const config = await this.prisma.productSubscriptionConfig.findUnique({
      where: { productId },
    });

    if (!config) {
      return null;
    }

    const configData: ProductSubscriptionConfigData = {
      productId: config.productId,
      enabled: config.enabled,
      discountTiers: config.discountTiers as unknown as SubscriptionDiscountTier[],
      defaultFrequency: config.defaultFrequency,
      freeShippingIncluded: config.freeShippingIncluded,
      eligibility: config.eligibility as unknown as SubscriptionEligibilityRules,
    };

    this.cache.set(cacheKey, { data: configData, expiry: Date.now() + this.CACHE_TTL });

    return configData;
  }

  /**
   * Create or update subscription configuration
   */
  async upsertSubscriptionConfig(
    productId: string,
    companyId: string,
    data: Partial<ProductSubscriptionConfigData>,
  ): Promise<ProductSubscriptionConfigData> {
    // Verify product exists
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const defaultTiers: SubscriptionDiscountTier[] = [
      { frequency: SubscriptionFrequency.WEEKLY, discountPercent: 25, label: 'Weekly (Best Value!)' },
      { frequency: SubscriptionFrequency.BIWEEKLY, discountPercent: 20, label: 'Every 2 weeks' },
      { frequency: SubscriptionFrequency.MONTHLY, discountPercent: 15, label: 'Monthly' },
      { frequency: SubscriptionFrequency.BIMONTHLY, discountPercent: 12, label: 'Every 2 months' },
      { frequency: SubscriptionFrequency.QUARTERLY, discountPercent: 10, label: 'Quarterly' },
    ];

    const defaultEligibility: SubscriptionEligibilityRules = {
      requirePreviousPurchase: false,
      minOrderCount: 0,
      productCategories: [],
    };

    const result = await this.prisma.productSubscriptionConfig.upsert({
      where: { productId },
      create: {
        productId,
        companyId,
        enabled: data.enabled ?? true,
        discountTiers: (data.discountTiers ?? defaultTiers) as unknown as object,
        defaultFrequency: data.defaultFrequency ?? SubscriptionFrequency.MONTHLY,
        freeShippingIncluded: data.freeShippingIncluded ?? true,
        eligibility: (data.eligibility ?? defaultEligibility) as unknown as object,
      },
      update: {
        enabled: data.enabled,
        discountTiers: data.discountTiers as unknown as object,
        defaultFrequency: data.defaultFrequency,
        freeShippingIncluded: data.freeShippingIncluded,
        eligibility: data.eligibility as unknown as object,
      },
    });

    // Invalidate cache
    this.cache.delete(`sub-config:${productId}`);

    return {
      productId: result.productId,
      enabled: result.enabled,
      discountTiers: result.discountTiers as unknown as SubscriptionDiscountTier[],
      defaultFrequency: result.defaultFrequency,
      freeShippingIncluded: result.freeShippingIncluded,
      eligibility: result.eligibility as unknown as SubscriptionEligibilityRules,
    };
  }

  /**
   * Determine if customer is a good subscription candidate
   */
  async evaluateSubscriptionEligibility(
    customerId: string | null,
    productId: string,
    companyId: string,
  ): Promise<SubscriptionEligibility> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        categoryAssignments: {
          include: { category: true },
        },
      },
    });

    const config = await this.getSubscriptionConfig(productId);

    if (!config?.enabled) {
      return {
        eligible: false,
        reasons: ['Product not eligible for subscription'],
        confidence: 1,
        recommendedFrequency: SubscriptionFrequency.MONTHLY,
        recommendedDiscount: 0,
        estimatedLTV: 0,
      };
    }

    // Check product subscribability
    if (!product?.isSubscribable) {
      return {
        eligible: false,
        reasons: ['Product type not suitable for subscription'],
        confidence: 0.9,
        recommendedFrequency: SubscriptionFrequency.MONTHLY,
        recommendedDiscount: 0,
        estimatedLTV: 0,
      };
    }

    const reasons: string[] = [];
    let score = 0;

    // Analyze customer history if available
    if (customerId) {
      const customerData = await this.getCustomerPurchaseData(customerId, productId);

      // Repeat purchase history
      if (customerData.purchaseCount >= 2) {
        reasons.push('Repeat customer');
        score += 0.3;
      }

      // Purchase frequency suggests subscription fit
      if (customerData.avgDaysBetweenPurchases) {
        const frequency = this.mapDaysToFrequency(customerData.avgDaysBetweenPurchases);
        reasons.push(`Purchase pattern suggests ${frequency.toLowerCase().replace('_', ' ')} subscription`);
        score += 0.2;
      }

      // Customer LTV indicates willingness to commit
      if (customerData.ltv > 200) {
        reasons.push('High-value customer');
        score += 0.2;
      }
    }

    // Product-specific signals - consumable check
    const categories = product?.categoryAssignments?.map((ca) => ca.category.name.toLowerCase()) || [];
    const isConsumable = categories.some((c) =>
      ['coffee', 'food', 'beverages', 'consumables', 'supplements', 'beauty'].includes(c),
    );

    if (isConsumable) {
      reasons.push('Consumable product');
      score += 0.2;
    }

    // Determine recommended frequency
    const recommendedFrequency = customerId
      ? await this.predictOptimalFrequency(customerId, productId)
      : config.defaultFrequency;

    // Get discount for recommended frequency
    const discountTier = config.discountTiers.find(
      (t) => t.frequency === recommendedFrequency,
    );

    // Estimate LTV
    const estimatedLTV = this.calculateSubscriptionLTV(
      Number(product?.price || 0),
      discountTier?.discountPercent || 15,
      recommendedFrequency,
    );

    return {
      eligible: score >= 0.3,
      reasons,
      confidence: Math.min(score, 1),
      recommendedFrequency,
      recommendedDiscount: discountTier?.discountPercent || 15,
      estimatedLTV,
    };
  }

  /**
   * Get subscription upsell offer for a product
   */
  async getSubscriptionOffer(
    productId: string,
    companyId: string,
    customerId: string | null,
  ): Promise<SubscriptionUpsellOffer | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
        isSubscribable: true,
      },
    });

    if (!product || !product.isSubscribable) {
      return null;
    }

    const config = await this.getSubscriptionConfig(productId);
    if (!config?.enabled) {
      return null;
    }

    const eligibility = await this.evaluateSubscriptionEligibility(
      customerId,
      productId,
      companyId,
    );

    if (!eligibility.eligible) {
      return null;
    }

    const basePrice = Number(product.price);
    const discountedPrice = basePrice * (1 - eligibility.recommendedDiscount / 100);
    const savingsPerOrder = basePrice - discountedPrice;
    const ordersPerYear = this.getOrdersPerYear(eligibility.recommendedFrequency);
    const savingsPerYear = savingsPerOrder * ordersPerYear;

    const images = product.images as string[];

    return {
      productId: product.id,
      productName: product.name,
      productPrice: basePrice,
      productImage: images?.[0],
      eligibility,
      discountTiers: config.discountTiers,
      savingsPerOrder: Math.round(savingsPerOrder * 100) / 100,
      savingsPerYear: Math.round(savingsPerYear * 100) / 100,
    };
  }

  /**
   * Get subscription offers for all eligible cart items
   */
  async getCartSubscriptionOffers(
    items: { productId: string }[],
    companyId: string,
    customerId: string | null,
  ): Promise<SubscriptionUpsellOffer[]> {
    const offers: SubscriptionUpsellOffer[] = [];

    for (const item of items) {
      const offer = await this.getSubscriptionOffer(item.productId, companyId, customerId);
      if (offer) {
        offers.push(offer);
      }
    }

    // Sort by estimated LTV (highest first) and limit to top 2
    return offers
      .sort((a, b) => b.eligibility.estimatedLTV - a.eligibility.estimatedLTV)
      .slice(0, 2);
  }

  /**
   * Get customer purchase data for a specific product
   */
  private async getCustomerPurchaseData(
    customerId: string,
    productId: string,
  ): Promise<{
    purchaseCount: number;
    avgDaysBetweenPurchases: number | null;
    ltv: number;
  }> {
    const purchases = await this.prisma.orderItem.findMany({
      where: {
        order: { customerId, status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] } },
        productId,
      },
      include: { order: { select: { createdAt: true, total: true } } },
      orderBy: { order: { createdAt: 'asc' } },
    });

    if (purchases.length === 0) {
      return { purchaseCount: 0, avgDaysBetweenPurchases: null, ltv: 0 };
    }

    // Calculate average days between purchases
    let avgDaysBetweenPurchases: number | null = null;
    if (purchases.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < purchases.length; i++) {
        const days = Math.round(
          (purchases[i].order!.createdAt.getTime() -
            purchases[i - 1].order!.createdAt.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        intervals.push(days);
      }
      avgDaysBetweenPurchases =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }

    // Get total LTV
    const allOrders = await this.prisma.order.findMany({
      where: {
        customerId,
        status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] },
      },
      select: { total: true },
    });

    const ltv = allOrders.reduce((sum, o) => sum + Number(o.total), 0);

    return {
      purchaseCount: purchases.length,
      avgDaysBetweenPurchases,
      ltv,
    };
  }

  /**
   * Predict optimal subscription frequency for a customer
   */
  private async predictOptimalFrequency(
    customerId: string,
    productId: string,
  ): Promise<SubscriptionFrequency> {
    const purchases = await this.prisma.orderItem.findMany({
      where: {
        order: { customerId },
        productId,
      },
      include: { order: true },
      orderBy: { order: { createdAt: 'asc' } },
    });

    if (purchases.length < 2) {
      return SubscriptionFrequency.MONTHLY; // Default
    }

    // Calculate average days between purchases
    const intervals: number[] = [];
    for (let i = 1; i < purchases.length; i++) {
      const days = Math.round(
        (purchases[i].order.createdAt.getTime() -
          purchases[i - 1].order.createdAt.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      intervals.push(days);
    }

    const avgDays = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    return this.mapDaysToFrequency(avgDays);
  }

  /**
   * Map average days between purchases to subscription frequency
   */
  private mapDaysToFrequency(avgDays: number): SubscriptionFrequency {
    if (avgDays <= 10) return SubscriptionFrequency.WEEKLY;
    if (avgDays <= 21) return SubscriptionFrequency.BIWEEKLY;
    if (avgDays <= 45) return SubscriptionFrequency.MONTHLY;
    if (avgDays <= 75) return SubscriptionFrequency.BIMONTHLY;
    return SubscriptionFrequency.QUARTERLY;
  }

  /**
   * Calculate estimated LTV for subscription
   */
  private calculateSubscriptionLTV(
    price: number,
    discountPercent: number,
    frequency: SubscriptionFrequency,
  ): number {
    const discountedPrice = price * (1 - discountPercent / 100);
    const ordersPerYear = this.getOrdersPerYear(frequency);
    const avgSubscriptionMonths = 8; // Industry average

    return Math.round(discountedPrice * ordersPerYear * (avgSubscriptionMonths / 12) * 100) / 100;
  }

  /**
   * Get orders per year for a frequency
   */
  private getOrdersPerYear(frequency: SubscriptionFrequency): number {
    switch (frequency) {
      case SubscriptionFrequency.WEEKLY:
        return 52;
      case SubscriptionFrequency.BIWEEKLY:
        return 26;
      case SubscriptionFrequency.MONTHLY:
        return 12;
      case SubscriptionFrequency.BIMONTHLY:
        return 6;
      case SubscriptionFrequency.QUARTERLY:
        return 4;
      default:
        return 12;
    }
  }
}
