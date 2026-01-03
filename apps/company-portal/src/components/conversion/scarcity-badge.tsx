'use client';

import { useState, useMemo } from 'react';
import {
  ExclamationTriangleIcon,
  FireIcon,
  CubeIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/solid';

// ============================================================================
// Types
// ============================================================================

export interface ScarcityBadgeProps {
  /** Available stock quantity */
  quantity: number;
  /** Threshold below which to show warning (default: 10) */
  threshold?: number;
  /** Show exact number or just "Low stock" (default: false) */
  showExact?: boolean;
  /** Display variant: badge (pill), inline (text with icon), tooltip (icon with hover) */
  variant?: 'badge' | 'inline' | 'tooltip';
  /** Enable pulse animation for very low stock (default: true) */
  animate?: boolean;
  /** Additional CSS classes */
  className?: string;
}

type StockStatus = 'out_of_stock' | 'critical' | 'low' | 'available';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine stock status based on quantity and threshold
 */
function getStockStatus(quantity: number, threshold: number): StockStatus {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= 3) return 'critical';
  if (quantity <= threshold) return 'low';
  return 'available';
}

/**
 * Get display message based on stock status
 */
function getStatusMessage(
  quantity: number,
  status: StockStatus,
  showExact: boolean
): string {
  switch (status) {
    case 'out_of_stock':
      return 'Out of Stock';
    case 'critical':
      return showExact ? `Only ${quantity} left!` : 'Only a few left!';
    case 'low':
      return showExact ? `Low stock - ${quantity} remaining` : 'Low stock';
    default:
      return '';
  }
}

/**
 * Get aria-label for accessibility
 */
function getAriaLabel(quantity: number, status: StockStatus): string {
  switch (status) {
    case 'out_of_stock':
      return 'This item is currently out of stock';
    case 'critical':
      return `Low stock warning: Only ${quantity} ${quantity === 1 ? 'item' : 'items'} remaining`;
    case 'low':
      return `Low stock warning: ${quantity} items remaining`;
    default:
      return '';
  }
}

// ============================================================================
// Style Configurations
// ============================================================================

