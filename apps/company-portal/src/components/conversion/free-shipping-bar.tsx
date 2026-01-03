'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface FreeShippingBarProps {
  /** Current cart total amount */
  currentTotal: number;
  /** Amount needed for free shipping */
  threshold: number;
  /** Currency code (default: 'USD') */
  currency?: string;
  /** Display variant */
  variant?: 'bar' | 'compact' | 'floating';
  /** Show truck icon (default: true) */
  showIcon?: boolean;
  /** Optional callback when threshold is reached */
  onThresholdReached?: () => void;
  /** Optional className for custom styling */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function FreeShippingBar({
  currentTotal,
  threshold,
  currency = 'USD',
  variant = 'bar',
  showIcon = true,
  onThresholdReached,
  className = '',
}: FreeShippingBarProps) {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const previousThresholdMetRef = useRef(false);
  const announcementRef = useRef<HTMLSpanElement>(null);

  // Calculate progress
  const remaining = Math.max(0, threshold - currentTotal);
  const isThresholdMet = remaining <= 0;
  const progressPercentage = Math.min(100, (currentTotal / threshold) * 100);

  // Format currency
  const formatCurrency = useCallback(
    (amount: number): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    },
    [currency]
  );

  // Check if user prefers reduced motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Handle threshold reached
  useEffect(() => {
    if (isThresholdMet && !previousThresholdMetRef.current) {
      previousThresholdMetRef.current = true;
      onThresholdReached?.();

      // Trigger celebration animation
      if (!prefersReducedMotion) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
      }

      // Announce to screen readers
      if (announcementRef.current) {
        announcementRef.current.textContent =
          "Congratulations! You've unlocked free shipping!";
      }
    } else if (!isThresholdMet) {
      previousThresholdMetRef.current = false;
    }
  }, [isThresholdMet, onThresholdReached, prefersReducedMotion]);

  // Animate on mount
  useEffect(() => {
    if (!prefersReducedMotion) {
      const timer = setTimeout(() => setHasAnimated(true), 100);
      return () => clearTimeout(timer);
    } else {
      setHasAnimated(true);
    }
  }, [prefersReducedMotion]);

  // Get progress bar color based on progress
  const getProgressColor = (): string => {
    if (isThresholdMet) {
      return 'bg-green-500';
    }
    if (progressPercentage >= 75) {
      return 'bg-emerald-500';
    }
    if (progressPercentage >= 50) {
      return 'bg-blue-500';
    }
    if (progressPercentage >= 25) {
      return 'bg-indigo-500';
    }
    return 'bg-gray-400';
  };

  // Get background gradient for progress bar
  const getProgressGradient = (): string => {
    if (isThresholdMet) {
      return 'from-green-400 to-green-600';
    }
    if (progressPercentage >= 75) {
      return 'from-emerald-400 to-emerald-600';
    }
    if (progressPercentage >= 50) {
      return 'from-blue-400 to-blue-600';
    }
    if (progressPercentage >= 25) {
      return 'from-indigo-400 to-indigo-600';
    }
    return 'from-gray-300 to-gray-500';
  };

  // Truck icon SVG
  const TruckIcon = () => (
    <svg
      className={`h-5 w-5 flex-shrink-0 ${
        isThresholdMet
          ? 'text-green-600 dark:text-green-400'
          : 'text-gray-600 dark:text-gray-400'
      } ${!prefersReducedMotion && isThresholdMet ? 'animate-bounce' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
      />
    </svg>
  );

  // Celebration particles
  const CelebrationParticles = () => {
    if (!showCelebration || prefersReducedMotion) return null;

    return (
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {[...Array(8)].map((_, i) => (
          <span
            key={i}
            className="absolute text-xl animate-confetti-pop"
            style={{
              left: `${10 + i * 12}%`,
              animationDelay: `${i * 0.1}s`,
            }}
          >
            {['🎉', '✨', '🎊', '⭐'][i % 4]}
          </span>
        ))}
      </div>
    );
  };

  // Progress bar component
  const ProgressBar = ({ height = 'h-2' }: { height?: string }) => (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progressPercentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={
        isThresholdMet
          ? 'Free shipping unlocked'
          : `${Math.round(progressPercentage)}% progress to free shipping`
      }
      className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${height}`}
    >
      <div
        className={`${height} rounded-full bg-gradient-to-r ${getProgressGradient()} ${
          !prefersReducedMotion
            ? 'transition-all duration-500 ease-out'
            : ''
        }`}
        style={{ width: hasAnimated ? `${progressPercentage}%` : '0%' }}
      />
    </div>
  );

  // Message component
  const Message = ({ className: msgClassName = '' }: { className?: string }) => (
    <span className={`${msgClassName}`}>
      {isThresholdMet ? (
        <span className="text-green-700 dark:text-green-400 font-semibold">
          You've unlocked FREE shipping!
        </span>
      ) : (
        <span className="text-gray-700 dark:text-gray-300">
          Add{' '}
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(remaining)}
          </span>{' '}
          more for FREE shipping!
        </span>
      )}
    </span>
  );

  // Screen reader announcement
  const ScreenReaderAnnouncement = () => (
    <span
      ref={announcementRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );

  // VARIANT: Bar (Full-width progress bar with text)
  if (variant === 'bar') {
    return (
      <div
        className={`relative w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}
        data-testid="free-shipping-bar"
      >
        <ScreenReaderAnnouncement />
        <CelebrationParticles />

        <div className="flex items-center gap-3 mb-3">
          {showIcon && <TruckIcon />}
          <Message className="text-sm" />
        </div>

        <ProgressBar />

        {!isThresholdMet && (
          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span aria-hidden="true">{formatCurrency(0)}</span>
            <span aria-hidden="true">{formatCurrency(threshold)}</span>
          </div>
        )}
      </div>
    );
  }

  // VARIANT: Compact (Smaller inline version)
  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full ${className}`}
        data-testid="free-shipping-bar"
      >
        <ScreenReaderAnnouncement />

        {showIcon && (
          <svg
            className={`h-4 w-4 flex-shrink-0 ${
              isThresholdMet
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
            />
          </svg>
        )}

        <div className="flex items-center gap-2">
          <div className="w-16">
            <ProgressBar height="h-1.5" />
          </div>
          <span className="text-xs whitespace-nowrap">
            {isThresholdMet ? (
              <span className="text-green-600 dark:text-green-400 font-medium">
                FREE shipping!
              </span>
            ) : (
              <span className="text-gray-600 dark:text-gray-400">
                {formatCurrency(remaining)} to go
              </span>
            )}
          </span>
        </div>
      </div>
    );
  }

  // VARIANT: Floating (Sticky notification)
  if (variant === 'floating') {
    if (!isVisible) return null;

    return (
      <div
        className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 ${
          !prefersReducedMotion ? 'animate-slide-up' : ''
        } ${className}`}
        data-testid="free-shipping-bar"
        role="status"
        aria-label="Free shipping progress notification"
      >
        <ScreenReaderAnnouncement />
        <CelebrationParticles />

        {/* Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Dismiss free shipping notification"
        >
          <svg
            className="h-4 w-4"
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
        </button>

        <div className="flex items-start gap-3 pr-6">
          {showIcon && (
            <div
              className={`flex-shrink-0 p-2 rounded-full ${
                isThresholdMet
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              <TruckIcon />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <Message className="text-sm block mb-2" />
            <ProgressBar height="h-2" />

            {!isThresholdMet && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {Math.round(progressPercentage)}% of the way there!
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES (Tailwind CSS custom animations via style tag for demo)
// These should ideally be in tailwind.config.js extend section
// ═══════════════════════════════════════════════════════════════════════════════

// CSS Variables for theming - add to global CSS or component wrapper
// :root {
//   --free-shipping-primary: #10b981;
//   --free-shipping-progress-bg: #e5e7eb;
//   --free-shipping-text: #374151;
// }
//
// .dark {
//   --free-shipping-primary: #34d399;
//   --free-shipping-progress-bg: #374151;
//   --free-shipping-text: #d1d5db;
// }

// Keyframes for animations (add to globals.css):
// @keyframes confetti-pop {
//   0% { opacity: 0; transform: translateY(0) scale(0); }
//   50% { opacity: 1; transform: translateY(-20px) scale(1); }
//   100% { opacity: 0; transform: translateY(-40px) scale(0.5); }
// }
//
// @keyframes slide-up {
//   from { opacity: 0; transform: translateY(20px); }
//   to { opacity: 1; transform: translateY(0); }
// }
//
// .animate-confetti-pop {
//   animation: confetti-pop 1s ease-out forwards;
// }
//
// .animate-slide-up {
//   animation: slide-up 0.3s ease-out forwards;
// }

export default FreeShippingBar;
