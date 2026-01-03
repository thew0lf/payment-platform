'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Cart,
  CartItem,
  CartTotals,
  getCartBySession,
  createCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  applyCartDiscount,
  removeCartDiscount,
  CreateCartInput,
  AddCartItemInput,
} from '@/lib/api';

export interface CartServiceState {
  cart: Cart | null;
  cartId: string | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

export interface CartServiceActions {
  initializeCart: (
    sessionToken: string,
    companyId: string,
    createIfNotExists?: boolean,
    createInput?: CreateCartInput
  ) => Promise<Cart | null>;
  addItem: (input: AddCartItemInput) => Promise<Cart | null>;
  updateItem: (itemId: string, quantity: number) => Promise<Cart | null>;
  removeItem: (itemId: string) => Promise<Cart | null>;
  applyDiscount: (code: string) => Promise<Cart | null>;
  removeDiscount: (code: string) => Promise<Cart | null>;
  refreshCart: () => Promise<Cart | null>;
  clearCartState: () => void;
}

export interface UseCartServiceReturn extends CartServiceState, CartServiceActions {
  /** Computed cart totals from backend */
  totals: CartTotals | null;
  /** Cart items from backend */
  items: CartItem[];
  /** Session token used for this cart */
  sessionToken: string | null;
}

/**
 * Hook for managing cart state with backend CartService integration.
 *
 * This hook:
 * - Creates a cart when funnel session starts (if cart doesn't exist)
 * - Stores cartId and sessionToken for cart operations
 * - Syncs all cart operations with the backend
 * - Returns cart state including totals, items, and discount codes
 *
 * @example
 * ```tsx
 * const {
 *   cart,
 *   items,
 *   totals,
 *   initializeCart,
 *   addItem,
 *   updateItem
 * } = useCartService();
 *
 * // Initialize cart when session starts
 * await initializeCart(sessionToken, companyId, true);
 *
 * // Add item to cart
 * await addItem({ productId: 'prod-1', quantity: 2 });
 * ```
 */
export function useCartService(): UseCartServiceReturn {
  const [state, setState] = useState<CartServiceState>({
    cart: null,
    cartId: null,
    isLoading: false,
    error: null,
    isInitialized: false,
  });

  // Store session token, company ID, and cart ref for stable access in callbacks
  // Using refs prevents stale closure issues in useCallback dependencies
  const sessionTokenRef = useRef<string | null>(null);
  const companyIdRef = useRef<string | null>(null);
  const cartRef = useRef<Cart | null>(null);

  // Keep cartRef in sync with state.cart to avoid stale closures
  useEffect(() => {
    cartRef.current = state.cart;
  }, [state.cart]);

  /**
   * Initialize cart - either fetch existing or create new
   */
  const initializeCart = useCallback(async (
    sessionToken: string,
    companyId: string,
    createIfNotExists = true,
    createInput?: CreateCartInput
  ): Promise<Cart | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    sessionTokenRef.current = sessionToken;
    companyIdRef.current = companyId;

    try {
      // Try to get existing cart by session token
      let cart = await getCartBySession(sessionToken, companyId);

      // Create new cart if it doesn't exist and createIfNotExists is true
      if (!cart && createIfNotExists) {
        cart = await createCart(companyId, {
          ...createInput,
          // Note: The backend will assign a session token to the cart
          // We pass UTM params if provided
        });
      }

      setState({
        cart,
        cartId: cart?.id || null,
        isLoading: false,
        error: null,
        isInitialized: true,
      });

      return cart;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize cart';
      console.error('Cart initialization error:', message);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
        isInitialized: true,
      }));
      return null;
    }
  }, []);

  /**
   * Add item to cart
   */
  const addItem = useCallback(async (input: AddCartItemInput): Promise<Cart | null> => {
    // Use ref to access current cart state (avoids stale closure)
    const cart = cartRef.current;
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (!cart?.id || !sessionToken || !companyId) {
      console.error('Cannot add item: cart not initialized');
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Use the cart's session token for API calls
      const cartSessionToken = cart.sessionToken || sessionToken;
      const updatedCart = await addCartItem(cart.id, cartSessionToken, companyId, input);

      setState(prev => ({
        ...prev,
        cart: updatedCart,
        isLoading: false,
      }));

      return updatedCart;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add item';
      console.error('Add to cart error:', message);
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      return null;
    }
  }, []); // No dependencies - uses refs for stable access

  /**
   * Update item quantity in cart
   */
  const updateItem = useCallback(async (
    itemId: string,
    quantity: number
  ): Promise<Cart | null> => {
    // Use ref to access current cart state (avoids stale closure)
    const cart = cartRef.current;
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (!cart?.id || !sessionToken || !companyId) {
      console.error('Cannot update item: cart not initialized');
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const cartSessionToken = cart.sessionToken || sessionToken;

      // If quantity is 0 or less, remove the item instead
      if (quantity <= 0) {
        const updatedCart = await removeCartItem(cart.id, itemId, cartSessionToken, companyId);
        setState(prev => ({ ...prev, cart: updatedCart, isLoading: false }));
        return updatedCart;
      }

      const updatedCart = await updateCartItem(
        cart.id,
        itemId,
        cartSessionToken,
        companyId,
        { quantity }
      );

      setState(prev => ({
        ...prev,
        cart: updatedCart,
        isLoading: false,
      }));

      return updatedCart;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update item';
      console.error('Update cart item error:', message);
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      return null;
    }
  }, []); // No dependencies - uses refs for stable access

  /**
   * Remove item from cart
   */
  const removeItem = useCallback(async (itemId: string): Promise<Cart | null> => {
    // Use ref to access current cart state (avoids stale closure)
    const cart = cartRef.current;
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (!cart?.id || !sessionToken || !companyId) {
      console.error('Cannot remove item: cart not initialized');
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const cartSessionToken = cart.sessionToken || sessionToken;
      const updatedCart = await removeCartItem(cart.id, itemId, cartSessionToken, companyId);

      setState(prev => ({
        ...prev,
        cart: updatedCart,
        isLoading: false,
      }));

      return updatedCart;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove item';
      console.error('Remove from cart error:', message);
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      return null;
    }
  }, []); // No dependencies - uses refs for stable access

  /**
   * Apply discount code to cart
   */
  const applyDiscount = useCallback(async (code: string): Promise<Cart | null> => {
    // Use ref to access current cart state (avoids stale closure)
    const cart = cartRef.current;
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (!cart?.id || !sessionToken || !companyId) {
      console.error('Cannot apply discount: cart not initialized');
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const cartSessionToken = cart.sessionToken || sessionToken;
      const updatedCart = await applyCartDiscount(cart.id, cartSessionToken, companyId, code);

      setState(prev => ({
        ...prev,
        cart: updatedCart,
        isLoading: false,
      }));

      return updatedCart;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid discount code';
      console.error('Apply discount error:', message);
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      return null;
    }
  }, []); // No dependencies - uses refs for stable access

  /**
   * Remove discount code from cart
   */
  const removeDiscount = useCallback(async (code: string): Promise<Cart | null> => {
    // Use ref to access current cart state (avoids stale closure)
    const cart = cartRef.current;
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (!cart?.id || !sessionToken || !companyId) {
      console.error('Cannot remove discount: cart not initialized');
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const cartSessionToken = cart.sessionToken || sessionToken;
      const updatedCart = await removeCartDiscount(cart.id, code, cartSessionToken, companyId);

      setState(prev => ({
        ...prev,
        cart: updatedCart,
        isLoading: false,
      }));

      return updatedCart;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove discount';
      console.error('Remove discount error:', message);
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      return null;
    }
  }, []); // No dependencies - uses refs for stable access

  /**
   * Refresh cart data from backend
   */
  const refreshCart = useCallback(async (): Promise<Cart | null> => {
    const sessionToken = sessionTokenRef.current;
    const companyId = companyIdRef.current;

    if (!sessionToken || !companyId) {
      console.error('Cannot refresh: session not initialized');
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const cart = await getCartBySession(sessionToken, companyId);

      setState(prev => ({
        ...prev,
        cart,
        cartId: cart?.id || null,
        isLoading: false,
      }));

      return cart;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh cart';
      console.error('Refresh cart error:', message);
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      return null;
    }
  }, []);

  /**
   * Clear cart state (for session end/logout)
   */
  const clearCartState = useCallback(() => {
    sessionTokenRef.current = null;
    companyIdRef.current = null;
    setState({
      cart: null,
      cartId: null,
      isLoading: false,
      error: null,
      isInitialized: false,
    });
  }, []);

  return {
    // State
    ...state,

    // Computed values
    totals: state.cart?.totals || null,
    items: state.cart?.items || [],
    sessionToken: sessionTokenRef.current,

    // Actions
    initializeCart,
    addItem,
    updateItem,
    removeItem,
    applyDiscount,
    removeDiscount,
    refreshCart,
    clearCartState,
  };
}
