import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type LeadStatus =
  | 'ANONYMOUS'
  | 'IDENTIFIED'
  | 'QUALIFIED'
  | 'CONVERTED'
  | 'ABANDONED'
  | 'NURTURING'
  | 'DISQUALIFIED';

export type LeadSource =
  | 'FUNNEL'
  | 'LANDING_PAGE'
  | 'CHECKOUT_ABANDON'
  | 'FORM'
  | 'IMPORT'
  | 'API'
  | 'MANUAL';

export interface Lead {
  id: string;
  companyId: string;

  // Identity
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  firstName: string | null;
  lastName: string | null;

  // Source Tracking
  source: LeadSource;
  sourceId: string | null;
  sourceName: string | null;

  // Attribution
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  referrer: string | null;
  landingPage: string | null;

  // Device/Browser
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  geoCountry: string | null;
  geoRegion: string | null;
  geoCity: string | null;

  // Funnel Progress
  funnelId: string | null;
  highestStage: number;
  lastStageName: string | null;
  abandonStage: number | null;
  abandonReason: string | null;

  // Form Data
  capturedFields: Record<string, unknown>;
  fieldCaptureLog: Array<{
    field: string;
    value: string;
    timestamp: string;
    stage: number;
  }>;

  // Engagement Metrics
  totalSessions: number;
  totalPageViews: number;
  totalTimeOnSite: number;
  engagementScore: number;
  intentScore: number;

  // Value
  estimatedValue: number;
  cartValue: number;
  cartItems: unknown[];

  // Status
  status: LeadStatus;
  qualifiedAt: string | null;
  qualifiedReason: string | null;

  // Conversion
  convertedAt: string | null;
  customerId: string | null;
  conversionOrderId: string | null;

  // Re-engagement
  lastContactedAt: string | null;
  contactCount: number;
  optedOut: boolean;
  optedOutAt: string | null;

  // Timestamps
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadListResponse {
  leads: Lead[];
  total: number;
}

export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  bySource: Record<LeadSource, number>;
  avgEngagementScore: number;
  avgIntentScore: number;
  totalEstimatedValue: number;
  recentLeads: number; // Last 24 hours
  qualifiedRate: number; // % that became qualified
  conversionRate: number; // % that converted
}

export interface LeadQueryParams {
  status?: LeadStatus;
  source?: LeadSource;
  funnelId?: string;
  search?: string;
  minEngagement?: number;
  minIntent?: number;
  limit?: number;
  offset?: number;
  orderBy?: 'lastSeenAt' | 'engagementScore' | 'intentScore' | 'estimatedValue';
  order?: 'asc' | 'desc';
}

export interface UpdateLeadDto {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  capturedFields?: Record<string, unknown>;
  cartValue?: number;
  cartItems?: unknown[];
}

export interface ConvertLeadDto {
  customerId: string;
  orderId?: string;
}

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const leadsApi = {
  /**
   * List leads for a company
   */
  async list(params?: LeadQueryParams, companyId?: string): Promise<LeadListResponse> {
    const searchParams = new URLSearchParams();

    if (companyId) searchParams.append('companyId', companyId);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.source) searchParams.append('source', params.source);
    if (params?.funnelId) searchParams.append('funnelId', params.funnelId);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.minEngagement !== undefined)
      searchParams.append('minEngagement', params.minEngagement.toString());
    if (params?.minIntent !== undefined)
      searchParams.append('minIntent', params.minIntent.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.orderBy) searchParams.append('orderBy', params.orderBy);
    if (params?.order) searchParams.append('order', params.order);

    return apiRequest.get<LeadListResponse>(`/api/leads?${searchParams}`);
  },

  /**
   * Get lead by ID
   */
  async getById(id: string): Promise<Lead> {
    return apiRequest.get<Lead>(`/api/leads/${id}`);
  },

  /**
   * Get lead statistics
   */
  async getStats(companyId?: string, funnelId?: string): Promise<LeadStats> {
    const searchParams = new URLSearchParams();
    if (companyId) searchParams.append('companyId', companyId);
    if (funnelId) searchParams.append('funnelId', funnelId);
    return apiRequest.get<LeadStats>(`/api/leads/stats?${searchParams}`);
  },

  /**
   * Update lead
   */
  async update(id: string, data: UpdateLeadDto): Promise<Lead> {
    return apiRequest.patch<Lead>(`/api/leads/${id}`, data);
  },

  /**
   * Recalculate lead scores
   */
  async recalculateScores(id: string): Promise<Lead> {
    return apiRequest.post<Lead>(`/api/leads/${id}/scores`, {});
  },

  /**
   * Convert lead to customer
   */
  async convert(id: string, data: ConvertLeadDto): Promise<Lead> {
    return apiRequest.post<Lead>(`/api/leads/${id}/convert`, data);
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const leadStatusConfig: Record<
  LeadStatus,
  { label: string; color: string; bgColor: string }
> = {
  ANONYMOUS: {
    label: 'Anonymous',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  IDENTIFIED: {
    label: 'Identified',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  QUALIFIED: {
    label: 'Qualified',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  CONVERTED: {
    label: 'Converted',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  ABANDONED: {
    label: 'Abandoned',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  NURTURING: {
    label: 'Nurturing',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  DISQUALIFIED: {
    label: 'Disqualified',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
};

export const leadSourceConfig: Record<
  LeadSource,
  { label: string; icon: string }
> = {
  FUNNEL: { label: 'Funnel', icon: 'filter' },
  LANDING_PAGE: { label: 'Landing Page', icon: 'file-text' },
  CHECKOUT_ABANDON: { label: 'Checkout Abandon', icon: 'shopping-cart' },
  FORM: { label: 'Form', icon: 'clipboard' },
  IMPORT: { label: 'Import', icon: 'upload' },
  API: { label: 'API', icon: 'code' },
  MANUAL: { label: 'Manual', icon: 'user-plus' },
};

export function formatLeadName(lead: Lead): string {
  if (lead.firstName && lead.lastName) {
    return `${lead.firstName} ${lead.lastName}`;
  }
  if (lead.firstName) return lead.firstName;
  if (lead.lastName) return lead.lastName;
  if (lead.email) return lead.email;
  return 'Anonymous';
}

export function formatEngagementScore(score: number): string {
  if (score >= 0.8) return 'High';
  if (score >= 0.5) return 'Medium';
  if (score >= 0.2) return 'Low';
  return 'Very Low';
}

export function formatIntentScore(score: number): string {
  if (score >= 0.8) return 'Very High';
  if (score >= 0.6) return 'High';
  if (score >= 0.4) return 'Medium';
  if (score >= 0.2) return 'Low';
  return 'Very Low';
}

export function getLeadLocation(lead: Lead): string | null {
  const parts = [lead.geoCity, lead.geoRegion, lead.geoCountry].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}
