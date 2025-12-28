import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PricingPlanService } from './pricing-plan.service';
import { StripeBillingService } from './stripe-billing.service';
import {
  ClientSubscription,
  CreateSubscriptionDto,
  SubscriptionStatus,
  UsagePeriodStatus,
  RequestPlanChangeDto,
  AssignPlanToClientDto,
} from '../types/billing.types';

interface FindAllOptions {
  status?: string;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly dashboardUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly planService: PricingPlanService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => StripeBillingService))
    private readonly stripeBillingService: StripeBillingService,
  ) {
    this.dashboardUrl = this.configService.get<string>('DASHBOARD_URL') || 'http://localhost:3000';
  }

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
  // ORG ADMIN METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get all subscriptions (ORG admin view)
   */
  async findAll(options: FindAllOptions = {}): Promise<ClientSubscription[]> {
    const where: any = {};

    if (options.status) {
      where.status = options.status;
    }

    const subscriptions = await this.prisma.clientSubscription.findMany({
      where,
      include: {
        plan: true,
        client: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map((sub) => ({
      ...this.mapToSubscription(sub),
      planName: sub.plan?.displayName || sub.plan?.name || '',
      clientName: (sub as any).client?.name,
      clientCode: (sub as any).client?.code,
    }));
  }

  /**
   * Assign a plan to a client (ORG admin only)
   */
  async assignPlan(dto: AssignPlanToClientDto): Promise<ClientSubscription> {
    const plan = await this.planService.findById(dto.planId);

    // Check if client already has a subscription
    const existing = await this.prisma.clientSubscription.findUnique({
      where: { clientId: dto.clientId },
    });

    const now = new Date();
    const periodStart = now;
    const periodEnd = this.calculatePeriodEnd(now, dto.billingInterval || plan.billingInterval);

    if (existing) {
      // Update existing subscription
      await this.prisma.clientSubscription.update({
        where: { clientId: dto.clientId },
        data: {
          planId: dto.planId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          status: SubscriptionStatus.ACTIVE,
          discountPercent: dto.discountPercent,
          discountReason: dto.discountReason,
        },
      });

      this.logger.log(`ORG assigned plan ${plan.name} to client ${dto.clientId}`);
      this.eventEmitter.emit('subscription.planAssigned', { clientId: dto.clientId, planId: dto.planId });
    } else {
      // Create new subscription
      const subscription = await this.prisma.clientSubscription.create({
        data: {
          clientId: dto.clientId,
          planId: dto.planId,
          billingAnchorDay: now.getDate(),
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          status: SubscriptionStatus.ACTIVE,
          discountPercent: dto.discountPercent,
          discountReason: dto.discountReason,
        },
      });

      // Create initial usage period
      await this.createUsagePeriod(subscription.id, dto.clientId, periodStart, periodEnd);

      this.logger.log(`ORG created subscription for client ${dto.clientId} on plan ${plan.name}`);
      this.eventEmitter.emit('subscription.created', { subscription });
    }

    return this.findByClientId(dto.clientId);
  }

  // ═══════════════════════════════════════════════════════════════
  // SELF-SERVICE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Request a plan upgrade (self-service)
   * Returns Stripe Checkout URL if allowed, or requires approval message
   */
  async requestUpgrade(
    clientId: string,
    dto: RequestPlanChangeDto,
  ): Promise<{ checkoutUrl: string } | { requiresApproval: boolean; message: string }> {
    const currentSubscription = await this.findByClientId(clientId);
    const targetPlan = await this.planService.findById(dto.targetPlanId);

    // Check if this is actually an upgrade
    const isUpgrade = await this.planService.isPlanUpgrade(currentSubscription.planId, dto.targetPlanId);

    if (!isUpgrade) {
      throw new BadRequestException('This plan change is not an upgrade. Use the downgrade request endpoint.');
    }

    // Check if target plan allows self-upgrade
    if (!targetPlan.allowSelfUpgrade) {
      return {
        requiresApproval: true,
        message: 'This plan requires manual approval. Your upgrade request has been submitted.',
      };
    }

    // Check if target plan requires approval
    if (targetPlan.requiresApproval) {
      // Create a pending upgrade request (could be stored in a separate table)
      this.eventEmitter.emit('subscription.upgradeRequested', {
        clientId,
        currentPlanId: currentSubscription.planId,
        targetPlanId: dto.targetPlanId,
      });

      return {
        requiresApproval: true,
        message: 'Your upgrade request has been submitted and is pending approval.',
      };
    }

    // If Stripe is configured, create checkout session
    if (targetPlan.stripePriceId) {
      // TODO: Implement Stripe Checkout session creation
      // For now, return a placeholder
      const checkoutUrl = await this.createStripeCheckoutSession(
        clientId,
        dto.targetPlanId,
        dto.billingInterval,
      );

      return { checkoutUrl };
    }

    // If no Stripe, just do the upgrade directly
    await this.changePlan(clientId, dto.targetPlanId);

    return {
      checkoutUrl: '', // No redirect needed, upgrade completed
    };
  }

  /**
   * Request a plan downgrade (requires approval)
   */
  async requestDowngrade(
    clientId: string,
    dto: RequestPlanChangeDto,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    const currentSubscription = await this.findByClientId(clientId);
    const targetPlan = await this.planService.findById(dto.targetPlanId);

    // Check if this is actually a downgrade
    const isUpgrade = await this.planService.isPlanUpgrade(currentSubscription.planId, dto.targetPlanId);

    if (isUpgrade) {
      throw new BadRequestException('This plan change is an upgrade, not a downgrade.');
    }

    // Check if target plan allows self-downgrade (most don't)
    if (targetPlan.allowSelfDowngrade) {
      // Rare case where self-downgrade is allowed
      await this.changePlan(clientId, dto.targetPlanId);
      return {
        success: true,
        message: 'Your plan has been downgraded successfully.',
      };
    }

    // Emit event for ORG admin to review
    this.eventEmitter.emit('subscription.downgradeRequested', {
      clientId,
      currentPlanId: currentSubscription.planId,
      targetPlanId: dto.targetPlanId,
      reason,
    });

    this.logger.log(`Downgrade request submitted for client ${clientId}`);

    return {
      success: true,
      message: 'Your downgrade request has been submitted and will be reviewed by our team.',
    };
  }

  /**
   * Create Stripe Checkout session for upgrade
   */
  private async createStripeCheckoutSession(
    clientId: string,
    planId: string,
    billingInterval?: 'monthly' | 'annual',
  ): Promise<string> {
    const plan = await this.planService.findById(planId);

    const priceId = billingInterval === 'annual'
      ? plan.stripeAnnualPriceId
      : plan.stripePriceId;

    if (!priceId) {
      throw new BadRequestException('This plan is not configured for online checkout');
    }

    // Check if Stripe is configured
    if (!this.stripeBillingService.isConfigured()) {
      this.logger.warn('Stripe not configured, returning fallback URL');
      // Return a fallback URL for development/testing
      return `${this.dashboardUrl}/settings/billing/checkout?plan=${planId}&success=true`;
    }

    // Create actual Stripe Checkout session
    const successUrl = `${this.dashboardUrl}/settings/billing?upgrade=success&plan=${planId}`;
    const cancelUrl = `${this.dashboardUrl}/settings/billing?upgrade=canceled`;

    const checkoutUrl = await this.stripeBillingService.createCheckoutSession({
      clientId,
      planId,
      priceId,
      successUrl,
      cancelUrl,
    });

    return checkoutUrl;
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
