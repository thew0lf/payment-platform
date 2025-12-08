# MI Billing Intelligence - Technical Specification

> **Last Updated:** December 7, 2025
> **Status:** Planning Phase
> **Related:** funnel-alpha-launch.md

---

## Overview

MI (Machine Intelligence) Billing Intelligence provides intelligent retry scheduling and dunning optimization for subscription billing. It learns customer payment patterns to maximize successful payment collection while minimizing customer friction.

---

## Core Concepts

### Payment Pattern Detection

The system analyzes historical payment data to detect:

1. **Payday Patterns** - When customers typically have funds available
2. **Time-of-Day Patterns** - Best hours for successful charges
3. **Day-of-Week Patterns** - Best days for successful charges
4. **Card Preferences** - Which payment methods succeed most often

### Intelligent Retry Scheduling

Instead of fixed retry schedules (Day 1, 3, 5, 7), MI optimizes retry timing per-customer based on their detected patterns.

---

## Schema Definitions

### CustomerPaymentPattern

Stores learned payment patterns for each customer.

```prisma
model CustomerPaymentPattern {
  id              String   @id @default(cuid())
  customerId      String   @unique
  customer        Customer @relation(fields: [customerId], references: [id])

  // Payday Detection
  paydayType      PaydayType?
  paydayDays      Int[]              // Day of month [1, 15] or day of week [5] for Friday
  paydayConfidence Float   @default(0)  // 0-1 confidence score

  // Time of Day Patterns
  bestHours       Int[]              // Hours with highest success rate (0-23)
  worstHours      Int[]              // Hours to avoid
  timeConfidence  Float   @default(0)

  // Day of Week Patterns
  bestDaysOfWeek  Int[]              // 0=Sunday, 1=Monday, etc.
  worstDaysOfWeek Int[]
  dowConfidence   Float   @default(0)

  // Card Preferences
  preferredCardLast4 String?         // Which card succeeds most often

  // Statistics
  totalPayments     Int    @default(0)
  successfulPayments Int   @default(0)
  failedPayments    Int    @default(0)
  avgSuccessAmount  Decimal? @db.Decimal(10, 2)

  // Analysis tracking
  lastAnalyzedAt  DateTime?
  dataPointsUsed  Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum PaydayType {
  WEEKLY          // Every week (e.g., every Friday)
  BIWEEKLY        // Every 2 weeks
  SEMIMONTHLY     // 1st and 15th of month
  MONTHLY         // Same day each month
  IRREGULAR       // No clear pattern detected
}
```

### DunningConfig

Client-level configuration for retry behavior.

```prisma
model DunningConfig {
  id                String   @id @default(cuid())
  clientId          String   @unique
  client            Client   @relation(fields: [clientId], references: [id])

  // Strategy Mode
  strategyMode      DunningStrategy  @default(MI_OPTIMIZED)

  // Fixed Schedule (when strategyMode = FIXED)
  fixedScheduleDays Int[]            // e.g., [1, 3, 5, 7, 14]

  // MI Configuration
  miEnabled         Boolean  @default(true)
  minPatternConfidence Float @default(0.6)  // Min confidence to use MI patterns

  // Retry Limits
  maxRetries        Int      @default(4)
  maxDaysToRetry    Int      @default(14)

  // Time Constraints
  allowedStartHour  Int      @default(8)   // 8 AM
  allowedEndHour    Int      @default(20)  // 8 PM
  timezone          String   @default("America/New_York")

  // Amount Handling
  reduceAmountAfterRetry Int?   // Retry # after which to offer partial payment
  partialPaymentPct Float?      // Percentage for partial payment offer

  // Communications
  sendFailureEmail  Boolean  @default(true)
  sendSMSReminder   Boolean  @default(false)
  reminderBeforeHours Int?   @default(24)  // Send reminder X hours before retry

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum DunningStrategy {
  FIXED           // Use fixedScheduleDays exactly
  MI_OPTIMIZED    // Use MI patterns, fall back to default
  AGGRESSIVE      // Retry more frequently
  CONSERVATIVE    // Retry less frequently, more spacing
}
```

