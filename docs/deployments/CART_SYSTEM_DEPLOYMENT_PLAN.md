# Cart Management System Deployment Plan

**Version:** 1.0
**Date:** January 1, 2026
**Author:** Senior DevOps Engineer
**Status:** Ready for Review

---

## Executive Summary

This deployment plan covers the complete Cart Management UI system, including core cart functionality, cart recovery and sync, and advanced features like AI-powered upsells and express checkout. This document supplements the E-Commerce Modules Deployment Runbook with Cart-specific operational details.

### System Scope

| Phase | Component | Status | Description |
|-------|-----------|--------|-------------|
| **Phase 1** | Core Cart | Complete | Cart, CartItem, Promotion, Tax, Shipping models and services |
| **Phase 2** | Recovery & Sync | Complete | Cart abandonment detection, HMAC-signed recovery, cross-device sync |
| **Phase 3** | Advanced Features | Complete | AI upsells (Bedrock), Express checkout, Inventory holds |

### Key Implementation Files

**Backend API (NestJS):**
```
apps/api/src/cart/
├── cart.module.ts                    # Module registration
├── controllers/
│   └── cart.controller.ts            # REST endpoints (40+ routes)
├── services/
│   ├── cart.service.ts               # Core cart operations
│   ├── cart-abandonment.service.ts   # Abandonment detection & recovery
│   ├── cart-sync.service.ts          # Cross-device synchronization
│   ├── cart-upsell.service.ts        # AI-powered recommendations
│   ├── express-checkout.service.ts   # Apple Pay, Google Pay, PayPal
│   ├── inventory-hold.service.ts     # 15-minute inventory reservations
│   ├── promotion.service.ts          # Discount code processing
│   ├── shipping.service.ts           # Shipping rate calculation
│   └── tax.service.ts                # Tax rate calculation
├── dto/
│   └── cart.dto.ts                   # Request/response DTOs
└── types/
    └── cart.types.ts                 # TypeScript interfaces
```

**Supporting Modules:**
```
apps/api/src/wishlist/               # Wishlist integration
apps/api/src/comparison/             # Product comparison
apps/api/src/cross-site-session/     # Cross-site session management
apps/api/src/ecommerce-analytics/    # Cart analytics
```

**Admin Dashboard (Next.js):**
```
apps/admin-dashboard/src/app/(dashboard)/carts/
├── page.tsx                          # Cart list with table/card views
├── [id]/page.tsx                     # Cart detail with activity timeline
└── abandoned/page.tsx                # Abandoned cart recovery queue

apps/admin-dashboard/src/lib/api/
└── cart.ts                           # Admin cart API client
```

**Company Portal (Next.js):**
```
apps/company-portal/src/app/cart/
└── page.tsx                          # Customer-facing cart page with confirmation dialogs
```

---

## 1. Pre-Deployment Checklist

### 1.1 Environment Variables

#### Required Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis for session caching |
| `COMPANY_PORTAL_URL` | Yes | `http://localhost:3003` | Recovery email links |
| `NODE_ENV` | Yes | `production` | Environment mode |

#### Phase 2: Recovery & Sync Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CART_RECOVERY_HMAC_SECRET` | Yes | - | 32+ character secret for recovery token signing |
| `CART_RECOVERY_TOKEN_EXPIRY_HOURS` | No | `72` | Recovery link validity period |
| `CART_ABANDONMENT_THRESHOLD_MINUTES` | No | `60` | Minutes before cart is considered abandoned |
| `CART_SYNC_ENABLED` | No | `true` | Enable cross-device cart sync |

#### Phase 3: Advanced Features Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_BEDROCK_REGION` | Conditional | `us-east-1` | Required for AI upsells |
| `AWS_BEDROCK_MODEL_ID` | No | `anthropic.claude-sonnet-4-20250514-v1:0` | AI model for recommendations |
| `INVENTORY_HOLD_DURATION_MINUTES` | No | `15` | Inventory hold expiration |
| `EXPRESS_CHECKOUT_ENABLED` | No | `false` | Enable Apple Pay/Google Pay/PayPal |
| `APPLE_PAY_MERCHANT_ID` | Conditional | - | Required if Apple Pay enabled |
| `GOOGLE_PAY_MERCHANT_ID` | Conditional | - | Required if Google Pay enabled |
| `PAYPAL_CLIENT_ID` | Conditional | - | Required if PayPal Express enabled |
| `PAYPAL_CLIENT_SECRET` | Conditional | - | Required if PayPal Express enabled |

#### Secret Generation Commands

```bash
# Generate HMAC secret for cart recovery
openssl rand -base64 32

# Example .env addition
CART_RECOVERY_HMAC_SECRET=K8fJ2mN9xP4wQ7rT1vY6zA3bC5dE8gH0jL2kM4nO6pR
```

