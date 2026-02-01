import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { Prisma } from '@prisma/client';
import {
  OverviewQueryDto,
  PerformanceQueryDto,
  SubIdQueryDto,
  TrendsQueryDto,
  TopPerformersQueryDto,
  ExportReportDto,
  ReportInterval,
  ReportMetric,
  ExportFormat,
  ReportType,
  SubIdField,
  ReportOverviewDto,
  PerformanceReportDto,
  SubIdReportDto,
  TrendReportDto,
  TopAffiliateDto,
  TopLinkDto,
  ExportResultDto,
  PeriodMetrics,
  TrendDataPoint,
  SubIdBreakdownItem,
} from '../dto/affiliate-reports.dto';

@Injectable()
export class AffiliateReportsService {
  private readonly logger = new Logger(AffiliateReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // OVERVIEW REPORT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get program overview metrics with period comparison
   */
  async getOverview(user: UserContext, query: OverviewQueryDto): Promise<ReportOverviewDto> {
    const companyIds = await this.getAccessibleCompanyIds(user, query.companyId);
    const { startDate, endDate } = this.normalizeDateRange(query.startDate, query.endDate);

    // Calculate previous period for comparison
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const [
      currentMetrics,
      previousMetrics,
      activeAffiliates,
      newAffiliates,
      pendingPayouts,
    ] = await Promise.all([
      this.getPeriodMetrics(companyIds, startDate, endDate),
      this.getPeriodMetrics(companyIds, prevStartDate, prevEndDate),
      this.getActiveAffiliatesCount(companyIds, startDate, endDate),
      this.getNewAffiliatesCount(companyIds, startDate, endDate),
      this.getPendingPayoutsInfo(companyIds),
    ]);

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      metrics: currentMetrics,
      comparison: {
        current: currentMetrics,
        previous: previousMetrics,
        change: this.calculateChange(currentMetrics, previousMetrics),
      },
      activeAffiliates,
      newAffiliates,
      pendingPayouts: pendingPayouts.count,
      pendingPayoutsAmount: pendingPayouts.amount,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PERFORMANCE BY AFFILIATE REPORT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get performance breakdown by affiliate
   */
  async getPerformanceByAffiliate(
    user: UserContext,
    query: PerformanceQueryDto,
  ): Promise<PerformanceReportDto> {
    const companyIds = await this.getAccessibleCompanyIds(user, query.companyId);
    const { startDate, endDate } = this.normalizeDateRange(query.startDate, query.endDate);
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const dateFilter = this.buildDateFilter(startDate, endDate);

    const partnerWhere: Prisma.AffiliatePartnerWhereInput = {
      companyId: { in: companyIds },
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (query.partnerId) {
      partnerWhere.id = query.partnerId;
    }

    // Get partners
    const partners = await this.prisma.affiliatePartner.findMany({
      where: partnerWhere,
      include: {
        _count: { select: { links: true } },
      },
    });

    // Get stats for each partner
    const performanceData = await Promise.all(
      partners.map(async (partner) => {
        const [clicks, conversions, topLink] = await Promise.all([
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
            _count: { _all: true },
            _sum: { orderTotal: true, commissionAmount: true },
          }),
          this.prisma.affiliateLink.findFirst({
            where: {
              partnerId: partner.id,
              deletedAt: null,
            },
            orderBy: { totalRevenue: 'desc' },
            select: { id: true, name: true, totalRevenue: true },
          }),
        ]);

        const uniqueClicks = await this.prisma.affiliateClick.count({
          where: {
            partnerId: partner.id,
            clickedAt: dateFilter,
            isUnique: true,
          },
        });

        const convCount = conversions._count._all;
        const revenue = conversions._sum?.orderTotal || 0;
        const commissions = conversions._sum?.commissionAmount || 0;

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
          metrics: {
            clicks,
            uniqueClicks,
            conversions: convCount,
            conversionRate: clicks > 0 ? (convCount / clicks) * 100 : 0,
            revenue,
            commissions,
            epc: clicks > 0 ? commissions / clicks : 0,
            averageOrderValue: convCount > 0 ? revenue / convCount : 0,
          },
          linksCount: partner._count.links,
          topLink: topLink ? {
            id: topLink.id,
            name: topLink.name,
            revenue: topLink.totalRevenue,
          } : undefined,
        };
      }),
    );

    // Sort by metric
    const sortBy = query.sortBy || ReportMetric.REVENUE;
    const sortOrder = query.sortOrder || 'desc';
    performanceData.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortBy) {
        case ReportMetric.CLICKS:
          aVal = a.metrics.clicks;
          bVal = b.metrics.clicks;
          break;
        case ReportMetric.CONVERSIONS:
          aVal = a.metrics.conversions;
          bVal = b.metrics.conversions;
          break;
        case ReportMetric.COMMISSIONS:
          aVal = a.metrics.commissions;
          bVal = b.metrics.commissions;
          break;
        case ReportMetric.EPC:
          aVal = a.metrics.epc;
          bVal = b.metrics.epc;
          break;
        case ReportMetric.REVENUE:
        default:
          aVal = a.metrics.revenue;
          bVal = b.metrics.revenue;
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // Paginate
    const paginatedData = performanceData.slice(offset, offset + limit);

    // Calculate totals
    const totals = this.aggregateMetrics(performanceData.map((p) => p.metrics));

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      data: paginatedData,
      totals,
      total: performanceData.length,
      limit,
      offset,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SUB-ID BREAKDOWN REPORT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get performance breakdown by SubID values
   */
  async getPerformanceBySubId(
    user: UserContext,
    query: SubIdQueryDto,
  ): Promise<SubIdReportDto> {
    const companyIds = await this.getAccessibleCompanyIds(user, query.companyId);
    const { startDate, endDate } = this.normalizeDateRange(query.startDate, query.endDate);
    const limit = query.limit || 50;
    const groupBy = query.groupBy;
    const secondGroupBy = query.secondGroupBy;

    const dateFilter = this.buildDateFilter(startDate, endDate);

    const clickWhere: Prisma.AffiliateClickWhereInput = {
      companyId: { in: companyIds },
      clickedAt: dateFilter,
      [groupBy]: { not: null },
    };

    if (query.partnerId) {
      clickWhere.partnerId = query.partnerId;
    }

    // Get clicks grouped by subId
    const clickGroups = await this.prisma.affiliateClick.groupBy({
      by: [groupBy],
      where: clickWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const subIdValues = clickGroups
      .map((g) => g[groupBy])
      .filter((v): v is string => v !== null);

    // Get detailed stats for each subId value
    const data: SubIdBreakdownItem[] = await Promise.all(
      subIdValues.map(async (subIdValue) => {
        const [clicks, uniqueClicks, conversions] = await Promise.all([
          this.prisma.affiliateClick.count({
            where: {
              ...clickWhere,
              [groupBy]: subIdValue,
            },
          }),
          this.prisma.affiliateClick.count({
            where: {
              ...clickWhere,
              [groupBy]: subIdValue,
              isUnique: true,
            },
          }),
          this.prisma.affiliateConversion.aggregate({
            where: {
              companyId: { in: companyIds },
              convertedAt: dateFilter,
              status: { in: ['APPROVED', 'PENDING'] },
              [groupBy]: subIdValue,
              ...(query.partnerId && { partnerId: query.partnerId }),
            },
            _count: { _all: true },
            _sum: { orderTotal: true, commissionAmount: true },
          }),
        ]);

        const convCount = conversions._count._all;
        const revenue = conversions._sum?.orderTotal || 0;
        const commissions = conversions._sum?.commissionAmount || 0;

        const item: SubIdBreakdownItem = {
          value: subIdValue,
          clicks,
          uniqueClicks,
          conversions: convCount,
          conversionRate: clicks > 0 ? (convCount / clicks) * 100 : 0,
          revenue,
          commissions,
          epc: clicks > 0 ? commissions / clicks : 0,
        };

        // If second level grouping is requested
        if (secondGroupBy) {
          const children = await this.getSecondLevelSubIdBreakdown(
            companyIds,
            dateFilter,
            groupBy,
            subIdValue,
            secondGroupBy,
            query.partnerId,
          );
          item.children = children;
        }

        return item;
      }),
    );

    // Calculate totals
    const totals: PeriodMetrics = {
      clicks: data.reduce((sum, d) => sum + d.clicks, 0),
      uniqueClicks: data.reduce((sum, d) => sum + d.uniqueClicks, 0),
      conversions: data.reduce((sum, d) => sum + d.conversions, 0),
      conversionRate: 0,
      revenue: data.reduce((sum, d) => sum + d.revenue, 0),
      commissions: data.reduce((sum, d) => sum + d.commissions, 0),
      epc: 0,
      averageOrderValue: 0,
    };
    totals.conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
    totals.epc = totals.clicks > 0 ? totals.commissions / totals.clicks : 0;
    totals.averageOrderValue = totals.conversions > 0 ? totals.revenue / totals.conversions : 0;

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      groupBy,
      secondGroupBy,
      data,
      totals,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // TRENDS REPORT (TIME SERIES)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get time-series trend data
   */
  async getTrends(user: UserContext, query: TrendsQueryDto): Promise<TrendReportDto> {
    const companyIds = await this.getAccessibleCompanyIds(user, query.companyId);
    const { startDate, endDate } = this.normalizeDateRange(query.startDate, query.endDate);
    const interval = query.interval || ReportInterval.DAILY;
    const comparePrevious = query.comparePrevious === 'true';

    // Generate date buckets based on interval
    const buckets = this.generateDateBuckets(startDate, endDate, interval);

    // Get data for current period
    const data = await this.getTrendDataForPeriod(
      companyIds,
      buckets,
      query.partnerId,
      query.linkId,
    );

    let previousPeriod: TrendDataPoint[] | undefined;
    let previousTotals: PeriodMetrics | undefined;

    // If comparing with previous period
    if (comparePrevious) {
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const prevEndDate = new Date(startDate.getTime() - 1);
      const prevStartDate = new Date(prevEndDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
      const prevBuckets = this.generateDateBuckets(prevStartDate, prevEndDate, interval);

      previousPeriod = await this.getTrendDataForPeriod(
        companyIds,
        prevBuckets,
        query.partnerId,
        query.linkId,
      );

      previousTotals = this.aggregateTrendData(previousPeriod);
    }

    const totals = this.aggregateTrendData(data);

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      interval,
      data,
      previousPeriod,
      totals,
      previousTotals,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // TOP PERFORMERS REPORTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get top performing affiliates
   */
  async getTopAffiliates(
    user: UserContext,
    query: TopPerformersQueryDto,
  ): Promise<TopAffiliateDto[]> {
    const companyIds = await this.getAccessibleCompanyIds(user, query.companyId);
    const { startDate, endDate } = this.normalizeDateRange(query.startDate, query.endDate);
    const limit = query.limit || 10;
    const metric = query.metric || ReportMetric.REVENUE;
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Determine sort field based on metric
    let orderBy: Prisma.AffiliatePartnerOrderByWithRelationInput;
    switch (metric) {
      case ReportMetric.CLICKS:
        orderBy = { totalClicks: 'desc' };
        break;
      case ReportMetric.CONVERSIONS:
        orderBy = { totalConversions: 'desc' };
        break;
      case ReportMetric.COMMISSIONS:
        orderBy = { totalEarnings: 'desc' };
        break;
      case ReportMetric.REVENUE:
      default:
        orderBy = { totalRevenue: 'desc' };
    }

    const partners = await this.prisma.affiliatePartner.findMany({
      where: {
        companyId: { in: companyIds },
        status: 'ACTIVE',
        deletedAt: null,
      },
      orderBy,
      take: limit,
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

    // Get period-specific stats if date range provided
    const results = await Promise.all(
      partners.map(async (partner, index) => {
        let value: number;
        switch (metric) {
          case ReportMetric.CLICKS:
            value = partner.totalClicks;
            break;
          case ReportMetric.CONVERSIONS:
            value = partner.totalConversions;
            break;
          case ReportMetric.COMMISSIONS:
            value = partner.totalEarnings;
            break;
          case ReportMetric.EPC:
            value = partner.totalClicks > 0 ? partner.totalEarnings / partner.totalClicks : 0;
            break;
          case ReportMetric.REVENUE:
          default:
            value = partner.totalRevenue;
        }

        return {
          rank: index + 1,
          partner: {
            id: partner.id,
            firstName: partner.firstName,
            lastName: partner.lastName,
            displayName: partner.displayName,
            affiliateCode: partner.affiliateCode,
            tier: partner.tier,
          },
          value,
          metric,
          clicks: partner.totalClicks,
          conversions: partner.totalConversions,
          revenue: partner.totalRevenue,
          commissions: partner.totalEarnings,
          conversionRate: partner.conversionRate,
        };
      }),
    );

    return results;
  }

  /**
   * Get top performing links
   */
  async getTopLinks(user: UserContext, query: TopPerformersQueryDto): Promise<TopLinkDto[]> {
    const companyIds = await this.getAccessibleCompanyIds(user, query.companyId);
    const { startDate, endDate } = this.normalizeDateRange(query.startDate, query.endDate);
    const limit = query.limit || 10;
    const metric = query.metric || ReportMetric.REVENUE;

    // Determine sort field based on metric
    let orderBy: Prisma.AffiliateLinkOrderByWithRelationInput;
    switch (metric) {
      case ReportMetric.CLICKS:
        orderBy = { totalClicks: 'desc' };
        break;
      case ReportMetric.CONVERSIONS:
        orderBy = { totalConversions: 'desc' };
        break;
      case ReportMetric.REVENUE:
      default:
        orderBy = { totalRevenue: 'desc' };
    }

    const links = await this.prisma.affiliateLink.findMany({
      where: {
        companyId: { in: companyIds },
        isActive: true,
        deletedAt: null,
      },
      orderBy,
      take: limit,
      include: {
        partner: {
          select: {
            id: true,
            displayName: true,
            affiliateCode: true,
          },
        },
      },
    });

    return links.map((link, index) => {
      let value: number;
      switch (metric) {
        case ReportMetric.CLICKS:
          value = link.totalClicks;
          break;
        case ReportMetric.CONVERSIONS:
          value = link.totalConversions;
          break;
        case ReportMetric.COMMISSIONS:
          value = link.totalCommissions || 0;
          break;
        case ReportMetric.EPC:
          value = link.totalClicks > 0 ? (link.totalCommissions || 0) / link.totalClicks : 0;
          break;
        case ReportMetric.REVENUE:
        default:
          value = link.totalRevenue;
      }

      return {
        rank: index + 1,
        link: {
          id: link.id,
          name: link.name,
          trackingCode: link.trackingCode,
          campaign: link.campaign,
          destinationUrl: link.destinationUrl,
        },
        partner: link.partner,
        value,
        metric,
        clicks: link.totalClicks,
        conversions: link.totalConversions,
        revenue: link.totalRevenue,
        commissions: link.totalCommissions || 0,
        conversionRate: link.conversionRate,
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Export report to file
   */
  async exportReport(user: UserContext, dto: ExportReportDto): Promise<ExportResultDto> {
    const { reportType, format } = dto;

    // Get report data based on type
    let data: any[];
    let columns: string[];

    switch (reportType) {
      case ReportType.OVERVIEW:
        const overview = await this.getOverview(user, dto);
        data = [overview.metrics];
        columns = ['clicks', 'uniqueClicks', 'conversions', 'conversionRate', 'revenue', 'commissions', 'epc', 'averageOrderValue'];
        break;

      case ReportType.PERFORMANCE:
        const performance = await this.getPerformanceByAffiliate(user, dto);
        data = performance.data.map((p) => ({
          affiliateCode: p.partner.affiliateCode,
          name: `${p.partner.firstName} ${p.partner.lastName}`,
          email: p.partner.email,
          tier: p.partner.tier,
          ...p.metrics,
        }));
        columns = ['affiliateCode', 'name', 'email', 'tier', 'clicks', 'conversions', 'conversionRate', 'revenue', 'commissions', 'epc'];
        break;

      case ReportType.SUBID:
        if (!dto.groupBy) {
          throw new BadRequestException('groupBy is required for SubID report');
        }
        const subId = await this.getPerformanceBySubId(user, { ...dto, groupBy: dto.groupBy as SubIdField });
        data = subId.data.map((d) => ({
          [dto.groupBy!]: d.value,
          ...d,
        }));
        columns = [dto.groupBy!, 'clicks', 'uniqueClicks', 'conversions', 'conversionRate', 'revenue', 'commissions', 'epc'];
        break;

      case ReportType.TRENDS:
        const trends = await this.getTrends(user, dto);
        data = trends.data;
        columns = ['date', 'label', 'clicks', 'conversions', 'revenue', 'commissions', 'conversionRate', 'epc'];
        break;

      case ReportType.TOP_AFFILIATES:
        const topAffiliates = await this.getTopAffiliates(user, dto);
        data = topAffiliates.map((t) => ({
          rank: t.rank,
          affiliateCode: t.partner.affiliateCode,
          name: `${t.partner.firstName} ${t.partner.lastName}`,
          clicks: t.clicks,
          conversions: t.conversions,
          revenue: t.revenue,
          commissions: t.commissions,
          conversionRate: t.conversionRate,
        }));
        columns = ['rank', 'affiliateCode', 'name', 'clicks', 'conversions', 'revenue', 'commissions', 'conversionRate'];
        break;

      case ReportType.TOP_LINKS:
        const topLinks = await this.getTopLinks(user, dto);
        data = topLinks.map((t) => ({
          rank: t.rank,
          linkName: t.link.name,
          trackingCode: t.link.trackingCode,
          campaign: t.link.campaign,
          partnerCode: t.partner.affiliateCode,
          clicks: t.clicks,
          conversions: t.conversions,
          revenue: t.revenue,
          commissions: t.commissions,
        }));
        columns = ['rank', 'linkName', 'trackingCode', 'campaign', 'partnerCode', 'clicks', 'conversions', 'revenue', 'commissions'];
        break;

      default:
        throw new BadRequestException(`Unknown report type: ${reportType}`);
    }

    // Use custom columns if provided
    if (dto.columns && dto.columns.length > 0) {
      columns = dto.columns;
    }

    // Generate export file
    let result: { content: Buffer | string; mimeType: string };
    const filename = dto.filename || `affiliate-report-${reportType}-${Date.now()}`;

    switch (format) {
      case ExportFormat.CSV:
        result = this.generateCsv(data, columns);
        break;
      case ExportFormat.EXCEL:
        result = this.generateExcel(data, columns);
        break;
      case ExportFormat.PDF:
        result = this.generatePdf(data, columns, reportType);
        break;
      default:
        throw new BadRequestException(`Unknown export format: ${format}`);
    }

    return {
      filename: `${filename}.${format}`,
      mimeType: result.mimeType,
      data: result.content,
      rowCount: data.length,
      generatedAt: new Date().toISOString(),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  private async getAccessibleCompanyIds(user: UserContext, companyId?: string): Promise<string[]> {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    if (companyId) {
      if (!companyIds.includes(companyId)) {
        throw new BadRequestException('Access denied to this company');
      }
      return [companyId];
    }

    return companyIds;
  }

  private normalizeDateRange(
    startDate?: string,
    endDate?: string,
  ): { startDate: Date; endDate: Date } {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Set time to start/end of day
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { startDate: start, endDate: end };
  }

  private buildDateFilter(startDate: Date, endDate: Date): Prisma.DateTimeFilter {
    return { gte: startDate, lte: endDate };
  }

  private async getPeriodMetrics(
    companyIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<PeriodMetrics> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const [clicks, uniqueClicks, conversions] = await Promise.all([
      this.prisma.affiliateClick.count({
        where: {
          companyId: { in: companyIds },
          clickedAt: dateFilter,
        },
      }),
      this.prisma.affiliateClick.count({
        where: {
          companyId: { in: companyIds },
          clickedAt: dateFilter,
          isUnique: true,
        },
      }),
      this.prisma.affiliateConversion.aggregate({
        where: {
          companyId: { in: companyIds },
          convertedAt: dateFilter,
          status: { in: ['APPROVED', 'PENDING'] },
        },
        _count: { _all: true },
        _sum: { orderTotal: true, commissionAmount: true },
      }),
    ]);

    const convCount = conversions._count._all;
    const revenue = conversions._sum?.orderTotal || 0;
    const commissions = conversions._sum?.commissionAmount || 0;

    return {
      clicks,
      uniqueClicks,
      conversions: convCount,
      conversionRate: clicks > 0 ? Math.round((convCount / clicks) * 10000) / 100 : 0,
      revenue: Math.round(revenue * 100) / 100,
      commissions: Math.round(commissions * 100) / 100,
      epc: clicks > 0 ? Math.round((commissions / clicks) * 100) / 100 : 0,
      averageOrderValue: convCount > 0 ? Math.round((revenue / convCount) * 100) / 100 : 0,
    };
  }

  private calculateChange(current: PeriodMetrics, previous: PeriodMetrics) {
    const calcPercent = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 10000) / 100;
    };

    return {
      clicks: current.clicks - previous.clicks,
      clicksPercent: calcPercent(current.clicks, previous.clicks),
      conversions: current.conversions - previous.conversions,
      conversionsPercent: calcPercent(current.conversions, previous.conversions),
      revenue: Math.round((current.revenue - previous.revenue) * 100) / 100,
      revenuePercent: calcPercent(current.revenue, previous.revenue),
      commissions: Math.round((current.commissions - previous.commissions) * 100) / 100,
      commissionsPercent: calcPercent(current.commissions, previous.commissions),
      conversionRateChange: Math.round((current.conversionRate - previous.conversionRate) * 100) / 100,
      epcChange: Math.round((current.epc - previous.epc) * 100) / 100,
    };
  }

  private async getActiveAffiliatesCount(
    companyIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.prisma.affiliatePartner.count({
      where: {
        companyId: { in: companyIds },
        status: 'ACTIVE',
        deletedAt: null,
        OR: [
          { clicks: { some: { clickedAt: { gte: startDate, lte: endDate } } } },
          { conversions: { some: { convertedAt: { gte: startDate, lte: endDate } } } },
        ],
      },
    });
  }

  private async getNewAffiliatesCount(
    companyIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.prisma.affiliatePartner.count({
      where: {
        companyId: { in: companyIds },
        deletedAt: null,
        approvedAt: { gte: startDate, lte: endDate },
      },
    });
  }

  private async getPendingPayoutsInfo(companyIds: string[]): Promise<{ count: number; amount: number }> {
    const result = await this.prisma.affiliatePayout.aggregate({
      where: {
        companyId: { in: companyIds },
        status: 'PENDING',
      },
      _count: { _all: true },
      _sum: { amount: true },
    });

    return {
      count: result._count._all,
      amount: result._sum?.amount || 0,
    };
  }

  private async getSecondLevelSubIdBreakdown(
    companyIds: string[],
    dateFilter: Prisma.DateTimeFilter,
    groupBy: SubIdField,
    groupByValue: string,
    secondGroupBy: SubIdField,
    partnerId?: string,
  ): Promise<SubIdBreakdownItem[]> {
    const clickWhere: Prisma.AffiliateClickWhereInput = {
      companyId: { in: companyIds },
      clickedAt: dateFilter,
      [groupBy]: groupByValue,
      [secondGroupBy]: { not: null },
    };

    if (partnerId) {
      clickWhere.partnerId = partnerId;
    }

    const groups = await this.prisma.affiliateClick.groupBy({
      by: [secondGroupBy],
      where: clickWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    return Promise.all(
      groups.map(async (group) => {
        const value = group[secondGroupBy];
        if (!value) return null;

        const [clicks, uniqueClicks, conversions] = await Promise.all([
          this.prisma.affiliateClick.count({
            where: { ...clickWhere, [secondGroupBy]: value },
          }),
          this.prisma.affiliateClick.count({
            where: { ...clickWhere, [secondGroupBy]: value, isUnique: true },
          }),
          this.prisma.affiliateConversion.aggregate({
            where: {
              companyId: { in: companyIds },
              convertedAt: dateFilter,
              status: { in: ['APPROVED', 'PENDING'] },
              [groupBy]: groupByValue,
              [secondGroupBy]: value,
              ...(partnerId && { partnerId }),
            },
            _count: { _all: true },
            _sum: { orderTotal: true, commissionAmount: true },
          }),
        ]);

        const convCount = conversions._count._all;
        const revenue = conversions._sum?.orderTotal || 0;
        const commissions = conversions._sum?.commissionAmount || 0;

        return {
          value,
          clicks,
          uniqueClicks,
          conversions: convCount,
          conversionRate: clicks > 0 ? (convCount / clicks) * 100 : 0,
          revenue,
          commissions,
          epc: clicks > 0 ? commissions / clicks : 0,
        };
      }),
    ).then((results) => results.filter((r): r is SubIdBreakdownItem => r !== null));
  }

  private generateDateBuckets(
    startDate: Date,
    endDate: Date,
    interval: ReportInterval,
  ): { start: Date; end: Date; label: string }[] {
    const buckets: { start: Date; end: Date; label: string }[] = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      let bucketEnd: Date;
      let label: string;

      switch (interval) {
        case ReportInterval.WEEKLY:
          bucketEnd = new Date(current);
          bucketEnd.setDate(bucketEnd.getDate() + 6);
          if (bucketEnd > endDate) bucketEnd = new Date(endDate);
          label = `Week of ${current.toISOString().split('T')[0]}`;
          break;

        case ReportInterval.MONTHLY:
          bucketEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          if (bucketEnd > endDate) bucketEnd = new Date(endDate);
          label = current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          break;

        case ReportInterval.DAILY:
        default:
          bucketEnd = new Date(current);
          bucketEnd.setHours(23, 59, 59, 999);
          label = current.toISOString().split('T')[0];
      }

      buckets.push({
        start: new Date(current),
        end: new Date(bucketEnd),
        label,
      });

      // Move to next bucket
      switch (interval) {
        case ReportInterval.WEEKLY:
          current.setDate(current.getDate() + 7);
          break;
        case ReportInterval.MONTHLY:
          current.setMonth(current.getMonth() + 1);
          current.setDate(1);
          break;
        case ReportInterval.DAILY:
        default:
          current.setDate(current.getDate() + 1);
      }
    }

    return buckets;
  }

  private async getTrendDataForPeriod(
    companyIds: string[],
    buckets: { start: Date; end: Date; label: string }[],
    partnerId?: string,
    linkId?: string,
  ): Promise<TrendDataPoint[]> {
    return Promise.all(
      buckets.map(async (bucket) => {
        const clickWhere: Prisma.AffiliateClickWhereInput = {
          companyId: { in: companyIds },
          clickedAt: { gte: bucket.start, lte: bucket.end },
        };

        const convWhere: Prisma.AffiliateConversionWhereInput = {
          companyId: { in: companyIds },
          convertedAt: { gte: bucket.start, lte: bucket.end },
          status: { in: ['APPROVED', 'PENDING'] },
        };

        if (partnerId) {
          clickWhere.partnerId = partnerId;
          convWhere.partnerId = partnerId;
        }

        if (linkId) {
          clickWhere.linkId = linkId;
          convWhere.linkId = linkId;
        }

        const [clicks, uniqueClicks, conversions] = await Promise.all([
          this.prisma.affiliateClick.count({ where: clickWhere }),
          this.prisma.affiliateClick.count({ where: { ...clickWhere, isUnique: true } }),
          this.prisma.affiliateConversion.aggregate({
            where: convWhere,
            _count: { _all: true },
            _sum: { orderTotal: true, commissionAmount: true },
          }),
        ]);

        const convCount = conversions._count._all;
        const revenue = conversions._sum?.orderTotal || 0;
        const commissions = conversions._sum?.commissionAmount || 0;

        return {
          date: bucket.start.toISOString().split('T')[0],
          label: bucket.label,
          clicks,
          uniqueClicks,
          conversions: convCount,
          revenue,
          commissions,
          conversionRate: clicks > 0 ? Math.round((convCount / clicks) * 10000) / 100 : 0,
          epc: clicks > 0 ? Math.round((commissions / clicks) * 100) / 100 : 0,
        };
      }),
    );
  }

  private aggregateTrendData(data: TrendDataPoint[]): PeriodMetrics {
    const totals = {
      clicks: 0,
      uniqueClicks: 0,
      conversions: 0,
      revenue: 0,
      commissions: 0,
    };

    for (const point of data) {
      totals.clicks += point.clicks;
      totals.uniqueClicks += point.uniqueClicks;
      totals.conversions += point.conversions;
      totals.revenue += point.revenue;
      totals.commissions += point.commissions;
    }

    return {
      ...totals,
      conversionRate: totals.clicks > 0 ? Math.round((totals.conversions / totals.clicks) * 10000) / 100 : 0,
      epc: totals.clicks > 0 ? Math.round((totals.commissions / totals.clicks) * 100) / 100 : 0,
      averageOrderValue: totals.conversions > 0 ? Math.round((totals.revenue / totals.conversions) * 100) / 100 : 0,
    };
  }

  private aggregateMetrics(metrics: PeriodMetrics[]): PeriodMetrics {
    const totals = {
      clicks: 0,
      uniqueClicks: 0,
      conversions: 0,
      revenue: 0,
      commissions: 0,
    };

    for (const m of metrics) {
      totals.clicks += m.clicks;
      totals.uniqueClicks += m.uniqueClicks;
      totals.conversions += m.conversions;
      totals.revenue += m.revenue;
      totals.commissions += m.commissions;
    }

    return {
      ...totals,
      conversionRate: totals.clicks > 0 ? Math.round((totals.conversions / totals.clicks) * 10000) / 100 : 0,
      epc: totals.clicks > 0 ? Math.round((totals.commissions / totals.clicks) * 100) / 100 : 0,
      averageOrderValue: totals.conversions > 0 ? Math.round((totals.revenue / totals.conversions) * 100) / 100 : 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPORT GENERATORS
  // ═══════════════════════════════════════════════════════════════

  private generateCsv(data: any[], columns: string[]): { content: string; mimeType: string } {
    // Escape CSV field
    const escapeField = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = columns.map(escapeField).join(',');
    const rows = data.map((row) =>
      columns.map((col) => escapeField(row[col])).join(','),
    );

    return {
      content: [header, ...rows].join('\n'),
      mimeType: 'text/csv',
    };
  }

  private generateExcel(data: any[], columns: string[]): { content: Buffer; mimeType: string } {
    // Simple XLSX-like tab-separated format for now
    // In production, use a library like xlsx or exceljs
    const header = columns.join('\t');
    const rows = data.map((row) =>
      columns.map((col) => {
        const val = row[col];
        return val === null || val === undefined ? '' : String(val);
      }).join('\t'),
    );

    const content = [header, ...rows].join('\n');

    return {
      content: Buffer.from(content, 'utf-8'),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private generatePdf(
    data: any[],
    columns: string[],
    reportType: ReportType,
  ): { content: Buffer; mimeType: string } {
    // Simple text-based PDF placeholder
    // In production, use a library like pdfmake or puppeteer
    const title = `Affiliate ${reportType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} Report`;
    const generated = `Generated: ${new Date().toISOString()}`;
    const header = columns.join(' | ');
    const separator = columns.map((c) => '-'.repeat(c.length)).join('-+-');
    const rows = data.map((row) =>
      columns.map((col) => {
        const val = row[col];
        return val === null || val === undefined ? '-' : String(val);
      }).join(' | '),
    );

    const content = [
      title,
      generated,
      '',
      header,
      separator,
      ...rows,
    ].join('\n');

    return {
      content: Buffer.from(content, 'utf-8'),
      mimeType: 'application/pdf',
    };
  }
}
