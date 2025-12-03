/**
 * Subscription Retention Service
 *
 * Handles retention strategies for subscriptions:
 * - Downsell offers during cancellation
 * - Win-back campaigns for cancelled subscriptions
 * - Pause offers as alternative to cancellation
 * - Discount offers to retain customers
 * - Cancellation reason tracking
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionPlan,
  Prisma,
} from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export enum RetentionOfferType {
  DOWNSELL = 'DOWNSELL',           // Offer cheaper plan
  DISCOUNT = 'DISCOUNT',           // Apply percentage discount
  PAUSE = 'PAUSE',                 // Offer to pause instead of cancel
  FREE_PERIOD = 'FREE_PERIOD',     // Offer free billing cycles
  BONUS_PRODUCT = 'BONUS_PRODUCT', // Add bonus to subscription
  FREQUENCY_CHANGE = 'FREQUENCY_CHANGE', // Change billing frequency
}

export enum RetentionOfferStatus {
  PENDING = 'PENDING',
  PRESENTED = 'PRESENTED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

export enum CancellationReason {
  TOO_EXPENSIVE = 'TOO_EXPENSIVE',
  NOT_USING = 'NOT_USING',
  SWITCHING_COMPETITOR = 'SWITCHING_COMPETITOR',
  PRODUCT_ISSUES = 'PRODUCT_ISSUES',
  SERVICE_ISSUES = 'SERVICE_ISSUES',
  TEMPORARY_PAUSE = 'TEMPORARY_PAUSE',
  FINANCIAL_REASONS = 'FINANCIAL_REASONS',
  NO_LONGER_NEEDED = 'NO_LONGER_NEEDED',
  OTHER = 'OTHER',
}

export enum WinBackCampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

export interface RetentionOffer {
  id: string;
  subscriptionId: string;
  type: RetentionOfferType;
  status: RetentionOfferStatus;
  cancellationReason?: CancellationReason;

  // Offer details
  discountPct?: number;
  freePeriods?: number;
  downsellPlanId?: string;
  pauseDays?: number;
  bonusDescription?: string;

  // Metadata
  presentedAt?: Date;
  respondedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface WinBackCampaign {
  id: string;
  companyId: string;
  name: string;
  status: WinBackCampaignStatus;

  // Targeting
  targetReasons: CancellationReason[];
  minDaysSinceCancellation: number;
  maxDaysSinceCancellation: number;
  targetPlanIds?: string[];

  // Offer
  offerType: RetentionOfferType;
  discountPct?: number;
  freePeriods?: number;
  offerValidDays: number;

  // Tracking
  sentCount: number;
  acceptedCount: number;

  startsAt?: Date;
  endsAt?: Date;
  createdAt: Date;
}

export interface CancellationFlowConfig {
  companyId: string;

  // Flow steps
  showReasonSelector: boolean;
  showRetentionOffers: boolean;
  showPauseOption: boolean;
  showDownsellOption: boolean;
  showDiscountOption: boolean;

  // Offer configurations
  pauseMaxDays: number;
  discountPct: number;
  discountDurationCycles: number;

  // Messaging
  customMessages: Record<CancellationReason, string>;
}

export interface InitiateCancellationDto {
  subscriptionId: string;
  reason?: CancellationReason;
  feedback?: string;
}

export interface InitiateCancellationResult {
  subscriptionId: string;
  reason?: CancellationReason;
  offers: RetentionOffer[];
  canProceedToCancellation: boolean;
}

export interface AcceptOfferDto {
  offerId: string;
  subscriptionId: string;
}

export interface CreateWinBackCampaignDto {
  companyId: string;
  name: string;
  targetReasons: CancellationReason[];
  minDaysSinceCancellation: number;
  maxDaysSinceCancellation: number;
  targetPlanIds?: string[];
  offerType: RetentionOfferType;
  discountPct?: number;
  freePeriods?: number;
  offerValidDays: number;
  startsAt?: Date;
  endsAt?: Date;
}

export interface RetentionStats {
  totalCancellationAttempts: number;
  savedByCancellationFlow: number;
  saveRate: number;

  offersByType: Record<RetentionOfferType, {
    presented: number;
    accepted: number;
    acceptanceRate: number;
  }>;

  cancellationsByReason: Record<CancellationReason, number>;

  winBackStats: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalSent: number;
    totalAccepted: number;
    winBackRate: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class SubscriptionRetentionService {
  private readonly logger = new Logger(SubscriptionRetentionService.name);

  // In-memory storage for retention offers (would be database table in production)
  private retentionOffers: Map<string, RetentionOffer> = new Map();
  private winBackCampaigns: Map<string, WinBackCampaign> = new Map();
  private cancellationFlowConfigs: Map<string, CancellationFlowConfig> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // CANCELLATION FLOW
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Initiate cancellation flow with retention offers
   */
  async initiateCancellation(
    dto: InitiateCancellationDto,
  ): Promise<InitiateCancellationResult> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: { subscriptionPlan: true, company: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be cancelled');
    }

    // Get or create default cancellation flow config
    const config = this.getCancellationFlowConfig(subscription.companyId);

    // Generate retention offers based on reason and config
    const offers = await this.generateRetentionOffers(
      subscription,
      dto.reason,
      config,
    );

    // Store offers
    for (const offer of offers) {
      this.retentionOffers.set(offer.id, offer);
    }

    // Emit event
    this.eventEmitter.emit('subscription.cancellation.initiated', {
      subscriptionId: subscription.id,
      customerId: subscription.customerId,
      reason: dto.reason,
      feedback: dto.feedback,
      offersPresented: offers.length,
    });

    this.logger.log(
      `Cancellation initiated for subscription ${subscription.id}, ` +
      `reason: ${dto.reason}, offers: ${offers.length}`,
    );

    return {
      subscriptionId: subscription.id,
      reason: dto.reason,
      offers,
      canProceedToCancellation: true,
    };
  }

  /**
   * Generate retention offers based on cancellation reason
   */
  private async generateRetentionOffers(
    subscription: Subscription & { subscriptionPlan: SubscriptionPlan | null },
    reason?: CancellationReason,
    config?: CancellationFlowConfig,
  ): Promise<RetentionOffer[]> {
    const offers: RetentionOffer[] = [];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Price-sensitive reasons get discount offers
    if (
      reason === CancellationReason.TOO_EXPENSIVE ||
      reason === CancellationReason.FINANCIAL_REASONS
    ) {
      // Discount offer
      if (config?.showDiscountOption !== false) {
        offers.push({
          id: this.generateOfferId(),
          subscriptionId: subscription.id,
          type: RetentionOfferType.DISCOUNT,
          status: RetentionOfferStatus.PRESENTED,
          cancellationReason: reason,
          discountPct: config?.discountPct || 20,
          presentedAt: now,
          expiresAt,
          createdAt: now,
        });
      }

      // Downsell offer - find cheaper plan
      if (config?.showDownsellOption !== false) {
        const cheaperPlan = await this.findCheaperPlan(subscription);
        if (cheaperPlan) {
          offers.push({
            id: this.generateOfferId(),
            subscriptionId: subscription.id,
            type: RetentionOfferType.DOWNSELL,
            status: RetentionOfferStatus.PRESENTED,
            cancellationReason: reason,
            downsellPlanId: cheaperPlan.id,
            presentedAt: now,
            expiresAt,
            createdAt: now,
          });
        }
      }
    }

    // Temporary pause reasons get pause offer
    if (
      reason === CancellationReason.TEMPORARY_PAUSE ||
      reason === CancellationReason.NOT_USING
    ) {
      if (config?.showPauseOption !== false) {
        offers.push({
          id: this.generateOfferId(),
          subscriptionId: subscription.id,
          type: RetentionOfferType.PAUSE,
          status: RetentionOfferStatus.PRESENTED,
          cancellationReason: reason,
          pauseDays: config?.pauseMaxDays || 30,
          presentedAt: now,
          expiresAt,
          createdAt: now,
        });
      }
    }

    // Product issues might get free period to try again
    if (reason === CancellationReason.PRODUCT_ISSUES) {
      offers.push({
        id: this.generateOfferId(),
        subscriptionId: subscription.id,
        type: RetentionOfferType.FREE_PERIOD,
        status: RetentionOfferStatus.PRESENTED,
        cancellationReason: reason,
        freePeriods: 1,
        presentedAt: now,
        expiresAt,
        createdAt: now,
      });
    }

    // Default: always offer pause if no specific offers
    if (offers.length === 0 && config?.showPauseOption !== false) {
      offers.push({
        id: this.generateOfferId(),
        subscriptionId: subscription.id,
        type: RetentionOfferType.PAUSE,
        status: RetentionOfferStatus.PRESENTED,
        cancellationReason: reason,
        pauseDays: config?.pauseMaxDays || 30,
        presentedAt: now,
        expiresAt,
        createdAt: now,
      });
    }

    return offers;
  }

  /**
   * Find a cheaper plan for downsell
   */
  private async findCheaperPlan(
    subscription: Subscription & { subscriptionPlan: SubscriptionPlan | null },
  ): Promise<SubscriptionPlan | null> {
    if (!subscription.subscriptionPlan) return null;
    const currentPrice = Number(subscription.subscriptionPlan.basePriceMonthly);

    const cheaperPlan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        companyId: subscription.companyId,
        status: 'ACTIVE',
        basePriceMonthly: { lt: currentPrice },
        id: { not: subscription.subscriptionPlanId ?? undefined },
        deletedAt: null,
      },
      orderBy: { basePriceMonthly: 'desc' }, // Get the most expensive of the cheaper ones
    });

    return cheaperPlan;
  }

  /**
   * Accept a retention offer
   */
  async acceptOffer(dto: AcceptOfferDto): Promise<Subscription> {
    const offer = this.retentionOffers.get(dto.offerId);

    if (!offer) {
      throw new NotFoundException(`Offer ${dto.offerId} not found`);
    }

    if (offer.subscriptionId !== dto.subscriptionId) {
      throw new BadRequestException('Offer does not belong to this subscription');
    }

    if (offer.status !== RetentionOfferStatus.PRESENTED) {
      throw new BadRequestException(`Offer is ${offer.status}, cannot be accepted`);
    }

    if (offer.expiresAt && offer.expiresAt < new Date()) {
      offer.status = RetentionOfferStatus.EXPIRED;
      throw new BadRequestException('Offer has expired');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    }

    // Apply offer based on type
    let updatedSubscription: Subscription;

    switch (offer.type) {
      case RetentionOfferType.DISCOUNT:
        updatedSubscription = await this.applyDiscountOffer(
          subscription,
          offer.discountPct || 20,
        );
        break;

      case RetentionOfferType.DOWNSELL:
        if (!offer.downsellPlanId) {
          throw new BadRequestException('No downsell plan specified');
        }
        updatedSubscription = await this.applyDownsellOffer(
          subscription,
          offer.downsellPlanId,
        );
        break;

      case RetentionOfferType.PAUSE:
        updatedSubscription = await this.applyPauseOffer(
          subscription,
          offer.pauseDays || 30,
        );
        break;

      case RetentionOfferType.FREE_PERIOD:
        updatedSubscription = await this.applyFreePeriodOffer(
          subscription,
          offer.freePeriods || 1,
        );
        break;

      default:
        throw new BadRequestException(`Unsupported offer type: ${offer.type}`);
    }

    // Update offer status
    offer.status = RetentionOfferStatus.ACCEPTED;
    offer.respondedAt = new Date();
    this.retentionOffers.set(offer.id, offer);

    // Emit event
    this.eventEmitter.emit('subscription.retention.offer_accepted', {
      subscriptionId: subscription.id,
      offerId: offer.id,
      offerType: offer.type,
      cancellationReason: offer.cancellationReason,
    });

    this.logger.log(
      `Retention offer ${offer.id} (${offer.type}) accepted for subscription ${subscription.id}`,
    );

    return updatedSubscription;
  }

  /**
   * Decline retention offer and proceed with cancellation
   */
  async declineOffer(offerId: string): Promise<void> {
    const offer = this.retentionOffers.get(offerId);

    if (!offer) {
      throw new NotFoundException(`Offer ${offerId} not found`);
    }

    offer.status = RetentionOfferStatus.DECLINED;
    offer.respondedAt = new Date();
    this.retentionOffers.set(offer.id, offer);

    this.eventEmitter.emit('subscription.retention.offer_declined', {
      subscriptionId: offer.subscriptionId,
      offerId: offer.id,
      offerType: offer.type,
      cancellationReason: offer.cancellationReason,
    });

    this.logger.log(`Retention offer ${offer.id} declined`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // OFFER APPLICATION
  // ═══════════════════════════════════════════════════════════════════════════════

  private async applyDiscountOffer(
    subscription: Subscription,
    discountPct: number,
  ): Promise<Subscription> {
    // Store discount in metadata - would be applied during billing
    const metadata = (subscription.metadata as Record<string, unknown>) || {};

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        metadata: {
          ...metadata,
          retentionDiscount: {
            percentage: discountPct,
            appliedAt: new Date().toISOString(),
            reason: 'retention_offer',
          },
        },
      },
    });
  }

  private async applyDownsellOffer(
    subscription: Subscription,
    newPlanId: string,
  ): Promise<Subscription> {
    const newPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan) {
      throw new NotFoundException(`Plan ${newPlanId} not found`);
    }

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        subscriptionPlanId: newPlanId,
        planAmount: newPlan.basePriceMonthly,
      },
    });
  }

  private async applyPauseOffer(
    subscription: Subscription,
    pauseDays: number,
  ): Promise<Subscription> {
    const resumeDate = new Date();
    resumeDate.setDate(resumeDate.getDate() + pauseDays);

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.PAUSED,
        pausedAt: new Date(),
        pauseResumeAt: resumeDate,
      },
    });
  }

  private async applyFreePeriodOffer(
    subscription: Subscription,
    freePeriods: number,
  ): Promise<Subscription> {
    const metadata = (subscription.metadata as Record<string, unknown>) || {};

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        metadata: {
          ...metadata,
          freePeriods: {
            remaining: freePeriods,
            appliedAt: new Date().toISOString(),
            reason: 'retention_offer',
          },
        },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // WIN-BACK CAMPAIGNS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Create a win-back campaign for cancelled subscriptions
   */
  async createWinBackCampaign(dto: CreateWinBackCampaignDto): Promise<WinBackCampaign> {
    const campaign: WinBackCampaign = {
      id: this.generateCampaignId(),
      companyId: dto.companyId,
      name: dto.name,
      status: WinBackCampaignStatus.DRAFT,
      targetReasons: dto.targetReasons,
      minDaysSinceCancellation: dto.minDaysSinceCancellation,
      maxDaysSinceCancellation: dto.maxDaysSinceCancellation,
      targetPlanIds: dto.targetPlanIds,
      offerType: dto.offerType,
      discountPct: dto.discountPct,
      freePeriods: dto.freePeriods,
      offerValidDays: dto.offerValidDays,
      sentCount: 0,
      acceptedCount: 0,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      createdAt: new Date(),
    };

    this.winBackCampaigns.set(campaign.id, campaign);

    this.eventEmitter.emit('subscription.winback.campaign_created', {
      campaignId: campaign.id,
      companyId: campaign.companyId,
      name: campaign.name,
    });

    this.logger.log(`Win-back campaign created: ${campaign.id} - ${campaign.name}`);

    return campaign;
  }

  /**
   * Activate a win-back campaign
   */
  async activateWinBackCampaign(campaignId: string): Promise<WinBackCampaign> {
    const campaign = this.winBackCampaigns.get(campaignId);

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    campaign.status = WinBackCampaignStatus.ACTIVE;
    this.winBackCampaigns.set(campaignId, campaign);

    // Find eligible cancelled subscriptions
    const eligibleSubscriptions = await this.findWinBackEligible(campaign);

    this.eventEmitter.emit('subscription.winback.campaign_activated', {
      campaignId: campaign.id,
      eligibleCount: eligibleSubscriptions.length,
    });

    this.logger.log(
      `Win-back campaign ${campaign.id} activated, ${eligibleSubscriptions.length} eligible`,
    );

    return campaign;
  }

  /**
   * Find subscriptions eligible for win-back campaign
   */
  async findWinBackEligible(campaign: WinBackCampaign): Promise<Subscription[]> {
    const now = new Date();
    const minDate = new Date(now);
    minDate.setDate(minDate.getDate() - campaign.maxDaysSinceCancellation);

    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() - campaign.minDaysSinceCancellation);

    const where: Prisma.SubscriptionWhereInput = {
      companyId: campaign.companyId,
      status: SubscriptionStatus.CANCELED,
      canceledAt: {
        gte: minDate,
        lte: maxDate,
      },
    };

    if (campaign.targetPlanIds && campaign.targetPlanIds.length > 0) {
      where.subscriptionPlanId = { in: campaign.targetPlanIds };
    }

    // Filter by cancellation reason from metadata
    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: { customer: true, subscriptionPlan: true },
    });

    // Filter by cancellation reason if specified
    if (campaign.targetReasons.length > 0) {
      return subscriptions.filter((sub) => {
        const metadata = sub.metadata as Record<string, unknown>;
        const reason = metadata?.cancellationReason as CancellationReason;
        return campaign.targetReasons.includes(reason);
      });
    }

    return subscriptions;
  }

  /**
   * Send win-back offer to a subscription
   */
  async sendWinBackOffer(
    campaignId: string,
    subscriptionId: string,
  ): Promise<RetentionOffer> {
    const campaign = this.winBackCampaigns.get(campaignId);

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { customer: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + campaign.offerValidDays);

    const offer: RetentionOffer = {
      id: this.generateOfferId(),
      subscriptionId: subscription.id,
      type: campaign.offerType,
      status: RetentionOfferStatus.PRESENTED,
      discountPct: campaign.discountPct,
      freePeriods: campaign.freePeriods,
      presentedAt: now,
      expiresAt,
      createdAt: now,
    };

    this.retentionOffers.set(offer.id, offer);

    // Update campaign stats
    campaign.sentCount++;
    this.winBackCampaigns.set(campaignId, campaign);

    this.eventEmitter.emit('subscription.winback.offer_sent', {
      campaignId: campaign.id,
      subscriptionId: subscription.id,
      customerId: subscription.customerId,
      offerId: offer.id,
    });

    this.logger.log(
      `Win-back offer sent: campaign ${campaignId}, subscription ${subscriptionId}`,
    );

    return offer;
  }

  /**
   * Accept win-back offer and reactivate subscription
   */
  async acceptWinBackOffer(offerId: string): Promise<Subscription> {
    const offer = this.retentionOffers.get(offerId);

    if (!offer) {
      throw new NotFoundException(`Offer ${offerId} not found`);
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: offer.subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${offer.subscriptionId} not found`);
    }

    if (subscription.status !== SubscriptionStatus.CANCELED) {
      throw new BadRequestException('Subscription is not cancelled');
    }

    // Reactivate subscription
    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const metadata = (subscription.metadata as Record<string, unknown>) || {};

    const updateData: Prisma.SubscriptionUpdateInput = {
      status: SubscriptionStatus.ACTIVE,
      canceledAt: null,
      cancelReason: null,
      nextBillingDate,
      metadata: {
        ...metadata,
        winBackOffer: {
          offerId: offer.id,
          acceptedAt: now.toISOString(),
          discountPct: offer.discountPct,
          freePeriods: offer.freePeriods,
        },
        reactivatedAt: now.toISOString(),
      },
    };

    // Apply offer benefits
    if (offer.discountPct) {
      updateData.metadata = {
        ...updateData.metadata as object,
        retentionDiscount: {
          percentage: offer.discountPct,
          appliedAt: now.toISOString(),
          reason: 'winback_offer',
        },
      };
    }

    if (offer.freePeriods) {
      updateData.metadata = {
        ...updateData.metadata as object,
        freePeriods: {
          remaining: offer.freePeriods,
          appliedAt: now.toISOString(),
          reason: 'winback_offer',
        },
      };
    }

    const reactivatedSubscription = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: updateData,
    });

    // Update offer status
    offer.status = RetentionOfferStatus.ACCEPTED;
    offer.respondedAt = now;
    this.retentionOffers.set(offer.id, offer);

    this.eventEmitter.emit('subscription.winback.offer_accepted', {
      subscriptionId: subscription.id,
      offerId: offer.id,
    });

    this.logger.log(`Win-back offer accepted, subscription ${subscription.id} reactivated`);

    return reactivatedSubscription;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CANCELLATION FLOW CONFIG
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Configure cancellation flow for a company
   */
  async configureCancellationFlow(
    companyId: string,
    config: Partial<CancellationFlowConfig>,
  ): Promise<CancellationFlowConfig> {
    const existing = this.cancellationFlowConfigs.get(companyId);

    const updated: CancellationFlowConfig = {
      companyId,
      showReasonSelector: config.showReasonSelector ?? existing?.showReasonSelector ?? true,
      showRetentionOffers: config.showRetentionOffers ?? existing?.showRetentionOffers ?? true,
      showPauseOption: config.showPauseOption ?? existing?.showPauseOption ?? true,
      showDownsellOption: config.showDownsellOption ?? existing?.showDownsellOption ?? true,
      showDiscountOption: config.showDiscountOption ?? existing?.showDiscountOption ?? true,
      pauseMaxDays: config.pauseMaxDays ?? existing?.pauseMaxDays ?? 30,
      discountPct: config.discountPct ?? existing?.discountPct ?? 20,
      discountDurationCycles: config.discountDurationCycles ?? existing?.discountDurationCycles ?? 3,
      customMessages: config.customMessages ?? existing?.customMessages ?? {} as Record<CancellationReason, string>,
    };

    this.cancellationFlowConfigs.set(companyId, updated);

    this.logger.log(`Cancellation flow configured for company ${companyId}`);

    return updated;
  }

  /**
   * Get cancellation flow config for a company
   */
  getCancellationFlowConfig(companyId: string): CancellationFlowConfig {
    return this.cancellationFlowConfigs.get(companyId) || {
      companyId,
      showReasonSelector: true,
      showRetentionOffers: true,
      showPauseOption: true,
      showDownsellOption: true,
      showDiscountOption: true,
      pauseMaxDays: 30,
      discountPct: 20,
      discountDurationCycles: 3,
      customMessages: {} as Record<CancellationReason, string>,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get retention statistics for a company
   */
  async getRetentionStats(companyId: string): Promise<RetentionStats> {
    // Get all offers for company subscriptions
    const companyOffers = Array.from(this.retentionOffers.values()).filter(
      async (offer) => {
        const sub = await this.prisma.subscription.findUnique({
          where: { id: offer.subscriptionId },
          select: { companyId: true },
        });
        return sub?.companyId === companyId;
      },
    );

    const presentedOffers = companyOffers.filter(
      (o) => o.status !== RetentionOfferStatus.PENDING,
    );
    const acceptedOffers = companyOffers.filter(
      (o) => o.status === RetentionOfferStatus.ACCEPTED,
    );

    // Calculate by type
    const offerTypes = Object.values(RetentionOfferType);
    const offersByType: Record<RetentionOfferType, { presented: number; accepted: number; acceptanceRate: number }> =
      {} as Record<RetentionOfferType, { presented: number; accepted: number; acceptanceRate: number }>;

    for (const type of offerTypes) {
      const typePresented = presentedOffers.filter((o) => o.type === type).length;
      const typeAccepted = acceptedOffers.filter((o) => o.type === type).length;
      offersByType[type] = {
        presented: typePresented,
        accepted: typeAccepted,
        acceptanceRate: typePresented > 0 ? typeAccepted / typePresented : 0,
      };
    }

    // Calculate by reason
    const reasons = Object.values(CancellationReason);
    const cancellationsByReason: Record<CancellationReason, number> =
      {} as Record<CancellationReason, number>;

    for (const reason of reasons) {
      cancellationsByReason[reason] = companyOffers.filter(
        (o) => o.cancellationReason === reason,
      ).length;
    }

    // Win-back stats
    const companyCampaigns = Array.from(this.winBackCampaigns.values()).filter(
      (c) => c.companyId === companyId,
    );

    const totalSent = companyCampaigns.reduce((sum, c) => sum + c.sentCount, 0);
    const totalAccepted = companyCampaigns.reduce((sum, c) => sum + c.acceptedCount, 0);

    return {
      totalCancellationAttempts: presentedOffers.length,
      savedByCancellationFlow: acceptedOffers.length,
      saveRate: presentedOffers.length > 0
        ? acceptedOffers.length / presentedOffers.length
        : 0,
      offersByType,
      cancellationsByReason,
      winBackStats: {
        totalCampaigns: companyCampaigns.length,
        activeCampaigns: companyCampaigns.filter(
          (c) => c.status === WinBackCampaignStatus.ACTIVE,
        ).length,
        totalSent,
        totalAccepted,
        winBackRate: totalSent > 0 ? totalAccepted / totalSent : 0,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get pending offers for a subscription
   */
  async getPendingOffers(subscriptionId: string): Promise<RetentionOffer[]> {
    return Array.from(this.retentionOffers.values()).filter(
      (offer) =>
        offer.subscriptionId === subscriptionId &&
        offer.status === RetentionOfferStatus.PRESENTED &&
        (!offer.expiresAt || offer.expiresAt > new Date()),
    );
  }

  /**
   * Get win-back campaigns for a company
   */
  async getWinBackCampaigns(companyId: string): Promise<WinBackCampaign[]> {
    return Array.from(this.winBackCampaigns.values()).filter(
      (campaign) => campaign.companyId === companyId,
    );
  }

  /**
   * Get active win-back campaigns
   */
  async getActiveWinBackCampaigns(companyId: string): Promise<WinBackCampaign[]> {
    return Array.from(this.winBackCampaigns.values()).filter(
      (campaign) =>
        campaign.companyId === companyId &&
        campaign.status === WinBackCampaignStatus.ACTIVE,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private generateOfferId(): string {
    return `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCampaignId(): string {
    return `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
