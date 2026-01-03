# Cart Management UI & Funnel Integration - Deployment Plan

**Date:** January 2, 2026
**Feature:** Cart Management UI & Funnel Integration (Phases 1-6)
**Status:** Ready for Deployment

---

## Executive Summary

This deployment plan covers the complete Cart Management system including:
- **Phase 1**: Admin Cart Navigation + API Client + List/Detail Pages
- **Phase 2**: Abandoned Cart Recovery Dashboard
- **Phase 3**: Company Portal Cart UI (drawer, mini-cart, cart items)
- **Phase 4**: Funnel-Cart Integration
- **Phase 5**: Conversion Components (UrgencyTimer, ScarcityBadge, FreeShippingBar, CartUpsell)
- **Phase 6**: E-commerce Analytics Dashboard

**Estimated Deployment Time:** 30 minutes
**Estimated Downtime:** < 2 minutes (database migration only)
**Risk Level:** Low (additive changes, no existing data modification)

---

## 1. Pre-Deployment Checklist

### Code Verification
- [x] All code reviews completed (5 reviews per phase)
- [x] TypeScript compilation passes with no errors
- [x] All tests pass (96 ecommerce-analytics tests + 334 conversion tests)
- [x] No critical or high-severity issues outstanding

### Database Migration Verification
```bash
# Check pending migrations
cd apps/api && npx prisma migrate status

# Migrations to apply:
# - 20260101140542_add_ecommerce_modules
# - 20260101140600_add_cart_and_session_partial_indexes
# - 20260101163110_add_cart_promotion_tax_shipping_system
```

### Environment Verification
- [ ] Staging environment tested successfully
- [ ] Database backup completed within last 24 hours
- [ ] Database snapshot available for point-in-time recovery
- [ ] Redis cache ready for invalidation

---

## 2. Database Changes

### New Tables (13)
| Table | Purpose |
|-------|---------|
| `carts` | Main cart with totals, status, timestamps |
| `cart_items` | Cart line items |
| `saved_cart_items` | Save for later functionality |
| `wishlists` | User wishlists |
| `wishlist_items` | Wishlist items |
| `product_comparisons` | Comparison lists |
| `product_comparison_items` | Comparison items |
| `cross_site_sessions` | Multi-site session tracking |
| `promotions` | Discount codes |
| `promotion_usages` | Usage tracking |
| `tax_rates` | Tax configuration |
| `shipping_zones` | Shipping regions |
| `shipping_rules` | Shipping rules |

### New Enums (7)
- `CartStatus`: ACTIVE, CONVERTED, ABANDONED, MERGED, EXPIRED
- `SiteType`: STOREFRONT, FUNNEL, TRIAL, MARKETPLACE, B2B_PORTAL
- `CrossSiteSessionStatus`: ACTIVE, EXPIRED, MERGED, REVOKED
- `PromotionType`: PERCENTAGE_OFF, FIXED_AMOUNT_OFF, BUY_X_GET_Y, FREE_SHIPPING, FREE_GIFT
- `PromotionScope`: CART, PRODUCT, CATEGORY, SHIPPING
- `TaxType`: SALES_TAX, VAT, GST, HST, PST, CONSUMPTION
- `ShippingRuleType`: FLAT_RATE, PER_ITEM, WEIGHT_BASED, PRICE_BASED, FREE, CALCULATED

### Key Indexes (Partial Indexes for Performance)
```sql
-- Active carts by company
CREATE INDEX idx_carts_recovery_candidates
ON carts ("companyId", "abandonedAt", "recoveryEmailSent")
WHERE status = 'ABANDONED' AND "recoveryEmailSent" = false;

-- Cart expiration
CREATE INDEX idx_carts_expiration
ON carts ("expiresAt")
WHERE status = 'ACTIVE' AND "expiresAt" IS NOT NULL;

-- Session cleanup
CREATE INDEX idx_cross_site_sessions_cleanup
ON cross_site_sessions ("expiresAt")
WHERE status = 'ACTIVE';
```

---

## 3. Deployment Sequence

### Phase 1: Infrastructure Preparation (T-60 minutes)
1. Create database snapshot/backup
2. Verify staging deployment success
3. Notify stakeholders of maintenance window
4. Pre-warm additional API containers

### Phase 2: Database Migration (T-0)
```bash
# 1. Enable maintenance mode
# 2. Stop background job processors
# 3. Execute database migrations
cd apps/api && npx prisma migrate deploy

# 4. Verify table creation
npx prisma db execute --stdin <<EOF
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('carts', 'cart_items', 'wishlists', 'promotions');
EOF

# 5. Generate Prisma client
npx prisma generate
```

