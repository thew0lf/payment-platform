/**
 * Subscription Intelligence Service
 *
 * AI-powered analytics and predictions for subscriptions:
 * - Churn prediction and risk scoring
 * - Customer lifetime value estimation
 * - Optimal timing recommendations
 * - Product recommendations
 * - Health scoring
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Subscription,
  SubscriptionStatus,
  Customer,
  Order,
} from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum HealthScore {
  EXCELLENT = 'EXCELLENT',   // 90-100
  GOOD = 'GOOD',             // 70-89
  FAIR = 'FAIR',             // 50-69
  POOR = 'POOR',             // 25-49
  CRITICAL = 'CRITICAL',     // 0-24
}

export interface ChurnPrediction {
  subscriptionId: string;
  customerId: string;
  churnProbability: number;
  riskLevel: RiskLevel;
  riskFactors: ChurnRiskFactor[];
  recommendedActions: string[];
  predictedChurnDate?: Date;
  lastUpdated: Date;
}

export interface ChurnRiskFactor {
  factor: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  dataPoint?: string | number;
}

export interface LifetimeValueEstimate {
  customerId: string;
  currentLTV: number;
  predictedLTV: number;
  monthsRemaining: number;
  averageOrderValue: number;
  purchaseFrequency: number;
  confidenceScore: number;
}

export interface SubscriptionHealthReport {
  subscriptionId: string;
  healthScore: number;
  healthGrade: HealthScore;
  metrics: HealthMetrics;
  trends: HealthTrends;
  recommendations: string[];
}

export interface HealthMetrics {
  engagementScore: number;      // 0-100
  paymentReliability: number;   // 0-100
  tenureMonths: number;
  skippedCyclesRatio: number;
  upgradeDowngradeHistory: number;
  supportTickets: number;
}

export interface HealthTrends {
  engagementTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  paymentTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  overallTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

export interface OptimalTimingRecommendation {
  subscriptionId: string;
  actionType: string;
  recommendedTiming: Date;
  confidence: number;
  reasoning: string;
}

export interface ProductRecommendation {
  customerId: string;
  subscriptionId?: string;
  recommendations: Array<{
    productId: string;
    productName: string;
    confidence: number;
    reason: string;
    type: 'UPSELL' | 'CROSS_SELL' | 'ADDON' | 'REPLACEMENT';
  }>;
}

export interface IntelligenceInsights {
  companyId: string;
  summary: {
    totalSubscriptions: number;
    atRiskCount: number;
    healthyCount: number;
    averageHealthScore: number;
    predictedChurnRate: number;
    totalPredictedLTV: number;
  };
  topRiskSubscriptions: ChurnPrediction[];
  actionableInsights: string[];
  trends: {
    churnTrend: number;      // % change
    healthTrend: number;
    ltvTrend: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class SubscriptionIntelligenceService {
  private readonly logger = new Logger(SubscriptionIntelligenceService.name);

  // Cache for predictions (would use Redis in production)
  private churnPredictions: Map<string, ChurnPrediction> = new Map();
  private ltvEstimates: Map<string, LifetimeValueEstimate> = new Map();
  private healthReports: Map<string, SubscriptionHealthReport> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // CHURN PREDICTION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Predict churn risk for a subscription
   */
  async predictChurn(subscriptionId: string): Promise<ChurnPrediction> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        customer: true,
        subscriptionPlan: true,
        items: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    // Get customer order history
    const orders = await this.prisma.order.findMany({
      where: { customerId: subscription.customerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Calculate risk factors
    const riskFactors = this.calculateRiskFactors(subscription, orders);

    // Calculate churn probability based on factors
    const churnProbability = this.calculateChurnProbability(riskFactors);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(churnProbability);

    // Generate recommendations
    const recommendedActions = this.generateChurnRecommendations(riskFactors, riskLevel);

    const prediction: ChurnPrediction = {
      subscriptionId,
      customerId: subscription.customerId,
      churnProbability,
      riskLevel,
      riskFactors,
      recommendedActions,
      predictedChurnDate: churnProbability > 0.7
        ? this.predictChurnDate(subscription)
        : undefined,
      lastUpdated: new Date(),
    };

    this.churnPredictions.set(subscriptionId, prediction);

    // Emit event for high-risk subscriptions
    if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL) {
      this.eventEmitter.emit('subscription.churn_risk.high', {
        subscriptionId,
        customerId: subscription.customerId,
        riskLevel,
        churnProbability,
      });
    }

    return prediction;
  }

  /**
   * Calculate risk factors for churn
   */
  private calculateRiskFactors(
    subscription: Subscription & { customer: Customer; items: unknown[] },
    orders: Order[],
  ): ChurnRiskFactor[] {
    const factors: ChurnRiskFactor[] = [];

    // 1. Payment failures
    const metadata = subscription.metadata as Record<string, unknown> || {};
    const paymentFailures = (metadata.paymentFailures as number) || 0;
    if (paymentFailures > 0) {
      factors.push({
        factor: 'PAYMENT_FAILURES',
        impact: paymentFailures >= 3 ? 'HIGH' : 'MEDIUM',
        description: `${paymentFailures} payment failure(s) in history`,
        dataPoint: paymentFailures,
      });
    }

    // 2. Skipped cycles
    const skipCount = subscription.skipCount || 0;
    if (skipCount > 0) {
      factors.push({
        factor: 'SKIPPED_CYCLES',
        impact: skipCount >= 3 ? 'HIGH' : 'MEDIUM',
        description: `${skipCount} skipped delivery cycle(s)`,
        dataPoint: skipCount,
      });
    }

    // 3. Recent pause
    if (subscription.pausedAt) {
      factors.push({
        factor: 'RECENT_PAUSE',
        impact: 'MEDIUM',
        description: 'Subscription was recently paused',
        dataPoint: subscription.pausedAt.toISOString(),
      });
    }

    // 4. Low engagement (no recent orders)
    const recentOrders = orders.filter((o) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return o.createdAt > thirtyDaysAgo;
    });
    if (recentOrders.length === 0 && orders.length > 0) {
      factors.push({
        factor: 'LOW_ENGAGEMENT',
        impact: 'MEDIUM',
        description: 'No orders in the last 30 days',
      });
    }

    // 5. Subscription age (new subscribers more likely to churn)
    const startedAt = metadata.startedAt
      ? new Date(metadata.startedAt as string)
      : subscription.createdAt;
    const tenureMonths = startedAt
      ? Math.floor((Date.now() - startedAt.getTime()) / (30 * 24 * 60 * 60 * 1000))
      : 0;
    if (tenureMonths < 3) {
      factors.push({
        factor: 'NEW_SUBSCRIBER',
        impact: 'LOW',
        description: `New subscriber (${tenureMonths} month(s))`,
        dataPoint: tenureMonths,
      });
    }

    // 6. Trial conversion status
    if (subscription.trialStatus === 'ACTIVE') {
      factors.push({
        factor: 'TRIAL_ACTIVE',
        impact: 'MEDIUM',
        description: 'Currently in trial period',
      });
    }

    // 7. Price sensitivity (downgrades in history)
    const downgradeCount = (metadata.planChanges as unknown[])?.filter(
      (change: unknown) => (change as { type?: string })?.type === 'DOWNGRADE'
    ).length || 0;
    if (downgradeCount > 0) {
      factors.push({
        factor: 'PRICE_SENSITIVE',
        impact: 'MEDIUM',
        description: 'Has downgraded plan before',
        dataPoint: downgradeCount,
      });
    }

    return factors;
  }

  /**
   * Calculate churn probability from risk factors
   */
  private calculateChurnProbability(factors: ChurnRiskFactor[]): number {
    const weights: Record<string, number> = {
      PAYMENT_FAILURES: 0.25,
      SKIPPED_CYCLES: 0.15,
      RECENT_PAUSE: 0.15,
      LOW_ENGAGEMENT: 0.15,
      NEW_SUBSCRIBER: 0.10,
      TRIAL_ACTIVE: 0.10,
      PRICE_SENSITIVE: 0.10,
    };

    const impactMultipliers: Record<string, number> = {
      HIGH: 1.0,
      MEDIUM: 0.6,
      LOW: 0.3,
    };

    let totalProbability = 0.05; // Base churn rate

    for (const factor of factors) {
      const weight = weights[factor.factor] || 0.05;
      const multiplier = impactMultipliers[factor.impact];
      totalProbability += weight * multiplier;
    }

    return Math.min(totalProbability, 0.95);
  }

  /**
   * Determine risk level from probability
   */
  private determineRiskLevel(probability: number): RiskLevel {
    if (probability >= 0.75) return RiskLevel.CRITICAL;
    if (probability >= 0.50) return RiskLevel.HIGH;
    if (probability >= 0.25) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Generate churn prevention recommendations
   */
  private generateChurnRecommendations(
    factors: ChurnRiskFactor[],
    riskLevel: RiskLevel,
  ): string[] {
    const recommendations: string[] = [];

    for (const factor of factors) {
      switch (factor.factor) {
        case 'PAYMENT_FAILURES':
          recommendations.push('Reach out about payment method update');
          recommendations.push('Consider offering payment flexibility');
          break;
        case 'SKIPPED_CYCLES':
          recommendations.push('Survey customer about product satisfaction');
          recommendations.push('Offer frequency adjustment');
          break;
        case 'RECENT_PAUSE':
          recommendations.push('Send re-engagement email');
          recommendations.push('Offer incentive to resume');
          break;
        case 'LOW_ENGAGEMENT':
          recommendations.push('Personalized outreach recommended');
          recommendations.push('Consider win-back campaign');
          break;
        case 'PRICE_SENSITIVE':
          recommendations.push('Offer discount or value-add');
          recommendations.push('Highlight product value');
          break;
      }
    }

    if (riskLevel === RiskLevel.CRITICAL || riskLevel === RiskLevel.HIGH) {
      recommendations.unshift('Prioritize for immediate intervention');
    }

    return [...new Set(recommendations)].slice(0, 5);
  }

  /**
   * Predict when churn might occur
   */
  private predictChurnDate(subscription: Subscription): Date {
    const predictedDate = new Date();
    // High-risk typically churns within 1-2 billing cycles
    predictedDate.setMonth(predictedDate.getMonth() + 2);
    return predictedDate;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LIFETIME VALUE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Estimate customer lifetime value
   */
  async estimateLTV(customerId: string): Promise<LifetimeValueEstimate> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    // Get all orders
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'asc' },
    });

    // Get active subscriptions
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        customerId,
        status: SubscriptionStatus.ACTIVE,
        deletedAt: null,
      },
    });

    // Calculate current LTV
    const currentLTV = orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    );

    // Calculate average order value
    const averageOrderValue = orders.length > 0
      ? currentLTV / orders.length
      : subscriptions.reduce((sum, s) => sum + Number(s.planAmount), 0);

    // Calculate purchase frequency (orders per month)
    let purchaseFrequency = 1;
    if (orders.length >= 2) {
      const firstOrder = orders[0].createdAt;
      const lastOrder = orders[orders.length - 1].createdAt;
      const monthsSpan = Math.max(
        1,
        (lastOrder.getTime() - firstOrder.getTime()) / (30 * 24 * 60 * 60 * 1000),
      );
      purchaseFrequency = orders.length / monthsSpan;
    }

    // Estimate months remaining (based on churn probability)
    const churnPrediction = subscriptions.length > 0
      ? await this.predictChurn(subscriptions[0].id)
      : null;

    const survivalRate = 1 - (churnPrediction?.churnProbability || 0.1);
    const monthsRemaining = Math.round(12 * survivalRate);

    // Calculate predicted LTV
    const predictedLTV = currentLTV + (averageOrderValue * purchaseFrequency * monthsRemaining);

    const estimate: LifetimeValueEstimate = {
      customerId,
      currentLTV,
      predictedLTV,
      monthsRemaining,
      averageOrderValue,
      purchaseFrequency,
      confidenceScore: orders.length >= 5 ? 0.8 : 0.5,
    };

    this.ltvEstimates.set(customerId, estimate);

    return estimate;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION HEALTH
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate subscription health report
   */
  async getHealthReport(subscriptionId: string): Promise<SubscriptionHealthReport> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { customer: true, subscriptionPlan: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    // Get customer orders
    const orders = await this.prisma.order.findMany({
      where: { customerId: subscription.customerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Calculate metrics
    const metrics = this.calculateHealthMetrics(subscription, orders);

    // Calculate trends
    const trends = this.calculateHealthTrends(subscription, orders);

    // Calculate overall health score
    const healthScore = this.calculateHealthScore(metrics);
    const healthGrade = this.getHealthGrade(healthScore);

    // Generate recommendations
    const recommendations = this.generateHealthRecommendations(metrics, healthGrade);

    const report: SubscriptionHealthReport = {
      subscriptionId,
      healthScore,
      healthGrade,
      metrics,
      trends,
      recommendations,
    };

    this.healthReports.set(subscriptionId, report);

    return report;
  }

  /**
   * Calculate health metrics
   */
  private calculateHealthMetrics(
    subscription: Subscription,
    orders: Order[],
  ): HealthMetrics {
    // Engagement score based on order frequency and recency
    const recentOrderCount = orders.filter((o) => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      return o.createdAt > sixtyDaysAgo;
    }).length;
    const engagementScore = Math.min(100, recentOrderCount * 25);

    // Payment reliability
    const metadata = subscription.metadata as Record<string, unknown> || {};
    const paymentFailures = (metadata.paymentFailures as number) || 0;
    const totalPayments = (metadata.totalRebills as number) || 1;
    const paymentReliability = Math.max(0, 100 - (paymentFailures / totalPayments * 100));

    // Tenure
    const startedAt = metadata.startedAt
      ? new Date(metadata.startedAt as string)
      : subscription.createdAt;
    const tenureMonths = startedAt
      ? Math.floor((Date.now() - startedAt.getTime()) / (30 * 24 * 60 * 60 * 1000))
      : 0;

    // Skipped cycles ratio
    const skipCount = subscription.skipCount || 0;
    const totalCycles = totalPayments + skipCount;
    const skippedCyclesRatio = totalCycles > 0
      ? skipCount / totalCycles
      : 0;

    return {
      engagementScore,
      paymentReliability,
      tenureMonths,
      skippedCyclesRatio,
      upgradeDowngradeHistory: 0, // Would track from plan change history
      supportTickets: 0, // Would integrate with support system
    };
  }

  /**
   * Calculate health trends
   */
  private calculateHealthTrends(
    subscription: Subscription,
    orders: Order[],
  ): HealthTrends {
    // Simple trend calculation - would be more sophisticated in production
    const recentOrders = orders.filter((o) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return o.createdAt > thirtyDaysAgo;
    });

    const olderOrders = orders.filter((o) => {
      const sixtyDaysAgo = new Date();
      const thirtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return o.createdAt > sixtyDaysAgo && o.createdAt <= thirtyDaysAgo;
    });

    const engagementTrend = recentOrders.length > olderOrders.length
      ? 'IMPROVING'
      : recentOrders.length < olderOrders.length
        ? 'DECLINING'
        : 'STABLE';

    return {
      engagementTrend,
      paymentTrend: 'STABLE', // Would analyze payment history
      overallTrend: engagementTrend,
    };
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(metrics: HealthMetrics): number {
    const weights = {
      engagementScore: 0.3,
      paymentReliability: 0.25,
      tenureBonus: 0.15,
      skippedPenalty: 0.15,
      supportPenalty: 0.15,
    };

    let score = 0;

    // Engagement (0-100)
    score += metrics.engagementScore * weights.engagementScore;

    // Payment reliability (0-100)
    score += metrics.paymentReliability * weights.paymentReliability;

    // Tenure bonus (max 15 points at 12+ months)
    const tenureBonus = Math.min(100, metrics.tenureMonths * 8.33);
    score += tenureBonus * weights.tenureBonus;

    // Skipped cycles penalty
    const skippedPenalty = 100 - (metrics.skippedCyclesRatio * 100);
    score += skippedPenalty * weights.skippedPenalty;

    // Support tickets (fewer is better)
    const supportScore = Math.max(0, 100 - metrics.supportTickets * 10);
    score += supportScore * weights.supportPenalty;

    return Math.round(score);
  }

  /**
   * Get health grade from score
   */
  private getHealthGrade(score: number): HealthScore {
    if (score >= 90) return HealthScore.EXCELLENT;
    if (score >= 70) return HealthScore.GOOD;
    if (score >= 50) return HealthScore.FAIR;
    if (score >= 25) return HealthScore.POOR;
    return HealthScore.CRITICAL;
  }

  /**
   * Generate health recommendations
   */
  private generateHealthRecommendations(
    metrics: HealthMetrics,
    grade: HealthScore,
  ): string[] {
    const recommendations: string[] = [];

    if (metrics.engagementScore < 50) {
      recommendations.push('Increase engagement with personalized communications');
    }

    if (metrics.paymentReliability < 80) {
      recommendations.push('Review payment method and retry strategy');
    }

    if (metrics.skippedCyclesRatio > 0.3) {
      recommendations.push('Survey customer about delivery frequency preferences');
    }

    if (grade === HealthScore.CRITICAL || grade === HealthScore.POOR) {
      recommendations.push('Schedule proactive customer outreach');
      recommendations.push('Consider retention offer');
    }

    if (metrics.tenureMonths >= 12 && grade === HealthScore.EXCELLENT) {
      recommendations.push('Excellent loyalty - consider for VIP program');
    }

    return recommendations.slice(0, 4);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPANY INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get intelligence insights for a company
   */
  async getCompanyInsights(companyId: string): Promise<IntelligenceInsights> {
    // Get all subscriptions
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        companyId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED] },
        deletedAt: null,
      },
    });

    // Generate predictions for each (would be batched in production)
    const predictions: ChurnPrediction[] = [];
    const healthScores: number[] = [];

    for (const sub of subscriptions.slice(0, 50)) { // Limit for demo
      try {
        const prediction = await this.predictChurn(sub.id);
        predictions.push(prediction);

        const health = await this.getHealthReport(sub.id);
        healthScores.push(health.healthScore);
      } catch {
        // Skip errored subscriptions
      }
    }

    // Calculate summary
    const atRiskCount = predictions.filter(
      (p) => p.riskLevel === RiskLevel.HIGH || p.riskLevel === RiskLevel.CRITICAL,
    ).length;

    const healthyCount = predictions.filter(
      (p) => p.riskLevel === RiskLevel.LOW,
    ).length;

    const averageHealthScore = healthScores.length > 0
      ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
      : 0;

    const predictedChurnRate = predictions.length > 0
      ? predictions.reduce((sum, p) => sum + p.churnProbability, 0) / predictions.length
      : 0;

    // Top risk subscriptions
    const topRiskSubscriptions = predictions
      .sort((a, b) => b.churnProbability - a.churnProbability)
      .slice(0, 10);

    // Generate actionable insights
    const actionableInsights = this.generateCompanyInsights(predictions, healthScores);

    return {
      companyId,
      summary: {
        totalSubscriptions: subscriptions.length,
        atRiskCount,
        healthyCount,
        averageHealthScore,
        predictedChurnRate,
        totalPredictedLTV: 0, // Would calculate from LTV estimates
      },
      topRiskSubscriptions,
      actionableInsights,
      trends: {
        churnTrend: 0, // Would compare to previous period
        healthTrend: 0,
        ltvTrend: 0,
      },
    };
  }

  /**
   * Generate company-level insights
   */
  private generateCompanyInsights(
    predictions: ChurnPrediction[],
    healthScores: number[],
  ): string[] {
    const insights: string[] = [];

    const highRiskCount = predictions.filter(
      (p) => p.riskLevel === RiskLevel.HIGH || p.riskLevel === RiskLevel.CRITICAL,
    ).length;

    if (highRiskCount > predictions.length * 0.2) {
      insights.push(`${highRiskCount} subscriptions at high risk - immediate attention needed`);
    }

    const avgHealth = healthScores.length > 0
      ? healthScores.reduce((a, b) => a + b, 0) / healthScores.length
      : 0;

    if (avgHealth < 60) {
      insights.push('Overall subscription health is below average - review retention strategy');
    }

    // Analyze common risk factors
    const factorCounts = new Map<string, number>();
    for (const pred of predictions) {
      for (const factor of pred.riskFactors) {
        factorCounts.set(factor.factor, (factorCounts.get(factor.factor) || 0) + 1);
      }
    }

    const sortedFactors = Array.from(factorCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    if (sortedFactors.length > 0 && sortedFactors[0][1] > predictions.length * 0.3) {
      insights.push(`Most common risk factor: ${sortedFactors[0][0]} (${sortedFactors[0][1]} subscriptions)`);
    }

    return insights;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRODUCT RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get product recommendations for a customer
   */
  async getProductRecommendations(
    customerId: string,
    subscriptionId?: string,
  ): Promise<ProductRecommendation> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    // Get customer's order history
    const orders = await this.prisma.order.findMany({
      where: { customerId },
      include: { items: true },
    });

    // Get current subscription items if provided
    let currentProductIds: string[] = [];
    if (subscriptionId) {
      const subItems = await this.prisma.subscriptionItem.findMany({
        where: { subscriptionId },
      });
      currentProductIds = subItems.map((i) => i.productId);
    }

    // Get popular products in company
    const popularProducts = await this.prisma.product.findMany({
      where: {
        companyId: customer.companyId,
        status: 'ACTIVE',
        id: { notIn: currentProductIds },
        deletedAt: null,
      },
      take: 10,
    });

    // Simple recommendation logic (would use ML in production)
    const recommendations = popularProducts.slice(0, 3).map((product, index): {
      productId: string;
      productName: string;
      confidence: number;
      reason: string;
      type: 'UPSELL' | 'CROSS_SELL' | 'ADDON' | 'REPLACEMENT';
    } => ({
      productId: product.id,
      productName: product.name,
      confidence: 0.7 - index * 0.1,
      reason: index === 0 ? 'Popular in your category' : 'Customers also bought',
      type: index === 0 ? 'UPSELL' : 'CROSS_SELL',
    }));

    return {
      customerId,
      subscriptionId,
      recommendations,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // OPTIMAL TIMING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get optimal timing for an action
   */
  async getOptimalTiming(
    subscriptionId: string,
    actionType: string,
  ): Promise<OptimalTimingRecommendation> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    // Simple logic - would use ML in production
    const recommendedTiming = new Date();

    switch (actionType) {
      case 'UPSELL':
        // Best after 3 successful orders
        recommendedTiming.setDate(recommendedTiming.getDate() + 7);
        return {
          subscriptionId,
          actionType,
          recommendedTiming,
          confidence: 0.75,
          reasoning: 'Customer has established engagement pattern',
        };

      case 'RETENTION_OFFER':
        // Before predicted churn
        const prediction = await this.predictChurn(subscriptionId);
        if (prediction.predictedChurnDate) {
          recommendedTiming.setTime(prediction.predictedChurnDate.getTime());
          recommendedTiming.setDate(recommendedTiming.getDate() - 14);
        }
        return {
          subscriptionId,
          actionType,
          recommendedTiming,
          confidence: 0.65,
          reasoning: '2 weeks before predicted churn window',
        };

      default:
        return {
          subscriptionId,
          actionType,
          recommendedTiming,
          confidence: 0.5,
          reasoning: 'Based on general best practices',
        };
    }
  }
}
