import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';

/**
 * Token blacklist service with Redis support.
 * Falls back to in-memory storage if Redis is not available.
 *
 * SOC2 CC6.1: Access control - revoked tokens are checked
 * PCI-DSS 8.1.8: Token invalidation on logout
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly PREFIX = 'token:blacklist:';
  private readonly USER_PREFIX = 'user:invalidation:';

  // In-memory fallback for development
  private readonly inMemoryBlacklist = new Map<string, number>();
  private readonly inMemoryUserInvalidations = new Map<string, number>();

  constructor(
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {
    if (this.redis) {
      this.logger.log('Using Redis for token blacklist (distributed, persistent)');
    } else {
      this.logger.warn('Redis not available - using in-memory token blacklist (not persistent, not distributed)');
    }
  }

  /**
   * Add a token to the blacklist
   */
  async blacklistToken(token: string, expiresAt: Date): Promise<void> {
    const ttlSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

    if (this.redis) {
      try {
        await this.redis.setex(`${this.PREFIX}${token}`, ttlSeconds, '1');
        this.logger.debug(`Token blacklisted in Redis until ${expiresAt.toISOString()}`);
      } catch (error) {
        this.logger.error(`Failed to blacklist token in Redis: ${error.message}`);
        // Fallback to in-memory
        this.inMemoryBlacklist.set(token, expiresAt.getTime());
      }
    } else {
      this.inMemoryBlacklist.set(token, expiresAt.getTime());
      this.logger.debug(`Token blacklisted in memory until ${expiresAt.toISOString()}`);
    }
  }

  /**
   * Check if a token is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    if (this.redis) {
      try {
        const exists = await this.redis.exists(`${this.PREFIX}${token}`);
        return exists === 1;
      } catch (error) {
        this.logger.error(`Failed to check blacklist in Redis: ${error.message}`);
        // Fallback to in-memory check
        return this.checkInMemory(token);
      }
    }

    return this.checkInMemory(token);
  }

  private checkInMemory(token: string): boolean {
    const expiry = this.inMemoryBlacklist.get(token);
    if (!expiry) {
      return false;
    }

    // If token has expired from blacklist, remove it
    if (Date.now() > expiry) {
      this.inMemoryBlacklist.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Blacklist all tokens for a user (on password change, etc.)
   */
  async invalidateAllUserTokens(userId: string): Promise<void> {
    const timestamp = Date.now();

    if (this.redis) {
      try {
        // Store invalidation timestamp with 30-day TTL (covers max token lifetime)
        await this.redis.setex(`${this.USER_PREFIX}${userId}`, 30 * 24 * 60 * 60, timestamp.toString());
        this.logger.log(`All tokens invalidated for user ${userId} in Redis`);
      } catch (error) {
        this.logger.error(`Failed to invalidate user tokens in Redis: ${error.message}`);
        this.inMemoryUserInvalidations.set(userId, timestamp);
      }
    } else {
      this.inMemoryUserInvalidations.set(userId, timestamp);
      this.logger.log(`All tokens invalidated for user ${userId} in memory`);
    }
  }

  /**
   * Check if a user's token was issued before invalidation
   */
  async isUserTokenInvalidated(userId: string, tokenIssuedAt: number): Promise<boolean> {
    if (this.redis) {
      try {
        const invalidationTime = await this.redis.get(`${this.USER_PREFIX}${userId}`);
        if (!invalidationTime) {
          return false;
        }
        return tokenIssuedAt < parseInt(invalidationTime, 10);
      } catch (error) {
        this.logger.error(`Failed to check user invalidation in Redis: ${error.message}`);
        return this.checkInMemoryUserInvalidation(userId, tokenIssuedAt);
      }
    }

    return this.checkInMemoryUserInvalidation(userId, tokenIssuedAt);
  }

  private checkInMemoryUserInvalidation(userId: string, tokenIssuedAt: number): boolean {
    const invalidationTime = this.inMemoryUserInvalidations.get(userId);
    if (!invalidationTime) {
      return false;
    }
    return tokenIssuedAt < invalidationTime;
  }

  /**
   * Clean up expired entries every hour (only for in-memory fallback)
   */
  @Cron(CronExpression.EVERY_HOUR)
  handleCleanup() {
    // Only clean in-memory storage; Redis handles TTL automatically
    if (!this.redis) {
      const now = Date.now();
      let cleaned = 0;

      for (const [token, expiry] of this.inMemoryBlacklist.entries()) {
        if (now > expiry) {
          this.inMemoryBlacklist.delete(token);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.log(`Cleaned up ${cleaned} expired blacklist entries from memory`);
      }
    }
  }

  /**
   * Get blacklist stats for monitoring
   */
  async getStats(): Promise<{
    storage: 'redis' | 'memory';
    blacklistedTokens: number;
    invalidatedUsers: number;
    redisConnected: boolean;
  }> {
    if (this.redis) {
      try {
        // Check Redis connectivity
        await this.redis.ping();

        // Count blacklisted tokens (approximate)
        const tokenKeys = await this.redis.keys(`${this.PREFIX}*`);
        const userKeys = await this.redis.keys(`${this.USER_PREFIX}*`);

        return {
          storage: 'redis',
          blacklistedTokens: tokenKeys.length,
          invalidatedUsers: userKeys.length,
          redisConnected: true,
        };
      } catch (error) {
        this.logger.error(`Failed to get Redis stats: ${error.message}`);
        return {
          storage: 'redis',
          blacklistedTokens: this.inMemoryBlacklist.size,
          invalidatedUsers: this.inMemoryUserInvalidations.size,
          redisConnected: false,
        };
      }
    }

    return {
      storage: 'memory',
      blacklistedTokens: this.inMemoryBlacklist.size,
      invalidatedUsers: this.inMemoryUserInvalidations.size,
      redisConnected: false,
    };
  }

  /**
   * Health check for monitoring
   */
  async isHealthy(): Promise<boolean> {
    if (!this.redis) {
      return true; // In-memory is always "healthy"
    }

    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }
}
