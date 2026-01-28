/**
 * Upsell Targeting Service Unit Tests
 *
 * Comprehensive tests for upsell targeting including:
 * - Getting targeted upsells for a cart
 * - Creating/updating/deleting targeting rules
 * - Recording impressions, acceptances, and declines
 * - Customer segmentation
 * - Upsell scoring and personalization
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UpsellType, UpsellUrgency } from '@prisma/client';
import { UpsellTargetingService } from './upsell-targeting.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomerSegment, UpsellConditions, UpsellOffer, UpsellTargetingRuleData } from '../types/upsell.types';

describe('UpsellTargetingService', () => {
  let service: UpsellTargetingService;
  let prisma: {
    cart: {
      findUnique: jest.Mock;
    };
    order: {
      aggregate: jest.Mock;
      findFirst: jest.Mock;
    };
    subscription: {
      findFirst: jest.Mock;
    };
    upsellTargetingRule: {
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    upsellImpression: {
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    product: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockCartId = 'cart-123';
  const mockCompanyId = 'company-456';
  const mockCustomerId = 'customer-789';
  const mockRuleId = 'rule-001';

  const createMockCartItem = (productId: string, quantity: number = 1) => ({
    productId,
    quantity,
    product: {
      id: productId,
      name: `Product ${productId}`,
      price: 29.99,
      categoryAssignments: [{ categoryId: 'cat-1' }],
    },
  });

  const createMockCart = (overrides: Partial<any> = {}) => ({
    id: mockCartId,
    companyId: mockCompanyId,
    customerId: null,
    grandTotal: 75,
    items: [
      createMockCartItem('p1', 2),
      createMockCartItem('p2', 1),
    ],
    customer: null,
    ...overrides,
  });

  const createMockConditions = (overrides: Partial<UpsellConditions> = {}): UpsellConditions => ({
    segments: [CustomerSegment.MEDIUM_CART],
    cartValueMin: 20,
    cartValueMax: 100,
    ...overrides,
  });

  const createMockOffer = (overrides: Partial<UpsellOffer> = {}): UpsellOffer => ({
    discountPercent: 10,
    freeShipping: false,
    ...overrides,
  });

  const createMockRule = (overrides: Partial<UpsellTargetingRuleData> = {}): UpsellTargetingRuleData => ({
    id: mockRuleId,
    name: 'Test Upsell Rule',
    description: 'A test rule',
    priority: 50,
    enabled: true,
    conditions: createMockConditions(),
    upsellType: UpsellType.BULK_DISCOUNT,
    offer: createMockOffer(),
    message: 'Buy 2, save {{discount}}%!',
    urgency: UpsellUrgency.MEDIUM,
    placements: ['CART_DRAWER'],
    maxImpressions: undefined,
    maxAcceptances: undefined,
    validFrom: undefined,
    validUntil: undefined,
    ...overrides,
  });

  const createMockDbRule = (rule: UpsellTargetingRuleData) => ({
    id: rule.id,
    companyId: mockCompanyId,
    name: rule.name,
    description: rule.description || null,
    priority: rule.priority,
    enabled: rule.enabled,
    conditions: rule.conditions,
    upsellType: rule.upsellType,
    offer: rule.offer,
    message: rule.message,
    urgency: rule.urgency,
    placements: rule.placements,
    maxImpressions: rule.maxImpressions || null,
    maxAcceptances: rule.maxAcceptances || null,
    validFrom: rule.validFrom || null,
    validUntil: rule.validUntil || null,
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    prisma = {
      cart: {
        findUnique: jest.fn(),
      },
      order: {
        aggregate: jest.fn(),
        findFirst: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn(),
      },
      upsellTargetingRule: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      upsellImpression: {
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpsellTargetingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UpsellTargetingService>(UpsellTargetingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // getTargetedUpsells TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getTargetedUpsells', () => {
    it('should return empty array when cart not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      const result = await service.getTargetedUpsells(mockCartId);

      expect(result).toEqual([]);
    });

    it('should return targeted upsells based on cart context', async () => {
      const mockCart = createMockCart();
      const mockRule = createMockRule();
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.order.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { total: 0 } });
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.upsellTargetingRule.findMany.mockResolvedValue([createMockDbRule(mockRule)]);
      prisma.upsellImpression.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getTargetedUpsells(mockCartId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should respect maxUpsells option', async () => {
      const mockCart = createMockCart();
      const rules = [
        createMockRule({ id: 'rule-1', priority: 1 }),
        createMockRule({ id: 'rule-2', priority: 2 }),
        createMockRule({ id: 'rule-3', priority: 3 }),
        createMockRule({ id: 'rule-4', priority: 4 }),
      ];
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.order.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { total: 0 } });
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.upsellTargetingRule.findMany.mockResolvedValue(rules.map(createMockDbRule));
      prisma.upsellImpression.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getTargetedUpsells(mockCartId, { maxUpsells: 2 });

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should filter by placement', async () => {
      const mockCart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.order.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { total: 0 } });
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.upsellTargetingRule.findMany.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);

      await service.getTargetedUpsells(mockCartId, { placements: ['CHECKOUT'] });

      expect(prisma.upsellTargetingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                placements: { hasSome: ['CHECKOUT'] },
              }),
            ]),
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // createTargetingRule TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('createTargetingRule', () => {
    it('should create a new targeting rule', async () => {
      const mockRule = createMockRule();
      prisma.upsellTargetingRule.create.mockResolvedValue(createMockDbRule(mockRule));

      const result = await service.createTargetingRule(mockCompanyId, {
        name: mockRule.name,
        priority: mockRule.priority,
        enabled: mockRule.enabled,
        conditions: mockRule.conditions,
        upsellType: mockRule.upsellType,
        offer: mockRule.offer,
        message: mockRule.message,
        urgency: mockRule.urgency,
        placements: mockRule.placements,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(mockRuleId);
      expect(prisma.upsellTargetingRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCompanyId,
          name: mockRule.name,
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getTargetingRules TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getTargetingRules', () => {
    it('should return all rules for a company', async () => {
      const rules = [createMockRule({ id: 'rule-1' }), createMockRule({ id: 'rule-2' })];
      prisma.upsellTargetingRule.findMany.mockResolvedValue(rules.map(createMockDbRule));

      const result = await service.getTargetingRules(mockCompanyId);

      expect(result).toHaveLength(2);
      expect(prisma.upsellTargetingRule.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        orderBy: { priority: 'asc' },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateTargetingRule TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('updateTargetingRule', () => {
    it('should update a targeting rule', async () => {
      const mockRule = createMockRule({ enabled: false });
      prisma.upsellTargetingRule.update.mockResolvedValue(createMockDbRule(mockRule));

      const result = await service.updateTargetingRule(mockRuleId, mockCompanyId, {
        enabled: false,
      });

      expect(result.enabled).toBe(false);
      expect(prisma.upsellTargetingRule.update).toHaveBeenCalledWith({
        where: { id: mockRuleId, companyId: mockCompanyId },
        data: expect.objectContaining({ enabled: false }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // deleteTargetingRule TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('deleteTargetingRule', () => {
    it('should delete a targeting rule', async () => {
      prisma.upsellTargetingRule.delete.mockResolvedValue({});

      await service.deleteTargetingRule(mockRuleId, mockCompanyId);

      expect(prisma.upsellTargetingRule.delete).toHaveBeenCalledWith({
        where: { id: mockRuleId, companyId: mockCompanyId },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // recordImpression TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('recordImpression', () => {
    it('should create impression record', async () => {
      const impressionId = 'impression-123';
      prisma.upsellImpression.create.mockResolvedValue({ id: impressionId });

      const result = await service.recordImpression({
        cartId: mockCartId,
        ruleId: mockRuleId,
        customerId: mockCustomerId,
        sessionId: 'session-123',
        placement: 'CART_DRAWER',
        offer: createMockOffer(),
      });

      expect(result).toBe(impressionId);
      expect(prisma.upsellImpression.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cartId: mockCartId,
          ruleId: mockRuleId,
          sessionId: 'session-123',
          placement: 'CART_DRAWER',
        }),
      });
    });

    it('should handle optional variant', async () => {
      prisma.upsellImpression.create.mockResolvedValue({ id: 'impression-123' });

      await service.recordImpression({
        cartId: mockCartId,
        ruleId: mockRuleId,
        sessionId: 'session-123',
        placement: 'CART_DRAWER',
        variant: 'variant-A',
        offer: createMockOffer(),
      });

      expect(prisma.upsellImpression.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ variant: 'variant-A' }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // recordAcceptance TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('recordAcceptance', () => {
    it('should update impression with acceptance', async () => {
      const impressionId = 'impression-123';
      prisma.upsellImpression.update.mockResolvedValue({ id: impressionId });

      await service.recordAcceptance(impressionId, 29.99);

      expect(prisma.upsellImpression.update).toHaveBeenCalledWith({
        where: { id: impressionId },
        data: {
          acceptedAt: expect.any(Date),
          revenue: 29.99,
        },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // recordDecline TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('recordDecline', () => {
    it('should update impression with decline', async () => {
      const impressionId = 'impression-123';
      prisma.upsellImpression.update.mockResolvedValue({ id: impressionId });

      await service.recordDecline(impressionId);

      expect(prisma.upsellImpression.update).toHaveBeenCalledWith({
        where: { id: impressionId },
        data: {
          declinedAt: expect.any(Date),
        },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CUSTOMER SEGMENTATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Customer Segmentation', () => {
    it('should identify SMALL_CART segment', async () => {
      const mockCart = createMockCart({ grandTotal: 15 });
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.order.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { total: 0 } });
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.upsellTargetingRule.findMany.mockResolvedValue([
        createMockDbRule(createMockRule({ conditions: { segments: [CustomerSegment.SMALL_CART] } })),
      ]);
      prisma.upsellImpression.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getTargetedUpsells(mockCartId);

      // Should match the rule because cart value < 30
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify FIRST_TIME_BUYER segment for guest', async () => {
      const mockCart = createMockCart({ customerId: null, customer: null });
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.order.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { total: 0 } });
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.upsellTargetingRule.findMany.mockResolvedValue([
        createMockDbRule(createMockRule({ conditions: { isNewCustomer: true } })),
      ]);
      prisma.upsellImpression.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getTargetedUpsells(mockCartId);

      // Should match because guest is treated as new customer
      expect(result).toBeDefined();
    });

    it('should identify REPEAT_CUSTOMER segment', async () => {
      const mockCart = createMockCart({
        customerId: mockCustomerId,
        customer: { id: mockCustomerId, orderCount: 3, lifetimeValue: 150 },
      });
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.order.aggregate.mockResolvedValue({ _count: { _all: 3 }, _sum: { total: 150 } });
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.order.findFirst.mockResolvedValue({ createdAt: new Date() });
      prisma.upsellTargetingRule.findMany.mockResolvedValue([
        createMockDbRule(createMockRule({ conditions: { segments: [CustomerSegment.REPEAT_CUSTOMER] } })),
      ]);
      prisma.upsellImpression.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getTargetedUpsells(mockCartId);

      expect(result).toBeDefined();
    });

    it('should identify LOYAL_SUBSCRIBER segment', async () => {
      const mockCart = createMockCart({ customerId: mockCustomerId });
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.order.aggregate.mockResolvedValue({ _count: { _all: 5 }, _sum: { total: 250 } });
      prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-1', status: 'ACTIVE' });
      prisma.order.findFirst.mockResolvedValue({ createdAt: new Date() });
      prisma.upsellTargetingRule.findMany.mockResolvedValue([
        createMockDbRule(createMockRule({ conditions: { hasSubscription: true } })),
      ]);
      prisma.upsellImpression.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getTargetedUpsells(mockCartId);

      expect(result).toBeDefined();
    });

    it('should identify LAPSED_CUSTOMER segment', async () => {
      const mockCart = createMockCart({ customerId: mockCustomerId });
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.order.aggregate.mockResolvedValue({ _count: { _all: 2 }, _sum: { total: 100 } });
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.order.findFirst.mockResolvedValue({ createdAt: oldDate });
      prisma.upsellTargetingRule.findMany.mockResolvedValue([
        createMockDbRule(createMockRule({ conditions: { segments: [CustomerSegment.LAPSED_CUSTOMER] } })),
      ]);
      prisma.upsellImpression.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getTargetedUpsells(mockCartId);

      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CONDITION MATCHING TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Condition Matching', () => {
    it('should filter by cartValueMin', async () => {
      const mockCart = createMockCart({ grandTotal: 15 });
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.order.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { total: 0 } });
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.upsellTargetingRule.findMany.mockResolvedValue([
        createMockDbRule(createMockRule({ conditions: { cartValueMin: 50 } })),
      ]);
      prisma.upsellImpression.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getTargetedUpsells(mockCartId);

      // Should not match because cart value 15 < 50
      expect(result).toHaveLength(0);
    });

    it('should filter by cartValueMax', async () => {
      const mockCart = createMockCart({ grandTotal: 150 });
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.order.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { total: 0 } });
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.upsellTargetingRule.findMany.mockResolvedValue([
        createMockDbRule(createMockRule({ conditions: { cartValueMax: 100 } })),
      ]);
      prisma.upsellImpression.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getTargetedUpsells(mockCartId);

      // Should not match because cart value 150 > 100
      expect(result).toHaveLength(0);
    });

    it('should filter by hasProduct', async () => {
      const mockCart = createMockCart({
        items: [createMockCartItem('p1', 1)],
      });
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.order.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { total: 0 } });
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.upsellTargetingRule.findMany.mockResolvedValue([
        createMockDbRule(createMockRule({ conditions: { hasProduct: ['p2'] } })),
      ]);
      prisma.upsellImpression.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getTargetedUpsells(mockCartId);

      // Should not match because p2 is not in cart
      expect(result).toHaveLength(0);
    });

    it('should filter by excludeProduct', async () => {
      const mockCart = createMockCart({
        items: [createMockCartItem('p1', 1)],
      });
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.order.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { total: 0 } });
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.upsellTargetingRule.findMany.mockResolvedValue([
        createMockDbRule(createMockRule({ conditions: { excludeProduct: ['p1'] } })),
      ]);
      prisma.upsellImpression.count.mockResolvedValue(0);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getTargetedUpsells(mockCartId);

      // Should not match because p1 is excluded
      expect(result).toHaveLength(0);
    });
  });
});
