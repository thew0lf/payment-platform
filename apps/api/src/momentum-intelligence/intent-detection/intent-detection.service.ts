import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ChurnRiskLevel,
  ChurnRiskScore,
  ChurnSignal,
  CustomerBehaviorProfile,
  InterventionType,
  InterventionUrgency,
} from '../types/momentum.types';

@Injectable()
export class IntentDetectionService {
  private readonly logger = new Logger(IntentDetectionService.name);

  // Signal weights for churn prediction
  private readonly signalWeights: Record<string, number> = {
    cancel_page_visit: 0.9,
    payment_failure_multiple: 0.85,
    support_ticket_angry: 0.8,
    competitor_mention: 0.75,
    login_frequency_drop: 0.6,
    feature_usage_decline: 0.55,
    billing_page_views: 0.5,
    skip_pause_consideration: 0.45,
    email_open_rate_decline: 0.3,
    time_since_purchase: 0.25,
    nps_score_drop: 0.2,
  };

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // CALCULATE CHURN RISK
  // ═══════════════════════════════════════════════════════════════

  async calculateChurnRisk(companyId: string, customerId: string): Promise<ChurnRiskScore> {
    // Get customer profile
    const profile = await this.getCustomerBehaviorProfile(companyId, customerId);

    // Detect signals
    const signals = await this.detectChurnSignals(profile);

    // Calculate base score from signals
    let baseScore = 0;
    for (const signal of signals) {
      baseScore += signal.weight * 100;
    }

    // Apply modifiers
    const recencyModifier = this.calculateRecencyModifier(signals);
    const tenureRisk = this.calculateTenureRisk(profile.subscriptionTenure || 0);
    const engagementTrend = 1 - (profile.engagementScore / 100);
    const paymentHealthRisk = await this.calculatePaymentHealthRisk(companyId, customerId);

    // Final score calculation
    let churnScore =
      baseScore * recencyModifier * 0.35 +
      tenureRisk * 0.2 +
      engagementTrend * 0.3 +
      paymentHealthRisk * 0.15;

    // Normalize to 0-100
    churnScore = Math.min(100, Math.max(0, churnScore * 100));

    // Determine risk level
    const riskLevel = this.getRiskLevel(churnScore);
    const urgency = this.getUrgency(riskLevel);
    const recommendedAction = this.getRecommendedAction(riskLevel, signals);

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(profile, signals);

    // Get primary factors
    const primaryFactors = signals
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((s) => s.type);

    const result: ChurnRiskScore = {
      score: Math.round(churnScore),
      confidence,
      riskLevel,
      primaryFactors,
      recommendedAction,
      urgency,
    };

    // Store/update customer intent
    await this.upsertCustomerIntent(companyId, customerId, result, signals);

    this.logger.log(
      `Calculated churn risk for customer ${customerId}: score=${result.score}, level=${result.riskLevel}`,
    );

    return result;
  }