### ScheduledRetry

Tracks individual retry attempts.

```prisma
model ScheduledRetry {
  id              String   @id @default(cuid())
  subscriptionId  String
  subscription    Subscription @relation(fields: [subscriptionId], references: [id])
  invoiceId       String
  invoice         SubscriptionInvoice @relation(fields: [invoiceId], references: [id])

  // Retry Info
  retryNumber     Int                  // 1, 2, 3, 4...
  scheduledAt     DateTime             // When to attempt
  executedAt      DateTime?            // When actually attempted

  // MI Decision Data (for analytics/learning)
  scheduleReason  String?              // 'payday_aligned', 'time_optimized', 'fixed_schedule'
  patternSnapshot Json?                // Snapshot of pattern data used for decision
  confidence      Float?               // MI confidence in this timing

  // Result
  status          RetryStatus @default(PENDING)
  resultCode      String?              // Payment processor response code
  resultMessage   String?
  amountAttempted Decimal  @db.Decimal(10, 2)
  amountCharged   Decimal? @db.Decimal(10, 2)  // May differ if partial

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([scheduledAt, status])
  @@index([subscriptionId])
}

enum RetryStatus {
  PENDING         // Waiting to execute
  PROCESSING      // Currently attempting
  SUCCESS         // Payment succeeded
  FAILED          // Payment failed, may retry again
  CANCELLED       // Retry cancelled (subscription cancelled, etc.)
  SKIPPED         // Skipped (better time found, customer paid manually, etc.)
}
```

---

## Service Architecture

### MIPatternAnalyzer Service

Analyzes customer payment history to detect patterns.

