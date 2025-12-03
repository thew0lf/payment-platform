/**
 * Subscription Notifications Service
 *
 * Handles subscription-related notifications:
 * - Email notifications
 * - SMS notifications
 * - Push notifications
 * - In-app notifications
 * - Notification preferences
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { Subscription, SubscriptionStatus, Customer } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export enum NotificationType {
  // Billing
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_RETRY = 'PAYMENT_RETRY',

  // Subscription lifecycle
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_ACTIVATED = 'SUBSCRIPTION_ACTIVATED',
  SUBSCRIPTION_PAUSED = 'SUBSCRIPTION_PAUSED',
  SUBSCRIPTION_RESUMED = 'SUBSCRIPTION_RESUMED',
  SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',

  // Trial
  TRIAL_STARTED = 'TRIAL_STARTED',
  TRIAL_ENDING = 'TRIAL_ENDING',
  TRIAL_CONVERTED = 'TRIAL_CONVERTED',
  TRIAL_EXPIRED = 'TRIAL_EXPIRED',

  // Shipping
  SHIPMENT_CREATED = 'SHIPMENT_CREATED',
  SHIPMENT_SHIPPED = 'SHIPMENT_SHIPPED',
  SHIPMENT_DELIVERED = 'SHIPMENT_DELIVERED',
  SHIPMENT_DELAYED = 'SHIPMENT_DELAYED',

  // Plan changes
  PLAN_UPGRADED = 'PLAN_UPGRADED',
  PLAN_DOWNGRADED = 'PLAN_DOWNGRADED',
  RENEWAL_UPCOMING = 'RENEWAL_UPCOMING',

  // Retention
  WIN_BACK_OFFER = 'WIN_BACK_OFFER',
  SPECIAL_OFFER = 'SPECIAL_OFFER',

  // Gifts
  GIFT_RECEIVED = 'GIFT_RECEIVED',
  GIFT_EXPIRING = 'GIFT_EXPIRING',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
}

export interface Notification {
  id: string;
  companyId: string;
  customerId: string;
  subscriptionId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;

  // Content
  subject?: string;
  body: string;
  htmlBody?: string;
  data?: Record<string, unknown>;

  // Scheduling
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;

  // Metadata
  createdAt: Date;
  error?: string;
  externalId?: string; // ID from email/SMS provider
}

export interface NotificationTemplate {
  id: string;
  companyId: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  htmlBody?: string;
  isActive: boolean;
  variables: string[]; // Available template variables
}

export interface NotificationPreferences {
  customerId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;

  // Granular preferences
  billingNotifications: boolean;
  shippingNotifications: boolean;
  marketingNotifications: boolean;
  reminderNotifications: boolean;

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:MM
  quietHoursEnd?: string;
  timezone?: string;

  // Frequency
  digestEnabled: boolean;
  digestFrequency?: 'DAILY' | 'WEEKLY';
}

export interface SendNotificationDto {
  customerId: string;
  subscriptionId?: string;
  type: NotificationType;
  channel?: NotificationChannel;
  data?: Record<string, unknown>;
  scheduledAt?: Date;
}

export interface NotificationStats {
  companyId: string;
  period: string;
  totalSent: number;
  byChannel: Record<NotificationChannel, number>;
  byType: Record<NotificationType, number>;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class SubscriptionNotificationsService {
  private readonly logger = new Logger(SubscriptionNotificationsService.name);

  // In-memory storage
  private notifications: Map<string, Notification> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultTemplates();
    this.setupEventListeners();
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<NotificationTemplate, 'id' | 'companyId'>[] = [
      {
        type: NotificationType.PAYMENT_REMINDER,
        channel: NotificationChannel.EMAIL,
        subject: 'Upcoming Payment Reminder',
        body: 'Your subscription payment of {{amount}} is due on {{date}}.',
        htmlBody: '<p>Your subscription payment of <strong>{{amount}}</strong> is due on <strong>{{date}}</strong>.</p>',
        isActive: true,
        variables: ['amount', 'date', 'planName', 'customerName'],
      },
      {
        type: NotificationType.PAYMENT_SUCCESS,
        channel: NotificationChannel.EMAIL,
        subject: 'Payment Successful',
        body: 'Thank you! Your payment of {{amount}} has been processed successfully.',
        htmlBody: '<p>Thank you! Your payment of <strong>{{amount}}</strong> has been processed successfully.</p>',
        isActive: true,
        variables: ['amount', 'date', 'planName', 'customerName'],
      },
      {
        type: NotificationType.PAYMENT_FAILED,
        channel: NotificationChannel.EMAIL,
        subject: 'Payment Failed - Action Required',
        body: 'We were unable to process your payment of {{amount}}. Please update your payment method.',
        htmlBody: '<p>We were unable to process your payment of <strong>{{amount}}</strong>. Please <a href="{{updateUrl}}">update your payment method</a>.</p>',
        isActive: true,
        variables: ['amount', 'date', 'planName', 'customerName', 'updateUrl'],
      },
      {
        type: NotificationType.TRIAL_ENDING,
        channel: NotificationChannel.EMAIL,
        subject: 'Your Trial is Ending Soon',
        body: 'Your free trial ends in {{daysRemaining}} days. Subscribe now to continue enjoying {{planName}}.',
        htmlBody: '<p>Your free trial ends in <strong>{{daysRemaining}} days</strong>. <a href="{{subscribeUrl}}">Subscribe now</a> to continue enjoying {{planName}}.</p>',
        isActive: true,
        variables: ['daysRemaining', 'planName', 'customerName', 'subscribeUrl'],
      },
      {
        type: NotificationType.SHIPMENT_SHIPPED,
        channel: NotificationChannel.EMAIL,
        subject: 'Your Order Has Shipped',
        body: 'Great news! Your order has shipped and is on its way. Track it here: {{trackingUrl}}',
        htmlBody: '<p>Great news! Your order has shipped and is on its way.</p><p><a href="{{trackingUrl}}">Track your shipment</a></p>',
        isActive: true,
        variables: ['trackingNumber', 'trackingUrl', 'carrier', 'estimatedDelivery'],
      },
      {
        type: NotificationType.SUBSCRIPTION_PAUSED,
        channel: NotificationChannel.EMAIL,
        subject: 'Your Subscription is Paused',
        body: 'Your subscription has been paused. You can resume anytime.',
        htmlBody: '<p>Your subscription has been paused. You can <a href="{{resumeUrl}}">resume anytime</a>.</p>',
        isActive: true,
        variables: ['planName', 'pausedUntil', 'resumeUrl'],
      },
    ];

    for (const template of defaultTemplates) {
      const id = `default_${template.type}_${template.channel}`;
      this.templates.set(id, {
        ...template,
        id,
        companyId: 'default',
      });
    }
  }

  private setupEventListeners(): void {
    // Listen for subscription events
    this.eventEmitter.on('subscription.created', (data) => {
      this.sendNotification({
        customerId: data.customerId,
        subscriptionId: data.subscriptionId,
        type: NotificationType.SUBSCRIPTION_CREATED,
      });
    });

    this.eventEmitter.on('subscription.payment.success', (data) => {
      this.sendNotification({
        customerId: data.customerId,
        subscriptionId: data.subscriptionId,
        type: NotificationType.PAYMENT_SUCCESS,
        data: { amount: data.amount },
      });
    });

    this.eventEmitter.on('subscription.payment.failed', (data) => {
      this.sendNotification({
        customerId: data.customerId,
        subscriptionId: data.subscriptionId,
        type: NotificationType.PAYMENT_FAILED,
        data: { amount: data.amount, reason: data.reason },
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SEND NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Send a notification to a customer
   */
  async sendNotification(dto: SendNotificationDto): Promise<Notification> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${dto.customerId} not found`);
    }

    // Check preferences
    const prefs = await this.getPreferences(dto.customerId);
    const channel = dto.channel || this.getDefaultChannel(dto.type, prefs);

    if (!this.shouldSendNotification(dto.type, channel, prefs)) {
      this.logger.log(`Notification ${dto.type} skipped for customer ${dto.customerId} - disabled in preferences`);
      return this.createSkippedNotification(dto, customer, channel);
    }

    // Get template
    const template = await this.getTemplate(customer.companyId, dto.type, channel);

    if (!template || !template.isActive) {
      this.logger.warn(`No active template found for ${dto.type} via ${channel}`);
      return this.createSkippedNotification(dto, customer, channel);
    }

    // Render content
    const content = this.renderTemplate(template, {
      ...dto.data,
      customerName: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
    });

    // Create notification
    const notification: Notification = {
      id: this.generateNotificationId(),
      companyId: customer.companyId,
      customerId: dto.customerId,
      subscriptionId: dto.subscriptionId,
      type: dto.type,
      channel,
      status: dto.scheduledAt ? NotificationStatus.PENDING : NotificationStatus.PENDING,
      subject: content.subject,
      body: content.body,
      htmlBody: content.htmlBody,
      data: dto.data,
      scheduledAt: dto.scheduledAt,
      createdAt: new Date(),
    };

    this.notifications.set(notification.id, notification);

    // Send immediately if not scheduled
    if (!dto.scheduledAt) {
      await this.dispatchNotification(notification, customer);
    }

    this.eventEmitter.emit('notification.created', {
      notificationId: notification.id,
      type: notification.type,
      channel: notification.channel,
    });

    return notification;
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotification(
    companyId: string,
    type: NotificationType,
    filters?: {
      status?: SubscriptionStatus;
      planId?: string;
    },
    data?: Record<string, unknown>,
  ): Promise<{ sent: number; failed: number }> {
    const where: Record<string, unknown> = {
      companyId,
      deletedAt: null,
    };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.planId) {
      where.subscriptionPlanId = filters.planId;
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: { customer: true },
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await this.sendNotification({
          customerId: sub.customerId,
          subscriptionId: sub.id,
          type,
          data,
        });
        sent++;
      } catch {
        failed++;
      }
    }

    this.logger.log(`Bulk notification ${type}: ${sent} sent, ${failed} failed`);

    return { sent, failed };
  }

  /**
   * Dispatch notification to provider
   */
  private async dispatchNotification(
    notification: Notification,
    customer: Customer,
  ): Promise<void> {
    try {
      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          await this.sendEmail(notification, customer);
          break;
        case NotificationChannel.SMS:
          await this.sendSms(notification, customer);
          break;
        case NotificationChannel.PUSH:
          await this.sendPush(notification, customer);
          break;
        case NotificationChannel.IN_APP:
          await this.createInAppNotification(notification);
          break;
      }

      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      this.notifications.set(notification.id, notification);

      this.eventEmitter.emit('notification.sent', {
        notificationId: notification.id,
        channel: notification.channel,
      });
    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      notification.error = error instanceof Error ? error.message : 'Unknown error';
      this.notifications.set(notification.id, notification);

      this.logger.error(`Failed to send notification ${notification.id}: ${notification.error}`);
    }
  }

  // Mock send methods (would integrate with actual providers)
  private async sendEmail(notification: Notification, customer: Customer): Promise<void> {
    this.logger.log(`[MOCK] Sending email to ${customer.email}: ${notification.subject}`);
    // Would integrate with AWS SES, SendGrid, etc.
  }

  private async sendSms(notification: Notification, customer: Customer): Promise<void> {
    this.logger.log(`[MOCK] Sending SMS to ${customer.phone}: ${notification.body}`);
    // Would integrate with Twilio, AWS SNS, etc.
  }

  private async sendPush(notification: Notification, _customer: Customer): Promise<void> {
    this.logger.log(`[MOCK] Sending push notification: ${notification.body}`);
    // Would integrate with Firebase, OneSignal, etc.
  }

  private async createInAppNotification(notification: Notification): Promise<void> {
    this.logger.log(`[MOCK] Creating in-app notification: ${notification.body}`);
    // Would store in database for in-app display
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get notification template
   */
  async getTemplate(
    companyId: string,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<NotificationTemplate | null> {
    // Check company-specific template first
    const companyTemplateId = `${companyId}_${type}_${channel}`;
    if (this.templates.has(companyTemplateId)) {
      return this.templates.get(companyTemplateId)!;
    }

    // Fall back to default template
    const defaultTemplateId = `default_${type}_${channel}`;
    return this.templates.get(defaultTemplateId) || null;
  }

  /**
   * Create or update a template
   */
  async upsertTemplate(
    companyId: string,
    template: Omit<NotificationTemplate, 'id' | 'companyId'>,
  ): Promise<NotificationTemplate> {
    const id = `${companyId}_${template.type}_${template.channel}`;

    const fullTemplate: NotificationTemplate = {
      ...template,
      id,
      companyId,
    };

    this.templates.set(id, fullTemplate);

    this.eventEmitter.emit('notification.template.updated', {
      templateId: id,
      companyId,
      type: template.type,
    });

    return fullTemplate;
  }

  /**
   * Get all templates for a company
   */
  async getTemplates(companyId: string): Promise<NotificationTemplate[]> {
    const templates: NotificationTemplate[] = [];

    for (const template of this.templates.values()) {
      if (template.companyId === companyId || template.companyId === 'default') {
        templates.push(template);
      }
    }

    return templates;
  }

  /**
   * Render template with variables
   */
  private renderTemplate(
    template: NotificationTemplate,
    data: Record<string, unknown>,
  ): { subject?: string; body: string; htmlBody?: string } {
    const render = (text: string): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return String(data[key] || `{{${key}}}`);
      });
    };

    return {
      subject: template.subject ? render(template.subject) : undefined,
      body: render(template.body),
      htmlBody: template.htmlBody ? render(template.htmlBody) : undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PREFERENCES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get notification preferences for customer
   */
  async getPreferences(customerId: string): Promise<NotificationPreferences> {
    return this.preferences.get(customerId) || this.getDefaultPreferences(customerId);
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    customerId: string,
    updates: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences(customerId);
    const updated: NotificationPreferences = {
      ...current,
      ...updates,
      customerId,
    };

    this.preferences.set(customerId, updated);

    this.eventEmitter.emit('notification.preferences.updated', {
      customerId,
      preferences: updated,
    });

    this.logger.log(`Notification preferences updated for customer ${customerId}`);

    return updated;
  }

  private getDefaultPreferences(customerId: string): NotificationPreferences {
    return {
      customerId,
      email: true,
      sms: false,
      push: true,
      inApp: true,
      billingNotifications: true,
      shippingNotifications: true,
      marketingNotifications: false,
      reminderNotifications: true,
      quietHoursEnabled: false,
      digestEnabled: false,
    };
  }

  private getDefaultChannel(
    type: NotificationType,
    prefs: NotificationPreferences,
  ): NotificationChannel {
    // Marketing notifications prefer email
    if (type === NotificationType.WIN_BACK_OFFER || type === NotificationType.SPECIAL_OFFER) {
      return NotificationChannel.EMAIL;
    }

    // Urgent notifications prefer SMS if enabled
    if (type === NotificationType.PAYMENT_FAILED && prefs.sms) {
      return NotificationChannel.SMS;
    }

    // Default to email
    return NotificationChannel.EMAIL;
  }

  private shouldSendNotification(
    type: NotificationType,
    channel: NotificationChannel,
    prefs: NotificationPreferences,
  ): boolean {
    // Check channel preference
    if (channel === NotificationChannel.EMAIL && !prefs.email) return false;
    if (channel === NotificationChannel.SMS && !prefs.sms) return false;
    if (channel === NotificationChannel.PUSH && !prefs.push) return false;
    if (channel === NotificationChannel.IN_APP && !prefs.inApp) return false;

    // Check notification type preference
    const billingTypes = [
      NotificationType.PAYMENT_REMINDER,
      NotificationType.PAYMENT_SUCCESS,
      NotificationType.PAYMENT_FAILED,
      NotificationType.PAYMENT_RETRY,
    ];
    if (billingTypes.includes(type) && !prefs.billingNotifications) return false;

    const shippingTypes = [
      NotificationType.SHIPMENT_CREATED,
      NotificationType.SHIPMENT_SHIPPED,
      NotificationType.SHIPMENT_DELIVERED,
      NotificationType.SHIPMENT_DELAYED,
    ];
    if (shippingTypes.includes(type) && !prefs.shippingNotifications) return false;

    const marketingTypes = [
      NotificationType.WIN_BACK_OFFER,
      NotificationType.SPECIAL_OFFER,
    ];
    if (marketingTypes.includes(type) && !prefs.marketingNotifications) return false;

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // NOTIFICATION HISTORY
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get notifications for customer
   */
  async getNotifications(
    customerId: string,
    options?: {
      type?: NotificationType;
      channel?: NotificationChannel;
      limit?: number;
    },
  ): Promise<Notification[]> {
    let notifications = Array.from(this.notifications.values())
      .filter((n) => n.customerId === customerId);

    if (options?.type) {
      notifications = notifications.filter((n) => n.type === options.type);
    }

    if (options?.channel) {
      notifications = notifications.filter((n) => n.channel === options.channel);
    }

    return notifications
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, options?.limit || 50);
  }

  /**
   * Get notification by ID
   */
  async getNotification(notificationId: string): Promise<Notification | null> {
    return this.notifications.get(notificationId) || null;
  }

  /**
   * Mark notification as read (for in-app)
   */
  async markAsRead(notificationId: string): Promise<Notification | null> {
    const notification = this.notifications.get(notificationId);
    if (!notification) return null;

    if (notification.channel === NotificationChannel.IN_APP) {
      notification.status = NotificationStatus.OPENED;
      this.notifications.set(notificationId, notification);
    }

    return notification;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SCHEDULED NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Schedule payment reminder
   */
  async schedulePaymentReminder(
    subscriptionId: string,
    daysBefore: number = 3,
  ): Promise<Notification | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription || !subscription.nextBillingDate) {
      return null;
    }

    const reminderDate = new Date(subscription.nextBillingDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);

    if (reminderDate <= new Date()) {
      return null; // Too late to send reminder
    }

    return this.sendNotification({
      customerId: subscription.customerId,
      subscriptionId,
      type: NotificationType.PAYMENT_REMINDER,
      scheduledAt: reminderDate,
      data: {
        amount: subscription.planAmount?.toString(),
        date: subscription.nextBillingDate.toLocaleDateString(),
      },
    });
  }

  /**
   * Schedule trial ending notification
   */
  async scheduleTrialEndingNotification(
    subscriptionId: string,
    daysBeforeEnd: number = 3,
  ): Promise<Notification | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription || !subscription.trialEnd) {
      return null;
    }

    const notifyDate = new Date(subscription.trialEnd);
    notifyDate.setDate(notifyDate.getDate() - daysBeforeEnd);

    if (notifyDate <= new Date()) {
      return null;
    }

    return this.sendNotification({
      customerId: subscription.customerId,
      subscriptionId,
      type: NotificationType.TRIAL_ENDING,
      scheduledAt: notifyDate,
      data: {
        daysRemaining: daysBeforeEnd,
        planName: subscription.subscriptionPlan?.name || subscription.planName,
        trialEndDate: subscription.trialEnd.toLocaleDateString(),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get notification statistics
   */
  async getStats(
    companyId: string,
    period: 'day' | 'week' | 'month' = 'week',
  ): Promise<NotificationStats> {
    const notifications = Array.from(this.notifications.values())
      .filter((n) => n.companyId === companyId);

    const byChannel: Record<NotificationChannel, number> = {
      [NotificationChannel.EMAIL]: 0,
      [NotificationChannel.SMS]: 0,
      [NotificationChannel.PUSH]: 0,
      [NotificationChannel.IN_APP]: 0,
    };

    const byType: Record<NotificationType, number> = {} as Record<NotificationType, number>;
    let opened = 0;
    let clicked = 0;
    let delivered = 0;

    for (const notification of notifications) {
      byChannel[notification.channel]++;
      byType[notification.type] = (byType[notification.type] || 0) + 1;

      if (notification.status === NotificationStatus.DELIVERED) delivered++;
      if (notification.status === NotificationStatus.OPENED) opened++;
      if (notification.status === NotificationStatus.CLICKED) clicked++;
    }

    const totalSent = notifications.length;

    return {
      companyId,
      period,
      totalSent,
      byChannel,
      byType,
      deliveryRate: totalSent > 0 ? delivered / totalSent : 0,
      openRate: totalSent > 0 ? opened / totalSent : 0,
      clickRate: totalSent > 0 ? clicked / totalSent : 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createSkippedNotification(
    dto: SendNotificationDto,
    customer: Customer,
    channel: NotificationChannel,
  ): Notification {
    return {
      id: this.generateNotificationId(),
      companyId: customer.companyId,
      customerId: dto.customerId,
      subscriptionId: dto.subscriptionId,
      type: dto.type,
      channel,
      status: NotificationStatus.FAILED,
      body: 'Notification skipped - disabled in preferences',
      data: dto.data,
      createdAt: new Date(),
      error: 'SKIPPED',
    };
  }
}
