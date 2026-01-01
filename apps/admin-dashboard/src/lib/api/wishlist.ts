import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// WISHLIST TYPES
// ═══════════════════════════════════════════════════════════════

export interface WishlistItem {
  id: string;
  wishlistId: string;
  productId: string;
  variantId?: string;
  priority: number;
  notes?: string;
  priceAtAdd: number;
  currentPrice?: number;
  product?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    images?: string[];
    status: string;
  };
  variant?: {
    id: string;
    name: string;
    sku: string;
    price?: number;
    options?: Record<string, string>;
  };
  addedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Wishlist {
  id: string;
  companyId: string;
  customerId?: string;
  sessionToken: string;
  siteId?: string;
  name: string;
  isPublic: boolean;
  sharedUrl?: string;
  items: WishlistItem[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistStats {
  totalItems: number;
  totalValue: number;
  oldestItemDate: string | null;
  newestItemDate: string | null;
}

export interface AddToWishlistInput {
  productId: string;
  variantId?: string;
  priority?: number;
  notes?: string;
}

export interface UpdateWishlistInput {
  name?: string;
  isPublic?: boolean;
}

export interface UpdateWishlistItemInput {
  priority?: number;
  notes?: string;
}

export interface ShareWishlistInput {
  isPublic: boolean;
}

export interface CreateWishlistInput {
  name?: string;
  siteId?: string;
  isPublic?: boolean;
}

export interface MergeWishlistsInput {
  sourceWishlistId: string;
}

export interface WishlistQueryParams {
  siteId?: string;
  includeItems?: boolean;
  isPublic?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// WISHLIST API CLIENT (Authenticated)
// ═══════════════════════════════════════════════════════════════

export const wishlistApi = {
  /**
   * Get the current user's wishlist
   */
  getWishlist: async (params: WishlistQueryParams = {}): Promise<Wishlist> => {
    const query = new URLSearchParams();
    if (params.siteId) query.set('siteId', params.siteId);
    if (params.includeItems !== undefined) query.set('includeItems', String(params.includeItems));
    if (params.isPublic !== undefined) query.set('isPublic', String(params.isPublic));
    const queryStr = query.toString();
    return apiRequest.get<Wishlist>(`/api/wishlist${queryStr ? `?${queryStr}` : ''}`);
  },

  /**
   * Add an item to the wishlist
   */
  addItem: async (data: AddToWishlistInput, siteId?: string): Promise<Wishlist> => {
    const params = siteId ? `?siteId=${siteId}` : '';
    return apiRequest.post<Wishlist>(`/api/wishlist/items${params}`, data);
  },

  /**
   * Update a wishlist item
   */
  updateItem: async (itemId: string, data: UpdateWishlistItemInput): Promise<Wishlist> => {
    return apiRequest.patch<Wishlist>(`/api/wishlist/items/${itemId}`, data);
  },

  /**
   * Remove an item from the wishlist
   */
  removeItem: async (itemId: string): Promise<Wishlist> => {
    return apiRequest.delete<Wishlist>(`/api/wishlist/items/${itemId}`);
  },

  /**
   * Update the wishlist (name, isPublic)
   */
  updateWishlist: async (data: UpdateWishlistInput): Promise<Wishlist> => {
    return apiRequest.patch<Wishlist>('/api/wishlist', data);
  },

  /**
   * Clear the entire wishlist
   */
  clearWishlist: async (): Promise<Wishlist> => {
    return apiRequest.delete<Wishlist>('/api/wishlist');
  },

  /**
   * Toggle public sharing for the wishlist
   */
  toggleSharing: async (data: ShareWishlistInput): Promise<Wishlist> => {
    return apiRequest.post<Wishlist>('/api/wishlist/share', data);
  },

  /**
   * Merge a guest wishlist into the user's wishlist
   */
  mergeWishlists: async (data: MergeWishlistsInput): Promise<Wishlist> => {
    return apiRequest.post<Wishlist>('/api/wishlist/merge', data);
  },

  /**
   * Get wishlist statistics
   */
  getStats: async (): Promise<WishlistStats> => {
    return apiRequest.get<WishlistStats>('/api/wishlist/stats');
  },
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC WISHLIST API CLIENT (Anonymous/Guest Users)
// ═══════════════════════════════════════════════════════════════

export interface PublicWishlistHeaders {
  sessionToken: string;
  companyId: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function publicWishlistRequest<T>(
  endpoint: string,
  headers: PublicWishlistHeaders,
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

export const publicWishlistApi = {
  /**
   * Get wishlist by session token (anonymous)
   */
  getWishlist: async (headers: PublicWishlistHeaders): Promise<Wishlist> => {
    return publicWishlistRequest<Wishlist>('/api/public/wishlist', headers);
  },

  /**
   * Create a new anonymous wishlist
   */
  createWishlist: async (companyId: string, data: CreateWishlistInput = {}): Promise<Wishlist> => {
    const response = await fetch(`${API_BASE_URL}/api/public/wishlist`, {
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
   * Add item to wishlist (anonymous)
   */
  addItem: async (
    wishlistId: string,
    headers: PublicWishlistHeaders,
    data: AddToWishlistInput
  ): Promise<Wishlist> => {
    return publicWishlistRequest<Wishlist>(`/api/public/wishlist/${wishlistId}/items`, headers, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update wishlist item (anonymous)
   */
  updateItem: async (
    wishlistId: string,
    itemId: string,
    headers: PublicWishlistHeaders,
    data: UpdateWishlistItemInput
  ): Promise<Wishlist> => {
    return publicWishlistRequest<Wishlist>(
      `/api/public/wishlist/${wishlistId}/items/${itemId}`,
      headers,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Remove item from wishlist (anonymous)
   */
  removeItem: async (wishlistId: string, itemId: string, headers: PublicWishlistHeaders): Promise<Wishlist> => {
    return publicWishlistRequest<Wishlist>(
      `/api/public/wishlist/${wishlistId}/items/${itemId}`,
      headers,
      { method: 'DELETE' }
    );
  },

  /**
   * Get a public wishlist by shared URL
   */
  getSharedWishlist: async (sharedUrl: string): Promise<Wishlist> => {
    const response = await fetch(`${API_BASE_URL}/api/public/wishlist/shared/${sharedUrl}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },
};
