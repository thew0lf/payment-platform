import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartStatus, CrossSiteSessionStatus, FunnelSessionStatus, Prisma, StageType } from '@prisma/client';
import {
  DateRange,
  TimeSeriesDataPoint,
  CartAnalyticsData,
  WishlistAnalyticsData,
  ComparisonAnalyticsData,
  CrossSiteSessionAnalyticsData,
  EcommerceOverviewData,
  TrackEventInput,
  TimeGrouping,
  AbandonmentTimeSeriesData,
  AbandonmentTimeSeriesPoint,
  RecoveryAnalyticsData,
  RecoveryChannel,
  RecoveryChannelMetrics,
  CartValueDistributionData,
  CartValueBucket,
  FunnelDropoffData,
  FunnelStageDropoff,
  AdminEcommerceOverviewData,
} from '../types/ecommerce-analytics.types';

@Injectable()
export class EcommerceAnalyticsService {
  private readonly logger = new Logger(EcommerceAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get combined e-commerce overview dashboard data
   */
  async getOverview(companyId: string, dateRange: DateRange): Promise<EcommerceOverviewData> {
    const [cart, wishlist, comparison, crossSiteSession] = await Promise.all([
      this.getCartMetrics(companyId, dateRange),
      this.getWishlistMetrics(companyId, dateRange),
      this.getComparisonMetrics(companyId, dateRange),
      this.getCrossSiteSessionMetrics(companyId, dateRange),
    ]);

    // Calculate trends (would compare with previous period in production)
    const trends = {
      cartConversionTrend: 0,
      wishlistGrowthTrend: 0,
      comparisonEngagementTrend: 0,
      crossSiteEngagementTrend: 0,
    };

    return {
      companyId,
      dateRange,
      cart,
      wishlist,
      comparison,
      crossSiteSession,
      trends,
    };
  }

  /**
   * Get cart analytics
   */
  async getCartAnalytics(
    companyId: string,
    dateRange: DateRange,
    siteId?: string,
  ): Promise<CartAnalyticsData> {
    const whereClause = {
      companyId,
      createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      ...(siteId && { siteId }),
    };

    // Get cart counts by status
    const [totalCarts, statusCounts, cartAggregates] = await Promise.all([
      this.prisma.cart.count({ where: whereClause }),
      this.prisma.cart.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),
      this.prisma.cart.aggregate({
        where: { ...whereClause, status: CartStatus.ACTIVE },
        _avg: { grandTotal: true, itemCount: true },
      }),
    ]);

    const activeCarts = statusCounts.find((s) => s.status === CartStatus.ACTIVE)?._count || 0;
    const abandonedCarts = statusCounts.find((s) => s.status === CartStatus.ABANDONED)?._count || 0;
    const convertedCarts = statusCounts.find((s) => s.status === CartStatus.CONVERTED)?._count || 0;

    const abandonmentRate = totalCarts > 0 ? abandonedCarts / totalCarts : 0;
    const conversionRate = totalCarts > 0 ? convertedCarts / totalCarts : 0;

    // Get time series data
    const cartValueOverTime = await this.getCartValueTimeSeries(companyId, dateRange, siteId);

    // Get top abandoned products
    const topAbandonedProducts = await this.getTopAbandonedProducts(companyId, dateRange, siteId, 10);

    // Conversion funnel (simplified - would use events in production)
    const cartsWithItems = await this.prisma.cart.count({
      where: { ...whereClause, itemCount: { gt: 0 } },
    });

    return {
      companyId,
      siteId,
      dateRange,
      totalCarts,
      activeCarts,
      abandonedCarts,
      convertedCarts,
      abandonmentRate,
      conversionRate,
      averageCartValue: Number(cartAggregates._avg?.grandTotal || 0),
      averageItemsPerCart: Number(cartAggregates._avg?.itemCount || 0),
      addToCartEvents: 0, // Would come from events table
      removeFromCartEvents: 0,
      bundleAddEvents: 0,
      discountAppliedEvents: 0,
      saveForLaterEvents: 0,
      cartValueOverTime,
      conversionFunnel: {
        cartsCreated: totalCarts,
        cartsWithItems,
        checkoutStarted: convertedCarts + abandonedCarts, // Approximation
        checkoutCompleted: convertedCarts,
      },
      topAbandonedProducts,
    };
  }

