/**
 * Subscription Analytics Service
 *
 * Comprehensive analytics and reporting:
 * - Revenue metrics
 * - Churn analysis
 * - Cohort analysis
 * - LTV calculations
 * - Subscription metrics
 * - Custom reports
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus, BillingInterval, Prisma } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export interface DateRange {
  start: Date;
  end: Date;
}

export interface RevenueMetrics {
  companyId: string;
  period: DateRange;

  // MRR metrics
  mrr: number;
  mrrGrowth: number;
  mrrGrowthRate: number;

  // ARR metrics
  arr: number;
  arrGrowth: number;

  // Breakdown
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  reactivationMrr: number;

  // Totals
  totalRevenue: number;
  recurringRevenue: number;
  oneTimeRevenue: number;

  // Averages
  arpu: number; // Average Revenue Per User
  arppu: number; // Average Revenue Per Paying User
}

export interface ChurnMetrics {
  companyId: string;
  period: DateRange;

  // Churn rates
  customerChurnRate: number;
  revenueChurnRate: number;
  netRevenueChurnRate: number;

  // Counts
  churned: number;
  atRisk: number;
  retained: number;

  // By reason
  byReason: Record<string, number>;

  // By cohort
  byCohort: CohortChurn[];
}

export interface CohortChurn {
  cohortMonth: string;
  totalCustomers: number;
  churned: number;
  churnRate: number;
}

export interface CohortAnalysis {
  companyId: string;
  cohorts: Cohort[];
}

export interface Cohort {
  cohortMonth: string;
  size: number;
  retentionByMonth: number[];
  revenueByMonth: number[];
  cumulativeLtv: number[];
}

export interface SubscriptionMetrics {
  companyId: string;
  period: DateRange;

  // Counts
  totalActive: number;
  totalPaused: number;
  totalCanceled: number;
  totalTrial: number;

  // Changes
  newSubscriptions: number;
  upgrades: number;
  downgrades: number;
  pauseRequests: number;
  resumeRequests: number;
  cancelRequests: number;

  // By plan
  byPlan: PlanMetrics[];

  // By interval
  byInterval: Record<BillingInterval, number>;

  // Trial metrics
  trialConversionRate: number;
  averageTrialDays: number;
}

export interface PlanMetrics {
  planId: string;
  planName: string;
  activeSubscriptions: number;
  mrr: number;
  churnRate: number;
  growthRate: number;
}

export interface LtvMetrics {
  companyId: string;
  period: DateRange;

  // Overall LTV
  averageLtv: number;
  medianLtv: number;

  // LTV by segments
  byPlan: Record<string, number>;
  byAcquisitionChannel: Record<string, number>;
  byCohort: Record<string, number>;

  // LTV/CAC ratio (if CAC data available)
  ltvCacRatio?: number;

  // Lifetime predictions
  predictedLtv: number;
  paybackPeriodMonths: number;
}

export interface ReportConfig {
  type: ReportType;
  companyId: string;
  period: DateRange;
  groupBy?: 'day' | 'week' | 'month' | 'quarter';
  filters?: ReportFilters;
  format?: 'json' | 'csv';
}

export enum ReportType {
  REVENUE = 'REVENUE',
  CHURN = 'CHURN',
  SUBSCRIPTIONS = 'SUBSCRIPTIONS',
  COHORT = 'COHORT',
  LTV = 'LTV',
  EXECUTIVE_SUMMARY = 'EXECUTIVE_SUMMARY',
}

export interface ReportFilters {
  planIds?: string[];
  status?: SubscriptionStatus[];
  interval?: BillingInterval[];
}

export interface ExecutiveSummary {
  companyId: string;
  generatedAt: Date;
  period: DateRange;

  // Key metrics
  revenue: {
    mrr: number;
    mrrChange: number;
    arr: number;
    totalRevenue: number;
  };

  subscriptions: {
    active: number;
    new: number;
    churned: number;
    netChange: number;
  };

  customers: {
    total: number;
    paying: number;
    trial: number;
  };

  health: {
    churnRate: number;
    nps?: number;
    trialConversion: number;
    arpu: number;
  };

  // Trends
  trends: {
    mrrTrend: TrendPoint[];
    subscriptionsTrend: TrendPoint[];
    churnTrend: TrendPoint[];
  };

  // Alerts
  alerts: AnalyticsAlert[];
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface AnalyticsAlert {
  type: 'warning' | 'critical' | 'info';
  metric: string;
  message: string;
  value: number;
  threshold: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class SubscriptionAnalyticsService {
  private readonly logger = new Logger(SubscriptionAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // REVENUE METRICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Calculate revenue metrics for a period
   */
  async getRevenueMetrics(
    companyId: string,
    period: DateRange,
  ): Promise<RevenueMetrics> {
    // Get all active subscriptions at end of period
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        companyId,
        status: SubscriptionStatus.ACTIVE,
        createdAt: { lte: period.end },
        OR: [
          { canceledAt: null },
          { canceledAt: { gt: period.end } },
        ],
        deletedAt: null,
      },
      include: { subscriptionPlan: true },
    });

    // Calculate MRR
    const mrr = activeSubscriptions.reduce((sum, sub) => {
      const monthlyAmount = this.normalizeToMonthly(
        sub.planAmount?.toNumber() || 0,
        sub.interval as BillingInterval,
      );
      return sum + monthlyAmount;
    }, 0);

    // Get previous period for comparison
    const previousPeriod = this.getPreviousPeriod(period);
    const previousSubscriptions = await this.prisma.subscription.findMany({
      where: {
        companyId,
        status: SubscriptionStatus.ACTIVE,
        createdAt: { lte: previousPeriod.end },
        OR: [
          { canceledAt: null },
          { canceledAt: { gt: previousPeriod.end } },
        ],
        deletedAt: null,
      },
    });

    const previousMrr = previousSubscriptions.reduce((sum, sub) => {
      const monthlyAmount = this.normalizeToMonthly(
        sub.planAmount?.toNumber() || 0,
        sub.interval as BillingInterval,
      );
      return sum + monthlyAmount;
    }, 0);

    // Calculate MRR components
    const newMrr = await this.calculateNewMrr(companyId, period);
    const churnedMrr = await this.calculateChurnedMrr(companyId, period);
    const expansionMrr = await this.calculateExpansionMrr(companyId, period);
    const contractionMrr = await this.calculateContractionMrr(companyId, period);
    const reactivationMrr = await this.calculateReactivationMrr(companyId, period);

    // Get total customers for ARPU
    const totalCustomers = await this.prisma.customer.count({
      where: {
        companyId,
        deletedAt: null,
      },
    });

    const payingCustomers = new Set(activeSubscriptions.map(s => s.customerId)).size;

    return {
      companyId,
      period,
      mrr,
      mrrGrowth: mrr - previousMrr,
      mrrGrowthRate: previousMrr > 0 ? ((mrr - previousMrr) / previousMrr) * 100 : 0,
      arr: mrr * 12,
      arrGrowth: (mrr - previousMrr) * 12,
      newMrr,
      expansionMrr,
      contractionMrr,
      churnedMrr,
      reactivationMrr,
      totalRevenue: mrr, // Simplified - would need transaction data for full accuracy
      recurringRevenue: mrr,
      oneTimeRevenue: 0, // Would need transaction data
      arpu: totalCustomers > 0 ? mrr / totalCustomers : 0,
      arppu: payingCustomers > 0 ? mrr / payingCustomers : 0,
    };
  }

  private async calculateNewMrr(companyId: string, period: DateRange): Promise<number> {
    const newSubs = await this.prisma.subscription.findMany({
      where: {
        companyId,
        status: SubscriptionStatus.ACTIVE,
        createdAt: {
          gte: period.start,
          lte: period.end,
        },
        deletedAt: null,
      },
    });

    return newSubs.reduce((sum, sub) => {
      return sum + this.normalizeToMonthly(
        sub.planAmount?.toNumber() || 0,
        sub.interval as BillingInterval,
      );
    }, 0);
  }

  private async calculateChurnedMrr(companyId: string, period: DateRange): Promise<number> {
    const churnedSubs = await this.prisma.subscription.findMany({
      where: {
        companyId,
        status: SubscriptionStatus.CANCELED,
        canceledAt: {
          gte: period.start,
          lte: period.end,
        },
        deletedAt: null,
      },
    });

    return churnedSubs.reduce((sum, sub) => {
      return sum + this.normalizeToMonthly(
        sub.planAmount?.toNumber() || 0,
        sub.interval as BillingInterval,
      );
    }, 0);
  }

  private async calculateExpansionMrr(_companyId: string, _period: DateRange): Promise<number> {
    // Would need subscription change tracking for full accuracy
    // Placeholder: return 0
    return 0;
  }

  private async calculateContractionMrr(_companyId: string, _period: DateRange): Promise<number> {
    // Would need subscription change tracking for full accuracy
    // Placeholder: return 0
    return 0;
  }

  private async calculateReactivationMrr(companyId: string, period: DateRange): Promise<number> {
    // Find subscriptions that were reactivated in this period
    const reactivatedSubs = await this.prisma.subscription.findMany({
      where: {
        companyId,
        status: SubscriptionStatus.ACTIVE,
        deletedAt: null,
        // Check metadata for reactivation
      },
    });

    // Filter by reactivation date in metadata
    const filteredSubs = reactivatedSubs.filter(sub => {
      const metadata = sub.metadata as Record<string, unknown> | null;
      if (!metadata?.reactivatedAt) return false;
      const reactivatedAt = new Date(metadata.reactivatedAt as string);
      return reactivatedAt >= period.start && reactivatedAt <= period.end;
    });

    return filteredSubs.reduce((sum, sub) => {
      return sum + this.normalizeToMonthly(
        sub.planAmount?.toNumber() || 0,
        sub.interval as BillingInterval,
      );
    }, 0);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CHURN METRICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Calculate churn metrics for a period
   */
  async getChurnMetrics(
    companyId: string,
    period: DateRange,
  ): Promise<ChurnMetrics> {
    // Get churned subscriptions in period
    const churnedSubs = await this.prisma.subscription.findMany({
      where: {
        companyId,
        status: SubscriptionStatus.CANCELED,
        canceledAt: {
          gte: period.start,
          lte: period.end,
        },
        deletedAt: null,
      },
    });

    // Get active at start of period
    const activeAtStart = await this.prisma.subscription.count({
      where: {
        companyId,
        createdAt: { lt: period.start },
        OR: [
          { status: SubscriptionStatus.ACTIVE },
          { canceledAt: { gte: period.start } },
        ],
        deletedAt: null,
      },
    });

    // Calculate churn rate
    const customerChurnRate = activeAtStart > 0
      ? (churnedSubs.length / activeAtStart) * 100
      : 0;

    // Revenue churn
    const churnedRevenue = churnedSubs.reduce((sum, sub) => {
      return sum + this.normalizeToMonthly(
        sub.planAmount?.toNumber() || 0,
        sub.interval as BillingInterval,
      );
    }, 0);

    const totalRevenueAtStart = await this.calculateMrrAtDate(companyId, period.start);
    const revenueChurnRate = totalRevenueAtStart > 0
      ? (churnedRevenue / totalRevenueAtStart) * 100
      : 0;

    // Group by reason
    const byReason: Record<string, number> = {};
    for (const sub of churnedSubs) {
      const reason = sub.cancelReason || 'unknown';
      byReason[reason] = (byReason[reason] || 0) + 1;
    }

    // At-risk subscriptions (past due or payment failing)
    const atRisk = await this.prisma.subscription.count({
      where: {
        companyId,
        status: SubscriptionStatus.PAST_DUE,
        deletedAt: null,
      },
    });

    // Retained
    const retained = await this.prisma.subscription.count({
      where: {
        companyId,
        status: SubscriptionStatus.ACTIVE,
        createdAt: { lt: period.start },
        deletedAt: null,
      },
    });

    // Cohort churn
    const byCohort = await this.calculateCohortChurn(companyId, period);

    return {
      companyId,
      period,
      customerChurnRate,
      revenueChurnRate,
      netRevenueChurnRate: revenueChurnRate, // Would need expansion data for net
      churned: churnedSubs.length,
      atRisk,
      retained,
      byReason,
      byCohort,
    };
  }

  private async calculateMrrAtDate(companyId: string, date: Date): Promise<number> {
    const subs = await this.prisma.subscription.findMany({
      where: {
        companyId,
        createdAt: { lte: date },
        OR: [
          { status: SubscriptionStatus.ACTIVE },
          { canceledAt: { gt: date } },
        ],
        deletedAt: null,
      },
    });

    return subs.reduce((sum, sub) => {
      return sum + this.normalizeToMonthly(
        sub.planAmount?.toNumber() || 0,
        sub.interval as BillingInterval,
      );
    }, 0);
  }

  private async calculateCohortChurn(
    companyId: string,
    period: DateRange,
  ): Promise<CohortChurn[]> {
    const cohorts: CohortChurn[] = [];

    // Get subscriptions grouped by creation month
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        companyId,
        createdAt: { lte: period.end },
        deletedAt: null,
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
        canceledAt: true,
      },
    });

    // Group by cohort month
    const cohortMap = new Map<string, { total: number; churned: number }>();

    for (const sub of subscriptions) {
      const cohortMonth = this.formatCohortMonth(sub.createdAt);

      if (!cohortMap.has(cohortMonth)) {
        cohortMap.set(cohortMonth, { total: 0, churned: 0 });
      }

      const cohort = cohortMap.get(cohortMonth)!;
      cohort.total++;

      if (sub.status === SubscriptionStatus.CANCELED) {
        cohort.churned++;
      }
    }

    for (const [month, data] of cohortMap.entries()) {
      cohorts.push({
        cohortMonth: month,
        totalCustomers: data.total,
        churned: data.churned,
        churnRate: data.total > 0 ? (data.churned / data.total) * 100 : 0,
      });
    }

    return cohorts.sort((a, b) => a.cohortMonth.localeCompare(b.cohortMonth));
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COHORT ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Perform cohort analysis
   */
  async getCohortAnalysis(
    companyId: string,
    monthsBack: number = 12,
  ): Promise<CohortAnalysis> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate },
        deletedAt: null,
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
        canceledAt: true,
        planAmount: true,
        interval: true,
      },
    });

    // Group by cohort month
    const cohortMap = new Map<string, typeof subscriptions>();

    for (const sub of subscriptions) {
      const cohortMonth = this.formatCohortMonth(sub.createdAt);

      if (!cohortMap.has(cohortMonth)) {
        cohortMap.set(cohortMonth, []);
      }

      cohortMap.get(cohortMonth)!.push(sub);
    }

    const cohorts: Cohort[] = [];

    for (const [cohortMonth, subs] of cohortMap.entries()) {
      const cohortDate = new Date(cohortMonth + '-01');
      const monthsSinceCohort = this.monthsBetween(cohortDate, now);

      const retentionByMonth: number[] = [];
      const revenueByMonth: number[] = [];
      const cumulativeLtv: number[] = [];

      let cumulativeRevenue = 0;

      for (let month = 0; month <= Math.min(monthsSinceCohort, 12); month++) {
        const checkDate = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + month + 1, 0);

        // Count retained at this month
        const retainedCount = subs.filter(sub => {
          if (sub.status === SubscriptionStatus.CANCELED && sub.canceledAt) {
            return sub.canceledAt > checkDate;
          }
          return true;
        }).length;

        const retentionRate = subs.length > 0 ? (retainedCount / subs.length) * 100 : 0;
        retentionByMonth.push(retentionRate);

        // Calculate revenue for this month
        const monthRevenue = subs.filter(sub => {
          if (sub.status === SubscriptionStatus.CANCELED && sub.canceledAt) {
            return sub.canceledAt > checkDate;
          }
          return true;
        }).reduce((sum, sub) => {
          return sum + this.normalizeToMonthly(
            sub.planAmount?.toNumber() || 0,
            sub.interval as BillingInterval,
          );
        }, 0);

        revenueByMonth.push(monthRevenue);
        cumulativeRevenue += monthRevenue;
        cumulativeLtv.push(subs.length > 0 ? cumulativeRevenue / subs.length : 0);
      }

      cohorts.push({
        cohortMonth,
        size: subs.length,
        retentionByMonth,
        revenueByMonth,
        cumulativeLtv,
      });
    }

    return {
      companyId,
      cohorts: cohorts.sort((a, b) => a.cohortMonth.localeCompare(b.cohortMonth)),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION METRICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get subscription metrics for a period
   */
  async getSubscriptionMetrics(
    companyId: string,
    period: DateRange,
  ): Promise<SubscriptionMetrics> {
    // Current counts
    const [totalActive, totalPaused, totalCanceled, totalTrial] = await Promise.all([
      this.prisma.subscription.count({
        where: { companyId, status: SubscriptionStatus.ACTIVE, deletedAt: null },
      }),
      this.prisma.subscription.count({
        where: { companyId, status: SubscriptionStatus.PAUSED, deletedAt: null },
      }),
      this.prisma.subscription.count({
        where: { companyId, status: SubscriptionStatus.CANCELED, deletedAt: null },
      }),
      this.prisma.subscription.count({
        where: { companyId, status: SubscriptionStatus.TRIALING, deletedAt: null },
      }),
    ]);

    // Period changes
    const newSubscriptions = await this.prisma.subscription.count({
      where: {
        companyId,
        createdAt: { gte: period.start, lte: period.end },
        deletedAt: null,
      },
    });

    const cancelRequests = await this.prisma.subscription.count({
      where: {
        companyId,
        canceledAt: { gte: period.start, lte: period.end },
        deletedAt: null,
      },
    });

    // By interval
    const intervalCounts = await this.prisma.subscription.groupBy({
      by: ['interval'],
      where: { companyId, status: SubscriptionStatus.ACTIVE, deletedAt: null },
      _count: true,
    });

    const byInterval: Record<BillingInterval, number> = {
      [BillingInterval.DAILY]: 0,
      [BillingInterval.WEEKLY]: 0,
      [BillingInterval.BIWEEKLY]: 0,
      [BillingInterval.MONTHLY]: 0,
      [BillingInterval.QUARTERLY]: 0,
      [BillingInterval.YEARLY]: 0,
    };

    for (const item of intervalCounts) {
      if (item.interval) {
        byInterval[item.interval as BillingInterval] = item._count;
      }
    }

    // By plan
    const byPlan = await this.calculatePlanMetrics(companyId, period);

    // Trial conversion
    const trialConversionRate = await this.calculateTrialConversion(companyId, period);

    return {
      companyId,
      period,
      totalActive,
      totalPaused,
      totalCanceled,
      totalTrial,
      newSubscriptions,
      upgrades: 0, // Would need plan change tracking
      downgrades: 0,
      pauseRequests: 0, // Would need tracking
      resumeRequests: 0,
      cancelRequests,
      byPlan,
      byInterval,
      trialConversionRate,
      averageTrialDays: 14, // Default, would need actual calculation
    };
  }

  private async calculatePlanMetrics(
    companyId: string,
    period: DateRange,
  ): Promise<PlanMetrics[]> {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { companyId, deletedAt: null },
      include: {
        subscriptions: {
          where: { status: SubscriptionStatus.ACTIVE, deletedAt: null },
        },
      },
    });

    return plans.map(plan => {
      const activeSubs = plan.subscriptions;
      const mrr = activeSubs.reduce((sum, sub) => {
        return sum + this.normalizeToMonthly(
          sub.planAmount?.toNumber() || 0,
          sub.interval as BillingInterval,
        );
      }, 0);

      return {
        planId: plan.id,
        planName: plan.name,
        activeSubscriptions: activeSubs.length,
        mrr,
        churnRate: 0, // Would need historical data
        growthRate: 0,
      };
    });
  }

  private async calculateTrialConversion(
    companyId: string,
    period: DateRange,
  ): Promise<number> {
    // Trials that ended in this period
    const endedTrials = await this.prisma.subscription.findMany({
      where: {
        companyId,
        trialEnd: { gte: period.start, lte: period.end },
        deletedAt: null,
      },
    });

    if (endedTrials.length === 0) return 0;

    const converted = endedTrials.filter(
      sub => sub.status === SubscriptionStatus.ACTIVE,
    ).length;

    return (converted / endedTrials.length) * 100;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LTV METRICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Calculate LTV metrics
   */
  async getLtvMetrics(
    companyId: string,
    period: DateRange,
  ): Promise<LtvMetrics> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      include: { subscriptionPlan: true },
    });

    // Calculate individual LTVs
    const ltvValues: number[] = [];
    const byPlan: Record<string, number[]> = {};

    for (const sub of subscriptions) {
      const ltv = this.calculateSubscriptionLtv(sub);
      ltvValues.push(ltv);

      const planName = sub.subscriptionPlan?.name || 'Unknown';
      if (!byPlan[planName]) byPlan[planName] = [];
      byPlan[planName].push(ltv);
    }

    // Calculate averages
    const averageLtv = ltvValues.length > 0
      ? ltvValues.reduce((a, b) => a + b, 0) / ltvValues.length
      : 0;

    const sortedLtvs = [...ltvValues].sort((a, b) => a - b);
    const medianLtv = sortedLtvs.length > 0
      ? sortedLtvs[Math.floor(sortedLtvs.length / 2)]
      : 0;

    // Aggregate by plan
    const byPlanAverage: Record<string, number> = {};
    for (const [plan, values] of Object.entries(byPlan)) {
      byPlanAverage[plan] = values.reduce((a, b) => a + b, 0) / values.length;
    }

    // Calculate payback period (simplified)
    const churnMetrics = await this.getChurnMetrics(companyId, period);
    const monthlyChurnRate = churnMetrics.customerChurnRate / 100;
    const avgLifetimeMonths = monthlyChurnRate > 0 ? 1 / monthlyChurnRate : 24;
    const paybackPeriodMonths = Math.ceil(avgLifetimeMonths * 0.3); // Assume 30% margin

    return {
      companyId,
      period,
      averageLtv,
      medianLtv,
      byPlan: byPlanAverage,
      byAcquisitionChannel: {}, // Would need acquisition data
      byCohort: {}, // Would calculate from cohort data
      predictedLtv: averageLtv * 1.1, // Simplified prediction
      paybackPeriodMonths,
    };
  }

  private calculateSubscriptionLtv(sub: {
    createdAt: Date;
    canceledAt: Date | null;
    planAmount: Prisma.Decimal | null;
    interval: string | null;
  }): number {
    const monthlyAmount = this.normalizeToMonthly(
      sub.planAmount?.toNumber() || 0,
      sub.interval as BillingInterval,
    );

    const endDate = sub.canceledAt || new Date();
    const months = this.monthsBetween(sub.createdAt, endDate);

    return monthlyAmount * Math.max(months, 1);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate executive summary report
   */
  async getExecutiveSummary(
    companyId: string,
    period: DateRange,
  ): Promise<ExecutiveSummary> {
    const [revenue, subscriptions, churn] = await Promise.all([
      this.getRevenueMetrics(companyId, period),
      this.getSubscriptionMetrics(companyId, period),
      this.getChurnMetrics(companyId, period),
    ]);

    // Get customer counts
    const [totalCustomers, payingCustomers, trialCustomers] = await Promise.all([
      this.prisma.customer.count({ where: { companyId, deletedAt: null } }),
      this.prisma.subscription.count({
        where: { companyId, status: SubscriptionStatus.ACTIVE, deletedAt: null },
      }),
      this.prisma.subscription.count({
        where: { companyId, status: SubscriptionStatus.TRIALING, deletedAt: null },
      }),
    ]);

    // Build trends
    const mrrTrend = await this.buildMrrTrend(companyId, period);
    const subscriptionsTrend = await this.buildSubscriptionsTrend(companyId, period);
    const churnTrend = await this.buildChurnTrend(companyId, period);

    // Generate alerts
    const alerts = this.generateAlerts(revenue, churn, subscriptions);

    return {
      companyId,
      generatedAt: new Date(),
      period,
      revenue: {
        mrr: revenue.mrr,
        mrrChange: revenue.mrrGrowth,
        arr: revenue.arr,
        totalRevenue: revenue.totalRevenue,
      },
      subscriptions: {
        active: subscriptions.totalActive,
        new: subscriptions.newSubscriptions,
        churned: churn.churned,
        netChange: subscriptions.newSubscriptions - churn.churned,
      },
      customers: {
        total: totalCustomers,
        paying: payingCustomers,
        trial: trialCustomers,
      },
      health: {
        churnRate: churn.customerChurnRate,
        trialConversion: subscriptions.trialConversionRate,
        arpu: revenue.arpu,
      },
      trends: {
        mrrTrend,
        subscriptionsTrend,
        churnTrend,
      },
      alerts,
    };
  }

  private async buildMrrTrend(
    companyId: string,
    period: DateRange,
  ): Promise<TrendPoint[]> {
    const points: TrendPoint[] = [];
    const days = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24));
    const stepDays = Math.max(1, Math.floor(days / 30)); // Max 30 points

    for (let i = 0; i <= days; i += stepDays) {
      const date = new Date(period.start);
      date.setDate(date.getDate() + i);

      const mrr = await this.calculateMrrAtDate(companyId, date);
      points.push({
        date: date.toISOString().split('T')[0],
        value: mrr,
      });
    }

    return points;
  }

  private async buildSubscriptionsTrend(
    companyId: string,
    period: DateRange,
  ): Promise<TrendPoint[]> {
    const points: TrendPoint[] = [];
    const days = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24));
    const stepDays = Math.max(1, Math.floor(days / 30));

    for (let i = 0; i <= days; i += stepDays) {
      const date = new Date(period.start);
      date.setDate(date.getDate() + i);

      const count = await this.prisma.subscription.count({
        where: {
          companyId,
          status: SubscriptionStatus.ACTIVE,
          createdAt: { lte: date },
          OR: [
            { canceledAt: null },
            { canceledAt: { gt: date } },
          ],
          deletedAt: null,
        },
      });

      points.push({
        date: date.toISOString().split('T')[0],
        value: count,
      });
    }

    return points;
  }

  private async buildChurnTrend(
    companyId: string,
    period: DateRange,
  ): Promise<TrendPoint[]> {
    const points: TrendPoint[] = [];
    // Simplified: monthly churn rate for last 12 months
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      if (monthEnd < period.start || monthStart > period.end) continue;

      const churnedCount = await this.prisma.subscription.count({
        where: {
          companyId,
          canceledAt: { gte: monthStart, lte: monthEnd },
          deletedAt: null,
        },
      });

      const activeAtStart = await this.prisma.subscription.count({
        where: {
          companyId,
          createdAt: { lt: monthStart },
          OR: [
            { status: SubscriptionStatus.ACTIVE },
            { canceledAt: { gte: monthStart } },
          ],
          deletedAt: null,
        },
      });

      const churnRate = activeAtStart > 0 ? (churnedCount / activeAtStart) * 100 : 0;

      points.push({
        date: monthStart.toISOString().split('T')[0],
        value: churnRate,
      });
    }

    return points;
  }

  private generateAlerts(
    revenue: RevenueMetrics,
    churn: ChurnMetrics,
    subscriptions: SubscriptionMetrics,
  ): AnalyticsAlert[] {
    const alerts: AnalyticsAlert[] = [];

    // High churn alert
    if (churn.customerChurnRate > 10) {
      alerts.push({
        type: churn.customerChurnRate > 15 ? 'critical' : 'warning',
        metric: 'Customer Churn Rate',
        message: `Customer churn rate is ${churn.customerChurnRate.toFixed(1)}%, above the healthy threshold`,
        value: churn.customerChurnRate,
        threshold: 10,
      });
    }

    // MRR decline alert
    if (revenue.mrrGrowthRate < -5) {
      alerts.push({
        type: 'critical',
        metric: 'MRR Growth',
        message: `MRR declined by ${Math.abs(revenue.mrrGrowthRate).toFixed(1)}% this period`,
        value: revenue.mrrGrowthRate,
        threshold: -5,
      });
    }

    // Low trial conversion
    if (subscriptions.trialConversionRate < 30 && subscriptions.totalTrial > 0) {
      alerts.push({
        type: 'warning',
        metric: 'Trial Conversion',
        message: `Trial conversion rate is ${subscriptions.trialConversionRate.toFixed(1)}%, below target`,
        value: subscriptions.trialConversionRate,
        threshold: 30,
      });
    }

    // At-risk subscriptions
    if (churn.atRisk > 10) {
      alerts.push({
        type: 'warning',
        metric: 'At-Risk Subscriptions',
        message: `${churn.atRisk} subscriptions are past due`,
        value: churn.atRisk,
        threshold: 10,
      });
    }

    return alerts;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // REPORT GENERATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate a custom report
   */
  async generateReport(config: ReportConfig): Promise<unknown> {
    switch (config.type) {
      case ReportType.REVENUE:
        return this.getRevenueMetrics(config.companyId, config.period);
      case ReportType.CHURN:
        return this.getChurnMetrics(config.companyId, config.period);
      case ReportType.SUBSCRIPTIONS:
        return this.getSubscriptionMetrics(config.companyId, config.period);
      case ReportType.COHORT:
        return this.getCohortAnalysis(config.companyId);
      case ReportType.LTV:
        return this.getLtvMetrics(config.companyId, config.period);
      case ReportType.EXECUTIVE_SUMMARY:
        return this.getExecutiveSummary(config.companyId, config.period);
      default:
        throw new Error(`Unknown report type: ${config.type}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private normalizeToMonthly(amount: number, interval: BillingInterval): number {
    switch (interval) {
      case BillingInterval.DAILY:
        return amount * 30;
      case BillingInterval.WEEKLY:
        return amount * 4.33;
      case BillingInterval.BIWEEKLY:
        return amount * 2.17;
      case BillingInterval.MONTHLY:
        return amount;
      case BillingInterval.QUARTERLY:
        return amount / 3;
      case BillingInterval.YEARLY:
        return amount / 12;
      default:
        return amount;
    }
  }

  private getPreviousPeriod(period: DateRange): DateRange {
    const duration = period.end.getTime() - period.start.getTime();
    return {
      start: new Date(period.start.getTime() - duration),
      end: new Date(period.start.getTime() - 1),
    };
  }

  private formatCohortMonth(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private monthsBetween(start: Date, end: Date): number {
    const months = (end.getFullYear() - start.getFullYear()) * 12
      + (end.getMonth() - start.getMonth());
    return Math.max(0, months);
  }
}
