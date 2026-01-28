# Cart Theming Feature - Deployment Plan

**Feature:** Cart Theme Customization for Landing Pages
**Date:** January 27, 2026
**Status:** Ready for Deployment
**Risk Level:** Low

---

## Executive Summary

This deployment introduces cart theming capabilities for landing pages, allowing merchants to customize the appearance of their shopping cart experience. The feature includes 9 theme presets, custom color configuration, layout settings, and real-time preview.

---

## Changes Overview

### Backend Changes (20 files, +2,133 / -152 lines)

| File | Change Type | Description |
|------|-------------|-------------|
| `cart.module.ts` | Modified | Added ThrottlerModule, CacheModule imports |
| `cart.controller.ts` | Modified | Added @Throttle decorators, health check endpoint |
| `cart-admin.controller.ts` | Modified | Added rate limiting decorators |
| `cart.service.ts` | Modified | Improved error messages (AVNZ brand voice), soft-delete checks |
| `cart-theme.service.ts` | Modified | Soft-delete validation on public endpoint |
| `cart-theme.dto.ts` | Modified | Added hex color regex validation |
| `cart-upsell.service.ts` | Modified | Enhanced upsell logic |
| `express-checkout.service.ts` | Modified | Improved checkout flow |
| `inventory-hold.service.ts` | Modified | Enhanced inventory management |
| `promotion.service.ts` | Modified | Improved promotion handling |
| `shipping.service.ts` | Modified | Enhanced shipping calculations |
| `tax.service.ts` | Modified | Improved tax calculations |
| `*.spec.ts` (6 files) | Modified | Added unit tests for new functionality |

### Frontend Changes (3 files)

| File | Change Type | Description |
|------|-------------|-------------|
| `landing-pages/[id]/edit/page.tsx` | Modified | Added toast error handling for theme loading |
| `lib/api/landing-pages.ts` | Modified | API client updates |
| `lib/navigation.ts` | Modified | Navigation updates |

### Infrastructure

| Component | Change | Notes |
|-----------|--------|-------|
| Redis | **Required** | Used for theme caching (5-minute TTL) |
| Rate Limiting | Added | 60 req/min public, 120 req/min authenticated |

---

## Pre-Deployment Checklist

### Database Migrations

- [x] All migrations applied: `prisma migrate status` shows "up to date"
- [x] No pending schema changes: `prisma migrate diff` shows "No difference detected"
- [x] Migrations verified:
  - `20260128005720_add_cart_theme_to_landing_page`
  - `20260128013524_add_cart_indexes_and_inventory_hold_improvements`

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `REDIS_URL` | Yes | Redis connection for caching | `redis://localhost:6379` |
| `THROTTLER_TTL` | No | Rate limit window (ms) | `60000` (default) |
| `THROTTLER_LIMIT` | No | Rate limit count | `60` (default) |

### Dependencies

No new npm packages added. Uses existing:
- `@nestjs/throttler` (already in project)
- `ioredis` (already in project)
- `@nestjs/cache-manager` (already in project)

---

## Deployment Steps

### 1. Pre-Deployment (5 minutes)

```bash
# Verify Redis is running
redis-cli ping  # Should return: PONG

# Check current migration status
cd apps/api && npx prisma migrate status

# Verify TypeScript compiles
npx tsc --noEmit --skipLibCheck
```

### 2. Deploy Backend (10 minutes)

```bash
# Pull latest code
git pull origin main

# Install dependencies (if any new)
npm install

# Run migrations (should be no-op if already applied)
cd apps/api && npx prisma migrate deploy

# Build API
npm run build

# Restart API service
pm2 restart api  # or your deployment method
```

### 3. Deploy Frontend (5 minutes)

```bash
# Build admin dashboard
cd apps/admin-dashboard && npm run build

# Deploy to CDN/hosting
# (varies by deployment method)
```

### 4. Post-Deployment Verification (10 minutes)

```bash
# Check health endpoint
curl https://api.yourdomain.com/api/cart/health

# Expected response:
# {"status":"healthy","redis":"connected","database":"connected","timestamp":"..."}

# Test rate limiting (should allow 60 requests/min)
for i in {1..5}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://api.yourdomain.com/api/landing-pages/{id}/cart-theme
done
```

---

## Rollback Plan

### Scenario 1: API Deployment Failure

```bash
# Revert to previous version
git checkout HEAD~1

# Rebuild and restart
npm run build
pm2 restart api
```

### Scenario 2: Database Migration Issues

```bash
# This deployment has no new migrations requiring rollback
# If needed, contact DBA for manual intervention
```

### Scenario 3: Redis Connection Issues

```bash
# Cart will still function without caching
# Check Redis connectivity:
redis-cli ping

# Verify REDIS_URL environment variable
echo $REDIS_URL

# Restart Redis if needed
sudo systemctl restart redis
```

---

## Monitoring & Alerts

### Key Metrics to Watch

| Metric | Threshold | Action |
|--------|-----------|--------|
| API Error Rate (5xx) | > 1% | Investigate logs |
| Cart Theme Endpoint Latency | > 500ms | Check Redis cache |
| Rate Limit 429s | Spike | May indicate abuse |
| Redis Connection Errors | Any | Check Redis health |

### Log Queries

```bash
# Check for cart theme errors
docker logs avnz-payment-api 2>&1 | grep -i "cart-theme\|CartTheme"

# Check rate limiting
docker logs avnz-payment-api 2>&1 | grep -i "ThrottlerException\|rate limit"
```

---

## Feature Verification

### Functional Tests

1. **Theme Preset Selection**
   - Navigate to Landing Page Edit > Cart Settings
   - Select each of the 9 presets (STARTER, ARTISAN, VELOCITY, LUXE, WELLNESS, FOODIE, PROFESSIONAL, CREATOR, MARKETPLACE)
   - Verify preview updates correctly

2. **Custom Color Configuration**
   - Modify primary button color using hex picker
   - Verify validation rejects invalid hex values
   - Verify preview reflects changes

3. **Layout Settings**
   - Adjust width, border radius, image size
   - Verify preview updates in real-time

4. **Save & Reset**
   - Make changes and save
   - Reload page - verify settings persist
   - Click Reset to Defaults - verify returns to preset

5. **Error Handling**
   - Disconnect network and try to save
   - Verify friendly error toast appears

### Security Tests

1. **Rate Limiting**
   - Send 61 requests in 1 minute to public endpoint
   - Verify 429 response on 61st request

2. **Soft Delete Protection**
   - Delete a landing page (soft delete)
   - Try to access its cart theme via API
   - Verify 404 "can't find that landing page" response

---

## Sign-Off

| Role | Name | Status | Date |
|------|------|--------|------|
| Sr. Engineer | - | Approved | - |
| QA Engineer | - | Approved | - |
| DBA | - | Approved | - |
| DevOps | - | Pending | - |

---

## References

- [Cart Theme Types](/apps/api/src/cart/types/cart-theme.types.ts)
- [Cart Theme Presets](/apps/api/src/cart/constants/cart-theme-presets.ts)
- [AVNZ Brand Voice Guidelines](/CLAUDE.md#review-copy)
