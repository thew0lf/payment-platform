/**
 * Affiliate Portal Controller
 *
 * Partner-facing API for the affiliate portal.
 * Provides endpoints for affiliates to manage their account, links,
 * view performance metrics, and track earnings.
 *
 * Authentication: JWT token for affiliate partner
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AuditAction, AuditEntity } from '../../audit-logs/types/audit-log.types';
import { DataClassification, Prisma, AffiliateStatus } from '@prisma/client';
import { AffiliateLinksService } from '../services/affiliate-links.service';
import { AffiliateAnalyticsService } from '../services/affiliate-analytics.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUrl,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { randomBytes } from 'crypto';

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

class PortalDashboardQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

class CreatePortalLinkDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsUrl()
  destinationUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  campaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  medium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subId1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subId2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subId3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subId4?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subId5?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

class UpdatePortalLinkDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsUrl()
  destinationUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  campaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  medium?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class LinksQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  campaign?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

class ConversionsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

class PayoutsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  socialMedia?: Record<string, string>;
}

class UpdatePayoutSettingsDto {
  @IsOptional()
  @IsString()
  payoutMethod?: 'PAYPAL' | 'BANK_TRANSFER' | 'CHECK' | 'CRYPTO' | 'STORE_CREDIT';

  @IsOptional()
  payoutDetails?: Record<string, string>;

  @IsOptional()
  @IsString()
  taxId?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONTROLLER
// ═══════════════════════════════════════════════════════════════

@Controller('affiliates/portal')
@UseGuards(JwtAuthGuard)
export class AffiliatePortalController {
  private readonly logger = new Logger(AffiliatePortalController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get partner from authenticated user
   * Throws if user is not an affiliate partner
   */
  private async getPartner(userId: string) {
    const partner = await this.prisma.affiliatePartner.findFirst({
      where: {
        email: userId, // userId is email for affiliate auth
        deletedAt: null,
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true, logo: true },
          include: {
            affiliateProgramConfig: true,
          },
        },
      },
    });

    if (!partner) {
      throw new UnauthorizedException('Affiliate partner not found');
    }

    if (partner.status !== 'ACTIVE') {
      throw new UnauthorizedException(`Affiliate account is ${partner.status.toLowerCase()}`);
    }

    return partner;
  }

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get portal dashboard data
   */
  @Get('dashboard')
  async getDashboard(
    @Request() req,
    @Query() query: PortalDashboardQueryDto,
  ) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get metrics in parallel
    const [
      clicksInPeriod,
      conversionsInPeriod,
      pendingConversions,
      links,
      recentClicks,
      recentConversions,
    ] = await Promise.all([
      // Clicks in period
      this.prisma.affiliateClick.count({
        where: {
          partnerId: partner.id,
          clickedAt: { gte: startDate, lte: endDate },
        },
      }),
      // Conversions in period
      this.prisma.affiliateConversion.aggregate({
        where: {
          partnerId: partner.id,
          convertedAt: { gte: startDate, lte: endDate },
          status: { in: ['APPROVED', 'PENDING'] },
        },
        _count: true,
        _sum: { orderTotal: true, commissionAmount: true },
      }),
      // Pending conversions count
      this.prisma.affiliateConversion.count({
        where: {
          partnerId: partner.id,
          status: 'PENDING',
        },
      }),
      // Active links count
      this.prisma.affiliateLink.count({
        where: {
          partnerId: partner.id,
          isActive: true,
          deletedAt: null,
        },
      }),
      // Recent clicks
      this.prisma.affiliateClick.findMany({
        where: { partnerId: partner.id },
        orderBy: { clickedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          clickedAt: true,
          deviceType: true,
          country: true,
          link: {
            select: { name: true, trackingCode: true },
          },
        },
      }),
      // Recent conversions
      this.prisma.affiliateConversion.findMany({
        where: { partnerId: partner.id },
        orderBy: { convertedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          convertedAt: true,
          orderTotal: true,
          commissionAmount: true,
          status: true,
        },
      }),
    ]);

    const conversionRate = clicksInPeriod > 0
      ? (conversionsInPeriod._count / clicksInPeriod) * 100
      : 0;

    return {
      partner: {
        id: partner.id,
        firstName: partner.firstName,
        lastName: partner.lastName,
        displayName: partner.displayName,
        email: partner.email,
        affiliateCode: partner.affiliateCode,
        tier: partner.tier,
        status: partner.status,
      },
      company: {
        name: partner.company.name,
        logo: partner.company.logo,
      },
      program: partner.company.affiliateProgramConfig ? {
        name: partner.company.affiliateProgramConfig.programName,
        commissionRate: partner.commissionRate ?? partner.company.affiliateProgramConfig.defaultCommissionRate,
        cookieDurationDays: partner.cookieDurationDays ?? partner.company.affiliateProgramConfig.defaultCookieDurationDays,
        minimumPayout: partner.payoutThreshold ?? partner.company.affiliateProgramConfig.minimumPayoutThreshold,
      } : null,
      metrics: {
        // Lifetime metrics
        totalClicks: partner.totalClicks,
        totalConversions: partner.totalConversions,
        totalRevenue: partner.totalRevenue,
        totalEarnings: partner.totalEarnings,
        currentBalance: partner.currentBalance,
        totalPaid: partner.totalPaid,
        lifetimeConversionRate: partner.conversionRate,
        // Period metrics
        periodClicks: clicksInPeriod,
        periodConversions: conversionsInPeriod._count,
        periodRevenue: conversionsInPeriod._sum?.orderTotal || 0,
        periodEarnings: conversionsInPeriod._sum?.commissionAmount || 0,
        periodConversionRate: Math.round(conversionRate * 100) / 100,
        // Pending
        pendingConversions,
        activeLinks: links,
      },
      recentActivity: {
        clicks: recentClicks,
        conversions: recentConversions,
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PROFILE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get partner profile
   */
  @Get('profile')
  async getProfile(@Request() req) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    return {
      id: partner.id,
      email: partner.email,
      firstName: partner.firstName,
      lastName: partner.lastName,
      displayName: partner.displayName,
      phone: partner.phone,
      website: partner.website,
      socialMedia: partner.socialMedia,
      affiliateCode: partner.affiliateCode,
      tier: partner.tier,
      status: partner.status,
      partnershipType: partner.partnershipType,
      // Commission
      commissionRate: partner.commissionRate,
      commissionFlat: partner.commissionFlat,
      cookieDurationDays: partner.cookieDurationDays,
      // Payout
      payoutMethod: partner.payoutMethod,
      payoutThreshold: partner.payoutThreshold,
      w9OnFile: partner.w9OnFile,
      // Timestamps
      createdAt: partner.createdAt,
      approvedAt: partner.approvedAt,
      lastActivityAt: partner.lastActivityAt,
    };
  }

  /**
   * Update partner profile
   */
  @Patch('profile')
  async updateProfile(
    @Request() req,
    @Body() dto: UpdateProfileDto,
  ) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const updated = await this.prisma.affiliatePartner.update({
      where: { id: partner.id },
      data: {
        displayName: dto.displayName,
        phone: dto.phone,
        website: dto.website,
        socialMedia: dto.socialMedia as Prisma.InputJsonValue,
        lastActivityAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        phone: true,
        website: true,
        socialMedia: true,
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.UPDATE,
      AuditEntity.AFFILIATE_PARTNER,
      partner.id,
      {
        userId: partner.id,
        dataClassification: DataClassification.PII,
        metadata: {
          source: 'affiliate_portal',
          updatedFields: Object.keys(dto),
        },
      },
    );

    return updated;
  }

  /**
   * Update payout settings
   */
  @Patch('profile/payout')
  async updatePayoutSettings(
    @Request() req,
    @Body() dto: UpdatePayoutSettingsDto,
  ) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const updateData: Prisma.AffiliatePartnerUpdateInput = {
      lastActivityAt: new Date(),
    };

    if (dto.payoutMethod) {
      updateData.payoutMethod = dto.payoutMethod;
    }

    if (dto.payoutDetails) {
      // TODO: Encrypt sensitive payout details
      updateData.payoutDetails = dto.payoutDetails as Prisma.InputJsonValue;
    }

    if (dto.taxId) {
      updateData.taxId = dto.taxId;
    }

    const updated = await this.prisma.affiliatePartner.update({
      where: { id: partner.id },
      data: updateData,
      select: {
        id: true,
        payoutMethod: true,
        payoutThreshold: true,
        taxId: true,
        w9OnFile: true,
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.UPDATE,
      AuditEntity.AFFILIATE_PARTNER,
      partner.id,
      {
        userId: partner.id,
        dataClassification: DataClassification.CONFIDENTIAL,
        metadata: {
          source: 'affiliate_portal',
          action: 'update_payout_settings',
        },
      },
    );

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════
  // LINKS
  // ═══════════════════════════════════════════════════════════════

  /**
   * List partner's affiliate links
   */
  @Get('links')
  async listLinks(
    @Request() req,
    @Query() query: LinksQueryDto,
  ) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const where: Prisma.AffiliateLinkWhereInput = {
      partnerId: partner.id,
      deletedAt: null,
    };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.campaign) {
      where.campaign = query.campaign;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { trackingCode: { contains: query.search, mode: 'insensitive' } },
        { destinationUrl: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    const [links, total] = await Promise.all([
      this.prisma.affiliateLink.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          destinationUrl: true,
          trackingCode: true,
          shortCode: true,
          campaign: true,
          source: true,
          medium: true,
          subId1: true,
          subId2: true,
          subId3: true,
          subId4: true,
          subId5: true,
          isActive: true,
          totalClicks: true,
          uniqueClicks: true,
          totalConversions: true,
          totalRevenue: true,
          conversionRate: true,
          createdAt: true,
        },
      }),
      this.prisma.affiliateLink.count({ where }),
    ]);

    // Build tracking URLs
    const baseUrl = process.env.TRACKING_BASE_URL || 'https://go.avnz.io';
    const linksWithUrls = links.map((link) => ({
      ...link,
      trackingUrl: `${baseUrl}/${link.shortCode || link.trackingCode}`,
    }));

    return { links: linksWithUrls, total, limit, offset };
  }

  /**
   * Get a single link
   */
  @Get('links/:id')
  async getLink(
    @Request() req,
    @Param('id') id: string,
  ) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const link = await this.prisma.affiliateLink.findFirst({
      where: {
        id,
        partnerId: partner.id,
        deletedAt: null,
      },
      include: {
        clicks: {
          orderBy: { clickedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            clickedAt: true,
            deviceType: true,
            browser: true,
            country: true,
          },
        },
        conversions: {
          orderBy: { convertedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            convertedAt: true,
            orderTotal: true,
            commissionAmount: true,
            status: true,
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    const baseUrl = process.env.TRACKING_BASE_URL || 'https://go.avnz.io';

    return {
      ...link,
      trackingUrl: `${baseUrl}/${link.shortCode || link.trackingCode}`,
    };
  }

  /**
   * Create a new tracking link
   */
  @Post('links')
  @HttpCode(HttpStatus.CREATED)
  async createLink(
    @Request() req,
    @Body() dto: CreatePortalLinkDto,
  ) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    // Handle idempotency
    if (dto.idempotencyKey) {
      const result = await this.idempotencyService.checkAndLock(
        `portal-link:${dto.idempotencyKey}`,
      );
      if (result.isDuplicate) {
        return result.cachedResult;
      }
    }

    // Generate tracking code
    const trackingCode = randomBytes(8).toString('base64url');

    // Generate short code
    const shortCode = randomBytes(4).toString('base64url').replace(/[_-]/g, '').slice(0, 6).toLowerCase();

    try {
      const link = await this.prisma.affiliateLink.create({
        data: {
          partnerId: partner.id,
          companyId: partner.companyId,
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
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          destinationUrl: true,
          trackingCode: true,
          shortCode: true,
          campaign: true,
          source: true,
          medium: true,
          isActive: true,
          createdAt: true,
        },
      });

      // Update partner activity
      await this.prisma.affiliatePartner.update({
        where: { id: partner.id },
        data: { lastActivityAt: new Date() },
      });

      // Audit log
      await this.auditLogsService.log(
        AuditAction.CREATE,
        AuditEntity.AFFILIATE_LINK,
        link.id,
        {
          userId: partner.id,
          dataClassification: DataClassification.INTERNAL,
          metadata: {
            source: 'affiliate_portal',
            trackingCode,
          },
        },
      );

      // Complete idempotency
      if (dto.idempotencyKey) {
        await this.idempotencyService.complete(`portal-link:${dto.idempotencyKey}`, link);
      }

      const baseUrl = process.env.TRACKING_BASE_URL || 'https://go.avnz.io';

      return {
        ...link,
        trackingUrl: `${baseUrl}/${link.shortCode}`,
      };
    } catch (error) {
      if (dto.idempotencyKey) {
        await this.idempotencyService.fail(`portal-link:${dto.idempotencyKey}`);
      }
      throw error;
    }
  }

  /**
   * Update a tracking link
   */
  @Patch('links/:id')
  async updateLink(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdatePortalLinkDto,
  ) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const link = await this.prisma.affiliateLink.findFirst({
      where: {
        id,
        partnerId: partner.id,
        deletedAt: null,
      },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    const updated = await this.prisma.affiliateLink.update({
      where: { id },
      data: {
        name: dto.name,
        destinationUrl: dto.destinationUrl,
        campaign: dto.campaign,
        source: dto.source,
        medium: dto.medium,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        name: true,
        destinationUrl: true,
        trackingCode: true,
        shortCode: true,
        campaign: true,
        source: true,
        medium: true,
        isActive: true,
        totalClicks: true,
        totalConversions: true,
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.UPDATE,
      AuditEntity.AFFILIATE_LINK,
      id,
      {
        userId: partner.id,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          source: 'affiliate_portal',
        },
      },
    );

    const baseUrl = process.env.TRACKING_BASE_URL || 'https://go.avnz.io';

    return {
      ...updated,
      trackingUrl: `${baseUrl}/${updated.shortCode || updated.trackingCode}`,
    };
  }

  /**
   * Delete (deactivate) a tracking link
   */
  @Delete('links/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLink(
    @Request() req,
    @Param('id') id: string,
  ) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const link = await this.prisma.affiliateLink.findFirst({
      where: {
        id,
        partnerId: partner.id,
        deletedAt: null,
      },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    await this.prisma.affiliateLink.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.DELETE,
      AuditEntity.AFFILIATE_LINK,
      id,
      {
        userId: partner.id,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          source: 'affiliate_portal',
          trackingCode: link.trackingCode,
        },
      },
    );

    return { success: true };
  }

  /**
   * Get link statistics
   */
  @Get('links/:id/stats')
  async getLinkStats(
    @Request() req,
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const link = await this.prisma.affiliateLink.findFirst({
      where: {
        id,
        partnerId: partner.id,
        deletedAt: null,
      },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get daily data
    const dates: Date[] = [];
    let current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const dailyData = await Promise.all(
      dates.map(async (date) => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const [clicks, conversions] = await Promise.all([
          this.prisma.affiliateClick.count({
            where: {
              linkId: link.id,
              clickedAt: { gte: dayStart, lte: dayEnd },
            },
          }),
          this.prisma.affiliateConversion.aggregate({
            where: {
              linkId: link.id,
              convertedAt: { gte: dayStart, lte: dayEnd },
              status: { in: ['APPROVED', 'PENDING'] },
            },
            _count: true,
            _sum: { orderTotal: true, commissionAmount: true },
          }),
        ]);

        return {
          date: date.toISOString().split('T')[0],
          clicks,
          conversions: conversions._count,
          revenue: conversions._sum?.orderTotal || 0,
        };
      }),
    );

    // Get SubID breakdown
    const subIdBreakdown = {
      subId1: await this.getSubIdStats(link.id, 'subId1', start, end),
      subId2: await this.getSubIdStats(link.id, 'subId2', start, end),
      subId3: await this.getSubIdStats(link.id, 'subId3', start, end),
      subId4: await this.getSubIdStats(link.id, 'subId4', start, end),
      subId5: await this.getSubIdStats(link.id, 'subId5', start, end),
    };

    // Calculate summary
    const totalClicks = dailyData.reduce((sum, d) => sum + d.clicks, 0);
    const totalConversions = dailyData.reduce((sum, d) => sum + d.conversions, 0);
    const totalRevenue = dailyData.reduce((sum, d) => sum + d.revenue, 0);

    // Get unique clicks
    const uniqueClicks = await this.prisma.affiliateClick.count({
      where: {
        linkId: link.id,
        clickedAt: { gte: start, lte: end },
        isUnique: true,
      },
    });

    // Get total commission
    const commissionAgg = await this.prisma.affiliateConversion.aggregate({
      where: {
        linkId: link.id,
        convertedAt: { gte: start, lte: end },
        status: { in: ['APPROVED', 'PENDING'] },
      },
      _sum: { commissionAmount: true },
    });

    return {
      link: {
        id: link.id,
        name: link.name,
        trackingCode: link.trackingCode,
        destinationUrl: link.destinationUrl,
      },
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        totalClicks,
        uniqueClicks,
        totalConversions,
        conversionRate: totalClicks > 0 ? totalConversions / totalClicks : 0,
        totalRevenue,
        totalCommission: commissionAgg._sum?.commissionAmount || 0,
      },
      chartData: dailyData,
      subIdBreakdown,
    };
  }

  /**
   * Helper to get SubID statistics
   */
  private async getSubIdStats(
    linkId: string,
    subIdField: 'subId1' | 'subId2' | 'subId3' | 'subId4' | 'subId5',
    start: Date,
    end: Date,
  ) {
    // Get clicks grouped by SubID
    const clicks = await this.prisma.affiliateClick.groupBy({
      by: [subIdField],
      where: {
        linkId,
        clickedAt: { gte: start, lte: end },
        [subIdField]: { not: null },
      },
      _count: true,
    });

    if (clicks.length === 0) return [];

    // Get conversions for each SubID value
    const results = await Promise.all(
      clicks.map(async (click) => {
        const subIdValue = click[subIdField] as string;
        const conversions = await this.prisma.affiliateConversion.aggregate({
          where: {
            linkId,
            convertedAt: { gte: start, lte: end },
            [subIdField]: subIdValue,
            status: { in: ['APPROVED', 'PENDING'] },
          },
          _count: { _all: true },
          _sum: { orderTotal: true, commissionAmount: true },
        });

        const clickCount = click._count as unknown as number;
        const conversionCount = conversions._count._all;
        return {
          value: subIdValue,
          clicks: clickCount,
          conversions: conversionCount,
          revenue: conversions._sum?.orderTotal || 0,
          conversionRate: clickCount > 0 ? conversionCount / clickCount : 0,
        };
      }),
    );

    return results.sort((a, b) => b.clicks - a.clicks).slice(0, 10);
  }

  /**
   * Duplicate a tracking link
   */
  @Post('links/:id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicateLink(
    @Request() req,
    @Param('id') id: string,
  ) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const originalLink = await this.prisma.affiliateLink.findFirst({
      where: {
        id,
        partnerId: partner.id,
        deletedAt: null,
      },
    });

    if (!originalLink) {
      throw new NotFoundException('Link not found');
    }

    // Generate new tracking code and short code
    const trackingCode = randomBytes(8).toString('base64url');
    const shortCode = randomBytes(4).toString('base64url').replace(/[_-]/g, '').slice(0, 6).toLowerCase();

    const newLink = await this.prisma.affiliateLink.create({
      data: {
        partnerId: partner.id,
        companyId: partner.companyId,
        name: originalLink.name ? `${originalLink.name} (Copy)` : 'Link (Copy)',
        destinationUrl: originalLink.destinationUrl,
        trackingCode,
        shortCode,
        campaign: originalLink.campaign,
        source: originalLink.source,
        medium: originalLink.medium,
        subId1: originalLink.subId1,
        subId2: originalLink.subId2,
        subId3: originalLink.subId3,
        subId4: originalLink.subId4,
        subId5: originalLink.subId5,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        destinationUrl: true,
        trackingCode: true,
        shortCode: true,
        campaign: true,
        source: true,
        medium: true,
        isActive: true,
        totalClicks: true,
        uniqueClicks: true,
        totalConversions: true,
        totalRevenue: true,
        conversionRate: true,
        createdAt: true,
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.CREATE,
      AuditEntity.AFFILIATE_LINK,
      newLink.id,
      {
        userId: partner.id,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          source: 'affiliate_portal',
          action: 'duplicate',
          originalLinkId: id,
          trackingCode,
        },
      },
    );

    const baseUrl = process.env.TRACKING_BASE_URL || 'https://go.avnz.io';

    return {
      ...newLink,
      trackingUrl: `${baseUrl}/${newLink.shortCode}`,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CONVERSIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * List partner's conversions
   */
  @Get('conversions')
  async listConversions(
    @Request() req,
    @Query() query: ConversionsQueryDto,
  ) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const where: Prisma.AffiliateConversionWhereInput = {
      partnerId: partner.id,
    };

    if (query.status) {
      where.status = query.status as any;
    }

    if (query.startDate || query.endDate) {
      where.convertedAt = {};
      if (query.startDate) where.convertedAt.gte = new Date(query.startDate);
      if (query.endDate) where.convertedAt.lte = new Date(query.endDate);
    }

    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    const [conversions, total, stats] = await Promise.all([
      this.prisma.affiliateConversion.findMany({
        where,
        orderBy: { convertedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          convertedAt: true,
          orderNumber: true,
          orderTotal: true,
          commissionRate: true,
          commissionAmount: true,
          status: true,
          attributionWindow: true,
          link: {
            select: {
              id: true,
              name: true,
              trackingCode: true,
            },
          },
        },
      }),
      this.prisma.affiliateConversion.count({ where }),
      this.prisma.affiliateConversion.aggregate({
        where,
        _sum: { orderTotal: true, commissionAmount: true },
        _count: true,
      }),
    ]);

    return {
      conversions,
      total,
      limit,
      offset,
      summary: {
        totalCount: stats._count,
        totalRevenue: stats._sum?.orderTotal || 0,
        totalCommissions: stats._sum?.commissionAmount || 0,
      },
    };
  }

  /**
   * Get conversion details
   */
  @Get('conversions/:id')
  async getConversion(
    @Request() req,
    @Param('id') id: string,
  ) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const conversion = await this.prisma.affiliateConversion.findFirst({
      where: {
        id,
        partnerId: partner.id,
      },
      include: {
        link: {
          select: {
            id: true,
            name: true,
            trackingCode: true,
            campaign: true,
            source: true,
          },
        },
      },
    });

    if (!conversion) {
      throw new NotFoundException('Conversion not found');
    }

    return conversion;
  }

  // ═══════════════════════════════════════════════════════════════
  // PAYOUTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * List partner's payouts
   */
  @Get('payouts')
  async listPayouts(
    @Request() req,
    @Query() query: PayoutsQueryDto,
  ) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const where: Prisma.AffiliatePayoutWhereInput = {
      partnerId: partner.id,
    };

    if (query.status) {
      where.status = query.status as any;
    }

    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    const [payouts, total] = await Promise.all([
      this.prisma.affiliatePayout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          status: true,
          periodStart: true,
          periodEnd: true,
          grossAmount: true,
          fees: true,
          netAmount: true,
          conversionsCount: true,
          invoiceNumber: true,
          invoiceUrl: true,
          processedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.affiliatePayout.count({ where }),
    ]);

    return { payouts, total, limit, offset };
  }

  /**
   * Get payout details
   */
  @Get('payouts/:id')
  async getPayout(
    @Request() req,
    @Param('id') id: string,
  ) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const payout = await this.prisma.affiliatePayout.findFirst({
      where: {
        id,
        partnerId: partner.id,
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return payout;
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get performance analytics
   */
  @Get('analytics')
  async getAnalytics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get daily data for the period
    const dates: Date[] = [];
    let current = new Date(start);
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const dailyData = await Promise.all(
      dates.map(async (date) => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const [clicks, conversions] = await Promise.all([
          this.prisma.affiliateClick.count({
            where: {
              partnerId: partner.id,
              clickedAt: { gte: dayStart, lte: dayEnd },
            },
          }),
          this.prisma.affiliateConversion.aggregate({
            where: {
              partnerId: partner.id,
              convertedAt: { gte: dayStart, lte: dayEnd },
              status: { in: ['APPROVED', 'PENDING'] },
            },
            _count: true,
            _sum: { orderTotal: true, commissionAmount: true },
          }),
        ]);

        return {
          date: date.toISOString().split('T')[0],
          clicks,
          conversions: conversions._count,
          revenue: conversions._sum?.orderTotal || 0,
          commissions: conversions._sum?.commissionAmount || 0,
        };
      }),
    );

    // Get top performing links
    const topLinks = await this.prisma.affiliateLink.findMany({
      where: {
        partnerId: partner.id,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { totalRevenue: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        trackingCode: true,
        totalClicks: true,
        totalConversions: true,
        totalRevenue: true,
        conversionRate: true,
      },
    });

    return {
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      dailyData,
      topLinks,
      totals: {
        clicks: dailyData.reduce((sum, d) => sum + d.clicks, 0),
        conversions: dailyData.reduce((sum, d) => sum + d.conversions, 0),
        revenue: dailyData.reduce((sum, d) => sum + d.revenue, 0),
        commissions: dailyData.reduce((sum, d) => sum + d.commissions, 0),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // RESOURCES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get available creatives/marketing materials
   */
  @Get('resources')
  async getResources(@Request() req) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const creatives = await this.prisma.affiliateCreative.findMany({
      where: {
        companyId: partner.companyId,
        isActive: true,
        deletedAt: null,
        OR: [
          { partnerId: null }, // Available to all partners
          { partnerId: partner.id }, // Specific to this partner
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        size: true,
        assetUrl: true,
        thumbnailUrl: true,
        htmlCode: true,
        createdAt: true,
      },
    });

    // Group by type
    const grouped = creatives.reduce((acc, creative) => {
      const type = creative.type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(creative);
      return acc;
    }, {} as Record<string, typeof creatives>);

    return {
      creatives,
      byType: grouped,
      total: creatives.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PROGRAM INFO
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get affiliate program information
   */
  @Get('program')
  async getProgramInfo(@Request() req) {
    const partner = await this.getPartner(req.user.email || req.user.sub);

    const config = partner.company.affiliateProgramConfig;

    if (!config) {
      throw new NotFoundException('Affiliate program not configured');
    }

    return {
      programName: config.programName,
      programDescription: config.programDescription,
      // Commission info
      defaultCommissionRate: config.defaultCommissionRate,
      defaultCommissionFlat: config.defaultCommissionFlat,
      secondTierRate: config.defaultSecondTierRate,
      cookieDurationDays: config.defaultCookieDurationDays,
      // Partner's specific rates
      partnerCommissionRate: partner.commissionRate ?? config.defaultCommissionRate,
      partnerCommissionFlat: partner.commissionFlat,
      partnerCookieDays: partner.cookieDurationDays ?? config.defaultCookieDurationDays,
      // Payout info
      minimumPayoutThreshold: config.minimumPayoutThreshold,
      payoutFrequency: config.payoutFrequency,
      // Tier info
      tierThresholds: config.tierThresholds,
      currentTier: partner.tier,
      // Legal
      termsUrl: config.termsUrl,
      privacyUrl: config.privacyUrl,
      // Branding
      welcomeMessage: config.welcomeMessage,
    };
  }
}
