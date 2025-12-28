import { ImportJobStatus, ImportJobPhase } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// CONFLICT RESOLUTION (Phase 5)
// ═══════════════════════════════════════════════════════════════

/**
 * Conflict resolution strategies for duplicate products
 * - SKIP: Skip importing if product already exists (default)
 * - UPDATE: Replace all fields with imported values
 * - MERGE: Keep existing non-empty fields, update empty ones
 * - FORCE_CREATE: Create with modified SKU (adds suffix)
 */
export type ConflictStrategy = 'SKIP' | 'UPDATE' | 'MERGE' | 'FORCE_CREATE';

export interface ConflictInfo {
  externalId: string;
  sku: string;
  existingProductId?: string;
  conflictType: 'EXTERNAL_ID' | 'SKU' | 'BOTH';
  resolution: ConflictStrategy;
  skipped: boolean;
  modified?: boolean;
  modifiedSku?: string;
}

// ═══════════════════════════════════════════════════════════════
// IMPORT JOB CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export interface ImportJobConfig {
  provider: string;
  integrationId: string;
  selectedProductIds?: string[];
  importImages: boolean;
  generateThumbnails: boolean;
  /** @deprecated Use conflictStrategy instead */
  skipDuplicates?: boolean;
  /** @deprecated Use conflictStrategy instead */
  updateExisting?: boolean;
  /** Conflict resolution strategy for duplicate products */
  conflictStrategy?: ConflictStrategy;
  fieldMappingProfileId?: string;
  customMappings?: FieldMapping[];
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: FieldTransform | FieldTransformConfig | FieldTransformConfig[];
  condition?: FieldMappingCondition;
  validation?: FieldValidationRule[];
  defaultValue?: unknown;
}

// ═══════════════════════════════════════════════════════════════
// FIELD TRANSFORMS (Phase 2 Enhancement)
// ═══════════════════════════════════════════════════════════════

export type FieldTransform =
  // String transforms
  | 'uppercase'
  | 'lowercase'
  | 'capitalize'
  | 'capitalizeWords'
  | 'trim'
  | 'trimStart'
  | 'trimEnd'
  | 'slug'
  | 'stripHtml'
  // Number transforms
  | 'centsToDecimal'
  | 'decimalToCents'
  | 'round'
  | 'floor'
  | 'ceil'
  | 'abs'
  // Type transforms
  | 'boolean'
  | 'number'
  | 'string'
  | 'array'
  | 'json'
  // Date transforms
  | 'isoDate'
  | 'timestamp';

export interface FieldTransformConfig {
  type: FieldTransform | 'dateFormat' | 'numberFormat' | 'replace' | 'split' | 'join' | 'substring' | 'pad' | 'template' | 'lookup' | 'math';
  options?: TransformOptions;
}

export type TransformOptions =
  | DateFormatOptions
  | NumberFormatOptions
  | ReplaceOptions
  | SplitOptions
  | JoinOptions
  | SubstringOptions
  | PadOptions
  | TemplateOptions
  | LookupOptions
  | MathOptions;

export interface DateFormatOptions {
  inputFormat?: string;
  outputFormat: string; // 'YYYY-MM-DD', 'MM/DD/YYYY', 'ISO', etc.
  timezone?: string;
}

export interface NumberFormatOptions {
  decimals?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
  prefix?: string; // e.g., '$'
  suffix?: string; // e.g., '%'
}

export interface ReplaceOptions {
  search: string;
  replace: string;
  regex?: boolean;
  global?: boolean;
  caseInsensitive?: boolean;
}

export interface SplitOptions {
  delimiter: string;
  index?: number; // Return specific index, or all if undefined
  limit?: number;
}

export interface JoinOptions {
  delimiter: string;
}

export interface SubstringOptions {
  start: number;
  end?: number;
}

export interface PadOptions {
  length: number;
  char?: string;
  position?: 'start' | 'end';
}

export interface TemplateOptions {
  template: string; // e.g., '{{name}} - {{sku}}'
  fields?: Record<string, string>; // Additional field mappings
}

export interface LookupOptions {
  map: Record<string, unknown>;
  default?: unknown;
}

export interface MathOptions {
  operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'modulo';
  operand: number;
}

