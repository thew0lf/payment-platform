import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OAuthService } from './oauth.service';
import { OAuthTokenStatus } from '@prisma/client';

@Injectable()
export class OAuthTokenRefreshService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OAuthTokenRefreshService.name);
  private refreshInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Refresh tokens 10 minutes before expiration
  private readonly refreshBufferMinutes = 10;
  // Run refresh check every 5 minutes
  private readonly refreshCheckIntervalMs = 5 * 60 * 1000;
  // Run state cleanup every hour
  private readonly cleanupIntervalMs = 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly oauthService: OAuthService,
  ) {}

  onModuleInit() {
    // Only start scheduler if not in test environment
    if (this.configService.get<string>('NODE_ENV') !== 'test') {
      this.startScheduler();
    }
  }

  onModuleDestroy() {
    this.stopScheduler();
  }

  /**
   * Start the token refresh scheduler
   */
  startScheduler(): void {
    this.logger.log('Starting OAuth token refresh scheduler');

    // Start token refresh interval
    this.refreshInterval = setInterval(
      () => this.refreshExpiringTokens(),
      this.refreshCheckIntervalMs,
    );

    // Start state cleanup interval
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredStates(),
      this.cleanupIntervalMs,
    );

    // Run initial check
    this.refreshExpiringTokens();
    this.cleanupExpiredStates();
  }

  /**
   * Stop the token refresh scheduler
   */
  stopScheduler(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.logger.log('OAuth token refresh scheduler stopped');
  }

  /**
   * Refresh tokens that are about to expire
   */
  async refreshExpiringTokens(): Promise<void> {
    const bufferTime = new Date(Date.now() + this.refreshBufferMinutes * 60 * 1000);

    try {
      // Find tokens that are about to expire and have a refresh token
      const expiringTokens = await this.prisma.oAuthToken.findMany({
        where: {
          status: OAuthTokenStatus.ACTIVE,
          refreshToken: { not: null },
          expiresAt: {
            not: null,
            lt: bufferTime,
          },
        },
        select: {
          id: true,
          platformIntegrationId: true,
          clientIntegrationId: true,
          expiresAt: true,
        },
      });

      if (expiringTokens.length === 0) {
        return;
      }

      this.logger.log(`Found ${expiringTokens.length} tokens to refresh`);

      // Refresh each token
      for (const token of expiringTokens) {
        try {
          await this.oauthService.refreshAccessToken(token.id);
          this.logger.log(`Successfully refreshed token ${token.id}`);
        } catch (error) {
          this.logger.error(`Failed to refresh token ${token.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error in token refresh cycle: ${error.message}`);
    }
  }

  /**
   * Clean up expired OAuth states
   */
  async cleanupExpiredStates(): Promise<void> {
    try {
      const count = await this.oauthService.cleanupExpiredStates();
      if (count > 0) {
        this.logger.log(`Cleaned up ${count} expired OAuth states`);
      }
    } catch (error) {
      this.logger.error(`Error cleaning up expired states: ${error.message}`);
    }
  }

  /**
   * Get statistics about OAuth tokens
   */
  async getTokenStats(): Promise<{
    active: number;
    expired: number;
    refreshFailed: number;
    revoked: number;
    expiringWithin24Hours: number;
  }> {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [active, expired, refreshFailed, revoked, expiringSoon] = await Promise.all([
      this.prisma.oAuthToken.count({ where: { status: OAuthTokenStatus.ACTIVE } }),
      this.prisma.oAuthToken.count({ where: { status: OAuthTokenStatus.EXPIRED } }),
      this.prisma.oAuthToken.count({ where: { status: OAuthTokenStatus.REFRESH_FAILED } }),
      this.prisma.oAuthToken.count({ where: { status: OAuthTokenStatus.REVOKED } }),
      this.prisma.oAuthToken.count({
        where: {
          status: OAuthTokenStatus.ACTIVE,
          expiresAt: { not: null, lt: tomorrow },
        },
      }),
    ]);

    return {
      active,
      expired,
      refreshFailed,
      revoked,
      expiringWithin24Hours: expiringSoon,
    };
  }

  /**
   * Manually trigger a refresh for a specific integration
   */
  async forceRefresh(params: {
    platformIntegrationId?: string;
    clientIntegrationId?: string;
  }): Promise<string> {
    const token = await this.prisma.oAuthToken.findFirst({
      where: {
        OR: [
          { platformIntegrationId: params.platformIntegrationId },
          { clientIntegrationId: params.clientIntegrationId },
        ],
        status: OAuthTokenStatus.ACTIVE,
      },
    });

    if (!token) {
      throw new Error('No active token found for integration');
    }

    return this.oauthService.refreshAccessToken(token.id);
  }
}
