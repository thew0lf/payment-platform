/**
 * Content Generation Engine Types
 * Claude API + Ollama Hybrid System
 */

// ═══════════════════════════════════════════════════════════════
// CONTENT TYPES
// ═══════════════════════════════════════════════════════════════

export enum ContentType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION',
  VOICE_SCRIPT = 'VOICE_SCRIPT',
  AD_COPY = 'AD_COPY',
  LANDING_PAGE = 'LANDING_PAGE',
  SOCIAL_POST = 'SOCIAL_POST',
  IN_APP_MESSAGE = 'IN_APP_MESSAGE',
  CHAT_RESPONSE = 'CHAT_RESPONSE',
}

export enum ContentPurpose {
  // Acquisition
  WELCOME = 'WELCOME',
  ONBOARDING = 'ONBOARDING',
  TRIAL_CONVERSION = 'TRIAL_CONVERSION',
  LEAD_NURTURE = 'LEAD_NURTURE',

  // Retention
  SAVE_FLOW = 'SAVE_FLOW',
  CANCEL_PREVENTION = 'CANCEL_PREVENTION',
  WINBACK = 'WINBACK',
  RE_ENGAGEMENT = 'RE_ENGAGEMENT',

  // Transactional
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  SHIPPING_UPDATE = 'SHIPPING_UPDATE',
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  SUBSCRIPTION_RENEWAL = 'SUBSCRIPTION_RENEWAL',

  // Marketing
  PROMOTION = 'PROMOTION',
  PRODUCT_LAUNCH = 'PRODUCT_LAUNCH',
  NEWSLETTER = 'NEWSLETTER',
  SEASONAL = 'SEASONAL',

  // Support
  SUPPORT_RESPONSE = 'SUPPORT_RESPONSE',
  FEEDBACK_REQUEST = 'FEEDBACK_REQUEST',
  SURVEY = 'SURVEY',
  RMA_NOTIFICATION = 'RMA_NOTIFICATION',
}

export enum AIProvider {
  CLAUDE = 'CLAUDE', // High quality, creative tasks
  OLLAMA = 'OLLAMA', // Fast, routine tasks
  BEDROCK = 'BEDROCK', // AWS Bedrock (PCI-compliant)
}

export enum ContentStatus {
  DRAFT = 'DRAFT',
  GENERATING = 'GENERATING',
  GENERATED = 'GENERATED',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

// ═══════════════════════════════════════════════════════════════
// CONTENT TEMPLATES
// ═══════════════════════════════════════════════════════════════

export interface ContentTemplate {
  id: string;
  companyId: string;

  // Template info
  name: string;
  description?: string;
  type: ContentType;
  purpose: ContentPurpose;
  status: ContentStatus;

  // Content
  subject?: string; // For emails
  preheader?: string; // For emails
  body: string;
  bodyHtml?: string; // HTML version

  // Variables
  variables: TemplateVariable[];

  // AI settings
  aiGenerated: boolean;
  aiProvider?: AIProvider;
  aiPrompt?: string;

  // Behavioral triggers
  triggersApplied: string[];
  triggerConfig?: Record<string, unknown>;

  // Personalization
  personalizationLevel: 'none' | 'basic' | 'advanced' | 'ai';
  dynamicSections?: DynamicSection[];

  // Performance
  usageCount: number;
  conversionRate?: number;
  openRate?: number;
  clickRate?: number;

  // Versioning
  version: number;
  previousVersionId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  createdBy: string;
}

export interface TemplateVariable {
  name: string; // e.g., "customer_name"
  displayName: string; // e.g., "Customer Name"
  type: 'string' | 'number' | 'date' | 'currency' | 'boolean' | 'list';
  defaultValue?: string;
  required: boolean;
  source?: string; // e.g., "customer.firstName"
  fallback?: string; // If value not available
  format?: string; // e.g., "MMM DD, YYYY" for dates
}

export interface DynamicSection {
  id: string;
  name: string;
  condition: string; // Expression to evaluate
  content: string;
  priority: number;
}

// ═══════════════════════════════════════════════════════════════
// GENERATED CONTENT
// ═══════════════════════════════════════════════════════════════

export interface GeneratedContent {
  id: string;
  companyId: string;
  templateId?: string;

  // Generation details
  type: ContentType;
  purpose: ContentPurpose;
  provider: AIProvider;

  // Prompt
  prompt: string;
  systemPrompt?: string;

  // Generated content
  subject?: string;
  body: string;
  bodyHtml?: string;

  // Variations
  variations?: ContentVariation[];
  selectedVariationId?: string;

  // Customer context
  customerId?: string;
  customerContext?: CustomerContentContext;

  // Behavioral triggers
  triggersApplied: string[];
  triggerApplications?: Array<{
    trigger: string;
    location: string;
    original: string;
    enhanced: string;
  }>;

  // Quality metrics
  qualityScore?: number;
  readabilityScore?: number;
  sentimentScore?: number;

  // Generation metrics
  tokensUsed: number;
  generationTimeMs: number;
  cost?: number;

  // Status
  status: ContentStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;

  // Timestamps
  createdAt: Date;
}

export interface ContentVariation {
  id: string;
  version: string; // e.g., "A", "B", "C"
  subject?: string;
  body: string;
  triggers: string[];
  tone: string;
  selected: boolean;
}

export interface CustomerContentContext {
  customerId: string;
  firstName?: string;
  lastName?: string;
  email?: string;

  // Account
  tenureMonths?: number;
  lifetimeValue?: number;
  tier?: string;

