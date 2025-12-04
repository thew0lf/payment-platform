# Payment Platform - Claude Code Instructions

## Review Commands

### `/review` - Senior Developer Review
Comprehensive code/architecture review. Use: `/review [description or file path]`

**Checklist:**
1. Code Analysis - Correctness, edge cases, bugs, error handling
2. Architecture - Right approach? Better patterns? Scalability?
3. Opinion/Critique - What doesn't look right
4. Suggestions - Improvements, better UX
5. Trade-offs - Pros/cons vs alternatives
6. Security - Vulnerabilities, input validation, auth gaps
7. Performance - N+1 queries, re-renders, caching
8. Maintainability - Code clarity, naming, future dev experience
9. Testing Gaps - What needs tests? Edge cases?
10. Technical Debt - Shortcuts, things to revisit
11. Dependencies - Impact on other systems
12. Standards - Follows project conventions?

**Verdict:** Approve | Approve with suggestions | Request changes

### `/feature` - Feature File Review
Senior developer review of a product ticket before implementation. Use: `/feature [ticket description]`

**Checklist:**
1. Requirements Clarification - Is the ask clear?
2. Technical Feasibility - Can we build this?
3. Scope Assessment - Right size? Break down?
4. Architecture Impact - How does this fit?
5. Dependencies - Systems/teams affected
6. Effort Estimate - S/M/L/XL complexity
7. Questions for Product - Gaps, edge cases
8. Technical Approach - High-level plan
9. Security Considerations - Auth, data access
10. Performance Implications - Scale, caching
11. Risks/Concerns - Blockers, challenges
12. Acceptance Criteria - Testable and complete?

**Verdict:** Ready to build | Needs clarification | Needs breakdown

---

## Project Structure

```
payment-platform/
├── apps/
│   ├── api/                 # NestJS backend (port 3001)
│   └── admin-dashboard/     # Next.js 14 frontend (port 3000)
├── packages/
│   └── shared/              # Shared types and utilities
├── docs/roadmap/            # Development plans and specs
└── prisma/                  # Database schema (in apps/api)
```

---

## Current Status (November 30, 2025)

| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| Feature 01: Integrations Framework | ✅ Complete | ✅ Complete | UI-configurable credentials |
| Feature 02: Dynamic RBAC | ✅ Spec Complete | 🔲 Pending | Hierarchical permissions |
| Feature 03: Vendor System | ✅ Spec Complete | 🔲 Pending | Two-tier Vendor/VendorCompany |
| Auth & Auth0 SSO | ✅ Complete | ✅ Complete | JWT-based |
| Multi-Account Providers | 🔲 Pending | 🔲 Pending | Phase 2 |
| Gateway Rule Engine | 🔲 Pending | 🔲 Pending | Phase 3 |

---

## Platform Hierarchy

```
ORGANIZATION (avnz.io platform)
│
├── CLIENTS (code: ACME)                  ├── VENDORS (code: ACFL)
│   ├── Roles                             │   ├── Roles
│   ├── Departments                       │   ├── Departments
│   ├── Teams                             │   ├── Teams
│   ├── Users                             │   ├── Users
│   │                                     │   │
│   └── COMPANIES (code: BREW)            │   └── VENDOR COMPANIES (code: ACOF)
│       ├── Roles                         │       ├── Roles
│       ├── Departments                   │       ├── Departments
│       ├── Teams                         │       ├── Teams
│       ├── Users                         │       ├── Users
│       └── Orders                        │       ├── Locations
│                                         │       ├── Services
│                                         │       ├── Products
│                                         │       └── Inventory
│
└── MARKETPLACE
    └── Connections (Company ↔ VendorCompany)
```

---

## Entity Codes

All entities use 4-character alphanumeric codes that are **globally unique** across the platform.

| Entity | Format | Example | Description |
|--------|--------|---------|-------------|
| Client | 4-char alphanumeric | `ACME` | Agency |
| Company | 4-char alphanumeric | `BREW` | Client's customer |
| Vendor | 4-char alphanumeric | `ACFL` | Service provider org |
| VendorCompany | 4-char alphanumeric | `ACOF` | Vendor business unit |

**Key files:**
- `apps/api/src/common/services/code-generator.service.ts`
- `apps/api/prisma/seeds/seed-entity-codes.ts`

**Code generation rules:**
1. Extract first 4 chars from name (uppercase, alphanumeric only)
2. If collision, try `XX01`, `XX02`, ... `XX99`
3. Fallback to random 4-char code
4. Reserved codes blocked: `TEST`, `DEMO`, `NULL`, etc.

---

## Feature 01: Integrations Framework (Complete)

All service credentials are UI-configurable, not hardcoded in `.env` files.

### Architecture

