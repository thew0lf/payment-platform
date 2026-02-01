import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { Prisma } from '@prisma/client';

export interface AnalyticsFilters {
  companyId?: string;
  partnerId?: string;
  linkId?: string;
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface SubIdReportFilters {
  companyId?: string;
  partnerId?: string;
  subIdField: 'subId1' | 'subId2' | 'subId3' | 'subId4' | 'subId5';
  startDate?: string;
  endDate?: string;
  limit?: number;
}

@Injectable()
export class AffiliateAnalyticsService {
  private readonly logger = new Logger(AffiliateAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Get dashboard analytics overview
   */
  async getDashboard(user: UserContext, filters: AnalyticsFilters) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);
    let targetCompanyIds = companyIds;

    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const baseWhere = {
      companyId: { in: targetCompanyIds },
    };

    const dateFilter = this.buildDateFilter(filters.startDate, filters.endDate);

    // Get key metrics in parallel
    const [
      partners,
      clicks,
      conversions,
      revenue,
      commissions,
      activePartners,
      clickTrend,
      conversionTrend,
    ] = await Promise.all([
      // Total partners
      this.prisma.affiliatePartner.count({
        where: { ...baseWhere, deletedAt: null },
      }),

      // Total clicks in period
      this.prisma.affiliateClick.count({
        where: {
          ...baseWhere,
          clickedAt: dateFilter,
        },
      }),

      // Total conversions in period
      this.prisma.affiliateConversion.count({
        where: {
          ...baseWhere,
          convertedAt: dateFilter,
        },
      }),

      // Total revenue in period
      this.prisma.affiliateConversion.aggregate({
        where: {
          ...baseWhere,
          convertedAt: dateFilter,
          status: { in: ['APPROVED', 'PENDING'] },
        },
        _sum: { orderTotal: true },
      }),

      // Total commissions in period
      this.prisma.affiliateConversion.aggregate({
        where: {
          ...baseWhere,
          convertedAt: dateFilter,
          status: { in: ['APPROVED', 'PENDING'] },
        },
        _sum: { commissionAmount: true },
      }),

      // Active partners (with activity in period)
      this.prisma.affiliatePartner.count({
        where: {
          ...baseWhere,
          deletedAt: null,
          OR: [
            { clicks: { some: { clickedAt: dateFilter } } },
            { conversions: { some: { convertedAt: dateFilter } } },
          ],
        },
      }),

      // Click trend (last 30 days)
      this.getClickTrend(targetCompanyIds, 30),

      // Conversion trend (last 30 days)
      this.getConversionTrend(targetCompanyIds, 30),
    ]);

    const totalRevenue = revenue._sum?.orderTotal || 0;
    const totalCommissions = commissions._sum?.commissionAmount || 0;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const averageOrderValue = conversions > 0 ? totalRevenue / conversions : 0;

    return {
      overview: {
        totalPartners: partners,
        activePartners,
        totalClicks: clicks,
        totalConversions: conversions,
        totalRevenue,
        totalCommissions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      },
      trends: {
        clicks: clickTrend,
        conversions: conversionTrend,
      },
    };
  }