// ═══════════════════════════════════════════════════════════════
// CONDITIONAL MAPPINGS (Phase 2 Enhancement)
// ═══════════════════════════════════════════════════════════════

export interface FieldMappingCondition {
  type: 'simple' | 'compound';
  rule?: SimpleCondition;
  rules?: CompoundCondition;
}

export interface SimpleCondition {
  field: string;
  operator: ConditionOperator;
  value?: unknown;
}

export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'matches' // regex
  | 'isEmpty'
  | 'isNotEmpty'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'in'
  | 'notIn';

export interface CompoundCondition {
  operator: 'and' | 'or';
  conditions: (SimpleCondition | CompoundCondition)[];
}

// ═══════════════════════════════════════════════════════════════
// FIELD VALIDATION (Phase 2 Enhancement)
// ═══════════════════════════════════════════════════════════════

export interface FieldValidationRule {
  type: ValidationType;
  value?: unknown;
  message?: string; // Custom error message
}

export type ValidationType =
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'min'
  | 'max'
  | 'pattern'
  | 'email'
  | 'url'
  | 'enum'
  | 'unique'
  | 'custom';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  rule: ValidationType;
  message: string;
  value?: unknown;
}

// ═══════════════════════════════════════════════════════════════
// IMPORT JOB TRACKING
// ═══════════════════════════════════════════════════════════════

