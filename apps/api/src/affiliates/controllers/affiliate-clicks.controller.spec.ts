/**
 * Affiliate Clicks Controller Unit Tests
 *
 * Tests for the affiliate click tracking API endpoints.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AffiliateClicksController } from './affiliate-clicks.controller';
import { AffiliateClicksService, ClickStatsDto, SubIdBreakdownDto } from '../services/affiliate-clicks.service';
import { NotFoundException } from '@nestjs/common';
import { ClickStatus } from '@prisma/client';

describe('AffiliateClicksController', () => {
  let controller: AffiliateClicksController;
  let clicksService: jest.Mocked<AffiliateClicksService>;

  const mockUser = {
    sub: 'user-123',
    scopeType: 'ORGANIZATION',
    scopeId: 'org-123',
  };

  const mockClick = {
    id: 'click-123',
    partnerId: 'partner-123',
    linkId: 'link-123',
    companyId: 'company-123',
    clickedAt: new Date('2024-01-15T10:00:00Z'),
    ipAddressHash: 'hash123',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    referrer: 'https://google.com',
    deviceType: 'desktop',
    browser: 'Chrome',
    os: 'Windows',
    country: 'US',
    region: 'CA',
    city: 'San Francisco',
    subId1: 'campaign-1',
    subId2: 'source-1',
    subId3: null,
    subId4: null,
    subId5: null,
    status: ClickStatus.VALID,
    fraudScore: 0,
    fraudReasons: [],
    isUnique: true,
    visitorId: 'visitor-abc123',
    sessionId: null,
    idempotencyKey: 'idem-123',
    partner: {
      id: 'partner-123',
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'JohnDoe',
      affiliateCode: 'JOHN2024',
    },
    link: {
      id: 'link-123',
      name: 'Test Campaign Link',
      trackingCode: 'ABC123',
      shortCode: 'abc123',
      campaign: 'summer-sale',
    },
  } as any;

  const mockClicksList = {
    clicks: [mockClick],
    total: 1,
    limit: 50,
    offset: 0,
    hasMore: false,
  };

  const mockStats: ClickStatsDto = {
    totalClicks: 1000,
    uniqueClicks: 800,
    duplicateClicks: 100,
    suspiciousClicks: 50,
    invalidClicks: 50,
    conversionRate: 2.5,
    byDevice: { desktop: 600, mobile: 350, tablet: 50 },
    byBrowser: { Chrome: 500, Firefox: 200, Safari: 200, Edge: 100 },
    byCountry: { US: 400, UK: 200, CA: 150, DE: 100, FR: 150 },
    topLinks: [
      { linkId: 'link-1', linkName: 'Summer Sale', clicks: 300, uniqueClicks: 250 },
      { linkId: 'link-2', linkName: 'Black Friday', clicks: 200, uniqueClicks: 180 },
    ],
  };

  const mockSubIdBreakdown: SubIdBreakdownDto = {
    subIdField: 'subId1',
    data: [
      {
        value: 'campaign-1',
        clicks: 500,
        uniqueClicks: 400,
        conversions: 15,
        revenue: 1500,
        conversionRate: 3.0,
      },
      {
        value: 'campaign-2',
        clicks: 300,
        uniqueClicks: 250,
        conversions: 8,
        revenue: 800,
        conversionRate: 2.67,
      },
    ],
    total: 2,
  };

  beforeEach(async () => {
    const mockClicksService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      getStats: jest.fn(),
      getStatsBySubId: jest.fn(),
      recordClick: jest.fn(),
      isDuplicateClick: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AffiliateClicksController],
      providers: [
        { provide: AffiliateClicksService, useValue: mockClicksService },
      ],
    }).compile();

    controller = module.get<AffiliateClicksController>(AffiliateClicksController);
    clicksService = module.get(AffiliateClicksService);
  });

  describe('listClicks', () => {
    it('should return paginated clicks', async () => {
      clicksService.findAll.mockResolvedValue(mockClicksList);

      const result = await controller.listClicks(
        { user: mockUser },
        { limit: '50', offset: '0' },
      );

      expect(result).toEqual(mockClicksList);
      expect(clicksService.findAll).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          limit: 50,
          offset: 0,
        }),
      );
    });

    it('should filter by partnerId', async () => {
      clicksService.findAll.mockResolvedValue(mockClicksList);

      await controller.listClicks(
        { user: mockUser },
        { partnerId: 'partner-123' },
      );

      expect(clicksService.findAll).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          partnerId: 'partner-123',
        }),
      );
    });

    it('should filter by linkId', async () => {
      clicksService.findAll.mockResolvedValue(mockClicksList);

      await controller.listClicks(
        { user: mockUser },
        { linkId: 'link-123' },
      );

      expect(clicksService.findAll).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          linkId: 'link-123',
        }),
      );
    });

    it('should filter by status', async () => {
      clicksService.findAll.mockResolvedValue(mockClicksList);

      await controller.listClicks(
        { user: mockUser },
        { status: 'VALID' },
      );

      expect(clicksService.findAll).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          status: 'VALID',
        }),
      );
    });

    it('should filter by SubIDs (t1-t5)', async () => {
      clicksService.findAll.mockResolvedValue(mockClicksList);

      await controller.listClicks(
        { user: mockUser },
        { t1: 'campaign-1', t2: 'source-1' },
      );

      expect(clicksService.findAll).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          t1: 'campaign-1',
          t2: 'source-1',
        }),
      );
    });

    it('should filter by date range', async () => {
      clicksService.findAll.mockResolvedValue(mockClicksList);

      await controller.listClicks(
        { user: mockUser },
        { startDate: '2024-01-01', endDate: '2024-01-31' },
      );

      expect(clicksService.findAll).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        }),
      );
    });

    it('should apply sorting options', async () => {
      clicksService.findAll.mockResolvedValue(mockClicksList);

      await controller.listClicks(
        { user: mockUser },
        { sortBy: 'fraudScore', sortOrder: 'desc' },
      );

      expect(clicksService.findAll).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          sortBy: 'fraudScore',
          sortOrder: 'desc',
        }),
      );
    });

    it('should filter by companyId', async () => {
      clicksService.findAll.mockResolvedValue(mockClicksList);

      await controller.listClicks(
        { user: mockUser },
        { companyId: 'company-123' },
      );

      expect(clicksService.findAll).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          companyId: 'company-123',
        }),
      );
    });

    it('should handle empty results', async () => {
      const emptyResult = {
        clicks: [],
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false,
      };
      clicksService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.listClicks(
        { user: mockUser },
        {},
      );

      expect(result.clicks).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getClick', () => {
    it('should return click by ID', async () => {
      clicksService.findById.mockResolvedValue(mockClick);

      const result = await controller.getClick(
        { user: mockUser },
        'click-123',
      );

      expect(result).toEqual(mockClick);
      expect(clicksService.findById).toHaveBeenCalledWith(mockUser, 'click-123');
    });

    it('should throw NotFoundException if click not found', async () => {
      clicksService.findById.mockRejectedValue(new NotFoundException('Click not found'));

      await expect(
        controller.getClick({ user: mockUser }, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include partner and link details', async () => {
      const clickWithDetails = {
        ...mockClick,
        partner: {
          id: 'partner-123',
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'JohnDoe',
          email: 'john@example.com',
          affiliateCode: 'JOHN2024',
          status: 'ACTIVE',
        },
        link: {
          id: 'link-123',
          name: 'Test Link',
          trackingCode: 'ABC123',
          shortCode: 'abc123',
          destinationUrl: 'https://example.com/product',
          campaign: 'summer-sale',
          source: 'facebook',
          medium: 'social',
        },
        company: {
          id: 'company-123',
          name: 'Test Company',
        },
      } as any;
      clicksService.findById.mockResolvedValue(clickWithDetails);

      const result = await controller.getClick(
        { user: mockUser },
        'click-123',
      );

      expect(result.partner).toBeDefined();
      expect(result.link).toBeDefined();
      expect(result.company).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return aggregated click statistics', async () => {
      clicksService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(
        { user: mockUser },
        {},
      );

      expect(result).toEqual(mockStats);
      expect(result.totalClicks).toBe(1000);
      expect(result.uniqueClicks).toBe(800);
      expect(result.conversionRate).toBe(2.5);
    });

    it('should filter stats by companyId', async () => {
      clicksService.getStats.mockResolvedValue(mockStats);

      await controller.getStats(
        { user: mockUser },
        { companyId: 'company-123' },
      );

      expect(clicksService.getStats).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          companyId: 'company-123',
        }),
      );
    });

    it('should filter stats by partnerId', async () => {
      clicksService.getStats.mockResolvedValue(mockStats);

      await controller.getStats(
        { user: mockUser },
        { partnerId: 'partner-123' },
      );

      expect(clicksService.getStats).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          partnerId: 'partner-123',
        }),
      );
    });

    it('should filter stats by linkId', async () => {
      clicksService.getStats.mockResolvedValue(mockStats);

      await controller.getStats(
        { user: mockUser },
        { linkId: 'link-123' },
      );

      expect(clicksService.getStats).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          linkId: 'link-123',
        }),
      );
    });

    it('should filter stats by date range', async () => {
      clicksService.getStats.mockResolvedValue(mockStats);

      await controller.getStats(
        { user: mockUser },
        { startDate: '2024-01-01', endDate: '2024-01-31' },
      );

      expect(clicksService.getStats).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        }),
      );
    });

    it('should include device breakdown', async () => {
      clicksService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(
        { user: mockUser },
        {},
      );

      expect(result.byDevice).toEqual({
        desktop: 600,
        mobile: 350,
        tablet: 50,
      });
    });

    it('should include browser breakdown', async () => {
      clicksService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(
        { user: mockUser },
        {},
      );

      expect(result.byBrowser).toBeDefined();
      expect(result.byBrowser.Chrome).toBe(500);
    });

    it('should include country breakdown', async () => {
      clicksService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(
        { user: mockUser },
        {},
      );

      expect(result.byCountry).toBeDefined();
      expect(result.byCountry.US).toBe(400);
    });

    it('should include top links', async () => {
      clicksService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(
        { user: mockUser },
        {},
      );

      expect(result.topLinks).toHaveLength(2);
      expect(result.topLinks[0].linkName).toBe('Summer Sale');
    });
  });

  describe('getSubIdBreakdown', () => {
    it('should return SubID breakdown with default groupBy', async () => {
      clicksService.getStatsBySubId.mockResolvedValue(mockSubIdBreakdown);

      const result = await controller.getSubIdBreakdown(
        { user: mockUser },
        {},
      );

      expect(result).toEqual(mockSubIdBreakdown);
      expect(clicksService.getStatsBySubId).toHaveBeenCalledWith(
        mockUser,
        expect.any(Object),
        'subId1',
      );
    });

    it('should group by specified SubID field', async () => {
      const subId2Breakdown: SubIdBreakdownDto = {
        ...mockSubIdBreakdown,
        subIdField: 'subId2',
      };
      clicksService.getStatsBySubId.mockResolvedValue(subId2Breakdown);

      const result = await controller.getSubIdBreakdown(
        { user: mockUser },
        { groupBy: 'subId2' },
      );

      expect(result.subIdField).toBe('subId2');
      expect(clicksService.getStatsBySubId).toHaveBeenCalledWith(
        mockUser,
        expect.any(Object),
        'subId2',
      );
    });

    it('should group by subId3', async () => {
      clicksService.getStatsBySubId.mockResolvedValue({
        ...mockSubIdBreakdown,
        subIdField: 'subId3',
      });

      await controller.getSubIdBreakdown(
        { user: mockUser },
        { groupBy: 'subId3' },
      );

      expect(clicksService.getStatsBySubId).toHaveBeenCalledWith(
        mockUser,
        expect.any(Object),
        'subId3',
      );
    });

    it('should group by subId4', async () => {
      clicksService.getStatsBySubId.mockResolvedValue({
        ...mockSubIdBreakdown,
        subIdField: 'subId4',
      });

      await controller.getSubIdBreakdown(
        { user: mockUser },
        { groupBy: 'subId4' },
      );

      expect(clicksService.getStatsBySubId).toHaveBeenCalledWith(
        mockUser,
        expect.any(Object),
        'subId4',
      );
    });

    it('should group by subId5', async () => {
      clicksService.getStatsBySubId.mockResolvedValue({
        ...mockSubIdBreakdown,
        subIdField: 'subId5',
      });

      await controller.getSubIdBreakdown(
        { user: mockUser },
        { groupBy: 'subId5' },
      );

      expect(clicksService.getStatsBySubId).toHaveBeenCalledWith(
        mockUser,
        expect.any(Object),
        'subId5',
      );
    });

    it('should filter by companyId', async () => {
      clicksService.getStatsBySubId.mockResolvedValue(mockSubIdBreakdown);

      await controller.getSubIdBreakdown(
        { user: mockUser },
        { companyId: 'company-123' },
      );

      expect(clicksService.getStatsBySubId).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          companyId: 'company-123',
        }),
        'subId1',
      );
    });

    it('should filter by partnerId', async () => {
      clicksService.getStatsBySubId.mockResolvedValue(mockSubIdBreakdown);

      await controller.getSubIdBreakdown(
        { user: mockUser },
        { partnerId: 'partner-123' },
      );

      expect(clicksService.getStatsBySubId).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          partnerId: 'partner-123',
        }),
        'subId1',
      );
    });

    it('should filter by linkId', async () => {
      clicksService.getStatsBySubId.mockResolvedValue(mockSubIdBreakdown);

      await controller.getSubIdBreakdown(
        { user: mockUser },
        { linkId: 'link-123' },
      );

      expect(clicksService.getStatsBySubId).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          linkId: 'link-123',
        }),
        'subId1',
      );
    });

    it('should filter by date range', async () => {
      clicksService.getStatsBySubId.mockResolvedValue(mockSubIdBreakdown);

      await controller.getSubIdBreakdown(
        { user: mockUser },
        { startDate: '2024-01-01', endDate: '2024-01-31' },
      );

      expect(clicksService.getStatsBySubId).toHaveBeenCalledWith(
        mockUser,
        expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        }),
        'subId1',
      );
    });

    it('should include clicks, conversions, and revenue in breakdown', async () => {
      clicksService.getStatsBySubId.mockResolvedValue(mockSubIdBreakdown);

      const result = await controller.getSubIdBreakdown(
        { user: mockUser },
        {},
      );

      expect(result.data[0]).toHaveProperty('clicks');
      expect(result.data[0]).toHaveProperty('uniqueClicks');
      expect(result.data[0]).toHaveProperty('conversions');
      expect(result.data[0]).toHaveProperty('revenue');
      expect(result.data[0]).toHaveProperty('conversionRate');
    });

    it('should handle empty breakdown results', async () => {
      const emptyBreakdown: SubIdBreakdownDto = {
        subIdField: 'subId1',
        data: [],
        total: 0,
      };
      clicksService.getStatsBySubId.mockResolvedValue(emptyBreakdown);

      const result = await controller.getSubIdBreakdown(
        { user: mockUser },
        {},
      );

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should propagate service errors', async () => {
      clicksService.findAll.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.listClicks({ user: mockUser }, {}),
      ).rejects.toThrow('Database error');
    });

    it('should handle invalid query parameters gracefully', async () => {
      clicksService.findAll.mockResolvedValue(mockClicksList);

      // Controller should handle parsing, invalid values become undefined
      const result = await controller.listClicks(
        { user: mockUser },
        { limit: 'invalid', offset: 'invalid' },
      );

      // NaN values from parseInt will be handled by service
      expect(result).toBeDefined();
    });
  });

  describe('access control', () => {
    it('should pass user context to service for scope filtering', async () => {
      clicksService.findAll.mockResolvedValue(mockClicksList);

      await controller.listClicks(
        { user: mockUser },
        {},
      );

      expect(clicksService.findAll).toHaveBeenCalledWith(
        mockUser,
        expect.any(Object),
      );
    });

    it('should work with CLIENT scope user', async () => {
      const clientUser = {
        sub: 'user-456',
        scopeType: 'CLIENT',
        scopeId: 'client-123',
      };
      clicksService.findAll.mockResolvedValue(mockClicksList);

      await controller.listClicks(
        { user: clientUser },
        {},
      );

      expect(clicksService.findAll).toHaveBeenCalledWith(
        clientUser,
        expect.any(Object),
      );
    });

    it('should work with COMPANY scope user', async () => {
      const companyUser = {
        sub: 'user-789',
        scopeType: 'COMPANY',
        scopeId: 'company-123',
      };
      clicksService.findAll.mockResolvedValue(mockClicksList);

      await controller.listClicks(
        { user: companyUser },
        {},
      );

      expect(clicksService.findAll).toHaveBeenCalledWith(
        companyUser,
        expect.any(Object),
      );
    });
  });
});