| Level | Services | Examples |
|-------|----------|----------|
| **Organization** | Platform services (org-only) | Auth0, AWS SES/SNS/Bedrock, Datadog, Sentry |
| **Client** | Client-configurable | Payment Gateways (own or platform) |

### Integration Categories

```typescript
enum IntegrationCategory {
  PAYMENT_GATEWAY      // PayPal, Stripe, NMI, Authorize.Net
  AUTHENTICATION       // Auth0, Okta, Cognito
  COMMUNICATION        // Twilio, SendGrid
  EMAIL_TRANSACTIONAL  // AWS SES
  SMS                  // AWS SNS, Twilio
  AI_ML                // AWS Bedrock, OpenAI, LanguageTool
  STORAGE              // AWS S3
  IMAGE_PROCESSING     // Cloudinary
  VIDEO_GENERATION     // Runway
  ANALYTICS            // Datadog, Sentry
  OAUTH                // Google, Microsoft, Slack, HubSpot, Salesforce, QuickBooks
}
```

### Integration Providers

```typescript
enum IntegrationProvider {
  // Payment Gateways
  PAYPAL_PAYFLOW, PAYPAL_REST, NMI, AUTHORIZE_NET, STRIPE,
  // Authentication
  AUTH0, OKTA, COGNITO,
  // Communication
  TWILIO, SENDGRID, AWS_SES, AWS_SNS, KLAVIYO,
  // AI
  AWS_BEDROCK, OPENAI, LANGUAGETOOL,
  // Storage & Media
  AWS_S3, CLOUDINARY, RUNWAY,
  // Monitoring
  DATADOG, SENTRY, CLOUDWATCH,
  // Feature Flags
  LAUNCHDARKLY, AWS_APPCONFIG,
  // OAuth
  GOOGLE, MICROSOFT, SLACK, HUBSPOT, SALESFORCE, QUICKBOOKS,
}
```

### Key Models

```prisma
model PlatformIntegration {
  // Organization-level integrations
  provider            IntegrationProvider
  category            IntegrationCategory
  credentials         Json      // Encrypted AES-256-GCM
  environment         String    // 'SANDBOX' | 'PRODUCTION'
  isSharedWithClients Boolean
  clientPricing       Json?     // { type, percentageFee, flatFee }
  status              IntegrationStatus
}

model ClientIntegration {
  // Client-level integrations
  provider            IntegrationProvider
  mode                IntegrationMode  // 'OWN' | 'PLATFORM'
  credentials         Json?            // Encrypted (null if using platform)
  platformIntegrationId String?
  isDefault           Boolean
  priority            Int
}
```

### API Endpoints

```
# Platform Integrations (Org Admin)
GET    /api/admin/integrations/definitions
GET    /api/admin/integrations/platform
POST   /api/admin/integrations/platform
PATCH  /api/admin/integrations/platform/:id
POST   /api/admin/integrations/platform/:id/test
DELETE /api/admin/integrations/platform/:id

# Client Integrations
GET    /api/integrations/available
GET    /api/integrations
POST   /api/integrations
PATCH  /api/integrations/:id
POST   /api/integrations/:id/test
DELETE /api/integrations/:id
```

### Dashboard Pages

| Page | Purpose | Components |
|------|---------|------------|
| `/integrations` | Platform integrations (org admin) | IntegrationCard, AddIntegrationModal, ConfigureSharingModal |
| `/settings/integrations` | Client integrations | IntegrationCard, AddIntegrationModal |

### Key Frontend Files

```
apps/admin-dashboard/src/
├── app/(dashboard)/integrations/page.tsx          # Platform integrations
├── app/(dashboard)/settings/integrations/page.tsx # Client integrations
├── components/integrations/
│   ├── index.ts
│   ├── integration-card.tsx
│   ├── integration-status-badge.tsx
│   ├── add-integration-modal.tsx         # Multi-step: select → configure → credentials
│   └── configure-sharing-modal.tsx
└── lib/api/integrations.ts                # API client with types
```

### Key Backend Files

```
apps/api/src/integrations/
├── integrations.module.ts
├── controllers/
│   ├── platform-integration.controller.ts
│   └── client-integration.controller.ts
├── services/
│   ├── platform-integration.service.ts
│   ├── client-integration.service.ts
│   ├── encryption.service.ts             # AES-256-GCM
│   └── integration-definitions.ts        # Provider definitions
└── types/
    └── integration.types.ts
```

### Provider Icon Configuration

Icons stored in `apps/admin-dashboard/public/integrations/` as SVG files.

