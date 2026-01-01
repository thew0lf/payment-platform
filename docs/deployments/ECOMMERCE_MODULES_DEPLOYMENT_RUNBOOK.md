# E-Commerce Modules Deployment Runbook

**Version:** 1.0
**Date:** December 31, 2025
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

**Pre-flight Checks:**

```bash
# 1. Verify schema changes are documented
grep -c "PENDING" docs/DATABASE_SCHEMA_CHANGELOG.md
# Expected: 0 (no pending changes)

# 2. Check migration status
docker exec -it avnz-payment-api npx prisma migrate status

# 3. Verify no uncommitted schema changes
docker exec -it avnz-payment-api npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --exit-code
```

**New Models to be Created:**

| Model | Table Name | Estimated Rows (Initial) |
|-------|------------|--------------------------|
| `Cart` | `carts` | 0 |
| `CartItem` | `cart_items` | 0 |
| `SavedCartItem` | `saved_cart_items` | 0 |
| `Wishlist` | `wishlists` | 0 |
| `WishlistItem` | `wishlist_items` | 0 |
| `ProductComparison` | `product_comparisons` | 0 |
| `ProductComparisonItem` | `product_comparison_items` | 0 |
| `CrossSiteSession` | `cross_site_sessions` | 0 |

### 1.3 Infrastructure Requirements

#### PostgreSQL
- **Minimum Version:** 14.0
- **Connection Pool Size:** Increase by 20% to accommodate new modules
- **Recommended:** 50 connections minimum for production

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

---

## 2. Database Migration Strategy

### 2.1 Migration Order and Dependencies

```
1. Cart/CartItem/SavedCartItem (no dependencies on new tables)
   └── Depends on: Company, Site, Customer, Product

2. Wishlist/WishlistItem (no dependencies on new tables)
   └── Depends on: Company, Site, Customer, Product

3. ProductComparison/ProductComparisonItem (no dependencies on new tables)
   └── Depends on: Company, Site, Customer, Product

4. CrossSiteSession (depends on existing tables only)
   └── Depends on: Company, Customer
```

**Migration can run in a single transaction** - all tables are independent of each other.

### 2.2 Index Creation Strategy

The following indexes are created with the migration:

| Table | Index | Type | Strategy |
|-------|-------|------|----------|
| `carts` | `(companyId, status)` | B-tree | Online |
| `carts` | `(companyId, customerId)` | B-tree | Online |
| `carts` | `(sessionToken)` | B-tree, Unique | Online |
| `carts` | `(visitorId)` | B-tree | Online |
| `carts` | `(status, expiresAt)` | B-tree | Online |
| `carts` | `(companyId, siteId, status)` | Composite | Online |
| `cart_items` | `(cartId)` | B-tree | Online |
| `cart_items` | `(productId)` | B-tree | Online |
| `wishlists` | `(companyId)` | B-tree | Online |
| `wishlists` | `(customerId)` | B-tree | Online |
| `wishlists` | `(sessionToken)` | B-tree, Unique | Online |
| `wishlists` | `(sharedUrl)` | B-tree, Unique | Online |
| `wishlist_items` | `(wishlistId, productId, variantId)` | Composite, Unique | Online |
| `product_comparisons` | `(companyId)` | B-tree | Online |
| `product_comparisons` | `(companyId, customerId)` | B-tree | Online |
| `product_comparisons` | `(sessionToken)` | B-tree, Unique | Online |
| `product_comparisons` | `(shareToken)` | B-tree, Unique | Online |
| `product_comparisons` | `(expiresAt)` | B-tree | Online |
| `cross_site_sessions` | `(companyId)` | B-tree | Online |
| `cross_site_sessions` | `(customerId)` | B-tree | Online |
| `cross_site_sessions` | `(sessionToken)` | B-tree, Unique | Online |
| `cross_site_sessions` | `(status)` | B-tree | Online |
| `cross_site_sessions` | `(expiresAt)` | B-tree | Online |

**All indexes can be created online** - PostgreSQL 14+ supports `CREATE INDEX CONCURRENTLY` for B-tree indexes.

### 2.3 Rollback Procedures

**Rollback Script:**

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

