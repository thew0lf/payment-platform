# Phase 1-4 Deployment Plan

> **Version:** 1.0
> **Created:** December 19, 2025
> **Owner:** DevOps Team
> **Status:** Ready for Execution

---

## Overview

This document outlines the deployment plan for Phases 1-4 of the AVNZ Payment Platform feature rollout. The deployment follows our standard CI/CD pipeline with additional verification steps for critical security changes.

---

## Pre-Deployment Checklist

### Code Readiness
- [x] TypeScript compilation passes
- [x] E2E tests created
- [x] Code review approved
- [x] QA review approved
- [x] Documentation complete

### Environment Requirements
- [x] Redis instance available (REDIS_URL)
- [x] PostgreSQL with connection pooling
- [x] Environment variables configured

---

## Deployment Phases

### Phase A: Infrastructure Preparation

**Duration:** 30 minutes
**Risk Level:** Low

1. **Verify Redis Availability**
   ```bash
   # Check Redis connectivity
   redis-cli -u $REDIS_URL ping
   # Expected: PONG
   ```

2. **Database Connection Pool Verification**
   ```bash
   # Verify connection string includes pool config
   echo $DATABASE_URL | grep -E "connection_limit|pool_timeout"
   ```

3. **Environment Variables Check**
   ```bash
   # Required for Phase 1-4
   - REDIS_URL (new)
   - DATABASE_URL (with pool params)
   - INTEGRATION_ENCRYPTION_KEY (existing)
   ```

### Phase B: Staging Deployment

**Duration:** 45 minutes
**Risk Level:** Low

1. **Deploy to Staging**
   ```bash
   # Trigger staging deployment
   gh workflow run deploy-api.yml -f environment=staging
   gh workflow run deploy-admin-dashboard.yml -f environment=staging
   ```

2. **Staging Verification Checklist**
   - [ ] Health endpoint returns component status
   - [ ] Redis connection shows "healthy"
   - [ ] Vendor Companies page loads
   - [ ] Vendor Products page loads
   - [ ] Momentum Churn page loads
   - [ ] Momentum Save Flows page loads
   - [ ] Momentum Triggers page loads
   - [ ] Navigation shows all new sections

3. **Run E2E Tests Against Staging**
   ```bash
   cd apps/admin-dashboard
   PLAYWRIGHT_BASE_URL=https://staging.app.avnz.io npx playwright test
   ```

### Phase C: Production Deployment

**Duration:** 30 minutes
**Risk Level:** Medium

1. **Pre-Deployment Notification**
   - Notify stakeholders via Slack #deployments
   - Schedule deployment window

2. **Deploy API First**
   ```bash
   gh workflow run deploy-api.yml -f environment=production
   ```

3. **Verify API Health**
   ```bash
   curl https://api.avnz.io/health | jq .
   # Verify components.redis.healthy: true
   # Verify components.database.healthy: true
   ```

4. **Deploy Admin Dashboard**
   ```bash
   gh workflow run deploy-admin-dashboard.yml -f environment=production
   ```

5. **Production Verification**
   ```bash
   # Health check
   curl https://api.avnz.io/health

   # Test new pages
   curl -I https://app.avnz.io/vendors/companies
   curl -I https://app.avnz.io/vendors/products
   curl -I https://app.avnz.io/momentum/churn
   curl -I https://app.avnz.io/momentum/save-flows
   curl -I https://app.avnz.io/momentum/triggers
   ```

---

## Rollback Plan

### If Redis Connection Fails
1. The system will automatically fallback to in-memory token blacklist
2. No manual intervention required
3. Monitor for warnings in logs

### If Database Connection Issues
1. Check connection pool settings in DATABASE_URL
2. Verify RDS instance health
3. Rollback if necessary:
   ```bash
   aws ecs update-service \
     --cluster avnz-payment-cluster \
     --service avnz-api \
     --task-definition avnz-api:PREVIOUS_VERSION
   ```

