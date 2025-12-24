import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';
import { PermissionGrantService } from './services/permission-grant.service';
import { SessionService } from './services/session.service';
import { HierarchyService, UserContext } from '../hierarchy/hierarchy.service';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ScopeType } from '@prisma/client';

describe('RbacController - Hierarchical Access Control', () => {
  let controller: RbacController;
  let permissionService: jest.Mocked<PermissionService>;
  let roleService: jest.Mocked<RoleService>;
  let grantService: jest.Mocked<PermissionGrantService>;
  let sessionService: jest.Mocked<SessionService>;
  let hierarchyService: jest.Mocked<HierarchyService>;

  // Test users at different scope levels
  const orgUser: AuthenticatedUser = {
    sub: 'user-org-1',
    id: 'user-org-1',
    email: 'admin@avnz.io',
    role: 'SUPER_ADMIN',
    scopeType: 'ORGANIZATION',
    scopeId: 'org-1',
    organizationId: 'org-1',
    clientId: null,
    companyId: null,
    departmentId: null,
  };

  const clientUser: AuthenticatedUser = {
    sub: 'user-client-1',
    id: 'user-client-1',
    email: 'admin@client.com',
    role: 'ADMIN',
    scopeType: 'CLIENT',
    scopeId: 'client-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: null,
    departmentId: null,
  };

  const companyUser: AuthenticatedUser = {
    sub: 'user-company-1',
    id: 'user-company-1',
    email: 'manager@company.com',
    role: 'MANAGER',
    scopeType: 'COMPANY',
    scopeId: 'company-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: 'company-1',
    departmentId: null,
  };

  const otherClientUser: AuthenticatedUser = {
    sub: 'user-client-2',
    id: 'user-client-2',
    email: 'admin@otherclient.com',
    role: 'ADMIN',
    scopeType: 'CLIENT',
    scopeId: 'client-2',
    organizationId: 'org-1',
    clientId: 'client-2',
    companyId: null,
    departmentId: null,
  };

  // Test roles at different scopes
  const orgRole = {
    id: 'role-org-1',
    name: 'Org Admin',
    slug: 'org-admin',
    scopeType: 'ORGANIZATION' as ScopeType,
    scopeId: 'org-1',
    isSystem: false,
    isDefault: false,
    priority: 100,
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const clientRole = {
    id: 'role-client-1',
    name: 'Client Admin',
    slug: 'client-admin',
    scopeType: 'CLIENT' as ScopeType,
    scopeId: 'client-1',
    isSystem: false,
    isDefault: false,
    priority: 100,
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const companyRole = {
    id: 'role-company-1',
    name: 'Company Manager',
    slug: 'company-manager',
    scopeType: 'COMPANY' as ScopeType,
    scopeId: 'company-1',
    isSystem: false,
    isDefault: false,
    priority: 100,
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RbacController],
      providers: [
        {
          provide: PermissionService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
            getEffectivePermissions: jest.fn(),
            hasPermission: jest.fn(),
          },
        },
        {
          provide: RoleService,
          useValue: {
            findAll: jest.fn(),
            findAllWithScopeFilter: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            setRolePermissions: jest.fn(),
            assignRole: jest.fn(),
            unassignRole: jest.fn(),
            getUserRoles: jest.fn(),
          },
        },
        {
          provide: PermissionGrantService,
          useValue: {
            grantPermission: jest.fn(),
            revokeGrant: jest.fn(),
            getUserGrants: jest.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            getUserSessions: jest.fn(),
            revokeSession: jest.fn(),
            revokeAllUserSessions: jest.fn(),
          },
        },
        {
          provide: HierarchyService,
          useValue: {
            getUserScopeFilter: jest.fn(),
            canManageUser: jest.fn(),
            canInviteToScope: jest.fn(),
            getScopeContext: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RbacController>(RbacController);
    permissionService = module.get(PermissionService);
    roleService = module.get(RoleService);
    grantService = module.get(PermissionGrantService);
    sessionService = module.get(SessionService);
    hierarchyService = module.get(HierarchyService);
  });

  describe('getRoles - Hierarchical Filtering', () => {
    it('should filter roles based on organization user scope', async () => {
      hierarchyService.getUserScopeFilter.mockResolvedValue({
        organizationId: 'org-1',
      });
      roleService.findAllWithScopeFilter.mockResolvedValue([orgRole, clientRole, companyRole]);

      await controller.getRoles(undefined, undefined, orgUser);

      expect(hierarchyService.getUserScopeFilter).toHaveBeenCalled();
      expect(roleService.findAllWithScopeFilter).toHaveBeenCalledWith(
        undefined,
        undefined,
        { organizationId: 'org-1' },
      );
    });

    it('should filter roles based on client user scope', async () => {
      hierarchyService.getUserScopeFilter.mockResolvedValue({
        clientId: 'client-1',
      });
      roleService.findAllWithScopeFilter.mockResolvedValue([clientRole, companyRole]);

      await controller.getRoles(undefined, undefined, clientUser);

      expect(roleService.findAllWithScopeFilter).toHaveBeenCalledWith(
        undefined,
        undefined,
        { clientId: 'client-1' },
      );
    });

    it('should filter roles based on company user scope', async () => {
      hierarchyService.getUserScopeFilter.mockResolvedValue({
        companyId: 'company-1',
      });
      roleService.findAllWithScopeFilter.mockResolvedValue([companyRole]);

      await controller.getRoles(undefined, undefined, companyUser);

      expect(roleService.findAllWithScopeFilter).toHaveBeenCalledWith(
        undefined,
        undefined,
        { companyId: 'company-1' },
      );
    });
  });

  describe('createRole - Scope Validation', () => {
    it('should allow org user to create roles at any scope level', async () => {
      hierarchyService.canInviteToScope.mockResolvedValue(true);
      roleService.create.mockResolvedValue(clientRole);

      const dto = {
        name: 'New Role',
        scopeType: 'CLIENT' as ScopeType,
        scopeId: 'client-1',
      };

      const result = await controller.createRole(dto, orgUser);

      expect(hierarchyService.canInviteToScope).toHaveBeenCalled();
      expect(roleService.create).toHaveBeenCalledWith(dto, orgUser.id);
      expect(result).toEqual(clientRole);
    });

    it('should allow client user to create roles at client and company level', async () => {
      hierarchyService.canInviteToScope.mockResolvedValue(true);
      roleService.create.mockResolvedValue(companyRole);

      const dto = {
        name: 'Company Role',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-1',
      };

      const result = await controller.createRole(dto, clientUser);

      expect(result).toEqual(companyRole);
    });

    it('should reject client user creating roles at organization level', async () => {
      hierarchyService.canInviteToScope.mockResolvedValue(false);

      const dto = {
        name: 'Org Role',
        scopeType: 'ORGANIZATION' as ScopeType,
        scopeId: 'org-1',
      };

      await expect(controller.createRole(dto, clientUser)).rejects.toThrow(ForbiddenException);
    });

    it('should reject company user creating roles at higher scope', async () => {
      hierarchyService.canInviteToScope.mockResolvedValue(false);

      const dto = {
        name: 'Client Role',
        scopeType: 'CLIENT' as ScopeType,
        scopeId: 'client-1',
      };

      await expect(controller.createRole(dto, companyUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getRole - Access Control', () => {
    it('should allow access to role within user scope', async () => {
      roleService.findById.mockResolvedValue(clientRole);
      hierarchyService.canInviteToScope.mockResolvedValue(true);

      const result = await controller.getRole('role-client-1', clientUser);

      expect(result).toEqual(clientRole);
    });

    it('should deny access to role outside user scope', async () => {
      roleService.findById.mockResolvedValue(orgRole);
      hierarchyService.canInviteToScope.mockResolvedValue(false);

      await expect(controller.getRole('role-org-1', clientUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateRole - Scope Validation', () => {
    it('should allow updating role within scope', async () => {
      roleService.findById.mockResolvedValue(companyRole);
      hierarchyService.canInviteToScope.mockResolvedValue(true);
      roleService.update.mockResolvedValue({ ...companyRole, name: 'Updated Name' });

      const result = await controller.updateRole('role-company-1', { name: 'Updated Name' }, clientUser);

      expect(roleService.update).toHaveBeenCalledWith('role-company-1', { name: 'Updated Name' }, clientUser.id);
    });

    it('should deny updating role outside scope', async () => {
      roleService.findById.mockResolvedValue(orgRole);
      hierarchyService.canInviteToScope.mockResolvedValue(false);

      await expect(controller.updateRole('role-org-1', { name: 'Hacked' }, companyUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteRole - Scope Validation', () => {
    it('should allow deleting role within scope', async () => {
      roleService.findById.mockResolvedValue(companyRole);
      hierarchyService.canInviteToScope.mockResolvedValue(true);
      roleService.delete.mockResolvedValue(undefined);

      await controller.deleteRole('role-company-1', clientUser);

      expect(roleService.delete).toHaveBeenCalledWith('role-company-1', clientUser.id);
    });

    it('should deny deleting role outside scope', async () => {
      roleService.findById.mockResolvedValue(clientRole);
      hierarchyService.canInviteToScope.mockResolvedValue(false);

      await expect(controller.deleteRole('role-client-1', companyUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assignRole - Hierarchical Validation', () => {
    it('should validate scope access and user management for assignment', async () => {
      hierarchyService.canInviteToScope.mockResolvedValue(true);
      hierarchyService.canManageUser.mockResolvedValue(true);
      roleService.assignRole.mockResolvedValue(undefined);

      const dto = {
        userId: 'target-user-1',
        roleId: 'role-company-1',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-1',
      };

      const result = await controller.assignRole(dto, clientUser);

      expect(hierarchyService.canInviteToScope).toHaveBeenCalled();
      expect(hierarchyService.canManageUser).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should reject assignment if user cannot access the scope', async () => {
      hierarchyService.canInviteToScope.mockResolvedValue(false);

      const dto = {
        userId: 'target-user-1',
        roleId: 'role-org-1',
        scopeType: 'ORGANIZATION' as ScopeType,
        scopeId: 'org-1',
      };

      await expect(controller.assignRole(dto, companyUser)).rejects.toThrow(ForbiddenException);
    });

    it('should reject assignment if user cannot manage target user', async () => {
      hierarchyService.canInviteToScope.mockResolvedValue(true);
      hierarchyService.canManageUser.mockResolvedValue(false);

      const dto = {
        userId: 'other-client-user',
        roleId: 'role-company-1',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-1',
      };

      await expect(controller.assignRole(dto, clientUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('unassignRole - Hierarchical Validation', () => {
    it('should validate scope and user access for unassignment', async () => {
      hierarchyService.canInviteToScope.mockResolvedValue(true);
      hierarchyService.canManageUser.mockResolvedValue(true);
      roleService.unassignRole.mockResolvedValue(undefined);

      await controller.unassignRole(
        'target-user-1',
        'role-company-1',
        'COMPANY' as ScopeType,
        'company-1',
        clientUser,
      );

      expect(hierarchyService.canInviteToScope).toHaveBeenCalled();
      expect(hierarchyService.canManageUser).toHaveBeenCalled();
      expect(roleService.unassignRole).toHaveBeenCalled();
    });

    it('should reject unassignment outside scope', async () => {
      hierarchyService.canInviteToScope.mockResolvedValue(false);

      await expect(controller.unassignRole(
        'target-user-1',
        'role-org-1',
        'ORGANIZATION' as ScopeType,
        'org-1',
        companyUser,
      )).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserRoles - User Access Validation', () => {
    it('should allow viewing roles if user can manage target', async () => {
      hierarchyService.canManageUser.mockResolvedValue(true);
      roleService.getUserRoles.mockResolvedValue([companyRole]);

      const result = await controller.getUserRoles('target-user-1', undefined, undefined, clientUser);

      expect(hierarchyService.canManageUser).toHaveBeenCalled();
      expect(result).toEqual([companyRole]);
    });

    it('should deny viewing roles if user cannot manage target', async () => {
      hierarchyService.canManageUser.mockResolvedValue(false);

      await expect(controller.getUserRoles('other-user', undefined, undefined, companyUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('grantPermission - Hierarchical Validation', () => {
    it('should validate scope and user management for grants', async () => {
      hierarchyService.canInviteToScope.mockResolvedValue(true);
      hierarchyService.canManageUser.mockResolvedValue(true);
      grantService.grantPermission.mockResolvedValue({} as any);

      const dto = {
        userId: 'target-user-1',
        permissionId: 'perm-1',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-1',
        grantType: 'ALLOW' as any,
      };

      await controller.grantPermission(dto, clientUser);

      expect(hierarchyService.canInviteToScope).toHaveBeenCalled();
      expect(hierarchyService.canManageUser).toHaveBeenCalled();
      expect(grantService.grantPermission).toHaveBeenCalled();
    });

    it('should reject grants outside user scope', async () => {
      hierarchyService.canInviteToScope.mockResolvedValue(false);

      const dto = {
        userId: 'target-user-1',
        permissionId: 'perm-1',
        scopeType: 'ORGANIZATION' as ScopeType,
        scopeId: 'org-1',
        grantType: 'ALLOW' as any,
      };

      await expect(controller.grantPermission(dto, companyUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('revokeGrant - Hierarchical Validation', () => {
    it('should validate scope and user access for revocation', async () => {
      hierarchyService.canInviteToScope.mockResolvedValue(true);
      hierarchyService.canManageUser.mockResolvedValue(true);
      grantService.revokeGrant.mockResolvedValue(undefined);

      await controller.revokeGrant(
        'target-user-1',
        'perm-1',
        'COMPANY' as ScopeType,
        'company-1',
        clientUser,
      );

      expect(hierarchyService.canInviteToScope).toHaveBeenCalled();
      expect(hierarchyService.canManageUser).toHaveBeenCalled();
      expect(grantService.revokeGrant).toHaveBeenCalled();
    });

    it('should reject revocation outside scope', async () => {
      hierarchyService.canInviteToScope.mockResolvedValue(false);

      await expect(controller.revokeGrant(
        'target-user-1',
        'perm-1',
        'CLIENT' as ScopeType,
        'client-1',
        companyUser,
      )).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserGrants - User Access Validation', () => {
    it('should allow viewing grants if user can manage target', async () => {
      hierarchyService.canManageUser.mockResolvedValue(true);
      grantService.getUserGrants.mockResolvedValue([]);

      await controller.getUserGrants('target-user-1', undefined, undefined, clientUser);

      expect(hierarchyService.canManageUser).toHaveBeenCalled();
    });

    it('should deny viewing grants outside scope', async () => {
      hierarchyService.canManageUser.mockResolvedValue(false);

      await expect(controller.getUserGrants('other-user', undefined, undefined, companyUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getEffectivePermissions - User Access Validation', () => {
    it('should validate user access before showing permissions', async () => {
      hierarchyService.canManageUser.mockResolvedValue(true);
      permissionService.getEffectivePermissions.mockResolvedValue([] as any);

      await controller.getEffectivePermissions('target-user-1', 'COMPANY' as ScopeType, 'company-1', clientUser);

      expect(hierarchyService.canManageUser).toHaveBeenCalled();
    });

    it('should deny access to permissions outside scope', async () => {
      hierarchyService.canManageUser.mockResolvedValue(false);

      await expect(controller.getEffectivePermissions('other-user', 'CLIENT' as ScopeType, 'client-1', companyUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUserSessions - User Access Validation', () => {
    it('should validate user access before showing sessions', async () => {
      hierarchyService.canManageUser.mockResolvedValue(true);
      sessionService.getUserSessions.mockResolvedValue([]);

      await controller.getUserSessions('target-user-1', clientUser);

      expect(hierarchyService.canManageUser).toHaveBeenCalled();
    });

    it('should deny access to sessions outside scope', async () => {
      hierarchyService.canManageUser.mockResolvedValue(false);

      await expect(controller.getUserSessions('other-user', companyUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('revokeUserSessions - User Access Validation', () => {
    it('should validate user access before revoking sessions', async () => {
      hierarchyService.canManageUser.mockResolvedValue(true);
      sessionService.revokeAllUserSessions.mockResolvedValue(2);

      const result = await controller.revokeUserSessions('target-user-1', clientUser);

      expect(hierarchyService.canManageUser).toHaveBeenCalled();
      expect(result).toEqual({ revokedCount: 2 });
    });

    it('should deny revoking sessions outside scope', async () => {
      hierarchyService.canManageUser.mockResolvedValue(false);

      await expect(controller.revokeUserSessions('other-user', companyUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Cross-Scope Security Tests', () => {
    it('should prevent client from accessing another client\'s roles', async () => {
      const otherClientRole = { ...clientRole, scopeId: 'client-2' };
      roleService.findById.mockResolvedValue(otherClientRole);
      hierarchyService.canInviteToScope.mockResolvedValue(false);

      await expect(controller.getRole('role-other-client', clientUser)).rejects.toThrow(ForbiddenException);
    });

    it('should prevent company from managing users in different company', async () => {
      hierarchyService.canInviteToScope.mockResolvedValue(true);
      hierarchyService.canManageUser.mockResolvedValue(false);

      const dto = {
        userId: 'user-in-other-company',
        roleId: 'role-1',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-1',
      };

      await expect(controller.assignRole(dto, companyUser)).rejects.toThrow(ForbiddenException);
    });

    it('should prevent scope escalation - company user cannot create client-level role', async () => {
      hierarchyService.canInviteToScope.mockResolvedValue(false);

      const dto = {
        name: 'Escalated Role',
        scopeType: 'CLIENT' as ScopeType,
        scopeId: 'client-1',
      };

      await expect(controller.createRole(dto, companyUser)).rejects.toThrow(ForbiddenException);
    });

    it('should prevent viewing permissions of users in other hierarchies', async () => {
      hierarchyService.canManageUser.mockResolvedValue(false);

      await expect(controller.getEffectivePermissions(
        'user-in-other-client',
        'CLIENT' as ScopeType,
        'client-2',
        clientUser,
      )).rejects.toThrow(ForbiddenException);
    });
  });
});
