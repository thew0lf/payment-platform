'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  Funnel,
  FunnelSession,
  SelectedProduct,
  CustomerInfo,
  startSession as apiStartSession,
  getSession as apiGetSession,
  updateSession as apiUpdateSession,
  trackEvent as apiTrackEvent,
  advanceStage as apiAdvanceStage,
  completeSession as apiCompleteSession,
} from '@/lib/api';

interface FunnelState {
  funnel: Funnel | null;
  session: FunnelSession | null;
  currentStageIndex: number;
  cart: SelectedProduct[];
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  error: string | null;
}

type FunnelAction =
  | { type: 'SET_FUNNEL'; payload: Funnel }
  | { type: 'SET_SESSION'; payload: FunnelSession }
  | { type: 'SET_STAGE'; payload: number }
  | { type: 'ADD_TO_CART'; payload: SelectedProduct }
  | { type: 'UPDATE_CART_ITEM'; payload: { productId: string; quantity: number } }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_CUSTOMER_INFO'; payload: CustomerInfo }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: FunnelState = {
  funnel: null,
  session: null,
  currentStageIndex: 0,
  cart: [],
  customerInfo: null,
  isLoading: false,
  error: null,
};

function funnelReducer(state: FunnelState, action: FunnelAction): FunnelState {
  switch (action.type) {
    case 'SET_FUNNEL':
      return { ...state, funnel: action.payload };
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
      return { ...state, cart: [] };
    case 'SET_CUSTOMER_INFO':
      return { ...state, customerInfo: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
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
}

const FunnelContext = createContext<FunnelContextValue | null>(null);

const SESSION_STORAGE_KEY = 'funnel_session_token';

export function FunnelProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(funnelReducer, initialState);

  // Calculate derived values
  const cartTotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const currentStage = state.funnel?.stages[state.currentStageIndex] ?? null;
  const progress = state.funnel
    ? ((state.currentStageIndex + 1) / state.funnel.stages.length) * 100
    : 0;

  // Initialize funnel and session
  const initializeFunnel = useCallback(async (funnel: Funnel) => {
    dispatch({ type: 'SET_FUNNEL', payload: funnel });
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
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
        } catch {
          // Session expired or invalid, create new one
          sessionStorage.removeItem(`${SESSION_STORAGE_KEY}_${funnel.id}`);
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
    } catch (error) {
      console.error('Failed to initialize funnel session:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to start session' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Sync cart with server
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

  // Cart actions
  const addToCart = useCallback((product: SelectedProduct) => {
    dispatch({ type: 'ADD_TO_CART', payload: product });
    if (state.session) {
      apiTrackEvent(state.session.sessionToken, {
        type: 'ADD_TO_CART',
        stageOrder: state.currentStageIndex,
        metadata: { productId: product.productId, quantity: product.quantity },
      });
    }
  }, [state.session, state.currentStageIndex]);

  const updateCartItem = useCallback((productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_CART_ITEM', payload: { productId, quantity } });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: productId });
    if (state.session) {
      apiTrackEvent(state.session.sessionToken, {
        type: 'REMOVE_FROM_CART',
        stageOrder: state.currentStageIndex,
        metadata: { productId },
      });
    }
  }, [state.session, state.currentStageIndex]);

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