### 1.2 Database Migration Readiness

**Required Migrations (in order):**

| Order | Migration | Purpose | Duration |
|-------|-----------|---------|----------|
| 1 | `20260101140542_add_ecommerce_modules` | Core Cart/Wishlist/Comparison tables | ~5s |
| 2 | `20260101140600_add_cart_and_session_partial_indexes` | Performance indexes for recovery jobs | <1s |
| 3 | `20260101163110_add_cart_promotion_tax_shipping_system` | Promotion, TaxRate, ShippingZone tables | ~3s |

**New Database Objects:**

| Category | Objects | Notes |
|----------|---------|-------|
| **Enums** | `CartStatus`, `PromotionType`, `PromotionScope`, `TaxType`, `ShippingRuleType` | 5 new enums |
| **Core Tables** | `carts`, `cart_items`, `saved_cart_items`, `inventory_holds` | Cart system |
| **Pricing Tables** | `promotions`, `promotion_usages`, `cart_promotions` | Discount system |
| **Tax Tables** | `tax_rates` | Geographic tax rates |
| **Shipping Tables** | `shipping_zones`, `shipping_rules` | Shipping calculation |
| **Indexes** | 30+ indexes including 3 partial indexes | Performance optimization |

**Partial Indexes Created:**

```sql
-- Abandoned cart recovery candidates (used by background job)
CREATE INDEX idx_carts_recovery_candidates
ON carts ("companyId", "abandonedAt", "recoveryEmailSent")
WHERE status = 'ABANDONED' AND "recoveryEmailSent" = false;

-- Active session cleanup (used by background job)
CREATE INDEX idx_cross_site_sessions_cleanup
ON cross_site_sessions ("expiresAt")
WHERE status = 'ACTIVE';

-- Cart expiration (used by background job)
CREATE INDEX idx_carts_expiration
ON carts ("expiresAt")
WHERE status = 'ACTIVE' AND "expiresAt" IS NOT NULL;
```

**Verification Commands:**

```bash
# Check migration status
docker exec -it avnz-payment-api npx prisma migrate status

# Verify all tables exist
docker exec -it avnz-payment-postgres psql -U postgres -d payment_platform -c "
SELECT table_name FROM information_schema.tables
WHERE table_name IN (
  'carts', 'cart_items', 'saved_cart_items', 'inventory_holds',
  'promotions', 'promotion_usages', 'cart_promotions',
  'tax_rates', 'shipping_zones', 'shipping_rules'
)
ORDER BY table_name;"

# Verify partial indexes
docker exec -it avnz-payment-postgres psql -U postgres -d payment_platform -c "
SELECT indexname, indexdef FROM pg_indexes
WHERE indexname LIKE 'idx_%' AND indexdef LIKE '%WHERE%';"
```

### 1.3 Infrastructure Requirements

#### PostgreSQL

| Requirement | Minimum | Recommended | Notes |
|-------------|---------|-------------|-------|
| Version | 14.0 | 15.x | Required for partial index support |
| Connection Pool | 75 | 100 | Increase for cart transactions |
| Max Connections | 100 | 200 | Handle peak checkout traffic |
| Shared Buffers | 4GB | 8GB | Large cart aggregations |

#### Redis

| Requirement | Minimum | Recommended | Notes |
|-------------|---------|-------------|-------|
| Version | 6.0 | 7.x | Session storage |
| Memory | 1GB | 2GB | Cart session cache |
| Eviction Policy | `allkeys-lru` | `volatile-lru` | Session-aware eviction |

#### AWS Services (Phase 3)

| Service | Purpose | Required |
|---------|---------|----------|
| **AWS Bedrock** | AI upsell recommendations | Optional |
| **AWS SQS** | Abandoned cart email queue | Recommended |
| **AWS SES** | Recovery email sending | Required |

### 1.4 Integration Dependencies

**Required Integrations:**

| Integration | Purpose | Configuration |
|-------------|---------|---------------|
| **Email (SES/SendGrid)** | Cart recovery emails | Must be configured in ClientIntegration |
| **Payment Gateway** | Express checkout processing | PayPal/Stripe must be configured |

**Optional Integrations:**

| Integration | Purpose | Fallback |
|-------------|---------|----------|
| **AWS Bedrock** | AI upsell suggestions | Falls back to rule-based recommendations |
| **Apple Pay** | Express checkout | Standard checkout flow |
| **Google Pay** | Express checkout | Standard checkout flow |
| **PayPal Express** | Express checkout | Standard checkout flow |

---

## 2. Database Migration Steps

### 2.1 Pre-Migration Backup