-- Drop enum if created
DROP TYPE IF EXISTS "CrossSiteSessionStatus" CASCADE;
DROP TYPE IF EXISTS "CartStatus" CASCADE;

COMMIT;
```

**Prisma Rollback:**

```bash
# Identify the migration to rollback to
docker exec -it avnz-payment-api npx prisma migrate status

# Reset to specific migration (DESTRUCTIVE - use with caution)
docker exec -it avnz-payment-api npx prisma migrate resolve --rolled-back <migration_name>
```

### 2.4 Data Backup Requirements

**Pre-Migration Backup:**

```bash
# Full database backup before migration
pg_dump -h $DB_HOST -U $DB_USER -d payment_platform \
  --format=custom \
  --file=backup_pre_ecommerce_$(date +%Y%m%d_%H%M%S).dump

# Verify backup
pg_restore --list backup_pre_ecommerce_*.dump | head -20
```

**Minimum RTO/RPO:**
- **RTO (Recovery Time Objective):** 1 hour
- **RPO (Recovery Point Objective):** 15 minutes

---

## 3. Deployment Sequence

### 3.1 Deployment Strategy: Blue-Green

**Recommended Approach:** Blue-Green deployment with database migration during maintenance window.

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT TIMELINE                       │
├─────────────────────────────────────────────────────────────┤
│ T-60min  │ Announce maintenance window                      │
│ T-30min  │ Scale down to minimum instances                  │
│ T-15min  │ Final backup                                     │
│ T-0      │ Run database migration                           │
│ T+5min   │ Deploy Green environment                         │
│ T+10min  │ Health checks on Green                           │
│ T+15min  │ Switch traffic to Green                          │
│ T+20min  │ Monitor for 15 minutes                           │
│ T+35min  │ Decommission Blue (or keep for rollback)         │
│ T+60min  │ End maintenance window                           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Service Restart Order

```bash
# 1. Apply database migration
docker exec -it avnz-payment-api npx prisma migrate deploy

# 2. Regenerate Prisma client
docker exec -it avnz-payment-api npx prisma generate

# 3. Restart API service
docker-compose -p avnz-payment-platform restart api

# 4. Wait for health check (30 seconds)
sleep 30

# 5. Verify API is healthy
curl -f http://localhost:3001/api/health || exit 1

# 6. Restart dependent services
docker-compose -p avnz-payment-platform restart admin-dashboard
docker-compose -p avnz-payment-platform restart portal
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

echo "All health checks passed!"
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

**Test Script:**

```bash
#!/bin/bash
# Run after deployment to verify functionality
set -e

API_URL="${API_URL:-http://localhost:3001}"
COMPANY_ID="${TEST_COMPANY_ID}"
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

# Test 2: Add item to cart (requires valid product ID)
echo "Test 2: Verify cart retrieval..."
curl -sf "$API_URL/api/public/cart" \
  -H "x-session-token: $SESSION_TOKEN" \
  -H "x-company-id: $COMPANY_ID" > /dev/null
echo "PASS: Cart retrieval works"

# Test 3: E-Commerce Analytics (authenticated)
echo "Test 3: E-Commerce Analytics Overview..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/analytics/ecommerce/overview" \
  -H "Authorization: Bearer $AUTH_TOKEN")
if [[ "$STATUS" == "200" ]]; then
  echo "PASS: Analytics overview accessible"
else
  echo "FAIL: Analytics returned HTTP $STATUS"
  exit 1
fi

echo "=== All Smoke Tests Passed ==="
```

### 4.2 Performance Baselines

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

### 4.3 Alerting Thresholds

| Alert | Warning | Critical | Action |
|-------|---------|----------|--------|
| Error rate (5xx) | > 1% | > 5% | Page on-call |
| Latency P95 | > 500ms | > 2s | Page on-call |
| Database connections | > 80% | > 95% | Scale pool |
| Redis memory | > 70% | > 90% | Scale Redis |
| Cart table growth | > 100K/day | > 500K/day | Review retention |

### 4.4 Rollback Triggers

**Automatic Rollback Criteria:**

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

## 5. Scaling Considerations

### 5.1 Expected Load Patterns

