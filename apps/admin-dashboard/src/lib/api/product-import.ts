import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// ENUMS (matching Prisma/backend)
// ═══════════════════════════════════════════════════════════════

export type ImportJobStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

// Phase names must match Prisma schema exactly
export type ImportJobPhase =
  | 'QUEUED'
  | 'FETCHING'
  | 'MAPPING'
  | 'CREATING'
  | 'DOWNLOADING_IMAGES'
  | 'UPLOADING_IMAGES'
  | 'GENERATING_THUMBNAILS'
  | 'FINALIZING'
  | 'DONE';

/**
 * Conflict resolution strategies for duplicate products:
 * - SKIP: Skip importing if product already exists (default)
 * - UPDATE: Replace all fields with imported values
 * - MERGE: Keep existing non-empty fields, update empty ones
 * - FORCE_CREATE: Create with modified SKU (adds suffix like "-imported-1")
 */
export type ConflictStrategy = 'SKIP' | 'UPDATE' | 'MERGE' | 'FORCE_CREATE';

export type FieldTransform =
  | 'uppercase'
  | 'lowercase'
  | 'capitalize'
  | 'capitalizeWords'
  | 'trim'
  | 'trimStart'
  | 'trimEnd'
  | 'slug'
  | 'stripHtml'
  | 'centsToDecimal'
  | 'decimalToCents'
  | 'round'
  | 'floor'
  | 'ceil'
  | 'abs'
  | 'boolean'
  | 'number'
  | 'string'
  | 'array'
  | 'json'
  | 'isoDate'
  | 'timestamp';

// ═══════════════════════════════════════════════════════════════
// FIELD MAPPING TYPES
// ═══════════════════════════════════════════════════════════════

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: FieldTransform;
}

