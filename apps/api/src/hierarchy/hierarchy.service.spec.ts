/**
 * Hierarchy Service Unit Tests
 * Tests for getUserScopeFilter, canManageUser, canInviteToScope, getScopeContext
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HierarchyService, UserContext } from './hierarchy.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ScopeType } from '@prisma/client';

describe('HierarchyService - User Management Scope', () => {
  let service: HierarchyService;
  let prismaService: PrismaService;

  // Mock data
  const orgUser: UserContext = {
    sub: 'org-user-1',
    scopeType: 'ORGANIZATION' as ScopeType,
    scopeId: 'org-1',
    organizationId: 'org-1',
  };

  const clientUser: UserContext = {
    sub: 'client-user-1',
    scopeType: 'CLIENT' as ScopeType,
    scopeId: 'client-1',
    organizationId: 'org-1',
    clientId: 'client-1',
  };

  const companyUser: UserContext = {
    sub: 'company-user-1',
    scopeType: 'COMPANY' as ScopeType,
    scopeId: 'company-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: 'company-1',
  };

  const departmentUser: UserContext = {
    sub: 'dept-user-1',
    scopeType: 'DEPARTMENT' as ScopeType,
    scopeId: 'dept-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: 'company-1',
    departmentId: 'dept-1',
  };

  const mockPrismaService = {
    company: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
    },
  };

  const mockAuditLogsService = {
    log: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HierarchyService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    service = module.get<HierarchyService>(HierarchyService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // ═══════════════════════════════════════════════════════════════
  // getUserScopeFilter Tests
  // ═══════════════════════════════════════════════════════════════

  describe('getUserScopeFilter', () => {
    it('should return organizationId filter for ORGANIZATION scope', async () => {
      const result = await service.getUserScopeFilter(orgUser);

      expect(result).toEqual({ organizationId: 'org-1' });
    });

    it('should return OR clause for CLIENT scope (client users + company users)', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([
        { id: 'company-1' },
        { id: 'company-2' },
      ]);

      const result = await service.getUserScopeFilter(clientUser);

      expect(result).toEqual({
        OR: [
          { clientId: 'client-1', scopeType: 'CLIENT' },
          { companyId: { in: ['company-1', 'company-2'] } },
        ],
      });
      expect(mockPrismaService.company.findMany).toHaveBeenCalledWith({
        where: { clientId: 'client-1', deletedAt: null },
        select: { id: true },
      });
    });

    it('should return empty company array for CLIENT with no companies', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([]);

      const result = await service.getUserScopeFilter(clientUser);

      expect(result).toEqual({
        OR: [
          { clientId: 'client-1', scopeType: 'CLIENT' },
          { companyId: { in: [] } },
        ],
      });
    });

    it('should return companyId filter for COMPANY scope', async () => {
      const result = await service.getUserScopeFilter(companyUser);

      expect(result).toEqual({ companyId: 'company-1' });
    });

    it('should return companyId filter for DEPARTMENT scope', async () => {
      const result = await service.getUserScopeFilter(departmentUser);

      expect(result).toEqual({ companyId: 'company-1' });
    });

    it('should return no-access filter for unknown scope', async () => {
      const unknownUser: UserContext = {
        sub: 'unknown-1',
        scopeType: 'UNKNOWN' as ScopeType,
        scopeId: 'unknown',
      };

      const result = await service.getUserScopeFilter(unknownUser);

      expect(result).toEqual({ id: 'NO_ACCESS' });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // canManageUser Tests
  // ═══════════════════════════════════════════════════════════════

  describe('canManageUser', () => {
    describe('ORGANIZATION scope', () => {
      it('should allow managing any user in the organization', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue({
          id: 'target-user',
          scopeType: 'COMPANY',
          organizationId: 'org-1',
          clientId: 'client-1',
          companyId: 'company-1',
          company: { clientId: 'client-1' },
        });

        const result = await service.canManageUser(orgUser, 'target-user');

        expect(result).toBe(true);
      });

      it('should NOT allow managing user from different organization', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue({
          id: 'target-user',
          scopeType: 'COMPANY',
          organizationId: 'other-org',
          clientId: 'other-client',
          companyId: 'other-company',
          company: { clientId: 'other-client' },
        });

        const result = await service.canManageUser(orgUser, 'target-user');

        expect(result).toBe(false);
      });

      it('should return false for non-existent user', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(null);

        const result = await service.canManageUser(orgUser, 'non-existent');

        expect(result).toBe(false);
      });
    });

    describe('CLIENT scope', () => {
      it('should allow managing CLIENT-level users in their client', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue({
          id: 'target-user',
          scopeType: 'CLIENT',
          organizationId: 'org-1',
          clientId: 'client-1',
          companyId: null,
          company: null,
        });

        const result = await service.canManageUser(clientUser, 'target-user');

        expect(result).toBe(true);
      });

      it('should allow managing COMPANY users under their client', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue({
          id: 'target-user',
          scopeType: 'COMPANY',
          organizationId: 'org-1',
          clientId: null,
          companyId: 'company-1',
          company: { clientId: 'client-1' },
        });

        const result = await service.canManageUser(clientUser, 'target-user');

        expect(result).toBe(true);
      });

      it('should NOT allow managing users from different client', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue({
          id: 'target-user',
          scopeType: 'CLIENT',
          organizationId: 'org-1',
          clientId: 'other-client',
          companyId: null,
          company: null,
        });

        const result = await service.canManageUser(clientUser, 'target-user');

        expect(result).toBe(false);
      });

      it('should NOT allow managing COMPANY users from different client', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue({
          id: 'target-user',
          scopeType: 'COMPANY',
          organizationId: 'org-1',
          clientId: null,
          companyId: 'other-company',
          company: { clientId: 'other-client' },
        });

        const result = await service.canManageUser(clientUser, 'target-user');

        expect(result).toBe(false);
      });
    });

    describe('COMPANY scope', () => {
      it('should allow managing users in their own company', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue({
          id: 'target-user',
          scopeType: 'COMPANY',
          organizationId: 'org-1',
          clientId: null,
          companyId: 'company-1',
          company: { clientId: 'client-1' },
        });

        const result = await service.canManageUser(companyUser, 'target-user');

        expect(result).toBe(true);
      });

      it('should NOT allow managing users from different company', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue({
          id: 'target-user',
          scopeType: 'COMPANY',
          organizationId: 'org-1',
          clientId: null,
          companyId: 'other-company',
          company: { clientId: 'client-1' },
        });

        const result = await service.canManageUser(companyUser, 'target-user');

        expect(result).toBe(false);
      });

      it('should NOT allow managing CLIENT-level users', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue({
          id: 'target-user',
          scopeType: 'CLIENT',
          organizationId: 'org-1',
          clientId: 'client-1',
          companyId: null,
          company: null,
        });

        const result = await service.canManageUser(companyUser, 'target-user');

        expect(result).toBe(false);
      });
    });

    describe('DEPARTMENT scope', () => {
      it('should allow managing users in their company', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue({
          id: 'target-user',
          scopeType: 'COMPANY',
          organizationId: 'org-1',
          clientId: null,
          companyId: 'company-1',
          company: { clientId: 'client-1' },
        });

        const result = await service.canManageUser(departmentUser, 'target-user');

        expect(result).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // canInviteToScope Tests
  // ═══════════════════════════════════════════════════════════════

  describe('canInviteToScope', () => {
    describe('ORGANIZATION scope', () => {
      it('should allow inviting to ORGANIZATION scope', async () => {
        const result = await service.canInviteToScope(
          orgUser,
          'ORGANIZATION' as ScopeType,
          'org-1',
        );

        expect(result).toBe(true);
      });

      it('should NOT allow inviting to different organization', async () => {
        const result = await service.canInviteToScope(
          orgUser,
          'ORGANIZATION' as ScopeType,
          'other-org',
        );

        expect(result).toBe(false);
      });

      it('should allow inviting to CLIENT scope (any client in org)', async () => {
        mockPrismaService.client.findUnique.mockResolvedValue({ id: 'client-1' });

        const result = await service.canInviteToScope(
          orgUser,
          'CLIENT' as ScopeType,
          'client-1',
        );

        expect(result).toBe(true);
      });

      it('should allow inviting to COMPANY scope (any company in org)', async () => {
        mockPrismaService.company.findUnique.mockResolvedValue({
          id: 'company-1',
          clientId: 'client-1',
        });

        const result = await service.canInviteToScope(
          orgUser,
          'COMPANY' as ScopeType,
          'company-1',
        );

        expect(result).toBe(true);
      });
    });

    describe('CLIENT scope', () => {
      it('should NOT allow inviting to ORGANIZATION scope (higher level)', async () => {
        const result = await service.canInviteToScope(
          clientUser,
          'ORGANIZATION' as ScopeType,
          'org-1',
        );

        expect(result).toBe(false);
      });

      it('should allow inviting to own CLIENT scope', async () => {
        const result = await service.canInviteToScope(
          clientUser,
          'CLIENT' as ScopeType,
          'client-1',
        );

        expect(result).toBe(true);
      });

      it('should NOT allow inviting to different CLIENT scope', async () => {
        const result = await service.canInviteToScope(
          clientUser,
          'CLIENT' as ScopeType,
          'other-client',
        );

        expect(result).toBe(false);
      });

      it('should allow inviting to COMPANY under their client', async () => {
        mockPrismaService.company.findFirst.mockResolvedValue({
          id: 'company-1',
          clientId: 'client-1',
        });

        const result = await service.canInviteToScope(
          clientUser,
          'COMPANY' as ScopeType,
          'company-1',
        );

        expect(result).toBe(true);
      });

      it('should NOT allow inviting to COMPANY under different client', async () => {
        mockPrismaService.company.findFirst.mockResolvedValue(null);

        const result = await service.canInviteToScope(
          clientUser,
          'COMPANY' as ScopeType,
          'other-company',
        );

        expect(result).toBe(false);
      });

      it('should allow inviting to DEPARTMENT under their client', async () => {
        mockPrismaService.department.findUnique.mockResolvedValue({
          id: 'dept-1',
          companyId: 'company-1',
          company: { clientId: 'client-1' },
        });

        const result = await service.canInviteToScope(
          clientUser,
          'DEPARTMENT' as ScopeType,
          'dept-1',
        );

        expect(result).toBe(true);
      });
    });

    describe('COMPANY scope', () => {
      it('should NOT allow inviting to ORGANIZATION scope', async () => {
        const result = await service.canInviteToScope(
          companyUser,
          'ORGANIZATION' as ScopeType,
          'org-1',
        );

        expect(result).toBe(false);
      });

      it('should NOT allow inviting to CLIENT scope', async () => {
        const result = await service.canInviteToScope(
          companyUser,
          'CLIENT' as ScopeType,
          'client-1',
        );

        expect(result).toBe(false);
      });

      it('should allow inviting to own COMPANY scope', async () => {
        const result = await service.canInviteToScope(
          companyUser,
          'COMPANY' as ScopeType,
          'company-1',
        );

        expect(result).toBe(true);
      });

      it('should NOT allow inviting to different COMPANY', async () => {
        const result = await service.canInviteToScope(
          companyUser,
          'COMPANY' as ScopeType,
          'other-company',
        );

        expect(result).toBe(false);
      });

      it('should allow inviting to DEPARTMENT in their company', async () => {
        mockPrismaService.department.findUnique.mockResolvedValue({
          id: 'dept-1',
          companyId: 'company-1',
        });

        const result = await service.canInviteToScope(
          companyUser,
          'DEPARTMENT' as ScopeType,
          'dept-1',
        );

        expect(result).toBe(true);
      });

      it('should NOT allow inviting to DEPARTMENT in different company', async () => {
        mockPrismaService.department.findUnique.mockResolvedValue({
          id: 'dept-1',
          companyId: 'other-company',
        });

        const result = await service.canInviteToScope(
          companyUser,
          'DEPARTMENT' as ScopeType,
          'dept-1',
        );

        expect(result).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getScopeContext Tests
  // ═══════════════════════════════════════════════════════════════

  describe('getScopeContext', () => {
    it('should return organizationId for ORGANIZATION scope', async () => {
      const result = await service.getScopeContext('ORGANIZATION' as ScopeType, 'org-1');

      expect(result).toEqual({ organizationId: 'org-1' });
    });

    it('should return organizationId and clientId for CLIENT scope', async () => {
      mockPrismaService.client.findUnique.mockResolvedValue({
        id: 'client-1',
        organizationId: 'org-1',
      });

      const result = await service.getScopeContext('CLIENT' as ScopeType, 'client-1');

      expect(result).toEqual({
        organizationId: 'org-1',
        clientId: 'client-1',
      });
    });

    it('should return full context for COMPANY scope', async () => {
      mockPrismaService.company.findUnique.mockResolvedValue({
        id: 'company-1',
        clientId: 'client-1',
        client: { organizationId: 'org-1' },
      });

      const result = await service.getScopeContext('COMPANY' as ScopeType, 'company-1');

      expect(result).toEqual({
        organizationId: 'org-1',
        clientId: 'client-1',
        companyId: 'company-1',
      });
    });

    it('should return full context for DEPARTMENT scope', async () => {
      mockPrismaService.department.findUnique.mockResolvedValue({
        id: 'dept-1',
        companyId: 'company-1',
        company: {
          clientId: 'client-1',
          client: { organizationId: 'org-1' },
        },
      });

      const result = await service.getScopeContext('DEPARTMENT' as ScopeType, 'dept-1');

      expect(result).toEqual({
        organizationId: 'org-1',
        clientId: 'client-1',
        companyId: 'company-1',
      });
    });

    it('should return empty object for unknown scope', async () => {
      const result = await service.getScopeContext('UNKNOWN' as ScopeType, 'unknown');

      expect(result).toEqual({});
    });
  });
});
