import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyCartSettingsService } from './company-cart-settings.service';

export interface UpsellProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  reason: UpsellReason;
  score: number;
}

export enum UpsellReason {
  FREQUENTLY_BOUGHT_TOGETHER = 'FREQUENTLY_BOUGHT_TOGETHER',
  SIMILAR_CATEGORY = 'SIMILAR_CATEGORY',
  COMPLEMENTARY = 'COMPLEMENTARY',
  POPULAR = 'POPULAR',
  PERSONALIZED = 'PERSONALIZED',
  BUNDLE_DISCOUNT = 'BUNDLE_DISCOUNT',
}

export interface UpsellConfig {
  enabled: boolean;
  maxSuggestions: number;
  minConfidenceScore: number;
  preferBundles: boolean;
  excludeRecentlyPurchased: boolean;
  recentPurchaseDays: number;
}

const DEFAULT_CONFIG: UpsellConfig = {
  enabled: true,
  maxSuggestions: 3,
  minConfidenceScore: 0.3,
  preferBundles: true,
  excludeRecentlyPurchased: true,
  recentPurchaseDays: 30,
};

@Injectable()
export class CartUpsellService {
  private readonly logger = new Logger(CartUpsellService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly companyCartSettingsService: CompanyCartSettingsService,
  ) {}

  /**
   * Get upsell suggestions for a cart
   */
  async getUpsellSuggestions(
    cartId: string,
    companyId: string,
    customerId?: string,
  ): Promise<UpsellProduct[]> {
    const config = await this.getConfig(companyId);

    if (!config.enabled) {
      return [];
    }

    // Get cart items
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                tags: true,
                categoryAssignments: {
                  select: { categoryId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return [];
    }

    const cartProductIds = cart.items.map((item) => item.productId);
    const categoryIds = cart.items
      .flatMap((item) => item.product?.categoryAssignments?.map((ca: any) => ca.categoryId) || [])
      .filter((id): id is string => !!id);

    // Get recently purchased products to exclude
    const recentlyPurchased = customerId
      ? await this.getRecentlyPurchasedProducts(customerId, companyId, config.recentPurchaseDays)
      : [];

    const excludeIds = [...cartProductIds, ...recentlyPurchased];

    // Get suggestions using multiple strategies
    const [frequentlyBought, similarCategory, popular] = await Promise.all([
      this.getFrequentlyBoughtTogether(cartProductIds, companyId, excludeIds),
      this.getSimilarCategoryProducts(categoryIds, companyId, excludeIds),
      this.getPopularProducts(companyId, excludeIds),
    ]);

    // Merge and score suggestions
    const allSuggestions = this.mergeAndScore([
      ...frequentlyBought.map((p) => ({ ...p, reason: UpsellReason.FREQUENTLY_BOUGHT_TOGETHER, score: 0.9 })),
      ...similarCategory.map((p) => ({ ...p, reason: UpsellReason.SIMILAR_CATEGORY, score: 0.6 })),
      ...popular.map((p) => ({ ...p, reason: UpsellReason.POPULAR, score: 0.4 })),
    ]);

    // Filter by confidence and limit
    return allSuggestions
      .filter((s) => s.score >= config.minConfidenceScore)
      .slice(0, config.maxSuggestions);
  }

  /**
   * Get products frequently bought together with cart items
   */
  private async getFrequentlyBoughtTogether(
    productIds: string[],
    companyId: string,
    excludeIds: string[],
  ): Promise<Omit<UpsellProduct, 'reason' | 'score'>[]> {
    // Find orders containing these products
    const relatedOrders = await this.prisma.orderItem.findMany({
      where: {
        productId: { in: productIds },
        order: {
          companyId,
          status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] },
        },
      },
      select: { orderId: true },
      take: 100,
    });

    const orderIds = [...new Set(relatedOrders.map((r) => r.orderId))];

    if (orderIds.length === 0) {
      return [];
    }

