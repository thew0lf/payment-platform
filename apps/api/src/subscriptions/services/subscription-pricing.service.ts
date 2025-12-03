/**
 * Subscription Pricing Service
 *
 * Handles pricing features:
 * - Loyalty tier pricing (automatic discounts based on tenure)
 * - Price lock (guarantee current price for X cycles)
 * - Early renewal with proration
 * - Discount/coupon application
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Decimal } from '@prisma/client/runtime/library';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LoyaltyTier {
  afterRebills: number;
  discountPct: number;
  name?: string;
}

export interface CalculatedPrice {
  basePrice: number;
  loyaltyDiscount: number;
  loyaltyTier: number | null;
  couponDiscount: number;
  finalPrice: number;
  currency: string;
  breakdown: PriceBreakdownItem[];
}

export interface PriceBreakdownItem {
  label: string;
  amount: number;
  type: 'base' | 'discount' | 'adjustment';
}

export interface ApplyLoyaltyDto {
  subscriptionId: string;
}

export interface LockPriceDto {
  subscriptionId: string;
  cycles?: number; // Null = lock forever
}

export interface UnlockPriceDto {
  subscriptionId: string;
}

export interface EarlyRenewalDto {
  subscriptionId: string;
  prorate?: boolean;
}

export interface PricingStats {
  subscriptionsWithLoyalty: number;
  subscriptionsWithPriceLock: number;
  totalLoyaltyDiscounts: number;
  avgLoyaltyTier: number;
}

@Injectable()
export class SubscriptionPricingService {
  private readonly logger = new Logger(SubscriptionPricingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOYALTY PRICING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Calculate the current loyalty tier for a subscription
   */
  async calculateLoyaltyTier(subscriptionId: string): Promise<{
    tier: number | null;
    discountPct: number;
    nextTierAt: number | null;
    nextTierDiscount: number | null;
  }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    const plan = subscription.subscriptionPlan;
    if (!plan?.loyaltyEnabled || !plan.loyaltyTiers) {
      return { tier: null, discountPct: 0, nextTierAt: null, nextTierDiscount: null };
    }

    const tiers = plan.loyaltyTiers as unknown as LoyaltyTier[];
    const cycleCount = subscription.cycleCount;

    // Find current tier
    let currentTier: number | null = null;
    let currentDiscount = 0;

    for (let i = tiers.length - 1; i >= 0; i--) {
      if (cycleCount >= tiers[i].afterRebills) {
        currentTier = i;
        currentDiscount = tiers[i].discountPct;
        break;
      }
    }

    // Find next tier
    let nextTierAt: number | null = null;
    let nextTierDiscount: number | null = null;

    if (currentTier === null && tiers.length > 0) {
      nextTierAt = tiers[0].afterRebills;
      nextTierDiscount = tiers[0].discountPct;
    } else if (currentTier !== null && currentTier < tiers.length - 1) {
      nextTierAt = tiers[currentTier + 1].afterRebills;
      nextTierDiscount = tiers[currentTier + 1].discountPct;
    }

    return {
      tier: currentTier,
      discountPct: currentDiscount,
      nextTierAt,
      nextTierDiscount,
    };
  }

  /**
   * Apply loyalty pricing to a subscription (update the stored discount)
   */
  async applyLoyaltyPricing(dto: ApplyLoyaltyDto): Promise<any> {
    const loyaltyInfo = await this.calculateLoyaltyTier(dto.subscriptionId);

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: {
        loyaltyTier: loyaltyInfo.tier,
        loyaltyDiscountPct: loyaltyInfo.discountPct,
        loyaltyLockedAt: loyaltyInfo.tier !== null ? new Date() : null,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        subscriptionPlan: true,
      },
    });

    if (loyaltyInfo.tier !== null) {
      this.eventEmitter.emit('subscription.loyalty.tier_updated', {
        subscriptionId: dto.subscriptionId,
        tier: loyaltyInfo.tier,
        discountPct: loyaltyInfo.discountPct,
      });
    }

    return updated;
  }

  /**
   * Check and upgrade loyalty tiers for all eligible subscriptions
   * (Called by cron job after rebill processing)
   */
  async processLoyaltyUpgrades(companyId?: string): Promise<number> {
    // Find subscriptions with loyalty-enabled plans that might need upgrade
    const where: any = {
      deletedAt: null,
      status: 'ACTIVE',
      subscriptionPlan: {
        loyaltyEnabled: true,
        loyaltyTiers: { not: null },
      },
    };
    if (companyId) where.companyId = companyId;

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: { subscriptionPlan: true },
    });

    let upgradeCount = 0;

    for (const sub of subscriptions) {
      const plan = sub.subscriptionPlan;
      if (!plan) continue;

      const tiers = plan.loyaltyTiers as unknown as LoyaltyTier[];
      const currentTier = sub.loyaltyTier;
      const cycleCount = sub.cycleCount;

      // Check if eligible for upgrade
      let newTier: number | null = null;
      for (let i = tiers.length - 1; i >= 0; i--) {
        if (cycleCount >= tiers[i].afterRebills) {
          newTier = i;
          break;
        }
      }

      if (newTier !== null && (currentTier === null || newTier > currentTier)) {
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            loyaltyTier: newTier,
            loyaltyDiscountPct: tiers[newTier].discountPct,
            loyaltyLockedAt: new Date(),
          },
        });

        this.eventEmitter.emit('subscription.loyalty.upgraded', {
          subscriptionId: sub.id,
          previousTier: currentTier,
          newTier,
          discountPct: tiers[newTier].discountPct,
        });

        upgradeCount++;
      }
    }

    return upgradeCount;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRICE LOCK
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Lock the current price for a subscription
   */
  async lockPrice(dto: LockPriceDto): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    }

    const plan = subscription.subscriptionPlan;
    if (plan && !plan.priceLockEnabled) {
      throw new BadRequestException('Price locking is not enabled for this plan');
    }

    const now = new Date();
    let priceLockedUntil: Date | null = null;

    if (dto.cycles) {
      // Calculate lock end date based on cycles
      priceLockedUntil = this.calculateDateAfterCycles(
        now,
        subscription.interval,
        dto.cycles,
      );
    }

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: {
        priceLocked: true,
        priceLockedAmount: subscription.planAmount,
        priceLockCycles: dto.cycles || null,
        priceLockedUntil,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        subscriptionPlan: true,
      },
    });

    this.logger.log(`Locked price for subscription ${dto.subscriptionId} at ${subscription.planAmount}`);

    this.eventEmitter.emit('subscription.price.locked', {
      subscriptionId: dto.subscriptionId,
      lockedAmount: subscription.planAmount,
      cycles: dto.cycles,
      until: priceLockedUntil,
    });

    return updated;
  }

  /**
   * Unlock/remove price lock from a subscription
   */
  async unlockPrice(dto: UnlockPriceDto): Promise<any> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    }

    if (!subscription.priceLocked) {
      throw new BadRequestException('Subscription does not have a price lock');
    }

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: {
        priceLocked: false,
        priceLockedAmount: null,
        priceLockCycles: null,
        priceLockedUntil: null,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        subscriptionPlan: true,
      },
    });

    this.logger.log(`Unlocked price for subscription ${dto.subscriptionId}`);

    this.eventEmitter.emit('subscription.price.unlocked', {
      subscriptionId: dto.subscriptionId,
    });

    return updated;
  }

  /**
   * Check and expire price locks that have passed their duration
   */
  async processExpiredPriceLocks(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.subscription.updateMany({
      where: {
        priceLocked: true,
        priceLockedUntil: { lte: now },
      },
      data: {
        priceLocked: false,
        priceLockedAmount: null,
        priceLockCycles: null,
        priceLockedUntil: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} price locks`);
    }

    return result.count;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // EARLY RENEWAL
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Process early renewal for a subscription
   */
  async processEarlyRenewal(dto: EarlyRenewalDto): Promise<{
    subscription: any;
    proratedCredit: number;
    newPeriodStart: Date;
    newPeriodEnd: Date;
  }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: dto.subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${dto.subscriptionId} not found`);
    }

    if (subscription.status !== 'ACTIVE') {
      throw new BadRequestException('Only active subscriptions can do early renewal');
    }

    const plan = subscription.subscriptionPlan;
    if (plan && !plan.earlyRenewalEnabled) {
      throw new BadRequestException('Early renewal is not enabled for this plan');
    }

    const now = new Date();
    const shouldProrate = dto.prorate ?? (plan?.earlyRenewalProrate ?? true);

    // Calculate prorated credit
    let proratedCredit = 0;
    if (shouldProrate && subscription.currentPeriodEnd) {
      const periodStart = subscription.currentPeriodStart;
      const periodEnd = subscription.currentPeriodEnd;
      const totalDays = (periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000);
      const remainingDays = (periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

      if (remainingDays > 0 && totalDays > 0) {
        const dailyRate = Number(subscription.planAmount) / totalDays;
        proratedCredit = dailyRate * remainingDays;
      }
    }

    // Calculate new period
    const newPeriodStart = now;
    const newPeriodEnd = this.calculateDateAfterCycles(now, subscription.interval, 1);

    const updated = await this.prisma.subscription.update({
      where: { id: dto.subscriptionId },
      data: {
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
        nextBillingDate: newPeriodEnd,
        cycleCount: { increment: 1 },
        metadata: {
          ...(subscription.metadata as any || {}),
          lastEarlyRenewal: {
            at: now.toISOString(),
            proratedCredit,
            previousPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
          },
        },
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
        subscriptionPlan: true,
      },
    });

    this.logger.log(`Processed early renewal for subscription ${dto.subscriptionId}`);

    this.eventEmitter.emit('subscription.early_renewal', {
      subscriptionId: dto.subscriptionId,
      proratedCredit,
      newPeriodStart,
      newPeriodEnd,
    });

    return {
      subscription: updated,
      proratedCredit: Math.round(proratedCredit * 100) / 100,
      newPeriodStart,
      newPeriodEnd,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRICE CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Calculate the effective price for a subscription including all discounts
   */
  async calculateEffectivePrice(subscriptionId: string): Promise<CalculatedPrice> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    const basePrice = subscription.priceLocked
      ? Number(subscription.priceLockedAmount)
      : Number(subscription.planAmount);

    const breakdown: PriceBreakdownItem[] = [
      { label: 'Base Price', amount: basePrice, type: 'base' },
    ];

    let loyaltyDiscount = 0;
    if (subscription.loyaltyDiscountPct && Number(subscription.loyaltyDiscountPct) > 0) {
      loyaltyDiscount = basePrice * (Number(subscription.loyaltyDiscountPct) / 100);
      breakdown.push({
        label: `Loyalty Discount (${subscription.loyaltyDiscountPct}%)`,
        amount: -loyaltyDiscount,
        type: 'discount',
      });
    }

    // Coupon discounts would be calculated here if implemented
    const couponDiscount = 0;

    const finalPrice = Math.max(0, basePrice - loyaltyDiscount - couponDiscount);

    return {
      basePrice,
      loyaltyDiscount,
      loyaltyTier: subscription.loyaltyTier,
      couponDiscount,
      finalPrice: Math.round(finalPrice * 100) / 100,
      currency: subscription.currency,
      breakdown,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get pricing statistics
   */
  async getPricingStats(companyId?: string): Promise<PricingStats> {
    const where: any = { deletedAt: null };
    if (companyId) where.companyId = companyId;

    const [loyaltyCount, priceLockCount, loyaltyAgg] = await Promise.all([
      this.prisma.subscription.count({
        where: {
          ...where,
          loyaltyTier: { not: null },
        },
      }),
      this.prisma.subscription.count({
        where: {
          ...where,
          priceLocked: true,
        },
      }),
      this.prisma.subscription.aggregate({
        where: {
          ...where,
          loyaltyDiscountPct: { not: null },
        },
        _sum: { loyaltyDiscountPct: true },
        _avg: { loyaltyTier: true },
        _count: { _all: true },
      }),
    ]);

    return {
      subscriptionsWithLoyalty: loyaltyCount,
      subscriptionsWithPriceLock: priceLockCount,
      totalLoyaltyDiscounts: Number(loyaltyAgg._sum.loyaltyDiscountPct || 0),
      avgLoyaltyTier: Number(loyaltyAgg._avg.loyaltyTier || 0),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private calculateDateAfterCycles(start: Date, interval: string, cycles: number): Date {
    const result = new Date(start);

    for (let i = 0; i < cycles; i++) {
      switch (interval) {
        case 'DAILY':
          result.setDate(result.getDate() + 1);
          break;
        case 'WEEKLY':
          result.setDate(result.getDate() + 7);
          break;
        case 'BIWEEKLY':
          result.setDate(result.getDate() + 14);
          break;
        case 'MONTHLY':
          result.setMonth(result.getMonth() + 1);
          break;
        case 'QUARTERLY':
          result.setMonth(result.getMonth() + 3);
          break;
        case 'YEARLY':
          result.setFullYear(result.getFullYear() + 1);
          break;
        default:
          result.setMonth(result.getMonth() + 1);
      }
    }

    return result;
  }
}
