/**
 * Routing Rule Types
 * Complete rule structure with conditions and actions
 */

export enum RuleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TESTING = 'TESTING',
  SCHEDULED = 'SCHEDULED',
  EXPIRED = 'EXPIRED',
}

export enum RuleActionType {
  ROUTE_TO_POOL = 'ROUTE_TO_POOL',
  ROUTE_TO_ACCOUNT = 'ROUTE_TO_ACCOUNT',
  BLOCK = 'BLOCK',
  FLAG_FOR_REVIEW = 'FLAG_FOR_REVIEW',
  APPLY_SURCHARGE = 'APPLY_SURCHARGE',
  APPLY_DISCOUNT = 'APPLY_DISCOUNT',
  REQUIRE_3DS = 'REQUIRE_3DS',
  SKIP_3DS = 'SKIP_3DS',
  ADD_METADATA = 'ADD_METADATA',
  NOTIFY = 'NOTIFY',
  LOG_ONLY = 'LOG_ONLY',
}

export interface RuleAction {
  type: RuleActionType;

  // Routing
  poolId?: string;
  accountId?: string;
  accountIds?: string[];

  // Blocking
  blockReason?: string;
  blockCode?: string;

  // Review
  reviewReason?: string;
  reviewPriority?: 'low' | 'medium' | 'high' | 'critical';
  reviewQueue?: string;

  // Adjustments (cents or percentage)
  surchargeType?: 'percentage' | 'flat';
  surchargeValue?: number;
  discountType?: 'percentage' | 'flat';
  discountValue?: number;

  // Metadata
  addMetadata?: Record<string, string>;

  // Notifications
  notifyChannels?: ('email' | 'slack' | 'webhook' | 'sms')[];
  notifyRecipients?: string[];
  notifyTemplate?: string;
}

export interface RuleConditions {
  geo?: GeoCondition;
  amount?: AmountCondition;
  time?: TimeCondition;
  customer?: CustomerCondition;
  product?: ProductCondition;
  paymentMethod?: PaymentMethodCondition;
  limits?: LimitCondition;
}

export interface GeoCondition {
  countries?: string[];
  excludeCountries?: string[];
  regions?: string[];
  states?: string[];
  excludeStates?: string[];
  continents?: string[];
  currencies?: string[];
  domesticOnly?: boolean;
  internationalOnly?: boolean;
  euOnly?: boolean;
  eeaOnly?: boolean;
  sanctionedCountries?: boolean;
  highRiskCountries?: boolean;
  requireIpMatch?: boolean;
  allowVpn?: boolean;
  allowProxy?: boolean;
  allowTor?: boolean;
}

export interface AmountCondition {
  min?: number;
  max?: number;
  ranges?: Array<{ min: number; max: number | null; label?: string }>;
  currencyAmounts?: Record<string, { min?: number; max?: number }>;
}

export interface TimeCondition {
  startHour?: number;
  endHour?: number;
  daysOfWeek?: number[];
  excludeDays?: number[];
  startDate?: string;
  endDate?: string;
  monthDays?: number[];
  excludeHolidays?: boolean;
  holidayCountry?: string;
  businessHoursOnly?: boolean;
  afterHoursOnly?: boolean;
  weekendOnly?: boolean;
  weekdayOnly?: boolean;
  timezone?: string;
}

export interface CustomerCondition {
  customerTypes?: string[];
  excludeCustomerTypes?: string[];
  minAccountAgeDays?: number;
  maxAccountAgeDays?: number;
  isNewCustomer?: boolean;
  minLifetimeTransactions?: number;
  maxLifetimeTransactions?: number;
  minLifetimeValue?: number;
  maxLifetimeValue?: number;
  riskLevels?: string[];
  maxRiskScore?: number;
  minRiskScore?: number;
  maxChargebackRate?: number;
  hasSuccessfulPayment?: boolean;
  hasPreviousDecline?: boolean;
  hasPreviousChargeback?: boolean;
  hasSavedPaymentMethod?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  segments?: string[];
  tags?: string[];
  customerIds?: string[];
  excludeCustomerIds?: string[];
}

export interface ProductCondition {
  skus?: string[];
  skuPatterns?: string[];
  excludeSkus?: string[];
  categories?: string[];
  categoryPaths?: string[];
  excludeCategories?: string[];
  productTypes?: string[];
  subscriptionTiers?: string[];
  subscriptionIntervals?: string[];
  isSubscription?: boolean;
  isTrialConversion?: boolean;
  isRenewal?: boolean;
  isUpgrade?: boolean;
  isDowngrade?: boolean;
  highRiskProducts?: boolean;
  attributes?: Record<string, string | string[]>;
}

