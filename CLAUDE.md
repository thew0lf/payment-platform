# Payment Platform - Claude Code Instructions

## Development Workflow

### Feature Documentation Rule
**IMPORTANT:** Before creating a git commit for any feature, ensure the feature is documented in this file. Update CLAUDE.md as the final step before committing.

### Git Workflow
1. Create feature branch: `git checkout -b feature/XX-feature-name`
2. Implement the feature
3. **Document in CLAUDE.md** (if applicable)
4. Commit with conventional format: `feat: description`
5. Create PR and merge

### Commit Message Format
```
feat: add new feature description
fix: resolve bug description
docs: update documentation
refactor: code improvement without behavior change
```

## Project Structure

```
payment-platform/
├── apps/
│   ├── api/                 # NestJS backend (port 3001)
│   └── admin-dashboard/     # Next.js 14 frontend (port 3000)
├── docs/roadmap/            # Development plans and specs
└── prisma/                  # Database schema (in apps/api)
```

## Development Commands

```bash
# Start API server
cd apps/api && npm run dev

# Start Dashboard
cd apps/admin-dashboard && npm run dev

# Database
cd apps/api && npx prisma migrate dev
cd apps/api && npx prisma db seed
```

## API Configuration

**IMPORTANT: All API routes require the `/api` prefix.**

The NestJS API uses a global prefix. When creating frontend API calls:

| Backend Controller | Frontend API Call |
|-------------------|-------------------|
| `@Controller('auth')` | `/api/auth/...` |
| `@Controller('admin/integrations')` | `/api/admin/integrations/...` |
| `@Controller('integrations')` | `/api/integrations/...` |
| `@Controller('dashboard')` | `/api/dashboard/...` |

### Environment Variables

```bash
# Frontend (apps/admin-dashboard/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend (apps/api/.env.local)
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret"
```

## Authentication

- JWT-based authentication
- Token stored in localStorage: `avnz_token`
- Header format: `Authorization: Bearer <token>`

## Key Patterns

### Frontend API Client
API clients are in `apps/admin-dashboard/src/lib/api/`. Each module exports typed functions that call the backend.

### Backend Module Structure
```
apps/api/src/<module>/
├── <module>.module.ts       # NestJS module
├── <module>.controller.ts   # Route handlers
├── services/                # Business logic
└── types/                   # TypeScript types
```

## Responsive Design Requirements

The application must be responsive across all device sizes:

| Breakpoint | Width | Target Devices |
|------------|-------|----------------|
| Mobile | < 640px (sm) | Phones |
| Tablet | 640px - 1024px (md/lg) | Tablets, small laptops |
| Desktop | > 1024px (xl) | Laptops, monitors |
| Large | > 1280px (2xl) | Presentations, large displays |

### Mobile Navigation Pattern
- **Sidebar**: Hidden on mobile (`hidden md:block`), uses drawer component
- **Mobile Menu**: Context-based (`MobileMenuProvider` in layout)
- **Hamburger**: Visible only on mobile (`md:hidden`)
- **Header**: Uses `useMobileMenu()` hook to trigger drawer