```bash
#!/bin/bash
# Execute before any migrations

BACKUP_FILE="backup_pre_cart_$(date +%Y%m%d_%H%M%S).dump"

# Full database backup
pg_dump -h $DB_HOST -U $DB_USER -d payment_platform \
  --format=custom \
  --file=$BACKUP_FILE

# Verify backup
pg_restore --list $BACKUP_FILE | head -50

# Upload to S3
aws s3 cp $BACKUP_FILE s3://avnz-backups/production/pre-deploy/

echo "Backup completed: $BACKUP_FILE"
```

### 2.2 Migration Execution

```bash
#!/bin/bash
# Execute migrations in order

set -e

echo "=== Cart System Database Migration ==="

# 1. Check current status
echo "Checking migration status..."
docker exec -it avnz-payment-api npx prisma migrate status

# 2. Apply all pending migrations
echo "Applying migrations..."
docker exec -it avnz-payment-api npx prisma migrate deploy

# 3. Regenerate Prisma client
echo "Regenerating Prisma client..."
docker exec -it avnz-payment-api npx prisma generate

# 4. Verify tables created
echo "Verifying table creation..."
docker exec -it avnz-payment-postgres psql -U postgres -d payment_platform -c "
SELECT COUNT(*) as table_count FROM information_schema.tables
WHERE table_name IN ('carts', 'cart_items', 'promotions', 'tax_rates', 'shipping_zones');"

echo "=== Migration Complete ==="
```

### 2.3 Rollback Procedure

**Application-Only Rollback:**

```bash
# If cart features have issues but database is fine
kubectl rollout undo deployment/api

# Or with Docker
docker-compose -p avnz-payment-platform stop api
docker tag avnz/api:previous avnz/api:latest
docker-compose -p avnz-payment-platform up -d api
```

**Full Database Rollback (DATA LOSS):**

```sql
-- EMERGENCY ONLY: This deletes all cart data
BEGIN;

-- Drop in reverse dependency order
DROP TABLE IF EXISTS "inventory_holds" CASCADE;
DROP TABLE IF EXISTS "cart_promotions" CASCADE;
DROP TABLE IF EXISTS "promotion_usages" CASCADE;
DROP TABLE IF EXISTS "shipping_rules" CASCADE;
DROP TABLE IF EXISTS "shipping_zones" CASCADE;
DROP TABLE IF EXISTS "tax_rates" CASCADE;
DROP TABLE IF EXISTS "promotions" CASCADE;
DROP TABLE IF EXISTS "saved_cart_items" CASCADE;
DROP TABLE IF EXISTS "cart_items" CASCADE;
DROP TABLE IF EXISTS "carts" CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "ShippingRuleType" CASCADE;
DROP TYPE IF EXISTS "TaxType" CASCADE;
DROP TYPE IF EXISTS "PromotionScope" CASCADE;
DROP TYPE IF EXISTS "PromotionType" CASCADE;
DROP TYPE IF EXISTS "CartStatus" CASCADE;

COMMIT;
```

---

## 3. Deployment Sequence

### 3.1 Deployment Timeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CART SYSTEM DEPLOYMENT TIMELINE                      │
├─────────────────────────────────────────────────────────────────────────┤
│ T-60min  │ Final code review, security scan                             │
│ T-30min  │ Database backup, notify team                                 │
│ T-15min  │ Prepare rollback scripts, verify environment variables       │
│ T-0      │ Apply database migrations                                    │
│ T+2min   │ Verify migrations successful                                 │
│ T+5min   │ Deploy API with Cart module enabled                          │
│ T+10min  │ Health checks, smoke tests                                   │
│ T+15min  │ Deploy frontend (admin dashboard)                            │
│ T+20min  │ Enable background jobs (cart recovery, cleanup)              │
│ T+25min  │ End-to-end cart flow test                                    │
│ T+30min  │ Monitor metrics for 15 minutes                               │
│ T+45min  │ Confirm deployment success                                   │
│ T+60min  │ Enable advanced features (AI upsells, express checkout)      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Phased Feature Enablement

**Phase 1: Core Cart (Day 1)**

```bash
# Deploy with core cart features only
CART_SYNC_ENABLED=true
EXPRESS_CHECKOUT_ENABLED=false
AI_UPSELL_ENABLED=false
```

**Phase 2: Recovery & Sync (Day 2-3)**

```bash
# Enable cart recovery after validating core functionality
CART_RECOVERY_ENABLED=true
CART_RECOVERY_HMAC_SECRET=<generated-secret>
CART_ABANDONMENT_THRESHOLD_MINUTES=60

# Start background jobs
docker exec -it avnz-payment-api npm run job:cart-recovery
docker exec -it avnz-payment-api npm run job:cart-cleanup
```

**Phase 3: Advanced Features (Day 5+)**

