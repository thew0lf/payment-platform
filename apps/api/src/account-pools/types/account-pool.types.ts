/**
 * Account Pool Types
 * Supports grouping accounts for load balancing and failover
 */

export enum BalancingStrategy {
  WEIGHTED = 'WEIGHTED',               // Distribute by weight
  ROUND_ROBIN = 'ROUND_ROBIN',         // Even rotation
  LEAST_LOAD = 'LEAST_LOAD',           // Fewest active transactions
  CAPACITY = 'CAPACITY',               // Based on remaining limits
  LOWEST_COST = 'LOWEST_COST',         // Minimize fees
  LOWEST_LATENCY = 'LOWEST_LATENCY',   // Fastest response
  HIGHEST_SUCCESS = 'HIGHEST_SUCCESS', // Best success rate
  PRIORITY = 'PRIORITY',               // Strict priority order
}

export enum PoolStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAINING = 'draining',               // No new transactions, finish existing
}

export interface PoolMembership {
  accountId: string;
  accountName: string;                 // Denormalized for display
  providerType: string;

  // Weighting
  weight: number;                      // For weighted balancing (1-100)
  priority: number;                    // For failover order (1=first)

  // Status
  isActive: boolean;
  isPrimary: boolean;
  isBackupOnly: boolean;

  // Traffic limits
  maxPercentage?: number;              // Never exceed this % of pool traffic
  minPercentage?: number;              // Always send at least this %

  // Temporary exclusion
  excludedUntil?: Date;
  exclusionReason?: string;
}

export interface FailoverConfig {
  enabled: boolean;
  maxAttempts: number;
  failoverOrder?: string[];            // Explicit order, or use priority
  retryOnDecline: boolean;             // Retry soft declines?
  retryOnError: boolean;               // Retry on gateway errors?
  excludeOnFailure: boolean;           // Temp exclude failed accounts?
  exclusionDurationMs: number;         // How long to exclude
}

export interface HealthRoutingConfig {
  enabled: boolean;
  minSuccessRate: number;              // Min success rate to include (0-100)
  maxLatencyMs: number;                // Max latency to include
  degradedWeightMultiplier: number;    // Reduce weight if degraded (e.g., 0.5)
  excludeDown: boolean;                // Exclude down accounts entirely
}

export interface LimitRoutingConfig {
  enabled: boolean;
  warningThreshold: number;            // Alert at this % (e.g., 0.80)
  redistributeThreshold: number;       // Shift traffic at this % (e.g., 0.90)
  excludeThreshold: number;            // Exclude at this % (e.g., 0.98)
  limitType: 'daily' | 'monthly' | 'both';
}

export interface StickySessionConfig {
  enabled: boolean;
  stickyBy: 'customer' | 'card' | 'ip';
  durationMs: number;
}

export interface AccountPool {
  id: string;
  companyId: string;

  // Friendly naming
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  tags: string[];

  // Members
  accounts: PoolMembership[];

  // Strategy
  balancingStrategy: BalancingStrategy;

  // Configuration
  failover: FailoverConfig;
  healthRouting: HealthRoutingConfig;
  limitRouting: LimitRoutingConfig;
  stickySession?: StickySessionConfig;

  // Status
  status: PoolStatus;

  // Round-robin state
  lastAccountIndex: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// Selection result
export interface AccountSelection {
  accountId: string;
  accountName: string;
  providerType: string;
  selectionReason: string;
  fallbackAccountIds: string[];
  weight?: number;
  priority?: number;
}

// DTOs
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
    maxPercentage?: number;
    minPercentage?: number;
  }>;
  failover?: Partial<FailoverConfig>;
  healthRouting?: Partial<HealthRoutingConfig>;
  limitRouting?: Partial<LimitRoutingConfig>;
  stickySession?: Partial<StickySessionConfig>;
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
  limitRouting?: Partial<LimitRoutingConfig>;
  stickySession?: Partial<StickySessionConfig>;
}

export interface AddAccountToPoolDto {
  accountId: string;
  weight?: number;
  priority?: number;
  isActive?: boolean;
  isPrimary?: boolean;
  isBackupOnly?: boolean;
  maxPercentage?: number;
  minPercentage?: number;
}

export interface UpdatePoolMembershipDto {
  weight?: number;
  priority?: number;
  isActive?: boolean;
  isPrimary?: boolean;
  isBackupOnly?: boolean;
  maxPercentage?: number;
  minPercentage?: number;
}

export interface SelectAccountContext {
  transactionAmount: number;
  customerId?: string;
  cardFingerprint?: string;
  ipAddress?: string;
  excludeAccountIds?: string[];
}
