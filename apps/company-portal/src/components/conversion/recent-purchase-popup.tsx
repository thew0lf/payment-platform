'use client';

import { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export interface RecentPurchase {
  id: string;
  customerName: string;
  productName: string;
  location?: string;
  timestamp: Date | string;
  imageUrl?: string;
}

export interface RecentPurchasePopupProps {
  /** Array of recent purchases to cycle through */
  purchases: RecentPurchase[];
  /** Interval between popups in milliseconds (default: 30000 = 30s) */
  interval?: number;
  /** Duration each popup is visible in milliseconds (default: 5000 = 5s) */
  duration?: number;
  /** Position of the popup */
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  /** Enable/disable the popup */
  enabled?: boolean;
  /** Maximum number of times to show popup per session (0 = unlimited) */
  maxShows?: number;
}

/**
 * Recent Purchase Popup Component
 *
 * Displays social proof notifications showing recent purchases from other customers.
 * Creates trust and urgency through FOMO (fear of missing out).
 *
 * @example
 * ```tsx
 * <RecentPurchasePopup
 *   purchases={[
 *     { id: '1', customerName: 'John', productName: 'Coffee Bundle', location: 'New York' },
 *     { id: '2', customerName: 'Sarah', productName: 'Premium Blend', location: 'Los Angeles' },
 *   ]}
 *   interval={30000}
 *   duration={5000}
 * />
 * ```
 */
export function RecentPurchasePopup({
  purchases,
  interval = 30000,
  duration = 5000,
  position = 'bottom-left',
  enabled = true,
  maxShows = 0,
}: RecentPurchasePopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCount, setShowCount] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  // Format time ago
  const formatTimeAgo = useCallback((timestamp: Date | string): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }, []);

  // Show/hide popup cycle
  useEffect(() => {
    if (!enabled || purchases.length === 0 || isDismissed) {
      return;
    }

    // Check max shows limit
    if (maxShows > 0 && showCount >= maxShows) {
      return;
    }

    // Initial delay before first popup
    const initialDelay = setTimeout(() => {
      setIsVisible(true);
      setShowCount((prev) => prev + 1);
    }, 5000); // 5 second initial delay

    return () => clearTimeout(initialDelay);
  }, [enabled, purchases.length, isDismissed, maxShows, showCount]);

  // Cycle through purchases
  useEffect(() => {
    if (!enabled || !isVisible || purchases.length === 0 || isDismissed) {
      return;
    }

    // Hide popup after duration
    const hideTimeout = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    // Show next popup after interval
    const nextTimeout = setTimeout(() => {
      // Check max shows limit
      if (maxShows > 0 && showCount >= maxShows) {
        return;
      }

      setCurrentIndex((prev) => (prev + 1) % purchases.length);
      setIsVisible(true);
      setShowCount((prev) => prev + 1);
    }, interval);

    return () => {
      clearTimeout(hideTimeout);
      clearTimeout(nextTimeout);
    };
  }, [enabled, isVisible, purchases.length, duration, interval, isDismissed, maxShows, showCount]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setIsDismissed(true);
  }, []);

  // Don't render if disabled, no purchases, or dismissed
  if (!enabled || purchases.length === 0 || isDismissed) {
    return null;
  }

  const currentPurchase = purchases[currentIndex];

  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
  };

  return (
    <>
      {/* Screen reader announcement */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isVisible
          ? `${currentPurchase.customerName} from ${currentPurchase.location || 'nearby'} just grabbed ${currentPurchase.productName}`
          : ''}
      </div>

      {/* Popup - only render content when visible */}
      {isVisible && (
        <div
          className={`
            fixed ${positionClasses[position]} z-40
            transform transition-all duration-300 ease-out
            translate-y-0 opacity-100
          `}
          role="alertdialog"
          aria-label="Recent purchase notification"
          aria-hidden={!isVisible}
        >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-xs w-full">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute -top-2 -right-2 p-1.5 bg-white dark:bg-gray-700 rounded-full shadow-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
            aria-label="Dismiss notifications"
          >
            <XMarkIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          </button>

          <div className="flex items-start gap-3">
            {/* Product image or placeholder */}
            <div className="flex-shrink-0">
              {currentPurchase.imageUrl ? (
                <img
                  src={currentPurchase.imageUrl}
                  alt={currentPurchase.productName}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" aria-hidden="true" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {currentPurchase.customerName}
                {currentPurchase.location && (
                  <span className="font-normal text-gray-500 dark:text-gray-400">
                    {' '}from {currentPurchase.location}
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                just grabbed <span className="font-medium">{currentPurchase.productName}</span>
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {formatTimeAgo(currentPurchase.timestamp)}
              </p>
            </div>
          </div>

          {/* Verified badge */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <CheckCircleIcon className="w-4 h-4 text-green-500" aria-hidden="true" />
            <span>Verified purchase</span>
          </div>
        </div>
      </div>
      )}
    </>
  );
}

export default RecentPurchasePopup;
