import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyService, UserContext } from '../hierarchy/hierarchy.service';

export interface TransactionFilters {
  companyId?: string;
  clientId?: string;
  status?: string;
  type?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  async getTransactions(user: UserContext, filters: TransactionFilters = {}) {
    let companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    // Apply company filter
    if (filters.companyId && companyIds.includes(filters.companyId)) {
      companyIds = [filters.companyId];
    }

    // Apply client filter (for org users)
    if (filters.clientId && user.scopeType === 'ORGANIZATION') {
      const clientCompanies = await this.prisma.company.findMany({
        where: { clientId: filters.clientId, status: 'ACTIVE' },
        select: { id: true },
      });
      companyIds = clientCompanies.map(c => c.id).filter(id => companyIds.includes(id));
    }

    const where: any = {
      companyId: { in: companyIds },
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    if (filters.search) {
      where.OR = [
        { transactionNumber: { contains: filters.search, mode: 'insensitive' } },
        { customer: { email: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
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
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }

  async getTransaction(user: UserContext, transactionId: string) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        companyId: { in: companyIds },
      },
      include: {
        customer: true,
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
        subscription: {
          select: {
            id: true,
            status: true,
            planName: true,
          },
        },
      },
    });

    return transaction;
  }

  async getTransactionStats(user: UserContext, filters: { companyId?: string; clientId?: string } = {}) {
    let companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    if (filters.companyId && companyIds.includes(filters.companyId)) {
      companyIds = [filters.companyId];
    }

    if (filters.clientId && user.scopeType === 'ORGANIZATION') {
      const clientCompanies = await this.prisma.company.findMany({
        where: { clientId: filters.clientId, status: 'ACTIVE' },
        select: { id: true },
      });
      companyIds = clientCompanies.map(c => c.id).filter(id => companyIds.includes(id));
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, thisWeek, thisMonth, byStatus] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          companyId: { in: companyIds },
          createdAt: { gte: startOfDay },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          companyId: { in: companyIds },
          createdAt: { gte: startOfWeek },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          companyId: { in: companyIds },
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['status'],
        where: {
          companyId: { in: companyIds },
          createdAt: { gte: startOfMonth },
        },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    return {
      today: {
        count: today._count.id,
        volume: today._sum.amount?.toNumber() || 0,
      },
      thisWeek: {
        count: thisWeek._count.id,
        volume: thisWeek._sum.amount?.toNumber() || 0,
      },
      thisMonth: {
        count: thisMonth._count.id,
        volume: thisMonth._sum.amount?.toNumber() || 0,
      },
      byStatus: byStatus.map(s => ({
        status: s.status,
        count: s._count.id,
        volume: s._sum.amount?.toNumber() || 0,
      })),
    };
  }
}
