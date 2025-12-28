import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReserveTransactionType, DataClassification } from '@prisma/client';
import { CreateReserveTransactionDto, ReleaseReserveDto, AdjustReserveDto, serializeBigIntFields } from '../dto/reserve.dto';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AuditAction } from '../../audit-logs/types/audit-log.types';

@Injectable()
export class ReserveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async createReserveHold(
    merchantRiskProfileId: string,
    transactionId: string,
    transactionAmount: number,
    reservePercentage: number,
    holdDays: number,
    createdBy?: string,
  ) {
    // Input validation
    if (transactionAmount <= 0) {
      throw new BadRequestException('Transaction amount must be positive');
    }
    if (reservePercentage < 0 || reservePercentage > 1) {
      throw new BadRequestException('Reserve percentage must be between 0 and 1');
    }
    if (holdDays <= 0) {
      throw new BadRequestException('Hold days must be positive');
    }

    // Use transaction to prevent race conditions
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.merchantRiskProfile.findUnique({
        where: { id: merchantRiskProfileId },
      });

      if (!profile) {
        throw new NotFoundException(`Merchant risk profile ${merchantRiskProfileId} not found`);
      }

      const holdAmount = Math.round(transactionAmount * reservePercentage);
      const newBalance = BigInt(profile.reserveBalance) + BigInt(holdAmount);
      const scheduledReleaseDate = new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000);

      // Create reserve transaction
      const transaction = await tx.reserveTransaction.create({
        data: {
          merchantRiskProfileId,
          type: ReserveTransactionType.HOLD,
          amount: holdAmount,
          balanceAfter: newBalance,
          relatedTransactionId: transactionId,
          scheduledReleaseDate,
          description: `Reserve hold of ${(reservePercentage * 100).toFixed(1)}% from transaction ${transactionId}`,
          createdBy,
        },
      });

      // Update profile balance atomically
      await tx.merchantRiskProfile.update({
        where: { id: merchantRiskProfileId },
        data: {
          reserveBalance: newBalance,
          reserveHeldTotal: { increment: holdAmount },
        },
      });

      // Audit log for reserve hold creation
      await this.auditLogsService.log(
        AuditAction.RESERVE_HOLD_CREATED,
        'ReserveTransaction',
        transaction.id,
        {
          userId: createdBy,
          dataClassification: DataClassification.CONFIDENTIAL,
          metadata: {
            merchantRiskProfileId,
            transactionId,
            holdAmount,
            reservePercentage,
            holdDays,
            scheduledReleaseDate: scheduledReleaseDate.toISOString(),
            newBalance: newBalance.toString(),
          },
        },
      );

      return transaction;
    });
  }

  async releaseReserve(
    merchantRiskProfileId: string,
    dto: ReleaseReserveDto,
    createdBy?: string,
  ) {
    // Input validation
    if (dto.amount <= 0) {
      throw new BadRequestException('Release amount must be positive');
    }

    // Use transaction to prevent race conditions
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.merchantRiskProfile.findUnique({
        where: { id: merchantRiskProfileId },
      });

      if (!profile) {
        throw new NotFoundException(`Merchant risk profile ${merchantRiskProfileId} not found`);
      }

      if (BigInt(dto.amount) > BigInt(profile.reserveBalance)) {
        throw new BadRequestException('Release amount exceeds available reserve balance');
      }

      const newBalance = BigInt(profile.reserveBalance) - BigInt(dto.amount);

      // Create release transaction
      const transaction = await tx.reserveTransaction.create({
        data: {
          merchantRiskProfileId,
          type: ReserveTransactionType.RELEASE,
          amount: -dto.amount, // Negative for release
          balanceAfter: newBalance,
          releasedAt: new Date(),
          description: dto.description || 'Scheduled reserve release',
          internalNotes: dto.internalNotes,
          createdBy,
        },
      });

      // Update profile balance atomically
      await tx.merchantRiskProfile.update({
        where: { id: merchantRiskProfileId },
        data: {
          reserveBalance: newBalance,
          reserveReleasedTotal: { increment: dto.amount },
        },
      });

      // Audit log for reserve release
      await this.auditLogsService.log(
        AuditAction.RESERVE_RELEASED,
        'ReserveTransaction',
        transaction.id,
        {
          userId: createdBy,
          dataClassification: DataClassification.CONFIDENTIAL,
          metadata: {
            merchantRiskProfileId,
            releaseAmount: dto.amount,
            description: dto.description,
            previousBalance: profile.reserveBalance.toString(),
            newBalance: newBalance.toString(),
          },
        },
      );

      return transaction;
    });
  }

  async adjustReserve(
    merchantRiskProfileId: string,
    dto: AdjustReserveDto,
    createdBy?: string,
  ) {
    // Input validation - amount can be positive (add) or negative (subtract), but not zero
    if (dto.amount === 0) {
      throw new BadRequestException('Adjustment amount cannot be zero');
    }

    // Use transaction to prevent race conditions
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.merchantRiskProfile.findUnique({
        where: { id: merchantRiskProfileId },
      });

      if (!profile) {
        throw new NotFoundException(`Merchant risk profile ${merchantRiskProfileId} not found`);
      }

      const newBalance = BigInt(profile.reserveBalance) + BigInt(dto.amount);

      if (newBalance < 0) {
        throw new BadRequestException('Adjustment would result in negative reserve balance');
      }

      // Create adjustment transaction
      const transaction = await tx.reserveTransaction.create({
        data: {
          merchantRiskProfileId,
          type: ReserveTransactionType.ADJUSTMENT,
          amount: dto.amount,
          balanceAfter: newBalance,
          description: dto.description,
          internalNotes: dto.internalNotes,
          createdBy,
        },
      });

      // Update profile balance atomically
      await tx.merchantRiskProfile.update({
        where: { id: merchantRiskProfileId },
        data: {
          reserveBalance: newBalance,
        },
      });

      // Audit log for reserve adjustment
      await this.auditLogsService.log(
        AuditAction.RESERVE_ADJUSTED,
        'ReserveTransaction',
        transaction.id,
        {
          userId: createdBy,
          dataClassification: DataClassification.CONFIDENTIAL,
          metadata: {
            merchantRiskProfileId,
            adjustmentAmount: dto.amount,
            adjustmentType: dto.amount > 0 ? 'CREDIT' : 'DEBIT',
            description: dto.description,
            previousBalance: profile.reserveBalance.toString(),
            newBalance: newBalance.toString(),
          },
        },
      );

      return transaction;
    });
  }

  async debitForChargeback(
    merchantRiskProfileId: string,
    chargebackId: string,
    amount: number,
    createdBy?: string,
  ) {
    // Input validation
    if (amount <= 0) {
      throw new BadRequestException('Chargeback amount must be positive');
    }

    // Use transaction to prevent race conditions
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.merchantRiskProfile.findUnique({
        where: { id: merchantRiskProfileId },
      });

      if (!profile) {
        throw new NotFoundException(`Merchant risk profile ${merchantRiskProfileId} not found`);
      }

      // Debit up to available balance
      const debitAmount = Math.min(amount, Number(profile.reserveBalance));
      const newBalance = BigInt(profile.reserveBalance) - BigInt(debitAmount);

      // Create debit transaction
      const transaction = await tx.reserveTransaction.create({
        data: {
          merchantRiskProfileId,
          type: ReserveTransactionType.CHARGEBACK_DEBIT,
          amount: -debitAmount,
          balanceAfter: newBalance,
          relatedChargebackId: chargebackId,
          description: `Reserve debited for chargeback ${chargebackId}`,
          createdBy,
        },
      });

      // Update profile balance atomically
      await tx.merchantRiskProfile.update({
        where: { id: merchantRiskProfileId },
        data: {
          reserveBalance: newBalance,
        },
      });

      // Audit log for chargeback debit
      await this.auditLogsService.log(
        AuditAction.RESERVE_CHARGEBACK_DEBIT,
        'ReserveTransaction',
        transaction.id,
        {
          userId: createdBy,
          dataClassification: DataClassification.CONFIDENTIAL,
          metadata: {
            merchantRiskProfileId,
            chargebackId,
            requestedAmount: amount,
            debitedAmount: debitAmount,
            remainingUnfunded: amount - debitAmount,
            previousBalance: profile.reserveBalance.toString(),
            newBalance: newBalance.toString(),
          },
        },
      );

      return {
        transaction,
        debitedAmount: debitAmount,
        remainingUnfunded: amount - debitAmount,
      };
    });
  }

  async getReserveSummary(merchantRiskProfileId: string) {
    const profile = await this.prisma.merchantRiskProfile.findUnique({
      where: { id: merchantRiskProfileId },
    });

    if (!profile) {
      throw new NotFoundException(`Merchant risk profile ${merchantRiskProfileId} not found`);
    }

    // Get pending releases
    const pendingReleases = await this.prisma.reserveTransaction.findMany({
      where: {
        merchantRiskProfileId,
        type: ReserveTransactionType.HOLD,
        scheduledReleaseDate: { gte: new Date() },
        releasedAt: null,
      },
      select: {
        id: true,
        scheduledReleaseDate: true,
        amount: true,
      },
      orderBy: { scheduledReleaseDate: 'asc' },
    });

    // Get recent transactions
    const recentTransactions = await this.prisma.reserveTransaction.findMany({
      where: { merchantRiskProfileId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Serialize BigInt fields for JSON compatibility
    return serializeBigIntFields({
      merchantRiskProfileId,
      currentBalance: profile.reserveBalance,
      totalHeld: profile.reserveHeldTotal,
      totalReleased: profile.reserveReleasedTotal,
      pendingReleases: pendingReleases.map((r) => ({
        scheduledDate: r.scheduledReleaseDate!,
        amount: r.amount,
      })),
      recentTransactions: recentTransactions.map((t) => serializeBigIntFields(t)),
    });
  }

  async getTransactionHistory(
    merchantRiskProfileId: string,
    filters?: {
      type?: ReserveTransactionType;
      fromDate?: Date;
      toDate?: Date;
    },
    pagination?: {
      skip?: number;
      take?: number;
    },
  ) {
    const where: Record<string, unknown> = { merchantRiskProfileId };

    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.fromDate || filters?.toDate) {
      where.createdAt = {};
      if (filters?.fromDate) {
        (where.createdAt as Record<string, unknown>).gte = filters.fromDate;
      }
      if (filters?.toDate) {
        (where.createdAt as Record<string, unknown>).lte = filters.toDate;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.reserveTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination?.skip,
        take: pagination?.take,
      }),
      this.prisma.reserveTransaction.count({ where }),
    ]);

    // Serialize BigInt fields for JSON compatibility
    return { items: items.map((item) => serializeBigIntFields(item)), total };
  }

  async processScheduledReleases() {
    const now = new Date();

    // Find all holds that are due for release
    const dueHolds = await this.prisma.reserveTransaction.findMany({
      where: {
        type: ReserveTransactionType.HOLD,
        scheduledReleaseDate: { lte: now },
        releasedAt: null,
      },
      include: {
        merchantRiskProfile: true,
      },
    });

    const results = [];

    for (const hold of dueHolds) {
      try {
        // Release the hold
        const release = await this.releaseReserve(
          hold.merchantRiskProfileId,
          {
            amount: hold.amount,
            description: `Scheduled release of hold from ${hold.createdAt.toISOString()}`,
          },
          'SYSTEM',
        );

        // Mark original hold as released
        await this.prisma.reserveTransaction.update({
          where: { id: hold.id },
          data: { releasedAt: now },
        });

        results.push({
          holdId: hold.id,
          releaseId: release.id,
          amount: hold.amount,
          status: 'released',
        });
      } catch (error) {
        results.push({
          holdId: hold.id,
          amount: hold.amount,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Audit log for batch scheduled release processing
    if (results.length > 0) {
      const successCount = results.filter((r) => r.status === 'released').length;
      const errorCount = results.filter((r) => r.status === 'error').length;

      await this.auditLogsService.log(
        AuditAction.RESERVE_SCHEDULED_RELEASE,
        'ReserveTransaction',
        undefined,
        {
          userId: 'SYSTEM',
          dataClassification: DataClassification.CONFIDENTIAL,
          metadata: {
            totalProcessed: results.length,
            successCount,
            errorCount,
            processedAt: now.toISOString(),
            results: results.map((r) => ({
              holdId: r.holdId,
              status: r.status,
              amount: r.amount,
            })),
          },
        },
      );
    }

    return results;
  }
}
