# Security & Code Quality Review

> Review Date: 2025-01-28
> Status: Action Required

This document tracks security vulnerabilities, code quality issues, and technical debt identified during senior developer review.

---

## Critical Issues (Week 1)

### Authentication & Security

- [ ] **Implement refresh token mechanism**
  - Location: `apps/api/src/auth/auth.module.ts:21`
  - Current: JWT tokens valid for 7 days with no refresh
  - Fix: Reduce access token to 15 minutes, implement refresh token rotation
  - Priority: P0

- [ ] **Add token blacklist/revocation**
  - Location: `apps/api/src/auth/auth.controller.ts:65-71`
  - Current: Logout is client-side only, tokens can't be revoked
  - Fix: Implement Redis-based token blacklist, invalidate on logout/password change
  - Priority: P0

- [ ] **Add rate limiting to auth endpoints**
  - Location: Missing entirely
  - Fix: Add `@nestjs/throttler` with 5 attempts per 15 minutes on login
  - Priority: P0

- [ ] **Remove sensitive debug logging**
  - Locations:
    - `apps/api/src/auth/auth.service.ts:92-120` (4 console.log statements)
    - `apps/api/src/auth/strategies/auth0.strategy.ts:53`
  - Fix: Replace with proper Logger, remove sensitive data from logs
  - Priority: P0

### Error Handling

- [ ] **Add global exception filter**
  - Location: `apps/api/src/main.ts`
  - Current: No centralized error handling
  - Fix: Create `AllExceptionsFilter`, register globally
  - Priority: P0

- [ ] **Add unhandled rejection handlers**
  - Location: `apps/api/src/main.ts`
  - Fix: Add `process.on('unhandledRejection')` and `process.on('uncaughtException')`
  - Priority: P0

- [ ] **Sanitize error responses**
  - Location: `apps/api/src/payments/providers/payflow.provider.ts:38-101`
  - Current: Raw error messages exposed to clients
  - Fix: Return generic messages, log full details internally
  - Priority: P0

---

## High Priority Issues (Week 2)

### Input Validation

- [ ] **Add `forbidUnknownValues: true` to ValidationPipe**
  - Location: `apps/api/src/main.ts:9-13`
  - Priority: P1

- [ ] **Create DTOs for all query parameters**
  - Locations:
    - `apps/api/src/orders/orders.controller.ts:61-72` (stats endpoint)
    - `apps/api/src/payments/payments.controller.ts:38-98`
    - `apps/api/src/merchant-accounts/merchant-accounts.controller.ts:45-70`
    - `apps/api/src/customers/customers.controller.ts:11-28`
    - `apps/api/src/dashboard/dashboard.controller.ts:39-51`
  - Priority: P1

- [ ] **Add credit card validation decorators**
  - Location: `apps/api/src/payments/payments.controller.ts:8-14`
  - Current: CardDto has no validation (PCI compliance risk)
  - Fix: Add @Matches for card number, expiry, CVV patterns
  - Priority: P1

- [ ] **Add @Max() bounds to pagination params**
  - Locations: All query DTOs with limit/offset
  - Fix: Add `@Max(1000)` to limit, `@Max(100000)` to offset
  - Priority: P1

- [ ] **Validate date strings**
  - Location: `apps/api/src/orders/dto/order.dto.ts:280-284`
  - Fix: Use `@IsDateString()` instead of `@IsString()`
  - Priority: P1

- [ ] **Add @IsUrl() to URL fields**
  - Location: `apps/api/src/fulfillment/dto/shipment.dto.ts:104-114`
  - Priority: P1

### Security Headers

- [ ] **Add helmet middleware**
  - Location: `apps/api/src/main.ts`
  - Fix: `npm install helmet` and `app.use(helmet())`
  - Priority: P1

- [ ] **Environment-based CORS configuration**
  - Location: `apps/api/src/main.ts:15-26`
  - Current: Hardcoded HTTP origins
  - Fix: Use environment variables, require HTTPS in production
  - Priority: P1

### OAuth Security

- [ ] **Validate OAuth state parameter**
  - Location: `apps/api/src/integrations/integrations.controller.ts:207-219`
  - Current: State not validated against session (CSRF vulnerability)
  - Fix: Store state in session, validate on callback
  - Priority: P1

---

