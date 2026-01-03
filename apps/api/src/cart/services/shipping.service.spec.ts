import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ShippingService, ShippingEstimateInput, ShippingOption } from './shipping.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ShippingRuleType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('ShippingService', () => {
  let service: ShippingService;
  let prisma: PrismaService;

  const mockCompanyId = 'company-1';

  const mockShippingZone = {
    id: 'zone-1',
    companyId: mockCompanyId,
    name: 'United States',
    description: 'Domestic US shipping',
    countries: ['US'],
    states: [],
    zipCodes: [],
    priority: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockShippingRule = {
    id: 'rule-1',
    shippingZoneId: 'zone-1',
    name: 'Standard Shipping',
    description: 'Delivered in 5-7 business days',
    carrier: 'USPS',
    serviceCode: 'USPS_GROUND_ADVANTAGE',
    type: ShippingRuleType.FLAT_RATE,
    baseRate: new Decimal(5.99),
    perItemRate: null,
    perWeightUnitRate: null,
    weightUnit: 'lb',
    freeShippingThreshold: new Decimal(75),
    minWeight: null,
    maxWeight: null,
    minOrderTotal: null,
    maxOrderTotal: null,
    estimatedDaysMin: 5,
    estimatedDaysMax: 7,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    zone: mockShippingZone,
  };

  const mockPrismaService = {
    shippingZone: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    shippingRule: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ShippingService>(ShippingService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateShipping', () => {
    const mockInput: ShippingEstimateInput = {
      companyId: mockCompanyId,
      country: 'US',
      cartSubtotal: new Decimal(50),
      cartItems: [
        {
          productId: 'product-1',
          quantity: 2,
          weight: new Decimal(1),
          lineTotal: new Decimal(50),
        },
      ],
    };

    it('should calculate flat rate shipping', async () => {
      mockPrismaService.shippingZone.findMany.mockResolvedValue([mockShippingZone]);
      mockPrismaService.shippingRule.findMany.mockResolvedValue([mockShippingRule]);

      const result = await service.calculateShipping(mockInput);

      expect(result.options).toHaveLength(1);
      expect(result.options[0].rate.toNumber()).toBe(5.99);
      expect(result.options[0].name).toBe('Standard Shipping');
    });

    it('should return free shipping when threshold met', async () => {
      mockPrismaService.shippingZone.findMany.mockResolvedValue([mockShippingZone]);
      mockPrismaService.shippingRule.findMany.mockResolvedValue([mockShippingRule]);

      const inputOverThreshold: ShippingEstimateInput = {
        ...mockInput,
        cartSubtotal: new Decimal(100), // Over $75 threshold
      };

      const result = await service.calculateShipping(inputOverThreshold);

      expect(result.options[0].rate.toNumber()).toBe(0);
      expect(result.options[0].isFree).toBe(true);
    });

    it('should calculate per-item shipping', async () => {
      const perItemRule = {
        ...mockShippingRule,
        type: ShippingRuleType.PER_ITEM,
        baseRate: new Decimal(2),
        perItemRate: new Decimal(1.50),
        freeShippingThreshold: null,
      };
      mockPrismaService.shippingZone.findMany.mockResolvedValue([mockShippingZone]);
      mockPrismaService.shippingRule.findMany.mockResolvedValue([perItemRule]);

      const result = await service.calculateShipping(mockInput);

      // Base $2 + (2 items * $1.50) = $5
      expect(result.options[0].rate.toNumber()).toBe(5);
    });

    it('should calculate weight-based shipping', async () => {
      const weightBasedRule = {
        ...mockShippingRule,
        type: ShippingRuleType.WEIGHT_BASED,
        baseRate: new Decimal(3),
        perWeightUnitRate: new Decimal(0.50),
        freeShippingThreshold: null,
      };
      mockPrismaService.shippingZone.findMany.mockResolvedValue([mockShippingZone]);
      mockPrismaService.shippingRule.findMany.mockResolvedValue([weightBasedRule]);

      const result = await service.calculateShipping(mockInput);

      // Base $3 + (2 * 1 lb * $0.50) = $4
      expect(result.options[0].rate.toNumber()).toBe(4);
    });

    it('should calculate price-based shipping', async () => {
      const priceBasedRule = {
        ...mockShippingRule,
        type: ShippingRuleType.PRICE_BASED,
        baseRate: new Decimal(0),
        freeShippingThreshold: null,
        minOrderTotal: new Decimal(0),
        maxOrderTotal: new Decimal(100),
      };
      mockPrismaService.shippingZone.findMany.mockResolvedValue([mockShippingZone]);
      mockPrismaService.shippingRule.findMany.mockResolvedValue([priceBasedRule]);

      const result = await service.calculateShipping(mockInput);

      expect(result.options).toHaveLength(1);
    });

    it('should exclude rules outside order amount range', async () => {
      const expensiveOnlyRule = {
        ...mockShippingRule,
        freeShippingThreshold: null,
        minOrderTotal: new Decimal(200),
        maxOrderTotal: new Decimal(500),
      };
      mockPrismaService.shippingZone.findMany.mockResolvedValue([mockShippingZone]);
      mockPrismaService.shippingRule.findMany.mockResolvedValue([expensiveOnlyRule]);

      const result = await service.calculateShipping(mockInput);

      expect(result.options).toHaveLength(0);
    });

    it('should exclude rules outside weight range', async () => {
      const heavyOnlyRule = {
        ...mockShippingRule,
        freeShippingThreshold: null,
        minWeight: new Decimal(50),
        maxWeight: new Decimal(100),
      };
      mockPrismaService.shippingZone.findMany.mockResolvedValue([mockShippingZone]);
      mockPrismaService.shippingRule.findMany.mockResolvedValue([heavyOnlyRule]);

      const result = await service.calculateShipping(mockInput);

      expect(result.options).toHaveLength(0);
    });

    it('should return empty options when no zone matches', async () => {
      mockPrismaService.shippingZone.findMany.mockResolvedValue([]);

      const result = await service.calculateShipping(mockInput);

      expect(result.options).toHaveLength(0);
      expect(result.cheapestOption).toBeNull();
      expect(result.fastestOption).toBeNull();
    });

    it('should match zone by state', async () => {
      const stateZone = {
        ...mockShippingZone,
        countries: ['US'],
        states: ['US-CA'],
      };
      mockPrismaService.shippingZone.findMany.mockResolvedValue([stateZone]);
      mockPrismaService.shippingRule.findMany.mockResolvedValue([mockShippingRule]);

      const inputWithState: ShippingEstimateInput = {
        ...mockInput,
        state: 'CA',
      };

      const result = await service.calculateShipping(inputWithState);

      expect(result.options).toHaveLength(1);
    });

    it('should match zone by zip pattern', async () => {
      const zipZone = {
        ...mockShippingZone,
        zipCodes: ['902*'],
      };
      mockPrismaService.shippingZone.findMany.mockResolvedValue([zipZone]);
      mockPrismaService.shippingRule.findMany.mockResolvedValue([mockShippingRule]);

      const inputWithZip: ShippingEstimateInput = {
        ...mockInput,
        zipCode: '90210',
      };

      const result = await service.calculateShipping(inputWithZip);

      expect(result.options).toHaveLength(1);
    });

    it('should identify cheapest option', async () => {
      const expensiveRule = {
        ...mockShippingRule,
        id: 'rule-2',
        name: 'Express Shipping',
        baseRate: new Decimal(15.99),
        freeShippingThreshold: null,
      };
      mockPrismaService.shippingZone.findMany.mockResolvedValue([mockShippingZone]);
      mockPrismaService.shippingRule.findMany.mockResolvedValue([
        mockShippingRule,
        expensiveRule,
      ]);

      const result = await service.calculateShipping(mockInput);

      expect(result.cheapestOption?.name).toBe('Standard Shipping');
    });

    it('should identify fastest option', async () => {
      const fastRule = {
        ...mockShippingRule,
        id: 'rule-2',
        name: 'Express Shipping',
        baseRate: new Decimal(15.99),
        freeShippingThreshold: null,
        estimatedDaysMin: 1,
        estimatedDaysMax: 2,
      };
      mockPrismaService.shippingZone.findMany.mockResolvedValue([mockShippingZone]);
      mockPrismaService.shippingRule.findMany.mockResolvedValue([
        mockShippingRule,
        fastRule,
      ]);

      const result = await service.calculateShipping(mockInput);

      expect(result.fastestOption?.name).toBe('Express Shipping');
    });

    it('should calculate amount to free shipping', async () => {
      mockPrismaService.shippingZone.findMany.mockResolvedValue([mockShippingZone]);
      mockPrismaService.shippingRule.findMany.mockResolvedValue([mockShippingRule]);

      const result = await service.calculateShipping(mockInput);

      // Cart is $50, threshold is $75, so $25 to free shipping
      expect(result.amountToFreeShipping?.toNumber()).toBe(25);
    });

    it('should handle free shipping promotion', async () => {
      mockPrismaService.shippingZone.findMany.mockResolvedValue([mockShippingZone]);
      mockPrismaService.shippingRule.findMany.mockResolvedValue([mockShippingRule]);

      const inputWithPromo: ShippingEstimateInput = {
        ...mockInput,
        hasFreeShippingPromotion: true,
      };

      const result = await service.calculateShipping(inputWithPromo);

      expect(result.options[0].rate.toNumber()).toBe(0);
      expect(result.options[0].isFree).toBe(true);
    });
  });

  describe('createShippingZone', () => {
    it('should create shipping zone', async () => {
      mockPrismaService.shippingZone.create.mockResolvedValue(mockShippingZone);

      const input = {
        name: 'United States',
        countries: ['US'],
      };

      const result = await service.createShippingZone(mockCompanyId, input);

      expect(result).toEqual(mockShippingZone);
      expect(mockPrismaService.shippingZone.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCompanyId,
          name: 'United States',
          countries: ['US'],
        }),
        include: { rules: true },
      });
    });
  });

  describe('getShippingZones', () => {
    it('should get all shipping zones for company', async () => {
      mockPrismaService.shippingZone.findMany.mockResolvedValue([mockShippingZone]);

      const result = await service.getShippingZones(mockCompanyId);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.shippingZone.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        include: expect.any(Object),
        orderBy: { priority: 'desc' },
      });
    });

    it('should filter by active status', async () => {
      mockPrismaService.shippingZone.findMany.mockResolvedValue([mockShippingZone]);

      await service.getShippingZones(mockCompanyId, { isActive: true });

      expect(mockPrismaService.shippingZone.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ isActive: true }),
        include: expect.any(Object),
        orderBy: { priority: 'desc' },
      });
    });
  });

  describe('getShippingZoneById', () => {
    it('should get shipping zone by ID', async () => {
      mockPrismaService.shippingZone.findFirst.mockResolvedValue(mockShippingZone);

      const result = await service.getShippingZoneById('zone-1', mockCompanyId);

      expect(result).toEqual(mockShippingZone);
    });

    it('should throw NotFoundException for non-existent zone', async () => {
      mockPrismaService.shippingZone.findFirst.mockResolvedValue(null);

      await expect(
        service.getShippingZoneById('invalid-id', mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateShippingZone', () => {
    it('should update shipping zone', async () => {
      mockPrismaService.shippingZone.findFirst.mockResolvedValue(mockShippingZone);
      mockPrismaService.shippingZone.update.mockResolvedValue({
        ...mockShippingZone,
        name: 'Updated Zone',
      });

      const result = await service.updateShippingZone('zone-1', mockCompanyId, {
        name: 'Updated Zone',
      });

      expect(result.name).toBe('Updated Zone');
    });

    it('should throw NotFoundException for non-existent zone', async () => {
      mockPrismaService.shippingZone.findFirst.mockResolvedValue(null);

      await expect(
        service.updateShippingZone('invalid-id', mockCompanyId, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteShippingZone', () => {
    it('should delete shipping zone', async () => {
      mockPrismaService.shippingZone.findFirst.mockResolvedValue(mockShippingZone);
      mockPrismaService.shippingZone.delete.mockResolvedValue({});

      await service.deleteShippingZone('zone-1', mockCompanyId);

      expect(mockPrismaService.shippingZone.delete).toHaveBeenCalledWith({
        where: { id: 'zone-1' },
      });
    });

    it('should throw NotFoundException for non-existent zone', async () => {
      mockPrismaService.shippingZone.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteShippingZone('invalid-id', mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addShippingRule', () => {
    it('should add shipping rule to zone', async () => {
      mockPrismaService.shippingRule.create.mockResolvedValue(mockShippingRule);

      const input = {
        name: 'Standard Shipping',
        type: ShippingRuleType.FLAT_RATE,
        baseRate: 5.99,
        estimatedDaysMin: 5,
        estimatedDaysMax: 7,
      };

      const result = await service.addShippingRule('zone-1', input);

      expect(result).toEqual(mockShippingRule);
      expect(mockPrismaService.shippingRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shippingZoneId: 'zone-1',
          name: 'Standard Shipping',
          type: ShippingRuleType.FLAT_RATE,
        }),
      });
    });
  });

  describe('updateShippingRule', () => {
    it('should update shipping rule', async () => {
      mockPrismaService.shippingRule.findFirst.mockResolvedValue(mockShippingRule);
      mockPrismaService.shippingRule.update.mockResolvedValue({
        ...mockShippingRule,
        name: 'Updated Rule',
      });

      const result = await service.updateShippingRule(
        'rule-1',
        mockCompanyId,
        { name: 'Updated Rule' },
      );

      expect(result.name).toBe('Updated Rule');
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      mockPrismaService.shippingRule.findFirst.mockResolvedValue(null);

      await expect(
        service.updateShippingRule('invalid-id', mockCompanyId, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for rule from different company', async () => {
      mockPrismaService.shippingRule.findFirst.mockResolvedValue({
        ...mockShippingRule,
        zone: { ...mockShippingZone, companyId: 'other-company' },
      });

      await expect(
        service.updateShippingRule('rule-1', mockCompanyId, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteShippingRule', () => {
    it('should delete shipping rule', async () => {
      mockPrismaService.shippingRule.findFirst.mockResolvedValue(mockShippingRule);
      mockPrismaService.shippingRule.delete.mockResolvedValue({});

      await service.deleteShippingRule('rule-1', mockCompanyId);

      expect(mockPrismaService.shippingRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
      });
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      mockPrismaService.shippingRule.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteShippingRule('invalid-id', mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for rule from different company', async () => {
      mockPrismaService.shippingRule.findFirst.mockResolvedValue({
        ...mockShippingRule,
        zone: { ...mockShippingZone, companyId: 'other-company' },
      });

      await expect(
        service.deleteShippingRule('rule-1', mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