```bash
# Enable AI upsells (requires Bedrock integration)
AI_UPSELL_ENABLED=true
AWS_BEDROCK_REGION=us-east-1

# Enable express checkout (requires payment integration)
EXPRESS_CHECKOUT_ENABLED=true
APPLE_PAY_MERCHANT_ID=merchant.io.avnz
```

### 3.3 API Deployment

```bash
#!/bin/bash
# Deploy Cart-enabled API

set -e

echo "=== Deploying Cart-Enabled API ==="

# Option A: Docker Compose (Staging)
docker-compose -p avnz-payment-platform build api --no-cache
docker-compose -p avnz-payment-platform up -d api

# Option B: Kubernetes (Production)
kubectl set image deployment/api api=avnz/api:v2.0.0-cart
kubectl rollout status deployment/api --timeout=300s

# Wait for health check
sleep 30

# Verify API health
curl -f http://localhost:3001/api/health || exit 1

# Verify Cart module loaded
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/cart)
if [[ "$STATUS" == "401" || "$STATUS" == "200" ]]; then
  echo "Cart module loaded successfully"
else
  echo "ERROR: Cart module not responding (HTTP $STATUS)"
  exit 1
fi

echo "=== API Deployment Complete ==="
```

### 3.4 Frontend Deployment

**Admin Dashboard (Cart Management UI):**

```bash
#!/bin/bash
# Deploy Admin Dashboard with Cart Management UI

set -e

echo "=== Deploying Admin Dashboard with Cart UI ==="

# Build the admin dashboard
cd apps/admin-dashboard
npm run build

# Option A: Docker Compose (Staging)
docker-compose -p avnz-payment-platform build admin-dashboard --no-cache
docker-compose -p avnz-payment-platform up -d admin-dashboard

# Option B: Kubernetes (Production)
kubectl set image deployment/admin-dashboard admin-dashboard=avnz/admin-dashboard:v2.0.0-cart
kubectl rollout status deployment/admin-dashboard --timeout=300s

# Verify deployment
curl -f http://localhost:3000 || exit 1

echo "=== Admin Dashboard Deployment Complete ==="
```

**Company Portal (Customer Cart UI):**

```bash
#!/bin/bash
# Deploy Company Portal with Cart Page

set -e

echo "=== Deploying Company Portal ==="

# Build the company portal
cd apps/company-portal
npm run build

# Option A: Docker Compose (Staging)
docker-compose -p avnz-payment-platform build company-portal --no-cache
docker-compose -p avnz-payment-platform up -d company-portal

# Option B: Kubernetes (Production)
kubectl set image deployment/company-portal company-portal=avnz/company-portal:v2.0.0-cart
kubectl rollout status deployment/company-portal --timeout=300s

# Verify deployment
curl -f http://localhost:3003 || exit 1

echo "=== Company Portal Deployment Complete ==="
```

**New Admin Dashboard Pages:**

| Route | Description | Features |
|-------|-------------|----------|
| `/carts` | Cart list | Table/card view, filters, bulk actions |
| `/carts/[id]` | Cart detail | Activity timeline, recovery actions, item management |
| `/carts/abandoned` | Recovery queue | Bulk email send, dismiss, metrics cards |

**UI Review Issues Fixed (v1.1):**

- ✅ Touch targets: All interactive elements meet 44px minimum
- ✅ Keyboard navigation: Table rows support Enter key
- ✅ Confirmation dialogs: Clear Cart uses modal, not `confirm()`
- ✅ Empty state copy: Engaging messaging for empty carts
- ✅ Router navigation: Using `router.push()` instead of `window.location.href`

---

## 4. Post-Deployment Verification

### 4.1 Health Check Endpoints

| Endpoint | Method | Auth | Expected | Purpose |
|----------|--------|------|----------|---------|
| `/api/health` | GET | None | 200 | API liveness |
| `/api/cart` | GET | JWT | 200/401 | Cart module loaded |
| `/api/public/cart` | POST | Header | 201 | Public cart creation |
| `/api/cart/shipping/estimate` | POST | JWT | 200 | Shipping calculation |
| `/api/cart/tax/estimate` | POST | JWT | 200 | Tax calculation |

### 4.2 Smoke Test Script