const statusStyles = {
  out_of_stock: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    icon: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  critical: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    icon: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  low: {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    icon: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  available: {
    badge: '',
    icon: '',
    border: '',
  },
};

// ============================================================================
// Subcomponents
// ============================================================================

interface StatusIconProps {
  status: StockStatus;
  className?: string;
  animate?: boolean;
}

function StatusIcon({ status, className = '', animate = false }: StatusIconProps) {
  const styles = statusStyles[status];
  const animationClass = animate && status === 'critical' ? 'motion-safe:animate-pulse' : '';

  if (status === 'out_of_stock') {
    return (
      <ExclamationTriangleIcon
        className={`h-4 w-4 ${styles.icon} ${className}`}
        aria-hidden="true"
      />
    );
  }

  if (status === 'critical') {
    return (
      <FireIcon
        className={`h-4 w-4 ${styles.icon} ${animationClass} ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <CubeIcon
      className={`h-4 w-4 ${styles.icon} ${className}`}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// Badge Variant Component
// ============================================================================

interface BadgeVariantProps {
  message: string;
  status: StockStatus;
  ariaLabel: string;
  animate: boolean;
  className?: string;
}

function BadgeVariant({
  message,
  status,
  ariaLabel,
  animate,
  className = '',
}: BadgeVariantProps) {
  const styles = statusStyles[status];
  const pulseAnimation = animate && status === 'critical' ? 'motion-safe:animate-pulse' : '';

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={`
        inline-flex items-center gap-1.5
        px-2.5 py-1
        text-xs font-medium
        rounded-full
        ${styles.badge}
        ${pulseAnimation}
        ${className}
      `}
    >
      <StatusIcon status={status} animate={animate} />
      <span>{message}</span>
    </span>
  );
}

// ============================================================================
// Inline Variant Component
// ============================================================================

interface InlineVariantProps {
  message: string;
  status: StockStatus;
  ariaLabel: string;
  animate: boolean;
  className?: string;
}

function InlineVariant({
  message,
  status,
  ariaLabel,
  animate,
  className = '',
}: InlineVariantProps) {
  const styles = statusStyles[status];
  const pulseAnimation = animate && status === 'critical' ? 'motion-safe:animate-pulse' : '';

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={`
        inline-flex items-center gap-2
        text-sm font-medium
        ${styles.badge.replace(/bg-\S+\s?/g, '')}
        ${pulseAnimation}
        ${className}
      `}
    >
      <StatusIcon status={status} animate={animate} />
      <span>{message}</span>
    </div>
  );
}

// ============================================================================
// Tooltip Variant Component
// ============================================================================

interface TooltipVariantProps {
  message: string;
  status: StockStatus;
  ariaLabel: string;
  animate: boolean;
  className?: string;
}

function TooltipVariant({
  message,
  status,
  ariaLabel,
  animate,
  className = '',
}: TooltipVariantProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const styles = statusStyles[status];
  const pulseAnimation = animate && status === 'critical' ? 'motion-safe:animate-pulse' : '';

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      <button
        type="button"
        role="status"
        aria-label={ariaLabel}
        aria-describedby={showTooltip ? 'scarcity-tooltip' : undefined}
        className={`
          inline-flex items-center justify-center
          w-6 h-6
          rounded-full
          ${styles.badge}
          ${pulseAnimation}
          cursor-help
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500
          transition-colors
        `}
      >
        <StatusIcon status={status} animate={animate} className="h-3.5 w-3.5" />
      </button>

      {showTooltip && (
        <div
          id="scarcity-tooltip"
          role="tooltip"
          className={`
            absolute z-10
            bottom-full left-1/2 -translate-x-1/2 mb-2
            px-3 py-2
            text-xs font-medium text-white
            bg-gray-900 dark:bg-gray-700
            rounded-lg shadow-lg
            whitespace-nowrap
            pointer-events-none
            animate-in fade-in duration-150
          `}
        >
          {message}
          {/* Tooltip arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 -mt-px"
            aria-hidden="true"
          >
            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ScarcityBadge - Displays low stock warnings to create urgency
 *
 * Features:
 * - Three display variants: badge (pill), inline (text with icon), tooltip (icon with hover)
 * - Automatic styling based on stock level (critical, low, out of stock)
 * - Pulse animation for very low stock
 * - Dark mode support
 * - Full accessibility support with ARIA labels and role="status"
 *
 * @example
 * // Badge variant (default)
 * <ScarcityBadge quantity={5} />
 *
 * @example
 * // Inline with exact count
 * <ScarcityBadge quantity={3} variant="inline" showExact />
 *
 * @example
 * // Tooltip variant
 * <ScarcityBadge quantity={2} variant="tooltip" />
 */
export function ScarcityBadge({
  quantity,
  threshold = 10,
  showExact = false,
  variant = 'badge',
  animate = true,
  className = '',
}: ScarcityBadgeProps) {
  // Memoize status calculation
  const status = useMemo(
    () => getStockStatus(quantity, threshold),
    [quantity, threshold]
  );

  // Don't render if stock is above threshold
  if (status === 'available') {
    return null;
  }

  // Get message and aria label
  const message = getStatusMessage(quantity, status, showExact);
  const ariaLabel = getAriaLabel(quantity, status);

  // Common props for all variants
  const commonProps = {
    message,
    status,
    ariaLabel,
    animate,
    className,
  };

  // Render appropriate variant
  switch (variant) {
    case 'inline':
      return <InlineVariant {...commonProps} />;
    case 'tooltip':
      return <TooltipVariant {...commonProps} />;
    case 'badge':
    default:
      return <BadgeVariant {...commonProps} />;
  }
}

export default ScarcityBadge;
