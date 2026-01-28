import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AlsoBoughtConfig,
  CustomerSignals,
  FrequentlyViewedConfig,
  FrequentlyViewedSection,
  GlobalRecommendationConfig,
  ProductPageRecommendations,
  RecommendationConfigData,
  RecommendationSection,
  RecommendedProduct,
  ViewedTogetherBundle,
  YouMightLikeConfig,
} from '../types/recommendation.types';

@Injectable()
export class ProductRecommendationService {
  private configCache = new Map<string, { data: RecommendationConfigData; expiry: number }>();
  private recommendationCache = new Map<string, { data: any; expiry: number }>();
  private readonly CONFIG_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly RECOMMENDATION_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all recommendation sections for a product page
   */
  async getProductPageRecommendations(
    productId: string,
    companyId: string,
    customerId?: string,
    sessionId?: string,
  ): Promise<ProductPageRecommendations> {
    const config = await this.getRecommendationConfig(companyId);

    const recommendations: ProductPageRecommendations = {
      alsoBought: null,
      youMightLike: null,
      frequentlyViewed: null,
    };

    // Parallel fetch all enabled recommendation types
    const promises: Promise<void>[] = [];

    if (config.alsoBought.enabled) {
      promises.push(
        this.getAlsoBoughtRecommendations(productId, companyId, config.alsoBought).then(
          (r) => {
            recommendations.alsoBought = r;
          },
        ),
      );
    }

    if (config.youMightLike.enabled) {
      promises.push(
        this.getYouMightLikeRecommendations(
          productId,
          companyId,
          customerId,
          sessionId,
          config.youMightLike,
        ).then((r) => {
          recommendations.youMightLike = r;
        }),
      );
    }

    if (config.frequentlyViewed.enabled) {
      promises.push(
        this.getFrequentlyViewedRecommendations(
          productId,
          companyId,
          config.frequentlyViewed,
        ).then((r) => {
          recommendations.frequentlyViewed = r;
        }),
      );
    }

    await Promise.all(promises);

    // Track recommendation impressions
    if (sessionId) {
      await this.trackRecommendationImpressions(
        productId,
        companyId,
        recommendations,
        customerId,
        sessionId,
      );
    }

    return recommendations;
  }

  /**
   * Get recommendation configuration for a company
   */
  async getRecommendationConfig(companyId: string): Promise<RecommendationConfigData> {
    const cacheKey = `rec-config:${companyId}`;
    const cached = this.configCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const config = await this.prisma.recommendationConfig.findUnique({
      where: { companyId },
    });

    const defaultConfig = this.getDefaultConfig(companyId);

    if (!config) {
      return defaultConfig;
    }

    const configData: RecommendationConfigData = {
      companyId: config.companyId,
      alsoBought: { ...defaultConfig.alsoBought, ...(config.alsoBought as object) },
      youMightLike: { ...defaultConfig.youMightLike, ...(config.youMightLike as object) },
      frequentlyViewed: {
        ...defaultConfig.frequentlyViewed,
        ...(config.frequentlyViewed as object),
      },
      global: { ...defaultConfig.global, ...(config.global as object) },
    };

    this.configCache.set(cacheKey, { data: configData, expiry: Date.now() + this.CONFIG_CACHE_TTL });

    return configData;
  }

