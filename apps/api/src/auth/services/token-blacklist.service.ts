import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * In-memory token blacklist service.
 * In production, replace with Redis for distributed systems.
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly blacklist = new Map<string, number>(); // token -> expiry timestamp

  /**
   * Add a token to the blacklist
   */
  async blacklistToken(token: string, expiresAt: Date): Promise<void> {
    this.blacklist.set(token, expiresAt.getTime());
    this.logger.debug(`Token blacklisted until ${expiresAt.toISOString()}`);
  }

  /**
   * Check if a token is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const expiry = this.blacklist.get(token);
    if (!expiry) {
      return false;
    }

    // If token has expired from blacklist, remove it
    if (Date.now() > expiry) {
      this.blacklist.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Blacklist all tokens for a user (on password change, etc.)
   * In production, store user ID -> invalidation timestamp
   */
  private readonly userInvalidations = new Map<string, number>();

  async invalidateAllUserTokens(userId: string): Promise<void> {
    this.userInvalidations.set(userId, Date.now());
    this.logger.log(`All tokens invalidated for user ${userId}`);
  }

  async isUserTokenInvalidated(userId: string, tokenIssuedAt: number): Promise<boolean> {
    const invalidationTime = this.userInvalidations.get(userId);
    if (!invalidationTime) {
      return false;
    }
    return tokenIssuedAt < invalidationTime;
  }

  /**
   * Clean up expired entries every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  handleCleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, expiry] of this.blacklist.entries()) {
      if (now > expiry) {
        this.blacklist.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired blacklist entries`);
    }
  }

  /**
   * Get blacklist stats for monitoring
   */
  getStats() {
    return {
      blacklistedTokens: this.blacklist.size,
      invalidatedUsers: this.userInvalidations.size,
    };
  }
}
