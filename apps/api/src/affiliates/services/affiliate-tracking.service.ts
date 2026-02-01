import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { ClickQueueService, RawClickData, EnrichedClick } from './click-queue.service';
import { AffiliateLinksService } from './affiliate-links.service';
import { AuditAction, AuditEntity } from '../../audit-logs/types/audit-log.types';
import { DataClassification, Prisma, ClickStatus, ConversionStatus } from '@prisma/client';
import { TrackClickDto, ClickQueryDto } from '../dto/track-click.dto';
import { TrackConversionDto, ConversionQueryDto, PostbackDto } from '../dto/track-conversion.dto';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { createHash } from 'crypto';

@Injectable()
export class AffiliateTrackingService {
  private readonly logger = new Logger(AffiliateTrackingService.name);

  // Attribution window in days
  private readonly DEFAULT_ATTRIBUTION_WINDOW = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly idempotencyService: IdempotencyService,
    private readonly clickQueueService: ClickQueueService,
    private readonly linksService: AffiliateLinksService,
    private readonly hierarchyService: HierarchyService,
  ) {
    // Register batch processor with click queue
    this.clickQueueService.setBatchProcessor(this.processBatch.bind(this));
  }

  /**
   * Track a click (public endpoint)
   * Returns redirect URL
   */
  async trackClick(dto: TrackClickDto): Promise<{ redirectUrl: string; clickId?: string }> {
    // Find the link by tracking code
    const link = await this.linksService.findByTrackingCode(dto.trackingCode);

    // Validate link is active
    if (!link.isActive) {
      throw new BadRequestException('Link is not active');
    }

    // Check if link has expired
    if (link.expiresAt && new Date() > link.expiresAt) {
      throw new BadRequestException('Link has expired');
    }

    // Check if partner is active
    if (link.partner.status !== 'ACTIVE') {
      throw new BadRequestException('Affiliate partner is not active');
    }

    // Check max clicks limit
    if (link.maxClicks && link.totalClicks >= link.maxClicks) {
      throw new BadRequestException('Link has reached maximum clicks');
    }

    // Queue the click for async processing
    const clickData: RawClickData = {
      partnerId: link.partnerId,
      linkId: link.id,
      companyId: link.companyId,
      ipAddress: dto.ipAddress || '0.0.0.0',
      userAgent: dto.userAgent,
      referrer: dto.referrer,
      subId1: dto.subId1 || link.subId1,
      subId2: dto.subId2 || link.subId2,
      subId3: dto.subId3 || link.subId3,
      subId4: dto.subId4 || link.subId4,
      subId5: dto.subId5 || link.subId5,
    };

    const result = await this.clickQueueService.ingestClick(clickData);

    // Build redirect URL with tracking params
    const redirectUrl = this.buildRedirectUrl(link.destinationUrl, {
      clickId: result.idempotencyKey,
      partnerId: link.partnerId,
      sessionId: dto.sessionId,
    });

    return {
      redirectUrl,
      clickId: result.isDuplicate ? undefined : result.idempotencyKey,
    };
  }

  /**
   * Track click via short code (for /go/:code endpoint)
   */
  async trackClickByShortCode(
    shortCode: string,
    dto: Omit<TrackClickDto, 'trackingCode'>,
  ): Promise<{ redirectUrl: string; clickId?: string }> {
    const link = await this.linksService.findByShortCode(shortCode);
    return this.trackClick({
      ...dto,
      trackingCode: link.trackingCode,
    });
  }

  /**
   * Process batch of clicks (called by click queue)
   */
  async processBatch(clicks: EnrichedClick[]): Promise<void> {
    this.logger.debug(`Processing batch of ${clicks.length} clicks`);

    const operations = clicks.map((click) =>
      this.prisma.affiliateClick.create({
        data: {
          partnerId: click.partnerId,
          linkId: click.linkId,
          companyId: click.companyId,
          clickedAt: click.timestamp || new Date(),
          ipAddressHash: click.ipAddressHash,
          userAgent: click.userAgent,
          referrer: click.referrer,
          deviceType: click.deviceType,
          browser: click.browser,
          os: click.os,
          subId1: click.subId1,
          subId2: click.subId2,
          subId3: click.subId3,
          subId4: click.subId4,
          subId5: click.subId5,
          status: click.fraudScore && click.fraudScore > 70 ? 'SUSPICIOUS' : 'VALID',
          fraudScore: click.fraudScore,
          fraudReasons: click.fraudReasons,
          isUnique: click.isUnique,
          visitorId: click.visitorId,
          idempotencyKey: click.idempotencyKey,
        },
      }),
    );

    await this.prisma.$transaction(operations);

    // Update link metrics for unique links
    const uniqueLinkIds = [...new Set(clicks.map((c) => c.linkId))];
    await Promise.all(
      uniqueLinkIds.map((linkId) => this.linksService.updateMetrics(linkId)),
    );

    // Update partner metrics
    const partnerClickCounts = clicks.reduce((acc, click) => {
      acc[click.partnerId] = (acc[click.partnerId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    await Promise.all(
      Object.entries(partnerClickCounts).map(([partnerId, count]) =>
        this.prisma.affiliatePartner.update({
          where: { id: partnerId },
          data: {
            totalClicks: { increment: count },
            lastActivityAt: new Date(),
          },
        }),
      ),
    );
  }

  /**
   * Track a conversion (called after successful order)
   */
  async trackConversion(dto: TrackConversionDto) {
    // Handle idempotency
    const idempotencyKey = dto.idempotencyKey || `conv-${dto.orderId}`;
    const idempotencyResult = await this.idempotencyService.checkAndLock(
      `affiliate-conversion:${idempotencyKey}`,
    );

    if (idempotencyResult.isDuplicate) {
      return idempotencyResult.cachedResult;
    }

    try {
      // Find attribution
      const attribution = await this.findAttribution(dto);

      if (!attribution) {
        this.logger.debug(`No affiliate attribution found for order ${dto.orderId}`);
        await this.idempotencyService.complete(
          `affiliate-conversion:${idempotencyKey}`,
          { attributed: false },
        );
        return { attributed: false };
      }

      const { partner, link, click, attributionWindow } = attribution;

      // Get company config for commission rates
      const config = await this.prisma.affiliateProgramConfig.findUnique({
        where: { companyId: dto.companyId },
      });

      // Calculate commission
      const commissionRate = partner.commissionRate ?? config?.defaultCommissionRate ?? 10;
      const commissionFlat = partner.commissionFlat;
      let commissionAmount: number;

      if (commissionFlat !== null && commissionFlat !== undefined) {
        commissionAmount = commissionFlat;
      } else {
        commissionAmount = (dto.orderTotal * commissionRate) / 100;
      }

      // Calculate second-tier commission if applicable
      const secondTierRate = partner.secondTierRate ?? config?.defaultSecondTierRate ?? 0;
      const secondTierAmount = secondTierRate > 0 ? (dto.orderTotal * secondTierRate) / 100 : 0;

      // Create conversion record
      const conversion = await this.prisma.$transaction(async (tx) => {
        const conv = await tx.affiliateConversion.create({
          data: {
            partnerId: partner.id,
            linkId: link?.id,
            companyId: dto.companyId,
            clickId: click?.id,
            orderId: dto.orderId,
            orderNumber: dto.orderNumber,
            orderTotal: dto.orderTotal,
            currency: dto.currency || 'USD',
            commissionRate,
            commissionAmount,
            secondTierAmount,
            attributionWindow,
            isFirstPurchase: dto.isFirstPurchase ?? false,
            customerId: dto.customerId,
            status: 'PENDING',
            idempotencyKey,
          },
        });

        // Update partner metrics
        await tx.affiliatePartner.update({
          where: { id: partner.id },
          data: {
            totalConversions: { increment: 1 },
            totalRevenue: { increment: dto.orderTotal },
            totalEarnings: { increment: commissionAmount },
            currentBalance: { increment: commissionAmount },
            lastActivityAt: new Date(),
            conversionRate: {
              // Recalculate conversion rate
              set: await this.calculateConversionRate(tx, partner.id),
            },
          },
        });

        // Update link metrics if applicable
        if (link) {
          await this.linksService.updateMetrics(link.id);
        }

        return conv;
      });

      // Audit log
      await this.auditLogsService.log(
        AuditAction.AFFILIATE_CONVERSION,
        AuditEntity.AFFILIATE_CONVERSION,
        conversion.id,
        {
          dataClassification: DataClassification.CONFIDENTIAL,
          metadata: {
            orderId: dto.orderId,
            partnerId: partner.id,
            commissionAmount,
            attributionType: click ? 'click' : 'direct',
            attributionWindow,
          },
        },
      );

      await this.idempotencyService.complete(
        `affiliate-conversion:${idempotencyKey}`,
        { attributed: true, conversionId: conversion.id },
      );

      return {
        attributed: true,
        conversionId: conversion.id,
        partnerId: partner.id,
        commissionAmount,
      };
    } catch (error) {
      await this.idempotencyService.fail(`affiliate-conversion:${idempotencyKey}`);
      throw error;
    }
  }

  /**
   * Handle external postback for conversion tracking
   */
  async handlePostback(dto: PostbackDto) {
    // Find click by ID
    const click = await this.prisma.affiliateClick.findFirst({
      where: { idempotencyKey: dto.clickId },
      include: {
        partner: true,
        link: true,
      },
    });

    if (!click) {
      throw new NotFoundException('Click not found');
    }

    // Track conversion using click data
    return this.trackConversion({
      companyId: click.companyId,
      orderId: dto.orderId || `postback-${Date.now()}`,
      orderTotal: dto.amount || 0,
      visitorId: click.visitorId || undefined,
      clickId: click.idempotencyKey || undefined,
      idempotencyKey: `postback-${dto.clickId}-${dto.orderId}`,
    });
  }

  /**
   * Get clicks with filters (admin endpoint)
   */
  async getClicks(user: UserContext, filters: ClickQueryDto) {
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
    if (filters.status) where.status = filters.status as ClickStatus;
    if (filters.subId1) where.subId1 = filters.subId1;
    if (filters.subId2) where.subId2 = filters.subId2;

    if (filters.startDate || filters.endDate) {
      where.clickedAt = {};
      if (filters.startDate) where.clickedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.clickedAt.lte = new Date(filters.endDate);
    }

    const limit = Math.min(parseInt(filters.limit || '50', 10), 100);
    const offset = parseInt(filters.offset || '0', 10);

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
            },
          },
        },
        orderBy: { clickedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.affiliateClick.count({ where }),
    ]);

    return { clicks, total, limit, offset };
  }

  /**
   * Get conversions with filters (admin endpoint)
   */
  async getConversions(user: UserContext, filters: ConversionQueryDto) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    let targetCompanyIds = companyIds;
    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const where: Prisma.AffiliateConversionWhereInput = {
      companyId: { in: targetCompanyIds },
    };

    if (filters.partnerId) where.partnerId = filters.partnerId;
    if (filters.linkId) where.linkId = filters.linkId;
    if (filters.status) where.status = filters.status as ConversionStatus;

    if (filters.startDate || filters.endDate) {
      where.convertedAt = {};
      if (filters.startDate) where.convertedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.convertedAt.lte = new Date(filters.endDate);
    }

    const limit = Math.min(parseInt(filters.limit || '50', 10), 100);
    const offset = parseInt(filters.offset || '0', 10);

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
          order: {
            select: {
              id: true,
              orderNumber: true,
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
   * Get click queue statistics
   */
  getQueueStats() {
    return this.clickQueueService.getStats();
  }

  /**
   * Find attribution for a conversion
   */
  private async findAttribution(dto: TrackConversionDto): Promise<{
    partner: any;
    link: any | null;
    click: any | null;
    attributionWindow: number;
  } | null> {
    // Get company config for attribution settings
    const config = await this.prisma.affiliateProgramConfig.findUnique({
      where: { companyId: dto.companyId },
    });

    const attributionWindowDays = config?.attributionWindowDays ?? this.DEFAULT_ATTRIBUTION_WINDOW;
    const attributionCutoff = new Date();
    attributionCutoff.setDate(attributionCutoff.getDate() - attributionWindowDays);

    // Priority 1: Direct click attribution
    if (dto.clickId) {
      const click = await this.prisma.affiliateClick.findFirst({
        where: {
          idempotencyKey: dto.clickId,
          companyId: dto.companyId,
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
    if (dto.visitorId) {
      const click = await this.prisma.affiliateClick.findFirst({
        where: {
          visitorId: dto.visitorId,
          companyId: dto.companyId,
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
    if (dto.sessionId) {
      const click = await this.prisma.affiliateClick.findFirst({
        where: {
          sessionId: dto.sessionId,
          companyId: dto.companyId,
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
    if (dto.affiliateCode) {
      const partner = await this.prisma.affiliatePartner.findFirst({
        where: {
          affiliateCode: dto.affiliateCode,
          companyId: dto.companyId,
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
   * Build redirect URL with tracking parameters
   */
  private buildRedirectUrl(
    baseUrl: string,
    params: { clickId: string; partnerId: string; sessionId?: string },
  ): string {
    const url = new URL(baseUrl);
    url.searchParams.set('aff_click', params.clickId);
    if (params.sessionId) {
      url.searchParams.set('aff_session', params.sessionId);
    }
    return url.toString();
  }

  /**
   * Calculate conversion rate for a partner
   */
  private async calculateConversionRate(
    tx: Prisma.TransactionClient,
    partnerId: string,
  ): Promise<number> {
    const [clicks, conversions] = await Promise.all([
      tx.affiliateClick.count({ where: { partnerId } }),
      tx.affiliateConversion.count({ where: { partnerId } }),
    ]);

    return clicks > 0 ? (conversions / clicks) * 100 : 0;
  }
}