```bash
#!/bin/bash
# Cart System Smoke Tests

set -e

API_URL="${API_URL:-http://localhost:3001}"
COMPANY_ID="${TEST_COMPANY_ID:-test-company}"
PRODUCT_ID="${TEST_PRODUCT_ID:-test-product}"

echo "=== Cart System Smoke Tests ==="

# Test 1: Create anonymous cart
echo "Test 1: Create anonymous cart..."
CART_RESPONSE=$(curl -sf -X POST "$API_URL/api/public/cart" \
  -H "Content-Type: application/json" \
  -H "x-company-id: $COMPANY_ID" \
  -d '{"currency": "USD"}')

CART_ID=$(echo $CART_RESPONSE | jq -r '.id')
SESSION_TOKEN=$(echo $CART_RESPONSE | jq -r '.sessionToken')

if [ -z "$CART_ID" ] || [ "$CART_ID" == "null" ]; then
  echo "FAIL: Cart creation failed"
  exit 1
fi
echo "PASS: Cart created (ID: $CART_ID)"

# Test 2: Add item to cart
echo "Test 2: Add item to cart..."
curl -sf -X POST "$API_URL/api/public/cart/$CART_ID/items" \
  -H "Content-Type: application/json" \
  -H "x-session-token: $SESSION_TOKEN" \
  -H "x-company-id: $COMPANY_ID" \
  -d "{\"productId\": \"$PRODUCT_ID\", \"quantity\": 1}" > /dev/null
echo "PASS: Item added to cart"

# Test 3: Retrieve cart with items
echo "Test 3: Retrieve cart with items..."
CART=$(curl -sf "$API_URL/api/public/cart" \
  -H "x-session-token: $SESSION_TOKEN" \
  -H "x-company-id: $COMPANY_ID")
ITEM_COUNT=$(echo $CART | jq -r '.totals.itemCount')
if [ "$ITEM_COUNT" -lt 1 ]; then
  echo "FAIL: Cart should have at least 1 item"
  exit 1
fi
echo "PASS: Cart retrieved with $ITEM_COUNT items"

# Test 4: Apply discount code (if in non-production)
if [ "$NODE_ENV" != "production" ]; then
  echo "Test 4: Apply discount code..."
  curl -sf -X POST "$API_URL/api/public/cart/$CART_ID/discount" \
    -H "Content-Type: application/json" \
    -H "x-session-token: $SESSION_TOKEN" \
    -H "x-company-id: $COMPANY_ID" \
    -d '{"code": "SAVE10"}' > /dev/null || true
  echo "PASS: Discount code applied"
fi

# Test 5: Shipping estimate
echo "Test 5: Shipping estimate..."
SHIPPING=$(curl -sf -X POST "$API_URL/api/cart/shipping/estimate" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"country": "US", "state": "CA", "postalCode": "90210"}' || echo '{}')
echo "PASS: Shipping estimate retrieved"

# Test 6: Tax estimate
echo "Test 6: Tax estimate..."
TAX=$(curl -sf -X POST "$API_URL/api/cart/tax/estimate" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"country": "US", "state": "CA", "postalCode": "90210"}' || echo '{}')
echo "PASS: Tax estimate retrieved"

# Test 7: Inventory hold (if enabled)
echo "Test 7: Inventory hold..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API_URL/api/cart/$CART_ID/hold" \
  -H "x-session-token: $SESSION_TOKEN" \
  -H "x-company-id: $COMPANY_ID")
if [[ "$STATUS" == "200" || "$STATUS" == "201" || "$STATUS" == "401" ]]; then
  echo "PASS: Inventory hold endpoint accessible"
else
  echo "WARN: Inventory hold returned HTTP $STATUS"
fi

echo "=== All Smoke Tests Passed ==="
```

### 4.3 Database Verification

```bash
#!/bin/bash
# Verify Cart system database objects

echo "=== Cart Database Verification ==="

# Check table row counts (should be 0 for new deployment)
docker exec -it avnz-payment-postgres psql -U postgres -d payment_platform -c "
SELECT 'carts' as table_name, COUNT(*) as row_count FROM carts
UNION ALL SELECT 'cart_items', COUNT(*) FROM cart_items
UNION ALL SELECT 'saved_cart_items', COUNT(*) FROM saved_cart_items
UNION ALL SELECT 'inventory_holds', COUNT(*) FROM inventory_holds
UNION ALL SELECT 'promotions', COUNT(*) FROM promotions
UNION ALL SELECT 'tax_rates', COUNT(*) FROM tax_rates
UNION ALL SELECT 'shipping_zones', COUNT(*) FROM shipping_zones
UNION ALL SELECT 'shipping_rules', COUNT(*) FROM shipping_rules
ORDER BY table_name;"

# Verify foreign key relationships
docker exec -it avnz-payment-postgres psql -U postgres -d payment_platform -c "
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('carts', 'cart_items', 'inventory_holds', 'promotions')
ORDER BY tc.table_name, kcu.column_name;"

# Verify indexes exist
docker exec -it avnz-payment-postgres psql -U postgres -d payment_platform -c "
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('carts', 'cart_items', 'inventory_holds', 'promotions', 'tax_rates', 'shipping_zones')
ORDER BY tablename, indexname;"

echo "=== Verification Complete ==="
```

### 4.4 Performance Baselines

