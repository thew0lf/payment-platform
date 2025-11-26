import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';
import {
  UsageEventType,
  RecordUsageEventDto,
  UsageSummary,
  CompanyUsage,
  UsagePeriodStatus,
} from '../types/billing.types';
import { PricingPlanService } from './pricing-plan.service';

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: PricingPlanService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // RECORD USAGE EVENTS
  // ═══════════════════════════════════════════════════════════════

  async recordEvent(clientId: string, dto: RecordUsageEventDto): Promise<void> {
    const period = await this.getActiveUsagePeriod(clientId);

    // Create event
    await this.prisma.usageEvent.create({
      data: {
        usagePeriodId: period.id,
        companyId: dto.companyId,
        eventType: dto.eventType,
        quantity: dto.quantity ?? 1,
        unitCost: dto.unitAmount ?? 0,
        totalCost: (dto.quantity ?? 1) * (dto.unitAmount ?? 0),
        referenceType: dto.resourceType,
        referenceId: dto.resourceId,
        metadata: (dto.metadata || null) as any,
        occurredAt: new Date(),
      },
    });

    // Update aggregates
    await this.updateUsageAggregates(period.id, dto.eventType, dto.quantity ?? 1, dto.unitAmount);
  }

  @OnEvent('transaction.processed')
  async handleTransactionProcessed(payload: {
    clientId: string;
    companyId: string;
    amount: number;
    success: boolean;
  }): Promise<void> {
    await this.recordEvent(payload.clientId, {
      companyId: payload.companyId,
      eventType: payload.success
        ? UsageEventType.TRANSACTION_APPROVED
        : UsageEventType.TRANSACTION_DECLINED,
      quantity: 1,
      unitAmount: payload.amount,
    });
  }

  @OnEvent('api.call')
  async handleApiCall(payload: { clientId: string; companyId: string }): Promise<void> {
    await this.recordEvent(payload.clientId, {
      companyId: payload.companyId,
      eventType: UsageEventType.API_CALL,
      quantity: 1,
    });
  }

  private async updateUsageAggregates(
    periodId: string,
    eventType: UsageEventType,
    quantity: number,
    amount?: number,
  ): Promise<void> {
    const updates: any = {};

    switch (eventType) {
      case UsageEventType.TRANSACTION_APPROVED:
      case UsageEventType.TRANSACTION_DECLINED:
        updates.transactionCount = { increment: quantity };
        if (amount) updates.transactionVolume = { increment: amount };
        break;
      case UsageEventType.REFUND_PROCESSED:
      case UsageEventType.CHARGEBACK_RECEIVED:
        // These are tracked in transactionCount
        updates.transactionCount = { increment: quantity };
        break;
      case UsageEventType.API_CALL:
        updates.apiCallCount = { increment: quantity };
        break;
      case UsageEventType.WEBHOOK_SENT:
        updates.apiCallCount = { increment: quantity };
        break;
      case UsageEventType.COMPANY_CREATED:
        updates.companiesUsed = { increment: quantity };
        break;
      case UsageEventType.TEAM_MEMBER_ADDED:
        updates.usersUsed = { increment: quantity };
        break;
      // MERCHANT_ACCOUNT_CREATED and VAULT_ENTRY_CREATED not tracked in schema
      // We can track them via events but not as aggregate fields
    }

    if (Object.keys(updates).length > 0) {
      await this.prisma.usagePeriod.update({
        where: { id: periodId },
        data: updates,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // USAGE QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getUsageSummary(clientId: string): Promise<UsageSummary> {
    const period = await this.getActiveUsagePeriod(clientId);
    const subscription = await this.prisma.clientSubscription.findUnique({
      where: { clientId },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const plan = await this.planService.findById(subscription.planId);

    const now = new Date();
    const daysRemaining = Math.ceil(
      (period.periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Calculate overages
    const transactionOverage = Math.max(0, period.transactionCount - plan.included.transactions);
    const volumeOverage = Math.max(0, Number(period.transactionVolume) - plan.included.volume);

    const overageCost =
      transactionOverage * plan.overage.transactionPrice +
      Math.round(volumeOverage * plan.overage.volumePercent);

    // Get company breakdown
    const companyUsage = await this.getUsageByCompany(period.id);

    return {
      period: {
        start: period.periodStart,
        end: period.periodEnd,
        daysRemaining,
      },
      usage: {
        transactions: {
          used: period.transactionCount,
          included: plan.included.transactions,
          remaining: Math.max(0, plan.included.transactions - period.transactionCount),
        },
        volume: {
          used: Number(period.transactionVolume),
          included: plan.included.volume,
          remaining: Math.max(0, plan.included.volume - Number(period.transactionVolume)),
        },
        merchantAccounts: {
          used: 0, // Not tracked in schema per-period
          included: plan.included.merchantAccounts,
          remaining: plan.included.merchantAccounts,
        },
        companies: {
          used: period.companiesUsed,
          included: plan.included.companies,
          remaining: Math.max(0, plan.included.companies - period.companiesUsed),
        },
        teamMembers: {
          used: period.usersUsed,
          included: plan.included.teamMembers,
          remaining: Math.max(0, plan.included.teamMembers - period.usersUsed),
        },
        apiCalls: {
          used: period.apiCallCount,
          included: plan.included.apiCalls,
          remaining: Math.max(0, plan.included.apiCalls - period.apiCallCount),
        },
      },
      estimatedCost: {
        base: plan.basePrice,
        overages: overageCost,
        total: plan.basePrice + overageCost,
      },
      companyBreakdown: companyUsage,
    };
  }

  async getUsageByCompany(periodId: string): Promise<CompanyUsage[]> {
    const companyUsage = await this.prisma.companyUsageRecord.findMany({
      where: { usagePeriodId: periodId },
    });

    // Get company names separately
    const companyIds = companyUsage.map((cu) => cu.companyId);
    const companies = await this.prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, name: true },
    });
    const companyMap = new Map(companies.map((c) => [c.id, c.name]));

    return companyUsage.map((cu) => ({
      companyId: cu.companyId,
      companyName: companyMap.get(cu.companyId) || 'Unknown',
      transactionCount: cu.transactionCount,
      transactionVolume: Number(cu.transactionVolume),
      successfulTransactions: cu.transactionCount, // Not tracked separately
      failedTransactions: 0, // Not tracked separately
      successRate: 100, // Not tracked separately
      avgTransactionSize:
        cu.transactionCount > 0 ? Number(cu.transactionVolume) / cu.transactionCount : 0,
    }));
  }

  async getActiveUsagePeriod(clientId: string): Promise<any> {
    const period = await this.prisma.usagePeriod.findFirst({
      where: {
        clientId,
        status: UsagePeriodStatus.ACTIVE,
      },
      orderBy: { periodStart: 'desc' },
    });

    if (!period) {
      throw new NotFoundException(`No active usage period for client ${clientId}`);
    }

    return period;
  }

  // ═══════════════════════════════════════════════════════════════
  // PERIOD CLOSING
  // ═══════════════════════════════════════════════════════════════

  async closePeriod(periodId: string): Promise<void> {
    const period = await this.prisma.usagePeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) {
      throw new NotFoundException(`Usage period ${periodId} not found`);
    }

    // Calculate final costs
    const subscription = await this.prisma.clientSubscription.findUnique({
      where: { clientId: period.clientId },
    });
    if (!subscription) return;

    const plan = await this.planService.findById(subscription.planId);

    // Calculate tiered transaction cost or flat rate
    let transactionCost = 0;
    if (plan.transactionTiers?.length) {
      transactionCost = this.calculateTieredCost(
        period.transactionCount,
        plan.transactionTiers,
        plan.included.transactions,
      );
    } else {
      const overage = Math.max(0, period.transactionCount - plan.included.transactions);
      transactionCost = overage * plan.overage.transactionPrice;
    }

    // Calculate volume cost
    const volumeOverage = Math.max(0, Number(period.transactionVolume) - plan.included.volume);
    const volumeCost = Math.round(volumeOverage * plan.overage.volumePercent);

    // Calculate resource overages
    const resourceOverage =
      Math.max(0, period.companiesUsed - plan.included.companies) * plan.overage.companyPrice +
      Math.max(0, period.usersUsed - plan.included.teamMembers) * plan.overage.teamMemberPrice;

    const totalCost = plan.basePrice + transactionCost + volumeCost + resourceOverage;

    await this.prisma.usagePeriod.update({
      where: { id: periodId },
      data: {
        status: UsagePeriodStatus.CLOSED,
        closedAt: new Date(),
        baseCost: plan.basePrice,
        transactionCost,
        volumeCost,
        overageCost: resourceOverage,
        totalCost,
      },
    });

    this.logger.log(`Closed usage period ${periodId} with total cost: ${totalCost}`);
  }

  private calculateTieredCost(
    count: number,
    tiers: Array<{ min: number; max: number | null; pricePerUnit: number }>,
    included: number,
  ): number {
    let remaining = Math.max(0, count - included);
    let cost = 0;

    for (const tier of tiers) {
      if (remaining <= 0) break;

      const tierRange = tier.max !== null ? tier.max - tier.min : Infinity;
      const unitsInTier = Math.min(remaining, tierRange);
      cost += unitsInTier * tier.pricePerUnit;
      remaining -= unitsInTier;
    }

    return cost;
  }
}
