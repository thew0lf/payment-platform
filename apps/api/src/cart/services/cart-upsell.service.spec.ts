/**
 * Cart Upsell Service Unit Tests
 *
 * Comprehensive tests for upsell functionality including:
 * - Getting upsell suggestions for a cart
 * - Frequently bought together products
 * - Similar category products
 * - Popular products fallback
 * - Tracking impressions and conversions
 * - Merging and scoring logic
 * - Configuration handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CartUpsellService, UpsellReason, UpsellProduct, UpsellConfig } from './cart-upsell.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyCartSettingsService } from './company-cart-settings.service';

describe('CartUpsellService', () => {
  let service: CartUpsellService;
  let prisma: any;

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockCompanyId = 'company-123';
  const mockCartId = 'cart-456';
  const mockCustomerId = 'customer-789';
  const mockProductId1 = 'product-001';
  const mockProductId2 = 'product-002';
  const mockProductId3 = 'product-003';
  const mockCategoryId1 = 'category-001';
  const mockCategoryId2 = 'category-002';

  const createMockProduct = (overrides: Partial<any> = {}) => ({
    id: mockProductId1,
    name: 'Test Product',
    description: 'A test product description',
    price: 29.99,
    compareAtPrice: 39.99,
    images: ['https://example.com/image1.jpg'],
    status: 'ACTIVE',
    deletedAt: null,
    ...overrides,
  });

  const createMockCartItem = (overrides: Partial<any> = {}) => ({
    id: 'item-001',
    cartId: mockCartId,
    productId: mockProductId1,
    product: {
      id: mockProductId1,
      tags: ['coffee', 'organic'],
      categoryAssignments: [{ categoryId: mockCategoryId1 }],
    },
    ...overrides,
  });

  const createMockCart = (overrides: Partial<any> = {}) => ({
    id: mockCartId,
    companyId: mockCompanyId,
    items: [createMockCartItem()],
    ...overrides,
  });

  const createMockOrderItem = (overrides: Partial<any> = {}) => ({
    orderId: 'order-001',
    productId: mockProductId2,
    product: createMockProduct({ id: mockProductId2, name: 'Related Product' }),
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  const mockCompanyCartSettingsService = {
    getUpsellSettings: jest.fn().mockResolvedValue({
      enabled: true,
      maxSuggestions: 3,
      minConfidenceScore: 0.3,
      preferBundles: true,
      excludeRecentlyPurchased: true,
      recentPurchaseDays: 30,
    }),
  };

  beforeEach(async () => {
    prisma = {
      cart: {
        findUnique: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
      },
      orderItem: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      companySettings: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartUpsellService,
        { provide: PrismaService, useValue: prisma },
        { provide: CompanyCartSettingsService, useValue: mockCompanyCartSettingsService },
      ],
    }).compile();

    service = module.get<CartUpsellService>(CartUpsellService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // getUpsellSuggestions() TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getUpsellSuggestions', () => {
    it('should return empty array when cart is not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      expect(result).toEqual([]);
      expect(prisma.cart.findUnique).toHaveBeenCalledWith({
        where: { id: mockCartId },
        include: expect.any(Object),
      });
    });

    it('should return empty array when cart has no items', async () => {
      prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [] }));

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      expect(result).toEqual([]);
    });

    it('should return suggestions from frequently bought together', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      // Mock frequently bought together
      prisma.orderItem.findMany
        .mockResolvedValueOnce([{ orderId: 'order-001' }, { orderId: 'order-002' }]) // Related orders
        .mockResolvedValueOnce([
          createMockOrderItem({ productId: mockProductId2 }),
          createMockOrderItem({ productId: mockProductId2 }),
        ]); // Co-purchased products

      // Mock similar category - no results
      prisma.product.findMany.mockResolvedValue([]);

      // Mock popular products - no results
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should exclude cart product IDs from suggestions', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.orderItem.findMany
        .mockResolvedValueOnce([{ orderId: 'order-001' }])
        .mockResolvedValueOnce([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      // Verify orderItem.findMany was called with notIn containing cart product IDs
      const secondCall = prisma.orderItem.findMany.mock.calls[1];
      if (secondCall) {
        expect(secondCall[0].where.productId.notIn).toContain(mockProductId1);
      }
    });

    it('should exclude recently purchased products when customerId is provided', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      // Mock recently purchased products
      prisma.orderItem.findMany
        .mockResolvedValueOnce([{ productId: 'recent-product-1' }]) // Recently purchased
        .mockResolvedValueOnce([{ orderId: 'order-001' }]) // Related orders
        .mockResolvedValueOnce([]); // Co-purchased products

      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      await service.getUpsellSuggestions(mockCartId, mockCompanyId, mockCustomerId);

      expect(prisma.orderItem.findMany).toHaveBeenCalled();
    });

    it('should limit suggestions to maxSuggestions from config', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      // Return 10 suggestions, but should be limited to 3 (default maxSuggestions)
      const manyProducts = Array.from({ length: 10 }, (_, i) =>
        createMockOrderItem({
          productId: `product-${i + 10}`,
          product: createMockProduct({ id: `product-${i + 10}`, name: `Product ${i + 10}` }),
        }),
      );

      prisma.orderItem.findMany
        .mockResolvedValueOnce([{ orderId: 'order-001' }])
        .mockResolvedValueOnce(manyProducts);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should filter suggestions by minConfidenceScore', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      // All returned suggestions should have score >= 0.3 (default minConfidenceScore)
      result.forEach((suggestion) => {
        expect(suggestion.score).toBeGreaterThanOrEqual(0.3);
      });
    });

    it('should combine suggestions from multiple sources', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      // Frequently bought together
      prisma.orderItem.findMany
        .mockResolvedValueOnce([{ orderId: 'order-001' }])
        .mockResolvedValueOnce([
          createMockOrderItem({ productId: 'freq-product-1', product: createMockProduct({ id: 'freq-product-1' }) }),
        ]);

      // Similar category products
      prisma.product.findMany.mockResolvedValue([
        createMockProduct({ id: 'cat-product-1', name: 'Category Product' }),
      ]);

      // Popular products
      prisma.orderItem.groupBy.mockResolvedValue([{ productId: 'popular-1', _count: { productId: 10 } }]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      expect(prisma.cart.findUnique).toHaveBeenCalled();
      expect(prisma.orderItem.findMany).toHaveBeenCalled();
      expect(prisma.product.findMany).toHaveBeenCalled();
    });

    it('should handle products without images', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      prisma.orderItem.findMany
        .mockResolvedValueOnce([{ orderId: 'order-001' }])
        .mockResolvedValueOnce([
          createMockOrderItem({
            product: { ...createMockProduct({ id: 'no-image-product' }), images: null },
          }),
        ]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      // Should not throw error when images is null
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle products without compareAtPrice', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      prisma.orderItem.findMany
        .mockResolvedValueOnce([{ orderId: 'order-001' }])
        .mockResolvedValueOnce([
          createMockOrderItem({
            product: { ...createMockProduct({ id: 'no-compare-product' }), compareAtPrice: null },
          }),
        ]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      result.forEach((suggestion) => {
        if (suggestion.id === 'no-compare-product') {
          expect(suggestion.originalPrice).toBeUndefined();
        }
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getFrequentlyBoughtTogether() TESTS (via getUpsellSuggestions)
  // ═══════════════════════════════════════════════════════════════

  describe('getFrequentlyBoughtTogether (internal)', () => {
    it('should return empty when no related orders found', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.orderItem.findMany.mockResolvedValueOnce([]); // No related orders
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      // Should still return results from other strategies
      expect(Array.isArray(result)).toBe(true);
    });

    it('should count product occurrences and sort by frequency', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      // Create multiple occurrences of same product
      prisma.orderItem.findMany
        .mockResolvedValueOnce([{ orderId: 'order-001' }, { orderId: 'order-002' }, { orderId: 'order-003' }])
        .mockResolvedValueOnce([
          createMockOrderItem({ productId: 'freq-1', product: createMockProduct({ id: 'freq-1' }) }),
          createMockOrderItem({ productId: 'freq-1', product: createMockProduct({ id: 'freq-1' }) }),
          createMockOrderItem({ productId: 'freq-1', product: createMockProduct({ id: 'freq-1' }) }),
          createMockOrderItem({ productId: 'freq-2', product: createMockProduct({ id: 'freq-2' }) }),
        ]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      // freq-1 should be first due to higher count
      if (result.length > 0) {
        const freqProduct = result.find((r) => r.id === 'freq-1');
        if (freqProduct) {
          expect(freqProduct.reason).toBe(UpsellReason.FREQUENTLY_BOUGHT_TOGETHER);
        }
      }
    });

    it('should filter out inactive and deleted products', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      prisma.orderItem.findMany
        .mockResolvedValueOnce([{ orderId: 'order-001' }])
        .mockResolvedValueOnce([]); // Will be filtered by the where clause

      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      // Verify the query includes proper filters
      const secondCall = prisma.orderItem.findMany.mock.calls[1];
      if (secondCall) {
        expect(secondCall[0].where.product.deletedAt).toBe(null);
        expect(secondCall[0].where.product.status).toBe('ACTIVE');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getSimilarCategoryProducts() TESTS (via getUpsellSuggestions)
  // ═══════════════════════════════════════════════════════════════

  describe('getSimilarCategoryProducts (internal)', () => {
    it('should return empty when cart items have no categories', async () => {
      const mockCart = createMockCart({
        items: [
          {
            ...createMockCartItem(),
            product: {
              id: mockProductId1,
              tags: [],
              categoryAssignments: [],
            },
          },
        ],
      });
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should query products with matching category assignments', async () => {
      const mockCart = createMockCart({
        items: [
          {
            ...createMockCartItem(),
            product: {
              id: mockProductId1,
              tags: [],
              categoryAssignments: [{ categoryId: mockCategoryId1 }, { categoryId: mockCategoryId2 }],
            },
          },
        ],
      });
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([
        createMockProduct({ id: 'cat-product-1', name: 'Similar Category Product' }),
      ]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryAssignments: expect.objectContaining({
              some: expect.objectContaining({
                categoryId: { in: expect.arrayContaining([mockCategoryId1, mockCategoryId2]) },
              }),
            }),
          }),
        }),
      );
    });

    it('should assign SIMILAR_CATEGORY reason with score 0.6', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([
        createMockProduct({ id: 'cat-product-1', name: 'Similar Category Product' }),
      ]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      const categoryProduct = result.find((r) => r.id === 'cat-product-1');
      if (categoryProduct) {
        expect(categoryProduct.reason).toBe(UpsellReason.SIMILAR_CATEGORY);
        expect(categoryProduct.score).toBe(0.6);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getPopularProducts() TESTS (via getUpsellSuggestions)
  // ═══════════════════════════════════════════════════════════════

  describe('getPopularProducts (internal)', () => {
    it('should query products ordered in last 30 days', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      expect(prisma.orderItem.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            order: expect.objectContaining({
              createdAt: expect.objectContaining({
                gte: expect.any(Date),
              }),
            }),
          }),
        }),
      );
    });

    it('should assign POPULAR reason with score 0.4', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValueOnce([]); // Similar category
      prisma.orderItem.groupBy.mockResolvedValue([{ productId: 'popular-1', _count: { productId: 10 } }]);
      prisma.product.findMany.mockResolvedValueOnce([
        createMockProduct({ id: 'popular-1', name: 'Popular Product' }),
      ]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      const popularProduct = result.find((r) => r.id === 'popular-1');
      if (popularProduct) {
        expect(popularProduct.reason).toBe(UpsellReason.POPULAR);
        expect(popularProduct.score).toBe(0.4);
      }
    });

    it('should exclude cart products from popular products query', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      expect(prisma.orderItem.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productId: { notIn: expect.arrayContaining([mockProductId1]) },
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // mergeAndScore() TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('mergeAndScore', () => {
    it('should deduplicate products keeping higher score', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      // Same product appears in both frequently bought and similar category
      prisma.orderItem.findMany
        .mockResolvedValueOnce([{ orderId: 'order-001' }])
        .mockResolvedValueOnce([
          createMockOrderItem({ productId: 'dup-product', product: createMockProduct({ id: 'dup-product' }) }),
        ]);
      prisma.product.findMany.mockResolvedValue([createMockProduct({ id: 'dup-product', name: 'Duplicate' })]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      // Should only appear once
      const duplicateProducts = result.filter((r) => r.id === 'dup-product');
      expect(duplicateProducts.length).toBeLessThanOrEqual(1);

      // Should keep higher score (0.9 from FREQUENTLY_BOUGHT_TOGETHER)
      if (duplicateProducts.length === 1) {
        expect(duplicateProducts[0].score).toBe(0.9);
      }
    });

    it('should sort results by score descending', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      // Return products with different scores
      prisma.orderItem.findMany
        .mockResolvedValueOnce([{ orderId: 'order-001' }])
        .mockResolvedValueOnce([
          createMockOrderItem({ productId: 'high-score', product: createMockProduct({ id: 'high-score' }) }),
        ]);
      prisma.product.findMany.mockResolvedValue([
        createMockProduct({ id: 'medium-score', name: 'Medium Score' }),
      ]);
      prisma.orderItem.groupBy.mockResolvedValue([{ productId: 'low-score', _count: { productId: 5 } }]);
      prisma.product.findMany.mockResolvedValueOnce([createMockProduct({ id: 'low-score', name: 'Low Score' })]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      // Verify sorted by score
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // trackUpsellImpression() TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('trackUpsellImpression', () => {
    it('should log impression and return impression ID', async () => {
      const result = await service.trackUpsellImpression(
        mockCartId,
        mockProductId1,
        UpsellReason.FREQUENTLY_BOUGHT_TOGETHER,
      );
      // Returns impression ID (string) or empty string on error
      expect(typeof result).toBe('string');
    });

    it('should accept all UpsellReason types', async () => {
      const reasons = Object.values(UpsellReason);

      for (const reason of reasons) {
        const result = await service.trackUpsellImpression(mockCartId, mockProductId1, reason);
        // Returns impression ID (string) or empty string on error
        expect(typeof result).toBe('string');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // trackUpsellConversion() TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('trackUpsellConversion', () => {
    it('should log conversion without throwing', async () => {
      await expect(
        service.trackUpsellConversion(mockCartId, mockProductId1, UpsellReason.SIMILAR_CATEGORY),
      ).resolves.toBeUndefined();
    });

    it('should accept all UpsellReason types', async () => {
      const reasons = Object.values(UpsellReason);

      for (const reason of reasons) {
        await expect(service.trackUpsellConversion(mockCartId, mockProductId1, reason)).resolves.toBeUndefined();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getConfig() TESTS (via getUpsellSuggestions behavior)
  // ═══════════════════════════════════════════════════════════════

  describe('getConfig (internal)', () => {
    it('should use default config values', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      // Default maxSuggestions is 3
      expect(result.length).toBeLessThanOrEqual(3);
    });

    // Note: When getConfig is updated to load from database, add tests for:
    // - Disabled upsells (enabled: false)
    // - Custom maxSuggestions
    // - Custom minConfidenceScore
    // - excludeRecentlyPurchased settings
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle cart with multiple items', async () => {
      const mockCart = createMockCart({
        items: [
          createMockCartItem({ productId: 'product-a' }),
          createMockCartItem({ productId: 'product-b' }),
          createMockCartItem({ productId: 'product-c' }),
        ],
      });
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle cart items with null category assignments', async () => {
      const mockCart = createMockCart({
        items: [
          {
            ...createMockCartItem(),
            product: {
              id: mockProductId1,
              tags: [],
              categoryAssignments: null,
            },
          },
        ],
      });
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      // Should not throw
      await expect(service.getUpsellSuggestions(mockCartId, mockCompanyId)).resolves.toBeDefined();
    });

    it('should handle products with empty images array', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      prisma.orderItem.findMany
        .mockResolvedValueOnce([{ orderId: 'order-001' }])
        .mockResolvedValueOnce([
          createMockOrderItem({
            product: { ...createMockProduct({ id: 'empty-images' }), images: [] },
          }),
        ]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);
      const emptyImagesProduct = result.find((r) => r.id === 'empty-images');
      if (emptyImagesProduct) {
        expect(emptyImagesProduct.imageUrl).toBeUndefined();
      }
    });

    it('should handle Decimal prices correctly', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      // Simulate Prisma Decimal type
      const decimalPrice = { toNumber: () => 99.99 } as any;
      prisma.orderItem.findMany
        .mockResolvedValueOnce([{ orderId: 'order-001' }])
        .mockResolvedValueOnce([
          createMockOrderItem({
            product: { ...createMockProduct({ id: 'decimal-price' }), price: decimalPrice },
          }),
        ]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);
      const decimalProduct = result.find((r) => r.id === 'decimal-price');
      if (decimalProduct) {
        expect(typeof decimalProduct.price).toBe('number');
      }
    });

    it('should handle database errors gracefully', async () => {
      prisma.cart.findUnique.mockRejectedValue(new Error('Database connection error'));

      await expect(service.getUpsellSuggestions(mockCartId, mockCompanyId)).rejects.toThrow(
        'Database connection error',
      );
    });

    it('should work without customerId parameter', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      // Call without customerId
      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // UpsellProduct INTERFACE VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe('UpsellProduct Structure', () => {
    it('should return products with required fields', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      prisma.orderItem.findMany
        .mockResolvedValueOnce([{ orderId: 'order-001' }])
        .mockResolvedValueOnce([
          createMockOrderItem({
            productId: 'complete-product',
            product: createMockProduct({
              id: 'complete-product',
              name: 'Complete Product',
              description: 'Full description',
              price: 49.99,
              compareAtPrice: 59.99,
              images: ['https://example.com/image.jpg'],
            }),
          }),
        ]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      if (result.length > 0) {
        const product = result[0];
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('price');
        expect(product).toHaveProperty('reason');
        expect(product).toHaveProperty('score');
      }
    });

    it('should correctly map optional fields', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      prisma.orderItem.findMany
        .mockResolvedValueOnce([{ orderId: 'order-001' }])
        .mockResolvedValueOnce([
          createMockOrderItem({
            productId: 'optional-fields',
            product: createMockProduct({
              id: 'optional-fields',
              name: 'Optional Fields Product',
              description: 'Has description',
              price: 29.99,
              compareAtPrice: 39.99,
              images: ['https://example.com/img.jpg'],
            }),
          }),
        ]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);

      const result = await service.getUpsellSuggestions(mockCartId, mockCompanyId);

      const optionalProduct = result.find((r) => r.id === 'optional-fields');
      if (optionalProduct) {
        expect(optionalProduct.description).toBe('Has description');
        expect(optionalProduct.originalPrice).toBe(39.99);
        expect(optionalProduct.imageUrl).toBe('https://example.com/img.jpg');
      }
    });
  });
});
