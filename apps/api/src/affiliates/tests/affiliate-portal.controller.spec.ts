/**
 * Affiliate Portal Controller Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AffiliatePortalController } from '../controllers/affiliate-portal.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';

describe('AffiliatePortalController', () => {
  let controller: AffiliatePortalController;
  let prismaService: PrismaService;
  let auditLogsService: AuditLogsService;
  let idempotencyService: IdempotencyService;

  // Mock functions for easier access
  let mockAffiliatePartnerFindFirst: jest.Mock;
  let mockAffiliatePartnerUpdate: jest.Mock;
  let mockAffiliateLinkFindMany: jest.Mock;
  let mockAffiliateLinkFindFirst: jest.Mock;
  let mockAffiliateLinkCreate: jest.Mock;
  let mockAffiliateLinkUpdate: jest.Mock;
  let mockAffiliateLinkCount: jest.Mock;
  let mockAffiliateClickCount: jest.Mock;
  let mockAffiliateClickFindMany: jest.Mock;
  let mockAffiliateConversionAggregate: jest.Mock;
  let mockAffiliateConversionFindMany: jest.Mock;
  let mockAffiliateConversionFindFirst: jest.Mock;
  let mockAffiliateConversionCount: jest.Mock;
  let mockAffiliatePayoutFindMany: jest.Mock;
  let mockAffiliatePayoutFindFirst: jest.Mock;
  let mockAffiliatePayoutCount: jest.Mock;
  let mockAffiliateCreativeFindMany: jest.Mock;
  let mockAuditLog: jest.Mock;
  let mockIdempotencyCheckAndLock: jest.Mock;
  let mockIdempotencyComplete: jest.Mock;
  let mockIdempotencyFail: jest.Mock;

  const mockPartner = {
    id: 'partner-123',
    companyId: 'company-123',
    email: 'partner@test.com',
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'JohnD',
    affiliateCode: 'JOHN2024AB',
    status: 'ACTIVE',
    tier: 'BRONZE',
    partnershipType: 'AFFILIATE',
    commissionRate: 10,
    cookieDurationDays: 30,
    payoutMethod: 'PAYPAL',
    payoutThreshold: 50,
    totalClicks: 100,
    totalConversions: 10,
    totalRevenue: 1000,
    totalEarnings: 100,
    currentBalance: 50,
    totalPaid: 500,
    conversionRate: 10,
    createdAt: new Date(),
    approvedAt: new Date(),
    lastActivityAt: new Date(),
    deletedAt: null,
    company: {
      id: 'company-123',
      name: 'Test Company',
      slug: 'test-company',
      logo: 'https://example.com/logo.png',
      affiliateProgramConfig: {
        programName: 'Test Affiliate Program',
        programDescription: 'Join our affiliate program',
        defaultCommissionRate: 10,
        defaultCookieDurationDays: 30,
        minimumPayoutThreshold: 50,
        payoutFrequency: 'monthly',
        tierThresholds: { silver: 10, gold: 50, platinum: 200 },
        termsUrl: 'https://example.com/terms',
        privacyUrl: 'https://example.com/privacy',
        welcomeMessage: 'Welcome!',
      },
    },
  };

  const mockLink = {
    id: 'link-123',
    partnerId: 'partner-123',
    companyId: 'company-123',
    name: 'Test Link',
    destinationUrl: 'https://example.com/product',
    trackingCode: 'ABC123DEF456',
    shortCode: 'abc123',
    campaign: 'summer-sale',
    source: 'facebook',
    medium: 'social',
    subId1: null,
    isActive: true,
    totalClicks: 100,
    uniqueClicks: 80,
    totalConversions: 10,
    totalRevenue: 500,
    conversionRate: 10,
    createdAt: new Date(),
    deletedAt: null,
  };

  const mockReq = {
    user: {
      email: 'partner@test.com',
      sub: 'partner@test.com',
    },
  };

  beforeEach(async () => {
    // Initialize mock functions
    mockAffiliatePartnerFindFirst = jest.fn();
    mockAffiliatePartnerUpdate = jest.fn();
    mockAffiliateLinkFindMany = jest.fn();
    mockAffiliateLinkFindFirst = jest.fn();
    mockAffiliateLinkCreate = jest.fn();
    mockAffiliateLinkUpdate = jest.fn();
    mockAffiliateLinkCount = jest.fn();
    mockAffiliateClickCount = jest.fn();
    mockAffiliateClickFindMany = jest.fn();
    mockAffiliateConversionAggregate = jest.fn();
    mockAffiliateConversionFindMany = jest.fn();
    mockAffiliateConversionFindFirst = jest.fn();
    mockAffiliateConversionCount = jest.fn();
    mockAffiliatePayoutFindMany = jest.fn();
    mockAffiliatePayoutFindFirst = jest.fn();
    mockAffiliatePayoutCount = jest.fn();
    mockAffiliateCreativeFindMany = jest.fn();
    mockAuditLog = jest.fn().mockResolvedValue(undefined);
    mockIdempotencyCheckAndLock = jest.fn().mockResolvedValue({ isDuplicate: false });
    mockIdempotencyComplete = jest.fn().mockResolvedValue(undefined);
    mockIdempotencyFail = jest.fn().mockResolvedValue(undefined);

    const mockPrismaService = {
      affiliatePartner: {
        findFirst: mockAffiliatePartnerFindFirst,
        update: mockAffiliatePartnerUpdate,
      },
      affiliateLink: {
        findMany: mockAffiliateLinkFindMany,
        findFirst: mockAffiliateLinkFindFirst,
        create: mockAffiliateLinkCreate,
        update: mockAffiliateLinkUpdate,
        count: mockAffiliateLinkCount,
      },
      affiliateClick: {
        count: mockAffiliateClickCount,
        findMany: mockAffiliateClickFindMany,
      },
      affiliateConversion: {
        aggregate: mockAffiliateConversionAggregate,
        findMany: mockAffiliateConversionFindMany,
        findFirst: mockAffiliateConversionFindFirst,
        count: mockAffiliateConversionCount,
      },
      affiliatePayout: {
        findMany: mockAffiliatePayoutFindMany,
        findFirst: mockAffiliatePayoutFindFirst,
        count: mockAffiliatePayoutCount,
      },
      affiliateCreative: {
        findMany: mockAffiliateCreativeFindMany,
      },
    };

    const mockAuditLogsService = {
      log: mockAuditLog,
    };

    const mockIdempotencyService = {
      checkAndLock: mockIdempotencyCheckAndLock,
      complete: mockIdempotencyComplete,
      fail: mockIdempotencyFail,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AffiliatePortalController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
      ],
    }).compile();

    controller = module.get<AffiliatePortalController>(AffiliatePortalController);
    prismaService = module.get(PrismaService);
    auditLogsService = module.get(AuditLogsService);
    idempotencyService = module.get(IdempotencyService);
  });

  describe('getDashboard', () => {
    it('should return dashboard data for authenticated partner', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliateClickCount.mockResolvedValue(100);
      mockAffiliateConversionAggregate.mockResolvedValue({
        _count: 10,
        _sum: { orderTotal: 1000, commissionAmount: 100 },
      });
      mockAffiliateConversionCount.mockResolvedValue(5);
      mockAffiliateLinkCount.mockResolvedValue(5);
      mockAffiliateClickFindMany.mockResolvedValue([]);
      mockAffiliateConversionFindMany.mockResolvedValue([]);

      const result = await controller.getDashboard(mockReq, {});

      expect(result.partner).toBeDefined();
      expect(result.company).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalClicks).toBe(100);
      expect(result.metrics.periodClicks).toBe(100);
    });

    it('should throw UnauthorizedException if partner not found', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(null);

      await expect(controller.getDashboard(mockReq, {})).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if partner is not active', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue({
        ...mockPartner,
        status: 'SUSPENDED',
      });

      await expect(controller.getDashboard(mockReq, {})).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return partner profile', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);

      const result = await controller.getProfile(mockReq);

      expect(result.id).toBe('partner-123');
      expect(result.email).toBe('partner@test.com');
      expect(result.firstName).toBe('John');
      expect(result.affiliateCode).toBe('JOHN2024AB');
    });
  });

  describe('updateProfile', () => {
    it('should update partner profile', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliatePartnerUpdate.mockResolvedValue({
        ...mockPartner,
        displayName: 'NewName',
      });

      const result = await controller.updateProfile(mockReq, { displayName: 'NewName' });

      expect(result.displayName).toBe('NewName');
      expect(mockAuditLog).toHaveBeenCalled();
    });
  });

  describe('updatePayoutSettings', () => {
    it('should update payout settings', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliatePartnerUpdate.mockResolvedValue({
        ...mockPartner,
        payoutMethod: 'BANK_TRANSFER',
      });

      const result = await controller.updatePayoutSettings(mockReq, {
        payoutMethod: 'BANK_TRANSFER',
      });

      expect(result.payoutMethod).toBe('BANK_TRANSFER');
      expect(mockAuditLog).toHaveBeenCalled();
    });
  });

  describe('listLinks', () => {
    it('should return partner links', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliateLinkFindMany.mockResolvedValue([mockLink]);
      mockAffiliateLinkCount.mockResolvedValue(1);

      const result = await controller.listLinks(mockReq, {});

      expect(result.links).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.links[0].trackingUrl).toBeDefined();
    });

    it('should filter links by active status', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliateLinkFindMany.mockResolvedValue([mockLink]);
      mockAffiliateLinkCount.mockResolvedValue(1);

      await controller.listLinks(mockReq, { isActive: true });

      expect(mockAffiliateLinkFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it('should filter links by search', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliateLinkFindMany.mockResolvedValue([mockLink]);
      mockAffiliateLinkCount.mockResolvedValue(1);

      await controller.listLinks(mockReq, { search: 'test' });

      expect(mockAffiliateLinkFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('getLink', () => {
    it('should return a single link', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliateLinkFindFirst.mockResolvedValue({
        ...mockLink,
        clicks: [],
        conversions: [],
      });

      const result = await controller.getLink(mockReq, 'link-123');

      expect(result.id).toBe('link-123');
      expect(result.trackingUrl).toBeDefined();
    });

    it('should throw NotFoundException if link not found', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliateLinkFindFirst.mockResolvedValue(null);

      await expect(controller.getLink(mockReq, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createLink', () => {
    const createDto = {
      name: 'New Link',
      destinationUrl: 'https://example.com/new',
    };

    it('should create a new link', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliateLinkCreate.mockResolvedValue({
        ...mockLink,
        name: 'New Link',
        destinationUrl: 'https://example.com/new',
      });
      mockAffiliatePartnerUpdate.mockResolvedValue(mockPartner);

      const result = await controller.createLink(mockReq, createDto) as any;

      expect(result.name).toBe('New Link');
      expect(result.trackingUrl).toBeDefined();
      expect(mockAuditLog).toHaveBeenCalled();
    });

    it('should handle idempotency', async () => {
      const cachedResult = { ...mockLink, trackingUrl: 'https://go.avnz.io/abc123' };
      mockIdempotencyCheckAndLock.mockResolvedValue({
        isDuplicate: true,
        cachedResult,
      });
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);

      const result = await controller.createLink(mockReq, {
        ...createDto,
        idempotencyKey: 'test-key',
      });

      expect(result).toEqual(cachedResult);
      expect(mockAffiliateLinkCreate).not.toHaveBeenCalled();
    });
  });

  describe('updateLink', () => {
    it('should update a link', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliateLinkFindFirst.mockResolvedValue(mockLink);
      mockAffiliateLinkUpdate.mockResolvedValue({
        ...mockLink,
        name: 'Updated Link',
      });

      const result = await controller.updateLink(mockReq, 'link-123', { name: 'Updated Link' });

      expect(result.name).toBe('Updated Link');
      expect(mockAuditLog).toHaveBeenCalled();
    });

    it('should throw NotFoundException if link not found', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliateLinkFindFirst.mockResolvedValue(null);

      await expect(
        controller.updateLink(mockReq, 'nonexistent', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteLink', () => {
    it('should soft delete a link', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliateLinkFindFirst.mockResolvedValue(mockLink);
      mockAffiliateLinkUpdate.mockResolvedValue({
        ...mockLink,
        isActive: false,
        deletedAt: new Date(),
      });

      const result = await controller.deleteLink(mockReq, 'link-123');

      expect(result.success).toBe(true);
      expect(mockAuditLog).toHaveBeenCalled();
    });
  });

  describe('listConversions', () => {
    const mockConversion = {
      id: 'conv-123',
      convertedAt: new Date(),
      orderNumber: 'ORD-123',
      orderTotal: 100,
      commissionRate: 10,
      commissionAmount: 10,
      status: 'APPROVED',
      link: { id: 'link-123', name: 'Test Link', trackingCode: 'ABC123' },
    };

    it('should return partner conversions', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliateConversionFindMany.mockResolvedValue([mockConversion]);
      mockAffiliateConversionCount.mockResolvedValue(1);
      mockAffiliateConversionAggregate.mockResolvedValue({
        _count: 1,
        _sum: { orderTotal: 100, commissionAmount: 10 },
      });

      const result = await controller.listConversions(mockReq, {});

      expect(result.conversions).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.summary.totalRevenue).toBe(100);
    });

    it('should filter by status', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliateConversionFindMany.mockResolvedValue([mockConversion]);
      mockAffiliateConversionCount.mockResolvedValue(1);
      mockAffiliateConversionAggregate.mockResolvedValue({
        _count: 1,
        _sum: { orderTotal: 100, commissionAmount: 10 },
      });

      await controller.listConversions(mockReq, { status: 'APPROVED' });

      expect(mockAffiliateConversionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'APPROVED',
          }),
        }),
      );
    });
  });

  describe('listPayouts', () => {
    const mockPayout = {
      id: 'payout-123',
      amount: 100,
      currency: 'USD',
      method: 'PAYPAL',
      status: 'COMPLETED',
      periodStart: new Date(),
      periodEnd: new Date(),
      grossAmount: 100,
      fees: 0,
      netAmount: 100,
      conversionsCount: 10,
      invoiceNumber: 'INV-123',
      createdAt: new Date(),
    };

    it('should return partner payouts', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliatePayoutFindMany.mockResolvedValue([mockPayout]);
      mockAffiliatePayoutCount.mockResolvedValue(1);

      const result = await controller.listPayouts(mockReq, {});

      expect(result.payouts).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics data', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliateClickCount.mockResolvedValue(10);
      mockAffiliateConversionAggregate.mockResolvedValue({
        _count: 1,
        _sum: { orderTotal: 100, commissionAmount: 10 },
      });
      mockAffiliateLinkFindMany.mockResolvedValue([mockLink]);

      const result = await controller.getAnalytics(mockReq);

      expect(result.period).toBeDefined();
      expect(result.dailyData).toBeInstanceOf(Array);
      expect(result.topLinks).toBeInstanceOf(Array);
      expect(result.totals).toBeDefined();
    });
  });

  describe('getResources', () => {
    const mockCreative = {
      id: 'creative-123',
      name: 'Banner 300x250',
      description: 'Product banner',
      type: 'banner',
      size: '300x250',
      assetUrl: 'https://cdn.example.com/banner.jpg',
      createdAt: new Date(),
    };

    it('should return available creatives', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);
      mockAffiliateCreativeFindMany.mockResolvedValue([mockCreative]);

      const result = await controller.getResources(mockReq);

      expect(result.creatives).toHaveLength(1);
      expect(result.byType.banner).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getProgramInfo', () => {
    it('should return program information', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(mockPartner);

      const result = await controller.getProgramInfo(mockReq);

      expect(result.programName).toBe('Test Affiliate Program');
      expect(result.defaultCommissionRate).toBe(10);
      expect(result.partnerCommissionRate).toBe(10);
      expect(result.currentTier).toBe('BRONZE');
    });

    it('should throw NotFoundException if program not configured', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue({
        ...mockPartner,
        company: {
          ...mockPartner.company,
          affiliateProgramConfig: null,
        },
      });

      await expect(controller.getProgramInfo(mockReq)).rejects.toThrow(NotFoundException);
    });
  });
});