```typescript
@Injectable()
export class MIPatternAnalyzerService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Analyze payment history and update customer patterns
   * Called nightly for all customers with recent activity
   */
  async analyzeCustomerPatterns(customerId: string): Promise<CustomerPaymentPattern> {
    // Get last 12 months of payment history
    const payments = await this.getPaymentHistory(customerId, 365);

    if (payments.length < 3) {
      // Not enough data for pattern detection
      return this.createDefaultPattern(customerId);
    }

    // Detect patterns
    const paydayPattern = this.analyzePaydayPattern(payments);
    const timePattern = this.analyzeTimeOfDayPattern(payments);
    const dowPattern = this.analyzeDayOfWeekPattern(payments);

    // Update or create pattern record
    return this.prisma.customerPaymentPattern.upsert({
      where: { customerId },
      update: {
        paydayType: paydayPattern.type,
        paydayDays: paydayPattern.days,
        paydayConfidence: paydayPattern.confidence,
        bestHours: timePattern.bestHours,
        worstHours: timePattern.worstHours,
        timeConfidence: timePattern.confidence,
        bestDaysOfWeek: dowPattern.bestDays,
        worstDaysOfWeek: dowPattern.worstDays,
        dowConfidence: dowPattern.confidence,
        totalPayments: payments.length,
        successfulPayments: payments.filter(p => p.success).length,
        lastAnalyzedAt: new Date(),
        dataPointsUsed: payments.length,
      },
      create: {
        customerId,
        // ... same fields
      },
    });
  }

  /**
   * Detect payday patterns from successful payment timestamps
   */
  private analyzePaydayPattern(payments: PaymentDataPoint[]): PaydayPattern {
    const successfulPayments = payments.filter(p => p.success);
    const dayOfMonthCounts = new Map<number, number>();
    const dayOfWeekCounts = new Map<number, number>();

    for (const payment of successfulPayments) {
      const date = new Date(payment.timestamp);
      const dayOfMonth = date.getDate();
      const dayOfWeek = date.getDay();

      dayOfMonthCounts.set(dayOfMonth, (dayOfMonthCounts.get(dayOfMonth) || 0) + 1);
      dayOfWeekCounts.set(dayOfWeek, (dayOfWeekCounts.get(dayOfWeek) || 0) + 1);
    }

    // Check for semi-monthly pattern (1st and 15th)
    const firstCount = dayOfMonthCounts.get(1) || 0;
    const fifteenthCount = dayOfMonthCounts.get(15) || 0;
    if ((firstCount + fifteenthCount) / successfulPayments.length > 0.7) {
      return {
        type: PaydayType.SEMIMONTHLY,
        days: [1, 15],
        confidence: (firstCount + fifteenthCount) / successfulPayments.length,
      };
    }

    // Check for weekly pattern (e.g., every Friday)
    const topDayOfWeek = [...dayOfWeekCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0];
    if (topDayOfWeek && topDayOfWeek[1] / successfulPayments.length > 0.6) {
      return {
        type: PaydayType.WEEKLY,
        days: [topDayOfWeek[0]],
        confidence: topDayOfWeek[1] / successfulPayments.length,
      };
    }

    // Check for monthly pattern (same day each month)
    const topDayOfMonth = [...dayOfMonthCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0];
    if (topDayOfMonth && topDayOfMonth[1] / successfulPayments.length > 0.5) {
      return {
        type: PaydayType.MONTHLY,
        days: [topDayOfMonth[0]],
        confidence: topDayOfMonth[1] / successfulPayments.length,
      };
    }

    return {
      type: PaydayType.IRREGULAR,
      days: [],
      confidence: 0,
    };
  }

  /**
   * Analyze which hours have highest success rates
   */
  private analyzeTimeOfDayPattern(payments: PaymentDataPoint[]): TimePattern {
    const hourStats = new Map<number, { success: number; total: number }>();

    for (const payment of payments) {
      const hour = new Date(payment.timestamp).getHours();
      const stats = hourStats.get(hour) || { success: 0, total: 0 };
      stats.total++;
      if (payment.success) stats.success++;
      hourStats.set(hour, stats);
    }

    // Calculate success rate per hour
    const hourRates = [...hourStats.entries()]
      .map(([hour, stats]) => ({
        hour,
        rate: stats.total >= 3 ? stats.success / stats.total : 0.5,
        volume: stats.total,
      }))
      .filter(h => h.volume >= 3); // Need minimum data

    // Sort by success rate
    hourRates.sort((a, b) => b.rate - a.rate);

    const bestHours = hourRates.slice(0, 4).map(h => h.hour);
    const worstHours = hourRates.slice(-3).map(h => h.hour);

    // Calculate confidence based on data volume
    const totalVolume = hourRates.reduce((sum, h) => sum + h.volume, 0);
    const confidence = Math.min(1, totalVolume / 50); // Max confidence at 50+ data points

    return {
      bestHours,
      worstHours,
      confidence,
    };
  }

  /**
   * Analyze which days of week have highest success rates
   */
  private analyzeDayOfWeekPattern(payments: PaymentDataPoint[]): DayOfWeekPattern {
    const dayStats = new Map<number, { success: number; total: number }>();

    for (const payment of payments) {
      const day = new Date(payment.timestamp).getDay();
      const stats = dayStats.get(day) || { success: 0, total: 0 };
      stats.total++;
      if (payment.success) stats.success++;
      dayStats.set(day, stats);
    }

    const dayRates = [...dayStats.entries()]
      .map(([day, stats]) => ({
        day,
        rate: stats.total >= 3 ? stats.success / stats.total : 0.5,
        volume: stats.total,
      }))
      .filter(d => d.volume >= 3);

    dayRates.sort((a, b) => b.rate - a.rate);

    const bestDays = dayRates.slice(0, 3).map(d => d.day);
    const worstDays = dayRates.slice(-2).map(d => d.day);

    const totalVolume = dayRates.reduce((sum, d) => sum + d.volume, 0);
    const confidence = Math.min(1, totalVolume / 30);

    return {
      bestDays,
      worstDays,
      confidence,
    };
  }
}
```

