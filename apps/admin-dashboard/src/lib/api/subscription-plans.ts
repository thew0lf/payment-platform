/**
 * Subscription Plans API Client
 * Handles CRUD operations for subscription plan templates
 */

import { apiClient } from '../api';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export enum SubscriptionPlanScope {
  ORGANIZATION = 'ORGANIZATION',
  CLIENT = 'CLIENT',
  COMPANY = 'COMPANY',
}

export enum SubscriptionPlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DEPRECATED = 'DEPRECATED',
}

export enum TrialStartTrigger {
  ON_PURCHASE = 'ON_PURCHASE',
  ON_SHIPMENT = 'ON_SHIPMENT',
  ON_DELIVERY = 'ON_DELIVERY',
  MANUAL = 'MANUAL',
}

export enum TrialReturnAction {
  EXTEND_TRIAL = 'EXTEND_TRIAL',
  CANCEL = 'CANCEL',
  CONVERT_ANYWAY = 'CONVERT_ANYWAY',
  PAUSE_ALERT = 'PAUSE_ALERT',
}

export enum PartialShipmentAction {
  PROCEED = 'PROCEED',
  WAIT_FULL = 'WAIT_FULL',
  PRORATE = 'PRORATE',
}

export enum BackorderAction {
  DELAY_CHARGE = 'DELAY_CHARGE',
  CHARGE_ANYWAY = 'CHARGE_ANYWAY',
  SKIP_ITEM = 'SKIP_ITEM',
  PAUSE_SUBSCRIPTION = 'PAUSE_SUBSCRIPTION',
}

export enum ShippingCostAction {
  ABSORB_COST = 'ABSORB_COST',
  CHARGE_CUSTOMER = 'CHARGE_CUSTOMER',
  SPLIT_COST = 'SPLIT_COST',
}

export enum GiftDurationType {
  ONGOING = 'ONGOING',
  FIXED = 'FIXED',
  UNTIL_CANCELLED = 'UNTIL_CANCELLED',
}

export enum SubscriptionBundleType {
  FIXED = 'FIXED',
  FLEXIBLE = 'FLEXIBLE',
  BUILD_YOUR_OWN = 'BUILD_YOUR_OWN',
}

export enum BillingInterval {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LoyaltyTier {
  afterRebills: number;
  discountPct: number;
}

export interface SubscriptionPlan {
  id: string;
  scope: SubscriptionPlanScope;
  organizationId: string | null;
  clientId: string | null;
  companyId: string | null;

  // Identification
  name: string;
  displayName: string;
  description: string | null;
  shortDescription: string | null;

  // Pricing
  basePriceMonthly: number;
  basePriceAnnual: number | null;
  annualDiscountPct: number | null;
  currency: string;

  // Billing
  availableIntervals: BillingInterval[];
  defaultInterval: BillingInterval;

  // Trial
  trialEnabled: boolean;
  trialDays: number | null;
  trialIncludesShipment: boolean;
  trialStartTrigger: TrialStartTrigger;
  trialConversionTrigger: TrialStartTrigger;
  trialWaitForDelivery: boolean;
  trialExtendDaysPostDelivery: number | null;
  trialNoTrackingFallbackDays: number | null;
  trialReturnAction: TrialReturnAction;
  trialReturnExtendDays: number | null;

  // Recurring
  recurringEnabled: boolean;
  recurringIntervalDays: number | null;
  recurringIncludesShipment: boolean;
  recurringTrigger: TrialStartTrigger;
  recurringWaitForDelivery: boolean;
  recurringExtendDaysPostDelivery: number | null;

  // Shipment-aware billing
  partialShipmentAction: PartialShipmentAction;
  backorderAction: BackorderAction;
  shippingCostAction: ShippingCostAction;
  gracePeriodDays: number | null;

  // Pause & Skip
  pauseEnabled: boolean;
  pauseMaxDuration: number | null;
  skipEnabled: boolean;
  skipMaxPerYear: number | null;

  // Quantity
  includedQuantity: number;
  maxQuantity: number | null;
  quantityChangeProrate: boolean;

  // Loyalty
  loyaltyEnabled: boolean;
  loyaltyTiers: LoyaltyTier[] | null;
  loyaltyStackable: boolean;

  // Price lock & early renewal
  priceLockEnabled: boolean;
  priceLockCycles: number | null;
  earlyRenewalEnabled: boolean;
  earlyRenewalProrate: boolean;

  // Retention
  downsellPlanId: string | null;
  winbackEnabled: boolean;
  winbackDiscountPct: number | null;
  winbackTrialDays: number | null;

  // Gifting
  giftingEnabled: boolean;
  giftDurationDefault: GiftDurationType;
  giftFixedCycles: number | null;

  // Bundle
  bundleType: SubscriptionBundleType | null;
  bundleMinProducts: number | null;
  bundleMaxProducts: number | null;

  // Notifications
  notifyRenewalEnabled: boolean;
  notifyRenewalDaysBefore: number | null;

  // Display
  sortOrder: number;
  isPublic: boolean;
  isFeatured: boolean;
  badgeText: string | null;
  features: string[];