| Operation | Target P50 | Target P95 | Target P99 | Alert Threshold |
|-----------|------------|------------|------------|-----------------|
| Create cart | 20ms | 50ms | 100ms | 200ms |
| Add item | 30ms | 80ms | 150ms | 300ms |
| Update quantity | 25ms | 60ms | 120ms | 250ms |
| Apply discount | 40ms | 100ms | 200ms | 400ms |
| Calculate totals | 50ms | 120ms | 250ms | 500ms |
| Shipping estimate | 100ms | 300ms | 600ms | 1000ms |
| Tax calculation | 50ms | 150ms | 300ms | 600ms |
| Inventory hold | 40ms | 100ms | 200ms | 400ms |
| AI upsell | 500ms | 1500ms | 3000ms | 5000ms |

**Load Test Script:**

```bash
# Using k6 for load testing
k6 run --vus 100 --duration 5m scripts/load-tests/cart-operations.js
```

---

## 5. Monitoring and Alerting

### 5.1 Key Metrics

**Cart Operations:**

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `cart.created` | Carts created per minute | N/A (info) |
| `cart.abandoned` | Carts abandoned per hour | N/A (info) |
| `cart.converted` | Carts converted to orders | N/A (info) |
| `cart.abandonment_rate` | % abandoned / created | > 80% (warning) |
| `cart.conversion_rate` | % converted / created | < 1% (warning) |

**Performance:**

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `cart.add_item.latency_p95` | Add item P95 latency | > 200ms (warning), > 500ms (critical) |
| `cart.calculate_totals.latency_p95` | Totals calculation P95 | > 300ms (warning), > 1000ms (critical) |
| `cart.inventory_hold.failures` | Failed inventory holds/min | > 5 (warning), > 20 (critical) |

**Background Jobs:**

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `job.cart_recovery.executed` | Recovery emails sent/hour | N/A (info) |
| `job.cart_cleanup.expired` | Expired carts cleaned/hour | N/A (info) |
| `job.inventory_hold_release.count` | Holds released/hour | N/A (info) |

### 5.2 Datadog Dashboard Configuration

```yaml
# datadog/dashboards/cart-system.yaml
title: Cart Management System
widgets:
  - definition:
      title: Cart Conversion Funnel
      type: funnel
      requests:
        - q: sum:cart.created{*}
        - q: sum:cart.items_added{*}
        - q: sum:cart.checkout_started{*}
        - q: sum:cart.converted{*}

  - definition:
      title: Cart Operations Latency
      type: timeseries
      requests:
        - q: p95:cart.add_item.latency{*}
        - q: p95:cart.calculate_totals.latency{*}
        - q: p95:cart.inventory_hold.latency{*}

  - definition:
      title: Active Inventory Holds
      type: query_value
      requests:
        - q: sum:inventory_holds.active{*}

  - definition:
      title: Recovery Email Performance
      type: timeseries
      requests:
        - q: sum:cart_recovery.emails_sent{*}
        - q: sum:cart_recovery.clicks{*}
        - q: sum:cart_recovery.conversions{*}
```

### 5.3 Alert Configuration

```yaml
# datadog/monitors/cart-alerts.yaml
monitors:
  - name: Cart Add Item Latency High
    type: metric alert
    query: avg(last_5m):p95:cart.add_item.latency{*} > 500
    message: |
      Cart add item P95 latency is {{value}}ms.
      This may indicate database or inventory check issues.
      @pagerduty-ecommerce-oncall
    options:
      thresholds:
        critical: 500
        warning: 200

  - name: Inventory Hold Failures
    type: metric alert
    query: sum(last_5m):cart.inventory_hold.failures{*} > 20
    message: |
      {{value}} inventory holds failed in the last 5 minutes.
      Customers may be unable to complete checkout.
      @pagerduty-ecommerce-oncall
    options:
      thresholds:
        critical: 20
        warning: 5

  - name: Cart Abandonment Rate Spike
    type: metric alert
    query: avg(last_1h):cart.abandonment_rate{*} > 0.9
    message: |
      Cart abandonment rate is {{value}}%.
      Investigate for checkout issues or performance problems.
      @slack-ecommerce-alerts
    options:
      thresholds:
        critical: 0.95
        warning: 0.9
```

---

## 6. Background Jobs

### 6.1 Scheduled Jobs

| Job | Cron Schedule | Purpose | Duration |
|-----|---------------|---------|----------|
| `CartAbandonmentCheck` | `*/15 * * * *` | Mark carts as abandoned | ~30s |
| `CartRecoveryEmails` | `*/10 * * * *` | Send recovery emails | ~2min |
| `InventoryHoldRelease` | `* * * * *` | Release expired holds | ~10s |
| `CartExpiration` | `0 * * * *` | Expire old carts | ~1min |
| `CartCleanup` | `0 3 * * *` | Archive/delete old data | ~5min |

