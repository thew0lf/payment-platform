# Brand Kit Feature - Deployment Plan

**Feature:** Company Brand Kit System
**Version:** 1.0.0
**Date:** December 30, 2025
**Status:** Ready for Deployment

---

## Executive Summary

The Brand Kit feature provides company-level branding customization that flows through to checkout funnels and the onboarding wizard. This document outlines the deployment plan from DevOps, Developer, and DBA perspectives.

### Components Delivered
1. **Phase 1:** Settings → Brand Kit page (company-level defaults)
2. **Phase 2:** Funnel Builder → Branding override tab
3. **Phase 3:** Onboarding wizard integration

---

## DevOps Deployment Checklist

### Pre-Deployment
- [ ] Verify all CI/CD pipelines pass
- [ ] Review Docker image sizes (no significant bloat)
- [ ] Confirm S3 bucket `avnz-platform-assets` is configured for logo uploads
- [ ] Verify CloudFront CDN is properly configured for asset delivery
- [ ] Check Redis cache configuration for brand kit caching

### Environment Variables
No new environment variables required. Feature uses existing:
- `AWS_S3_BUCKET_NAME` - For logo/favicon storage
- `AWS_REGION` - S3 region
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - S3 credentials

### Deployment Steps

#### 1. Database Migration (Zero Downtime)
```bash
# Run from API container
npx prisma migrate deploy
```

**Migration Details:**
- `20251229_add_brand_kit_fields` - Adds brand kit columns to Company table
- `20251230_add_funnel_brand_overrides` - Adds brand override columns to Funnel table

Both migrations are **additive only** (no column drops/renames), ensuring zero downtime.

#### 2. API Deployment
```bash
# Pull latest images
docker-compose pull api

# Rolling restart (zero downtime)
docker-compose up -d --no-deps api
```

#### 3. Admin Dashboard Deployment
```bash
# Pull latest images
docker-compose pull admin-dashboard

# Rolling restart
docker-compose up -d --no-deps admin-dashboard
```

#### 4. Cache Invalidation
```bash
# Invalidate CloudFront cache for static assets
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DIST_ID \
  --paths "/integrations/*" "/_next/static/*"
```

### Rollback Procedure
```bash
# Revert to previous image tag
docker-compose up -d api --image=api:previous-tag
docker-compose up -d admin-dashboard --image=admin-dashboard:previous-tag

# Note: Database migrations are non-destructive, no rollback needed
```

### Monitoring
- [ ] Monitor API error rates in Datadog
- [ ] Watch for 500 errors on `/api/brand-kit/*` endpoints
- [ ] Monitor S3 upload success rates
- [ ] Check Redis cache hit rates

---

## Developer Deployment Checklist

### Code Review Confirmation
- [x] All TypeScript compiles without errors
- [x] All unit tests pass (40/40 onboarding wizard tests)
- [x] ESLint passes with no warnings
- [x] Accessibility review complete (focus trap, ARIA labels)

### API Changes