### MIRetryScheduler Service

Calculates optimal retry schedules using detected patterns.

```typescript
@Injectable()
export class MIRetrySchedulerService {
  constructor(
    private prisma: PrismaService,
    private patternAnalyzer: MIPatternAnalyzerService,
  ) {}

  /**
   * Generate optimal retry schedule for a failed payment
   */
  async generateRetrySchedule(
    subscriptionId: string,
    invoiceId: string,
    failedAt: Date,
  ): Promise<ScheduledRetry[]> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        customer: {
          include: { paymentPattern: true },
        },
        plan: true,
      },
    });

    // Get dunning config for client
    const dunningConfig = await this.getDunningConfig(subscription.plan.companyId);

    // Get customer patterns (or defaults)
    const patterns = subscription.customer.paymentPattern ||
      await this.patternAnalyzer.createDefaultPattern(subscription.customerId);

    // Generate schedule based on strategy
    const schedule: ScheduledRetry[] = [];
    let currentDate = failedAt;

    for (let retry = 1; retry <= dunningConfig.maxRetries; retry++) {
      const nextRetry = this.calculateNextRetryTime(
        currentDate,
        patterns,
        dunningConfig,
        retry,
      );

      // Check we haven't exceeded max days
      const daysSinceFailure = this.daysDiff(nextRetry, failedAt);
      if (daysSinceFailure > dunningConfig.maxDaysToRetry) {
        break;
      }

      schedule.push({
        subscriptionId,
        invoiceId,
        retryNumber: retry,
        scheduledAt: nextRetry,
        scheduleReason: this.getScheduleReason(patterns, dunningConfig, retry),
        patternSnapshot: patterns,
        confidence: this.calculateConfidence(patterns, dunningConfig),
        status: RetryStatus.PENDING,
        amountAttempted: subscription.plan.price,
      } as ScheduledRetry);

      currentDate = nextRetry;
    }

    // Save scheduled retries
    await this.prisma.scheduledRetry.createMany({ data: schedule });

    return schedule;
  }

  /**
   * Calculate next optimal retry time
   */
  private calculateNextRetryTime(
    after: Date,
    patterns: CustomerPaymentPattern,
    config: DunningConfig,
    retryNum: number,
  ): Date {
    // Start with base delay
    const baseDelay = this.getBaseDelay(retryNum, config.strategyMode);
    let candidate = this.addDays(after, baseDelay);

    // If MI enabled and we have high-confidence patterns, optimize
    if (config.miEnabled) {
      // Try to align with payday if detected
      if (patterns.paydayConfidence >= config.minPatternConfidence) {
        candidate = this.alignToPayday(candidate, patterns);
      }

      // Optimize day of week if pattern detected
      if (patterns.dowConfidence >= config.minPatternConfidence) {
        candidate = this.alignToBestDayOfWeek(candidate, patterns.bestDaysOfWeek);
      }

      // Optimize hour
      if (patterns.timeConfidence >= config.minPatternConfidence) {
        candidate = this.setOptimalHour(candidate, patterns.bestHours);
      } else {
        // Default to mid-morning (typically good)
        candidate = this.setHour(candidate, 10);
      }
    } else {
      // Fixed strategy - use base delay only
      candidate = this.setHour(candidate, 10);
    }

    // Ensure within allowed hours
    candidate = this.constrainToAllowedHours(candidate, config);

    return candidate;
  }

  /**
   * Get base delay in days for each retry
   */
  private getBaseDelay(retryNum: number, strategy: DunningStrategy): number {
    const schedules = {
      [DunningStrategy.AGGRESSIVE]: [0, 1, 2, 3, 5, 7],
      [DunningStrategy.CONSERVATIVE]: [1, 4, 8, 14],
      [DunningStrategy.FIXED]: [1, 3, 5, 7],
      [DunningStrategy.MI_OPTIMIZED]: [1, 3, 5, 7], // Base, will be optimized
    };

    const schedule = schedules[strategy] || schedules[DunningStrategy.FIXED];
    return schedule[retryNum - 1] || schedule[schedule.length - 1] + 3;
  }

  /**
   * Align date to next payday
   */
  private alignToPayday(date: Date, patterns: CustomerPaymentPattern): Date {
    if (patterns.paydayType === PaydayType.SEMIMONTHLY) {
      // Find next 1st or 15th after date
      const dayOfMonth = date.getDate();
      if (dayOfMonth < 15) {
        date.setDate(15);
      } else {
        date.setMonth(date.getMonth() + 1);
        date.setDate(1);
      }
    } else if (patterns.paydayType === PaydayType.WEEKLY && patterns.paydayDays.length > 0) {
      // Find next occurrence of payday
      const targetDay = patterns.paydayDays[0];
      const currentDay = date.getDay();
      const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
      date.setDate(date.getDate() + daysUntil);
    } else if (patterns.paydayType === PaydayType.MONTHLY && patterns.paydayDays.length > 0) {
      // Find next occurrence of payday date
      const targetDate = patterns.paydayDays[0];
      if (date.getDate() >= targetDate) {
        date.setMonth(date.getMonth() + 1);
      }
      date.setDate(targetDate);
    }

    return date;
  }

  private getScheduleReason(
    patterns: CustomerPaymentPattern,
    config: DunningConfig,
    retryNum: number,
  ): string {
    if (!config.miEnabled) {
      return 'fixed_schedule';
    }

    const reasons = [];
    if (patterns.paydayConfidence >= config.minPatternConfidence) {
      reasons.push('payday_aligned');
    }
    if (patterns.dowConfidence >= config.minPatternConfidence) {
      reasons.push('day_optimized');
    }
    if (patterns.timeConfidence >= config.minPatternConfidence) {
      reasons.push('time_optimized');
    }

    return reasons.length > 0 ? reasons.join(',') : 'base_schedule';
  }
}
```

