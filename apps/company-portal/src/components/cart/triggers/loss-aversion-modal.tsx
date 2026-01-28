'use client';

import { AlertTriangle, Star, TrendingUp, Clock, X } from 'lucide-react';

interface LossAversionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onKeepItem?: () => void;
  item: {
    name: string;
    price: number;
    imageUrl?: string;
    rating?: number;
    reviewCount?: number;
    savings?: number;
    stockLevel?: number;
  };
  currency?: string;
  locale?: string;
}

function formatPrice(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

export function LossAversionModal({
  open,
  onClose,
  onConfirm,
  onKeepItem,
  item,
  currency = 'USD',
  locale = 'en-US',
}: LossAversionModalProps) {
  if (!open) return null;

  const handleKeep = () => {
    onKeepItem?.();
    onClose();
  };

  const handleRemove = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loss-aversion-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors touch-manipulation"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {/* Warning header */}
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-100">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-2 bg-amber-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
            </div>
            <h2 id="loss-aversion-title" className="text-lg font-semibold text-amber-900">
              Remove this item?
            </h2>
          </div>
        </div>

        {/* Item preview */}
        <div className="p-6">
          <div className="flex gap-4 mb-4">
            {/* Item image */}
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400 text-xs">No image</span>
              </div>
            )}

            {/* Item details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {formatPrice(item.price, currency, locale)}
              </p>

              {/* Rating */}
              {item.rating && item.rating > 0 && (
                <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" aria-hidden="true" />
                  <span>{item.rating.toFixed(1)}</span>
                  {item.reviewCount && (
                    <span className="text-gray-400">({item.reviewCount.toLocaleString()})</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Loss aversion messaging */}
          <div className="space-y-3 mb-6">
            {/* Savings loss */}
            {item.savings && item.savings > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                <span>
                  You&apos;ll lose {formatPrice(item.savings, currency, locale)} in savings
                </span>
              </div>
            )}

            {/* Low stock warning */}
            {item.stockLevel && item.stockLevel <= 5 && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>
                  Only {item.stockLevel} left - may sell out soon
                </span>
              </div>
            )}

            {/* General reminder */}
            <p className="text-sm text-gray-600">
              This item will be removed from your cart. You can always add it back later,
              but availability isn&apos;t guaranteed.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleKeep}
              className="flex-1 min-h-[44px] px-4 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors touch-manipulation active:scale-[0.98]"
            >
              Keep Item
            </button>
            <button
              onClick={handleRemove}
              className="flex-1 min-h-[44px] px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors touch-manipulation active:scale-[0.98]"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
