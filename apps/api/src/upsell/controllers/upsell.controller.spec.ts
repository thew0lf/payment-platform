/**
 * Upsell Controller Unit Tests
 *
 * Comprehensive tests for upsell endpoints including:
 * - Cart upsells (public)
 * - Targeting rules (admin CRUD)
 * - Impression tracking (public)
 * - Subscription eligibility checks
 * - Authorization/access control
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UpsellController } from './upsell.controller';
import { UpsellTargetingService } from '../services/upsell-targeting.service';
import { BulkDiscountService } from '../services/bulk-discount.service';
import { SubscriptionIntelligenceService } from '../services/subscription-intelligence.service';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { UpsellType as PrismaUpsellType, UpsellUrgency as PrismaUpsellUrgency } from '@prisma/client';
import { UpsellTypeDto, UpsellUrgencyDto } from '../dto/upsell.dto';
import {
  UpsellTargetingRuleData,
  UpsellConditions,
  UpsellOffer,
  UpsellPlacement,
  CustomerSegment,
} from '../types/upsell.types';

// For mocking - use DTO enums for controller input
const UpsellType = UpsellTypeDto;
const UpsellUrgency = UpsellUrgencyDto;

describe('UpsellController', () => {
  let controller: UpsellController;
  let upsellTargetingService: {
    getTargetedUpsells: jest.Mock;
    getTargetingRules: jest.Mock;
    createTargetingRule: jest.Mock;
    updateTargetingRule: jest.Mock;
    deleteTargetingRule: jest.Mock;
    recordImpression: jest.Mock;
    recordAcceptance: jest.Mock;
    recordDecline: jest.Mock;
  };
  let bulkDiscountService: Record<string, jest.Mock>;
  let subscriptionIntelligenceService: {
    evaluateSubscriptionEligibility: jest.Mock;
    getSubscriptionOffer: jest.Mock;
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockCartId = 'cart-001';
  const mockCompanyId = 'company-123';
  const mockCustomerId = 'customer-456';
  const mockSessionId = 'session-789';
  const mockProductId = 'product-001';
  const mockRuleId = 'rule-001';
  const mockImpressionId = 'impression-001';

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

  const createMockConditions = (): UpsellConditions => ({
    cartValueMin: 50,
    cartValueMax: 500,
    productCategories: ['coffee'],
    segments: [CustomerSegment.REPEAT_CUSTOMER],
  });

  const createMockOffer = (): UpsellOffer => ({
    discountPercent: 10,
    freeShipping: false,
  });

  const createMockUpsellTargetingRuleData = (overrides: Partial<UpsellTargetingRuleData> = {}): UpsellTargetingRuleData => ({
    id: mockRuleId,
    name: 'Test Upsell Rule',
    description: 'A test targeting rule',
    priority: 100,
    enabled: true,
    conditions: createMockConditions(),
    upsellType: UpsellType.COMPLEMENTARY,
    offer: createMockOffer(),
    message: 'Complete your order! Add this for 10% off',
    urgency: UpsellUrgency.MEDIUM,
    placements: ['CART_DRAWER', 'CHECKOUT'],
    maxImpressions: 3,
    maxAcceptances: undefined,
    validFrom: undefined,
    validUntil: undefined,
    ...overrides,
  });

  const createMockUpsell = () => ({
    ruleId: mockRuleId,
    type: UpsellType.COMPLEMENTARY,
    offer: createMockOffer(),
    message: 'Complete your order! Add this for 10% off',
    urgency: UpsellUrgency.MEDIUM,
    placement: 'CART_DRAWER',
    product: {
      id: 'upsell-product-001',
      name: 'Premium Coffee',
      price: 25.0,
      image: '/images/coffee.jpg',
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    upsellTargetingService = {
      getTargetedUpsells: jest.fn(),
      getTargetingRules: jest.fn(),
      createTargetingRule: jest.fn(),
      updateTargetingRule: jest.fn(),
      deleteTargetingRule: jest.fn(),
      recordImpression: jest.fn(),
      recordAcceptance: jest.fn(),
      recordDecline: jest.fn(),
    };

    bulkDiscountService = {};

    subscriptionIntelligenceService = {
      evaluateSubscriptionEligibility: jest.fn(),
      getSubscriptionOffer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UpsellController],
      providers: [
        { provide: UpsellTargetingService, useValue: upsellTargetingService },
        { provide: BulkDiscountService, useValue: bulkDiscountService },
        { provide: SubscriptionIntelligenceService, useValue: subscriptionIntelligenceService },
      ],
    }).compile();

    controller = module.get<UpsellController>(UpsellController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // CART UPSELLS TESTS (Public)
  // ═══════════════════════════════════════════════════════════════

  describe('getCartUpsells', () => {
    it('should return upsells for a cart', async () => {
      const mockUpsells = [createMockUpsell()];
      upsellTargetingService.getTargetedUpsells.mockResolvedValue(mockUpsells);

      const query = { maxUpsells: 3, placements: ['CART_DRAWER' as UpsellPlacement] };
      const result = await controller.getCartUpsells(mockCartId, query);

      expect(result).toEqual({ upsells: mockUpsells });
      expect(upsellTargetingService.getTargetedUpsells).toHaveBeenCalledWith(
        mockCartId,
        {
          maxUpsells: 3,
          placements: ['CART_DRAWER' as UpsellPlacement],
        },
      );
    });

    it('should handle empty query parameters', async () => {
      const mockUpsells = [createMockUpsell()];
      upsellTargetingService.getTargetedUpsells.mockResolvedValue(mockUpsells);

      const query = {};
      const result = await controller.getCartUpsells(mockCartId, query as any);

      expect(result).toEqual({ upsells: mockUpsells });
      expect(upsellTargetingService.getTargetedUpsells).toHaveBeenCalledWith(
        mockCartId,
        {
          maxUpsells: undefined,
          placements: undefined,
        },
      );
    });

    it('should return empty array when no upsells match', async () => {
      upsellTargetingService.getTargetedUpsells.mockResolvedValue([]);

      const result = await controller.getCartUpsells(mockCartId, {});

      expect(result).toEqual({ upsells: [] });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TARGETING RULES TESTS (Admin)
  // ═══════════════════════════════════════════════════════════════

  describe('getTargetingRules', () => {
    it('should return all targeting rules for company', async () => {
      const mockRules = [createMockUpsellTargetingRuleData()];
      const mockUser = createMockUser();
      upsellTargetingService.getTargetingRules.mockResolvedValue(mockRules);

      const result = await controller.getTargetingRules(mockUser);

      expect(result).toEqual(mockRules);
      expect(upsellTargetingService.getTargetingRules).toHaveBeenCalledWith(mockCompanyId);
    });

    it('should throw ForbiddenException when no company context', async () => {
      const mockUser = createMockUser({
        scopeType: 'ORGANIZATION',
        scopeId: 'org-1',
        companyId: undefined,
      });

      await expect(controller.getTargetingRules(mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createTargetingRule', () => {
    it('should create a new targeting rule', async () => {
      const mockUser = createMockUser();
      const mockRule = createMockUpsellTargetingRuleData();
      upsellTargetingService.createTargetingRule.mockResolvedValue(mockRule);

      const dto = {
        name: 'Test Rule',
        description: 'Test description',
        priority: 100,
        enabled: true,
        conditions: createMockConditions(),
        upsellType: UpsellType.COMPLEMENTARY,
        offer: createMockOffer(),
        message: 'Test upsell message',
        urgency: UpsellUrgency.MEDIUM,
        placements: ['CART_DRAWER'],
        maxImpressions: 5,
      };

      const result = await controller.createTargetingRule(mockUser, dto);

      expect(result).toEqual(mockRule);
      expect(upsellTargetingService.createTargetingRule).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          name: 'Test Rule',
          description: 'Test description',
          priority: 100,
          enabled: true,
          upsellType: UpsellType.COMPLEMENTARY,
          urgency: UpsellUrgency.MEDIUM,
          placements: ['CART_DRAWER'],
          maxImpressions: 5,
        }),
      );
    });

    it('should use default values when optional fields not provided', async () => {
      const mockUser = createMockUser();
      const mockRule = createMockUpsellTargetingRuleData();
      upsellTargetingService.createTargetingRule.mockResolvedValue(mockRule);

      const dto = {
        name: 'Minimal Rule',
        conditions: {},
        upsellType: UpsellType.BUNDLE_UPGRADE,
        offer: createMockOffer(),
        message: 'Minimal message',
        placements: ['CHECKOUT'],
      };

      await controller.createTargetingRule(mockUser, dto);

      expect(upsellTargetingService.createTargetingRule).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          name: 'Minimal Rule',
          priority: 100, // default
          enabled: true, // default
          urgency: 'MEDIUM', // default
        }),
      );
    });

    it('should handle date range for validity', async () => {
      const mockUser = createMockUser();
      const mockRule = createMockUpsellTargetingRuleData();
      upsellTargetingService.createTargetingRule.mockResolvedValue(mockRule);

      const dto = {
        name: 'Time-limited Rule',
        conditions: {},
        upsellType: UpsellType.COMPLEMENTARY,
        offer: createMockOffer(),
        message: 'Limited time offer',
        placements: ['CART_DRAWER'],
        validFrom: '2025-01-01T00:00:00Z',
        validUntil: '2025-12-31T23:59:59Z',
      };

      await controller.createTargetingRule(mockUser, dto);

      expect(upsellTargetingService.createTargetingRule).toHaveBeenCalledWith(
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
        name: 'Test',
        conditions: {},
        upsellType: UpsellType.COMPLEMENTARY,
        offer: createMockOffer(),
        message: 'Test message',
        placements: ['CART_DRAWER'],
      };

      await expect(controller.createTargetingRule(mockUser, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateTargetingRule', () => {
    it('should update an existing targeting rule', async () => {
      const mockUser = createMockUser();
      const mockRule = createMockUpsellTargetingRuleData({ name: 'Updated Rule' });
      upsellTargetingService.updateTargetingRule.mockResolvedValue(mockRule);

      const dto = {
        name: 'Updated Rule',
        enabled: false,
        priority: 50,
        conditions: {},
        upsellType: UpsellType.COMPLEMENTARY,
        offer: createMockOffer(),
        message: 'Updated message',
        placements: ['CART_DRAWER'],
      };

      const result = await controller.updateTargetingRule(mockUser, mockRuleId, dto);

      expect(result).toEqual(mockRule);
      expect(upsellTargetingService.updateTargetingRule).toHaveBeenCalledWith(
        mockRuleId,
        mockCompanyId,
        expect.objectContaining({
          name: 'Updated Rule',
          enabled: false,
          priority: 50,
        }),
      );
    });

    it('should handle update with required fields', async () => {
      const mockUser = createMockUser();
      const mockRule = createMockUpsellTargetingRuleData();
      upsellTargetingService.updateTargetingRule.mockResolvedValue(mockRule);

      const dto = {
        name: 'Updated Name',
        conditions: {},
        upsellType: UpsellType.COMPLEMENTARY,
        offer: createMockOffer(),
        message: 'Updated message',
        placements: ['CHECKOUT'],
        enabled: false,
      };
      await controller.updateTargetingRule(mockUser, mockRuleId, dto);

      expect(upsellTargetingService.updateTargetingRule).toHaveBeenCalledWith(
        mockRuleId,
        mockCompanyId,
        expect.objectContaining({
          enabled: false,
          name: 'Updated Name',
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
        name: 'Test',
        conditions: {},
        upsellType: UpsellType.COMPLEMENTARY,
        offer: { discountPercent: 10 },
        placements: ['CART_DRAWER'],
        message: 'Test message',
      };

      await expect(
        controller.updateTargetingRule(mockUser, mockRuleId, dto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteTargetingRule', () => {
    it('should delete a targeting rule', async () => {
      const mockUser = createMockUser();
      upsellTargetingService.deleteTargetingRule.mockResolvedValue(undefined);

      const result = await controller.deleteTargetingRule(mockUser, mockRuleId);

      expect(result).toEqual({ success: true });
      expect(upsellTargetingService.deleteTargetingRule).toHaveBeenCalledWith(
        mockRuleId,
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
        controller.deleteTargetingRule(mockUser, mockRuleId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // IMPRESSION TRACKING TESTS (Public)
  // ═══════════════════════════════════════════════════════════════

  describe('recordImpression', () => {
    it('should record an upsell impression', async () => {
      upsellTargetingService.recordImpression.mockResolvedValue(mockImpressionId);

      const dto = {
        cartId: mockCartId,
        ruleId: mockRuleId,
        customerId: mockCustomerId,
        sessionId: mockSessionId,
        placement: 'CART_DRAWER' as UpsellPlacement,
        variant: 'A',
        offer: createMockOffer(),
      };

      const result = await controller.recordImpression(dto);

      expect(result).toEqual({ impressionId: mockImpressionId });
      expect(upsellTargetingService.recordImpression).toHaveBeenCalledWith({
        cartId: mockCartId,
        ruleId: mockRuleId,
        customerId: mockCustomerId,
        sessionId: mockSessionId,
        placement: 'CART_DRAWER' as UpsellPlacement,
        variant: 'A',
        offer: dto.offer,
      });
    });

    it('should handle impression without customer ID', async () => {
      upsellTargetingService.recordImpression.mockResolvedValue(mockImpressionId);

      const dto = {
        cartId: mockCartId,
        ruleId: mockRuleId,
        sessionId: mockSessionId,
        placement: 'CHECKOUT',
        offer: { discountPercent: 10 },
      };

      const result = await controller.recordImpression(dto);

      expect(result).toEqual({ impressionId: mockImpressionId });
      expect(upsellTargetingService.recordImpression).toHaveBeenCalledWith(
        expect.objectContaining({
          cartId: mockCartId,
          ruleId: mockRuleId,
          sessionId: mockSessionId,
          customerId: undefined,
        }),
      );
    });
  });

  describe('recordAcceptance', () => {
    it('should record upsell acceptance', async () => {
      upsellTargetingService.recordAcceptance.mockResolvedValue(undefined);

      const dto = {
        impressionId: mockImpressionId,
        revenue: 25.0,
      };

      const result = await controller.recordAcceptance(dto);

      expect(result).toEqual({ success: true });
      expect(upsellTargetingService.recordAcceptance).toHaveBeenCalledWith(
        mockImpressionId,
        25.0,
      );
    });

    it('should handle acceptance with zero revenue', async () => {
      upsellTargetingService.recordAcceptance.mockResolvedValue(undefined);

      const dto = { impressionId: mockImpressionId, revenue: 0 };

      await controller.recordAcceptance(dto);

      expect(upsellTargetingService.recordAcceptance).toHaveBeenCalledWith(
        mockImpressionId,
        0,
      );
    });
  });

  describe('recordDecline', () => {
    it('should record upsell decline', async () => {
      upsellTargetingService.recordDecline.mockResolvedValue(undefined);

      const dto = { impressionId: mockImpressionId };
      const result = await controller.recordDecline(dto);

      expect(result).toEqual({ success: true });
      expect(upsellTargetingService.recordDecline).toHaveBeenCalledWith(mockImpressionId);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SUBSCRIPTION ELIGIBILITY TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('checkSubscriptionEligibility', () => {
    it('should check subscription eligibility with customer', async () => {
      const mockEligibility = {
        eligible: true,
        reasons: [],
        suggestedFrequency: 30,
        discount: 10,
      };
      subscriptionIntelligenceService.evaluateSubscriptionEligibility.mockResolvedValue(
        mockEligibility,
      );

      const result = await controller.checkSubscriptionEligibility(
        mockProductId,
        mockCompanyId,
        mockCustomerId,
      );

      expect(result).toEqual(mockEligibility);
      expect(
        subscriptionIntelligenceService.evaluateSubscriptionEligibility,
      ).toHaveBeenCalledWith(mockCustomerId, mockProductId, mockCompanyId);
    });

    it('should check subscription eligibility without customer', async () => {
      const mockEligibility = {
        eligible: true,
        reasons: [],
        suggestedFrequency: 30,
      };
      subscriptionIntelligenceService.evaluateSubscriptionEligibility.mockResolvedValue(
        mockEligibility,
      );

      const result = await controller.checkSubscriptionEligibility(
        mockProductId,
        mockCompanyId,
        undefined,
      );

      expect(result).toEqual(mockEligibility);
      expect(
        subscriptionIntelligenceService.evaluateSubscriptionEligibility,
      ).toHaveBeenCalledWith(null, mockProductId, mockCompanyId);
    });
  });

  describe('getSubscriptionOffer', () => {
    it('should get subscription offer for product and customer', async () => {
      const mockOffer = {
        available: true,
        frequency: 30,
        discount: 15,
        freeShipping: true,
        nextDeliveryDate: new Date(),
      };
      subscriptionIntelligenceService.getSubscriptionOffer.mockResolvedValue(mockOffer);

      const result = await controller.getSubscriptionOffer(
        mockProductId,
        mockCompanyId,
        mockCustomerId,
      );

      expect(result).toEqual(mockOffer);
      expect(subscriptionIntelligenceService.getSubscriptionOffer).toHaveBeenCalledWith(
        mockProductId,
        mockCompanyId,
        mockCustomerId,
      );
    });

    it('should get subscription offer without customer', async () => {
      const mockOffer = {
        available: true,
        frequency: 30,
        discount: 10,
      };
      subscriptionIntelligenceService.getSubscriptionOffer.mockResolvedValue(mockOffer);

      const result = await controller.getSubscriptionOffer(
        mockProductId,
        mockCompanyId,
        undefined,
      );

      expect(result).toEqual(mockOffer);
      expect(subscriptionIntelligenceService.getSubscriptionOffer).toHaveBeenCalledWith(
        mockProductId,
        mockCompanyId,
        null,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCESS CONTROL TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Access Control', () => {
    it('should extract companyId from scopeId when scopeType is COMPANY', async () => {
      const mockUser = createMockUser({ scopeType: 'COMPANY', scopeId: 'company-999' });
      upsellTargetingService.getTargetingRules.mockResolvedValue([]);

      await controller.getTargetingRules(mockUser);

      expect(upsellTargetingService.getTargetingRules).toHaveBeenCalledWith('company-999');
    });

    it('should fall back to companyId when scopeType is not COMPANY', async () => {
      const mockUser = createMockUser({
        scopeType: 'CLIENT',
        scopeId: 'client-1',
        companyId: 'company-from-context',
      });
      upsellTargetingService.getTargetingRules.mockResolvedValue([]);

      await controller.getTargetingRules(mockUser);

      expect(upsellTargetingService.getTargetingRules).toHaveBeenCalledWith(
        'company-from-context',
      );
    });

    it('should allow public access to getCartUpsells', async () => {
      upsellTargetingService.getTargetedUpsells.mockResolvedValue([]);

      const result = await controller.getCartUpsells(mockCartId, {});

      expect(result).toEqual({ upsells: [] });
      // No user required
    });

    it('should allow public access to impression tracking endpoints', async () => {
      upsellTargetingService.recordImpression.mockResolvedValue('imp-1');
      upsellTargetingService.recordAcceptance.mockResolvedValue(undefined);
      upsellTargetingService.recordDecline.mockResolvedValue(undefined);

      // All these work without auth
      await controller.recordImpression({
        cartId: 'c1',
        ruleId: 'r1',
        sessionId: 's1',
        placement: 'CART_PAGE',
        offer: { discountPercent: 10 },
      });
      await controller.recordAcceptance({ impressionId: 'imp-1', revenue: 25 });
      await controller.recordDecline({ impressionId: 'imp-1' });

      expect(upsellTargetingService.recordImpression).toHaveBeenCalled();
      expect(upsellTargetingService.recordAcceptance).toHaveBeenCalled();
      expect(upsellTargetingService.recordDecline).toHaveBeenCalled();
    });

    it('should allow public access to subscription eligibility endpoints', async () => {
      subscriptionIntelligenceService.evaluateSubscriptionEligibility.mockResolvedValue({});
      subscriptionIntelligenceService.getSubscriptionOffer.mockResolvedValue({});

      await controller.checkSubscriptionEligibility(mockProductId, mockCompanyId);
      await controller.getSubscriptionOffer(mockProductId, mockCompanyId);

      // No user required
      expect(subscriptionIntelligenceService.evaluateSubscriptionEligibility).toHaveBeenCalled();
      expect(subscriptionIntelligenceService.getSubscriptionOffer).toHaveBeenCalled();
    });
  });
});
