/**
 * Cart API Client for Company Portal
 *
 * Integrates with the backend CartService for public (anonymous) cart operations.
 * All cart operations require session token and company ID headers for authorization.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ═══════════════════════════════════════════════════════════════
// CART TYPES
// ═══════════════════════════════════════════════════════════════

export interface CartItemSnapshot {
  name: string;
  sku: string;
  image?: string;
  originalPrice: number;
  [key: string]: string | number | undefined;
}

export interface CartDiscountCode {
  code: string;
  discountAmount: number;
  type: 'percentage' | 'fixed';
  description?: string;
}

export interface CartTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  itemCount: number;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  productSnapshot: CartItemSnapshot;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  discountAmount: number;
  lineTotal: number;
  customFields?: Record<string, unknown>;
  giftMessage?: string;
  isGift: boolean;
  addedAt: string;
  /** Bundle-related fields */
  bundleId?: string;
  bundleProductId?: string;
  bundleGroupId?: string;
  isBundleItem?: boolean;
}

export interface SavedCartItem {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  priceAtSave: number;
  savedAt: string;
}

export interface CartResponse {
  id: string;
  companyId: string;
  siteId?: string;
  customerId?: string;
  sessionToken?: string;
  visitorId?: string;
  status: string;
  currency: string;
  totals: CartTotals;
  discountCodes: CartDiscountCode[];
  items: CartItem[];
  savedItems: SavedCartItem[];
  shippingPostalCode?: string;
  shippingCountry?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  expiresAt?: string;
}

export interface EmptyCartResponse {
  items: [];
  totals: {
    subtotal: 0;
    grandTotal: 0;
    itemCount: 0;
  };
}

export interface AddItemRequest {
  productId: string;
  variantId?: string;
  quantity: number;
  customFields?: Record<string, unknown>;
  giftMessage?: string;
  isGift?: boolean;
}

export interface UpdateItemRequest {
  quantity?: number;
  customFields?: Record<string, unknown>;
  giftMessage?: string;
  isGift?: boolean;
}

export interface CreateCartRequest {
  siteId?: string;
  visitorId?: string;
  currency?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface UpdateShippingRequest {
  postalCode?: string;
  country?: string;
}

export interface BundleItemSelection {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface AddBundleRequest {
  bundleId: string;
  selectedItems?: BundleItemSelection[];
  quantity?: number;
}

export interface BundleAddResult {
  cart: CartResponse;
  bundleGroupId: string;
  bundlePrice: number;
  itemsAdded: number;
}

// ═══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════

export class CartApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = 'CartApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status}`;
    let errorCode: string | undefined;

    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorBody.error || errorMessage;
      errorCode = errorBody.errorCode || errorBody.code;
    } catch {
      // Response body is not JSON, use default message
    }

    throw new CartApiError(errorMessage, response.status, errorCode);
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════════
// CART API INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface CartApi {
  /**
   * Create a new anonymous cart
   * @param companyId - Company ID to associate the cart with
   * @param options - Optional cart creation options (currency, UTM params, etc.)
   */
  createCart(companyId: string, options?: CreateCartRequest): Promise<CartResponse>;

  /**
   * Get cart by session token
   * @param sessionToken - Cart session token
   * @param companyId - Company ID
   * @returns Cart data or empty cart structure if not found
   */
  getCart(sessionToken: string, companyId: string): Promise<CartResponse | EmptyCartResponse>;

  /**
   * Add an item to the cart
   * @param cartId - Cart ID
   * @param sessionToken - Cart session token for authorization
   * @param companyId - Company ID
   * @param item - Item to add (productId, quantity, etc.)
   */
  addItem(
    cartId: string,
    sessionToken: string,
    companyId: string,
    item: AddItemRequest
  ): Promise<CartResponse>;

  /**
   * Update the quantity of a cart item
   * @param cartId - Cart ID
   * @param itemId - Cart item ID to update
   * @param sessionToken - Cart session token for authorization
   * @param companyId - Company ID
   * @param quantity - New quantity (0 to remove)
   */
  updateItemQuantity(
    cartId: string,
    itemId: string,
    sessionToken: string,
    companyId: string,
    quantity: number
  ): Promise<CartResponse>;

