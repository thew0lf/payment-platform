'use client';

import { useState } from 'react';
import { useLandingPage } from '@/contexts/landing-page-context';

// ============================================================================
// Types
// ============================================================================

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  sku?: string;
  imageUrl?: string;
  inStock?: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  imageUrl?: string;
  images?: string[];
  variants?: ProductVariant[];
  inStock?: boolean;
  badge?: string;
}

interface ProductSelectionContent {
  title?: string;
  subtitle?: string;
  products: Product[];
  layout?: 'grid' | 'list' | 'cards';
  columns?: 2 | 3 | 4;
  showPrices?: boolean;
  showDescription?: boolean;
  showAddToCart?: boolean;
  allowQuantity?: boolean;
}

interface ProductSelectionStyles {
  backgroundColor?: string;
  textColor?: string;
  cardBackgroundColor?: string;
  paddingTop?: string;
  paddingBottom?: string;
}

interface ProductSelectionSectionProps {
  content: ProductSelectionContent | Record<string, unknown>;
  styles?: ProductSelectionStyles;
}

// ============================================================================
// Product Card Component
// ============================================================================

interface ProductCardProps {
  product: Product;
  showPrices: boolean;
  showDescription: boolean;
  showAddToCart: boolean;
  allowQuantity: boolean;
  cardBackgroundColor?: string;
  onAddToCart: (product: Product, quantity: number, variantId?: string) => void;
}

function ProductCard({
  product,
  showPrices,
  showDescription,
  showAddToCart,
  allowQuantity,
  cardBackgroundColor,
  onAddToCart,
}: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants?.[0]
  );
  const [isAdding, setIsAdding] = useState(false);

  const currentPrice = selectedVariant?.price ?? product.price;
  const compareAtPrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const isOnSale = compareAtPrice && compareAtPrice > currentPrice;
  const inStock = selectedVariant?.inStock ?? product.inStock ?? true;

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await onAddToCart(product, quantity, selectedVariant?.id);
      // Reset quantity after adding
      setQuantity(1);
    } finally {
      setTimeout(() => setIsAdding(false), 500);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <div
      className="group rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col"
      style={{ backgroundColor: cardBackgroundColor || '#ffffff' }}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Badge */}
        {product.badge && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-[var(--lp-primary)] text-white text-xs font-semibold rounded-full">
            {product.badge}
          </span>
        )}

        {/* Sale badge */}
        {isOnSale && !product.badge && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
            Sale
          </span>
        )}

        {/* Out of stock overlay */}
        {!inStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="px-4 py-2 bg-white text-gray-900 font-semibold rounded-lg">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>

        {showDescription && product.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Variants */}
        {product.variants && product.variants.length > 1 && (
          <div className="mb-3">
            <select
              value={selectedVariant?.id || ''}
              onChange={(e) => {
                const variant = product.variants?.find((v) => v.id === e.target.value);
                setSelectedVariant(variant);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--lp-primary)]"
            >
              {product.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                  {showPrices && ` - ${formatPrice(variant.price)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Price */}
        {showPrices && (
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(currentPrice)}
            </span>
            {isOnSale && compareAtPrice && (
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(compareAtPrice)}
              </span>
            )}
          </div>
        )}

        {/* Quantity and Add to Cart */}
        {showAddToCart && inStock && (
          <div className="mt-auto pt-2">
            {allowQuantity && (
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 touch-manipulation"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 touch-manipulation"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAdding}
              className={`
                w-full py-3 min-h-[44px]
                bg-[var(--lp-primary)] text-white
                font-semibold rounded-lg
                transition-all duration-200
                touch-manipulation active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isAdding ? 'scale-95' : 'hover:opacity-90'}
              `}
            >
              {isAdding ? 'Added!' : 'Add to Cart'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ProductSelectionSection - Display products with add to cart functionality
 *
 * Supports:
 * - Grid or list layouts
 * - Product variants
 * - Quantity selection
 * - Sale badges and pricing
 */
export function ProductSelectionSection({
  content,
  styles,
}: ProductSelectionSectionProps) {
  const { addToCart, openCartDrawer } = useLandingPage();

  const {
    title,
    subtitle,
    products = [],
    layout = 'grid',
    columns = 3,
    showPrices = true,
    showDescription = true,
    showAddToCart = true,
    allowQuantity = true,
  } = content as ProductSelectionContent;

  // Column classes based on count
  const columnClasses = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  };

  const handleAddToCart = async (
    product: Product,
    quantity: number,
    variantId?: string
  ) => {
    const variant = product.variants?.find((v) => v.id === variantId);
    const price = variant?.price ?? product.price;
    const imageUrl = variant?.imageUrl ?? product.imageUrl;
    const name = variant ? `${product.name} - ${variant.name}` : product.name;

    // Use the landing page context addToCart signature
    await addToCart(product.id, quantity, variantId, {
      price,
      name,
      imageUrl,
    });

    // Open cart drawer after adding
    openCartDrawer();
  };

  if (products.length === 0) {
    return null;
  }

  return (
    <div
      className="py-16 sm:py-24"
      style={{
        backgroundColor: styles?.backgroundColor || 'transparent',
        color: styles?.textColor || 'inherit',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        {(title || subtitle) && (
          <div className="text-center mb-12 sm:mb-16">
            {title && (
              <h2
                className="text-3xl sm:text-4xl font-bold mb-4"
                style={{ fontFamily: 'var(--lp-heading-font), system-ui, sans-serif' }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Products grid */}
        <div className={`grid grid-cols-1 ${columnClasses[columns]} gap-6`}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              showPrices={showPrices}
              showDescription={showDescription}
              showAddToCart={showAddToCart}
              allowQuantity={allowQuantity}
              cardBackgroundColor={styles?.cardBackgroundColor}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProductSelectionSection;
