'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import {
  Funnel,
  FunnelSession,
  SelectedProduct,
  CustomerInfo,
  Cart,
  CartTotals,
  CartItem,
  startSession as apiStartSession,
  getSession as apiGetSession,
  updateSession as apiUpdateSession,
  trackEvent as apiTrackEvent,
  advanceStage as apiAdvanceStage,
  completeSession as apiCompleteSession,
  getCartBySession,
  createCart,
  addCartItem as apiAddCartItem,
  updateCartItem as apiUpdateCartItem,
  removeCartItem as apiRemoveCartItem,
  applyCartDiscount,
  removeCartDiscount,
} from '@/lib/api';

interface FunnelState {
  funnel: Funnel | null;
  session: FunnelSession | null;
  currentStageIndex: number;
  cart: SelectedProduct[];
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  error: string | null;
  isDemoMode: boolean;
  // Cart service state
  cartId: string | null;
  cartData: Cart | null;
  cartError: string | null;
  isCartLoading: boolean;
}

type FunnelAction =
  | { type: 'SET_FUNNEL'; payload: { funnel: Funnel; isDemoMode: boolean } }
  | { type: 'SET_SESSION'; payload: FunnelSession }
  | { type: 'SET_STAGE'; payload: number }
  | { type: 'ADD_TO_CART'; payload: SelectedProduct }
  | { type: 'UPDATE_CART_ITEM'; payload: { productId: string; quantity: number } }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CUSTOMER_INFO'; payload: CustomerInfo }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  // Cart service actions
  | { type: 'SET_CART_ID'; payload: string | null }
  | { type: 'SET_CART_DATA'; payload: Cart | null }
  | { type: 'SET_CART_LOADING'; payload: boolean }
  | { type: 'SET_CART_ERROR'; payload: string | null }
  | { type: 'SYNC_CART_FROM_BACKEND'; payload: Cart };

const initialState: FunnelState = {
  funnel: null,
  session: null,
  currentStageIndex: 0,
  cart: [],
  customerInfo: null,
  isLoading: false,
  error: null,
  isDemoMode: false,
  // Cart service state
  cartId: null,
  cartData: null,
  cartError: null,
  isCartLoading: false,
};

function funnelReducer(state: FunnelState, action: FunnelAction): FunnelState {
  switch (action.type) {
    case 'SET_FUNNEL':
      return { ...state, funnel: action.payload.funnel, isDemoMode: action.payload.isDemoMode };
    case 'SET_SESSION':
      return {
        ...state,
        session: action.payload,
        currentStageIndex: action.payload.currentStageOrder,
        cart: action.payload.selectedProducts || [],
        customerInfo: action.payload.customerInfo || null,
      };
    case 'SET_STAGE':
      return { ...state, currentStageIndex: action.payload };
    case 'ADD_TO_CART': {
      const existingIndex = state.cart.findIndex(
        (item) =>
          item.productId === action.payload.productId &&
          item.variantId === action.payload.variantId
      );
      if (existingIndex >= 0) {
        const newCart = [...state.cart];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + action.payload.quantity,
        };
        return { ...state, cart: newCart };
      }
      return { ...state, cart: [...state.cart, action.payload] };
    }
    case 'UPDATE_CART_ITEM': {
      const newCart = state.cart.map((item) =>
        item.productId === action.payload.productId
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      return { ...state, cart: newCart.filter((item) => item.quantity > 0) };
    }
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter((item) => item.productId !== action.payload),
      };
    case 'CLEAR_CART':
      return { ...state, cart: [], cartData: null, cartId: null };
    case 'SET_CUSTOMER_INFO':
      return { ...state, customerInfo: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    // Cart service reducers
    case 'SET_CART_ID':
      return { ...state, cartId: action.payload };
    case 'SET_CART_DATA':
      return { ...state, cartData: action.payload };
    case 'SET_CART_LOADING':
      return { ...state, isCartLoading: action.payload };
    case 'SET_CART_ERROR':
      return { ...state, cartError: action.payload };
    case 'SYNC_CART_FROM_BACKEND': {
      // Sync cart array from backend CartData for UI compatibility
      const backendItems = action.payload.items || [];
      const syncedCart: SelectedProduct[] = backendItems.map((item: CartItem) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.unitPrice,
        name: item.productSnapshot.name,
        imageUrl: item.productSnapshot.image,
      }));
      return {
        ...state,
        cartData: action.payload,
        cartId: action.payload.id,
        cart: syncedCart,
        isCartLoading: false,
        cartError: null,
      };
    }
    default:
      return state;
  }
}