    // Find other products in those orders
    const coProducts = await this.prisma.orderItem.findMany({
      where: {
        orderId: { in: orderIds },
        productId: { notIn: [...productIds, ...excludeIds] },
        product: {
          deletedAt: null,
          status: 'ACTIVE',
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            compareAtPrice: true,
            images: true,
          },
        },
      },
    });

    // Count occurrences and sort by frequency
    const productCounts = new Map<string, { product: any; count: number }>();
    for (const item of coProducts) {
      const existing = productCounts.get(item.productId);
      if (existing) {
        existing.count++;
      } else {
        productCounts.set(item.productId, { product: item.product, count: 1 });
      }
    }

    // Sort by count and return top products
    return [...productCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(({ product }) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        originalPrice: product.compareAtPrice ? Number(product.compareAtPrice) : undefined,
        imageUrl: product.images?.[0],
      }));
  }

  /**
   * Get products in similar categories
   */
  private async getSimilarCategoryProducts(
    categoryIds: string[],
    companyId: string,
    excludeIds: string[],
  ): Promise<Omit<UpsellProduct, 'reason' | 'score'>[]> {
    if (categoryIds.length === 0) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: {
        companyId,
        categoryAssignments: {
          some: { categoryId: { in: categoryIds } },
        },
        id: { notIn: excludeIds },
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        compareAtPrice: true,
        images: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      originalPrice: product.compareAtPrice ? Number(product.compareAtPrice) : undefined,
      imageUrl: product.images?.[0],
    }));
  }

  /**
   * Get popular products as fallback
   */
  private async getPopularProducts(
    companyId: string,
    excludeIds: string[],
  ): Promise<Omit<UpsellProduct, 'reason' | 'score'>[]> {
    // Get products with most order items in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const popularProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          companyId,
          createdAt: { gte: thirtyDaysAgo },
        },
        productId: { notIn: excludeIds },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 5,
    });

    const productIds = popularProducts.map((p) => p.productId);

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        compareAtPrice: true,
        images: true,
      },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      originalPrice: product.compareAtPrice ? Number(product.compareAtPrice) : undefined,
      imageUrl: product.images?.[0],
    }));
  }

  /**
   * Get recently purchased products for a customer
   */
  private async getRecentlyPurchasedProducts(
    customerId: string,
    companyId: string,
    days: number,
  ): Promise<string[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          customerId,
          companyId,
          createdAt: { gte: cutoffDate },
        },
      },
      select: { productId: true },
    });

    return [...new Set(recentItems.map((i) => i.productId))];
  }

  /**
   * Merge suggestions and deduplicate
   */
  private mergeAndScore(suggestions: UpsellProduct[]): UpsellProduct[] {
    const productMap = new Map<string, UpsellProduct>();

    for (const suggestion of suggestions) {
      const existing = productMap.get(suggestion.id);
      if (existing) {
        // Keep higher score, combine reasons if different
        if (suggestion.score > existing.score) {
          productMap.set(suggestion.id, suggestion);
        }
      } else {
        productMap.set(suggestion.id, suggestion);
      }
    }

    return [...productMap.values()].sort((a, b) => b.score - a.score);
  }

  /**
   * Track when an upsell is shown (impression)
   * Call this when upsell suggestions are displayed to the user
   */
  async trackUpsellImpression(
    cartId: string,
    productId: string,
    reason: UpsellReason,
    options?: {
      score?: number;
      position?: number;
      placement?: string;
      sessionToken?: string;
      customerId?: string;
    },
  ): Promise<string> {
    this.logger.debug(`Upsell impression: cart=${cartId}, product=${productId}, reason=${reason}`);

    try {
      // Get cart to find company
      const cart = await this.prisma.cart.findUnique({
        where: { id: cartId },
        select: { companyId: true, customerId: true, sessionToken: true },
      });

      if (!cart) {
        this.logger.warn(`Cannot track upsell impression: cart ${cartId} not found`);
        return '';
      }

      // Get product price for tracking
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { price: true },
      });

      const impression = await this.prisma.cartUpsellAnalytics.create({
        data: {
          companyId: cart.companyId,
          cartId,
          productId,
          sessionToken: options?.sessionToken || cart.sessionToken,
          customerId: options?.customerId || cart.customerId,
          reason: reason,
          score: options?.score ?? 0.5,
          position: options?.position ?? 0,
          placement: options?.placement || 'cart_page',
          productPrice: product?.price,
        },
      });

      return impression.id;
    } catch (error) {
      this.logger.error(`Failed to track upsell impression:`, error);
      return '';
    }
  }

  /**
   * Track multiple upsell impressions at once (batch)
   * Call this when displaying a list of upsell suggestions
   */
  async trackUpsellImpressions(
    cartId: string,
    suggestions: UpsellProduct[],
    options?: {
      placement?: string;
      sessionToken?: string;
      customerId?: string;
    },
  ): Promise<string[]> {
    const impressionIds: string[] = [];

    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      const id = await this.trackUpsellImpression(cartId, suggestion.id, suggestion.reason, {
        score: suggestion.score,
        position: i,
        placement: options?.placement,
        sessionToken: options?.sessionToken,
        customerId: options?.customerId,
      });
      if (id) {
        impressionIds.push(id);
      }
    }

    return impressionIds;
  }

  /**
   * Track when user views the upsell (visible in viewport for 1+ second)
   */
  async trackUpsellView(impressionId: string): Promise<void> {
    try {
      await this.prisma.cartUpsellAnalytics.update({
        where: { id: impressionId },
        data: { viewedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Failed to track upsell view:`, error);
    }
  }

  /**
   * Track when user clicks on the upsell to view product details
   */
  async trackUpsellClick(impressionId: string): Promise<void> {
    try {
      await this.prisma.cartUpsellAnalytics.update({
        where: { id: impressionId },
        data: { clickedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Failed to track upsell click:`, error);
    }
  }

  /**
   * Track when an upsell is added to cart (conversion)
   */
  async trackUpsellConversion(
    cartId: string,
    productId: string,
    reason: UpsellReason,
    options?: {
      impressionId?: string;
      quantity?: number;
      price?: number;
    },
  ): Promise<void> {
    this.logger.log(`Upsell conversion: cart=${cartId}, product=${productId}, reason=${reason}`);

    try {
      const quantity = options?.quantity ?? 1;
      const price = options?.price;
      const revenue = price ? price * quantity : undefined;

      // If we have an impression ID, update that record
      if (options?.impressionId) {
        await this.prisma.cartUpsellAnalytics.update({
          where: { id: options.impressionId },
          data: {
            addedAt: new Date(),
            quantity,
            revenue,
          },
        });
        return;
      }

      // Otherwise, find the most recent impression for this cart+product and update it
      const recentImpression = await this.prisma.cartUpsellAnalytics.findFirst({
        where: {
          cartId,
          productId,
          addedAt: null, // Not yet converted
        },
        orderBy: { impressedAt: 'desc' },
      });

      if (recentImpression) {
        await this.prisma.cartUpsellAnalytics.update({
          where: { id: recentImpression.id },
          data: {
            addedAt: new Date(),
            quantity,
            revenue: revenue ?? (recentImpression.productPrice ? Number(recentImpression.productPrice) * quantity : undefined),
          },
        });
      } else {
        // No impression found, create a direct conversion record
        const cart = await this.prisma.cart.findUnique({
          where: { id: cartId },
          select: { companyId: true, customerId: true, sessionToken: true },
        });

        if (cart) {
          const product = await this.prisma.product.findUnique({
            where: { id: productId },
            select: { price: true },
          });

          await this.prisma.cartUpsellAnalytics.create({
            data: {
              companyId: cart.companyId,
              cartId,
              productId,
              sessionToken: cart.sessionToken,
              customerId: cart.customerId,
              reason: reason,
              score: 0,
              position: 0,
              placement: 'direct_add',
              productPrice: product?.price ?? price,
              addedAt: new Date(),
              quantity,
              revenue: price ? price * quantity : (product?.price ? Number(product.price) * quantity : undefined),
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to track upsell conversion:`, error);
    }
  }

  /**
   * Track when user explicitly declines/dismisses an upsell
   */
  async trackUpsellDecline(impressionId: string): Promise<void> {
    try {
      await this.prisma.cartUpsellAnalytics.update({
        where: { id: impressionId },
        data: { declinedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Failed to track upsell decline:`, error);
    }
  }

  /**
   * Get upsell analytics for a company
   * Returns aggregated metrics for impressions, conversions, and revenue
   */
  async getUpsellAnalytics(
    companyId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      reason?: UpsellReason;
      placement?: string;
    },
  ): Promise<{
    totalImpressions: number;
    totalViews: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    viewRate: number;
    clickRate: number;
    conversionRate: number;
    avgRevenuePerConversion: number;
    byReason: Record<string, { impressions: number; conversions: number; revenue: number }>;
  }> {
    const where: any = { companyId };

    if (options?.startDate) {
      where.impressedAt = { gte: options.startDate };
    }
    if (options?.endDate) {
      where.impressedAt = { ...where.impressedAt, lte: options.endDate };
    }
    if (options?.reason) {
      where.reason = options.reason;
    }
    if (options?.placement) {
      where.placement = options.placement;
    }

    const [totals, byReason] = await Promise.all([
      // Get aggregated totals
      this.prisma.cartUpsellAnalytics.aggregate({
        where,
        _count: { id: true },
        _sum: { revenue: true },
      }),
      // Get breakdowns by reason
      this.prisma.cartUpsellAnalytics.groupBy({
        by: ['reason'],
        where,
        _count: { id: true },
        _sum: { revenue: true },
      }),
    ]);

    // Count different stages
    const [viewCount, clickCount, conversionCount] = await Promise.all([
      this.prisma.cartUpsellAnalytics.count({ where: { ...where, viewedAt: { not: null } } }),
      this.prisma.cartUpsellAnalytics.count({ where: { ...where, clickedAt: { not: null } } }),
      this.prisma.cartUpsellAnalytics.count({ where: { ...where, addedAt: { not: null } } }),
    ]);

    const totalImpressions = totals._count.id || 0;
    const totalRevenue = Number(totals._sum.revenue || 0);

    // Build reason breakdown
    const byReasonMap: Record<string, { impressions: number; conversions: number; revenue: number }> = {};
    for (const item of byReason) {
      byReasonMap[item.reason] = {
        impressions: item._count.id,
        conversions: 0, // Will populate below
        revenue: Number(item._sum.revenue || 0),
      };
    }

    // Get conversions by reason
    const conversionsByReason = await this.prisma.cartUpsellAnalytics.groupBy({
      by: ['reason'],
      where: { ...where, addedAt: { not: null } },
      _count: { id: true },
    });

    for (const item of conversionsByReason) {
      if (byReasonMap[item.reason]) {
        byReasonMap[item.reason].conversions = item._count.id;
      }
    }

    return {
      totalImpressions,
      totalViews: viewCount,
      totalClicks: clickCount,
      totalConversions: conversionCount,
      totalRevenue,
      viewRate: totalImpressions > 0 ? viewCount / totalImpressions : 0,
      clickRate: totalImpressions > 0 ? clickCount / totalImpressions : 0,
      conversionRate: totalImpressions > 0 ? conversionCount / totalImpressions : 0,
      avgRevenuePerConversion: conversionCount > 0 ? totalRevenue / conversionCount : 0,
      byReason: byReasonMap,
    };
  }

  /**
   * Get upsell config for company
   * Loads from company settings with sensible defaults
   */
  private async getConfig(companyId: string): Promise<UpsellConfig> {
    return this.companyCartSettingsService.getUpsellSettings(companyId);
  }
}
