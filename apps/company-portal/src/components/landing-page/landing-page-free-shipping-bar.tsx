'use client';

import { useMemo } from 'react';
import { useLandingPage } from '@/contexts/landing-page-context';

// ============================================================================
// Types
// ============================================================================

export interface LandingPageFreeShippingBarProps {
  /** Free shipping threshold amount in dollars */
  threshold?: number;
  /** Message when below threshold */
  belowMessage?: string;
  /** Message when threshold reached */
  achievedMessage?: string;
  /** Optional className */
  className?: string;
  /** Variant style */
  variant?: 'banner' | 'inline' | 'card';
}

// ============================================================================
// Utilities
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * LandingPageFreeShippingBar - Progress bar showing distance to free shipping
 *
 * Features:
 * - Visual progress bar toward free shipping threshold
 * - Celebration animation when achieved
 * - Multiple display variants
 * - Uses CSS custom properties for theming
 */
export function LandingPageFreeShippingBar({
  threshold = 50,
  belowMessage = 'You\'re {amount} away from free shipping!',
  achievedMessage = 'Nice! Free shipping is yours.',
  className = '',
  variant = 'banner',
}: LandingPageFreeShippingBarProps) {
  const { cartTotal, cartCount } = useLandingPage();

  const { isAchieved, remaining, progress, message } = useMemo(() => {
    const achieved = cartTotal >= threshold;
    const remainingAmount = Math.max(0, threshold - cartTotal);
    const progressPercent = Math.min(100, (cartTotal / threshold) * 100);

    const msg = achieved
      ? achievedMessage
      : belowMessage.replace('{amount}', formatCurrency(remainingAmount));

    return {
      isAchieved: achieved,
      remaining: remainingAmount,
      progress: progressPercent,
      message: msg,
    };
  }, [cartTotal, threshold, belowMessage, achievedMessage]);

  // Don't render if cart is empty
  if (cartCount === 0) {
    return null;
  }

  // Variant-specific styles
  const variantStyles = {
    banner: `
      w-full py-3 px-4
      ${isAchieved
        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
        : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-800'}
    `,
    inline: `
      inline-flex flex-col gap-2
      p-3
      bg-gray-50 border border-gray-200
      rounded-lg
      text-gray-800
    `,
    card: `
      p-4
      bg-white border border-gray-200
      rounded-xl shadow-sm
      text-gray-800
    `,
  };

  return (
    <div
      className={`
        transition-all duration-300
        ${variantStyles[variant]}
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      {/* Message Row */}
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        {isAchieved ? (
          <>
            <svg
              className="h-5 w-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="animate-pulse">{message}</span>
          </>
        ) : (
          <>
            <svg
              className="h-5 w-5 flex-shrink-0 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
            <span>{message}</span>
          </>
        )}
      </div>

      {/* Progress Bar (only show when not achieved) */}
      {!isAchieved && variant !== 'inline' && (
        <div className="mt-2">
          <div
            className="h-2 bg-gray-200 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${Math.round(progress)}% progress to free shipping`}
          >
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{formatCurrency(cartTotal)}</span>
            <span>{formatCurrency(threshold)}</span>
          </div>
        </div>
      )}

      {/* Inline Progress Indicator */}
      {!isAchieved && variant === 'inline' && (
        <div className="flex items-center gap-2">
          <div
            className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${Math.round(progress)}% progress to free shipping`}
          >
            <div
              className="h-full bg-blue-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap" aria-hidden="true">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default LandingPageFreeShippingBar;
