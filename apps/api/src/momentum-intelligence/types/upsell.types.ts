/**
 * Upsell Module Types
 * AI-Powered Upsell & Cross-sell Recommendations
 */

// ═══════════════════════════════════════════════════════════════
// UPSELL TYPES
// ═══════════════════════════════════════════════════════════════

export enum UpsellType {
  PLAN_UPGRADE = 'PLAN_UPGRADE',           // Move to higher tier
  ADD_ON = 'ADD_ON',                        // Add complementary product
  CROSS_SELL = 'CROSS_SELL',                // Related product category
  FREQUENCY_INCREASE = 'FREQUENCY_INCREASE', // More frequent deliveries
  QUANTITY_INCREASE = 'QUANTITY_INCREASE',   // Larger quantity
  BUNDLE = 'BUNDLE',                         // Product bundle
  PREMIUM_FEATURE = 'PREMIUM_FEATURE',       // Premium features
  GIFT_SUBSCRIPTION = 'GIFT_SUBSCRIPTION',   // Gift for others
}

export enum UpsellTrigger {
  // Behavioral triggers
  HIGH_ENGAGEMENT = 'HIGH_ENGAGEMENT',
  PRODUCT_VIEW = 'PRODUCT_VIEW',
  CART_VALUE_THRESHOLD = 'CART_VALUE_THRESHOLD',
  REPEAT_PURCHASE = 'REPEAT_PURCHASE',
  POSITIVE_REVIEW = 'POSITIVE_REVIEW',
  REFERRAL_MADE = 'REFERRAL_MADE',

  // Lifecycle triggers
  SUBSCRIPTION_ANNIVERSARY = 'SUBSCRIPTION_ANNIVERSARY',
  MILESTONE_REACHED = 'MILESTONE_REACHED',
  LOYALTY_TIER_UPGRADE = 'LOYALTY_TIER_UPGRADE',

  // Timing triggers
  POST_PURCHASE = 'POST_PURCHASE',
  PRE_RENEWAL = 'PRE_RENEWAL',
  CHECKOUT = 'CHECKOUT',

  // Save flow triggers
  SAVE_FLOW_SUCCESS = 'SAVE_FLOW_SUCCESS',
  WINBACK_SUCCESS = 'WINBACK_SUCCESS',
}

export enum UpsellStatus {
  PENDING = 'PENDING',
  PRESENTED = 'PRESENTED',
  VIEWED = 'VIEWED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PresentationChannel {
  WEB_MODAL = 'WEB_MODAL',
  WEB_BANNER = 'WEB_BANNER',
  WEB_SIDEBAR = 'WEB_SIDEBAR',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION',
  IN_APP = 'IN_APP',
  VOICE = 'VOICE',
  CHECKOUT = 'CHECKOUT',
}

// ═══════════════════════════════════════════════════════════════
// UPSELL OFFER
// ═══════════════════════════════════════════════════════════════

export interface UpsellOffer {
  id: string;
  companyId: string;

  // Offer details
  name: string;
  description: string;
  type: UpsellType;
  status: UpsellStatus;

  // Products
  sourceProductId?: string;       // Product triggering the upsell
  targetProductId?: string;       // Product being upsold
  targetProducts?: string[];      // For bundles/cross-sells

  // Pricing
  originalPrice: number;
  offerPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  savingsAmount: number;

  // Presentation
  headline: string;
  subheadline?: string;
  bulletPoints?: string[];
  ctaText: string;
  secondaryCtaText?: string;
  imageUrl?: string;

  // Targeting
  targetingRules: UpsellTargetingRule[];
  excludedCustomerIds?: string[];

  // Triggers
  triggers: UpsellTrigger[];
  triggerConditions?: Record<string, unknown>;

  // Channels
  channels: PresentationChannel[];
  channelConfigs?: Record<PresentationChannel, ChannelConfig>;

  // Timing
  validFrom: Date;
  validUntil?: Date;
  expiresAfterHours?: number;    // Per-customer expiration

  // Limits
  maxRedemptions?: number;
  maxRedemptionsPerCustomer: number;
  currentRedemptions: number;

