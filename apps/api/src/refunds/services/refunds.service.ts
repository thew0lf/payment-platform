import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateRefundDto,
  UpdateRefundDto,
  RefundQueryParams,
  RefundStatsResult,
  UpdateRefundSettingsDto,
  Refund,
  RefundSettings,
  ApproveRefundDto,
  RejectRefundDto,
} from '../types/refund.types';
import {
  PaginationService,
  CursorPaginatedResponse,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
} from '../../common/pagination';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // REFUND NUMBER GENERATION
  // ═══════════════════════════════════════════════════════════════

  private async generateRefundNumber(): Promise<string> {
    const count = await this.prisma.refund.count();
    const nextNumber = count + 1;
    return `RF-${nextNumber.toString().padStart(5, '0')}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════

  async create(companyId: string, dto: CreateRefundDto, userId: string): Promise<Refund> {
    // Verify order exists and belongs to company
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, companyId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }

    // Verify customer matches order
    if (order.customerId !== dto.customerId) {
      throw new BadRequestException('Customer does not match order');
    }

    // Get refund settings to check auto-approval rules
    const settings = await this.getSettings(companyId);

    // Calculate approval level and auto-approval
    let status = 'PENDING';
    let approvalLevel = 'TIER_1'; // Default
    let autoApprovalRule: string | undefined;
    let approvedAt: Date | undefined;
    let approvedBy: string | undefined;

    if (settings.autoApprovalEnabled) {
      const orderDate = new Date(order.orderedAt);
      const daysSinceOrder = Math.floor(
        (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Auto-approve if within limits
      if (
        dto.requestedAmount <= Number(settings.autoApprovalMaxAmount) &&
        daysSinceOrder <= settings.autoApprovalMaxDays
      ) {
        status = 'APPROVED';
        autoApprovalRule = `AUTO_APPROVED: Amount ${dto.requestedAmount} <= ${settings.autoApprovalMaxAmount}, Days ${daysSinceOrder} <= ${settings.autoApprovalMaxDays}`;
        approvedAt = new Date();
        approvedBy = 'SYSTEM_AUTO_APPROVAL';
        this.logger.log(`Auto-approved refund for order ${dto.orderId}: ${autoApprovalRule}`);
      }
    }

    // Determine approval level based on amount
    if (dto.requestedAmount >= 500) {
      approvalLevel = 'TIER_3';
    } else if (dto.requestedAmount >= 100) {
      approvalLevel = 'TIER_2';
    }

    const refund = await this.prisma.refund.create({
      data: {
        companyId,
        customerId: dto.customerId,
        orderId: dto.orderId,
        rmaId: dto.rmaId,
        csSessionId: dto.csSessionId,
        type: dto.type,
        status: status as any,
        reason: dto.reason,
        reasonDetails: dto.reasonDetails,
        requestedAmount: dto.requestedAmount,
        approvedAmount: status === 'APPROVED' ? dto.requestedAmount : undefined,
        currency: dto.currency || 'USD',
        amountBreakdown: (dto.amountBreakdown || {}) as Prisma.JsonObject,
        method: dto.method || 'ORIGINAL_PAYMENT',
        approvalLevel,
        approvedAt,
        approvedBy,
        autoApprovalRule,
        initiatedBy: dto.initiatedBy,
        channel: dto.channel,
        customerImpact: dto.customerImpact,
        fraudScore: dto.fraudScore,
        tags: dto.tags || [],
      },
    });

    this.logger.log(
      `Created refund ${refund.id} for order ${dto.orderId} by user ${userId}`,
    );

    return this.mapToRefund(refund);
  }

  // ═══════════════════════════════════════════════════════════════
  // READ
  // ═══════════════════════════════════════════════════════════════

  async list(
    companyId: string | undefined,
    query: RefundQueryParams,
  ): Promise<{ refunds: Refund[]; total: number } | CursorPaginatedResponse<Refund>> {
    const where: Prisma.RefundWhereInput = {};

    // Only filter by companyId if provided (undefined = all refunds for org/client admins)
    if (companyId) {
      where.companyId = companyId;
    }

    if (query.customerId) where.customerId = query.customerId;
    if (query.orderId) where.orderId = query.orderId;
    if (query.status) where.status = query.status as any;
    if (query.type) where.type = query.type as any;
    if (query.reason) where.reason = query.reason as any;
    if (query.initiatedBy) where.initiatedBy = query.initiatedBy;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    if (query.search) {
      where.OR = [
        { id: { contains: query.search, mode: 'insensitive' } },
        { orderId: { contains: query.search, mode: 'insensitive' } },
        { customerId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Use cursor pagination if cursor is provided, otherwise fall back to offset
    if (query.cursor) {
      return this.listWithCursor(where, query);
    }

    // Legacy offset pagination (for backwards compatibility)
    const limit = Math.min(query.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const offset = query.offset || 0;

    const [refunds, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.refund.count({ where }),
    ]);

    return {
      refunds: refunds.map(this.mapToRefund.bind(this)),
      total,
    };
  }

  /**
   * Get refunds with cursor-based pagination (scalable for millions of rows)
   */
  private async listWithCursor(
    baseWhere: Prisma.RefundWhereInput,
    query: RefundQueryParams,
  ): Promise<CursorPaginatedResponse<Refund>> {
    const { limit, cursorWhere, orderBy } = this.paginationService.parseCursor(
      { cursor: query.cursor, limit: query.limit },
      'createdAt',
      'desc',
    );

    // Merge base where with cursor where
    const where = cursorWhere.OR
      ? { AND: [baseWhere, cursorWhere] }
      : { ...baseWhere, ...cursorWhere };

    // Fetch one extra to determine if there are more pages
    const refunds = await this.prisma.refund.findMany({
      where,
      orderBy,
      take: limit + 1,
    });

    const mappedRefunds = refunds.map(this.mapToRefund.bind(this)) as (Refund & { id: string })[];

    return this.paginationService.createResponse(
      mappedRefunds,
      limit,
      { cursor: query.cursor, limit: query.limit },
      'createdAt',
    );
  }

  async get(id: string, companyId: string): Promise<Refund> {
    const refund = await this.prisma.refund.findFirst({
      where: { id, companyId },
      include: {
        order: {
          select: {
            orderNumber: true,
            total: true,
            currency: true,
            status: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException(`Refund ${id} not found`);
    }

    return this.mapToRefund(refund);
  }

  // ═══════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════

  async getStats(
    companyId: string | undefined,
    startDate?: Date,
    endDate?: Date,
  ): Promise<RefundStatsResult> {
    const where: Prisma.RefundWhereInput = {};

    // Only filter by companyId if provided (undefined = all refunds for org/client admins)
    if (companyId) {
      where.companyId = companyId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Build completed refunds where clause carefully to avoid overwriting createdAt
    const completedWhere: Prisma.RefundWhereInput = {
      ...where,
      status: 'COMPLETED',
      completedAt: { not: null },
    };
    // If we have date filters, merge them with AND
    if (where.createdAt) {
      completedWhere.AND = [
        { createdAt: where.createdAt },
      ];
    }

    const [statusCounts, amountData, completedRefunds] = await Promise.all([
      this.prisma.refund.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.refund.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { approvedAmount: true },
        _count: true,
      }),
      this.prisma.refund.findMany({
        where: completedWhere,
        select: {
          createdAt: true,
          completedAt: true,
        },
      }),
    ]);

    const statusMap = new Map(statusCounts.map((s) => [s.status, s._count]));
    const totalRefunds = statusCounts.reduce((sum, s) => sum + s._count, 0);
    const totalRefundedAmount = Number(amountData._sum.approvedAmount || 0);

    // Calculate average processing time (in hours)
    let averageProcessingTime: number | undefined;
    if (completedRefunds.length > 0) {
      const totalProcessingTime = completedRefunds.reduce((sum, refund) => {
        const created = new Date(refund.createdAt).getTime();
        const completed = new Date(refund.completedAt!).getTime();
        return sum + (completed - created);
      }, 0);
      averageProcessingTime =
        totalProcessingTime / completedRefunds.length / (1000 * 60 * 60); // Convert to hours
    }

    return {
      totalRefunds,
      pendingRefunds: statusMap.get('PENDING') || 0,
      approvedRefunds: statusMap.get('APPROVED') || 0,
      processingRefunds: statusMap.get('PROCESSING') || 0,
      completedRefunds: statusMap.get('COMPLETED') || 0,
      rejectedRefunds: statusMap.get('REJECTED') || 0,
      cancelledRefunds: statusMap.get('CANCELLED') || 0,
      failedRefunds: statusMap.get('FAILED') || 0,
      totalRefundedAmount,
      averageRefundAmount:
        amountData._count > 0 ? totalRefundedAmount / amountData._count : 0,
      averageProcessingTime,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // APPROVE / REJECT
  // ═══════════════════════════════════════════════════════════════

  async approve(
    id: string,
    companyId: string,
    userId: string,
    dto: ApproveRefundDto,
  ): Promise<Refund> {
    const existing = await this.prisma.refund.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Refund ${id} not found`);
    }

    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot approve refund with status ${existing.status}`,
      );
    }

    const approvedAmount =
      dto.approvedAmount ?? Number(existing.requestedAmount);

    const refund = await this.prisma.refund.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAmount,
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    this.logger.log(
      `Refund ${id} approved by user ${userId} for amount ${approvedAmount}`,
    );

    return this.mapToRefund(refund);
  }

  async reject(
    id: string,
    companyId: string,
    userId: string,
    dto: RejectRefundDto,
  ): Promise<Refund> {
    const existing = await this.prisma.refund.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Refund ${id} not found`);
    }

    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot reject refund with status ${existing.status}`,
      );
    }

    const refund = await this.prisma.refund.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason: dto.rejectionReason,
      },
    });

    this.logger.log(`Refund ${id} rejected by user ${userId}`);

    return this.mapToRefund(refund);
  }

  // ═══════════════════════════════════════════════════════════════
  // PROCESS
  // ═══════════════════════════════════════════════════════════════

  async process(id: string, companyId: string, userId: string): Promise<Refund> {
    const existing = await this.prisma.refund.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Refund ${id} not found`);
    }

    if (existing.status !== 'APPROVED') {
      throw new BadRequestException(
        `Cannot process refund with status ${existing.status}. Refund must be approved first.`,
      );
    }

    // Start processing
    const refund = await this.prisma.refund.update({
      where: { id },
      data: {
        status: 'PROCESSING',
      },
    });

    this.logger.log(`Refund ${id} set to processing by user ${userId}`);

    // In a real implementation, you would integrate with payment processor here
    // For now, we'll just mark it as completed
    // TODO: Add payment processor integration

    // Simulate successful processing - in real app this would be done by webhook
    const completed = await this.prisma.refund.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        completedAt: new Date(),
      },
    });

    this.logger.log(`Refund ${id} completed successfully`);

    return this.mapToRefund(completed);
  }

  // ═══════════════════════════════════════════════════════════════
  // CANCEL
  // ═══════════════════════════════════════════════════════════════

  async cancel(id: string, companyId: string, userId: string): Promise<Refund> {
    const existing = await this.prisma.refund.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException(`Refund ${id} not found`);
    }

    if (!['PENDING', 'APPROVED'].includes(existing.status)) {
      throw new BadRequestException(
        `Cannot cancel refund with status ${existing.status}`,
      );
    }

    const refund = await this.prisma.refund.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    this.logger.log(`Refund ${id} cancelled by user ${userId}`);

    return this.mapToRefund(refund);
  }

  // ═══════════════════════════════════════════════════════════════
  // REFUND SETTINGS
  // ═══════════════════════════════════════════════════════════════

  async getSettings(companyId: string): Promise<RefundSettings> {
    let settings = await this.prisma.refundSettings.findUnique({
      where: { companyId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await this.prisma.refundSettings.create({
        data: {
          companyId,
          autoApprovalEnabled: false,
          autoApprovalMaxAmount: 100.0,
          autoApprovalMaxDays: 30,
          requireReason: true,
          requireApproval: true,
          allowPartialRefunds: true,
          notifyOnRequest: true,
          notifyOnApproval: true,
          notifyOnCompletion: true,
        },
      });
    }

    return this.mapToRefundSettings(settings);
  }

  async updateSettings(
    companyId: string,
    dto: UpdateRefundSettingsDto,
  ): Promise<RefundSettings> {
    // Ensure settings exist first
    await this.getSettings(companyId);

    const settings = await this.prisma.refundSettings.update({
      where: { companyId },
      data: {
        ...dto,
      },
    });

    this.logger.log(`Updated refund settings for company ${companyId}`);

    return this.mapToRefundSettings(settings);
  }

  // ═══════════════════════════════════════════════════════════════
  // MAPPING
  // ═══════════════════════════════════════════════════════════════

  private mapToRefund(data: any): Refund {
    return {
      id: data.id,
      companyId: data.companyId,
      customerId: data.customerId,
      orderId: data.orderId,
      rmaId: data.rmaId,
      csSessionId: data.csSessionId,
      type: data.type,
      status: data.status,
      reason: data.reason,
      reasonDetails: data.reasonDetails,
      requestedAmount: Number(data.requestedAmount),
      approvedAmount: data.approvedAmount ? Number(data.approvedAmount) : undefined,
      currency: data.currency,
      amountBreakdown: data.amountBreakdown as Record<string, unknown>,
      method: data.method,
      approvalLevel: data.approvalLevel,
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt,
      rejectedBy: data.rejectedBy,
      rejectedAt: data.rejectedAt,
      rejectionReason: data.rejectionReason,
      autoApprovalRule: data.autoApprovalRule,
      paymentProcessor: data.paymentProcessor,
      processorTransactionId: data.processorTransactionId,
      processedAt: data.processedAt,
      failureReason: data.failureReason,
      retryCount: data.retryCount,
      initiatedBy: data.initiatedBy,
      channel: data.channel,
      customerImpact: data.customerImpact,
      fraudScore: data.fraudScore ? Number(data.fraudScore) : undefined,
      tags: data.tags,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      completedAt: data.completedAt,
    };
  }

  private mapToRefundSettings(data: any): RefundSettings {
    return {
      id: data.id,
      companyId: data.companyId,
      autoApprovalEnabled: data.autoApprovalEnabled,
      autoApprovalMaxAmount: Number(data.autoApprovalMaxAmount),
      autoApprovalMaxDays: data.autoApprovalMaxDays,
      requireReason: data.requireReason,
      requireApproval: data.requireApproval,
      allowPartialRefunds: data.allowPartialRefunds,
      notifyOnRequest: data.notifyOnRequest,
      notifyOnApproval: data.notifyOnApproval,
      notifyOnCompletion: data.notifyOnCompletion,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
