import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES - CS AI
// ═══════════════════════════════════════════════════════════════

export type CSTier = 'AI_REP' | 'AI_MANAGER' | 'HUMAN_AGENT';
export type CSSessionStatus = 'ACTIVE' | 'ESCALATED' | 'RESOLVED' | 'ABANDONED';
export type CustomerSentiment = 'HAPPY' | 'SATISFIED' | 'NEUTRAL' | 'FRUSTRATED' | 'ANGRY' | 'IRATE';
export type IssueCategory = 'SHIPPING' | 'BILLING' | 'REFUND' | 'CANCELLATION' | 'PRODUCT_QUALITY' | 'GENERAL' | 'OTHER';
export type ResolutionType = 'ISSUE_RESOLVED' | 'REFUND_PROCESSED' | 'CREDIT_APPLIED' | 'ESCALATED_TO_HUMAN' | 'INFORMATION_PROVIDED' | 'NO_RESOLUTION';

export interface CSMessage {
  id: string;
  role: 'customer' | 'ai_rep' | 'ai_manager' | 'human_agent' | 'system';
  content: string;
  timestamp: string;
  sentiment?: CustomerSentiment;
  metadata?: {
    suggestedActions?: string[];
    internalNotes?: string;
  };
}

export interface EscalationEvent {
  fromTier: CSTier;
  toTier: CSTier;
  reason: string;
  timestamp: string;
  notes?: string;
}

