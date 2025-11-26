/**
 * Merchant Account Types
 * Supports multiple accounts per provider with individual limits, fees, and tracking
 */

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  CLOSED = 'closed',
  UNDER_REVIEW = 'under_review',
}

export enum PaymentProviderType {
  NMI = 'NMI',
  PAYFLOW = 'PAYFLOW',
  AUTHORIZE_NET = 'AUTHORIZE_NET',
  STRIPE = 'STRIPE',
  BRAINTREE = 'BRAINTREE',
  SQUARE = 'SQUARE',
}

export interface AccountLimits {
  // Per-transaction
  minTransactionAmount: number;      // In cents
  maxTransactionAmount: number;

  // Daily
  dailyTransactionLimit?: number;
  dailyVolumeLimit?: number;

  // Weekly
  weeklyTransactionLimit?: number;
  weeklyVolumeLimit?: number;

  // Monthly
  monthlyTransactionLimit?: number;
  monthlyVolumeLimit?: number;

  // Yearly
  yearlyTransactionLimit?: number;
  yearlyVolumeLimit?: number;

  // Velocity
  velocityWindow?: number;           // Minutes
  velocityMaxTransactions?: number;
  velocityMaxAmount?: number;
}

export interface AccountUsage {
  // Today
  todayTransactionCount: number;
  todayVolume: number;
  todaySuccessCount: number;
  todayFailureCount: number;

  // Week
  weekTransactionCount: number;
  weekVolume: number;

  // Month
  monthTransactionCount: number;
  monthVolume: number;

  // Year
  yearTransactionCount: number;
  yearVolume: number;

  // Meta
  lastTransactionAt?: Date;
  usageResetAt: Date;
}

export interface AccountFees {
  // Base fees
  basePercentage: number;            // e.g., 2.9 for 2.9%
  baseFlatFee: number;               // In cents

  // Card-specific
  amexPercentage?: number;
  amexFlatFee?: number;
  corporateCardPercentage?: number;

  // International
  internationalPercentage?: number;
  internationalFlatFee?: number;
  currencyConversionPercent?: number;

  // ACH
  achPercentage?: number;
  achFlatFee?: number;
  achMaxFee?: number;

  // Other
  chargebackFee: number;
  refundFee?: number;
  monthlyFee?: number;
}

export interface AccountRestrictions {
  // Geographic
  allowedCountries?: string[];
  blockedCountries?: string[];
  allowedStates?: string[];
  blockedStates?: string[];

  // Currency
  allowedCurrencies: string[];
  primaryCurrency: string;

  // Products
  allowedCategories?: string[];
  blockedCategories?: string[];
  highRiskAllowed: boolean;

  // Card types
  allowedCardBrands?: string[];
  blockedCardBrands?: string[];
  allowedCardTypes?: string[];
  blockedCardTypes?: string[];

  // Features
  achAllowed: boolean;
  recurringAllowed: boolean;
  tokenizationAllowed: boolean;
  threeDSecureRequired: boolean;
}

export interface AccountHealth {
  status: 'healthy' | 'degraded' | 'down';
  successRate: number;
  avgLatencyMs: number;
  lastHealthCheck?: Date;
  lastError?: {
    code: string;
    message: string;
    timestamp: Date;
  };
  uptimePercent: number;
}

export interface AccountRouting {
  priority: number;
  weight: number;
  isDefault: boolean;
  isBackupOnly: boolean;
  poolIds?: string[];
}

export interface MerchantAccount {
  id: string;
  companyId: string;

  // Friendly naming
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  tags: string[];

  // Provider
  providerType: PaymentProviderType;
  merchantId: string;
  descriptor?: string;
  descriptorPhone?: string;
  credentials: Record<string, unknown>;  // Encrypted
  environment: 'sandbox' | 'production';

  // Status
  status: AccountStatus;
  statusReason?: string;
  statusChangedAt?: Date;

  // Configuration
  limits: AccountLimits;
  currentUsage: AccountUsage;
  fees?: AccountFees;
  restrictions?: AccountRestrictions;
  routing: AccountRouting;
  health: AccountHealth;

  // Financial
  reserveBalance?: number;
  availableBalance?: number;

  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// DTOs
export interface CreateMerchantAccountDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  tags?: string[];
  providerType: PaymentProviderType;
  merchantId: string;
  descriptor?: string;
  credentials: Record<string, unknown>;
  environment?: 'sandbox' | 'production';
  limits?: Partial<AccountLimits>;
  fees?: Partial<AccountFees>;
  restrictions?: Partial<AccountRestrictions>;
  routing?: Partial<AccountRouting>;
}

export interface UpdateMerchantAccountDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  tags?: string[];
  descriptor?: string;
  credentials?: Record<string, unknown>;
  status?: AccountStatus;
  statusReason?: string;
  limits?: Partial<AccountLimits>;
  fees?: Partial<AccountFees>;
  restrictions?: Partial<AccountRestrictions>;
  routing?: Partial<AccountRouting>;
  notes?: string;
}

export interface MerchantAccountQuery {
  companyId?: string;
  providerType?: PaymentProviderType;
  status?: AccountStatus;
  tags?: string[];
  isDefault?: boolean;
  limit?: number;
  offset?: number;
}

export interface UsageUpdateEvent {
  accountId: string;
  transactionAmount: number;
  success: boolean;
  latencyMs: number;
}
