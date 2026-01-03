'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingCartIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  TagIcon,
  ShieldCheckIcon,
  TruckIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { useFunnelOptional } from '@/contexts/funnel-context';
import { SelectedProduct } from '@/lib/api';

const LOCAL_CART_KEY = 'standalone_cart';

interface DiscountForm {
  code: string;
  loading: boolean;
  error: string | null;
  applied: boolean;
}

/**
 * Cart page that works both inside funnel context and as standalone page.
 * When inside a funnel, uses FunnelContext for cart state.
 * When standalone, uses localStorage for cart persistence.
 */
export default function CartPage() {
  const router = useRouter();
  const funnelContext = useFunnelOptional();

  // Local state for standalone mode
  const [localCart, setLocalCart] = useState<SelectedProduct[]>([]);
  const [mounted, setMounted] = useState(false);

  const [discount, setDiscount] = useState<DiscountForm>({
    code: '',
    loading: false,
    error: null,
    applied: false,
  });

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Determine cart source - use funnel context if available, otherwise local state
  const cart = funnelContext?.cart ?? localCart;
  const funnel = funnelContext?.funnel ?? null;

  // Calculate totals
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Load local cart from localStorage on mount (standalone mode only)
  useEffect(() => {
    setMounted(true);
    if (!funnelContext) {
      try {
        const stored = localStorage.getItem(LOCAL_CART_KEY);
        if (stored) {
          setLocalCart(JSON.parse(stored));
        }
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [funnelContext]);

  // Persist local cart to localStorage (standalone mode only)
  useEffect(() => {
    if (mounted && !funnelContext && localCart.length >= 0) {
      try {
        localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(localCart));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [mounted, localCart, funnelContext]);

  // Update cart item - use funnel context if available, otherwise local state
  const updateCartItem = useCallback(
    (productId: string, quantity: number) => {
      if (funnelContext) {
        funnelContext.updateCartItem(productId, quantity);
      } else {
        setLocalCart((prev) =>
          prev
            .map((item) =>
              item.productId === productId ? { ...item, quantity } : item
            )
            .filter((item) => item.quantity > 0)
        );
      }
    },
    [funnelContext]
  );

  // Remove from cart - use funnel context if available, otherwise local state
  const removeFromCart = useCallback(
    (productId: string) => {
      if (funnelContext) {
        funnelContext.removeFromCart(productId);
      } else {
        setLocalCart((prev) => prev.filter((item) => item.productId !== productId));
      }
    },
    [funnelContext]
  );

  // Clear cart - use funnel context if available, otherwise local state
  const clearCart = useCallback(() => {
    if (funnelContext) {
      funnelContext.clearCart();
    } else {
      setLocalCart([]);
    }
  }, [funnelContext]);

  const handleClearCart = () => {
    clearCart();
    setShowClearConfirm(false);
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    const item = cart.find((i) => i.productId === productId);
    if (item) {
      const newQuantity = item.quantity + delta;
      if (newQuantity > 0) {
        updateCartItem(productId, newQuantity);
      } else {
        removeFromCart(productId);
      }
    }
  };

  const handleApplyDiscount = async () => {
    if (!discount.code.trim()) return;

    setDiscount((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Use funnel context discount if available
      if (funnelContext?.applyDiscountCode) {
        const success = await funnelContext.applyDiscountCode(discount.code);
        if (success) {
          setDiscount((prev) => ({ ...prev, loading: false, applied: true }));
        } else {
          setDiscount((prev) => ({
            ...prev,
            loading: false,
            error: 'Invalid discount code',
          }));
        }
      } else {
        // Standalone mode - just simulate for now
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setDiscount((prev) => ({ ...prev, loading: false, applied: true }));
      }
    } catch {
      setDiscount((prev) => ({
        ...prev,
        loading: false,
        error: 'Invalid discount code',
      }));
    }
  };

  const handleCheckout = () => {
    if (funnel) {
      // Navigate to funnel checkout stage
      router.push(`/f/${funnel.slug}?stage=checkout`);
    } else {
      // Standalone checkout
      router.push('/checkout');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <ShoppingCartIcon className="h-12 w-12 text-gray-300" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href={funnel ? `/f/${funnel.slug}` : '/'}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Continue Shopping</span>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Your Cart</h1>
          <div className="w-32" /> {/* Spacer for alignment */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {cart.length === 0 ? (
          /* Empty Cart State */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <ShoppingCartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Your cart is waiting for something great
            </h2>
            <p className="text-gray-500 mb-6">
              Browse our collection and add your favorites. Your perfect picks are just a click away!
            </p>
            <Link
              href={funnel ? `/f/${funnel.slug}` : '/'}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary-color,#0ea5e9)] text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {cartCount} {cartCount === 1 ? 'Item' : 'Items'}
                </h2>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors min-h-[44px] px-3 touch-manipulation"
                >
                  Clear Cart
                </button>
              </div>

              {cart.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId || ''}`}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <ShoppingCartIcon className="h-8 w-8 text-gray-300" />
                      </div>
                    )}

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-gray-900 line-clamp-2">
                            {item.name}
                          </h3>
                          {item.variantId && (
                            <p className="text-sm text-gray-500 mt-1">
                              Variant: {item.variantId}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors touch-manipulation"
                          aria-label="Remove item"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleQuantityChange(item.productId, -1)}
                            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors touch-manipulation"
                            aria-label="Decrease quantity"
                          >
                            <MinusIcon className="h-4 w-4" />
                          </button>
                          <span className="w-10 text-center font-medium text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.productId, 1)}
                            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors touch-manipulation"
                            aria-label="Increase quantity"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-sm text-gray-500">
                              {formatCurrency(item.price)} each
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Order Summary
                </h3>

                {/* Discount Code */}
                <div className="mb-6">
                  <label
                    htmlFor="discount"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Discount Code
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        id="discount"
                        type="text"
                        placeholder="Enter code"
                        value={discount.code}
                        onChange={(e) =>
                          setDiscount((prev) => ({
                            ...prev,
                            code: e.target.value.toUpperCase(),
                            error: null,
                          }))
                        }
                        disabled={discount.applied}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color,#0ea5e9)]/50 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                    <button
                      onClick={handleApplyDiscount}
                      disabled={discount.loading || discount.applied || !discount.code.trim()}
                      className="px-4 py-2 bg-gray-100 text-gray-700 font-medium text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {discount.loading
                        ? 'Applying...'
                        : discount.applied
                        ? 'Applied'
                        : 'Apply'}
                    </button>
                  </div>
                  {discount.error && (
                    <p className="text-sm text-red-500 mt-1">{discount.error}</p>
                  )}
                  {discount.applied && (
                    <p className="text-sm text-green-600 mt-1">
                      Discount applied successfully!
                    </p>
                  )}
                </div>

                {/* Totals */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(cartTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-gray-500">Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-500">Calculated at checkout</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-lg text-gray-900">
                        {formatCurrency(cartTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  className="w-full py-3 bg-[var(--primary-color,#0ea5e9)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  Proceed to Checkout
                  <ArrowRightIcon className="h-4 w-4" />
                </button>

                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center text-center">
                      <ShieldCheckIcon className="h-6 w-6 text-green-600 mb-1" />
                      <span className="text-xs text-gray-600">Secure Checkout</span>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <TruckIcon className="h-6 w-6 text-blue-600 mb-1" />
                      <span className="text-xs text-gray-600">Fast Shipping</span>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <LockClosedIcon className="h-6 w-6 text-purple-600 mb-1" />
                      <span className="text-xs text-gray-600">Privacy Protected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Checkout Bar */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-inset-bottom">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </span>
            <span className="font-bold text-lg text-gray-900">
              {formatCurrency(cartTotal)}
            </span>
          </div>
          <button
            onClick={handleCheckout}
            className="w-full py-3 bg-[var(--primary-color,#0ea5e9)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Checkout
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Clear Cart Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowClearConfirm(false)}
          />
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-[calc(100%-2rem)] shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Clear your cart?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              This will remove all items from your cart. Don&apos;t worry, you can always add them back!
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] touch-manipulation"
              >
                Keep Shopping
              </button>
              <button
                onClick={handleClearCart}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors min-h-[44px] touch-manipulation"
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
