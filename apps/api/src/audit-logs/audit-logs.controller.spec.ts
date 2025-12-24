import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ScopeType, DataClassification } from '@prisma/client';

describe('AuditLogsController - Scope Access Control', () => {
  let controller: AuditLogsController;
  let auditLogsService: jest.Mocked<AuditLogsService>;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        {
          provide: AuditLogsService,
          useValue: {
            list: jest.fn(),
            findById: jest.fn(),
            getStats: jest.fn(),
            getEntityTrail: jest.fn(),
            getAvailableActions: jest.fn().mockResolvedValue([]),
            getAvailableEntities: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
    auditLogsService = module.get(AuditLogsService);
  });

  describe('list - Scope Filtering', () => {
    it('should filter by user scope for COMPANY user', async () => {
      auditLogsService.list.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

      await controller.list(companyUser);

      expect(auditLogsService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          scopeType: 'COMPANY',
          scopeId: 'company-1',
        }),
      );
    });

    it('should filter by user scope for CLIENT user', async () => {
      auditLogsService.list.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

      await controller.list(clientAdminUser);

      expect(auditLogsService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          scopeType: 'CLIENT',
          scopeId: 'client-1',
        }),
      );
    });

    it('should filter by user scope for ORGANIZATION user', async () => {
      auditLogsService.list.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });

      await controller.list(orgAdminUser);

      expect(auditLogsService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          scopeType: 'ORGANIZATION',
          scopeId: 'org-1',
        }),
      );
    });

    it('should throw ForbiddenException when user tries to access different scope', async () => {
      await expect(
        controller.list(
          companyUser,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'ORGANIZATION' as ScopeType,
          'org-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getEntityTrail - Database-Level Scope Filtering', () => {
    it('should pass scope filter to service for COMPANY user', async () => {
      auditLogsService.getEntityTrail.mockResolvedValue([]);

      await controller.getEntityTrail(companyUser, 'order', 'order-123');

      // Verify scope filter is passed to service (database-level filtering)
      expect(auditLogsService.getEntityTrail).toHaveBeenCalledWith(
        'order',
        'order-123',
        100, // default limit
        { scopeType: 'COMPANY', scopeId: 'company-1' },
      );
    });

    it('should pass scope filter to service for CLIENT user', async () => {
      auditLogsService.getEntityTrail.mockResolvedValue([]);

      await controller.getEntityTrail(clientAdminUser, 'customer', 'cust-456');

      expect(auditLogsService.getEntityTrail).toHaveBeenCalledWith(
        'customer',
        'cust-456',
        100,
        { scopeType: 'CLIENT', scopeId: 'client-1' },
      );
    });

    it('should pass scope filter to service for ORGANIZATION user', async () => {
      auditLogsService.getEntityTrail.mockResolvedValue([]);

      await controller.getEntityTrail(orgAdminUser, 'user', 'user-789');

      expect(auditLogsService.getEntityTrail).toHaveBeenCalledWith(
        'user',
        'user-789',
        100,
        { scopeType: 'ORGANIZATION', scopeId: 'org-1' },
      );
    });

    it('should respect custom limit parameter', async () => {
      auditLogsService.getEntityTrail.mockResolvedValue([]);

      await controller.getEntityTrail(companyUser, 'order', 'order-123', '50');

      expect(auditLogsService.getEntityTrail).toHaveBeenCalledWith(
        'order',
        'order-123',
        50, // custom limit
        { scopeType: 'COMPANY', scopeId: 'company-1' },
      );
    });

    it('should NOT perform client-side filtering (efficiency check)', async () => {
      // Service returns logs directly - no filtering should happen in controller
      const mockLogs = [
        {
          id: 'log-1',
          action: 'CREATE',
          entity: 'order',
          entityId: 'order-123',
          scopeType: 'COMPANY' as ScopeType,
          scopeId: 'company-1',
          createdAt: new Date(),
        },
      ];
      auditLogsService.getEntityTrail.mockResolvedValue(mockLogs as any);

      const result = await controller.getEntityTrail(companyUser, 'order', 'order-123');

      // Result should be exactly what service returns (no additional filtering)
      expect(result).toEqual(mockLogs);
    });
  });

  describe('findById - Scope Validation', () => {
    it('should return log when it matches user scope', async () => {
      const mockLog = {
        id: 'log-1',
        action: 'CREATE',
        entity: 'order',
        entityId: 'order-123',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-1',
        createdAt: new Date(),
      };
      auditLogsService.findById.mockResolvedValue(mockLog as any);

      const result = await controller.findById(companyUser, 'log-1');

      expect(result).toEqual(mockLog);
    });

    it('should throw ForbiddenException when log scope does not match user scope', async () => {
      const mockLog = {
        id: 'log-1',
        action: 'CREATE',
        entity: 'order',
        entityId: 'order-123',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-2', // Different company
        createdAt: new Date(),
      };
      auditLogsService.findById.mockResolvedValue(mockLog as any);

      await expect(controller.findById(companyUser, 'log-1')).rejects.toThrow(ForbiddenException);
    });

    it('should return null when log is not found', async () => {
      auditLogsService.findById.mockResolvedValue(null);

      const result = await controller.findById(companyUser, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getStats - Scope Filtering', () => {
    it('should filter stats by user scope', async () => {
      auditLogsService.getStats.mockResolvedValue({
        totalLogs: 100,
        logsByAction: {},
        logsByEntity: {},
        logsByClassification: {},
        recentActivity: [],
      });

      await controller.getStats(companyUser);

      expect(auditLogsService.getStats).toHaveBeenCalledWith('company-1', 30);
    });

    it('should throw ForbiddenException when user tries to access different scope stats', async () => {
      await expect(
        controller.getStats(companyUser, 'other-company'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Cross-Scope Security', () => {
    it('should prevent COMPANY user from accessing logs from another company', async () => {
      const mockLog = {
        id: 'log-1',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-2', // Different company
      };
      auditLogsService.findById.mockResolvedValue(mockLog as any);

      await expect(controller.findById(companyUser, 'log-1')).rejects.toThrow(ForbiddenException);
    });

    it('should prevent CLIENT user from accessing ORGANIZATION level logs', async () => {
      const mockLog = {
        id: 'log-1',
        scopeType: 'ORGANIZATION' as ScopeType,
        scopeId: 'org-1',
      };
      auditLogsService.findById.mockResolvedValue(mockLog as any);

      await expect(controller.findById(clientAdminUser, 'log-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
