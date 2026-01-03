/**
 * Cart Store Unit Tests
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { useCartStore, CartStore } from './cart.store';
import { cartApi } from '@/lib/api/cart';
import type { Cart, CartItem } from '@/lib/api/cart';

// Mock the cart API
jest.mock('@/lib/api/cart', () => ({
  cartApi: {
    getCart: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    saveForLater: jest.fn(),
    moveToCart: jest.fn(),
    applyDiscount: jest.fn(),
    removeDiscount: jest.fn(),
    clearCart: jest.fn(),
    mergeCarts: jest.fn(),
    addBundle: jest.fn(),
    removeBundle: jest.fn(),
  },
}));

const mockCartApi = cartApi as jest.Mocked<typeof cartApi>;

// Mock cart data
const mockCartItem: CartItem = {
  id: 'item-1',
  cartId: 'cart-1',
  productId: 'product-1',
  quantity: 2,
  price: 29.99,
  savedForLater: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  product: {
    id: 'product-1',
    name: 'Test Product',
    sku: 'TEST-001',
    images: ['https://example.com/image.jpg'],
  },
};

const mockCart: Cart = {
  id: 'cart-1',
  companyId: 'company-1',
  sessionToken: 'session-token-123',
  status: 'ACTIVE',
  currency: 'USD',
  items: [mockCartItem],
  savedItems: [],
  discounts: [],
  totals: {
    subtotal: 59.98,
    discount: 0,
    shipping: 0,
    tax: 5.40,
    grandTotal: 65.38,
    itemCount: 2,
    currency: 'USD',
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('Cart Store', () => {
  beforeEach(() => {
    // Reset the store between tests
    useCartStore.setState({
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
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Drawer Control', () => {
    it('should open the drawer', () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.isDrawerOpen).toBe(false);

      act(() => {
        result.current.openDrawer();
      });

      expect(result.current.isDrawerOpen).toBe(true);
    });

    it('should close the drawer', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.openDrawer();
      });

      expect(result.current.isDrawerOpen).toBe(true);

      act(() => {
        result.current.closeDrawer();
      });

      expect(result.current.isDrawerOpen).toBe(false);
    });

    it('should toggle the drawer', () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.isDrawerOpen).toBe(false);

      act(() => {
        result.current.toggleDrawer();
      });

      expect(result.current.isDrawerOpen).toBe(true);

      act(() => {
        result.current.toggleDrawer();
      });

      expect(result.current.isDrawerOpen).toBe(false);
    });
  });

  describe('Fetch Cart', () => {
    it('should fetch cart successfully', async () => {
      mockCartApi.getCart.mockResolvedValueOnce(mockCart);

      const { result } = renderHook(() => useCartStore());

      await act(async () => {
        await result.current.fetchCart();
      });

      expect(result.current.cart).toEqual(mockCart);
      expect(result.current.items).toEqual(mockCart.items);
      expect(result.current.totals).toEqual(mockCart.totals);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch cart error', async () => {
      mockCartApi.getCart.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useCartStore());

      await act(async () => {
        await result.current.fetchCart();
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Add Item', () => {
    it('should add item to cart with optimistic update', async () => {
      mockCartApi.addItem.mockResolvedValueOnce(mockCart);

      const { result } = renderHook(() => useCartStore());

      const input = { productId: 'product-1', quantity: 2 };

      await act(async () => {
        await result.current.addItem(input);
      });

      expect(mockCartApi.addItem).toHaveBeenCalledWith(input, undefined);
      expect(result.current.items).toEqual(mockCart.items);
      expect(result.current.isDrawerOpen).toBe(true); // Auto-opens drawer
    });

    it('should rollback on add item error', async () => {
      mockCartApi.addItem.mockRejectedValueOnce(new Error('Failed to add'));

      const { result } = renderHook(() => useCartStore());

      const input = { productId: 'product-1', quantity: 2 };

      await act(async () => {
        await result.current.addItem(input);
      });

      expect(result.current.error).toBe('Failed to add');
      // Items should be rolled back to original state (empty)
      expect(result.current.items.filter((item: CartItem) => !item.id.startsWith('temp-'))).toHaveLength(0);
    });
  });

  describe('Update Item', () => {
    it('should update item quantity', async () => {
      const updatedCart = {
        ...mockCart,
        items: [{ ...mockCartItem, quantity: 3 }],
      };
      mockCartApi.updateItem.mockResolvedValueOnce(updatedCart);

      const { result } = renderHook(() => useCartStore());

      // Set initial state
      act(() => {
        result.current.setCart(mockCart);
      });

      await act(async () => {
        await result.current.updateItem('item-1', { quantity: 3 });
      });

      expect(mockCartApi.updateItem).toHaveBeenCalledWith('item-1', { quantity: 3 });
      expect(result.current.items[0].quantity).toBe(3);
    });

    it('should track item loading state during update', async () => {
      let resolvePromise: (value: Cart) => void;
      const promise = new Promise<Cart>((resolve) => {
        resolvePromise = resolve;
      });
      mockCartApi.updateItem.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(mockCart);
      });

      act(() => {
        result.current.updateItem('item-1', { quantity: 3 });
      });

      // Should be loading
      expect(result.current.isItemLoading.has('item-1')).toBe(true);

      await act(async () => {
        resolvePromise!(mockCart);
        await promise;
      });

      // Should no longer be loading
      expect(result.current.isItemLoading.has('item-1')).toBe(false);
    });
  });

  describe('Remove Item', () => {
    it('should remove item from cart', async () => {
      const emptyCart = { ...mockCart, items: [] };
      mockCartApi.removeItem.mockResolvedValueOnce(emptyCart);

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(mockCart);
      });

      expect(result.current.items).toHaveLength(1);

      await act(async () => {
        await result.current.removeItem('item-1');
      });

      expect(mockCartApi.removeItem).toHaveBeenCalledWith('item-1');
      expect(result.current.items).toHaveLength(0);
    });

    it('should rollback on remove error', async () => {
      mockCartApi.removeItem.mockRejectedValueOnce(new Error('Failed to remove'));

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(mockCart);
      });

      await act(async () => {
        await result.current.removeItem('item-1');
      });

      expect(result.current.error).toBe('Failed to remove');
      // Item should be restored
      expect(result.current.items).toHaveLength(1);
    });
  });

  describe('Quantity Helpers', () => {
    it('should increment quantity', async () => {
      const updatedCart = {
        ...mockCart,
        items: [{ ...mockCartItem, quantity: 3 }],
      };
      mockCartApi.updateItem.mockResolvedValueOnce(updatedCart);

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(mockCart);
      });

      await act(async () => {
        await result.current.incrementQuantity('item-1');
      });

      expect(mockCartApi.updateItem).toHaveBeenCalledWith('item-1', { quantity: 3 });
    });

    it('should decrement quantity', async () => {
      const updatedCart = {
        ...mockCart,
        items: [{ ...mockCartItem, quantity: 1 }],
      };
      mockCartApi.updateItem.mockResolvedValueOnce(updatedCart);

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(mockCart);
      });

      await act(async () => {
        await result.current.decrementQuantity('item-1');
      });

      expect(mockCartApi.updateItem).toHaveBeenCalledWith('item-1', { quantity: 1 });
    });

    it('should remove item when decrementing from 1', async () => {
      const singleItemCart = {
        ...mockCart,
        items: [{ ...mockCartItem, quantity: 1 }],
      };
      const emptyCart = { ...mockCart, items: [] };
      mockCartApi.removeItem.mockResolvedValueOnce(emptyCart);

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(singleItemCart);
      });

      await act(async () => {
        await result.current.decrementQuantity('item-1');
      });

      expect(mockCartApi.removeItem).toHaveBeenCalledWith('item-1');
    });
  });

  describe('Discount Operations', () => {
    it('should apply discount code', async () => {
      const cartWithDiscount = {
        ...mockCart,
        discounts: [
          {
            code: 'SAVE10',
            type: 'PERCENTAGE' as const,
            value: 10,
            appliedAmount: 5.99,
          },
        ],
      };
      mockCartApi.applyDiscount.mockResolvedValueOnce(cartWithDiscount);

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(mockCart);
      });

      await act(async () => {
        await result.current.applyDiscount('SAVE10');
      });

      expect(mockCartApi.applyDiscount).toHaveBeenCalledWith({ code: 'SAVE10' });
      expect(result.current.discounts).toHaveLength(1);
      expect(result.current.discounts[0].code).toBe('SAVE10');
    });

    it('should throw error for invalid discount', async () => {
      mockCartApi.applyDiscount.mockRejectedValueOnce(new Error('Invalid code'));

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(mockCart);
      });

      // The store should throw the error and set error state
      let thrownError: Error | undefined = undefined;
      await act(async () => {
        try {
          await result.current.applyDiscount('INVALID');
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError).toBeDefined();
      expect(thrownError!.message).toBe('Invalid code');
      expect(result.current.error).toBe('Invalid code');
    });

    it('should remove discount code', async () => {
      const cartWithDiscount = {
        ...mockCart,
        discounts: [
          {
            code: 'SAVE10',
            type: 'PERCENTAGE' as const,
            value: 10,
            appliedAmount: 5.99,
          },
        ],
      };
      mockCartApi.removeDiscount.mockResolvedValueOnce(mockCart);

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(cartWithDiscount);
      });

      expect(result.current.discounts).toHaveLength(1);

      await act(async () => {
        await result.current.removeDiscount('SAVE10');
      });

      expect(mockCartApi.removeDiscount).toHaveBeenCalledWith('SAVE10');
      expect(result.current.discounts).toHaveLength(0);
    });
  });

  describe('Save for Later', () => {
    it('should save item for later', async () => {
      const savedItem = { ...mockCartItem, savedForLater: true };
      const cartWithSaved = {
        ...mockCart,
        items: [],
        savedItems: [savedItem],
      };
      mockCartApi.saveForLater.mockResolvedValueOnce(cartWithSaved);

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(mockCart);
      });

      await act(async () => {
        await result.current.saveForLater('item-1');
      });

      expect(mockCartApi.saveForLater).toHaveBeenCalledWith('item-1');
      expect(result.current.items).toHaveLength(0);
      expect(result.current.savedItems).toHaveLength(1);
    });

    it('should move saved item back to cart', async () => {
      const savedItem = { ...mockCartItem, savedForLater: true };
      const cartWithSaved = {
        ...mockCart,
        items: [],
        savedItems: [savedItem],
      };
      mockCartApi.moveToCart.mockResolvedValueOnce(mockCart);

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(cartWithSaved);
      });

      expect(result.current.savedItems).toHaveLength(1);

      await act(async () => {
        await result.current.moveToCart('item-1');
      });

      expect(mockCartApi.moveToCart).toHaveBeenCalledWith('item-1', { quantity: undefined });
      expect(result.current.items).toHaveLength(1);
      expect(result.current.savedItems).toHaveLength(0);
    });
  });

  describe('Clear Cart', () => {
    it('should clear the cart', async () => {
      const emptyTotals = {
        subtotal: 0,
        discount: 0,
        shipping: 0,
        tax: 0,
        grandTotal: 0,
        itemCount: 0,
        currency: 'USD' as const,
      };
      const emptyCart: Cart = { ...mockCart, items: [], savedItems: [], discounts: [], totals: emptyTotals };
      mockCartApi.clearCart.mockResolvedValueOnce(emptyCart);

      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(mockCart);
      });

      await act(async () => {
        await result.current.clearCart();
      });

      expect(mockCartApi.clearCart).toHaveBeenCalled();
      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('Computed Getters', () => {
    it('should calculate item count correctly', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(mockCart);
      });

      expect(result.current.getItemCount()).toBe(2); // mockCartItem has quantity 2
    });

    it('should calculate subtotal correctly', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(mockCart);
      });

      expect(result.current.getSubtotal()).toBe(29.99 * 2); // price * quantity
    });

    it('should return correct hasItems status', () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.hasItems()).toBe(false);

      act(() => {
        result.current.setCart(mockCart);
      });

      expect(result.current.hasItems()).toBe(true);
    });

    it('should return correct hasDiscounts status', () => {
      const { result } = renderHook(() => useCartStore());

      expect(result.current.hasDiscounts()).toBe(false);

      const cartWithDiscount = {
        ...mockCart,
        discounts: [{ code: 'TEST', type: 'PERCENTAGE' as const, value: 10, appliedAmount: 5 }],
      };

      act(() => {
        result.current.setCart(cartWithDiscount);
      });

      expect(result.current.hasDiscounts()).toBe(true);
    });
  });

  describe('Reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.setCart(mockCart);
        result.current.openDrawer();
        result.current.setError('Test error');
      });

      expect(result.current.cart).not.toBeNull();
      expect(result.current.isDrawerOpen).toBe(true);
      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.reset();
      });

      expect(result.current.cart).toBeNull();
      expect(result.current.items).toHaveLength(0);
      expect(result.current.isDrawerOpen).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
