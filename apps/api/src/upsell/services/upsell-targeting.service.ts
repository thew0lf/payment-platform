import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsellType, UpsellUrgency } from '@prisma/client';
import {
  CustomerSegment,
  TargetedUpsell,
  TargetedUpsellProduct,
  UpsellConditions,
  UpsellOffer,
  UpsellTargetingRuleData,
} from '../types/upsell.types';

interface CartWithContext {
  id: string;
  companyId: string;
  customerId: string | null;
  grandTotal: number;
  items: {
    productId: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      price: number;
      categoryAssignments: { categoryId: string }[];
    };
  }[];
  customer?: {
    id: string;
    firstName?: string;
    orderCount?: number;
    lifetimeValue?: number;
  } | null;
}

interface ScoredUpsell {
  rule: UpsellTargetingRuleData;
  score: number;
  estimatedConversion: number;
}

@Injectable()
export class UpsellTargetingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get personalized upsell recommendations for a cart
   */
  async getTargetedUpsells(
    cartId: string,
    options?: { maxUpsells?: number; placements?: string[] },
  ): Promise<TargetedUpsell[]> {
    const cart = await this.getCartWithContext(cartId);
    if (!cart) {
      return [];
    }

    // Determine customer segments
    const segments = await this.getCustomerSegments(cart.customerId, cart);

    // Get applicable rules
    const rules = await this.getApplicableRules(cart, segments, options?.placements);

    // Score and rank upsells
    const scoredUpsells = await this.scoreUpsells(rules, cart);

    // Generate personalized messages
    const targetedUpsells = await this.generateTargetedUpsells(scoredUpsells, cart);

    return targetedUpsells.slice(0, options?.maxUpsells || 3);
  }

  /**
   * Create a new upsell targeting rule
   */
  async createTargetingRule(
    companyId: string,
    data: Omit<UpsellTargetingRuleData, 'id'>,
  ): Promise<UpsellTargetingRuleData> {
    const rule = await this.prisma.upsellTargetingRule.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        priority: data.priority,
        enabled: data.enabled,
        conditions: data.conditions as unknown as object,
        upsellType: data.upsellType,
        offer: data.offer as unknown as object,
        message: data.message,
        urgency: data.urgency,
        placements: data.placements,
        maxImpressions: data.maxImpressions,
        maxAcceptances: data.maxAcceptances,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
      },
    });

    return this.mapRuleToData(rule);
  }

  /**
   * Get all targeting rules for a company
   */
  async getTargetingRules(companyId: string): Promise<UpsellTargetingRuleData[]> {
    const rules = await this.prisma.upsellTargetingRule.findMany({
      where: { companyId },
      orderBy: { priority: 'asc' },
    });

    return rules.map(this.mapRuleToData);
  }

  /**
   * Update a targeting rule
   */
  async updateTargetingRule(
    ruleId: string,
    companyId: string,
    data: Partial<UpsellTargetingRuleData>,
  ): Promise<UpsellTargetingRuleData> {
    const rule = await this.prisma.upsellTargetingRule.update({
      where: { id: ruleId, companyId },
      data: {
        name: data.name,
        description: data.description,
        priority: data.priority,
        enabled: data.enabled,
        conditions: data.conditions as unknown as object,
        upsellType: data.upsellType,
        offer: data.offer as unknown as object,
        message: data.message,
        urgency: data.urgency,
        placements: data.placements,
        maxImpressions: data.maxImpressions,
        maxAcceptances: data.maxAcceptances,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
      },
    });

    return this.mapRuleToData(rule);
  }

  /**
   * Delete a targeting rule
   */
  async deleteTargetingRule(ruleId: string, companyId: string): Promise<void> {
    await this.prisma.upsellTargetingRule.delete({
      where: { id: ruleId, companyId },
    });
  }

  /**
   * Record an upsell impression
   */
  async recordImpression(data: {
    cartId: string;
    ruleId: string;
    customerId?: string;
    sessionId: string;
    placement: string;
    variant?: string;
    offer: UpsellOffer;
  }): Promise<string> {
    const impression = await this.prisma.upsellImpression.create({
      data: {
        cartId: data.cartId,
        ruleId: data.ruleId,
        customerId: data.customerId,
        sessionId: data.sessionId,
        placement: data.placement,
        variant: data.variant,
        offer: data.offer as unknown as object,
      },
    });

    return impression.id;
  }

  /**
   * Record upsell acceptance
   */
  async recordAcceptance(impressionId: string, revenue: number): Promise<void> {
    await this.prisma.upsellImpression.update({
      where: { id: impressionId },
      data: {
        acceptedAt: new Date(),
        revenue,
      },
    });
  }

  /**
   * Record upsell decline
   */
  async recordDecline(impressionId: string): Promise<void> {
    await this.prisma.upsellImpression.update({
      where: { id: impressionId },
      data: { declinedAt: new Date() },
    });
  }

  /**
   * Get cart with full context
   */
  private async getCartWithContext(cartId: string): Promise<CartWithContext | null> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              include: {
                categoryAssignments: true,
              },
            },
          },
        },
        customer: true,
      },
    });

    if (!cart) {
      return null;
    }

    // Get customer order count and LTV
    let orderCount = 0;
    let lifetimeValue = 0;

    if (cart.customerId) {
      const customerStats = await this.prisma.order.aggregate({
        where: {
          customerId: cart.customerId,
          status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] },
        },
        _count: { _all: true },
        _sum: { total: true },
      });
      orderCount = customerStats._count._all;
      lifetimeValue = Number(customerStats._sum.total || 0);
    }

    return {
      id: cart.id,
      companyId: cart.companyId,
      customerId: cart.customerId,
      grandTotal: Number(cart.grandTotal),
      items: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          price: Number(item.product.price),
          categoryAssignments: item.product.categoryAssignments,
        },
      })),
      customer: cart.customer
        ? {
            id: cart.customer.id,
            firstName: cart.customer.firstName || undefined,
            orderCount,
            lifetimeValue,
          }
        : null,
    };
  }

  /**
   * Determine customer segments based on behavior
   */
  private async getCustomerSegments(
    customerId: string | null,
    cart: CartWithContext,
  ): Promise<CustomerSegment[]> {
    const segments: CustomerSegment[] = [];

    // Cart-based segments
    if (cart.grandTotal < 30) {
      segments.push(CustomerSegment.SMALL_CART);
    } else if (cart.grandTotal < 100) {
      segments.push(CustomerSegment.MEDIUM_CART);
    } else {
      segments.push(CustomerSegment.LARGE_CART);
    }

    if (!customerId) {
      segments.push(CustomerSegment.FIRST_TIME_BUYER);
      return segments;
    }

    // Customer-based segments
    const orderCount = cart.customer?.orderCount || 0;
    const ltv = cart.customer?.lifetimeValue || 0;

    if (orderCount === 0) {
      segments.push(CustomerSegment.FIRST_TIME_BUYER);
    } else if (orderCount >= 2) {
      segments.push(CustomerSegment.REPEAT_CUSTOMER);
    }

    // Check for subscription
    const hasSubscription = await this.prisma.subscription.findFirst({
      where: { customerId, status: 'ACTIVE' },
    });
    if (hasSubscription) {
      segments.push(CustomerSegment.LOYAL_SUBSCRIBER);
    }

    // Value-based segments (based on average order value)
    if (orderCount > 0) {
      const avgOrderValue = ltv / orderCount;
      if (avgOrderValue < 30) {
        segments.push(CustomerSegment.BUDGET_CONSCIOUS);
      } else if (avgOrderValue > 100) {
        segments.push(CustomerSegment.PREMIUM_BUYER);
      } else {
        segments.push(CustomerSegment.VALUE_SEEKER);
      }
    }

    // Check for lapsed customer
    const lastOrder = await this.prisma.order.findFirst({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
    if (lastOrder) {
      const daysSinceLastOrder = Math.floor(
        (Date.now() - lastOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceLastOrder > 90) {
        segments.push(CustomerSegment.LAPSED_CUSTOMER);
      }
    }

    return segments;
  }

  /**
   * Get applicable targeting rules
   */
  private async getApplicableRules(
    cart: CartWithContext,
    segments: CustomerSegment[],
    placements?: string[],
  ): Promise<UpsellTargetingRuleData[]> {
    const now = new Date();

    const rules = await this.prisma.upsellTargetingRule.findMany({
      where: {
        companyId: cart.companyId,
        enabled: true,
        OR: [{ validFrom: null }, { validFrom: { lte: now } }],
        AND: [
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
          placements ? { placements: { hasSome: placements } } : {},
        ],
      },
      orderBy: { priority: 'asc' },
    });

    // Filter by conditions
    return rules
      .map(this.mapRuleToData)
      .filter((rule) => this.matchesConditions(rule.conditions, cart, segments));
  }

  /**
   * Check if cart matches rule conditions
   */
  private matchesConditions(
    conditions: UpsellConditions,
    cart: CartWithContext,
    segments: CustomerSegment[],
  ): boolean {
    // Segment check
    if (
      conditions.segments &&
      conditions.segments.length > 0 &&
      !conditions.segments.some((s) => segments.includes(s as CustomerSegment))
    ) {
      return false;
    }

    // Cart value check
    if (conditions.cartValueMin && cart.grandTotal < conditions.cartValueMin) {
      return false;
    }
    if (conditions.cartValueMax && cart.grandTotal > conditions.cartValueMax) {
      return false;
    }

    // Product category check
    if (conditions.productCategories && conditions.productCategories.length > 0) {
      const cartCategories = cart.items.flatMap((item) =>
        item.product.categoryAssignments.map((ca) => ca.categoryId),
      );
      if (!conditions.productCategories.some((c) => cartCategories.includes(c))) {
        return false;
      }
    }

    // Has product check
    if (conditions.hasProduct && conditions.hasProduct.length > 0) {
      const cartProductIds = cart.items.map((item) => item.productId);
      if (!conditions.hasProduct.some((p) => cartProductIds.includes(p))) {
        return false;
      }
    }

    // Exclude product check
    if (conditions.excludeProduct && conditions.excludeProduct.length > 0) {
      const cartProductIds = cart.items.map((item) => item.productId);
      if (conditions.excludeProduct.some((p) => cartProductIds.includes(p))) {
        return false;
      }
    }

    // New customer check
    if (conditions.isNewCustomer !== undefined) {
      const isNew = segments.includes(CustomerSegment.FIRST_TIME_BUYER);
      if (conditions.isNewCustomer !== isNew) {
        return false;
      }
    }

    // Subscription check
    if (conditions.hasSubscription !== undefined) {
      const hasSub = segments.includes(CustomerSegment.LOYAL_SUBSCRIBER);
      if (conditions.hasSubscription !== hasSub) {
        return false;
      }
    }

    return true;
  }

  /**
   * Score upsells based on likelihood of acceptance
   */
  private async scoreUpsells(
    rules: UpsellTargetingRuleData[],
    cart: CartWithContext,
  ): Promise<ScoredUpsell[]> {
    const scoredUpsells: ScoredUpsell[] = [];

    for (const rule of rules) {
      let score = (100 - rule.priority) * 0.01; // Base score from priority (0-1)

      // Score based on customer match
      if (cart.customer) {
        // Previous upsell acceptance rate
        const acceptanceRate = await this.getUpsellAcceptanceRate(
          cart.customer.id,
          rule.upsellType,
        );
        score += acceptanceRate * 0.3;

        // Price sensitivity alignment
        if (rule.offer.discountPercent && cart.customer.lifetimeValue) {
          const avgOrder = cart.customer.lifetimeValue / (cart.customer.orderCount || 1);
          if (avgOrder < 50) {
            // Budget-conscious - discount appeals more
            score += 0.2;
          }
        }
      }

      // Score based on cart context
      const cartValueScore = this.getCartValueScore(cart.grandTotal, rule.upsellType);
      score += cartValueScore * 0.2;

      scoredUpsells.push({
        rule,
        score,
        estimatedConversion: this.scoreToConversion(score),
      });
    }

    return scoredUpsells.sort((a, b) => b.score - a.score);
  }

  /**
   * Get historical upsell acceptance rate for a customer
   */
  private async getUpsellAcceptanceRate(
    customerId: string,
    upsellType: UpsellType,
  ): Promise<number> {
    const impressions = await this.prisma.upsellImpression.count({
      where: {
        customerId,
        rule: { upsellType },
        impressedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    });

    if (impressions === 0) return 0.15; // Default rate

    const acceptances = await this.prisma.upsellImpression.count({
      where: {
        customerId,
        rule: { upsellType },
        acceptedAt: { not: null },
        impressedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    });

    return acceptances / impressions;
  }

  /**
   * Get cart value score based on upsell type
   */
  private getCartValueScore(cartValue: number, upsellType: UpsellType): number {
    switch (upsellType) {
      case UpsellType.FREE_SHIPPING_ADD:
        // Higher score for carts close to threshold
        return cartValue > 30 && cartValue < 50 ? 0.8 : 0.3;
      case UpsellType.BULK_DISCOUNT:
        return 0.5;
      case UpsellType.SUBSCRIPTION:
        return cartValue > 50 ? 0.6 : 0.3;
      case UpsellType.SHIPPING_PROTECTION:
        return cartValue > 100 ? 0.7 : 0.2;
      default:
        return 0.4;
    }
  }

  /**
   * Convert score to estimated conversion rate
   */
  private scoreToConversion(score: number): number {
    // Map score (0-1) to realistic conversion rate (1-15%)
    return Math.round(Math.min(score * 15, 15) * 10) / 10;
  }

  /**
   * Generate targeted upsells with personalized messages
   */
  private async generateTargetedUpsells(
    scoredUpsells: ScoredUpsell[],
    cart: CartWithContext,
  ): Promise<TargetedUpsell[]> {
    const targetedUpsells: TargetedUpsell[] = [];

    for (const upsell of scoredUpsells) {
      const { rule, score, estimatedConversion } = upsell;

      // Get products for the upsell
      const products = await this.getUpsellProducts(rule, cart);

      // Generate personalized message
      const personalizedMessage = this.personalizeMessage(rule.message, cart, rule.offer);

      targetedUpsells.push({
        rule,
        score,
        estimatedConversion,
        personalizedMessage,
        products,
      });
    }

    return targetedUpsells;
  }

  /**
   * Get products for an upsell recommendation
   */
  private async getUpsellProducts(
    rule: UpsellTargetingRuleData,
    cart: CartWithContext,
  ): Promise<TargetedUpsellProduct[]> {
    switch (rule.upsellType) {
      case UpsellType.BULK_DISCOUNT:
        // Return cart products with quantity suggestion
        return cart.items.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity + 1,
        }));

      case UpsellType.FREE_GIFT_THRESHOLD:
        if (rule.offer.freeGift) {
          const gift = await this.prisma.product.findFirst({
            where: { sku: rule.offer.freeGift, companyId: cart.companyId },
          });
          if (gift) {
            const images = gift.images as string[];
            return [
              {
                id: gift.id,
                name: gift.name,
                price: 0,
                image: images?.[0],
              },
            ];
          }
        }
        return [];

      case UpsellType.COMPLEMENTARY:
        // Get complementary products (simplified - in production would use ML)
        const cartCategoryIds = cart.items.flatMap((item) =>
          item.product.categoryAssignments.map((ca) => ca.categoryId),
        );
        const complementary = await this.prisma.product.findMany({
          where: {
            companyId: cart.companyId,
            status: 'ACTIVE',
            deletedAt: null,
            id: { notIn: cart.items.map((i) => i.productId) },
          },
          take: 3,
        });
        return complementary.map((p) => {
          const images = p.images as string[];
          return {
            id: p.id,
            name: p.name,
            price: Number(p.price),
            image: images?.[0],
          };
        });

      default:
        return [];
    }
  }

  /**
   * Personalize message with cart context
   */
  private personalizeMessage(
    template: string,
    cart: CartWithContext,
    offer: UpsellOffer,
  ): string {
    let message = template;

    // Replace placeholders
    message = message.replace(/\{\{cartValue\}\}/g, cart.grandTotal.toFixed(2));
    message = message.replace(
      /\{\{remaining\}\}/g,
      Math.max(0, 50 - cart.grandTotal).toFixed(2),
    );

    if (cart.customer?.firstName) {
      message = message.replace(/\{\{firstName\}\}/g, cart.customer.firstName);
    }

    if (offer.discountPercent) {
      message = message.replace(/\{\{discount\}\}/g, offer.discountPercent.toString());
    }

    return message;
  }

  /**
   * Map database rule to data interface
   */
  private mapRuleToData(rule: {
    id: string;
    name: string;
    description: string | null;
    priority: number;
    enabled: boolean;
    conditions: unknown;
    upsellType: UpsellType;
    offer: unknown;
    message: string;
    urgency: UpsellUrgency;
    placements: string[];
    maxImpressions: number | null;
    maxAcceptances: number | null;
    validFrom: Date | null;
    validUntil: Date | null;
  }): UpsellTargetingRuleData {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description || undefined,
      priority: rule.priority,
      enabled: rule.enabled,
      conditions: rule.conditions as UpsellConditions,
      upsellType: rule.upsellType,
      offer: rule.offer as UpsellOffer,
      message: rule.message,
      urgency: rule.urgency,
      placements: rule.placements,
      maxImpressions: rule.maxImpressions || undefined,
      maxAcceptances: rule.maxAcceptances || undefined,
      validFrom: rule.validFrom || undefined,
      validUntil: rule.validUntil || undefined,
    };
  }
}
