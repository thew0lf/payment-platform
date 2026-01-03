/**
 * Cart API Client Tests
 *
 * Comprehensive tests for the cart API client used in the company portal.
 * Tests cover all API methods, error handling, and utility functions.
 */

import {
  cartApi,
  CartApiError,
  isEmptyCart,
  isBundleItem,
  getBundleItems,
  getBundleTotal,
  formatPrice,
  calculateSavings,
  getCartSavings,
  CartResponse,
  EmptyCartResponse,
  CartItem,
  AddItemRequest,
  UpdateItemRequest,
  CreateCartRequest,
  UpdateShippingRequest,
  AddBundleRequest,
  BundleAddResult,
} from './cart-api';

// ═══════════════════════════════════════════════════════════════
// MOCK SETUP
// ═══════════════════════════════════════════════════════════════

const mockFetch = jest.fn();
global.fetch = mockFetch;

const API_BASE = 'http://localhost:3001';

// Mock cart response factory
function createMockCart(overrides: Partial<CartResponse> = {}): CartResponse {
  return {
    id: 'cart-123',
    companyId: 'company-456',
    status: 'ACTIVE',
    currency: 'USD',
    totals: {
      subtotal: 5000,
      discountTotal: 0,
      taxTotal: 500,
      shippingTotal: 999,
      grandTotal: 6499,
      itemCount: 2,
    },
    discountCodes: [],
    items: [],
    savedItems: [],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    lastActivityAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// Mock cart item factory
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

// Mock empty cart response
function createEmptyCart(): EmptyCartResponse {
  return {
    items: [],
    totals: {
      subtotal: 0,
      grandTotal: 0,
      itemCount: 0,
    },
  };
}

// Reset mocks before each test
beforeEach(() => {
  mockFetch.mockReset();
});

// ═══════════════════════════════════════════════════════════════
// CREATE CART TESTS
// ═══════════════════════════════════════════════════════════════

describe('cartApi.createCart', () => {
  const companyId = 'company-456';

  it('sends correct request without options', async () => {
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    const result = await cartApi.createCart(companyId);

    expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/api/public/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': companyId,
      },
      body: JSON.stringify({}),
    });
    expect(result).toEqual(mockCart);
  });

  it('sends correct request with options', async () => {
    const mockCart = createMockCart();
    const options: CreateCartRequest = {
      siteId: 'site-1',
      visitorId: 'visitor-abc',
      currency: 'EUR',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'summer-sale',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.createCart(companyId, options);

    expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/api/public/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': companyId,
      },
      body: JSON.stringify(options),
    });
  });

  it('includes x-company-id header', async () => {
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.createCart('my-company');

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers['x-company-id']).toBe('my-company');
  });

  it('handles API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Invalid company ID' }),
    });

    await expect(cartApi.createCart(companyId)).rejects.toThrow(CartApiError);
  });

  it('includes error details in CartApiError', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Invalid company ID' }),
    });

    await expect(cartApi.createCart(companyId)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid company ID',
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// GET CART TESTS
// ═══════════════════════════════════════════════════════════════

describe('cartApi.getCart', () => {
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('sends correct request with proper headers', async () => {
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    const result = await cartApi.getCart(sessionToken, companyId);

    expect(mockFetch).toHaveBeenCalledWith(`${API_BASE}/api/public/cart`, {
      method: 'GET',
      headers: {
        'x-session-token': sessionToken,
        'x-company-id': companyId,
      },
      cache: 'no-store',
    });
    expect(result).toEqual(mockCart);
  });

  it('includes x-session-token header', async () => {
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.getCart(sessionToken, companyId);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers['x-session-token']).toBe(sessionToken);
  });

  it('includes x-company-id header', async () => {
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.getCart(sessionToken, companyId);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers['x-company-id']).toBe(companyId);
  });

  it('returns empty cart response when cart not found', async () => {
    const emptyCart = createEmptyCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyCart,
    });

    const result = await cartApi.getCart(sessionToken, companyId);

    expect(result).toEqual(emptyCart);
  });

  it('uses no-store cache option', async () => {
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.getCart(sessionToken, companyId);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].cache).toBe('no-store');
  });
});

// ═══════════════════════════════════════════════════════════════
// ADD ITEM TESTS
// ═══════════════════════════════════════════════════════════════