```typescript
// In add-integration-modal.tsx
const providerConfig: Record<IntegrationProvider, { iconUrl, bgColor, gradient }> = {
  [IntegrationProvider.PAYPAL_PAYFLOW]: {
    iconUrl: '/integrations/paypal.svg',
    bgColor: 'bg-[#003087]',
    gradient: 'from-[#003087] to-[#009cde]',
  },
  [IntegrationProvider.STRIPE]: {
    iconUrl: '/integrations/stripe.svg',
    bgColor: 'bg-[#635BFF]',
    gradient: 'from-[#635BFF] to-[#8B85FF]',
  },
  // ... etc
};
```

---

## Feature 02: Dynamic RBAC System (Spec Complete)

Hierarchical permission system with custom roles at each level.

### Permission Inheritance Model

```
Organization (defines permission superset)
    ↓ PermissionGrant (ceiling)
Client (receives constrained permissions)
    ↓ PermissionGrant (ceiling)
Company (receives further constrained permissions)
```

**Core Principle:** No entity can grant permissions it doesn't have.

### Key Models

```prisma
model Permission {
  code        String    @unique  // 'transactions:read'
  category    String              // 'transactions'
  isSystemOnly Boolean            // Org-only permissions
}

model Role {
  // Scope - exactly one set
  organizationId  String?
  clientId        String?
  companyId       String?
  vendorId        String?         // Feature 03
  vendorCompanyId String?         // Feature 03
  
  isSystem    Boolean   // Cannot delete
  isDefault   Boolean   // Auto-assign new users
  permissions RolePermission[]
}

model UserRole {
  userId      String
  roleId      String
  expiresAt   DateTime?  // Time-limited access
  assignedBy  String
}
```

### Permission Categories (33 permissions)

| Category | Permissions |
|----------|-------------|
| transactions | read, export, void, refund |
| customers | read, write, delete, export |
| billing | read, manage |
| merchant_accounts | read, write, test |
| routing | read, write, deploy |
| users | read, invite, manage, delete |
| roles | read, manage |
| integrations | read, manage |
| save_flow | read, configure |
| churn | read, configure |
| audit | read, export |
| system | clients, billing, config (org-only) |

### User Status Flow

```
PENDING_VERIFICATION → (verify email) → ACTIVE
                                      → SUSPENDED → ACTIVE
                                      → DEACTIVATED
```

### Soft Delete Pattern

All RBAC entities use: `deletedAt`, `deletedBy`, `cascadeId`

**Key files:**
- Spec: `Feature_02_Dynamic_RBAC_System.docx`
- Implementation: `Feature_02_Dynamic_RBAC_Implementation.md`

---

## Feature 03: Vendor System (Spec Complete)

Two-tier Vendor/VendorCompany structure mirroring Client/Company.

### Use Cases

- Fulfillment providers (3PL)
- Dropship suppliers
- Print-on-demand services
- Warehousing

### Vendor Business Types

```prisma
enum VendorBusinessType {
  FULFILLMENT, DROPSHIP, PRINT_ON_DEMAND, WAREHOUSING,
  MANUFACTURING, DIGITAL_SERVICES, CONSULTING, HYBRID
}
```

### Key Models (17 new)

| Category | Models |
|----------|--------|
| Core | Vendor, VendorCompany |
| Organization | VendorDepartment, VendorTeam, VendorCompanyDepartment, VendorCompanyTeam |
| Users | VendorUser, VendorCompanyUser, VendorTeamMember, VendorCompanyTeamMember |
| Operations | VendorLocation, VendorService, VendorProduct, VendorInventory |
| Connections | VendorClientConnection |
| Marketplace | MarketplaceListing, MarketplaceReview |

### Vendor Permissions (40+)

```
vendor_orders, vendor_inventory, vendor_shipping, vendor_locations,
vendor_services, vendor_products, vendor_clients, vendor_billing,
vendor_users, vendor_roles, vendor_marketplace, vendor_settings
```

**Key files:**
- Spec: `Feature_03_Vendor_System.docx`
- Implementation: `Feature_03_Vendor_System_Implementation.md`

---

## Development Commands

### Docker Commands (Primary Development Method)

**Project Name:** `avnz-payment-platform`

**IMPORTANT:** Always use `-p avnz-payment-platform` flag with docker-compose commands to ensure correct project naming.