| Scenario | Carts/Hour | Sessions/Hour | Analytics Queries/Hour |
|----------|------------|---------------|------------------------|
| Normal | 1,000 | 5,000 | 100 |
| Peak (Black Friday) | 50,000 | 200,000 | 1,000 |
| Promotional Event | 10,000 | 50,000 | 500 |

### 5.2 Connection Pool Sizing

**Current Configuration:**

```
# prisma/.env
DATABASE_URL="postgresql://...?connection_limit=50&pool_timeout=30"
```

**Recommended for E-Commerce Modules:**

```
# Increase connection limit to handle concurrent cart/session operations
DATABASE_URL="postgresql://...?connection_limit=75&pool_timeout=30"
```

**Calculation:**
- Base: 50 connections
- Cart operations: +10 (transactions for bundles)
- Cross-site session: +10 (session merges)
- Analytics: +5 (complex queries)
- **Total:** 75 connections

### 5.3 Cache Warming Strategy

**On Deployment:**

```bash
# Pre-warm analytics caches for top 100 companies
docker exec -it avnz-payment-api node scripts/warm-analytics-cache.js

# Cache warming script should:
# 1. Query company IDs from database
# 2. Call analytics overview endpoint for each
# 3. Results cached in Redis for 5 minutes
```

**Cache Keys:**

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `analytics:overview:{companyId}:{dateHash}` | 5 min | Dashboard overview |
| `cart:totals:{cartId}` | 1 min | Cart total calculations |
| `session:data:{sessionToken}` | 30 min | Session data references |

### 5.4 Auto-Scaling Rules

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
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

---

## 6. Maintenance Tasks

### 6.1 Scheduled Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `cleanupExpiredSessions` | Daily 3:00 AM | Expire old cross-site sessions |
| `markAbandonedCarts` | Hourly | Mark carts abandoned after 30 days |
| `purgeOldComparisons` | Weekly | Remove comparisons older than 90 days |
| `vacuumAnalyze` | Weekly | Optimize table statistics |

**Cleanup Job Implementation:**

```typescript
// apps/api/src/cross-site-session/services/cross-site-session.service.ts
// Method: cleanupExpiredSessions()
// Already implemented - call via cron job
```

### 6.2 Data Retention

| Table | Retention | Archive Strategy |
|-------|-----------|------------------|
| `carts` (CONVERTED) | 2 years | Archive to S3 |
| `carts` (ABANDONED) | 90 days | Delete |
| `wishlists` | Indefinite | - |
| `product_comparisons` | 90 days | Delete |
| `cross_site_sessions` (EXPIRED/MERGED) | 30 days | Delete |

---

## 7. Security Considerations

### 7.1 Session Token Security

- **Token Generation:** `randomBytes(32).toString('hex')` - 64 characters
- **Token Comparison:** Uses `crypto.timingSafeEqual()` to prevent timing attacks
- **Token Storage:** Session tokens are unique indexes in PostgreSQL

### 7.2 Multi-Tenant Isolation

All services validate:
1. `companyId` matches user's scope
2. Products belong to the same company as cart/wishlist/comparison
3. Session tokens are validated for ownership before operations

### 7.3 SQL Injection Prevention

The E-Commerce Analytics service uses Prisma's `Prisma.sql` helper for parameterized queries:

```typescript
// Safe parameterized query example
const result = await this.prisma.$queryRaw(
  Prisma.sql`
    SELECT DATE(created_at) as date, AVG(CAST(grand_total AS DECIMAL)) as value
    FROM "Cart"
    WHERE company_id = ${companyId}
      AND created_at >= ${dateRange.startDate}
      AND created_at <= ${dateRange.endDate}
    GROUP BY DATE(created_at)
  `
);
```

---

## 8. Appendix

### 8.1 API Endpoints Summary

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

### 8.2 Contact Information

| Role | Contact |
|------|---------|
| DevOps Lead | devops@avnz.io |
| Backend Lead | backend@avnz.io |
| On-Call | PagerDuty: #ecommerce-oncall |
| Database Admin | dba@avnz.io |

### 8.3 Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-31 | DevOps Engineer | Initial runbook |

---

**Approval Signatures:**

- [ ] DevOps Lead
- [ ] Backend Lead
- [ ] DBA
- [ ] Security Team
- [ ] Product Owner

---

*This runbook follows SOC2, ISO 27001, and PCI-DSS deployment standards.*
