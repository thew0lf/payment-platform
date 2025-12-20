/**
 * Customer Service Management Types
 * Two-Tier AI Customer Service System (AI Rep + AI Manager)
 */

// =============================================================================
// ENUMS
// =============================================================================

export enum CSTier {
  AI_REP = 'AI_REP',
  AI_MANAGER = 'AI_MANAGER',
  HUMAN_AGENT = 'HUMAN_AGENT',
}

export enum EscalationReason {
  // AI Rep → AI Manager triggers
  IRATE_CUSTOMER = 'IRATE_CUSTOMER',
  REFUND_REQUEST = 'REFUND_REQUEST',
  COMPLEX_ISSUE = 'COMPLEX_ISSUE',
  REPEAT_CONTACT = 'REPEAT_CONTACT',
  HIGH_VALUE_CUSTOMER = 'HIGH_VALUE_CUSTOMER',
  LEGAL_MENTION = 'LEGAL_MENTION',
  SOCIAL_MEDIA_THREAT = 'SOCIAL_MEDIA_THREAT',

  // AI Manager → Human triggers
  REFUND_OVER_THRESHOLD = 'REFUND_OVER_THRESHOLD',
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
  POLICY_EXCEPTION = 'POLICY_EXCEPTION',
  ESCALATED_COMPLAINT = 'ESCALATED_COMPLAINT',
  TECHNICAL_LIMITATION = 'TECHNICAL_LIMITATION',
}

export enum CSSessionStatus {
  ACTIVE = 'ACTIVE',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  ABANDONED = 'ABANDONED',
}

export enum ResolutionType {
  INFORMATION_PROVIDED = 'INFORMATION_PROVIDED',
  ISSUE_RESOLVED = 'ISSUE_RESOLVED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  REPLACEMENT_SENT = 'REPLACEMENT_SENT',
  CREDIT_APPLIED = 'CREDIT_APPLIED',
  SUBSCRIPTION_MODIFIED = 'SUBSCRIPTION_MODIFIED',
  ESCALATED_TO_HUMAN = 'ESCALATED_TO_HUMAN',
  CUSTOMER_SATISFIED = 'CUSTOMER_SATISFIED',
  UNRESOLVED = 'UNRESOLVED',
}

export enum IssueCategory {
  BILLING = 'BILLING',
  SHIPPING = 'SHIPPING',
  PRODUCT_QUALITY = 'PRODUCT_QUALITY',
  SUBSCRIPTION = 'SUBSCRIPTION',
  REFUND = 'REFUND',
  TECHNICAL = 'TECHNICAL',
  ACCOUNT = 'ACCOUNT',
  GENERAL_INQUIRY = 'GENERAL_INQUIRY',
  COMPLAINT = 'COMPLAINT',
  CANCELLATION = 'CANCELLATION',
}

export enum CustomerSentiment {
  HAPPY = 'HAPPY',
  SATISFIED = 'SATISFIED',
  NEUTRAL = 'NEUTRAL',
  FRUSTRATED = 'FRUSTRATED',
  ANGRY = 'ANGRY',
  IRATE = 'IRATE',
}

// =============================================================================
// CS SESSION TYPES
// =============================================================================

