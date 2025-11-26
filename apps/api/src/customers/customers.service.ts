import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HierarchyService, UserContext } from '../hierarchy/hierarchy.service';

export interface CustomerFilters {
  companyId?: string;
  clientId?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  async getCustomers(user: UserContext, filters: CustomerFilters = {}) {
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

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              transactions: true,
              subscriptions: true,
              paymentVaults: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      customers,
      total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }

  async getCustomer(user: UserContext, customerId: string) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId: { in: companyIds },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            transactionNumber: true,
            type: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true,
          },
        },
        subscriptions: {
          select: {
            id: true,
            planName: true,
            status: true,
            planAmount: true,
            currency: true,
            interval: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
          },
        },
        paymentVaults: {
          where: { isActive: true },
          select: {
            id: true,
            type: true,
            last4: true,
            expMonth: true,
            expYear: true,
            isDefault: true,
          },
        },
        _count: {
          select: {
            transactions: true,
            subscriptions: true,
            paymentVaults: true,
          },
        },
      },
    });

    return customer;
  }

  async getCustomerStats(user: UserContext, filters: { companyId?: string; clientId?: string } = {}) {
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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [total, active, newThisMonth, newLastMonth] = await Promise.all([
      this.prisma.customer.count({
        where: { companyId: { in: companyIds } },
      }),
      this.prisma.customer.count({
        where: { companyId: { in: companyIds }, status: 'ACTIVE' },
      }),
      this.prisma.customer.count({
        where: {
          companyId: { in: companyIds },
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.customer.count({
        where: {
          companyId: { in: companyIds },
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
    ]);

    const growthRate = newLastMonth > 0 ? ((newThisMonth - newLastMonth) / newLastMonth) * 100 : 0;

    return {
      total,
      active,
      inactive: total - active,
      newThisMonth,
      growthRate: Math.round(growthRate * 10) / 10,
    };
  }
}