  async batchCalculateChurnRisk(
    companyId: string,
    customerIds: string[],
  ): Promise<Map<string, ChurnRiskScore>> {
    const results = new Map<string, ChurnRiskScore>();

    // Process in parallel batches of 10
    const batchSize = 10;
    for (let i = 0; i < customerIds.length; i += batchSize) {
      const batch = customerIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((customerId) => this.calculateChurnRisk(companyId, customerId)),
      );
      batch.forEach((customerId, index) => {
        results.set(customerId, batchResults[index]);
      });
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════════
  // GET HIGH RISK CUSTOMERS
  // ═══════════════════════════════════════════════════════════════

  async getHighRiskCustomers(
    companyId: string,
    options: {
      riskLevel?: ChurnRiskLevel;
      urgency?: InterventionUrgency;
      limit?: number;
    } = {},
  ): Promise<any[]> {
    const where: any = { companyId };

    if (options.riskLevel) {
      where.churnRisk = options.riskLevel;
    } else {
      where.churnRisk = { in: [ChurnRiskLevel.HIGH, ChurnRiskLevel.CRITICAL] };
    }

    if (options.urgency) {
      where.urgency = options.urgency;
    }

    const intents = await this.prisma.customerIntent.findMany({
      where,
      orderBy: [{ churnScore: 'desc' }, { calculatedAt: 'desc' }],
      take: options.limit || 50,
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return intents;
  }

  async getCustomerIntent(companyId: string, customerId: string): Promise<any> {
    const intent = await this.prisma.customerIntent.findFirst({
      where: { companyId, customerId },
      orderBy: { calculatedAt: 'desc' },
    });

    if (!intent) {
      throw new NotFoundException(`No intent data found for customer ${customerId}`);
    }

    return intent;
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async getCustomerBehaviorProfile(
    companyId: string,
    customerId: string,
  ): Promise<CustomerBehaviorProfile> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId },
      include: {
        orders: {
          orderBy: { orderedAt: 'desc' },
          take: 100,
        },
        subscriptions: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    // Calculate metrics
    const orders = customer.orders || [];
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const lastOrderAt = orders[0]?.orderedAt;

    // Calculate subscription tenure
    const activeSubscription = customer.subscriptions?.[0];
    const subscriptionTenure = activeSubscription
      ? Math.floor(
          (Date.now() - new Date(activeSubscription.currentPeriodStart).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : undefined;

    // Engagement score (simplified - would be more complex in production)
    const daysSinceLastOrder = lastOrderAt
      ? Math.floor((Date.now() - new Date(lastOrderAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const engagementScore = Math.max(0, 100 - daysSinceLastOrder * 2);

    return {
      customerId,
      companyId,
      loginFrequency: 0, // Would need login tracking
      lastLoginAt: undefined,
      purchaseHistory: {
        totalOrders,
        totalSpent,
        avgOrderValue,
        lastOrderAt,
      },
      engagementScore,
      subscriptionTenure,
      supportTicketCount: 0, // Would need support integration
      npsScore: undefined,
    };
  }

  private async detectChurnSignals(profile: CustomerBehaviorProfile): Promise<ChurnSignal[]> {
    const signals: ChurnSignal[] = [];
    const now = new Date();

    // Check for lack of recent purchases
    if (profile.purchaseHistory.lastOrderAt) {
      const daysSinceOrder = Math.floor(
        (now.getTime() - new Date(profile.purchaseHistory.lastOrderAt).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysSinceOrder > 60) {
        signals.push({
          type: 'time_since_purchase',
          weight: this.signalWeights.time_since_purchase,
          description: `${daysSinceOrder} days since last purchase`,
          detectedAt: now,
          metadata: { daysSinceOrder },
        });
      }
    }

    // Check for low engagement
    if (profile.engagementScore < 30) {
      signals.push({
        type: 'feature_usage_decline',
        weight: this.signalWeights.feature_usage_decline,
        description: `Low engagement score: ${profile.engagementScore}`,
        detectedAt: now,
        metadata: { engagementScore: profile.engagementScore },
      });
    }

    // Check for new subscriber (high churn risk in first 90 days)
    if (profile.subscriptionTenure && profile.subscriptionTenure < 90) {
      signals.push({
        type: 'new_subscriber_risk',
        weight: 0.4,
        description: `New subscriber: ${profile.subscriptionTenure} days`,
        detectedAt: now,
        metadata: { tenure: profile.subscriptionTenure },
      });
    }

    // Check for declining order frequency
    if (profile.purchaseHistory.totalOrders > 3) {
      // Would need more sophisticated analysis in production
      // For now, just check if recent orders are less frequent
      signals.push({
        type: 'order_frequency_analysis',
        weight: 0.3,
        description: 'Order frequency analysis performed',
        detectedAt: now,
      });
    }

    // Check for low NPS
    if (profile.npsScore !== undefined && profile.npsScore < 7) {
      signals.push({
        type: 'nps_score_drop',
        weight: this.signalWeights.nps_score_drop * (1 + (7 - profile.npsScore) / 10),
        description: `Low NPS score: ${profile.npsScore}`,
        detectedAt: now,
        metadata: { npsScore: profile.npsScore },
      });
    }

    return signals;
  }

  private calculateRecencyModifier(signals: ChurnSignal[]): number {
    if (signals.length === 0) return 1;

    // Recent signals have more weight
    const now = Date.now();
    let totalWeight = 0;
    let weightedSum = 0;

    for (const signal of signals) {
      const hoursSinceDetection = (now - signal.detectedAt.getTime()) / (1000 * 60 * 60);
      const recencyWeight = Math.max(0.5, 1 - hoursSinceDetection / 168); // Decay over 7 days
      weightedSum += recencyWeight * signal.weight;
      totalWeight += signal.weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 1;
  }

  private calculateTenureRisk(tenureDays: number): number {
    // Higher risk for very new and very old subscribers
    if (tenureDays < 30) return 0.8;
    if (tenureDays < 90) return 0.5;
    if (tenureDays < 180) return 0.3;
    if (tenureDays < 365) return 0.2;
    return 0.1; // Long-term subscribers lower risk
  }

  private async calculatePaymentHealthRisk(
    companyId: string,
    customerId: string,
  ): Promise<number> {
    // Check for recent payment failures
    const recentFailures = await this.prisma.transaction.count({
      where: {
        companyId,
        customerId,
        status: 'FAILED',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    if (recentFailures >= 3) return 0.9;
    if (recentFailures === 2) return 0.7;
    if (recentFailures === 1) return 0.4;
    return 0.1;
  }

  private getRiskLevel(score: number): ChurnRiskLevel {
    if (score >= 80) return ChurnRiskLevel.CRITICAL;
    if (score >= 60) return ChurnRiskLevel.HIGH;
    if (score >= 40) return ChurnRiskLevel.MEDIUM;
    return ChurnRiskLevel.LOW;
  }

  private getUrgency(riskLevel: ChurnRiskLevel): InterventionUrgency {
    switch (riskLevel) {
      case ChurnRiskLevel.CRITICAL:
        return InterventionUrgency.IMMEDIATE;
      case ChurnRiskLevel.HIGH:
        return InterventionUrgency.WITHIN_24H;
      case ChurnRiskLevel.MEDIUM:
        return InterventionUrgency.WITHIN_7D;
      default:
        return InterventionUrgency.MONITORING;
    }
  }

  private getRecommendedAction(
    riskLevel: ChurnRiskLevel,
    signals: ChurnSignal[],
  ): InterventionType {
    // Check for specific signal types that suggest specific interventions
    const signalTypes = signals.map((s) => s.type);

    if (signalTypes.includes('payment_failure_multiple')) {
      return InterventionType.PAYMENT_RECOVERY;
    }

    if (signalTypes.includes('support_ticket_angry')) {
      return InterventionType.SERVICE_RECOVERY;
    }

    if (signalTypes.includes('cancel_page_visit')) {
      return InterventionType.SAVE_FLOW;
    }

    // Default based on risk level
    switch (riskLevel) {
      case ChurnRiskLevel.CRITICAL:
      case ChurnRiskLevel.HIGH:
        return InterventionType.PROACTIVE_OUTREACH;
      case ChurnRiskLevel.MEDIUM:
        return InterventionType.UPSELL; // Re-engage with value
      default:
        return InterventionType.WINBACK; // Monitoring mode
    }
  }

  private calculateConfidence(profile: CustomerBehaviorProfile, signals: ChurnSignal[]): number {
    let confidence = 0.5; // Base confidence

    // More data = higher confidence
    if (profile.purchaseHistory.totalOrders > 5) confidence += 0.1;
    if (profile.purchaseHistory.totalOrders > 10) confidence += 0.1;
    if (profile.subscriptionTenure && profile.subscriptionTenure > 60) confidence += 0.1;
    if (signals.length > 2) confidence += 0.1;
    if (profile.npsScore !== undefined) confidence += 0.1;

    return Math.min(1, confidence);
  }

  private async upsertCustomerIntent(
    companyId: string,
    customerId: string,
    riskScore: ChurnRiskScore,
    signals: ChurnSignal[],
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Find existing intent
    const existing = await this.prisma.customerIntent.findFirst({
      where: { companyId, customerId },
      orderBy: { calculatedAt: 'desc' },
    });

    const signalsData = signals.map((s) => ({
      type: s.type,
      weight: s.weight,
      description: s.description,
      detectedAt: s.detectedAt.toISOString(),
      metadata: s.metadata,
    }));

    if (existing) {
      await this.prisma.customerIntent.update({
        where: { id: existing.id },
        data: {
          churnScore: riskScore.score,
          churnRisk: riskScore.riskLevel,
          confidence: riskScore.confidence,
          signals: signalsData as any,
          primaryFactors: riskScore.primaryFactors,
          recommendedAction: riskScore.recommendedAction,
          urgency: riskScore.urgency,
          calculatedAt: new Date(),
          expiresAt,
        },
      });
    } else {
      await this.prisma.customerIntent.create({
        data: {
          companyId,
          customerId,
          churnScore: riskScore.score,
          churnRisk: riskScore.riskLevel,
          confidence: riskScore.confidence,
          signals: signalsData as any,
          primaryFactors: riskScore.primaryFactors,
          recommendedAction: riskScore.recommendedAction,
          urgency: riskScore.urgency,
          calculatedAt: new Date(),
          expiresAt,
        },
      });
    }
  }
}
