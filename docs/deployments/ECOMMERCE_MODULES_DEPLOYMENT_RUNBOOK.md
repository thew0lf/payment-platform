# E-Commerce Modules Deployment Runbook

**Version:** 2.0
**Date:** January 1, 2026
**Author:** Senior DevOps Engineer
**Modules:** Cart, Wishlist, Comparison, Cross-Site Session, E-Commerce Analytics

---

## Executive Summary

This runbook covers the production deployment of five new e-commerce modules that enhance the platform's shopping experience:

| Module | Purpose | Key Features |
|--------|---------|--------------|
| **Cart** | Shopping cart management | Bundle integration, discount codes, save-for-later, cart merging |
| **Wishlist** | Customer wishlist management | Public sharing, session-based, priority ordering |
| **Comparison** | Product comparison (max 4 items) | Share tokens, cross-session persistence |
| **Cross-Site Session** | Session synchronization | Multi-site cart/wishlist/comparison sync, customer merge |
| **E-Commerce Analytics** | Unified analytics dashboard | Parameterized SQL queries, time-series data |

### Deployment Scope

**Git Commit:** `c83a50e` - feat(ecommerce): add Cart, Wishlist, Comparison, CrossSiteSession, and EcommerceAnalytics modules

**Files Changed:** 88 files
- Backend: 45 new files (NestJS modules, services, controllers, tests)
- Frontend: 6 new/modified files (Next.js pages, API clients)
- Database: 2 migrations (tables + performance indexes)

---

## 1. Pre-Deployment Checklist

### 1.1 Required Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection for caching/sessions |
| `COMPANY_PORTAL_URL` | No | `http://localhost:3003` | Base URL for comparison share links |
| `NODE_ENV` | Yes | `production` | Environment identifier |

**Note:** The Cart module demo discount codes (`SAVE10`, `SAVE20`, etc.) are only available when `NODE_ENV !== 'production'`. Production discount functionality requires the Promotions module.

### 1.2 Database Migration Readiness

**CRITICAL: Two migrations must be applied in sequence:**

| Order | Migration | Purpose | Risk Level |
|-------|-----------|---------|------------|
| 1 | `20260101140542_add_ecommerce_modules` | Create tables, enums, indexes, foreign keys | Low (new tables only) |
| 2 | `20260101140600_add_cart_and_session_partial_indexes` | Add partial indexes for background jobs | Low (indexes only) |

**Pre-flight Checks:**

```bash
# 1. Verify schema changes are documented
grep -c "PENDING" docs/DATABASE_SCHEMA_CHANGELOG.md
# Expected: 0 (no pending changes)

# 2. Check migration status (shows 2 pending migrations)
docker exec -it avnz-payment-api npx prisma migrate status

# 3. Verify migrations are in correct order
ls -la apps/api/prisma/migrations/ | grep 20260101
# Should show: add_ecommerce_modules BEFORE add_cart_and_session_partial_indexes

# 4. Dry-run migration (optional - requires shadow database)
docker exec -it avnz-payment-api npx prisma migrate deploy --preview-feature
```

**New Database Objects:**

| Type | Name | Notes |
|------|------|-------|
| **Enums** | `SiteType`, `CartStatus`, `CrossSiteSessionStatus` | New enums |
| **Tables** | `carts`, `cart_items`, `saved_cart_items` | Cart system |
| **Tables** | `wishlists`, `wishlist_items` | Wishlist system |
| **Tables** | `product_comparisons`, `product_comparison_items` | Comparison system |
| **Tables** | `cross_site_sessions` | Session sync |
| **Indexes** | 25+ B-tree indexes | Standard indexes |
| **Indexes** | 3 partial indexes | Recovery candidates, cleanup, expiration |
| **Columns** | 10 new columns on `sites` table | E-commerce feature flags |

### 1.3 Infrastructure Requirements

#### PostgreSQL
- **Minimum Version:** 14.0
- **Connection Pool Size:** Increase by 20% to accommodate new modules
- **Recommended:** 75 connections minimum for production (was 50)

