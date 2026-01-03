'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  MinusIcon,
  PlusIcon,
  TrashIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

/**
 * Props for cart item component.
 * Matches the SelectedProduct type from funnel-context with additional display options.
 */
export interface CartItemProps {
  item: {
    productId: string;
    variantId?: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
  };
  /** Callback when quantity changes. Quantity of 0 should trigger removal. */
  onUpdateQuantity: (productId: string, quantity: number) => void;
  /** Callback when item is removed. */
  onRemove: (productId: string) => void;
  /** Current stock level for low stock warning. */
  stockLevel?: number;
  /** Show confirmation dialog before removing. If false, shows undo toast capability. */
  showRemoveConfirmation?: boolean;
  /** Custom currency formatter. Defaults to USD. */
  formatCurrency?: (amount: number) => string;
  /** Maximum quantity allowed (defaults to 99). */
  maxQuantity?: number;
  /** Variant display name (e.g., "Size: Large, Color: Blue"). */
  variantDisplayName?: string;
}

/**
 * Low stock threshold - shows warning when stock is at or below this level.
 */
const LOW_STOCK_THRESHOLD = 5;

/**
 * Undo timeout in milliseconds - time before item is actually removed.
 */
const UNDO_TIMEOUT_MS = 5000;

/**
 * Default currency formatter.
 */
const defaultFormatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * CartItem component for displaying and managing individual cart items.
 *
 * Features:
 * - Product image display (80x80)
 * - Name and variant display
 * - Quantity selector with 44px touch targets
 * - Remove button with confirmation or undo capability
 * - Low stock warning indicator
 * - Unit price and line total display
 * - Fully responsive design
 * - Accessible with proper ARIA labels
 */
