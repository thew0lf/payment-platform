/**
 * Subscription Lifecycle Service
 *
 * Handles subscription lifecycle operations:
 * - Pause/Resume with configurable limits
 * - Skip billing cycles with yearly limits
 * - Cancel with end-of-period option
 * - Reactivate cancelled subscriptions
 * - Quantity changes with proration
 * - Plan changes (upgrade/downgrade)
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionStatus, BillingInterval } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PauseSubscriptionDto {
  subscriptionId: string;
  reason?: string;
  resumeAt?: Date;
}

export interface ResumeSubscriptionDto {
  subscriptionId: string;
  resetBillingDate?: boolean;
}

export interface SkipBillingDto {
  subscriptionId: string;
  cyclesToSkip?: number;
  reason?: string;
}

export interface CancelSubscriptionDto {
  subscriptionId: string;
  reason?: string;
  source?: 'customer' | 'admin' | 'system' | 'ai_churn';
  cancelImmediately?: boolean;
  feedback?: string;
}

export interface ReactivateSubscriptionDto {
  subscriptionId: string;
  resetBillingDate?: boolean;
}

export interface ChangeQuantityDto {
  subscriptionId: string;
  newQuantity: number;
  effectiveImmediately?: boolean;
}

export interface ChangePlanDto {
  subscriptionId: string;
  newPlanId: string;
  effectiveImmediately?: boolean;
}

export interface LifecycleStats {
  totalActive: number;
  totalPaused: number;
  totalCancelled: number;
  pauseRate: number;
  churnRate: number;
  avgPauseDuration: number;
  skipsThisMonth: number;
}

@Injectable()
export class SubscriptionLifecycleService {
  private readonly logger = new Logger(SubscriptionLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // PAUSE & RESUME
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Pause a subscription
   */
  async pauseSubscription(dto: PauseSubscriptionDto): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(`Only active subscriptions can be paused (current: ${subscription.status})`);
    }

    const plan = subscription.subscriptionPlan;

    // Check if pause is enabled for this plan
    if (plan && !plan.pauseEnabled) {
      throw new BadRequestException('Pausing is not enabled for this subscription plan');
    }

    // Check max pause duration if resumeAt is specified
    if (dto.resumeAt && plan?.pauseMaxDuration) {
      const now = new Date();
      const pauseDuration = (dto.resumeAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
      if (pauseDuration > plan.pauseMaxDuration) {
        throw new BadRequestException(
          `Maximum pause duration is ${plan.pauseMaxDuration} days`,
        );
      }
    }

    const now = new Date();

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: {
        status: SubscriptionStatus.PAUSED,
        pausedAt: now,
        pauseResumeAt: dto.resumeAt || null,
        pauseReason: dto.reason,
        pauseCount: { increment: 1 },
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        subscriptionPlan: true,
      },
    });

    this.logger.log(`Paused subscription ${dto.subscriptionId}`);

    this.eventEmitter.emit('subscription.paused', {
      subscriptionId: dto.subscriptionId,
      reason: dto.reason,
      resumeAt: dto.resumeAt,
      pausedAt: now,
    });

    return updated;
  }

  /**
   * Resume a paused subscription
   */
  async resumeSubscription(dto: ResumeSubscriptionDto): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    }

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestException(`Only paused subscriptions can be resumed (current: ${subscription.status})`);
    }

    const now = new Date();
    let nextBillingDate = subscription.nextBillingDate;

    // If resetBillingDate, calculate new billing date from now
    if (dto.resetBillingDate) {
      nextBillingDate = this.calculateNextBillingDate(now, subscription.interval);
    } else {
      // If billing date is in the past, move it forward
      if (nextBillingDate && nextBillingDate < now) {
        nextBillingDate = this.calculateNextBillingDate(now, subscription.interval);
      }
    }

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        pausedAt: null,
        pauseResumeAt: null,
        pauseReason: null,
        nextBillingDate,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        subscriptionPlan: true,
      },
    });

    this.logger.log(`Resumed subscription ${dto.subscriptionId}`);

    this.eventEmitter.emit('subscription.resumed', {
      subscriptionId: dto.subscriptionId,
      resumedAt: now,
      nextBillingDate,
    });

    return updated;
  }

  /**
   * Auto-resume paused subscriptions that have reached their resumeAt date
   */
  async processScheduledResumes(): Promise<number> {
    const now = new Date();

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.PAUSED,
        pauseResumeAt: { lte: now },
        deletedAt: null,
      },
    });

    let resumedCount = 0;

    for (const sub of subscriptions) {
      try {
        await this.resumeSubscription({
          subscriptionId: sub.id,
          resetBillingDate: false,
        });
        resumedCount++;
      } catch (error) {
        this.logger.error(`Failed to auto-resume subscription ${sub.id}:`, error);
      }
    }

    return resumedCount;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SKIP BILLING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Skip the next billing cycle(s)
   */
  async skipBillingCycle(dto: SkipBillingDto): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(`Only active subscriptions can skip billing (current: ${subscription.status})`);
    }

    const plan = subscription.subscriptionPlan;

    // Check if skip is enabled
    if (plan && !plan.skipEnabled) {
      throw new BadRequestException('Skipping is not enabled for this subscription plan');
    }

    // Check yearly skip limit
    if (plan?.skipMaxPerYear) {
      const skipsThisYear = await this.getSkipsThisYear(dto.subscriptionId);
      const cyclesToSkip = dto.cyclesToSkip || 1;

      if (skipsThisYear + cyclesToSkip > plan.skipMaxPerYear) {
        throw new BadRequestException(
          `Skip limit reached. Max ${plan.skipMaxPerYear} skips per year, you have used ${skipsThisYear}`,
        );
      }
    }

    const now = new Date();
    const cyclesToSkip = dto.cyclesToSkip || 1;

    // Calculate new billing date
    let nextBillingDate = subscription.nextBillingDate || now;
    for (let i = 0; i < cyclesToSkip; i++) {
      nextBillingDate = this.calculateNextBillingDate(nextBillingDate, subscription.interval);
    }

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: {
        skipNextBilling: false, // Reset flag since we're adjusting dates
        skipCount: { increment: cyclesToSkip },
        lastSkipAt: now,
        nextBillingDate,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        subscriptionPlan: true,
      },
    });

    this.logger.log(`Skipped ${cyclesToSkip} billing cycle(s) for subscription ${dto.subscriptionId}`);

    this.eventEmitter.emit('subscription.skipped', {
      subscriptionId: dto.subscriptionId,
      cyclesSkipped: cyclesToSkip,
      reason: dto.reason,
      nextBillingDate,
    });

    return updated;
  }

  /**
   * Get number of skips used this year
   */
  private async getSkipsThisYear(subscriptionId: string): Promise<number> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { skipCount: true, createdAt: true },
    });

    if (!subscription) return 0;

    // For simplicity, we track total skips. In production, might want to track per-year
    return subscription.skipCount;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CANCEL & REACTIVATE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Cancel a subscription
   */
  async cancelSubscription(dto: CancelSubscriptionDto): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    }

    if (subscription.status === SubscriptionStatus.CANCELED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    const now = new Date();

    const updateData: any = {
      canceledAt: now,
      cancelReason: dto.reason,
      cancelSource: dto.source || 'customer',
      metadata: {
        ...(subscription.metadata as any || {}),
        cancellationFeedback: dto.feedback,
      },
      winbackEligible: true, // Mark for potential win-back
    };

    if (dto.cancelImmediately) {
      // Immediate cancellation
      updateData.status = SubscriptionStatus.CANCELED;
      updateData.nextBillingDate = null;
    } else {
      // Cancel at end of current period
      // Status stays active until period end, then cron job will update
      updateData.metadata = {
        ...updateData.metadata,
        cancelAtPeriodEnd: true,
      };
    }

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: updateData,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        subscriptionPlan: true,
      },
    });

    this.logger.log(`Cancelled subscription ${dto.subscriptionId} (immediate: ${dto.cancelImmediately})`);

    this.eventEmitter.emit('subscription.cancelled', {
      subscriptionId: dto.subscriptionId,
      reason: dto.reason,
      source: dto.source,
      immediate: dto.cancelImmediately,
      cancelledAt: now,
    });

    return updated;
  }

  /**
   * Process subscriptions that are set to cancel at period end
   */
  async processScheduledCancellations(): Promise<number> {
    const now = new Date();

    // Find subscriptions marked for cancellation at period end
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        canceledAt: { not: null },
        currentPeriodEnd: { lte: now },
        deletedAt: null,
      },
    });

    let cancelledCount = 0;

    for (const sub of subscriptions) {
      try {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: SubscriptionStatus.CANCELED,
            nextBillingDate: null,
          },
        });
        cancelledCount++;

        this.eventEmitter.emit('subscription.cancelled.period_end', {
          subscriptionId: sub.id,
          cancelledAt: now,
        });
      } catch (error) {
        this.logger.error(`Failed to process scheduled cancellation for ${sub.id}:`, error);
      }
    }

    return cancelledCount;
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(dto: ReactivateSubscriptionDto): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    }

    if (subscription.status !== SubscriptionStatus.CANCELED) {
      throw new BadRequestException(`Only cancelled subscriptions can be reactivated (current: ${subscription.status})`);
    }

    const now = new Date();
    const nextBillingDate = dto.resetBillingDate
      ? this.calculateNextBillingDate(now, subscription.interval)
      : (subscription.nextBillingDate || this.calculateNextBillingDate(now, subscription.interval));

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        canceledAt: null,
        cancelReason: null,
        cancelSource: null,
        nextBillingDate,
        currentPeriodStart: now,
        currentPeriodEnd: nextBillingDate,
        winbackEligible: false,
        metadata: {
          ...(subscription.metadata as any || {}),
          reactivatedAt: now.toISOString(),
          cancelAtPeriodEnd: false,
        },
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        subscriptionPlan: true,
      },
    });

    this.logger.log(`Reactivated subscription ${dto.subscriptionId}`);

    this.eventEmitter.emit('subscription.reactivated', {
      subscriptionId: dto.subscriptionId,
      reactivatedAt: now,
      nextBillingDate,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // QUANTITY CHANGES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Change subscription quantity
   */
  async changeQuantity(dto: ChangeQuantityDto): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    }

    const plan = subscription.subscriptionPlan;

    // Check max quantity
    if (plan?.maxQuantity && dto.newQuantity > plan.maxQuantity) {
      throw new BadRequestException(`Maximum quantity is ${plan.maxQuantity}`);
    }

    if (dto.newQuantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    const now = new Date();

    let updateData: any;

    if (dto.effectiveImmediately || (plan?.quantityChangeProrate ?? true)) {
      // Apply immediately
      const oldQuantity = subscription.quantity;
      const newAmount = Number(subscription.planAmount) * (dto.newQuantity / oldQuantity);

      updateData = {
        quantity: dto.newQuantity,
        quantityPending: null,
        planAmount: newAmount,
        metadata: {
          ...(subscription.metadata as any || {}),
          lastQuantityChange: {
            from: oldQuantity,
            to: dto.newQuantity,
            at: now.toISOString(),
          },
        },
      };
    } else {
      // Queue for next billing cycle
      updateData = {
        quantityPending: dto.newQuantity,
      };
    }

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: updateData,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        subscriptionPlan: true,
      },
    });

    this.logger.log(`Changed quantity for subscription ${dto.subscriptionId} to ${dto.newQuantity}`);

    this.eventEmitter.emit('subscription.quantity_changed', {
      subscriptionId: dto.subscriptionId,
      oldQuantity: subscription.quantity,
      newQuantity: dto.newQuantity,
      effectiveImmediately: dto.effectiveImmediately,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PLAN CHANGES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Change subscription plan (upgrade/downgrade)
   */
  async changePlan(dto: ChangePlanDto): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    }

    const newPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.newPlanId },
    });

    if (!newPlan) {
      throw new NotFoundException(`Plan ${dto.newPlanId} not found`);
    }

    // Verify plan is available (active, not archived)
    if (newPlan.status !== 'ACTIVE') {
      throw new BadRequestException('Selected plan is not available');
    }

    const now = new Date();
    const oldPlanId = subscription.subscriptionPlanId;
    const isUpgrade = Number(newPlan.basePriceMonthly) > Number(subscription.planAmount);

    const updateData: any = {
      subscriptionPlanId: dto.newPlanId,
      planName: newPlan.displayName || newPlan.name,
      planAmount: newPlan.basePriceMonthly,
      interval: newPlan.defaultInterval,
      downselledFrom: isUpgrade ? null : subscription.subscriptionPlanId,
      metadata: {
        ...(subscription.metadata as any || {}),
        planChangeHistory: [
          ...((subscription.metadata as any)?.planChangeHistory || []),
          {
            from: oldPlanId,
            to: dto.newPlanId,
            at: now.toISOString(),
            type: isUpgrade ? 'upgrade' : 'downgrade',
          },
        ],
      },
    };

    if (dto.effectiveImmediately) {
      // Apply new pricing immediately
      updateData.currentPeriodStart = now;
      updateData.currentPeriodEnd = this.calculateNextBillingDate(now, newPlan.defaultInterval);
      updateData.nextBillingDate = updateData.currentPeriodEnd;
    }

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: updateData,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        subscriptionPlan: true,
      },
    });

    this.logger.log(`Changed plan for subscription ${dto.subscriptionId} from ${oldPlanId} to ${dto.newPlanId}`);

    this.eventEmitter.emit('subscription.plan_changed', {
      subscriptionId: dto.subscriptionId,
      oldPlanId,
      newPlanId: dto.newPlanId,
      isUpgrade,
      effectiveImmediately: dto.effectiveImmediately,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get lifecycle statistics
   */
  async getLifecycleStats(companyId?: string): Promise<LifecycleStats> {
    const where: any = { deletedAt: null };
    if (companyId) where.companyId = companyId;

    // Get status counts
    const statusCounts = await this.prisma.subscription.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

    const totalActive = statusMap[SubscriptionStatus.ACTIVE] || 0;
    const totalPaused = statusMap[SubscriptionStatus.PAUSED] || 0;
    const totalCancelled = statusMap[SubscriptionStatus.CANCELED] || 0;
    const total = totalActive + totalPaused + totalCancelled;

    // Get skips this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const skipsThisMonth = await this.prisma.subscription.count({
      where: {
        ...where,
        lastSkipAt: { gte: monthStart },
      },
    });

    return {
      totalActive,
      totalPaused,
      totalCancelled,
      pauseRate: total > 0 ? (totalPaused / total) * 100 : 0,
      churnRate: total > 0 ? (totalCancelled / total) * 100 : 0,
      avgPauseDuration: 0, // Would need more complex query
      skipsThisMonth,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private calculateNextBillingDate(from: Date, interval: BillingInterval): Date {
    const next = new Date(from);

    switch (interval) {
      case BillingInterval.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case BillingInterval.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case BillingInterval.BIWEEKLY:
        next.setDate(next.getDate() + 14);
        break;
      case BillingInterval.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case BillingInterval.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case BillingInterval.YEARLY:
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setMonth(next.getMonth() + 1);
    }

    return next;
  }
}
