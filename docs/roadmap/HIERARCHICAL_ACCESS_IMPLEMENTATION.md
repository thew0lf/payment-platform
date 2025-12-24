# Hierarchical Access Control Implementation Plan

## Executive Summary

This document outlines the implementation plan for enabling full hierarchical access control where:
- **ORGANIZATION** users can do everything
- **CLIENT** users have all COMPANY powers + manage companies + manage company users
- **COMPANY** users manage their own team + all daily operations
- **RBAC** further restricts what specific users can do within their scope

---

## Current State Analysis

### What's Already Working ✅

| Service | ORGANIZATION | CLIENT | COMPANY | Notes |
|---------|--------------|--------|---------|-------|
| Orders | ✅ | ✅ | ✅ | Full multi-scope support |
| Customers | ✅ | ✅ | ✅ | Full multi-scope support |
| Transactions | ✅ | ✅ | ✅ | Full multi-scope support |
| Products | ✅ | ✅ | ✅ | Full multi-scope support |
| Dashboard | ✅ | ✅ | ✅ | Full multi-scope support |
| Companies | ✅ | ✅ | ❌ | CLIENT can manage own companies |

### What Needs Work ⚠️

| Service | Current | Target | Priority |
|---------|---------|--------|----------|
| **Users/Team** | ORG only | ORG + CLIENT + COMPANY | 🔴 Critical |
| **Refunds** | ORG only? | ORG + CLIENT + COMPANY | 🟡 High |
| **Fulfillment** | ORG only? | ORG + CLIENT + COMPANY | 🟡 High |
| **Integrations** | ORG only | ORG + CLIENT + COMPANY | 🟡 High |
| **API Keys** | ORG only | ORG + CLIENT + COMPANY | 🟢 Medium |
| **Roles/RBAC** | ORG only? | ORG + CLIENT + COMPANY | 🟡 High |
| **Audit Logs** | ORG only? | ORG + CLIENT + COMPANY | 🟢 Medium |
| **CS AI** | Not implemented | ORG + CLIENT + COMPANY | 🟢 Medium |
| **Momentum** | Not implemented | ORG + CLIENT + COMPANY | 🟢 Medium |
| **Funnels/Leads** | ORG only? | ORG + CLIENT + COMPANY | 🟡 High |

### Organization-ONLY Features (By Design)

