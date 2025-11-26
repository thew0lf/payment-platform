/**
 * Intent Detection & Churn Prediction Types
 * Core behavioral signals for Momentum Intelligence™
 */

// ═══════════════════════════════════════════════════════════════
// INTENT CATEGORIES
// ═══════════════════════════════════════════════════════════════

export enum IntentCategory {
  // Cancel-related
  CANCEL = 'CANCEL',
  PAUSE = 'PAUSE',
  DOWNGRADE = 'DOWNGRADE',

  // Positive
  UPGRADE = 'UPGRADE',
  RENEW = 'RENEW',
  REFERRAL = 'REFERRAL',

  // Support
  COMPLAINT = 'COMPLAINT',
  QUESTION = 'QUESTION',
  FEEDBACK = 'FEEDBACK',

  // Payment
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',
  BILLING_QUESTION = 'BILLING_QUESTION',

  // General
  NEUTRAL = 'NEUTRAL',
  UNKNOWN = 'UNKNOWN',
}

export enum CancelReason {
  TOO_EXPENSIVE = 'TOO_EXPENSIVE',
  NOT_USING = 'NOT_USING',
  WRONG_PRODUCT = 'WRONG_PRODUCT',
  BAD_EXPERIENCE = 'BAD_EXPERIENCE',
  COMPETITOR = 'COMPETITOR',
  TEMPORARY_PAUSE = 'TEMPORARY_PAUSE',
  FINANCIAL_HARDSHIP = 'FINANCIAL_HARDSHIP',
  TECHNICAL_ISSUES = 'TECHNICAL_ISSUES',
  SHIPPING_ISSUES = 'SHIPPING_ISSUES',
  QUALITY_ISSUES = 'QUALITY_ISSUES',
  TOO_MUCH_PRODUCT = 'TOO_MUCH_PRODUCT',
  LIFESTYLE_CHANGE = 'LIFESTYLE_CHANGE',
  MOVING = 'MOVING',
  GIFTING_ENDED = 'GIFTING_ENDED',
  OTHER = 'OTHER',
}

export enum SentimentLevel {
  VERY_NEGATIVE = 'VERY_NEGATIVE',
  NEGATIVE = 'NEGATIVE',
  NEUTRAL = 'NEUTRAL',
  POSITIVE = 'POSITIVE',
  VERY_POSITIVE = 'VERY_POSITIVE',
}

export enum UrgencyLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RiskLevel {
  MINIMAL = 'MINIMAL',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ═══════════════════════════════════════════════════════════════
// CHURN SIGNALS
// ═══════════════════════════════════════════════════════════════

export enum ChurnSignalType {
  // Engagement signals
  LOGIN_FREQUENCY_DROP = 'LOGIN_FREQUENCY_DROP',
  ENGAGEMENT_SCORE_DROP = 'ENGAGEMENT_SCORE_DROP',
  FEATURE_USAGE_DECLINE = 'FEATURE_USAGE_DECLINE',
  CANCEL_PAGE_VISIT = 'CANCEL_PAGE_VISIT',
  HELP_PAGE_VISITS = 'HELP_PAGE_VISITS',
  SUPPORT_TICKET_OPENED = 'SUPPORT_TICKET_OPENED',
  NEGATIVE_FEEDBACK = 'NEGATIVE_FEEDBACK',
  NPS_SCORE_LOW = 'NPS_SCORE_LOW',

  // Payment signals
  PAYMENT_FAILURE = 'PAYMENT_FAILURE',
  CARD_EXPIRING = 'CARD_EXPIRING',
  DOWNGRADE_INQUIRY = 'DOWNGRADE_INQUIRY',
  REFUND_REQUEST = 'REFUND_REQUEST',
  CHARGEBACK = 'CHARGEBACK',

  // Behavior signals
  SKIP_FREQUENCY_INCREASE = 'SKIP_FREQUENCY_INCREASE',
  ORDER_FREQUENCY_DECREASE = 'ORDER_FREQUENCY_DECREASE',
  PRODUCT_RETURNS = 'PRODUCT_RETURNS',
  COMPLAINTS = 'COMPLAINTS',

  // Lifecycle signals
  TRIAL_ENDING = 'TRIAL_ENDING',
  CONTRACT_ENDING = 'CONTRACT_ENDING',
  ANNIVERSARY_APPROACHING = 'ANNIVERSARY_APPROACHING',

