import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// SALES CHANNEL TYPES
// ═══════════════════════════════════════════════════════════════

export type SalesChannelType =
  | 'ONLINE_STORE'
  | 'POS'
  | 'WHOLESALE'
  | 'MARKETPLACE'
  | 'SOCIAL'
  | 'CUSTOM';

export interface SalesChannelSettings {
  requiresApproval?: boolean;
  minPrice?: number;
  maxPrice?: number;
  allowedCategories?: string[];
  excludedCategories?: string[];
}

export interface SalesChannel {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  type: SalesChannelType;
  description?: string;
  iconUrl?: string;
  settings?: SalesChannelSettings;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalesChannelInput {
  name: string;
  slug?: string; // Auto-generated if not provided
  type: SalesChannelType;
  description?: string;
  iconUrl?: string;
  settings?: SalesChannelSettings;
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface UpdateSalesChannelInput
  extends Partial<CreateSalesChannelInput> {}

// Product-Channel relationship types
export interface ProductSalesChannel {
  id: string;
  productId: string;
  channelId: string;
  isPublished: boolean;
  publishedAt?: string;
  channelPrice?: number;
  isVisible: boolean;
  channel: SalesChannel;
  createdAt: string;
  updatedAt: string;
}

export interface PublishToChannelInput {
  channelId: string;
  isPublished?: boolean;
  channelPrice?: number;
  isVisible?: boolean;
}

export interface BulkPublishInput {
  channelId: string;
  productIds: string[];
  isPublished?: boolean;
}

export interface BulkPublishResult {
  success: number;
  failed: number;
  errors?: string[];
}

export interface ChannelProductsParams {
  limit?: number;
  offset?: number;
  publishedOnly?: boolean;
  search?: string;
}

export interface ChannelProduct {
  id: string;
  productId: string;
  isPublished: boolean;
  publishedAt?: string;
  channelPrice?: number;
  isVisible: boolean;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    status: string;
    images?: string[];
  };
}

// ═══════════════════════════════════════════════════════════════
// SALES CHANNELS API
// ═══════════════════════════════════════════════════════════════

export const salesChannelsApi = {
  // ═══════════════════════════════════════════════════════════════
  // CHANNEL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * List all sales channels for a company
   */
  list: async (
    params: { activeOnly?: boolean; companyId?: string } = {}
  ): Promise<SalesChannel[]> => {
    const query = new URLSearchParams();
    if (params.activeOnly !== undefined) {
      query.set('activeOnly', String(params.activeOnly));
    }
    if (params.companyId) {
      query.set('companyId', params.companyId);
    }
    const queryStr = query.toString();
    return apiRequest.get<SalesChannel[]>(
      `/api/sales-channels${queryStr ? `?${queryStr}` : ''}`
    );
  },

  /**
   * Get a single sales channel by ID
   */
  get: async (id: string, companyId?: string): Promise<SalesChannel> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<SalesChannel>(`/api/sales-channels/${id}${params}`);
  },

  /**
   * Create a new sales channel
   */
  create: async (
    data: CreateSalesChannelInput,
    companyId?: string
  ): Promise<SalesChannel> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<SalesChannel>(`/api/sales-channels${params}`, data);
  },

  /**
   * Update a sales channel
   */
  update: async (
    id: string,
    data: UpdateSalesChannelInput,
    companyId?: string
  ): Promise<SalesChannel> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.patch<SalesChannel>(
      `/api/sales-channels/${id}${params}`,
      data
    );
  },

  /**
   * Delete a sales channel (soft delete)
   */
  delete: async (id: string, companyId?: string): Promise<void> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.delete<void>(`/api/sales-channels/${id}${params}`);
  },

  /**
   * Reorder sales channels
   */
  reorder: async (channelIds: string[], companyId?: string): Promise<void> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<void>(`/api/sales-channels/reorder${params}`, {
      channelIds,
    });
  },

  // ═══════════════════════════════════════════════════════════════
  // PRODUCT PUBLISHING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get products in a channel
   */
  getChannelProducts: async (
    channelId: string,
    params: ChannelProductsParams = {},
    companyId?: string
  ): Promise<{ products: ChannelProduct[]; total: number }> => {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    if (params.publishedOnly) query.set('publishedOnly', 'true');
    if (params.search) query.set('search', params.search);
    if (companyId) query.set('companyId', companyId);
    const queryStr = query.toString();
    return apiRequest.get<{ products: ChannelProduct[]; total: number }>(
      `/api/sales-channels/${channelId}/products${queryStr ? `?${queryStr}` : ''}`
    );
  },

  /**
   * Get all channels a product is published to
   */
  getProductChannels: async (
    productId: string,
    companyId?: string
  ): Promise<ProductSalesChannel[]> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<ProductSalesChannel[]>(
      `/api/products/${productId}/channels${params}`
    );
  },

  /**
   * Publish/unpublish a product to a channel
   */
  publishProduct: async (
    productId: string,
    data: PublishToChannelInput,
    companyId?: string
  ): Promise<ProductSalesChannel> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<ProductSalesChannel>(
      `/api/products/${productId}/channels${params}`,
      data
    );
  },

  /**
   * Update a product's channel settings
   */
  updateProductChannel: async (
    productId: string,
    channelId: string,
    data: Partial<PublishToChannelInput>,
    companyId?: string
  ): Promise<ProductSalesChannel> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.patch<ProductSalesChannel>(
      `/api/products/${productId}/channels/${channelId}${params}`,
      data
    );
  },

  /**
   * Remove a product from a channel
   */
  unpublishProduct: async (
    productId: string,
    channelId: string,
    companyId?: string
  ): Promise<void> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.delete<void>(
      `/api/products/${productId}/channels/${channelId}${params}`
    );
  },

  /**
   * Bulk publish products to a channel
   */
  bulkPublish: async (
    data: BulkPublishInput,
    companyId?: string
  ): Promise<BulkPublishResult> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<BulkPublishResult>(
      `/api/sales-channels/${data.channelId}/bulk-publish${params}`,
      { productIds: data.productIds, isPublished: data.isPublished ?? true }
    );
  },

  /**
   * Bulk unpublish products from a channel
   */
  bulkUnpublish: async (
    channelId: string,
    productIds: string[],
    companyId?: string
  ): Promise<BulkPublishResult> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<BulkPublishResult>(
      `/api/sales-channels/${channelId}/bulk-publish${params}`,
      { productIds, isPublished: false }
    );
  },

  /**
   * Set all channels for a product at once
   */
  setProductChannels: async (
    productId: string,
    channelIds: string[],
    companyId?: string
  ): Promise<ProductSalesChannel[]> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.put<ProductSalesChannel[]>(
      `/api/products/${productId}/channels${params}`,
      { channelIds }
    );
  },
};

export default salesChannelsApi;
