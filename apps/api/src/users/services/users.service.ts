import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, UserRole, UserStatus, ScopeType } from '@prisma/client';
import { User, UserStats, UserRoleAssignment, UserPreferences } from '../types/user.types';
import {
  UserQueryDto,
  InviteUserDto,
  UpdateUserDto,
} from '../dto/user.dto';
import * as bcrypt from 'bcrypt';

const MAX_PAGE_SIZE = 100;

// Role hierarchy - higher number = higher privilege
const ROLE_HIERARCHY: Record<UserRole, number> = {
  VIEWER: 1,
  USER: 2,
  MANAGER: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // LIST USERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Find all users with hierarchical scope filtering.
   *
   * @param scopeFilter - Prisma where clause from HierarchyService.getUserScopeFilter()
   * @param query - Additional query filters
   */
  async findAll(
    scopeFilter: Prisma.UserWhereInput,
    query: UserQueryDto,
  ): Promise<{ users: User[]; total: number }> {
    // Start with scope filter and add deletedAt check
    const where: Prisma.UserWhereInput = {
      ...scopeFilter,
      deletedAt: null,
    };

    // Additional filters from query (must be within scope)
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;

    // Company/Client filters - these narrow down within the scope
    if (query.companyId) {
      where.companyId = query.companyId;
    }
    if (query.clientId) {
      // Only apply if not already restricted by scope
      if (!scopeFilter.clientId) {
        where.clientId = query.clientId;
      }
    }
    if (query.departmentId) where.departmentId = query.departmentId;

    // Search - wrap in AND with scope filter
    if (query.search) {
      where.AND = [
        {
          OR: [
            { email: { contains: query.search, mode: 'insensitive' } },
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // Pagination
    const limit = Math.min(query.limit || 50, MAX_PAGE_SIZE);
    const offset = query.offset || 0;

    // Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    let orderBy: Prisma.UserOrderByWithRelationInput = {};

    if (sortBy === 'name') {
      orderBy = { firstName: sortOrder };
    } else {
      orderBy = { [sortBy]: sortOrder };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          organization: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          roleAssignments: {
            include: {
              role: { select: { id: true, name: true, slug: true, color: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map(this.mapToUser.bind(this)),
      total,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get user statistics with hierarchical scope filtering.
   *
   * @param scopeFilter - Prisma where clause from HierarchyService.getUserScopeFilter()
   */
  async getStats(
    scopeFilter: Prisma.UserWhereInput,
  ): Promise<UserStats> {
    const baseWhere: Prisma.UserWhereInput = {
      ...scopeFilter,
      deletedAt: null,
    };

    const [total, active, inactive, suspended] = await Promise.all([
      this.prisma.user.count({ where: baseWhere }),
      this.prisma.user.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { ...baseWhere, status: 'INACTIVE' } }),
      this.prisma.user.count({ where: { ...baseWhere, status: 'SUSPENDED' } }),
    ]);

    // Pending = created but never logged in (emailVerified = false)
    const pending = await this.prisma.user.count({
      where: { ...baseWhere, emailVerified: false },
    });

    return { total, active, inactive, suspended, pending };
  }

  // ═══════════════════════════════════════════════════════════════
  // GET BY ID
  // ═══════════════════════════════════════════════════════════════

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        organization: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        roleAssignments: {
          include: {
            role: { select: { id: true, name: true, slug: true, color: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return this.mapToUser(user);
  }

  // ═══════════════════════════════════════════════════════════════
  // INVITE USER
  // ═══════════════════════════════════════════════════════════════

  async invite(
    dto: InviteUserDto,
    inviterId: string,
    inviterRole: UserRole,
  ): Promise<User> {
    // Check role hierarchy - can't invite users with equal or higher role
    if (ROLE_HIERARCHY[dto.role] >= ROLE_HIERARCHY[inviterRole]) {
      throw new ForbiddenException('Cannot invite users with equal or higher role');
    }

    // Check for existing user
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    // Generate a random temporary password (user will set their own on first login)
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Resolve the full hierarchy IDs for the user
    const clientId = dto.clientId || (dto.scopeType === 'CLIENT' ? dto.scopeId : undefined);
    const companyId = dto.companyId || (dto.scopeType === 'COMPANY' ? dto.scopeId : undefined);

    // Look up organizationId from the hierarchy if not directly set
    let organizationId: string | undefined = dto.scopeType === 'ORGANIZATION' ? dto.scopeId : undefined;

    if (!organizationId && clientId) {
      // Look up organizationId from client
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
        select: { organizationId: true },
      });
      organizationId = client?.organizationId || undefined;
    }

    if (!organizationId && companyId) {
      // Look up organizationId from company's client
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        include: { client: { select: { organizationId: true } } },
      });
      organizationId = company?.client?.organizationId || undefined;
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        status: 'ACTIVE',
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
        organizationId,
        clientId,
        companyId,
        departmentId: dto.departmentId || (dto.scopeType === 'DEPARTMENT' ? dto.scopeId : undefined),
        emailVerified: false,
      },
      include: {
        organization: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        roleAssignments: {
          include: {
            role: { select: { id: true, name: true, slug: true, color: true } },
          },
        },
      },
    });

    this.logger.log(`User invited: ${user.id} by user ${inviterId}`);
    this.eventEmitter.emit('user.invited', { user: this.mapToUser(user), inviterId });

    return this.mapToUser(user);
  }

  // ═══════════════════════════════════════════════════════════════
  // UPDATE USER
  // ═══════════════════════════════════════════════════════════════

  async update(
    id: string,
    dto: UpdateUserDto,
    updaterId: string,
    updaterRole: UserRole,
  ): Promise<User> {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`User ${id} not found`);
    }

    // Check role hierarchy for role changes
    if (dto.role && ROLE_HIERARCHY[dto.role] >= ROLE_HIERARCHY[updaterRole]) {
      throw new ForbiddenException('Cannot assign a role equal or higher than your own');
    }

    // Can't manage users with equal or higher role (unless it's yourself)
    if (id !== updaterId && ROLE_HIERARCHY[existing.role] >= ROLE_HIERARCHY[updaterRole]) {
      throw new ForbiddenException('Cannot manage users with equal or higher role');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        avatar: dto.avatar,
        role: dto.role,
        companyId: dto.companyId,
        clientId: dto.clientId,
        departmentId: dto.departmentId,
      },
      include: {
        organization: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        roleAssignments: {
          include: {
            role: { select: { id: true, name: true, slug: true, color: true } },
          },
        },
      },
    });

    this.logger.log(`User updated: ${user.id} by user ${updaterId}`);
    this.eventEmitter.emit('user.updated', { user: this.mapToUser(user), updaterId });

    return this.mapToUser(user);
  }

  // ═══════════════════════════════════════════════════════════════
  // UPDATE STATUS
  // ═══════════════════════════════════════════════════════════════

  async updateStatus(
    id: string,
    status: UserStatus,
    updaterId: string,
    updaterRole: UserRole,
  ): Promise<User> {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`User ${id} not found`);
    }

    // Can't change own status
    if (id === updaterId) {
      throw new ForbiddenException('Cannot change your own status');
    }

    // Can't manage users with equal or higher role
    if (ROLE_HIERARCHY[existing.role] >= ROLE_HIERARCHY[updaterRole]) {
      throw new ForbiddenException('Cannot manage users with equal or higher role');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { status },
      include: {
        organization: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        roleAssignments: {
          include: {
            role: { select: { id: true, name: true, slug: true, color: true } },
          },
        },
      },
    });

    this.logger.log(`User status changed: ${user.id} -> ${status} by user ${updaterId}`);
    this.eventEmitter.emit('user.status_changed', { user: this.mapToUser(user), status, updaterId });

    return this.mapToUser(user);
  }

  // ═══════════════════════════════════════════════════════════════
  // ROLE ASSIGNMENT
  // ═══════════════════════════════════════════════════════════════

  async assignRole(
    userId: string,
    roleId: string,
    scopeType: ScopeType,
    scopeId: string,
    assignerId: string,
    assignerScopeType?: ScopeType,
    assignerScopeId?: string,
  ): Promise<void> {
    // Check user exists
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Check role exists
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, deletedAt: null },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    // Security: Verify the role belongs to the same scope hierarchy as the assigner
    // This prevents cross-tenant privilege escalation via role assignment
    if (assignerScopeType && assignerScopeId && role.scopeId) {
      // The role must be from a scope the assigner can access
      const canAccessRoleScope = await this.isInAssignerScope(
        assignerScopeType,
        assignerScopeId,
        role.scopeType,
        role.scopeId,
      );

      if (!canAccessRoleScope) {
        throw new ForbiddenException('Cannot assign roles from outside your scope');
      }
    }

    // Check if already assigned
    const existing = await this.prisma.userRoleAssignment.findFirst({
      where: { userId, roleId, scopeType, scopeId },
    });
    if (existing) {
      return; // Already assigned, no-op
    }

    await this.prisma.userRoleAssignment.create({
      data: {
        userId,
        roleId,
        scopeType,
        scopeId,
        assignedBy: assignerId,
      },
    });

    this.logger.log(`Role ${role.name} assigned to user ${user.id} by ${assignerId}`);
  }

  /**
   * Helper to check if a target scope is within the assigner's scope
   */
  private async isInAssignerScope(
    assignerScopeType: ScopeType,
    assignerScopeId: string,
    targetScopeType: ScopeType,
    targetScopeId: string,
  ): Promise<boolean> {
    // Same scope type and ID is always accessible
    if (assignerScopeType === targetScopeType && assignerScopeId === targetScopeId) {
      return true;
    }

    // ORGANIZATION scope can access all clients and companies within
    if (assignerScopeType === 'ORGANIZATION') {
      if (targetScopeType === 'CLIENT') {
        const client = await this.prisma.client.findFirst({
          where: { id: targetScopeId, organizationId: assignerScopeId },
        });
        return !!client;
      }
      if (targetScopeType === 'COMPANY') {
        const company = await this.prisma.company.findFirst({
          where: { id: targetScopeId },
          include: { client: true },
        });
        return company?.client?.organizationId === assignerScopeId;
      }
    }

    // CLIENT scope can access companies within that client
    if (assignerScopeType === 'CLIENT') {
      if (targetScopeType === 'COMPANY') {
        const company = await this.prisma.company.findFirst({
          where: { id: targetScopeId, clientId: assignerScopeId },
        });
        return !!company;
      }
    }

    return false;
  }

  async removeRole(
    userId: string,
    roleId: string,
    removerId: string,
    removerScopeType?: ScopeType,
    removerScopeId?: string,
  ): Promise<void> {
    const assignment = await this.prisma.userRoleAssignment.findFirst({
      where: { userId, roleId },
      include: { role: true, user: true },
    });

    if (!assignment) {
      throw new NotFoundException('Role assignment not found');
    }

    // Security: Verify the remover has access to the scope where the role is assigned
    if (removerScopeType && removerScopeId) {
      const canAccess = await this.isInAssignerScope(
        removerScopeType,
        removerScopeId,
        assignment.scopeType,
        assignment.scopeId,
      );
      if (!canAccess) {
        throw new ForbiddenException('Cannot remove roles outside your scope');
      }
    }

    await this.prisma.userRoleAssignment.delete({
      where: { id: assignment.id },
    });

    this.logger.log(`Role ${assignment.role.name} removed from user ${assignment.user.id} by ${removerId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // USER PREFERENCES
  // ═══════════════════════════════════════════════════════════════

  async getPreferences(userId: string): Promise<UserPreferences> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const defaults: UserPreferences = {
      theme: 'system',
      sidebarCollapsed: false,
    };

    return { ...defaults, ...(user.preferences as object || {}) };
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Merge with existing preferences
    const currentPrefs = (user.preferences as object) || {};
    const newPrefs = { ...currentPrefs, ...preferences };

    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: newPrefs },
    });

    this.logger.log(`User preferences updated: ${userId}`);
    return newPrefs as UserPreferences;
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private generateTempPassword(): string {
    return Math.random().toString(36).slice(-12);
  }

  private mapToUser(data: any): User {
    return {
      id: data.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      avatar: data.avatar,
      phone: data.phone,
      role: data.role,
      status: data.status,
      scopeType: data.scopeType,
      scopeId: data.scopeId,
      organizationId: data.organizationId,
      clientId: data.clientId,
      companyId: data.companyId,
      departmentId: data.departmentId,
      emailVerified: data.emailVerified,
      lastLoginAt: data.lastLoginAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      organizationName: data.organization?.name,
      clientName: data.client?.name,
      companyName: data.company?.name,
      departmentName: data.department?.name,
      roleAssignments: data.roleAssignments?.map((ra: any) => ({
        id: ra.id,
        roleId: ra.roleId,
        roleName: ra.role.name,
        roleSlug: ra.role.slug,
        roleColor: ra.role.color,
        scopeType: ra.scopeType,
        scopeId: ra.scopeId,
        assignedAt: ra.assignedAt,
        expiresAt: ra.expiresAt,
      })),
    };
  }
}
