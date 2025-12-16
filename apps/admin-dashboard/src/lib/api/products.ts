import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// PRODUCT TYPES
// ═══════════════════════════════════════════════════════════════

// Category info for products (dynamic categories)
export interface ProductCategoryInfo {
  id: string;
  name: string;
  slug: string;
  isPrimary?: boolean;
}

export interface Product {
  id: string;
  companyId: string;
  sku: string;
  slug: string;
  name: string;
  description?: string;
  categories?: ProductCategoryInfo[];
  flavorNotes?: string[];
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
  categoryIds?: string[];
  flavorNotes?: string[];
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
// MEDIA TYPES
// ═══════════════════════════════════════════════════════════════

export type MediaType = 'IMAGE' | 'VIDEO' | 'MODEL_3D' | 'DOCUMENT';

export type MediaProcessAction = 'remove_background' | 'smart_crop' | 'enhance' | 'upscale';

export interface ProductMedia {
  id: string;
  productId: string;
  variantId?: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  altText?: string;
  caption?: string;
  sortOrder: number;
  isPrimary: boolean;
  storageProvider: string;
  storageKey: string;
  cdnUrl?: string;
  generatedBy?: string;
  generationMetadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMediaInput {
  variantId?: string;
  altText?: string;
  caption?: string;
}

export interface UpdateMediaInput {
  variantId?: string;
  altText?: string;
  caption?: string;
}

export interface ProcessMediaOptions {
  width?: number;
  height?: number;
  scale?: number;
  gravity?: string;
}

export interface ProcessMediaInput {
  action: MediaProcessAction;
  options?: ProcessMediaOptions;
}

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
  create: async (data: CreateCategoryInput, companyId?: string): Promise<Category> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<Category>(`/api/products/categories${params}`, data);
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
// MEDIA API
// ═══════════════════════════════════════════════════════════════

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const mediaApi = {
  // List media for a product
  list: async (productId: string, variantId?: string): Promise<ProductMedia[]> => {
    const params = variantId ? `?variantId=${variantId}` : '';
    return apiRequest.get<ProductMedia[]>(`/api/products/${productId}/media${params}`);
  },

  // Upload single file
  upload: async (
    productId: string,
    file: File,
    options?: CreateMediaInput
  ): Promise<ProductMedia> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.variantId) formData.append('variantId', options.variantId);
    if (options?.altText) formData.append('altText', options.altText);
    if (options?.caption) formData.append('caption', options.caption);