#### New Endpoints
| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/brand-kit/company` | GET | Yes | Get company brand kit |
| `/api/brand-kit/company` | PUT | Yes | Update company brand kit |
| `/api/brand-kit/company/logo` | POST | Yes | Upload company logo |
| `/api/brand-kit/company/favicon` | POST | Yes | Upload company favicon |
| `/api/brand-kit/funnel/:funnelId` | GET | Yes | Get funnel brand overrides |
| `/api/brand-kit/funnel/:funnelId` | PUT | Yes | Update funnel brand overrides |

#### Controller Files
- `apps/api/src/brand-kit/company-brand-kit.controller.ts`
- `apps/api/src/brand-kit/funnel-brand-kit.controller.ts`

#### Service Files
- `apps/api/src/brand-kit/company-brand-kit.service.ts`
- `apps/api/src/brand-kit/funnel-brand-kit.service.ts`
- `apps/api/src/brand-kit/brand-kit-asset.service.ts`

### Frontend Changes

#### New Components
| Component | Path | Purpose |
|-----------|------|---------|
| `OnboardingWizard` | `src/components/onboarding/onboarding-wizard.tsx` | Multi-step wizard modal |
| `WelcomeStep` | `src/components/onboarding/steps/welcome-step.tsx` | Welcome screen |
| `BrandKitStep` | `src/components/onboarding/steps/brand-kit-step.tsx` | Brand configuration |
| `CompleteStep` | `src/components/onboarding/steps/complete-step.tsx` | Completion screen |

#### New Store
- `src/stores/onboarding-wizard.store.ts` - Zustand store with localStorage persistence

#### Modified Files
- `src/app/(dashboard)/layout.tsx` - Integrated onboarding wizard
- `src/app/(dashboard)/settings/brand-kit/page.tsx` - Brand kit settings page
- `src/app/(dashboard)/funnels/builder/page.tsx` - Added branding tab

### Feature Flags
No feature flags required. Feature is immediately available upon deployment.

### Testing in Staging
1. Create new company account
2. Verify onboarding wizard appears after 1 second delay
3. Complete brand kit step with preset and custom colors
4. Verify settings persist across sessions
5. Check funnel builder branding tab works
6. Verify checkout preview reflects brand colors

---

## DBA Deployment Checklist

### Database Schema Changes

#### Migration 1: Company Brand Kit Fields
```sql
-- File: 20251229_add_brand_kit_fields
ALTER TABLE "Company" ADD COLUMN "brandLogoUrl" TEXT;
ALTER TABLE "Company" ADD COLUMN "brandFaviconUrl" TEXT;
ALTER TABLE "Company" ADD COLUMN "brandPrimaryColor" TEXT;
ALTER TABLE "Company" ADD COLUMN "brandSecondaryColor" TEXT;
ALTER TABLE "Company" ADD COLUMN "brandAccentColor" TEXT;
ALTER TABLE "Company" ADD COLUMN "brandBackgroundColor" TEXT;
ALTER TABLE "Company" ADD COLUMN "brandTextColor" TEXT;
ALTER TABLE "Company" ADD COLUMN "brandHeadingFont" TEXT;
ALTER TABLE "Company" ADD COLUMN "brandBodyFont" TEXT;
```

#### Migration 2: Funnel Brand Overrides
```sql
-- File: 20251230_add_funnel_brand_overrides
ALTER TABLE "Funnel" ADD COLUMN "brandOverride" JSONB DEFAULT '{}';
ALTER TABLE "Funnel" ADD COLUMN "useBrandOverride" BOOLEAN DEFAULT FALSE;
```

### Index Recommendations
No new indexes required. Brand kit data is accessed via company/funnel primary keys.

### Backup Requirements
```bash
# Pre-deployment backup (standard procedure)
pg_dump -h $DB_HOST -U $DB_USER -d payment_platform > backup_$(date +%Y%m%d).sql
```

### Data Validation Post-Deployment
```sql
-- Verify migration applied correctly
SELECT
  COUNT(*) as total_companies,
  COUNT(CASE WHEN "brandPrimaryColor" IS NOT NULL THEN 1 END) as with_brand
FROM "Company";

-- Check funnel override column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Funnel' AND column_name = 'brandOverride';
```

### Performance Considerations
- Brand kit fields add ~500 bytes per company row (negligible)
- JSONB column for funnel overrides is flexible for future expansion
- No JOIN changes required - brand data loaded with existing queries

### Rollback Procedure (If Needed)
```sql
-- Note: Only execute if critical issues found
-- These are NON-DESTRUCTIVE - data will be preserved even after rollback

-- Rollback Migration 2
ALTER TABLE "Funnel" DROP COLUMN IF EXISTS "brandOverride";
ALTER TABLE "Funnel" DROP COLUMN IF EXISTS "useBrandOverride";

-- Rollback Migration 1
ALTER TABLE "Company" DROP COLUMN IF EXISTS "brandLogoUrl";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "brandFaviconUrl";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "brandPrimaryColor";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "brandSecondaryColor";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "brandAccentColor";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "brandBackgroundColor";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "brandTextColor";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "brandHeadingFont";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "brandBodyFont";
```

---

## Post-Deployment Verification

### Smoke Tests
1. [ ] Login to admin dashboard
2. [ ] Navigate to Settings → Brand Kit
3. [ ] Upload a logo (verify S3 upload works)
4. [ ] Change primary color
5. [ ] Create new funnel with brand override
6. [ ] Preview checkout with brand colors
7. [ ] New user onboarding wizard appears and functions

### Performance Baseline
- Brand kit page load: < 500ms
- Logo upload: < 2s for 5MB file
- Funnel preview render: < 1s

### Success Metrics
- Zero 500 errors on brand kit endpoints
- Logo upload success rate > 99%
- Onboarding completion rate tracked in analytics

---

## Contacts

| Role | Name | Responsibility |
|------|------|----------------|
| DevOps Lead | [TBD] | Deployment execution |
| Backend Lead | [TBD] | API issues |
| Frontend Lead | [TBD] | UI issues |
| DBA | [TBD] | Database issues |

---

## Approval Signatures

| Role | Date | Signature |
|------|------|-----------|
| Engineering Manager | | |
| QA Lead | | |
| Product Owner | | |

---

*Document generated: December 30, 2025*
