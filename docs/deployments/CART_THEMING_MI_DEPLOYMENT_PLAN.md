# Cart Theming & MI Cart Integration Deployment Plan

**Date:** January 27, 2026
**Author:** Platform Team
**Feature:** Cart Theming + Momentum Intelligence Cart Recovery
**Status:** Ready for Review

---

## 1. Overview

This deployment introduces two major features:

1. **Cart Theming System** - Customizable cart drawer with 9 presets, CSS variables, and admin editors
2. **MI Cart Integration** - Behavioral triggers, cart save flows, voice recovery, and checkout churn detection

### Files Created/Modified

#### Backend (API)
| File | Type | Description |
|------|------|-------------|
| `cart/types/cart-theme.types.ts` | New | Cart theme TypeScript definitions |
| `cart/constants/cart-theme-presets.ts` | New | 9 theme preset configurations |
| `cart/services/cart-theme.service.ts` | New | Theme resolution and CSS generation |
| `cart/services/product-catalog.service.ts` | New | Product catalog filtering |
| `cart/controllers/cart-theme.controller.ts` | New | Theme and catalog endpoints |
| `cart/cart-theme.module.ts` | New | NestJS module |
| `momentum-intelligence/cart-save/types/cart-save.types.ts` | New | Cart save flow types |
| `momentum-intelligence/cart-save/cart-save.service.ts` | New | 7-stage recovery flow |
| `momentum-intelligence/cart-save/cart-save.controller.ts` | Modified | Added voice/churn/analytics endpoints |
| `momentum-intelligence/cart-save/cart-save.module.ts` | Modified | Added new services |
| `momentum-intelligence/cart-save/cart-recovery-voice.service.ts` | New | Voice AI recovery integration |
| `momentum-intelligence/cart-save/checkout-churn-detection.service.ts` | New | Real-time churn detection |
| `momentum-intelligence/cart-save/index.ts` | New | Module exports |

#### Frontend (Company Portal)
| File | Type | Description |
|------|------|-------------|
| `contexts/cart-theme-context.tsx` | New | Theme provider and hook |
| `components/cart/themed-cart-drawer.tsx` | New | Themed cart with triggers |
| `components/cart/triggers/*.tsx` | New | 8 behavioral trigger components |
| `components/cart/index.ts` | Modified | Export new components |
| `hooks/use-cart-experience.ts` | New | Unified cart experience hook |
| `lib/api/cart-recovery.ts` | New | Cart recovery API client |

#### Frontend (Admin Dashboard)
| File | Type | Description |
|------|------|-------------|
| `components/landing-pages/editor/cart-theme-editor.tsx` | New | Cart theme admin editor |
| `app/(dashboard)/momentum/cart-recovery/page.tsx` | New | Analytics dashboard |

---

## 2. Database Changes

### New Models

```prisma
// Landing Page Product Junction
model LandingPageProduct {
  id            String @id @default(cuid())
  landingPageId String
  productId     String
  sortOrder     Int    @default(0)
  createdAt     DateTime @default(now())

  landingPage LandingPage @relation(fields: [landingPageId], references: [id])
  product     Product     @relation(fields: [productId], references: [id])

  @@unique([landingPageId, productId])
}

// Cart Save Configuration
model CartSaveConfig {
  id           String @id @default(cuid())
  companyId    String @unique
  enabled      Boolean @default(true)
  stageConfigs Json    // CartSaveFlowConfig
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  company Company @relation(fields: [companyId], references: [id])
}

// Cart Save Attempt
model CartSaveAttempt {
  id              String @id @default(cuid())
  cartId          String
  companyId       String
  customerId      String?
  channel         String?
  status          CartSaveStatus @default(ACTIVE)
  currentStage    String
  diagnosedReason String?
  riskScore       Int?
  stageHistory    Json   @default("[]")
  metadata        Json   @default("{}")
  scheduledAt     DateTime?
  completedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  cart          Cart     @relation(fields: [cartId], references: [id])
  company       Company  @relation(fields: [companyId], references: [id])
  customer      Customer? @relation(fields: [customerId], references: [id])
  interventions CartIntervention[]

  @@index([cartId])
  @@index([companyId])
  @@index([status])
}

// Cart Intervention
model CartIntervention {
  id                String @id @default(cuid())
  cartId            String
  companyId         String
  cartSaveAttemptId String
  stage             String
  channels          String[]
  type              String?
  offerId           String?
  offerCode         String?
  offerValue        Decimal?
  status            CartInterventionStatus @default(SCHEDULED)
  scheduledAt       DateTime?
  sentAt            DateTime?
  openedAt          DateTime?
  clickedAt         DateTime?
  executedAt        DateTime?
  responseType      String?
  responseData      Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  cart            Cart            @relation(fields: [cartId], references: [id])
  company         Company         @relation(fields: [companyId], references: [id])
  cartSaveAttempt CartSaveAttempt @relation(fields: [cartSaveAttemptId], references: [id])

  @@index([cartId])
  @@index([cartSaveAttemptId])
}
```

### Schema Field Additions

```prisma
// Added to LandingPage model
cartTheme      Json @default("{}")  // CartTheme configuration
productCatalog Json @default("{}")  // ProductCatalog configuration
catalogProducts LandingPageProduct[]

// Added to Cart model
saveAttempts   CartSaveAttempt[]
interventions  CartIntervention[]

// Added to Company model
cartSaveConfig   CartSaveConfig?
cartSaveAttempts CartSaveAttempt[]

// Added to Customer model
cartSaveAttempts CartSaveAttempt[]

// Added to Product model
landingPageProducts LandingPageProduct[]
```

### New Enums

