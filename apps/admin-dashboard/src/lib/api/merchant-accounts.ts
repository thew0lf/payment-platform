/**
 * Merchant Accounts API Client
 * Supports multiple payment provider accounts with usage tracking and limits
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://api.dev.avnz.io:3001';

let authToken: string | null = null;

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; status: number }> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('avnz_token');
  }

  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return { data, status: response.status };
}

// Enums
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
  PAYPAL_CLASSIC = 'PAYPAL_CLASSIC',
  PAYPAL_REST = 'PAYPAL_REST',
  AUTHORIZE_NET = 'AUTHORIZE_NET',
  STRIPE = 'STRIPE',
  BRAINTREE = 'BRAINTREE',
  SQUARE = 'SQUARE',
}

// Interfaces
export interface AccountLimits {
  minTransactionAmount: number;
  maxTransactionAmount: number;
  dailyTransactionLimit?: number;
  dailyVolumeLimit?: number;
  weeklyTransactionLimit?: number;
  weeklyVolumeLimit?: number;
  monthlyTransactionLimit?: number;
  monthlyVolumeLimit?: number;
  yearlyTransactionLimit?: number;
  yearlyVolumeLimit?: number;
  velocityWindow?: number;
  velocityMaxTransactions?: number;
  velocityMaxAmount?: number;
}

export interface AccountUsage {
  todayTransactionCount: number;
  todayVolume: number;
  todaySuccessCount: number;
  todayFailureCount: number;
  weekTransactionCount: number;
  weekVolume: number;
  monthTransactionCount: number;
  monthVolume: number;
  yearTransactionCount: number;
  yearVolume: number;
  lastTransactionAt?: string;
  usageResetAt: string;
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
  lastHealthCheck?: string;
  lastError?: {
    code: string;
    message: string;
    timestamp: string;
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
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  tags: string[];
  providerType: PaymentProviderType;
  merchantId: string;
  descriptor?: string;
  descriptorPhone?: string;
  environment: 'sandbox' | 'production';
  status: AccountStatus;
  statusReason?: string;
  statusChangedAt?: string;
  limits: AccountLimits;
  currentUsage: AccountUsage;
  fees?: AccountFees;
  restrictions?: AccountRestrictions;
  routing: AccountRouting;
  health: AccountHealth;
  reserveBalance?: number;
  availableBalance?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

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

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  limitType?: string;
  currentValue?: number;
  limitValue?: number;
}

// Test Checkout Types
export interface TestCheckoutCard {
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName?: string;
}

export interface TestCheckoutRequest {
  merchantAccountId: string;
  amount: number;
  currency?: string;
  card: TestCheckoutCard;
  description?: string;
  createOrder?: boolean;
}

export interface TestCheckoutResponse {
  success: boolean;
  transactionId: string;
  orderId?: string;
  orderNumber?: string;
  transactionNumber?: string;
  amount: number;
  currency: string;
  status: string;
  environment: 'sandbox' | 'production';
  providerTransactionId?: string;
  avsResult?: string;
  cvvResult?: string;
  errorMessage?: string;
  errorCode?: string;
  processingTimeMs: number;
  createdAt: string;
}

export interface TestCard {
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  brand: string;
  description: string;
}

export interface TestCardsResponse {
  merchantAccountId: string;
  providerType: string;
  environment: 'sandbox' | 'production';
  testCards: TestCard[];
}

// API Client
export const merchantAccountsApi = {
  // List all merchant accounts
  list: (params?: {
    providerType?: PaymentProviderType;
    status?: AccountStatus;
    tags?: string[];
    isDefault?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.providerType) query.set('providerType', params.providerType);
    if (params?.status) query.set('status', params.status);
    if (params?.tags?.length) query.set('tags', params.tags.join(','));
    if (params?.isDefault !== undefined) query.set('isDefault', String(params.isDefault));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const queryStr = query.toString();
    return request<{ accounts: MerchantAccount[]; total: number }>(
      `/api/merchant-accounts${queryStr ? `?${queryStr}` : ''}`
    );
  },

  // Get single merchant account
  get: (id: string) =>
    request<MerchantAccount>(`/api/merchant-accounts/${id}`),

  // Create merchant account
  create: (data: CreateMerchantAccountDto) =>
    request<MerchantAccount>('/api/merchant-accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update merchant account
  update: (id: string, data: UpdateMerchantAccountDto) =>
    request<MerchantAccount>(`/api/merchant-accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Delete merchant account
  delete: (id: string) =>
    request<void>(`/api/merchant-accounts/${id}`, { method: 'DELETE' }),

  // Get usage statistics
  getUsage: (id: string) =>
    request<AccountUsage>(`/api/merchant-accounts/${id}/usage`),

  // Get health status
  getHealth: (id: string) =>
    request<AccountHealth>(`/api/merchant-accounts/${id}/health`),

  // Check if transaction is within limits
  checkLimits: (id: string, amount: number) =>
    request<LimitCheckResult>(`/api/merchant-accounts/${id}/check-limits`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  // Test Checkout: Get available test cards
  getTestCards: (id: string) =>
    request<TestCardsResponse>(`/api/merchant-accounts/${id}/test-cards`),

  // Test Checkout: Process test transaction
  processTestCheckout: (data: TestCheckoutRequest) =>
    request<TestCheckoutResponse>(`/api/merchant-accounts/test-checkout`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Helper functions
export function getStatusColor(status: AccountStatus): string {
  switch (status) {
    case AccountStatus.ACTIVE:
      return 'bg-green-500';
    case AccountStatus.PENDING:
      return 'bg-yellow-500';
    case AccountStatus.SUSPENDED:
    case AccountStatus.UNDER_REVIEW:
      return 'bg-orange-500';
    case AccountStatus.INACTIVE:
    case AccountStatus.CLOSED:
      return 'bg-gray-500';
    default:
      return 'bg-gray-400';
  }
}

export function getHealthColor(status: 'healthy' | 'degraded' | 'down'): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-500';
    case 'degraded':
      return 'bg-yellow-500';
    case 'down':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function calculateUsagePercentage(current: number, limit?: number): number {
  if (!limit || limit === 0) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}
