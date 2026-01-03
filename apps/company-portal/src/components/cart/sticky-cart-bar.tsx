'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ShoppingCartIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useFunnel } from '@/contexts/funnel-context';

// ============================================================================
// Types
// ============================================================================

export interface StickyCartBarProps {
  /** Callback to proceed to checkout */
  onCheckout: () => void;
  /** Callback to open the full cart drawer */
  onOpenCart: () => void;
  /** Optional className for custom styling */
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * StickyCartBar - Mobile sticky cart bar at bottom of screen
 *
 * A compact, fixed bar at the bottom of the viewport (mobile only) showing
 * cart summary with a checkout CTA. Features swipe-up gesture to reveal
 * a mini cart preview.
 *
 * **Design Specifications:**
 * - Fixed bottom position (mobile only, hidden on md+)
 * - Shows: item count, subtotal, "Checkout" CTA
 * - 44px minimum touch target on all buttons
 * - Slides up when cart has items
 * - Swipe up reveals mini cart preview
 *
 * **Accessibility Notes:**
 * - All interactive elements meet 44px minimum touch target
 * - Proper ARIA labels and roles
 * - Focus management for expanded state
 * - Screen reader announcements for cart updates
 *
 * @example
 * ```tsx
 * <StickyCartBar
 *   onCheckout={() => nextStage()}
 *   onOpenCart={() => setIsDrawerOpen(true)}
 * />
 * ```
 */
export function StickyCartBar({ onCheckout, onOpenCart, className = '' }: StickyCartBarProps) {
  const { cart, cartTotal, cartCount, updateCartItem, removeFromCart } = useFunnel();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [prevCartCount, setPrevCartCount] = useState(0);

  // Touch gesture handling
  const barRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

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

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return;

    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchStartY.current - touchEndY;
    const deltaTime = Date.now() - touchStartTime.current;

    // Swipe up detection: at least 50px up swipe in under 300ms
    if (deltaY > 50 && deltaTime < 300) {
      setIsExpanded(true);
    }
    // Swipe down detection: at least 50px down swipe
    else if (deltaY < -50 && deltaTime < 300 && isExpanded) {
      setIsExpanded(false);
    }

    touchStartY.current = null;
  }, [isExpanded]);

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
  const previewItems = cart.slice(0, 3);
  const remainingCount = cart.length - 3;

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

      {/* Sticky Cart Bar - Mobile only (hidden on md+) */}
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
            bg-white border-t border-gray-200 shadow-xl
            transition-all duration-300 ease-out
            ${isExpanded ? 'rounded-t-2xl' : ''}
          `}
        >
          {/* Drag Handle / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="
              w-full flex items-center justify-center
              py-3 min-h-[44px]
              touch-manipulation
              focus:outline-none focus-visible:bg-gray-100
            "
            aria-label={isExpanded ? 'Collapse cart preview' : 'Expand cart preview'}
            aria-expanded={isExpanded}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </button>

          {/* Mini Cart Preview (Expanded State) */}
          <div
            className={`
              overflow-hidden transition-all duration-300 ease-out
              ${isExpanded ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}
            `}
            aria-hidden={!isExpanded}
          >
            <div className="px-4 pb-2 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Your Cart</h3>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 text-gray-400 hover:text-gray-600"
                  aria-label="Close cart preview"
                >
                  <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* Preview Items */}
              <div className="space-y-2 max-h-40 overflow-y-auto overscroll-contain">
                {previewItems.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId || ''}`}
                    className="flex items-center gap-3 py-2"
                  >
                    {/* Thumbnail */}
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <ShoppingCartIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </div>
                    )}

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        x{item.quantity} - {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>

                    {/* Quick Remove */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}

                {remainingCount > 0 && (
                  <button
                    type="button"
                    onClick={onOpenCart}
                    className="w-full py-2 text-sm text-[var(--primary-color,#6366f1)] font-medium text-center hover:underline min-h-[44px] touch-manipulation"
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
              onClick={onOpenCart}
              className="relative p-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              aria-label={`View cart with ${cartCount} items`}
            >
              <ShoppingCartIcon className="h-6 w-6 text-gray-600" aria-hidden="true" />
              <span
                className={`
                  absolute -top-0.5 -right-0.5
                  flex items-center justify-center
                  min-w-[20px] h-5 px-1.5
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
            </button>

            {/* Total */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Subtotal</p>
              <p className="text-base font-semibold text-gray-900">
                {formatCurrency(cartTotal)}
              </p>
            </div>

            {/* Expand indicator */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 touch-manipulation"
              aria-label={isExpanded ? 'Hide cart preview' : 'Show cart preview'}
            >
              <ChevronUpIcon
                className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {/* Checkout Button */}
            <button
              type="button"
              onClick={onCheckout}
              className="
                px-5 py-3 min-h-[48px]
                bg-[var(--primary-color,#6366f1)] text-white
                font-semibold text-sm
                rounded-xl
                hover:opacity-90
                transition-all duration-200
                touch-manipulation
                active:scale-[0.98]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary-color,#6366f1)]
              "
              aria-label={`Checkout with ${cartCount} ${cartCount === 1 ? 'item' : 'items'} for ${formatCurrency(cartTotal)}`}
            >
              Checkout
            </button>
          </div>

          {/* Safe area padding for iOS devices */}
          <div className="h-[env(safe-area-inset-bottom,0px)] bg-white" />
        </div>
      </div>
    </>
  );
}

export default StickyCartBar;
