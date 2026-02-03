import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { DataClassification } from '@prisma/client';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AuditAction, AuditEntity } from '../../audit-logs/types/audit-log.types';
import {
  RateLimitConfig,
  RateLimitState,
  RateLimitResult,
  RateLimitViolation,
  RateLimitTier,
  RATE_LIMIT_CONFIGS,
  REDIS_RATE_LIMIT_PREFIX,
  REDIS_BLOCKED_IP_PREFIX,
} from './ip-throttle.types';

/**
 * IP-Based Rate Limiting Service
 *
 * Features:
 * - Redis-backed rate limiting with sliding window
 * - Multiple tier support (public, auth, payment, admin, api)
 * - Automatic blocking for repeated violations
 * - SOC2 CC7.2 compliant audit logging
 * - Graceful fallback when Redis is unavailable
 */
@Injectable()
export class IpThrottleService implements OnModuleInit {
  private readonly logger = new Logger(IpThrottleService.name);
  private useInMemoryFallback = false;
  private inMemoryStore: Map<string, RateLimitState> = new Map();

  // Track violations for anomaly detection
  private violationCounts: Map<string, { count: number; firstViolation: number }> = new Map();
  private readonly ANOMALY_THRESHOLD = 10; // 10 violations = potential abuse
  private readonly ANOMALY_WINDOW = 300000; // 5 minute window for anomaly detection

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async onModuleInit() {
    if (!this.redis) {
      this.logger.warn(
        'Redis not available - using in-memory rate limiting (not suitable for production)',
      );
      this.useInMemoryFallback = true;
    } else {
      try {
        await this.redis.ping();
        this.logger.log('Redis connected for IP rate limiting');
      } catch (error) {
        this.logger.warn(
          'Redis ping failed - using in-memory fallback for rate limiting',
        );
        this.useInMemoryFallback = true;
      }
    }
  }