  // AI optimization
  aiOptimized: boolean;
  conversionRate?: number;
  revenueGenerated?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsellTargetingRule {
  id: string;
  field: string;                  // e.g., "customer.lifetimeValue"
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: string | number | string[];
  priority: number;
}

export interface ChannelConfig {
  enabled: boolean;
  template?: string;
  timing?: {
    delayMinutes?: number;
    sendAt?: string;              // Time of day
    daysOfWeek?: number[];
  };
  frequency?: {
    maxPerDay: number;
    maxPerWeek: number;
    cooldownHours: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// UPSELL PRESENTATION
// ═══════════════════════════════════════════════════════════════

export interface UpsellPresentation {
  id: string;
  offerId: string;
  customerId: string;

  // Presentation details
  channel: PresentationChannel;
  status: UpsellStatus;

  // Timing
  presentedAt: Date;
  viewedAt?: Date;
  respondedAt?: Date;
  expiresAt?: Date;

  // Response
  response?: 'accepted' | 'declined' | 'ignored';
  declineReason?: string;

  // Transaction (if accepted)
  orderId?: string;
  transactionId?: string;
  revenueGenerated?: number;

  // Context
  triggerEvent: string;
  pageUrl?: string;
  sessionId?: string;

  // A/B testing
  variant?: string;
  experimentId?: string;

  // Metadata
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// RECOMMENDATION ENGINE
// ═══════════════════════════════════════════════════════════════

export interface UpsellRecommendation {
  offerId: string;
  offer: UpsellOffer;
  score: number;                  // 0-100 relevance score
  confidence: number;             // AI confidence
  reasons: string[];              // Why this recommendation
  estimatedConversionRate: number;
  estimatedRevenue: number;
  priority: number;
}

export interface CustomerUpsellContext {
  customerId: string;

  // Current state
  currentPlan?: string;
  currentProducts: string[];
  cartContents?: string[];

  // History
  previousPurchases: string[];
  previousUpsells: Array<{
    offerId: string;
    status: UpsellStatus;
    date: Date;
  }>;

  // Engagement
  engagementScore: number;
  lifetimeValue: number;
  averageOrderValue: number;

  // Preferences
  preferredCategories?: string[];
  pricePreference?: 'budget' | 'mid' | 'premium';

  // Recent activity
  recentlyViewed?: string[];
  recentSearches?: string[];
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export interface UpsellConfig {
  companyId: string;

  // General settings
  enabled: boolean;
  aiRecommendations: boolean;

  // Frequency limits
  globalLimits: {
    maxPresentationsPerDay: number;
    maxPresentationsPerWeek: number;
    cooldownAfterDecline: number;     // Hours
    cooldownAfterAccept: number;      // Hours
  };

  // Channel settings
  channelDefaults: Record<PresentationChannel, {
    enabled: boolean;
    priority: number;
    defaultTiming: ChannelConfig['timing'];
    defaultFrequency: ChannelConfig['frequency'];
  }>;

  // AI settings
  aiSettings: {
    minConfidence: number;
    minRelevanceScore: number;
    maxRecommendations: number;
    optimizeFor: 'conversion' | 'revenue' | 'ltv';
  };

  // Behavioral triggers
  triggerSettings: {
    enabledTriggers: UpsellTrigger[];
    triggerConfigs: Record<UpsellTrigger, {
      enabled: boolean;
      conditions?: Record<string, unknown>;
    }>;
  };

  // A/B testing
  abTesting: {
    enabled: boolean;
    defaultTrafficSplit: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

export interface CreateUpsellOfferDto {
  companyId: string;
  name: string;
  description: string;
  type: UpsellType;
  targetProductId?: string;
  targetProducts?: string[];
  originalPrice: number;
  offerPrice: number;
  headline: string;
  subheadline?: string;
  bulletPoints?: string[];
  ctaText: string;
  triggers: UpsellTrigger[];
  channels: PresentationChannel[];
  targetingRules?: UpsellTargetingRule[];
  validFrom?: Date;
  validUntil?: Date;
  maxRedemptionsPerCustomer?: number;
}

export interface GetRecommendationsDto {
  companyId: string;
  customerId: string;
  context?: {
    currentPage?: string;
    cartContents?: string[];
    triggerEvent?: UpsellTrigger;
  };
  maxRecommendations?: number;
  channel?: PresentationChannel;
}

export interface PresentUpsellDto {
  offerId: string;
  customerId: string;
  channel: PresentationChannel;
  triggerEvent: string;
  sessionId?: string;
  pageUrl?: string;
}

export interface RecordResponseDto {
  presentationId: string;
  response: 'accepted' | 'declined' | 'ignored';
  declineReason?: string;
  orderId?: string;
  revenue?: number;
}

// ═══════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════

export interface UpsellPresentedEvent {
  presentation: UpsellPresentation;
  offer: UpsellOffer;
  customer: { id: string; email: string };
}

export interface UpsellAcceptedEvent {
  presentationId: string;
  offerId: string;
  customerId: string;
  orderId: string;
  revenue: number;
}

export interface UpsellDeclinedEvent {
  presentationId: string;
  offerId: string;
  customerId: string;
  reason?: string;
}