  /**
   * Get wishlist analytics
   */
  async getWishlistAnalytics(
    companyId: string,
    dateRange: DateRange,
    siteId?: string,
  ): Promise<WishlistAnalyticsData> {
    const whereClause = {
      companyId,
      createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      ...(siteId && { siteId }),
    };

    const [totalWishlists, itemCounts] = await Promise.all([
      this.prisma.wishlist.count({ where: whereClause }),
      this.prisma.wishlistItem.aggregate({
        where: { wishlist: whereClause },
        _count: true,
      }),
    ]);

    // Wishlists don't have a status field - all wishlists are considered active
    const activeWishlists = totalWishlists;

    // Get top wishlisted products
    const topWishlistedProducts = await this.getTopWishlistedProducts(companyId, dateRange, siteId, 10);

    // Time series
    const wishlistActivityOverTime = await this.getWishlistActivityTimeSeries(companyId, dateRange, siteId);

    return {
      companyId,
      siteId,
      dateRange,
      totalWishlists,
      activeWishlists,
      totalItems: itemCounts._count,
      averageItemsPerWishlist: totalWishlists > 0 ? itemCounts._count / totalWishlists : 0,
      moveToCartRate: 0, // Would calculate from events
      purchaseFromWishlistRate: 0,
      addToWishlistEvents: 0,
      removeFromWishlistEvents: 0,
      moveToCartEvents: 0,
      purchaseFromWishlistEvents: 0,
      wishlistActivityOverTime,
      topWishlistedProducts,
      categoryBreakdown: [], // Would aggregate from products
    };
  }