  // Metadata
  metadata: Record<string, unknown>;

  // Status
  status: SubscriptionPlanStatus;
  publishedAt: string | null;
  archivedAt: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;

  // Soft delete
  deletedAt: string | null;
  deletedBy: string | null;

  // Relations
  downsellPlan?: SubscriptionPlan | null;
  productPlansCount?: number;
}

export interface ProductSubscriptionPlan {
  id: string;
  productId: string;
  planId: string;
  overridePriceMonthly: number | null;
  overridePriceAnnual: number | null;
  overrideTrialDays: number | null;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  plan?: SubscriptionPlan;
}

export interface SubscriptionPlanStats {
  totalPlans: number;
  activePlans: number;
  draftPlans: number;
  archivedPlans: number;
  byScope: {
    scope: SubscriptionPlanScope;
    count: number;
  }[];
  totalProductAssignments: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateSubscriptionPlanDto {
  scope: SubscriptionPlanScope;
  organizationId?: string;
  clientId?: string;
  companyId?: string;
  name: string;
  displayName: string;
  description?: string;
  shortDescription?: string;
  basePriceMonthly: number;
  basePriceAnnual?: number;
  annualDiscountPct?: number;
  currency?: string;
  availableIntervals?: BillingInterval[];
  defaultInterval?: BillingInterval;

  // Trial
  trialEnabled?: boolean;
  trialDays?: number;
  trialIncludesShipment?: boolean;
  trialStartTrigger?: TrialStartTrigger;
  trialConversionTrigger?: TrialStartTrigger;
  trialWaitForDelivery?: boolean;
  trialExtendDaysPostDelivery?: number;
  trialNoTrackingFallbackDays?: number;
  trialReturnAction?: TrialReturnAction;
  trialReturnExtendDays?: number;

  // Recurring
  recurringEnabled?: boolean;
  recurringIntervalDays?: number;
  recurringIncludesShipment?: boolean;
  recurringTrigger?: TrialStartTrigger;
  recurringWaitForDelivery?: boolean;
  recurringExtendDaysPostDelivery?: number;

  // Shipment
  partialShipmentAction?: PartialShipmentAction;
  backorderAction?: BackorderAction;
  shippingCostAction?: ShippingCostAction;
  gracePeriodDays?: number;

  // Pause & Skip
  pauseEnabled?: boolean;
  pauseMaxDuration?: number;
  skipEnabled?: boolean;
  skipMaxPerYear?: number;

  // Quantity
  includedQuantity?: number;
  maxQuantity?: number;
  quantityChangeProrate?: boolean;

  // Loyalty
  loyaltyEnabled?: boolean;
  loyaltyTiers?: LoyaltyTier[];
  loyaltyStackable?: boolean;

  // Price lock & early renewal
  priceLockEnabled?: boolean;
  priceLockCycles?: number;
  earlyRenewalEnabled?: boolean;
  earlyRenewalProrate?: boolean;

  // Retention
  downsellPlanId?: string;
  winbackEnabled?: boolean;
  winbackDiscountPct?: number;
  winbackTrialDays?: number;

  // Gifting
  giftingEnabled?: boolean;
  giftDurationDefault?: GiftDurationType;
  giftFixedCycles?: number;

  // Bundle
  bundleType?: SubscriptionBundleType;
  bundleMinProducts?: number;
  bundleMaxProducts?: number;

  // Notifications
  notifyRenewalEnabled?: boolean;
  notifyRenewalDaysBefore?: number;

  // Display
  sortOrder?: number;
  isPublic?: boolean;
  isFeatured?: boolean;
  badgeText?: string;
  features?: string[];

  metadata?: Record<string, unknown>;
}

export type UpdateSubscriptionPlanDto = Partial<CreateSubscriptionPlanDto> & {
  status?: SubscriptionPlanStatus;
};

export interface SubscriptionPlanQuery {
  scope?: SubscriptionPlanScope;
  organizationId?: string;
  clientId?: string;
  companyId?: string;
  status?: SubscriptionPlanStatus;
  search?: string;
  isPublic?: boolean;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface AttachPlanToProductDto {
  productId: string;
  planId: string;
  overridePriceMonthly?: number;
  overridePriceAnnual?: number;
  overrideTrialDays?: number;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface UpdateProductPlanDto {
  overridePriceMonthly?: number;
  overridePriceAnnual?: number;
  overrideTrialDays?: number;
  isDefault?: boolean;
  sortOrder?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export const subscriptionPlansApi = {
  // ─────────────────────────────────────────────────────────────────────────────
  // PLAN QUERIES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all subscription plans with filtering
   */
  async getPlans(query?: SubscriptionPlanQuery): Promise<{
    plans: SubscriptionPlan[];
    total: number;
  }> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return apiClient.get<{ plans: SubscriptionPlan[]; total: number }>(
      `/api/subscription-plans${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get plans available for a specific company (includes org/client plans)
   */
  async getAvailablePlans(companyId: string): Promise<SubscriptionPlan[]> {
    return apiClient.get<SubscriptionPlan[]>(
      `/api/subscription-plans/available/${companyId}`
    );
  },

  /**
   * Get subscription plan statistics
   */
  async getStats(
    scope?: SubscriptionPlanScope,
    scopeId?: string
  ): Promise<SubscriptionPlanStats> {
    const params = new URLSearchParams();
    if (scope) params.append('scope', scope);
    if (scopeId) params.append('scopeId', scopeId);
    const queryString = params.toString();
    return apiClient.get<SubscriptionPlanStats>(
      `/api/subscription-plans/stats${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Get plans attached to a product
   */
  async getProductPlans(productId: string): Promise<ProductSubscriptionPlan[]> {
    return apiClient.get<ProductSubscriptionPlan[]>(
      `/api/subscription-plans/product/${productId}`
    );
  },

  /**
   * Get a single plan by ID
   */
  async getPlan(id: string): Promise<SubscriptionPlan> {
    return apiClient.get<SubscriptionPlan>(`/api/subscription-plans/${id}`);
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PLAN MUTATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new subscription plan
   */
  async createPlan(data: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    return apiClient.post<SubscriptionPlan>('/api/subscription-plans', data);
  },

  /**
   * Update a subscription plan
   */
  async updatePlan(
    id: string,
    data: UpdateSubscriptionPlanDto
  ): Promise<SubscriptionPlan> {
    return apiClient.patch<SubscriptionPlan>(`/api/subscription-plans/${id}`, data);
  },

  /**
   * Publish a draft plan (make it active)
   */
  async publishPlan(id: string): Promise<SubscriptionPlan> {
    return apiClient.post<SubscriptionPlan>(
      `/api/subscription-plans/${id}/publish`,
      {}
    );
  },

  /**
   * Archive a plan
   */
  async archivePlan(id: string): Promise<SubscriptionPlan> {
    return apiClient.post<SubscriptionPlan>(
      `/api/subscription-plans/${id}/archive`,
      {}
    );
  },

  /**
   * Duplicate a plan
   */
  async duplicatePlan(id: string, newName: string): Promise<SubscriptionPlan> {
    return apiClient.post<SubscriptionPlan>(
      `/api/subscription-plans/${id}/duplicate`,
      { newName }
    );
  },

  /**
   * Delete a subscription plan
   */
  async deletePlan(id: string): Promise<void> {
    return apiClient.delete(`/api/subscription-plans/${id}`);
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PRODUCT-PLAN ASSIGNMENTS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Attach a plan to a product
   */
  async attachToProduct(
    data: AttachPlanToProductDto
  ): Promise<ProductSubscriptionPlan> {
    return apiClient.post<ProductSubscriptionPlan>(
      '/api/subscription-plans/products/attach',
      data
    );
  },

  /**
   * Update a product-plan assignment
   */
  async updateProductPlan(
    productId: string,
    planId: string,
    data: UpdateProductPlanDto
  ): Promise<ProductSubscriptionPlan> {
    return apiClient.patch<ProductSubscriptionPlan>(
      `/api/subscription-plans/products/${productId}/${planId}`,
      data
    );
  },

  /**
   * Detach a plan from a product
   */
  async detachFromProduct(productId: string, planId: string): Promise<void> {
    return apiClient.delete(
      `/api/subscription-plans/products/${productId}/${planId}`
    );
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format currency amount to display string
 */
export function formatPlanPrice(
  amount: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get status badge color
 */
export function getPlanStatusColor(status: SubscriptionPlanStatus): string {
  switch (status) {
    case SubscriptionPlanStatus.ACTIVE:
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case SubscriptionPlanStatus.DRAFT:
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case SubscriptionPlanStatus.ARCHIVED:
      return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    case SubscriptionPlanStatus.DEPRECATED:
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
  }
}

/**
 * Get scope badge color
 */
export function getScopeColor(scope: SubscriptionPlanScope): string {
  switch (scope) {
    case SubscriptionPlanScope.ORGANIZATION:
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case SubscriptionPlanScope.CLIENT:
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case SubscriptionPlanScope.COMPANY:
      return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
  }
}

/**
 * Format billing interval for display
 */
export function formatInterval(interval: BillingInterval): string {
  switch (interval) {
    case BillingInterval.DAILY:
      return 'Daily';
    case BillingInterval.WEEKLY:
      return 'Weekly';
    case BillingInterval.BIWEEKLY:
      return 'Bi-weekly';
    case BillingInterval.MONTHLY:
      return 'Monthly';
    case BillingInterval.QUARTERLY:
      return 'Quarterly';
    case BillingInterval.YEARLY:
      return 'Yearly';
    default:
      return interval;
  }
}

/**
 * Get trial trigger display name
 */
export function formatTrialTrigger(trigger: TrialStartTrigger): string {
  switch (trigger) {
    case TrialStartTrigger.ON_PURCHASE:
      return 'On Purchase';
    case TrialStartTrigger.ON_SHIPMENT:
      return 'On Shipment';
    case TrialStartTrigger.ON_DELIVERY:
      return 'On Delivery';
    case TrialStartTrigger.MANUAL:
      return 'Manual';
    default:
      return trigger;
  }
}
