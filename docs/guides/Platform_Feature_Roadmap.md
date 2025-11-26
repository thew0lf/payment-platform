# avnz.io Payment Platform - Feature Roadmap

## Document Information
- **Version:** 2.0
- **Date:** November 26, 2024
- **Status:** Active Development

---

## Platform Overview

avnz.io is a B2B SaaS multi-tenant payment orchestration platform serving agencies that manage subscription businesses for multiple clients.

### Platform Hierarchy
```
ORGANIZATION (avnz.io)
└── CLIENT (Agency) ← Billable entity
    └── COMPANY (Agency's Customer) ← Usage tracking
        └── DEPARTMENT
            └── USER
```

---

## Implemented Features (Phase 1)

### ✅ Payment Provider Abstraction Layer
- **Status:** Complete
- **Location:** `apps/api/src/payments/`

**Components:**
- Abstract base class for all payment providers
- PayPal Payflow Pro implementation
- Provider factory with lifecycle management
- Payment processing service with fallback support
- Transaction logging with event system
- REST API endpoints

**Capabilities:**
- Sale, authorize, capture, void, refund, verify
- Card tokenization
- AVS/CVV verification
- Health monitoring
- Retry logic with exponential backoff

---

## Planned Features (Phase 2+)

### 🔲 Multi-Account Provider Model
- **Status:** Specified
- **Priority:** High

**Key Concepts:**
- Multiple merchant accounts per provider type (e.g., 4 NMI accounts, 2 PayPal accounts)
- Each account has its own friendly name, credentials, limits, fees
- Real-time usage tracking per account
- Per-account health monitoring

**Account Attributes:**
- Friendly name & description
- Daily/weekly/monthly/yearly limits (transaction count & volume)
- Fee structures (base, international, card-specific)
- Geographic restrictions
- Product category restrictions
- Card type restrictions

### 🔲 Account Pools & Load Balancing
- **Status:** Specified
- **Priority:** High

**Load Balancing Strategies:**
| Strategy | Description |
|----------|-------------|
| WEIGHTED | Fixed percentage split (e.g., 40/40/20) |
| ROUND_ROBIN | Even rotation between accounts |
| LEAST_LOAD | Route to account with fewest active transactions |
| CAPACITY | Based on remaining daily/monthly limits |
| LOWEST_COST | Minimize processing fees |
| LOWEST_LATENCY | Route to fastest responding account |
| HIGHEST_SUCCESS | Route to best performing account |
| ADAPTIVE | ML-based optimization (future) |

**Failover Features:**
- Automatic failover on gateway errors
- Configurable retry on soft declines
- Temporary exclusion of failing accounts
- Health-based routing adjustments

### 🔲 Gateway Rule Engine (GRE)
- **Status:** Specified
- **Priority:** High

**Routing Conditions:**

| Category | Conditions Available |
|----------|---------------------|
| **Geography** | Country, state, region, continent, currency, domestic/international, EU/EEA, sanctioned countries, high-risk countries |
| **Amount** | Min/max ranges, tiered ranges, currency-specific amounts |
| **Product** | SKU, category, product type, subscription tier, subscription interval, renewals, trials |
| **Time** | Hour of day, day of week, date ranges, holidays, business hours, weekends |
| **Customer** | Customer type, account age, lifetime value, risk level, chargeback rate, segments |
| **Payment Method** | Card brand, card type, BIN ranges, issuing country, tokenized, 3DS enrolled, digital wallets |
| **Limits** | Daily/monthly/yearly transaction and volume limits, velocity checks, per-customer limits |

**Rule Actions:**
- Route to pool/account
- Block transaction
- Flag for review
- Apply surcharge/discount
- Require 3DS
- Add metadata
- Send notifications

**Advanced Features:**
- A/B testing between providers
- Scheduled rule activation
- Rule simulation/testing
- Analytics and match tracking

### 🔲 Billing & Usage Tracking
- **Status:** Specified
- **Priority:** High

**Pricing Models:**
1. **Transaction-Based:** Per-transaction fee + percentage of volume
2. **Tiered Volume:** Decreasing rates at higher volumes
3. **Subscription + Overage:** Base plan with included allowances
4. **Enterprise/Custom:** Negotiated pricing

**Metered Resources:**
- Transaction count
- Transaction volume
- Merchant accounts
- Companies (sub-accounts)
- Team members
- API calls
- Vault entries (stored cards)
- Webhooks

**Usage Tracking Granularity:**
```
Platform Total
└── Client (Agency) ← Billable
    └── Company (Agency's Customer)
        └── Merchant Account
```

**Invoicing Features:**
- Automated invoice generation
- Line item breakdown
- PDF generation
- Payment integration (Stripe)
- Credit/adjustment handling

---

## Technical Architecture

### Tech Stack
- **Backend:** Nest.js (modular monolith)
- **Frontend:** Next.js (admin dashboard)
- **Database:** PostgreSQL with Prisma ORM
- **Cache:** Redis
- **Monorepo:** Turborepo
- **Containerization:** Docker

