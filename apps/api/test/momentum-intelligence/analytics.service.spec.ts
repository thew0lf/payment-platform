import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AnalyticsService } from '../../src/momentum-intelligence/analytics/analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockCompanyId = 'company-test-1';
  const mockStartDate = new Date('2024-01-01');
  const mockEndDate = new Date('2024-01-31');

  beforeEach(async () => {
    const mockPrisma = {
      saveAttempt: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      customerIntent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      subscription: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      deliveryMessage: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      upsellOffer: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      voiceCall: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      aiGeneratedContent: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      company: {
        findUnique: jest.fn().mockResolvedValue({ id: mockCompanyId, settings: {} }),
      },
      miReportConfig: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prismaService = module.get(PrismaService);
  });

  describe('getDashboardOverview', () => {
    it('should return dashboard overview with default values when no data exists', async () => {
      const result = await service.getDashboardOverview({
        companyId: mockCompanyId,
        startDate: mockStartDate,
        endDate: mockEndDate,
      });

      expect(result).toBeDefined();
      expect(result.companyId).toBe(mockCompanyId);
      expect(result.kpis).toBeDefined();
    });

    it('should calculate KPIs with save attempts data', async () => {
      const mockSaveAttempts = [
        { id: '1', outcome: 'SAVED_FULL', revenuePreserved: 100, createdAt: new Date() },
        { id: '2', outcome: 'SAVED_PARTIAL', revenuePreserved: 50, createdAt: new Date() },
        { id: '3', outcome: 'CANCELLED', revenuePreserved: 0, createdAt: new Date() },
      ];

      ((prismaService as any).saveAttempt.findMany as jest.Mock)
        .mockResolvedValueOnce(mockSaveAttempts)
        .mockResolvedValueOnce([]);

      const result = await service.getDashboardOverview({
        companyId: mockCompanyId,
        startDate: mockStartDate,
        endDate: mockEndDate,
      });

      expect(result).toBeDefined();
      expect(result.kpis).toBeDefined();
      expect(result.companyId).toBe(mockCompanyId);
    });
  });

  describe('getRealTimeMetrics', () => {
    it('should return real-time metrics', async () => {
      ((prismaService as any).saveAttempt.count as jest.Mock).mockResolvedValue(5);
      ((prismaService as any).deliveryMessage.count as jest.Mock).mockResolvedValue(10);
      ((prismaService as any).voiceCall.count as jest.Mock).mockResolvedValue(2);
      ((prismaService as any).subscription.count as jest.Mock).mockResolvedValue(3);

      const result = await service.getRealTimeMetrics(mockCompanyId);

      expect(result).toBeDefined();
      expect(result.companyId).toBe(mockCompanyId);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('error handling helpers', () => {
    it('extractSettledValues should return defaults for rejected promises', async () => {
      const mockResults: PromiseSettledResult<any>[] = [
        { status: 'fulfilled', value: [1, 2, 3] },
        { status: 'rejected', reason: new Error('Test error') },
        { status: 'fulfilled', value: 'success' },
      ];

      const result = (service as any).extractSettledValues(
        mockResults,
        [[], [], 'default'],
        'testContext',
      );

      expect(result[0]).toEqual([1, 2, 3]);
      expect(result[1]).toEqual([]);
      expect(result[2]).toBe('success');
    });

    it('safeAnalyticsCall should catch errors and return defaults', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Test failure'));
      const defaultValue = { test: 'default' };

      const result = await (service as any).safeAnalyticsCall(
        'testMethod',
        failingOperation,
        defaultValue,
      );

      expect(result).toEqual(defaultValue);
      expect(failingOperation).toHaveBeenCalled();
    });
  });
});
