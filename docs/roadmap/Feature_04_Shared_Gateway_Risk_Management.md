# Feature 04: Shared Gateway Pricing, Terms & Risk Management System

**Status:** Requirements Phase
**Priority:** High
**Estimated Effort:** Large
**Dependencies:** Feature 01 (Integrations Framework) - Complete

---

## 1. Executive Summary

When clients use platform-shared payment gateways (instead of their own credentials), the platform must:
1. Display transparent pricing before connection
2. Require mandatory acceptance of Terms & Conditions
3. Assess merchant risk level using AI + rules
4. Apply appropriate reserve requirements
5. Track chargebacks, fraud, and financial metrics
6. Manage high-risk merchant classifications
7. Handle upfront payment/deposit requirements

This feature protects the platform from financial exposure while providing clients with easy access to payment processing.

---

## 2. User Stories

### 2.1 Client User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-01 | Client Admin | see pricing before connecting to a shared gateway | I can make informed decisions |
| US-02 | Client Admin | understand what fees apply to my transactions | I can calculate my costs accurately |
| US-03 | Client Admin | review and accept terms before activation | I understand my obligations |
| US-04 | Client Admin | see my risk tier and what it means | I understand why certain requirements apply |
| US-05 | Client Admin | view my reserve balance and release schedule | I can plan my cash flow |
| US-06 | Client Admin | see my chargeback ratio and trends | I can take action before problems escalate |
| US-07 | Client Admin | receive alerts before hitting thresholds | I can avoid account suspension |
| US-08 | Client Finance | export transaction fee reports | I can reconcile my books |
| US-09 | Client Finance | see monthly statements with all fees | I have clear billing records |

### 2.2 Organization Admin User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-10 | Org Admin | configure pricing tiers for shared gateways | I can set competitive rates |
| US-11 | Org Admin | define reserve percentages by risk tier | I protect the platform from losses |
| US-12 | Org Admin | set up terms & conditions templates | clients must accept before using gateways |
| US-13 | Org Admin | view all merchant risk profiles | I can monitor platform exposure |
| US-14 | Org Admin | receive alerts for high-risk merchants | I can take proactive action |
| US-15 | Org Admin | manually adjust risk tiers | I can handle edge cases |
| US-16 | Org Admin | view platform-wide chargeback metrics | I can ensure card network compliance |
| US-17 | Org Admin | configure auto-suspension rules | problematic merchants are handled automatically |
| US-18 | Org Admin | manage reserve releases | I control when funds are released |
| US-19 | Org Admin | generate compliance reports | I can satisfy auditors and card networks |

---

## 3. Functional Requirements

### 3.1 Pricing Display & Configuration

#### FR-3.1.1 Gateway Pricing Tiers
- [ ] Organization can configure multiple pricing tiers per shared gateway
- [ ] Each tier includes:
  - **Application fee** (one-time, default $0 for founders program)
  - Transaction percentage fee (e.g., 2.9%)
  - Transaction flat fee (e.g., $0.30)
  - Chargeback fee (e.g., $15-$35)
  - Refund fee (optional)
  - Monthly minimum (optional)
  - Monthly fee (optional)
- [ ] Tiers are mapped to risk levels (LOW, STANDARD, ELEVATED, HIGH, VERY_HIGH)
- [ ] Volume-based discounts can be configured per tier
- [ ] Founder pricing override (waive fees for early adopters)

#### FR-3.1.2 Pricing Display to Client
- [ ] When client clicks "Connect" on shared gateway, show pricing modal
- [ ] Display applicable tier based on assessed risk level
- [ ] Show breakdown of all fees
- [ ] Show reserve requirements if applicable
- [ ] Show any upfront deposit requirements
- [ ] Allow client to proceed or cancel

#### FR-3.1.3 Fee Calculation & Billing
- [ ] Calculate fees per transaction in real-time
- [ ] Deduct fees from settlement (or invoice separately)
- [ ] Track fee totals by period (daily, monthly)
- [ ] Generate fee statements/invoices
- [ ] Support fee adjustments/credits

### 3.2 Terms & Conditions

#### FR-3.2.1 Terms Document Management
- [ ] Create new terms type: `PAYMENT_PROCESSING_AGREEMENT`
- [ ] Create new terms type: `HIGH_RISK_MERCHANT_AGREEMENT`
- [ ] Create new terms type: `RESERVE_AGREEMENT`
- [ ] Organization can create/edit terms documents
- [ ] Terms have versions and effective dates
- [ ] Terms can be published, archived, superseded

#### FR-3.2.2 Terms Acceptance Flow
- [ ] Client MUST accept terms before shared gateway activation
- [ ] Display full terms with scroll-to-bottom or time delay
- [ ] Checkbox confirmation: "I have read and agree to..."
- [ ] Capture acceptance metadata:
  - User who accepted
  - Timestamp
  - IP address
  - User agent
  - Terms version accepted
  - Pricing tier at time of acceptance
- [ ] Store acceptance record permanently (compliance)

#### FR-3.2.3 Terms Re-Acceptance
- [ ] When terms are updated, flag affected integrations
- [ ] Require re-acceptance before continued use
- [ ] Grace period option (e.g., 30 days to accept new terms)
- [ ] Email notification when new terms require acceptance

