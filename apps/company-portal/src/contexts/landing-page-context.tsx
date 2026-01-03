'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import {
  Cart,
  CartTotals,
  CartItem,
  SelectedProduct,
  getCartBySession,
  createCart,
  addCartItem as apiAddCartItem,
  updateCartItem as apiUpdateCartItem,
  removeCartItem as apiRemoveCartItem,
  applyCartDiscount,
  removeCartDiscount,
} from '@/lib/api';

// ═══════════════════════════════════════════════════════════════
// LANDING PAGE TYPES
// ═══════════════════════════════════════════════════════════════

export type LandingPageSectionType =
  | 'HERO'
  | 'FEATURES'
  | 'TESTIMONIALS'
  | 'PRODUCT_SELECTION'
  | 'FAQ'
  | 'CTA'
  | 'CUSTOM'
  // Legacy lowercase types for backwards compatibility
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'faq'
  | 'cta'
  | 'products'
  | 'gallery'
  | 'custom';

export interface LandingPageSection {
  id: string;
  type: LandingPageSectionType;
  content: Record<string, unknown>;
  styles?: {
    backgroundColor?: string;
    textColor?: string;
    paddingTop?: string;
    paddingBottom?: string;
    [key: string]: unknown;
  };
  order: number;
  enabled: boolean;
  // Legacy field for backwards compatibility
  config?: Record<string, unknown>;
}

export interface LandingPageBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor?: string;
  fontFamily?: string;
}

export interface LandingPageSettings {
  branding: LandingPageBranding;
  seo: {
    title?: string;
    description?: string;
    ogImage?: string;
  };
  behavior: {
    showCart: boolean;
    enableCheckout: boolean;
    trackingEnabled: boolean;
  };
  urls: {
    successUrl?: string;
    termsUrl?: string;
    privacyUrl?: string;
  };
}

export interface LandingPageColorScheme {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
}

export interface LandingPageTypography {
  headingFont?: string;
  bodyFont?: string;
  baseFontSize?: number;
}

export interface LandingPage {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';
  settings: LandingPageSettings;
  sections: LandingPageSection[];
  totalVisits: number;
  totalConversions: number;
  // Additional fields for renderer
  colorScheme?: LandingPageColorScheme;
  typography?: LandingPageTypography;
  logoUrl?: string;
  faviconUrl?: string;
  termsUrl?: string;
  privacyUrl?: string;
}

export interface LandingPageSession {
  id: string;
  landingPageId: string;
  sessionToken: string;
  status: 'ACTIVE' | 'CONVERTED' | 'ABANDONED' | 'EXPIRED';
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  device?: string;
  referrer?: string;
  createdAt: string;
  lastActivityAt: string;
}

// ═══════════════════════════════════════════════════════════════
// LANDING PAGE API FUNCTIONS
// These functions call the landing page API endpoints
// ═══════════════════════════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function getLandingPageBySlug(slug: string): Promise<LandingPage> {
  const res = await fetch(`${API_BASE}/api/lp/${slug}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch landing page: ${res.status}`);
  }
  return res.json();
}

export async function startLandingPageSession(
  landingPageId: string,
  companyId: string,
  data: {
    utmParams?: Record<string, string>;
    referrer?: string;
    device?: string;
  }
): Promise<LandingPageSession> {
  const res = await fetch(`${API_BASE}/api/lp/${landingPageId}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-company-id': companyId,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to start session: ${res.status}`);
  }
  return res.json();
}

export async function getLandingPageSession(sessionToken: string): Promise<LandingPageSession> {
  const res = await fetch(`${API_BASE}/api/lp/sessions/${sessionToken}`, {
    cache: 'no-store',
    headers: {
      'x-session-token': sessionToken,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to get session: ${res.status}`);
  }
  return res.json();
}

export async function trackLandingPageEvent(
  sessionToken: string,
  event: {
    type: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await fetch(`${API_BASE}/api/lp/sessions/${sessionToken}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': sessionToken,
    },
    body: JSON.stringify(event),
  });
}

export async function getLandingPageCart(
  sessionToken: string,
  companyId: string
): Promise<Cart | null> {
  return getCartBySession(sessionToken, companyId);
}

// ═══════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