#### Redis
- **Minimum Version:** 6.0
- **Memory:** Add 512MB headroom for session data
- **Eviction Policy:** `allkeys-lru` for cache resilience

#### Prisma Client
- **Binary Targets Required:**
  - `native`
  - `linux-musl-arm64-openssl-1.1.x`
  - `linux-musl-arm64-openssl-3.0.x`
  - `linux-musl-openssl-3.0.x`

### 1.4 Feature Flags

No feature flags are required for this deployment. All modules are enabled by default when deployed.

**Optional Site-Level Configuration:**
Sites can disable specific features via the `Site` model:
- `enableCart` (default: `true`)
- `enableWishlist` (default: `true`)
- `enableCompare` (default: `false`)
- `maxCompareItems` (default: `4`)
- `cartExpirationDays` (default: `30`)
- `enableQuickView` (default: `true`)
- `enableBundleBuilder` (default: `false`)
- `guestCheckout` (default: `true`)

---

## 2. Database Migration Strategy

### 2.1 Migration Details

#### Migration 1: `20260101140542_add_ecommerce_modules`

**Operations:**
1. Create 3 new enums: `SiteType`, `CartStatus`, `CrossSiteSessionStatus`
2. Add enum value `LOGO_GENERATION` to existing `AIFeature` enum
3. Alter `sites` table: Add 10 new columns for e-commerce feature flags
4. Create 8 new tables with all columns, constraints, and default values
5. Create 25+ indexes (B-tree, unique constraints)
6. Create 15+ foreign key relationships

**Estimated Duration:** 5-15 seconds (empty tables)

**Lock Analysis:**
- `sites` table: Brief `ACCESS EXCLUSIVE` lock for ALTER TABLE (< 1 second)
- All CREATE TABLE operations: No locks on existing data
- All CREATE INDEX operations: Online creation, no blocking

#### Migration 2: `20260101140600_add_cart_and_session_partial_indexes`

**Operations:**
```sql
-- 1. Abandoned cart recovery candidates
CREATE INDEX idx_carts_recovery_candidates
ON carts ("companyId", "abandonedAt", "recoveryEmailSent")
WHERE status = 'ABANDONED' AND "recoveryEmailSent" = false;

-- 2. Session cleanup index
CREATE INDEX idx_cross_site_sessions_cleanup
ON cross_site_sessions ("expiresAt")
WHERE status = 'ACTIVE';

-- 3. Cart expiration index
CREATE INDEX idx_carts_expiration
ON carts ("expiresAt")
WHERE status = 'ACTIVE' AND "expiresAt" IS NOT NULL;
```

**Estimated Duration:** < 1 second (empty tables)

### 2.2 Zero-Downtime Migration Strategy

**This migration is fully zero-downtime compatible:**

1. **No breaking changes** - All operations are additive (new tables, columns, indexes)
2. **No column modifications** - Existing columns are untouched
3. **No data migration** - New tables start empty
4. **Backward compatible** - Existing API endpoints unchanged

**Migration can run while application is live:**
- Old code continues working (ignores new tables)
- New code requires new tables (deploy after migration)

### 2.3 Rollback Procedures

**CRITICAL: Rollback should only be used if data corruption or critical bugs are discovered.**

**Automatic Rollback (Recommended):**

```bash
# List applied migrations
docker exec -it avnz-payment-api npx prisma migrate status

# Mark migrations as rolled back (does NOT drop tables)
docker exec -it avnz-payment-api npx prisma migrate resolve \
  --rolled-back 20260101140600_add_cart_and_session_partial_indexes

docker exec -it avnz-payment-api npx prisma migrate resolve \
  --rolled-back 20260101140542_add_ecommerce_modules
```

**Manual Rollback (Data Loss - Use Only If Necessary):**

