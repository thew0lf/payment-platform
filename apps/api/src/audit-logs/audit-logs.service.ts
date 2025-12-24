import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ScopeType, DataClassification } from '@prisma/client';
import {
  AuditLogEntry,
  CreateAuditLogDto,
  AuditLogQueryDto,
  AuditLogListResponse,
  AuditLogStats,
} from './types/audit-log.types';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new audit log entry
   */
  async create(dto: CreateAuditLogDto): Promise<AuditLogEntry> {
    const log = await this.prisma.auditLog.create({
      data: {
        userId: dto.userId,
        action: dto.action,
        entity: dto.entity,
        entityId: dto.entityId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
        changes: dto.changes as Prisma.InputJsonValue,
        metadata: dto.metadata as Prisma.InputJsonValue,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        dataClassification: dto.dataClassification,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return this.mapToEntry(log);
  }

  /**
   * Log an action (convenience method)
   */
  async log(
    action: string,
    entity: string,
    entityId?: string,
    options?: {
      userId?: string;
      scopeType?: ScopeType;
      scopeId?: string;
      changes?: Record<string, { before: unknown; after: unknown }>;
      metadata?: Record<string, unknown>;
      ipAddress?: string;
      userAgent?: string;
      dataClassification?: DataClassification;
    },
  ): Promise<void> {
    await this.create({
      action,
      entity,
      entityId,
      ...options,
    });
  }

  /**
   * List audit logs with filters and pagination
   */
  async list(query: AuditLogQueryDto): Promise<AuditLogListResponse> {
    const {
      userId,
      action,
      actions,
      entity,
      entities,
      entityId,
      scopeType,
      scopeId,
      dataClassification,
      search,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = query;

    const where: Prisma.AuditLogWhereInput = {};

    // User filter
    if (userId) {
      where.userId = userId;
    }

    // Action filters
    if (action) {
      where.action = action;
    } else if (actions?.length) {
      where.action = { in: actions };
    }

    // Entity filters
    if (entity) {
      where.entity = entity;
    } else if (entities?.length) {
      where.entity = { in: entities };
    }

    if (entityId) {
      where.entityId = entityId;
    }

    // Scope filters
    if (scopeType) {
      where.scopeType = scopeType;
    }
    if (scopeId) {
      where.scopeId = scopeId;
    }

    // Data classification filter
    if (dataClassification) {
      where.dataClassification = dataClassification;
    }

    // Date range filters
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // Search across action, entity, and metadata
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map(this.mapToEntry),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get a single audit log by ID
   */
  async findById(id: string): Promise<AuditLogEntry | null> {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return log ? this.mapToEntry(log) : null;
  }

  /**
   * Get audit log statistics
   */
  async getStats(scopeId?: string, days = 30): Promise<AuditLogStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: Prisma.AuditLogWhereInput = {
      createdAt: { gte: startDate },
    };
    if (scopeId) {
      where.scopeId = scopeId;
    }

    // Get total count
    const totalLogs = await this.prisma.auditLog.count({ where });

    // Get counts by action
    const actionCounts = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: true,
    });
    const logsByAction: Record<string, number> = {};
    actionCounts.forEach((item) => {
      logsByAction[item.action] = item._count;
    });

    // Get counts by entity
    const entityCounts = await this.prisma.auditLog.groupBy({
      by: ['entity'],
      where,
      _count: true,
    });
    const logsByEntity: Record<string, number> = {};
    entityCounts.forEach((item) => {
      logsByEntity[item.entity] = item._count;
    });

    // Get counts by data classification
    const classificationCounts = await this.prisma.auditLog.groupBy({
      by: ['dataClassification'],
      where: { ...where, dataClassification: { not: null } },
      _count: true,
    });
    const logsByClassification: Record<string, number> = {};
    classificationCounts.forEach((item) => {
      if (item.dataClassification) {
        logsByClassification[item.dataClassification] = item._count;
      }
    });

    // Get daily activity for chart (using Prisma instead of raw SQL for SQLite compatibility)
    const recentLogs = await this.prisma.auditLog.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 1000, // Sample last 1000 for chart
    });

    // Group by date
    const dateMap: Record<string, number> = {};
    recentLogs.forEach((log) => {
      const dateStr = log.createdAt.toISOString().split('T')[0];
      dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
    });

    const recentActivity = Object.entries(dateMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    return {
      totalLogs,
      logsByAction,
      logsByEntity,
      logsByClassification,
      recentActivity,
    };
  }

  /**
   * Get audit trail for a specific entity
   * Security: Filters by scope at database level to prevent N+1 query issues
   */
  async getEntityTrail(
    entity: string,
    entityId: string,
    limit = 100,
    scopeFilter?: { scopeType: ScopeType; scopeId: string },
  ): Promise<AuditLogEntry[]> {
    const where: Prisma.AuditLogWhereInput = { entity, entityId };

    // Security: Apply scope filter at database level
    if (scopeFilter) {
      where.scopeType = scopeFilter.scopeType;
      where.scopeId = scopeFilter.scopeId;
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map(this.mapToEntry);
  }

  /**
   * Get available actions for filtering
   */
  async getAvailableActions(): Promise<string[]> {
    const actions = await this.prisma.auditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });
    return actions.map((a) => a.action);
  }

  /**
   * Get available entities for filtering
   */
  async getAvailableEntities(): Promise<string[]> {
    const entities = await this.prisma.auditLog.findMany({
      distinct: ['entity'],
      select: { entity: true },
      orderBy: { entity: 'asc' },
    });
    return entities.map((e) => e.entity);
  }

  /**
   * Map database record to response type
   */
  private mapToEntry(log: any): AuditLogEntry {
    return {
      id: log.id,
      userId: log.userId,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      scopeType: log.scopeType,
      scopeId: log.scopeId,
      changes: log.changes as Record<string, { before: unknown; after: unknown }> | null,
      metadata: log.metadata as Record<string, unknown> | null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      dataClassification: log.dataClassification,
      createdAt: log.createdAt,
      user: log.user,
    };
  }
}
