import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  MerchantAccount,
  CreateMerchantAccountDto,
  UpdateMerchantAccountDto,
  MerchantAccountQuery,
  AccountStatus,
  UsageUpdateEvent,
  AccountHealth,
} from '../types/merchant-account.types';

@Injectable()
export class MerchantAccountService {
  private readonly logger = new Logger(MerchantAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  async create(companyId: string, dto: CreateMerchantAccountDto, createdBy?: string): Promise<MerchantAccount> {
    // Check for duplicate name
    const existing = await this.prisma.merchantAccount.findFirst({
      where: { companyId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Account with name "${dto.name}" already exists`);
    }

    // Encrypt credentials before storing
    const encryptedCredentials = this.encryptCredentials(dto.credentials);

    const account = await this.prisma.merchantAccount.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        color: dto.color,
        icon: dto.icon,
        tags: dto.tags || [],
        providerType: dto.providerType,
        merchantId: dto.merchantId,
        descriptor: dto.descriptor,
        credentials: encryptedCredentials as any,
        environment: dto.environment || 'sandbox',
        status: AccountStatus.PENDING,

        // Limits
        minTransactionAmount: dto.limits?.minTransactionAmount ?? 50,
        maxTransactionAmount: dto.limits?.maxTransactionAmount ?? 10000000,
        dailyTransactionLimit: dto.limits?.dailyTransactionLimit,
        dailyVolumeLimit: dto.limits?.dailyVolumeLimit,
        weeklyTransactionLimit: dto.limits?.weeklyTransactionLimit,
        weeklyVolumeLimit: dto.limits?.weeklyVolumeLimit,
        monthlyTransactionLimit: dto.limits?.monthlyTransactionLimit,
        monthlyVolumeLimit: dto.limits?.monthlyVolumeLimit,
        yearlyTransactionLimit: dto.limits?.yearlyTransactionLimit,
        yearlyVolumeLimit: dto.limits?.yearlyVolumeLimit,
        velocityWindow: dto.limits?.velocityWindow,
        velocityMaxTransactions: dto.limits?.velocityMaxTransactions,
        velocityMaxAmount: dto.limits?.velocityMaxAmount,

        // Fees & Restrictions as JSON
        fees: dto.fees || null,
        restrictions: dto.restrictions || null,

        // Routing
        priority: dto.routing?.priority ?? 100,
        weight: dto.routing?.weight ?? 100,
        isDefault: dto.routing?.isDefault ?? false,
        isBackupOnly: dto.routing?.isBackupOnly ?? false,

        // Usage initialized to 0
        todayTransactionCount: 0,
        todayVolume: 0,
        todaySuccessCount: 0,
        todayFailureCount: 0,
        weekTransactionCount: 0,
        weekVolume: 0,
        monthTransactionCount: 0,
        monthVolume: 0,
        yearTransactionCount: 0,
        yearVolume: 0,
        usageResetAt: new Date(),

        // Health
        healthStatus: 'healthy',
        successRate: 100,
        avgLatencyMs: 0,
        uptimePercent: 100,

        createdBy,
      },
    });

    this.logger.log(`Created merchant account: ${account.name} (${account.id})`);
    this.eventEmitter.emit('merchant-account.created', { account });

    return this.mapToMerchantAccount(account);
  }

  async findAll(query: MerchantAccountQuery): Promise<{ accounts: MerchantAccount[]; total: number }> {
    const where: any = {};

    if (query.companyId) where.companyId = query.companyId;
    if (query.providerType) where.providerType = query.providerType;
    if (query.status) where.status = query.status;
    if (query.isDefault !== undefined) where.isDefault = query.isDefault;
    if (query.tags?.length) where.tags = { hasSome: query.tags };

    const [accounts, total] = await Promise.all([
      this.prisma.merchantAccount.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { name: 'asc' }],
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
      this.prisma.merchantAccount.count({ where }),
    ]);

    return {
      accounts: accounts.map(this.mapToMerchantAccount.bind(this)),
      total,
    };
  }

  async findById(id: string): Promise<MerchantAccount> {
    const account = await this.prisma.merchantAccount.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Merchant account ${id} not found`);
    }
    return this.mapToMerchantAccount(account);
  }

  async findByCompany(companyId: string): Promise<MerchantAccount[]> {
    const accounts = await this.prisma.merchantAccount.findMany({
      where: { companyId },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    });
    return accounts.map(this.mapToMerchantAccount.bind(this));
  }

  async update(id: string, dto: UpdateMerchantAccountDto): Promise<MerchantAccount> {
    const existing = await this.prisma.merchantAccount.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Merchant account ${id} not found`);
    }

    const updateData: any = {};

    // Basic fields
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.descriptor !== undefined) updateData.descriptor = dto.descriptor;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // Status
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      updateData.statusReason = dto.statusReason;
      updateData.statusChangedAt = new Date();
    }

    // Credentials (encrypt if provided)
    if (dto.credentials !== undefined) {
      updateData.credentials = this.encryptCredentials(dto.credentials);
    }

    // Limits
    if (dto.limits) {
      Object.entries(dto.limits).forEach(([key, value]) => {
        if (value !== undefined) updateData[key] = value;
      });
    }

    // Fees & Restrictions (merge with existing)
    if (dto.fees) {
      updateData.fees = { ...(existing.fees as object || {}), ...dto.fees };
    }
    if (dto.restrictions) {
      updateData.restrictions = { ...(existing.restrictions as object || {}), ...dto.restrictions };
    }

    // Routing
    if (dto.routing) {
      if (dto.routing.priority !== undefined) updateData.priority = dto.routing.priority;
      if (dto.routing.weight !== undefined) updateData.weight = dto.routing.weight;
      if (dto.routing.isDefault !== undefined) updateData.isDefault = dto.routing.isDefault;
      if (dto.routing.isBackupOnly !== undefined) updateData.isBackupOnly = dto.routing.isBackupOnly;
    }

    const updated = await this.prisma.merchantAccount.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Updated merchant account: ${updated.name} (${updated.id})`);
    this.eventEmitter.emit('merchant-account.updated', { account: this.mapToMerchantAccount(updated) });

    return this.mapToMerchantAccount(updated);
  }

  async delete(id: string): Promise<void> {
    const account = await this.prisma.merchantAccount.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Merchant account ${id} not found`);
    }

    await this.prisma.merchantAccount.delete({ where: { id } });
    this.logger.log(`Deleted merchant account: ${account.name} (${id})`);
    this.eventEmitter.emit('merchant-account.deleted', { accountId: id, accountName: account.name });
  }

  // ═══════════════════════════════════════════════════════════════
  // USAGE TRACKING
  // ═══════════════════════════════════════════════════════════════

  async recordTransaction(event: UsageUpdateEvent): Promise<void> {
    const { accountId, transactionAmount, success, latencyMs } = event;

    await this.prisma.merchantAccount.update({
      where: { id: accountId },
      data: {
        todayTransactionCount: { increment: 1 },
        todayVolume: { increment: transactionAmount },
        todaySuccessCount: success ? { increment: 1 } : undefined,
        todayFailureCount: !success ? { increment: 1 } : undefined,
        weekTransactionCount: { increment: 1 },
        weekVolume: { increment: transactionAmount },
        monthTransactionCount: { increment: 1 },
        monthVolume: { increment: transactionAmount },
        yearTransactionCount: { increment: 1 },
        yearVolume: { increment: transactionAmount },
        lastTransactionAt: new Date(),
        // Update rolling averages
        avgLatencyMs: latencyMs, // Simplified - should be rolling average
      },
    });

    // Update success rate
    await this.updateSuccessRate(accountId);
  }

  private async updateSuccessRate(accountId: string): Promise<void> {
    const account = await this.prisma.merchantAccount.findUnique({ where: { id: accountId } });
    if (!account) return;

    const total = account.todaySuccessCount + account.todayFailureCount;
    if (total === 0) return;

    const successRate = (account.todaySuccessCount / total) * 100;
    let healthStatus: 'healthy' | 'degraded' | 'down' = 'healthy';

    if (successRate < 50) healthStatus = 'down';
    else if (successRate < 80) healthStatus = 'degraded';

    await this.prisma.merchantAccount.update({
      where: { id: accountId },
      data: { successRate, healthStatus },
    });
  }

  async getUsage(accountId: string): Promise<MerchantAccount['currentUsage']> {
    const account = await this.findById(accountId);
    return account.currentUsage;
  }

  async checkLimits(accountId: string, transactionAmount: number): Promise<{
    allowed: boolean;
    reason?: string;
    limitType?: string;
    currentValue?: number;
    limitValue?: number;
  }> {
    const account = await this.findById(accountId);
    const { limits, currentUsage } = account;

    // Check transaction amount
    if (transactionAmount < limits.minTransactionAmount) {
      return {
        allowed: false,
        reason: 'Transaction amount below minimum',
        limitType: 'minTransactionAmount',
        currentValue: transactionAmount,
        limitValue: limits.minTransactionAmount,
      };
    }
    if (transactionAmount > limits.maxTransactionAmount) {
      return {
        allowed: false,
        reason: 'Transaction amount exceeds maximum',
        limitType: 'maxTransactionAmount',
        currentValue: transactionAmount,
        limitValue: limits.maxTransactionAmount,
      };
    }

    // Check daily limits
    if (limits.dailyTransactionLimit && currentUsage.todayTransactionCount >= limits.dailyTransactionLimit) {
      return {
        allowed: false,
        reason: 'Daily transaction limit reached',
        limitType: 'dailyTransactionLimit',
        currentValue: currentUsage.todayTransactionCount,
        limitValue: limits.dailyTransactionLimit,
      };
    }
    if (limits.dailyVolumeLimit && (currentUsage.todayVolume + transactionAmount) > limits.dailyVolumeLimit) {
      return {
        allowed: false,
        reason: 'Daily volume limit would be exceeded',
        limitType: 'dailyVolumeLimit',
        currentValue: currentUsage.todayVolume,
        limitValue: limits.dailyVolumeLimit,
      };
    }

    // Check monthly limits
    if (limits.monthlyTransactionLimit && currentUsage.monthTransactionCount >= limits.monthlyTransactionLimit) {
      return {
        allowed: false,
        reason: 'Monthly transaction limit reached',
        limitType: 'monthlyTransactionLimit',
        currentValue: currentUsage.monthTransactionCount,
        limitValue: limits.monthlyTransactionLimit,
      };
    }
    if (limits.monthlyVolumeLimit && (currentUsage.monthVolume + transactionAmount) > limits.monthlyVolumeLimit) {
      return {
        allowed: false,
        reason: 'Monthly volume limit would be exceeded',
        limitType: 'monthlyVolumeLimit',
        currentValue: currentUsage.monthVolume,
        limitValue: limits.monthlyVolumeLimit,
      };
    }

    // Check yearly limits
    if (limits.yearlyVolumeLimit && (currentUsage.yearVolume + transactionAmount) > limits.yearlyVolumeLimit) {
      return {
        allowed: false,
        reason: 'Yearly volume limit would be exceeded',
        limitType: 'yearlyVolumeLimit',
        currentValue: currentUsage.yearVolume,
        limitValue: limits.yearlyVolumeLimit,
      };
    }

    return { allowed: true };
  }

  // ═══════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════════════════════════════

  async updateHealth(accountId: string, health: Partial<AccountHealth>): Promise<void> {
    await this.prisma.merchantAccount.update({
      where: { id: accountId },
      data: {
        healthStatus: health.status,
        successRate: health.successRate,
        avgLatencyMs: health.avgLatencyMs,
        lastHealthCheck: new Date(),
        lastErrorCode: health.lastError?.code,
        lastErrorMessage: health.lastError?.message,
        lastErrorAt: health.lastError?.timestamp,
      },
    });
  }

  async getHealth(accountId: string): Promise<AccountHealth> {
    const account = await this.findById(accountId);
    return account.health;
  }

  // ═══════════════════════════════════════════════════════════════
  // SCHEDULED TASKS
  // ═══════════════════════════════════════════════════════════════

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyUsage(): Promise<void> {
    this.logger.log('Resetting daily usage counters...');
    await this.prisma.merchantAccount.updateMany({
      data: {
        todayTransactionCount: 0,
        todayVolume: 0,
        todaySuccessCount: 0,
        todayFailureCount: 0,
        usageResetAt: new Date(),
      },
    });
  }

  @Cron(CronExpression.EVERY_WEEK)
  async resetWeeklyUsage(): Promise<void> {
    this.logger.log('Resetting weekly usage counters...');
    await this.prisma.merchantAccount.updateMany({
      data: {
        weekTransactionCount: 0,
        weekVolume: 0,
      },
    });
  }

  @Cron('0 0 1 * *') // First day of every month at midnight
  async resetMonthlyUsage(): Promise<void> {
    this.logger.log('Resetting monthly usage counters...');
    await this.prisma.merchantAccount.updateMany({
      data: {
        monthTransactionCount: 0,
        monthVolume: 0,
      },
    });
  }

  @Cron('0 0 1 1 *') // January 1st at midnight
  async resetYearlyUsage(): Promise<void> {
    this.logger.log('Resetting yearly usage counters...');
    await this.prisma.merchantAccount.updateMany({
      data: {
        yearTransactionCount: 0,
        yearVolume: 0,
      },
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async healthCheckAllAccounts(): Promise<void> {
    const accounts = await this.prisma.merchantAccount.findMany({
      where: { status: { in: ['active', 'pending'] } },
      select: { id: true, todaySuccessCount: true, todayFailureCount: true },
    });

    for (const account of accounts) {
      const total = account.todaySuccessCount + account.todayFailureCount;
      if (total === 0) continue;

      const successRate = (account.todaySuccessCount / total) * 100;
      let healthStatus: 'healthy' | 'degraded' | 'down' = 'healthy';

      if (successRate < 50) healthStatus = 'down';
      else if (successRate < 80) healthStatus = 'degraded';

      await this.prisma.merchantAccount.update({
        where: { id: account.id },
        data: {
          healthStatus,
          successRate,
          lastHealthCheck: new Date(),
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private encryptCredentials(credentials: Record<string, unknown>): Record<string, unknown> {
    // TODO: Implement actual encryption using crypto module
    // For now, just return as-is (IMPLEMENT BEFORE PRODUCTION)
    return credentials;
  }

  private decryptCredentials(credentials: Record<string, unknown>): Record<string, unknown> {
    // TODO: Implement actual decryption
    return credentials;
  }

  private mapToMerchantAccount(data: any): MerchantAccount {
    return {
      id: data.id,
      companyId: data.companyId,
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      tags: data.tags || [],
      providerType: data.providerType,
      merchantId: data.merchantId,
      descriptor: data.descriptor,
      descriptorPhone: data.descriptorPhone,
      credentials: this.decryptCredentials(data.credentials || {}),
      environment: data.environment,
      status: data.status,
      statusReason: data.statusReason,
      statusChangedAt: data.statusChangedAt,
      limits: {
        minTransactionAmount: data.minTransactionAmount,
        maxTransactionAmount: data.maxTransactionAmount,
        dailyTransactionLimit: data.dailyTransactionLimit,
        dailyVolumeLimit: data.dailyVolumeLimit,
        weeklyTransactionLimit: data.weeklyTransactionLimit,
        weeklyVolumeLimit: data.weeklyVolumeLimit,
        monthlyTransactionLimit: data.monthlyTransactionLimit,
        monthlyVolumeLimit: data.monthlyVolumeLimit,
        yearlyTransactionLimit: data.yearlyTransactionLimit,
        yearlyVolumeLimit: data.yearlyVolumeLimit,
        velocityWindow: data.velocityWindow,
        velocityMaxTransactions: data.velocityMaxTransactions,
        velocityMaxAmount: data.velocityMaxAmount,
      },
      currentUsage: {
        todayTransactionCount: data.todayTransactionCount,
        todayVolume: data.todayVolume,
        todaySuccessCount: data.todaySuccessCount,
        todayFailureCount: data.todayFailureCount,
        weekTransactionCount: data.weekTransactionCount,
        weekVolume: data.weekVolume,
        monthTransactionCount: data.monthTransactionCount,
        monthVolume: data.monthVolume,
        yearTransactionCount: data.yearTransactionCount,
        yearVolume: data.yearVolume,
        lastTransactionAt: data.lastTransactionAt,
        usageResetAt: data.usageResetAt,
      },
      fees: data.fees || undefined,
      restrictions: data.restrictions || undefined,
      routing: {
        priority: data.priority,
        weight: data.weight,
        isDefault: data.isDefault,
        isBackupOnly: data.isBackupOnly,
        poolIds: [], // Populated from pool memberships
      },
      health: {
        status: data.healthStatus,
        successRate: data.successRate,
        avgLatencyMs: data.avgLatencyMs,
        lastHealthCheck: data.lastHealthCheck,
        lastError: data.lastErrorCode ? {
          code: data.lastErrorCode,
          message: data.lastErrorMessage,
          timestamp: data.lastErrorAt,
        } : undefined,
        uptimePercent: data.uptimePercent,
      },
      reserveBalance: data.reserveBalance,
      availableBalance: data.availableBalance,
      notes: data.notes,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy,
    };
  }
}