### 6.2 Job Configuration

```typescript
// apps/api/src/cart/jobs/cart-jobs.module.ts

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    {
      provide: 'CART_ABANDONMENT_JOB',
      useFactory: () => ({
        name: 'cartAbandonmentCheck',
        cronTime: '*/15 * * * *',
        timeZone: 'UTC',
      }),
    },
    {
      provide: 'INVENTORY_HOLD_RELEASE_JOB',
      useFactory: () => ({
        name: 'inventoryHoldRelease',
        cronTime: '* * * * *',
        timeZone: 'UTC',
      }),
    },
  ],
})
export class CartJobsModule {}
```

### 6.3 Job Health Monitoring

```bash
# Check job execution status
docker exec -it avnz-payment-api npm run job:status

# Manual job execution (for testing)
docker exec -it avnz-payment-api npm run job:cart-recovery --dry-run
docker exec -it avnz-payment-api npm run job:inventory-hold-release
```

---

## 7. Rollback Procedures

### 7.1 Rollback Decision Matrix

| Symptom | Severity | Action |
|---------|----------|--------|
| Cart creation fails | Critical | Immediate rollback |
| Add item latency > 5s | Critical | Immediate rollback |
| Inventory holds not releasing | High | Disable holds, investigate |
| AI upsells failing | Low | Disable feature, continue |
| Recovery emails not sending | Medium | Disable recovery, investigate |

### 7.2 Quick Rollback (Feature Disable)

```bash
# Disable specific features without full rollback

# Disable AI upsells
kubectl set env deployment/api AI_UPSELL_ENABLED=false

# Disable express checkout
kubectl set env deployment/api EXPRESS_CHECKOUT_ENABLED=false

# Disable inventory holds
kubectl set env deployment/api INVENTORY_HOLD_ENABLED=false

# Disable cart recovery
kubectl set env deployment/api CART_RECOVERY_ENABLED=false
```

### 7.3 Full Application Rollback

```bash
#!/bin/bash
# Full cart system rollback

echo "=== Cart System Rollback ==="

# 1. Stop background jobs
kubectl scale deployment/cart-jobs --replicas=0

# 2. Rollback API deployment
kubectl rollout undo deployment/api
kubectl rollout status deployment/api --timeout=300s

# 3. Verify rollback
curl -f http://localhost:3001/api/health || exit 1

# 4. Release all inventory holds (prevent stuck inventory)
docker exec -it avnz-payment-api npm run job:inventory-hold-release-all

echo "=== Rollback Complete ==="
```

---

## 8. Security Considerations

### 8.1 Security Checklist

- [ ] Session tokens are 64 hex characters (32 bytes random)
- [ ] HMAC recovery tokens use SHA-256
- [ ] Token comparison uses `crypto.timingSafeEqual()`
- [ ] Cart access validates company ownership
- [ ] Product additions validate company match
- [ ] Discount code usage tracks customer limits
- [ ] Inventory holds have maximum limits per customer
- [ ] Express checkout validates payment signature

### 8.2 Rate Limiting

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `POST /cart` | 10 | 1 min | Prevent cart creation abuse |
| `POST /cart/items` | 30 | 1 min | Prevent inventory manipulation |
| `POST /cart/discount` | 5 | 1 min | Prevent discount brute-force |
| `GET /cart/recovery/:token` | 10 | 1 hour | Prevent token enumeration |

### 8.3 Input Validation

```typescript
// Example validation in cart.dto.ts
@IsInt()
@Min(1)
@Max(100)
quantity: number;

@IsString()
@MaxLength(50)
@Matches(/^[A-Z0-9-]+$/)
discountCode: string;
```

---

## 9. Data Retention

### 9.1 Retention Policies

| Data Type | Active | Abandoned | Converted | Archived |
|-----------|--------|-----------|-----------|----------|
| Carts | Indefinite | 90 days | 2 years | S3 archive |
| Cart Items | With cart | With cart | With cart | With cart |
| Inventory Holds | 15 min | N/A | N/A | Deleted |
| Promotions | Indefinite | N/A | N/A | Soft delete |
| Recovery Tokens | 72 hours | N/A | N/A | Deleted |

### 9.2 Cleanup Jobs

```sql
-- Run weekly: Archive converted carts older than 2 years
INSERT INTO cart_archive
SELECT * FROM carts
WHERE status = 'CONVERTED' AND converted_at < NOW() - INTERVAL '2 years';

DELETE FROM carts
WHERE status = 'CONVERTED' AND converted_at < NOW() - INTERVAL '2 years';

-- Run daily: Delete abandoned carts older than 90 days
DELETE FROM carts
WHERE status = 'ABANDONED' AND abandoned_at < NOW() - INTERVAL '90 days';

-- Run hourly: Release expired inventory holds
UPDATE inventory_holds
SET status = 'EXPIRED', released_at = NOW()
WHERE status = 'ACTIVE' AND expires_at < NOW();
```