### 3.3 Risk Assessment

#### FR-3.3.1 Rule-Based Risk Engine
- [ ] Calculate base risk score from:
  - Industry/MCC code (prohibited, high-risk, standard, low-risk)
  - Business model (subscription, one-time, digital, physical)
  - Average ticket size
  - Requested monthly volume
  - International transaction percentage
  - Time in business
- [ ] Maintain MCC risk classification table
- [ ] Prohibited industries list (adult, gambling in certain jurisdictions, etc.)

#### FR-3.3.2 AI-Enhanced Risk Assessment (Claude via Bedrock)
- [ ] For ELEVATED+ risk or edge cases, invoke AI analysis
- [ ] AI analyzes:
  - Website content (via URL)
  - Business model description
  - Product/service types
  - Historical data if available
- [ ] AI returns structured response:
  - Risk level recommendation
  - Risk score (0-100)
  - Key risk factors
  - Red flags identified
  - Recommended reserve percentage
  - Recommended action (approve/review/decline)
  - Reasoning (for audit)
- [ ] Model selection:
  - Haiku: Quick assessments (~$0.0001/request)
  - Sonnet: Edge cases (~$0.006/request)
  - Opus: Deep underwriting (~$0.075/request)

#### FR-3.3.3 Risk Tier Assignment
- [ ] Map risk score to tier:
  - 0-15: LOW
  - 16-30: STANDARD
  - 31-45: ELEVATED
  - 46-60: HIGH
  - 61+: VERY_HIGH
- [ ] Store risk assessment with full audit trail
- [ ] Allow manual override by Org Admin with reason

#### FR-3.3.4 Ongoing Risk Monitoring
- [ ] Recalculate risk daily based on actual performance
- [ ] Factors for ongoing assessment:
  - Rolling 30-day chargeback ratio
  - Rolling 30-day refund ratio
  - Fraud incidents
  - Velocity anomalies
  - Ticket size changes
- [ ] Automatic tier upgrades/downgrades based on performance
- [ ] Notification when tier changes

#### FR-3.3.5 Soft Pull Credit Check (Phase 2 - Future Enhancement)
> **Note:** This is a future enhancement for high-risk or high-volume merchants.

**What is a Soft Pull?**
A soft credit inquiry that doesn't affect the business owner's credit score but provides financial health indicators.

**Use Cases:**
- [ ] High-risk tier merchants (ELEVATED+) may require soft pull verification
- [ ] Merchants requesting volume limits above $100K/month
- [ ] Merchants in high-risk MCCs requesting reduced reserves
- [ ] Appeals for tier downgrades

**Integration Options:**
| Provider | Type | Cost | Data Provided |
|----------|------|------|---------------|
| Experian Business | Business credit | ~$5/pull | Business credit score, payment history |
| Dun & Bradstreet | Business credit | ~$3/pull | PAYDEX score, D&B rating |
| Plaid | Bank verification | ~$1.50/pull | Bank account verification, balance |
| Middesk | Business verification | ~$2/pull | Business existence, registration |
| Persona | Identity + business | ~$2/pull | KYB verification |

**Soft Pull Flow:**
1. Merchant applies for shared gateway (or tier upgrade)
2. System detects soft pull requirement based on risk factors
3. Merchant consents to soft pull (required disclosure)
4. API call to credit provider
5. Results factor into risk score:
   - Good credit: -10 to -20 risk points
   - Poor credit: +10 to +30 risk points
   - Unable to verify: +15 risk points
6. Store results for audit (encrypted, time-limited access)

**Compliance Requirements:**
- [ ] FCRA compliance (Fair Credit Reporting Act)
- [ ] Clear disclosure and consent before pull
- [ ] Adverse action notice if declined based on credit
- [ ] Data retention policy (max 2 years)
- [ ] Right to dispute findings

**Models (Future):**
```prisma
model SoftPullRequest {
  id                    String   @id @default(cuid())
  merchantRiskProfileId String

  provider              String   // EXPERIAN, DNB, PLAID, etc.
  requestType           String   // BUSINESS_CREDIT, BANK_VERIFY, KYB

  // Consent
  consentedBy           String   // User ID
  consentedAt           DateTime
  consentIpAddress      String

  // Request/Response
  requestedAt           DateTime
  respondedAt           DateTime?
  status                String   // PENDING, SUCCESS, FAILED, NO_DATA

  // Results (encrypted)
  resultData            Json?    // Encrypted credit data
  scoreImpact           Int?     // Points added/removed from risk score

  // Retention
  expiresAt             DateTime // Auto-purge date
  purgedAt              DateTime?

  createdAt             DateTime @default(now())
}
```

**Implementation Priority:** Phase 2+ (after core risk system is stable)

### 3.4 Reserve Management

#### FR-3.4.1 Reserve Configuration
- [ ] Configure reserve percentage per risk tier:
  - LOW: 0%
  - STANDARD: 5%
  - ELEVATED: 7.5%
  - HIGH: 10%
  - VERY_HIGH: 15%
- [ ] Configure hold period per tier (90-180 days)
- [ ] Support rolling reserve (% of each transaction held)
- [ ] Support capped reserve (hold until max reached)

#### FR-3.4.2 Reserve Transactions
- [ ] Record every reserve hold:
  - Amount held
  - Source transaction
  - Release eligible date