interface FunnelContextValue extends FunnelState {
  initializeFunnel: (funnel: Funnel) => Promise<void>;
  addToCart: (product: SelectedProduct) => void;
  updateCartItem: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  setCustomerInfo: (info: CustomerInfo) => void;
  nextStage: () => Promise<void>;
  prevStage: () => void;
  goToStage: (index: number) => Promise<void>;
  completeOrder: (orderId: string, totalAmount: number, currency: string) => Promise<void>;
  trackEvent: (type: string, metadata?: Record<string, unknown>) => void;
  cartTotal: number;
  cartCount: number;
  currentStage: Funnel['stages'][0] | null;
  progress: number;
  // New cart service methods
  applyDiscountCode: (code: string) => Promise<boolean>;
  removeDiscountCode: (code: string) => Promise<boolean>;
  refreshCart: () => Promise<void>;
  // Backend cart data
  backendCartTotals: CartTotals | null;
  discountCodes: Cart['discountCodes'];
}

const FunnelContext = createContext<FunnelContextValue | null>(null);

const SESSION_STORAGE_KEY = 'funnel_session_token';
const CART_STORAGE_KEY = 'funnel_cart_id';

export function FunnelProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(funnelReducer, initialState);

  // Refs to store session info for cart operations
  const sessionTokenRef = useRef<string | null>(null);
  const companyIdRef = useRef<string | null>(null);

  // Calculate derived values
  const cartTotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const currentStage = state.funnel?.stages[state.currentStageIndex] ?? null;
  const progress = state.funnel
    ? ((state.currentStageIndex + 1) / state.funnel.stages.length) * 100
    : 0;

  // Backend cart totals (prefer these over local calculations when available)
  const backendCartTotals = state.cartData?.totals || null;
  const discountCodes = state.cartData?.discountCodes || [];

  /**
   * Initialize or retrieve cart from backend
   */
  const initializeCart = useCallback(async (
    sessionToken: string,
    companyId: string,
    funnelId: string
  ): Promise<Cart | null> => {
    dispatch({ type: 'SET_CART_LOADING', payload: true });
    sessionTokenRef.current = sessionToken;
    companyIdRef.current = companyId;

    try {
      // Check for existing cart ID in session storage
      const storedCartId = typeof window !== 'undefined'
        ? sessionStorage.getItem(`${CART_STORAGE_KEY}_${funnelId}`)
        : null;

      // Try to get existing cart by session token
      let cart = await getCartBySession(sessionToken, companyId);

      // Create new cart if it doesn't exist
      if (!cart) {
        const utmParams = typeof window !== 'undefined'
          ? parseUTMParams(window.location.search)
          : undefined;

        cart = await createCart(companyId, {
          visitorId: storedCartId || undefined,
          utmSource: utmParams?.source,
          utmMedium: utmParams?.medium,
          utmCampaign: utmParams?.campaign,
        });

        // Store cart ID for recovery
        if (typeof window !== 'undefined' && cart) {
          sessionStorage.setItem(`${CART_STORAGE_KEY}_${funnelId}`, cart.id);
        }
      }

      if (cart) {
        dispatch({ type: 'SYNC_CART_FROM_BACKEND', payload: cart });
      } else {
        dispatch({ type: 'SET_CART_LOADING', payload: false });
      }

      return cart;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize cart';
      console.error('Cart initialization error:', message);
      dispatch({ type: 'SET_CART_ERROR', payload: message });
      dispatch({ type: 'SET_CART_LOADING', payload: false });
      return null;
    }
  }, []);

  // Initialize funnel and session
  const initializeFunnel = useCallback(async (funnel: Funnel) => {
    // Detect demo mode from settings or slug pattern
    const isDemoMode = detectDemoMode(funnel);
    dispatch({ type: 'SET_FUNNEL', payload: { funnel, isDemoMode } });
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // Check for existing session
      const existingToken = typeof window !== 'undefined'
        ? sessionStorage.getItem(`${SESSION_STORAGE_KEY}_${funnel.id}`)
        : null;

      if (existingToken) {
        try {
          const session = await apiGetSession(existingToken);
          if (session.status === 'ACTIVE') {
            dispatch({ type: 'SET_SESSION', payload: session });

            // Initialize cart with existing session
            await initializeCart(session.sessionToken, funnel.companyId, funnel.id);

            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
        } catch (error) {
          // Session expired or invalid, create new one
          console.debug('Session validation failed, creating new session:', error instanceof Error ? error.message : 'unknown error');
          sessionStorage.removeItem(`${SESSION_STORAGE_KEY}_${funnel.id}`);
          sessionStorage.removeItem(`${CART_STORAGE_KEY}_${funnel.id}`);
        }
      }

      // Create new session
      const utmParams = typeof window !== 'undefined'
        ? parseUTMParams(window.location.search)
        : undefined;

      const session = await apiStartSession(funnel.id, {
        utmParams,
        referrer: typeof window !== 'undefined' ? document.referrer : undefined,
        device: typeof window !== 'undefined' ? getDeviceType() : undefined,
        entryStageOrder: 0,
      });

      // Store session token
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`${SESSION_STORAGE_KEY}_${funnel.id}`, session.sessionToken);
      }

      dispatch({ type: 'SET_SESSION', payload: session });

      // Initialize cart with new session
      await initializeCart(session.sessionToken, funnel.companyId, funnel.id);

    } catch (error) {
      console.error('Failed to initialize funnel session:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to start session' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [initializeCart]);

  // Sync cart with server (debounced update to funnel session)
  useEffect(() => {
    if (state.session && state.cart.length > 0) {
      const syncCart = async () => {
        try {
          await apiUpdateSession(state.session!.sessionToken, {
            selectedProducts: state.cart,
          });
        } catch (error) {
          console.error('Failed to sync cart:', error);
        }
      };
      const timeout = setTimeout(syncCart, 500); // Debounce
      return () => clearTimeout(timeout);
    }
  }, [state.session, state.cart]);

  /**
   * Add item to cart - syncs with backend CartService
   */
  const addToCart = useCallback(async (product: SelectedProduct) => {
    // Optimistic UI update
    dispatch({ type: 'ADD_TO_CART', payload: product });

    // Track event
    if (state.session) {
      apiTrackEvent(state.session.sessionToken, {
        type: 'ADD_TO_CART',
        stageOrder: state.currentStageIndex,
        metadata: { productId: product.productId, quantity: product.quantity },
      });
    }

    // Sync with backend cart
    const { cartData } = state;
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (cartData?.id && sessionToken && companyId) {
      dispatch({ type: 'SET_CART_LOADING', payload: true });
      try {
        const cartSessionToken = cartData.sessionToken || sessionToken;
        const updatedCart = await apiAddCartItem(
          cartData.id,
          cartSessionToken,
          companyId,
          {
            productId: product.productId,
            variantId: product.variantId,
            quantity: product.quantity,
          }
        );
        dispatch({ type: 'SYNC_CART_FROM_BACKEND', payload: updatedCart });
      } catch (error) {
        console.error('Failed to sync add to cart with backend:', error);
        dispatch({ type: 'SET_CART_ERROR', payload: 'Failed to add item to cart' });
        dispatch({ type: 'SET_CART_LOADING', payload: false });
      }
    }
  }, [state.session, state.currentStageIndex, state.cartData]);

  /**
   * Update cart item quantity - syncs with backend CartService
   */
  const updateCartItem = useCallback(async (productId: string, quantity: number) => {
    // Optimistic UI update
    dispatch({ type: 'UPDATE_CART_ITEM', payload: { productId, quantity } });

    // Sync with backend cart
    const { cartData } = state;
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (cartData?.id && sessionToken && companyId) {
      // Find the cart item ID from backend cart
      const cartItem = cartData.items.find(item => item.productId === productId);

      if (cartItem) {
        dispatch({ type: 'SET_CART_LOADING', payload: true });
        try {
          const cartSessionToken = cartData.sessionToken || sessionToken;

          let updatedCart: Cart;
          if (quantity <= 0) {
            // Remove item if quantity is 0 or less
            updatedCart = await apiRemoveCartItem(
              cartData.id,
              cartItem.id,
              cartSessionToken,
              companyId
            );
          } else {
            updatedCart = await apiUpdateCartItem(
              cartData.id,
              cartItem.id,
              cartSessionToken,
              companyId,
              { quantity }
            );
          }
          dispatch({ type: 'SYNC_CART_FROM_BACKEND', payload: updatedCart });
        } catch (error) {
          console.error('Failed to sync update cart with backend:', error);
          dispatch({ type: 'SET_CART_ERROR', payload: 'Failed to update cart item' });
          dispatch({ type: 'SET_CART_LOADING', payload: false });
        }
      }
    }
  }, [state.cartData]);

  /**
   * Remove item from cart - syncs with backend CartService
   */
  const removeFromCart = useCallback(async (productId: string) => {
    // Optimistic UI update
    dispatch({ type: 'REMOVE_FROM_CART', payload: productId });

    // Track event
    if (state.session) {
      apiTrackEvent(state.session.sessionToken, {
        type: 'REMOVE_FROM_CART',
        stageOrder: state.currentStageIndex,
        metadata: { productId },
      });
    }

    // Sync with backend cart
    const { cartData } = state;
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (cartData?.id && sessionToken && companyId) {
      // Find the cart item ID from backend cart
      const cartItem = cartData.items.find(item => item.productId === productId);

      if (cartItem) {
        dispatch({ type: 'SET_CART_LOADING', payload: true });
        try {
          const cartSessionToken = cartData.sessionToken || sessionToken;
          const updatedCart = await apiRemoveCartItem(
            cartData.id,
            cartItem.id,
            cartSessionToken,
            companyId
          );
          dispatch({ type: 'SYNC_CART_FROM_BACKEND', payload: updatedCart });
        } catch (error) {
          console.error('Failed to sync remove from cart with backend:', error);
          dispatch({ type: 'SET_CART_ERROR', payload: 'Failed to remove item from cart' });
          dispatch({ type: 'SET_CART_LOADING', payload: false });
        }
      }
    }
  }, [state.session, state.currentStageIndex, state.cartData]);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  // Customer info
  const setCustomerInfo = useCallback(async (info: CustomerInfo) => {
    dispatch({ type: 'SET_CUSTOMER_INFO', payload: info });
    if (state.session) {
      try {
        await apiUpdateSession(state.session.sessionToken, { customerInfo: info });
      } catch (error) {
        console.error('Failed to update customer info:', error);
      }
    }
  }, [state.session]);

  // Stage navigation
  const nextStage = useCallback(async () => {
    if (!state.funnel || !state.session) return;
    const nextIndex = state.currentStageIndex + 1;
    if (nextIndex < state.funnel.stages.length) {
      try {
        await apiAdvanceStage(state.session.sessionToken, nextIndex);
        dispatch({ type: 'SET_STAGE', payload: nextIndex });
        apiTrackEvent(state.session.sessionToken, {
          type: 'STAGE_ENTERED',
          stageOrder: nextIndex,
        });
      } catch (error) {
        console.error('Failed to advance stage:', error);
      }
    }
  }, [state.funnel, state.session, state.currentStageIndex]);

  const prevStage = useCallback(() => {
    if (!state.funnel?.settings.behavior.allowBackNavigation) return;
    if (state.currentStageIndex > 0) {
      dispatch({ type: 'SET_STAGE', payload: state.currentStageIndex - 1 });
    }
  }, [state.funnel, state.currentStageIndex]);

  const goToStage = useCallback(async (index: number) => {
    if (!state.funnel || !state.session) return;
    if (index >= 0 && index < state.funnel.stages.length) {
      if (index > state.currentStageIndex) {
        await apiAdvanceStage(state.session.sessionToken, index);
      }
      dispatch({ type: 'SET_STAGE', payload: index });
    }
  }, [state.funnel, state.session, state.currentStageIndex]);

  // Complete order
  const completeOrder = useCallback(async (
    orderId: string,
    totalAmount: number,
    currency: string
  ) => {
    if (!state.session) return;
    try {
      await apiCompleteSession(state.session.sessionToken, {
        orderId,
        totalAmount,
        currency,
      });
      // Clear session storage
      if (typeof window !== 'undefined' && state.funnel) {
        sessionStorage.removeItem(`${SESSION_STORAGE_KEY}_${state.funnel.id}`);
        sessionStorage.removeItem(`${CART_STORAGE_KEY}_${state.funnel.id}`);
      }
    } catch (error) {
      console.error('Failed to complete order:', error);
      throw error;
    }
  }, [state.session, state.funnel]);

  // Track custom event
  const trackEvent = useCallback((type: string, metadata?: Record<string, unknown>) => {
    if (state.session) {
      apiTrackEvent(state.session.sessionToken, {
        type,
        stageOrder: state.currentStageIndex,
        metadata,
      });
    }
  }, [state.session, state.currentStageIndex]);

  /**
   * Apply discount code to cart
   */
  const applyDiscountCode = useCallback(async (code: string): Promise<boolean> => {
    const { cartData } = state;
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (!cartData?.id || !sessionToken || !companyId) {
      console.error('Cannot apply discount: cart not initialized');
      return false;
    }

    dispatch({ type: 'SET_CART_LOADING', payload: true });
    dispatch({ type: 'SET_CART_ERROR', payload: null });

    try {
      const cartSessionToken = cartData.sessionToken || sessionToken;
      const updatedCart = await applyCartDiscount(cartData.id, cartSessionToken, companyId, code);
      dispatch({ type: 'SYNC_CART_FROM_BACKEND', payload: updatedCart });

      // Track event
      if (state.session) {
        apiTrackEvent(state.session.sessionToken, {
          type: 'DISCOUNT_APPLIED',
          stageOrder: state.currentStageIndex,
          metadata: { code },
        });
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid discount code';
      console.error('Failed to apply discount:', message);
      dispatch({ type: 'SET_CART_ERROR', payload: message });
      dispatch({ type: 'SET_CART_LOADING', payload: false });
      return false;
    }
  }, [state.cartData, state.session, state.currentStageIndex]);

  /**
   * Remove discount code from cart
   */
  const removeDiscountCode = useCallback(async (code: string): Promise<boolean> => {
    const { cartData } = state;
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (!cartData?.id || !sessionToken || !companyId) {
      console.error('Cannot remove discount: cart not initialized');
      return false;
    }

    dispatch({ type: 'SET_CART_LOADING', payload: true });
    dispatch({ type: 'SET_CART_ERROR', payload: null });

    try {
      const cartSessionToken = cartData.sessionToken || sessionToken;
      const updatedCart = await removeCartDiscount(cartData.id, code, cartSessionToken, companyId);
      dispatch({ type: 'SYNC_CART_FROM_BACKEND', payload: updatedCart });

      // Track event
      if (state.session) {
        apiTrackEvent(state.session.sessionToken, {
          type: 'DISCOUNT_REMOVED',
          stageOrder: state.currentStageIndex,
          metadata: { code },
        });
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove discount';
      console.error('Failed to remove discount:', message);
      dispatch({ type: 'SET_CART_ERROR', payload: message });
      dispatch({ type: 'SET_CART_LOADING', payload: false });
      return false;
    }
  }, [state.cartData, state.session, state.currentStageIndex]);

  /**
   * Refresh cart data from backend
   */
  const refreshCart = useCallback(async (): Promise<void> => {
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (!sessionToken || !companyId) {
      console.error('Cannot refresh cart: session not initialized');
      return;
    }

    dispatch({ type: 'SET_CART_LOADING', payload: true });

    try {
      const cart = await getCartBySession(sessionToken, companyId);
      if (cart) {
        dispatch({ type: 'SYNC_CART_FROM_BACKEND', payload: cart });
      } else {
        dispatch({ type: 'SET_CART_LOADING', payload: false });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh cart';
      console.error('Failed to refresh cart:', message);
      dispatch({ type: 'SET_CART_ERROR', payload: message });
      dispatch({ type: 'SET_CART_LOADING', payload: false });
    }
  }, []);

  const value: FunnelContextValue = {
    ...state,
    initializeFunnel,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    setCustomerInfo,
    nextStage,
    prevStage,
    goToStage,
    completeOrder,
    trackEvent,
    cartTotal,
    cartCount,
    currentStage,
    progress,
    // New cart service methods
    applyDiscountCode,
    removeDiscountCode,
    refreshCart,
    // Backend cart data
    backendCartTotals,
    discountCodes,
  };

  return (
    <FunnelContext.Provider value={value}>
      {children}
    </FunnelContext.Provider>
  );
}

export function useFunnel() {
  const context = useContext(FunnelContext);
  if (!context) {
    throw new Error('useFunnel must be used within a FunnelProvider');
  }
  return context;
}

/**
 * Optional version of useFunnel that returns null when outside FunnelProvider
 * Use this for components that can work both inside and outside funnel context
 */
export function useFunnelOptional(): FunnelContextValue | null {
  return useContext(FunnelContext);
}

// Utility functions
function parseUTMParams(search: string): Record<string, string> | undefined {
  const params = new URLSearchParams(search);
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const utm: Record<string, string> = {};

  utmKeys.forEach((key) => {
    const value = params.get(key);
    if (value) {
      utm[key.replace('utm_', '')] = value;
    }
  });

  return Object.keys(utm).length > 0 ? utm : undefined;
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Detect if a funnel is in demo mode
 * Checks funnel settings.isDemoMode flag or seoSlug patterns
 */
function detectDemoMode(funnel: Funnel): boolean {
  // Check explicit demo mode flag in settings
  if (funnel.settings?.isDemoMode === true) {
    return true;
  }

  // Check slug patterns for demo indicators
  const slug = funnel.slug?.toLowerCase() || '';
  const demoPatterns = ['demo', 'test', 'sample', 'example'];

  return demoPatterns.some((pattern) => slug.includes(pattern));
}
