import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  UpsellType,
  UpsellMoment,
  UpsellRecommendation,
  UpsellOfferData,
} from '../types/momentum.types';

// Enhanced types for AI-powered upsell
interface CustomerUpsellContext {
  customerId: string;
  currentPlan?: string;
  currentProducts: string[];
  previousPurchases: string[];
  previousUpsells: Array<{
    offerId: string;
    type: UpsellType;
    accepted: boolean;
    date: Date;
  }>;
  engagementScore: number;
  lifetimeValue: number;
  averageOrderValue: number;
  pricePreference?: 'budget' | 'mid' | 'premium';
  recentlyViewed?: string[];
}

interface ScoredOffer extends UpsellOfferData {
  score: number;
  confidence: number;
  reasons: string[];
}

@Injectable()
export class UpsellService {
  private readonly logger = new Logger(UpsellService.name);
  private readonly anthropic: Anthropic;

  // Default offer configurations
  private readonly defaultOffers: Record<UpsellType, Partial<UpsellOfferData>> = {
    [UpsellType.SHIPPING_PROTECTION]: {
      type: UpsellType.SHIPPING_PROTECTION,
      originalPrice: 6.95,
      offerPrice: 6.95,
      discount: 0,
      messaging: {
        headline: 'Protect Your Order',
        body: 'Get free replacement if anything goes wrong with delivery',
        cta: 'Add Protection',
      },
      predictedConversion: 0.35,
    },
    [UpsellType.TIER_UPGRADE]: {
      type: UpsellType.TIER_UPGRADE,
      discount: 20,
      messaging: {
        headline: 'Upgrade Your Experience',
        body: 'Get more value with our premium tier',
        cta: 'Upgrade Now',
      },
      predictedConversion: 0.15,
    },
    [UpsellType.FREQUENCY_UPGRADE]: {
      type: UpsellType.FREQUENCY_UPGRADE,
      discount: 10,
      messaging: {
        headline: 'Never Run Out',
        body: 'Switch to more frequent deliveries and save',
        cta: 'Increase Frequency',
      },
      predictedConversion: 0.2,
    },
    [UpsellType.ADD_ON]: {
      type: UpsellType.ADD_ON,
      discount: 15,
      messaging: {
        headline: 'Complete Your Order',
        body: 'Customers also bought these items',
        cta: 'Add to Order',
      },
      predictedConversion: 0.25,
    },
    [UpsellType.GIFT_SUBSCRIPTION]: {
      type: UpsellType.GIFT_SUBSCRIPTION,
      discount: 10,
      messaging: {
        headline: 'Share the Love',
        body: 'Give the gift of great coffee to someone special',
        cta: 'Gift a Subscription',
      },
      predictedConversion: 0.08,
    },
    [UpsellType.ANNUAL_PLAN]: {
      type: UpsellType.ANNUAL_PLAN,
      discount: 25,
      messaging: {
        headline: 'Save Big with Annual',
        body: 'Lock in your rate and save 25% for the year',
        cta: 'Switch to Annual',
      },
      predictedConversion: 0.12,
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly config: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get('ANTHROPIC_API_KEY'),
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // GET RECOMMENDATIONS - Enhanced with AI
  // ═══════════════════════════════════════════════════════════════

  async getRecommendations(
    companyId: string,
    customerId: string,
    moment: UpsellMoment,
    options: {
      useAI?: boolean;
      maxRecommendations?: number;
      cartContents?: string[];
    } = {},
  ): Promise<UpsellRecommendation> {
    const { useAI = true, maxRecommendations = 3 } = options;

    // Get customer data for personalization
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId },
      include: {
        orders: {
          orderBy: { orderedAt: 'desc' },
          take: 10,
        },
        subscriptions: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    // Build customer context
    const context = await this.buildCustomerContext(companyId, customerId, customer);

    // Analyze customer segment
    const segment = this.analyzeCustomerSegment(customer);

    // Get behavior signals
    const signals = this.extractBehaviorSignals(customer);

    // Score offers for this moment
    let scoredOffers = await this.scoreOffersForMoment(
      companyId,
      customer,
      moment,
      segment,
      signals,
      options.cartContents,
    );

    // Enhance with AI if enabled
    if (useAI && scoredOffers.length > 0) {
      scoredOffers = await this.enhanceWithAI(scoredOffers, context, moment);
    }

    // Get top offers
    const topOffers = scoredOffers.slice(0, maxRecommendations);

    // Calculate similar customer conversion rate
    const similarConversion = await this.getSimilarCustomerConversion(
      companyId,
      segment,
      moment,
    );

    const recommendation: UpsellRecommendation = {
      customerId,
      moment,
      recommendations: {
        primary: topOffers[0],
        secondary: topOffers[1],
        tertiary: topOffers[2],
      },
      reasoning: {
        customerSegment: segment.name,
        behaviorSignals: signals,
        similarCustomerConversion: similarConversion,
        predictedAcceptance: topOffers[0]?.predictedConversion || 0,
      },
    };

    this.logger.log(
      `Generated upsell recommendations for customer ${customerId} at ${moment}`,
    );

    return recommendation;
  }

  // ═══════════════════════════════════════════════════════════════
  // AI-ENHANCED SCORING
  // ═══════════════════════════════════════════════════════════════

  private async enhanceWithAI(
    offers: ScoredOffer[],
    context: CustomerUpsellContext,
    moment: UpsellMoment,
  ): Promise<ScoredOffer[]> {
    if (offers.length === 0) return [];

    const prompt = `
Analyze these upsell offers for a customer and optimize their ranking based on likelihood of acceptance.

Customer Context:
- Engagement Score: ${context.engagementScore}/100
- Lifetime Value: $${context.lifetimeValue}
- Average Order Value: $${context.averageOrderValue}
- Previous Purchases: ${context.previousPurchases.length} orders
- Price Preference: ${context.pricePreference || 'unknown'}
- Moment: ${moment}

${context.previousUpsells.length > 0 ? `Previous Upsell History:
${context.previousUpsells.map(u => `- ${u.type}: ${u.accepted ? 'Accepted' : 'Declined'}`).join('\n')}` : ''}

Current Offers (ranked by rule-based score):
${offers.map((o, i) => `
${i + 1}. ${o.type}
   - Price: $${o.offerPrice} (${o.discount}% off)
   - Current Score: ${(o as ScoredOffer).score}
   - Base Conversion: ${(o.predictedConversion * 100).toFixed(1)}%
`).join('\n')}

Based on the customer context and behavioral patterns, respond with a JSON object:
{
  "ranking": ["offer_type_1", "offer_type_2", ...],
  "adjustments": [
    {"type": "offer_type", "confidenceMultiplier": 1.2, "reason": "explanation"}
  ]
}

Focus on:
1. Previous upsell acceptance patterns
2. Price sensitivity based on AOV
3. Engagement level
4. Moment appropriateness
`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return offers;

      const aiResult = JSON.parse(jsonMatch[0]);

      // Apply AI adjustments
      const adjustedOffers = offers.map(offer => {
        const adjustment = aiResult.adjustments?.find(
          (a: any) => a.type === offer.type,
        );
        if (adjustment) {
          return {
            ...offer,
            score: offer.score * (adjustment.confidenceMultiplier || 1),
            confidence: offer.confidence * (adjustment.confidenceMultiplier || 1),
            reasons: [...offer.reasons, adjustment.reason],
          };
        }
        return offer;
      });

      // Re-sort based on AI ranking
      if (aiResult.ranking && Array.isArray(aiResult.ranking)) {
        adjustedOffers.sort((a, b) => {
          const aIndex = aiResult.ranking.indexOf(a.type);
          const bIndex = aiResult.ranking.indexOf(b.type);
          if (aIndex === -1 && bIndex === -1) return b.score - a.score;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      }

      return adjustedOffers;
    } catch (error) {
      this.logger.warn('AI enhancement failed, using rule-based ranking', error);
      return offers;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // OFFER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async createOffer(data: {
    companyId: string;
    customerId: string;
    type: UpsellType;
    moment: UpsellMoment;
    productId?: string;
    position: string;
    originalPrice?: number;
    offerPrice?: number;
    discount?: number;
    validUntil?: Date;
    triggerUsed?: string;
  }): Promise<any> {
    return this.prisma.upsellOffer.create({
      data,
    });
  }

  async recordPresentation(offerId: string): Promise<any> {
    const offer = await this.prisma.upsellOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException(`Upsell offer ${offerId} not found`);
    }

    const updated = await this.prisma.upsellOffer.update({
      where: { id: offerId },
      data: {
        presented: true,
        presentedAt: new Date(),
      },
    });

    this.eventEmitter.emit('upsell.presented', {
      companyId: offer.companyId,
      customerId: offer.customerId,
      offerId,
      type: offer.type,
      moment: offer.moment,
    });

    return updated;
  }

  async recordAcceptance(offerId: string, revenue: number): Promise<any> {
    const offer = await this.prisma.upsellOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException(`Upsell offer ${offerId} not found`);
    }

    const updated = await this.prisma.upsellOffer.update({
      where: { id: offerId },
      data: {
        accepted: true,
        acceptedAt: new Date(),
        revenue,
      },
    });

    this.eventEmitter.emit('upsell.accepted', {
      companyId: offer.companyId,
      customerId: offer.customerId,
      offerId,
      type: offer.type,
      moment: offer.moment,
      revenue,
    });

    this.logger.log(`Upsell offer ${offerId} accepted, revenue: ${revenue}`);

    return updated;
  }

  async recordDecline(offerId: string, reason?: string): Promise<any> {
    const offer = await this.prisma.upsellOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException(`Upsell offer ${offerId} not found`);
    }

    const updated = await this.prisma.upsellOffer.update({
      where: { id: offerId },
      data: {
        accepted: false,
      },
    });

    this.eventEmitter.emit('upsell.declined', {
      companyId: offer.companyId,
      customerId: offer.customerId,
      offerId,
      type: offer.type,
      moment: offer.moment,
      reason,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════
  // TRIGGER-BASED RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════

  async handleCheckoutUpsell(
    companyId: string,
    customerId: string,
    cartContents: string[],
    cartTotal: number,
  ): Promise<UpsellRecommendation> {
    return this.getRecommendations(companyId, customerId, UpsellMoment.CHECKOUT, {
      cartContents,
      maxRecommendations: 2,
    });
  }

  async handlePostPurchaseUpsell(
    companyId: string,
    customerId: string,
    orderId: string,
  ): Promise<UpsellRecommendation> {
    return this.getRecommendations(
      companyId,
      customerId,
      UpsellMoment.POST_PURCHASE,
      { maxRecommendations: 3 },
    );
  }

  async handleSaveFlowUpsell(
    companyId: string,
    customerId: string,
    interventionAccepted?: string,
  ): Promise<UpsellRecommendation> {
    // Customer retained - good time for appreciation or downgrade upsell
    return this.getRecommendations(companyId, customerId, UpsellMoment.SAVE_FLOW, {
      maxRecommendations: 2,
    });
  }

  async handleWinbackUpsell(
    companyId: string,
    customerId: string,
  ): Promise<UpsellRecommendation> {
    return this.getRecommendations(companyId, customerId, UpsellMoment.WINBACK, {
      maxRecommendations: 2,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  async getPerformanceMetrics(
    companyId: string,
    options: {
      moment?: UpsellMoment;
      dateRange?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
  ): Promise<any> {
    const where: any = { companyId };

    if (options.moment) {
      where.moment = options.moment;
    }

    // Date range filter
    const endDate = options.endDate || new Date();
    let startDate = options.startDate;

    if (!startDate && options.dateRange) {
      const days = parseInt(options.dateRange.replace('d', '')) || 30;
      startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    }

    if (startDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get offers
    const offers = await this.prisma.upsellOffer.findMany({ where });

    // Calculate metrics
    const presented = offers.filter((o) => o.presented);
    const accepted = offers.filter((o) => o.accepted);
    const totalRevenue = accepted.reduce((sum, o) => sum + (o.revenue || 0), 0);

    // Group by type
    const byType: Record<string, any> = {};
    for (const type of Object.values(UpsellType)) {
      const typeOffers = offers.filter((o) => o.type === type);
      const typePresented = typeOffers.filter((o) => o.presented);
      const typeAccepted = typeOffers.filter((o) => o.accepted);

      byType[type] = {
        presented: typePresented.length,
        accepted: typeAccepted.length,
        conversionRate:
          typePresented.length > 0
            ? typeAccepted.length / typePresented.length
            : 0,
        revenue: typeAccepted.reduce((sum, o) => sum + (o.revenue || 0), 0),
      };
    }

    // Group by moment
    const byMoment: Record<string, any> = {};
    for (const moment of Object.values(UpsellMoment)) {
      const momentOffers = offers.filter((o) => o.moment === moment);
      const momentPresented = momentOffers.filter((o) => o.presented);
      const momentAccepted = momentOffers.filter((o) => o.accepted);

      byMoment[moment] = {
        presented: momentPresented.length,
        accepted: momentAccepted.length,
        conversionRate:
          momentPresented.length > 0
            ? momentAccepted.length / momentPresented.length
            : 0,
        revenue: momentAccepted.reduce((sum, o) => sum + (o.revenue || 0), 0),
      };
    }

    // Top performing combinations
    const combinations = new Map<string, { presented: number; accepted: number; revenue: number }>();
    for (const offer of offers) {
      const key = `${offer.type}_${offer.moment}`;
      const stats = combinations.get(key) || { presented: 0, accepted: 0, revenue: 0 };
      if (offer.presented) stats.presented++;
      if (offer.accepted) {
        stats.accepted++;
        stats.revenue += offer.revenue || 0;
      }
      combinations.set(key, stats);
    }

    const topCombinations = Array.from(combinations.entries())
      .map(([key, stats]) => ({
        combination: key,
        ...stats,
        conversionRate: stats.presented > 0 ? stats.accepted / stats.presented : 0,
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 5);

    return {
      summary: {
        totalOffers: offers.length,
        presented: presented.length,
        accepted: accepted.length,
        overallConversionRate:
          presented.length > 0 ? accepted.length / presented.length : 0,
        totalRevenue,
        avgRevenuePerAcceptance:
          accepted.length > 0 ? totalRevenue / accepted.length : 0,
      },
      byType,
      byMoment,
      topCombinations,
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }

  async getCustomerUpsellHistory(
    companyId: string,
    customerId: string,
  ): Promise<any[]> {
    return this.prisma.upsellOffer.findMany({
      where: { companyId, customerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async buildCustomerContext(
    companyId: string,
    customerId: string,
    customer: any,
  ): Promise<CustomerUpsellContext> {
    // Get previous upsell history
    const upsellHistory = await this.prisma.upsellOffer.findMany({
      where: { companyId, customerId, presented: true },
      orderBy: { presentedAt: 'desc' },
      take: 10,
    });

    const orders = customer.orders || [];
    const lifetimeValue = orders.reduce(
      (sum: number, o: any) => sum + Number(o.total || 0),
      0,
    );
    const averageOrderValue = orders.length > 0 ? lifetimeValue / orders.length : 0;

    // Determine price preference
    let pricePreference: 'budget' | 'mid' | 'premium' | undefined;
    if (averageOrderValue > 100) pricePreference = 'premium';
    else if (averageOrderValue > 40) pricePreference = 'mid';
    else if (averageOrderValue > 0) pricePreference = 'budget';

    return {
      customerId,
      currentPlan: customer.subscriptions?.[0]?.planName,
      currentProducts: customer.subscriptions?.map((s: any) => s.planName) || [],
      previousPurchases: orders.map((o: any) => o.id),
      previousUpsells: upsellHistory.map((u) => ({
        offerId: u.id,
        type: u.type as UpsellType,
        accepted: u.accepted || false,
        date: u.presentedAt || u.createdAt,
      })),
      engagementScore: this.calculateEngagementScore(customer),
      lifetimeValue,
      averageOrderValue,
      pricePreference,
    };
  }

  private calculateEngagementScore(customer: any): number {
    let score = 50; // Base score

    const orders = customer.orders || [];
    const subscriptions = customer.subscriptions || [];

    // Order frequency bonus
    if (orders.length >= 10) score += 20;
    else if (orders.length >= 5) score += 10;

    // Subscription bonus
    if (subscriptions.length > 0) score += 15;

    // Recency bonus
    if (orders.length > 0) {
      const lastOrder = orders[0];
      const daysSince = Math.floor(
        (Date.now() - new Date(lastOrder.orderedAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSince < 7) score += 15;
      else if (daysSince < 30) score += 10;
      else if (daysSince > 90) score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private analyzeCustomerSegment(customer: any): {
    name: string;
    value: string;
    traits: string[];
  } {
    const orders = customer.orders || [];
    const subscription = customer.subscriptions?.[0];

    const totalSpent = orders.reduce(
      (sum: number, o: any) => sum + Number(o.total),
      0,
    );
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

    // Determine segment
    let name = 'new';
    let value = 'low';
    const traits: string[] = [];

    if (orderCount >= 10) {
      name = 'loyal';
      traits.push('frequent_buyer');
    } else if (orderCount >= 5) {
      name = 'engaged';
      traits.push('repeat_customer');
    } else if (orderCount >= 2) {
      name = 'developing';
    }

    if (totalSpent >= 500) {
      value = 'high';
      traits.push('high_value');
    } else if (totalSpent >= 200) {
      value = 'medium';
    }

    if (subscription) {
      traits.push('subscriber');
    }

    if (avgOrderValue > 50) {
      traits.push('premium_buyer');
    }

    return { name: `${name}_${value}`, value, traits };
  }

  private extractBehaviorSignals(customer: any): string[] {
    const signals: string[] = [];
    const orders = customer.orders || [];

    if (orders.length > 0) {
      const lastOrder = orders[0];
      const daysSinceOrder = Math.floor(
        (Date.now() - new Date(lastOrder.orderedAt).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysSinceOrder < 7) {
        signals.push('recent_purchase');
      } else if (daysSinceOrder > 30) {
        signals.push('lapsed');
      }

      // Check for patterns
      if (orders.length >= 3) {
        const avgDaysBetween = this.calculateAverageOrderInterval(orders);
        if (avgDaysBetween < 20) {
          signals.push('frequent_orderer');
        }
      }
    }

    if (customer.subscriptions?.length > 0) {
      signals.push('active_subscriber');
    }

    return signals;
  }

  private calculateAverageOrderInterval(orders: any[]): number {
    if (orders.length < 2) return 999;

    let totalDays = 0;
    for (let i = 1; i < orders.length; i++) {
      const days = Math.floor(
        (new Date(orders[i - 1].orderedAt).getTime() -
          new Date(orders[i].orderedAt).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      totalDays += days;
    }

    return totalDays / (orders.length - 1);
  }

  private async scoreOffersForMoment(
    companyId: string,
    customer: any,
    moment: UpsellMoment,
    segment: any,
    signals: string[],
    cartContents?: string[],
  ): Promise<ScoredOffer[]> {
    const scoredOffers: ScoredOffer[] = [];

    // Get relevant offer types for this moment
    const relevantTypes = this.getRelevantTypesForMoment(moment);

    // Get previous upsells to avoid repetition
    const recentUpsells = await this.prisma.upsellOffer.findMany({
      where: {
        companyId,
        customerId: customer.id,
        presentedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    const recentlyDeclined = recentUpsells
      .filter((u) => u.accepted === false)
      .map((u) => u.type);

    for (const type of relevantTypes) {
      const baseOffer = this.defaultOffers[type];
      if (!baseOffer) continue;

      // Calculate personalized score
      let score = (baseOffer.predictedConversion || 0) * 100;
      const reasons: string[] = [];

      // Penalize recently declined offers
      if (recentlyDeclined.includes(type)) {
        score *= 0.3;
        reasons.push('Recently declined');
      }

      // Adjust based on segment
      if (segment.value === 'high') {
        score *= 1.2;
        reasons.push('High-value customer');
      }
      if (segment.value === 'low') {
        score *= 0.8;
      }

      // Adjust based on signals
      if (signals.includes('recent_purchase') && type === UpsellType.ADD_ON) {
        score *= 1.3;
        reasons.push('Recent purchase - add-on likely');
      }
      if (signals.includes('active_subscriber') && type === UpsellType.TIER_UPGRADE) {
        score *= 1.4;
        reasons.push('Active subscriber - upgrade candidate');
      }
      if (signals.includes('lapsed') && type === UpsellType.ANNUAL_PLAN) {
        score *= 0.5; // Less likely to commit
        reasons.push('Lapsed customer');
      }
      if (signals.includes('frequent_orderer') && type === UpsellType.FREQUENCY_UPGRADE) {
        score *= 0.7; // Already ordering frequently
        reasons.push('Already orders frequently');
      }

      // Calculate personalized pricing
      const pricing = this.calculatePersonalizedPricing(type, customer, segment);

      scoredOffers.push({
        type,
        originalPrice: pricing.original,
        offerPrice: pricing.offer,
        discount: pricing.discount,
        messaging: baseOffer.messaging!,
        predictedConversion: Math.min(1, score / 100),
        behavioralTrigger: this.getBestTriggerForOffer(type, signals),
        score,
        confidence: 0.7,
        reasons,
      });
    }

    // Sort by score
    scoredOffers.sort((a, b) => b.score - a.score);

    return scoredOffers;
  }

  private getRelevantTypesForMoment(moment: UpsellMoment): UpsellType[] {
    const momentTypes: Record<UpsellMoment, UpsellType[]> = {
      [UpsellMoment.CHECKOUT]: [
        UpsellType.SHIPPING_PROTECTION,
        UpsellType.ADD_ON,
        UpsellType.GIFT_SUBSCRIPTION,
      ],
      [UpsellMoment.POST_PURCHASE]: [
        UpsellType.TIER_UPGRADE,
        UpsellType.ANNUAL_PLAN,
        UpsellType.GIFT_SUBSCRIPTION,
      ],
      [UpsellMoment.DAY_7]: [UpsellType.FREQUENCY_UPGRADE, UpsellType.ADD_ON],
      [UpsellMoment.DAY_14]: [UpsellType.TIER_UPGRADE, UpsellType.ANNUAL_PLAN],
      [UpsellMoment.DAY_30]: [UpsellType.ANNUAL_PLAN, UpsellType.TIER_UPGRADE],
      [UpsellMoment.MONTH_2]: [UpsellType.ANNUAL_PLAN, UpsellType.GIFT_SUBSCRIPTION],
      [UpsellMoment.MONTH_3]: [UpsellType.ANNUAL_PLAN, UpsellType.TIER_UPGRADE],
      [UpsellMoment.SAVE_FLOW]: [
        UpsellType.TIER_UPGRADE, // Downgrade option
        UpsellType.FREQUENCY_UPGRADE, // Reduce frequency
      ],
      [UpsellMoment.WINBACK]: [UpsellType.ANNUAL_PLAN, UpsellType.TIER_UPGRADE],
    };

    return momentTypes[moment] || [];
  }

  private calculatePersonalizedPricing(
    type: UpsellType,
    customer: any,
    segment: any,
  ): { original: number; offer: number; discount: number } {
    const baseOffer = this.defaultOffers[type];
    const baseDiscount = baseOffer?.discount || 0;

    // Higher value customers might get better offers to retain them
    let adjustedDiscount = baseDiscount;
    if (segment.value === 'high') {
      adjustedDiscount = Math.min(50, baseDiscount + 10);
    }

    // Sample pricing (would come from product catalog in production)
    const basePrices: Record<UpsellType, number> = {
      [UpsellType.SHIPPING_PROTECTION]: 6.95,
      [UpsellType.TIER_UPGRADE]: 39.95,
      [UpsellType.FREQUENCY_UPGRADE]: 29.95,
      [UpsellType.ADD_ON]: 14.95,
      [UpsellType.GIFT_SUBSCRIPTION]: 99.95,
      [UpsellType.ANNUAL_PLAN]: 299.95,
    };

    const original = basePrices[type] || 0;
    const offer = original * (1 - adjustedDiscount / 100);

    return {
      original,
      offer: Math.round(offer * 100) / 100,
      discount: adjustedDiscount,
    };
  }

  private getBestTriggerForOffer(type: UpsellType, signals: string[]): string {
    // Map offer types to most effective triggers
    const typeTriggers: Record<UpsellType, string> = {
      [UpsellType.SHIPPING_PROTECTION]: 'loss_aversion',
      [UpsellType.TIER_UPGRADE]: 'identity_alignment',
      [UpsellType.FREQUENCY_UPGRADE]: 'ownership_velocity',
      [UpsellType.ADD_ON]: 'social_proof',
      [UpsellType.GIFT_SUBSCRIPTION]: 'reciprocity',
      [UpsellType.ANNUAL_PLAN]: 'anchoring',
    };

    return typeTriggers[type] || 'social_proof';
  }

  private async getSimilarCustomerConversion(
    companyId: string,
    segment: any,
    moment: UpsellMoment,
  ): Promise<number> {
    // Calculate conversion rate for similar customers
    const offers = await this.prisma.upsellOffer.findMany({
      where: {
        companyId,
        moment,
        presented: true,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (offers.length === 0) return 0.15; // Default

    const accepted = offers.filter((o) => o.accepted);
    return accepted.length / offers.length;
  }
}
