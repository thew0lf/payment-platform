# Database Schema Changelog

> **Purpose:** Track ALL schema changes to ensure proper migrations are created before deployment.
> **Rule:** NEVER use `prisma db push` without documenting here and creating a migration file.

---

## How to Use This Document

### When Making Schema Changes:

1. **Document the change below** BEFORE modifying `schema.prisma`
2. **Create the migration file** using `npx prisma migrate dev --name <description>`
3. **Update status** from `PENDING` to `MIGRATED` with migration file name
4. **Commit both** the schema change AND the migration file together

### Status Legend:
- `PENDING` - Schema changed locally, NO migration file exists (BLOCKS DEPLOYMENT)
- `MIGRATED` - Migration file created and ready for deployment
- `DEPLOYED` - Applied to production

---

## Pending Schema Changes (BLOCKING DEPLOYMENT)

_None currently_

---

## Migrated (Ready for Deployment)

### 20260203100000_add_affiliate_fallback_url
- **Status:** `MIGRATED`
- **Date Added:** February 3, 2026
- **Date Migrated:** February 3, 2026
- **Description:** Add configurable fallback URL to affiliate program configuration
- **Changes:**
  - New column on `affiliate_program_configs`:
    - `defaultFallbackUrl` (String, nullable) - Company-level redirect URL when affiliate link is invalid/expired
- **Migration File:** `prisma/migrations/20260203100000_add_affiliate_fallback_url/migration.sql`
- **Risk Level:** Low (additive - new nullable column)
- **Rollback:**
  ```sql
  ALTER TABLE "affiliate_program_configs" DROP COLUMN "defaultFallbackUrl";
  ```

### 20260203000000_add_affiliate_click_queue
- **Status:** `MIGRATED`
- **Date Added:** February 3, 2026
- **Date Migrated:** February 3, 2026
- **Description:** PostgreSQL-backed click queue for durable high-throughput affiliate click ingestion
- **Changes:**
  - New enum:
    - `ClickQueueStatus` (PENDING, PROCESSING, COMPLETED, FAILED, DUPLICATE)
  - New table:
    - `affiliate_click_queue` - Durable queue for click ingestion before batch processing
      - Stores raw click data with enrichment fields
      - Processing state tracking (status, retryCount, errorMessage)
      - Indexes optimized for batch processing queries
- **Migration File:** `prisma/migrations/20260203000000_add_affiliate_click_queue/migration.sql`
- **Risk Level:** Low (additive - new table and enum)
- **Performance Notes:**
  - Queue inserts are single-table operations (no FK constraints)
  - Background processor moves completed clicks to `affiliate_clicks`
  - Designed for 10k+ clicks/second throughput
- **Rollback:**
  ```sql
  DROP INDEX "affiliate_click_queue_queuedAt_idx";
  DROP INDEX "affiliate_click_queue_companyId_queuedAt_idx";
  DROP INDEX "affiliate_click_queue_status_queuedAt_idx";
  DROP TABLE "affiliate_click_queue";
  DROP TYPE "ClickQueueStatus";
  ```

---

## Migrated (Ready for Deployment)

### 20260131160000_phase4_lead_variant_discount_tracking
- **Status:** `MIGRATED`
- **Date Added:** January 31, 2026
- **Date Migrated:** January 31, 2026
- **Description:** Phase 4 feature enhancements for lead analytics - A/B variant tracking, discount code performance
- **Tasks Addressed:**
  - Task #26: Field interaction duration tracking (uses existing checkoutBehavior JSON)
  - Task #28: Track A/B variant on Lead record
  - Task #29: Discount code performance tracking
  - Task #30: Transfer billing address to Lead record (uses existing capturedFields JSON)
  - Task #31: Form validation error tracking (uses existing checkoutBehavior JSON)
- **Changes:**
  - New column on `leads` table:
    - `variantId` (String, nullable) - A/B test variant ID for conversion analytics
  - New columns on `funnel_sessions` table:
    - `discountCode` (String, nullable) - Applied discount code
    - `discountAmount` (Decimal(10,2), nullable) - Discount amount applied
  - New indexes:
    - `leads_variantId_idx` on `leads.variantId`
    - `funnel_sessions_discountCode_idx` on `funnel_sessions.discountCode`