describe('cartApi.addItem', () => {
  const cartId = 'cart-123';
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('sends correct request with item data', async () => {
    const item: AddItemRequest = {
      productId: 'product-1',
      quantity: 2,
    };
    const mockCart = createMockCart({ items: [createMockCartItem()] });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    const result = await cartApi.addItem(cartId, sessionToken, companyId, item);

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE}/api/public/cart/${cartId}/items`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
          'x-company-id': companyId,
        },
        body: JSON.stringify(item),
      }
    );
    expect(result).toEqual(mockCart);
  });

  it('sends item with variant ID', async () => {
    const item: AddItemRequest = {
      productId: 'product-1',
      variantId: 'variant-red-large',
      quantity: 1,
    };
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.addItem(cartId, sessionToken, companyId, item);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.variantId).toBe('variant-red-large');
  });

  it('sends item with custom fields', async () => {
    const item: AddItemRequest = {
      productId: 'product-1',
      quantity: 1,
      customFields: {
        engraving: 'Happy Birthday',
        giftWrap: true,
      },
    };
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.addItem(cartId, sessionToken, companyId, item);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.customFields).toEqual({
      engraving: 'Happy Birthday',
      giftWrap: true,
    });
  });

  it('sends item with gift options', async () => {
    const item: AddItemRequest = {
      productId: 'product-1',
      quantity: 1,
      giftMessage: 'Happy Birthday!',
      isGift: true,
    };
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.addItem(cartId, sessionToken, companyId, item);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.giftMessage).toBe('Happy Birthday!');
    expect(body.isGift).toBe(true);
  });

  it('handles product not found error', async () => {
    const item: AddItemRequest = {
      productId: 'nonexistent-product',
      quantity: 1,
    };
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Product not found', code: 'PRODUCT_NOT_FOUND' }),
    });

    await expect(
      cartApi.addItem(cartId, sessionToken, companyId, item)
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Product not found',
      errorCode: 'PRODUCT_NOT_FOUND',
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE ITEM TESTS
// ═══════════════════════════════════════════════════════════════

describe('cartApi.updateItem', () => {
  const cartId = 'cart-123';
  const itemId = 'item-1';
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('sends correct request with updates', async () => {
    const updates: UpdateItemRequest = {
      quantity: 5,
    };
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    const result = await cartApi.updateItem(
      cartId,
      itemId,
      sessionToken,
      companyId,
      updates
    );

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE}/api/public/cart/${cartId}/items/${itemId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
          'x-company-id': companyId,
        },
        body: JSON.stringify(updates),
      }
    );
    expect(result).toEqual(mockCart);
  });

  it('sends update with custom fields', async () => {
    const updates: UpdateItemRequest = {
      customFields: { color: 'blue' },
    };
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.updateItem(cartId, itemId, sessionToken, companyId, updates);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.customFields).toEqual({ color: 'blue' });
  });

  it('sends update with gift message', async () => {
    const updates: UpdateItemRequest = {
      giftMessage: 'Congratulations!',
      isGift: true,
    };
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.updateItem(cartId, itemId, sessionToken, companyId, updates);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.giftMessage).toBe('Congratulations!');
    expect(body.isGift).toBe(true);
  });
});

describe('cartApi.updateItemQuantity', () => {
  const cartId = 'cart-123';
  const itemId = 'item-1';
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('updates quantity through updateItem', async () => {
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.updateItemQuantity(cartId, itemId, sessionToken, companyId, 3);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.quantity).toBe(3);
  });

  it('sends quantity 0 to remove item', async () => {
    const mockCart = createMockCart({ items: [] });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.updateItemQuantity(cartId, itemId, sessionToken, companyId, 0);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.quantity).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// REMOVE ITEM TESTS
// ═══════════════════════════════════════════════════════════════

describe('cartApi.removeItem', () => {
  const cartId = 'cart-123';
  const itemId = 'item-1';
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('sends DELETE request to correct endpoint', async () => {
    const mockCart = createMockCart({ items: [] });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    const result = await cartApi.removeItem(cartId, itemId, sessionToken, companyId);

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE}/api/public/cart/${cartId}/items/${itemId}`,
      {
        method: 'DELETE',
        headers: {
          'x-session-token': sessionToken,
          'x-company-id': companyId,
        },
      }
    );
    expect(result).toEqual(mockCart);
  });

  it('includes proper auth headers', async () => {
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.removeItem(cartId, itemId, sessionToken, companyId);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers['x-session-token']).toBe(sessionToken);
    expect(callArgs[1].headers['x-company-id']).toBe(companyId);
  });

  it('handles item not found error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Cart item not found' }),
    });

    await expect(
      cartApi.removeItem(cartId, 'nonexistent-item', sessionToken, companyId)
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Cart item not found',
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// APPLY DISCOUNT TESTS
// ═══════════════════════════════════════════════════════════════

describe('cartApi.applyDiscount', () => {
  const cartId = 'cart-123';
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('sends discount code in request body', async () => {
    const mockCart = createMockCart({
      discountCodes: [
        { code: 'SAVE20', discountAmount: 1000, type: 'percentage' },
      ],
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    const result = await cartApi.applyDiscount(
      cartId,
      sessionToken,
      companyId,
      'SAVE20'
    );

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE}/api/public/cart/${cartId}/discount`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
          'x-company-id': companyId,
        },
        body: JSON.stringify({ code: 'SAVE20' }),
      }
    );
    expect(result.discountCodes).toHaveLength(1);
    expect(result.discountCodes[0].code).toBe('SAVE20');
  });

  it('handles invalid discount code error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        message: 'Invalid or expired discount code',
        code: 'INVALID_DISCOUNT',
      }),
    });

    await expect(
      cartApi.applyDiscount(cartId, sessionToken, companyId, 'INVALID')
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid or expired discount code',
      errorCode: 'INVALID_DISCOUNT',
    });
  });

  it('handles discount already applied error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ message: 'Discount code already applied' }),
    });

    await expect(
      cartApi.applyDiscount(cartId, sessionToken, companyId, 'SAVE20')
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// REMOVE DISCOUNT TESTS
// ═══════════════════════════════════════════════════════════════

describe('cartApi.removeDiscount', () => {
  const cartId = 'cart-123';
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('sends DELETE request with encoded discount code', async () => {
    const mockCart = createMockCart({ discountCodes: [] });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    const result = await cartApi.removeDiscount(
      cartId,
      sessionToken,
      companyId,
      'SAVE20'
    );

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE}/api/public/cart/${cartId}/discount/SAVE20`,
      {
        method: 'DELETE',
        headers: {
          'x-session-token': sessionToken,
          'x-company-id': companyId,
        },
      }
    );
    expect(result.discountCodes).toHaveLength(0);
  });

  it('properly encodes special characters in discount code', async () => {
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.removeDiscount(
      cartId,
      sessionToken,
      companyId,
      'SAVE 20%'
    );

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE}/api/public/cart/${cartId}/discount/${encodeURIComponent('SAVE 20%')}`,
      expect.any(Object)
    );
  });

  it('handles discount not found error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Discount code not found on cart' }),
    });

    await expect(
      cartApi.removeDiscount(cartId, sessionToken, companyId, 'NOTAPPLIED')
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE SHIPPING TESTS
// ═══════════════════════════════════════════════════════════════

describe('cartApi.updateShipping', () => {
  const cartId = 'cart-123';
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('sends shipping info in request body', async () => {
    const shipping: UpdateShippingRequest = {
      postalCode: '90210',
      country: 'US',
    };
    const mockCart = createMockCart({
      shippingPostalCode: '90210',
      shippingCountry: 'US',
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    const result = await cartApi.updateShipping(
      cartId,
      sessionToken,
      companyId,
      shipping
    );

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE}/api/public/cart/${cartId}/shipping`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
          'x-company-id': companyId,
        },
        body: JSON.stringify(shipping),
      }
    );
    expect(result.shippingPostalCode).toBe('90210');
    expect(result.shippingCountry).toBe('US');
  });

  it('sends only postal code', async () => {
    const shipping: UpdateShippingRequest = {
      postalCode: '10001',
    };
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.updateShipping(cartId, sessionToken, companyId, shipping);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.postalCode).toBe('10001');
    expect(body.country).toBeUndefined();
  });

  it('sends only country', async () => {
    const shipping: UpdateShippingRequest = {
      country: 'CA',
    };
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.updateShipping(cartId, sessionToken, companyId, shipping);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.country).toBe('CA');
  });
});

