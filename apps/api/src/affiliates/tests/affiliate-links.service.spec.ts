/**
 * Affiliate Links Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AffiliateLinksService } from '../services/affiliate-links.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AffiliateLinksService', () => {
  let service: AffiliateLinksService;
  let prismaService: PrismaService;
  let hierarchyService: HierarchyService;
  let auditLogsService: AuditLogsService;

  // Mock functions for easier access
  let mockAffiliateLinkFindMany: jest.Mock;
  let mockAffiliateLinkFindFirst: jest.Mock;
  let mockAffiliateLinkFindUnique: jest.Mock;
  let mockAffiliateLinkCreate: jest.Mock;
  let mockAffiliateLinkUpdate: jest.Mock;
  let mockAffiliateLinkCount: jest.Mock;
  let mockAffiliatePartnerFindFirst: jest.Mock;

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
    campaign: 'summer-sale',
    source: 'facebook',
    medium: 'social',
    subId1: 'banner-1',
    subId2: null,
    subId3: null,
    subId4: null,
    subId5: null,
    isActive: true,
    totalClicks: 100,
    uniqueClicks: 80,
    totalConversions: 10,
    totalRevenue: 500,
    conversionRate: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    partner: {
      id: 'partner-123',
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'JohnD',
      affiliateCode: 'JOHN2024',
    },
    company: {
      id: 'company-123',
      name: 'Test Company',
      slug: 'test-company',
    },
  };

  beforeEach(async () => {
    // Create mock functions
    mockAffiliateLinkFindMany = jest.fn();
    mockAffiliateLinkFindFirst = jest.fn();
    mockAffiliateLinkFindUnique = jest.fn();
    mockAffiliateLinkCreate = jest.fn();
    mockAffiliateLinkUpdate = jest.fn();
    mockAffiliateLinkCount = jest.fn();
    mockAffiliatePartnerFindFirst = jest.fn();

    const mockPrismaService = {
      affiliateLink: {
        findMany: mockAffiliateLinkFindMany,
        findFirst: mockAffiliateLinkFindFirst,
        findUnique: mockAffiliateLinkFindUnique,
        create: mockAffiliateLinkCreate,
        update: mockAffiliateLinkUpdate,
        count: mockAffiliateLinkCount,
      },
      affiliatePartner: {
        findFirst: mockAffiliatePartnerFindFirst,
      },
    };

    const mockHierarchyService = {
      getAccessibleCompanyIds: jest.fn().mockResolvedValue(['company-123']),
      validateCompanyAccess: jest.fn().mockResolvedValue(true),
    };

    const mockAuditLogsService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const mockIdempotencyService = {
      checkAndLock: jest.fn().mockResolvedValue({ isDuplicate: false, key: 'mock-key' }),
      complete: jest.fn().mockResolvedValue(undefined),
      fail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliateLinksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HierarchyService, useValue: mockHierarchyService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
      ],
    }).compile();

    service = module.get<AffiliateLinksService>(AffiliateLinksService);
    prismaService = module.get(PrismaService);
    hierarchyService = module.get(HierarchyService);
    auditLogsService = module.get(AuditLogsService);
  });

  describe('findAll', () => {
    it('should return paginated links', async () => {
      mockAffiliateLinkFindMany.mockResolvedValue([mockLink]);
      mockAffiliateLinkCount.mockResolvedValue(1);

      const result = await service.findAll(mockUser, { limit: 50, offset: 0 });

      expect(result.links).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by partner', async () => {
      mockAffiliateLinkFindMany.mockResolvedValue([mockLink]);
      mockAffiliateLinkCount.mockResolvedValue(1);

      await service.findAll(mockUser, { partnerId: 'partner-123' });

      expect(mockAffiliateLinkFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            partnerId: 'partner-123',
          }),
        }),
      );
    });

    it('should filter by active status', async () => {
      mockAffiliateLinkFindMany.mockResolvedValue([mockLink]);
      mockAffiliateLinkCount.mockResolvedValue(1);

      await service.findAll(mockUser, { isActive: true });

      expect(mockAffiliateLinkFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it('should filter by campaign', async () => {
      mockAffiliateLinkFindMany.mockResolvedValue([mockLink]);
      mockAffiliateLinkCount.mockResolvedValue(1);

      await service.findAll(mockUser, { campaign: 'summer-sale' });

      expect(mockAffiliateLinkFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaign: 'summer-sale',
          }),
        }),
      );
    });

    it('should support search', async () => {
      mockAffiliateLinkFindMany.mockResolvedValue([mockLink]);
      mockAffiliateLinkCount.mockResolvedValue(1);

      await service.findAll(mockUser, { search: 'test' });

      expect(mockAffiliateLinkFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return a link by ID', async () => {
      mockAffiliateLinkFindFirst.mockResolvedValue(mockLink);

      const result = await service.findById(mockUser, 'link-123');

      expect(result).toEqual(mockLink);
    });

    it('should throw NotFoundException if link not found', async () => {
      mockAffiliateLinkFindFirst.mockResolvedValue(null);

      await expect(service.findById(mockUser, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      partnerId: 'partner-123',
      companyId: 'company-123',
      name: 'New Link',
      destinationUrl: 'https://example.com/new',
    };

    it('should create a new link', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue({
        id: 'partner-123',
        companyId: 'company-123',
        status: 'ACTIVE',
      });
      mockAffiliateLinkFindFirst.mockResolvedValue(null);
      mockAffiliateLinkCreate.mockResolvedValue({
        ...mockLink,
        name: createDto.name,
        destinationUrl: createDto.destinationUrl,
      });

      const result = await service.create(mockUser, createDto) as any;

      expect(result.name).toBe(createDto.name);
    });

    it('should throw NotFoundException if partner not found', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue(null);

      await expect(service.create(mockUser, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should generate unique tracking code', async () => {
      mockAffiliatePartnerFindFirst.mockResolvedValue({
        id: 'partner-123',
        companyId: 'company-123',
        status: 'ACTIVE',
      });
      mockAffiliateLinkFindFirst.mockResolvedValue(null);
      mockAffiliateLinkCreate.mockResolvedValue({
        ...mockLink,
        trackingCode: 'GENERATED123',
        shortCode: 'gen123',
      });

      const result = await service.create(mockUser, createDto) as any;

      expect(result.trackingCode).toBeDefined();
      expect(result.shortCode).toBeDefined();
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Link',
      campaign: 'winter-sale',
    };

    it('should update a link', async () => {
      mockAffiliateLinkFindFirst.mockResolvedValue(mockLink);
      mockAffiliateLinkUpdate.mockResolvedValue({
        ...mockLink,
        ...updateDto,
      });

      const result = await service.update(mockUser, 'link-123', updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(result.campaign).toBe(updateDto.campaign);
    });

    it('should throw NotFoundException if link not found', async () => {
      mockAffiliateLinkFindFirst.mockResolvedValue(null);

      await expect(service.update(mockUser, 'nonexistent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should update isActive status', async () => {
      mockAffiliateLinkFindFirst.mockResolvedValue(mockLink);
      mockAffiliateLinkUpdate.mockResolvedValue({
        ...mockLink,
        isActive: false,
      });

      const result = await service.update(mockUser, 'link-123', { isActive: false });

      expect(result.isActive).toBe(false);
    });
  });

  describe('delete', () => {
    it('should soft delete a link', async () => {
      mockAffiliateLinkFindFirst.mockResolvedValue(mockLink);
      mockAffiliateLinkUpdate.mockResolvedValue({
        ...mockLink,
        isActive: false,
        deletedAt: new Date(),
      });

      await service.delete(mockUser, 'link-123');

      expect(mockAffiliateLinkUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'link-123' },
          data: expect.objectContaining({
            isActive: false,
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException if link not found', async () => {
      mockAffiliateLinkFindFirst.mockResolvedValue(null);

      await expect(service.delete(mockUser, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByTrackingCode', () => {
    it('should find link by tracking code', async () => {
      mockAffiliateLinkFindUnique.mockResolvedValue(mockLink);

      const result = await service.findByTrackingCode('ABC123DEF456');

      expect(result).toEqual(mockLink);
      expect(mockAffiliateLinkFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { trackingCode: 'ABC123DEF456' },
        }),
      );
    });

    it('should throw NotFoundException if link not found', async () => {
      mockAffiliateLinkFindUnique.mockResolvedValue(null);

      await expect(service.findByTrackingCode('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
