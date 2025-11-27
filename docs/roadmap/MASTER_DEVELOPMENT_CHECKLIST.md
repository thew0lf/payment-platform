# avnz.io - Master Development Checklist
## All Phases | All Features | Progress Tracker

---

## Quick Reference

| Phase | Weeks | Status |
|-------|-------|--------|
| Phase 1: Foundation | 1-4 | 🔲 Not Started |
| Phase 2: Payment Core | 5-7 | 🔲 Not Started |
| Phase 3: Rule Engine | 8-10 | 🔲 Not Started |
| Phase 4: Billing | 11-12 | 🔲 Not Started |
| Phase 5: Momentum Core | 13-15 | 🔲 Not Started |
| Phase 6: CS AI | 16-17 | 🔲 Not Started |
| Phase 7: Communications | 18-19 | 🔲 Not Started |
| Phase 8: Revenue & Analytics | 20-21 | 🔲 Not Started |
| Phase 9: Alpha Deployment | 22-24 | 🔲 Not Started |

**Total: 24 weeks**

---

# PHASE 1: FOUNDATION (Weeks 1-4)

## Week 1: Authentication & RBAC

### Auth0 Setup
- [ ] Create Auth0 development tenant
- [ ] Create API (audience: https://api.avnz.local)
- [ ] Create SPA application (Dashboard)
- [ ] Configure callback URLs (localhost)
- [ ] Create test users for each role

### Backend Auth Integration
- [ ] Install @nestjs/passport, passport, passport-jwt, jwks-rsa
- [ ] Create auth.module.ts
- [ ] Create jwt.strategy.ts
- [ ] Create jwt-auth.guard.ts
- [ ] Create public.decorator.ts
- [ ] Add AUTH0_DOMAIN, AUTH0_AUDIENCE to .env
- [ ] Test protected routes

### RBAC Implementation
- [ ] Define permissions enum (20+ permissions)
- [ ] Create permissions.decorator.ts
- [ ] Create permissions.guard.ts
- [ ] Define 5 role levels
- [ ] Create role-permissions config
- [ ] Create hierarchy.guard.ts
- [ ] Create current-user.decorator.ts
- [ ] Test role-based access

### User Context
- [ ] Create user.interface.ts
- [ ] Create auth-context.service.ts
- [ ] Create request context middleware
- [ ] Add audit fields to base entity

---

## Week 2: Hierarchy & Security

### Hierarchy Models
- [ ] Create Organization model
- [ ] Create Client model
- [ ] Create Company model
- [ ] Create Department model
- [ ] Create User model
- [ ] Run Prisma migration

### Hierarchy CRUD
- [ ] Organization module (admin only)
- [ ] Client module (full CRUD)
- [ ] Company module (full CRUD, scoped)
- [ ] Department module (basic CRUD)
- [ ] User module (invite, list, update, delete)

### API Security
- [ ] Install @nestjs/throttler
- [ ] Configure Redis-backed rate limiting
- [ ] Per-IP limits: 100/minute
- [ ] Per-user limits: 1000/minute
- [ ] Configure global ValidationPipe
- [ ] Add class-validator to all DTOs
- [ ] Install and configure helmet
- [ ] Configure CORS

### Audit Logging
- [ ] Create AuditLog model
- [ ] Create audit-log.service.ts
- [ ] Create audit interceptor
- [ ] Create audit endpoints (admin)
- [ ] Test audit logging

---

## Week 3: Integrations Framework

### Integration Models
- [ ] Create IntegrationCategory enum
- [ ] Create IntegrationProvider enum
- [ ] Create IntegrationDefinition model
- [ ] Create PlatformIntegration model
- [ ] Create ClientIntegration model
- [ ] Run Prisma migration

### Credential Encryption
- [ ] Create credential encryption service (AES-256-GCM)
- [ ] Key from AWS Secrets Manager / env
- [ ] Never log decrypted credentials
- [ ] Test encryption/decryption

### Seed Integration Definitions
- [ ] PayPal Payflow Pro definition
- [ ] NMI definition
- [ ] Authorize.Net definition
- [ ] Stripe definition
- [ ] Auth0 definition (org-only)
- [ ] AWS services definitions (org-only)

### Integration Services
- [ ] integration-definition.service.ts
- [ ] platform-integration.service.ts
- [ ] client-integration.service.ts
- [ ] integration-test.service.ts (test connections)
- [ ] integration-sync.service.ts (sync with MerchantAccount)

### Platform Integration API (Admin)
- [ ] GET /api/admin/integrations/definitions
- [ ] GET /api/admin/integrations/platform
- [ ] POST /api/admin/integrations/platform
- [ ] PATCH /api/admin/integrations/platform/:id
- [ ] DELETE /api/admin/integrations/platform/:id
- [ ] POST /api/admin/integrations/platform/:id/test

### Client Integration API
- [ ] GET /api/integrations/available
- [ ] GET /api/integrations
- [ ] POST /api/integrations
- [ ] PATCH /api/integrations/:id
- [ ] DELETE /api/integrations/:id
- [ ] POST /api/integrations/:id/test
- [ ] PATCH /api/integrations/:id/default

### MerchantAccount Integration
- [ ] Update MerchantAccount model (add clientIntegrationId)
- [ ] Auto-create MerchantAccount from ClientIntegration
- [ ] Sync credentials on integration update
- [ ] Platform gateway billing tracking

---

## Week 4: Dashboard Foundation

### Project Setup
- [ ] Verify Next.js 14 with App Router
- [ ] Configure Tailwind (dark theme)
- [ ] Install UI dependencies (@radix-ui, lucide-react, etc.)
- [ ] Configure path aliases

### Auth0 Frontend
- [ ] Install @auth0/nextjs-auth0
- [ ] Create auth routes
- [ ] Configure .env.local
- [ ] Create UserProvider
- [ ] Test login/logout

### Layout Components
- [ ] Create DashboardLayout
- [ ] Create Sidebar (collapsible)
- [ ] Create Header (user menu)
- [ ] Create Breadcrumbs
- [ ] Create ThemeProvider

### API Client
- [ ] Install @tanstack/react-query, axios
- [ ] Create QueryClientProvider
- [ ] Create axios instance with interceptors
- [ ] Create typed API hooks

### Core Components
- [ ] Button (variants)
- [ ] Input, Select, Checkbox, Switch
- [ ] Card
- [ ] Table (sortable, paginated)
- [ ] Modal/Dialog
- [ ] Toast notifications
- [ ] Loading states

### Dashboard Home
- [ ] Stats cards
- [ ] 7-day transaction chart
- [ ] Recent transactions table
- [ ] Stats API endpoints

### Integrations UI
- [ ] /admin/integrations page (org admin)
- [ ] Platform integration cards
- [ ] Add platform integration modal
- [ ] Configure client sharing
- [ ] /settings/integrations page (client)
- [ ] Client integration list
- [ ] Add Integration modal (multi-step)
- [ ] Platform gateway option card
- [ ] Test connection functionality
- [ ] Edit/Delete integration

---

# PHASE 2: PAYMENT CORE (Weeks 5-7)

## Week 5: Multi-Account Model

### Merchant Account Model
- [ ] Create MerchantAccount Prisma model
- [ ] Add credentials, limits, usage, fees, restrictions fields
- [ ] Add clientIntegrationId foreign key
- [ ] Run migration

### Integration Sync
- [ ] Link MerchantAccount to ClientIntegration
- [ ] Auto-sync credentials from integration
- [ ] Handle platform vs own credentials

### Merchant Account Module
- [ ] POST /api/merchant-accounts
- [ ] GET /api/merchant-accounts
- [ ] GET /api/merchant-accounts/:id
- [ ] PATCH /api/merchant-accounts/:id
- [ ] DELETE /api/merchant-accounts/:id
- [ ] GET /api/merchant-accounts/:id/usage
- [ ] GET /api/merchant-accounts/:id/health
- [ ] POST /api/merchant-accounts/:id/test

### Usage Tracking
- [ ] Increment counters on transaction
- [ ] Check limits before processing
- [ ] Create daily reset cron job
- [ ] Create monthly reset cron job

---

## Week 6: Account Pools & Load Balancing

### Pool Models
- [ ] Create AccountPool model
- [ ] Create PoolMembership model
- [ ] Run migration

### Pool CRUD
- [ ] POST /api/account-pools
- [ ] GET /api/account-pools
- [ ] GET /api/account-pools/:id
- [ ] PATCH /api/account-pools/:id
- [ ] DELETE /api/account-pools/:id
- [ ] POST /api/account-pools/:id/accounts
- [ ] DELETE /api/account-pools/:id/accounts/:accountId

### Load Balancing Strategies
- [ ] Create strategy interface
- [ ] WeightedStrategy
- [ ] RoundRobinStrategy
- [ ] CapacityStrategy
- [ ] LowestCostStrategy
- [ ] LeastLoadStrategy
- [ ] HighestSuccessStrategy
- [ ] StrategyFactory

### Account Selection Service
- [ ] account-selector.service.ts
- [ ] Get pool for company
- [ ] Apply strategy
- [ ] Verify limits/restrictions
- [ ] Log selection decision

### Failover Logic
- [ ] failover.service.ts
- [ ] Handle transaction failure
- [ ] Mark account as degraded
- [ ] Try next account
- [ ] Temporary exclusion
- [ ] Auto-recovery check

---

## Week 6: Accounts & Pools Dashboard

### Merchant Accounts UI
- [ ] /settings/accounts page
- [ ] Accounts list table
- [ ] Add Account modal (multi-step)
- [ ] Edit Account modal
- [ ] Account Detail page
- [ ] Usage meters visualization

### Account Pools UI
- [ ] /settings/pools page
- [ ] Pools list
- [ ] Add Pool modal
- [ ] Pool Detail page
- [ ] Drag-drop account ordering
- [ ] Weight sliders
- [ ] Pool statistics charts

### Integration
- [ ] Integrate account selection with payment flow
- [ ] Update transaction model (add merchantAccountId)
- [ ] Update transaction list UI
- [ ] Test complete flow

---

# PHASE 3: GATEWAY RULE ENGINE (Weeks 8-10)

## Week 10: Rule Engine Core

### Rule Models
- [ ] Create RoutingRule model
- [ ] Create RuleVersion model
- [ ] Update RoutingDecision model
- [ ] Run migration

### Condition Evaluators
- [ ] Create evaluator interface
- [ ] GeographyEvaluator
- [ ] AmountEvaluator
- [ ] TimeEvaluator
- [ ] CustomerEvaluator
- [ ] ProductEvaluator
- [ ] PaymentMethodEvaluator
- [ ] EvaluatorFactory

### Rule Actions
- [ ] Create action interface
- [ ] RouteToPoolAction
- [ ] RouteToAccountAction
- [ ] BlockAction
- [ ] SurchargeAction
- [ ] DiscountAction
- [ ] Require3DSAction
- [ ] FlagForReviewAction
- [ ] AddMetadataAction
- [ ] ActionExecutor

---

## Week 10: Rule Engine API

### Rule Engine Service
- [ ] rule-engine.service.ts
- [ ] loadRules() with caching
- [ ] evaluateRules()
- [ ] AND/OR condition groups
- [ ] Default rule handling
- [ ] Performance < 10ms

### Rule CRUD API
- [ ] POST /api/routing-rules
- [ ] GET /api/routing-rules
- [ ] GET /api/routing-rules/:id
- [ ] PATCH /api/routing-rules/:id
- [ ] DELETE /api/routing-rules/:id
- [ ] POST /api/routing-rules/reorder
- [ ] PATCH /api/routing-rules/:id/toggle

### Testing & Analytics
- [ ] POST /api/routing-rules/test
- [ ] POST /api/routing-rules/simulate
- [ ] GET /api/routing-rules/:id/analytics
- [ ] Integrate with payment flow

---

## Week 10: Rule Engine Dashboard

### Rules Management UI
- [ ] /settings/routing page
- [ ] Rules list (priority order)
- [ ] Drag-drop reorder
- [ ] Quick toggle on/off

### Rule Builder
- [ ] Rule Builder wizard (5 steps)
- [ ] Visual condition builder
- [ ] Condition type components
- [ ] Action configuration
- [ ] Schedule configuration

### Rule Testing UI
- [ ] Sample transaction form
- [ ] Test results display
- [ ] Condition breakdown
- [ ] A/B testing setup

---

# PHASE 4: BILLING SYSTEM (Weeks 11-12)

## Week 11: Usage Tracking

### Billing Models
- [ ] Create PricingPlan model
- [ ] Create ClientSubscription model
- [ ] Create UsagePeriod model
- [ ] Create UsageEvent model
- [ ] Create Invoice model
- [ ] Run migration

### Usage Tracking Service
- [ ] usage-tracking.service.ts
- [ ] trackTransaction()
- [ ] trackApiCall()
- [ ] trackResource()
- [ ] getCurrentUsage()
- [ ] Usage aggregation job

### Plans & Subscriptions
- [ ] Seed pricing plans (Starter, Growth, Pro, Enterprise)
- [ ] billing.service.ts
- [ ] GET /api/billing/subscription
- [ ] GET /api/billing/usage
- [ ] GET /api/billing/plans

---

## Week 12: Invoicing & Dashboard

### Invoice Generation
- [ ] invoice.service.ts
- [ ] generateInvoice()
- [ ] PDF generation (PDFKit)
- [ ] Store in S3
- [ ] GET /api/billing/invoices
- [ ] GET /api/billing/invoices/:id/pdf

### Stripe Integration
- [ ] Install Stripe SDK
- [ ] stripe.service.ts
- [ ] Stripe webhook handler
- [ ] Subscription management endpoints

### Billing Dashboard
- [ ] /billing page
- [ ] Current plan card
- [ ] Usage summary with progress bars
- [ ] Usage charts
- [ ] Invoices table
- [ ] Plan selection modal
- [ ] Payment methods section

---

# PHASE 5: MOMENTUM CORE (Weeks 13-15)

## Week 13: Churn Prediction

### Churn Models
- [ ] Create ChurnSignal model
- [ ] Create ChurnRiskScore model
- [ ] Create CustomerEngagementMetrics model
- [ ] Run migration
- [ ] Define 22 signal types
- [ ] Define signal weights

### Signal Detection
- [ ] churn-signal.service.ts
- [ ] detectSignals()
- [ ] Individual signal detectors
- [ ] Signal decay logic
- [ ] intent-detection.service.ts

### Risk Score
- [ ] churn-risk.service.ts
- [ ] calculateRiskScore()
- [ ] Risk level thresholds
- [ ] Risk monitoring job
- [ ] Churn API endpoints
- [ ] Churn events

---

## Week 13: Customer Save System

### Save Flow Models
- [ ] Create SaveFlowConfig model
- [ ] Create SaveFlowSession model
- [ ] Run migration
- [ ] Define 7 stages
- [ ] Define cancel reasons

### Save Flow Service
- [ ] save-flow.service.ts
- [ ] startSaveFlow()
- [ ] progressStage()
- [ ] offerIntervention()
- [ ] Intervention logic per reason
- [ ] Nuclear offer
- [ ] Loss visualization

### Winback
- [ ] winback.service.ts
- [ ] Winback sequence (7, 14, 30 days)
- [ ] Save flow API endpoints
- [ ] Save flow events

---

## Week 15: Behavioral Triggers

### Trigger System
- [ ] Define 13 behavioral triggers
- [ ] Trigger configuration
- [ ] Create TriggerApplication model

### Trigger Implementation
- [ ] behavioral-trigger.service.ts
- [ ] Implement all 13 triggers
- [ ] Variable substitution
- [ ] Context-based selection

### Trigger Integration
- [ ] Trigger API endpoints
- [ ] Integrate with save flow
- [ ] Trigger analytics
- [ ] Documentation

---

# PHASE 6: CS AI (Weeks 16-17)

## Week 16: Voice AI Customer Service

### CS Models
- [ ] Create CSConfig model
- [ ] Create CSSession model
- [ ] Run migration

### CS AI Service
- [ ] cs-ai.service.ts
- [ ] startSession()
- [ ] processMessage()
- [ ] escalateToTier2()
- [ ] escalateToHuman()
- [ ] AI prompt templates (Alex, Sarah)
- [ ] Integrate AWS Bedrock
- [ ] Escalation triggers
- [ ] Sentiment analysis

### CS API
- [ ] POST /api/cs/session
- [ ] POST /api/cs/session/:id/message
- [ ] POST /api/cs/session/:id/escalate
- [ ] CS events
- [ ] CS widget component

---

## Week 17: RMA & Refunds

### Refund System
- [ ] Create RefundConfig model
- [ ] Create RefundRequest model
- [ ] refund.service.ts
- [ ] Auto-approval rules
- [ ] Refund API endpoints

### RMA System
- [ ] Create RMAConfig model
- [ ] Create RMARequest model
- [ ] rma.service.ts
- [ ] AI save attempt before RMA
- [ ] Shipping label generation
- [ ] RMA portal page

### Terms & Conditions
- [ ] Create TermsConditions model
- [ ] Create TermsAcceptance model
- [ ] terms.service.ts
- [ ] AI summary generation
- [ ] AI Q&A about policies
- [ ] Integrate with CS AI

---

# PHASE 7: COMMUNICATIONS (Weeks 18-19)

## Week 18: Content Generation

### Content Models
- [ ] Create ContentTemplate model
- [ ] Create GeneratedContent model
- [ ] Create ContentGenerationConfig model
- [ ] Run migration

### Content Generation Service
- [ ] content-generation.service.ts
- [ ] generateContent()
- [ ] generateVariations()
- [ ] scoreQuality()
- [ ] AI provider abstraction
- [ ] Claude provider (Bedrock)
- [ ] Ollama provider
- [ ] Prompt templates

### Content API & Dashboard
- [ ] Content API endpoints
- [ ] Templates list
- [ ] Template editor
- [ ] Content review queue

---

## Week 19: Delivery Orchestration

### Delivery Models
- [ ] Create DeliveryConfig model
- [ ] Create DeliveryMessage model
- [ ] Create Automation model
- [ ] Create AutomationEnrollment model
- [ ] Run migration

### Delivery Service
- [ ] delivery.service.ts
- [ ] sendMessage()
- [ ] processQueue()
- [ ] trackEvent()
- [ ] Email provider (AWS SES)
- [ ] SMS provider (AWS SNS/Twilio)
- [ ] Push provider (AWS SNS)
- [ ] Send-time optimization
- [ ] Webhook handlers

### Automations
- [ ] automation.service.ts
- [ ] Define triggers
- [ ] Define step types
- [ ] Automation processor job
- [ ] Automation API
- [ ] Automation builder UI

---

# PHASE 8: REVENUE # PHASE 8: REVENUE & ANALYTICS (Weeks 19-20) ANALYTICS (Weeks 20-21)

## Week 20: Upsell Module

### Upsell Models
- [ ] Create UpsellConfig model
- [ ] Create UpsellOffer model
- [ ] Create UpsellPresentation model
- [ ] Run migration

### Upsell Service
- [ ] upsell.service.ts
- [ ] getRecommendations()
- [ ] presentOffer()
- [ ] acceptOffer()
- [ ] Recommendation engine
- [ ] Define upsell triggers

### Upsell UI
- [ ] Upsell components (modal, banner, card)
- [ ] Upsell management UI
- [ ] Integrate with save flow
- [ ] Integrate with checkout

---

## Week 21: Analytics Dashboard

### Analytics Models
- [ ] Create MetricSnapshot model
- [ ] Create ReportConfig model
- [ ] Run migration

### Analytics Service
- [ ] analytics.service.ts
- [ ] getDashboard()
- [ ] getChurnAnalytics()
- [ ] getSaveFlowAnalytics()
- [ ] getCSAnalytics()
- [ ] getContentAnalytics()
- [ ] getDeliveryAnalytics()
- [ ] getUpsellAnalytics()
- [ ] Aggregation jobs

### Analytics Dashboard UI
- [ ] /analytics page
- [ ] Date range selector
- [ ] KPI cards
- [ ] Charts (churn, save flow, channels, etc.)
- [ ] Segment views
- [ ] Scheduled reports
- [ ] Export functionality

---

# PHASE 9: ALPHA DEPLOYMENT (Weeks 22-24)

## Week 22: AWS Infrastructure

### Infrastructure as Code
- [ ] Create Terraform project
- [ ] Create VPC (subnets, NAT, IGW)
- [ ] Create Security Groups
- [ ] Create IAM roles
- [ ] Create KMS keys

### Core Services
- [ ] RDS PostgreSQL (Multi-AZ)
- [ ] ElastiCache Redis
- [ ] ECS Cluster
- [ ] ECS Services (API, Dashboard, Worker)
- [ ] Application Load Balancers
- [ ] S3 buckets
- [ ] ECR repositories

### Secrets & DNS
- [ ] Secrets Manager secrets
- [ ] Route 53 configuration
- [ ] ACM certificates
- [ ] CloudFront distributions
- [ ] WAF rules

---

## Week 23: CI/CD & Monitoring

### CI/CD Pipeline
- [ ] GitHub Actions workflows (CI)
- [ ] GitHub Actions workflows (deploy)
- [ ] CodePipeline
- [ ] CodeBuild project
- [ ] Deployment scripts
- [ ] Test pipeline

### Monitoring & Alerting
- [ ] CloudWatch log groups
- [ ] CloudWatch alarms
- [ ] Datadog integration
- [ ] Sentry integration
- [ ] Slack alerts
- [ ] Health endpoints

### Security & Backup
- [ ] Security group review
- [ ] IAM policy review
- [ ] CloudTrail enabled
- [ ] RDS backups configured
- [ ] S3 versioning
- [ ] Create runbooks

---

## Week 24: Production Launch

### Pre-Launch Testing
- [ ] Deploy to staging
- [ ] Smoke tests
- [ ] Integration tests
- [ ] Security testing
- [ ] Performance testing

### Production Deploy
- [ ] Final checklist verification
- [ ] Deploy to production
- [ ] Coffee Explorer integration
- [ ] Post-deploy verification

### Stabilization
- [ ] Monitor first 24 hours
- [ ] API documentation complete
- [ ] Admin guide complete
- [ ] Operational handoff
- [ ] Plan Phase 2 improvements

---

## ✅ ALPHA COMPLETE

When all boxes checked:
- Full platform operational
- All features deployed
- Monitoring active
- Documentation complete
- Ready for customers

---

## Progress Summary

```
Phase 1: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]  0%
Phase 2: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]  0%
Phase 3: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]  0%
Phase 4: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]  0%
Phase 5: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]  0%
Phase 6: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]  0%
Phase 7: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]  0%
Phase 8: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]  0%
Phase 9: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]  0%

Overall: 0% Complete
```

---

*Master Checklist v1.1*
*Total: 24 weeks | ~550 tasks*
*Includes Integrations Framework (Week 3)*
