/**
 * Chargeback Service Unit Tests
 * Tests for chargeback record management, representment, and resolution
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ChargebackService } from './chargeback.service';
import { ReserveService } from './reserve.service';
import { MerchantRiskProfileService } from './merchant-risk-profile.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ChargebackStatus, ChargebackReason } from '@prisma/client';
import { CreateChargebackRecordDto } from '../dto/chargeback.dto';

describe('ChargebackService', () => {
  let service: ChargebackService;
  let prismaService: PrismaService;
  let reserveService: ReserveService;
  let merchantRiskProfileService: MerchantRiskProfileService;
  let auditLogsService: AuditLogsService;

  const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    merchantRiskProfile: {
      findUnique: jest.fn(),
    },
    chargebackRecord: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  const mockReserveService = {
    debitForChargeback: jest.fn(),
  };

  const mockMerchantRiskProfileService = {
    updateProcessingMetrics: jest.fn(),
  };

  const mockAuditLogsService = {
    log: jest.fn(),
  };

  const mockMerchantRiskProfile = {
    id: 'profile-1',
    clientId: 'client-1',
    chargebackRatio: 0.01,
  };

  const mockChargebackRecord = {
    id: 'cb-1',
    merchantRiskProfileId: 'profile-1',
    chargebackId: 'external-cb-123',
    transactionId: 'txn-123',
    orderId: 'order-123',
    amount: 5000,
    currency: 'USD',
    fee: 2500,
    reason: 'FRAUD',
    reasonCode: '10.4',
    reasonDescription: 'Other Fraud',
    status: ChargebackStatus.RECEIVED,
    receivedAt: new Date(),
    respondByDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    merchantRiskProfile: mockMerchantRiskProfile,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChargebackService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ReserveService, useValue: mockReserveService },
        { provide: MerchantRiskProfileService, useValue: mockMerchantRiskProfileService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    service = module.get<ChargebackService>(ChargebackService);
    prismaService = module.get<PrismaService>(PrismaService);
    reserveService = module.get<ReserveService>(ReserveService);
    merchantRiskProfileService = module.get<MerchantRiskProfileService>(MerchantRiskProfileService);
    auditLogsService = module.get<AuditLogsService>(AuditLogsService);
  });

  // ═══════════════════════════════════════════════════════════════
  // createChargebackRecord Tests
  // ═══════════════════════════════════════════════════════════════

  describe('createChargebackRecord', () => {
    const createDto: CreateChargebackRecordDto = {
      merchantRiskProfileId: 'profile-1',
      chargebackId: 'external-cb-123',
      transactionId: 'txn-123',
      orderId: 'order-123',
      amount: 5000,
      currency: 'USD',
      fee: 2500,
      reason: ChargebackReason.FRAUD,
      reasonCode: '10.4',
      reasonDescription: 'Other Fraud',
      receivedAt: new Date().toISOString(),
    };

    it('should create a chargeback record successfully', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue(null);
      mockPrismaService.chargebackRecord.create.mockResolvedValue(mockChargebackRecord);
      mockMerchantRiskProfileService.updateProcessingMetrics.mockResolvedValue({});

      const result = await service.createChargebackRecord(createDto);

      expect(result).toEqual(mockChargebackRecord);
      expect(mockPrismaService.chargebackRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          merchantRiskProfileId: 'profile-1',
          chargebackId: 'external-cb-123',
          amount: 5000,
        }),
      });
      expect(mockMerchantRiskProfileService.updateProcessingMetrics).toHaveBeenCalledWith(
        'client-1',
        { chargebackCount: 1, chargebackAmount: 5000 },
      );
      expect(mockAuditLogsService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if merchant risk profile does not exist', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(null);

      await expect(service.createChargebackRecord(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if chargeback ID already exists', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue(mockChargebackRecord);

      await expect(service.createChargebackRecord(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should use USD as default currency if not specified', async () => {
      const dtoWithoutCurrency = { ...createDto, currency: undefined };

      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue(null);
      mockPrismaService.chargebackRecord.create.mockResolvedValue(mockChargebackRecord);
      mockMerchantRiskProfileService.updateProcessingMetrics.mockResolvedValue({});

      await service.createChargebackRecord(dtoWithoutCurrency);

      expect(mockPrismaService.chargebackRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currency: 'USD',
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateChargebackRecord Tests
  // ═══════════════════════════════════════════════════════════════

  describe('updateChargebackRecord', () => {
    it('should update a chargeback record', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue(mockChargebackRecord);
      mockPrismaService.chargebackRecord.update.mockResolvedValue({
        ...mockChargebackRecord,
        reasonDescription: 'Updated description',
      });

      const result = await service.updateChargebackRecord('cb-1', {
        reasonDescription: 'Updated description',
      });

      expect(result.reasonDescription).toBe('Updated description');
    });

    it('should throw NotFoundException if chargeback does not exist', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.updateChargebackRecord('non-existent', { reasonDescription: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getChargebackRecord Tests
  // ═══════════════════════════════════════════════════════════════

  describe('getChargebackRecord', () => {
    it('should return chargeback with related data', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue({
        ...mockChargebackRecord,
        merchantRiskProfile: { ...mockMerchantRiskProfile, client: { id: 'client-1', name: 'Test Client' } },
        reserveTransactions: [],
      });

      const result = await service.getChargebackRecord('cb-1');

      expect(result.id).toBe('cb-1');
      expect(result.merchantRiskProfile).toBeDefined();
      expect(mockPrismaService.chargebackRecord.findUnique).toHaveBeenCalledWith({
        where: { id: 'cb-1' },
        include: expect.objectContaining({
          merchantRiskProfile: expect.any(Object),
          reserveTransactions: true,
        }),
      });
    });

    it('should throw NotFoundException if chargeback does not exist', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue(null);

      await expect(service.getChargebackRecord('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getChargebackByExternalId Tests
  // ═══════════════════════════════════════════════════════════════

  describe('getChargebackByExternalId', () => {
    it('should return chargeback by external ID', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue({
        ...mockChargebackRecord,
        merchantRiskProfile: { ...mockMerchantRiskProfile, client: { id: 'client-1' } },
      });

      const result = await service.getChargebackByExternalId('external-cb-123');

      expect(result.chargebackId).toBe('external-cb-123');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue(null);

      await expect(service.getChargebackByExternalId('not-found')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // listChargebacks Tests
  // ═══════════════════════════════════════════════════════════════

  describe('listChargebacks', () => {
    it('should return paginated chargebacks', async () => {
      const mockChargebacks = [mockChargebackRecord];
      mockPrismaService.chargebackRecord.findMany.mockResolvedValue(mockChargebacks);
      mockPrismaService.chargebackRecord.count.mockResolvedValue(1);

      const result = await service.listChargebacks('profile-1', {}, { skip: 0, take: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrismaService.chargebackRecord.findMany.mockResolvedValue([]);
      mockPrismaService.chargebackRecord.count.mockResolvedValue(0);

      await service.listChargebacks('profile-1', { status: ChargebackStatus.WON }, {});

      expect(mockPrismaService.chargebackRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ChargebackStatus.WON,
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');

      mockPrismaService.chargebackRecord.findMany.mockResolvedValue([]);
      mockPrismaService.chargebackRecord.count.mockResolvedValue(0);

      await service.listChargebacks('profile-1', { fromDate, toDate }, {});

      expect(mockPrismaService.chargebackRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            receivedAt: { gte: fromDate, lte: toDate },
          }),
        }),
      );
    });

    it('should work without merchantRiskProfileId filter', async () => {
      mockPrismaService.chargebackRecord.findMany.mockResolvedValue([]);
      mockPrismaService.chargebackRecord.count.mockResolvedValue(0);

      await service.listChargebacks(undefined, {}, {});

      expect(mockPrismaService.chargebackRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            merchantRiskProfileId: expect.any(String),
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // submitRepresentment Tests
  // ═══════════════════════════════════════════════════════════════

  describe('submitRepresentment', () => {
    it('should submit representment for RECEIVED chargeback', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue({
        ...mockChargebackRecord,
        status: ChargebackStatus.RECEIVED,
      });
      mockPrismaService.chargebackRecord.update.mockResolvedValue({
        ...mockChargebackRecord,
        status: ChargebackStatus.REPRESENTMENT,
        representmentSubmittedAt: new Date(),
      });

      const result = await service.submitRepresentment('cb-1', {
        evidence: { documents: ['doc1.pdf'] },
        notes: 'Customer dispute is invalid',
      });

      expect(result.status).toBe(ChargebackStatus.REPRESENTMENT);
      expect(mockAuditLogsService.log).toHaveBeenCalled();
    });

    it('should submit representment for UNDER_REVIEW chargeback', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue({
        ...mockChargebackRecord,
        status: ChargebackStatus.UNDER_REVIEW,
      });
      mockPrismaService.chargebackRecord.update.mockResolvedValue({
        ...mockChargebackRecord,
        status: ChargebackStatus.REPRESENTMENT,
      });

      const result = await service.submitRepresentment('cb-1', {
        evidence: {},
      });

      expect(result.status).toBe(ChargebackStatus.REPRESENTMENT);
    });

    it('should throw BadRequestException for invalid status', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue({
        ...mockChargebackRecord,
        status: ChargebackStatus.WON,
      });

      await expect(
        service.submitRepresentment('cb-1', { evidence: {} }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if chargeback does not exist', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.submitRepresentment('non-existent', { evidence: {} }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // resolveChargeback Tests
  // ═══════════════════════════════════════════════════════════════

  describe('resolveChargeback', () => {
    it('should resolve chargeback as WON without reserve impact', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue({
        ...mockChargebackRecord,
        status: ChargebackStatus.REPRESENTMENT,
      });
      mockPrismaService.chargebackRecord.update.mockResolvedValue({
        ...mockChargebackRecord,
        status: ChargebackStatus.WON,
        resolvedAt: new Date(),
      });

      const result = await service.resolveChargeback('cb-1', {
        status: ChargebackStatus.WON,
        outcomeAmount: 5000,
      });

      expect(result.status).toBe(ChargebackStatus.WON);
      expect(mockReserveService.debitForChargeback).not.toHaveBeenCalled();
      expect(mockAuditLogsService.log).toHaveBeenCalled();
    });

    it('should resolve chargeback as LOST with reserve debit', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue({
        ...mockChargebackRecord,
        status: ChargebackStatus.REPRESENTMENT,
      });
      mockReserveService.debitForChargeback.mockResolvedValue({
        transaction: { id: 'reserve-txn-1' },
        debitedAmount: 5000,
        remainingUnfunded: 0,
      });
      mockPrismaService.chargebackRecord.update.mockResolvedValue({
        ...mockChargebackRecord,
        status: ChargebackStatus.LOST,
        impactedReserve: true,
        reserveDebitAmount: 5000,
      });

      const result = await service.resolveChargeback('cb-1', {
        status: ChargebackStatus.LOST,
        impactReserve: true,
        reserveDebitAmount: 5000,
      });

      expect(result.status).toBe(ChargebackStatus.LOST);
      expect(mockReserveService.debitForChargeback).toHaveBeenCalledWith(
        'profile-1',
        'cb-1',
        5000,
        'SYSTEM',
      );
    });

    it('should throw BadRequestException for already resolved chargeback', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue({
        ...mockChargebackRecord,
        status: ChargebackStatus.WON,
      });

      await expect(
        service.resolveChargeback('cb-1', { status: ChargebackStatus.LOST }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for LOST status', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue({
        ...mockChargebackRecord,
        status: ChargebackStatus.LOST,
      });

      await expect(
        service.resolveChargeback('cb-1', { status: ChargebackStatus.WON }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for ACCEPTED status', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue({
        ...mockChargebackRecord,
        status: ChargebackStatus.ACCEPTED,
      });

      await expect(
        service.resolveChargeback('cb-1', { status: ChargebackStatus.WON }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative reserve debit amount', async () => {
      await expect(
        service.resolveChargeback('cb-1', {
          status: ChargebackStatus.LOST,
          reserveDebitAmount: -100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if chargeback does not exist', async () => {
      mockPrismaService.chargebackRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveChargeback('non-existent', { status: ChargebackStatus.WON }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getChargebackStats Tests
  // ═══════════════════════════════════════════════════════════════

  describe('getChargebackStats', () => {
    it('should return comprehensive chargeback statistics', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.chargebackRecord.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20)  // open
        .mockResolvedValueOnce(50)  // won
        .mockResolvedValueOnce(30); // lost
      mockPrismaService.chargebackRecord.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 50000 } })     // total amount
        .mockResolvedValueOnce({ _sum: { fee: 25000 } })        // total fees
        .mockResolvedValueOnce({ _sum: { outcomeAmount: 25000 } }); // recovered
      mockPrismaService.chargebackRecord.findMany.mockResolvedValue([]);

      const result = await service.getChargebackStats('profile-1');

      expect(result).toEqual({
        merchantRiskProfileId: 'profile-1',
        totalChargebacks: 100,
        openChargebacks: 20,
        wonChargebacks: 50,
        lostChargebacks: 30,
        totalAmount: 50000,
        totalFees: 25000,
        recoveredAmount: 25000,
        chargebackRatio: 0.01,
        recentChargebacks: [],
      });
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(null);

      await expect(service.getChargebackStats('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should handle null aggregation results', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.chargebackRecord.count.mockResolvedValue(0);
      mockPrismaService.chargebackRecord.aggregate
        .mockResolvedValue({ _sum: { amount: null, fee: null, outcomeAmount: null } });
      mockPrismaService.chargebackRecord.findMany.mockResolvedValue([]);

      const result = await service.getChargebackStats('profile-1');

      expect(result.totalAmount).toBe(0);
      expect(result.totalFees).toBe(0);
      expect(result.recoveredAmount).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getChargebacksApproachingDeadline Tests
  // ═══════════════════════════════════════════════════════════════

  describe('getChargebacksApproachingDeadline', () => {
    it('should return chargebacks with respond-by date within specified days', async () => {
      const upcomingDeadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      mockPrismaService.chargebackRecord.findMany.mockResolvedValue([
        { ...mockChargebackRecord, respondByDate: upcomingDeadline },
      ]);

      const result = await service.getChargebacksApproachingDeadline(3);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.chargebackRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [ChargebackStatus.RECEIVED, ChargebackStatus.UNDER_REVIEW] },
            respondByDate: expect.objectContaining({
              lte: expect.any(Date),
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should use default of 3 days if not specified', async () => {
      mockPrismaService.chargebackRecord.findMany.mockResolvedValue([]);

      await service.getChargebacksApproachingDeadline();

      expect(mockPrismaService.chargebackRecord.findMany).toHaveBeenCalled();
    });

    it('should order by respondByDate ascending', async () => {
      mockPrismaService.chargebackRecord.findMany.mockResolvedValue([]);

      await service.getChargebacksApproachingDeadline(5);

      expect(mockPrismaService.chargebackRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { respondByDate: 'asc' },
        }),
      );
    });

    it('should include merchant profile and client data', async () => {
      mockPrismaService.chargebackRecord.findMany.mockResolvedValue([]);

      await service.getChargebacksApproachingDeadline(3);

      expect(mockPrismaService.chargebackRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            merchantRiskProfile: expect.objectContaining({
              include: { client: true },
            }),
          }),
        }),
      );
    });
  });
});
