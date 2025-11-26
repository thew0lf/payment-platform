import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ChurnSignal,
  ChurnSignalType,
  ChurnRiskScore,
  RiskLevel,
  CustomerEngagementMetrics,
  RecordSignalDto,
  GetRiskScoreDto,
  BulkRiskScoreDto,
  DEFAULT_SIGNAL_WEIGHTS,
  SignalWeight,
  ChurnSignalDetectedEvent,
  HighRiskCustomerDetectedEvent,
  SentimentLevel,
} from './types/intent.types';

@Injectable()
export class ChurnPredictorService {
  private readonly logger = new Logger(ChurnPredictorService.name);
  private readonly signalWeights: Map<ChurnSignalType, SignalWeight>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Initialize signal weights map
    this.signalWeights = new Map(
      DEFAULT_SIGNAL_WEIGHTS.map((sw) => [sw.signalType, sw]),
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // SIGNAL RECORDING
  // ═══════════════════════════════════════════════════════════════

  async recordSignal(dto: RecordSignalDto): Promise<ChurnSignal> {
    const weight = this.signalWeights.get(dto.signalType);
    if (!weight) {
      throw new Error(`Unknown signal type: ${dto.signalType}`);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + weight.decayDays);

    // Check for existing signals if not additive
    if (!weight.isAdditive) {
      const existing = await this.prisma.churnSignal.findFirst({
        where: {
          customerId: dto.customerId,
          signalType: dto.signalType,
          expiresAt: { gt: new Date() },
        },
      });
      if (existing) {
        // Update existing signal
        const updated = await this.prisma.churnSignal.update({
          where: { id: existing.id },
          data: {
            value: String(dto.value ?? ''),
            confidence: dto.confidence ?? 0.8,
            metadata: dto.metadata as any,
            detectedAt: new Date(),
            expiresAt,
          },
        });
        return this.mapToChurnSignal(updated);
      }
    } else {
      // Check max occurrences for additive signals
      const count = await this.prisma.churnSignal.count({
        where: {
          customerId: dto.customerId,
          signalType: dto.signalType,
          expiresAt: { gt: new Date() },
        },
      });
      if (count >= weight.maxOccurrences) {
        this.logger.debug(`Max occurrences reached for ${dto.signalType}`);
        // Return most recent signal without creating new one
        const latest = await this.prisma.churnSignal.findFirst({
          where: {
            customerId: dto.customerId,
            signalType: dto.signalType,
          },
          orderBy: { detectedAt: 'desc' },
        });
        return this.mapToChurnSignal(latest!);
      }
    }

    // Create new signal
    const signal = await this.prisma.churnSignal.create({
      data: {
        customerId: dto.customerId,
        signalType: dto.signalType,
        weight: weight.baseWeight,
        value: String(dto.value ?? ''),
        confidence: dto.confidence ?? 0.8,
        decayDays: weight.decayDays,
        detectedAt: new Date(),
        expiresAt,
        metadata: dto.metadata as any,
      },
    });

    const churnSignal = this.mapToChurnSignal(signal);

    // Recalculate risk score
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });

    if (customer) {
      const previousScore = await this.getStoredRiskScore(dto.customerId);
      const newRiskScore = await this.calculateRiskScore({
        customerId: dto.customerId,
        companyId: customer.companyId,
        includeSignals: true,
        includeRecommendations: true,
      });

      // Emit event
      const event: ChurnSignalDetectedEvent = {
        signal: churnSignal,
        previousScore: previousScore?.score,
        newScore: newRiskScore.score,
        riskLevelChanged: previousScore?.riskLevel !== newRiskScore.riskLevel,
        previousRiskLevel: previousScore?.riskLevel,
        newRiskLevel: newRiskScore.riskLevel,
      };
      this.eventEmitter.emit('churn.signal.detected', event);

      // Check for high risk
      if (
        newRiskScore.riskLevel === RiskLevel.HIGH ||
        newRiskScore.riskLevel === RiskLevel.CRITICAL
      ) {
        const highRiskEvent: HighRiskCustomerDetectedEvent = {
          customerId: dto.customerId,
          companyId: customer.companyId,
          riskScore: newRiskScore,
          recommendedIntervention:
            newRiskScore.recommendedActions[0] || 'save_flow',
        };
        this.eventEmitter.emit('churn.high_risk.detected', highRiskEvent);
      }
    }

