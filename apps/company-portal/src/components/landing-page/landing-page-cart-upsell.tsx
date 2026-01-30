'use client';

import React, { useMemo } from 'react';
import { useLandingPage } from '@/contexts/landing-page-context';

// ============================================================================
// Types
// ============================================================================

export interface UpsellProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  description?: string;
}

export interface CartUpsellProps {
  /** Products to show as upsell recommendations */
  products: UpsellProduct[];
  /** Maximum number of products to display (default: 3) */
  maxProducts?: number;
  /** Title for the upsell section (default: "Complete your order") */
  title?: string;
  /** Subtitle/description (default: "Ships together - one delivery") */
  subtitle?: string;
  /** Whether to show discount percentage */
  showDiscount?: boolean;
  /** Callback when product is added */
  onProductAdd?: (product: UpsellProduct) => void;
  /** Currency symbol (default: $) */
  currencySymbol?: string;
  /** Optional className */
  className?: string;
}

// ============================================================================
// Cart Upsell Component
// ============================================================================

/**
 * CartUpsell - In-cart product recommendations
 *
 * Features:
 * - Displays complementary products in cart drawer
 * - One-click add to cart
 * - Discount display (original vs sale price)
 * - Responsive horizontal scroll on mobile
 * - Analytics tracking on add
 */
export function CartUpsell({
  products,
  maxProducts = 3,
  title = 'Complete your order',
  subtitle = 'Ships together - one delivery',
  showDiscount = true,
  onProductAdd,
  currencySymbol = '$',
  className = '',
}: CartUpsellProps) {
  const { addToCart, localCart, trackEvent } = useLandingPage();

  // Filter out products already in cart (with null guards)
  const cartProductIds = useMemo(
    () => new Set((localCart ?? []).map((item) => item.productId)),
    [localCart]
  );

  const availableProducts = useMemo(
    () => (products ?? []).filter((p) => !cartProductIds.has(p.id)).slice(0, maxProducts),
    [products, cartProductIds, maxProducts]
  );

  // Don't render if no products to show
  if (availableProducts.length === 0) {
    return null;
  }

  const handleAddToCart = async (product: UpsellProduct) => {
    try {
      await addToCart(
        product.id,
        1,
        undefined,
        { price: product.price, name: product.name, imageUrl: product.imageUrl }
      );

      // Track upsell conversion
      trackEvent('UPSELL_ADDED', {
        productId: product.id,
        productName: product.name,
        price: product.price,
        source: 'cart_drawer',
      });

      onProductAdd?.(product);
    } catch (error) {
      console.error('Failed to add upsell product:', error);
    }
  };

  const formatPrice = (price: number): string => {
    return `${currencySymbol}${price.toFixed(2)}`;
  };

  const calculateDiscount = (original: number, current: number): number => {
    return Math.round(((original - current) / original) * 100);
  };

  return (
    <section
      className={`border-t border-gray-200 pt-4 ${className}`}
      aria-labelledby="cart-upsell-heading"
    >
      <h3 id="cart-upsell-heading" className="text-sm font-medium text-gray-900 mb-1">
        {title}
      </h3>
      {subtitle && <p className="text-xs text-gray-500 mb-3">{subtitle}</p>}

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {availableProducts.map((product) => (
          <article
            key={product.id}
            className="flex-shrink-0 w-[140px] bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors"
            aria-label={`Recommended product: ${product.name}`}
          >
            {/* Product Image */}
            {product.imageUrl ? (
              <div className="aspect-square w-full mb-2 rounded-md overflow-hidden bg-white">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="aspect-square w-full mb-2 rounded-md bg-gray-200 flex items-center justify-center">
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
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}

            {/* Product Info */}
            <h4 className="text-xs font-medium text-gray-900 truncate" title={product.name}>
              {product.name}
            </h4>

            {/* Price */}
            <div className="flex items-center gap-1 mt-1">
              <span className="text-sm font-semibold text-gray-900">
                {formatPrice(product.price)}
              </span>
              {showDiscount && product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span className="text-xs text-gray-400 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                  <span className="text-xs font-medium text-green-600">
                    -{calculateDiscount(product.originalPrice, product.price)}%
                  </span>
                </>
              )}
            </div>

            {/* Add Button */}
            <button
              onClick={() => handleAddToCart(product)}
              className="mt-2 w-full py-2 px-2 text-xs font-medium text-white bg-[var(--lp-primary,#667eea)]
                         hover:opacity-90 rounded-md transition-colors
                         min-h-[44px] touch-manipulation active:scale-[0.98]
                         focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--lp-primary,#667eea)]"
              aria-label={`Add ${product.name} to cart`}
            >
              Add to Order
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default CartUpsell;
