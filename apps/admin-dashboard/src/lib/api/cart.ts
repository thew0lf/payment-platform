import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// CART TYPES
// ═══════════════════════════════════════════════════════════════

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  customFields?: Record<string, unknown>;
  giftMessage?: string;
  isGift?: boolean;
  savedForLater: boolean;
  bundleGroupId?: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    images?: string[];
  };
  variant?: {
    id: string;
    name: string;
    sku: string;
    options?: Record<string, string>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CartDiscount {
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  value: number;
  appliedAmount: number;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  grandTotal: number;
  itemCount: number;
  currency: string;
}

export interface Cart {
  id: string;
  companyId: string;
  customerId?: string;
  sessionToken: string;
  siteId?: string;
  visitorId?: string;
  status: 'ACTIVE' | 'CONVERTED' | 'ABANDONED' | 'MERGED';
  currency: string;
  items: CartItem[];
  savedItems: CartItem[];
  discounts: CartDiscount[];
  totals: CartTotals;
  shippingAddress?: Record<string, unknown>;
  billingAddress?: Record<string, unknown>;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  abandonedAt?: string;
  convertedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartInput {
  productId: string;
  variantId?: string;
  quantity: number;
  customFields?: Record<string, unknown>;
  giftMessage?: string;
  isGift?: boolean;
}

export interface UpdateCartItemInput {
  quantity?: number;
  customFields?: Record<string, unknown>;
  giftMessage?: string;
  isGift?: boolean;
}

export interface ApplyDiscountInput {
  code: string;
}

export interface CreateCartInput {
  siteId?: string;
  visitorId?: string;
  currency?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface MergeCartsInput {
  sourceCartId: string;
}

export interface MoveToCartInput {
  quantity?: number;
}

export interface BundleItemSelection {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface AddBundleToCartInput {
  bundleId: string;
  selectedItems?: BundleItemSelection[];
  quantity?: number;
}

export interface CartQueryParams {
  siteId?: string;
  includeSaved?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// CART API CLIENT (Authenticated)
// ═══════════════════════════════════════════════════════════════

export const cartApi = {
  /**
   * Get the current user's cart
   */
  getCart: async (params: CartQueryParams = {}): Promise<Cart> => {
    const query = new URLSearchParams();
    if (params.siteId) query.set('siteId', params.siteId);
    if (params.includeSaved !== undefined) query.set('includeSaved', String(params.includeSaved));
    const queryStr = query.toString();
    return apiRequest.get<Cart>(`/api/cart${queryStr ? `?${queryStr}` : ''}`);
  },

  /**
   * Add an item to the cart
   */
  addItem: async (data: AddToCartInput, siteId?: string): Promise<Cart> => {
    const params = siteId ? `?siteId=${siteId}` : '';
    return apiRequest.post<Cart>(`/api/cart/items${params}`, data);
  },

  /**
   * Update a cart item
   */
  updateItem: async (itemId: string, data: UpdateCartItemInput): Promise<Cart> => {
    return apiRequest.patch<Cart>(`/api/cart/items/${itemId}`, data);
  },

  /**
   * Remove an item from the cart
   */
  removeItem: async (itemId: string): Promise<Cart> => {
    return apiRequest.delete<Cart>(`/api/cart/items/${itemId}`);
  },

  /**
   * Add a bundle to the cart
   */
  addBundle: async (data: AddBundleToCartInput, siteId?: string): Promise<Cart> => {
    const params = siteId ? `?siteId=${siteId}` : '';
    return apiRequest.post<Cart>(`/api/cart/bundles${params}`, data);
  },

  /**
   * Remove a bundle from the cart
   */
  removeBundle: async (bundleGroupId: string): Promise<Cart> => {
    return apiRequest.delete<Cart>(`/api/cart/bundles/${bundleGroupId}`);
  },

  /**
   * Apply a discount code to the cart
   */
  applyDiscount: async (data: ApplyDiscountInput): Promise<Cart> => {
    return apiRequest.post<Cart>('/api/cart/discount', data);
  },

  /**
   * Remove a discount code from the cart
   */
  removeDiscount: async (code: string): Promise<Cart> => {
    return apiRequest.delete<Cart>(`/api/cart/discount/${encodeURIComponent(code)}`);
  },

  /**
   * Save a cart item for later
   */
  saveForLater: async (itemId: string): Promise<Cart> => {
    return apiRequest.post<Cart>(`/api/cart/items/${itemId}/save-for-later`);
  },

  /**
   * Move a saved item back to the cart
   */
  moveToCart: async (savedItemId: string, data: MoveToCartInput = {}): Promise<Cart> => {
    return apiRequest.post<Cart>(`/api/cart/saved/${savedItemId}/move-to-cart`, data);
  },

  /**
   * Clear the entire cart
   */
  clearCart: async (): Promise<Cart> => {
    return apiRequest.delete<Cart>('/api/cart');
  },

  /**
   * Merge a guest cart into the user's cart
   */
  mergeCarts: async (data: MergeCartsInput): Promise<Cart> => {
    return apiRequest.post<Cart>('/api/cart/merge', data);
  },
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC CART API CLIENT (Anonymous/Guest Users)
// ═══════════════════════════════════════════════════════════════

export interface PublicCartHeaders {
  sessionToken: string;
  companyId: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function publicCartRequest<T>(
  endpoint: string,
  headers: PublicCartHeaders,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': headers.sessionToken,
      'x-company-id': headers.companyId,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  if (response.status === 204 || contentLength === '0') {
    return undefined as T;
  }

  return response.json();
}

export const publicCartApi = {
  /**
   * Get cart by session token (anonymous)
   */
  getCart: async (headers: PublicCartHeaders): Promise<Cart> => {
    return publicCartRequest<Cart>('/api/public/cart', headers);
  },

  /**
   * Create a new anonymous cart
   */
  createCart: async (companyId: string, data: CreateCartInput = {}): Promise<Cart> => {
    const response = await fetch(`${API_BASE_URL}/api/public/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-company-id': companyId,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },

  /**
   * Add item to cart (anonymous)
   */
  addItem: async (cartId: string, headers: PublicCartHeaders, data: AddToCartInput): Promise<Cart> => {
    return publicCartRequest<Cart>(`/api/public/cart/${cartId}/items`, headers, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update cart item (anonymous)
   */
  updateItem: async (
    cartId: string,
    itemId: string,
    headers: PublicCartHeaders,
    data: UpdateCartItemInput
  ): Promise<Cart> => {
    return publicCartRequest<Cart>(`/api/public/cart/${cartId}/items/${itemId}`, headers, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Remove item from cart (anonymous)
   */
  removeItem: async (cartId: string, itemId: string, headers: PublicCartHeaders): Promise<Cart> => {
    return publicCartRequest<Cart>(`/api/public/cart/${cartId}/items/${itemId}`, headers, {
      method: 'DELETE',
    });
  },

  /**
   * Apply discount code (anonymous)
   */
  applyDiscount: async (cartId: string, headers: PublicCartHeaders, data: ApplyDiscountInput): Promise<Cart> => {
    return publicCartRequest<Cart>(`/api/public/cart/${cartId}/discount`, headers, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Remove discount code (anonymous)
   */
  removeDiscount: async (cartId: string, code: string, headers: PublicCartHeaders): Promise<Cart> => {
    return publicCartRequest<Cart>(
      `/api/public/cart/${cartId}/discount/${encodeURIComponent(code)}`,
      headers,
      { method: 'DELETE' }
    );
  },

  /**
   * Add bundle to cart (anonymous)
   */
  addBundle: async (cartId: string, headers: PublicCartHeaders, data: AddBundleToCartInput): Promise<Cart> => {
    return publicCartRequest<Cart>(`/api/public/cart/${cartId}/bundles`, headers, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Remove bundle from cart (anonymous)
   */
  removeBundle: async (cartId: string, bundleGroupId: string, headers: PublicCartHeaders): Promise<Cart> => {
    return publicCartRequest<Cart>(`/api/public/cart/${cartId}/bundles/${bundleGroupId}`, headers, {
      method: 'DELETE',
    });
  },
};