interface LandingPageState {
  landingPage: LandingPage | null;
  session: LandingPageSession | null;
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  isCartDrawerOpen: boolean;
  // Internal cart state for optimistic updates
  localCart: SelectedProduct[];
  isCartLoading: boolean;
  cartError: string | null;
}

type LandingPageAction =
  | { type: 'SET_LANDING_PAGE'; payload: LandingPage }
  | { type: 'SET_SESSION'; payload: LandingPageSession }
  | { type: 'SET_CART'; payload: Cart | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CART_DRAWER_OPEN'; payload: boolean }
  | { type: 'ADD_TO_LOCAL_CART'; payload: SelectedProduct }
  | { type: 'UPDATE_LOCAL_CART_ITEM'; payload: { productId: string; quantity: number } }
  | { type: 'REMOVE_FROM_LOCAL_CART'; payload: string }
  | { type: 'CLEAR_LOCAL_CART' }
  | { type: 'SET_CART_LOADING'; payload: boolean }
  | { type: 'SET_CART_ERROR'; payload: string | null }
  | { type: 'SYNC_CART_FROM_BACKEND'; payload: Cart };

const initialState: LandingPageState = {
  landingPage: null,
  session: null,
  cart: null,
  isLoading: false,
  error: null,
  isCartDrawerOpen: false,
  localCart: [],
  isCartLoading: false,
  cartError: null,
};

function landingPageReducer(state: LandingPageState, action: LandingPageAction): LandingPageState {
  switch (action.type) {
    case 'SET_LANDING_PAGE':
      return { ...state, landingPage: action.payload };

    case 'SET_SESSION':
      return { ...state, session: action.payload };

    case 'SET_CART':
      return { ...state, cart: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_CART_DRAWER_OPEN':
      return { ...state, isCartDrawerOpen: action.payload };

    case 'ADD_TO_LOCAL_CART': {
      const existingIndex = state.localCart.findIndex(
        (item) =>
          item.productId === action.payload.productId &&
          item.variantId === action.payload.variantId
      );
      if (existingIndex >= 0) {
        const newCart = [...state.localCart];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + action.payload.quantity,
        };
        return { ...state, localCart: newCart };
      }
      return { ...state, localCart: [...state.localCart, action.payload] };
    }

    case 'UPDATE_LOCAL_CART_ITEM': {
      const newCart = state.localCart.map((item) =>
        item.productId === action.payload.productId
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      return { ...state, localCart: newCart.filter((item) => item.quantity > 0) };
    }

    case 'REMOVE_FROM_LOCAL_CART':
      return {
        ...state,
        localCart: state.localCart.filter((item) => item.productId !== action.payload),
      };

    case 'CLEAR_LOCAL_CART':
      return { ...state, localCart: [], cart: null };

    case 'SET_CART_LOADING':
      return { ...state, isCartLoading: action.payload };

    case 'SET_CART_ERROR':
      return { ...state, cartError: action.payload };

    case 'SYNC_CART_FROM_BACKEND': {
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
        cart: action.payload,
        localCart: syncedCart,
        isCartLoading: false,
        cartError: null,
      };
    }

    default:
      return state;
  }
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════

interface LandingPageContextValue extends LandingPageState {
  // Initialization
  initializeLandingPage: (slug: string) => Promise<void>;
  // Cart operations
  addToCart: (productId: string, quantity: number, variantId?: string, productInfo?: { price: number; name: string; imageUrl?: string }) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => void;
  // Analytics
  trackEvent: (eventType: string, eventData?: Record<string, unknown>) => void;
  // Cart drawer
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  // Discount codes
  applyDiscountCode: (code: string) => Promise<boolean>;
  removeDiscountCode: (code: string) => Promise<boolean>;
  // Refresh
  refreshCart: () => Promise<void>;
  // Computed values
  cartTotal: number;
  cartCount: number;
  backendCartTotals: CartTotals | null;
  // Navigation
  scrollToSection: (index: number) => void;
}

const LandingPageContext = createContext<LandingPageContextValue | null>(null);

const SESSION_STORAGE_KEY = 'lp_session_token';
const CART_STORAGE_KEY = 'lp_cart_id';

export function LandingPageProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(landingPageReducer, initialState);

  // Refs for cart operations
  const sessionTokenRef = useRef<string | null>(null);
  const companyIdRef = useRef<string | null>(null);

  // Calculate derived values
  const cartTotal = state.localCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = state.localCart.reduce((sum, item) => sum + item.quantity, 0);
  const backendCartTotals = state.cart?.totals || null;

  /**
   * Initialize or retrieve cart from backend
   */
  const initializeCart = useCallback(async (
    sessionToken: string,
    companyId: string,
    landingPageId: string
  ): Promise<Cart | null> => {
    dispatch({ type: 'SET_CART_LOADING', payload: true });
    sessionTokenRef.current = sessionToken;
    companyIdRef.current = companyId;

    try {
      // Check for existing cart ID in localStorage
      const storedCartId = typeof window !== 'undefined'
        ? localStorage.getItem(`${CART_STORAGE_KEY}_${landingPageId}`)
        : null;

      // Try to get existing cart by session token
      let cart = await getLandingPageCart(sessionToken, companyId);

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
          localStorage.setItem(`${CART_STORAGE_KEY}_${landingPageId}`, cart.id);
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

  /**
   * Initialize landing page and session
   */
  const initializeLandingPage = useCallback(async (slug: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Fetch landing page data
      const landingPage = await getLandingPageBySlug(slug);
      dispatch({ type: 'SET_LANDING_PAGE', payload: landingPage });

      // Check for existing session
      const existingToken = typeof window !== 'undefined'
        ? localStorage.getItem(`${SESSION_STORAGE_KEY}_${landingPage.id}`)
        : null;

      if (existingToken) {
        try {
          const session = await getLandingPageSession(existingToken);
          if (session.status === 'ACTIVE') {
            dispatch({ type: 'SET_SESSION', payload: session });
            sessionTokenRef.current = session.sessionToken;
            companyIdRef.current = landingPage.companyId;

            // Initialize cart with existing session
            await initializeCart(session.sessionToken, landingPage.companyId, landingPage.id);

            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
        } catch {
          // Session expired or invalid, create new one
          console.debug('Session validation failed, creating new session');
          localStorage.removeItem(`${SESSION_STORAGE_KEY}_${landingPage.id}`);
          localStorage.removeItem(`${CART_STORAGE_KEY}_${landingPage.id}`);
        }
      }

      // Create new session
      const utmParams = typeof window !== 'undefined'
        ? parseUTMParams(window.location.search)
        : undefined;

      const session = await startLandingPageSession(landingPage.id, landingPage.companyId, {
        utmParams,
        referrer: typeof window !== 'undefined' ? document.referrer : undefined,
        device: typeof window !== 'undefined' ? getDeviceType() : undefined,
      });

      // Store session token in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${SESSION_STORAGE_KEY}_${landingPage.id}`, session.sessionToken);
      }

      dispatch({ type: 'SET_SESSION', payload: session });
      sessionTokenRef.current = session.sessionToken;
      companyIdRef.current = landingPage.companyId;

      // Initialize cart with new session
      await initializeCart(session.sessionToken, landingPage.companyId, landingPage.id);

    } catch (error) {
      console.error('Failed to initialize landing page:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load landing page',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [initializeCart]);

  /**
   * Restore session on mount from localStorage
   */
  useEffect(() => {
    // This effect runs on mount to check for existing session
    // The actual initialization happens via initializeLandingPage which should be called by the page component
  }, []);

  /**
   * Add item to cart
   */
  const addToCart = useCallback(async (
    productId: string,
    quantity: number,
    variantId?: string,
    productInfo?: { price: number; name: string; imageUrl?: string }
  ) => {
    // Optimistic UI update
    if (productInfo) {
      dispatch({
        type: 'ADD_TO_LOCAL_CART',
        payload: {
          productId,
          variantId,
          quantity,
          price: productInfo.price,
          name: productInfo.name,
          imageUrl: productInfo.imageUrl,
        },
      });
    }

    // Track event
    if (state.session) {
      trackLandingPageEvent(state.session.sessionToken, {
        type: 'ADD_TO_CART',
        metadata: { productId, quantity, variantId },
      });
    }

    // Sync with backend cart
    const { cart } = state;
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (cart?.id && sessionToken && companyId) {
      dispatch({ type: 'SET_CART_LOADING', payload: true });
      try {
        const cartSessionToken = cart.sessionToken || sessionToken;
        const updatedCart = await apiAddCartItem(
          cart.id,
          cartSessionToken,
          companyId,
          {
            productId,
            variantId,
            quantity,
          }
        );
        dispatch({ type: 'SYNC_CART_FROM_BACKEND', payload: updatedCart });
      } catch (error) {
        console.error('Failed to sync add to cart with backend:', error);
        dispatch({ type: 'SET_CART_ERROR', payload: 'Failed to add item to cart' });
        dispatch({ type: 'SET_CART_LOADING', payload: false });
      }
    }
  }, [state.session, state.cart]);

  /**
   * Update cart item quantity
   */
  const updateCartItem = useCallback(async (itemId: string, quantity: number) => {
    // Find the product ID from the cart item
    const cartItem = state.cart?.items.find((item) => item.id === itemId);
    if (cartItem) {
      const oldQuantity = cartItem.quantity;

      // Optimistic UI update
      dispatch({
        type: 'UPDATE_LOCAL_CART_ITEM',
        payload: { productId: cartItem.productId, quantity },
      });

      // Track quantity change event
      if (state.session && quantity !== oldQuantity) {
        trackLandingPageEvent(state.session.sessionToken, {
          type: 'QUANTITY_CHANGED',
          metadata: {
            productId: cartItem.productId,
            itemId,
            oldQuantity,
            newQuantity: quantity,
            priceDelta: (quantity - oldQuantity) * cartItem.unitPrice,
          },
        });
      }
    }

    // Sync with backend cart
    const { cart } = state;
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (cart?.id && sessionToken && companyId && cartItem) {
      dispatch({ type: 'SET_CART_LOADING', payload: true });
      try {
        const cartSessionToken = cart.sessionToken || sessionToken;

        let updatedCart: Cart;
        if (quantity <= 0) {
          // Remove item if quantity is 0 or less
          updatedCart = await apiRemoveCartItem(
            cart.id,
            itemId,
            cartSessionToken,
            companyId
          );
        } else {
          updatedCart = await apiUpdateCartItem(
            cart.id,
            itemId,
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
  }, [state.cart]);

  /**
   * Remove item from cart
   */
  const removeFromCart = useCallback(async (itemId: string) => {
    // Find the product ID from the cart item
    const cartItem = state.cart?.items.find((item) => item.id === itemId);
    if (cartItem) {
      // Optimistic UI update
      dispatch({ type: 'REMOVE_FROM_LOCAL_CART', payload: cartItem.productId });
    }

    // Track event
    if (state.session && cartItem) {
      trackLandingPageEvent(state.session.sessionToken, {
        type: 'REMOVE_FROM_CART',
        metadata: { productId: cartItem.productId, itemId },
      });
    }

    // Sync with backend cart
    const { cart } = state;
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (cart?.id && sessionToken && companyId && cartItem) {
      dispatch({ type: 'SET_CART_LOADING', payload: true });
      try {
        const cartSessionToken = cart.sessionToken || sessionToken;
        const updatedCart = await apiRemoveCartItem(
          cart.id,
          itemId,
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
  }, [state.session, state.cart]);

  /**
   * Clear cart
   */
  const clearCart = useCallback(() => {
    // Track cart cleared event before clearing
    if (state.session && state.localCart.length > 0) {
      trackLandingPageEvent(state.session.sessionToken, {
        type: 'CART_CLEARED',
        metadata: {
          itemCount: state.localCart.length,
          cartTotal: state.localCart.reduce((sum, item) => sum + item.price * item.quantity, 0),
          productIds: state.localCart.map((item) => item.productId),
        },
      });
    }
    dispatch({ type: 'CLEAR_LOCAL_CART' });
  }, [state.session, state.localCart]);

  /**
   * Track custom event
   */
  const trackEvent = useCallback((eventType: string, eventData?: Record<string, unknown>) => {
    if (state.session) {
      trackLandingPageEvent(state.session.sessionToken, {
        type: eventType,
        metadata: eventData,
      });
    }
  }, [state.session]);

  /**
   * Open cart drawer
   */
  const openCartDrawer = useCallback(() => {
    dispatch({ type: 'SET_CART_DRAWER_OPEN', payload: true });
    if (state.session) {
      trackLandingPageEvent(state.session.sessionToken, {
        type: 'CART_DRAWER_OPENED',
      });
    }
  }, [state.session]);

  /**
   * Close cart drawer
   */
  const closeCartDrawer = useCallback(() => {
    // Track cart drawer closed event
    if (state.session && state.isCartDrawerOpen) {
      trackLandingPageEvent(state.session.sessionToken, {
        type: 'CART_DRAWER_CLOSED',
        metadata: {
          itemCount: state.localCart.length,
          cartTotal: state.localCart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        },
      });
    }
    dispatch({ type: 'SET_CART_DRAWER_OPEN', payload: false });
  }, [state.session, state.isCartDrawerOpen, state.localCart]);

  /**
   * Apply discount code to cart
   */
  const applyDiscountCode = useCallback(async (code: string): Promise<boolean> => {
    const { cart } = state;
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (!cart?.id || !sessionToken || !companyId) {
      console.error('Cannot apply discount: cart not initialized');
      return false;
    }

    dispatch({ type: 'SET_CART_LOADING', payload: true });
    dispatch({ type: 'SET_CART_ERROR', payload: null });

    try {
      const cartSessionToken = cart.sessionToken || sessionToken;
      const updatedCart = await applyCartDiscount(cart.id, cartSessionToken, companyId, code);
      dispatch({ type: 'SYNC_CART_FROM_BACKEND', payload: updatedCart });

      // Track event
      if (state.session) {
        trackLandingPageEvent(state.session.sessionToken, {
          type: 'DISCOUNT_APPLIED',
          metadata: { code },
        });
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid discount code';
      console.error('Failed to apply discount:', message);

      // Track discount validation failure
      if (state.session) {
        trackLandingPageEvent(state.session.sessionToken, {
          type: 'DISCOUNT_VALIDATION_FAILED',
          metadata: {
            code,
            reason: message,
            cartTotal: state.localCart.reduce((sum, item) => sum + item.price * item.quantity, 0),
            cartItemCount: state.localCart.length,
          },
        });
      }

      dispatch({ type: 'SET_CART_ERROR', payload: message });
      dispatch({ type: 'SET_CART_LOADING', payload: false });
      return false;
    }
  }, [state.cart, state.session, state.localCart]);

  /**
   * Remove discount code from cart
   */
  const removeDiscountCode = useCallback(async (code: string): Promise<boolean> => {
    const { cart } = state;
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (!cart?.id || !sessionToken || !companyId) {
      console.error('Cannot remove discount: cart not initialized');
      return false;
    }

    dispatch({ type: 'SET_CART_LOADING', payload: true });
    dispatch({ type: 'SET_CART_ERROR', payload: null });

    try {
      const cartSessionToken = cart.sessionToken || sessionToken;
      const updatedCart = await removeCartDiscount(cart.id, code, cartSessionToken, companyId);
      dispatch({ type: 'SYNC_CART_FROM_BACKEND', payload: updatedCart });

      // Track event
      if (state.session) {
        trackLandingPageEvent(state.session.sessionToken, {
          type: 'DISCOUNT_REMOVED',
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
  }, [state.cart, state.session]);

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
      const cart = await getLandingPageCart(sessionToken, companyId);
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

  /**
   * Scroll to a section by index
   */
  const scrollToSection = useCallback((index: number) => {
    // Find all section elements and scroll to the specified index
    const sections = document.querySelectorAll('[data-section-type]');
    if (sections[index]) {
      sections[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const value: LandingPageContextValue = {
    ...state,
    initializeLandingPage,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    trackEvent,
    openCartDrawer,
    closeCartDrawer,
    applyDiscountCode,
    removeDiscountCode,
    refreshCart,
    scrollToSection,
    cartTotal,
    cartCount,
    backendCartTotals,
  };

  return (
    <LandingPageContext.Provider value={value}>
      {children}
    </LandingPageContext.Provider>
  );
}

/**
 * Hook to access the landing page context
 */
export function useLandingPage() {
  const context = useContext(LandingPageContext);
  if (!context) {
    throw new Error('useLandingPage must be used within a LandingPageProvider');
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

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
