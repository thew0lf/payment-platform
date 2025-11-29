import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// PRODUCT TYPES
// ═══════════════════════════════════════════════════════════════

export interface Product {
  id: string;
  companyId: string;
  sku: string;
  slug: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  roastLevel?: string;
  origin?: string;
  flavorNotes: string[];
  process?: string;
  altitude?: string;
  varietal?: string;
  weight?: number;
  weightUnit: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  currency: string;
  trackInventory: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  status: string;
  isVisible: boolean;
  images: string[];
  metaTitle?: string;
  metaDescription?: string;
  aiGeneratedDescription?: string;
  aiGeneratedAt?: string;
  attributes?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  sku: string;
  slug?: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  roastLevel?: string;
  origin?: string;
  flavorNotes?: string[];
  process?: string;
  altitude?: string;
  varietal?: string;
  weight?: number;
  weightUnit?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  currency?: string;
  trackInventory?: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  status?: string;
  isVisible?: boolean;
  images?: string[];
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {}

export interface ProductQueryParams {
  category?: string;
  status?: string;
  search?: string;
  inStock?: boolean;
  limit?: number;
  offset?: number;
  companyId?: string;
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY TYPES
// ═══════════════════════════════════════════════════════════════

export interface Category {
  id: string;
  companyId: string;
  parentId?: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  level: number;
  path: string;
  sortOrder: number;
  isActive: boolean;
  metaTitle?: string;
  metaDescription?: string;
  productCount: number;
  parent?: Category;
  children?: Category[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  level: number;
  path: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  children: CategoryTreeNode[];
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  parentId?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {}

// ═══════════════════════════════════════════════════════════════
// TAG TYPES
// ═══════════════════════════════════════════════════════════════

export interface Tag {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  color?: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
  slug?: string;
  color?: string;
}

export interface UpdateTagInput extends Partial<CreateTagInput> {}

// ═══════════════════════════════════════════════════════════════
// COLLECTION TYPES
// ═══════════════════════════════════════════════════════════════

export type CollectionType = 'MANUAL' | 'AUTOMATIC';

export interface CollectionCondition {
  field: 'category' | 'tag' | 'price' | 'vendor' | 'title' | 'sku';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with';
  value: string | number;
}

export interface CollectionRules {
  conditions: CollectionCondition[];
  matchType: 'ALL' | 'ANY';
}

export interface Collection {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description?: string;
  type: CollectionType;
  rules?: CollectionRules;
  imageUrl?: string;
  bannerUrl?: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  metaTitle?: string;
  metaDescription?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionInput {
  name: string;
  slug?: string;
  description?: string;
  type?: CollectionType;
  rules?: CollectionRules;
  imageUrl?: string;
  bannerUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateCollectionInput extends Partial<CreateCollectionInput> {}

// ═══════════════════════════════════════════════════════════════
// PRODUCTS API
// ═══════════════════════════════════════════════════════════════

export const productsApi = {
  // List products
  list: async (params: ProductQueryParams = {}): Promise<{ products: Product[]; total: number }> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
    return apiRequest.get<{ products: Product[]; total: number }>(`/api/products?${query}`);
  },

  // Get product by ID
  get: async (id: string, companyId?: string): Promise<Product> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<Product>(`/api/products/${id}${params}`);
  },

  // Get product by SKU
  getBySku: async (sku: string, companyId?: string): Promise<Product> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<Product>(`/api/products/sku/${sku}${params}`);
  },

  // Create product
  create: async (data: CreateProductInput): Promise<Product> => {
    return apiRequest.post<Product>('/api/products', data);
  },

  // Update product
  update: async (id: string, data: UpdateProductInput, companyId?: string): Promise<Product> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.patch<Product>(`/api/products/${id}${params}`, data);
  },

  // Update stock
  updateStock: async (id: string, quantity: number, companyId?: string): Promise<Product> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.patch<Product>(`/api/products/${id}/stock${params}`, { quantity });
  },

  // Adjust stock
  adjustStock: async (id: string, adjustment: number, reason?: string, companyId?: string): Promise<Product> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<Product>(`/api/products/${id}/stock/adjust${params}`, { adjustment, reason });
  },