  // External signals
  COMPETITOR_MENTION = 'COMPETITOR_MENTION',
  SOCIAL_NEGATIVE = 'SOCIAL_NEGATIVE',
}

export interface ChurnSignal {
  id: string;
  customerId: string;
  signalType: ChurnSignalType;
  weight: number;              // 0-100, contribution to risk score
  value: string | number | boolean;
  confidence: number;          // 0-1, how confident we are in this signal
  decayDays: number;           // Days until signal weight decays to 0
  detectedAt: Date;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

export interface SignalWeight {
  signalType: ChurnSignalType;
  baseWeight: number;          // Default weight 0-100
  decayDays: number;           // Days until signal weight decays to 0
  isAdditive: boolean;         // Multiple occurrences add up
  maxOccurrences: number;      // Cap on additive signals
  category: 'engagement' | 'payment' | 'behavior' | 'lifecycle' | 'external';
}

// Default signal weights configuration
export const DEFAULT_SIGNAL_WEIGHTS: SignalWeight[] = [
  // Engagement signals
  { signalType: ChurnSignalType.CANCEL_PAGE_VISIT, baseWeight: 25, decayDays: 7, isAdditive: true, maxOccurrences: 3, category: 'engagement' },
  { signalType: ChurnSignalType.LOGIN_FREQUENCY_DROP, baseWeight: 15, decayDays: 30, isAdditive: false, maxOccurrences: 1, category: 'engagement' },
  { signalType: ChurnSignalType.ENGAGEMENT_SCORE_DROP, baseWeight: 20, decayDays: 14, isAdditive: false, maxOccurrences: 1, category: 'engagement' },
  { signalType: ChurnSignalType.FEATURE_USAGE_DECLINE, baseWeight: 15, decayDays: 21, isAdditive: false, maxOccurrences: 1, category: 'engagement' },
  { signalType: ChurnSignalType.HELP_PAGE_VISITS, baseWeight: 10, decayDays: 7, isAdditive: true, maxOccurrences: 5, category: 'engagement' },
  { signalType: ChurnSignalType.SUPPORT_TICKET_OPENED, baseWeight: 15, decayDays: 14, isAdditive: true, maxOccurrences: 3, category: 'engagement' },
  { signalType: ChurnSignalType.NEGATIVE_FEEDBACK, baseWeight: 20, decayDays: 30, isAdditive: true, maxOccurrences: 3, category: 'engagement' },
  { signalType: ChurnSignalType.NPS_SCORE_LOW, baseWeight: 25, decayDays: 60, isAdditive: false, maxOccurrences: 1, category: 'engagement' },

  // Payment signals
  { signalType: ChurnSignalType.PAYMENT_FAILURE, baseWeight: 30, decayDays: 14, isAdditive: true, maxOccurrences: 3, category: 'payment' },
  { signalType: ChurnSignalType.CARD_EXPIRING, baseWeight: 20, decayDays: 30, isAdditive: false, maxOccurrences: 1, category: 'payment' },
  { signalType: ChurnSignalType.DOWNGRADE_INQUIRY, baseWeight: 25, decayDays: 14, isAdditive: false, maxOccurrences: 1, category: 'payment' },
  { signalType: ChurnSignalType.REFUND_REQUEST, baseWeight: 20, decayDays: 30, isAdditive: true, maxOccurrences: 2, category: 'payment' },
  { signalType: ChurnSignalType.CHARGEBACK, baseWeight: 40, decayDays: 90, isAdditive: true, maxOccurrences: 2, category: 'payment' },

  // Behavior signals
  { signalType: ChurnSignalType.SKIP_FREQUENCY_INCREASE, baseWeight: 15, decayDays: 30, isAdditive: false, maxOccurrences: 1, category: 'behavior' },
  { signalType: ChurnSignalType.ORDER_FREQUENCY_DECREASE, baseWeight: 15, decayDays: 30, isAdditive: false, maxOccurrences: 1, category: 'behavior' },
  { signalType: ChurnSignalType.PRODUCT_RETURNS, baseWeight: 20, decayDays: 30, isAdditive: true, maxOccurrences: 3, category: 'behavior' },
  { signalType: ChurnSignalType.COMPLAINTS, baseWeight: 15, decayDays: 14, isAdditive: true, maxOccurrences: 5, category: 'behavior' },

  // Lifecycle signals
  { signalType: ChurnSignalType.TRIAL_ENDING, baseWeight: 20, decayDays: 7, isAdditive: false, maxOccurrences: 1, category: 'lifecycle' },
  { signalType: ChurnSignalType.CONTRACT_ENDING, baseWeight: 15, decayDays: 30, isAdditive: false, maxOccurrences: 1, category: 'lifecycle' },
  { signalType: ChurnSignalType.ANNIVERSARY_APPROACHING, baseWeight: 10, decayDays: 14, isAdditive: false, maxOccurrences: 1, category: 'lifecycle' },

  // External signals
  { signalType: ChurnSignalType.COMPETITOR_MENTION, baseWeight: 15, decayDays: 14, isAdditive: true, maxOccurrences: 3, category: 'external' },
  { signalType: ChurnSignalType.SOCIAL_NEGATIVE, baseWeight: 10, decayDays: 7, isAdditive: true, maxOccurrences: 5, category: 'external' },
];

// ═══════════════════════════════════════════════════════════════
// CHURN RISK SCORE
// ═══════════════════════════════════════════════════════════════

export interface ChurnRiskScore {
  customerId: string;
  companyId: string;
  score: number;               // 0-100
  riskLevel: RiskLevel;
  signals: ChurnSignal[];
  signalBreakdown: {
    engagement: number;
    payment: number;
    behavior: number;
    lifecycle: number;
    external: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  trendDelta: number;          // Change from last calculation
  predictedChurnDate?: Date;
  recommendedActions: string[];
  calculatedAt: Date;
  nextCalculationAt: Date;
}

export interface CustomerEngagementMetrics {
  customerId: string;
  companyId: string;

