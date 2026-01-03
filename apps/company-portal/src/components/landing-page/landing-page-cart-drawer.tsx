'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useLandingPage } from '@/contexts/landing-page-context';

// ============================================================================
// Types
// ============================================================================

// (Uses context types)

// ============================================================================
// Cart Item Component
// ============================================================================

interface CartItemRowProps {
  item: {
    productId: string;
    variantId?: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
  };
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div className="flex gap-4 p-4 bg-white rounded-lg border border-gray-100">
      {/* Image */}
      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
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
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
        <p className="text-sm text-gray-600 mt-1">
          {formatPrice(item.price)} each
        </p>

        {/* Quantity controls */}
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.quantity - 1)}
            disabled={item.quantity <= 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            aria-label="Decrease quantity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="w-8 text-center font-medium">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.quantity + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 touch-manipulation"
            aria-label="Increase quantity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Price and remove */}
      <div className="flex flex-col items-end justify-between">
        <span className="font-semibold text-gray-900">
          {formatPrice(item.price * item.quantity)}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="p-2 text-gray-400 hover:text-red-600 transition-colors touch-manipulation"
          aria-label={`Remove ${item.name} from cart`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * LandingPageCartDrawer - Slide-out cart drawer for landing pages
 *
 * Features:
 * - Full cart view with items, quantities, and totals
 * - Escape key to close
 * - Focus trap when open
 * - Uses LandingPageContext
 */
export function LandingPageCartDrawer() {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const {
    isCartDrawerOpen,
    closeCartDrawer,
    localCart,
    cartTotal,
    cartCount,
    updateCartItem,
    removeFromCart,
    cart,
  } = useLandingPage();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  // Handle keyboard events (Escape to close)
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isCartDrawerOpen) {
        closeCartDrawer();
      }
    },
    [isCartDrawerOpen, closeCartDrawer]
  );

  // Focus trap and keyboard handling
  useEffect(() => {
    if (isCartDrawerOpen) {
      // Focus the close button when drawer opens
      closeButtonRef.current?.focus();

      // Add keyboard listener
      document.addEventListener('keydown', handleKeyDown);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isCartDrawerOpen, handleKeyDown]);

  // Handle update for an item - find the cart item ID
  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    const cartItem = cart?.items.find((item) => item.productId === productId);
    if (cartItem) {
      await updateCartItem(cartItem.id, quantity);
    }
  };

  // Handle remove for an item - find the cart item ID
  const handleRemove = async (productId: string) => {
    const cartItem = cart?.items.find((item) => item.productId === productId);
    if (cartItem) {
      await removeFromCart(cartItem.id);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 z-40 bg-black/50 backdrop-blur-sm
          transition-opacity duration-300
          ${isCartDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={closeCartDrawer}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`
          fixed top-0 right-0 z-50 h-full
          w-full sm:w-[400px]
          bg-gray-50 shadow-2xl
          flex flex-col
          transition-transform duration-300 ease-out
          ${isCartDrawerOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">
            Your Cart
            {cartCount > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({cartCount} {cartCount === 1 ? 'item' : 'items'})
              </span>
            )}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeCartDrawer}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors touch-manipulation"
            aria-label="Close cart"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {localCart.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-sm text-gray-600 mb-6 max-w-xs">
                Browse our products and add something you love!
              </p>
              <button
                type="button"
                onClick={closeCartDrawer}
                className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] bg-[var(--lp-primary,#667eea)] text-white font-medium rounded-lg hover:opacity-90 transition-opacity touch-manipulation active:scale-[0.98]"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            /* Cart Items */
            <div className="space-y-3">
              {localCart.map((item) => (
                <CartItemRow
                  key={`${item.productId}-${item.variantId || ''}`}
                  item={item}
                  onUpdateQuantity={(qty) => handleUpdateQuantity(item.productId, qty)}
                  onRemove={() => handleRemove(item.productId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {localCart.length > 0 && (
          <footer className="flex-shrink-0 border-t border-gray-200 bg-white p-4 space-y-4">
            {/* Subtotal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-gray-900">{formatPrice(cartTotal)}</span>
              </div>
              <p className="text-xs text-gray-500">
                Shipping + taxes calculated at checkout
              </p>
            </div>

            {/* Checkout Button */}
            <button
              type="button"
              onClick={() => {
                // Could navigate to checkout or trigger checkout modal
                closeCartDrawer();
              }}
              className="w-full min-h-[52px] px-6 py-3 bg-[var(--lp-primary,#667eea)] text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-200 touch-manipulation active:scale-[0.98] flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--lp-primary,#667eea)]"
            >
              Proceed to Checkout
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Secure checkout - your data is protected</span>
            </div>
          </footer>
        )}
      </div>
    </>
  );
}

export default LandingPageCartDrawer;
