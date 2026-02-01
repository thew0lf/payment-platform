/**
 * Affiliate Tracking Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AffiliateTrackingService } from '../services/affiliate-tracking.service';
import { AffiliateLinksService } from '../services/affiliate-links.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { ClickQueueService } from '../services/click-queue.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AffiliateTrackingService', () => {
  let service: AffiliateTrackingService;
  let prismaService: any;
  let hierarchyService: jest.Mocked<HierarchyService>;
  let auditLogsService: jest.Mocked<AuditLogsService>;
  let clickQueueService: jest.Mocked<ClickQueueService>;
  let idempotencyService: jest.Mocked<IdempotencyService>;
  let linksService: jest.Mocked<AffiliateLinksService>;

  const mockUser: UserContext = {
    sub: 'user-123',
    scopeType: 'ORGANIZATION',
    scopeId: 'org-123',
  };

  const mockLink = {
    id: 'link-123',
    partnerId: 'partner-123',
    companyId: 'company-123',
    name: 'Test Link',
    destinationUrl: 'https://example.com/product',
    trackingCode: 'ABC123DEF456',
    shortCode: 'abc123',
    isActive: true,
    totalClicks: 100,
    uniqueClicks: 80,
    totalConversions: 10,
    cookieDurationDays: 30,
    deletedAt: null,
    partner: {
      id: 'partner-123',
      companyId: 'company-123',
      status: 'ACTIVE',
      affiliateCode: 'JOHN2024',
      commissionRate: 10,
      commissionFlat: null,
      cookieDurationDays: 30,
      deletedAt: null,
    },
    company: {
      id: 'company-123',
      affiliateProgramConfig: {
        defaultCommissionRate: 10,
        attributionWindowDays: 30,
        lastClickAttribution: true,
        holdPeriodDays: 30,
        fraudScoreThreshold: 70,
      },
    },
  };

  const mockClick = {
    id: 'click-123',
    partnerId: 'partner-123',
    linkId: 'link-123',
    companyId: 'company-123',
    idempotencyKey: 'idem-123',
    clickedAt: new Date(),
    ipAddress: '127.0.0.1',
    ipAddressHash: 'hash123',
    userAgent: 'Mozilla/5.0',
    deviceType: 'desktop',
    browser: 'Chrome',
    os: 'Windows',
    country: 'US',
    isUnique: true,
    fraudScore: 0,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    partner: {
      id: 'partner-123',
      companyId: 'company-123',
      status: 'ACTIVE',
      affiliateCode: 'JOHN2024',
      commissionRate: 10,
      commissionFlat: null,
      cookieDurationDays: 30,
      deletedAt: null,
    },
  };

  const mockConversion = {
    id: 'conv-123',
    partnerId: 'partner-123',
    linkId: 'link-123',
    clickId: 'click-123',
    companyId: 'company-123',
    orderId: 'order-123',
    orderNumber: 'ORD-001',
    orderTotal: 100,
    commissionRate: 10,
    commissionAmount: 10,
    status: 'PENDING',
    convertedAt: new Date(),
    attributionWindow: 30,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      affiliateLink: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      affiliateClick: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      affiliateConversion: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      affiliatePartner: {
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      affiliateProgramConfig: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(mockPrismaService)),
    };

    const mockHierarchyService = {
      getAccessibleCompanyIds: jest.fn().mockResolvedValue(['company-123']),
      validateCompanyAccess: jest.fn().mockResolvedValue(true),
    };

    const mockAuditLogsService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const mockClickQueueService = {
      ingestClick: jest.fn().mockResolvedValue({
        queued: true,
        isDuplicate: false,
        idempotencyKey: 'idem-123',
      }),
      getStats: jest.fn().mockReturnValue({
        queueSize: 0,
        processedCount: 1000,
        duplicateCount: 50,
        fraudCount: 10,
        errorCount: 0,
        avgProcessingTimeMs: 5,
      }),
      setBatchProcessor: jest.fn(),
    };

    const mockIdempotencyService = {
      checkAndLock: jest.fn().mockResolvedValue({ isDuplicate: false }),
      complete: jest.fn().mockResolvedValue(undefined),
      fail: jest.fn().mockResolvedValue(undefined),
    };

    const mockAffiliateLinksService = {
      findByTrackingCode: jest.fn(),
      findByShortCode: jest.fn(),
      incrementClicks: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliateTrackingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HierarchyService, useValue: mockHierarchyService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: ClickQueueService, useValue: mockClickQueueService },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
        { provide: AffiliateLinksService, useValue: mockAffiliateLinksService },
      ],
    }).compile();

    service = module.get<AffiliateTrackingService>(AffiliateTrackingService);
    prismaService = module.get(PrismaService);
    hierarchyService = module.get(HierarchyService) as unknown as jest.Mocked<HierarchyService>;
    auditLogsService = module.get(AuditLogsService) as unknown as jest.Mocked<AuditLogsService>;
    clickQueueService = module.get(ClickQueueService) as unknown as jest.Mocked<ClickQueueService>;
    idempotencyService = module.get(IdempotencyService) as unknown as jest.Mocked<IdempotencyService>;
    linksService = module.get(AffiliateLinksService) as unknown as jest.Mocked<AffiliateLinksService>;
  });

  describe('trackClickByShortCode', () => {
    it('should track a click and return redirect URL', async () => {
      linksService.findByShortCode.mockResolvedValue(mockLink as any);
      linksService.findByTrackingCode.mockResolvedValue(mockLink as any);

      const result = await service.trackClickByShortCode('abc123', {
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.redirectUrl).toContain('https://example.com/product');
      expect(result.clickId).toBeDefined();
      expect(clickQueueService.ingestClick).toHaveBeenCalled();
    });

    it('should throw NotFoundException if link not found', async () => {
      linksService.findByShortCode.mockRejectedValue(new NotFoundException('Link not found'));

      await expect(
        service.trackClickByShortCode('nonexistent', { ipAddress: '127.0.0.1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if link is inactive', async () => {
      const inactiveLink = { ...mockLink, isActive: false };
      linksService.findByShortCode.mockResolvedValue(inactiveLink as any);
      linksService.findByTrackingCode.mockResolvedValue(inactiveLink as any);

      await expect(
        service.trackClickByShortCode('abc123', { ipAddress: '127.0.0.1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if partner is not active', async () => {
      const suspendedLink = { ...mockLink, partner: { ...mockLink.partner, status: 'SUSPENDED' } };
      linksService.findByShortCode.mockResolvedValue(suspendedLink as any);
      linksService.findByTrackingCode.mockResolvedValue(suspendedLink as any);

      await expect(
        service.trackClickByShortCode('abc123', { ipAddress: '127.0.0.1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle SubID parameters', async () => {
      linksService.findByShortCode.mockResolvedValue(mockLink as any);
      linksService.findByTrackingCode.mockResolvedValue(mockLink as any);

      await service.trackClickByShortCode('abc123', {
        ipAddress: '127.0.0.1',
        subId1: 'campaign-1',
        subId2: 'source-1',
      });

      expect(clickQueueService.ingestClick).toHaveBeenCalledWith(
        expect.objectContaining({
          subId1: 'campaign-1',
          subId2: 'source-1',
        }),
      );
    });
  });

  describe('trackConversion', () => {
    const trackDto = {
      clickId: 'idem-123',
      orderId: 'order-123',
      orderNumber: 'ORD-001',
      orderTotal: 100,
      companyId: 'company-123',
    };

    it('should create a conversion from a valid click', async () => {
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateConversion.create.mockResolvedValue(mockConversion);
      prismaService.affiliatePartner.update.mockResolvedValue({});

      const result = await service.trackConversion(trackDto) as any;

      expect(result.attributed).toBe(true);
      expect(result.conversionId).toBe('conv-123');
      expect(result.commissionAmount).toBe(10);
    });

    it('should return attributed=false if click not found', async () => {
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      prismaService.affiliateClick.findFirst.mockResolvedValue(null);

      const result = await service.trackConversion(trackDto) as any;

      expect(result.attributed).toBe(false);
    });

    it('should return attributed=false if click is outside attribution window', async () => {
      // Mock config with short attribution window
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue({
        attributionWindowDays: 1,
      });
      // Click is 2 days old (outside 1-day window)
      prismaService.affiliateClick.findFirst.mockResolvedValue(null);

      const result = await service.trackConversion(trackDto) as any;

      expect(result.attributed).toBe(false);
    });

    it('should return attributed=false if partner is not active', async () => {
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      prismaService.affiliateClick.findFirst.mockResolvedValue({
        ...mockClick,
        partner: { ...mockClick.partner, status: 'SUSPENDED' },
      });

      const result = await service.trackConversion(trackDto) as any;

      expect(result.attributed).toBe(false);
    });

    it('should use flat commission when configured', async () => {
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      prismaService.affiliateClick.findFirst.mockResolvedValue({
        ...mockClick,
        partner: {
          ...mockClick.partner,
          commissionRate: null,
          commissionFlat: 15,
        },
      });
      prismaService.affiliateConversion.create.mockResolvedValue({
        ...mockConversion,
        commissionFlat: 15,
        commissionAmount: 15,
      });
      prismaService.affiliatePartner.update.mockResolvedValue({});

      const result = await service.trackConversion(trackDto) as any;

      expect(result.commissionAmount).toBe(15);
    });
  });

  describe('handlePostback', () => {
    const postbackDto = {
      clickId: 'idem-123',
      orderId: 'order-123',
      amount: 100,
    };

    it('should process a postback conversion', async () => {
      // First findFirst is for handlePostback finding the click
      prismaService.affiliateClick.findFirst.mockResolvedValueOnce(mockClick);
      // Second findFirst is for findAttribution in trackConversion
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      prismaService.affiliateClick.findFirst.mockResolvedValueOnce(mockClick);
      prismaService.affiliateConversion.create.mockResolvedValue(mockConversion);
      prismaService.affiliatePartner.update.mockResolvedValue({});

      const result = await service.handlePostback(postbackDto) as any;

      expect(result.attributed).toBe(true);
    });

    it('should throw NotFoundException if click not found', async () => {
      prismaService.affiliateClick.findFirst.mockResolvedValue(null);

      await expect(service.handlePostback(postbackDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getClicks', () => {
    it('should return paginated clicks', async () => {
      prismaService.affiliateClick.findMany.mockResolvedValue([mockClick]);
      prismaService.affiliateClick.count.mockResolvedValue(1);

      const result = await service.getClicks(mockUser, { limit: '50', offset: '0' });

      expect(result.clicks).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(hierarchyService.getAccessibleCompanyIds).toHaveBeenCalledWith(mockUser);
    });

    it('should filter by partner', async () => {
      prismaService.affiliateClick.findMany.mockResolvedValue([mockClick]);
      prismaService.affiliateClick.count.mockResolvedValue(1);

      await service.getClicks(mockUser, { partnerId: 'partner-123' });

      expect(prismaService.affiliateClick.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            partnerId: 'partner-123',
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      prismaService.affiliateClick.findMany.mockResolvedValue([mockClick]);
      prismaService.affiliateClick.count.mockResolvedValue(1);

      await service.getClicks(mockUser, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(prismaService.affiliateClick.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clickedAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('getConversions', () => {
    it('should return paginated conversions', async () => {
      prismaService.affiliateConversion.findMany.mockResolvedValue([mockConversion]);
      prismaService.affiliateConversion.count.mockResolvedValue(1);

      const result = await service.getConversions(mockUser, { limit: '50', offset: '0' });

      expect(result.conversions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      prismaService.affiliateConversion.findMany.mockResolvedValue([mockConversion]);
      prismaService.affiliateConversion.count.mockResolvedValue(1);

      await service.getConversions(mockUser, { status: 'PENDING' });

      expect(prismaService.affiliateConversion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
          }),
        }),
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return click queue statistics', async () => {
      const result = await service.getQueueStats();

      expect(result.queueSize).toBe(0);
      expect(result.processedCount).toBe(1000);
      expect(clickQueueService.getStats).toHaveBeenCalled();
    });
  });
});
