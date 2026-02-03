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
import { DataClassification, Prisma, AffiliateStatus } from '@prisma/client';
import { CreatePartnerDto } from '../dto/create-partner.dto';
import { UpdatePartnerDto, ApprovePartnerDto, RejectPartnerDto } from '../dto/update-partner.dto';
import { createHash, randomBytes } from 'crypto';

export interface PartnerFilters {
  companyId?: string;
  status?: AffiliateStatus;
  tier?: string;
  partnershipType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AffiliatePartnersService {
  private readonly logger = new Logger(AffiliatePartnersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditLogsService: AuditLogsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /**
   * List affiliate partners with filters
   */
  async findAll(user: UserContext, filters: PartnerFilters) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    // Filter to specific company if requested and user has access
    let targetCompanyIds = companyIds;
    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const where: Prisma.AffiliatePartnerWhereInput = {
      companyId: { in: targetCompanyIds },
      deletedAt: null,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.tier) {
      where.tier = filters.tier as any;
    }

    if (filters.partnershipType) {
      where.partnershipType = filters.partnershipType as any;
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { affiliateCode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;

    const [partners, total] = await Promise.all([
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
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.affiliatePartner.count({ where }),
    ]);

    return { partners, total, limit, offset };
  }

  /**
   * Get a single partner by ID
   */
  async findById(user: UserContext, partnerId: string) {
    const partner = await this.prisma.affiliatePartner.findFirst({
      where: {
        id: partnerId,
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

    if (!partner) {
      throw new NotFoundException('Affiliate partner not found');
    }

    // Verify user has access to this company
    await this.hierarchyService.validateCompanyAccess(
      user,
      partner.companyId,
      'view affiliate partner',
    );

    return partner;
  }

  /**
   * Create a new affiliate partner
   */
  async create(user: UserContext, dto: CreatePartnerDto) {
    // Validate company access
    await this.hierarchyService.validateCompanyAccess(
      user,
      dto.companyId,
      'create affiliate partner',
    );

    // Handle idempotency
    if (dto.idempotencyKey) {
      const result = await this.idempotencyService.checkAndLock(
        `affiliate-partner:${dto.idempotencyKey}`,
      );
      if (result.isDuplicate) {
        return result.cachedResult;
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
      throw new ConflictException('An affiliate partner with this email already exists');
    }

    // Generate unique affiliate code if not provided
    const affiliateCode = dto.affiliateCode || (await this.generateAffiliateCode(dto.firstName, dto.lastName));

    // Check affiliate code uniqueness
    const codeExists = await this.prisma.affiliatePartner.findUnique({
      where: { affiliateCode },
    });

    if (codeExists) {
      throw new ConflictException('Affiliate code already in use');
    }

    try {
      const partner = await this.prisma.affiliatePartner.create({
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
        },
      });

      // Audit log
      await this.auditLogsService.log(
        AuditAction.CREATE,
        AuditEntity.AFFILIATE_PARTNER,
        partner.id,
        {
          userId: user.sub,
          scopeType: user.scopeType,
          scopeId: user.scopeId,
          dataClassification: DataClassification.PII,
          metadata: {
            email: dto.email,
            affiliateCode,
            companyId: dto.companyId,
          },
        },
      );

      // Complete idempotency
      if (dto.idempotencyKey) {
        await this.idempotencyService.complete(
          `affiliate-partner:${dto.idempotencyKey}`,
          partner,
        );
      }

      return partner;
    } catch (error) {
      if (dto.idempotencyKey) {
        await this.idempotencyService.fail(`affiliate-partner:${dto.idempotencyKey}`);
      }
      throw error;
    }
  }

  /**
   * Update an affiliate partner
   */
  async update(user: UserContext, partnerId: string, dto: UpdatePartnerDto) {
    const partner = await this.findById(user, partnerId);

    const updateData: Prisma.AffiliatePartnerUpdateInput = {};

    if (dto.email !== undefined) updateData.email = dto.email.toLowerCase();
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.socialMedia !== undefined) updateData.socialMedia = dto.socialMedia as Prisma.InputJsonValue;
    if (dto.partnershipType !== undefined) updateData.partnershipType = dto.partnershipType;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.tier !== undefined) updateData.tier = dto.tier;
    if (dto.commissionRate !== undefined) updateData.commissionRate = dto.commissionRate;
    if (dto.commissionFlat !== undefined) updateData.commissionFlat = dto.commissionFlat;
    if (dto.secondTierRate !== undefined) updateData.secondTierRate = dto.secondTierRate;
    if (dto.cookieDurationDays !== undefined) updateData.cookieDurationDays = dto.cookieDurationDays;
    if (dto.customTerms !== undefined) updateData.customTerms = dto.customTerms as Prisma.InputJsonValue;
    if (dto.payoutMethod !== undefined) updateData.payoutMethod = dto.payoutMethod;
    if (dto.payoutThreshold !== undefined) updateData.payoutThreshold = dto.payoutThreshold;
    if (dto.payoutDetails !== undefined) updateData.payoutDetails = dto.payoutDetails as Prisma.InputJsonValue;
    if (dto.taxId !== undefined) updateData.taxId = dto.taxId;
    if (dto.w9OnFile !== undefined) updateData.w9OnFile = dto.w9OnFile;
    if (dto.applicationNotes !== undefined) updateData.applicationNotes = dto.applicationNotes;
    if (dto.rejectionReason !== undefined) updateData.rejectionReason = dto.rejectionReason;

    const updated = await this.prisma.affiliatePartner.update({
      where: { id: partnerId },
      data: updateData,
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.UPDATE,
      AuditEntity.AFFILIATE_PARTNER,
      partnerId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.PII,
        changes: this.buildChangeLog(partner, updated, dto),
      },
    );

    return updated;
  }

  /**
   * Approve an affiliate partner
   */
  async approve(user: UserContext, partnerId: string, dto: ApprovePartnerDto) {
    const partner = await this.findById(user, partnerId);

    if (partner.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Partner is not pending approval');
    }

    const updated = await this.prisma.affiliatePartner.update({
      where: { id: partnerId },
      data: {
        status: 'ACTIVE',
        approvedAt: new Date(),
        approvedBy: user.sub,
        applicationNotes: dto.applicationNotes || partner.applicationNotes,
        tier: dto.tier || partner.tier,
        commissionRate: dto.commissionRate ?? partner.commissionRate,
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.AFFILIATE_APPROVED,
      AuditEntity.AFFILIATE_PARTNER,
      partnerId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          previousStatus: partner.status,
          newStatus: 'ACTIVE',
        },
      },
    );

    return updated;
  }

  /**
   * Reject an affiliate partner
   */
  async reject(user: UserContext, partnerId: string, dto: RejectPartnerDto) {
    const partner = await this.findById(user, partnerId);

    if (partner.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Partner is not pending approval');
    }

    const updated = await this.prisma.affiliatePartner.update({
      where: { id: partnerId },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.rejectionReason,
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.AFFILIATE_REJECTED,
      AuditEntity.AFFILIATE_PARTNER,
      partnerId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          rejectionReason: dto.rejectionReason,
        },
      },
    );

    return updated;
  }

  /**
   * Soft delete (deactivate) an affiliate partner
   */
  async deactivate(user: UserContext, partnerId: string) {
    const partner = await this.findById(user, partnerId);

    const updated = await this.prisma.affiliatePartner.update({
      where: { id: partnerId },
      data: {
        status: 'TERMINATED',
        deletedAt: new Date(),
        deletedBy: user.sub,
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.DELETE,
      AuditEntity.AFFILIATE_PARTNER,
      partnerId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.PII,
        metadata: {
          email: partner.email,
          affiliateCode: partner.affiliateCode,
        },
      },
    );

    return { success: true };
  }

  /**
   * Suspend an active partner
   */
  async suspend(user: UserContext, partnerId: string, reason?: string) {
    const partner = await this.findById(user, partnerId);

    if (partner.status !== 'ACTIVE') {
      throw new BadRequestException('Only active partners can be suspended');
    }

    const updated = await this.prisma.affiliatePartner.update({
      where: { id: partnerId },
      data: {
        status: 'SUSPENDED',
        applicationNotes: reason
          ? `${partner.applicationNotes || ''}\n\nSuspension reason: ${reason}`
          : partner.applicationNotes,
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
          },
        },
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.UPDATE,
      AuditEntity.AFFILIATE_PARTNER,
      partnerId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.PII,
        metadata: {
          action: 'suspended',
          email: partner.email,
          affiliateCode: partner.affiliateCode,
          reason,
        },
      },
    );

    return updated;
  }

  /**
   * Reactivate a suspended partner
   */
  async reactivate(user: UserContext, partnerId: string) {
    const partner = await this.findById(user, partnerId);

    if (partner.status !== 'SUSPENDED' && partner.status !== 'INACTIVE') {
      throw new BadRequestException('Only suspended or inactive partners can be reactivated');
    }

    const updated = await this.prisma.affiliatePartner.update({
      where: { id: partnerId },
      data: {
        status: 'ACTIVE',
        applicationNotes: `${partner.applicationNotes || ''}\n\nReactivated on ${new Date().toISOString()}`,
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
          },
        },
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.UPDATE,
      AuditEntity.AFFILIATE_PARTNER,
      partnerId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.PII,
        metadata: {
          action: 'reactivated',
          email: partner.email,
          affiliateCode: partner.affiliateCode,
        },
      },
    );

    return updated;
  }

  /**
   * Get partner statistics
   */
  async getStats(user: UserContext, filters: { companyId?: string }) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);
    let targetCompanyIds = companyIds;

    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const where: Prisma.AffiliatePartnerWhereInput = {
      companyId: { in: targetCompanyIds },
      deletedAt: null,
    };

    const [total, active, pending, byTier, topPerformers] = await Promise.all([
      this.prisma.affiliatePartner.count({ where }),
      this.prisma.affiliatePartner.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.affiliatePartner.count({ where: { ...where, status: 'PENDING_APPROVAL' } }),
      this.prisma.affiliatePartner.groupBy({
        by: ['tier'],
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
          totalClicks: true,
          totalConversions: true,
          totalEarnings: true,
          conversionRate: true,
        },
      }),
    ]);

