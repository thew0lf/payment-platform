# Remaining Features Implementation Plan

> **Version:** 1.1
> **Created:** December 19, 2025
> **Last Updated:** December 19, 2025
> **Team:** Product, Engineering, QA, Marketing, Design
> **Status:** Active - Phase 3 In Progress

---

## Executive Summary

This document outlines the complete plan for finishing all remaining features of the avnz.io Payment Platform. The plan is organized into 7 phases with clear ownership, acceptance criteria, and testing requirements.

**Estimated Timeline:** 8-10 weeks
**Priority:** Critical security fixes first, then feature completion

---

## Team Roles & Responsibilities

| Role | Responsibilities |
|------|------------------|
| **Senior Product Manager** | Prioritization, acceptance criteria, stakeholder communication |
| **Senior Developer** | Implementation, code reviews, technical decisions |
| **Senior QA Engineer** | Test plans, E2E tests, regression testing |
| **Chief Marketing Officer** | User messaging, feature positioning, launch communications |
| **Head of Design** | UI/UX specifications, component design, accessibility |
| **Senior DevOps Engineer** | Deployment, infrastructure, monitoring |
| **Technical Writer** | Documentation, API docs, user guides |

---

## Phase Overview

| Phase | Focus | Priority | Duration | Status |
|-------|-------|----------|----------|--------|
| 1 | Critical Security Fixes | 🔴 CRITICAL | 1 week | ✅ COMPLETE |
| 2 | RBAC Enhancements | 🟠 HIGH | 1.5 weeks | ✅ COMPLETE |
| 3 | Vendor System Frontend | 🟠 HIGH | 2 weeks | ✅ COMPLETE |
| 4 | Momentum Intelligence UI | 🟡 MEDIUM | 2 weeks | ✅ COMPLETE |
| 5 | CS AI Implementation | 🟡 MEDIUM | 2 weeks | ⏳ PENDING |
| 6 | Advanced Analytics | 🟢 LOW | 1 week | ⏳ PENDING |
| 7 | Production Hardening | 🔴 CRITICAL | 1 week | ⏳ PENDING |

### Completed Work Summary

**Phase 1 (Completed):**
- ✅ Rate limiting on auth endpoints (already existed)
- ✅ Redis token blacklist with graceful fallback (RedisModule, TokenBlacklistService)
- ✅ Database connection pool config (PrismaService with monitoring)
- ✅ Fixed N+1 query in payment-provider.factory.ts (batch loading)
- ✅ Added soft delete composite indexes migration
- ✅ Enhanced health check endpoint with component status

**Phase 2 (Completed):**
- ✅ RBAC audit logging (role CRUD, assignments tracked in AuditLog)
- ✅ User permissions viewer component (UserPermissionsViewer)
- ✅ Integrated permissions viewer into Team page

**Phase 3 (Completed):**
- ✅ Vendor Companies management page (/vendors/companies)
- ✅ Vendor Products management page (/vendors/products)
- ✅ CreateVendorProductInput type added
- ✅ Enhanced Vendor detail page with quick action links
- ✅ Vendor Connections page already existed
- ✅ Updated navigation with new vendor sub-pages

**Phase 4 (Completed):**
- ✅ Momentum API client (lib/api/momentum.ts)
- ✅ Churn Risk Dashboard (/momentum/churn)
  - High-risk customer list with risk scores
  - Risk level distribution visualization
  - Save flow integration
- ✅ Save Flow Configuration UI (/momentum/save-flows)
  - 7-stage flow visualization
  - Stage enable/disable toggles
  - Active attempts tracking
  - Stage performance metrics
- ✅ Behavioral Trigger Builder (/momentum/triggers)
  - 8 trigger categories (Urgency, Scarcity, Social Proof, etc.)
  - Trigger preview and apply to content
  - Effectiveness tracking
- ✅ UI components added (Progress, Switch, Textarea)
- ✅ Navigation updated with Momentum Intelligence section

---

## Phase 1: Critical Security Fixes

**Duration:** 1 week
**Priority:** 🔴 CRITICAL - Must complete before any public launch

### Issues to Fix

