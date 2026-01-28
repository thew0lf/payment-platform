'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  XMarkIcon,
  ShoppingCartIcon,
  ArrowRightIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useFunnel } from '@/contexts/funnel-context';
import { useCartTheme, CartThemeProvider, CartTheme } from '@/contexts/cart-theme-context';
import { CartItem } from './cart-item';

// Import behavioral triggers
import { UrgencyBanner } from './triggers/urgency-banner';
import { FreeShippingProgress } from './triggers/free-shipping-progress';
import { SocialProofBadge } from './triggers/social-proof-badge';
import { TrustSignals } from './triggers/trust-signals';
import { LossAversionModal } from './triggers/loss-aversion-modal';

// ============================================================================
// Types
// ============================================================================

export interface ThemedCartDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Optional theme override */
  theme?: Partial<CartTheme>;
  /** Show behavioral triggers (MI Cart integration) */
  showTriggers?: boolean;
  /** Free shipping threshold (for progress bar) */
  freeShippingThreshold?: number;
  /** Social proof data */
  socialProof?: {
    totalPurchases?: number;
    rating?: number;
    reviewCount?: number;
    isTrending?: boolean;
  };
  /** Urgency configuration */
  urgency?: {
    type: 'countdown' | 'stock' | 'demand';
    message: string;
    endTime?: Date;
    stockRemaining?: number;
    urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  };
}

// ============================================================================
// Inner Component (uses context)
// ============================================================================

