/**
 * Affiliate Clicks Service
 *
 * Comprehensive click tracking service for the affiliate module.
 * Handles click recording, duplicate detection, statistics, and SubID breakdown.
 *
 * Features:
 * - Click recording with enrichment
 * - Duplicate detection (fingerprint-based)
 * - Aggregated click statistics
 * - SubID breakdown reports (t1-t5)
 * - Scope-based access control
 */

import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AuditAction, AuditEntity } from '../../audit-logs/types/audit-log.types';
import { DataClassification, Prisma, ClickStatus } from '@prisma/client';
import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface RecordClickDto {
  linkId: string;
  partnerId: string;
  companyId: string;
  ipAddress: string;
  userAgent?: string;
  referer?: string;
  // SubIDs (t1-t5)
  t1?: string;
  t2?: string;
  t3?: string;
  t4?: string;
  t5?: string;
  // Custom overflow params
  customParams?: Record<string, string>;
  // Geo data (from MaxMind)
  geoData?: {
    country?: string;
    region?: string;
    city?: string;
  };
  // Session linking
  sessionId?: string;
  visitorId?: string;
}

export interface ClickQueryDto {
  companyId?: string;
  partnerId?: string;
  linkId?: string;
  status?: ClickStatus;
  // SubID filters
  t1?: string;
  t2?: string;
  t3?: string;
  t4?: string;
  t5?: string;
  // Date range
  startDate?: string;
  endDate?: string;
  // Pagination
  limit?: number;
  offset?: number;
  // Sorting
  sortBy?: 'clickedAt' | 'fraudScore';
  sortOrder?: 'asc' | 'desc';
}

export interface ClickStatsDto {
  totalClicks: number;
  uniqueClicks: number;
  duplicateClicks: number;
  suspiciousClicks: number;
  invalidClicks: number;
  conversionRate: number;
  byDevice: { desktop: number; mobile: number; tablet: number };
  byBrowser: Record<string, number>;
  byCountry: Record<string, number>;
  topLinks: Array<{
    linkId: string;
    linkName: string;
    clicks: number;
    uniqueClicks: number;
  }>;
}