```sql
-- EMERGENCY ROLLBACK: Execute only if critical issues discovered
-- This will DROP all new tables and lose any data created

BEGIN;

-- Drop in reverse dependency order
DROP TABLE IF EXISTS "cross_site_sessions" CASCADE;
DROP TABLE IF EXISTS "product_comparison_items" CASCADE;
DROP TABLE IF EXISTS "product_comparisons" CASCADE;
DROP TABLE IF EXISTS "wishlist_items" CASCADE;
DROP TABLE IF EXISTS "wishlists" CASCADE;
DROP TABLE IF EXISTS "saved_cart_items" CASCADE;
DROP TABLE IF EXISTS "cart_items" CASCADE;
DROP TABLE IF EXISTS "carts" CASCADE;

-- Drop new columns from sites table
ALTER TABLE "sites"
  DROP COLUMN IF EXISTS "type",
  DROP COLUMN IF EXISTS "enableCart",
  DROP COLUMN IF EXISTS "enableWishlist",
  DROP COLUMN IF EXISTS "enableCompare",
  DROP COLUMN IF EXISTS "enableQuickView",
  DROP COLUMN IF EXISTS "enableBundleBuilder",
  DROP COLUMN IF EXISTS "maxCompareItems",
  DROP COLUMN IF EXISTS "cartExpirationDays",
  DROP COLUMN IF EXISTS "checkoutMode",
  DROP COLUMN IF EXISTS "guestCheckout";

-- Drop enums
DROP TYPE IF EXISTS "CrossSiteSessionStatus" CASCADE;
DROP TYPE IF EXISTS "CartStatus" CASCADE;
DROP TYPE IF EXISTS "SiteType" CASCADE;

-- Remove enum value (PostgreSQL 13+)
-- Note: Cannot easily remove enum values in older PostgreSQL versions

COMMIT;
```

### 2.4 Data Backup Requirements

**Pre-Migration Backup (MANDATORY):**

```bash
# Full database backup before migration
pg_dump -h $DB_HOST -U $DB_USER -d payment_platform \
  --format=custom \
  --file=backup_pre_ecommerce_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
pg_restore --list backup_pre_ecommerce_*.dump | head -20

# Upload to S3 for disaster recovery
aws s3 cp backup_pre_ecommerce_*.dump \
  s3://avnz-backups/production/pre-deploy/
```

**Minimum RTO/RPO:**
- **RTO (Recovery Time Objective):** 1 hour
- **RPO (Recovery Point Objective):** 15 minutes

---

## 3. Deployment Sequence

### 3.1 Deployment Strategy: Blue-Green with Rolling Migration

**Recommended Approach:** Zero-downtime deployment with database migration before code deployment.

```
┌─────────────────────────────────────────────────────────────────────┐
│                       DEPLOYMENT TIMELINE                            │
├─────────────────────────────────────────────────────────────────────┤
│ T-60min  │ Final code review and approval                           │
│ T-30min  │ Create database backup                                    │
│ T-15min  │ Notify team, prepare rollback scripts                     │
│ T-0      │ Apply database migrations (zero-downtime)                 │
│ T+2min   │ Verify migrations applied successfully                    │
│ T+5min   │ Deploy API (blue-green or rolling)                        │
│ T+10min  │ Health checks on new API instances                        │
│ T+12min  │ Deploy Frontend (admin-dashboard, company-portal)         │
│ T+15min  │ Run smoke tests                                           │
│ T+20min  │ Monitor metrics for 15 minutes                            │
│ T+35min  │ Confirm deployment success                                │
│ T+60min  │ Complete post-deployment verification                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Step-by-Step Deployment Commands

#### Phase 1: Database Migration (T-0 to T+2)

```bash
# 1. Verify current state
docker exec -it avnz-payment-api npx prisma migrate status

# 2. Apply migrations to production database
docker exec -it avnz-payment-api npx prisma migrate deploy

# Expected output:
# 2 migrations applied:
# - 20260101140542_add_ecommerce_modules
# - 20260101140600_add_cart_and_session_partial_indexes

