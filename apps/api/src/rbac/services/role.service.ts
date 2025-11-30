import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Role, CreateRoleDto, UpdateRoleDto, AssignRoleDto } from '../types/rbac.types';
import { PermissionService } from './permission.service';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly permissionService: PermissionService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // ROLE CRUD
  // ═══════════════════════════════════════════════════════════════

  async create(dto: CreateRoleDto, createdBy?: string): Promise<Role> {
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check for duplicate slug in the same scope
    const existing = await this.prisma.role.findFirst({
      where: {
        scopeType: dto.scopeType,
        scopeId: dto.scopeId || null,
        slug,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`Role with slug "${slug}" already exists in this scope`);
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        color: dto.color,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
        isDefault: dto.isDefault ?? false,
        priority: dto.priority ?? 100,
        isSystem: false,
      },
    });

    // Add permissions if provided
    if (dto.permissionIds?.length) {
      await this.setRolePermissions(role.id, dto.permissionIds);
    }

    this.logger.log(`Created role: ${role.name} (${role.slug}) in ${dto.scopeType}`);
    this.eventEmitter.emit('rbac.role.created', { role });

    return this.findById(role.id);
  }

  async findAll(scopeType?: ScopeType, scopeId?: string): Promise<Role[]> {
    const where: any = { deletedAt: null };
    if (scopeType) {
      where.scopeType = scopeType;
      if (scopeId) {
        where.scopeId = scopeId;
      }
    }

    const roles = await this.prisma.role.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return roles.map(this.mapToRole.bind(this));
  }

  async findById(id: string): Promise<Role> {
    const role = await this.prisma.role.findFirst({
      where: { id, deletedAt: null },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }

    return this.mapToRole(role);
  }

  async findBySlug(slug: string, scopeType: ScopeType, scopeId?: string): Promise<Role> {
    const role = await this.prisma.role.findFirst({
      where: {
        slug,
        scopeType,
        scopeId: scopeId || null,
        deletedAt: null,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role "${slug}" not found in ${scopeType}`);
    }

    return this.mapToRole(role);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const existing = await this.prisma.role.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Role ${id} not found`);
    }

    if (existing.isSystem && (dto.name || dto.permissionIds)) {
      throw new BadRequestException('Cannot modify system role name or permissions');
    }

    await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        isDefault: dto.isDefault,
        priority: dto.priority,
      },
    });

    // Update permissions if provided
    if (dto.permissionIds !== undefined) {
      await this.setRolePermissions(id, dto.permissionIds);
    }

    // Invalidate cache for all users with this role
    await this.invalidateCacheForRole(id);

    this.logger.log(`Updated role: ${existing.name}`);
    this.eventEmitter.emit('rbac.role.updated', { roleId: id });

    return this.findById(id);
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const role = await this.prisma.role.findFirst({
      where: { id, deletedAt: null },
    });

    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system role');
    }

    // Soft delete
    await this.prisma.role.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    });

    // Invalidate cache for all users with this role
    await this.invalidateCacheForRole(id);

    this.logger.log(`Deleted role: ${role.name}`);
    this.eventEmitter.emit('rbac.role.deleted', { roleId: id });
  }

  // ═══════════════════════════════════════════════════════════════
  // ROLE PERMISSIONS
  // ═══════════════════════════════════════════════════════════════

  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    // Remove existing permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Add new permissions
    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          roleId,
          permissionId,
        })),
      });
    }

    this.logger.log(`Set ${permissionIds.length} permissions for role ${roleId}`);
  }

  async addPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, deletedAt: null },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });

    if (existing) {
      return; // Already has this permission
    }

    await this.prisma.rolePermission.create({
      data: { roleId, permissionId },
    });

    await this.invalidateCacheForRole(roleId);
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.deleteMany({
      where: { roleId, permissionId },
    });

    await this.invalidateCacheForRole(roleId);
  }

  // ═══════════════════════════════════════════════════════════════
  // ROLE ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════

  async assignRole(dto: AssignRoleDto, assignedBy?: string): Promise<void> {
    const role = await this.prisma.role.findFirst({
      where: { id: dto.roleId, deletedAt: null },
    });

    if (!role) {
      throw new NotFoundException(`Role ${dto.roleId} not found`);
    }

    // Check if user already has this role in this scope
    const existing = await this.prisma.userRoleAssignment.findUnique({
      where: {
        userId_roleId_scopeType_scopeId: {
          userId: dto.userId,
          roleId: dto.roleId,
          scopeType: dto.scopeType,
          scopeId: dto.scopeId,
        },
      },
    });

    if (existing) {
      // Update expiration if provided
      if (dto.expiresAt) {
        await this.prisma.userRoleAssignment.update({
          where: { id: existing.id },
          data: { expiresAt: dto.expiresAt },
        });
      }
      return;
    }

    await this.prisma.userRoleAssignment.create({
      data: {
        userId: dto.userId,
        roleId: dto.roleId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
        assignedBy,
        expiresAt: dto.expiresAt,
      },
    });

    // Invalidate user's permission cache
    this.permissionService.invalidateUserCache(dto.userId);

    this.logger.log(`Assigned role ${role.name} to user ${dto.userId} in ${dto.scopeType}:${dto.scopeId}`);
    this.eventEmitter.emit('rbac.role.assigned', {
      userId: dto.userId,
      roleId: dto.roleId,
      scopeType: dto.scopeType,
      scopeId: dto.scopeId,
    });
  }

  async unassignRole(userId: string, roleId: string, scopeType: ScopeType, scopeId: string): Promise<void> {
    const assignment = await this.prisma.userRoleAssignment.findUnique({
      where: {
        userId_roleId_scopeType_scopeId: {
          userId,
          roleId,
          scopeType,
          scopeId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Role assignment not found');
    }

    await this.prisma.userRoleAssignment.delete({
      where: { id: assignment.id },
    });

    // Invalidate user's permission cache
    this.permissionService.invalidateUserCache(userId);

    this.logger.log(`Unassigned role ${roleId} from user ${userId}`);
    this.eventEmitter.emit('rbac.role.unassigned', {
      userId,
      roleId,
      scopeType,
      scopeId,
    });
  }

  async getUserRoles(userId: string, scopeType?: ScopeType, scopeId?: string): Promise<Role[]> {
    const where: any = {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    if (scopeType) {
      where.scopeType = scopeType;
      if (scopeId) {
        where.scopeId = scopeId;
      }
    }

    const assignments = await this.prisma.userRoleAssignment.findMany({
      where,
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

    return assignments
      .filter(a => !a.role.deletedAt)
      .map(a => this.mapToRole(a.role));
  }

  async getUsersWithRole(roleId: string): Promise<string[]> {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: {
        roleId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: { userId: true },
    });

    return assignments.map(a => a.userId);
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private async invalidateCacheForRole(roleId: string): Promise<void> {
    const userIds = await this.getUsersWithRole(roleId);
    for (const userId of userIds) {
      this.permissionService.invalidateUserCache(userId);
    }
  }

  private mapToRole(data: any): Role {
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      color: data.color,
      scopeType: data.scopeType,
      scopeId: data.scopeId,
      isSystem: data.isSystem,
      isDefault: data.isDefault,
      priority: data.priority,
      permissions: data.permissions?.map((rp: any) => ({
        id: rp.id,
        roleId: rp.roleId,
        permissionId: rp.permissionId,
        constraints: rp.constraints,
        permission: rp.permission ? {
          id: rp.permission.id,
          code: rp.permission.code,
          name: rp.permission.name,
          description: rp.permission.description,
          category: rp.permission.category,
          createdAt: rp.permission.createdAt,
          updatedAt: rp.permission.updatedAt,
        } : undefined,
        createdAt: rp.createdAt,
      })),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