  /**
   * Update recommendation configuration
   */
  async updateRecommendationConfig(
    companyId: string,
    data: Partial<RecommendationConfigData>,
  ): Promise<RecommendationConfigData> {
    const existing = await this.getRecommendationConfig(companyId);

    const result = await this.prisma.recommendationConfig.upsert({
      where: { companyId },
      create: {
        companyId,
        alsoBought: (data.alsoBought ?? existing.alsoBought) as unknown as object,
        youMightLike: (data.youMightLike ?? existing.youMightLike) as unknown as object,
        frequentlyViewed: (data.frequentlyViewed ?? existing.frequentlyViewed) as unknown as object,
        global: (data.global ?? existing.global) as unknown as object,
      },
      update: {
        alsoBought: data.alsoBought ? (data.alsoBought as unknown as object) : undefined,
        youMightLike: data.youMightLike ? (data.youMightLike as unknown as object) : undefined,
        frequentlyViewed: data.frequentlyViewed ? (data.frequentlyViewed as unknown as object) : undefined,
        global: data.global ? (data.global as unknown as object) : undefined,
      },
    });

    // Invalidate cache
    this.configCache.delete(`rec-config:${companyId}`);

    return {
      companyId: result.companyId,
      alsoBought: result.alsoBought as unknown as AlsoBoughtConfig,
      youMightLike: result.youMightLike as unknown as YouMightLikeConfig,
      frequentlyViewed: result.frequentlyViewed as unknown as FrequentlyViewedConfig,
      global: result.global as unknown as GlobalRecommendationConfig,
    };
  }

