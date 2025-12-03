/**
 * Subscription Gifting Service
 *
 * Handles gift subscription functionality:
 * - Gift purchases and redemption
 * - Gift codes and delivery
 * - Gift subscription lifecycle
 * - Gift message customization
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionPlan,
  Customer,
  Prisma,
} from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export enum GiftStatus {
  PENDING = 'PENDING',           // Gift purchased, not yet sent
  SENT = 'SENT',                 // Gift sent to recipient
  VIEWED = 'VIEWED',             // Recipient has viewed the gift
  REDEEMED = 'REDEEMED',         // Gift has been redeemed
  EXPIRED = 'EXPIRED',           // Gift code expired
  REFUNDED = 'REFUNDED',         // Gift was refunded
}

export enum GiftDeliveryMethod {
  EMAIL = 'EMAIL',               // Send via email
  SMS = 'SMS',                   // Send via SMS
  PRINT = 'PRINT',               // Generate printable card
  SCHEDULED = 'SCHEDULED',       // Schedule for future delivery
}

export interface GiftSubscription {
  id: string;
  companyId: string;
  planId: string;

  // Purchaser info
  purchaserId: string;
  purchaserEmail: string;
  purchaserName: string;

  // Recipient info
  recipientEmail: string;
  recipientName: string;
  recipientPhone?: string;

  // Gift details
  giftCode: string;
  status: GiftStatus;
  giftMessage?: string;

  // Delivery
  deliveryMethod: GiftDeliveryMethod;
  scheduledDeliveryDate?: Date;
  deliveredAt?: Date;

  // Redemption
  redeemedAt?: Date;
  redeemedByCustomerId?: string;
  subscriptionId?: string;

  // Duration
  durationMonths: number;
  expiresAt: Date;

  // Payment
  amountPaid: number;
  currency: string;
  transactionId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseGiftDto {
  companyId: string;
  planId: string;
  purchaserId: string;
  purchaserEmail: string;
  purchaserName: string;
  recipientEmail: string;
  recipientName: string;
  recipientPhone?: string;
  giftMessage?: string;
  deliveryMethod: GiftDeliveryMethod;
  scheduledDeliveryDate?: Date;
  durationMonths: number;
  currency?: string;
}

export interface RedeemGiftDto {
  giftCode: string;
  customerId?: string;
  email?: string;
  createCustomer?: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  shippingAddressId?: string;
}

export interface GiftStats {
  totalPurchased: number;
  totalRedeemed: number;
  totalPending: number;
  totalExpired: number;
  totalRevenue: number;
  redemptionRate: number;
  averageGiftValue: number;
  popularPlans: Array<{
    planId: string;
    planName: string;
    count: number;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class SubscriptionGiftingService {
  private readonly logger = new Logger(SubscriptionGiftingService.name);

  // In-memory storage for gift subscriptions (would be database table in production)
  private giftSubscriptions: Map<string, GiftSubscription> = new Map();
  private giftCodeIndex: Map<string, string> = new Map(); // code -> gift id

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // GIFT PURCHASE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Purchase a gift subscription
   */
  async purchaseGift(dto: PurchaseGiftDto): Promise<GiftSubscription> {
    // Validate plan exists and is giftable
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${dto.planId} not found`);
    }

    // Check if plan allows gifting via metadata
    const planMetadata = plan.metadata as Record<string, unknown> || {};
    if (planMetadata.isGiftable === false) {
      throw new BadRequestException('This plan is not available for gifting');
    }

    // Calculate price for gift duration
    const pricePerMonth = Number(plan.basePriceMonthly);
    const totalAmount = pricePerMonth * dto.durationMonths;

    // Generate unique gift code
    const giftCode = this.generateGiftCode();

    // Calculate expiration (typically 1 year from purchase)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const gift: GiftSubscription = {
      id: this.generateGiftId(),
      companyId: dto.companyId,
      planId: dto.planId,
      purchaserId: dto.purchaserId,
      purchaserEmail: dto.purchaserEmail,
      purchaserName: dto.purchaserName,
      recipientEmail: dto.recipientEmail,
      recipientName: dto.recipientName,
      recipientPhone: dto.recipientPhone,
      giftCode,
      status: GiftStatus.PENDING,
      giftMessage: dto.giftMessage,
      deliveryMethod: dto.deliveryMethod,
      scheduledDeliveryDate: dto.scheduledDeliveryDate,
      durationMonths: dto.durationMonths,
      expiresAt,
      amountPaid: totalAmount,
      currency: dto.currency || 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.giftSubscriptions.set(gift.id, gift);
    this.giftCodeIndex.set(giftCode, gift.id);

    // Emit event
    this.eventEmitter.emit('subscription.gift.purchased', {
      giftId: gift.id,
      planId: gift.planId,
      purchaserId: gift.purchaserId,
      recipientEmail: gift.recipientEmail,
      amount: totalAmount,
    });

    this.logger.log(
      `Gift subscription purchased: ${gift.id} for ${gift.recipientEmail}`,
    );

    // Schedule delivery if immediate or send now
    if (dto.deliveryMethod !== GiftDeliveryMethod.SCHEDULED || !dto.scheduledDeliveryDate) {
      await this.sendGift(gift.id);
    }

    return gift;
  }

  /**
   * Send gift notification to recipient
   */
  async sendGift(giftId: string): Promise<GiftSubscription> {
    const gift = this.giftSubscriptions.get(giftId);

    if (!gift) {
      throw new NotFoundException(`Gift ${giftId} not found`);
    }

    if (gift.status !== GiftStatus.PENDING) {
      throw new BadRequestException(`Gift is already ${gift.status}`);
    }

    gift.status = GiftStatus.SENT;
    gift.deliveredAt = new Date();
    gift.updatedAt = new Date();
    this.giftSubscriptions.set(giftId, gift);

    // Emit event for notification service
    this.eventEmitter.emit('subscription.gift.sent', {
      giftId: gift.id,
      recipientEmail: gift.recipientEmail,
      recipientName: gift.recipientName,
      giftCode: gift.giftCode,
      giftMessage: gift.giftMessage,
      purchaserName: gift.purchaserName,
      deliveryMethod: gift.deliveryMethod,
    });

    this.logger.log(`Gift ${gift.id} sent to ${gift.recipientEmail}`);

    return gift;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // GIFT REDEMPTION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Look up gift by code (for preview before redemption)
   */
  async lookupGift(giftCode: string): Promise<{
    gift: GiftSubscription;
    plan: SubscriptionPlan;
  } | null> {
    const giftId = this.giftCodeIndex.get(giftCode.toUpperCase());

    if (!giftId) {
      return null;
    }

    const gift = this.giftSubscriptions.get(giftId);
    if (!gift) {
      return null;
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: gift.planId },
    });

    if (!plan) {
      return null;
    }

    // Mark as viewed if just sent
    if (gift.status === GiftStatus.SENT) {
      gift.status = GiftStatus.VIEWED;
      gift.updatedAt = new Date();
      this.giftSubscriptions.set(giftId, gift);
    }

    return { gift, plan };
  }

  /**
   * Redeem a gift subscription
   */
  async redeemGift(dto: RedeemGiftDto): Promise<Subscription> {
    const giftId = this.giftCodeIndex.get(dto.giftCode.toUpperCase());

    if (!giftId) {
      throw new NotFoundException('Invalid gift code');
    }

    const gift = this.giftSubscriptions.get(giftId);

    if (!gift) {
      throw new NotFoundException('Gift not found');
    }

    if (gift.status === GiftStatus.REDEEMED) {
      throw new BadRequestException('This gift has already been redeemed');
    }

    if (gift.status === GiftStatus.EXPIRED) {
      throw new BadRequestException('This gift code has expired');
    }

    if (gift.status === GiftStatus.REFUNDED) {
      throw new BadRequestException('This gift has been refunded');
    }

    if (gift.expiresAt < new Date()) {
      gift.status = GiftStatus.EXPIRED;
      gift.updatedAt = new Date();
      this.giftSubscriptions.set(giftId, gift);
      throw new BadRequestException('This gift code has expired');
    }

    // Get or create customer
    let customerId = dto.customerId;

    if (!customerId && dto.createCustomer) {
      // Create new customer for redemption
      const newCustomer = await this.prisma.customer.create({
        data: {
          companyId: gift.companyId,
          email: dto.createCustomer.email,
          firstName: dto.createCustomer.firstName,
          lastName: dto.createCustomer.lastName,
          phone: dto.createCustomer.phone,
        },
      });
      customerId = newCustomer.id;
    }

    if (!customerId) {
      throw new BadRequestException('Customer ID or customer details required');
    }

    // Get plan
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: gift.planId },
    });

    if (!plan) {
      throw new NotFoundException('Gift plan no longer exists');
    }

    // Calculate end date based on gift duration
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + gift.durationMonths);

    // Create subscription
    const subscription = await this.prisma.subscription.create({
      data: {
        companyId: gift.companyId,
        customerId,
        subscriptionPlanId: gift.planId,
        planName: plan.name,
        planAmount: plan.basePriceMonthly,
        interval: plan.defaultInterval,
        status: SubscriptionStatus.ACTIVE,
        currency: gift.currency,
        nextBillingDate: endDate, // First billing after gift period ends
        currentPeriodStart: new Date(),
        currentPeriodEnd: endDate,
        isGift: true,
        giftPurchaserId: gift.purchaserId,
        giftCyclesRemaining: gift.durationMonths,
        shippingAddressId: dto.shippingAddressId,
        metadata: {
          giftId: gift.id,
          giftCode: gift.giftCode,
          giftPurchaserName: gift.purchaserName,
          giftMessage: gift.giftMessage,
          startedAt: new Date().toISOString(),
        },
      },
    });

    // Update gift status
    gift.status = GiftStatus.REDEEMED;
    gift.redeemedAt = new Date();
    gift.redeemedByCustomerId = customerId;
    gift.subscriptionId = subscription.id;
    gift.updatedAt = new Date();
    this.giftSubscriptions.set(giftId, gift);

    // Emit events
    this.eventEmitter.emit('subscription.gift.redeemed', {
      giftId: gift.id,
      subscriptionId: subscription.id,
      customerId,
      planId: gift.planId,
    });

    this.eventEmitter.emit('subscription.created', {
      subscriptionId: subscription.id,
      customerId,
      planId: gift.planId,
      isGift: true,
    });

    this.logger.log(
      `Gift ${gift.id} redeemed, subscription ${subscription.id} created`,
    );

    return subscription;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // GIFT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Resend gift notification
   */
  async resendGift(giftId: string): Promise<GiftSubscription> {
    const gift = this.giftSubscriptions.get(giftId);

    if (!gift) {
      throw new NotFoundException(`Gift ${giftId} not found`);
    }

    if (gift.status === GiftStatus.REDEEMED) {
      throw new BadRequestException('Cannot resend redeemed gift');
    }

    if (gift.status === GiftStatus.REFUNDED) {
      throw new BadRequestException('Cannot resend refunded gift');
    }

    // Emit resend event
    this.eventEmitter.emit('subscription.gift.resent', {
      giftId: gift.id,
      recipientEmail: gift.recipientEmail,
      giftCode: gift.giftCode,
    });

    this.logger.log(`Gift ${gift.id} resent to ${gift.recipientEmail}`);

    return gift;
  }

  /**
   * Update recipient info before redemption
   */
  async updateRecipient(
    giftId: string,
    recipientEmail: string,
    recipientName: string,
  ): Promise<GiftSubscription> {
    const gift = this.giftSubscriptions.get(giftId);

    if (!gift) {
      throw new NotFoundException(`Gift ${giftId} not found`);
    }

    if (gift.status === GiftStatus.REDEEMED) {
      throw new BadRequestException('Cannot update redeemed gift');
    }

    gift.recipientEmail = recipientEmail;
    gift.recipientName = recipientName;
    gift.updatedAt = new Date();
    this.giftSubscriptions.set(giftId, gift);

    this.logger.log(`Gift ${gift.id} recipient updated to ${recipientEmail}`);

    return gift;
  }

  /**
   * Extend gift expiration
   */
  async extendExpiration(
    giftId: string,
    additionalDays: number,
  ): Promise<GiftSubscription> {
    const gift = this.giftSubscriptions.get(giftId);

    if (!gift) {
      throw new NotFoundException(`Gift ${giftId} not found`);
    }

    if (gift.status === GiftStatus.REDEEMED) {
      throw new BadRequestException('Cannot extend redeemed gift');
    }

    const newExpiration = new Date(gift.expiresAt);
    newExpiration.setDate(newExpiration.getDate() + additionalDays);
    gift.expiresAt = newExpiration;
    gift.updatedAt = new Date();

    // If was expired, mark as sent again
    if (gift.status === GiftStatus.EXPIRED) {
      gift.status = GiftStatus.SENT;
    }

    this.giftSubscriptions.set(giftId, gift);

    this.logger.log(`Gift ${gift.id} extended by ${additionalDays} days`);

    return gift;
  }

  /**
   * Refund a gift
   */
  async refundGift(giftId: string, reason?: string): Promise<GiftSubscription> {
    const gift = this.giftSubscriptions.get(giftId);

    if (!gift) {
      throw new NotFoundException(`Gift ${giftId} not found`);
    }

    if (gift.status === GiftStatus.REDEEMED) {
      throw new BadRequestException('Cannot refund redeemed gift');
    }

    gift.status = GiftStatus.REFUNDED;
    gift.updatedAt = new Date();
    this.giftSubscriptions.set(giftId, gift);

    this.eventEmitter.emit('subscription.gift.refunded', {
      giftId: gift.id,
      amount: gift.amountPaid,
      reason,
    });

    this.logger.log(`Gift ${gift.id} refunded`);

    return gift;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get gift by ID
   */
  async getGift(giftId: string): Promise<GiftSubscription | null> {
    return this.giftSubscriptions.get(giftId) || null;
  }

  /**
   * Get gifts purchased by a customer
   */
  async getGiftsPurchasedBy(purchaserId: string): Promise<GiftSubscription[]> {
    return Array.from(this.giftSubscriptions.values()).filter(
      (gift) => gift.purchaserId === purchaserId,
    );
  }

  /**
   * Get gifts for a recipient email
   */
  async getGiftsForRecipient(recipientEmail: string): Promise<GiftSubscription[]> {
    return Array.from(this.giftSubscriptions.values()).filter(
      (gift) =>
        gift.recipientEmail.toLowerCase() === recipientEmail.toLowerCase() &&
        gift.status !== GiftStatus.REFUNDED,
    );
  }

  /**
   * Get pending gifts (for scheduled delivery)
   */
  async getPendingGifts(companyId: string): Promise<GiftSubscription[]> {
    return Array.from(this.giftSubscriptions.values()).filter(
      (gift) =>
        gift.companyId === companyId &&
        gift.status === GiftStatus.PENDING,
    );
  }

  /**
   * Get gifts ready for scheduled delivery
   */
  async getGiftsForScheduledDelivery(): Promise<GiftSubscription[]> {
    const now = new Date();
    return Array.from(this.giftSubscriptions.values()).filter(
      (gift) =>
        gift.status === GiftStatus.PENDING &&
        gift.deliveryMethod === GiftDeliveryMethod.SCHEDULED &&
        gift.scheduledDeliveryDate &&
        gift.scheduledDeliveryDate <= now,
    );
  }

  /**
   * Get expiring gifts (for reminder notifications)
   */
  async getExpiringGifts(
    companyId: string,
    daysUntilExpiry: number = 7,
  ): Promise<GiftSubscription[]> {
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + daysUntilExpiry);

    return Array.from(this.giftSubscriptions.values()).filter(
      (gift) =>
        gift.companyId === companyId &&
        (gift.status === GiftStatus.SENT || gift.status === GiftStatus.VIEWED) &&
        gift.expiresAt <= expiryThreshold &&
        gift.expiresAt > new Date(),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get gift statistics for a company
   */
  async getGiftStats(companyId: string): Promise<GiftStats> {
    const companyGifts = Array.from(this.giftSubscriptions.values()).filter(
      (gift) => gift.companyId === companyId,
    );

    const totalPurchased = companyGifts.length;
    const totalRedeemed = companyGifts.filter(
      (g) => g.status === GiftStatus.REDEEMED,
    ).length;
    const totalPending = companyGifts.filter(
      (g) => g.status === GiftStatus.PENDING || g.status === GiftStatus.SENT || g.status === GiftStatus.VIEWED,
    ).length;
    const totalExpired = companyGifts.filter(
      (g) => g.status === GiftStatus.EXPIRED,
    ).length;
    const totalRevenue = companyGifts
      .filter((g) => g.status !== GiftStatus.REFUNDED)
      .reduce((sum, g) => sum + g.amountPaid, 0);

    // Plan popularity
    const planCounts = new Map<string, number>();
    for (const gift of companyGifts) {
      const count = planCounts.get(gift.planId) || 0;
      planCounts.set(gift.planId, count + 1);
    }

    // Get plan names
    const planIds = Array.from(planCounts.keys());
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { id: { in: planIds } },
      select: { id: true, name: true },
    });

    const planNameMap = new Map(plans.map((p) => [p.id, p.name]));

    const popularPlans = Array.from(planCounts.entries())
      .map(([planId, count]) => ({
        planId,
        planName: planNameMap.get(planId) || 'Unknown',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalPurchased,
      totalRedeemed,
      totalPending,
      totalExpired,
      totalRevenue,
      redemptionRate: totalPurchased > 0 ? totalRedeemed / totalPurchased : 0,
      averageGiftValue: totalPurchased > 0 ? totalRevenue / totalPurchased : 0,
      popularPlans,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SCHEDULED TASKS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Process scheduled gift deliveries
   */
  async processScheduledDeliveries(): Promise<number> {
    const gifts = await this.getGiftsForScheduledDelivery();
    let sent = 0;

    for (const gift of gifts) {
      try {
        await this.sendGift(gift.id);
        sent++;
      } catch (error) {
        this.logger.error(`Failed to send scheduled gift ${gift.id}:`, error);
      }
    }

    if (sent > 0) {
      this.logger.log(`Processed ${sent} scheduled gift deliveries`);
    }

    return sent;
  }

  /**
   * Expire old gifts
   */
  async expireOldGifts(): Promise<number> {
    const now = new Date();
    let expired = 0;

    for (const [id, gift] of this.giftSubscriptions) {
      if (
        (gift.status === GiftStatus.PENDING ||
          gift.status === GiftStatus.SENT ||
          gift.status === GiftStatus.VIEWED) &&
        gift.expiresAt < now
      ) {
        gift.status = GiftStatus.EXPIRED;
        gift.updatedAt = now;
        this.giftSubscriptions.set(id, gift);
        expired++;

        this.eventEmitter.emit('subscription.gift.expired', {
          giftId: gift.id,
          recipientEmail: gift.recipientEmail,
        });
      }
    }

    if (expired > 0) {
      this.logger.log(`Expired ${expired} unredeemed gifts`);
    }

    return expired;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private generateGiftId(): string {
    return `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateGiftCode(): string {
    // Generate readable gift code like "GIFT-XXXX-XXXX"
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
    let code = 'GIFT-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += '-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
