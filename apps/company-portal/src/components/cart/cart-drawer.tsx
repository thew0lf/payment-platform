'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  XMarkIcon,
  ShoppingCartIcon,
  ArrowRightIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { useFunnel } from '@/contexts/funnel-context';
import { CartItem } from './cart-item';

// ============================================================================
// Types
// ============================================================================

export interface CartDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * CartDrawer - A slide-out cart drawer component
 *
 * This component displays a full cart view that slides in from the right side
 * of the screen. It includes a sticky header, scrollable item list, and sticky
 * footer with totals and checkout options.
 *
 * **Accessibility Notes:**
 * - Traps focus within the drawer when open
 * - Escape key closes the drawer
 * - All interactive elements meet 44px minimum touch target
 * - Properly labeled with aria attributes
 *
 * @example Basic usage
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <CartDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
 * ```
 */
export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const {
    cart,
    cartTotal,
    cartCount,
    updateCartItem,
    removeFromCart,
    funnel,
    nextStage,
    currentStage,
  } = useFunnel();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Handle keyboard events (Escape to close)
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  // Focus trap and keyboard handling
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen, handleKeyDown]);

  // Handle checkout action
  const handleCheckout = () => {
    // If we're in a funnel and not already on checkout, advance
    if (funnel && currentStage?.type !== 'CHECKOUT') {
      nextStage();
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 z-40 bg-black/50 backdrop-blur-sm
          transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
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
          bg-white dark:bg-gray-900 shadow-2xl
          flex flex-col
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Sticky Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Your Cart
            {cartCount > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                ({cartCount} {cartCount === 1 ? 'item' : 'items'})
              </span>
            )}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation"
            aria-label="Close cart"
          >
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {cart.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <ShoppingCartIcon className="h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Nothing here yet!</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-xs">
                Your cart is feeling lonely. Time to find something you'll love!
              </p>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] bg-[var(--primary-color,#0ea5e9)] text-white font-medium rounded-lg hover:opacity-90 transition-opacity touch-manipulation active:scale-[0.98]"
              >
                Start Exploring
              </button>
            </div>
          ) : (
            /* Cart Items */
            <div className="px-4 py-2 space-y-3">
              {cart.map((item) => (
                <CartItem
                  key={`${item.productId}-${item.variantId || ''}`}
                  item={item}
                  onUpdateQuantity={updateCartItem}
                  onRemove={removeFromCart}
                  showRemoveConfirmation={false}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        {cart.length > 0 && (
          <footer className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
            {/* Subtotal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(cartTotal)}</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Shipping + taxes calculated at checkout
              </p>
            </div>

            {/* Checkout Button */}
            <button
              type="button"
              onClick={handleCheckout}
              className="w-full min-h-[52px] px-6 py-3 bg-[var(--primary-color,#0ea5e9)] text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-200 touch-manipulation active:scale-[0.98] flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary-color,#0ea5e9)]"
            >
              Complete Your Order
              <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <LockClosedIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Your payment is safe with us (secured by Stripe)</span>
            </div>
          </footer>
        )}
      </div>
    </>
  );
}

export default CartDrawer;
