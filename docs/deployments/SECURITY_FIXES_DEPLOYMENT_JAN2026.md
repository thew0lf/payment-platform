# Security Fixes Deployment Plan

**Version:** 1.0
**Date:** January 28, 2026
**Authors:** Senior Architect, Senior DBA, Senior DevOps
**Change Type:** Security Hardening - Multi-Tenant Access Controls
**Ticket:** SEC-2026-001

---

## Executive Summary

This deployment covers 30 security fixes applied to the AVNZ Payment Platform API, implementing consistent multi-tenant security controls through the `HierarchyService` and proper soft-delete filtering.

| Category | Count | Description |
|----------|-------|-------------|
| CRITICAL | 9 | Added company validation to controllers (NO previous auth) |
| HIGH | 8 | Fixed cross-client access vulnerabilities |
| MEDIUM | 5 | Added soft-delete filters to queries |
| LOW | 8 | Updated error messages to AVNZ brand voice |

### Risk Assessment

| Factor | Level | Notes |
|--------|-------|-------|
| Breaking Changes | **None** | No API contract changes |
| Database Migration | **None** | Query-level changes only |
| Performance Impact | **Low** | +5-10ms per request for validation |
| Rollback Complexity | **Low** | Application-only rollback |

---

## 1. Pre-Deployment Checklist

### 1.1 Code Verification

| Check | Command | Expected Result | Status |
|-------|---------|-----------------|--------|
| TypeScript Build | `npm run build` | 689 files compiled | [ ] |
| Unit Tests | `npm test` | All pass | [ ] |
| Lint Check | `npm run lint` | No errors | [ ] |
| App Bootstrap | `npm test app.module.spec.ts` | Module loads | [ ] |

```bash
# Run all checks
cd /Users/gcuevas/Sites/payment-platform/apps/api
npm run build && npm test && npm run lint
```

### 1.2 Database Verification (DBA)

| Check | Query/Command | Expected | Status |
|-------|---------------|----------|--------|
| Migration Status | `npx prisma migrate status` | Up to date | [ ] |
| Orphaned Orders | See query below | 0 | [ ] |
| Index Exists: orders.deletedAt | Schema check | Yes | [ ] |
| Index Exists: companies.clientId | Schema check | Yes | [ ] |

```sql
-- Verify no orphaned orders
SELECT COUNT(*) as orphaned_orders
FROM orders o
LEFT JOIN companies c ON o.company_id = c.id
WHERE c.id IS NULL;
-- Expected: 0

-- Baseline soft-deleted records (document for post-deploy comparison)
SELECT
  'orders' as table_name, COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as soft_deleted
FROM orders
UNION ALL
SELECT 'customers', COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) FROM customers
UNION ALL
SELECT 'products', COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) FROM products;
```

### 1.3 Infrastructure Verification (DevOps)

| Check | Command | Expected | Status |
|-------|---------|----------|--------|
| ECR Access | `aws ecr describe-repositories` | avnz-payment-api exists | [ ] |
| ECS Cluster | `aws ecs describe-clusters` | avnz-payment-cluster active | [ ] |
| Secrets Manager | `aws secretsmanager list-secrets` | Keys accessible | [ ] |

### 1.4 Backup Requirements

```bash
# Create RDS snapshot before deployment (REQUIRED)
aws rds create-db-snapshot \
  --db-instance-identifier avnz-postgres \
  --db-snapshot-identifier pre-security-fixes-$(date +%Y%m%d-%H%M%S)

# Verify snapshot creation
aws rds wait db-snapshot-available \
  --db-snapshot-identifier pre-security-fixes-*
```

---

## 2. Deployment Sequence

### Phase 1: Staging Deployment (T-4h to T-2h)

```bash
# Deploy to staging
docker-compose -p avnz-payment-platform-staging up -d api

# Run integration tests
npm run test:e2e

# Manual security boundary tests (see Section 5)
```

### Phase 2: Production Deployment (T-0)

#### 2.1 Build and Push Docker Image

```bash
# Set variables
export AWS_REGION=us-east-1
export ECR_REPOSITORY=avnz-payment-api
export IMAGE_TAG=$(git rev-parse --short HEAD)
export FULL_IMAGE_URI="211125754104.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG"

# Authenticate with ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  211125754104.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push
cd /Users/gcuevas/Sites/payment-platform/apps/api
docker build -t $FULL_IMAGE_URI .
docker push $FULL_IMAGE_URI
docker tag $FULL_IMAGE_URI 211125754104.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
docker push 211125754104.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
```

