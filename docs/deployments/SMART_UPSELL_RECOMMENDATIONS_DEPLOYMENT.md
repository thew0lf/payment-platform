# Smart Upsell & Product Recommendations - Deployment Plan

**Version:** 1.0
**Date:** January 26, 2026
**Feature:** Smart Upsell System + Amazon-Style Product Recommendations (Hybrid MI)

---

## Overview

This deployment introduces the Smart Upsell & Product Recommendations system, including:
- Bulk discount pricing with tiered quantity breaks
- Subscription intelligence with AI-predicted optimal frequencies
- Upsell targeting with customer segmentation and A/B testing
- Hybrid product recommendations (collaborative filtering + MI AI enhancement)

---

## Pre-Deployment Checklist

- [ ] Backup production database
- [ ] Verify staging environment passes all tests
- [ ] Notify team of deployment window
- [ ] Ensure rollback scripts are ready
- [ ] Verify AWS Bedrock/Claude integration is configured (for MI features)

---

## Database Changes

### New Enums (4)

```prisma
enum BulkDiscountType {
  PERCENTAGE
  FIXED_AMOUNT
  UNIT_PRICE
}

enum UpsellType {
  BULK_DISCOUNT
  SUBSCRIPTION
  CROSS_SELL
  BUNDLE
  FREE_GIFT
  FREE_SHIPPING
}

enum UpsellUrgency {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum SubscriptionFrequency {
  WEEKLY
  BIWEEKLY
  MONTHLY
  BIMONTHLY
  QUARTERLY
  BIANNUALLY
  ANNUALLY
}
```

### New Models (8)

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| `ProductBulkDiscount` | Quantity-based bulk pricing tiers | Product, Company |
| `ProductSubscriptionConfig` | Subscription pricing and eligibility | Product, Company |
| `UpsellTargetingRule` | Rule-based upsell targeting with conditions | Company |
| `UpsellImpression` | Tracks upsell impressions and conversions | UpsellTargetingRule |
| `UpsellExperiment` | A/B testing for upsell variations | Company, UpsellTargetingRule |
| `ProductView` | Session-based product view tracking | Product, Company, Customer |
| `RecommendationConfig` | Company-level recommendation settings | Company |
| `RecommendationImpression` | Tracks recommendation clicks and conversions | Product, Company |

### New Indexes (7)

| Model | Index | Purpose |
|-------|-------|---------|
| `ProductBulkDiscount` | `[productId]` | Lookup by product |
| `ProductSubscriptionConfig` | `[productId]` | Lookup by product |
| `UpsellTargetingRule` | `[companyId, enabled]` | Active rules by company |
| `UpsellImpression` | `[ruleId, createdAt]` | Rule performance analytics |
| `UpsellImpression` | `[sessionId]` | Session-based lookups |
| `ProductView` | `[productId, companyId, viewedAt]` | View analytics |
| `ProductView` | `[customerId, viewedAt]` | Customer view history |
| `RecommendationConfig` | `[companyId]` (unique) | Company config lookup |
| `RecommendationImpression` | `[productId, companyId, impressedAt]` | Impression analytics |
| `RecommendationImpression` | `[sessionId, impressedAt]` | Session-based tracking |

---

## Migration Steps

### Step 1: Generate Migration

```bash
# SSH into API container or server
cd /app/apps/api

# Create migration (do NOT apply yet)
npx prisma migrate dev --name add_smart_upsell_recommendations --create-only
```

### Step 2: Review Migration SQL

Review the generated migration file in `prisma/migrations/[timestamp]_add_smart_upsell_recommendations/migration.sql`:

```sql
-- Expected content (verify before applying):

-- CreateEnum
CREATE TYPE "BulkDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'UNIT_PRICE');
CREATE TYPE "UpsellType" AS ENUM ('BULK_DISCOUNT', 'SUBSCRIPTION', 'CROSS_SELL', 'BUNDLE', 'FREE_GIFT', 'FREE_SHIPPING');
CREATE TYPE "UpsellUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "SubscriptionFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'BIANNUALLY', 'ANNUALLY');

-- CreateTable ProductBulkDiscount
-- CreateTable ProductSubscriptionConfig
-- CreateTable UpsellTargetingRule
-- CreateTable UpsellImpression
-- CreateTable UpsellExperiment
-- CreateTable ProductView
-- CreateTable RecommendationConfig
-- CreateTable RecommendationImpression

-- CreateIndex (all indexes listed above)
```