export interface CSSession {
  id: string;
  companyId: string;
  customerId: string;
  channel: string;
  currentTier: CSTier;
  status: CSSessionStatus;
  issueCategory?: IssueCategory;
  customerSentiment: CustomerSentiment;
  sentimentHistory: {
    sentiment: CustomerSentiment;
    score: number;
    timestamp: string;
    trigger?: string;
  }[];
  escalationHistory: EscalationEvent[];
  messages: CSMessage[];
  resolution?: {
    type: ResolutionType;
    summary: string;
    actionsTaken: string[];
    followUpRequired: boolean;
    followUpDate?: string;
  };
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CSAnalytics {
  period: { start: string; end: string };
  overview: {
    totalSessions: number;
    resolvedSessions: number;
    resolutionRate: number;
    avgResolutionTime: number;
    avgMessagesPerSession: number;
    customerSatisfactionAvg: number;
  };
  byTier: {
    tier: CSTier;
    sessions: number;
    resolved: number;
    resolutionRate: number;
    avgTime: number;
  }[];
  byChannel: {
    channel: string;
    sessions: number;
    resolved: number;
    avgTime: number;
  }[];
  byCategory: {
    category: IssueCategory;
    count: number;
    avgResolutionTime: number;
    topResolutions: ResolutionType[];
  }[];
  escalations: {
    total: number;
    byReason: Record<string, number>;
    avgEscalationTime: number;
    escalationRate: number;
  };
  sentiment: {
    distribution: Record<CustomerSentiment, number>;
    irateIncidents: number;
    sentimentImprovement: number;
  };
  topIssues: {
    issue: string;
    count: number;
    avgResolutionTime: number;
  }[];
}

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const csAiApi = {
  // Start a new CS session
  startSession: async (data: {
    companyId: string;
    customerId: string;
    channel: string;
    issueCategory?: IssueCategory;
    initialMessage?: string;
  }): Promise<CSSession> => {
    return apiRequest.post<CSSession>('/api/momentum/cs/sessions', data);
  },

  // Send a message in a session
  sendMessage: async (
    sessionId: string,
    message: string
  ): Promise<{ session: CSSession; response: CSMessage }> => {
    return apiRequest.post(`/api/momentum/cs/sessions/${sessionId}/messages`, {
      message,
    });
  },

  // Get session by ID
  getSession: async (sessionId: string): Promise<CSSession> => {
    return apiRequest.get<CSSession>(`/api/momentum/cs/sessions/${sessionId}`);
  },

  // List sessions
  getSessions: async (
    companyId: string,
    params: {
      status?: CSSessionStatus;
      tier?: CSTier;
      channel?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ items: CSSession[]; total: number }> => {
    const query = new URLSearchParams();
    query.set('companyId', companyId);
    if (params.status) query.set('status', params.status);
    if (params.tier) query.set('tier', params.tier);
    if (params.channel) query.set('channel', params.channel);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    return apiRequest.get<{ items: CSSession[]; total: number }>(
      `/api/momentum/cs/sessions?${query}`
    );
  },

  // Escalate session
  escalateSession: async (
    sessionId: string,
    data: {
      reason: string;
      targetTier: CSTier;
      notes?: string;
    }
  ): Promise<CSSession> => {
    return apiRequest.post<CSSession>(
      `/api/momentum/cs/sessions/${sessionId}/escalate`,
      data
    );
  },

  // Resolve session
  resolveSession: async (
    sessionId: string,
    data: {
      resolutionType: ResolutionType;
      summary: string;
      actionsTaken: string[];
      followUpRequired?: boolean;
      followUpDate?: string;
    }
  ): Promise<CSSession> => {
    return apiRequest.post<CSSession>(
      `/api/momentum/cs/sessions/${sessionId}/resolve`,
      data
    );
  },

  // Get analytics
  getAnalytics: async (
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<CSAnalytics> => {
    const query = new URLSearchParams();
    query.set('companyId', companyId);
    query.set('startDate', startDate);
    query.set('endDate', endDate);
    return apiRequest.get<CSAnalytics>(`/api/momentum/cs/analytics?${query}`);
  },

  // Get queue stats (for dashboard)
  getQueueStats: async (
    companyId: string
  ): Promise<{
    activeSessions: number;
    queuedSessions: number;
    avgWaitTime: number;
    activeAgents: number;
    byTier: Record<CSTier, number>;
  }> => {
    return apiRequest.get(`/api/momentum/cs/queue/stats?companyId=${companyId}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// VOICE AI API
// ═══════════════════════════════════════════════════════════════

export interface VoiceCall {
  id: string;
  companyId: string;
  customerId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  fromNumber: string;
  toNumber: string;
  status: string;
  outcome?: string;
  duration?: number;
  transcriptRaw?: string;
  overallSentiment?: string;
  detectedIntents: string[];
  initiatedAt: string;
  answeredAt?: string;
  endedAt?: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface VoiceScript {
  id: string;
  companyId: string;
  name: string;
  type: string;
  description?: string;
  opening: Record<string, unknown>;
  diagnosis: Record<string, unknown>;
  interventions: Record<string, unknown>[];
  closing: Record<string, unknown>;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const voiceAiApi = {
  // Initiate outbound call
  initiateCall: async (data: {
    companyId: string;
    customerId: string;
    scriptId: string;
    priority?: string;
  }): Promise<VoiceCall> => {
    return apiRequest.post<VoiceCall>('/api/momentum/voice/call', data);
  },

  // Get call history
  getCalls: async (
    companyId: string,
    params: {
      status?: string;
      outcome?: string;
      direction?: string;
      limit?: number;
    } = {}
  ): Promise<VoiceCall[]> => {
    const query = new URLSearchParams();
    query.set('companyId', companyId);
    if (params.status) query.set('status', params.status);
    if (params.outcome) query.set('outcome', params.outcome);
    if (params.direction) query.set('direction', params.direction);
    if (params.limit) query.set('limit', String(params.limit));
    return apiRequest.get<VoiceCall[]>(`/api/momentum/voice/calls?${query}`);
  },

  // Get call by ID
  getCall: async (callId: string): Promise<VoiceCall> => {
    return apiRequest.get<VoiceCall>(`/api/momentum/voice/calls/${callId}`);
  },

  // Get voice scripts
  getScripts: async (
    companyId: string,
    type?: string
  ): Promise<VoiceScript[]> => {
    const query = new URLSearchParams();
    query.set('companyId', companyId);
    if (type) query.set('type', type);
    return apiRequest.get<VoiceScript[]>(`/api/momentum/voice/scripts?${query}`);
  },

  // Create voice script
  createScript: async (
    companyId: string,
    data: Partial<VoiceScript>
  ): Promise<VoiceScript> => {
    return apiRequest.post<VoiceScript>('/api/momentum/voice/scripts', {
      companyId,
      ...data,
    });
  },

  // Update voice script
  updateScript: async (
    scriptId: string,
    data: Partial<VoiceScript>
  ): Promise<VoiceScript> => {
    return apiRequest.patch<VoiceScript>(
      `/api/momentum/voice/scripts/${scriptId}`,
      data
    );
  },

  // Check Twilio status
  checkTwilioStatus: async (companyId: string): Promise<{ configured: boolean; status: string }> => {
    return apiRequest.get(`/api/momentum/voice/status?companyId=${companyId}`);
  },
};
