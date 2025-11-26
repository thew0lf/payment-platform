// Momentum Intelligence™ Types
// AI-Powered Behavioral Commerce Platform

// =============================================================================
// ENUMS (matching Prisma schema)
// =============================================================================

export enum ChurnRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum InterventionType {
  SAVE_FLOW = 'SAVE_FLOW',
  PROACTIVE_OUTREACH = 'PROACTIVE_OUTREACH',
  PAYMENT_RECOVERY = 'PAYMENT_RECOVERY',
  WINBACK = 'WINBACK',
  UPSELL = 'UPSELL',
  SERVICE_RECOVERY = 'SERVICE_RECOVERY',
}

export enum InterventionUrgency {
  IMMEDIATE = 'IMMEDIATE',
  WITHIN_24H = 'WITHIN_24H',
  WITHIN_7D = 'WITHIN_7D',
  MONITORING = 'MONITORING',
}

export enum InterventionStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum InterventionOutcome {
  SAVED = 'SAVED',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  DOWNGRADED = 'DOWNGRADED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  NO_RESPONSE = 'NO_RESPONSE',
  ESCALATED = 'ESCALATED',
}

export enum DeliveryChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  VOICE = 'VOICE',
  IN_APP = 'IN_APP',
  WEBHOOK = 'WEBHOOK',
}

export enum SaveOutcome {
  SAVED_STAGE_1 = 'SAVED_STAGE_1',
  SAVED_STAGE_2 = 'SAVED_STAGE_2',
  SAVED_STAGE_3 = 'SAVED_STAGE_3',
  SAVED_STAGE_4 = 'SAVED_STAGE_4',
  SAVED_STAGE_5 = 'SAVED_STAGE_5',
  SAVED_VOICE = 'SAVED_VOICE',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
  DOWNGRADED = 'DOWNGRADED',
}

export enum CallDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum VoiceCallStatus {
  INITIATED = 'INITIATED',
  RINGING = 'RINGING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BUSY = 'BUSY',
  NO_ANSWER = 'NO_ANSWER',
}

export enum CallOutcome {
  SAVED = 'SAVED',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  DECLINED = 'DECLINED',
  ESCALATED_TO_HUMAN = 'ESCALATED_TO_HUMAN',
  CALLBACK_SCHEDULED = 'CALLBACK_SCHEDULED',
  DISCONNECTED = 'DISCONNECTED',
}

export enum Sentiment {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
  ANGRY = 'ANGRY',
}

export enum ContentType {
  EMAIL_SEQUENCE = 'EMAIL_SEQUENCE',
  SMS_MESSAGE = 'SMS_MESSAGE',
  VOICE_SCRIPT = 'VOICE_SCRIPT',
  AD_COPY = 'AD_COPY',
  LANDING_PAGE = 'LANDING_PAGE',
  IN_APP_MODAL = 'IN_APP_MODAL',
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION',
}

export enum ContentStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum UpsellType {
  SHIPPING_PROTECTION = 'SHIPPING_PROTECTION',
  TIER_UPGRADE = 'TIER_UPGRADE',
  FREQUENCY_UPGRADE = 'FREQUENCY_UPGRADE',
  ADD_ON = 'ADD_ON',
  GIFT_SUBSCRIPTION = 'GIFT_SUBSCRIPTION',
  ANNUAL_PLAN = 'ANNUAL_PLAN',
}

export enum UpsellMoment {
  CHECKOUT = 'CHECKOUT',
  POST_PURCHASE = 'POST_PURCHASE',
  DAY_7 = 'DAY_7',
  DAY_14 = 'DAY_14',
  DAY_30 = 'DAY_30',
  MONTH_2 = 'MONTH_2',
  MONTH_3 = 'MONTH_3',
  SAVE_FLOW = 'SAVE_FLOW',
  WINBACK = 'WINBACK',
}

export enum VoiceScriptType {
  INBOUND_SAVE = 'INBOUND_SAVE',
  OUTBOUND_SAVE = 'OUTBOUND_SAVE',
  WINBACK = 'WINBACK',
  UPSELL = 'UPSELL',
}

// =============================================================================
// INTENT DETECTION TYPES
// =============================================================================

