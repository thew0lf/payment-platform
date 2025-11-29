import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyService, UserContext } from '../hierarchy/hierarchy.service';
import {
  SOFT_DELETE_MODELS,
  RETENTION_PERIODS,
  CASCADE_RELATIONSHIPS,
  IMMUTABLE_MODELS,
  DELETE_PERMISSIONS,
  RESTORE_PERMISSIONS,
  canDelete,
  canRestore,
  getParentField,
  SoftDeleteModel,
  PermanentDeleteReason,
} from './soft-delete.constants';
import {
  DeletedRecord,
  DeletionPreview,
  DeletionDetails,
  DeleteResult,
  RestoreResult,
  PurgeResult,
} from './soft-delete.dto';

interface DeleteContext {
  userId: string;
  userRole: string;
  reason?: string;
  cascadeId: string;
  cascadedFrom?: string;
}

@Injectable()
export class SoftDeleteService {
  private readonly logger = new Logger(SoftDeleteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // PREVIEW DELETION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Preview the impact of deleting an entity
   * Shows cascade count and warnings
   */
  async previewDelete(
    entityType: SoftDeleteModel,
    entityId: string,
    user: UserContext,
    userRole: string,
  ): Promise<DeletionPreview> {
    // Check permission
    if (!canDelete(userRole, entityType)) {
      throw new ForbiddenException(`Role ${userRole} cannot delete ${entityType}`);
    }

    // Get entity and validate access
    const entity = await this.getEntity(entityType, entityId);
    if (!entity) {
      throw new NotFoundException(`${entityType} not found`);
    }

    await this.validateAccess(entityType, entity, user);

    // Calculate cascade counts
    const cascadeCount = await this.calculateCascadeCount(entityType, entityId);
    const totalAffected = Object.values(cascadeCount).reduce((sum, count) => sum + count, 0) + 1;

    // Generate warnings
    const warnings: string[] = [];

    if (totalAffected > 10) {
      warnings.push(`This will affect ${totalAffected} records including cascaded entities`);
    }

    if (entityType === 'Client' || entityType === 'Company') {
      warnings.push('This is a high-level entity. Deletion will cascade to many related records.');
    }

    if (cascadeCount['Order'] > 0) {
      warnings.push(`${cascadeCount['Order']} orders will be soft-deleted (transactions preserved)`);
    }

    if (cascadeCount['Subscription'] > 0) {
      warnings.push(`${cascadeCount['Subscription']} active subscriptions will be soft-deleted`);
    }

    return {
      entity: {
        id: entityId,
        name: this.getEntityName(entity),
        type: entityType,
      },
      cascadeCount,
      totalAffected,
      warnings,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOFT DELETE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Soft delete an entity with cascade support
   */
  async softDelete(
    entityType: SoftDeleteModel,
    entityId: string,
    user: UserContext,
    userRole: string,
    reason?: string,
    cascade: boolean = true,
  ): Promise<DeleteResult> {
    // Validate permission
    if (!canDelete(userRole, entityType)) {
      throw new ForbiddenException(`Role ${userRole} cannot delete ${entityType}`);
    }

    // Get and validate entity
    const entity = await this.getEntity(entityType, entityId);
    if (!entity) {
      throw new NotFoundException(`${entityType} not found`);
    }

    // Check if already deleted
    if (entity.deletedAt) {
      throw new BadRequestException(`${entityType} is already deleted`);
    }

    await this.validateAccess(entityType, entity, user);

    // Generate cascade ID for grouping related deletions
    const cascadeId = this.generateCascadeId();

    const context: DeleteContext = {
      userId: user.sub,
      userRole,
      reason,
      cascadeId,
    };

    let affectedCount = 0;

    await this.prisma.$transaction(async (tx) => {
      // Delete the main entity
      await this.markEntityDeleted(tx, entityType, entityId, context);
      affectedCount++;

      // Log the deletion
      await this.logDeletion(tx, entityType, entityId, entity, context);

      // Handle cascade deletions
      if (cascade) {
        const cascadeAffected = await this.cascadeDelete(tx, entityType, entityId, context);
        affectedCount += cascadeAffected;
      }
    });

    this.logger.log(`Soft deleted ${entityType}:${entityId} with ${affectedCount} affected records`);

    return {
      success: true,
      message: `${entityType} deleted successfully`,
      cascadeId,
      affectedCount,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTORE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Restore a soft-deleted entity
   */
  async restore(
    entityType: SoftDeleteModel,
    entityId: string,
    user: UserContext,
    userRole: string,
    cascade: boolean = true,
  ): Promise<RestoreResult> {
    // Validate permission
    if (!canRestore(userRole, entityType)) {
      throw new ForbiddenException(`Role ${userRole} cannot restore ${entityType}`);
    }

    // Get entity (including deleted)
    const entity = await this.getEntity(entityType, entityId, true);
    if (!entity) {
      throw new NotFoundException(`${entityType} not found`);
    }

    // Check if actually deleted
    if (!entity.deletedAt) {
      throw new BadRequestException(`${entityType} is not deleted`);
    }

    // Check if parent is deleted (can't restore without parent)
    const parentBlocked = await this.isParentDeleted(entityType, entity);
    if (parentBlocked) {
      throw new BadRequestException(
        `Cannot restore: parent entity is still deleted. Restore the parent first.`,
      );
    }

    await this.validateAccess(entityType, entity, user, true);

    let restoredCount = 0;

    await this.prisma.$transaction(async (tx) => {
      // Get the cascade ID from deletion log
      const cascadeId = entity.cascadeId;

      // Restore the main entity
      await this.markEntityRestored(tx, entityType, entityId);
      restoredCount++;

      // Handle cascade restore
      if (cascade && cascadeId) {
        const cascadeRestored = await this.cascadeRestore(tx, cascadeId, entityId);
        restoredCount += cascadeRestored;
      }

      // Update deletion log
      await tx.deletionLog.updateMany({
        where: {
          entityType,
          entityId,
          restoredAt: null,
        },
        data: {
          restoredAt: new Date(),
          restoredBy: user.sub,
        },
      });
    });

    this.logger.log(`Restored ${entityType}:${entityId} with ${restoredCount} total records`);

    return {
      success: true,
      message: `${entityType} restored successfully`,
      restoredCount,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST DELETED RECORDS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List all deleted records accessible to the user
   */
  async listDeleted(
    user: UserContext,
    options: {
      entityType?: SoftDeleteModel;
      search?: string;
      deletedAfter?: Date;
      deletedBefore?: Date;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ items: DeletedRecord[]; total: number }> {
    const { entityType, search, deletedAfter, deletedBefore, limit = 50, offset = 0 } = options;

    // Build where clause
    const where: any = {
      restoredAt: null,
    };

    if (entityType) {
      where.entityType = entityType;
    }

    if (deletedAfter || deletedBefore) {
      where.deletedAt = {};
      if (deletedAfter) where.deletedAt.gte = deletedAfter;
      if (deletedBefore) where.deletedAt.lte = deletedBefore;
    }

    if (search) {
      where.entityName = { contains: search, mode: 'insensitive' };
    }

    // Apply scope filter based on user access
    const accessibleCompanyIds = await this.hierarchyService.getAccessibleCompanyIds(user);
    if (accessibleCompanyIds.length > 0 && user.scopeType !== 'ORGANIZATION') {
      where.companyId = { in: accessibleCompanyIds };
    }

    // Query deletion logs
    const [logs, total] = await Promise.all([
      this.prisma.deletionLog.findMany({
        where,
        include: {
          deletedByUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { deletedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.deletionLog.count({ where }),
    ]);

    // Transform to response format
    const items: DeletedRecord[] = logs.map((log) => ({
      id: log.entityId,
      entityType: log.entityType as SoftDeleteModel,
      entityName: log.entityName,
      deletedAt: log.deletedAt,
      deletedBy: log.deletedByUser
        ? {
            id: log.deletedByUser.id,
            name: [log.deletedByUser.firstName, log.deletedByUser.lastName]
              .filter(Boolean)
              .join(' ') || null,
            email: log.deletedByUser.email,
          }
        : null,
      deleteReason: log.reason,
      cascadedFrom: log.cascadedFrom,
      canRestore: this.canEntityBeRestored(log),
      expiresAt: this.calculateExpirationDate(log.entityType as SoftDeleteModel, log.deletedAt),
      cascadedCount: 0, // Will be populated if needed
    }));

    return { items, total };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET DELETION DETAILS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get detailed information about a deleted entity
   */
  async getDeletionDetails(
    entityType: SoftDeleteModel,
    entityId: string,
    user: UserContext,
  ): Promise<DeletionDetails> {
    // Find the deletion log
    const log = await this.prisma.deletionLog.findFirst({
      where: {
        entityType,
        entityId,
        restoredAt: null,
      },
      include: {
        deletedByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!log) {
      throw new NotFoundException(`Deletion record not found for ${entityType}:${entityId}`);
    }

    // Get cascade records
    const cascadeRecords = await this.prisma.deletionLog.findMany({
      where: {
        cascadeId: log.cascadeId,
        entityId: { not: entityId },
        restoredAt: null,
      },
      select: {
        entityType: true,
        entityId: true,
        entityName: true,
      },
    });

    const retentionDays = RETENTION_PERIODS[entityType];
    const expiresAt = this.calculateExpirationDate(entityType, log.deletedAt);

    return {
      id: log.id,
      entityType: log.entityType as SoftDeleteModel,
      entityId: log.entityId,
      entityName: log.entityName,
      deletedAt: log.deletedAt,
      deletedBy: log.deletedByUser
        ? {
            id: log.deletedByUser.id,
            name: [log.deletedByUser.firstName, log.deletedByUser.lastName]
              .filter(Boolean)
              .join(' ') || null,
            email: log.deletedByUser.email,
          }
        : null,
      deleteReason: log.reason,
      canRestore: this.canEntityBeRestored(log),
      expiresAt,
      retentionDays,
      cascadeRecords,
      snapshot: log.snapshot as Record<string, unknown> | null,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMANENT DELETE (GDPR / Retention Purge)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Permanently delete an entity (irreversible)
   * Only for GDPR requests or retention expiry
   */
  async permanentlyDelete(
    entityType: SoftDeleteModel,
    entityId: string,
    user: UserContext,
    userRole: string,
    reason: PermanentDeleteReason,
  ): Promise<DeleteResult> {
    // Only SUPER_ADMIN can permanently delete
    if (userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can permanently delete records');
    }

    // Verify entity is soft-deleted first
    const entity = await this.getEntity(entityType, entityId, true);
    if (!entity) {
      throw new NotFoundException(`${entityType} not found`);
    }

    if (!entity.deletedAt) {
      throw new BadRequestException('Entity must be soft-deleted before permanent deletion');
    }

    // For GDPR, anonymize instead of delete where possible
    if (reason === 'GDPR_REQUEST' && (entityType === 'Customer' || entityType === 'User')) {
      return this.anonymizeEntity(entityType, entityId, user);
    }

    await this.prisma.$transaction(async (tx) => {
      // Get cascade ID
      const log = await tx.deletionLog.findFirst({
        where: { entityType, entityId },
      });

      if (log?.cascadeId) {
        // Delete all cascade records first
        await this.permanentDeleteCascade(tx, log.cascadeId);
      }

      // Delete the main entity
      await this.hardDeleteEntity(tx, entityType, entityId);

      // Update deletion log to mark as purged
      await tx.deletionLog.updateMany({
        where: { entityType, entityId },
        data: { purgedAt: new Date(), purgeReason: reason },
      });
    });

    this.logger.warn(`Permanently deleted ${entityType}:${entityId} (reason: ${reason})`);

    return {
      success: true,
      message: `${entityType} permanently deleted`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RETENTION PURGE (Scheduled Job)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Purge expired soft-deleted records
   * Should be run by scheduled job
   */
  async purgeExpiredRecords(): Promise<PurgeResult> {
    const purged: Record<string, number> = {};
    let totalPurged = 0;

    for (const entityType of SOFT_DELETE_MODELS) {
      const retentionDays = RETENTION_PERIODS[entityType];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Find expired deletion logs
      const expiredLogs = await this.prisma.deletionLog.findMany({
        where: {
          entityType,
          deletedAt: { lt: cutoffDate },
          restoredAt: null,
          purgedAt: null,
        },
        select: { entityId: true, cascadeId: true },
      });

      for (const log of expiredLogs) {
        try {
          await this.prisma.$transaction(async (tx) => {
            // Hard delete the entity
            await this.hardDeleteEntity(tx, entityType as SoftDeleteModel, log.entityId);

            // Mark as purged
            await tx.deletionLog.updateMany({
              where: { entityType, entityId: log.entityId },
              data: { purgedAt: new Date(), purgeReason: 'RETENTION_EXPIRED' },
            });
          });

          purged[entityType] = (purged[entityType] || 0) + 1;
          totalPurged++;
        } catch (error) {
          this.logger.error(`Failed to purge ${entityType}:${log.entityId}`, error);
        }
      }
    }

    this.logger.log(`Purge completed: ${totalPurged} records removed`);

    return { purged, totalPurged };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private generateCascadeId(): string {
    return `cascade_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private async getEntity(
    entityType: SoftDeleteModel,
    entityId: string,
    includeDeleted: boolean = false,
  ): Promise<any> {
    const model = this.getModelDelegate(entityType);
    const where: any = { id: entityId };

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    return model.findFirst({ where });
  }

  private getModelDelegate(entityType: SoftDeleteModel): any {
    const modelMap: Record<SoftDeleteModel, any> = {
      Client: this.prisma.client,
      Company: this.prisma.company,
      Department: this.prisma.department,
      User: this.prisma.user,
      Customer: this.prisma.customer,
      CustomerAddress: this.prisma.address,
      Subscription: this.prisma.subscription,
      Order: this.prisma.order,
      Product: this.prisma.product,
      MerchantAccount: this.prisma.merchantAccount,
      RoutingRule: this.prisma.routingRule,
      Webhook: this.prisma.webhook,
    };

    return modelMap[entityType];
  }

  private getEntityName(entity: any): string {
    return entity.name || entity.email || entity.sku || entity.orderNumber || entity.id;
  }

  private async validateAccess(
    entityType: SoftDeleteModel,
    entity: any,
    user: UserContext,
    forRestore: boolean = false,
  ): Promise<void> {
    // Get the company ID from the entity
    let companyId: string | null = null;

    switch (entityType) {
      case 'Client':
        // Clients have many companies - check org access
        if (user.scopeType !== 'ORGANIZATION') {
          throw new ForbiddenException('Only organization admins can manage clients');
        }
        return;

      case 'Company':
        companyId = entity.id;
        break;

      case 'Department':
      case 'Customer':
      case 'Product':
      case 'Order':
      case 'Subscription':
      case 'MerchantAccount':
      case 'RoutingRule':
      case 'Webhook':
        companyId = entity.companyId;
        break;

      case 'User':
        companyId = entity.companyId;
        break;

      case 'CustomerAddress':
        const customer = await this.prisma.customer.findUnique({
          where: { id: entity.customerId },
          select: { companyId: true },
        });
        companyId = customer?.companyId || null;
        break;
    }

    if (companyId) {
      const hasAccess = await this.hierarchyService.canAccessCompany(user, companyId);
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this entity');
      }
    }
  }

  private async calculateCascadeCount(
    entityType: SoftDeleteModel,
    entityId: string,
  ): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    const children = CASCADE_RELATIONSHIPS[entityType] || [];

    for (const childType of children) {
      const parentField = getParentField(entityType, childType);
      const model = this.getModelDelegate(childType);

      const count = await model.count({
        where: {
          [parentField]: entityId,
          deletedAt: null,
        },
      });

      if (count > 0) {
        counts[childType] = count;

        // Recursively count grandchildren
        const childIds = await model.findMany({
          where: { [parentField]: entityId, deletedAt: null },
          select: { id: true },
        });

        for (const child of childIds) {
          const grandchildCounts = await this.calculateCascadeCount(childType, child.id);
          for (const [grandchildType, grandchildCount] of Object.entries(grandchildCounts)) {
            counts[grandchildType] = (counts[grandchildType] || 0) + grandchildCount;
          }
        }
      }
    }

    return counts;
  }

  private async markEntityDeleted(
    tx: any,
    entityType: SoftDeleteModel,
    entityId: string,
    context: DeleteContext,
  ): Promise<void> {
    const model = this.getTxModelDelegate(tx, entityType);

    await model.update({
      where: { id: entityId },
      data: {
        deletedAt: new Date(),
        deletedBy: context.userId,
        cascadeId: context.cascadeId,
      },
    });
  }

  private async markEntityRestored(
    tx: any,
    entityType: SoftDeleteModel,
    entityId: string,
  ): Promise<void> {
    const model = this.getTxModelDelegate(tx, entityType);

    await model.update({
      where: { id: entityId },
      data: {
        deletedAt: null,
        deletedBy: null,
        cascadeId: null,
      },
    });
  }

  private getTxModelDelegate(tx: any, entityType: SoftDeleteModel): any {
    const modelMap: Record<SoftDeleteModel, any> = {
      Client: tx.client,
      Company: tx.company,
      Department: tx.department,
      User: tx.user,
      Customer: tx.customer,
      CustomerAddress: tx.address,
      Subscription: tx.subscription,
      Order: tx.order,
      Product: tx.product,
      MerchantAccount: tx.merchantAccount,
      RoutingRule: tx.routingRule,
      Webhook: tx.webhook,
    };

    return modelMap[entityType];
  }

  private async logDeletion(
    tx: any,
    entityType: SoftDeleteModel,
    entityId: string,
    entity: any,
    context: DeleteContext,
  ): Promise<void> {
    // Get company ID for filtering
    let companyId: string | null = null;
    if ('companyId' in entity) {
      companyId = entity.companyId;
    } else if (entityType === 'Company') {
      companyId = entity.id;
    }

    await tx.deletionLog.create({
      data: {
        entityType,
        entityId,
        entityName: this.getEntityName(entity),
        companyId,
        deletedBy: context.userId,
        deletedAt: new Date(),
        reason: context.reason,
        cascadeId: context.cascadeId,
        cascadedFrom: context.cascadedFrom,
        snapshot: entity,
        expiresAt: this.calculateExpirationDate(entityType, new Date()),
      },
    });
  }

  private async cascadeDelete(
    tx: any,
    entityType: SoftDeleteModel,
    entityId: string,
    context: DeleteContext,
  ): Promise<number> {
    let affected = 0;
    const children = CASCADE_RELATIONSHIPS[entityType] || [];

    for (const childType of children) {
      const parentField = getParentField(entityType, childType);
      const model = this.getTxModelDelegate(tx, childType);

      // Get all child entities
      const childEntities = await model.findMany({
        where: {
          [parentField]: entityId,
          deletedAt: null,
        },
      });

      for (const child of childEntities) {
        // Mark child as deleted
        await this.markEntityDeleted(tx, childType, child.id, {
          ...context,
          cascadedFrom: entityId,
        });

        // Log the cascade deletion
        await this.logDeletion(tx, childType, child.id, child, {
          ...context,
          cascadedFrom: entityId,
        });

        affected++;

        // Recursively cascade to grandchildren
        const grandchildAffected = await this.cascadeDelete(tx, childType, child.id, context);
        affected += grandchildAffected;
      }
    }

    return affected;
  }

  private async cascadeRestore(
    tx: any,
    cascadeId: string,
    excludeEntityId: string,
  ): Promise<number> {
    // Find all cascaded deletions with same cascade ID
    const cascadeLogs = await tx.deletionLog.findMany({
      where: {
        cascadeId,
        entityId: { not: excludeEntityId },
        restoredAt: null,
      },
      orderBy: { deletedAt: 'asc' }, // Restore parents before children
    });

    let restored = 0;

    for (const log of cascadeLogs) {
      const entityType = log.entityType as SoftDeleteModel;
      await this.markEntityRestored(tx, entityType, log.entityId);

      await tx.deletionLog.update({
        where: { id: log.id },
        data: { restoredAt: new Date() },
      });

      restored++;
    }

    return restored;
  }

  private async isParentDeleted(entityType: SoftDeleteModel, entity: any): Promise<boolean> {
    // Check each possible parent relationship
    const parentChecks: Record<SoftDeleteModel, () => Promise<boolean>> = {
      Company: async () => {
        if (entity.clientId) {
          const client = await this.prisma.client.findUnique({
            where: { id: entity.clientId },
            select: { deletedAt: true },
          });
          return !!client?.deletedAt;
        }
        return false;
      },
      Department: async () => {
        if (entity.companyId) {
          const company = await this.prisma.company.findUnique({
            where: { id: entity.companyId },
            select: { deletedAt: true },
          });
          return !!company?.deletedAt;
        }
        return false;
      },
      Customer: async () => {
        if (entity.companyId) {
          const company = await this.prisma.company.findUnique({
            where: { id: entity.companyId },
            select: { deletedAt: true },
          });
          return !!company?.deletedAt;
        }
        return false;
      },
      CustomerAddress: async () => {
        if (entity.customerId) {
          const customer = await this.prisma.customer.findUnique({
            where: { id: entity.customerId },
            select: { deletedAt: true },
          });
          return !!customer?.deletedAt;
        }
        return false;
      },
      Subscription: async () => {
        if (entity.customerId) {
          const customer = await this.prisma.customer.findUnique({
            where: { id: entity.customerId },
            select: { deletedAt: true },
          });
          return !!customer?.deletedAt;
        }
        return false;
      },
      Client: async () => false,
      User: async () => false,
      Order: async () => false,
      Product: async () => false,
      MerchantAccount: async () => false,
      RoutingRule: async () => false,
      Webhook: async () => false,
    };

    const check = parentChecks[entityType];
    return check ? check() : false;
  }

  private calculateExpirationDate(entityType: SoftDeleteModel, deletedAt: Date): Date {
    const retentionDays = RETENTION_PERIODS[entityType];
    const expiresAt = new Date(deletedAt);
    expiresAt.setDate(expiresAt.getDate() + retentionDays);
    return expiresAt;
  }

  private canEntityBeRestored(log: any): boolean {
    // Can't restore if already purged
    if (log.purgedAt) return false;

    // Can't restore if expired
    const expiresAt = this.calculateExpirationDate(log.entityType as SoftDeleteModel, log.deletedAt);
    if (new Date() > expiresAt) return false;

    return true;
  }

  private async anonymizeEntity(
    entityType: SoftDeleteModel,
    entityId: string,
    user: UserContext,
  ): Promise<DeleteResult> {
    if (entityType === 'Customer') {
      await this.prisma.customer.update({
        where: { id: entityId },
        data: {
          email: `deleted_${entityId}@anonymized.local`,
          firstName: 'GDPR',
          lastName: 'Deleted',
          phone: null,
          metadata: {},
        },
      });
    } else if (entityType === 'User') {
      await this.prisma.user.update({
        where: { id: entityId },
        data: {
          email: `deleted_${entityId}@anonymized.local`,
          firstName: 'GDPR',
          lastName: 'Deleted',
          phone: null,
          passwordHash: null,
        },
      });
    }

    this.logger.warn(`Anonymized ${entityType}:${entityId} for GDPR compliance`);

    return {
      success: true,
      message: `${entityType} anonymized for GDPR compliance`,
    };
  }

  private async hardDeleteEntity(
    tx: any,
    entityType: SoftDeleteModel,
    entityId: string,
  ): Promise<void> {
    const model = this.getTxModelDelegate(tx, entityType);
    await model.delete({ where: { id: entityId } });
  }

  private async permanentDeleteCascade(tx: any, cascadeId: string): Promise<void> {
    // Get all cascade records in reverse order (children first)
    const cascadeLogs = await tx.deletionLog.findMany({
      where: { cascadeId },
      orderBy: { deletedAt: 'desc' },
    });

    for (const log of cascadeLogs) {
      try {
        await this.hardDeleteEntity(tx, log.entityType as SoftDeleteModel, log.entityId);
      } catch (error) {
        // Entity might already be deleted or have referential issues
        this.logger.warn(`Could not hard delete ${log.entityType}:${log.entityId}`);
      }
    }
  }
}
