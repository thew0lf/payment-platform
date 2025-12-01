/**
 * Cursor-based pagination types for scalable list queries
 *
 * Benefits over offset pagination:
 * - O(1) performance regardless of page number
 * - No "skipped rows" problem when data changes
 * - Consistent results even with concurrent writes
 */

export interface CursorPaginationParams {
  /** Number of items to return (default: 50, max: 100) */
  limit?: number;
  /** Cursor for the next page (from previous response) */
  cursor?: string;
  /** Direction to paginate (default: 'forward') */
  direction?: 'forward' | 'backward';
}

export interface CursorPaginationMeta {
  /** Cursor for fetching the next page */
  nextCursor: string | null;
  /** Cursor for fetching the previous page */
  prevCursor: string | null;
  /** Whether there are more items after this page */
  hasMore: boolean;
  /** Number of items in current page */
  count: number;
  /**
   * Estimated total count (may be approximate for large datasets)
   * Use hasMore for reliable pagination instead of total
   */
  estimatedTotal?: number;
}

export interface CursorPaginatedResponse<T> {
  items: T[];
  pagination: CursorPaginationMeta;
}

/**
 * Legacy offset pagination params for backwards compatibility
 * Services should support both cursor and offset during migration
 */
export interface OffsetPaginationParams {
  limit?: number;
  offset?: number;
}

export interface OffsetPaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Combined pagination params - services accept either style
 */
export type PaginationParams = CursorPaginationParams & OffsetPaginationParams;

/**
 * Decoded cursor structure
 */
export interface DecodedCursor {
  /** Primary sort field value (e.g., createdAt timestamp) */
  sortValue: string | number;
  /** Record ID for tiebreaker */
  id: string;
  /** Direction hint */
  direction: 'forward' | 'backward';
}

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 50;