export interface ChurnSignal {
  type: string;
  weight: number;
  description: string;
  detectedAt: Date;
  metadata?: Record<string, any>;
}

export interface ChurnRiskScore {
  score: number; // 0-100
  confidence: number; // 0-1
  riskLevel: ChurnRiskLevel;
  primaryFactors: string[];
  recommendedAction: InterventionType;
  urgency: InterventionUrgency;
}

export interface CustomerBehaviorProfile {
  customerId: string;
  companyId: string;
  loginFrequency: number;
  lastLoginAt?: Date;
  purchaseHistory: {
    totalOrders: number;
    totalSpent: number;
    avgOrderValue: number;
    lastOrderAt?: Date;
  };
  engagementScore: number;
  subscriptionTenure?: number; // days
  supportTicketCount: number;
  npsScore?: number;
}

// =============================================================================
// SAVE FLOW TYPES
// =============================================================================

export interface SaveFlowStageConfig {
  enabled: boolean;
  order: number;
}

export interface PatternInterruptConfig extends SaveFlowStageConfig {
  progressMetric: 'orders' | 'months' | 'rewards' | 'custom';
  progressLabel: string;
  customProgressCalculation?: string;
}

export interface DiagnosisQuestion {
  id: string;
  text: string;
  category: string;
}

export interface DiagnosisSurveyConfig extends SaveFlowStageConfig {
  questions: DiagnosisQuestion[];
  routingRules: RoutingRule[];
}

export interface RoutingRule {
  questionId: string;
  answerContains: string[];
  routeToBranch: string;
}

export interface BranchIntervention {
  type: 'discount_offer' | 'tier_switch' | 'pause_option' | 'product_exchange' | 'shipping_recovery';
  order: number;
  config: {
    discount?: number;
    duration?: number;
    suggestTier?: string;
    maxDuration?: number;
    keepBenefits?: string[];
    messaging: {
      headline: string;
      body: string;
      cta: string;
    };
  };
}

export interface BranchConfig {
  name: string;
  label: string;
  interventions: BranchIntervention[];
  saveRate: number; // Expected save rate
}

export interface BranchingInterventionsConfig extends SaveFlowStageConfig {
  branches: {
    tooExpensive: BranchConfig;
    wrongProduct: BranchConfig;
    tooMuch: BranchConfig;
    shippingIssues: BranchConfig;
    notUsing: BranchConfig;
    other: BranchConfig;
  };
}

export interface NuclearOfferConfig extends SaveFlowStageConfig {
  discount: number;
  duration: number;
  bonusItem?: string;
  timerSeconds: number;
  showOnce: boolean;
}

export interface LossItem {
  type: string;
  label: string;
  value: string;
  icon?: string;
}

export interface LossVisualizationConfig extends SaveFlowStageConfig {
  showProgress: boolean;
  showRewardsBalance: boolean;
  showDiscounts: boolean;
  showExclusiveAccess: boolean;
  customLossItems: LossItem[];
}

export interface SurveyQuestion {
  id: string;
  text: string;
  type: 'text' | 'rating' | 'select';
  options?: string[];
}

export interface ExitSurveyConfig extends SaveFlowStageConfig {
  questions: SurveyQuestion[];
  winbackOptIn: boolean;
}

export interface WinbackSequenceStep {
  dayOffset: number;
  channel: DeliveryChannel;
  templateId: string;
  offer?: {
    type: string;
    value: number;
  };
}

export interface WinbackSequence {
  id: string;
  name: string;
  steps: WinbackSequenceStep[];
}

export interface WinbackConfig extends SaveFlowStageConfig {
  sequences: WinbackSequence[];
}

export interface SaveFlowConfiguration {
  companyId: string;
  enabled: boolean;
  patternInterrupt: PatternInterruptConfig;
  diagnosisSurvey: DiagnosisSurveyConfig;
  branchingInterventions: BranchingInterventionsConfig;
  nuclearOffer: NuclearOfferConfig;
  lossVisualization: LossVisualizationConfig;
  exitSurvey: ExitSurveyConfig;
  winback: WinbackConfig;
  voiceAI: {
    enabled: boolean;
    triggerOnHighRisk: boolean;
    riskThreshold: number;
    scriptId: string;
    fallbackToHuman: boolean;
  };
}

