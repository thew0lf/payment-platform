'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLandingPage } from '@/contexts/landing-page-context';

// ============================================================================
// Types
// ============================================================================

export interface RecentPurchase {
  id: string;
  customerName: string;
  customerLocation?: string;
  productName: string;
  productImageUrl?: string;
  timestamp: number; // Unix timestamp
}

export interface SocialProofPopupProps {
  /** Recent purchases to display */
  purchases: RecentPurchase[];
  /** Minimum delay between showing popups (ms) - default: 15000 (15s) */
  minDelay?: number;
  /** Maximum delay between showing popups (ms) - default: 45000 (45s) */
  maxDelay?: number;
  /** How long to show each popup (ms) - default: 5000 (5s) */
  displayDuration?: number;
  /** Initial delay before first popup (ms) - default: 10000 (10s) */
  initialDelay?: number;
  /** Position on screen */
  position?: 'bottom-left' | 'bottom-right';
  /** Enable/disable the popup */
  enabled?: boolean;
  /** Maximum age of purchases to show (ms) - default: 86400000 (24h) */
  maxPurchaseAge?: number;
  /** Optional className */
  className?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  return 'yesterday';
}

function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================================
// Social Proof Popup Component
// ============================================================================

/**
 * SocialProofPopup - Recent purchase notification
 *
 * Features:
 * - Shows recent purchases as social proof
 * - Randomized display intervals
 * - Smooth enter/exit animations
 * - Click to dismiss
 * - Auto-cycles through purchases
 * - Accessibility support
 */
