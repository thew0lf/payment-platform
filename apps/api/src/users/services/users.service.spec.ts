/**
 * Users Service Unit Tests
 * Tests for hierarchical user management with scope-based filtering
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { UserRole, UserStatus, ScopeType, Prisma } from '@prisma/client';

describe('UsersService - Hierarchical User Management', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    company: {
      findMany: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
    userRoleAssignment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // ═══════════════════════════════════════════════════════════════
  // findAll Tests
  // ═══════════════════════════════════════════════════════════════

  describe('findAll', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      status: 'ACTIVE',
      scopeType: 'COMPANY',
      scopeId: 'company-1',
      organizationId: 'org-1',
      clientId: null,
      companyId: 'company-1',
      departmentId: null,
      emailVerified: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization: { id: 'org-1', name: 'Test Org' },
      client: null,
      company: { id: 'company-1', name: 'Test Company' },
      department: null,
      roleAssignments: [],
    };

    it('should return users filtered by organization scope', async () => {
      const scopeFilter: Prisma.UserWhereInput = { organizationId: 'org-1' };

      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.findAll(scopeFilter, {});

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            deletedAt: null,
          }),
        }),
      );
    });

    it('should return users filtered by CLIENT scope (OR clause)', async () => {
      const scopeFilter: Prisma.UserWhereInput = {
        OR: [
          { clientId: 'client-1', scopeType: 'CLIENT' },
          { companyId: { in: ['company-1', 'company-2'] } },
        ],
      };

      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.findAll(scopeFilter, {});

      expect(result.users).toHaveLength(1);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { clientId: 'client-1', scopeType: 'CLIENT' },
              { companyId: { in: ['company-1', 'company-2'] } },
            ],
            deletedAt: null,
          }),
        }),
      );
    });

    it('should return users filtered by COMPANY scope', async () => {
      const scopeFilter: Prisma.UserWhereInput = { companyId: 'company-1' };

      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.findAll(scopeFilter, {});

      expect(result.users).toHaveLength(1);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-1',
            deletedAt: null,
          }),
        }),
      );
    });

    it('should apply additional filters from query', async () => {
      const scopeFilter: Prisma.UserWhereInput = { organizationId: 'org-1' };

      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.findAll(scopeFilter, {
        role: 'ADMIN' as UserRole,
        status: 'ACTIVE' as UserStatus,
        companyId: 'company-1',
      });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            deletedAt: null,
            role: 'ADMIN',
            status: 'ACTIVE',
            companyId: 'company-1',
          }),
        }),
      );
    });

    it('should apply search filter', async () => {
      const scopeFilter: Prisma.UserWhereInput = { organizationId: 'org-1' };

      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.findAll(scopeFilter, {
        search: 'test',
      });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            deletedAt: null,
            AND: [
              {
                OR: [
                  { email: { contains: 'test', mode: 'insensitive' } },
                  { firstName: { contains: 'test', mode: 'insensitive' } },
                  { lastName: { contains: 'test', mode: 'insensitive' } },
                ],
              },
            ],
          }),
        }),
      );
    });

    it('should respect pagination limits', async () => {
      const scopeFilter: Prisma.UserWhereInput = { organizationId: 'org-1' };

      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      await service.findAll(scopeFilter, { limit: 10, offset: 20 });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it('should enforce maximum page size', async () => {
      const scopeFilter: Prisma.UserWhereInput = { organizationId: 'org-1' };

      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      await service.findAll(scopeFilter, { limit: 500 }); // Over MAX_PAGE_SIZE

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // MAX_PAGE_SIZE
        }),
      );
    });

    it('should apply sorting', async () => {
      const scopeFilter: Prisma.UserWhereInput = { organizationId: 'org-1' };

      mockPrismaService.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaService.user.count.mockResolvedValue(1);

      await service.findAll(scopeFilter, { sortBy: 'email', sortOrder: 'asc' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { email: 'asc' },
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getStats Tests
  // ═══════════════════════════════════════════════════════════════

  describe('getStats', () => {
    it('should return stats for organization scope', async () => {
      const scopeFilter: Prisma.UserWhereInput = { organizationId: 'org-1' };

      mockPrismaService.user.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // active
        .mockResolvedValueOnce(10)  // inactive
        .mockResolvedValueOnce(5)   // suspended
        .mockResolvedValueOnce(15); // pending (not verified)

      const result = await service.getStats(scopeFilter);

      expect(result).toEqual({
        total: 100,
        active: 80,
        inactive: 10,
        suspended: 5,
        pending: 15,
      });

      // Verify each count call includes the scope filter
      expect(mockPrismaService.user.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', deletedAt: null },
      });
    });

    it('should return stats for client scope', async () => {
      const scopeFilter: Prisma.UserWhereInput = {
        OR: [
          { clientId: 'client-1', scopeType: 'CLIENT' },
          { companyId: { in: ['company-1'] } },
        ],
      };

      mockPrismaService.user.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(40)  // active
        .mockResolvedValueOnce(5)  // inactive
        .mockResolvedValueOnce(2)   // suspended
        .mockResolvedValueOnce(8); // pending

      const result = await service.getStats(scopeFilter);

      expect(result).toEqual({
        total: 50,
        active: 40,
        inactive: 5,
        suspended: 2,
        pending: 8,
      });
    });

    it('should return stats for company scope', async () => {
      const scopeFilter: Prisma.UserWhereInput = { companyId: 'company-1' };

      mockPrismaService.user.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(18)  // active
        .mockResolvedValueOnce(1)  // inactive
        .mockResolvedValueOnce(0)   // suspended
        .mockResolvedValueOnce(3); // pending

      const result = await service.getStats(scopeFilter);

      expect(result).toEqual({
        total: 20,
        active: 18,
        inactive: 1,
        suspended: 0,
        pending: 3,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // findById Tests
  // ═══════════════════════════════════════════════════════════════

  describe('findById', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      status: 'ACTIVE',
      scopeType: 'COMPANY',
      scopeId: 'company-1',
      organizationId: 'org-1',
      clientId: null,
      companyId: 'company-1',
      departmentId: null,
      emailVerified: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization: { id: 'org-1', name: 'Test Org' },
      client: null,
      company: { id: 'company-1', name: 'Test Company' },
      department: null,
      roleAssignments: [],
    };

    it('should return user when found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // invite Tests
  // ═══════════════════════════════════════════════════════════════

  describe('invite', () => {
    const inviteDto = {
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
      role: 'USER' as UserRole,
      scopeType: 'COMPANY' as ScopeType,
      scopeId: 'company-1',
    };

    const mockCreatedUser = {
      id: 'new-user',
      email: 'new@example.com',
      firstName: 'New',
      lastName: 'User',
      role: 'USER',
      status: 'ACTIVE',
      scopeType: 'COMPANY',
      scopeId: 'company-1',
      organizationId: null,
      clientId: null,
      companyId: 'company-1',
      departmentId: null,
      emailVerified: false,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      organization: null,
      client: null,
      company: { id: 'company-1', name: 'Test Company' },
      department: null,
      roleAssignments: [],
    };

    it('should create user when invited', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null); // No existing user
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.invite(inviteDto, 'inviter-1', 'ADMIN' as UserRole);

      expect(result.id).toBe('new-user');
      expect(result.email).toBe('new@example.com');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('user.invited', expect.any(Object));
    });

    it('should throw ConflictException if user already exists', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.invite(inviteDto, 'inviter-1', 'ADMIN' as UserRole),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException if inviting user with equal or higher role', async () => {
      const superAdminDto = { ...inviteDto, role: 'SUPER_ADMIN' as UserRole };

      await expect(
        service.invite(superAdminDto, 'inviter-1', 'ADMIN' as UserRole),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should NOT allow inviting user with same role level', async () => {
      const adminDto = { ...inviteDto, role: 'ADMIN' as UserRole };

      await expect(
        service.invite(adminDto, 'inviter-1', 'ADMIN' as UserRole),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow SUPER_ADMIN to invite ADMIN', async () => {
      const adminDto = { ...inviteDto, role: 'ADMIN' as UserRole };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        ...mockCreatedUser,
        role: 'ADMIN',
      });

      const result = await service.invite(adminDto, 'inviter-1', 'SUPER_ADMIN' as UserRole);

      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // update Tests
  // ═══════════════════════════════════════════════════════════════

  describe('update', () => {
    const existingUser = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'USER',
      status: 'ACTIVE',
    };

    const updateDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user when found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(existingUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...existingUser,
        ...updateDto,
        organization: null,
        client: null,
        company: null,
        department: null,
        roleAssignments: [],
      });

      const result = await service.update('user-1', updateDto, 'updater-1', 'ADMIN' as UserRole);

      expect(result.firstName).toBe('Updated');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('user.updated', expect.any(Object));
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateDto, 'updater-1', 'ADMIN' as UserRole),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when trying to assign equal or higher role', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(existingUser);

      await expect(
        service.update(
          'user-1',
          { ...updateDto, role: 'SUPER_ADMIN' as UserRole },
          'updater-1',
          'ADMIN' as UserRole,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when managing user with equal or higher role', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...existingUser,
        role: 'ADMIN', // Target has same role as updater
      });

      await expect(
        service.update('user-1', updateDto, 'other-user', 'ADMIN' as UserRole),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow user to update themselves even with same role', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...existingUser,
        role: 'ADMIN',
      });
      mockPrismaService.user.update.mockResolvedValue({
        ...existingUser,
        ...updateDto,
        role: 'ADMIN',
        organization: null,
        client: null,
        company: null,
        department: null,
        roleAssignments: [],
      });

      // Same user ID as the target
      const result = await service.update('user-1', updateDto, 'user-1', 'ADMIN' as UserRole);

      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateStatus Tests
  // ═══════════════════════════════════════════════════════════════

  describe('updateStatus', () => {
    const existingUser = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'USER',
      status: 'ACTIVE',
    };

    it('should update user status', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(existingUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...existingUser,
        status: 'SUSPENDED',
        organization: null,
        client: null,
        company: null,
        department: null,
        roleAssignments: [],
      });

      const result = await service.updateStatus(
        'user-1',
        'SUSPENDED' as UserStatus,
        'admin-1',
        'ADMIN' as UserRole,
      );

      expect(result.status).toBe('SUSPENDED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('user.status_changed', expect.any(Object));
    });

    it('should throw ForbiddenException when trying to change own status', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(existingUser);

      await expect(
        service.updateStatus('user-1', 'SUSPENDED' as UserStatus, 'user-1', 'ADMIN' as UserRole),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when managing user with higher role', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...existingUser,
        role: 'SUPER_ADMIN',
      });

      await expect(
        service.updateStatus('user-1', 'SUSPENDED' as UserStatus, 'admin-1', 'ADMIN' as UserRole),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStatus('non-existent', 'SUSPENDED' as UserStatus, 'admin-1', 'ADMIN' as UserRole),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // assignRole Tests
  // ═══════════════════════════════════════════════════════════════

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.role.findFirst.mockResolvedValue({ id: 'role-1', name: 'Viewer' });
      mockPrismaService.userRoleAssignment.findFirst.mockResolvedValue(null);
      mockPrismaService.userRoleAssignment.create.mockResolvedValue({ id: 'assignment-1' });

      await service.assignRole(
        'user-1',
        'role-1',
        'COMPANY' as ScopeType,
        'company-1',
        'admin-1',
      );

      expect(mockPrismaService.userRoleAssignment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          roleId: 'role-1',
          scopeType: 'COMPANY',
          scopeId: 'company-1',
          assignedBy: 'admin-1',
        },
      });
    });

    it('should not create duplicate assignment', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.role.findFirst.mockResolvedValue({ id: 'role-1', name: 'Viewer' });
      mockPrismaService.userRoleAssignment.findFirst.mockResolvedValue({
        id: 'existing-assignment',
      });

      await service.assignRole(
        'user-1',
        'role-1',
        'COMPANY' as ScopeType,
        'company-1',
        'admin-1',
      );

      expect(mockPrismaService.userRoleAssignment.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.assignRole('non-existent', 'role-1', 'COMPANY' as ScopeType, 'company-1', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent role', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-1' });
      mockPrismaService.role.findFirst.mockResolvedValue(null);

      await expect(
        service.assignRole('user-1', 'non-existent', 'COMPANY' as ScopeType, 'company-1', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // removeRole Tests
  // ═══════════════════════════════════════════════════════════════

  describe('removeRole', () => {
    it('should remove role from user', async () => {
      mockPrismaService.userRoleAssignment.findFirst.mockResolvedValue({
        id: 'assignment-1',
        userId: 'user-1',
        roleId: 'role-1',
        role: { name: 'Viewer' },
        user: { id: 'user-1' },
      });
      mockPrismaService.userRoleAssignment.delete.mockResolvedValue({ id: 'assignment-1' });

      await service.removeRole('user-1', 'role-1', 'admin-1');

      expect(mockPrismaService.userRoleAssignment.delete).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
      });
    });

    it('should throw NotFoundException when assignment not found', async () => {
      mockPrismaService.userRoleAssignment.findFirst.mockResolvedValue(null);

      await expect(service.removeRole('user-1', 'role-1', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