  // Login/Activity
  lastLoginAt?: Date;
  loginFrequency: number;      // Logins per 30 days
  loginFrequencyTrend: number; // % change

  // Feature usage
  featuresUsed: string[];
  featureUsageScore: number;   // 0-100

  // Order/Subscription
  totalOrders: number;
  ordersLast30Days: number;
  ordersLast90Days: number;
  orderFrequencyTrend: number;

  // Skip behavior
  totalSkips: number;
  skipsLast30Days: number;
  skipRate: number;            // % of available orders skipped

  // Support
  supportTicketsTotal: number;
  supportTicketsLast30Days: number;
  avgTicketResolutionHours: number;

  // Feedback
  lastNpsScore?: number;
  lastNpsDate?: Date;
  lastFeedbackSentiment?: SentimentLevel;

  // Calculated scores
  engagementScore: number;     // 0-100
  healthScore: number;         // 0-100

  calculatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// INTENT DETECTION
// ═══════════════════════════════════════════════════════════════

export interface IntentDetectionResult {
  customerId: string;
  sessionId?: string;

  // Primary intent
  primaryIntent: IntentCategory;
  primaryConfidence: number;   // 0-1

  // Secondary intents
  secondaryIntents: Array<{
    intent: IntentCategory;
    confidence: number;
  }>;

  // Cancel-specific
  cancelReason?: CancelReason;
  cancelReasonConfidence?: number;

  // Sentiment
  sentiment: SentimentLevel;
  sentimentScore: number;      // -1 to 1

  // Urgency
  urgency: UrgencyLevel;

  // Source
  source: 'web' | 'voice' | 'chat' | 'email' | 'api';
  sourceData?: Record<string, unknown>;

  // Timing
  detectedAt: Date;
}

export interface IntentDetectionContext {
  customerId: string;
  companyId: string;
  sessionId?: string;

  // Current page/action
  currentPage?: string;
  currentAction?: string;

  // Text to analyze (if any)
  text?: string;

  // Voice data (if any)
  transcript?: string;
  audioUrl?: string;

  // Customer context (loaded from DB)
  customer?: {
    tenureMonths: number;
    lifetimeValue: number;
    currentPlan?: string;
    subscriptionStatus?: string;
  };

  // Previous interactions
  recentInteractions?: Array<{
    type: string;
    timestamp: Date;
    data?: Record<string, unknown>;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

export interface RecordSignalDto {
  customerId: string;
  signalType: ChurnSignalType;
  value?: string | number | boolean;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface DetectIntentDto {
  customerId: string;
  companyId: string;
  sessionId?: string;
  source: 'web' | 'voice' | 'chat' | 'email' | 'api';
  text?: string;
  transcript?: string;
  currentPage?: string;
  currentAction?: string;
  metadata?: Record<string, unknown>;
}

export interface GetRiskScoreDto {
  customerId: string;
  companyId: string;
  includeSignals?: boolean;
  includeRecommendations?: boolean;
}

export interface BulkRiskScoreDto {
  companyId: string;
  minRiskLevel?: RiskLevel;
  limit?: number;
  offset?: number;
}

// ═══════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════

export interface ChurnSignalDetectedEvent {
  signal: ChurnSignal;
  previousScore?: number;
  newScore: number;
  riskLevelChanged: boolean;
  previousRiskLevel?: RiskLevel;
  newRiskLevel: RiskLevel;
}

export interface HighRiskCustomerDetectedEvent {
  customerId: string;
  companyId: string;
  riskScore: ChurnRiskScore;
  recommendedIntervention: string;
}

export interface IntentDetectedEvent {
  detection: IntentDetectionResult;
  shouldTriggerIntervention: boolean;
  interventionType?: string;
}
