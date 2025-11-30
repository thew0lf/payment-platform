import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeType, PermissionGrantType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PermissionGrant, GrantPermissionDto } from '../types/rbac.types';
import { PermissionService } from './permission.service';

@Injectable()
export class PermissionGrantService {
  private readonly logger = new Logger(PermissionGrantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly permissionService: PermissionService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // GRANT OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Grant a permission directly to a user
   */
  async grantPermission(dto: GrantPermissionDto, grantedBy?: string): Promise<PermissionGrant> {
    // Verify permission exists
    const permission = await this.prisma.permission.findUnique({
      where: { id: dto.permissionId },
    });

    if (!permission) {
      throw new NotFoundException(`Permission ${dto.permissionId} not found`);
    }

    // Check for existing grant
    const existing = await this.prisma.permissionGrant.findUnique({
      where: {
        userId_permissionId_scopeType_scopeId: {
          userId: dto.userId,
          permissionId: dto.permissionId,
          scopeType: dto.scopeType,
          scopeId: dto.scopeId,
        },
      },
    });

    if (existing) {
      // Update existing grant
      const updated = await this.prisma.permissionGrant.update({
        where: { id: existing.id },
        data: {
          grantType: dto.grantType ?? PermissionGrantType.ALLOW,
          expiresAt: dto.expiresAt,
          reason: dto.reason,
          constraints: dto.constraints,
          grantedBy,
          grantedAt: new Date(),
        },
        include: { permission: true },
      });

      this.permissionService.invalidateUserCache(dto.userId);
      return this.mapToPermissionGrant(updated);
    }

    const grant = await this.prisma.permissionGrant.create({
      data: {
        userId: dto.userId,
        permissionId: dto.permissionId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
        grantType: dto.grantType ?? PermissionGrantType.ALLOW,
        grantedBy,
        expiresAt: dto.expiresAt,
        reason: dto.reason,
        constraints: dto.constraints,
      },
      include: { permission: true },
    });

    // Invalidate user's permission cache
    this.permissionService.invalidateUserCache(dto.userId);

    this.logger.log(
      `Granted permission ${permission.code} to user ${dto.userId} in ${dto.scopeType}:${dto.scopeId}`,
    );
    this.eventEmitter.emit('rbac.permission.granted', {
      userId: dto.userId,
      permissionCode: permission.code,
      scopeType: dto.scopeType,
      scopeId: dto.scopeId,
    });

    return this.mapToPermissionGrant(grant);
  }

  /**
   * Deny a permission to a user (override role permissions)
   */
  async denyPermission(dto: GrantPermissionDto, grantedBy?: string): Promise<PermissionGrant> {
    return this.grantPermission(
      {
        ...dto,
        grantType: PermissionGrantType.DENY,
      },
      grantedBy,
    );
  }

  /**
   * Revoke a permission grant
   */
  async revokeGrant(
    userId: string,
    permissionId: string,
    scopeType: ScopeType,
    scopeId: string,
  ): Promise<void> {
    const grant = await this.prisma.permissionGrant.findUnique({
      where: {
        userId_permissionId_scopeType_scopeId: {
          userId,
          permissionId,
          scopeType,
          scopeId,
        },
      },
      include: { permission: true },
    });

    if (!grant) {
      throw new NotFoundException('Permission grant not found');
    }

    await this.prisma.permissionGrant.delete({
      where: { id: grant.id },
    });

    // Invalidate user's permission cache
    this.permissionService.invalidateUserCache(userId);

    this.logger.log(
      `Revoked permission ${grant.permission.code} from user ${userId} in ${scopeType}:${scopeId}`,
    );
    this.eventEmitter.emit('rbac.permission.revoked', {
      userId,
      permissionCode: grant.permission.code,
      scopeType,
      scopeId,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // QUERY OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all direct permission grants for a user
   */
  async getUserGrants(
    userId: string,
    scopeType?: ScopeType,
    scopeId?: string,
  ): Promise<PermissionGrant[]> {
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

    const grants = await this.prisma.permissionGrant.findMany({
      where,
      include: { permission: true },
      orderBy: { grantedAt: 'desc' },
    });

    return grants.map(this.mapToPermissionGrant.bind(this));
  }

  /**
   * Get all users with a specific permission grant
   */
  async getUsersWithPermissionGrant(
    permissionId: string,
    scopeType?: ScopeType,
    scopeId?: string,
  ): Promise<string[]> {
    const where: any = {
      permissionId,
      grantType: PermissionGrantType.ALLOW,
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

    const grants = await this.prisma.permissionGrant.findMany({
      where,
      select: { userId: true },
    });

    return grants.map(g => g.userId);
  }

  /**
   * Get a specific grant
   */
  async getGrant(
    userId: string,
    permissionId: string,
    scopeType: ScopeType,
    scopeId: string,
  ): Promise<PermissionGrant | null> {
    const grant = await this.prisma.permissionGrant.findUnique({
      where: {
        userId_permissionId_scopeType_scopeId: {
          userId,
          permissionId,
          scopeType,
          scopeId,
        },
      },
      include: { permission: true },
    });

    return grant ? this.mapToPermissionGrant(grant) : null;
  }

  // ═══════════════════════════════════════════════════════════════
  // BATCH OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Grant multiple permissions to a user
   */
  async grantMultiplePermissions(
    userId: string,
    permissionIds: string[],
    scopeType: ScopeType,
    scopeId: string,
    grantedBy?: string,
  ): Promise<PermissionGrant[]> {
    const grants: PermissionGrant[] = [];

    for (const permissionId of permissionIds) {
      const grant = await this.grantPermission(
        {
          userId,
          permissionId,
          scopeType,
          scopeId,
        },
        grantedBy,
      );
      grants.push(grant);
    }

    return grants;
  }

  /**
   * Revoke all permissions from a user in a scope
   */
  async revokeAllGrants(
    userId: string,
    scopeType: ScopeType,
    scopeId: string,
  ): Promise<number> {
    const result = await this.prisma.permissionGrant.deleteMany({
      where: {
        userId,
        scopeType,
        scopeId,
      },
    });

    // Invalidate user's permission cache
    this.permissionService.invalidateUserCache(userId);

    this.logger.log(`Revoked ${result.count} permission grants from user ${userId}`);
    return result.count;
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private mapToPermissionGrant(data: any): PermissionGrant {
    return {
      id: data.id,
      userId: data.userId,
      permissionId: data.permissionId,
      scopeType: data.scopeType,
      scopeId: data.scopeId,
      grantType: data.grantType,
      grantedBy: data.grantedBy,
      grantedAt: data.grantedAt,
      expiresAt: data.expiresAt,
      reason: data.reason,
      constraints: data.constraints,
      permission: data.permission ? {
        id: data.permission.id,
        code: data.permission.code,
        name: data.permission.name,
        description: data.permission.description,
        category: data.permission.category,
        createdAt: data.permission.createdAt,
        updatedAt: data.permission.updatedAt,
      } : undefined,
    };
  }
}
