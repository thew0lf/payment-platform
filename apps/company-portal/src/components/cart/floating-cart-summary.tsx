'use client';

import { useEffect, useState, useCallback } from 'react';
import { ShoppingBagIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useFunnel } from '@/contexts/funnel-context';

// ============================================================================
// Types
// ============================================================================

export interface FloatingCartSummaryProps {
  /** Callback to open the cart drawer */
  onOpenCart: () => void;
  /** Optional className for custom styling */
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * FloatingCartSummary - Desktop floating cart summary widget
 *
 * Displays a compact cart summary in the bottom-right corner of the screen
 * (fixed position). Only visible when cart has items. Features smooth
 * entry/exit animations and a pulse animation when items are added.
 *
 * **Design Specifications:**
 * - Fixed position: bottom-right (bottom: 24px, right: 24px)
 * - Shows: item count, subtotal
 * - "View Cart" button opens cart drawer
 * - Hidden when cart is empty
 * - Animates in/out when cart changes
 * - Badge pulses when item added
 *
 * **Accessibility Notes:**
 * - Proper ARIA labels on all interactive elements
 * - Focus visible states for keyboard navigation
 * - Screen reader announcements for cart updates
 *
 * @example
 * ```tsx
 * <FloatingCartSummary onOpenCart={() => setIsDrawerOpen(true)} />
 * ```
 */
export function FloatingCartSummary({ onOpenCart, className = '' }: FloatingCartSummaryProps) {
  const { cart, cartTotal, cartCount } = useFunnel();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [prevCartCount, setPrevCartCount] = useState(0);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }, []);

  // Handle cart count changes for pulse animation
  useEffect(() => {
    if (cartCount > prevCartCount && prevCartCount > 0) {
      // Item was added, trigger pulse
      setIsPulsing(true);
      const timeout = setTimeout(() => setIsPulsing(false), 600);
      return () => clearTimeout(timeout);
    }
    setPrevCartCount(cartCount);
  }, [cartCount, prevCartCount]);

  // Handle visibility animation
  useEffect(() => {
    if (cartCount > 0) {
      // Cart has items, show the component
      setShouldRender(true);
      // Small delay to trigger CSS transition
      const showTimeout = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(showTimeout);
    } else {
      // Cart is empty, hide the component
      setIsVisible(false);
      // Wait for exit animation before unmounting
      const hideTimeout = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(hideTimeout);
    }
  }, [cartCount]);

  // Don't render if cart is empty and animation completed
  if (!shouldRender) {
    return null;
  }

  return (
    <>
      {/* Screen reader announcement for cart updates */}
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

      {/* Floating Cart Widget - Hidden on mobile (shown on md and up) */}
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
          {/* Main content area */}
          <div className="p-4 flex items-center gap-4">
            {/* Cart Icon with Badge */}
            <div className="relative">
              <div
                className={`
                  w-12 h-12 rounded-xl bg-[var(--primary-color,#6366f1)]/10
                  flex items-center justify-center
                  transition-transform duration-200
                  ${isPulsing ? 'animate-cart-pulse' : ''}
                `}
              >
                <ShoppingBagIcon className="h-6 w-6 text-[var(--primary-color,#6366f1)]" aria-hidden="true" />
              </div>
              {/* Item Count Badge */}
              <span
                className={`
                  absolute -top-1 -right-1
                  flex items-center justify-center
                  min-w-[22px] h-[22px] px-1.5
                  bg-[var(--primary-color,#6366f1)] text-white
                  text-xs font-bold
                  rounded-full
                  shadow-sm
                  transition-transform duration-300
                  ${isPulsing ? 'animate-badge-pulse' : ''}
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
              onClick={onOpenCart}
              className="
                flex items-center gap-1
                px-4 py-2.5 min-h-[44px]
                bg-[var(--primary-color,#6366f1)] text-white
                font-medium text-sm
                rounded-xl
                hover:opacity-90
                transition-all duration-200
                touch-manipulation
                active:scale-[0.98]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary-color,#6366f1)]
              "
              aria-label={`View cart with ${cartCount} ${cartCount === 1 ? 'item' : 'items'}, ${formatCurrency(cartTotal)} total`}
            >
              View Cart
              <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default FloatingCartSummary;
