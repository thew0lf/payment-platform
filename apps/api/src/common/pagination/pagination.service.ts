import { Injectable } from '@nestjs/common';
import {
  CursorPaginationParams,
  CursorPaginationMeta,
  CursorPaginatedResponse,
  DecodedCursor,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
} from './pagination.types';

/**
 * Pagination service for cursor-based pagination
 *
 * Cursor format: base64(JSON({ sortValue, id, direction }))
 *
 * Usage:
 * ```typescript
 * const { limit, cursorWhere, orderBy } = this.pagination.parseCursor(params, 'createdAt');
 * const items = await prisma.model.findMany({
 *   where: { ...filters, ...cursorWhere },
 *   orderBy,
 *   take: limit + 1, // Fetch one extra to check hasMore
 * });
 * return this.pagination.createResponse(items, limit, params, 'createdAt');
 * ```
 */
@Injectable()
export class PaginationService {
  /**
   * Encode a cursor from sort value and ID
   */
  encodeCursor(
    sortValue: string | number | Date,
    id: string,
    direction: 'forward' | 'backward' = 'forward',
  ): string {
    const value = sortValue instanceof Date ? sortValue.toISOString() : sortValue;
    const cursor: DecodedCursor = { sortValue: value, id, direction };
    return Buffer.from(JSON.stringify(cursor)).toString('base64url');
  }

  /**
   * Decode a cursor string
   */
  decodeCursor(cursor: string): DecodedCursor | null {
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
      return JSON.parse(decoded) as DecodedCursor;
    } catch {
      return null;
    }
  }

  /**
   * Get normalized limit value
   */
  getLimit(params: CursorPaginationParams): number {
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    return Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  }

  /**
   * Parse cursor params into Prisma-compatible where clause and orderBy
   *
   * @param params Pagination params from request
   * @param sortField The field to sort by (must be indexed)
   * @param sortOrder Default sort order ('desc' for newest first)
   * @returns Object with limit, cursorWhere clause, and orderBy
   */
  parseCursor(
    params: CursorPaginationParams,
    sortField: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): {
    limit: number;
    cursorWhere: Record<string, unknown>;
    orderBy: Record<string, 'asc' | 'desc'>[];
  } {
    const limit = this.getLimit(params);
    const direction = params.direction ?? 'forward';
    const decoded = params.cursor ? this.decodeCursor(params.cursor) : null;

    // Determine effective sort direction based on pagination direction
    const effectiveOrder = direction === 'forward' ? sortOrder : (sortOrder === 'desc' ? 'asc' : 'desc');

    // Build orderBy with tiebreaker on id
    const orderBy = [
      { [sortField]: effectiveOrder },
      { id: effectiveOrder },
    ];

    // Build cursor where clause for seeking
    let cursorWhere: Record<string, unknown> = {};

    if (decoded) {
      // For descending order (newest first), "next page" means older items (less than cursor)
      // For ascending order (oldest first), "next page" means newer items (greater than cursor)
      const operator = effectiveOrder === 'desc' ? 'lt' : 'gt';

      // Use compound cursor condition: (sortValue < cursorValue) OR (sortValue = cursorValue AND id < cursorId)
      cursorWhere = {
        OR: [
          { [sortField]: { [operator]: this.parseSortValue(decoded.sortValue, sortField) } },
          {
            AND: [
              { [sortField]: this.parseSortValue(decoded.sortValue, sortField) },
              { id: { [operator]: decoded.id } },
            ],
          },
        ],
      };
    }

    return { limit, cursorWhere, orderBy };
  }

  /**
   * Parse sort value back to appropriate type
   */
  private parseSortValue(value: string | number, sortField: string): Date | string | number {
    // If it looks like an ISO date string, parse it
    if (
      typeof value === 'string' &&
      (sortField.toLowerCase().includes('at') || sortField.toLowerCase().includes('date'))
    ) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return value;
  }

  /**
   * Create paginated response from query results
   *
   * @param items Items fetched (should have limit + 1 items if there's more)
   * @param limit The limit that was requested
   * @param params Original pagination params
   * @param sortField The field used for sorting
   * @param estimatedTotal Optional estimated total count
   */
  createResponse<T extends { id: string }>(
    items: T[],
    limit: number,
    params: CursorPaginationParams,
    sortField: string = 'createdAt',
    estimatedTotal?: number,
  ): CursorPaginatedResponse<T> {
    // Check if there are more items
    const hasMore = items.length > limit;

    // Trim to actual limit
    const trimmedItems = hasMore ? items.slice(0, limit) : items;

    // Generate cursors
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (trimmedItems.length > 0) {
      const lastItem = trimmedItems[trimmedItems.length - 1] as T & Record<string, unknown>;
      const firstItem = trimmedItems[0] as T & Record<string, unknown>;

      if (hasMore) {
        nextCursor = this.encodeCursor(
          lastItem[sortField] as string | number | Date,
          lastItem.id,
          'forward',
        );
      }

      // If we had a cursor in the request, we can go back
      if (params.cursor) {
        prevCursor = this.encodeCursor(
          firstItem[sortField] as string | number | Date,
          firstItem.id,
          'backward',
        );
      }
    }

    const pagination: CursorPaginationMeta = {
      nextCursor,
      prevCursor,
      hasMore,
      count: trimmedItems.length,
      ...(estimatedTotal !== undefined && { estimatedTotal }),
    };

    return {
      items: trimmedItems,
      pagination,
    };
  }

  /**
   * Get an estimated count for a table using Prisma
   * This is faster than COUNT(*) for large tables
   *
   * Note: For PostgreSQL, this uses pg_class.reltuples which is approximate
   * For SQLite (dev), falls back to exact count
   */
  async getEstimatedCount(
    prisma: { $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]> },
    tableName: string,
  ): Promise<number> {
    try {
      // Try PostgreSQL estimated count first
      const result = await prisma.$queryRaw`
        SELECT reltuples::bigint AS estimate
        FROM pg_class
        WHERE relname = ${tableName}
      ` as { estimate: bigint }[];
      if (result.length > 0 && result[0].estimate !== undefined) {
        return Number(result[0].estimate);
      }
    } catch {
      // Not PostgreSQL or table not found, will fall back
    }

    // Return -1 to signal exact count should be used
    return -1;
  }
}
