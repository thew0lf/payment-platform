import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PricingPlanService } from './pricing-plan.service';
import {
  ClientSubscription,
  CreateSubscriptionDto,
  SubscriptionStatus,
  UsagePeriodStatus,
} from '../types/billing.types';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly planService: PricingPlanService,
  ) {}

  async create(clientId: string, dto: CreateSubscriptionDto): Promise<ClientSubscription> {
    // Check if client already has subscription
    const existing = await this.prisma.clientSubscription.findUnique({
      where: { clientId },
    });
    if (existing) {
      throw new BadRequestException('Client already has an active subscription');
    }

    const plan = await this.planService.findById(dto.planId);

    const now = new Date();
    const periodStart = now;
    const periodEnd = this.calculatePeriodEnd(now, dto.billingInterval || plan.billingInterval, dto.billingAnchorDay);

    const subscription = await this.prisma.clientSubscription.create({
      data: {
        clientId,
        planId: dto.planId,
        billingAnchorDay: dto.billingAnchorDay ?? now.getDate(),
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        status: dto.trialDays ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
        trialStart: dto.trialDays ? now : null,
        trialEnd: dto.trialDays ? new Date(now.getTime() + dto.trialDays * 24 * 60 * 60 * 1000) : null,
        discountPercent: dto.discountPercent,
        discountReason: dto.discountReason,
      },
    });

    // Create initial usage period
    await this.createUsagePeriod(subscription.id, clientId, periodStart, periodEnd);

    this.logger.log(`Created subscription for client ${clientId} on plan ${plan.name}`);
    this.eventEmitter.emit('subscription.created', { subscription });

    return this.mapToSubscription(subscription);
  }

  async findByClientId(clientId: string): Promise<ClientSubscription> {
    const subscription = await this.prisma.clientSubscription.findUnique({
      where: { clientId },
    });
    if (!subscription) {
      throw new NotFoundException(`Subscription for client ${clientId} not found`);
    }
    return this.mapToSubscription(subscription);
  }

  async changePlan(clientId: string, newPlanId: string): Promise<ClientSubscription> {
    const subscription = await this.findByClientId(clientId);
    const newPlan = await this.planService.findById(newPlanId);

    await this.prisma.clientSubscription.update({
      where: { clientId },
      data: {
        planId: newPlanId,
      },
    });

    this.logger.log(`Changed subscription for client ${clientId} to plan ${newPlan.name}`);
    this.eventEmitter.emit('subscription.planChanged', { clientId, newPlanId });

    return this.findByClientId(clientId);
  }

  async cancel(clientId: string, reason?: string): Promise<ClientSubscription> {
    await this.prisma.clientSubscription.update({
      where: { clientId },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
        cancelReason: reason,
      },
    });

    this.logger.log(`Canceled subscription for client ${clientId}`);
    this.eventEmitter.emit('subscription.canceled', { clientId, reason });

    return this.findByClientId(clientId);
  }

  async pause(clientId: string, reason?: string): Promise<ClientSubscription> {
    await this.prisma.clientSubscription.update({
      where: { clientId },
      data: {
        status: SubscriptionStatus.PAUSED,
        pausedAt: new Date(),
        pauseReason: reason,
      },
    });

    return this.findByClientId(clientId);
  }

  async resume(clientId: string): Promise<ClientSubscription> {
    await this.prisma.clientSubscription.update({
      where: { clientId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        pausedAt: null,
        pauseReason: null,
      },
    });

    return this.findByClientId(clientId);
  }

  // ═══════════════════════════════════════════════════════════════
  // PERIOD MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  private async createUsagePeriod(
    subscriptionId: string,
    clientId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    await this.prisma.usagePeriod.create({
      data: {
        clientId,
        subscriptionId,
        periodStart,
        periodEnd,
        status: UsagePeriodStatus.ACTIVE,
        transactionCount: 0,
        transactionVolume: BigInt(0),
        transactionCost: 0,
        volumeCost: 0,
        apiCallCount: 0,
        apiCallCost: 0,
        companiesUsed: 0,
        usersUsed: 0,
        storageUsedMb: 0,
        baseCost: 0,
        overageCost: 0,
        totalCost: 0,
      },
    });
  }

  private calculatePeriodEnd(
    start: Date,
    interval: 'monthly' | 'annual' | string,
    anchorDay?: number,
  ): Date {
    const end = new Date(start);
    if (interval === 'monthly' || interval === 'MONTHLY') {
      end.setMonth(end.getMonth() + 1);
    } else {
      end.setFullYear(end.getFullYear() + 1);
    }
    if (anchorDay) {
      end.setDate(anchorDay);
    }
    return end;
  }

  private mapToSubscription(data: any): ClientSubscription {
    return {
      id: data.id,
      clientId: data.clientId,
      planId: data.planId,
      planName: '', // Will be loaded separately if needed
      customPricing: null,
      billingInterval: 'monthly',
      billingAnchorDay: data.billingAnchorDay,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      paymentMethodId: null,
      paymentProvider: 'stripe',
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      status: data.status as SubscriptionStatus,
      trialEndsAt: data.trialEnd,
      canceledAt: data.canceledAt,
      cancelReason: data.cancelReason,
      discountPercent: data.discountPercent,
      discountReason: data.discountReason,
      discountExpiresAt: data.discountExpiresAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
