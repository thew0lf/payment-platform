/**
 * Affiliate Partnerships Controller Tests
 *
 * Unit tests for AffiliatePartnershipsController covering:
 * - CRUD operations (create, read, update, delete)
 * - Status management (approve, reject, suspend, reactivate)
 * - Bulk operations
 * - Multi-tenant security
 * - Audit logging
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AffiliatePartnershipsController } from './affiliate-partnerships.controller';
import { AffiliatePartnershipsService } from '../services/affiliate-partnerships.service';
import { ScopeType, AffiliateStatus, AffiliateTier, PartnershipType, AffiliatePayoutMethod } from '@prisma/client';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('AffiliatePartnershipsController', () => {
  let controller: AffiliatePartnershipsController;
  let service: jest.Mocked<AffiliatePartnershipsService>;

  // Mock user contexts for different scope levels
  const mockOrgUser = {
    sub: 'user-org-1',
    scopeType: 'ORGANIZATION' as ScopeType,
    scopeId: 'org-1',
    organizationId: 'org-1',
  };

  const mockClientUser = {
    sub: 'user-client-1',
    scopeType: 'CLIENT' as ScopeType,
    scopeId: 'client-1',
    organizationId: 'org-1',
    clientId: 'client-1',
  };

  const mockCompanyUser = {
    sub: 'user-company-1',
    scopeType: 'COMPANY' as ScopeType,
    scopeId: 'company-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: 'company-1',
  };

  // Mock partnership data
  const mockPartnership = {
    id: 'partnership-1',
    companyId: 'company-1',
    email: 'partner@example.com',
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'JohnD',
    phone: '+1234567890',
    website: 'https://example.com',
    socialMedia: { twitter: '@johnd' },
    affiliateCode: 'JODO2526AB',
    partnershipType: 'AFFILIATE' as PartnershipType,
    status: 'PENDING_APPROVAL' as AffiliateStatus,
    tier: 'BRONZE' as AffiliateTier,
    commissionRate: 10,
    commissionFlat: null,
    secondTierRate: 5,
    cookieDurationDays: 30,
    payoutMethod: 'PAYPAL' as AffiliatePayoutMethod,
    payoutThreshold: 50,
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    totalEarnings: 0,
    totalPaid: 0,
    currentBalance: 0,
    conversionRate: 0,
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
    applicationNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    company: {
      id: 'company-1',
      name: 'Test Company',
      slug: 'test-company',
    },
    _count: {
      links: 0,
      conversions: 0,
      clicks: 0,
      payouts: 0,
    },
  };

  const mockListResponse = {
    partnerships: [mockPartnership],
    total: 1,
    limit: 50,
    offset: 0,
  };

  const mockStats = {
    total: 10,
    active: 5,
    pending: 3,
    suspended: 1,
    terminated: 1,
    byTier: { BRONZE: 4, SILVER: 3, GOLD: 2, PLATINUM: 1 },
    byType: { AFFILIATE: 8, INFLUENCER: 2 },
    topPerformers: [],
  };

  beforeEach(async () => {
    // Create mock service
    const mockService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      suspend: jest.fn(),
      reactivate: jest.fn(),
      softDelete: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AffiliatePartnershipsController],
      providers: [
        {
          provide: AffiliatePartnershipsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AffiliatePartnershipsController>(AffiliatePartnershipsController);
    service = module.get(AffiliatePartnershipsService) as jest.Mocked<AffiliatePartnershipsService>;
  });

  describe('findAll', () => {
    it('should return list of partnerships for organization user', async () => {
      service.findAll.mockResolvedValue(mockListResponse);

      const result = await controller.findAll(
        { user: mockOrgUser },
        { limit: 50, offset: 0 },
      );

      expect(result).toEqual(mockListResponse);
      expect(service.findAll).toHaveBeenCalledWith(mockOrgUser, { limit: 50, offset: 0 });
    });

    it('should return list of partnerships for client user', async () => {
      service.findAll.mockResolvedValue(mockListResponse);

      const result = await controller.findAll(
        { user: mockClientUser },
        { limit: 50, offset: 0 },
      );

      expect(result).toEqual(mockListResponse);
      expect(service.findAll).toHaveBeenCalledWith(mockClientUser, { limit: 50, offset: 0 });
    });

    it('should return list of partnerships for company user', async () => {
      service.findAll.mockResolvedValue(mockListResponse);

      const result = await controller.findAll(
        { user: mockCompanyUser },
        { limit: 50, offset: 0 },
      );

      expect(result).toEqual(mockListResponse);
      expect(service.findAll).toHaveBeenCalledWith(mockCompanyUser, { limit: 50, offset: 0 });
    });

    it('should apply filters correctly', async () => {
      service.findAll.mockResolvedValue(mockListResponse);

      const query = {
        companyId: 'company-1',
        status: 'ACTIVE' as AffiliateStatus,
        tier: 'GOLD' as AffiliateTier,
        search: 'john',
        limit: 25,
        offset: 10,
      };

      await controller.findAll({ user: mockOrgUser }, query);

      expect(service.findAll).toHaveBeenCalledWith(mockOrgUser, query);
    });
  });

  describe('getStats', () => {
    it('should return partnership statistics', async () => {
      service.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(
        { user: mockOrgUser },
        'company-1',
      );

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalledWith(mockOrgUser, 'company-1');
    });

    it('should return stats without company filter', async () => {
      service.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats({ user: mockOrgUser });

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalledWith(mockOrgUser, undefined);
    });
  });

  describe('findById', () => {
    it('should return a partnership by ID', async () => {
      service.findById.mockResolvedValue(mockPartnership as any);

      const result = await controller.findById(
        { user: mockOrgUser },
        'partnership-1',
      );

      expect(result).toEqual(mockPartnership);
      expect(service.findById).toHaveBeenCalledWith(mockOrgUser, 'partnership-1');
    });

    it('should throw NotFoundException for non-existent partnership', async () => {
      service.findById.mockRejectedValue(new NotFoundException('Partnership not found'));

      await expect(
        controller.findById({ user: mockOrgUser }, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      service.findById.mockRejectedValue(
        new ForbiddenException('Access denied to this company'),
      );

      await expect(
        controller.findById({ user: mockCompanyUser }, 'partnership-other-company'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    const createDto = {
      companyId: 'company-1',
      email: 'new@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      partnershipType: 'AFFILIATE' as PartnershipType,
      tier: 'BRONZE' as AffiliateTier,
      commissionRate: 15,
    };

    it('should create a new partnership', async () => {
      const createdPartnership = {
        ...mockPartnership,
        ...createDto,
        id: 'partnership-new',
      };
      service.create.mockResolvedValue(createdPartnership as any);

      const result = await controller.create({ user: mockOrgUser }, createDto);

      expect(result.email).toBe('new@example.com');
      expect(service.create).toHaveBeenCalledWith(mockOrgUser, createDto);
    });

    it('should throw ForbiddenException when user lacks access to company', async () => {
      service.create.mockRejectedValue(
        new ForbiddenException('Access denied to this company'),
      );

      await expect(
        controller.create({ user: mockCompanyUser }, {
          ...createDto,
          companyId: 'other-company',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto = {
      firstName: 'Updated',
      commissionRate: 20,
    };

    it('should update a partnership', async () => {
      const updatedPartnership = {
        ...mockPartnership,
        ...updateDto,
      };
      service.update.mockResolvedValue(updatedPartnership as any);

      const result = await controller.update(
        { user: mockOrgUser },
        'partnership-1',
        updateDto,
      );

      expect(result.firstName).toBe('Updated');
      expect(result.commissionRate).toBe(20);
      expect(service.update).toHaveBeenCalledWith(mockOrgUser, 'partnership-1', updateDto);
    });

    it('should throw NotFoundException for non-existent partnership', async () => {
      service.update.mockRejectedValue(new NotFoundException('Partnership not found'));

      await expect(
        controller.update({ user: mockOrgUser }, 'non-existent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update partnership status', async () => {
      const updatedPartnership = {
        ...mockPartnership,
        status: 'ACTIVE' as AffiliateStatus,
      };
      service.updateStatus.mockResolvedValue(updatedPartnership as any);

      const result = await controller.updateStatus(
        { user: mockOrgUser },
        'partnership-1',
        { status: 'ACTIVE' as AffiliateStatus, reason: 'Approved by admin' },
      );

      expect(result.status).toBe('ACTIVE');
      expect(service.updateStatus).toHaveBeenCalledWith(
        mockOrgUser,
        'partnership-1',
        { status: 'ACTIVE', reason: 'Approved by admin' },
      );
    });
  });

  describe('approve', () => {
    it('should approve a pending partnership', async () => {
      const approvedPartnership = {
        ...mockPartnership,
        status: 'ACTIVE' as AffiliateStatus,
        approvedAt: new Date(),
        approvedBy: 'user-org-1',
      };
      service.approve.mockResolvedValue(approvedPartnership as any);

      const result = await controller.approve(
        { user: mockOrgUser },
        'partnership-1',
        { tier: 'SILVER' as AffiliateTier, commissionRate: 15 },
      );

      expect(result.status).toBe('ACTIVE');
      expect(service.approve).toHaveBeenCalledWith(
        mockOrgUser,
        'partnership-1',
        { tier: 'SILVER', commissionRate: 15 },
      );
    });

    it('should throw BadRequestException if partnership is not pending', async () => {
      service.approve.mockRejectedValue(
        new BadRequestException('Partnership is not pending approval'),
      );

      await expect(
        controller.approve({ user: mockOrgUser }, 'partnership-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should reject a pending partnership', async () => {
      const rejectedPartnership = {
        ...mockPartnership,
        status: 'REJECTED' as AffiliateStatus,
        rejectionReason: 'Spam application',
      };
      service.reject.mockResolvedValue(rejectedPartnership as any);

      const result = await controller.reject(
        { user: mockOrgUser },
        'partnership-1',
        { reason: 'Spam application' },
      );

      expect(result.status).toBe('REJECTED');
      expect(result.rejectionReason).toBe('Spam application');
    });
  });

  describe('suspend', () => {
    it('should suspend an active partnership', async () => {
      const activePartnership = {
        ...mockPartnership,
        status: 'ACTIVE' as AffiliateStatus,
      };
      const suspendedPartnership = {
        ...activePartnership,
        status: 'SUSPENDED' as AffiliateStatus,
      };
      service.suspend.mockResolvedValue(suspendedPartnership as any);

      const result = await controller.suspend(
        { user: mockOrgUser },
        'partnership-1',
        { reason: 'Violation of terms' },
      );

      expect(result.status).toBe('SUSPENDED');
    });

    it('should throw BadRequestException if partnership is not active', async () => {
      service.suspend.mockRejectedValue(
        new BadRequestException('Only active partnerships can be suspended'),
      );

      await expect(
        controller.suspend({ user: mockOrgUser }, 'partnership-1', { reason: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reactivate', () => {
    it('should reactivate a suspended partnership', async () => {
      const reactivatedPartnership = {
        ...mockPartnership,
        status: 'ACTIVE' as AffiliateStatus,
      };
      service.reactivate.mockResolvedValue(reactivatedPartnership as any);

      const result = await controller.reactivate(
        { user: mockOrgUser },
        'partnership-1',
      );

      expect(result.status).toBe('ACTIVE');
    });

    it('should throw BadRequestException if partnership is not suspended', async () => {
      service.reactivate.mockRejectedValue(
        new BadRequestException('Only suspended partnerships can be reactivated'),
      );

      await expect(
        controller.reactivate({ user: mockOrgUser }, 'partnership-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should soft delete a partnership', async () => {
      service.softDelete.mockResolvedValue({ success: true });

      const result = await controller.delete(
        { user: mockOrgUser },
        'partnership-1',
        { reason: 'Requested by partner' },
      );

      expect(result.success).toBe(true);
      expect(service.softDelete).toHaveBeenCalledWith(
        mockOrgUser,
        'partnership-1',
        { reason: 'Requested by partner' },
      );
    });
  });

  describe('bulkApprove', () => {
    it('should bulk approve multiple partnerships', async () => {
      service.approve
        .mockResolvedValueOnce({
          ...mockPartnership,
          id: 'p1',
          status: 'ACTIVE' as AffiliateStatus,
        } as any)
        .mockResolvedValueOnce({
          ...mockPartnership,
          id: 'p2',
          status: 'ACTIVE' as AffiliateStatus,
        } as any);

      const result = await controller.bulkApprove({ user: mockOrgUser }, {
        partnershipIds: ['p1', 'p2'],
        tier: 'SILVER' as AffiliateTier,
        commissionRate: 15,
      });

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures in bulk approve', async () => {
      service.approve
        .mockResolvedValueOnce({
          ...mockPartnership,
          id: 'p1',
          status: 'ACTIVE' as AffiliateStatus,
        } as any)
        .mockRejectedValueOnce(new BadRequestException('Not pending'));

      const result = await controller.bulkApprove({ user: mockOrgUser }, {
        partnershipIds: ['p1', 'p2'],
      });

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[1].error).toBe('Not pending');
    });
  });

  describe('bulkReject', () => {
    it('should bulk reject multiple partnerships', async () => {
      service.reject
        .mockResolvedValueOnce({
          ...mockPartnership,
          id: 'p1',
          status: 'REJECTED' as AffiliateStatus,
        } as any)
        .mockResolvedValueOnce({
          ...mockPartnership,
          id: 'p2',
          status: 'REJECTED' as AffiliateStatus,
        } as any);

      const result = await controller.bulkReject({ user: mockOrgUser }, {
        partnershipIds: ['p1', 'p2'],
        reason: 'Batch rejection',
      });

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('bulkUpdateTier', () => {
    it('should bulk update tier for multiple partnerships', async () => {
      service.update
        .mockResolvedValueOnce({
          ...mockPartnership,
          id: 'p1',
          tier: 'GOLD' as AffiliateTier,
        } as any)
        .mockResolvedValueOnce({
          ...mockPartnership,
          id: 'p2',
          tier: 'GOLD' as AffiliateTier,
        } as any);

      const result = await controller.bulkUpdateTier({ user: mockOrgUser }, {
        partnershipIds: ['p1', 'p2'],
        tier: 'GOLD' as AffiliateTier,
      });

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('Multi-tenant Security', () => {
    it('should pass user context to service methods', async () => {
      service.findAll.mockResolvedValue(mockListResponse);

      await controller.findAll({ user: mockClientUser }, {});

      expect(service.findAll).toHaveBeenCalledWith(mockClientUser, {});
    });

    it('should pass company user context correctly', async () => {
      service.findById.mockResolvedValue(mockPartnership as any);

      await controller.findById({ user: mockCompanyUser }, 'partnership-1');

      expect(service.findById).toHaveBeenCalledWith(mockCompanyUser, 'partnership-1');
    });
  });
});
