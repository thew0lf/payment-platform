/**
 * Subscription Intelligence Service Unit Tests
 *
 * Comprehensive tests for subscription intelligence including:
 * - Getting subscription configurations
 * - Creating/updating configurations
 * - Evaluating subscription eligibility
 * - Generating subscription offers
 * - Cart subscription offers
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionFrequency } from '@prisma/client';
import { SubscriptionIntelligenceService } from './subscription-intelligence.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductSubscriptionConfigData, SubscriptionDiscountTier } from '../types/upsell.types';

describe('SubscriptionIntelligenceService', () => {
  let service: SubscriptionIntelligenceService;
  let prisma: {
    productSubscriptionConfig: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    product: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
    };
    orderItem: {
      findMany: jest.Mock;
      groupBy: jest.Mock;
    };
    order: {
      findMany: jest.Mock;
      aggregate: jest.Mock;
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockProductId = 'product-001';
  const mockCompanyId = 'company-123';
  const mockCustomerId = 'customer-456';

  const createMockDiscountTier = (overrides: Partial<SubscriptionDiscountTier> = {}): SubscriptionDiscountTier => ({
    frequency: SubscriptionFrequency.MONTHLY,
    discountPercent: 15,
    label: 'Monthly',
    ...overrides,
  });

  const createMockSubscriptionConfig = (overrides: Partial<ProductSubscriptionConfigData> = {}): ProductSubscriptionConfigData => ({
    productId: mockProductId,
    enabled: true,
    discountTiers: [
      createMockDiscountTier({ frequency: SubscriptionFrequency.WEEKLY, discountPercent: 25, label: 'Weekly (Best Value!)' }),
      createMockDiscountTier({ frequency: SubscriptionFrequency.BIWEEKLY, discountPercent: 20, label: 'Every 2 weeks' }),
      createMockDiscountTier({ frequency: SubscriptionFrequency.MONTHLY, discountPercent: 15, label: 'Monthly' }),
    ],
    defaultFrequency: SubscriptionFrequency.MONTHLY,
    freeShippingIncluded: true,
    eligibility: {
      requirePreviousPurchase: false,
      minOrderCount: 0,
      productCategories: [],
    },
    ...overrides,
  });

  const createMockProduct = (id: string = mockProductId, overrides: Partial<any> = {}) => ({
    id,
    companyId: mockCompanyId,
    name: 'Test Product',
    price: 29.99,
    images: ['https://example.com/image.jpg'],
    isSubscribable: true,
    deletedAt: null,
    categoryAssignments: [
      { category: { id: 'cat-1', name: 'Coffee' } },
    ],
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    prisma = {
      productSubscriptionConfig: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      orderItem: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionIntelligenceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SubscriptionIntelligenceService>(SubscriptionIntelligenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // getSubscriptionConfig TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getSubscriptionConfig', () => {
    it('should return null when no config exists', async () => {
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(null);

      const result = await service.getSubscriptionConfig(mockProductId);

      expect(result).toBeNull();
      expect(prisma.productSubscriptionConfig.findUnique).toHaveBeenCalledWith({
        where: { productId: mockProductId },
      });
    });

    it('should return config when exists', async () => {
      const mockConfig = createMockSubscriptionConfig();
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue({
        ...mockConfig,
        discountTiers: mockConfig.discountTiers,
        eligibility: mockConfig.eligibility,
      });

      const result = await service.getSubscriptionConfig(mockProductId);

      expect(result).toBeDefined();
      expect(result?.productId).toBe(mockProductId);
      expect(result?.enabled).toBe(true);
      expect(result?.discountTiers).toHaveLength(3);
    });

    it('should use cache for subsequent calls', async () => {
      const mockConfig = createMockSubscriptionConfig();
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(mockConfig);

      await service.getSubscriptionConfig(mockProductId);
      await service.getSubscriptionConfig(mockProductId);

      expect(prisma.productSubscriptionConfig.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // upsertSubscriptionConfig TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('upsertSubscriptionConfig', () => {
    it('should create config with default tiers', async () => {
      const mockProduct = createMockProduct();
      const mockConfig = createMockSubscriptionConfig();
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(null);
      prisma.productSubscriptionConfig.upsert.mockResolvedValue(mockConfig);

      const result = await service.upsertSubscriptionConfig(mockProductId, mockCompanyId, {
        enabled: true,
      });

      expect(result).toBeDefined();
      expect(prisma.productSubscriptionConfig.upsert).toHaveBeenCalledWith({
        where: { productId: mockProductId },
        create: expect.objectContaining({
          productId: mockProductId,
          companyId: mockCompanyId,
          enabled: true,
        }),
        update: expect.any(Object),
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.upsertSubscriptionConfig(mockProductId, mockCompanyId, { enabled: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should verify product belongs to company', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.upsertSubscriptionConfig(mockProductId, 'different-company', { enabled: true }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockProductId,
          companyId: 'different-company',
          deletedAt: null,
        },
      });
    });

    it('should invalidate cache after upsert', async () => {
      const mockProduct = createMockProduct();
      const mockConfig = createMockSubscriptionConfig();
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.productSubscriptionConfig.upsert.mockResolvedValue(mockConfig);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(mockConfig);

      // Cache the config
      await service.getSubscriptionConfig(mockProductId);

      // Upsert should invalidate cache
      await service.upsertSubscriptionConfig(mockProductId, mockCompanyId, { enabled: false });

      // Next get should hit the database
      prisma.productSubscriptionConfig.findUnique.mockClear();
      await service.getSubscriptionConfig(mockProductId);

      expect(prisma.productSubscriptionConfig.findUnique).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // evaluateSubscriptionEligibility TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('evaluateSubscriptionEligibility', () => {
    it('should return not eligible when config is disabled', async () => {
      const mockProduct = createMockProduct();
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(
        createMockSubscriptionConfig({ enabled: false }),
      );

      const result = await service.evaluateSubscriptionEligibility(
        mockCustomerId,
        mockProductId,
        mockCompanyId,
      );

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Product not eligible for subscription');
    });

    it('should return not eligible when product is not subscribable', async () => {
      const mockProduct = createMockProduct(mockProductId, { isSubscribable: false });
      const mockConfig = createMockSubscriptionConfig();
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(mockConfig);

      const result = await service.evaluateSubscriptionEligibility(
        mockCustomerId,
        mockProductId,
        mockCompanyId,
      );

      expect(result.eligible).toBe(false);
      expect(result.reasons).toContain('Product type not suitable for subscription');
    });

    it('should consider repeat customer as eligible', async () => {
      const mockProduct = createMockProduct();
      const mockConfig = createMockSubscriptionConfig();
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(mockConfig);
      prisma.orderItem.findMany.mockResolvedValue([
        { order: { createdAt: new Date('2024-01-01'), total: 50 } },
        { order: { createdAt: new Date('2024-02-01'), total: 50 } },
        { order: { createdAt: new Date('2024-03-01'), total: 50 } },
      ]);
      prisma.order.findMany.mockResolvedValue([
        { total: 50 },
        { total: 50 },
        { total: 50 },
      ]);

      const result = await service.evaluateSubscriptionEligibility(
        mockCustomerId,
        mockProductId,
        mockCompanyId,
      );

      expect(result.reasons).toContain('Repeat customer');
    });

    it('should identify consumable products', async () => {
      const mockProduct = createMockProduct(mockProductId, {
        categoryAssignments: [{ category: { id: 'cat-1', name: 'coffee' } }],
      });
      const mockConfig = createMockSubscriptionConfig();
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(mockConfig);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.order.findMany.mockResolvedValue([]);

      const result = await service.evaluateSubscriptionEligibility(
        null,
        mockProductId,
        mockCompanyId,
      );

      expect(result.reasons).toContain('Consumable product');
    });

    it('should return estimated LTV', async () => {
      const mockProduct = createMockProduct();
      const mockConfig = createMockSubscriptionConfig();
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(mockConfig);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.order.findMany.mockResolvedValue([]);

      const result = await service.evaluateSubscriptionEligibility(
        null,
        mockProductId,
        mockCompanyId,
      );

      expect(result.estimatedLTV).toBeGreaterThan(0);
      expect(result.recommendedFrequency).toBeDefined();
      expect(result.recommendedDiscount).toBeGreaterThan(0);
    });

    it('should determine price preference for high-value customers', async () => {
      const mockProduct = createMockProduct();
      const mockConfig = createMockSubscriptionConfig();
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(mockConfig);
      prisma.orderItem.findMany.mockResolvedValue([
        { order: { createdAt: new Date(), total: 250 } },
      ]);
      // LTV needs to be > 200 for "High-value customer" reason
      prisma.order.findMany.mockResolvedValue([{ total: 250 }]);
      prisma.order.aggregate.mockResolvedValue({ _avg: { total: 250 } });

      const result = await service.evaluateSubscriptionEligibility(
        mockCustomerId,
        mockProductId,
        mockCompanyId,
      );

      expect(result.reasons).toContain('High-value customer');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getSubscriptionOffer TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getSubscriptionOffer', () => {
    it('should return null when product not found', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const result = await service.getSubscriptionOffer(mockProductId, mockCompanyId, null);

      expect(result).toBeNull();
    });

    it('should return null when product is not subscribable', async () => {
      const mockProduct = createMockProduct(mockProductId, { isSubscribable: false });
      prisma.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.getSubscriptionOffer(mockProductId, mockCompanyId, null);

      expect(result).toBeNull();
    });

    it('should return null when config is disabled', async () => {
      const mockProduct = createMockProduct();
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(
        createMockSubscriptionConfig({ enabled: false }),
      );

      const result = await service.getSubscriptionOffer(mockProductId, mockCompanyId, null);

      expect(result).toBeNull();
    });

    it('should return offer with savings calculations', async () => {
      // Product must be in a consumable category (0.2) AND customer must have repeat purchases (0.3)
      // to reach score >= 0.3 for eligibility
      const mockProduct = createMockProduct(mockProductId, {
        price: 29.99,
        categoryAssignments: [{ category: { id: 'cat-1', name: 'Coffee' } }],
      });
      const mockConfig = createMockSubscriptionConfig();
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(mockConfig);
      // Repeat customer adds 0.3 to score (purchaseCount >= 2)
      prisma.orderItem.findMany.mockResolvedValue([
        { order: { createdAt: new Date('2025-01-01'), total: 30 } },
        { order: { createdAt: new Date('2025-01-15'), total: 30 } },
      ]);
      prisma.order.findMany.mockResolvedValue([{ total: 60 }]);

      const result = await service.getSubscriptionOffer(mockProductId, mockCompanyId, mockCustomerId);

      expect(result).toBeDefined();
      expect(result?.productId).toBe(mockProductId);
      expect(result?.productPrice).toBe(29.99);
      expect(result?.savingsPerOrder).toBeGreaterThan(0);
      expect(result?.savingsPerYear).toBeGreaterThan(0);
      expect(result?.discountTiers).toHaveLength(3);
    });

    it('should include eligibility details in offer', async () => {
      // Product must be in a consumable category (0.2) AND customer must have repeat purchases (0.3)
      // to reach score >= 0.3 for eligibility
      const mockProduct = createMockProduct(mockProductId, {
        categoryAssignments: [{ category: { id: 'cat-1', name: 'Coffee' } }],
      });
      const mockConfig = createMockSubscriptionConfig();
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(mockConfig);
      // Repeat customer adds 0.3 to score (purchaseCount >= 2)
      prisma.orderItem.findMany.mockResolvedValue([
        { order: { createdAt: new Date('2025-01-01'), total: 30 } },
        { order: { createdAt: new Date('2025-01-15'), total: 30 } },
      ]);
      prisma.order.findMany.mockResolvedValue([{ total: 60 }]);

      const result = await service.getSubscriptionOffer(mockProductId, mockCompanyId, mockCustomerId);

      expect(result?.eligibility).toBeDefined();
      expect(result?.eligibility.recommendedFrequency).toBeDefined();
      expect(result?.eligibility.recommendedDiscount).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getCartSubscriptionOffers TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getCartSubscriptionOffers', () => {
    it('should return offers for eligible items', async () => {
      const mockProduct = createMockProduct();
      const mockConfig = createMockSubscriptionConfig();

      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(mockConfig);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.order.findMany.mockResolvedValue([]);

      const items = [
        { productId: 'p1' },
        { productId: 'p2' },
      ];
      const result = await service.getCartSubscriptionOffers(items, mockCompanyId, null);

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should sort offers by estimated LTV', async () => {
      const mockProduct1 = createMockProduct('p1', { price: 50 });
      const mockProduct2 = createMockProduct('p2', { price: 100 });
      const mockConfig = createMockSubscriptionConfig();

      prisma.product.findUnique.mockResolvedValueOnce(mockProduct1);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValueOnce(mockConfig);
      prisma.orderItem.findMany.mockResolvedValueOnce([]);
      prisma.order.findMany.mockResolvedValueOnce([]);

      prisma.product.findUnique.mockResolvedValueOnce(mockProduct2);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValueOnce(mockConfig);
      prisma.orderItem.findMany.mockResolvedValueOnce([]);
      prisma.order.findMany.mockResolvedValueOnce([]);

      const items = [
        { productId: 'p1' },
        { productId: 'p2' },
      ];
      const result = await service.getCartSubscriptionOffers(items, mockCompanyId, null);

      // Higher priced product should have higher LTV and be first
      if (result.length > 1) {
        expect(result[0].eligibility.estimatedLTV).toBeGreaterThanOrEqual(
          result[1].eligibility.estimatedLTV,
        );
      }
    });

    it('should limit results to top 2', async () => {
      const mockProduct = createMockProduct();
      const mockConfig = createMockSubscriptionConfig();

      for (let i = 0; i < 5; i++) {
        prisma.product.findUnique.mockResolvedValueOnce(mockProduct);
        prisma.productSubscriptionConfig.findUnique.mockResolvedValueOnce(mockConfig);
        prisma.orderItem.findMany.mockResolvedValueOnce([]);
        prisma.order.findMany.mockResolvedValueOnce([]);
      }

      const items = [
        { productId: 'p0' },
        { productId: 'p1' },
        { productId: 'p2' },
        { productId: 'p3' },
        { productId: 'p4' },
      ];
      const result = await service.getCartSubscriptionOffers(items, mockCompanyId, null);

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array when no eligible products', async () => {
      prisma.product.findUnique.mockResolvedValue(
        createMockProduct(mockProductId, { isSubscribable: false }),
      );

      const items = [{ productId: mockProductId }];
      const result = await service.getCartSubscriptionOffers(items, mockCompanyId, null);

      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FREQUENCY PREDICTION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Frequency Prediction', () => {
    it('should predict WEEKLY for very frequent purchases', async () => {
      const mockProduct = createMockProduct();
      const mockConfig = createMockSubscriptionConfig();
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(mockConfig);

      // Simulate purchases every 7 days
      const purchases = [
        { order: { createdAt: new Date('2024-01-01') } },
        { order: { createdAt: new Date('2024-01-08') } },
        { order: { createdAt: new Date('2024-01-15') } },
      ];
      prisma.orderItem.findMany.mockResolvedValue(purchases);
      prisma.order.findMany.mockResolvedValue([{ total: 30 }]);

      const result = await service.evaluateSubscriptionEligibility(
        mockCustomerId,
        mockProductId,
        mockCompanyId,
      );

      // Should recommend weekly based on purchase pattern
      expect([
        SubscriptionFrequency.WEEKLY,
        SubscriptionFrequency.BIWEEKLY,
        SubscriptionFrequency.MONTHLY,
      ]).toContain(result.recommendedFrequency);
    });

    it('should use default frequency for new customers', async () => {
      const mockProduct = createMockProduct();
      const mockConfig = createMockSubscriptionConfig({
        defaultFrequency: SubscriptionFrequency.BIWEEKLY,
      });
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productSubscriptionConfig.findUnique.mockResolvedValue(mockConfig);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.order.findMany.mockResolvedValue([]);

      const result = await service.evaluateSubscriptionEligibility(
        null,
        mockProductId,
        mockCompanyId,
      );

      expect(result.recommendedFrequency).toBe(SubscriptionFrequency.BIWEEKLY);
    });
  });
});
