/**
 * Gateway Risk Management API Client
 *
 * Provides API methods for:
 * - Merchant Risk Profiles
 * - Gateway Pricing Tiers
 * - Gateway Terms & Conditions
 * - Reserve Management
 * - Chargeback Tracking
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://api.dev.avnz.io:3001';

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('avnz_token');
  }
  return null;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  if (response.status === 204 || contentLength === '0') {
    return undefined as unknown as T;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : (undefined as unknown as T);
}

// ============================================================
// Types
// ============================================================

export enum MerchantRiskLevel {
  LOW = 'LOW',
  STANDARD = 'STANDARD',
  ELEVATED = 'ELEVATED',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
  SUSPENDED = 'SUSPENDED',
}

export enum MerchantAccountStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export enum ChargebackStatus {
  RECEIVED = 'RECEIVED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  REPRESENTMENT = 'REPRESENTMENT',
  WON = 'WON',
  LOST = 'LOST',
  ACCEPTED = 'ACCEPTED',
}

export enum ReserveTransactionType {
  HOLD = 'HOLD',
  RELEASE = 'RELEASE',
  DEBIT = 'DEBIT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum RiskAssessmentType {
  INITIAL = 'INITIAL',
  PERIODIC = 'PERIODIC',
  TRIGGERED = 'TRIGGERED',
  MANUAL = 'MANUAL',
}

export interface MerchantRiskProfile {
  id: string;
  clientId: string;
  platformIntegrationId: string;
  riskLevel: MerchantRiskLevel;
  riskScore: number;
  accountStatus: MerchantAccountStatus;
  pricingTierId?: string;
  mccCode?: string;
  mccDescription?: string;
  businessType?: string;
  businessAge?: number;
  annualVolume?: number;
  averageTicket?: number;
  isHighRiskMCC: boolean;
  hasChargebackHistory: boolean;
  chargebackRatio: number;
  chargebackCount: number;
  refundRatio: number;
  totalProcessed: string;
  transactionCount: number;
  requiresMonitoring: boolean;
  termsAcceptedAt?: string;
  termsVersion?: string;
  lastReviewDate?: string;
  nextReviewDate?: string;
  approvedAt?: string;
  approvedBy?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
    code: string;
  };
  pricingTier?: GatewayPricingTier;
}

export interface GatewayPricingTier {
  id: string;
  platformIntegrationId: string;
  tierName: string;
  riskLevel: MerchantRiskLevel;
  transactionPercentage: number;
  transactionFlat: number;
  chargebackFee: number;
  chargebackReviewFee: number;
  reservePercentage: number;
  reserveHoldDays: number;
  reserveCap?: number;
  applicationFee: number;
  isFounderPricing: boolean;
  setupFee?: number;
  monthlyFee?: number;
  monthlyMinimum?: number;
  securityDepositMin?: number;
  securityDepositMax?: number;
  chargebackThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChargebackRecord {
  id: string;
  merchantRiskProfileId: string;
  chargebackId: string;
  transactionId?: string;
  orderId?: string;
  amount: number;
  currency: string;
  fee: number;
  reason: string;
  reasonCode?: string;
  reasonDescription?: string;
  status: ChargebackStatus;
  receivedAt: string;
  respondByDate?: string;
  representmentSubmittedAt?: string;
  representmentEvidence?: Record<string, unknown>;
  representmentNotes?: string;
  resolvedAt?: string;
  outcomeDate?: string;
  outcomeAmount?: number;
  outcomeFee?: number;
  impactedReserve: boolean;
  reserveDebitAmount?: number;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  merchantRiskProfile?: MerchantRiskProfile;
}

export interface ReserveTransaction {
  id: string;
  merchantRiskProfileId: string;
  transactionType: ReserveTransactionType;
  amount: number;
  runningBalance: number;
  relatedTransactionId?: string;
  relatedChargebackId?: string;
  scheduledReleaseDate?: string;
  actualReleaseDate?: string;
  reason?: string;
  processedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReserveSummary {
  merchantRiskProfileId: string;
  currentBalance: number;
  totalHeld: number;
  totalReleased: number;
  totalDebited: number;
  pendingReleases: number;
  pendingReleaseAmount: number;
  lastTransactionAt?: string;
}

export interface RiskAssessment {
  id: string;
  merchantRiskProfileId: string;
  assessmentType: RiskAssessmentType;
  assessedBy: string;
  previousRiskLevel: MerchantRiskLevel;
  newRiskLevel: MerchantRiskLevel;
  previousRiskScore: number;
  newRiskScore: number;
  factors: Record<string, unknown>;
  reasoning?: string;
  recommendedActions: string[];
  aiModel?: string;
  aiConfidence?: number;
  aiExplanation?: string;
  requiresApproval: boolean;
  approvedAt?: string;
  approvedBy?: string;
  assessmentDate: string;
  createdAt: string;
}

export interface GatewayTermsDocument {
  id: string;
  platformIntegrationId: string;
  version: string;
  title: string;
  content: string;
  effectiveDate: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GatewayTermsAcceptance {
  id: string;
  termsDocumentId: string;
  merchantRiskProfileId: string;
  acceptedAt: string;
  acceptedByUserId: string;
  ipAddress?: string;
  userAgent?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
}

// ============================================================
// API Methods
// ============================================================

export const gatewayRiskApi = {
  // =====================================================
  // Merchant Risk Profiles
  // =====================================================

  listMerchantProfiles: (params?: {
    platformIntegrationId?: string;
    riskLevel?: MerchantRiskLevel;
    accountStatus?: MerchantAccountStatus;
    requiresMonitoring?: boolean;
    isHighRiskMCC?: boolean;
    skip?: number;
    take?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.platformIntegrationId) query.set('platformIntegrationId', params.platformIntegrationId);
    if (params?.riskLevel) query.set('riskLevel', params.riskLevel);
    if (params?.accountStatus) query.set('accountStatus', params.accountStatus);
    if (params?.requiresMonitoring !== undefined) query.set('requiresMonitoring', String(params.requiresMonitoring));
    if (params?.isHighRiskMCC !== undefined) query.set('isHighRiskMCC', String(params.isHighRiskMCC));
    if (params?.skip !== undefined) query.set('skip', String(params.skip));
    if (params?.take !== undefined) query.set('take', String(params.take));

    return request<{ items: MerchantRiskProfile[]; total: number }>(
      `/api/admin/gateway-risk/merchants${query.toString() ? `?${query}` : ''}`
    );
  },

  getMerchantProfile: (clientId: string) =>
    request<MerchantRiskProfile>(`/api/admin/gateway-risk/merchants/${clientId}`),

  getMerchantProfileById: (id: string) =>
    request<MerchantRiskProfile>(`/api/admin/gateway-risk/merchants/by-id/${id}`),

  createMerchantProfile: (data: {
    clientId: string;
    platformIntegrationId: string;
    mccCode?: string;
    mccDescription?: string;
    businessType?: string;
    businessAge?: number;
    annualVolume?: number;
    averageTicket?: number;
  }) =>
    request<MerchantRiskProfile>('/api/admin/gateway-risk/merchants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMerchantProfile: (clientId: string, data: Partial<{
    riskLevel: MerchantRiskLevel;
    riskScore: number;
    accountStatus: MerchantAccountStatus;
    pricingTierId: string;
    mccCode: string;
    mccDescription: string;
    businessType: string;
    businessAge: number;
    annualVolume: number;
    averageTicket: number;
    requiresMonitoring: boolean;
    internalNotes: string;
  }>) =>
    request<MerchantRiskProfile>(`/api/admin/gateway-risk/merchants/${clientId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  triggerRiskAssessment: (clientId: string, data: {
    assessmentType: RiskAssessmentType;
    useAI?: boolean;
  }) =>
    request<RiskAssessment>(`/api/admin/gateway-risk/merchants/${clientId}/assess`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approveRiskAssessment: (assessmentId: string) =>
    request<RiskAssessment>(`/api/admin/gateway-risk/merchants/assessments/${assessmentId}/approve`, {
      method: 'POST',
    }),

  approveAccount: (clientId: string) =>
    request<MerchantRiskProfile>(`/api/admin/gateway-risk/merchants/${clientId}/approve`, {
      method: 'POST',
    }),

  suspendAccount: (clientId: string, reason: string) =>
    request<MerchantRiskProfile>(`/api/admin/gateway-risk/merchants/${clientId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getProfilesRequiringReview: () =>
    request<MerchantRiskProfile[]>('/api/admin/gateway-risk/merchants/requiring-review'),

  // =====================================================
  // Gateway Pricing
  // =====================================================

  listPricingTiers: (platformIntegrationId: string) =>
    request<GatewayPricingTier[]>(
      `/api/admin/gateway-risk/pricing?platformIntegrationId=${platformIntegrationId}`
    ),

  getPricingTier: (id: string) =>
    request<GatewayPricingTier>(`/api/admin/gateway-risk/pricing/${id}`),

  getPricingDisplay: (id: string) =>
    request<{
      transactionFee: string;
      chargebackFee: string;
      reserve: string;
      setupFee: string;
      monthlyFee: string;
      securityDeposit: string;
      applicationFee: string;
    }>(`/api/admin/gateway-risk/pricing/${id}/display`),

  createPricingTier: (data: {
    platformIntegrationId: string;
    tierName: string;
    riskLevel: MerchantRiskLevel;
    transactionPercentage: number;
    transactionFlat: number;
    chargebackFee: number;
    chargebackReviewFee?: number;
    reservePercentage: number;
    reserveHoldDays: number;
    reserveCap?: number;
    applicationFee?: number;
    isFounderPricing?: boolean;
    setupFee?: number;
    monthlyFee?: number;
    monthlyMinimum?: number;
    securityDepositMin?: number;
    securityDepositMax?: number;
    chargebackThreshold?: number;
  }) =>
    request<GatewayPricingTier>('/api/admin/gateway-risk/pricing', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePricingTier: (id: string, data: Partial<{
    tierName: string;
    transactionPercentage: number;
    transactionFlat: number;
    chargebackFee: number;
    chargebackReviewFee: number;
    reservePercentage: number;
    reserveHoldDays: number;
    reserveCap: number;
    applicationFee: number;
    isFounderPricing: boolean;
    setupFee: number;
    monthlyFee: number;
    monthlyMinimum: number;
    securityDepositMin: number;
    securityDepositMax: number;
    chargebackThreshold: number;
    isActive: boolean;
  }>) =>
    request<GatewayPricingTier>(`/api/admin/gateway-risk/pricing/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deletePricingTier: (id: string) =>
    request<void>(`/api/admin/gateway-risk/pricing/${id}`, { method: 'DELETE' }),

  initializeDefaultPricingTiers: (platformIntegrationId: string, isFounderPricing = false) =>
    request<GatewayPricingTier[]>(
      `/api/admin/gateway-risk/pricing/initialize/${platformIntegrationId}?isFounderPricing=${isFounderPricing}`,
      { method: 'POST' }
    ),

  // =====================================================
  // Gateway Terms & Conditions
  // =====================================================

  listTermsDocuments: (platformIntegrationId: string, activeOnly = true) =>
    request<GatewayTermsDocument[]>(
      `/api/admin/gateway-risk/terms?platformIntegrationId=${platformIntegrationId}&activeOnly=${activeOnly}`
    ),

  getTermsDocument: (id: string) =>
    request<GatewayTermsDocument>(`/api/admin/gateway-risk/terms/${id}`),

  getActiveTerms: (platformIntegrationId: string) =>
    request<GatewayTermsDocument>(`/api/admin/gateway-risk/terms/active/${platformIntegrationId}`),

  createTermsDocument: (data: {
    platformIntegrationId: string;
    version: string;
    title: string;
    content: string;
    effectiveDate: string;
    expiresAt?: string;
    isActive?: boolean;
  }) =>
    request<GatewayTermsDocument>('/api/admin/gateway-risk/terms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTermsDocument: (id: string, data: Partial<{
    title: string;
    content: string;
    effectiveDate: string;
    expiresAt: string;
    isActive: boolean;
  }>) =>
    request<GatewayTermsDocument>(`/api/admin/gateway-risk/terms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  acceptTerms: (termsDocumentId: string, merchantRiskProfileId: string) =>
    request<GatewayTermsAcceptance>('/api/admin/gateway-risk/terms/accept', {
      method: 'POST',
      body: JSON.stringify({ termsDocumentId, merchantRiskProfileId }),
    }),

  revokeTermsAcceptance: (acceptanceId: string, reason: string) =>
    request<GatewayTermsAcceptance>(`/api/admin/gateway-risk/terms/acceptance/${acceptanceId}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // =====================================================
  // Reserve Management
  // =====================================================

  getReserveSummary: (merchantRiskProfileId: string) =>
    request<ReserveSummary>(`/api/admin/gateway-risk/reserves/${merchantRiskProfileId}/summary`),

  getReserveTransactions: (merchantRiskProfileId: string, params?: {
    type?: ReserveTransactionType;
    fromDate?: string;
    toDate?: string;
    skip?: number;
    take?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.fromDate) query.set('fromDate', params.fromDate);
    if (params?.toDate) query.set('toDate', params.toDate);
    if (params?.skip !== undefined) query.set('skip', String(params.skip));
    if (params?.take !== undefined) query.set('take', String(params.take));

    return request<{ items: ReserveTransaction[]; total: number }>(
      `/api/admin/gateway-risk/reserves/${merchantRiskProfileId}/transactions${query.toString() ? `?${query}` : ''}`
    );
  },

  createReserveHold: (merchantRiskProfileId: string, data: {
    transactionId: string;
    transactionAmount: number;
    reservePercentage: number;
    holdDays: number;
  }) =>
    request<ReserveTransaction>(`/api/admin/gateway-risk/reserves/${merchantRiskProfileId}/hold`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  releaseReserve: (merchantRiskProfileId: string, data: {
    amount: number;
    reason?: string;
    transactionIds?: string[];
    releaseType: 'PARTIAL' | 'FULL' | 'SCHEDULED';
  }) =>
    request<ReserveTransaction>(`/api/admin/gateway-risk/reserves/${merchantRiskProfileId}/release`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  adjustReserve: (merchantRiskProfileId: string, data: {
    amount: number;
    adjustmentType: 'CREDIT' | 'DEBIT';
    reason: string;
  }) =>
    request<ReserveTransaction>(`/api/admin/gateway-risk/reserves/${merchantRiskProfileId}/adjust`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  processScheduledReleases: () =>
    request<{ processed: number; total: number }>('/api/admin/gateway-risk/reserves/process-scheduled-releases', {
      method: 'POST',
    }),

  // =====================================================
  // Chargeback Management
  // =====================================================

  listChargebacks: (params?: {
    merchantRiskProfileId?: string;
    status?: ChargebackStatus;
    fromDate?: string;
    toDate?: string;
    skip?: number;
    take?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.merchantRiskProfileId) query.set('merchantRiskProfileId', params.merchantRiskProfileId);
    if (params?.status) query.set('status', params.status);
    if (params?.fromDate) query.set('fromDate', params.fromDate);
    if (params?.toDate) query.set('toDate', params.toDate);
    if (params?.skip !== undefined) query.set('skip', String(params.skip));
    if (params?.take !== undefined) query.set('take', String(params.take));

    return request<{ items: ChargebackRecord[]; total: number }>(
      `/api/admin/gateway-risk/chargebacks${query.toString() ? `?${query}` : ''}`
    );
  },

  getChargeback: (id: string) =>
    request<ChargebackRecord>(`/api/admin/gateway-risk/chargebacks/${id}`),

  getChargebackByExternalId: (chargebackId: string) =>
    request<ChargebackRecord>(`/api/admin/gateway-risk/chargebacks/external/${chargebackId}`),

  createChargeback: (data: {
    merchantRiskProfileId: string;
    chargebackId: string;
    transactionId?: string;
    orderId?: string;
    amount: number;
    currency?: string;
    fee: number;
    reason: string;
    reasonCode?: string;
    reasonDescription?: string;
    receivedAt: string;
    respondByDate?: string;
  }) =>
    request<ChargebackRecord>('/api/admin/gateway-risk/chargebacks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateChargeback: (id: string, data: Partial<{
    status: ChargebackStatus;
    reason: string;
    reasonCode: string;
    reasonDescription: string;
    respondByDate: string;
    internalNotes: string;
  }>) =>
    request<ChargebackRecord>(`/api/admin/gateway-risk/chargebacks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  submitRepresentment: (id: string, data: {
    evidence: Record<string, unknown>;
    notes?: string;
  }) =>
    request<ChargebackRecord>(`/api/admin/gateway-risk/chargebacks/${id}/representment`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resolveChargeback: (id: string, data: {
    status: ChargebackStatus.WON | ChargebackStatus.LOST | ChargebackStatus.ACCEPTED;
    outcomeAmount?: number;
    outcomeFee?: number;
    impactReserve?: boolean;
    reserveDebitAmount?: number;
    internalNotes?: string;
  }) =>
    request<ChargebackRecord>(`/api/admin/gateway-risk/chargebacks/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getChargebackStats: (merchantRiskProfileId: string) =>
    request<{
      merchantRiskProfileId: string;
      totalChargebacks: number;
      openChargebacks: number;
      wonChargebacks: number;
      lostChargebacks: number;
      totalAmount: number;
      totalFees: number;
      recoveredAmount: number;
      chargebackRatio: number;
      recentChargebacks: ChargebackRecord[];
    }>(`/api/admin/gateway-risk/chargebacks/stats/${merchantRiskProfileId}`),

  getChargebacksApproachingDeadline: (daysAhead = 3) =>
    request<ChargebackRecord[]>(`/api/admin/gateway-risk/chargebacks/approaching-deadline?daysAhead=${daysAhead}`),
};

export default gatewayRiskApi;