- [ ] Record every reserve release:
  - Amount released
  - Destination (settlement, bank account)
- [ ] Record reserve deductions:
  - Chargebacks
  - Fees
  - Manual adjustments
- [ ] Maintain running balance

#### FR-3.4.3 Reserve Release Process
- [ ] Automatic release when hold period expires
- [ ] Hold release if:
  - Account suspended
  - Chargeback ratio exceeds threshold
  - Open disputes exist
- [ ] Manual release by Org Admin
- [ ] Bulk release operations

#### FR-3.4.4 Reserve Reporting
- [ ] Client dashboard: current balance, pending releases, schedule
- [ ] Admin dashboard: total reserves held, aging, risk exposure
- [ ] Reserve statement generation

### 3.5 Chargeback Management

#### FR-3.5.1 Chargeback Tracking
- [ ] Receive chargeback notifications from gateway
- [ ] Record chargeback details:
  - Amount
  - Reason code
  - Original transaction
  - Received date
  - Response deadline
- [ ] Update merchant risk metrics
- [ ] Deduct fee from account/reserve

#### FR-3.5.2 Chargeback Lifecycle
- [ ] Status tracking: OPEN → RESPONDED → WON/LOST/EXPIRED
- [ ] Evidence submission tracking
- [ ] Representment support
- [ ] Outcome recording

#### FR-3.5.3 Chargeback Ratio Monitoring
- [ ] Calculate rolling ratios:
  - By count: chargebacks / transactions
  - By volume: chargeback $ / transaction $
- [ ] Thresholds:
  - Warning: 0.8%
  - Critical: 1.0%
  - Suspension: 1.5%
  - Termination: 2.0%
- [ ] Alerts at each threshold
- [ ] Automatic actions at suspension/termination thresholds

### 3.6 Security Deposits & Upfront Payments

#### FR-3.6.1 Deposit Requirements
- [ ] Configure deposit amounts by risk tier:
  - LOW/STANDARD: None
  - ELEVATED: $500
  - HIGH: $1,000 - $5,000
  - VERY_HIGH: $5,000 - $25,000
- [ ] Collect deposit during onboarding
- [ ] Track deposit status (pending, received, applied, refunded)

#### FR-3.6.2 Deposit Lifecycle
- [ ] Apply deposit to cover losses if needed
- [ ] Refund deposit after good standing period (e.g., 12 months)
- [ ] Partial refund if applied to losses
- [ ] Interest handling (if applicable)

#### FR-3.6.3 Service Credits (Non-Gateway Services)
- [ ] Prepaid credit balance for AI, storage, etc.
- [ ] Credit purchase flow
- [ ] Usage deduction per API call
- [ ] Low balance alerts
- [ ] Auto-reload option

### 3.7 Merchant Account Health

#### FR-3.7.1 Health Dashboard
- [ ] Overall health status: GOOD, WARNING, CRITICAL, SUSPENDED
- [ ] Key metrics display:
  - Chargeback ratio
  - Refund ratio
  - Reserve balance
  - Transaction volume
  - Success rate
- [ ] Trend charts (30, 60, 90 days)
- [ ] Comparison to thresholds

#### FR-3.7.2 Alerts & Notifications
- [ ] Email alerts for:
  - Approaching chargeback threshold
  - Risk tier change
  - Reserve release
  - Terms update required
  - Account status change
- [ ] In-app notifications
- [ ] Webhook notifications (optional)

#### FR-3.7.3 Account Actions
- [ ] Warning issuance (formal notice)
- [ ] Volume limiting
- [ ] Transaction type restrictions
- [ ] Account suspension
- [ ] Account termination
- [ ] Appeals process

---

## 4. Non-Functional Requirements

### 4.1 Performance
- [ ] Risk assessment completes in < 3 seconds
- [ ] AI-enhanced assessment in < 5 seconds
- [ ] Dashboard loads in < 2 seconds
- [ ] Reserve calculations real-time

### 4.2 Security
- [ ] All financial data encrypted at rest
- [ ] Terms acceptance records immutable
- [ ] Risk assessments auditable
- [ ] PCI-DSS compliance for payment data
- [ ] SOC2 compliance for all features

### 4.3 Scalability
- [ ] Support 10,000+ merchants
- [ ] Handle 1M+ transactions/month
- [ ] Reserve calculations performant at scale

### 4.4 Availability
- [ ] Risk assessment available 99.9%
- [ ] Reserve system available 99.99%
- [ ] Graceful degradation if AI unavailable

---

## 5. Data Models

### 5.1 New Prisma Models

