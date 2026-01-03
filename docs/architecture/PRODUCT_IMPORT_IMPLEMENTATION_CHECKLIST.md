# Product Import Scalability: Implementation Checklist

**Version:** 1.0
**Created:** December 28, 2025
**Status:** Implementation Ready

---

## Phase 1: Infrastructure Foundation (Week 1-2)

### Redis Cluster Setup

- [ ] **Provision ElastiCache Redis Cluster**
  - [ ] Create Redis replication group (1 primary + 2 replicas)
  - [ ] Configure multi-AZ for high availability
  - [ ] Enable automatic failover
  - [ ] Set memory: `cache.r7g.large` (13.07 GiB)
  - [ ] Enable encryption at rest and in transit
  - [ ] Configure backup retention (5 days)
  - [ ] Set snapshot window (03:00-05:00 UTC)

- [ ] **Configure Redis Persistence**
  - [ ] Enable AOF (Append-Only File): `appendonly yes`
  - [ ] Set fsync policy: `appendfsync everysec`
  - [ ] Configure auto-rewrite: `auto-aof-rewrite-percentage 100`
  - [ ] Set RDB snapshots: `save 900 1`, `save 300 10`, `save 60 10000`

- [ ] **Network & Security**
  - [ ] Create VPC security group for Redis
  - [ ] Allow inbound on port 6379 from worker subnets only
  - [ ] Create subnet group for multi-AZ deployment
  - [ ] Configure VPC peering if needed
  - [ ] Test connectivity from ECS tasks

- [ ] **Monitoring & Alerts**
  - [ ] Enable CloudWatch metrics for ElastiCache
  - [ ] Create alarm: CPU > 75% for 5 minutes
  - [ ] Create alarm: Memory > 85% for 5 minutes
  - [ ] Create alarm: Evictions > 0
  - [ ] Create alarm: Replication lag > 5 seconds

### Database Optimization

- [ ] **Add Indexes for Job Queries**
  ```sql
  -- Existing indexes (verify):
  CREATE INDEX idx_job_company_status ON "ProductImportJob"("companyId", "status");
  CREATE INDEX idx_job_status_created ON "ProductImportJob"("status", "createdAt");

  -- New indexes for reconciliation:
  CREATE INDEX idx_job_pending_created ON "ProductImportJob"("status", "createdAt")
    WHERE "status" = 'PENDING';
  CREATE INDEX idx_job_in_progress_started ON "ProductImportJob"("status", "startedAt")
    WHERE "status" = 'IN_PROGRESS';
  ```

- [ ] **Verify Connection Pool Settings**
  - [ ] Check Prisma connection pool size (recommended: 10-20 per worker)
  - [ ] Set `connection_limit` in DATABASE_URL
  - [ ] Configure PgBouncer if needed for connection pooling
  - [ ] Test connection behavior under load

### ECS Service Configuration

- [ ] **Create Dedicated Worker Service**
  - [ ] Separate task definition for import workers
  - [ ] Set CPU: 2048 (2 vCPU), Memory: 4096 (4 GB)
  - [ ] Configure BULL_CONCURRENCY=5 env var
  - [ ] Disable HTTP server (ENABLE_API=false)
  - [ ] Set up VPC networking (private subnets)
  - [ ] Configure IAM role with S3, Secrets Manager permissions

- [ ] **Configure Auto-Scaling**
  - [ ] Create Application Auto Scaling target
  - [ ] Set min replicas: 2, max replicas: 50
  - [ ] Define scaling policy: Target 10 jobs per worker
  - [ ] Set scale-out cooldown: 60 seconds
  - [ ] Set scale-in cooldown: 300 seconds
  - [ ] Test scaling behavior with load

---

## Phase 2: Queue Resilience (Week 2-3)

### Job Reconciliation Service

- [ ] **Implement Orphan Job Detection**
  - [ ] Create `JobReconciliationService`
  - [ ] Add cron job: Every 5 minutes
  - [ ] Query PENDING jobs older than 1 minute
  - [ ] Check if job exists in Redis queue
  - [ ] Re-queue missing jobs
  - [ ] Log reconciliation events

- [ ] **Implement Stalled Job Cleanup**
  - [ ] Add cron job: Every 10 minutes
  - [ ] Query IN_PROGRESS jobs older than 2 hours
  - [ ] Mark as FAILED with timeout error
  - [ ] Send alert to ops team
  - [ ] Log stalled job details

- [ ] **Add Unit Tests**
  - [ ] Test orphan detection logic
  - [ ] Test stalled job detection
  - [ ] Test re-queueing behavior
  - [ ] Mock Redis queue operations
  - [ ] Verify error handling

### Graceful Shutdown

