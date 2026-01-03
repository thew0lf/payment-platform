'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ShoppingCartIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface UpsellProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  description?: string;
}

export interface CartUpsellProps {
  /** Array of recommended products to display */
  products: UpsellProduct[];
  /** Callback when a product is added to cart */
  onAdd: (productId: string) => void;
  /** Section title (default: "You might also like") */
  title?: string;
  /** Maximum number of products to show (default: 3) */
  maxItems?: number;
  /** Display variant */
  variant?: 'horizontal' | 'vertical' | 'carousel';
  /** Loading state */
  loading?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default currency formatter (USD)
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Calculate discount percentage
 */
const getDiscountPercentage = (price: number, originalPrice: number): number => {
  return Math.round(((originalPrice - price) / originalPrice) * 100);
};

/**
 * Truncate text with ellipsis
 */
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface SkeletonCardProps {
  variant: 'horizontal' | 'vertical' | 'carousel';
}

function SkeletonCard({ variant }: SkeletonCardProps) {
  const isVertical = variant === 'vertical';

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 motion-safe:animate-pulse ${
        isVertical ? 'flex gap-3' : 'flex-shrink-0 w-[200px]'
      }`}
      aria-hidden="true"
    >
      {/* Image skeleton */}
      <div
        className={`bg-gray-200 dark:bg-gray-700 rounded-lg ${
          isVertical ? 'w-20 h-20 flex-shrink-0' : 'w-full h-32 mb-3'
        }`}
      />
      {/* Content skeleton */}
      <div className={isVertical ? 'flex-1 min-w-0' : ''}>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ProductCardProps {
  product: UpsellProduct;
  onAdd: (productId: string) => void;
  variant: 'horizontal' | 'vertical' | 'carousel';
}

function ProductCard({ product, onAdd, variant }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const isVertical = variant === 'vertical';
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercentage = hasDiscount
    ? getDiscountPercentage(product.price, product.originalPrice!)
    : 0;

  const handleAdd = useCallback(async () => {
    setIsAdding(true);
    try {
      await onAdd(product.id);
    } finally {
      // Reset after a brief delay for visual feedback
      setTimeout(() => setIsAdding(false), 300);
    }
  }, [onAdd, product.id]);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 transition-shadow hover:shadow-md ${
        isVertical ? 'flex gap-3' : 'flex-shrink-0 w-[200px]'
      }`}
    >
      {/* Product Image */}
      <div className={`relative ${isVertical ? 'flex-shrink-0' : 'mb-3'}`}>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className={`rounded-lg object-cover bg-gray-100 dark:bg-gray-700 ${
              isVertical ? 'w-20 h-20' : 'w-full h-32'
            }`}
            loading="lazy"
          />
        ) : (
          <div
            className={`rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center ${
              isVertical ? 'w-20 h-20' : 'w-full h-32'
            }`}
          >
            <ShoppingCartIcon
              className="h-8 w-8 text-gray-300 dark:text-gray-500"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
            -{discountPercentage}%
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className={`${isVertical ? 'flex-1 min-w-0 flex flex-col justify-between' : ''}`}>
        <div>
          {/* Product Name */}
          <h4
            className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight"
            title={product.name}
          >
            {truncateText(product.name, isVertical ? 40 : 30)}
          </h4>

          {/* Description (only in vertical variant) */}
          {isVertical && product.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
              {product.description}
            </p>
          )}

          {/* Price */}
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="font-semibold text-sm"
              style={{ color: 'var(--primary-color, #0ea5e9)' }}
            >
              {formatCurrency(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-gray-400 dark:text-gray-500 line-through">
                {formatCurrency(product.originalPrice!)}
              </span>
            )}
          </div>
        </div>

        {/* Add Button */}
        <button
          onClick={handleAdd}
          disabled={isAdding}
          className="w-full mt-2 min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg transition-all touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--primary-color, #0ea5e9)',
            color: 'white',
          }}
          aria-label={`Add ${product.name} to cart`}
        >
          {isAdding ? (
            <span className="flex items-center justify-center gap-1.5">
              <svg
                className="motion-safe:animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Adding...
            </span>
          ) : (
            'Add to Cart'
          )}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * CartUpsell component displays product recommendations in the cart.
 *
 * Features:
 * - Three display variants: horizontal scroll, vertical stack, carousel
 * - Quick add to cart functionality
 * - Discount badge when originalPrice > price
 * - Loading skeleton state
 * - Empty state when no products
 * - Accessible with proper ARIA labels
 * - 44px touch targets
 * - Dark mode support
 */