  /**
   * Get performance by partner
   */
  async getPerformanceByPartner(user: UserContext, filters: AnalyticsFilters) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);
    let targetCompanyIds = companyIds;

    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const dateFilter = this.buildDateFilter(filters.startDate, filters.endDate);

    const partners = await this.prisma.affiliatePartner.findMany({
      where: {
        companyId: { in: targetCompanyIds },
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            links: true,
          },
        },
      },
    });

    // Get aggregated stats for each partner
    const partnerStats = await Promise.all(
      partners.map(async (partner) => {
        const [clicks, conversions] = await Promise.all([
          this.prisma.affiliateClick.count({
            where: {
              partnerId: partner.id,
              clickedAt: dateFilter,
            },
          }),
          this.prisma.affiliateConversion.aggregate({
            where: {
              partnerId: partner.id,
              convertedAt: dateFilter,
              status: { in: ['APPROVED', 'PENDING'] },
            },
            _count: true,
            _sum: {
              orderTotal: true,
              commissionAmount: true,
            },
          }),
        ]);

        return {
          partner: {
            id: partner.id,
            firstName: partner.firstName,
            lastName: partner.lastName,
            displayName: partner.displayName,
            email: partner.email,
            affiliateCode: partner.affiliateCode,
            tier: partner.tier,
          },
          metrics: {
            linksCount: partner._count.links,
            clicks,
            conversions: conversions._count,
            revenue: conversions._sum?.orderTotal || 0,
            commissions: conversions._sum?.commissionAmount || 0,
            conversionRate: clicks > 0 ? (conversions._count / clicks) * 100 : 0,
          },
        };
      }),
    );

    // Sort by revenue descending
    partnerStats.sort((a, b) => b.metrics.revenue - a.metrics.revenue);

    return partnerStats;
  }

  /**
   * Get performance by link
   */
  async getPerformanceByLink(user: UserContext, filters: AnalyticsFilters) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);
    let targetCompanyIds = companyIds;

    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const dateFilter = this.buildDateFilter(filters.startDate, filters.endDate);

    const linkWhere: Prisma.AffiliateLinkWhereInput = {
      companyId: { in: targetCompanyIds },
      deletedAt: null,
    };

    if (filters.partnerId) {
      linkWhere.partnerId = filters.partnerId;
    }

    const links = await this.prisma.affiliateLink.findMany({
      where: linkWhere,
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
      },
      orderBy: { totalRevenue: 'desc' },
      take: 100,
    });

    // Get fresh stats for each link
    const linkStats = await Promise.all(
      links.map(async (link) => {
        const [clicks, conversions] = await Promise.all([
          this.prisma.affiliateClick.count({
            where: {
              linkId: link.id,
              clickedAt: dateFilter,
            },
          }),
          this.prisma.affiliateConversion.aggregate({
            where: {
              linkId: link.id,
              convertedAt: dateFilter,
              status: { in: ['APPROVED', 'PENDING'] },
            },
            _count: true,
            _sum: {
              orderTotal: true,
              commissionAmount: true,
            },
          }),
        ]);

        return {
          link: {
            id: link.id,
            name: link.name,
            trackingCode: link.trackingCode,
            shortCode: link.shortCode,
            campaign: link.campaign,
            source: link.source,
            medium: link.medium,
            destinationUrl: link.destinationUrl,
            isActive: link.isActive,
          },
          partner: link.partner,
          metrics: {
            clicks,
            conversions: conversions._count,
            revenue: conversions._sum?.orderTotal || 0,
            commissions: conversions._sum?.commissionAmount || 0,
            conversionRate: clicks > 0 ? (conversions._count / clicks) * 100 : 0,
          },
        };
      }),
    );

    // Sort by revenue descending
    linkStats.sort((a, b) => b.metrics.revenue - a.metrics.revenue);

    return linkStats;
  }

  /**
   * Get SubID breakdown report
   */
  async getSubIdReport(user: UserContext, filters: SubIdReportFilters) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);
    let targetCompanyIds = companyIds;

    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const dateFilter = this.buildDateFilter(filters.startDate, filters.endDate);
    const subIdField = filters.subIdField;
    const limit = filters.limit || 50;

    // Get clicks grouped by subId
    const clickGroups = await this.prisma.affiliateClick.groupBy({
      by: [subIdField],
      where: {
        companyId: { in: targetCompanyIds },
        [subIdField]: { not: null },
        clickedAt: dateFilter,
        ...(filters.partnerId && { partnerId: filters.partnerId }),
      },
      _count: true,
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });

    // Get conversions grouped by subId (from clicks)
    const subIdValues = clickGroups
      .map((g) => g[subIdField])
      .filter((v): v is string => v !== null);

    const conversionStats = await Promise.all(
      subIdValues.map(async (subIdValue) => {
        const result = await this.prisma.affiliateConversion.aggregate({
          where: {
            companyId: { in: targetCompanyIds },
            link: { [subIdField]: subIdValue },
            convertedAt: dateFilter,
            status: { in: ['APPROVED', 'PENDING'] },
            ...(filters.partnerId && { partnerId: filters.partnerId }),
          },
          _count: true,
          _sum: {
            orderTotal: true,
            commissionAmount: true,
          },
        });

        return {
          subId: subIdValue,
          conversions: result._count,
          revenue: result._sum?.orderTotal || 0,
          commissions: result._sum?.commissionAmount || 0,
        };
      }),
    );

    // Merge click and conversion data
    const report = clickGroups.map((clickGroup) => {
      const subIdValue = clickGroup[subIdField];
      const conversionData = conversionStats.find((c) => c.subId === subIdValue) || {
        conversions: 0,
        revenue: 0,
        commissions: 0,
      };

      return {
        subId: subIdValue,
        clicks: clickGroup._count,
        conversions: conversionData.conversions,
        revenue: conversionData.revenue,
        commissions: conversionData.commissions,
        conversionRate:
          clickGroup._count > 0
            ? (conversionData.conversions / clickGroup._count) * 100
            : 0,
      };
    });

    return {
      subIdField,
      data: report,
      totals: {
        clicks: report.reduce((sum, r) => sum + r.clicks, 0),
        conversions: report.reduce((sum, r) => sum + r.conversions, 0),
        revenue: report.reduce((sum, r) => sum + r.revenue, 0),
        commissions: report.reduce((sum, r) => sum + r.commissions, 0),
      },
    };
  }

  /**
   * Get time-series data
   */
  async getTimeSeries(user: UserContext, filters: AnalyticsFilters) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);
    let targetCompanyIds = companyIds;

    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get daily data
    const dates: Date[] = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const data = await Promise.all(
      dates.map(async (date) => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const [clicks, conversions] = await Promise.all([
          this.prisma.affiliateClick.count({
            where: {
              companyId: { in: targetCompanyIds },
              clickedAt: { gte: dayStart, lte: dayEnd },
              ...(filters.partnerId && { partnerId: filters.partnerId }),
              ...(filters.linkId && { linkId: filters.linkId }),
            },
          }),
          this.prisma.affiliateConversion.aggregate({
            where: {
              companyId: { in: targetCompanyIds },
              convertedAt: { gte: dayStart, lte: dayEnd },
              status: { in: ['APPROVED', 'PENDING'] },
              ...(filters.partnerId && { partnerId: filters.partnerId }),
              ...(filters.linkId && { linkId: filters.linkId }),
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

    return data;
  }

  /**
   * Get top performers
   */
  async getTopPerformers(user: UserContext, filters: AnalyticsFilters) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);
    let targetCompanyIds = companyIds;

    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const topPartners = await this.prisma.affiliatePartner.findMany({
      where: {
        companyId: { in: targetCompanyIds },
        status: 'ACTIVE',
        deletedAt: null,
      },
      orderBy: { totalRevenue: 'desc' },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        affiliateCode: true,
        tier: true,
        totalClicks: true,
        totalConversions: true,
        totalRevenue: true,
        totalEarnings: true,
        conversionRate: true,
      },
    });

    const topLinks = await this.prisma.affiliateLink.findMany({
      where: {
        companyId: { in: targetCompanyIds },
        isActive: true,
        deletedAt: null,
      },
      orderBy: { totalRevenue: 'desc' },
      take: 10,
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
      },
    });

    return {
      topPartners,
      topLinks: topLinks.map((link) => ({
        id: link.id,
        name: link.name,
        trackingCode: link.trackingCode,
        campaign: link.campaign,
        totalClicks: link.totalClicks,
        totalConversions: link.totalConversions,
        totalRevenue: link.totalRevenue,
        conversionRate: link.conversionRate,
        partner: link.partner,
      })),
    };
  }

  /**
   * Build date filter for Prisma
   */
  private buildDateFilter(startDate?: string, endDate?: string): Prisma.DateTimeFilter | undefined {
    if (!startDate && !endDate) {
      return undefined;
    }

    const filter: Prisma.DateTimeFilter = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) filter.lte = new Date(endDate);

    return filter;
  }

  /**
   * Get click trend for last N days
   */
  private async getClickTrend(companyIds: string[], days: number) {
    const dates: { date: string; count: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await this.prisma.affiliateClick.count({
        where: {
          companyId: { in: companyIds },
          clickedAt: { gte: dayStart, lte: dayEnd },
        },
      });

      dates.push({
        date: date.toISOString().split('T')[0],
        count,
      });
    }

    return dates;
  }

  /**
   * Get conversion trend for last N days
   */
  private async getConversionTrend(companyIds: string[], days: number) {
    const dates: { date: string; count: number; revenue: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const result = await this.prisma.affiliateConversion.aggregate({
        where: {
          companyId: { in: companyIds },
          convertedAt: { gte: dayStart, lte: dayEnd },
          status: { in: ['APPROVED', 'PENDING'] },
        },
        _count: true,
        _sum: { orderTotal: true },
      });

      dates.push({
        date: date.toISOString().split('T')[0],
        count: result._count,
        revenue: result._sum?.orderTotal || 0,
      });
    }

    return dates;
  }
}
