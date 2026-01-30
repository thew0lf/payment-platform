'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useLandingPage } from '@/contexts/landing-page-context';

// ============================================================================
// Types
// ============================================================================

export interface LandingPageStickyCartBarProps {
  /** Optional className for custom styling */
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * LandingPageStickyCartBar - Mobile sticky cart bar for landing pages
 *
 * Features:
 * - Fixed bottom position (mobile only)
 * - Shows item count, subtotal, checkout CTA
 * - Swipe up to expand and see cart preview
 * - Uses LandingPageContext
 */
export function LandingPageStickyCartBar({ className = '' }: LandingPageStickyCartBarProps) {
  const { localCart, cartTotal, cartCount, openCartDrawer, removeFromCart } = useLandingPage();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [prevCartCount, setPrevCartCount] = useState(0);

  // Touch gesture handling
  const barRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

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
      setIsExpanded(false);
      const hideTimeout = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(hideTimeout);
    }
  }, [cartCount]);

  // Touch event handlers for swipe gesture
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return;

      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY.current - touchEndY;
      const deltaTime = Date.now() - touchStartTime.current;

      // Swipe up detection
      if (deltaY > 50 && deltaTime < 300) {
        setIsExpanded(true);
      }
      // Swipe down detection
      else if (deltaY < -50 && deltaTime < 300 && isExpanded) {
        setIsExpanded(false);
      }

      touchStartY.current = null;
    },
    [isExpanded]
  );

  // Handle keyboard close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isExpanded]);

  // Close expanded view when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isExpanded && barRef.current && !barRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  if (!shouldRender) {
    return null;
  }

  // Get first 3 items for preview
  const previewItems = localCart.slice(0, 3);
  const remainingCount = localCart.length - 3;

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
          ? `Cart: ${cartCount} ${cartCount === 1 ? 'item' : 'items'}, ${formatCurrency(cartTotal)}`
          : 'Cart is empty'}
      </div>

      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40 transition-opacity duration-200"
          onClick={() => setIsExpanded(false)}
          aria-hidden="true"
        />
      )}

      {/* Sticky Cart Bar - Mobile only */}
      <div
        ref={barRef}
        className={`
          md:hidden
          fixed left-0 right-0 bottom-0 z-50
          transition-transform duration-300 ease-out
          ${isVisible ? 'translate-y-0' : 'translate-y-full'}
          ${className}
        `}
        role="region"
        aria-label="Shopping cart"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`
            bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-xl
            transition-all duration-300 ease-out
            ${isExpanded ? 'rounded-t-2xl' : ''}
          `}
        >
          {/* Drag Handle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="
              w-full flex items-center justify-center
              py-3 min-h-[44px]
              touch-manipulation
              focus:outline-none focus-visible:bg-gray-100 dark:focus-visible:bg-gray-800
            "
            aria-label={isExpanded ? 'Collapse cart preview' : 'Expand cart preview'}
            aria-expanded={isExpanded}
          >
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </button>

          {/* Mini Cart Preview (Expanded State) */}
          <div
            className={`
              overflow-hidden transition-all duration-300 ease-out
              ${isExpanded ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}
            `}
            aria-hidden={!isExpanded}
          >
            <div className="px-4 pb-2 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Your Cart</h3>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close cart preview"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Preview Items */}
              <div className="space-y-2 max-h-40 overflow-y-auto overscroll-contain">
                {previewItems.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId || ''}`}
                    className="flex items-center gap-3 py-2"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover bg-gray-100 dark:bg-gray-700 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        x{item.quantity} - {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                {remainingCount > 0 && (
                  <button
                    type="button"
                    onClick={openCartDrawer}
                    className="w-full py-2 text-sm text-[var(--lp-primary,#667eea)] font-medium text-center hover:underline min-h-[44px] touch-manipulation"
                  >
                    +{remainingCount} more item{remainingCount > 1 ? 's' : ''} - View All
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Bar Content */}
          <div className="px-4 py-3 flex items-center gap-3">
            {/* Cart Icon with Badge */}
            <button
              type="button"
              onClick={openCartDrawer}
              className="relative p-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              aria-label={`View cart with ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
            >
              <svg className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span
                className={`
                  absolute -top-0.5 -right-0.5
                  flex items-center justify-center
                  min-w-[20px] h-5 px-1.5
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
            </button>

            {/* Total */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Subtotal</p>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(cartTotal)}
              </p>
            </div>

            {/* Expand indicator */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 dark:text-gray-500 touch-manipulation"
              aria-label={isExpanded ? 'Hide cart preview' : 'Show cart preview'}
            >
              <svg
                className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>

            {/* Checkout Button */}
            <button
              type="button"
              onClick={openCartDrawer}
              className="
                px-5 py-3 min-h-[48px]
                bg-[var(--lp-primary,#667eea)] text-white
                font-semibold text-sm
                rounded-xl
                hover:opacity-90
                transition-all duration-200
                touch-manipulation
                active:scale-[0.98]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lp-primary,#667eea)]
              "
              aria-label="Proceed to checkout"
            >
              Checkout
            </button>
          </div>

          {/* Safe area padding for iOS devices */}
          <div className="h-[env(safe-area-inset-bottom,0px)] bg-white dark:bg-gray-900" />
        </div>
      </div>
    </>
  );
}

export default LandingPageStickyCartBar;