  /**
   * Update a cart item with full options
   * @param cartId - Cart ID
   * @param itemId - Cart item ID to update
   * @param sessionToken - Cart session token for authorization
   * @param companyId - Company ID
   * @param updates - Update data (quantity, customFields, giftMessage, isGift)
   */
  updateItem(
    cartId: string,
    itemId: string,
    sessionToken: string,
    companyId: string,
    updates: UpdateItemRequest
  ): Promise<CartResponse>;

  /**
   * Remove an item from the cart
   * @param cartId - Cart ID
   * @param itemId - Cart item ID to remove
   * @param sessionToken - Cart session token for authorization
   * @param companyId - Company ID
   */
  removeItem(
    cartId: string,
    itemId: string,
    sessionToken: string,
    companyId: string
  ): Promise<CartResponse>;

  /**
   * Apply a discount code to the cart
   * @param cartId - Cart ID
   * @param sessionToken - Cart session token for authorization
   * @param companyId - Company ID
   * @param code - Discount code to apply
   */
  applyDiscount(
    cartId: string,
    sessionToken: string,
    companyId: string,
    code: string
  ): Promise<CartResponse>;

  /**
   * Remove a discount code from the cart
   * @param cartId - Cart ID
   * @param sessionToken - Cart session token for authorization
   * @param companyId - Company ID
   * @param code - Discount code to remove
   */
  removeDiscount(
    cartId: string,
    sessionToken: string,
    companyId: string,
    code: string
  ): Promise<CartResponse>;

  /**
   * Update shipping information for estimation
   * @param cartId - Cart ID
   * @param sessionToken - Cart session token for authorization
   * @param companyId - Company ID
   * @param shipping - Shipping address info (postalCode, country)
   */
  updateShipping(
    cartId: string,
    sessionToken: string,
    companyId: string,
    shipping: UpdateShippingRequest
  ): Promise<CartResponse>;

  /**
   * Add a product bundle to the cart
   * @param cartId - Cart ID
   * @param sessionToken - Cart session token for authorization
   * @param companyId - Company ID
   * @param bundle - Bundle to add
   */
  addBundle(
    cartId: string,
    sessionToken: string,
    companyId: string,
    bundle: AddBundleRequest
  ): Promise<BundleAddResult>;

  /**
   * Remove a product bundle from the cart
   * @param cartId - Cart ID
   * @param bundleGroupId - Bundle group ID to remove
   * @param sessionToken - Cart session token for authorization
   * @param companyId - Company ID
   */
  removeBundle(
    cartId: string,
    bundleGroupId: string,
    sessionToken: string,
    companyId: string
  ): Promise<CartResponse>;
}

// ═══════════════════════════════════════════════════════════════
// CART API IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════

