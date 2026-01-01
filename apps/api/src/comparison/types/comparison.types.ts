/**
 * Product Comparison System Types
 *
 * Allows customers to compare up to 4 products side-by-side.
 * Supports both anonymous (session-based) and authenticated users.
 */

/**
 * Snapshot of product data at the time it was added to comparison.
 * Used for display even if product is updated/deleted later.
 */
export interface ProductComparisonSnapshot {
  name: string;
  sku: string;
  image?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  description?: string;
  attributes?: Record<string, string | number | boolean>;
  [key: string]: string | number | boolean | Record<string, string | number | boolean> | undefined;
}

/**
 * Individual item in a product comparison
 */
export interface ComparisonItemData {
  id: string;
  comparisonId: string;
  productId: string;
  variantId?: string;
  productSnapshot: ProductComparisonSnapshot;
  position: number;
  addedAt: Date;
}

/**
 * Product comparison data structure
 */
export interface ComparisonData {
  id: string;
  companyId: string;
  siteId?: string;
  customerId?: string;
  sessionToken?: string;
  visitorId?: string;
  name?: string;
  shareToken?: string;
  isShared: boolean;
  items: ComparisonItemData[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

/**
 * Input for creating a new comparison
 */
export interface CreateComparisonInput {
  siteId?: string;
  visitorId?: string;
  name?: string;
}

/**
 * Input for adding a product to comparison
 */
export interface AddToComparisonInput {
  productId: string;
  variantId?: string;
  position?: number;
}

/**
 * Input for updating item position in comparison
 */
export interface UpdatePositionInput {
  itemId: string;
  newPosition: number;
}

/**
 * Input for sharing a comparison
 */
export interface ShareComparisonInput {
  name?: string;
  expiresInDays?: number;
}

/**
 * Query parameters for comparison operations
 */
export interface ComparisonQueryParams {
  sessionToken?: string;
  customerId?: string;
  visitorId?: string;
  siteId?: string;
  shareToken?: string;
  includeItems?: boolean;
}

/**
 * Response for share operation
 */
export interface ShareComparisonResult {
  comparisonId: string;
  shareToken: string;
  shareUrl: string;
  expiresAt?: Date;
}

/**
 * Comparison statistics
 */
export interface ComparisonStats {
  totalComparisons: number;
  activeComparisons: number;
  sharedComparisons: number;
  averageItemsPerComparison: number;
  mostComparedProducts: Array<{
    productId: string;
    productName: string;
    comparisonCount: number;
  }>;
}

/**
 * Maximum number of items allowed in a comparison
 */
export const MAX_COMPARISON_ITEMS = 4;

/**
 * Default expiration time for comparisons (in days)
 */
export const DEFAULT_COMPARISON_EXPIRY_DAYS = 30;

/**
 * Default expiration time for shared comparisons (in days)
 */
export const DEFAULT_SHARED_COMPARISON_EXPIRY_DAYS = 7;
