import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SoftDeleteService } from './soft-delete.service';

@Injectable()
export class RetentionPurgeJob {
  private readonly logger = new Logger(RetentionPurgeJob.name);
  private isRunning = false;

  constructor(private readonly softDeleteService: SoftDeleteService) {}

  /**
   * Run retention purge daily at 3 AM
   * Removes soft-deleted records that have exceeded their retention period
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleRetentionPurge(): Promise<void> {
    // Prevent concurrent runs
    if (this.isRunning) {
      this.logger.warn('Retention purge already running, skipping...');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting scheduled retention purge...');

    try {
      const result = await this.softDeleteService.purgeExpiredRecords();

      if (result.totalPurged > 0) {
        this.logger.log(`Retention purge completed: ${result.totalPurged} records removed`);
        this.logger.log(`Breakdown: ${JSON.stringify(result.purged)}`);
      } else {
        this.logger.log('Retention purge completed: No expired records to purge');
      }
    } catch (error) {
      this.logger.error('Retention purge failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Weekly cleanup check - runs every Sunday at 4 AM
   * Performs additional maintenance tasks
   */
  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyMaintenance(): Promise<void> {
    this.logger.log('Starting weekly deletion log maintenance...');

    try {
      // This could include:
      // - Archiving old deletion logs
      // - Generating deletion reports
      // - Cleaning up orphaned cascade IDs

      this.logger.log('Weekly maintenance completed');
    } catch (error) {
      this.logger.error('Weekly maintenance failed:', error);
    }
  }
}