    const token = localStorage.getItem('avnz_token');
    const response = await fetch(`${API_URL}/api/products/${productId}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  },

  // Upload multiple files
  uploadMultiple: async (
    productId: string,
    files: File[],
    options?: CreateMediaInput
  ): Promise<ProductMedia[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (options?.variantId) formData.append('variantId', options.variantId);
    if (options?.altText) formData.append('altText', options.altText);
    if (options?.caption) formData.append('caption', options.caption);

    const token = localStorage.getItem('avnz_token');
    const response = await fetch(`${API_URL}/api/products/${productId}/media/bulk`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  },

  // Update media metadata
  update: async (
    productId: string,
    mediaId: string,
    data: UpdateMediaInput
  ): Promise<ProductMedia> => {
    return apiRequest.patch<ProductMedia>(`/api/products/${productId}/media/${mediaId}`, data);
  },

  // Delete media
  delete: async (productId: string, mediaId: string): Promise<void> => {
    return apiRequest.delete(`/api/products/${productId}/media/${mediaId}`);
  },

  // Reorder media
  reorder: async (productId: string, mediaIds: string[]): Promise<ProductMedia[]> => {
    return apiRequest.post<ProductMedia[]>(`/api/products/${productId}/media/reorder`, { mediaIds });
  },

  // Set media as primary
  setAsPrimary: async (productId: string, mediaId: string): Promise<ProductMedia> => {
    return apiRequest.post<ProductMedia>(`/api/products/${productId}/media/${mediaId}/primary`);
  },

  // Process media with AI (background removal, crop, enhance, upscale)
  process: async (
    productId: string,
    mediaId: string,
    data: ProcessMediaInput
  ): Promise<ProductMedia> => {
    return apiRequest.post<ProductMedia>(
      `/api/products/${productId}/media/${mediaId}/process`,
      data
    );
  },
};

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

// Product statuses (static - doesn't change per company)
export const PRODUCT_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
] as const;

// Note: Categories are now fetched dynamically from the API using categoriesApi.list()
// This allows each company to define their own categories

export const COLLECTION_TYPES = [
  { value: 'MANUAL', label: 'Manual Collection' },
  { value: 'AUTOMATIC', label: 'Automatic Collection' },
] as const;

// ═══════════════════════════════════════════════════════════════
// AI GENERATION TYPES
// ═══════════════════════════════════════════════════════════════

export type AITone = 'professional' | 'casual' | 'luxury' | 'technical';
export type AILength = 'short' | 'medium' | 'long';

export interface GenerateDescriptionInput {
  productName: string;
  category?: string;
  attributes?: Record<string, unknown>;
  tone?: AITone;
  length?: AILength;
  targetAudience?: string;
  includeSEO?: boolean;
  companyId?: string;
}

export interface GeneratedDescription {
  description: string;
  metaTitle?: string;
  metaDescription?: string;
  suggestions?: string[];
}

export interface SuggestCategoryInput {
  productName: string;
  description?: string;
  companyId?: string;
}

export interface CategorySuggestion {
  category: string;
  subcategory?: string;
  tags: string[];
  confidence?: number;
}

export interface GenerateAltTextInput {
  productName: string;
  imageDescription?: string;
  companyId?: string;
}

export interface CheckGrammarInput {
  text: string;
  language?: string;
}

export interface GrammarIssue {
  message: string;
  offset: number;
  length: number;
  replacements: string[];
}

export interface GrammarCheckResult {
  original: string;
  corrected: string;
  issues: GrammarIssue[];
  issueCount: number;
}

export interface ImproveDescriptionInput {
  description: string;
  tone?: AITone;
  focusAreas?: string[];
  companyId?: string;
}

export interface ImprovedDescription {
  original: string;
  improved: string;
  changes: string[];
}

export interface ApplyAIContentInput {
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
}

// ═══════════════════════════════════════════════════════════════
// AI API
// ═══════════════════════════════════════════════════════════════

export const aiApi = {
  // Generate a product description using AI
  generateDescription: async (data: GenerateDescriptionInput): Promise<GeneratedDescription> => {
    return apiRequest.post<GeneratedDescription>('/api/products/ai/generate-description', data);
  },

  // Suggest category and tags for a product
  suggestCategory: async (data: SuggestCategoryInput): Promise<CategorySuggestion> => {
    return apiRequest.post<CategorySuggestion>('/api/products/ai/suggest-category', data);
  },

  // Generate alt text for product images
  generateAltText: async (data: GenerateAltTextInput): Promise<{ altText: string }> => {
    return apiRequest.post<{ altText: string }>('/api/products/ai/generate-alt-text', data);
  },

  // Check grammar in text
  checkGrammar: async (data: CheckGrammarInput): Promise<GrammarCheckResult> => {
    return apiRequest.post<GrammarCheckResult>('/api/products/ai/check-grammar', data);
  },

  // Improve an existing product description
  improveDescription: async (data: ImproveDescriptionInput): Promise<ImprovedDescription> => {
    return apiRequest.post<ImprovedDescription>('/api/products/ai/improve-description', data);
  },

  // Apply AI-generated content to a product
  applyAIContent: async (productId: string, data: ApplyAIContentInput): Promise<void> => {
    return apiRequest.post(`/api/products/ai/${productId}/apply`, data);
  },
};

// ═══════════════════════════════════════════════════════════════
// AI CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const AI_TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'technical', label: 'Technical' },
] as const;

export const AI_LENGTHS = [
  { value: 'short', label: 'Short (1-2 sentences)' },
  { value: 'medium', label: 'Medium (3-4 sentences)' },
  { value: 'long', label: 'Long (1-2 paragraphs)' },
] as const;

export const GRAMMAR_LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-AU', label: 'English (Australia)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
] as const;

// ═══════════════════════════════════════════════════════════════
// PRICE RULE TYPES
// ═══════════════════════════════════════════════════════════════

export type PriceRuleType = 'QUANTITY_BREAK' | 'CUSTOMER_GROUP' | 'TIME_BASED' | 'SUBSCRIPTION';
export type AdjustmentType = 'FIXED_AMOUNT' | 'PERCENTAGE' | 'FIXED_PRICE';

export interface ProductPriceRule {
  id: string;
  productId: string;
  name: string;
  type: PriceRuleType;
  adjustmentType: AdjustmentType;
  adjustmentValue: number;
  minQuantity?: number;
  maxQuantity?: number;
  customerGroupId?: string;
  startDate?: string;
  endDate?: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceRuleInput {
  name: string;
  type: PriceRuleType;
  adjustmentType: AdjustmentType;
  adjustmentValue: number;
  minQuantity?: number;
  maxQuantity?: number;
  customerGroupId?: string;
  startDate?: string;
  endDate?: string;
  priority?: number;
  isActive?: boolean;
}

export interface UpdatePriceRuleInput {
  name?: string;
  type?: PriceRuleType;
  adjustmentType?: AdjustmentType;
  adjustmentValue?: number;
  minQuantity?: number;
  maxQuantity?: number;
  customerGroupId?: string;
  startDate?: string;
  endDate?: string;
  priority?: number;
  isActive?: boolean;
}

export interface CalculatePriceInput {
  quantity?: number;
  customerGroupId?: string;
}

export interface CalculatedPrice {
  originalPrice: number;
  finalPrice: number;
  discount: number;
  discountPercent: number;
  appliedRules: Array<{
    id: string;
    name: string;
    type: PriceRuleType;
    adjustment: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// VARIANT OPTION TYPES
// ═══════════════════════════════════════════════════════════════

export interface VariantOptionValue {
  id: string;
  optionId: string;
  value: string;
  displayValue?: string;
  colorCode?: string;
  imageUrl?: string;
  sortOrder: number;
  createdAt: string;
}

export interface VariantOption {
  id: string;
  companyId: string;
  name: string;
  displayName: string;
  sortOrder: number;
  values: VariantOptionValue[];
  createdAt: string;
}

export interface CreateVariantOptionValueInput {
  value: string;
  displayValue?: string;
  colorCode?: string;
  imageUrl?: string;
  sortOrder?: number;
}

export interface UpdateVariantOptionValueInput {
  id?: string;
  value?: string;
  displayValue?: string;
  colorCode?: string;
  imageUrl?: string;
  sortOrder?: number;
}

export interface CreateVariantOptionInput {
  name: string;
  displayName: string;
  sortOrder?: number;
  values: CreateVariantOptionValueInput[];
}

export interface UpdateVariantOptionInput {
  name?: string;
  displayName?: string;
  sortOrder?: number;
  values?: UpdateVariantOptionValueInput[];
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT VARIANT TYPES
// ═══════════════════════════════════════════════════════════════

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcode?: string;
  options: Record<string, string>;
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  weight?: number;
  trackInventory: boolean;
  inventoryQuantity: number;
  lowStockThreshold?: number;
  isActive: boolean;
  sortOrder: number;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  media?: ProductMedia[];
  product?: {
    id: string;
    companyId: string;
    name: string;
  };
}

export interface CreateVariantInput {
  name: string;
  sku: string;
  barcode?: string;
  options: Record<string, string>;
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  weight?: number;
  trackInventory?: boolean;
  inventoryQuantity?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateVariantInput extends Partial<CreateVariantInput> {}

export interface BulkCreateVariantsInput {
  variants: CreateVariantInput[];
}

export interface BulkUpdateVariantInput {
  id: string;
  price?: number;
  compareAtPrice?: number;
  inventoryQuantity?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface BulkUpdateVariantsInput {
  variants: BulkUpdateVariantInput[];
}

export interface GenerateVariantsInput {
  optionIds: string[];
  skuPrefix?: string;
  defaultPrice?: number;
  defaultInventory?: number;
  trackInventory?: boolean;
}

export interface GenerateVariantsResult {
  created: number;
  variants: ProductVariant[];
}

export interface UpdateInventoryInput {
  quantity: number;
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════
// VARIANT OPTIONS API
// ═══════════════════════════════════════════════════════════════

export const variantOptionsApi = {
  // List all variant options for a company
  list: async (companyId?: string): Promise<VariantOption[]> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<VariantOption[]>(`/api/products/variant-options${params}`);
  },

  // Get a single variant option
  get: async (id: string): Promise<VariantOption> => {
    return apiRequest.get<VariantOption>(`/api/products/variant-options/${id}`);
  },

  // Create a new variant option
  create: async (data: CreateVariantOptionInput, companyId?: string): Promise<VariantOption> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<VariantOption>(`/api/products/variant-options${params}`, data);
  },

  // Update a variant option
  update: async (id: string, data: UpdateVariantOptionInput): Promise<VariantOption> => {
    return apiRequest.patch<VariantOption>(`/api/products/variant-options/${id}`, data);
  },

  // Delete a variant option
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/products/variant-options/${id}`);
  },