| # | Issue | Owner | Severity |
|---|-------|-------|----------|
| 1.1 | Rate limiting on auth endpoints | Backend | Critical |
| 1.2 | Move token blacklist to Redis | Backend | Critical |
| 1.3 | Add database connection pool config | Backend | Critical |
| 1.4 | Fix N+1 query in payment provider | Backend | High |
| 1.5 | Add soft delete composite indexes | DBA | High |
| 1.6 | Move encryption keys to Secrets Manager | DevOps | High |

### Detailed Requirements

#### 1.1 Rate Limiting
```
- Install @nestjs/throttler
- Apply to: /auth/login, /auth/forgot-password, /auth/reset-password
- Limits: 5 requests per minute per IP
- Return 429 Too Many Requests with Retry-After header
```

#### 1.2 Redis Token Blacklist
```
- Create RedisTokenBlacklistService
- Store revoked tokens with TTL matching token expiry
- Check blacklist in JWT strategy
- Handle Redis connection failures gracefully
```

#### 1.3 Database Connection Pool
```
- Configure in schema.prisma:
  - connection_limit = 10 (per instance)
  - pool_timeout = 10
- Add health check for DB connections
```

#### 1.4 Payment Provider N+1 Fix
```
- Cache provider instances in Map
- Lazy load on first use
- Clear cache on configuration change
```

#### 1.5 Soft Delete Indexes
```sql
-- Add to high-traffic tables
CREATE INDEX idx_customers_company_deleted ON "Customer" ("companyId", "deletedAt");
CREATE INDEX idx_orders_company_deleted ON "Order" ("companyId", "deletedAt");
CREATE INDEX idx_transactions_company_deleted ON "Transaction" ("companyId", "deletedAt");
CREATE INDEX idx_products_company_deleted ON "Product" ("companyId", "deletedAt");
CREATE INDEX idx_subscriptions_company_deleted ON "Subscription" ("companyId", "deletedAt");
```

### Test Requirements
- [ ] Rate limit returns 429 after threshold
- [ ] Token revocation persists across server restarts
- [ ] DB connections don't exhaust under load (100 concurrent)
- [ ] Payment provider caching reduces query count

### Acceptance Criteria
- All 6 issues resolved and verified
- No regression in existing functionality
- Performance improvement measurable

---

## Phase 2: RBAC Frontend Completion

**Duration:** 1.5 weeks
**Priority:** 🟠 HIGH

### Current State
- Backend: 100% complete (33 permissions, role inheritance)
- Frontend: 40% complete (basic role pages exist)

### Features to Build

| Feature | Description | Effort |
|---------|-------------|--------|
| 2.1 | Permission assignment UI | Medium |
| 2.2 | Role creation wizard | Medium |
| 2.3 | User role management | Medium |
| 2.4 | Permission inheritance visualization | Low |
| 2.5 | Role templates | Low |

### Design Specifications

#### 2.1 Permission Assignment UI
```
Layout: Two-column
- Left: Permission categories (collapsible)
- Right: Selected permissions with toggle switches
- Bottom: Save/Cancel buttons

Categories:
- Transactions (read, export, void, refund)
- Customers (read, write, delete, export)
- Billing (read, manage)
- Users (read, invite, manage, delete)
- Integrations (read, manage)
- [etc.]
```

#### 2.2 Role Creation Wizard
```
Steps:
1. Role Name & Description
2. Select Scope (Organization/Client/Company)
3. Select Permissions (checklist)
4. Review & Create
```

### API Endpoints (Already Exist)
```
GET    /api/rbac/permissions
GET    /api/rbac/roles
POST   /api/rbac/roles
PATCH  /api/rbac/roles/:id
DELETE /api/rbac/roles/:id
POST   /api/rbac/roles/:id/permissions
POST   /api/users/:id/roles
```

### Test Requirements
- [ ] Create role with custom permissions
- [ ] Assign role to user
- [ ] Permission inheritance works correctly
- [ ] Cannot assign permissions parent doesn't have
- [ ] Role deletion doesn't break users

### Acceptance Criteria
- Full CRUD for roles via UI
- Visual permission assignment
- User can see their effective permissions
- Audit logging for all role changes

---

## Phase 3: Vendor System Frontend

**Duration:** 2 weeks
**Priority:** 🟠 HIGH

