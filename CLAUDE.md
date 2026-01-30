# Payment Platform - Claude Code Instructions

## Review Commands

**IMPORTANT: Fix All Issues When Discovered**
When running any review command (`/review`, `/review-qa`, etc.) and issues are found, ALL issues must be fixed before proceeding to the next step. Do not skip issues or defer them - resolve each finding immediately after the review completes.

### Quick Reference

| Command | Role | Focus Area |
|---------|------|------------|
| `/review` | Senior Developer | Code quality, patterns, maintainability |
| `/review-arch` | Senior Architect | System design, scalability, infrastructure |
| `/review-dba` | Senior DBA | Database design, queries, data integrity |
| `/review-qa` | Senior QA Engineer | Test coverage, edge cases, quality gates |
| `/review-cmo` | Chief Marketing Officer | Messaging, conversion, brand, UX |
| `/review-seo` | SEO Manager | Search optimization, discoverability |
| `/review-copy` | Senior Copywriter | Copy quality, voice, persuasion, clarity |
| `/review-all` | Full Team | All roles review (comprehensive) |
| `/feature` | Senior Developer | Pre-implementation ticket review |

---

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
13. UI Patterns - No native dialogs (alert/confirm/prompt)? Uses toast/Dialog components?

**Verdict:** Approve | Approve with suggestions | Request changes

---

### `/review-arch` - Senior Architect Review
System architecture and infrastructure review. Use: `/review-arch [description or file path]`

**Checklist:**
1. System Design - Right architectural pattern? Microservices vs monolith?
2. Scalability - Can this handle 10x, 100x load? Horizontal scaling?
3. Reliability - Single points of failure? Failover strategy?
4. Data Flow - Clear data paths? Bottlenecks? Async vs sync?
5. Service Boundaries - Right separation of concerns? API contracts?
6. Infrastructure - Cloud-native? Container-ready? Serverless fit?
7. Integration Points - Third-party dependencies? Circuit breakers?
8. Cost Implications - Resource usage? Optimization opportunities?
9. Security Architecture - Defense in depth? Zero trust?
10. Observability - Logging, metrics, tracing strategy?
11. Disaster Recovery - Backup strategy? RTO/RPO requirements?
12. Future Extensibility - Locked in? Migration path?

**Verdict:** Architecture approved | Needs redesign | Requires POC

---

### `/review-dba` - Senior DBA Review
Database design and query optimization review. Use: `/review-dba [description or file path]`

**Checklist:**
1. Schema Design - Normalized? Denormalized where needed? Relationships correct?
2. Index Strategy - Right indexes? Missing indexes? Over-indexed?
3. Query Performance - N+1 queries? Full table scans? Explain analyze?
4. Data Integrity - Constraints? Foreign keys? Cascades appropriate?
5. Migration Safety - Reversible? Data loss risk? Lock duration?
6. Transaction Handling - Isolation levels? Deadlock potential?
7. Connection Pooling - Pool size? Connection limits? Timeout settings?
8. Data Volume - Partitioning needed? Archival strategy?
9. Backup & Recovery - Point-in-time recovery? Tested restores?
10. Replication - Read replicas? Sync vs async? Failover?
11. Security - Row-level security? Encrypted columns? Audit trail?
12. Compliance - PII handling? GDPR deletion? Data retention?

**Verdict:** Schema approved | Needs optimization | Requires migration plan

---

### `/review-qa` - Senior QA Engineer Review
Quality assurance and testing review. Use: `/review-qa [description or file path]`

**Checklist:**
1. Test Coverage - Unit tests? Integration tests? E2E tests? Coverage %?
2. Edge Cases - Boundary conditions? Null/empty handling? Error states?
3. Happy Path - Core user flows tested? Success scenarios?
4. Negative Testing - Invalid inputs? Unauthorized access? Rate limits?
5. Regression Risk - Breaking changes? Backward compatibility?
6. Test Data - Realistic data? Data factories? Fixtures?
7. Environment Parity - Tests match production? Config differences?
8. Performance Testing - Load tests? Stress tests? Benchmarks?
9. Security Testing - OWASP checks? Injection tests? Auth bypass?
10. Accessibility - WCAG compliance? Screen reader tested?
11. Cross-browser/Device - Browser matrix? Mobile responsive?
12. Documentation - Test plans? Bug reproduction steps?

**Verdict:** QA approved | Needs more tests | Blocking issues found

---

### `/review-cmo` - Chief Marketing Officer Review
Marketing, messaging, and conversion review. Use: `/review-cmo [description or file path]`

**Checklist:**
1. Value Proposition - Clear benefit? Compelling reason to act?
2. Messaging Clarity - Easy to understand? Jargon-free? Scannable?
3. Brand Consistency - Tone of voice? Visual identity? Guidelines followed?
4. Call-to-Action - Clear CTAs? Action-oriented? Urgency/scarcity?
5. Conversion Optimization - Friction points? Drop-off risks? Form length?
6. Customer Journey - Logical flow? Missing touchpoints? Dead ends?
7. Target Audience - Right messaging for persona? Segment-specific?
8. Trust Signals - Social proof? Testimonials? Security badges? Guarantees?
9. Competitive Differentiation - Unique value clear? Why us vs them?
10. Emotional Appeal - Pain points addressed? Aspirational messaging?
11. Mobile Experience - Thumb-friendly? Fast loading? Readable?
12. Legal Compliance - Disclaimers? Terms visible? GDPR consent?

**Verdict:** Launch ready | Needs copy refinement | Needs UX revision

---

### `/review-seo` - SEO Manager Review
Search engine optimization review. Use: `/review-seo [description or file path]`

**Checklist:**
1. Keyword Strategy - Target keywords identified? Search intent matched?
2. Title Tags - Unique? Keyword-rich? Under 60 chars? Compelling?
3. Meta Descriptions - Unique? Action-oriented? Under 160 chars?
4. Header Structure - H1 unique? H2-H6 hierarchy? Keywords in headers?
5. URL Structure - Clean URLs? Keywords included? No parameters?
6. Internal Linking - Related content linked? Anchor text optimized?
7. Content Quality - Original? Comprehensive? E-E-A-T signals?
8. Image Optimization - Alt text? File names? Compression? WebP?
9. Page Speed - Core Web Vitals? LCP, FID, CLS metrics?
10. Mobile-First - Mobile-friendly? Responsive? No intrusive interstitials?
11. Schema Markup - Structured data? Rich snippets opportunity?
12. Crawlability - Robots.txt? Sitemap? Canonical tags? No broken links?

**Verdict:** SEO optimized | Needs improvements | Critical issues

---

### `/review-copy` - Senior Copywriter Review
Professional copy and content quality review. Use: `/review-copy [description or file path]`

**Role Description:**
The Senior Copywriter is the guardian of written communication across the platform. They ensure all customer-facing text—from UI microcopy to email templates, error messages to marketing pages—is clear, compelling, on-brand, and drives action. They understand that every word is an opportunity to build trust, reduce friction, and guide users toward their goals. They balance creativity with conversion, personality with professionalism, and brevity with completeness.

**AVNZ Brand Voice:**
We're the smart friend who happens to be a payment expert. Confident but not arrogant. Helpful but not hand-holdy. We celebrate wins, own mistakes, and always speak like a human—never a corporation.

| Voice Attribute | We Are | We're Not |
|-----------------|--------|-----------|
| **Confident** | Expert, assured, decisive | Arrogant, dismissive, condescending |
| **Friendly** | Warm, approachable, conversational | Overly casual, unprofessional, slangy |
| **Clear** | Direct, simple, jargon-free | Dumbed down, verbose, vague |
| **Empowering** | Encouraging, supportive, optimistic | Patronizing, pushy, fake-positive |
| **Witty** | Clever, playful, memorable | Sarcastic, try-hard, cringey |

**Tone by Context:**

| Context | Tone | Energy | Example |
|---------|------|--------|---------|
| **Marketing/Landing Pages** | Enthusiastic, aspirational | High 🔥 | "Stop leaving money on the table. Start recovering revenue today." |
| **Onboarding** | Encouraging, guiding | Medium-High ⚡ | "Great choice! Let's get your first integration connected—it only takes 2 minutes." |
| **Dashboard/UI** | Clear, professional | Medium 💼 | "3 transactions pending review" |
| **Success States** | Celebratory, confirming | Medium-High 🎉 | "Payment processed! Your customer just got their confirmation email." |
| **Warnings** | Calm, helpful | Medium ⚠️ | "This action will remove access for 3 team members. Want to continue?" |
| **Errors** | Empathetic, solution-focused | Low-Medium 🤝 | "We couldn't process that payment. The card may have expired—try another?" |
| **Error Pages (404/500)** | Light, reassuring | Low-Medium 😅 | "This page went on vacation. Let's get you back to familiar territory." |
| **Legal/Compliance** | Professional, precise | Low 📋 | "By continuing, you agree to our Terms of Service and Privacy Policy." |
| **Security Alerts** | Urgent, clear | High 🚨 | "Unusual login detected. If this wasn't you, secure your account now." |