  // Subscription
  planName?: string;
  planPrice?: number;
  nextBillingDate?: Date;

  // Engagement
  engagementScore?: number;
  lastOrderDate?: Date;
  productsExplored?: number;
  rewardsBalance?: number;

  // Behavior
  cancelReason?: string;
  churnRiskScore?: number;
  sentiment?: string;

  // Recent activity
  recentProducts?: string[];
  recentOrders?: number;

  // Custom attributes
  customAttributes?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// GENERATION CONFIG
// ═══════════════════════════════════════════════════════════════

export interface ContentGenerationConfig {
  companyId: string;

  // Provider settings
  providers: {
    primary: AIProvider;
    fallback: AIProvider;
    routingRules: ProviderRoutingRule[];
  };

  // Claude settings
  claude: {
    model: string;
    temperature: number;
    maxTokens: number;
    monthlyBudget: number;
  };

  // Ollama settings
  ollama: {
    model: string;
    endpoint: string;
    temperature: number;
    maxTokens: number;
  };

  // Quality settings
  quality: {
    minQualityScore: number;
    requireReview: boolean;
    reviewThreshold: number;
    autoApprove: boolean;
    autoApproveMinScore: number;
  };

  // Behavioral triggers
  triggers: {
    autoApply: boolean;
    maxTriggersPerContent: number;
    defaultTriggers: string[];
    purposeTriggers: Record<string, string[]>;
  };

  // Brand voice
  brandVoice: {
    tone: string[];
    personality: string;
    avoidWords: string[];
    preferredPhrases: string[];
    styleGuide?: string;
  };

  // Personalization
  personalization: {
    enabled: boolean;
    dynamicContent: boolean;
    aiPersonalization: boolean;
  };
}

export interface ProviderRoutingRule {
  id: string;
  conditions: {
    contentType?: ContentType[];
    purpose?: ContentPurpose[];
    qualityRequired?: 'high' | 'standard' | 'low';
    urgency?: 'immediate' | 'normal' | 'batch';
    personalized?: boolean;
  };
  provider: AIProvider;
  priority: number;
}

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

export interface GenerateContentDto {
  companyId: string;
  type: ContentType;
  purpose: ContentPurpose;

  // Content guidance
  prompt?: string;
  instructions?: string;
  tone?: string;
  length?: 'short' | 'medium' | 'long';

  // Customer context
  customerId?: string;
  customerContext?: Partial<CustomerContentContext>;

  // Template
  templateId?: string;
  variables?: Record<string, string>;

  // Behavioral triggers
  applyTriggers?: boolean;
  specificTriggers?: string[];

  // Options
  variations?: number; // How many variations to generate
  provider?: AIProvider; // Force specific provider
  qualityLevel?: 'high' | 'standard' | 'fast';
}

export interface RenderTemplateDto {
  templateId: string;
  variables: Record<string, unknown>;
  customerId?: string;
  applyTriggers?: boolean;
}

export interface CreateTemplateDto {
  companyId: string;
  name: string;
  description?: string;
  type: ContentType;
  purpose: ContentPurpose;
  subject?: string;
  preheader?: string;
  body: string;
  bodyHtml?: string;
  variables?: TemplateVariable[];
  triggersApplied?: string[];
}

export interface UpdateTemplateDto {
  templateId: string;
  name?: string;
  description?: string;
  subject?: string;
  preheader?: string;
  body?: string;
  bodyHtml?: string;
  variables?: TemplateVariable[];
  triggersApplied?: string[];
  status?: ContentStatus;
}

export interface ImproveContentDto {
  contentId: string;
  feedback: string;
  aspects?: ('clarity' | 'persuasion' | 'tone' | 'length' | 'triggers')[];
}

export interface AnalyzeContentDto {
  content: string;
  type: ContentType;
  purpose: ContentPurpose;
}

export interface GetTemplatesDto {
  companyId: string;
  type?: ContentType;
  purpose?: ContentPurpose;
  status?: ContentStatus;
  limit?: number;
  offset?: number;
}

export interface GetGeneratedContentDto {
  companyId: string;
  type?: ContentType;
  purpose?: ContentPurpose;
  status?: ContentStatus;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════

export interface ContentAnalytics {
  period: {
    start: Date;
    end: Date;
  };

  overview: {
    totalGenerated: number;
    totalTokensUsed: number;
    totalCost: number;
    avgQualityScore: number;
    avgGenerationTime: number;
  };

  byType: Record<
    ContentType,
    {
      count: number;
      tokensUsed: number;
      avgQuality: number;
    }
  >;

  byPurpose: Record<
    ContentPurpose,
    {
      count: number;
      tokensUsed: number;
      avgQuality: number;
    }
  >;

  byProvider: Record<
    AIProvider,
    {
      count: number;
      tokensUsed: number;
      cost: number;
      avgGenerationTime: number;
    }
  >;

  topTemplates: {
    templateId: string;
    name: string;
    usageCount: number;
    conversionRate: number;
  }[];

  triggersPerformance: {
    trigger: string;
    usageCount: number;
    avgConversion: number;
  }[];
}

export interface ContentAnalyticsDto {
  companyId: string;
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
}

// ═══════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════

export interface ContentGeneratedEvent {
  content: GeneratedContent;
  provider: AIProvider;
  tokensUsed: number;
  cost?: number;
}

export interface ContentApprovedEvent {
  contentId: string;
  approvedBy: string;
  autoApproved: boolean;
}

export interface TemplatePublishedEvent {
  templateId: string;
  publishedBy: string;
  version: number;
}