### Full Rollback
1. Identify last stable task definition:
   ```bash
   aws ecs list-task-definitions --family-prefix avnz-api --sort DESC --max-items 5
   ```

2. Rollback both services:
   ```bash
   aws ecs update-service --cluster avnz-payment-cluster --service avnz-api --task-definition avnz-api:LAST_STABLE
   aws ecs update-service --cluster avnz-payment-cluster --service avnz-admin-dashboard --task-definition avnz-admin-dashboard:LAST_STABLE
   ```

---

## Feature Flags (Optional)

If gradual rollout is desired:

```typescript
// Phase 4 features can be hidden behind flags
const FEATURE_FLAGS = {
  MOMENTUM_CHURN: process.env.ENABLE_MOMENTUM_CHURN === 'true',
  MOMENTUM_SAVE_FLOWS: process.env.ENABLE_MOMENTUM_SAVE_FLOWS === 'true',
  MOMENTUM_TRIGGERS: process.env.ENABLE_MOMENTUM_TRIGGERS === 'true',
};
```

---

## Monitoring

### CloudWatch Dashboards
After deployment, monitor:
- API response times
- Error rates
- Redis connection health
- Database connection pool usage

### Alerts to Watch
- `avnz-api-5xx-errors` - Any increase in 5xx errors
- `avnz-redis-connection` - Redis connectivity issues
- `avnz-db-pool-exhausted` - Connection pool exhaustion

### Log Queries
```bash
# Check for Redis connection issues
aws logs filter-log-events \
  --log-group-name /ecs/avnz-api \
  --filter-pattern "Redis" \
  --start-time $(date -d "1 hour ago" +%s000)

# Check for new feature errors
aws logs filter-log-events \
  --log-group-name /ecs/avnz-api \
  --filter-pattern "momentum" \
  --start-time $(date -d "1 hour ago" +%s000)
```

---

## Post-Deployment Verification

### Functional Tests
| Feature | Test | Expected Result |
|---------|------|-----------------|
| Health Endpoint | `GET /health` | Returns component status |
| Vendor Companies | Navigate to /vendors/companies | Page loads |
| Vendor Products | Navigate to /vendors/products | Page loads with stats |
| Churn Dashboard | Navigate to /momentum/churn | Shows risk data or mock |
| Save Flows | Navigate to /momentum/save-flows | Shows 7-stage config |
| Triggers | Navigate to /momentum/triggers | Shows trigger categories |

### Performance Tests
| Metric | Threshold | Action if Exceeded |
|--------|-----------|-------------------|
| API p99 latency | < 500ms | Investigate slow queries |
| Dashboard TTFB | < 1s | Check CDN/server |
| Redis latency | < 10ms | Check Redis instance |

---

## Communication Plan

### Pre-Deployment
- [ ] Notify #engineering channel
- [ ] Notify #product channel
- [ ] Update status page if needed

### Post-Deployment
- [ ] Confirm deployment in #deployments
- [ ] Update release notes
- [ ] Close related tickets

---

## Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| DevOps Lead | devops@avnz.io | On-call pager |
| Engineering | engineering@avnz.io | Slack #engineering |
| Product | product@avnz.io | Email |

---

## Appendix: Environment Variable Changes

### New Variables (Phase 1)
```bash
# Redis for token blacklist
REDIS_URL=redis://redis.internal:6379

# Database with connection pool
DATABASE_URL=postgresql://user:pass@db.internal:5432/avnz?connection_limit=10&pool_timeout=10
```

### Terraform Changes Required
If using Terraform, add:

```hcl
# Redis cluster (if not existing)
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "avnz-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
}

# Update ECS task definition environment
resource "aws_ecs_task_definition" "api" {
  # ... existing config

  container_definitions = jsonencode([{
    environment = [
      {
        name  = "REDIS_URL"
        value = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379"
      }
    ]
  }])
}
```

---

*Deployment plan created for Phase 1-4 release.*
*Last updated: December 19, 2025*
