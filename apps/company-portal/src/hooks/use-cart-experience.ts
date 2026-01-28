'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFunnel } from '@/contexts/funnel-context';
import { CartTheme } from '@/contexts/cart-theme-context';
import { CartAbandonmentReason } from '@/lib/api/cart-recovery';

/**
 * useCartExperience - Unified hook for cart theming and MI triggers
 *
 * Combines:
 * - Cart theme configuration (from landing page)
 * - Behavioral triggers (urgency, scarcity, social proof)
 * - Checkout churn detection
 * - Cart save flow integration
 */

export interface CartExperienceConfig {
  /** Enable behavioral triggers */
  enableTriggers?: boolean;
  /** Free shipping threshold */
  freeShippingThreshold?: number;
  /** Urgency countdown end time */
  urgencyEndTime?: Date;
  /** Stock threshold for scarcity indicator */
  lowStockThreshold?: number;
  /** Low stock item data (from inventory) */
  lowStockItem?: {
    productId: string;
    stockRemaining: number;
  };
}

export interface UrgencyConfig {
  type: 'countdown' | 'stock' | 'demand';
  message: string;
  endTime?: Date;
  stockRemaining?: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SocialProofConfig {
  totalPurchases?: number;
  rating?: number;
  reviewCount?: number;
  isTrending?: boolean;
  recentPurchasers?: string[];
}

export interface CartExperience {
  // Theme
  theme: CartTheme | null;
  isThemeLoading: boolean;

  // Triggers
  urgency: UrgencyConfig | null;
  socialProof: SocialProofConfig | null;
  freeShippingProgress: { current: number; threshold: number; remaining: number } | null;

  // State
  isCartOpen: boolean;
  showLossAversionModal: boolean;
  itemToRemove: { productId: string; variantId?: string } | null;

  // Actions
  openCart: () => void;
  closeCart: () => void;
  confirmRemoveItem: (productId: string, variantId?: string) => void;
  cancelRemoveItem: () => void;
  executeRemoveItem: () => void;

  // Churn Detection
  trackCheckoutEvent: (event: CheckoutEvent) => Promise<void>;

