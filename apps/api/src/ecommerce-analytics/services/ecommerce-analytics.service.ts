import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartStatus, CrossSiteSessionStatus, Prisma } from '@prisma/client';
import {
  DateRange,
  TimeSeriesDataPoint,
  CartAnalyticsData,
  WishlistAnalyticsData,
  ComparisonAnalyticsData,
  CrossSiteSessionAnalyticsData,
  EcommerceOverviewData,
  TrackEventInput,
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
        FROM "Cart"
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
        FROM "Wishlist"
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
        FROM "ProductComparison"
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
        FROM "CrossSiteSession"
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
