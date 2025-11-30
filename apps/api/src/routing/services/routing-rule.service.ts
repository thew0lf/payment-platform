import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  RoutingRule,
  CreateRoutingRuleDto,
  UpdateRoutingRuleDto,
  RuleStatus,
  TransactionContext,
  RoutingDecision,
} from '../types/routing-rule.types';
import { RuleEvaluationService } from './rule-evaluation.service';

@Injectable()
export class RoutingRuleService {
  private readonly logger = new Logger(RoutingRuleService.name);

  // Cache for active rules per company
  private rulesCache: Map<string, { rules: RoutingRule[]; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly evaluationService: RuleEvaluationService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  async create(companyId: string, dto: CreateRoutingRuleDto, createdBy?: string): Promise<RoutingRule> {
    const existing = await this.prisma.routingRule.findFirst({
      where: { companyId, name: dto.name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Rule with name "${dto.name}" already exists`);
    }

    const rule = await this.prisma.routingRule.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        color: dto.color,
        tags: dto.tags || [],
        status: RuleStatus.INACTIVE,
        priority: dto.priority ?? 100,
        conditions: dto.conditions as any,
        actions: dto.actions as any,
        fallbackAction: dto.fallback?.action,
        fallbackPoolId: dto.fallback?.poolId,
        fallbackMessage: dto.fallback?.message,
        testingEnabled: dto.testing?.enabled ?? false,
        testingTrafficPct: dto.testing?.trafficPercentage,
        testingControlPoolId: dto.testing?.controlPoolId,
        testingTestPoolId: dto.testing?.testPoolId,
        testingStartDate: dto.testing?.startDate,
        testingEndDate: dto.testing?.endDate,
        testingMetrics: dto.testing?.metrics || [],
        activateAt: dto.schedule?.activateAt,
        deactivateAt: dto.schedule?.deactivateAt,
        timezone: dto.schedule?.timezone,
        recurringSchedule: dto.schedule?.recurringSchedule,
        matchCount: 0,
        avgProcessingTimeMs: 0,
        version: 1,
        createdBy,
      },
    });

    this.invalidateCache(companyId);
    this.eventEmitter.emit('routingRule.created', { rule: this.mapToRoutingRule(rule) });
    this.logger.log(`Created routing rule: ${rule.name} (${rule.id})`);

    return this.mapToRoutingRule(rule);
  }

  async findAll(companyId: string, status?: RuleStatus): Promise<RoutingRule[]> {
    const where: any = { companyId, deletedAt: null };
    if (status) where.status = status;

    const rules = await this.prisma.routingRule.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    });

    return rules.map(this.mapToRoutingRule.bind(this));
  }

  async findById(id: string): Promise<RoutingRule> {
    const rule = await this.prisma.routingRule.findFirst({
      where: { id, deletedAt: null }
    });
    if (!rule) {
      throw new NotFoundException(`Routing rule ${id} not found`);
    }
    return this.mapToRoutingRule(rule);
  }

  async update(id: string, dto: UpdateRoutingRuleDto): Promise<RoutingRule> {
    const existing = await this.prisma.routingRule.findFirst({
      where: { id, deletedAt: null }
    });
    if (!existing) {
      throw new NotFoundException(`Routing rule ${id} not found`);
    }

    const updateData: any = { version: { increment: 1 } };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.conditions !== undefined) updateData.conditions = dto.conditions;
    if (dto.actions !== undefined) updateData.actions = dto.actions;

    if (dto.fallback) {
      updateData.fallbackAction = dto.fallback.action;
      updateData.fallbackPoolId = dto.fallback.poolId;
      updateData.fallbackMessage = dto.fallback.message;
    }

    if (dto.testing) {
      if (dto.testing.enabled !== undefined) updateData.testingEnabled = dto.testing.enabled;
      if (dto.testing.trafficPercentage !== undefined) updateData.testingTrafficPct = dto.testing.trafficPercentage;
      if (dto.testing.controlPoolId !== undefined) updateData.testingControlPoolId = dto.testing.controlPoolId;
      if (dto.testing.testPoolId !== undefined) updateData.testingTestPoolId = dto.testing.testPoolId;
    }

    if (dto.schedule) {
      if (dto.schedule.activateAt !== undefined) updateData.activateAt = dto.schedule.activateAt;
      if (dto.schedule.deactivateAt !== undefined) updateData.deactivateAt = dto.schedule.deactivateAt;
      if (dto.schedule.timezone !== undefined) updateData.timezone = dto.schedule.timezone;
      if (dto.schedule.recurringSchedule !== undefined) updateData.recurringSchedule = dto.schedule.recurringSchedule;
    }

    const updated = await this.prisma.routingRule.update({
      where: { id },
      data: updateData,
    });

    this.invalidateCache(existing.companyId);
    this.eventEmitter.emit('routingRule.updated', { rule: this.mapToRoutingRule(updated) });
    this.logger.log(`Updated routing rule: ${updated.name} (${updated.id})`);

    return this.mapToRoutingRule(updated);
  }

  async delete(id: string, deletedBy?: string): Promise<void> {
    const rule = await this.prisma.routingRule.findFirst({
      where: { id, deletedAt: null }
    });
    if (!rule) {
      throw new NotFoundException(`Routing rule ${id} not found`);
    }

    // Soft delete instead of hard delete
    await this.prisma.routingRule.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    });
    this.invalidateCache(rule.companyId);
    this.eventEmitter.emit('routingRule.deleted', { ruleId: id });
    this.logger.log(`Soft deleted routing rule: ${rule.name} (${id})`);
  }

  // ═══════════════════════════════════════════════════════════════
  // RULE EVALUATION
  // ═══════════════════════════════════════════════════════════════

  async evaluateTransaction(companyId: string, context: TransactionContext): Promise<RoutingDecision> {
    const rules = await this.getActiveRules(companyId);
    const decision = this.evaluationService.evaluate(rules, context);

    // Record match statistics
    for (const appliedRule of decision.appliedRules) {
      await this.recordMatch(appliedRule.id, decision.evaluationTimeMs);
    }

    // Log decision for audit
    await this.logDecision(companyId, context, decision);

    return decision;
  }

  async testRules(companyId: string, context: TransactionContext): Promise<RoutingDecision> {
    // Same as evaluate but doesn't record stats
    const rules = await this.getActiveRules(companyId);
    return this.evaluationService.evaluate(rules, context);
  }

  private async getActiveRules(companyId: string): Promise<RoutingRule[]> {
    const cached = this.rulesCache.get(companyId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.rules;
    }

    const rules = await this.findAll(companyId, RuleStatus.ACTIVE);
    this.rulesCache.set(companyId, {
      rules,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return rules;
  }

  private invalidateCache(companyId: string): void {
    this.rulesCache.delete(companyId);
  }

  private async recordMatch(ruleId: string, processingTimeMs: number): Promise<void> {
    await this.prisma.routingRule.update({
      where: { id: ruleId },
      data: {
        matchCount: { increment: 1 },
        lastMatchedAt: new Date(),
        // Update rolling average (simplified)
        avgProcessingTimeMs: processingTimeMs,
      },
    });
  }

  private async logDecision(
    companyId: string,
    context: TransactionContext,
    decision: RoutingDecision,
  ): Promise<void> {
    await this.prisma.routingDecision.create({
      data: {
        companyId,
        transactionId: (context.metadata?.transactionId as string) || 'unknown',
        primaryAccountId: decision.routeToAccountId,
        primaryAccountName: undefined, // Would need to look up
        fallbackAccountIds: decision.fallbackAccountIds || [],
        blocked: decision.blocked,
        blockReason: decision.blockReason,
        flaggedForReview: decision.flaggedForReview,
        reviewReason: decision.reviewReason,
        require3ds: decision.require3ds,
        surchargeAmount: decision.surchargeAmount,
        discountAmount: decision.discountAmount,
        originalAmount: context.amount,
        finalAmount: decision.finalAmount,
        appliedRuleIds: decision.appliedRules.map(r => r.id),
        appliedRuleNames: decision.appliedRules.map(r => r.name),
        evaluationTimeMs: decision.evaluationTimeMs,
        conditionsChecked: decision.conditionsChecked,
        rulesEvaluated: decision.rulesEvaluated,
        contextSnapshot: context as any,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // RULE ORDERING
  // ═══════════════════════════════════════════════════════════════

  async reorderRules(
    companyId: string,
    ruleOrder: Array<{ id: string; priority: number }>,
  ): Promise<void> {
    await this.prisma.$transaction(
      ruleOrder.map(({ id, priority }) =>
        this.prisma.routingRule.update({
          where: { id },
          data: { priority },
        }),
      ),
    );

    this.invalidateCache(companyId);
    this.logger.log(`Reordered ${ruleOrder.length} rules for company ${companyId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private mapToRoutingRule(data: any): RoutingRule {
    return {
      id: data.id,
      companyId: data.companyId,
      name: data.name,
      description: data.description,
      color: data.color,
      tags: data.tags || [],
      status: data.status as RuleStatus,
      priority: data.priority,
      conditions: data.conditions as any,
      actions: data.actions as any,
      fallback: data.fallbackAction ? {
        action: data.fallbackAction,
        poolId: data.fallbackPoolId,
        message: data.fallbackMessage,
      } : undefined,
      testing: data.testingEnabled ? {
        enabled: data.testingEnabled,
        trafficPercentage: data.testingTrafficPct,
        controlPoolId: data.testingControlPoolId,
        testPoolId: data.testingTestPoolId,
        startDate: data.testingStartDate,
        endDate: data.testingEndDate,
        metrics: data.testingMetrics,
      } : undefined,
      schedule: (data.activateAt || data.deactivateAt) ? {
        activateAt: data.activateAt,
        deactivateAt: data.deactivateAt,
        timezone: data.timezone,
        recurringSchedule: data.recurringSchedule,
      } : undefined,
      matchCount: data.matchCount,
      lastMatchedAt: data.lastMatchedAt,
      avgProcessingTimeMs: data.avgProcessingTimeMs,
      version: data.version,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      createdBy: data.createdBy,
    };
  }
}