export interface CSSession {
  id: string;
  companyId: string;
  customerId: string;
  channel: 'voice' | 'chat' | 'email' | 'sms';
  currentTier: CSTier;
  status: CSSessionStatus;
  issueCategory?: IssueCategory;
  issueSummary?: string;
  customerSentiment: CustomerSentiment;
  sentimentHistory: SentimentSnapshot[];
  escalationHistory: EscalationEvent[];
  messages: CSMessage[];
  context: CustomerServiceContext;
  resolution?: ResolutionData;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface SentimentSnapshot {
  sentiment: CustomerSentiment;
  score: number;
  timestamp: Date;
  trigger?: string;
}

export interface EscalationEvent {
  fromTier: CSTier;
  toTier: CSTier;
  reason: EscalationReason;
  timestamp: Date;
  notes?: string;
  handledBy?: string;
}

export interface CSMessage {
  id: string;
  role: 'customer' | 'ai_rep' | 'ai_manager' | 'human_agent' | 'system';
  content: string;
  timestamp: Date;
  sentiment?: CustomerSentiment;
  metadata?: {
    actionsTaken?: string[];
    suggestedActions?: string[];
    internalNotes?: string;
    // Claude AI metadata
    aiGenerated?: boolean;
    model?: string;
    tokens?: {
      input: number;
      output: number;
    };
    latencyMs?: number;
  };
}

export interface ResolutionData {
  type: ResolutionType;
  summary: string;
  actionsTaken: string[];
  customerSatisfaction?: number;
  followUpRequired: boolean;
  followUpDate?: Date;
}

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export interface CustomerServiceContext {
  customer: CustomerContext;
  recentHistory: InteractionHistory[];
  orderHistory: OrderSummary[];
  activeSubscription?: SubscriptionSummary;
  openTickets: TicketSummary[];
  availableActions: AvailableAction[];
}

export interface CustomerContext {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tier: string;
  lifetimeValue: number;
  tenureMonths: number;
  rewardsBalance: number;
  isVIP: boolean;
  previousEscalations: number;
  npsScore?: number;
  preferredContactMethod?: 'voice' | 'chat' | 'email' | 'sms';
}

export interface InteractionHistory {
  id: string;
  date: Date;
  channel: string;
  issueCategory: IssueCategory;
  resolution: ResolutionType;
  satisfaction?: number;
  handledBy: CSTier;
}

export interface OrderSummary {
  id: string;
  date: Date;
  total: number;
  status: string;
  items: number;
  trackingNumber?: string;
  deliveryStatus?: string;
}

export interface SubscriptionSummary {
  id: string;
  plan: string;
  status: 'active' | 'paused' | 'cancelled';
  nextBillingDate?: Date;
  monthlyAmount: number;
  startDate: Date;
}

export interface TicketSummary {
  id: string;
  subject: string;
  status: string;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AvailableAction {
  id: string;
  name: string;
  description: string;
  tier: CSTier;
  requiresApproval: boolean;
  parameters?: ActionParameter[];
}

export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// =============================================================================
// TIER CONFIGURATION
// =============================================================================

export interface CSTierConfig {
  tier: CSTier;
  enabled: boolean;
  capabilities: TierCapabilities;
  escalationTriggers: EscalationTrigger[];
  responseGuidelines: ResponseGuidelines;
  limits: TierLimits;
}

export interface TierCapabilities {
  canProcessRefunds: boolean;
  maxRefundAmount?: number;
  canModifySubscription: boolean;
  canApplyCredits: boolean;
  maxCreditAmount?: number;
  canCreateRMA: boolean;
  canOverridePolicy: boolean;
  canAccessCustomerData: boolean;
  canScheduleCallback: boolean;
  canTransferToHuman: boolean;
}

export interface EscalationTrigger {
  reason: EscalationReason;
  conditions: EscalationCondition[];
  targetTier: CSTier;
  priority: 'low' | 'medium' | 'high' | 'immediate';
  autoEscalate: boolean;
}

export interface EscalationCondition {
  type: 'sentiment' | 'keyword' | 'threshold' | 'duration' | 'repeat_contact' | 'customer_value';
  value: string | number;
  operator?: 'equals' | 'contains' | 'greater_than' | 'less_than';
}

export interface ResponseGuidelines {
  tone: 'empathetic' | 'professional' | 'friendly' | 'formal';
  maxResponseLength: number;
  alwaysInclude: string[];
  neverInclude: string[];
  acknowledgeWaitTime: boolean;
  offerAlternatives: boolean;
}

export interface TierLimits {
  maxConcurrentSessions: number;
  maxSessionDuration: number;
  maxMessagesPerSession: number;
  responseTimeTarget: number;
}

// =============================================================================
// IRATE CUSTOMER PROTOCOL
// =============================================================================

export interface IrateCustomerProtocol {
  enabled: boolean;
  detectionThreshold: number;
  triggerKeywords: string[];
  sentimentThreshold: CustomerSentiment;

