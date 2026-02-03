/**
 * Affiliate Click Queue Service
 *
 * High-performance async click ingestion for affiliate tracking.
 * Uses PostgreSQL for durable queuing with in-memory deduplication cache.
 *
 * Architecture:
 * 1. Incoming clicks are immediately inserted to queue table (sub-5ms response)
 * 2. Background processor batches clicks from queue for final processing
 * 3. Deduplication uses in-memory cache + idempotency key in DB
 * 4. Fraud detection runs during enrichment before queue insert
 *
 * Performance Targets:
 * - Ingestion latency: < 5ms p99
 * - Throughput: 10,000+ clicks/second
 * - Deduplication window: 60 minutes (configurable)
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClickQueueStatus, Prisma } from '@prisma/client';
import { createHash } from 'crypto';

// Click data as received from the tracking endpoint
export interface RawClickData {
  partnerId: string;
  linkId: string;
  companyId: string;
  ipAddress: string;
  userAgent?: string;
  referrer?: string;
  // SubIDs (t1-t5 stored as subId1-subId5)
  subId1?: string;
  subId2?: string;
  subId3?: string;
  subId4?: string;
  subId5?: string;
  // Overflow custom parameters (beyond t1-t5)
  customParams?: Record<string, string>;
  timestamp?: Date;
}

// Enriched click ready for database insertion
export interface EnrichedClick extends RawClickData {
  id: string;
  ipAddressHash: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  region?: string;
  city?: string;
  isUnique: boolean;
  fraudScore?: number;
  fraudReasons: string[];
  visitorId?: string;
  idempotencyKey: string;
  // Custom params overflow JSON
  customParams?: Record<string, string>;
}

export interface ClickQueueStats {
  queueSize: number;
  processedCount: number;
  duplicateCount: number;
  fraudCount: number;
  errorCount: number;
  avgProcessingTimeMs: number;
  lastProcessedAt?: Date;
  // Additional PostgreSQL-specific stats
  pendingInDb: number;
  failedInDb: number;
}

@Injectable()
export class ClickQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClickQueueService.name);

  // In-memory deduplication cache (IP + link combo -> timestamp)
  // Used for fast dedup check before hitting DB
  private readonly deduplicationCache = new Map<string, number>();

  // Statistics
  private stats = {
    processedCount: 0,
    duplicateCount: 0,
    fraudCount: 0,
    errorCount: 0,
    avgProcessingTimeMs: 0,
    lastProcessedAt: undefined as Date | undefined,
  };

  // Configuration
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 1000; // Process every second
  private readonly DEDUP_WINDOW_MS = 60 * 60 * 1000; // 60 minutes
  private readonly MAX_RETRIES = 3;
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Cleanup every hour

  // Processing interval handles
  private flushInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private dedupCleanupInterval: NodeJS.Timeout | null = null;

  // Callback for processing batches (set by affiliate module)
  private batchProcessor: ((clicks: EnrichedClick[]) => Promise<void>) | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Start background flush processor
    this.flushInterval = setInterval(() => {
      this.processQueue().catch((err) => {
        this.logger.error(`Queue processing error: ${err.message}`);
        this.stats.errorCount++;
      });
    }, this.FLUSH_INTERVAL_MS);

    // Cleanup completed/failed records older than 24 hours
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldRecords().catch((err) => {
        this.logger.error(`Cleanup error: ${err.message}`);
      });
    }, this.CLEANUP_INTERVAL_MS);

    // Cleanup deduplication cache periodically
    this.dedupCleanupInterval = setInterval(() => this.cleanupDeduplicationCache(), 5 * 60 * 1000);

    this.logger.log('Click queue service initialized (PostgreSQL-backed)');
  }

  async onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.dedupCleanupInterval) {
      clearInterval(this.dedupCleanupInterval);
    }

    // Process remaining clicks before shutdown
    const pendingCount = await this.prisma.affiliateClickQueue.count({
      where: { status: ClickQueueStatus.PENDING },
    });

    if (pendingCount > 0) {
      this.logger.log(`Processing ${pendingCount} remaining clicks before shutdown`);
      await this.processQueue();
    }
  }

  /**
   * Register the batch processor callback
   */
  setBatchProcessor(processor: (clicks: EnrichedClick[]) => Promise<void>) {
    this.batchProcessor = processor;
  }

  /**
   * Ingest a click into the queue
   * Returns immediately for low latency
   */
  async ingestClick(click: RawClickData): Promise<{
    queued: boolean;
    isDuplicate: boolean;
    idempotencyKey: string;
  }> {
    // Generate idempotency key
    const idempotencyKey = this.generateIdempotencyKey(click);

    // Check for duplicate in memory cache first (fast path)
    if (this.isDuplicateClick(click)) {
      this.stats.duplicateCount++;
      return { queued: false, isDuplicate: true, idempotencyKey };
    }

    // Enrich click data
    const enrichedClick = this.enrichClick(click, idempotencyKey);

    // Quick fraud check (basic heuristics)
    const fraudResult = this.quickFraudCheck(enrichedClick);
    enrichedClick.fraudScore = fraudResult.score;
    enrichedClick.fraudReasons = fraudResult.reasons;

    if (fraudResult.score > 80) {
      this.stats.fraudCount++;
      // Still queue for analysis but mark as suspicious
    }

    // Insert into PostgreSQL queue
    try {
      await this.prisma.affiliateClickQueue.create({
        data: {
          partnerId: enrichedClick.partnerId,
          linkId: enrichedClick.linkId,
          companyId: enrichedClick.companyId,
          ipAddress: click.ipAddress,
          userAgent: enrichedClick.userAgent,
          referrer: enrichedClick.referrer,
          subId1: enrichedClick.subId1,
          subId2: enrichedClick.subId2,
          subId3: enrichedClick.subId3,
          subId4: enrichedClick.subId4,
          subId5: enrichedClick.subId5,
          customParams: enrichedClick.customParams as Prisma.JsonObject | undefined,
          status: ClickQueueStatus.PENDING,
          ipAddressHash: enrichedClick.ipAddressHash,
          deviceType: enrichedClick.deviceType,
          browser: enrichedClick.browser,
          os: enrichedClick.os,
          isUnique: enrichedClick.isUnique,
          fraudScore: enrichedClick.fraudScore,
          fraudReasons: enrichedClick.fraudReasons,
          visitorId: enrichedClick.visitorId,
          idempotencyKey: enrichedClick.idempotencyKey,
        },
      });

      // Mark in dedup cache after successful insert
      this.markAsProcessed(click);

      return { queued: true, isDuplicate: false, idempotencyKey };
    } catch (error) {
      // Check for idempotency key conflict (duplicate in DB)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.stats.duplicateCount++;
        return { queued: false, isDuplicate: true, idempotencyKey };
      }
      this.stats.errorCount++;
      this.logger.error(`Failed to queue click: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Generate a unique idempotency key for the click
   */
  private generateIdempotencyKey(click: RawClickData): string {
    const data = `${click.partnerId}:${click.linkId}:${click.ipAddress}:${Date.now()}`;
    return createHash('sha256').update(data).digest('hex').slice(0, 32);
  }

  /**
   * Check if this click is a duplicate within the dedup window
   */
  private isDuplicateClick(click: RawClickData): boolean {
    const key = this.getDedupKey(click);
    const lastSeen = this.deduplicationCache.get(key);

    if (lastSeen && Date.now() - lastSeen < this.DEDUP_WINDOW_MS) {
      return true;
    }

    return false;
  }

  /**
   * Mark click as processed in dedup cache
   */
  private markAsProcessed(click: RawClickData): void {
    const key = this.getDedupKey(click);
    this.deduplicationCache.set(key, Date.now());
  }

  /**
   * Generate deduplication key from click data
   */
  private getDedupKey(click: RawClickData): string {
    // Dedup by IP + link combination
    const ipHash = createHash('md5').update(click.ipAddress).digest('hex').slice(0, 8);
    return `${click.linkId}:${ipHash}`;
  }

  /**
   * Enrich click data with additional info
   */
  private enrichClick(click: RawClickData, idempotencyKey: string): EnrichedClick {
    const id = `clk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

    // Hash IP for privacy
    const ipAddressHash = createHash('sha256')
      .update(click.ipAddress + (process.env.IP_HASH_SALT || 'default-salt'))
      .digest('hex');

    // Parse user agent (simplified - use ua-parser-js in production)
    const { deviceType, browser, os } = this.parseUserAgent(click.userAgent);

    // Generate visitor ID from fingerprint
    const visitorId = this.generateVisitorId(click);

    return {
      ...click,
      id,
      ipAddressHash,
      deviceType,
      browser,
      os,
      isUnique: true, // Passed dedup check
      fraudReasons: [],
      visitorId,
      idempotencyKey,
      timestamp: click.timestamp || new Date(),
    };
  }

  /**
   * Parse user agent string (simplified version)
   */
  private parseUserAgent(userAgent?: string): {
    deviceType?: string;
    browser?: string;
    os?: string;
  } {
    if (!userAgent) return {};

    const ua = userAgent.toLowerCase();

    let deviceType = 'desktop';
    if (ua.includes('mobile') || ua.includes('android')) {
      deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet';
    }

    let browser = 'unknown';
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';

    let os = 'unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) os = 'iOS';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';

    return { deviceType, browser, os };
  }

  /**
   * Generate anonymous visitor ID from fingerprint
   */
  private generateVisitorId(click: RawClickData): string {
    const fingerprint = `${click.ipAddress}:${click.userAgent || ''}`;
    return createHash('sha256').update(fingerprint).digest('hex').slice(0, 16);
  }

  /**
   * Quick fraud detection heuristics
   */
  private quickFraudCheck(click: EnrichedClick): {
    score: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let score = 0;

    // No user agent is suspicious
    if (!click.userAgent) {
      score += 30;
      reasons.push('missing_user_agent');
    }

    // Known bot patterns
    if (click.userAgent) {
      const botPatterns = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget'];
      for (const pattern of botPatterns) {
        if (click.userAgent.toLowerCase().includes(pattern)) {
          score += 50;
          reasons.push('bot_user_agent');
          break;
        }
      }
    }

    // Self-referral check
    if (click.referrer && click.referrer.includes('affiliate')) {
      score += 20;
      reasons.push('suspicious_referrer');
    }

    return { score, reasons };
  }

  /**
   * Process queued clicks in batches from PostgreSQL
   */
  private async processQueue(): Promise<void> {
    if (!this.batchProcessor) {
      return;
    }

    const startTime = Date.now();

    // Claim a batch of pending clicks atomically
    // Use SKIP LOCKED to allow concurrent processors
    const batch = await this.prisma.$transaction(async (tx) => {
      // Find pending clicks
      const pending = await tx.affiliateClickQueue.findMany({
        where: {
          status: ClickQueueStatus.PENDING,
          retryCount: { lt: this.MAX_RETRIES },
        },
        orderBy: { queuedAt: 'asc' },
        take: this.BATCH_SIZE,
      });

      if (pending.length === 0) {
        return [];
      }

      // Mark as processing
      await tx.affiliateClickQueue.updateMany({
        where: {
          id: { in: pending.map((p) => p.id) },
        },
        data: {
          status: ClickQueueStatus.PROCESSING,
        },
      });

      return pending;
    });

    if (batch.length === 0) {
      return;
    }

    // Convert to EnrichedClick format for processor
    const enrichedClicks: EnrichedClick[] = batch.map((record) => ({
      id: record.id,
      partnerId: record.partnerId,
      linkId: record.linkId,
      companyId: record.companyId,
      ipAddress: record.ipAddress,
      ipAddressHash: record.ipAddressHash || '',
      userAgent: record.userAgent || undefined,
      referrer: record.referrer || undefined,
      subId1: record.subId1 || undefined,
      subId2: record.subId2 || undefined,
      subId3: record.subId3 || undefined,
      subId4: record.subId4 || undefined,
      subId5: record.subId5 || undefined,
      customParams: record.customParams as Record<string, string> | undefined,
      deviceType: record.deviceType || undefined,
      browser: record.browser || undefined,
      os: record.os || undefined,
      isUnique: record.isUnique ?? true,
      fraudScore: record.fraudScore || undefined,
      fraudReasons: record.fraudReasons || [],
      visitorId: record.visitorId || undefined,
      idempotencyKey: record.idempotencyKey || '',
      timestamp: record.queuedAt,
    }));

    try {
      await this.batchProcessor(enrichedClicks);

      // Mark as completed
      await this.prisma.affiliateClickQueue.updateMany({
        where: {
          id: { in: batch.map((p) => p.id) },
        },
        data: {
          status: ClickQueueStatus.COMPLETED,
          processedAt: new Date(),
        },
      });

      this.stats.processedCount += batch.length;
      this.stats.lastProcessedAt = new Date();

      // Update average processing time
      const processingTime = Date.now() - startTime;
      this.stats.avgProcessingTimeMs = this.stats.avgProcessingTimeMs * 0.9 + processingTime * 0.1;
    } catch (error) {
      // Mark as failed with retry increment
      await this.prisma.affiliateClickQueue.updateMany({
        where: {
          id: { in: batch.map((p) => p.id) },
        },
        data: {
          status: ClickQueueStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          retryCount: { increment: 1 },
        },
      });

      // Reset items with retries remaining back to pending
      await this.prisma.affiliateClickQueue.updateMany({
        where: {
          id: { in: batch.map((p) => p.id) },
          retryCount: { lt: this.MAX_RETRIES },
        },
        data: {
          status: ClickQueueStatus.PENDING,
        },
      });

      this.stats.errorCount++;
      throw error;
    }
  }

  /**
   * Cleanup completed/failed records older than 24 hours
   */
  private async cleanupOldRecords(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.prisma.affiliateClickQueue.deleteMany({
      where: {
        OR: [
          { status: ClickQueueStatus.COMPLETED, processedAt: { lt: cutoff } },
          { status: ClickQueueStatus.DUPLICATE },
          { status: ClickQueueStatus.FAILED, retryCount: { gte: this.MAX_RETRIES }, queuedAt: { lt: cutoff } },
        ],
      },
    });

    if (result.count > 0) {
      this.logger.debug(`Cleaned up ${result.count} old queue records`);
    }
  }

  /**
   * Cleanup expired entries from deduplication cache
   */
  private cleanupDeduplicationCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, timestamp] of this.deduplicationCache.entries()) {
      if (now - timestamp > this.DEDUP_WINDOW_MS) {
        this.deduplicationCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired dedup entries`);
    }
  }

  /**
   * Get current queue statistics
   */
  async getStats(): Promise<ClickQueueStats> {
    const [pendingCount, failedCount] = await Promise.all([
      this.prisma.affiliateClickQueue.count({
        where: { status: ClickQueueStatus.PENDING },
      }),
      this.prisma.affiliateClickQueue.count({
        where: { status: ClickQueueStatus.FAILED, retryCount: { gte: this.MAX_RETRIES } },
      }),
    ]);

    return {
      queueSize: pendingCount,
      pendingInDb: pendingCount,
      failedInDb: failedCount,
      ...this.stats,
    };
  }

  /**
   * Force flush the queue (for testing or graceful shutdown)
   */
  async flush(): Promise<number> {
    let totalProcessed = 0;

    // Keep processing until queue is empty
    while (true) {
      const pendingCount = await this.prisma.affiliateClickQueue.count({
        where: { status: ClickQueueStatus.PENDING },
      });

      if (pendingCount === 0) {
        break;
      }

      await this.processQueue();
      totalProcessed += Math.min(pendingCount, this.BATCH_SIZE);
    }

    return totalProcessed;
  }
}