```prisma
// ═══════════════════════════════════════════════════════════════
// GATEWAY PRICING
// ═══════════════════════════════════════════════════════════════

model GatewayPricingTier {
  id                    String   @id @default(cuid())
  platformIntegrationId String

  // Tier identification
  tierName              String   // "Standard", "High Volume", "High Risk"
  riskLevel             MerchantRiskLevel

  // Application fee (one-time, $0 for founders)
  applicationFee        Int      @default(0)  // cents, default $0 for founders program
  isFounderPricing      Boolean  @default(false)  // Waive fees for early adopters

  // Transaction fees (stored in cents/basis points)
  transactionPercentage Float    // e.g., 2.9 = 2.9%
  transactionFlat       Int      // cents, e.g., 30 = $0.30

  // Volume-based discounts
  volumeThreshold       Int?     // Monthly volume (cents) for discount
  discountedPercentage  Float?   // Lower rate above threshold

  // Other fees
  chargebackFee         Int      // cents per chargeback
  refundFee             Int?     // cents per refund (optional)
  monthlyMinimum        Int?     // cents
  monthlyFee            Int?     // cents

  // Reserve requirements
  reservePercentage     Float    // 0-15%
  reserveHoldDays       Int      // Days to hold reserve

  // Upfront requirements
  setupFee              Int?     // One-time setup fee (cents)
  securityDeposit       Int?     // Refundable deposit (cents)
  depositRefundMonths   Int?     // Months until deposit refundable

  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  platformIntegration   PlatformIntegration @relation(fields: [platformIntegrationId], references: [id], onDelete: Cascade)

  @@unique([platformIntegrationId, riskLevel])
  @@index([platformIntegrationId])
  @@map("gateway_pricing_tiers")
}

// ═══════════════════════════════════════════════════════════════
// TERMS ACCEPTANCE FOR GATEWAYS
// ═══════════════════════════════════════════════════════════════

model GatewayTermsAcceptance {
  id                    String   @id @default(cuid())
  clientIntegrationId   String   @unique
  clientId              String

  // Main payment processing terms
  paymentTermsId        String
  paymentTermsVersion   String

  // High-risk terms (if applicable)
  highRiskTermsId       String?
  highRiskTermsVersion  String?

  // Reserve terms (if applicable)
  reserveTermsId        String?
  reserveTermsVersion   String?

  // Pricing accepted
  pricingTierId         String

  // Acceptance metadata
  acceptedBy            String   // User ID
  acceptedAt            DateTime @default(now())
  ipAddress             String?
  userAgent             String?

  // E-signature (for high-value/high-risk)
  signatureData         String?  // Base64 signature image
  signatureHash         String?  // SHA-256 of signature

  // Re-acceptance tracking
  supersededAt          DateTime?
  supersededBy          String?  // New acceptance ID

  clientIntegration     ClientIntegration @relation(fields: [clientIntegrationId], references: [id], onDelete: Cascade)
  pricingTier           GatewayPricingTier @relation(fields: [pricingTierId], references: [id])

  @@index([clientId])
  @@index([acceptedAt])
  @@map("gateway_terms_acceptances")
}

// ═══════════════════════════════════════════════════════════════
// MERCHANT RISK PROFILE
// ═══════════════════════════════════════════════════════════════

model MerchantRiskProfile {
  id                    String   @id @default(cuid())
  clientId              String   @unique
  clientIntegrationId   String?

  // Classification
  riskLevel             MerchantRiskLevel @default(STANDARD)
  riskScore             Int       @default(0)  // 0-100
  industryCode          String?   // MCC code
  industryRiskCategory  String?   // LOW, MEDIUM, HIGH, PROHIBITED

  // Business profile (from onboarding)
  businessType          String?   // subscription, one-time, etc.
  avgTicketSize         Int?      // cents
  monthlyVolume         Int?      // cents
  internationalPct      Float?    // 0-100
  yearsInBusiness       Float?

  // Current metrics (rolling 30 days)
  transactionCount30d   Int       @default(0)
  transactionVolume30d  Int       @default(0)  // cents
  chargebackCount30d    Int       @default(0)
  chargebackVolume30d   Int       @default(0)  // cents
  chargebackRatio       Float     @default(0)  // percentage
  refundCount30d        Int       @default(0)
  refundVolume30d       Int       @default(0)
  refundRatio           Float     @default(0)

  // Fraud tracking
  fraudScore            Int?      // AI-calculated 0-100
  fraudIncidents        Int       @default(0)
  lastFraudIncident     DateTime?

  // Reserve tracking
  reservePercentage     Float     @default(0)
  reserveBalance        Int       @default(0)   // cents
  reserveReleasable     Int       @default(0)   // cents eligible for release
  lastReserveRelease    DateTime?

  // Account standing
  accountStatus         MerchantAccountStatus @default(GOOD_STANDING)
  warningCount          Int       @default(0)
  lastWarningAt         DateTime?
  suspendedAt           DateTime?
  suspendedReason       String?

  // Review tracking
  lastAssessmentAt      DateTime?
  nextAssessmentAt      DateTime?
  lastManualReviewAt    DateTime?
  lastManualReviewBy    String?

  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  // Relations
  riskAssessments       MerchantRiskAssessment[]
  reserveTransactions   ReserveTransaction[]
  chargebacks           ChargebackRecord[]
  warnings              MerchantWarning[]

  @@index([riskLevel])
  @@index([accountStatus])
  @@index([chargebackRatio])
  @@map("merchant_risk_profiles")
}

enum MerchantRiskLevel {
  LOW
  STANDARD
  ELEVATED
  HIGH
  VERY_HIGH
  SUSPENDED
}

enum MerchantAccountStatus {
  GOOD_STANDING
  WARNING
  PROBATION
  SUSPENDED
  TERMINATED
}

// ═══════════════════════════════════════════════════════════════
// RISK ASSESSMENT RECORDS (Audit Trail)
// ═══════════════════════════════════════════════════════════════

model MerchantRiskAssessment {
  id                    String   @id @default(cuid())
  merchantRiskProfileId String

  // Assessment type
  assessmentType        String   // ONBOARDING, SCHEDULED, TRIGGERED, MANUAL
  triggerReason         String?  // What triggered this assessment

  // Rule-based results
  ruleScore             Int      // 0-100 from rules
  ruleFactors           Json     // Breakdown of rule scoring

  // AI-enhanced results (if used)
  aiUsed                Boolean  @default(false)
  aiModel               String?  // claude-3-haiku, etc.
  aiScore               Int?     // 0-100 from AI
  aiConfidence          Int?     // 0-100
  aiFactors             Json?    // AI-identified factors
  aiRedFlags            String[] @default([])
  aiReasoning           String?  // AI explanation
  aiRequestId           String?  // For audit/debugging

  // Final decision
  finalScore            Int
  finalRiskLevel        MerchantRiskLevel
  recommendedAction     String   // AUTO_APPROVE, CONDITIONAL, MANUAL_REVIEW, DECLINE
  recommendedReserve    Float?

  // Review (if manual)
  reviewedBy            String?
  reviewedAt            DateTime?
  reviewDecision        String?
  reviewNotes           String?

  createdAt             DateTime @default(now())

  merchantRiskProfile   MerchantRiskProfile @relation(fields: [merchantRiskProfileId], references: [id], onDelete: Cascade)

  @@index([merchantRiskProfileId])
  @@index([createdAt])
  @@map("merchant_risk_assessments")
}

// ═══════════════════════════════════════════════════════════════
// RESERVE TRANSACTIONS
// ═══════════════════════════════════════════════════════════════

model ReserveTransaction {
  id                    String   @id @default(cuid())
  merchantRiskProfileId String

  type                  ReserveTransactionType
  amount                Int      // cents (positive for hold, negative for release/deduct)

  // Reference to source
  transactionId         String?  // If from a payment transaction
  chargebackId          String?  // If deducted for chargeback
  refundId              String?  // If credited for refund

  // Balance tracking
  balanceBefore         Int
  balanceAfter          Int

  // For holds: when eligible for release
  releaseEligibleAt     DateTime?
  releasedAt            DateTime?
  releasedBy            String?  // System or user ID

  // Metadata
  notes                 String?
  createdAt             DateTime @default(now())

  merchantRiskProfile   MerchantRiskProfile @relation(fields: [merchantRiskProfileId], references: [id], onDelete: Cascade)

  @@index([merchantRiskProfileId])
  @@index([releaseEligibleAt])
  @@index([type])
  @@map("reserve_transactions")
}

enum ReserveTransactionType {
  HOLD              // Reserve from transaction
  RELEASE           // Scheduled release
  CHARGEBACK_DEDUCT // Deducted for chargeback
  REFUND_CREDIT     // Credited back on refund
  FEE_DEDUCT        // Fee deduction
  MANUAL_ADJUST     // Manual adjustment
}

// ═══════════════════════════════════════════════════════════════
// CHARGEBACK RECORDS
// ═══════════════════════════════════════════════════════════════

model ChargebackRecord {
  id                    String   @id @default(cuid())
  merchantRiskProfileId String
  transactionId         String

  // Gateway reference
  gatewayChargebackId   String   @unique
  gatewayProvider       String

  // Chargeback details
  amount                Int      // cents
  currency              String   @default("USD")
  reasonCode            String   // e.g., "10.4" for Visa fraud
  reasonCategory        String   // FRAUD, PRODUCT, SERVICE, PROCESSING
  reasonDescription     String?

  // Lifecycle
  status                ChargebackStatus @default(OPEN)
  receivedAt            DateTime
  respondByDate         DateTime?
  respondedAt           DateTime?
  resolvedAt            DateTime?

  // Response/representment
  representmentSent     Boolean  @default(false)
  representmentDate     DateTime?
  evidenceSubmitted     Json?    // { documents: [], notes: '' }

  // Outcome
  outcome               ChargebackOutcome?
  outcomeDate           DateTime?
  recoveredAmount       Int?     // If partial recovery

  // Fees
  feeAmount             Int      // Fee charged to merchant
  feeDeducted           Boolean  @default(false)
  reserveDeducted       Int?     // Amount taken from reserve

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  merchantRiskProfile   MerchantRiskProfile @relation(fields: [merchantRiskProfileId], references: [id], onDelete: Cascade)

  @@index([merchantRiskProfileId])
  @@index([status])
  @@index([receivedAt])
  @@map("chargeback_records")
}

enum ChargebackStatus {
  OPEN
  PENDING_RESPONSE
  RESPONDED
  IN_REVIEW
  WON
  LOST
  EXPIRED
}

enum ChargebackOutcome {
  WON_REVERSAL
  LOST_FINAL
  PARTIAL_RECOVERY
  WITHDRAWN
}

// ═══════════════════════════════════════════════════════════════
// MERCHANT WARNINGS
// ═══════════════════════════════════════════════════════════════

model MerchantWarning {
  id                    String   @id @default(cuid())
  merchantRiskProfileId String

  type                  WarningType
  severity              WarningSeverity

  // Warning details
  title                 String
  description           String
  threshold             String?  // e.g., "1% chargeback ratio"
  currentValue          String?  // e.g., "0.95%"

  // Action required
  actionRequired        String?
  actionDeadline        DateTime?

  // Resolution
  acknowledgedAt        DateTime?
  acknowledgedBy        String?
  resolvedAt            DateTime?
  resolvedBy            String?
  resolutionNotes       String?

  // Auto-actions
  autoActionTriggered   String?  // e.g., "VOLUME_LIMITED"
  autoActionAt          DateTime?

  createdAt             DateTime @default(now())

  merchantRiskProfile   MerchantRiskProfile @relation(fields: [merchantRiskProfileId], references: [id], onDelete: Cascade)

  @@index([merchantRiskProfileId])
  @@index([severity])
  @@index([resolvedAt])
  @@map("merchant_warnings")
}

enum WarningType {
  CHARGEBACK_APPROACHING
  CHARGEBACK_EXCEEDED
  REFUND_HIGH
  FRAUD_DETECTED
  VELOCITY_ANOMALY
  VOLUME_SPIKE
  TERMS_EXPIRING
  DEPOSIT_DUE
}

enum WarningSeverity {
  INFO
  WARNING
  CRITICAL
  URGENT
}

// ═══════════════════════════════════════════════════════════════
// SECURITY DEPOSITS
// ═══════════════════════════════════════════════════════════════

model SecurityDeposit {
  id                    String   @id @default(cuid())
  clientId              String
  clientIntegrationId   String

  // Deposit details
  amount                Int      // cents
  currency              String   @default("USD")

  // Payment
  paymentMethod         String?  // Credit card, ACH, wire
  paymentReference      String?  // Transaction ID
  paidAt                DateTime?

  // Status
  status                DepositStatus @default(PENDING)

  // Application (if used to cover losses)
  appliedAmount         Int      @default(0)  // Amount used for losses
  appliedReason         String?
  appliedAt             DateTime?

  // Refund
  refundEligibleAt      DateTime?  // Based on good standing period
  refundedAmount        Int?
  refundedAt            DateTime?
  refundMethod          String?
  refundReference       String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([clientId])
  @@index([status])
  @@map("security_deposits")
}

enum DepositStatus {
  PENDING
  PAID
  PARTIALLY_APPLIED
  FULLY_APPLIED
  REFUND_ELIGIBLE
  REFUNDED
}

// ═══════════════════════════════════════════════════════════════
// SERVICE CREDITS (Prepaid for non-gateway services)
// ═══════════════════════════════════════════════════════════════

model ServiceCredits {
  id                    String   @id @default(cuid())
  clientId              String
  platformIntegrationId String

  // Balance
  creditBalance         Int      @default(0)  // cents

  // Usage tracking
  lastPurchaseAt        DateTime?
  lastUsageAt           DateTime?
  totalPurchased        Int      @default(0)  // lifetime cents
  totalUsed             Int      @default(0)  // lifetime cents

  // Alerts
  lowBalanceThreshold   Int      @default(1000)  // cents ($10)
  lowBalanceAlertSent   DateTime?

  // Auto-reload
  autoReloadEnabled     Boolean  @default(false)
  autoReloadAmount      Int?     // cents
  autoReloadThreshold   Int?     // cents
  autoReloadPaymentMethod String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  transactions          CreditTransaction[]

  @@unique([clientId, platformIntegrationId])
  @@index([clientId])
  @@map("service_credits")
}

model CreditTransaction {
  id                    String   @id @default(cuid())
  serviceCreditsId      String

  type                  CreditTransactionType
  amount                Int      // cents (positive for purchase, negative for usage)
  balanceAfter          Int

  // For purchases
  paymentMethod         String?
  paymentReference      String?

  // For usage
  usageDescription      String?
  apiCallId             String?
  resourceType          String?  // AI, storage, etc.

  createdAt             DateTime @default(now())

  serviceCredits        ServiceCredits @relation(fields: [serviceCreditsId], references: [id], onDelete: Cascade)

  @@index([serviceCreditsId])
  @@index([createdAt])
  @@map("credit_transactions")
}

enum CreditTransactionType {
  PURCHASE
  USAGE
  REFUND
  ADJUSTMENT
  PROMO_CREDIT
  AUTO_RELOAD
}

// ═══════════════════════════════════════════════════════════════
// MCC RISK CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

model MCCRiskClassification {
  id                    String   @id @default(cuid())
  mccCode               String   @unique
  mccDescription        String

  riskCategory          String   // LOW, MEDIUM, HIGH, PROHIBITED
  riskScore             Int      // Base score 0-50

  // Requirements
  requiresEnhancedDD    Boolean  @default(false)  // Due diligence
  requiresHighRiskTerms Boolean  @default(false)
  minimumReserve        Float?   // Minimum reserve % for this MCC
  maximumTicket         Int?     // Max ticket size allowed

  // Restrictions
  isProhibited          Boolean  @default(false)
  prohibitedReason      String?

  notes                 String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([riskCategory])
  @@map("mcc_risk_classifications")
}
```

