/**
 * Billing & Usage Types
 * Supports subscription plans, usage tracking, and invoicing
 */

export enum PlanStatus {
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  HIDDEN = 'hidden',
}

export enum PlanType {
  DEFAULT = 'DEFAULT',   // Standard plans visible to all clients
  CUSTOM = 'CUSTOM',     // Client-specific negotiated plans
  LEGACY = 'LEGACY',     // Grandfathered plans (not available for new subscriptions)
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  PAUSED = 'paused',
  TRIALING = 'trialing',
}

export enum UsagePeriodStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  INVOICED = 'invoiced',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
}

export enum UsageEventType {
  TRANSACTION_PROCESSED = 'transaction.processed',
  TRANSACTION_APPROVED = 'transaction.approved',
  TRANSACTION_DECLINED = 'transaction.declined',
  REFUND_PROCESSED = 'refund.processed',
  CHARGEBACK_RECEIVED = 'chargeback.received',
  API_CALL = 'api.call',
  WEBHOOK_SENT = 'webhook.sent',
  MERCHANT_ACCOUNT_CREATED = 'merchant_account.created',
  COMPANY_CREATED = 'company.created',
  TEAM_MEMBER_ADDED = 'team_member.added',
  VAULT_ENTRY_CREATED = 'vault_entry.created',
  REPORT_GENERATED = 'report.generated',
}

// ═══════════════════════════════════════════════════════════════
// PRICING PLANS
// ═══════════════════════════════════════════════════════════════

export interface PlanFeatures {
  multipleProviders: boolean;
  routingRules: boolean;
  advancedRouting: boolean;
  loadBalancing: boolean;
  failover: boolean;
  basicReporting: boolean;
  advancedAnalytics: boolean;
  customReports: boolean;
  dataExport: boolean;
  tokenization: boolean;
  fraudDetection: boolean;
  threeDS: boolean;
  emailSupport: boolean;
  chatSupport: boolean;
  phoneSupport: boolean;
  dedicatedManager: boolean;
  slaGuarantee: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  customBranding: boolean;
}

export interface PricingTier {
  min: number;
  max: number | null;
  pricePerUnit: number;
  label?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  displayOrder: number;

  // Plan Type & Visibility
  planType: PlanType;
  isPublic: boolean;
  clientId?: string;              // For CUSTOM plans - which client this belongs to
  basePlanId?: string;            // For CUSTOM plans - which default plan this is based on

  // Self-service controls
  allowSelfUpgrade: boolean;      // Can clients upgrade to this plan themselves?
  allowSelfDowngrade: boolean;    // Can clients downgrade from this plan themselves?
  requiresApproval: boolean;      // Does switching to this plan require ORG approval?

  // Stripe integration
  stripeProductId?: string;
  stripePriceId?: string;         // Monthly price
  stripeAnnualPriceId?: string;   // Annual price

  // Base subscription
  billingInterval: 'monthly' | 'annual';
  basePrice: number;              // In cents
  annualPrice?: number;           // Annual price (if different from basePrice * 12)
  annualDiscount?: number;        // e.g., 0.20 = 20% off

  // Included allowances
  included: {
    transactions: number;
    volume: number;               // In cents
    merchantAccounts: number;
    companies: number;
    teamMembers: number;
    apiCalls: number;
    vaultEntries: number;
  };

  // Overage pricing
  overage: {
    transactionPrice: number;     // Cents per transaction
    volumePercent: number;        // e.g., 0.0015 = 0.15%
    merchantAccountPrice: number;
    companyPrice: number;
    teamMemberPrice: number;
    apiCallPrice: number;         // Per 1000 calls
    vaultEntryPrice: number;
  };

  // Tiered pricing
  transactionTiers?: PricingTier[];
  volumeTiers?: PricingTier[];

  // Features
  features: PlanFeatures;

  // Limits
  limits?: {
    maxMerchantAccounts?: number;
    maxCompanies?: number;
    maxTeamMembers?: number;
    maxTransactionsPerMonth?: number;
    maxVolumePerMonth?: number;
  };

  status: PlanStatus;
  effectiveDate: Date;
  sunsetDate?: Date;
}

// ═══════════════════════════════════════════════════════════════
// CLIENT SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════

export interface ClientSubscription {
  id: string;
  clientId: string;

  // Plan
  planId: string;
  planName: string;

  // Custom pricing (for Enterprise)
  customPricing?: Partial<PricingPlan['overage']>;

  // Billing cycle
  billingInterval: 'monthly' | 'annual';
  billingAnchorDay: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;

  // Payment
  paymentMethodId?: string;
  paymentProvider: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;

  // Status
  status: SubscriptionStatus;
  trialEndsAt?: Date;
  canceledAt?: Date;
  cancelReason?: string;

  // Discounts
  discountPercent?: number;
  discountReason?: string;
  discountExpiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// USAGE TRACKING
// ═══════════════════════════════════════════════════════════════

export interface UsagePeriod {
  id: string;
  clientId: string;
  subscriptionId: string;

