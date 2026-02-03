import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { AuditAction, AuditEntity } from '../../audit-logs/types/audit-log.types';
import { DataClassification, Prisma, AffiliatePayoutStatus } from '@prisma/client';
import {
  CreatePayoutBatchDto,
  CreateSinglePayoutDto,
  UpdatePayoutDto,
  UpdatePayoutStatusDto,
  ProcessPayoutDto,
  PayoutQueryDto,
  CalculatePendingDto,
  PendingPayoutSummaryDto,
} from '../dto/payout.dto';

@Injectable()
export class AffiliatePayoutsService {
  private readonly logger = new Logger(AffiliatePayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditLogsService: AuditLogsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /**
   * List payouts with filters
   */
  async findAll(user: UserContext, filters: PayoutQueryDto) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    let targetCompanyIds = companyIds;
    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const where: Prisma.AffiliatePayoutWhereInput = {
      companyId: { in: targetCompanyIds },
    };

    if (filters.partnerId) {
      where.partnerId = filters.partnerId;
    }

    if (filters.status) {
      where.status = filters.status as AffiliatePayoutStatus;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const limit = Math.min(parseInt(filters.limit || '50', 10), 100);
    const offset = parseInt(filters.offset || '0', 10);

    const [payouts, total] = await Promise.all([
      this.prisma.affiliatePayout.findMany({
        where,
        include: {
          partner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
              affiliateCode: true,
              payoutMethod: true,
            },
          },
          company: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.affiliatePayout.count({ where }),
    ]);

    return { payouts, total, limit, offset };
  }

  /**
   * Get a single payout by ID
   */
  async findById(user: UserContext, payoutId: string) {
    const payout = await this.prisma.affiliatePayout.findUnique({
      where: { id: payoutId },
      include: {
        partner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
            affiliateCode: true,
            payoutMethod: true,
            payoutDetails: true,
          },
        },
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    // Verify user has access to this company
    await this.hierarchyService.validateCompanyAccess(
      user,
      payout.companyId,
      'view affiliate payout',
    );

    return payout;
  }

  /**
   * Create a batch of payouts for partners that have reached threshold
   */
  async createBatch(user: UserContext, dto: CreatePayoutBatchDto) {
    // Validate company access
    await this.hierarchyService.validateCompanyAccess(
      user,
      dto.companyId,
      'create affiliate payouts',
    );

    // Handle idempotency - include key parameters to detect mismatched duplicate requests
    if (dto.idempotencyKey) {
      // Include company, period, and minimum amount in key to ensure uniqueness
      const idempotencyFullKey = `affiliate-payout-batch:${dto.companyId}:${dto.period.startDate}:${dto.period.endDate}:${dto.minimumAmount || 'default'}:${dto.idempotencyKey}`;
      const result = await this.idempotencyService.checkAndLock(idempotencyFullKey);
      if (result.isDuplicate) {
        return result.cachedResult;
      }
    }

    // Get company config for minimum payout threshold
    const config = await this.prisma.affiliateProgramConfig.findUnique({
      where: { companyId: dto.companyId },
    });

    const minimumPayoutThreshold = dto.minimumAmount ?? config?.minimumPayoutThreshold ?? 50;

    // Find eligible partners
    const partnerWhere: Prisma.AffiliatePartnerWhereInput = {
      companyId: dto.companyId,
      status: 'ACTIVE',
      currentBalance: { gte: minimumPayoutThreshold },
      deletedAt: null,
    };

    if (dto.partnerIds?.length) {
      partnerWhere.id = { in: dto.partnerIds };
    }

    const eligiblePartners = await this.prisma.affiliatePartner.findMany({
      where: partnerWhere,
      select: {
        id: true,
        currentBalance: true,
        payoutMethod: true,
        payoutThreshold: true,
      },
    });

    if (eligiblePartners.length === 0) {
      const result = { payouts: [], count: 0, message: 'No eligible partners found' };
      if (dto.idempotencyKey) {
        const idempotencyFullKey = `affiliate-payout-batch:${dto.companyId}:${dto.period.startDate}:${dto.period.endDate}:${dto.minimumAmount || 'default'}:${dto.idempotencyKey}`;
        await this.idempotencyService.complete(idempotencyFullKey, result);
      }
      return result;
    }

    // Get approved conversions for the period
    const conversions = await this.prisma.affiliateConversion.groupBy({
      by: ['partnerId'],
      where: {
        companyId: dto.companyId,
        partnerId: { in: eligiblePartners.map((p) => p.id) },
        status: 'APPROVED',
        convertedAt: {
          gte: dto.period.startDate,
          lte: dto.period.endDate,
        },
      },
      _count: true,
      _sum: {
        commissionAmount: true,
      },
    });

    // Get reversals for the period
    const reversals = await this.prisma.affiliateConversion.groupBy({
      by: ['partnerId'],
      where: {
        companyId: dto.companyId,
        partnerId: { in: eligiblePartners.map((p) => p.id) },
        status: 'REVERSED',
        reversedAt: {
          gte: dto.period.startDate,
          lte: dto.period.endDate,
        },
      },
      _count: true,
      _sum: {
        reversalAmount: true,
      },
    });

    // Create payouts in a transaction
    const payouts = await this.prisma.$transaction(async (tx) => {
      const created: any[] = [];

      for (const partner of eligiblePartners) {
        const conversionData = conversions.find((c) => c.partnerId === partner.id);
        const reversalData = reversals.find((r) => r.partnerId === partner.id);

        const grossAmount = partner.currentBalance;
        const reversalsAmount = reversalData?._sum?.reversalAmount ?? 0;
        const netAmount = grossAmount - reversalsAmount;

        if (netAmount < minimumPayoutThreshold) {
          continue;
        }

        // Generate invoice number
        const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${partner.id.slice(-4).toUpperCase()}`;

        const payout = await tx.affiliatePayout.create({
          data: {
            partnerId: partner.id,
            companyId: dto.companyId,
            amount: netAmount,
            currency: 'USD',
            method: partner.payoutMethod,
            status: 'PENDING',
            periodStart: dto.period.startDate,
            periodEnd: dto.period.endDate,
            grossAmount,
            fees: 0,
            netAmount,
            conversionsCount: conversionData?._count ?? 0,
            reversalsCount: reversalData?._count ?? 0,
            reversalsAmount,
            invoiceNumber,
          },
          include: {
            partner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                displayName: true,
                email: true,
              },
            },
          },
        });

        // Reset partner's current balance
        await tx.affiliatePartner.update({
          where: { id: partner.id },
          data: {
            currentBalance: 0,
            totalPaid: { increment: netAmount },
          },
        });

        created.push(payout);
      }

      return created;
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.CREATE,
      AuditEntity.AFFILIATE_PAYOUT,
      'batch',
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.CONFIDENTIAL,
        metadata: {
          companyId: dto.companyId,
          payoutCount: payouts.length,
          totalAmount: payouts.reduce((sum, p) => sum + p.netAmount, 0),
          period: dto.period,
        },
      },
    );

    const result = {
      payouts,
      count: payouts.length,
      totalAmount: payouts.reduce((sum, p) => sum + p.netAmount, 0),
    };

    if (dto.idempotencyKey) {
      const idempotencyFullKey = `affiliate-payout-batch:${dto.companyId}:${dto.period.startDate}:${dto.period.endDate}:${dto.minimumAmount || 'default'}:${dto.idempotencyKey}`;
      await this.idempotencyService.complete(idempotencyFullKey, result);
    }

    return result;
  }

  /**
   * Create a single manual payout
   */
  async createSingle(user: UserContext, dto: CreateSinglePayoutDto) {
    // Validate company access
    await this.hierarchyService.validateCompanyAccess(
      user,
      dto.companyId,
      'create affiliate payout',
    );

    // Verify partner exists
    const partner = await this.prisma.affiliatePartner.findFirst({
      where: {
        id: dto.partnerId,
        companyId: dto.companyId,
        deletedAt: null,
      },
    });

    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    // Handle idempotency - include partnerId and amount to detect mismatched duplicate requests
    if (dto.idempotencyKey) {
      const idempotencyFullKey = `affiliate-payout:${dto.partnerId}:${dto.amount}:${dto.idempotencyKey}`;
      const result = await this.idempotencyService.checkAndLock(idempotencyFullKey);
      if (result.isDuplicate) {
        return result.cachedResult;
      }
    }

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${partner.id.slice(-4).toUpperCase()}`;

    const payout = await this.prisma.$transaction(async (tx) => {
      const created = await tx.affiliatePayout.create({
        data: {
          partnerId: dto.partnerId,
          companyId: dto.companyId,
          amount: dto.amount,
          currency: dto.currency || 'USD',
          method: dto.method || partner.payoutMethod,
          status: 'PENDING',
          periodStart: dto.period.startDate,
          periodEnd: dto.period.endDate,
          grossAmount: dto.amount,
          fees: 0,
          netAmount: dto.amount,
          conversionsCount: 0,
          reversalsCount: 0,
          reversalsAmount: 0,
          invoiceNumber,
        },
        include: {
          partner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
            },
          },
          company: {
            select: { id: true, name: true, slug: true },
          },
        },
      });

      // Deduct from current balance if applicable
      if (partner.currentBalance >= dto.amount) {
        await tx.affiliatePartner.update({
          where: { id: partner.id },
          data: {
            currentBalance: { decrement: dto.amount },
            totalPaid: { increment: dto.amount },
          },
        });
      }

      return created;
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.CREATE,
      AuditEntity.AFFILIATE_PAYOUT,
      payout.id,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.CONFIDENTIAL,
        metadata: {
          partnerId: dto.partnerId,
          amount: dto.amount,
          method: payout.method,
        },
      },
    );

    if (dto.idempotencyKey) {
      const idempotencyFullKey = `affiliate-payout:${dto.partnerId}:${dto.amount}:${dto.idempotencyKey}`;
      await this.idempotencyService.complete(idempotencyFullKey, payout);
    }

    return payout;
  }

  /**
   * Update payout status
   */
  async update(user: UserContext, payoutId: string, dto: UpdatePayoutDto) {
    const payout = await this.findById(user, payoutId);

    const previousStatus = payout.status;

    const updateData: Prisma.AffiliatePayoutUpdateInput = {};

    if (dto.status !== undefined) {
      updateData.status = dto.status;

      if (dto.status === 'COMPLETED') {
        updateData.processedAt = new Date();
      } else if (dto.status === 'FAILED') {
        updateData.failedAt = new Date();
        updateData.failReason = dto.failReason;
      }
    }

    if (dto.transactionId !== undefined) {
      updateData.transactionId = dto.transactionId;
    }

    if (dto.failReason !== undefined) {
      updateData.failReason = dto.failReason;
    }

    const updated = await this.prisma.affiliatePayout.update({
      where: { id: payoutId },
      data: updateData,
      include: {
        partner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
          },
        },
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // If payout failed, restore partner's balance
    if (dto.status === 'FAILED' && previousStatus !== 'FAILED') {
      await this.prisma.affiliatePartner.update({
        where: { id: payout.partnerId },
        data: {
          currentBalance: { increment: payout.netAmount },
          totalPaid: { decrement: payout.netAmount },
        },
      });
    }

    // Audit log
    await this.auditLogsService.log(
      AuditAction.UPDATE,
      AuditEntity.AFFILIATE_PAYOUT,
      payoutId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.CONFIDENTIAL,
        changes: {
          status: { before: previousStatus, after: updated.status },
        },
      },
    );

    return updated;
  }

  /**
   * Process a payout (mark as processing, then complete)
   */
  async process(user: UserContext, payoutId: string, dto: ProcessPayoutDto) {
    const payout = await this.findById(user, payoutId);

    if (payout.status !== 'PENDING') {
      throw new BadRequestException('Payout must be in PENDING status to process');
    }

    // First mark as processing
    await this.prisma.affiliatePayout.update({
      where: { id: payoutId },
      data: { status: 'PROCESSING' },
    });

    // TODO: Integrate with actual payment processor (PayPal, etc.)
    // For now, simulate successful processing

    const updated = await this.prisma.affiliatePayout.update({
      where: { id: payoutId },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        transactionId: dto.transactionId,
        paymentDetails: dto.paymentDetails as Prisma.InputJsonValue,
      },
      include: {
        partner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
          },
        },
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.AFFILIATE_PAYOUT_PROCESSED,
      AuditEntity.AFFILIATE_PAYOUT,
      payoutId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.CONFIDENTIAL,
        metadata: {
          amount: payout.netAmount,
          partnerId: payout.partnerId,
          transactionId: dto.transactionId,
        },
      },
    );

    return updated;
  }

  /**
   * Approve a payout for processing
   */
  async approve(user: UserContext, payoutId: string) {
    const payout = await this.findById(user, payoutId);

    if (payout.status !== 'PENDING' && payout.status !== 'ON_HOLD') {
      throw new BadRequestException('Payout must be in PENDING or ON_HOLD status to approve');
    }

    const updated = await this.prisma.affiliatePayout.update({
      where: { id: payoutId },
      data: {
        status: 'PENDING',
        approvedAt: new Date(),
        approvedBy: user.sub,
      },
      include: {
        partner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.AFFILIATE_PAYOUT_APPROVED,
      AuditEntity.AFFILIATE_PAYOUT,
      payoutId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
      },
    );

    return updated;
  }

  /**
   * Put a payout on hold
   */
  async hold(user: UserContext, payoutId: string, reason?: string) {
    const payout = await this.findById(user, payoutId);

    if (payout.status !== 'PENDING') {
      throw new BadRequestException('Only pending payouts can be put on hold');
    }

    const updated = await this.prisma.affiliatePayout.update({
      where: { id: payoutId },
      data: {
        status: 'ON_HOLD',
        failReason: reason,
      },
      include: {
        partner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.UPDATE,
      AuditEntity.AFFILIATE_PAYOUT,
      payoutId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          action: 'hold',
          reason,
        },
      },
    );

    return updated;
  }

  /**
   * Get payout statistics
   */
  async getStats(user: UserContext, filters: { companyId?: string }) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);
    let targetCompanyIds = companyIds;

    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    const where: Prisma.AffiliatePayoutWhereInput = {
      companyId: { in: targetCompanyIds },
    };

    const [total, pending, processing, completed, totalPaid, pendingAmount] = await Promise.all([
      this.prisma.affiliatePayout.count({ where }),
      this.prisma.affiliatePayout.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.affiliatePayout.count({ where: { ...where, status: 'PROCESSING' } }),
      this.prisma.affiliatePayout.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.affiliatePayout.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { netAmount: true },
      }),
      this.prisma.affiliatePayout.aggregate({
        where: { ...where, status: 'PENDING' },
        _sum: { netAmount: true },
      }),
    ]);