### Phase 3: Backend Deployment (T+5 minutes)
1. Deploy API containers with new code
2. Run health checks
3. Verify new endpoints:
   - `GET /api/admin/carts` - Returns empty array
   - `GET /api/admin/carts/stats` - Returns zero stats
   - `GET /api/admin/ecommerce-analytics/overview` - Returns metrics

### Phase 4: Frontend Deployment (T+15 minutes)
1. Deploy admin-dashboard build
2. Clear CDN cache for static assets
3. Verify pages load:
   - `/carts` - Cart list page
   - `/carts/abandoned` - Abandoned cart recovery
   - `/insights/ecommerce` - E-commerce analytics

### Phase 5: Post-Deployment Verification (T+20 minutes)
1. Disable maintenance mode
2. Re-enable background job processors
3. Execute smoke tests
4. Monitor error rates for 30 minutes

---

## 4. Rollback Plan

### Rollback Triggers
Initiate rollback if:
- Migration fails with unrecoverable error
- API error rate exceeds 5% for > 5 minutes
- Critical functionality broken (auth, payments, orders)

### Rollback Procedure

**Step 1: Revert Code**
```bash
kubectl rollout undo deployment/payment-api -n production
kubectl rollout undo deployment/admin-dashboard -n production
```

**Step 2: Database Rollback (if needed)**
```sql
-- Only if absolutely necessary (new tables don't affect existing functionality)
DROP TABLE IF EXISTS cart_promotions CASCADE;
DROP TABLE IF EXISTS shipping_rules CASCADE;
DROP TABLE IF EXISTS shipping_zones CASCADE;
DROP TABLE IF EXISTS tax_rates CASCADE;
DROP TABLE IF EXISTS promotion_usages CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS cross_site_sessions CASCADE;
DROP TABLE IF EXISTS product_comparison_items CASCADE;
DROP TABLE IF EXISTS product_comparisons CASCADE;
DROP TABLE IF EXISTS wishlist_items CASCADE;
DROP TABLE IF EXISTS wishlists CASCADE;
DROP TABLE IF EXISTS saved_cart_items CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;

-- Remove migration records
DELETE FROM "_prisma_migrations"
WHERE migration_name LIKE '%ecommerce%'
   OR migration_name LIKE '%cart%'
   OR migration_name LIKE '%promotion%';
```

---

## 5. Monitoring

### Metrics to Watch (First 24 hours)

| Metric | Warning | Critical |
|--------|---------|----------|
| Database connections | > 80% pool | > 95% pool |
| Query latency (p95) | > 100ms | > 500ms |
| API error rate | > 1% | > 5% |
| API latency (p95) | > 500ms | > 2000ms |

### Key Logs to Monitor
```bash
# API logs - watch for cart module errors
docker logs avnz-payment-api 2>&1 | grep -E "(cart|Cart|ecommerce)"

# Check for Prisma errors
docker logs avnz-payment-api 2>&1 | grep -E "(PrismaClient|P2002|P2003)"
```

### Health Check Endpoints
```bash
# Cart API health
curl -X GET https://api.avnz.io/api/admin/carts/stats \
  -H "Authorization: Bearer $TOKEN"

# Analytics health
curl -X GET "https://api.avnz.io/api/admin/ecommerce-analytics/overview" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 6. Feature Flags (Recommended)

For staged rollout, consider these feature flags:

| Flag | Default | Description |
|------|---------|-------------|
| `FEATURE_CART_MANAGEMENT` | true | Enable cart CRUD operations |
| `FEATURE_ABANDONED_CART_RECOVERY` | true | Enable abandoned cart recovery |
| `FEATURE_ECOMMERCE_ANALYTICS` | true | Enable analytics dashboard |

---

## 7. Staged Rollout Plan

### Day 0-2: Internal Testing
- All features enabled in staging
- Production feature flags OFF

### Day 3-5: Shadow Mode
- API deployed but not used
- Verify health checks and logs

### Day 6-10: Canary Release
- 10% of beta companies enabled
- Monitor conversion rates

### Day 11-20: Gradual Rollout
- Day 11-13: 25% enabled
- Day 14-16: 50% enabled
- Day 17-18: 75% enabled
- Day 19-20: 100% enabled

---

## 8. Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| DevOps Lead | | | |
| Backend Lead | | | |
| Frontend Lead | | | |
| DBA | | | |
| QA Lead | | | |
| Product Owner | | | |

---

## Summary

This deployment introduces a comprehensive e-commerce cart system with 13+ new database tables, admin dashboard pages, and analytics capabilities. The deployment is **low-risk** due to:

1. **Additive Changes**: All new tables with no modification to existing schemas
2. **No Data Migration**: Empty tables created, no data transformation required
3. **Partial Indexes**: Optimized for background job query patterns
4. **Graceful Degradation**: Frontend handles empty states appropriately

**Recommended Deployment Window**: Off-peak hours (Tuesday 2-4 AM UTC)