### Step 3: Apply Migration

```bash
# Apply to staging first
DATABASE_URL=$STAGING_DATABASE_URL npx prisma migrate deploy

# Verify staging works correctly
# Run smoke tests

# Apply to production
DATABASE_URL=$PRODUCTION_DATABASE_URL npx prisma migrate deploy
```

### Step 4: Generate Prisma Client

```bash
npx prisma generate
```

---

## Backend Deployment

### New Modules

| Module | Path | Controllers |
|--------|------|-------------|
| `UpsellModule` | `src/upsell/` | `UpsellController`, `BulkDiscountController` |
| `RecommendationsModule` | `src/recommendations/` | `RecommendationsController` |

### New Services

| Service | Purpose |
|---------|---------|
| `BulkDiscountService` | Bulk discount CRUD and pricing calculations |
| `SubscriptionIntelligenceService` | Subscription eligibility and AI frequency prediction |
| `UpsellTargetingService` | Rule matching, segmentation, impression tracking |
| `ProductRecommendationService` | Hybrid recommendations with MI enhancement |

### API Endpoints Added

```
# Bulk Discounts
GET    /api/products/:productId/bulk-discount
PUT    /api/products/:productId/bulk-discount
DELETE /api/products/:productId/bulk-discount
GET    /api/products/:productId/bulk-recommendation
POST   /api/products/pricing/bulk-calculate

# Subscription Config
GET    /api/products/:productId/subscription-config
PUT    /api/products/:productId/subscription-config

# Upsell Targeting
GET    /api/upsell/cart/:cartId
GET    /api/upsell/rules
POST   /api/upsell/rules
PUT    /api/upsell/rules/:ruleId
DELETE /api/upsell/rules/:ruleId
POST   /api/upsell/impressions
POST   /api/upsell/impressions/accept
POST   /api/upsell/impressions/decline
GET    /api/upsell/subscription-eligibility/:productId
GET    /api/upsell/subscription-offer/:productId

# Recommendations
GET    /api/products/:productId/recommendations
GET    /api/products/:productId/recommendations/also-bought
GET    /api/products/:productId/recommendations/you-might-like
GET    /api/products/:productId/recommendations/frequently-viewed
POST   /api/recommendations/view
POST   /api/recommendations/click
POST   /api/recommendations/add-to-cart
GET    /api/admin/recommendations/config
PUT    /api/admin/recommendations/config
GET    /api/admin/recommendations/preview/:productId
```

### Deployment Command

```bash
# Build and deploy API
docker-compose -p avnz-payment-platform build api --no-cache
docker-compose -p avnz-payment-platform up -d api

# Verify health
curl http://localhost:3001/api/health
```

---

## Frontend Deployment

### New Admin Dashboard Pages

| Page | Path | Purpose |
|------|------|---------|
| Upsell Management | `/momentum/upsell` | Create/manage upsell targeting rules |
| Recommendations Config | `/momentum/recommendations` | Configure recommendation algorithms |

### New API Clients

| File | Purpose |
|------|---------|
| `lib/api/upsell.ts` | Upsell API client with types |
| `lib/api/recommendations.ts` | Recommendations API client with types |

### Deployment Command

```bash
# Build and deploy admin dashboard
docker-compose -p avnz-payment-platform build admin-dashboard --no-cache
docker-compose -p avnz-payment-platform up -d admin-dashboard

# Verify health
curl http://localhost:3000
```

---

## Post-Deployment Verification

### 1. Database Verification

```sql
-- Verify new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'ProductBulkDiscount',
  'ProductSubscriptionConfig',
  'UpsellTargetingRule',
  'UpsellImpression',
  'UpsellExperiment',
  'ProductView',
  'RecommendationConfig',
  'RecommendationImpression'
);

-- Verify indexes exist
SELECT indexname FROM pg_indexes
WHERE tablename IN (
  'ProductBulkDiscount',
  'ProductSubscriptionConfig',
  'UpsellTargetingRule',
  'UpsellImpression',
  'ProductView',
  'RecommendationConfig',
  'RecommendationImpression'
);
```

