/**
 * useCartService Hook Tests
 *
 * Comprehensive tests for the cart service hook used in the company portal.
 * Tests cover initialization, CRUD operations, discount handling, and error states.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useCartService } from './use-cart-service';
import type { Cart, CartItem, CartTotals, AddCartItemInput } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════
// MOCK SETUP
// ═══════════════════════════════════════════════════════════════

// Mock the API functions
jest.mock('@/lib/api', () => ({
  getCartBySession: jest.fn(),
  createCart: jest.fn(),
  addCartItem: jest.fn(),
  updateCartItem: jest.fn(),
  removeCartItem: jest.fn(),
  applyCartDiscount: jest.fn(),
  removeCartDiscount: jest.fn(),
}));

// Import mocked functions
import {
  getCartBySession,
  createCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  applyCartDiscount,
  removeCartDiscount,
} from '@/lib/api';

const mockGetCartBySession = getCartBySession as jest.MockedFunction<typeof getCartBySession>;
const mockCreateCart = createCart as jest.MockedFunction<typeof createCart>;
const mockAddCartItem = addCartItem as jest.MockedFunction<typeof addCartItem>;
const mockUpdateCartItem = updateCartItem as jest.MockedFunction<typeof updateCartItem>;
const mockRemoveCartItem = removeCartItem as jest.MockedFunction<typeof removeCartItem>;
const mockApplyCartDiscount = applyCartDiscount as jest.MockedFunction<typeof applyCartDiscount>;
const mockRemoveCartDiscount = removeCartDiscount as jest.MockedFunction<typeof removeCartDiscount>;

// ═══════════════════════════════════════════════════════════════
// MOCK DATA FACTORIES
// ═══════════════════════════════════════════════════════════════

function createMockTotals(overrides: Partial<CartTotals> = {}): CartTotals {
  return {
    subtotal: 5000,
    discountTotal: 0,
    taxTotal: 500,
    shippingTotal: 999,
    grandTotal: 6499,
    itemCount: 2,
    ...overrides,
  };
}

function createMockCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'item-1',
    productId: 'product-1',
    productSnapshot: {
      name: 'Test Product',
      sku: 'TEST-001',
      originalPrice: 2500,
    },
    quantity: 1,
    unitPrice: 2500,
    originalPrice: 2500,
    discountAmount: 0,
    lineTotal: 2500,
    isGift: false,
    addedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockCart(overrides: Partial<Cart> = {}): Cart {
  return {
    id: 'cart-123',
    companyId: 'company-456',
    sessionToken: 'session-token-123',
    status: 'ACTIVE',
    currency: 'USD',
    totals: createMockTotals(),
    discountCodes: [],
    items: [],
    savedItems: [],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    lastActivityAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// TEST SETUP
// ═══════════════════════════════════════════════════════════════

// Suppress console.error for expected error cases
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════
// INITIAL STATE TESTS
// ═══════════════════════════════════════════════════════════════

describe('useCartService - Initial State', () => {
  it('should have empty initial state', () => {
    const { result } = renderHook(() => useCartService());

    expect(result.current.cart).toBeNull();
    expect(result.current.cartId).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.totals).toBeNull();
    expect(result.current.items).toEqual([]);
    expect(result.current.sessionToken).toBeNull();
  });

  it('should provide all expected action functions', () => {
    const { result } = renderHook(() => useCartService());

    expect(typeof result.current.initializeCart).toBe('function');
    expect(typeof result.current.addItem).toBe('function');
    expect(typeof result.current.updateItem).toBe('function');
    expect(typeof result.current.removeItem).toBe('function');
    expect(typeof result.current.applyDiscount).toBe('function');
    expect(typeof result.current.removeDiscount).toBe('function');
    expect(typeof result.current.refreshCart).toBe('function');
    expect(typeof result.current.clearCartState).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════
// INITIALIZE CART TESTS
// ═══════════════════════════════════════════════════════════════

describe('useCartService - initializeCart', () => {
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('should fetch existing cart from session token', async () => {
    const mockCart = createMockCart({
      items: [createMockCartItem()],
    });
    mockGetCartBySession.mockResolvedValueOnce(mockCart);

    const { result } = renderHook(() => useCartService());

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.initializeCart(sessionToken, companyId);
    });

    expect(mockGetCartBySession).toHaveBeenCalledWith(sessionToken, companyId);
    expect(mockCreateCart).not.toHaveBeenCalled();
    expect(result.current.cart).toEqual(mockCart);
    expect(result.current.cartId).toBe('cart-123');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.error).toBeNull();
    expect(returnedCart).toEqual(mockCart);
  });

  it('should create new cart when createIfNotExists is true and cart does not exist', async () => {
    const mockCart = createMockCart();
    mockGetCartBySession.mockResolvedValueOnce(null);
    mockCreateCart.mockResolvedValueOnce(mockCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId, true);
    });

    expect(mockGetCartBySession).toHaveBeenCalledWith(sessionToken, companyId);
    expect(mockCreateCart).toHaveBeenCalledWith(companyId, {});
    expect(result.current.cart).toEqual(mockCart);
    expect(result.current.cartId).toBe('cart-123');
    expect(result.current.isInitialized).toBe(true);
  });

  it('should create new cart with createInput options', async () => {
    const mockCart = createMockCart();
    const createInput = {
      siteId: 'site-1',
      visitorId: 'visitor-abc',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'summer-sale',
    };

    mockGetCartBySession.mockResolvedValueOnce(null);
    mockCreateCart.mockResolvedValueOnce(mockCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId, true, createInput);
    });

    expect(mockCreateCart).toHaveBeenCalledWith(companyId, createInput);
  });

  it('should return null when cart does not exist and createIfNotExists is false', async () => {
    mockGetCartBySession.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useCartService());

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.initializeCart(sessionToken, companyId, false);
    });

    expect(mockGetCartBySession).toHaveBeenCalledWith(sessionToken, companyId);
    expect(mockCreateCart).not.toHaveBeenCalled();
    expect(result.current.cart).toBeNull();
    expect(result.current.cartId).toBeNull();
    expect(result.current.isInitialized).toBe(true);
    expect(returnedCart).toBeNull();
  });

  it('should set isLoading to true during initialization', async () => {
    let resolvePromise: (value: Cart | null) => void;
    const pendingPromise = new Promise<Cart | null>((resolve) => {
      resolvePromise = resolve;
    });
    mockGetCartBySession.mockReturnValueOnce(pendingPromise);

    const { result } = renderHook(() => useCartService());

    // Start initialization without waiting
    act(() => {
      result.current.initializeCart(sessionToken, companyId);
    });

    // Check loading state is true
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolvePromise!(createMockCart());
    });

    // Check loading state is false after completion
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle initialization error gracefully', async () => {
    const errorMessage = 'Network error';
    mockGetCartBySession.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useCartService());

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.initializeCart(sessionToken, companyId);
    });

    expect(result.current.cart).toBeNull();
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isInitialized).toBe(true);
    expect(returnedCart).toBeNull();
  });

  it('should handle non-Error exception during initialization', async () => {
    mockGetCartBySession.mockRejectedValueOnce('String error');

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    expect(result.current.error).toBe('Failed to initialize cart');
  });

  it('should use default createIfNotExists value of true', async () => {
    const mockCart = createMockCart();
    mockGetCartBySession.mockResolvedValueOnce(null);
    mockCreateCart.mockResolvedValueOnce(mockCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    expect(mockCreateCart).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════
// ADD ITEM TESTS
// ═══════════════════════════════════════════════════════════════

describe('useCartService - addItem', () => {
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('should add item to cart and return updated cart', async () => {
    const initialCart = createMockCart();
    const newItem = createMockCartItem({ id: 'new-item-1', productId: 'product-new' });
    const updatedCart = createMockCart({
      items: [newItem],
      totals: createMockTotals({ itemCount: 1 }),
    });

    mockGetCartBySession.mockResolvedValueOnce(initialCart);
    mockAddCartItem.mockResolvedValueOnce(updatedCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    const addItemInput: AddCartItemInput = {
      productId: 'product-new',
      quantity: 1,
    };

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.addItem(addItemInput);
    });

    expect(mockAddCartItem).toHaveBeenCalledWith(
      'cart-123',
      'session-token-123',
      companyId,
      addItemInput
    );
    expect(result.current.cart).toEqual(updatedCart);
    expect(result.current.items).toEqual([newItem]);
    expect(returnedCart).toEqual(updatedCart);
  });

  it('should return null when cart is not initialized', async () => {
    const { result } = renderHook(() => useCartService());

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.addItem({ productId: 'product-1', quantity: 1 });
    });

    expect(mockAddCartItem).not.toHaveBeenCalled();
    expect(returnedCart).toBeNull();
  });

  it('should set isLoading during addItem operation', async () => {
    const initialCart = createMockCart();
    mockGetCartBySession.mockResolvedValueOnce(initialCart);

    let resolveAddItem: (value: Cart) => void;
    const pendingPromise = new Promise<Cart>((resolve) => {
      resolveAddItem = resolve;
    });
    mockAddCartItem.mockReturnValueOnce(pendingPromise);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    // Start addItem without waiting
    act(() => {
      result.current.addItem({ productId: 'product-1', quantity: 1 });
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveAddItem!(createMockCart({ items: [createMockCartItem()] }));
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should handle addItem error gracefully', async () => {
    const initialCart = createMockCart();
    mockGetCartBySession.mockResolvedValueOnce(initialCart);
    mockAddCartItem.mockRejectedValueOnce(new Error('Product not found'));

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.addItem({ productId: 'invalid', quantity: 1 });
    });

    expect(result.current.error).toBe('Product not found');
    expect(result.current.isLoading).toBe(false);
    expect(returnedCart).toBeNull();
  });

  it('should use cart sessionToken over passed sessionToken', async () => {
    const cartSessionToken = 'cart-specific-token';
    const initialCart = createMockCart({ sessionToken: cartSessionToken });
    const updatedCart = createMockCart({ items: [createMockCartItem()] });

    mockGetCartBySession.mockResolvedValueOnce(initialCart);
    mockAddCartItem.mockResolvedValueOnce(updatedCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    await act(async () => {
      await result.current.addItem({ productId: 'product-1', quantity: 1 });
    });

    expect(mockAddCartItem).toHaveBeenCalledWith(
      'cart-123',
      cartSessionToken,
      companyId,
      expect.any(Object)
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE ITEM TESTS
// ═══════════════════════════════════════════════════════════════

describe('useCartService - updateItem', () => {
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('should update item quantity in cart', async () => {
    const existingItem = createMockCartItem({ id: 'item-1', quantity: 1 });
    const initialCart = createMockCart({ items: [existingItem] });
    const updatedItem = createMockCartItem({ id: 'item-1', quantity: 3, lineTotal: 7500 });
    const updatedCart = createMockCart({ items: [updatedItem] });

    mockGetCartBySession.mockResolvedValueOnce(initialCart);
    mockUpdateCartItem.mockResolvedValueOnce(updatedCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.updateItem('item-1', 3);
    });

    expect(mockUpdateCartItem).toHaveBeenCalledWith(
      'cart-123',
      'item-1',
      'session-token-123',
      companyId,
      { quantity: 3 }
    );
    expect(result.current.cart).toEqual(updatedCart);
    expect(result.current.items[0].quantity).toBe(3);
    expect(returnedCart).toEqual(updatedCart);
  });

  it('should remove item when quantity is 0', async () => {
    const existingItem = createMockCartItem({ id: 'item-1', quantity: 1 });
    const initialCart = createMockCart({ items: [existingItem] });
    const updatedCart = createMockCart({ items: [] });

    mockGetCartBySession.mockResolvedValueOnce(initialCart);
    mockRemoveCartItem.mockResolvedValueOnce(updatedCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.updateItem('item-1', 0);
    });

    expect(mockRemoveCartItem).toHaveBeenCalledWith(
      'cart-123',
      'item-1',
      'session-token-123',
      companyId
    );
    expect(mockUpdateCartItem).not.toHaveBeenCalled();
    expect(result.current.items).toEqual([]);
    expect(returnedCart).toEqual(updatedCart);
  });

  it('should remove item when quantity is negative', async () => {
    const existingItem = createMockCartItem({ id: 'item-1', quantity: 1 });
    const initialCart = createMockCart({ items: [existingItem] });
    const updatedCart = createMockCart({ items: [] });

    mockGetCartBySession.mockResolvedValueOnce(initialCart);
    mockRemoveCartItem.mockResolvedValueOnce(updatedCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    await act(async () => {
      await result.current.updateItem('item-1', -1);
    });

    expect(mockRemoveCartItem).toHaveBeenCalled();
    expect(mockUpdateCartItem).not.toHaveBeenCalled();
  });

  it('should return null when cart is not initialized', async () => {
    const { result } = renderHook(() => useCartService());

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.updateItem('item-1', 2);
    });

    expect(mockUpdateCartItem).not.toHaveBeenCalled();
    expect(mockRemoveCartItem).not.toHaveBeenCalled();
    expect(returnedCart).toBeNull();
  });

  it('should handle updateItem error gracefully', async () => {
    const existingItem = createMockCartItem({ id: 'item-1', quantity: 1 });
    const initialCart = createMockCart({ items: [existingItem] });

    mockGetCartBySession.mockResolvedValueOnce(initialCart);
    mockUpdateCartItem.mockRejectedValueOnce(new Error('Item not found'));

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    await act(async () => {
      await result.current.updateItem('item-1', 5);
    });

    expect(result.current.error).toBe('Item not found');
    expect(result.current.isLoading).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// REMOVE ITEM TESTS
// ═══════════════════════════════════════════════════════════════

describe('useCartService - removeItem', () => {
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('should remove item from cart', async () => {
    const existingItem = createMockCartItem({ id: 'item-1' });
    const initialCart = createMockCart({ items: [existingItem] });
    const updatedCart = createMockCart({ items: [], totals: createMockTotals({ itemCount: 0 }) });

    mockGetCartBySession.mockResolvedValueOnce(initialCart);
    mockRemoveCartItem.mockResolvedValueOnce(updatedCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.removeItem('item-1');
    });

    expect(mockRemoveCartItem).toHaveBeenCalledWith(
      'cart-123',
      'item-1',
      'session-token-123',
      companyId
    );
    expect(result.current.items).toEqual([]);
    expect(returnedCart).toEqual(updatedCart);
  });

  it('should return null when cart is not initialized', async () => {
    const { result } = renderHook(() => useCartService());

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.removeItem('item-1');
    });

    expect(mockRemoveCartItem).not.toHaveBeenCalled();
    expect(returnedCart).toBeNull();
  });

  it('should handle removeItem error gracefully', async () => {
    const existingItem = createMockCartItem({ id: 'item-1' });
    const initialCart = createMockCart({ items: [existingItem] });

    mockGetCartBySession.mockResolvedValueOnce(initialCart);
    mockRemoveCartItem.mockRejectedValueOnce(new Error('Failed to remove item'));

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    await act(async () => {
      await result.current.removeItem('item-1');
    });

    expect(result.current.error).toBe('Failed to remove item');
    expect(result.current.isLoading).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// APPLY DISCOUNT TESTS
// ═══════════════════════════════════════════════════════════════

describe('useCartService - applyDiscount', () => {
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('should apply discount code to cart', async () => {
    const initialCart = createMockCart();
    const discountedCart = createMockCart({
      discountCodes: [
        { code: 'SAVE20', discountAmount: 1000, type: 'percentage' },
      ],
      totals: createMockTotals({ discountTotal: 1000, grandTotal: 5499 }),
    });

    mockGetCartBySession.mockResolvedValueOnce(initialCart);
    mockApplyCartDiscount.mockResolvedValueOnce(discountedCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.applyDiscount('SAVE20');
    });

    expect(mockApplyCartDiscount).toHaveBeenCalledWith(
      'cart-123',
      'session-token-123',
      companyId,
      'SAVE20'
    );
    expect(result.current.cart?.discountCodes).toHaveLength(1);
    expect(result.current.cart?.discountCodes[0].code).toBe('SAVE20');
    expect(result.current.totals?.discountTotal).toBe(1000);
    expect(returnedCart).toEqual(discountedCart);
  });

  it('should return null when cart is not initialized', async () => {
    const { result } = renderHook(() => useCartService());

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.applyDiscount('SAVE20');
    });

    expect(mockApplyCartDiscount).not.toHaveBeenCalled();
    expect(returnedCart).toBeNull();
  });

  it('should handle invalid discount code error', async () => {
    const initialCart = createMockCart();
    mockGetCartBySession.mockResolvedValueOnce(initialCart);
    mockApplyCartDiscount.mockRejectedValueOnce(new Error('Invalid discount code'));

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    await act(async () => {
      await result.current.applyDiscount('INVALID');
    });

    expect(result.current.error).toBe('Invalid discount code');
    expect(result.current.isLoading).toBe(false);
  });

  it('should use default error message for non-Error exceptions', async () => {
    const initialCart = createMockCart();
    mockGetCartBySession.mockResolvedValueOnce(initialCart);
    mockApplyCartDiscount.mockRejectedValueOnce('String error');

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    await act(async () => {
      await result.current.applyDiscount('INVALID');
    });

    expect(result.current.error).toBe('Invalid discount code');
  });
});

// ═══════════════════════════════════════════════════════════════
// REMOVE DISCOUNT TESTS
// ═══════════════════════════════════════════════════════════════

describe('useCartService - removeDiscount', () => {
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('should remove discount code from cart', async () => {
    const discountedCart = createMockCart({
      discountCodes: [{ code: 'SAVE20', discountAmount: 1000, type: 'percentage' }],
    });
    const cartWithoutDiscount = createMockCart({ discountCodes: [] });

    mockGetCartBySession.mockResolvedValueOnce(discountedCart);
    mockRemoveCartDiscount.mockResolvedValueOnce(cartWithoutDiscount);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.removeDiscount('SAVE20');
    });

    expect(mockRemoveCartDiscount).toHaveBeenCalledWith(
      'cart-123',
      'SAVE20',
      'session-token-123',
      companyId
    );
    expect(result.current.cart?.discountCodes).toEqual([]);
    expect(returnedCart).toEqual(cartWithoutDiscount);
  });

  it('should return null when cart is not initialized', async () => {
    const { result } = renderHook(() => useCartService());

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.removeDiscount('SAVE20');
    });

    expect(mockRemoveCartDiscount).not.toHaveBeenCalled();
    expect(returnedCart).toBeNull();
  });

  it('should handle removeDiscount error gracefully', async () => {
    const discountedCart = createMockCart({
      discountCodes: [{ code: 'SAVE20', discountAmount: 1000, type: 'percentage' }],
    });
    mockGetCartBySession.mockResolvedValueOnce(discountedCart);
    mockRemoveCartDiscount.mockRejectedValueOnce(new Error('Failed to remove discount'));

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    await act(async () => {
      await result.current.removeDiscount('SAVE20');
    });

    expect(result.current.error).toBe('Failed to remove discount');
    expect(result.current.isLoading).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// REFRESH CART TESTS
// ═══════════════════════════════════════════════════════════════

describe('useCartService - refreshCart', () => {
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('should fetch latest cart state', async () => {
    const initialCart = createMockCart({ items: [] });
    const refreshedCart = createMockCart({
      items: [createMockCartItem()],
      totals: createMockTotals({ itemCount: 1 }),
    });

    mockGetCartBySession.mockResolvedValueOnce(initialCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    // Setup for refresh call
    mockGetCartBySession.mockResolvedValueOnce(refreshedCart);

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.refreshCart();
    });

    expect(mockGetCartBySession).toHaveBeenCalledTimes(2);
    expect(result.current.cart).toEqual(refreshedCart);
    expect(result.current.items).toHaveLength(1);
    expect(returnedCart).toEqual(refreshedCart);
  });

  it('should return null when session is not initialized', async () => {
    const { result } = renderHook(() => useCartService());

    let returnedCart: Cart | null = null;
    await act(async () => {
      returnedCart = await result.current.refreshCart();
    });

    expect(mockGetCartBySession).not.toHaveBeenCalled();
    expect(returnedCart).toBeNull();
  });

  it('should update cartId when cart is refreshed', async () => {
    const initialCart = createMockCart({ id: 'cart-123' });
    const refreshedCart = createMockCart({ id: 'cart-456' });

    mockGetCartBySession.mockResolvedValueOnce(initialCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    expect(result.current.cartId).toBe('cart-123');

    mockGetCartBySession.mockResolvedValueOnce(refreshedCart);

    await act(async () => {
      await result.current.refreshCart();
    });

    expect(result.current.cartId).toBe('cart-456');
  });

  it('should handle refresh error gracefully', async () => {
    const initialCart = createMockCart();
    mockGetCartBySession.mockResolvedValueOnce(initialCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    mockGetCartBySession.mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      await result.current.refreshCart();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.isLoading).toBe(false);
  });

  it('should set cartId to null when refresh returns no cart', async () => {
    const initialCart = createMockCart({ id: 'cart-123' });
    mockGetCartBySession.mockResolvedValueOnce(initialCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    expect(result.current.cartId).toBe('cart-123');

    mockGetCartBySession.mockResolvedValueOnce(null);

    await act(async () => {
      await result.current.refreshCart();
    });

    expect(result.current.cartId).toBeNull();
    expect(result.current.cart).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// CLEAR CART STATE TESTS
// ═══════════════════════════════════════════════════════════════

describe('useCartService - clearCartState', () => {
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('should reset all state to initial values', async () => {
    const mockCart = createMockCart({
      items: [createMockCartItem()],
      discountCodes: [{ code: 'SAVE20', discountAmount: 1000, type: 'percentage' }],
    });
    mockGetCartBySession.mockResolvedValueOnce(mockCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    // Verify state is populated
    expect(result.current.cart).not.toBeNull();
    expect(result.current.cartId).not.toBeNull();
    expect(result.current.isInitialized).toBe(true);

    // Clear state
    act(() => {
      result.current.clearCartState();
    });

    // Verify state is reset
    expect(result.current.cart).toBeNull();
    expect(result.current.cartId).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.totals).toBeNull();
    expect(result.current.items).toEqual([]);
    expect(result.current.sessionToken).toBeNull();
  });

  it('should clear session token from refs', async () => {
    const mockCart = createMockCart();
    mockGetCartBySession.mockResolvedValueOnce(mockCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    // Clear state
    act(() => {
      result.current.clearCartState();
    });

    // Attempt to refresh cart (should fail because refs are cleared)
    let refreshResult: Cart | null = null;
    await act(async () => {
      refreshResult = await result.current.refreshCart();
    });

    // refreshCart should return null because sessionToken ref is cleared
    expect(refreshResult).toBeNull();
    expect(mockGetCartBySession).toHaveBeenCalledTimes(1); // Only the initial call
  });
});

// ═══════════════════════════════════════════════════════════════
// COMPUTED VALUES TESTS
// ═══════════════════════════════════════════════════════════════

describe('useCartService - Computed Values', () => {
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('should compute totals from cart', async () => {
    const mockTotals = createMockTotals({
      subtotal: 10000,
      discountTotal: 2000,
      taxTotal: 800,
      shippingTotal: 500,
      grandTotal: 9300,
      itemCount: 5,
    });
    const mockCart = createMockCart({ totals: mockTotals });
    mockGetCartBySession.mockResolvedValueOnce(mockCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    expect(result.current.totals).toEqual(mockTotals);
    expect(result.current.totals?.subtotal).toBe(10000);
    expect(result.current.totals?.grandTotal).toBe(9300);
    expect(result.current.totals?.itemCount).toBe(5);
  });

  it('should compute items from cart', async () => {
    const item1 = createMockCartItem({ id: 'item-1', productId: 'prod-1' });
    const item2 = createMockCartItem({ id: 'item-2', productId: 'prod-2' });
    const mockCart = createMockCart({ items: [item1, item2] });
    mockGetCartBySession.mockResolvedValueOnce(mockCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0].id).toBe('item-1');
    expect(result.current.items[1].id).toBe('item-2');
  });

  it('should return empty array for items when cart is null', () => {
    const { result } = renderHook(() => useCartService());

    expect(result.current.items).toEqual([]);
  });

  it('should return null for totals when cart is null', () => {
    const { result } = renderHook(() => useCartService());

    expect(result.current.totals).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// LOADING STATE TRANSITIONS TESTS
// ═══════════════════════════════════════════════════════════════

describe('useCartService - Loading State Transitions', () => {
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('should properly transition isLoading during initializeCart', async () => {
    const mockCart = createMockCart();

    let resolvePromise: (value: Cart | null) => void;
    mockGetCartBySession.mockImplementationOnce(() =>
      new Promise((resolve) => { resolvePromise = resolve; })
    );

    const { result } = renderHook(() => useCartService());

    expect(result.current.isLoading).toBe(false);

    // Start initialization
    let initPromise: Promise<Cart | null>;
    act(() => {
      initPromise = result.current.initializeCart(sessionToken, companyId);
    });

    // isLoading should be true immediately
    expect(result.current.isLoading).toBe(true);

    // Resolve and complete
    await act(async () => {
      resolvePromise!(mockCart);
      await initPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should properly transition isLoading during addItem', async () => {
    const initialCart = createMockCart();
    mockGetCartBySession.mockResolvedValueOnce(initialCart);

    let resolveAddItem: (value: Cart) => void;
    mockAddCartItem.mockImplementationOnce(() =>
      new Promise((resolve) => { resolveAddItem = resolve; })
    );

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    expect(result.current.isLoading).toBe(false);

    // Start addItem
    let addPromise: Promise<Cart | null>;
    act(() => {
      addPromise = result.current.addItem({ productId: 'prod-1', quantity: 1 });
    });

    expect(result.current.isLoading).toBe(true);

    // Resolve
    await act(async () => {
      resolveAddItem!(createMockCart({ items: [createMockCartItem()] }));
      await addPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should properly transition isLoading during updateItem', async () => {
    const initialCart = createMockCart({ items: [createMockCartItem()] });
    mockGetCartBySession.mockResolvedValueOnce(initialCart);

    let resolveUpdate: (value: Cart) => void;
    mockUpdateCartItem.mockImplementationOnce(() =>
      new Promise((resolve) => { resolveUpdate = resolve; })
    );

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    let updatePromise: Promise<Cart | null>;
    act(() => {
      updatePromise = result.current.updateItem('item-1', 5);
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveUpdate!(createMockCart());
      await updatePromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should properly transition isLoading during removeItem', async () => {
    const initialCart = createMockCart({ items: [createMockCartItem()] });
    mockGetCartBySession.mockResolvedValueOnce(initialCart);

    let resolveRemove: (value: Cart) => void;
    mockRemoveCartItem.mockImplementationOnce(() =>
      new Promise((resolve) => { resolveRemove = resolve; })
    );

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    let removePromise: Promise<Cart | null>;
    act(() => {
      removePromise = result.current.removeItem('item-1');
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveRemove!(createMockCart({ items: [] }));
      await removePromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should properly transition isLoading during applyDiscount', async () => {
    const initialCart = createMockCart();
    mockGetCartBySession.mockResolvedValueOnce(initialCart);

    let resolveDiscount: (value: Cart) => void;
    mockApplyCartDiscount.mockImplementationOnce(() =>
      new Promise((resolve) => { resolveDiscount = resolve; })
    );

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    let discountPromise: Promise<Cart | null>;
    act(() => {
      discountPromise = result.current.applyDiscount('SAVE20');
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveDiscount!(createMockCart({
        discountCodes: [{ code: 'SAVE20', discountAmount: 1000, type: 'percentage' }],
      }));
      await discountPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should properly transition isLoading during refreshCart', async () => {
    const initialCart = createMockCart();
    mockGetCartBySession.mockResolvedValueOnce(initialCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    let resolveRefresh: (value: Cart | null) => void;
    mockGetCartBySession.mockImplementationOnce(() =>
      new Promise((resolve) => { resolveRefresh = resolve; })
    );

    let refreshPromise: Promise<Cart | null>;
    act(() => {
      refreshPromise = result.current.refreshCart();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveRefresh!(createMockCart());
      await refreshPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should set isLoading to false after error', async () => {
    const initialCart = createMockCart();
    mockGetCartBySession.mockResolvedValueOnce(initialCart);
    mockAddCartItem.mockRejectedValueOnce(new Error('API Error'));

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    await act(async () => {
      await result.current.addItem({ productId: 'prod-1', quantity: 1 });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('API Error');
  });
});

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING TESTS
// ═══════════════════════════════════════════════════════════════

describe('useCartService - Error Handling', () => {
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('should clear previous error on new successful operation', async () => {
    const mockCart = createMockCart();
    mockGetCartBySession.mockRejectedValueOnce(new Error('Initial error'));

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    expect(result.current.error).toBe('Initial error');

    // Retry successfully
    mockGetCartBySession.mockResolvedValueOnce(mockCart);

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.cart).toEqual(mockCart);
  });

  it('should handle API failures for all operations', async () => {
    const initialCart = createMockCart({ items: [createMockCartItem()] });
    mockGetCartBySession.mockResolvedValueOnce(initialCart);

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    // Test addItem error
    mockAddCartItem.mockRejectedValueOnce(new Error('Add error'));
    await act(async () => {
      await result.current.addItem({ productId: 'p1', quantity: 1 });
    });
    expect(result.current.error).toBe('Add error');

    // Test updateItem error
    mockUpdateCartItem.mockRejectedValueOnce(new Error('Update error'));
    await act(async () => {
      await result.current.updateItem('item-1', 2);
    });
    expect(result.current.error).toBe('Update error');

    // Test removeItem error
    mockRemoveCartItem.mockRejectedValueOnce(new Error('Remove error'));
    await act(async () => {
      await result.current.removeItem('item-1');
    });
    expect(result.current.error).toBe('Remove error');

    // Test applyDiscount error
    mockApplyCartDiscount.mockRejectedValueOnce(new Error('Discount error'));
    await act(async () => {
      await result.current.applyDiscount('CODE');
    });
    expect(result.current.error).toBe('Discount error');

    // Test removeDiscount error
    mockRemoveCartDiscount.mockRejectedValueOnce(new Error('Remove discount error'));
    await act(async () => {
      await result.current.removeDiscount('CODE');
    });
    expect(result.current.error).toBe('Remove discount error');

    // Test refreshCart error
    mockGetCartBySession.mockRejectedValueOnce(new Error('Refresh error'));
    await act(async () => {
      await result.current.refreshCart();
    });
    expect(result.current.error).toBe('Refresh error');
  });

  it('should preserve cart state on operation error', async () => {
    const initialCart = createMockCart({
      items: [createMockCartItem()],
      totals: createMockTotals({ itemCount: 1 }),
    });
    mockGetCartBySession.mockResolvedValueOnce(initialCart);
    mockAddCartItem.mockRejectedValueOnce(new Error('Failed to add'));

    const { result } = renderHook(() => useCartService());

    await act(async () => {
      await result.current.initializeCart(sessionToken, companyId);
    });

    const cartBefore = result.current.cart;

    await act(async () => {
      await result.current.addItem({ productId: 'new-product', quantity: 1 });
    });

    // Cart should be unchanged after error
    expect(result.current.cart).toEqual(cartBefore);
    expect(result.current.items).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// CALLBACK STABILITY TESTS
// ═══════════════════════════════════════════════════════════════

describe('useCartService - Callback Stability', () => {
  it('should maintain stable function references', async () => {
    const { result, rerender } = renderHook(() => useCartService());

    const initialFunctions = {
      initializeCart: result.current.initializeCart,
      addItem: result.current.addItem,
      clearCartState: result.current.clearCartState,
      refreshCart: result.current.refreshCart,
    };

    rerender();

    // These functions should be memoized and stable
    expect(result.current.initializeCart).toBe(initialFunctions.initializeCart);
    expect(result.current.clearCartState).toBe(initialFunctions.clearCartState);
    expect(result.current.refreshCart).toBe(initialFunctions.refreshCart);
  });
});