  /**
   * Check rate limit for an IP address
   */
  async checkRateLimit(
    ip: string,
    config: RateLimitConfig,
    context?: { path?: string; method?: string; userAgent?: string },
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const key = this.buildKey(ip, config.tier);
    const blockedKey = this.buildBlockedKey(ip, config.tier);

    // Check if IP is blocked
    const blockedUntil = await this.getBlockedUntil(blockedKey);
    if (blockedUntil && blockedUntil > now) {
      const retryAfter = Math.ceil((blockedUntil - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt: blockedUntil,
        retryAfter,
        blocked: true,
      };
    }

    // Get current state
    const state = await this.getState(key);
    const windowStart = now - config.window * 1000;

    // Reset if window has expired
    if (!state || state.firstRequestAt < windowStart) {
      const newState: RateLimitState = {
        count: 1,
        firstRequestAt: now,
      };
      await this.setState(key, newState, config.window);
      return {
        allowed: true,
        remaining: config.limit - 1,
        resetAt: now + config.window * 1000,
      };
    }

    // Increment count
    const newCount = state.count + 1;
    const resetAt = state.firstRequestAt + config.window * 1000;
    const ttl = Math.ceil((resetAt - now) / 1000);

    if (newCount > config.limit) {
      // Rate limit exceeded - log violation and optionally block
      await this.handleViolation(ip, config, context);

      // Block IP if configured
      if (config.blockDuration) {
        const blockUntil = now + config.blockDuration * 1000;
        await this.setBlocked(blockedKey, blockUntil, config.blockDuration);
      }

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt - now) / 1000),
      };
    }

    // Update state
    await this.setState(key, { ...state, count: newCount }, ttl);

    return {
      allowed: true,
      remaining: config.limit - newCount,
      resetAt,
    };
  }

  /**
   * Get rate limit headers for response
   */
  getRateLimitHeaders(result: RateLimitResult, config: RateLimitConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': config.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
    };

    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
  }

  /**
   * Manually block an IP (e.g., after security incident)
   */
  async blockIp(
    ip: string,
    durationSeconds: number,
    tier: RateLimitTier = RateLimitTier.PUBLIC,
    reason?: string,
  ): Promise<void> {
    const blockedKey = this.buildBlockedKey(ip, tier);
    const blockedUntil = Date.now() + durationSeconds * 1000;
    await this.setBlocked(blockedKey, blockedUntil, durationSeconds);

    await this.auditLogsService.log(AuditAction.IP_BLOCKED, AuditEntity.SYSTEM, ip, {
      metadata: {
        tier,
        durationSeconds,
        reason,
        blockedUntil: new Date(blockedUntil).toISOString(),
      },
      ipAddress: ip,
      dataClassification: DataClassification.INTERNAL,
    });

    this.logger.warn(`IP ${ip} blocked for ${durationSeconds}s - Reason: ${reason || 'Manual block'}`);
  }

  /**
   * Unblock an IP
   */
  async unblockIp(ip: string, tier: RateLimitTier = RateLimitTier.PUBLIC): Promise<void> {
    const blockedKey = this.buildBlockedKey(ip, tier);

    if (this.useInMemoryFallback) {
      this.inMemoryStore.delete(blockedKey);
    } else {
      await this.redis!.del(blockedKey);
    }

    this.logger.log(`IP ${ip} unblocked for tier ${tier}`);
  }

  /**
   * Get all blocked IPs for a tier
   */
  async getBlockedIps(tier: RateLimitTier = RateLimitTier.PUBLIC): Promise<string[]> {
    const pattern = `${REDIS_BLOCKED_IP_PREFIX}${tier}:*`;

    if (this.useInMemoryFallback) {
      const blockedIps: string[] = [];
      const now = Date.now();
      for (const [key, state] of this.inMemoryStore.entries()) {
        if (key.startsWith(`${REDIS_BLOCKED_IP_PREFIX}${tier}:`)) {
          if (state.blockedUntil && state.blockedUntil > now) {
            blockedIps.push(key.replace(`${REDIS_BLOCKED_IP_PREFIX}${tier}:`, ''));
          }
        }
      }
      return blockedIps;
    }

    const keys = await this.redis!.keys(pattern);
    return keys.map((k) => k.replace(`${REDIS_BLOCKED_IP_PREFIX}${tier}:`, ''));
  }

  /**
   * Get current rate limit stats for an IP
   */
  async getIpStats(
    ip: string,
    tier: RateLimitTier = RateLimitTier.PUBLIC,
  ): Promise<{ current: number; limit: number; windowEndsAt: number } | null> {
    const key = this.buildKey(ip, tier);
    const config = RATE_LIMIT_CONFIGS[tier];
    const state = await this.getState(key);

    if (!state) {
      return null;
    }

    const windowEnd = state.firstRequestAt + config.window * 1000;
    if (windowEnd < Date.now()) {
      return null;
    }

    return {
      current: state.count,
      limit: config.limit,
      windowEndsAt: windowEnd,
    };
  }

  // Private helper methods

  private buildKey(ip: string, tier: RateLimitTier): string {
    return `${REDIS_RATE_LIMIT_PREFIX}${tier}:${ip}`;
  }

  private buildBlockedKey(ip: string, tier: RateLimitTier): string {
    return `${REDIS_BLOCKED_IP_PREFIX}${tier}:${ip}`;
  }

  private async getState(key: string): Promise<RateLimitState | null> {
    if (this.useInMemoryFallback) {
      const state = this.inMemoryStore.get(key);
      if (!state) return null;
      // Clean expired entries
      if (state.blockedUntil && state.blockedUntil < Date.now()) {
        this.inMemoryStore.delete(key);
        return null;
      }
      return state;
    }

    const data = await this.redis!.get(key);
    if (!data) return null;
    return JSON.parse(data);
  }

  private async setState(key: string, state: RateLimitState, ttlSeconds: number): Promise<void> {
    if (this.useInMemoryFallback) {
      this.inMemoryStore.set(key, state);
      // Schedule cleanup
      setTimeout(() => {
        this.inMemoryStore.delete(key);
      }, ttlSeconds * 1000);
      return;
    }

    await this.redis!.setex(key, ttlSeconds, JSON.stringify(state));
  }

  private async getBlockedUntil(key: string): Promise<number | null> {
    if (this.useInMemoryFallback) {
      const state = this.inMemoryStore.get(key);
      return state?.blockedUntil ?? null;
    }

    const data = await this.redis!.get(key);
    if (!data) return null;
    return parseInt(data, 10);
  }

  private async setBlocked(key: string, blockedUntil: number, ttlSeconds: number): Promise<void> {
    if (this.useInMemoryFallback) {
      this.inMemoryStore.set(key, { count: 0, firstRequestAt: Date.now(), blockedUntil });
      setTimeout(() => {
        this.inMemoryStore.delete(key);
      }, ttlSeconds * 1000);
      return;
    }

    await this.redis!.setex(key, ttlSeconds, blockedUntil.toString());
  }

  private async handleViolation(
    ip: string,
    config: RateLimitConfig,
    context?: { path?: string; method?: string; userAgent?: string },
  ): Promise<void> {
    const violation: RateLimitViolation = {
      ip,
      tier: config.tier,
      path: context?.path ?? 'unknown',
      method: context?.method ?? 'unknown',
      currentCount: config.limit + 1,
      limit: config.limit,
      userAgent: context?.userAgent,
      timestamp: new Date(),
    };

    // Log to audit trail - SOC2 CC7.2 compliance
    await this.auditLogsService.log(
      AuditAction.API_RATE_LIMITED,
      AuditEntity.SYSTEM,
      ip,
      {
        metadata: {
          tier: config.tier,
          path: context?.path,
          method: context?.method,
          limit: config.limit,
          window: config.window,
          blockedFor: config.blockDuration,
        },
        ipAddress: ip,
        userAgent: context?.userAgent,
        dataClassification: DataClassification.INTERNAL,
      },
    );

    // Track for anomaly detection
    await this.trackViolationForAnomalyDetection(ip, violation);

    this.logger.warn(
      `Rate limit exceeded: IP=${ip} Tier=${config.tier} Path=${context?.path} Limit=${config.limit}`,
    );
  }

  private async trackViolationForAnomalyDetection(
    ip: string,
    violation: RateLimitViolation,
  ): Promise<void> {
    const now = Date.now();
    const existing = this.violationCounts.get(ip);

    if (!existing || now - existing.firstViolation > this.ANOMALY_WINDOW) {
      // Start new tracking window
      this.violationCounts.set(ip, { count: 1, firstViolation: now });
      return;
    }

    const newCount = existing.count + 1;
    this.violationCounts.set(ip, { count: newCount, firstViolation: existing.firstViolation });

    // Check for anomaly (potential abuse)
    if (newCount >= this.ANOMALY_THRESHOLD) {
      await this.reportAnomaly(ip, violation, newCount);
      // Reset counter after reporting
      this.violationCounts.delete(ip);
    }
  }

  private async reportAnomaly(
    ip: string,
    violation: RateLimitViolation,
    violationCount: number,
  ): Promise<void> {
    // Log abuse detection - SOC2 CC7.2 compliance
    await this.auditLogsService.log(
      AuditAction.API_ABUSE_DETECTED,
      AuditEntity.SYSTEM,
      ip,
      {
        metadata: {
          tier: violation.tier,
          violationCount,
          anomalyThreshold: this.ANOMALY_THRESHOLD,
          anomalyWindow: this.ANOMALY_WINDOW,
          recentPath: violation.path,
          recentMethod: violation.method,
        },
        ipAddress: ip,
        userAgent: violation.userAgent,
        dataClassification: DataClassification.INTERNAL,
      },
    );

    this.logger.error(
      `SECURITY ALERT: Potential API abuse detected from IP=${ip} - ${violationCount} violations in ${this.ANOMALY_WINDOW / 1000}s`,
    );
  }
}
