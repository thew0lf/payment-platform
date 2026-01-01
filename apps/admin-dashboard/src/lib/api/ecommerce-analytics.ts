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
      `/api/analytics/ecommerce/overview${queryStr ? `?${queryStr}` : ''}`
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
      `/api/analytics/ecommerce/cart${queryStr ? `?${queryStr}` : ''}`
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
      `/api/analytics/ecommerce/wishlist${queryStr ? `?${queryStr}` : ''}`
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
      `/api/analytics/ecommerce/comparison${queryStr ? `?${queryStr}` : ''}`
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
      `/api/analytics/ecommerce/cross-site-sessions${queryStr ? `?${queryStr}` : ''}`
    );
  },

  /**
   * Track an analytics event
   */
  trackEvent: async (data: TrackEventInput, companyId?: string): Promise<{ success: boolean }> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<{ success: boolean }>(`/api/analytics/ecommerce/events${params}`, data);
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
