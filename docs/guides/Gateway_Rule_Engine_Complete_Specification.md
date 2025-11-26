# Gateway Rule Engine & Billing System - Complete Specification

## Document Information
- **Version:** 1.0
- **Date:** November 26, 2024
- **Project:** avnz.io Payment Orchestration Platform
- **Status:** Approved for Development

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Multi-Account Provider Model](#multi-account-provider-model)
4. [Account Pools & Load Balancing](#account-pools--load-balancing)
5. [Gateway Rule Engine (GRE)](#gateway-rule-engine-gre)
6. [Routing Conditions](#routing-conditions)
7. [Billing & Usage Tracking](#billing--usage-tracking)
8. [Data Models](#data-models)
9. [API Specifications](#api-specifications)
10. [Dashboard Requirements](#dashboard-requirements)

---

## Executive Summary

This document specifies the complete Gateway Rule Engine (GRE) and Billing System for the avnz.io payment orchestration platform. The system enables:

- **Multi-Account Management:** Multiple merchant accounts per payment provider (e.g., 4 NMI accounts, 2 PayPal accounts)
- **Intelligent Routing:** Route transactions based on geography, product, amount, time, customer attributes, and more
- **Load Balancing:** Weighted, round-robin, capacity-based, and cost-optimized distribution across accounts
- **Usage Tracking:** Meter and bill clients based on transaction count, volume, and resource usage
- **Multi-Tenant Billing:** Track usage at Client → Company → Account granularity

---

## Architecture Overview

### Platform Hierarchy

```
ORGANIZATION (avnz.io)
├── Sets platform-wide pricing tiers
├── Tracks total platform revenue
│
└── CLIENT (Agency) ← BILLABLE ENTITY
    ├── Subscription Plan
    ├── Usage Metering
    ├── Billing & Invoices
    │
    └── COMPANY (Agency's Customer) ← USAGE TRACKING
        ├── Transaction Metrics
        ├── Merchant Accounts (owned or assigned)
        │
        └── MERCHANT ACCOUNT ← PROCESSING ENTITY
            ├── Provider Type (NMI, PayPal, etc.)
            ├── Credentials & Limits
            └── Real-time Usage Tracking
```

### Core Components

| Component | Purpose |
|-----------|---------|
| **Merchant Account** | Individual processor account with credentials, limits, fees |
| **Account Pool** | Group of accounts for load balancing and failover |
| **Routing Rule** | Conditions and actions for transaction routing |
| **Rule Engine** | Evaluates rules and makes routing decisions |
| **Usage Tracker** | Real-time metering of transactions and resources |
| **Billing System** | Subscription management, invoicing, payments |

---

## Multi-Account Provider Model

### Concept

Each payment provider type (NMI, PayPal Payflow, Authorize.Net) can have **multiple merchant accounts**, each with its own:

- Credentials (API keys, MIDs)
- Daily/Monthly/Yearly limits
- Fee structures
- Product restrictions
- Geographic restrictions

### Merchant Account Schema

```typescript
interface MerchantAccount {
  // ═══════════════════════════════════════════════════════════════
  // IDENTITY
  // ═══════════════════════════════════════════════════════════════
  id: string;                          // "ma_01H8X9ABC123"
  companyId: string;                   // Owner company
  
  // ═══════════════════════════════════════════════════════════════
  // FRIENDLY NAMING
  // ═══════════════════════════════════════════════════════════════
  name: string;                        // "Coffee Main" ← USER DEFINED
  description?: string;                // "Primary account for coffee subscriptions"
  color?: string;                      // "#10B981" for UI badges
  icon?: string;                       // "coffee" | "globe" | "shield"
  tags?: string[];                     // ["primary", "usd", "subscriptions"]
  
  // ═══════════════════════════════════════════════════════════════
  // PROVIDER CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  providerType: PaymentProviderType;   // NMI, PAYFLOW, AUTHORIZE_NET, etc.
  merchantId: string;                  // MID from processor
  descriptor?: string;                 // Statement descriptor
  descriptorPhone?: string;            // Customer service phone
  credentials: EncryptedCredentials;   // Encrypted API credentials
  environment: 'sandbox' | 'production';
  
  // ═══════════════════════════════════════════════════════════════
  // STATUS
  // ═══════════════════════════════════════════════════════════════
  status: AccountStatus;               // active, inactive, suspended, pending, closed
  statusReason?: string;
  statusChangedAt?: Date;
  
  // ═══════════════════════════════════════════════════════════════
  // TRANSACTION LIMITS
  // ═══════════════════════════════════════════════════════════════
  limits: {
    // Per-transaction
    minTransactionAmount: number;      // In cents (e.g., 100 = $1.00)
    maxTransactionAmount: number;      // In cents (e.g., 1000000 = $10,000)
    
    // Daily limits
    dailyTransactionLimit: number;     // Max transactions per day
    dailyVolumeLimit: number;          // Max volume per day (cents)
    
    // Weekly limits
    weeklyTransactionLimit?: number;
    weeklyVolumeLimit?: number;
    
    // Monthly limits
    monthlyTransactionLimit: number;
    monthlyVolumeLimit: number;
    
    // Yearly limits
    yearlyTransactionLimit?: number;
    yearlyVolumeLimit: number;
    
    // Velocity limits
    velocityWindow?: number;           // Minutes
    velocityMaxTransactions?: number;
    velocityMaxAmount?: number;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // CURRENT USAGE (Real-time tracking)
  // ═══════════════════════════════════════════════════════════════
  currentUsage: {
    // Today
    todayTransactionCount: number;
    todayVolume: number;
    todaySuccessCount: number;
    todayFailureCount: number;
    
    // This week
    weekTransactionCount: number;
    weekVolume: number;
    
    // This month
    monthTransactionCount: number;
    monthVolume: number;
    
    // This year
    yearTransactionCount: number;
    yearVolume: number;
    
    // Last updated
    lastTransactionAt?: Date;
    usageResetAt: Date;                // When daily counters reset
  };
  
  // ═══════════════════════════════════════════════════════════════
  // FEE STRUCTURE
  // ═══════════════════════════════════════════════════════════════
  fees: {
    // Base fees
    basePercentage: number;            // e.g., 2.9 for 2.9%
    baseFlatFee: number;               // In cents (e.g., 30 = $0.30)
    
    // Card-specific fees
    amexPercentage?: number;
    amexFlatFee?: number;
    corporateCardPercentage?: number;
    
    // International fees
    internationalPercentage?: number;
    internationalFlatFee?: number;
    currencyConversionPercent?: number;
    
    // ACH/Bank fees
    achPercentage?: number;
    achFlatFee?: number;
    achMaxFee?: number;
    
    // Other fees
    chargebackFee: number;
    refundFee?: number;
    retrievalFee?: number;
    monthlyFee?: number;
    pciFee?: number;
    gatewayFee?: number;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // RESTRICTIONS
  // ═══════════════════════════════════════════════════════════════
  restrictions: {
    // Geographic
    allowedCountries?: string[];       // ISO country codes
    blockedCountries?: string[];
    allowedStates?: string[];
    blockedStates?: string[];
    
    // Currency
    allowedCurrencies: string[];       // ['USD', 'CAD']
    primaryCurrency: string;
    
    // Products
    allowedCategories?: string[];
    blockedCategories?: string[];
    highRiskAllowed: boolean;
    
    // Card types
    allowedCardBrands?: string[];      // ['VISA', 'MASTERCARD']
    blockedCardBrands?: string[];
    allowedCardTypes?: string[];       // ['credit', 'debit']
    blockedCardTypes?: string[];       // ['prepaid']
    
    // Features
    achAllowed: boolean;
    recurringAllowed: boolean;
    tokenizationAllowed: boolean;
    threeDSecureRequired: boolean;
    level2DataRequired: boolean;
    level3DataRequired: boolean;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // ROUTING CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  routing: {
    priority: number;                  // Lower = higher priority (1-999)
    weight: number;                    // For weighted load balancing (1-100)
    isDefault: boolean;                // Default account for company
    isBackupOnly: boolean;             // Only use as failover
    poolIds?: string[];                // Pools this account belongs to
  };
  
  // ═══════════════════════════════════════════════════════════════
  // HEALTH & PERFORMANCE
  // ═══════════════════════════════════════════════════════════════
  health: {
    status: 'healthy' | 'degraded' | 'down';
    successRate: number;               // 0-100
    avgLatencyMs: number;
    lastHealthCheck: Date;
    lastError?: {
      code: string;
      message: string;
      timestamp: Date;
    };
    uptimePercent: number;             // Last 30 days
  };
  
  // ═══════════════════════════════════════════════════════════════
  // FINANCIAL TRACKING
  // ═══════════════════════════════════════════════════════════════
  financials?: {
    reserveBalance?: number;           // Held by processor
    availableBalance?: number;
    pendingBalance?: number;
    lastPayoutDate?: Date;
    lastPayoutAmount?: number;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  notes?: string;
}

// Provider types supported
enum PaymentProviderType {
  NMI = 'NMI',
  PAYFLOW = 'PAYFLOW',
  AUTHORIZE_NET = 'AUTHORIZE_NET',
  STRIPE = 'STRIPE',
  BRAINTREE = 'BRAINTREE',
  SQUARE = 'SQUARE',
  ADYEN = 'ADYEN',
  WORLDPAY = 'WORLDPAY',
}

enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  CLOSED = 'closed',
  UNDER_REVIEW = 'under_review',
}
```

### Example Merchant Accounts

```yaml
# Example: Coffee subscription business with multiple accounts

NMI Gateway:
  - name: "Coffee Main"
    merchantId: "MID_12345"
    monthlyLimit: $50,000
    usage: Primary USD processing
    
  - name: "Coffee Backup"
    merchantId: "MID_12346"
    monthlyLimit: $50,000
    usage: Overflow when main hits limits
    
  - name: "High-Risk Supplements"
    merchantId: "MID_67890"
    monthlyLimit: $25,000
    usage: Nutraceutical products (higher rates)
    
  - name: "Trial Conversions"
    merchantId: "MID_11111"
    monthlyLimit: $15,000
    usage: Trial-to-paid conversions (higher chargeback tolerance)

PayPal Payflow:
  - name: "International EUR"
    merchantId: "PAYPAL_EU_001"
    currencies: [EUR]
    usage: European customers
    
  - name: "International GBP"
    merchantId: "PAYPAL_UK_001"
    currencies: [GBP]
    usage: UK customers

Authorize.Net:
  - name: "Enterprise Clients"
    merchantId: "AUTHNET_ENT_001"
    monthlyLimit: $500,000
    usage: High-volume enterprise accounts
```

---

## Account Pools & Load Balancing

### Concept

Account Pools group multiple merchant accounts for:
- **Load Distribution:** Spread transactions across accounts
- **Failover:** Automatic routing when account fails or hits limits
- **Optimization:** Route based on cost, speed, or capacity

### Account Pool Schema

```typescript
interface AccountPool {
  // ═══════════════════════════════════════════════════════════════
  // IDENTITY
  // ═══════════════════════════════════════════════════════════════
  id: string;                          // "pool_01H8X9XYZ789"
  companyId: string;
  
  // ═══════════════════════════════════════════════════════════════
  // FRIENDLY NAMING
  // ═══════════════════════════════════════════════════════════════
  name: string;                        // "US Dollar Primary"
  description?: string;                // "Main pool for USD transactions"
  color?: string;                      // "#3B82F6"
  icon?: string;                       // "layers" | "shuffle"
  tags?: string[];                     // ["production", "usd"]
  
  // ═══════════════════════════════════════════════════════════════
  // MEMBER ACCOUNTS
  // ═══════════════════════════════════════════════════════════════
  accounts: PoolMembership[];
  
  // ═══════════════════════════════════════════════════════════════
  // BALANCING STRATEGY
  // ═══════════════════════════════════════════════════════════════
  balancingStrategy: BalancingStrategy;
  balancingConfig?: BalancingConfig;
  
  // ═══════════════════════════════════════════════════════════════
  // FAILOVER CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  failover: {
    enabled: boolean;
    maxAttempts: number;               // Max accounts to try
    failoverOrder?: string[];          // Explicit order, or use priority
    retryOnDecline: boolean;           // Retry soft declines?
    retryOnError: boolean;             // Retry on gateway errors?
    excludeOnFailure: boolean;         // Temp exclude failed accounts?
    exclusionDurationMs: number;       // How long to exclude
  };
  
  // ═══════════════════════════════════════════════════════════════
  // HEALTH-BASED ROUTING
  // ═══════════════════════════════════════════════════════════════
  healthRouting: {
    enabled: boolean;
    minSuccessRate: number;            // Min success rate to include (0-100)
    maxLatencyMs: number;              // Max latency to include
    degradedWeightMultiplier: number;  // Reduce weight if degraded (e.g., 0.5)
    downExclude: boolean;              // Exclude down accounts entirely
  };
  
  // ═══════════════════════════════════════════════════════════════
  // LIMIT-AWARE ROUTING
  // ═══════════════════════════════════════════════════════════════
  limitRouting: {
    enabled: boolean;
    warningThreshold: number;          // Alert at this % (e.g., 0.80)
    redistributeThreshold: number;     // Shift traffic at this % (e.g., 0.90)
    excludeThreshold: number;          // Exclude at this % (e.g., 0.98)
    limitType: 'daily' | 'monthly' | 'both';
  };
  
  // ═══════════════════════════════════════════════════════════════
  // STATUS
  // ═══════════════════════════════════════════════════════════════
  status: 'active' | 'inactive' | 'draining';
  
  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface PoolMembership {
  accountId: string;
  accountName: string;                 // Denormalized for display
  providerType: string;                // Denormalized
  
  // Weighting
  weight: number;                      // For weighted balancing (1-100)
  priority: number;                    // For failover order (1=first)
  
  // Status
  isActive: boolean;
  isPrimary: boolean;                  // Visual indicator
  isBackupOnly: boolean;               // Only use as failover
  
  // Overrides
  maxPercentage?: number;              // Never exceed this % of pool traffic
  minPercentage?: number;              // Always send at least this %
}

enum BalancingStrategy {
  // Fixed distribution
  WEIGHTED = 'WEIGHTED',               // Distribute by weight (e.g., 70/30)
  ROUND_ROBIN = 'ROUND_ROBIN',         // Even rotation
  
  // Dynamic distribution
  LEAST_LOAD = 'LEAST_LOAD',           // Fewest active transactions
  LEAST_CONNECTIONS = 'LEAST_CONNECTIONS',
  CAPACITY = 'CAPACITY',               // Based on remaining limits
  
  // Optimization
  LOWEST_COST = 'LOWEST_COST',         // Minimize fees
  LOWEST_LATENCY = 'LOWEST_LATENCY',   // Fastest response
  HIGHEST_SUCCESS = 'HIGHEST_SUCCESS', // Best success rate
  
  // Combined
  ADAPTIVE = 'ADAPTIVE',               // ML-based optimization
  PRIORITY = 'PRIORITY',               // Strict priority order
}

interface BalancingConfig {
  // For WEIGHTED
  weights?: Record<string, number>;    // { accountId: weight }
  
  // For ADAPTIVE
  optimizeFor?: ('cost' | 'speed' | 'success')[];
  learningRate?: number;
  
  // For all strategies
  stickySession?: {
    enabled: boolean;
    stickyBy: 'customer' | 'card' | 'ip';
    durationMs: number;
  };
}
```

### Load Balancing Strategies Explained

#### 1. Weighted (e.g., 40:40:20)

```yaml
Pool: "NMI USD Pool"
Strategy: WEIGHTED
Accounts:
  - Coffee Main:    weight 40  →  ~40% of traffic
  - Coffee Backup:  weight 40  →  ~40% of traffic
  - Trial Account:  weight 20  →  ~20% of traffic

Implementation:
  totalWeight = 100
  random = 0.0 - 1.0
  
  if random < 0.40 → Coffee Main
  if random < 0.80 → Coffee Backup
  else → Trial Account
```

#### 2. Round Robin

```yaml
Pool: "Even Distribution"
Strategy: ROUND_ROBIN
Accounts: [Account A, Account B, Account C]

Transaction 1 → A
Transaction 2 → B
Transaction 3 → C
Transaction 4 → A
Transaction 5 → B
...
```

#### 3. Capacity-Based

```yaml
Pool: "Auto-Balance"
Strategy: CAPACITY

Current State:
  Account A: 95% of daily limit used → very low priority
  Account B: 60% of daily limit used → medium priority
  Account C: 20% of daily limit used → high priority

Next Transaction → Account C (most capacity remaining)
```

#### 4. Cost-Optimized

```yaml
Pool: "Lowest Fee"
Strategy: LOWEST_COST

Transaction: $500.00
  Account A (NMI):      2.5% + $0.25 = $12.75 ← WINNER
  Account B (PayPal):   2.9% + $0.30 = $14.80
  Account C (AuthNet):  2.7% + $0.30 = $13.80

Route to Account A
```

#### 5. Adaptive (Future)

```yaml
Pool: "ML Optimized"
Strategy: ADAPTIVE
OptimizeFor: [success, cost, speed]

System learns:
  - Account A performs best for amounts > $200
  - Account B has higher success for recurring
  - Account C is fastest but slightly lower success

Automatically adjusts weights based on patterns
```

### Failover Example

```yaml
Pool: "US Primary with Failover"
FailoverEnabled: true
FailoverOrder: [Coffee Main, Coffee Backup, Enterprise Clients]

Scenario: Transaction for $150

Attempt 1: Coffee Main
  → Result: Gateway timeout
  → Action: Mark degraded, try next

Attempt 2: Coffee Backup
  → Result: Declined (insufficient funds)
  → Action: Soft decline, don't retry

Final Result: Declined
Fallback Used: Yes (1 failover attempt)
```

---

## Gateway Rule Engine (GRE)

### Concept

The Gateway Rule Engine evaluates a set of rules against each transaction to determine:
1. **Which account/pool** should process the transaction
2. **Whether to block** the transaction
3. **Whether to flag** for manual review
4. **What adjustments** to apply (surcharges, 3DS requirements, etc.)

### Routing Rule Schema

```typescript
interface RoutingRule {
  // ═══════════════════════════════════════════════════════════════
  // IDENTITY
  // ═══════════════════════════════════════════════════════════════
  id: string;                          // "rule_01H8X9DEF456"
  companyId: string;
  
  // ═══════════════════════════════════════════════════════════════
  // FRIENDLY NAMING
  // ═══════════════════════════════════════════════════════════════
  name: string;                        // "Route Large to NMI"
  description?: string;                // "Transactions over $500 go to NMI"
  color?: string;
  tags?: string[];                     // ["cost-optimization", "nmi"]
  
  // ═══════════════════════════════════════════════════════════════
  // STATUS & PRIORITY
  // ═══════════════════════════════════════════════════════════════
  status: RuleStatus;
  priority: number;                    // 1 = highest (evaluated first)
  
  // ═══════════════════════════════════════════════════════════════
  // CONDITIONS (Detailed below)
  // ═══════════════════════════════════════════════════════════════
  conditions: {
    // Shorthand conditions (common cases)
    geo?: GeoCondition;
    amount?: AmountCondition;
    time?: TimeCondition;
    customer?: CustomerCondition;
    product?: ProductCondition;
    paymentMethod?: PaymentMethodCondition;
    limits?: LimitCondition;
    
    // Complex conditions (advanced)
    conditionGroup?: RuleConditionGroup;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════════
  actions: RuleAction[];
  
  // ═══════════════════════════════════════════════════════════════
  // FALLBACK
  // ═══════════════════════════════════════════════════════════════
  fallback?: {
    action: 'continue' | 'block' | 'default_pool';
    poolId?: string;
    message?: string;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // A/B TESTING
  // ═══════════════════════════════════════════════════════════════
  testing?: {
    enabled: boolean;
    trafficPercentage: number;         // % to test group
    controlPoolId: string;
    testPoolId: string;
    startDate?: Date;
    endDate?: Date;
    metrics?: string[];                // What to measure
  };
  
  // ═══════════════════════════════════════════════════════════════
  // SCHEDULING
  // ═══════════════════════════════════════════════════════════════
  schedule?: {
    activateAt?: Date;
    deactivateAt?: Date;
    timezone?: string;
    recurringSchedule?: string;        // Cron expression
  };
  
  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════
  analytics: {
    matchCount: number;
    lastMatchedAt?: Date;
    avgProcessingTimeMs: number;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
}

enum RuleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TESTING = 'TESTING',
  SCHEDULED = 'SCHEDULED',
  EXPIRED = 'EXPIRED',
}
```

### Rule Actions

```typescript
interface RuleAction {
  type: RuleActionType;
  
  // Routing
  poolId?: string;                     // Route to this pool
  accountId?: string;                  // Route to specific account
  accountIds?: string[];               // Try in order
  
  // Blocking
  blockReason?: string;
  blockCode?: string;
  
  // Review
  reviewReason?: string;
  reviewPriority?: 'low' | 'medium' | 'high' | 'critical';
  reviewQueue?: string;
  
  // Adjustments
  surchargeType?: 'percentage' | 'flat';
  surchargeValue?: number;
  discountType?: 'percentage' | 'flat';
  discountValue?: number;
  
  // Security
  require3DS?: boolean;
  requireCVV?: boolean;
  requireAVS?: boolean;
  
  // Metadata
  addMetadata?: Record<string, string>;
  
  // Notifications
  notifyChannels?: ('email' | 'slack' | 'webhook' | 'sms')[];
  notifyRecipients?: string[];
  notifyTemplate?: string;
}

enum RuleActionType {
  // Routing
  ROUTE_TO_POOL = 'ROUTE_TO_POOL',
  ROUTE_TO_ACCOUNT = 'ROUTE_TO_ACCOUNT',
  ROUTE_TO_ACCOUNTS = 'ROUTE_TO_ACCOUNTS',   // Ordered list
  
  // Blocking
  BLOCK = 'BLOCK',
  
  // Review
  FLAG_FOR_REVIEW = 'FLAG_FOR_REVIEW',
  
  // Adjustments
  APPLY_SURCHARGE = 'APPLY_SURCHARGE',
  APPLY_DISCOUNT = 'APPLY_DISCOUNT',
  
  // Security
  REQUIRE_3DS = 'REQUIRE_3DS',
  SKIP_3DS = 'SKIP_3DS',
  
  // Metadata
  ADD_METADATA = 'ADD_METADATA',
  
  // Notifications
  NOTIFY = 'NOTIFY',
  
  // Logging
  LOG_ONLY = 'LOG_ONLY',
}
```

---

## Routing Conditions

### Geographic Conditions

```typescript
interface GeoCondition {
  // ═══════════════════════════════════════════════════════════════
  // COUNTRY LEVEL (ISO 3166-1 alpha-2)
  // ═══════════════════════════════════════════════════════════════
  countries?: string[];                // ['US', 'CA', 'GB']
  excludeCountries?: string[];         // ['RU', 'CN', 'KP']
  
  // ═══════════════════════════════════════════════════════════════
  // REGION/STATE LEVEL
  // ═══════════════════════════════════════════════════════════════
  regions?: Region[];                  // US_NORTHEAST, EU_WESTERN, etc.
  states?: string[];                   // ['CA', 'NY', 'TX']
  excludeStates?: string[];
  provinces?: string[];                // Canadian provinces
  
  // ═══════════════════════════════════════════════════════════════
  // CONTINENT LEVEL
  // ═══════════════════════════════════════════════════════════════
  continents?: Continent[];            // NORTH_AMERICA, EUROPE, ASIA
  
  // ═══════════════════════════════════════════════════════════════
  // CURRENCY-BASED
  // ═══════════════════════════════════════════════════════════════
  currencies?: string[];               // ['USD', 'EUR', 'GBP']
  
  // ═══════════════════════════════════════════════════════════════
  // CLASSIFICATION FLAGS
  // ═══════════════════════════════════════════════════════════════
  domesticOnly?: boolean;              // Same country as merchant
  internationalOnly?: boolean;
  euOnly?: boolean;                    // European Union
  eeaOnly?: boolean;                   // European Economic Area
  
  // ═══════════════════════════════════════════════════════════════
  // RISK CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════
  sanctionedCountries?: boolean;       // OFAC list
  highRiskCountries?: boolean;         // Custom high-risk list
  
  // ═══════════════════════════════════════════════════════════════
  // IP VERIFICATION
  // ═══════════════════════════════════════════════════════════════
  requireIpMatch?: boolean;            // IP geo must match billing
  allowVpn?: boolean;
  allowProxy?: boolean;
  allowTor?: boolean;
}

// Region definitions
enum Region {
  // North America
  US_NORTHEAST = 'US_NE',
  US_SOUTHEAST = 'US_SE',
  US_MIDWEST = 'US_MW',
  US_WEST = 'US_W',
  US_SOUTHWEST = 'US_SW',
  CANADA_EAST = 'CA_E',
  CANADA_WEST = 'CA_W',
  MEXICO = 'MX',
  CARIBBEAN = 'CARIB',
  CENTRAL_AMERICA = 'CENTAM',
  
  // Europe
  EU_WESTERN = 'EU_W',
  EU_EASTERN = 'EU_E',
  EU_NORTHERN = 'EU_N',
  EU_SOUTHERN = 'EU_S',
  UK_IRELAND = 'UK_IE',
  SCANDINAVIA = 'SCAND',
  
  // Asia Pacific
  EAST_ASIA = 'ASIA_E',
  SOUTHEAST_ASIA = 'ASIA_SE',
  SOUTH_ASIA = 'ASIA_S',
  MIDDLE_EAST = 'ME',
  AUSTRALIA_NZ = 'ANZ',
  
  // Other
  SOUTH_AMERICA = 'SA',
  AFRICA_NORTH = 'AF_N',
  AFRICA_SUB_SAHARAN = 'AF_SS',
}

enum Continent {
  NORTH_AMERICA = 'NA',
  SOUTH_AMERICA = 'SA',
  EUROPE = 'EU',
  ASIA = 'AS',
  AFRICA = 'AF',
  OCEANIA = 'OC',
}
```

### Amount Conditions

```typescript
interface AmountCondition {
  // ═══════════════════════════════════════════════════════════════
  // SIMPLE RANGE (in cents)
  // ═══════════════════════════════════════════════════════════════
  min?: number;                        // e.g., 10000 = $100.00
  max?: number;                        // e.g., 100000 = $1,000.00
  
  // ═══════════════════════════════════════════════════════════════
  // TIERED RANGES (for complex routing)
  // ═══════════════════════════════════════════════════════════════
  ranges?: AmountRange[];
  
  // ═══════════════════════════════════════════════════════════════
  // CURRENCY-SPECIFIC AMOUNTS
  // ═══════════════════════════════════════════════════════════════
  currencyAmounts?: Record<string, {
    min?: number;
    max?: number;
  }>;
  
  // ═══════════════════════════════════════════════════════════════
  // RELATIVE TO AVERAGE
  // ═══════════════════════════════════════════════════════════════
  percentOfAverage?: {
    operator: 'above' | 'below';
    percentage: number;                // e.g., 200 = 2x average
    period: 'day' | 'week' | 'month';
  };
}

interface AmountRange {
  min: number;
  max: number | null;                  // null = unlimited
  label?: string;                      // 'micro', 'small', 'medium', 'large'
}
```

### Product Conditions

```typescript
interface ProductCondition {
  // ═══════════════════════════════════════════════════════════════
  // SKU MATCHING
  // ═══════════════════════════════════════════════════════════════
  skus?: string[];                     // Specific product SKUs
  skuPatterns?: string[];              // Regex patterns
  excludeSkus?: string[];
  
  // ═══════════════════════════════════════════════════════════════
  // CATEGORY MATCHING
  // ═══════════════════════════════════════════════════════════════
  categories?: string[];               // ['electronics', 'clothing']
  categoryPaths?: string[];            // ['electronics/phones/smartphones']
  excludeCategories?: string[];
  
  // ═══════════════════════════════════════════════════════════════
  // PRODUCT TYPE
  // ═══════════════════════════════════════════════════════════════
  productTypes?: ProductType[];
  
  // ═══════════════════════════════════════════════════════════════
  // SUBSCRIPTION SPECIFIC
  // ═══════════════════════════════════════════════════════════════
  subscriptionTiers?: SubscriptionTier[];
  subscriptionIntervals?: SubscriptionInterval[];
  isSubscription?: boolean;
  isTrialConversion?: boolean;
  isRenewal?: boolean;
  isUpgrade?: boolean;
  isDowngrade?: boolean;
  
  // ═══════════════════════════════════════════════════════════════
  // RISK CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════
  highRiskProducts?: boolean;
  requiresAgeVerification?: boolean;
  
  // ═══════════════════════════════════════════════════════════════
  // CUSTOM ATTRIBUTES
  // ═══════════════════════════════════════════════════════════════
  attributes?: Record<string, string | string[]>;
}

enum ProductType {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL',
  SERVICE = 'SERVICE',
  SUBSCRIPTION = 'SUBSCRIPTION',
  DONATION = 'DONATION',
  INVOICE = 'INVOICE',
}

enum SubscriptionTier {
  FREE = 'FREE',
  BASIC = 'BASIC',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

enum SubscriptionInterval {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  ANNUAL = 'ANNUAL',
}
```

### Time Conditions

```typescript
interface TimeCondition {
  // ═══════════════════════════════════════════════════════════════
  // TIME OF DAY (merchant timezone)
  // ═══════════════════════════════════════════════════════════════
  startHour?: number;                  // 0-23
  endHour?: number;                    // 0-23
  
  // ═══════════════════════════════════════════════════════════════
  // DAYS OF WEEK
  // ═══════════════════════════════════════════════════════════════
  daysOfWeek?: DayOfWeek[];
  excludeDays?: DayOfWeek[];
  
  // ═══════════════════════════════════════════════════════════════
  // DATE RANGES
  // ═══════════════════════════════════════════════════════════════
  startDate?: string;                  // ISO date
  endDate?: string;
  
  // ═══════════════════════════════════════════════════════════════
  // RECURRING DATES
  // ═══════════════════════════════════════════════════════════════
  monthDays?: number[];                // [1, 15] = 1st and 15th
  
  // ═══════════════════════════════════════════════════════════════
  // HOLIDAYS
  // ═══════════════════════════════════════════════════════════════
  excludeHolidays?: boolean;
  holidayCountry?: string;
  includeOnlyHolidays?: boolean;
  
  // ═══════════════════════════════════════════════════════════════
  // BUSINESS HOURS
  // ═══════════════════════════════════════════════════════════════
  businessHoursOnly?: boolean;         // 9am-5pm Mon-Fri
  afterHoursOnly?: boolean;
  weekendOnly?: boolean;
  weekdayOnly?: boolean;
  
  // ═══════════════════════════════════════════════════════════════
  // TIMEZONE
  // ═══════════════════════════════════════════════════════════════
  timezone?: string;                   // 'America/New_York'
}

enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}
```

### Customer Conditions

```typescript
interface CustomerCondition {
  // ═══════════════════════════════════════════════════════════════
  // CUSTOMER TYPE
  // ═══════════════════════════════════════════════════════════════
  customerTypes?: CustomerType[];
  excludeCustomerTypes?: CustomerType[];
  
  // ═══════════════════════════════════════════════════════════════
  // ACCOUNT AGE
  // ═══════════════════════════════════════════════════════════════
  minAccountAgeDays?: number;
  maxAccountAgeDays?: number;
  isNewCustomer?: boolean;             // First transaction ever
  
  // ═══════════════════════════════════════════════════════════════
  // TRANSACTION HISTORY
  // ═══════════════════════════════════════════════════════════════
  minLifetimeTransactions?: number;
  maxLifetimeTransactions?: number;
  minLifetimeValue?: number;           // In cents
  maxLifetimeValue?: number;
  
  // ═══════════════════════════════════════════════════════════════
  // RISK ASSESSMENT
  // ═══════════════════════════════════════════════════════════════
  riskLevels?: CustomerRiskLevel[];
  maxRiskScore?: number;               // 0-100
  minRiskScore?: number;
  maxChargebackRate?: number;          // As decimal (0.01 = 1%)
  
  // ═══════════════════════════════════════════════════════════════
  // PAYMENT HISTORY
  // ═══════════════════════════════════════════════════════════════
  hasSuccessfulPayment?: boolean;
  hasPreviousDecline?: boolean;
  hasPreviousChargeback?: boolean;
  hasSavedPaymentMethod?: boolean;
  
  // ═══════════════════════════════════════════════════════════════
  // VERIFICATION STATUS
  // ═══════════════════════════════════════════════════════════════
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isAddressVerified?: boolean;
  isIdentityVerified?: boolean;
  
  // ═══════════════════════════════════════════════════════════════
  // SEGMENTATION
  // ═══════════════════════════════════════════════════════════════
  segments?: string[];                 // ['high_value', 'at_risk', 'vip']
  tags?: string[];
  
  // ═══════════════════════════════════════════════════════════════
  // SPECIFIC CUSTOMERS
  // ═══════════════════════════════════════════════════════════════
  customerIds?: string[];
  excludeCustomerIds?: string[];
}

enum CustomerType {
  GUEST = 'GUEST',
  REGISTERED = 'REGISTERED',
  VERIFIED = 'VERIFIED',
  VIP = 'VIP',
  ENTERPRISE = 'ENTERPRISE',
  EMPLOYEE = 'EMPLOYEE',
  PARTNER = 'PARTNER',
}

enum CustomerRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  BLOCKED = 'BLOCKED',
}
```

### Payment Method Conditions

```typescript
interface PaymentMethodCondition {
  // ═══════════════════════════════════════════════════════════════
  // CARD BRAND
  // ═══════════════════════════════════════════════════════════════
  cardBrands?: CardBrand[];            // VISA, MASTERCARD, AMEX
  excludeCardBrands?: CardBrand[];
  
  // ═══════════════════════════════════════════════════════════════
  // CARD TYPE
  // ═══════════════════════════════════════════════════════════════
  cardTypes?: CardType[];              // credit, debit, prepaid
  excludeCardTypes?: CardType[];
  
  // ═══════════════════════════════════════════════════════════════
  // BIN RANGES
  // ═══════════════════════════════════════════════════════════════
  binRanges?: BinRange[];
  excludeBinRanges?: BinRange[];
  
  // ═══════════════════════════════════════════════════════════════
  // ISSUING BANK/COUNTRY
  // ═══════════════════════════════════════════════════════════════
  issuingBanks?: string[];
  issuingCountries?: string[];
  excludeIssuingCountries?: string[];
  
  // ═══════════════════════════════════════════════════════════════
  // TOKENIZATION
  // ═══════════════════════════════════════════════════════════════
  isTokenized?: boolean;
  isNewCard?: boolean;                 // First use of this card
  
  // ═══════════════════════════════════════════════════════════════
  // 3D SECURE
  // ═══════════════════════════════════════════════════════════════
  is3dsEnrolled?: boolean;
  
  // ═══════════════════════════════════════════════════════════════
  // ALTERNATIVE PAYMENT METHODS
  // ═══════════════════════════════════════════════════════════════
  isAch?: boolean;
  achAccountTypes?: ('checking' | 'savings')[];
  
  isDigitalWallet?: boolean;
  walletTypes?: WalletType[];
}

enum CardBrand {
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  AMEX = 'AMEX',
  DISCOVER = 'DISCOVER',
  DINERS = 'DINERS',
  JCB = 'JCB',
  UNIONPAY = 'UNIONPAY',
}

enum CardType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  PREPAID = 'PREPAID',
  CORPORATE = 'CORPORATE',
}

enum WalletType {
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
  PAYPAL = 'PAYPAL',
  SAMSUNG_PAY = 'SAMSUNG_PAY',
}

interface BinRange {
  start: string;                       // "411111"
  end: string;                         // "411199"
}
```

### Limit Conditions

```typescript
interface LimitCondition {
  // ═══════════════════════════════════════════════════════════════
  // TRANSACTION COUNT LIMITS
  // ═══════════════════════════════════════════════════════════════
  dailyTransactionLimit?: number;
  weeklyTransactionLimit?: number;
  monthlyTransactionLimit?: number;
  yearlyTransactionLimit?: number;
  
  // ═══════════════════════════════════════════════════════════════
  // VOLUME LIMITS (in cents)
  // ═══════════════════════════════════════════════════════════════
  dailyVolumeLimit?: number;
  weeklyVolumeLimit?: number;
  monthlyVolumeLimit?: number;
  yearlyVolumeLimit?: number;
  
  // ═══════════════════════════════════════════════════════════════
  // ROLLING LIMITS
  // ═══════════════════════════════════════════════════════════════
  rollingHourLimit?: number;           // Last 60 minutes
  rolling24HourLimit?: number;
  rolling7DayLimit?: number;
  rolling30DayLimit?: number;
  
  // ═══════════════════════════════════════════════════════════════
  // PER-CUSTOMER LIMITS
  // ═══════════════════════════════════════════════════════════════
  perCustomerDailyLimit?: number;
  perCustomerMonthlyLimit?: number;
  perCustomerTransactionLimit?: number;
  
  // ═══════════════════════════════════════════════════════════════
  // PER-CARD LIMITS
  // ═══════════════════════════════════════════════════════════════
  perCardDailyLimit?: number;
  perCardMonthlyLimit?: number;
  
  // ═══════════════════════════════════════════════════════════════
  // VELOCITY CHECKS
  // ═══════════════════════════════════════════════════════════════
  velocityWindow?: number;             // Minutes
  velocityMaxTransactions?: number;
  velocityMaxAmount?: number;
  
  // ═══════════════════════════════════════════════════════════════
  // ACTION WHEN LIMIT REACHED
  // ═══════════════════════════════════════════════════════════════
  limitReachedAction?: 'block' | 'route_alternate' | 'flag_review' | 'notify';
}
```

---

## Billing & Usage Tracking

### Pricing Plans

```typescript
interface PricingPlan {
  // ═══════════════════════════════════════════════════════════════
  // IDENTITY
  // ═══════════════════════════════════════════════════════════════
  id: string;
  
  // ═══════════════════════════════════════════════════════════════
  // FRIENDLY NAMING
  // ═══════════════════════════════════════════════════════════════
  name: string;                        // "Starter", "Growth", "Pro", "Enterprise"
  description: string;
  displayOrder: number;
  isPublic: boolean;                   // Show on pricing page
  isCustom: boolean;                   // Enterprise custom deal
  
  // ═══════════════════════════════════════════════════════════════
  // BASE SUBSCRIPTION
  // ═══════════════════════════════════════════════════════════════
  billingInterval: 'monthly' | 'annual';
  basePrice: number;                   // In cents (0 for usage-only)
  annualDiscount?: number;             // e.g., 0.20 = 20% off
  
  // ═══════════════════════════════════════════════════════════════
  // INCLUDED ALLOWANCES
  // ═══════════════════════════════════════════════════════════════
  included: {
    transactions: number;              // 0 = pay per transaction
    volume: number;                    // In cents
    merchantAccounts: number;
    companies: number;
    teamMembers: number;
    apiCalls: number;
    vaultEntries: number;              // Stored cards
    webhooks: number;
    reports: number;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // OVERAGE PRICING
  // ═══════════════════════════════════════════════════════════════
  overage: {
    transactionPrice: number;          // Cents per transaction
    volumePercent: number;             // e.g., 0.0015 = 0.15%
    merchantAccountPrice: number;      // Per additional account
    companyPrice: number;
    teamMemberPrice: number;
    apiCallPrice: number;              // Per 1000 calls
    vaultEntryPrice: number;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // TIERED PRICING (optional)
  // ═══════════════════════════════════════════════════════════════
  tiers?: {
    transactions?: PricingTier[];
    volume?: PricingTier[];
  };
  
  // ═══════════════════════════════════════════════════════════════
  // FEATURE FLAGS
  // ═══════════════════════════════════════════════════════════════
  features: PlanFeatures;
  
  // ═══════════════════════════════════════════════════════════════
  // LIMITS
  // ═══════════════════════════════════════════════════════════════
  limits?: {
    maxMerchantAccounts?: number;
    maxCompanies?: number;
    maxTeamMembers?: number;
    maxTransactionsPerMonth?: number;
    maxVolumePerMonth?: number;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // STATUS
  // ═══════════════════════════════════════════════════════════════
  status: 'active' | 'deprecated' | 'hidden';
  effectiveDate: Date;
  sunsetDate?: Date;
}

interface PricingTier {
  min: number;
  max: number | null;                  // null = unlimited
  pricePerUnit: number;
  label?: string;
}

interface PlanFeatures {
  // Core
  multipleProviders: boolean;
  routingRules: boolean;
  advancedRouting: boolean;
  loadBalancing: boolean;
  failover: boolean;
  
  // Reporting
  basicReporting: boolean;
  advancedAnalytics: boolean;
  customReports: boolean;
  dataExport: boolean;
  
  // Security
  tokenization: boolean;
  fraudDetection: boolean;
  threeDS: boolean;
  
  // Support
  emailSupport: boolean;
  chatSupport: boolean;
  phoneSupport: boolean;
  dedicatedManager: boolean;
  slaGuarantee: boolean;
  
  // Integrations
  apiAccess: boolean;
  webhooks: boolean;
  customIntegrations: boolean;
  
  // White-label
  customBranding: boolean;
  customDomain: boolean;
}
```

### Example Pricing Plans

```yaml
Starter:
  price: $49/month
  included:
    transactions: 500
    volume: $25,000
    merchantAccounts: 2
    companies: 5
    teamMembers: 2
  overage:
    transaction: $0.15
    volume: 0.25%
  features:
    - Basic routing
    - Email support
    - Basic reporting

Growth:
  price: $149/month
  included:
    transactions: 2,500
    volume: $125,000
    merchantAccounts: 5
    companies: 15
    teamMembers: 5
  overage:
    transaction: $0.10
    volume: 0.20%
  features:
    - Advanced routing
    - Load balancing
    - Chat support
    - Advanced analytics

Pro:
  price: $299/month
  included:
    transactions: 5,000
    volume: $250,000
    merchantAccounts: 10
    companies: 25
    teamMembers: 10
  overage:
    transaction: $0.05
    volume: 0.15%
  features:
    - All routing features
    - Failover
    - Priority support
    - Custom reports
    - API access

Enterprise:
  price: Custom
  included: Negotiated
  features:
    - Unlimited everything
    - Dedicated manager
    - SLA guarantee
    - Custom integrations
    - White-label options
```

### Usage Tracking

```typescript
interface UsagePeriod {
  id: string;
  clientId: string;
  
  // Period
  periodStart: Date;
  periodEnd: Date;
  status: 'active' | 'closed' | 'invoiced';
  
  // ═══════════════════════════════════════════════════════════════
  // AGGREGATE USAGE (real-time updated)
  // ═══════════════════════════════════════════════════════════════
  usage: {
    // Transactions
    transactionCount: number;
    transactionVolume: number;         // In cents
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
    storageBytes: number;
  };
  
  // ═══════════════════════════════════════════════════════════════
  // BREAKDOWN BY COMPANY
  // ═══════════════════════════════════════════════════════════════
  companyUsage: CompanyUsage[];
  
  // ═══════════════════════════════════════════════════════════════
  // CALCULATED COSTS
  // ═══════════════════════════════════════════════════════════════
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
}

interface CompanyUsage {
  companyId: string;
  companyName: string;
  
  // Transaction metrics
  transactionCount: number;
  transactionVolume: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  avgTransactionSize: number;
  
  // Breakdown by account
  accountUsage: AccountUsage[];
  
  // Daily breakdown (for charts)
  dailyUsage: DailyUsage[];
}

interface AccountUsage {
  merchantAccountId: string;
  merchantAccountName: string;
  providerType: string;
  
  transactionCount: number;
  transactionVolume: number;
  successRate: number;
  avgLatencyMs: number;
  fees: number;
}

interface DailyUsage {
  date: string;                        // "2024-11-15"
  transactionCount: number;
  transactionVolume: number;
  successRate: number;
}
```

### Usage Events

```typescript
interface UsageEvent {
  id: string;
  clientId: string;
  companyId: string;
  
  eventType: UsageEventType;
  resourceType?: string;
  resourceId?: string;
  
  quantity: number;
  unitAmount?: number;                 // For volume tracking
  
  metadata?: Record<string, unknown>;
  timestamp: Date;
  billingPeriodId: string;
}

enum UsageEventType {
  // Transactions
  TRANSACTION_PROCESSED = 'transaction.processed',
  TRANSACTION_APPROVED = 'transaction.approved',
  TRANSACTION_DECLINED = 'transaction.declined',
  REFUND_PROCESSED = 'refund.processed',
  CHARGEBACK_RECEIVED = 'chargeback.received',
  
  // API
  API_CALL = 'api.call',
  WEBHOOK_SENT = 'webhook.sent',
  
  // Resources
  MERCHANT_ACCOUNT_CREATED = 'merchant_account.created',
  MERCHANT_ACCOUNT_DELETED = 'merchant_account.deleted',
  COMPANY_CREATED = 'company.created',
  TEAM_MEMBER_ADDED = 'team_member.added',
  VAULT_ENTRY_CREATED = 'vault_entry.created',
  
  // Reports
  REPORT_GENERATED = 'report.generated',
  DATA_EXPORTED = 'data.exported',
}
```

### Invoicing

```typescript
interface Invoice {
  id: string;
  clientId: string;
  clientName: string;
  
  invoiceNumber: string;               // "INV-2024-0042"
  
  // Period
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
  
  // Line items
  lineItems: InvoiceLineItem[];
  
  // Status
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  dueDate: Date;
  paidAt?: Date;
  
  // Payment
  paymentIntentId?: string;
  paymentMethod?: string;
  
  // PDF
  pdfUrl?: string;
  
  // Metadata
  createdAt: Date;
  sentAt?: Date;
  notes?: string;
}

interface InvoiceLineItem {
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
```

---

## Data Models

### Complete Entity Relationship

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PricingPlan   │     │     Client      │     │    Company      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │     │ id              │
│ name            │◄────│ planId          │────►│ clientId        │
│ basePrice       │     │ name            │     │ name            │
│ included        │     │ subscription    │     │ settings        │
│ overage         │     │ paymentMethod   │     │                 │
│ features        │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                        │
                               │                        │
                               ▼                        ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   UsagePeriod   │     │ MerchantAccount │
                        ├─────────────────┤     ├─────────────────┤
                        │ id              │     │ id              │
                        │ clientId        │     │ companyId       │
                        │ periodStart     │     │ name            │
                        │ periodEnd       │     │ providerType    │
                        │ usage           │     │ credentials     │
                        │ companyUsage[]  │     │ limits          │
                        └─────────────────┘     │ fees            │
                               │                │ restrictions    │
                               ▼                └─────────────────┘
                        ┌─────────────────┐            │
                        │    Invoice      │            │
                        ├─────────────────┤            ▼
                        │ id              │     ┌─────────────────┐
                        │ clientId        │     │   AccountPool   │
                        │ invoiceNumber   │     ├─────────────────┤
                        │ lineItems[]     │     │ id              │
                        │ total           │     │ companyId       │
                        │ status          │     │ name            │
                        └─────────────────┘     │ accounts[]      │
                                                │ balancingStrategy│
                                                └─────────────────┘
                                                       │
                                                       ▼
                                                ┌─────────────────┐
                                                │  RoutingRule    │
                                                ├─────────────────┤
                                                │ id              │
                                                │ companyId       │
                                                │ name            │
                                                │ conditions      │
                                                │ actions         │
                                                │ priority        │
                                                └─────────────────┘
```

---

## API Specifications

### Merchant Accounts API

```typescript
// Create merchant account
POST /api/merchant-accounts
{
  "name": "Coffee Main",
  "description": "Primary processing for coffee subscriptions",
  "providerType": "NMI",
  "merchantId": "123456789",
  "credentials": { ... },
  "limits": { ... },
  "fees": { ... },
  "restrictions": { ... },
  "tags": ["primary", "coffee"]
}

// List merchant accounts
GET /api/merchant-accounts
GET /api/merchant-accounts?providerType=NMI
GET /api/merchant-accounts?status=active

// Get single account
GET /api/merchant-accounts/:id

// Update account
PATCH /api/merchant-accounts/:id
{
  "name": "Coffee Main - Updated",
  "limits": { "monthlyVolumeLimit": 6000000 }
}

// Delete account
DELETE /api/merchant-accounts/:id

// Get account usage
GET /api/merchant-accounts/:id/usage
GET /api/merchant-accounts/:id/usage?period=current

// Get account health
GET /api/merchant-accounts/:id/health
```

### Account Pools API

```typescript
// Create pool
POST /api/account-pools
{
  "name": "US Dollar Primary",
  "description": "Main pool for USD transactions",
  "balancingStrategy": "WEIGHTED",
  "accounts": [
    { "accountId": "ma_001", "weight": 40, "priority": 1 },
    { "accountId": "ma_002", "weight": 40, "priority": 2 },
    { "accountId": "ma_003", "weight": 20, "priority": 3 }
  ],
  "failover": {
    "enabled": true,
    "maxAttempts": 3
  }
}

// List pools
GET /api/account-pools

// Get pool
GET /api/account-pools/:id

// Update pool
PATCH /api/account-pools/:id

// Add account to pool
POST /api/account-pools/:id/accounts
{
  "accountId": "ma_004",
  "weight": 10,
  "priority": 4
}

// Remove account from pool
DELETE /api/account-pools/:id/accounts/:accountId

// Get pool statistics
GET /api/account-pools/:id/stats
```

### Routing Rules API

```typescript
// Create rule
POST /api/routing-rules
{
  "name": "Large Orders to NMI",
  "description": "Route transactions over $500 to NMI",
  "priority": 50,
  "conditions": {
    "amount": { "min": 50000 }
  },
  "actions": [
    {
      "type": "ROUTE_TO_POOL",
      "poolId": "pool_001"
    }
  ]
}

// List rules
GET /api/routing-rules
GET /api/routing-rules?status=active

// Get rule
GET /api/routing-rules/:id

// Update rule
PATCH /api/routing-rules/:id

// Delete rule
DELETE /api/routing-rules/:id

// Test rule (dry run)
POST /api/routing-rules/test
{
  "amount": 75000,
  "currency": "USD",
  "billingCountry": "US",
  "cardBrand": "VISA"
}

// Reorder rules
POST /api/routing-rules/reorder
{
  "rules": [
    { "id": "rule_001", "priority": 1 },
    { "id": "rule_002", "priority": 2 }
  ]
}
```

### Billing API

```typescript
// Get current usage
GET /api/billing/usage
GET /api/billing/usage?period=current
GET /api/billing/usage?period=2024-11

// Get usage by company
GET /api/billing/usage/by-company
GET /api/billing/usage/by-company/:companyId

// Get usage by account
GET /api/billing/usage/by-account
GET /api/billing/usage/by-account/:accountId

// Get invoices
GET /api/billing/invoices
GET /api/billing/invoices/:id
GET /api/billing/invoices/:id/pdf

// Get subscription
GET /api/billing/subscription

// Update subscription
PATCH /api/billing/subscription
{
  "planId": "plan_pro"
}

// Update payment method
POST /api/billing/payment-method
{
  "paymentMethodId": "pm_..."
}
```

### Admin Billing API (Platform)

```typescript
// Get all clients billing
GET /api/admin/billing/clients
GET /api/admin/billing/clients/:clientId

// Get platform revenue
GET /api/admin/billing/revenue
GET /api/admin/billing/revenue?period=2024-11

// Get MRR breakdown
GET /api/admin/billing/mrr

// Generate invoice
POST /api/admin/billing/invoices/generate
{
  "clientId": "client_001",
  "periodEnd": "2024-11-30"
}

// Adjust invoice
POST /api/admin/billing/invoices/:id/adjust
{
  "adjustment": -5000,
  "reason": "Service credit"
}
```

---

## Dashboard Requirements

### Merchant Accounts View

```
┌─────────────────────────────────────────────────────────────────┐
│ MERCHANT ACCOUNTS                                    [+ Add New] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ NMI Gateway                                                     │
│ ├── ● Coffee Main ............... $18,450 today   92% ████████ │
│ │      Daily: 73% ($18.4k / $25k)  Monthly: 45% ($198k / $500k)│
│ │                                                               │
│ ├── ● Coffee Backup ............. $2,100 today    100% ████████│
│ │      Daily: 8% ($2.1k / $25k)   Monthly: 12% ($52k / $500k)  │
│ │                                                               │
│ ├── ● High-Risk Supplements ..... $8,920 today    87% ███████  │
│ │      Daily: 71% ($8.9k / $12.5k) Monthly: 68% ($85k / $125k) │
│ │                                                               │
│ └── ○ Weekend Overflow .......... $0 today        -- (inactive)│
│                                                                 │
│ PayPal Payflow                                                  │
│ ├── ● International EUR ......... €4,200 today    95% ████████ │
│ └── ● International GBP ......... £1,850 today    100% ████████│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Account Pools View

```
┌─────────────────────────────────────────────────────────────────┐
│ ACCOUNT POOLS                                        [+ Add New] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ● US Dollar Primary                          3 accounts, active │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Strategy: Weighted                                      │   │
│   │                                                         │   │
│   │ Coffee Main (40%)      ████████████████░░░░  $18,450    │   │
│   │ Coffee Backup (40%)    ███░░░░░░░░░░░░░░░░░  $2,100     │   │
│   │ Enterprise (20%)       ███████████░░░░░░░░░  $12,300    │   │
│   │                                                         │   │
│   │ Total Today: $32,850   Failover: Enabled               │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ● International Processing                   2 accounts, active │
│   Strategy: Round Robin                                         │
│   International EUR (50%) → International GBP (50%)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Routing Rules View

```
┌─────────────────────────────────────────────────────────────────┐
│ ROUTING RULES                                        [+ Add New] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Priority │ Name                     │ Conditions     │ Route To │
│ ─────────────────────────────────────────────────────────────── │
│ 1        │ ● Block Sanctioned       │ 12 countries   │ BLOCK    │
│ 10       │ ● EU Transactions        │ EU + EUR       │ Intl EUR │
│ 10       │ ● UK Transactions        │ GB + GBP       │ Intl GBP │
│ 50       │ ● Large Orders >$500     │ Amount >$500   │ NMI Pool │
│ 50       │ ● Amex Surcharge         │ Card = Amex    │ +2.5%    │
│ 50       │ ● Subscriptions          │ isRenewal=true │ Sub Pool │
│ 100      │ ● Default USD            │ (catch-all)    │ US Pool  │
│                                                                 │
│ [Reorder] [Test Rules]                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Client Billing View

```
┌─────────────────────────────────────────────────────────────────┐
│ BILLING OVERVIEW                                      Pro Plan  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Current Period: Nov 1 - Nov 30, 2024                           │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ USAGE                        USED         INCLUDED   LEFT   │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ Transactions                 3,847        5,000      1,153  │ │
│ │ Volume Processed             $184,500     $250,000   $65.5k │ │
│ │ Merchant Accounts            4            10         6      │ │
│ │ Companies                    12           25         13     │ │
│ │ Team Members                 3            10         7      │ │
│ │ API Calls                    45,230       100,000    54,770 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ CURRENT BILL ESTIMATE                                       │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ Base Plan (Pro Monthly)                          $299.00    │ │
│ │ Overage: 0 transactions                          $0.00      │ │
│ │ Overage: $0 volume                               $0.00      │ │
│ │ ───────────────────────────────────────────────────────     │ │
│ │ Estimated Total                                  $299.00    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ USAGE BY COMPANY                                            │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ Acme Coffee Co          1,245 txn    $58,200      32%  ████ │ │
│ │ Bean There Done That      892 txn    $41,100      22%  ███  │ │
│ │ Roast Masters            756 txn    $35,800      19%  ██   │ │
│ │ Daily Grind              521 txn    $28,400      15%  ██   │ │
│ │ Other (8 companies)      433 txn    $21,000      12%  █    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [View Invoices]  [Update Payment Method]  [Change Plan]        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Platform Admin Revenue View

```
┌─────────────────────────────────────────────────────────────────┐
│ PLATFORM REVENUE                                      November  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐          │
│ │ MRR           │ │ TRANSACTIONS  │ │ VOLUME        │          │
│ │ $12,450       │ │ 847,293       │ │ $4.2M         │          │
│ │ ↑ 8.2%        │ │ ↑ 12.4%       │ │ ↑ 15.1%       │          │
│ └───────────────┘ └───────────────┘ └───────────────┘          │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ REVENUE BY CLIENT                                           │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ Client              Plan        MRR      Volume    Status   │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ Mega Agency         Enterprise  $2,500   $1.2M     Active   │ │
│ │ Coffee Collective   Pro         $450     $380k     Active   │ │
│ │ Subscription Box Co Pro         $380     $290k     Active   │ │
│ │ Wellness Partners   Growth      $199     $150k     Active   │ │
│ │ StartupXYZ          Starter     $49      $15k      Trialing │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ REVENUE BREAKDOWN                                           │ │
│ │ ─────────────────────────────────────────────────────────── │ │
│ │ Base Subscriptions                           $8,200   66%   │ │
│ │ Transaction Fees                             $2,450   20%   │ │
│ │ Volume Fees                                  $1,200   10%   │ │
│ │ Overages                                     $400     3%    │ │
│ │ Add-ons                                      $200     1%    │ │
│ │ ───────────────────────────────────────────────────────     │ │
│ │ Total MRR                                    $12,450        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Multi-Account Foundation
- [ ] Merchant Account CRUD
- [ ] Provider credentials encryption
- [ ] Per-account limits tracking
- [ ] Real-time usage counters
- [ ] Health monitoring per account

### Phase 2: Account Pools & Load Balancing
- [ ] Account Pool CRUD
- [ ] Weighted load balancing
- [ ] Round-robin balancing
- [ ] Capacity-based balancing
- [ ] Failover logic

### Phase 3: Gateway Rule Engine
- [ ] Routing Rule CRUD
- [ ] Condition evaluators (geo, amount, product, etc.)
- [ ] Action executors
- [ ] Rule testing/simulation
- [ ] Rule analytics

### Phase 4: Billing System
- [ ] Pricing Plan management
- [ ] Client subscriptions
- [ ] Usage metering
- [ ] Invoice generation
- [ ] Payment integration (Stripe)

### Phase 5: Dashboard UI
- [ ] Merchant accounts management
- [ ] Account pools configuration
- [ ] Routing rules builder
- [ ] Usage & billing views
- [ ] Admin revenue dashboard

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-11-26 | Claude | Initial specification |

---

*End of Document*