  // Add a value to an option
  addValue: async (optionId: string, data: CreateVariantOptionValueInput): Promise<VariantOptionValue> => {
    return apiRequest.post<VariantOptionValue>(`/api/products/variant-options/${optionId}/values`, data);
  },

  // Remove a value from an option
  removeValue: async (optionId: string, valueId: string): Promise<void> => {
    return apiRequest.delete(`/api/products/variant-options/${optionId}/values/${valueId}`);
  },

  // Reorder options
  reorderOptions: async (optionIds: string[], companyId?: string): Promise<void> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post(`/api/products/variant-options/reorder${params}`, { optionIds });
  },

  // Reorder values within an option
  reorderValues: async (optionId: string, valueIds: string[]): Promise<void> => {
    return apiRequest.post(`/api/products/variant-options/${optionId}/values/reorder`, { valueIds });
  },
};

// ═══════════════════════════════════════════════════════════════
// PRODUCT VARIANTS API
// ═══════════════════════════════════════════════════════════════

export const variantsApi = {
  // List all variants for a product
  list: async (productId: string, includeDeleted = false): Promise<ProductVariant[]> => {
    const params = includeDeleted ? '?includeDeleted=true' : '';
    return apiRequest.get<ProductVariant[]>(`/api/products/${productId}/variants${params}`);
  },

  // Get available options for a product's company
  getAvailableOptions: async (productId: string): Promise<VariantOption[]> => {
    return apiRequest.get<VariantOption[]>(`/api/products/${productId}/variants/options`);
  },

  // Get a single variant
  get: async (productId: string, variantId: string): Promise<ProductVariant> => {
    return apiRequest.get<ProductVariant>(`/api/products/${productId}/variants/${variantId}`);
  },

  // Create a new variant
  create: async (productId: string, data: CreateVariantInput): Promise<ProductVariant> => {
    return apiRequest.post<ProductVariant>(`/api/products/${productId}/variants`, data);
  },

  // Update a variant
  update: async (productId: string, variantId: string, data: UpdateVariantInput): Promise<ProductVariant> => {
    return apiRequest.patch<ProductVariant>(`/api/products/${productId}/variants/${variantId}`, data);
  },

  // Delete a variant (soft delete)
  delete: async (productId: string, variantId: string): Promise<void> => {
    return apiRequest.delete(`/api/products/${productId}/variants/${variantId}`);
  },

  // Bulk create variants
  bulkCreate: async (productId: string, data: BulkCreateVariantsInput): Promise<ProductVariant[]> => {
    return apiRequest.post<ProductVariant[]>(`/api/products/${productId}/variants/bulk`, data);
  },

  // Bulk update variants
  bulkUpdate: async (productId: string, data: BulkUpdateVariantsInput): Promise<ProductVariant[]> => {
    return apiRequest.patch<ProductVariant[]>(`/api/products/${productId}/variants/bulk`, data);
  },

  // Generate variants from option combinations
  generate: async (productId: string, data: GenerateVariantsInput): Promise<GenerateVariantsResult> => {
    return apiRequest.post<GenerateVariantsResult>(`/api/products/${productId}/variants/generate`, data);
  },

  // Update variant inventory
  updateInventory: async (productId: string, variantId: string, data: UpdateInventoryInput): Promise<ProductVariant> => {
    return apiRequest.post<ProductVariant>(`/api/products/${productId}/variants/${variantId}/inventory`, data);
  },

  // Reorder variants
  reorder: async (productId: string, variantIds: string[]): Promise<void> => {
    return apiRequest.post(`/api/products/${productId}/variants/reorder`, { variantIds });
  },
};

