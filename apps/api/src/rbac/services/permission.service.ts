import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeType, PermissionGrantType } from '@prisma/client';
import {
  Permission,
  CreatePermissionDto,
  EffectivePermissions,
  permissionMatches,
} from '../types/rbac.types';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  // Cache for effective permissions
  private permissionsCache = new Map<string, { permissions: EffectivePermissions; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // PERMISSION CRUD
  // ═══════════════════════════════════════════════════════════════

  async create(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.prisma.permission.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Permission with code "${dto.code}" already exists`);
    }

    const permission = await this.prisma.permission.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        category: dto.category,
      },
    });

    this.logger.log(`Created permission: ${permission.code}`);
    return this.mapToPermission(permission);
  }

  async findAll(category?: string): Promise<Permission[]> {
    const where = category ? { category } : {};
    const permissions = await this.prisma.permission.findMany({
      where,
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });
    return permissions.map(this.mapToPermission);
  }

  async findById(id: string): Promise<Permission> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundException(`Permission ${id} not found`);
    }
    return this.mapToPermission(permission);
  }

  async findByCode(code: string): Promise<Permission> {
    const permission = await this.prisma.permission.findUnique({
      where: { code },
    });
    if (!permission) {
      throw new NotFoundException(`Permission with code "${code}" not found`);
    }
    return this.mapToPermission(permission);
  }

  async delete(id: string): Promise<void> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundException(`Permission ${id} not found`);
    }

    await this.prisma.permission.delete({ where: { id } });
    this.logger.log(`Deleted permission: ${permission.code}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // PERMISSION CHECKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if a user has a specific permission in a given scope
   */
  async hasPermission(
    userId: string,
    permissionCode: string,
    scopeType: ScopeType,
    scopeId: string,
  ): Promise<boolean> {
    const effective = await this.getEffectivePermissions(userId, scopeType, scopeId);
    return effective.permissions.some(p => permissionMatches(p, permissionCode));
  }

  /**
   * Check multiple permissions (returns true if user has ALL permissions)
   */
  async hasAllPermissions(
    userId: string,
    permissionCodes: string[],
    scopeType: ScopeType,
    scopeId: string,
  ): Promise<boolean> {
    const effective = await this.getEffectivePermissions(userId, scopeType, scopeId);
    return permissionCodes.every(required =>
      effective.permissions.some(p => permissionMatches(p, required))
    );
  }

  /**
   * Check multiple permissions (returns true if user has ANY permission)
   */
  async hasAnyPermission(
    userId: string,
    permissionCodes: string[],
    scopeType: ScopeType,
    scopeId: string,
  ): Promise<boolean> {
    const effective = await this.getEffectivePermissions(userId, scopeType, scopeId);
    return permissionCodes.some(required =>
      effective.permissions.some(p => permissionMatches(p, required))
    );
  }

  /**
   * Get all effective permissions for a user in a scope
   * This aggregates permissions from:
   * 1. Role assignments at the scope
   * 2. Direct permission grants
   * 3. Inherited permissions from parent scopes
   */
  async getEffectivePermissions(
    userId: string,
    scopeType: ScopeType,
    scopeId: string,
  ): Promise<EffectivePermissions> {
    const cacheKey = `${userId}:${scopeType}:${scopeId}`;
    const cached = this.permissionsCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    const permissions = new Set<string>();
    const roles: { roleId: string; roleName: string; roleSlug: string }[] = [];

    // 1. Get permissions from role assignments at this scope
    const roleAssignments = await this.prisma.userRoleAssignment.findMany({
      where: {
        userId,
        scopeType,
        scopeId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    for (const assignment of roleAssignments) {
      if (assignment.role.deletedAt) continue;

      roles.push({
        roleId: assignment.role.id,
        roleName: assignment.role.name,
        roleSlug: assignment.role.slug,
      });

      for (const rp of assignment.role.permissions) {
        permissions.add(rp.permission.code);
      }
    }

    // 2. Get direct permission grants
    const grants = await this.prisma.permissionGrant.findMany({
      where: {
        userId,
        scopeType,
        scopeId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        permission: true,
      },
    });

    for (const grant of grants) {
      if (grant.grantType === PermissionGrantType.ALLOW) {
        permissions.add(grant.permission.code);
      } else if (grant.grantType === PermissionGrantType.DENY) {
        permissions.delete(grant.permission.code);
      }
    }

    // 3. Inherit from parent scopes (ceiling pattern)
    const parentPermissions = await this.getParentScopePermissions(userId, scopeType, scopeId);
    for (const p of parentPermissions) {
      permissions.add(p);
    }

    const result: EffectivePermissions = {
      userId,
      scopeType,
      scopeId,
      permissions: Array.from(permissions),
      roles,
    };

    // Cache the result
    this.permissionsCache.set(cacheKey, {
      permissions: result,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return result;
  }

  /**
   * Get inherited permissions from parent scopes
   */
  private async getParentScopePermissions(
    userId: string,
    scopeType: ScopeType,
    scopeId: string,
  ): Promise<string[]> {
    const permissions: string[] = [];

    // Determine parent scope based on hierarchy
    // Organization → Client → Company → Department → Team
    switch (scopeType) {
      case ScopeType.TEAM: {
        // Get department from team
        const team = await this.prisma.team.findUnique({
          where: { id: scopeId },
          include: { department: true },
        });
        if (team) {
          const parentPerms = await this.getEffectivePermissions(
            userId,
            ScopeType.DEPARTMENT,
            team.departmentId,
          );
          permissions.push(...parentPerms.permissions);
        }
        break;
      }
      case ScopeType.DEPARTMENT: {
        // Get company from department
        const department = await this.prisma.department.findUnique({
          where: { id: scopeId },
        });
        if (department) {
          const parentPerms = await this.getEffectivePermissions(
            userId,
            ScopeType.COMPANY,
            department.companyId,
          );
          permissions.push(...parentPerms.permissions);
        }
        break;
      }
      case ScopeType.COMPANY: {
        // Get client from company
        const company = await this.prisma.company.findUnique({
          where: { id: scopeId },
        });
        if (company) {
          const parentPerms = await this.getEffectivePermissions(
            userId,
            ScopeType.CLIENT,
            company.clientId,
          );
          permissions.push(...parentPerms.permissions);
        }
        break;
      }
      case ScopeType.CLIENT: {
        // Get organization from client
        const client = await this.prisma.client.findUnique({
          where: { id: scopeId },
        });
        if (client) {
          const parentPerms = await this.getEffectivePermissions(
            userId,
            ScopeType.ORGANIZATION,
            client.organizationId,
          );
          permissions.push(...parentPerms.permissions);
        }
        break;
      }
      case ScopeType.ORGANIZATION:
        // No parent scope
        break;
    }

    return permissions;
  }

  // ═══════════════════════════════════════════════════════════════
  // CACHE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Invalidate cache for a user (call when roles/permissions change)
   */
  invalidateUserCache(userId: string): void {
    for (const key of this.permissionsCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.permissionsCache.delete(key);
      }
    }
    this.logger.debug(`Invalidated permission cache for user ${userId}`);
  }

  /**
   * Invalidate all cache (call when system-wide changes occur)
   */
  invalidateAllCache(): void {
    this.permissionsCache.clear();
    this.logger.debug('Invalidated all permission cache');
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private mapToPermission(data: any): Permission {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      category: data.category,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
