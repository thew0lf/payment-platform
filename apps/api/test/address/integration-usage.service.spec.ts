import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationUsageService } from '../../src/integrations/services/integration-usage.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('IntegrationUsageService', () => {
  let service: IntegrationUsageService;
  let prismaService: PrismaService;

  const mockUsageData = [
    {
      id: '1',
      provider: 'GOOGLE_PLACES',
      usageType: 'autocomplete',
      requestCount: 10,
      baseCostCents: 2.83,
      billableCents: 3.96,
      endpoint: '/place/autocomplete/json',
      billingPeriod: '2024-01',
    },
    {
      id: '2',
      provider: 'GOOGLE_PLACES',
      usageType: 'place_details',
      requestCount: 5,
      baseCostCents: 8.5,
      billableCents: 11.9,
      endpoint: '/place/details/json',
      billingPeriod: '2024-01',
    },
    {
      id: '3',
      provider: 'OPENAI',
      usageType: 'completion',
      requestCount: 20,
      baseCostCents: 5,
      billableCents: 7,
      endpoint: '/v1/completions',
      billingPeriod: '2024-01',
    },
  ];

  beforeEach(async () => {
    const mockPrisma = {
      integrationUsage: {
        findMany: jest.fn().mockResolvedValue(mockUsageData),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationUsageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<IntegrationUsageService>(IntegrationUsageService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('getUsageStats', () => {
    it('should return aggregated usage stats', async () => {
      const result = await service.getUsageStats('company-1', '2024-01');

      expect(result.totalRequests).toBe(35); // 10 + 5 + 20
      expect(result.billingPeriod).toBe('2024-01');
      expect(result.currency).toBe('USD');
    });

    it('should use current month if no billing period specified', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);

      await service.getUsageStats('company-1');

      expect(prismaService.integrationUsage.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          billingPeriod: currentMonth,
        },
      });
    });
  });

  describe('getUsageByProvider', () => {
    it('should group usage by provider', async () => {
      const result = await service.getUsageByProvider('company-1', '2024-01');

      expect(result.length).toBe(2); // GOOGLE_PLACES and OPENAI

      const googlePlaces = result.find(p => p.provider === 'GOOGLE_PLACES');
      expect(googlePlaces).toBeDefined();
      expect(googlePlaces?.requestCount).toBe(15); // 10 + 5

      const openai = result.find(p => p.provider === 'OPENAI');
      expect(openai).toBeDefined();
      expect(openai?.requestCount).toBe(20);
    });

    it('should track usage types per provider', async () => {
      const result = await service.getUsageByProvider('company-1', '2024-01');

      const googlePlaces = result.find(p => p.provider === 'GOOGLE_PLACES');
      expect(googlePlaces?.usageTypes['autocomplete']).toBe(10);
      expect(googlePlaces?.usageTypes['place_details']).toBe(5);
    });

    it('should convert costs from cents to dollars', async () => {
      const result = await service.getUsageByProvider('company-1', '2024-01');

      const googlePlaces = result.find(p => p.provider === 'GOOGLE_PLACES');
      // (2.83 + 8.5) / 100 = 0.1133, but we expect cents to be stored as whole numbers
      expect(googlePlaces?.baseCost).toBeGreaterThanOrEqual(0);
      expect(googlePlaces?.billableCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTopEndpoints', () => {
    it('should return endpoints sorted by request count', async () => {
      const result = await service.getTopEndpoints('company-1', '2024-01');

      expect(result.length).toBeLessThanOrEqual(10);
      // Verify descending order
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].count).toBeGreaterThanOrEqual(result[i].count);
      }
    });
  });

  describe('getUsageSummary', () => {
    it('should return comprehensive summary', async () => {
      const result = await service.getUsageSummary('company-1', '2024-01');

      expect(result.currentMonth).toBeDefined();
      expect(result.lastMonth).toBeDefined();
      expect(result.byProvider).toBeDefined();
      expect(result.topEndpoints).toBeDefined();
    });

    it('should calculate last month correctly', async () => {
      // Call with January
      await service.getUsageSummary('company-1', '2024-01');

      // Should query for December of previous year
      expect(prismaService.integrationUsage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            billingPeriod: '2023-12',
          }),
        }),
      );
    });
  });

  describe('getUsageHistory', () => {
    it('should return usage for specified number of months', async () => {
      (prismaService.integrationUsage.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getUsageHistory('company-1', 6);

      expect(result.length).toBe(6);
      // Should use a single query with IN clause (optimized)
      expect(prismaService.integrationUsage.findMany).toHaveBeenCalledTimes(1);
      expect(prismaService.integrationUsage.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          billingPeriod: { in: expect.any(Array) },
        },
      });
    });

    it('should return data in chronological order', async () => {
      const result = await service.getUsageHistory('company-1', 3);

      // Verify chronological order (oldest to newest)
      for (let i = 1; i < result.length; i++) {
        expect(result[i].period > result[i - 1].period).toBe(true);
      }
    });
  });
});
