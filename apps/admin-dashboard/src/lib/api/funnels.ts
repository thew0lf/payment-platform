import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export enum FunnelType {
  DIRECT_CHECKOUT = 'DIRECT_CHECKOUT',
  PRODUCT_CHECKOUT = 'PRODUCT_CHECKOUT',
  LANDING_CHECKOUT = 'LANDING_CHECKOUT',
  FULL_FUNNEL = 'FULL_FUNNEL',
}

export enum FunnelStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

export enum StageType {
  LANDING = 'LANDING',
  PRODUCT_SELECTION = 'PRODUCT_SELECTION',
  CHECKOUT = 'CHECKOUT',
  UPSELL = 'UPSELL',
  DOWNSELL = 'DOWNSELL',
  ORDER_BUMP = 'ORDER_BUMP',
  THANK_YOU = 'THANK_YOU',
  FORM = 'FORM',
  CUSTOM = 'CUSTOM',
}

export interface FunnelStage {
  id: string;
  name: string;
  type: StageType;
  order: number;
  config: Record<string, unknown>;
  themeId?: string;
  customStyles?: Record<string, unknown>;
}

export interface FunnelVariant {
  id: string;
  name: string;
  description?: string;
  isControl: boolean;
  trafficWeight: number;
  status: string;
  totalSessions: number;
  conversions: number;
  revenue: number;
}

export interface Funnel {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description?: string;
  type: FunnelType;
  status: FunnelStatus;
  settings: Record<string, unknown>;
  totalVisits: number;
  totalConversions: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  stages: FunnelStage[];
  variants?: FunnelVariant[];
  _count?: {
    sessions: number;
    variants: number;
  };
}

export interface FunnelsResponse {
  items: Funnel[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateFunnelDto {
  name: string;
  slug?: string;
  description?: string;
  type: FunnelType;
  settings?: Record<string, unknown>;
  templateId?: string;
}

export interface UpdateFunnelDto {
  name?: string;
  slug?: string;
  description?: string;
  type?: FunnelType;
  status?: FunnelStatus;
  settings?: Record<string, unknown>;
}

export interface CreateStageDto {
  name: string;
  type: StageType;
  order: number;
  config?: Record<string, unknown>;
  themeId?: string;
  customStyles?: Record<string, unknown>;
}

export interface UpdateStageDto {
  name?: string;
  order?: number;
  config?: Record<string, unknown>;
  themeId?: string;
  customStyles?: Record<string, unknown>;
}

export interface CreateVariantDto {
  name: string;
  description?: string;
  isControl?: boolean;
  trafficWeight?: number;
  stageOverrides?: Record<string, unknown>;
}

export interface UpdateVariantDto {
  name?: string;
  description?: string;
  trafficWeight?: number;
  stageOverrides?: Record<string, unknown>;
}

export interface FunnelQueryParams {
  companyId?: string;
  status?: FunnelStatus;
  type?: FunnelType;
  search?: string;
  limit?: number;
  offset?: number;
}

// Analytics Types
export interface FunnelCompanyStats {
  id: string;
  name: string;
  seoUrl: string;
  status: FunnelStatus;
  totalVisits: number;
  totalConversions: number;
  sessions: number;
  conversions: number;
  revenue: number;
  conversionRate: string;
}

export interface FunnelAnalytics {
  overview: {
    totalVisits: number;
    totalSessions: number;
    completedSessions: number;
    conversionRate: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
  stagePerformance: Array<{
    stageId: string;
    stageName: string;
    stageOrder: number;
    visits: number;
    completions: number;
    dropoffRate: number;
  }>;
  variantPerformance: Array<{
    variantId: string;
    variantName: string;
    isControl: boolean;
    sessions: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
  }>;
  dailyMetrics: Array<{
    date: string;
    visits: number;
    sessions: number;
    conversions: number;
    revenue: number;
  }>;
  trafficSources: Array<{
    source: string;
    visits: number;
    conversions: number;
    revenue: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const funnelsApi = {
  // Funnel CRUD
  list: async (params?: FunnelQueryParams): Promise<FunnelsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.companyId) queryParams.append('companyId', params.companyId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    return apiRequest.get<FunnelsResponse>(`/api/funnels?${queryParams.toString()}`);
  },

  get: async (id: string, companyId?: string): Promise<Funnel> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<Funnel>(`/api/funnels/${id}${params}`);
  },

  create: async (data: CreateFunnelDto, companyId: string): Promise<Funnel> => {
    return apiRequest.post<Funnel>(`/api/funnels?companyId=${companyId}`, data);
  },

  update: async (id: string, data: UpdateFunnelDto, companyId?: string): Promise<Funnel> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.patch<Funnel>(`/api/funnels/${id}${params}`, data);
  },

  delete: async (id: string, companyId?: string): Promise<void> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.delete(`/api/funnels/${id}${params}`);
  },

  publish: async (id: string, publish: boolean, companyId?: string): Promise<Funnel> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<Funnel>(`/api/funnels/${id}/publish${params}`, { publish });
  },

