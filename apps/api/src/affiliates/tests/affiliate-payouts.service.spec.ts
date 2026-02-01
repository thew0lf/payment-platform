/**
 * Affiliate Payouts Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AffiliatePayoutsService } from '../services/affiliate-payouts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { IdempotencyService } from '../../common/services/idempotency.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AffiliatePayoutStatus } from '@prisma/client';

describe('AffiliatePayoutsService', () => {
  let service: AffiliatePayoutsService;
  let prismaService: PrismaService;
  let hierarchyService: HierarchyService;
  let auditLogsService: AuditLogsService;
  let idempotencyService: IdempotencyService;

  // Mock functions for easier access
  let mockPayoutFindMany: jest.Mock;
  let mockPayoutFindFirst: jest.Mock;
  let mockPayoutFindUnique: jest.Mock;
  let mockPayoutCreate: jest.Mock;
  let mockPayoutUpdate: jest.Mock;
  let mockPayoutCount: jest.Mock;
  let mockPayoutAggregate: jest.Mock;
  let mockPartnerFindMany: jest.Mock;
  let mockPartnerFindFirst: jest.Mock;
  let mockPartnerUpdate: jest.Mock;
  let mockConversionGroupBy: jest.Mock;
  let mockConfigFindUnique: jest.Mock;
  let mockHierarchyGetAccessible: jest.Mock;
  let mockHierarchyValidate: jest.Mock;
  let mockAuditLog: jest.Mock;
  let mockIdempotencyCheckAndLock: jest.Mock;
  let mockIdempotencyComplete: jest.Mock;
  let mockIdempotencyFail: jest.Mock;

  const mockUser: UserContext = {
    sub: 'user-123',
    scopeType: 'ORGANIZATION',
    scopeId: 'org-123',
  };

  const mockPayout = {
    id: 'payout-123',
    partnerId: 'partner-123',
    companyId: 'company-123',
    amount: 100,
    currency: 'USD',
    method: 'PAYPAL',
    status: 'PENDING' as AffiliatePayoutStatus,
    periodStart: new Date('2024-01-01'),
    periodEnd: new Date('2024-01-31'),
    grossAmount: 100,
    fees: 0,
    netAmount: 100,
    conversionsCount: 10,
    reversalsCount: 0,
    reversalsAmount: 0,
    invoiceNumber: 'INV-ABC123',
    createdAt: new Date(),
    updatedAt: new Date(),
    partner: {
      id: 'partner-123',
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'JohnD',
      email: 'john@test.com',
      affiliateCode: 'JOHN2024',
      payoutMethod: 'PAYPAL',
    },
    company: {
      id: 'company-123',
      name: 'Test Company',
      slug: 'test-company',
    },
  };

  const mockPartner = {
    id: 'partner-123',
    companyId: 'company-123',
    email: 'john@test.com',
    firstName: 'John',
    lastName: 'Doe',
    status: 'ACTIVE',
    currentBalance: 100,
    totalPaid: 500,
    payoutMethod: 'PAYPAL',
    payoutThreshold: 50,
    deletedAt: null,
  };

  beforeEach(async () => {
    // Initialize mock functions
    mockPayoutFindMany = jest.fn();
    mockPayoutFindFirst = jest.fn();
    mockPayoutFindUnique = jest.fn();
    mockPayoutCreate = jest.fn();
    mockPayoutUpdate = jest.fn();
    mockPayoutCount = jest.fn();
    mockPayoutAggregate = jest.fn();
    mockPartnerFindMany = jest.fn();
    mockPartnerFindFirst = jest.fn();
    mockPartnerUpdate = jest.fn();
    mockConversionGroupBy = jest.fn();
    mockConfigFindUnique = jest.fn();
    mockHierarchyGetAccessible = jest.fn().mockResolvedValue(['company-123']);
    mockHierarchyValidate = jest.fn().mockResolvedValue(true);
    mockAuditLog = jest.fn().mockResolvedValue(undefined);
    mockIdempotencyCheckAndLock = jest.fn().mockResolvedValue({ isDuplicate: false, key: 'mock-key' });
    mockIdempotencyComplete = jest.fn().mockResolvedValue(undefined);
    mockIdempotencyFail = jest.fn().mockResolvedValue(undefined);

    const mockPrismaService = {
      affiliatePayout: {
        findMany: mockPayoutFindMany,
        findFirst: mockPayoutFindFirst,
        findUnique: mockPayoutFindUnique,
        create: mockPayoutCreate,
        update: mockPayoutUpdate,
        count: mockPayoutCount,
        aggregate: mockPayoutAggregate,
      },
      affiliatePartner: {
        findMany: mockPartnerFindMany,
        findFirst: mockPartnerFindFirst,
        update: mockPartnerUpdate,
      },
      affiliateConversion: {
        groupBy: mockConversionGroupBy,
      },
      affiliateProgramConfig: {
        findUnique: mockConfigFindUnique,
      },
      $transaction: jest.fn((fn) => fn(mockPrismaService)),
    };

    const mockHierarchyService = {
      getAccessibleCompanyIds: mockHierarchyGetAccessible,
      validateCompanyAccess: mockHierarchyValidate,
    };

    const mockAuditLogsService = {
      log: mockAuditLog,
    };

    const mockIdempotencyService = {
      checkAndLock: mockIdempotencyCheckAndLock,
      complete: mockIdempotencyComplete,
      fail: mockIdempotencyFail,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliatePayoutsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HierarchyService, useValue: mockHierarchyService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
      ],
    }).compile();

    service = module.get<AffiliatePayoutsService>(AffiliatePayoutsService);
    prismaService = module.get(PrismaService);
    hierarchyService = module.get(HierarchyService);
    auditLogsService = module.get(AuditLogsService);
    idempotencyService = module.get(IdempotencyService);
  });

  describe('findAll', () => {
    it('should return paginated payouts', async () => {
      mockPayoutFindMany.mockResolvedValue([mockPayout]);
      mockPayoutCount.mockResolvedValue(1);

      const result = await service.findAll(mockUser, { limit: '50', offset: '0' });

      expect(result.payouts).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(hierarchyService.getAccessibleCompanyIds).toHaveBeenCalledWith(mockUser);
    });

    it('should filter by status', async () => {
      mockPayoutFindMany.mockResolvedValue([mockPayout]);
      mockPayoutCount.mockResolvedValue(1);

      await service.findAll(mockUser, { status: 'PENDING' });

      expect(mockPayoutFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
          }),
        }),
      );
    });

    it('should filter by partner', async () => {
      mockPayoutFindMany.mockResolvedValue([mockPayout]);
      mockPayoutCount.mockResolvedValue(1);

      await service.findAll(mockUser, { partnerId: 'partner-123' });

      expect(mockPayoutFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            partnerId: 'partner-123',
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPayoutFindMany.mockResolvedValue([mockPayout]);
      mockPayoutCount.mockResolvedValue(1);

      await service.findAll(mockUser, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockPayoutFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return a payout by ID', async () => {
      mockPayoutFindUnique.mockResolvedValue(mockPayout);

      const result = await service.findById(mockUser, 'payout-123');

      expect(result).toEqual(mockPayout);
      expect(hierarchyService.validateCompanyAccess).toHaveBeenCalledWith(
        mockUser,
        'company-123',
        'view affiliate payout',
      );
    });

    it('should throw NotFoundException if payout not found', async () => {
      mockPayoutFindUnique.mockResolvedValue(null);

      await expect(service.findById(mockUser, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createBatch', () => {
    const batchDto = {
      companyId: 'company-123',
      period: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      },
    };

    it('should create batch payouts for eligible partners', async () => {
      mockConfigFindUnique.mockResolvedValue({
        minimumPayoutThreshold: 50,
      });
      mockPartnerFindMany.mockResolvedValue([mockPartner]);
      mockConversionGroupBy
        .mockResolvedValueOnce([{ partnerId: 'partner-123', _count: 10, _sum: { commissionAmount: 100 } }])
        .mockResolvedValueOnce([]);
      mockPayoutCreate.mockResolvedValue(mockPayout);
      mockPartnerUpdate.mockResolvedValue({
        ...mockPartner,
        currentBalance: 0,
        totalPaid: 600,
      });

      const result = await service.createBatch(mockUser, batchDto) as any;

      expect(result.payouts).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(auditLogsService.log).toHaveBeenCalled();
    });

    it('should return empty if no eligible partners', async () => {
      mockConfigFindUnique.mockResolvedValue({
        minimumPayoutThreshold: 50,
      });
      mockPartnerFindMany.mockResolvedValue([]);

      const result = await service.createBatch(mockUser, batchDto) as any;

      expect(result.payouts).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it('should handle idempotency', async () => {
      const cachedResult = { payouts: [], count: 0 };
      mockIdempotencyCheckAndLock.mockResolvedValue({
        isDuplicate: true,
        cachedResult,
      });

      const result = await service.createBatch(mockUser, {
        ...batchDto,
        idempotencyKey: 'test-key',
      });

      expect(result).toEqual(cachedResult);
      expect(mockPartnerFindMany).not.toHaveBeenCalled();
    });
  });

  describe('createSingle', () => {
    const singleDto = {
      partnerId: 'partner-123',
      companyId: 'company-123',
      amount: 100,
      period: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      },
    };

    it('should create a single payout', async () => {
      mockPartnerFindFirst.mockResolvedValue(mockPartner);
      mockPayoutCreate.mockResolvedValue(mockPayout);
      mockPartnerUpdate.mockResolvedValue({
        ...mockPartner,
        currentBalance: 0,
        totalPaid: 600,
      });

      const result = await service.createSingle(mockUser, singleDto);

      expect(result).toEqual(mockPayout);
      expect(auditLogsService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if partner not found', async () => {
      mockPartnerFindFirst.mockResolvedValue(null);

      await expect(service.createSingle(mockUser, singleDto)).rejects.toThrow(NotFoundException);
    });

    it('should handle idempotency', async () => {
      // Service checks partner before idempotency, so we need to mock both
      mockPartnerFindFirst.mockResolvedValue(mockPartner);
      mockIdempotencyCheckAndLock.mockResolvedValue({
        isDuplicate: true,
        cachedResult: mockPayout,
        key: 'test-key',
      });

      const result = await service.createSingle(mockUser, {
        ...singleDto,
        idempotencyKey: 'test-key',
      });

      expect(result).toEqual(mockPayout);
      // Partner is checked before idempotency, so it should be called
      expect(mockPartnerFindFirst).toHaveBeenCalled();
      // Idempotency service should be called
      expect(mockIdempotencyCheckAndLock).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto = {
      status: 'PROCESSING' as AffiliatePayoutStatus,
    };

    it('should update a payout', async () => {
      mockPayoutFindUnique.mockResolvedValue(mockPayout);
      mockPayoutUpdate.mockResolvedValue({
        ...mockPayout,
        status: 'PROCESSING',
      });

      const result = await service.update(mockUser, 'payout-123', updateDto);

      expect(result.status).toBe('PROCESSING');
      expect(auditLogsService.log).toHaveBeenCalled();
    });

    it('should restore balance on failure', async () => {
      mockPayoutFindUnique.mockResolvedValue(mockPayout);
      mockPayoutUpdate.mockResolvedValue({
        ...mockPayout,
        status: 'FAILED',
      });
      mockPartnerUpdate.mockResolvedValue(mockPartner);

      await service.update(mockUser, 'payout-123', { status: 'FAILED' as AffiliatePayoutStatus });

      expect(mockPartnerUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'partner-123' },
          data: expect.objectContaining({
            currentBalance: expect.any(Object),
            totalPaid: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('process', () => {
    it('should process a pending payout', async () => {
      mockPayoutFindUnique.mockResolvedValue(mockPayout);
      mockPayoutUpdate
        .mockResolvedValueOnce({ ...mockPayout, status: 'PROCESSING' })
        .mockResolvedValueOnce({ ...mockPayout, status: 'COMPLETED', processedAt: new Date() });

      const result = await service.process(mockUser, 'payout-123', { transactionId: 'tx-123' });

      expect(result.status).toBe('COMPLETED');
      expect(auditLogsService.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException if payout is not pending', async () => {
      mockPayoutFindUnique.mockResolvedValue({
        ...mockPayout,
        status: 'COMPLETED',
      });

      await expect(
        service.process(mockUser, 'payout-123', { transactionId: 'tx-123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    it('should approve a pending payout', async () => {
      mockPayoutFindUnique.mockResolvedValue(mockPayout);
      mockPayoutUpdate.mockResolvedValue({
        ...mockPayout,
        approvedAt: new Date(),
        approvedBy: 'user-123',
      });

      const result = await service.approve(mockUser, 'payout-123');

      expect(result.approvedAt).toBeDefined();
      expect(auditLogsService.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException if payout is not pending or on hold', async () => {
      mockPayoutFindUnique.mockResolvedValue({
        ...mockPayout,
        status: 'COMPLETED',
      });

      await expect(service.approve(mockUser, 'payout-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('hold', () => {
    it('should put a payout on hold', async () => {
      mockPayoutFindUnique.mockResolvedValue(mockPayout);
      mockPayoutUpdate.mockResolvedValue({
        ...mockPayout,
        status: 'ON_HOLD',
        failReason: 'Pending review',
      });

      const result = await service.hold(mockUser, 'payout-123', 'Pending review');

      expect(result.status).toBe('ON_HOLD');
      expect(auditLogsService.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException if payout is not pending', async () => {
      mockPayoutFindUnique.mockResolvedValue({
        ...mockPayout,
        status: 'COMPLETED',
      });

      await expect(service.hold(mockUser, 'payout-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should return payout statistics', async () => {
      mockPayoutCount
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20) // pending
        .mockResolvedValueOnce(5) // processing
        .mockResolvedValueOnce(70); // completed
      mockPayoutAggregate
        .mockResolvedValueOnce({ _sum: { netAmount: 5000 } }) // total paid
        .mockResolvedValueOnce({ _sum: { netAmount: 1500 } }); // pending amount

      const result = await service.getStats(mockUser, {});

      expect(result.total).toBe(100);
      expect(result.pending).toBe(20);
      expect(result.processing).toBe(5);
      expect(result.completed).toBe(70);
      expect(result.totalPaid).toBe(5000);
      expect(result.pendingAmount).toBe(1500);
    });
  });
});
