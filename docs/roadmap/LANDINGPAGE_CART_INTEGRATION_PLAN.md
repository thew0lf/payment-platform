# LandingPage Model ↔ Cart Integration Plan

**Date:** January 2, 2026
**Feature:** Landing Page to Cart Integration
**Status:** Ready for Implementation

---

## Executive Summary

This plan covers the integration of the LandingPage builder with the Cart system, enabling visitors to add products directly from landing pages and complete purchases. Currently, the LandingPage and Cart systems operate independently. This integration creates a complete commerce pathway from landing page → cart → checkout → order.

---

## Current State Analysis

### What Exists

| System | Status | Key Components |
|--------|--------|----------------|
| **LandingPage Builder** | Complete | CRUD, sections, themes, publishing, A/B testing |
| **Cart System** | Complete | Cart CRUD, items, promotions, shipping, tax |
| **Funnel System** | Complete | FunnelSession, stages, cart integration via sessionToken |
| **Orders Module** | Complete | Order creation, payment processing |

### What's Missing

1. **No Cart ↔ LandingPage relationship in schema** - Cart has no `landingPageId` reference
2. **No public renderer for landing pages** - No `/lp/[slug]` route exists
3. **No ProductSelection section type** - Landing pages can't display buyable products
4. **No LandingPageSession tracking** - No visitor analytics for landing pages
5. **No attribution from landing page to order** - Can't measure landing page ROI

---

## Architecture Decision

### Data Model: Direct FK with Session Tracking

```prisma
model Cart {
  // Existing fields...

  // NEW: Landing page association
  landingPageId    String?
  landingPage      LandingPage? @relation(fields: [landingPageId], references: [id])

  // Source tracking
  sourceType       CartSourceType  @default(DIRECT)

  @@index([landingPageId])
}

enum CartSourceType {
  DIRECT          // Direct site visit
  LANDING_PAGE    // From landing page
  FUNNEL          // From funnel flow
  EMAIL           // From email campaign
}

model LandingPageSession {
  id              String   @id @default(cuid())
  sessionToken    String   @unique
  landingPageId   String
  landingPage     LandingPage @relation(fields: [landingPageId], references: [id])

  // Visitor tracking
  visitorId       String?
  ipAddress       String?
  userAgent       String?
  referrer        String?

  // UTM capture
  utmSource       String?
  utmMedium       String?
  utmCampaign     String?

  // Conversion
  cartId          String?  @unique
  cart            Cart?    @relation(fields: [cartId], references: [id])
  convertedAt     DateTime?
  orderId         String?

  // Timestamps
  startedAt       DateTime @default(now())
  lastActivityAt  DateTime @default(now())

  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])

  @@index([landingPageId])
  @@index([sessionToken])
  @@index([companyId, startedAt])
}
```

### Rationale

- **Direct FK** over intermediate model: Simpler queries, clear ownership
- **LandingPageSession** for analytics: Track visitor journey without overloading Cart
- **Cart.sourceType enum**: Unified attribution across all traffic sources
- **Session token pattern**: Matches existing FunnelSession approach

---

## Phased Implementation

### Phase 1: Foundation (MVP) - Priority P0

**Goal:** Enable basic product purchase from landing pages

#### 1.1 Schema Changes

| Change | File | Description |
|--------|------|-------------|
| Add `landingPageId` to Cart | `schema.prisma` | Nullable FK to LandingPage |
| Add `sourceType` to Cart | `schema.prisma` | Enum for attribution |
| Create `LandingPageSession` | `schema.prisma` | Visitor tracking model |
| Add `seoSlug` to LandingPage | `schema.prisma` | Public URL slug (unique) |

#### 1.2 Backend API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/lp/:seoSlug` | Public | Fetch published landing page |
| `POST /api/lp/:landingPageId/sessions` | Public | Start visitor session |
| `GET /api/lp/sessions/:token` | Public | Get session data |
| `POST /api/lp/sessions/:token/cart` | Public | Get or create cart |
| `POST /api/lp/sessions/:token/events` | Public | Track analytics events |