### 5.2 Model Relationships

```
PlatformIntegration
    └── GatewayPricingTier[] (one per risk level)

ClientIntegration
    └── GatewayTermsAcceptance (one, required for PLATFORM mode)

Client
    └── MerchantRiskProfile (one)
        ├── MerchantRiskAssessment[] (audit trail)
        ├── ReserveTransaction[] (reserve ledger)
        ├── ChargebackRecord[] (chargeback history)
        └── MerchantWarning[] (warnings/alerts)
    └── SecurityDeposit[] (deposits)
    └── ServiceCredits[] (per service)
```

---

## 6. API Endpoints

### 6.1 Gateway Pricing (Organization Admin)

```
# Pricing Tier Management
GET    /api/admin/gateway-pricing/:integrationId/tiers
POST   /api/admin/gateway-pricing/:integrationId/tiers
PATCH  /api/admin/gateway-pricing/:integrationId/tiers/:tierId
DELETE /api/admin/gateway-pricing/:integrationId/tiers/:tierId

# Preview pricing for client (used during connect flow)
GET    /api/integrations/available/:integrationId/pricing
```

### 6.2 Terms & Conditions

```
# Terms Management (Org Admin)
POST   /api/admin/terms                     # Create terms document
GET    /api/admin/terms                     # List all terms
GET    /api/admin/terms/:id                 # Get terms
PATCH  /api/admin/terms/:id                 # Update terms
POST   /api/admin/terms/:id/publish         # Publish terms

# Terms Acceptance (Client)
GET    /api/integrations/:id/terms          # Get required terms for integration
POST   /api/integrations/:id/terms/accept   # Accept terms
GET    /api/integrations/:id/terms/status   # Check acceptance status
```

