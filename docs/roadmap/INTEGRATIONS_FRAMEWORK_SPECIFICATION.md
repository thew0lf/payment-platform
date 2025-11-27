# avnz.io - Integrations Framework Specification
## Platform & Client Integration Configuration System

---

## Document Information
- **Version:** 1.0
- **Created:** November 26, 2025
- **Status:** Approved for Development
- **Phase:** 1 (Foundation)

---

## Executive Summary

The Integrations Framework provides a unified system for configuring third-party service connections at both the Organization (platform) and Client levels. This replaces hardcoded .env configurations with a database-driven, UI-configurable approach.

### Key Principles
1. **No hardcoded credentials** - All integrations configurable via UI
2. **Hierarchical configuration** - Org sets defaults, Clients can override
3. **Platform-as-service option** - Clients can use avnz.io's integrations for a fee
4. **Encrypted storage** - All credentials encrypted at rest (AES-256-GCM)
5. **Audit trail** - All configuration changes logged

---

## Integration Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│  ORGANIZATION (avnz.io)                                             │
│  ├── Platform Integrations (internal use only)                      │
│  │   ├── Authentication (Auth0) - NOT client-configurable           │
│  │   ├── Email Service (AWS SES)                                    │
│  │   ├── SMS Service (AWS SNS/Twilio)                               │
│  │   ├── AI Services (AWS Bedrock)                                  │
│  │   └── Monitoring (Datadog, Sentry)                               │
│  │                                                                   │
│  └── Shared Integrations (available to clients for fee)             │
│      └── Payment Gateways (avnz.io's merchant accounts)             │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  CLIENT (Agency)                                                     │
│  ├── Payment Gateways                                               │
│  │   ├── Option A: Use Platform Gateway (fee: 0.5% + $0.10/txn)     │
│  │   └── Option B: Own Credentials (PayPal, NMI, Authorize.Net)     │
│  │                                                                   │
│  └── Future: Marketing & Communication                              │
│      ├── Email Marketing (Klaviyo, etc.)                            │
│      └── SMS Provider (Twilio, etc.)                                │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  COMPANY (Agency's Customer)                                         │
│  └── Inherits from Client (no direct integration config)            │
│      └── Uses Client's payment gateways                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Integration Categories

### 1. Platform Integrations (Org-Level Only)

These are internal platform services. Clients cannot see or configure these.

| Category | Services | Purpose |
|----------|----------|---------|
| **Authentication** | Auth0, Okta, Cognito | User login (NOT client-configurable) |
| **Transactional Email** | AWS SES | System emails, receipts |
| **SMS** | AWS SNS, Twilio | OTP, alerts |
| **AI/ML** | AWS Bedrock, SageMaker | AI features |
| **Storage** | AWS S3 | File storage |
| **Monitoring** | Datadog, Sentry | Error tracking, APM |
| **Feature Flags** | LaunchDarkly, AppConfig | Rollouts |

**Note:** Authentication providers (Auth0) are specifically excluded from the client-configurable integrations for security and compliance reasons.

### 2. Client Integrations (Client-Level)

Clients can configure these through their dashboard.

| Category | Phase | Services | Options |
|----------|-------|----------|---------|
| **Payment Gateways** | Phase 1 | PayPal Payflow, NMI, Authorize.Net, Stripe | Own or Platform |
| **Marketing Email** | Future | Klaviyo, Mailchimp | Own only |
| **SMS/Voice** | Future | Twilio, Vonage | Own only |
| **Webhooks** | Future | Custom endpoints | Own only |

---

## Payment Gateway Configuration

### Client Options

#### Option A: Use Platform Gateway (Default)
- Client uses avnz.io's merchant account
- **Pricing:** Base fee + per-transaction
  - 0.5% of transaction amount
  - $0.10 per transaction
  - Monthly minimum: $50
- **Benefits:**
  - No setup required
  - Instant activation
  - avnz.io handles PCI compliance
  - Included fraud protection
- **Limitations:**
  - Higher per-transaction cost
  - Funds settle to avnz.io first
  - Payout schedule (weekly)

#### Option B: Own Credentials
- Client enters their own merchant account credentials
- **Pricing:** Platform fee only
  - Transaction fee included in plan
  - No per-transaction markup
- **Benefits:**
  - Lower per-transaction cost
  - Direct settlement to client
  - Full control over merchant account
- **Requirements:**
  - Client has their own merchant account
  - Client responsible for PCI compliance
  - Must pass credential validation

### Supported Payment Providers (Phase 1)

| Provider | Status | Credential Fields |
|----------|--------|-------------------|
| **PayPal Payflow Pro** | ✅ Ready | Partner, Vendor, User, Password |
| **NMI** | 🔲 Planned | Security Key, Username, Password |
| **Authorize.Net** | 🔲 Planned | API Login ID, Transaction Key |
| **Stripe** | 🔲 Planned | Secret Key, Publishable Key |

---

## Data Models

### IntegrationCategory (Enum)
```typescript
enum IntegrationCategory {
  AUTHENTICATION = 'authentication',
  PAYMENT_GATEWAY = 'payment_gateway',
  EMAIL_TRANSACTIONAL = 'email_transactional',
  EMAIL_MARKETING = 'email_marketing',
  SMS = 'sms',
  VOICE = 'voice',
  PUSH_NOTIFICATION = 'push_notification',
  AI_ML = 'ai_ml',
  STORAGE = 'storage',
  MONITORING = 'monitoring',
  FEATURE_FLAGS = 'feature_flags',
  WEBHOOK = 'webhook',
}
```

### IntegrationProvider (Enum)
```typescript
enum IntegrationProvider {
  // Authentication (Org-only)
  AUTH0 = 'auth0',
  OKTA = 'okta',
  COGNITO = 'cognito',
  
  // Payment Gateways
  PAYPAL_PAYFLOW = 'paypal_payflow',
  NMI = 'nmi',
  AUTHORIZE_NET = 'authorize_net',
  STRIPE = 'stripe',
  
  // Email
  AWS_SES = 'aws_ses',
  SENDGRID = 'sendgrid',
  KLAVIYO = 'klaviyo',
  
  // SMS
  AWS_SNS = 'aws_sns',
  TWILIO = 'twilio',
  
  // AI
  AWS_BEDROCK = 'aws_bedrock',
  OPENAI = 'openai',
  
  // Storage
  AWS_S3 = 'aws_s3',
  
  // Monitoring
  DATADOG = 'datadog',
  SENTRY = 'sentry',
  CLOUDWATCH = 'cloudwatch',
  
  // Feature Flags
  LAUNCHDARKLY = 'launchdarkly',
  AWS_APPCONFIG = 'aws_appconfig',
}
```

### IntegrationDefinition (Reference Data)
```prisma
model IntegrationDefinition {
  id              String              @id @default(cuid())
  provider        IntegrationProvider @unique
  category        IntegrationCategory
  name            String              // "PayPal Payflow Pro"
  description     String
  logoUrl         String?
  documentationUrl String?
  
  // Availability
  isOrgOnly       Boolean             @default(false) // true = not client-configurable
  isClientAllowed Boolean             @default(true)
  isPlatformOffered Boolean           @default(false) // avnz.io offers this as service
  
  // Configuration Schema
  credentialSchema Json               // JSON Schema for credential fields
  settingsSchema   Json?              // JSON Schema for additional settings
  
  // Compliance
  requiredCompliance String[]         // ['soc2', 'pci_dss', 'iso27001']
  
  // Status
  status          String              @default("active") // active, beta, deprecated
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}
```

### PlatformIntegration (Org-Level)
```prisma
model PlatformIntegration {
  id              String              @id @default(cuid())
  organizationId  String
  provider        IntegrationProvider
  category        IntegrationCategory
  
  // Display
  name            String              // Friendly name
  description     String?
  
  // Encrypted Credentials
  credentials     Json                // Encrypted JSON
  
  // Settings
  settings        Json?               // Provider-specific settings
  environment     String              @default("production") // sandbox, production
  
  // For shared integrations (offered to clients)
  isSharedWithClients Boolean         @default(false)
  clientPricing   Json?               // Pricing if shared
  
  // Status
  status          String              @default("active") // active, inactive, error
  lastTestedAt    DateTime?
  lastTestResult  String?             // success, failure
  errorMessage    String?
  
  // Audit
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  createdBy       String
  updatedBy       String?
  
  // Relations
  organization    Organization        @relation(fields: [organizationId], references: [id])
  
  @@unique([organizationId, provider])
}
```

### ClientIntegration (Client-Level)
```prisma
model ClientIntegration {
  id              String              @id @default(cuid())
  clientId        String
  provider        IntegrationProvider
  category        IntegrationCategory
  
  // Display
  name            String              // Friendly name "My PayPal Account"
  description     String?
  
  // Configuration Mode
  mode            String              // 'own' | 'platform'
  
  // For 'own' mode: Encrypted Credentials
  credentials     Json?               // Encrypted JSON (null if using platform)
  
  // For 'platform' mode: Reference to platform integration
  platformIntegrationId String?
  
  // Settings
  settings        Json?               // Provider-specific settings
  environment     String              @default("production") // sandbox, production
  
  // Usage (for platform mode billing)
  usageThisMonth  Json?               // { transactions: 0, volume: 0 }
  
  // Priority & Default
  isDefault       Boolean             @default(false) // Default for this category
  priority        Int                 @default(0)     // For multiple of same type
  
  // Status
  status          String              @default("pending") // pending, active, inactive, error
  lastTestedAt    DateTime?
  lastTestResult  String?
  errorMessage    String?
  
  // Verification
  isVerified      Boolean             @default(false)
  verifiedAt      DateTime?
  verifiedBy      String?
  
  // Audit
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  createdBy       String
  updatedBy       String?
  
  // Relations
  client          Client              @relation(fields: [clientId], references: [id])
  platformIntegration PlatformIntegration? @relation(fields: [platformIntegrationId], references: [id])
  merchantAccounts MerchantAccount[]  // Payment gateways link to merchant accounts
  
  @@unique([clientId, provider, name])
}
```

### Credential Schemas (Per Provider)

```typescript
// PayPal Payflow Pro
const payflowCredentialSchema = {
  type: 'object',
  required: ['partner', 'vendor', 'user', 'password'],
  properties: {
    partner: { type: 'string', title: 'Partner', description: 'Your Payflow partner (usually PayPal)' },
    vendor: { type: 'string', title: 'Vendor/Merchant ID', description: 'Your merchant login ID' },
    user: { type: 'string', title: 'User', description: 'API user (same as vendor if not set up)' },
    password: { type: 'string', title: 'Password', format: 'password', description: 'API password' },
  }
};

// NMI
const nmiCredentialSchema = {
  type: 'object',
  required: ['securityKey'],
  properties: {
    securityKey: { type: 'string', title: 'Security Key', format: 'password' },
    username: { type: 'string', title: 'Username (optional)' },
    password: { type: 'string', title: 'Password (optional)', format: 'password' },
  }
};

// Authorize.Net
const authorizeNetCredentialSchema = {
  type: 'object',
  required: ['apiLoginId', 'transactionKey'],
  properties: {
    apiLoginId: { type: 'string', title: 'API Login ID' },
    transactionKey: { type: 'string', title: 'Transaction Key', format: 'password' },
  }
};

// Stripe
const stripeCredentialSchema = {
  type: 'object',
  required: ['secretKey'],
  properties: {
    secretKey: { type: 'string', title: 'Secret Key', format: 'password', pattern: '^sk_' },
    publishableKey: { type: 'string', title: 'Publishable Key', pattern: '^pk_' },
    webhookSecret: { type: 'string', title: 'Webhook Secret', format: 'password' },
  }
};
```

---

## API Endpoints

### Platform Integrations (Org Admin Only)

```
# List available integration types
GET /api/admin/integrations/definitions
→ Returns all IntegrationDefinitions

# List platform integrations
GET /api/admin/integrations/platform
→ Returns PlatformIntegrations for org

# Configure platform integration
POST /api/admin/integrations/platform
{
  "provider": "aws_ses",
  "name": "Production SES",
  "credentials": { ... },
  "settings": { ... },
  "environment": "production"
}

# Update platform integration
PATCH /api/admin/integrations/platform/:id
{
  "credentials": { ... },
  "settings": { ... }
}

# Test platform integration
POST /api/admin/integrations/platform/:id/test
→ Returns { success: boolean, message: string, latency: number }

# Delete platform integration
DELETE /api/admin/integrations/platform/:id

# Configure platform integration for client sharing
PATCH /api/admin/integrations/platform/:id/sharing
{
  "isSharedWithClients": true,
  "clientPricing": {
    "type": "per_transaction",
    "percentageFee": 0.5,
    "flatFee": 10, // cents
    "monthlyMinimum": 5000 // cents
  }
}
```

### Client Integrations (Client Admin)

```
# List available integrations for clients
GET /api/integrations/available
→ Returns IntegrationDefinitions where isClientAllowed=true
→ Includes platform-offered options

# List client's integrations
GET /api/integrations
→ Returns ClientIntegrations for current client

# Get integration details
GET /api/integrations/:id
→ Returns single ClientIntegration with masked credentials

# Add own integration
POST /api/integrations
{
  "provider": "paypal_payflow",
  "mode": "own",
  "name": "My PayPal Account",
  "credentials": {
    "partner": "PayPal",
    "vendor": "mymerchant",
    "user": "mymerchant",
    "password": "mypassword123"
  },
  "environment": "sandbox",
  "isDefault": true
}

# Use platform integration
POST /api/integrations
{
  "provider": "paypal_payflow",
  "mode": "platform",
  "name": "Platform PayPal",
  "isDefault": true
}

# Update integration
PATCH /api/integrations/:id
{
  "credentials": { ... },
  "settings": { ... }
}

# Test integration
POST /api/integrations/:id/test
→ Returns { success: boolean, message: string }

# Set as default
PATCH /api/integrations/:id/default

# Delete integration
DELETE /api/integrations/:id

# Get integration usage (for platform mode)
GET /api/integrations/:id/usage
→ Returns usage stats and billing estimate
```

---

## Dashboard UI

### Organization Admin: Platform Integrations

**Route:** `/admin/integrations`

```
┌─────────────────────────────────────────────────────────────────────┐
│  Platform Integrations                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ AUTHENTICATION                                               │   │
│  │ ┌─────────────────────────────────────────────────────────┐ │   │
│  │ │ [Auth0 Logo] Auth0                          ● Connected │ │   │
│  │ │ Production tenant                    [Test] [Configure] │ │   │
│  │ └─────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ PAYMENT GATEWAYS                           [+ Add Gateway] │   │
│  │ ┌─────────────────────────────────────────────────────────┐ │   │
│  │ │ [PayPal Logo] PayPal Payflow Pro        ● Active        │ │   │
│  │ │ Platform Account (shared with clients)                  │ │   │
│  │ │ Client Pricing: 0.5% + $0.10/txn       [Configure]     │ │   │
│  │ └─────────────────────────────────────────────────────────┘ │   │
│  │ ┌─────────────────────────────────────────────────────────┐ │   │
│  │ │ [NMI Logo] NMI                          ○ Not configured│ │   │
│  │ │                                         [+ Configure]   │ │   │
│  │ └─────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ EMAIL                                                        │   │
│  │ ┌─────────────────────────────────────────────────────────┐ │   │
│  │ │ [AWS Logo] AWS SES                      ● Connected     │ │   │
│  │ │ us-east-1                        [Test] [Configure]     │ │   │
│  │ └─────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Client Admin: Integrations

**Route:** `/settings/integrations`

```
┌─────────────────────────────────────────────────────────────────────┐
│  Payment Integrations                                    [+ Add]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Choose how to process payments:                                    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ YOUR PAYMENT GATEWAYS                                        │   │
│  │                                                              │   │
│  │ ┌─────────────────────────────────────────────────────────┐ │   │
│  │ │ [PayPal Logo] My PayPal Account          ● Active ⭐    │ │   │
│  │ │ Mode: Own Credentials                     DEFAULT       │ │   │
│  │ │ Environment: Production                                 │ │   │
│  │ │ Last tested: 2 hours ago ✓            [Test] [Edit] [⋮]│ │   │
│  │ └─────────────────────────────────────────────────────────┘ │   │
│  │                                                              │   │
│  │ ┌─────────────────────────────────────────────────────────┐ │   │
│  │ │ [NMI Logo] Backup NMI                    ○ Inactive     │ │   │
│  │ │ Mode: Own Credentials                                   │ │   │
│  │ │ Environment: Production                                 │ │   │
│  │ │ Last tested: 5 days ago ✓             [Test] [Edit] [⋮]│ │   │
│  │ └─────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ── OR ──                                                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ USE PLATFORM GATEWAY                                         │   │
│  │                                                              │   │
│  │ Let avnz.io handle payment processing                       │   │
│  │                                                              │   │
│  │ ✓ No merchant account needed                                │   │
│  │ ✓ Instant activation                                        │   │
│  │ ✓ PCI compliance handled                                    │   │
│  │                                                              │   │
│  │ Pricing: 0.5% + $0.10 per transaction                       │   │
│  │ Monthly minimum: $50                                         │   │
│  │                                                              │   │
│  │                              [Enable Platform Gateway]       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Add Integration Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│  Add Payment Gateway                                           [X]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Step 1: Choose Provider                                            │
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ [PayPal]     │ │ [NMI]        │ │ [Auth.Net]   │                │
│  │ PayPal       │ │ NMI          │ │ Authorize    │                │
│  │ Payflow Pro  │ │              │ │ .Net         │                │
│  │     ✓        │ │              │ │              │                │
│  └──────────────┘ └──────────────┘ └──────────────┘                │
│                                                                     │
│  Step 2: Configuration                                              │
│                                                                     │
│  ○ Use my own credentials                                           │
│  ● Use platform gateway (+0.5% + $0.10/txn)                        │
│                                                                     │
│  [If own credentials selected:]                                     │
│                                                                     │
│  Name *                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ My PayPal Account                                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Partner *                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ PayPal                                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Vendor/Merchant ID *                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ MYMERCHANTID                                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  User *                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ MYMERCHANTID                                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Password *                                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ••••••••••••                                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Environment                                                        │
│  ○ Sandbox (for testing)                                           │
│  ● Production                                                       │
│                                                                     │
│  ☑ Set as default payment gateway                                  │
│                                                                     │
│                                   [Cancel]  [Test & Save]           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Integration with Existing Systems

### Merchant Account Relationship

When a ClientIntegration for a payment gateway is created:
1. A corresponding MerchantAccount is auto-created
2. MerchantAccount references the ClientIntegration
3. All payment processing uses the MerchantAccount abstraction

```
ClientIntegration (payment_gateway)
        │
        ▼
MerchantAccount
        │
        ▼
AccountPool → Transaction Processing
```

### Platform Gateway Flow

When a client uses platform gateway:
1. Transaction processed through platform's MerchantAccount
2. Platform fee calculated and tracked
3. Client billed at end of period
4. Funds settled to avnz.io → Payout to client

### Own Credentials Flow

When a client uses own credentials:
1. Transaction processed through client's MerchantAccount
2. No platform fee (included in plan)
3. Funds settle directly to client
4. Client manages their own merchant account

---

## Security Considerations

### Credential Encryption
- All credentials encrypted with AES-256-GCM
- Encryption key stored in AWS Secrets Manager
- Key rotation supported
- Credentials never logged

### Access Control
- Platform integrations: ORG_ADMIN only
- Client integrations: CLIENT_ADMIN only
- Credential viewing: Never shown in full (masked)
- Credential updates: Full replacement only

### Audit Logging
- All integration changes logged
- Credential access logged
- Test attempts logged
- Configuration changes tracked

### Compliance
- PCI DSS: Credentials encrypted, access logged
- SOC 2: Audit trail, access controls
- ISO 27001: Security controls documented

---

## Phase 1 Implementation Scope

### Included
- [ ] IntegrationDefinition seed data (payment gateways)
- [ ] PlatformIntegration model & CRUD
- [ ] ClientIntegration model & CRUD
- [ ] Credential encryption service
- [ ] Platform integrations UI (admin)
- [ ] Client integrations UI
- [ ] Add integration modal
- [ ] PayPal Payflow provider
- [ ] Integration testing endpoint
- [ ] MerchantAccount auto-creation
- [ ] Platform gateway option

### Deferred (Future Phases)
- NMI provider implementation
- Authorize.Net provider implementation
- Stripe provider implementation
- Marketing email integrations (Klaviyo)
- SMS integrations (Twilio)
- OAuth flow for third-party connections
- Webhook integrations

---

## Development Tasks

### Models & Migration
```
□ Create IntegrationCategory enum
□ Create IntegrationProvider enum
□ Create IntegrationDefinition model
□ Create PlatformIntegration model
□ Create ClientIntegration model
□ Update MerchantAccount to reference ClientIntegration
□ Run migration
□ Seed IntegrationDefinitions
```

### Services
```
□ Create integration-encryption.service.ts
□ Create integration-definition.service.ts
□ Create platform-integration.service.ts
□ Create client-integration.service.ts
□ Create integration-test.service.ts (test connections)
□ Create integration-sync.service.ts (sync with MerchantAccount)
```

### API Endpoints
```
□ GET /api/admin/integrations/definitions
□ GET /api/admin/integrations/platform
□ POST /api/admin/integrations/platform
□ PATCH /api/admin/integrations/platform/:id
□ POST /api/admin/integrations/platform/:id/test
□ DELETE /api/admin/integrations/platform/:id

□ GET /api/integrations/available
□ GET /api/integrations
□ POST /api/integrations
□ PATCH /api/integrations/:id
□ POST /api/integrations/:id/test
□ DELETE /api/integrations/:id
```

### Dashboard UI
```
□ /admin/integrations page
□ Platform integration cards
□ Add platform integration modal
□ Edit platform integration modal
□ Client sharing configuration

□ /settings/integrations page
□ Client integration list
□ Add integration modal (multi-step)
□ Edit integration modal
□ Platform gateway option card
□ Integration status indicators
```

---

*Integrations Framework Specification v1.0*
