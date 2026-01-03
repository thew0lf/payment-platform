'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLandingPage } from '@/contexts/landing-page-context';

// ============================================================================
// Types
// ============================================================================

export interface LandingPageUrgencyTimerProps {
  /** Timer duration in seconds (default: 15 minutes = 900s) */
  duration?: number;
  /** Message shown before timer */
  message?: string;
  /** Message shown when timer expires */
  expiredMessage?: string;
  /** Callback when timer expires */
  onExpire?: () => void;
  /** Optional className */
  className?: string;
  /** Variant style */
  variant?: 'banner' | 'inline' | 'floating';
}

// ============================================================================
// Utilities
// ============================================================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * LandingPageUrgencyTimer - Countdown timer for cart reservation urgency
 *
 * Features:
 * - Shows countdown timer for cart/offer reservation
 * - Multiple display variants (banner, inline, floating)
 * - Pulses when time is running low (< 2 minutes)
 * - Triggers callback when expired
 * - Uses CSS custom properties for theming
 */
export function LandingPageUrgencyTimer({
  duration = 900, // 15 minutes
  message = 'Your cart is reserved for',
  expiredMessage = 'Your reservation has expired',
  onExpire,
  className = '',
  variant = 'banner',
}: LandingPageUrgencyTimerProps) {
  const { cartCount } = useLandingPage();
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isExpired, setIsExpired] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Start/reset timer when cart has items
  useEffect(() => {
    if (cartCount > 0) {
      setShouldRender(true);
      setTimeRemaining(duration);
      setIsExpired(false);
    } else {
      setShouldRender(false);
    }
  }, [cartCount, duration]);

  // Countdown logic
  useEffect(() => {
    if (!shouldRender || isExpired) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [shouldRender, isExpired, onExpire]);

  if (!shouldRender) {
    return null;
  }

  const isUrgent = timeRemaining < 120; // Less than 2 minutes
  const isCritical = timeRemaining < 30; // Less than 30 seconds

  // Variant-specific styles
  const variantStyles = {
    banner: `
      w-full py-2 px-4
      bg-gradient-to-r from-amber-500 to-orange-500
      text-white
      ${isCritical ? 'animate-pulse' : ''}
    `,
    inline: `
      inline-flex items-center gap-2
      px-3 py-1.5
      bg-amber-50 border border-amber-200
      text-amber-800
      rounded-lg
      ${isCritical ? 'animate-pulse' : ''}
    `,
    floating: `
      fixed bottom-24 md:bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-auto
      py-3 px-4
      bg-white border border-amber-200
      text-gray-900
      rounded-xl shadow-lg
      z-40
      ${isCritical ? 'animate-pulse' : ''}
    `,
  };

  return (
    <div
      className={`
        flex items-center justify-center gap-2
        text-sm font-medium
        transition-all duration-300
        ${variantStyles[variant]}
        ${className}
      `}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
    >
      {isExpired ? (
        <>
          {/* Expired State */}
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
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{expiredMessage}</span>
        </>
      ) : (
        <>
          {/* Active Timer */}
          <svg
            className={`h-5 w-5 flex-shrink-0 ${isUrgent ? 'text-red-500' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{message}</span>
          <span
            className={`
              font-mono font-bold
              ${isUrgent ? 'text-red-600' : ''}
              ${variant === 'banner' ? 'text-white' : ''}
            `}
            aria-label={`${Math.floor(timeRemaining / 60)} minutes and ${timeRemaining % 60} seconds remaining`}
          >
            {formatTime(timeRemaining)}
          </span>
        </>
      )}
    </div>
  );
}

export default LandingPageUrgencyTimer;
