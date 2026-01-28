'use client';

import { useState, useEffect, useCallback } from 'react';
import { Eye, Users } from 'lucide-react';

interface LiveViewersCountProps {
  productId?: string;
  cartId?: string;
  initialCount?: number;
  variant?: 'minimal' | 'detailed' | 'badge';
  refreshInterval?: number;
  onCountChange?: (count: number) => void;
}

export function LiveViewersCount({
  productId,
  cartId,
  initialCount = 0,
  variant = 'minimal',
  refreshInterval = 30000, // 30 seconds
  onCountChange,
}: LiveViewersCountProps) {
  const [viewerCount, setViewerCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(initialCount === 0);
  const [hasError, setHasError] = useState(false);

  const fetchViewerCount = useCallback(async () => {
    // If no productId or cartId, we cannot fetch viewer count
    if (!productId && !cartId) {
      setIsLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (productId) params.append('productId', productId);
      if (cartId) params.append('cartId', cartId);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/analytics/viewers?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const count = data.count ?? 0;
      setViewerCount(count);
      setHasError(false);
      onCountChange?.(count);
    } catch (error) {
      console.error('Failed to fetch viewer count:', error);
      setHasError(true);
      // On error, set count to 0 - do NOT use simulated data
      setViewerCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [productId, cartId, onCountChange]);

  useEffect(() => {
    // Initial fetch
    if (initialCount === 0) {
      fetchViewerCount();
    }

    // Periodic refresh from API
    const interval = setInterval(() => {
      fetchViewerCount();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchViewerCount, initialCount, refreshInterval]);

  if (isLoading || viewerCount === 0) {
    return null;
  }

  // Minimal variant - just text with pulse
  if (variant === 'minimal') {
    return (
      <div
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
        aria-label={`${viewerCount} people viewing`}
      >
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span>
          {viewerCount} {viewerCount === 1 ? 'person' : 'people'} viewing
        </span>
      </div>
    );
  }

  // Detailed variant - with icon and more context
  if (variant === 'detailed') {
    return (
      <div
        className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 text-blue-800 text-sm"
        role="status"
        aria-live="polite"
      >
        <div className="relative">
          <Users className="h-4 w-4" aria-hidden="true" />
          <span
            className="absolute -top-1 -right-1 flex h-2 w-2"
            aria-hidden="true"
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
        </div>
        <span>
          <span className="font-semibold">{viewerCount}</span>{' '}
          {viewerCount === 1 ? 'person is' : 'people are'} viewing this right now
        </span>
      </div>
    );
  }

  // Badge variant - compact for item display
  if (variant === 'badge') {
    return (
      <div
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs"
        role="status"
        aria-label={`${viewerCount} viewers`}
      >
        <Eye className="h-3 w-3" aria-hidden="true" />
        <span className="font-medium">{viewerCount}</span>
      </div>
    );
  }

  return null;
}
