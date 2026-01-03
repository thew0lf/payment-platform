import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// CATEGORY METAFIELD TYPES
// ═══════════════════════════════════════════════════════════════

export type MetafieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'BOOLEAN'
  | 'DATE'
  | 'COLOR'
  | 'URL';

export interface MetafieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  required?: boolean;
}

export interface CategoryMetafieldDefinition {
  id: string;
  categoryId: string;
  key: string;
  name: string;
  type: MetafieldType;
  required: boolean;
  options?: string[]; // For SELECT and MULTI_SELECT
  validation?: MetafieldValidation;
  helpText?: string;
  placeholder?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMetafieldDefinitionInput {
  key: string;
  name: string;
  type: MetafieldType;
  required?: boolean;
  options?: string[];
  validation?: MetafieldValidation;
  helpText?: string;
  placeholder?: string;
  sortOrder?: number;
}

export interface UpdateMetafieldDefinitionInput
  extends Partial<CreateMetafieldDefinitionInput> {}

// Product metafield value types
export interface ProductMetafieldValue {
  id: string;
  productId: string;
  definitionId: string;
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  dateValue?: string;
  jsonValue?: string[] | Record<string, unknown>;
  definition: CategoryMetafieldDefinition;
  createdAt: string;
  updatedAt: string;
}

export interface SetProductMetafieldInput {
  definitionId: string;
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  dateValue?: string;
  jsonValue?: string[] | Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY METAFIELDS API
// ═══════════════════════════════════════════════════════════════

export const categoryMetafieldsApi = {
  // ═══════════════════════════════════════════════════════════════
  // METAFIELD DEFINITIONS (Category-level)
  // ═══════════════════════════════════════════════════════════════

  /**
   * List all metafield definitions for a category
   */
  listDefinitions: async (
    categoryId: string,
    companyId?: string
  ): Promise<CategoryMetafieldDefinition[]> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<CategoryMetafieldDefinition[]>(
      `/api/products/categories/${categoryId}/metafields${params}`
    );
  },

  /**
   * Get a single metafield definition by ID
   */
  getDefinition: async (
    categoryId: string,
    definitionId: string,
    companyId?: string
  ): Promise<CategoryMetafieldDefinition> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<CategoryMetafieldDefinition>(
      `/api/products/categories/${categoryId}/metafields/${definitionId}${params}`
    );
  },

  /**
   * Create a new metafield definition for a category
   */
  createDefinition: async (
    categoryId: string,
    data: CreateMetafieldDefinitionInput,
    companyId?: string
  ): Promise<CategoryMetafieldDefinition> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<CategoryMetafieldDefinition>(
      `/api/products/categories/${categoryId}/metafields${params}`,
      data
    );
  },

  /**
   * Update a metafield definition
   */
  updateDefinition: async (
    categoryId: string,
    definitionId: string,
    data: UpdateMetafieldDefinitionInput,
    companyId?: string
  ): Promise<CategoryMetafieldDefinition> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.patch<CategoryMetafieldDefinition>(
      `/api/products/categories/${categoryId}/metafields/${definitionId}${params}`,
      data
    );
  },

  /**
   * Delete a metafield definition (soft delete)
   */
  deleteDefinition: async (
    categoryId: string,
    definitionId: string,
    companyId?: string
  ): Promise<void> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.delete<void>(
      `/api/products/categories/${categoryId}/metafields/${definitionId}${params}`
    );
  },

  /**
   * Reorder metafield definitions
   */
  reorderDefinitions: async (
    categoryId: string,
    definitionIds: string[],
    companyId?: string
  ): Promise<void> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<void>(
      `/api/products/categories/${categoryId}/metafields/reorder${params}`,
      { definitionIds }
    );
  },

  // ═══════════════════════════════════════════════════════════════
  // PRODUCT METAFIELD VALUES (Product-level)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all metafield values for a product
   */
  getProductMetafields: async (
    productId: string,
    companyId?: string
  ): Promise<ProductMetafieldValue[]> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<ProductMetafieldValue[]>(
      `/api/products/${productId}/metafields${params}`
    );
  },

  /**
   * Set metafield values for a product (upsert)
   */
  setProductMetafields: async (
    productId: string,
    values: SetProductMetafieldInput[],
    companyId?: string
  ): Promise<ProductMetafieldValue[]> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.put<ProductMetafieldValue[]>(
      `/api/products/${productId}/metafields${params}`,
      { values }
    );
  },

  /**
   * Clear all metafield values for a product
   */
  clearProductMetafields: async (
    productId: string,
    companyId?: string
  ): Promise<void> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.delete<void>(
      `/api/products/${productId}/metafields${params}`
    );
  },
};

export default categoryMetafieldsApi;
