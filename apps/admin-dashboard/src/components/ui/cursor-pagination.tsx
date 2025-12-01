'use client';

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from './button';
import { CursorPaginationMeta } from '@/types/api';

interface CursorPaginationProps {
  pagination: CursorPaginationMeta | null;
  onLoadNext: () => void;
  onLoadPrev: () => void;
  isLoading?: boolean;
  className?: string;
}

export function CursorPagination({
  pagination,
  onLoadNext,
  onLoadPrev,
  isLoading = false,
  className = '',
}: CursorPaginationProps) {
  if (!pagination) return null;

  const { hasMore, prevCursor, count, estimatedTotal } = pagination;
  const hasPrev = prevCursor !== null;

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="text-sm text-zinc-500">
        {estimatedTotal ? (
          <span>
            Showing {count} of ~{estimatedTotal.toLocaleString()} items
          </span>
        ) : (
          <span>Showing {count} items</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onLoadPrev}
          disabled={!hasPrev || isLoading}
          className="gap-1"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
          Previous
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onLoadNext}
          disabled={!hasMore || isLoading}
          className="gap-1"
        >
          Next
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// Compact version for tables
export function CursorPaginationCompact({
  pagination,
  onLoadNext,
  onLoadPrev,
  isLoading = false,
  className = '',
}: CursorPaginationProps) {
  if (!pagination) return null;

  const { hasMore, prevCursor, count, estimatedTotal } = pagination;
  const hasPrev = prevCursor !== null;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="text-sm text-zinc-500">
        {estimatedTotal
          ? `${count} of ~${estimatedTotal.toLocaleString()}`
          : `${count} items`}
      </span>

      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={onLoadPrev}
          disabled={!hasPrev || isLoading}
          className="h-8 w-8"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onLoadNext}
          disabled={!hasMore || isLoading}
          className="h-8 w-8"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// Load More button for infinite scroll
interface LoadMoreButtonProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  className?: string;
}

export function LoadMoreButton({
  hasMore,
  isLoading,
  onLoadMore,
  className = '',
}: LoadMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <div className={`flex justify-center ${className}`}>
      <Button
        variant="outline"
        onClick={onLoadMore}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          'Load More'
        )}
      </Button>
    </div>
  );
}