---

## Bull Queue Jobs

### Job Definitions

```typescript
// billing.processor.ts

@Processor('billing')
export class BillingProcessor {
  constructor(
    private billingService: BillingEngineService,
    private retryScheduler: MIRetrySchedulerService,
    private patternAnalyzer: MIPatternAnalyzerService,
  ) {}

  /**
   * Process subscriptions due for billing
   * Runs every 5 minutes
   */
  @Process('process-due-subscriptions')
  async processDueSubscriptions(job: Job): Promise<void> {
    const dueSubscriptions = await this.billingService.findDueSubscriptions();

    for (const subscription of dueSubscriptions) {
      await this.billingService.processSubscription(subscription.id);
    }
  }

  /**
   * Execute scheduled retry
   * Runs every minute, processes retries due in next minute
   */
  @Process('execute-scheduled-retry')
  async executeScheduledRetry(job: Job<{ retryId: string }>): Promise<void> {
    const { retryId } = job.data;
    await this.billingService.executeRetry(retryId);
  }

  /**
   * Analyze payment patterns for all active customers
   * Runs nightly at 2 AM
   */
  @Process('analyze-patterns')
  async analyzePatterns(job: Job): Promise<void> {
    const customers = await this.billingService.findCustomersForAnalysis();

    for (const customer of customers) {
      await this.patternAnalyzer.analyzeCustomerPatterns(customer.id);
    }
  }

  /**
   * Send dunning communications
   */
  @Process('send-dunning-email')
  async sendDunningEmail(job: Job<{ subscriptionId: string; type: string }>): Promise<void> {
    // Use MI content generation for personalized messaging
    await this.billingService.sendDunningCommunication(job.data);
  }
}
```

### Queue Registration

```typescript
// billing.module.ts

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'billing',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    }),
  ],
  providers: [
    BillingProcessor,
    BillingEngineService,
    MIRetrySchedulerService,
    MIPatternAnalyzerService,
  ],
})
export class BillingModule {}
```