**Checklist:**
1. Voice & Tone - Consistent with brand personality? Appropriate for context? (See tone table above)
2. Clarity - Instantly understandable? No ambiguity? Would a first-time user get it?
3. Conciseness - Every word earns its place? Cut the fluff? Active voice?
4. Action-Oriented - Clear next steps? Strong verbs? User knows what to do?
5. Emotional Resonance - Connects with reader's feelings? Addresses pain points? Aspirational where appropriate?
6. Persuasion & Urgency - Compelling reasons to act? Appropriate urgency without manipulation?
7. Microcopy Quality - Button text, labels, placeholders helpful? Tooltips informative?
8. Scanability - Headlines grab attention? Bullets where needed? Key info stands out?
9. Grammar & Mechanics - Spelling, punctuation, capitalization correct? Consistent style?
10. Inclusive Language - Accessible to all? No jargon unless audience expects it? Gender-neutral?
11. Brand Vocabulary - Using approved terms? Consistent naming? No conflicting terminology?
12. Legal & Compliance - Required disclaimers present? Claims substantiated? No misleading statements?

**Technical Copy Responsibilities:**

| Area | Responsibility | Examples |
|------|----------------|----------|
| **Form Validation** | Write clear, helpful error messages that tell users exactly what's wrong and how to fix it | "Email address is required" → "Please enter your email address so we can send your confirmation" |
| **Empty States** | Create engaging copy for empty lists, no results, and first-time experiences | "No orders yet" → "Your orders will appear here once you make your first purchase" |
| **Loading States** | Write reassuring messages for long operations | "Processing..." → "Securing your payment—almost there!" |
| **Success Messages** | Celebrate wins and confirm actions clearly | "Saved" → "Changes saved! Your profile is up to date." |
| **Error Pages** | Make 404, 500, and other error pages helpful and on-brand | "Page not found" → "Oops! This page took a coffee break. Let's get you back on track." |
| **Confirmation Dialogs** | Write clear, consequential dialog copy for destructive actions | "Are you sure?" → "Delete this order? This can't be undone." |
| **Toast Notifications** | Craft brief, informative system feedback messages | Keep under 10 words, include action when relevant |
| **Placeholder Text** | Write helpful input placeholders that guide without cluttering | "Enter email" → "you@company.com" |
| **Help Text** | Create contextual hints below form fields | Explain format, requirements, or why we're asking |
| **Onboarding Copy** | Guide new users through setup with encouraging, clear steps | Progress indicators, next step previews |
| **Email Templates** | Write transactional and marketing emails that get opened and acted on | Subject lines, preheaders, CTAs |
| **Push/SMS Notifications** | Craft urgent, actionable short-form messages | Character limits, clear value prop |

**Error Message Guidelines:**
- ❌ Don't blame the user: "Invalid input" / "Error" / "Failed"
- ✅ Do explain what happened: "We couldn't find an account with that email"
- ✅ Do tell them how to fix it: "Check the spelling or try another email"
- ✅ Do offer alternatives: "Forgot your email? Contact support"
- Keep error messages under 2 sentences
- Use sentence case, not ALL CAPS
- Never expose technical details (stack traces, error codes) to users

**Output Format:**
```
## Senior Copywriter Review: [Subject]

### Voice & Tone
[Assessment and specific examples]

### Clarity Issues
[List of unclear passages with rewrites]

### Suggested Rewrites
| Original | Suggested | Reason |
|----------|-----------|--------|
| "Click here to submit" | "Submit Application →" | More specific, action-oriented |

### Form & Validation Copy
| Field/Action | Current | Suggested |
|--------------|---------|-----------|
| Email error | "Invalid email" | "Please enter a valid email address (e.g., you@company.com)" |

### Microcopy Audit
[Review of buttons, labels, error messages, tooltips, empty states]

### Quick Wins
[Easy improvements with high impact]

### Critical Issues
[Must-fix before launch]
```

**Verdict:** Copy approved | Needs polish | Requires rewrite

---

### `/review-all` - Full Team Review
Comprehensive review by all team roles. Use: `/review-all [description or file path]`

This command runs ALL review checklists sequentially:
1. Senior Developer Review
2. Senior Architect Review
3. Senior DBA Review
4. Senior QA Engineer Review
5. CMO Review
6. SEO Manager Review
7. Senior Copywriter Review

**Output Format:**
```
## Full Team Review: [Subject]

### Senior Developer
[Checklist results]
**Verdict:** [verdict]

### Senior Architect
[Checklist results]
**Verdict:** [verdict]

### Senior DBA
[Checklist results]
**Verdict:** [verdict]

### Senior QA Engineer
[Checklist results]
**Verdict:** [verdict]

### Chief Marketing Officer
[Checklist results]
**Verdict:** [verdict]

### SEO Manager
[Checklist results]
**Verdict:** [verdict]

### Senior Copywriter
[Checklist results]
**Verdict:** [verdict]

---
## Summary
| Role | Verdict | Blockers |
|------|---------|----------|
| ... | ... | ... |

**Overall Status:** Ready for launch | Needs work | Blocked
```

---

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
│   ├── admin-dashboard/     # Next.js 14 admin frontend (port 3000)
│   ├── company-portal/      # Next.js public funnel frontend (port 3003)
│   └── founders-landing/    # Coming soon page (founders.avnz.io)
├── packages/
│   └── shared/              # Shared types and utilities
├── docs/
│   ├── roadmap/             # Development plans and specs
│   ├── reviews/             # Security and QA reviews
│   └── guides/              # Implementation guides
└── prisma/                  # Database schema (in apps/api)
```

---

## Current Status (January 27, 2026)

| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| Feature 01: Integrations Framework | ✅ Complete | ✅ Complete | UI-configurable credentials |
| Feature 02: Dynamic RBAC | ✅ Spec Complete | 🔲 Pending | Hierarchical permissions |
| Feature 03: Vendor System | ✅ Spec Complete | 🔲 Pending | Two-tier Vendor/VendorCompany |
| Feature 04: Gateway Risk Management | ✅ Complete | ✅ Complete | Chargebacks, reserves, risk profiles |
| Product Import System | ✅ Complete | 🔲 Pending | Roastify, field mapping, images |
| Client & Company Management | ✅ Complete | ✅ Complete | Org-level CRUD with audit logging |
| Auth & Auth0 SSO | ✅ Complete | ✅ Complete | JWT-based |
| Password Reset | ✅ Complete | ✅ Complete | SOC2/ISO compliant |
| Session Timeout | ✅ Complete | ✅ Complete | 15min timeout, activity detection |
| Email System | ✅ Complete | ✅ Complete | AWS SES, templating, logging |
| Funnels | ✅ Complete | ✅ Complete | Multi-stage sales funnels |
| Leads Module | ✅ Complete | ✅ Complete | Progressive capture, scoring |
| Company Portal | ✅ Complete | ✅ Complete | Public funnel frontend |
| Mobile Responsiveness | N/A | ✅ Complete | Touch-optimized, card views |
| CS AI Module | ✅ Complete | ✅ Complete | Voice AI, chat, tiered escalation |
| Cart Module | ✅ Complete | 🔲 Pending | Theming, catalog, upsells, inventory holds |
| Recommendations Module | ✅ Complete | 🔲 Pending | Also bought, you might like, frequently viewed |
| Upsell Module | ✅ Complete | 🔲 Pending | Bulk discounts, subscriptions, targeting |
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

### Company Settings Access Standard

**CRITICAL: This is the standard for ALL company-level settings across the platform.**

Company settings can be managed by:
- **ORGANIZATION** → Can manage settings for any company
- **CLIENT** → Can manage settings for companies they own
- **COMPANY** → Can manage their own company settings

This applies to ALL company-level configurations including:
- Cart theming and product catalog settings
- Recommendation configurations
- Upsell targeting rules
- Subscription configurations
- Bulk discount settings
- Abandonment recovery settings
- Any future company-level feature settings

**Implementation Pattern:**
```typescript
// Controller helper method - use in ALL controllers with company settings
private getCompanyId(user: AuthenticatedUser): string {
  if (user.scopeType === 'COMPANY') {
    return user.scopeId;
  }
  if (user.companyId) {
    return user.companyId;
  }
  throw new ForbiddenException('Company context required for this operation');
}

// For read operations that allow cross-company access for ORG/CLIENT admins
private async getCompanyIdForQuery(
  user: AuthenticatedUser,
  queryCompanyId?: string,
): Promise<string | undefined> {
  if (user.scopeType === 'COMPANY') {
    return user.scopeId;
  }
  if (queryCompanyId) {
    const canAccess = await this.hierarchyService.canAccessCompany(
      { sub: user.id, scopeType: user.scopeType as ScopeType, scopeId: user.scopeId },
      queryCompanyId,
    );
    if (!canAccess) {
      throw new ForbiddenException('Access denied to this company');
    }
    return queryCompanyId;
  }
  return undefined;
}
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

## No Mock/Fake Data Policy

**CRITICAL: ALL DATA MUST COME FROM THE API**

This project does NOT use mock, fake, or hardcoded data in production or development frontends. All data displayed in the admin dashboard, company portal, or any other frontend must be fetched from the backend API.

### Rules

1. **Never use mock/fake data as fallback** - If an API call fails, show an error state (toast, error message, empty state with error indicator). Never silently fall back to hardcoded data.

2. **No `MOCK_*` constants** - Do not create `MOCK_DATA`, `MOCK_TRIGGERS`, `MOCK_CUSTOMERS`, or similar constants in frontend code.

3. **No catch-block mock data** - Do not populate state with fake data in catch blocks:
   ```typescript
   // ❌ WRONG
   } catch (err) {
     setData(MOCK_DATA); // Never do this
   }

   // ✅ CORRECT
   } catch (err) {
     setError(err.message);
     setData([]);
     toast.error('Failed to load data');
   }
   ```

4. **Seed data for development** - Use `npx prisma db seed` to populate the database with realistic test data. All frontend pages should work with real database data.

5. **Empty states are valid** - If no data exists, show an appropriate empty state message. This is better than showing fake data.

### Why This Matters

