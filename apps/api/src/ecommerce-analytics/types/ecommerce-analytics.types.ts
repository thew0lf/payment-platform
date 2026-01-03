/**
 * E-commerce Analytics Types
 *
 * Analytics for multi-site e-commerce features:
 * - Cart analytics (add to cart, remove, checkout, abandonment)
 * - Wishlist analytics (adds, moves to cart, conversions)
 * - Comparison analytics (products compared, conversions)
 * - Cross-site session analytics (transfers, merges, site engagement)
 */

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

/**
 * Cart Analytics
 */
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

/**
 * Wishlist Analytics
 */
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

/**
 * Comparison Analytics
 */
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
    winRate: number; // How often this product was chosen after comparison
  }>;
  categoryComparisonBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    comparisonCount: number;
  }>;
}

/**
 * Cross-Site Session Analytics
 */
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

/**
 * Combined E-commerce Dashboard
 */
export interface EcommerceOverviewData {
  companyId: string;
  dateRange: DateRange;
  cart: CartMetrics;
  wishlist: WishlistMetrics;
  comparison: ComparisonMetrics;
  crossSiteSession: CrossSiteSessionMetrics;
  trends: {
    cartConversionTrend: number; // % change vs previous period
    wishlistGrowthTrend: number;
    comparisonEngagementTrend: number;
    crossSiteEngagementTrend: number;
  };
}

/**
 * Analytics Event Types for Tracking
 */
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

export interface AnalyticsEvent {
  id: string;
  companyId: string;
  siteId?: string;
  sessionId?: string;
  customerId?: string;
  visitorId?: string;
  eventType: AnalyticsEventType;
  entityType: 'Cart' | 'Wishlist' | 'Comparison' | 'CrossSiteSession';
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface TrackEventInput {
  eventType: AnalyticsEventType;
  entityType: 'Cart' | 'Wishlist' | 'Comparison' | 'CrossSiteSession';
  entityId: string;
  siteId?: string;
  sessionId?: string;
  customerId?: string;
  visitorId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Time grouping options for time series data
 */
export type TimeGrouping = 'day' | 'week' | 'month';

/**
 * Abandonment Time Series Analytics
 * Tracks cart abandonment rate over time
 */
export interface AbandonmentTimeSeriesPoint {
  date: string;
  totalCarts: number;
  abandonedCarts: number;
  abandonmentRate: number;
  averageCartValue: number;
}

export interface AbandonmentTimeSeriesData {
  companyId: string;
  dateRange: DateRange;
  groupBy: TimeGrouping;
  data: AbandonmentTimeSeriesPoint[];
  summary: {
    totalCarts: number;
    totalAbandoned: number;
    overallAbandonmentRate: number;
    peakAbandonmentDate: string | null;
    lowestAbandonmentDate: string | null;
  };
}

/**
 * Recovery Analytics by Channel
 * Tracks recovery success rates by different channels (email, sms, etc.)
 */
export type RecoveryChannel = 'email' | 'sms' | 'push' | 'retargeting' | 'direct';

export interface RecoveryChannelMetrics {
  channel: RecoveryChannel;
  attemptedRecoveries: number;
  successfulRecoveries: number;
  recoveryRate: number;
  totalValueRecovered: number;
  averageValueRecovered: number;
}

export interface RecoveryAnalyticsData {
  companyId: string;
  dateRange: DateRange;
  groupBy: TimeGrouping;
  overallRecoveryRate: number;
  totalValueRecovered: number;
  channelBreakdown: RecoveryChannelMetrics[];
  timeSeries: Array<{
    date: string;
    totalRecovered: number;
    valueRecovered: number;
    byChannel: Partial<Record<RecoveryChannel, number>>;
  }>;
}

/**
 * Cart Value Distribution
 * Breaks down carts by value ranges
 */
export interface CartValueBucket {
  minValue: number;
  maxValue: number;
  label: string;
  cartCount: number;
  percentageOfTotal: number;
  totalValue: number;
  averageItems: number;
}

export interface CartValueDistributionData {
  companyId: string;
  dateRange: DateRange;
  currency: string;
  buckets: CartValueBucket[];
  statistics: {
    minCartValue: number;
    maxCartValue: number;
    averageCartValue: number;
    medianCartValue: number;
    totalCartValue: number;
    totalCarts: number;
  };
  valueByStatus: {
    active: number;
    abandoned: number;
    converted: number;
  };
}

/**
 * Funnel Drop-off Analytics
 * Tracks where users abandon in the funnel
 */
export interface FunnelStageDropoff {
  stageOrder: number;
  stageName: string;
  stageType: 'LANDING' | 'PRODUCT_SELECTION' | 'CHECKOUT';
  sessionsEntered: number;
  sessionsCompleted: number;
  sessionsAbandoned: number;
  dropoffRate: number;
  averageTimeOnStage: number; // in seconds
}

export interface FunnelDropoffData {
  companyId: string;
  dateRange: DateRange;
  funnelId?: string; // Optional: filter by specific funnel
  funnelName?: string;
  totalSessions: number;
  completedSessions: number;
  overallConversionRate: number;
  stages: FunnelStageDropoff[];
  criticalDropoffStage: FunnelStageDropoff | null; // Stage with highest dropoff
  timeSeries: Array<{
    date: string;
    totalSessions: number;
    completedSessions: number;
    conversionRate: number;
  }>;
}

/**
 * Admin Overview Data
 * Combined metrics for the admin dashboard overview
 */
export interface AdminEcommerceOverviewData {
  companyId: string;
  dateRange: DateRange;

  // Cart metrics
  totalCarts: number;
  activeCarts: number;
  abandonedCarts: number;
  convertedCarts: number;
  abandonmentRate: number;
  conversionRate: number;

  // Value metrics
  averageCartValue: number;
  totalCartValue: number;
  potentialRevenueLost: number;

  // Recovery metrics
  recoveredCarts: number;
  recoveryRate: number;
  totalValueRecovered: number;

  // Funnel metrics
  totalFunnelSessions: number;
  funnelCompletionRate: number;

  // Trends (compared to previous period)
  trends: {
    abandonmentRateChange: number;
    conversionRateChange: number;
    cartValueChange: number;
    recoveryRateChange: number;
  };
}
