// Email Queue Controller - Queue status and management endpoints
// Organization-level access for queue monitoring and administration
import {
  Controller,
  Get,
  Post,
  UseGuards,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { EmailQueueService, QueueStatusReport } from '../services/email-queue.service';
import { EmailQueueProcessorService } from '../services/email-queue-processor.service';

@Controller('admin/email-queue')
@UseGuards(JwtAuthGuard)
export class EmailQueueController {
  private readonly logger = new Logger(EmailQueueController.name);

  constructor(
    private readonly emailQueueService: EmailQueueService,
    private readonly emailQueueProcessorService: EmailQueueProcessorService,
  ) {}

  /**
   * Get queue status and statistics
   * Organization admin only
   */
  @Get('status')
  async getQueueStatus(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QueueStatusReport> {
    // Only organization admins can view queue status
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization admins can view queue status');
    }

    this.logger.log(`Queue status requested by user ${user.id}`);
    return this.emailQueueService.getQueueStatus();
  }

  /**
   * Manually trigger queue processing (for testing/debugging)
   * Organization admin only
   */
  @Post('process-now')
  async processNow(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ processed: number }> {
    // Only organization admins can trigger processing
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization admins can trigger queue processing');
    }

    this.logger.warn(`Manual queue processing triggered by user ${user.id}`);
    const processed = await this.emailQueueProcessorService.processNow();

    return { processed };
  }

  /**
   * Purge the queue (emergency use only)
   * Organization admin only
   */
  @Post('purge')
  async purgeQueue(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    // Only organization admins can purge
    if (user.scopeType !== 'ORGANIZATION') {
      throw new ForbiddenException('Only organization admins can purge the queue');
    }

    this.logger.warn(`Queue purge initiated by user ${user.id}`);
    await this.emailQueueService.purgeQueue();

    return {
      success: true,
      message: 'Email queue has been purged. All pending emails have been removed.',
    };
  }
}