export function CartUpsell({
  products,
  onAdd,
  title = 'Pairs perfectly with your order',
  maxItems = 3,
  variant = 'horizontal',
  loading = false,
}: CartUpsellProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Limit products to maxItems
  const displayProducts = products.slice(0, maxItems);
  const totalSlides = displayProducts.length;

  // Check scroll position for horizontal variant
  const checkScrollPosition = useCallback(() => {
    if (!scrollContainerRef.current || variant !== 'horizontal') return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, [variant]);

  useEffect(() => {
    checkScrollPosition();
    const container = scrollContainerRef.current;
    if (container && variant === 'horizontal') {
      container.addEventListener('scroll', checkScrollPosition);
      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, [checkScrollPosition, variant, displayProducts.length]);

  // Scroll handlers for horizontal variant
  const scrollLeft = useCallback(() => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
  }, []);

  const scrollRight = useCallback(() => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
  }, []);

  // Carousel navigation
  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  const goToPrevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  }, [totalSlides]);

  const goToNextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === totalSlides - 1 ? 0 : prev + 1));
  }, [totalSlides]);

  // Keyboard navigation for carousel
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (variant !== 'carousel') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevSlide();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextSlide();
      }
    },
    [variant, goToPrevSlide, goToNextSlide]
  );

  // Loading state
  if (loading) {
    return (
      <section aria-label={title} aria-busy="true">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{title}</h3>
        <div
          className={
            variant === 'vertical'
              ? 'space-y-3'
              : variant === 'carousel'
                ? 'relative'
                : 'flex gap-3 overflow-hidden'
          }
        >
          {Array.from({ length: Math.min(maxItems, 3) }).map((_, index) => (
            <SkeletonCard key={index} variant={variant} />
          ))}
        </div>
      </section>
    );
  }

  // Empty state
  if (displayProducts.length === 0) {
    return (
      <section aria-label={title}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{title}</h3>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 text-center">
          <ShoppingCartIcon
            className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2"
            aria-hidden="true"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            We're finding the perfect picks for you!
          </p>
        </div>
      </section>
    );
  }

  // Horizontal variant
  if (variant === 'horizontal') {
    return (
      <section aria-label={title}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{title}</h3>
        <div className="relative">
          {/* Scroll Left Button */}
          {canScrollLeft && (
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation"
              aria-label="Scroll left"
            >
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={onAdd} variant={variant} />
            ))}
          </div>

          {/* Scroll Right Button */}
          {canScrollRight && (
            <button
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation"
              aria-label="Scroll right"
            >
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </section>
    );
  }

  // Vertical variant
  if (variant === 'vertical') {
    return (
      <section aria-label={title}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{title}</h3>
        <div className="space-y-3">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} onAdd={onAdd} variant={variant} />
          ))}
        </div>
      </section>
    );
  }

  // Carousel variant
  return (
    <section aria-label={title}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{title}</h3>
      <div
        className="relative"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Product recommendations carousel"
      >
        {/* Carousel Container */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            aria-live="polite"
          >
            {displayProducts.map((product, index) => (
              <div
                key={product.id}
                className="w-full flex-shrink-0 px-1"
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${totalSlides}`}
                aria-hidden={index !== currentSlide}
              >
                <ProductCard product={product} onAdd={onAdd} variant="horizontal" />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows */}
        {totalSlides > 1 && (
          <>
            <button
              onClick={goToPrevSlide}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation"
              aria-label="Previous product"
            >
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              onClick={goToNextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-manipulation"
              aria-label="Next product"
            >
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}

        {/* Dot Indicators */}
        {totalSlides > 1 && (
          <div className="flex justify-center gap-2 mt-3" role="tablist" aria-label="Carousel pagination">
            {displayProducts.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation`}
                role="tab"
                aria-selected={index === currentSlide}
                aria-label={`Go to slide ${index + 1}`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    index === currentSlide
                      ? 'w-6'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                  style={{
                    backgroundColor:
                      index === currentSlide ? 'var(--primary-color, #0ea5e9)' : undefined,
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default CartUpsell;