export interface StageHistoryEntry {
  stage: number;
  stageName: string;
  enteredAt: Date;
  exitedAt?: Date;
  response?: any;
  outcome?: string;
}

// =============================================================================
// VOICE AI TYPES
// =============================================================================

export interface VoiceScriptOpening {
  greeting: string;
  patternInterrupt: string;
  acknowledgment: string;
}

export interface VoiceScriptDiagnosis {
  primaryQuestion: string;
  followUpQuestions: {
    trigger: string;
    question: string;
  }[];
  sentimentResponses: {
    positive: string;
    neutral: string;
    negative: string;
    angry: string;
  };
}

export interface VoiceScriptIntervention {
  condition: string;
  response: string;
  offer?: {
    type: string;
    value: number;
    duration?: number;
  };
  transitionToHuman?: boolean;
}

export interface VoiceScriptObjectionHandling {
  objection: string;
  response: string;
}

export interface VoiceScriptClosing {
  acceptOffer: string;
  declineOffer: string;
  escalateToHuman: string;
  scheduleCallback: string;
}

export interface VoiceScriptContent {
  opening: VoiceScriptOpening;
  diagnosis: VoiceScriptDiagnosis;
  interventions: VoiceScriptIntervention[];
  objectionHandling: VoiceScriptObjectionHandling[];
  closing: VoiceScriptClosing;
  behavioralTriggers: Record<string, string[]>;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  inboundWebhookUrl: string;
  statusCallbackUrl: string;
  voiceSettings: {
    voice: string;
    language: string;
    speechTimeout: number;
    maxCallDuration: number;
  };
  speechRecognition: {
    provider: 'google' | 'amazon' | 'deepgram';
    hints: string[];
    model: 'phone_call' | 'default';
  };
  fallbackBehavior: {
    maxRetries: number;
    fallbackMessage: string;
    transferToHuman: boolean;
    humanQueueId?: string;
  };
}

export interface TranscriptSegment {
  speaker: 'agent' | 'customer';
  text: string;
  timestamp: number;
  sentiment?: Sentiment;
  detectedIntent?: string;
}

export interface KeyMoment {
  timestamp: number;
  type: 'objection' | 'positive_signal' | 'offer_response' | 'escalation_trigger';
  description: string;
  transcript: string;
}

// =============================================================================
// CONTENT GENERATION TYPES
// =============================================================================

export interface ContentGenerationContext {
  product: string;
  industry: string;
  brandVoice: 'professional' | 'casual' | 'playful' | 'premium';
  targetAudience: string;
  valuePropositions: string[];
  competitors?: string[];
}

export interface ContentBehavioralConfig {
  primaryTrigger: string;
  secondaryTriggers: string[];
  emotionalTone: 'empathetic' | 'urgent' | 'celebratory' | 'supportive';
}

export interface ContentPersonalization {
  useCustomerName: boolean;
  useCustomerHistory: boolean;
  dynamicFields: string[];
}

export interface ContentConstraints {
  maxLength?: number;
  includeTerms?: string[];
  excludeTerms?: string[];
  ctaText?: string;
}

export interface ContentGenerationRequest {
  type: ContentType;
  companyId: string;
  context: ContentGenerationContext;
  behavioralConfig: ContentBehavioralConfig;
  personalization: ContentPersonalization;
  variants: number;
  constraints?: ContentConstraints;
}

export interface GeneratedEmailContent {
  subject: string;
  preheader: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
}

export interface GeneratedSmsContent {
  message: string;
  includeLink: boolean;
  linkUrl?: string;
}

export interface GeneratedVoiceScriptContent {
  script: VoiceScriptContent;
}

export interface GeneratedAdCopyContent {
  headline: string;
  description: string;
  cta: string;
  variations: {
    headline: string;
    description: string;
  }[];
}

export type GeneratedContentData =
  | GeneratedEmailContent
  | GeneratedSmsContent
  | GeneratedVoiceScriptContent
  | GeneratedAdCopyContent
  | Record<string, any>;

// =============================================================================
// UPSELL TYPES
// =============================================================================