### Scheduled Jobs (Cron)

```typescript
// billing-scheduler.service.ts

@Injectable()
export class BillingSchedulerService {
  constructor(
    @InjectQueue('billing') private billingQueue: Queue,
  ) {}

  @Cron('*/5 * * * *') // Every 5 minutes
  async scheduleDueSubscriptions() {
    await this.billingQueue.add('process-due-subscriptions', {});
  }

  @Cron('* * * * *') // Every minute
  async scheduleRetries() {
    // Find retries due in next minute
    const dueRetries = await this.findDueRetries();
    for (const retry of dueRetries) {
      await this.billingQueue.add('execute-scheduled-retry', { retryId: retry.id });
    }
  }

  @Cron('0 2 * * *') // Daily at 2 AM
  async schedulePatternAnalysis() {
    await this.billingQueue.add('analyze-patterns', {});
  }
}
```

---

## Industry Best Practices Integration

| Source | Recommendation | Our Implementation |
|--------|---------------|-------------------|
| **Stripe Smart Retries** | ML-based timing using network data | Per-customer pattern learning |
| **Recurly Research** | 4 retries over 14 days optimal | Configurable, default 4/14 |
| **Chargebee** | Day 1, 3, 5, 7 default | Base schedule before MI |
| **GoCardless** | Avoid weekends, prefer mornings | Time/day pattern detection |
| **Industry Studies** | Post-payday +40% success | Payday alignment feature |

---

## Configuration Examples

### Aggressive Recovery (High-value customers)

```typescript
{
  strategyMode: 'AGGRESSIVE',
  maxRetries: 6,
  maxDaysToRetry: 21,
  miEnabled: true,
  minPatternConfidence: 0.5,  // Use patterns even with lower confidence
  sendSMSReminder: true,
}
```

### Conservative Recovery (Subscription boxes)

```typescript
{
  strategyMode: 'CONSERVATIVE',
  maxRetries: 3,
  maxDaysToRetry: 10,
  miEnabled: true,
  minPatternConfidence: 0.7,
  reduceAmountAfterRetry: 2,  // Offer partial after 2 failures
  partialPaymentPct: 0.5,
}
```

### Fixed Schedule (Regulated industry)

```typescript
{
  strategyMode: 'FIXED',
  fixedScheduleDays: [1, 3, 7, 14],
  miEnabled: false,  // No ML optimization
  sendFailureEmail: true,
}
```

---

## Metrics & Monitoring

### Key Metrics to Track

| Metric | Description | Target |
|--------|-------------|--------|
| Recovery Rate | % of failed payments recovered | > 65% |
| Avg Retries to Success | Number of attempts needed | < 2.5 |
| Time to Recovery | Days from first failure to success | < 5 |
| Pattern Accuracy | % of MI predictions that succeed | > 70% |
| Customer Churn from Billing | % lost due to payment issues | < 3% |

### Dashboard Queries

```sql
-- Recovery rate by strategy
SELECT
  dc.strategy_mode,
  COUNT(CASE WHEN sr.status = 'SUCCESS' THEN 1 END)::float /
  COUNT(*)::float * 100 as recovery_rate
FROM scheduled_retry sr
JOIN subscription s ON sr.subscription_id = s.id
JOIN subscription_plan sp ON s.plan_id = sp.id
JOIN dunning_config dc ON dc.client_id = sp.company_id
GROUP BY dc.strategy_mode;

-- MI pattern effectiveness
SELECT
  sr.schedule_reason,
  COUNT(CASE WHEN sr.status = 'SUCCESS' THEN 1 END) as successes,
  COUNT(*) as total,
  AVG(sr.confidence) as avg_confidence
FROM scheduled_retry sr
WHERE sr.schedule_reason IS NOT NULL
GROUP BY sr.schedule_reason;
```

---

*Document Version: 1.0*
*Created: December 7, 2025*
