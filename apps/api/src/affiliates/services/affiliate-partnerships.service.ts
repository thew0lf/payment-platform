/**
 * Affiliate Partnerships Service
 *
 * Service layer for managing affiliate partnerships (AffiliatePartner entities).
 * Provides CRUD operations, status management, and audit logging with
 * multi-tenant security through HierarchyService.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { AuditAction, AuditEntity } from '../../audit-logs/types/audit-log.types';
import { DataClassification, Prisma, AffiliateStatus, AffiliateTier } from '@prisma/client';
import {
  CreatePartnershipDto,
  UpdatePartnershipDto,
  UpdatePartnershipStatusDto,
  ApprovePartnershipDto,
  RejectPartnershipDto,
  SuspendPartnershipDto,
  TerminatePartnershipDto,
  PartnershipQueryDto,
  PartnershipListResponse,
  PartnershipStats,
  PartnershipWithRelations,
} from '../dto/partnership.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AffiliatePartnershipsService {
  private readonly logger = new Logger(AffiliatePartnershipsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditLogsService: AuditLogsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // QUERY METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * List affiliate partnerships with filters and multi-tenant scope
   *
   * Access rules:
   * - ORGANIZATION: See all partnerships
   * - CLIENT: See partnerships in their client's companies
   * - COMPANY: See only their company's partnerships
   */
  async findAll(
    user: UserContext,
    query: PartnershipQueryDto,
  ): Promise<PartnershipListResponse> {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    // Filter to specific company if requested and user has access
    let targetCompanyIds = companyIds;
    if (query.companyId && companyIds.includes(query.companyId)) {
      targetCompanyIds = [query.companyId];
    }

    const where: Prisma.AffiliatePartnerWhereInput = {
      companyId: { in: targetCompanyIds },
      deletedAt: null,
    };

    // Apply filters
    if (query.affiliateId) {
      where.id = query.affiliateId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.tier) {
      where.tier = query.tier;
    }

    if (query.partnershipType) {
      where.partnershipType = query.partnershipType;
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { affiliateCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Date range filters
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    // Build orderBy
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: Prisma.AffiliatePartnerOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [partnerships, total] = await Promise.all([
      this.prisma.affiliatePartner.findMany({
        where,
        include: {
          company: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: {
              links: true,
              conversions: true,
              clicks: true,
              payouts: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      this.prisma.affiliatePartner.count({ where }),
    ]);

    return {
      partnerships: partnerships as PartnershipWithRelations[],
      total,
      limit,
      offset,
    };
  }

  /**
   * Get a single partnership by ID with access validation
   */
  async findById(user: UserContext, id: string): Promise<PartnershipWithRelations> {
    const partnership = await this.prisma.affiliatePartner.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
        links: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        conversions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payouts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            links: true,
            conversions: true,
            clicks: true,
            payouts: true,
          },
        },
      },
    });

    if (!partnership) {
      throw new NotFoundException('Partnership not found');
    }

    // Verify user has access to this company
    await this.hierarchyService.validateCompanyAccess(
      user,
      partnership.companyId,
      'view affiliate partnership',
    );

    return partnership as PartnershipWithRelations;
  }

  /**
   * Get partnership statistics with multi-tenant scope
   */
  async getStats(user: UserContext, companyId?: string): Promise<PartnershipStats> {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    let targetCompanyIds = companyIds;
    if (companyId && companyIds.includes(companyId)) {
      targetCompanyIds = [companyId];
    }

    const where: Prisma.AffiliatePartnerWhereInput = {
      companyId: { in: targetCompanyIds },
      deletedAt: null,
    };

    const [total, active, pending, suspended, terminated, byTier, byType, topPerformers] =
      await Promise.all([
        this.prisma.affiliatePartner.count({ where }),
        this.prisma.affiliatePartner.count({ where: { ...where, status: 'ACTIVE' } }),
        this.prisma.affiliatePartner.count({
          where: { ...where, status: 'PENDING_APPROVAL' },
        }),
        this.prisma.affiliatePartner.count({ where: { ...where, status: 'SUSPENDED' } }),
        this.prisma.affiliatePartner.count({ where: { ...where, status: 'TERMINATED' } }),
        this.prisma.affiliatePartner.groupBy({
          by: ['tier'],
          where: { ...where, status: 'ACTIVE' },
          _count: true,
        }),
        this.prisma.affiliatePartner.groupBy({
          by: ['partnershipType'],
          where: { ...where, status: 'ACTIVE' },
          _count: true,
        }),
        this.prisma.affiliatePartner.findMany({
          where: { ...where, status: 'ACTIVE' },
          orderBy: { totalEarnings: 'desc' },
          take: 5,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            totalEarnings: true,
            totalConversions: true,
            conversionRate: true,
          },
        }),
      ]);

    return {
      total,
      active,
      pending,
      suspended,
      terminated,
      byTier: byTier.reduce(
        (acc, item) => {
          acc[item.tier] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byType: byType.reduce(
        (acc, item) => {
          acc[item.partnershipType] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      topPerformers,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new affiliate partnership
   */
  async create(
    user: UserContext,
    dto: CreatePartnershipDto,
  ): Promise<PartnershipWithRelations> {
    // Validate company access
    await this.hierarchyService.validateCompanyAccess(
      user,
      dto.companyId,
      'create affiliate partnership',
    );

    // Handle idempotency
    if (dto.idempotencyKey) {
      const result = await this.idempotencyService.checkAndLock(
        `affiliate-partnership:${dto.idempotencyKey}`,
      );
      if (result.isDuplicate) {
        return result.cachedResult as PartnershipWithRelations;
      }
    }

    // Check for existing partner with same email in this company
    const existing = await this.prisma.affiliatePartner.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        companyId: dto.companyId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        'An affiliate partnership with this email already exists',
      );
    }

    // Generate unique affiliate code if not provided
    const affiliateCode =
      dto.affiliateCode ||
      (await this.generateAffiliateCode(dto.firstName, dto.lastName));

    // Check affiliate code uniqueness
    const codeExists = await this.prisma.affiliatePartner.findUnique({
      where: { affiliateCode },
    });

    if (codeExists) {
      throw new ConflictException('Affiliate code already in use');
    }

    try {
      const partnership = await this.prisma.affiliatePartner.create({
        data: {
          companyId: dto.companyId,
          email: dto.email.toLowerCase(),
          firstName: dto.firstName,
          lastName: dto.lastName,
          displayName: dto.displayName,
          phone: dto.phone,
          website: dto.website,
          socialMedia: dto.socialMedia as Prisma.InputJsonValue,
          affiliateCode,
          partnershipType: dto.partnershipType || 'AFFILIATE',
          status: dto.status || 'PENDING_APPROVAL',
          tier: dto.tier || 'BRONZE',
          commissionRate: dto.commissionRate,
          commissionFlat: dto.commissionFlat,
          secondTierRate: dto.secondTierRate,
          cookieDurationDays: dto.cookieDurationDays,
          customTerms: dto.customTerms as Prisma.InputJsonValue,
          payoutMethod: dto.payoutMethod || 'PAYPAL',
          payoutThreshold: dto.payoutThreshold || 50,
          payoutDetails: dto.payoutDetails as Prisma.InputJsonValue,
          taxId: dto.taxId,
          w9OnFile: dto.w9OnFile || false,
          applicationNotes: dto.applicationNotes,
        },
        include: {
          company: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: {
              links: true,
              conversions: true,
              clicks: true,
              payouts: true,
            },
          },
        },
      });

      // Audit log
      await this.auditLogsService.log(
        AuditAction.PARTNERSHIP_CREATED,
        AuditEntity.AFFILIATE_PARTNERSHIP,
        partnership.id,
        {
          userId: user.sub,
          scopeType: user.scopeType,
          scopeId: user.scopeId,
          dataClassification: DataClassification.PII,
          metadata: {
            email: dto.email,
            affiliateCode,
            companyId: dto.companyId,
            partnershipType: dto.partnershipType || 'AFFILIATE',
            tier: dto.tier || 'BRONZE',
          },
        },
      );

      // Complete idempotency
      if (dto.idempotencyKey) {
        await this.idempotencyService.complete(
          `affiliate-partnership:${dto.idempotencyKey}`,
          partnership,
        );
      }

      return partnership as PartnershipWithRelations;
    } catch (error) {
      if (dto.idempotencyKey) {
        await this.idempotencyService.fail(`affiliate-partnership:${dto.idempotencyKey}`);
      }
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPDATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Update an affiliate partnership
   */
  async update(
    user: UserContext,
    id: string,
    dto: UpdatePartnershipDto,
  ): Promise<PartnershipWithRelations> {
    const partnership = await this.findById(user, id);

    // Build update data
    const updateData: Prisma.AffiliatePartnerUpdateInput = {};

    if (dto.email !== undefined) updateData.email = dto.email.toLowerCase();
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.socialMedia !== undefined)
      updateData.socialMedia = dto.socialMedia as Prisma.InputJsonValue;
    if (dto.partnershipType !== undefined)
      updateData.partnershipType = dto.partnershipType;
    if (dto.tier !== undefined) updateData.tier = dto.tier;
    if (dto.commissionRate !== undefined) updateData.commissionRate = dto.commissionRate;
    if (dto.commissionFlat !== undefined) updateData.commissionFlat = dto.commissionFlat;
    if (dto.secondTierRate !== undefined) updateData.secondTierRate = dto.secondTierRate;
    if (dto.cookieDurationDays !== undefined)
      updateData.cookieDurationDays = dto.cookieDurationDays;
    if (dto.customTerms !== undefined)
      updateData.customTerms = dto.customTerms as Prisma.InputJsonValue;
    if (dto.payoutMethod !== undefined) updateData.payoutMethod = dto.payoutMethod;
    if (dto.payoutThreshold !== undefined)
      updateData.payoutThreshold = dto.payoutThreshold;
    if (dto.payoutDetails !== undefined)
      updateData.payoutDetails = dto.payoutDetails as Prisma.InputJsonValue;
    if (dto.taxId !== undefined) updateData.taxId = dto.taxId;
    if (dto.w9OnFile !== undefined) updateData.w9OnFile = dto.w9OnFile;
    if (dto.applicationNotes !== undefined)
      updateData.applicationNotes = dto.applicationNotes;

    const updated = await this.prisma.affiliatePartner.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: {
            links: true,
            conversions: true,
            clicks: true,
            payouts: true,
          },
        },
      },
    });

    // Audit log with changes
    await this.auditLogsService.log(
      AuditAction.PARTNERSHIP_UPDATED,
      AuditEntity.AFFILIATE_PARTNERSHIP,
      id,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.PII,
        changes: this.buildChangeLog(partnership, updated, dto),
      },
    );

    return updated as PartnershipWithRelations;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // STATUS CHANGE METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Update partnership status with reason and audit logging
   */
  async updateStatus(
    user: UserContext,
    id: string,
    dto: UpdatePartnershipStatusDto,
  ): Promise<PartnershipWithRelations> {
    const partnership = await this.findById(user, id);
    const previousStatus = partnership.status;

    // Validate status transition
    this.validateStatusTransition(previousStatus, dto.status);

    const updateData: Prisma.AffiliatePartnerUpdateInput = {
      status: dto.status,
    };

    // Set appropriate fields based on new status
    switch (dto.status) {
      case 'ACTIVE':
        updateData.approvedAt = new Date();
        updateData.approvedBy = user.sub;
        break;
      case 'REJECTED':
        updateData.rejectionReason = dto.reason;
        break;
      case 'SUSPENDED':
        updateData.applicationNotes = dto.notes || partnership.applicationNotes;
        break;
      case 'TERMINATED':
        updateData.deletedAt = new Date();
        updateData.deletedBy = user.sub;
        break;
    }

    const updated = await this.prisma.affiliatePartner.update({
      where: { id },
      data: updateData,
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: {
            links: true,
            conversions: true,
            clicks: true,
            payouts: true,
          },
        },
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.PARTNERSHIP_STATUS_CHANGED,
      AuditEntity.AFFILIATE_PARTNERSHIP,
      id,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
        changes: {
          status: { before: previousStatus, after: dto.status },
        },
        metadata: {
          reason: dto.reason,
          notes: dto.notes,
        },
      },
    );

    return updated as PartnershipWithRelations;
  }

  /**
   * Approve a pending partnership
   */
  async approve(
    user: UserContext,
    id: string,
    dto: ApprovePartnershipDto,
  ): Promise<PartnershipWithRelations> {
    const partnership = await this.findById(user, id);

    if (partnership.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Partnership is not pending approval');
    }

    const updated = await this.prisma.affiliatePartner.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        approvedAt: new Date(),
        approvedBy: user.sub,
        applicationNotes: dto.notes || partnership.applicationNotes,
        tier: dto.tier || partnership.tier,
        commissionRate: dto.commissionRate ?? partnership.commissionRate,
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: {
            links: true,
            conversions: true,
            clicks: true,
            payouts: true,
          },
        },
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.AFFILIATE_APPROVED,
      AuditEntity.AFFILIATE_PARTNERSHIP,
      id,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          previousStatus: partnership.status,
          newStatus: 'ACTIVE',
          tier: dto.tier || partnership.tier,
          commissionRate: dto.commissionRate ?? partnership.commissionRate,
        },
      },
    );

    return updated as PartnershipWithRelations;
  }

  /**
   * Reject a pending partnership
   */
  async reject(
    user: UserContext,
    id: string,
    dto: RejectPartnershipDto,
  ): Promise<PartnershipWithRelations> {
    const partnership = await this.findById(user, id);

    if (partnership.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Partnership is not pending approval');
    }

    const updated = await this.prisma.affiliatePartner.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.reason,
        applicationNotes: dto.notes || partnership.applicationNotes,
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: {
            links: true,
            conversions: true,
            clicks: true,
            payouts: true,
          },
        },
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.AFFILIATE_REJECTED,
      AuditEntity.AFFILIATE_PARTNERSHIP,
      id,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          rejectionReason: dto.reason,
        },
      },
    );

    return updated as PartnershipWithRelations;
  }

  /**
   * Suspend an active partnership
   */
  async suspend(
    user: UserContext,
    id: string,
    dto: SuspendPartnershipDto,
  ): Promise<PartnershipWithRelations> {
    const partnership = await this.findById(user, id);

    if (partnership.status !== 'ACTIVE') {
      throw new BadRequestException('Only active partnerships can be suspended');
    }

    const updated = await this.prisma.affiliatePartner.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        applicationNotes: dto.notes
          ? `${partnership.applicationNotes || ''}\n\nSuspension reason: ${dto.reason}\n${dto.notes}`
          : `${partnership.applicationNotes || ''}\n\nSuspension reason: ${dto.reason}`,
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: {
            links: true,
            conversions: true,
            clicks: true,
            payouts: true,
          },
        },
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.AFFILIATE_SUSPENDED,
      AuditEntity.AFFILIATE_PARTNERSHIP,
      id,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          reason: dto.reason,
          notes: dto.notes,
        },
      },
    );

    return updated as PartnershipWithRelations;
  }

  /**
   * Reactivate a suspended partnership
   */
  async reactivate(user: UserContext, id: string): Promise<PartnershipWithRelations> {
    const partnership = await this.findById(user, id);

    if (partnership.status !== 'SUSPENDED') {
      throw new BadRequestException('Only suspended partnerships can be reactivated');
    }

    const updated = await this.prisma.affiliatePartner.update({
      where: { id },
      data: {
        status: 'ACTIVE',
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: {
            links: true,
            conversions: true,
            clicks: true,
            payouts: true,
          },
        },
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.AFFILIATE_REACTIVATED,
      AuditEntity.AFFILIATE_PARTNERSHIP,
      id,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          previousStatus: 'SUSPENDED',
        },
      },
    );

    return updated as PartnershipWithRelations;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DELETE METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Soft delete a partnership
   */
  async softDelete(
    user: UserContext,
    id: string,
    dto?: TerminatePartnershipDto,
  ): Promise<{ success: boolean }> {
    const partnership = await this.findById(user, id);

    // Generate cascade ID for related soft deletes
    const cascadeId = `del_${Date.now()}`;

    await this.prisma.$transaction([
      // Soft delete the partnership
      this.prisma.affiliatePartner.update({
        where: { id },
        data: {
          status: 'TERMINATED',
          deletedAt: new Date(),
          deletedBy: user.sub,
        },
      }),
      // Soft delete associated links
      this.prisma.affiliateLink.updateMany({
        where: { partnerId: id, deletedAt: null },
        data: {
          deletedAt: new Date(),
        },
      }),
    ]);

    // Audit log
    await this.auditLogsService.log(
      AuditAction.PARTNERSHIP_DELETED,
      AuditEntity.AFFILIATE_PARTNERSHIP,
      id,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.PII,
        metadata: {
          email: partnership.email,
          affiliateCode: partnership.affiliateCode,
          reason: dto?.reason,
          cascadeId,
          processRemainingPayout: dto?.processRemainingPayout,
        },
      },
    );

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BULK OPERATION METHODS (Transactional)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Bulk approve partnerships in a single transaction
   * All operations succeed or all fail (atomic)
   */
  async bulkApprove(
    user: UserContext,
    partnershipIds: string[],
    options: { tier?: AffiliateTier; commissionRate?: number } = {},
  ): Promise<{ successful: number; partnerships: PartnershipWithRelations[] }> {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    return this.prisma.$transaction(async (tx) => {
      const partnerships: PartnershipWithRelations[] = [];

      for (const id of partnershipIds) {
        // Find and validate partnership
        const partnership = await tx.affiliatePartner.findFirst({
          where: { id, deletedAt: null },
        });

        if (!partnership) {
          throw new NotFoundException(`Partnership ${id} not found`);
        }

        if (!companyIds.includes(partnership.companyId)) {
          throw new BadRequestException(`Access denied to partnership ${id}`);
        }

        if (partnership.status !== 'PENDING_APPROVAL') {
          throw new BadRequestException(
            `Partnership ${id} is not pending approval (status: ${partnership.status})`,
          );
        }

        // Update in transaction
        const updated = await tx.affiliatePartner.update({
          where: { id },
          data: {
            status: 'ACTIVE',
            approvedAt: new Date(),
            approvedBy: user.sub,
            tier: options.tier || partnership.tier,
            commissionRate: options.commissionRate ?? partnership.commissionRate,
          },
          include: {
            company: { select: { id: true, name: true, slug: true } },
            _count: {
              select: { links: true, conversions: true, clicks: true, payouts: true },
            },
          },
        });

        partnerships.push(updated as PartnershipWithRelations);

        // Audit log
        await this.auditLogsService.log(
          AuditAction.AFFILIATE_APPROVED,
          AuditEntity.AFFILIATE_PARTNERSHIP,
          id,
          {
            userId: user.sub,
            scopeType: user.scopeType,
            scopeId: user.scopeId,
            dataClassification: DataClassification.INTERNAL,
            metadata: {
              bulkOperation: true,
              batchSize: partnershipIds.length,
              tier: options.tier || partnership.tier,
            },
          },
        );
      }

      return { successful: partnerships.length, partnerships };
    });
  }

  /**
   * Bulk reject partnerships in a single transaction
   * All operations succeed or all fail (atomic)
   */
  async bulkReject(
    user: UserContext,
    partnershipIds: string[],
    reason: string,
  ): Promise<{ successful: number; partnerships: PartnershipWithRelations[] }> {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    return this.prisma.$transaction(async (tx) => {
      const partnerships: PartnershipWithRelations[] = [];

      for (const id of partnershipIds) {
        const partnership = await tx.affiliatePartner.findFirst({
          where: { id, deletedAt: null },
        });

        if (!partnership) {
          throw new NotFoundException(`Partnership ${id} not found`);
        }

        if (!companyIds.includes(partnership.companyId)) {
          throw new BadRequestException(`Access denied to partnership ${id}`);
        }

        if (partnership.status !== 'PENDING_APPROVAL') {
          throw new BadRequestException(
            `Partnership ${id} is not pending approval (status: ${partnership.status})`,
          );
        }

        const updated = await tx.affiliatePartner.update({
          where: { id },
          data: {
            status: 'REJECTED',
            rejectionReason: reason,
          },
          include: {
            company: { select: { id: true, name: true, slug: true } },
            _count: {
              select: { links: true, conversions: true, clicks: true, payouts: true },
            },
          },
        });

        partnerships.push(updated as PartnershipWithRelations);

        await this.auditLogsService.log(
          AuditAction.AFFILIATE_REJECTED,
          AuditEntity.AFFILIATE_PARTNERSHIP,
          id,
          {
            userId: user.sub,
            scopeType: user.scopeType,
            scopeId: user.scopeId,
            dataClassification: DataClassification.INTERNAL,
            metadata: {
              bulkOperation: true,
              batchSize: partnershipIds.length,
              rejectionReason: reason,
            },
          },
        );
      }

      return { successful: partnerships.length, partnerships };
    });
  }

  /**
   * Bulk update tier in a single transaction
   * All operations succeed or all fail (atomic)
   */
  async bulkUpdateTier(
    user: UserContext,
    partnershipIds: string[],
    tier: AffiliateTier,
  ): Promise<{ successful: number; partnerships: PartnershipWithRelations[] }> {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    return this.prisma.$transaction(async (tx) => {
      const partnerships: PartnershipWithRelations[] = [];

      for (const id of partnershipIds) {
        const partnership = await tx.affiliatePartner.findFirst({
          where: { id, deletedAt: null },
        });

        if (!partnership) {
          throw new NotFoundException(`Partnership ${id} not found`);
        }

        if (!companyIds.includes(partnership.companyId)) {
          throw new BadRequestException(`Access denied to partnership ${id}`);
        }

        const previousTier = partnership.tier;

        const updated = await tx.affiliatePartner.update({
          where: { id },
          data: { tier },
          include: {
            company: { select: { id: true, name: true, slug: true } },
            _count: {
              select: { links: true, conversions: true, clicks: true, payouts: true },
            },
          },
        });

        partnerships.push(updated as PartnershipWithRelations);

        await this.auditLogsService.log(
          AuditAction.PARTNERSHIP_UPDATED,
          AuditEntity.AFFILIATE_PARTNERSHIP,
          id,
          {
            userId: user.sub,
            scopeType: user.scopeType,
            scopeId: user.scopeId,
            dataClassification: DataClassification.INTERNAL,
            changes: { tier: { before: previousTier, after: tier } },
            metadata: { bulkOperation: true, batchSize: partnershipIds.length },
          },
        );
      }

      return { successful: partnerships.length, partnerships };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate a unique affiliate code
   */
  private async generateAffiliateCode(
    firstName: string,
    lastName: string,
  ): Promise<string> {
    const base = `${firstName.slice(0, 2)}${lastName.slice(0, 2)}`.toUpperCase();
    const year = new Date().getFullYear().toString().slice(-2);
    const random = randomBytes(2).toString('hex').toUpperCase();

    const code = `${base}${year}${random}`;

    // Check uniqueness
    const existing = await this.prisma.affiliatePartner.findUnique({
      where: { affiliateCode: code },
    });

    if (existing) {
      // Retry with different random
      return this.generateAffiliateCode(firstName, lastName);
    }

    return code;
  }

  /**
   * Validate status transition rules
   */
  private validateStatusTransition(
    currentStatus: AffiliateStatus,
    newStatus: AffiliateStatus,
  ): void {
    const validTransitions: Record<AffiliateStatus, AffiliateStatus[]> = {
      PENDING_APPROVAL: ['ACTIVE', 'REJECTED'],
      ACTIVE: ['SUSPENDED', 'TERMINATED', 'INACTIVE'],
      SUSPENDED: ['ACTIVE', 'TERMINATED'],
      INACTIVE: ['ACTIVE', 'TERMINATED'],
      REJECTED: [], // Cannot transition from rejected
      TERMINATED: [], // Cannot transition from terminated
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Build change log for audit
   */
  private buildChangeLog(
    before: PartnershipWithRelations,
    after: PartnershipWithRelations,
    dto: UpdatePartnershipDto,
  ): Record<string, { before: unknown; after: unknown }> {
    const changes: Record<string, { before: unknown; after: unknown }> = {};

    const fieldsToTrack = [
      'email',
      'firstName',
      'lastName',
      'displayName',
      'phone',
      'website',
      'partnershipType',
      'tier',
      'commissionRate',
      'commissionFlat',
      'secondTierRate',
      'payoutMethod',
      'payoutThreshold',
    ];

    for (const field of fieldsToTrack) {
      const dtoValue = dto[field as keyof UpdatePartnershipDto];
      if (
        dtoValue !== undefined &&
        before[field as keyof PartnershipWithRelations] !==
          after[field as keyof PartnershipWithRelations]
      ) {
        changes[field] = {
          before: before[field as keyof PartnershipWithRelations],
          after: after[field as keyof PartnershipWithRelations],
        };
      }
    }

    return changes;
  }
}
