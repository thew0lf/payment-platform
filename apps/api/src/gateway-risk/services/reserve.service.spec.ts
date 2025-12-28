/**
 * Reserve Service Unit Tests
 * Tests for merchant reserve management including holds, releases, adjustments, and chargeback debits
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ReserveService } from './reserve.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ReserveTransactionType } from '@prisma/client';

describe('ReserveService', () => {
  let service: ReserveService;
  let prismaService: PrismaService;
  let auditLogsService: AuditLogsService;

  const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    merchantRiskProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    reserveTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockAuditLogsService = {
    log: jest.fn(),
  };

  const mockMerchantRiskProfile = {
    id: 'profile-1',
    clientId: 'client-1',
    reserveBalance: BigInt(10000),
    reserveHeldTotal: BigInt(15000),
    reserveReleasedTotal: BigInt(5000),
    chargebackRatio: 0.01,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReserveService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    service = module.get<ReserveService>(ReserveService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditLogsService = module.get<AuditLogsService>(AuditLogsService);
  });

  // ═══════════════════════════════════════════════════════════════
  // createReserveHold Tests
  // ═══════════════════════════════════════════════════════════════

  describe('createReserveHold', () => {
    it('should create a reserve hold successfully', async () => {
      const mockTransaction = {
        id: 'txn-1',
        merchantRiskProfileId: 'profile-1',
        type: ReserveTransactionType.HOLD,
        amount: 1000,
        balanceAfter: BigInt(11000),
        scheduledReleaseDate: expect.any(Date),
        createdAt: new Date(),
      };

      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.reserveTransaction.create.mockResolvedValue(mockTransaction);
      mockPrismaService.merchantRiskProfile.update.mockResolvedValue({});

      const result = await service.createReserveHold(
        'profile-1',
        'transaction-123',
        10000, // $100.00 transaction
        0.10,  // 10% reserve
        90,    // 90 day hold
        'user-1',
      );

      expect(result).toEqual(mockTransaction);
      expect(mockPrismaService.merchantRiskProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
      });
      expect(mockPrismaService.reserveTransaction.create).toHaveBeenCalled();
      expect(mockPrismaService.merchantRiskProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: {
          reserveBalance: expect.any(BigInt),
          reserveHeldTotal: { increment: 1000 },
        },
      });
      expect(mockAuditLogsService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.createReserveHold('non-existent', 'txn-123', 10000, 0.10, 90, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-positive transaction amount', async () => {
      await expect(
        service.createReserveHold('profile-1', 'txn-123', 0, 0.10, 90, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createReserveHold('profile-1', 'txn-123', -100, 0.10, 90, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid reserve percentage', async () => {
      await expect(
        service.createReserveHold('profile-1', 'txn-123', 10000, -0.1, 90, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createReserveHold('profile-1', 'txn-123', 10000, 1.5, 90, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-positive hold days', async () => {
      await expect(
        service.createReserveHold('profile-1', 'txn-123', 10000, 0.10, 0, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createReserveHold('profile-1', 'txn-123', 10000, 0.10, -30, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate hold amount correctly', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.reserveTransaction.create.mockResolvedValue({
        id: 'txn-1',
        amount: 500,
      });
      mockPrismaService.merchantRiskProfile.update.mockResolvedValue({});

      await service.createReserveHold('profile-1', 'txn-123', 5000, 0.10, 90, 'user-1');

      expect(mockPrismaService.reserveTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount: 500, // 5000 * 0.10 = 500
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // releaseReserve Tests
  // ═══════════════════════════════════════════════════════════════

  describe('releaseReserve', () => {
    it('should release reserve successfully', async () => {
      const mockTransaction = {
        id: 'txn-2',
        merchantRiskProfileId: 'profile-1',
        type: ReserveTransactionType.RELEASE,
        amount: -500,
        balanceAfter: BigInt(9500),
        releasedAt: expect.any(Date),
      };

      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.reserveTransaction.create.mockResolvedValue(mockTransaction);
      mockPrismaService.merchantRiskProfile.update.mockResolvedValue({});

      const result = await service.releaseReserve(
        'profile-1',
        { amount: 500, description: 'Scheduled release' },
        'user-1',
      );

      expect(result).toEqual(mockTransaction);
      expect(mockPrismaService.reserveTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: ReserveTransactionType.RELEASE,
          amount: -500,
        }),
      });
      expect(mockAuditLogsService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.releaseReserve('non-existent', { amount: 500 }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-positive release amount', async () => {
      await expect(
        service.releaseReserve('profile-1', { amount: 0 }, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.releaseReserve('profile-1', { amount: -100 }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if release amount exceeds balance', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue({
        ...mockMerchantRiskProfile,
        reserveBalance: BigInt(500),
      });

      await expect(
        service.releaseReserve('profile-1', { amount: 1000 }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update profile balance atomically', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.reserveTransaction.create.mockResolvedValue({ id: 'txn-2' });
      mockPrismaService.merchantRiskProfile.update.mockResolvedValue({});

      await service.releaseReserve('profile-1', { amount: 500 }, 'user-1');

      expect(mockPrismaService.merchantRiskProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: {
          reserveBalance: BigInt(9500), // 10000 - 500
          reserveReleasedTotal: { increment: 500 },
        },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // adjustReserve Tests
  // ═══════════════════════════════════════════════════════════════

  describe('adjustReserve', () => {
    it('should adjust reserve with positive amount (credit)', async () => {
      const mockTransaction = {
        id: 'txn-3',
        type: ReserveTransactionType.ADJUSTMENT,
        amount: 1000,
        balanceAfter: BigInt(11000),
      };

      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.reserveTransaction.create.mockResolvedValue(mockTransaction);
      mockPrismaService.merchantRiskProfile.update.mockResolvedValue({});

      const result = await service.adjustReserve(
        'profile-1',
        { amount: 1000, description: 'Manual credit adjustment' },
        'user-1',
      );

      expect(result).toEqual(mockTransaction);
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.anything(),
        'ReserveTransaction',
        'txn-3',
        expect.objectContaining({
          metadata: expect.objectContaining({
            adjustmentType: 'CREDIT',
          }),
        }),
      );
    });

    it('should adjust reserve with negative amount (debit)', async () => {
      const mockTransaction = {
        id: 'txn-4',
        type: ReserveTransactionType.ADJUSTMENT,
        amount: -500,
        balanceAfter: BigInt(9500),
      };

      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.reserveTransaction.create.mockResolvedValue(mockTransaction);
      mockPrismaService.merchantRiskProfile.update.mockResolvedValue({});

      const result = await service.adjustReserve(
        'profile-1',
        { amount: -500, description: 'Manual debit adjustment' },
        'user-1',
      );

      expect(result).toEqual(mockTransaction);
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.anything(),
        'ReserveTransaction',
        'txn-4',
        expect.objectContaining({
          metadata: expect.objectContaining({
            adjustmentType: 'DEBIT',
          }),
        }),
      );
    });

    it('should throw BadRequestException for zero adjustment', async () => {
      await expect(
        service.adjustReserve('profile-1', { amount: 0, description: 'No-op' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if adjustment would result in negative balance', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue({
        ...mockMerchantRiskProfile,
        reserveBalance: BigInt(500),
      });

      await expect(
        service.adjustReserve('profile-1', { amount: -1000, description: 'Too large debit' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.adjustReserve('non-existent', { amount: 100, description: 'Test' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // debitForChargeback Tests
  // ═══════════════════════════════════════════════════════════════

  describe('debitForChargeback', () => {
    it('should debit full amount when balance is sufficient', async () => {
      const mockTransaction = {
        id: 'txn-5',
        type: ReserveTransactionType.CHARGEBACK_DEBIT,
        amount: -500,
        balanceAfter: BigInt(9500),
      };

      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.reserveTransaction.create.mockResolvedValue(mockTransaction);
      mockPrismaService.merchantRiskProfile.update.mockResolvedValue({});

      const result = await service.debitForChargeback('profile-1', 'chargeback-1', 500, 'user-1');

      expect(result.transaction).toEqual(mockTransaction);
      expect(result.debitedAmount).toBe(500);
      expect(result.remainingUnfunded).toBe(0);
      expect(mockAuditLogsService.log).toHaveBeenCalled();
    });

    it('should debit partial amount when balance is insufficient', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue({
        ...mockMerchantRiskProfile,
        reserveBalance: BigInt(300),
      });

      const mockTransaction = {
        id: 'txn-6',
        type: ReserveTransactionType.CHARGEBACK_DEBIT,
        amount: -300,
        balanceAfter: BigInt(0),
      };

      mockPrismaService.reserveTransaction.create.mockResolvedValue(mockTransaction);
      mockPrismaService.merchantRiskProfile.update.mockResolvedValue({});

      const result = await service.debitForChargeback('profile-1', 'chargeback-1', 500, 'user-1');

      expect(result.debitedAmount).toBe(300);
      expect(result.remainingUnfunded).toBe(200);
    });

    it('should throw BadRequestException for non-positive chargeback amount', async () => {
      await expect(
        service.debitForChargeback('profile-1', 'chargeback-1', 0, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.debitForChargeback('profile-1', 'chargeback-1', -100, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.debitForChargeback('non-existent', 'chargeback-1', 500, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include chargeback ID in transaction', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.reserveTransaction.create.mockResolvedValue({ id: 'txn-7' });
      mockPrismaService.merchantRiskProfile.update.mockResolvedValue({});

      await service.debitForChargeback('profile-1', 'chargeback-123', 500, 'user-1');

      expect(mockPrismaService.reserveTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          relatedChargebackId: 'chargeback-123',
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getReserveSummary Tests
  // ═══════════════════════════════════════════════════════════════

  describe('getReserveSummary', () => {
    it('should return reserve summary with pending releases and transactions', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const mockPendingReleases = [
        { id: 'pending-1', scheduledReleaseDate: futureDate, amount: 500 },
        { id: 'pending-2', scheduledReleaseDate: futureDate, amount: 300 },
      ];
      const mockRecentTransactions = [
        { id: 'txn-1', type: ReserveTransactionType.HOLD, amount: 1000, balanceAfter: BigInt(11000) },
      ];

      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.reserveTransaction.findMany
        .mockResolvedValueOnce(mockPendingReleases)
        .mockResolvedValueOnce(mockRecentTransactions);

      const result = await service.getReserveSummary('profile-1');

      expect(result.merchantRiskProfileId).toBe('profile-1');
      expect(result.currentBalance).toBe('10000');
      expect(result.totalHeld).toBe('15000');
      expect(result.totalReleased).toBe('5000');
      expect(result.pendingReleases).toHaveLength(2);
      expect(result.recentTransactions).toHaveLength(1);
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(null);

      await expect(service.getReserveSummary('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should serialize BigInt fields to strings', async () => {
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.reserveTransaction.findMany.mockResolvedValue([]);

      const result = await service.getReserveSummary('profile-1');

      expect(typeof result.currentBalance).toBe('string');
      expect(typeof result.totalHeld).toBe('string');
      expect(typeof result.totalReleased).toBe('string');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getTransactionHistory Tests
  // ═══════════════════════════════════════════════════════════════

  describe('getTransactionHistory', () => {
    it('should return paginated transaction history', async () => {
      const mockTransactions = [
        { id: 'txn-1', type: ReserveTransactionType.HOLD, amount: 1000, balanceAfter: BigInt(11000), createdAt: new Date() },
        { id: 'txn-2', type: ReserveTransactionType.RELEASE, amount: -500, balanceAfter: BigInt(10500), createdAt: new Date() },
      ];

      mockPrismaService.reserveTransaction.findMany.mockResolvedValue(mockTransactions);
      mockPrismaService.reserveTransaction.count.mockResolvedValue(50);

      const result = await service.getTransactionHistory(
        'profile-1',
        {},
        { skip: 0, take: 10 },
      );

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(50);
    });

    it('should filter by transaction type', async () => {
      mockPrismaService.reserveTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.reserveTransaction.count.mockResolvedValue(0);

      await service.getTransactionHistory(
        'profile-1',
        { type: ReserveTransactionType.HOLD },
        {},
      );

      expect(mockPrismaService.reserveTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: ReserveTransactionType.HOLD,
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');

      mockPrismaService.reserveTransaction.findMany.mockResolvedValue([]);
      mockPrismaService.reserveTransaction.count.mockResolvedValue(0);

      await service.getTransactionHistory(
        'profile-1',
        { fromDate, toDate },
        {},
      );

      expect(mockPrismaService.reserveTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: fromDate, lte: toDate },
          }),
        }),
      );
    });

    it('should serialize BigInt fields in response', async () => {
      mockPrismaService.reserveTransaction.findMany.mockResolvedValue([
        { id: 'txn-1', balanceAfter: BigInt(1000) },
      ]);
      mockPrismaService.reserveTransaction.count.mockResolvedValue(1);

      const result = await service.getTransactionHistory('profile-1', {}, {});

      expect(typeof result.items[0].balanceAfter).toBe('string');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // processScheduledReleases Tests
  // ═══════════════════════════════════════════════════════════════

  describe('processScheduledReleases', () => {
    it('should process due holds and release them', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockDueHolds = [
        {
          id: 'hold-1',
          merchantRiskProfileId: 'profile-1',
          amount: 500,
          createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          scheduledReleaseDate: pastDate,
          merchantRiskProfile: mockMerchantRiskProfile,
        },
      ];

      mockPrismaService.reserveTransaction.findMany.mockResolvedValue(mockDueHolds);
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.reserveTransaction.create.mockResolvedValue({ id: 'release-1' });
      mockPrismaService.merchantRiskProfile.update.mockResolvedValue({});
      mockPrismaService.reserveTransaction.update.mockResolvedValue({});

      const results = await service.processScheduledReleases();

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('released');
      expect(mockPrismaService.reserveTransaction.update).toHaveBeenCalledWith({
        where: { id: 'hold-1' },
        data: { releasedAt: expect.any(Date) },
      });
    });

    it('should return empty array when no holds are due', async () => {
      mockPrismaService.reserveTransaction.findMany.mockResolvedValue([]);

      const results = await service.processScheduledReleases();

      expect(results).toHaveLength(0);
      expect(mockAuditLogsService.log).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully and continue processing', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockDueHolds = [
        {
          id: 'hold-1',
          merchantRiskProfileId: 'profile-1',
          amount: 500,
          createdAt: new Date(),
          scheduledReleaseDate: pastDate,
          merchantRiskProfile: mockMerchantRiskProfile,
        },
        {
          id: 'hold-2',
          merchantRiskProfileId: 'profile-2',
          amount: 300,
          createdAt: new Date(),
          scheduledReleaseDate: pastDate,
          merchantRiskProfile: { ...mockMerchantRiskProfile, id: 'profile-2' },
        },
      ];

      mockPrismaService.reserveTransaction.findMany.mockResolvedValue(mockDueHolds);

      // First release fails, second succeeds
      mockPrismaService.merchantRiskProfile.findUnique
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({ ...mockMerchantRiskProfile, id: 'profile-2' });

      mockPrismaService.reserveTransaction.create.mockResolvedValue({ id: 'release-2' });
      mockPrismaService.merchantRiskProfile.update.mockResolvedValue({});
      mockPrismaService.reserveTransaction.update.mockResolvedValue({});

      const results = await service.processScheduledReleases();

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('error');
      expect(results[0].error).toBe('Database error');
      expect(results[1].status).toBe('released');
    });

    it('should log batch audit entry when holds are processed', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockDueHolds = [
        {
          id: 'hold-1',
          merchantRiskProfileId: 'profile-1',
          amount: 500,
          createdAt: new Date(),
          scheduledReleaseDate: pastDate,
          merchantRiskProfile: mockMerchantRiskProfile,
        },
      ];

      mockPrismaService.reserveTransaction.findMany.mockResolvedValue(mockDueHolds);
      mockPrismaService.merchantRiskProfile.findUnique.mockResolvedValue(mockMerchantRiskProfile);
      mockPrismaService.reserveTransaction.create.mockResolvedValue({ id: 'release-1' });
      mockPrismaService.merchantRiskProfile.update.mockResolvedValue({});
      mockPrismaService.reserveTransaction.update.mockResolvedValue({});

      await service.processScheduledReleases();

      // Should have audit logs for: release transaction + batch processing
      expect(mockAuditLogsService.log).toHaveBeenCalled();
    });
  });
});