// ═══════════════════════════════════════════════════════════════
// ADD BUNDLE TESTS
// ═══════════════════════════════════════════════════════════════

describe('cartApi.addBundle', () => {
  const cartId = 'cart-123';
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('sends bundle request correctly', async () => {
    const bundle: AddBundleRequest = {
      bundleId: 'bundle-coffee-starter',
      quantity: 1,
    };
    const mockResult: BundleAddResult = {
      cart: createMockCart(),
      bundleGroupId: 'group-abc123',
      bundlePrice: 4500,
      itemsAdded: 3,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResult,
    });

    const result = await cartApi.addBundle(
      cartId,
      sessionToken,
      companyId,
      bundle
    );

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE}/api/public/cart/${cartId}/bundles`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
          'x-company-id': companyId,
        },
        body: JSON.stringify(bundle),
      }
    );
    expect(result.bundleGroupId).toBe('group-abc123');
    expect(result.bundlePrice).toBe(4500);
    expect(result.itemsAdded).toBe(3);
  });

  it('sends bundle with selected items', async () => {
    const bundle: AddBundleRequest = {
      bundleId: 'bundle-custom',
      selectedItems: [
        { productId: 'product-1', quantity: 1 },
        { productId: 'product-2', variantId: 'variant-a', quantity: 2 },
      ],
      quantity: 1,
    };
    const mockResult: BundleAddResult = {
      cart: createMockCart(),
      bundleGroupId: 'group-xyz',
      bundlePrice: 7500,
      itemsAdded: 3,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResult,
    });

    await cartApi.addBundle(cartId, sessionToken, companyId, bundle);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.selectedItems).toHaveLength(2);
    expect(body.selectedItems[0].productId).toBe('product-1');
    expect(body.selectedItems[1].variantId).toBe('variant-a');
  });

  it('handles bundle not found error', async () => {
    const bundle: AddBundleRequest = {
      bundleId: 'nonexistent-bundle',
    };
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Bundle not found', code: 'BUNDLE_NOT_FOUND' }),
    });

    await expect(
      cartApi.addBundle(cartId, sessionToken, companyId, bundle)
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'BUNDLE_NOT_FOUND',
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// REMOVE BUNDLE TESTS
// ═══════════════════════════════════════════════════════════════

describe('cartApi.removeBundle', () => {
  const cartId = 'cart-123';
  const bundleGroupId = 'group-abc123';
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('sends DELETE request to correct endpoint', async () => {
    const mockCart = createMockCart({ items: [] });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    const result = await cartApi.removeBundle(
      cartId,
      bundleGroupId,
      sessionToken,
      companyId
    );

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE}/api/public/cart/${cartId}/bundles/${bundleGroupId}`,
      {
        method: 'DELETE',
        headers: {
          'x-session-token': sessionToken,
          'x-company-id': companyId,
        },
      }
    );
    expect(result).toEqual(mockCart);
  });

  it('includes proper auth headers', async () => {
    const mockCart = createMockCart();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCart,
    });

    await cartApi.removeBundle(cartId, bundleGroupId, sessionToken, companyId);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers['x-session-token']).toBe(sessionToken);
    expect(callArgs[1].headers['x-company-id']).toBe(companyId);
  });

  it('handles bundle group not found error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Bundle group not found' }),
    });

    await expect(
      cartApi.removeBundle(cartId, 'nonexistent-group', sessionToken, companyId)
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING TESTS
// ═══════════════════════════════════════════════════════════════

describe('CartApiError', () => {
  it('creates error with message and status code', () => {
    const error = new CartApiError('Not found', 404);

    expect(error.message).toBe('Not found');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('CartApiError');
    expect(error.errorCode).toBeUndefined();
  });

  it('creates error with error code', () => {
    const error = new CartApiError('Invalid request', 400, 'INVALID_INPUT');

    expect(error.errorCode).toBe('INVALID_INPUT');
  });

  it('is instanceof Error', () => {
    const error = new CartApiError('Test', 500);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CartApiError);
  });
});

