import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PromotionType, PromotionScope } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('PromotionService', () => {
  let service: PromotionService;
  let prisma: PrismaService;

  const mockCompanyId = 'company-1';
  const mockCustomerId = 'customer-1';

  const mockPromotion = {
    id: 'promo-1',
    companyId: mockCompanyId,
    code: 'SAVE20',
    name: '20% Off',
    description: 'Save 20% on your order',
    type: PromotionType.PERCENTAGE_OFF,
    scope: PromotionScope.CART,
    value: new Decimal(20),
    minimumOrderAmount: new Decimal(50),
    maximumDiscount: new Decimal(100),
    buyQuantity: null,
    getQuantity: null,
    getProductId: null,
    maxUsesTotal: 100,
    maxUsesPerCustomer: 1,
    currentUses: 0,
    startsAt: new Date('2026-01-01'),
    expiresAt: new Date('2026-12-31'),
    targeting: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    promotion: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    promotionUsage: {
      count: jest.fn(),
      create: jest.fn(),
    },
    cartPromotion: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PromotionService>(PromotionService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPromotion', () => {
    it('should create a promotion successfully', async () => {
      mockPrismaService.promotion.findUnique.mockResolvedValue(null);
      mockPrismaService.promotion.create.mockResolvedValue(mockPromotion);

      const input = {
        code: 'SAVE20',
        name: '20% Off',
        description: 'Save 20% on your order',
        type: PromotionType.PERCENTAGE_OFF,
        scope: PromotionScope.CART,
        value: 20,
        minimumOrderAmount: 50,
        maximumDiscount: 100,
        startsAt: new Date('2026-01-01'),
        expiresAt: new Date('2026-12-31'),
      };

      const result = await service.createPromotion(mockCompanyId, input);

      expect(result).toEqual(mockPromotion);
      expect(mockPrismaService.promotion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCompanyId,
          code: 'SAVE20',
          name: '20% Off',
          type: PromotionType.PERCENTAGE_OFF,
        }),
      });
    });

    it('should throw error if code already exists', async () => {
      mockPrismaService.promotion.findUnique.mockResolvedValue(mockPromotion);

      const input = {
        code: 'SAVE20',
        name: '20% Off',
        type: PromotionType.PERCENTAGE_OFF,
        scope: PromotionScope.CART,
        value: 20,
        startsAt: new Date(),
      };

      await expect(service.createPromotion(mockCompanyId, input)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should uppercase the promotion code', async () => {
      mockPrismaService.promotion.findUnique.mockResolvedValue(null);
      mockPrismaService.promotion.create.mockResolvedValue(mockPromotion);

      const input = {
        code: 'save20',
        name: '20% Off',
        type: PromotionType.PERCENTAGE_OFF,
        scope: PromotionScope.CART,
        value: 20,
        startsAt: new Date(),
      };

      await service.createPromotion(mockCompanyId, input);

      expect(mockPrismaService.promotion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'SAVE20',
        }),
      });
    });
  });

  describe('validatePromotion', () => {
    const mockInput = {
      cartId: 'cart-1',
      code: 'SAVE20',
      companyId: mockCompanyId,
      customerId: mockCustomerId,
      cartSubtotal: new Decimal(100),
      cartItems: [
        {
          productId: 'product-1',
          quantity: 2,
          lineTotal: new Decimal(100),
        },
      ],
    };

    it('should validate a valid promotion', async () => {
      mockPrismaService.promotion.findUnique.mockResolvedValue(mockPromotion);
      mockPrismaService.promotionUsage.count.mockResolvedValue(0);

      const result = await service.validatePromotion(mockInput);

      expect(result.valid).toBe(true);
      expect(result.promotion).toBeDefined();
      expect(result.discountAmount).toBeDefined();
    });

    it('should return invalid for non-existent code', async () => {
      mockPrismaService.promotion.findUnique.mockResolvedValue(null);

      const result = await service.validatePromotion(mockInput);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid promotion code');
    });

    it('should return invalid for inactive promotion', async () => {
      mockPrismaService.promotion.findUnique.mockResolvedValue({
        ...mockPromotion,
        isActive: false,
      });

      const result = await service.validatePromotion(mockInput);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('This promotion is no longer active');
    });

    it('should return invalid for promotion that has not started', async () => {
      mockPrismaService.promotion.findUnique.mockResolvedValue({
        ...mockPromotion,
        startsAt: new Date('2099-01-01'),
      });

      const result = await service.validatePromotion(mockInput);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('This promotion has not started yet');
    });

    it('should return invalid for expired promotion', async () => {
      mockPrismaService.promotion.findUnique.mockResolvedValue({
        ...mockPromotion,
        expiresAt: new Date('2020-01-01'),
      });

      const result = await service.validatePromotion(mockInput);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('This promotion has expired');
    });

    it('should return invalid for order below minimum', async () => {
      mockPrismaService.promotion.findUnique.mockResolvedValue(mockPromotion);

      const result = await service.validatePromotion({
        ...mockInput,
        cartSubtotal: new Decimal(25), // Below minimum of 50
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum order');
    });

    it('should return invalid when usage limit reached', async () => {
      mockPrismaService.promotion.findUnique.mockResolvedValue({
        ...mockPromotion,
        currentUses: 100,
      });

      const result = await service.validatePromotion(mockInput);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('This promotion has reached its usage limit');
    });

    it('should return invalid when customer usage limit reached', async () => {
      mockPrismaService.promotion.findUnique.mockResolvedValue(mockPromotion);
      mockPrismaService.promotionUsage.count.mockResolvedValue(1);

      const result = await service.validatePromotion(mockInput);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('You have already used this promotion');
    });

    it('should calculate percentage discount correctly', async () => {
      mockPrismaService.promotion.findUnique.mockResolvedValue(mockPromotion);
      mockPrismaService.promotionUsage.count.mockResolvedValue(0);

      const result = await service.validatePromotion(mockInput);

      expect(result.valid).toBe(true);
      // 20% of 100 = 20
      expect(result.discountAmount?.toNumber()).toBe(20);
    });

    it('should cap discount at maximum', async () => {
      mockPrismaService.promotion.findUnique.mockResolvedValue({
        ...mockPromotion,
        value: new Decimal(50), // 50% off
        maximumDiscount: new Decimal(25), // Max $25
      });
      mockPrismaService.promotionUsage.count.mockResolvedValue(0);

      const result = await service.validatePromotion(mockInput);

      expect(result.valid).toBe(true);
      // 50% of 100 = 50, capped at 25
      expect(result.discountAmount?.toNumber()).toBe(25);
    });
  });

  describe('applyPromotion', () => {
    const mockInput = {
      cartId: 'cart-1',
      code: 'SAVE20',
      companyId: mockCompanyId,
      customerId: mockCustomerId,
      cartSubtotal: new Decimal(100),
      cartItems: [
        {
          productId: 'product-1',
          quantity: 2,
          lineTotal: new Decimal(100),
        },
      ],
    };

    it('should apply promotion successfully', async () => {
      mockPrismaService.promotion.findUnique.mockResolvedValue(mockPromotion);
      mockPrismaService.promotionUsage.count.mockResolvedValue(0);
      mockPrismaService.cartPromotion.upsert.mockResolvedValue({});

      const result = await service.applyPromotion(mockInput);

      expect(result.discountAmount).toBeDefined();
      expect(result.message).toContain('SAVE20');
      expect(mockPrismaService.cartPromotion.upsert).toHaveBeenCalled();
    });

    it('should throw error for invalid promotion', async () => {
      mockPrismaService.promotion.findUnique.mockResolvedValue(null);

      await expect(service.applyPromotion(mockInput)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removePromotion', () => {
    it('should remove promotion from cart', async () => {
      mockPrismaService.cartPromotion.deleteMany.mockResolvedValue({ count: 1 });

      await service.removePromotion('cart-1', 'promo-1');

      expect(mockPrismaService.cartPromotion.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1', promotionId: 'promo-1' },
      });
    });
  });

  describe('recordUsage', () => {
    it('should record promotion usage', async () => {
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      await service.recordUsage(
        'promo-1',
        'order-1',
        mockCustomerId,
        new Decimal(20),
      );

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('getPromotions', () => {
    it('should get all promotions for company', async () => {
      mockPrismaService.promotion.findMany.mockResolvedValue([mockPromotion]);

      const result = await service.getPromotions(mockCompanyId);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.promotion.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ companyId: mockCompanyId }),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by active status', async () => {
      mockPrismaService.promotion.findMany.mockResolvedValue([mockPromotion]);

      await service.getPromotions(mockCompanyId, { isActive: true });

      expect(mockPrismaService.promotion.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ isActive: true }),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should include expired when requested', async () => {
      mockPrismaService.promotion.findMany.mockResolvedValue([mockPromotion]);

      await service.getPromotions(mockCompanyId, { includeExpired: true });

      expect(mockPrismaService.promotion.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getPromotionById', () => {
    it('should get promotion by ID', async () => {
      mockPrismaService.promotion.findFirst.mockResolvedValue({
        ...mockPromotion,
        usageRecords: [],
      });

      const result = await service.getPromotionById('promo-1', mockCompanyId);

      expect(result).toBeDefined();
      expect(result.id).toBe('promo-1');
    });

    it('should throw NotFoundException for non-existent promotion', async () => {
      mockPrismaService.promotion.findFirst.mockResolvedValue(null);

      await expect(
        service.getPromotionById('invalid-id', mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePromotion', () => {
    it('should update promotion', async () => {
      mockPrismaService.promotion.findFirst.mockResolvedValue(mockPromotion);
      mockPrismaService.promotion.update.mockResolvedValue({
        ...mockPromotion,
        name: 'Updated Name',
      });

      const result = await service.updatePromotion('promo-1', mockCompanyId, {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException for non-existent promotion', async () => {
      mockPrismaService.promotion.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePromotion('invalid-id', mockCompanyId, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deletePromotion', () => {
    it('should hard delete unused promotion', async () => {
      mockPrismaService.promotion.findFirst.mockResolvedValue(mockPromotion);
      mockPrismaService.promotionUsage.count.mockResolvedValue(0);
      mockPrismaService.promotion.delete.mockResolvedValue({});

      await service.deletePromotion('promo-1', mockCompanyId);

      expect(mockPrismaService.promotion.delete).toHaveBeenCalledWith({
        where: { id: 'promo-1' },
      });
    });

    it('should soft delete used promotion', async () => {
      mockPrismaService.promotion.findFirst.mockResolvedValue(mockPromotion);
      mockPrismaService.promotionUsage.count.mockResolvedValue(5);
      mockPrismaService.promotion.update.mockResolvedValue({});

      await service.deletePromotion('promo-1', mockCompanyId);

      expect(mockPrismaService.promotion.update).toHaveBeenCalledWith({
        where: { id: 'promo-1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException for non-existent promotion', async () => {
      mockPrismaService.promotion.findFirst.mockResolvedValue(null);

      await expect(
        service.deletePromotion('invalid-id', mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('hasFreeShipping', () => {
    it('should return true for free shipping promotion', async () => {
      mockPrismaService.promotion.findFirst.mockResolvedValue({
        ...mockPromotion,
        type: PromotionType.FREE_SHIPPING,
      });

      const result = await service.hasFreeShipping('promo-1');

      expect(result).toBe(true);
    });

    it('should return false for non-free-shipping promotion', async () => {
      mockPrismaService.promotion.findFirst.mockResolvedValue(null);

      const result = await service.hasFreeShipping('promo-1');

      expect(result).toBe(false);
    });
  });
});
