'use client';

import * as React from 'react';
import { Minus, Plus, Trash2, Bookmark, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { CartItem as CartItemType } from '@/lib/api/cart';

interface CartItemProps {
  item: CartItemType;
  isLoading?: boolean;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onSaveForLater?: (itemId: string) => void;
  showSaveForLater?: boolean;
}

export function CartItem({
  item,
  isLoading = false,
  onUpdateQuantity,
  onRemove,
  onSaveForLater,
  showSaveForLater = true,
}: CartItemProps) {
  const productName = item.product?.name || item.productId;
  const productSku = item.product?.sku || item.variantId || 'N/A';
  const productImage = item.product?.images?.[0];
  const variantName = item.variant?.name;
  const lineTotal = item.price * item.quantity;

  const handleDecrement = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1);
    } else {
      onRemove(item.id);
    }
  };

  const handleIncrement = () => {
    onUpdateQuantity(item.id, item.quantity + 1);
  };

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-opacity',
        isLoading && 'opacity-60 pointer-events-none'
      )}
    >
      {/* Product Image */}
      <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
        {productImage ? (
          <img
            src={productImage}
            alt={productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs">
            No image
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
              {productName}
            </h4>
            {variantName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{variantName}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {productSku}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              ${lineTotal.toFixed(2)}
            </p>
            {item.quantity > 1 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ${item.price.toFixed(2)} each
              </p>
            )}
          </div>
        </div>

        {/* Gift message */}
        {item.isGift && item.giftMessage && (
          <div className="mt-1 p-2 bg-primary/5 rounded text-xs">
            <span className="font-medium">Gift:</span> {item.giftMessage}
          </div>
        )}

        {/* Quantity Controls & Actions */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-11 w-11 p-0 touch-manipulation"
              onClick={handleDecrement}
              disabled={isLoading}
              aria-label={item.quantity === 1 ? `Remove ${productName} from cart` : `Decrease quantity of ${productName}`}
            >
              {item.quantity === 1 ? (
                <Trash2 className="h-4 w-4 text-destructive" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
            </Button>
            <span
              className="w-10 text-center text-sm font-medium text-gray-900 dark:text-gray-100"
              aria-live="polite"
              aria-atomic="true"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto text-gray-500 dark:text-gray-400" />
              ) : (
                item.quantity
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-11 w-11 p-0 touch-manipulation"
              onClick={handleIncrement}
              disabled={isLoading}
              aria-label={`Increase quantity of ${productName}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            {showSaveForLater && onSaveForLater && (
              <Button
                variant="ghost"
                size="sm"
                className="h-11 px-3 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 touch-manipulation"
                onClick={() => onSaveForLater(item.id)}
                disabled={isLoading}
                aria-label={`Save ${productName} for later`}
              >
                <Bookmark className="h-4 w-4 mr-1" />
                Save
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-11 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation"
              onClick={() => onRemove(item.id)}
              disabled={isLoading}
              aria-label={`Remove ${productName} from cart`}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SAVED CART ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════

interface SavedCartItemProps {
  item: CartItemType;
  isLoading?: boolean;
  onMoveToCart: (savedItemId: string) => void;
  onRemove: (savedItemId: string) => void;
}

export function SavedCartItem({
  item,
  isLoading = false,
  onMoveToCart,
  onRemove,
}: SavedCartItemProps) {
  const productName = item.product?.name || item.productId;
  const productImage = item.product?.images?.[0];
  const variantName = item.variant?.name;

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 transition-opacity',
        isLoading && 'opacity-60 pointer-events-none'
      )}
    >
      {/* Product Image */}
      <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
        {productImage ? (
          <img
            src={productImage}
            alt={productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-[10px]">
            No img
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
          {productName}
        </h4>
        {variantName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{variantName}</p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Qty: {item.quantity} · ${item.price.toFixed(2)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-11 px-3 text-xs text-gray-700 dark:text-gray-300 touch-manipulation"
          onClick={() => onMoveToCart(item.id)}
          disabled={isLoading}
          aria-label={`Move ${productName} to cart`}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-gray-400" />
          ) : (
            'Add to Cart'
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-11 px-3 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 touch-manipulation"
          onClick={() => onRemove(item.id)}
          disabled={isLoading}
          aria-label={`Remove ${productName} from saved items`}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
