import { Test, TestingModule } from '@nestjs/testing';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './services/refunds.service';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

describe('RefundsController - Hierarchical Access Control', () => {
  let controller: RefundsController;
  let refundsService: jest.Mocked<RefundsService>;
  let hierarchyService: jest.Mocked<HierarchyService>;

  // Mock users at different scope levels
  const orgAdminUser: AuthenticatedUser = {
    sub: 'org-admin-1',
    id: 'org-admin-1',
    email: 'org@test.com',
    role: 'ADMIN',
    scopeType: 'ORGANIZATION',
    scopeId: 'org-1',
    organizationId: 'org-1',
    clientId: undefined,
    companyId: undefined,
    departmentId: undefined,
  };

  const clientAdminUser: AuthenticatedUser = {
    sub: 'client-admin-1',
    id: 'client-admin-1',
    email: 'client@test.com',
    role: 'ADMIN',
    scopeType: 'CLIENT',
    scopeId: 'client-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: undefined,
    departmentId: undefined,
  };

  const companyUser: AuthenticatedUser = {
    sub: 'company-user-1',
    id: 'company-user-1',
    email: 'company@test.com',
    role: 'MANAGER',
    scopeType: 'COMPANY',
    scopeId: 'company-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: 'company-1',
    departmentId: undefined,
  };

  const otherCompanyUser: AuthenticatedUser = {
    sub: 'other-company-user-1',
    id: 'other-company-user-1',
    email: 'other@test.com',
    role: 'MANAGER',
    scopeType: 'COMPANY',
    scopeId: 'company-2',
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: 'company-2',
    departmentId: undefined,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefundsController],
      providers: [
        {
          provide: RefundsService,
          useValue: {
            create: jest.fn(),
            list: jest.fn(),
            get: jest.fn(),
            getStats: jest.fn(),
            approve: jest.fn(),
            reject: jest.fn(),
            process: jest.fn(),
            cancel: jest.fn(),
            getSettings: jest.fn(),
            updateSettings: jest.fn(),
          },
        },
        {
          provide: HierarchyService,
          useValue: {
            canAccessCompany: jest.fn(),
            getUserScopeFilter: jest.fn(),
            validateCompanyAccess: jest.fn(),
            denyAccess: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RefundsController>(RefundsController);
    refundsService = module.get(RefundsService);
    hierarchyService = module.get(HierarchyService);
  });

  describe('getCompanyId - Write Operations', () => {
    it('should use scopeId for COMPANY scope user', async () => {
      refundsService.getSettings.mockResolvedValue({
        id: 'settings-1',
        companyId: 'company-1',
        autoApprovalEnabled: false,
        autoApprovalMaxAmount: 100,
        autoApprovalMaxDays: 30,
        requireReason: true,
        requireApproval: true,
        allowPartialRefunds: true,
        notifyOnRequest: true,
        notifyOnApproval: true,
        notifyOnCompletion: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await controller.getSettings(companyUser);

      expect(refundsService.getSettings).toHaveBeenCalledWith('company-1');
    });

    it('should throw ForbiddenException for ORGANIZATION user without company context', async () => {
      await expect(controller.getSettings(orgAdminUser)).rejects.toThrow(ForbiddenException);
    });

    it('should use companyId from user context if available', async () => {
      const userWithCompany: AuthenticatedUser = {
        ...clientAdminUser,
        companyId: 'company-1',
      };

      refundsService.getSettings.mockResolvedValue({
        id: 'settings-1',
        companyId: 'company-1',
        autoApprovalEnabled: false,
        autoApprovalMaxAmount: 100,
        autoApprovalMaxDays: 30,
        requireReason: true,
        requireApproval: true,
        allowPartialRefunds: true,
        notifyOnRequest: true,
        notifyOnApproval: true,
        notifyOnCompletion: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await controller.getSettings(userWithCompany);

      expect(refundsService.getSettings).toHaveBeenCalledWith('company-1');
    });
  });

  describe('getCompanyIdForQuery - Read Operations', () => {
    it('should always filter by scopeId for COMPANY scope user', async () => {
      refundsService.list.mockResolvedValue({ refunds: [], total: 0 });

      await controller.list({}, companyUser);

      expect(refundsService.list).toHaveBeenCalledWith('company-1', {});
    });

    it('should allow ORGANIZATION admin to query all refunds (no companyId filter)', async () => {
      refundsService.list.mockResolvedValue({ refunds: [], total: 0 });

      await controller.list({}, orgAdminUser);

      expect(refundsService.list).toHaveBeenCalledWith(undefined, {});
    });

    it('should allow CLIENT admin to query all refunds within client scope', async () => {
      refundsService.list.mockResolvedValue({ refunds: [], total: 0 });

      await controller.list({}, clientAdminUser);

      expect(refundsService.list).toHaveBeenCalledWith(undefined, {});
    });

    it('should validate company access when CLIENT admin passes companyId query param', async () => {
      hierarchyService.validateCompanyAccess.mockResolvedValue(undefined);
      refundsService.list.mockResolvedValue({ refunds: [], total: 0 });

      await controller.list({ companyId: 'company-1' }, clientAdminUser);

      expect(hierarchyService.validateCompanyAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'client-admin-1',
          scopeType: 'CLIENT',
          scopeId: 'client-1',
        }),
        'company-1',
        'query refunds',
      );
      expect(refundsService.list).toHaveBeenCalledWith('company-1', { companyId: 'company-1' });
    });

    it('should throw ForbiddenException when CLIENT admin tries to access unauthorized company', async () => {
      hierarchyService.validateCompanyAccess.mockRejectedValue(
        new ForbiddenException('Access denied to this company'),
      );

      await expect(
        controller.list({ companyId: 'unauthorized-company' }, clientAdminUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getStats - Hierarchical Stats', () => {
    it('should allow ORGANIZATION admin to get stats for all companies', async () => {
      refundsService.getStats.mockResolvedValue({
        totalRefunds: 100,
        pendingRefunds: 10,
        approvedRefunds: 20,
        processingRefunds: 5,
        completedRefunds: 50,
        rejectedRefunds: 10,
        cancelledRefunds: 5,
        failedRefunds: 0,
        totalRefundedAmount: 5000,
        averageRefundAmount: 50,
        averageProcessingTime: 24,
      });

      await controller.getStats(undefined, undefined, undefined, orgAdminUser);

      expect(refundsService.getStats).toHaveBeenCalledWith(undefined, undefined, undefined);
    });

    it('should filter stats by company for COMPANY scope user', async () => {
      refundsService.getStats.mockResolvedValue({
        totalRefunds: 10,
        pendingRefunds: 1,
        approvedRefunds: 2,
        processingRefunds: 1,
        completedRefunds: 5,
        rejectedRefunds: 1,
        cancelledRefunds: 0,
        failedRefunds: 0,
        totalRefundedAmount: 500,
        averageRefundAmount: 50,
        averageProcessingTime: 12,
      });

      await controller.getStats(undefined, undefined, undefined, companyUser);

      expect(refundsService.getStats).toHaveBeenCalledWith('company-1', undefined, undefined);
    });
  });

  describe('approve/reject/process/cancel - Write Operations', () => {
    it('should use company scopeId for approval', async () => {
      const mockRefund = {
        id: 'refund-1',
        companyId: 'company-1',
        status: 'APPROVED',
      } as any;
      refundsService.approve.mockResolvedValue(mockRefund);

      await controller.approve('refund-1', {}, companyUser);

      expect(refundsService.approve).toHaveBeenCalledWith(
        'refund-1',
        'company-1',
        'company-user-1',
        {},
      );
    });

    it('should use company scopeId for rejection', async () => {
      const mockRefund = {
        id: 'refund-1',
        companyId: 'company-1',
        status: 'REJECTED',
      } as any;
      refundsService.reject.mockResolvedValue(mockRefund);

      await controller.reject('refund-1', { rejectionReason: 'Policy violation' }, companyUser);

      expect(refundsService.reject).toHaveBeenCalledWith(
        'refund-1',
        'company-1',
        'company-user-1',
        { rejectionReason: 'Policy violation' },
      );
    });

    it('should use company scopeId for process', async () => {
      const mockRefund = {
        id: 'refund-1',
        companyId: 'company-1',
        status: 'COMPLETED',
      } as any;
      refundsService.process.mockResolvedValue(mockRefund);

      await controller.process('refund-1', companyUser);

      expect(refundsService.process).toHaveBeenCalledWith('refund-1', 'company-1', 'company-user-1');
    });

    it('should use company scopeId for cancel', async () => {
      const mockRefund = {
        id: 'refund-1',
        companyId: 'company-1',
        status: 'CANCELLED',
      } as any;
      refundsService.cancel.mockResolvedValue(mockRefund);

      await controller.cancel('refund-1', companyUser);

      expect(refundsService.cancel).toHaveBeenCalledWith('refund-1', 'company-1', 'company-user-1');
    });
  });

  describe('Cross-Scope Security', () => {
    it('should prevent COMPANY user from accessing other company refunds', async () => {
      // COMPANY users always get filtered by their scopeId
      refundsService.list.mockResolvedValue({ refunds: [], total: 0 });

      await controller.list({}, companyUser);

      // The service is called with the user's company, not another company
      expect(refundsService.list).toHaveBeenCalledWith('company-1', {});
    });

    it('should prevent COMPANY user from passing different companyId', async () => {
      // When a COMPANY user tries to pass a different companyId in query,
      // the controller should ignore it and use their own scopeId
      refundsService.list.mockResolvedValue({ refunds: [], total: 0 });

      await controller.list({ companyId: 'other-company' }, companyUser);

      // The companyId from user scope takes precedence
      expect(refundsService.list).toHaveBeenCalledWith('company-1', { companyId: 'other-company' });
    });
  });

  describe('Settings - Hierarchical Access', () => {
    it('should allow COMPANY user to view their settings', async () => {
      refundsService.getSettings.mockResolvedValue({
        id: 'settings-1',
        companyId: 'company-1',
        autoApprovalEnabled: true,
        autoApprovalMaxAmount: 100,
        autoApprovalMaxDays: 30,
        requireReason: true,
        requireApproval: true,
        allowPartialRefunds: true,
        notifyOnRequest: true,
        notifyOnApproval: true,
        notifyOnCompletion: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await controller.getSettings(companyUser);

      expect(refundsService.getSettings).toHaveBeenCalledWith('company-1');
      expect(result.companyId).toBe('company-1');
    });

    it('should allow COMPANY user to update their settings', async () => {
      refundsService.updateSettings.mockResolvedValue({
        id: 'settings-1',
        companyId: 'company-1',
        autoApprovalEnabled: true,
        autoApprovalMaxAmount: 200,
        autoApprovalMaxDays: 30,
        requireReason: true,
        requireApproval: true,
        allowPartialRefunds: true,
        notifyOnRequest: true,
        notifyOnApproval: true,
        notifyOnCompletion: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await controller.updateSettings({ autoApprovalMaxAmount: 200 }, companyUser);

      expect(refundsService.updateSettings).toHaveBeenCalledWith('company-1', {
        autoApprovalMaxAmount: 200,
      });
    });
  });
});