- [ ] **Implement SIGTERM Handler**
  - [ ] Pause queue on SIGTERM signal
  - [ ] Wait for active jobs to complete (max 30s)
  - [ ] Close database connections
  - [ ] Close Redis connections
  - [ ] Log shutdown events
  - [ ] Exit with code 0

- [ ] **Configure ECS Stop Timeout**
  - [ ] Set `stopTimeout` to 60 seconds in task definition
  - [ ] Test graceful shutdown behavior
  - [ ] Verify jobs resume after restart
  - [ ] Monitor shutdown duration

### Idempotency Enforcement

- [ ] **Update Product Creation Logic**
  - [ ] Replace `create()` with `upsert()` for products
  - [ ] Add unique constraint on `companyId + externalId + importSource`
  - [ ] Check S3 key before uploading images
  - [ ] Skip thumbnail generation if already exists
  - [ ] Make all phases idempotent

- [ ] **Add Idempotency Tests**
  - [ ] Test double-processing of same job
  - [ ] Verify no duplicate products created
  - [ ] Verify no duplicate images uploaded
  - [ ] Test partial completion scenarios

---

## Phase 3: Rate Limiting (Week 3-4)

### Provider Rate Limiters

- [ ] **Implement Token Bucket Rate Limiter**
  - [ ] Create `RateLimiterService`
  - [ ] Use Redis sorted sets for token storage
  - [ ] Configure limits per provider (Roastify: 100/min, Shopify: 120/min)
  - [ ] Implement per-company rate limiting
  - [ ] Add `acquireToken()` method with retry logic
  - [ ] Add `retryAfter` calculation

- [ ] **Integrate with Providers**
  - [ ] Wrap Roastify API calls with rate limiter
  - [ ] Add rate limiter to Shopify service (future)
  - [ ] Log rate limit events
  - [ ] Monitor rate limit violations
  - [ ] Add tests for rate limiting

### Queue-Level Rate Limiting

- [ ] **Configure Bull Limiter**
  - [ ] Add `limiter` config to queue registration
  - [ ] Set `max: 100`, `duration: 60000` (100 jobs/min)
  - [ ] Set `bounceBack: false` (drop excess)
  - [ ] Test queue rate limiting
  - [ ] Monitor dropped jobs

### Circuit Breakers

- [ ] **Implement Circuit Breaker Pattern**
  - [ ] Create `CircuitBreakerService`
  - [ ] Track failure counts per provider
  - [ ] Open circuit after 5 consecutive failures
  - [ ] Half-open after 60 seconds
  - [ ] Close on successful request
  - [ ] Log circuit state changes

- [ ] **Integrate with Job Processor**
  - [ ] Wrap provider API calls in circuit breaker
  - [ ] Fail fast when circuit is open
  - [ ] Add retry logic for half-open state
  - [ ] Alert on circuit opens
  - [ ] Add tests for all states

---

## Phase 4: Monitoring & Observability (Week 4-5)

### CloudWatch Metrics

- [ ] **Implement Queue Metrics Service**
  - [ ] Create `QueueMetricsService`
  - [ ] Publish metrics every 60 seconds
  - [ ] Track: waiting, active, completed, failed, delayed
  - [ ] Use CloudWatch `putMetricData` API
  - [ ] Add custom dimensions (queue name, environment)

- [ ] **Track Job Performance Metrics**
  - [ ] Publish job duration (p50, p95, p99)
  - [ ] Track success rate percentage
  - [ ] Track retry rate percentage
  - [ ] Monitor stalled job count
  - [ ] Track images processed per job

- [ ] **Track Worker Metrics**
  - [ ] Monitor active worker count
  - [ ] Track CPU and memory usage
  - [ ] Calculate job throughput per worker
  - [ ] Monitor worker restarts

### CloudWatch Dashboards

- [ ] **Create Queue Health Dashboard**
  - [ ] Widget: Queue depth over time (line chart)
  - [ ] Widget: Active vs waiting jobs (stacked area)
  - [ ] Widget: Success rate percentage (gauge)
  - [ ] Widget: Job duration percentiles (line chart)
  - [ ] Widget: Worker count (line chart)

- [ ] **Create Provider API Dashboard**
  - [ ] Widget: API request count per provider
  - [ ] Widget: API error rate per provider
  - [ ] Widget: API latency (p95)
  - [ ] Widget: Rate limit violations
  - [ ] Widget: Circuit breaker states

### Alerts & Notifications

- [ ] **Configure CloudWatch Alarms**
  - [ ] Alarm: Queue depth > 10,000 for 5 minutes (critical)
  - [ ] Alarm: Success rate < 90% for 10 minutes (high)
  - [ ] Alarm: Worker count < 2 for 3 minutes (high)
  - [ ] Alarm: Provider error rate > 10% for 5 minutes (medium)
  - [ ] Alarm: Job duration p95 > 15 minutes (medium)

