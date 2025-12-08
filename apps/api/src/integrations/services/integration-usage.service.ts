import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UsageStats {
  totalRequests: number;
  totalBaseCost: number;
  totalBillableCost: number;
  currency: string;
  billingPeriod: string;
}

export interface ProviderUsage {
  provider: string;
  requestCount: number;
  baseCost: number;
  billableCost: number;
  usageTypes: Record<string, number>;
}

export interface UsageSummary {
  currentMonth: UsageStats;
  lastMonth: UsageStats;
  byProvider: ProviderUsage[];
  topEndpoints: Array<{ endpoint: string; count: number }>;
}

export interface MonthlyUsage {
  period: string;
  requestCount: number;
  billableCost: number;
}

@Injectable()
export class IntegrationUsageService {
  private readonly logger = new Logger(IntegrationUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get usage statistics for a specific billing period
   */
  async getUsageStats(companyId: string, billingPeriod?: string): Promise<UsageStats> {
    const period = billingPeriod || new Date().toISOString().slice(0, 7);

    const usage = await this.prisma.integrationUsage.findMany({
      where: {
        companyId,
        billingPeriod: period,
      },
    });

    const totalRequests = usage.reduce((sum, u) => sum + u.requestCount, 0);
    const totalBaseCost = usage.reduce((sum, u) => sum + u.baseCostCents, 0);
    const totalBillableCost = usage.reduce((sum, u) => sum + u.billableCents, 0);

    return {
      totalRequests,
      totalBaseCost: Math.round(totalBaseCost) / 100, // Convert to dollars
      totalBillableCost: Math.round(totalBillableCost) / 100,
      currency: 'USD',
      billingPeriod: period,
    };
  }

  /**
   * Get comprehensive usage summary including comparisons
   */
  async getUsageSummary(companyId: string, billingPeriod?: string): Promise<UsageSummary> {
    const currentPeriod = billingPeriod || new Date().toISOString().slice(0, 7);

    // Calculate last month
    const currentDate = new Date(currentPeriod + '-01');
    currentDate.setMonth(currentDate.getMonth() - 1);
    const lastPeriod = currentDate.toISOString().slice(0, 7);

    // Get current and last month stats
    const [currentMonth, lastMonth, byProvider, topEndpoints] = await Promise.all([
      this.getUsageStats(companyId, currentPeriod),
      this.getUsageStats(companyId, lastPeriod),
      this.getUsageByProvider(companyId, currentPeriod),
      this.getTopEndpoints(companyId, currentPeriod),
    ]);

    return {
      currentMonth,
      lastMonth,
      byProvider,
      topEndpoints,
    };
  }

  /**
   * Get usage broken down by provider
   */
  async getUsageByProvider(companyId: string, billingPeriod?: string): Promise<ProviderUsage[]> {
    const period = billingPeriod || new Date().toISOString().slice(0, 7);

    const usage = await this.prisma.integrationUsage.findMany({
      where: {
        companyId,
        billingPeriod: period,
      },
    });

    // Group by provider
    const byProvider = new Map<string, ProviderUsage>();

    for (const u of usage) {
      const existing = byProvider.get(u.provider) || {
        provider: u.provider,
        requestCount: 0,
        baseCost: 0,
        billableCost: 0,
        usageTypes: {},
      };

      existing.requestCount += u.requestCount;
      existing.baseCost += u.baseCostCents;
      existing.billableCost += u.billableCents;
      existing.usageTypes[u.usageType] = (existing.usageTypes[u.usageType] || 0) + u.requestCount;

      byProvider.set(u.provider, existing);
    }

    // Convert to array and format costs
    return Array.from(byProvider.values()).map((p) => ({
      ...p,
      baseCost: Math.round(p.baseCost) / 100,
      billableCost: Math.round(p.billableCost) / 100,
    }));
  }

  /**
   * Get top endpoints by request count
   */
  async getTopEndpoints(
    companyId: string,
    billingPeriod?: string,
    limit = 10,
  ): Promise<Array<{ endpoint: string; count: number }>> {
    const period = billingPeriod || new Date().toISOString().slice(0, 7);

    const usage = await this.prisma.integrationUsage.findMany({
      where: {
        companyId,
        billingPeriod: period,
        endpoint: { not: null },
      },
    });

    // Group by endpoint
    const byEndpoint = new Map<string, number>();
    for (const u of usage) {
      if (u.endpoint) {
        byEndpoint.set(u.endpoint, (byEndpoint.get(u.endpoint) || 0) + u.requestCount);
      }
    }

    // Sort and limit
    return Array.from(byEndpoint.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get historical usage for charts
   * Optimized: Single query for all months to avoid N+1 problem
   */
  async getUsageHistory(companyId: string, months = 6): Promise<MonthlyUsage[]> {
    const now = new Date();
    const periods: string[] = [];

    // Generate list of periods
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(date.toISOString().slice(0, 7));
    }

    // Single query for all periods
    const usage = await this.prisma.integrationUsage.findMany({
      where: {
        companyId,
        billingPeriod: { in: periods },
      },
    });

    // Group by period
    const byPeriod = new Map<string, { requestCount: number; billableCost: number }>();

    // Initialize all periods
    for (const period of periods) {
      byPeriod.set(period, { requestCount: 0, billableCost: 0 });
    }

    // Aggregate usage data
    for (const u of usage) {
      const existing = byPeriod.get(u.billingPeriod);
      if (existing) {
        existing.requestCount += u.requestCount;
        existing.billableCost += u.billableCents;
      }
    }

    // Convert to array in chronological order
    return periods.map((period) => {
      const data = byPeriod.get(period)!;
      return {
        period,
        requestCount: data.requestCount,
        billableCost: Math.round(data.billableCost) / 100,
      };
    });
  }
}
