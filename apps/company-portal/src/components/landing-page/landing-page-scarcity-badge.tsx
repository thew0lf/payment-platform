'use client';

import { useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface LandingPageScarcityBadgeProps {
  /** Current stock quantity */
  stock: number;
  /** Threshold for "low stock" warning (default: 10) */
  lowStockThreshold?: number;
  /** Threshold for "very low" stock warning (default: 3) */
  veryLowThreshold?: number;
  /** Show exact number or vague message */
  showExactCount?: boolean;
  /** Optional className */
  className?: string;
  /** Variant style */
  variant?: 'badge' | 'inline' | 'pill';
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * LandingPageScarcityBadge - Stock scarcity indicator for products
 *
 * Features:
 * - Shows low stock warnings based on thresholds
 * - Multiple severity levels (low, very low, out of stock)
 * - Optional exact count or vague messaging
 * - Accessible with proper ARIA
 */
export function LandingPageScarcityBadge({
  stock,
  lowStockThreshold = 10,
  veryLowThreshold = 3,
  showExactCount = true,
  className = '',
  variant = 'badge',
}: LandingPageScarcityBadgeProps) {
  const { severity, message, colorClasses } = useMemo(() => {
    if (stock <= 0) {
      return {
        severity: 'out-of-stock' as const,
        message: 'Out of stock',
        colorClasses: 'bg-gray-100 text-gray-600 border-gray-200',
      };
    }

    if (stock <= veryLowThreshold) {
      return {
        severity: 'very-low' as const,
        message: showExactCount
          ? `Only ${stock} left!`
          : 'Almost gone!',
        colorClasses: 'bg-red-50 text-red-700 border-red-200',
      };
    }

    if (stock <= lowStockThreshold) {
      return {
        severity: 'low' as const,
        message: showExactCount
          ? `Only ${stock} left`
          : 'Low stock',
        colorClasses: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }

    // Stock is healthy - don't show badge
    return {
      severity: 'healthy' as const,
      message: '',
      colorClasses: '',
    };
  }, [stock, lowStockThreshold, veryLowThreshold, showExactCount]);

  // Don't render if stock is healthy
  if (severity === 'healthy') {
    return null;
  }

  // Variant-specific styles
  const variantStyles = {
    badge: `
      inline-flex items-center gap-1.5
      px-2.5 py-1
      text-xs font-semibold
      rounded-md border
      ${severity === 'very-low' ? 'animate-pulse' : ''}
    `,
    inline: `
      inline-flex items-center gap-1
      text-sm font-medium
    `,
    pill: `
      inline-flex items-center gap-1.5
      px-3 py-1
      text-xs font-semibold
      rounded-full border
      ${severity === 'very-low' ? 'animate-pulse' : ''}
    `,
  };

  const iconByVariant = {
    badge: true,
    inline: false,
    pill: true,
  };

  return (
    <span
      className={`
        ${variantStyles[variant]}
        ${colorClasses}
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      {iconByVariant[variant] && (
        <>
          {severity === 'out-of-stock' ? (
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          )}
        </>
      )}
      <span>{message}</span>
    </span>
  );
}

export default LandingPageScarcityBadge;
