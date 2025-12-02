import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaginationService, CursorPaginatedResponse } from '../common/pagination';
import {
  Subscription,
  SubscriptionStatus,
  BillingInterval,
  SubscriptionQueryParams,
  SubscriptionStats,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  PauseSubscriptionDto,
  CancelSubscriptionDto,
} from './subscription.types';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly paginationService: PaginationService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find all subscriptions with filtering and pagination
   * Optimized for large datasets with cursor-based pagination
   */
  async findAll(
    companyId: string | undefined,
    query: SubscriptionQueryParams,
  ): Promise<{ subscriptions: Subscription[]; total: number }> {
    const where = this.buildWhereClause(companyId, query);

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: { orders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.offset || 0,
        take: query.limit || 50,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      subscriptions: subscriptions.map((s) => this.mapToSubscription(s)),
      total,
    };
  }

  /**
   * Cursor-based pagination for large datasets
   * Scales efficiently regardless of page number
   */
  async findAllWithCursor(
    companyId: string | undefined,
    query: SubscriptionQueryParams,
  ): Promise<CursorPaginatedResponse<Subscription>> {
    const baseWhere = this.buildWhereClause(companyId, query);

    const { limit, cursorWhere, orderBy } = this.paginationService.parseCursor(
      { cursor: query.cursor, limit: query.limit },
      'createdAt',
      'desc',
    );

    // Merge base filters with cursor WHERE clause
    const where = cursorWhere
      ? { AND: [baseWhere, cursorWhere] }
      : baseWhere;

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { orders: true },
        },
      },
      orderBy,
      take: limit + 1, // Fetch extra to detect hasMore
    });

    // Get estimated total for UI (cached or sampled for very large datasets)
    const estimatedTotal = await this.prisma.subscription.count({ where: baseWhere });

    return this.paginationService.createResponse(
      subscriptions.map((s) => this.mapToSubscription(s)),
      limit,
      { cursor: query.cursor, limit: query.limit },
      'createdAt',
      estimatedTotal,
    );
  }

  /**
   * Find a single subscription by ID
   */
  async findById(id: string): Promise<Subscription> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${id} not found`);
    }

    return this.mapToSubscription(subscription);
  }

  /**
   * Find by ID without tenant filtering (for access validation)
   */
  async findByIdUnscoped(id: string): Promise<Subscription | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!subscription) {
      return null;
    }

    return this.mapToSubscription(subscription);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get subscription statistics with efficient aggregation
   * Uses groupBy for O(1) performance regardless of dataset size
   */
  async getStats(
    companyId: string | undefined,
    startDate?: string,
    endDate?: string,
  ): Promise<SubscriptionStats> {
    const baseWhere: any = {
      deletedAt: null,
    };

    if (companyId) {
      baseWhere.companyId = companyId;
    }

    if (startDate || endDate) {
      baseWhere.createdAt = {};
      if (startDate) baseWhere.createdAt.gte = new Date(startDate);
      if (endDate) baseWhere.createdAt.lte = new Date(endDate);
    }

    // Status counts using groupBy (efficient for large datasets)
    const statusCounts = await this.prisma.subscription.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { _all: true },
    });

    // Interval breakdown with revenue
    const intervalBreakdown = await this.prisma.subscription.groupBy({
      by: ['interval'],
      where: { ...baseWhere, status: 'ACTIVE' },
      _count: { _all: true },
      _sum: { planAmount: true },
    });

    // Upcoming renewals (this week)
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [renewingThisWeek, renewingThisMonth] = await Promise.all([
      this.prisma.subscription.count({
        where: {
          ...baseWhere,
          status: 'ACTIVE',
          nextBillingDate: {
            gte: now,
            lte: weekFromNow,
          },
        },
      }),
      this.prisma.subscription.count({
        where: {
          ...baseWhere,
          status: 'ACTIVE',
          nextBillingDate: {
            gte: now,
            lte: monthFromNow,
          },
        },
      }),
    ]);

    // Calculate totals from status counts
    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {} as Record<string, number>);

    const totalSubscriptions = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const activeSubscriptions = statusMap['ACTIVE'] || 0;

    // Calculate MRR from active subscriptions
    const mrrResult = await this.prisma.subscription.aggregate({
      where: { ...baseWhere, status: 'ACTIVE' },
      _sum: { planAmount: true },
      _avg: { planAmount: true },
    });

    const monthlyRecurringRevenue = Number(mrrResult._sum.planAmount || 0);
    const averageSubscriptionValue = Number(mrrResult._avg.planAmount || 0);

    return {
      totalSubscriptions,
      activeSubscriptions,
      pausedSubscriptions: statusMap['PAUSED'] || 0,
      canceledSubscriptions: statusMap['CANCELED'] || 0,
      pastDueSubscriptions: statusMap['PAST_DUE'] || 0,
      expiredSubscriptions: statusMap['EXPIRED'] || 0,
      monthlyRecurringRevenue,
      averageSubscriptionValue,
      byInterval: intervalBreakdown.map((item) => ({
        interval: item.interval as BillingInterval,
        count: item._count._all,
        revenue: Number(item._sum.planAmount || 0),
      })),
      renewingThisWeek,
      renewingThisMonth,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new subscription
   */
  async create(dto: CreateSubscriptionDto): Promise<Subscription> {
    const now = new Date();

    // Calculate billing dates if not provided
    const currentPeriodStart = dto.currentPeriodStart || now;
    const currentPeriodEnd = dto.currentPeriodEnd || this.calculatePeriodEnd(currentPeriodStart, dto.interval);
    const nextBillingDate = dto.nextBillingDate || currentPeriodEnd;

    // Calculate trial dates
    let trialStart: Date | null = null;
    let trialEnd: Date | null = null;
    if (dto.trialDays && dto.trialDays > 0) {
      trialStart = now;
      trialEnd = new Date(now.getTime() + dto.trialDays * 24 * 60 * 60 * 1000);
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        companyId: dto.companyId,
        customerId: dto.customerId,
        planName: dto.planName,
        planAmount: dto.planAmount,
        currency: dto.currency || 'USD',
        interval: dto.interval,
        currentPeriodStart,
        currentPeriodEnd,
        nextBillingDate,
        trialStart,
        trialEnd,
        shippingAddressId: dto.shippingAddressId,
        shippingPreferences: dto.shippingPreferences || {},
        metadata: dto.metadata || {},
        status: trialStart ? 'ACTIVE' : 'ACTIVE', // Could add TRIALING status
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    this.logger.log(`Created subscription ${subscription.id} for customer ${dto.customerId}`);
    this.eventEmitter.emit('subscription.created', { subscription });

    return this.mapToSubscription(subscription);
  }

  /**
   * Update a subscription
   */
  async update(id: string, dto: UpdateSubscriptionDto): Promise<Subscription> {
    const existing = await this.findById(id);

    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    this.logger.log(`Updated subscription ${id}`);
    this.eventEmitter.emit('subscription.updated', { subscription, previousData: existing });

    return this.mapToSubscription(subscription);
  }

  /**
   * Pause a subscription
   */
  async pause(id: string, dto: PauseSubscriptionDto): Promise<Subscription> {
    const existing = await this.findById(id);

    if (existing.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be paused');
    }

    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
        pauseResumeAt: dto.resumeAt || null,
        metadata: {
          ...(existing.metadata || {}),
          pauseReason: dto.reason,
        },
        updatedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    this.logger.log(`Paused subscription ${id}`);
    this.eventEmitter.emit('subscription.paused', { subscription, reason: dto.reason });

    return this.mapToSubscription(subscription);
  }

  /**
   * Resume a paused subscription
   */
  async resume(id: string): Promise<Subscription> {
    const existing = await this.findById(id);

    if (existing.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestException('Only paused subscriptions can be resumed');
    }

    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        pausedAt: null,
        pauseResumeAt: null,
        updatedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    this.logger.log(`Resumed subscription ${id}`);
    this.eventEmitter.emit('subscription.resumed', { subscription });

    return this.mapToSubscription(subscription);
  }

  /**
   * Cancel a subscription
   */
  async cancel(id: string, dto: CancelSubscriptionDto): Promise<Subscription> {
    const existing = await this.findById(id);

    if (existing.status === SubscriptionStatus.CANCELED) {
      throw new BadRequestException('Subscription is already canceled');
    }

    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        cancelReason: dto.reason,
        updatedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    this.logger.log(`Canceled subscription ${id}: ${dto.reason}`);
    this.eventEmitter.emit('subscription.canceled', { subscription, reason: dto.reason });

    return this.mapToSubscription(subscription);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Build WHERE clause from query parameters
   */
  private buildWhereClause(
    companyId: string | undefined,
    query: SubscriptionQueryParams,
  ): any {
    const where: any = {
      deletedAt: null,
    };

    // Tenant filtering
    if (companyId) {
      where.companyId = companyId;
    }

    // Status filter
    if (query.status) {
      where.status = query.status;
    }

    // Interval filter
    if (query.interval) {
      where.interval = query.interval;
    }

    // Customer filter
    if (query.customerId) {
      where.customerId = query.customerId;
    }

    // Date range filter (created date)
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    // Next billing date filters
    if (query.billingBefore || query.billingAfter) {
      where.nextBillingDate = {};
      if (query.billingBefore) {
        where.nextBillingDate.lte = new Date(query.billingBefore);
      }
      if (query.billingAfter) {
        where.nextBillingDate.gte = new Date(query.billingAfter);
      }
    }

    // Search filter (plan name, customer email/name)
    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      where.OR = [
        { planName: { contains: searchTerm, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { email: { contains: searchTerm, mode: 'insensitive' } },
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    return where;
  }

  /**
   * Calculate period end date based on interval
   */
  private calculatePeriodEnd(start: Date, interval: BillingInterval): Date {
    const end = new Date(start);

    switch (interval) {
      case BillingInterval.WEEKLY:
        end.setDate(end.getDate() + 7);
        break;
      case BillingInterval.BIWEEKLY:
        end.setDate(end.getDate() + 14);
        break;
      case BillingInterval.MONTHLY:
        end.setMonth(end.getMonth() + 1);
        break;
      case BillingInterval.QUARTERLY:
        end.setMonth(end.getMonth() + 3);
        break;
      case BillingInterval.YEARLY:
        end.setFullYear(end.getFullYear() + 1);
        break;
      case BillingInterval.DAILY:
        end.setDate(end.getDate() + 1);
        break;
      default:
        end.setMonth(end.getMonth() + 1); // Default to monthly
    }

    return end;
  }

  /**
   * Map Prisma model to Subscription interface
   */
  private mapToSubscription(data: any): Subscription {
    return {
      id: data.id,
      companyId: data.companyId,
      customerId: data.customerId,
      planName: data.planName,
      planAmount: Number(data.planAmount),
      currency: data.currency,
      interval: data.interval as BillingInterval,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      nextBillingDate: data.nextBillingDate,
      trialStart: data.trialStart,
      trialEnd: data.trialEnd,
      shippingAddressId: data.shippingAddressId,
      shippingPreferences: data.shippingPreferences || {},
      status: data.status as SubscriptionStatus,
      canceledAt: data.canceledAt,
      cancelReason: data.cancelReason,
      pausedAt: data.pausedAt,
      pauseResumeAt: data.pauseResumeAt,
      metadata: data.metadata || {},
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      customer: data.customer,
      ordersCount: data._count?.orders,
    };
  }
}