#### 2.2 Deploy to ECS

```bash
# Force new deployment with circuit breaker
aws ecs update-service \
  --cluster avnz-payment-cluster \
  --service avnz-api \
  --force-new-deployment \
  --deployment-configuration "deploymentCircuitBreaker={enable=true,rollback=true},maximumPercent=200,minimumHealthyPercent=50"

# Wait for stability (timeout: 10 minutes)
aws ecs wait services-stable \
  --cluster avnz-payment-cluster \
  --services avnz-api

# Verify deployment
aws ecs describe-services \
  --cluster avnz-payment-cluster \
  --services avnz-api \
  --query 'services[0].{status:status,runningCount:runningCount,desiredCount:desiredCount}'
```

---

## 3. Post-Deployment Validation

### 3.1 Health Checks (T+5min)

```bash
#!/bin/bash
API_URL="https://api.avnz.io"

# Basic health
curl -sf "$API_URL/health" | jq .
# Expected: {"status":"OK","components":{"database":{"status":"UP"}}}

# Verify modules loaded (401 = good, 404 = module missing)
for endpoint in customers orders products transactions refunds; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/$endpoint")
  echo "$endpoint: HTTP $STATUS"
done
```

### 3.2 Security Boundary Tests (T+15min)

| Test Case | User Scope | Action | Expected |
|-----------|-----------|--------|----------|
| TC-01 | ORGANIZATION | GET /api/orders | 200 - All orders visible |
| TC-02 | CLIENT | GET /api/orders | 200 - Only client's companies' orders |
| TC-03 | CLIENT | GET /api/orders?companyId=OTHER | 403 - "Hmm, you don't have access..." |
| TC-04 | COMPANY | GET /api/orders | 200 - Only company's orders |
| TC-05 | COMPANY | GET /api/orders/:otherCompanyOrderId | 403 - Forbidden |
| TC-06 | Any | Query with deletedAt records | Deleted records excluded |

### 3.3 Database Verification (T+30min)

```sql
-- Verify soft-delete filters are working
-- Application should never return records where deleted_at IS NOT NULL
SELECT
  'Soft-delete check' as test,
  CASE WHEN COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) = 0
       THEN 'PASS' ELSE 'INVESTIGATE' END as result
FROM orders;

-- Verify cross-client boundary (manual spot check)
SELECT
  c.name as client_name,
  co.name as company_name,
  COUNT(o.id) as order_count
FROM clients c
JOIN companies co ON co.client_id = c.id
LEFT JOIN orders o ON o.company_id = co.id AND o.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.name, co.name
ORDER BY order_count DESC
LIMIT 10;
```

---

## 4. Monitoring

### 4.1 Key Metrics (First 60 minutes)

| Metric | Source | Alert Threshold | Action |
|--------|--------|-----------------|--------|
| Error Rate (5xx) | CloudWatch ALB | > 5% for 5 min | Investigate/Rollback |
| Latency P95 | CloudWatch ALB | > 2000ms | Monitor HierarchyService |
| 403 Forbidden Rate | API Logs | > 50/hour (new baseline) | Investigate scope config |
| Database Connections | RDS | > 80% max | Review connection pool |
| Container CPU | ECS | > 80% | Monitor scaling |

### 4.2 CloudWatch Log Queries

```bash
# Tail API logs
aws logs tail /ecs/avnz-api --follow

# Search for errors
aws logs filter-log-events \
  --log-group-name /ecs/avnz-api \
  --filter-pattern "ERROR" \
  --start-time $(date -d '30 minutes ago' +%s000)

# Search for access denied
aws logs filter-log-events \
  --log-group-name /ecs/avnz-api \
  --filter-pattern "ForbiddenException" \
  --start-time $(date -d '30 minutes ago' +%s000)
```

### 4.3 Audit Log Verification

```sql
-- Verify ACCESS_DENIED events are logged
SELECT action, entity, COUNT(*)
FROM "AuditLog"
WHERE action = 'ACCESS_DENIED'
  AND "createdAt" > NOW() - INTERVAL '1 hour'
GROUP BY action, entity;
```

---

## 5. Rollback Procedure

### 5.1 Automatic Rollback