### Repository Structure
```
payment-platform/
├── apps/
│   ├── api/                 # Nest.js backend
│   │   └── src/
│   │       ├── auth/
│   │       ├── hierarchy/
│   │       ├── dashboard/
│   │       ├── payments/    # ✅ Complete
│   │       ├── routing/     # 🔲 GRE (planned)
│   │       └── billing/     # 🔲 Billing (planned)
│   ├── admin-dashboard/     # Next.js admin UI
│   └── company-portal/      # Next.js client portal
├── packages/
│   └── shared/
└── docker/
```

### Database Schema Additions
New models for Phase 2+:
- `MerchantAccount` - Multi-account support
- `AccountPool` - Load balancing groups
- `PoolMembership` - Pool-account relationships
- `RoutingRule` - GRE rule definitions
- `RoutingDecision` - Audit log
- `PricingPlan` - Subscription plans
- `ClientSubscription` - Client billing
- `UsagePeriod` - Monthly usage tracking
- `CompanyUsageRecord` - Per-company usage
- `AccountUsageRecord` - Per-account usage
- `UsageEvent` - Granular event log
- `Invoice` - Generated invoices

---

## API Endpoints (Planned)

### Merchant Accounts
```
POST   /api/merchant-accounts
GET    /api/merchant-accounts
GET    /api/merchant-accounts/:id
PATCH  /api/merchant-accounts/:id
DELETE /api/merchant-accounts/:id
GET    /api/merchant-accounts/:id/usage
GET    /api/merchant-accounts/:id/health
```

### Account Pools
```
POST   /api/account-pools
GET    /api/account-pools
GET    /api/account-pools/:id
PATCH  /api/account-pools/:id
DELETE /api/account-pools/:id
POST   /api/account-pools/:id/accounts
DELETE /api/account-pools/:id/accounts/:accountId
GET    /api/account-pools/:id/stats
```

### Routing Rules
```
POST   /api/routing-rules
GET    /api/routing-rules
GET    /api/routing-rules/:id
PATCH  /api/routing-rules/:id
DELETE /api/routing-rules/:id
POST   /api/routing-rules/test
POST   /api/routing-rules/reorder
```

### Billing
```
GET    /api/billing/usage
GET    /api/billing/usage/by-company
GET    /api/billing/invoices
GET    /api/billing/invoices/:id
GET    /api/billing/invoices/:id/pdf
GET    /api/billing/subscription
PATCH  /api/billing/subscription
```

### Admin Billing
```
GET    /api/admin/billing/clients
GET    /api/admin/billing/revenue
GET    /api/admin/billing/mrr
POST   /api/admin/billing/invoices/generate
```

---

## Implementation Phases

### Phase 1: Payment Foundation ✅
- [x] Abstract payment provider interface
- [x] PayPal Payflow Pro implementation
- [x] Transaction processing service
- [x] Transaction logging
- [x] REST API endpoints

### Phase 2: Multi-Account & Pools 🔲
- [ ] Merchant Account CRUD
- [ ] Credentials encryption
- [ ] Per-account limits tracking
- [ ] Real-time usage counters
- [ ] Account Pool CRUD
- [ ] Load balancing strategies
- [ ] Failover logic
- [ ] Health-based routing

### Phase 3: Gateway Rule Engine 🔲
- [ ] Routing Rule CRUD
- [ ] Condition evaluators (all categories)
- [ ] Action executors
- [ ] Rule testing/simulation
- [ ] A/B testing support
- [ ] Rule analytics

### Phase 4: Billing System 🔲
- [ ] Pricing Plan management
- [ ] Client subscriptions
- [ ] Usage metering (real-time)
- [ ] Invoice generation
- [ ] Stripe integration
- [ ] Usage dashboards

### Phase 5: Dashboard UI 🔲
- [ ] Merchant accounts management UI
- [ ] Account pools configuration UI
- [ ] Routing rules builder UI
- [ ] Usage & billing views
- [ ] Admin revenue dashboard

### Phase 6: Additional Providers 🔲
- [ ] NMI integration
- [ ] Authorize.Net integration
- [ ] Stripe integration
- [ ] Provider comparison/benchmarking

---

## Related Documentation

- `Gateway_Rule_Engine_Complete_Specification.md` - Full GRE & Billing specification
- `prisma_schema_additions.prisma` - Database schema for new features
- `PAYMENT_PROVIDER_README.md` - Phase 1 implementation guide
- `Customer_Acquisition_Strategy.md` - Coffee business marketing
- `Complete_Economics_Pricing.md` - Coffee business unit economics
- `Cancellation_Prevention_System.md` - NCI behavioral retention

---

## Coffee Business Integration

The coffee subscription business serves as both a revenue stream and testing ground for the platform:

- **Use Case:** Duo Discovery subscription ($26.95/month)
- **Testing:** Real transactions through the platform
- **Validation:** GRE rules, load balancing, billing accuracy
- **Behavioral Integration:** NCI methodology for retention

---

*Document maintained in Claude Project Knowledge*