  periodStart: Date;
  periodEnd: Date;
  status: UsagePeriodStatus;

  // Transaction usage
  usage: {
    transactionCount: number;
    transactionVolume: number;
    successfulTransactions: number;
    failedTransactions: number;
    refundCount: number;
    refundVolume: number;
    chargebackCount: number;
    chargebackVolume: number;

    // Resources
    merchantAccountCount: number;
    activeCompanyCount: number;
    teamMemberCount: number;
    apiCallCount: number;
    vaultEntryCount: number;
    webhookCount: number;
  };

  // Calculated costs
  costs: {
    calculatedAt?: Date;
    baseCost: number;
    transactionCost: number;
    volumeCost: number;
    overageCost: number;
    addonCost: number;
    discounts: number;
    totalCost: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyUsage {
  companyId: string;
  companyName: string;
  transactionCount: number;
  transactionVolume: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  avgTransactionSize: number;
}

export interface UsageEvent {
  id: string;
  clientId: string;
  companyId: string;
  usagePeriodId: string;
  eventType: UsageEventType;
  resourceType?: string;
  resourceId?: string;
  quantity: number;
  unitAmount?: number;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════
// INVOICING
// ═══════════════════════════════════════════════════════════════

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  type: 'base' | 'transaction' | 'volume' | 'overage' | 'addon' | 'discount' | 'credit';
  breakdown?: {
    tier?: string;
    unitCount?: number;
    rate?: number;
  };
}

export interface Invoice {
  id: string;
  clientId: string;
  subscriptionId: string;
  usagePeriodId?: string;

  invoiceNumber: string;

  periodStart: Date;
  periodEnd: Date;

  // Amounts (in cents)
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;

  lineItems: InvoiceLineItem[];

  status: InvoiceStatus;
  dueDate: Date;
  paidAt?: Date;

  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;
  paymentMethod?: string;

  pdfUrl?: string;
  notes?: string;

  createdAt: Date;
  sentAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

export interface CreatePricingPlanDto {
  name: string;
  displayName: string;
  description: string;
  displayOrder?: number;

  // Plan Type & Visibility (ORG-only fields)
  planType?: PlanType;            // Defaults to DEFAULT
  isPublic?: boolean;             // Defaults to true
  clientId?: string;              // Required for CUSTOM plans
  basePlanId?: string;            // For CUSTOM plans - which default plan this is based on

  // Self-service controls (ORG-only fields)
  allowSelfUpgrade?: boolean;     // Defaults to true
  allowSelfDowngrade?: boolean;   // Defaults to false
  requiresApproval?: boolean;     // Defaults to false

  // Stripe integration (ORG-only fields)
  stripeProductId?: string;
  stripePriceId?: string;
  stripeAnnualPriceId?: string;

  // Pricing
  billingInterval: 'monthly' | 'annual';
  basePrice: number;
  annualPrice?: number;
  annualDiscount?: number;
  included: PricingPlan['included'];
  overage: PricingPlan['overage'];
  transactionTiers?: PricingTier[];
  volumeTiers?: PricingTier[];
  features: PlanFeatures;
  limits?: PricingPlan['limits'];
}

export interface UpdatePricingPlanDto extends Partial<CreatePricingPlanDto> {
  status?: PlanStatus;
}

// DTO for clients to request a plan change (self-service upgrade)
export interface RequestPlanChangeDto {
  targetPlanId: string;
  billingInterval?: 'monthly' | 'annual';
}

// DTO for ORG to assign a plan to a client
export interface AssignPlanToClientDto {
  clientId: string;
  planId: string;
  billingInterval?: 'monthly' | 'annual';
  customPricing?: Partial<PricingPlan['overage']>;
  discountPercent?: number;
  discountReason?: string;
  notes?: string;
}

export interface CreateSubscriptionDto {
  planId: string;
  billingInterval?: 'monthly' | 'annual';
  billingAnchorDay?: number;
  paymentMethodId?: string;
  trialDays?: number;
  discountPercent?: number;
  discountReason?: string;
  customPricing?: Partial<PricingPlan['overage']>;
}

export interface RecordUsageEventDto {
  companyId: string;
  eventType: UsageEventType;
  quantity?: number;
  unitAmount?: number;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export interface UsageSummary {
  period: {
    start: Date;
    end: Date;
    daysRemaining: number;
  };
  usage: {
    transactions: { used: number; included: number; remaining: number };
    volume: { used: number; included: number; remaining: number };
    merchantAccounts: { used: number; included: number; remaining: number };
    companies: { used: number; included: number; remaining: number };
    teamMembers: { used: number; included: number; remaining: number };
    apiCalls: { used: number; included: number; remaining: number };
  };
  estimatedCost: {
    base: number;
    overages: number;
    total: number;
  };
  companyBreakdown: CompanyUsage[];
}
