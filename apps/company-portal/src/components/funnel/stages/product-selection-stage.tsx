'use client';

import { useEffect, useState, useCallback } from 'react';
import { Funnel, FunnelStage, ProductSelectionConfig, Product, getProducts } from '@/lib/api';
import { useFunnel } from '@/contexts/funnel-context';
import { ShoppingCartIcon, MinusIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';
import { FloatingCartSummary } from '@/components/cart/floating-cart-summary';
import { StickyCartBar } from '@/components/cart/sticky-cart-bar';
import { CartDrawer } from '@/components/cart/cart-drawer';

interface ProductSelectionStageProps {
  stage: FunnelStage;
  funnel: Funnel;
}

export function ProductSelectionStage({ stage, funnel }: ProductSelectionStageProps) {
  const {
    cart,
    addToCart,
    updateCartItem,
    nextStage,
    prevStage,
    trackEvent,
    cartTotal,
  } = useFunnel();
  const config = stage.config as ProductSelectionConfig;

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [recentlyAddedProductId, setRecentlyAddedProductId] = useState<string | null>(null);

  // Handle opening cart drawer
  const handleOpenCart = useCallback(() => {
    setIsCartDrawerOpen(true);
  }, []);

  // Handle closing cart drawer
  const handleCloseCart = useCallback(() => {
    setIsCartDrawerOpen(false);
  }, []);

  // Handle checkout from sticky bar
  const handleCheckout = useCallback(() => {
    if (cart.length === 0) return;
    if (config.selection.minItems && cart.length < config.selection.minItems) return;
    nextStage();
  }, [cart.length, config.selection.minItems, nextStage]);

  useEffect(() => {
    loadProducts();
  }, [funnel.companyId, config.source]);

  async function loadProducts() {
    setIsLoading(true);
    setError(null);

    try {
      const params: Parameters<typeof getProducts>[0] = {
        companyId: funnel.companyId,
        limit: config.display.itemsPerPage || 12,
      };

      if (config.source.type === 'manual' && config.source.productIds?.length) {
        params.productIds = config.source.productIds;
      } else if (config.source.type === 'category' && config.source.categoryId) {
        params.categoryId = config.source.categoryId;
      } else if (config.source.type === 'collection' && config.source.collectionId) {
        params.collectionId = config.source.collectionId;
      }

      const result = await getProducts(params);
      setProducts(result.items);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }

  const handleAddToCart = useCallback((product: Product, quantity: number = 1) => {
    addToCart({
      productId: product.id,
      quantity,
      price: product.price,
      name: product.name,
      imageUrl: product.images[0]?.url,
    });
    trackEvent('PRODUCT_SELECTED', { productId: product.id });

    // Trigger add animation
    setRecentlyAddedProductId(product.id);
    const timeout = setTimeout(() => setRecentlyAddedProductId(null), 600);
    return () => clearTimeout(timeout);
  }, [addToCart, trackEvent]);

  const handleContinue = () => {
    if (cart.length === 0 && config.selection.minItems && config.selection.minItems > 0) {
      return;
    }
    nextStage();
  };

  const getCartQuantity = (productId: string) => {
    const item = cart.find((i) => i.productId === productId);
    return item?.quantity || 0;
  };

  const filteredProducts = searchQuery
    ? products.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  if (isLoading) {
    return (
      <div className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg mb-4" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 px-4 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadProducts}
          className="mt-4 px-4 py-2 bg-[var(--primary-color)] text-white rounded-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{stage.name}</h2>
          {config.selection.mode === 'multiple' && (
            <p className="text-gray-600">
              Select {config.selection.minItems ? `at least ${config.selection.minItems}` : ''}
              {config.selection.maxItems ? ` up to ${config.selection.maxItems}` : ''} products
            </p>
          )}
        </div>

        {/* Search & Filters */}
        {config.display.showSearch && (
          <div className="mb-8 max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-color)]/20 outline-none text-gray-900 bg-white"
            />
          </div>
        )}

        {/* Products Grid */}
        <div
          className={`grid gap-6 ${
            config.layout === 'grid'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : config.layout === 'single-product'
              ? 'grid-cols-1 max-w-lg mx-auto'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              config={config}
              quantity={getCartQuantity(product.id)}
              onAdd={() => handleAddToCart(product)}
              onUpdateQuantity={(qty) => updateCartItem(product.id, qty)}
              mode={config.selection.mode}
              isRecentlyAdded={recentlyAddedProductId === product.id}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found</p>
          </div>
        )}

        {/* Fixed Bottom Bar */}
        {(config.cta.position === 'fixed-bottom' || config.cta.position === 'both') && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-30">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              {funnel.settings.behavior.allowBackNavigation && (
                <button
                  onClick={prevStage}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Back
                </button>
              )}

              <div className="flex items-center gap-4 ml-auto">
                {cart.length > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{cart.length} items</p>
                    <p className="text-lg font-semibold text-gray-900">${cartTotal.toFixed(2)}</p>
                  </div>
                )}

                <button
                  onClick={handleContinue}
                  disabled={
                    cart.length === 0 ||
                    Boolean(config.selection.minItems && cart.length < config.selection.minItems)
                  }
                  className="px-6 py-3 bg-[var(--primary-color)] text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ShoppingCartIcon className="h-5 w-5" />
                  {config.cta.text || 'Continue to Checkout'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom spacing for fixed bar */}
      {(config.cta.position === 'fixed-bottom' || config.cta.position === 'both') && (
        <div className="h-24" />
      )}

      {/* Bottom spacing for sticky cart bar on mobile */}
      <div className="md:hidden h-24" />

      {/* Floating Cart Summary - Desktop only */}
      <FloatingCartSummary onOpenCart={handleOpenCart} />

      {/* Sticky Cart Bar - Mobile only */}
      <StickyCartBar
        onCheckout={handleCheckout}
        onOpenCart={handleOpenCart}
      />

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartDrawerOpen} onClose={handleCloseCart} />
    </div>
  );
}

// Product Card Component
function ProductCard({
  product,
  config,
  quantity,
  onAdd,
  onUpdateQuantity,
  mode,
  isRecentlyAdded = false,
}: {
  product: Product;
  config: ProductSelectionConfig;
  quantity: number;
  onAdd: () => void;
  onUpdateQuantity: (qty: number) => void;
  mode: 'single' | 'multiple';
  isRecentlyAdded?: boolean;
}) {
  const [showCheckmark, setShowCheckmark] = useState(false);

  // Show checkmark animation when item is added
  useEffect(() => {
    if (isRecentlyAdded) {
      setShowCheckmark(true);
      const timeout = setTimeout(() => setShowCheckmark(false), 1500);
      return () => clearTimeout(timeout);
    }
  }, [isRecentlyAdded]);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {product.images[0] ? (
          <img
            src={product.images[0].thumbnails?.medium || product.images[0].url}
            srcSet={
              product.images[0].thumbnails
                ? `${product.images[0].thumbnails.small || product.images[0].url} 200w, ${product.images[0].thumbnails.medium || product.images[0].url} 400w, ${product.images[0].thumbnails.large || product.images[0].url} 800w`
                : undefined
            }
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            alt={product.images[0].alt || product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <ShoppingCartIcon className="h-16 w-16" />
          </div>
        )}

        {product.compareAtPrice && product.compareAtPrice > product.price && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
            {Math.round((1 - product.price / product.compareAtPrice) * 100)}% OFF
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{product.name}</h3>

        {config.display.showDescription && product.shortDescription && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.shortDescription}</p>
        )}

        {config.display.showPrices && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg font-bold text-gray-900">
              ${product.price.toFixed(2)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-sm text-gray-400 line-through">
                ${product.compareAtPrice.toFixed(2)}
              </span>
            )}
          </div>
        )}

        {/* Add to Cart / Quantity Controls */}
        {config.cta.position !== 'fixed-bottom' && (
          <div className="relative">
            {quantity === 0 ? (
              <button
                onClick={onAdd}
                className={`
                  w-full py-2.5 min-h-[44px]
                  bg-[var(--primary-color)] text-white
                  font-medium rounded-lg
                  transition-all duration-200
                  touch-manipulation
                  active:scale-[0.98]
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary-color)]
                  ${isRecentlyAdded ? 'animate-add-success' : 'hover:opacity-90'}
                `}
                aria-label={mode === 'single' ? `Select ${product.name}` : `Add ${product.name} to cart`}
              >
                {showCheckmark ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckIcon className="h-5 w-5 animate-checkmark" aria-hidden="true" />
                    Added!
                  </span>
                ) : (
                  mode === 'single' ? 'Select' : 'Add to Cart'
                )}
              </button>
            ) : config.selection.allowQuantity ? (
              <div className="flex items-center justify-center gap-3 bg-gray-100 rounded-lg p-2">
                <button
                  onClick={() => onUpdateQuantity(quantity - 1)}
                  className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white rounded-md hover:bg-gray-50 shadow-sm touch-manipulation"
                  aria-label={`Decrease quantity of ${product.name}`}
                >
                  <MinusIcon className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="font-medium w-8 text-center" aria-label={`Quantity: ${quantity}`}>
                  {quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(quantity + 1)}
                  className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white rounded-md hover:bg-gray-50 shadow-sm touch-manipulation"
                  aria-label={`Increase quantity of ${product.name}`}
                >
                  <PlusIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div
                className={`
                  flex items-center justify-center gap-2 py-2.5
                  text-[var(--primary-color)] font-medium
                  transition-all duration-300
                  ${showCheckmark ? 'text-green-600' : ''}
                `}
                role="status"
                aria-label={`${product.name} added to cart`}
              >
                {showCheckmark ? (
                  <>
                    <CheckIcon className="h-5 w-5 animate-checkmark" aria-hidden="true" />
                    Added!
                  </>
                ) : (
                  <>
                    <ShoppingCartIcon className="h-5 w-5" aria-hidden="true" />
                    Added
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