#### 1.3 Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `LandingPageRenderer` | company-portal | Render published pages |
| `ProductSelectionSection` | company-portal | Display products with Add to Cart |
| `CartDrawer` | company-portal | Slide-out cart panel |
| `LandingPageContext` | company-portal | Session and state management |

#### 1.4 Acceptance Criteria

- [ ] Visitor can access landing page via `/lp/[seoSlug]`
- [ ] Visitor can add product to cart from landing page
- [ ] Cart persists across page refresh (cookie + DB)
- [ ] Guest checkout completes successfully
- [ ] Order has correct `landingPageId` attribution
- [ ] Page loads in < 3 seconds

**Estimated Effort:** 16 days

---

### Phase 2: Cart Experience - Priority P1

**Goal:** Enhance cart UX and enable recovery

#### 2.1 Cart UI Components

| Component | Description |
|-----------|-------------|
| Cart Sidebar/Drawer | Slide from right, sticky header/footer |
| Mini Cart Header | Icon with badge, hover preview |
| Quantity Selector | +/- buttons, 44px touch targets |
| Floating Cart Bar (Mobile) | Sticky bottom with total + checkout CTA |

#### 2.2 Product Display

| Feature | Description |
|---------|-------------|
| Grid Layout | 2-4 columns responsive |
| Variant Selection | Size/color inline chips |
| Stock Indicators | "Only X left" warnings |
| Sale Badges | Discount percentage display |

#### 2.3 Cart Recovery

| Email | Timing | Discount |
|-------|--------|----------|
| Email 1 | 1 hour | None |
| Email 2 | 24 hours | 10% off |
| Email 3 | 72 hours | 15% off |

**Estimated Effort:** 8 days

---

### Phase 3: Conversion Optimization - Priority P1

**Goal:** Maximize landing page conversion rates

#### 3.1 Urgency & Scarcity

| Element | When to Show |
|---------|--------------|
| Countdown Timer | Real deadlines (sale ends) |
| Stock Counter | Inventory < 20 units |
| Recent Purchases | Social proof popup |

#### 3.2 Trust Elements

| Position | Elements |
|----------|----------|
| Near Price | Money-back guarantee badge |
| Header | Free shipping threshold bar |
| Checkout | Payment security badges |

#### 3.3 Exit Intent

| Trigger | Action |
|---------|--------|
| Mouse leave (desktop) | Discount popup |
| Back button (mobile) | Retention modal |
| Cart abandonment | Recovery email sequence |

**Estimated Effort:** 6 days

---

### Phase 4: Analytics & Attribution - Priority P1

**Goal:** Measure landing page ROI

#### 4.1 Metrics Dashboard

| Metric | Definition |
|--------|------------|
| Page Views | Session starts per landing page |
| Add-to-Cart Rate | % visitors who add to cart |
| Conversion Rate | % visitors who purchase |
| Revenue Per Visitor | Total revenue / visitors |
| Cart Abandonment Rate | Abandoned / (Converted + Abandoned) |

#### 4.2 Attribution Tracking

| Field | Source |
|-------|--------|
| `utm_source` | URL parameter |
| `utm_medium` | URL parameter |
| `utm_campaign` | URL parameter |
| `landingPageId` | Session context |
| `sourceType` | LANDING_PAGE enum |

#### 4.3 Funnel Analysis

```
Landing Page View → Add to Cart → Checkout Start → Order Complete
      100%            25-35%          18%              12%
                    (target)
```

**Estimated Effort:** 8 days

---

### Phase 5: Advanced Features - Priority P2

**Goal:** A/B testing and personalization

#### 5.1 A/B Testing

| Feature | Description |
|---------|-------------|
| Variant allocation | Traffic split by percentage |
| Metric tracking | Conversion rate per variant |
| Winner detection | Statistical significance |

#### 5.2 Personalization

| Type | Implementation |
|------|----------------|
| Returning visitor | "Welcome back" messaging |
| Geo-based | Currency/shipping display |
| Behavioral | Recommended products |

**Estimated Effort:** 10 days

---

## User Journey Flow

