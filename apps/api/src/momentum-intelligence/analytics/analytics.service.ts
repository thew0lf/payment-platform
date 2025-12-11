import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MomentumOverview,
  SavePerformanceMetrics,
  VoicePerformanceMetrics,
  ContentPerformanceMetrics,
  RevenueAttribution,
  DeliveryChannel,
  SaveOutcome,
  CallOutcome,
  Sentiment,
  ContentType,
} from '../types/momentum.types';
import {
  MetricCategory,
  TimeGranularity,
  MetricValue,
  TrendData,
  DateRange,
  DashboardOverview,
  DashboardAlert,
  ChurnAnalytics,
  SaveFlowAnalytics,
  CustomerServiceAnalytics,
  ContentAnalytics,
  DeliveryAnalytics,
  UpsellAnalytics,
  RevenueAnalytics,
  ReportConfig,
  GeneratedReport,
  RealTimeMetrics,
  BenchmarkData,
  CompanyBenchmarks,
  GetDashboardDto,
  GetAnalyticsDto,
  CreateReportConfigDto,
  GenerateReportDto,
  ReportFormat,
  ReportFrequency,
} from '../types/analytics.types';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // ERROR HANDLING HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Safely extract values from Promise.allSettled results with logging
   * Returns the fulfilled value or the provided default for rejected promises
   */
  private extractSettledValues(
    results: PromiseSettledResult<any>[],
    defaults: any[],
    context: string,
  ): any[] {
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      this.logger.warn(
        `Query ${index + 1} failed in ${context}: ${result.reason?.message || 'Unknown error'}`,
      );
      return defaults[index];
    });
  }

  /**
   * Wrap an analytics method with try-catch and return safe defaults on error
   */
  private async safeAnalyticsCall<T>(
    methodName: string,
    operation: () => Promise<T>,
    defaultValue: T,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.error(
        `Analytics method ${methodName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      return defaultValue;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD OVERVIEW
  // ═══════════════════════════════════════════════════════════════

  async getDashboardOverview(dto: GetDashboardDto): Promise<DashboardOverview> {
    const { startDate, endDate } = this.getDateRange({
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    const previousPeriodDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const previousStart = new Date(startDate.getTime() - previousPeriodDays * 24 * 60 * 60 * 1000);
    const previousEnd = new Date(startDate.getTime() - 1);

    // Get current period data with graceful error handling
    const dashboardResults = await Promise.allSettled([
      this.prisma.saveAttempt.findMany({
        where: { companyId: dto.companyId, createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.saveAttempt.findMany({
        where: { companyId: dto.companyId, createdAt: { gte: previousStart, lte: previousEnd } },
      }),
      this.prisma.customerIntent.findMany({
        where: { companyId: dto.companyId, calculatedAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.deliveryMessage.findMany({
        where: { companyId: dto.companyId, createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.upsellOffer.findMany({
        where: { companyId: dto.companyId, createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    const [saveAttempts, previousSaveAttempts, intents, deliveryMessages, upsellOffers]: any[] =
      this.extractSettledValues(
        dashboardResults,
        [[], [], [], [], []],
        'getDashboardOverview',
      );

    // Calculate KPIs
    const currentSaves = saveAttempts.filter(a => a.outcome?.startsWith('SAVED'));
    const previousSaves = previousSaveAttempts.filter(a => a.outcome?.startsWith('SAVED'));
    const currentRevenue = currentSaves.reduce((sum, a) => sum + (a.revenuePreserved || 0), 0);
    const previousRevenue = previousSaves.reduce((sum, a) => sum + (a.revenuePreserved || 0), 0);

    const currentSaveRate = saveAttempts.length > 0 ? currentSaves.length / saveAttempts.length : 0;
    const previousSaveRate = previousSaveAttempts.length > 0 ? previousSaves.length / previousSaveAttempts.length : 0;

    // Churn rate calculation (simplified)
    const highRiskIntents = intents.filter(i => i.churnRisk === 'HIGH' || i.churnRisk === 'CRITICAL');
    const churnRate = intents.length > 0 ? highRiskIntents.length / intents.length : 0;

    const kpis = {
      totalRevenueSaved: this.createMetricValue(currentRevenue, previousRevenue),
      customersRetained: this.createMetricValue(currentSaves.length, previousSaves.length),
      churnRate: this.createMetricValue(churnRate * 100, 0), // Percentage
      saveRate: this.createMetricValue(currentSaveRate * 100, previousSaveRate * 100),
      averageCustomerLifetimeValue: this.createMetricValue(
        currentRevenue / Math.max(currentSaves.length, 1),
        previousRevenue / Math.max(previousSaves.length, 1),
      ),
      // NPS calculated from voice call satisfaction scores (0-5 scale mapped to NPS)
      // Promoters: 4-5, Passives: 3, Detractors: 0-2
      netPromoterScore: await this.calculateNPS(dto.companyId, startDate, endDate)
    };

    // Quick stats
    const quickStats = {
      activeSubscriptions: await this.prisma.subscription.count({
        where: { companyId: dto.companyId, status: 'ACTIVE' },
      }),
      atRiskCustomers: highRiskIntents.length,
      pendingSaveFlows: saveAttempts.filter(a => !a.completedAt).length,
      scheduledMessages: deliveryMessages.filter(d => d.status === 'SCHEDULED').length,
      openUpsellOpportunities: upsellOffers.filter(o => !o.accepted && !(o as any).dismissed).length,
    };

    // Calculate trends
    const trends = await this.calculateTrends(dto.companyId, startDate, endDate);

    // Get alerts
    const alerts = await this.generateAlerts(dto.companyId, kpis, quickStats);

    return {
      companyId: dto.companyId,
      period: { startDate, endDate },
      generatedAt: new Date(),
      kpis,
      quickStats,
      trends,
      alerts,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CHURN ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  async getChurnAnalytics(dto: GetAnalyticsDto): Promise<ChurnAnalytics> {
    const { startDate, endDate } = this.getDateRange({
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    const churnResults = await Promise.allSettled([
      this.prisma.saveAttempt.findMany({
        where: { companyId: dto.companyId, createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.customerIntent.findMany({
        where: { companyId: dto.companyId, calculatedAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.subscription.findMany({
        where: { companyId: dto.companyId, updatedAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    const [saveAttempts, intents, subscriptions]: any[] = this.extractSettledValues(
      churnResults,
      [[], [], []],
      'getChurnAnalytics',
    );

    // Calculate churned customers
    const churned = saveAttempts.filter(a =>
      a.outcome === 'CANCELLED' || a.outcome === 'PAUSED' || a.outcome === 'DOWNGRADED'
    );
    const voluntaryChurn = churned.filter(a => a.reasonCategory !== 'payment_failed');
    const involuntaryChurn = churned.filter(a => a.reasonCategory === 'payment_failed');

    const totalCustomers = subscriptions.length || 1;
    const revenueChurned = churned.reduce((sum, a) => sum + (a.revenuePreserved || 0), 0);

    // Churn by reason
    const reasonCounts = new Map<string, { count: number; revenue: number }>();
    for (const attempt of churned) {
      const reason = attempt.reasonCategory || 'unknown';
      const current = reasonCounts.get(reason) || { count: 0, revenue: 0 };
      reasonCounts.set(reason, {
        count: current.count + 1,
        revenue: current.revenue + (attempt.revenuePreserved || 0),
      });
    }

    const churnByReason = Array.from(reasonCounts.entries()).map(([reason, data]) => ({
      reason,
      count: data.count,
      percentage: churned.length > 0 ? (data.count / churned.length) * 100 : 0,
      revenueImpact: data.revenue,
    }));

    // Churn by segment
    const segmentCounts = new Map<string, { count: number; rate: number }>();
    for (const intent of intents) {
      const segment = (intent as any).customerSegment || 'standard';
      const current = segmentCounts.get(segment) || { count: 0, rate: 0 };
      segmentCounts.set(segment, {
        count: current.count + 1,
        rate: intent.churnRisk === 'HIGH' || intent.churnRisk === 'CRITICAL' ? 1 : 0,
      });
    }

    const churnBySegment = Array.from(segmentCounts.entries()).map(([segment, data]) => ({
      segment,
      count: data.count,
      rate: data.count > 0 ? (data.rate / data.count) * 100 : 0,
      previousRate: 0, // Would calculate from previous period
      trend: 'stable' as const,
    }));

    // Cohort analysis (simplified)
    const cohortAnalysis = this.calculateCohortAnalysis(dto.companyId, saveAttempts);

    // Predictions
    const highRiskCustomers = intents.filter(i => i.churnRisk === 'HIGH' || i.churnRisk === 'CRITICAL');
    const predictions = {
      expectedChurnNext30Days: Math.round(highRiskCustomers.length * 0.3),
      highRiskCustomerCount: highRiskCustomers.length,
      estimatedRevenueAtRisk: highRiskCustomers.reduce((sum, i) => sum + ((i as any).estimatedLTV || 0), 0),
      churnProbabilityDistribution: [
        { range: '0-10%', customerCount: intents.filter(i => i.churnRisk === 'LOW').length },
        { range: '10-30%', customerCount: intents.filter(i => i.churnRisk === 'MEDIUM').length },
        { range: '30-70%', customerCount: intents.filter(i => i.churnRisk === 'HIGH').length },
        { range: '70-100%', customerCount: intents.filter(i => i.churnRisk === 'CRITICAL').length },
      ],
    };

    // Time series
    const dailyChurn = await this.getTimeSeries(dto.companyId, 'churn', startDate, endDate, 'day');
    const weeklyChurn = await this.getTimeSeries(dto.companyId, 'churn', startDate, endDate, 'week');
    const monthlyChurn = await this.getTimeSeries(dto.companyId, 'churn', startDate, endDate, 'month');

    return {
      companyId: dto.companyId,
      period: { startDate, endDate },
      overview: {
        totalChurned: this.createMetricValue(churned.length, 0),
        churnRate: this.createMetricValue((churned.length / totalCustomers) * 100, 0),
        voluntaryChurnRate: this.createMetricValue((voluntaryChurn.length / totalCustomers) * 100, 0),
        involuntaryChurnRate: this.createMetricValue((involuntaryChurn.length / totalCustomers) * 100, 0),
        revenueChurned: this.createMetricValue(revenueChurned, 0),
        // Calculate average days from subscription start to cancellation
        averageTimeToChurn: this.createMetricValue(
          await this.calculateAverageTimeToChurn(dto.companyId, startDate, endDate),
          0,
        )
      },
      churnByReason,
      churnBySegment,
      cohortAnalysis,
      predictions,
      dailyChurn,
      weeklyChurn,
      monthlyChurn,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SAVE FLOW ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  async getSaveFlowAnalytics(dto: GetAnalyticsDto): Promise<SaveFlowAnalytics> {
    const { startDate, endDate } = this.getDateRange({
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    const saveAttempts = await this.prisma.saveAttempt.findMany({
      where: { companyId: dto.companyId, createdAt: { gte: startDate, lte: endDate } },
      include: {
        customer: true, // Customer metadata may contain segment info
      },
    });

    const successfulSaves = saveAttempts.filter(a => a.outcome?.startsWith('SAVED'));
    const totalRevenue = successfulSaves.reduce((sum, a) => sum + (a.revenuePreserved || 0), 0);

    // Stage performance
    const stageNames = [
      'pattern_interrupt',
      'diagnosis_survey',
      'branching_interventions',
      'nuclear_offer',
      'loss_visualization',
      'exit_survey',
      'winback',
    ];

    const stagePerformance = stageNames.map((stageName, index) => {
      const stageNum = index + 1;
      const attemptsAtStage = saveAttempts.filter(a => {
        const history = (a.stageHistory as any[]) || [];
        return history.some(h => h.stage === stageNum) || a.currentStage >= stageNum;
      });
      const entered = attemptsAtStage.length;

      const savedAtStage = saveAttempts.filter(a => a.outcome === `SAVED_STAGE_${stageNum}`).length;
      const continued = saveAttempts.filter(a => a.currentStage > stageNum).length;
      const dropped = entered - savedAtStage - continued;

      // Calculate average duration from stage history timestamps
      let totalDuration = 0;
      let durationCount = 0;
      for (const attempt of attemptsAtStage) {
        const history = (attempt.stageHistory as any[]) || [];
        const stageEntry = history.find(h => h.stage === stageNum);
        if (stageEntry?.enteredAt) {
          // Find when they exited this stage (next stage entry or completion)
          const nextStageEntry = history.find(h => h.stage === stageNum + 1);
          const exitTime = nextStageEntry?.enteredAt || attempt.completedAt || attempt.updatedAt;
          if (exitTime) {
            const duration = (new Date(exitTime).getTime() - new Date(stageEntry.enteredAt).getTime()) / 1000; // seconds
            if (duration > 0 && duration < 3600) { // reasonable range: 0-1 hour
              totalDuration += duration;
              durationCount++;
            }
          }
        }
      }
      const averageDuration = durationCount > 0 ? totalDuration / durationCount : 0;

      return {
        stageName,
        stageOrder: stageNum,
        entriesCount: entered,
        completionRate: entered > 0 ? ((savedAtStage + continued) / entered) * 100 : 0,
        averageDuration, // seconds - calculated from stage history timestamps
        dropoffRate: entered > 0 ? (dropped / entered) * 100 : 0,
        saveRate: entered > 0 ? (savedAtStage / entered) * 100 : 0,
      };
    });

    // Offer performance (from savedBy field)
    const offerStats = new Map<string, { presented: number; accepted: number; revenue: number; totalDiscount: number; discountCount: number }>();
    for (const attempt of saveAttempts) {
      const offer = attempt.savedBy || 'none';
      const current = offerStats.get(offer) || { presented: 0, accepted: 0, revenue: 0, totalDiscount: 0, discountCount: 0 };
      current.presented++;
      if (attempt.outcome?.startsWith('SAVED')) {
        current.accepted++;
        current.revenue += attempt.revenuePreserved || 0;
        // Get discount percentage from offer metadata or intervention applied
        const discount = (attempt as any).discountApplied || (attempt as any).offerDiscount || 0;
        if (discount > 0) {
          current.totalDiscount += discount;
          current.discountCount++;
        }
      }
      offerStats.set(offer, current);
    }

    const offerPerformance = Array.from(offerStats.entries())
      .filter(([offer]) => offer !== 'none')
      .map(([offerId, data]) => ({
        offerId,
        offerName: offerId, // Would join with offers table
        offerType: 'discount',
        timesPresented: data.presented,
        timesAccepted: data.accepted,
        acceptanceRate: data.presented > 0 ? (data.accepted / data.presented) * 100 : 0,
        revenueImpact: data.revenue,
        // Calculate average discount from actual offer data
        averageDiscount: data.discountCount > 0 ? data.totalDiscount / data.discountCount : 0,
      }));

    // Saves by reason
    const reasonStats = new Map<string, { attempts: number; saves: number; topOffer: string }>();
    for (const attempt of saveAttempts) {
      const reason = attempt.reasonCategory || 'unknown';
      const current = reasonStats.get(reason) || { attempts: 0, saves: 0, topOffer: '' };
      current.attempts++;
      if (attempt.outcome?.startsWith('SAVED')) {
        current.saves++;
        if (attempt.savedBy) current.topOffer = attempt.savedBy;
      }
      reasonStats.set(reason, current);
    }

    const savesByReason = Array.from(reasonStats.entries()).map(([reason, data]) => ({
      cancellationReason: reason,
      totalAttempts: data.attempts,
      successfulSaves: data.saves,
      saveRate: data.attempts > 0 ? (data.saves / data.attempts) * 100 : 0,
      topSuccessfulOffer: data.topOffer,
    }));

    // Saves by segment - computed from customer metadata
    const segmentStats = new Map<string, { attempts: number; saves: number; totalValue: number }>();
    for (const attempt of saveAttempts) {
      // Get segment from customer metadata or default to 'unknown'
      const metadata = (attempt as any).customer?.metadata as Record<string, any> || {};
      const segment = (metadata.segment || 'unknown').toLowerCase();
      const current = segmentStats.get(segment) || { attempts: 0, saves: 0, totalValue: 0 };
      current.attempts++;
      if (attempt.outcome?.startsWith('SAVED')) {
        current.saves++;
        current.totalValue += attempt.revenuePreserved || 0;
      }
      segmentStats.set(segment, current);
    }

    const savesBySegment = Array.from(segmentStats.entries()).map(([segment, data]) => ({
      segment,
      attempts: data.attempts,
      saves: data.saves,
      saveRate: data.attempts > 0 ? (data.saves / data.attempts) * 100 : 0,
      averageValue: data.saves > 0 ? data.totalValue / data.saves : 0,
    }));

    // Funnel metrics
    const started = saveAttempts.length;
    const reasonCaptured = saveAttempts.filter(a => a.reasonCategory).length;
    const offersPresented = saveAttempts.filter(a => a.currentStage >= 3).length;
    const offerAccepted = successfulSaves.length;

    const funnel = {
      started,
      reasonCaptured,
      offersPresented,
      offerAccepted,
      saved: successfulSaves.length,
      conversionRate: started > 0 ? (successfulSaves.length / started) * 100 : 0,
    };

    // Time series
    const dailySaves = await this.getTimeSeries(dto.companyId, 'saves', startDate, endDate, 'day');
    const weeklySaves = await this.getTimeSeries(dto.companyId, 'saves', startDate, endDate, 'week');

    // Calculate average time to save from actual data (in minutes)
    const savesWithCompletion = successfulSaves.filter(s => s.completedAt && s.createdAt);
    const avgTimeToSave = savesWithCompletion.length > 0
      ? savesWithCompletion.reduce((sum, s) => {
          const created = new Date(s.createdAt).getTime();
          const completed = new Date(s.completedAt!).getTime();
          return sum + (completed - created) / (1000 * 60); // minutes
        }, 0) / savesWithCompletion.length
      : 0;

    return {
      companyId: dto.companyId,
      period: { startDate, endDate },
      overview: {
        totalSaveAttempts: this.createMetricValue(saveAttempts.length, 0),
        successfulSaves: this.createMetricValue(successfulSaves.length, 0),
        overallSaveRate: this.createMetricValue(
          saveAttempts.length > 0 ? (successfulSaves.length / saveAttempts.length) * 100 : 0,
          0,
        ),
        revenueSaved: this.createMetricValue(totalRevenue, 0),
        averageSaveValue: this.createMetricValue(
          successfulSaves.length > 0 ? totalRevenue / successfulSaves.length : 0,
          0,
        ),
        averageTimeToSave: this.createMetricValue(avgTimeToSave, 0),
      },
      stagePerformance,
      offerPerformance,
      savesByReason,
      savesBySegment,
      funnel,
      dailySaves,
      weeklySaves,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CUSTOMER SERVICE ANALYTICS (Voice AI)
  // ═══════════════════════════════════════════════════════════════

  async getCustomerServiceAnalytics(dto: GetAnalyticsDto): Promise<CustomerServiceAnalytics> {
    const { startDate, endDate } = this.getDateRange({
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    const voiceCalls = await this.prisma.voiceCall.findMany({
      where: { companyId: dto.companyId, createdAt: { gte: startDate, lte: endDate } },
    });

    const totalDuration = voiceCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const avgDuration = voiceCalls.length > 0 ? totalDuration / voiceCalls.length : 0;

    const escalatedCalls = voiceCalls.filter(c => c.escalatedToHuman);
    const resolvedCalls = voiceCalls.filter(c =>
      c.outcome === 'SAVED' || c.outcome === 'OFFER_ACCEPTED'
    );

    // Calculate call metrics from actual data
    const callsWithWaitTime = voiceCalls.filter(c => (c as any).waitTimeSeconds != null);
    const avgWaitTime = callsWithWaitTime.length > 0
      ? callsWithWaitTime.reduce((sum, c) => sum + ((c as any).waitTimeSeconds || 0), 0) / callsWithWaitTime.length
      : 0;

    // Abandoned calls: started but no outcome or disconnected (customer hung up)
    const abandonedCalls = voiceCalls.filter(c => !c.outcome || c.outcome === 'DISCONNECTED');
    const callbackCalls = voiceCalls.filter(c => (c as any).isCallback === true);

    // Call metrics
    const callMetrics = {
      totalCalls: this.createMetricValue(voiceCalls.length, 0),
      averageCallDuration: this.createMetricValue(avgDuration, 0),
      averageWaitTime: this.createMetricValue(avgWaitTime, 0), // seconds
      firstCallResolutionRate: this.createMetricValue(
        voiceCalls.length > 0 ? (resolvedCalls.length / voiceCalls.length) * 100 : 0,
        0,
      ),
      callAbandonmentRate: this.createMetricValue(
        voiceCalls.length > 0 ? (abandonedCalls.length / voiceCalls.length) * 100 : 0,
        0,
      ),
      callbackRate: this.createMetricValue(
        voiceCalls.length > 0 ? (callbackCalls.length / voiceCalls.length) * 100 : 0,
        0,
      ),
    };

    // Voice AI metrics
    const aiHandled = voiceCalls.filter(c => !c.escalatedToHuman);
    const voiceAIMetrics = {
      aiHandledCalls: this.createMetricValue(aiHandled.length, 0),
      aiResolutionRate: this.createMetricValue(
        aiHandled.length > 0
          ? (aiHandled.filter(c => c.outcome === 'SAVED' || c.outcome === 'OFFER_ACCEPTED').length / aiHandled.length) * 100
          : 0,
        0,
      ),
      aiToHumanEscalationRate: this.createMetricValue(
        voiceCalls.length > 0 ? (escalatedCalls.length / voiceCalls.length) * 100 : 0,
        0,
      ),
      // Calculate average AI confidence from call data
      averageAIConfidence: this.createMetricValue(
        aiHandled.length > 0
          ? aiHandled.reduce((sum, c) => sum + ((c as any).aiConfidence || 0), 0) / aiHandled.length
          : 0,
        0,
      ),
      // Calculate customer satisfaction from actual ratings (0-5 scale)
      customerSatisfactionScore: this.createMetricValue(
        voiceCalls.filter(c => (c as any).satisfactionRating != null).length > 0
          ? voiceCalls
              .filter(c => (c as any).satisfactionRating != null)
              .reduce((sum, c) => sum + ((c as any).satisfactionRating || 0), 0) /
            voiceCalls.filter(c => (c as any).satisfactionRating != null).length
          : 0,
        0,
      )
    };

    // Intent distribution
    const intentCounts = new Map<string, { count: number; resolved: number; time: number }>();
    for (const call of voiceCalls) {
      const intent = (call as any).detectedIntent || 'unknown';
      const current = intentCounts.get(intent) || { count: 0, resolved: 0, time: 0 };
      current.count++;
      if (call.outcome === 'SAVED' || call.outcome === 'OFFER_ACCEPTED') current.resolved++;
      current.time += call.duration || 0;
      intentCounts.set(intent, current);
    }

    const intentDistribution = Array.from(intentCounts.entries()).map(([intent, data]) => ({
      intent,
      count: data.count,
      percentage: voiceCalls.length > 0 ? (data.count / voiceCalls.length) * 100 : 0,
      resolutionRate: data.count > 0 ? (data.resolved / data.count) * 100 : 0,
      averageHandleTime: data.count > 0 ? data.time / data.count : 0,
    }));

    // Sentiment analysis
    const sentiments = {
      positive: voiceCalls.filter(c => c.overallSentiment === 'POSITIVE').length,
      neutral: voiceCalls.filter(c => c.overallSentiment === 'NEUTRAL').length,
      negative: voiceCalls.filter(c => c.overallSentiment === 'NEGATIVE').length,
    };

    // Calculate average sentiment score from actual call data
    const callsWithSentiment = voiceCalls.filter(c => (c as any).sentimentScore != null);
    const avgSentimentScore = callsWithSentiment.length > 0
      ? callsWithSentiment.reduce((sum, c) => sum + ((c as any).sentimentScore || 0), 0) / callsWithSentiment.length
      : 0;

    const sentimentAnalysis = {
      positive: sentiments.positive,
      neutral: sentiments.neutral,
      negative: sentiments.negative,
      averageSentimentScore: avgSentimentScore,
      sentimentTrend: await this.getTimeSeries(dto.companyId, 'sentiment', startDate, endDate, 'day'),
    };

    // Escalation reasons - computed from actual call data
    const escalationStats = new Map<string, { count: number; totalHandleTime: number }>();
    for (const call of voiceCalls) {
      if ((call as any).escalatedReason) {
        const reason = (call as any).escalatedReason;
        const current = escalationStats.get(reason) || { count: 0, totalHandleTime: 0 };
        current.count++;
        if ((call as any).handleTimeAfterEscalation) {
          current.totalHandleTime += (call as any).handleTimeAfterEscalation;
        }
        escalationStats.set(reason, current);
      }
    }
    const totalEscalations = Array.from(escalationStats.values()).reduce((sum, s) => sum + s.count, 0);
    const escalationReasons = Array.from(escalationStats.entries()).map(([reason, data]) => ({
      reason,
      count: data.count,
      percentage: totalEscalations > 0 ? (data.count / totalEscalations) * 100 : 0,
      averageHandleTimeAfterEscalation: data.count > 0 ? data.totalHandleTime / data.count : 0,
    }));

    // Peak hours analysis - calculate wait time from actual call data
    const peakHoursAnalysis = Array.from({ length: 24 }, (_, hour) => {
      const hourCalls = voiceCalls.filter(c => new Date(c.createdAt).getHours() === hour);

      // Calculate average wait time from calls that have wait time data
      const callsWithWaitTime = hourCalls.filter(c => (c as any).waitTimeSeconds != null);
      const avgWaitTime = callsWithWaitTime.length > 0
        ? callsWithWaitTime.reduce((sum, c) => sum + ((c as any).waitTimeSeconds || 0), 0) / callsWithWaitTime.length
        : 0;

      return {
        hour,
        callVolume: hourCalls.length,
        averageWaitTime: avgWaitTime,
        resolutionRate: hourCalls.length > 0
          ? (hourCalls.filter(c => c.outcome === 'SAVED' || c.outcome === 'OFFER_ACCEPTED').length / hourCalls.length) * 100
          : 0,
      };
    });

    // Time series
    const dailyCalls = await this.getTimeSeries(dto.companyId, 'calls', startDate, endDate, 'day');
    const hourlyDistribution = peakHoursAnalysis.map(h => ({
      timestamp: new Date(),
      value: h.callVolume,
      label: `${h.hour}:00`,
    }));

    return {
      companyId: dto.companyId,
      period: { startDate, endDate },
      callMetrics,
      voiceAIMetrics,
      intentDistribution,
      sentimentAnalysis,
      escalationReasons,
      peakHoursAnalysis,
      dailyCalls,
      hourlyDistribution,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CONTENT ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  async getContentAnalytics(dto: GetAnalyticsDto): Promise<ContentAnalytics> {
    const { startDate, endDate } = this.getDateRange({
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    const contents = await this.prisma.generatedContent.findMany({
      where: { companyId: dto.companyId, createdAt: { gte: startDate, lte: endDate } },
    });

    // Calculate generation metrics from actual data
    const contentsWithGenTime = contents.filter(c => (c as any).generationTimeMs != null);
    const avgGenTime = contentsWithGenTime.length > 0
      ? contentsWithGenTime.reduce((sum, c) => sum + ((c as any).generationTimeMs || 0), 0) / contentsWithGenTime.length
      : 0;

    // Calculate approval rate from status field
    const approvedContents = contents.filter(c => (c as any).status === 'APPROVED' || (c as any).isApproved === true);

    // Generation metrics
    const generationMetrics = {
      totalContentGenerated: this.createMetricValue(contents.length, 0),
      // Calculate average generation time from actual data (ms)
      averageGenerationTime: this.createMetricValue(avgGenTime, 0),
      // Calculate approval rate from content status
      contentApprovalRate: this.createMetricValue(
        contents.length > 0 ? (approvedContents.length / contents.length) * 100 : 0,
        0,
      ),
      averageContentScore: this.createMetricValue(
        contents.length > 0
          ? contents.reduce((sum, c) => sum + ((c as any).qualityScore || 0), 0) / contents.length
          : 0,
        0,
      ),
    };

    // Content by type - with engagement from triggerApplications
    const typeCounts = new Map<string, { count: number; score: number; engagement: number; approved: number }>();
    for (const content of contents) {
      const type = content.type || 'unknown';
      const current = typeCounts.get(type) || { count: 0, score: 0, engagement: 0, approved: 0 };
      current.count++;
      current.score += (content as any).qualityScore || 0;
      // Calculate engagement from triggerApplications openRate
      const engagement = (content as any).triggerApplications?.openRate || 0;
      current.engagement += engagement;
      if ((content as any).status === 'APPROVED' || (content as any).isApproved === true) {
        current.approved++;
      }
      typeCounts.set(type, current);
    }

    const contentByType = Array.from(typeCounts.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      averageScore: data.count > 0 ? data.score / data.count : 0,
      // Calculate approval rate per content type
      approvalRate: data.count > 0 ? (data.approved / data.count) * 100 : 0,
      averageEngagement: data.count > 0 ? data.engagement / data.count : 0,
    }));

    // Template performance - single query, no N+1
    const templates = await this.prisma.contentTemplate.findMany({
      where: { companyId: dto.companyId },
      take: 20,
    });

    // Fetch all generated contents in a single query
    const templateIds = templates.map(t => t.id);
    const allGeneratedContents = await this.prisma.generatedContent.findMany({
      where: {
        templateId: { in: templateIds },
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Group by templateId in memory
    const contentsByTemplate = new Map<string, typeof allGeneratedContents>();
    for (const content of allGeneratedContents) {
      const existing = contentsByTemplate.get(content.templateId) || [];
      existing.push(content);
      contentsByTemplate.set(content.templateId, existing);
    }

    const templatePerformance = templates.map((template) => {
      const generatedContents = contentsByTemplate.get(template.id) || [];
      const usageCount = generatedContents.length;
      const avgScore = usageCount > 0
        ? generatedContents.reduce((sum, c) => sum + ((c as any).qualityScore || 0), 0) / usageCount
        : 0;

      // Calculate engagement from triggerApplications
      const engagements = generatedContents
        .map(c => (c as any).triggerApplications)
        .filter(Boolean);
      const avgEngagement = engagements.length > 0
        ? engagements.reduce((sum, e) => sum + (e.openRate || 0), 0) / engagements.length
        : 0;
      const avgConversion = engagements.length > 0
        ? engagements.reduce((sum, e) => sum + (e.conversionRate || 0), 0) / engagements.length
        : 0;

      return {
        templateId: template.id,
        templateName: template.name,
        usageCount,
        averageEngagement: avgEngagement,
        conversionRate: avgConversion,
        averageScore: avgScore,
      };
    });

    // Personalization metrics - calculated from generated content data
    const personalizedContent = allGeneratedContents.filter(c => (c as any).isPersonalized === true);
    const genericContent = allGeneratedContents.filter(c => (c as any).isPersonalized !== true);

    // Calculate engagement/conversion for personalized vs generic
    const calcMetrics = (contents: typeof allGeneratedContents) => {
      if (contents.length === 0) return { engagement: 0, conversion: 0 };
      const apps = contents.map(c => (c as any).triggerApplications).filter(Boolean);
      const engagement = apps.length > 0
        ? apps.reduce((sum, a) => sum + (a.openRate || 0), 0) / apps.length
        : 0;
      const conversion = apps.length > 0
        ? apps.reduce((sum, a) => sum + (a.conversionRate || 0), 0) / apps.length
        : 0;
      return { engagement, conversion };
    };

    // Track personalization variable usage
    const variableUsage = new Map<string, { count: number; totalEngagement: number }>();
    for (const content of allGeneratedContents) {
      const variables = (content as any).personalizationVariables || [];
      const engagement = (content as any).triggerApplications?.openRate || 0;
      for (const variable of variables) {
        const current = variableUsage.get(variable) || { count: 0, totalEngagement: 0 };
        current.count++;
        current.totalEngagement += engagement;
        variableUsage.set(variable, current);
      }
    }

    const topPersonalizationVariables = Array.from(variableUsage.entries())
      .map(([variable, data]) => ({
        variable,
        impactScore: data.count > 0 ? data.totalEngagement / data.count : 0,
        usageCount: data.count,
      }))
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, 5);

    const personalizationMetrics = {
      personalizedVsGeneric: {
        personalized: calcMetrics(personalizedContent),
        generic: calcMetrics(genericContent),
      },
      topPersonalizationVariables,
    };

    // A/B test results - fetch from database
    const abTests = await this.prisma.aBTest.findMany({
      where: {
        companyId: dto.companyId,
        OR: [
          { startedAt: { gte: startDate, lte: endDate } },
          { endedAt: { gte: startDate, lte: endDate } },
        ],
      },
      include: {
        variants: true,
      },
      take: 10,
    });

    const abTestResults = abTests.map(test => {
      // Map DB status to expected type
      let status: 'completed' | 'running' | 'stopped' = 'stopped';
      switch (test.status) {
        case 'RUNNING':
          status = 'running';
          break;
        case 'COMPLETED':
        case 'ARCHIVED':
          status = 'completed';
          break;
        default:
          status = 'stopped';
      }

      return {
        testId: test.id,
        testName: test.name,
        variants: test.variants.map(v => ({
          variantId: v.id,
          variantName: v.name,
          sampleSize: Number(v.visitors),
          conversionRate: v.conversionRate,
          confidenceLevel: test.confidenceLevel,
          isWinner: test.winnerId === v.id,
        })),
        status,
        startDate: test.startedAt || test.scheduledStart || new Date(),
        endDate: test.endedAt || test.scheduledEnd,
      };
    });

    return {
      companyId: dto.companyId,
      period: { startDate, endDate },
      generationMetrics,
      contentByType,
      templatePerformance,
      personalizationMetrics,
      abTestResults,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // DELIVERY ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  async getDeliveryAnalytics(dto: GetAnalyticsDto): Promise<DeliveryAnalytics> {
    const { startDate, endDate } = this.getDateRange({
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    const messages = await this.prisma.deliveryMessage.findMany({
      where: { companyId: dto.companyId, createdAt: { gte: startDate, lte: endDate } },
    });

    const delivered = messages.filter(m => m.status === 'DELIVERED');
    const opened = messages.filter(m => m.openedAt);
    const clicked = messages.filter(m => m.clickedAt);
    const converted = messages.filter(m => m.convertedAt);
    const bounced = messages.filter(m => m.status === 'BOUNCED');
    const complained = messages.filter(m => m.status === 'COMPLAINED');
    const unsubscribed = messages.filter(m => m.status === 'UNSUBSCRIBED');

    // Overview
    const overview = {
      totalMessagesSent: this.createMetricValue(messages.length, 0),
      totalDelivered: this.createMetricValue(delivered.length, 0),
      deliveryRate: this.createMetricValue(
        messages.length > 0 ? (delivered.length / messages.length) * 100 : 0,
        0,
      ),
      openRate: this.createMetricValue(
        delivered.length > 0 ? (opened.length / delivered.length) * 100 : 0,
        0,
      ),
      clickRate: this.createMetricValue(
        opened.length > 0 ? (clicked.length / opened.length) * 100 : 0,
        0,
      ),
      conversionRate: this.createMetricValue(
        clicked.length > 0 ? (converted.length / clicked.length) * 100 : 0,
        0,
      ),
      unsubscribeRate: this.createMetricValue(
        delivered.length > 0 ? (unsubscribed.length / delivered.length) * 100 : 0,
        0,
      ),
      bounceRate: this.createMetricValue(
        messages.length > 0 ? (bounced.length / messages.length) * 100 : 0,
        0,
      ),
      complaintRate: this.createMetricValue(
        delivered.length > 0 ? (complained.length / delivered.length) * 100 : 0,
        0,
      ),
    };

    // Channel performance
    const channels = ['EMAIL', 'SMS', 'PUSH', 'IN_APP'];
    const channelPerformance = channels.map(channel => {
      const channelMsgs = messages.filter(m => m.channel === channel);
      const channelDelivered = channelMsgs.filter(m => m.status === 'DELIVERED');
      const channelOpened = channelMsgs.filter(m => m.openedAt);
      const channelClicked = channelMsgs.filter(m => m.clickedAt);
      const channelConverted = channelMsgs.filter(m => m.convertedAt);

      return {
        channel,
        sent: channelMsgs.length,
        delivered: channelDelivered.length,
        deliveryRate: channelMsgs.length > 0 ? (channelDelivered.length / channelMsgs.length) * 100 : 0,
        opened: channelOpened.length,
        openRate: channelDelivered.length > 0 ? (channelOpened.length / channelDelivered.length) * 100 : 0,
        clicked: channelClicked.length,
        clickRate: channelOpened.length > 0 ? (channelClicked.length / channelOpened.length) * 100 : 0,
        converted: channelConverted.length,
        conversionRate: channelClicked.length > 0 ? (channelConverted.length / channelClicked.length) * 100 : 0,
        // Calculate cost from actual message cost data or use industry standard rates
        cost: channelMsgs.reduce((sum, m) => sum + ((m as any).cost || this.getDefaultChannelCost(channel)), 0),
        costPerConversion: channelConverted.length > 0
          ? channelMsgs.reduce((sum, m) => sum + ((m as any).cost || this.getDefaultChannelCost(channel)), 0) / channelConverted.length
          : 0,
      };
    });

    // Automation performance - single query, no N+1
    const automations = await this.prisma.automation.findMany({
      where: { companyId: dto.companyId },
      take: 10,
    });

    // Fetch all enrollments for the automations in a single query
    const automationIds = automations.map(a => a.id);
    const allEnrollments = await this.prisma.automationEnrollment.findMany({
      where: {
        automationId: { in: automationIds },
        enrolledAt: { gte: startDate, lte: endDate },
      },
    });

    // Group enrollments by automationId in memory
    const enrollmentsByAutomation = new Map<string, typeof allEnrollments>();
    for (const enrollment of allEnrollments) {
      const existing = enrollmentsByAutomation.get(enrollment.automationId) || [];
      existing.push(enrollment);
      enrollmentsByAutomation.set(enrollment.automationId, existing);
    }

    const automationPerformance = automations.map(automation => {
      const enrollments = enrollmentsByAutomation.get(automation.id) || [];
      const completed = enrollments.filter(e => e.status === 'COMPLETED');
      const converted = enrollments.filter(e => e.exitReason === 'CONVERTED');

      // Calculate average time to complete from actual data
      const completedWithTime = completed.filter(e => e.completedAt && e.enrolledAt);
      const avgTimeToComplete = completedWithTime.length > 0
        ? completedWithTime.reduce((sum, e) => {
            const enrolledTime = new Date(e.enrolledAt).getTime();
            const completedTime = new Date(e.completedAt!).getTime();
            return sum + (completedTime - enrolledTime) / (1000 * 60 * 60); // hours
          }, 0) / completedWithTime.length
        : 0;

      // Calculate revenue from actual conversion data
      const revenueGenerated = converted.reduce((sum, e) => sum + ((e as any).revenueGenerated || 0), 0);

      return {
        automationId: automation.id,
        automationName: automation.name,
        enrollments: enrollments.length,
        completionRate: enrollments.length > 0 ? (completed.length / enrollments.length) * 100 : 0,
        conversionRate: enrollments.length > 0 ? (converted.length / enrollments.length) * 100 : 0,
        averageTimeToComplete: avgTimeToComplete,
        revenueGenerated,
      };
    });

    // Send time analysis - calculate optimalScore based on actual engagement metrics
    const sendTimeAnalysis = Array.from({ length: 24 }, (_, hour) => {
      const hourMsgs = messages.filter(m => new Date(m.createdAt).getHours() === hour);
      const hourOpened = hourMsgs.filter(m => m.openedAt);
      const hourClicked = hourMsgs.filter(m => m.clickedAt);
      const hourConverted = hourMsgs.filter(m => m.convertedAt);

      const openRate = hourMsgs.length > 0 ? (hourOpened.length / hourMsgs.length) * 100 : 0;
      const clickRate = hourOpened.length > 0 ? (hourClicked.length / hourOpened.length) * 100 : 0;
      const conversionRate = hourClicked.length > 0 ? (hourConverted.length / hourClicked.length) * 100 : 0;

      // Calculate optimalScore based on weighted engagement metrics
      const optimalScore = (openRate * 0.3) + (clickRate * 0.3) + (conversionRate * 0.4);

      return {
        hour,
        dayOfWeek: 0, // Would expand to full week
        messagesSent: hourMsgs.length,
        openRate,
        clickRate,
        conversionRate,
        optimalScore,
      };
    });

    // Engagement heatmap - calculate from actual message engagement data
    const engagementHeatmap = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const dayHourMsgs = messages.filter(m => {
          const msgDate = new Date(m.createdAt);
          return msgDate.getDay() === day && msgDate.getHours() === hour;
        });
        const dayHourOpened = dayHourMsgs.filter(m => m.openedAt);
        const dayHourClicked = dayHourMsgs.filter(m => m.clickedAt);

        // Calculate engagement score based on open and click rates
        const openRate = dayHourMsgs.length > 0 ? dayHourOpened.length / dayHourMsgs.length : 0;
        const clickRate = dayHourOpened.length > 0 ? dayHourClicked.length / dayHourOpened.length : 0;
        const engagementScore = ((openRate + clickRate) / 2) * 100;

        engagementHeatmap.push({
          dayOfWeek: day,
          hour,
          engagementScore,
        });
      }
    }

    // Time series
    const dailyDelivery = await this.getTimeSeries(dto.companyId, 'delivery', startDate, endDate, 'day');
    const weeklyEngagement = await this.getTimeSeries(dto.companyId, 'engagement', startDate, endDate, 'week');

    return {
      companyId: dto.companyId,
      period: { startDate, endDate },
      overview,
      channelPerformance,
      automationPerformance,
      sendTimeAnalysis,
      engagementHeatmap,
      dailyDelivery,
      weeklyEngagement,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // UPSELL ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  async getUpsellAnalytics(dto: GetAnalyticsDto): Promise<UpsellAnalytics> {
    const { startDate, endDate } = this.getDateRange({
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    const offers = await this.prisma.upsellOffer.findMany({
      where: { companyId: dto.companyId, createdAt: { gte: startDate, lte: endDate } },
    });

    const presented = offers.filter(o => o.presented);
    const converted = offers.filter(o => o.accepted);
    const totalRevenue = converted.reduce((sum, o) => sum + (o.revenue || 0), 0);

    // Overview
    const overview = {
      totalOpportunities: this.createMetricValue(offers.length, 0),
      opportunitiesPresented: this.createMetricValue(presented.length, 0),
      conversions: this.createMetricValue(converted.length, 0),
      conversionRate: this.createMetricValue(
        presented.length > 0 ? (converted.length / presented.length) * 100 : 0,
        0,
      ),
      revenueGenerated: this.createMetricValue(totalRevenue, 0),
      averageOrderValue: this.createMetricValue(
        converted.length > 0 ? totalRevenue / converted.length : 0,
        0,
      ),
      // Calculate average uplift from actual order value increase data
      averageUplift: this.createMetricValue(
        converted.length > 0
          ? converted.reduce((sum, o) => sum + ((o as any).upliftPercentage || 0), 0) / converted.length
          : 0,
        0,
      ),
    };

    // Opportunity performance by type
    const typeCounts = new Map<string, { opportunities: number; presented: number; converted: number; revenue: number }>();
    for (const offer of offers) {
      const type = offer.type || 'unknown';
      const current = typeCounts.get(type) || { opportunities: 0, presented: 0, converted: 0, revenue: 0 };
      current.opportunities++;
      if (offer.presented) current.presented++;
      if (offer.accepted) {
        current.converted++;
        current.revenue += offer.revenue || 0;
      }
      typeCounts.set(type, current);
    }

    const opportunityPerformance = Array.from(typeCounts.entries()).map(([type, data]) => ({
      type,
      opportunities: data.opportunities,
      presented: data.presented,
      converted: data.converted,
      conversionRate: data.presented > 0 ? (data.converted / data.presented) * 100 : 0,
      revenue: data.revenue,
      averageValue: data.converted > 0 ? data.revenue / data.converted : 0,
    }));

    // Product performance - track discounts
    const productCounts = new Map<string, { recommended: number; purchased: number; revenue: number; totalDiscount: number; discountCount: number }>();
    for (const offer of offers) {
      const productId = offer.productId || 'unknown';
      const current = productCounts.get(productId) || { recommended: 0, purchased: 0, revenue: 0, totalDiscount: 0, discountCount: 0 };
      current.recommended++;
      if (offer.accepted) {
        current.purchased++;
        current.revenue += offer.revenue || 0;
        // Track discount percentage from offer
        const discount = (offer as any).discountPercentage || 0;
        if (discount > 0) {
          current.totalDiscount += discount;
          current.discountCount++;
        }
      }
      productCounts.set(productId, current);
    }

    const productPerformance = Array.from(productCounts.entries()).map(([productId, data]) => ({
      productId,
      productName: productId, // Would join with products table
      timesRecommended: data.recommended,
      timesPurchased: data.purchased,
      conversionRate: data.recommended > 0 ? (data.purchased / data.recommended) * 100 : 0,
      revenue: data.revenue,
      // Calculate average discount from actual offer data
      averageDiscount: data.discountCount > 0 ? data.totalDiscount / data.discountCount : 0,
    }));

    // Segment performance - calculated from actual customer segment data
    const segmentCounts = new Map<string, { opportunities: number; conversions: number; revenue: number }>();
    for (const offer of offers) {
      const segment = (offer as any).customerSegment || 'standard';
      const current = segmentCounts.get(segment) || { opportunities: 0, conversions: 0, revenue: 0 };
      current.opportunities++;
      if (offer.accepted) {
        current.conversions++;
        current.revenue += offer.revenue || 0;
      }
      segmentCounts.set(segment, current);
    }

    const segmentPerformance = Array.from(segmentCounts.entries()).map(([segment, data]) => ({
      segment,
      opportunities: data.opportunities,
      conversions: data.conversions,
      conversionRate: data.opportunities > 0 ? (data.conversions / data.opportunities) * 100 : 0,
      averageOrderValue: data.conversions > 0 ? data.revenue / data.conversions : 0,
      totalRevenue: data.revenue,
    }));

    // Trigger performance - calculated from actual trigger data
    const triggerCounts = new Map<string, { triggered: number; conversions: number; totalTimeToConvert: number }>();
    for (const offer of offers) {
      const trigger = (offer as any).triggerType || 'post_purchase';
      const current = triggerCounts.get(trigger) || { triggered: 0, conversions: 0, totalTimeToConvert: 0 };
      current.triggered++;
      if (offer.accepted) {
        current.conversions++;
        // Calculate time to convert from presentedAt to acceptedAt
        if ((offer as any).presentedAt && (offer as any).acceptedAt) {
          const presented = new Date((offer as any).presentedAt).getTime();
          const accepted = new Date((offer as any).acceptedAt).getTime();
          current.totalTimeToConvert += (accepted - presented) / (1000 * 60 * 60); // hours
        }
      }
      triggerCounts.set(trigger, current);
    }

    const triggerPerformance = Array.from(triggerCounts.entries()).map(([trigger, data]) => ({
      trigger,
      timesTriggered: data.triggered,
      conversions: data.conversions,
      conversionRate: data.triggered > 0 ? (data.conversions / data.triggered) * 100 : 0,
      averageTimeToConvert: data.conversions > 0 ? data.totalTimeToConvert / data.conversions : 0,
    }));

    // Time series
    const dailyUpsells = await this.getTimeSeries(dto.companyId, 'upsells', startDate, endDate, 'day');
    const weeklyRevenue = await this.getTimeSeries(dto.companyId, 'upsell_revenue', startDate, endDate, 'week');

    return {
      companyId: dto.companyId,
      period: { startDate, endDate },
      overview,
      opportunityPerformance,
      productPerformance,
      segmentPerformance,
      triggerPerformance,
      dailyUpsells,
      weeklyRevenue,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // REVENUE ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  async getRevenueAnalytics(dto: GetAnalyticsDto): Promise<RevenueAnalytics> {
    const { startDate, endDate } = this.getDateRange({
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    const revenueResults = await Promise.allSettled([
      this.prisma.saveAttempt.findMany({
        where: { companyId: dto.companyId, createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.upsellOffer.findMany({
        where: { companyId: dto.companyId, createdAt: { gte: startDate, lte: endDate }, accepted: true },
      }),
      this.prisma.subscription.findMany({
        where: { companyId: dto.companyId },
      }),
    ]);

    const [saveAttempts, upsellOffers, subscriptions]: any[] = this.extractSettledValues(
      revenueResults,
      [[], [], []],
      'getRevenueAnalytics',
    );

    const saveRevenue = saveAttempts
      .filter(a => a.outcome?.startsWith('SAVED'))
      .reduce((sum, a) => sum + (a.revenuePreserved || 0), 0);
    const upsellRevenue = upsellOffers.reduce((sum, o) => sum + (o.revenue || 0), 0);
    const totalRevenue = saveRevenue + upsellRevenue;

    // Calculate recurring revenue from active subscriptions MRR
    const activeSubscriptions = subscriptions.filter(s => s.status === 'ACTIVE');
    const recurringRevenue = activeSubscriptions.reduce((sum, s) => {
      // Get MRR from subscription amount (monthly or converted from annual)
      const amount = (s as any).amount || 0;
      const interval = (s as any).billingInterval || 'MONTHLY';
      return sum + (interval === 'ANNUAL' ? amount / 12 : amount);
    }, 0);

    // Calculate churned revenue from cancelled subscriptions
    const churnedRevenue = saveAttempts
      .filter(a => a.outcome === 'CANCELLED')
      .reduce((sum, a) => sum + (a.revenuePreserved || 0), 0);

    // Calculate Net Revenue Retention (NRR) = (Start MRR + Expansion - Contraction - Churn) / Start MRR * 100
    // Expansion = upsell revenue, Contraction = downgrades, Churn = cancelled revenue
    const startMRR = recurringRevenue || 1; // avoid division by zero
    const expansion = upsellRevenue;
    const contraction = saveAttempts
      .filter(a => a.outcome === 'DOWNGRADED')
      .reduce((sum, a) => sum + (a.revenuePreserved || 0), 0);
    const nrr = ((startMRR + expansion - contraction - churnedRevenue) / startMRR) * 100;

    // Gross Revenue Retention = (Start MRR - Contraction - Churn) / Start MRR * 100
    const grr = ((startMRR - contraction - churnedRevenue) / startMRR) * 100;

    // Revenue overview
    const overview = {
      totalRevenue: this.createMetricValue(totalRevenue, 0),
      // Monthly Recurring Revenue from active subscriptions
      recurringRevenue: this.createMetricValue(recurringRevenue, 0),
      newRevenue: this.createMetricValue(upsellRevenue, 0),
      // Expansion revenue from upsells
      expansionRevenue: this.createMetricValue(expansion, 0),
      churnedRevenue: this.createMetricValue(churnedRevenue, 0),
      // Net Revenue Retention calculated from actual data
      netRevenueRetention: this.createMetricValue(Math.max(0, Math.min(200, nrr)), 0),
      // Gross Revenue Retention calculated from actual data
      grossRevenueRetention: this.createMetricValue(Math.max(0, Math.min(100, grr)), 0),
      averageRevenuePerUser: this.createMetricValue(
        subscriptions.length > 0 ? totalRevenue / subscriptions.length : 0,
        0,
      ),
    };

    // Revenue breakdown
    const revenueBreakdown = {
      byProduct: [
        { productId: 'prod_1', productName: 'Premium Plan', revenue: totalRevenue * 0.5, percentage: 50, growth: 12 },
        { productId: 'prod_2', productName: 'Standard Plan', revenue: totalRevenue * 0.35, percentage: 35, growth: 8 },
        { productId: 'prod_3', productName: 'Basic Plan', revenue: totalRevenue * 0.15, percentage: 15, growth: 5 },
      ],
      bySegment: [
        { segment: 'enterprise', revenue: totalRevenue * 0.4, percentage: 40, customerCount: 50, averageRevenuePerCustomer: totalRevenue * 0.4 / 50 },
        { segment: 'mid-market', revenue: totalRevenue * 0.35, percentage: 35, customerCount: 150, averageRevenuePerCustomer: totalRevenue * 0.35 / 150 },
        { segment: 'smb', revenue: totalRevenue * 0.25, percentage: 25, customerCount: 500, averageRevenuePerCustomer: totalRevenue * 0.25 / 500 },
      ],
      byChannel: [
        { channel: 'direct', revenue: totalRevenue * 0.6, percentage: 60, acquisitionCost: 1000, roi: 500 },
        { channel: 'partner', revenue: totalRevenue * 0.25, percentage: 25, acquisitionCost: 500, roi: 400 },
        { channel: 'organic', revenue: totalRevenue * 0.15, percentage: 15, acquisitionCost: 100, roi: 1200 },
      ],
    };

    // Momentum Intelligence impact - calculated from actual data
    // Revenue from retention = saves that continued to pay over time (saved subscriptions still active)
    const retainedCustomerIds = saveAttempts
      .filter(a => a.outcome?.startsWith('SAVED') && a.customerId)
      .map(a => a.customerId);
    const stillActiveRetained = subscriptions.filter(
      s => s.status === 'ACTIVE' && retainedCustomerIds.includes(s.customerId)
    );
    const revenueFromRetention = stillActiveRetained.reduce((sum, s) => {
      const amount = (s as any).amount || 0;
      const interval = (s as any).billingInterval || 'MONTHLY';
      return sum + (interval === 'ANNUAL' ? amount / 12 : amount);
    }, 0);

    // Calculate ROI multiplier: total momentum revenue / estimated platform cost
    // Use simple cost estimation based on activity volume
    const totalMomentumRevenue = saveRevenue + upsellRevenue;
    const estimatedMonthlyCost = 500 + (saveAttempts.length * 0.5) + (upsellOffers.length * 0.25); // Base + per-action costs
    const roiMultiplier = estimatedMonthlyCost > 0 ? totalMomentumRevenue / estimatedMonthlyCost : 0;

    const momentumImpact = {
      revenueSavedFromChurn: saveRevenue,
      revenueFromUpsells: upsellRevenue,
      // Revenue from customers who were saved and remain active
      revenueFromRetention,
      totalMomentumRevenue,
      // ROI multiplier based on revenue vs estimated platform cost
      roiMultiplier: Math.round(roiMultiplier * 10) / 10,
    };

    // Time series
    const dailyRevenue = await this.getTimeSeries(dto.companyId, 'revenue', startDate, endDate, 'day');
    const monthlyRevenue = await this.getTimeSeries(dto.companyId, 'revenue', startDate, endDate, 'month');
    const mrrTrend = await this.getTimeSeries(dto.companyId, 'mrr', startDate, endDate, 'month');

    return {
      companyId: dto.companyId,
      period: { startDate, endDate },
      overview,
      revenueBreakdown,
      momentumImpact,
      dailyRevenue,
      monthlyRevenue,
      mrrTrend,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // REAL-TIME METRICS
  // ═══════════════════════════════════════════════════════════════

  async getRealTimeMetrics(companyId: string): Promise<RealTimeMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate "recent" as within the last 15 minutes for active sessions
    const recentThreshold = new Date(Date.now() - 15 * 60 * 1000);

    const realTimeResults = await Promise.allSettled([
      this.prisma.saveAttempt.count({
        where: { companyId, completedAt: null },
      }),
      this.prisma.deliveryMessage.count({
        where: { companyId, status: 'SCHEDULED' },
      }),
      this.prisma.saveAttempt.findMany({
        where: { companyId, createdAt: { gte: today } },
      }),
      this.prisma.deliveryMessage.count({
        where: { companyId, createdAt: { gte: today } },
      }),
      this.prisma.upsellOffer.findMany({
        where: { companyId, createdAt: { gte: today }, accepted: true },
      }),
      // Count active voice calls (in progress, not ended)
      this.prisma.voiceCall.count({
        where: { companyId, endedAt: null },
      }),
      // Count users with recent activity (sessions, save attempts, or calls)
      this.prisma.saveAttempt.groupBy({
        by: ['customerId'],
        where: { companyId, createdAt: { gte: recentThreshold } },
      }).then(groups => groups.length),
      // Count today's new subscriptions
      this.prisma.subscription.count({
        where: { companyId, createdAt: { gte: today } },
      }),
    ]);

    const [
      activeSaveFlows,
      pendingMessages,
      todaySaves,
      todayMessages,
      todayUpsells,
      activeVoiceCalls,
      activeUsers,
      todayNewSubscriptions,
    ]: any[] = this.extractSettledValues(
      realTimeResults,
      [0, 0, [], 0, [], 0, 0, 0],
      'getRealTimeMetrics',
    );

    const todaySuccessfulSaves = todaySaves.filter(a => a.outcome?.startsWith('SAVED'));

    return {
      companyId,
      timestamp: new Date(),
      activeUsers,
      activeSaveFlows,
      activeVoiceCalls,
      pendingMessages,
      todayStats: {
        newSubscriptions: todayNewSubscriptions,
        cancellations: todaySaves.filter(a => a.outcome === 'CANCELLED').length,
        saveAttempts: todaySaves.length,
        successfulSaves: todaySuccessfulSaves.length,
        messagessSent: todayMessages,
        upsellConversions: todayUpsells.length,
        revenue: todaySuccessfulSaves.reduce((sum, a) => sum + (a.revenuePreserved || 0), 0) +
                 todayUpsells.reduce((sum, o) => sum + (o.revenue || 0), 0),
      },
      activeAlerts: [],
      recentEvents: [],
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // BENCHMARKING
  // ═══════════════════════════════════════════════════════════════

  async getCompanyBenchmarks(companyId: string): Promise<CompanyBenchmarks> {
    // Get company metrics
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const saveAttempts = await this.prisma.saveAttempt.findMany({
      where: { companyId, createdAt: { gte: last30Days } },
    });

    const successfulSaves = saveAttempts.filter(a => a.outcome?.startsWith('SAVED'));
    const saveRate = saveAttempts.length > 0 ? (successfulSaves.length / saveAttempts.length) * 100 : 0;

    // Industry benchmarks (placeholder data)
    const benchmarks: BenchmarkData[] = [
      {
        category: MetricCategory.SAVE_FLOW,
        metric: 'Save Rate',
        companyValue: saveRate,
        industryAverage: 28,
        industryMedian: 25,
        industryTop25: 42,
        percentileRank: saveRate > 42 ? 90 : saveRate > 28 ? 60 : 30,
        trend: saveRate > 28 ? 'above' : saveRate > 20 ? 'at' : 'below',
      },
      {
        category: MetricCategory.CHURN,
        metric: 'Churn Rate',
        companyValue: 5.2,
        industryAverage: 7.5,
        industryMedian: 6.8,
        industryTop25: 4.2,
        percentileRank: 75,
        trend: 'above',
      },
      {
        category: MetricCategory.DELIVERY,
        metric: 'Email Open Rate',
        companyValue: 32,
        industryAverage: 21.5,
        industryMedian: 20,
        industryTop25: 35,
        percentileRank: 85,
        trend: 'above',
      },
      {
        category: MetricCategory.UPSELL,
        metric: 'Upsell Conversion Rate',
        companyValue: 18,
        industryAverage: 12,
        industryMedian: 10,
        industryTop25: 22,
        percentileRank: 70,
        trend: 'above',
      },
    ];

    return {
      companyId,
      industry: 'SaaS', // Would be from company profile
      companySize: 'mid-market',
      generatedAt: new Date(),
      benchmarks,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // REPORT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async createReportConfig(dto: CreateReportConfigDto): Promise<ReportConfig> {
    const report = await this.prisma.analyticsReport.create({
      data: {
        companyId: dto.companyId,
        name: dto.name,
        description: dto.description,
        metrics: dto.metrics as any,
        filters: dto.filters as any,
        schedule: dto.schedule as any,
        delivery: dto.delivery as any,
        isActive: true,
      },
    });

    return {
      id: report.id,
      companyId: report.companyId,
      name: report.name,
      description: report.description || undefined,
      metrics: report.metrics as MetricCategory[],
      customMetrics: [],
      filters: report.filters as unknown as ReportConfig['filters'],
      schedule: report.schedule as unknown as ReportConfig['schedule'],
      delivery: report.delivery as unknown as ReportConfig['delivery'],
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      lastGeneratedAt: report.lastGeneratedAt || undefined,
      isActive: report.isActive,
    };
  }

  async getReportConfigs(companyId: string): Promise<ReportConfig[]> {
    const reports = await this.prisma.analyticsReport.findMany({
      where: { companyId },
    });

    return reports.map(report => ({
      id: report.id,
      companyId: report.companyId,
      name: report.name,
      description: report.description || undefined,
      metrics: report.metrics as MetricCategory[],
      customMetrics: [],
      filters: report.filters as unknown as ReportConfig['filters'],
      schedule: report.schedule as unknown as ReportConfig['schedule'],
      delivery: report.delivery as unknown as ReportConfig['delivery'],
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      lastGeneratedAt: report.lastGeneratedAt || undefined,
      isActive: report.isActive,
    }));
  }

  async generateReport(dto: GenerateReportDto): Promise<GeneratedReport> {
    const reportId = `rpt_${Date.now()}`;

    // Generate report data based on metrics
    const data: Record<string, unknown> = {};
    for (const metric of dto.metrics) {
      const analyticsDto: GetAnalyticsDto = {
        companyId: dto.companyId,
        category: metric,
        startDate: dto.startDate,
        endDate: dto.endDate,
      };

      switch (metric) {
        case MetricCategory.CHURN:
          data.churn = await this.getChurnAnalytics(analyticsDto);
          break;
        case MetricCategory.SAVE_FLOW:
          data.saveFlow = await this.getSaveFlowAnalytics(analyticsDto);
          break;
        case MetricCategory.CUSTOMER_SERVICE:
          data.customerService = await this.getCustomerServiceAnalytics(analyticsDto);
          break;
        case MetricCategory.CONTENT:
          data.content = await this.getContentAnalytics(analyticsDto);
          break;
        case MetricCategory.DELIVERY:
          data.delivery = await this.getDeliveryAnalytics(analyticsDto);
          break;
        case MetricCategory.UPSELL:
          data.upsell = await this.getUpsellAnalytics(analyticsDto);
          break;
        case MetricCategory.REVENUE:
          data.revenue = await this.getRevenueAnalytics(analyticsDto);
          break;
      }
    }

    // Update last generated timestamp if config exists
    if (dto.configId) {
      await this.prisma.analyticsReport.update({
        where: { id: dto.configId },
        data: { lastGeneratedAt: new Date() },
      });
    }

    return {
      id: reportId,
      configId: dto.configId || '',
      companyId: dto.companyId,
      name: `Report ${new Date().toISOString()}`,
      format: dto.format,
      period: { startDate: dto.startDate, endDate: dto.endDate },
      generatedAt: new Date(),
      status: 'completed',
      data: dto.includeRawData ? data : undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SCHEDULED TASKS
  // ═══════════════════════════════════════════════════════════════

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledReports(): Promise<void> {
    this.logger.log('Processing scheduled reports...');

    const now = new Date();
    const currentHour = now.getHours();

    // Find reports scheduled for this hour
    const reports = await this.prisma.analyticsReport.findMany({
      where: { isActive: true },
    });

    for (const report of reports) {
      const schedule = report.schedule as ReportConfig['schedule'];
      if (!schedule) continue;

      const scheduledHour = parseInt(schedule.time.split(':')[0], 10);
      if (scheduledHour !== currentHour) continue;

      // Check frequency
      let shouldGenerate = false;
      switch (schedule.frequency) {
        case ReportFrequency.DAILY:
          shouldGenerate = true;
          break;
        case ReportFrequency.WEEKLY:
          shouldGenerate = now.getDay() === (schedule.dayOfWeek || 1);
          break;
        case ReportFrequency.MONTHLY:
          shouldGenerate = now.getDate() === (schedule.dayOfMonth || 1);
          break;
      }

      if (shouldGenerate) {
        try {
          const filters = report.filters as unknown as ReportConfig['filters'];
          await this.generateReport({
            configId: report.id,
            companyId: report.companyId,
            metrics: report.metrics as MetricCategory[],
            startDate: filters.dateRange.startDate,
            endDate: filters.dateRange.endDate,
            format: (report.delivery as unknown as ReportConfig['delivery']).format,
          });
          this.logger.log(`Generated scheduled report: ${report.name}`);
        } catch (error) {
          this.logger.error(`Failed to generate report ${report.name}:`, error);
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateDailyAnalytics(): Promise<void> {
    this.logger.log('Updating daily analytics...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all companies
    const companies = await this.prisma.company.findMany({
      select: { id: true },
    });

    for (const company of companies) {
      try {
        await this.updatePeriodAnalytics(company.id, yesterday, today);
      } catch (error) {
        this.logger.error(`Failed to update analytics for company ${company.id}:`, error);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // LEGACY METHODS (kept for backward compatibility)
  // ═══════════════════════════════════════════════════════════════

  async getOverview(
    companyId: string,
    options: { dateRange?: string; startDate?: Date; endDate?: Date } = {},
  ): Promise<MomentumOverview> {
    const { startDate, endDate } = this.getDateRange(options);

    const saveAttempts = await this.prisma.saveAttempt.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const successfulSaves = saveAttempts.filter(
      (a) => a.outcome && !['CANCELLED', 'PAUSED', 'DOWNGRADED'].includes(a.outcome),
    );
    const revenuePreserved = successfulSaves.reduce(
      (sum, a) => sum + (a.revenuePreserved || 0),
      0,
    );

    const previousPeriodDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const previousStart = new Date(startDate.getTime() - previousPeriodDays * 24 * 60 * 60 * 1000);
    const previousAttempts = await this.prisma.saveAttempt.count({
      where: {
        companyId,
        createdAt: { gte: previousStart, lt: startDate },
        outcome: { notIn: ['CANCELLED', 'PAUSED', 'DOWNGRADED'] },
      },
    });
    const previousTotal = await this.prisma.saveAttempt.count({
      where: {
        companyId,
        createdAt: { gte: previousStart, lt: startDate },
      },
    });

    const currentRate = saveAttempts.length > 0
      ? successfulSaves.length / saveAttempts.length
      : 0;
    const previousRate = previousTotal > 0
      ? previousAttempts / previousTotal
      : 0;
    const trend = previousRate > 0
      ? ((currentRate - previousRate) / previousRate) * 100
      : 0;

    const intents = await this.prisma.customerIntent.findMany({
      where: {
        companyId,
        calculatedAt: { gte: startDate, lte: endDate },
      },
    });

    const riskDistribution = {
      low: intents.filter((i) => i.churnRisk === 'LOW').length,
      medium: intents.filter((i) => i.churnRisk === 'MEDIUM').length,
      high: intents.filter((i) => i.churnRisk === 'HIGH').length,
      critical: intents.filter((i) => i.churnRisk === 'CRITICAL').length,
    };

    const interventions = await this.prisma.intervention.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const channelPerformance = this.calculateChannelPerformance(interventions);
    const topPerformingStages = this.calculateStagePerformance(saveAttempts);

    return {
      companyId,
      period: { start: startDate, end: endDate },
      saveMetrics: {
        totalAttempts: saveAttempts.length,
        successfulSaves: successfulSaves.length,
        saveRate: currentRate,
        revenuePreserved,
        trend,
      },
      riskDistribution,
      channelPerformance,
      topPerformingStages,
    };
  }

  async getSavePerformance(
    companyId: string,
    options: { dateRange?: string; startDate?: Date; endDate?: Date; groupBy?: string } = {},
  ): Promise<SavePerformanceMetrics> {
    const { startDate, endDate } = this.getDateRange(options);

    const attempts = await this.prisma.saveAttempt.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const outcomes: Record<string, number> = {};
    for (const outcome of Object.values(SaveOutcome)) {
      outcomes[outcome] = attempts.filter((a) => a.outcome === outcome).length;
    }

    const stageNames = [
      'pattern_interrupt',
      'diagnosis_survey',
      'branching_interventions',
      'nuclear_offer',
      'loss_visualization',
      'exit_survey',
      'winback',
    ];

    const stagePerformance = stageNames.map((stageName, index) => {
      const stageNum = index + 1;
      const entered = attempts.filter((a) => {
        const history = (a.stageHistory as any[]) || [];
        return history.some((h) => h.stage === stageNum);
      }).length;

      const savedAtStage = attempts.filter(
        (a) => a.outcome === `SAVED_STAGE_${stageNum}`,
      ).length;

      const continued = entered - savedAtStage;

      return {
        stage: stageNum,
        stageName,
        entered,
        saved: savedAtStage,
        continued: Math.max(0, continued),
        saveRate: entered > 0 ? savedAtStage / entered : 0,
      };
    });

    const branchPerformance = this.calculateBranchPerformance(attempts);

    const savedAttempts = attempts.filter(
      (a) => a.completedAt && a.outcome?.startsWith('SAVED'),
    );
    const totalTimeMs = savedAttempts.reduce((sum, a) => {
      return sum + (new Date(a.completedAt!).getTime() - new Date(a.startedAt).getTime());
    }, 0);
    const avgTimeToSave = savedAttempts.length > 0
      ? totalTimeMs / savedAttempts.length / 1000
      : 0;

    const revenuePreserved = attempts.reduce(
      (sum, a) => sum + (a.revenuePreserved || 0),
      0,
    );

    return {
      totalAttempts: attempts.length,
      outcomes: outcomes as Record<SaveOutcome, number>,
      stagePerformance,
      branchPerformance,
      avgTimeToSave,
      revenuePreserved,
    };
  }

  async getVoicePerformance(
    companyId: string,
    options: { dateRange?: string; startDate?: Date; endDate?: Date; direction?: string } = {},
  ): Promise<VoicePerformanceMetrics> {
    const { startDate, endDate } = this.getDateRange(options);

    const where: any = {
      companyId,
      createdAt: { gte: startDate, lte: endDate },
    };

    if (options.direction) {
      where.direction = options.direction;
    }

    const calls = await this.prisma.voiceCall.findMany({ where });

    const inboundCalls = calls.filter((c) => c.direction === 'INBOUND');
    const outboundCalls = calls.filter((c) => c.direction === 'OUTBOUND');

    const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const avgDuration = calls.length > 0 ? totalDuration / calls.length : 0;

    const outcomes: Record<string, number> = {};
    for (const outcome of Object.values(CallOutcome)) {
      outcomes[outcome] = calls.filter((c) => c.outcome === outcome).length;
    }

    const sentimentDistribution: Record<string, number> = {};
    for (const sentiment of Object.values(Sentiment)) {
      sentimentDistribution[sentiment] = calls.filter(
        (c) => c.overallSentiment === sentiment,
      ).length;
    }

    const savedCalls = calls.filter(
      (c) => c.outcome === 'SAVED' || c.outcome === 'OFFER_ACCEPTED',
    );
    const saveRate = calls.length > 0 ? savedCalls.length / calls.length : 0;

    const escalatedCalls = calls.filter((c) => c.escalatedToHuman);
    const escalationRate = calls.length > 0 ? escalatedCalls.length / calls.length : 0;

    const scriptStats = new Map<string, { calls: number; saves: number }>();
    for (const call of calls) {
      if (!call.scriptId) continue;
      const stats = scriptStats.get(call.scriptId) || { calls: 0, saves: 0 };
      stats.calls++;
      if (call.outcome === 'SAVED' || call.outcome === 'OFFER_ACCEPTED') {
        stats.saves++;
      }
      scriptStats.set(call.scriptId, stats);
    }

    const topScripts = Array.from(scriptStats.entries())
      .map(([scriptId, stats]) => ({
        scriptId,
        scriptName: scriptId,
        calls: stats.calls,
        saveRate: stats.calls > 0 ? stats.saves / stats.calls : 0,
      }))
      .sort((a, b) => b.saveRate - a.saveRate)
      .slice(0, 5);

    return {
      totalCalls: calls.length,
      inboundCalls: inboundCalls.length,
      outboundCalls: outboundCalls.length,
      avgDuration,
      outcomes: outcomes as Record<CallOutcome, number>,
      sentimentDistribution: sentimentDistribution as Record<Sentiment, number>,
      saveRate,
      escalationRate,
      topScripts,
    };
  }

  async getContentPerformance(
    companyId: string,
    options: { dateRange?: string; startDate?: Date; endDate?: Date; type?: ContentType } = {},
  ): Promise<ContentPerformanceMetrics> {
    const { startDate, endDate } = this.getDateRange(options);

    const where: any = {
      companyId,
      createdAt: { gte: startDate, lte: endDate },
    };

    if (options.type) {
      where.type = options.type;
    }

    const contents = await this.prisma.generatedContent.findMany({ where });

    const byType: Record<string, number> = {};
    for (const type of Object.values(ContentType)) {
      byType[type] = contents.filter((c) => c.type === type).length;
    }

    const avgPerformance = Object.values(ContentType).map((type) => {
      const typeContent = contents.filter((c) => c.type === type);
      const metrics = typeContent.map((c) => (c as any).triggerApplications).filter(Boolean);

      return {
        type,
        openRate: this.averageMetric(metrics, 'openRate'),
        clickRate: this.averageMetric(metrics, 'clickRate'),
        conversionRate: this.averageMetric(metrics, 'conversionRate'),
      };
    });

    const topPerforming = contents
      .filter((c) => (c as any).qualityScore)
      .map((c) => ({
        contentId: c.id,
        name: c.purpose,
        type: c.type as ContentType,
        performance: (c as any).qualityScore || 0,
      }))
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 10);

    return {
      totalGenerated: contents.length,
      byType: byType as Record<ContentType, number>,
      avgPerformance,
      topPerforming,
    };
  }

  async getRevenueAttribution(
    companyId: string,
    options: { dateRange?: string; startDate?: Date; endDate?: Date } = {},
  ): Promise<RevenueAttribution> {
    const { startDate, endDate } = this.getDateRange(options);

    const saveAttempts = await this.prisma.saveAttempt.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate, lte: endDate },
        revenuePreserved: { gt: 0 },
      },
    });

    const upsellOffers = await this.prisma.upsellOffer.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate, lte: endDate },
        accepted: true,
      },
    });

    const saveRevenue = saveAttempts.reduce(
      (sum, a) => sum + (a.revenuePreserved || 0),
      0,
    );
    const upsellRevenue = upsellOffers.reduce(
      (sum, o) => sum + (o.revenue || 0),
      0,
    );
    const totalRevenue = saveRevenue + upsellRevenue;

    const bySource = [
      {
        source: 'Save Flow',
        revenue: saveRevenue,
        percentage: totalRevenue > 0 ? (saveRevenue / totalRevenue) * 100 : 0,
      },
      {
        source: 'Upsell',
        revenue: upsellRevenue,
        percentage: totalRevenue > 0 ? (upsellRevenue / totalRevenue) * 100 : 0,
      },
    ];

    const interventions = await this.prisma.intervention.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate, lte: endDate },
        revenueImpact: { gt: 0 },
      },
    });

    const channelRevenue = new Map<string, number>();
    for (const intervention of interventions) {
      const current = channelRevenue.get(intervention.channel) || 0;
      channelRevenue.set(intervention.channel, current + (intervention.revenueImpact || 0));
    }

    const byChannel = Array.from(channelRevenue.entries()).map(([channel, revenue]) => ({
      channel: channel as DeliveryChannel,
      revenue,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
    }));

    const estimatedCost = totalRevenue * 0.1;
    const roi = estimatedCost > 0 ? ((totalRevenue - estimatedCost) / estimatedCost) * 100 : 0;

    return {
      period: { start: startDate, end: endDate },
      totalRevenueSaved: totalRevenue,
      bySource,
      byChannel,
      roi,
    };
  }

  async updatePeriodAnalytics(
    companyId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    const saveAttempts = await this.prisma.saveAttempt.findMany({
      where: {
        companyId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    });

    const voiceCalls = await this.prisma.voiceCall.findMany({
      where: {
        companyId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    });

    const generatedContent = await this.prisma.generatedContent.count({
      where: {
        companyId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    });

    const upsellOffers = await this.prisma.upsellOffer.findMany({
      where: {
        companyId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    });

    const successfulSaves = saveAttempts.filter(
      (a) => a.outcome && !['CANCELLED', 'PAUSED', 'DOWNGRADED'].includes(a.outcome),
    );

    const interventions = await this.prisma.intervention.findMany({
      where: {
        companyId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    });

    await this.prisma.momentumAnalytics.upsert({
      where: {
        companyId_periodStart_periodEnd: {
          companyId,
          periodStart,
          periodEnd,
        },
      },
      create: {
        companyId,
        periodStart,
        periodEnd,
        totalSaveAttempts: saveAttempts.length,
        successfulSaves: successfulSaves.length,
        saveRate: saveAttempts.length > 0
          ? successfulSaves.length / saveAttempts.length
          : 0,
        revenuePreserved: saveAttempts.reduce(
          (sum, a) => sum + (a.revenuePreserved || 0),
          0,
        ),
        stageMetrics: this.calculateStageMetricsJson(saveAttempts),
        emailSaves: interventions.filter((i) => i.channel === 'EMAIL' && i.outcome === 'SAVED').length,
        smsSaves: interventions.filter((i) => i.channel === 'SMS' && i.outcome === 'SAVED').length,
        voiceSaves: interventions.filter((i) => i.channel === 'VOICE' && i.outcome === 'SAVED').length,
        inAppSaves: interventions.filter((i) => i.channel === 'IN_APP' && i.outcome === 'SAVED').length,
        totalCalls: voiceCalls.length,
        avgCallDuration: voiceCalls.length > 0
          ? voiceCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / voiceCalls.length
          : 0,
        voiceSaveRate: voiceCalls.length > 0
          ? voiceCalls.filter((c) => c.outcome === 'SAVED' || c.outcome === 'OFFER_ACCEPTED').length /
            voiceCalls.length
          : 0,
        contentGenerated: generatedContent,
        upsellsPresented: upsellOffers.filter((o) => o.presented).length,
        upsellsAccepted: upsellOffers.filter((o) => o.accepted).length,
        upsellRevenue: upsellOffers.reduce((sum, o) => sum + (o.revenue || 0), 0),
      },
      update: {
        totalSaveAttempts: saveAttempts.length,
        successfulSaves: successfulSaves.length,
        saveRate: saveAttempts.length > 0
          ? successfulSaves.length / saveAttempts.length
          : 0,
        revenuePreserved: saveAttempts.reduce(
          (sum, a) => sum + (a.revenuePreserved || 0),
          0,
        ),
        stageMetrics: this.calculateStageMetricsJson(saveAttempts),
        emailSaves: interventions.filter((i) => i.channel === 'EMAIL' && i.outcome === 'SAVED').length,
        smsSaves: interventions.filter((i) => i.channel === 'SMS' && i.outcome === 'SAVED').length,
        voiceSaves: interventions.filter((i) => i.channel === 'VOICE' && i.outcome === 'SAVED').length,
        inAppSaves: interventions.filter((i) => i.channel === 'IN_APP' && i.outcome === 'SAVED').length,
        totalCalls: voiceCalls.length,
        avgCallDuration: voiceCalls.length > 0
          ? voiceCalls.reduce((sum, c) => sum + (c.duration || 0), 0) / voiceCalls.length
          : 0,
        voiceSaveRate: voiceCalls.length > 0
          ? voiceCalls.filter((c) => c.outcome === 'SAVED' || c.outcome === 'OFFER_ACCEPTED').length /
            voiceCalls.length
          : 0,
        contentGenerated: generatedContent,
        upsellsPresented: upsellOffers.filter((o) => o.presented).length,
        upsellsAccepted: upsellOffers.filter((o) => o.accepted).length,
        upsellRevenue: upsellOffers.reduce((sum, o) => sum + (o.revenue || 0), 0),
      },
    });

    this.logger.log(`Updated analytics for company ${companyId} period ${periodStart} - ${periodEnd}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private getDateRange(options: {
    dateRange?: string;
    startDate?: Date;
    endDate?: Date;
  }): { startDate: Date; endDate: Date } {
    const endDate = options.endDate || new Date();
    let startDate = options.startDate;

    if (!startDate && options.dateRange) {
      const days = parseInt(options.dateRange.replace('d', '')) || 30;
      startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    }

    if (!startDate) {
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  private createMetricValue(current: number, previous: number): MetricValue {
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
    const trend: 'up' | 'down' | 'stable' =
      change > 0.01 ? 'up' : change < -0.01 ? 'down' : 'stable';

    return {
      value: current,
      previousValue: previous,
      change,
      changePercent,
      trend,
    };
  }

  /**
   * Calculate Net Promoter Score from voice call satisfaction ratings
   * NPS = (% Promoters - % Detractors) * 100
   * Promoters: 4-5, Passives: 3, Detractors: 0-2 (on 0-5 scale)
   */
  private async calculateNPS(companyId: string, startDate: Date, endDate: Date): Promise<MetricValue> {
    const voiceCalls = await this.prisma.voiceCall.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { id: true },
    });

    // Get satisfaction ratings from calls (cast as any for optional fields)
    const callsWithRating = await this.prisma.voiceCall.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const ratings = callsWithRating
      .map(c => (c as any).satisfactionRating)
      .filter(r => r != null && r >= 0 && r <= 5);

    if (ratings.length === 0) {
      return this.createMetricValue(0, 0);
    }

    const promoters = ratings.filter(r => r >= 4).length;
    const detractors = ratings.filter(r => r <= 2).length;
    const nps = ((promoters - detractors) / ratings.length) * 100;

    return this.createMetricValue(Math.round(nps), 0);
  }

  /**
   * Calculate average time from subscription start to churn (in days)
   */
  private async calculateAverageTimeToChurn(companyId: string, startDate: Date, endDate: Date): Promise<number> {
    // Get canceled subscriptions with their creation and cancellation dates
    const canceledSubs = await this.prisma.subscription.findMany({
      where: {
        companyId,
        status: 'CANCELED',
        canceledAt: { gte: startDate, lte: endDate },
      },
    });

    if (canceledSubs.length === 0) {
      return 0;
    }

    let totalDays = 0;
    let validCount = 0;

    for (const sub of canceledSubs) {
      const created = new Date(sub.createdAt).getTime();
      const canceled = sub.canceledAt ? new Date(sub.canceledAt).getTime() : Date.now();
      const daysToChurn = (canceled - created) / (1000 * 60 * 60 * 24);

      if (daysToChurn > 0 && daysToChurn < 3650) { // Reasonable range: 0-10 years
        totalDays += daysToChurn;
        validCount++;
      }
    }

    return validCount > 0 ? Math.round(totalDays / validCount) : 0;
  }

  /**
   * Get default cost per message by channel type
   * These are industry standard rates, actual costs may vary by provider
   */
  private getDefaultChannelCost(channel: string): number {
    const costs: Record<string, number> = {
      'SMS': 0.02,      // ~$0.02 per SMS
      'EMAIL': 0.001,   // ~$0.001 per email
      'PUSH': 0.0005,   // ~$0.0005 per push notification
      'IN_APP': 0.0001, // ~$0.0001 per in-app message
    };
    return costs[channel] || 0.001;
  }

  private async calculateTrends(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DashboardOverview['trends']> {
    return {
      churnTrend: await this.getTimeSeries(companyId, 'churn', startDate, endDate, 'day'),
      revenueTrend: await this.getTimeSeries(companyId, 'revenue', startDate, endDate, 'day'),
      saveTrend: await this.getTimeSeries(companyId, 'saves', startDate, endDate, 'day'),
      engagementTrend: await this.getTimeSeries(companyId, 'engagement', startDate, endDate, 'day'),
    };
  }

  private async getTimeSeries(
    companyId: string,
    metric: string,
    startDate: Date,
    endDate: Date,
    granularity: string,
  ): Promise<TrendData[]> {
    const data: TrendData[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const periodEnd = new Date(current);
      switch (granularity) {
        case 'hour':
          periodEnd.setHours(periodEnd.getHours() + 1);
          break;
        case 'day':
          periodEnd.setDate(periodEnd.getDate() + 1);
          break;
        case 'week':
          periodEnd.setDate(periodEnd.getDate() + 7);
          break;
        case 'month':
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          break;
      }

      // Fetch actual data from database based on metric type
      let value = 0;
      switch (metric) {
        case 'churn':
          const churned = await this.prisma.saveAttempt.count({
            where: {
              companyId,
              createdAt: { gte: current, lt: periodEnd },
              outcome: { in: ['CANCELLED', 'PAUSED', 'DOWNGRADED'] },
            },
          });
          value = churned;
          break;
        case 'saves':
          const savedOutcomes = ['SAVED_STAGE_1', 'SAVED_STAGE_2', 'SAVED_STAGE_3', 'SAVED_STAGE_4', 'SAVED_STAGE_5', 'SAVED_VOICE'];
          const saves = await this.prisma.saveAttempt.count({
            where: {
              companyId,
              createdAt: { gte: current, lt: periodEnd },
              outcome: { in: savedOutcomes as any },
            },
          });
          value = saves;
          break;
        case 'revenue':
        case 'upsell_revenue':
          const revenueOutcomes = ['SAVED_STAGE_1', 'SAVED_STAGE_2', 'SAVED_STAGE_3', 'SAVED_STAGE_4', 'SAVED_STAGE_5', 'SAVED_VOICE'];
          const attempts = await this.prisma.saveAttempt.findMany({
            where: {
              companyId,
              createdAt: { gte: current, lt: periodEnd },
              outcome: { in: revenueOutcomes as any },
            },
            select: { revenuePreserved: true },
          });
          const upsells = await this.prisma.upsellOffer.findMany({
            where: {
              companyId,
              createdAt: { gte: current, lt: periodEnd },
              accepted: true,
            },
            select: { revenue: true },
          });
          value = attempts.reduce((sum, a) => sum + (a.revenuePreserved || 0), 0) +
                  upsells.reduce((sum, u) => sum + (u.revenue || 0), 0);
          break;
        case 'calls':
          const calls = await this.prisma.voiceCall.count({
            where: {
              companyId,
              createdAt: { gte: current, lt: periodEnd },
            },
          });
          value = calls;
          break;
        case 'delivery':
          const messages = await this.prisma.deliveryMessage.count({
            where: {
              companyId,
              createdAt: { gte: current, lt: periodEnd },
              status: 'DELIVERED',
            },
          });
          value = messages;
          break;
        case 'engagement':
          const opened = await this.prisma.deliveryMessage.count({
            where: {
              companyId,
              createdAt: { gte: current, lt: periodEnd },
              openedAt: { not: null },
            },
          });
          value = opened;
          break;
        case 'upsells':
          const upsellCount = await this.prisma.upsellOffer.count({
            where: {
              companyId,
              createdAt: { gte: current, lt: periodEnd },
              accepted: true,
            },
          });
          value = upsellCount;
          break;
        case 'mrr':
          const activeSubscriptions = await this.prisma.subscription.findMany({
            where: {
              companyId,
              status: 'ACTIVE',
              createdAt: { lte: periodEnd },
            },
            select: { planAmount: true, interval: true },
          });
          // Convert to monthly: if yearly, divide by 12; if quarterly, divide by 3
          value = activeSubscriptions.reduce((sum, s) => {
            const amount = Number(s.planAmount || 0);
            if (s.interval === 'YEARLY') return sum + amount / 12;
            if (s.interval === 'QUARTERLY') return sum + amount / 3;
            return sum + amount; // MONTHLY, WEEKLY, etc. treated as-is
          }, 0);
          break;
        case 'sentiment':
          const sentimentCalls = await this.prisma.voiceCall.findMany({
            where: {
              companyId,
              createdAt: { gte: current, lt: periodEnd },
            },
            select: { overallSentiment: true },
          });
          const positive = sentimentCalls.filter(c => c.overallSentiment === 'POSITIVE').length;
          value = sentimentCalls.length > 0 ? (positive / sentimentCalls.length) * 100 : 0;
          break;
        default:
          value = 0;
      }

      data.push({
        timestamp: new Date(current),
        value,
        label: current.toISOString().split('T')[0],
      });

      switch (granularity) {
        case 'hour':
          current.setHours(current.getHours() + 1);
          break;
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return data;
  }

  private async generateAlerts(
    companyId: string,
    kpis: DashboardOverview['kpis'],
    quickStats: DashboardOverview['quickStats'],
  ): Promise<DashboardAlert[]> {
    const alerts: DashboardAlert[] = [];

    // Check for high churn rate
    if (kpis.churnRate.value > 10) {
      alerts.push({
        id: `alert_${Date.now()}_churn`,
        type: 'critical',
        category: MetricCategory.CHURN,
        title: 'High Churn Rate',
        message: `Churn rate of ${kpis.churnRate.value.toFixed(1)}% exceeds threshold of 10%`,
        metric: 'churnRate',
        threshold: 10,
        currentValue: kpis.churnRate.value,
        createdAt: new Date(),
      });
    }

    // Check for at-risk customers
    if (quickStats.atRiskCustomers > 50) {
      alerts.push({
        id: `alert_${Date.now()}_risk`,
        type: 'warning',
        category: MetricCategory.CHURN,
        title: 'High At-Risk Customers',
        message: `${quickStats.atRiskCustomers} customers identified as high risk`,
        currentValue: quickStats.atRiskCustomers,
        createdAt: new Date(),
      });
    }

    // Check for declining save rate
    if (kpis.saveRate.trend === 'down' && (kpis.saveRate.changePercent || 0) < -10) {
      alerts.push({
        id: `alert_${Date.now()}_save`,
        type: 'warning',
        category: MetricCategory.SAVE_FLOW,
        title: 'Declining Save Rate',
        message: `Save rate has declined by ${Math.abs(kpis.saveRate.changePercent || 0).toFixed(1)}%`,
        metric: 'saveRate',
        currentValue: kpis.saveRate.value,
        createdAt: new Date(),
      });
    }

    return alerts;
  }

  private calculateCohortAnalysis(companyId: string, saveAttempts: any[]): ChurnAnalytics['cohortAnalysis'] {
    // Simplified cohort analysis - would need more data in production
    return [
      { cohort: '2024-01', month0: 100, month1: 95, month2: 90, month3: 85, month6: 75, month12: 65 },
      { cohort: '2024-02', month0: 100, month1: 94, month2: 88, month3: 82, month6: 72, month12: 62 },
      { cohort: '2024-03', month0: 100, month1: 96, month2: 91, month3: 86, month6: 78, month12: 0 },
    ];
  }

  private calculateChannelPerformance(interventions: any[]): any[] {
    const channels = ['EMAIL', 'SMS', 'VOICE', 'IN_APP', 'WEBHOOK'];

    return channels.map((channel) => {
      const channelInterventions = interventions.filter((i) => i.channel === channel);
      const saves = channelInterventions.filter((i) => i.outcome === 'SAVED');

      return {
        channel: channel as DeliveryChannel,
        attempts: channelInterventions.length,
        saves: saves.length,
        saveRate: channelInterventions.length > 0
          ? saves.length / channelInterventions.length
          : 0,
      };
    });
  }

  private calculateStagePerformance(attempts: any[]): any[] {
    const stageNames = [
      { stage: 1, name: 'Pattern Interrupt' },
      { stage: 2, name: 'Diagnosis Survey' },
      { stage: 3, name: 'Branching Interventions' },
      { stage: 4, name: 'Nuclear Offer' },
      { stage: 5, name: 'Loss Visualization' },
    ];

    return stageNames
      .map(({ stage, name }) => {
        const saved = attempts.filter((a) => a.outcome === `SAVED_STAGE_${stage}`).length;
        return {
          stage: name,
          saves: saved,
          saveRate: attempts.length > 0 ? saved / attempts.length : 0,
        };
      })
      .sort((a, b) => b.saves - a.saves)
      .slice(0, 5);
  }

  private calculateBranchPerformance(attempts: any[]): any[] {
    const branches = ['too_expensive', 'wrong_product', 'too_much', 'shipping_issues', 'not_using', 'other'];

    return branches.map((branch) => {
      const branchAttempts = attempts.filter((a) => a.reasonCategory === branch);
      const saves = branchAttempts.filter(
        (a) => a.outcome?.startsWith('SAVED'),
      );

      const savedByCount = new Map<string, number>();
      for (const save of saves) {
        if (save.savedBy) {
          savedByCount.set(save.savedBy, (savedByCount.get(save.savedBy) || 0) + 1);
        }
      }
      const topIntervention = Array.from(savedByCount.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      return {
        branch,
        attempts: branchAttempts.length,
        saves: saves.length,
        saveRate: branchAttempts.length > 0 ? saves.length / branchAttempts.length : 0,
        topIntervention,
      };
    });
  }

  private calculateStageMetricsJson(attempts: any[]): any {
    return {
      stage1: {
        entered: attempts.length,
        saved: attempts.filter((a) => a.outcome === 'SAVED_STAGE_1').length,
      },
      stage2: {
        entered: attempts.filter((a) => a.currentStage >= 2).length,
        saved: attempts.filter((a) => a.outcome === 'SAVED_STAGE_2').length,
      },
      stage3: {
        entered: attempts.filter((a) => a.currentStage >= 3).length,
        saved: attempts.filter((a) => a.outcome === 'SAVED_STAGE_3').length,
      },
      stage4: {
        entered: attempts.filter((a) => a.currentStage >= 4).length,
        saved: attempts.filter((a) => a.outcome === 'SAVED_STAGE_4').length,
      },
      stage5: {
        entered: attempts.filter((a) => a.currentStage >= 5).length,
        saved: attempts.filter((a) => a.outcome === 'SAVED_STAGE_5').length,
      },
    };
  }

  private averageMetric(metrics: any[], field: string): number | undefined {
    const values = metrics.map((m) => m[field]).filter((v) => typeof v === 'number');
    if (values.length === 0) return undefined;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
}
