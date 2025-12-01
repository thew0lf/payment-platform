import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { DeliveryService } from './delivery.service';
import { AutomationService } from './automation.service';
import {
  DeliveryChannel,
  DeliveryStatus,
  DeliveryPriority,
  ScheduleType,
  AutomationTriggerType,
} from '../types/delivery.types';

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

class SendMessageDto {
  companyId: string;
  customerId: string;
  channel: DeliveryChannel;
  templateId?: string;
  subject?: string;
  body: string;
  bodyHtml?: string;
  priority?: DeliveryPriority;
  scheduleType?: ScheduleType;
  scheduledFor?: Date;
  category: string;
  tags?: string[];
}

class SendBulkMessagesDto {
  messages: SendMessageDto[];
}

class TrackEventDto {
  messageId: string;
  event:
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'converted'
    | 'bounced'
    | 'complained'
    | 'unsubscribed';
  metadata?: Record<string, unknown>;
}

class CreateAutomationDto {
  companyId: string;
  name: string;
  description?: string;
  category: string;
  trigger: {
    type: AutomationTriggerType;
    conditions?: Array<{
      field: string;
      operator: string;
      value: unknown;
    }>;
  };
  steps: Array<{
    order: number;
    type: string;
    config: Record<string, unknown>;
    nextSteps?: Array<{
      condition: string;
      nextStepId: string;
    }>;
  }>;
  settings?: {
    allowReentry?: boolean;
    reentryDelay?: number;
    exitOnConversion?: boolean;
    maxEnrollmentsPerDay?: number;
    respectQuietHours?: boolean;
  };
}

class UpdateAutomationDto {
  name?: string;
  description?: string;
  category?: string;
  trigger?: CreateAutomationDto['trigger'];
  steps?: CreateAutomationDto['steps'];
  settings?: CreateAutomationDto['settings'];
}

class EnrollCustomerDto {
  automationId: string;
  customerId: string;
  triggerData?: Record<string, unknown>;
}

class UpdateConfigDto {
  channelPriority?: DeliveryChannel[];
  defaultChannel?: DeliveryChannel;
  sendTimeOptimization?: {
    enabled: boolean;
    defaultSendHour: number;
    respectTimezone: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  };
  globalRateLimits?: {
    maxMessagesPerCustomerPerDay: number;
    maxMessagesPerCustomerPerWeek: number;
    channelLimits: Record<DeliveryChannel, number>;
  };
  honorUnsubscribes?: boolean;
  doubleOptIn?: boolean;
  trackOpens?: boolean;
  trackClicks?: boolean;
  trackConversions?: boolean;
  retrySettings?: {
    maxRetries: number;
    retryDelayMinutes: number;
    exponentialBackoff: boolean;
  };
}

