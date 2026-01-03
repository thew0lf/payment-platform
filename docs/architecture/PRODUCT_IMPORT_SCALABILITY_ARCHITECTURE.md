# Product Import System: Scalability & Reliability Architecture

**Document Version:** 1.0
**Date:** December 28, 2025
**Authors:** Senior Architect, Senior DevOps Engineer
**Status:** Design Review

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Design Principles](#design-principles)
3. [Queue Architecture](#queue-architecture)
4. [Worker Scaling](#worker-scaling)
5. [Job Persistence & Recovery](#job-persistence--recovery)
6. [Rate Limiting](#rate-limiting)
7. [Backpressure Management](#backpressure-management)
8. [Monitoring & Observability](#monitoring--observability)
9. [Failure Modes & Recovery](#failure-modes--recovery)
10. [Infrastructure Configuration](#infrastructure-configuration)
11. [Production Deployment](#production-deployment)
12. [Cost Analysis](#cost-analysis)

---

## Executive Summary

### Current State

- **Framework:** Bull Queue (v4.16.5) with Redis (v7-alpine)
- **Processing:** Single-threaded, concurrency=2 (2 concurrent jobs per API instance)
- **Deployment:** Docker containers on ECS Fargate (auto-scaling)
- **Persistence:** PostgreSQL for job state, Redis for queue state
- **Real-time:** SSE (Server-Sent Events) for progress updates

### Scale Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| Concurrent Imports | 1000+ | Across all clients |
| Products per Import | 1-10,000 | Typically 50-500 |
| Images per Product | 0-20 | Average 3-5 |
| Job Completion SLA | 95% < 5 min | For imports <100 products |
| Recovery Time | < 60 seconds | From container crash |
| Data Loss Tolerance | Zero | All jobs must complete or be retryable |

### Design Goals

1. **Zero Data Loss** - Every job runs to completion or is safely retryable
2. **Horizontal Scalability** - Scale from 1 to 100+ workers seamlessly
3. **Crash Resilience** - Survive pod restarts, network failures, Redis crashes
4. **Rate Limit Compliance** - Respect provider API limits per company
5. **Fair Scheduling** - Prevent one client from monopolizing resources
6. **Observable** - Clear visibility into queue health, job progress, failures

---

## Design Principles

### 1. At-Least-Once Processing

Jobs may be retried, so all operations must be **idempotent**:

```typescript
// ✅ GOOD - Idempotent create
const product = await prisma.product.upsert({
  where: {
    companyId_externalId_importSource: {
      companyId,
      externalId: external.id,
      importSource: 'ROASTIFY',
    },
  },
  create: { ...data },
  update: { ...data },
});

// ❌ BAD - Non-idempotent
await prisma.product.create({ ...data }); // Fails on retry
```

### 2. Two-Phase Commit Pattern

Job state transitions follow a two-phase pattern:

1. **Phase 1:** Write-ahead log to PostgreSQL (`ProductImportJob`)
2. **Phase 2:** Queue to Redis Bull queue
3. **Reconciliation:** Periodic scan for orphaned jobs (queued in DB but not in Redis)

### 3. Circuit Breaker for External APIs

Protect provider APIs with circuit breakers:

- **Closed:** Normal operation
- **Open:** Too many failures, reject requests immediately
- **Half-Open:** Probe with single request to test recovery

### 4. Graceful Degradation

System degrades gracefully under load:

- SSE updates → Polling fallback → Email notification
- Thumbnail generation → Async after import
- Validation → Warning logs, not blocking

---

## Queue Architecture

### Bull Queue Configuration

```typescript
// apps/api/src/product-import/product-import.module.ts

@Module({
  imports: [
    BullModule.registerQueue({
      name: PRODUCT_IMPORT_QUEUE,
      defaultJobOptions: {
        // Retry configuration
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 25s, 125s
        },

        // Job lifecycle
        removeOnComplete: 100,  // Keep last 100 for debugging
        removeOnFail: 50,       // Keep last 50 failed jobs

        // Timeout protection
        timeout: 3600000,       // 1 hour max per job

        // Job data TTL
        jobId: undefined,       // Auto-generated unique ID
      },

      // Processor configuration
      processors: [
        {
          name: 'process-import',
          concurrency: 2,       // 2 concurrent jobs per worker
          // Separate processor per job type for better isolation
        },
      ],

      // Queue settings
      settings: {
        lockDuration: 300000,   // 5 min lock renewal
        lockRenewTime: 150000,  // Renew every 2.5 min
        stalledInterval: 30000, // Check for stalled jobs every 30s
        maxStalledCount: 3,     // Retry stalled jobs 3 times
      },
    }),
  ],
})
export class ProductImportModule {}
```

### Queue Isolation Strategy

**Option 1: Single Shared Queue (Current)**
- ✅ Simple to manage
- ✅ Fair scheduling across clients
- ❌ No priority isolation
- ❌ One slow job blocks others

**Option 2: Per-Client Queues (Recommended for Scale)**
- ✅ Client isolation
- ✅ Per-client rate limiting
- ✅ Priority lanes (VIP clients)
- ❌ More complex routing

**Hybrid Approach (Recommended):**

```typescript
// Dynamic queue routing based on client tier
function getQueueName(clientId: string, plan: string): string {
  switch (plan) {
    case 'ENTERPRISE':
      return `product-import:priority:${clientId}`;
    case 'PREMIUM':
    case 'STANDARD':
      return 'product-import:standard';
    case 'BASIC':
      return 'product-import:basic';
    default:
      return 'product-import:default';
  }
}
```

Queue Priority:
1. `product-import:priority:*` - Enterprise clients (dedicated workers)
2. `product-import:standard` - Premium/Standard clients (shared)
3. `product-import:basic` - Basic tier (throttled)
4. `product-import:default` - Trial/free tier (lowest priority)

### Redis Configuration for Production

**Redis Cluster (AWS ElastiCache Recommended):**

```yaml
# AWS ElastiCache Configuration
CacheClusterType: redis
Engine: redis 7.0
NodeType: cache.r7g.large  # 13.07 GiB memory
NumCacheNodes: 3           # Primary + 2 replicas
AutomaticFailoverEnabled: true
MultiAZEnabled: true
SnapshotRetentionLimit: 5  # Daily snapshots

# Redis Settings
maxmemory-policy: allkeys-lru
timeout: 300
tcp-keepalive: 60
```

**Memory Calculation:**

```
Job Size Estimate:
- Job Data: ~10 KB (product data, config)
- Queue Overhead: ~2 KB per job
- Total per job: ~12 KB

Queue Capacity:
- 13 GB / 12 KB = ~1,083,333 jobs
- Realistic capacity (80% memory): ~866,000 jobs
- Target queue depth: <10,000 jobs (well below limit)
```

**Redis Persistence:**

```conf
# redis.conf for production
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
save 900 1      # Save after 900s if 1 key changed
save 300 10     # Save after 300s if 10 keys changed
save 60 10000   # Save after 60s if 10000 keys changed
```

---

## Worker Scaling

### Horizontal Pod Autoscaler (HPA)

**Metrics-Based Scaling:**

```yaml
# k8s/hpa-product-import-worker.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: product-import-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: product-import-worker
  minReplicas: 2
  maxReplicas: 50
  metrics:
    # Scale based on Bull queue depth
    - type: External
      external:
        metric:
          name: bull_queue_waiting_count
          selector:
            matchLabels:
              queue_name: product-import
        target:
          type: AverageValue
          averageValue: "10"  # 1 worker per 10 queued jobs

    # Scale based on CPU
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70

    # Scale based on memory
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
        - type: Pods
          value: 5
          periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

### Worker Types

**Dedicated Import Workers (Recommended):**

Separate worker pods from API pods for better isolation:

```yaml
# k8s/deployment-import-worker.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-import-worker
spec:
  replicas: 2  # Min replicas, HPA will scale up
  template:
    spec:
      containers:
        - name: worker
          image: avnz-api:latest
          command: ["node", "dist/workers/product-import-worker.js"]
          env:
            - name: WORKER_TYPE
              value: "product-import"
            - name: BULL_CONCURRENCY
              value: "5"  # 5 concurrent jobs per worker
            - name: ENABLE_API
              value: "false"  # Disable HTTP server
          resources:
            requests:
              cpu: 1000m
              memory: 2Gi
            limits:
              cpu: 2000m
              memory: 4Gi
```

**Worker Code:**

```typescript
// apps/api/src/workers/product-import-worker.ts
import { NestFactory } from '@nestjs/core';
import { ProductImportModule } from '../product-import/product-import.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ProductImportModule);

  // Worker starts processing immediately
  console.log('Product Import Worker started');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, draining queue...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
```

### Scaling Formula

```
Workers Needed = ceil(Queue Depth / (Concurrency × Target Latency))

Example:
- Queue Depth: 100 jobs
- Concurrency: 5 jobs/worker
- Target Latency: 5 minutes
- Avg Job Duration: 3 minutes

Workers = ceil(100 / (5 × (5/3))) = ceil(100 / 8.33) = 12 workers
```

### ECS Fargate Auto-Scaling

**AWS ECS Service Auto-Scaling:**

```typescript
// terraform/ecs-autoscaling.tf
resource "aws_appautoscaling_target" "import_worker" {
  max_capacity       = 50
  min_capacity       = 2
  resource_id        = "service/avnz-cluster/product-import-worker"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "import_worker_queue_depth" {
  name               = "queue-depth-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.import_worker.resource_id
  scalable_dimension = aws_appautoscaling_target.import_worker.scalable_dimension
  service_namespace  = aws_appautoscaling_target.import_worker.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 10.0  # Target 10 jobs per worker

    customized_metric_specification {
      metric_name = "BullQueueDepth"
      namespace   = "AVNZ/ProductImport"
      statistic   = "Average"

      dimensions {
        name  = "QueueName"
        value = "product-import"
      }
    }

    scale_in_cooldown  = 300  # 5 min cooldown before scaling in
    scale_out_cooldown = 60   # 1 min cooldown before scaling out
  }
}
```

---

## Job Persistence & Recovery

### Database-First Pattern

**Job Creation (Two-Phase):**

```typescript
async function createImportJob(dto: CreateImportJobDto, userId: string) {
  // PHASE 1: Write to PostgreSQL (durable)
  const job = await prisma.productImportJob.create({
    data: {
      companyId,
      integrationId: dto.integrationId,
      status: ImportJobStatus.PENDING,
      phase: ImportJobPhase.QUEUED,
      totalProducts: selectedProducts.length,
      config: config,
      createdBy: userId,
    },
  });

  // PHASE 2: Queue to Redis (volatile)
  try {
    await importQueue.add('process-import', {
      jobId: job.id,  // Use DB job ID
      ...jobData,
    }, {
      jobId: job.id,  // Bull jobId = DB job ID for correlation
    });
  } catch (error) {
    // If queueing fails, mark job as failed in DB
    await prisma.productImportJob.update({
      where: { id: job.id },
      data: {
        status: ImportJobStatus.FAILED,
        errorLog: [{ message: 'Failed to queue job', code: 'QUEUE_ERROR' }],
      },
    });
    throw error;
  }

  return job;
}
```

### Orphan Job Detection

**Reconciliation Service (runs every 5 minutes):**

```typescript
// apps/api/src/product-import/services/job-reconciliation.service.ts

@Injectable()
export class JobReconciliationService {
  private readonly logger = new Logger(JobReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(PRODUCT_IMPORT_QUEUE) private readonly queue: Queue,
  ) {}

  @Cron('*/5 * * * *')  // Every 5 minutes
  async reconcileJobs() {
    // Find jobs that are PENDING but not in Redis queue
    const orphanedJobs = await this.prisma.productImportJob.findMany({
      where: {
        status: ImportJobStatus.PENDING,
        createdAt: {
          lt: new Date(Date.now() - 60000), // Older than 1 minute
        },
      },
    });

    for (const job of orphanedJobs) {
      const bullJob = await this.queue.getJob(job.id);

      if (!bullJob) {
        // Job is in DB but not in Redis - re-queue it
        this.logger.warn(`Orphaned job detected: ${job.id}, re-queueing`);

        const config = job.config as ImportJobConfig;
        await this.queue.add('process-import', {
          jobId: job.id,
          companyId: job.companyId,
          clientId: job.clientId,
          integrationId: job.integrationId,
          provider: job.provider,
          config,
          createdBy: job.createdBy,
        }, {
          jobId: job.id,
        });
      }
    }
  }

  @Cron('*/10 * * * *')  // Every 10 minutes
  async cleanupStalledJobs() {
    // Find jobs stuck in IN_PROGRESS for >2 hours
    const stalledJobs = await this.prisma.productImportJob.findMany({
      where: {
        status: ImportJobStatus.IN_PROGRESS,
        startedAt: {
          lt: new Date(Date.now() - 7200000), // 2 hours ago
        },
      },
    });

    for (const job of stalledJobs) {
      this.logger.error(`Stalled job detected: ${job.id}, marking as failed`);

      await this.prisma.productImportJob.update({
        where: { id: job.id },
        data: {
          status: ImportJobStatus.FAILED,
          completedAt: new Date(),
          errorLog: [
            {
              message: 'Job stalled - exceeded 2 hour timeout',
              code: 'TIMEOUT',
              timestamp: new Date(),
            },
          ],
        },
      });
    }
  }
}
```

### Crash Recovery

**Graceful Shutdown (SIGTERM Handler):**

```typescript
// apps/api/src/main.ts

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Graceful shutdown on SIGTERM
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, starting graceful shutdown...');

    // 1. Stop accepting new jobs
    await app.get(BullQueue).pause();

    // 2. Wait for active jobs to complete (max 30s)
    const activeJobs = await app.get(BullQueue).getActive();
    if (activeJobs.length > 0) {
      logger.log(`Waiting for ${activeJobs.length} active jobs to complete...`);
      await Promise.race([
        Promise.all(activeJobs.map(job => job.finished())),
        new Promise(resolve => setTimeout(resolve, 30000)),
      ]);
    }

    // 3. Close connections
    await app.close();

    logger.log('Graceful shutdown complete');
    process.exit(0);
  });

  await app.listen(3000);
}
```

**Job State Machine (Idempotent Phases):**

```typescript
enum ImportJobPhase {
  QUEUED,               // Initial state (can be re-queued)
  FETCHING,             // Fetching from provider (idempotent GET)
  MAPPING,              // Applying field mappings (pure function)
  CREATING,             // Creating products (upsert, idempotent)
  DOWNLOADING_IMAGES,   // Downloading images (check S3 key first)
  UPLOADING_IMAGES,     // Uploading to S3 (check if exists)
  GENERATING_THUMBNAILS,// Generating thumbnails (check if exists)
  FINALIZING,           // Final cleanup
  DONE,                 // Complete
}

// Each phase checks if work is already done
async function downloadImage(imageUrl: string, s3Key: string) {
  // Check if already downloaded
  const exists = await s3.headObject(s3Key).catch(() => null);
  if (exists) {
    logger.debug(`Image already exists at ${s3Key}, skipping download`);
    return { s3Key, skipped: true };
  }

  // Download and upload
  const buffer = await downloadFromUrl(imageUrl);
  await s3.upload(s3Key, buffer);
  return { s3Key, skipped: false };
}
```

---

## Rate Limiting

### Provider API Rate Limits

**Known Limits:**

| Provider | Rate Limit | Burst | Window |
|----------|------------|-------|--------|
| Roastify | 100 req/min | 20 | 60s |
| Shopify | 2 req/sec | 40 | Bucket |
| WooCommerce | Variable | - | Per host |

### Rate Limiter Implementation

**Redis-Based Token Bucket:**

```typescript
// apps/api/src/product-import/services/rate-limiter.service.ts

@Injectable()
export class RateLimiterService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async acquireToken(
    provider: string,
    companyId: string,
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = `rate-limit:${provider}:${companyId}`;
    const limit = this.getProviderLimit(provider);
    const window = limit.windowSeconds;
    const maxTokens = limit.requestsPerWindow;

    // Token bucket algorithm using Redis
    const now = Date.now();
    const windowStart = now - (window * 1000);

    // Remove old tokens
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // Count current tokens
    const currentTokens = await this.redis.zcard(key);

    if (currentTokens >= maxTokens) {
      // Rate limit exceeded
      const oldestToken = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const retryAfter = oldestToken[1] ?
        Math.ceil((parseInt(oldestToken[1]) + window * 1000 - now) / 1000) :
        window;

      return { allowed: false, retryAfter };
    }

    // Add token
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    await this.redis.expire(key, window * 2);

    return { allowed: true };
  }

  private getProviderLimit(provider: string): {
    requestsPerWindow: number;
    windowSeconds: number;
  } {
    switch (provider) {
      case 'ROASTIFY':
        return { requestsPerWindow: 100, windowSeconds: 60 };
      case 'SHOPIFY':
        return { requestsPerWindow: 120, windowSeconds: 60 };
      default:
        return { requestsPerWindow: 60, windowSeconds: 60 };
    }
  }
}
```

**Usage in Processor:**

```typescript
async function fetchProducts(provider: string, companyId: string) {
  const rateLimit = await this.rateLimiter.acquireToken(provider, companyId);

  if (!rateLimit.allowed) {
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, rateLimit.retryAfter! * 1000));
    return this.fetchProducts(provider, companyId);
  }

  // Proceed with API call
  return this.providerService.getProducts();
}
```

### Bull Queue Rate Limiting

**Built-in Rate Limiter:**

```typescript
BullModule.registerQueue({
  name: PRODUCT_IMPORT_QUEUE,
  limiter: {
    max: 100,      // Max 100 jobs
    duration: 60000, // Per 60 seconds
    bounceBack: false, // Drop excess jobs (or true to re-queue)
  },
})
```

---

## Backpressure Management

### Queue Depth Monitoring

**Alert Thresholds:**

```typescript
enum QueueHealthStatus {
  HEALTHY,   // 0-1000 jobs
  DEGRADED,  // 1000-5000 jobs
  CRITICAL,  // 5000-10000 jobs
  OVERLOAD,  // >10000 jobs
}

async function checkQueueHealth(): Promise<QueueHealthStatus> {
  const waiting = await queue.getWaitingCount();
  const active = await queue.getActiveCount();
  const delayed = await queue.getDelayedCount();

  const total = waiting + active + delayed;

  if (total > 10000) return QueueHealthStatus.OVERLOAD;
  if (total > 5000) return QueueHealthStatus.CRITICAL;
  if (total > 1000) return QueueHealthStatus.DEGRADED;
  return QueueHealthStatus.HEALTHY;
}
```

### Backpressure Strategies

**1. Reject New Jobs:**

```typescript
async function createImportJob(dto: CreateImportJobDto) {
  const health = await checkQueueHealth();

  if (health === QueueHealthStatus.OVERLOAD) {
    throw new ServiceUnavailableException(
      'Import system is at capacity. Please try again in a few minutes.',
    );
  }

  if (health === QueueHealthStatus.CRITICAL) {
    // Only allow priority clients
    if (client.plan !== 'ENTERPRISE') {
      throw new ServiceUnavailableException(
        'Import system is experiencing high load. Please try again shortly.',
      );
    }
  }

  // Proceed with job creation
}
```

**2. Delay Non-Critical Jobs:**

```typescript
await queue.add('process-import', jobData, {
  delay: client.plan === 'BASIC' ? 300000 : 0, // 5 min delay for basic tier
  priority: client.plan === 'ENTERPRISE' ? 1 : 10,
});
```

**3. Pause Queue (Emergency):**

```typescript
// Emergency circuit breaker
if (health === QueueHealthStatus.OVERLOAD) {
  await queue.pause();

  // Alert ops team
  await this.alertService.sendAlert({
    severity: 'critical',
    message: 'Product import queue paused due to overload',
    queueDepth: total,
  });

  // Auto-resume after workers catch up
  setTimeout(async () => {
    const newHealth = await checkQueueHealth();
    if (newHealth !== QueueHealthStatus.OVERLOAD) {
      await queue.resume();
    }
  }, 300000); // Check again in 5 minutes
}
```

---

## Monitoring & Observability

### Metrics to Track

**Queue Metrics (CloudWatch/Datadog):**

```typescript
// apps/api/src/product-import/metrics/queue-metrics.service.ts

@Injectable()
export class QueueMetricsService {
  constructor(
    @InjectQueue(PRODUCT_IMPORT_QUEUE) private readonly queue: Queue,
    private readonly cloudwatch: CloudWatchClient,
  ) {}

  @Cron('*/1 * * * *')  // Every minute
  async publishMetrics() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    await this.cloudwatch.putMetricData({
      Namespace: 'AVNZ/ProductImport',
      MetricData: [
        { MetricName: 'QueueDepth.Waiting', Value: waiting, Unit: 'Count' },
        { MetricName: 'QueueDepth.Active', Value: active, Unit: 'Count' },
        { MetricName: 'QueueDepth.Completed', Value: completed, Unit: 'Count' },
        { MetricName: 'QueueDepth.Failed', Value: failed, Unit: 'Count' },
        { MetricName: 'QueueDepth.Delayed', Value: delayed, Unit: 'Count' },
        {
          MetricName: 'QueueDepth.Total',
          Value: waiting + active + delayed,
          Unit: 'Count',
        },
      ],
    });
  }
}
```

**Job Metrics:**

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `job.duration.p50` | Median job duration | >5 min |
| `job.duration.p95` | 95th percentile | >15 min |
| `job.duration.p99` | 99th percentile | >30 min |
| `job.success_rate` | Completion rate | <95% |
| `job.retry_rate` | Retry percentage | >10% |
| `job.stalled_count` | Stalled jobs | >5 |

**Worker Metrics:**

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `worker.count` | Active workers | <2 (min) |
| `worker.cpu_usage` | CPU utilization | >80% |
| `worker.memory_usage` | Memory utilization | >85% |
| `worker.job_throughput` | Jobs/minute/worker | <5 |

**Provider API Metrics:**

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `provider.request_count` | API calls/min | Approaching limit |
| `provider.error_rate` | 4xx/5xx rate | >5% |
| `provider.latency.p95` | Response time | >5s |

### Logging Standards

**Structured Logging:**

```typescript
logger.log({
  event: 'job.started',
  jobId: job.id,
  companyId: job.data.companyId,
  provider: job.data.provider,
  productCount: job.data.totalProducts,
  timestamp: new Date().toISOString(),
});

logger.log({
  event: 'job.completed',
  jobId: job.id,
  duration: Date.now() - startTime,
  productsImported: importedCount,
  imagesProcessed: processedImages,
  errors: errorCount,
  timestamp: new Date().toISOString(),
});
```

### Dashboards

**CloudWatch Dashboard (JSON):**

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "Queue Depth",
        "metrics": [
          ["AVNZ/ProductImport", "QueueDepth.Waiting"],
          [".", "QueueDepth.Active"],
          [".", "QueueDepth.Total"]
        ],
        "period": 60,
        "stat": "Average"
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Job Success Rate",
        "metrics": [
          ["AVNZ/ProductImport", "job.success_rate"]
        ],
        "period": 300,
        "stat": "Average",
        "yAxis": { "left": { "min": 0, "max": 100 } }
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Worker Count",
        "metrics": [
          ["AWS/ECS", "DesiredTaskCount", { "stat": "Average" }],
          [".", "RunningTaskCount"]
        ],
        "period": 60
      }
    }
  ]
}
```

### Alerts

**PagerDuty/Datadog Alerts:**

```yaml
# alerts/product-import.yaml
alerts:
  - name: Queue Overload
    condition: avg(QueueDepth.Total) > 10000 for 5 minutes
    severity: critical
    action: page_oncall

  - name: High Failure Rate
    condition: avg(job.success_rate) < 90 for 10 minutes
    severity: high
    action: notify_slack

  - name: Worker Scale Issue
    condition: avg(worker.count) < 2 for 3 minutes
    severity: high
    action: auto_scale

  - name: Provider API Errors
    condition: sum(provider.error_rate) > 10 for 5 minutes
    severity: medium
    action: notify_slack
```

---

## Failure Modes & Recovery

### Failure Mode Analysis

| Failure | Probability | Impact | Detection | Recovery | MTTR |
|---------|-------------|--------|-----------|----------|------|
| Redis crash | Low | High | Immediate | Auto-failover | <60s |
| Worker pod crash | Medium | Low | 30s | Auto-restart | <60s |
| Database timeout | Low | Medium | Immediate | Retry | <5s |
| Provider API down | Medium | Medium | Immediate | Exponential backoff | 5-30min |
| S3 throttling | Low | Low | Immediate | Retry with jitter | <30s |
| Network partition | Low | High | 30s | Reconnect | <5min |
| OOM in worker | Low | Medium | Immediate | Pod restart | <60s |
| Orphaned job | Low | Low | 5min | Re-queue | <10min |

### Recovery Strategies

**1. Redis Crash:**

```
Timeline:
0s    - Redis primary crashes
5s    - ElastiCache detects failure
10s   - Promotes replica to primary
15s   - Updates DNS endpoint
20s   - Workers reconnect to new primary
30s   - Jobs resume processing

Data Loss:
- In-flight jobs lost if not persisted to AOF
- PostgreSQL has authoritative state, jobs can be re-queued

Recovery:
1. Orphan job detector finds PENDING jobs not in Redis
2. Re-queues them automatically within 5 minutes
```

**2. Worker Pod Crash:**

```
Timeline:
0s    - Worker pod crashes
10s   - Kubernetes detects failure
15s   - Starts new pod
45s   - New pod healthy and ready
60s   - Picks up jobs from queue

Data Loss:
- None (jobs in Redis queue)
- In-progress job becomes "stalled" after lockDuration (5 min)
- Bull retries stalled jobs automatically

Recovery:
- Automatic (no intervention needed)
```

**3. Provider API Outage:**

```
Timeline:
0s    - Provider API returns 503
5s    - Job fails, enters retry queue
10s   - First retry (5s backoff)
35s   - Second retry (25s backoff)
160s  - Third retry (125s backoff)
160s+ - Job marked as failed

Recovery:
1. User can manually retry failed jobs via UI
2. Batch retry endpoint: POST /api/products/import/retry-failed
3. Automatic retry after provider status page shows recovery
```

### Circuit Breaker Pattern

```typescript
// apps/api/src/integrations/services/circuit-breaker.service.ts

@Injectable()
export class CircuitBreakerService {
  private circuits = new Map<string, CircuitState>();

  async executeWithBreaker<T>(
    provider: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const circuit = this.getCircuit(provider);

    if (circuit.state === 'OPEN') {
      // Check if half-open timeout elapsed
      if (Date.now() - circuit.openedAt > circuit.halfOpenTimeout) {
        circuit.state = 'HALF_OPEN';
      } else {
        throw new ServiceUnavailableException(
          `${provider} API is unavailable (circuit open)`,
        );
      }
    }

    try {
      const result = await fn();

      // Success - close circuit
      circuit.failureCount = 0;
      if (circuit.state === 'HALF_OPEN') {
        circuit.state = 'CLOSED';
        this.logger.log(`Circuit closed for ${provider}`);
      }

      return result;
    } catch (error) {
      circuit.failureCount++;

      if (circuit.failureCount >= circuit.threshold) {
        circuit.state = 'OPEN';
        circuit.openedAt = Date.now();
        this.logger.error(`Circuit opened for ${provider} after ${circuit.failureCount} failures`);
      }

      throw error;
    }
  }

  private getCircuit(provider: string): CircuitState {
    if (!this.circuits.has(provider)) {
      this.circuits.set(provider, {
        state: 'CLOSED',
        failureCount: 0,
        threshold: 5,
        halfOpenTimeout: 60000, // 1 minute
        openedAt: 0,
      });
    }
    return this.circuits.get(provider)!;
  }
}

interface CircuitState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  threshold: number;
  halfOpenTimeout: number;
  openedAt: number;
}
```

---

## Infrastructure Configuration

### ECS Task Definition

```json
{
  "family": "product-import-worker",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096",
  "containerDefinitions": [
    {
      "name": "worker",
      "image": "${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/avnz-api:latest",
      "command": ["node", "dist/workers/product-import-worker.js"],
      "environment": [
        { "name": "WORKER_TYPE", "value": "product-import" },
        { "name": "BULL_CONCURRENCY", "value": "5" },
        { "name": "NODE_ENV", "value": "production" }
      ],
      "secrets": [
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:..." },
        { "name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:..." }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/product-import-worker",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "worker"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "node healthcheck.js || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Terraform Configuration

```hcl
# terraform/ecs-import-worker.tf

resource "aws_ecs_service" "import_worker" {
  name            = "product-import-worker"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.import_worker.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.worker.id]
    assign_public_ip = false
  }

  # Auto-scaling is handled by Application Auto Scaling
  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = {
    Name        = "product-import-worker"
    Environment = var.environment
    Service     = "product-import"
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "avnz-product-import"
  replication_group_description = "Redis for Bull queue"
  engine                     = "redis"
  engine_version             = "7.0"
  node_type                  = "cache.r7g.large"
  num_cache_clusters         = 3
  parameter_group_name       = "default.redis7"
  port                       = 6379

  automatic_failover_enabled = true
  multi_az_enabled          = true

  snapshot_retention_limit   = 5
  snapshot_window           = "03:00-05:00"

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  subnet_group_name = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  tags = {
    Name        = "avnz-product-import-redis"
    Environment = var.environment
  }
}
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Redis cluster configured with automatic failover
- [ ] ECS service auto-scaling configured
- [ ] CloudWatch alarms created
- [ ] PagerDuty integration tested
- [ ] Job reconciliation service enabled
- [ ] Circuit breakers configured for all providers
- [ ] Rate limiters set per provider
- [ ] Database indexes created for job queries
- [ ] Monitoring dashboard deployed
- [ ] Load testing completed (1000+ concurrent jobs)
- [ ] Disaster recovery plan documented
- [ ] Runbook for common issues created

### Deployment Strategy

**Blue/Green Deployment:**

```yaml
# k8s/rollout-strategy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-import-worker
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 50%        # Add 50% extra pods during rollout
      maxUnavailable: 0    # Keep all pods running

  minReadySeconds: 30      # Wait 30s before marking pod ready
  progressDeadlineSeconds: 600  # 10 min rollout timeout
```

**Rollout Steps:**

1. Deploy new worker version with low replica count (2 pods)
2. Monitor metrics for 10 minutes
3. If healthy, scale to 25% of target
4. Monitor for 10 minutes
5. If healthy, scale to 100%
6. Drain old version gracefully

### Rollback Plan

```bash
# Rollback to previous version
kubectl rollout undo deployment/product-import-worker

# Or specific revision
kubectl rollout undo deployment/product-import-worker --to-revision=2

# Verify rollback
kubectl rollout status deployment/product-import-worker
```

---

## Cost Analysis

### Infrastructure Costs (Monthly)

**Redis ElastiCache:**
```
cache.r7g.large × 3 nodes
- Compute: $0.201/hour × 3 × 730 hours = $440/month
- Backup storage: ~$10/month
Total: ~$450/month
```

**ECS Fargate (Workers):**
```
Average load (10 workers):
- vCPU: 2 × 10 = 20 vCPU × $0.04048/hour × 730 = $591/month
- Memory: 4GB × 10 = 40GB × $0.004445/GB/hour × 730 = $130/month

Peak load (50 workers, 10% of time):
- vCPU: 2 × 50 × 0.1 × $0.04048 × 730 = $295/month
- Memory: 4GB × 50 × 0.1 × $0.004445 × 730 = $65/month

Total compute: ~$1081/month
```

**CloudWatch Metrics:**
```
Custom metrics: 50 metrics × $0.30 = $15/month
Logs: ~100GB/month × $0.50/GB = $50/month
Total: ~$65/month
```

**Total Monthly Infrastructure Cost: ~$1600**

### Cost per Import Job

```
Assumptions:
- 100,000 jobs/month
- Average 50 products/job
- Average 3 images/product
- 5 minutes/job

Cost breakdown:
- Compute: $1081 / 100,000 = $0.011/job
- Storage (S3): $0.023/GB/month, avg 50MB/job = $0.001/job
- Redis: $450 / 100,000 = $0.005/job
- Monitoring: $65 / 100,000 = $0.001/job

Total: ~$0.018/job (1.8 cents per import)
```

### Scaling Cost Model

| Jobs/Month | Workers (Avg) | Cost/Month | Cost/Job |
|------------|---------------|------------|----------|
| 10,000 | 5 | $900 | $0.09 |
| 50,000 | 10 | $1,600 | $0.032 |
| 100,000 | 15 | $2,100 | $0.021 |
| 500,000 | 35 | $4,500 | $0.009 |
| 1,000,000 | 50 | $6,800 | $0.007 |

**Key Insight:** Cost per job decreases as volume increases due to better resource utilization.

---

## Appendix: Code Examples

### Health Check Endpoint

```typescript
// apps/api/src/product-import/controllers/health.controller.ts

@Controller('health')
export class HealthController {
  constructor(
    @InjectQueue(PRODUCT_IMPORT_QUEUE) private readonly queue: Queue,
  ) {}

  @Get('queue')
  async getQueueHealth(): Promise<QueueHealthResponse> {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
      this.queue.isPaused(),
    ]);

    const total = waiting + active + delayed;
    const status = this.calculateHealthStatus(total, paused);

    return {
      status,
      paused,
      metrics: {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private calculateHealthStatus(total: number, paused: boolean): string {
    if (paused) return 'paused';
    if (total > 10000) return 'overload';
    if (total > 5000) return 'critical';
    if (total > 1000) return 'degraded';
    return 'healthy';
  }
}
```

### Job Retry Endpoint

```typescript
// apps/api/src/product-import/controllers/job-retry.controller.ts

@Controller('products/import')
export class JobRetryController {
  constructor(
    private readonly importService: ProductImportService,
  ) {}

  @Post('retry-failed')
  async retryFailedJobs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('since') since?: string,
  ): Promise<{ retriedCount: number; jobs: string[] }> {
    const companyId = user.companyId;
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 86400000); // 24h ago

    // Find all failed jobs
    const failedJobs = await this.prisma.productImportJob.findMany({
      where: {
        companyId,
        status: ImportJobStatus.FAILED,
        completedAt: { gte: sinceDate },
      },
      select: { id: true },
    });

    // Retry each job
    const retriedJobs: string[] = [];
    for (const job of failedJobs) {
      try {
        await this.importService.retryImportJob(job.id, companyId, user.id);
        retriedJobs.push(job.id);
      } catch (error) {
        // Log but continue
        this.logger.warn(`Failed to retry job ${job.id}: ${error.message}`);
      }
    }

    return {
      retriedCount: retriedJobs.length,
      jobs: retriedJobs,
    };
  }
}
```

---

## Summary

This architecture provides:

1. **Horizontal Scalability** - Auto-scale from 2 to 50+ workers based on queue depth
2. **Zero Data Loss** - Two-phase commit with PostgreSQL + Redis reconciliation
3. **Crash Resilience** - Graceful shutdown, job recovery, automatic failover
4. **Rate Limit Compliance** - Per-provider, per-company token bucket rate limiting
5. **Backpressure Management** - Queue depth monitoring, tier-based throttling
6. **Full Observability** - CloudWatch metrics, structured logging, PagerDuty alerts
7. **Failure Recovery** - Circuit breakers, exponential backoff, orphan detection

**Next Steps:**
1. Review architecture with DevOps team
2. Implement Terraform modules for ECS + ElastiCache
3. Deploy to staging for load testing
4. Create runbooks for common failure scenarios
5. Train support team on monitoring dashboards

---

*Document Version: 1.0*
*Last Updated: December 28, 2025*
*Next Review: March 28, 2026*