### Responsive Guidelines
1. **Touch targets**: Minimum 44px for interactive elements on mobile
2. **Padding**: Use `px-4 md:px-6` pattern for consistent spacing
3. **Typography**: Scale down headings on mobile (`text-xl md:text-2xl`)
4. **Grids**: Use responsive columns (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
5. **Actions**: Stack buttons on mobile (`flex-col sm:flex-row`)

### Key Layout Components
- `apps/admin-dashboard/src/components/layout/sidebar.tsx` - Desktop sidebar
- `apps/admin-dashboard/src/components/layout/mobile-sidebar.tsx` - Mobile drawer
- `apps/admin-dashboard/src/components/layout/header.tsx` - Responsive header
- `apps/admin-dashboard/src/contexts/mobile-menu-context.tsx` - Mobile menu state

## Integration Icons

Integration provider icons are stored in `apps/admin-dashboard/public/integrations/` as SVG files with brand colors. The `providerConfig` mapping in integration components provides:
- `iconUrl`: Path to SVG icon
- `bgColor`: Tailwind background class
- `gradient`: Gradient classes for fallback

## Entity Codes (Client & Company)

Clients and Companies have 4-character alphanumeric codes used in order/shipment numbers.

| Entity | Code Format | Uniqueness | Example |
|--------|-------------|------------|---------|
| Client | 4 uppercase alphanumeric | Globally unique | `VELO` |
| Company | 4 uppercase alphanumeric | Globally unique | `COFF` |

**Key files:**
- `apps/api/src/common/services/code-generator.service.ts` - Auto-generates codes
- `apps/api/prisma/seeds/seed-entity-codes.ts` - Backfill script

**Code generation rules:**
1. Extract first 4 chars from name (uppercase, alphanumeric only)
2. If collision, try `XX01`, `XX02`, ... `XX99`
3. Fallback to random 4-char code
4. Reserved codes blocked: `TEST`, `DEMO`, `NULL`, etc.

## Order & Shipment Numbers

Order numbers are designed for phone/AI readability with global uniqueness.

### Format

| Context | Format | Example |
|---------|--------|---------|
| Database (internal) | `CLNT-COMP-X-NNNNNNNNN` | `VELO-COFF-A-000000003` |
| API/URLs (compact) | `X-NNNNNNNNN` | `A-000000003` |
| Customer display | `X-NNN-NNN-NNN` | `A-000-000-003` |

### Design Decisions
- **Global sequence**: Order numbers are unique across ALL companies
- **Numbers only** (after prefix): Phone/AI friendly, no letter confusion
- **Prefix letter rollover**: A→C→E→F... when hitting 1 billion orders
- **Capacity**: 20 billion total (20 letters × 1B each)
- **Internal prefix**: `VELO-COFF-` enables routing/filtering by company

### Helper Methods (`OrderNumberService`)
```typescript
getCustomerNumber(orderNumber)  // VELO-COFF-A-000000003 → A-000000003
formatForDisplay(orderNumber)   // VELO-COFF-A-000000003 → A-000-000-003
parseForSearch(input)           // Accepts any format for lookup
validateOrderNumber(number)     // Validates format
```

### Shipment Numbers
Same pattern with `S` prefix: `VELO-COFF-SA-000000001` → `SA-000-000-001`

**Key file:** `apps/api/src/orders/services/order-number.service.ts`

## Orders, Products & Fulfillment

### Module Structure
```
apps/api/src/
├── orders/           # Order management
├── products/         # Product catalog
└── fulfillment/      # Shipments & tracking
```

### Orders Module
- **Controller**: `orders.controller.ts` - CRUD operations
- **Service**: `orders.service.ts` - Business logic
- **Order Number**: Auto-generated (see Order Numbers section above)

### Products Module
- **Controller**: `products.controller.ts` - Product CRUD
- **Fields**: SKU, name, category, price, roastLevel, origin, flavorNotes, stockQuantity
- **Sub-controllers**: `CategoryController`, `TagController`, `CollectionController`

### Product Catalog Organization
```
apps/api/src/products/
├── products.controller.ts       # Main product CRUD
├── controllers/
│   ├── category.controller.ts   # /api/products/categories
│   ├── tag.controller.ts        # /api/products/tags
│   └── collection.controller.ts # /api/products/collections
└── services/
    ├── products.service.ts
    ├── category.service.ts
    ├── tag.service.ts
    └── collection.service.ts
```

**Route Ordering Note:** In `products.module.ts`, specific controllers (Category, Tag, Collection) must be registered BEFORE ProductsController to prevent the `:id` param from catching routes like `/products/tags`.

| Entity | Purpose | Key Features |
|--------|---------|--------------|
| Category | Hierarchical product organization | Parent/child tree structure, `level`, `path` |
| Tag | Flexible product labeling | Color-coded, many-to-many with products |
| Collection | Product groupings | Manual or automatic (rule-based) |

### Fulfillment Module
- **Shipments**: Track shipments with carrier, tracking number, status
- **Statuses**: `PENDING`, `PROCESSING`, `SHIPPED`, `IN_TRANSIT`, `DELIVERED`, `RETURNED`

### Multi-Tenant Access Control
All modules use `CompanyAuthGuard` to ensure:
- Users only see data for their company/client scope
- `companyId` is automatically injected from JWT token
- Cross-company access is blocked

### Company Selection for Org/Client Users

Organization and Client scope users can manage multiple companies. The pattern for handling this:

**Backend Pattern:**
```typescript
// In controllers, use getCompanyIdForQuery() for read/write operations
@Get(':id')
async findById(
  @Param('id') id: string,
  @Query('companyId') queryCompanyId: string,  // Accept from query
  @CurrentUser() user: AuthenticatedUser,
): Promise<Product> {
  const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
  return this.service.findById(id, companyId);
}
```

**Frontend Pattern:**
```typescript
// Use useHierarchy() context to get selected company
const { accessLevel, selectedCompanyId } = useHierarchy();

// Check if company selection is needed
const needsCompanySelection =
  (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

// Pass companyId to API calls
await productsApi.update(id, data, selectedCompanyId || undefined);
```

**UI Pattern:** Show "Select a Company" message when `needsCompanySelection` is true, with disabled action buttons.

## Integrations System

### Platform Integrations
Third-party service connections managed per-company.

**Key files:**
- `apps/api/src/integrations/` - Backend module
- `apps/admin-dashboard/src/app/(dashboard)/integrations/` - Frontend pages

### Integration Types
| Category | Providers |
|----------|-----------|
| Payment | Stripe, PayPal, Square |
| Shipping | ShipStation, EasyPost, ShipEngine |
| Accounting | QuickBooks, Xero |
| Identity | Auth0, Okta |
| AI & ML | AWS Bedrock, OpenAI, LanguageTool |
| Storage | AWS S3 |
| Image Processing | Cloudinary |

### Product Integration Services
Services for AI-powered product management:

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| `BedrockService` | AI content generation | `generateProductDescription()`, `generateAltText()`, `suggestCategorization()` |
| `S3StorageService` | Image storage & CDN | `uploadFile()`, `generateThumbnails()`, `getSignedDownloadUrl()` |
| `LanguageToolService` | Grammar checking | `checkGrammar()`, `checkAndCorrect()`, `checkMultipleFields()` |
| `CloudinaryService` | Image processing (no storage) | `removeBackground()`, `smartCrop()`, `enhance()`, `upscale()` |

**Architecture Note:** Cloudinary uses "fetch" mode to process S3 URLs on-demand. S3 is the ONLY storage layer.

**Key files:** `apps/api/src/integrations/services/providers/`

### Adding New Integrations
1. Add provider to `IntegrationProvider` enum in Prisma schema
2. Add definition in `integration-definitions.ts`
3. Create service in `services/providers/`
4. Add icon to `public/integrations/`

## Merchant Accounts

### Overview
Bank account configurations for payment processing, tied to companies.

**Key files:**
- `apps/api/src/merchant-accounts/` - Backend module
- `apps/admin-dashboard/src/app/(dashboard)/settings/merchant-accounts/` - Frontend

### Fields
- `accountName`, `bankName`, `accountType`
- `routingNumber`, `accountNumberLast4` (masked)
- `status`: `PENDING`, `VERIFIED`, `ACTIVE`, `SUSPENDED`

## Dashboard & Analytics

### Transaction Chart
- **Endpoint**: `GET /api/dashboard/stats/chart?days=30`
- **Data**: Daily transaction counts and amounts
- **Component**: `apps/admin-dashboard/src/components/dashboard/transaction-chart.tsx`

### Stats Overview
- **Endpoint**: `GET /api/dashboard/stats`
- **Metrics**: Total transactions, revenue, active customers, pending orders

## Auth0 SSO Integration

### Configuration
```bash
# apps/api/.env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=xxx
AUTH0_CLIENT_SECRET=xxx
AUTH0_AUDIENCE=https://your-api
```

### Flow
1. Frontend redirects to Auth0 login
2. Auth0 returns JWT token
3. Backend validates token via JWKS
4. User is created/matched in local database

**Key files:**
- `apps/api/src/auth/strategies/auth0.strategy.ts`
- `apps/admin-dashboard/src/lib/auth0.ts`

## Settings Navigation

### Submenu Structure
Settings page uses a sidebar submenu pattern:
```
/settings
├── /profile          # User profile
├── /security         # Password, 2FA
├── /merchant-accounts # Bank accounts
├── /integrations     # Third-party connections
└── /notifications    # Preferences
```

**Component**: `apps/admin-dashboard/src/app/(dashboard)/settings/layout.tsx`