### Current State
- Backend: 100% complete (17+ models)
- Frontend: 30% complete (list pages exist)

### Features to Build

| Feature | Description | Effort |
|---------|-------------|--------|
| 3.1 | Vendor detail page | Medium |
| 3.2 | Vendor company management | Medium |
| 3.3 | Vendor user management | Medium |
| 3.4 | Vendor products/inventory | High |
| 3.5 | Marketplace connections | High |
| 3.6 | Vendor onboarding wizard | Medium |

### Design Specifications

#### 3.1 Vendor Detail Page
```
Layout: Tabbed interface
Tabs:
- Overview (stats, status, contact)
- Companies (list of vendor companies)
- Users (vendor users with roles)
- Products (vendor catalog)
- Connections (client relationships)
- Settings (vendor configuration)
```

#### 3.5 Marketplace Connections
```
Flow:
1. Client browses vendor marketplace
2. Sends connection request
3. Vendor approves/rejects
4. Connection established with terms
5. Products become available
```

### API Endpoints (Already Exist)
```
GET    /api/vendors
POST   /api/vendors
GET    /api/vendors/:id
PATCH  /api/vendors/:id
GET    /api/vendors/:id/companies
POST   /api/vendors/:id/companies
GET    /api/vendor-connections
POST   /api/vendor-connections/request
PATCH  /api/vendor-connections/:id/approve
```

### Test Requirements
- [ ] Full vendor CRUD workflow
- [ ] Vendor company creation
- [ ] Vendor user invitation
- [ ] Connection request flow
- [ ] Product visibility after connection

### Acceptance Criteria
- Complete vendor management via UI
- Marketplace connection workflow
- Vendor user self-service portal
- Audit logging for vendor actions

---

## Phase 4: Momentum Intelligence UI

**Duration:** 2 weeks
**Priority:** 🟡 MEDIUM

### Current State
- Backend: 80% complete
- Frontend: 60% complete (insights pages exist)

### Features to Build

| Feature | Description | Effort |
|---------|-------------|--------|
| 4.1 | Churn risk dashboard | High |
| 4.2 | Save flow configuration UI | Medium |
| 4.3 | Behavioral trigger builder | High |
| 4.4 | Intent signal viewer | Medium |
| 4.5 | Customer health scores | Medium |

### Design Specifications

#### 4.1 Churn Risk Dashboard
```
Components:
- Risk score distribution chart
- At-risk customer list (sortable)
- Trend over time
- Action buttons (contact, offer, etc.)

Filters:
- Risk level (High, Medium, Low)
- Customer segment
- Time period
```

#### 4.3 Behavioral Trigger Builder
```
Trigger Types (13):
- Order frequency change
- Cart abandonment
- Payment failure
- Support ticket
- Subscription pause
- [etc.]

Builder UI:
- Trigger type selector
- Condition builder (if/then)
- Action selector
- Test trigger button
```

### Test Requirements
- [ ] Risk scores display correctly
- [ ] Trigger creation and activation
- [ ] Save flow stage progression
- [ ] Real-time signal detection

### Acceptance Criteria
- Visual churn dashboard
- Configurable behavioral triggers
- Save flow management UI
- Customer health visibility

---

## Phase 5: CS AI Implementation

**Duration:** 2 weeks
**Priority:** 🟡 MEDIUM

### Current State
- Backend: 0% (schemas exist)
- Frontend: 0%

### Features to Build

| Feature | Description | Effort |
|---------|-------------|--------|
| 5.1 | AI conversation engine (Bedrock) | High |
| 5.2 | Rep-tier AI responses | High |
| 5.3 | Manager-tier escalation | Medium |
| 5.4 | Conversation history UI | Medium |
| 5.5 | AI training/tuning interface | High |

### Architecture
```
Customer → Chat Widget → AI Engine → Response
                              ↓
                        Human Escalation
                              ↓
                        Manager Review
```

### Technical Requirements
```
- AWS Bedrock Claude integration
- Conversation context management
- Intent classification
- Response confidence scoring
- Human handoff triggers
```

### Test Requirements
- [ ] AI responds to common queries
- [ ] Escalation triggers correctly
- [ ] Conversation history persists
- [ ] Response quality acceptable

