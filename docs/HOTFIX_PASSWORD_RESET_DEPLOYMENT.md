# HOTFIX: Password Reset & Session Timeout Deployment Plan

## Overview

**Hotfix ID:** HOTFIX-2024-12-001  
**Feature:** SOC2/ISO Compliant Password Reset & Session Timeout  
**Risk Level:** Low (additive changes only)  
**Downtime:** None required

---

## 1. Pre-Deployment Checklist

### 1.1 Database Backup
```bash
# Take backup of production database before migration
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 1.2 Verify Migration SQL
Review the following SQL that will be executed:

```sql
-- Create password_reset_tokens table
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- Create unique index on token
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- Create index on userId for lookups
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- Create index on expiresAt for cleanup job
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- Add foreign key constraint
ALTER TABLE "password_reset_tokens" 
    ADD CONSTRAINT "password_reset_tokens_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## 2. Deployment Steps

### Step 1: Database Migration (Zero Downtime)

The migration creates a new table and doesn't modify existing schema.

```bash
# Connect to production API container/server
cd apps/api

# Generate Prisma client
npx prisma generate

# Apply migration (creates new table)
npx prisma db push

# Verify table was created
npx prisma studio
# Or via psql:
# \dt password_reset_tokens
```

### Step 2: Deploy API

```bash
# Build new API image
docker build -t avnz-payment-api:latest .

# Deploy (depends on your deployment method)
# Railway:
git push origin main

# Docker Swarm:
docker service update --image avnz-payment-api:latest api

# Kubernetes:
kubectl rollout restart deployment/api
```

### Step 3: Deploy Frontend

```bash
# Build and deploy admin dashboard
cd apps/admin-dashboard
npm run build

# Push to deployment
# Railway/Vercel will auto-deploy on push
git push origin main
```

---

## 3. Post-Deployment Verification

### 3.1 API Health Checks

```bash
# Test forgot-password endpoint
curl -X POST http://api.avnz.io/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@avnz.io"}'

# Expected: 200 OK
# Response: {"success":true,"message":"If an account exists..."}

# Test validate-reset-token (with invalid token)
curl -X POST http://api.avnz.io/api/auth/validate-reset-token \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid-token"}'

# Expected: 200 OK
# Response: {"valid":false}
```

### 3.2 Verify Token Cleanup Job

Check logs for scheduled cleanup:
```bash
docker logs api | grep "password reset token cleanup"
```

### 3.3 Verify Database Table

```sql
SELECT COUNT(*) FROM password_reset_tokens;
-- Should return 0 initially
```

---

## 4. Rollback Plan

### If Issues Occur:

1. **Revert API deployment to previous version**
   ```bash
   # Railway: Revert to previous deployment in dashboard
   # Docker:
   docker service update --image avnz-payment-api:previous api
   ```

2. **Frontend rollback**
   - Old frontend code is backwards compatible
   - No immediate action needed

3. **Database rollback (optional)**
   - The new table can remain (unused by old code)
   - To fully remove:
   ```sql
   DROP TABLE IF EXISTS "password_reset_tokens";
   ```

---

## 5. Files Changed

### Backend (apps/api)
- `prisma/schema.prisma` - Added PasswordResetToken model
- `src/auth/auth.service.ts` - Password reset methods
- `src/auth/auth.controller.ts` - Password reset endpoints
- `src/auth/auth.module.ts` - Added cleanup job
- `src/auth/jobs/password-reset-cleanup.job.ts` (NEW) - Hourly cleanup

### Frontend (apps/admin-dashboard)
- `src/app/(auth)/forgot-password/page.tsx` (NEW)
- `src/app/(auth)/reset-password/page.tsx` (NEW)
- `src/app/(auth)/login/page.tsx` - Added forgot password link
- `src/app/(dashboard)/layout.tsx` - SessionTimeoutProvider
- `src/hooks/use-session-timeout.tsx` (NEW)

### Tests
- `apps/api/src/auth/auth.service.spec.ts` - Unit tests
- `apps/api/test/password-reset.e2e-spec.ts` - E2E tests
- `apps/admin-dashboard/e2e/auth-flow.spec.ts` - Frontend E2E tests

---

## 6. Environment Variables

**No new environment variables required.**

Existing variables used:
- `DATABASE_URL` - Database connection
- `JWT_SECRET` - Token signing (existing)
- `NODE_ENV` - Controls dev token exposure

---

## 7. Monitoring

### Log Patterns to Monitor

```
# Success patterns
"Password reset token created for user"
"Password reset completed for user"
"Token cleanup completed: X tokens removed"

# Warning patterns
"Password reset rate limit exceeded"
"Attempted to use already-used reset token"
"Attempted to use expired reset token"
```

### Alerts to Configure

| Alert | Condition | Severity |
|-------|-----------|----------|
| Rate limit abuse | > 10 rate limit hits/min | Warning |
| Reset failures | > 5% error rate | Critical |
| Token accumulation | > 10000 unexpired tokens | Warning |

---

## 8. SOC2/ISO Compliance Notes

This hotfix implements:

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| Secure password reset | SOC2 CC6.1 | Token hashing, 15-min expiry |
| Password management | ISO A.9.4.3 | Bcrypt, complexity rules |
| Session timeout | SOC2 CC6.6 | 15-min inactivity, warning modal |
| Audit trail | SOC2 CC7.2 | All resets logged |
| No user enumeration | OWASP | Same response for all emails |

---

## 9. Sign-Off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Senior Developer | _____ | _____ | ☐ |
| QA Engineer | _____ | _____ | ☐ |
| DevOps Engineer | _____ | _____ | ☐ |
| Product Owner | _____ | _____ | ☐ |

---

*Document generated: $(date)*
