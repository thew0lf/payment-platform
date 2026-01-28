/**
 * Cart Save Flow Types
 * MI-powered abandoned cart recovery system
 */

// ============================================================================
// CART SAVE STAGES
// ============================================================================

export enum CartSaveStage {
  // Immediate (0-30 minutes)
  BROWSE_REMINDER = 'BROWSE_REMINDER',

  // Early (30 min - 2 hours)
  PATTERN_INTERRUPT = 'PATTERN_INTERRUPT',

  // Diagnosis (2-6 hours)
  DIAGNOSIS_SURVEY = 'DIAGNOSIS_SURVEY',

  // Intervention (6-24 hours)
  BRANCHING_INTERVENTION = 'BRANCHING_INTERVENTION',

  // Escalation (24-48 hours)
  NUCLEAR_OFFER = 'NUCLEAR_OFFER',

  // Recovery (48-72 hours)
  LOSS_VISUALIZATION = 'LOSS_VISUALIZATION',

  // Final (72+ hours)
  WINBACK_SEQUENCE = 'WINBACK_SEQUENCE',

  // Voice AI Recovery (high-value carts)
  VOICE_RECOVERY = 'VOICE_RECOVERY',
}

// ============================================================================
// ABANDONMENT REASONS
// ============================================================================

export enum CartAbandonmentReason {
  TOO_EXPENSIVE = 'TOO_EXPENSIVE',
  SHIPPING_COST = 'SHIPPING_COST',
  JUST_BROWSING = 'JUST_BROWSING',
  NEED_MORE_INFO = 'NEED_MORE_INFO',
  PAYMENT_ISSUES = 'PAYMENT_ISSUES',
  COMPARING_OPTIONS = 'COMPARING_OPTIONS',
  SAVING_FOR_LATER = 'SAVING_FOR_LATER',
  OTHER = 'OTHER',
}

// ============================================================================
// INTERVENTION TYPES
// ============================================================================

export enum CartInterventionType {
  // Discounts
  PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT',
  FIXED_DISCOUNT = 'FIXED_DISCOUNT',
  FREE_SHIPPING = 'FREE_SHIPPING',
  FREE_GIFT = 'FREE_GIFT',

  // Information
  PRODUCT_FAQ = 'PRODUCT_FAQ',
  REVIEWS_SHOWCASE = 'REVIEWS_SHOWCASE',
  VIDEO_DEMO = 'VIDEO_DEMO',
  COMPARISON_CHART = 'COMPARISON_CHART',

  // Alternatives
  PAYMENT_PLAN = 'PAYMENT_PLAN',
  BUDGET_ALTERNATIVE = 'BUDGET_ALTERNATIVE',
  LOCAL_PICKUP = 'LOCAL_PICKUP',
  PRICE_MATCH = 'PRICE_MATCH',

  // Engagement
  LIVE_CHAT = 'LIVE_CHAT',
  WISHLIST_SAVE = 'WISHLIST_SAVE',
  PRICE_DROP_ALERT = 'PRICE_DROP_ALERT',
  RESTOCK_ALERT = 'RESTOCK_ALERT',
  UNIQUE_VALUE = 'UNIQUE_VALUE',
  THRESHOLD_REMINDER = 'THRESHOLD_REMINDER',
}

// ============================================================================
// DELIVERY CHANNELS
// ============================================================================

export enum CartSaveChannel {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  VOICE = 'VOICE',
}

// ============================================================================
// SAVE ATTEMPT STATUS
// ============================================================================

export enum CartSaveStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CONVERTED = 'CONVERTED',
  EXHAUSTED = 'EXHAUSTED',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
}

// ============================================================================
// INTERVENTION RESPONSE
// ============================================================================

export enum CartSaveResponseType {
  CLICKED = 'CLICKED',
  CONVERTED = 'CONVERTED',
  DECLINED = 'DECLINED',
  SURVEY_ANSWERED = 'SURVEY_ANSWERED',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
  NO_RESPONSE = 'NO_RESPONSE',
}

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

export interface StageConfig {
  enabled: boolean;
  delayMinutes: number;
  channels?: CartSaveChannel[];
  channel?: CartSaveChannel;
  maxDiscountPercent?: number;
  freeShippingThreshold?: number | null;
  includeGift?: boolean;
  voiceCallEnabled?: boolean;
  minCartValueForVoice?: number;
  sequenceLength?: number;
  voiceRecovery?: {
    enabled: boolean;
    minCartValue?: number;
    priority?: 'high' | 'normal' | 'low';
    blackoutHours?: { start: number; end: number };
  };
}

export interface CartSaveFlowConfig {
  stages: {
    browseReminder: StageConfig;
    patternInterrupt: StageConfig;
    diagnosisSurvey: StageConfig;
    branchingIntervention: StageConfig;
    nuclearOffer: StageConfig;
    lossVisualization: StageConfig;
    winbackSequence: StageConfig;
    voiceRecovery?: StageConfig;
  };

  // Global settings
  maxAttemptsPerCart: number;
  respectUnsubscribe: boolean;
  blackoutHours: { start: number; end: number };
}

export interface CartIntervention {
  type: CartInterventionType;
  value?: number;
  message: string;
}

export interface CartDiagnosisBranch {
  reason: CartAbandonmentReason;
  interventions: CartIntervention[];
}

// ============================================================================
// CONTENT INTERFACES
// ============================================================================

export interface InterventionContent {
  subject: string;
  headline: string;
  body: string;
  cta: string;
  offer?: CartOffer;
  triggersApplied: string[];
  recoveryUrl: string;
}

export interface CartOffer {
  type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING' | 'FREE_GIFT';
  value?: number;
  code: string;
  expiresAt: Date;
  description: string;
}

// ============================================================================
// STAGE HISTORY
// ============================================================================

