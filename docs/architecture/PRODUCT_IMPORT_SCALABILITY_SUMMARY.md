# Product Import Scalability & Reliability Architecture - Executive Summary

**Date:** December 28, 2025
**Status:** Design Complete, Ready for Implementation
**Estimated Implementation:** 6-7 weeks

---

## Overview

This document provides a production-grade architecture for scaling the Product Import system from handling dozens of concurrent imports to thousands, while guaranteeing zero data loss and complete job execution.

---

## The Problem

**Current State:**
- Basic Bull queue with Redis (single instance)
- Concurrency limited to 2 jobs per API instance
- No crash recovery mechanism
- No rate limiting for provider APIs
- No observability into queue health

**Scale Requirements:**
- Handle 1000+ concurrent imports across all clients
- Process 1-10,000 products per import
- Support 0-20 images per product
- Guarantee job completion even after crashes
- Respect provider API rate limits
- Scale horizontally with demand

---

## The Solution

### 1. Queue Architecture

**Redis Cluster (ElastiCache):**
- 1 primary + 2 replicas for high availability
- Automatic failover (<60s recovery time)
- AOF + RDB persistence for durability
- 13 GiB memory (handles 800,000+ queued jobs)

**Queue Configuration:**
- Exponential backoff retry (5s, 25s, 125s)
- 3 retry attempts per job
- 5-minute lock renewal to prevent stalls
- Automatic stale job detection every 30s

**Key Insight:** Redis is volatile, PostgreSQL is authoritative. Jobs are written to DB first, then queued. Orphan detection reconciles discrepancies every 5 minutes.

### 2. Worker Scaling

**Dedicated Worker Pods:**
- Separate from API pods for isolation
- 2 vCPU, 4 GB memory per worker
- 5 concurrent jobs per worker
- Fargate auto-scaling from 2 to 50 pods

**Auto-Scaling Triggers:**
1. **Primary:** Bull queue depth (target: 10 jobs/worker)
2. **Backup:** CPU utilization (target: 70%)

**Scaling Math:**
```
Queue Depth: 500 jobs
Target: 10 jobs/worker
Workers Needed: 500 / 10 = 50 workers

Scale-out time: <2 minutes
Scale-in cooldown: 5 minutes
```

### 3. Job Persistence & Recovery

**Two-Phase Commit:**
1. Write job to PostgreSQL (durable)
2. Queue to Redis (volatile)
3. Reconciliation service detects orphans every 5 minutes

**Crash Recovery:**
- Worker crashes: Bull retries stalled jobs after 5 minutes
- Redis crashes: ElastiCache auto-failover + orphan detection
- Database timeouts: Exponential backoff retry
- Network partitions: Reconnect with TCP keepalive

**Idempotency Enforcement:**
- Products created with `upsert` (not `create`)
- Image uploads check S3 key before uploading
- All phases can be safely re-executed

**Graceful Shutdown:**
- SIGTERM handler pauses queue
- Wait up to 30s for active jobs to complete
- Close connections gracefully
- 60s ECS stop timeout

### 4. Rate Limiting

**Provider API Limits:**
- Roastify: 100 requests/minute
- Shopify: 120 requests/minute
- Per-company token bucket rate limiter

**Implementation:**
- Redis sorted sets for token storage
- Automatic retry with `retryAfter` calculation
- Circuit breaker opens after 5 consecutive failures
- Half-open state probes after 60 seconds

**Queue-Level Limits:**
- Bull limiter: 100 jobs/minute
- Drop excess jobs (or delay based on client tier)

### 5. Backpressure Management

**Queue Health Monitoring:**
- **Healthy:** 0-1,000 jobs
- **Degraded:** 1,000-5,000 jobs
- **Critical:** 5,000-10,000 jobs
- **Overload:** >10,000 jobs

**Backpressure Strategies:**
1. **Overload:** Reject new jobs with 503
2. **Critical:** Only allow ENTERPRISE clients
3. **Degraded:** Delay BASIC tier jobs by 5 minutes
4. **Emergency:** Auto-pause queue, alert ops team

### 6. Monitoring & Observability

**CloudWatch Metrics:**
- Queue depth (waiting, active, delayed)
- Job duration (p50, p95, p99)
- Success rate percentage
- Worker count and resource usage
- Provider API error rates

**Alarms:**
- Queue depth >10,000 → PagerDuty (critical)
- Success rate <90% → Slack (high)
- Worker count <2 → Auto-scale (high)
- Provider errors >10% → Slack (medium)

**Dashboards:**
- Queue health overview
- Job performance metrics
- Provider API status
- Worker scaling behavior

