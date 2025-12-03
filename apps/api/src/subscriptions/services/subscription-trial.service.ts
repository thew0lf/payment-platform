/**
 * Subscription Trial Service
 *
 * Handles the complete trial lifecycle including:
 * - Trial creation with various triggers (ON_PURCHASE, ON_SHIPMENT, ON_DELIVERY, MANUAL)
 * - Shipment-aware trial start/end
 * - Trial conversion tracking
 * - Return handling with configurable actions
 * - Fallback mechanisms for missing tracking
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TrialStatus,
  TrialStartTrigger,
  TrialReturnAction,
} from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface StartTrialDto {
  subscriptionId: string;
  trigger?: TrialStartTrigger;
  shipmentId?: string;
}

export interface ConvertTrialDto {
  subscriptionId: string;
  trigger?: TrialStartTrigger;
  shipmentId?: string;
}

export interface HandleTrialReturnDto {
  subscriptionId: string;
  shipmentId: string;
  action?: TrialReturnAction;
  extensionDays?: number;
}

export interface TrialInfo {
  subscriptionId: string;
  trialStatus: TrialStatus;
  trialStart: Date | null;
  trialEnd: Date | null;
  daysRemaining: number | null;
  startTrigger: TrialStartTrigger | null;
  conversionTrigger: TrialStartTrigger | null;
  isAwaitingDelivery: boolean;
  hasReturnReceived: boolean;
  extensionDays: number;
}

export interface TrialStats {
  totalTrials: number;
  activeTrials: number;
  awaitingTrigger: number;
  converted: number;
  expired: number;
  cancelled: number;
  returned: number;
  conversionRate: number;
  avgTrialDays: number;
}

@Injectable()
export class SubscriptionTrialService {
  private readonly logger = new Logger(SubscriptionTrialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // TRIAL LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Create a subscription with trial based on plan settings
   */
  async createSubscriptionWithTrial(params: {
    companyId: string;
    customerId: string;
    subscriptionPlanId: string;
    productId?: string;
    shippingAddressId?: string;
    quantity?: number;
  }): Promise<any> {
    // Get the subscription plan
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: params.subscriptionPlanId },
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan ${params.subscriptionPlanId} not found`);
    }

    const now = new Date();

    // Determine initial trial status based on trigger
    let trialStatus: TrialStatus = TrialStatus.NONE;
    let trialStart: Date | null = null;
    let trialEnd: Date | null = null;

    if (plan.trialEnabled && plan.trialDays && plan.trialDays > 0) {
      switch (plan.trialStartTrigger) {
        case TrialStartTrigger.ON_PURCHASE:
          // Start trial immediately
          trialStatus = TrialStatus.ACTIVE;
          trialStart = now;
          trialEnd = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);
          break;

        case TrialStartTrigger.ON_SHIPMENT:
        case TrialStartTrigger.ON_DELIVERY:
          // Wait for shipment/delivery event
          trialStatus = TrialStatus.AWAITING_TRIGGER;
          break;

        case TrialStartTrigger.MANUAL:
          // Wait for manual trigger
          trialStatus = TrialStatus.AWAITING_TRIGGER;
          break;
      }
    }

    // Calculate billing dates
    const currentPeriodStart = now;
    const currentPeriodEnd = this.calculatePeriodEnd(now, plan.defaultInterval);

    // For trial subscriptions, next billing should be after trial
    const nextBillingDate = trialEnd || currentPeriodEnd;

    // Create the subscription
    const subscription = await this.prisma.subscription.create({
      data: {
        companyId: params.companyId,
        customerId: params.customerId,
        subscriptionPlanId: params.subscriptionPlanId,
        planName: plan.displayName || plan.name,
        planAmount: plan.basePriceMonthly,
        currency: plan.currency,
        interval: plan.defaultInterval,
        currentPeriodStart,
        currentPeriodEnd,
        nextBillingDate,
        trialStatus,
        trialStart,
        trialEnd,
        trialStartTrigger: plan.trialStartTrigger,
        trialConversionTrigger: plan.trialConversionTrigger,
        quantity: params.quantity || plan.includedQuantity,
        shippingAddressId: params.shippingAddressId,
        status: 'ACTIVE',
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        subscriptionPlan: true,
      },
    });

    this.logger.log(`Created subscription ${subscription.id} with trial status ${trialStatus}`);

    this.eventEmitter.emit('subscription.created', {
      subscription,
      hasTrial: trialStatus !== TrialStatus.NONE,
    });

    if (trialStatus === TrialStatus.ACTIVE) {
      this.eventEmitter.emit('subscription.trial.started', {
        subscriptionId: subscription.id,
        trigger: TrialStartTrigger.ON_PURCHASE,
        trialEnd,
      });
    }

    return subscription;
  }

  /**
   * Start a trial for a subscription awaiting trigger
   */
  async startTrial(dto: StartTrialDto): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    }

    if (subscription.trialStatus !== TrialStatus.AWAITING_TRIGGER) {
      throw new BadRequestException(
        `Cannot start trial - current status is ${subscription.trialStatus}`,
      );
    }

    const plan = subscription.subscriptionPlan;
    if (!plan) {
      throw new BadRequestException('Subscription has no associated plan');
    }

    const now = new Date();
    let trialDays = plan.trialDays || 14;

    // Add extension days if waiting for delivery
    if (plan.trialWaitForDelivery && plan.trialExtendDaysPostDelivery) {
      trialDays += plan.trialExtendDaysPostDelivery;
    }

    const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: {
        trialStatus: TrialStatus.ACTIVE,
        trialStart: now,
        trialEnd,
        trialStartedByShipment: dto.trigger === TrialStartTrigger.ON_SHIPMENT ? dto.shipmentId : undefined,
        trialStartedByDelivery: dto.trigger === TrialStartTrigger.ON_DELIVERY ? dto.shipmentId : undefined,
        nextBillingDate: trialEnd,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        subscriptionPlan: true,
      },
    });

    this.logger.log(`Started trial for subscription ${dto.subscriptionId}, ends ${trialEnd}`);

    this.eventEmitter.emit('subscription.trial.started', {
      subscriptionId: dto.subscriptionId,
      trigger: dto.trigger,
      shipmentId: dto.shipmentId,
      trialEnd,
    });

    return updated;
  }

  /**
   * Handle shipment event for trial subscriptions
   */
  async handleShipmentEvent(params: {
    shipmentId: string;
    status: 'SHIPPED' | 'DELIVERED';
    companyId: string;
  }): Promise<void> {
    // Find subscriptions awaiting this trigger type
    const triggerType = params.status === 'SHIPPED'
      ? TrialStartTrigger.ON_SHIPMENT
      : TrialStartTrigger.ON_DELIVERY;

    // Find subscriptions with this shipment that are awaiting trigger
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        companyId: params.companyId,
        trialStatus: TrialStatus.AWAITING_TRIGGER,
        trialStartTrigger: triggerType,
        lastShipmentId: params.shipmentId,
      },
    });

    for (const subscription of subscriptions) {
      await this.startTrial({
        subscriptionId: subscription.id,
        trigger: triggerType,
        shipmentId: params.shipmentId,
      });
    }

    // Also update delivery tracking for active trials
    if (params.status === 'DELIVERED') {
      await this.prisma.subscription.updateMany({
        where: {
          lastShipmentId: params.shipmentId,
          awaitingDeliveryForBilling: true,
        },
        data: {
          awaitingDeliveryForBilling: false,
          lastDeliveryAt: new Date(),
          lastShipmentStatus: 'DELIVERED',
        },
      });
    }

    this.logger.log(`Processed ${params.status} event for shipment ${params.shipmentId}`);
  }

  /**
   * Convert a trial to a paid subscription
   */
  async convertTrial(dto: ConvertTrialDto): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    }

    if (subscription.trialStatus !== TrialStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot convert trial - current status is ${subscription.trialStatus}`,
      );
    }

    const now = new Date();
    const plan = subscription.subscriptionPlan;

    // Calculate new billing period
    const currentPeriodStart = now;
    const currentPeriodEnd = this.calculatePeriodEnd(now, subscription.interval);

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: {
        trialStatus: TrialStatus.CONVERTED,
        trialConvertedAt: now,
        trialConvertedByShipment: dto.trigger === TrialStartTrigger.ON_SHIPMENT ? dto.shipmentId : undefined,
        trialConvertedByDelivery: dto.trigger === TrialStartTrigger.ON_DELIVERY ? dto.shipmentId : undefined,
        currentPeriodStart,
        currentPeriodEnd,
        nextBillingDate: currentPeriodEnd,
        cycleCount: 1,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        subscriptionPlan: true,
      },
    });

    this.logger.log(`Converted trial for subscription ${dto.subscriptionId}`);

    this.eventEmitter.emit('subscription.trial.converted', {
      subscriptionId: dto.subscriptionId,
      trigger: dto.trigger,
      shipmentId: dto.shipmentId,
      convertedAt: now,
    });

    return updated;
  }

  /**
   * Expire a trial that has ended without conversion
   */
  async expireTrial(subscriptionId: string): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    if (subscription.trialStatus !== TrialStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot expire trial - current status is ${subscription.trialStatus}`,
      );
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        trialStatus: TrialStatus.EXPIRED,
        status: 'EXPIRED',
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    this.logger.log(`Expired trial for subscription ${subscriptionId}`);

    this.eventEmitter.emit('subscription.trial.expired', {
      subscriptionId,
      expiredAt: new Date(),
    });

    return updated;
  }

  /**
   * Cancel a trial
   */
  async cancelTrial(subscriptionId: string, reason?: string): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    if (subscription.trialStatus !== TrialStatus.ACTIVE && subscription.trialStatus !== TrialStatus.AWAITING_TRIGGER) {
      throw new BadRequestException(
        `Cannot cancel trial - current status is ${subscription.trialStatus}`,
      );
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        trialStatus: TrialStatus.CANCELLED,
        status: 'CANCELED',
        canceledAt: new Date(),
        cancelReason: reason || 'Trial cancelled',
        cancelSource: 'trial_cancel',
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    this.logger.log(`Cancelled trial for subscription ${subscriptionId}`);

    this.eventEmitter.emit('subscription.trial.cancelled', {
      subscriptionId,
      reason,
      cancelledAt: new Date(),
    });

    return updated;
  }

  /**
   * Handle product return during trial
   */
  async handleTrialReturn(dto: HandleTrialReturnDto): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    }

    if (subscription.trialStatus !== TrialStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot handle return - trial status is ${subscription.trialStatus}`,
      );
    }

    const plan = subscription.subscriptionPlan;
    const action = dto.action || plan?.trialReturnAction || TrialReturnAction.PAUSE_ALERT;
    const now = new Date();

    let updateData: any = {
      trialReturnReceived: true,
      trialReturnAt: now,
      trialReturnAction: action,
    };

    switch (action) {
      case TrialReturnAction.EXTEND_TRIAL:
        const extensionDays = dto.extensionDays || plan?.trialReturnExtendDays || 7;
        const currentEnd = subscription.trialEnd || now;
        const newEnd = new Date(currentEnd.getTime() + extensionDays * 24 * 60 * 60 * 1000);
        updateData = {
          ...updateData,
          trialEnd: newEnd,
          trialExtensionDays: (subscription.trialExtensionDays || 0) + extensionDays,
          nextBillingDate: newEnd,
        };
        this.logger.log(`Extended trial by ${extensionDays} days for subscription ${dto.subscriptionId}`);
        break;

      case TrialReturnAction.CANCEL:
        updateData = {
          ...updateData,
          trialStatus: TrialStatus.RETURNED,
          status: 'CANCELED',
          canceledAt: now,
          cancelReason: 'Product returned during trial',
          cancelSource: 'return',
        };
        this.logger.log(`Cancelled trial due to return for subscription ${dto.subscriptionId}`);
        break;

      case TrialReturnAction.PAUSE_ALERT:
        updateData = {
          ...updateData,
          status: 'PAUSED',
          pausedAt: now,
          pauseReason: 'Product returned - awaiting resolution',
        };
        this.logger.log(`Paused subscription due to return for ${dto.subscriptionId}`);
        break;

      case TrialReturnAction.CONVERT_ANYWAY:
        // Just record the return, continue normally
        this.logger.log(`Recorded return but continuing trial for ${dto.subscriptionId}`);
        break;
    }

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: updateData,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        subscriptionPlan: true,
      },
    });

    this.eventEmitter.emit('subscription.trial.return', {
      subscriptionId: dto.subscriptionId,
      shipmentId: dto.shipmentId,
      action,
      returnedAt: now,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get trial info for a subscription
   */
  async getTrialInfo(subscriptionId: string): Promise<TrialInfo> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    const now = new Date();
    let daysRemaining: number | null = null;

    if (subscription.trialStatus === TrialStatus.ACTIVE && subscription.trialEnd) {
      const msRemaining = subscription.trialEnd.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
    }

    return {
      subscriptionId,
      trialStatus: subscription.trialStatus,
      trialStart: subscription.trialStart,
      trialEnd: subscription.trialEnd,
      daysRemaining,
      startTrigger: subscription.trialStartTrigger,
      conversionTrigger: subscription.trialConversionTrigger,
      isAwaitingDelivery: subscription.awaitingDeliveryForBilling,
      hasReturnReceived: subscription.trialReturnReceived,
      extensionDays: subscription.trialExtensionDays || 0,
    };
  }

  /**
   * Get trial statistics for a company
   */
  async getTrialStats(companyId?: string): Promise<TrialStats> {
    const where: any = { deletedAt: null };
    if (companyId) where.companyId = companyId;

    // Get counts by trial status
    const statusCounts = await this.prisma.subscription.groupBy({
      by: ['trialStatus'],
      where,
      _count: { _all: true },
    });

    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.trialStatus] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

    const totalTrials = Object.entries(statusMap)
      .filter(([status]) => status !== 'NONE')
      .reduce((sum, [, count]) => sum + count, 0);

    const converted = statusMap[TrialStatus.CONVERTED] || 0;
    const convertibleTrials = converted + (statusMap[TrialStatus.EXPIRED] || 0) + (statusMap[TrialStatus.CANCELLED] || 0);
    const conversionRate = convertibleTrials > 0 ? (converted / convertibleTrials) * 100 : 0;

    // Calculate average trial duration for converted trials
    const avgResult = await this.prisma.subscription.aggregate({
      where: {
        ...where,
        trialStatus: TrialStatus.CONVERTED,
        trialStart: { not: null },
        trialConvertedAt: { not: null },
      },
      _avg: {
        // This would need a computed field or raw query
        // For now, return a placeholder
      },
    });

    return {
      totalTrials,
      activeTrials: statusMap[TrialStatus.ACTIVE] || 0,
      awaitingTrigger: statusMap[TrialStatus.AWAITING_TRIGGER] || 0,
      converted,
      expired: statusMap[TrialStatus.EXPIRED] || 0,
      cancelled: statusMap[TrialStatus.CANCELLED] || 0,
      returned: statusMap[TrialStatus.RETURNED] || 0,
      conversionRate: Math.round(conversionRate * 100) / 100,
      avgTrialDays: 14, // Placeholder - would need raw query for accurate calculation
    };
  }

  /**
   * Find subscriptions with expiring trials
   */
  async findExpiringTrials(params: {
    companyId?: string;
    daysUntilExpiry: number;
  }): Promise<any[]> {
    const now = new Date();
    const expiryThreshold = new Date(now.getTime() + params.daysUntilExpiry * 24 * 60 * 60 * 1000);

    const where: any = {
      deletedAt: null,
      trialStatus: TrialStatus.ACTIVE,
      trialEnd: {
        lte: expiryThreshold,
        gt: now,
      },
    };

    if (params.companyId) {
      where.companyId = params.companyId;
    }

    return this.prisma.subscription.findMany({
      where,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        subscriptionPlan: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { trialEnd: 'asc' },
    });
  }

  /**
   * Find subscriptions awaiting trigger with fallback check
   */
  async checkFallbackTriggers(companyId?: string): Promise<any[]> {
    const where: any = {
      deletedAt: null,
      trialStatus: TrialStatus.AWAITING_TRIGGER,
      trialFallbackUsed: false,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: {
        subscriptionPlan: true,
      },
    });

    const now = new Date();
    const triggered: any[] = [];

    for (const sub of subscriptions) {
      const plan = sub.subscriptionPlan;
      if (!plan?.trialNoTrackingFallbackDays) continue;

      const fallbackDate = new Date(
        sub.createdAt.getTime() + plan.trialNoTrackingFallbackDays * 24 * 60 * 60 * 1000
      );

      if (now >= fallbackDate) {
        // Trigger via fallback
        const updated = await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            trialFallbackUsed: true,
            trialStatus: TrialStatus.ACTIVE,
            trialStart: now,
            trialEnd: new Date(now.getTime() + (plan.trialDays || 14) * 24 * 60 * 60 * 1000),
          },
        });
        triggered.push(updated);

        this.eventEmitter.emit('subscription.trial.fallback', {
          subscriptionId: sub.id,
          fallbackDays: plan.trialNoTrackingFallbackDays,
        });
      }
    }

    return triggered;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private calculatePeriodEnd(start: Date, interval: string): Date {
    const end = new Date(start);

    switch (interval) {
      case 'WEEKLY':
        end.setDate(end.getDate() + 7);
        break;
      case 'BIWEEKLY':
        end.setDate(end.getDate() + 14);
        break;
      case 'MONTHLY':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'QUARTERLY':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'YEARLY':
        end.setFullYear(end.getFullYear() + 1);
        break;
      case 'DAILY':
        end.setDate(end.getDate() + 1);
        break;
      default:
        end.setMonth(end.getMonth() + 1);
    }

    return end;
  }
}
