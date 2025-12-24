import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UpsellService } from '../../src/momentum-intelligence/upsell/upsell.service';
import { AnthropicService } from '../../src/integrations/services/providers/anthropic.service';
import { UpsellType } from '../../src/momentum-intelligence/types/momentum.types';

describe('UpsellService', () => {
  let service: UpsellService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockCompanyWithPricing = {
    id: 'company-1',
    settings: {
      upsellPricing: {
        [UpsellType.SHIPPING_PROTECTION]: 9.99,
        [UpsellType.TIER_UPGRADE]: 49.99,
        [UpsellType.ADD_ON]: 19.99,
      },
    },
  };

  const mockCompanyWithoutPricing = {
    id: 'company-2',
    settings: {
      someOtherSetting: true,
    },
  };

  const mockCompanyNullSettings = {
    id: 'company-3',
    settings: null,
  };

  beforeEach(async () => {
    const mockPrisma = {
      company: {
        findUnique: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      order: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      miCustomerProfile: {
        findUnique: jest.fn(),
      },
      upsellOffer: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      upsellInteraction: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
    };

    const mockAnthropicService = {
      generateMessage: jest.fn().mockResolvedValue('Mock AI response'),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpsellService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AnthropicService, useValue: mockAnthropicService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<UpsellService>(UpsellService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    // Clear the pricing cache between tests
    (service as any).pricingCache.clear();
  });

  describe('getCompanyUpsellPricing', () => {
    it('should return company-specific pricing when configured', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompanyWithPricing);

      // Access private method through any cast
      const pricing = await (service as any).getCompanyUpsellPricing('company-1');

      expect(pricing[UpsellType.SHIPPING_PROTECTION]).toBe(9.99);
      expect(pricing[UpsellType.TIER_UPGRADE]).toBe(49.99);
      expect(pricing[UpsellType.ADD_ON]).toBe(19.99);
      // Default values for unconfigured types
      expect(pricing[UpsellType.FREQUENCY_UPGRADE]).toBe(29.95);
      expect(pricing[UpsellType.GIFT_SUBSCRIPTION]).toBe(99.95);
      expect(pricing[UpsellType.ANNUAL_PLAN]).toBe(299.95);
    });

    it('should return default pricing when company has no upsell pricing configured', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompanyWithoutPricing);

      const pricing = await (service as any).getCompanyUpsellPricing('company-2');

      // All should be default values
      expect(pricing[UpsellType.SHIPPING_PROTECTION]).toBe(6.95);
      expect(pricing[UpsellType.TIER_UPGRADE]).toBe(39.95);
      expect(pricing[UpsellType.FREQUENCY_UPGRADE]).toBe(29.95);
      expect(pricing[UpsellType.ADD_ON]).toBe(14.95);
      expect(pricing[UpsellType.GIFT_SUBSCRIPTION]).toBe(99.95);
      expect(pricing[UpsellType.ANNUAL_PLAN]).toBe(299.95);
    });

    it('should return default pricing when company settings is null', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompanyNullSettings);

      const pricing = await (service as any).getCompanyUpsellPricing('company-3');

      expect(pricing[UpsellType.SHIPPING_PROTECTION]).toBe(6.95);
      expect(pricing[UpsellType.ADD_ON]).toBe(14.95);
    });

    it('should return default pricing when company is not found', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(null);

      const pricing = await (service as any).getCompanyUpsellPricing('nonexistent');

      expect(pricing[UpsellType.SHIPPING_PROTECTION]).toBe(6.95);
      expect(pricing[UpsellType.TIER_UPGRADE]).toBe(39.95);
    });

    it('should cache pricing for subsequent calls', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompanyWithPricing);

      // First call
      await (service as any).getCompanyUpsellPricing('company-1');

      // Second call should use cache
      await (service as any).getCompanyUpsellPricing('company-1');

      // Should only be called once due to caching
      expect(prismaService.company.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after TTL expires', async () => {
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(mockCompanyWithPricing);

      // First call
      await (service as any).getCompanyUpsellPricing('company-1');

      // Manually expire the cache
      const cache = (service as any).pricingCache.get('company-1');
      cache.expiry = Date.now() - 1000;

      // Second call should refresh from database
      await (service as any).getCompanyUpsellPricing('company-1');

      expect(prismaService.company.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should return default pricing when database query fails', async () => {
      (prismaService.company.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const pricing = await (service as any).getCompanyUpsellPricing('company-1');

      // Should return defaults on error
      expect(pricing[UpsellType.SHIPPING_PROTECTION]).toBe(6.95);
      expect(pricing[UpsellType.TIER_UPGRADE]).toBe(39.95);
    });

    it('should handle partial pricing configuration', async () => {
      const partialPricingCompany = {
        id: 'company-partial',
        settings: {
          upsellPricing: {
            [UpsellType.SHIPPING_PROTECTION]: 12.99,
            // Other types not configured
          },
        },
      };
      (prismaService.company.findUnique as jest.Mock).mockResolvedValue(partialPricingCompany);

      const pricing = await (service as any).getCompanyUpsellPricing('company-partial');

      // Custom price for configured type
      expect(pricing[UpsellType.SHIPPING_PROTECTION]).toBe(12.99);
      // Defaults for unconfigured types
      expect(pricing[UpsellType.TIER_UPGRADE]).toBe(39.95);
      expect(pricing[UpsellType.ADD_ON]).toBe(14.95);
    });

    it('should maintain separate caches for different companies', async () => {
      const company1 = {
        id: 'company-1',
        settings: { upsellPricing: { [UpsellType.SHIPPING_PROTECTION]: 5.99 } },
      };
      const company2 = {
        id: 'company-2',
        settings: { upsellPricing: { [UpsellType.SHIPPING_PROTECTION]: 8.99 } },
      };

      (prismaService.company.findUnique as jest.Mock)
        .mockResolvedValueOnce(company1)
        .mockResolvedValueOnce(company2);

      const pricing1 = await (service as any).getCompanyUpsellPricing('company-1');
      const pricing2 = await (service as any).getCompanyUpsellPricing('company-2');

      expect(pricing1[UpsellType.SHIPPING_PROTECTION]).toBe(5.99);
      expect(pricing2[UpsellType.SHIPPING_PROTECTION]).toBe(8.99);
    });
  });
});