- **Migration File:** `prisma/migrations/20260131160000_phase4_lead_variant_discount_tracking/migration.sql`
- **Risk Level:** Low (additive changes only - new nullable columns and indexes)
- **Rollback:**
  ```sql
  DROP INDEX "leads_variantId_idx";
  ALTER TABLE "leads" DROP COLUMN "variantId";
  DROP INDEX "funnel_sessions_discountCode_idx";
  ALTER TABLE "funnel_sessions" DROP COLUMN "discountAmount";
  ALTER TABLE "funnel_sessions" DROP COLUMN "discountCode";
  ```
- **Production Notes:**
  - All changes are additive (ALTER TABLE ADD COLUMN, CREATE INDEX)
  - No existing data will be affected
  - New columns are nullable, so no backfill required
  - Index creation is non-blocking in PostgreSQL
  - Estimated execution time: < 5 seconds
  - 10 lines of SQL

---

### 20260131200000_add_affiliate_program
- **Status:** `MIGRATED`
- **Date Added:** January 31, 2026
- **Date Migrated:** January 31, 2026
- **Description:** Core Affiliate Program database models and services
- **Changes:**
  - New enums:
    - `PartnershipType` (AFFILIATE, AMBASSADOR, INFLUENCER, RESELLER, REFERRAL)
    - `AffiliateStatus` (PENDING_APPROVAL, ACTIVE, SUSPENDED, INACTIVE, REJECTED, TERMINATED)
    - `AffiliateTier` (BRONZE, SILVER, GOLD, PLATINUM, DIAMOND)
    - `AffiliatePayoutStatus` (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, ON_HOLD)
    - `AffiliatePayoutMethod` (PAYPAL, BANK_TRANSFER, CHECK, CRYPTO, STORE_CREDIT)
    - `ClickStatus` (VALID, DUPLICATE, SUSPICIOUS, FRAUD, BOT)
    - `ConversionStatus` (PENDING, APPROVED, REJECTED, REVERSED, DISPUTED)
  - New tables:
    - `affiliate_partners` - Partner accounts with profile, commission config, metrics
    - `affiliate_links` - Trackable referral links with SubID support
    - `affiliate_clicks` - Click tracking with fraud detection and geo data
    - `affiliate_conversions` - Conversion/sale events with attribution
    - `affiliate_payouts` - Payout records with invoicing
    - `affiliate_creatives` - Marketing materials for affiliates
    - `affiliate_program_configs` - Company-level program configuration
    - `affiliate_applications` - Pending partner applications
  - New relations:
    - Company -> AffiliatePartner, AffiliateLink, AffiliateClick, AffiliateConversion, AffiliatePayout, AffiliateCreative, AffiliateProgramConfig, AffiliateApplication
    - Customer -> AffiliateConversion (for customer attribution)
    - Order -> AffiliateConversion (for order tracking)
  - 45+ indexes for query optimization
- **Migration File:** `prisma/migrations/20260131200000_add_affiliate_program/migration.sql`
- **Risk Level:** Low (additive changes only - new enums and tables)
- **Rollback:**
  ```sql
  DROP TABLE "affiliate_applications";
  DROP TABLE "affiliate_program_configs";
  DROP TABLE "affiliate_creatives";
  DROP TABLE "affiliate_payouts";
  DROP TABLE "affiliate_conversions";
  DROP TABLE "affiliate_clicks";
  DROP TABLE "affiliate_links";
  DROP TABLE "affiliate_partners";
  DROP TYPE "ConversionStatus";
  DROP TYPE "ClickStatus";
  DROP TYPE "AffiliatePayoutMethod";
  DROP TYPE "AffiliatePayoutStatus";
  DROP TYPE "AffiliateTier";
  DROP TYPE "AffiliateStatus";
  DROP TYPE "PartnershipType";
  ```
- **Production Notes:**
  - All changes are additive (CREATE TYPE, CREATE TABLE)
  - No existing data will be affected
  - Estimated execution time: < 5 seconds
  - 380 lines of SQL
  - Comprehensive indexes for partner, link, click, conversion queries

---