export interface SubIdBreakdownDto {
  subIdField: 'subId1' | 'subId2' | 'subId3' | 'subId4' | 'subId5';
  data: Array<{
    value: string;
    clicks: number;
    uniqueClicks: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
  }>;
  total: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  originalClickId?: string;
  timeWindow: number;
  fingerprint: string;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class AffiliateClicksService {
  private readonly logger = new Logger(AffiliateClicksService.name);

  // Default duplicate detection window (24 hours)
  private readonly DEFAULT_DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CLICK LISTING
  // ═══════════════════════════════════════════════════════════════

  /**
   * List clicks with filters and pagination
   */
  async findAll(user: UserContext, filters: ClickQueryDto) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    // Build where clause
    let targetCompanyIds = companyIds;
    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const where: Prisma.AffiliateClickWhereInput = {
      companyId: { in: targetCompanyIds },
    };

    // Apply filters
    if (filters.partnerId) where.partnerId = filters.partnerId;
    if (filters.linkId) where.linkId = filters.linkId;
    if (filters.status) where.status = filters.status;

    // SubID filters
    if (filters.t1) where.subId1 = filters.t1;
    if (filters.t2) where.subId2 = filters.t2;
    if (filters.t3) where.subId3 = filters.t3;
    if (filters.t4) where.subId4 = filters.t4;
    if (filters.t5) where.subId5 = filters.t5;

    // Date range
    if (filters.startDate || filters.endDate) {
      where.clickedAt = {};
      if (filters.startDate) where.clickedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.clickedAt.lte = new Date(filters.endDate);
    }

    // Pagination
    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;

    // Sorting
    const orderBy: Prisma.AffiliateClickOrderByWithRelationInput = {
      [filters.sortBy || 'clickedAt']: filters.sortOrder || 'desc',
    };

    const [clicks, total] = await Promise.all([
      this.prisma.affiliateClick.findMany({
        where,
        include: {
          partner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              affiliateCode: true,
            },
          },
          link: {
            select: {
              id: true,
              name: true,
              trackingCode: true,
              shortCode: true,
              campaign: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      }),
      this.prisma.affiliateClick.count({ where }),
    ]);

    return {
      clicks,
      total,
      limit,
      offset,
      hasMore: offset + clicks.length < total,
    };
  }

  /**
   * Get click by ID
   */
  async findById(user: UserContext, id: string) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    const click = await this.prisma.affiliateClick.findFirst({
      where: {
        id,
        companyId: { in: companyIds },
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
            status: true,
          },
        },
        link: {
          select: {
            id: true,
            name: true,
            trackingCode: true,
            shortCode: true,
            destinationUrl: true,
            campaign: true,
            source: true,
            medium: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!click) {
      throw new NotFoundException('Click not found');
    }

    return click;
  }

  // ═══════════════════════════════════════════════════════════════
  // CLICK RECORDING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Record a new click (called by public redirect endpoint)
   */
  async recordClick(dto: RecordClickDto): Promise<{
    clickId: string;
    isDuplicate: boolean;
    fingerprint: string;
  }> {
    // Generate fingerprint for duplicate detection
    const fingerprint = this.generateFingerprint(dto.ipAddress, dto.userAgent, dto.linkId);

    // Check for duplicate
    const duplicateCheck = await this.isDuplicateClick(fingerprint, this.DEFAULT_DEDUP_WINDOW_MS);

    // Hash IP for privacy
    const ipAddressHash = this.hashIpAddress(dto.ipAddress);

    // Parse user agent
    const { deviceType, browser, os } = this.parseUserAgent(dto.userAgent);

    // Generate idempotency key
    const idempotencyKey = this.generateIdempotencyKey(dto);

    // Create click record (even if duplicate, but flag it)
    const click = await this.prisma.affiliateClick.create({
      data: {
        partnerId: dto.partnerId,
        linkId: dto.linkId,
        companyId: dto.companyId,
        clickedAt: new Date(),
        ipAddressHash,
        userAgent: dto.userAgent,
        referrer: dto.referer,
        // Device info
        deviceType,
        browser,
        os,
        // Geo data
        country: dto.geoData?.country,
        region: dto.geoData?.region,
        city: dto.geoData?.city,
        // SubIDs (mapped from t1-t5)
        subId1: dto.t1,
        subId2: dto.t2,
        subId3: dto.t3,
        subId4: dto.t4,
        subId5: dto.t5,
        // Status
        status: duplicateCheck.isDuplicate ? ClickStatus.DUPLICATE : ClickStatus.VALID,
        isUnique: !duplicateCheck.isDuplicate,
        // Session tracking
        visitorId: dto.visitorId,
        sessionId: dto.sessionId,
        // Idempotency
        idempotencyKey,
      },
    });

    // Update link metrics (total clicks)
    await this.prisma.affiliateLink.update({
      where: { id: dto.linkId },
      data: {
        totalClicks: { increment: 1 },
        uniqueClicks: duplicateCheck.isDuplicate ? undefined : { increment: 1 },
      },
    });

    // Update partner metrics
    await this.prisma.affiliatePartner.update({
      where: { id: dto.partnerId },
      data: {
        totalClicks: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });

    this.logger.debug(`Recorded click ${click.id} (duplicate: ${duplicateCheck.isDuplicate})`);

    return {
      clickId: click.id,
      isDuplicate: duplicateCheck.isDuplicate,
      fingerprint,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // DUPLICATE DETECTION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check if a click is a duplicate based on fingerprint
   */
  async isDuplicateClick(
    fingerprint: string,
    timeWindowMs: number = this.DEFAULT_DEDUP_WINDOW_MS,
  ): Promise<DuplicateCheckResult> {
    const cutoffTime = new Date(Date.now() - timeWindowMs);

    // Look for existing click with same fingerprint within time window
    const existingClick = await this.prisma.affiliateClick.findFirst({
      where: {
        ipAddressHash: fingerprint.split(':')[0], // First part is IP hash
        clickedAt: { gte: cutoffTime },
        status: ClickStatus.VALID,
      },
      orderBy: { clickedAt: 'desc' },
      select: { id: true },
    });

    return {
      isDuplicate: !!existingClick,
      originalClickId: existingClick?.id,
      timeWindow: timeWindowMs,
      fingerprint,
    };
  }

  /**
   * Generate fingerprint from IP, UA, and linkId
   */
  private generateFingerprint(ipAddress: string, userAgent?: string, linkId?: string): string {
    const data = `${ipAddress}:${userAgent || ''}:${linkId || ''}`;
    return createHash('sha256').update(data).digest('hex');
  }

  // ═══════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get aggregated click statistics
   */
  async getStats(user: UserContext, filters: {
    companyId?: string;
    partnerId?: string;
    linkId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ClickStatsDto> {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    let targetCompanyIds = companyIds;
    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const where: Prisma.AffiliateClickWhereInput = {
      companyId: { in: targetCompanyIds },
    };

    if (filters.partnerId) where.partnerId = filters.partnerId;
    if (filters.linkId) where.linkId = filters.linkId;

    if (filters.startDate || filters.endDate) {
      where.clickedAt = {};
      if (filters.startDate) where.clickedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.clickedAt.lte = new Date(filters.endDate);
    }

    // Get click counts by status
    const [
      totalClicks,
      uniqueClicks,
      duplicateClicks,
      suspiciousClicks,
      invalidClicks,
      totalConversions,
      deviceStats,
      browserStats,
      countryStats,
      topLinks,
    ] = await Promise.all([
      // Total clicks
      this.prisma.affiliateClick.count({ where }),

      // Unique clicks
      this.prisma.affiliateClick.count({
        where: { ...where, isUnique: true },
      }),

      // Duplicate clicks
      this.prisma.affiliateClick.count({
        where: { ...where, status: ClickStatus.DUPLICATE },
      }),

      // Suspicious clicks
      this.prisma.affiliateClick.count({
        where: { ...where, status: ClickStatus.SUSPICIOUS },
      }),

      // Invalid clicks (BOT + FRAUD)
      this.prisma.affiliateClick.count({
        where: { ...where, status: { in: [ClickStatus.BOT, ClickStatus.FRAUD] } },
      }),

      // Conversions (for conversion rate)
      this.prisma.affiliateConversion.count({
        where: {
          companyId: { in: targetCompanyIds },
          ...(filters.partnerId && { partnerId: filters.partnerId }),
          ...(filters.linkId && { linkId: filters.linkId }),
          ...(filters.startDate || filters.endDate
            ? {
                convertedAt: {
                  ...(filters.startDate && { gte: new Date(filters.startDate) }),
                  ...(filters.endDate && { lte: new Date(filters.endDate) }),
                },
              }
            : {}),
        },
      }),

      // Device breakdown
      this.prisma.affiliateClick.groupBy({
        by: ['deviceType'],
        where,
        _count: true,
      }),

      // Browser breakdown (top 10)
      this.prisma.affiliateClick.groupBy({
        by: ['browser'],
        where: { ...where, browser: { not: null } },
        _count: true,
        orderBy: { _count: { browser: 'desc' } },
        take: 10,
      }),

      // Country breakdown (top 10)
      this.prisma.affiliateClick.groupBy({
        by: ['country'],
        where: { ...where, country: { not: null } },
        _count: true,
        orderBy: { _count: { country: 'desc' } },
        take: 10,
      }),

      // Top links
      this.prisma.affiliateClick.groupBy({
        by: ['linkId'],
        where,
        _count: true,
        orderBy: { _count: { linkId: 'desc' } },
        take: 10,
      }),
    ]);

    // Build device stats object
    const byDevice = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
    };
    for (const stat of deviceStats) {
      const type = (stat.deviceType || 'desktop').toLowerCase() as keyof typeof byDevice;
      if (type in byDevice) {
        byDevice[type] = stat._count;
      }
    }

    // Build browser stats
    const byBrowser: Record<string, number> = {};
    for (const stat of browserStats) {
      if (stat.browser) {
        byBrowser[stat.browser] = stat._count;
      }
    }

    // Build country stats
    const byCountry: Record<string, number> = {};
    for (const stat of countryStats) {
      if (stat.country) {
        byCountry[stat.country] = stat._count;
      }
    }

    // Get link names for top links
    const linkIds = topLinks.map((l) => l.linkId);
    const links = await this.prisma.affiliateLink.findMany({
      where: { id: { in: linkIds } },
      select: { id: true, name: true, uniqueClicks: true },
    });
    const linkMap = new Map(links.map((l) => [l.id, l]));

    const topLinksWithNames = topLinks.map((l) => ({
      linkId: l.linkId,
      linkName: linkMap.get(l.linkId)?.name || 'Unknown',
      clicks: l._count,
      uniqueClicks: linkMap.get(l.linkId)?.uniqueClicks || 0,
    }));

    return {
      totalClicks,
      uniqueClicks,
      duplicateClicks,
      suspiciousClicks,
      invalidClicks,
      conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      byDevice,
      byBrowser,
      byCountry,
      topLinks: topLinksWithNames,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SUBID BREAKDOWN
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get click breakdown by SubID (t1-t5)
   */
  async getStatsBySubId(
    user: UserContext,
    filters: {
      companyId?: string;
      partnerId?: string;
      linkId?: string;
      startDate?: string;
      endDate?: string;
    },
    groupBy: 'subId1' | 'subId2' | 'subId3' | 'subId4' | 'subId5' = 'subId1',
  ): Promise<SubIdBreakdownDto> {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    let targetCompanyIds = companyIds;
    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const where: Prisma.AffiliateClickWhereInput = {
      companyId: { in: targetCompanyIds },
      [groupBy]: { not: null }, // Only include clicks with this SubID
    };

    if (filters.partnerId) where.partnerId = filters.partnerId;
    if (filters.linkId) where.linkId = filters.linkId;

    if (filters.startDate || filters.endDate) {
      where.clickedAt = {};
      if (filters.startDate) where.clickedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.clickedAt.lte = new Date(filters.endDate);
    }

    // Get click counts grouped by SubID
    const clickStats = await this.prisma.affiliateClick.groupBy({
      by: [groupBy],
      where,
      _count: true,
      orderBy: { _count: { [groupBy]: 'desc' } },
      take: 100,
    });

    // Get unique click counts
    const uniqueClickStats = await this.prisma.affiliateClick.groupBy({
      by: [groupBy],
      where: { ...where, isUnique: true },
      _count: true,
    });
    const uniqueClickMap = new Map(
      uniqueClickStats.map((s) => [s[groupBy], s._count]),
    );

    // Get conversion stats grouped by SubID
    // We need to join clicks with conversions via the click record
    const subIdValues = clickStats.map((s) => s[groupBy]).filter(Boolean) as string[];

    const conversionData: Array<{
      subIdValue: string;
      conversions: number;
      revenue: number;
    }> = [];

    // For each SubID value, get conversion stats
    for (const subIdValue of subIdValues) {
      const clicksWithSubId = await this.prisma.affiliateClick.findMany({
        where: {
          ...where,
          [groupBy]: subIdValue,
        },
        select: { id: true },
      });

      const clickIds = clicksWithSubId.map((c) => c.id);

      if (clickIds.length > 0) {
        const convStats = await this.prisma.affiliateConversion.aggregate({
          where: {
            clickId: { in: clickIds },
            status: { in: ['PENDING', 'APPROVED'] },
          },
          _count: true,
          _sum: { orderTotal: true },
        });

        conversionData.push({
          subIdValue,
          conversions: convStats._count,
          revenue: convStats._sum?.orderTotal || 0,
        });
      } else {
        conversionData.push({
          subIdValue,
          conversions: 0,
          revenue: 0,
        });
      }
    }

    const conversionMap = new Map(
      conversionData.map((c) => [c.subIdValue, c]),
    );

    // Build result
    const data = clickStats.map((stat) => {
      const subIdValue = stat[groupBy] as string;
      const clicks = stat._count;
      const uniqueClicks = uniqueClickMap.get(subIdValue) || 0;
      const convData = conversionMap.get(subIdValue) || { conversions: 0, revenue: 0 };

      return {
        value: subIdValue,
        clicks,
        uniqueClicks,
        conversions: convData.conversions,
        revenue: convData.revenue,
        conversionRate: clicks > 0 ? (convData.conversions / clicks) * 100 : 0,
      };
    });

    return {
      subIdField: groupBy,
      data,
      total: data.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Hash IP address for privacy
   */
  private hashIpAddress(ipAddress: string): string {
    const salt = process.env.IP_HASH_SALT || 'default-salt';
    return createHash('sha256').update(`${ipAddress}:${salt}`).digest('hex');
  }

  /**
   * Parse user agent string
   */
  private parseUserAgent(userAgent?: string): {
    deviceType?: string;
    browser?: string;
    os?: string;
  } {
    if (!userAgent) return {};

    const ua = userAgent.toLowerCase();

    let deviceType = 'desktop';
    if (ua.includes('mobile') || ua.includes('android')) {
      deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet';
    }

    let browser = 'unknown';
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

    let os = 'unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) os = 'iOS';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';

    return { deviceType, browser, os };
  }

  /**
   * Generate idempotency key for click
   */
  private generateIdempotencyKey(dto: RecordClickDto): string {
    const data = `${dto.partnerId}:${dto.linkId}:${dto.ipAddress}:${Date.now()}`;
    return createHash('sha256').update(data).digest('hex').slice(0, 32);
  }
}