```bash
# Start all services
docker-compose -p avnz-payment-platform up -d

# Stop all services
docker-compose -p avnz-payment-platform down

# Restart all services
docker-compose -p avnz-payment-platform down && docker-compose -p avnz-payment-platform up -d

# View logs
docker logs avnz-payment-api            # API logs
docker logs avnz-payment-admin          # Admin dashboard logs
docker logs avnz-payment-portal         # Company portal logs
docker logs avnz-payment-postgres       # PostgreSQL logs
docker logs avnz-payment-redis          # Redis logs

# Follow logs in real-time
docker logs -f avnz-payment-api

# Check container status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Restart a single service
docker-compose -p avnz-payment-platform restart api
docker-compose -p avnz-payment-platform restart admin-dashboard

# Rebuild a service (after Dockerfile changes)
docker-compose -p avnz-payment-platform build api --no-cache
docker-compose -p avnz-payment-platform up -d api

# Reset API node_modules (if dependency issues)
docker rm -f avnz-payment-api
docker volume rm avnz-payment-platform_api_node_modules
docker-compose -p avnz-payment-platform up -d api

# Start with dev tools (pgAdmin, Redis Commander, Prisma Studio)
docker-compose -p avnz-payment-platform --profile tools up -d
```

### Container Names

| Service | Container Name | Port |
|---------|---------------|------|
| API | `avnz-payment-api` | 3001 |
| Admin Dashboard | `avnz-payment-admin` | 3000 |
| Company Portal | `avnz-payment-portal` | 3003 |
| PostgreSQL | `avnz-payment-postgres` | 5432 |
| Redis | `avnz-payment-redis` | 6379 |
| pgAdmin | `avnz-payment-pgadmin` | 5050 |
| Redis Commander | `avnz-payment-redis-commander` | 8081 |
| Prisma Studio | `avnz-payment-prisma-studio` | 5555 |

### Local Development (Alternative)

```bash
# Start servers locally (without Docker)
cd apps/api && npm run dev              # API on :3001
cd apps/admin-dashboard && npm run dev  # Dashboard on :3000
```

### Database Commands

```bash
# Run inside Docker
docker exec -it avnz-payment-api npx prisma migrate dev --name description
docker exec -it avnz-payment-api npx prisma generate
docker exec -it avnz-payment-api npx prisma db seed

# Or locally
cd apps/api && npx prisma migrate dev --name description
cd apps/api && npx prisma generate
cd apps/api && npx prisma db seed
```

---

## API Configuration

**CRITICAL: All API routes require the `/api` prefix.**

| Backend Controller | Frontend API Call |
|-------------------|-------------------|
| `@Controller('auth')` | `/api/auth/...` |
| `@Controller('admin/integrations')` | `/api/admin/integrations/...` |
| `@Controller('integrations')` | `/api/integrations/...` |
| `@Controller('vendors')` | `/api/vendors/...` |

### Environment Variables

```bash
# Frontend (apps/admin-dashboard/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend (apps/api/.env)
DATABASE_URL=postgresql://postgres:password@localhost:5432/payment_platform
REDIS_URL=redis://localhost:6379
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=xxx
AUTH0_CLIENT_SECRET=xxx
JWT_SECRET=your_jwt_secret

# Credential Encryption (REQUIRED - see Credential Encryption section below)
INTEGRATION_ENCRYPTION_KEY=<64-char-hex-key>  # Local dev
# OR
ENCRYPTION_KEY_SECRET_NAME=payment-platform/encryption-key  # Production (AWS Secrets Manager)
```

### Credential Encryption

Integration credentials (API keys, secrets, PII) are encrypted using AES-256-GCM before storage.

**CRITICAL: Set Encryption Key BEFORE Adding Integrations**

The server will **fail to start** without a valid encryption key. This prevents accidental storage of credentials without proper encryption.

**Key Loading Priority:**
1. **AWS Secrets Manager** (production) - Set `ENCRYPTION_KEY_SECRET_NAME`
2. **Environment Variable** (local dev) - Set `INTEGRATION_ENCRYPTION_KEY`

**Note:** The server will **fail to start** if no encryption key is configured. There is no fallback.

**First-Time Setup (REQUIRED before adding integrations):**
```bash
# 1. Generate a key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Add to apps/api/.env (local development)
INTEGRATION_ENCRYPTION_KEY=<paste-64-char-hex-key-here>

# 3. Restart the server - verify you see this log message:
# "Encryption key loaded from environment variable"
```

**AWS Secrets Manager Setup (Production):**
```bash
# Create the secret in AWS
aws secretsmanager create-secret \
  --name payment-platform/encryption-key \
  --secret-string '{"INTEGRATION_ENCRYPTION_KEY":"<your-64-char-hex-key>"}'

# Set in .env or container config
ENCRYPTION_KEY_SECRET_NAME=payment-platform/encryption-key
AWS_REGION=us-east-1
```

**IMPORTANT:**
- Never commit encryption keys to git
- Changing the key invalidates all existing encrypted credentials
- Back up the key securely - losing it means re-entering all integration credentials

**Key file:** `apps/api/src/integrations/services/credential-encryption.service.ts`

---

## Authentication

- **Method:** JWT-based with Auth0 SSO
- **Token Storage:** localStorage (`avnz_token`)
- **Header:** `Authorization: Bearer <token>`