@ApiTags('Delivery')
@ApiBearerAuth()
@Controller('momentum/delivery')
@UseGuards(JwtAuthGuard)
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly automationService: AutomationService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Verify user has access to a specific company
   */
  private async verifyCompanyAccess(user: AuthenticatedUser, companyId: string): Promise<void> {
    const hasAccess = await this.hierarchyService.canAccessCompany(
      {
        sub: user.id,
        scopeType: user.scopeType as any,
        scopeId: user.scopeId,
        organizationId: user.organizationId,
        clientId: user.clientId,
        companyId: user.companyId,
      },
      companyId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this company');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MESSAGE SENDING
  // ═══════════════════════════════════════════════════════════════

  @Post('messages')
  @ApiOperation({ summary: 'Send a message to a customer' })
  @ApiResponse({ status: 201, description: 'Message sent/queued successfully' })
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifyCompanyAccess(user, dto.companyId);
    return this.deliveryService.sendMessage(dto);
  }

  @Post('messages/bulk')
  @ApiOperation({ summary: 'Send multiple messages in bulk' })
  @ApiResponse({ status: 201, description: 'Bulk messages processed' })
  async sendBulkMessages(
    @Body() dto: SendBulkMessagesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Verify access to all companies in the bulk request
    const companyIds = [...new Set(dto.messages.map((m) => m.companyId))];
    for (const companyId of companyIds) {
      await this.verifyCompanyAccess(user, companyId);
    }
    return this.deliveryService.sendBulkMessages(dto.messages);
  }

  @Get('messages/:messageId')
  @ApiOperation({ summary: 'Get message details' })
  @ApiResponse({ status: 200, description: 'Message details returned' })
  async getMessage(@Param('messageId') messageId: string) {
    return this.deliveryService.getMessage(messageId);
  }

  @Get('messages/customer/:companyId/:customerId')
  @ApiOperation({ summary: 'Get messages for a customer' })
  @ApiQuery({ name: 'channel', required: false, enum: DeliveryChannel })
  @ApiQuery({ name: 'status', required: false, enum: DeliveryStatus })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Customer messages returned' })
  async getMessagesByCustomer(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
    @Query('channel') channel?: DeliveryChannel,
    @Query('status') status?: DeliveryStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (user) await this.verifyCompanyAccess(user, companyId);
    return this.deliveryService.getMessagesByCustomer(companyId, customerId, {
      channel,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('messages/category/:companyId/:category')
  @ApiOperation({ summary: 'Get messages by category' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Category messages returned' })
  async getMessagesByCategory(
    @Param('companyId') companyId: string,
    @Param('category') category: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (user) await this.verifyCompanyAccess(user, companyId);
    return this.deliveryService.getMessagesByCategory(companyId, category, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT TRACKING
  // ═══════════════════════════════════════════════════════════════

  @Post('track')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track a message event (delivered, opened, etc.)' })
  @ApiResponse({ status: 200, description: 'Event tracked' })
  async trackEvent(@Body() dto: TrackEventDto) {
    await this.deliveryService.trackEvent(dto);
    return { success: true };
  }

  // Webhook endpoints for providers
  @Post('webhooks/email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook for email provider events' })
  async handleEmailWebhook(@Body() payload: any) {
    // Handle SES/SendGrid webhooks
    const messageId = payload.trackingId || payload.messageId;
    const event = this.mapProviderEvent(payload);

    if (messageId && event) {
      await this.deliveryService.trackEvent({
        messageId,
        event,
        metadata: payload,
      });
    }

    return { received: true };
  }

  @Post('webhooks/sms')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook for SMS provider events' })
  async handleSmsWebhook(@Body() payload: any) {
    // Handle Twilio webhooks
    const messageId = payload.trackingId;
    const event = this.mapTwilioStatus(payload.MessageStatus);

    if (messageId && event) {
      await this.deliveryService.trackEvent({
        messageId,
        event,
        metadata: payload,
      });
    }

    return { received: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  @Get('analytics/:companyId')
  @ApiOperation({ summary: 'Get delivery metrics' })
  @ApiQuery({ name: 'channel', required: false, enum: DeliveryChannel })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Delivery metrics returned' })
  async getDeliveryMetrics(
    @Param('companyId') companyId: string,
    @Query('channel') channel?: DeliveryChannel,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (user) await this.verifyCompanyAccess(user, companyId);
    return this.deliveryService.getDeliveryMetrics(companyId, {
      channel,
      category,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('analytics/:companyId/channels')
  @ApiOperation({ summary: 'Get channel performance comparison' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Channel performance returned' })
  async getChannelPerformance(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (user) await this.verifyCompanyAccess(user, companyId);
    return this.deliveryService.getChannelPerformance(
      companyId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTOMATION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  @Post('automations')
  @ApiOperation({ summary: 'Create a new automation' })
  @ApiResponse({ status: 201, description: 'Automation created' })
  async createAutomation(
    @Body() dto: CreateAutomationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifyCompanyAccess(user, dto.companyId);
    return this.automationService.createAutomation(dto as any);
  }

  @Get('automations/:companyId')
  @ApiOperation({ summary: 'List automations for a company' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'Automations returned' })
  async getAutomations(
    @Param('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (user) await this.verifyCompanyAccess(user, companyId);
    return this.automationService.getAutomations(companyId, { status, category });
  }

  @Get('automations/detail/:automationId')
  @ApiOperation({ summary: 'Get automation details' })
  @ApiResponse({ status: 200, description: 'Automation details returned' })
  async getAutomation(@Param('automationId') automationId: string) {
    return this.automationService.getAutomation(automationId);
  }

  @Put('automations/:automationId')
  @ApiOperation({ summary: 'Update an automation' })
  @ApiResponse({ status: 200, description: 'Automation updated' })
  async updateAutomation(
    @Param('automationId') automationId: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.automationService.updateAutomation(automationId, dto as any);
  }

  @Post('automations/:automationId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate an automation' })
  @ApiResponse({ status: 200, description: 'Automation activated' })
  async activateAutomation(@Param('automationId') automationId: string) {
    return this.automationService.activateAutomation(automationId);
  }

  @Post('automations/:automationId/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause an automation' })
  @ApiResponse({ status: 200, description: 'Automation paused' })
  async pauseAutomation(@Param('automationId') automationId: string) {
    return this.automationService.pauseAutomation(automationId);
  }

  @Delete('automations/:automationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive an automation' })
  @ApiResponse({ status: 204, description: 'Automation archived' })
  async archiveAutomation(@Param('automationId') automationId: string) {
    await this.automationService.archiveAutomation(automationId);
  }

  @Get('automations/:automationId/stats')
  @ApiOperation({ summary: 'Get automation statistics' })
  @ApiResponse({ status: 200, description: 'Automation stats returned' })
  async getAutomationStats(@Param('automationId') automationId: string) {
    return this.automationService.getAutomationStats(automationId);
  }

  // ═══════════════════════════════════════════════════════════════
  // ENROLLMENT
  // ═══════════════════════════════════════════════════════════════

  @Post('enrollments')
  @ApiOperation({ summary: 'Enroll a customer in an automation' })
  @ApiResponse({ status: 201, description: 'Customer enrolled' })
  async enrollCustomer(@Body() dto: EnrollCustomerDto) {
    return this.automationService.enrollCustomer(dto);
  }

  @Get('enrollments/:enrollmentId')
  @ApiOperation({ summary: 'Get enrollment details' })
  @ApiResponse({ status: 200, description: 'Enrollment details returned' })
  async getEnrollment(@Param('enrollmentId') enrollmentId: string) {
    return this.automationService.getEnrollment(enrollmentId);
  }

  @Get('enrollments/customer/:customerId')
  @ApiOperation({ summary: 'Get all enrollments for a customer' })
  @ApiResponse({ status: 200, description: 'Customer enrollments returned' })
  async getCustomerEnrollments(@Param('customerId') customerId: string) {
    return this.automationService.getCustomerEnrollments(customerId);
  }

  @Post('enrollments/:enrollmentId/exit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exit a customer from an automation' })
  @ApiResponse({ status: 200, description: 'Enrollment exited' })
  async exitEnrollment(
    @Param('enrollmentId') enrollmentId: string,
    @Body('reason') reason: string,
  ) {
    await this.automationService.exitEnrollment(enrollmentId, reason);
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════

  @Get('config/:companyId')
  @ApiOperation({ summary: 'Get delivery configuration' })
  @ApiResponse({ status: 200, description: 'Configuration returned' })
  async getConfig(
    @Param('companyId') companyId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (user) await this.verifyCompanyAccess(user, companyId);
    return this.deliveryService.getConfig(companyId);
  }

  @Put('config/:companyId')
  @ApiOperation({ summary: 'Update delivery configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.verifyCompanyAccess(user, companyId);
    return this.deliveryService.updateConfig(companyId, dto as any);
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private mapProviderEvent(
    payload: any,
  ): TrackEventDto['event'] | null {
    // Map SES/SendGrid events to our event types
    const eventType =
      payload.eventType || payload.event || payload.notificationType;

    const mapping: Record<string, TrackEventDto['event']> = {
      Delivery: 'delivered',
      delivery: 'delivered',
      Open: 'opened',
      open: 'opened',
      Click: 'clicked',
      click: 'clicked',
      Bounce: 'bounced',
      bounce: 'bounced',
      Complaint: 'complained',
      spamreport: 'complained',
      Unsubscribe: 'unsubscribed',
      unsubscribe: 'unsubscribed',
    };

    return mapping[eventType] || null;
  }

  private mapTwilioStatus(
    status: string,
  ): TrackEventDto['event'] | null {
    const mapping: Record<string, TrackEventDto['event']> = {
      delivered: 'delivered',
      undelivered: 'bounced',
      failed: 'bounced',
    };

    return mapping[status] || null;
  }
}
