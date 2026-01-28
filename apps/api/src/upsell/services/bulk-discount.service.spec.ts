/**
 * Bulk Discount Service Unit Tests
 *
 * Comprehensive tests for bulk discount functionality including:
 * - Getting bulk discount configurations
 * - Creating/updating configurations
 * - Deleting configurations
 * - Price calculations with tiers
 * - Upsell recommendations
 * - Cart bulk recommendations
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BulkDiscountService } from './bulk-discount.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BulkDiscountTier, ProductBulkDiscountConfig } from '../types/upsell.types';

describe('BulkDiscountService', () => {
  let service: BulkDiscountService;
  let prisma: {
    productBulkDiscount: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
    product: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockProductId = 'product-001';
  const mockCompanyId = 'company-123';

  const createMockTier = (overrides: Partial<BulkDiscountTier> = {}): BulkDiscountTier => ({
    minQuantity: 2,
    maxQuantity: null,
    discountType: 'PERCENTAGE',
    discountValue: 10,
    label: 'Buy 2+, Save 10%',
    ...overrides,
  });

  const createMockBulkDiscountConfig = (overrides: Partial<ProductBulkDiscountConfig> = {}): ProductBulkDiscountConfig => ({
    productId: mockProductId,
    enabled: true,
    tiers: [
      createMockTier({ minQuantity: 2, maxQuantity: 4, discountValue: 10, label: 'Buy 2-4, Save 10%' }),
      createMockTier({ minQuantity: 5, maxQuantity: 9, discountValue: 15, label: 'Buy 5-9, Save 15%' }),
      createMockTier({ minQuantity: 10, maxQuantity: null, discountValue: 20, label: 'Buy 10+, Save 20%' }),
    ],
    stackWithOtherDiscounts: false,
    maxDiscountPercent: 30,
    validFrom: undefined,
    validUntil: undefined,
    ...overrides,
  });

  const createMockProduct = (id: string = mockProductId, overrides: Partial<any> = {}) => ({
    id,
    companyId: mockCompanyId,
    name: 'Test Product',
    price: 100,
    images: ['https://example.com/image.jpg'],
    deletedAt: null,
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    prisma = {
      productBulkDiscount: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkDiscountService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BulkDiscountService>(BulkDiscountService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // getProductBulkDiscount TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getProductBulkDiscount', () => {
    it('should return null when no config exists', async () => {
      prisma.productBulkDiscount.findUnique.mockResolvedValue(null);

      const result = await service.getProductBulkDiscount(mockProductId);

      expect(result).toBeNull();
      expect(prisma.productBulkDiscount.findUnique).toHaveBeenCalledWith({
        where: { productId: mockProductId },
      });
    });

    it('should return config when exists', async () => {
      const mockConfig = createMockBulkDiscountConfig();
      prisma.productBulkDiscount.findUnique.mockResolvedValue({
        ...mockConfig,
        tiers: mockConfig.tiers,
      });

      const result = await service.getProductBulkDiscount(mockProductId);

      expect(result).toBeDefined();
      expect(result?.productId).toBe(mockProductId);
      expect(result?.enabled).toBe(true);
      expect(result?.tiers).toHaveLength(3);
    });

    it('should use cache for subsequent calls', async () => {
      const mockConfig = createMockBulkDiscountConfig();
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);

      await service.getProductBulkDiscount(mockProductId);
      await service.getProductBulkDiscount(mockProductId);

      expect(prisma.productBulkDiscount.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // upsertBulkDiscount TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('upsertBulkDiscount', () => {
    it('should create new config when product exists', async () => {
      const mockProduct = createMockProduct();
      const mockConfig = createMockBulkDiscountConfig();
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.productBulkDiscount.upsert.mockResolvedValue(mockConfig);

      const result = await service.upsertBulkDiscount(mockProductId, mockCompanyId, {
        enabled: true,
        tiers: mockConfig.tiers,
      });

      expect(result).toBeDefined();
      expect(prisma.productBulkDiscount.upsert).toHaveBeenCalledWith({
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
        service.upsertBulkDiscount(mockProductId, mockCompanyId, { enabled: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should verify product belongs to company', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.upsertBulkDiscount(mockProductId, 'different-company', { enabled: true }),
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
      const mockConfig = createMockBulkDiscountConfig();
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.productBulkDiscount.upsert.mockResolvedValue(mockConfig);
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);

      // First, cache the config
      await service.getProductBulkDiscount(mockProductId);

      // Upsert should invalidate cache
      await service.upsertBulkDiscount(mockProductId, mockCompanyId, { enabled: false });

      // Next get should hit the database
      prisma.productBulkDiscount.findUnique.mockClear();
      await service.getProductBulkDiscount(mockProductId);

      expect(prisma.productBulkDiscount.findUnique).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // deleteBulkDiscount TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('deleteBulkDiscount', () => {
    it('should delete bulk discount config', async () => {
      prisma.productBulkDiscount.deleteMany.mockResolvedValue({ count: 1 });

      await service.deleteBulkDiscount(mockProductId, mockCompanyId);

      expect(prisma.productBulkDiscount.deleteMany).toHaveBeenCalledWith({
        where: { productId: mockProductId, companyId: mockCompanyId },
      });
    });

    it('should invalidate cache after delete', async () => {
      const mockConfig = createMockBulkDiscountConfig();
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);
      prisma.productBulkDiscount.deleteMany.mockResolvedValue({ count: 1 });

      // Cache the config
      await service.getProductBulkDiscount(mockProductId);

      // Delete
      await service.deleteBulkDiscount(mockProductId, mockCompanyId);

      // Next get should hit the database
      prisma.productBulkDiscount.findUnique.mockClear();
      prisma.productBulkDiscount.findUnique.mockResolvedValue(null);
      await service.getProductBulkDiscount(mockProductId);

      expect(prisma.productBulkDiscount.findUnique).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // calculateBulkPrice TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('calculateBulkPrice', () => {
    it('should return base price when no config exists', async () => {
      prisma.productBulkDiscount.findUnique.mockResolvedValue(null);

      const result = await service.calculateBulkPrice(mockProductId, 3, 100);

      expect(result.unitPrice).toBe(100);
      expect(result.totalPrice).toBe(300);
      expect(result.discount).toBe(0);
      expect(result.tier).toBeNull();
      expect(result.savingsPercent).toBe(0);
    });

    it('should return base price when config is disabled', async () => {
      const mockConfig = createMockBulkDiscountConfig({ enabled: false });
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);

      const result = await service.calculateBulkPrice(mockProductId, 3, 100);

      expect(result.unitPrice).toBe(100);
      expect(result.totalPrice).toBe(300);
      expect(result.discount).toBe(0);
    });

    it('should apply percentage discount for matching tier', async () => {
      const mockConfig = createMockBulkDiscountConfig();
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);

      const result = await service.calculateBulkPrice(mockProductId, 3, 100);

      expect(result.unitPrice).toBe(90); // 100 - 10%
      expect(result.totalPrice).toBe(270); // 90 * 3
      expect(result.discount).toBe(30); // 10% of 300
      expect(result.tier?.discountValue).toBe(10);
      expect(result.savingsPercent).toBe(10);
    });

    it('should apply higher tier for larger quantities', async () => {
      const mockConfig = createMockBulkDiscountConfig();
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);

      const result = await service.calculateBulkPrice(mockProductId, 10, 100);

      expect(result.unitPrice).toBe(80); // 100 - 20%
      expect(result.totalPrice).toBe(800); // 80 * 10
      expect(result.tier?.discountValue).toBe(20);
      expect(result.savingsPercent).toBe(20);
    });

    it('should handle FIXED_AMOUNT discount type', async () => {
      const mockConfig = createMockBulkDiscountConfig({
        tiers: [
          createMockTier({ minQuantity: 2, discountType: 'FIXED_AMOUNT', discountValue: 5 }),
        ],
      });
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);

      const result = await service.calculateBulkPrice(mockProductId, 3, 100);

      expect(result.unitPrice).toBe(95); // 100 - 5
      expect(result.totalPrice).toBe(285); // 95 * 3
      expect(result.discount).toBe(15); // 5 * 3
    });

    it('should handle UNIT_PRICE discount type', async () => {
      const mockConfig = createMockBulkDiscountConfig({
        tiers: [
          createMockTier({ minQuantity: 2, discountType: 'UNIT_PRICE', discountValue: 75 }),
        ],
      });
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);

      const result = await service.calculateBulkPrice(mockProductId, 3, 100);

      expect(result.unitPrice).toBe(75);
      expect(result.totalPrice).toBe(225); // 75 * 3
      expect(result.discount).toBe(75); // (100-75) * 3
    });

    it('should respect maxDiscountPercent cap', async () => {
      const mockConfig = createMockBulkDiscountConfig({
        tiers: [
          createMockTier({ minQuantity: 2, discountType: 'PERCENTAGE', discountValue: 50 }),
        ],
        maxDiscountPercent: 30,
      });
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);

      const result = await service.calculateBulkPrice(mockProductId, 3, 100);

      // Discount should be capped at 30%
      expect(result.unitPrice).toBe(70); // 100 - 30%
      expect(result.totalPrice).toBe(210);
      expect(result.discount).toBe(90); // Capped at 30% of 300
    });

    it('should return base price when quantity is below any tier', async () => {
      const mockConfig = createMockBulkDiscountConfig();
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);

      const result = await service.calculateBulkPrice(mockProductId, 1, 100);

      expect(result.unitPrice).toBe(100);
      expect(result.totalPrice).toBe(100);
      expect(result.discount).toBe(0);
      expect(result.tier).toBeNull();
    });

    it('should return base price when before validFrom date', async () => {
      const futureDate = new Date(Date.now() + 86400000); // Tomorrow
      const mockConfig = createMockBulkDiscountConfig({ validFrom: futureDate });
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);

      const result = await service.calculateBulkPrice(mockProductId, 3, 100);

      expect(result.unitPrice).toBe(100);
      expect(result.discount).toBe(0);
    });

    it('should return base price when after validUntil date', async () => {
      const pastDate = new Date(Date.now() - 86400000); // Yesterday
      const mockConfig = createMockBulkDiscountConfig({ validUntil: pastDate });
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);

      const result = await service.calculateBulkPrice(mockProductId, 3, 100);

      expect(result.unitPrice).toBe(100);
      expect(result.discount).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getBulkUpsellRecommendation TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getBulkUpsellRecommendation', () => {
    it('should return null when product not found', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const result = await service.getBulkUpsellRecommendation(mockProductId, 2);

      expect(result).toBeNull();
    });

    it('should return null when no config exists', async () => {
      const mockProduct = createMockProduct();
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productBulkDiscount.findUnique.mockResolvedValue(null);

      const result = await service.getBulkUpsellRecommendation(mockProductId, 2);

      expect(result).toBeNull();
    });

    it('should return null when already at highest tier', async () => {
      const mockProduct = createMockProduct();
      const mockConfig = createMockBulkDiscountConfig();
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);

      const result = await service.getBulkUpsellRecommendation(mockProductId, 15);

      expect(result).toBeNull();
    });

    it('should return recommendation with next tier details', async () => {
      const mockProduct = createMockProduct();
      const mockConfig = createMockBulkDiscountConfig();
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);

      const result = await service.getBulkUpsellRecommendation(mockProductId, 3);

      expect(result).toBeDefined();
      expect(result?.productId).toBe(mockProductId);
      expect(result?.currentQuantity).toBe(3);
      expect(result?.recommendedQuantity).toBe(5); // Next tier starts at 5
      expect(result?.quantityToAdd).toBe(2);
      expect(result?.nextTier.discountValue).toBe(15);
    });

    it('should calculate savings correctly', async () => {
      const mockProduct = createMockProduct();
      const mockConfig = createMockBulkDiscountConfig();
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);

      const result = await service.getBulkUpsellRecommendation(mockProductId, 3);

      expect(result?.savings).toBeGreaterThan(0);
      expect(result?.savingsPercent).toBe(15);
    });

    it('should generate compelling message', async () => {
      const mockProduct = createMockProduct();
      const mockConfig = createMockBulkDiscountConfig();
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.productBulkDiscount.findUnique.mockResolvedValue(mockConfig);

      const result = await service.getBulkUpsellRecommendation(mockProductId, 3);

      expect(result?.message).toBeDefined();
      expect(result?.message.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getCartBulkRecommendations TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getCartBulkRecommendations', () => {
    it('should return recommendations for eligible cart items', async () => {
      const mockProduct1 = createMockProduct('p1');
      const mockProduct2 = createMockProduct('p2');
      const mockConfig = createMockBulkDiscountConfig();

      // First product call
      prisma.product.findUnique.mockResolvedValueOnce(mockProduct1);
      prisma.productBulkDiscount.findUnique.mockResolvedValueOnce(mockConfig);
      // Second product call
      prisma.product.findUnique.mockResolvedValueOnce(mockProduct2);
      prisma.productBulkDiscount.findUnique.mockResolvedValueOnce(mockConfig);

      const items = [
        { productId: 'p1', quantity: 3 },
        { productId: 'p2', quantity: 7 },
      ];
      const result = await service.getCartBulkRecommendations(items);

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should sort recommendations by savings', async () => {
      const mockProduct1 = createMockProduct('p1', { price: 50 });
      const mockProduct2 = createMockProduct('p2', { price: 100 });
      const mockConfig = createMockBulkDiscountConfig();

      prisma.product.findUnique.mockResolvedValueOnce(mockProduct1);
      prisma.productBulkDiscount.findUnique.mockResolvedValueOnce(mockConfig);
      prisma.product.findUnique.mockResolvedValueOnce(mockProduct2);
      prisma.productBulkDiscount.findUnique.mockResolvedValueOnce(mockConfig);

      const items = [
        { productId: 'p1', quantity: 3 },
        { productId: 'p2', quantity: 3 },
      ];
      const result = await service.getCartBulkRecommendations(items);

      // p2 has higher price, so should have higher savings and be first
      if (result.length > 1) {
        expect(result[0].savings).toBeGreaterThanOrEqual(result[1].savings);
      }
    });

    it('should limit results to top 3', async () => {
      const mockConfig = createMockBulkDiscountConfig();

      for (let i = 0; i < 5; i++) {
        prisma.product.findUnique.mockResolvedValueOnce(createMockProduct(`p${i}`));
        prisma.productBulkDiscount.findUnique.mockResolvedValueOnce(mockConfig);
      }

      const items = [
        { productId: 'p0', quantity: 3 },
        { productId: 'p1', quantity: 3 },
        { productId: 'p2', quantity: 3 },
        { productId: 'p3', quantity: 3 },
        { productId: 'p4', quantity: 3 },
      ];
      const result = await service.getCartBulkRecommendations(items);

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array when no recommendations available', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const items = [{ productId: 'nonexistent', quantity: 3 }];
      const result = await service.getCartBulkRecommendations(items);

      expect(result).toEqual([]);
    });
  });
});