**Key files:**
- `apps/api/src/auth/strategies/auth0.strategy.ts`
- `apps/admin-dashboard/src/lib/auth0.ts`
- `apps/admin-dashboard/src/contexts/auth-context.tsx`

---

## Order & Shipment Numbers

Phone/AI-readable format with global uniqueness.

| Context | Format | Example |
|---------|--------|---------|
| Internal | `CLNT-COMP-X-NNNNNNNNN` | `VELO-COFF-A-000000003` |
| API/URLs | `X-NNNNNNNNN` | `A-000000003` |
| Customer | `X-NNN-NNN-NNN` | `A-000-000-003` |

**Capacity:** 20 billion (20 prefix letters × 1B each)

**Key file:** `apps/api/src/orders/services/order-number.service.ts`

---

## Multi-Tenant Access Control

### Backend Pattern

```typescript
@Get(':id')
async findById(
  @Param('id') id: string,
  @Query('companyId') queryCompanyId: string,
  @CurrentUser() user: AuthenticatedUser,
): Promise<Product> {
  const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
  return this.service.findById(id, companyId);
}
```

### Frontend Pattern

```typescript
const { accessLevel, selectedCompanyId } = useHierarchy();

const needsCompanySelection =
  (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

await productsApi.update(id, data, selectedCompanyId || undefined);
```

---

## Responsive Design

| Breakpoint | Width | Target |
|------------|-------|--------|
| Mobile | < 640px | Phones |
| Tablet | 640px - 1024px | Tablets |
| Desktop | > 1024px | Laptops |
| Large | > 1280px | Monitors |

### Key Patterns

- **Touch targets:** Min 44px
- **Padding:** `px-4 md:px-6`
- **Typography:** `text-xl md:text-2xl`
- **Grids:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- **Mobile nav:** `MobileMenuProvider` in layout, `useMobileMenu()` hook

**Key files:**
- `apps/admin-dashboard/src/components/layout/sidebar.tsx`
- `apps/admin-dashboard/src/components/layout/mobile-sidebar.tsx`
- `apps/admin-dashboard/src/contexts/mobile-menu-context.tsx`

---

## Toast Notifications & Dialogs

### Convention
**NEVER use native browser dialogs.** Always use the project's toast system and custom modals.

| ❌ Don't Use | ✅ Use Instead |
|--------------|----------------|
| `alert('message')` | `toast.error('message')` or `toast.info('message')` |
| `confirm('Are you sure?')` | Custom confirmation modal with state |
| `window.alert()` | `toast()` from sonner |

### Toast Library
The project uses **sonner** for toast notifications.

```typescript
import { toast } from 'sonner';

// Success messages
toast.success('Item created successfully!');

// Error messages
toast.error('Failed to save. Please try again.');

// Info/warning messages
toast.info('Changes will take effect after refresh.');
toast.warning('This action cannot be undone.');

// With description
toast.success('Funnel published', {
  description: 'Your funnel is now live and accepting traffic.',
});
```

### Confirmation Dialogs Pattern
Replace `confirm()` with custom modal state:

```typescript
// State for delete confirmation
const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

// Trigger confirmation
const handleDelete = (item: Item) => {
  setItemToDelete(item);
};

// Confirm action
const confirmDelete = async () => {
  if (!itemToDelete) return;
  try {
    await api.delete(itemToDelete.id);
    toast.success(`"${itemToDelete.name}" deleted`);
  } catch (error) {
    toast.error('Failed to delete. Please try again.');
  } finally {
    setItemToDelete(null);
  }
};

// Modal JSX (using createPortal for proper z-index)
{itemToDelete && createPortal(
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md">
      <h3>Delete "{itemToDelete.name}"?</h3>
      <p>This action cannot be undone.</p>
      <div className="flex gap-3 mt-4">
        <button onClick={() => setItemToDelete(null)}>Cancel</button>
        <button onClick={confirmDelete} className="bg-red-600">Delete</button>
      </div>
    </div>
  </div>,
  document.body
)}
```