- [ ] **Integrate with PagerDuty/Slack**
  - [ ] Create PagerDuty integration
  - [ ] Configure on-call schedule
  - [ ] Set up Slack webhook for non-critical alerts
  - [ ] Test alert routing
  - [ ] Document escalation procedures

### Structured Logging

- [ ] **Standardize Log Format**
  - [ ] Use JSON format for all logs
  - [ ] Include: timestamp, jobId, companyId, event, duration
  - [ ] Add correlation IDs for tracing
  - [ ] Log all phase transitions
  - [ ] Log errors with stack traces

- [ ] **Configure Log Aggregation**
  - [ ] Send logs to CloudWatch Logs
  - [ ] Create log groups per service
  - [ ] Set retention: 30 days for workers, 90 days for errors
  - [ ] Create log insights queries for common issues
  - [ ] Test log search and filtering

---

## Phase 5: Backpressure & Load Management (Week 5-6)

### Queue Health Checks

- [ ] **Implement Queue Health Service**
  - [ ] Create `QueueHealthService`
  - [ ] Define health thresholds (healthy, degraded, critical, overload)
  - [ ] Add `checkQueueHealth()` method
  - [ ] Cache health status (update every 10s)
  - [ ] Expose health endpoint: `GET /health/queue`

### Backpressure Strategies

- [ ] **Reject New Jobs When Overloaded**
  - [ ] Check queue health before creating job
  - [ ] Reject with 503 if OVERLOAD status
  - [ ] Return friendly error message
  - [ ] Log rejection events
  - [ ] Add retry-after header

- [ ] **Implement Tier-Based Throttling**
  - [ ] Allow ENTERPRISE clients during CRITICAL status
  - [ ] Delay BASIC tier jobs by 5 minutes
  - [ ] Add priority queuing for VIP clients
  - [ ] Monitor tier-based behavior

- [ ] **Emergency Circuit Breaker**
  - [ ] Auto-pause queue when OVERLOAD detected
  - [ ] Send critical alert to ops team
  - [ ] Auto-resume after 5 minutes if health improves
  - [ ] Manual resume endpoint for ops
  - [ ] Log pause/resume events

### Load Testing

- [ ] **Create Load Test Scripts**
  - [ ] Simulate 1,000 concurrent import jobs
  - [ ] Test with varying job sizes (10, 100, 1000 products)
  - [ ] Test image import at scale (10,000+ images)
  - [ ] Measure queue depth behavior
  - [ ] Measure worker scaling response time

- [ ] **Run Load Tests**
  - [ ] Test in staging environment
  - [ ] Monitor all metrics during test
  - [ ] Verify auto-scaling triggers correctly
  - [ ] Check for memory leaks or resource issues
  - [ ] Document results and bottlenecks

---

## Phase 6: Disaster Recovery & Runbooks (Week 6)

### Failure Scenario Testing

- [ ] **Test Redis Failover**
  - [ ] Manually fail primary Redis node
  - [ ] Verify automatic promotion of replica
  - [ ] Measure failover time (<60s target)
  - [ ] Verify jobs resume processing
  - [ ] Document observed behavior

- [ ] **Test Worker Pod Crashes**
  - [ ] Kill random worker pods during job processing
  - [ ] Verify jobs marked as stalled
  - [ ] Verify Bull retries stalled jobs
  - [ ] Check for orphaned jobs
  - [ ] Measure recovery time

- [ ] **Test Database Connection Loss**
  - [ ] Simulate network partition to RDS
  - [ ] Verify connection retry logic
  - [ ] Check job state consistency
  - [ ] Test reconnection behavior
  - [ ] Document maximum downtime tolerated

### Runbooks

- [ ] **Create "Queue Overload" Runbook**
  - [ ] Symptoms: Queue depth >10,000, slow job processing
  - [ ] Investigation: Check worker count, CPU, memory, errors
  - [ ] Resolution: Manually scale workers, pause non-critical jobs
  - [ ] Prevention: Adjust auto-scaling thresholds
  - [ ] Escalation: Notify engineering lead if unresolved in 30 min

- [ ] **Create "High Failure Rate" Runbook**
  - [ ] Symptoms: Success rate <90%, many failed jobs
  - [ ] Investigation: Check provider API status, circuit breakers, logs
  - [ ] Resolution: Open circuit breaker, retry failed jobs
  - [ ] Prevention: Improve error handling, add retries
  - [ ] Escalation: Notify provider support if API issue