These should remain ORG-only:
- **Clients** management (managing who's on the platform)
- **Vendors** management (marketplace vendors)
- **Platform Settings** (global platform config)
- **Feature Development** (internal dev tools)
- **Founders Waitlist** (invite management)

---

## Architecture Principles

### 1. Scope = Ceiling (Where)
```
ORGANIZATION → Can see ALL clients, companies, users
CLIENT       → Can see own client + all companies under it + all users in those
COMPANY      → Can see only own company + users in that company
```

### 2. RBAC = Permissions (What)
```
Within any scope level:
  ADMIN   → Full access within scope
  MANAGER → User mgmt + operations
  USER    → Operations only
  VIEWER  → Read-only
```

### 3. Access Formula
```
ACTUAL_ACCESS = SCOPE_CEILING ∩ RBAC_PERMISSIONS
```

---

## Implementation Phases

### Phase 1: Core User Management (Critical)
**Goal:** Enable CLIENT and COMPANY users to manage their own teams

#### Backend Changes

**File: `apps/api/src/users/users.service.ts`**
```typescript
// UPDATE: Allow CLIENT and COMPANY scope for user management
async findAll(user: AuthenticatedUser, query: UserQueryDto) {
  // Remove ORG-only restriction

  // Build where clause based on scope
  const where: any = {
    deletedAt: null,
  };

  switch (user.scopeType) {
    case 'ORGANIZATION':
      // Can see all users in org
      where.organizationId = user.organizationId;
      if (query.clientId) where.clientId = query.clientId;
      if (query.companyId) where.companyId = query.companyId;
      break;

    case 'CLIENT':
      // Can see CLIENT-level users + all COMPANY users under them
      where.OR = [
        { clientId: user.clientId, scopeType: 'CLIENT' },
        { company: { clientId: user.clientId } },
      ];
      if (query.companyId) {
        // Verify company belongs to their client
        where.companyId = query.companyId;
      }
      break;

    case 'COMPANY':
      // Can only see users in their company
      where.companyId = user.companyId;
      break;

    default:
      throw new ForbiddenException('Access denied');
  }

  // ... rest of query logic
}
```

**File: `apps/api/src/users/users.controller.ts`**
- Update all endpoints to use scope-aware filtering
- Add validation for invite/create operations

**New Helper in HierarchyService:**
```typescript
// apps/api/src/hierarchy/hierarchy.service.ts

/**
 * Get accessible user IDs based on scope
 * - ORG: All users in organization
 * - CLIENT: Client users + all company users under client
 * - COMPANY: Only company users
 */
async getAccessibleUserScope(user: AuthenticatedUser): Promise<{
  organizationId?: string;
  clientId?: string;
  companyId?: string;
  scopeFilter: any;
}> {
  switch (user.scopeType) {
    case 'ORGANIZATION':
      return {
        organizationId: user.organizationId,
        scopeFilter: { organizationId: user.organizationId },
      };

    case 'CLIENT':
      return {
        clientId: user.clientId,
        scopeFilter: {
          OR: [
            { clientId: user.clientId, scopeType: 'CLIENT' },
            { company: { clientId: user.clientId } },
          ],
        },
      };

    case 'COMPANY':
      return {
        companyId: user.companyId,
        scopeFilter: { companyId: user.companyId },
      };

    default:
      throw new ForbiddenException('Invalid scope');
  }
}

/**
 * Validate that user can manage another user
 * - ORG: Can manage any user
 * - CLIENT: Can manage client users + company users under them
 * - COMPANY: Can manage only company users
 */
async canManageUser(actor: AuthenticatedUser, targetUserId: string): Promise<boolean> {
  const targetUser = await this.prisma.user.findUnique({
    where: { id: targetUserId },
    include: { company: true },
  });

  if (!targetUser) return false;

  switch (actor.scopeType) {
    case 'ORGANIZATION':
      return targetUser.organizationId === actor.organizationId;

    case 'CLIENT':
      // Can manage client-level users under their client
      if (targetUser.scopeType === 'CLIENT' && targetUser.clientId === actor.clientId) {
        return true;
      }
      // Can manage company users whose company belongs to their client
      if (targetUser.scopeType === 'COMPANY' && targetUser.company?.clientId === actor.clientId) {
        return true;
      }
      return false;

    case 'COMPANY':
      return targetUser.companyId === actor.companyId;

    default:
      return false;
  }
}
```

#### Frontend Changes

**File: `apps/admin-dashboard/src/lib/navigation.ts`**
- No changes needed - Team already in Settings section (accessible to all)

**File: `apps/admin-dashboard/src/app/(dashboard)/settings/team/page.tsx`**
- Already exists, just needs to work with scoped API

---

### Phase 2: Settings & Configuration
**Goal:** Enable scope-based settings management

#### Services to Update

| Service | File | Changes |
|---------|------|---------|
| **Roles** | `rbac/rbac.service.ts` | Allow CLIENT/COMPANY to manage roles at their level |
| **Integrations** | `integrations/services/*.ts` | Allow CLIENT/COMPANY to manage their integrations |
| **API Keys** | `api-keys/api-keys.service.ts` | Allow CLIENT/COMPANY to manage their keys |
| **General Settings** | `settings/settings.service.ts` | Scope-specific settings |

#### Key Pattern for All Services
```typescript
// Standard scope validation pattern
private validateScopeAccess(user: AuthenticatedUser, requiredScopes: ScopeType[]) {
  if (!requiredScopes.includes(user.scopeType as ScopeType)) {
    throw new ForbiddenException('Access denied for your scope level');
  }
}

// Standard scope filtering for queries
private buildScopeWhere(user: AuthenticatedUser) {
  switch (user.scopeType) {
    case 'ORGANIZATION':
      return { organizationId: user.organizationId };
    case 'CLIENT':
      return { clientId: user.clientId };
    case 'COMPANY':
      return { companyId: user.companyId };
    default:
      throw new ForbiddenException('Invalid scope');
  }
}
```

---

### Phase 3: Operational Features
**Goal:** Ensure all daily operations work at all scope levels

#### Already Working (Verify)
- Orders ✅
- Customers ✅
- Transactions ✅
- Products ✅
- Dashboard ✅

#### Needs Verification/Updates

**Refunds** (`apps/api/src/refunds/`)
- Check if properly scoped
- Update to use `getAccessibleCompanyIds()`

**Fulfillment/Shipments** (`apps/api/src/fulfillment/`)
- Check if properly scoped
- Update to use hierarchy service patterns

**Subscriptions** (`apps/api/src/subscriptions/`)
- Check if properly scoped
- Update as needed

---

### Phase 4: Advanced Features
**Goal:** Enable CS AI, Momentum, Marketing at all scope levels

#### CS AI Module
- Conversations should be company-scoped
- Voice calls should be company-scoped
- Analytics should aggregate based on scope

#### Momentum Intelligence
- Churn risk per company
- Save flows per company
- Triggers per company

#### Marketing (Funnels, Leads)
- Funnels are company-specific
- Leads are company-specific
- Already using `companyId` in queries

---

## File Change Summary

### Backend (apps/api/src/)

| Priority | File | Action |
|----------|------|--------|
| 🔴 | `users/users.service.ts` | Add CLIENT + COMPANY scope support |
| 🔴 | `users/users.controller.ts` | Update all endpoints |
| 🔴 | `hierarchy/hierarchy.service.ts` | Add `getAccessibleUserScope()`, `canManageUser()` |
| 🟡 | `rbac/rbac.service.ts` | Add scope-based role management |
| 🟡 | `integrations/services/client-integration.service.ts` | Add COMPANY scope |
| 🟡 | `api-keys/api-keys.service.ts` | Add CLIENT + COMPANY scope |
| 🟡 | `refunds/services/refunds.service.ts` | Verify/add scope support |
| 🟡 | `fulfillment/fulfillment.service.ts` | Verify/add scope support |
| 🟢 | `settings/*.service.ts` | Scope-specific settings |
| 🟢 | `audit-logs/audit-logs.service.ts` | Verify scope filtering |

### Frontend (apps/admin-dashboard/src/)

| Priority | File | Action |
|----------|------|--------|
| 🟢 | `lib/navigation.ts` | Minor updates for scope visibility |
| 🟢 | Components | Most already work - just need backend support |

---

## Migration & Testing Strategy

### Testing Checklist

For each service, test with:
1. **ORG admin** - Should see everything
2. **CLIENT admin** - Should see client + companies
3. **CLIENT viewer** - Read-only client + companies
4. **COMPANY admin** - Should see only their company
5. **COMPANY viewer** - Read-only their company

### Test Scenarios

```
Scenario 1: User Management
  Given: CLIENT admin "John" at T&G Consulting
  And: COMPANY user "Mike" at Coffee Brand A (under T&G)
  And: COMPANY user "Jane" at Coffee Brand B (under T&G)
  And: COMPANY user "Alex" at Other Company (different client)

  When: John lists users
  Then: John sees himself, Mike, Jane
  And: John does NOT see Alex

  When: John invites a new user to Coffee Brand A
  Then: User is created with companyId = Coffee Brand A

  When: Mike lists users
  Then: Mike sees only Coffee Brand A users
  And: Mike does NOT see Jane or John

Scenario 2: Orders
  Given: CLIENT admin at T&G with companies A, B, C
  When: Admin views orders without company filter
  Then: Sees orders from A, B, and C combined

  When: Admin filters by Company A
  Then: Sees only Company A orders

  Given: COMPANY user at Company A
  When: User views orders
  Then: Sees ONLY Company A orders
  And: Cannot access Company B or C orders via API
```

---

## Rollout Plan

### Week 1: Phase 1 (User Management)
- [ ] Update `hierarchy.service.ts` with new helper methods
- [ ] Update `users.service.ts` for multi-scope
- [ ] Update `users.controller.ts` endpoints
- [ ] Test with ORG, CLIENT, COMPANY users
- [ ] Deploy to staging

### Week 2: Phase 2 (Settings)
- [ ] Update RBAC service
- [ ] Update Integrations service
- [ ] Update API Keys service
- [ ] Test role management at each level
- [ ] Deploy to staging

### Week 3: Phase 3 (Operations)
- [ ] Verify/fix Refunds
- [ ] Verify/fix Fulfillment
- [ ] Verify/fix Subscriptions
- [ ] Comprehensive testing
- [ ] Deploy to staging

### Week 4: Phase 4 + Production
- [ ] CS AI module scope support
- [ ] Momentum module scope support
- [ ] Full regression testing
- [ ] Production deployment

---

## Security Considerations

1. **Never Trust Client-Provided Scope IDs**
   - Always verify via `canAccessCompany()`, `canManageUser()`, etc.
   - Query params for filtering, NOT for authorization

2. **Audit All Access**
   - Log when users access data outside their direct scope
   - Log all user management actions

3. **RBAC Ceiling**
   - Users cannot grant permissions they don't have
   - CLIENT cannot create ORG-level roles
   - COMPANY cannot create CLIENT-level roles

4. **Soft Delete Scope**
   - Deleted items respect same scope rules
   - Users can only restore items they could originally access

---

## Summary

### Key Changes Required

1. **Backend Services**: ~10 services need scope expansion
2. **Hierarchy Service**: 2 new helper methods
3. **Frontend**: Minimal changes (already built for multi-scope)

### Success Criteria

- [ ] CLIENT admins can manage all users under their client
- [ ] COMPANY admins can manage users in their company
- [ ] All features work at ORG, CLIENT, COMPANY levels
- [ ] RBAC properly restricts actions within each scope
- [ ] No security regressions

---

*Created: December 22, 2025*
*Author: Senior Architect Review*