export interface StageHistoryEntry {
  stage: CartSaveStage;
  enteredAt: string;
  previousStage?: CartSaveStage;
  response?: CartSaveResponseType;
  interventionId?: string;
}

// ============================================================================
// CART SAVE ATTEMPT METADATA
// ============================================================================

export interface CartSaveAttemptMetadata {
  itemCount: number;
  hasHighValueItems: boolean;
  customerLTV: number;
  diagnosisAnswer?: CartAbandonmentReason;
  offersPresented: CartOffer[];
  channelsUsed: CartSaveChannel[];
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_CART_SAVE_CONFIG: CartSaveFlowConfig = {
  stages: {
    browseReminder: {
      enabled: true,
      delayMinutes: 15,
      channel: CartSaveChannel.IN_APP,
    },
    patternInterrupt: {
      enabled: true,
      delayMinutes: 60,
      channels: [CartSaveChannel.EMAIL, CartSaveChannel.PUSH],
    },
    diagnosisSurvey: {
      enabled: true,
      delayMinutes: 180,
      channels: [CartSaveChannel.EMAIL],
    },
    branchingIntervention: {
      enabled: true,
      delayMinutes: 360,
      channels: [CartSaveChannel.EMAIL, CartSaveChannel.SMS],
      maxDiscountPercent: 15,
      freeShippingThreshold: null,
    },
    nuclearOffer: {
      enabled: true,
      delayMinutes: 1440,
      channels: [CartSaveChannel.EMAIL, CartSaveChannel.SMS],
      maxDiscountPercent: 30,
      includeGift: false,
      voiceCallEnabled: true,
      minCartValueForVoice: 100,
    },
    lossVisualization: {
      enabled: true,
      delayMinutes: 2880,
      channels: [CartSaveChannel.EMAIL],
    },
    winbackSequence: {
      enabled: true,
      delayMinutes: 4320,
      channels: [CartSaveChannel.EMAIL],
      sequenceLength: 5,
    },
  },
  maxAttemptsPerCart: 10,
  respectUnsubscribe: true,
  blackoutHours: { start: 22, end: 8 },
};

// ============================================================================
// DIAGNOSIS BRANCHES
// ============================================================================

export const DIAGNOSIS_BRANCHES: CartDiagnosisBranch[] = [
  {
    reason: CartAbandonmentReason.TOO_EXPENSIVE,
    interventions: [
      {
        type: CartInterventionType.PERCENTAGE_DISCOUNT,
        value: 10,
        message: "Here's 10% off your order",
      },
      {
        type: CartInterventionType.PAYMENT_PLAN,
        message: 'Split into 4 payments with Affirm',
      },
      {
        type: CartInterventionType.BUDGET_ALTERNATIVE,
        message: 'Try our value collection',
      },
    ],
  },
  {
    reason: CartAbandonmentReason.SHIPPING_COST,
    interventions: [
      {
        type: CartInterventionType.FREE_SHIPPING,
        message: 'Free shipping on your order!',
      },
      {
        type: CartInterventionType.THRESHOLD_REMINDER,
        value: 15,
        message: 'Add a bit more for free shipping',
      },
      {
        type: CartInterventionType.LOCAL_PICKUP,
        message: 'Free local pickup available',
      },
    ],
  },
  {
    reason: CartAbandonmentReason.NEED_MORE_INFO,
    interventions: [
      {
        type: CartInterventionType.PRODUCT_FAQ,
        message: 'Here are answers to common questions',
      },
      {
        type: CartInterventionType.REVIEWS_SHOWCASE,
        message: 'See what customers are saying',
      },
      {
        type: CartInterventionType.VIDEO_DEMO,
        message: 'Watch our product in action',
      },
      {
        type: CartInterventionType.LIVE_CHAT,
        message: 'Chat with our team now',
      },
    ],
  },
  {
    reason: CartAbandonmentReason.COMPARING_OPTIONS,
    interventions: [
      {
        type: CartInterventionType.COMPARISON_CHART,
        message: 'See how we compare',
      },
      {
        type: CartInterventionType.PRICE_MATCH,
        message: "Found it cheaper? We'll match it",
      },
      {
        type: CartInterventionType.UNIQUE_VALUE,
        message: 'Why customers choose us',
      },
    ],
  },
  {
    reason: CartAbandonmentReason.SAVING_FOR_LATER,
    interventions: [
      {
        type: CartInterventionType.WISHLIST_SAVE,
        message: 'We saved your cart for you',
      },
      {
        type: CartInterventionType.PRICE_DROP_ALERT,
        message: 'Get notified if prices drop',
      },
      {
        type: CartInterventionType.RESTOCK_ALERT,
        message: "We'll let you know if stock is low",
      },
    ],
  },
  {
    reason: CartAbandonmentReason.JUST_BROWSING,
    interventions: [
      {
        type: CartInterventionType.WISHLIST_SAVE,
        message: 'Save these items for later',
      },
      {
        type: CartInterventionType.PRICE_DROP_ALERT,
        message: 'Get notified when prices change',
      },
    ],
  },
  {
    reason: CartAbandonmentReason.PAYMENT_ISSUES,
    interventions: [
      {
        type: CartInterventionType.LIVE_CHAT,
        message: 'Need help with payment? Chat with us',
      },
      {
        type: CartInterventionType.PAYMENT_PLAN,
        message: 'Try a different payment method',
      },
    ],
  },
  {
    reason: CartAbandonmentReason.OTHER,
    interventions: [
      {
        type: CartInterventionType.LIVE_CHAT,
        message: "We're here to help",
      },
      {
        type: CartInterventionType.PERCENTAGE_DISCOUNT,
        value: 5,
        message: 'A small thank you for your time',
      },
    ],
  },
];