function ThemedCartDrawerInner({
  isOpen,
  onClose,
  showTriggers = true,
  freeShippingThreshold = 75,
  socialProof,
  urgency,
}: Omit<ThemedCartDrawerProps, 'theme'>) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [itemToRemove, setItemToRemove] = useState<{ productId: string; variantId?: string } | null>(null);

  const { theme, colors, layout, content, getStyles } = useCartTheme();

  const {
    cart,
    cartTotal,
    cartCount,
    updateCartItem,
    removeFromCart,
    funnel,
    nextStage,
    currentStage,
  } = useFunnel();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Handle keyboard events (Escape to close)
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  // Focus trap and keyboard handling
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  // Handle checkout action
  const handleCheckout = () => {
    if (funnel && currentStage?.type !== 'CHECKOUT') {
      nextStage();
    }
    onClose();
  };

  // Handle remove with loss aversion modal
  const handleRemoveClick = (productId: string, variantId?: string) => {
    if (showTriggers) {
      setItemToRemove({ productId, variantId });
    } else {
      removeFromCart(productId, variantId);
    }
  };

  const confirmRemove = () => {
    if (itemToRemove) {
      removeFromCart(itemToRemove.productId, itemToRemove.variantId);
      setItemToRemove(null);
    }
  };

  // Calculate drawer position and animation classes
  const getDrawerClasses = () => {
    const base = 'fixed z-50 bg-[var(--cart-bg)] flex flex-col transition-transform';
    const duration = `duration-[var(--cart-animation-duration)]`;
    const shadow = 'shadow-[var(--cart-shadow)]';

    const positionClasses = {
      right: `top-0 right-0 h-full w-full sm:w-[var(--cart-width)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`,
      left: `top-0 left-0 h-full w-full sm:w-[var(--cart-width)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`,
      bottom: `bottom-0 left-0 right-0 h-[80vh] rounded-t-[var(--cart-radius)] ${isOpen ? 'translate-y-0' : 'translate-y-full'}`,
    };

    return `${base} ${duration} ${shadow} ${positionClasses[layout.position]}`;
  };

  // Calculate backdrop classes
  const getBackdropClasses = () => {
    const base = 'fixed inset-0 z-40 bg-black/50 transition-opacity duration-[var(--cart-animation-duration)]';
    const blur = layout.backdropBlur ? 'backdrop-blur-sm' : '';
    const visibility = isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none';
    return `${base} ${blur} ${visibility}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={getBackdropClasses()}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={getDrawerClasses()}
        style={getStyles()}
      >
        {/* Urgency Banner (MI Trigger) */}
        {showTriggers && urgency && (
          <UrgencyBanner
            type={urgency.type}
            message={urgency.message}
            endTime={urgency.endTime}
            stockRemaining={urgency.stockRemaining}
            urgencyLevel={urgency.urgencyLevel}
          />
        )}

        {/* Sticky Header */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b"
          style={{
            backgroundColor: colors.headerBackground,
            borderColor: colors.border,
          }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: colors.headingText }}
          >
            {content.headerTitle}
            {content.showItemCount && cartCount > 0 && (
              <span
                className="ml-2 text-sm font-normal"
                style={{ color: colors.mutedText }}
              >
                ({cartCount} {cartCount === 1 ? 'item' : 'items'})
              </span>
            )}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors touch-manipulation"
            style={{ color: colors.iconColor }}
            aria-label="Close cart"
          >
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </header>

        {/* Free Shipping Progress (MI Trigger) */}
        {showTriggers && cart.length > 0 && (
          <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
            <FreeShippingProgress
              currentTotal={cartTotal}
              threshold={freeShippingThreshold}
            />
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {cart.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              {content.showEmptyIcon && (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: colors.itemBackground }}
                >
                  <ShoppingCartIcon
                    className="h-10 w-10"
                    style={{ color: colors.mutedText }}
                    aria-hidden="true"
                  />
                </div>
              )}
              <h3
                className="text-lg font-medium mb-2"
                style={{ color: colors.headingText }}
              >
                {content.emptyTitle}
              </h3>
              <p
                className="text-sm mb-6 max-w-xs"
                style={{ color: colors.bodyText }}
              >
                {content.emptySubtitle}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] font-medium rounded-lg transition-opacity touch-manipulation active:scale-[0.98]"
                style={{
                  backgroundColor: colors.primaryButton,
                  color: colors.primaryButtonText,
                }}
              >
                {content.emptyButtonText}
              </button>
            </div>
          ) : (
            /* Cart Items */
            <div className="px-4 py-2 space-y-3">
              {/* Social Proof Badge (MI Trigger) */}
              {showTriggers && socialProof && (
                <div className="space-y-2">
                  {socialProof.isTrending && (
                    <SocialProofBadge variant="trending" />
                  )}
                  {socialProof.totalPurchases && socialProof.totalPurchases > 0 && (
                    <SocialProofBadge
                      variant="purchases"
                      purchaseCount={socialProof.totalPurchases}
                    />
                  )}
                  {socialProof.rating && socialProof.rating > 0 && (
                    <SocialProofBadge
                      variant="rating"
                      rating={socialProof.rating}
                      reviewCount={socialProof.reviewCount}
                    />
                  )}
                </div>
              )}

              {cart.map((item) => (
                <CartItem
                  key={`${item.productId}-${item.variantId || ''}`}
                  item={item}
                  onUpdateQuantity={updateCartItem}
                  onRemove={() => handleRemoveClick(item.productId, item.variantId)}
                  showRemoveConfirmation={false}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        {cart.length > 0 && (
          <footer
            className="flex-shrink-0 border-t p-4 space-y-4"
            style={{
              backgroundColor: colors.footerBackground,
              borderColor: colors.border,
            }}
          >
            {/* Subtotal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: colors.bodyText }}>{content.subtotalLabel}</span>
                <span
                  className="font-semibold"
                  style={{ color: colors.headingText }}
                >
                  {formatCurrency(cartTotal)}
                </span>
              </div>
              <p className="text-xs" style={{ color: colors.mutedText }}>
                {content.shippingNote}
              </p>
            </div>

            {/* Checkout Button */}
            <button
              type="button"
              onClick={handleCheckout}
              className="w-full min-h-[52px] px-6 py-3 font-semibold rounded-lg hover:opacity-90 transition-all duration-200 touch-manipulation active:scale-[0.98] flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                backgroundColor: colors.primaryButton,
                color: colors.primaryButtonText,
                borderRadius: 'var(--cart-radius)',
              }}
            >
              {content.checkoutButtonText}
              <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Trust Signals (MI Trigger) */}
            {showTriggers && content.showSecurityBadge && (
              <TrustSignals
                layout="horizontal"
                signals={[
                  { type: 'secure', text: 'Secure checkout' },
                  { type: 'returns', text: '30-day returns' },
                  { type: 'support', text: '24/7 support' },
                ]}
              />
            )}

            {/* Security Badge (fallback when triggers disabled) */}
            {!showTriggers && content.showSecurityBadge && (
              <div
                className="flex items-center justify-center gap-1.5 text-xs"
                style={{ color: colors.mutedText }}
              >
                <LockClosedIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{content.securityText}</span>
              </div>
            )}
          </footer>
        )}
      </div>

      {/* Loss Aversion Modal (MI Trigger) */}
      {showTriggers && itemToRemove && (() => {
        const cartItem = cart.find(
          (i) => i.productId === itemToRemove.productId && i.variantId === itemToRemove.variantId
        );
        return (
          <LossAversionModal
            open={!!itemToRemove}
            onClose={() => setItemToRemove(null)}
            onConfirm={confirmRemove}
            onKeepItem={() => setItemToRemove(null)}
            item={{
              name: cartItem?.name || 'this item',
              price: cartItem?.price || 0,
              imageUrl: cartItem?.imageUrl,
              rating: socialProof?.rating,
              reviewCount: socialProof?.reviewCount,
              stockLevel: urgency?.stockRemaining,
            }}
          />
        );
      })()}
    </>
  );
}

// ============================================================================
// Main Component (with provider)
// ============================================================================

/**
 * ThemedCartDrawer - A customizable cart drawer with theming support
 *
 * This component wraps the cart drawer with a theme provider, allowing
 * full customization of colors, layout, content, and behavioral triggers.
 *
 * **Features:**
 * - 9 theme presets (Starter, Artisan, Velocity, Luxe, etc.)
 * - Customizable colors, layout, and content
 * - MI Cart behavioral triggers (urgency, scarcity, social proof)
 * - CSS variable-based styling for easy customization
 *
 * @example Basic usage with default theme
 * ```tsx
 * <ThemedCartDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
 * ```
 *
 * @example With custom theme
 * ```tsx
 * <ThemedCartDrawer
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   theme={{
 *     preset: 'LUXE',
 *     colors: { primaryButton: '#7C3AED' },
 *     content: { checkoutButtonText: 'Complete Purchase' },
 *   }}
 * />
 * ```
 *
 * @example With MI triggers
 * ```tsx
 * <ThemedCartDrawer
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   showTriggers={true}
 *   freeShippingThreshold={100}
 *   urgency={{
 *     type: 'countdown',
 *     message: 'Order in the next {time} for same-day shipping!',
 *     endTime: new Date(Date.now() + 3600000),
 *   }}
 *   socialProof={{
 *     totalPurchases: 1247,
 *     rating: 4.8,
 *     reviewCount: 523,
 *     isTrending: true,
 *   }}
 * />
 * ```
 */
export function ThemedCartDrawer({ theme, ...props }: ThemedCartDrawerProps) {
  return (
    <CartThemeProvider theme={theme}>
      <ThemedCartDrawerInner {...props} />
    </CartThemeProvider>
  );
}

export default ThemedCartDrawer;
