import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentSessionStatus } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// AI INSIGHTS SERVICE
// ═══════════════════════════════════════════════════════════════
// Provides AI-powered insights for payment page optimization
// Analyzes session data, conversion rates, and user behavior

export interface PageInsight {
  type: 'success' | 'warning' | 'suggestion' | 'critical';
  category: InsightCategory;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  metric?: {
    current: number;
    benchmark: number;
    unit: string;
  };
  recommendations: string[];
}

export type InsightCategory =
  | 'conversion'
  | 'abandonment'
  | 'performance'
  | 'pricing'
  | 'ux'
  | 'security'
  | 'mobile'
  | 'payment_methods';

export interface ConversionMetrics {
  totalSessions: number;
  completedSessions: number;
  conversionRate: number;
  averageOrderValue: number;
  totalRevenue: number;
  abandonmentRate: number;
  averageTimeToComplete: number; // seconds
}

export interface ConversionFunnel {
  stage: string;
  count: number;
  percentage: number;
  dropOff: number;
}

export interface InsightsSummary {
  pageId: string;
  pageName: string;
  period: string;
  metrics: ConversionMetrics;
  funnel: ConversionFunnel[];
  insights: PageInsight[];
  score: number; // 0-100 optimization score
  generatedAt: Date;
}

// Industry benchmarks for comparison
const BENCHMARKS = {
  conversionRate: 3.5, // 3.5% average e-commerce conversion
  abandonmentRate: 69.8, // Average cart abandonment
  averageCheckoutTime: 180, // 3 minutes
  mobileConversionRate: 2.5,
  desktopConversionRate: 4.5,
};

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // Generate Insights for a Payment Page
  // ─────────────────────────────────────────────────────────────

  async generateInsights(
    pageId: string,
    periodDays: number = 30,
  ): Promise<InsightsSummary> {
    const page = await this.prisma.paymentPage.findUnique({
      where: { id: pageId },
      select: { id: true, name: true },
    });

    if (!page) {
      throw new Error('Payment page not found');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Fetch session data
    const sessions = await this.prisma.paymentPageSession.findMany({
      where: {
        pageId,
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        status: true,
        total: true,
        currency: true,
        createdAt: true,
        completedAt: true,
        deviceType: true,
        browserType: true,
        discountCode: true,
        selectedGateway: true,
        customerEmail: true,
      },
    });

    // Calculate metrics
    const metrics = this.calculateMetrics(sessions);

    // Generate funnel
    const funnel = this.generateFunnel(sessions);

    // Generate insights based on metrics
    const insights = this.analyzeAndGenerateInsights(metrics, sessions, page);

    // Calculate optimization score
    const score = this.calculateOptimizationScore(metrics, insights);

    return {
      pageId: page.id,
      pageName: page.name,
      period: `Last ${periodDays} days`,
      metrics,
      funnel,
      insights,
      score,
      generatedAt: new Date(),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Calculate Conversion Metrics
  // ─────────────────────────────────────────────────────────────

  private calculateMetrics(sessions: any[]): ConversionMetrics {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(
      (s) => s.status === PaymentSessionStatus.COMPLETED,
    ).length;

    const conversionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    const completedWithRevenue = sessions.filter(
      (s) => s.status === PaymentSessionStatus.COMPLETED && s.total,
    );

    const totalRevenue = completedWithRevenue.reduce((sum, s) => sum + (s.total || 0), 0);
    const averageOrderValue = completedWithRevenue.length > 0
      ? totalRevenue / completedWithRevenue.length
      : 0;

    const abandonedSessions = sessions.filter(
      (s) =>
        s.status === PaymentSessionStatus.ABANDONED ||
        s.status === PaymentSessionStatus.CANCELLED ||
        s.status === PaymentSessionStatus.EXPIRED,
    ).length;

    const abandonmentRate = totalSessions > 0 ? (abandonedSessions / totalSessions) * 100 : 0;

    // Calculate average time to complete
    const completedWithTimes = sessions.filter(
      (s) => s.status === PaymentSessionStatus.COMPLETED && s.completedAt,
    );

    let averageTimeToComplete = 0;
    if (completedWithTimes.length > 0) {
      const totalTime = completedWithTimes.reduce((sum, s) => {
        const created = new Date(s.createdAt).getTime();
        const completed = new Date(s.completedAt).getTime();
        return sum + (completed - created) / 1000;
      }, 0);
      averageTimeToComplete = totalTime / completedWithTimes.length;
    }

    return {
      totalSessions,
      completedSessions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      abandonmentRate: Math.round(abandonmentRate * 100) / 100,
      averageTimeToComplete: Math.round(averageTimeToComplete),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Generate Conversion Funnel
  // ─────────────────────────────────────────────────────────────

  private generateFunnel(sessions: any[]): ConversionFunnel[] {
    const total = sessions.length;
    if (total === 0) {
      return [];
    }

    // Count sessions at each stage
    const startedCheckout = total;
    const enteredInfo = sessions.filter((s) => s.customerEmail).length;
    const selectedPayment = sessions.filter((s) => s.selectedGateway).length;
    const completed = sessions.filter(
      (s) => s.status === PaymentSessionStatus.COMPLETED,
    ).length;

    const funnel: ConversionFunnel[] = [
      {
        stage: 'Started Checkout',
        count: startedCheckout,
        percentage: 100,
        dropOff: 0,
      },
      {
        stage: 'Entered Information',
        count: enteredInfo,
        percentage: Math.round((enteredInfo / total) * 100),
        dropOff: Math.round(((startedCheckout - enteredInfo) / startedCheckout) * 100),
      },
      {
        stage: 'Selected Payment',
        count: selectedPayment,
        percentage: Math.round((selectedPayment / total) * 100),
        dropOff: enteredInfo > 0 ? Math.round(((enteredInfo - selectedPayment) / enteredInfo) * 100) : 0,
      },
      {
        stage: 'Completed Purchase',
        count: completed,
        percentage: Math.round((completed / total) * 100),
        dropOff: selectedPayment > 0 ? Math.round(((selectedPayment - completed) / selectedPayment) * 100) : 0,
      },
    ];

    return funnel;
  }

  // ─────────────────────────────────────────────────────────────
  // Analyze Data and Generate Insights
  // ─────────────────────────────────────────────────────────────

  private analyzeAndGenerateInsights(
    metrics: ConversionMetrics,
    sessions: any[],
    page: { id: string; name: string },
  ): PageInsight[] {
    const insights: PageInsight[] = [];

    // Conversion Rate Analysis
    if (metrics.conversionRate < BENCHMARKS.conversionRate * 0.5) {
      insights.push({
        type: 'critical',
        category: 'conversion',
        title: 'Critically Low Conversion Rate',
        description: `Your conversion rate of ${metrics.conversionRate}% is significantly below the industry average of ${BENCHMARKS.conversionRate}%.`,
        impact: 'high',
        metric: {
          current: metrics.conversionRate,
          benchmark: BENCHMARKS.conversionRate,
          unit: '%',
        },
        recommendations: [
          'Review your checkout flow for friction points',
          'Add trust badges and security indicators',
          'Consider offering guest checkout',
          'Test different payment button colors and text',
        ],
      });
    } else if (metrics.conversionRate < BENCHMARKS.conversionRate) {
      insights.push({
        type: 'warning',
        category: 'conversion',
        title: 'Below Average Conversion Rate',
        description: `Your conversion rate of ${metrics.conversionRate}% is below the industry average.`,
        impact: 'medium',
        metric: {
          current: metrics.conversionRate,
          benchmark: BENCHMARKS.conversionRate,
          unit: '%',
        },
        recommendations: [
          'Simplify your checkout form',
          'Add progress indicators',
          'Show order summary throughout checkout',
        ],
      });
    } else if (metrics.conversionRate > BENCHMARKS.conversionRate * 1.5) {
      insights.push({
        type: 'success',
        category: 'conversion',
        title: 'Excellent Conversion Rate',
        description: `Your conversion rate of ${metrics.conversionRate}% is well above average!`,
        impact: 'high',
        metric: {
          current: metrics.conversionRate,
          benchmark: BENCHMARKS.conversionRate,
          unit: '%',
        },
        recommendations: [
          'Document what works for future reference',
          'Consider A/B testing to optimize further',
        ],
      });
    }

    // Abandonment Analysis
    if (metrics.abandonmentRate > BENCHMARKS.abandonmentRate) {
      insights.push({
        type: 'warning',
        category: 'abandonment',
        title: 'High Cart Abandonment',
        description: `${metrics.abandonmentRate}% of customers are abandoning checkout, higher than the ${BENCHMARKS.abandonmentRate}% industry average.`,
        impact: 'high',
        metric: {
          current: metrics.abandonmentRate,
          benchmark: BENCHMARKS.abandonmentRate,
          unit: '%',
        },
        recommendations: [
          'Implement abandoned cart email recovery',
          'Show pricing transparency early',
          'Reduce form fields to essentials',
          'Add exit-intent popups with offers',
        ],
      });
    }

    // Checkout Time Analysis
    if (metrics.averageTimeToComplete > BENCHMARKS.averageCheckoutTime * 2) {
      insights.push({
        type: 'warning',
        category: 'ux',
        title: 'Long Checkout Time',
        description: `Average checkout takes ${Math.round(metrics.averageTimeToComplete / 60)} minutes, which is longer than optimal.`,
        impact: 'medium',
        metric: {
          current: metrics.averageTimeToComplete,
          benchmark: BENCHMARKS.averageCheckoutTime,
          unit: 'seconds',
        },
        recommendations: [
          'Enable address autocomplete',
          'Pre-fill known customer data',
          'Reduce required form fields',
          'Add card scanning for mobile users',
        ],
      });
    }

    // Payment Method Analysis
    const gatewayUsage = this.analyzePaymentMethods(sessions);
    if (gatewayUsage.length > 0) {
      const topGateway = gatewayUsage[0];
      if (topGateway.completionRate < 50) {
        insights.push({
          type: 'suggestion',
          category: 'payment_methods',
          title: 'Payment Method Performance Issue',
          description: `The most used payment method (${topGateway.gateway}) has a low completion rate of ${topGateway.completionRate}%.`,
          impact: 'medium',
          recommendations: [
            'Review error handling for this payment method',
            'Consider offering alternative payment options',
            'Check if there are technical issues with the gateway',
          ],
        });
      }
    }

    // Mobile Analysis
    const mobileAnalysis = this.analyzeMobilePerformance(sessions);
    if (mobileAnalysis.mobileConversionRate < mobileAnalysis.desktopConversionRate * 0.5) {
      insights.push({
        type: 'warning',
        category: 'mobile',
        title: 'Poor Mobile Experience',
        description: `Mobile conversion (${mobileAnalysis.mobileConversionRate.toFixed(1)}%) is significantly lower than desktop (${mobileAnalysis.desktopConversionRate.toFixed(1)}%).`,
        impact: 'high',
        recommendations: [
          'Optimize form inputs for mobile keyboards',
          'Test checkout on various mobile devices',
          'Consider digital wallet options (Apple Pay, Google Pay)',
          'Ensure buttons are large enough for touch',
        ],
      });
    }

    // Low Traffic Warning
    if (metrics.totalSessions < 30) {
      insights.push({
        type: 'suggestion',
        category: 'performance',
        title: 'Limited Data Available',
        description: 'There is limited session data for accurate analysis. Insights will improve with more traffic.',
        impact: 'low',
        recommendations: [
          'Consider promoting your checkout page',
          'Check if your page is properly indexed',
          'Review traffic sources',
        ],
      });
    }

    // Promo Code Usage
    const promoAnalysis = this.analyzePromoCodeUsage(sessions);
    if (promoAnalysis.usageRate > 0 && promoAnalysis.conversionWithPromo > promoAnalysis.conversionWithoutPromo * 1.5) {
      insights.push({
        type: 'success',
        category: 'pricing',
        title: 'Effective Promo Codes',
        description: `Customers using promo codes convert at ${promoAnalysis.conversionWithPromo.toFixed(1)}% vs ${promoAnalysis.conversionWithoutPromo.toFixed(1)}% without.`,
        impact: 'medium',
        recommendations: [
          'Consider exit-intent promo code offers',
          'Test different discount levels',
          'Use promo codes in abandoned cart recovery',
        ],
      });
    }

    return insights.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Helper Analysis Methods
  // ─────────────────────────────────────────────────────────────

  private analyzePaymentMethods(sessions: any[]): Array<{
    gateway: string;
    count: number;
    completionRate: number;
  }> {
    const byGateway: Record<string, { total: number; completed: number }> = {};

    sessions.forEach((s) => {
      if (s.selectedGateway) {
        if (!byGateway[s.selectedGateway]) {
          byGateway[s.selectedGateway] = { total: 0, completed: 0 };
        }
        byGateway[s.selectedGateway].total++;
        if (s.status === PaymentSessionStatus.COMPLETED) {
          byGateway[s.selectedGateway].completed++;
        }
      }
    });

    return Object.entries(byGateway)
      .map(([gateway, data]) => ({
        gateway,
        count: data.total,
        completionRate: Math.round((data.completed / data.total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private analyzeMobilePerformance(sessions: any[]): {
    mobileConversionRate: number;
    desktopConversionRate: number;
  } {
    const mobile = sessions.filter((s) => s.deviceType === 'mobile');
    const desktop = sessions.filter((s) => s.deviceType === 'desktop');

    const mobileCompleted = mobile.filter(
      (s) => s.status === PaymentSessionStatus.COMPLETED,
    ).length;
    const desktopCompleted = desktop.filter(
      (s) => s.status === PaymentSessionStatus.COMPLETED,
    ).length;

    return {
      mobileConversionRate: mobile.length > 0 ? (mobileCompleted / mobile.length) * 100 : 0,
      desktopConversionRate: desktop.length > 0 ? (desktopCompleted / desktop.length) * 100 : 0,
    };
  }

  private analyzePromoCodeUsage(sessions: any[]): {
    usageRate: number;
    conversionWithPromo: number;
    conversionWithoutPromo: number;
  } {
    const withPromo = sessions.filter((s) => s.discountCode);
    const withoutPromo = sessions.filter((s) => !s.discountCode);

    const promoCompleted = withPromo.filter(
      (s) => s.status === PaymentSessionStatus.COMPLETED,
    ).length;
    const noPromoCompleted = withoutPromo.filter(
      (s) => s.status === PaymentSessionStatus.COMPLETED,
    ).length;

    return {
      usageRate: sessions.length > 0 ? (withPromo.length / sessions.length) * 100 : 0,
      conversionWithPromo: withPromo.length > 0 ? (promoCompleted / withPromo.length) * 100 : 0,
      conversionWithoutPromo: withoutPromo.length > 0 ? (noPromoCompleted / withoutPromo.length) * 100 : 0,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Calculate Optimization Score
  // ─────────────────────────────────────────────────────────────

  private calculateOptimizationScore(
    metrics: ConversionMetrics,
    insights: PageInsight[],
  ): number {
    let score = 50; // Start at neutral

    // Conversion rate impact (+/- up to 20 points)
    const conversionDelta = (metrics.conversionRate - BENCHMARKS.conversionRate) / BENCHMARKS.conversionRate;
    score += Math.max(-20, Math.min(20, conversionDelta * 40));

    // Abandonment rate impact (+/- up to 15 points)
    const abandonmentDelta = (BENCHMARKS.abandonmentRate - metrics.abandonmentRate) / BENCHMARKS.abandonmentRate;
    score += Math.max(-15, Math.min(15, abandonmentDelta * 30));

    // Checkout time impact (+/- up to 10 points)
    const timeDelta = (BENCHMARKS.averageCheckoutTime - metrics.averageTimeToComplete) / BENCHMARKS.averageCheckoutTime;
    score += Math.max(-10, Math.min(10, timeDelta * 20));

    // Deduct for critical issues
    const criticalCount = insights.filter((i) => i.type === 'critical').length;
    score -= criticalCount * 10;

    // Deduct for warnings
    const warningCount = insights.filter((i) => i.type === 'warning').length;
    score -= warningCount * 5;

    // Bonus for success insights
    const successCount = insights.filter((i) => i.type === 'success').length;
    score += successCount * 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // ─────────────────────────────────────────────────────────────
  // Get Company-wide Insights Summary
  // ─────────────────────────────────────────────────────────────

  async getCompanyInsights(
    companyId: string,
    periodDays: number = 30,
  ): Promise<{
    totalPages: number;
    averageScore: number;
    topPerformer: { pageId: string; pageName: string; score: number } | null;
    needsAttention: { pageId: string; pageName: string; score: number }[];
    totalRevenue: number;
    totalConversions: number;
    overallConversionRate: number;
  }> {
    const pages = await this.prisma.paymentPage.findMany({
      where: { companyId },
      select: { id: true, name: true },
    });

    if (pages.length === 0) {
      return {
        totalPages: 0,
        averageScore: 0,
        topPerformer: null,
        needsAttention: [],
        totalRevenue: 0,
        totalConversions: 0,
        overallConversionRate: 0,
      };
    }

    const pageInsights: Array<{ pageId: string; pageName: string; score: number; metrics: ConversionMetrics }> = [];

    for (const page of pages) {
      try {
        const summary = await this.generateInsights(page.id, periodDays);
        pageInsights.push({
          pageId: page.id,
          pageName: page.name,
          score: summary.score,
          metrics: summary.metrics,
        });
      } catch (err) {
        this.logger.warn(`Failed to generate insights for page ${page.id}`, err);
      }
    }

    const totalRevenue = pageInsights.reduce((sum, p) => sum + p.metrics.totalRevenue, 0);
    const totalConversions = pageInsights.reduce((sum, p) => sum + p.metrics.completedSessions, 0);
    const totalSessions = pageInsights.reduce((sum, p) => sum + p.metrics.totalSessions, 0);

    const sortedByScore = [...pageInsights].sort((a, b) => b.score - a.score);

    return {
      totalPages: pages.length,
      averageScore: pageInsights.length > 0
        ? Math.round(pageInsights.reduce((sum, p) => sum + p.score, 0) / pageInsights.length)
        : 0,
      topPerformer: sortedByScore[0] || null,
      needsAttention: sortedByScore.filter((p) => p.score < 50).slice(0, 3),
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalConversions,
      overallConversionRate: totalSessions > 0
        ? Math.round((totalConversions / totalSessions) * 10000) / 100
        : 0,
    };
  }
}