  // Delete (archive) product
  delete: async (id: string, companyId?: string): Promise<void> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.delete(`/api/products/${id}${params}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// CATEGORIES API
// ═══════════════════════════════════════════════════════════════

export const categoriesApi = {
  // List all categories
  list: async (includeInactive = false, companyId?: string): Promise<Category[]> => {
    const params = new URLSearchParams();
    params.set('includeInactive', String(includeInactive));
    if (companyId) params.set('companyId', companyId);
    return apiRequest.get<Category[]>(`/api/products/categories?${params}`);
  },

  // Get category tree
  getTree: async (companyId?: string): Promise<CategoryTreeNode[]> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<CategoryTreeNode[]>(`/api/products/categories/tree${params}`);
  },

  // Get category by ID
  get: async (id: string): Promise<Category> => {
    return apiRequest.get<Category>(`/api/products/categories/${id}`);
  },

  // Create category
  create: async (data: CreateCategoryInput): Promise<Category> => {
    return apiRequest.post<Category>('/api/products/categories', data);
  },

  // Update category
  update: async (id: string, data: UpdateCategoryInput): Promise<Category> => {
    return apiRequest.patch<Category>(`/api/products/categories/${id}`, data);
  },

  // Delete category
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/products/categories/${id}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// TAGS API
// ═══════════════════════════════════════════════════════════════

export const tagsApi = {
  // List all tags
  list: async (companyId?: string): Promise<Tag[]> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<Tag[]>(`/api/products/tags${params}`);
  },

  // Get tag by ID
  get: async (id: string): Promise<Tag> => {
    return apiRequest.get<Tag>(`/api/products/tags/${id}`);
  },

  // Create tag
  create: async (data: CreateTagInput): Promise<Tag> => {
    return apiRequest.post<Tag>('/api/products/tags', data);
  },

  // Update tag
  update: async (id: string, data: UpdateTagInput): Promise<Tag> => {
    return apiRequest.patch<Tag>(`/api/products/tags/${id}`, data);
  },

  // Delete tag
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/products/tags/${id}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// COLLECTIONS API
// ═══════════════════════════════════════════════════════════════

export const collectionsApi = {
  // List all collections
  list: async (includeInactive = false, companyId?: string): Promise<Collection[]> => {
    const params = new URLSearchParams();
    params.set('includeInactive', String(includeInactive));
    if (companyId) params.set('companyId', companyId);
    return apiRequest.get<Collection[]>(`/api/products/collections?${params}`);
  },

  // Get featured collections
  getFeatured: async (): Promise<Collection[]> => {
    return apiRequest.get<Collection[]>('/api/products/collections/featured');
  },

  // Get collection by ID
  get: async (id: string): Promise<Collection> => {
    return apiRequest.get<Collection>(`/api/products/collections/${id}`);
  },

  // Create collection
  create: async (data: CreateCollectionInput): Promise<Collection> => {
    return apiRequest.post<Collection>('/api/products/collections', data);
  },

  // Update collection
  update: async (id: string, data: UpdateCollectionInput): Promise<Collection> => {
    return apiRequest.patch<Collection>(`/api/products/collections/${id}`, data);
  },

  // Delete collection
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/products/collections/${id}`);
  },

  // Get products in collection
  getProducts: async (id: string, limit = 50, offset = 0): Promise<{ products: Product[]; total: number }> => {
    return apiRequest.get<{ products: Product[]; total: number }>(
      `/api/products/collections/${id}/products?limit=${limit}&offset=${offset}`
    );
  },

  // Add products to collection
  addProducts: async (id: string, productIds: string[]): Promise<void> => {
    return apiRequest.post(`/api/products/collections/${id}/products`, { productIds });
  },

  // Remove products from collection
  removeProducts: async (id: string, productIds: string[]): Promise<void> => {
    return apiRequest.delete(`/api/products/collections/${id}/products`);
  },

  // Reorder products in collection
  reorderProducts: async (id: string, productIds: string[]): Promise<void> => {
    return apiRequest.post(`/api/products/collections/${id}/products/reorder`, { productIds });
  },

  // Refresh automatic collection
  refresh: async (id: string): Promise<void> => {
    return apiRequest.post(`/api/products/collections/${id}/refresh`);
  },
};

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const PRODUCT_CATEGORIES = [
  { value: 'COFFEE', label: 'Coffee' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'ACCESSORIES', label: 'Accessories' },
  { value: 'MERCHANDISE', label: 'Merchandise' },
  { value: 'SUBSCRIPTION_BOX', label: 'Subscription Box' },
  { value: 'GIFT_CARD', label: 'Gift Card' },
] as const;

export const PRODUCT_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
] as const;

export const ROAST_LEVELS = [
  { value: 'LIGHT', label: 'Light Roast' },
  { value: 'MEDIUM_LIGHT', label: 'Medium-Light' },
  { value: 'MEDIUM', label: 'Medium Roast' },
  { value: 'MEDIUM_DARK', label: 'Medium-Dark' },
  { value: 'DARK', label: 'Dark Roast' },
] as const;

export const COLLECTION_TYPES = [
  { value: 'MANUAL', label: 'Manual Collection' },
  { value: 'AUTOMATIC', label: 'Automatic Collection' },
] as const;