### 20260131135216_add_funnel_session_performance_indexes
- **Status:** `MIGRATED`
- **Date Added:** January 31, 2026
- **Date Migrated:** January 31, 2026
- **Description:** Add performance indexes to FunnelSession table for query optimization (Tasks #12-16)
- **Changes:**
  - New composite index on `funnel_sessions` table:
    - `funnel_sessions_funnelId_status_lastActivityAt_idx` on `(funnelId, status, lastActivityAt)`
    - Purpose: Optimize queries filtering by funnel + status + activity time
  - New single-column indexes on `funnel_sessions` table:
    - `funnel_sessions_termsAcceptedAt_idx` on `termsAcceptedAt`
    - `funnel_sessions_privacyAcceptedAt_idx` on `privacyAcceptedAt`
    - `funnel_sessions_lastActivityAt_idx` on `lastActivityAt`
    - Purpose: Optimize compliance reporting and session activity queries
- **Migration File:** `prisma/migrations/20260131135216_add_funnel_session_performance_indexes/migration.sql`
- **Risk Level:** Low (additive indexes only, no table modifications)
- **Rollback:**
  ```sql
  DROP INDEX "funnel_sessions_funnelId_status_lastActivityAt_idx";
  DROP INDEX "funnel_sessions_termsAcceptedAt_idx";
  DROP INDEX "funnel_sessions_privacyAcceptedAt_idx";
  DROP INDEX "funnel_sessions_lastActivityAt_idx";
  ```
- **Production Notes:**
  - All changes are additive (CREATE INDEX)
  - Index creation is non-blocking in PostgreSQL
  - Estimated execution time: < 5 seconds (depends on table size)
  - Note: FunnelSession model does not have a `deletedAt` field (uses `abandonedAt` for session state tracking instead)

---

### 20260131134047_add_funnel_cs_session_link
- **Status:** `MIGRATED`
- **Date Added:** January 31, 2026
- **Date Migrated:** January 31, 2026
- **Description:** Add consent tracking and CS session link to FunnelSession
- **Changes:**
  - New columns on `funnel_sessions` table:
    - `termsAcceptedAt` (DateTime, nullable) - Timestamp when user accepted terms
    - `privacyAcceptedAt` (DateTime, nullable) - Timestamp when user accepted privacy policy
    - `csSessionId` (String, nullable FK to `cs_sessions`) - Link to customer service session
  - New index:
    - `funnel_sessions_csSessionId_idx` on `csSessionId`
  - New foreign key:
    - `funnel_sessions.csSessionId` → `cs_sessions.id` ON DELETE SET NULL
- **Migration File:** `prisma/migrations/20260131134047_add_funnel_cs_session_link/migration.sql`
- **Risk Level:** Low (additive changes only)
- **Rollback:**
  ```sql
  ALTER TABLE "funnel_sessions" DROP CONSTRAINT "funnel_sessions_csSessionId_fkey";
  DROP INDEX "funnel_sessions_csSessionId_idx";
  ALTER TABLE "funnel_sessions" DROP COLUMN "csSessionId";
  ALTER TABLE "funnel_sessions" DROP COLUMN "privacyAcceptedAt";
  ALTER TABLE "funnel_sessions" DROP COLUMN "termsAcceptedAt";
  ```
- **Production Notes:**
  - All changes are additive
  - No existing data will be affected
  - New columns are nullable, so no backfill required
  - Enables compliance tracking for GDPR/CNIL consent
  - Allows linking funnel sessions to CS support interactions

---

### 20260102215624_add_landing_page_cart_integration
- **Status:** `MIGRATED`
- **Date Added:** January 2, 2026
- **Date Migrated:** January 2, 2026
- **Description:** LandingPage ↔ Cart integration for attribution tracking
- **Changes:**
  - New enum `CartSourceType` (DIRECT, LANDING_PAGE, FUNNEL, EMAIL)
  - New enum `LandingPageSessionStatus` (ACTIVE, CONVERTED, ABANDONED, EXPIRED)
  - New columns on `carts` table:
    - `landingPageId` (nullable FK to `landing_pages`)
    - `sourceType` (CartSourceType, default DIRECT)
  - New indexes on `carts` table:
    - `carts_landingPageId_idx`
    - `carts_sourceType_companyId_status_idx`
  - New `landing_page_sessions` table with 17 columns:
    - `id`, `sessionToken` (unique), `landingPageId`, `visitorId`
    - `ipAddressHash`, `userAgent`, `referrer`
    - `deviceType`, `browser`, `os`
    - `utmSource`, `utmMedium`, `utmCampaign`, `utmTerm`, `utmContent`
    - `cartId` (unique), `status`, `convertedAt`, `orderId`, `abandonedAt`
    - `startedAt`, `lastActivityAt`, `companyId`
  - Performance indexes on `landing_page_sessions`:
    - `landing_page_sessions_sessionToken_key` (unique)
    - `landing_page_sessions_cartId_key` (unique)
    - `landing_page_sessions_landingPageId_startedAt_idx`
    - `landing_page_sessions_landingPageId_status_idx`
    - `landing_page_sessions_companyId_startedAt_idx`
    - `landing_page_sessions_companyId_convertedAt_idx`
    - `landing_page_sessions_status_idx`
  - Foreign keys with proper cascade behavior:
    - `carts.landingPageId` → `landing_pages.id` ON DELETE SET NULL
    - `landing_page_sessions.landingPageId` → `landing_pages.id` ON DELETE CASCADE
    - `landing_page_sessions.companyId` → `companies.id` ON DELETE CASCADE
    - `landing_page_sessions.cartId` → `carts.id` ON DELETE SET NULL
  - Also includes `inventory_holds` table (was pending in schema)
- **Migration File:** `prisma/migrations/20260102215624_add_landing_page_cart_integration/migration.sql`
- **Risk Level:** Low (additive changes only)
- **Rollback:**
  ```sql
  ALTER TABLE "carts" DROP COLUMN "landingPageId";
  ALTER TABLE "carts" DROP COLUMN "sourceType";
  DROP TABLE "landing_page_sessions";
  DROP TABLE "inventory_holds";
  DROP TYPE "CartSourceType";
  DROP TYPE "LandingPageSessionStatus";
  ```
- **Production Notes:**
  - All changes are additive
  - No existing data will be affected
  - New FK columns are nullable, so no backfill required
  - Estimated execution time: < 5 seconds
  - 115 lines of SQL

---

### 20251231201625_add_cart_and_session_partial_indexes
- **Status:** `MIGRATED`
- **Date Added:** December 31, 2025
- **Date Migrated:** December 31, 2025
- **Description:** Priority 1 performance indexes from DBA review recommendations
- **Changes:**
  - New partial index `idx_carts_recovery_candidates` on `carts` table
    - Columns: `companyId`, `abandonedAt`, `recoveryEmailSent`
    - WHERE: `status = 'ABANDONED' AND "recoveryEmailSent" = false`
    - Purpose: Optimize abandoned cart recovery email campaigns
  - New partial index `idx_cross_site_sessions_cleanup` on `cross_site_sessions` table
    - Columns: `expiresAt`
    - WHERE: `status = 'ACTIVE'`
    - Purpose: Optimize session cleanup background jobs
  - New partial index `idx_carts_expiration` on `carts` table
    - Columns: `expiresAt`
    - WHERE: `status = 'ACTIVE' AND "expiresAt" IS NOT NULL`
    - Purpose: Optimize cart expiration background jobs
- **Migration File:** `prisma/migrations/20251231201625_add_cart_and_session_partial_indexes/migration.sql`
- **Risk Level:** Low (additive indexes only, no table modifications)
- **Rollback:** `DROP INDEX idx_carts_recovery_candidates; DROP INDEX idx_cross_site_sessions_cleanup; DROP INDEX idx_carts_expiration;`
- **Production Notes:**
  - All changes are additive (CREATE INDEX)
  - Partial indexes reduce index size and improve write performance
  - Index creation is non-blocking in PostgreSQL (default behavior)
  - Estimated execution time: < 5 seconds (depends on table size)
  - 25 lines of SQL

---

### 20241224000000_add_sites_model
- **Status:** `MIGRATED`
- **Date Added:** December 2024
- **Date Migrated:** December 24, 2024
- **Description:** New `Site` model for multiple storefronts per company
- **Changes:**
  - New `sites` table with 27 columns
  - New `siteId` nullable column on `landing_pages`
  - New `siteId` nullable column on `funnels`
  - New `sites` relation on `companies`
- **Migration File:** `prisma/migrations/20241224000000_add_sites_model/migration.sql`
- **Risk Level:** Low (additive changes only, no data migration needed)
- **Rollback:** Drop foreign keys, drop columns, drop table
- **Production Notes:**
  - All changes are additive (CREATE TABLE, ADD COLUMN)
  - No existing data will be affected
  - New FK columns are nullable, so no backfill required
  - Estimated execution time: < 1 second

### 20241224100000_add_cs_ai_usage_tables
- **Status:** `MIGRATED`
- **Date Added:** December 2024
- **Date Migrated:** December 24, 2024
- **Description:** CS AI usage tracking, pricing, and billing tables
- **Changes:**
  - New `CSAIUsageType` enum (`VOICE_CALL`, `CHAT_SESSION`, `EMAIL_SUPPORT`, `SMS_SUPPORT`)
  - New `cs_ai_usage` table - Individual usage records
  - New `cs_ai_pricing` table - Organization-level pricing configuration
  - New `cs_ai_usage_summary` table - Billing period summaries
- **Migration File:** `prisma/migrations/20241224100000_add_cs_ai_usage_tables/migration.sql`
- **Risk Level:** Low (additive changes only, no data migration needed)
- **Rollback:** Drop tables and enum
- **Production Notes:**
  - All changes are additive (CREATE TYPE, CREATE TABLE)
  - No existing data will be affected
  - Estimated execution time: < 1 second
  - Depends on existing `cs_sessions` and `voice_calls` tables for FKs

---

### 20251227_add_product_import_system
- **Status:** `MIGRATED`
- **Date Added:** December 27, 2025
- **Date Migrated:** December 27, 2025
- **Description:** Product Import system with intelligent field mapping, image CDN import, and background processing
- **Changes:**
  - New `ImportJobStatus` enum (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`)
  - New `ImportJobPhase` enum (`VALIDATION`, `FIELD_MAPPING`, `IMAGE_DOWNLOAD`, `PRODUCT_CREATION`, `FINALIZATION`)
  - New `product_import_jobs` table - Background import job tracking with progress
  - New `product_images` table - Product image storage and CDN URLs
  - New `storage_usage` table - Storage usage tracking by client/company for billing
  - New `field_mapping_profiles` table - Reusable field mapping templates
  - Altered `products` table - Added 4 columns: `importSource`, `externalId`, `externalSku`, `lastSyncedAt`
  - 10 new indexes for multi-tenant query optimization
- **Migration File:** `prisma/migrations/20251227_add_product_import_system/migration.sql`
- **Risk Level:** Low (additive changes only)
- **Rollback:** DROP tables, DROP enums, ALTER TABLE products DROP COLUMN (SQL provided in signoff)
- **Production Notes:**
  - All changes are additive (CREATE TYPE, CREATE TABLE, ALTER TABLE ADD COLUMN)
  - New columns on `products` are nullable, no backfill required
  - Unique constraint on `products.companyId + externalId + importSource` prevents duplicates
  - Indexes optimized for `companyId + status` queries
  - Estimated execution time: < 2 seconds
  - 152 lines of SQL, verified safe for production
- **Deployed:** December 28, 2025

---

## Deployed to Production

### 00000000000000_init_baseline
- **Date Deployed:** December 2024
- **Description:** Initial baseline migration with all existing tables (177 tables)

---

## Schema Change Guidelines

### Safe Changes (Low Risk)
- Adding new tables
- Adding nullable columns
- Adding indexes
- Adding new enum values at the end

### Risky Changes (Require Planning)
- Renaming columns/tables
- Changing column types
- Removing columns/tables
- Adding NOT NULL columns without defaults
- Removing enum values

### Change Checklist
- [ ] Document change in this file
- [ ] Create migration with `npx prisma migrate dev --name <description>`
- [ ] Test migration on fresh database
- [ ] Test rollback procedure
- [ ] Update status in this file
- [ ] Commit schema.prisma + migration together
- [ ] Update CLAUDE.md if needed

---

## Pre-Deployment Verification

Before any deployment, run:
```bash
# Check for pending migrations
npx prisma migrate status

# Validate schema matches migrations
npx prisma validate

# Check this file for PENDING items
grep -c "PENDING" docs/DATABASE_SCHEMA_CHANGELOG.md
# Should return 0 for deployment to proceed
```

---

## Emergency: Schema Drift Recovery

If local database has changes not in migrations:

1. **Document all changes** in this file
2. **Generate migration SQL:**
   ```bash
   npx prisma migrate diff \
     --from-migrations ./prisma/migrations \
     --to-schema-datamodel ./prisma/schema.prisma \
     --script > pending_migration.sql
   ```
3. **Create proper migration directory** with timestamp
4. **Test on fresh database**
5. **Update this document**

---

*Last Updated: January 31, 2026*
