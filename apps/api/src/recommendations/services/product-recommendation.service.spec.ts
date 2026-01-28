/**
 * Product Recommendation Service Unit Tests
 *
 * Comprehensive tests for product recommendations including:
 * - Getting product page recommendations
 * - Also Bought recommendations
 * - You Might Like personalized recommendations
 * - Frequently Viewed Together bundles
 * - Configuration management
 * - Tracking (views, clicks, add to cart)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ProductRecommendationService } from './product-recommendation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RecommendationConfigData, AlsoBoughtConfig, YouMightLikeConfig, FrequentlyViewedConfig } from '../types/recommendation.types';

describe('ProductRecommendationService', () => {
  let service: ProductRecommendationService;
  let prisma: {
    recommendationConfig: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    orderItem: {
      findMany: jest.Mock;
      groupBy: jest.Mock;
    };
    product: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    productView: {
      findMany: jest.Mock;
      groupBy: jest.Mock;
      create: jest.Mock;
    };
    productCategoryAssignment: {
      groupBy: jest.Mock;
    };
    order: {
      aggregate: jest.Mock;
    };
    recommendationImpression: {
      create: jest.Mock;
      createMany: jest.Mock;
      update: jest.Mock;
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockCompanyId = 'company-123';
  const mockProductId = 'product-001';
  const mockCustomerId = 'customer-456';
  const mockSessionId = 'session-789';

  const createMockProduct = (id: string, overrides: Partial<any> = {}) => ({
    id,
    name: `Product ${id}`,
    slug: `product-${id}`,
    price: 29.99,
    compareAtPrice: null,
    images: ['https://example.com/image.jpg'],
    status: 'ACTIVE',
    stockQuantity: 100,
    reviewStats: {
      averageRating: 4.5,
      totalReviews: 25,
      reviewCount: 25,
    },
    categoryAssignments: [{ categoryId: 'cat-1' }],
    ...overrides,
  });

  const createMockAlsoBoughtConfig = (overrides: Partial<AlsoBoughtConfig> = {}): AlsoBoughtConfig => ({
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
    ...overrides,
  });

  const createMockYouMightLikeConfig = (overrides: Partial<YouMightLikeConfig> = {}): YouMightLikeConfig => ({
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
    ...overrides,
  });

  const createMockFrequentlyViewedConfig = (overrides: Partial<FrequentlyViewedConfig> = {}): FrequentlyViewedConfig => ({
    enabled: true,
    title: 'Frequently Viewed Together',
    minSessionCoViews: 10,
    lookbackDays: 60,
    maxBundleSize: 3,
    bundleDiscountPercent: 10,
    showBundleSavings: true,
    showAddAllButton: true,
    displayStyle: 'BUNDLE_CARDS',
    ...overrides,
  });

  const createMockRecommendationConfig = (): RecommendationConfigData => ({
    companyId: mockCompanyId,
    alsoBought: createMockAlsoBoughtConfig(),
    youMightLike: createMockYouMightLikeConfig(),
    frequentlyViewed: createMockFrequentlyViewedConfig(),
    global: {
      maxSectionsPerPage: 3,
      respectInventory: true,
      minRatingToShow: 0,
      trackImpressions: true,
      trackClicks: true,
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    prisma = {
      recommendationConfig: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      orderItem: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      productView: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
        create: jest.fn(),
      },
      productCategoryAssignment: {
        groupBy: jest.fn(),
      },
      order: {
        aggregate: jest.fn(),
      },
      recommendationImpression: {
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductRecommendationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProductRecommendationService>(ProductRecommendationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // getRecommendationConfig TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getRecommendationConfig', () => {
    it('should return default config when no config exists', async () => {
      prisma.recommendationConfig.findUnique.mockResolvedValue(null);

      const result = await service.getRecommendationConfig(mockCompanyId);

      expect(result.companyId).toBe(mockCompanyId);
      expect(result.alsoBought.enabled).toBe(true);
      expect(result.youMightLike.enabled).toBe(true);
      expect(result.frequentlyViewed.enabled).toBe(true);
    });

    it('should return stored config when exists', async () => {
      const storedConfig = {
        companyId: mockCompanyId,
        alsoBought: { enabled: false },
        youMightLike: { maxResults: 5 },
        frequentlyViewed: { bundleDiscountPercent: 15 },
        global: { maxSectionsPerPage: 2 },
      };
      prisma.recommendationConfig.findUnique.mockResolvedValue(storedConfig);

      const result = await service.getRecommendationConfig(mockCompanyId);

      expect(result.alsoBought.enabled).toBe(false);
      expect(result.youMightLike.maxResults).toBe(5);
      expect(result.frequentlyViewed.bundleDiscountPercent).toBe(15);
    });

    it('should cache config for subsequent calls', async () => {
      // Config must be found to be cached (null config returns default without caching)
      const storedConfig = {
        companyId: mockCompanyId,
        alsoBought: { enabled: true },
        youMightLike: { maxResults: 8 },
        frequentlyViewed: { bundleDiscountPercent: 10 },
        global: { maxSectionsPerPage: 3 },
      };
      prisma.recommendationConfig.findUnique.mockResolvedValue(storedConfig);

      await service.getRecommendationConfig(mockCompanyId);
      await service.getRecommendationConfig(mockCompanyId);

      // Should only call database once due to caching
      expect(prisma.recommendationConfig.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateRecommendationConfig TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('updateRecommendationConfig', () => {
    it('should upsert config successfully', async () => {
      const existingConfig = createMockRecommendationConfig();
      prisma.recommendationConfig.findUnique.mockResolvedValue(existingConfig);
      prisma.recommendationConfig.upsert.mockResolvedValue({
        companyId: mockCompanyId,
        alsoBought: { enabled: false },
        youMightLike: existingConfig.youMightLike,
        frequentlyViewed: existingConfig.frequentlyViewed,
        global: existingConfig.global,
      });

      const updates = { alsoBought: { enabled: false } };
      const result = await service.updateRecommendationConfig(mockCompanyId, updates as Partial<RecommendationConfigData>);

      expect(result.alsoBought.enabled).toBe(false);
      expect(prisma.recommendationConfig.upsert).toHaveBeenCalled();
    });

    it('should invalidate cache after update', async () => {
      const existingConfig = createMockRecommendationConfig();
      prisma.recommendationConfig.findUnique.mockResolvedValue(existingConfig);
      prisma.recommendationConfig.upsert.mockResolvedValue(existingConfig);

      await service.updateRecommendationConfig(mockCompanyId, {});

      // After update, cache should be cleared
      // Next getRecommendationConfig should hit the database
      prisma.recommendationConfig.findUnique.mockClear();
      await service.getRecommendationConfig(mockCompanyId);

      expect(prisma.recommendationConfig.findUnique).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getProductPageRecommendations TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getProductPageRecommendations', () => {
    it('should return all enabled recommendation sections', async () => {
      const config = createMockRecommendationConfig();
      prisma.recommendationConfig.findUnique.mockResolvedValue(config);

      // Mock also bought data
      prisma.orderItem.findMany.mockResolvedValue([{ orderId: 'order-1' }]);
      // First call is for also bought, second is for customer signals
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'p2', _count: { productId: 10 }, _max: { createdAt: new Date() } },
      ]);
      prisma.product.findMany.mockResolvedValue([createMockProduct('p2')]);

      // Mock you might like data
      prisma.product.findUnique.mockResolvedValue(createMockProduct(mockProductId));
      prisma.productView.groupBy.mockResolvedValue([]);
      prisma.productCategoryAssignment.groupBy.mockResolvedValue([]);
      prisma.order.aggregate.mockResolvedValue({ _avg: { total: 50 } });

      // Mock frequently viewed data
      prisma.productView.findMany.mockResolvedValue([{ sessionId: 's1' }]);

      // Mock recommendation impressions
      prisma.recommendationImpression.createMany.mockResolvedValue({ count: 3 });

      const result = await service.getProductPageRecommendations(
        mockProductId,
        mockCompanyId,
        mockCustomerId,
        mockSessionId,
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('alsoBought');
      expect(result).toHaveProperty('youMightLike');
      expect(result).toHaveProperty('frequentlyViewed');
    });

    it('should skip disabled recommendation types', async () => {
      const config = createMockRecommendationConfig();
      config.alsoBought.enabled = false;
      config.frequentlyViewed.enabled = false;
      prisma.recommendationConfig.findUnique.mockResolvedValue(config);

      prisma.product.findUnique.mockResolvedValue(createMockProduct(mockProductId));
      prisma.product.findMany.mockResolvedValue([]);
      prisma.productView.groupBy.mockResolvedValue([]);
      prisma.productCategoryAssignment.groupBy.mockResolvedValue([]);

      const result = await service.getProductPageRecommendations(
        mockProductId,
        mockCompanyId,
      );

      expect(result.alsoBought).toBeNull();
      expect(result.frequentlyViewed).toBeNull();
    });

    it('should track impressions when sessionId provided and recommendations exist', async () => {
      const config = createMockRecommendationConfig();
      prisma.recommendationConfig.findUnique.mockResolvedValue(config);
      // Mock also bought data to generate recommendations
      prisma.orderItem.findMany.mockResolvedValue([{ orderId: 'order-1' }]);
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'p2', _count: { productId: 10 }, _max: { createdAt: new Date() } },
      ]);
      prisma.product.findUnique.mockResolvedValue(createMockProduct(mockProductId));
      prisma.product.findMany.mockResolvedValue([createMockProduct('p2')]);
      prisma.productView.findMany.mockResolvedValue([]);
      prisma.productView.groupBy.mockResolvedValue([]);
      prisma.productCategoryAssignment.groupBy.mockResolvedValue([]);
      prisma.order.aggregate.mockResolvedValue({ _avg: { total: 50 } });
      prisma.recommendationImpression.createMany.mockResolvedValue({ count: 1 });

      await service.getProductPageRecommendations(
        mockProductId,
        mockCompanyId,
        mockCustomerId,
        mockSessionId,
      );

      // Should track impressions when recommendations are returned
      expect(prisma.recommendationImpression.createMany).toHaveBeenCalled();
    });

    it('should not track impressions when no recommendations', async () => {
      const config = createMockRecommendationConfig();
      prisma.recommendationConfig.findUnique.mockResolvedValue(config);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);
      prisma.product.findUnique.mockResolvedValue(createMockProduct(mockProductId));
      prisma.product.findMany.mockResolvedValue([]);
      prisma.productView.findMany.mockResolvedValue([]);
      prisma.productView.groupBy.mockResolvedValue([]);
      prisma.productCategoryAssignment.groupBy.mockResolvedValue([]);
      prisma.order.aggregate.mockResolvedValue({ _avg: { total: 50 } });

      await service.getProductPageRecommendations(
        mockProductId,
        mockCompanyId,
        mockCustomerId,
        mockSessionId,
      );

      // Should not track impressions when all recommendation sections are null
      expect(prisma.recommendationImpression.createMany).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getAlsoBoughtRecommendations TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getAlsoBoughtRecommendations', () => {
    it('should return null when no orders contain the product', async () => {
      prisma.orderItem.findMany.mockResolvedValue([]);
      const config = createMockAlsoBoughtConfig();

      const result = await service.getAlsoBoughtRecommendations(
        mockProductId,
        mockCompanyId,
        config,
      );

      expect(result).toBeNull();
    });

    it('should return recommendations based on co-purchases', async () => {
      prisma.orderItem.findMany.mockResolvedValue([
        { orderId: 'order-1' },
        { orderId: 'order-2' },
      ]);
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'p2', _count: { productId: 10 } },
        { productId: 'p3', _count: { productId: 8 } },
      ]);
      prisma.product.findMany.mockResolvedValue([
        createMockProduct('p2'),
        createMockProduct('p3'),
      ]);

      const config = createMockAlsoBoughtConfig();
      const result = await service.getAlsoBoughtRecommendations(
        mockProductId,
        mockCompanyId,
        config,
      );

      expect(result).toBeDefined();
      expect(result?.type).toBe('ALSO_BOUGHT');
      expect(result?.products.length).toBeGreaterThan(0);
    });

    it('should filter by minimum co-occurrences', async () => {
      prisma.orderItem.findMany.mockResolvedValue([{ orderId: 'order-1' }]);
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'p2', _count: { productId: 2 } }, // Below threshold
      ]);

      const config = createMockAlsoBoughtConfig({ minCoOccurrences: 5 });
      const result = await service.getAlsoBoughtRecommendations(
        mockProductId,
        mockCompanyId,
        config,
      );

      expect(result).toBeNull();
    });

    it('should use caching for recommendations', async () => {
      prisma.orderItem.findMany.mockResolvedValue([{ orderId: 'order-1' }]);
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'p2', _count: { productId: 10 } },
      ]);
      prisma.product.findMany.mockResolvedValue([createMockProduct('p2')]);

      const config = createMockAlsoBoughtConfig();

      // First call
      await service.getAlsoBoughtRecommendations(mockProductId, mockCompanyId, config);

      // Reset mocks to verify caching
      prisma.orderItem.findMany.mockClear();

      // Second call should use cache
      await service.getAlsoBoughtRecommendations(mockProductId, mockCompanyId, config);

      expect(prisma.orderItem.findMany).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getYouMightLikeRecommendations TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getYouMightLikeRecommendations', () => {
    it('should return null when product not found', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.productView.groupBy.mockResolvedValue([]);
      prisma.productCategoryAssignment.groupBy.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);
      prisma.order.aggregate.mockResolvedValue({ _avg: { total: 0 } });

      const config = createMockYouMightLikeConfig();
      const result = await service.getYouMightLikeRecommendations(
        mockProductId,
        mockCompanyId,
        mockCustomerId,
        mockSessionId,
        config,
      );

      expect(result).toBeNull();
    });

    it('should return personalized recommendations for logged-in customer', async () => {
      prisma.product.findUnique.mockResolvedValue(createMockProduct(mockProductId));
      prisma.product.findMany.mockResolvedValue([createMockProduct('p2')]);
      prisma.productView.groupBy.mockResolvedValue([
        { productId: 'p1', _count: { productId: 5 }, _max: { viewedAt: new Date() } },
      ]);
      prisma.productCategoryAssignment.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _count: { categoryId: 3 } },
      ]);
      prisma.orderItem.groupBy.mockResolvedValue([]);
      prisma.order.aggregate.mockResolvedValue({ _avg: { total: 50 } });

      const config = createMockYouMightLikeConfig();
      const result = await service.getYouMightLikeRecommendations(
        mockProductId,
        mockCompanyId,
        mockCustomerId,
        mockSessionId,
        config,
      );

      expect(result).toBeDefined();
      expect(result?.type).toBe('YOU_MIGHT_LIKE');
      expect(result?.personalized).toBe(true);
    });

    it('should return non-personalized recommendations for guest', async () => {
      prisma.product.findUnique.mockResolvedValue(createMockProduct(mockProductId));
      prisma.product.findMany.mockResolvedValue([createMockProduct('p2')]);
      prisma.productView.groupBy.mockResolvedValue([]);
      prisma.productCategoryAssignment.groupBy.mockResolvedValue([]);

      const config = createMockYouMightLikeConfig();
      const result = await service.getYouMightLikeRecommendations(
        mockProductId,
        mockCompanyId,
        undefined,
        mockSessionId,
        config,
      );

      expect(result).toBeDefined();
      expect(result?.title).toBe(config.titleForGuests);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getFrequentlyViewedRecommendations TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getFrequentlyViewedRecommendations', () => {
    it('should return null when not enough session views', async () => {
      prisma.productView.findMany.mockResolvedValue([{ sessionId: 's1' }]); // Only 1 session

      const config = createMockFrequentlyViewedConfig({ minSessionCoViews: 10 });
      const result = await service.getFrequentlyViewedRecommendations(
        mockProductId,
        mockCompanyId,
        config,
      );

      expect(result).toBeNull();
    });

    it('should return bundle recommendations when sufficient data exists', async () => {
      const sessions = Array.from({ length: 15 }, (_, i) => ({ sessionId: `s${i}` }));
      prisma.productView.findMany.mockResolvedValue(sessions);
      prisma.productView.groupBy.mockResolvedValue([
        { productId: 'p2', _count: { sessionId: 12 } },
      ]);
      prisma.product.findUnique.mockResolvedValue(createMockProduct(mockProductId));
      prisma.product.findMany.mockResolvedValue([createMockProduct('p2')]);

      const config = createMockFrequentlyViewedConfig({ minSessionCoViews: 10 });
      const result = await service.getFrequentlyViewedRecommendations(
        mockProductId,
        mockCompanyId,
        config,
      );

      expect(result).toBeDefined();
      expect(result?.type).toBe('FREQUENTLY_VIEWED');
      expect(result?.bundles.length).toBeGreaterThan(0);
    });

    it('should calculate bundle pricing correctly', async () => {
      const sessions = Array.from({ length: 15 }, (_, i) => ({ sessionId: `s${i}` }));
      prisma.productView.findMany.mockResolvedValue(sessions);
      prisma.productView.groupBy.mockResolvedValue([
        { productId: 'p2', _count: { sessionId: 12 } },
      ]);
      prisma.product.findUnique.mockResolvedValue(createMockProduct(mockProductId, { price: 100 }));
      prisma.product.findMany.mockResolvedValue([createMockProduct('p2', { price: 50 })]);

      const config = createMockFrequentlyViewedConfig({ bundleDiscountPercent: 10 });
      const result = await service.getFrequentlyViewedRecommendations(
        mockProductId,
        mockCompanyId,
        config,
      );

      const bundle = result?.bundles[0];
      expect(bundle?.individualTotal).toBe(150);
      expect(bundle?.bundlePrice).toBe(135); // 150 * 0.9
      expect(bundle?.savings).toBe(15);
      expect(bundle?.discountPercent).toBe(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TRACKING TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('trackProductView', () => {
    it('should create product view record', async () => {
      prisma.productView.create.mockResolvedValue({ id: 'view-1' });

      await service.trackProductView({
        productId: mockProductId,
        companyId: mockCompanyId,
        sessionId: mockSessionId,
        customerId: mockCustomerId,
        source: 'DIRECT',
        duration: 30,
      });

      expect(prisma.productView.create).toHaveBeenCalledWith({
        data: {
          productId: mockProductId,
          companyId: mockCompanyId,
          sessionId: mockSessionId,
          customerId: mockCustomerId,
          source: 'DIRECT',
          sourceProductId: undefined,
          duration: 30,
        },
      });
    });
  });

  describe('trackRecommendationClick', () => {
    it('should update impression with click data', async () => {
      const impressionId = 'impression-123';
      const clickedProductId = 'product-456';
      prisma.recommendationImpression.update.mockResolvedValue({ id: impressionId });

      await service.trackRecommendationClick(impressionId, clickedProductId);

      expect(prisma.recommendationImpression.update).toHaveBeenCalledWith({
        where: { id: impressionId },
        data: {
          clickedProductId,
          clickedAt: expect.any(Date),
        },
      });
    });
  });

  describe('trackRecommendationAddToCart', () => {
    it('should update impression with add to cart data', async () => {
      const impressionId = 'impression-123';
      prisma.recommendationImpression.update.mockResolvedValue({ id: impressionId });

      await service.trackRecommendationAddToCart(impressionId);

      expect(prisma.recommendationImpression.update).toHaveBeenCalledWith({
        where: { id: impressionId },
        data: {
          addedToCart: true,
          addedAt: expect.any(Date),
        },
      });
    });
  });
});