### Form Validation with Toast
Show validation errors via toast when form submission fails:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Validate
  const nameError = validateName(name);
  if (nameError) {
    toast.error(nameError);
    return;
  }

  // Submit
  try {
    await api.create(data);
    toast.success('Created successfully!');
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to create');
  }
};
```

### Key Files
- `apps/admin-dashboard/src/app/layout.tsx` - Toaster component configured
- Toast import: `import { toast } from 'sonner';`

---

## Backend Module Structure

```
apps/api/src/<module>/
├── <module>.module.ts       # NestJS module
├── <module>.controller.ts   # Route handlers
├── controllers/             # Additional controllers
├── services/                # Business logic
├── dto/                     # Data transfer objects
├── guards/                  # Auth guards
└── types/                   # TypeScript types
```

---

## Soft Delete & Deleted Items

### Overview
All major entities support soft delete with cascade tracking and a dedicated UI for viewing/restoring deleted items.

### Soft Delete Fields
```prisma
deletedAt    DateTime?  // When deleted
deletedBy    String?    // User who deleted
cascadeId    String?    // Groups related deletes together
```

### Deleted Items Page
- **Route:** `/deleted`
- **Features:** View soft-deleted items by type, restore, permanent delete
- **Filters:** Entity type, date range, deleted by

### Key Files
- `apps/api/src/soft-delete/` - Backend soft delete module
- `apps/admin-dashboard/src/app/(dashboard)/deleted/` - Deleted items UI

---

## Team Management (Users Module)

### Overview
User management within organizational hierarchy with card/table views.

### Features
- Card view (default) and Table view with toggle
- Search across name and email
- Filter by role and status
- Invite new users (creates with pending status)
- Role assignment inline + modal
- Status management (activate, deactivate, suspend)

### API Endpoints
```
GET    /api/admin/users          # List users with filters
GET    /api/admin/users/stats    # User statistics
GET    /api/admin/users/:id      # Get user by ID
POST   /api/admin/users/invite   # Invite new user
PATCH  /api/admin/users/:id      # Update user
PATCH  /api/admin/users/:id/status  # Update status
POST   /api/admin/users/:id/roles   # Assign RBAC role
DELETE /api/admin/users/:id/roles/:roleId  # Remove role
```

### Key Files
- `apps/api/src/users/` - Backend users module
- `apps/admin-dashboard/src/app/(dashboard)/settings/team/` - Team page
- `apps/admin-dashboard/src/components/team/` - Team components
- `apps/admin-dashboard/src/lib/api/users.ts` - API client

---

## Orders & Fulfillment

### Orders Module
- **Route:** `/orders`
- **Features:** Order list, detail view, status updates
- **Order Numbers:** Phone/AI-readable format (see Order & Shipment Numbers section)

### Shipments Module
- **Route:** `/shipments`
- **Features:** Shipment tracking, carrier integration, status updates
- **Statuses:** `PENDING`, `PROCESSING`, `SHIPPED`, `IN_TRANSIT`, `DELIVERED`, `RETURNED`

### Key Files
- `apps/api/src/orders/` - Orders backend
- `apps/api/src/fulfillment/` - Fulfillment/shipments backend
- `apps/admin-dashboard/src/app/(dashboard)/orders/` - Orders UI
- `apps/admin-dashboard/src/app/(dashboard)/shipments/` - Shipments UI

---

## Products & Inventory

### Products Module
- **Route:** `/products`
- **Features:** Product catalog, categories, tags, collections, variants
- **Sub-routes:** `/products/categories`, `/products/tags`, `/products/collections`

### Inventory Module
- **Features:** Stock tracking, location management, adjustments
- **Key file:** `apps/api/src/inventory/`

### Key Files
- `apps/api/src/products/` - Products backend
- `apps/admin-dashboard/src/app/(dashboard)/products/` - Products UI

---

## Dashboard

### Stats & Metrics
- **Endpoint:** `GET /api/dashboard/stats`
- **Metrics:** Total transactions, revenue, active customers, pending orders

### Chart Data
- **Endpoint:** `GET /api/dashboard/stats/chart?days=30`
- **Data:** Daily transaction counts and amounts

### Badges
- **Endpoint:** `GET /api/dashboard/badges`
- **Data:** Notification counts for sidebar badges

### Key Files
- `apps/api/src/dashboard/` - Dashboard backend
- `apps/admin-dashboard/src/app/(dashboard)/page.tsx` - Dashboard page
- `apps/admin-dashboard/src/components/dashboard/` - Dashboard components

---

## Product Integration Services

AI-powered product management services:

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| `BedrockService` | AI content generation | `generateProductDescription()`, `generateAltText()`, `suggestCategorization()` |
| `S3StorageService` | Image storage & CDN | `uploadFile()`, `generateThumbnails()`, `getSignedDownloadUrl()` |
| `LanguageToolService` | Grammar checking | `checkGrammar()`, `checkAndCorrect()` |
| `CloudinaryService` | Image processing | `removeBackground()`, `smartCrop()`, `enhance()` |

**Architecture Note:** Cloudinary uses "fetch" mode to process S3 URLs on-demand. S3 is the ONLY storage layer.

**Key files:** `apps/api/src/integrations/services/providers/`

---

## Key Project Documents

| Document | Purpose |
|----------|---------|
| `INTEGRATIONS_FRAMEWORK_SPECIFICATION.md` | Feature 01 spec |
| `Feature_02_Dynamic_RBAC_System.docx` | Feature 02 spec |
| `Feature_03_Vendor_System.docx` | Feature 03 spec |
| `Gateway_Rule_Engine_Complete_Specification.md` | GRE routing rules |
| `COMPLETE_DEVELOPMENT_PLAN.md` | 24-week roadmap |
| `MASTER_DEVELOPMENT_CHECKLIST.md` | Task tracker |

---

## 24-Week Development Roadmap

| Phase | Weeks | Features |
|-------|-------|----------|
| Phase 1: Foundation | 1-4 | Auth, RBAC, Integrations Framework, Dashboard |
| Phase 2: Payment Core | 5-7 | Multi-account, Pools, Load balancing |
| Phase 3: Gateway Rule Engine | 8-10 | Rules, Conditions, Actions |
| Phase 4: Billing | 11-12 | Usage, Plans, Invoicing |
| Phase 5: Momentum Core | 13-15 | Churn, Save flow, Triggers |
| Phase 6: CS AI | 16-17 | Voice AI, RMA, Refunds |
| Phase 7: Communications | 18-19 | Content gen, Delivery |
| Phase 8: Revenue & Analytics | 20-21 | Upsell, Analytics |
| Phase 9: Alpha Deployment | 22-24 | AWS, CI/CD, Launch |

---

## Git Workflow

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

---

## Settings Navigation

```
/settings
├── /general            # Company settings (timezone, currency, etc.)
├── /profile            # User profile
├── /security           # Password, 2FA
├── /team               # Team/User management
├── /roles              # RBAC role management
├── /merchant-accounts  # Bank accounts
├── /integrations       # Client integrations (Feature 01)
├── /api-keys           # API key management
├── /refunds            # Refund policies and settings
├── /audit-logs         # Compliance audit trail
└── /notifications      # Preferences
```

---

## Audit Logs (Compliance System)

### Overview
Comprehensive compliance audit trail supporting SOC2, ISO 27001, GDPR, CNIL (French), and PCI-DSS requirements.

### Data Classifications
```typescript
enum DataClassification {
  PUBLIC,       // No restrictions
  INTERNAL,     // Internal use only
  CONFIDENTIAL, // Sensitive business data
  PII,          // Personal Identifiable Information (GDPR)
  PCI,          // Payment Card Industry data
  PHI,          // Protected Health Information
}
```

### Audit Action Categories (150+ actions)

| Category | Compliance | Example Actions |
|----------|------------|-----------------|
| Authentication | SOC2 CC6.1, PCI 10.2.4 | `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `LOGIN_BLOCKED`, `SESSION_TERMINATED` |
| Credentials | PCI 8.2, ISO A.9.4.3 | `PASSWORD_CHANGED`, `MFA_ENABLED`, `MFA_CHALLENGE_FAILED` |
| CRUD | SOC2 CC6.1, PCI 10.2.7 | `CREATE`, `UPDATE`, `DELETE`, `SOFT_DELETE`, `RESTORE` |
| Payments | PCI-DSS 10.2.1 | `PAYMENT_AUTHORIZED`, `PAYMENT_COMPLETED`, `REFUND_*`, `CHARGEBACK_*` |
| Sensitive Data | PCI-DSS 3.x | `SENSITIVE_DATA_ACCESSED`, `ENCRYPTION_KEY_ROTATED` |
| GDPR Privacy | GDPR Art. 15-22 | `DATA_ACCESS_REQUEST`, `DATA_ERASURE_REQUEST`, `CONSENT_*` |
| Access Control | SOC2 CC6.2-3 | `ROLE_ASSIGNED`, `PERMISSION_GRANTED`, `ACCESS_DENIED` |
| Security | PCI 10.2.2, SOC2 CC6.6 | `API_KEY_CREATED`, `SUSPICIOUS_ACTIVITY`, `IP_BLOCKED` |
| AI/Automation | GDPR Art. 22 | `AI_DECISION_MADE`, `AUTOMATION_TRIGGERED` |