// ═══════════════════════════════════════════════════════════════
// PRICE RULES API
// ═══════════════════════════════════════════════════════════════

export const priceRulesApi = {
  // List all price rules for a product
  list: async (productId: string, activeOnly = false): Promise<ProductPriceRule[]> => {
    const params = activeOnly ? '?activeOnly=true' : '';
    return apiRequest.get<ProductPriceRule[]>(`/api/products/${productId}/price-rules${params}`);
  },

  // Create a new price rule
  create: async (productId: string, data: CreatePriceRuleInput): Promise<ProductPriceRule> => {
    return apiRequest.post<ProductPriceRule>(`/api/products/${productId}/price-rules`, data);
  },

  // Update a price rule
  update: async (productId: string, ruleId: string, data: UpdatePriceRuleInput): Promise<ProductPriceRule> => {
    return apiRequest.patch<ProductPriceRule>(`/api/products/${productId}/price-rules/${ruleId}`, data);
  },

  // Delete a price rule
  delete: async (productId: string, ruleId: string): Promise<void> => {
    return apiRequest.delete(`/api/products/${productId}/price-rules/${ruleId}`);
  },

  // Calculate price with all applicable rules
  calculate: async (productId: string, data: CalculatePriceInput = {}): Promise<CalculatedPrice> => {
    return apiRequest.post<CalculatedPrice>(`/api/products/${productId}/price-rules/calculate`, data);
  },
};

// ═══════════════════════════════════════════════════════════════
// PRICE RULE CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const PRICE_RULE_TYPES = [
  { value: 'QUANTITY_BREAK', label: 'Quantity Break', description: 'Discount based on order quantity' },
  { value: 'CUSTOMER_GROUP', label: 'Customer Group', description: 'Special pricing for customer segments' },
  { value: 'TIME_BASED', label: 'Time-Based', description: 'Limited-time promotional pricing' },
  { value: 'SUBSCRIPTION', label: 'Subscription', description: 'Recurring subscription discount' },
] as const;

export const ADJUSTMENT_TYPES = [
  { value: 'FIXED_AMOUNT', label: 'Fixed Amount', description: 'Subtract a fixed dollar amount' },
  { value: 'PERCENTAGE', label: 'Percentage', description: 'Discount by percentage' },
  { value: 'FIXED_PRICE', label: 'Fixed Price', description: 'Set a specific sale price' },
] as const;
