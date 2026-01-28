// Smart Upsell Types
// Defines interfaces for bulk discounting, subscription upsells, and targeting

import { UpsellType, UpsellUrgency, SubscriptionFrequency } from '@prisma/client';

// =============================================================================
// BULK DISCOUNT TYPES
// =============================================================================

export interface BulkDiscountTier {
  minQuantity: number;
  maxQuantity: number | null; // null = unlimited
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'UNIT_PRICE';
  discountValue: number;
  label: string;
}

export interface ProductBulkDiscountConfig {
  productId: string;
  enabled: boolean;
  tiers: BulkDiscountTier[];
  stackWithOtherDiscounts: boolean;
  maxDiscountPercent: number;
  validFrom?: Date;
  validUntil?: Date;
}

export interface BulkPriceResult {
  unitPrice: number;
  totalPrice: number;
  discount: number;
  tier: BulkDiscountTier | null;
  savingsPercent: number;
}

export interface BulkUpsellRecommendation {
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  currentQuantity: number;
  recommendedQuantity: number;
  currentTier: BulkDiscountTier | null;
  nextTier: BulkDiscountTier;
  quantityToAdd: number;
  additionalCost: number;
  savings: number;
  savingsPercent: number;
  message: string;
}

// =============================================================================
// SUBSCRIPTION UPSELL TYPES
// =============================================================================

export interface SubscriptionDiscountTier {
  frequency: SubscriptionFrequency;
  discountPercent: number;
  label: string;
}

export interface SubscriptionEligibilityRules {
  requirePreviousPurchase: boolean;
  minOrderCount: number;
  productCategories: string[];
}

export interface ProductSubscriptionConfigData {
  productId: string;
  enabled: boolean;
  discountTiers: SubscriptionDiscountTier[];
  defaultFrequency: SubscriptionFrequency;
  freeShippingIncluded: boolean;
  eligibility: SubscriptionEligibilityRules;
}

export interface SubscriptionEligibility {
  eligible: boolean;
  reasons: string[];
  confidence: number; // 0-1
  recommendedFrequency: SubscriptionFrequency;
  recommendedDiscount: number;
  estimatedLTV: number;
}

export interface SubscriptionUpsellOffer {
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  eligibility: SubscriptionEligibility;
  discountTiers: SubscriptionDiscountTier[];
  savingsPerOrder: number;
  savingsPerYear: number;
}

// =============================================================================
// TARGETING TYPES
// =============================================================================

export enum CustomerSegment {
  // Value-based
  BUDGET_CONSCIOUS = 'BUDGET_CONSCIOUS',
  VALUE_SEEKER = 'VALUE_SEEKER',
  PREMIUM_BUYER = 'PREMIUM_BUYER',

  // Behavior-based
  FIRST_TIME_BUYER = 'FIRST_TIME_BUYER',
  REPEAT_CUSTOMER = 'REPEAT_CUSTOMER',
  LOYAL_SUBSCRIBER = 'LOYAL_SUBSCRIBER',
  LAPSED_CUSTOMER = 'LAPSED_CUSTOMER',

  // Intent-based
  BROWSER = 'BROWSER',
  QUICK_BUYER = 'QUICK_BUYER',
  RESEARCHER = 'RESEARCHER',

  // Cart-based
  SMALL_CART = 'SMALL_CART',
  MEDIUM_CART = 'MEDIUM_CART',
  LARGE_CART = 'LARGE_CART',
}

export interface UpsellConditions {
  segments?: CustomerSegment[];
  cartValueMin?: number;
  cartValueMax?: number;
  productCategories?: string[];
  hasProduct?: string[];
  excludeProduct?: string[];
  isNewCustomer?: boolean;
  hasSubscription?: boolean;
  daysSinceLastOrder?: { min?: number; max?: number };
}

export interface UpsellOffer {
  discountPercent?: number;
  freeShipping?: boolean;
  freeGift?: string;
  bonusProduct?: string;
}

export interface UpsellTargetingRuleData {
  id: string;
  name: string;
  description?: string;
  priority: number;
  enabled: boolean;
  conditions: UpsellConditions;
  upsellType: UpsellType;
  offer: UpsellOffer;
  message: string;
  urgency: UpsellUrgency;
  placements: string[];
  maxImpressions?: number;
  maxAcceptances?: number;
  validFrom?: Date;
  validUntil?: Date;
}

export interface TargetedUpsell {
  rule: UpsellTargetingRuleData;
  score: number;
  estimatedConversion: number;
  personalizedMessage: string;
  products: TargetedUpsellProduct[];
}

export interface TargetedUpsellProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity?: number;
}

// =============================================================================
// A/B TESTING TYPES
// =============================================================================

export interface UpsellVariant {
  id: string;
  name: string;
  message: string;
  offer: UpsellOffer;
  placement: string;
  design: 'MINIMAL' | 'STANDARD' | 'PROMINENT';
}

export interface ExperimentResults {
  control: VariantStats;
  variants: VariantStats[];
  winner: string | null;
  significanceAchieved: boolean;
  recommendedAction: string;
}

export interface VariantStats {
  variantId: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  revenuePerImpression: number;
  confidenceInterval: [number, number];
}

// =============================================================================
// UPSELL PLACEMENT TYPES
// =============================================================================

export type UpsellPlacement =
  | 'PRODUCT_PAGE'
  | 'CART_DRAWER'
  | 'CHECKOUT'
  | 'POST_PURCHASE'
  | 'EXIT_INTENT';

export interface UpsellPlacementConfig {
  placement: UpsellPlacement;
  enabled: boolean;
  maxUpsells: number;
  allowedTypes: UpsellType[];
  displayStyle: 'INLINE' | 'MODAL' | 'BANNER' | 'SIDEBAR' | 'CAROUSEL';
  timing?: {
    delay?: number;
    trigger?: 'IMMEDIATE' | 'SCROLL' | 'EXIT_INTENT' | 'IDLE';
  };
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface CartUpsellsResponse {
  upsells: TargetedUpsell[];
  bulkRecommendations: BulkUpsellRecommendation[];
  subscriptionOffers: SubscriptionUpsellOffer[];
}

export interface UpsellImpressionData {
  cartId: string;
  ruleId: string;
  customerId?: string;
  sessionId: string;
  placement: string;
  variant?: string;
  offer: UpsellOffer;
}

export interface UpsellAcceptanceData {
  impressionId: string;
  revenue: number;
}
