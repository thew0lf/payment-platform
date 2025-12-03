# Funnel Builder Specification

## Overview

The Funnel Builder is a multi-stage conversion funnel system that allows merchants to create complete customer journeys from discovery to payment. Unlike standalone payment pages, funnels connect multiple page types into a cohesive flow with shared state and analytics.

---

## Table of Contents

1. [Funnel Architecture](#funnel-architecture)
2. [Stage Types](#stage-types)
3. [Data Model](#data-model)
4. [Visual Flow Builder](#visual-flow-builder)
5. [A/B Testing System](#ab-testing-system)
6. [AI Insights Engine](#ai-insights-engine)
7. [Templates System](#templates-system)
8. [Checkout Builder (Phase 1)](#checkout-builder-phase-1)
9. [Product Selection Page (Phase 2)](#product-selection-page-phase-2)
10. [Landing Page Integration (Phase 2)](#landing-page-integration-phase-2)
11. [Funnel Analytics](#funnel-analytics)
12. [Builder UX](#builder-ux)
13. [Hosting & Deployment](#hosting--deployment)
14. [Integration Requirements](#integration-requirements)
15. [Implementation Phases](#implementation-phases)

---

## Product Decisions (Captured)

The following decisions were made during the planning phase:

| Decision Area | Choice | Details |
|--------------|--------|---------|
| **Data Minimum for Insights** | Time + Volume with Confidence Meter | Daily, 3-day, 7-day thresholds AND 100 session minimum; confidence meter shows statistical validity |
| **AI Insight Source** | Hybrid | Rule-based + LLM on-demand for funnel-level; platform aggregate for org-level with proactive email outreach |
| **Action Model** | Client Choice | Options: one-click apply, draft+review, or guided wizard - client configures preference |
| **A/B Test Winner Selection** | Per-Test Configurable | Options 1-3 only (no fully automatic): Manual only, Auto-pause losers, Auto-winner with approval |
| **AI Pricing Model** | Credits System | Monthly allocation included, purchase additional as needed |
| **Insight Timing** | Hybrid Default | Daily digest + on-demand; client can switch to on-demand only to save credits |
| **Alert System** | Fully Configurable | Notifications based on user preferences |
| **Canvas Technology** | Third-Party Builder | Use existing library for faster shipping |
| **Benchmark Data** | Scoped Access | Clients see only their own data; org-level sees all aggregate benchmarks |
| **Payment Pages Migration** | Evaluate or Remove | Evaluate existing payment pages for migration; remove if not needed - don't force legacy patterns |
| **Templates** | Full Funnel + Components | Both full funnel templates and component templates; functional demos at `/preview/{template}` |
| **Integrations** | All New Implementations | All new features MUST be added to the Integrations framework |

---

## Funnel Architecture

### Visual Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FUNNEL                                          │
│                                                                              │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐           │
│  │              │    │                  │    │                  │           │
│  │   Landing    │───►│    Product       │───►│    Checkout      │───► Done  │
│  │    Page      │    │   Selection      │    │     Page         │           │
│  │              │    │                  │    │                  │           │
│  └──────────────┘    └──────────────────┘    └──────────────────┘           │
│                                                                              │
│  Stage 1             Stage 2                  Stage 3                        │
│  (Optional)          (Optional)               (Required)                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Funnel Types

| Type | Stages | Use Case |
|------|--------|----------|
| **Direct Checkout** | Checkout only | Single product, link in email |
| **Product → Checkout** | Product Selection → Checkout | Multiple products/variants |
| **Full Funnel** | Landing → Product → Checkout | Complete marketing funnel |
| **Landing → Checkout** | Landing → Checkout | Single product with marketing |

### Shared State Across Stages

```typescript
interface FunnelSession {
  id: string;
  funnelId: string;

  // Progress tracking
  currentStage: number;
  completedStages: string[];

  // Accumulated data
  selectedProducts: SelectedProduct[];
  customerInfo: Partial<CustomerInfo>;
  customFields: Record<string, unknown>;

  // Attribution
  entryUrl: string;
  utmParams: UTMParams;
  referrer: string;

  // Timestamps
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
}
```

---

## Stage Types

### 1. Landing Page Stage

**Purpose:** Attract and convert visitors with marketing content.

**Components:**
- Hero section (headline, subheadline, CTA)
- Features/benefits grid
- Social proof (testimonials, logos, stats)
- FAQ section
- Final CTA

**Output:** Visitor clicks through to next stage

**Existing Asset:** `/landing-pages` module (can be integrated)

---

### 2. Product Selection Stage

**Purpose:** Allow customers to browse, compare, and select products before checkout.

**Layout Options:**

#### A. Gallery/Grid View
```
┌─────────────────────────────────────────────────────┐
│  Choose Your Coffee                                  │
├─────────┬─────────┬─────────┬─────────┬─────────────┤
│ ┌─────┐ │ ┌─────┐ │ ┌─────┐ │ ┌─────┐ │             │
│ │     │ │ │     │ │ │     │ │ │     │ │  Filters    │
│ │ IMG │ │ │ IMG │ │ │ IMG │ │ │ IMG │ │  ─────────  │
│ │     │ │ │     │ │ │     │ │ │     │ │  □ Light    │
│ └─────┘ │ └─────┘ │ └─────┘ │ └─────┘ │  □ Medium   │
│ Ethiopian│ Colombian│ Brazilian│ Kenyan │  □ Dark     │
│ $18.99  │ $16.99  │ $14.99  │ $19.99  │             │
│ [Select]│ [Select]│ [Select]│ [Select]│             │
└─────────┴─────────┴─────────┴─────────┴─────────────┘
```

#### B. Carousel/Slider View (Trials)
```
┌─────────────────────────────────────────────────────┐
│              Try Our Best Sellers                    │
│                                                      │
│    ◄    ┌───────────────────────────┐    ►          │
│         │                           │               │
│         │      [Product Image]      │               │
│         │                           │               │
│         │    Ethiopian Yirgacheffe   │               │
│         │    Light Roast • Fruity    │               │
│         │                           │               │
│         │    $18.99 / 12oz bag      │               │
│         │                           │               │
│         │  [Try This One]           │               │
│         └───────────────────────────┘               │
│                                                      │
│              ○ ○ ● ○ ○  (1 of 5)                    │
└─────────────────────────────────────────────────────┘
```

#### C. Comparison Table
```
┌─────────────────────────────────────────────────────┐
│  Compare Plans                                       │
├─────────────┬─────────────┬─────────────┬───────────┤
│             │   Starter   │     Pro     │ Enterprise│
├─────────────┼─────────────┼─────────────┼───────────┤
│ Price       │   $9/mo     │   $29/mo    │  $99/mo   │
│ Users       │     1       │     5       │ Unlimited │
│ Storage     │    5GB      │    50GB     │   500GB   │
│ Support     │   Email     │   Priority  │ Dedicated │
│             │  [Select]   │  [Select]   │ [Select]  │
└─────────────┴─────────────┴─────────────┴───────────┘
```

#### D. Product Detail (Single Focus)
```
┌─────────────────────────────────────────────────────┐
│  ┌─────────────────┐  │  Ethiopian Yirgacheffe      │
│  │                 │  │  ─────────────────────────  │
│  │                 │  │  Light roast with bright    │
│  │  [Main Image]   │  │  citrus notes and a clean,  │
│  │                 │  │  tea-like body.             │
│  │                 │  │                             │
│  └─────────────────┘  │  Roast:  ○ Light ● Medium   │
│  ┌───┐ ┌───┐ ┌───┐    │  Size:   ● 12oz  ○ 2lb     │
│  │   │ │   │ │   │    │  Grind:  ● Whole ○ Ground  │
│  └───┘ └───┘ └───┘    │                             │
│  (thumbnails)          │  $18.99                     │
│                        │                             │
│                        │  [Add to Cart]              │
│                        │  [Buy Now →]                │
└────────────────────────┴─────────────────────────────┘
```

**Features:**
- Product filtering and sorting
- Variant selection (size, color, etc.)
- Quantity selection
- Add to cart / direct checkout
- Product comparison
- Quick view modal

**Output:** Selected products passed to checkout stage

---

### 3. Checkout Stage

**Purpose:** Collect payment and complete the transaction.

**Reference:** Stripe's checkout builder at `checkout.stripe.dev/checkout`

**Layout Options:**

#### A. Single Page
All fields visible, scrollable form

#### B. Multi-Step Wizard
```
Step 1: Customer Info  →  Step 2: Shipping  →  Step 3: Payment  →  Confirm
   ●────────────────────────○────────────────────○────────────────────○
```

#### C. Two-Column Split
```
┌────────────────────────┬─────────────────────────┐
│                        │                         │
│    Order Summary       │    Payment Form         │
│    ─────────────       │    ────────────         │
│                        │                         │
│    Product 1    $99    │    Email                │
│    Product 2    $49    │    ┌─────────────────┐  │
│    ─────────────────   │    │                 │  │
│    Subtotal    $148    │    └─────────────────┘  │
│    Shipping     $10    │                         │
│    ─────────────────   │    Card Number          │
│    Total       $158    │    ┌─────────────────┐  │
│                        │    │                 │  │
│                        │    └─────────────────┘  │
│                        │                         │
│                        │    [Pay $158]           │
│                        │                         │
└────────────────────────┴─────────────────────────┘
```

**Sections:**
1. **Order Summary** - Products, quantities, prices
2. **Customer Information** - Email, name, phone
3. **Shipping Address** (if physical goods)
4. **Billing Address** (if different)
5. **Shipping Method** (options with prices)
6. **Payment Method** - Card, PayPal, Apple Pay, etc.
7. **Promo/Coupon Code**
8. **Order Notes** (optional)
9. **Terms & Consent** checkboxes

**Payment Methods:**
- Credit/Debit Card (Stripe, NMI, Authorize.net)
- PayPal
- Apple Pay / Google Pay
- Buy Now Pay Later (Klarna, Affirm, Afterpay)
- Bank Transfer / ACH
- Crypto (optional)

---

## Data Model

### Core Entities

```prisma
// ═══════════════════════════════════════════════════════════════
// FUNNEL
// ═══════════════════════════════════════════════════════════════

model Funnel {
  id              String          @id @default(cuid())
  companyId       String
  company         Company         @relation(fields: [companyId], references: [id])

  // Basic Info
  name            String
  slug            String          // URL path: /f/{slug}
  description     String?

  // Configuration
  type            FunnelType      // DIRECT_CHECKOUT, PRODUCT_CHECKOUT, FULL_FUNNEL
  status          FunnelStatus    // DRAFT, PUBLISHED, ARCHIVED

  // Stages (ordered)
  stages          FunnelStage[]

  // Settings
  settings        Json            // FunnelSettings

  // A/B Testing
  variants        FunnelVariant[]
  activeTestId    String?         // Current A/B test

  // Analytics
  totalVisits     Int             @default(0)
  totalConversions Int            @default(0)

  // Timestamps
  publishedAt     DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  // Relations
  sessions        FunnelSession[]
  aiInsights      FunnelAIInsight[]

  @@unique([companyId, slug])
  @@index([companyId])
  @@index([status])
}

enum FunnelType {
  DIRECT_CHECKOUT     // Checkout only
  PRODUCT_CHECKOUT    // Product Selection → Checkout
  LANDING_CHECKOUT    // Landing → Checkout
  FULL_FUNNEL         // Landing → Product → Checkout
}

enum FunnelStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

// ═══════════════════════════════════════════════════════════════
// FUNNEL STAGE
// ═══════════════════════════════════════════════════════════════

model FunnelStage {
  id              String          @id @default(cuid())
  funnelId        String
  funnel          Funnel          @relation(fields: [funnelId], references: [id], onDelete: Cascade)

  // Stage Info
  name            String          // "Landing", "Products", "Checkout"
  type            StageType
  order           Int             // 0, 1, 2...

  // Stage Configuration (polymorphic)
  config          Json            // LandingConfig | ProductSelectionConfig | CheckoutConfig

  // Design
  themeId         String?
  theme           CheckoutPageTheme? @relation(fields: [themeId], references: [id])
  customStyles    Json?

  // Timestamps
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@unique([funnelId, order])
  @@index([funnelId])
}

enum StageType {
  LANDING
  PRODUCT_SELECTION
  CHECKOUT
}

// ═══════════════════════════════════════════════════════════════
// FUNNEL SESSION (Visitor Journey)
// ═══════════════════════════════════════════════════════════════

model FunnelSession {
  id              String          @id @default(cuid())
  funnelId        String
  funnel          Funnel          @relation(fields: [funnelId], references: [id])

  // Session Token (for anonymous tracking)
  sessionToken    String          @unique

  // A/B Test Assignment
  variantId       String?
  variant         FunnelVariant?  @relation(fields: [variantId], references: [id])

  // Progress
  currentStageOrder Int           @default(0)
  completedStages   Int[]         @default([])
  status          SessionStatus   @default(ACTIVE)

  // Collected Data
  selectedProducts  Json          @default("[]")  // SelectedProduct[]
  customerInfo      Json          @default("{}")  // Partial<CustomerInfo>
  shippingAddress   Json?
  billingAddress    Json?
  customFields      Json          @default("{}")

  // Attribution
  entryUrl        String?
  utmSource       String?
  utmMedium       String?
  utmCampaign     String?
  utmTerm         String?
  utmContent      String?
  referrer        String?
  userAgent       String?
  ipAddress       String?

  // Device Info
  deviceType      String?         // mobile, tablet, desktop
  browser         String?
  os              String?

  // Outcome
  orderId         String?         @unique
  order           Order?          @relation(fields: [orderId], references: [id])

  // Timestamps
  startedAt       DateTime        @default(now())
  lastActivityAt  DateTime        @default(now())
  completedAt     DateTime?
  abandonedAt     DateTime?

  // Events for detailed tracking
  events          FunnelEvent[]

  @@index([funnelId])
  @@index([status])
  @@index([startedAt])
  @@index([variantId])
}

enum SessionStatus {
  ACTIVE
  COMPLETED
  ABANDONED
  EXPIRED
}

// ═══════════════════════════════════════════════════════════════
// FUNNEL EVENT (Granular Tracking)
// ═══════════════════════════════════════════════════════════════

model FunnelEvent {
  id              String          @id @default(cuid())
  sessionId       String
  session         FunnelSession   @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  // Event Info
  type            FunnelEventType
  stageOrder      Int

  // Event Data
  data            Json            @default("{}")

  // Timestamp
  timestamp       DateTime        @default(now())

  @@index([sessionId])
  @@index([type])
  @@index([timestamp])
}

enum FunnelEventType {
  // Navigation
  STAGE_ENTERED
  STAGE_COMPLETED
  STAGE_ABANDONED

  // Product Selection
  PRODUCT_VIEWED
  PRODUCT_ADDED
  PRODUCT_REMOVED
  QUANTITY_CHANGED

  // Checkout
  CHECKOUT_STARTED
  FIELD_COMPLETED
  PAYMENT_METHOD_SELECTED
  COUPON_APPLIED
  COUPON_FAILED

  // Conversion
  PAYMENT_INITIATED
  PAYMENT_COMPLETED
  PAYMENT_FAILED

  // Other
  ERROR_OCCURRED
  CUSTOM_EVENT
}

// ═══════════════════════════════════════════════════════════════
// A/B TESTING
// ═══════════════════════════════════════════════════════════════

model FunnelVariant {
  id              String          @id @default(cuid())
  funnelId        String
  funnel          Funnel          @relation(fields: [funnelId], references: [id], onDelete: Cascade)

  // Variant Info
  name            String          // "Control", "Variant A", "Variant B"
  description     String?
  isControl       Boolean         @default(false)

  // Traffic Allocation
  trafficWeight   Int             @default(50) // Percentage

  // Configuration Override
  stageOverrides  Json?           // Overrides for specific stages

  // Status
  status          VariantStatus   @default(ACTIVE)

  // Metrics (denormalized for performance)
  totalSessions   Int             @default(0)
  conversions     Int             @default(0)
  revenue         Decimal         @default(0) @db.Decimal(10, 2)

  // Timestamps
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  // Relations
  sessions        FunnelSession[]
  testResults     ABTestResult[]

  @@index([funnelId])
  @@index([status])
}

enum VariantStatus {
  ACTIVE
  PAUSED
  WINNER
  LOSER
}

model ABTest {
  id              String          @id @default(cuid())
  funnelId        String

  // Test Info
  name            String
  hypothesis      String?

  // Configuration
  winnerSelectionMode WinnerSelectionMode @default(MANUAL)
  minimumSessions Int             @default(100)
  confidenceThreshold Decimal     @default(0.95) @db.Decimal(3, 2)

  // Auto-actions
  autoPauseLosers Boolean         @default(false)
  autoSelectWinner Boolean        @default(false)
  requireApproval Boolean         @default(true)

  // Status
  status          ABTestStatus    @default(RUNNING)

  // Results
  winnerId        String?

  // Timestamps
  startedAt       DateTime        @default(now())
  endedAt         DateTime?

  // Relations
  results         ABTestResult[]

  @@index([funnelId])
  @@index([status])
}

enum WinnerSelectionMode {
  MANUAL              // Option 1: Manual only
  AUTO_PAUSE_LOSERS   // Option 2: Auto-pause losers, manual winner
  AUTO_WITH_APPROVAL  // Option 3: Auto-select winner, requires approval
}

enum ABTestStatus {
  DRAFT
  RUNNING
  PAUSED
  COMPLETED
  CANCELLED
}

model ABTestResult {
  id              String          @id @default(cuid())
  testId          String
  test            ABTest          @relation(fields: [testId], references: [id], onDelete: Cascade)
  variantId       String
  variant         FunnelVariant   @relation(fields: [variantId], references: [id])

  // Metrics at snapshot time
  sessions        Int
  conversions     Int
  conversionRate  Decimal         @db.Decimal(5, 4)
  revenue         Decimal         @db.Decimal(10, 2)
  avgOrderValue   Decimal         @db.Decimal(10, 2)

  // Statistical Analysis
  confidenceLevel Decimal         @db.Decimal(5, 4)
  improvementOverControl Decimal? @db.Decimal(6, 4)
  isStatisticallySignificant Boolean @default(false)

  // Timestamp
  calculatedAt    DateTime        @default(now())

  @@index([testId])
  @@index([variantId])
}

// ═══════════════════════════════════════════════════════════════
// AI INSIGHTS
// ═══════════════════════════════════════════════════════════════

model FunnelAIInsight {
  id              String          @id @default(cuid())
  funnelId        String
  funnel          Funnel          @relation(fields: [funnelId], references: [id], onDelete: Cascade)

  // Insight Info
  type            AIInsightType
  category        String          // "conversion", "pricing", "ux", "copy"
  title           String
  description     String          @db.Text

  // Confidence
  confidenceScore Decimal         @db.Decimal(3, 2) // 0.00 - 1.00
  dataPoints      Int             // Number of sessions analyzed

  // Recommendation
  recommendation  Json            // Specific changes suggested
  estimatedImpact String?         // "Potential +15% conversion"

  // Action Status
  status          InsightStatus   @default(PENDING)
  actionTaken     String?
  actionTakenAt   DateTime?
  actionTakenBy   String?

  // Source
  source          InsightSource   // RULE_BASED or LLM
  creditsUsed     Int             @default(0)

  // Timestamps
  generatedAt     DateTime        @default(now())
  expiresAt       DateTime?       // Insights may become stale

  @@index([funnelId])
  @@index([status])
  @@index([type])
}

enum AIInsightType {
  DROP_OFF_ALERT
  CONVERSION_OPPORTUNITY
  PRICING_SUGGESTION
  UX_IMPROVEMENT
  COPY_ENHANCEMENT
  AB_TEST_RECOMMENDATION
  SEGMENT_INSIGHT
  BENCHMARK_COMPARISON
}

enum InsightStatus {
  PENDING           // Not reviewed
  APPLIED           // Changes applied
  DISMISSED         // Ignored by user
  EXPIRED           // No longer relevant
}

enum InsightSource {
  RULE_BASED        // Deterministic rules
  LLM               // AI-generated (uses credits)
}

// ═══════════════════════════════════════════════════════════════
// AI CREDITS
// ═══════════════════════════════════════════════════════════════

model AICreditsBalance {
  id              String          @id @default(cuid())
  companyId       String          @unique
  company         Company         @relation(fields: [companyId], references: [id])

  // Balance
  monthlyAllocation Int           @default(100)
  currentBalance  Int             @default(100)
  purchasedCredits Int            @default(0)

  // Reset
  lastResetAt     DateTime        @default(now())
  nextResetAt     DateTime

  // Timestamps
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

model AICreditsUsage {
  id              String          @id @default(cuid())
  companyId       String

  // Usage Info
  action          String          // "funnel_insight", "copy_generation", etc.
  creditsUsed     Int
  funnelId        String?

  // Timestamp
  usedAt          DateTime        @default(now())

  @@index([companyId])
  @@index([usedAt])
}

// ═══════════════════════════════════════════════════════════════
// FUNNEL TEMPLATES
// ═══════════════════════════════════════════════════════════════

model FunnelTemplate {
  id              String          @id @default(cuid())

  // Template Info
  name            String
  slug            String          @unique  // For /preview/{slug}
  description     String
  thumbnail       String          // Preview image URL

  // Type
  templateType    TemplateType    // FULL_FUNNEL or COMPONENT
  category        String          // "ecommerce", "saas", "donations", etc.

  // Configuration
  config          Json            // Full funnel or component config

  // Demo
  demoUrl         String?         // Functional demo URL

  // Metadata
  featured        Boolean         @default(false)
  industry        String[]        // ["coffee", "retail", "subscription"]
  tags            String[]

  // Stats
  usageCount      Int             @default(0)

  // Timestamps
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([category])
  @@index([templateType])
}

enum TemplateType {
  FULL_FUNNEL     // Complete funnel with all stages
  COMPONENT       // Single stage/component template
}
```

### Configuration Types

```typescript
// ═══════════════════════════════════════════════════════════════
// FUNNEL SETTINGS
// ═══════════════════════════════════════════════════════════════

interface FunnelSettings {
  // Branding
  branding: {
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor: string;
    secondaryColor?: string;
    fontFamily?: string;
  };

  // URLs
  urls: {
    successUrl?: string;      // Redirect after purchase
    cancelUrl?: string;       // Redirect on cancel
    termsUrl?: string;
    privacyUrl?: string;
  };

  // Behavior
  behavior: {
    allowBackNavigation: boolean;
    showProgressBar: boolean;
    autoSaveProgress: boolean;
    sessionTimeout: number;   // minutes
    abandonmentEmail: boolean;
  };

  // SEO
  seo: {
    title?: string;
    description?: string;
    ogImage?: string;
  };

  // AI Settings
  ai: {
    insightsEnabled: boolean;
    insightTiming: 'daily_digest' | 'on_demand' | 'hybrid';
    actionMode: 'one_click' | 'draft_review' | 'guided_wizard';
  };
}

// ═══════════════════════════════════════════════════════════════
// STAGE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

interface LandingStageConfig {
  layout: 'hero-cta' | 'video-hero' | 'feature-grid' | 'testimonial-focus';
  sections: LandingSection[];
  cta: {
    text: string;
    style: 'solid' | 'gradient' | 'outline';
  };
}

interface ProductSelectionConfig {
  layout: 'grid' | 'carousel' | 'comparison' | 'single-product';

  // Product Source
  source: {
    type: 'manual' | 'category' | 'collection' | 'all';
    productIds?: string[];
    categoryId?: string;
    collectionId?: string;
  };

  // Display Options
  display: {
    showPrices: boolean;
    showDescription: boolean;
    showVariants: boolean;
    showQuantity: boolean;
    showFilters: boolean;
    showSearch: boolean;
    itemsPerPage: number;
  };

  // Selection Behavior
  selection: {
    mode: 'single' | 'multiple';
    minItems?: number;
    maxItems?: number;
    allowQuantity: boolean;
  };

  // CTA
  cta: {
    text: string;  // "Continue to Checkout", "Add to Cart"
    position: 'per-item' | 'fixed-bottom' | 'both';
  };
}

interface CheckoutStageConfig {
  layout: 'single-page' | 'multi-step' | 'two-column' | 'one-column';

  // Steps (for multi-step layout)
  steps?: CheckoutStep[];

  // Fields Configuration
  fields: {
    customer: CustomerFieldsConfig;
    shipping: ShippingFieldsConfig;
    billing: BillingFieldsConfig;
    custom: CustomField[];
  };

  // Payment
  payment: {
    methods: PaymentMethodConfig[];
    showOrderSummary: boolean;
    allowCoupons: boolean;
    allowGiftCards: boolean;
    showTaxEstimate: boolean;
    showShippingEstimate: boolean;
  };

  // Trust Elements
  trust: {
    showSecurityBadges: boolean;
    showGuarantee: boolean;
    showTestimonial: boolean;
    guaranteeText?: string;
  };

  // Upsells
  upsells?: {
    enabled: boolean;
    products: string[];
    position: 'before-payment' | 'after-payment' | 'modal';
  };
}

interface CheckoutStep {
  id: string;
  name: string;
  icon?: string;
  fields: string[];  // Field IDs to show in this step
}

interface CustomerFieldsConfig {
  email: FieldConfig;
  firstName: FieldConfig;
  lastName: FieldConfig;
  phone: FieldConfig;
  company: FieldConfig;
}

interface FieldConfig {
  enabled: boolean;
  required: boolean;
  label?: string;
  placeholder?: string;
}

interface CustomField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'time' | 'datetime' | 'file';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: { label: string; value: string }[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  conditional?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains';
    value: string;
  };
}

interface PaymentMethodConfig {
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay' | 'bank' | 'klarna' | 'affirm';
  enabled: boolean;
  label?: string;
  description?: string;
}
```

---

## Visual Flow Builder

### Overview

The Visual Flow Builder is a drag-and-drop canvas for designing funnel flows with A/B variant support. Uses a third-party library for the canvas rendering.

### Canvas Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back    Coffee Trial Funnel                    [Test] [Save] [Publish]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Variants: [Control ▼] [+ Add Variant]     Traffic: Control 50% | A 50%     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                            VISUAL FLOW CANVAS                                │
│                                                                              │
│       ┌─────────┐         ┌─────────┐         ┌─────────┐                   │
│       │         │         │         │         │         │                   │
│       │ Landing │────────►│ Product │────────►│Checkout │────► ✓ Success    │
│       │  Page   │         │Selection│         │  Page   │                   │
│       │         │         │         │         │         │                   │
│       └─────────┘         └─────────┘         └─────────┘                   │
│           │                   │                   │                          │
│        [Edit]              [Edit]              [Edit]                        │
│                                                                              │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                                                              │
│  📊 Stage Metrics (Live)                                                     │
│  ┌────────────────┬────────────────┬────────────────┐                       │
│  │ Landing: 1,234 │ Selection: 892 │ Checkout: 456  │  Conversions: 312     │
│  │ (100%)         │ (72.3%)        │ (51.1%)        │  (68.4%)              │
│  └────────────────┴────────────────┴────────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Variant Switching

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Variants: [Control ✓] [Variant A] [+ Add Variant]                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    VARIANT A CANVAS                                  │    │
│  │                                                                      │    │
│  │       ┌─────────┐         ┌─────────┐                               │    │
│  │       │         │         │         │                               │    │
│  │       │ Landing │────────►│Checkout │────► ✓ Success                │    │
│  │       │  Page   │         │  Page   │                               │    │
│  │       │ (v2)    │         │ (same)  │   [Skipped Product Selection] │    │
│  │       └─────────┘         └─────────┘                               │    │
│  │           │                   │                                      │    │
│  │        [Edit]              [Edit]                                    │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Variant A: Testing direct-to-checkout flow (no product selection)          │
│  Traffic: 50% | Sessions: 423 | Conversions: 89 (21.0%)                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Node Types

| Node | Icon | Description |
|------|------|-------------|
| Landing Page | 🏠 | Marketing landing page |
| Product Selection | 🛍️ | Product browsing/selection |
| Checkout | 💳 | Payment collection |
| Success | ✓ | Completion confirmation |
| Conditional | ◇ | Branch based on condition |

### Drag & Drop Features

- Add new stages from palette
- Reorder stages by dragging
- Delete stages with confirmation
- Connect stages with arrows
- Clone stages between variants

---

## A/B Testing System

### Test Configuration

```typescript
interface ABTestConfig {
  name: string;
  hypothesis: string;

  // Winner Selection Mode (Options 1-3 only, no fully automatic)
  winnerSelectionMode:
    | 'MANUAL'             // Option 1: Manual only
    | 'AUTO_PAUSE_LOSERS'  // Option 2: Auto-pause losers, manual winner select
    | 'AUTO_WITH_APPROVAL' // Option 3: Auto-select winner, requires approval

  // Thresholds
  minimumSessions: number;        // Default: 100
  confidenceThreshold: number;    // Default: 0.95 (95%)

  // Time-based thresholds (confidence meter)
  timeThresholds: {
    daily: boolean;    // Show daily stats
    threeDays: boolean; // Show 3-day stats
    sevenDays: boolean; // Show 7-day stats
  };
}
```

### Confidence Meter UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  A/B Test: Landing Page Headline                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CONFIDENCE METER                                                            │
│  ════════════════                                                            │
│                                                                              │
│  Volume: ████████████████░░░░░░░░░░░░░░░  542 / 1,000 sessions (54%)        │
│                                                                              │
│  Time-Based Confidence:                                                      │
│  ├── Daily (24hr):    ████░░░░░░  Low confidence - insufficient data         │
│  ├── 3-Day:           ██████████  Medium - trending significant              │
│  └── 7-Day:           ░░░░░░░░░░  Pending - test running 3 days              │
│                                                                              │
│  Statistical Significance: 87.3% (target: 95%)                               │
│                                                                              │
│  ┌─────────────────┬─────────────────┐                                      │
│  │    CONTROL      │    VARIANT A    │                                      │
│  │    (Original)   │    (New Hero)   │                                      │
│  ├─────────────────┼─────────────────┤                                      │
│  │  Sessions: 271  │  Sessions: 271  │                                      │
│  │  Conv: 45 (16%) │  Conv: 62 (23%) │  ← +43% improvement                  │
│  │  AOV: $47.20    │  AOV: $52.10    │  ← +10% AOV                          │
│  │  Revenue: $2,124│  Revenue: $3,230│                                      │
│  └─────────────────┴─────────────────┘                                      │
│                                                                              │
│  ⚠️ Not yet statistically significant. Continue test.                        │
│                                                                              │
│  [Pause Test]  [End Test]  [Declare Winner ▼]                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Winner Selection Modes

#### Option 1: Manual Only
- All decisions made by user
- No automatic actions
- Dashboard shows recommendations only

#### Option 2: Auto-Pause Losers
- Automatically pauses variants performing significantly worse
- User manually selects winner
- Prevents wasted traffic on clear losers

#### Option 3: Auto-Winner with Approval
- System identifies winner when statistically significant
- Sends notification for approval
- User must confirm before changes apply
- **Never automatically applies changes without approval**

---

## AI Insights Engine

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI INSIGHTS ENGINE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐         ┌─────────────────┐         ┌────────────────┐ │
│  │                 │         │                 │         │                │ │
│  │   Rule-Based    │────────►│    Insight      │────────►│   Dashboard    │ │
│  │   Analysis      │         │   Aggregator    │         │   Display      │ │
│  │   (Free)        │         │                 │         │                │ │
│  │                 │         └────────┬────────┘         └────────────────┘ │
│  └─────────────────┘                  │                                     │
│                                       │                                     │
│  ┌─────────────────┐                  │                                     │
│  │                 │                  │                                     │
│  │   LLM Analysis  │──────────────────┘                                     │
│  │   (Credits)     │                                                        │
│  │                 │                                                        │
│  └─────────────────┘                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Rule-Based Insights (Free)

- Drop-off rate exceeds threshold
- Conversion rate below benchmark
- Mobile vs desktop discrepancy
- Time-on-page anomalies
- Payment failure patterns
- Abandonment triggers

### LLM Insights (Credits)

- Copy optimization suggestions
- UX improvement recommendations
- Pricing strategy analysis
- Competitor benchmarking
- Personalization opportunities

### Credits System

```typescript
interface AICreditsConfig {
  // Monthly allocation (included with plan)
  monthlyAllocation: number;  // e.g., 100 credits/month

  // Pricing for additional credits
  additionalCreditPrice: number;  // e.g., $0.10/credit

  // Credit costs per action
  costs: {
    funnelInsight: 5;
    copyGeneration: 3;
    abTestAnalysis: 10;
    fullFunnelAudit: 25;
  };

  // Reset schedule
  resetDay: number;  // Day of month (1-28)
}
```

### Insight Timing Options

#### Daily Digest (Default)
- Aggregated insights delivered once per day
- Lower credit usage
- Email summary at configured time

#### On-Demand
- Insights generated when requested
- Higher credit usage
- Immediate results

#### Hybrid (Recommended Default)
- Daily digest for routine monitoring
- On-demand for specific questions
- Client can switch to on-demand only to save credits

### Insight Action Modes

#### One-Click Apply
- Single button to apply suggestion
- Immediate change with undo option
- Best for simple changes

#### Draft + Review
- Creates draft version with changes
- User reviews before publishing
- Audit trail of changes

#### Guided Wizard
- Step-by-step walkthrough
- Explains rationale for each change
- Educational approach

### Alert Configuration

```typescript
interface AlertPreferences {
  // Delivery channels
  channels: {
    email: boolean;
    inApp: boolean;
    slack?: string;  // Webhook URL
  };

  // Alert types
  alerts: {
    criticalDropOff: boolean;     // >50% drop from baseline
    significantImprovement: boolean;
    abTestReady: boolean;
    creditsLow: boolean;
    weeklyDigest: boolean;
  };

  // Quiet hours
  quietHours?: {
    enabled: boolean;
    start: string;  // "22:00"
    end: string;    // "08:00"
    timezone: string;
  };
}
```

### Benchmark Access

#### Client Level
- Sees only their own funnel data
- Comparisons against their historical performance
- No cross-client visibility

#### Organization Level (Aggregate)
- Sees anonymized aggregate benchmarks
- Industry comparisons
- Can send proactive emails with insights

---

## Templates System

### Template Types

#### Full Funnel Templates
Complete funnels with all stages pre-configured.

| Template | Stages | Use Case |
|----------|--------|----------|
| E-commerce Starter | Landing → Products → Checkout | Online stores |
| SaaS Trial | Landing → Pricing → Checkout | Software trials |
| Course Launch | Landing → Checkout | Digital products |
| Donation | Landing → Checkout | Non-profits |
| Event Registration | Landing → Tickets → Checkout | Events |

#### Component Templates
Individual stage templates for mixing.

| Category | Templates |
|----------|-----------|
| Landing Pages | Hero, Video, Features, Testimonials |
| Product Selection | Grid, Carousel, Comparison, Single |
| Checkout | Single Page, Multi-Step, Two Column |

### Template Preview Route

```
/preview/{template-slug}
```

Each template has a functional demo that:
- Shows real UI with sample data
- Allows interaction (filling forms, selecting products)
- Demonstrates responsive behavior
- Has back arrow in top left to return to templates

### Template Selection UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Choose a Template                                    [Full Funnel] [Components] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │                 │  │                 │  │                 │             │
│  │  [Preview Img]  │  │  [Preview Img]  │  │  [Preview Img]  │             │
│  │                 │  │                 │  │                 │             │
│  │  E-commerce     │  │  SaaS Trial     │  │  Course Launch  │             │
│  │  Starter        │  │                 │  │                 │             │
│  │                 │  │  Landing →      │  │  Landing →      │             │
│  │  Landing →      │  │  Pricing →      │  │  Checkout       │             │
│  │  Products →     │  │  Checkout       │  │                 │             │
│  │  Checkout       │  │                 │  │  [Preview]      │             │
│  │                 │  │  [Preview]      │  │  [Use This]     │             │
│  │  [Preview]      │  │  [Use This]     │  │                 │             │
│  │  [Use This]     │  │                 │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
│  Filter by: [All ▼]  [Industry ▼]  [Stages ▼]                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Checkout Builder (Phase 1)

### Overview

The Checkout Builder is an interactive configuration tool similar to Stripe's `checkout.stripe.dev/checkout`. It provides:

1. **Live Preview** - Real-time visual preview of the checkout page
2. **Configuration Panel** - Sidebar with all customization options
3. **Code Output** - Generated embed code or hosted link

### Route

```
/funnels/builder
/funnels/builder/{id}  (editing existing)
```

### UI Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Funnels    Funnel Builder                  [Save] [Publish]      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────┐  ┌────────────────────────────────────────────┐│
│  │                         │  │                                            ││
│  │   CONFIGURATION         │  │         LIVE PREVIEW                       ││
│  │                         │  │                                            ││
│  │   ┌───────────────────┐ │  │   ┌────────────────────────────────────┐  ││
│  │   │ Products          │ │  │   │                                    │  ││
│  │   │ > Add products    │ │  │   │    [Interactive Preview]           │  ││
│  │   │ > Price: $99      │ │  │   │                                    │  ││
│  │   └───────────────────┘ │  │   │    Shows exactly what              │  ││
│  │                         │  │   │    customer will see               │  ││
│  │   ┌───────────────────┐ │  │   │                                    │  ││
│  │   │ Customer Info     │ │  │   │                                    │  ││
│  │   │ □ Email           │ │  │   │                                    │  ││
│  │   │ □ Name            │ │  │   └────────────────────────────────────┘  ││
│  │   │ □ Phone           │ │  │                                            ││
│  │   └───────────────────┘ │  │   Device: [Desktop] [Tablet] [Mobile]      ││
│  │                         │  │                                            ││
│  │   ┌───────────────────┐ │  └────────────────────────────────────────────┘│
│  │   │ Payment Methods   │ │                                               │
│  │   │ ☑ Card            │ │                                               │
│  │   │ ☑ PayPal          │ │                                               │
│  │   │ □ Apple Pay       │ │                                               │
│  │   └───────────────────┘ │                                               │
│  │                         │                                               │
│  │   ┌───────────────────┐ │                                               │
│  │   │ Appearance        │ │                                               │
│  │   │ Theme: Modern     │ │                                               │
│  │   │ Color: #000       │ │                                               │
│  │   └───────────────────┘ │                                               │
│  │                         │                                               │
│  └─────────────────────────┘                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Configuration Sections

#### 1. Products
- Add/remove products
- Set prices (fixed or from catalog)
- Quantity options
- Line item adjustments

#### 2. Customer Information
- Toggle fields: email, name, phone, company
- Mark as required/optional
- Add custom fields (including date/time for appointments)

#### 3. Shipping
- Enable/disable shipping collection
- Shipping methods with prices
- Shipping zones

#### 4. Payment Methods
- Toggle payment types
- Configure each method
- Test mode indicator

#### 5. Appearance
- Theme selection
- Primary color
- Logo upload
- Custom CSS (advanced)

#### 6. After Payment
- Success message
- Redirect URL
- Email confirmation settings

### Preview Features

- **Device Toggle** - Desktop, Tablet, Mobile views
- **Interactive** - Can fill in fields to see validation
- **Theme Preview** - Live updates on appearance changes
- **Test Mode Badge** - Clear indicator when in test mode

---

## Product Selection Page (Phase 2)

### Purpose

Allow customers to browse and select products before proceeding to checkout. Critical for:
- Multi-product stores
- Subscription trials
- Product comparisons
- Upsells and cross-sells

### Layout Types

| Layout | Best For | Features |
|--------|----------|----------|
| **Grid** | Multiple products | Filtering, sorting, pagination |
| **Carousel** | Featured products, trials | Swipe navigation, single focus |
| **Comparison** | SaaS plans, tiers | Side-by-side features |
| **Single Product** | Hero product with variants | Detailed view, gallery |

### Configuration Options

```typescript
interface ProductSelectionBuilderConfig {
  // Layout
  layout: 'grid' | 'carousel' | 'comparison' | 'single';

  // Products
  products: {
    source: 'manual' | 'category' | 'collection';
    ids?: string[];
    categoryId?: string;
    limit?: number;
  };

  // Display
  showPrices: boolean;
  showDescriptions: boolean;
  showImages: boolean;
  showVariants: boolean;
  showQuantitySelector: boolean;
  showAddToCart: boolean;
  showCompare: boolean;

  // Filtering (Grid layout)
  enableFilters: boolean;
  filterOptions: FilterOption[];

  // Sorting
  enableSorting: boolean;
  sortOptions: SortOption[];
  defaultSort: string;

  // Selection
  selectionMode: 'single' | 'multiple';
  minSelections?: number;
  maxSelections?: number;

  // Navigation
  ctaText: string;
  ctaPosition: 'per-item' | 'fixed-bottom' | 'floating';
}
```

---

## Landing Page Integration (Phase 2)

### Existing Asset

The `/landing-pages` module already exists with:
- Section-based page builder
- Multiple section types (Hero, Features, Testimonials, CTA, etc.)
- Theme support
- Preview functionality

### Integration Plan

1. **Connect to Funnels** - Add `funnelId` to LandingPage model
2. **Stage Wrapper** - Wrap landing page in funnel context
3. **CTA Behavior** - CTAs can advance to next funnel stage
4. **Shared Branding** - Inherit funnel branding settings
5. **Analytics** - Track as funnel stage entry

### Changes Required

```prisma
model LandingPage {
  // ... existing fields

  // New: Funnel integration
  funnelId    String?
  funnel      Funnel?   @relation(fields: [funnelId], references: [id])
  stageOrder  Int?      // Position in funnel
}
```

---

## Funnel Analytics

### Metrics Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Funnel: Coffee Subscription Trial                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    1,234     │  │     892      │  │     456      │  │     312      │     │
│  │   Visitors   │  │  Selections  │  │  Checkouts   │  │  Purchases   │     │
│  │              │  │    72.3%     │  │    51.1%     │  │    68.4%     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                                              │
│  FUNNEL VISUALIZATION                                                        │
│  ═══════════════════════════════════════════════════════════════════        │
│                                                                              │
│  Landing Page     Product Selection     Checkout          Purchase           │
│  ████████████  →  █████████████████  →  ████████████  →  █████████          │
│    1,234              892 (72%)           456 (51%)        312 (68%)         │
│                                                                              │
│  DROP-OFF ANALYSIS                                                           │
│  ─────────────────                                                           │
│  • 342 visitors left at Landing (27.7%)                                      │
│  • 436 visitors left at Product Selection (48.9%)                            │
│  • 144 visitors left at Checkout (31.6%)                                     │
│                                                                              │
│  TOP PERFORMING PRODUCTS                                                     │
│  ───────────────────────                                                     │
│  1. Ethiopian Yirgacheffe - 156 purchases (50%)                              │
│  2. Colombian Supremo - 89 purchases (28.5%)                                 │
│  3. Brazilian Santos - 67 purchases (21.5%)                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Metrics

| Metric | Description |
|--------|-------------|
| **Visits** | Total funnel entries |
| **Stage Completion Rate** | % completing each stage |
| **Overall Conversion Rate** | Visits → Purchases |
| **Average Order Value** | Revenue / Orders |
| **Abandonment Points** | Where users drop off |
| **Time in Funnel** | Average completion time |
| **Device Breakdown** | Mobile vs Desktop |
| **Top Products** | Best sellers through funnel |

### Events Tracked

- Stage entered / completed / abandoned
- Product viewed / added / removed
- Field interactions
- Payment attempts
- Errors encountered
- Time spent per stage

---

## Builder UX

### Approach: Stripe-Style Sidebar + Live Preview

**Why this approach:**
1. **Familiar** - Similar to tools developers/merchants already use
2. **Efficient** - All options visible, no modal hunting
3. **Immediate Feedback** - Changes reflect instantly
4. **Less Complex** - Than full drag-drop builders
5. **Mobile Friendly** - Collapse sidebar on mobile

### Configuration Panel Structure

```
├── Products & Pricing
│   ├── Add Product
│   ├── Price Overrides
│   └── Quantity Settings
│
├── Customer Fields
│   ├── Contact Information
│   ├── Shipping Address
│   ├── Billing Address
│   └── Custom Fields
│
├── Payment
│   ├── Payment Methods
│   ├── Currency
│   └── Tax Settings
│
├── Appearance
│   ├── Theme
│   ├── Colors
│   ├── Logo
│   └── Custom CSS
│
├── Behavior
│   ├── Success Redirect
│   ├── Abandonment
│   └── Session Settings
│
└── Advanced
    ├── Webhooks
    ├── Metadata
    └── Test Mode
```

---

## Hosting & Deployment

### URL Structure

```
# Funnel URLs (public)
https://pay.{domain}/f/{funnel-slug}
https://pay.{domain}/f/{funnel-slug}/products
https://pay.{domain}/f/{funnel-slug}/checkout

# Or with custom domain
https://checkout.{merchant-domain}/f/{funnel-slug}

# Direct checkout link (skip to checkout with pre-selected products)
https://pay.{domain}/f/{funnel-slug}/checkout?products=prod_123,prod_456

# Template previews
https://pay.{domain}/preview/{template-slug}
```

### Embed Options

```html
<!-- Full Page Embed -->
<iframe src="https://pay.example.com/f/coffee-trial" />

<!-- Button that opens modal -->
<script src="https://pay.example.com/embed.js"></script>
<button data-funnel="coffee-trial" data-mode="modal">
  Subscribe Now
</button>

<!-- Inline Checkout Component -->
<div data-funnel="coffee-trial" data-stage="checkout"></div>
```

---

## Integration Requirements

### CRITICAL: All New Implementations Must Use Integrations Framework

All new features and services in the Funnel Builder system **MUST** be integrated through the existing Integrations Framework (Feature 01). This includes:

#### Payment Gateways
- Use `ClientIntegration` for payment provider connections
- Support both `OWN` mode (client's credentials) and `PLATFORM` mode (shared)
- Follow existing patterns in `/api/integrations/`

#### AI Services
- AI insights engine connects via `PlatformIntegration`
- LLM providers (AWS Bedrock, OpenAI) configured at organization level
- Credits system ties into billing/subscription module

#### Analytics Providers
- External analytics (if any) configured as integrations
- Webhooks for real-time event forwarding

#### Email Services
- Abandonment emails use transactional email integration (AWS SES, SendGrid)
- Daily digest emails use same infrastructure

### Integration Points

```typescript
// Funnel Builder Integration Requirements
interface FunnelIntegrations {
  // Required for payment processing
  paymentGateways: ClientIntegration[];  // At least one required

  // Optional but recommended
  emailProvider?: PlatformIntegration;   // For notifications
  aiProvider?: PlatformIntegration;      // For AI insights
  analyticsWebhook?: string;             // External analytics
}
```

### Adding New Integrations

When adding a new service to Funnel Builder:

1. Add provider to `IntegrationProvider` enum if not exists
2. Create credential schema in `integration-definitions.ts`
3. Implement connection test in provider service
4. Add to UI in integration configuration pages
5. Document in CLAUDE.md under Feature 01

---

## Implementation Phases

### Phase 1: Funnel Builder Foundation (Current Priority)

**Scope:**
- Visual flow builder with third-party canvas
- Checkout stage with full configuration
- Basic A/B testing (manual mode)
- Template system with previews
- Funnel analytics dashboard

**Deliverables:**
1. `/funnels` route with list/create
2. `/funnels/builder` with visual flow canvas
3. `Funnel`, `FunnelStage`, `FunnelVariant` models
4. `FunnelSession` for tracking
5. Template gallery with functional demos
6. Basic analytics

### Phase 2: Full Funnel + A/B Testing

**Scope:**
- Product Selection stage
- Landing Page integration
- Full A/B testing with all modes
- Confidence meter
- Multi-stage funnel flow

**Deliverables:**
1. Product Selection builder
2. Landing page → Funnel connection
3. Funnel flow orchestration
4. A/B test management UI
5. Stage-to-stage data passing
6. Complete analytics

### Phase 3: AI Insights Engine

**Scope:**
- Rule-based insights
- LLM integration (credits system)
- Daily digest + on-demand
- Action modes (one-click, draft, wizard)
- Alert configuration

**Deliverables:**
1. AI insights service
2. Credits management
3. Insight dashboard
4. Action application system
5. Notification system

### Phase 4: Advanced Features

**Scope:**
- Conditional logic
- Custom domains
- Advanced upsells
- Webhook integrations
- Migration from Payment Pages

**Deliverables:**
1. Conditional branching in flows
2. Custom domain support
3. Upsell/cross-sell engine
4. Webhook configuration
5. Payment Pages migration tool

---

## Migration: Payment Pages

### Decision
Evaluate existing Payment Pages for migration to Funnel system. If not feasible or valuable, remove entirely. Do not maintain legacy patterns alongside new system.

### Migration Strategy

1. **Audit Existing Pages** - Identify active payment pages
2. **Compatibility Check** - Can they map to funnel checkout?
3. **Migrate or Archive** - Move to funnels or mark deprecated
4. **Deprecation Notice** - Inform users of timeline
5. **Redirect Legacy URLs** - Point old links to new funnels

### Migration API

```typescript
// POST /api/payment-pages/{id}/migrate-to-funnel
interface MigrateToFunnelRequest {
  funnelName: string;
  keepOriginal: boolean;  // Archive vs delete
}

interface MigrateToFunnelResponse {
  funnelId: string;
  funnelSlug: string;
  migrationStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  warnings?: string[];
}
```

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Existing Payment Pages | Evaluate for migration or remove |
| Landing Pages | Use existing module, integrate with funnels |
| Product Catalog Integration | Pull from existing Products module |
| Multi-currency | Future consideration |
| Localization | Future consideration |
| Templates | Full funnel + component with demos |

---

## Appendix: Competitive Analysis

### Stripe Checkout
- Hosted checkout pages
- Embeddable
- Limited customization
- No funnel concept

### Shopify Checkout
- Full e-commerce integration
- Checkout extensibility
- Shop Pay integration
- Limited standalone use

### ClickFunnels
- Full funnel builder
- Drag-drop editor
- Focused on marketing funnels
- Higher complexity

### Gumroad
- Simple product pages
- Checkout embedded
- Creator-focused
- Limited customization

### Our Differentiator
- **Enterprise-grade** with multi-tenant support
- **Payment gateway agnostic** (Stripe, PayPal, NMI, etc.)
- **Full funnel** with analytics
- **AI-powered insights** (human-in-loop)
- **A/B testing** with statistical rigor
- **Developer-friendly** with API access
- **White-label** capability

---

*Document Version: 2.0*
*Created: December 3, 2024*
*Updated: December 3, 2024*
*Status: Product Decisions Captured - Ready for Implementation*