### API Endpoints
```
GET    /api/audit-logs              # List with search, filters, pagination
GET    /api/audit-logs/stats        # Stats by action, entity, classification
GET    /api/audit-logs/filters      # Available filter options
GET    /api/audit-logs/:id          # Single log detail
GET    /api/audit-logs/entity/:entity/:entityId  # Entity audit trail
```

### Key Files
- `apps/api/src/audit-logs/` - Backend module (global)
- `apps/api/src/audit-logs/types/audit-log.types.ts` - 150+ action constants
- `apps/admin-dashboard/src/app/(dashboard)/settings/audit-logs/page.tsx` - UI
- `apps/admin-dashboard/src/lib/api/audit-logs.ts` - API client

---

## Refunds Module

### Overview
Comprehensive refund management with approval workflows and configurable policies.

### Refund Statuses
```typescript
enum RefundStatus {
  PENDING,    // Awaiting approval
  APPROVED,   // Approved, not yet processed
  PROCESSING, // Being processed
  COMPLETED,  // Successfully refunded
  REJECTED,   // Denied
  FAILED,     // Processing failed
}
```

### API Endpoints
```
GET    /api/refunds                 # List refunds
GET    /api/refunds/stats           # Refund statistics
GET    /api/refunds/:id             # Get refund by ID
POST   /api/refunds                 # Create refund request
PATCH  /api/refunds/:id/approve     # Approve refund
PATCH  /api/refunds/:id/reject      # Reject refund
GET    /api/refunds/settings/current # Current refund settings
POST   /api/refunds/settings        # Update settings
```

