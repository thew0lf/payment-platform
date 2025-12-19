import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES - CHURN RISK
// ═══════════════════════════════════════════════════════════════

export type ChurnSignalType =
  | 'REDUCED_FREQUENCY'
  | 'DECLINED_PAYMENT'
  | 'SUPPORT_COMPLAINT'
  | 'FEATURE_DISENGAGEMENT'
  | 'SUBSCRIPTION_DOWNGRADE'
  | 'CART_ABANDONMENT'
  | 'EMAIL_UNSUBSCRIBE'
  | 'NEGATIVE_FEEDBACK'
  | 'COMPETITOR_MENTION'
  | 'INACTIVITY'
  | 'BILLING_INQUIRY'
  | 'CANCELLATION_PAGE_VISIT'
  | 'REFUND_REQUEST';

export interface ChurnSignal {
  id: string;
  customerId: string;
  companyId: string;
  signalType: ChurnSignalType;
  strength: number; // 0-100
  confidence: number; // 0-100
  metadata: Record<string, unknown>;
  occurredAt: string;
  processedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface ChurnRiskScore {
  id: string;
  customerId: string;
  companyId: string;
  overallScore: number; // 0-100
  confidence: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scoreBreakdown: {
    behavioral: number;
    transactional: number;
    engagement: number;
    sentiment: number;
  };
  topFactors: {
    factor: string;
    impact: number;
    description: string;
  }[];
  previousScore?: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  calculatedAt: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    lifetimeValue?: number;
  };
}