export interface FieldMappingProfile {
  id: string;
  companyId: string;
  provider: string;
  name: string;
  mappings: FieldMapping[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFieldMappingProfileInput {
  provider: string;
  name: string;
  mappings: FieldMapping[];
  isDefault?: boolean;
}

export interface UpdateFieldMappingProfileInput {
  name?: string;
  mappings?: FieldMapping[];
  isDefault?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// IMPORT JOB TYPES
// ═══════════════════════════════════════════════════════════════

export interface ImportJob {
  id: string;
  companyId: string;
  provider: string;
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
  errors?: ImportJobError[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ImportJobError {
  productId?: string;
  sku?: string;
  message: string;
  code: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface CreateImportJobInput {
  integrationId: string;
  selectedProductIds?: string[];
  importImages?: boolean;
  generateThumbnails?: boolean;
  skipDuplicates?: boolean;
  updateExisting?: boolean;
  conflictStrategy?: ConflictStrategy;
  fieldMappingProfileId?: string;
  customMappings?: FieldMapping[];
}

export interface ImportJobListResponse {
  items: ImportJob[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListImportJobsParams {
  status?: ImportJobStatus;
  provider?: string;
  limit?: number;
  offset?: number;
}

// ═══════════════════════════════════════════════════════════════
// PREVIEW TYPES
// ═══════════════════════════════════════════════════════════════

export interface PreviewProduct {
  externalId: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  imageCount: number;
  variantCount: number;
  willImport: boolean;
  skipReason?: string;
  mappedData: Record<string, unknown>;
}

export interface PreviewImportInput {
  integrationId: string;
  fieldMappingProfileId?: string;
  customMappings?: FieldMapping[];
}

export interface PreviewImportResponse {
  provider: string;
  totalProducts: number;
  willImport: number;
  willSkip: number;
  estimatedImages: number;
  products: PreviewProduct[];
  suggestedMappings: FieldMapping[];
  availableSourceFields: string[]; // Fields that exist in the source data
}

// ═══════════════════════════════════════════════════════════════
// STORAGE & BILLING TYPES
// ═══════════════════════════════════════════════════════════════

export interface StorageCategory {
  count: number;
  bytes: number;
  formatted: string;
}

export interface StorageBreakdown {
  originals: StorageCategory;
  thumbnailsSmall: StorageCategory;
  thumbnailsMedium: StorageCategory;
  thumbnailsLarge: StorageCategory;
}

export interface StorageUsageStats {
  companyId: string;
  totalStorageBytes: number;
  totalStorageFormatted: string;
  totalImages: number;
  totalThumbnails: number;
  breakdown: StorageBreakdown;
  storageLimit?: number;
  usagePercentage?: number;
  lastUpdated: string;
}

export interface CostBreakdown {
  storagePerGbCents: number;
  imageProcessingCents: number;
  thumbnailGenerationCents: number;
  monthlyStorageCents: number;
  processingCostCents: number;
}

export interface ImportCostEstimate {
  productCount: number;
  imageCount: number;
  estimatedStorageBytes: number;
  estimatedStorageFormatted: string;
  estimatedThumbnails: number;
  costs: CostBreakdown;
  totalCostCents: number;
  currency: string;
}

export interface ImportHistoryStats {
  companyId: string;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  totalProductsImported: number;
  totalImagesImported: number;
  avgJobDurationSeconds: number;
  jobsByProvider: Record<string, number>;
  jobsOverTime: Array<{ date: string; count: number }>;
}

// ═══════════════════════════════════════════════════════════════
// SSE EVENT TYPES (Discriminated Union for type safety)
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

export interface BaseImportEvent {
  jobId: string;
  timestamp: string;
}

export interface JobProgressEvent extends BaseImportEvent {
  type: 'job:started' | 'job:progress' | 'job:phase-changed' | 'job:completed' | 'job:failed' | 'job:cancelled';
  data: ImportJob;
}

export interface ProductEvent extends BaseImportEvent {
  type: 'job:product-imported' | 'job:product-skipped' | 'job:conflict-detected';
  data: { productId: string; sku: string; name?: string };
}

export interface ErrorEvent extends BaseImportEvent {
  type: 'job:product-error';
  data: ImportJobError;
}

export type ImportEvent = JobProgressEvent | ProductEvent | ErrorEvent;

// ═══════════════════════════════════════════════════════════════
// SSE CONNECTION OPTIONS
// ═══════════════════════════════════════════════════════════════

export interface SSEConnectionOptions {
  /** Maximum reconnection attempts (default: 5) */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  baseDelay?: number;
  /** Called when connection status changes */
  onConnectionChange?: (connected: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER TYPES
// ═══════════════════════════════════════════════════════════════

export interface ImportProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'fulfillment' | 'ecommerce' | 'erp' | 'marketplace';
  isAvailable: boolean;
  requiredCredentials: string[];
}

// Available import providers (will be extended)
// Note: In production, this should be fetched from backend via getImportProviders()
export const IMPORT_PROVIDERS: ImportProvider[] = [
  {
    id: 'roastify',
    name: 'Roastify',
    description: 'Sync coffee products from Roastify in seconds',
    icon: '/integrations/roastify.svg',
    category: 'fulfillment',
    isAvailable: true,
    requiredCredentials: ['apiKey', 'apiSecret'],
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Import your entire Shopify catalog automatically',
    icon: '/integrations/shopify.svg',
    category: 'ecommerce',
    isAvailable: false, // Coming soon
    requiredCredentials: ['accessToken', 'storeDomain'],
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Bring in products from your WooCommerce store',
    icon: '/integrations/woocommerce.svg',
    category: 'ecommerce',
    isAvailable: false,
    requiredCredentials: ['consumerKey', 'consumerSecret', 'siteUrl'],
  },
  {
    id: 'magento',
    name: 'Magento',
    description: 'Sync products from Adobe Commerce / Magento',
    icon: '/integrations/magento.svg',
    category: 'ecommerce',
    isAvailable: false,
    requiredCredentials: ['accessToken', 'baseUrl'],
  },
];

// ═══════════════════════════════════════════════════════════════
// QUERY STRING BUILDER (handles arrays and edge cases)
// ═══════════════════════════════════════════════════════════════

type QueryValue = string | number | boolean | string[] | undefined | null;

const buildQueryString = (params: Record<string, QueryValue>): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      // Handle array values by appending each item
      value.forEach((v) => query.append(key, String(v)));
    } else {
      query.set(key, String(value));
    }
  });
  const str = query.toString();
  return str ? `?${str}` : '';
};

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const productImportApi = {
  // ─────────────────────────────────────────────────────────────
  // IMPORT JOBS
  // ─────────────────────────────────────────────────────────────

  /** Create a new import job */
  createJob: async (data: CreateImportJobInput, companyId?: string): Promise<ImportJob> => {
    const params = buildQueryString({ companyId });
    return apiRequest.post<ImportJob>(`/api/product-import/jobs${params}`, data);
  },

  /** List import jobs */
  listJobs: async (
    query: ListImportJobsParams = {},
    companyId?: string
  ): Promise<ImportJobListResponse> => {
    const params = buildQueryString({ ...query, companyId });
    return apiRequest.get<ImportJobListResponse>(`/api/product-import/jobs${params}`);
  },

  /** Get a single import job */
  getJob: async (jobId: string, companyId?: string): Promise<ImportJob> => {
    const params = buildQueryString({ companyId });
    return apiRequest.get<ImportJob>(`/api/product-import/jobs/${jobId}${params}`);
  },

  /** Cancel a running import job */
  cancelJob: async (jobId: string, companyId?: string): Promise<ImportJob> => {
    const params = buildQueryString({ companyId });
    return apiRequest.post<ImportJob>(`/api/product-import/jobs/${jobId}/cancel${params}`);
  },

  /** Retry a failed import job */
  retryJob: async (jobId: string, companyId?: string): Promise<ImportJob> => {
    const params = buildQueryString({ companyId });
    return apiRequest.post<ImportJob>(`/api/product-import/jobs/${jobId}/retry${params}`);
  },

  // ─────────────────────────────────────────────────────────────
  // PREVIEW
  // ─────────────────────────────────────────────────────────────

  /** Preview products before import */
  previewImport: async (
    data: PreviewImportInput,
    companyId?: string
  ): Promise<PreviewImportResponse> => {
    const params = buildQueryString({ companyId });
    return apiRequest.post<PreviewImportResponse>(`/api/product-import/preview${params}`, data);
  },

  // ─────────────────────────────────────────────────────────────
  // FIELD MAPPING PROFILES
  // ─────────────────────────────────────────────────────────────

  /** Create a field mapping profile */
  createMappingProfile: async (
    data: CreateFieldMappingProfileInput,
    companyId?: string
  ): Promise<FieldMappingProfile> => {
    const params = buildQueryString({ companyId });
    return apiRequest.post<FieldMappingProfile>(`/api/product-import/field-mappings${params}`, data);
  },

  /** List field mapping profiles */
  listMappingProfiles: async (
    provider?: string,
    companyId?: string
  ): Promise<FieldMappingProfile[]> => {
    const params = buildQueryString({ provider, companyId });
    return apiRequest.get<FieldMappingProfile[]>(`/api/product-import/field-mappings${params}`);
  },

  /** Update a field mapping profile */
  updateMappingProfile: async (
    profileId: string,
    data: UpdateFieldMappingProfileInput,
    companyId?: string
  ): Promise<FieldMappingProfile> => {
    const params = buildQueryString({ companyId });
    return apiRequest.patch<FieldMappingProfile>(
      `/api/product-import/field-mappings/${profileId}${params}`,
      data
    );
  },

  /** Delete a field mapping profile */
  deleteMappingProfile: async (profileId: string, companyId?: string): Promise<void> => {
    const params = buildQueryString({ companyId });
    return apiRequest.delete(`/api/product-import/field-mappings/${profileId}${params}`);
  },

  // ─────────────────────────────────────────────────────────────
  // STORAGE & BILLING
  // ─────────────────────────────────────────────────────────────

  /** Get storage usage stats */
  getStorageUsage: async (companyId?: string): Promise<StorageUsageStats> => {
    const params = buildQueryString({ companyId });
    return apiRequest.get<StorageUsageStats>(`/api/product-import/storage${params}`);
  },

  /** Get import history stats */
  getImportHistory: async (companyId?: string): Promise<ImportHistoryStats> => {
    const params = buildQueryString({ companyId });
    return apiRequest.get<ImportHistoryStats>(`/api/product-import/history${params}`);
  },

  /** Estimate import costs */
  estimateCost: async (
    productCount: number,
    imageCount: number,
    generateThumbnails: boolean = true,
    companyId?: string
  ): Promise<ImportCostEstimate> => {
    const params = buildQueryString({
      productCount,
      imageCount,
      generateThumbnails,
      companyId,
    });
    return apiRequest.get<ImportCostEstimate>(`/api/product-import/estimate-cost${params}`);
  },

  // ─────────────────────────────────────────────────────────────
  // SSE EVENTS (with authentication and reconnection)
  // ─────────────────────────────────────────────────────────────

  /**
   * Subscribe to job events via Server-Sent Events
   *
   * Features:
   * - Token-based authentication via query parameter
   * - Automatic reconnection with exponential backoff
   * - Proper cleanup on unmount
   *
   * @returns Cleanup function to close the connection
   */
  subscribeToJobEvents: (
    jobId: string,
    onEvent: (event: ImportEvent) => void,
    onError?: (error: Error) => void,
    options?: SSEConnectionOptions & { companyId?: string }
  ): (() => void) => {
    const {
      maxRetries = 5,
      baseDelay = 1000,
      onConnectionChange,
      companyId,
    } = options || {};

    let eventSource: EventSource | null = null;
    let retryCount = 0;
    let retryTimeout: NodeJS.Timeout | null = null;
    let isClosed = false;

    const connect = () => {
      if (isClosed) return;

      // Get token for authentication (passed via query param since EventSource doesn't support headers)
      const token = typeof window !== 'undefined' ? localStorage.getItem('avnz_token') : null;

      if (!token) {
        onError?.(new Error('Authentication required - no token found'));
        return;
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const params = buildQueryString({ companyId, token });
      const url = `${baseUrl}/api/product-import/jobs/${jobId}/events${params}`;

      try {
        eventSource = new EventSource(url);

        eventSource.onopen = () => {
          retryCount = 0; // Reset retry count on successful connection
          onConnectionChange?.(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as ImportEvent;
            onEvent(data);
          } catch (parseError) {
            console.error('Failed to parse SSE event:', parseError, 'Raw data:', event.data);
            onError?.(new Error('Failed to parse import event data'));
          }
        };

        eventSource.onerror = () => {
          onConnectionChange?.(false);

          // Close current connection
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }

          // Attempt reconnection with exponential backoff
          if (!isClosed && retryCount < maxRetries) {
            const delay = baseDelay * Math.pow(2, retryCount);
            retryCount++;
            console.log(`SSE connection lost. Reconnecting in ${delay}ms (attempt ${retryCount}/${maxRetries})`);

            retryTimeout = setTimeout(connect, delay);
          } else if (!isClosed) {
            onError?.(new Error(`SSE connection failed after ${maxRetries} attempts`));
          }
        };
      } catch (error) {
        console.error('Failed to create EventSource:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to create SSE connection'));
      }
    };

    // Start connection
    connect();

    // Return cleanup function
    return () => {
      isClosed = true;

      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }

      if (eventSource) {
        try {
          if (eventSource.readyState !== EventSource.CLOSED) {
            eventSource.close();
          }
        } catch (e) {
          console.error('Error closing EventSource:', e);
        }
        eventSource = null;
      }
    };
  },
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/** Format bytes to human-readable string */
export function formatBytes(bytes: number): string {
  // Handle edge cases
  if (!bytes || bytes < 0 || !Number.isFinite(bytes)) return '0 B';
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  // Clamp index to valid range (0 to sizes.length - 1) - handles very small fractional values
  const i = Math.max(0, Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1));
  const value = bytes / Math.pow(k, i);

  // Show more precision for small values
  if (value < 0.01) return '<0.01 ' + sizes[i];

  return `${parseFloat(value.toFixed(2))} ${sizes[i]}`;
}

/** Format seconds to human-readable duration */
export function formatDuration(seconds: number | null | undefined): string {
  // Handle edge cases
  if (seconds === null || seconds === undefined || seconds < 0 || !Number.isFinite(seconds)) {
    return '0s';
  }

  const secs = Math.round(seconds);

  if (secs === 0) return '0s';
  if (secs < 60) return `${secs}s`;

  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;

  if (secs < 3600) {
    return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
  }

  const hours = Math.floor(secs / 3600);
  const remainingMins = Math.floor((secs % 3600) / 60);

  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

/** Get status badge variant */
export function getStatusVariant(
  status: ImportJobStatus
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'COMPLETED':
      return 'default'; // Use default (primary color) for success
    case 'IN_PROGRESS':
      return 'secondary';
    case 'PENDING':
      return 'outline';
    case 'FAILED':
      return 'destructive';
    case 'CANCELLED':
      return 'outline';
    default:
      return 'secondary';
  }
}

/** Get phase display name */
export function getPhaseDisplayName(phase: ImportJobPhase): string {
  const names: Record<ImportJobPhase, string> = {
    QUEUED: 'Getting ready...',
    FETCHING: 'Fetching products',
    MAPPING: 'Mapping fields',
    CREATING: 'Adding products',
    DOWNLOADING_IMAGES: 'Downloading images',
    UPLOADING_IMAGES: 'Uploading images',
    GENERATING_THUMBNAILS: 'Creating thumbnails',
    FINALIZING: 'Wrapping up',
    DONE: 'Complete!',
  };
  return names[phase] || phase;
}

/** Get provider by ID */
export function getProvider(providerId: string): ImportProvider | undefined {
  return IMPORT_PROVIDERS.find((p) => p.id === providerId);
}

/** Get available providers only */
export function getAvailableProviders(): ImportProvider[] {
  return IMPORT_PROVIDERS.filter((p) => p.isAvailable);
}

/** Get status color for styling */
export function getStatusColor(status: ImportJobStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'text-green-600';
    case 'IN_PROGRESS':
      return 'text-blue-600';
    case 'PENDING':
      return 'text-muted-foreground';
    case 'FAILED':
      return 'text-red-600';
    case 'CANCELLED':
      return 'text-yellow-600';
    default:
      return 'text-muted-foreground';
  }
}
