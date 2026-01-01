/**
 * Cross-Site Session Types
 *
 * Unified session management across multiple sites within a company.
 * Allows cart, wishlist, and comparison data to persist when users
 * navigate between different sites/subdomains.
 */

export const MAX_SESSION_AGE_DAYS = 30;
export const SESSION_TOKEN_LENGTH = 64;

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  MERGED = 'MERGED',
  REVOKED = 'REVOKED',
}

export enum SessionDataType {
  CART = 'CART',
  WISHLIST = 'WISHLIST',
  COMPARISON = 'COMPARISON',
}

export interface SessionDataReference {
  type: SessionDataType;
  entityId: string;
  siteId: string;
  lastUpdated: Date;
}

export interface CrossSiteSessionData {
  id: string;
  companyId: string;
  sessionToken: string;
  visitorId?: string;
  customerId?: string;
  status: SessionStatus;
  dataReferences: SessionDataReference[];
  deviceInfo?: {
    userAgent?: string;
    ipAddress?: string;
    fingerprint?: string;
  };
  firstSeenAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionMigrationResult {
  success: boolean;
  sourceSessionId: string;
  targetSessionId: string;
  migratedData: {
    cart?: { itemCount: number; cartId: string };
    wishlist?: { itemCount: number; wishlistId: string };
    comparison?: { itemCount: number; comparisonId: string };
  };
  conflicts: SessionMergeConflict[];
}

export interface SessionMergeConflict {
  type: SessionDataType;
  sourceId: string;
  targetId: string;
  resolution: 'MERGED' | 'SOURCE_KEPT' | 'TARGET_KEPT';
  details?: string;
}

export interface SessionSummary {
  sessionId: string;
  cartItemCount: number;
  wishlistItemCount: number;
  comparisonItemCount: number;
  lastActiveAt: Date;
  activeSites: string[];
}

/**
 * Input for creating a new cross-site session
 */
export interface CreateCrossSiteSessionInput {
  companyId: string;
  siteId?: string;
  visitorId?: string;
  deviceInfo?: {
    userAgent?: string;
    ipAddress?: string;
    fingerprint?: string;
  };
}

/**
 * Input for transferring session data to another site
 */
export interface TransferSessionInput {
  sessionToken: string;
  targetSiteId: string;
  dataTypes?: SessionDataType[];
}

/**
 * Input for merging two sessions
 */
export interface MergeSessionsInput {
  sourceSessionToken: string;
  targetSessionToken: string;
  conflictStrategy: 'KEEP_SOURCE' | 'KEEP_TARGET' | 'MERGE_ALL';
}

/**
 * Input for attaching a customer to a session
 */
export interface AttachCustomerInput {
  sessionToken: string;
  customerId: string;
  mergeGuestData?: boolean;
}

/**
 * Query parameters for cross-site session operations
 */
export interface CrossSiteSessionQueryParams {
  sessionToken?: string;
  customerId?: string;
  visitorId?: string;
  siteId?: string;
  status?: SessionStatus;
  includeDataReferences?: boolean;
}

/**
 * Statistics for cross-site sessions
 */
export interface CrossSiteSessionStats {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  mergedSessions: number;
  sessionsWithCart: number;
  sessionsWithWishlist: number;
  sessionsWithComparison: number;
  averageSessionDurationDays: number;
  crossSiteNavigationCount: number;
}