**Structured Logging:**
```json
{
  "event": "job.completed",
  "jobId": "clx123",
  "duration": 180000,
  "productsImported": 45,
  "imagesProcessed": 135,
  "errors": 0
}
```

### 7. Failure Modes & Recovery

| Failure | MTTR | Recovery Strategy |
|---------|------|-------------------|
| Redis crash | <60s | ElastiCache auto-failover + orphan detection |
| Worker crash | <60s | Kubernetes auto-restart + Bull retry stalled jobs |
| DB timeout | <5s | Exponential backoff retry |
| Provider API down | 5-30min | Circuit breaker + manual retry endpoint |
| Network partition | <5min | TCP keepalive + reconnect |
| OOM in worker | <60s | Pod restart + increase memory limits |

---

## Architecture Diagram

```
                       ┌─────────────────────────────────────┐
                       │     Product Import Request          │
                       │     (Frontend → API)                │
                       └──────────────┬──────────────────────┘
                                      │
                  ┌───────────────────▼────────────────────┐
                  │  1. Write to PostgreSQL                │
                  │     (ProductImportJob)                 │
                  │     Status: PENDING                    │
                  └───────────────────┬────────────────────┘
                                      │
                  ┌───────────────────▼────────────────────┐
                  │  2. Queue to Redis (Bull)              │
                  │     jobId: db-job-id                   │
                  └───────────────────┬────────────────────┘
                                      │
        ┌─────────────────────────────┴─────────────────────────────┐
        │                  ElastiCache Redis Cluster                 │
        │  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
        │  │ Primary  │  │ Replica  │  │ Replica  │                │
        │  │ (Write)  │─▶│ (Read)   │  │ (Read)   │                │
        │  └──────────┘  └──────────┘  └──────────┘                │
        │  Multi-AZ, Auto-Failover, AOF Persistence                 │
        └────────────────────────┬──────────────────────────────────┘
                                 │
        ┌────────────────────────▼──────────────────────────┐
        │            ECS Fargate Workers                     │
        │  ┌────────┐  ┌────────┐       ┌────────┐         │
        │  │Worker 1│  │Worker 2│  ...  │Worker N│         │
        │  │(5 jobs)│  │(5 jobs)│       │(5 jobs)│         │
        │  └────┬───┘  └────┬───┘       └────┬───┘         │
        │       │           │                 │             │
        │  Auto-Scaling: 2-50 workers (queue depth)        │
        └───────┼───────────┼─────────────────┼─────────────┘
                │           │                 │
        ┌───────▼───────────▼─────────────────▼──────────┐
        │              Job Processor                      │
        │  1. Fetch products from provider (rate limited) │
        │  2. Apply field mappings                        │
        │  3. Create products (upsert)                    │
        │  4. Download images (idempotent)                │
        │  5. Upload to S3 (check if exists)              │
        │  6. Generate thumbnails                         │
        │  7. Update job status → COMPLETED               │
        └─────────────────────────────────────────────────┘
                                 │
        ┌────────────────────────▼──────────────────────────┐
        │              PostgreSQL (RDS)                      │
        │  ProductImportJob (status: COMPLETED)             │
        │  Product (upserted with externalId)               │
        │  ProductImage (linked to S3 keys)                 │
        └────────────────────────────────────────────────────┘
                                 │
        ┌────────────────────────▼──────────────────────────┐
        │           Monitoring & Alerting                    │
        │  CloudWatch: Metrics, Logs, Dashboards            │
        │  PagerDuty: Critical alarms                       │
        │  Slack: Non-critical notifications                │
        └────────────────────────────────────────────────────┘
```

---

## Infrastructure Costs

**Monthly Costs (Production):**

| Component | Configuration | Monthly Cost |
|-----------|---------------|--------------|
| ElastiCache Redis | 3x cache.r7g.large | $450 |
| ECS Fargate Workers (avg) | 10 workers @ 2vCPU/4GB | $721 |
| ECS Fargate Workers (peak) | 50 workers @ 10% time | $360 |
| CloudWatch Metrics/Logs | 50 metrics, 100GB logs | $65 |
| **Total** | | **~$1,600/month** |

**Cost per Job:**
- 50,000 jobs/month: $0.032/job
- 100,000 jobs/month: $0.021/job
- 500,000 jobs/month: $0.009/job
- 1,000,000 jobs/month: $0.007/job

**Key Insight:** Cost per job decreases with volume due to better resource utilization.

---

## Implementation Plan

