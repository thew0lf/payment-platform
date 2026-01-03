/**
 * Cart State Store
 *
 * Manages the shopping cart state for the admin dashboard including:
 * - Cart items and quantities
 * - Saved for later items
 * - Promotions/discount codes
 * - Cart totals (subtotal, tax, shipping, discounts)
 * - Cart drawer visibility
 * - Loading states and error handling
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Cart,
  CartItem,
  CartDiscount,
  CartTotals,
  AddToCartInput,
  UpdateCartItemInput,
  AddBundleToCartInput,
  cartApi,
} from '@/lib/api/cart';

// ═══════════════════════════════════════════════════════════════
// CART STATE TYPES
// ═══════════════════════════════════════════════════════════════

export interface CartState {
  // Cart data
  cart: Cart | null;
  items: CartItem[];
  savedItems: CartItem[];
  discounts: CartDiscount[];
  totals: CartTotals | null;

  // UI state
  isDrawerOpen: boolean;
  isLoading: boolean;
  isItemLoading: Set<string>; // Track loading state per item
  error: string | null;

  // Optimistic updates tracking
  pendingOperations: Map<string, 'add' | 'update' | 'remove'>;

  // Last sync timestamp
  lastSyncedAt: number | null;
}

export interface CartActions {
  // Drawer control
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;

  // Cart operations
  fetchCart: () => Promise<void>;
  addItem: (input: AddToCartInput, siteId?: string) => Promise<void>;
  updateItem: (itemId: string, input: UpdateCartItemInput) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  incrementQuantity: (itemId: string) => Promise<void>;
  decrementQuantity: (itemId: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;

  // Save for later operations
  saveForLater: (itemId: string) => Promise<void>;
  moveToCart: (savedItemId: string, quantity?: number) => Promise<void>;

  // Discount operations
  applyDiscount: (code: string) => Promise<void>;
  removeDiscount: (code: string) => Promise<void>;

  // Bundle operations
  addBundle: (input: AddBundleToCartInput, siteId?: string) => Promise<void>;
  removeBundle: (bundleGroupId: string) => Promise<void>;

  // Cart merging
  mergeCarts: (sourceCartId: string) => Promise<void>;

  // State management
  setCart: (cart: Cart) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Computed getters
  getItemCount: () => number;
  getSubtotal: () => number;
  getSavedItemCount: () => number;
  hasItems: () => boolean;
  hasDiscounts: () => boolean;
}

export type CartStore = CartState & CartActions;

// ═══════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════

const initialState: CartState = {
  cart: null,
  items: [],
  savedItems: [],
  discounts: [],
  totals: null,
  isDrawerOpen: false,
  isLoading: false,
  isItemLoading: new Set(),
  error: null,
  pendingOperations: new Map(),
  lastSyncedAt: null,
};

// ═══════════════════════════════════════════════════════════════
// STORE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ─────────────────────────────────────────────────────────────
      // DRAWER CONTROL
      // ─────────────────────────────────────────────────────────────

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      // ─────────────────────────────────────────────────────────────
      // CART OPERATIONS
      // ─────────────────────────────────────────────────────────────

      fetchCart: async () => {
        set({ isLoading: true, error: null });

        try {
          const cart = await cartApi.getCart();
          set({
            cart,
            items: cart.items || [],
            savedItems: cart.savedItems || [],
            discounts: cart.discounts || [],
            totals: cart.totals || null,
            isLoading: false,
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch cart';
          set({ error: message, isLoading: false });
        }
      },

      addItem: async (input: AddToCartInput, siteId?: string) => {
        const { items, pendingOperations } = get();
        const tempId = `temp-${Date.now()}`;

        // Optimistic update - add item immediately
        const optimisticItem: CartItem = {
          id: tempId,
          cartId: get().cart?.id || '',
          productId: input.productId,
          variantId: input.variantId,
          quantity: input.quantity,
          price: 0, // Will be updated from server
          savedForLater: false,
          customFields: input.customFields,
          giftMessage: input.giftMessage,
          isGift: input.isGift,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set({
          items: [...items, optimisticItem],
          isDrawerOpen: true, // Auto-open drawer when adding item
        });

        // Track pending operation
        pendingOperations.set(tempId, 'add');
        set({ pendingOperations: new Map(pendingOperations) });

        try {
          const cart = await cartApi.addItem(input, siteId);
          pendingOperations.delete(tempId);
          set({
            cart,
            items: cart.items || [],
            savedItems: cart.savedItems || [],
            discounts: cart.discounts || [],
            totals: cart.totals || null,
            pendingOperations: new Map(pendingOperations),
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          // Rollback optimistic update
          pendingOperations.delete(tempId);
          set({
            items: items.filter((item) => item.id !== tempId),
            pendingOperations: new Map(pendingOperations),
            error: error instanceof Error ? error.message : 'Failed to add item',
          });
        }
      },

      updateItem: async (itemId: string, input: UpdateCartItemInput) => {
        const { items, isItemLoading } = get();
        const itemIndex = items.findIndex((item) => item.id === itemId);
        if (itemIndex === -1) return;

        const originalItem = items[itemIndex];

        // Track item loading state
        isItemLoading.add(itemId);
        set({ isItemLoading: new Set(isItemLoading) });

        // Optimistic update
        const updatedItems = [...items];
        updatedItems[itemIndex] = {
          ...originalItem,
          ...input,
          updatedAt: new Date().toISOString(),
        };
        set({ items: updatedItems });

        try {
          const cart = await cartApi.updateItem(itemId, input);
          isItemLoading.delete(itemId);
          set({
            cart,
            items: cart.items || [],
            savedItems: cart.savedItems || [],
            discounts: cart.discounts || [],
            totals: cart.totals || null,
            isItemLoading: new Set(isItemLoading),
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          // Rollback optimistic update
          isItemLoading.delete(itemId);
          const rollbackItems = [...get().items];
          const rollbackIndex = rollbackItems.findIndex((item) => item.id === itemId);
          if (rollbackIndex !== -1) {
            rollbackItems[rollbackIndex] = originalItem;
          }
          set({
            items: rollbackItems,
            isItemLoading: new Set(isItemLoading),
            error: error instanceof Error ? error.message : 'Failed to update item',
          });
        }
      },

      updateQuantity: async (itemId: string, quantity: number) => {
        if (quantity < 1) {
          return get().removeItem(itemId);
        }
        return get().updateItem(itemId, { quantity });
      },

      incrementQuantity: async (itemId: string) => {
        const item = get().items.find((i) => i.id === itemId);
        if (item) {
          return get().updateQuantity(itemId, item.quantity + 1);
        }
      },

      decrementQuantity: async (itemId: string) => {
        const item = get().items.find((i) => i.id === itemId);
        if (item && item.quantity > 1) {
          return get().updateQuantity(itemId, item.quantity - 1);
        } else if (item && item.quantity === 1) {
          return get().removeItem(itemId);
        }
      },

      removeItem: async (itemId: string) => {
        const { items, isItemLoading } = get();
        const originalItems = [...items];
        const itemIndex = items.findIndex((item) => item.id === itemId);
        if (itemIndex === -1) return;

        // Track item loading state
        isItemLoading.add(itemId);
        set({ isItemLoading: new Set(isItemLoading) });

        // Optimistic update - remove immediately
        set({ items: items.filter((item) => item.id !== itemId) });

        try {
          const cart = await cartApi.removeItem(itemId);
          isItemLoading.delete(itemId);
          set({
            cart,
            items: cart.items || [],
            savedItems: cart.savedItems || [],
            discounts: cart.discounts || [],
            totals: cart.totals || null,
            isItemLoading: new Set(isItemLoading),
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          // Rollback optimistic update
          isItemLoading.delete(itemId);
          set({
            items: originalItems,
            isItemLoading: new Set(isItemLoading),
            error: error instanceof Error ? error.message : 'Failed to remove item',
          });
        }
      },

      clearCart: async () => {
        const { items, savedItems, discounts, totals } = get();
        const originalState = { items, savedItems, discounts, totals };

        // Optimistic update
        set({
          items: [],
          savedItems: [],
          discounts: [],
          totals: null,
          isLoading: true,
        });

        try {
          const cart = await cartApi.clearCart();
          set({
            cart,
            items: cart.items || [],
            savedItems: cart.savedItems || [],
            discounts: cart.discounts || [],
            totals: cart.totals || null,
            isLoading: false,
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          // Rollback optimistic update
          set({
            ...originalState,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to clear cart',
          });
        }
      },

      // ─────────────────────────────────────────────────────────────
      // SAVE FOR LATER OPERATIONS
      // ─────────────────────────────────────────────────────────────

      saveForLater: async (itemId: string) => {
        const { items, savedItems, isItemLoading } = get();
        const item = items.find((i) => i.id === itemId);
        if (!item) return;

        isItemLoading.add(itemId);
        set({ isItemLoading: new Set(isItemLoading) });

        // Optimistic update
        set({
          items: items.filter((i) => i.id !== itemId),
          savedItems: [...savedItems, { ...item, savedForLater: true }],
        });

        try {
          const cart = await cartApi.saveForLater(itemId);
          isItemLoading.delete(itemId);
          set({
            cart,
            items: cart.items || [],
            savedItems: cart.savedItems || [],
            discounts: cart.discounts || [],
            totals: cart.totals || null,
            isItemLoading: new Set(isItemLoading),
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          // Rollback
          isItemLoading.delete(itemId);
          set({
            items: [...get().items, item],
            savedItems: get().savedItems.filter((i) => i.id !== itemId),
            isItemLoading: new Set(isItemLoading),
            error: error instanceof Error ? error.message : 'Failed to save item for later',
          });
        }
      },

      moveToCart: async (savedItemId: string, quantity?: number) => {
        const { items, savedItems, isItemLoading } = get();
        const savedItem = savedItems.find((i) => i.id === savedItemId);
        if (!savedItem) return;

        isItemLoading.add(savedItemId);
        set({ isItemLoading: new Set(isItemLoading) });

        // Optimistic update
        const movedItem = {
          ...savedItem,
          savedForLater: false,
          quantity: quantity || savedItem.quantity,
        };
        set({
          savedItems: savedItems.filter((i) => i.id !== savedItemId),
          items: [...items, movedItem],
        });

        try {
          const cart = await cartApi.moveToCart(savedItemId, { quantity });
          isItemLoading.delete(savedItemId);
          set({
            cart,
            items: cart.items || [],
            savedItems: cart.savedItems || [],
            discounts: cart.discounts || [],
            totals: cart.totals || null,
            isItemLoading: new Set(isItemLoading),
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          // Rollback
          isItemLoading.delete(savedItemId);
          set({
            savedItems: [...get().savedItems, savedItem],
            items: get().items.filter((i) => i.id !== savedItemId),
            isItemLoading: new Set(isItemLoading),
            error: error instanceof Error ? error.message : 'Failed to move item to cart',
          });
        }
      },

      // ─────────────────────────────────────────────────────────────
      // DISCOUNT OPERATIONS
      // ─────────────────────────────────────────────────────────────

      applyDiscount: async (code: string) => {
        set({ isLoading: true, error: null });

        try {
          const cart = await cartApi.applyDiscount({ code });
          set({
            cart,
            items: cart.items || [],
            savedItems: cart.savedItems || [],
            discounts: cart.discounts || [],
            totals: cart.totals || null,
            isLoading: false,
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Invalid discount code',
          });
          throw error; // Re-throw so UI can handle
        }
      },

      removeDiscount: async (code: string) => {
        const { discounts } = get();
        const originalDiscounts = [...discounts];

        // Optimistic update
        set({
          discounts: discounts.filter((d) => d.code !== code),
          isLoading: true,
        });

        try {
          const cart = await cartApi.removeDiscount(code);
          set({
            cart,
            items: cart.items || [],
            savedItems: cart.savedItems || [],
            discounts: cart.discounts || [],
            totals: cart.totals || null,
            isLoading: false,
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          // Rollback
          set({
            discounts: originalDiscounts,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to remove discount',
          });
        }
      },

      // ─────────────────────────────────────────────────────────────
      // BUNDLE OPERATIONS
      // ─────────────────────────────────────────────────────────────

      addBundle: async (input: AddBundleToCartInput, siteId?: string) => {
        set({ isLoading: true, error: null, isDrawerOpen: true });

        try {
          const cart = await cartApi.addBundle(input, siteId);
          set({
            cart,
            items: cart.items || [],
            savedItems: cart.savedItems || [],
            discounts: cart.discounts || [],
            totals: cart.totals || null,
            isLoading: false,
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to add bundle',
          });
        }
      },

      removeBundle: async (bundleGroupId: string) => {
        const { items, isItemLoading } = get();
        const bundleItems = items.filter((item) => item.bundleGroupId === bundleGroupId);
        const originalItems = [...items];

        // Track loading for all bundle items
        bundleItems.forEach((item) => isItemLoading.add(item.id));
        set({ isItemLoading: new Set(isItemLoading) });

        // Optimistic update
        set({ items: items.filter((item) => item.bundleGroupId !== bundleGroupId) });

        try {
          const cart = await cartApi.removeBundle(bundleGroupId);
          bundleItems.forEach((item) => isItemLoading.delete(item.id));
          set({
            cart,
            items: cart.items || [],
            savedItems: cart.savedItems || [],
            discounts: cart.discounts || [],
            totals: cart.totals || null,
            isItemLoading: new Set(isItemLoading),
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          // Rollback
          bundleItems.forEach((item) => isItemLoading.delete(item.id));
          set({
            items: originalItems,
            isItemLoading: new Set(isItemLoading),
            error: error instanceof Error ? error.message : 'Failed to remove bundle',
          });
        }
      },

      // ─────────────────────────────────────────────────────────────
      // CART MERGING
      // ─────────────────────────────────────────────────────────────

      mergeCarts: async (sourceCartId: string) => {
        set({ isLoading: true, error: null });

        try {
          const cart = await cartApi.mergeCarts({ sourceCartId });
          set({
            cart,
            items: cart.items || [],
            savedItems: cart.savedItems || [],
            discounts: cart.discounts || [],
            totals: cart.totals || null,
            isLoading: false,
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to merge carts',
          });
        }
      },

      // ─────────────────────────────────────────────────────────────
      // STATE MANAGEMENT
      // ─────────────────────────────────────────────────────────────

      setCart: (cart: Cart) =>
        set({
          cart,
          items: cart.items || [],
          savedItems: cart.savedItems || [],
          discounts: cart.discounts || [],
          totals: cart.totals || null,
          lastSyncedAt: Date.now(),
        }),

      setError: (error: string | null) => set({ error }),

      reset: () => set(initialState),

      // ─────────────────────────────────────────────────────────────
      // COMPUTED GETTERS
      // ─────────────────────────────────────────────────────────────

      getItemCount: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getSubtotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getSavedItemCount: () => {
        const { savedItems } = get();
        return savedItems.length;
      },

      hasItems: () => {
        const { items } = get();
        return items.length > 0;
      },

      hasDiscounts: () => {
        const { discounts } = get();
        return discounts.length > 0;
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist essential state
        cart: state.cart,
        items: state.items,
        savedItems: state.savedItems,
        discounts: state.discounts,
        totals: state.totals,
        lastSyncedAt: state.lastSyncedAt,
      }),
      // Handle Set serialization
      serialize: (state) => {
        return JSON.stringify({
          ...state,
          state: {
            ...state.state,
            isItemLoading: [],
            pendingOperations: [],
          },
        });
      },
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        return {
          ...parsed,
          state: {
            ...parsed.state,
            isItemLoading: new Set(),
            pendingOperations: new Map(),
          },
        };
      },
    },
  ),
);

// ═══════════════════════════════════════════════════════════════
// SELECTOR HOOKS
// ═══════════════════════════════════════════════════════════════

export const useCartItems = () => useCartStore((state) => state.items);
export const useCartTotals = () => useCartStore((state) => state.totals);
export const useCartDiscounts = () => useCartStore((state) => state.discounts);
export const useSavedItems = () => useCartStore((state) => state.savedItems);
export const useCartDrawerOpen = () => useCartStore((state) => state.isDrawerOpen);
export const useCartLoading = () => useCartStore((state) => state.isLoading);
export const useCartError = () => useCartStore((state) => state.error);
export const useCartItemCount = () => useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));