export interface HighRiskCustomer {
  customerId: string;
  customerName: string;
  customerEmail: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  topFactors: string[];
  lifetimeValue: number;
  lastOrderDate?: string;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

// ═══════════════════════════════════════════════════════════════
// TYPES - SAVE FLOW
// ═══════════════════════════════════════════════════════════════

export type SaveFlowStage =
  | 'PATTERN_INTERRUPT'
  | 'DIAGNOSIS'
  | 'BRANCHING'
  | 'NUCLEAR_OFFER'
  | 'LOSS_VISUALIZATION'
  | 'EXIT_SURVEY'
  | 'WINBACK';

export type SaveFlowOutcome =
  | 'SAVED_STAGE_1'
  | 'SAVED_STAGE_2'
  | 'SAVED_STAGE_3'
  | 'SAVED_STAGE_4'
  | 'SAVED_STAGE_5'
  | 'SAVED_VOICE'
  | 'CANCELLED'
  | 'PAUSED'
  | 'DOWNGRADED'
  | 'IN_PROGRESS';

export interface SaveAttempt {
  id: string;
  customerId: string;
  companyId: string;
  subscriptionId?: string;
  currentStage: SaveFlowStage;
  outcome?: SaveFlowOutcome;
  startedAt: string;
  completedAt?: string;
  offersMade: string[];
  offersAccepted: string[];
  notesInternal?: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface SaveFlowConfig {
  id: string;
  companyId: string;
  isEnabled: boolean;
  stages: {
    stage: SaveFlowStage;
    enabled: boolean;
    template?: string;
    retryCount: number;
    delayMinutes: number;
  }[];
  defaultOffers: string[];
  escalationThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveFlowStats {
  totalAttempts: number;
  inProgress: number;
  saved: number;
  cancelled: number;
  paused: number;
  downgraded: number;
  successRate: number;
  avgTimeToSave: number; // minutes
  stagePerformance: {
    stage: SaveFlowStage;
    attempts: number;
    saves: number;
    rate: number;
  }[];
  revenuePreserved: number;
}

// ═══════════════════════════════════════════════════════════════
// TYPES - BEHAVIORAL TRIGGERS
// ═══════════════════════════════════════════════════════════════

export type TriggerCategory =
  | 'URGENCY'
  | 'SCARCITY'
  | 'SOCIAL_PROOF'
  | 'LOSS_AVERSION'
  | 'AUTHORITY'
  | 'RECIPROCITY'
  | 'COMMITMENT'
  | 'FOMO';

export interface BehavioralTrigger {
  id: string;
  name: string;
  code: string;
  category: TriggerCategory;
  description: string;
  template: string;
  variables: string[];
  effectiveness: number; // 0-100
  usageCount: number;
  isActive: boolean;
  contexts: string[]; // email, sms, push, web
}

// ═══════════════════════════════════════════════════════════════
// TYPES - ANALYTICS
// ═══════════════════════════════════════════════════════════════

export interface MomentumAnalyticsOverview {
  period: string;
  saveFlow: {
    attempts: number;
    saved: number;
    successRate: number;
    revenuePreserved: number;
  };
  churn: {
    atRiskCustomers: number;
    churned: number;
    churnRate: number;
    interventions: number;
  };
  voiceAI: {
    calls: number;
    avgDuration: number;
    saveRate: number;
    sentiment: number;
  };
  content: {
    generated: number;
    approved: number;
    sent: number;
    conversionRate: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT - CHURN RISK
// ═══════════════════════════════════════════════════════════════

export const churnApi = {
  // Calculate churn risk for a customer
  calculateRisk: async (
    companyId: string,
    customerId: string
  ): Promise<ChurnRiskScore> => {
    return apiRequest.post<ChurnRiskScore>('/api/momentum/intent/calculate', {
      companyId,
      customerId,
    });
  },

  // Get high-risk customers
  getHighRiskCustomers: async (
    companyId: string,
    params: { limit?: number; minScore?: number } = {}
  ): Promise<{ items: HighRiskCustomer[]; total: number }> => {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.minScore) query.set('minScore', String(params.minScore));
    return apiRequest.get<{ items: HighRiskCustomer[]; total: number }>(
      `/api/momentum/intent/high-risk/${companyId}?${query}`
    );
  },

  // Get customer intent data
  getCustomerIntent: async (
    companyId: string,
    customerId: string
  ): Promise<{ signals: ChurnSignal[]; riskScore: ChurnRiskScore }> => {
    return apiRequest.get<{ signals: ChurnSignal[]; riskScore: ChurnRiskScore }>(
      `/api/momentum/intent/${companyId}/${customerId}`
    );
  },

  // Get recent signals
  getRecentSignals: async (
    companyId: string,
    params: { limit?: number; type?: ChurnSignalType } = {}
  ): Promise<{ items: ChurnSignal[]; total: number }> => {
    const query = new URLSearchParams();
    query.set('companyId', companyId);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.type) query.set('type', params.type);
    return apiRequest.get<{ items: ChurnSignal[]; total: number }>(
      `/api/momentum/intent/signals?${query}`
    );
  },
};

// ═══════════════════════════════════════════════════════════════
// API CLIENT - SAVE FLOW
// ═══════════════════════════════════════════════════════════════

export const saveFlowApi = {
  // Initiate save flow
  initiate: async (data: {
    companyId: string;
    customerId: string;
    subscriptionId?: string;
  }): Promise<SaveAttempt> => {
    return apiRequest.post<SaveAttempt>('/api/momentum/save/initiate', data);
  },

  // Progress to next stage
  progressStage: async (
    attemptId: string,
    data: { action: string; notes?: string }
  ): Promise<SaveAttempt> => {
    return apiRequest.post<SaveAttempt>(
      `/api/momentum/save/${attemptId}/stage`,
      data
    );
  },

  // Complete save flow
  complete: async (
    attemptId: string,
    outcome: SaveFlowOutcome
  ): Promise<SaveAttempt> => {
    return apiRequest.post<SaveAttempt>(
      `/api/momentum/save/${attemptId}/complete`,
      { outcome }
    );
  },

  // Get save flow config
  getConfig: async (companyId: string): Promise<SaveFlowConfig> => {
    return apiRequest.get<SaveFlowConfig>(
      `/api/momentum/save/config/${companyId}`
    );
  },

  // Update save flow config
  updateConfig: async (
    companyId: string,
    data: Partial<SaveFlowConfig>
  ): Promise<SaveFlowConfig> => {
    return apiRequest.put<SaveFlowConfig>(
      `/api/momentum/save/config/${companyId}`,
      data
    );
  },

  // Get active save attempts
  getActiveAttempts: async (
    companyId: string,
    params: { limit?: number; offset?: number } = {}
  ): Promise<{ items: SaveAttempt[]; total: number }> => {
    const query = new URLSearchParams();
    query.set('companyId', companyId);
    query.set('status', 'IN_PROGRESS');
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    return apiRequest.get<{ items: SaveAttempt[]; total: number }>(
      `/api/momentum/save/attempts?${query}`
    );
  },

  // Get save flow stats
  getStats: async (companyId: string): Promise<SaveFlowStats> => {
    return apiRequest.get<SaveFlowStats>(
      `/api/momentum/save/stats/${companyId}`
    );
  },
};

// ═══════════════════════════════════════════════════════════════
// API CLIENT - BEHAVIORAL TRIGGERS
// ═══════════════════════════════════════════════════════════════

export const triggersApi = {
  // Get all triggers
  getAll: async (): Promise<BehavioralTrigger[]> => {
    return apiRequest.get<BehavioralTrigger[]>('/api/momentum/triggers');
  },

  // Get triggers by category
  getByCategory: async (category: TriggerCategory): Promise<BehavioralTrigger[]> => {
    return apiRequest.get<BehavioralTrigger[]>(
      `/api/momentum/triggers/${category}`
    );
  },

  // Get trigger by type
  getByType: async (type: string): Promise<BehavioralTrigger> => {
    return apiRequest.get<BehavioralTrigger>(
      `/api/momentum/triggers/type/${type}`
    );
  },

  // Get context-based suggestions
  getSuggestions: async (context: string): Promise<BehavioralTrigger[]> => {
    return apiRequest.get<BehavioralTrigger[]>(
      `/api/momentum/triggers/context/${context}`
    );
  },

  // Apply triggers to content
  applyToContent: async (data: {
    content: string;
    triggers: string[];
    variables?: Record<string, string>;
  }): Promise<{ enhancedContent: string; appliedTriggers: string[] }> => {
    return apiRequest.post<{ enhancedContent: string; appliedTriggers: string[] }>(
      '/api/momentum/triggers/apply',
      data
    );
  },
};

// ═══════════════════════════════════════════════════════════════
// API CLIENT - ANALYTICS
// ═══════════════════════════════════════════════════════════════

export const momentumAnalyticsApi = {
  // Get overview
  getOverview: async (
    companyId: string,
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<MomentumAnalyticsOverview> => {
    return apiRequest.get<MomentumAnalyticsOverview>(
      `/api/momentum/analytics/overview/${companyId}?period=${period}`
    );
  },

  // Get save performance
  getSavePerformance: async (
    companyId: string,
    params: { startDate?: string; endDate?: string } = {}
  ): Promise<{
    totalAttempts: number;
    successRate: number;
    revenuePreserved: number;
    byStage: { stage: string; count: number; rate: number }[];
    trend: { date: string; attempts: number; saves: number }[];
  }> => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    return apiRequest.get(
      `/api/momentum/analytics/save-performance/${companyId}?${query}`
    );
  },

  // Get voice performance
  getVoicePerformance: async (
    companyId: string
  ): Promise<{
    totalCalls: number;
    avgDuration: number;
    saveRate: number;
    avgSentiment: number;
    callsByOutcome: { outcome: string; count: number }[];
  }> => {
    return apiRequest.get(
      `/api/momentum/analytics/voice-performance/${companyId}`
    );
  },

  // Get content performance
  getContentPerformance: async (
    companyId: string
  ): Promise<{
    generated: number;
    approved: number;
    sent: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
    byType: { type: string; count: number; performance: number }[];
  }> => {
    return apiRequest.get(
      `/api/momentum/analytics/content-performance/${companyId}`
    );
  },

  // Get attribution
  getAttribution: async (
    companyId: string
  ): Promise<{
    byChannel: { channel: string; saves: number; revenue: number }[];
    byIntervention: { type: string; saves: number; rate: number }[];
  }> => {
    return apiRequest.get(
      `/api/momentum/analytics/attribution/${companyId}`
    );
  },
};
