import { apiRequest } from '../api';

// ============================================================================
// Types
// ============================================================================

export type BundleType = 'FIXED' | 'MIX_AND_MATCH' | 'SUBSCRIPTION_BOX';
export type BundlePricing = 'FIXED' | 'CALCULATED' | 'TIERED';
export type AdjustmentType = 'FIXED_AMOUNT' | 'PERCENTAGE' | 'FIXED_PRICE';

export interface BundleItem {
  id: string;
  bundleId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  isRequired: boolean;
  sortOrder: number;
  priceOverride?: number;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    price?: number;
  };
  variant?: {
    id: string;
    name: string;
    sku: string;
    price?: number;
  };
}

export interface Bundle {
  id: string;
  companyId: string;
  productId: string;
  type: BundleType;
  pricingStrategy: BundlePricing;
  discountType?: AdjustmentType;
  discountValue?: number;
  minItems?: number;
  maxItems?: number;
  isActive: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  items: BundleItem[];
  product?: {
    id: string;
    name: string;
    sku: string;
    price?: number;
  };
}

export interface PriceCalculation {
  basePrice: number;
  itemsTotal: number;
  discountAmount: number;
  finalPrice: number;
  breakdown: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

// ============================================================================
// Input Types
// ============================================================================

export interface BundleItemInput {
  productId: string;
  variantId?: string;
  quantity?: number;
  isRequired?: boolean;
  priceOverride?: number;
}

export interface CreateBundleInput {
  productId: string;
  type?: BundleType;
  pricingStrategy?: BundlePricing;
  discountType?: AdjustmentType;
  discountValue?: number;
  minItems?: number;
  maxItems?: number;
  isActive?: boolean;
  items?: BundleItemInput[];
}

export interface UpdateBundleInput {
  type?: BundleType;
  pricingStrategy?: BundlePricing;
  discountType?: AdjustmentType;
  discountValue?: number;
  minItems?: number;
  maxItems?: number;
  isActive?: boolean;
}

export interface AddBundleItemInput {
  productId: string;
  variantId?: string;
  quantity?: number;
  isRequired?: boolean;
  priceOverride?: number;
}

export interface UpdateBundleItemInput {
  quantity?: number;
  isRequired?: boolean;
  priceOverride?: number;
  sortOrder?: number;
}

// ============================================================================
// Bundle API
// ============================================================================

export const bundlesApi = {
  list: async (
    companyId?: string,
    filters?: { type?: BundleType; isActive?: boolean },
  ): Promise<Bundle[]> => {
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', companyId);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
    const query = params.toString();
    return apiRequest.get<Bundle[]>(`/api/bundles${query ? `?${query}` : ''}`);
  },

  get: async (id: string): Promise<Bundle> => {
    return apiRequest.get<Bundle>(`/api/bundles/${id}`);
  },

  getByProduct: async (productId: string): Promise<Bundle | null> => {
    return apiRequest.get<Bundle | null>(`/api/bundles/product/${productId}`);
  },

  create: async (input: CreateBundleInput): Promise<Bundle> => {
    return apiRequest.post<Bundle>('/api/bundles', input);
  },

  update: async (id: string, input: UpdateBundleInput): Promise<Bundle> => {
    return apiRequest.patch<Bundle>(`/api/bundles/${id}`, input);
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/bundles/${id}`);
  },

  // Bundle Items
  addItem: async (bundleId: string, item: AddBundleItemInput): Promise<BundleItem> => {
    return apiRequest.post<BundleItem>(`/api/bundles/${bundleId}/items`, item);
  },

  updateItem: async (
    bundleId: string,
    itemId: string,
    update: UpdateBundleItemInput,
  ): Promise<BundleItem> => {
    return apiRequest.patch<BundleItem>(`/api/bundles/${bundleId}/items/${itemId}`, update);
  },

  removeItem: async (bundleId: string, itemId: string): Promise<void> => {
    return apiRequest.delete(`/api/bundles/${bundleId}/items/${itemId}`);
  },

  reorderItems: async (bundleId: string, itemIds: string[]): Promise<BundleItem[]> => {
    return apiRequest.post<BundleItem[]>(`/api/bundles/${bundleId}/items/reorder`, { itemIds });
  },

  calculatePrice: async (
    bundleId: string,
    selectedItems?: Array<{ productId: string; variantId?: string; quantity: number }>,
  ): Promise<PriceCalculation> => {
    const params = selectedItems
      ? `?selectedItems=${encodeURIComponent(JSON.stringify(selectedItems))}`
      : '';
    return apiRequest.get<PriceCalculation>(`/api/bundles/${bundleId}/calculate-price${params}`);
  },
};