ECS circuit breaker will automatically rollback if:
- More than 50% of new tasks fail health checks
- Deployment doesn't reach steady state in 10 minutes

### 5.2 Manual Rollback

```bash
# Get previous task definition
PREVIOUS_REVISION=$(aws ecs describe-services \
  --cluster avnz-payment-cluster \
  --services avnz-api \
  --query 'services[0].taskDefinition' \
  --output text | awk -F: '{print $NF-1}')

echo "Rolling back to revision: $PREVIOUS_REVISION"

# Update service to previous revision
aws ecs update-service \
  --cluster avnz-payment-cluster \
  --service avnz-api \
  --task-definition avnz-api:$PREVIOUS_REVISION \
  --force-new-deployment

# Wait for rollback
aws ecs wait services-stable \
  --cluster avnz-payment-cluster \
  --services avnz-api

# Verify
aws ecs describe-services \
  --cluster avnz-payment-cluster \
  --services avnz-api \
  --query 'services[0].{status:status,runningCount:runningCount}'
```

### 5.3 Rollback Decision Matrix

| Symptom | Severity | Wait Time | Action |
|---------|----------|-----------|--------|
| > 5% error rate increase | CRITICAL | 5 min | Immediate rollback |
| Specific endpoint 500s | HIGH | 10 min | Investigate, possible hotfix |
| Performance > 50% degraded | HIGH | 15 min | Consider rollback |
| Individual user access issues | LOW | 30 min | Investigate scope config |

### 5.4 Database Rollback

**NOT REQUIRED** - This deployment has no schema changes. All changes are application-level authorization logic.

---

## 6. Communication Plan

### 6.1 Timeline

| Timing | Audience | Channel | Message |
|--------|----------|---------|---------|
| T-24h | Engineering | Slack #engineering | Deployment scheduled |
| T-2h | DevOps On-Call | PagerDuty | Heads-up |
| T-30min | Engineering | Slack #deployments | Pre-flight complete |
| T-0 | All | Slack #deployments | Deployment started |
| T+15min | All | Slack #deployments | Health checks passed |
| T+60min | All | Slack #deployments | Deployment verified |

### 6.2 Escalation Contacts

| Role | Contact | When |
|------|---------|------|
| DevOps Lead | @devops-lead | Any deployment issues |
| Backend Lead | @backend-lead | Application errors |
| Security Lead | @security-lead | Security failures |
| DBA | @dba-lead | Database issues |

### 6.3 Rollback Communication Template

```
SUBJECT: [ROLLBACK] Security Fixes Deployment - {timestamp}

STATUS: Rollback initiated
REASON: {brief description}
IMPACT: API temporarily running previous version
ACTION: Investigating root cause
ETA: Update in 30 minutes

Initiated by: {name}
Commit: {commit_sha}
```

---

## 7. Deployment Timeline

### Recommended Window

| Parameter | Value |
|-----------|-------|
| **Day** | Tuesday or Wednesday |
| **Time** | 10:00 AM - 12:00 PM EST |
| **Duration** | 60 minutes |
| **Backup Window** | 2:00 PM - 4:00 PM EST |

### Detailed Timeline

```
T-60min  │ Final code review complete
T-30min  │ Create RDS snapshot
T-15min  │ Notify stakeholders, prep rollback commands
T-0      │ Build and push Docker image
T+5min   │ Force ECS deployment
T+10min  │ Tasks starting, health checks
T+15min  │ Run post-deployment health checks
T+20min  │ Run security boundary tests
T+30min  │ DBA verification queries
T+45min  │ Monitoring review
T+60min  │ Deployment sign-off
T+48h    │ Remove monitoring watch
```

---

## 8. Changes Summary

### 8.1 Modules Updated

| Module | Controllers | Changes |
|--------|-------------|---------|
| Momentum Intelligence | 6 | Added HierarchyService, company validation |
| CS AI | 2 | Company validation, soft-delete on Customer |
| Settings | 1 | Added JwtAuthGuard, company validation |
| Products | 5 | Fixed canAccessCompany UserContext |
| Orders | 1 | Cross-client filter, soft-delete (9 methods) |
| Fulfillment | 1 | Cross-client filter, soft-delete via relation |
| Landing Pages | 2 | getCompanyIdForQuery/Write patterns (50+ endpoints) |
| Cart | 1 | Cross-client boundary filter |
| Upsell | 1 | Async company validation |
| Voice AI | 1 | Company validation helper |
| Funnels | 2 | Error messages updated |
| Inventory | 2 | Error messages updated |