export function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
  stockLevel,
  showRemoveConfirmation = true,
  formatCurrency = defaultFormatCurrency,
  maxQuantity = 99,
  variantDisplayName,
}: CartItemProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState(false);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Cleanup: clear timeout on unmount to prevent memory leak
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
      }
    };
  }, [undoTimeoutId]);

  const lineTotal = item.price * item.quantity;
  const isLowStock = stockLevel !== undefined && stockLevel <= LOW_STOCK_THRESHOLD && stockLevel > 0;
  const isOutOfStock = stockLevel !== undefined && stockLevel === 0;
  const canIncrease = !isOutOfStock && item.quantity < maxQuantity && (stockLevel === undefined || item.quantity < stockLevel);

  /**
   * Handle remove button click.
   */
  const handleRemoveClick = useCallback(() => {
    if (showRemoveConfirmation) {
      setShowConfirmDialog(true);
    } else {
      // Show undo toast instead of immediate removal
      setPendingRemoval(true);
      setShowUndoToast(true);

      const timeoutId = setTimeout(() => {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          onRemove(item.productId);
          setShowUndoToast(false);
          setPendingRemoval(false);
        }
      }, UNDO_TIMEOUT_MS);

      setUndoTimeoutId(timeoutId);
    }
  }, [item.productId, onRemove, showRemoveConfirmation]);

  /**
   * Handle quantity decrease.
   */
  const handleDecrease = useCallback(() => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.productId, item.quantity - 1);
    } else {
      // Quantity would go to 0, trigger removal flow
      handleRemoveClick();
    }
  }, [item.productId, item.quantity, onUpdateQuantity, handleRemoveClick]);

  /**
   * Handle quantity increase.
   */
  const handleIncrease = useCallback(() => {
    if (canIncrease) {
      onUpdateQuantity(item.productId, item.quantity + 1);
    }
  }, [item.productId, item.quantity, onUpdateQuantity, canIncrease]);

  /**
   * Handle undo action.
   */
  const handleUndo = useCallback(() => {
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
      setUndoTimeoutId(null);
    }
    setPendingRemoval(false);
    setShowUndoToast(false);
  }, [undoTimeoutId]);

  /**
   * Confirm removal from dialog.
   */
  const handleConfirmRemove = useCallback(() => {
    onRemove(item.productId);
    setShowConfirmDialog(false);
  }, [item.productId, onRemove]);

  /**
   * Cancel removal dialog.
   */
  const handleCancelRemove = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  // If pending removal, show reduced opacity state
  if (pendingRemoval && showUndoToast) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 opacity-50 relative">
        <div className="flex gap-4 items-center">
          {/* Placeholder for image */}
          <div className="w-20 h-20 rounded-lg bg-gray-100 flex-shrink-0" />

          <div className="flex-1">
            <p className="text-gray-600">Saying goodbye to {item.name}...</p>
          </div>

          <button
            onClick={handleUndo}
            className="px-4 py-2 min-h-[44px] bg-[var(--primary-color,#0ea5e9)] text-white font-medium rounded-lg hover:opacity-90 transition-opacity touch-manipulation"
          >
            Undo
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex gap-4">
          {/* Product Image - 80x80 */}
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-20 h-20 rounded-lg object-cover bg-gray-100 flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <ShoppingCartIcon className="h-8 w-8 text-gray-300" aria-hidden="true" />
            </div>
          )}

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {/* Product Name */}
                <h3 className="font-medium text-gray-900 line-clamp-2">
                  {item.name}
                </h3>

                {/* Variant Display */}
                {(item.variantId || variantDisplayName) && (
                  <p className="text-sm text-gray-500 mt-1 truncate">
                    {variantDisplayName || `Variant: ${item.variantId}`}
                  </p>
                )}

                {/* Low Stock Warning */}
                {isLowStock && (
                  <div className="flex items-center gap-1 mt-1.5" role="alert">
                    <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
                    <span className="text-xs text-amber-700 font-medium">
                      Hurry! Only {stockLevel} left
                    </span>
                  </div>
                )}

                {/* Out of Stock Warning */}
                {isOutOfStock && (
                  <div className="flex items-center gap-1 mt-1.5" role="alert">
                    <ExclamationTriangleIcon className="h-4 w-4 text-red-600 flex-shrink-0" aria-hidden="true" />
                    <span className="text-xs text-red-700 font-medium">
                      Sold out - check back soon!
                    </span>
                  </div>
                )}
              </div>

              {/* Remove Button */}
              <button
                onClick={handleRemoveClick}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
                aria-label={`Remove ${item.name} from cart`}
              >
                <TrashIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Quantity Controls and Price */}
            <div className="mt-4 flex items-center justify-between gap-4">
              {/* Quantity Controls */}
              <div className="flex items-center gap-1" role="group" aria-label={`Quantity for ${item.name}`}>
                <button
                  onClick={handleDecrease}
                  className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                  aria-label="Decrease quantity"
                  disabled={item.quantity <= 0}
                >
                  <MinusIcon className="h-4 w-4" aria-hidden="true" />
                </button>

                <span
                  className="w-12 text-center font-medium text-gray-900"
                  aria-live="polite"
                  aria-label={`Quantity: ${item.quantity}`}
                >
                  {item.quantity}
                </span>

                <button
                  onClick={handleIncrease}
                  className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                  aria-label="Increase quantity"
                  disabled={!canIncrease}
                >
                  <PlusIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Price Display */}
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-gray-900" aria-label={`Line total: ${formatCurrency(lineTotal)}`}>
                  {formatCurrency(lineTotal)}
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

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-dialog-title"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCancelRemove}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-xl p-6 max-w-sm w-[calc(100%-2rem)] shadow-xl">
            <h3
              id="remove-dialog-title"
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              Remove this item?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Sure you want to remove {item.name}?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelRemove}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] touch-manipulation"
              >
                Nevermind, keep it
              </button>
              <button
                onClick={handleConfirmRemove}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors min-h-[44px] touch-manipulation"
              >
                Yes, remove it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CartItem;
