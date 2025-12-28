# Product Import Feature Specification

**Version:** 1.0
**Created:** December 27, 2025
**Status:** Awaiting Approval

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [User Stories](#user-stories)
3. [Feature Requirements](#feature-requirements)
4. [Architecture Overview](#architecture-overview)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Field Mapping System](#field-mapping-system)
8. [Image Import & CDN](#image-import--cdn)
9. [Storage Usage Tracking](#storage-usage-tracking)
10. [Background Job Processing](#background-job-processing)
11. [Frontend Components](#frontend-components)
12. [UI Copy & Messaging](#ui-copy--messaging)
13. [Implementation Phases](#implementation-phases)
14. [File Structure](#file-structure)
15. [Testing Strategy](#testing-strategy)

---

## Executive Summary

### Goal
Enable vendors to import their product catalogs from connected fulfillment/dropship integrations (Roastify, Shopify, etc.) directly into the AVNZ platform, with intelligent field mapping, image CDN import, and background processing for large catalogs.

### Key Features
- **Intelligent Field Mapping**: Auto-detect field mappings with user confirmation
- **Image CDN Import**: Download, optimize, and store images in org's S3/CloudFront
- **Background Processing**: Bull queue for large catalogs with real-time progress
- **Storage Tracking**: Track usage by client and company for billing
- **Conflict Resolution**: Handle duplicate SKUs with skip/update/rename options

### Supported Providers (Initial)
- Roastify (coffee/merchandise fulfillment)
- Future: Shopify, WooCommerce, BigCommerce

---

## User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-1 | Vendor | Connect my Roastify account and import my product catalog | I don't have to manually re-enter all my products |
| US-2 | Vendor | Preview imported products before adding them | I can ensure data quality before import |
| US-3 | Vendor | Choose which products to import | I maintain control over my catalog |
| US-4 | Vendor | Have images automatically uploaded to CDN | My product pages load fast globally |
| US-5 | Vendor | See import progress in real-time | I know what's happening with large imports |
| US-6 | Vendor | Resolve SKU conflicts during import | I don't accidentally overwrite existing products |
| US-7 | Admin | See storage usage by client/company | I can track costs and set quotas |
| US-8 | Vendor | Cancel a running import | I can stop if I made a mistake |

---

## Feature Requirements

### Priority Levels
- **P0**: Must have for MVP
- **P1**: Should have for v1.0
- **P2**: Nice to have, can defer

| Requirement | Priority | Description |
|-------------|----------|-------------|
| Import Preview | P0 | Show preview of products before import with field mapping |
| Selective Import | P0 | Let users select specific products to import |
| SKU Conflict Detection | P0 | Detect duplicate SKUs and offer resolution options |
| Field Mapping | P0 | Map external fields to platform product fields with confirmation |
| Background Processing | P0 | Queue-based processing for catalogs > 10 products |
| Real-time Progress | P0 | SSE/polling for import progress updates |
| Image CDN Import | P1 | Download and upload images to org S3/CloudFront |
| Storage Tracking | P1 | Track storage usage by client/company |
| Import History | P1 | Track what was imported, when, and from where |
| Mapping Profiles | P2 | Save field mappings for future imports |
| Re-import/Update | P2 | Update existing products from source |
| Scheduled Sync | P2 | Automatic periodic inventory sync |

---

## Architecture Overview

### System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            IMPORT FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ Integration  │───▶│ Fetch        │───▶│ Product      │                   │
│  │ Card         │    │ Preview API  │    │ Selection    │                   │
│  │ "Import"     │    │              │    │ Modal        │                   │
│  └──────────────┘    └──────────────┘    └──────┬───────┘                   │
│                                                  │                           │
│                                                  ▼                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ Conflict     │◀───│ Image        │◀───│ Field        │                   │
│  │ Resolution   │    │ Options      │    │ Mapping      │                   │
│  │              │    │              │    │ Review       │                   │
│  └──────┬───────┘    └──────────────┘    └──────────────┘                   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ Start Import │───▶│ Bull Queue   │───▶│ Job          │                   │
│  │ API          │    │ (Redis)      │    │ Processor    │                   │
│  └──────────────┘    └──────────────┘    └──────┬───────┘                   │
│                                                  │                           │
│         ┌────────────────────────────────────────┤                           │
│         │                                        │                           │
│         ▼                                        ▼                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ SSE/Polling  │◀───│ Progress     │◀───│ Create       │                   │
│  │ Updates      │    │ Events       │    │ Products     │                   │
│  └──────────────┘    └──────────────┘    └──────┬───────┘                   │
│                                                  │                           │
│                                                  ▼                           │
│                                          ┌──────────────┐                   │
│                                          │ Image Import │                   │
│                                          │ (Download →  │                   │
│                                          │  S3 → CDN)   │                   │
│                                          └──────┬───────┘                   │
│                                                  │                           │
│                                                  ▼                           │
│                                          ┌──────────────┐                   │
│                                          │ Storage      │                   │
│                                          │ Usage        │                   │
│                                          │ Tracking     │                   │
│                                          └──────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| Integration Card | Entry point - "Import Products" button for FULFILLMENT integrations |
| Preview API | Fetch products from external source, return with field metadata |
| Field Mapper | Generate intelligent mappings, allow user overrides |
| Import Controller | Create job record, queue for background processing |
| Bull Queue | Redis-backed job queue with retry and concurrency control |
| Job Processor | Execute import phases: create products, download images, upload to CDN |
| Image Import Service | Download external images, process with Sharp, upload to S3 |
| Storage Tracking | Update usage counters by client/company/month |
| SSE Controller | Stream real-time progress to frontend |
| Progress Modal | Display phases, counts, ETA, and completion status |

---

## Database Schema

### New Models

```prisma
// ═══════════════════════════════════════════════════════════════
// PRODUCT IMPORT JOB
// ═══════════════════════════════════════════════════════════════

model ProductImportJob {
  id              String           @id @default(cuid())
  companyId       String
  clientId        String
  integrationId   String
  provider        IntegrationProvider

  // Job status
  status          ImportJobStatus  @default(PENDING)
  phase           ImportJobPhase   @default(QUEUED)

  // Counts
  totalProducts   Int
  totalImages     Int              @default(0)
  processedProducts Int            @default(0)
  processedImages   Int            @default(0)
  importedCount   Int              @default(0)
  skippedCount    Int              @default(0)
  errorCount      Int              @default(0)

  // Progress
  progress        Int              @default(0)  // 0-100
  currentItem     String?                       // "Importing: Ethiopian Yirgacheffe..."
  estimatedSecondsRemaining Int?

  // Configuration
  config          Json             // { mappings, conflictResolution, imageOption }

  // Results
  errorLog        Json?            // [{ productId, error, timestamp }]
  importedIds     String[]         // Product IDs created

  // Timing
  createdBy       String
  createdAt       DateTime         @default(now())
  startedAt       DateTime?
  completedAt     DateTime?

  company         Company          @relation(fields: [companyId], references: [id])

  @@index([companyId, status])
  @@index([status, createdAt])
}

enum ImportJobStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  CANCELLED
}

enum ImportJobPhase {
  QUEUED
  FETCHING
  MAPPING
  CREATING
  DOWNLOADING_IMAGES
  UPLOADING_IMAGES
  GENERATING_THUMBNAILS
  FINALIZING
  DONE
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT IMAGE (Separate from Product.images JSON array)
// ═══════════════════════════════════════════════════════════════

model ProductImage {
  id              String   @id @default(cuid())
  productId       String
  companyId       String

  // Storage reference
  s3Key           String   @unique
  cdnUrl          String

  // Metadata
  originalUrl     String?              // External URL if imported
  importSource    IntegrationProvider?
  filename        String
  contentType     String
  size            Int                  // bytes
  width           Int?
  height          Int?

  // Thumbnails
  thumbnailSmall  String?
  thumbnailMedium String?
  thumbnailLarge  String?
  thumbnailBytes  Int      @default(0)

  // Ordering
  position        Int      @default(0)
  isPrimary       Boolean  @default(false)
  altText         String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  product         Product  @relation(fields: [productId], references: [id])
  company         Company  @relation(fields: [companyId], references: [id])

  @@index([productId])
  @@index([companyId])
}

// ═══════════════════════════════════════════════════════════════
// STORAGE USAGE TRACKING
// ═══════════════════════════════════════════════════════════════

model StorageUsage {
  id              String   @id @default(cuid())
  organizationId  String
  clientId        String?
  companyId       String?

  // Usage metrics
  totalBytes      BigInt   @default(0)
  fileCount       Int      @default(0)
  imageCount      Int      @default(0)
  thumbnailBytes  BigInt   @default(0)

  // Monthly rollup
  month           DateTime // First day of month

  // Breakdown by source
  usageBySource   Json?    // { "UPLOAD": 1024, "ROASTIFY": 2048 }

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([organizationId, clientId, companyId, month])
  @@index([organizationId])
  @@index([clientId])
  @@index([companyId])
}

// ═══════════════════════════════════════════════════════════════
// FIELD MAPPING PROFILE (Optional - P2)
// ═══════════════════════════════════════════════════════════════

model FieldMappingProfile {
  id              String   @id @default(cuid())
  companyId       String
  provider        IntegrationProvider
  name            String
  mappings        Json     // [{ sourceField, targetField, transform }]
  isDefault       Boolean  @default(false)

  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([companyId, provider, name])
}
```

### Product Model Updates

```prisma
model Product {
  // ... existing fields ...

  // Import tracking (add these fields)
  importSource      IntegrationProvider?  // ROASTIFY, SHOPIFY, etc.
  externalId        String?               // ID from external system
  externalSku       String?               // Original SKU if renamed
  lastSyncedAt      DateTime?             // Last inventory sync

  // Relations
  productImages     ProductImage[]

  @@unique([companyId, externalId, importSource])
}
```

---

## API Endpoints

### Import Controller

```
POST   /api/products/import                    # Start import job
GET    /api/products/import/preview/:integrationId  # Fetch products preview
GET    /api/products/import/jobs               # List import jobs
GET    /api/products/import/jobs/:id           # Get job status
POST   /api/products/import/jobs/:id/cancel    # Cancel running job
```

### Import Events (SSE)

```
GET    /api/products/import/events/:jobId      # SSE stream for progress
```

### Storage Usage

```
GET    /api/admin/storage/usage                # Org storage summary
GET    /api/admin/storage/usage/clients        # Usage by client
GET    /api/admin/storage/usage/clients/:id    # Specific client
GET    /api/admin/storage/usage/companies/:id  # Specific company
```

### Request/Response Examples

#### Start Import

**Request:**
```json
POST /api/products/import
{
  "integrationId": "clx123...",
  "provider": "ROASTIFY",
  "products": [
    { "id": "ext-1", "name": "Ethiopian Yirgacheffe", "sku": "ETH-001", ... }
  ],
  "mappings": [
    { "sourceField": "name", "targetField": "name", "confidence": "high" },
    { "sourceField": "price", "targetField": "price", "transform": { "type": "convert_cents" } }
  ],
  "conflictResolution": "SKIP",
  "imageOption": "import"
}
```

**Response:**
```json
{
  "jobId": "clxjob123...",
  "message": "Import started. Processing 47 products in the background."
}
```

#### Job Status

**Response:**
```json
{
  "id": "clxjob123...",
  "status": "IN_PROGRESS",
  "phase": "DOWNLOADING_IMAGES",
  "progress": 65,
  "currentItem": "Downloading: ethiopian-yirgacheffe.jpg",
  "totalProducts": 47,
  "processedProducts": 47,
  "totalImages": 142,
  "processedImages": 92,
  "importedCount": 45,
  "skippedCount": 2,
  "errorCount": 0,
  "estimatedSecondsRemaining": 120
}
```

---

## Field Mapping System

### Auto-Mapping Strategy

1. **Known Provider Mappings** (High Confidence)
   - Pre-defined mappings for each provider (Roastify, Shopify, etc.)
   - Based on documented API schemas

2. **Semantic Matching** (Medium Confidence)
   - Fuzzy matching of field names
   - E.g., "productName" → "name", "retail_price" → "price"

3. **Unmapped Fields** (Low Confidence)
   - Fields that don't match anything
   - User can map to platform fields or save to metadata

### Roastify Field Mappings

| Roastify Field | Platform Field | Transform |
|----------------|----------------|-----------|
| `id` | `externalId` | Direct |
| `name` | `name` | Direct |
| `description` | `description` | Direct |
| `sku` | `sku` | Direct |
| `price` | `price` | Divide by 100 (cents→dollars) |
| `currency` | `currency` | Direct |
| `productType` | Category assignment | Enum mapping |
| `roastLevel` | `metadata.roastLevel` | Direct |
| `origin` | `metadata.origin` | Direct |
| `flavorNotes` | `metadata.flavorNotes` | Direct |
| `weight` | `weight` | Direct |
| `weightUnit` | `weightUnit` | Direct |
| `images` | ProductImage records | Extract URLs, download |
| `variants` | Future: ProductVariant | Complex mapping |
| `isActive` | `status` | Boolean → ACTIVE/INACTIVE |

### Transform Types

```typescript
type FieldTransform = {
  type: 'direct' | 'convert_cents' | 'map_enum' | 'split' | 'join' | 'custom';
  params?: Record<string, unknown>;
};
```

---

## Image Import & CDN

### Image Processing Pipeline

```
External URL → Download → Validate → Process → Upload → Track
     │             │          │         │         │        │
     │             │          │         │         │        └─ StorageUsage
     │             │          │         │         └─ S3 + CloudFront
     │             │          │         └─ Sharp (resize, convert to WebP)
     │             │          └─ Check type, size limit (10MB)
     │             └─ HTTP fetch with timeout (30s)
     └─ Roastify/Shopify image URL
```

### Thumbnail Sizes

| Size | Dimensions | Use Case |
|------|------------|----------|
| Small | 150x150 | Grid thumbnails |
| Medium | 400x400 | Card previews |
| Large | 800x800 | Product detail |
| Original | Preserved | Zoom/download |

### Image Options in Import

| Option | Description |
|--------|-------------|
| **Import to CDN** (default) | Download, optimize, store in org's S3/CloudFront |
| **Keep External URLs** | Reference original URLs (not recommended) |
| **Skip Images** | Import products without images |

---

## Storage Usage Tracking

### Tracking Hierarchy

```
Organization (owns S3 bucket)
    │
    ├── Client A
    │   ├── Company A1 → StorageUsage (month: 2025-01, totalBytes: 5GB)
    │   └── Company A2 → StorageUsage (month: 2025-01, totalBytes: 2GB)
    │
    └── Client B
        └── Company B1 → StorageUsage (month: 2025-01, totalBytes: 8GB)
```

### Usage Breakdown

- **totalBytes**: All files uploaded
- **thumbnailBytes**: Auto-generated thumbnails (separate tracking)
- **usageBySource**: Breakdown by `{ UPLOAD, ROASTIFY, SHOPIFY, ... }`

### Billing Implications

- Storage is charged at org level (single S3 bucket)
- Usage tracking allows per-client/company billing or quotas
- Monthly rollup for historical tracking

---

## Background Job Processing

### Bull Queue Configuration

```typescript
// Queue name
const PRODUCT_IMPORT_QUEUE = 'product-import';

// Job options
{
  attempts: 3,                    // Retry failed jobs 3 times
  backoff: {
    type: 'exponential',
    delay: 5000                   // 5s, 25s, 125s
  },
  removeOnComplete: 100,          // Keep last 100 completed
  removeOnFail: false             // Keep failed for debugging
}

// Processor options
{
  concurrency: 2                  // Max 2 concurrent imports
}
```

### Job Phases

| Phase | Description | Updates |
|-------|-------------|---------|
| QUEUED | Waiting in queue | Initial state |
| FETCHING | Fetching from source | If additional fetch needed |
| MAPPING | Applying field mappings | Progress per product |
| CREATING | Creating product records | Progress per product |
| DOWNLOADING_IMAGES | Downloading external images | Progress per image |
| UPLOADING_IMAGES | Uploading to S3 | Progress per image |
| GENERATING_THUMBNAILS | Creating thumbnails | Progress per image |
| FINALIZING | Updating references, cleanup | Near complete |
| DONE | Completed | Final state |

### Real-Time Progress

- **Primary**: Server-Sent Events (SSE) for connected clients
- **Fallback**: Polling every 2 seconds if SSE fails
- **Notification**: Email on completion for large imports (100+ products)

---

## Frontend Components

### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ImportProductsModal` | `components/products/import-products-modal.tsx` | Multi-step import wizard |
| `ProductSelectionStep` | `components/products/import-selection-step.tsx` | Select products to import |
| `FieldMappingStep` | `components/products/import-mapping-step.tsx` | Review/edit field mappings |
| `ImageOptionsStep` | `components/products/import-image-options-step.tsx` | Choose image handling |
| `ConflictResolutionStep` | `components/products/import-conflict-step.tsx` | Handle SKU conflicts |
| `ImportProgressModal` | `components/products/import-progress-modal.tsx` | Real-time progress display |
| `StorageUsageCard` | `components/storage/storage-usage-card.tsx` | Dashboard widget |

### Integration Card Update

Add "Import Products" button to FULFILLMENT category integrations:

```tsx
{integration.category === IntegrationCategory.FULFILLMENT &&
 integration.status === 'ACTIVE' && (
  <Button variant="outline" size="sm" onClick={() => onImportProducts?.(integration.id)}>
    <Download className="h-4 w-4 mr-2" />
    Import Products
  </Button>
)}
```

### Import Wizard Flow

```
Step 1: Loading         → "Fetching Your Products"
Step 2: Selection       → Select products (checkbox list)
Step 3: Field Mapping   → Review auto-mappings, adjust as needed
Step 4: Image Options   → Import to CDN / Keep external / Skip
Step 5: Conflicts       → Resolve any SKU conflicts
Step 6: Confirmation    → Review summary, start import
Step 7: Progress        → Real-time progress with phases
Step 8: Complete        → Success summary, "View Products" button
```

---

## UI Copy & Messaging

### Import Modal

| Step | Title | Subtitle |
|------|-------|----------|
| Loading | Fetching Your Products | Connecting to Roastify and loading your catalog... |
| Selection | Select Products to Import | Choose which products you'd like to add. We found {count} products. |
| Mapping | Review Field Mapping | We've mapped your Roastify fields to our product fields. Review and adjust. |
| Images | Product Images | Found {count} images. Estimated size: {size} |
| Conflicts | Resolve SKU Conflicts | Some products have SKUs that already exist. |
| Confirmation | Ready to Import | You're about to import {count} products from Roastify. |
| Progress | Importing Products... | {progress}% complete |
| Complete | Import Complete! | Successfully imported {count} products. |

### Phase Names

| Phase | Display Name |
|-------|--------------|
| QUEUED | Waiting in queue |
| FETCHING | Fetching from source |
| MAPPING | Mapping fields |
| CREATING | Creating products |
| DOWNLOADING_IMAGES | Downloading images |
| UPLOADING_IMAGES | Uploading to CDN |
| GENERATING_THUMBNAILS | Generating thumbnails |
| FINALIZING | Finalizing import |

### Error Messages

| Scenario | Message |
|----------|---------|
| Connection failed | Couldn't connect to Roastify. Please check your API key and try again. |
| No products | No products found. Your Roastify catalog appears to be empty. |
| Partial failure | Import completed with {count} errors. Check the import history for details. |
| Timeout | Import timed out. Please try again with fewer products. |
| Cancelled | Import cancelled. {imported} products were imported before cancellation. |

### Button Labels

| Action | Label |
|--------|-------|
| Start import | Import Products |
| Cancel import | Cancel Import |
| View results | View Products |
| Retry failed | Retry Import |
| Close modal | Close |

---

## Implementation Phases

### Phase 1: Core Infrastructure
**Scope:** Database schema, basic import service, job queue setup

**Tasks:**
1. Create Prisma migration for new models
2. Set up Bull queue with Redis
3. Create ProductImportService (basic CRUD, no images)
4. Create ProductImportController
5. Add import job tracking
6. Unit tests for import service

**Deliverables:**
- `ProductImportJob` model in database
- `product-import` Bull queue configured
- API endpoints for start/status/cancel
- Basic product creation from external data

---

### Phase 2: Field Mapping System
**Scope:** Intelligent mapping, transform logic, UI for mapping review

**Tasks:**
1. Create FieldMapperService with provider mappings
2. Implement semantic field matching
3. Create transform functions (cents→dollars, enum mapping, etc.)
4. Build FieldMappingStep component
5. Add mapping preview to import flow
6. Tests for field transformations

**Deliverables:**
- Auto-mapping for Roastify fields
- UI to review and adjust mappings
- Transform pipeline for data conversion

---

### Phase 3: Image Import & CDN
**Scope:** Download images, upload to S3, generate thumbnails, track storage

**Tasks:**
1. Create ProductImageImportService
2. Implement image download with validation
3. Integrate with existing S3StorageService
4. Add ProductImage model and relations
5. Create StorageUsage tracking
6. Build ImageOptionsStep component
7. Update import job phases for image processing
8. Tests for image processing

**Deliverables:**
- Images downloaded and stored in org's S3
- Thumbnails auto-generated
- Storage usage tracked by client/company

---

### Phase 4: Real-Time Progress
**Scope:** SSE streaming, progress modal, completion notifications

**Tasks:**
1. Create SSE controller for job events
2. Build ImportProgressModal component
3. Implement polling fallback
4. Add email notification for large imports
5. Handle cancellation in UI
6. Tests for progress streaming

**Deliverables:**
- Real-time progress in modal
- Phase-by-phase status updates
- Email notification on completion

---

### Phase 5: Conflict Resolution & Polish
**Scope:** SKU conflict handling, error recovery, UI polish

**Tasks:**
1. Implement conflict detection in import service
2. Create ConflictResolutionStep component
3. Add skip/update/rename resolution options
4. Build import history page
5. Add retry for failed imports
6. Mobile responsiveness for import modal
7. E2E tests for full import flow

**Deliverables:**
- SKU conflict resolution options
- Import history with error details
- Polished, responsive UI

---

### Phase 6: Storage Dashboard & Billing
**Scope:** Storage usage UI, quotas, billing integration

**Tasks:**
1. Create StorageUsageController
2. Build StorageUsageCard dashboard widget
3. Create storage usage detail page
4. Add usage breakdown by source
5. Implement storage quota warnings
6. Tests for usage tracking

**Deliverables:**
- Storage usage visible in admin dashboard
- Breakdown by client/company/source
- Quota warnings at 80%, 90%, 100%

---

## File Structure

### Backend (apps/api/src)

```
products/
├── controllers/
│   ├── product-import.controller.ts      # Import API endpoints
│   └── product-import-events.controller.ts # SSE streaming
├── services/
│   ├── product-import.service.ts         # Core import logic
│   ├── product-image-import.service.ts   # Image download/upload
│   └── field-mapper.service.ts           # Intelligent mapping
├── queues/
│   └── product-import.processor.ts       # Bull job processor
├── dto/
│   └── product-import.dto.ts             # Import DTOs
└── types/
    └── product-import.types.ts           # Import type definitions

storage/
├── controllers/
│   └── storage-usage.controller.ts       # Usage API endpoints
├── services/
│   └── storage-usage.service.ts          # Usage tracking
└── types/
    └── storage.types.ts                  # Storage type definitions
```

### Frontend (apps/admin-dashboard/src)

```
components/products/
├── import-products-modal.tsx             # Main import wizard
├── import-selection-step.tsx             # Product selection
├── import-mapping-step.tsx               # Field mapping review
├── import-image-options-step.tsx         # Image handling options
├── import-conflict-step.tsx              # SKU conflict resolution
└── import-progress-modal.tsx             # Progress display

components/storage/
└── storage-usage-card.tsx                # Dashboard widget

lib/api/
└── product-import.ts                     # Import API client

lib/constants/
└── product-fields.ts                     # Platform field definitions
```

---

## Testing Strategy

### Unit Tests

| Service | Test Cases |
|---------|------------|
| FieldMapperService | Roastify mapping, semantic matching, transforms |
| ProductImportService | Product creation, conflict detection, error handling |
| ProductImageImportService | Download, validation, upload, thumbnails |
| StorageUsageService | Usage tracking, monthly rollup, source breakdown |

### Integration Tests

| Flow | Test Cases |
|------|------------|
| Import API | Start job, get status, cancel job |
| SSE Streaming | Progress events, completion event |
| Image Pipeline | Download → Process → Upload → Track |

### E2E Tests

| Scenario | Description |
|----------|-------------|
| Happy path | Import 5 products with images, verify in catalog |
| Conflict resolution | Import with duplicate SKU, verify skip/update/rename |
| Large import | Import 50+ products, verify background processing |
| Cancellation | Start import, cancel, verify partial results |
| Error recovery | Simulate failures, verify retry behavior |

---

## Appendix: Provider-Specific Notes

### Roastify

- **API Base**: `https://api.roastify.app/v1`
- **Auth**: API key via `x-api-key` header
- **Rate Limit**: Check `x-ratelimit-remaining` header
- **Pagination**: Cursor-based, max 100 per page
- **Price Format**: Cents (divide by 100)
- **Product Types**: `coffee`, `merchandise`, `subscription`

### Future: Shopify

- **API**: REST Admin API or GraphQL
- **Auth**: OAuth or API key
- **Price Format**: Dollars (no conversion needed)
- **Variants**: Complex variant mapping required

---

*Document Version: 1.0*
*Last Updated: December 27, 2025*
*Status: Awaiting Approval*