  duplicate: async (id: string, companyId: string): Promise<Funnel> => {
    return apiRequest.post<Funnel>(`/api/funnels/${id}/duplicate?companyId=${companyId}`);
  },

  // Stage management
  createStage: async (funnelId: string, data: CreateStageDto, companyId?: string): Promise<FunnelStage> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<FunnelStage>(`/api/funnels/${funnelId}/stages${params}`, data);
  },

  updateStage: async (funnelId: string, stageId: string, data: UpdateStageDto, companyId?: string): Promise<FunnelStage> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.patch<FunnelStage>(`/api/funnels/${funnelId}/stages/${stageId}${params}`, data);
  },

  deleteStage: async (funnelId: string, stageId: string, companyId?: string): Promise<void> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.delete(`/api/funnels/${funnelId}/stages/${stageId}${params}`);
  },

  reorderStages: async (funnelId: string, stageIds: string[], companyId?: string): Promise<FunnelStage[]> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<FunnelStage[]>(`/api/funnels/${funnelId}/stages/reorder${params}`, { stageIds });
  },

  // Variant management
  createVariant: async (funnelId: string, data: CreateVariantDto, companyId?: string): Promise<FunnelVariant> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<FunnelVariant>(`/api/funnels/${funnelId}/variants${params}`, data);
  },

  updateVariant: async (funnelId: string, variantId: string, data: UpdateVariantDto, companyId?: string): Promise<FunnelVariant> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.patch<FunnelVariant>(`/api/funnels/${funnelId}/variants/${variantId}${params}`, data);
  },

  deleteVariant: async (funnelId: string, variantId: string, companyId?: string): Promise<void> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.delete(`/api/funnels/${funnelId}/variants/${variantId}${params}`);
  },

  // Analytics
  getCompanyStats: async (companyId: string): Promise<FunnelCompanyStats[]> => {
    return apiRequest.get<FunnelCompanyStats[]>(`/api/funnels/stats/overview?companyId=${companyId}`);
  },

  getAnalytics: async (id: string, companyId?: string, days = 30): Promise<FunnelAnalytics> => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    params.append('days', days.toString());
    return apiRequest.get<FunnelAnalytics>(`/api/funnels/${id}/analytics?${params.toString()}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

export const getFunnelTypeLabel = (type: FunnelType): string => {
  const labels: Record<FunnelType, string> = {
    [FunnelType.DIRECT_CHECKOUT]: 'Direct Checkout',
    [FunnelType.PRODUCT_CHECKOUT]: 'Product + Checkout',
    [FunnelType.LANDING_CHECKOUT]: 'Landing + Checkout',
    [FunnelType.FULL_FUNNEL]: 'Full Funnel',
  };
  return labels[type] || type;
};

export const getFunnelStatusColor = (status: FunnelStatus): string => {
  const colors: Record<FunnelStatus, string> = {
    [FunnelStatus.DRAFT]: 'bg-gray-100 text-gray-700',
    [FunnelStatus.PUBLISHED]: 'bg-green-100 text-green-700',
    [FunnelStatus.PAUSED]: 'bg-yellow-100 text-yellow-700',
    [FunnelStatus.ARCHIVED]: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export const getStageTypeLabel = (type: StageType): string => {
  const labels: Record<StageType, string> = {
    [StageType.LANDING]: 'Landing',
    [StageType.PRODUCT_SELECTION]: 'Product Selection',
    [StageType.CHECKOUT]: 'Checkout',
    [StageType.UPSELL]: 'Upsell',
    [StageType.DOWNSELL]: 'Downsell',
    [StageType.ORDER_BUMP]: 'Order Bump',
    [StageType.THANK_YOU]: 'Thank You',
    [StageType.FORM]: 'Form',
    [StageType.CUSTOM]: 'Custom',
  };
  return labels[type] || type;
};

export const getStageTypeIcon = (type: StageType): string => {
  const icons: Record<StageType, string> = {
    [StageType.LANDING]: 'Layout',
    [StageType.PRODUCT_SELECTION]: 'ShoppingBag',
    [StageType.CHECKOUT]: 'CreditCard',
    [StageType.UPSELL]: 'TrendingUp',
    [StageType.DOWNSELL]: 'TrendingDown',
    [StageType.ORDER_BUMP]: 'Plus',
    [StageType.THANK_YOU]: 'CheckCircle',
    [StageType.FORM]: 'FileText',
    [StageType.CUSTOM]: 'Sliders',
  };
  return icons[type] || 'Box';
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC CHECKOUT TYPES & API (No Auth Required)
// ═══════════════════════════════════════════════════════════════

export interface FunnelCheckoutSummary {
  sessionToken: string;
  funnelId: string;
  funnelName: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    name: string;
  }>;
  subtotal: number;
  shippingAmount: number;
  shippingDetails?: {
    carrier: string;
    estimatedDays: number;
    method: string;
  } | null;
  taxAmount: number;
  taxDetails?: {
    taxRate: number;
    taxJurisdiction: string;
  } | null;
  total: number;
  currency: string;
  shippingAddress?: unknown;
  customerInfo?: unknown;
}

export interface FunnelCheckoutDto {
  card: {
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardholderName?: string;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    email?: string;
    phone?: string;
  };
  saveCard?: boolean;
  email: string;
}

export interface FunnelCheckoutResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  transactionId?: string;
  customerId?: string;
  error?: string;
  errorCode?: string;
}

// Error codes that indicate specific issues
export type FunnelCheckoutErrorCode =
  | 'CARD_STORAGE_ERROR'
  | 'PAYMENT_ERROR'
  | 'DECLINED'
  | 'INSUFFICIENT_FUNDS'
  | 'INVALID_CARD'
  | 'EXPIRED_CARD'
  | 'CVV_MISMATCH'
  | 'AVS_MISMATCH'
  | 'NETWORK_ERROR'
  | 'SESSION_EXPIRED'
  | 'VALIDATION_ERROR';

// User-friendly error messages for common error codes
export const getCheckoutErrorMessage = (errorCode?: string, errorMessage?: string): string => {
  if (!errorCode) return errorMessage || 'An unexpected error occurred. Please try again.';

  const errorMessages: Record<string, string> = {
    CARD_STORAGE_ERROR: 'We could not process your card. Please check your card details and try again.',
    PAYMENT_ERROR: 'Payment processing failed. Please try again or use a different payment method.',
    DECLINED: 'Your card was declined. Please try a different card or contact your bank.',
    INSUFFICIENT_FUNDS: 'Insufficient funds. Please use a different card or contact your bank.',
    INVALID_CARD: 'Invalid card number. Please check and re-enter your card details.',
    EXPIRED_CARD: 'This card has expired. Please use a different card.',
    CVV_MISMATCH: 'Invalid security code (CVV). Please check and re-enter.',
    AVS_MISMATCH: 'Billing address does not match card. Please verify your address.',
    NETWORK_ERROR: 'Connection error. Please check your internet and try again.',
    SESSION_EXPIRED: 'Your session has expired. Please refresh the page and try again.',
    VALIDATION_ERROR: 'Please check your information and try again.',
  };

  return errorMessages[errorCode] || errorMessage || 'Payment failed. Please try again.';
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Public Funnel Checkout API (no authentication required)
 * These endpoints are called from the public-facing funnel pages
 */
export const funnelCheckoutApi = {
  /**
   * Get checkout summary with calculated shipping and tax
   */
  getCheckoutSummary: async (sessionToken: string): Promise<FunnelCheckoutSummary> => {
    const response = await fetch(`${API_BASE}/api/f/sessions/${sessionToken}/checkout`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to load checkout summary' }));
      throw new Error(error.message || 'Failed to load checkout summary');
    }

    return response.json();
  },

  /**
   * Process checkout / payment
   * Returns detailed result with success/error status
   */
  processCheckout: async (
    sessionToken: string,
    dto: FunnelCheckoutDto,
  ): Promise<FunnelCheckoutResult> => {
    const response = await fetch(`${API_BASE}/api/f/sessions/${sessionToken}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dto),
    });

    // Parse response body
    const result = await response.json().catch(() => ({
      success: false,
      error: 'Failed to parse response',
      errorCode: 'NETWORK_ERROR',
    }));

    // Even if HTTP status is OK, check the result.success flag
    // The API returns 200 for both success and some business errors
    return result;
  },

  /**
   * Start or resume a funnel session
   */
  getSession: async (sessionToken: string): Promise<{
    id: string;
    sessionToken: string;
    status: string;
    funnelId: string;
    funnel: {
      id: string;
      name: string;
      slug: string;
    };
    selectedProducts?: unknown;
    shippingAddress?: unknown;
    customerInfo?: unknown;
  }> => {
    const response = await fetch(`${API_BASE}/api/f/sessions/${sessionToken}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Session not found' }));
      throw new Error(error.message || 'Session not found');
    }

    return response.json();
  },

  /**
   * Update session data (products, shipping address, etc.)
   */
  updateSession: async (
    sessionToken: string,
    data: {
      selectedProducts?: Array<{
        productId: string;
        quantity: number;
        price: number;
        name: string;
        sku?: string;
      }>;
      shippingAddress?: {
        firstName: string;
        lastName: string;
        street1: string;
        street2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      };
      customerInfo?: {
        email?: string;
        phone?: string;
      };
    },
  ): Promise<unknown> => {
    const response = await fetch(`${API_BASE}/api/f/sessions/${sessionToken}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update session' }));
      throw new Error(error.message || 'Failed to update session');
    }

    return response.json();
  },
};