    return churnSignal;
  }

  // ═══════════════════════════════════════════════════════════════
  // RISK SCORE CALCULATION
  // ═══════════════════════════════════════════════════════════════

  async calculateRiskScore(dto: GetRiskScoreDto): Promise<ChurnRiskScore> {
    // Get active signals
    const signals = await this.prisma.churnSignal.findMany({
      where: {
        customerId: dto.customerId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { detectedAt: 'desc' },
    });

    // Calculate weighted score with decay
    const now = new Date();
    let totalWeight = 0;
    const signalBreakdown = {
      engagement: 0,
      payment: 0,
      behavior: 0,
      lifecycle: 0,
      external: 0,
    };

    for (const signal of signals) {
      const weightConfig = this.signalWeights.get(
        signal.signalType as ChurnSignalType,
      );
      if (!weightConfig) continue;

      // Calculate decay
      const daysSinceDetection =
        (now.getTime() - signal.detectedAt.getTime()) / (24 * 60 * 60 * 1000);
      const decayFactor = Math.max(
        0,
        1 - daysSinceDetection / signal.decayDays,
      );
      const effectiveWeight = signal.weight * decayFactor * signal.confidence;

      totalWeight += effectiveWeight;
      signalBreakdown[weightConfig.category] += effectiveWeight;
    }

    // Normalize to 0-100 scale (cap at 100)
    const score = Math.min(100, totalWeight);

    // Determine risk level
    let riskLevel: RiskLevel;
    if (score >= 80) riskLevel = RiskLevel.CRITICAL;
    else if (score >= 60) riskLevel = RiskLevel.HIGH;
    else if (score >= 40) riskLevel = RiskLevel.MEDIUM;
    else if (score >= 20) riskLevel = RiskLevel.LOW;
    else riskLevel = RiskLevel.MINIMAL;

    // Get previous score for trend
    const previousScore = await this.getStoredRiskScore(dto.customerId);
    const trendDelta = previousScore ? score - previousScore.score : 0;
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (trendDelta > 5) trend = 'declining';
    else if (trendDelta < -5) trend = 'improving';

    // Generate recommendations
    const recommendedActions = dto.includeRecommendations
      ? this.generateRecommendations(riskLevel, signalBreakdown)
      : [];

    const riskScore: ChurnRiskScore = {
      customerId: dto.customerId,
      companyId: dto.companyId,
      score,
      riskLevel,
      signals: dto.includeSignals ? signals.map(this.mapToChurnSignal) : [],
      signalBreakdown,
      trend,
      trendDelta,
      predictedChurnDate: this.predictChurnDate(score, trend),
      recommendedActions,
      calculatedAt: now,
      nextCalculationAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Next day
    };

    // Store risk score
    await this.storeRiskScore(riskScore);

    return riskScore;
  }

  async getCustomerRiskScore(
    dto: GetRiskScoreDto,
  ): Promise<ChurnRiskScore | null> {
    // Try to get cached score first
    const cached = await this.getStoredRiskScore(dto.customerId);
    if (
      cached &&
      cached.calculatedAt > new Date(Date.now() - 6 * 60 * 60 * 1000)
    ) {
      // Return cached if less than 6 hours old
      return cached;
    }

    // Calculate fresh score
    return this.calculateRiskScore(dto);
  }

  async getHighRiskCustomers(dto: BulkRiskScoreDto): Promise<ChurnRiskScore[]> {
    const minLevel = dto.minRiskLevel || RiskLevel.HIGH;
    const riskLevels = this.getRiskLevelsAtOrAbove(minLevel);

    const riskScores = await this.prisma.churnRiskScore.findMany({
      where: {
        companyId: dto.companyId,
        riskLevel: { in: riskLevels },
      },
      orderBy: { score: 'desc' },
      take: dto.limit || 50,
      skip: dto.offset || 0,
    });

    return riskScores.map(this.mapToChurnRiskScore);
  }

  // ═══════════════════════════════════════════════════════════════
  // ENGAGEMENT METRICS
  // ═══════════════════════════════════════════════════════════════

  async calculateEngagementMetrics(
    customerId: string,
    companyId: string,
  ): Promise<CustomerEngagementMetrics> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
        },
        subscriptions: true,
      },
    });

    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Order metrics
    const ordersLast30Days = customer.orders.filter(
      (o) => o.createdAt >= thirtyDaysAgo,
    ).length;
    const ordersLast90Days = customer.orders.filter(
      (o) => o.createdAt >= ninetyDaysAgo,
    ).length;

    // Calculate order frequency trend
    const orders30To60DaysAgo = customer.orders.filter(
      (o) =>
        o.createdAt >=
          new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000) &&
        o.createdAt < thirtyDaysAgo,
    ).length;
    const orderFrequencyTrend =
      orders30To60DaysAgo > 0
        ? ((ordersLast30Days - orders30To60DaysAgo) / orders30To60DaysAgo) * 100
        : 0;

    // Skip metrics (for subscription customers)
    const skipsLast30Days = 0; // Placeholder - would come from subscription skip events
    const skipRate = 0; // Placeholder

    // Support metrics (would come from support ticket system)
    const supportTicketsLast30Days = 0; // Placeholder

    // Calculate engagement score (0-100)
    let engagementScore = 50; // Base score

    // Adjust based on order frequency
    if (ordersLast30Days > 0) engagementScore += 20;
    if (ordersLast90Days > 2) engagementScore += 10;

    // Adjust based on trend
    if (orderFrequencyTrend > 0) engagementScore += 10;
    else if (orderFrequencyTrend < -20) engagementScore -= 20;

    // Cap at 0-100
    engagementScore = Math.max(0, Math.min(100, engagementScore));

    // Calculate health score
    const healthScore = this.calculateHealthScore(
      engagementScore,
      skipRate,
      supportTicketsLast30Days,
    );

    const metrics: CustomerEngagementMetrics = {
      customerId,
      companyId,
      lastLoginAt: undefined, // Would come from auth system
      loginFrequency: 0, // Would come from auth system
      loginFrequencyTrend: 0,
      featuresUsed: [],
      featureUsageScore: 0,
      totalOrders: customer.orders.length,
      ordersLast30Days,
      ordersLast90Days,
      orderFrequencyTrend,
      totalSkips: 0,
      skipsLast30Days,
      skipRate,
      supportTicketsTotal: 0,
      supportTicketsLast30Days,
      avgTicketResolutionHours: 0,
      lastNpsScore: undefined,
      lastNpsDate: undefined,
      lastFeedbackSentiment: undefined,
      engagementScore,
      healthScore,
      calculatedAt: now,
    };

    // Store metrics
    await this.storeEngagementMetrics(metrics);

    return metrics;
  }

  private calculateHealthScore(
    engagementScore: number,
    skipRate: number,
    recentTickets: number,
  ): number {
    let healthScore = engagementScore;

    // Penalize high skip rate
    if (skipRate > 50) healthScore -= 20;
    else if (skipRate > 30) healthScore -= 10;

    // Penalize many support tickets
    if (recentTickets > 3) healthScore -= 15;
    else if (recentTickets > 1) healthScore -= 5;

    return Math.max(0, Math.min(100, healthScore));
  }

  // ═══════════════════════════════════════════════════════════════
  // SCHEDULED TASKS
  // ═══════════════════════════════════════════════════════════════

  @Cron(CronExpression.EVERY_HOUR)
  async processExpiredSignals(): Promise<void> {
    this.logger.debug('Processing expired churn signals...');

    await this.prisma.churnSignal.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async recalculateAllRiskScores(): Promise<void> {
    this.logger.debug('Recalculating all risk scores...');

    // Get all customers with active signals
    const customersWithSignals = await this.prisma.churnSignal.findMany({
      where: { expiresAt: { gt: new Date() } },
      distinct: ['customerId'],
      select: { customerId: true },
    });

    for (const { customerId } of customersWithSignals) {
      try {
        const customer = await this.prisma.customer.findUnique({
          where: { id: customerId },
        });
        if (customer) {
          await this.calculateRiskScore({
            customerId,
            companyId: customer.companyId,
            includeRecommendations: true,
          });
        }
      } catch (error) {
        this.logger.error(
          `Failed to recalculate risk score for ${customerId}`,
          error,
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private generateRecommendations(
    riskLevel: RiskLevel,
    breakdown: Record<string, number>,
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === RiskLevel.CRITICAL || riskLevel === RiskLevel.HIGH) {
      recommendations.push('save_flow');
      recommendations.push('personal_outreach');
    }

    // Specific recommendations based on signal breakdown
    if (breakdown.payment > 20) {
      recommendations.push('payment_recovery');
      recommendations.push('payment_method_update');
    }

    if (breakdown.engagement > 20) {
      recommendations.push('re_engagement_email');
      recommendations.push('exclusive_offer');
    }

    if (breakdown.behavior > 15) {
      recommendations.push('product_recommendation');
      recommendations.push('pause_offer');
    }

    return [...new Set(recommendations)]; // Dedupe
  }

  private predictChurnDate(score: number, trend: string): Date | undefined {
    if (score < 40) return undefined;

    const daysUntilChurn =
      trend === 'declining'
        ? Math.max(7, Math.floor((100 - score) * 0.5))
        : trend === 'improving'
          ? Math.max(30, Math.floor((100 - score) * 1.5))
          : Math.floor((100 - score) * 1);

    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + daysUntilChurn);
    return predictedDate;
  }

  private getRiskLevelsAtOrAbove(level: RiskLevel): RiskLevel[] {
    const levels = [
      RiskLevel.MINIMAL,
      RiskLevel.LOW,
      RiskLevel.MEDIUM,
      RiskLevel.HIGH,
      RiskLevel.CRITICAL,
    ];
    const index = levels.indexOf(level);
    return levels.slice(index);
  }

  private async getStoredRiskScore(
    customerId: string,
  ): Promise<ChurnRiskScore | null> {
    const stored = await this.prisma.churnRiskScore.findFirst({
      where: { customerId },
      orderBy: { calculatedAt: 'desc' },
    });
    return stored ? this.mapToChurnRiskScore(stored) : null;
  }

  private async storeRiskScore(riskScore: ChurnRiskScore): Promise<void> {
    await this.prisma.churnRiskScore.upsert({
      where: { customerId: riskScore.customerId },
      create: {
        customerId: riskScore.customerId,
        companyId: riskScore.companyId,
        score: riskScore.score,
        riskLevel: riskScore.riskLevel,
        signalBreakdown: riskScore.signalBreakdown,
        trend: riskScore.trend,
        trendDelta: riskScore.trendDelta,
        predictedChurnDate: riskScore.predictedChurnDate,
        recommendedActions: riskScore.recommendedActions,
        calculatedAt: riskScore.calculatedAt,
        nextCalculationAt: riskScore.nextCalculationAt,
      },
      update: {
        score: riskScore.score,
        riskLevel: riskScore.riskLevel,
        signalBreakdown: riskScore.signalBreakdown,
        trend: riskScore.trend,
        trendDelta: riskScore.trendDelta,
        predictedChurnDate: riskScore.predictedChurnDate,
        recommendedActions: riskScore.recommendedActions,
        calculatedAt: riskScore.calculatedAt,
        nextCalculationAt: riskScore.nextCalculationAt,
      },
    });
  }

  private async storeEngagementMetrics(
    metrics: CustomerEngagementMetrics,
  ): Promise<void> {
    await this.prisma.customerEngagementMetrics.upsert({
      where: { customerId: metrics.customerId },
      create: {
        customerId: metrics.customerId,
        companyId: metrics.companyId,
        lastLoginAt: metrics.lastLoginAt,
        loginFrequency: metrics.loginFrequency,
        loginFrequencyTrend: metrics.loginFrequencyTrend,
        featuresUsed: metrics.featuresUsed,
        featureUsageScore: metrics.featureUsageScore,
        totalOrders: metrics.totalOrders,
        ordersLast30Days: metrics.ordersLast30Days,
        ordersLast90Days: metrics.ordersLast90Days,
        orderFrequencyTrend: metrics.orderFrequencyTrend,
        totalSkips: metrics.totalSkips,
        skipsLast30Days: metrics.skipsLast30Days,
        skipRate: metrics.skipRate,
        supportTicketsTotal: metrics.supportTicketsTotal,
        supportTicketsLast30Days: metrics.supportTicketsLast30Days,
        avgTicketResolutionHours: metrics.avgTicketResolutionHours,
        lastNpsScore: metrics.lastNpsScore,
        lastNpsDate: metrics.lastNpsDate,
        lastFeedbackSentiment: metrics.lastFeedbackSentiment as string,
        engagementScore: metrics.engagementScore,
        healthScore: metrics.healthScore,
        calculatedAt: metrics.calculatedAt,
      },
      update: {
        lastLoginAt: metrics.lastLoginAt,
        loginFrequency: metrics.loginFrequency,
        loginFrequencyTrend: metrics.loginFrequencyTrend,
        featuresUsed: metrics.featuresUsed,
        featureUsageScore: metrics.featureUsageScore,
        totalOrders: metrics.totalOrders,
        ordersLast30Days: metrics.ordersLast30Days,
        ordersLast90Days: metrics.ordersLast90Days,
        orderFrequencyTrend: metrics.orderFrequencyTrend,
        totalSkips: metrics.totalSkips,
        skipsLast30Days: metrics.skipsLast30Days,
        skipRate: metrics.skipRate,
        supportTicketsTotal: metrics.supportTicketsTotal,
        supportTicketsLast30Days: metrics.supportTicketsLast30Days,
        avgTicketResolutionHours: metrics.avgTicketResolutionHours,
        lastNpsScore: metrics.lastNpsScore,
        lastNpsDate: metrics.lastNpsDate,
        lastFeedbackSentiment: metrics.lastFeedbackSentiment as string,
        engagementScore: metrics.engagementScore,
        healthScore: metrics.healthScore,
        calculatedAt: metrics.calculatedAt,
      },
    });
  }

  private mapToChurnSignal(data: any): ChurnSignal {
    return {
      id: data.id,
      customerId: data.customerId,
      signalType: data.signalType as ChurnSignalType,
      weight: data.weight,
      value: data.value,
      confidence: data.confidence,
      decayDays: data.decayDays,
      detectedAt: data.detectedAt,
      expiresAt: data.expiresAt,
      metadata: data.metadata,
    };
  }

  private mapToChurnRiskScore(data: any): ChurnRiskScore {
    return {
      customerId: data.customerId,
      companyId: data.companyId,
      score: data.score,
      riskLevel: data.riskLevel as RiskLevel,
      signals: [],
      signalBreakdown: data.signalBreakdown as any,
      trend: data.trend,
      trendDelta: data.trendDelta,
      predictedChurnDate: data.predictedChurnDate,
      recommendedActions: data.recommendedActions || [],
      calculatedAt: data.calculatedAt,
      nextCalculationAt: data.nextCalculationAt,
    };
  }
}