# 3. Verify tables created
docker exec -it avnz-payment-postgres psql -U postgres -d payment_platform \
  -c "SELECT table_name FROM information_schema.tables
      WHERE table_name IN ('carts', 'wishlists', 'product_comparisons', 'cross_site_sessions');"

# Expected: 4 rows returned
```

#### Phase 2: API Deployment (T+5 to T+10)

```bash
# Option A: Docker Compose (Development/Staging)
docker-compose -p avnz-payment-platform build api --no-cache
docker-compose -p avnz-payment-platform up -d api

# Option B: Kubernetes (Production)
kubectl set image deployment/api api=avnz/api:v2.0.0-ecommerce
kubectl rollout status deployment/api --timeout=300s

# 4. Regenerate Prisma client (if not in build)
docker exec -it avnz-payment-api npx prisma generate

# 5. Wait for health check (30 seconds)
sleep 30

# 6. Verify API is healthy
curl -f http://localhost:3001/api/health || exit 1
```

#### Phase 3: Frontend Deployment (T+12)

```bash
# Deploy admin dashboard
docker-compose -p avnz-payment-platform build admin-dashboard --no-cache
docker-compose -p avnz-payment-platform up -d admin-dashboard

# Deploy company portal
docker-compose -p avnz-payment-platform build portal --no-cache
docker-compose -p avnz-payment-platform up -d portal

# Verify frontends
curl -sf http://localhost:3000 > /dev/null && echo "Admin dashboard: OK"
curl -sf http://localhost:3003 > /dev/null && echo "Company portal: OK"
```

### 3.3 Health Check Endpoints

| Endpoint | Method | Expected Response | Purpose |
|----------|--------|-------------------|---------|
| `/api/health` | GET | `200 OK` | API liveness |
| `/api/cart` | GET | `200 OK` or `401` | Cart module loaded |
| `/api/wishlist` | GET | `200 OK` or `401` | Wishlist module loaded |
| `/api/comparison` | GET | `200 OK` or `401` | Comparison module loaded |
| `/api/cross-site-session` | GET | `200 OK` or `401` | Session module loaded |
| `/api/analytics/ecommerce/overview` | GET | `200 OK` or `401` | Analytics module loaded |

**Health Check Script:**

```bash
#!/bin/bash
set -e

API_URL="${API_URL:-http://localhost:3001}"

echo "=== E-Commerce Modules Health Check ==="

echo "Checking API health..."
curl -sf "$API_URL/api/health" > /dev/null || { echo "FAIL: API not responding"; exit 1; }
echo "PASS: API healthy"

# Check module endpoints (expect 401 Unauthorized, not 404)
for endpoint in cart wishlist comparison cross-site-session; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/$endpoint")
  if [[ "$status" == "401" || "$status" == "200" ]]; then
    echo "PASS: $endpoint module loaded (HTTP $status)"
  else
    echo "FAIL: $endpoint module not loaded (HTTP $status)"
    exit 1
  fi
done

echo "=== All Health Checks Passed ==="
```

### 3.4 Monitoring Setup

**Datadog Dashboard Widgets to Add:**

1. **Cart Metrics**
   - Active carts count
   - Cart abandonment rate
   - Average cart value
   - Bundle additions per hour

2. **Session Metrics**
   - Active cross-site sessions
   - Session merge rate
   - Cross-site transfers per hour

3. **Analytics Query Performance**
   - `$queryRaw` execution time (P95)
   - Time series query latency

**Alerts to Configure:**

| Alert | Threshold | Severity |
|-------|-----------|----------|
| Cart endpoint latency > 500ms | P95 | Warning |
| Cart endpoint latency > 2000ms | P95 | Critical |
| Cross-site session errors | > 10/min | Warning |
| Analytics query timeout | > 30s | Critical |
| Cart table size > 1M rows | N/A | Info |

---

## 4. Post-Deployment Verification

### 4.1 Smoke Tests

**Automated Test Script:**

```bash
#!/bin/bash
# Run after deployment to verify functionality
set -e

