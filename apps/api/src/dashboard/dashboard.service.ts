import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { ScopeType } from '@prisma/client';

interface UserContext {
  sub: string;
  scopeType: ScopeType;
  scopeId: string;
  clientId?: string;
  companyId?: string;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  async getMetrics(user: UserContext, filters?: { companyId?: string; clientId?: string }) {
    // Get accessible company IDs
    let companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    // Apply additional filters
    if (filters?.companyId && companyIds.includes(filters.companyId)) {
      companyIds = [filters.companyId];
    } else if (filters?.clientId && user.scopeType === 'ORGANIZATION') {
      // Filter to specific client's companies
      const clientCompanies = await this.prisma.company.findMany({
        where: { clientId: filters.clientId, status: 'ACTIVE' },
        select: { id: true },
      });
      companyIds = clientCompanies.map(c => c.id).filter(id => companyIds.includes(id));
    }

    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Aggregate transactions for current month
    const currentMonthStats = await this.prisma.transaction.aggregate({
      where: {
        companyId: { in: companyIds },
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Aggregate transactions for last month (for comparison)
    const lastMonthStats = await this.prisma.transaction.aggregate({
      where: {
        companyId: { in: companyIds },
        status: 'COMPLETED',
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Count active subscriptions
    const activeSubscriptions = await this.prisma.subscription.count({
      where: {
        companyId: { in: companyIds },
        status: 'ACTIVE',
      },
    });

    // Count failed transactions
    const failedTransactions = await this.prisma.transaction.count({
      where: {
        companyId: { in: companyIds },
        status: 'FAILED',
        createdAt: { gte: startOfMonth },
      },
    });

    // Calculate changes
    const currentRevenue = currentMonthStats._sum.amount?.toNumber() || 0;
    const lastRevenue = lastMonthStats._sum.amount?.toNumber() || 0;
    const revenueChange = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    const currentCount = currentMonthStats._count.id || 0;
    const lastCount = lastMonthStats._count.id || 0;
    const countChange = lastCount > 0 ? ((currentCount - lastCount) / lastCount) * 100 : 0;

    return {
      revenue: {
        total: currentRevenue,
        change: revenueChange,
        period: 'this_month',
      },
      transactions: {
        total: currentCount,
        change: countChange,
        successful: currentCount,
        failed: failedTransactions,
      },
      subscriptions: {
        active: activeSubscriptions,
        change: 0, // Would need historical data
        churnRate: 0,
      },
      customers: {
        total: 0, // Add customer count
        change: 0,
        active: 0,
      },
    };
  }

  async getProviderMetrics(user: UserContext, filters?: { companyId?: string }) {
    let companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    if (filters?.companyId && companyIds.includes(filters.companyId)) {
      companyIds = [filters.companyId];
    }

    const providers = await this.prisma.paymentProvider.findMany({
      where: {
        companyId: { in: companyIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        type: true,
        companyId: true,
      },
    });

    // Get transaction stats per provider
    const providerMetrics = await Promise.all(
      providers.map(async (provider) => {
        const stats = await this.prisma.transaction.aggregate({
          where: {
            paymentProviderId: provider.id,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
          _sum: { amount: true },
          _count: { id: true },
        });

        const successCount = await this.prisma.transaction.count({
          where: {
            paymentProviderId: provider.id,
            status: 'COMPLETED',
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        });

        const totalCount = stats._count.id || 1;
        const successRate = (successCount / totalCount) * 100;

        return {
          providerId: provider.id,
          providerName: provider.name,
          providerType: provider.type,
          status: successRate > 98 ? 'healthy' : successRate > 95 ? 'degraded' : 'down',
          volume: stats._sum.amount?.toNumber() || 0,
          transactionCount: stats._count.id || 0,
          successRate,
          averageFee: 0, // Would need fee tracking
        };
      })
    );

    return providerMetrics;
  }

  async getRecentTransactions(user: UserContext, filters?: { companyId?: string; limit?: number }) {
    let companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    if (filters?.companyId && companyIds.includes(filters.companyId)) {
      companyIds = [filters.companyId];
    }

    return this.prisma.transaction.findMany({
      where: {
        companyId: { in: companyIds },
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        paymentProvider: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 10,
    });
  }
}
