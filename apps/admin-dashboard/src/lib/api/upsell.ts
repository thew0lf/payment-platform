import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// BULK DISCOUNT TYPES
// ═══════════════════════════════════════════════════════════════

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'UNIT_PRICE';

export interface BulkDiscountTier {
  minQuantity: number;
  maxQuantity?: number | null;
  discountType: DiscountType;
  discountValue: number;
  label: string;
}

export interface ProductBulkDiscount {
  id: string;
  productId: string;
  companyId: string;
  enabled: boolean;
  tiers: BulkDiscountTier[];
  stackWithOtherDiscounts: boolean;
  maxDiscountPercent: number;
  validFrom?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBulkDiscountInput {
  enabled?: boolean;
  tiers: BulkDiscountTier[];
  stackWithOtherDiscounts?: boolean;
  maxDiscountPercent?: number;
  validFrom?: string;
  validUntil?: string;
}

export interface BulkPriceCalculation {
  originalPrice: number;
  originalTotal: number;
  discountedUnitPrice: number;
  discountedTotal: number;
  totalSavings: number;
  savingsPercent: number;
  appliedTier?: BulkDiscountTier;
}

export interface BulkUpsellRecommendation {
  currentQuantity: number;
  currentPrice: number;
  recommendation?: {
    targetQuantity: number;
    targetPrice: number;
    savings: number;
    savingsPercent: number;
    tier: BulkDiscountTier;
    message: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION CONFIG TYPES
// ═══════════════════════════════════════════════════════════════

export type SubscriptionFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY';

export interface SubscriptionDiscountTier {
  frequency: SubscriptionFrequency;
  discountPercent: number;
  label: string;
}

export interface SubscriptionEligibility {
  requirePreviousPurchase?: boolean;
  minOrderCount?: number;
  productCategories?: string[];
}

export interface ProductSubscriptionConfig {
  id: string;
  productId: string;
  companyId: string;
  enabled: boolean;
  discountTiers: SubscriptionDiscountTier[];
  defaultFrequency: SubscriptionFrequency;
  freeShippingIncluded: boolean;
  eligibility: SubscriptionEligibility;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionConfigInput {
  enabled?: boolean;
  discountTiers?: SubscriptionDiscountTier[];
  defaultFrequency?: SubscriptionFrequency;
  freeShippingIncluded?: boolean;
  eligibility?: SubscriptionEligibility;
}

export interface SubscriptionOffer {
  eligible: boolean;
  reason?: string;
  productId: string;
  options: {
    frequency: SubscriptionFrequency;
    label: string;
    discountPercent: number;
    finalPrice: number;
    savings: number;
    freeShipping: boolean;
  }[];
  recommendedFrequency?: SubscriptionFrequency;
  personalizedMessage?: string;
}

// ═══════════════════════════════════════════════════════════════
// UPSELL TARGETING TYPES
// ═══════════════════════════════════════════════════════════════

export type UpsellType =
  | 'BULK_DISCOUNT'
  | 'SUBSCRIPTION'
  | 'FREE_SHIPPING_ADD'
  | 'FREE_GIFT_THRESHOLD'
  | 'COMPLEMENTARY'
  | 'BUNDLE_UPGRADE'
  | 'PREMIUM_VERSION'
  | 'SHIPPING_PROTECTION'
  | 'WARRANTY'
  | 'QUANTITY_DISCOUNT';

export type UpsellUrgency = 'LOW' | 'MEDIUM' | 'HIGH';

export interface UpsellConditions {
  segments?: string[];
  cartValueMin?: number;
  cartValueMax?: number;
  productCategories?: string[];
  hasProduct?: string[];
  excludeProduct?: string[];
  isNewCustomer?: boolean;
  hasSubscription?: boolean;
}

export interface UpsellOffer {
  discountPercent?: number;
  freeShipping?: boolean;
  freeGift?: string;
  bonusProduct?: string;
}

export interface UpsellTargetingRule {
  id: string;
  companyId: string;
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
  validFrom?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTargetingRuleInput {
  name: string;
  description?: string;
  priority?: number;
  enabled?: boolean;
  conditions: UpsellConditions;
  upsellType: UpsellType;
  offer: UpsellOffer;
  message: string;
  urgency?: UpsellUrgency;
  placements: string[];
  maxImpressions?: number;
  maxAcceptances?: number;
  validFrom?: string;
  validUntil?: string;
}

export interface UpdateTargetingRuleInput extends Partial<CreateTargetingRuleInput> {}

export interface TargetedUpsell {
  ruleId: string;
  name: string;
  type: UpsellType;
  message: string;
  offer: UpsellOffer;
  urgency: UpsellUrgency;
  placement: string;
  priority: number;
}

// ═══════════════════════════════════════════════════════════════
// IMPRESSION TYPES
// ═══════════════════════════════════════════════════════════════

export interface RecordImpressionInput {
  cartId: string;
  ruleId: string;
  customerId?: string;
  sessionId: string;
  placement: string;
  variant?: string;
  offer: UpsellOffer;
}

export interface RecordAcceptanceInput {
  impressionId: string;
  revenue: number;
}

export interface RecordDeclineInput {
  impressionId: string;
}

// ═══════════════════════════════════════════════════════════════
// BULK DISCOUNT API
// ═══════════════════════════════════════════════════════════════

export const bulkDiscountApi = {
  // Get bulk discount config for a product
  get: async (productId: string): Promise<ProductBulkDiscount | null> => {
    try {
      return await apiRequest.get<ProductBulkDiscount>(`/api/products/${productId}/bulk-discount`);
    } catch {
      return null;
    }
  },

  // Create or update bulk discount config
  upsert: async (productId: string, data: CreateBulkDiscountInput): Promise<ProductBulkDiscount> => {
    return apiRequest.put<ProductBulkDiscount>(`/api/products/${productId}/bulk-discount`, data);
  },

  // Delete bulk discount config
  delete: async (productId: string): Promise<void> => {
    return apiRequest.delete(`/api/products/${productId}/bulk-discount`);
  },

  // Get bulk purchase recommendation
  getRecommendation: async (productId: string, quantity: number): Promise<BulkUpsellRecommendation> => {
    return apiRequest.get<BulkUpsellRecommendation>(
      `/api/products/${productId}/bulk-recommendation?quantity=${quantity}`
    );
  },

  // Calculate bulk pricing
  calculatePrice: async (productId: string, quantity: number): Promise<BulkPriceCalculation> => {
    return apiRequest.post<BulkPriceCalculation>('/api/products/pricing/bulk-calculate', {
      productId,
      quantity,
    });
  },
};

// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION CONFIG API
// ═══════════════════════════════════════════════════════════════

export const subscriptionConfigApi = {
  // Get subscription config for a product
  get: async (productId: string): Promise<ProductSubscriptionConfig | null> => {
    try {
      return await apiRequest.get<ProductSubscriptionConfig>(
        `/api/products/${productId}/subscription-config`
      );
    } catch {
      return null;
    }
  },

  // Create or update subscription config
  upsert: async (
    productId: string,
    data: CreateSubscriptionConfigInput
  ): Promise<ProductSubscriptionConfig> => {
    return apiRequest.put<ProductSubscriptionConfig>(
      `/api/products/${productId}/subscription-config`,
      data
    );
  },

  // Check subscription eligibility
  checkEligibility: async (
    productId: string,
    companyId: string,
    customerId?: string
  ): Promise<{ eligible: boolean; reason?: string; scores?: Record<string, number> }> => {
    const params = new URLSearchParams({ companyId });
    if (customerId) params.set('customerId', customerId);
    return apiRequest.get(`/api/upsell/subscription-eligibility/${productId}?${params}`);
  },

  // Get subscription offer
  getOffer: async (
    productId: string,
    companyId: string,
    customerId?: string
  ): Promise<SubscriptionOffer> => {
    const params = new URLSearchParams({ companyId });
    if (customerId) params.set('customerId', customerId);
    return apiRequest.get<SubscriptionOffer>(`/api/upsell/subscription-offer/${productId}?${params}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// UPSELL TARGETING API
// ═══════════════════════════════════════════════════════════════

export const upsellTargetingApi = {
  // Get all targeting rules
  listRules: async (): Promise<UpsellTargetingRule[]> => {
    return apiRequest.get<UpsellTargetingRule[]>('/api/upsell/rules');
  },

  // Create a targeting rule
  createRule: async (data: CreateTargetingRuleInput): Promise<UpsellTargetingRule> => {
    return apiRequest.post<UpsellTargetingRule>('/api/upsell/rules', data);
  },

  // Update a targeting rule
  updateRule: async (ruleId: string, data: UpdateTargetingRuleInput): Promise<UpsellTargetingRule> => {
    return apiRequest.put<UpsellTargetingRule>(`/api/upsell/rules/${ruleId}`, data);
  },

  // Delete a targeting rule
  deleteRule: async (ruleId: string): Promise<void> => {
    return apiRequest.delete(`/api/upsell/rules/${ruleId}`);
  },

  // Get upsells for a cart
  getCartUpsells: async (
    cartId: string,
    options?: { maxUpsells?: number; placements?: string[] }
  ): Promise<{ upsells: TargetedUpsell[] }> => {
    const params = new URLSearchParams();
    if (options?.maxUpsells) params.set('maxUpsells', String(options.maxUpsells));
    if (options?.placements) params.set('placements', options.placements.join(','));
    return apiRequest.get<{ upsells: TargetedUpsell[] }>(`/api/upsell/cart/${cartId}?${params}`);
  },

  // Record an impression
  recordImpression: async (data: RecordImpressionInput): Promise<{ impressionId: string }> => {
    return apiRequest.post<{ impressionId: string }>('/api/upsell/impressions', data);
  },

  // Record acceptance
  recordAcceptance: async (data: RecordAcceptanceInput): Promise<{ success: boolean }> => {
    return apiRequest.post<{ success: boolean }>('/api/upsell/impressions/accept', data);
  },

  // Record decline
  recordDecline: async (data: RecordDeclineInput): Promise<{ success: boolean }> => {
    return apiRequest.post<{ success: boolean }>('/api/upsell/impressions/decline', data);
  },
};

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const UPSELL_TYPES = [
  { value: 'BULK_DISCOUNT', label: 'Bulk Discount', description: 'Encourage larger quantity purchases' },
  { value: 'SUBSCRIPTION', label: 'Subscribe & Save', description: 'Convert to recurring subscription' },
  { value: 'FREE_SHIPPING_ADD', label: 'Free Shipping Add-on', description: 'Add items to qualify for free shipping' },
  { value: 'FREE_GIFT_THRESHOLD', label: 'Free Gift', description: 'Offer a free gift at spend threshold' },
  { value: 'COMPLEMENTARY', label: 'Complementary Product', description: 'Suggest related products' },
  { value: 'BUNDLE_UPGRADE', label: 'Bundle Upgrade', description: 'Upgrade to a bundle deal' },
  { value: 'PREMIUM_VERSION', label: 'Premium Version', description: 'Upgrade to premium product' },
  { value: 'SHIPPING_PROTECTION', label: 'Shipping Protection', description: 'Add shipping insurance' },
  { value: 'WARRANTY', label: 'Extended Warranty', description: 'Add extended warranty' },
  { value: 'QUANTITY_DISCOUNT', label: 'Quantity Discount', description: 'Save with additional units' },
] as const;

export const UPSELL_URGENCY_LEVELS = [
  { value: 'LOW', label: 'Low', description: 'Subtle suggestion' },
  { value: 'MEDIUM', label: 'Medium', description: 'Standard visibility' },
  { value: 'HIGH', label: 'High', description: 'Prominent with urgency indicators' },
] as const;

export const UPSELL_PLACEMENTS = [
  { value: 'CART_DRAWER', label: 'Cart Drawer' },
  { value: 'CART_PAGE', label: 'Cart Page' },
  { value: 'CHECKOUT', label: 'Checkout' },
  { value: 'PRODUCT_PAGE', label: 'Product Page' },
  { value: 'ORDER_CONFIRMATION', label: 'Order Confirmation' },
  { value: 'POST_PURCHASE', label: 'Post-Purchase' },
] as const;

export const SUBSCRIPTION_FREQUENCIES = [
  { value: 'WEEKLY', label: 'Every Week' },
  { value: 'BIWEEKLY', label: 'Every 2 Weeks' },
  { value: 'MONTHLY', label: 'Every Month' },
  { value: 'BIMONTHLY', label: 'Every 2 Months' },
  { value: 'QUARTERLY', label: 'Every 3 Months' },
] as const;

export const CUSTOMER_SEGMENTS = [
  { value: 'NEW_VISITOR', label: 'New Visitor' },
  { value: 'RETURNING_VISITOR', label: 'Returning Visitor' },
  { value: 'FIRST_TIME_BUYER', label: 'First-Time Buyer' },
  { value: 'REPEAT_CUSTOMER', label: 'Repeat Customer' },
  { value: 'VIP_CUSTOMER', label: 'VIP Customer' },
  { value: 'AT_RISK_CHURN', label: 'At-Risk of Churn' },
  { value: 'WINBACK_TARGET', label: 'Winback Target' },
  { value: 'BUDGET_CONSCIOUS', label: 'Budget-Conscious' },
  { value: 'PREMIUM_BUYER', label: 'Premium Buyer' },
  { value: 'BULK_BUYER', label: 'Bulk Buyer' },
  { value: 'SUBSCRIPTION_READY', label: 'Subscription-Ready' },
  { value: 'GIFT_BUYER', label: 'Gift Buyer' },
] as const;
