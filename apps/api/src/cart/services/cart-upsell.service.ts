import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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

  constructor(private readonly prisma: PrismaService) {}

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
   * Track when an upsell is shown
   */
  async trackUpsellImpression(
    cartId: string,
    productId: string,
    reason: UpsellReason,
  ): Promise<void> {
    this.logger.debug(`Upsell impression: cart=${cartId}, product=${productId}, reason=${reason}`);
    // TODO: Store impression for analytics
  }

  /**
   * Track when an upsell is added to cart
   */
  async trackUpsellConversion(
    cartId: string,
    productId: string,
    reason: UpsellReason,
  ): Promise<void> {
    this.logger.log(`Upsell conversion: cart=${cartId}, product=${productId}, reason=${reason}`);
    // TODO: Store conversion for analytics
  }

  /**
   * Get upsell config for company
   */
  private async getConfig(companyId: string): Promise<UpsellConfig> {
    // TODO: Load from company settings
    return DEFAULT_CONFIG;
  }
}