  /**
   * Get comparison analytics
   */
  async getComparisonAnalytics(
    companyId: string,
    dateRange: DateRange,
    siteId?: string,
  ): Promise<ComparisonAnalyticsData> {
    const whereClause = {
      companyId,
      createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      ...(siteId && { siteId }),
    };

    const [totalComparisons, itemCounts] = await Promise.all([
      this.prisma.productComparison.count({ where: whereClause }),
      this.prisma.productComparisonItem.aggregate({
        where: { comparison: whereClause },
        _count: true,
      }),
    ]);

    // ProductComparison doesn't have a status field - count non-expired as active
    const activeComparisons = await this.prisma.productComparison.count({
      where: {
        ...whereClause,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    // Get most compared products
    const mostComparedProducts = await this.getMostComparedProducts(companyId, dateRange, siteId, 10);

    // Time series
    const comparisonActivityOverTime = await this.getComparisonActivityTimeSeries(companyId, dateRange, siteId);

    return {
      companyId,
      siteId,
      dateRange,
      totalComparisons,
      activeComparisons,
      averageProductsPerComparison: totalComparisons > 0 ? itemCounts._count / totalComparisons : 0,
      comparisonToCartRate: 0,
      comparisonToWishlistRate: 0,
      addToComparisonEvents: 0,
      removeFromComparisonEvents: 0,
      comparisonViewEvents: 0,
      comparisonShareEvents: 0,
      comparisonActivityOverTime,
      mostComparedProducts,
      categoryComparisonBreakdown: [],
    };
  }

  /**
   * Get cross-site session analytics
   */
  async getCrossSiteSessionAnalytics(
    companyId: string,
    dateRange: DateRange,
  ): Promise<CrossSiteSessionAnalyticsData> {
    const whereClause = {
      companyId,
      createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
    };

    const [totalSessions, statusCounts] = await Promise.all([
      this.prisma.crossSiteSession.count({ where: whereClause }),
      this.prisma.crossSiteSession.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),
    ]);

    const activeSessions = statusCounts.find((s) => s.status === CrossSiteSessionStatus.ACTIVE)?._count || 0;
    const mergedSessions = statusCounts.find((s) => s.status === CrossSiteSessionStatus.MERGED)?._count || 0;

    // Get site engagement data
    const siteEngagement = await this.getSiteEngagementData(companyId, dateRange);

    // Time series
    const sessionActivityOverTime = await this.getSessionActivityTimeSeries(companyId, dateRange);

    return {
      companyId,
      dateRange,
      totalSessions,
      activeSessions,
      averageSessionDuration: 0, // Would calculate from lastActiveAt - createdAt
      crossSiteTransferRate: 0, // Would calculate from transfer events
      sessionMergeRate: totalSessions > 0 ? mergedSessions / totalSessions : 0,
      returningVisitorRate: 0,
      sessionCreatedEvents: 0,
      sessionTransferEvents: 0,
      sessionMergeEvents: mergedSessions,
      cartSyncEvents: 0,
      wishlistSyncEvents: 0,
      sessionActivityOverTime,
      siteEngagement,
      deviceBreakdown: [],
      crossSiteJourneys: [],
    };
  }

  /**
   * Track an analytics event
   */
  async trackEvent(companyId: string, input: TrackEventInput): Promise<void> {
    this.logger.debug(`Tracking event: ${input.eventType} for ${input.entityType}:${input.entityId}`);

    // In a full implementation, this would write to an events table
    // For now, we log it
    this.logger.log({
      message: 'Analytics event tracked',
      companyId,
      ...input,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // Admin Dashboard Analytics Methods
  // ============================================================================

  /**
   * Get admin overview metrics for the e-commerce dashboard
   * Combines cart, recovery, and funnel metrics in a single response
   */
  async getAdminOverview(
    companyId: string,
    dateRange: DateRange,
  ): Promise<AdminEcommerceOverviewData> {
    // Calculate previous period for trend comparison
    const periodLength = dateRange.endDate.getTime() - dateRange.startDate.getTime();
    const previousDateRange: DateRange = {
      startDate: new Date(dateRange.startDate.getTime() - periodLength),
      endDate: new Date(dateRange.startDate.getTime() - 1),
    };

    // Get current and previous period metrics in parallel
    const [currentMetrics, previousMetrics, funnelMetrics, recoveryStats] = await Promise.all([
      this.getCartMetrics(companyId, dateRange),
      this.getCartMetrics(companyId, previousDateRange),
      this.getFunnelMetrics(companyId, dateRange),
      this.getRecoveryStats(companyId, dateRange),
    ]);

    // Calculate value metrics
    const cartValueAgg = await this.prisma.cart.aggregate({
      where: {
        companyId,
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      _sum: { grandTotal: true },
      _avg: { grandTotal: true },
    });

    const abandonedValueAgg = await this.prisma.cart.aggregate({
      where: {
        companyId,
        status: CartStatus.ABANDONED,
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      _sum: { grandTotal: true },
    });

    // Calculate trends
    const trends = {
      abandonmentRateChange: this.calculateTrendChange(
        previousMetrics.abandonmentRate,
        currentMetrics.abandonmentRate,
      ),
      conversionRateChange: this.calculateTrendChange(
        previousMetrics.conversionRate,
        currentMetrics.conversionRate,
      ),
      cartValueChange: this.calculateTrendChange(
        previousMetrics.averageCartValue,
        currentMetrics.averageCartValue,
      ),
      recoveryRateChange: 0, // Would calculate from previous period recovery stats
    };

    return {
      companyId,
      dateRange,
      totalCarts: currentMetrics.totalCarts,
      activeCarts: currentMetrics.activeCarts,
      abandonedCarts: currentMetrics.abandonedCarts,
      convertedCarts: currentMetrics.convertedCarts,
      abandonmentRate: currentMetrics.abandonmentRate,
      conversionRate: currentMetrics.conversionRate,
      averageCartValue: Number(cartValueAgg._avg?.grandTotal || 0),
      totalCartValue: Number(cartValueAgg._sum?.grandTotal || 0),
      potentialRevenueLost: Number(abandonedValueAgg._sum?.grandTotal || 0),
      recoveredCarts: recoveryStats.recoveredCount,
      recoveryRate: recoveryStats.recoveryRate,
      totalValueRecovered: recoveryStats.totalValueRecovered,
      totalFunnelSessions: funnelMetrics.totalSessions,
      funnelCompletionRate: funnelMetrics.completionRate,
      trends,
    };
  }

  /**
   * Get cart abandonment time series data
   * Shows abandonment rate over time grouped by day/week/month
   */
  async getAbandonmentTimeSeries(
    companyId: string,
    dateRange: DateRange,
    groupBy: TimeGrouping = 'day',
  ): Promise<AbandonmentTimeSeriesData> {
    const dateFormat = this.getDateGroupFormat(groupBy);

    // Use raw SQL for flexible date grouping
    const result = await this.prisma.$queryRaw<
      Array<{
        period: Date;
        total_carts: bigint;
        abandoned_carts: bigint;
        avg_value: number | null;
      }>
    >(
      Prisma.sql`
        SELECT
          DATE_TRUNC(${dateFormat}, created_at) as period,
          COUNT(*) as total_carts,
          COUNT(*) FILTER (WHERE status = 'ABANDONED') as abandoned_carts,
          AVG(CAST(grand_total AS DECIMAL)) FILTER (WHERE status = 'ABANDONED') as avg_value
        FROM "carts"
        WHERE company_id = ${companyId}
          AND created_at >= ${dateRange.startDate}
          AND created_at <= ${dateRange.endDate}
        GROUP BY DATE_TRUNC(${dateFormat}, created_at)
        ORDER BY period
      `,
    );

    const data: AbandonmentTimeSeriesPoint[] = result.map((r) => {
      const totalCarts = Number(r.total_carts);
      const abandonedCarts = Number(r.abandoned_carts);
      return {
        date: r.period.toISOString().split('T')[0],
        totalCarts,
        abandonedCarts,
        abandonmentRate: totalCarts > 0 ? abandonedCarts / totalCarts : 0,
        averageCartValue: Number(r.avg_value || 0),
      };
    });

    // Calculate summary statistics
    const totalCarts = data.reduce((sum, d) => sum + d.totalCarts, 0);
    const totalAbandoned = data.reduce((sum, d) => sum + d.abandonedCarts, 0);

    // Find peak and lowest abandonment dates
    const sortedByRate = [...data].sort((a, b) => b.abandonmentRate - a.abandonmentRate);
    const peakAbandonmentDate = sortedByRate[0]?.date || null;
    const lowestAbandonmentDate = sortedByRate[sortedByRate.length - 1]?.date || null;

    return {
      companyId,
      dateRange,
      groupBy,
      data,
      summary: {
        totalCarts,
        totalAbandoned,
        overallAbandonmentRate: totalCarts > 0 ? totalAbandoned / totalCarts : 0,
        peakAbandonmentDate,
        lowestAbandonmentDate,
      },
    };
  }

  /**
   * Get cart recovery analytics by channel
   * Tracks which recovery channels are most effective
   */
  async getRecoveryAnalytics(
    companyId: string,
    dateRange: DateRange,
    groupBy: TimeGrouping = 'day',
  ): Promise<RecoveryAnalyticsData> {
    // Get carts that were abandoned but later converted (recovered)
    const recoveredCarts = await this.prisma.cart.findMany({
      where: {
        companyId,
        status: CartStatus.CONVERTED,
        abandonedAt: { not: null },
        convertedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
      select: {
        id: true,
        grandTotal: true,
        recoveryEmailSent: true,
        convertedAt: true,
        abandonedAt: true,
      },
    });

    // Get all abandoned carts in the period (for recovery rate calculation)
    const abandonedCartsCount = await this.prisma.cart.count({
      where: {
        companyId,
        OR: [
          { status: CartStatus.ABANDONED },
          {
            status: CartStatus.CONVERTED,
            abandonedAt: { not: null },
          },
        ],
        abandonedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
    });

    // Calculate channel breakdown
    // Note: Currently we only track email recovery. SMS, push, retargeting would need additional fields
    const emailRecovered = recoveredCarts.filter((c) => c.recoveryEmailSent);
    const directRecovered = recoveredCarts.filter((c) => !c.recoveryEmailSent);

    // Get email recovery attempts count (single query, reused for rate calculation)
    const emailAttemptedRecoveries = await this.prisma.cart.count({
      where: {
        companyId,
        recoveryEmailSent: true,
        abandonedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
    });

    const emailTotalValueRecovered = emailRecovered.reduce((sum, c) => sum + Number(c.grandTotal), 0);

    const channelBreakdown: RecoveryChannelMetrics[] = [
      {
        channel: 'email' as RecoveryChannel,
        attemptedRecoveries: emailAttemptedRecoveries,
        successfulRecoveries: emailRecovered.length,
        recoveryRate: emailAttemptedRecoveries > 0
          ? emailRecovered.length / emailAttemptedRecoveries
          : 0,
        totalValueRecovered: emailTotalValueRecovered,
        averageValueRecovered: emailRecovered.length > 0
          ? emailTotalValueRecovered / emailRecovered.length
          : 0,
      },
      {
        channel: 'direct' as RecoveryChannel,
        attemptedRecoveries: directRecovered.length, // We don't track direct attempts
        successfulRecoveries: directRecovered.length,
        recoveryRate: 1, // All direct recoveries are successful by definition
        totalValueRecovered: directRecovered.reduce((sum, c) => sum + Number(c.grandTotal), 0),
        averageValueRecovered:
          directRecovered.length > 0
            ? directRecovered.reduce((sum, c) => sum + Number(c.grandTotal), 0) / directRecovered.length
            : 0,
      },
    ];

    // Generate time series
    const dateFormat = this.getDateGroupFormat(groupBy);
    const timeSeriesResult = await this.prisma.$queryRaw<
      Array<{
        period: Date;
        total_recovered: bigint;
        value_recovered: number | null;
        email_recovered: bigint;
      }>
    >(
      Prisma.sql`
        SELECT
          DATE_TRUNC(${dateFormat}, converted_at) as period,
          COUNT(*) as total_recovered,
          SUM(CAST(grand_total AS DECIMAL)) as value_recovered,
          COUNT(*) FILTER (WHERE recovery_email_sent = true) as email_recovered
        FROM "carts"
        WHERE company_id = ${companyId}
          AND status = 'CONVERTED'
          AND abandoned_at IS NOT NULL
          AND converted_at >= ${dateRange.startDate}
          AND converted_at <= ${dateRange.endDate}
        GROUP BY DATE_TRUNC(${dateFormat}, converted_at)
        ORDER BY period
      `,
    );

    const timeSeries = timeSeriesResult.map((r) => ({
      date: r.period.toISOString().split('T')[0],
      totalRecovered: Number(r.total_recovered),
      valueRecovered: Number(r.value_recovered || 0),
      byChannel: {
        email: Number(r.email_recovered),
        direct: Number(r.total_recovered) - Number(r.email_recovered),
      } as Partial<Record<RecoveryChannel, number>>,
    }));

    const totalValueRecovered = recoveredCarts.reduce((sum, c) => sum + Number(c.grandTotal), 0);

    return {
      companyId,
      dateRange,
      groupBy,
      overallRecoveryRate: abandonedCartsCount > 0 ? recoveredCarts.length / abandonedCartsCount : 0,
      totalValueRecovered,
      channelBreakdown,
      timeSeries,
    };
  }

  /**
   * Get cart value distribution
   * Breaks down carts into value buckets for analysis
   */
  async getCartValueDistribution(
    companyId: string,
    dateRange: DateRange,
  ): Promise<CartValueDistributionData> {
    // Get all cart values in the date range
    const carts = await this.prisma.cart.findMany({
      where: {
        companyId,
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        itemCount: { gt: 0 }, // Only carts with items
      },
      select: {
        grandTotal: true,
        status: true,
        itemCount: true,
      },
    });

    if (carts.length === 0) {
      return {
        companyId,
        dateRange,
        currency: 'USD',
        buckets: [],
        statistics: {
          minCartValue: 0,
          maxCartValue: 0,
          averageCartValue: 0,
          medianCartValue: 0,
          totalCartValue: 0,
          totalCarts: 0,
        },
        valueByStatus: {
          active: 0,
          abandoned: 0,
          converted: 0,
        },
      };
    }

    const values = carts.map((c) => Number(c.grandTotal));
    const sortedValues = [...values].sort((a, b) => a - b);

    // Define value buckets
    const bucketRanges = [
      { min: 0, max: 25, label: '$0 - $25' },
      { min: 25, max: 50, label: '$25 - $50' },
      { min: 50, max: 100, label: '$50 - $100' },
      { min: 100, max: 200, label: '$100 - $200' },
      { min: 200, max: 500, label: '$200 - $500' },
      { min: 500, max: Infinity, label: '$500+' },
    ];

    const buckets: CartValueBucket[] = bucketRanges.map((range) => {
      const bucketCarts = carts.filter((c) => {
        const value = Number(c.grandTotal);
        return value >= range.min && (range.max === Infinity ? true : value < range.max);
      });

      const totalValue = bucketCarts.reduce((sum, c) => sum + Number(c.grandTotal), 0);
      const totalItems = bucketCarts.reduce((sum, c) => sum + c.itemCount, 0);

      return {
        minValue: range.min,
        maxValue: range.max === Infinity ? Number.MAX_SAFE_INTEGER : range.max,
        label: range.label,
        cartCount: bucketCarts.length,
        percentageOfTotal: carts.length > 0 ? (bucketCarts.length / carts.length) * 100 : 0,
        totalValue,
        averageItems: bucketCarts.length > 0 ? totalItems / bucketCarts.length : 0,
      };
    });

    // Calculate value by status
    const valueByStatus = {
      active: carts
        .filter((c) => c.status === CartStatus.ACTIVE)
        .reduce((sum, c) => sum + Number(c.grandTotal), 0),
      abandoned: carts
        .filter((c) => c.status === CartStatus.ABANDONED)
        .reduce((sum, c) => sum + Number(c.grandTotal), 0),
      converted: carts
        .filter((c) => c.status === CartStatus.CONVERTED)
        .reduce((sum, c) => sum + Number(c.grandTotal), 0),
    };

    const totalValue = values.reduce((sum, v) => sum + v, 0);
    const medianIndex = Math.floor(sortedValues.length / 2);

    return {
      companyId,
      dateRange,
      currency: 'USD',
      buckets,
      statistics: {
        minCartValue: sortedValues[0],
        maxCartValue: sortedValues[sortedValues.length - 1],
        averageCartValue: totalValue / values.length,
        medianCartValue:
          sortedValues.length % 2 === 0
            ? (sortedValues[medianIndex - 1] + sortedValues[medianIndex]) / 2
            : sortedValues[medianIndex],
        totalCartValue: totalValue,
        totalCarts: carts.length,
      },
      valueByStatus,
    };
  }

  /**
   * Get funnel drop-off analytics
   * Shows where users abandon during the funnel journey
   */
  async getFunnelDropoff(
    companyId: string,
    dateRange: DateRange,
    funnelId?: string,
  ): Promise<FunnelDropoffData> {
    // Get funnel sessions for analysis
    // FunnelSession uses startedAt instead of createdAt
    const whereClause = {
      funnel: {
        companyId,
        ...(funnelId && { id: funnelId }),
      },
      startedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
    };

    const sessions = await this.prisma.funnelSession.findMany({
      where: whereClause,
      include: {
        funnel: {
          select: {
            id: true,
            name: true,
            stages: {
              select: {
                name: true,
                type: true,
                order: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (sessions.length === 0) {
      return {
        companyId,
        dateRange,
        funnelId,
        funnelName: undefined,
        totalSessions: 0,
        completedSessions: 0,
        overallConversionRate: 0,
        stages: [],
        criticalDropoffStage: null,
        timeSeries: [],
      };
    }

    // Get unique funnel and its stages (use first session's funnel for now)
    const funnelName = sessions[0]?.funnel?.name;
    const stages = sessions[0]?.funnel?.stages || [];

    // Calculate drop-off for each stage
    const stageDropoffs: FunnelStageDropoff[] = stages.map((stage) => {
      // Sessions that entered this stage
      const sessionsEntered = sessions.filter(
        (s) =>
          s.currentStageOrder >= stage.order ||
          (s.completedStages && (s.completedStages as number[]).includes(stage.order)),
      ).length;

      // Sessions that completed this stage
      const sessionsCompleted = sessions.filter(
        (s) => s.completedStages && (s.completedStages as number[]).includes(stage.order),
      ).length;

      // Sessions abandoned at this stage
      const sessionsAbandoned = sessions.filter(
        (s) => s.status === FunnelSessionStatus.ABANDONED && s.currentStageOrder === stage.order,
      ).length;

      return {
        stageOrder: stage.order,
        stageName: stage.name,
        stageType: stage.type as 'LANDING' | 'PRODUCT_SELECTION' | 'CHECKOUT',
        sessionsEntered,
        sessionsCompleted,
        sessionsAbandoned,
        dropoffRate: sessionsEntered > 0 ? sessionsAbandoned / sessionsEntered : 0,
        averageTimeOnStage: 0, // Would require timestamp tracking per stage
      };
    });

    // Find critical drop-off stage (highest drop-off rate)
    const criticalDropoffStage = stageDropoffs.length > 0
      ? [...stageDropoffs].sort((a, b) => b.dropoffRate - a.dropoffRate)[0]
      : null;

    // Calculate overall metrics
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(
      (s) => s.status === FunnelSessionStatus.COMPLETED,
    ).length;

    // Generate time series
    const dateFormat = this.getDateGroupFormat('day');
    const timeSeriesResult = await this.prisma.$queryRaw<
      Array<{
        period: Date;
        total_sessions: bigint;
        completed_sessions: bigint;
      }>
    >(
      Prisma.sql`
        SELECT
          DATE_TRUNC(${dateFormat}, fs.started_at) as period,
          COUNT(*) as total_sessions,
          COUNT(*) FILTER (WHERE fs.status = 'COMPLETED') as completed_sessions
        FROM "funnel_sessions" fs
        JOIN "funnels" f ON fs.funnel_id = f.id
        WHERE f.company_id = ${companyId}
          AND fs.started_at >= ${dateRange.startDate}
          AND fs.started_at <= ${dateRange.endDate}
          ${funnelId ? Prisma.sql`AND f.id = ${funnelId}` : Prisma.empty}
        GROUP BY DATE_TRUNC(${dateFormat}, fs.started_at)
        ORDER BY period
      `,
    );

    const timeSeries = timeSeriesResult.map((r) => {
      const total = Number(r.total_sessions);
      const completed = Number(r.completed_sessions);
      return {
        date: r.period.toISOString().split('T')[0],
        totalSessions: total,
        completedSessions: completed,
        conversionRate: total > 0 ? completed / total : 0,
      };
    });

    return {
      companyId,
      dateRange,
      funnelId,
      funnelName,
      totalSessions,
      completedSessions,
      overallConversionRate: totalSessions > 0 ? completedSessions / totalSessions : 0,
      stages: stageDropoffs,
      criticalDropoffStage,
      timeSeries,
    };
  }

  // ============================================================================
  // Private helper methods
  // ============================================================================

  /**
   * Calculate percentage change between two values
   */
  private calculateTrendChange(previousValue: number, currentValue: number): number {
    if (previousValue === 0) return currentValue > 0 ? 100 : 0;
    return ((currentValue - previousValue) / previousValue) * 100;
  }

  /**
   * Get SQL date format string for grouping
   */
  private getDateGroupFormat(groupBy: TimeGrouping): string {
    switch (groupBy) {
      case 'week':
        return 'week';
      case 'month':
        return 'month';
      case 'day':
      default:
        return 'day';
    }
  }

  /**
   * Get funnel metrics for admin overview
   * Note: FunnelSession uses startedAt instead of createdAt
   */
  private async getFunnelMetrics(companyId: string, dateRange: DateRange) {
    const [totalSessions, completedSessions] = await Promise.all([
      this.prisma.funnelSession.count({
        where: {
          funnel: { companyId },
          startedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
      }),
      this.prisma.funnelSession.count({
        where: {
          funnel: { companyId },
          status: FunnelSessionStatus.COMPLETED,
          startedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
      }),
    ]);

    return {
      totalSessions,
      completedSessions,
      completionRate: totalSessions > 0 ? completedSessions / totalSessions : 0,
    };
  }

  /**
   * Get recovery stats for admin overview
   */
  private async getRecoveryStats(companyId: string, dateRange: DateRange) {
    const [recoveredCount, totalValueResult] = await Promise.all([
      this.prisma.cart.count({
        where: {
          companyId,
          status: CartStatus.CONVERTED,
          abandonedAt: { not: null },
          convertedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
      }),
      this.prisma.cart.aggregate({
        where: {
          companyId,
          status: CartStatus.CONVERTED,
          abandonedAt: { not: null },
          convertedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        _sum: { grandTotal: true },
      }),
    ]);

    const abandonedCount = await this.prisma.cart.count({
      where: {
        companyId,
        OR: [
          { status: CartStatus.ABANDONED },
          {
            status: CartStatus.CONVERTED,
            abandonedAt: { not: null },
          },
        ],
        abandonedAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
    });

    return {
      recoveredCount,
      totalValueRecovered: Number(totalValueResult._sum?.grandTotal || 0),
      recoveryRate: abandonedCount > 0 ? recoveredCount / abandonedCount : 0,
    };
  }

  // Private helper methods

  private async getCartMetrics(companyId: string, dateRange: DateRange) {
    const whereClause = {
      companyId,
      createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
    };

    const [statusCounts, aggregates] = await Promise.all([
      this.prisma.cart.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true,
      }),
      this.prisma.cart.aggregate({
        where: { ...whereClause, status: CartStatus.ACTIVE },
        _avg: { grandTotal: true, itemCount: true },
      }),
    ]);

    const totalCarts = statusCounts.reduce((sum, s) => sum + s._count, 0);
    const activeCarts = statusCounts.find((s) => s.status === CartStatus.ACTIVE)?._count || 0;
    const abandonedCarts = statusCounts.find((s) => s.status === CartStatus.ABANDONED)?._count || 0;
    const convertedCarts = statusCounts.find((s) => s.status === CartStatus.CONVERTED)?._count || 0;

    return {
      totalCarts,
      activeCarts,
      abandonedCarts,
      convertedCarts,
      abandonmentRate: totalCarts > 0 ? abandonedCarts / totalCarts : 0,
      conversionRate: totalCarts > 0 ? convertedCarts / totalCarts : 0,
      averageCartValue: Number(aggregates._avg?.grandTotal || 0),
      averageItemsPerCart: Number(aggregates._avg?.itemCount || 0),
    };
  }

  private async getWishlistMetrics(companyId: string, dateRange: DateRange) {
    const whereClause = {
      companyId,
      createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
    };

    const [totalWishlists, itemCount] = await Promise.all([
      this.prisma.wishlist.count({ where: whereClause }),
      this.prisma.wishlistItem.count({ where: { wishlist: whereClause } }),
    ]);

    // Wishlists don't have a status field - all are considered active
    return {
      totalWishlists,
      activeWishlists: totalWishlists,
      totalItems: itemCount,
      averageItemsPerWishlist: totalWishlists > 0 ? itemCount / totalWishlists : 0,
      moveToCartRate: 0,
      purchaseFromWishlistRate: 0,
    };
  }

  private async getComparisonMetrics(companyId: string, dateRange: DateRange) {
    const whereClause = {
      companyId,
      createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
    };

    const [totalComparisons, activeCount, itemCount] = await Promise.all([
      this.prisma.productComparison.count({ where: whereClause }),
      // Count non-expired comparisons as active
      this.prisma.productComparison.count({
        where: {
          ...whereClause,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
      this.prisma.productComparisonItem.count({ where: { comparison: whereClause } }),
    ]);

    return {
      totalComparisons,
      activeComparisons: activeCount,
      averageProductsPerComparison: totalComparisons > 0 ? itemCount / totalComparisons : 0,
      comparisonToCartRate: 0,
      comparisonToWishlistRate: 0,
    };
  }

  private async getCrossSiteSessionMetrics(companyId: string, dateRange: DateRange) {
    const whereClause = {
      companyId,
      createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
    };

    const [totalSessions, activeCount, mergedCount] = await Promise.all([
      this.prisma.crossSiteSession.count({ where: whereClause }),
      this.prisma.crossSiteSession.count({ where: { ...whereClause, status: CrossSiteSessionStatus.ACTIVE } }),
      this.prisma.crossSiteSession.count({ where: { ...whereClause, status: CrossSiteSessionStatus.MERGED } }),
    ]);

    return {
      totalSessions,
      activeSessions: activeCount,
      averageSessionDuration: 0,
      crossSiteTransferRate: 0,
      sessionMergeRate: totalSessions > 0 ? mergedCount / totalSessions : 0,
      returningVisitorRate: 0,
    };
  }

  private async getCartValueTimeSeries(
    companyId: string,
    dateRange: DateRange,
    siteId?: string,
  ): Promise<TimeSeriesDataPoint[]> {
    // Group carts by date and calculate average value using parameterized query
    // Build the query safely using Prisma.sql for proper parameterization
    const siteClause = siteId ? Prisma.sql`AND site_id = ${siteId}` : Prisma.empty;

    const result = await this.prisma.$queryRaw<Array<{ date: Date; value: number }>>(
      Prisma.sql`
        SELECT DATE(created_at) as date, AVG(CAST(grand_total AS DECIMAL)) as value
        FROM "carts"
        WHERE company_id = ${companyId}
          AND created_at >= ${dateRange.startDate}
          AND created_at <= ${dateRange.endDate}
          ${siteClause}
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
    );

    return result.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      value: Number(r.value),
    }));
  }

  private async getTopAbandonedProducts(
    companyId: string,
    dateRange: DateRange,
    siteId?: string,
    limit: number = 10,
  ) {
    // Use database-level aggregation for scalability (avoids loading all items into memory)
    const items = await this.prisma.cartItem.groupBy({
      by: ['productId'],
      where: {
        cart: {
          companyId,
          status: CartStatus.ABANDONED,
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
          ...(siteId && { siteId }),
        },
      },
      _count: true,
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    });

    // Fetch product names in a single query
    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return items.map((i) => ({
      productId: i.productId,
      productName: productMap.get(i.productId) || 'Unknown',
      abandonmentCount: i._count,
    }));
  }

  private async getTopWishlistedProducts(
    companyId: string,
    dateRange: DateRange,
    siteId?: string,
    limit: number = 10,
  ) {
    const items = await this.prisma.wishlistItem.groupBy({
      by: ['productId'],
      where: {
        wishlist: {
          companyId,
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
          ...(siteId && { siteId }),
        },
      },
      _count: true,
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    });

    // Get product names
    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return items.map((i) => ({
      productId: i.productId,
      productName: productMap.get(i.productId) || 'Unknown',
      wishlistCount: i._count,
      conversionCount: 0, // Would track from events
    }));
  }

  private async getMostComparedProducts(
    companyId: string,
    dateRange: DateRange,
    siteId?: string,
    limit: number = 10,
  ) {
    const items = await this.prisma.productComparisonItem.groupBy({
      by: ['productId'],
      where: {
        comparison: {
          companyId,
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
          ...(siteId && { siteId }),
        },
      },
      _count: true,
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    });

    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return items.map((i) => ({
      productId: i.productId,
      productName: productMap.get(i.productId) || 'Unknown',
      comparisonCount: i._count,
      winRate: 0, // Would calculate from selection events
    }));
  }

  private async getWishlistActivityTimeSeries(
    companyId: string,
    dateRange: DateRange,
    siteId?: string,
  ): Promise<TimeSeriesDataPoint[]> {
    // Use database-level aggregation for scalability
    const siteClause = siteId ? Prisma.sql`AND site_id = ${siteId}` : Prisma.empty;

    const result = await this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>(
      Prisma.sql`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM "wishlists"
        WHERE company_id = ${companyId}
          AND created_at >= ${dateRange.startDate}
          AND created_at <= ${dateRange.endDate}
          ${siteClause}
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
    );

    return result.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      value: Number(r.count),
    }));
  }

  private async getComparisonActivityTimeSeries(
    companyId: string,
    dateRange: DateRange,
    siteId?: string,
  ): Promise<TimeSeriesDataPoint[]> {
    // Use database-level aggregation for scalability
    const siteClause = siteId ? Prisma.sql`AND site_id = ${siteId}` : Prisma.empty;

    const result = await this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>(
      Prisma.sql`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM "product_comparisons"
        WHERE company_id = ${companyId}
          AND created_at >= ${dateRange.startDate}
          AND created_at <= ${dateRange.endDate}
          ${siteClause}
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
    );

    return result.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      value: Number(r.count),
    }));
  }

  private async getSessionActivityTimeSeries(
    companyId: string,
    dateRange: DateRange,
  ): Promise<TimeSeriesDataPoint[]> {
    // Use database-level aggregation for scalability
    const result = await this.prisma.$queryRaw<Array<{ date: Date; count: bigint }>>(
      Prisma.sql`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM "cross_site_sessions"
        WHERE company_id = ${companyId}
          AND created_at >= ${dateRange.startDate}
          AND created_at <= ${dateRange.endDate}
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
    );

    return result.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      value: Number(r.count),
    }));
  }

  private async getSiteEngagementData(companyId: string, dateRange: DateRange) {
    // CrossSiteSession doesn't have a currentSiteId field
    // Site engagement data would come from analyzing dataReferences JSON field
    // For now, return an empty array as the schema doesn't support direct site tracking
    // In production, you would parse dataReferences to extract site information

    // Get all sessions in the date range
    const sessionCount = await this.prisma.crossSiteSession.count({
      where: {
        companyId,
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
    });

    // Since we can't group by site from the current schema, return an aggregate summary
    // Future enhancement: parse dataReferences JSON to extract site-specific data
    if (sessionCount === 0) {
      return [];
    }

    // Return a placeholder indicating cross-site sessions exist but site breakdown isn't available
    return [{
      siteId: 'all',
      siteName: 'All Sites',
      sessionsStarted: sessionCount,
      sessionsTransferredIn: 0,
      sessionsTransferredOut: 0,
      averageTimeOnSite: 0,
    }];
  }
}