- [ ] **Create "Stalled Jobs" Runbook**
  - [ ] Symptoms: Jobs stuck in IN_PROGRESS for >2 hours
  - [ ] Investigation: Check worker logs, database locks, Redis connection
  - [ ] Resolution: Restart stalled workers, mark jobs as failed
  - [ ] Prevention: Add timeout guards, improve graceful shutdown
  - [ ] Escalation: Review code for deadlock scenarios

### Backup & Recovery Plans

- [ ] **Document Recovery Procedures**
  - [ ] How to restore Redis from snapshot
  - [ ] How to manually re-queue failed jobs
  - [ ] How to rollback worker deployment
  - [ ] How to drain queue for maintenance
  - [ ] Emergency contacts and escalation path

- [ ] **Create Recovery Scripts**
  - [ ] Script: Bulk retry failed jobs
  - [ ] Script: Drain queue gracefully
  - [ ] Script: Re-queue orphaned jobs manually
  - [ ] Script: Reset circuit breakers
  - [ ] Test all scripts in staging

---

## Phase 7: Production Deployment (Week 7)

### Pre-Deployment

- [ ] **Code Review**
  - [ ] Senior architect reviews infrastructure code
  - [ ] DevOps reviews Terraform/ECS configs
  - [ ] Security reviews IAM policies and secrets
  - [ ] QA reviews test coverage (target: 70%+)

- [ ] **Staging Deployment**
  - [ ] Deploy all changes to staging
  - [ ] Run full load test suite
  - [ ] Test all failure scenarios
  - [ ] Verify monitoring and alerts
  - [ ] Get sign-off from engineering lead

### Deployment Execution

- [ ] **Deploy Infrastructure (Low-Risk)**
  - [ ] Deploy ElastiCache Redis cluster
  - [ ] Deploy ECS task definition (workers)
  - [ ] Configure auto-scaling policies
  - [ ] Deploy CloudWatch dashboards
  - [ ] Configure alarms and notifications

- [ ] **Deploy Application Code (Blue/Green)**
  - [ ] Deploy new worker version (2 pods initially)
  - [ ] Monitor metrics for 10 minutes
  - [ ] Scale to 25% of target (gradual ramp)
  - [ ] Monitor for 10 minutes
  - [ ] Scale to 100% if healthy
  - [ ] Drain old version gracefully

### Post-Deployment

- [ ] **Smoke Tests**
  - [ ] Create test import job via UI
  - [ ] Verify job completes successfully
  - [ ] Check SSE updates work
  - [ ] Verify images uploaded to S3
  - [ ] Check metrics appear in dashboard

- [ ] **Monitor for 48 Hours**
  - [ ] Check queue depth trends
  - [ ] Monitor success rate
  - [ ] Watch for unexpected errors
  - [ ] Verify auto-scaling behavior
  - [ ] Review logs for warnings

- [ ] **Retrospective**
  - [ ] Document issues encountered
  - [ ] Update runbooks with learnings
  - [ ] Share results with team
  - [ ] Schedule follow-up review in 1 month

---

## Ongoing Maintenance

### Weekly

- [ ] Review queue health trends
- [ ] Check for stalled jobs
- [ ] Review failed job error logs
- [ ] Monitor cost trends
- [ ] Update dashboards as needed

### Monthly

- [ ] Review auto-scaling performance
- [ ] Analyze job duration trends
- [ ] Review rate limiting effectiveness
- [ ] Check Redis memory usage
- [ ] Optimize slow queries if needed

### Quarterly

- [ ] Load test with current traffic patterns
- [ ] Review and update runbooks
- [ ] Conduct disaster recovery drill
- [ ] Review costs and optimize
- [ ] Update architecture documentation

---

## Success Criteria

### Performance

- [ ] 95% of jobs complete in <5 minutes (for <100 products)
- [ ] 99% success rate for imports
- [ ] Auto-scaling responds in <2 minutes
- [ ] Zero data loss during crashes
- [ ] Recovery from Redis failover in <60 seconds

### Reliability

- [ ] No orphaned jobs after 10 minutes
- [ ] All stalled jobs detected within 30 minutes
- [ ] Graceful shutdown completes in <30 seconds
- [ ] Circuit breakers prevent provider API overload
- [ ] All failures are retryable

### Observability

- [ ] All critical metrics visible in dashboard
- [ ] Alerts fire correctly for failure scenarios
- [ ] Logs are searchable and actionable
- [ ] Runbooks cover 90% of common issues
- [ ] On-call team can diagnose issues in <5 minutes

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Senior Architect | | | |
| Senior DevOps Engineer | | | |
| Engineering Lead | | | |
| QA Lead | | | |

---

*Checklist Version: 1.0*
*Last Updated: December 28, 2025*
