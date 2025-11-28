import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
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
  taxable: boolean;
  taxRate: number;
  taxCode?: string;
  trackInventory: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
  status: string;
  isVisible: boolean;
  images: string[];
  metaTitle?: string;
  metaDescription?: string;
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
  taxable?: boolean;
  taxRate?: number;
  taxCode?: string;
  trackInventory?: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  allowBackorder?: boolean;
  status?: string;
  isVisible?: boolean;
  images?: string[];
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateProductInput {
  sku?: string;
  slug?: string;
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  roastLevel?: string;
  origin?: string;
  flavorNotes?: string[];
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  trackInventory?: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  allowBackorder?: boolean;
  status?: string;
  isVisible?: boolean;
  images?: string[];
  metaTitle?: string;
  metaDescription?: string;
}

export interface ProductQueryParams {
  category?: string;
  status?: string;
  search?: string;
  inStock?: boolean;
  limit?: number;
  offset?: number;
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
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
  get: async (id: string): Promise<Product> => {
    return apiRequest.get<Product>(`/api/products/${id}`);
  },

  // Get product by SKU
  getBySku: async (sku: string): Promise<Product> => {
    return apiRequest.get<Product>(`/api/products/sku/${sku}`);
  },

  // Create product
  create: async (data: CreateProductInput): Promise<Product> => {
    return apiRequest.post<Product>('/api/products', data);
  },

  // Update product
  update: async (id: string, data: UpdateProductInput): Promise<Product> => {
    return apiRequest.patch<Product>(`/api/products/${id}`, data);
  },

  // Update stock
  updateStock: async (id: string, quantity: number): Promise<Product> => {
    return apiRequest.patch<Product>(`/api/products/${id}/stock`, { quantity });
  },

  // Adjust stock
  adjustStock: async (id: string, adjustment: number, reason?: string): Promise<Product> => {
    return apiRequest.post<Product>(`/api/products/${id}/stock/adjust`, { adjustment, reason });
  },

  // Delete (archive) product
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/products/${id}`);
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
