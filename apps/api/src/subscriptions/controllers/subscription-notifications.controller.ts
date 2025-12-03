/**
 * Subscription Notifications Controller
 *
 * Endpoints for notification management:
 * - Send notifications
 * - Manage templates
 * - Customer preferences
 * - Notification history
 * - Analytics
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Param,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  SubscriptionNotificationsService,
  NotificationType,
  NotificationChannel,
  Notification,
  NotificationTemplate,
  NotificationPreferences,
  NotificationStats,
} from '../services/subscription-notifications.service';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsDateString,
  IsNumber,
  IsArray,
} from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════════

class SendNotificationDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

class BulkNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

class UpsertTemplateDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  htmlBody?: string;

  @IsBoolean()
  isActive: boolean;

  @IsArray()
  @IsString({ each: true })
  variables: string[];
}

class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @IsOptional()
  @IsBoolean()
  billingNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  shippingNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  reminderNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  digestEnabled?: boolean;

  @IsOptional()
  @IsString()
  digestFrequency?: 'DAILY' | 'WEEKLY';
}

class ScheduleReminderDto {
  @IsOptional()
  @IsNumber()
  daysBefore?: number;
}

@Controller('subscriptions/notifications')
@UseGuards(AuthGuard('jwt'))
export class SubscriptionNotificationsController {
  private readonly logger = new Logger(SubscriptionNotificationsController.name);

  constructor(
    private readonly notificationsService: SubscriptionNotificationsService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // SEND NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Send a notification to a customer
   */
  @Post('send')
  async sendNotification(
    @Body() dto: SendNotificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Notification> {
    return this.notificationsService.sendNotification({
      customerId: dto.customerId,
      subscriptionId: dto.subscriptionId,
      type: dto.type,
      channel: dto.channel,
      data: dto.data,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
  }

  /**
   * Send bulk notification to subscribers
   */
  @Post('bulk')
  async sendBulkNotification(
    @Query('companyId') queryCompanyId: string,
    @Body() dto: BulkNotificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ sent: number; failed: number }> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.notificationsService.sendBulkNotification(
      companyId,
      dto.type,
      {
        status: dto.status,
        planId: dto.planId,
      },
      dto.data,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // NOTIFICATION HISTORY
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get notifications for a customer
   */
  @Get('customer/:customerId')
  async getCustomerNotifications(
    @Param('customerId') customerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: NotificationType,
    @Query('channel') channel?: NotificationChannel,
    @Query('limit') limit?: string,
  ): Promise<Notification[]> {
    return this.notificationsService.getNotifications(customerId, {
      type,
      channel,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Get notification by ID
   */
  @Get(':notificationId')
  async getNotification(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Notification | null> {
    return this.notificationsService.getNotification(notificationId);
  }

  /**
   * Mark notification as read
   */
  @Post(':notificationId/read')
  async markAsRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Notification | null> {
    return this.notificationsService.markAsRead(notificationId);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get all templates for company
   */
  @Get('templates')
  async getTemplates(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationTemplate[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.notificationsService.getTemplates(companyId);
  }

  /**
   * Get specific template
   */
  @Get('templates/:type/:channel')
  async getTemplate(
    @Param('type') type: NotificationType,
    @Param('channel') channel: NotificationChannel,
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationTemplate | null> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.notificationsService.getTemplate(companyId, type, channel);
  }

  /**
   * Create or update a template
   */
  @Post('templates')
  async upsertTemplate(
    @Query('companyId') queryCompanyId: string,
    @Body() dto: UpsertTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationTemplate> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.notificationsService.upsertTemplate(companyId, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PREFERENCES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get notification preferences for customer
   */
  @Get('preferences/:customerId')
  async getPreferences(
    @Param('customerId') customerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationPreferences> {
    return this.notificationsService.getPreferences(customerId);
  }

  /**
   * Update notification preferences
   */
  @Patch('preferences/:customerId')
  async updatePreferences(
    @Param('customerId') customerId: string,
    @Body() dto: UpdatePreferencesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationPreferences> {
    return this.notificationsService.updatePreferences(customerId, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SCHEDULED NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Schedule payment reminder for subscription
   */
  @Post('schedule/payment-reminder/:subscriptionId')
  async schedulePaymentReminder(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: ScheduleReminderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Notification | null> {
    return this.notificationsService.schedulePaymentReminder(
      subscriptionId,
      dto.daysBefore || 3,
    );
  }

  /**
   * Schedule trial ending notification
   */
  @Post('schedule/trial-ending/:subscriptionId')
  async scheduleTrialEndingNotification(
    @Param('subscriptionId') subscriptionId: string,
    @Body() dto: ScheduleReminderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Notification | null> {
    return this.notificationsService.scheduleTrialEndingNotification(
      subscriptionId,
      dto.daysBefore || 3,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get notification statistics
   */
  @Get('stats')
  async getStats(
    @Query('companyId') queryCompanyId: string,
    @Query('period') period: 'day' | 'week' | 'month',
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationStats> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.notificationsService.getStats(companyId, period || 'week');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string> {
    if (user.companyId) {
      return user.companyId;
    }

    if (!queryCompanyId) {
      throw new Error('companyId is required for organization/client users');
    }

    return queryCompanyId;
  }
}