export function SocialProofPopup({
  purchases,
  minDelay = 15000,
  maxDelay = 45000,
  displayDuration = 5000,
  initialDelay = 10000,
  position = 'bottom-left',
  enabled = true,
  maxPurchaseAge = 86400000, // 24 hours
  className = '',
}: SocialProofPopupProps) {
  const { trackEvent } = useLandingPage();
  const [currentPurchase, setCurrentPurchase] = useState<RecentPurchase | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [purchaseIndex, setPurchaseIndex] = useState(0);
  const [shouldScheduleNext, setShouldScheduleNext] = useState(false);
  // Track all active timeouts for proper cleanup
  const activeTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const isMountedRef = useRef(true);

  // Filter valid purchases (with null guard)
  const validPurchases = useMemo(
    () =>
      (purchases ?? []).filter((p) => {
        const age = Date.now() - p.timestamp;
        return age <= maxPurchaseAge;
      }),
    [purchases, maxPurchaseAge]
  );

  // Cleanup helper that clears all active timeouts
  const clearAllTimeouts = useCallback(() => {
    activeTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    activeTimeoutsRef.current.clear();
  }, []);

  // Schedule a timeout and track it for cleanup
  const scheduleTimeout = useCallback((callback: () => void, delay: number): NodeJS.Timeout => {
    const timeout = setTimeout(() => {
      activeTimeoutsRef.current.delete(timeout);
      if (isMountedRef.current) {
        callback();
      }
    }, delay);
    activeTimeoutsRef.current.add(timeout);
    return timeout;
  }, []);

  // Show popup and track impression
  const showPurchase = useCallback(
    (purchase: RecentPurchase) => {
      setCurrentPurchase(purchase);
      setIsVisible(true);
      trackEvent('SOCIAL_PROOF_SHOWN', {
        purchaseId: purchase.id,
        productName: purchase.productName,
      });
    },
    [trackEvent]
  );

  // Effect to handle showing next purchase when triggered
  useEffect(() => {
    if (!enabled || validPurchases.length === 0) return;

    // Initial delay before first popup
    scheduleTimeout(() => {
      if (validPurchases.length > 0) {
        showPurchase(validPurchases[0]);
        setPurchaseIndex(1);
      }
    }, initialDelay);

    return () => {
      isMountedRef.current = false;
      clearAllTimeouts();
    };
  }, [enabled, validPurchases, initialDelay, scheduleTimeout, showPurchase, clearAllTimeouts]);

  // Effect to auto-hide popup after display duration
  useEffect(() => {
    if (!isVisible || !currentPurchase) return;

    scheduleTimeout(() => {
      setIsVisible(false);
      setShouldScheduleNext(true);
    }, displayDuration);
  }, [isVisible, currentPurchase, displayDuration, scheduleTimeout]);

  // Effect to schedule next popup after hiding
  useEffect(() => {
    if (!shouldScheduleNext || validPurchases.length === 0) return;

    setShouldScheduleNext(false);

    scheduleTimeout(() => {
      const nextPurchase = validPurchases[purchaseIndex % validPurchases.length];
      showPurchase(nextPurchase);
      setPurchaseIndex((prev) => prev + 1);
    }, getRandomDelay(minDelay, maxDelay));
  }, [shouldScheduleNext, validPurchases, purchaseIndex, minDelay, maxDelay, scheduleTimeout, showPurchase]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    clearAllTimeouts();

    // Track dismissal
    if (currentPurchase) {
      trackEvent('SOCIAL_PROOF_DISMISSED', {
        purchaseId: currentPurchase.id,
      });
    }

    // Schedule next popup after dismissal
    setShouldScheduleNext(true);
  }, [currentPurchase, trackEvent, clearAllTimeouts]);

  // Don't render if disabled or no purchases
  if (!enabled || validPurchases.length === 0 || !currentPurchase) {
    return null;
  }

  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Recent customer purchase"
      className={`
        fixed ${positionClasses[position]}
        max-w-sm z-40
        transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
        ${className}
      `}
    >
      <button
        onClick={handleDismiss}
        className="w-full text-left bg-white rounded-xl shadow-lg border border-gray-100
                   p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors
                   min-h-[44px] touch-manipulation"
        aria-label="Dismiss notification"
      >
        {/* Product Image */}
        {currentPurchase.productImageUrl ? (
          <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={currentPurchase.productImageUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-primary-600"
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
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">
            <span className="font-medium">{currentPurchase.customerName}</span>
            {currentPurchase.customerLocation && (
              <span className="text-gray-500"> from {currentPurchase.customerLocation}</span>
            )}
          </p>
          <p className="text-sm text-gray-600 truncate">
            purchased{' '}
            <span className="font-medium text-gray-900">{currentPurchase.productName}</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {getRelativeTime(currentPurchase.timestamp)}
          </p>
        </div>

        {/* Close indicator */}
        <div className="flex-shrink-0 text-gray-300">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </button>
    </aside>
  );
}

// ============================================================================
// Live Visitor Count Component
// ============================================================================

export interface LiveVisitorCountProps {
  /** Current number of visitors viewing this page */
  count: number;
  /** Minimum count to display (default: 3) */
  minCount?: number;
  /** Text template (use {{count}} for number) */
  template?: string;
  /** Optional className */
  className?: string;
}

/**
 * LiveVisitorCount - Shows number of people viewing the page
 */
export function LiveVisitorCount({
  count,
  minCount = 3,
  template = '{{count}} people are viewing this right now',
  className = '',
}: LiveVisitorCountProps) {
  // Don't show if below minimum
  if (count < minCount) {
    return null;
  }

  const text = template.replace('{{count}}', count.toString());

  return (
    <div
      className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}
      aria-live="polite"
    >
      {/* Animated dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <span>{text}</span>
    </div>
  );
}

// ============================================================================
// Purchase Count Badge Component
// ============================================================================

export interface PurchaseCountBadgeProps {
  /** Number of purchases in time period */
  count: number;
  /** Time period description */
  period?: string;
  /** Minimum count to display (default: 5) */
  minCount?: number;
  /** Optional className */
  className?: string;
}

/**
 * PurchaseCountBadge - Shows total purchase count
 */
export function PurchaseCountBadge({
  count,
  period = 'today',
  minCount = 5,
  className = '',
}: PurchaseCountBadgeProps) {
  if (count < minCount) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700
                  rounded-full text-sm font-medium ${className}`}
      role="status"
    >
      <svg
        className="w-4 h-4"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      <span>
        {count}+ people purchased {period}
      </span>
    </div>
  );
}

export default SocialProofPopup;
