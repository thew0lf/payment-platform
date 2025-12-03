'use client';

import { useState } from 'react';
import type { FunnelStage, Funnel } from '@/lib/api';

interface Props {
  stage: FunnelStage;
  funnel: Funnel;
  stageData: Record<string, unknown>;
  onAdvance: (data?: Record<string, unknown>) => void;
  onBack: () => void;
  canGoBack: boolean;
}

interface ProductConfig {
  layout?: 'grid' | 'list' | 'cards';
  source?: {
    type: 'manual' | 'category' | 'collection';
    productIds?: string[];
    categoryId?: string;
    collectionId?: string;
  };
  display?: {
    showPrices?: boolean;
    showDescription?: boolean;
    showVariants?: boolean;
    showQuantity?: boolean;
    itemsPerPage?: number;
  };
  selection?: {
    mode: 'single' | 'multiple';
    allowQuantity?: boolean;
    minItems?: number;
    maxItems?: number;
  };
  cta?: {
    text?: string;
    position?: 'fixed-bottom' | 'inline';
  };
}

// Placeholder product type - in production this would come from the API
interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  variants?: Array<{
    id: string;
    name: string;
    price?: number;
  }>;
}

export function ProductSelectionStage({
  stage,
  funnel,
  onAdvance,
  onBack,
  canGoBack,
}: Props) {
  const config = (stage.config || {}) as ProductConfig;
  const branding = funnel.settings?.branding || {};

  const [selectedProducts, setSelectedProducts] = useState<Map<string, { quantity: number; variantId?: string }>>(
    new Map()
  );

  // Placeholder products - in production these would be fetched from the API
  const products: Product[] = [
    {
      id: 'prod_1',
      name: 'Premium Package',
      description: 'Our most popular option with all features included.',
      price: 99.99,
      currency: 'USD',
    },
    {
      id: 'prod_2',
      name: 'Standard Package',
      description: 'Great value for everyday use.',
      price: 49.99,
      currency: 'USD',
    },
    {
      id: 'prod_3',
      name: 'Basic Package',
      description: 'Perfect for getting started.',
      price: 29.99,
      currency: 'USD',
    },
  ];

  const selectionMode = config.selection?.mode || 'single';

  const handleProductSelect = (productId: string) => {
    const newSelected = new Map(selectedProducts);

    if (selectionMode === 'single') {
      newSelected.clear();
      newSelected.set(productId, { quantity: 1 });
    } else {
      if (newSelected.has(productId)) {
        newSelected.delete(productId);
      } else {
        newSelected.set(productId, { quantity: 1 });
      }
    }

    setSelectedProducts(newSelected);
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    const newSelected = new Map(selectedProducts);
    const current = newSelected.get(productId);
    if (current) {
      newSelected.set(productId, { ...current, quantity });
      setSelectedProducts(newSelected);
    }
  };

  const handleContinue = () => {
    const selectedItems = Array.from(selectedProducts.entries()).map(([productId, { quantity, variantId }]) => ({
      productId,
      quantity,
      variantId,
    }));

    onAdvance({ selectedProducts: selectedItems });
  };

  const totalSelected = selectedProducts.size;
  const canContinue = totalSelected >= (config.selection?.minItems || 1);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="py-8 px-4 md:px-8 border-b">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            {canGoBack && (
              <button
                onClick={onBack}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{stage.name}</h1>
            <div className="w-20" /> {/* Spacer for alignment */}
          </div>
        </div>
      </header>

      {/* Products Grid */}
      <main className="py-8 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className={`grid gap-6 ${
            config.layout === 'list'
              ? 'grid-cols-1'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            {products.map((product) => {
              const isSelected = selectedProducts.has(product.id);
              const selection = selectedProducts.get(product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductSelect(product.id)}
                  className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[var(--primary-color)] ring-2 ring-[var(--primary-color)] ring-opacity-20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Selection indicator */}
                  <div
                    className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-[var(--primary-color)] bg-[var(--primary-color)]'
                        : 'border-gray-300'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Product image placeholder */}
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  )}

                  {/* Product info */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {product.name}
                  </h3>

                  {config.display?.showDescription !== false && product.description && (
                    <p className="text-gray-600 text-sm mb-4">{product.description}</p>
                  )}

                  {config.display?.showPrices !== false && (
                    <p className="text-xl font-bold" style={{ color: branding.primaryColor || '#000' }}>
                      {formatPrice(product.price, product.currency)}
                    </p>
                  )}

                  {/* Quantity selector */}
                  {isSelected && config.display?.showQuantity !== false && config.selection?.allowQuantity && (
                    <div className="mt-4 flex items-center" onClick={(e) => e.stopPropagation()}>
                      <span className="text-sm text-gray-600 mr-3">Quantity:</span>
                      <button
                        onClick={() => handleQuantityChange(product.id, (selection?.quantity || 1) - 1)}
                        className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-medium">{selection?.quantity || 1}</span>
                      <button
                        onClick={() => handleQuantityChange(product.id, (selection?.quantity || 1) + 1)}
                        className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-gray-600">
            {totalSelected} {totalSelected === 1 ? 'item' : 'items'} selected
          </div>
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
              canContinue
                ? 'hover:opacity-90 hover:scale-105'
                : 'opacity-50 cursor-not-allowed'
            }`}
            style={{ backgroundColor: branding.primaryColor || '#000000' }}
          >
            {config.cta?.text || 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