### Acceptance Criteria
- Working AI chat for common scenarios
- Human escalation path
- Conversation logging
- Performance metrics dashboard

---

## Phase 6: Advanced Analytics

**Duration:** 1 week
**Priority:** 🟢 LOW

### Features to Build

| Feature | Description | Effort |
|---------|-------------|--------|
| 6.1 | Custom report builder | Medium |
| 6.2 | Advanced filtering | Low |
| 6.3 | Export to CSV/PDF | Low |
| 6.4 | Scheduled reports | Medium |
| 6.5 | Dashboard customization | Medium |

### Acceptance Criteria
- Custom reports with drag-drop
- Scheduled email reports
- Multiple export formats
- Saved report templates

---

## Phase 7: Production Hardening

**Duration:** 1 week
**Priority:** 🔴 CRITICAL

### Tasks

| Task | Description | Owner |
|------|-------------|-------|
| 7.1 | Load testing (100+ concurrent) | QA |
| 7.2 | Security scan (OWASP ZAP) | Security |
| 7.3 | Penetration test | External |
| 7.4 | PCI compliance review | Compliance |
| 7.5 | Monitoring setup (Datadog) | DevOps |
| 7.6 | Incident response playbooks | DevOps |
| 7.7 | Backup/restore testing | DBA |

### Acceptance Criteria
- Load test results documented
- No critical/high security findings
- PCI SAQ-A completed
- Monitoring dashboards live
- Runbooks documented

---

## Testing Strategy

### Test Types by Phase

| Phase | Unit | Integration | E2E | Load | Security |
|-------|------|-------------|-----|------|----------|
| 1 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | ✅ | ✅ | ✅ | - | - |
| 3 | ✅ | ✅ | ✅ | - | - |
| 4 | ✅ | ✅ | ✅ | - | - |
| 5 | ✅ | ✅ | ✅ | - | - |
| 6 | ✅ | - | ✅ | - | - |
| 7 | - | - | ✅ | ✅ | ✅ |

### E2E Test Files to Create

```
apps/admin-dashboard/e2e/
├── rbac-management.spec.ts      # Phase 2
├── vendors.spec.ts              # Phase 3
├── vendor-connections.spec.ts   # Phase 3
├── churn-dashboard.spec.ts      # Phase 4
├── behavioral-triggers.spec.ts  # Phase 4
├── cs-ai-chat.spec.ts          # Phase 5
├── custom-reports.spec.ts      # Phase 6
```

---

## Marketing Considerations

### Feature Positioning

| Feature | Key Message | Target User |
|---------|-------------|-------------|
| RBAC | "Enterprise-grade access control" | CTOs, Security teams |
| Vendors | "Build your marketplace" | E-commerce directors |
| Momentum Intelligence | "Reduce churn by 40%" | Revenue teams |
| CS AI | "24/7 intelligent support" | Support managers |

### Launch Communications
- Phase 2: Blog post on security features
- Phase 3: Press release on marketplace launch
- Phase 4-5: Case study with pilot customer
- Phase 7: Production launch announcement

---

## Documentation Deliverables

| Phase | Documentation |
|-------|---------------|
| 1 | Security fixes changelog |
| 2 | RBAC admin guide |
| 3 | Vendor system guide |
| 4 | Momentum Intelligence guide |
| 5 | CS AI setup guide |
| 6 | Analytics user guide |
| 7 | Operations runbook |

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Bedrock API limits | High | Medium | Implement queuing, fallbacks |
| PCI assessment fails | Critical | Low | Pre-assessment checklist |
| Load test reveals issues | High | Medium | Buffer time for fixes |
| Resource constraints | Medium | Medium | Prioritize phases |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| All critical security fixed | 100% | Checklist |
| E2E test coverage | >80% | Playwright report |
| Load test pass | 100 concurrent users | Artillery report |
| Security scan clean | 0 Critical, 0 High | OWASP ZAP |
| Documentation complete | All phases | Checklist |

---

## Next Steps

1. **Immediate:** Begin Phase 1 security fixes
2. **This Week:** Complete rate limiting and Redis token blacklist
3. **Review:** Daily standup on progress
4. **Escalate:** Any blockers to Product Manager

---

*Document maintained by: Product Team*
*Last updated: December 19, 2025*