  /**
   * Get "Customers Also Bought" recommendations
   */
  async getAlsoBoughtRecommendations(
    productId: string,
    companyId: string,
    config: AlsoBoughtConfig,
  ): Promise<RecommendationSection | null> {
    const cacheKey = `also-bought:${productId}:${companyId}`;
    const cached = this.recommendationCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    // Get co-purchased products from orders
    const lookbackDate = new Date(Date.now() - config.lookbackDays * 24 * 60 * 60 * 1000);

    // Step 1: Get all orders containing this product
    const ordersWithProduct = await this.prisma.orderItem.findMany({
      where: {
        productId,
        order: {
          companyId,
          createdAt: { gte: lookbackDate },
          status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] },
        },
      },
      select: { orderId: true },
    });

    const orderIds = ordersWithProduct.map((o) => o.orderId);

    if (orderIds.length === 0) {
      return null;
    }

    // Step 2: Get co-purchased products
    const coProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        orderId: { in: orderIds },
        productId: { not: productId },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: config.maxResults * 2,
    });

    // Filter by minimum co-occurrences
    const filteredCoProducts = coProducts.filter(
      (cp) => cp._count.productId >= config.minCoOccurrences,
    );

    if (filteredCoProducts.length === 0) {
      return null;
    }

    // Step 3: Enrich with product details
    const productIds = filteredCoProducts.map((cp) => cp.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: 'ACTIVE',
        deletedAt: null,
        ...(config.excludeCategories.length > 0
          ? {
              categoryAssignments: {
                none: { categoryId: { in: config.excludeCategories } },
              },
            }
          : {}),
      },
      include: {
        reviewStats: true,
      },
    });

    // Map to RecommendedProduct with co-occurrence count
    const coProductMap = new Map(
      filteredCoProducts.map((cp) => [cp.productId, cp._count.productId]),
    );

    const recommendedProducts: RecommendedProduct[] = products
      .map((p) => {
        const images = p.images as string[];
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: Number(p.price),
          compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
          image: images?.[0],
          rating: p.reviewStats?.averageRating
            ? Number(p.reviewStats.averageRating)
            : undefined,
          reviewCount: p.reviewStats?.totalReviews ?? 0,
          inStock: p.stockQuantity > 0,
          coOccurrenceCount: coProductMap.get(p.id) || 0,
        };
      })
      .sort((a, b) => (b.coOccurrenceCount || 0) - (a.coOccurrenceCount || 0))
      .slice(0, config.maxResults);

    if (recommendedProducts.length === 0) {
      return null;
    }

    const section: RecommendationSection = {
      type: 'ALSO_BOUGHT',
      title: config.title || 'Customers Who Bought This Also Bought',
      subtitle: `Based on ${orderIds.length > 100 ? '100+' : orderIds.length} orders`,
      products: recommendedProducts,
      displayStyle: config.displayStyle || 'CAROUSEL',
    };

    this.recommendationCache.set(cacheKey, {
      data: section,
      expiry: Date.now() + this.RECOMMENDATION_CACHE_TTL,
    });

    return section;
  }

  /**
   * Get "You Might Like" personalized recommendations
   */
  async getYouMightLikeRecommendations(
    productId: string,
    companyId: string,
    customerId: string | undefined,
    sessionId: string | undefined,
    config: YouMightLikeConfig,
  ): Promise<RecommendationSection | null> {
    // Get customer signals
    const signals = await this.getCustomerSignals(customerId, sessionId, companyId);

    // Get current product for context
    const currentProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { categoryAssignments: true },
    });

    if (!currentProduct) {
      return null;
    }

    // Get candidate products
    const candidateProducts = await this.prisma.product.findMany({
      where: {
        companyId,
        id: { not: productId },
        status: 'ACTIVE',
        deletedAt: null,
        ...(config.excludeRecentlyViewed && signals.viewedProducts.length > 0
          ? { id: { notIn: signals.viewedProducts.map((v) => v.productId) } }
          : {}),
        ...(config.excludePurchased && signals.purchasedProducts.length > 0
          ? { id: { notIn: signals.purchasedProducts.map((p) => p.productId) } }
          : {}),
      },
      include: {
        categoryAssignments: true,
        reviewStats: true,
      },
      take: 50, // Get extra for scoring
    });

    // Score each product
    const scoredProducts = candidateProducts.map((product) => {
      let score = 0;

      // Category similarity
      const currentCategories = currentProduct.categoryAssignments.map(
        (ca) => ca.categoryId,
      );
      const productCategories = product.categoryAssignments.map((ca) => ca.categoryId);
      const categoryOverlap = currentCategories.filter((c) =>
        productCategories.includes(c),
      ).length;
      score += categoryOverlap * 0.3;

      // Browsing affinity
      if (signals.viewedCategories.length > 0) {
        const viewedOverlap = signals.viewedCategories.filter((vc) =>
          productCategories.includes(vc.categoryId),
        );
        score +=
          viewedOverlap.reduce((sum, v) => sum + Math.min(v.viewCount, 5), 0) *
          0.1 *
          config.browsingWeight;
      }

      // Purchase affinity
      if (signals.purchasedCategories.length > 0) {
        const purchasedOverlap = signals.purchasedCategories.filter((pc) =>
          productCategories.includes(pc.categoryId),
        );
        score +=
          purchasedOverlap.reduce((sum, p) => sum + Math.min(p.purchaseCount, 3), 0) *
          0.2 *
          config.purchaseWeight;
      }

      // Price similarity
      const priceDiff = Math.abs(Number(product.price) - Number(currentProduct.price));
      const priceScore = Math.max(0, 1 - priceDiff / Number(currentProduct.price));
      score += priceScore * 0.1 * config.contentWeight;

      // Rating boost
      if (product.reviewStats?.averageRating) {
        score += Number(product.reviewStats.averageRating) * 0.05;
      }

      return { product, score };
    });

    // Apply diversity - don't show all from same category
    const diversified = this.applyDiversity(
      scoredProducts,
      config.diversityFactor,
      config.maxResults,
    );

    if (diversified.length === 0) {
      return null;
    }

    const recommendedProducts: RecommendedProduct[] = diversified.map((sp) => {
      const images = sp.product.images as string[];
      return {
        id: sp.product.id,
        name: sp.product.name,
        slug: sp.product.slug,
        price: Number(sp.product.price),
        compareAtPrice: sp.product.compareAtPrice
          ? Number(sp.product.compareAtPrice)
          : undefined,
        image: images?.[0],
        rating: sp.product.reviewStats?.averageRating
          ? Number(sp.product.reviewStats.averageRating)
          : undefined,
        reviewCount: sp.product.reviewStats?.reviewCount ?? 0,
        inStock: sp.product.stockQuantity > 0,
        similarityScore: sp.score,
      };
    });

    return {
      type: 'YOU_MIGHT_LIKE',
      title: customerId ? config.title : config.titleForGuests,
      subtitle: customerId ? 'Based on your shopping history' : 'Based on similar products',
      products: recommendedProducts,
      displayStyle: config.displayStyle || 'GRID',
      personalized: !!customerId,
    };
  }

  /**
   * Get "Frequently Viewed Together" bundle recommendations
   */
  async getFrequentlyViewedRecommendations(
    productId: string,
    companyId: string,
    config: FrequentlyViewedConfig,
  ): Promise<FrequentlyViewedSection | null> {
    const cacheKey = `frequently-viewed:${productId}:${companyId}`;
    const cached = this.recommendationCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const lookbackDate = new Date(Date.now() - config.lookbackDays * 24 * 60 * 60 * 1000);

    // Get sessions where this product was viewed
    const sessions = await this.prisma.productView.findMany({
      where: {
        productId,
        companyId,
        viewedAt: { gte: lookbackDate },
      },
      select: { sessionId: true },
      distinct: ['sessionId'],
    });

    const sessionIds = sessions.map((s) => s.sessionId);

    if (sessionIds.length < config.minSessionCoViews) {
      return null;
    }

    // Find co-viewed products in those sessions
    const coViews = await this.prisma.productView.groupBy({
      by: ['productId'],
      where: {
        sessionId: { in: sessionIds },
        productId: { not: productId },
      },
      _count: { sessionId: true },
      orderBy: { _count: { sessionId: 'desc' } },
      take: 10,
    });

    // Filter by minimum co-views
    const filteredCoViews = coViews.filter(
      (cv) => cv._count.sessionId >= config.minSessionCoViews,
    );

    if (filteredCoViews.length === 0) {
      return null;
    }

    // Get the current product
    const currentProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { reviewStats: true },
    });

    if (!currentProduct) {
      return null;
    }

    // Get co-viewed product details
    const coViewedProductIds = filteredCoViews.map((cv) => cv.productId);
    const coViewedProducts = await this.prisma.product.findMany({
      where: {
        id: { in: coViewedProductIds },
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: { reviewStats: true },
    });

    // Build bundles
    const bundles: ViewedTogetherBundle[] = [];

    // Create primary bundle with top co-viewed products
    const topProducts = coViewedProducts.slice(0, config.maxBundleSize - 1);
    if (topProducts.length > 0) {
      const bundleProducts: RecommendedProduct[] = [
        this.mapToRecommendedProduct(currentProduct),
        ...topProducts.map((p) => this.mapToRecommendedProduct(p)),
      ];

      const individualTotal = bundleProducts.reduce((sum, p) => sum + p.price, 0);
      const bundlePrice = individualTotal * (1 - config.bundleDiscountPercent / 100);

      bundles.push({
        products: bundleProducts,
        coViewFrequency: filteredCoViews[0]._count.sessionId,
        conversionLift: 15, // Estimated based on industry averages
        individualTotal: Math.round(individualTotal * 100) / 100,
        bundlePrice: Math.round(bundlePrice * 100) / 100,
        savings: Math.round((individualTotal - bundlePrice) * 100) / 100,
        discountPercent: config.bundleDiscountPercent,
      });
    }

    if (bundles.length === 0) {
      return null;
    }

    const section: FrequentlyViewedSection = {
      type: 'FREQUENTLY_VIEWED',
      title: config.title || 'Frequently Viewed Together',
      subtitle: 'Products often explored in the same session',
      currentProduct: this.mapToRecommendedProduct(currentProduct),
      bundles,
      displayStyle: config.displayStyle || 'BUNDLE_CARDS',
    };

    this.recommendationCache.set(cacheKey, {
      data: section,
      expiry: Date.now() + this.RECOMMENDATION_CACHE_TTL,
    });

    return section;
  }

  /**
   * Track a product view
   */
  async trackProductView(data: {
    productId: string;
    companyId: string;
    sessionId: string;
    customerId?: string;
    source?: string;
    sourceProductId?: string;
    duration?: number;
  }): Promise<void> {
    await this.prisma.productView.create({
      data: {
        productId: data.productId,
        companyId: data.companyId,
        sessionId: data.sessionId,
        customerId: data.customerId,
        source: data.source,
        sourceProductId: data.sourceProductId,
        duration: data.duration,
      },
    });
  }

  /**
   * Track recommendation click
   */
  async trackRecommendationClick(
    impressionId: string,
    clickedProductId: string,
  ): Promise<void> {
    await this.prisma.recommendationImpression.update({
      where: { id: impressionId },
      data: {
        clickedProductId,
        clickedAt: new Date(),
      },
    });
  }

  /**
   * Track add to cart from recommendation
   */
  async trackRecommendationAddToCart(impressionId: string): Promise<void> {
    await this.prisma.recommendationImpression.update({
      where: { id: impressionId },
      data: {
        addedToCart: true,
        addedAt: new Date(),
      },
    });
  }

  /**
   * Get customer signals for personalization
   */
  private async getCustomerSignals(
    customerId: string | undefined,
    sessionId: string | undefined,
    companyId: string,
  ): Promise<CustomerSignals> {
    const signals: CustomerSignals = {
      viewedProducts: [],
      viewedCategories: [],
      searchTerms: [],
      avgTimeOnProduct: 0,
      purchasedProducts: [],
      purchasedCategories: [],
      avgOrderValue: 0,
      pricePreference: 'mid',
      wishlistItems: [],
      cartAbandons: [],
      reviewedProducts: [],
    };

    if (!customerId && !sessionId) {
      return signals;
    }

    // Get viewed products
    const views = await this.prisma.productView.groupBy({
      by: ['productId'],
      where: {
        ...(customerId ? { customerId } : { sessionId }),
        companyId,
      },
      _count: { productId: true },
      _max: { viewedAt: true },
      orderBy: { _count: { productId: 'desc' } },
      take: 20,
    });

    signals.viewedProducts = views.map((v) => ({
      productId: v.productId,
      viewCount: v._count.productId,
      lastViewed: v._max.viewedAt!,
    }));

    // Get viewed categories
    if (signals.viewedProducts.length > 0) {
      const categoryViews = await this.prisma.productCategoryAssignment.groupBy({
        by: ['categoryId'],
        where: {
          productId: { in: signals.viewedProducts.map((v) => v.productId) },
        },
        _count: { categoryId: true },
      });

      signals.viewedCategories = categoryViews.map((cv) => ({
        categoryId: cv.categoryId,
        viewCount: cv._count.categoryId,
      }));
    }

    // Get purchase history (customer only)
    if (customerId) {
      const purchases = await this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            customerId,
            companyId,
            status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] },
          },
        },
        _count: { productId: true },
        _max: { createdAt: true },
        orderBy: { _count: { productId: 'desc' } },
        take: 20,
      });

      signals.purchasedProducts = purchases.map((p) => ({
        productId: p.productId,
        purchaseCount: p._count.productId,
        lastPurchased: p._max.createdAt!,
      }));

      // Get purchased categories
      if (signals.purchasedProducts.length > 0) {
        const purchasedCategoryData = await this.prisma.productCategoryAssignment.groupBy({
          by: ['categoryId'],
          where: {
            productId: { in: signals.purchasedProducts.map((p) => p.productId) },
          },
          _count: { categoryId: true },
        });

        signals.purchasedCategories = purchasedCategoryData.map((pc) => ({
          categoryId: pc.categoryId,
          purchaseCount: pc._count.categoryId,
        }));
      }

      // Get average order value
      const orderStats = await this.prisma.order.aggregate({
        where: {
          customerId,
          companyId,
          status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] },
        },
        _avg: { total: true },
      });

      signals.avgOrderValue = Number(orderStats._avg.total || 0);

      // Determine price preference
      if (signals.avgOrderValue < 30) {
        signals.pricePreference = 'budget';
      } else if (signals.avgOrderValue > 100) {
        signals.pricePreference = 'premium';
      }
    }

    return signals;
  }

  /**
   * Apply diversity to scored products
   */
  private applyDiversity(
    scoredProducts: { product: any; score: number }[],
    diversityFactor: number,
    maxResults: number,
  ): { product: any; score: number }[] {
    if (diversityFactor === 0) {
      return scoredProducts.sort((a, b) => b.score - a.score).slice(0, maxResults);
    }

    const result: { product: any; score: number }[] = [];
    const usedCategories = new Set<string>();

    // Sort by score
    const sorted = [...scoredProducts].sort((a, b) => b.score - a.score);

    for (const item of sorted) {
      if (result.length >= maxResults) break;

      const categories = item.product.categoryAssignments.map(
        (ca: any) => ca.categoryId,
      );

      // Check if too many from same category
      const categoryOverlap = categories.filter((c: string) =>
        usedCategories.has(c),
      ).length;

      if (categoryOverlap === 0 || categoryOverlap / categories.length < diversityFactor) {
        result.push(item);
        categories.forEach((c: string) => usedCategories.add(c));
      }
    }

    // Fill remaining slots if needed
    for (const item of sorted) {
      if (result.length >= maxResults) break;
      if (!result.includes(item)) {
        result.push(item);
      }
    }

    return result;
  }

  /**
   * Track recommendation impressions
   */
  private async trackRecommendationImpressions(
    productId: string,
    companyId: string,
    recommendations: ProductPageRecommendations,
    customerId: string | undefined,
    sessionId: string,
  ): Promise<void> {
    const impressions: any[] = [];

    if (recommendations.alsoBought) {
      impressions.push({
        companyId,
        productId,
        type: 'ALSO_BOUGHT',
        sessionId,
        customerId,
        recommendedIds: recommendations.alsoBought.products.map((p) => p.id),
      });
    }

    if (recommendations.youMightLike) {
      impressions.push({
        companyId,
        productId,
        type: 'YOU_MIGHT_LIKE',
        sessionId,
        customerId,
        recommendedIds: recommendations.youMightLike.products.map((p) => p.id),
      });
    }

    if (recommendations.frequentlyViewed) {
      const bundleProductIds = recommendations.frequentlyViewed.bundles.flatMap((b) =>
        b.products.map((p) => p.id),
      );
      impressions.push({
        companyId,
        productId,
        type: 'FREQUENTLY_VIEWED',
        sessionId,
        customerId,
        recommendedIds: bundleProductIds,
      });
    }

    if (impressions.length > 0) {
      await this.prisma.recommendationImpression.createMany({
        data: impressions,
      });
    }
  }

  /**
   * Map product to RecommendedProduct
   */
  private mapToRecommendedProduct(product: any): RecommendedProduct {
    const images = product.images as string[];
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : undefined,
      image: images?.[0],
      rating: product.reviewStats?.averageRating
        ? Number(product.reviewStats.averageRating)
        : undefined,
      reviewCount: product.reviewStats?.reviewCount ?? 0,
      inStock: product.stockQuantity > 0,
    };
  }

  /**
   * Get default recommendation configuration
   */
  private getDefaultConfig(companyId: string): RecommendationConfigData {
    return {
      companyId,
      alsoBought: {
        enabled: true,
        title: 'Customers Who Bought This Also Bought',
        minCoOccurrences: 5,
        lookbackDays: 90,
        maxResults: 10,
        displayStyle: 'CAROUSEL',
        useAIRanking: false,
        excludeCategories: [],
        boostHighMargin: true,
        boostInStock: true,
        showRatings: true,
        showQuickAdd: true,
      },
      youMightLike: {
        enabled: true,
        title: 'Recommended For You',
        titleForGuests: 'You Might Also Like',
        maxResults: 8,
        displayStyle: 'GRID',
        browsingWeight: 0.3,
        purchaseWeight: 0.4,
        contentWeight: 0.3,
        diversityFactor: 0.5,
        excludeRecentlyViewed: true,
        excludePurchased: true,
        showPersonalizationBadge: true,
      },
      frequentlyViewed: {
        enabled: true,
        title: 'Frequently Viewed Together',
        minSessionCoViews: 10,
        lookbackDays: 60,
        maxBundleSize: 3,
        bundleDiscountPercent: 10,
        showBundleSavings: true,
        showAddAllButton: true,
        displayStyle: 'BUNDLE_CARDS',
      },
      global: {
        maxSectionsPerPage: 3,
        respectInventory: true,
        minRatingToShow: 0,
        trackImpressions: true,
        trackClicks: true,
      },
    };
  }
}
