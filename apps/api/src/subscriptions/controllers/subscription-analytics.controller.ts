/**
 * Subscription Analytics Controller
 *
 * Endpoints for subscription analytics and reporting:
 * - Revenue metrics
 * - Churn analysis
 * - Cohort analysis
 * - LTV calculations
 * - Executive summaries
 * - Custom reports
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  SubscriptionAnalyticsService,
  RevenueMetrics,
  ChurnMetrics,
  CohortAnalysis,
  SubscriptionMetrics,
  LtvMetrics,
  ExecutiveSummary,
  ReportType,
  DateRange,
} from '../services/subscription-analytics.service';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
} from 'class-validator';
import { SubscriptionStatus, BillingInterval } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════════

class DateRangeDto {
  @IsDateString()
  start: string;

  @IsDateString()
  end: string;
}

class GenerateReportDto {
  @IsEnum(ReportType)
  type: ReportType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(['day', 'week', 'month', 'quarter'])
  groupBy?: 'day' | 'week' | 'month' | 'quarter';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  planIds?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(SubscriptionStatus, { each: true })
  status?: SubscriptionStatus[];

  @IsOptional()
  @IsArray()
  @IsEnum(BillingInterval, { each: true })
  interval?: BillingInterval[];
}

@Controller('subscriptions/analytics')
@UseGuards(AuthGuard('jwt'))
export class SubscriptionAnalyticsController {
  private readonly logger = new Logger(SubscriptionAnalyticsController.name);

  constructor(
    private readonly analyticsService: SubscriptionAnalyticsService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════════
  // REVENUE METRICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get revenue metrics for a period
   */
  @Get('revenue')
  async getRevenueMetrics(
    @Query('companyId') queryCompanyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RevenueMetrics> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    const period = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getRevenueMetrics(companyId, period);
  }

  /**
   * Get current MRR and ARR
   */
  @Get('mrr')
  async getCurrentMrr(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ mrr: number; arr: number; growth: number }> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const metrics = await this.analyticsService.getRevenueMetrics(companyId, {
      start: monthAgo,
      end: now,
    });

    return {
      mrr: metrics.mrr,
      arr: metrics.arr,
      growth: metrics.mrrGrowthRate,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CHURN METRICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get churn metrics for a period
   */
  @Get('churn')
  async getChurnMetrics(
    @Query('companyId') queryCompanyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChurnMetrics> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    const period = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getChurnMetrics(companyId, period);
  }

  /**
   * Get at-risk subscriptions count
   */
  @Get('at-risk')
  async getAtRiskCount(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ atRisk: number; critical: number }> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const churn = await this.analyticsService.getChurnMetrics(companyId, {
      start: monthAgo,
      end: now,
    });

    return {
      atRisk: churn.atRisk,
      critical: Math.ceil(churn.atRisk * 0.3), // Top 30% are critical
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // COHORT ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get cohort analysis
   */
  @Get('cohorts')
  async getCohortAnalysis(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('monthsBack') monthsBack?: string,
  ): Promise<CohortAnalysis> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.analyticsService.getCohortAnalysis(
      companyId,
      monthsBack ? parseInt(monthsBack, 10) : 12,
    );
  }

  /**
   * Get retention curve data
   */
  @Get('retention')
  async getRetentionCurve(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('monthsBack') monthsBack?: string,
  ): Promise<{ months: number[]; retentionRates: number[] }> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    const cohorts = await this.analyticsService.getCohortAnalysis(
      companyId,
      monthsBack ? parseInt(monthsBack, 10) : 12,
    );

    // Average retention across cohorts
    const maxMonths = Math.max(
      ...cohorts.cohorts.map(c => c.retentionByMonth.length),
    );

    const months = Array.from({ length: maxMonths }, (_, i) => i);
    const retentionRates = months.map(month => {
      const rates = cohorts.cohorts
        .filter(c => c.retentionByMonth.length > month)
        .map(c => c.retentionByMonth[month]);

      return rates.length > 0
        ? rates.reduce((a, b) => a + b, 0) / rates.length
        : 0;
    });

    return { months, retentionRates };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION METRICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get subscription metrics for a period
   */
  @Get('subscriptions')
  async getSubscriptionMetrics(
    @Query('companyId') queryCompanyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionMetrics> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    const period = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getSubscriptionMetrics(companyId, period);
  }

  /**
   * Get current subscription counts
   */
  @Get('subscriptions/counts')
  async getSubscriptionCounts(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    active: number;
    paused: number;
    canceled: number;
    trial: number;
    total: number;
  }> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const metrics = await this.analyticsService.getSubscriptionMetrics(companyId, {
      start: monthAgo,
      end: now,
    });

    return {
      active: metrics.totalActive,
      paused: metrics.totalPaused,
      canceled: metrics.totalCanceled,
      trial: metrics.totalTrial,
      total: metrics.totalActive + metrics.totalPaused + metrics.totalTrial,
    };
  }

  /**
   * Get subscriptions by interval
   */
  @Get('subscriptions/by-interval')
  async getSubscriptionsByInterval(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Record<BillingInterval, number>> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const metrics = await this.analyticsService.getSubscriptionMetrics(companyId, {
      start: monthAgo,
      end: now,
    });

    return metrics.byInterval;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LTV METRICS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get LTV metrics
   */
  @Get('ltv')
  async getLtvMetrics(
    @Query('companyId') queryCompanyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LtvMetrics> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    const period = this.parseDateRange(startDate, endDate);
    return this.analyticsService.getLtvMetrics(companyId, period);
  }

  /**
   * Get LTV by plan
   */
  @Get('ltv/by-plan')
  async getLtvByPlan(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Record<string, number>> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    const now = new Date();
    const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const metrics = await this.analyticsService.getLtvMetrics(companyId, {
      start: yearAgo,
      end: now,
    });

    return metrics.byPlan;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get executive summary
   */
  @Get('summary')
  async getExecutiveSummary(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ExecutiveSummary> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);

    // Default to last 30 days
    const now = new Date();
    const period = startDate && endDate
      ? this.parseDateRange(startDate, endDate)
      : { start: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()), end: now };

    return this.analyticsService.getExecutiveSummary(companyId, period);
  }

  /**
   * Get dashboard KPIs
   */
  @Get('kpis')
  async getDashboardKpis(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    mrr: number;
    mrrGrowth: number;
    activeSubscriptions: number;
    churnRate: number;
    arpu: number;
    trialConversion: number;
  }> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const summary = await this.analyticsService.getExecutiveSummary(companyId, {
      start: monthAgo,
      end: now,
    });

    return {
      mrr: summary.revenue.mrr,
      mrrGrowth: summary.revenue.mrrChange,
      activeSubscriptions: summary.subscriptions.active,
      churnRate: summary.health.churnRate,
      arpu: summary.health.arpu,
      trialConversion: summary.health.trialConversion,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // REPORT GENERATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate a custom report
   */
  @Post('reports')
  async generateReport(
    @Query('companyId') queryCompanyId: string,
    @Body() dto: GenerateReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);

    return this.analyticsService.generateReport({
      type: dto.type,
      companyId,
      period: {
        start: new Date(dto.startDate),
        end: new Date(dto.endDate),
      },
      groupBy: dto.groupBy,
      filters: {
        planIds: dto.planIds,
        status: dto.status,
        interval: dto.interval,
      },
    });
  }

  /**
   * Get available report types
   */
  @Get('reports/types')
  async getReportTypes(): Promise<{ type: ReportType; description: string }[]> {
    return [
      { type: ReportType.REVENUE, description: 'Revenue and MRR metrics' },
      { type: ReportType.CHURN, description: 'Churn analysis and at-risk subscribers' },
      { type: ReportType.SUBSCRIPTIONS, description: 'Subscription counts and changes' },
      { type: ReportType.COHORT, description: 'Cohort retention analysis' },
      { type: ReportType.LTV, description: 'Lifetime value calculations' },
      { type: ReportType.EXECUTIVE_SUMMARY, description: 'High-level business overview' },
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TRENDS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get MRR trend over time
   */
  @Get('trends/mrr')
  async getMrrTrend(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('days') days?: string,
  ): Promise<{ date: string; value: number }[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    const numDays = days ? parseInt(days, 10) : 30;

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - numDays);

    const summary = await this.analyticsService.getExecutiveSummary(companyId, {
      start,
      end: now,
    });

    return summary.trends.mrrTrend;
  }

  /**
   * Get subscription count trend
   */
  @Get('trends/subscriptions')
  async getSubscriptionsTrend(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('days') days?: string,
  ): Promise<{ date: string; value: number }[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);
    const numDays = days ? parseInt(days, 10) : 30;

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - numDays);

    const summary = await this.analyticsService.getExecutiveSummary(companyId, {
      start,
      end: now,
    });

    return summary.trends.subscriptionsTrend;
  }

  /**
   * Get churn rate trend
   */
  @Get('trends/churn')
  async getChurnTrend(
    @Query('companyId') queryCompanyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ date: string; value: number }[]> {
    const companyId = await this.getCompanyIdForQuery(user, queryCompanyId);

    const now = new Date();
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);

    const summary = await this.analyticsService.getExecutiveSummary(companyId, {
      start,
      end: now,
    });

    return summary.trends.churnTrend;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  private parseDateRange(startDate: string, endDate: string): DateRange {
    return {
      start: new Date(startDate),
      end: new Date(endDate),
    };
  }

  private async getCompanyIdForQuery(
    user: AuthenticatedUser,
    queryCompanyId?: string,
  ): Promise<string> {
    if (user.companyId) {
      return user.companyId;
    }

    if (!queryCompanyId) {
      throw new Error('companyId is required for organization/client users');
    }

    return queryCompanyId;
  }
}