### Key Files
- `apps/api/src/refunds/` - Backend module
- `apps/admin-dashboard/src/app/(dashboard)/refunds/page.tsx` - Refunds list
- `apps/admin-dashboard/src/app/(dashboard)/settings/refunds/page.tsx` - Settings
- `apps/admin-dashboard/src/lib/api/refunds.ts` - API client

---

## Routing Module

### Overview
Payment routing with rules and account pools for transaction management.

### Pages
- `/routing` - Routing rules list with conditions and priorities
- `/routing/pools` - Account pools for load balancing

### API Endpoints
```
GET    /api/routing-rules           # List routing rules
POST   /api/routing-rules           # Create rule
PATCH  /api/routing-rules/:id       # Update rule
DELETE /api/routing-rules/:id       # Delete rule
GET    /api/account-pools           # List account pools
POST   /api/account-pools           # Create pool
```

### Key Files
- `apps/api/src/routing/` - Backend module
- `apps/admin-dashboard/src/app/(dashboard)/routing/page.tsx` - Rules UI
- `apps/admin-dashboard/src/app/(dashboard)/routing/pools/page.tsx` - Pools UI
- `apps/admin-dashboard/src/lib/api/routing.ts` - API client

---

## Customers Module

### Overview
Customer management with detail views, notes, tags, and order history.

### Pages
- `/customers` - Customer list with search and filters
- `/customers/[id]` - Customer detail with tabs (Overview, Orders, Notes)

### API Endpoints
```
GET    /api/customers               # List customers
GET    /api/customers/:id           # Get customer detail
POST   /api/customers               # Create customer
PATCH  /api/customers/:id           # Update customer
GET    /api/customers/stats         # Customer statistics
```

### Key Files
- `apps/api/src/customers/` - Backend module
- `apps/admin-dashboard/src/app/(dashboard)/customers/page.tsx` - List
- `apps/admin-dashboard/src/app/(dashboard)/customers/[id]/page.tsx` - Detail
- `apps/admin-dashboard/src/lib/api/customers.ts` - API client

---

## Transactions Module

### Overview
Transaction monitoring with real-time status, filtering, and search.

### API Endpoints
```
GET    /api/transactions            # List transactions
GET    /api/transactions/:id        # Get transaction detail
GET    /api/transactions/stats      # Transaction statistics
```

### Key Files
- `apps/api/src/transactions/` - Backend module
- `apps/admin-dashboard/src/app/(dashboard)/transactions/page.tsx` - UI
- `apps/admin-dashboard/src/lib/api/transactions.ts` - API client

---

## Seed Data Structure

### Directory Organization
```
apps/api/prisma/seeds/
├── core/                   # Core/required data
│   ├── index.ts
│   ├── seed-organization.ts
│   └── seed-pricing.ts
├── demo/                   # Demo/sample data
│   ├── index.ts
│   ├── seed-audit-logs.ts
│   ├── seed-clients.ts
│   ├── seed-customers.ts
│   ├── seed-merchant-accounts.ts
│   ├── seed-subscription.ts
│   ├── seed-transactions.ts
│   └── momentum-intelligence.seed.ts
├── utils/                  # Utility scripts
│   ├── index.ts
│   ├── reset-demo.ts
│   └── seed-entity-codes.ts
└── seed-rbac.ts           # RBAC permissions & roles
```

### Running Seeds
```bash
cd apps/api && npx prisma db seed  # Run all seeds
```

---

## Troubleshooting

### API Returns 404
- Check route has `/api` prefix in frontend call
- Verify controller decorator matches expected path
- Check NestJS module imports the controller

### Prisma Client Issues
```bash
cd apps/api && npx prisma generate
cd apps/api && npx prisma migrate dev
```

### Docker Issues
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

*Last Updated: December 3, 2025*
*Feature 01: Complete | Feature 02-03: Spec Complete*