API_URL="${API_URL:-http://localhost:3001}"
COMPANY_ID="${TEST_COMPANY_ID:-test-company-id}"
AUTH_TOKEN="${TEST_AUTH_TOKEN}"

echo "=== E-Commerce Modules Smoke Tests ==="

# Test 1: Create anonymous cart
echo "Test 1: Create anonymous cart..."
CART=$(curl -sf -X POST "$API_URL/api/public/cart" \
  -H "Content-Type: application/json" \
  -H "x-company-id: $COMPANY_ID" \
  -d '{"currency": "USD"}')
echo "PASS: Cart created"
CART_ID=$(echo $CART | jq -r '.id')
SESSION_TOKEN=$(echo $CART | jq -r '.sessionToken')

# Test 2: Retrieve cart
echo "Test 2: Verify cart retrieval..."
curl -sf "$API_URL/api/public/cart" \
  -H "x-session-token: $SESSION_TOKEN" \
  -H "x-company-id: $COMPANY_ID" > /dev/null
echo "PASS: Cart retrieval works"

# Test 3: Wishlist operations (authenticated)
echo "Test 3: Wishlist operations..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/wishlist" \
  -H "Authorization: Bearer $AUTH_TOKEN")
if [[ "$STATUS" == "200" || "$STATUS" == "401" ]]; then
  echo "PASS: Wishlist endpoint accessible (HTTP $STATUS)"
else
  echo "FAIL: Wishlist returned unexpected HTTP $STATUS"
  exit 1
fi

# Test 4: Comparison operations
echo "Test 4: Comparison operations..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/comparison" \
  -H "Authorization: Bearer $AUTH_TOKEN")
if [[ "$STATUS" == "200" || "$STATUS" == "401" ]]; then
  echo "PASS: Comparison endpoint accessible (HTTP $STATUS)"
else
  echo "FAIL: Comparison returned unexpected HTTP $STATUS"
  exit 1
fi

# Test 5: E-Commerce Analytics (authenticated)
echo "Test 5: E-Commerce Analytics Overview..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/analytics/ecommerce/overview" \
  -H "Authorization: Bearer $AUTH_TOKEN")
if [[ "$STATUS" == "200" ]]; then
  echo "PASS: Analytics overview accessible"
elif [[ "$STATUS" == "401" ]]; then
  echo "PASS: Analytics requires authentication (expected)"
else
  echo "FAIL: Analytics returned unexpected HTTP $STATUS"
  exit 1
fi

# Test 6: Frontend pages
echo "Test 6: Admin dashboard e-commerce page..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/insights/ecommerce")
if [[ "$STATUS" == "200" || "$STATUS" == "302" ]]; then
  echo "PASS: E-commerce insights page accessible"
else
  echo "WARN: E-commerce page returned HTTP $STATUS (may require auth)"
fi

echo "=== All Smoke Tests Passed ==="
```

### 4.2 Database Verification

```bash
# Verify all tables created
docker exec -it avnz-payment-postgres psql -U postgres -d payment_platform -c "
SELECT
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN (
  'carts', 'cart_items', 'saved_cart_items',
  'wishlists', 'wishlist_items',
  'product_comparisons', 'product_comparison_items',
  'cross_site_sessions'
)
ORDER BY table_name;
"

# Verify indexes created
docker exec -it avnz-payment-postgres psql -U postgres -d payment_platform -c "
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('carts', 'wishlists', 'product_comparisons', 'cross_site_sessions')
ORDER BY tablename, indexname;
"

# Verify partial indexes
docker exec -it avnz-payment-postgres psql -U postgres -d payment_platform -c "
SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
  AND indexdef LIKE '%WHERE%';
