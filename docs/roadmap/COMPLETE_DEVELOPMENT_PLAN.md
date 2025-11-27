# avnz.io Payment Platform - Complete Development Plan
## All Features | All Phases | Full Task List

---

## Document Information
- **Version:** 1.1
- **Created:** November 26, 2025
- **Updated:** November 26, 2025
- **Total Duration:** 21 weeks (Local Dev) + 3 weeks (Alpha Deployment) = **24 weeks**
- **Compliance:** SOC 2 Type II, ISO 27001, PCI DSS ready

---

## Platform Feature Overview

### Core Platform
- Authentication & RBAC
- **Integrations Framework** (UI-configurable services)
- Multi-tenant Hierarchy (Org → Client → Company → Dept → User)
- Multi-Account Provider Model
- Account Pools & Load Balancing
- Gateway Rule Engine (GRE)
- Billing & Usage Tracking
- Admin Dashboard

### Momentum Intelligence™
- Intent Detection & Churn Prediction
- Customer Save System (7-stage cascade)
- Behavioral Triggers Library (13 NCI triggers)
- Voice AI Customer Service (2-tier AI)
- Content Generation Engine
- Upsell Module
- Delivery Orchestration
- Analytics Dashboard

### Integrations (UI-Configurable)
- Payment Gateways: PayPal Payflow, NMI, Authorize.Net, Stripe
- Platform Gateway Option (avnz.io's merchant account for clients)
- Future: Email (Klaviyo), SMS (Twilio), etc.
- All credentials via UI, not .env files

---

## Development Phases Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1: FOUNDATION (Weeks 1-4)                                    │
│  Auth, RBAC, Integrations Framework, Hierarchy, Dashboard           │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 2: PAYMENT CORE (Weeks 5-7)                                  │
│  Multi-Account Model, Account Pools, Load Balancing, Failover       │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 3: GATEWAY RULE ENGINE (Weeks 8-10)                          │
│  Routing Rules, Conditions, Actions, Testing, A/B Testing           │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 4: BILLING SYSTEM (Weeks 11-12)                              │
│  Usage Tracking, Plans, Subscriptions, Invoicing                    │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 5: MOMENTUM CORE (Weeks 13-15)                               │
│  Churn Prediction, Save System, Behavioral Triggers                 │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 6: CUSTOMER SERVICE AI (Weeks 16-17)                         │
│  Voice AI (Rep + Manager), RMA, Refunds, T&C Management             │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 7: COMMUNICATIONS (Weeks 18-19)                              │
│  Content Generation, Delivery Orchestration, Automations            │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 8: REVENUE & ANALYTICS (Weeks 20-21)                         │
│  Upsell Module, Analytics Dashboard, Reporting                      │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 9: ALPHA DEPLOYMENT (Weeks 22-24)                            │
│  AWS Infrastructure, CI/CD, Monitoring, Production Launch           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: FOUNDATION
### Weeks 1-4 | Authentication, RBAC, Integrations Framework, Dashboard

---

### Week 1: Authentication & RBAC

#### Day 1-2: Auth0 Integration (Backend)
```
□ Create Auth0 development tenant
□ Create API application (audience: https://api.avnz.local)
□ Create SPA application (Dashboard)
□ Configure callback URLs for localhost
□ Create test users for each role type
□ Install backend dependencies
  □ @nestjs/passport
  □ passport
  □ passport-jwt
  □ jwks-rsa
□ Create auth module structure
  □ auth/auth.module.ts
  □ auth/strategies/jwt.strategy.ts
  □ auth/guards/jwt-auth.guard.ts
  □ auth/decorators/public.decorator.ts
□ Configure JWT validation
  □ Issuer validation
  □ Audience validation
  □ JWKS endpoint configuration
□ Add environment variables
  □ AUTH0_DOMAIN
  □ AUTH0_AUDIENCE
  □ AUTH0_CLIENT_ID
  □ AUTH0_CLIENT_SECRET
□ Test protected route with valid token
□ Test rejection of invalid token
```

#### Day 3-4: RBAC Implementation
```
□ Define permission enum (permissions.enum.ts)
  □ transactions:read, transactions:write, transactions:refund
  □ customers:read, customers:write, customers:delete
  □ settings:read, settings:write
  □ billing:read, billing:write
  □ routing:read, routing:write
  □ accounts:read, accounts:write
  □ pools:read, pools:write
  □ admin:users, admin:clients, admin:system
□ Create permissions decorator
  □ decorators/permissions.decorator.ts
□ Create permissions guard
  □ guards/permissions.guard.ts
□ Define role configurations
  □ ORGANIZATION_ADMIN - All permissions
  □ CLIENT_ADMIN - All except admin:system, admin:clients
  □ CLIENT_USER - Read + limited write
  □ COMPANY_ADMIN - Own company only
  □ COMPANY_USER - Read mostly
□ Create role-permission mapping
  □ config/role-permissions.config.ts
□ Create hierarchy guard
  □ guards/hierarchy.guard.ts
  □ Validate user can access requested resource
  □ Organization sees all
  □ Client sees own client + companies
  □ Company sees own company only
□ Create current-user decorator
  □ decorators/current-user.decorator.ts
  □ Extract user from JWT claims
  □ Include organizationId, clientId, companyId
□ Test role-based access control
  □ Test each role accessing various endpoints
  □ Test hierarchy scoping
```

#### Day 5: User Context & Session
```
□ Create user interface
  □ interfaces/user.interface.ts
  □ Include all hierarchy IDs
  □ Include permissions array
□ Create auth context service
  □ services/auth-context.service.ts
  □ Get current user's accessible resources
  □ Build where clauses for Prisma queries
□ Create request context middleware
  □ Add request ID
  □ Add timestamp
  □ Add user context
□ Add audit fields to base entity
  □ createdBy, updatedBy
  □ createdAt, updatedAt
□ Document auth flow
```

---

### Week 2: Hierarchy & API Security

#### Day 1-2: Hierarchy Models & CRUD
```
□ Update Prisma schema
  □ Organization model
    □ id, name, slug, settings
    □ billingEmail, supportEmail
    □ createdAt, updatedAt
  □ Client model (Agency)
    □ id, organizationId, name, slug
    □ status (active, suspended, cancelled)
    □ settings, metadata
    □ Relation to Organization
  □ Company model (Business)
    □ id, clientId, name, slug
    □ status, settings, metadata
    □ Relation to Client
  □ Department model
    □ id, companyId, name
    □ Relation to Company
  □ User model
    □ id, auth0Id, email, name
    □ role, status
    □ organizationId, clientId, companyId, departmentId
    □ lastLoginAt, preferences
□ Run Prisma migration
□ Create Organization module
  □ organization.controller.ts (admin only)
  □ organization.service.ts
  □ organization.dto.ts
  □ GET /organizations (list)
  □ GET /organizations/:id
  □ PATCH /organizations/:id
□ Create Client module
  □ client.controller.ts
  □ client.service.ts
  □ DTOs (create, update, response, list-query)
  □ POST /clients
  □ GET /clients
  □ GET /clients/:id
  □ PATCH /clients/:id
  □ DELETE /clients/:id (soft delete)
□ Create Company module
  □ company.controller.ts
  □ company.service.ts
  □ DTOs
  □ Full CRUD scoped to parent client
□ Create Department module
  □ Basic CRUD
  □ Scoped to parent company
□ Create User module
  □ user.controller.ts
  □ user.service.ts
  □ POST /users/invite
  □ GET /users (scoped by hierarchy)
  □ GET /users/:id
  □ PATCH /users/:id
  □ DELETE /users/:id (soft delete)
□ Add comprehensive audit logging
  □ Log all create/update/delete operations
  □ Include before/after values
```

#### Day 3-4: API Security Hardening
```
□ Rate Limiting
  □ Install @nestjs/throttler
  □ Configure Redis-backed store
  □ Create throttler.config.ts
  □ Per-IP limits: 100/minute
  □ Per-user limits: 1000/minute
  □ Custom limits for payment endpoints: 30/minute
  □ Custom limits for auth endpoints: 10/minute
□ Input Validation
  □ Configure global ValidationPipe
  □ Add class-validator to all DTOs
  □ Create custom validators
    □ IsValidCurrency
    □ IsValidAmount
    □ IsValidCardNumber (for format)
  □ Sanitize all string inputs
  □ Add max length constraints
□ Security Headers
  □ Install helmet
  □ Configure CSP
  □ X-Frame-Options: DENY
  □ X-Content-Type-Options: nosniff
  □ Strict-Transport-Security
  □ Configure CORS properly
    □ Whitelist allowed origins
    □ Configure allowed methods
    □ Configure allowed headers
□ API Versioning
  □ Configure /api/v1/* prefix
  □ Add version to responses
□ Request/Response Logging
  □ Create logging interceptor
  □ Log request method, path, duration
  □ Mask sensitive data in logs
  □ Structured JSON format
```

#### Day 5: Audit Logging System
```
□ Create AuditLog model in Prisma
  □ id, timestamp
  □ userId, userEmail
  □ action (CREATE, READ, UPDATE, DELETE)
  □ resource (transaction, customer, etc.)
  □ resourceId
  □ previousValue (JSON)
  □ newValue (JSON)
  □ ipAddress, userAgent
  □ requestId
  □ metadata
□ Create audit-log.service.ts
  □ log() method
  □ Batch logging for performance
  □ Async logging (non-blocking)
□ Create audit interceptor
  □ Auto-log mutations
  □ Capture before/after state
□ Create audit endpoints (admin)
  □ GET /admin/audit-logs
  □ GET /admin/audit-logs/:id
  □ Filter by user, resource, date range
□ Test audit logging
  □ Verify all CRUD operations logged
  □ Verify sensitive data masked
```

---

### Week 3: Integrations Framework

#### Day 1-2: Integration Models & Encryption
```
□ Create IntegrationCategory enum
  □ AUTHENTICATION
  □ PAYMENT_GATEWAY
  □ EMAIL_TRANSACTIONAL
  □ EMAIL_MARKETING
  □ SMS
  □ VOICE
  □ PUSH_NOTIFICATION
  □ AI_ML
  □ STORAGE
  □ MONITORING
  □ FEATURE_FLAGS
  □ WEBHOOK
□ Create IntegrationProvider enum
  □ AUTH0, OKTA, COGNITO (auth)
  □ PAYPAL_PAYFLOW, NMI, AUTHORIZE_NET, STRIPE (payment)
  □ AWS_SES, KLAVIYO (email)
  □ AWS_SNS, TWILIO (sms)
  □ AWS_BEDROCK (ai)
  □ DATADOG, SENTRY, CLOUDWATCH (monitoring)
□ Create IntegrationDefinition model (reference data)
  □ provider, category, name, description
  □ logoUrl, documentationUrl
  □ isOrgOnly (not client-configurable)
  □ isClientAllowed
  □ isPlatformOffered (avnz.io offers as service)
  □ credentialSchema (JSON Schema)
  □ settingsSchema (JSON Schema)
  □ requiredCompliance
  □ status
□ Create PlatformIntegration model (org-level)
  □ organizationId, provider, category
  □ name, description
  □ credentials (encrypted JSON)
  □ settings
  □ environment (sandbox/production)
  □ isSharedWithClients
  □ clientPricing (JSON)
  □ status, lastTestedAt, lastTestResult
  □ Audit fields
□ Create ClientIntegration model (client-level)
  □ clientId, provider, category
  □ name, description
  □ mode ('own' | 'platform')
  □ credentials (encrypted, null if platform)
  □ platformIntegrationId (reference if platform)
  □ settings
  □ environment
  □ usageThisMonth (for platform billing)
  □ isDefault, priority
  □ status, isVerified
  □ Audit fields
□ Run Prisma migration
□ Create credential encryption service
  □ Use AES-256-GCM
  □ Key from AWS Secrets Manager / env
  □ encrypt(credentials): EncryptedData
  □ decrypt(encrypted): Credentials
  □ Never log decrypted credentials
□ Create credential schemas per provider
  □ PayPal Payflow: partner, vendor, user, password
  □ NMI: securityKey, username, password
  □ Authorize.Net: apiLoginId, transactionKey
  □ Stripe: secretKey, publishableKey, webhookSecret
```

#### Day 3: Integration Services
```
□ Create integration-definition.service.ts
  □ getAll()
  □ getByCategory(category)
  □ getClientAllowed()
  □ getByProvider(provider)
□ Seed IntegrationDefinitions
  □ Payment gateways (PayPal, NMI, Auth.Net, Stripe)
  □ Auth providers (Auth0 - org only)
  □ Email (AWS SES - org only for now)
  □ SMS (AWS SNS - org only for now)
  □ AI (AWS Bedrock - org only)
  □ Monitoring (Datadog, Sentry - org only)
□ Create platform-integration.service.ts
  □ create(dto)
  □ update(id, dto)
  □ delete(id)
  □ list(orgId)
  □ getByProvider(orgId, provider)
  □ configureClientSharing(id, pricing)
  □ Test connection method
□ Create client-integration.service.ts
  □ create(dto) - handles own vs platform
  □ update(id, dto)
  □ delete(id)
  □ list(clientId)
  □ getByProvider(clientId, provider)
  □ setDefault(id)
  □ getAvailable(clientId) - includes platform options
  □ Test connection method
□ Create integration-test.service.ts
  □ testPaymentGateway(provider, credentials)
  □ testEmailProvider(provider, credentials)
  □ Return { success, message, latency }
□ Create integration-sync.service.ts
  □ syncToMerchantAccount(clientIntegration)
  □ Auto-create MerchantAccount from ClientIntegration
  □ Keep credentials in sync
```

#### Day 4: Integration API Endpoints
```
□ Platform Integration endpoints (admin only)
  □ GET /api/admin/integrations/definitions
  □ GET /api/admin/integrations/platform
  □ POST /api/admin/integrations/platform
  □ GET /api/admin/integrations/platform/:id
  □ PATCH /api/admin/integrations/platform/:id
  □ DELETE /api/admin/integrations/platform/:id
  □ POST /api/admin/integrations/platform/:id/test
  □ PATCH /api/admin/integrations/platform/:id/sharing
□ Client Integration endpoints
  □ GET /api/integrations/available
    □ Returns definitions + platform options
  □ GET /api/integrations
    □ List client's integrations
  □ POST /api/integrations
    □ Add new integration (own or platform mode)
  □ GET /api/integrations/:id
    □ Returns with masked credentials
  □ PATCH /api/integrations/:id
  □ DELETE /api/integrations/:id
  □ POST /api/integrations/:id/test
  □ PATCH /api/integrations/:id/default
  □ GET /api/integrations/:id/usage (platform mode)
□ Add guards
  □ Platform endpoints: ORG_ADMIN only
  □ Client endpoints: CLIENT_ADMIN only
  □ Credential masking on read
```

#### Day 5: Update Merchant Account Integration
```
□ Update MerchantAccount model
  □ Add clientIntegrationId (optional FK)
  □ Add isFromIntegration flag
□ Update MerchantAccount service
  □ Create from ClientIntegration
  □ Sync credentials on integration update
  □ Delete when integration deleted
□ Create integration hooks
  □ On ClientIntegration create → create MerchantAccount
  □ On ClientIntegration update → update MerchantAccount
  □ On ClientIntegration delete → deactivate MerchantAccount
□ Platform gateway billing tracking
  □ Track transactions per client
  □ Track volume per client
  □ Calculate fees
  □ Include in client billing
□ Test integration → merchant account flow
  □ Create integration with own credentials
  □ Verify MerchantAccount created
  □ Process test transaction
  □ Create platform mode integration
  □ Verify uses platform MerchantAccount
```

---

### Week 4: Dashboard Foundation

#### Day 1-2: Dashboard Project Setup
```
□ Verify Next.js 14 with App Router
□ Configure Tailwind CSS
  □ Dark theme (zinc/cyan palette)
  □ Custom colors for status badges
  □ Typography scale
□ Install UI dependencies
  □ @radix-ui/react-* components
  □ lucide-react icons
  □ clsx, tailwind-merge
  □ recharts for charts
  □ date-fns for date handling
  □ react-hook-form, zod for forms
□ Configure path aliases (@/)
□ Create base layout structure
  □ app/layout.tsx (root)
  □ app/(auth)/layout.tsx
  □ app/(dashboard)/layout.tsx
□ Auth0 Frontend Integration
  □ Install @auth0/nextjs-auth0
  □ Create app/api/auth/[auth0]/route.ts
  □ Configure .env.local
    □ AUTH0_SECRET
    □ AUTH0_BASE_URL
    □ AUTH0_ISSUER_BASE_URL
    □ AUTH0_CLIENT_ID
    □ AUTH0_CLIENT_SECRET
  □ Create UserProvider wrapper
  □ Create useUser hook wrapper
  □ Create login page
  □ Create logout handler
  □ Test login/logout flow
```

#### Day 3: Layout Components
```
□ Create Sidebar component
  □ Collapsible on mobile
  □ Persist state in localStorage
  □ Role-aware navigation items
  □ Active state indicator
  □ Navigation groups
    □ Dashboard
    □ Transactions
    □ Customers
    □ Routing (GRE)
    □ Billing
    □ Settings
    □ Momentum (if enabled)
□ Create Header component
  □ Breadcrumbs
  □ Search (global)
  □ Notifications dropdown
  □ User menu dropdown
    □ Profile link
    □ Settings link
    □ Theme toggle
    □ Logout
□ Create Breadcrumbs component
  □ Auto-generate from route
  □ Custom override support
□ Create ThemeProvider
  □ Dark/light toggle
  □ System preference detection
  □ Persist preference
```

#### Day 4: API Client & Core Components
```
□ API Client Setup
  □ Install @tanstack/react-query axios
  □ Create QueryClientProvider
  □ Create axios instance
    □ Base URL configuration
    □ Auth interceptor (attach token)
    □ Error interceptor (handle 401, 403, 500)
    □ Request ID header
  □ Create typed API hooks pattern
    □ useQuery wrappers
    □ useMutation wrappers
□ Core UI Components
  □ Button (variants: primary, secondary, ghost, danger)
  □ Input (text, email, password, number)
  □ Select dropdown
  □ Checkbox, Radio
  □ Switch/Toggle
  □ Card component
  □ Modal/Dialog
  □ Toast notifications (sonner)
  □ Loading spinner
  □ Skeleton loaders
  □ Empty state
  □ Error boundary
  □ Confirm dialog
```

#### Day 5: Dashboard Home & Data Tables
```
□ Create Table component
  □ Sortable columns
  □ Column visibility toggle
  □ Pagination
  □ Row selection
  □ Loading state
  □ Empty state
  □ Export to CSV
□ Create Filter components
  □ Date range picker
  □ Select filters
  □ Search input
  □ Filter pills/badges
□ Create Dashboard Home page
  □ Welcome message with user name
  □ Quick stats cards
    □ Today's transactions
    □ Today's volume
    □ Success rate
    □ Active customers
  □ 7-day transaction chart
  □ Recent transactions table
  □ Quick action buttons
□ Create stats API endpoints
  □ GET /api/stats/summary
  □ GET /api/stats/chart
  □ Scope by user's hierarchy
□ Test dashboard loads correctly
```

#### Day 5 (continued): Integrations UI
```
□ Create /admin/integrations page (org admin)
  □ Platform integrations list by category
  □ Integration cards with status
  □ Add integration modal
  □ Test connection button
  □ Configure client sharing
□ Create /settings/integrations page (client)
  □ Payment Integrations section
    □ Client's configured gateways
    □ Status indicators
    □ Default badge
    □ Test/Edit/Delete actions
  □ Platform Gateway option card
    □ Pricing display
    □ Enable button
  □ Add Integration button
□ Create Add Integration modal
  □ Step 1: Select provider (with logos)
  □ Step 2: Choose mode (own vs platform)
  □ Step 3: Enter credentials (dynamic form from schema)
  □ Step 4: Test & Save
□ Create Edit Integration modal
  □ Update credentials
  □ Change environment
  □ Set as default
□ Integration status components
  □ Connected (green)
  □ Error (red with message)
  □ Not configured (gray)
  □ Testing spinner
□ Test integrations UI flow
  □ Add own credentials integration
  □ Add platform gateway
  □ Edit integration
  □ Test connection
  □ Delete integration
```

---

## PHASE 2: PAYMENT CORE
### Weeks 5-7 | Multi-Account, Pools, Load Balancing

---

### Week 5: Multi-Account Provider Model

#### Day 1-2: Merchant Account Model
```
□ Create MerchantAccount Prisma model
  □ id, companyId
  □ name, description, color, icon, tags
  □ providerType (enum: NMI, PAYFLOW, AUTHORIZE_NET, STRIPE)
  □ merchantId, descriptor, descriptorPhone
  □ credentials (encrypted JSON)
  □ environment (sandbox/production)
  □ status (active, inactive, suspended, pending, closed)
  □ statusReason, statusChangedAt
  □ limits (JSON)
    □ minTransactionAmount, maxTransactionAmount
    □ dailyTransactionLimit, dailyVolumeLimit
    □ weeklyTransactionLimit, weeklyVolumeLimit
    □ monthlyTransactionLimit, monthlyVolumeLimit
    □ yearlyTransactionLimit, yearlyVolumeLimit
  □ currentUsage (JSON)
    □ dailyTransactionCount, dailyVolume
    □ weeklyTransactionCount, weeklyVolume
    □ monthlyTransactionCount, monthlyVolume
    □ yearlyTransactionCount, yearlyVolume
    □ lastResetDaily, lastResetWeekly, etc.
  □ fees (JSON)
    □ basePercentage, baseFlatFee
    □ internationalPercentage, internationalFlatFee
    □ cardSpecificFees
  □ restrictions (JSON)
    □ allowedCountries, blockedCountries
    □ allowedCardBrands, blockedCardBrands
    □ allowedProductCategories
  □ healthMetrics (JSON)
    □ successRate, averageResponseTime
    □ lastHealthCheck, healthScore
  □ createdAt, updatedAt
□ Run Prisma migration
```

#### Day 3: Credential Encryption
```
□ Create encryption.service.ts
  □ Use AES-256-GCM
  □ Generate IV for each encryption
  □ Key derivation from ENCRYPTION_KEY env var
  □ encrypt(plaintext: string): EncryptedData
  □ decrypt(encrypted: EncryptedData): string
□ Create encrypted-credentials.type.ts
  □ Different structures per provider type
  □ PayflowCredentials
  □ NMICredentials
  □ AuthorizeNetCredentials
□ Add ENCRYPTION_KEY to .env
□ Create credential validation
  □ Validate required fields per provider
□ Never log decrypted credentials
  □ Create logger filter
□ Test encryption/decryption
```

#### Day 4-5: Merchant Account Module
```
□ Create merchant-account module
  □ merchant-account.controller.ts
  □ merchant-account.service.ts
  □ DTOs
    □ create-merchant-account.dto.ts
    □ update-merchant-account.dto.ts
    □ merchant-account-response.dto.ts
□ Implement endpoints
  □ POST /api/merchant-accounts
    □ Encrypt credentials before save
    □ Validate provider-specific fields
  □ GET /api/merchant-accounts
    □ List with pagination
    □ Filter by status, provider type
    □ Never return credentials
  □ GET /api/merchant-accounts/:id
    □ Include usage stats
    □ Include health metrics
  □ PATCH /api/merchant-accounts/:id
    □ Handle credential updates
    □ Re-encrypt if changed
  □ DELETE /api/merchant-accounts/:id
    □ Soft delete (status = closed)
    □ Verify not in active pools
  □ GET /api/merchant-accounts/:id/usage
    □ Current period usage
    □ Historical usage
  □ GET /api/merchant-accounts/:id/health
    □ Current health score
    □ Recent transactions success rate
  □ POST /api/merchant-accounts/:id/test
    □ Test connection to provider
    □ Verify credentials work
□ Create usage tracking
  □ Increment counters on transaction
  □ Check limits before processing
  □ Return limit exceeded error
□ Create reset jobs
  □ Daily reset cron (midnight UTC)
  □ Weekly reset cron (Sunday midnight)
  □ Monthly reset cron (1st of month)
  □ Yearly reset cron (Jan 1st)
```

---

### Week 6: Account Pools & Load Balancing

#### Day 1-2: Account Pool Model
```
□ Create AccountPool Prisma model
  □ id, companyId
  □ name, description
  □ strategy (enum)
    □ WEIGHTED
    □ ROUND_ROBIN
    □ LEAST_LOAD
    □ CAPACITY
    □ LOWEST_COST
    □ LOWEST_LATENCY
    □ HIGHEST_SUCCESS
    □ ADAPTIVE
  □ isActive, isDefault
  □ configuration (JSON)
    □ Strategy-specific settings
  □ failoverEnabled
  □ failoverConfig (JSON)
  □ createdAt, updatedAt
□ Create PoolMembership Prisma model
  □ id, poolId, merchantAccountId
  □ weight (0-100)
  □ priority (for failover order)
  □ isActive
  □ addedAt
□ Run Prisma migration
□ Create account-pool module
  □ account-pool.controller.ts
  □ account-pool.service.ts
  □ DTOs
□ Implement endpoints
  □ POST /api/account-pools
  □ GET /api/account-pools
  □ GET /api/account-pools/:id
  □ PATCH /api/account-pools/:id
  □ DELETE /api/account-pools/:id
  □ POST /api/account-pools/:id/accounts
    □ Add account to pool
  □ DELETE /api/account-pools/:id/accounts/:accountId
    □ Remove account from pool
  □ PATCH /api/account-pools/:id/accounts/:accountId
    □ Update weight/priority
  □ GET /api/account-pools/:id/stats
    □ Transaction distribution
    □ Success rates per account
```

#### Day 3-4: Load Balancing Strategies
```
□ Create strategy interface
  □ strategies/load-balancing.interface.ts
  □ selectAccount(pool, transaction, context): MerchantAccount
□ Implement WeightedStrategy
  □ Select based on weight percentages
  □ Random selection with weighted probability
□ Implement RoundRobinStrategy
  □ Rotate through accounts
  □ Track last used index per pool
□ Implement CapacityStrategy
  □ Calculate remaining capacity per account
  □ Select account with most headroom
  □ Consider daily and monthly limits
□ Implement LowestCostStrategy
  □ Calculate effective fee for transaction
  □ Select cheapest account
□ Implement LeastLoadStrategy
  □ Track active transactions per account
  □ Select least busy
□ Implement HighestSuccessStrategy
  □ Use health metrics
  □ Select best performing
□ Create StrategyFactory
  □ Get strategy by type
  □ Cache strategy instances
□ Create account-selector.service.ts
  □ Get pool for company
  □ Get default pool if not specified
  □ Apply strategy
  □ Verify account can handle transaction
    □ Check limits
    □ Check restrictions
    □ Check health
  □ Log selection decision
  □ Return selected account
```

#### Day 5: Failover Logic
```
□ Create failover.service.ts
  □ Handle transaction failure
  □ Determine if retryable
    □ Gateway timeout → retry
    □ Hard decline → don't retry
    □ Soft decline → maybe retry
  □ Mark account as degraded
  □ Get next account from pool
  □ Respect priority order
  □ Temporary exclusion
    □ Configurable duration
    □ Auto-recovery check
□ Create RoutingDecision model
  □ transactionId
  □ poolId, selectedAccountId
  □ strategy used
  □ evaluationTimeMs
  □ failoverAttempts
  □ finalOutcome
□ Integrate with payment flow
  □ Call account selector
  □ Process with selected account
  □ On failure, trigger failover
  □ Log all decisions
□ Create health check job
  □ Periodic health check for all accounts
  □ Update health metrics
  □ Auto-suspend unhealthy accounts
□ Test failover scenarios
  □ Primary account fails
  □ All accounts fail
  □ Account recovers
```

---

### Week 7: Dashboard - Accounts & Pools

#### Day 1-2: Merchant Accounts UI
```
□ Create /settings/accounts page
  □ Accounts list table
    □ Name, provider, status, usage, health
    □ Color-coded status badges
    □ Quick actions dropdown
  □ Filter by status, provider type
  □ Search by name
□ Create Add Account modal
  □ Step 1: Select provider type
  □ Step 2: Basic info (name, description)
  □ Step 3: Credentials (provider-specific form)
  □ Step 4: Limits configuration
  □ Step 5: Review & test connection
□ Create Edit Account modal
  □ Tabs: General, Credentials, Limits, Restrictions
  □ Test connection button
□ Create Account Detail page (/settings/accounts/[id])
  □ Summary card
  □ Usage meters (daily, monthly, yearly)
  □ Health score gauge
  □ Recent transactions
  □ Limit configuration
  □ Activity log
□ Create usage visualization
  □ Progress bars for limits
  □ Charts for historical usage
  □ Alerts when approaching limits
```

#### Day 3-4: Account Pools UI
```
□ Create /settings/pools page
  □ Pools list
    □ Name, strategy, accounts count, status
    □ Default pool badge
  □ Quick actions
□ Create Add Pool modal
  □ Name, description
  □ Strategy selector with explanations
  □ Select accounts to include
  □ Configure weights/priorities
□ Create Pool Detail page (/settings/pools/[id])
  □ Pool summary
  □ Strategy configuration
  □ Accounts list with weights
    □ Drag-drop reorder
    □ Weight sliders
    □ Add/remove accounts
  □ Failover configuration
  □ Pool statistics
    □ Transaction distribution pie chart
    □ Success rate by account
    □ Volume by account
□ Create Pool Testing tool
  □ Simulate transactions
  □ See which account would be selected
  □ Test failover behavior
```

#### Day 5: Integration & Testing
```
□ Integrate account selection with payment flow
  □ Update transaction processing
  □ Select account based on pool/rules
  □ Log routing decision
□ Update transaction model
  □ Add merchantAccountId
  □ Add routingDecisionId
□ Update transaction list UI
  □ Show which account was used
  □ Show if failover occurred
□ Test complete flow
  □ Create accounts
  □ Create pool
  □ Process transaction
  □ Verify correct account selected
  □ Test failover
□ Performance testing
  □ Account selection < 50ms
  □ No N+1 queries
```

---

## PHASE 3: GATEWAY RULE ENGINE
### Weeks 8-10 | Routing Rules, Conditions, Actions

---

### Week 10: Rule Engine Core

#### Day 1-2: Rule Models
```
□ Create RoutingRule Prisma model
  □ id, companyId
  □ name, description
  □ priority (lower = higher priority)
  □ isActive, isDefault
  □ conditions (JSON array)
    □ Each condition: { type, operator, value, logic }
  □ actions (JSON array)
    □ Each action: { type, params }
  □ schedule (JSON)
    □ startDate, endDate
    □ timeWindows
    □ daysOfWeek
  □ analytics (JSON)
    □ hitCount, lastHitAt
    □ successCount, failureCount
  □ version
  □ createdAt, updatedAt, createdBy
□ Create RuleVersion Prisma model (for history)
  □ ruleId, version
  □ conditions, actions, schedule
  □ createdAt, createdBy
□ Update RoutingDecision model
  □ Add ruleId, ruleVersion
  □ Add conditionResults (JSON)
□ Run Prisma migration
```

#### Day 3-4: Condition Evaluators
```
□ Create evaluator interface
  □ evaluators/condition-evaluator.interface.ts
  □ evaluate(condition, context): boolean
□ Implement GeographyEvaluator
  □ country (equals, in list, not in list)
  □ state/province
  □ region (NA, EU, APAC, etc.)
  □ continent
  □ currency
  □ isDomestic
  □ isEU / isEEA
  □ isSanctionedCountry
  □ isHighRiskCountry
□ Implement AmountEvaluator
  □ equals, greaterThan, lessThan
  □ between (min, max)
  □ inTier (tiered ranges)
  □ Currency conversion support
□ Implement TimeEvaluator
  □ hourOfDay (0-23)
  □ dayOfWeek (0-6)
  □ isWeekend
  □ isBusinessHours (configurable)
  □ isHoliday (holiday calendar)
  □ dateRange (start, end)
□ Implement CustomerEvaluator
  □ customerType (new, returning, vip)
  □ accountAge (days)
  □ lifetimeValue (amount)
  □ riskLevel (low, medium, high)
  □ chargebackRate (percentage)
  □ inSegment (segment IDs)
□ Implement ProductEvaluator
  □ sku (equals, in list)
  □ category
  □ isSubscription
  □ subscriptionInterval (monthly, yearly)
  □ isRenewal
  □ isTrial
□ Implement PaymentMethodEvaluator
  □ cardBrand (visa, mastercard, amex, discover)
  □ cardType (credit, debit, prepaid)
  □ binRange (first 6 digits)
  □ issuingCountry
  □ isTokenized
  □ is3DSEnrolled
  □ isDigitalWallet (apple_pay, google_pay)
□ Create EvaluatorFactory
  □ Get evaluator by condition type
□ Test all evaluators
```

#### Day 5: Rule Actions
```
□ Create action interface
  □ actions/rule-action.interface.ts
  □ execute(action, context): ActionResult
□ Implement RouteToPoolAction
  □ Set target pool ID
  □ Override strategy (optional)
□ Implement RouteToAccountAction
  □ Set target account ID directly
  □ Skip pool selection
□ Implement BlockAction
  □ Block transaction
  □ Set decline reason
  □ Optional: block permanently or temporarily
□ Implement SurchargeAction
  □ Add percentage surcharge
  □ Add flat fee surcharge
  □ Cap maximum surcharge
□ Implement DiscountAction
  □ Apply percentage discount
  □ Apply flat discount
□ Implement Require3DSAction
  □ Force 3D Secure verification
□ Implement FlagForReviewAction
  □ Flag transaction for manual review
  □ Set review reason
  □ Optional: hold funds
□ Implement AddMetadataAction
  □ Add key-value pairs to transaction
□ Implement SendNotificationAction
  □ Send webhook
  □ Send email alert
□ Create ActionExecutor
  □ Execute actions in order
  □ Handle action failures
  □ Log action results
```

---

### Week 10: Rule Engine Service & API

#### Day 1-2: Rule Engine Service
```
□ Create rule-engine.service.ts
  □ loadRules(companyId)
    □ Cache rules in Redis
    □ Invalidate on rule change
  □ evaluateRules(transaction, context)
    □ Load rules (cached)
    □ Filter by schedule (active rules only)
    □ Sort by priority
    □ Evaluate conditions for each rule
    □ First match wins
    □ Execute actions
    □ Return routing decision
  □ createRoutingDecision()
    □ Log all evaluation details
    □ Store condition results
    □ Record timing
□ Create condition group logic
  □ Support AND / OR grouping
  □ Nested condition groups
□ Create default rule handling
  □ Company default pool
  □ System fallback
□ Optimize performance
  □ Cache compiled rules
  □ Short-circuit evaluation
  □ Target < 10ms evaluation time
```

#### Day 3: Rule CRUD API
```
□ Create routing-rules module
  □ routing-rules.controller.ts
  □ routing-rules.service.ts
  □ DTOs
□ Implement endpoints
  □ POST /api/routing-rules
    □ Create new rule
    □ Validate conditions and actions
    □ Set initial priority
  □ GET /api/routing-rules
    □ List rules with filters
    □ Order by priority
  □ GET /api/routing-rules/:id
    □ Include version history
    □ Include analytics
  □ PATCH /api/routing-rules/:id
    □ Update rule
    □ Create version snapshot
    □ Invalidate cache
  □ DELETE /api/routing-rules/:id
    □ Soft delete
  □ POST /api/routing-rules/reorder
    □ Bulk update priorities
    □ Accept array of {id, priority}
  □ PATCH /api/routing-rules/:id/toggle
    □ Enable/disable rule
  □ POST /api/routing-rules/:id/duplicate
    □ Clone rule
    □ Set as inactive
```

#### Day 4-5: Rule Testing & Analytics
```
□ Create rule testing endpoint
  □ POST /api/routing-rules/test
    □ Accept test transaction data
    □ Evaluate all rules
    □ Return matched rule
    □ Return all condition results
    □ Show routing decision
    □ Don't actually process
□ Create rule simulation
  □ POST /api/routing-rules/simulate
    □ Run against historical transactions
    □ Show what would have matched
    □ Compare to actual routing
□ Create rule analytics
  □ GET /api/routing-rules/:id/analytics
    □ Hit count by day
    □ Success/failure by rule
    □ Top matching conditions
  □ Update analytics on each match
    □ Increment counters
    □ Track performance
□ Integrate with payment flow
  □ Call rule engine before account selection
  □ Apply routing decision
  □ Apply surcharges/discounts
  □ Handle blocks
  □ Handle review flags
```

---

### Week 10: Rule Engine Dashboard

#### Day 1-2: Rules List & Management
```
□ Create /settings/routing page
  □ Rules list (priority order)
    □ Name, status, priority, hit count
    □ Quick toggle on/off
    □ Drag-drop reorder
  □ Filter by status
  □ Search by name
□ Create rule quick view
  □ Expand row to see conditions/actions
  □ Quick edit common settings
□ Create rule status indicators
  □ Active (green)
  □ Inactive (gray)
  □ Scheduled (blue)
  □ Error (red)
```

#### Day 3-4: Rule Builder UI
```
□ Create Rule Builder wizard
  □ Step 1: Basic Info
    □ Name, description
    □ Priority (suggest next available)
  □ Step 2: Conditions
    □ Visual condition builder
    □ Add condition button
    □ Condition type selector
    □ Operator selector
    □ Value input (type-specific)
    □ AND/OR toggle
    □ Group conditions
    □ Remove condition
  □ Step 3: Actions
    □ Action type selector
    □ Action configuration (type-specific)
    □ Order actions
  □ Step 4: Schedule (optional)
    □ Start/end dates
    □ Time windows
    □ Days of week
  □ Step 5: Review
    □ Summary of rule
    □ Test with sample data
    □ Save as draft or active
□ Create condition components
  □ GeographyCondition (country picker, region selector)
  □ AmountCondition (amount input, currency, comparison)
  □ TimeCondition (time picker, day selector)
  □ CustomerCondition (type selector, value input)
  □ ProductCondition (category picker, sku input)
  □ PaymentCondition (card brand selector, type selector)
□ Create action components
  □ RouteAction (pool/account selector)
  □ BlockAction (reason input)
  □ SurchargeAction (percentage/flat inputs)
  □ FlagAction (reason, severity)
```

#### Day 5: Rule Testing UI & Polish
```
□ Create Rule Testing tool
  □ Sample transaction form
    □ Amount, currency
    □ Customer info
    □ Card info (brand, type)
    □ Product info
    □ Billing address
  □ "Test Rules" button
  □ Results display
    □ Matched rule (or default)
    □ All evaluated rules with results
    □ Condition breakdown
    □ Actions that would execute
□ Create A/B Testing setup (basic)
  □ Mark rules for testing
  □ Configure split percentage
  □ Track results separately
□ Polish and test
  □ Edit existing rules
  □ Duplicate rules
  □ Version history view
  □ Analytics charts
□ Document rule engine
  □ Condition reference
  □ Action reference
  □ Best practices
```

---

## PHASE 4: BILLING SYSTEM
### Weeks 11-12 | Usage Tracking, Plans, Invoicing

---

### Week 11: Usage Tracking & Plans

#### Day 1-2: Billing Models
```
□ Create PricingPlan Prisma model
  □ id, name, description
  □ monthlyPrice, yearlyPrice
  □ includedTransactions
  □ includedVolume
  □ includedAccounts
  □ includedCompanies
  □ includedUsers
  □ overageTransactionFee
  □ overageVolumeFee
  □ features (JSON array)
  □ isActive, isPublic
  □ createdAt, updatedAt
□ Create ClientSubscription model
  □ id, clientId, planId
  □ status (active, cancelled, past_due, trialing)
  □ billingCycle (monthly, yearly)
  □ currentPeriodStart, currentPeriodEnd
  □ cancelledAt, cancelReason
  □ stripeSubscriptionId
  □ stripeCustomerId
  □ createdAt, updatedAt
□ Create UsagePeriod model
  □ id, clientId
  □ periodStart, periodEnd
  □ transactionCount, transactionVolume
  □ accountCount, companyCount, userCount
  □ apiCallCount
  □ isClosed
  □ createdAt
□ Create UsageEvent model
  □ id, clientId, companyId
  □ eventType (transaction, api_call, etc.)
  □ quantity, amount
  □ metadata
  □ timestamp
□ Create Invoice model
  □ id, clientId, subscriptionId
  □ periodStart, periodEnd
  □ subtotal, tax, total
  □ status (draft, sent, paid, void)
  □ lineItems (JSON)
  □ stripeInvoiceId
  □ paidAt, dueDate
  □ pdfUrl
  □ createdAt
□ Run Prisma migration
```

#### Day 3-4: Usage Tracking Service
```
□ Create usage-tracking.service.ts
  □ trackTransaction(clientId, companyId, amount)
    □ Increment transaction count
    □ Add to volume
    □ Create UsageEvent
  □ trackApiCall(clientId, endpoint)
    □ Increment API call count
  □ trackResource(clientId, type, count)
    □ Update resource counts
  □ getCurrentUsage(clientId)
    □ Get current period usage
    □ Calculate vs plan limits
  □ getUsageHistory(clientId, periods)
    □ Historical usage data
□ Create usage aggregation job
  □ Run hourly
  □ Aggregate UsageEvents to UsagePeriod
  □ Clean up old events
□ Create period management
  □ Create new period at billing cycle
  □ Close old period
  □ Calculate overage
□ Integrate with existing services
  □ Track transaction on payment
  □ Track API calls in middleware
  □ Track resource changes
```

#### Day 5: Pricing Plans & Subscriptions
```
□ Seed pricing plans
  □ Starter Plan ($49/mo)
    □ 500 transactions
    □ $50,000 volume
    □ 2 merchant accounts
    □ 3 companies
    □ 5 users
  □ Growth Plan ($149/mo)
    □ 2,500 transactions
    □ $250,000 volume
    □ 10 merchant accounts
    □ 10 companies
    □ 25 users
    □ Priority support
  □ Pro Plan ($299/mo)
    □ 10,000 transactions
    □ $1,000,000 volume
    □ 50 merchant accounts
    □ 50 companies
    □ 100 users
    □ Advanced analytics
    □ API access
  □ Enterprise Plan (custom)
    □ Unlimited everything
    □ Custom pricing
    □ Dedicated support
□ Create billing.service.ts
  □ getClientSubscription(clientId)
  □ getClientPlan(clientId)
  □ checkUsageLimit(clientId, type)
  □ calculateOverage(clientId)
□ Create billing.controller.ts
  □ GET /api/billing/subscription
  □ GET /api/billing/usage
  □ GET /api/billing/plans
```

---

### Week 12: Invoicing & Dashboard

#### Day 1-2: Invoice Generation
```
□ Create invoice.service.ts
  □ generateInvoice(clientId, periodEnd)
    □ Get subscription and plan
    □ Get usage for period
    □ Calculate base charge
    □ Calculate overage charges
    □ Create line items
    □ Calculate tax
    □ Create Invoice record
  □ getInvoice(invoiceId)
  □ listInvoices(clientId)
  □ sendInvoice(invoiceId)
□ Create PDF generation
  □ Install pdfkit or puppeteer
  □ Create invoice template
    □ Company header
    □ Client info
    □ Period dates
    □ Line items table
    □ Subtotal, tax, total
    □ Payment info
  □ Generate PDF buffer
  □ Store in S3
  □ Return PDF URL
□ Create invoice endpoints
  □ GET /api/billing/invoices
  □ GET /api/billing/invoices/:id
  □ GET /api/billing/invoices/:id/pdf
□ Create invoice generation job
  □ Run at end of billing period
  □ Generate invoices for all active subscriptions
```

#### Day 3: Stripe Integration
```
□ Install Stripe SDK
□ Create stripe.service.ts
  □ createCustomer(client)
  □ createSubscription(customerId, planId)
  □ updateSubscription(subscriptionId, planId)
  □ cancelSubscription(subscriptionId)
  □ createPaymentMethod()
  □ getPaymentMethods(customerId)
□ Create Stripe webhook handler
  □ POST /api/webhooks/stripe
  □ Handle subscription events
    □ subscription.created
    □ subscription.updated
    □ subscription.deleted
  □ Handle invoice events
    □ invoice.paid
    □ invoice.payment_failed
  □ Handle payment events
□ Create subscription management
  □ POST /api/billing/subscription/upgrade
  □ POST /api/billing/subscription/downgrade
  □ POST /api/billing/subscription/cancel
```

#### Day 4-5: Billing Dashboard
```
□ Create /billing page
  □ Current Plan card
    □ Plan name and price
    □ Billing cycle
    □ Next billing date
    □ Upgrade/downgrade buttons
  □ Usage Summary
    □ Transactions: X / Y (progress bar)
    □ Volume: $X / $Y (progress bar)
    □ Accounts: X / Y
    □ Companies: X / Y
    □ Users: X / Y
  □ Usage Chart
    □ Daily transactions (30 days)
    □ Daily volume (30 days)
  □ Invoices table
    □ Date, amount, status
    □ Download PDF button
    □ View details
□ Create Plan Selection modal
  □ Compare plans
  □ Highlight current plan
  □ Select new plan
  □ Confirm change
□ Create Payment Methods section
  □ List saved cards
  □ Add new card (Stripe Elements)
  □ Set default
  □ Remove card
□ Test billing flow
  □ Create subscription
  □ Track usage
  □ Generate invoice
  □ Process payment
```

---

## PHASE 5: MOMENTUM INTELLIGENCE CORE
### Weeks 13-15 | Churn Prediction, Save System, Triggers

---

### Week 13: Intent Detection & Churn Prediction

#### Day 1-2: Churn Signal Models
```
□ Create ChurnSignal Prisma model
  □ id, customerId, companyId
  □ signalType (enum - 22 types)
  □ category (engagement, payment, behavior, lifecycle, external)
  □ weight (0-100)
  □ value (JSON - signal-specific data)
  □ detectedAt
  □ expiresAt
  □ isActive
□ Create ChurnRiskScore model
  □ id, customerId, companyId
  □ score (0-100)
  □ riskLevel (MINIMAL, LOW, MODERATE, HIGH, CRITICAL)
  □ signals (JSON - contributing signals)
  □ calculatedAt
  □ expiresAt
□ Create CustomerEngagementMetrics model
  □ customerId
  □ loginCount30d, loginCount7d
  □ lastLoginAt
  □ featureUsage (JSON)
  □ emailOpenRate, emailClickRate
  □ supportTicketCount
  □ npsScore
  □ updatedAt
□ Run Prisma migration
□ Define signal types enum
  □ ENGAGEMENT: login_drop, feature_usage_decline, email_engagement_drop
  □ PAYMENT: failed_payment, declined_card, payment_method_expired
  □ BEHAVIOR: cancel_page_visit, downgrade_inquiry, skip_increase, pause_request
  □ LIFECYCLE: contract_end_approaching, trial_ending, anniversary
  □ EXTERNAL: competitor_mention, complaint, negative_review
□ Define signal weights
  □ Create configuration file
  □ Weight by category and severity
```

#### Day 3-4: Signal Detection Service
```
□ Create churn-signal.service.ts
  □ detectSignals(customerId)
    □ Check all signal types
    □ Create signal records
    □ Expire old signals
  □ addSignal(customerId, signalType, value)
    □ Create with appropriate weight
    □ Set expiration
  □ getActiveSignals(customerId)
  □ Signal detectors
    □ detectLoginDrop() - compare 7d vs 30d
    □ detectFeatureUsageDrop()
    □ detectPaymentIssues()
    □ detectCancelIntent() - page visits, keywords
    □ detectSkipIncrease()
    □ detectContractEnd() - within 30 days
□ Create intent-detection.service.ts
  □ detectIntent(interaction)
    □ Analyze text for cancel intent
    □ Check for downgrade keywords
    □ Check for competitor mentions
  □ Keyword matching
  □ Optional: AI classification
□ Create signal decay
  □ Reduce weight over time
  □ Remove expired signals
```

#### Day 5: Risk Score Calculation
```
□ Create churn-risk.service.ts
  □ calculateRiskScore(customerId)
    □ Get active signals
    □ Apply weights
    □ Apply decay factors
    □ Calculate composite score
    □ Determine risk level
    □ Cache result (6 hours)
  □ getRiskScore(customerId)
    □ Return cached if valid
    □ Recalculate if expired
  □ Risk level thresholds
    □ MINIMAL: 0-20
    □ LOW: 21-40
    □ MODERATE: 41-60
    □ HIGH: 61-80
    □ CRITICAL: 81-100
□ Create risk monitoring job
  □ Run daily for all customers
  □ Identify high-risk customers
  □ Trigger alerts/automations
□ Create churn API endpoints
  □ GET /api/momentum/churn/risk/:customerId
  □ GET /api/momentum/churn/signals/:customerId
  □ GET /api/momentum/churn/high-risk
  □ POST /api/momentum/churn/detect
□ Create events
  □ 'churn.signal.detected'
  □ 'churn.risk.high'
  □ 'churn.risk.critical'
```

---

### Week 14: Customer Save System

#### Day 1-2: Save Flow Models
```
□ Create SaveFlowConfig Prisma model
  □ id, companyId
  □ isEnabled
  □ stages (JSON - 7 stages config)
  □ interventions (JSON - per cancel reason)
  □ nuclearOffer (JSON)
  □ winbackSequence (JSON)
  □ createdAt, updatedAt
□ Create SaveFlowSession model
  □ id, customerId, companyId
  □ status (in_progress, saved, cancelled, expired)
  □ currentStage (1-7)
  □ cancelReason
  □ stageHistory (JSON)
  □ interventionOffered (JSON)
  □ interventionAccepted
  □ savedAt, cancelledAt
  □ createdAt, updatedAt
□ Run Prisma migration
□ Define 7 stages
  □ PATTERN_INTERRUPT
  □ DIAGNOSIS_SURVEY
  □ BRANCHING_INTERVENTION
  □ NUCLEAR_OFFER
  □ LOSS_VISUALIZATION
  □ EXIT_SURVEY
  □ WINBACK
□ Define cancel reasons
  □ TOO_EXPENSIVE
  □ NOT_USING
  □ WRONG_PRODUCT
  □ SHIPPING_ISSUES
  □ QUALITY_ISSUES
  □ CUSTOMER_SERVICE
  □ FOUND_ALTERNATIVE
  □ OTHER
```

#### Day 3-4: Save Flow Service
```
□ Create save-flow.service.ts
  □ startSaveFlow(customerId, cancelReason)
    □ Create session
    □ Start at stage 1
    □ Apply pattern interrupt
  □ progressStage(sessionId, response)
    □ Record response
    □ Move to next stage
    □ Determine intervention based on reason
  □ offerIntervention(sessionId)
    □ Select appropriate offer
    □ Record offer made
  □ acceptIntervention(sessionId)
    □ Mark as saved
    □ Apply offer (discount, pause, etc.)
    □ Send confirmation
  □ rejectIntervention(sessionId)
    □ Move to next stage or nuclear offer
  □ completeSaveFlow(sessionId, outcome)
    □ Record final outcome
    □ Trigger appropriate events
□ Create intervention logic
  □ TOO_EXPENSIVE → discount offer
  □ NOT_USING → pause offer
  □ WRONG_PRODUCT → product swap
  □ SHIPPING_ISSUES → free shipping
  □ QUALITY_ISSUES → replacement + discount
□ Create nuclear offer
  □ Best possible deal
  □ 30% off + free item
  □ Only shown once
□ Create loss visualization
  □ Calculate accumulated value
    □ Rewards points
    □ Progress/status
    □ Exclusive perks
  □ Show what they'll lose
```

#### Day 5: Winback & API
```
□ Create winback.service.ts
  □ Winback sequence
    □ Day 7: "We miss you" email
    □ Day 14: Discount offer
    □ Day 30: Final offer
  □ scheduleWinback(customerId, cancelDate)
  □ processWinbackStep(customerId, step)
  □ Track winback conversions
□ Create save flow API
  □ POST /api/momentum/save/start
  □ POST /api/momentum/save/:id/progress
  □ POST /api/momentum/save/:id/intervention
  □ GET /api/momentum/save/:id
  □ GET /api/momentum/save/sessions (list)
□ Create events
  □ 'save.flow.started'
  □ 'save.flow.stage_changed'
  □ 'save.flow.intervention_offered'
  □ 'save.flow.customer_saved'
  □ 'save.flow.customer_cancelled'
□ Test save flow
  □ Start flow
  □ Progress through stages
  □ Test each intervention type
  □ Test nuclear offer
  □ Test winback scheduling
```

---

### Week 15: Behavioral Triggers Library

#### Day 1-2: Trigger System
```
□ Create BehavioralTrigger enum (13 triggers)
  □ PATTERN_INTERRUPT
  □ LOSS_AVERSION
  □ IDENTITY_ALIGNMENT
  □ SOCIAL_PROOF
  □ SCARCITY
  □ URGENCY
  □ RECIPROCITY
  □ ANCHORING
  □ FUTURE_PACING
  □ COMMITMENT_CONSISTENCY
  □ AUTHORITY
  □ OWNERSHIP_VELOCITY
  □ CONTRAST_PRINCIPLE
□ Create trigger configuration
  □ For each trigger:
    □ name, description
    □ conversionLift (expected %)
    □ bestFor (use cases)
    □ templates (example text)
    □ variables (dynamic content)
□ Create TriggerApplication model
  □ id, contentId
  □ triggerType
  □ appliedAt
  □ context (JSON)
  □ conversionTracked
```

#### Day 3-4: Trigger Implementation
```
□ Create behavioral-trigger.service.ts
  □ getTriggerConfig(triggerType)
  □ selectTriggers(context)
    □ Analyze customer context
    □ Select appropriate triggers
    □ Rank by expected impact
  □ applyTrigger(content, triggerType, context)
    □ Get trigger template
    □ Inject customer variables
    □ Return enhanced content
  □ trackTriggerConversion(triggerId, converted)
□ Implement each trigger
  □ PATTERN_INTERRUPT
    □ Break expected flow
    □ Show unexpected value proof
    □ "Before you go..." pattern
  □ LOSS_AVERSION
    □ Calculate what they'll lose
    □ Show accumulated value
    □ "You'll lose 2,450 points"
  □ IDENTITY_ALIGNMENT
    □ Reference their identity
    □ "As a coffee explorer..."
  □ SOCIAL_PROOF
    □ Show similar customers
    □ Success stories
    □ "87% of explorers..."
  □ SCARCITY
    □ Limited availability
    □ "Only 3 spots left"
  □ URGENCY
    □ Time-limited offers
    □ Countdown timers
  □ RECIPROCITY
    □ Give something first
    □ "Here's a free bag..."
  □ ANCHORING
    □ Show higher price first
    □ Then show discount
  □ FUTURE_PACING
    □ Paint future picture
    □ "Imagine discovering..."
  □ COMMITMENT_CONSISTENCY
    □ Reference past actions
    □ "You've explored 12 origins..."
  □ AUTHORITY
    □ Expert endorsements
    □ Certifications
  □ OWNERSHIP_VELOCITY
    □ Speed to ownership
    □ "Arriving tomorrow"
  □ CONTRAST_PRINCIPLE
    □ Compare options
    □ Make target look better
```

#### Day 5: Trigger Integration & Testing
```
□ Create trigger API
  □ GET /api/momentum/triggers
  □ GET /api/momentum/triggers/:type
  □ POST /api/momentum/triggers/apply
  □ POST /api/momentum/triggers/select
□ Integrate with save flow
  □ Apply triggers at each stage
  □ Track which triggers shown
□ Create trigger analytics
  □ Track usage per trigger
  □ Track conversion per trigger
  □ A/B test effectiveness
□ Test triggers
  □ Test each trigger type
  □ Verify variable substitution
  □ Test context-based selection
□ Document triggers
  □ Usage guidelines
  □ Best practices
  □ Examples
```

---

## PHASE 6: CUSTOMER SERVICE AI
### Weeks 16-17 | Voice AI, RMA, Refunds

---

### Week 16: Voice AI Customer Service

#### Day 1-2: CS Models & Configuration
```
□ Create CSConfig Prisma model
  □ id, companyId
  □ tier1Config (JSON)
    □ personaName ("Alex")
    □ personaStyle
    □ maxRefundAmount
    □ maxDiscount
    □ escalationTriggers
  □ tier2Config (JSON)
    □ personaName ("Sarah")
    □ personaStyle
    □ maxRefundAmount
    □ maxDiscount
    □ canApproveRMA
    □ canWaiveFees
  □ humanHandoffEnabled
  □ businessHours (JSON)
  □ createdAt, updatedAt
□ Create CSSession model
  □ id, customerId, companyId
  □ channel (chat, voice, email)
  □ currentTier (1, 2, 3)
  □ status (active, resolved, escalated, transferred)
  □ messages (JSON array)
  □ sentiment (positive, neutral, negative, irate)
  □ summary
  □ resolution
  □ csRepId (AI or human)
  □ startedAt, endedAt
  □ metadata
□ Run Prisma migration
```

#### Day 3-4: CS AI Service
```
□ Create cs-ai.service.ts
  □ startSession(customerId, channel, initialMessage)
  □ processMessage(sessionId, message)
    □ Detect intent
    □ Check sentiment
    □ Generate response
    □ Check escalation triggers
  □ escalateToTier2(sessionId)
    □ Transfer context
    □ Change persona
  □ escalateToHuman(sessionId)
    □ Prepare handoff summary
    □ Queue for human agent
□ Create AI prompt templates
  □ Tier 1 (Alex) system prompt
    □ Friendly, helpful
    □ Limited authority
    □ Knows when to escalate
  □ Tier 2 (Sarah) system prompt
    □ Professional, authoritative
    □ Can make decisions
    □ Final escalation to human
□ Integrate AWS Bedrock
  □ Create bedrock.service.ts
  □ Claude for conversation
  □ Handle context window
  □ Stream responses
□ Create escalation triggers
  □ Keyword detection (legal, lawyer, sue)
  □ Sentiment threshold (very negative)
  □ Request for manager
  □ Complex issue detection
  □ Irate customer detection
□ Create sentiment analysis
  □ Use Claude for analysis
  □ Track sentiment over session
  □ Alert on negative trend
```

#### Day 5: CS API & Integration
```
□ Create CS API endpoints
  □ POST /api/cs/session
  □ POST /api/cs/session/:id/message
  □ POST /api/cs/session/:id/escalate
  □ GET /api/cs/session/:id
  □ GET /api/cs/sessions (list)
  □ POST /api/cs/session/:id/resolve
□ Create events
  □ 'cs.session.started'
  □ 'cs.session.escalated'
  □ 'cs.irate.detected'
  □ 'cs.human_handoff.initiated'
  □ 'cs.session.resolved'
□ Create CS widget component
  □ Chat interface
  □ Message history
  □ Typing indicator
  □ Escalation notice
□ Test CS flow
  □ Simple inquiry
  □ Refund request
  □ Escalation path
  □ Human handoff
```

---

### Week 17: RMA & Refunds

#### Day 1-2: Refund System
```
□ Create RefundConfig Prisma model
  □ id, companyId
  □ autoRefundRules (JSON)
    □ maxAmount for auto
    □ firstComplaint allowed
    □ conditions
  □ approvalRequired (thresholds)
  □ fraudPrevention (JSON)
  □ createdAt, updatedAt
□ Create RefundRequest model
  □ id, transactionId, customerId, companyId
  □ type (AUTO, MANUAL, BULK, MANAGER_OVERRIDE)
  □ amount, reason
  □ status (pending, approved, rejected, processed)
  □ approvedBy, approvedAt
  □ processedAt
  □ metadata
□ Create refund.service.ts
  □ requestRefund(transactionId, amount, reason)
  □ checkAutoApproval(request)
    □ Check rules
    □ Auto-approve if eligible
  □ approveRefund(refundId, approverId)
  □ rejectRefund(refundId, reason)
  □ processRefund(refundId)
    □ Call payment provider
    □ Update transaction
□ Create refund API
  □ POST /api/refunds
  □ GET /api/refunds
  □ GET /api/refunds/:id
  □ PATCH /api/refunds/:id/approve
  □ PATCH /api/refunds/:id/reject
  □ POST /api/refunds/bulk
```

#### Day 3-4: RMA System
```
□ Create RMAConfig Prisma model
  □ id, companyId
  □ returnWindow (days)
  □ requirements (JSON)
    □ originalPackaging
    □ unopened
    □ receiptRequired
  □ shippingPolicy (client_paid, customer_paid)
  □ refundTiming (immediate, in_transit, after_inspection)
  □ fees (JSON)
    □ restockingFee
    □ processingFee
    □ openedProductFee
  □ portalEnabled
□ Create RMARequest model
  □ id, orderId, customerId, companyId
  □ rmaNumber (unique)
  □ status (requested, approved, shipped, received, inspected, completed)
  □ items (JSON)
  □ reason
  □ returnShippingLabel
  □ trackingNumber
  □ inspectionNotes
  □ refundAmount
  □ fees
  □ createdAt, updatedAt
□ Create rma.service.ts
  □ requestRMA(orderId, items, reason)
    □ AI save attempt first
    □ Check eligibility
    □ Create RMA
  □ approveRMA(rmaId)
    □ Generate shipping label
  □ updateTracking(rmaId, trackingNumber)
  □ markReceived(rmaId)
  □ completeInspection(rmaId, notes, refundAmount)
  □ completeRMA(rmaId)
    □ Process refund
    □ Send confirmation
□ Create RMA portal
  □ Public page for tracking
  □ /rma/:rmaNumber
  □ Status timeline
  □ Print label
```

#### Day 5: Terms & Conditions
```
□ Create TermsConditions Prisma model
  □ id, companyId
  □ type (return, subscription, refund, privacy, terms)
  □ title, content
  □ version
  □ aiSummary
  □ isActive
  □ createdAt, updatedAt
□ Create TermsAcceptance model
  □ id, customerId, termsId
  □ acceptedAt
  □ ipAddress
□ Create terms.service.ts
  □ uploadTerms(companyId, type, content)
  □ generateSummary(termsId)
    □ Use Claude to summarize
    □ Extract key points
  □ getTerms(companyId, type)
  □ acceptTerms(customerId, termsId)
  □ answerQuestion(termsId, question)
    □ AI-powered Q&A about policies
□ Create terms API
  □ POST /api/terms
  □ GET /api/terms
  □ GET /api/terms/:id
  □ POST /api/terms/:id/summarize
  □ POST /api/terms/:id/ask
  □ POST /api/terms/:id/accept
□ Integrate with CS AI
  □ AI can reference policies
  □ AI can answer policy questions
  □ AI can explain terms
```

---

## PHASE 7: COMMUNICATIONS
### Weeks 18-19 | Content Generation, Delivery

---

### Week 18: Content Generation Engine

#### Day 1-2: Content Models
```
□ Create ContentTemplate Prisma model
  □ id, companyId
  □ name, description
  □ type (EMAIL, SMS, PUSH, VOICE_SCRIPT, etc.)
  □ category (save_flow, winback, upsell, etc.)
  □ subject (for email)
  □ content (with variables)
  □ variables (JSON - available variables)
  □ triggers (JSON - behavioral triggers to apply)
  □ isActive
  □ createdAt, updatedAt
□ Create GeneratedContent model
  □ id, templateId, companyId
  □ type
  □ subject, content
  □ customerContext (JSON)
  □ triggersApplied (JSON)
  □ qualityScore
  □ status (draft, approved, sent)
  □ generatedAt
□ Create ContentGenerationConfig model
  □ id, companyId
  □ aiProvider (claude, ollama)
  □ qualityThreshold
  □ autoApprove
  □ brandVoice (JSON)
  □ restrictions (JSON)
□ Run Prisma migration
```

#### Day 3-4: Content Generation Service
```
□ Create content-generation.service.ts
  □ generateContent(templateId, customerId, context)
    □ Load template
    □ Get customer data
    □ Select behavioral triggers
    □ Generate with AI
    □ Apply quality checks
    □ Return content
  □ generateVariations(templateId, count)
    □ A/B test variations
  □ scoreQuality(content)
    □ Readability score
    □ Engagement prediction
    □ Trigger effectiveness
  □ approveContent(contentId)
  □ rejectContent(contentId, reason)
□ Create AI provider abstraction
  □ providers/ai-provider.interface.ts
  □ Implement ClaudeProvider (Bedrock)
  □ Implement OllamaProvider (self-hosted)
  □ AI routing logic
    □ Claude: complex, high-value
    □ Ollama: routine, bulk
□ Create prompt templates
  □ Email generation prompt
  □ SMS generation prompt
  □ Voice script prompt
  □ Include brand voice
  □ Include trigger instructions
□ Create variable substitution
  □ Customer name, email
  □ Order details
  □ Account stats
  □ Custom fields
```

#### Day 5: Content API & Dashboard
```
□ Create content API
  □ POST /api/content/generate
  □ GET /api/content
  □ GET /api/content/:id
  □ PATCH /api/content/:id/approve
  □ POST /api/content/templates
  □ GET /api/content/templates
  □ GET /api/content/templates/:id/render
□ Create content dashboard
  □ Templates list
  □ Template editor
    □ Visual editor
    □ Variable picker
    □ Trigger selector
    □ Preview
  □ Generated content review queue
  □ Quality analytics
□ Test content generation
  □ Generate from template
  □ Verify trigger application
  □ Check quality scoring
  □ Test variations
```

---

### Week 19: Delivery Orchestration

#### Day 1-2: Delivery Models
```
□ Create DeliveryConfig Prisma model
  □ id, companyId
  □ channels (JSON - enabled channels)
  □ emailProvider (ses)
  □ smsProvider (sns, twilio)
  □ pushProvider (sns)
  □ rateLimits (JSON)
    □ perCustomerDaily
    □ perCustomerWeekly
  □ sendTimeOptimization
  □ createdAt, updatedAt
□ Create DeliveryMessage model
  □ id, companyId, customerId
  □ channel (EMAIL, SMS, PUSH, etc.)
  □ contentId
  □ status (queued, sent, delivered, opened, clicked, failed)
  □ subject, content
  □ sentAt, deliveredAt, openedAt, clickedAt
  □ provider, providerMessageId
  □ metadata
  □ error
□ Create Automation Prisma model
  □ id, companyId
  □ name, description
  □ trigger (enum)
  □ triggerConfig (JSON)
  □ steps (JSON array)
  □ isActive
  □ createdAt, updatedAt
□ Create AutomationEnrollment model
  □ id, automationId, customerId
  □ currentStep
  □ status (active, completed, exited)
  □ enrolledAt, completedAt
□ Run Prisma migration
```

#### Day 3-4: Delivery Service
```
□ Create delivery.service.ts
  □ sendMessage(customerId, channel, content)
    □ Check rate limits
    □ Check unsubscribe status
    □ Queue message
    □ Track delivery
  □ processQueue()
    □ Batch processing
    □ Retry failed
  □ trackEvent(messageId, event)
    □ opened, clicked, etc.
□ Create channel providers
  □ email.provider.ts (AWS SES)
    □ Send email
    □ Handle bounces
    □ Track opens/clicks
  □ sms.provider.ts (AWS SNS / Twilio)
    □ Send SMS
    □ Handle delivery receipts
  □ push.provider.ts (AWS SNS)
    □ Send push notification
    □ Handle delivery
□ Create send-time optimization
  □ Track customer engagement times
  □ Predict best send time
  □ Queue for optimal delivery
□ Create webhook handlers
  □ SES notifications
  □ SNS delivery receipts
  □ Twilio status callbacks
□ Create delivery API
  □ POST /api/delivery/send
  □ GET /api/delivery/messages
  □ POST /api/delivery/track
```

#### Day 5: Automations
```
□ Create automation.service.ts
  □ createAutomation(config)
  □ enrollCustomer(automationId, customerId)
  □ processStep(enrollmentId)
  □ exitCustomer(enrollmentId, reason)
□ Define automation triggers
  □ CUSTOMER_CREATED
  □ SUBSCRIPTION_CANCELLED
  □ ORDER_PLACED
  □ CART_ABANDONED
  □ CHURN_RISK_HIGH
  □ CANCEL_PAGE_VISIT
  □ SAVE_FLOW_STARTED
  □ CUSTOM_EVENT
□ Define step types
  □ WAIT (delay)
  □ SEND_EMAIL
  □ SEND_SMS
  □ SEND_PUSH
  □ CONDITION (branch)
  □ UPDATE_CUSTOMER
  □ TRIGGER_WEBHOOK
□ Create automation processor job
  □ Run every minute
  □ Process due steps
  □ Handle conditions
  □ Track completion
□ Create automation API
  □ POST /api/automations
  □ GET /api/automations
  □ GET /api/automations/:id
  □ POST /api/automations/:id/enroll
  □ POST /api/automations/:id/pause
□ Create automation builder UI
  □ Visual flow builder
  □ Drag-drop steps
  □ Configure triggers
  □ Test automation
```

---

## PHASE 8: REVENUE & ANALYTICS
### Weeks 20-21 | Upsell Module, Analytics Dashboard

---

### Week 20: Upsell Module

#### Day 1-2: Upsell Models
```
□ Create UpsellConfig Prisma model
  □ id, companyId
  □ isEnabled
  □ triggers (JSON - when to show)
  □ frequencyLimits (JSON)
  □ cooldownPeriod
  □ channels (JSON - where to show)
□ Create UpsellOffer Prisma model
  □ id, companyId
  □ name, description
  □ type (PLAN_UPGRADE, ADD_ON, CROSS_SELL, etc.)
  □ targetProducts (JSON)
  □ offerProducts (JSON)
  □ discount (percentage or flat)
  □ conditions (JSON)
  □ priority
  □ isActive
  □ createdAt, updatedAt
□ Create UpsellPresentation model
  □ id, offerId, customerId
  □ channel
  □ trigger
  □ presentedAt
  □ outcome (accepted, declined, dismissed, expired)
  □ outcomeAt
  □ revenue (if accepted)
□ Run Prisma migration
```

#### Day 3-4: Upsell Service
```
□ Create upsell.service.ts
  □ getRecommendations(customerId, context)
    □ Analyze customer
    □ Match eligible offers
    □ Rank by likelihood
    □ Check frequency limits
    □ Return top offers
  □ presentOffer(customerId, offerId, channel)
    □ Check cooldown
    □ Create presentation record
    □ Track impression
  □ acceptOffer(presentationId)
    □ Apply offer
    □ Track conversion
    □ Calculate revenue
  □ declineOffer(presentationId)
  □ dismissOffer(presentationId)
□ Create recommendation engine
  □ Rule-based matching
  □ Customer affinity scoring
  □ Purchase history analysis
  □ Optional: ML model
□ Define upsell triggers
  □ HIGH_ENGAGEMENT
  □ PRODUCT_VIEW
  □ POST_PURCHASE
  □ PRE_RENEWAL
  □ CHECKOUT
  □ SAVE_FLOW_SUCCESS
  □ WINBACK_SUCCESS
□ Create upsell API
  □ POST /api/upsell/recommend
  □ GET /api/upsell/offers
  □ POST /api/upsell/offers
  □ POST /api/upsell/present
  □ POST /api/upsell/accept
  □ POST /api/upsell/decline
```

#### Day 5: Upsell UI & Testing
```
□ Create upsell components
  □ Upsell modal
  □ Upsell banner
  □ Upsell inline card
  □ Post-purchase upsell
□ Create upsell management UI
  □ Offers list
  □ Create/edit offer
  □ Offer analytics
□ Integrate with save flow
  □ Show upsell after save
  □ "Thank you for staying" offer
□ Integrate with checkout
  □ Pre-purchase upsell
  □ Cart add-ons
□ Test upsell flow
  □ Recommendation accuracy
  □ Presentation tracking
  □ Conversion tracking
  □ Revenue attribution
```

---

### Week 21: Analytics Dashboard

#### Day 1-2: Analytics Models
```
□ Create MetricSnapshot Prisma model
  □ id, companyId
  □ metricType
  □ period (hourly, daily, weekly, monthly)
  □ periodStart, periodEnd
  □ value (numeric)
  □ dimensions (JSON)
  □ createdAt
□ Create ReportConfig Prisma model
  □ id, companyId
  □ name
  □ type (churn, save_flow, cs, content, delivery, upsell)
  □ frequency (daily, weekly, monthly)
  □ recipients (JSON)
  □ format (json, csv, pdf)
  □ isActive
□ Run Prisma migration
```

#### Day 3-4: Analytics Service
```
□ Create analytics.service.ts
  □ getDashboard(companyId, dateRange)
    □ Aggregate all KPIs
    □ Compare to previous period
  □ getChurnAnalytics(companyId, dateRange)
    □ Churn rate by period
    □ Churn by reason
    □ Churn by tenure
    □ Top signals
  □ getSaveFlowAnalytics(companyId, dateRange)
    □ Save rate
    □ Stage funnel
    □ Intervention effectiveness
    □ Winback success
  □ getCSAnalytics(companyId, dateRange)
    □ Resolution rate
    □ Average handle time
    □ Sentiment distribution
    □ Escalation rate
  □ getContentAnalytics(companyId, dateRange)
    □ Quality scores
    □ Trigger usage
    □ A/B test results
  □ getDeliveryAnalytics(companyId, dateRange)
    □ Send volume
    □ Delivery rate
    □ Open rate
    □ Click rate
    □ By channel
  □ getUpsellAnalytics(companyId, dateRange)
    □ Acceptance rate
    □ Revenue by offer type
    □ Top performing offers
□ Create aggregation jobs
  □ Hourly aggregation
  □ Daily rollup
  □ Weekly rollup
  □ Monthly rollup
□ Create analytics API
  □ GET /api/analytics/dashboard
  □ GET /api/analytics/churn
  □ GET /api/analytics/save-flow
  □ GET /api/analytics/customer-service
  □ GET /api/analytics/content
  □ GET /api/analytics/delivery
  □ GET /api/analytics/upsell
```

#### Day 5: Analytics Dashboard UI
```
□ Create /analytics page
  □ Date range selector
  □ Period comparison toggle
□ Create KPI cards
  □ Churn Rate (vs previous)
  □ Save Rate (vs previous)
  □ Revenue Retained
  □ Customer LTV
  □ NPS Score
□ Create charts
  □ Churn trend line
  □ Save flow funnel
  □ Channel performance bars
  □ Trigger effectiveness
  □ Upsell revenue
□ Create segment views
  □ By customer segment
  □ By product
  □ By channel
□ Create scheduled reports
  □ Report configuration
  □ Recipient management
  □ Format selection
  □ Delivery scheduling
□ Create export functionality
  □ Export to CSV
  □ Export to PDF
  □ Export to JSON
□ Polish dashboard
  □ Loading states
  □ Empty states
  □ Error handling
  □ Responsive design
```

---

## PHASE 9: ALPHA DEPLOYMENT
### Weeks 22-24 | AWS Infrastructure, CI/CD, Launch

---

### Week 22: AWS Infrastructure

#### Day 1-2: Infrastructure as Code
```
□ Create Terraform project
  □ terraform/main.tf
  □ terraform/variables.tf
  □ terraform/outputs.tf
  □ modules/vpc/
  □ modules/ecs/
  □ modules/rds/
  □ modules/elasticache/
□ Create VPC
  □ CIDR: 10.0.0.0/16
  □ Public subnets (2 AZs)
  □ Private subnets (2 AZs)
  □ NAT Gateway
  □ Internet Gateway
  □ Route tables
□ Create Security Groups
  □ ALB security group
  □ ECS security group
  □ RDS security group
  □ ElastiCache security group
□ Create IAM roles
  □ ECS task execution role
  □ ECS task role
  □ CodePipeline role
  □ CodeBuild role
□ Create KMS keys
  □ RDS encryption key
  □ Secrets encryption key
  □ S3 encryption key
```

#### Day 3-4: Core Services
```
□ Create RDS PostgreSQL
  □ db.t3.small (alpha)
  □ Multi-AZ
  □ Encrypted at rest
  □ Automated backups (7 days)
  □ Private subnet placement
□ Create ElastiCache Redis
  □ cache.t3.micro
  □ Encryption in transit
  □ Private subnet
□ Create ECS Cluster
  □ Fargate capacity provider
□ Create ECS Services
  □ API service
    □ Task definition
    □ 0.5 vCPU, 1GB RAM
    □ Environment variables
    □ Secrets from Secrets Manager
  □ Dashboard service
    □ Task definition
    □ 0.25 vCPU, 0.5GB RAM
  □ Worker service (background jobs)
    □ Task definition
    □ 0.25 vCPU, 0.5GB RAM
□ Create Application Load Balancers
  □ API ALB
  □ Dashboard ALB
  □ HTTPS listeners
  □ Target groups
□ Create S3 buckets
  □ Logs bucket
  □ Backups bucket
  □ Assets bucket
□ Create ECR repositories
  □ api repository
  □ dashboard repository
  □ worker repository
```

#### Day 5: Secrets & DNS
```
□ Create Secrets Manager secrets
  □ database/credentials
  □ auth0/credentials
  □ paypal/credentials
  □ encryption/key
  □ stripe/credentials
□ Configure Route 53
  □ Hosted zone for avnz.io
  □ api.avnz.io → API ALB
  □ app.avnz.io → Dashboard ALB
□ Create ACM certificates
  □ *.avnz.io certificate
  □ Validate via DNS
□ Create CloudFront distributions
  □ Dashboard distribution
  □ API distribution (optional)
□ Configure WAF
  □ Rate limiting rules
  □ SQL injection protection
  □ XSS protection
  □ IP reputation rules
```

---

### Week 23: CI/CD & Monitoring

#### Day 1-2: CI/CD Pipeline
```
□ Create GitHub Actions workflows
  □ .github/workflows/ci.yml
    □ Lint
    □ Type check
    □ Unit tests
    □ Build validation
  □ .github/workflows/deploy-staging.yml
    □ Build images
    □ Push to ECR
    □ Deploy to staging
  □ .github/workflows/deploy-production.yml
    □ Require approval
    □ Deploy to production
□ Create CodePipeline
  □ Source stage (GitHub)
  □ Build stage (CodeBuild)
  □ Staging deploy stage
  □ Approval stage
  □ Production deploy stage
□ Create CodeBuild project
  □ buildspec.yml
  □ Build Docker images
  □ Push to ECR
  □ Run migrations
□ Create deployment scripts
  □ Blue/green deployment
  □ Rollback script
  □ Database migration script
□ Test pipeline
  □ Push to main
  □ Verify staging deploy
  □ Approve production
  □ Verify production deploy
```

#### Day 3-4: Monitoring & Alerting
```
□ Configure CloudWatch
  □ Log groups
    □ /ecs/avnz-api
    □ /ecs/avnz-dashboard
    □ /ecs/avnz-worker
  □ Log retention (90 days)
  □ Metric filters
    □ Error count
    □ 5xx responses
    □ Latency percentiles
  □ Dashboards
    □ API metrics
    □ Database metrics
    □ Cache metrics
□ Create CloudWatch Alarms
  □ CPU > 80%
  □ Memory > 80%
  □ Error rate > 1%
  □ 5xx responses > 10/min
  □ Response time p95 > 1s
  □ Database connections > 80%
  □ Queue depth > 1000
□ Configure Datadog
  □ Install agent on ECS tasks
  □ APM tracing
  □ Log collection
  □ Custom dashboards
  □ SLO monitoring
□ Configure Sentry
  □ API project
  □ Dashboard project
  □ Release tracking
  □ Error alerts
□ Configure alerts
  □ Slack integration
  □ Email alerts
  □ PagerDuty (optional)
□ Create health endpoints
  □ GET /health
  □ GET /health/ready
  □ GET /health/live
```

#### Day 5: Security & Backup
```
□ Security hardening
  □ Review security groups
  □ Review IAM policies
  □ Enable CloudTrail
  □ Enable Config rules
  □ Enable GuardDuty
□ Backup configuration
  □ RDS automated backups
  □ RDS snapshot schedule
  □ S3 versioning
  □ S3 lifecycle policies
□ Disaster recovery
  □ Document RTO/RPO
  □ Test restore procedure
  □ Cross-region backup (optional)
□ Create runbooks
  □ Incident response
  □ Rollback procedure
  □ Database restore
  □ Common issues
```

---

### Week 24: Production Launch

#### Day 1-2: Pre-Launch Testing
```
□ Deploy to staging
  □ Full deployment
  □ Run all migrations
  □ Seed test data
□ Smoke tests
  □ API health check
  □ Dashboard loads
  □ Login works
  □ Database connected
  □ Redis connected
□ Integration tests
  □ Full payment flow
  □ PayPal sandbox transaction
  □ Auth flow
  □ Save flow
□ Security testing
  □ SSL certificate check
  □ Security headers
  □ Penetration test (basic)
  □ OWASP checks
□ Performance testing
  □ Load test with k6
  □ Verify response times
  □ Check database queries
  □ Monitor resource usage
```

#### Day 3-4: Production Deploy
```
□ Final checklist
  □ All environment variables set
  □ All secrets in Secrets Manager
  □ DNS propagated
  □ SSL certificates valid
  □ WAF rules active
  □ Monitoring configured
  □ Alerts configured
  □ Backup verified
□ Deploy to production
  □ Run deployment pipeline
  □ Verify successful deploy
  □ Check health endpoints
  □ Monitor logs
□ Coffee Explorer integration
  □ Configure webhooks
  □ Process test transaction
  □ Verify logging
  □ Verify reporting
□ Post-deploy verification
  □ Complete payment flow
  □ Dashboard functionality
  □ Save flow test
  □ Check all integrations
```

#### Day 5: Stabilization & Handoff
```
□ Monitor first 24 hours
  □ Watch error rates
  □ Watch response times
  □ Watch resource usage
  □ Address any issues
□ Documentation
  □ API documentation (Swagger)
  □ Admin guide
  □ Troubleshooting guide
  □ Architecture diagram
□ Operational handoff
  □ Alert response procedures
  □ On-call setup
  □ Escalation paths
  □ Runbook review
□ Alpha milestone complete
  □ All features functional
  □ Production stable
  □ Monitoring active
  □ Documentation complete
□ Plan Phase 2 improvements
  □ Additional gateways (NMI, Authorize.Net)
  □ Enhanced ML models
  □ Additional analytics
  □ Performance optimization
```

---

## Summary Metrics

| Phase | Weeks | Duration | Features |
|-------|-------|----------|----------|
| Phase 1: Foundation | 1-4 | 4 weeks | Auth, RBAC, **Integrations Framework**, Hierarchy, Dashboard |
| Phase 2: Payment Core | 5-7 | 3 weeks | Multi-account, Pools, Load balancing |
| Phase 3: Gateway Rule Engine | 8-10 | 3 weeks | Rules, Conditions, Actions |
| Phase 4: Billing | 11-12 | 2 weeks | Usage, Plans, Invoicing |
| Phase 5: Momentum Core | 13-15 | 3 weeks | Churn, Save flow, Triggers |
| Phase 6: CS AI | 16-17 | 2 weeks | Voice AI, RMA, Refunds |
| Phase 7: Communications | 18-19 | 2 weeks | Content gen, Delivery |
| Phase 8: Revenue & Analytics | 20-21 | 2 weeks | Upsell, Analytics |
| Phase 9: Alpha Deployment | 22-24 | 3 weeks | AWS, CI/CD, Launch |
| **TOTAL** | **1-24** | **24 weeks** | **Complete platform** |

---

## Third-Party Service Integration Points

| Service | Phase | Integration |
|---------|-------|-------------|
| Auth0 | Phase 1 | Authentication |
| **Integrations UI** | **Phase 1** | **UI-configurable credentials** |
| AWS SES | Phase 7 | Email delivery |
| AWS SNS | Phase 7 | SMS, Push |
| Twilio | Phase 6, 7 | Voice AI, Advanced SMS |
| AWS Bedrock | Phase 5, 6, 7 | Claude AI |
| AWS SageMaker | Phase 5 | ML models |
| Stripe | Phase 4 | Billing |
| MaxMind | Phase 3 | Geolocation |
| Datadog | Phase 9 | APM |
| Sentry | Phase 9 | Error tracking |
| LaunchDarkly | Phase 3 | Feature flags |

---

## Key Architecture Decision: Integrations Framework

**All service credentials are now UI-configurable, not hardcoded in .env files.**

### Organization Level (Platform)
- Auth0 (authentication - org only, not client configurable)
- AWS SES, SNS, Bedrock (platform services)
- Monitoring (Datadog, Sentry)

### Client Level
- **Payment Gateways**: Own credentials OR use platform gateway
- Platform Gateway Pricing: 0.5% + $0.10/txn
- Future: Marketing (Klaviyo), SMS (Twilio)

This architecture allows:
1. Clients to use their own merchant accounts (lower cost)
2. Clients without merchant accounts to use platform gateway (convenience)
3. All configuration through dashboard, not code changes
4. Proper credential encryption and audit logging

---

*Complete Development Plan v1.1*
*Total: 24 weeks | All features | Full compliance*
*Includes Integrations Framework for UI-configurable services*