## Medium Priority Issues (Week 3)

### Database Indexes

- [ ] **Add User.email index**
  - Location: `apps/api/prisma/schema.prisma:178-227`
  - Fix: Add `@@index([email])`
  - Priority: P2

- [ ] **Add Transaction composite indexes**
  - Location: `apps/api/prisma/schema.prisma:881-885`
  - Fix: Add `@@index([companyId, paymentStatus, createdAt])`
  - Priority: P2

- [ ] **Add Customer email index**
  - Location: `apps/api/prisma/schema.prisma:287-289`
  - Fix: Add `@@index([companyId, email])`
  - Priority: P2

- [ ] **Add Subscription status index**
  - Location: `apps/api/prisma/schema.prisma:775-822`
  - Fix: Add `@@index([companyId, status])`
  - Priority: P2

- [ ] **Add Product status index**
  - Location: `apps/api/prisma/schema.prisma:495-498`
  - Fix: Add `@@index([companyId, status, trackInventory])`
  - Priority: P2

- [ ] **Add Order fulfillment index**
  - Location: `apps/api/prisma/schema.prisma:598-602`
  - Fix: Add `@@index([companyId, status, fulfillmentStatus])`
  - Priority: P2

### Soft Delete & Audit

- [ ] **Implement proper soft delete pattern**
  - Location: Multiple models in schema.prisma
  - Current: Cascading deletes risk data loss
  - Fix: Add `deletedAt`, `deletedBy` fields; change cascade to SetNull
  - Priority: P2

- [ ] **Add audit trail for deletions**
  - Fix: Create audit log table, log all delete operations
  - Priority: P2

---

## Low Priority Issues (Week 4)

### Code Quality

- [ ] **Replace Record<string, any> with typed DTOs**
  - Location: `apps/api/src/momentum-intelligence/dto/momentum.dto.ts:235-251`
  - Fix: Create specific DTOs with @ValidateNested()
  - Priority: P3

- [ ] **Replace console.* with Logger**
  - Locations:
    - `apps/api/src/auth/auth.service.ts:92,97`
    - `apps/api/src/main.ts:33`
  - Priority: P3

- [ ] **Make encryption key mandatory**
  - Location: `apps/api/src/integrations/services/credential-encryption.service.ts:23-27`
  - Current: Generates temp key if env var missing (dangerous in production)
  - Fix: Throw error instead of warning
  - Priority: P3

- [ ] **Standardize null/undefined handling**
  - Current: Some services return null, others throw NotFoundException
  - Fix: Establish pattern - throw for not found, return null only for optional
  - Priority: P3

### Missing Features

- [ ] **Implement email verification flow**
  - Location: `apps/api/prisma/schema.prisma:189`
  - Current: `emailVerified` field exists but unused
  - Priority: P3

- [ ] **Add account lockout mechanism**
  - Fix: Track failed login attempts, lock after 5 failures for 30 min
  - Priority: P3

- [ ] **Add concurrent session detection**
  - Fix: Track sessions with IP/user-agent, alert on suspicious patterns
  - Priority: P3

---

## Good Patterns (Keep These)

- [x] bcrypt password hashing with proper salt rounds
- [x] AES-256-GCM encryption for credentials with key versioning
- [x] Auth0 JWKS integration with rate limiting
- [x] Strong DTO validation in orders/products with MaxLength, Min, enums
- [x] Prisma transactions with proper isolation levels
- [x] Hierarchy-based access control via HierarchyService
- [x] No raw SQL queries - all parameterized via Prisma
- [x] API key hashing with SHA-256
- [x] Promise.all for batch queries - good N+1 prevention
- [x] companyId validation added to getCompanyIdForQuery() (fixed 2025-01-28)

---

## Progress Tracking

| Week | Category | Issues | Completed |
|------|----------|--------|-----------|
| 1 | Critical Security | 7 | 0 |
| 2 | Validation & Headers | 8 | 0 |
| 3 | Database & Audit | 8 | 0 |
| 4 | Code Quality | 7 | 0 |
| **Total** | | **30** | **0** |

---

## References

- [OWASP Top 10](https://owasp.org/Top10/)
- [NestJS Security](https://docs.nestjs.com/security/helmet)
- [PCI DSS Requirements](https://www.pcisecuritystandards.org/)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
