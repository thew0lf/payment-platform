import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// COMPARISON TYPES
// ═══════════════════════════════════════════════════════════════

export interface ComparisonItem {
  id: string;
  comparisonId: string;
  productId: string;
  variantId?: string;
  position: number;
  product?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    description?: string;
    images?: string[];
    attributes?: Record<string, unknown>;
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

export interface Comparison {
  id: string;
  companyId: string;
  customerId?: string;
  sessionToken: string;
  siteId?: string;
  visitorId?: string;
  name?: string;
  items: ComparisonItem[];
  isShared: boolean;
  shareToken?: string;
  shareExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComparisonInput {
  siteId?: string;
  visitorId?: string;
  name?: string;
}

export interface AddToComparisonInput {
  productId: string;
  variantId?: string;
  position?: number;
}

export interface ReorderItemsInput {
  itemIds: string[];
}

export interface ShareComparisonInput {
  name?: string;
  expiresInDays?: number;
}

export interface UpdateComparisonInput {
  name?: string;
}

export interface MergeComparisonsInput {
  sourceComparisonId: string;
}

export interface ComparisonQueryParams {
  siteId?: string;
  includeItems?: boolean;
}

// Maximum number of items allowed in a comparison
export const MAX_COMPARISON_ITEMS = 4;

// ═══════════════════════════════════════════════════════════════
// COMPARISON API CLIENT (Authenticated)
// ═══════════════════════════════════════════════════════════════

export const comparisonApi = {
  /**
   * Get the current user's comparison
   */
  getComparison: async (params: ComparisonQueryParams = {}): Promise<Comparison> => {
    const query = new URLSearchParams();
    if (params.siteId) query.set('siteId', params.siteId);
    if (params.includeItems !== undefined) query.set('includeItems', String(params.includeItems));
    const queryStr = query.toString();
    return apiRequest.get<Comparison>(`/api/comparison${queryStr ? `?${queryStr}` : ''}`);
  },

  /**
   * Add an item to the comparison
   */
  addItem: async (data: AddToComparisonInput, siteId?: string): Promise<Comparison> => {
    const params = siteId ? `?siteId=${siteId}` : '';
    return apiRequest.post<Comparison>(`/api/comparison/items${params}`, data);
  },

  /**
   * Remove an item from the comparison
   */
  removeItem: async (itemId: string): Promise<Comparison> => {
    return apiRequest.delete<Comparison>(`/api/comparison/items/${itemId}`);
  },

  /**
   * Reorder items in the comparison
   */
  reorderItems: async (data: ReorderItemsInput): Promise<Comparison> => {
    return apiRequest.post<Comparison>('/api/comparison/reorder', data);
  },

  /**
   * Update comparison metadata
   */
  updateComparison: async (data: UpdateComparisonInput): Promise<Comparison> => {
    return apiRequest.patch<Comparison>('/api/comparison', data);
  },

  /**
   * Clear the entire comparison
   */
  clearComparison: async (): Promise<Comparison> => {
    return apiRequest.delete<Comparison>('/api/comparison');
  },

  /**
   * Create a share link for the comparison
   */
  shareComparison: async (data: ShareComparisonInput = {}): Promise<Comparison> => {
    return apiRequest.post<Comparison>('/api/comparison/share', data);
  },

  /**
   * Remove the share link from the comparison
   */
  unshareComparison: async (): Promise<Comparison> => {
    return apiRequest.delete<Comparison>('/api/comparison/share');
  },

  /**
   * Merge a guest comparison into the user's comparison
   */
  mergeComparisons: async (data: MergeComparisonsInput): Promise<Comparison> => {
    return apiRequest.post<Comparison>('/api/comparison/merge', data);
  },
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC COMPARISON API CLIENT (Anonymous/Guest Users)
// ═══════════════════════════════════════════════════════════════

export interface PublicComparisonHeaders {
  sessionToken: string;
  companyId: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function publicComparisonRequest<T>(
  endpoint: string,
  headers: PublicComparisonHeaders,
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

export const publicComparisonApi = {
  /**
   * Get comparison by session token (anonymous)
   */
  getComparison: async (headers: PublicComparisonHeaders): Promise<Comparison> => {
    return publicComparisonRequest<Comparison>('/api/public/comparison', headers);
  },

  /**
   * Create a new anonymous comparison
   */
  createComparison: async (companyId: string, data: CreateComparisonInput = {}): Promise<Comparison> => {
    const response = await fetch(`${API_BASE_URL}/api/public/comparison`, {
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
   * Add item to comparison (anonymous)
   */
  addItem: async (
    comparisonId: string,
    headers: PublicComparisonHeaders,
    data: AddToComparisonInput
  ): Promise<Comparison> => {
    return publicComparisonRequest<Comparison>(
      `/api/public/comparison/${comparisonId}/items`,
      headers,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Remove item from comparison (anonymous)
   */
  removeItem: async (
    comparisonId: string,
    itemId: string,
    headers: PublicComparisonHeaders
  ): Promise<Comparison> => {
    return publicComparisonRequest<Comparison>(
      `/api/public/comparison/${comparisonId}/items/${itemId}`,
      headers,
      { method: 'DELETE' }
    );
  },

  /**
   * Reorder items in comparison (anonymous)
   */
  reorderItems: async (
    comparisonId: string,
    headers: PublicComparisonHeaders,
    data: ReorderItemsInput
  ): Promise<Comparison> => {
    return publicComparisonRequest<Comparison>(
      `/api/public/comparison/${comparisonId}/reorder`,
      headers,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Get a shared comparison by share token
   */
  getSharedComparison: async (shareToken: string): Promise<Comparison> => {
    const response = await fetch(`${API_BASE_URL}/api/public/comparison/shared/${shareToken}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },
};