    return {
      total,
      pending,
      processing,
      completed,
      failed: total - pending - processing - completed,
      totalPaid: totalPaid._sum?.netAmount || 0,
      pendingAmount: pendingAmount._sum?.netAmount || 0,
    };
  }

  /**
   * Update payout status with transaction reference
   */
  async updateStatus(user: UserContext, payoutId: string, dto: UpdatePayoutStatusDto) {
    const payout = await this.findById(user, payoutId);
    const previousStatus = payout.status;

    const updateData: Prisma.AffiliatePayoutUpdateInput = {
      status: dto.status,
    };

    // Handle status-specific updates
    if (dto.status === 'COMPLETED') {
      updateData.processedAt = new Date();
      if (dto.transactionRef) {
        updateData.transactionId = dto.transactionRef;
      }
    } else if (dto.status === 'FAILED') {
      updateData.failedAt = new Date();
      updateData.failReason = dto.failReason;
    } else if (dto.status === 'CANCELLED') {
      updateData.failReason = dto.failReason || 'Cancelled';
    }

    if (dto.transactionRef) {
      updateData.transactionId = dto.transactionRef;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.affiliatePayout.update({
        where: { id: payoutId },
        data: updateData,
        include: {
          partner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
            },
          },
          company: {
            select: { id: true, name: true, slug: true },
          },
        },
      });

      // If payout failed or cancelled, restore partner's balance
      if (
        (dto.status === 'FAILED' || dto.status === 'CANCELLED') &&
        previousStatus !== 'FAILED' &&
        previousStatus !== 'CANCELLED'
      ) {
        await tx.affiliatePartner.update({
          where: { id: payout.partnerId },
          data: {
            currentBalance: { increment: payout.netAmount },
            totalPaid: { decrement: payout.netAmount },
          },
        });
      }

      return result;
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.UPDATE,
      AuditEntity.AFFILIATE_PAYOUT,
      payoutId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.CONFIDENTIAL,
        changes: {
          status: { before: previousStatus, after: updated.status },
        },
        metadata: {
          transactionRef: dto.transactionRef,
        },
      },
    );

    return updated;
  }

  /**
   * Get conversions included in a payout period
   */
  async getConversionsForPayout(
    user: UserContext,
    payoutId: string,
    pagination: { limit: number; offset: number },
  ) {
    const payout = await this.findById(user, payoutId);

    // Get conversions that were approved during the payout period
    const where: Prisma.AffiliateConversionWhereInput = {
      partnerId: payout.partnerId,
      companyId: payout.companyId,
      status: 'APPROVED',
      approvedAt: {
        gte: payout.periodStart,
        lte: payout.periodEnd,
      },
    };

    const [conversions, total] = await Promise.all([
      this.prisma.affiliateConversion.findMany({
        where,
        include: {
          link: {
            select: {
              id: true,
              name: true,
              trackingCode: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
            },
          },
        },
        orderBy: { convertedAt: 'desc' },
        take: pagination.limit,
        skip: pagination.offset,
      }),
      this.prisma.affiliateConversion.count({ where }),
    ]);

    return {
      conversions,
      total,
      limit: pagination.limit,
      offset: pagination.offset,
      payout: {
        id: payout.id,
        periodStart: payout.periodStart,
        periodEnd: payout.periodEnd,
        partnerId: payout.partnerId,
      },
    };
  }

  /**
   * Calculate pending payouts for affiliates
   */
  async calculatePending(user: UserContext, dto: CalculatePendingDto) {
    // Validate company access
    await this.hierarchyService.validateCompanyAccess(
      user,
      dto.companyId,
      'calculate affiliate payouts',
    );

    // Get company config
    const config = await this.prisma.affiliateProgramConfig.findUnique({
      where: { companyId: dto.companyId },
    });

    const holdPeriodDays = dto.holdPeriodDays ?? config?.holdPeriodDays ?? 30;
    const holdCutoffDate = new Date();
    holdCutoffDate.setDate(holdCutoffDate.getDate() - holdPeriodDays);

    // Build partner filter
    const partnerWhere: Prisma.AffiliatePartnerWhereInput = {
      companyId: dto.companyId,
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (dto.partnerIds?.length) {
      partnerWhere.id = { in: dto.partnerIds };
    }

    if (dto.partnershipId) {
      partnerWhere.id = dto.partnershipId;
    }

    // Get partners with their balances
    const partners = await this.prisma.affiliatePartner.findMany({
      where: partnerWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        email: true,
        affiliateCode: true,
        currentBalance: true,
        payoutThreshold: true,
        payoutMethod: true,
      },
    });

    // Calculate pending amounts for each partner
    const summaries: PendingPayoutSummaryDto[] = [];

    for (const partner of partners) {
      // Get pending conversions count
      const pendingConversions = await this.prisma.affiliateConversion.count({
        where: {
          partnerId: partner.id,
          companyId: dto.companyId,
          status: 'PENDING',
        },
      });

      // Get approved conversions within hold period (not yet available for payout)
      const heldConversions = dto.includeHoldPeriod
        ? await this.prisma.affiliateConversion.aggregate({
            where: {
              partnerId: partner.id,
              companyId: dto.companyId,
              status: 'APPROVED',
              approvedAt: { gte: holdCutoffDate },
            },
            _sum: { commissionAmount: true },
          })
        : { _sum: { commissionAmount: null } };

      // Get last payout date
      const lastPayout = await this.prisma.affiliatePayout.findFirst({
        where: {
          partnerId: partner.id,
          companyId: dto.companyId,
          status: 'COMPLETED',
        },
        orderBy: { processedAt: 'desc' },
        select: { processedAt: true },
      });

      const heldAmount = heldConversions._sum?.commissionAmount ?? 0;
      const availableForPayout = Math.max(0, partner.currentBalance - heldAmount);
      const isEligible = availableForPayout >= partner.payoutThreshold;

      summaries.push({
        partnerId: partner.id,
        partnerName: partner.displayName || `${partner.firstName} ${partner.lastName}`,
        partnerEmail: partner.email,
        affiliateCode: partner.affiliateCode,
        payoutMethod: partner.payoutMethod,
        payoutThreshold: partner.payoutThreshold,
        currentBalance: partner.currentBalance,
        pendingConversions,
        pendingAmount: partner.currentBalance,
        heldAmount,
        availableForPayout,
        isEligible,
        lastPayoutDate: lastPayout?.processedAt ?? undefined,
      });
    }

    const eligiblePartners = summaries.filter((s) => s.isEligible);
    const totalAvailable = summaries.reduce((sum, s) => sum + s.availableForPayout, 0);
    const totalEligible = eligiblePartners.reduce((sum, s) => sum + s.availableForPayout, 0);

    return {
      summaries,
      totalPartners: summaries.length,
      eligiblePartners: eligiblePartners.length,
      totalAvailable,
      totalEligible,
      holdPeriodDays,
    };
  }

  /**
   * Get pending payout summary by affiliate
   */
  async getPendingSummary(
    user: UserContext,
    filters: { companyId?: string; includeDetails?: boolean },
  ) {
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    let targetCompanyIds = companyIds;
    if (filters.companyId && companyIds.includes(filters.companyId)) {
      targetCompanyIds = [filters.companyId];
    }

    // Get all active partners with balance above 0
    const partners = await this.prisma.affiliatePartner.findMany({
      where: {
        companyId: { in: targetCompanyIds },
        status: 'ACTIVE',
        currentBalance: { gt: 0 },
        deletedAt: null,
      },
      select: {
        id: true,
        companyId: true,
        firstName: true,
        lastName: true,
        displayName: true,
        email: true,
        affiliateCode: true,
        currentBalance: true,
        payoutThreshold: true,
        payoutMethod: true,
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { currentBalance: 'desc' },
    });

    // Group by eligibility
    const eligiblePartners = partners.filter((p) => p.currentBalance >= p.payoutThreshold);
    const pendingPartners = partners.filter((p) => p.currentBalance < p.payoutThreshold);

    const summary = {
      totalPartners: partners.length,
      eligiblePartners: eligiblePartners.length,
      pendingPartners: pendingPartners.length,
      totalPendingAmount: partners.reduce((sum, p) => sum + p.currentBalance, 0),
      eligibleAmount: eligiblePartners.reduce((sum, p) => sum + p.currentBalance, 0),
      byPaymentMethod: {} as Record<string, { count: number; amount: number }>,
    };

    // Group by payment method
    for (const partner of eligiblePartners) {
      const method = partner.payoutMethod;
      if (!summary.byPaymentMethod[method]) {
        summary.byPaymentMethod[method] = { count: 0, amount: 0 };
      }
      summary.byPaymentMethod[method].count++;
      summary.byPaymentMethod[method].amount += partner.currentBalance;
    }

    if (filters.includeDetails) {
      return {
        ...summary,
        eligible: eligiblePartners.map((p) => ({
          partnerId: p.id,
          partnerName: p.displayName || `${p.firstName} ${p.lastName}`,
          email: p.email,
          affiliateCode: p.affiliateCode,
          balance: p.currentBalance,
          threshold: p.payoutThreshold,
          payoutMethod: p.payoutMethod,
          company: p.company,
        })),
        pending: pendingPartners.map((p) => ({
          partnerId: p.id,
          partnerName: p.displayName || `${p.firstName} ${p.lastName}`,
          email: p.email,
          affiliateCode: p.affiliateCode,
          balance: p.currentBalance,
          threshold: p.payoutThreshold,
          remaining: p.payoutThreshold - p.currentBalance,
          payoutMethod: p.payoutMethod,
          company: p.company,
        })),
      };
    }

    return summary;
  }

  /**
   * Cancel a payout
   */
  async cancel(user: UserContext, payoutId: string, reason?: string) {
    const payout = await this.findById(user, payoutId);

    if (payout.status !== 'PENDING' && payout.status !== 'ON_HOLD') {
      throw new BadRequestException('Only pending or on-hold payouts can be cancelled');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.affiliatePayout.update({
        where: { id: payoutId },
        data: {
          status: 'CANCELLED',
          failReason: reason || 'Cancelled by admin',
        },
        include: {
          partner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      // Restore partner's balance
      await tx.affiliatePartner.update({
        where: { id: payout.partnerId },
        data: {
          currentBalance: { increment: payout.netAmount },
          totalPaid: { decrement: payout.netAmount },
        },
      });

      return result;
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.UPDATE,
      AuditEntity.AFFILIATE_PAYOUT,
      payoutId,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.INTERNAL,
        metadata: {
          action: 'cancel',
          reason,
          amountRestored: payout.netAmount,
        },
      },
    );

    return updated;
  }
}