### Phase 1: Infrastructure (Week 1-2)
- Deploy ElastiCache Redis cluster
- Configure ECS worker service
- Set up auto-scaling policies
- Create CloudWatch dashboards/alarms

### Phase 2: Queue Resilience (Week 2-3)
- Implement orphan job detection
- Add graceful shutdown handler
- Enforce idempotency in all operations
- Add unit tests

### Phase 3: Rate Limiting (Week 3-4)
- Implement token bucket rate limiter
- Add circuit breakers for providers
- Integrate with job processor
- Test under load

### Phase 4: Monitoring (Week 4-5)
- Implement queue metrics service
- Create CloudWatch dashboards
- Configure PagerDuty/Slack alerts
- Standardize structured logging

### Phase 5: Backpressure (Week 5-6)
- Implement queue health checks
- Add tier-based throttling
- Run load tests (1000+ jobs)
- Document bottlenecks

### Phase 6: Disaster Recovery (Week 6)
- Test all failure scenarios
- Create runbooks for ops team
- Document recovery procedures
- Production deployment

### Phase 7: Production (Week 7)
- Blue/green deployment
- Monitor for 48 hours
- Retrospective and optimization

---

## Success Criteria

### Performance
- ✅ 95% of jobs complete in <5 minutes (for <100 products)
- ✅ 99% success rate for imports
- ✅ Auto-scaling responds in <2 minutes
- ✅ Zero data loss during crashes
- ✅ Recovery from Redis failover in <60 seconds

### Reliability
- ✅ No orphaned jobs after 10 minutes
- ✅ All stalled jobs detected within 30 minutes
- ✅ Graceful shutdown completes in <30 seconds
- ✅ Circuit breakers prevent provider API overload
- ✅ All failures are retryable

### Observability
- ✅ All critical metrics visible in dashboard
- ✅ Alerts fire correctly for failure scenarios
- ✅ Logs are searchable and actionable
- ✅ Runbooks cover 90% of common issues
- ✅ On-call team can diagnose issues in <5 minutes

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Redis cluster failure | Low | High | Multi-AZ, auto-failover, daily snapshots |
| Worker pod OOM | Medium | Low | Memory limits, auto-restart, alerts |
| Provider API outage | Medium | Medium | Circuit breaker, retry queue, manual retry endpoint |
| Database connection pool exhaustion | Low | Medium | Connection pooling, PgBouncer, timeout guards |
| S3 throttling | Low | Low | Exponential backoff, batch uploads, CloudFront |
| Cost overrun | Low | Medium | Auto-scaling limits, cost alerts, budget caps |

---

## Next Steps

1. **Review & Approval**
   - Senior Architect review (this document)
   - DevOps review (Terraform code)
   - Engineering Lead sign-off

2. **Staging Deployment**
   - Deploy infrastructure to staging
   - Run load tests (1000+ concurrent jobs)
   - Test all failure scenarios
   - Verify monitoring and alerts

3. **Production Deployment**
   - Blue/green deployment
   - Monitor for 48 hours
   - Gradual rollout to all clients

4. **Documentation**
   - Update runbooks with production learnings
   - Train support team on dashboards
   - Schedule quarterly disaster recovery drills

---

## Documents Delivered

1. **[Scalability Architecture](./PRODUCT_IMPORT_SCALABILITY_ARCHITECTURE.md)** (47 pages)
   - Complete technical specification
   - Queue architecture and worker scaling
   - Job persistence and recovery mechanisms
   - Rate limiting and backpressure strategies
   - Monitoring, alerting, and failure modes
   - Production deployment procedures

2. **[Implementation Checklist](./PRODUCT_IMPORT_IMPLEMENTATION_CHECKLIST.md)** (7-phase plan)
   - Week-by-week task breakdown
   - Pre-deployment verification steps
   - Testing and validation procedures
   - Production deployment workflow
   - Ongoing maintenance schedule

3. **[Terraform Module](../../terraform/modules/product-import/)** (Infrastructure as Code)
   - ElastiCache Redis cluster
   - ECS Fargate worker service
   - Application auto-scaling
   - CloudWatch alarms and dashboards
   - IAM roles and security groups
   - Complete with README and examples

---

## Questions & Support

For questions or clarifications, contact:
- **Senior Architect:** [architecture-team@avnz.io]
- **DevOps Lead:** [devops-team@avnz.io]
- **Engineering Lead:** [engineering-leads@avnz.io]

---

**Prepared by:** Senior Architect, Senior DevOps Engineer
**Reviewed by:** [Pending]
**Approved by:** [Pending]
**Version:** 1.0
**Last Updated:** December 28, 2025