- **Data Integrity**: Users must see real data from their database, not fabricated examples
- **Bug Discovery**: Fake data masks API and data issues that need to be fixed
- **Trust**: Users should trust that what they see reflects their actual business data
- **Testing**: Real API calls help identify performance and error handling issues

### Exceptions

- **Unit tests**: Mock data is acceptable in unit tests (`.spec.ts`, `.test.ts` files)
- **Storybook stories**: Component demonstration with mock data is acceptable
- **Seed scripts**: Database seed files (`prisma/seeds/`) should contain realistic sample data

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

### Schema Change Tracking

**IMPORTANT:** All database schema changes MUST be tracked in `docs/DATABASE_SCHEMA_CHANGELOG.md`.

**Rules:**
1. NEVER use `prisma db push` in development without documenting and creating a migration
2. Document changes BEFORE modifying `schema.prisma`
3. Create migration with `npx prisma migrate dev --name <description>`
4. Update status from `PENDING` to `MIGRATED` with migration file name
5. Commit schema.prisma + migration file together

**Pre-Deployment Check:**
```bash
# Verify no pending schema changes
grep -c "PENDING" docs/DATABASE_SCHEMA_CHANGELOG.md  # Should return 0

# Verify migrations are up to date
cd apps/api && npx prisma migrate status
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

## Security Patterns (REQUIRED)

**CRITICAL: All controllers must implement these security patterns. These checks are MANDATORY for SOC2/ISO27001 compliance.**

### Hierarchy Access Control

All controllers must validate scope-based access using `HierarchyService`:

```typescript
// Controller-level helper methods (REQUIRED for all modules)

/**
 * Get company ID for WRITE operations
 * Throws ForbiddenException if user lacks company context
 */
private getCompanyId(user: AuthenticatedUser): string {
  if (user.scopeType === 'COMPANY') {
    return user.scopeId;
  }
  if (user.companyId) {
    return user.companyId;
  }
  throw new ForbiddenException('Company context required for this operation');
}

/**
 * Get company ID for READ operations
 * Returns undefined for ORG/CLIENT users (allows cross-company queries)
 * Validates company access when query param is provided
 */
private async getCompanyIdForQuery(
  user: AuthenticatedUser,
  queryCompanyId?: string,
): Promise<string | undefined> {
  if (user.scopeType === 'COMPANY') {
    return user.scopeId; // COMPANY users always filtered by their company
  }

  if (queryCompanyId) {
    // Validate user can access the requested company
    const canAccess = await this.hierarchyService.canAccessCompany(
      { sub: user.id, scopeType: user.scopeType as ScopeType, scopeId: user.scopeId },
      queryCompanyId,
    );
    if (!canAccess) {
      throw new ForbiddenException('Access denied to this company');
    }
    return queryCompanyId;
  }

  return undefined; // ORG/CLIENT admins can see all
}
```

### Soft Delete Protection

All database queries must exclude soft-deleted records:

```typescript
// Service layer - ALWAYS include deletedAt check
async findAll(companyId: string | undefined, filters: QueryDto) {
  return this.prisma.entity.findMany({
    where: {
      ...(companyId && { companyId }),
      deletedAt: null, // REQUIRED - never omit
      ...filters,
    },
  });
}
```

### Organization Boundary Validation

For organization-level operations, verify the entity belongs to the user's organization:

```typescript
// When fetching cross-tenant data
const entity = await this.prisma.entity.findFirst({
  where: {
    id,
    organizationId: user.organizationId, // REQUIRED - enforce org boundary
    deletedAt: null,
  },
});

if (!entity) {
  throw new NotFoundException('Entity not found');
}
```

### Role Assignment Scope Validation

When assigning roles, verify the role scope is within the assigner's hierarchy:

```typescript
// Prevent privilege escalation
async assignRole(userId: string, roleId: string, assignerScopeType: ScopeType, assignerScopeId: string) {
  const role = await this.prisma.role.findUnique({ where: { id: roleId } });

  // Verify role scope is within assigner's scope hierarchy
  const canAssign = await this.isInAssignerScope(
    assignerScopeType,
    assignerScopeId,
    role.scopeType,
    role.scopeId,
  );

  if (!canAssign) {
    throw new ForbiddenException('Cannot assign roles from outside your scope');
  }
}
```

### Audit Log Access Control

Audit logs must be scoped to the user's access level:

```typescript
// Users can only view logs at or below their scope
private getUserScope(user: AuthenticatedUser): { scopeType: ScopeType; scopeId: string } {
  return {
    scopeType: user.scopeType as ScopeType,
    scopeId: user.scopeId,
  };
}
```

### Test Patterns for Security

All controller tests must include mock users with the `sub` property:

```typescript
const mockUser: AuthenticatedUser = {
  sub: 'user-123',        // REQUIRED - Auth0 subject
  id: 'user-123',
  email: 'user@test.com',
  role: 'ADMIN',
  scopeType: 'COMPANY',
  scopeId: 'company-1',
  organizationId: 'org-1',
  clientId: 'client-1',
  companyId: 'company-1',
  departmentId: undefined,
};
```

### Key Security Files

| File | Purpose |
|------|---------|
| `src/hierarchy/hierarchy.service.ts` | Scope validation methods |
| `src/auth/decorators/current-user.decorator.ts` | AuthenticatedUser type |
| `src/common/filters/prisma-exception.filter.ts` | Error handling |
| `docs/reviews/SECURITY_REVIEW_Dec2025.md` | Full security audit |

---

## Responsive Design

| Breakpoint | Width | Target |
|------------|-------|--------|
| Mobile | < 640px | Phones |
| Tablet | 640px - 1024px | Tablets |
| Desktop | > 1024px | Laptops |
| Large | > 1280px | Monitors |

### Mobile-First Principles

The admin dashboard follows mobile-first responsive design. All new components must:

1. **Work on mobile first** - Start with mobile layout, enhance for desktop
2. **Use responsive padding** - `p-4 md:p-6` (16px mobile, 24px desktop)
3. **Meet touch targets** - Minimum 44px height for interactive elements
4. **Hide complex tables on mobile** - Show card-based views instead

### Key Patterns

| Pattern | Implementation |
|---------|---------------|
| **Touch targets** | `min-h-[44px]` on buttons, `touch-manipulation` class |
| **Page padding** | `p-4 md:p-6` or `px-4 md:px-6` |
| **Card padding** | Handled by Card components automatically |
| **Typography** | `text-xl md:text-2xl` for headings |
| **Grids** | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| **Tables → Cards** | `hidden md:block` for table, `md:hidden` for cards |
| **Dialog width** | `w-[calc(100%-2rem)] sm:w-full max-w-lg` |
| **Dialog height** | `max-h-[calc(100vh-4rem)] overflow-y-auto` |

### Mobile Navigation

- **Tab bar**: Fixed bottom navigation on mobile (`MobileTabBar`)
- **More drawer**: Slide-up drawer for additional nav items
- **Back navigation**: `MobileBackHeader` component for detail pages
- **Sidebar**: Hidden on mobile, visible on tablet+

### Responsive Table/Card Pattern

Tables should transform to card views on mobile:

```tsx
{/* Desktop Table - hidden on mobile */}
<div className="hidden md:block">
  <Table>...</Table>
</div>

{/* Mobile Card View - hidden on desktop */}
<div className="md:hidden divide-y divide-border">
  {items.map(item => (
    <div className="p-4 active:bg-muted/50" onClick={() => navigate(item.id)}>
      {/* Card content with ChevronRight indicator */}
    </div>
  ))}
</div>
```

Use the `ResponsiveTable` component for new list pages:
```tsx
import { ResponsiveTable, Column } from '@/components/ui/responsive-table';

const columns: Column<Item>[] = [
  { key: 'name', header: 'Name', render: (item) => item.name, isPrimary: true },
  { key: 'status', header: 'Status', render: (item) => <Badge>{item.status}</Badge> },
];

<ResponsiveTable
  data={items}
  columns={columns}
  keyExtractor={(item) => item.id}
  onRowClick={(item) => router.push(`/items/${item.id}`)}
/>
```

### Button Touch Optimization

Buttons include touch-optimized styles by default:
- `touch-manipulation` - Prevents 300ms tap delay
- `active:scale-[0.98]` - Visual feedback on tap
- `min-h-[44px]` - WCAG-compliant touch target

### Key Files

- `apps/admin-dashboard/src/components/layout/sidebar.tsx` - Desktop sidebar
- `apps/admin-dashboard/src/components/layout/mobile-sidebar.tsx` - Mobile drawer
- `apps/admin-dashboard/src/components/layout/mobile-tab-bar.tsx` - Bottom tab navigation
- `apps/admin-dashboard/src/components/layout/mobile-back-header.tsx` - Back navigation
- `apps/admin-dashboard/src/components/ui/responsive-table.tsx` - Table/card switcher
- `apps/admin-dashboard/src/contexts/mobile-menu-context.tsx` - Menu state

### E2E Tests

Mobile responsiveness tests: `apps/admin-dashboard/e2e/mobile-responsiveness.spec.ts`

Test viewports:
- Mobile: 375x812 (iPhone X)
- Tablet: 768x1024 (iPad)

---

## Design Pattern Enforcement (MANDATORY)

**CRITICAL: All new pages and components MUST follow these design patterns. This has been a recurring issue - these patterns should be applied consistently WITHOUT reminders.**

### Mandatory Page Checklist

Before completing any new page, verify ALL items:

| # | Check | Required Pattern | Example |
|---|-------|------------------|---------|
| 1 | **Page container padding** | `p-4 md:p-6` | `<div className="p-4 md:p-6 space-y-6">` |
| 2 | **Page title typography** | `text-xl md:text-2xl` | `<h1 className="text-xl md:text-2xl font-bold">` |
| 3 | **Button touch targets** | `min-h-[44px] touch-manipulation` | `<Button className="min-h-[44px] touch-manipulation">` |
| 4 | **No native dialogs** | No `alert/confirm/prompt` | Use `toast` or `Dialog` components |
| 5 | **Loading states** | Skeleton or Loader2 spinner | Shows feedback during async operations |
| 6 | **Empty states** | Meaningful empty state UI | Icon + message when no data |
| 7 | **Error handling** | `toast.error()` for failures | Never fails silently |

### Quick Pattern Reference

```tsx
// ✅ CORRECT PAGE STRUCTURE - ALWAYS USE THIS PATTERN
export default function MyPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Page Title</h1>
        <Button className="min-h-[44px] touch-manipulation">
          Action
        </Button>
      </div>
      {/* Content */}
    </div>
  );
}

