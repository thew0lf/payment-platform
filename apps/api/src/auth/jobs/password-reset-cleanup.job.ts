import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthService } from '../auth.service';

/**
 * Password Reset Token Cleanup Job
 * SOC2 CC6.1: Ensures expired tokens are removed
 * 
 * Runs every hour to clean up expired and used password reset tokens
 */
@Injectable()
export class PasswordResetCleanupJob {
  private readonly logger = new Logger(PasswordResetCleanupJob.name);
  private isRunning = false;

  constructor(private readonly authService: AuthService) {}

  /**
   * Run token cleanup every hour
   * Removes expired and used password reset tokens
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleTokenCleanup(): Promise<void> {
    // Prevent concurrent runs
    if (this.isRunning) {
      this.logger.warn('Token cleanup already running, skipping...');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting password reset token cleanup...');

    try {
      const count = await this.authService.cleanupExpiredTokens();
      
      if (count > 0) {
        this.logger.log(`Token cleanup completed: ${count} tokens removed`);
      } else {
        this.logger.debug('Token cleanup completed: No expired tokens to remove');
      }
    } catch (error) {
      this.logger.error('Token cleanup failed:', error);
    } finally {
      this.isRunning = false;
    }
  }
}
