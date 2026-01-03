'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Package,
  Tag,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCartStore, useCartItemCount } from '@/stores/cart.store';
import { CartItem, SavedCartItem } from './cart-item';

// ═══════════════════════════════════════════════════════════════
// CART DRAWER COMPONENT
// ═══════════════════════════════════════════════════════════════

export function CartDrawer() {
  const router = useRouter();
  const {
    items,
    savedItems,
    discounts,
    totals,
    isDrawerOpen,
    isLoading,
    isItemLoading,
    error,
    closeDrawer,
    updateQuantity,
    removeItem,
    saveForLater,
    moveToCart,
    applyDiscount,
    removeDiscount,
    clearCart,
    fetchCart,
    setError,
  } = useCartStore();

  const [discountCode, setDiscountCode] = React.useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = React.useState(false);
  const [showSavedItems, setShowSavedItems] = React.useState(true);
  const [showClearConfirmation, setShowClearConfirmation] = React.useState(false);

  // Fetch cart on mount if drawer is open
  React.useEffect(() => {
    if (isDrawerOpen && items.length === 0) {
      fetchCart();
    }
  }, [isDrawerOpen, items.length, fetchCart]);

  // Clear error when drawer closes
  React.useEffect(() => {
    if (!isDrawerOpen) {
      setError(null);
    }
  }, [isDrawerOpen, setError]);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;

    setIsApplyingDiscount(true);
    try {
      await applyDiscount(discountCode.trim());
      toast.success('Discount applied successfully');
      setDiscountCode('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid discount code');
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = async (code: string) => {
    try {
      await removeDiscount(code);
      toast.success('Discount removed');
    } catch (err) {
      toast.error('Couldn\'t remove discount. Please try again.');
    }
  };

  const handleClearCart = () => {
    setShowClearConfirmation(true);
  };

  const confirmClearCart = async () => {
    try {
      await clearCart();
      toast.success('Cart cleared');
      setShowClearConfirmation(false);
    } catch (err) {
      toast.error('Couldn\'t clear cart. Please try again.');
    }
  };

  const handleCheckout = () => {
    closeDrawer();
    router.push('/checkout');
  };

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    try {
      await updateQuantity(itemId, quantity);
    } catch (err) {
      toast.error('Couldn\'t update quantity. Please try again.');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem(itemId);
      toast.success('Item removed');
    } catch (err) {
      toast.error('Couldn\'t remove item. Please try again.');
    }
  };

  const handleSaveForLater = async (itemId: string) => {
    try {
      await saveForLater(itemId);
      toast.success('Item saved for later');
    } catch (err) {
      toast.error('Couldn\'t save item. Please try again.');
    }
  };

  const handleMoveToCart = async (savedItemId: string) => {
    try {
      await moveToCart(savedItemId);
      toast.success('Item added to cart');
    } catch (err) {
      toast.error('Couldn\'t add item to cart. Please try again.');
    }
  };

  const handleRemoveSavedItem = async (savedItemId: string) => {
    try {
      await removeItem(savedItemId);
      toast.success('Saved item removed');
    } catch (err) {
      toast.error('Couldn\'t remove saved item. Please try again.');
    }
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasItems = items.length > 0;
  const hasSavedItems = savedItems.length > 0;

  return (
    <Sheet open={isDrawerOpen} onOpenChange={closeDrawer} side="right">
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart
            {itemCount > 0 && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Cart Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-sm">Loading cart...</p>
            </div>
          ) : !hasItems ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-40" aria-hidden="true" />
              <p className="text-lg font-medium text-foreground">Nothing here yet</p>
              <p className="text-sm text-center mt-1">
                Browse our products and add something you love
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  isLoading={isItemLoading.has(item.id)}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemoveItem}
                  onSaveForLater={handleSaveForLater}
                />
              ))}
            </div>
          )}

          {/* Saved for Later Section */}
          {hasSavedItems && (
            <div className="mt-6">
              <button
                onClick={() => setShowSavedItems(!showSavedItems)}
                className="flex items-center justify-between w-full min-h-[44px] py-2 text-sm font-medium text-muted-foreground hover:text-foreground touch-manipulation"
                aria-expanded={showSavedItems}
                aria-controls="saved-items-list"
              >
                <span>Saved for Later ({savedItems.length})</span>
                {showSavedItems ? (
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              {showSavedItems && (
                <div id="saved-items-list" className="space-y-2 mt-2">
                  {savedItems.map((item) => (
                    <SavedCartItem
                      key={item.id}
                      item={item}
                      isLoading={isItemLoading.has(item.id)}
                      onMoveToCart={handleMoveToCart}
                      onRemove={handleRemoveSavedItem}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Discounts & Totals */}
        {hasItems && (
          <SheetFooter className="flex flex-col gap-4 px-4 py-4 border-t bg-muted/30">
            {/* Discount Code Input */}
            <div className="w-full">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Discount code"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    className="pl-9"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleApplyDiscount();
                      }
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleApplyDiscount}
                  disabled={isApplyingDiscount || !discountCode.trim()}
                  className="min-h-[44px]"
                >
                  {isApplyingDiscount ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>

              {/* Applied Discounts */}
              {discounts.length > 0 && (
                <div className="mt-2 space-y-1">
                  {discounts.map((discount) => (
                    <div
                      key={discount.code}
                      className="flex items-center justify-between py-1 px-2 bg-green-500/10 border border-green-500/20 rounded text-sm"
                    >
                      <span className="text-green-700 dark:text-green-400 font-medium">
                        {discount.code}
                        <span className="font-normal text-green-600 dark:text-green-500 ml-2">
                          -${discount.appliedAmount.toFixed(2)}
                        </span>
                      </span>
                      <button
                        onClick={() => handleRemoveDiscount(discount.code)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-green-600 hover:text-red-500 transition-colors touch-manipulation"
                        aria-label={`Remove discount code ${discount.code}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals */}
            {totals && (
              <div className="w-full space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-${totals.discount.toFixed(2)}</span>
                  </div>
                )}
                {totals.shipping > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>${totals.shipping.toFixed(2)}</span>
                  </div>
                )}
                {totals.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${totals.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-border text-base font-semibold">
                  <span>Total</span>
                  <span>${totals.grandTotal.toFixed(2)} {totals.currency}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-2">
              <Button
                className="w-full min-h-[48px] text-base font-semibold touch-manipulation"
                size="lg"
                onClick={handleCheckout}
              >
                Checkout
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 min-h-[44px] touch-manipulation"
                  onClick={closeDrawer}
                >
                  Continue Shopping
                </Button>
                <Button
                  variant="ghost"
                  className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive touch-manipulation"
                  onClick={handleClearCart}
                  aria-label="Clear cart"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetFooter>
        )}

        {/* Clear Cart Confirmation Dialog */}
        <AlertDialog open={showClearConfirmation} onOpenChange={setShowClearConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear your cart?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all {itemCount} {itemCount === 1 ? 'item' : 'items'} from your cart. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-[44px] touch-manipulation">
                Keep Items
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmClearCart}
                className="min-h-[44px] bg-destructive hover:bg-destructive/90 touch-manipulation"
              >
                Clear Cart
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════
// CART ICON BUTTON (for header/nav)
// ═══════════════════════════════════════════════════════════════

export function CartIconButton({ className }: { className?: string }) {
  const { openDrawer } = useCartStore();
  const itemCount = useCartItemCount();

  return (
    <button
      onClick={openDrawer}
      className={cn(
        'relative min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-muted transition-colors touch-manipulation flex items-center justify-center',
        className
      )}
      aria-label={itemCount > 0 ? `Shopping cart with ${itemCount} ${itemCount === 1 ? 'item' : 'items'}` : 'Shopping cart (empty)'}
    >
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      {itemCount > 0 && (
        <span
          className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center"
          aria-hidden="true"
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export { CartItem, SavedCartItem } from './cart-item';