### 6.3 Risk Assessment

```
# Risk Profile (Client view)
GET    /api/risk/profile                    # Get own risk profile
GET    /api/risk/profile/assessment-history # View past assessments

# Risk Profile (Org Admin)
GET    /api/admin/risk/profiles             # List all profiles
GET    /api/admin/risk/profiles/:clientId   # Get specific profile
POST   /api/admin/risk/profiles/:clientId/assess   # Trigger assessment
PATCH  /api/admin/risk/profiles/:clientId   # Manual tier override
GET    /api/admin/risk/dashboard            # Risk overview dashboard
```

### 6.4 Reserve Management

```
# Reserve (Client view)
GET    /api/reserves                        # Get own reserve info
GET    /api/reserves/transactions           # Reserve transaction history
GET    /api/reserves/release-schedule       # Upcoming releases

# Reserve (Org Admin)
GET    /api/admin/reserves                  # All reserves summary
GET    /api/admin/reserves/:clientId        # Client reserve detail
POST   /api/admin/reserves/:clientId/release  # Manual release
POST   /api/admin/reserves/:clientId/hold     # Manual hold
GET    /api/admin/reserves/aging            # Aging report
```

### 6.5 Chargeback Management

```
# Chargebacks (Client view)
GET    /api/chargebacks                     # List own chargebacks
GET    /api/chargebacks/:id                 # Get chargeback detail
POST   /api/chargebacks/:id/respond         # Submit evidence

# Chargebacks (Org Admin)
GET    /api/admin/chargebacks               # List all chargebacks
GET    /api/admin/chargebacks/stats         # Chargeback statistics
PATCH  /api/admin/chargebacks/:id           # Update chargeback
```

