# Security Fixes Deployment Checklist

**Date:** January 28, 2026
**Deployment:** SEC-2026-001 (30 Security Fixes)

---

## Quick Reference

| Item | Value |
|------|-------|
| **Changes** | 30 security fixes (query-level only) |
| **Database Migration** | None required |
| **Estimated Duration** | 60 minutes |
| **Rollback** | Application only (no DB rollback) |

---

## Pre-Deployment (T-60min to T-0)

### Code Verification
```bash
cd /Users/gcuevas/Sites/payment-platform/apps/api
```

- [ ] `npm run build` - 689 files compiled
- [ ] `npm test` - All tests pass
- [ ] `npm run lint` - No errors

### Database Backup
```bash
aws rds create-db-snapshot \
  --db-instance-identifier avnz-postgres \
  --db-snapshot-identifier pre-security-fixes-$(date +%Y%m%d-%H%M%S)
```
- [ ] RDS snapshot created
- [ ] Snapshot status: available

### Infrastructure
- [ ] ECR accessible
- [ ] ECS cluster healthy
- [ ] No active incidents
- [ ] On-call notified

---

## Deployment (T-0)

### Build & Push
```bash
export IMAGE_TAG=$(git rev-parse --short HEAD)

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  211125754104.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t 211125754104.dkr.ecr.us-east-1.amazonaws.com/avnz-payment-api:$IMAGE_TAG .
docker push 211125754104.dkr.ecr.us-east-1.amazonaws.com/avnz-payment-api:$IMAGE_TAG
```
- [ ] Docker image built
- [ ] Image pushed to ECR

### Deploy to ECS
```bash
aws ecs update-service \
  --cluster avnz-payment-cluster \
  --service avnz-api \
  --force-new-deployment

aws ecs wait services-stable \
  --cluster avnz-payment-cluster \
  --services avnz-api
```
- [ ] Deployment initiated
- [ ] Service stable

---

## Post-Deployment (T+15min)

### Health Checks
```bash
curl -sf https://api.avnz.io/health | jq .
```
- [ ] Health endpoint returns 200
- [ ] Database status: UP

### Module Verification
```bash
for ep in customers orders products transactions; do
  echo "$ep: $(curl -s -o /dev/null -w '%{http_code}' https://api.avnz.io/api/$ep)"
done
```
- [ ] All endpoints return 401 (not 404)

### Security Tests
| Test | User Scope | Expected | Pass |
|------|-----------|----------|------|
| ORG views all orders | ORGANIZATION | 200 | [ ] |
| CLIENT views own orders | CLIENT | 200 | [ ] |
| CLIENT views other client | CLIENT | 403 | [ ] |
| COMPANY views own orders | COMPANY | 200 | [ ] |
| Deleted records hidden | Any | Not visible | [ ] |

---

## Monitoring (T+15min to T+60min)

### Watch These Metrics
| Metric | Alert If |
|--------|----------|
| Error Rate | > 5% |
| Latency P95 | > 2000ms |
| 5xx Count | > 10/min |

### Log Commands
```bash
# Tail logs
aws logs tail /ecs/avnz-api --follow

# Search errors
aws logs filter-log-events \
  --log-group-name /ecs/avnz-api \
  --filter-pattern "ERROR" \
  --start-time $(date -d '30 minutes ago' +%s000)
```

---

## Rollback (If Needed)

### Quick Rollback
```bash
# Get previous revision
PREV=$(aws ecs describe-services \
  --cluster avnz-payment-cluster \
  --services avnz-api \
  --query 'services[0].taskDefinition' \
  --output text | awk -F: '{print $NF-1}')

# Rollback
aws ecs update-service \
  --cluster avnz-payment-cluster \
  --service avnz-api \
  --task-definition avnz-api:$PREV \
  --force-new-deployment

# Wait
aws ecs wait services-stable \
  --cluster avnz-payment-cluster \
  --services avnz-api
```

### Rollback Triggers
- [ ] Error rate > 5% for 5 minutes
- [ ] Multiple 500 errors on specific endpoint
- [ ] Database connectivity issues

---

## Sign-Off

| Check | Time | Initials |
|-------|------|----------|
| Pre-deployment complete | | |
| Deployment complete | | |
| Health checks pass | | |
| Security tests pass | | |
| Monitoring stable (30 min) | | |
| **DEPLOYMENT APPROVED** | | |

---

## Emergency Contacts

| Role | Slack |
|------|-------|
| DevOps Lead | @devops-lead |
| Backend Lead | @backend-lead |
| DBA | @dba-lead |
| Security | @security-lead |

---

*Full deployment plan: `docs/deployments/SECURITY_FIXES_DEPLOYMENT_JAN2026.md`*