export interface UpsellRecommendation {
  customerId: string;
  moment: UpsellMoment;
  recommendations: {
    primary: UpsellOfferData;
    secondary?: UpsellOfferData;
    tertiary?: UpsellOfferData;
  };
  reasoning: {
    customerSegment: string;
    behaviorSignals: string[];
    similarCustomerConversion: number;
    predictedAcceptance: number;
  };
}

export interface UpsellOfferData {
  type: UpsellType;
  productId?: string;
  originalPrice: number;
  offerPrice: number;
  discount: number;
  validUntil?: Date;
  messaging: {
    headline: string;
    body: string;
    cta: string;
  };
  behavioralTrigger?: string;
  predictedConversion: number;
}

export interface ShippingProtectionConfig {
  enabled: boolean;
  price: number;
  presentation: {
    position: 'pre_checkout' | 'in_checkout' | 'post_checkout';
    preChecked: boolean;
    styling: 'badge' | 'card' | 'inline';
  };
  messaging: {
    headline: string;
    benefits: string[];
    socialProof: string;
  };
  behavioralTriggers: {
    lossAversion: string;
    socialProof: string;
    reciprocity: string;
  };
  hibernateWithSP: {
    enabled: boolean;
    keepSPDuringHibernate: boolean;
    messaging: string;
  };
}

// =============================================================================
// BEHAVIORAL TRIGGER TYPES
// =============================================================================

export interface BehavioralTriggerImplementation {
  pricing?: string;
  headlines?: string;
  visuals?: string;
  language?: string;
  interaction?: string;
  visualization?: string;
  labels?: string;
  community?: string;
  aspiration?: string;
  free_content?: string;
  surprise_gifts?: string;
  personalized_help?: string;
  surveys?: string;
  confirmation?: string;
  reflection?: string;
  positive_language?: string;
  recontextualization?: string;
  possibility?: string;
  scenarios?: string;
  conditional_commitment?: string;
  anticipated_benefits?: string;
  numbers?: string;
  names?: string;
  outcomes?: string;
  price_comparison?: string;
  savings_calculation?: string;
  tier_positioning?: string;
}

export interface BehavioralTriggerData {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  implementation: BehavioralTriggerImplementation;
  examples: string[];
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface MomentumOverview {
  companyId: string;
  period: {
    start: Date;
    end: Date;
  };
  saveMetrics: {
    totalAttempts: number;
    successfulSaves: number;
    saveRate: number;
    revenuePreserved: number;
    trend: number; // percentage change from previous period
  };
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  channelPerformance: {
    channel: DeliveryChannel;
    attempts: number;
    saves: number;
    saveRate: number;
  }[];
  topPerformingStages: {
    stage: string;
    saves: number;
    saveRate: number;
  }[];
}

export interface SavePerformanceMetrics {
  totalAttempts: number;
  outcomes: Record<SaveOutcome, number>;
  stagePerformance: {
    stage: number;
    stageName: string;
    entered: number;
    saved: number;
    continued: number;
    saveRate: number;
  }[];
  branchPerformance: {
    branch: string;
    attempts: number;
    saves: number;
    saveRate: number;
    topIntervention: string;
  }[];
  avgTimeToSave: number;
  revenuePreserved: number;
}

export interface VoicePerformanceMetrics {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  avgDuration: number;
  outcomes: Record<CallOutcome, number>;
  sentimentDistribution: Record<Sentiment, number>;
  saveRate: number;
  escalationRate: number;
  topScripts: {
    scriptId: string;
    scriptName: string;
    calls: number;
    saveRate: number;
  }[];
}

export interface ContentPerformanceMetrics {
  totalGenerated: number;
  byType: Record<ContentType, number>;
  avgPerformance: {
    type: ContentType;
    openRate?: number;
    clickRate?: number;
    conversionRate?: number;
  }[];
  topPerforming: {
    contentId: string;
    name: string;
    type: ContentType;
    performance: number;
  }[];
}

export interface RevenueAttribution {
  period: {
    start: Date;
    end: Date;
  };
  totalRevenueSaved: number;
  bySource: {
    source: string;
    revenue: number;
    percentage: number;
  }[];
  byChannel: {
    channel: DeliveryChannel;
    revenue: number;
    percentage: number;
  }[];
  roi: number;
}