### 6.6 Deposits & Credits

```
# Security Deposits
GET    /api/deposits                        # Get own deposits
POST   /api/deposits/pay                    # Make deposit payment

# Service Credits
GET    /api/credits                         # Get all credit balances
GET    /api/credits/:integrationId          # Get specific balance
POST   /api/credits/:integrationId/purchase # Buy credits
GET    /api/credits/:integrationId/usage    # Usage history
PATCH  /api/credits/:integrationId/settings # Auto-reload settings
```

---

## 7. UI Components

### 7.1 Client-Facing

| Component | Location | Purpose |
|-----------|----------|---------|
| `PricingModal` | /settings/integrations | Show pricing when connecting |
| `TermsAcceptanceModal` | /settings/integrations | T&C acceptance flow |
| `RiskProfileCard` | /settings/integrations | Show current risk tier |
| `ReserveDashboard` | /settings/integrations | Reserve balance & releases |
| `ChargebackList` | /chargebacks | View/manage chargebacks |
| `DepositStatus` | /settings/integrations | Deposit status/payment |
| `CreditBalance` | /settings/integrations | Service credits |

### 7.2 Organization Admin

| Component | Location | Purpose |
|-----------|----------|---------|
| `PricingTierManager` | /integrations/:id | Configure pricing tiers |
| `TermsEditor` | /settings/terms | Create/edit terms docs |
| `RiskDashboard` | /risk | Platform risk overview |
| `MerchantRiskTable` | /risk/merchants | All merchant profiles |
| `MerchantRiskDetail` | /risk/merchants/:id | Detailed risk view |
| `ReserveManager` | /risk/reserves | Manage all reserves |
| `ChargebackManager` | /risk/chargebacks | Platform-wide chargebacks |
| `MCCEditor` | /settings/mcc | MCC risk classifications |

---

## 8. Integration Points

### 8.1 Payment Gateway Webhooks

Receive from gateway:
- Transaction completed → Update metrics, calculate reserve hold
- Chargeback received → Create ChargebackRecord, update metrics
- Chargeback resolved → Update outcome, adjust reserve