### 2. API Endpoint Tests

```bash
# Test bulk discount endpoint
curl -X GET http://localhost:3001/api/products/test-product/bulk-discount

# Test recommendations endpoint
curl -X GET "http://localhost:3001/api/products/test-product/recommendations?companyId=test-company"

# Test upsell rules (requires auth)
curl -X GET http://localhost:3001/api/upsell/rules \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Admin Dashboard Tests

1. Navigate to `/momentum/upsell`
2. Verify page loads without errors
3. Create a test upsell rule
4. Navigate to `/momentum/recommendations`
5. Verify configuration form loads
6. Update a configuration section

---

## Rollback Procedure

### If Issues Occur

#### Step 1: Rollback API

```bash
# Revert to previous API image
docker-compose -p avnz-payment-platform down api
docker-compose -p avnz-payment-platform up -d api --no-deps
```

#### Step 2: Rollback Database (if needed)

```bash
# List migrations
npx prisma migrate status

# Rollback migration (DESTRUCTIVE - use with caution)
# This will drop the new tables and data
npx prisma migrate resolve --rolled-back add_smart_upsell_recommendations
```

#### Step 3: Manual SQL Rollback (if automated rollback fails)

```sql
-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS "RecommendationImpression";
DROP TABLE IF EXISTS "RecommendationConfig";
DROP TABLE IF EXISTS "ProductView";
DROP TABLE IF EXISTS "UpsellExperiment";
DROP TABLE IF EXISTS "UpsellImpression";
DROP TABLE IF EXISTS "UpsellTargetingRule";
DROP TABLE IF EXISTS "ProductSubscriptionConfig";
DROP TABLE IF EXISTS "ProductBulkDiscount";

-- Drop enums
DROP TYPE IF EXISTS "SubscriptionFrequency";
DROP TYPE IF EXISTS "UpsellUrgency";
DROP TYPE IF EXISTS "UpsellType";
DROP TYPE IF EXISTS "BulkDiscountType";
```

---

## Performance Considerations

### Expected Query Patterns

| Query Type | Expected Frequency | Optimization |
|------------|-------------------|--------------|
| Get bulk discount by product | High (every product page) | Indexed on productId |
| Get targeted upsells for cart | Medium (cart page load) | Indexed on companyId + enabled |
| Track product view | High (every product view) | Indexed on productId + companyId |
| Get recommendations | High (product pages) | In-memory caching (5 min TTL) |
| Record impression | Medium | Async/fire-and-forget pattern |

### Caching Strategy

- Bulk discount configs: 5-minute TTL
- Recommendation configs: 5-minute TTL
- Product recommendations: 5-minute TTL per product
- Targeting rules: 1-minute TTL (allow quick updates)

---

## Monitoring & Alerts

### Key Metrics to Monitor

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Recommendation API latency | > 500ms | Warning |
| Upsell API latency | > 300ms | Warning |
| Recommendation cache hit rate | < 80% | Warning |
| UpsellImpression insert rate | > 1000/min | Info |
| ProductView insert rate | > 5000/min | Info |

### Log Patterns to Watch

```
# Errors to alert on
"Failed to calculate bulk price"
"Failed to get targeted upsells"
"Recommendation service error"

# Info logs
"Bulk discount applied"
"Upsell impression recorded"
"Recommendation clicked"
```

---

## Feature Flags (Optional)

If using feature flags, consider these toggles:

| Flag | Default | Purpose |
|------|---------|---------|
| `smart_upsell_enabled` | false | Enable upsell targeting |
| `bulk_discounts_enabled` | true | Enable bulk discount display |
| `recommendations_enabled` | true | Enable product recommendations |
| `mi_recommendations_enabled` | false | Enable MI-enhanced recommendations |
| `subscription_intelligence_enabled` | false | Enable AI frequency prediction |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| DBA | | | |
| QA | | | |
| DevOps | | | |
| Product Owner | | | |

---

*Document Version: 1.0*
*Last Updated: January 26, 2026*