    return {
      total,
      active,
      pending,
      inactive: total - active - pending,
      byTier: byTier.reduce((acc, item) => {
        acc[item.tier] = item._count;
        return acc;
      }, {} as Record<string, number>),
      topPerformers,
    };
  }

  /**
   * Generate a unique affiliate code
   */
  private async generateAffiliateCode(firstName: string, lastName: string): Promise<string> {
    const base = `${firstName.slice(0, 2)}${lastName.slice(0, 2)}`.toUpperCase();
    const year = new Date().getFullYear().toString().slice(-2);
    const random = randomBytes(2).toString('hex').toUpperCase();

    return `${base}${year}${random}`;
  }

  /**
   * Build change log for audit
   */
  private buildChangeLog(
    before: any,
    after: any,
    dto: UpdatePartnerDto,
  ): Record<string, { before: unknown; after: unknown }> {
    const changes: Record<string, { before: unknown; after: unknown }> = {};

    const fieldsToTrack = [
      'email', 'firstName', 'lastName', 'displayName', 'phone', 'website',
      'partnershipType', 'status', 'tier', 'commissionRate', 'commissionFlat',
      'secondTierRate', 'payoutMethod', 'payoutThreshold',
    ];

    for (const field of fieldsToTrack) {
      if (dto[field] !== undefined && before[field] !== after[field]) {
        changes[field] = { before: before[field], after: after[field] };
      }
    }

    return changes;
  }

  // ═══════════════════════════════════════════════════════════════
  // CONFIG MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get affiliate program config for the user's company
   */
  async getConfig(user: UserContext, filters: { companyId?: string }) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    // Determine target company
    let targetCompanyId: string;
    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyId = filters.companyId;
    } else if (companyIds.length === 1) {
      targetCompanyId = companyIds[0];
    } else {
      throw new BadRequestException('companyId is required when user has access to multiple companies');
    }

    // Find or create config
    let config = await this.prisma.affiliateProgramConfig.findUnique({
      where: { companyId: targetCompanyId },
    });

    if (!config) {
      // Create default config
      config = await this.prisma.affiliateProgramConfig.create({
        data: {
          companyId: targetCompanyId,
          isEnabled: false,
          programName: 'Affiliate Program',
          defaultCommissionRate: 10,
          defaultSecondTierRate: 5,
          defaultCookieDurationDays: 30,
          tierThresholds: { SILVER: 1000, GOLD: 5000, PLATINUM: 20000, DIAMOND: 100000 },
          minimumPayoutThreshold: 50,
          payoutFrequency: 'MONTHLY',
          automaticPayouts: false,
          attributionWindowDays: 30,
          lastClickAttribution: true,
          deduplicationWindowMins: 60,
          fraudScoreThreshold: 0.7,
          requireManualApproval: true,
          holdPeriodDays: 30,
          requireW9: false,
          requireTaxId: false,
        },
      });
    }

    return config;
  }

  /**
   * Update affiliate program config
   */
  async updateConfig(user: UserContext, dto: Record<string, unknown>, filters: { companyId?: string }) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    // Determine target company
    let targetCompanyId: string;
    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyId = filters.companyId;
    } else if (companyIds.length === 1) {
      targetCompanyId = companyIds[0];
    } else {
      throw new BadRequestException('companyId is required when user has access to multiple companies');
    }

    // Get current config
    const currentConfig = await this.getConfig(user, { companyId: targetCompanyId });

    // Update config
    const updated = await this.prisma.affiliateProgramConfig.update({
      where: { id: currentConfig.id },
      data: dto as Prisma.AffiliateProgramConfigUpdateInput,
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.UPDATE,
      AuditEntity.AFFILIATE_PROGRAM_CONFIG,
      updated.id,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          configType: 'affiliate_program',
          companyId: targetCompanyId,
          changes: Object.keys(dto),
        },
      },
    );

    return updated;
  }
}