"
```

### 4.3 Performance Baselines

**Establish baselines within first 24 hours:**

| Metric | Target | Method |
|--------|--------|--------|
| Cart creation latency | < 50ms P95 | Load test with 100 concurrent users |
| Cart item add latency | < 100ms P95 | Load test with 100 concurrent users |
| Bundle add latency | < 200ms P95 | Transactions add overhead |
| Analytics overview query | < 500ms P95 | Complex aggregation |
| Cross-site session merge | < 300ms P95 | Multi-table transaction |

**Load Test Command:**

```bash
# Using k6 for load testing
k6 run --vus 100 --duration 5m scripts/load-tests/cart-operations.js
```

### 4.4 Rollback Triggers

**Automatic Rollback Criteria (PagerDuty Alert):**

1. **Error Rate:** > 10% of requests returning 5xx for 5 minutes
2. **Latency:** P95 > 5 seconds for 10 minutes
3. **Database:** Connection pool exhausted
4. **Health Checks:** 3 consecutive failures

**Manual Rollback Decision Points:**

1. Data corruption detected in new tables
2. Cross-site session sync causing customer confusion
3. Cart totals calculation errors
4. Security vulnerability discovered

---

## 5. Rollback Procedure

### 5.1 Quick Rollback (Application Only)

If issues are found with the new code but database is fine:

```bash
# Rollback to previous API image
kubectl rollout undo deployment/api

# Or with Docker Compose
docker-compose -p avnz-payment-platform stop api
docker tag avnz/api:previous avnz/api:latest
docker-compose -p avnz-payment-platform up -d api
```

### 5.2 Full Rollback (Database + Application)

**CAUTION: This will delete all data in new tables.**

```bash
# 1. Stop application
docker-compose -p avnz-payment-platform stop api admin-dashboard portal

# 2. Execute database rollback (see Section 2.3)

# 3. Restore from backup if needed
pg_restore -h $DB_HOST -U $DB_USER -d payment_platform \
  --clean --if-exists backup_pre_ecommerce_*.dump

# 4. Deploy previous version
docker-compose -p avnz-payment-platform up -d
```

---

## 6. Scaling Considerations

### 6.1 Expected Load Patterns

| Scenario | Carts/Hour | Sessions/Hour | Analytics Queries/Hour |
|----------|------------|---------------|------------------------|
| Normal | 1,000 | 5,000 | 100 |
| Peak (Black Friday) | 50,000 | 200,000 | 1,000 |
| Promotional Event | 10,000 | 50,000 | 500 |

### 6.2 Connection Pool Sizing

**Updated Configuration:**

```
# prisma/.env - Increase connection limit
DATABASE_URL="postgresql://...?connection_limit=75&pool_timeout=30"
```

**Calculation:**
- Base: 50 connections
- Cart operations: +10 (transactions for bundles)
- Cross-site session: +10 (session merges)
- Analytics: +5 (complex queries)
- **Total:** 75 connections

### 6.3 Auto-Scaling Rules

**Kubernetes HPA Configuration:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## 7. Maintenance Tasks

### 7.1 Scheduled Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `cleanupExpiredSessions` | Daily 3:00 AM | Expire old cross-site sessions |
| `markAbandonedCarts` | Hourly | Mark carts abandoned after 30 days |
| `purgeOldComparisons` | Weekly | Remove comparisons older than 90 days |
| `sendRecoveryEmails` | Every 15 min | Send cart recovery emails |
| `vacuumAnalyze` | Weekly | Optimize table statistics |

### 7.2 Data Retention

| Table | Retention | Archive Strategy |
|-------|-----------|------------------|
| `carts` (CONVERTED) | 2 years | Archive to S3 |
| `carts` (ABANDONED) | 90 days | Delete |
| `wishlists` | Indefinite | - |
| `product_comparisons` | 90 days | Delete |
| `cross_site_sessions` (EXPIRED/MERGED) | 30 days | Delete |

---

## 8. Security Checklist

### 8.1 Pre-Deployment Security Review

- [ ] Session tokens use `crypto.randomBytes(32)` - 64 hex characters
- [ ] Token comparison uses `crypto.timingSafeEqual()` for timing attack prevention
- [ ] All endpoints validate `companyId` matches user scope
- [ ] Products validated to belong to same company as cart/wishlist
- [ ] SQL injection prevented via Prisma parameterized queries
- [ ] Rate limiting configured for public endpoints
- [ ] CORS configured to allow only trusted origins

### 8.2 Post-Deployment Security Verification

```bash
# Test session token length
curl -sf -X POST "$API_URL/api/public/cart" \
  -H "Content-Type: application/json" \
  -H "x-company-id: $COMPANY_ID" \
  -d '{"currency": "USD"}' | jq -r '.sessionToken | length'
