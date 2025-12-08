'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  CubeIcon,
  StarIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { productsApi, type Product } from '@/lib/api/products';

interface ProductSelectionStepProps {
  selectedProductIds: string[];
  primaryProductId?: string;
  onNext: (productIds: string[], primaryId?: string) => void;
  companyId?: string;
}

export function ProductSelectionStep({
  selectedProductIds: initialSelected,
  primaryProductId: initialPrimary,
  onNext,
  companyId,
}: ProductSelectionStepProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelected);
  const [primaryId, setPrimaryId] = useState<string | undefined>(initialPrimary);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const params: Record<string, string | number> = { limit: 50 };
        if (companyId) params.companyId = companyId;
        const data = await productsApi.list(params);
        setProducts(data.products || []);
      } catch {
        toast.error('Failed to load products');
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, [companyId]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleProduct = (productId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(productId)) {
        // Removing product
        const newIds = prev.filter(id => id !== productId);
        // If removing primary, clear it
        if (primaryId === productId) {
          setPrimaryId(newIds[0]);
        }
        return newIds;
      } else {
        // Adding product (max 5)
        if (prev.length >= 5) {
          toast.error('Maximum 5 products allowed');
          return prev;
        }
        const newIds = [...prev, productId];
        // If first product, make it primary
        if (!primaryId) {
          setPrimaryId(productId);
        }
        return newIds;
      }
    });
  };

  const setPrimary = (productId: string) => {
    if (selectedIds.includes(productId)) {
      setPrimaryId(productId);
    }
  };

  const handleNext = () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one product');
      return;
    }
    onNext(selectedIds, primaryId || selectedIds[0]);
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Select Products to Feature
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Choose 1-5 products for your funnel. The AI will craft compelling copy for each.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Selected count */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <span className="text-sm text-purple-700 dark:text-purple-300">
            {selectedIds.length} product{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <span className="text-sm text-purple-600 dark:text-purple-400">
            Click the star to set the primary product
          </span>
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map(product => {
          const isSelected = selectedIds.includes(product.id);
          const isPrimary = primaryId === product.id;

          return (
            <div
              key={product.id}
              onClick={() => toggleProduct(product.id)}
              className={`
                relative p-4 rounded-xl border-2 cursor-pointer transition-all
                ${isSelected
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'}
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <CheckCircleIcon className="h-6 w-6 text-purple-600" />
                </div>
              )}

              {/* Primary star */}
              {isSelected && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setPrimary(product.id);
                  }}
                  className="absolute top-3 left-3 p-1 hover:bg-white/50 rounded"
                  title={isPrimary ? 'Primary product' : 'Set as primary'}
                >
                  {isPrimary ? (
                    <StarIconSolid className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <StarIcon className="h-5 w-5 text-gray-400 hover:text-yellow-500" />
                  )}
                </button>
              )}

              {/* Product image */}
              <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <CubeIcon className="h-12 w-12 text-gray-400" />
                )}
              </div>

              {/* Product info */}
              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                {product.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatPrice(product.price, product.currency)}
              </p>
              {isPrimary && (
                <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                  Primary Product
                </span>
              )}
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No products match your search' : 'No products found'}
          </p>
        </div>
      )}

      {/* Next button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleNext}
          disabled={selectedIds.length === 0}
          className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue to Methodology
        </button>
      </div>
    </div>
  );
}
