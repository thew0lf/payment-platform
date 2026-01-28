'use client';

import { Star, Users, ShoppingBag, TrendingUp } from 'lucide-react';

interface SocialProofBadgeProps {
  variant: 'rating' | 'purchases' | 'trending' | 'viewers';
  rating?: number;
  reviewCount?: number;
  purchaseCount?: number;
  viewersCount?: number;
  timeframe?: string;
  compact?: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

export function SocialProofBadge({
  variant,
  rating = 0,
  reviewCount = 0,
  purchaseCount = 0,
  viewersCount = 0,
  timeframe = 'this week',
  compact = false,
}: SocialProofBadgeProps) {
  // Rating variant
  if (variant === 'rating' && rating > 0) {
    return (
      <div
        className={`flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'}`}
        role="img"
        aria-label={`${rating} out of 5 stars from ${formatNumber(reviewCount)} reviews`}
      >
        <Star
          className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-yellow-400 fill-yellow-400`}
          aria-hidden="true"
        />
        <span className="font-medium text-gray-900">{rating.toFixed(1)}</span>
        {reviewCount > 0 && (
          <span className="text-gray-500">({formatNumber(reviewCount)} reviews)</span>
        )}
      </div>
    );
  }

  // Purchases variant
  if (variant === 'purchases' && purchaseCount > 0) {
    return (
      <div
        className={`flex items-center gap-1.5 ${compact ? 'text-xs' : 'text-sm'} text-gray-600`}
        role="status"
      >
        <ShoppingBag
          className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-green-600`}
          aria-hidden="true"
        />
        <span>
          <span className="font-medium text-gray-900">{formatNumber(purchaseCount)}</span> bought{' '}
          {timeframe}
        </span>
      </div>
    );
  }

  // Trending variant
  if (variant === 'trending') {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 ${compact ? 'text-xs' : 'text-sm'} font-medium`}
        role="status"
      >
        <TrendingUp className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} aria-hidden="true" />
        <span>Trending</span>
      </div>
    );
  }

  // Viewers variant
  if (variant === 'viewers' && viewersCount > 0) {
    return (
      <div
        className={`flex items-center gap-1.5 ${compact ? 'text-xs' : 'text-sm'} text-gray-600`}
        role="status"
        aria-label={`${viewersCount} people viewing`}
      >
        <Users
          className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-blue-600`}
          aria-hidden="true"
        />
        <span>
          <span className="font-medium text-gray-900">{viewersCount}</span> viewing now
        </span>
      </div>
    );
  }

  return null;
}