// ═══════════════════════════════════════════════════════════════
// FUNNEL TEMPLATES API (Public - No Auth)
// ═══════════════════════════════════════════════════════════════

export interface FunnelTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  templateType: 'FULL_FUNNEL' | 'COMPONENT';
  category: string;
  config: Record<string, unknown>;
  demoUrl: string | null;
  featured: boolean;
  industry: string[];
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateFilters {
  type?: 'FULL_FUNNEL' | 'COMPONENT';
  category?: string;
  featured?: boolean;
  industry?: string;
  search?: string;
}

export const funnelTemplatesApi = {
  /**
   * List all templates with optional filtering
   */
  list: async (filters?: TemplateFilters): Promise<FunnelTemplate[]> => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.featured !== undefined) params.append('featured', String(filters.featured));
    if (filters?.industry) params.append('industry', filters.industry);
    if (filters?.search) params.append('search', filters.search);

    const response = await fetch(`${API_BASE}/api/funnel-templates?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch templates');
    }

    return response.json();
  },

  /**
   * Get a single template by slug
   */
  getBySlug: async (slug: string): Promise<FunnelTemplate> => {
    const response = await fetch(`${API_BASE}/api/funnel-templates/${slug}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Template not found');
      }
      throw new Error('Failed to fetch template');
    }

    return response.json();
  },

  /**
   * Get all categories
   */
  getCategories: async (): Promise<string[]> => {
    const response = await fetch(`${API_BASE}/api/funnel-templates/categories`);

    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    return response.json();
  },

  /**
   * Get all industries
   */
  getIndustries: async (): Promise<string[]> => {
    const response = await fetch(`${API_BASE}/api/funnel-templates/industries`);

    if (!response.ok) {
      throw new Error('Failed to fetch industries');
    }

    return response.json();
  },
};