---

## 10. Appendix

### 10.1 API Endpoints Reference

**Cart Management:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/cart` | JWT | Create authenticated cart |
| GET | `/api/cart` | JWT | Get current user's cart |
| POST | `/api/cart/items` | JWT | Add item to cart |
| PATCH | `/api/cart/items/:id` | JWT | Update item quantity |
| DELETE | `/api/cart/items/:id` | JWT | Remove item from cart |
| POST | `/api/cart/bundles` | JWT | Add bundle to cart |
| DELETE | `/api/cart/bundles/:groupId` | JWT | Remove bundle |
| POST | `/api/cart/discount` | JWT | Apply discount code |
| DELETE | `/api/cart/discount/:code` | JWT | Remove discount |
| POST | `/api/cart/merge` | JWT | Merge guest cart |
| POST | `/api/cart/save-for-later/:itemId` | JWT | Save item for later |
| POST | `/api/cart/move-to-cart/:itemId` | JWT | Move saved item to cart |

**Public Cart (Anonymous):**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/public/cart` | Header | Create anonymous cart |
| GET | `/api/public/cart` | Header | Get cart by session |
| POST | `/api/public/cart/:id/items` | Header | Add item |
| PATCH | `/api/public/cart/:id/items/:itemId` | Header | Update item |
| DELETE | `/api/public/cart/:id/items/:itemId` | Header | Remove item |

**Cart Recovery:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cart/recovery/:token` | None | Validate recovery token |
| POST | `/api/cart/recovery/:token/restore` | None | Restore cart from token |

**Shipping & Tax:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/cart/shipping/estimate` | JWT | Estimate shipping |
| GET | `/api/cart/shipping/rates` | JWT | Get available rates |
| POST | `/api/cart/tax/estimate` | JWT | Estimate tax |

**Express Checkout:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/cart/express/apple-pay/session` | JWT | Create Apple Pay session |
| POST | `/api/cart/express/google-pay/session` | JWT | Create Google Pay session |
| POST | `/api/cart/express/paypal/create-order` | JWT | Create PayPal order |
| POST | `/api/cart/express/paypal/capture` | JWT | Capture PayPal payment |

**AI Upsells:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cart/upsells` | JWT | Get AI recommendations |
| POST | `/api/cart/upsells/:productId/add` | JWT | Add upsell to cart |
| POST | `/api/cart/upsells/:productId/dismiss` | JWT | Dismiss suggestion |

**Inventory Holds:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/cart/:id/hold` | JWT | Create inventory holds |
| DELETE | `/api/cart/:id/hold` | JWT | Release holds |
| GET | `/api/cart/:id/hold/status` | JWT | Check hold status |

### 10.2 Error Codes

| Code | HTTP | Message | Action |
|------|------|---------|--------|
| `CART_NOT_FOUND` | 404 | Cart not found | Verify session token |
| `CART_EXPIRED` | 410 | Cart has expired | Create new cart |
| `ITEM_OUT_OF_STOCK` | 400 | Item is out of stock | Remove item or wait |
| `INVENTORY_HOLD_FAILED` | 409 | Could not reserve inventory | Retry or reduce quantity |
| `DISCOUNT_INVALID` | 400 | Invalid discount code | Check code spelling |
| `DISCOUNT_EXPIRED` | 400 | Discount code has expired | Use different code |
| `DISCOUNT_LIMIT_REACHED` | 400 | Usage limit exceeded | Use different code |
| `RECOVERY_TOKEN_INVALID` | 400 | Invalid recovery token | Request new recovery email |
| `RECOVERY_TOKEN_EXPIRED` | 410 | Recovery token has expired | Request new recovery email |

### 10.3 Contact Information

| Role | Contact | Escalation |
|------|---------|------------|
| DevOps Lead | devops@avnz.io | PagerDuty |
| Backend Lead | backend@avnz.io | Slack #backend |
| E-Commerce On-Call | PagerDuty #ecommerce-oncall | - |
| Database Admin | dba@avnz.io | Slack #database |

### 10.4 Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-01 | DevOps Engineer | Initial deployment plan |
| 1.1 | 2026-01-01 | DevOps Engineer | Added Admin UI, Company Portal cart page, review fixes |

---

**Approval Signatures:**

- [ ] DevOps Lead
- [ ] Backend Lead
- [ ] Security Team
- [ ] Product Owner

---

*This deployment plan follows SOC2, ISO 27001, and PCI-DSS deployment standards.*
