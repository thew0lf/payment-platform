/**
 * Affiliate Conversions Service
 *
 * Dedicated service for managing affiliate conversions.
 * Handles conversion CRUD operations, status updates, and approval workflows.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AuditAction, AuditEntity } from '../../audit-logs/types/audit-log.types';
import { DataClassification, Prisma, ConversionStatus } from '@prisma/client';

export interface ConversionFilters {
  companyId?: string;
  partnerId?: string;
  linkId?: string;
  status?: ConversionStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateConversionDto {
  status?: ConversionStatus;
  rejectionReason?: string;
  reversalReason?: string;
  reversalAmount?: number;
}

export interface ConversionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  reversed: number;
  totalRevenue: number;
  totalCommissions: number;
  conversionRate?: number;
  averageOrderValue?: number;
  averageCommission?: number;
}

export interface ExtendedStatsFilters {
  companyId?: string;
  partnerId?: string;
  linkId?: string;
  startDate?: string;
  endDate?: string;
}

export interface SubIdBreakdownFilters {
  companyId?: string;
  partnerId?: string;
  linkId?: string;
  startDate?: string;
  endDate?: string;
  groupBy: 'subId1' | 'subId2' | 'subId3' | 'subId4' | 'subId5';
  limit?: number;
}

export interface RecordConversionInput {
  companyId: string;
  orderId: string;
  orderNumber?: string;
  saleAmount: number;
  currency?: string;
  customerId?: string;
  isFirstPurchase?: boolean;
  clickId?: string;
  visitorId?: string;
  sessionId?: string;
  affiliateCode?: string;
  t1?: string;
  t2?: string;
  t3?: string;
  t4?: string;
  t5?: string;
  idempotencyKey?: string;
}

export interface PartnershipCommissionInfo {
  commissionRate: number;
  commissionFlat?: number;
  secondTierRate?: number;
  tier?: string;
}

@Injectable()
export class AffiliateConversionsService {
  private readonly logger = new Logger(AffiliateConversionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * List conversions with filters
   */
  async findAll(user: UserContext, filters: ConversionFilters) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    let targetCompanyIds = companyIds;
    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const where: Prisma.AffiliateConversionWhereInput = {
      companyId: { in: targetCompanyIds },
    };

    if (filters.partnerId) {
      where.partnerId = filters.partnerId;
    }

    if (filters.linkId) {
      where.linkId = filters.linkId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.convertedAt = {};
      if (filters.startDate) where.convertedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.convertedAt.lte = new Date(filters.endDate);
    }

    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
        { orderId: { contains: filters.search, mode: 'insensitive' } },
        { partner: { email: { contains: filters.search, mode: 'insensitive' } } },
        { partner: { affiliateCode: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;

    const [conversions, total] = await Promise.all([
      this.prisma.affiliateConversion.findMany({
        where,
        include: {
          partner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
              affiliateCode: true,
              tier: true,
            },
          },
          link: {
            select: {
              id: true,
              name: true,
              trackingCode: true,
              campaign: true,
            },
          },
          company: {
            select: { id: true, name: true, slug: true },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
            },
          },
        },
        orderBy: { convertedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.affiliateConversion.count({ where }),
    ]);

    return { conversions, total, limit, offset };
  }

  /**
   * Get a single conversion by ID
   */
  async findById(user: UserContext, conversionId: string) {
    const conversion = await this.prisma.affiliateConversion.findUnique({
      where: { id: conversionId },
      include: {
        partner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
            affiliateCode: true,
            tier: true,
            commissionRate: true,
          },
        },
        link: {
          select: {
            id: true,
            name: true,
            trackingCode: true,
            campaign: true,
            source: true,
            medium: true,
          },
        },
        company: {
          select: { id: true, name: true, slug: true },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
          },
        },
        // Note: click is accessed via clickId, not a relation
      },
    });

    if (!conversion) {
      throw new NotFoundException('Conversion not found');
    }

    // Verify user has access to this company
    await this.hierarchyService.validateCompanyAccess(
      user,
      conversion.companyId,
      'view affiliate conversion',
    );

    return conversion;
  }

  /**
   * Update conversion status
   */
  async update(user: UserContext, conversionId: string, dto: UpdateConversionDto) {
    const conversion = await this.findById(user, conversionId);
    const previousStatus = conversion.status;

    const updateData: Prisma.AffiliateConversionUpdateInput = {};

    if (dto.status !== undefined) {
      updateData.status = dto.status;

      // Handle status-specific updates
      if (dto.status === 'APPROVED') {
        updateData.approvedAt = new Date();
        updateData.approvedBy = user.sub;
      } else if (dto.status === 'REJECTED') {
        updateData.rejectedAt = new Date();
        updateData.rejectReason = dto.rejectionReason;
      } else if (dto.status === 'REVERSED') {
        updateData.reversedAt = new Date();
        updateData.reversalReason = dto.reversalReason;
        updateData.reversalAmount = dto.reversalAmount ?? conversion.commissionAmount;
      }
    }

    // Update conversion
    const updated = await this.prisma.$transaction(async (tx) => {
      const conv = await tx.affiliateConversion.update({
        where: { id: conversionId },
        data: updateData,
        include: {
          partner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
              affiliateCode: true,
            },
          },
          link: {
            select: {
              id: true,
              name: true,
              trackingCode: true,
            },
          },
          company: {
            select: { id: true, name: true, slug: true },
          },
        },
      });

      // Handle partner balance changes based on status transition
      if (dto.status === 'APPROVED' && previousStatus === 'PENDING') {
        // Commission already credited on conversion, no change needed
      } else if (dto.status === 'REJECTED' && previousStatus === 'PENDING') {
        // Deduct commission from partner balance
        await tx.affiliatePartner.update({
          where: { id: conversion.partnerId },
          data: {
            currentBalance: { decrement: conversion.commissionAmount },
            totalEarnings: { decrement: conversion.commissionAmount },
            totalConversions: { decrement: 1 },
          },
        });
      } else if (dto.status === 'REVERSED' && previousStatus === 'APPROVED') {
        // Reverse commission
        const reversalAmount = dto.reversalAmount ?? conversion.commissionAmount;
        await tx.affiliatePartner.update({
          where: { id: conversion.partnerId },
          data: {
            currentBalance: { decrement: reversalAmount },
            totalEarnings: { decrement: reversalAmount },
          },
        });
      }

      return conv;
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.UPDATE,
      AuditEntity.AFFILIATE_CONVERSION,
      conversionId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.CONFIDENTIAL,
        changes: {
          status: { before: previousStatus, after: updated.status },
        },
      },
    );

    return updated;
  }

  /**
   * Approve a pending conversion
   */
  async approve(user: UserContext, conversionId: string) {
    const conversion = await this.findById(user, conversionId);

    if (conversion.status !== 'PENDING') {
      throw new BadRequestException('Only pending conversions can be approved');
    }

    return this.update(user, conversionId, { status: 'APPROVED' });
  }

  /**
   * Reject a pending conversion
   */
  async reject(user: UserContext, conversionId: string, reason?: string) {
    const conversion = await this.findById(user, conversionId);

    if (conversion.status !== 'PENDING') {
      throw new BadRequestException('Only pending conversions can be rejected');
    }

    return this.update(user, conversionId, {
      status: 'REJECTED',
      rejectionReason: reason,
    });
  }

  /**
   * Reverse an approved conversion (e.g., due to refund or chargeback)
   */
  async reverse(
    user: UserContext,
    conversionId: string,
    reason: string,
    amount?: number,
  ) {
    const conversion = await this.findById(user, conversionId);

    if (conversion.status !== 'APPROVED') {
      throw new BadRequestException('Only approved conversions can be reversed');
    }

    return this.update(user, conversionId, {
      status: 'REVERSED',
      reversalReason: reason,
      reversalAmount: amount,
    });
  }

  /**
   * Bulk approve conversions
   */
  async bulkApprove(user: UserContext, conversionIds: string[]) {
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const id of conversionIds) {
      try {
        await this.approve(user, id);
        results.push({ id, success: true });
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      total: conversionIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Bulk reject conversions
   */
  async bulkReject(user: UserContext, conversionIds: string[], reason?: string) {
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const id of conversionIds) {
      try {
        await this.reject(user, id, reason);
        results.push({ id, success: true });
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      total: conversionIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Get conversion statistics
   */
  async getStats(
    user: UserContext,
    filters: {
      companyId?: string;
      partnerId?: string;
      linkId?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<ConversionStats> {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);
    let targetCompanyIds = companyIds;

    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const where: Prisma.AffiliateConversionWhereInput = {
      companyId: { in: targetCompanyIds },
    };

    if (filters.partnerId) {
      where.partnerId = filters.partnerId;
    }

    if (filters.linkId) {
      where.linkId = filters.linkId;
    }

    if (filters.startDate || filters.endDate) {
      where.convertedAt = {};
      if (filters.startDate) {
        where.convertedAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.convertedAt.lte = new Date(filters.endDate);
      }
    }

    const [total, pending, approved, rejected, reversed, revenueSum, commissionsSum] =
      await Promise.all([
        this.prisma.affiliateConversion.count({ where }),
        this.prisma.affiliateConversion.count({ where: { ...where, status: 'PENDING' } }),
        this.prisma.affiliateConversion.count({ where: { ...where, status: 'APPROVED' } }),
        this.prisma.affiliateConversion.count({ where: { ...where, status: 'REJECTED' } }),
        this.prisma.affiliateConversion.count({ where: { ...where, status: 'REVERSED' } }),
        this.prisma.affiliateConversion.aggregate({
          where: { ...where, status: { in: ['APPROVED', 'PENDING'] } },
          _sum: { orderTotal: true },
        }),
        this.prisma.affiliateConversion.aggregate({
          where: { ...where, status: { in: ['APPROVED', 'PENDING'] } },
          _sum: { commissionAmount: true },
        }),
      ]);

    return {
      total,
      pending,
      approved,
      rejected,
      reversed,
      totalRevenue: revenueSum._sum?.orderTotal || 0,
      totalCommissions: commissionsSum._sum?.commissionAmount || 0,
    };
  }

  /**
   * Get conversions by order ID (for integration with order system)
   */
  async findByOrderId(orderId: string) {
    return this.prisma.affiliateConversion.findFirst({
      where: { orderId },
      include: {
        partner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            affiliateCode: true,
          },
        },
        link: {
          select: {
            id: true,
            name: true,
            trackingCode: true,
          },
        },
      },
    });
  }

  /**
   * Auto-approve conversions older than a threshold (for scheduled job)
   */
  async autoApproveOldConversions(daysOld: number, companyId?: string) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const where: Prisma.AffiliateConversionWhereInput = {
      status: 'PENDING',
      convertedAt: { lte: cutoffDate },
    };

    if (companyId) {
      where.companyId = companyId;
    }

    const pendingConversions = await this.prisma.affiliateConversion.findMany({
      where,
      select: { id: true },
    });

    const result = await this.prisma.affiliateConversion.updateMany({
      where,
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });

    this.logger.log(`Auto-approved ${result.count} conversions older than ${daysOld} days`);

    // Log audit for auto-approval
    for (const conversion of pendingConversions) {
      await this.auditLogsService.log(
        AuditAction.UPDATE,
        AuditEntity.AFFILIATE_CONVERSION,
        conversion.id,
        {
          dataClassification: DataClassification.INTERNAL,
          metadata: {
            action: 'auto_approve',
            daysOld,
          },
        },
      );
    }

    return result;
  }

  /**
   * Record a new conversion (internal use)
   */
  async recordConversion(user: UserContext, input: RecordConversionInput) {
    // Verify user has access to the company
    await this.hierarchyService.validateCompanyAccess(
      user,
      input.companyId,
      'record affiliate conversion',
    );

    // Handle idempotency
    const idempotencyKey = input.idempotencyKey || `conv-${input.orderId}`;

    // Check for existing conversion with same idempotency key
    const existing = await this.prisma.affiliateConversion.findFirst({
      where: { idempotencyKey },
    });

    if (existing) {
      this.logger.debug(`Duplicate conversion detected: ${idempotencyKey}`);
      return { attributed: true, conversionId: existing.id, isDuplicate: true };
    }

    // Find attribution
    const attribution = await this.findAttribution(input);

    if (!attribution) {
      this.logger.debug(`No affiliate attribution found for order ${input.orderId}`);
      return { attributed: false };
    }

    const { partner, link, click, attributionWindow } = attribution;

    // Get company config for commission rates
    const config = await this.prisma.affiliateProgramConfig.findUnique({
      where: { companyId: input.companyId },
    });

    // Calculate commission
    const commissionResult = this.calculateCommission(
      input.saleAmount,
      {
        commissionRate: partner.commissionRate ?? config?.defaultCommissionRate ?? 10,
        commissionFlat: partner.commissionFlat,
        secondTierRate: partner.secondTierRate ?? config?.defaultSecondTierRate ?? 0,
        tier: partner.tier,
      },
    );

    // Extract SubIDs from click or input for storage on conversion
    // This allows direct querying of conversions by SubID without joining clicks
    const subIdData = {
      subId1: click?.subId1 || input.t1 || null,
      subId2: click?.subId2 || input.t2 || null,
      subId3: click?.subId3 || input.t3 || null,
      subId4: click?.subId4 || input.t4 || null,
      subId5: click?.subId5 || input.t5 || null,
    };

    const conversion = await this.prisma.$transaction(async (tx) => {
      const conv = await tx.affiliateConversion.create({
        data: {
          partnerId: partner.id,
          linkId: link?.id,
          companyId: input.companyId,
          clickId: click?.id,
          orderId: input.orderId,
          orderNumber: input.orderNumber,
          orderTotal: input.saleAmount,
          currency: input.currency || 'USD',
          commissionRate: commissionResult.commissionRate,
          commissionAmount: commissionResult.commissionAmount,
          secondTierAmount: commissionResult.secondTierAmount,
          attributionWindow,
          isFirstPurchase: input.isFirstPurchase ?? false,
          customerId: input.customerId,
          // Store SubIDs directly on conversion for easier reporting
          // These fields are added via migration 20260131210000
          ...subIdData,
          status: 'PENDING',
          idempotencyKey,
        } as any, // Type cast needed until Prisma client is regenerated
      });

      // Update partner metrics
      await tx.affiliatePartner.update({
        where: { id: partner.id },
        data: {
          totalConversions: { increment: 1 },
          totalRevenue: { increment: input.saleAmount },
          totalEarnings: { increment: commissionResult.commissionAmount },
          currentBalance: { increment: commissionResult.commissionAmount },
          lastActivityAt: new Date(),
        },
      });

      return conv;
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.CREATE,
      AuditEntity.AFFILIATE_CONVERSION,
      conversion.id,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.CONFIDENTIAL,
        metadata: {
          orderId: input.orderId,
          partnerId: partner.id,
          commissionAmount: commissionResult.commissionAmount,
          attributionType: click ? 'click' : 'direct',
          attributionWindow,
        },
      },
    );

    return {
      attributed: true,
      conversionId: conversion.id,
      partnerId: partner.id,
      commissionAmount: commissionResult.commissionAmount,
    };
  }

  /**
   * Update conversion status with audit trail
   */
  async updateStatus(
    user: UserContext,
    conversionId: string,
    status: ConversionStatus,
    reason?: string,
  ) {
    const conversion = await this.findById(user, conversionId);
    const previousStatus = conversion.status;

    // Validate status transitions
    this.validateStatusTransition(previousStatus, status);

    const updateDto: UpdateConversionDto = { status };

    if (status === 'REJECTED') {
      updateDto.rejectionReason = reason;
    } else if (status === 'REVERSED') {
      updateDto.reversalReason = reason;
    }

    return this.update(user, conversionId, updateDto);
  }

  /**
   * Get extended conversion statistics with filters
   */
  async getExtendedStats(
    user: UserContext,
    filters: ExtendedStatsFilters,
  ): Promise<ConversionStats> {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);
    let targetCompanyIds = companyIds;

    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const where: Prisma.AffiliateConversionWhereInput = {
      companyId: { in: targetCompanyIds },
    };

    if (filters.partnerId) {
      where.partnerId = filters.partnerId;
    }

    if (filters.linkId) {
      where.linkId = filters.linkId;
    }

    if (filters.startDate || filters.endDate) {
      where.convertedAt = {};
      if (filters.startDate) where.convertedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.convertedAt.lte = new Date(filters.endDate);
    }

    const [total, pending, approved, rejected, reversed, aggregates, clickCount] =
      await Promise.all([
        this.prisma.affiliateConversion.count({ where }),
        this.prisma.affiliateConversion.count({ where: { ...where, status: 'PENDING' } }),
        this.prisma.affiliateConversion.count({ where: { ...where, status: 'APPROVED' } }),
        this.prisma.affiliateConversion.count({ where: { ...where, status: 'REJECTED' } }),
        this.prisma.affiliateConversion.count({ where: { ...where, status: 'REVERSED' } }),
        this.prisma.affiliateConversion.aggregate({
          where: { ...where, status: { in: ['APPROVED', 'PENDING'] } },
          _sum: { orderTotal: true, commissionAmount: true },
          _avg: { orderTotal: true, commissionAmount: true },
        }),
        // Get click count for conversion rate calculation
        this.prisma.affiliateClick.count({
          where: {
            companyId: { in: targetCompanyIds },
            ...(filters.partnerId && { partnerId: filters.partnerId }),
            ...(filters.linkId && { linkId: filters.linkId }),
            ...(filters.startDate || filters.endDate ? {
              clickedAt: {
                ...(filters.startDate && { gte: new Date(filters.startDate) }),
                ...(filters.endDate && { lte: new Date(filters.endDate) }),
              },
            } : {}),
          },
        }),
      ]);

    const conversionRate = clickCount > 0 ? ((approved + pending) / clickCount) * 100 : 0;

    return {
      total,
      pending,
      approved,
      rejected,
      reversed,
      totalRevenue: aggregates._sum?.orderTotal || 0,
      totalCommissions: aggregates._sum?.commissionAmount || 0,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageOrderValue: Math.round((aggregates._avg?.orderTotal || 0) * 100) / 100,
      averageCommission: Math.round((aggregates._avg?.commissionAmount || 0) * 100) / 100,
    };
  }

  /**
   * Get conversion breakdown by SubID
   *
   * Supports both t1-t5 and subId1-subId5 naming conventions.
   * Queries from the direct SubID fields on AffiliateConversion for better performance.
   */
  async getStatsBySubId(user: UserContext, filters: SubIdBreakdownFilters) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);
    let targetCompanyIds = companyIds;

    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    // Normalize groupBy field - accept both t1-t5 and subId1-subId5
    const groupByFieldMap: Record<string, string> = {
      t1: 'subId1',
      t2: 'subId2',
      t3: 'subId3',
      t4: 'subId4',
      t5: 'subId5',
      subId1: 'subId1',
      subId2: 'subId2',
      subId3: 'subId3',
      subId4: 'subId4',
      subId5: 'subId5',
    };

    const groupBy = groupByFieldMap[filters.groupBy] || filters.groupBy;
    const limit = filters.limit || 50;

    // Build the query conditions - use direct SubID fields on conversion when available
    const whereConditions: string[] = [`c."companyId" IN (${targetCompanyIds.map(id => `'${id}'`).join(', ')})`];

    if (filters.partnerId) {
      whereConditions.push(`c."partnerId" = '${filters.partnerId}'`);
    }
    if (filters.linkId) {
      whereConditions.push(`c."linkId" = '${filters.linkId}'`);
    }
    if (filters.startDate) {
      whereConditions.push(`c."convertedAt" >= '${filters.startDate}'`);
    }
    if (filters.endDate) {
      whereConditions.push(`c."convertedAt" <= '${filters.endDate}'`);
    }
    whereConditions.push(`c.status IN ('APPROVED', 'PENDING')`);

    // First try querying from direct SubID fields on conversion
    // Fall back to click relationship if conversion SubIDs are null
    const query = `
      SELECT
        COALESCE(c."${groupBy}", cl."${groupBy}") as "subIdValue",
        COUNT(c.id)::int as conversions,
        COALESCE(SUM(c."orderTotal"), 0) as revenue,
        COALESCE(SUM(c."commissionAmount"), 0) as commissions,
        COALESCE(AVG(c."orderTotal"), 0) as "averageOrderValue"
      FROM "AffiliateConversion" c
      LEFT JOIN "AffiliateClick" cl ON c."clickId" = cl.id
      WHERE ${whereConditions.join(' AND ')}
        AND COALESCE(c."${groupBy}", cl."${groupBy}") IS NOT NULL
      GROUP BY COALESCE(c."${groupBy}", cl."${groupBy}")
      ORDER BY conversions DESC
      LIMIT ${limit}
    `;

    const rawResults = await this.prisma.$queryRawUnsafe<Array<{
      subIdValue: string;
      conversions: number;
      revenue: number;
      commissions: number;
      averageOrderValue: number;
    }>>(query);

    // Get total clicks for each subId for conversion rate
    const clickCountQuery = `
      SELECT
        "${groupBy}" as "subIdValue",
        COUNT(*)::int as clicks
      FROM "AffiliateClick"
      WHERE "companyId" IN (${targetCompanyIds.map(id => `'${id}'`).join(', ')})
        ${filters.partnerId ? `AND "partnerId" = '${filters.partnerId}'` : ''}
        ${filters.linkId ? `AND "linkId" = '${filters.linkId}'` : ''}
        ${filters.startDate ? `AND "clickedAt" >= '${filters.startDate}'` : ''}
        ${filters.endDate ? `AND "clickedAt" <= '${filters.endDate}'` : ''}
        AND "${groupBy}" IS NOT NULL
      GROUP BY "${groupBy}"
    `;

    const clickCounts = await this.prisma.$queryRawUnsafe<Array<{
      subIdValue: string;
      clicks: number;
    }>>(clickCountQuery);

    const clickCountMap = new Map(clickCounts.map(c => [c.subIdValue, c.clicks]));

    const data = rawResults.map(r => ({
      subIdValue: r.subIdValue,
      conversions: Number(r.conversions),
      revenue: Number(r.revenue),
      commissions: Number(r.commissions),
      averageOrderValue: Math.round(Number(r.averageOrderValue) * 100) / 100,
      clicks: clickCountMap.get(r.subIdValue) || 0,
      conversionRate: clickCountMap.get(r.subIdValue)
        ? Math.round((Number(r.conversions) / clickCountMap.get(r.subIdValue)!) * 10000) / 100
        : 0,
    }));

    const totals = {
      conversions: data.reduce((sum, d) => sum + d.conversions, 0),
      revenue: data.reduce((sum, d) => sum + d.revenue, 0),
      commissions: data.reduce((sum, d) => sum + d.commissions, 0),
      clicks: data.reduce((sum, d) => sum + d.clicks, 0),
    };

    return {
      groupBy: filters.groupBy, // Return original groupBy for API consistency
      data,
      totals,
    };
  }

  /**
   * Calculate commission based on partnership settings
   */
  calculateCommission(
    saleAmount: number,
    partnership: PartnershipCommissionInfo,
  ): { commissionAmount: number; commissionRate: number; secondTierAmount: number } {
    let commissionAmount: number;
    let commissionRate = partnership.commissionRate;

    // Flat rate takes precedence over percentage
    if (partnership.commissionFlat !== undefined && partnership.commissionFlat !== null) {
      commissionAmount = partnership.commissionFlat;
    } else {
      commissionAmount = (saleAmount * commissionRate) / 100;
    }

    // Calculate second tier commission
    const secondTierAmount = partnership.secondTierRate
      ? (saleAmount * partnership.secondTierRate) / 100
      : 0;

    return {
      commissionAmount: Math.round(commissionAmount * 100) / 100,
      commissionRate,
      secondTierAmount: Math.round(secondTierAmount * 100) / 100,
    };
  }

  /**
   * Get conversions pending approval (past hold period)
   */
  async getPendingApproval(user: UserContext, filters: { companyId?: string }) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);
    let targetCompanyIds = companyIds;

    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    // Get company configs to determine hold periods
    const configs = await this.prisma.affiliateProgramConfig.findMany({
      where: { companyId: { in: targetCompanyIds } },
      select: { companyId: true, holdPeriodDays: true },
    });

    const configMap = new Map(configs.map(c => [c.companyId, c.holdPeriodDays ?? 30]));

    // Build queries for each company with its specific hold period
    const pendingConversions: any[] = [];

    for (const companyId of targetCompanyIds) {
      const holdPeriodDays = configMap.get(companyId) || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - holdPeriodDays);

      const conversions = await this.prisma.affiliateConversion.findMany({
        where: {
          companyId,
          status: 'PENDING',
          convertedAt: { lte: cutoffDate },
        },
        include: {
          partner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
              affiliateCode: true,
            },
          },
          company: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { convertedAt: 'asc' },
      });

      pendingConversions.push(...conversions.map(c => ({
        ...c,
        holdPeriodDays,
        readyForApproval: true,
      })));
    }

    return {
      conversions: pendingConversions,
      total: pendingConversions.length,
    };
  }

  /**
   * Find attribution for a conversion
   */
  private async findAttribution(input: RecordConversionInput): Promise<{
    partner: any;
    link: any | null;
    click: any | null;
    attributionWindow: number;
  } | null> {
    // Get company config for attribution settings
    const config = await this.prisma.affiliateProgramConfig.findUnique({
      where: { companyId: input.companyId },
    });

    const attributionWindowDays = config?.attributionWindowDays ?? 30;
    const attributionCutoff = new Date();
    attributionCutoff.setDate(attributionCutoff.getDate() - attributionWindowDays);

    // Priority 1: Direct click attribution
    if (input.clickId) {
      const click = await this.prisma.affiliateClick.findFirst({
        where: {
          idempotencyKey: input.clickId,
          companyId: input.companyId,
          clickedAt: { gte: attributionCutoff },
        },
        include: {
          partner: true,
          link: true,
        },
      });

      if (click && click.partner.status === 'ACTIVE') {
        const attributionWindow = Math.floor(
          (Date.now() - click.clickedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        return {
          partner: click.partner,
          link: click.link,
          click,
          attributionWindow,
        };
      }
    }

    // Priority 2: Visitor ID attribution (cookie-based)
    if (input.visitorId) {
      const click = await this.prisma.affiliateClick.findFirst({
        where: {
          visitorId: input.visitorId,
          companyId: input.companyId,
          clickedAt: { gte: attributionCutoff },
          status: 'VALID',
        },
        include: {
          partner: true,
          link: true,
        },
        orderBy: config?.lastClickAttribution === false
          ? { clickedAt: 'asc' } // First click
          : { clickedAt: 'desc' }, // Last click (default)
      });

      if (click && click.partner.status === 'ACTIVE') {
        const attributionWindow = Math.floor(
          (Date.now() - click.clickedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        return {
          partner: click.partner,
          link: click.link,
          click,
          attributionWindow,
        };
      }
    }

    // Priority 3: Session ID attribution
    if (input.sessionId) {
      const click = await this.prisma.affiliateClick.findFirst({
        where: {
          sessionId: input.sessionId,
          companyId: input.companyId,
          clickedAt: { gte: attributionCutoff },
        },
        include: {
          partner: true,
          link: true,
        },
      });

      if (click && click.partner.status === 'ACTIVE') {
        const attributionWindow = Math.floor(
          (Date.now() - click.clickedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        return {
          partner: click.partner,
          link: click.link,
          click,
          attributionWindow,
        };
      }
    }

    // Priority 4: Direct affiliate code attribution
    if (input.affiliateCode) {
      const partner = await this.prisma.affiliatePartner.findFirst({
        where: {
          affiliateCode: input.affiliateCode,
          companyId: input.companyId,
          status: 'ACTIVE',
        },
      });

      if (partner) {
        return {
          partner,
          link: null,
          click: null,
          attributionWindow: 0,
        };
      }
    }

    return null;
  }

  /**
   * Validate status transition is allowed
   */
  private validateStatusTransition(from: ConversionStatus, to: ConversionStatus): void {
    const allowedTransitions: Record<ConversionStatus, ConversionStatus[]> = {
      PENDING: ['APPROVED', 'REJECTED'],
      APPROVED: ['REVERSED', 'DISPUTED'],
      REJECTED: [], // Terminal state
      REVERSED: [], // Terminal state
      DISPUTED: ['APPROVED', 'REJECTED', 'REVERSED'], // Can be resolved in any direction
    };

    if (!allowedTransitions[from]?.includes(to)) {
      throw new BadRequestException(
        `Cannot transition from ${from} to ${to}. Allowed: ${allowedTransitions[from]?.join(', ') || 'none'}`,
      );
    }
  }
}