// ❌ WRONG - DO NOT CREATE PAGES LIKE THIS
export default function MyPage() {
  return (
    <div className="space-y-6">  {/* ❌ Missing p-4 md:p-6 */}
      <h1 className="text-2xl font-bold">Title</h1>  {/* ❌ Missing text-xl md: */}
      <Button>Action</Button>  {/* ❌ Missing touch targets */}
    </div>
  );
}
```

### Self-Check Before Creating Pages

When creating or modifying pages, mentally verify:

1. ✅ Does the outer container have `p-4 md:p-6`?
2. ✅ Do ALL h1 elements use `text-xl md:text-2xl`?
3. ✅ Do ALL buttons have `min-h-[44px] touch-manipulation`?
4. ✅ Are ALL confirmations using Dialog components (not `confirm()`)?
5. ✅ Are ALL error messages using `toast.error()` (not `alert()`)?

### Code Review Enforcement

**These are BLOCKING issues. PRs violating these patterns must be rejected.**

When reviewing frontend code, check:
- Page wrapper div has `p-4 md:p-6`
- H1 elements use `text-xl md:text-2xl`
- All Button components include `min-h-[44px] touch-manipulation`
- No usage of native browser dialogs (`alert`, `confirm`, `prompt`)

The `/review` command includes these as mandatory checks.

---

## Dark Mode Requirements

**CRITICAL: ALL new components MUST support both light and dark themes. This is a mandatory design requirement.**

### Mandatory Dark Mode Support

Every component that uses color classes must include corresponding `dark:` variants. The application supports system-preference-based theme switching, and components that don't properly support dark mode will appear broken to users.

### Color Pattern Reference

Use these standard light/dark mode pairs consistently throughout the application:

| Light Mode | Dark Mode Variant | Usage |
|------------|-------------------|-------|
| `bg-white` | `dark:bg-gray-900` | Primary backgrounds, cards, modals |
| `bg-gray-50` | `dark:bg-gray-800` | Secondary backgrounds, alternating rows |
| `bg-gray-100` | `dark:bg-gray-700` | Tertiary backgrounds, hover states |
| `text-gray-900` | `dark:text-gray-100` | Primary text, headings |
| `text-gray-700` | `dark:text-gray-300` | Secondary text, labels |
| `text-gray-600` | `dark:text-gray-400` | Tertiary text, descriptions |
| `text-gray-500` | `dark:text-gray-400` | Muted text, placeholders |
| `border-gray-200` | `dark:border-gray-700` | Primary borders, dividers |
| `border-gray-300` | `dark:border-gray-600` | Input borders, stronger dividers |
| `hover:bg-gray-50` | `dark:hover:bg-gray-800` | Hover states on white backgrounds |
| `hover:bg-gray-100` | `dark:hover:bg-gray-700` | Hover states on gray-50 backgrounds |

### Form Input Dark Mode

**All form inputs MUST include dark mode styles.** Use this pattern:

```tsx
// ✅ CORRECT - Form input with dark mode
<input
  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2"
/>

// ✅ CORRECT - Using shadcn/ui Input component (already styled)
<Input placeholder="Enter value" />

// ❌ WRONG - Missing dark mode styles
<input className="border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2" />
```

### Button Text on Colored Backgrounds

Buttons with dynamic or colored backgrounds (primary buttons, status buttons, etc.) must use `text-white`, NOT `text-foreground`:

```tsx
// ✅ CORRECT - White text on colored background
<button className="bg-blue-600 hover:bg-blue-700 text-white">
  Submit
</button>

// ✅ CORRECT - Primary button with explicit white text
<Button className="bg-primary text-white hover:bg-primary/90">
  Save Changes
</Button>

// ❌ WRONG - text-foreground can become invisible in dark mode
<button className="bg-blue-600 text-foreground">Submit</button>
```

### No Hardcoded Colors

**Never use inline styles with hardcoded hex colors:**

```tsx
// ❌ WRONG - Hardcoded colors break dark mode
<span style={{ color: '#111827' }}>Text</span>
<div style={{ backgroundColor: '#ffffff' }}>Content</div>

// ✅ CORRECT - Use Tailwind classes with dark variants
<span className="text-gray-900 dark:text-gray-100">Text</span>
<div className="bg-white dark:bg-gray-900">Content</div>
```

**Exception:** When a component accepts custom colors from props/configuration (e.g., brand colors, theme settings), use conditional rendering:

```tsx
// ✅ ACCEPTABLE - Dynamic colors from configuration
<div
  style={{ backgroundColor: settings.branding?.primaryColor || undefined }}
  className={!settings.branding?.primaryColor ? 'bg-blue-600' : ''}
>
  {children}
</div>
```

### Quick Pattern Reference

```tsx
// ✅ CORRECT COMPONENT WITH DARK MODE
function Card({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h3 className="text-gray-900 dark:text-gray-100 font-semibold">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mt-2">{children}</p>
    </div>
  );
}

