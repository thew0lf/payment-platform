# Shopify-Inspired Product Management - Deployment Checklist

## Overview

This checklist covers the deployment of the Shopify-inspired product management system redesign, including:
- Collapsible card-based product editor layout
- Sales channels and publishing
- Category metafields (dynamic fields per category)
- SEO preview and optimization
- Multi-location inventory support

---

## Pre-Deployment Checklist

### 1. Database Migrations

- [ ] Verify all migrations are created and tested locally
- [ ] Review migration SQL for potential long-running operations
- [ ] Check for any breaking changes in existing data

```bash
# List pending migrations
cd apps/api && npx prisma migrate status

# Generate migration for review
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-migrations ./prisma/migrations --script
```

**New Models Added:**
- `SalesChannel` - Company sales channels (Online Store, POS, Wholesale)
- `ProductSalesChannel` - Product-to-channel publishing relationship
- `CategoryMetafieldDefinition` - Dynamic field definitions per category
- `ProductMetafieldValue` - Product metafield values storage

### 2. Backend Verification

- [ ] TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] Unit tests pass (`npm test`)
- [ ] API endpoints tested manually or via Postman

**New Endpoints:**
```
# Sales Channels
GET    /api/sales-channels
POST   /api/sales-channels
PATCH  /api/sales-channels/:id
DELETE /api/sales-channels/:id
POST   /api/sales-channels/reorder

# Product Publishing
GET    /api/products/:id/channels
POST   /api/products/:id/channels
PATCH  /api/products/:id/channels/:channelId
DELETE /api/products/:id/channels/:channelId

# Category Metafields
GET    /api/products/categories/:categoryId/metafields
POST   /api/products/categories/:categoryId/metafields
PATCH  /api/products/categories/:categoryId/metafields/:id
DELETE /api/products/categories/:categoryId/metafields/:id
GET    /api/products/:productId/metafields
PUT    /api/products/:productId/metafields
```

### 3. Frontend Verification

- [ ] TypeScript compilation passes
- [ ] Build succeeds (`npm run build`)
- [ ] All collapsible sections expand/collapse correctly
- [ ] Reduced motion preference is respected
- [ ] No XSS vulnerabilities in media URL handling
- [ ] Click-outside handlers work on organization section dropdowns

**New Components:**
- `CollapsibleCard` - Base collapsible card UI component
- `TitleDescriptionSection` - Product name and rich text description
- `MediaSection` - Image gallery with drag-and-drop reordering
- `PricingSection` - Price, compare at, cost with profit margin
- `InventorySection` - Multi-location stock management
- `VariantsSection` - Product variant matrix
- `OrganizationSection` - Categories, tags, collections, vendor
- `MetafieldsSection` - Dynamic fields based on category
- `ChannelsSection` - Sales channel publishing
- `SeoSection` - Meta title/description with Google preview
- `AdditionalDetailsSection` - Weight, fulfillment type

### 4. Seed Data

- [ ] Sales channels seed runs successfully
- [ ] Category metafield templates are created

```bash
# Run seeds
cd apps/api && npx prisma db seed

# Verify channels created
npx prisma studio  # Check SalesChannel table
```

**Default Channels:**
| Channel | Type | Default Status |
|---------|------|----------------|
| Online Store | ONLINE_STORE | Active, Default |
| Point of Sale | POS | Inactive |
| Wholesale | WHOLESALE | Inactive |

**Metafield Templates Available:**
- Coffee (roast_level, origin, flavor_notes, processing_method, etc.)
- Apparel (material, care_instructions, fit_type, etc.)
- Electronics (warranty, power_specs, certifications, etc.)
- Food (ingredients, allergens, shelf_life, storage, etc.)

---

## Deployment Steps

### Step 1: Database Migration (CRITICAL)

```bash
# 1. Backup production database
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migrations
npx prisma migrate deploy

# 3. Verify migration success
npx prisma migrate status
```

**Rollback Plan:**
```bash
# If migration fails, restore from backup
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_YYYYMMDD_HHMMSS.sql
```

### Step 2: Deploy Backend

```bash
# Build and deploy API
docker-compose -p avnz-payment-platform build api --no-cache
docker-compose -p avnz-payment-platform up -d api

# Verify health
curl http://localhost:3001/api/health
```

### Step 3: Deploy Frontend

```bash
# Build and deploy admin dashboard
docker-compose -p avnz-payment-platform build admin-dashboard --no-cache
docker-compose -p avnz-payment-platform up -d admin-dashboard

# Verify health
curl http://localhost:3000
```