```
1. DISCOVERY
   └── Visitor clicks ad/link → /lp/summer-sale
       └── System creates LandingPageSession with token
       └── UTM parameters captured

2. ENGAGEMENT
   └── Visitor views products
   └── Clicks "Add to Cart"
       └── Cart created with landingPageId
       └── Toast: "Added to cart"

3. CART REVIEW
   └── Cart drawer opens
   └── Update quantities
   └── Click "Checkout"

4. CHECKOUT
   └── Email capture (creates Lead)
   └── Shipping address
   └── Payment
   └── Order created with attribution

5. CONFIRMATION
   └── Success page
   └── Confirmation email
   └── Upsell offers (optional)
```

---

## Technical Architecture

### Service Layer

```
┌─────────────────────────────────────────────────────────┐
│                   PUBLIC LAYER (No Auth)                 │
├─────────────────────────────────────────────────────────┤
│  LandingPagePublicController                             │
│  └── LandingPageCartFacade (orchestration)              │
│       ├── PublicLandingPageService                      │
│       ├── LandingPageSessionService                     │
│       ├── CartService                                   │
│       └── AnalyticsService                              │
└─────────────────────────────────────────────────────────┘
```

### Caching Strategy

| Layer | Content | TTL |
|-------|---------|-----|
| CDN | LP content | 5 min |
| Redis | Sessions | 30 days |
| Redis | Carts | 7 days |
| Local | LP content | 1 min |

### Security

| Protection | Implementation |
|------------|----------------|
| Session tokens | 256-bit random, base64url |
| Rate limiting | Redis sliding window |
| CSRF | HMAC-signed tokens |
| IP hashing | SHA-256 for privacy |

---

## Files to Create

### Backend

```
apps/api/
├── prisma/migrations/YYYYMMDD_add_landing_page_cart_integration/
├── src/landing-pages/
│   ├── controllers/
│   │   └── landing-page-public.controller.ts
│   ├── services/
│   │   ├── public-landing-page.service.ts
│   │   ├── landing-page-session.service.ts
│   │   └── landing-page-cart.facade.ts
│   └── dto/
│       └── public-landing-page.dto.ts
```

### Frontend

```
apps/company-portal/
├── src/app/lp/[slug]/page.tsx
├── src/components/landing-page/
│   ├── landing-page-renderer.tsx
│   ├── section-renderer.tsx
│   └── sections/
│       ├── product-selection-section.tsx
│       └── product-grid-section.tsx
├── src/contexts/
│   └── landing-page-context.tsx
└── src/lib/api/
    └── landing-page.ts
```

---

## Success Metrics

| Metric | MVP Target | P1 Target |
|--------|------------|-----------|
| Page Load Time | < 3s | < 2s |
| Add-to-Cart Rate | > 5% | > 8% |
| Cart Abandonment | < 75% | < 65% |
| Conversion Rate | > 1.5% | > 2.5% |
| Attribution Accuracy | 100% | 100% |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cart data loss | High | Dual storage (localStorage + DB) |
| Session hijacking | Critical | Secure token generation, fingerprinting |
| High traffic pages | Medium | CDN caching, auto-scaling |
| Attribution gaps | High | Strict tracking, reconciliation scripts |

---

## Dependencies

| System | Required Updates |
|--------|------------------|
| LandingPage model | Add `seoSlug` field |
| Cart model | Add `landingPageId`, `sourceType` |
| Order model | Already has attribution fields |
| Email system | Already has recovery templates |

---

## Stakeholder Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Head of Design | | | |
| CMO | | | |
| Product Manager | | | |
| Senior Developer | | | |
| Senior Architect | | | |

---

## Implementation Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Foundation | 3 weeks | None |
| Phase 2: Cart Experience | 1.5 weeks | Phase 1 |
| Phase 3: Conversion Optimization | 1 week | Phase 2 |
| Phase 4: Analytics | 1.5 weeks | Phase 1 |
| Phase 5: Advanced | 2 weeks | Phase 4 |

**Total Estimated Duration:** 9 weeks

---

## Next Steps

1. **Schema Review** - DBA approval for migrations
2. **Security Review** - Rate limiting thresholds
3. **API Design Review** - Finalize endpoint contracts
4. **Begin Phase 1** - Database foundation

---

*Document created by consolidating input from: Head of Design, CMO, Product Manager, Senior Developer, Senior Architect*

*Date: January 2, 2026*