```prisma
enum CartSaveStatus {
  PENDING
  ACTIVE
  CONVERTED
  EXHAUSTED
  EXPIRED
}

enum CartInterventionStatus {
  SCHEDULED
  SENT
  OPENED
  CLICKED
  EXECUTED
  FAILED
  CANCELLED
}
```

---

## 3. Migration Steps

### Step 1: Create Migration
```bash
cd apps/api
npx prisma migrate dev --name add_cart_theming_and_mi_cart_save
```

### Step 2: Generate Prisma Client
```bash
npx prisma generate
```

### Step 3: Verify Schema
```bash
npx prisma db push --force-reset  # Only in development
npx prisma migrate status
```

---

## 4. API Endpoints

### Cart Theme Endpoints
```
GET    /api/landing-pages/:id/cart-theme
PATCH  /api/landing-pages/:id/cart-theme
DELETE /api/landing-pages/:id/cart-theme (reset to default)
GET    /api/landing-pages/:id/cart-theme/preview
GET    /api/landing-pages/:id/product-catalog
PATCH  /api/landing-pages/:id/product-catalog
GET    /api/landing-pages/:id/products
POST   /api/landing-pages/:id/product-catalog/products
DELETE /api/landing-pages/:id/product-catalog/products
POST   /api/landing-pages/:id/product-catalog/reorder
GET    /api/landing-pages/cart-themes/presets
POST   /api/landing-pages/cart-themes/generate
```

### Cart Save Endpoints
```
POST   /api/momentum/cart-save/initiate
POST   /api/momentum/cart-save/attempts/:attemptId/progress
POST   /api/momentum/cart-save/attempts/:attemptId/diagnosis
POST   /api/momentum/cart-save/attempts/:attemptId/execute
GET    /api/momentum/cart-save/attempts/:attemptId/status
GET    /api/momentum/cart-save/config
PUT    /api/momentum/cart-save/config
POST   /api/momentum/cart-save/voice/initiate
POST   /api/momentum/cart-save/voice/outcome/:callId
GET    /api/momentum/cart-save/voice/analytics
POST   /api/momentum/cart-save/churn/track
POST   /api/momentum/cart-save/churn/escalate
GET    /api/momentum/cart-save/analytics/overview
GET    /api/momentum/cart-save/analytics/attempts
```

---

## 5. Recommended Indexes

```sql
-- Cart Save Attempts - high traffic queries
CREATE INDEX idx_cart_save_attempts_company_status
  ON "CartSaveAttempt" ("companyId", "status");

CREATE INDEX idx_cart_save_attempts_cart_status
  ON "CartSaveAttempt" ("cartId", "status");

CREATE INDEX idx_cart_save_attempts_created
  ON "CartSaveAttempt" ("createdAt" DESC);

-- Cart Interventions - tracking queries
CREATE INDEX idx_cart_interventions_attempt
  ON "CartIntervention" ("cartSaveAttemptId");

CREATE INDEX idx_cart_interventions_status
  ON "CartIntervention" ("status", "scheduledAt");

-- Landing Page Products - sort order queries
CREATE INDEX idx_landing_page_products_order
  ON "LandingPageProduct" ("landingPageId", "sortOrder");
```

---

## 6. Environment Variables

```bash
# Required for Voice Recovery
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

# API URL for callbacks
API_URL=https://api.yourdomain.com
PORTAL_URL=https://shop.yourdomain.com
```

---

## 7. Feature Flags (Optional)

```typescript
// Feature toggles for gradual rollout
ENABLE_CART_THEMING=true
ENABLE_MI_CART_SAVE=true
ENABLE_VOICE_RECOVERY=true
ENABLE_CHURN_DETECTION=true
```

---

## 8. Rollback Plan

### Database Rollback
```bash
npx prisma migrate resolve --rolled-back add_cart_theming_and_mi_cart_save
```

### Code Rollback
```bash
git revert <commit-hash>
```

### Feature Toggle Rollback
Set `ENABLE_CART_THEMING=false` and `ENABLE_MI_CART_SAVE=false`

---

## 9. Testing Checklist

### Unit Tests
- [ ] CartThemeService - theme resolution, CSS generation
- [ ] ProductCatalogService - filtering, sorting, pagination
- [ ] CartSaveService - flow progression, offer generation
- [ ] CartRecoveryVoiceService - call initiation, outcome processing
- [ ] CheckoutChurnDetectionService - event tracking, risk scoring

### Integration Tests
- [ ] Cart theme API endpoints
- [ ] Cart save flow API endpoints
- [ ] Voice recovery webhook handling
- [ ] Churn detection event pipeline

### E2E Tests
- [ ] Themed cart drawer rendering
- [ ] Behavioral triggers display
- [ ] Cart save flow user journey
- [ ] Admin theme editor

---

## 10. Monitoring

### Key Metrics to Track
- Cart abandonment rate
- Recovery rate by channel (email, SMS, voice, realtime)
- Recovery rate by reason
- Average time to conversion
- Offer acceptance rates
- Churn detection accuracy
- Voice call completion rate

### Alerts to Configure
- Recovery rate drops below 20%
- Voice call failure rate exceeds 10%
- Churn detection false positive rate exceeds 30%

---

## 11. Documentation Updates

- [ ] Update CLAUDE.md with new modules
- [ ] Add API documentation for new endpoints
- [ ] Update admin dashboard user guide
- [ ] Create cart theming configuration guide
- [ ] Create MI cart recovery operations guide

---

## 12. Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Engineering Lead | | | [ ] |
| QA Lead | | | [ ] |
| Product Manager | | | [ ] |
| DevOps | | | [ ] |

---

*Last Updated: January 27, 2026*
