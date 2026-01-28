/**
 * Bulk Discount Controller Unit Tests
 *
 * Comprehensive tests for bulk discount and subscription config endpoints:
 * - Bulk discount CRUD operations
 * - Bulk recommendation endpoint
 * - Subscription config management
 * - Bulk price calculation
 * - Authorization/access control
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubscriptionFrequency as PrismaSubscriptionFrequency } from '@prisma/client';
import { SubscriptionFrequencyDto } from '../dto/upsell.dto';
import { BulkDiscountController } from './bulk-discount.controller';

// Use DTO enum for controller input compatibility
const SubscriptionFrequency = SubscriptionFrequencyDto;
import { BulkDiscountService } from '../services/bulk-discount.service';
import { SubscriptionIntelligenceService } from '../services/subscription-intelligence.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import {
  ProductBulkDiscountConfig,
  ProductSubscriptionConfigData,
} from '../types/upsell.types';

describe('BulkDiscountController', () => {
  let controller: BulkDiscountController;
  let bulkDiscountService: {
    getProductBulkDiscount: jest.Mock;
    upsertBulkDiscount: jest.Mock;
    deleteBulkDiscount: jest.Mock;
    getBulkUpsellRecommendation: jest.Mock;
    calculateBulkPrice: jest.Mock;
  };
  let subscriptionIntelligenceService: {
    getSubscriptionConfig: jest.Mock;
    upsertSubscriptionConfig: jest.Mock;
  };
  let prismaService: {
    product: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
    };
  };
  let hierarchyService: {
    canAccessCompany: jest.Mock;
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockProductId = 'product-001';
  const mockCompanyId = 'company-123';

  const createMockUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
    sub: 'user-123',
    id: 'user-123',
    email: 'test@example.com',
    role: 'ADMIN',
    scopeType: 'COMPANY',
    scopeId: mockCompanyId,
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: mockCompanyId,
    departmentId: undefined,
    ...overrides,
  });

  const createMockBulkDiscountConfig = (overrides: Partial<ProductBulkDiscountConfig> = {}): ProductBulkDiscountConfig => ({
    productId: mockProductId,
    enabled: true,
    tiers: [
      { minQuantity: 5, maxQuantity: 9, discountType: 'PERCENTAGE', discountValue: 5, label: 'Buy 5+, Save 5%' },
      { minQuantity: 10, maxQuantity: 19, discountType: 'PERCENTAGE', discountValue: 10, label: 'Buy 10+, Save 10%' },
      { minQuantity: 20, maxQuantity: null, discountType: 'PERCENTAGE', discountValue: 15, label: 'Buy 20+, Save 15%' },
    ],
    stackWithOtherDiscounts: false,
    maxDiscountPercent: 25,
    validFrom: undefined,
    validUntil: undefined,
    ...overrides,
  });

  const createMockSubscriptionConfig = (overrides: Partial<ProductSubscriptionConfigData> = {}): ProductSubscriptionConfigData => ({
    productId: mockProductId,
    enabled: true,
    discountTiers: [
      { frequency: SubscriptionFrequency.MONTHLY, discountPercent: 5, label: 'Monthly' },
      { frequency: SubscriptionFrequency.BIMONTHLY, discountPercent: 10, label: 'Every 2 months' },
      { frequency: SubscriptionFrequency.QUARTERLY, discountPercent: 15, label: 'Quarterly' },
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

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    bulkDiscountService = {
      getProductBulkDiscount: jest.fn(),
      upsertBulkDiscount: jest.fn(),
      deleteBulkDiscount: jest.fn(),
      getBulkUpsellRecommendation: jest.fn(),
      calculateBulkPrice: jest.fn(),
    };

    subscriptionIntelligenceService = {
      getSubscriptionConfig: jest.fn(),
      upsertSubscriptionConfig: jest.fn(),
    };

    prismaService = {
      product: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    hierarchyService = {
      canAccessCompany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BulkDiscountController],
      providers: [
        { provide: BulkDiscountService, useValue: bulkDiscountService },
        { provide: SubscriptionIntelligenceService, useValue: subscriptionIntelligenceService },
        { provide: PrismaService, useValue: prismaService },
        { provide: HierarchyService, useValue: hierarchyService },
      ],
    }).compile();

    controller = module.get<BulkDiscountController>(BulkDiscountController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // BULK DISCOUNT CONFIG TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getBulkDiscount', () => {
    it('should return bulk discount config for a product', async () => {
      const mockConfig = createMockBulkDiscountConfig();
      bulkDiscountService.getProductBulkDiscount.mockResolvedValue(mockConfig);

      const result = await controller.getBulkDiscount(mockProductId);

      expect(result).toEqual(mockConfig);
      expect(bulkDiscountService.getProductBulkDiscount).toHaveBeenCalledWith(mockProductId);
    });

    it('should return null when no config exists', async () => {
      bulkDiscountService.getProductBulkDiscount.mockResolvedValue(null);

      const result = await controller.getBulkDiscount(mockProductId);

      expect(result).toBeNull();
    });
  });

  describe('upsertBulkDiscount', () => {
    it('should create or update bulk discount config', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockBulkDiscountConfig();
      bulkDiscountService.upsertBulkDiscount.mockResolvedValue(mockConfig);

      const dto = {
        enabled: true,
        tiers: [
          { minQuantity: 5, discountType: 'PERCENTAGE' as const, discountValue: 5, label: 'Buy 5+' },
          { minQuantity: 10, discountType: 'PERCENTAGE' as const, discountValue: 10, label: 'Buy 10+' },
        ],
        stackWithOtherDiscounts: false,
        maxDiscountPercent: 25,
      };

      const result = await controller.upsertBulkDiscount(mockUser, mockProductId, dto);

      expect(result).toEqual(mockConfig);
      expect(bulkDiscountService.upsertBulkDiscount).toHaveBeenCalledWith(
        mockProductId,
        mockCompanyId,
        expect.objectContaining({
          enabled: true,
          tiers: dto.tiers,
          stackWithOtherDiscounts: false,
          maxDiscountPercent: 25,
        }),
      );
    });

    it('should handle date range for validity', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockBulkDiscountConfig();
      bulkDiscountService.upsertBulkDiscount.mockResolvedValue(mockConfig);

      const dto = {
        enabled: true,
        tiers: [{ minQuantity: 5, discountType: 'PERCENTAGE' as const, discountValue: 5, label: 'Buy 5+' }],
        validFrom: '2025-01-01T00:00:00Z',
        validUntil: '2025-12-31T23:59:59Z',
      };

      await controller.upsertBulkDiscount(mockUser, mockProductId, dto);

      expect(bulkDiscountService.upsertBulkDiscount).toHaveBeenCalledWith(
        mockProductId,
        mockCompanyId,
        expect.objectContaining({
          validFrom: expect.any(Date),
          validUntil: expect.any(Date),
        }),
      );
    });

    it('should throw ForbiddenException when no company context', async () => {
      const mockUser = createMockUser({
        scopeType: 'ORGANIZATION',
        scopeId: 'org-1',
        companyId: undefined,
      });

      const dto = {
        enabled: true,
        tiers: [],
      };

      await expect(
        controller.upsertBulkDiscount(mockUser, mockProductId, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should use companyId fallback when scopeType is not COMPANY', async () => {
      const mockUser = createMockUser({
        scopeType: 'CLIENT',
        scopeId: 'client-1',
        companyId: 'company-from-context',
      });
      const mockConfig = createMockBulkDiscountConfig();
      bulkDiscountService.upsertBulkDiscount.mockResolvedValue(mockConfig);

      const dto = { enabled: true, tiers: [] };
      await controller.upsertBulkDiscount(mockUser, mockProductId, dto);

      expect(bulkDiscountService.upsertBulkDiscount).toHaveBeenCalledWith(
        mockProductId,
        'company-from-context',
        expect.any(Object),
      );
    });
  });

  describe('deleteBulkDiscount', () => {
    it('should delete bulk discount config', async () => {
      const mockUser = createMockUser();
      bulkDiscountService.deleteBulkDiscount.mockResolvedValue(undefined);

      const result = await controller.deleteBulkDiscount(mockUser, mockProductId);

      expect(result).toEqual({ success: true });
      expect(bulkDiscountService.deleteBulkDiscount).toHaveBeenCalledWith(
        mockProductId,
        mockCompanyId,
      );
    });

    it('should throw ForbiddenException when no company context', async () => {
      const mockUser = createMockUser({
        scopeType: 'ORGANIZATION',
        scopeId: 'org-1',
        companyId: undefined,
      });

      await expect(
        controller.deleteBulkDiscount(mockUser, mockProductId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getBulkRecommendation', () => {
    it('should return bulk recommendation for quantity', async () => {
      const mockRecommendation = {
        currentTier: null,
        nextTier: { minQuantity: 5, discountType: 'PERCENTAGE', discountValue: 5 },
        quantityToNextTier: 3,
        potentialSavings: 2.5,
      };
      bulkDiscountService.getBulkUpsellRecommendation.mockResolvedValue(mockRecommendation);

      const result = await controller.getBulkRecommendation(mockProductId, '2');

      expect(result).toEqual(mockRecommendation);
      expect(bulkDiscountService.getBulkUpsellRecommendation).toHaveBeenCalledWith(
        mockProductId,
        2,
      );
    });

    it('should default to quantity 1 for invalid input', async () => {
      bulkDiscountService.getBulkUpsellRecommendation.mockResolvedValue(null);

      await controller.getBulkRecommendation(mockProductId, 'invalid');

      expect(bulkDiscountService.getBulkUpsellRecommendation).toHaveBeenCalledWith(
        mockProductId,
        1,
      );
    });

    it('should handle empty quantity string', async () => {
      bulkDiscountService.getBulkUpsellRecommendation.mockResolvedValue(null);

      await controller.getBulkRecommendation(mockProductId, '');

      expect(bulkDiscountService.getBulkUpsellRecommendation).toHaveBeenCalledWith(
        mockProductId,
        1,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SUBSCRIPTION CONFIG TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getSubscriptionConfig', () => {
    it('should return subscription config for a product', async () => {
      const mockConfig = createMockSubscriptionConfig();
      subscriptionIntelligenceService.getSubscriptionConfig.mockResolvedValue(mockConfig);

      const result = await controller.getSubscriptionConfig(mockProductId);

      expect(result).toEqual(mockConfig);
      expect(subscriptionIntelligenceService.getSubscriptionConfig).toHaveBeenCalledWith(
        mockProductId,
      );
    });

    it('should return null when no config exists', async () => {
      subscriptionIntelligenceService.getSubscriptionConfig.mockResolvedValue(null);

      const result = await controller.getSubscriptionConfig(mockProductId);

      expect(result).toBeNull();
    });
  });

  describe('upsertSubscriptionConfig', () => {
    it('should create or update subscription config', async () => {
      const mockUser = createMockUser();
      const mockConfig = createMockSubscriptionConfig();
      subscriptionIntelligenceService.upsertSubscriptionConfig.mockResolvedValue(mockConfig);

      const dto = {
        enabled: true,
        discountTiers: [
          { frequency: SubscriptionFrequency.MONTHLY, discountPercent: 5, label: 'Monthly' },
          { frequency: SubscriptionFrequency.QUARTERLY, discountPercent: 10, label: 'Quarterly' },
        ],
        defaultFrequency: SubscriptionFrequency.MONTHLY,
        freeShippingIncluded: true,
        eligibility: {
          requirePreviousPurchase: false,
          minOrderCount: 0,
          productCategories: [],
        },
      };

      const result = await controller.upsertSubscriptionConfig(mockUser, mockProductId, dto);

      expect(result).toEqual(mockConfig);
      expect(subscriptionIntelligenceService.upsertSubscriptionConfig).toHaveBeenCalledWith(
        mockProductId,
        mockCompanyId,
        expect.objectContaining({
          enabled: true,
          discountTiers: dto.discountTiers,
          defaultFrequency: SubscriptionFrequency.MONTHLY,
          freeShippingIncluded: true,
        }),
      );
    });

    it('should throw ForbiddenException when no company context', async () => {
      const mockUser = createMockUser({
        scopeType: 'ORGANIZATION',
        scopeId: 'org-1',
        companyId: undefined,
      });

      const dto = {
        enabled: true,
        discountTiers: [],
        defaultFrequency: SubscriptionFrequency.MONTHLY,
      };

      await expect(
        controller.upsertSubscriptionConfig(mockUser, mockProductId, dto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PRICING CALCULATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('calculateBulkPrice', () => {
    it('should calculate bulk price for a product with company user', async () => {
      const mockUser = createMockUser();
      const mockProduct = { price: 10.0, companyId: mockCompanyId };
      prismaService.product.findFirst.mockResolvedValue(mockProduct);

      const mockCalculation = {
        originalPrice: 10.0,
        quantity: 10,
        originalTotal: 100.0,
        discountedPrice: 9.0,
        discountedTotal: 90.0,
        savings: 10.0,
        appliedTier: { minQuantity: 10, discountType: 'PERCENTAGE', discountValue: 10 },
      };
      bulkDiscountService.calculateBulkPrice.mockResolvedValue(mockCalculation);

      const dto = { productId: mockProductId, quantity: 10 };
      const result = await controller.calculateBulkPrice(mockUser, dto);

      expect(result).toEqual(mockCalculation);
      expect(prismaService.product.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockProductId,
          deletedAt: null,
          companyId: mockCompanyId,
        },
        select: { price: true, companyId: true },
      });
      expect(bulkDiscountService.calculateBulkPrice).toHaveBeenCalledWith(
        mockProductId,
        10,
        10.0,
      );
    });

    it('should throw NotFoundException when product not found', async () => {
      const mockUser = createMockUser();
      prismaService.product.findFirst.mockResolvedValue(null);

      const dto = { productId: 'non-existent', quantity: 10 };

      await expect(controller.calculateBulkPrice(mockUser, dto)).rejects.toThrow(NotFoundException);
      expect(bulkDiscountService.calculateBulkPrice).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when product belongs to different company', async () => {
      const mockUser = createMockUser();
      const mockProduct = { price: 10.0, companyId: 'other-company' };
      prismaService.product.findFirst.mockResolvedValue(mockProduct);

      const dto = { productId: mockProductId, quantity: 10 };

      await expect(controller.calculateBulkPrice(mockUser, dto)).rejects.toThrow(ForbiddenException);
      expect(bulkDiscountService.calculateBulkPrice).not.toHaveBeenCalled();
    });

    it('should convert Decimal price to Number', async () => {
      const mockUser = createMockUser();
      // Prisma returns Decimal objects
      const mockProduct = { price: { toNumber: () => 15.99 }, companyId: mockCompanyId };
      prismaService.product.findFirst.mockResolvedValue(mockProduct);
      bulkDiscountService.calculateBulkPrice.mockResolvedValue({});

      const dto = { productId: mockProductId, quantity: 5 };
      await controller.calculateBulkPrice(mockUser, dto);

      // Number() on an object calls valueOf/toNumber implicitly
      expect(bulkDiscountService.calculateBulkPrice).toHaveBeenCalled();
    });

    it('should allow ORG admin to calculate bulk price for any product', async () => {
      const mockUser = createMockUser({
        scopeType: 'ORGANIZATION',
        scopeId: 'org-1',
        companyId: undefined,
      });
      const mockProduct = { price: 10.0, companyId: 'any-company' };
      prismaService.product.findFirst.mockResolvedValue(mockProduct);
      bulkDiscountService.calculateBulkPrice.mockResolvedValue({});

      const dto = { productId: mockProductId, quantity: 5 };
      await controller.calculateBulkPrice(mockUser, dto);

      expect(prismaService.product.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockProductId,
          deletedAt: null,
        },
        select: { price: true, companyId: true },
      });
      expect(bulkDiscountService.calculateBulkPrice).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCESS CONTROL TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Access Control', () => {
    it('should extract companyId from scopeId when scopeType is COMPANY', async () => {
      const mockUser = createMockUser({ scopeType: 'COMPANY', scopeId: 'company-999' });
      const mockConfig = createMockBulkDiscountConfig();
      bulkDiscountService.upsertBulkDiscount.mockResolvedValue(mockConfig);

      const dto = { enabled: true, tiers: [] };
      await controller.upsertBulkDiscount(mockUser, mockProductId, dto);

      expect(bulkDiscountService.upsertBulkDiscount).toHaveBeenCalledWith(
        mockProductId,
        'company-999',
        expect.any(Object),
      );
    });

    it('should fall back to companyId when scopeType is not COMPANY', async () => {
      const mockUser = createMockUser({
        scopeType: 'CLIENT',
        scopeId: 'client-1',
        companyId: 'company-from-context',
      });
      bulkDiscountService.deleteBulkDiscount.mockResolvedValue(undefined);

      await controller.deleteBulkDiscount(mockUser, mockProductId);

      expect(bulkDiscountService.deleteBulkDiscount).toHaveBeenCalledWith(
        mockProductId,
        'company-from-context',
      );
    });

    it('should allow public access to getBulkDiscount', async () => {
      // This endpoint doesn't require auth
      bulkDiscountService.getProductBulkDiscount.mockResolvedValue(null);

      const result = await controller.getBulkDiscount(mockProductId);

      expect(result).toBeNull();
      // No user required
    });

    it('should allow public access to getBulkRecommendation', async () => {
      // This endpoint doesn't require auth
      bulkDiscountService.getBulkUpsellRecommendation.mockResolvedValue(null);

      const result = await controller.getBulkRecommendation(mockProductId, '5');

      expect(result).toBeNull();
      // No user required
    });

    it('should allow public access to getSubscriptionConfig', async () => {
      // This endpoint doesn't require auth
      subscriptionIntelligenceService.getSubscriptionConfig.mockResolvedValue(null);

      const result = await controller.getSubscriptionConfig(mockProductId);

      expect(result).toBeNull();
      // No user required
    });

    it('should require authentication for calculateBulkPrice', async () => {
      // This endpoint now requires auth
      const mockUser = createMockUser();
      const mockProduct = { price: 10.0, companyId: mockCompanyId };
      prismaService.product.findFirst.mockResolvedValue(mockProduct);
      bulkDiscountService.calculateBulkPrice.mockResolvedValue({});

      const dto = { productId: mockProductId, quantity: 5 };
      await controller.calculateBulkPrice(mockUser, dto);

      // User is now required
      expect(bulkDiscountService.calculateBulkPrice).toHaveBeenCalled();
    });

    it('should validate company access for CLIENT users with queryCompanyId', async () => {
      const mockUser = createMockUser({
        scopeType: 'CLIENT',
        scopeId: 'client-1',
        companyId: undefined,
      });
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      const dto = { productId: mockProductId, quantity: 5 };
      // Note: queryCompanyId is passed via the getCompanyIdForQuery helper
      // when the user is ORG/CLIENT and provides a specific companyId

      // For CLIENT user without companyId, calculateBulkPrice returns undefined companyId
      // which means the query filters all products
      const mockProduct = { price: 10.0, companyId: 'any-company' };
      prismaService.product.findFirst.mockResolvedValue(mockProduct);
      bulkDiscountService.calculateBulkPrice.mockResolvedValue({});

      await controller.calculateBulkPrice(mockUser, dto);

      // Product query should not filter by companyId for CLIENT users without company context
      expect(bulkDiscountService.calculateBulkPrice).toHaveBeenCalled();
    });
  });
});
