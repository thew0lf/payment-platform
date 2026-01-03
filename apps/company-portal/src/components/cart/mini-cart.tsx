'use client';

import { useState, useRef, useEffect } from 'react';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useFunnel } from '@/contexts/funnel-context';

export interface MiniCartProps {
  /** Callback to open the cart drawer */
  onOpenDrawer: () => void;
}

/**
 * MiniCart - Compact cart button with item count badge for headers
 *
 * Features:
 * - Shopping cart icon with item count badge
 * - Badge hidden when cart is empty (count = 0)
 * - Optional hover preview on desktop (shows first few items)
 * - 44px minimum touch target for mobile accessibility
 * - Accessible button with aria-label
 *
 * @example
 * ```tsx
 * <MiniCart onOpenDrawer={() => setIsDrawerOpen(true)} />
 * ```
 */
export function MiniCart({ onOpenDrawer }: MiniCartProps) {
  const { cart, cartCount, cartTotal } = useFunnel();
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
      }, 200); // Small delay to prevent accidental triggers
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
    onOpenDrawer();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  // Format item count for aria-label
  const ariaLabel = cartCount === 0
    ? 'Shopping cart, empty'
    : cartCount === 1
      ? 'Shopping cart, 1 item'
      : `Shopping cart, ${cartCount} items`;

  // Get first 3 items for preview
  const previewItems = cart.slice(0, 3);
  const remainingCount = cart.length - 3;

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
          hover:bg-gray-100 active:bg-gray-200
          transition-colors duration-150
          touch-manipulation
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-color)] focus-visible:ring-offset-2
        "
      >
        <ShoppingCartIcon className="h-6 w-6 text-gray-600" aria-hidden="true" />

        {/* Item count badge - hidden when 0 */}
        {cartCount > 0 && (
          <span
            className="
              absolute -top-1 -right-1
              flex items-center justify-center
              min-w-[20px] h-5 px-1.5
              bg-[var(--primary-color)] text-white
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
              bg-white rounded-xl shadow-xl
              border border-gray-200
              z-50
              animate-in fade-in-0 zoom-in-95
              duration-150
            "
          >
            {/* Preview header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">
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
                      className="w-10 h-10 rounded-md object-cover bg-gray-100"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center">
                      <ShoppingCartIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      x{item.quantity} - ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}

              {remainingCount > 0 && (
                <div className="px-4 py-2 text-xs text-gray-600">
                  +{remainingCount} more
                </div>
              )}
            </div>

            {/* Preview footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-sm font-semibold text-gray-900">
                  ${cartTotal.toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClick}
                className="
                  w-full py-2 px-4
                  bg-[var(--primary-color)] text-white
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

export default MiniCart;