### Step 4: Run Seed Data (if needed)

```bash
# Seed sales channels for existing companies
docker exec -it avnz-payment-api npx prisma db seed
```

---

## Post-Deployment Verification

### Functional Tests

- [ ] **Product List Page**
  - [ ] Products display correctly
  - [ ] Search works
  - [ ] Filters work

- [ ] **Product Detail Page**
  - [ ] All 10 collapsible sections render
  - [ ] Sections expand/collapse
  - [ ] State persists on reload (localStorage)
  - [ ] Save button works
  - [ ] Form validation works

- [ ] **Sales Channels**
  - [ ] Default channels appear for all companies
  - [ ] Can toggle publish/unpublish
  - [ ] Published timestamp shows correctly

- [ ] **Category Metafields**
  - [ ] Metafields show when product has matching category
  - [ ] Field types render correctly (text, select, boolean, etc.)
  - [ ] Values save and persist

- [ ] **SEO Section**
  - [ ] Meta title/description fields work
  - [ ] Character counts display
  - [ ] URL slug auto-generates

### Accessibility Tests

- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] Focus indicators visible
- [ ] Reduced motion respected
- [ ] Screen reader announcements work (aria-expanded)

### Performance Tests

- [ ] Page load time < 3 seconds
- [ ] Section toggle is smooth
- [ ] No memory leaks on repeat toggle

### Mobile Tests

- [ ] Responsive layout on mobile (375px width)
- [ ] Touch targets are 44px+ minimum
- [ ] Scrolling works smoothly

---

## Monitoring & Alerts

### Key Metrics to Watch

| Metric | Threshold | Alert |
|--------|-----------|-------|
| API response time | > 500ms | Warning |
| API response time | > 2000ms | Critical |
| Error rate | > 1% | Warning |
| Error rate | > 5% | Critical |
| Memory usage | > 80% | Warning |

### Log Queries

```bash
# Check for errors in product endpoints
docker logs avnz-payment-api 2>&1 | grep -E "(products|sales-channels|metafields)" | grep -i error

# Check frontend errors
docker logs avnz-payment-admin 2>&1 | grep -i error
```

---

## Rollback Procedure

### If Critical Issues Found

1. **Immediate**: Revert to previous Docker images
```bash
docker-compose -p avnz-payment-platform down
docker-compose -p avnz-payment-platform up -d --force-recreate
```

2. **Database**: Restore from backup if schema changes caused issues
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_YYYYMMDD_HHMMSS.sql
```

3. **Communication**: Notify team and stakeholders

---

## Feature Flags (Optional)

If using feature flags, these can be used for gradual rollout:

| Flag | Description | Default |
|------|-------------|---------|
| `product_collapsible_sections` | Enable new collapsible layout | true |
| `product_sales_channels` | Enable sales channel publishing | true |
| `product_category_metafields` | Enable dynamic metafields | true |
| `product_seo_preview` | Enable SEO preview section | true |

---

## Sign-Off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Dev Lead | | | [ ] |
| QA Lead | | | [ ] |
| Product Manager | | | [ ] |
| DevOps | | | [ ] |

---

## Appendix: File Changes Summary

### New Files Created

**Backend (apps/api):**
```
src/products/services/sales-channel.service.ts
src/products/services/category-metafield.service.ts
src/products/controllers/sales-channel.controller.ts
src/products/controllers/category-metafield.controller.ts
src/products/dto/sales-channel.dto.ts
src/products/dto/category-metafield.dto.ts
prisma/seeds/core/seed-sales-channels.ts
prisma/migrations/YYYYMMDD_add_shopify_product_features/
```

**Frontend (apps/admin-dashboard):**
```
src/components/ui/collapsible-card.tsx
src/components/products/sections/title-description-section.tsx
src/components/products/sections/media-section.tsx
src/components/products/sections/pricing-section.tsx
src/components/products/sections/inventory-section.tsx
src/components/products/sections/variants-section.tsx
src/components/products/sections/organization-section.tsx
src/components/products/sections/metafields-section.tsx
src/components/products/sections/channels-section.tsx
src/components/products/sections/seo-section.tsx
src/components/products/sections/additional-details-section.tsx
src/components/products/sections/index.ts
src/lib/api/sales-channels.ts
src/lib/api/category-metafields.ts
e2e/products.spec.ts
```

### Modified Files

```
apps/admin-dashboard/src/app/(dashboard)/products/[id]/page.tsx
apps/api/prisma/schema.prisma
apps/api/prisma/seed.ts
apps/api/prisma/seeds/core/index.ts
```
