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
    // In production, fetch from database
    return null;
  }

  async getRefunds(dto: GetRefundsDto): Promise<{ refunds: Refund[]; total: number }> {
    // In production, fetch from database with filters
    return { refunds: [], total: 0 };
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

    return {
      period: { start: startDate, end: endDate },
      overview: {
        totalRefunds: 450,
        totalAmount: 12500,
        avgRefundAmount: 27.78,
        approvalRate: 92,
        avgProcessingTime: 1.5,
      },
      byStatus: {
        [RefundStatus.PENDING]: { count: 15, amount: 425 },
        [RefundStatus.APPROVED]: { count: 10, amount: 280 },
        [RefundStatus.PROCESSING]: { count: 5, amount: 150 },
        [RefundStatus.COMPLETED]: { count: 400, amount: 11200 },
        [RefundStatus.REJECTED]: { count: 18, amount: 420 },
        [RefundStatus.CANCELLED]: { count: 2, amount: 25 },
        [RefundStatus.FAILED]: { count: 0, amount: 0 },
      },
      byReason: [
        { reason: RefundReason.PRODUCT_DEFECT, count: 120, amount: 3200, avgAmount: 26.67, trend: -5 },
        { reason: RefundReason.WRONG_ITEM, count: 85, amount: 2400, avgAmount: 28.24, trend: 2 },
        { reason: RefundReason.NOT_AS_DESCRIBED, count: 75, amount: 2100, avgAmount: 28.00, trend: -3 },
        { reason: RefundReason.SHIPPING_DAMAGE, count: 60, amount: 1800, avgAmount: 30.00, trend: 0 },
        { reason: RefundReason.CUSTOMER_REQUEST, count: 110, amount: 3000, avgAmount: 27.27, trend: 5 },
      ],
      byMethod: {
        [RefundMethod.ORIGINAL_PAYMENT]: { count: 350, amount: 9800 },
        [RefundMethod.STORE_CREDIT]: { count: 80, amount: 2200 },
        [RefundMethod.GIFT_CARD]: { count: 20, amount: 500 },
        [RefundMethod.CHECK]: { count: 0, amount: 0 },
        [RefundMethod.BANK_TRANSFER]: { count: 0, amount: 0 },
      },
      byApprovalLevel: [
        { level: ApprovalLevel.AUTO_APPROVED, count: 280, amount: 5600, avgProcessingTime: 0.1 },
        { level: ApprovalLevel.AI_REP, count: 80, amount: 2800, avgProcessingTime: 0.5 },
        { level: ApprovalLevel.AI_MANAGER, count: 60, amount: 2800, avgProcessingTime: 2.0 },
        { level: ApprovalLevel.HUMAN_MANAGER, count: 25, amount: 1100, avgProcessingTime: 8.0 },
        { level: ApprovalLevel.FINANCE, count: 5, amount: 200, avgProcessingTime: 24.0 },
      ],
      trends: [
        { date: '2024-01-01', count: 15, amount: 420 },
        { date: '2024-01-02', count: 18, amount: 495 },
        { date: '2024-01-03', count: 12, amount: 330 },
      ],
      fraudMetrics: {
        flaggedRefunds: 12,
        suspiciousCustomers: 5,
        blockedRefunds: 3,
        falsePositives: 2,
      },
      topRefundedProducts: [
        { productId: 'prod_1', productName: 'Coffee Subscription Box', refundCount: 45, totalAmount: 1200 },
        { productId: 'prod_2', productName: 'Premium Blend Pack', refundCount: 32, totalAmount: 960 },
        { productId: 'prod_3', productName: 'Single Origin Sampler', refundCount: 28, totalAmount: 700 },
      ],
      customerImpact: {
        totalCustomersAffected: 380,
        repeatRefunders: 45,
        avgRefundsPerCustomer: 1.18,
        customerSatisfactionPostRefund: 4.2,
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
