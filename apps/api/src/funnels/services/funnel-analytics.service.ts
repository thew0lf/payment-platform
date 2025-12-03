import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface FunnelAnalytics {
  overview: {
    totalVisits: number;
    totalSessions: number;
    completedSessions: number;
    conversionRate: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
  stagePerformance: Array<{
    stageId: string;
    stageName: string;
    stageOrder: number;
    visits: number;
    completions: number;
    dropoffRate: number;
  }>;
  variantPerformance: Array<{
    variantId: string;
    variantName: string;
    isControl: boolean;
    sessions: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
  }>;
  dailyMetrics: Array<{
    date: string;
    visits: number;
    sessions: number;
    conversions: number;
    revenue: number;
  }>;
  trafficSources: Array<{
    source: string;
    visits: number;
    conversions: number;
    revenue: number;
  }>;
}

@Injectable()
export class FunnelAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAnalytics(funnelId: string, companyId?: string, days = 30): Promise<FunnelAnalytics> {
    // Verify funnel exists and belongs to company
    const funnel = await this.prisma.funnel.findUnique({
      where: { id: funnelId },
      include: {
        stages: { orderBy: { order: 'asc' } },
        variants: true,
      },
    });

    if (!funnel) {
      throw new NotFoundException(`Funnel with ID "${funnelId}" not found`);
    }

    if (companyId && funnel.companyId !== companyId) {
      throw new NotFoundException(`Funnel with ID "${funnelId}" not found`);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get session stats
    const sessions = await this.prisma.funnelSession.findMany({
      where: {
        funnelId,
        startedAt: { gte: startDate },
      },
      include: {
        variant: true,
      },
    });

    // Calculate overview metrics
    const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');
    const totalRevenue = completedSessions.reduce((sum, s) => sum + (s.totalAmount?.toNumber() || 0), 0);

    const overview = {
      totalVisits: funnel.totalVisits,
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      conversionRate: sessions.length > 0 ? (completedSessions.length / sessions.length) * 100 : 0,
      totalRevenue,
      averageOrderValue: completedSessions.length > 0 ? totalRevenue / completedSessions.length : 0,
    };

    // Calculate stage performance
    const stagePerformance = funnel.stages.map((stage, index) => {
      const stageVisits = sessions.filter((s) => s.currentStageOrder >= stage.order).length;
      const stageCompletions = sessions.filter((s) => s.currentStageOrder > stage.order || s.status === 'COMPLETED')
        .length;

      const nextStage = funnel.stages[index + 1];
      const dropoffRate = stageVisits > 0 && nextStage ? ((stageVisits - stageCompletions) / stageVisits) * 100 : 0;

      return {
        stageId: stage.id,
        stageName: stage.name,
        stageOrder: stage.order,
        visits: stageVisits,
        completions: stageCompletions,
        dropoffRate,
      };
    });

    // Calculate variant performance
    const variantPerformance = funnel.variants.map((variant) => {
      const variantSessions = sessions.filter((s) => s.variantId === variant.id);
      const variantConversions = variantSessions.filter((s) => s.status === 'COMPLETED');
      const variantRevenue = variantConversions.reduce((sum, s) => sum + (s.totalAmount?.toNumber() || 0), 0);

      return {
        variantId: variant.id,
        variantName: variant.name,
        isControl: variant.isControl,
        sessions: variantSessions.length,
        conversions: variantConversions.length,
        conversionRate: variantSessions.length > 0 ? (variantConversions.length / variantSessions.length) * 100 : 0,
        revenue: variantRevenue,
      };
    });

    // Calculate daily metrics
    const dailyMap = new Map<string, { visits: number; sessions: number; conversions: number; revenue: number }>();

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap.set(dateStr, { visits: 0, sessions: 0, conversions: 0, revenue: 0 });
    }

    sessions.forEach((session) => {
      const dateStr = session.startedAt.toISOString().split('T')[0];
      const entry = dailyMap.get(dateStr);
      if (entry) {
        entry.sessions++;
        if (session.status === 'COMPLETED') {
          entry.conversions++;
          entry.revenue += session.totalAmount?.toNumber() || 0;
        }
      }
    });

    const dailyMetrics = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        visits: data.sessions, // Approximate visits as sessions for now
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate traffic sources
    const sourceMap = new Map<string, { visits: number; conversions: number; revenue: number }>();

    sessions.forEach((session) => {
      const source = session.utmSource || 'direct';

      if (!sourceMap.has(source)) {
        sourceMap.set(source, { visits: 0, conversions: 0, revenue: 0 });
      }

      const entry = sourceMap.get(source)!;
      entry.visits++;
      if (session.status === 'COMPLETED') {
        entry.conversions++;
        entry.revenue += session.totalAmount?.toNumber() || 0;
      }
    });

    const trafficSources = Array.from(sourceMap.entries())
      .map(([source, data]) => ({ source, ...data }))
      .sort((a, b) => b.visits - a.visits);

    return {
      overview,
      stagePerformance,
      variantPerformance,
      dailyMetrics,
      trafficSources,
    };
  }

  async getCompanyFunnelStats(companyId: string) {
    const [funnels, sessions] = await Promise.all([
      this.prisma.funnel.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          slug: true,
          shortId: true,
          status: true,
          totalVisits: true,
          totalConversions: true,
        },
      }),
      this.prisma.funnelSession.groupBy({
        by: ['funnelId', 'status'],
        where: {
          funnel: { companyId },
        },
        _count: true,
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    // Combine funnel data with session stats
    const sessionsByFunnel = sessions.reduce(
      (acc, s) => {
        if (!acc[s.funnelId]) {
          acc[s.funnelId] = { total: 0, completed: 0, revenue: 0 };
        }
        acc[s.funnelId].total += s._count;
        if (s.status === 'COMPLETED') {
          acc[s.funnelId].completed += s._count;
          acc[s.funnelId].revenue += s._sum.totalAmount?.toNumber() || 0;
        }
        return acc;
      },
      {} as Record<string, { total: number; completed: number; revenue: number }>
    );

    return funnels.map((funnel) => ({
      ...funnel,
      seoUrl: `${funnel.slug}-${funnel.shortId}`,
      sessions: sessionsByFunnel[funnel.id]?.total || 0,
      conversions: sessionsByFunnel[funnel.id]?.completed || 0,
      revenue: sessionsByFunnel[funnel.id]?.revenue || 0,
      conversionRate: sessionsByFunnel[funnel.id]
        ? ((sessionsByFunnel[funnel.id].completed / sessionsByFunnel[funnel.id].total) * 100).toFixed(2)
        : '0.00',
    }));
  }
}
