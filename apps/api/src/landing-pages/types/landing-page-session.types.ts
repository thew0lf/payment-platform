/**
 * Landing Page Session Types
 * DTOs and interfaces for session tracking and analytics
 */

import { LandingPageSessionStatus, CartSourceType } from '@prisma/client';

// Re-export enums for convenience
export { LandingPageSessionStatus, CartSourceType };

// ═══════════════════════════════════════════════════════════════
// CORE SESSION TYPE
// ═══════════════════════════════════════════════════════════════

/**
 * Full LandingPageSession type matching Prisma model
 */
export interface LandingPageSession {
  id: string;
  sessionToken: string;
  landingPageId: string;

  // Visitor Identification
  visitorId?: string | null;
  ipAddressHash?: string | null;
  userAgent?: string | null;
  referrer?: string | null;

  // Device Detection
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;

  // UTM Parameters
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;

  // Conversion Tracking
  cartId?: string | null;
  status: LandingPageSessionStatus;
  convertedAt?: Date | null;
  orderId?: string | null;
  abandonedAt?: Date | null;

  // Timestamps
  startedAt: Date;
  lastActivityAt: Date;

  // Company Scope
  companyId: string;
}

// ═══════════════════════════════════════════════════════════════
// SESSION EVENT TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Event types for session analytics tracking
 */
export type SessionEventType =
  | 'PAGE_VIEW'
  | 'PRODUCT_VIEW'
  | 'ADD_TO_CART'
  | 'REMOVE_FROM_CART'
  | 'CHECKOUT_START'
  | 'CHECKOUT_COMPLETE'
  | 'BUTTON_CLICK'
  | 'SCROLL_DEPTH'
  | 'EXIT_INTENT';

/**
 * Event data payload for different event types
 */
export interface SessionEventData {
  // PAGE_VIEW
  sectionId?: string;
  sectionType?: string;

  // PRODUCT_VIEW
  productId?: string;
  productName?: string;
  productPrice?: number;

  // ADD_TO_CART / REMOVE_FROM_CART
  quantity?: number;
  variantId?: string;

  // BUTTON_CLICK
  buttonId?: string;
  buttonText?: string;
  targetUrl?: string;

  // SCROLL_DEPTH
  depth?: number; // 0-100 percentage
  maxDepth?: number;

  // EXIT_INTENT
  timeOnPage?: number; // milliseconds
  scrollDepthOnExit?: number;

  // Generic metadata
  [key: string]: unknown;
}

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

/**
 * DTO for creating a new session
 */
export interface CreateSessionDto {
  // Visitor Identification (all optional - server captures IP)
  visitorId?: string;
  ipAddress?: string; // Server-captured IP address for privacy hashing
  userAgent?: string;
  referrer?: string;

  // UTM Parameters
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;

  // Device Detection
  deviceType?: string;
  browser?: string;
  os?: string;
}

/**
 * DTO for updating session state
 */
export interface UpdateSessionDto {
  // Activity tracking
  lastActivityAt?: Date;

  // Conversion tracking
  convertedAt?: Date;
  abandonedAt?: Date;

  // Cart and order linkage
  cartId?: string;
  orderId?: string;

  // Status updates
  status?: LandingPageSessionStatus;
}

/**
 * DTO for tracking analytics events
 */
export interface SessionEventDto {
  eventType: SessionEventType;
  eventData?: SessionEventData;
  timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * API response type for session data
 */
export interface SessionResponse {
  id: string;
  sessionToken: string;
  landingPageId: string;
  status: LandingPageSessionStatus;

  // Visitor info
  visitorId?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;

  // UTM data
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;

  // Conversion data
  cartId?: string | null;
  orderId?: string | null;
  convertedAt?: Date | null;
  abandonedAt?: Date | null;

  // Timestamps
  startedAt: Date;
  lastActivityAt: Date;
}

/**
 * Extended session response with landing page info
 */
export interface SessionDetailResponse extends SessionResponse {
  landingPage: {
    id: string;
    name: string;
    slug: string;
  };
  cart?: {
    id: string;
    itemCount: number;
    totalAmount: number;
  } | null;
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Session analytics summary for a landing page
 */
export interface SessionAnalytics {
  landingPageId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalSessions: number;
    uniqueVisitors: number;
    convertedSessions: number;
    abandonedSessions: number;
    activeSessions: number;
    conversionRate: number; // percentage
    averageSessionDuration: number; // milliseconds
  };
  breakdown: {
    byDevice: Record<string, number>;
    byBrowser: Record<string, number>;
    bySource: Record<string, number>;
    byStatus: Record<LandingPageSessionStatus, number>;
  };
}

/**
 * Event analytics for tracking engagement
 */
export interface EventAnalytics {
  landingPageId: string;
  period: {
    start: Date;
    end: Date;
  };
  events: {
    type: SessionEventType;
    count: number;
    uniqueSessions: number;
  }[];
  topProducts?: {
    productId: string;
    productName: string;
    views: number;
    addToCart: number;
  }[];
  averageScrollDepth?: number;
}

// ═══════════════════════════════════════════════════════════════
// QUERY TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Query parameters for listing sessions
 */
export interface SessionQueryParams {
  landingPageId?: string;
  status?: LandingPageSessionStatus;
  startDate?: Date;
  endDate?: Date;
  deviceType?: string;
  utmSource?: string;
  utmCampaign?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'startedAt' | 'lastActivityAt' | 'convertedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated session list response
 */
export interface SessionListResponse {
  sessions: SessionResponse[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
