import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES - ROUTING RULES
// ═══════════════════════════════════════════════════════════════

export type RuleStatus = 'ACTIVE' | 'INACTIVE' | 'TESTING' | 'SCHEDULED' | 'EXPIRED';

export type RuleActionType =
  | 'ROUTE_TO_POOL'
  | 'ROUTE_TO_ACCOUNT'
  | 'BLOCK'
  | 'FLAG_FOR_REVIEW'
  | 'APPLY_SURCHARGE'
  | 'APPLY_DISCOUNT'
  | 'REQUIRE_3DS'
  | 'SKIP_3DS'
  | 'ADD_METADATA'
  | 'NOTIFY'
  | 'LOG_ONLY';

export interface RuleAction {
  type: RuleActionType;
  poolId?: string;
  accountId?: string;
  accountIds?: string[];
  blockReason?: string;
  blockCode?: string;
  reviewReason?: string;
  reviewPriority?: 'low' | 'medium' | 'high' | 'critical';
  surchargeType?: 'percentage' | 'flat';
  surchargeValue?: number;
  discountType?: 'percentage' | 'flat';
  discountValue?: number;
  addMetadata?: Record<string, string>;
  notifyChannels?: ('email' | 'slack' | 'webhook' | 'sms')[];
  notifyRecipients?: string[];
}

export interface RuleConditions {
  geo?: {
    countries?: string[];
    excludeCountries?: string[];
    currencies?: string[];
    domesticOnly?: boolean;
    internationalOnly?: boolean;
  };
  amount?: {
    min?: number;
    max?: number;
  };
  time?: {
    startHour?: number;
    endHour?: number;
    daysOfWeek?: number[];
    businessHoursOnly?: boolean;
  };
  customer?: {
    customerTypes?: string[];
    isNewCustomer?: boolean;
    riskLevels?: string[];
    segments?: string[];
  };
  paymentMethod?: {
    cardBrands?: string[];
    cardTypes?: string[];
    isDigitalWallet?: boolean;
    walletTypes?: string[];
  };
}

export interface RoutingRule {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  color?: string;
  tags: string[];
  status: RuleStatus;
  priority: number;
  conditions: RuleConditions;
  actions: RuleAction[];
  fallback?: {
    action: 'continue' | 'block' | 'default_pool';
    poolId?: string;
    message?: string;
  };
  matchCount: number;
  lastMatchedAt?: string;
  avgProcessingTimeMs: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateRoutingRuleDto {
  name: string;
  description?: string;
  color?: string;
  tags?: string[];
  priority?: number;
  conditions: RuleConditions;
  actions: RuleAction[];
  fallback?: RoutingRule['fallback'];
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
}

// ═══════════════════════════════════════════════════════════════
// TYPES - ACCOUNT POOLS
// ═══════════════════════════════════════════════════════════════

export type BalancingStrategy =
  | 'WEIGHTED'
  | 'ROUND_ROBIN'
  | 'LEAST_LOAD'
  | 'CAPACITY'
  | 'LOWEST_COST'
  | 'LOWEST_LATENCY'
  | 'HIGHEST_SUCCESS'
  | 'PRIORITY';

export type PoolStatus = 'active' | 'inactive' | 'draining';

export interface PoolMembership {
  accountId: string;
  accountName: string;
  providerType: string;
  weight: number;
  priority: number;
  isActive: boolean;
  isPrimary: boolean;
  isBackupOnly: boolean;
  maxPercentage?: number;
  minPercentage?: number;
  excludedUntil?: string;
  exclusionReason?: string;
}

export interface FailoverConfig {
  enabled: boolean;
  maxAttempts: number;
  failoverOrder?: string[];
  retryOnDecline: boolean;
  retryOnError: boolean;
  excludeOnFailure: boolean;
  exclusionDurationMs: number;
}

export interface HealthRoutingConfig {
  enabled: boolean;
  minSuccessRate: number;
  maxLatencyMs: number;
  degradedWeightMultiplier: number;
  excludeDown: boolean;
}

export interface AccountPool {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  tags: string[];
  accounts: PoolMembership[];
  balancingStrategy: BalancingStrategy;
  failover: FailoverConfig;
  healthRouting: HealthRoutingConfig;
  status: PoolStatus;
  lastAccountIndex: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateAccountPoolDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  tags?: string[];
  balancingStrategy: BalancingStrategy;
  accounts?: Array<{
    accountId: string;
    weight?: number;
    priority?: number;
    isActive?: boolean;
    isPrimary?: boolean;
    isBackupOnly?: boolean;
  }>;
  failover?: Partial<FailoverConfig>;
  healthRouting?: Partial<HealthRoutingConfig>;
}

export interface UpdateAccountPoolDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  tags?: string[];
  balancingStrategy?: BalancingStrategy;
  status?: PoolStatus;
  failover?: Partial<FailoverConfig>;
  healthRouting?: Partial<HealthRoutingConfig>;
}

