import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChargebackStatus, Prisma, DataClassification } from '@prisma/client';
import {
  CreateChargebackRecordDto,
  UpdateChargebackRecordDto,
  SubmitRepresentmentDto,
  ResolveChargebackDto,
} from '../dto/chargeback.dto';
import { ReserveService } from './reserve.service';
import { MerchantRiskProfileService } from './merchant-risk-profile.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AuditAction } from '../../audit-logs/types/audit-log.types';

@Injectable()
export class ChargebackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reserveService: ReserveService,
    private readonly merchantRiskProfileService: MerchantRiskProfileService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async createChargebackRecord(dto: CreateChargebackRecordDto) {
    // Verify profile exists
    const profile = await this.prisma.merchantRiskProfile.findUnique({
      where: { id: dto.merchantRiskProfileId },
    });

    if (!profile) {
      throw new NotFoundException(`Merchant risk profile ${dto.merchantRiskProfileId} not found`);
    }

    // Check for duplicate chargeback ID
    const existing = await this.prisma.chargebackRecord.findUnique({
      where: { chargebackId: dto.chargebackId },
    });

    if (existing) {
      throw new BadRequestException(`Chargeback with ID ${dto.chargebackId} already exists`);
    }

    // Create chargeback record
    const chargeback = await this.prisma.chargebackRecord.create({
      data: {
        merchantRiskProfileId: dto.merchantRiskProfileId,
        chargebackId: dto.chargebackId,
        transactionId: dto.transactionId,
        orderId: dto.orderId,
        amount: dto.amount,
        currency: dto.currency || 'USD',
        fee: dto.fee,
        reason: dto.reason,
        reasonCode: dto.reasonCode,
        reasonDescription: dto.reasonDescription,
        receivedAt: new Date(dto.receivedAt),
        respondByDate: dto.respondByDate ? new Date(dto.respondByDate) : null,
      },
    });

    // Update merchant processing metrics
    await this.merchantRiskProfileService.updateProcessingMetrics(profile.clientId, {
      chargebackCount: 1,
      chargebackAmount: dto.amount,
    });

    // Audit log for chargeback creation
    await this.auditLogsService.log(
      AuditAction.CHARGEBACK_CREATED,
      'ChargebackRecord',
      chargeback.id,
      {
        dataClassification: DataClassification.CONFIDENTIAL,
        metadata: {
          merchantRiskProfileId: dto.merchantRiskProfileId,
          chargebackId: dto.chargebackId,
          transactionId: dto.transactionId,
          orderId: dto.orderId,
          amount: dto.amount,
          currency: dto.currency || 'USD',
          reason: dto.reason,
          reasonCode: dto.reasonCode,
        },
      },
    );

    return chargeback;
  }

  async updateChargebackRecord(id: string, dto: UpdateChargebackRecordDto) {
    const chargeback = await this.prisma.chargebackRecord.findUnique({
      where: { id },
    });

    if (!chargeback) {
      throw new NotFoundException(`Chargeback record ${id} not found`);
    }

    return this.prisma.chargebackRecord.update({
      where: { id },
      data: {
        ...dto,
        respondByDate: dto.respondByDate ? new Date(dto.respondByDate) : undefined,
      },
    });
  }

  async getChargebackRecord(id: string) {
    const chargeback = await this.prisma.chargebackRecord.findUnique({
      where: { id },
      include: {
        merchantRiskProfile: {
          include: {
            client: true,
          },
        },
        reserveTransactions: true,
      },
    });

    if (!chargeback) {
      throw new NotFoundException(`Chargeback record ${id} not found`);
    }

    return chargeback;
  }

  async getChargebackByExternalId(chargebackId: string) {
    const chargeback = await this.prisma.chargebackRecord.findUnique({
      where: { chargebackId },
      include: {
        merchantRiskProfile: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!chargeback) {
      throw new NotFoundException(`Chargeback with external ID ${chargebackId} not found`);
    }

    return chargeback;
  }

  async listChargebacks(
    merchantRiskProfileId?: string,
    filters?: {
      status?: ChargebackStatus;
      fromDate?: Date;
      toDate?: Date;
    },
    pagination?: {
      skip?: number;
      take?: number;
    },
  ) {
    const where: Record<string, unknown> = {};

    if (merchantRiskProfileId) {
      where.merchantRiskProfileId = merchantRiskProfileId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.fromDate || filters?.toDate) {
      where.receivedAt = {};
      if (filters?.fromDate) {
        (where.receivedAt as Record<string, unknown>).gte = filters.fromDate;
      }
      if (filters?.toDate) {
        (where.receivedAt as Record<string, unknown>).lte = filters.toDate;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.chargebackRecord.findMany({
        where,
        include: {
          merchantRiskProfile: {
            include: {
              client: true,
            },
          },
        },
        orderBy: { receivedAt: 'desc' },
        skip: pagination?.skip,
        take: pagination?.take,
      }),
      this.prisma.chargebackRecord.count({ where }),
    ]);

    return { items, total };
  }

  async submitRepresentment(id: string, dto: SubmitRepresentmentDto) {
    const chargeback = await this.prisma.chargebackRecord.findUnique({
      where: { id },
    });

    if (!chargeback) {
      throw new NotFoundException(`Chargeback record ${id} not found`);
    }

    if (chargeback.status !== ChargebackStatus.RECEIVED && chargeback.status !== ChargebackStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        `Cannot submit representment for chargeback with status ${chargeback.status}`,
      );
    }

    const updated = await this.prisma.chargebackRecord.update({
      where: { id },
      data: {
        status: ChargebackStatus.REPRESENTMENT,
        representmentSubmittedAt: new Date(),
        representmentEvidence: dto.evidence as unknown as Prisma.InputJsonValue,
        representmentNotes: dto.notes,
      },
    });

    // Audit log for representment submission
    await this.auditLogsService.log(
      AuditAction.CHARGEBACK_REPRESENTMENT_SUBMITTED,
      'ChargebackRecord',
      id,
      {
        dataClassification: DataClassification.CONFIDENTIAL,
        metadata: {
          chargebackId: chargeback.chargebackId,
          previousStatus: chargeback.status,
          newStatus: ChargebackStatus.REPRESENTMENT,
          hasEvidence: !!dto.evidence,
          hasNotes: !!dto.notes,
        },
      },
    );

    return updated;
  }

  async resolveChargeback(id: string, dto: ResolveChargebackDto) {
    // Input validation
    if (dto.reserveDebitAmount !== undefined && dto.reserveDebitAmount < 0) {
      throw new BadRequestException('Reserve debit amount cannot be negative');
    }

    const chargeback = await this.prisma.chargebackRecord.findUnique({
      where: { id },
      include: {
        merchantRiskProfile: true,
      },
    });

    if (!chargeback) {
      throw new NotFoundException(`Chargeback record ${id} not found`);
    }

    if (
      chargeback.status === ChargebackStatus.WON ||
      chargeback.status === ChargebackStatus.LOST ||
      chargeback.status === ChargebackStatus.ACCEPTED
    ) {
      throw new BadRequestException('Chargeback is already resolved');
    }

    const now = new Date();

    // Handle reserve debit if chargeback was lost - must be atomic with status update
    if (dto.impactReserve && dto.reserveDebitAmount && dto.reserveDebitAmount > 0) {
      // Use a transaction to ensure atomicity between reserve debit and chargeback resolution
      return this.prisma.$transaction(async (tx) => {
        // Debit reserve within transaction context
        await this.reserveService.debitForChargeback(
          chargeback.merchantRiskProfileId,
          chargeback.id,
          dto.reserveDebitAmount!,
          'SYSTEM',
        );

        // Update chargeback status
        const resolved = await tx.chargebackRecord.update({
          where: { id },
          data: {
            status: dto.status,
            resolvedAt: now,
            outcomeDate: now,
            outcomeAmount: dto.outcomeAmount,
            outcomeFee: dto.outcomeFee,
            impactedReserve: true,
            reserveDebitAmount: dto.reserveDebitAmount,
            internalNotes: dto.internalNotes,
          },
        });

        // Audit log for chargeback resolution with reserve impact
        await this.auditLogsService.log(
          AuditAction.CHARGEBACK_RESOLVED,
          'ChargebackRecord',
          id,
          {
            dataClassification: DataClassification.CONFIDENTIAL,
            metadata: {
              chargebackId: chargeback.chargebackId,
              previousStatus: chargeback.status,
              newStatus: dto.status,
              outcomeAmount: dto.outcomeAmount,
              outcomeFee: dto.outcomeFee,
              impactedReserve: true,
              reserveDebitAmount: dto.reserveDebitAmount,
            },
          },
        );

        return resolved;
      });
    }

    // No reserve impact, just update the chargeback
    const resolved = await this.prisma.chargebackRecord.update({
      where: { id },
      data: {
        status: dto.status,
        resolvedAt: now,
        outcomeDate: now,
        outcomeAmount: dto.outcomeAmount,
        outcomeFee: dto.outcomeFee,
        impactedReserve: false,
        reserveDebitAmount: dto.reserveDebitAmount,
        internalNotes: dto.internalNotes,
      },
    });

    // Audit log for chargeback resolution
    await this.auditLogsService.log(
      AuditAction.CHARGEBACK_RESOLVED,
      'ChargebackRecord',
      id,
      {
        dataClassification: DataClassification.CONFIDENTIAL,
        metadata: {
          chargebackId: chargeback.chargebackId,
          previousStatus: chargeback.status,
          newStatus: dto.status,
          outcomeAmount: dto.outcomeAmount,
          outcomeFee: dto.outcomeFee,
          impactedReserve: false,
        },
      },
    );

    return resolved;
  }

  async getChargebackStats(merchantRiskProfileId: string) {
    const profile = await this.prisma.merchantRiskProfile.findUnique({
      where: { id: merchantRiskProfileId },
    });

    if (!profile) {
      throw new NotFoundException(`Merchant risk profile ${merchantRiskProfileId} not found`);
    }

    const [
      totalChargebacks,
      openChargebacks,
      wonChargebacks,
      lostChargebacks,
      totalAmountResult,
      totalFeesResult,
      recoveredAmountResult,
      recentChargebacks,
    ] = await Promise.all([
      this.prisma.chargebackRecord.count({
        where: { merchantRiskProfileId },
      }),
      this.prisma.chargebackRecord.count({
        where: {
          merchantRiskProfileId,
          status: {
            in: [
              ChargebackStatus.RECEIVED,
              ChargebackStatus.UNDER_REVIEW,
              ChargebackStatus.REPRESENTMENT,
            ],
          },
        },
      }),
      this.prisma.chargebackRecord.count({
        where: {
          merchantRiskProfileId,
          status: ChargebackStatus.WON,
        },
      }),
      this.prisma.chargebackRecord.count({
        where: {
          merchantRiskProfileId,
          status: ChargebackStatus.LOST,
        },
      }),
      this.prisma.chargebackRecord.aggregate({
        where: { merchantRiskProfileId },
        _sum: { amount: true },
      }),
      this.prisma.chargebackRecord.aggregate({
        where: { merchantRiskProfileId },
        _sum: { fee: true },
      }),
      this.prisma.chargebackRecord.aggregate({
        where: {
          merchantRiskProfileId,
          status: ChargebackStatus.WON,
        },
        _sum: { outcomeAmount: true },
      }),
      this.prisma.chargebackRecord.findMany({
        where: { merchantRiskProfileId },
        orderBy: { receivedAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      merchantRiskProfileId,
      totalChargebacks,
      openChargebacks,
      wonChargebacks,
      lostChargebacks,
      totalAmount: totalAmountResult._sum.amount || 0,
      totalFees: totalFeesResult._sum.fee || 0,
      recoveredAmount: recoveredAmountResult._sum.outcomeAmount || 0,
      chargebackRatio: Number(profile.chargebackRatio),
      recentChargebacks,
    };
  }

  async getChargebacksApproachingDeadline(daysAhead = 3) {
    const deadline = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    return this.prisma.chargebackRecord.findMany({
      where: {
        status: {
          in: [ChargebackStatus.RECEIVED, ChargebackStatus.UNDER_REVIEW],
        },
        respondByDate: {
          lte: deadline,
          gte: new Date(),
        },
      },
      include: {
        merchantRiskProfile: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { respondByDate: 'asc' },
    });
  }
}
