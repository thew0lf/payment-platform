import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { MerchantAccountService } from '../../merchant-accounts/services/merchant-account.service';
import {
  AccountPool,
  PoolStatus,
  BalancingStrategy,
  PoolMembership,
  AccountSelection,
  CreateAccountPoolDto,
  UpdateAccountPoolDto,
  AddAccountToPoolDto,
  UpdatePoolMembershipDto,
  SelectAccountContext,
  FailoverConfig,
  HealthRoutingConfig,
  LimitRoutingConfig,
  StickySessionConfig,
} from '../types';

@Injectable()
export class AccountPoolService {
  private readonly logger = new Logger(AccountPoolService.name);

  // In-memory sticky session cache
  private stickySessionCache = new Map<string, { accountId: string; expiresAt: Date }>();

  constructor(
    private prisma: PrismaService,
    private merchantAccountService: MerchantAccountService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ==================== CRUD Operations ====================

  async create(companyId: string, dto: CreateAccountPoolDto): Promise<AccountPool> {
    // Build default configs
    const failoverConfig: FailoverConfig = {
      enabled: true,
      maxAttempts: 3,
      retryOnDecline: true,
      retryOnError: true,
      excludeOnFailure: true,
      exclusionDurationMs: 300000, // 5 minutes
      ...dto.failover,
    };

    const healthRoutingConfig: HealthRoutingConfig = {
      enabled: true,
      minSuccessRate: 80,
      maxLatencyMs: 5000,
      degradedWeightMultiplier: 0.5,
      excludeDown: true,
      ...dto.healthRouting,
    };

    const limitRoutingConfig: LimitRoutingConfig = {
      enabled: true,
      warningThreshold: 0.80,
      redistributeThreshold: 0.90,
      excludeThreshold: 0.98,
      limitType: 'both',
      ...dto.limitRouting,
    };

    const stickySessionConfig: StickySessionConfig | undefined = dto.stickySession ? {
      enabled: true,
      stickyBy: 'customer',
      durationMs: 3600000, // 1 hour
      ...dto.stickySession,
    } : undefined;

    // Build account memberships
    const accounts: PoolMembership[] = [];
    if (dto.accounts && dto.accounts.length > 0) {
      for (let i = 0; i < dto.accounts.length; i++) {
        const accountDto = dto.accounts[i];
        // Fetch account details for denormalization
        const account = await this.merchantAccountService.findById(accountDto.accountId);

        accounts.push({
          accountId: accountDto.accountId,
          accountName: account.name,
          providerType: account.providerType as string,
          weight: accountDto.weight ?? 50,
          priority: accountDto.priority ?? (i + 1),
          isActive: accountDto.isActive ?? true,
          isPrimary: accountDto.isPrimary ?? (i === 0),
          isBackupOnly: accountDto.isBackupOnly ?? false,
          maxPercentage: accountDto.maxPercentage,
          minPercentage: accountDto.minPercentage,
        });
      }
    }

    const pool = await this.prisma.accountPool.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        color: dto.color,
        icon: dto.icon,
        tags: dto.tags ?? [],
        balancingStrategy: dto.balancingStrategy,
        accounts: accounts as any,
        failover: failoverConfig as any,
        healthRouting: healthRoutingConfig as any,
        limitRouting: limitRoutingConfig as any,
        stickySession: stickySessionConfig as any,
        status: PoolStatus.ACTIVE,
        lastAccountIndex: 0,
      },
    });

    this.eventEmitter.emit('accountPool.created', { pool });
    this.logger.log(`Created account pool: ${pool.name} (${pool.id})`);

    return this.mapToAccountPool(pool);
  }

  async findAll(companyId: string): Promise<AccountPool[]> {
    const pools = await this.prisma.accountPool.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return pools.map(p => this.mapToAccountPool(p));
  }

  async findOne(id: string): Promise<AccountPool> {
    const pool = await this.prisma.accountPool.findUnique({
      where: { id },
    });

    if (!pool) {
      throw new NotFoundException(`Account pool ${id} not found`);
    }

    return this.mapToAccountPool(pool);
  }

  async update(id: string, dto: UpdateAccountPoolDto): Promise<AccountPool> {
    const existing = await this.findOne(id);

    const updateData: any = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.balancingStrategy !== undefined) updateData.balancingStrategy = dto.balancingStrategy;
    if (dto.status !== undefined) updateData.status = dto.status;

    if (dto.failover !== undefined) {
      updateData.failover = { ...existing.failover, ...dto.failover };
    }
    if (dto.healthRouting !== undefined) {
      updateData.healthRouting = { ...existing.healthRouting, ...dto.healthRouting };
    }
    if (dto.limitRouting !== undefined) {
      updateData.limitRouting = { ...existing.limitRouting, ...dto.limitRouting };
    }
    if (dto.stickySession !== undefined) {
      updateData.stickySession = existing.stickySession
        ? { ...existing.stickySession, ...dto.stickySession }
        : { enabled: true, stickyBy: 'customer', durationMs: 3600000, ...dto.stickySession };
    }

    const pool = await this.prisma.accountPool.update({
      where: { id },
      data: updateData,
    });

    this.eventEmitter.emit('accountPool.updated', { pool: this.mapToAccountPool(pool) });

    return this.mapToAccountPool(pool);
  }

  async delete(id: string): Promise<void> {
    await this.findOne(id); // Verify exists

    await this.prisma.accountPool.delete({
      where: { id },
    });

    this.eventEmitter.emit('accountPool.deleted', { poolId: id });
    this.logger.log(`Deleted account pool: ${id}`);
  }

  // ==================== Membership Management ====================

  async addAccount(poolId: string, dto: AddAccountToPoolDto): Promise<AccountPool> {
    const pool = await this.findOne(poolId);

    // Check if account already in pool
    const existingMember = pool.accounts.find(a => a.accountId === dto.accountId);
    if (existingMember) {
      throw new BadRequestException(`Account ${dto.accountId} is already in this pool`);
    }

    // Fetch account details
    const account = await this.merchantAccountService.findById(dto.accountId);

    const newMembership: PoolMembership = {
      accountId: dto.accountId,
      accountName: account.name,
      providerType: account.providerType as string,
      weight: dto.weight ?? 50,
      priority: dto.priority ?? (pool.accounts.length + 1),
      isActive: dto.isActive ?? true,
      isPrimary: dto.isPrimary ?? false,
      isBackupOnly: dto.isBackupOnly ?? false,
      maxPercentage: dto.maxPercentage,
      minPercentage: dto.minPercentage,
    };

    const updatedAccounts = [...pool.accounts, newMembership];

    const updated = await this.prisma.accountPool.update({
      where: { id: poolId },
      data: { accounts: updatedAccounts as any },
    });

    this.eventEmitter.emit('accountPool.memberAdded', {
      poolId,
      accountId: dto.accountId
    });

    return this.mapToAccountPool(updated);
  }

  async removeAccount(poolId: string, accountId: string): Promise<AccountPool> {
    const pool = await this.findOne(poolId);

    const updatedAccounts = pool.accounts.filter(a => a.accountId !== accountId);

    if (updatedAccounts.length === pool.accounts.length) {
      throw new NotFoundException(`Account ${accountId} not found in pool`);
    }

    const updated = await this.prisma.accountPool.update({
      where: { id: poolId },
      data: { accounts: updatedAccounts as any },
    });

    this.eventEmitter.emit('accountPool.memberRemoved', { poolId, accountId });

    return this.mapToAccountPool(updated);
  }

  async updateMembership(
    poolId: string,
    accountId: string,
    dto: UpdatePoolMembershipDto
  ): Promise<AccountPool> {
    const pool = await this.findOne(poolId);

    const accountIndex = pool.accounts.findIndex(a => a.accountId === accountId);
    if (accountIndex === -1) {
      throw new NotFoundException(`Account ${accountId} not found in pool`);
    }

    const updatedAccounts = [...pool.accounts];
    updatedAccounts[accountIndex] = {
      ...updatedAccounts[accountIndex],
      ...dto,
    };

    const updated = await this.prisma.accountPool.update({
      where: { id: poolId },
      data: { accounts: updatedAccounts as any },
    });

    return this.mapToAccountPool(updated);
  }

  async excludeAccount(
    poolId: string,
    accountId: string,
    durationMs: number,
    reason: string
  ): Promise<AccountPool> {
    const pool = await this.findOne(poolId);

    const accountIndex = pool.accounts.findIndex(a => a.accountId === accountId);
    if (accountIndex === -1) {
      throw new NotFoundException(`Account ${accountId} not found in pool`);
    }

    const updatedAccounts = [...pool.accounts];
    updatedAccounts[accountIndex] = {
      ...updatedAccounts[accountIndex],
      excludedUntil: new Date(Date.now() + durationMs),
      exclusionReason: reason,
    };

    const updated = await this.prisma.accountPool.update({
      where: { id: poolId },
      data: { accounts: updatedAccounts as any },
    });

    this.eventEmitter.emit('accountPool.memberExcluded', {
      poolId,
      accountId,
      durationMs,
      reason
    });

    return this.mapToAccountPool(updated);
  }

  // ==================== Account Selection (Load Balancing) ====================

  async selectAccount(
    poolId: string,
    context: SelectAccountContext
  ): Promise<AccountSelection> {
    const pool = await this.findOne(poolId);

    if (pool.status !== PoolStatus.ACTIVE) {
      throw new BadRequestException(`Pool ${poolId} is not active (status: ${pool.status})`);
    }

    // Get eligible accounts
    let eligibleAccounts = await this.getEligibleAccounts(pool, context);

    if (eligibleAccounts.length === 0) {
      throw new BadRequestException('No eligible accounts available in pool');
    }

    // Check for sticky session
    if (pool.stickySession?.enabled) {
      const stickyAccount = this.checkStickySession(pool, context);
      if (stickyAccount && eligibleAccounts.some(a => a.accountId === stickyAccount)) {
        const account = eligibleAccounts.find(a => a.accountId === stickyAccount)!;
        return this.buildSelection(account, 'sticky_session', eligibleAccounts);
      }
    }

    // Select based on strategy
    const selected = await this.selectByStrategy(pool, eligibleAccounts, context);

    // Store sticky session if enabled
    if (pool.stickySession?.enabled) {
      this.storeStickySession(pool, context, selected.accountId);
    }

    // Update round-robin index if needed
    if (pool.balancingStrategy === BalancingStrategy.ROUND_ROBIN) {
      const selectedIndex = eligibleAccounts.findIndex(a => a.accountId === selected.accountId);
      await this.prisma.accountPool.update({
        where: { id: poolId },
        data: { lastAccountIndex: selectedIndex },
      });
    }

    return selected;
  }

  private async getEligibleAccounts(
    pool: AccountPool,
    context: SelectAccountContext
  ): Promise<PoolMembership[]> {
    let accounts = pool.accounts.filter(a => {
      // Must be active
      if (!a.isActive) return false;

      // Check exclusion
      if (a.excludedUntil && new Date(a.excludedUntil) > new Date()) return false;

      // Check if backup only (only include if no primary available)
      // We'll handle this later

      // Check explicit exclusions
      if (context.excludeAccountIds?.includes(a.accountId)) return false;

      return true;
    });

    // Apply health routing filters
    if (pool.healthRouting.enabled) {
      accounts = await this.applyHealthFilters(accounts, pool.healthRouting);
    }

    // Apply limit routing filters
    if (pool.limitRouting.enabled) {
      accounts = await this.applyLimitFilters(accounts, pool.limitRouting, context);
    }

    // If no non-backup accounts available, include backup accounts
    const nonBackupAccounts = accounts.filter(a => !a.isBackupOnly);
    if (nonBackupAccounts.length === 0) {
      return accounts;
    }

    return nonBackupAccounts;
  }

  private async applyHealthFilters(
    accounts: PoolMembership[],
    config: HealthRoutingConfig
  ): Promise<PoolMembership[]> {
    const filtered: PoolMembership[] = [];

    for (const account of accounts) {
      try {
        const health = await this.merchantAccountService.getHealth(account.accountId);

        // Exclude down accounts
        if (config.excludeDown && health.status === 'down') {
          continue;
        }

        // Check success rate
        if (health.successRate < config.minSuccessRate) {
          continue;
        }

        // Check latency
        if (health.avgLatencyMs > config.maxLatencyMs) {
          continue;
        }

        // Apply degraded weight multiplier for degraded accounts
        if (health.status === 'degraded') {
          filtered.push({
            ...account,
            weight: Math.floor(account.weight * config.degradedWeightMultiplier),
          });
        } else {
          filtered.push(account);
        }
      } catch {
        // If we can't get health, include account with original weight
        filtered.push(account);
      }
    }

    return filtered;
  }

  private async applyLimitFilters(
    accounts: PoolMembership[],
    config: LimitRoutingConfig,
    context: SelectAccountContext
  ): Promise<PoolMembership[]> {
    const filtered: PoolMembership[] = [];

    for (const account of accounts) {
      try {
        // Get usage data from the account
        const usage = await this.merchantAccountService.getUsage(account.accountId);
        const merchantAccount = await this.merchantAccountService.findById(account.accountId);
        const limits = merchantAccount.limits;

        // Get usage percentages
        const dailyUsage = limits.dailyVolumeLimit
          ? usage.todayVolume / limits.dailyVolumeLimit
          : 0;
        const monthlyUsage = limits.monthlyVolumeLimit
          ? usage.monthVolume / limits.monthlyVolumeLimit
          : 0;

        let usagePercent = 0;
        if (config.limitType === 'daily') {
          usagePercent = dailyUsage;
        } else if (config.limitType === 'monthly') {
          usagePercent = monthlyUsage;
        } else {
          usagePercent = Math.max(dailyUsage, monthlyUsage);
        }

        // Exclude if over threshold
        if (usagePercent >= config.excludeThreshold) {
          continue;
        }

        // Reduce weight if over redistribute threshold
        if (usagePercent >= config.redistributeThreshold) {
          const reductionFactor = 1 - ((usagePercent - config.redistributeThreshold) /
            (config.excludeThreshold - config.redistributeThreshold));
          filtered.push({
            ...account,
            weight: Math.floor(account.weight * reductionFactor * 0.5),
          });
        } else {
          filtered.push(account);
        }
      } catch {
        // If we can't check limits, include account
        filtered.push(account);
      }
    }

    return filtered;
  }

  private async selectByStrategy(
    pool: AccountPool,
    accounts: PoolMembership[],
    context: SelectAccountContext
  ): Promise<AccountSelection> {
    switch (pool.balancingStrategy) {
      case BalancingStrategy.WEIGHTED:
        return this.selectWeighted(accounts);

      case BalancingStrategy.ROUND_ROBIN:
        return this.selectRoundRobin(pool, accounts);

      case BalancingStrategy.LEAST_LOAD:
        return this.selectLeastLoad(accounts);

      case BalancingStrategy.CAPACITY:
        return this.selectByCapacity(accounts, context);

      case BalancingStrategy.LOWEST_COST:
        return this.selectLowestCost(accounts, context);

      case BalancingStrategy.LOWEST_LATENCY:
        return this.selectLowestLatency(accounts);

      case BalancingStrategy.HIGHEST_SUCCESS:
        return this.selectHighestSuccess(accounts);

      case BalancingStrategy.PRIORITY:
        return this.selectByPriority(accounts);

      default:
        return this.selectWeighted(accounts);
    }
  }

  private selectWeighted(accounts: PoolMembership[]): AccountSelection {
    const totalWeight = accounts.reduce((sum, a) => sum + a.weight, 0);
    let random = Math.random() * totalWeight;

    for (const account of accounts) {
      random -= account.weight;
      if (random <= 0) {
        return this.buildSelection(account, 'weighted_random', accounts);
      }
    }

    // Fallback to first account
    return this.buildSelection(accounts[0], 'weighted_fallback', accounts);
  }

  private selectRoundRobin(pool: AccountPool, accounts: PoolMembership[]): AccountSelection {
    const nextIndex = (pool.lastAccountIndex + 1) % accounts.length;
    return this.buildSelection(accounts[nextIndex], 'round_robin', accounts);
  }

  private async selectLeastLoad(accounts: PoolMembership[]): Promise<AccountSelection> {
    let leastLoad = Infinity;
    let selected = accounts[0];

    for (const account of accounts) {
      try {
        const usage = await this.merchantAccountService.getUsage(account.accountId);
        if (usage.todayTransactionCount < leastLoad) {
          leastLoad = usage.todayTransactionCount;
          selected = account;
        }
      } catch {
        // Skip accounts we can't check
      }
    }

    return this.buildSelection(selected, 'least_load', accounts);
  }

  private async selectByCapacity(
    accounts: PoolMembership[],
    context: SelectAccountContext
  ): Promise<AccountSelection> {
    let maxCapacity = -1;
    let selected = accounts[0];

    for (const account of accounts) {
      try {
        const merchantAccount = await this.merchantAccountService.findById(account.accountId);
        const usage = merchantAccount.currentUsage;
        const limits = merchantAccount.limits;
        const remainingDaily = (limits.dailyVolumeLimit || Infinity) - usage.todayVolume;
        const remainingMonthly = (limits.monthlyVolumeLimit || Infinity) - usage.monthVolume;
        const remainingCapacity = Math.min(remainingDaily, remainingMonthly);
        if (remainingCapacity > maxCapacity) {
          maxCapacity = remainingCapacity;
          selected = account;
        }
      } catch {
        // Skip accounts we can't check
      }
    }

    return this.buildSelection(selected, 'highest_capacity', accounts);
  }

  private async selectLowestCost(
    accounts: PoolMembership[],
    context: SelectAccountContext
  ): Promise<AccountSelection> {
    let lowestCost = Infinity;
    let selected = accounts[0];

    for (const account of accounts) {
      try {
        const merchantAccount = await this.merchantAccountService.findById(account.accountId);
        const fees = merchantAccount.fees;
        if (fees) {
          const cost = (context.transactionAmount * (fees.basePercentage / 100)) + fees.baseFlatFee;

          if (cost < lowestCost) {
            lowestCost = cost;
            selected = account;
          }
        }
      } catch {
        // Skip accounts we can't check
      }
    }

    return this.buildSelection(selected, 'lowest_cost', accounts);
  }

  private async selectLowestLatency(accounts: PoolMembership[]): Promise<AccountSelection> {
    let lowestLatency = Infinity;
    let selected = accounts[0];

    for (const account of accounts) {
      try {
        const health = await this.merchantAccountService.getHealth(account.accountId);
        if (health.avgLatencyMs < lowestLatency) {
          lowestLatency = health.avgLatencyMs;
          selected = account;
        }
      } catch {
        // Skip accounts we can't check
      }
    }

    return this.buildSelection(selected, 'lowest_latency', accounts);
  }

  private async selectHighestSuccess(accounts: PoolMembership[]): Promise<AccountSelection> {
    let highestSuccess = -1;
    let selected = accounts[0];

    for (const account of accounts) {
      try {
        const health = await this.merchantAccountService.getHealth(account.accountId);
        if (health.successRate > highestSuccess) {
          highestSuccess = health.successRate;
          selected = account;
        }
      } catch {
        // Skip accounts we can't check
      }
    }

    return this.buildSelection(selected, 'highest_success_rate', accounts);
  }

  private selectByPriority(accounts: PoolMembership[]): AccountSelection {
    const sorted = [...accounts].sort((a, b) => a.priority - b.priority);
    return this.buildSelection(sorted[0], 'priority_order', accounts);
  }

  private buildSelection(
    account: PoolMembership,
    reason: string,
    allAccounts: PoolMembership[]
  ): AccountSelection {
    // Build fallback list (other accounts sorted by priority)
    const fallbacks = allAccounts
      .filter(a => a.accountId !== account.accountId)
      .sort((a, b) => a.priority - b.priority)
      .map(a => a.accountId);

    return {
      accountId: account.accountId,
      accountName: account.accountName,
      providerType: account.providerType,
      selectionReason: reason,
      fallbackAccountIds: fallbacks,
      weight: account.weight,
      priority: account.priority,
    };
  }

  // ==================== Sticky Sessions ====================

  private checkStickySession(pool: AccountPool, context: SelectAccountContext): string | null {
    if (!pool.stickySession?.enabled) return null;

    const key = this.getStickyKey(pool, context);
    if (!key) return null;

    const cached = this.stickySessionCache.get(key);
    if (cached && cached.expiresAt > new Date()) {
      return cached.accountId;
    }

    return null;
  }

  private storeStickySession(
    pool: AccountPool,
    context: SelectAccountContext,
    accountId: string
  ): void {
    if (!pool.stickySession?.enabled) return;

    const key = this.getStickyKey(pool, context);
    if (!key) return;

    this.stickySessionCache.set(key, {
      accountId,
      expiresAt: new Date(Date.now() + (pool.stickySession.durationMs || 3600000)),
    });
  }

  private getStickyKey(pool: AccountPool, context: SelectAccountContext): string | null {
    if (!pool.stickySession) return null;

    switch (pool.stickySession.stickyBy) {
      case 'customer':
        return context.customerId ? `${pool.id}:customer:${context.customerId}` : null;
      case 'card':
        return context.cardFingerprint ? `${pool.id}:card:${context.cardFingerprint}` : null;
      case 'ip':
        return context.ipAddress ? `${pool.id}:ip:${context.ipAddress}` : null;
      default:
        return null;
    }
  }

  // ==================== Failover ====================

  async selectWithFailover(
    poolId: string,
    context: SelectAccountContext,
    failedAccountIds: string[] = []
  ): Promise<AccountSelection> {
    const pool = await this.findOne(poolId);

    if (!pool.failover.enabled) {
      return this.selectAccount(poolId, context);
    }

    // Check max attempts
    if (failedAccountIds.length >= pool.failover.maxAttempts) {
      throw new BadRequestException(
        `Max failover attempts (${pool.failover.maxAttempts}) reached`
      );
    }

    // Add failed accounts to exclusion list
    const updatedContext: SelectAccountContext = {
      ...context,
      excludeAccountIds: [
        ...(context.excludeAccountIds || []),
        ...failedAccountIds,
      ],
    };

    // If explicit failover order is set, use it
    if (pool.failover.failoverOrder && pool.failover.failoverOrder.length > 0) {
      const eligibleFromOrder = pool.failover.failoverOrder.filter(
        id => !updatedContext.excludeAccountIds?.includes(id)
      );

      if (eligibleFromOrder.length > 0) {
        const account = pool.accounts.find(a => a.accountId === eligibleFromOrder[0]);
        if (account) {
          return this.buildSelection(account, 'failover_order', pool.accounts);
        }
      }
    }

    // Select next available account
    const selection = await this.selectAccount(poolId, updatedContext);

    // Optionally exclude failed account temporarily
    if (pool.failover.excludeOnFailure && failedAccountIds.length > 0) {
      const lastFailed = failedAccountIds[failedAccountIds.length - 1];
      await this.excludeAccount(
        poolId,
        lastFailed,
        pool.failover.exclusionDurationMs,
        'Automatic exclusion after failure'
      ).catch(() => {
        // Ignore errors from exclusion
      });
    }

    return selection;
  }

  // ==================== Helper Methods ====================

  private mapToAccountPool(record: any): AccountPool {
    return {
      id: record.id,
      companyId: record.companyId,
      name: record.name,
      description: record.description,
      color: record.color,
      icon: record.icon,
      tags: record.tags || [],
      accounts: (record.accounts || []) as PoolMembership[],
      balancingStrategy: record.balancingStrategy as BalancingStrategy,
      failover: record.failover as FailoverConfig,
      healthRouting: record.healthRouting as HealthRoutingConfig,
      limitRouting: record.limitRouting as LimitRoutingConfig,
      stickySession: record.stickySession as StickySessionConfig | undefined,
      status: record.status as PoolStatus,
      lastAccountIndex: record.lastAccountIndex || 0,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdBy: record.createdBy,
    };
  }
}