// ═══════════════════════════════════════════════════════════════
// ROUTING RULES API CLIENT
// ═══════════════════════════════════════════════════════════════

export const routingRulesApi = {
  // List routing rules
  list: async (companyId: string, status?: RuleStatus): Promise<RoutingRule[]> => {
    const query = new URLSearchParams();
    query.set('companyId', companyId);
    if (status) query.set('status', status);
    return apiRequest.get<RoutingRule[]>(`/api/routing-rules?${query}`);
  },

  // Get routing rule by ID
  get: async (id: string): Promise<RoutingRule> => {
    return apiRequest.get<RoutingRule>(`/api/routing-rules/${id}`);
  },

  // Create routing rule
  create: async (companyId: string, dto: CreateRoutingRuleDto): Promise<RoutingRule> => {
    return apiRequest.post<RoutingRule>('/api/routing-rules', { ...dto, companyId });
  },

  // Update routing rule
  update: async (id: string, dto: UpdateRoutingRuleDto): Promise<RoutingRule> => {
    return apiRequest.patch<RoutingRule>(`/api/routing-rules/${id}`, dto);
  },

  // Delete routing rule
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/routing-rules/${id}`);
  },

  // Reorder rules
  reorder: async (companyId: string, rules: Array<{ id: string; priority: number }>): Promise<{ success: boolean }> => {
    return apiRequest.post<{ success: boolean }>('/api/routing-rules/reorder', { companyId, rules });
  },

  // Test rules
  test: async (companyId: string, context: Record<string, unknown>): Promise<Record<string, unknown>> => {
    return apiRequest.post('/api/routing-rules/test', { companyId, context });
  },
};

// ═══════════════════════════════════════════════════════════════
// ACCOUNT POOLS API CLIENT
// ═══════════════════════════════════════════════════════════════

export const accountPoolsApi = {
  // List account pools
  list: async (companyId: string): Promise<AccountPool[]> => {
    const query = new URLSearchParams();
    query.set('companyId', companyId);
    return apiRequest.get<AccountPool[]>(`/api/account-pools?${query}`);
  },

  // Get account pool by ID
  get: async (id: string): Promise<AccountPool> => {
    return apiRequest.get<AccountPool>(`/api/account-pools/${id}`);
  },

  // Create account pool
  create: async (companyId: string, dto: CreateAccountPoolDto): Promise<AccountPool> => {
    return apiRequest.post<AccountPool>('/api/account-pools', { ...dto, companyId });
  },

  // Update account pool
  update: async (id: string, dto: UpdateAccountPoolDto): Promise<AccountPool> => {
    return apiRequest.patch<AccountPool>(`/api/account-pools/${id}`, dto);
  },

  // Delete account pool
  delete: async (id: string): Promise<void> => {
    return apiRequest.delete(`/api/account-pools/${id}`);
  },

  // Add account to pool
  addAccount: async (poolId: string, accountId: string, config?: { weight?: number; priority?: number }): Promise<AccountPool> => {
    return apiRequest.post<AccountPool>(`/api/account-pools/${poolId}/accounts`, { accountId, ...config });
  },

  // Remove account from pool
  removeAccount: async (poolId: string, accountId: string): Promise<AccountPool> => {
    return apiRequest.delete<AccountPool>(`/api/account-pools/${poolId}/accounts/${accountId}`);
  },

  // Update account membership
  updateMembership: async (poolId: string, accountId: string, dto: { weight?: number; priority?: number; isActive?: boolean }): Promise<AccountPool> => {
    return apiRequest.patch<AccountPool>(`/api/account-pools/${poolId}/accounts/${accountId}`, dto);
  },
};