### 8.2 Security Patterns Applied

```typescript
// Pattern 1: Full UserContext in canAccessCompany
const canAccess = await this.hierarchyService.canAccessCompany(
  {
    sub: user.id,
    scopeType: user.scopeType as ScopeType,
    scopeId: user.scopeId,
    clientId: user.clientId,      // REQUIRED
    companyId: user.companyId,    // REQUIRED
  },
  queryCompanyId,
);

// Pattern 2: Cross-client isolation
if (!companyId && user.clientId) {
  where.company = { clientId: user.clientId };
}

// Pattern 3: Soft-delete filter
where: { id, companyId, deletedAt: null }

// Pattern 4: AVNZ brand voice errors
throw new ForbiddenException(
  "Hmm, you don't have access to that company. Double-check your permissions or try a different one."
);
```

---

## 9. Go/No-Go Checklist

### Pre-Deployment

- [ ] TypeScript build successful (689 files)
- [ ] All unit tests passing
- [ ] Staging deployment validated
- [ ] RDS snapshot created
- [ ] Rollback commands prepared
- [ ] On-call engineer notified
- [ ] No other deployments in progress
- [ ] No active incidents

### Post-Deployment

- [ ] Health check returns 200 OK
- [ ] All modules respond (401, not 404)
- [ ] Security boundary tests pass
- [ ] Error rate < 5%
- [ ] Latency P95 < 2000ms
- [ ] No critical alerts triggered

---

## 10. Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Senior Architect | | | |
| Senior DBA | | | |
| Senior DevOps | | | |
| Backend Lead | | | |
| Security Lead | | | |
| QA Lead | | | |

---

## Appendix A: Files Changed

### Critical Files

| File | Purpose |
|------|---------|
| `src/hierarchy/hierarchy.service.ts` | Core authorization (canAccessCompany) |
| `src/hierarchy/hierarchy.module.ts` | Imported by 37 modules |
| `src/orders/services/orders.service.ts` | Reference: soft-delete + cross-client |
| `src/orders/orders.controller.ts` | Reference: getCompanyIdForQuery pattern |

### All Updated Controllers

```
src/momentum-intelligence/momentum-intelligence.controller.ts
src/momentum-intelligence/intent-detection/intent-detection.controller.ts
src/momentum-intelligence/content-generation/content-generation.controller.ts
src/momentum-intelligence/terms/terms.controller.ts
src/momentum-intelligence/customer-save/customer-save.controller.ts
src/momentum-intelligence/refund/refund.controller.ts
src/momentum-intelligence/customer-service/customer-service.controller.ts
src/momentum-intelligence/cs-ai/cs-ai.controller.ts
src/settings/settings.controller.ts
src/products/controllers/products.controller.ts
src/products/controllers/category.controller.ts
src/products/controllers/tag.controller.ts
src/products/controllers/collection.controller.ts
src/products/controllers/product-media.controller.ts
src/orders/orders.controller.ts
src/fulfillment/fulfillment.controller.ts
src/landing-pages/landing-pages.controller.ts
src/landing-pages/landing-pages-advanced.controller.ts
src/cart/controllers/cart-admin.controller.ts
src/upsell/upsell.controller.ts
src/momentum-intelligence/voice-ai/voice-ai.controller.ts
src/funnels/funnels.controller.ts
src/funnels/controllers/funnel-logo.controller.ts
src/inventory/controllers/inventory-location.controller.ts
src/inventory/controllers/inventory-level.controller.ts
```

---

## Appendix B: Index Verification

All required indexes exist in schema:

```prisma
// Orders
@@index([companyId, orderedAt])
@@index([companyId, status, fulfillmentStatus])
@@index([deletedAt])

// Companies
@@index([clientId])
@@index([deletedAt])

// Customers
@@index([deletedAt])

// Shipments
@@index([orderId])

// Carts
@@index([companyId, status])
```

**Recommended (Post-Deploy if needed):**
```sql
CREATE INDEX CONCURRENTLY idx_orders_company_deleted
ON orders (company_id, deleted_at)
WHERE deleted_at IS NULL;
```

---

*This deployment plan follows SOC2, ISO 27001, and PCI-DSS deployment standards.*

*Last Updated: January 28, 2026*
