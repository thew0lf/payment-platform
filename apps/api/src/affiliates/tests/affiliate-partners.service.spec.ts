/**
 * Affiliate Partners Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AffiliatePartnersService } from '../services/affiliate-partners.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { AffiliateStatus, AffiliateTier } from '@prisma/client';

describe('AffiliatePartnersService', () => {
  let service: AffiliatePartnersService;
  let prismaService: any;
  let hierarchyService: jest.Mocked<HierarchyService>;
  let auditLogsService: jest.Mocked<AuditLogsService>;

  const mockUser: UserContext = {
    sub: 'user-123',
    scopeType: 'ORGANIZATION',
    scopeId: 'org-123',
  };

  const mockPartner = {
    id: 'partner-123',
    companyId: 'company-123',
    email: 'partner@test.com',
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'JohnD',
    affiliateCode: 'JOHN2024AB',
    status: 'ACTIVE' as AffiliateStatus,
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
    conversionRate: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    company: {
      id: 'company-123',
      name: 'Test Company',
      slug: 'test-company',
    },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      affiliatePartner: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
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

    const mockIdempotencyService = {
      checkAndLock: jest.fn().mockResolvedValue({ isDuplicate: false }),
      complete: jest.fn().mockResolvedValue(undefined),
      fail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliatePartnersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HierarchyService, useValue: mockHierarchyService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
      ],
    }).compile();

    service = module.get<AffiliatePartnersService>(AffiliatePartnersService);
    prismaService = module.get(PrismaService) ;
    hierarchyService = module.get(HierarchyService) as unknown as jest.Mocked<HierarchyService>;
    auditLogsService = module.get(AuditLogsService) as unknown as jest.Mocked<AuditLogsService>;
  });

  describe('findAll', () => {
    it('should return paginated partners', async () => {
      const mockPartners = [mockPartner];
      prismaService.affiliatePartner.findMany.mockResolvedValue(mockPartners);
      prismaService.affiliatePartner.count.mockResolvedValue(1);

      const result = await service.findAll(mockUser, { limit: 50, offset: 0 });

      expect(result.partners).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(hierarchyService.getAccessibleCompanyIds).toHaveBeenCalledWith(mockUser);
    });

    it('should filter by status', async () => {
      prismaService.affiliatePartner.findMany.mockResolvedValue([mockPartner]);
      prismaService.affiliatePartner.count.mockResolvedValue(1);

      await service.findAll(mockUser, { status: 'ACTIVE' as AffiliateStatus });

      expect(prismaService.affiliatePartner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should filter by company', async () => {
      prismaService.affiliatePartner.findMany.mockResolvedValue([mockPartner]);
      prismaService.affiliatePartner.count.mockResolvedValue(1);

      await service.findAll(mockUser, { companyId: 'company-123' });

      expect(prismaService.affiliatePartner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: { in: ['company-123'] },
          }),
        }),
      );
    });

    it('should support search', async () => {
      prismaService.affiliatePartner.findMany.mockResolvedValue([mockPartner]);
      prismaService.affiliatePartner.count.mockResolvedValue(1);

      await service.findAll(mockUser, { search: 'john' });

      expect(prismaService.affiliatePartner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return a partner by ID', async () => {
      prismaService.affiliatePartner.findFirst.mockResolvedValue(mockPartner);

      const result = await service.findById(mockUser, 'partner-123');

      expect(result).toEqual(mockPartner);
      expect(hierarchyService.validateCompanyAccess).toHaveBeenCalledWith(
        mockUser,
        'company-123',
        'view affiliate partner',
      );
    });

    it('should throw NotFoundException if partner not found', async () => {
      prismaService.affiliatePartner.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockUser, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      companyId: 'company-123',
      email: 'new@test.com',
      firstName: 'New',
      lastName: 'Partner',
    };

    it('should create a new partner', async () => {
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue({
        defaultCommissionRate: 10,
        defaultCookieDurationDays: 30,
        minimumPayoutThreshold: 50,
      });
      prismaService.affiliatePartner.findFirst.mockResolvedValue(null);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(null);
      prismaService.affiliatePartner.create.mockResolvedValue({
        ...mockPartner,
        email: createDto.email,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
      });

      const result = await service.create(mockUser, createDto) as any;

      expect(result.email).toBe(createDto.email);
      expect(auditLogsService.log).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      prismaService.affiliatePartner.findFirst.mockResolvedValue(mockPartner);

      await expect(service.create(mockUser, createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const updateDto = {
      displayName: 'UpdatedName',
      tier: AffiliateTier.GOLD,
    };

    it('should update a partner', async () => {
      prismaService.affiliatePartner.findFirst.mockResolvedValue(mockPartner);
      prismaService.affiliatePartner.update.mockResolvedValue({
        ...mockPartner,
        ...updateDto,
      });

      const result = await service.update(mockUser, 'partner-123', updateDto);

      expect(result.displayName).toBe(updateDto.displayName);
      expect(auditLogsService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if partner not found', async () => {
      prismaService.affiliatePartner.findFirst.mockResolvedValue(null);

      await expect(service.update(mockUser, 'nonexistent', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve a pending partner', async () => {
      const pendingPartner = { ...mockPartner, status: 'PENDING_APPROVAL' as AffiliateStatus };
      prismaService.affiliatePartner.findFirst.mockResolvedValue(pendingPartner);
      prismaService.affiliatePartner.update.mockResolvedValue({
        ...pendingPartner,
        status: 'ACTIVE' as AffiliateStatus,
      });

      const result = await service.approve(mockUser, 'partner-123', {});

      expect(result.status).toBe('ACTIVE');
      expect(auditLogsService.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException if partner is not pending', async () => {
      prismaService.affiliatePartner.findFirst.mockResolvedValue(mockPartner);

      await expect(service.approve(mockUser, 'partner-123', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should reject a pending partner', async () => {
      const pendingPartner = { ...mockPartner, status: 'PENDING_APPROVAL' as AffiliateStatus };
      prismaService.affiliatePartner.findFirst.mockResolvedValue(pendingPartner);
      prismaService.affiliatePartner.update.mockResolvedValue({
        ...pendingPartner,
        status: 'REJECTED' as AffiliateStatus,
      });

      const result = await service.reject(mockUser, 'partner-123', { rejectionReason: 'Test reason' });

      expect(result.status).toBe('REJECTED');
      expect(auditLogsService.log).toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('should soft delete an active partner', async () => {
      prismaService.affiliatePartner.findFirst.mockResolvedValue(mockPartner);
      prismaService.affiliatePartner.update.mockResolvedValue({
        ...mockPartner,
        status: 'TERMINATED' as AffiliateStatus,
        deletedAt: new Date(),
      });

      await service.deactivate(mockUser, 'partner-123');

      expect(prismaService.affiliatePartner.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'partner-123' },
          data: expect.objectContaining({
            status: 'TERMINATED',
            deletedAt: expect.any(Date),
          }),
        }),
      );
      expect(auditLogsService.log).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return partner statistics', async () => {
      prismaService.affiliatePartner.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // active
        .mockResolvedValueOnce(10); // pending
      prismaService.affiliatePartner.groupBy.mockResolvedValue([]);
      prismaService.affiliatePartner.findMany.mockResolvedValue([]);

      const result = await service.getStats(mockUser, {});

      expect(result.total).toBe(100);
      expect(result.active).toBe(80);
      expect(result.pending).toBe(10);
    });
  });
});