// ❌ WRONG - NO DARK MODE SUPPORT
function Card({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-gray-900 font-semibold">{title}</h3>
      <p className="text-gray-600 mt-2">{children}</p>
    </div>
  );
}
```

### Self-Check Before Creating Components

When creating or modifying components, verify dark mode support:

1. Does every `bg-white` have a `dark:bg-gray-900` (or similar)?
2. Does every `bg-gray-50` have a `dark:bg-gray-800`?
3. Does every `text-gray-*` have a corresponding `dark:text-gray-*`?
4. Does every `border-gray-*` have a corresponding `dark:border-gray-*`?
5. Are ALL form inputs styled with `dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600`?
6. Do buttons with colored backgrounds use `text-white` (not `text-foreground`)?
7. Are there any hardcoded hex colors in inline styles?

### Code Review Enforcement

**Dark mode issues are BLOCKING. PRs missing dark mode support must be rejected.**

When reviewing frontend code, check:
- Every color class has a corresponding `dark:` variant
- No inline styles with hardcoded colors (`style={{ color: '#...' }}`)
- Form inputs include `dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600`
- Buttons with colored backgrounds use `text-white`, not `text-foreground`
- Hover and focus states also have dark mode variants

The `/review` command includes dark mode as a mandatory check.

---

## Toast Notifications & Dialogs

### Convention
**NEVER use native browser dialogs.** Always use the project's toast system and custom modals. This is a critical design requirement that should be checked in all code reviews.

| ❌ Don't Use | ✅ Use Instead |
|--------------|----------------|
| `alert('message')` | `toast.error('message')` or `toast.info('message')` |
| `confirm('Are you sure?')` | Custom confirmation modal with Dialog component |
| `window.alert()` | `toast()` from sonner |
| `window.confirm()` | Dialog component with state management |
| `window.prompt()` | Dialog component with Input field |

**Review Checklist Item:** During code review, search for `alert(`, `confirm(`, `window.alert`, `window.confirm`, `window.prompt` and flag any usage as a blocking issue.

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

## Product Import System

### Overview
Import products from external fulfillment providers (Roastify, Shopify, etc.) with field mapping, image processing, and real-time progress tracking.

### Architecture

```
External Provider → Fetch Products → Field Mapping → Create/Update Products
                                           ↓
                              Download Images → S3 Storage → Generate Thumbnails
                                           ↓
                              SSE Progress Events → Frontend Updates
```

### Import Phases
```typescript
enum ImportJobPhase {
  QUEUED,              // Job created, waiting to start
  FETCHING,            // Fetching products from provider
  MAPPING,             // Applying field mappings
  CREATING,            // Creating/updating products in database
  DOWNLOADING_IMAGES,  // Downloading images from provider
  UPLOADING_IMAGES,    // Uploading to S3
  GENERATING_THUMBNAILS, // Creating thumbnail variants
  FINALIZING,          // Cleanup and final status
  DONE,                // Complete
}
```

### Conflict Resolution Strategies
| Strategy | Behavior |
|----------|----------|
| `SKIP` | Skip products that already exist |
| `UPDATE` | Update existing products with new data |
| `MERGE` | Merge new data with existing (preserve non-null) |
| `FORCE_CREATE` | Create duplicate (new SKU) |

### API Endpoints
```
# Import Jobs
POST   /api/product-import/jobs              # Create import job
GET    /api/product-import/jobs              # List jobs
GET    /api/product-import/jobs/:id          # Get job details
POST   /api/product-import/jobs/:id/cancel   # Cancel job
POST   /api/product-import/jobs/:id/retry    # Retry failed job
GET    /api/product-import/jobs/:id/events   # SSE progress stream

# Field Mappings
GET    /api/product-import/field-mappings         # List profiles
POST   /api/product-import/field-mappings         # Create profile
PATCH  /api/product-import/field-mappings/:id     # Update profile
DELETE /api/product-import/field-mappings/:id     # Delete profile

# Storage & Billing
GET    /api/product-import/storage           # Storage usage stats
GET    /api/product-import/history           # Import history
GET    /api/product-import/estimate-cost     # Cost estimation

# Preview
POST   /api/product-import/preview           # Preview import
```

### Field Mapping System
```typescript
interface FieldMapping {
  sourceField: string;      // External field name
  targetField: string;      // Product model field
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'number' | 'boolean' | 'date';
  defaultValue?: any;       // Default if source is null
  validation?: {
    required?: boolean;
    format?: string;        // Regex pattern
    minLength?: number;
    maxLength?: number;
  };
}
```

### Key Models
```prisma
model ProductImportJob {
  id                String           @id @default(cuid())
  companyId         String
  status            ImportJobStatus  // PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED
  phase             ImportJobPhase
  totalProducts     Int
  processedProducts Int
  importedCount     Int
  skippedCount      Int
  errorCount        Int
  config            Json             // Import configuration
  errorLog          Json?            // Error details
}

model ProductImage {
  id              String   @id @default(cuid())
  productId       String
  companyId       String
  s3Key           String   @unique
  cdnUrl          String
  size            Int      // bytes
  thumbnailSmall  String?
  thumbnailMedium String?
  thumbnailLarge  String?
  thumbnailBytes  Int      @default(0)
}

model ProductFieldMappingProfile {
  id        String   @id @default(cuid())
  companyId String
  provider  String   // ROASTIFY, SHOPIFY, etc.
  name      String
  mappings  Json     // Array of FieldMapping
  isDefault Boolean  @default(false)
}
```

### Key Files
- `apps/api/src/product-import/` - Product Import module
- `apps/api/src/product-import/services/product-import.service.ts` - Core service
- `apps/api/src/product-import/services/field-mapping.service.ts` - Field mapping
- `apps/api/src/product-import/services/image-import.service.ts` - Image processing
- `apps/api/src/product-import/processors/product-import.processor.ts` - Queue processor
- `apps/api/src/integrations/services/providers/roastify.service.ts` - Roastify provider
- `docs/roadmap/PRODUCT_IMPORT_SPECIFICATION.md` - Full specification

### Test Coverage
- 209 unit tests covering all phases
- Bootstrap test to catch DI errors (`app.module.spec.ts`)

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

| Document | Location | Purpose |
|----------|----------|---------|
| `INTEGRATIONS_FRAMEWORK_SPECIFICATION.md` | `docs/roadmap/` | Feature 01 spec |
| `Feature_02_Dynamic_RBAC_System.docx` | `docs/` | Feature 02 spec |
| `Feature_03_Vendor_System.docx` | `docs/` | Feature 03 spec |
| `Gateway_Rule_Engine_Complete_Specification.md` | `docs/guides/` | GRE routing rules |
| `FUNNEL_BUILDER_SPECIFICATION.md` | `docs/roadmap/` | Funnels system spec |
| `funnel-alpha-launch.md` | `docs/roadmap/` | Alpha launch checklist |
| `CI_CD_DEPLOYMENT.md` | `docs/` | CI/CD pipeline setup |
| `DATABASE_SCHEMA_CHANGELOG.md` | `docs/` | Schema change tracking (REQUIRED) |
| `SECURITY_REVIEW_Dec2025.md` | `docs/reviews/` | Security audit |
| `QA_TEST_CASES_Dec2025.md` | `docs/reviews/` | QA test cases |
| `COMPLETE_DEVELOPMENT_PLAN.md` | `docs/roadmap/` | 24-week roadmap |
| `MASTER_DEVELOPMENT_CHECKLIST.md` | `docs/roadmap/` | Task tracker |
| `CS_AI_API.md` | `docs/api/` | CS AI API reference |
| `VOICE_AI_API.md` | `docs/api/` | Voice AI API reference |
| `TWILIO_INTEGRATION_GUIDE.md` | `docs/guides/` | Twilio setup guide |
| `CS_AI_DEPLOYMENT_CHECKLIST.md` | `docs/guides/` | CS AI deployment guide |
| `CS_AI_PRODUCTION_PLAN.md` | `docs/plans/` | CS AI production plan |
| `PRODUCT_IMPORT_SPECIFICATION.md` | `docs/roadmap/` | Product Import feature spec |
| `PRODUCT_IMPORT_PRODUCTION_SIGNOFF.md` | `docs/deployments/` | Product Import production signoff |

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
| Phase 10: Product Import | Completed | Product catalog import from integrations (Roastify, etc.) |

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

## Client & Company Management

### Overview
Management of Clients and Companies within the platform hierarchy.

**Access Levels:**
| Scope | Clients | Companies |
|-------|---------|-----------|
| ORGANIZATION | Full CRUD on all | Full CRUD on all |
| CLIENT | No access | Full CRUD on own companies only |
| COMPANY | No access | No access |

### Pages
- `/clients` - Client list with CRUD operations (ORGANIZATION only)
- `/companies` - Company list with CRUD operations (ORGANIZATION and CLIENT)

### Client API Endpoints (ORGANIZATION only)
```
GET    /api/admin/clients              # List clients with filters
GET    /api/admin/clients/stats        # Client statistics
GET    /api/admin/clients/:id          # Get client by ID
POST   /api/admin/clients              # Create client
PATCH  /api/admin/clients/:id          # Update client
DELETE /api/admin/clients/:id          # Soft delete client (cascades to companies)
```

### Company API Endpoints (ORGANIZATION and CLIENT)
```
GET    /api/admin/companies            # List companies (CLIENT sees only their own)
GET    /api/admin/companies/stats      # Company statistics (scoped)
GET    /api/admin/companies/:id        # Get company by ID (access verified)
POST   /api/admin/companies            # Create company (CLIENT auto-assigns clientId)
PATCH  /api/admin/companies/:id        # Update company (CLIENT: own only)
DELETE /api/admin/companies/:id        # Soft delete company (CLIENT: own only)
```

### Key Features
- **Hierarchical Access:** CLIENT users can manage their own companies
- **Audit Logging:** All CRUD operations logged with full change tracking
- **Cascade Delete:** Deleting a client soft-deletes all associated companies
- **Code Generation:** Unique 4-char alphanumeric codes auto-generated
- **Validation:** Pagination limits (1-100), email format, name length (2-100)
- **Company Dropdown:** CLIENT users see their companies in the sidebar switcher

### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by name, code, email |
| status | ACTIVE/INACTIVE/SUSPENDED | Filter by status |
| plan | FOUNDERS/BASIC/STANDARD/PREMIUM/ENTERPRISE | Filter by plan (clients only) |
| clientId | string | Filter by parent client (companies only) |
| sortBy | name/createdAt/plan | Sort field |
| sortOrder | asc/desc | Sort direction |
| limit | 1-100 | Page size (default: 50) |
| offset | number | Pagination offset |

### Key Files
- `apps/api/src/clients/` - Client backend module
- `apps/api/src/companies/` - Company backend module
- `apps/admin-dashboard/src/app/(dashboard)/clients/page.tsx` - Client list UI
- `apps/admin-dashboard/src/app/(dashboard)/companies/page.tsx` - Company list UI
- `apps/admin-dashboard/src/lib/api/clients.ts` - Client API client
- `apps/admin-dashboard/src/lib/api/companies.ts` - Company API client
- `apps/admin-dashboard/src/components/dashboard/organization-overview.tsx` - Dashboard widget

### E2E Tests
- `apps/admin-dashboard/e2e/clients.spec.ts` - Client CRUD tests
- `apps/admin-dashboard/e2e/companies.spec.ts` - Company CRUD tests

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

## CS AI Module (Customer Service AI)

### Overview
Two-tier AI customer service system with Voice AI (Twilio) and Chat support. Uses Claude AI (Anthropic) for intelligent responses with automatic escalation to human agents.

### Architecture

```
Customer Contact
       │
       ▼
┌─────────────────┐
│    AI REP       │  Tier 1: Basic queries, order status
│   (Tier 1)      │  Max refund: $0, Credits: $10
└────────┬────────┘
         │ Escalation triggers:
         │ - Irate customer
         │ - Refund request
         │ - Complex issue
         ▼
┌─────────────────┐
│  AI MANAGER     │  Tier 2: Elevated authority
│   (Tier 2)      │  Max refund: $100, Credits: $50
└────────┬────────┘
         │ Escalation triggers:
         │ - Refund over threshold
         │ - Customer explicit request
         │ - Policy exception
         ▼
┌─────────────────┐
│  HUMAN AGENT    │  Tier 3: Full authority
│   (Tier 3)      │  Live transfer via Twilio
└─────────────────┘
```

### Voice AI Flow

```
Inbound Call → Twilio → /voice/inbound (TwiML)
                           │
                           ▼
                      AI Greeting
                           │
                           ▼
Customer Speech → /voice/speech → Claude AI → TwiML Response
                           │
                           ▼
                  Escalation? → /voice/escalate → Human Agent
```

### Channels
- **Voice:** Twilio integration with speech-to-text
- **Chat:** Real-time web chat
- **Email:** Async support
- **SMS:** Text-based support

### API Endpoints

```
# Customer Service Sessions
POST   /api/momentum/cs/sessions                    # Start session
GET    /api/momentum/cs/sessions/:id                # Get session
GET    /api/momentum/cs/sessions                    # List sessions
POST   /api/momentum/cs/sessions/:id/messages       # Send message
POST   /api/momentum/cs/sessions/:id/escalate       # Escalate session
POST   /api/momentum/cs/sessions/:id/resolve        # Resolve session
GET    /api/momentum/cs/analytics                   # Get analytics
GET    /api/momentum/cs/config                      # Get CS config
PUT    /api/momentum/cs/config                      # Update config

# Voice AI (Twilio Webhooks)
POST   /api/momentum/voice/inbound                  # Handle inbound call
POST   /api/momentum/voice/speech                   # Process speech result
POST   /api/momentum/voice/status-callback          # Call status update
POST   /api/momentum/voice/escalate                 # Transfer to human

# Voice AI (Authenticated)
POST   /api/momentum/voice/calls/outbound           # Initiate outbound call
GET    /api/momentum/voice/calls/:callId            # Get call status
GET    /api/momentum/voice/calls                    # List calls
GET    /api/momentum/voice/scripts                  # List voice scripts
```

### Key Models

| Model | Purpose |
|-------|---------|
| `CSSession` | Customer service session with messages |
| `CSMessage` | Individual messages in session |
| `CSConfig` | Company-level CS configuration |
| `CSAIUsage` | Claude token usage tracking |
| `CSAIPricing` | Token pricing configuration |
| `VoiceCall` | Voice call records |
| `VoiceScript` | Call script templates |

### Escalation Triggers

**AI Rep → AI Manager:**
- `IRATE_CUSTOMER` - Negative sentiment detected
- `REFUND_REQUEST` - Refund mentioned
- `COMPLEX_ISSUE` - Issue requires higher authority
- `REPEAT_CONTACT` - Multiple contacts about same issue
- `HIGH_VALUE_CUSTOMER` - VIP customer
- `LEGAL_MENTION` - Legal terms detected
- `SOCIAL_MEDIA_THREAT` - Public complaint threatened

**AI Manager → Human:**
- `REFUND_OVER_THRESHOLD` - Exceeds AI authority
- `CUSTOMER_REQUEST` - Explicit request for human
- `POLICY_EXCEPTION` - Requires manager approval
- `ESCALATED_COMPLAINT` - Already escalated once
- `TECHNICAL_LIMITATION` - AI cannot handle

### Configuration (CSConfig)

```json
{
  "companyId": "uuid",
  "enabled": true,
  "tiers": {
    "aiRep": {
      "enabled": true,
      "capabilities": {
        "canProcessRefunds": false,
        "maxRefundAmount": 0,
        "canApplyCredits": true,
        "maxCreditAmount": 10
      }
    },
    "aiManager": {
      "enabled": true,
      "capabilities": {
        "canProcessRefunds": true,
        "maxRefundAmount": 100,
        "canApplyCredits": true,
        "maxCreditAmount": 50
      }
    },
    "humanAgent": {
      "enabled": true,
      "escalationPhone": "+14155559999",
      "notifyOnEscalation": true
    }
  }
}
```

### Key Files

**Backend:**
- `apps/api/src/momentum-intelligence/customer-service/` - CS AI service
- `apps/api/src/momentum-intelligence/voice-ai/` - Voice AI service
- `apps/api/src/momentum-intelligence/types/` - TypeScript types
- `apps/api/test/momentum-intelligence/` - Unit tests

**Frontend:**
- `apps/admin-dashboard/src/app/(dashboard)/customer-service/` - CS dashboard
- `apps/admin-dashboard/src/lib/api/customer-service.ts` - API client

**Documentation:**
- `docs/api/CS_AI_API.md` - CS API documentation
- `docs/api/VOICE_AI_API.md` - Voice API documentation
- `docs/guides/TWILIO_INTEGRATION_GUIDE.md` - Twilio setup guide
- `docs/guides/CS_AI_DEPLOYMENT_CHECKLIST.md` - Deployment checklist

### Integration Requirements

1. **Anthropic Claude** - AI response generation
   - Model: `claude-sonnet-4-20250514`
   - Configure via `ANTHROPIC_API_KEY` or ClientIntegration

2. **Twilio** - Voice calls
   - Account SID, Auth Token, Phone Number
   - Configure via ClientIntegration (preferred) or env vars
   - Webhook URLs must be HTTPS in production

### Test Coverage
- Unit tests: `apps/api/test/momentum-intelligence/`
- Coverage target: 70%+
- Run: `npm test -- --testPathPattern="momentum-intelligence"`

---

## Email System (SOC2/ISO27001 Compliant)

### Overview
Transactional email system with AWS SES integration, Handlebars templating, and hierarchical template fallback.

### Template Categories
```typescript
enum EmailTemplateCategory {
  AUTHENTICATION,    // Password reset, verification
  NOTIFICATION,      // Alerts, updates
  TRANSACTION,       // Order confirmation, receipts
  MARKETING,         // Promotional emails
  SYSTEM,            // Admin notifications
}
```

### Template Hierarchy (Fallback Order)
1. **Company** - Most specific, company-branded templates
2. **Client** - Client-level defaults
3. **Organization** - Platform-wide templates
4. **System** - Built-in fallback templates

### Key Features
- **Handlebars Templating:** `{{userName}}`, `{{#if condition}}`, `{{#each items}}`
- **Send Logging:** Every email logged to `EmailSendLog` for compliance
- **Rate Limiting:** 60/min, 1000/hour, 10000/day
- **Sender Configuration:** Customizable from/reply-to per template

### API Endpoints
```
# Template Management (Admin)
GET    /api/email/templates           # List templates
POST   /api/email/templates           # Create template
PATCH  /api/email/templates/:id       # Update template
DELETE /api/email/templates/:id       # Delete template

# Send Logs (Admin)
GET    /api/email/logs                # View send history
```

### Built-in Email Types
| Method | Purpose | Template Code |
|--------|---------|---------------|
| `sendPasswordResetEmail()` | Password reset with token | `password-reset` |
| `sendWelcomeEmail()` | New user welcome | `welcome` |
| `sendVerificationEmail()` | Email verification | `email-verification` |
| `sendTemplatedEmail()` | Generic templated email | any |
| (via sendTemplatedEmail) | Waitlist member invitation | `waitlist-invite` |

### Email Template Design Standards

**Brand Voice:** Fun, friendly, enthusiastic—never corporate or boring. AVNZ emails should feel like a message from a cool friend who happens to be a payment expert.

#### Tone Guidelines
| Element | Style | Example |
|---------|-------|---------|
| **Greeting** | Personal, emoji | "Hey {{userName}}! 👋" |
| **Headlines** | Exciting, action-oriented | "You Made It, Founder!" |
| **Body Copy** | Conversational, relatable | "Looks like your password decided to go on vacation without telling you. Rude, right?" |
| **CTAs** | Fun, urgent | "Claim My Founder Spot 🎯", "Reset My Password ✨" |
| **Security Notes** | Light-hearted but clear | "This link will self-destruct in {{expiresIn}} (very Mission Impossible, we know)" |

#### Required Template Elements
1. **Logo Header** - avnz.io logo with gradient background (color varies by template type)
2. **Greeting** - Personal greeting with emoji
3. **Clear CTA Button** - Prominent, gradient button with action text
4. **Fallback Link** - Plain text link for accessibility
5. **Fun Tip Box** - Helpful advice with personality
6. **Footer** - Support email, copyright, compliance badges

#### Color Schemes by Template Type
| Type | Header Gradient | Accent Color |
|------|-----------------|--------------|
| Authentication | Purple-Blue (`#667eea` → `#764ba2`) | Purple |
| Welcome/Success | Green (`#10b981` → `#059669`) | Green |
| Verification | Blue (`#3b82f6` → `#1d4ed8`) | Blue |
| Waitlist/VIP | Purple-Pink-Orange (`#8b5cf6` → `#ec4899` → `#f97316`) | Purple |

#### Handlebars Variables Standard
```handlebars
{{userName}}       - User's name or email prefix (always humanized)
{{currentYear}}    - Auto-populated (e.g., "2025")
{{supportEmail}}   - Support contact (e.g., "support@avnz.io")
{{expiresIn}}      - Human-readable expiry (e.g., "7 days")
{{actionUrl}}      - Primary CTA URL (resetUrl, inviteUrl, etc.)
```

#### DO's and DON'Ts
**DO:**
- Use emojis sparingly but effectively
- Write like you're talking to a friend
- Make security info fun but clear
- Include text-only version for all emails
- Test across email clients (Gmail, Outlook, Apple Mail)

**DON'T:**
- Sound robotic or corporate
- Use generic phrases ("Dear Customer")
- Skip the mobile-responsive design
- Forget the unsubscribe link (marketing emails)
- Use more than 3 emojis per section

### Key Files
- `apps/api/src/email/email.module.ts` - Module definition
- `apps/api/src/email/services/email.service.ts` - Core service with AWS SES
- `apps/api/src/email/services/template-renderer.service.ts` - Handlebars rendering
- `apps/api/src/email/types/email.types.ts` - TypeScript types
- `apps/api/prisma/seeds/core/seed-email-templates.ts` - Default templates

### Email Queue (SQS-Based Production Queue)

The email system uses AWS SQS for production-grade reliability, decoupling email sending from request processing.

#### Architecture
```
API Request → EmailQueueService → SQS Queue → EmailQueueProcessor → AWS SES
                    ↓                              ↓
              EmailSendLog (QUEUED)         EmailSendLog (SENT/FAILED)
```

#### Queue Message Structure
```typescript
interface EmailQueueMessage {
  id: string;              // EmailSendLog ID for tracking
  to: string;
  subject: string;
  htmlBody: string;
  category: EmailTemplateCategory;
  priority: 'high' | 'normal';  // AUTHENTICATION/TRANSACTIONAL = high
  retryCount: number;
  queuedAt: string;
}
```

#### Health Status Monitoring
| Status | Condition |
|--------|-----------|
| `healthy` | Queue < 1000 messages AND failure rate < 10% |
| `degraded` | Queue 1000-10000 messages OR failure rate 10-25% |
| `critical` | Queue > 10000 messages OR failure rate > 25% |

#### Queue Admin API (Organization Admin Only)
```
GET    /api/admin/email-queue/status     # Queue stats & health
POST   /api/admin/email-queue/process-now  # Manual processing trigger
POST   /api/admin/email-queue/purge      # Emergency queue purge
```

#### Environment Variables
```bash
EMAIL_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/<account>/avnz-email-queue
ENABLE_EMAIL_PROCESSOR=true  # Enable/disable queue processor
AWS_REGION=us-east-1         # SQS region
```

#### Audit Logging
All queue operations are logged for SOC2/ISO27001 compliance:
- `EMAIL_QUEUED` - Email added to queue (PII classification)
- `EMAIL_QUEUE_FAILED` - Failed to queue (PII classification)
- `EMAIL_QUEUE_PURGED` - Queue purged (INTERNAL classification)

#### Queue Service Files
- `apps/api/src/email/services/email-queue.service.ts` - SQS queue management
- `apps/api/src/email/services/email-queue-processor.service.ts` - Queue consumer
- `apps/api/src/email/controllers/email-queue.controller.ts` - Admin endpoints
- `terraform/sqs.tf` - SQS infrastructure
- `terraform/iam.tf` - IAM policies for SQS access

#### Unit Tests
- `apps/api/src/email/services/email-queue.service.spec.ts` - 20 tests
- `apps/api/src/email/controllers/email-queue.controller.spec.ts` - 17 tests

---

## Funnels Module (Sales Funnels)

### Overview
Complete sales funnel system with multi-stage flows, A/B testing variants, session tracking, and integrated checkout.

### Funnel Structure
```
Funnel
├── Stages (ordered)
│   ├── LANDING - Hero, value prop, CTA
│   ├── PRODUCT_SELECTION - Product grid, variants
│   └── CHECKOUT - Address, payment, order
├── Variants (A/B testing)
└── Sessions (visitor tracking)
```

### Stage Types
```typescript
enum FunnelStageType {
  LANDING,            // Landing page with hero
  PRODUCT_SELECTION,  // Product catalog/selection
  CHECKOUT,           // Payment and order
  UPSELL,             // Post-purchase upsell
  DOWNSELL,           // Alternative offer
  THANK_YOU,          // Order confirmation
}
```

### Funnel Settings
```typescript
interface FunnelSettings {
  branding: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    logoUrl?: string;
  };
  behavior: {
    showProgressBar: boolean;
    exitIntent: boolean;
    abandonedCartEmail: boolean;
  };
  urls: {
    termsUrl?: string;
    privacyUrl?: string;
  };
}
```

### API Endpoints (Authenticated)
```
# Funnel CRUD
POST   /api/funnels                        # Create funnel
GET    /api/funnels                        # List funnels
GET    /api/funnels/:id                    # Get funnel
PATCH  /api/funnels/:id                    # Update funnel
DELETE /api/funnels/:id                    # Delete funnel
POST   /api/funnels/:id/publish            # Publish/unpublish
POST   /api/funnels/:id/duplicate          # Duplicate funnel

# Stage Management
POST   /api/funnels/:id/stages             # Add stage
PATCH  /api/funnels/:id/stages/:stageId    # Update stage
DELETE /api/funnels/:id/stages/:stageId    # Delete stage
POST   /api/funnels/:id/stages/reorder     # Reorder stages

# Variant Management (A/B Testing)
POST   /api/funnels/:id/variants           # Create variant
PATCH  /api/funnels/:id/variants/:variantId  # Update variant
DELETE /api/funnels/:id/variants/:variantId  # Delete variant

# Analytics
GET    /api/funnels/stats/overview         # Company funnel stats
GET    /api/funnels/:id/analytics          # Funnel analytics
```

### API Endpoints (Public - No Auth)
```
# Public Funnel Access
GET    /api/f/:seoSlug                     # Get funnel by SEO slug

# Session Management
POST   /api/f/:funnelId/sessions           # Start session
GET    /api/f/sessions/:sessionToken       # Get session
PATCH  /api/f/sessions/:sessionToken       # Update session data
POST   /api/f/sessions/:sessionToken/events     # Track event
POST   /api/f/sessions/:sessionToken/advance    # Advance stage
POST   /api/f/sessions/:sessionToken/complete   # Complete session
POST   /api/f/sessions/:sessionToken/abandon    # Abandon session

# Checkout
GET    /api/f/sessions/:sessionToken/checkout   # Get checkout summary
POST   /api/f/sessions/:sessionToken/checkout   # Process payment
```

### Key Files
- `apps/api/src/funnels/funnels.module.ts` - Module definition
- `apps/api/src/funnels/funnels.controller.ts` - Controllers (auth + public)
- `apps/api/src/funnels/services/funnels.service.ts` - Core CRUD
- `apps/api/src/funnels/services/funnel-sessions.service.ts` - Session tracking
- `apps/api/src/funnels/services/funnel-analytics.service.ts` - Analytics
- `apps/api/src/funnels/services/funnel-payment.service.ts` - Checkout processing
- `apps/admin-dashboard/src/app/(dashboard)/funnels/page.tsx` - Funnel list UI
- `docs/roadmap/FUNNEL_BUILDER_SPECIFICATION.md` - Full specification

---

## Leads Module

### Overview
Progressive lead capture with field-by-field tracking, engagement scoring, and conversion management.

### Lead Status Flow
```
NEW → ENGAGED → QUALIFIED → CONVERTED
                         → ABANDONED
```

### Lead Scoring
```typescript
interface LeadScores {
  engagementScore: number;  // 0-100 based on interactions
  intentScore: number;      // 0-100 based on behavior signals
}
```

### API Endpoints (Public)
```
# Field Capture (called on blur)
POST   /api/leads/capture/field            # Single field capture
POST   /api/leads/capture/fields           # Multiple fields capture

# Session-based Operations
GET    /api/leads/session/:sessionToken    # Get lead by session
POST   /api/leads/session/:sessionToken/cart     # Update cart data
POST   /api/leads/session/:sessionToken/abandon  # Mark abandoned
```

### API Endpoints (Authenticated)
```
GET    /api/leads                          # List leads
GET    /api/leads/stats                    # Lead statistics
GET    /api/leads/:id                      # Get lead by ID
PATCH  /api/leads/:id                      # Update lead
POST   /api/leads/:id/scores               # Recalculate scores
POST   /api/leads/:id/convert              # Convert to customer
```

### Key Files
- `apps/api/src/leads/leads.module.ts` - Module definition
- `apps/api/src/leads/leads.controller.ts` - Controller
- `apps/api/src/leads/services/lead-capture.service.ts` - Lead capture logic
- `apps/api/src/leads/dto/lead.dto.ts` - DTOs

---

## Company Portal (Public Frontend)

### Overview
Public-facing Next.js application for rendering funnels and processing customer purchases.

### Port
- **Development:** 3003
- **Container:** `avnz-payment-portal`

### Key Features
- Funnel stage rendering (Landing, Product, Checkout, Success)
- Shopping cart management
- Address autocomplete
- Payment processing integration
- Conversion interventions (urgency, scarcity, social proof)

### Funnel Stages
| Stage | Component | Purpose |
|-------|-----------|---------|
| Landing | `LandingStage` | Hero, value prop, CTA |
| Product Selection | `ProductSelectionStage` | Product grid with variants |
| Checkout | `CheckoutStage` | Address, payment form |
| Success | `SuccessStage` | Order confirmation |

### Intervention Components
| Component | Purpose |
|-----------|---------|
| `UrgencyBanner` | Countdown timer at top |
| `ScarcityIndicator` | Stock level warnings |
| `SocialProofPopup` | Recent purchase notifications |

### Key Files
- `apps/company-portal/src/app/f/[slug]/page.tsx` - Funnel page
- `apps/company-portal/src/components/funnel/funnel-renderer.tsx` - Main renderer
- `apps/company-portal/src/components/funnel/stages/` - Stage components
- `apps/company-portal/src/components/interventions/` - CRO interventions
- `apps/company-portal/src/contexts/funnel-context.tsx` - Funnel state
- `apps/company-portal/src/lib/api.ts` - API client

---

## Session Timeout & Security (SOC2 Compliant)

### Session Timeout Configuration
```typescript
const SESSION_CONFIG = {
  INACTIVITY_TIMEOUT: 900,   // 15 min production, 30 min dev
  WARNING_BEFORE_TIMEOUT: 120,  // 2 min warning
  ACTIVITY_THROTTLE: 5000,      // 5 sec activity detection throttle
};
```

### Features
- **Activity Detection:** Mouse, keyboard, scroll, touch events
- **Warning Modal:** Fun, on-brand messaging before logout
- **Auto-Logout:** Secure session termination on timeout
- **Session Extension:** User can extend with single click

### Password Reset (SOC2 CC6.1 / ISO A.9.4.3)
- **Token Security:** SHA-256 hashed storage, 64-byte random tokens
- **Rate Limiting:** 3 attempts per email per hour
- **Token Expiry:** 1 hour
- **User Enumeration Prevention:** Same response for valid/invalid emails

### API Endpoints
```
POST   /api/auth/forgot-password           # Request password reset
POST   /api/auth/validate-reset-token      # Validate token
POST   /api/auth/reset-password            # Reset with new password
```

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Key Files
- `apps/admin-dashboard/src/hooks/use-session-timeout.tsx` - Timeout hook & modal
- `apps/api/src/auth/auth.service.ts` - Password reset logic
- `apps/api/src/auth/auth.controller.ts` - Auth endpoints
- `apps/api/src/auth/services/token-blacklist.service.ts` - Token invalidation

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

## Cart Module

### Overview
Complete shopping cart system with theming, product catalogs, upsells, inventory holds, abandonment tracking, and express checkout.

### Features Complete
- **Cart CRUD** - Create, read, update, delete cart operations
- **Cart Theming** - 9 preset themes with full color/layout customization
- **Product Catalog** - Configurable product display (ALL, SELECTED, CATEGORY, TAG modes)
- **Inventory Holds** - Reserve inventory during checkout with expiration
- **Cart Abandonment** - Track and recover abandoned carts
- **Express Checkout** - Streamlined checkout flow scaffolding
- **Cart Sessions** - Session-based cart management for guests
- **Cart Upsell Framework** - Upsell recommendations and tracking

### Cart Theme Presets
| Preset | Description |
|--------|-------------|
| STARTER | Clean, minimal design for any brand |
| ARTISAN | Warm, handcrafted feel for artisanal products |
| VELOCITY | Bold, dynamic style for high-energy brands |
| LUXE | Elegant, premium look for luxury products |
| WELLNESS | Calm, natural tones for health & beauty |
| FOODIE | Appetizing, warm colors for food & beverage |
| PROFESSIONAL | Corporate, trustworthy for B2B |
| CREATOR | Vibrant, expressive for creative brands |
| MARKETPLACE | Functional, efficient for multi-vendor |

### API Endpoints
```
# Cart Theme (Public + Admin)
GET    /api/landing-pages/:id/cart-theme              # Get cart theme
PATCH  /api/landing-pages/:id/cart-theme              # Update cart theme (auth)
DELETE /api/landing-pages/:id/cart-theme              # Reset to preset (auth)
GET    /api/landing-pages/:id/cart-theme/preview      # Get theme with CSS vars
GET    /api/landing-pages/cart-themes/presets         # List all presets
POST   /api/landing-pages/cart-themes/generate        # Generate from brand color

# Product Catalog
GET    /api/landing-pages/:id/product-catalog         # Get catalog config
PATCH  /api/landing-pages/:id/product-catalog         # Update catalog config (auth)
GET    /api/landing-pages/:id/products                # Get resolved products
POST   /api/landing-pages/:id/product-catalog/products    # Add products (auth)
DELETE /api/landing-pages/:id/product-catalog/products    # Remove products (auth)
POST   /api/landing-pages/:id/product-catalog/reorder     # Reorder products (auth)

# Cart Operations
POST   /api/cart                                      # Create cart
GET    /api/cart/:id                                  # Get cart
PATCH  /api/cart/:id                                  # Update cart
DELETE /api/cart/:id                                  # Delete cart
POST   /api/cart/:id/items                            # Add item to cart
PATCH  /api/cart/:id/items/:itemId                    # Update cart item
DELETE /api/cart/:id/items/:itemId                    # Remove cart item
```

### Pending TODOs
All cart TODOs have been completed as of January 27, 2026.

| Feature | Status | Notes |
|---------|--------|-------|
| Shipping estimation | ✅ Complete | ShippingService integration |
| Payment processing | ✅ Complete | Multi-gateway support (Stripe, PayPal, NMI, Authorize.Net) |
| Tax/shipping calculations | ✅ Complete | TaxService + ShippingService |
| Company settings loading | ✅ Complete | CompanyCartSettingsService |
| Upsell analytics | ✅ Complete | CartUpsellAnalytics model |
| Promotion/discount codes | ✅ Complete | Full Promotion model integration |
| requiresShipping logic | ✅ Complete | Based on ProductFulfillmentType |

### Key Files
```
apps/api/src/cart/
├── cart.module.ts
├── controllers/
│   ├── cart.controller.ts              # Main cart operations
│   └── cart-theme.controller.ts        # Theming + catalog endpoints
├── services/
│   ├── cart.service.ts                 # Core cart logic
│   ├── cart-theme.service.ts           # Theme management
│   ├── product-catalog.service.ts      # Catalog configuration
│   ├── cart-upsell.service.ts          # Upsell recommendations
│   ├── inventory-hold.service.ts       # Inventory reservation
│   ├── cart-abandonment.service.ts     # Abandonment tracking
│   ├── express-checkout.service.ts     # Express checkout flow
│   └── cart-save.service.ts            # Save for later functionality
├── types/
│   └── cart-theme.types.ts             # Theme type definitions
└── constants/
    └── cart-theme-presets.ts           # Preset theme definitions
```

---

## Recommendations Module

### Overview
Product recommendation engine with multiple recommendation types and behavioral tracking.

### Recommendation Types
| Type | Description |
|------|-------------|
| Also Bought | Products frequently purchased together |
| You Might Like | Personalized based on browsing/purchase history |
| Frequently Viewed | Products often viewed together |

### API Endpoints
```
# Public Recommendations
GET    /api/products/:productId/recommendations                    # All recommendations
GET    /api/products/:productId/recommendations/also-bought        # Also bought
GET    /api/products/:productId/recommendations/you-might-like     # Personalized
GET    /api/products/:productId/recommendations/frequently-viewed  # Viewed together

# Tracking (Public)
POST   /api/recommendations/view                      # Track product view
POST   /api/recommendations/click                     # Track recommendation click
POST   /api/recommendations/add-to-cart               # Track add to cart

# Admin
GET    /api/admin/recommendations/config              # Get config (auth)
PUT    /api/admin/recommendations/config              # Update config (auth)
GET    /api/admin/recommendations/preview/:productId  # Preview recommendations (auth)
```

### Key Files
```
apps/api/src/recommendations/
├── recommendations.module.ts
├── controllers/
│   └── recommendations.controller.ts
├── services/
│   └── product-recommendation.service.ts
├── dto/
│   └── recommendation.dto.ts
└── types/
    └── recommendation.types.ts
```

---

## Upsell Module

### Overview
Intelligent upselling system with bulk discounts, subscription offers, and targeted upsell rules.

### Upsell Types
| Type | Description |
|------|-------------|
| BULK_DISCOUNT | Quantity-based pricing tiers |
| SUBSCRIPTION | Subscribe & save offers |
| FREE_SHIPPING_ADD | Add items to reach free shipping threshold |
| FREE_GIFT_THRESHOLD | Free gift when cart reaches value |
| COMPLEMENTARY | Related product suggestions |
| SHIPPING_PROTECTION | Shipping insurance upsell |

### API Endpoints
```
# Bulk Discount
GET    /api/products/:productId/bulk-discount         # Get bulk discount config
PUT    /api/products/:productId/bulk-discount         # Create/update config (auth)
DELETE /api/products/:productId/bulk-discount         # Delete config (auth)
GET    /api/products/:productId/bulk-recommendation   # Get bulk purchase recommendation
POST   /api/products/pricing/bulk-calculate           # Calculate bulk pricing

# Subscription
GET    /api/products/:productId/subscription-config   # Get subscription config
PUT    /api/products/:productId/subscription-config   # Create/update config (auth)
GET    /api/upsell/subscription-eligibility/:productId  # Check eligibility
GET    /api/upsell/subscription-offer/:productId      # Get subscription offer

# Targeting Rules (Admin)
GET    /api/upsell/rules                              # List rules (auth)
POST   /api/upsell/rules                              # Create rule (auth)
PUT    /api/upsell/rules/:ruleId                      # Update rule (auth)
DELETE /api/upsell/rules/:ruleId                      # Delete rule (auth)

# Cart Upsells (Public)
GET    /api/upsell/cart/:cartId                       # Get upsells for cart

# Tracking (Public)
POST   /api/upsell/impressions                        # Record impression
POST   /api/upsell/impressions/accept                 # Record acceptance
POST   /api/upsell/impressions/decline                # Record decline
```

### Customer Segments
| Segment | Description |
|---------|-------------|
| FIRST_TIME_BUYER | No previous orders |
| REPEAT_CUSTOMER | 2+ orders |
| LOYAL_SUBSCRIBER | Has active subscription |
| LAPSED_CUSTOMER | No order in 90+ days |
| BUDGET_CONSCIOUS | Low avg order value |
| VALUE_SEEKER | Medium avg order value |
| PREMIUM_BUYER | High avg order value |
| SMALL_CART | Cart < $30 |
| MEDIUM_CART | Cart $30-$100 |
| LARGE_CART | Cart > $100 |

### Key Files
```
apps/api/src/upsell/
├── upsell.module.ts
├── controllers/
│   ├── upsell.controller.ts            # Targeting rules + cart upsells
│   └── bulk-discount.controller.ts     # Bulk discount + subscription
├── services/
│   ├── upsell-targeting.service.ts     # Rule evaluation + personalization
│   ├── bulk-discount.service.ts        # Quantity-based pricing
│   └── subscription-intelligence.service.ts  # Subscription offers
├── dto/
│   └── upsell.dto.ts
└── types/
    └── upsell.types.ts
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

*Last Updated: January 27, 2026*
*Feature 01: Complete | Feature 02-03: Spec Complete | Funnels, Leads, Email, Mobile Responsiveness, Client & Company Management, Product Import, Cart, Recommendations, Upsell: Complete*

