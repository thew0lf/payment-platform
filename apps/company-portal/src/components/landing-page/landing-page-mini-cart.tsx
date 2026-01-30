'use client';

import { useState, useRef, useEffect } from 'react';
import { useLandingPage } from '@/contexts/landing-page-context';

// ============================================================================
// Types
// ============================================================================

// (No additional types needed - using context types)

// ============================================================================
// Main Component
// ============================================================================

/**
 * LandingPageMiniCart - Compact cart button for landing page headers
 *
 * Features:
 * - Shopping cart icon with item count badge
 * - Badge hidden when cart is empty
 * - Hover preview on desktop showing cart items
 * - 44px minimum touch target for accessibility
 *
 * Uses the LandingPageContext instead of FunnelContext
 */
export function LandingPageMiniCart() {
  const { localCart, cartCount, cartTotal, openCartDrawer } = useLandingPage();
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    // Only show preview on desktop and when cart has items
    if (cartCount > 0 && window.matchMedia('(min-width: 768px)').matches) {
      hoverTimeoutRef.current = setTimeout(() => {
        setShowPreview(true);
      }, 200);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowPreview(false);
  };

  const handleClick = () => {
    setShowPreview(false);
    openCartDrawer();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Format item count for aria-label
  const ariaLabel =
    cartCount === 0
      ? 'Shopping cart, empty'
      : cartCount === 1
        ? 'Shopping cart, 1 item'
        : `Shopping cart, ${cartCount} items`;

  // Get first 3 items for preview
  const previewItems = localCart.slice(0, 3);
  const remainingCount = localCart.length - 3;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={showPreview}
        className="
          relative flex items-center justify-center
          min-h-[44px] min-w-[44px]
          p-2 rounded-lg
          bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700
          hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600
          transition-colors duration-150
          touch-manipulation
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-primary)] focus-visible:ring-offset-2
        "
      >
        <svg
          className="h-6 w-6 text-gray-600 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>

        {/* Item count badge - hidden when 0 */}
        {cartCount > 0 && (
          <span
            className="
              absolute -top-1 -right-1
              flex items-center justify-center
              min-w-[20px] h-5 px-1.5
              bg-[var(--lp-primary,#667eea)] text-white
              text-xs font-semibold
              rounded-full
              shadow-sm
            "
            aria-hidden="true"
          >
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </button>

      {/* Hover preview - desktop only */}
      {showPreview && cartCount > 0 && (
        <>
          {/* Invisible bridge to prevent gap-caused close */}
          <div className="absolute top-full left-0 right-0 h-2" />

          <div
            role="tooltip"
            className="
              absolute right-0 top-full mt-2
              w-72 max-w-[calc(100vw-2rem)]
              bg-white dark:bg-gray-800 rounded-xl shadow-xl
              border border-gray-200 dark:border-gray-700
              z-50
              animate-in fade-in-0 zoom-in-95
              duration-150
            "
          >
            {/* Preview header */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Your Cart ({cartCount} {cartCount === 1 ? 'item' : 'items'})
              </h3>
            </div>

            {/* Preview items */}
            <div className="py-2">
              {previewItems.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId || ''}`}
                  className="px-4 py-2 flex items-center gap-3"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-10 h-10 rounded-md object-cover bg-gray-100 dark:bg-gray-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-gray-400 dark:text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      x{item.quantity} - {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}

              {remainingCount > 0 && (
                <div className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400">
                  +{remainingCount} more
                </div>
              )}
            </div>

            {/* Preview footer */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatPrice(cartTotal)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClick}
                className="
                  w-full py-2 px-4
                  bg-[var(--lp-primary,#667eea)] text-white
                  text-sm font-medium
                  rounded-lg
                  hover:opacity-90
                  transition-opacity
                  min-h-[44px]
                  touch-manipulation
                "
              >
                View Cart
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default LandingPageMiniCart;