describe('error handling in API calls', () => {
  const sessionToken = 'session-token-123';
  const companyId = 'company-456';

  it('handles non-JSON error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    await expect(cartApi.getCart(sessionToken, companyId)).rejects.toMatchObject({
      statusCode: 500,
      message: 'Request failed: 500',
    });
  });

  it('extracts error message from response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Custom error message' }),
    });

    await expect(cartApi.getCart(sessionToken, companyId)).rejects.toMatchObject({
      message: 'Custom error message',
    });
  });

  it('extracts error from error field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Error from error field' }),
    });

    await expect(cartApi.getCart(sessionToken, companyId)).rejects.toMatchObject({
      message: 'Error from error field',
    });
  });

  it('extracts error code from errorCode field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Error', errorCode: 'ERR_001' }),
    });

    await expect(cartApi.getCart(sessionToken, companyId)).rejects.toMatchObject({
      errorCode: 'ERR_001',
    });
  });

  it('extracts error code from code field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Error', code: 'ERR_002' }),
    });

    await expect(cartApi.getCart(sessionToken, companyId)).rejects.toMatchObject({
      errorCode: 'ERR_002',
    });
  });

  it('handles 401 unauthorized error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid session token' }),
    });

    await expect(cartApi.getCart(sessionToken, companyId)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid session token',
    });
  });

  it('handles 403 forbidden error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Access denied' }),
    });

    await expect(cartApi.getCart(sessionToken, companyId)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Access denied',
    });
  });

  it('handles 500 server error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Internal server error' }),
    });

    await expect(cartApi.getCart(sessionToken, companyId)).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTION TESTS: isEmptyCart
