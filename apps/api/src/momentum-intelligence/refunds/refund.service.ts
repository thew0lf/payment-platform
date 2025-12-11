import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RefundStatus,
  RefundType,
  RefundReason,
  RefundMethod,
  ApprovalLevel,
  Refund,
  RefundPolicy,
  CreateRefundDto,
  ApproveRefundDto,
  RejectRefundDto,
  BulkRefundDto,
  GetRefundsDto,
  RefundAnalyticsDto,
  RefundAnalytics,
} from '../types/refund.types';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // REFUND CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  async createRefund(dto: CreateRefundDto): Promise<Refund> {
    this.logger.log(`Creating refund for order ${dto.orderId}`);

    // Get company refund policy
    const policy = await this.getRefundPolicy(dto.companyId);

    // Validate refund eligibility
    await this.validateRefundEligibility(dto, policy);

    // Check for auto-approval
    const autoApprovalResult = await this.checkAutoApproval(dto, policy);

    // Create the refund
    const refund: Refund = {
      id: this.generateRefundId(),
      companyId: dto.companyId,
      customerId: dto.customerId,
      orderId: dto.orderId,
      rmaId: dto.rmaId,
      csSessionId: dto.csSessionId,

      type: autoApprovalResult.isAutoApproved ? RefundType.AUTO : RefundType.MANUAL,
      status: autoApprovalResult.isAutoApproved ? RefundStatus.APPROVED : RefundStatus.PENDING,
      reason: dto.reason,
      reasonDetails: dto.reasonDetails,

      amount: {
        requested: dto.amount,
        approved: autoApprovalResult.isAutoApproved ? dto.amount : 0,
        currency: 'USD',
        breakdown: {
          productAmount: dto.amount,
          shippingAmount: 0,
          taxAmount: 0,
        },
      },
      method: dto.method || RefundMethod.ORIGINAL_PAYMENT,

      approval: {
        level: autoApprovalResult.approvalLevel,
        approvedBy: autoApprovalResult.isAutoApproved ? 'SYSTEM' : undefined,
        approvedAt: autoApprovalResult.isAutoApproved ? new Date() : undefined,
        autoApprovalRule: autoApprovalResult.ruleName,
      },

      processing: {},

      metadata: {
        initiatedBy: 'customer',
        channel: dto.metadata?.channel,
        tags: dto.metadata?.tags,
      },

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // If auto-approved, start processing
    if (autoApprovalResult.isAutoApproved) {
      await this.processRefund(refund);
    }

    // Emit refund created event
    this.eventEmitter.emit('refund.created', {
      refundId: refund.id,
      orderId: dto.orderId,
      amount: dto.amount,
      autoApproved: autoApprovalResult.isAutoApproved,
    });

    this.logger.log(`Refund ${refund.id} created with status ${refund.status}`);
    return refund;
  }

  async createBulkRefund(dto: BulkRefundDto): Promise<{ refunds: Refund[]; summary: { total: number; approved: number; pending: number } }> {
    this.logger.log(`Creating bulk refund for ${dto.refunds.length} orders`);

    const refunds: Refund[] = [];
    let approved = 0;
    let pending = 0;

    for (const refundItem of dto.refunds) {
      const refund = await this.createRefund({
        companyId: dto.companyId,
        customerId: refundItem.customerId,
        orderId: refundItem.orderId,
        reason: dto.reason,
        reasonDetails: dto.reasonDetails,
        amount: refundItem.amount,
        items: refundItem.items,
      });

      refunds.push(refund);

      if (refund.status === RefundStatus.APPROVED || refund.status === RefundStatus.COMPLETED) {
        approved++;
      } else {
        pending++;
      }
    }

    // Emit bulk refund event
    this.eventEmitter.emit('refund.bulk.created', {
      companyId: dto.companyId,
      totalRefunds: refunds.length,
      totalAmount: refunds.reduce((sum, r) => sum + r.amount.requested, 0),
    });

    return {
      refunds,
      summary: {
        total: refunds.length,
        approved,
        pending,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPROVAL WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  async approveRefund(dto: ApproveRefundDto): Promise<Refund> {
    const refund = await this.getRefund(dto.refundId);

    if (!refund) {
      throw new NotFoundException(`Refund ${dto.refundId} not found`);
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException(`Refund is not pending approval`);
    }

    refund.status = RefundStatus.APPROVED;
    refund.amount.approved = dto.approvedAmount || refund.amount.requested;
    refund.approval.approvedAt = new Date();
    refund.approval.notes = dto.notes;
    refund.updatedAt = new Date();

    // Start processing the refund
    await this.processRefund(refund);

    // Emit approval event
    this.eventEmitter.emit('refund.approved', {
      refundId: refund.id,
      approvedAmount: refund.amount.approved,
    });

    return refund;
  }

  async rejectRefund(dto: RejectRefundDto): Promise<Refund> {
    const refund = await this.getRefund(dto.refundId);

    if (!refund) {
      throw new NotFoundException(`Refund ${dto.refundId} not found`);
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException(`Refund is not pending approval`);
    }

    refund.status = RefundStatus.REJECTED;
    refund.approval.rejectedAt = new Date();
    refund.approval.rejectionReason = dto.reason;
    refund.updatedAt = new Date();

    // Emit rejection event
    this.eventEmitter.emit('refund.rejected', {
      refundId: refund.id,
      reason: dto.reason,
      alternativeOffered: dto.suggestAlternative,
    });

    return refund;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REFUND PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════

  private async processRefund(refund: Refund): Promise<void> {
    this.logger.log(`Processing refund ${refund.id}`);

    refund.status = RefundStatus.PROCESSING;
    refund.updatedAt = new Date();

    try {
      // In production, this would call payment processor
      await this.simulatePaymentProcessorRefund(refund);

      refund.status = RefundStatus.COMPLETED;
      refund.processing.processedAt = new Date();
      refund.completedAt = new Date();

      // Emit completion event
      this.eventEmitter.emit('refund.completed', {
        refundId: refund.id,
        amount: refund.amount.approved,
        method: refund.method,
      });

      this.logger.log(`Refund ${refund.id} completed successfully`);
    } catch (error) {
      refund.status = RefundStatus.FAILED;
      refund.processing.failureReason = error instanceof Error ? error.message : 'Unknown error';
      refund.processing.retryCount = (refund.processing.retryCount || 0) + 1;

      // Emit failure event
      this.eventEmitter.emit('refund.failed', {
        refundId: refund.id,
        reason: refund.processing.failureReason,
      });

      this.logger.error(`Refund ${refund.id} failed: ${refund.processing.failureReason}`);
    }

    refund.updatedAt = new Date();
  }

  private async simulatePaymentProcessorRefund(refund: Refund): Promise<void> {
    // Simulate payment processor call
    await new Promise(resolve => setTimeout(resolve, 100));

    refund.processing.paymentProcessor = 'stripe';
    refund.processing.transactionId = `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION & AUTO-APPROVAL
  // ═══════════════════════════════════════════════════════════════════════════

  private async validateRefundEligibility(dto: CreateRefundDto, policy: RefundPolicy): Promise<void> {
    // Check if refunds are enabled
    if (!policy.enabled) {
      throw new BadRequestException('Refunds are not enabled for this company');
    }

    // Check amount
    if (dto.amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    // In production, would check:
    // - Order exists and belongs to customer
    // - Order is within refund period
    // - Items are eligible for refund
    // - Customer hasn't exceeded refund velocity limits
  }

  private async checkAutoApproval(
    dto: CreateRefundDto,
    policy: RefundPolicy,
  ): Promise<{
    isAutoApproved: boolean;
    approvalLevel: ApprovalLevel;
    ruleName?: string;
  }> {
    // Check each auto-approval rule
    for (const rule of policy.autoApprovalRules) {
      if (!rule.enabled) continue;

      const matches = await this.evaluateAutoApprovalRule(dto, rule);
      if (matches) {
        return {
          isAutoApproved: true,
          approvalLevel: rule.approvalLevel,
          ruleName: rule.name,
        };
      }
    }

    // Determine required approval level based on amount and tier limits
    let requiredLevel = ApprovalLevel.AI_REP;

    for (const tierLimit of policy.tierLimits) {
      if (dto.amount > tierLimit.maxSingleRefund) {
        switch (tierLimit.tier) {
          case 'AI_REP':
            requiredLevel = ApprovalLevel.AI_MANAGER;
            break;
          case 'AI_MANAGER':
            requiredLevel = ApprovalLevel.HUMAN_MANAGER;
            break;
          case 'HUMAN_MANAGER':
            requiredLevel = ApprovalLevel.FINANCE;
            break;
        }
      }
    }

    return {
      isAutoApproved: false,
      approvalLevel: requiredLevel,
    };
  }

  private async evaluateAutoApprovalRule(
    dto: CreateRefundDto,
    rule: RefundPolicy['autoApprovalRules'][0],
  ): Promise<boolean> {
    // Check amount limit
    if (dto.amount > rule.maxAmount) {
      return false;
    }

    // Evaluate each condition
    for (const condition of rule.conditions) {
      const matches = await this.evaluateCondition(dto, condition);
      if (!matches) {
        return false;
      }
    }

    return true;
  }

  private async evaluateCondition(
    dto: CreateRefundDto,
    condition: RefundPolicy['autoApprovalRules'][0]['conditions'][0],
  ): Promise<boolean> {
    switch (condition.field) {
      case 'amount':
        return this.compareValue(dto.amount, condition.operator, condition.value as number);
      case 'reason':
        if (condition.operator === 'in' && Array.isArray(condition.value)) {
          return (condition.value as string[]).includes(dto.reason);
        }
        return dto.reason === condition.value;
      default:
        return true;
    }
  }

  private compareValue(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'greater_than':
        return actual > expected;
      case 'less_than':
        return actual < expected;
      default:
        return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async getRefund(refundId: string): Promise<Refund | null> {
    const dbRefund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: true,
        customer: true,
      },
    });

    if (!dbRefund) {
      return null;
    }

    return this.mapDbRefundToRefund(dbRefund);
  }

  async getRefunds(dto: GetRefundsDto): Promise<{ refunds: Refund[]; total: number }> {
    // Build where clause with filters
    const where: any = { companyId: dto.companyId };

    if (dto.status) where.status = dto.status;
    if (dto.type) where.type = dto.type;
    if (dto.customerId) where.customerId = dto.customerId;
    if (dto.orderId) where.orderId = dto.orderId;
    if (dto.reason) where.reason = dto.reason;

    // Amount filters
    if (dto.minAmount !== undefined || dto.maxAmount !== undefined) {
      where.requestedAmount = {};
      if (dto.minAmount !== undefined) where.requestedAmount.gte = dto.minAmount;
      if (dto.maxAmount !== undefined) where.requestedAmount.lte = dto.maxAmount;
    }

    // Date range filters
    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) where.createdAt.gte = new Date(dto.startDate);
      if (dto.endDate) where.createdAt.lte = new Date(dto.endDate);
    }

    // Fetch total count and refunds in parallel
    const [total, dbRefunds] = await Promise.all([
      this.prisma.refund.count({ where }),
      this.prisma.refund.findMany({
        where,
        include: {
          order: true,
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
        take: dto.limit || 20,
        skip: dto.offset || 0,
      }),
    ]);

    const refunds = dbRefunds.map(r => this.mapDbRefundToRefund(r));

    return { refunds, total };
  }

  /**
   * Map database Refund model to Refund interface
   */
  private mapDbRefundToRefund(dbRefund: any): Refund {
    const amountBreakdown = (dbRefund.amountBreakdown as any) || {};

    return {
      id: dbRefund.id,
      companyId: dbRefund.companyId,
      customerId: dbRefund.customerId,
      orderId: dbRefund.orderId,
      rmaId: dbRefund.rmaId || undefined,
      csSessionId: dbRefund.csSessionId || undefined,
      type: dbRefund.type as RefundType,
      status: dbRefund.status as RefundStatus,
      reason: dbRefund.reason as RefundReason,
      reasonDetails: dbRefund.reasonDetails || undefined,
      amount: {
        requested: Number(dbRefund.requestedAmount),
        approved: Number(dbRefund.approvedAmount || 0),
        currency: dbRefund.currency,
        breakdown: {
          productAmount: amountBreakdown.productAmount || 0,
          shippingAmount: amountBreakdown.shippingAmount || 0,
          taxAmount: amountBreakdown.taxAmount || 0,
          fees: amountBreakdown.fees,
          adjustments: amountBreakdown.adjustments,
        },
      },
      method: dbRefund.method as RefundMethod,
      approval: {
        level: dbRefund.approvalLevel as ApprovalLevel,
        approvedBy: dbRefund.approvedBy || undefined,
        approvedAt: dbRefund.approvedAt ? new Date(dbRefund.approvedAt) : undefined,
        rejectedBy: dbRefund.rejectedBy || undefined,
        rejectedAt: dbRefund.rejectedAt ? new Date(dbRefund.rejectedAt) : undefined,
        rejectionReason: dbRefund.rejectionReason || undefined,
        autoApprovalRule: dbRefund.autoApprovalRule || undefined,
      },
      processing: {
        paymentProcessor: dbRefund.paymentProcessor || undefined,
        transactionId: dbRefund.processorTransactionId || undefined,
        processedAt: dbRefund.processedAt ? new Date(dbRefund.processedAt) : undefined,
        failureReason: dbRefund.failureReason || undefined,
        retryCount: dbRefund.retryCount || 0,
      },
      metadata: {
        initiatedBy: dbRefund.initiatedBy as any,
        channel: (dbRefund as any).channel || undefined,
        customerImpact: (dbRefund as any).customerImpact || undefined,
        fraudScore: (dbRefund as any).fraudScore || undefined,
        tags: (dbRefund as any).tags || undefined,
      },
      createdAt: new Date(dbRefund.createdAt),
      updatedAt: new Date(dbRefund.updatedAt),
      completedAt: dbRefund.completedAt ? new Date(dbRefund.completedAt) : undefined,
    };
  }

  async getRefundPolicy(companyId: string): Promise<RefundPolicy> {
    // In production, fetch from database
    // Return default policy for now
    return {
      companyId,
      enabled: true,
      generalRules: {
        maxRefundPeriodDays: 30,
        allowPartialRefunds: true,
        requireRMA: false,
        requireReturnReceipt: false,
        restockingFee: 0,
        shippingRefundable: true,
        excludedCategories: [],
        excludedProducts: [],
        bulkRefundMinItems: 2,
        bulkRefundMaxItems: 100,
      },
      autoApprovalRules: [
        {
          id: 'rule_1',
          name: 'Small refunds auto-approve',
          enabled: true,
          priority: 1,
          conditions: [
            { field: 'amount', operator: 'less_than', value: 25 },
          ],
          maxAmount: 25,
          approvalLevel: ApprovalLevel.AUTO_APPROVED,
          description: 'Auto-approve refunds under $25',
        },
        {
          id: 'rule_2',
          name: 'Defective product auto-approve',
          enabled: true,
          priority: 2,
          conditions: [
            { field: 'reason', operator: 'equals', value: RefundReason.PRODUCT_DEFECT },
          ],
          maxAmount: 100,
          approvalLevel: ApprovalLevel.AUTO_APPROVED,
          description: 'Auto-approve defective product refunds up to $100',
        },
      ],
      tierLimits: [
        {
          tier: 'AI_REP',
          maxSingleRefund: 50,
          maxDailyRefunds: 20,
          maxDailyAmount: 500,
          requiresSecondApproval: false,
        },
        {
          tier: 'AI_MANAGER',
          maxSingleRefund: 200,
          maxDailyRefunds: 50,
          maxDailyAmount: 5000,
          requiresSecondApproval: true,
          secondApprovalThreshold: 150,
        },
        {
          tier: 'HUMAN_MANAGER',
          maxSingleRefund: 1000,
          maxDailyRefunds: 100,
          maxDailyAmount: 25000,
          requiresSecondApproval: true,
          secondApprovalThreshold: 500,
        },
        {
          tier: 'FINANCE',
          maxSingleRefund: 10000,
          maxDailyRefunds: 500,
          maxDailyAmount: 100000,
          requiresSecondApproval: true,
          secondApprovalThreshold: 5000,
        },
      ],
      reasonSpecificRules: [
        {
          reason: RefundReason.PRODUCT_DEFECT,
          requiresProof: true,
          proofTypes: ['photo'],
          maxRefundPercentage: 100,
          autoApprovalEligible: true,
          additionalApprovalRequired: false,
        },
        {
          reason: RefundReason.CUSTOMER_REQUEST,
          requiresProof: false,
          proofTypes: [],
          maxRefundPercentage: 85,
          autoApprovalEligible: false,
          additionalApprovalRequired: false,
        },
      ],
      notifications: {
        customerNotifications: {
          onRequest: true,
          onApproval: true,
          onRejection: true,
          onCompletion: true,
          channels: ['email'],
        },
        internalNotifications: {
          onHighValue: true,
          highValueThreshold: 500,
          onRejection: true,
          dailySummary: true,
          recipients: ['finance@company.com'],
          channels: ['email', 'slack'],
        },
      },
      fraudPrevention: {
        enabled: true,
        velocityChecks: {
          maxRefundsPerCustomerPerMonth: 3,
          maxAmountPerCustomerPerMonth: 300,
          maxRefundsPerOrderLifetime: 2,
        },
        suspiciousPatterns: {
          checkSerialReturner: true,
          serialReturnerThreshold: 5,
          checkHighValueOnly: true,
          highValueThreshold: 200,
          checkNewCustomers: true,
          newCustomerDays: 30,
        },
        actions: {
          flagForReview: true,
          requireManagerApproval: true,
          blockAutoApproval: true,
          notifyFraudTeam: true,
        },
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  async getAnalytics(dto: RefundAnalyticsDto): Promise<RefundAnalytics> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Fetch all refunds in the date range
    const refunds = await this.prisma.refund.findMany({
      where: {
        companyId: dto.companyId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    });

    // Calculate overview stats
    const totalRefunds = refunds.length;
    const totalAmount = refunds.reduce((sum, r) => sum + Number(r.requestedAmount), 0);
    const avgRefundAmount = totalRefunds > 0 ? totalAmount / totalRefunds : 0;
    const approvedRefunds = refunds.filter(r =>
      r.status === RefundStatus.APPROVED || r.status === RefundStatus.COMPLETED
    );
    const approvalRate = totalRefunds > 0 ? (approvedRefunds.length / totalRefunds) * 100 : 0;

    // Calculate average processing time (in hours)
    const completedRefunds = refunds.filter(r => r.status === RefundStatus.COMPLETED && r.completedAt);
    const avgProcessingTime = completedRefunds.length > 0
      ? completedRefunds.reduce((sum, r) => {
          const processingTime = (new Date(r.completedAt!).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
          return sum + processingTime;
        }, 0) / completedRefunds.length
      : 0;

    // Calculate by status
    const byStatus: Record<RefundStatus, { count: number; amount: number }> = {} as any;
    for (const status of Object.values(RefundStatus)) {
      const statusRefunds = refunds.filter(r => r.status === status);
      byStatus[status] = {
        count: statusRefunds.length,
        amount: statusRefunds.reduce((sum, r) => sum + Number(r.requestedAmount), 0),
      };
    }

    // Calculate by reason
    const reasonStats = new Map<string, { count: number; amount: number }>();
    for (const refund of refunds) {
      const reason = refund.reason;
      const current = reasonStats.get(reason) || { count: 0, amount: 0 };
      reasonStats.set(reason, {
        count: current.count + 1,
        amount: current.amount + Number(refund.requestedAmount),
      });
    }

    // Get previous period for trend calculation
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevEndDate = new Date(startDate.getTime() - 1);

    const prevRefunds = await this.prisma.refund.findMany({
      where: {
        companyId: dto.companyId,
        createdAt: { gte: prevStartDate, lte: prevEndDate },
      },
    });

    const prevReasonStats = new Map<string, number>();
    for (const refund of prevRefunds) {
      const reason = refund.reason;
      prevReasonStats.set(reason, (prevReasonStats.get(reason) || 0) + 1);
    }

    const byReason = Array.from(reasonStats.entries()).map(([reason, data]) => {
      const prevCount = prevReasonStats.get(reason) || 0;
      const trend = prevCount > 0 ? ((data.count - prevCount) / prevCount) * 100 : 0;
      return {
        reason: reason as RefundReason,
        count: data.count,
        amount: data.amount,
        avgAmount: data.count > 0 ? data.amount / data.count : 0,
        trend: Math.round(trend),
      };
    });

    // Calculate by method
    const byMethod: Record<RefundMethod, { count: number; amount: number }> = {} as any;
    for (const method of Object.values(RefundMethod)) {
      const methodRefunds = refunds.filter(r => r.method === method);
      byMethod[method] = {
        count: methodRefunds.length,
        amount: methodRefunds.reduce((sum, r) => sum + Number(r.requestedAmount), 0),
      };
    }

    // Calculate by approval level
    const approvalLevelStats = new Map<string, { count: number; amount: number; totalTime: number }>();
    for (const refund of completedRefunds) {
      const level = refund.approvalLevel;
      const current = approvalLevelStats.get(level) || { count: 0, amount: 0, totalTime: 0 };
      const processingTime = refund.completedAt
        ? (new Date(refund.completedAt).getTime() - new Date(refund.createdAt).getTime()) / (1000 * 60 * 60)
        : 0;
      approvalLevelStats.set(level, {
        count: current.count + 1,
        amount: current.amount + Number(refund.approvedAmount || refund.requestedAmount),
        totalTime: current.totalTime + processingTime,
      });
    }

    const byApprovalLevel = Array.from(approvalLevelStats.entries()).map(([level, data]) => ({
      level: level as ApprovalLevel,
      count: data.count,
      amount: data.amount,
      avgProcessingTime: data.count > 0 ? data.totalTime / data.count : 0,
    }));

    // Calculate daily trends
    const trends: { date: string; count: number; amount: number }[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayRefunds = refunds.filter(r => {
        const created = new Date(r.createdAt);
        return created >= currentDate && created < nextDate;
      });

      trends.push({
        date: currentDate.toISOString().split('T')[0],
        count: dayRefunds.length,
        amount: dayRefunds.reduce((sum, r) => sum + Number(r.requestedAmount), 0),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate fraud metrics from metadata
    const flaggedRefunds = refunds.filter(r => (r as any).metadata?.flaggedForFraud).length;
    const blockedRefunds = refunds.filter(r => (r as any).metadata?.blockedByFraud).length;

    // Get unique customers with refunds for suspicious pattern detection
    const customerRefundCounts = new Map<string, number>();
    for (const refund of refunds) {
      customerRefundCounts.set(refund.customerId, (customerRefundCounts.get(refund.customerId) || 0) + 1);
    }
    const suspiciousCustomers = Array.from(customerRefundCounts.values()).filter(count => count >= 3).length;

    // Calculate top refunded products
    const productRefundStats = new Map<string, { productId: string; productName: string; count: number; amount: number }>();
    for (const refund of refunds) {
      if (refund.order?.items) {
        for (const item of refund.order.items) {
          const productId = item.productId || item.sku;
          const current = productRefundStats.get(productId) || {
            productId,
            productName: item.name,
            count: 0,
            amount: 0,
          };
          current.count++;
          current.amount += Number(refund.requestedAmount);
          productRefundStats.set(productId, current);
        }
      }
    }

    const topRefundedProducts = Array.from(productRefundStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(p => ({
        productId: p.productId,
        productName: p.productName,
        refundCount: p.count,
        totalAmount: p.amount,
      }));

    // Calculate customer impact
    const uniqueCustomers = new Set(refunds.map(r => r.customerId));
    const repeatRefunders = Array.from(customerRefundCounts.values()).filter(count => count > 1).length;

    return {
      period: { start: startDate, end: endDate },
      overview: {
        totalRefunds,
        totalAmount,
        avgRefundAmount,
        approvalRate,
        avgProcessingTime,
      },
      byStatus,
      byReason,
      byMethod,
      byApprovalLevel,
      trends,
      fraudMetrics: {
        flaggedRefunds,
        suspiciousCustomers,
        blockedRefunds,
        falsePositives: 0, // Would need separate tracking
      },
      topRefundedProducts,
      customerImpact: {
        totalCustomersAffected: uniqueCustomers.size,
        repeatRefunders,
        avgRefundsPerCustomer: uniqueCustomers.size > 0 ? totalRefunds / uniqueCustomers.size : 0,
        customerSatisfactionPostRefund: 0, // Would need separate survey data
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private generateRefundId(): string {
    return `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