  // Recovery
  initiateSaveFlow: (reason?: CartAbandonmentReason) => Promise<void>;
}

interface CheckoutEvent {
  type:
    | 'FIELD_FOCUS'
    | 'FIELD_BLUR'
    | 'TAB_BLUR'
    | 'TAB_FOCUS'
    | 'SCROLL_UP'
    | 'TOTAL_VIEWED'
    | 'BACK_NAVIGATION'
    | 'PAYMENT_METHOD_CHANGED'
    | 'PROMO_CODE_ATTEMPT'
    | 'CHECKOUT_STARTED'
    | 'CHECKOUT_STEP_CHANGED';
  field?: string;
  step?: string;
  duration?: number;
  promoCode?: string;
}

export function useCartExperience(config: CartExperienceConfig = {}): CartExperience {
  const {
    enableTriggers = true,
    freeShippingThreshold = 75,
    urgencyEndTime,
    lowStockThreshold = 10,
    lowStockItem,
  } = config;

  const { funnel, cart, cartTotal, session, cartId } = useFunnel();

  // State
  const [theme, setTheme] = useState<CartTheme | null>(null);
  const [isThemeLoading, setIsThemeLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showLossAversionModal, setShowLossAversionModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{ productId: string; variantId?: string } | null>(null);
  const [socialProofData, setSocialProofData] = useState<SocialProofConfig | null>(null);

  // Load theme from landing page
  useEffect(() => {
    const loadTheme = async () => {
      if (!funnel?.landingPageId) {
        setIsThemeLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/landing-pages/${funnel.landingPageId}/cart-theme`
        );
        if (response.ok) {
          const themeData = await response.json();
          setTheme(themeData);
        }
      } catch (error) {
        console.error('Failed to load cart theme:', error);
      } finally {
        setIsThemeLoading(false);
      }
    };

    loadTheme();
  }, [funnel?.landingPageId]);

  // Load social proof data
  useEffect(() => {
    if (!enableTriggers || !funnel?.companyId) return;

    const loadSocialProof = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/products/social-proof?companyId=${funnel.companyId}`
        );
        if (response.ok) {
          const data = await response.json();
          setSocialProofData(data);
        }
      } catch (error) {
        console.error('Failed to load social proof:', error);
      }
    };

    loadSocialProof();
  }, [enableTriggers, funnel?.companyId]);

  // Calculate urgency config
  const urgency = useMemo<UrgencyConfig | null>(() => {
    if (!enableTriggers) return null;

    // Countdown urgency
    if (urgencyEndTime && urgencyEndTime > new Date()) {
      const timeRemaining = urgencyEndTime.getTime() - Date.now();
      const hoursRemaining = timeRemaining / (1000 * 60 * 60);

      let urgencyLevel: UrgencyConfig['urgencyLevel'] = 'low';
      if (hoursRemaining <= 1) urgencyLevel = 'critical';
      else if (hoursRemaining <= 4) urgencyLevel = 'high';
      else if (hoursRemaining <= 12) urgencyLevel = 'medium';

      return {
        type: 'countdown',
        message: 'Order in the next {time} for same-day shipping!',
        endTime: urgencyEndTime,
        urgencyLevel,
      };
    }

    // Stock-based urgency (from config - inventory data passed by parent)
    if (lowStockItem && lowStockItem.stockRemaining <= lowStockThreshold) {
      return {
        type: 'stock',
        message: `Only ${lowStockItem.stockRemaining} left in stock!`,
        stockRemaining: lowStockItem.stockRemaining,
        urgencyLevel: lowStockItem.stockRemaining <= 3 ? 'critical' : 'high',
      };
    }

    return null;
  }, [enableTriggers, urgencyEndTime, lowStockItem, lowStockThreshold]);

  // Calculate free shipping progress
  const freeShippingProgress = useMemo(() => {
    if (!enableTriggers || freeShippingThreshold <= 0) return null;

    return {
      current: cartTotal,
      threshold: freeShippingThreshold,
      remaining: Math.max(0, freeShippingThreshold - cartTotal),
    };
  }, [enableTriggers, cartTotal, freeShippingThreshold]);

  // Actions
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const confirmRemoveItem = useCallback((productId: string, variantId?: string) => {
    setItemToRemove({ productId, variantId });
    setShowLossAversionModal(true);
  }, []);

  const cancelRemoveItem = useCallback(() => {
    setItemToRemove(null);
    setShowLossAversionModal(false);
  }, []);

  const executeRemoveItem = useCallback(() => {
    // The actual removal is handled by the cart drawer
    setItemToRemove(null);
    setShowLossAversionModal(false);
  }, []);

  // Track checkout events for churn detection
  const trackCheckoutEvent = useCallback(async (event: CheckoutEvent) => {
    if (!session?.sessionToken) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/momentum/cart-save/churn/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionToken,
          event,
        }),
      });
    } catch (error) {
      console.error('Failed to track checkout event:', error);
    }
  }, [session?.sessionToken]);

  // Initiate cart save flow
  const initiateSaveFlow = useCallback(async (reason?: CartAbandonmentReason) => {
    if (!cartId) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/momentum/cart-save/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          reason,
        }),
      });
    } catch (error) {
      console.error('Failed to initiate save flow:', error);
    }
  }, [cartId]);

  return {
    // Theme
    theme,
    isThemeLoading,

    // Triggers
    urgency,
    socialProof: socialProofData,
    freeShippingProgress,

    // State
    isCartOpen,
    showLossAversionModal,
    itemToRemove,

    // Actions
    openCart,
    closeCart,
    confirmRemoveItem,
    cancelRemoveItem,
    executeRemoveItem,

    // Churn Detection
    trackCheckoutEvent,

    // Recovery
    initiateSaveFlow,
  };
}

export default useCartExperience;
