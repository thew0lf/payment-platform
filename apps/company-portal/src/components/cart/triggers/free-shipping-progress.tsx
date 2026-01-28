'use client';

import { Gift, Truck, Check } from 'lucide-react';

interface FreeShippingProgressProps {
  currentTotal: number;
  threshold: number;
  currency?: string;
  locale?: string;
}

function formatPrice(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

export function FreeShippingProgress({
  currentTotal,
  threshold,
  currency = 'USD',
  locale = 'en-US',
}: FreeShippingProgressProps) {
  const remaining = Math.max(0, threshold - currentTotal);
  const progress = Math.min(100, (currentTotal / threshold) * 100);
  const achieved = remaining === 0;

  // Unlocked state
  if (achieved) {
    return (
      <div
        className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-800 border border-green-200"
        role="status"
        aria-label="Free shipping unlocked"
      >
        <div className="flex items-center justify-center h-5 w-5 rounded-full bg-green-600">
          <Check className="h-3 w-3 text-white" aria-hidden="true" />
        </div>
        <Truck className="h-5 w-5" aria-hidden="true" />
        <span className="font-medium">You&apos;ve unlocked FREE shipping!</span>
      </div>
    );
  }

  // Progress state
  return (
    <div
      className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100"
      role="status"
      aria-label={`Add ${formatPrice(remaining, currency, locale)} more for free shipping. ${Math.round(progress)}% there.`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Gift className="h-5 w-5 text-purple-600" aria-hidden="true" />
        <span className="text-sm font-medium text-purple-900">
          Add <span className="font-bold">{formatPrice(remaining, currency, locale)}</span> more
          for FREE shipping!
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 w-full bg-purple-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-xs text-purple-600 mt-1">{Math.round(progress)}% there</p>
    </div>
  );
}