# Expected: 64

# Test cross-company access denied
curl -sf "$API_URL/api/public/cart" \
  -H "x-session-token: valid-token-from-company-a" \
  -H "x-company-id: different-company-b"
# Expected: 404 or 403
```

---

## 9. Appendix

### 9.1 API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| **Cart (Authenticated)** | | | |
| GET | `/api/cart` | JWT | Get user's cart |
| POST | `/api/cart/items` | JWT | Add item |
| PATCH | `/api/cart/items/:itemId` | JWT | Update item |
| DELETE | `/api/cart/items/:itemId` | JWT | Remove item |
| POST | `/api/cart/bundles` | JWT | Add bundle |
| DELETE | `/api/cart/bundles/:bundleGroupId` | JWT | Remove bundle |
| POST | `/api/cart/discount` | JWT | Apply discount |
| DELETE | `/api/cart/discount/:code` | JWT | Remove discount |
| POST | `/api/cart/merge` | JWT | Merge guest cart |
| **Cart (Public)** | | | |
| GET | `/api/public/cart` | Header | Get cart by session |
| POST | `/api/public/cart` | Header | Create cart |
| POST | `/api/public/cart/:id/items` | Header | Add item |
| POST | `/api/public/cart/:id/bundles` | Header | Add bundle |
| **Wishlist** | | | |
| GET | `/api/wishlist` | JWT | Get user's wishlist |
| POST | `/api/wishlist/items` | JWT | Add item |
| DELETE | `/api/wishlist/items/:itemId` | JWT | Remove item |
| POST | `/api/wishlist/share` | JWT | Enable sharing |
| **Comparison** | | | |
| GET | `/api/comparison` | JWT | Get comparison |
| POST | `/api/comparison/items` | JWT | Add product |
| DELETE | `/api/comparison/items/:itemId` | JWT | Remove product |
| POST | `/api/comparison/share` | JWT | Generate share link |
| **Cross-Site Session** | | | |
| POST | `/api/cross-site-session` | JWT | Create session |
| POST | `/api/cross-site-session/transfer` | JWT | Transfer to site |
| POST | `/api/cross-site-session/merge` | JWT | Merge on login |
| **Analytics** | | | |
| GET | `/api/analytics/ecommerce/overview` | JWT | Dashboard overview |
| GET | `/api/analytics/ecommerce/cart` | JWT | Cart analytics |
| GET | `/api/analytics/ecommerce/wishlist` | JWT | Wishlist analytics |
| GET | `/api/analytics/ecommerce/comparison` | JWT | Comparison analytics |
| GET | `/api/analytics/ecommerce/cross-site-sessions` | JWT | Session analytics |

### 9.2 Contact Information

| Role | Contact |
|------|---------|
| DevOps Lead | devops@avnz.io |
| Backend Lead | backend@avnz.io |
| On-Call | PagerDuty: #ecommerce-oncall |
| Database Admin | dba@avnz.io |

### 9.3 Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-31 | DevOps Engineer | Initial runbook |
| 2.0 | 2026-01-01 | DevOps Engineer | Added missing migration, fixed migration order, enhanced verification steps |

---

**Approval Signatures:**

- [ ] DevOps Lead
- [ ] Backend Lead
- [ ] DBA
- [ ] Security Team
- [ ] Product Owner

---

*This runbook follows SOC2, ISO 27001, and PCI-DSS deployment standards.*
