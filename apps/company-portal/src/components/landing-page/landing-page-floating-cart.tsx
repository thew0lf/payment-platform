'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLandingPage } from '@/contexts/landing-page-context';

// ============================================================================
// Types
// ============================================================================

export interface LandingPageFloatingCartProps {
  /** Optional className for custom styling */
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * LandingPageFloatingCart - Desktop floating cart summary for landing pages
 *
 * Features:
 * - Fixed position bottom-right (hidden on mobile)
 * - Shows item count, subtotal, "View Cart" button
 * - Pulse animation when items added
 * - Uses LandingPageContext
 */
export function LandingPageFloatingCart({ className = '' }: LandingPageFloatingCartProps) {
  const { localCart, cartTotal, cartCount, openCartDrawer } = useLandingPage();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [prevCartCount, setPrevCartCount] = useState(0);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }, []);

  // Handle cart count changes for pulse animation
  useEffect(() => {
    if (cartCount > prevCartCount && prevCartCount > 0) {
      setIsPulsing(true);
      const timeout = setTimeout(() => setIsPulsing(false), 600);
      return () => clearTimeout(timeout);
    }
    setPrevCartCount(cartCount);
  }, [cartCount, prevCartCount]);

  // Handle visibility animation
  useEffect(() => {
    if (cartCount > 0) {
      setShouldRender(true);
      const showTimeout = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(showTimeout);
    } else {
      setIsVisible(false);
      const hideTimeout = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(hideTimeout);
    }
  }, [cartCount]);

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      {/* Screen reader announcement */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {cartCount > 0
          ? `Cart updated: ${cartCount} ${cartCount === 1 ? 'item' : 'items'}, ${formatCurrency(cartTotal)} total`
          : 'Cart is empty'}
      </div>

      {/* Floating Cart Widget - Desktop only */}
      <div
        className={`
          hidden md:block
          fixed bottom-6 right-6 z-40
          transition-all duration-300 ease-out
          ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
          ${className}
        `}
        role="region"
        aria-label="Shopping cart summary"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 flex items-center gap-4">
            {/* Cart Icon with Badge */}
            <div className="relative">
              <div
                className={`
                  w-12 h-12 rounded-xl bg-[var(--lp-primary,#667eea)]/10
                  flex items-center justify-center
                  transition-transform duration-200
                  ${isPulsing ? 'scale-110' : ''}
                `}
              >
                <svg
                  className="h-6 w-6 text-[var(--lp-primary,#667eea)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              {/* Item Count Badge */}
              <span
                className={`
                  absolute -top-1 -right-1
                  flex items-center justify-center
                  min-w-[22px] h-[22px] px-1.5
                  bg-[var(--lp-primary,#667eea)] text-white
                  text-xs font-bold
                  rounded-full
                  shadow-sm
                  transition-transform duration-300
                  ${isPulsing ? 'scale-125' : ''}
                `}
                aria-hidden="true"
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            </div>

            {/* Cart Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {cartCount} {cartCount === 1 ? 'item' : 'items'} in cart
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(cartTotal)}
              </p>
            </div>

            {/* View Cart Button */}
            <button
              type="button"
              onClick={openCartDrawer}
              className="
                flex items-center gap-1
                px-4 py-2.5 min-h-[44px]
                bg-[var(--lp-primary,#667eea)] text-white
                font-medium text-sm
                rounded-xl
                hover:opacity-90
                transition-all duration-200
                touch-manipulation
                active:scale-[0.98]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lp-primary,#667eea)]
              "
              aria-label={`View cart with ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
            >
              View Cart
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default LandingPageFloatingCart;
