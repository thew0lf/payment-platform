import { Test, TestingModule } from '@nestjs/testing';
import { AffiliateReportsController } from './affiliate-reports.controller';
import { AffiliateReportsService } from '../services/affiliate-reports.service';
import { Response } from 'express';
import {
  ReportInterval,
  ReportMetric,
  ExportFormat,
  ReportType,
  ExportReportDto,
} from '../dto/affiliate-reports.dto';

describe('AffiliateReportsController', () => {
  let controller: AffiliateReportsController;
  let reportsService: jest.Mocked<AffiliateReportsService>;

  const mockUser = {
    sub: 'user-123',
    id: 'user-123',
    email: 'test@example.com',
    role: 'ADMIN',
    scopeType: 'COMPANY',
    scopeId: 'company-123',
    organizationId: 'org-123',
    clientId: 'client-123',
    companyId: 'company-123',
  };

  const mockRequest = { user: mockUser };

  const mockOverviewResponse = {
    period: {
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: '2025-01-31T23:59:59.999Z',
    },
    metrics: {
      clicks: 10000,
      uniqueClicks: 8000,
      conversions: 500,
      conversionRate: 5,
      revenue: 50000,
      commissions: 5000,
      epc: 0.5,
      averageOrderValue: 100,
    },
    comparison: {
      current: {
        clicks: 10000,
        uniqueClicks: 8000,
        conversions: 500,
        conversionRate: 5,
        revenue: 50000,
        commissions: 5000,
        epc: 0.5,
        averageOrderValue: 100,
      },
      previous: {
        clicks: 8000,
        uniqueClicks: 6400,
        conversions: 400,
        conversionRate: 5,
        revenue: 40000,
        commissions: 4000,
        epc: 0.5,
        averageOrderValue: 100,
      },
      change: {
        clicks: 2000,
        clicksPercent: 25,
        conversions: 100,
        conversionsPercent: 25,
        revenue: 10000,
        revenuePercent: 25,
        commissions: 1000,
        commissionsPercent: 25,
        conversionRateChange: 0,
        epcChange: 0,
      },
    },
    activeAffiliates: 150,
    newAffiliates: 20,
    pendingPayouts: 10,
    pendingPayoutsAmount: 2500,
  };

  const mockPerformanceResponse = {
    period: {
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: '2025-01-31T23:59:59.999Z',
    },
    data: [
      {
        partner: {
          id: 'partner-1',
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'JohnD',
          email: 'john@example.com',
          affiliateCode: 'JOHN2024',
          tier: 'GOLD',
          status: 'ACTIVE',
        },
        metrics: {
          clicks: 1000,
          uniqueClicks: 800,
          conversions: 50,
          conversionRate: 5,
          revenue: 5000,
          commissions: 500,
          epc: 0.5,
          averageOrderValue: 100,
        },
        linksCount: 5,
        topLink: {
          id: 'link-1',
          name: 'Main Campaign',
          revenue: 3000,
        },
      },
    ],
    totals: {
      clicks: 1000,
      uniqueClicks: 800,
      conversions: 50,
      conversionRate: 5,
      revenue: 5000,
      commissions: 500,
      epc: 0.5,
      averageOrderValue: 100,
    },
    total: 1,
    limit: 50,
    offset: 0,
  };

  const mockSubIdResponse = {
    period: {
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: '2025-01-31T23:59:59.999Z',
    },
    groupBy: 'subId1' as const,
    data: [
      {
        value: 'google',
        clicks: 500,
        uniqueClicks: 400,
        conversions: 25,
        conversionRate: 5,
        revenue: 2500,
        commissions: 250,
        epc: 0.5,
      },
      {
        value: 'facebook',
        clicks: 300,
        uniqueClicks: 240,
        conversions: 15,
        conversionRate: 5,
        revenue: 1500,
        commissions: 150,
        epc: 0.5,
      },
    ],
    totals: {
      clicks: 800,
      uniqueClicks: 640,
      conversions: 40,
      conversionRate: 5,
      revenue: 4000,
      commissions: 400,
      epc: 0.5,
      averageOrderValue: 100,
    },
  };

  const mockTrendsResponse = {
    period: {
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: '2025-01-07T23:59:59.999Z',
    },
    interval: ReportInterval.DAILY,
    data: [
      {
        date: '2025-01-01',
        label: '2025-01-01',
        clicks: 100,
        uniqueClicks: 80,
        conversions: 5,
        revenue: 500,
        commissions: 50,
        conversionRate: 5,
        epc: 0.5,
      },
      {
        date: '2025-01-02',
        label: '2025-01-02',
        clicks: 120,
        uniqueClicks: 96,
        conversions: 6,
        revenue: 600,
        commissions: 60,
        conversionRate: 5,
        epc: 0.5,
      },
    ],
    totals: {
      clicks: 220,
      uniqueClicks: 176,
      conversions: 11,
      conversionRate: 5,
      revenue: 1100,
      commissions: 110,
      epc: 0.5,
      averageOrderValue: 100,
    },
  };

  const mockTopAffiliatesResponse = [
    {
      rank: 1,
      partner: {
        id: 'partner-1',
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'JohnD',
        affiliateCode: 'JOHN2024',
        tier: 'GOLD',
      },
      value: 5000,
      metric: ReportMetric.REVENUE,
      clicks: 1000,
      conversions: 50,
      revenue: 5000,
      commissions: 500,
      conversionRate: 5,
    },
  ];

  const mockTopLinksResponse = [
    {
      rank: 1,
      link: {
        id: 'link-1',
        name: 'Main Campaign',
        trackingCode: 'ABC123',
        campaign: 'summer2025',
        destinationUrl: 'https://example.com',
      },
      partner: {
        id: 'partner-1',
        displayName: 'JohnD',
        affiliateCode: 'JOHN2024',
      },
      value: 3000,
      metric: ReportMetric.REVENUE,
      clicks: 600,
      conversions: 30,
      revenue: 3000,
      commissions: 300,
      conversionRate: 5,
    },
  ];

  const mockExportResponse = {
    filename: 'affiliate-report-overview-123456.csv',
    mimeType: 'text/csv',
    data: Buffer.from('clicks,conversions,revenue\n10000,500,50000'),
    rowCount: 1,
    generatedAt: '2025-01-31T12:00:00.000Z',
  };

  beforeEach(async () => {
    const mockReportsService = {
      getOverview: jest.fn().mockResolvedValue(mockOverviewResponse),
      getPerformanceByAffiliate: jest.fn().mockResolvedValue(mockPerformanceResponse),
      getPerformanceBySubId: jest.fn().mockResolvedValue(mockSubIdResponse),
      getTrends: jest.fn().mockResolvedValue(mockTrendsResponse),
      getTopAffiliates: jest.fn().mockResolvedValue(mockTopAffiliatesResponse),
      getTopLinks: jest.fn().mockResolvedValue(mockTopLinksResponse),
      exportReport: jest.fn().mockResolvedValue(mockExportResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AffiliateReportsController],
      providers: [
        {
          provide: AffiliateReportsService,
          useValue: mockReportsService,
        },
      ],
    }).compile();

    controller = module.get<AffiliateReportsController>(AffiliateReportsController);
    reportsService = module.get(AffiliateReportsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // OVERVIEW TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getOverview', () => {
    it('should return overview metrics', async () => {
      const result = await controller.getOverview(mockRequest);

      expect(result).toEqual(mockOverviewResponse);
      expect(reportsService.getOverview).toHaveBeenCalledWith(mockUser, {
        companyId: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should pass company and date filters', async () => {
      await controller.getOverview(
        mockRequest,
        'company-456',
        '2025-01-01',
        '2025-01-31',
      );

      expect(reportsService.getOverview).toHaveBeenCalledWith(mockUser, {
        companyId: 'company-456',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });
    });

    it('should include comparison with previous period', async () => {
      const result = await controller.getOverview(mockRequest);

      expect(result.comparison).toBeDefined();
      expect(result.comparison?.change.clicksPercent).toBe(25);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PERFORMANCE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getPerformance', () => {
    it('should return performance by affiliate', async () => {
      const result = await controller.getPerformance(mockRequest);

      expect(result).toEqual(mockPerformanceResponse);
      expect(reportsService.getPerformanceByAffiliate).toHaveBeenCalled();
    });

    it('should pass all filters correctly', async () => {
      await controller.getPerformance(
        mockRequest,
        'company-456',
        'partner-123',
        'link-123',
        'summer2025',
        '2025-01-01',
        '2025-01-31',
        ReportMetric.REVENUE,
        'desc',
        '25',
        '0',
      );

      expect(reportsService.getPerformanceByAffiliate).toHaveBeenCalledWith(mockUser, {
        companyId: 'company-456',
        partnerId: 'partner-123',
        linkId: 'link-123',
        campaign: 'summer2025',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        sortBy: ReportMetric.REVENUE,
        sortOrder: 'desc',
        limit: 25,
        offset: 0,
      });
    });

    it('should include top performing link for each affiliate', async () => {
      const result = await controller.getPerformance(mockRequest);

      expect(result.data[0].topLink).toBeDefined();
      expect(result.data[0].topLink?.name).toBe('Main Campaign');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SUB-ID TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getBySubId', () => {
    it('should return SubID breakdown', async () => {
      const result = await controller.getBySubId(mockRequest);

      expect(result).toEqual(mockSubIdResponse);
      expect(reportsService.getPerformanceBySubId).toHaveBeenCalled();
    });

    it('should default to subId1 grouping', async () => {
      await controller.getBySubId(mockRequest);

      expect(reportsService.getPerformanceBySubId).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ groupBy: 'subId1' }),
      );
    });

    it('should support multi-level grouping', async () => {
      await controller.getBySubId(
        mockRequest,
        undefined,
        undefined,
        'subId1',
        'subId2',
      );

      expect(reportsService.getPerformanceBySubId).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          groupBy: 'subId1',
          secondGroupBy: 'subId2',
        }),
      );
    });

    it('should calculate EPC correctly', async () => {
      const result = await controller.getBySubId(mockRequest);

      expect(result.data[0].epc).toBe(0.5); // 250 commissions / 500 clicks
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TRENDS TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getTrends', () => {
    it('should return time series data', async () => {
      const result = await controller.getTrends(mockRequest);

      expect(result).toEqual(mockTrendsResponse);
      expect(reportsService.getTrends).toHaveBeenCalled();
    });

    it('should support different intervals', async () => {
      await controller.getTrends(
        mockRequest,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ReportInterval.WEEKLY,
      );

      expect(reportsService.getTrends).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ interval: ReportInterval.WEEKLY }),
      );
    });

    it('should support period comparison', async () => {
      await controller.getTrends(
        mockRequest,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'true',
      );

      expect(reportsService.getTrends).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ comparePrevious: 'true' }),
      );
    });

    it('should filter by partner and link', async () => {
      await controller.getTrends(
        mockRequest,
        undefined,
        'partner-123',
        'link-456',
      );

      expect(reportsService.getTrends).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          partnerId: 'partner-123',
          linkId: 'link-456',
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TOP PERFORMERS TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getTopAffiliates', () => {
    it('should return top affiliates leaderboard', async () => {
      const result = await controller.getTopAffiliates(mockRequest);

      expect(result).toEqual(mockTopAffiliatesResponse);
      expect(result[0].rank).toBe(1);
    });

    it('should support different ranking metrics', async () => {
      await controller.getTopAffiliates(
        mockRequest,
        undefined,
        undefined,
        undefined,
        undefined,
        ReportMetric.CONVERSIONS,
      );

      expect(reportsService.getTopAffiliates).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ metric: ReportMetric.CONVERSIONS }),
      );
    });

    it('should respect limit parameter', async () => {
      await controller.getTopAffiliates(
        mockRequest,
        undefined,
        undefined,
        undefined,
        '5',
      );

      expect(reportsService.getTopAffiliates).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({ limit: 5 }),
      );
    });
  });

  describe('getTopLinks', () => {
    it('should return top links', async () => {
      const result = await controller.getTopLinks(mockRequest);

      expect(result).toEqual(mockTopLinksResponse);
      expect(result[0].rank).toBe(1);
    });

    it('should include partner info for each link', async () => {
      const result = await controller.getTopLinks(mockRequest);

      expect(result[0].partner).toBeDefined();
      expect(result[0].partner.affiliateCode).toBe('JOHN2024');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EXPORT TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('exportReport', () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };
    });

    it('should export CSV report', async () => {
      const dto: ExportReportDto = {
        reportType: ReportType.OVERVIEW,
        format: ExportFormat.CSV,
      };

      await controller.exportReport(mockRequest, dto, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.csv'),
      );
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should set row count header', async () => {
      const dto: ExportReportDto = {
        reportType: ReportType.OVERVIEW,
        format: ExportFormat.CSV,
      };

      await controller.exportReport(mockRequest, dto, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Row-Count', '1');
    });

    it('should export with date range filter', async () => {
      const dto: ExportReportDto = {
        reportType: ReportType.PERFORMANCE,
        format: ExportFormat.EXCEL,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      await controller.exportReport(mockRequest, dto, mockResponse as Response);

      expect(reportsService.exportReport).toHaveBeenCalledWith(mockUser, dto);
    });

    it('should support all export formats', async () => {
      for (const format of [ExportFormat.CSV, ExportFormat.EXCEL, ExportFormat.PDF]) {
        const dto: ExportReportDto = {
          reportType: ReportType.OVERVIEW,
          format,
        };

        await controller.exportReport(mockRequest, dto, mockResponse as Response);

        expect(reportsService.exportReport).toHaveBeenCalledWith(
          mockUser,
          expect.objectContaining({ format }),
        );
      }
    });

    it('should support all report types', async () => {
      for (const reportType of Object.values(ReportType)) {
        const dto: ExportReportDto = {
          reportType,
          format: ExportFormat.CSV,
        };

        await controller.exportReport(mockRequest, dto, mockResponse as Response);

        expect(reportsService.exportReport).toHaveBeenCalledWith(
          mockUser,
          expect.objectContaining({ reportType }),
        );
      }
    });
  });

  describe('exportPreview', () => {
    it('should return export metadata without file', async () => {
      const dto: ExportReportDto = {
        reportType: ReportType.OVERVIEW,
        format: ExportFormat.CSV,
      };

      const result = await controller.exportPreview(mockRequest, dto);

      expect(result.filename).toBeDefined();
      expect(result.mimeType).toBe('text/csv');
      expect(result.rowCount).toBe(1);
      expect(result.generatedAt).toBeDefined();
    });

    it('should include preview for small files', async () => {
      const dto: ExportReportDto = {
        reportType: ReportType.OVERVIEW,
        format: ExportFormat.CSV,
      };

      const result = await controller.exportPreview(mockRequest, dto);

      expect(result.preview).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle empty date range', async () => {
      await controller.getOverview(mockRequest);

      expect(reportsService.getOverview).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          startDate: undefined,
          endDate: undefined,
        }),
      );
    });

    it('should handle zero values in metrics', async () => {
      reportsService.getOverview.mockResolvedValueOnce({
        ...mockOverviewResponse,
        metrics: {
          clicks: 0,
          uniqueClicks: 0,
          conversions: 0,
          conversionRate: 0,
          revenue: 0,
          commissions: 0,
          epc: 0,
          averageOrderValue: 0,
        },
      });

      const result = await controller.getOverview(mockRequest);

      expect(result.metrics.clicks).toBe(0);
      expect(result.metrics.conversionRate).toBe(0);
    });

    it('should parse string limit to number', async () => {
      await controller.getPerformance(
        mockRequest,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '25',
        '50',
      );

      expect(reportsService.getPerformanceByAffiliate).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          limit: 25,
          offset: 50,
        }),
      );
    });

    it('should handle undefined optional parameters', async () => {
      await controller.getBySubId(mockRequest);

      expect(reportsService.getPerformanceBySubId).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          companyId: undefined,
          partnerId: undefined,
          secondGroupBy: undefined,
        }),
      );
    });
  });
});
