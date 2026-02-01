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
import { DataClassification, Prisma } from '@prisma/client';
import { CreateLinkDto, UpdateLinkDto, SubIdConfigDto, DuplicateLinkDto } from '../dto/create-link.dto';
import { randomBytes } from 'crypto';

export interface LinkFilters {
  companyId?: string;
  partnerId?: string;
  partnershipId?: string;
  isActive?: boolean;
  campaign?: string;
  source?: string;
  medium?: string;
  search?: string;
  sortBy?: 'createdAt' | 'totalClicks' | 'totalConversions' | 'totalRevenue' | 'conversionRate';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface LinkStatsDateRange {
  startDate?: string;
  endDate?: string;
}

export interface LinkStats {
  totalClicks: number;
  uniqueClicks: number;
  totalConversions: number;
  totalRevenue: number;
  conversionRate: number;
  clicksByDay: Array<{ date: string; clicks: number; uniqueClicks: number }>;
  conversionsByDay: Array<{ date: string; conversions: number; revenue: number }>;
  topSubIds: {
    subId1: Array<{ value: string; clicks: number; conversions: number }>;
    subId2: Array<{ value: string; clicks: number; conversions: number }>;
    subId3: Array<{ value: string; clicks: number; conversions: number }>;
    subId4: Array<{ value: string; clicks: number; conversions: number }>;
    subId5: Array<{ value: string; clicks: number; conversions: number }>;
  };
}

// Reserved codes that cannot be used
const RESERVED_CODES = [
  'admin',
  'api',
  'go',
  'track',
  'click',
  'ref',
  'aff',
  'affiliate',
  'partner',
  'help',
  'support',
  'login',
  'logout',
  'register',
  'signup',
  'dashboard',
  'settings',
  'account',
  'profile',
  'test',
  'demo',
  'null',
  'undefined',
];

@Injectable()
export class AffiliateLinksService {
  private readonly logger = new Logger(AffiliateLinksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditLogsService: AuditLogsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /**
   * List affiliate links with filters
   */
  async findAll(user: UserContext, filters: LinkFilters) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    let targetCompanyIds = companyIds;
    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const where: Prisma.AffiliateLinkWhereInput = {
      companyId: { in: targetCompanyIds },
      deletedAt: null,
    };

    if (filters.partnerId) {
      where.partnerId = filters.partnerId;
    }

    if (filters.partnershipId) {
      where.partner = { id: filters.partnershipId };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.campaign) {
      where.campaign = filters.campaign;
    }

    if (filters.source) {
      where.source = filters.source;
    }

    if (filters.medium) {
      where.medium = filters.medium;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { trackingCode: { contains: filters.search, mode: 'insensitive' } },
        { shortCode: { contains: filters.search, mode: 'insensitive' } },
        { campaign: { contains: filters.search, mode: 'insensitive' } },
        { destinationUrl: { contains: filters.search, mode: 'insensitive' } },
        { subId1: { contains: filters.search, mode: 'insensitive' } },
        { subId2: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;

    // Build orderBy clause
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy: Prisma.AffiliateLinkOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [links, total] = await Promise.all([
      this.prisma.affiliateLink.findMany({
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
            },
          },
          company: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: {
              clicks: true,
              conversions: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      this.prisma.affiliateLink.count({ where }),
    ]);

    return { links, total, limit, offset };
  }

  /**
   * Get a single link by ID
   */
  async findById(user: UserContext, linkId: string) {
    const link = await this.prisma.affiliateLink.findFirst({
      where: {
        id: linkId,
        deletedAt: null,
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
        clicks: {
          orderBy: { clickedAt: 'desc' },
          take: 10,
        },
        conversions: {
          orderBy: { convertedAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            clicks: true,
            conversions: true,
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Affiliate link not found');
    }

    // Verify user has access to this company
    await this.hierarchyService.validateCompanyAccess(
      user,
      link.companyId,
      'view affiliate link',
    );

    return link;
  }

  /**
   * Get link by tracking code (public - used for redirect)
   */
  async findByTrackingCode(trackingCode: string) {
    const link = await this.prisma.affiliateLink.findUnique({
      where: { trackingCode },
      include: {
        partner: {
          select: {
            id: true,
            status: true,
            companyId: true,
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Tracking link not found');
    }

    return link;
  }

  /**
   * Get link by short code (for /go/:code redirect)
   */
  async findByShortCode(shortCode: string) {
    const link = await this.prisma.affiliateLink.findUnique({
      where: { shortCode },
      include: {
        partner: {
          select: {
            id: true,
            status: true,
            companyId: true,
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Short link not found');
    }

    return link;
  }

  /**
   * Create a new affiliate link
   */
  async create(user: UserContext, dto: CreateLinkDto) {
    // Validate company access
    await this.hierarchyService.validateCompanyAccess(
      user,
      dto.companyId,
      'create affiliate link',
    );

    // Verify partner exists and belongs to this company
    const partner = await this.prisma.affiliatePartner.findFirst({
      where: {
        id: dto.partnerId,
        companyId: dto.companyId,
        deletedAt: null,
      },
    });

    if (!partner) {
      throw new NotFoundException('Affiliate partner not found');
    }

    if (partner.status !== 'ACTIVE') {
      throw new BadRequestException('Partner must be active to create links');
    }

    // Handle idempotency
    if (dto.idempotencyKey) {
      const result = await this.idempotencyService.checkAndLock(
        `affiliate-link:${dto.idempotencyKey}`,
      );
      if (result.isDuplicate) {
        return result.cachedResult;
      }
    }

    // Generate unique tracking code
    const trackingCode = await this.generateTrackingCode();

    // Generate short code if requested
    let shortCode: string | undefined;
    if (dto.shortCode) {
      // Validate custom short code
      const codeExists = await this.prisma.affiliateLink.findUnique({
        where: { shortCode: dto.shortCode },
      });
      if (codeExists) {
        throw new ConflictException('Short code already in use');
      }
      shortCode = dto.shortCode;
    }

    try {
      const link = await this.prisma.affiliateLink.create({
        data: {
          partnerId: dto.partnerId,
          companyId: dto.companyId,
          name: dto.name,
          destinationUrl: dto.destinationUrl,
          trackingCode,
          shortCode,
          campaign: dto.campaign,
          source: dto.source,
          medium: dto.medium,
          subId1: dto.subId1,
          subId2: dto.subId2,
          subId3: dto.subId3,
          subId4: dto.subId4,
          subId5: dto.subId5,
          subIdConfig: dto.subIdConfig as any, // Store SubID configuration
          isActive: dto.isActive ?? true,
          expiresAt: dto.expiresAt,
          maxClicks: dto.maxClicks,
          maxConversions: dto.maxConversions,
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
      });

      // Audit log
      await this.auditLogsService.log(
        AuditAction.CREATE,
        AuditEntity.AFFILIATE_LINK,
        link.id,
        {
          userId: user.sub,
          scopeType: user.scopeType,
          scopeId: user.scopeId,
          dataClassification: DataClassification.INTERNAL,
          metadata: {
            partnerId: dto.partnerId,
            trackingCode,
            destinationUrl: dto.destinationUrl,
          },
        },
      );

      // Complete idempotency
      if (dto.idempotencyKey) {
        await this.idempotencyService.complete(
          `affiliate-link:${dto.idempotencyKey}`,
          link,
        );
      }

      return link;
    } catch (error) {
      if (dto.idempotencyKey) {
        await this.idempotencyService.fail(`affiliate-link:${dto.idempotencyKey}`);
      }
      throw error;
    }
  }

  /**
   * Update an affiliate link
   */
  async update(user: UserContext, linkId: string, dto: UpdateLinkDto) {
    const link = await this.findById(user, linkId);

    const updateData: Prisma.AffiliateLinkUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.destinationUrl !== undefined) updateData.destinationUrl = dto.destinationUrl;
    if (dto.campaign !== undefined) updateData.campaign = dto.campaign;
    if (dto.source !== undefined) updateData.source = dto.source;
    if (dto.medium !== undefined) updateData.medium = dto.medium;
    if (dto.subId1 !== undefined) updateData.subId1 = dto.subId1;
    if (dto.subId2 !== undefined) updateData.subId2 = dto.subId2;
    if (dto.subId3 !== undefined) updateData.subId3 = dto.subId3;
    if (dto.subId4 !== undefined) updateData.subId4 = dto.subId4;
    if (dto.subId5 !== undefined) updateData.subId5 = dto.subId5;
    if (dto.subIdConfig !== undefined) updateData.subIdConfig = dto.subIdConfig as any;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.expiresAt !== undefined) updateData.expiresAt = dto.expiresAt;
    if (dto.maxClicks !== undefined) updateData.maxClicks = dto.maxClicks;
    if (dto.maxConversions !== undefined) updateData.maxConversions = dto.maxConversions;

    const updated = await this.prisma.affiliateLink.update({
      where: { id: linkId },
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
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.UPDATE,
      AuditEntity.AFFILIATE_LINK,
      linkId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
      },
    );

    return updated;
  }

  /**
   * Soft delete an affiliate link
   */
  async delete(user: UserContext, linkId: string) {
    const link = await this.findById(user, linkId);

    await this.prisma.affiliateLink.update({
      where: { id: linkId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.DELETE,
      AuditEntity.AFFILIATE_LINK,
      linkId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          trackingCode: link.trackingCode,
          partnerId: link.partnerId,
        },
      },
    );

    return { success: true };
  }

  /**
   * Update link metrics (called after click/conversion)
   */
  async updateMetrics(linkId: string) {
    const [clickStats, conversionStats] = await Promise.all([
      this.prisma.affiliateClick.groupBy({
        by: ['linkId'],
        where: { linkId },
        _count: true,
      }),
      this.prisma.affiliateConversion.aggregate({
        where: { linkId },
        _count: true,
        _sum: { orderTotal: true },
      }),
    ]);

    // Get unique clicks count
    const uniqueClicks = await this.prisma.affiliateClick.count({
      where: { linkId, isUnique: true },
    });

    const totalClicks = clickStats[0]?._count || 0;
    const totalConversions = conversionStats._count || 0;
    const totalRevenue = conversionStats._sum?.orderTotal || 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    await this.prisma.affiliateLink.update({
      where: { id: linkId },
      data: {
        totalClicks,
        uniqueClicks,
        totalConversions,
        totalRevenue,
        conversionRate,
      },
    });
  }

  /**
   * Get link performance stats with date range
   */
  async getStats(user: UserContext, linkId: string, dateRange?: LinkStatsDateRange): Promise<LinkStats> {
    const link = await this.findById(user, linkId);

    const dateFilter = this.buildDateFilter(dateRange?.startDate, dateRange?.endDate);

    // Get base stats
    const [clickStats, conversionStats] = await Promise.all([
      this.prisma.affiliateClick.aggregate({
        where: {
          linkId,
          ...(dateFilter && { clickedAt: dateFilter }),
        },
        _count: true,
      }),
      this.prisma.affiliateConversion.aggregate({
        where: {
          linkId,
          status: { in: ['APPROVED', 'PENDING'] },
          ...(dateFilter && { convertedAt: dateFilter }),
        },
        _count: true,
        _sum: { orderTotal: true },
      }),
    ]);

    // Get unique clicks
    const uniqueClicks = await this.prisma.affiliateClick.count({
      where: {
        linkId,
        isUnique: true,
        ...(dateFilter && { clickedAt: dateFilter }),
      },
    });

    // Get clicks by day (last 30 days)
    const clicksByDay = await this.getClicksByDay(linkId, dateRange);

    // Get conversions by day (last 30 days)
    const conversionsByDay = await this.getConversionsByDay(linkId, dateRange);

    // Get top SubID values
    const topSubIds = await this.getTopSubIds(linkId, dateRange);

    const totalClicks = clickStats._count;
    const totalConversions = conversionStats._count;
    const totalRevenue = conversionStats._sum?.orderTotal || 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      totalClicks,
      uniqueClicks,
      totalConversions,
      totalRevenue,
      conversionRate: Math.round(conversionRate * 100) / 100,
      clicksByDay,
      conversionsByDay,
      topSubIds,
    };
  }

  /**
   * Duplicate a link with new SubIDs
   */
  async duplicate(user: UserContext, linkId: string, dto: DuplicateLinkDto) {
    const link = await this.findById(user, linkId);

    // Generate new tracking code
    const trackingCode = await this.generateTrackingCode();

    // Generate new short code if requested
    let shortCode: string | undefined;
    if (dto.shortCode) {
      await this.validateShortCode(dto.shortCode);
      shortCode = dto.shortCode;
    } else if (dto.generateShortCode) {
      shortCode = await this.generateShortCode();
    }

    // Expand macros in SubIDs
    const expandedSubIds = this.expandSubIdMacros({
      subId1: dto.subId1 ?? link.subId1,
      subId2: dto.subId2 ?? link.subId2,
      subId3: dto.subId3 ?? link.subId3,
      subId4: dto.subId4 ?? link.subId4,
      subId5: dto.subId5 ?? link.subId5,
    });

    // Create new link
    const newLink = await this.prisma.affiliateLink.create({
      data: {
        partnerId: link.partnerId,
        companyId: link.companyId,
        name: dto.name || `${link.name || 'Link'} (Copy)`,
        destinationUrl: dto.destinationUrl || link.destinationUrl,
        trackingCode,
        shortCode,
        campaign: dto.campaign ?? link.campaign,
        source: dto.source ?? link.source,
        medium: dto.medium ?? link.medium,
        subId1: expandedSubIds.subId1,
        subId2: expandedSubIds.subId2,
        subId3: expandedSubIds.subId3,
        subId4: expandedSubIds.subId4,
        subId5: expandedSubIds.subId5,
        isActive: dto.isActive ?? link.isActive,
        expiresAt: dto.expiresAt ?? link.expiresAt,
        maxClicks: dto.maxClicks ?? link.maxClicks,
        maxConversions: dto.maxConversions ?? link.maxConversions,
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
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.CREATE,
      AuditEntity.AFFILIATE_LINK,
      newLink.id,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          duplicatedFrom: linkId,
          partnerId: link.partnerId,
          trackingCode,
        },
      },
    );

    return newLink;
  }

  /**
   * Generate a unique short code (8 alphanumeric characters)
   */
  async generateShortCode(): Promise<string> {
    let code: string;
    let exists: boolean;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      // Generate 8-character alphanumeric code
      code = randomBytes(6)
        .toString('base64')
        .replace(/[+/=]/g, '')
        .substring(0, 8)
        .toLowerCase();

      // Check if reserved
      if (RESERVED_CODES.includes(code.toLowerCase())) {
        exists = true;
        continue;
      }

      const existing = await this.prisma.affiliateLink.findUnique({
        where: { shortCode: code },
      });
      exists = !!existing;
      attempts++;
    } while (exists && attempts < maxAttempts);

    if (exists) {
      throw new BadRequestException('Unable to generate unique short code');
    }

    return code;
  }

  /**
   * Validate a custom short code
   */
  async validateShortCode(code: string): Promise<void> {
    // Check format (alphanumeric, 4-16 chars)
    if (!/^[a-zA-Z0-9]{4,16}$/.test(code)) {
      throw new BadRequestException(
        'Short code must be 4-16 alphanumeric characters',
      );
    }

    // Check reserved words
    if (RESERVED_CODES.includes(code.toLowerCase())) {
      throw new BadRequestException(
        `"${code}" is a reserved code and cannot be used`,
      );
    }

    // Check uniqueness
    const existing = await this.prisma.affiliateLink.findUnique({
      where: { shortCode: code },
    });
    if (existing) {
      throw new ConflictException('Short code is already in use');
    }
  }

  /**
   * Expand macros in SubID values
   * Supported macros:
   * - {CLICK_ID} - Unique click identifier (placeholder)
   * - {TIMESTAMP} - Current Unix timestamp
   * - {DATE} - Current date (YYYY-MM-DD)
   * - {RANDOM} - Random 8-char string
   * - {PARTNER_CODE} - Affiliate partner code (needs to be passed in context)
   */
  expandSubIdMacros(subIds: {
    subId1?: string | null;
    subId2?: string | null;
    subId3?: string | null;
    subId4?: string | null;
    subId5?: string | null;
  }): {
    subId1: string | null;
    subId2: string | null;
    subId3: string | null;
    subId4: string | null;
    subId5: string | null;
  } {
    const expandMacro = (value: string | null | undefined): string | null => {
      if (!value) return null;

      const now = new Date();
      return value
        .replace(/\{TIMESTAMP\}/g, Math.floor(now.getTime() / 1000).toString())
        .replace(/\{DATE\}/g, now.toISOString().split('T')[0])
        .replace(/\{RANDOM\}/g, randomBytes(4).toString('hex'));
      // Note: {CLICK_ID} and {PARTNER_CODE} are expanded at click time, not link creation
    };

    return {
      subId1: expandMacro(subIds.subId1),
      subId2: expandMacro(subIds.subId2),
      subId3: expandMacro(subIds.subId3),
      subId4: expandMacro(subIds.subId4),
      subId5: expandMacro(subIds.subId5),
    };
  }

  /**
   * Get clicks grouped by day
   */
  private async getClicksByDay(
    linkId: string,
    dateRange?: LinkStatsDateRange,
  ): Promise<Array<{ date: string; clicks: number; uniqueClicks: number }>> {
    const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : new Date();
    const startDate = dateRange?.startDate
      ? new Date(dateRange.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dates: Array<{ date: string; clicks: number; uniqueClicks: number }> = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      const dayStart = new Date(current);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);

      const [clicks, uniqueClicks] = await Promise.all([
        this.prisma.affiliateClick.count({
          where: {
            linkId,
            clickedAt: { gte: dayStart, lte: dayEnd },
          },
        }),
        this.prisma.affiliateClick.count({
          where: {
            linkId,
            isUnique: true,
            clickedAt: { gte: dayStart, lte: dayEnd },
          },
        }),
      ]);

      dates.push({
        date: current.toISOString().split('T')[0],
        clicks,
        uniqueClicks,
      });

      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Get conversions grouped by day
   */
  private async getConversionsByDay(
    linkId: string,
    dateRange?: LinkStatsDateRange,
  ): Promise<Array<{ date: string; conversions: number; revenue: number }>> {
    const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : new Date();
    const startDate = dateRange?.startDate
      ? new Date(dateRange.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dates: Array<{ date: string; conversions: number; revenue: number }> = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      const dayStart = new Date(current);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);

      const result = await this.prisma.affiliateConversion.aggregate({
        where: {
          linkId,
          status: { in: ['APPROVED', 'PENDING'] },
          convertedAt: { gte: dayStart, lte: dayEnd },
        },
        _count: true,
        _sum: { orderTotal: true },
      });

      dates.push({
        date: current.toISOString().split('T')[0],
        conversions: result._count,
        revenue: result._sum?.orderTotal || 0,
      });

      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Get top SubID values for a link
   */
  private async getTopSubIds(
    linkId: string,
    dateRange?: LinkStatsDateRange,
  ): Promise<LinkStats['topSubIds']> {
    const dateFilter = this.buildDateFilter(dateRange?.startDate, dateRange?.endDate);

    const getTopForField = async (
      field: 'subId1' | 'subId2' | 'subId3' | 'subId4' | 'subId5',
    ): Promise<Array<{ value: string; clicks: number; conversions: number }>> => {
      const clickGroups = await this.prisma.affiliateClick.groupBy({
        by: [field],
        where: {
          linkId,
          [field]: { not: null },
          ...(dateFilter && { clickedAt: dateFilter }),
        },
        _count: true,
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      const results = await Promise.all(
        clickGroups.map(async (group) => {
          const value = group[field] as string;

          // Get click IDs with this subId value for conversion counting
          const clicksWithSubId = await this.prisma.affiliateClick.findMany({
            where: {
              linkId,
              [field]: value,
              ...(dateFilter && { clickedAt: dateFilter }),
            },
            select: { id: true },
          });

          const clickIds = clicksWithSubId.map((c) => c.id);

          // Count conversions that originated from these clicks
          const conversions = clickIds.length > 0
            ? await this.prisma.affiliateConversion.count({
                where: {
                  linkId,
                  clickId: { in: clickIds },
                  status: { in: ['APPROVED', 'PENDING'] },
                  ...(dateFilter && { convertedAt: dateFilter }),
                },
              })
            : 0;

          return {
            value,
            clicks: group._count,
            conversions,
          };
        }),
      );

      return results;
    };

    const [subId1, subId2, subId3, subId4, subId5] = await Promise.all([
      getTopForField('subId1'),
      getTopForField('subId2'),
      getTopForField('subId3'),
      getTopForField('subId4'),
      getTopForField('subId5'),
    ]);

    return { subId1, subId2, subId3, subId4, subId5 };
  }

  /**
   * Build date filter for Prisma
   */
  private buildDateFilter(
    startDate?: string,
    endDate?: string,
  ): Prisma.DateTimeFilter | undefined {
    if (!startDate && !endDate) {
      return undefined;
    }

    const filter: Prisma.DateTimeFilter = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) filter.lte = new Date(endDate);

    return filter;
  }

  /**
   * Generate unique tracking code
   */
  private async generateTrackingCode(): Promise<string> {
    let code: string;
    let exists: boolean;

    do {
      code = randomBytes(8).toString('base64url');
      const existing = await this.prisma.affiliateLink.findUnique({
        where: { trackingCode: code },
      });
      exists = !!existing;
    } while (exists);

    return code;
  }
}
