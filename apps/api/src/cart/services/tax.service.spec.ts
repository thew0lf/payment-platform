import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TaxService, TaxCalculationInput } from './tax.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TaxType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('TaxService', () => {
  let service: TaxService;
  let prisma: PrismaService;

  const mockCompanyId = 'company-1';

  const mockTaxRate = {
    id: 'tax-1',
    companyId: mockCompanyId,
    country: 'US',
    state: 'CA',
    city: null,
    zipCode: null,
    taxType: TaxType.SALES_TAX,
    name: 'California State Tax',
    rate: new Decimal(0.0725), // 7.25%
    isCompound: false,
    priority: 0,
    exemptCategories: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    taxRate: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TaxService>(TaxService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTaxRate', () => {
    it('should create a tax rate successfully', async () => {
      mockPrismaService.taxRate.create.mockResolvedValue(mockTaxRate);

      const input = {
        country: 'US',
        state: 'CA',
        taxType: TaxType.SALES_TAX,
        name: 'California State Tax',
        rate: 7.25, // percentage
      };

      const result = await service.createTaxRate(mockCompanyId, input);

      expect(result).toEqual(mockTaxRate);
      expect(mockPrismaService.taxRate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCompanyId,
          country: 'US',
          state: 'CA',
          name: 'California State Tax',
          rate: new Decimal(0.0725), // Converted from percentage
        }),
      });
    });

    it('should uppercase country and state codes', async () => {
      mockPrismaService.taxRate.create.mockResolvedValue(mockTaxRate);

      const input = {
        country: 'us',
        state: 'ca',
        taxType: TaxType.SALES_TAX,
        name: 'California State Tax',
        rate: 7.25,
      };

      await service.createTaxRate(mockCompanyId, input);

      expect(mockPrismaService.taxRate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          country: 'US',
          state: 'CA',
        }),
      });
    });
  });

  describe('calculateTax', () => {
    const mockInput: TaxCalculationInput = {
      companyId: mockCompanyId,
      country: 'US',
      state: 'CA',
      lineItems: [
        {
          productId: 'product-1',
          quantity: 2,
          lineTotal: new Decimal(100),
        },
      ],
    };

    it('should calculate tax correctly', async () => {
      mockPrismaService.taxRate.findMany.mockResolvedValue([mockTaxRate]);

      const result = await service.calculateTax(mockInput);

      expect(result.totalTax.toNumber()).toBeCloseTo(7.25); // 7.25% of 100
      expect(result.taxableSubtotal.toNumber()).toBe(100);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].name).toBe('California State Tax');
    });

    it('should return zero tax when no rates found', async () => {
      mockPrismaService.taxRate.findMany.mockResolvedValue([]);

      const result = await service.calculateTax(mockInput);

      expect(result.totalTax.toNumber()).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });

    it('should exclude non-taxable items', async () => {
      mockPrismaService.taxRate.findMany.mockResolvedValue([mockTaxRate]);

      const inputWithNonTaxable: TaxCalculationInput = {
        ...mockInput,
        lineItems: [
          {
            productId: 'product-1',
            quantity: 1,
            lineTotal: new Decimal(100),
            isTaxable: true,
          },
          {
            productId: 'product-2',
            quantity: 1,
            lineTotal: new Decimal(50),
            isTaxable: false,
          },
        ],
      };

      const result = await service.calculateTax(inputWithNonTaxable);

      expect(result.taxableSubtotal.toNumber()).toBe(100); // Only taxable item
      expect(result.totalTax.toNumber()).toBeCloseTo(7.25); // 7.25% of 100
    });

    it('should exclude exempt categories', async () => {
      mockPrismaService.taxRate.findMany.mockResolvedValue([
        {
          ...mockTaxRate,
          exemptCategories: ['food-category'],
        },
      ]);

      const inputWithExempt: TaxCalculationInput = {
        ...mockInput,
        lineItems: [
          {
            productId: 'product-1',
            categoryId: 'food-category',
            quantity: 1,
            lineTotal: new Decimal(100),
          },
          {
            productId: 'product-2',
            categoryId: 'electronics-category',
            quantity: 1,
            lineTotal: new Decimal(50),
          },
        ],
      };

      const result = await service.calculateTax(inputWithExempt);

      expect(result.taxableSubtotal.toNumber()).toBe(50); // Only non-exempt item
    });

    it('should calculate compound taxes correctly', async () => {
      const compoundTaxRate = {
        ...mockTaxRate,
        id: 'tax-2',
        name: 'County Tax',
        rate: new Decimal(0.01), // 1%
        isCompound: true,
        priority: 1,
      };

      mockPrismaService.taxRate.findMany.mockResolvedValue([
        mockTaxRate,
        compoundTaxRate,
      ]);

      const result = await service.calculateTax(mockInput);

      // First tax: 7.25% of 100 = 7.25
      // Compound tax: 1% of (100 + 7.25) = 1.0725
      expect(result.breakdown).toHaveLength(2);
      expect(result.totalTax.toNumber()).toBeCloseTo(8.3225);
    });

    it('should use most specific tax rate', async () => {
      const stateTax = { ...mockTaxRate, zipCode: null, city: null };
      const cityTax = {
        ...mockTaxRate,
        id: 'tax-2',
        city: 'Los Angeles',
        name: 'LA City Tax',
        rate: new Decimal(0.0925),
      };

      mockPrismaService.taxRate.findMany.mockResolvedValue([stateTax, cityTax]);

      const inputWithCity: TaxCalculationInput = {
        ...mockInput,
        city: 'Los Angeles',
      };

      const result = await service.calculateTax(inputWithCity);

      // Should use city tax rate, not state
      expect(result.breakdown.some((b) => b.name === 'LA City Tax')).toBe(true);
    });

    it('should match zip code patterns', async () => {
      const zipPatternTax = {
        ...mockTaxRate,
        id: 'tax-zip',
        zipCode: '902*',
        name: 'LA Area Tax',
        rate: new Decimal(0.0975),
      };

      mockPrismaService.taxRate.findMany.mockResolvedValue([zipPatternTax]);

      const inputWithZip: TaxCalculationInput = {
        ...mockInput,
        zipCode: '90210',
      };

      const result = await service.calculateTax(inputWithZip);

      expect(result.breakdown.some((b) => b.name === 'LA Area Tax')).toBe(true);
    });
  });

  describe('getTaxRates', () => {
    it('should get all tax rates for company', async () => {
      mockPrismaService.taxRate.findMany.mockResolvedValue([mockTaxRate]);

      const result = await service.getTaxRates(mockCompanyId);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.taxRate.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId },
        orderBy: [{ country: 'asc' }, { state: 'asc' }, { priority: 'desc' }],
      });
    });

    it('should filter by country', async () => {
      mockPrismaService.taxRate.findMany.mockResolvedValue([mockTaxRate]);

      await service.getTaxRates(mockCompanyId, { country: 'US' });

      expect(mockPrismaService.taxRate.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ country: 'US' }),
        orderBy: [{ country: 'asc' }, { state: 'asc' }, { priority: 'desc' }],
      });
    });

    it('should filter by state', async () => {
      mockPrismaService.taxRate.findMany.mockResolvedValue([mockTaxRate]);

      await service.getTaxRates(mockCompanyId, { state: 'CA' });

      expect(mockPrismaService.taxRate.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ state: 'CA' }),
        orderBy: [{ country: 'asc' }, { state: 'asc' }, { priority: 'desc' }],
      });
    });

    it('should filter by active status', async () => {
      mockPrismaService.taxRate.findMany.mockResolvedValue([mockTaxRate]);

      await service.getTaxRates(mockCompanyId, { isActive: true });

      expect(mockPrismaService.taxRate.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ isActive: true }),
        orderBy: [{ country: 'asc' }, { state: 'asc' }, { priority: 'desc' }],
      });
    });
  });

  describe('getTaxRateById', () => {
    it('should get tax rate by ID', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue(mockTaxRate);

      const result = await service.getTaxRateById('tax-1', mockCompanyId);

      expect(result).toEqual(mockTaxRate);
    });

    it('should throw NotFoundException for non-existent tax rate', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue(null);

      await expect(
        service.getTaxRateById('invalid-id', mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTaxRate', () => {
    it('should update tax rate', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue(mockTaxRate);
      mockPrismaService.taxRate.update.mockResolvedValue({
        ...mockTaxRate,
        name: 'Updated Name',
      });

      const result = await service.updateTaxRate('tax-1', mockCompanyId, {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should convert rate from percentage', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue(mockTaxRate);
      mockPrismaService.taxRate.update.mockResolvedValue(mockTaxRate);

      await service.updateTaxRate('tax-1', mockCompanyId, {
        rate: 8.5, // 8.5%
      });

      expect(mockPrismaService.taxRate.update).toHaveBeenCalledWith({
        where: { id: 'tax-1' },
        data: expect.objectContaining({
          rate: new Decimal(0.085),
        }),
      });
    });

    it('should throw NotFoundException for non-existent tax rate', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTaxRate('invalid-id', mockCompanyId, { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTaxRate', () => {
    it('should delete tax rate', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue(mockTaxRate);
      mockPrismaService.taxRate.delete.mockResolvedValue({});

      await service.deleteTaxRate('tax-1', mockCompanyId);

      expect(mockPrismaService.taxRate.delete).toHaveBeenCalledWith({
        where: { id: 'tax-1' },
      });
    });

    it('should throw NotFoundException for non-existent tax rate', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteTaxRate('invalid-id', mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('seedDefaultUSTaxRates', () => {
    it('should seed default US tax rates when none exist', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue(null);
      mockPrismaService.taxRate.create.mockResolvedValue(mockTaxRate);

      await service.seedDefaultUSTaxRates(mockCompanyId);

      // Should have called findFirst and create for each state
      expect(mockPrismaService.taxRate.findFirst).toHaveBeenCalled();
      expect(mockPrismaService.taxRate.create).toHaveBeenCalled();
    });

    it('should skip existing tax rates', async () => {
      mockPrismaService.taxRate.findFirst.mockResolvedValue(mockTaxRate);

      await service.seedDefaultUSTaxRates(mockCompanyId);

      // Should have called findFirst but not create since rates exist
      expect(mockPrismaService.taxRate.findFirst).toHaveBeenCalled();
      expect(mockPrismaService.taxRate.create).not.toHaveBeenCalled();
    });
  });

  describe('getTaxSummary', () => {
    it('should return empty summary placeholder', async () => {
      const result = await service.getTaxSummary(
        mockCompanyId,
        new Date('2026-01-01'),
        new Date('2026-12-31'),
      );

      expect(result.totalTaxCollected.toNumber()).toBe(0);
      expect(result.byState).toHaveLength(0);
      expect(result.byType).toHaveLength(0);
    });
  });
});
