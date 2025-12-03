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