// ═══════════════════════════════════════════════════════════════

describe('isEmptyCart', () => {
  it('returns true for EmptyCartResponse', () => {
    const emptyCart = createEmptyCart();

    expect(isEmptyCart(emptyCart)).toBe(true);
  });

  it('returns true for CartResponse with no items', () => {
    const cart = createMockCart({ items: [] });

    expect(isEmptyCart(cart)).toBe(true);
  });

  it('returns false for CartResponse with items', () => {
    const cart = createMockCart({
      items: [createMockCartItem()],
    });

    expect(isEmptyCart(cart)).toBe(false);
  });

  it('returns false for CartResponse with multiple items', () => {
    const cart = createMockCart({
      items: [
        createMockCartItem({ id: 'item-1' }),
        createMockCartItem({ id: 'item-2' }),
      ],
    });

    expect(isEmptyCart(cart)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTION TESTS: isBundleItem
// ═══════════════════════════════════════════════════════════════

describe('isBundleItem', () => {
  it('returns true for bundle item', () => {
    const item = createMockCartItem({
      isBundleItem: true,
      bundleGroupId: 'group-abc',
    });

    expect(isBundleItem(item)).toBe(true);
  });

  it('returns false for regular item', () => {
    const item = createMockCartItem({
      isBundleItem: false,
    });

    expect(isBundleItem(item)).toBe(false);
  });

  it('returns false when isBundleItem is true but no bundleGroupId', () => {
    const item = createMockCartItem({
      isBundleItem: true,
      bundleGroupId: undefined,
    });

    expect(isBundleItem(item)).toBe(false);
  });

  it('returns false when isBundleItem is undefined', () => {
    const item = createMockCartItem();

    expect(isBundleItem(item)).toBe(false);
  });

  it('returns false when bundleGroupId exists but isBundleItem is false', () => {
    const item = createMockCartItem({
      isBundleItem: false,
      bundleGroupId: 'group-abc',
    });

    expect(isBundleItem(item)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTION TESTS: getBundleItems
// ═══════════════════════════════════════════════════════════════

describe('getBundleItems', () => {
  it('returns all items with matching bundleGroupId', () => {
    const cart = createMockCart({
      items: [
        createMockCartItem({ id: 'item-1', bundleGroupId: 'group-a' }),
        createMockCartItem({ id: 'item-2', bundleGroupId: 'group-a' }),
        createMockCartItem({ id: 'item-3', bundleGroupId: 'group-b' }),
        createMockCartItem({ id: 'item-4' }), // No bundle
      ],
    });

    const bundleItems = getBundleItems(cart, 'group-a');

    expect(bundleItems).toHaveLength(2);
    expect(bundleItems[0].id).toBe('item-1');
    expect(bundleItems[1].id).toBe('item-2');
  });

  it('returns empty array when no items match', () => {
    const cart = createMockCart({
      items: [
        createMockCartItem({ id: 'item-1', bundleGroupId: 'group-a' }),
      ],
    });

    const bundleItems = getBundleItems(cart, 'group-nonexistent');

    expect(bundleItems).toHaveLength(0);
  });

  it('returns empty array for cart with no items', () => {
    const cart = createMockCart({ items: [] });

    const bundleItems = getBundleItems(cart, 'group-a');

    expect(bundleItems).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTION TESTS: getBundleTotal
// ═══════════════════════════════════════════════════════════════

describe('getBundleTotal', () => {
  it('calculates total for bundle items', () => {
    const cart = createMockCart({
      items: [
        createMockCartItem({ id: 'item-1', bundleGroupId: 'group-a', lineTotal: 1000 }),
        createMockCartItem({ id: 'item-2', bundleGroupId: 'group-a', lineTotal: 2000 }),
        createMockCartItem({ id: 'item-3', bundleGroupId: 'group-b', lineTotal: 5000 }),
      ],
    });

    const total = getBundleTotal(cart, 'group-a');

    expect(total).toBe(3000);
  });

  it('returns 0 for nonexistent bundle group', () => {
    const cart = createMockCart({
      items: [
        createMockCartItem({ bundleGroupId: 'group-a', lineTotal: 1000 }),
      ],
    });

    const total = getBundleTotal(cart, 'group-nonexistent');

    expect(total).toBe(0);
  });

  it('returns 0 for empty cart', () => {
    const cart = createMockCart({ items: [] });

    const total = getBundleTotal(cart, 'group-a');

    expect(total).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTION TESTS: formatPrice
// ═══════════════════════════════════════════════════════════════

describe('formatPrice', () => {
  it('formats USD price correctly', () => {
    expect(formatPrice(1000)).toBe('$10.00');
    expect(formatPrice(2500)).toBe('$25.00');
    expect(formatPrice(9999)).toBe('$99.99');
  });

  it('formats zero price', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('formats cents correctly', () => {
    expect(formatPrice(1)).toBe('$0.01');
    expect(formatPrice(99)).toBe('$0.99');
  });

  it('formats large amounts', () => {
    expect(formatPrice(100000)).toBe('$1,000.00');
    expect(formatPrice(1000000)).toBe('$10,000.00');
  });

  it('formats EUR currency', () => {
    // Note: formatPrice uses Intl.NumberFormat which may vary by environment
    const result = formatPrice(1000, 'EUR', 'de-DE');
    expect(result).toContain('10');
    expect(result).toContain('00');
  });

  it('formats GBP currency', () => {
    const result = formatPrice(1000, 'GBP', 'en-GB');
    expect(result).toContain('10.00');
  });

  it('uses default USD and en-US when not specified', () => {
    const result = formatPrice(1234);
    expect(result).toBe('$12.34');
  });

  it('handles different locales', () => {
    const resultUS = formatPrice(1234, 'USD', 'en-US');
    expect(resultUS).toBe('$12.34');
  });
});

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTION TESTS: calculateSavings
// ═══════════════════════════════════════════════════════════════

describe('calculateSavings', () => {
  it('calculates savings for single item', () => {
    const item = createMockCartItem({
      originalPrice: 3000,
      unitPrice: 2500,
      quantity: 1,
    });

    expect(calculateSavings(item)).toBe(500);
  });

  it('calculates savings for multiple quantity', () => {
    const item = createMockCartItem({
      originalPrice: 3000,
      unitPrice: 2500,
      quantity: 3,
    });

    expect(calculateSavings(item)).toBe(1500);
  });

  it('returns 0 when no discount', () => {
    const item = createMockCartItem({
      originalPrice: 2500,
      unitPrice: 2500,
      quantity: 1,
    });

    expect(calculateSavings(item)).toBe(0);
  });

  it('handles item with unitPrice higher than originalPrice', () => {
    // Edge case: shouldn't happen in practice but function should handle it
    const item = createMockCartItem({
      originalPrice: 2000,
      unitPrice: 2500,
      quantity: 1,
    });

    expect(calculateSavings(item)).toBe(-500);
  });
});

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTION TESTS: getCartSavings
// ═══════════════════════════════════════════════════════════════

describe('getCartSavings', () => {
  it('calculates total savings for all items', () => {
    const cart = createMockCart({
      items: [
        createMockCartItem({
          id: 'item-1',
          originalPrice: 3000,
          unitPrice: 2500,
          quantity: 1,
        }),
        createMockCartItem({
          id: 'item-2',
          originalPrice: 5000,
          unitPrice: 4000,
          quantity: 2,
        }),
      ],
    });

    // Item 1: (3000 - 2500) * 1 = 500
    // Item 2: (5000 - 4000) * 2 = 2000
    // Total: 2500
    expect(getCartSavings(cart)).toBe(2500);
  });

  it('returns 0 for empty cart', () => {
    const cart = createMockCart({ items: [] });

    expect(getCartSavings(cart)).toBe(0);
  });

  it('returns 0 when no discounts', () => {
    const cart = createMockCart({
      items: [
        createMockCartItem({
          originalPrice: 2500,
          unitPrice: 2500,
          quantity: 1,
        }),
      ],
    });

    expect(getCartSavings(cart)).toBe(0);
  });

  it('calculates mixed items with and without discounts', () => {
    const cart = createMockCart({
      items: [
        createMockCartItem({
          id: 'item-1',
          originalPrice: 3000,
          unitPrice: 2500, // 500 savings
          quantity: 1,
        }),
        createMockCartItem({
          id: 'item-2',
          originalPrice: 2000,
          unitPrice: 2000, // No savings
          quantity: 1,
        }),
      ],
    });

    expect(getCartSavings(cart)).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════
// HEADER CONSISTENCY TESTS
// ═══════════════════════════════════════════════════════════════

describe('header consistency across all methods', () => {
  const cartId = 'cart-123';
  const itemId = 'item-1';
  const sessionToken = 'test-session-token';
  const companyId = 'test-company-id';

  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => createMockCart(),
    });
  });

  it('addItem includes session and company headers', async () => {
    await cartApi.addItem(cartId, sessionToken, companyId, {
      productId: 'p1',
      quantity: 1,
    });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['x-session-token']).toBe(sessionToken);
    expect(headers['x-company-id']).toBe(companyId);
  });

  it('updateItem includes session and company headers', async () => {
    await cartApi.updateItem(cartId, itemId, sessionToken, companyId, {
      quantity: 2,
    });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['x-session-token']).toBe(sessionToken);
    expect(headers['x-company-id']).toBe(companyId);
  });

  it('removeItem includes session and company headers', async () => {
    await cartApi.removeItem(cartId, itemId, sessionToken, companyId);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['x-session-token']).toBe(sessionToken);
    expect(headers['x-company-id']).toBe(companyId);
  });

  it('applyDiscount includes session and company headers', async () => {
    await cartApi.applyDiscount(cartId, sessionToken, companyId, 'CODE');

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['x-session-token']).toBe(sessionToken);
    expect(headers['x-company-id']).toBe(companyId);
  });

  it('removeDiscount includes session and company headers', async () => {
    await cartApi.removeDiscount(cartId, sessionToken, companyId, 'CODE');

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['x-session-token']).toBe(sessionToken);
    expect(headers['x-company-id']).toBe(companyId);
  });

  it('updateShipping includes session and company headers', async () => {
    await cartApi.updateShipping(cartId, sessionToken, companyId, {
      postalCode: '12345',
    });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['x-session-token']).toBe(sessionToken);
    expect(headers['x-company-id']).toBe(companyId);
  });

  it('addBundle includes session and company headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cart: createMockCart(),
        bundleGroupId: 'group-1',
        bundlePrice: 1000,
        itemsAdded: 2,
      }),
    });

    await cartApi.addBundle(cartId, sessionToken, companyId, {
      bundleId: 'bundle-1',
    });

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['x-session-token']).toBe(sessionToken);
    expect(headers['x-company-id']).toBe(companyId);
  });

  it('removeBundle includes session and company headers', async () => {
    await cartApi.removeBundle(cartId, 'group-1', sessionToken, companyId);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['x-session-token']).toBe(sessionToken);
    expect(headers['x-company-id']).toBe(companyId);
  });
});
