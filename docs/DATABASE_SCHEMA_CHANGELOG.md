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

*Last Updated: December 24, 2025*
