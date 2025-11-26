import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DeliveryChannel,
  DeliveryStatus,
  DeliveryPriority,
  ScheduleType,
  DeliveryMessage,
  DeliveryConfig,
  SendMessageDto,
  TrackEventDto,
} from '../types/delivery.types';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { PushProvider } from './providers/push.provider';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly pushProvider: PushProvider,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // MESSAGE SENDING
  // ═══════════════════════════════════════════════════════════════

  async sendMessage(dto: SendMessageDto): Promise<DeliveryMessage> {
    this.logger.log(
      `Sending ${dto.channel} message to customer ${dto.customerId}`,
    );

    // Get customer contact info
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${dto.customerId} not found`);
    }

    // Get delivery config
    const deliveryConfig = await this.getConfig(dto.companyId);

    // Check rate limits
    const canSend = await this.checkRateLimits(
      dto.customerId,
      dto.channel,
      deliveryConfig,
    );
    if (!canSend.allowed) {
      throw new Error(`Rate limit exceeded: ${canSend.reason}`);
    }

    // Check unsubscribe status
    if (deliveryConfig.honorUnsubscribes) {
      const unsubscribed = await this.isUnsubscribed(
        dto.customerId,
        dto.channel,
      );
      if (unsubscribed) {
        throw new Error(`Customer unsubscribed from ${dto.channel}`);
      }
    }

    // Determine send time
    let scheduledFor = dto.scheduledFor;
    if (dto.scheduleType === ScheduleType.OPTIMAL) {
      scheduledFor = await this.calculateOptimalSendTime(
        dto.customerId,
        dto.channel,
        deliveryConfig,
      );
    }

    // Create message record
    const message = await this.prisma.deliveryMessage.create({
      data: {
        companyId: dto.companyId,
        customerId: dto.customerId,
        recipientEmail: customer.email,
        recipientPhone: customer.phone,
        channel: dto.channel,
        priority: dto.priority || DeliveryPriority.NORMAL,
        templateId: dto.templateId,
        subject: dto.subject,
        body: dto.body,
        bodyHtml: dto.bodyHtml,
        category: dto.category,
        tags: dto.tags || [],
        scheduleType: dto.scheduleType || ScheduleType.IMMEDIATE,
        scheduledFor,
        status: scheduledFor ? DeliveryStatus.QUEUED : DeliveryStatus.PENDING,
        statusHistory: [
          {
            status: DeliveryStatus.PENDING,
            timestamp: new Date(),
          },
        ] as any,
        opensCount: 0,
        clicksCount: 0,
        automationId: dto.automationId,
        automationStepId: dto.automationStepId,
      },
    });

    // Send immediately or queue
    if (!scheduledFor || scheduledFor <= new Date()) {
      await this.deliverMessage(message.id);
    }

    return this.mapToMessage(message);
  }

  async sendBulkMessages(
    messages: SendMessageDto[],
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    this.logger.log(`Sending bulk messages: ${messages.length} total`);

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const message of messages) {
      try {
        await this.sendMessage(message);
        sent++;
      } catch (error) {
        failed++;
        errors.push(
          `${message.customerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return { sent, failed, errors };
  }

  private async deliverMessage(messageId: string): Promise<void> {
    const message = await this.prisma.deliveryMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) return;

    try {
      await this.updateStatus(messageId, DeliveryStatus.SENDING);

      let providerMessageId: string;

      switch (message.channel) {
        case DeliveryChannel.EMAIL:
          providerMessageId = await this.emailProvider.send({
            to: message.recipientEmail!,
            subject: message.subject || '',
            body: message.body,
            bodyHtml: message.bodyHtml || undefined,
            trackingId: messageId,
          });
          break;

        case DeliveryChannel.SMS:
          providerMessageId = await this.smsProvider.send({
            to: message.recipientPhone!,
            body: message.body,
            trackingId: messageId,
          });
          break;

        case DeliveryChannel.PUSH_NOTIFICATION:
          providerMessageId = await this.pushProvider.send({
            tokens: message.recipientDeviceTokens || [],
            title: message.subject || '',
            body: message.body,
            data: { messageId },
          });
          break;

        default:
          throw new Error(`Unsupported channel: ${message.channel}`);
      }

      await this.prisma.deliveryMessage.update({
        where: { id: messageId },
        data: {
          status: DeliveryStatus.SENT,
          providerMessageId,
          sentAt: new Date(),
          statusHistory: {
            push: {
              status: DeliveryStatus.SENT,
              timestamp: new Date(),
            },
          },
        },
      });

      this.eventEmitter.emit('delivery.sent', {
        messageId,
        channel: message.channel,
        customerId: message.customerId,
        providerMessageId,
      });
    } catch (error) {
      this.logger.error(`Failed to deliver message ${messageId}`, error);

      await this.prisma.deliveryMessage.update({
        where: { id: messageId },
        data: {
          status: DeliveryStatus.FAILED,
          failedAt: new Date(),
          failureReason:
            error instanceof Error ? error.message : 'Unknown error',
          statusHistory: {
            push: {
              status: DeliveryStatus.FAILED,
              timestamp: new Date(),
              metadata: {
                error: error instanceof Error ? error.message : 'Unknown',
              },
            },
          },
        },
      });

      // Queue for retry if configured
      await this.queueRetry(messageId);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT TRACKING
  // ═══════════════════════════════════════════════════════════════

  async trackEvent(dto: TrackEventDto): Promise<void> {
    const message = await this.prisma.deliveryMessage.findUnique({
      where: { id: dto.messageId },
    });

    if (!message) return;

    const updates: any = {
      statusHistory: {
        push: {
          status: this.mapEventToStatus(dto.event),
          timestamp: new Date(),
          metadata: dto.metadata,
        },
      },
    };

    switch (dto.event) {
      case 'delivered':
        updates.status = DeliveryStatus.DELIVERED;
        updates.deliveredAt = new Date();
        break;
      case 'opened':
        updates.status = DeliveryStatus.OPENED;
        updates.openedAt = new Date();
        updates.opensCount = { increment: 1 };
        break;
      case 'clicked':
        updates.status = DeliveryStatus.CLICKED;
        updates.clickedAt = new Date();
        updates.clicksCount = { increment: 1 };
        if (dto.metadata?.link) {
          updates.clickedLinks = { push: dto.metadata.link };
        }
        break;
      case 'converted':
        updates.status = DeliveryStatus.CONVERTED;
        updates.convertedAt = new Date();
        break;
      case 'bounced':
        updates.status = DeliveryStatus.BOUNCED;
        break;
      case 'complained':
        updates.status = DeliveryStatus.COMPLAINED;
        break;
      case 'unsubscribed':
        updates.status = DeliveryStatus.UNSUBSCRIBED;
        await this.recordUnsubscribe(
          message.customerId,
          message.channel as DeliveryChannel,
        );
        break;
    }

    await this.prisma.deliveryMessage.update({
      where: { id: dto.messageId },
      data: updates,
    });

    this.eventEmitter.emit(`delivery.${dto.event}`, {
      messageId: dto.messageId,
      customerId: message.customerId,
      ...dto.metadata,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // MESSAGE RETRIEVAL
  // ═══════════════════════════════════════════════════════════════

  async getMessage(messageId: string): Promise<DeliveryMessage | null> {
    const message = await this.prisma.deliveryMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) return null;

    return this.mapToMessage(message);
  }

  async getMessagesByCustomer(
    companyId: string,
    customerId: string,
    options?: {
      channel?: DeliveryChannel;
      status?: DeliveryStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<DeliveryMessage[]> {
    const messages = await this.prisma.deliveryMessage.findMany({
      where: {
        companyId,
        customerId,
        ...(options?.channel && { channel: options.channel }),
        ...(options?.status && { status: options.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return messages.map((m) => this.mapToMessage(m));
  }

  async getMessagesByCategory(
    companyId: string,
    category: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<DeliveryMessage[]> {
    const messages = await this.prisma.deliveryMessage.findMany({
      where: {
        companyId,
        category,
        createdAt: {
          ...(options?.startDate && { gte: options.startDate }),
          ...(options?.endDate && { lte: options.endDate }),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 100,
    });

    return messages.map((m) => this.mapToMessage(m));
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  async getDeliveryMetrics(
    companyId: string,
    options?: {
      channel?: DeliveryChannel;
      category?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
    failed: number;
    bounced: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  }> {
    const where: any = {
      companyId,
      ...(options?.channel && { channel: options.channel }),
      ...(options?.category && { category: options.category }),
      createdAt: {
        ...(options?.startDate && { gte: options.startDate }),
        ...(options?.endDate && { lte: options.endDate }),
      },
    };

    const [
      total,
      sent,
      delivered,
      opened,
      clicked,
      converted,
      failed,
      bounced,
    ] = await Promise.all([
      this.prisma.deliveryMessage.count({ where }),
      this.prisma.deliveryMessage.count({
        where: { ...where, status: DeliveryStatus.SENT },
      }),
      this.prisma.deliveryMessage.count({
        where: {
          ...where,
          status: { in: [DeliveryStatus.DELIVERED, DeliveryStatus.OPENED, DeliveryStatus.CLICKED, DeliveryStatus.CONVERTED] },
        },
      }),
      this.prisma.deliveryMessage.count({
        where: { ...where, openedAt: { not: null } },
      }),
      this.prisma.deliveryMessage.count({
        where: { ...where, clickedAt: { not: null } },
      }),
      this.prisma.deliveryMessage.count({
        where: { ...where, convertedAt: { not: null } },
      }),
      this.prisma.deliveryMessage.count({
        where: { ...where, status: DeliveryStatus.FAILED },
      }),
      this.prisma.deliveryMessage.count({
        where: { ...where, status: DeliveryStatus.BOUNCED },
      }),
    ]);

    const sentTotal = sent + delivered + opened + clicked + converted;

    return {
      total,
      sent: sentTotal,
      delivered,
      opened,
      clicked,
      converted,
      failed,
      bounced,
      deliveryRate: sentTotal > 0 ? (delivered / sentTotal) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: opened > 0 ? (clicked / opened) * 100 : 0,
      conversionRate: clicked > 0 ? (converted / clicked) * 100 : 0,
    };
  }

  async getChannelPerformance(
    companyId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    Record<
      DeliveryChannel,
      {
        sent: number;
        delivered: number;
        deliveryRate: number;
        openRate: number;
        clickRate: number;
      }
    >
  > {
    const channels = Object.values(DeliveryChannel);
    const performance: any = {};

    for (const channel of channels) {
      const metrics = await this.getDeliveryMetrics(companyId, {
        channel,
        startDate,
        endDate,
      });

      performance[channel] = {
        sent: metrics.sent,
        delivered: metrics.delivered,
        deliveryRate: metrics.deliveryRate,
        openRate: metrics.openRate,
        clickRate: metrics.clickRate,
      };
    }

    return performance;
  }

  // ═══════════════════════════════════════════════════════════════
  // SCHEDULED PROCESSING
  // ═══════════════════════════════════════════════════════════════

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledMessages(): Promise<void> {
    const now = new Date();

    const messages = await this.prisma.deliveryMessage.findMany({
      where: {
        status: DeliveryStatus.QUEUED,
        scheduledFor: { lte: now },
      },
      take: 100,
    });

    for (const message of messages) {
      await this.deliverMessage(message.id);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processRetryQueue(): Promise<void> {
    const retries = await this.prisma.deliveryRetry.findMany({
      where: {
        nextRetryAt: { lte: new Date() },
        retriesRemaining: { gt: 0 },
      },
      take: 50,
    });

    for (const retry of retries) {
      await this.deliverMessage(retry.messageId);

      await this.prisma.deliveryRetry.update({
        where: { id: retry.id },
        data: {
          retriesRemaining: { decrement: 1 },
          lastRetryAt: new Date(),
          nextRetryAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════

  async getConfig(companyId: string): Promise<DeliveryConfig> {
    const config = await this.prisma.deliveryConfig.findUnique({
      where: { companyId },
    });

    if (config) {
      return {
        companyId: config.companyId,
        channelPriority: config.channelPriority as DeliveryChannel[],
        defaultChannel: config.defaultChannel as DeliveryChannel,
        sendTimeOptimization: config.sendTimeOptimization as any,
        globalRateLimits: config.globalRateLimits as any,
        honorUnsubscribes: config.honorUnsubscribes,
        doubleOptIn: config.doubleOptIn,
        trackOpens: config.trackOpens,
        trackClicks: config.trackClicks,
        trackConversions: config.trackConversions,
        retrySettings: config.retrySettings as any,
      };
    }

    return this.getDefaultConfig(companyId);
  }

  async updateConfig(
    companyId: string,
    updates: Partial<DeliveryConfig>,
  ): Promise<DeliveryConfig> {
    const existingConfig = await this.prisma.deliveryConfig.findUnique({
      where: { companyId },
    });

    if (existingConfig) {
      const updated = await this.prisma.deliveryConfig.update({
        where: { companyId },
        data: {
          ...(updates.channelPriority && {
            channelPriority: updates.channelPriority,
          }),
          ...(updates.defaultChannel && {
            defaultChannel: updates.defaultChannel,
          }),
          ...(updates.sendTimeOptimization && {
            sendTimeOptimization: updates.sendTimeOptimization as any,
          }),
          ...(updates.globalRateLimits && {
            globalRateLimits: updates.globalRateLimits as any,
          }),
          ...(updates.honorUnsubscribes !== undefined && {
            honorUnsubscribes: updates.honorUnsubscribes,
          }),
          ...(updates.doubleOptIn !== undefined && {
            doubleOptIn: updates.doubleOptIn,
          }),
          ...(updates.trackOpens !== undefined && {
            trackOpens: updates.trackOpens,
          }),
          ...(updates.trackClicks !== undefined && {
            trackClicks: updates.trackClicks,
          }),
          ...(updates.trackConversions !== undefined && {
            trackConversions: updates.trackConversions,
          }),
          ...(updates.retrySettings && {
            retrySettings: updates.retrySettings as any,
          }),
        },
      });

      return this.getConfig(updated.companyId);
    }

    // Create new config
    const defaultConfig = this.getDefaultConfig(companyId);
    const mergedConfig = { ...defaultConfig, ...updates };

    await this.prisma.deliveryConfig.create({
      data: {
        companyId,
        channelPriority: mergedConfig.channelPriority,
        defaultChannel: mergedConfig.defaultChannel,
        sendTimeOptimization: mergedConfig.sendTimeOptimization as any,
        globalRateLimits: mergedConfig.globalRateLimits as any,
        honorUnsubscribes: mergedConfig.honorUnsubscribes,
        doubleOptIn: mergedConfig.doubleOptIn,
        trackOpens: mergedConfig.trackOpens,
        trackClicks: mergedConfig.trackClicks,
        trackConversions: mergedConfig.trackConversions,
        retrySettings: mergedConfig.retrySettings as any,
      },
    });

    return mergedConfig;
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async checkRateLimits(
    customerId: string,
    channel: DeliveryChannel,
    config: DeliveryConfig,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Daily limit
    const dailyCount = await this.prisma.deliveryMessage.count({
      where: {
        customerId,
        createdAt: { gte: dayAgo },
        status: { in: [DeliveryStatus.SENT, DeliveryStatus.DELIVERED] },
      },
    });

    if (dailyCount >= config.globalRateLimits.maxMessagesPerCustomerPerDay) {
      return { allowed: false, reason: 'Daily limit reached' };
    }

    // Weekly limit
    const weeklyCount = await this.prisma.deliveryMessage.count({
      where: {
        customerId,
        createdAt: { gte: weekAgo },
        status: { in: [DeliveryStatus.SENT, DeliveryStatus.DELIVERED] },
      },
    });

    if (weeklyCount >= config.globalRateLimits.maxMessagesPerCustomerPerWeek) {
      return { allowed: false, reason: 'Weekly limit reached' };
    }

    // Channel-specific limit
    const channelDailyCount = await this.prisma.deliveryMessage.count({
      where: {
        customerId,
        channel,
        createdAt: { gte: dayAgo },
        status: { in: [DeliveryStatus.SENT, DeliveryStatus.DELIVERED] },
      },
    });

    const channelLimit = config.globalRateLimits.channelLimits[channel];
    if (channelLimit && channelDailyCount >= channelLimit) {
      return { allowed: false, reason: `${channel} daily limit reached` };
    }

    return { allowed: true };
  }

  private async isUnsubscribed(
    customerId: string,
    channel: DeliveryChannel,
  ): Promise<boolean> {
    const pref = await this.prisma.customerPreference.findFirst({
      where: {
        customerId,
        channel,
        unsubscribed: true,
      },
    });
    return !!pref;
  }

  private async recordUnsubscribe(
    customerId: string,
    channel: DeliveryChannel,
  ): Promise<void> {
    await this.prisma.customerPreference.upsert({
      where: {
        customerId_channel: { customerId, channel },
      },
      update: { unsubscribed: true, unsubscribedAt: new Date() },
      create: {
        customerId,
        channel,
        unsubscribed: true,
        unsubscribedAt: new Date(),
      },
    });
  }

  private async calculateOptimalSendTime(
    customerId: string,
    channel: DeliveryChannel,
    config: DeliveryConfig,
  ): Promise<Date> {
    // Get customer's engagement history
    const recentMessages = await this.prisma.deliveryMessage.findMany({
      where: {
        customerId,
        channel,
        status: DeliveryStatus.OPENED,
      },
      orderBy: { openedAt: 'desc' },
      take: 10,
    });

    if (recentMessages.length > 0) {
      // Calculate average open hour
      const openHours = recentMessages
        .filter((m) => m.openedAt)
        .map((m) => m.openedAt!.getHours());

      if (openHours.length > 0) {
        const avgHour = Math.round(
          openHours.reduce((a, b) => a + b, 0) / openHours.length,
        );
        const sendTime = new Date();
        sendTime.setHours(avgHour, 0, 0, 0);

        // If time has passed today, schedule for tomorrow
        if (sendTime < new Date()) {
          sendTime.setDate(sendTime.getDate() + 1);
        }

        // Check quiet hours
        if (config.sendTimeOptimization.quietHoursEnabled) {
          const adjustedTime = this.adjustForQuietHours(
            sendTime,
            config.sendTimeOptimization.quietHoursStart,
            config.sendTimeOptimization.quietHoursEnd,
          );
          return adjustedTime;
        }

        return sendTime;
      }
    }

    // Default to configured hour
    const sendTime = new Date();
    sendTime.setHours(config.sendTimeOptimization.defaultSendHour, 0, 0, 0);

    if (sendTime < new Date()) {
      sendTime.setDate(sendTime.getDate() + 1);
    }

    return sendTime;
  }

  private adjustForQuietHours(
    sendTime: Date,
    quietStart: string,
    quietEnd: string,
  ): Date {
    const [startHour] = quietStart.split(':').map(Number);
    const [endHour] = quietEnd.split(':').map(Number);
    const sendHour = sendTime.getHours();

    // Check if sendTime is in quiet hours
    if (startHour > endHour) {
      // Quiet hours span midnight (e.g., 21:00 - 08:00)
      if (sendHour >= startHour || sendHour < endHour) {
        sendTime.setHours(endHour, 0, 0, 0);
        if (sendHour >= startHour) {
          sendTime.setDate(sendTime.getDate() + 1);
        }
      }
    } else {
      // Quiet hours are within same day (e.g., 02:00 - 06:00)
      if (sendHour >= startHour && sendHour < endHour) {
        sendTime.setHours(endHour, 0, 0, 0);
      }
    }

    return sendTime;
  }

  private async queueRetry(messageId: string): Promise<void> {
    const message = await this.prisma.deliveryMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) return;

    const config = await this.getConfig(message.companyId);

    await this.prisma.deliveryRetry.create({
      data: {
        messageId,
        retriesRemaining: config.retrySettings.maxRetries,
        nextRetryAt: new Date(
          Date.now() + config.retrySettings.retryDelayMinutes * 60 * 1000,
        ),
      },
    });
  }

  private async updateStatus(
    messageId: string,
    status: DeliveryStatus,
  ): Promise<void> {
    await this.prisma.deliveryMessage.update({
      where: { id: messageId },
      data: {
        status,
        statusHistory: {
          push: { status, timestamp: new Date() },
        },
      },
    });
  }

  private mapEventToStatus(event: string): DeliveryStatus {
    const mapping: Record<string, DeliveryStatus> = {
      delivered: DeliveryStatus.DELIVERED,
      opened: DeliveryStatus.OPENED,
      clicked: DeliveryStatus.CLICKED,
      converted: DeliveryStatus.CONVERTED,
      bounced: DeliveryStatus.BOUNCED,
      complained: DeliveryStatus.COMPLAINED,
      unsubscribed: DeliveryStatus.UNSUBSCRIBED,
    };
    return mapping[event] || DeliveryStatus.SENT;
  }

  private getDefaultConfig(companyId: string): DeliveryConfig {
    return {
      companyId,
      channelPriority: [
        DeliveryChannel.EMAIL,
        DeliveryChannel.SMS,
        DeliveryChannel.PUSH_NOTIFICATION,
      ],
      defaultChannel: DeliveryChannel.EMAIL,
      sendTimeOptimization: {
        enabled: true,
        defaultSendHour: 10,
        respectTimezone: true,
        quietHoursEnabled: true,
        quietHoursStart: '21:00',
        quietHoursEnd: '08:00',
      },
      globalRateLimits: {
        maxMessagesPerCustomerPerDay: 5,
        maxMessagesPerCustomerPerWeek: 15,
        channelLimits: {
          [DeliveryChannel.EMAIL]: 3,
          [DeliveryChannel.SMS]: 2,
          [DeliveryChannel.PUSH_NOTIFICATION]: 5,
          [DeliveryChannel.IN_APP]: 10,
          [DeliveryChannel.VOICE]: 1,
          [DeliveryChannel.WEBHOOK]: 100,
        },
      },
      honorUnsubscribes: true,
      doubleOptIn: false,
      trackOpens: true,
      trackClicks: true,
      trackConversions: true,
      retrySettings: {
        maxRetries: 3,
        retryDelayMinutes: 30,
        exponentialBackoff: true,
      },
    };
  }

  private mapToMessage(data: any): DeliveryMessage {
    return {
      id: data.id,
      companyId: data.companyId,
      customerId: data.customerId,
      recipientEmail: data.recipientEmail,
      recipientPhone: data.recipientPhone,
      recipientDeviceTokens: data.recipientDeviceTokens,
      channel: data.channel as DeliveryChannel,
      priority: data.priority as DeliveryPriority,
      templateId: data.templateId,
      contentId: data.contentId,
      subject: data.subject,
      body: data.body,
      bodyHtml: data.bodyHtml,
      category: data.category,
      tags: data.tags,
      scheduleType: data.scheduleType as ScheduleType,
      scheduledFor: data.scheduledFor,
      optimalSendWindow: data.optimalSendWindow,
      status: data.status as DeliveryStatus,
      statusHistory: data.statusHistory || [],
      providerMessageId: data.providerMessageId,
      sentAt: data.sentAt,
      deliveredAt: data.deliveredAt,
      openedAt: data.openedAt,
      clickedAt: data.clickedAt,
      convertedAt: data.convertedAt,
      failedAt: data.failedAt,
      failureReason: data.failureReason,
      opensCount: data.opensCount,
      clicksCount: data.clicksCount,
      clickedLinks: data.clickedLinks,
      variantId: data.variantId,
      experimentId: data.experimentId,
      automationId: data.automationId,
      automationStepId: data.automationStepId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