export interface ImportJobProgress {
  id: string;
  status: ImportJobStatus;
  phase: ImportJobPhase;
  progress: number;
  totalProducts: number;
  processedProducts: number;
  totalImages: number;
  processedImages: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  currentItem?: string;
  estimatedSecondsRemaining?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ImportJobError {
  productId?: string;
  sku?: string;
  message: string;
  code: ImportErrorCode;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export type ImportErrorCode =
  | 'FETCH_FAILED'
  | 'MAPPING_FAILED'
  | 'VALIDATION_FAILED'
  | 'DUPLICATE_SKU'
  | 'IMAGE_DOWNLOAD_FAILED'
  | 'IMAGE_UPLOAD_FAILED'
  | 'THUMBNAIL_GENERATION_FAILED'
  | 'IMAGE_IMPORT_ERROR'
  | 'NO_S3_CREDENTIALS'
  | 'DATABASE_ERROR'
  | 'UNKNOWN_ERROR';

// ═══════════════════════════════════════════════════════════════
// IMAGE IMPORT TYPES (Phase 3)
// ═══════════════════════════════════════════════════════════════

export interface ImportImageResult {
  success: boolean;
  originalUrl: string;
  cdnUrl?: string;
  s3Key?: string;
  filename?: string;
  contentType?: string;
  size?: number;
  thumbnails?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// EXTERNAL PRODUCT DATA
// ═══════════════════════════════════════════════════════════════

export interface ExternalProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  images?: ExternalProductImage[];
  variants?: ExternalProductVariant[];
  categories?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown; // Index signature for Record<string, unknown> compatibility
}

export interface ExternalProductImage {
  id: string;
  url: string;
  altText?: string;
  position: number;
}

export interface ExternalProductVariant {
  id: string;
  sku: string;
  name: string;
  price: number;
  inventory?: number;
  options?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════
// IMPORT RESULT
// ═══════════════════════════════════════════════════════════════

export interface ImportResult {
  jobId: string;
  status: ImportJobStatus;
  totalProducts: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  importedIds: string[];
  errors: ImportJobError[];
  duration: number;
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface ProductImportProvider {
  fetchProducts(credentials: Record<string, string>): Promise<ExternalProduct[]>;
  fetchProduct(credentials: Record<string, string>, productId: string): Promise<ExternalProduct>;
  getDefaultFieldMappings(): FieldMapping[];
}

// ═══════════════════════════════════════════════════════════════
// QUEUE TYPES
// ═══════════════════════════════════════════════════════════════

export interface ImportJobData {
  jobId: string;
  companyId: string;
  clientId: string;
  integrationId: string;
  provider: string;
  config: ImportJobConfig;
  createdBy: string;
}

export const PRODUCT_IMPORT_QUEUE = 'product-import';

// ═══════════════════════════════════════════════════════════════
// SSE EVENT TYPES (for Phase 4)
// ═══════════════════════════════════════════════════════════════

export type ImportEventType =
  | 'job:started'
  | 'job:progress'
  | 'job:phase-changed'
  | 'job:product-imported'
  | 'job:product-skipped'
  | 'job:product-error'
  | 'job:conflict-detected'
  | 'job:completed'
  | 'job:failed'
  | 'job:cancelled';

export interface ImportEvent {
  type: ImportEventType;
  jobId: string;
  timestamp: Date;
  data: ImportJobProgress | ImportJobError | ConflictInfo | { productId: string; sku: string };
}

// ═══════════════════════════════════════════════════════════════
// STORAGE & BILLING TYPES (Phase 6)
// ═══════════════════════════════════════════════════════════════

/**
 * Storage usage statistics for a company
 */
export interface StorageUsageStats {
  companyId: string;
  /** Total storage used in bytes */
  totalStorageBytes: number;
  /** Storage used formatted (e.g., "2.5 GB") */
  totalStorageFormatted: string;
  /** Number of images stored */
  totalImages: number;
  /** Number of thumbnails generated */
  totalThumbnails: number;
  /** Breakdown by image type */
  breakdown: StorageBreakdown;
  /** Storage limit in bytes (if applicable) */
  storageLimit?: number;
  /** Usage percentage (0-100) */
  usagePercentage?: number;
  /** Last updated timestamp */
  lastUpdated: Date;
}

export interface StorageBreakdown {
  /** Original images storage */
  originals: StorageCategory;
  /** Small thumbnails (150x150) */
  thumbnailsSmall: StorageCategory;
  /** Medium thumbnails (400x400) */
  thumbnailsMedium: StorageCategory;
  /** Large thumbnails (800x800) */
  thumbnailsLarge: StorageCategory;
}

export interface StorageCategory {
  /** Number of files */
  count: number;
  /** Total bytes */
  bytes: number;
  /** Formatted size */
  formatted: string;
}

/**
 * Import job billing/cost estimation
 */
export interface ImportCostEstimate {
  /** Number of products in job */
  productCount: number;
  /** Number of images to process */
  imageCount: number;
  /** Estimated storage bytes */
  estimatedStorageBytes: number;
  /** Estimated storage formatted */
  estimatedStorageFormatted: string;
  /** Estimated thumbnail generation count */
  estimatedThumbnails: number;
  /** Cost breakdown */
  costs: CostBreakdown;
  /** Total estimated cost in cents */
  totalCostCents: number;
  /** Currency code */
  currency: string;
}

export interface CostBreakdown {
  /** Storage cost per GB/month in cents */
  storagePerGbCents: number;
  /** Image processing cost per image in cents */
  imageProcessingCents: number;
  /** Thumbnail generation cost per thumbnail in cents */
  thumbnailGenerationCents: number;
  /** Monthly storage estimate in cents */
  monthlyStorageCents: number;
  /** One-time processing cost in cents */
  processingCostCents: number;
}

/**
 * Import history statistics
 */
export interface ImportHistoryStats {
  companyId: string;
  /** Total import jobs run */
  totalJobs: number;
  /** Successful jobs */
  successfulJobs: number;
  /** Failed jobs */
  failedJobs: number;
  /** Cancelled jobs */
  cancelledJobs: number;
  /** Total products imported */
  totalProductsImported: number;
  /** Total images imported */
  totalImagesImported: number;
  /** Average job duration in seconds */
  avgJobDurationSeconds: number;
  /** Jobs by provider */
  jobsByProvider: Record<string, number>;
  /** Jobs over time (last 30 days) */
  jobsOverTime: { date: string; count: number }[];
}

/**
 * Storage quota configuration
 */
export interface StorageQuota {
  /** Maximum storage in bytes */
  maxStorageBytes: number;
  /** Maximum images */
  maxImages?: number;
  /** Whether thumbnail generation is enabled */
  thumbnailsEnabled: boolean;
  /** Thumbnail sizes to generate */
  thumbnailSizes: ('small' | 'medium' | 'large')[];
  /** Warning threshold percentage (0-100) */
  warningThreshold: number;
}