  immediateActions: IrateAction[];
  deescalationStrategies: DeescalationStrategy[];

  autoEscalate: {
    enabled: boolean;
    afterAttempts: number;
    targetTier: CSTier;
  };

  notifyManager: {
    enabled: boolean;
    channels: ('email' | 'slack' | 'sms')[];
    recipients: string[];
  };
}

export interface IrateAction {
  action: string;
  order: number;
  waitBeforeNext: number;
}

export interface DeescalationStrategy {
  name: string;
  script: string;
  useWhen: string;
  successIndicators: string[];
}

// =============================================================================
// COMPANY CS CONFIGURATION
// =============================================================================

export interface CSConfig {
  companyId: string;
  enabled: boolean;

  tiers: {
    aiRep: CSTierConfig;
    aiManager: CSTierConfig;
    humanAgent: HumanAgentConfig;
  };

  irateProtocol: IrateCustomerProtocol;

  channels: {
    voice: ChannelConfig;
    chat: ChannelConfig;
    email: ChannelConfig;
    sms: ChannelConfig;
  };

  businessHours: BusinessHoursConfig;

  responseTemplates: ResponseTemplate[];

  integrations: CSIntegrations;
}

export interface HumanAgentConfig {
  enabled: boolean;
  queueId?: string;
  maxWaitTime: number;
  fallbackMessage: string;
  availableHours: string;
  // Escalation phone configuration
  escalationPhone?: string;           // Primary phone number to transfer calls to
  escalationPhoneBackup?: string;     // Backup phone if primary unavailable
  notifyOnEscalation?: boolean;       // Send SMS notification to agent
  notificationPhone?: string;         // Phone to receive SMS notifications (can be different from escalation)
}

export interface ChannelConfig {
  enabled: boolean;
  startingTier: CSTier;
  welcomeMessage: string;
  maxWaitMessage: string;
  afterHoursMessage: string;
}

export interface BusinessHoursConfig {
  timezone: string;
  schedule: {
    [day: string]: {
      open: string;
      close: string;
      closed?: boolean;
    };
  };
  holidays: string[];
}

export interface ResponseTemplate {
  id: string;
  name: string;
  category: IssueCategory;
  content: string;
  variables: string[];
  tier: CSTier[];
}

export interface CSIntegrations {
  anthropic: {
    model: string;
    maxTokens: number;
    temperature: number;
  };
  twilio?: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  slack?: {
    webhookUrl: string;
    channel: string;
  };
  zendesk?: {
    subdomain: string;
    apiToken: string;
  };
}

// =============================================================================
// DTOs
// =============================================================================

export interface StartCSSessionDto {
  companyId: string;
  customerId: string;
  channel: 'voice' | 'chat' | 'email' | 'sms';
  initialMessage?: string;
  issueCategory?: IssueCategory;
  metadata?: Record<string, unknown>;
}

export interface SendMessageDto {
  sessionId: string;
  message: string;
}

export interface EscalateSessionDto {
  sessionId: string;
  reason: EscalationReason;
  targetTier: CSTier;
  notes?: string;
}

export interface ResolveSessionDto {
  sessionId: string;
  resolutionType: ResolutionType;
  summary: string;
  actionsTaken: string[];
  followUpRequired?: boolean;
  followUpDate?: string;
}

export interface GetSessionsDto {
  companyId: string;
  status?: CSSessionStatus;
  tier?: CSTier;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface CSAnalyticsDto {
  companyId: string;
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface CSAnalytics {
  period: {
    start: Date;
    end: Date;
  };

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
    byReason: Record<EscalationReason, number>;
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
