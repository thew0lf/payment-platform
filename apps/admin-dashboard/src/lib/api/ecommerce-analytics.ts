import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// ANALYTICS TYPES
// ═══════════════════════════════════════════════════════════════

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

// ─────────────────────────────────────────────────────────────────
// Cart Analytics Types
// ─────────────────────────────────────────────────────────────────

export interface CartMetrics {
  totalCarts: number;
  activeCarts: number;
  abandonedCarts: number;
  convertedCarts: number;
  abandonmentRate: number;
  conversionRate: number;
  averageCartValue: number;
  averageItemsPerCart: number;
}

export interface CartEventMetrics {
  addToCartEvents: number;
  removeFromCartEvents: number;
  bundleAddEvents: number;
  discountAppliedEvents: number;
  saveForLaterEvents: number;
}

export interface CartAnalyticsData extends CartMetrics, CartEventMetrics {
  companyId: string;
  siteId?: string;
  dateRange: DateRange;
  cartValueOverTime: TimeSeriesDataPoint[];
  conversionFunnel: {
    cartsCreated: number;
    cartsWithItems: number;
    checkoutStarted: number;
    checkoutCompleted: number;
  };
  topAbandonedProducts: Array<{
    productId: string;
    productName: string;
    abandonmentCount: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────
// Wishlist Analytics Types
// ─────────────────────────────────────────────────────────────────

export interface WishlistMetrics {
  totalWishlists: number;
  activeWishlists: number;
  totalItems: number;
  averageItemsPerWishlist: number;
  moveToCartRate: number;
  purchaseFromWishlistRate: number;
}

export interface WishlistEventMetrics {
  addToWishlistEvents: number;
  removeFromWishlistEvents: number;
  moveToCartEvents: number;
  purchaseFromWishlistEvents: number;
}

export interface WishlistAnalyticsData extends WishlistMetrics, WishlistEventMetrics {
  companyId: string;
  siteId?: string;
  dateRange: DateRange;
  wishlistActivityOverTime: TimeSeriesDataPoint[];
  topWishlistedProducts: Array<{
    productId: string;
    productName: string;
    wishlistCount: number;
    conversionCount: number;
  }>;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    itemCount: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────
// Comparison Analytics Types
// ─────────────────────────────────────────────────────────────────

export interface ComparisonMetrics {
  totalComparisons: number;
  activeComparisons: number;
  averageProductsPerComparison: number;
  comparisonToCartRate: number;
  comparisonToWishlistRate: number;
}

export interface ComparisonEventMetrics {
  addToComparisonEvents: number;
  removeFromComparisonEvents: number;
  comparisonViewEvents: number;
  comparisonShareEvents: number;
}

export interface ComparisonAnalyticsData extends ComparisonMetrics, ComparisonEventMetrics {
  companyId: string;
  siteId?: string;
  dateRange: DateRange;
  comparisonActivityOverTime: TimeSeriesDataPoint[];
  mostComparedProducts: Array<{
    productId: string;
    productName: string;
    comparisonCount: number;
    winRate: number;
  }>;
  categoryComparisonBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    comparisonCount: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────
// Cross-Site Session Analytics Types
// ─────────────────────────────────────────────────────────────────

export interface CrossSiteSessionMetrics {
  totalSessions: number;
  activeSessions: number;
  averageSessionDuration: number;
  crossSiteTransferRate: number;
  sessionMergeRate: number;
  returningVisitorRate: number;
}

export interface CrossSiteEventMetrics {
  sessionCreatedEvents: number;
  sessionTransferEvents: number;
  sessionMergeEvents: number;
  cartSyncEvents: number;
  wishlistSyncEvents: number;
}

export interface CrossSiteSessionAnalyticsData extends CrossSiteSessionMetrics, CrossSiteEventMetrics {
  companyId: string;
  dateRange: DateRange;
  sessionActivityOverTime: TimeSeriesDataPoint[];
  siteEngagement: Array<{
    siteId: string;
    siteName: string;
    sessionsStarted: number;
    sessionsTransferredIn: number;
    sessionsTransferredOut: number;
    averageTimeOnSite: number;
  }>;
  deviceBreakdown: Array<{
    deviceType: string;
    sessionCount: number;
    averageDuration: number;
  }>;
  crossSiteJourneys: Array<{
    fromSiteId: string;
    toSiteId: string;
    transferCount: number;
    conversionRate: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────
// E-commerce Overview Types
// ─────────────────────────────────────────────────────────────────

export interface EcommerceOverviewData {
  companyId: string;
  dateRange: DateRange;
  cart: CartMetrics;
  wishlist: WishlistMetrics;
  comparison: ComparisonMetrics;
  crossSiteSession: CrossSiteSessionMetrics;
  trends: {
    cartConversionTrend: number;
    wishlistGrowthTrend: number;
    comparisonEngagementTrend: number;
    crossSiteEngagementTrend: number;
  };
}

// ─────────────────────────────────────────────────────────────────
// Analytics Event Types
// ─────────────────────────────────────────────────────────────────

export enum AnalyticsEventType {
  // Cart events
  CART_CREATED = 'CART_CREATED',
  CART_ITEM_ADDED = 'CART_ITEM_ADDED',
  CART_ITEM_REMOVED = 'CART_ITEM_REMOVED',
  CART_ITEM_UPDATED = 'CART_ITEM_UPDATED',
  CART_BUNDLE_ADDED = 'CART_BUNDLE_ADDED',
  CART_BUNDLE_REMOVED = 'CART_BUNDLE_REMOVED',
  CART_DISCOUNT_APPLIED = 'CART_DISCOUNT_APPLIED',
  CART_CHECKOUT_STARTED = 'CART_CHECKOUT_STARTED',
  CART_CHECKOUT_COMPLETED = 'CART_CHECKOUT_COMPLETED',
  CART_ABANDONED = 'CART_ABANDONED',
  CART_RECOVERED = 'CART_RECOVERED',

  // Wishlist events
  WISHLIST_CREATED = 'WISHLIST_CREATED',
  WISHLIST_ITEM_ADDED = 'WISHLIST_ITEM_ADDED',
  WISHLIST_ITEM_REMOVED = 'WISHLIST_ITEM_REMOVED',
  WISHLIST_ITEM_MOVED_TO_CART = 'WISHLIST_ITEM_MOVED_TO_CART',
  WISHLIST_SHARED = 'WISHLIST_SHARED',

  // Comparison events
  COMPARISON_CREATED = 'COMPARISON_CREATED',
  COMPARISON_ITEM_ADDED = 'COMPARISON_ITEM_ADDED',
  COMPARISON_ITEM_REMOVED = 'COMPARISON_ITEM_REMOVED',
  COMPARISON_VIEWED = 'COMPARISON_VIEWED',
  COMPARISON_PRODUCT_SELECTED = 'COMPARISON_PRODUCT_SELECTED',
  COMPARISON_SHARED = 'COMPARISON_SHARED',

  // Cross-site session events
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_TRANSFERRED = 'SESSION_TRANSFERRED',
  SESSION_MERGED = 'SESSION_MERGED',
  SESSION_DATA_SYNCED = 'SESSION_DATA_SYNCED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
}

export type EntityType = 'Cart' | 'Wishlist' | 'Comparison' | 'CrossSiteSession';

export interface TrackEventInput {
  eventType: AnalyticsEventType;
  entityType: EntityType;
  entityId: string;
  siteId?: string;
  sessionId?: string;
  customerId?: string;
  visitorId?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsEvent {
  id: string;
  companyId: string;
  siteId?: string;
  sessionId?: string;
  customerId?: string;
  visitorId?: string;
  eventType: AnalyticsEventType;
  entityType: EntityType;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────
// Query Parameters
// ─────────────────────────────────────────────────────────────────

export interface AnalyticsQueryParams {
  companyId?: string;
  siteId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Analytics parameters with required date range
 * Used for the main analytics functions
 */
export interface AnalyticsParams {
  companyId?: string;
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface CartAnalyticsParams extends AnalyticsParams {
  siteId?: string;
}

// ─────────────────────────────────────────────────────────────────
// Derived Analytics Types
// ─────────────────────────────────────────────────────────────────

/**
 * Abandonment time series data point
 */
export interface AbandonmentDataPoint {
  date: string;
  abandonedCarts: number;
  abandonedValue: number;
  abandonmentRate: number;
}

/**
 * Abandonment analytics response
 */
export interface AbandonmentAnalyticsData {
  timeSeries: AbandonmentDataPoint[];
  summary: {
    totalAbandoned: number;
    totalAbandonedValue: number;
    averageAbandonmentRate: number;
    averageAbandonedCartValue: number;
  };
  topAbandonedProducts: Array<{
    productId: string;
    productName: string;
    abandonmentCount: number;
  }>;
}

/**
 * Recovery channel types
 */
export type RecoveryChannel = 'email' | 'sms' | 'push' | 'retargeting' | 'manual';

/**
 * Recovery metrics by channel
 */
export interface RecoveryByChannelData {
  channel: RecoveryChannel;
  cartsRecovered: number;
  recoveryRate: number;
  revenueRecovered: number;
  emailsSent?: number;
  clickRate?: number;
}

/**
 * Recovery analytics response
 */
export interface RecoveryAnalyticsData {
  channels: RecoveryByChannelData[];
  summary: {
    totalRecovered: number;
    overallRecoveryRate: number;
    totalRevenueRecovered: number;
    averageTimeToRecovery: number;
  };
  timeSeries: Array<{
    date: string;
    recovered: number;
    revenueRecovered: number;
  }>;
}

/**
 * Cart value distribution bucket
 */
export interface CartValueBucket {
  range: string;
  minValue: number;
  maxValue: number;
  count: number;
  totalValue: number;
  percentage: number;
}

/**
 * Cart value distribution response
 */
export interface CartValueDistributionData {
  distribution: CartValueBucket[];
  summary: {
    averageValue: number;
    medianValue: number;
    minValue: number;
    maxValue: number;
    totalCarts: number;
    totalValue: number;
  };
}

/**
 * Funnel stage drop-off data
 */
export interface FunnelStageDropOff {
  stageName: string;
  stageOrder: number;
  entered: number;
  exited: number;
  dropOffCount: number;
  dropOffRate: number;
}

/**
 * Funnel drop-off analytics response
 */
export interface FunnelDropOffData {
  stages: FunnelStageDropOff[];
  summary: {
    totalEntered: number;
    totalCompleted: number;
    overallConversionRate: number;
    biggestDropOffStage: string;
    biggestDropOffRate: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// E-COMMERCE ANALYTICS API CLIENT
// ═══════════════════════════════════════════════════════════════

export const ecommerceAnalyticsApi = {
  /**
   * Get e-commerce overview dashboard data
   */
  getOverview: async (params: AnalyticsQueryParams = {}): Promise<EcommerceOverviewData> => {
    const query = new URLSearchParams();
    if (params.companyId) query.set('companyId', params.companyId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const queryStr = query.toString();
    return apiRequest.get<EcommerceOverviewData>(
      `/api/admin/ecommerce-analytics/ecommerce-overview${queryStr ? `?${queryStr}` : ''}`
    );
  },

  /**
   * Get cart analytics data
   */
  getCartAnalytics: async (params: AnalyticsQueryParams = {}): Promise<CartAnalyticsData> => {
    const query = new URLSearchParams();
    if (params.companyId) query.set('companyId', params.companyId);
    if (params.siteId) query.set('siteId', params.siteId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const queryStr = query.toString();
    return apiRequest.get<CartAnalyticsData>(
      `/api/admin/ecommerce-analytics/cart${queryStr ? `?${queryStr}` : ''}`
    );
  },

  /**
   * Get wishlist analytics data
   */
  getWishlistAnalytics: async (params: AnalyticsQueryParams = {}): Promise<WishlistAnalyticsData> => {
    const query = new URLSearchParams();
    if (params.companyId) query.set('companyId', params.companyId);
    if (params.siteId) query.set('siteId', params.siteId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const queryStr = query.toString();
    return apiRequest.get<WishlistAnalyticsData>(
      `/api/admin/ecommerce-analytics/wishlist${queryStr ? `?${queryStr}` : ''}`
    );
  },

  /**
   * Get comparison analytics data
   */
  getComparisonAnalytics: async (params: AnalyticsQueryParams = {}): Promise<ComparisonAnalyticsData> => {
    const query = new URLSearchParams();
    if (params.companyId) query.set('companyId', params.companyId);
    if (params.siteId) query.set('siteId', params.siteId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const queryStr = query.toString();
    return apiRequest.get<ComparisonAnalyticsData>(
      `/api/admin/ecommerce-analytics/comparison${queryStr ? `?${queryStr}` : ''}`
    );
  },

  /**
   * Get cross-site session analytics data
   */
  getCrossSiteSessionAnalytics: async (
    params: Omit<AnalyticsQueryParams, 'siteId'> = {}
  ): Promise<CrossSiteSessionAnalyticsData> => {
    const query = new URLSearchParams();
    if (params.companyId) query.set('companyId', params.companyId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const queryStr = query.toString();
    return apiRequest.get<CrossSiteSessionAnalyticsData>(
      `/api/admin/ecommerce-analytics/cross-site-sessions${queryStr ? `?${queryStr}` : ''}`
    );
  },

  /**
   * Track an analytics event
   */
  trackEvent: async (data: TrackEventInput, companyId?: string): Promise<{ success: boolean }> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<{ success: boolean }>(`/api/admin/ecommerce-analytics/events${params}`, data);
  },

  // ═══════════════════════════════════════════════════════════════
  // DERIVED ANALYTICS FUNCTIONS
  // These functions derive specialized analytics from the base endpoints
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get abandonment time series analytics
   * Derives abandonment-specific data from cart analytics
   * @param params - Analytics parameters with required date range
   */
  getAbandonment: async (params: AnalyticsParams): Promise<AbandonmentAnalyticsData> => {
    const cartData = await ecommerceAnalyticsApi.getCartAnalytics({
      companyId: params.companyId,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    // Calculate average values per time point
    const timePoints = cartData.cartValueOverTime.length || 1;
    const avgAbandonedPerPoint = cartData.abandonedCarts / timePoints;
    const avgValuePerPoint = cartData.averageCartValue;

    // Transform cart value time series to abandonment data points
    const timeSeries: AbandonmentDataPoint[] = cartData.cartValueOverTime.map((point) => ({
      date: point.date,
      abandonedCarts: Math.round(avgAbandonedPerPoint),
      abandonedValue: Math.round(avgAbandonedPerPoint * avgValuePerPoint * 100) / 100,
      abandonmentRate: cartData.abandonmentRate,
    }));

    return {
      timeSeries,
      summary: {
        totalAbandoned: cartData.abandonedCarts,
        totalAbandonedValue: Math.round(cartData.abandonedCarts * cartData.averageCartValue * 100) / 100,
        averageAbandonmentRate: cartData.abandonmentRate,
        averageAbandonedCartValue: cartData.averageCartValue,
      },
      topAbandonedProducts: cartData.topAbandonedProducts,
    };
  },

  /**
   * Get recovery analytics by channel
   * Note: Currently returns placeholder structure as recovery tracking requires
   * a dedicated recovery events system. In production, this would query a
   * cart recovery tracking table.
   * @param params - Analytics parameters with required date range
   */
  getRecovery: async (params: AnalyticsParams): Promise<RecoveryAnalyticsData> => {
    // Fetch cart data to get baseline metrics for context
    const cartData = await ecommerceAnalyticsApi.getCartAnalytics({
      companyId: params.companyId,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    // Generate date range for time series
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    const timeSeries: Array<{ date: string; recovered: number; revenueRecovered: number }> = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      timeSeries.push({
        date: d.toISOString().split('T')[0],
        recovered: 0,
        revenueRecovered: 0,
      });
    }

    // Return placeholder data structure
    // In production, this would come from a recovery tracking table
    const channels: RecoveryByChannelData[] = [
      { channel: 'email', cartsRecovered: 0, recoveryRate: 0, revenueRecovered: 0, emailsSent: 0, clickRate: 0 },
      { channel: 'sms', cartsRecovered: 0, recoveryRate: 0, revenueRecovered: 0 },
      { channel: 'push', cartsRecovered: 0, recoveryRate: 0, revenueRecovered: 0 },
      { channel: 'retargeting', cartsRecovered: 0, recoveryRate: 0, revenueRecovered: 0 },
      { channel: 'manual', cartsRecovered: 0, recoveryRate: 0, revenueRecovered: 0 },
    ];

    return {
      channels,
      summary: {
        totalRecovered: 0,
        overallRecoveryRate: 0,
        totalRevenueRecovered: 0,
        averageTimeToRecovery: 0,
      },
      timeSeries,
    };
  },

  /**
   * Get cart value distribution (bucket analysis)
   * Derives value distribution from cart analytics
   * @param params - Analytics parameters with required date range
   */
  getCartValues: async (params: AnalyticsParams): Promise<CartValueDistributionData> => {
    const cartData = await ecommerceAnalyticsApi.getCartAnalytics({
      companyId: params.companyId,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    const avgValue = cartData.averageCartValue;
    const totalCarts = cartData.totalCarts;
    const totalValue = avgValue * totalCarts;

    // Generate distribution buckets
    // Note: Actual distribution would require raw cart data from backend
    // This provides the structure; a dedicated endpoint would be needed for accurate buckets
    const buckets: CartValueBucket[] = [
      { range: '$0-$25', minValue: 0, maxValue: 25, count: 0, totalValue: 0, percentage: 0 },
      { range: '$25-$50', minValue: 25, maxValue: 50, count: 0, totalValue: 0, percentage: 0 },
      { range: '$50-$100', minValue: 50, maxValue: 100, count: 0, totalValue: 0, percentage: 0 },
      { range: '$100-$200', minValue: 100, maxValue: 200, count: 0, totalValue: 0, percentage: 0 },
      { range: '$200-$500', minValue: 200, maxValue: 500, count: 0, totalValue: 0, percentage: 0 },
      { range: '$500+', minValue: 500, maxValue: Infinity, count: 0, totalValue: 0, percentage: 0 },
    ];

    // Estimate distribution based on average (simplified model)
    // In production, this would use actual distribution data from the backend
    if (totalCarts > 0 && avgValue > 0) {
      const bucketIndex = buckets.findIndex((b) => avgValue >= b.minValue && avgValue < b.maxValue);
      if (bucketIndex !== -1) {
        // Distribute carts around the average with a bell curve approximation
        const distribution = [0.05, 0.15, 0.30, 0.30, 0.15, 0.05];
        const centerIndex = bucketIndex;

        for (let i = 0; i < buckets.length; i++) {
          const offset = Math.abs(i - centerIndex);
          const weight = distribution[Math.min(offset, distribution.length - 1)] || 0.02;
          buckets[i].count = Math.round(totalCarts * weight);
          buckets[i].totalValue = buckets[i].count * ((buckets[i].minValue + Math.min(buckets[i].maxValue, avgValue * 2)) / 2);
          buckets[i].percentage = weight * 100;
        }
      }
    }

    return {
      distribution: buckets,
      summary: {
        averageValue: avgValue,
        medianValue: avgValue, // Would need actual distribution for true median
        minValue: buckets[0].count > 0 ? buckets[0].minValue : 0,
        maxValue: Math.max(avgValue * 3, 100),
        totalCarts,
        totalValue,
      },
    };
  },

  /**
   * Get funnel drop-off analytics by stage
   * Derives stage-by-stage drop-off from cart conversion funnel data
   * @param params - Analytics parameters with required date range
   */
  getFunnelDropOff: async (params: AnalyticsParams): Promise<FunnelDropOffData> => {
    const cartData = await ecommerceAnalyticsApi.getCartAnalytics({
      companyId: params.companyId,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    const funnel = cartData.conversionFunnel;

    // Build stage-by-stage drop-off data
    const stages: FunnelStageDropOff[] = [
      {
        stageName: 'Cart Created',
        stageOrder: 1,
        entered: funnel.cartsCreated,
        exited: funnel.cartsWithItems,
        dropOffCount: funnel.cartsCreated - funnel.cartsWithItems,
        dropOffRate: funnel.cartsCreated > 0
          ? Math.round(((funnel.cartsCreated - funnel.cartsWithItems) / funnel.cartsCreated) * 10000) / 100
          : 0,
      },
      {
        stageName: 'Items Added',
        stageOrder: 2,
        entered: funnel.cartsWithItems,
        exited: funnel.checkoutStarted,
        dropOffCount: funnel.cartsWithItems - funnel.checkoutStarted,
        dropOffRate: funnel.cartsWithItems > 0
          ? Math.round(((funnel.cartsWithItems - funnel.checkoutStarted) / funnel.cartsWithItems) * 10000) / 100
          : 0,
      },
      {
        stageName: 'Checkout Started',
        stageOrder: 3,
        entered: funnel.checkoutStarted,
        exited: funnel.checkoutCompleted,
        dropOffCount: funnel.checkoutStarted - funnel.checkoutCompleted,
        dropOffRate: funnel.checkoutStarted > 0
          ? Math.round(((funnel.checkoutStarted - funnel.checkoutCompleted) / funnel.checkoutStarted) * 10000) / 100
          : 0,
      },
      {
        stageName: 'Checkout Completed',
        stageOrder: 4,
        entered: funnel.checkoutCompleted,
        exited: funnel.checkoutCompleted,
        dropOffCount: 0,
        dropOffRate: 0,
      },
    ];

    // Find the stage with the biggest drop-off
    const biggestDropOff = stages.reduce(
      (max, stage) => (stage.dropOffRate > max.dropOffRate ? stage : max),
      stages[0]
    );

    const overallConversionRate = funnel.cartsCreated > 0
      ? Math.round((funnel.checkoutCompleted / funnel.cartsCreated) * 10000) / 100
      : 0;

    return {
      stages,
      summary: {
        totalEntered: funnel.cartsCreated,
        totalCompleted: funnel.checkoutCompleted,
        overallConversionRate,
        biggestDropOffStage: biggestDropOff.stageName,
        biggestDropOffRate: biggestDropOff.dropOffRate,
      },
    };
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate percentage change between two values
 */
export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

/**
 * Format a date range for API queries
 */
export function formatDateRange(startDate: Date, endDate: Date): { startDate: string; endDate: string } {
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/**
 * Get default date range (last 30 days)
 */
export function getDefaultDateRange(): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  return formatDateRange(startDate, endDate);
}

/**
 * Get date range for a specific period
 */
export type DateRangePeriod = '7d' | '30d' | '90d' | '1y' | 'custom';

export function getDateRangeForPeriod(period: DateRangePeriod): { startDate: string; endDate: string } {
  const endDate = new Date();
  let startDate: Date;

  switch (period) {
    case '7d':
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return formatDateRange(startDate, endDate);
}

/**
 * Format a rate/percentage for display
 */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Get trend indicator (up, down, neutral)
 */
export function getTrendIndicator(trend: number): 'up' | 'down' | 'neutral' {
  if (trend > 0.01) return 'up';
  if (trend < -0.01) return 'down';
  return 'neutral';
}

/**
 * Get trend color class for UI styling
 * @param trend - The trend value
 * @param positiveIsGood - Whether positive trend is good (default true)
 */
export function getTrendColorClass(trend: number, positiveIsGood = true): string {
  const indicator = getTrendIndicator(trend);
  if (indicator === 'neutral') return 'text-gray-500';

  if (positiveIsGood) {
    return indicator === 'up' ? 'text-green-600' : 'text-red-600';
  } else {
    return indicator === 'up' ? 'text-red-600' : 'text-green-600';
  }
}

/**
 * Format a number with compact notation (e.g., 1.2K, 3.5M)
 */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Calculate days between two dates
 */
export function getDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