export interface PaymentMethodCondition {
  cardBrands?: string[];
  excludeCardBrands?: string[];
  cardTypes?: string[];
  excludeCardTypes?: string[];
  binRanges?: Array<{ start: string; end: string }>;
  excludeBinRanges?: Array<{ start: string; end: string }>;
  issuingBanks?: string[];
  issuingCountries?: string[];
  excludeIssuingCountries?: string[];
  isTokenized?: boolean;
  isNewCard?: boolean;
  is3dsEnrolled?: boolean;
  isAch?: boolean;
  achAccountTypes?: string[];
  isDigitalWallet?: boolean;
  walletTypes?: string[];
}

export interface LimitCondition {
  dailyTransactionLimit?: number;
  weeklyTransactionLimit?: number;
  monthlyTransactionLimit?: number;
  dailyVolumeLimit?: number;
  weeklyVolumeLimit?: number;
  monthlyVolumeLimit?: number;
  perCustomerDailyLimit?: number;
  perCustomerMonthlyLimit?: number;
  perCardDailyLimit?: number;
  perCardMonthlyLimit?: number;
  velocityWindow?: number;
  velocityMaxTransactions?: number;
  velocityMaxAmount?: number;
  limitReachedAction?: 'block' | 'route_alternate' | 'flag_review' | 'notify';
}

export interface ABTestConfig {
  enabled: boolean;
  trafficPercentage: number;
  controlPoolId: string;
  testPoolId: string;
  startDate?: Date;
  endDate?: Date;
  metrics?: string[];
}

export interface RuleSchedule {
  activateAt?: Date;
  deactivateAt?: Date;
  timezone?: string;
  recurringSchedule?: string;  // Cron expression
}

export interface RoutingRule {
  id: string;
  companyId: string;

  // Friendly naming
  name: string;
  description?: string;
  color?: string;
  tags: string[];

  // Status
  status: RuleStatus;
  priority: number;

  // Conditions
  conditions: RuleConditions;

  // Actions
  actions: RuleAction[];

  // Fallback
  fallback?: {
    action: 'continue' | 'block' | 'default_pool';
    poolId?: string;
    message?: string;
  };

  // A/B Testing
  testing?: ABTestConfig;

  // Scheduling
  schedule?: RuleSchedule;

  // Analytics
  matchCount: number;
  lastMatchedAt?: Date;
  avgProcessingTimeMs: number;

  // Metadata
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// DTOs
export interface CreateRoutingRuleDto {
  name: string;
  description?: string;
  color?: string;
  tags?: string[];
  priority?: number;
  conditions: RuleConditions;
  actions: RuleAction[];
  fallback?: RoutingRule['fallback'];
  testing?: Partial<ABTestConfig>;
  schedule?: Partial<RuleSchedule>;
}

export interface UpdateRoutingRuleDto {
  name?: string;
  description?: string;
  color?: string;
  tags?: string[];
  status?: RuleStatus;
  priority?: number;
  conditions?: RuleConditions;
  actions?: RuleAction[];
  fallback?: RoutingRule['fallback'];
  testing?: Partial<ABTestConfig>;
  schedule?: Partial<RuleSchedule>;
}

// Evaluation types
export interface TransactionContext {
  amount: number;
  currency: string;

  // Customer
  customerId?: string;
  customerType?: string;
  customerEmail?: string;
  customerAccountAge?: number;
  customerLifetimeValue?: number;
  customerRiskScore?: number;
  customerSegments?: string[];

  // Geography
  billingCountry?: string;
  billingState?: string;
  shippingCountry?: string;
  ipAddress?: string;
  ipCountry?: string;

  // Product
  productSkus?: string[];
  productCategories?: string[];
  productType?: string;
  isSubscription?: boolean;
  isRenewal?: boolean;
  subscriptionTier?: string;

  // Payment method
  cardBrand?: string;
  cardType?: string;
  cardBin?: string;
  cardLast4?: string;
  isTokenized?: boolean;
  is3dsEnrolled?: boolean;
  isDigitalWallet?: boolean;
  walletType?: string;

  // Metadata
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export interface RoutingDecision {
  success: boolean;

  // Routing result
  routeToPoolId?: string;
  routeToAccountId?: string;
  fallbackAccountIds?: string[];

  // Blocking
  blocked: boolean;
  blockReason?: string;
  blockCode?: string;

  // Review
  flaggedForReview: boolean;
  reviewReason?: string;
  reviewPriority?: string;

  // Adjustments
  require3ds: boolean;
  surchargeAmount: number;
  discountAmount: number;
  finalAmount: number;

  // Metadata
  addedMetadata: Record<string, string>;

  // Applied rules
  appliedRules: Array<{ id: string; name: string; action: string }>;

  // Performance
  evaluationTimeMs: number;
  rulesEvaluated: number;
  conditionsChecked: number;
}