export const cartApi: CartApi = {
  async createCart(
    companyId: string,
    options?: CreateCartRequest
  ): Promise<CartResponse> {
    const response = await fetch(`${API_BASE}/api/public/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': companyId,
      },
      body: JSON.stringify(options || {}),
    });

    return handleResponse<CartResponse>(response);
  },

  async getCart(
    sessionToken: string,
    companyId: string
  ): Promise<CartResponse | EmptyCartResponse> {
    const response = await fetch(`${API_BASE}/api/public/cart`, {
      method: 'GET',
      headers: {
        'x-session-token': sessionToken,
        'x-company-id': companyId,
      },
      cache: 'no-store',
    });

    return handleResponse<CartResponse | EmptyCartResponse>(response);
  },

  async addItem(
    cartId: string,
    sessionToken: string,
    companyId: string,
    item: AddItemRequest
  ): Promise<CartResponse> {
    const response = await fetch(`${API_BASE}/api/public/cart/${cartId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': sessionToken,
        'x-company-id': companyId,
      },
      body: JSON.stringify(item),
    });

    return handleResponse<CartResponse>(response);
  },

  async updateItemQuantity(
    cartId: string,
    itemId: string,
    sessionToken: string,
    companyId: string,
    quantity: number
  ): Promise<CartResponse> {
    return this.updateItem(cartId, itemId, sessionToken, companyId, { quantity });
  },

  async updateItem(
    cartId: string,
    itemId: string,
    sessionToken: string,
    companyId: string,
    updates: UpdateItemRequest
  ): Promise<CartResponse> {
    const response = await fetch(
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

    return handleResponse<CartResponse>(response);
  },

  async removeItem(
    cartId: string,
    itemId: string,
    sessionToken: string,
    companyId: string
  ): Promise<CartResponse> {
    const response = await fetch(
      `${API_BASE}/api/public/cart/${cartId}/items/${itemId}`,
      {
        method: 'DELETE',
        headers: {
          'x-session-token': sessionToken,
          'x-company-id': companyId,
        },
      }
    );

    return handleResponse<CartResponse>(response);
  },

  async applyDiscount(
    cartId: string,
    sessionToken: string,
    companyId: string,
    code: string
  ): Promise<CartResponse> {
    const response = await fetch(
      `${API_BASE}/api/public/cart/${cartId}/discount`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
          'x-company-id': companyId,
        },
        body: JSON.stringify({ code }),
      }
    );

    return handleResponse<CartResponse>(response);
  },

  async removeDiscount(
    cartId: string,
    sessionToken: string,
    companyId: string,
    code: string
  ): Promise<CartResponse> {
    const response = await fetch(
      `${API_BASE}/api/public/cart/${cartId}/discount/${encodeURIComponent(code)}`,
      {
        method: 'DELETE',
        headers: {
          'x-session-token': sessionToken,
          'x-company-id': companyId,
        },
      }
    );

    return handleResponse<CartResponse>(response);
  },

  async updateShipping(
    cartId: string,
    sessionToken: string,
    companyId: string,
    shipping: UpdateShippingRequest
  ): Promise<CartResponse> {
    const response = await fetch(
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

    return handleResponse<CartResponse>(response);
  },

  async addBundle(
    cartId: string,
    sessionToken: string,
    companyId: string,
    bundle: AddBundleRequest
  ): Promise<BundleAddResult> {
    const response = await fetch(
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

    return handleResponse<BundleAddResult>(response);
  },

  async removeBundle(
    cartId: string,
    bundleGroupId: string,
    sessionToken: string,
    companyId: string
  ): Promise<CartResponse> {
    const response = await fetch(
      `${API_BASE}/api/public/cart/${cartId}/bundles/${bundleGroupId}`,
      {
        method: 'DELETE',
        headers: {
          'x-session-token': sessionToken,
          'x-company-id': companyId,
        },
      }
    );

    return handleResponse<CartResponse>(response);
  },
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a cart response is empty
 */
export function isEmptyCart(
  cart: CartResponse | EmptyCartResponse
): cart is EmptyCartResponse {
  return !('id' in cart) || cart.items.length === 0;
}

/**
 * Check if a cart item is part of a bundle
 */
export function isBundleItem(item: CartItem): boolean {
  return item.isBundleItem === true && !!item.bundleGroupId;
}

/**
 * Get all items belonging to a specific bundle group
 */
export function getBundleItems(
  cart: CartResponse,
  bundleGroupId: string
): CartItem[] {
  return cart.items.filter((item) => item.bundleGroupId === bundleGroupId);
}

/**
 * Calculate the total price for a specific bundle group
 */
export function getBundleTotal(
  cart: CartResponse,
  bundleGroupId: string
): number {
  return getBundleItems(cart, bundleGroupId).reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );
}

/**
 * Format price for display
 */
export function formatPrice(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount / 100);
}

/**
 * Calculate savings (original price - current price)
 */
export function calculateSavings(item: CartItem): number {
  return (item.originalPrice - item.unitPrice) * item.quantity;
}

/**
 * Get the total savings for the cart
 */
export function getCartSavings(cart: CartResponse): number {
  return cart.items.reduce((total, item) => total + calculateSavings(item), 0);
}