### 8.2 AWS Bedrock (AI)

- Risk assessment requests → Claude Haiku/Sonnet/Opus
- Website analysis → Claude with URL
- Anomaly detection → Claude with metrics

### 8.3 Email System

- Welcome with risk tier info
- Terms update notifications
- Threshold warning alerts
- Reserve release confirmations
- Chargeback notifications
- Account status changes

### 8.4 Audit Logging

All actions logged with:
- `RISK_ASSESSED` - Risk assessment performed
- `RISK_TIER_CHANGED` - Tier upgrade/downgrade
- `TERMS_ACCEPTED` - Terms acceptance
- `RESERVE_HELD` - Reserve transaction
- `RESERVE_RELEASED` - Reserve release
- `CHARGEBACK_RECEIVED` - New chargeback
- `CHARGEBACK_RESPONDED` - Evidence submitted
- `MERCHANT_WARNING` - Warning issued
- `MERCHANT_SUSPENDED` - Account suspended

---

## 9. Implementation Phases

### Phase 1: Foundation (MVP)
**Goal:** Basic pricing display and T&C acceptance

- [ ] GatewayPricingTier model and CRUD
- [ ] Pricing display in connect modal
- [ ] PAYMENT_PROCESSING_AGREEMENT terms type
- [ ] Terms acceptance flow
- [ ] GatewayTermsAcceptance recording
- [ ] Basic risk tier display

### Phase 2: Risk Assessment
**Goal:** Automated risk scoring

- [ ] MerchantRiskProfile model
- [ ] MCCRiskClassification seed data
- [ ] Rule-based risk engine
- [ ] BedrockRiskService for AI assessment
- [ ] Risk assessment during onboarding
- [ ] Risk profile dashboard (client)

### Phase 3: Reserve Management
**Goal:** Reserve tracking and releases

- [ ] ReserveTransaction model
- [ ] Reserve hold on transactions
- [ ] Reserve release scheduling
- [ ] Reserve dashboard (client)
- [ ] Reserve manager (admin)
- [ ] Reserve aging reports

### Phase 4: Chargeback Tracking
**Goal:** Chargeback lifecycle management

- [ ] ChargebackRecord model
- [ ] Gateway webhook integration
- [ ] Chargeback metrics calculation
- [ ] Chargeback alerts
- [ ] Representment workflow
- [ ] Chargeback dashboard

### Phase 5: Ongoing Monitoring
**Goal:** Continuous risk assessment

- [ ] Daily risk recalculation job
- [ ] Threshold monitoring
- [ ] Automatic tier adjustments
- [ ] Warning system
- [ ] Auto-suspension rules
- [ ] Admin alerts dashboard

### Phase 6: Deposits & Credits
**Goal:** Upfront payment handling

- [ ] SecurityDeposit model
- [ ] Deposit collection flow
- [ ] Deposit refund process
- [ ] ServiceCredits model
- [ ] Credit purchase flow
- [ ] Usage tracking
- [ ] Auto-reload

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Onboarding completion | >80% | Clients completing T&C acceptance |
| Risk assessment accuracy | >90% | AI vs actual performance |
| Chargeback ratio | <1% | Platform-wide CB ratio |
| Reserve coverage | 100% | Losses covered by reserves |
| Client satisfaction | >4/5 | Survey on transparency |
| Time to connect | <5 min | Median onboarding time |

---

## 11. Open Questions

1. **Reserve interest** - Do we pay interest on held reserves?
2. **Deposit application** - How are deposits applied to losses?
3. **Appeals process** - How do merchants appeal tier changes?
4. **Card network compliance** - Specific requirements for Visa/MC?
5. **International considerations** - Different rules per region?
6. **Chargeback representment** - Do we help with representment?
7. **Volume limits** - Hard limits or soft warnings?
8. **Termination process** - How long to hold reserves post-termination?

---

## 12. Appendix

### A. MCC Risk Categories (Sample)

| MCC | Description | Risk Category |
|-----|-------------|---------------|
| 5411 | Grocery Stores | LOW |
| 5812 | Restaurants | LOW |
| 7011 | Hotels/Lodging | STANDARD |
| 5999 | Miscellaneous Retail | STANDARD |
| 5122 | Drugs/Pharmaceuticals | MEDIUM |
| 5962 | Direct Marketing | MEDIUM |
| 5967 | Direct Marketing - Inbound | HIGH |
| 5912 | Drug Stores | HIGH |
| 7995 | Gambling/Betting | PROHIBITED |
| 5966 | Direct Marketing - Outbound | PROHIBITED |

### B. Chargeback Reason Codes (Visa)

| Code | Category | Description |
|------|----------|-------------|
| 10.1 | Fraud | EMV Liability Shift |
| 10.2 | Fraud | Non-Receipt of Cash |
| 10.3 | Fraud | Other Fraud |
| 10.4 | Fraud | Card-Absent Fraud |
| 11.1 | Authorization | Card Recovery Bulletin |
| 12.1 | Processing | Late Presentment |
| 13.1 | Consumer | Merchandise Not Received |
| 13.2 | Consumer | Cancelled Recurring |
| 13.3 | Consumer | Not As Described |

---

*Document Version: 1.0*
*Created: December 27, 2025*
*Last Updated: December 27, 2025*
