/**
 * Affiliate Payouts Controller Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AffiliatePayoutsController } from './affiliate-payouts.controller';
import { AffiliatePayoutsService } from '../services/affiliate-payouts.service';
import { AffiliatePayoutStatus, AffiliatePayoutMethod } from '@prisma/client';

describe('AffiliatePayoutsController', () => {
  let controller: AffiliatePayoutsController;
  let payoutsService: jest.Mocked<AffiliatePayoutsService>;

  const mockUser = {
    sub: 'user-123',
    scopeType: 'ORGANIZATION',
    scopeId: 'org-123',
  };

  const mockRequest = { user: mockUser };

  const mockPayout = {
    id: 'payout-123',
    partnerId: 'partner-123',
    companyId: 'company-123',
    amount: 100,
    currency: 'USD',
    method: 'PAYPAL' as AffiliatePayoutMethod,
    status: 'PENDING' as AffiliatePayoutStatus,
    periodStart: new Date('2024-01-01'),
    periodEnd: new Date('2024-01-31'),
    grossAmount: 100,
    fees: 0,
    netAmount: 100,
    conversionsCount: 10,
    reversalsCount: 0,
    reversalsAmount: 0,
    transactionId: null,
    paymentDetails: null,
    processedAt: null,
    failedAt: null,
    failReason: null,
    invoiceNumber: 'INV-ABC123',
    invoiceUrl: null,
    approvedAt: null,
    approvedBy: null,
    idempotencyKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    partner: {
      id: 'partner-123',
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'JohnD',
      email: 'john@test.com',
      affiliateCode: 'JOHN2024',
      payoutMethod: 'PAYPAL' as AffiliatePayoutMethod,
      payoutDetails: null,
    },
    company: {
      id: 'company-123',
      name: 'Test Company',
      slug: 'test-company',
    },
  };

  const mockPayoutsService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    createBatch: jest.fn(),
    createSingle: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    process: jest.fn(),
    approve: jest.fn(),
    hold: jest.fn(),
    cancel: jest.fn(),
    getStats: jest.fn(),
    getConversionsForPayout: jest.fn(),
    calculatePending: jest.fn(),
    getPendingSummary: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AffiliatePayoutsController],
      providers: [
        { provide: AffiliatePayoutsService, useValue: mockPayoutsService },
      ],
    }).compile();

    controller = module.get<AffiliatePayoutsController>(AffiliatePayoutsController);
    payoutsService = module.get(AffiliatePayoutsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listPayouts', () => {
    it('should return paginated payouts', async () => {
      const mockResult = { payouts: [mockPayout], total: 1, limit: 50, offset: 0 };
      payoutsService.findAll.mockResolvedValue(mockResult as any);

      const result = await controller.listPayouts(mockRequest, { limit: '50', offset: '0' });

      expect(result).toEqual(mockResult);
      expect(payoutsService.findAll).toHaveBeenCalledWith(mockUser, { limit: '50', offset: '0' });
    });

    it('should pass filter parameters to service', async () => {
      const mockResult = { payouts: [], total: 0, limit: 50, offset: 0 };
      payoutsService.findAll.mockResolvedValue(mockResult as any);

      const query = {
        status: 'PENDING',
        partnerId: 'partner-123',
        companyId: 'company-123',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      await controller.listPayouts(mockRequest, query);

      expect(payoutsService.findAll).toHaveBeenCalledWith(mockUser, query);
    });
  });

  describe('getPayoutStats', () => {
    it('should return payout statistics', async () => {
      const mockStats = {
        total: 100,
        pending: 20,
        processing: 5,
        completed: 70,
        failed: 5,
        totalPaid: 5000,
        pendingAmount: 1500,
      };
      payoutsService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getPayoutStats(mockRequest, 'company-123');

      expect(result).toEqual(mockStats);
      expect(payoutsService.getStats).toHaveBeenCalledWith(mockUser, { companyId: 'company-123' });
    });
  });

  describe('getPendingSummary', () => {
    it('should return pending payout summary', async () => {
      const mockSummary = {
        totalPartners: 10,
        eligiblePartners: 5,
        pendingPartners: 5,
        totalPendingAmount: 2500,
        eligibleAmount: 1800,
        byPaymentMethod: {
          PAYPAL: { count: 3, amount: 1200 },
          BANK_TRANSFER: { count: 2, amount: 600 },
        },
      };
      payoutsService.getPendingSummary.mockResolvedValue(mockSummary as any);

      const result = await controller.getPendingSummary(mockRequest, 'company-123', 'false');

      expect(result).toEqual(mockSummary);
      expect(payoutsService.getPendingSummary).toHaveBeenCalledWith(mockUser, {
        companyId: 'company-123',
        includeDetails: false,
      });
    });

    it('should include details when requested', async () => {
      const mockSummary = {
        totalPartners: 10,
        eligiblePartners: 5,
        pendingPartners: 5,
        totalPendingAmount: 2500,
        eligibleAmount: 1800,
        byPaymentMethod: {},
        eligible: [],
        pending: [],
      };
      payoutsService.getPendingSummary.mockResolvedValue(mockSummary as any);

      await controller.getPendingSummary(mockRequest, 'company-123', 'true');

      expect(payoutsService.getPendingSummary).toHaveBeenCalledWith(mockUser, {
        companyId: 'company-123',
        includeDetails: true,
      });
    });
  });

  describe('calculatePending', () => {
    it('should calculate pending payouts', async () => {
      const mockCalculation = {
        summaries: [],
        totalPartners: 5,
        eligiblePartners: 3,
        totalAvailable: 1500,
        totalEligible: 1200,
        holdPeriodDays: 30,
      };
      payoutsService.calculatePending.mockResolvedValue(mockCalculation);

      const dto = {
        companyId: 'company-123',
        includeHoldPeriod: true,
        holdPeriodDays: 30,
      };

      const result = await controller.calculatePending(mockRequest, dto);

      expect(result).toEqual(mockCalculation);
      expect(payoutsService.calculatePending).toHaveBeenCalledWith(mockUser, dto);
    });
  });

  describe('createPayoutBatch', () => {
    it('should create a batch of payouts', async () => {
      const mockResult = {
        payouts: [mockPayout],
        count: 1,
        totalAmount: 100,
      };
      payoutsService.createBatch.mockResolvedValue(mockResult as any);

      const dto = {
        companyId: 'company-123',
        period: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        },
      };

      const result = await controller.createPayoutBatch(mockRequest, dto);

      expect(result).toEqual(mockResult);
      expect(payoutsService.createBatch).toHaveBeenCalledWith(mockUser, dto);
    });
  });

  describe('getPayout', () => {
    it('should return a payout by ID', async () => {
      payoutsService.findById.mockResolvedValue(mockPayout as any);

      const result = await controller.getPayout(mockRequest, 'payout-123');

      expect(result).toEqual(mockPayout);
      expect(payoutsService.findById).toHaveBeenCalledWith(mockUser, 'payout-123');
    });
  });

  describe('getPayoutConversions', () => {
    it('should return conversions for a payout', async () => {
      const mockConversions = {
        conversions: [],
        total: 0,
        limit: 50,
        offset: 0,
        payout: {
          id: 'payout-123',
          periodStart: new Date('2024-01-01'),
          periodEnd: new Date('2024-01-31'),
          partnerId: 'partner-123',
        },
      };
      payoutsService.getConversionsForPayout.mockResolvedValue(mockConversions as any);

      const result = await controller.getPayoutConversions(mockRequest, 'payout-123', '50', '0');

      expect(result).toEqual(mockConversions);
      expect(payoutsService.getConversionsForPayout).toHaveBeenCalledWith(
        mockUser,
        'payout-123',
        { limit: 50, offset: 0 },
      );
    });

    it('should use default pagination values', async () => {
      const mockConversions = {
        conversions: [],
        total: 0,
        limit: 50,
        offset: 0,
        payout: {
          id: 'payout-123',
          periodStart: new Date(),
          periodEnd: new Date(),
          partnerId: 'partner-123',
        },
      };
      payoutsService.getConversionsForPayout.mockResolvedValue(mockConversions as any);

      await controller.getPayoutConversions(mockRequest, 'payout-123');

      expect(payoutsService.getConversionsForPayout).toHaveBeenCalledWith(
        mockUser,
        'payout-123',
        { limit: 50, offset: 0 },
      );
    });
  });

  describe('createPayout', () => {
    it('should create a single payout', async () => {
      payoutsService.createSingle.mockResolvedValue(mockPayout as any);

      const dto = {
        partnerId: 'partner-123',
        companyId: 'company-123',
        amount: 100,
        period: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        },
      };

      const result = await controller.createPayout(mockRequest, dto);

      expect(result).toEqual(mockPayout);
      expect(payoutsService.createSingle).toHaveBeenCalledWith(mockUser, dto);
    });
  });

  describe('updatePayoutStatus', () => {
    it('should update payout status', async () => {
      const updatedPayout = { ...mockPayout, status: 'COMPLETED' as AffiliatePayoutStatus };
      payoutsService.updateStatus.mockResolvedValue(updatedPayout as any);

      const dto = {
        status: 'COMPLETED' as AffiliatePayoutStatus,
        transactionRef: 'txn-123',
      };

      const result = await controller.updatePayoutStatus(mockRequest, 'payout-123', dto);

      expect(result.status).toBe('COMPLETED');
      expect(payoutsService.updateStatus).toHaveBeenCalledWith(mockUser, 'payout-123', dto);
    });

    it('should update status with fail reason', async () => {
      const updatedPayout = { ...mockPayout, status: 'FAILED' as AffiliatePayoutStatus };
      payoutsService.updateStatus.mockResolvedValue(updatedPayout as any);

      const dto = {
        status: 'FAILED' as AffiliatePayoutStatus,
        failReason: 'Payment gateway error',
      };

      await controller.updatePayoutStatus(mockRequest, 'payout-123', dto);

      expect(payoutsService.updateStatus).toHaveBeenCalledWith(mockUser, 'payout-123', dto);
    });
  });

  describe('updatePayout', () => {
    it('should update payout details', async () => {
      const updatedPayout = { ...mockPayout, transactionId: 'txn-456' };
      payoutsService.update.mockResolvedValue(updatedPayout as any);

      const dto = {
        transactionId: 'txn-456',
      };

      const result = await controller.updatePayout(mockRequest, 'payout-123', dto);

      expect(result.transactionId).toBe('txn-456');
      expect(payoutsService.update).toHaveBeenCalledWith(mockUser, 'payout-123', dto);
    });
  });

  describe('processPayout', () => {
    it('should process a payout', async () => {
      const processedPayout = {
        ...mockPayout,
        status: 'COMPLETED' as AffiliatePayoutStatus,
        processedAt: new Date(),
      };
      payoutsService.process.mockResolvedValue(processedPayout as any);

      const dto = { transactionId: 'txn-789' };

      const result = await controller.processPayout(mockRequest, 'payout-123', dto);

      expect(result.status).toBe('COMPLETED');
      expect(payoutsService.process).toHaveBeenCalledWith(mockUser, 'payout-123', dto);
    });
  });

  describe('approvePayout', () => {
    it('should approve a payout', async () => {
      const approvedPayout = { ...mockPayout, approvedAt: new Date(), approvedBy: 'user-123' };
      payoutsService.approve.mockResolvedValue(approvedPayout as any);

      const result = await controller.approvePayout(mockRequest, 'payout-123');

      expect(result.approvedAt).toBeDefined();
      expect(payoutsService.approve).toHaveBeenCalledWith(mockUser, 'payout-123');
    });
  });

  describe('holdPayout', () => {
    it('should put a payout on hold', async () => {
      const heldPayout = { ...mockPayout, status: 'ON_HOLD' as AffiliatePayoutStatus };
      payoutsService.hold.mockResolvedValue(heldPayout as any);

      const result = await controller.holdPayout(mockRequest, 'payout-123', 'Pending review');

      expect(result.status).toBe('ON_HOLD');
      expect(payoutsService.hold).toHaveBeenCalledWith(mockUser, 'payout-123', 'Pending review');
    });

    it('should put a payout on hold without reason', async () => {
      const heldPayout = { ...mockPayout, status: 'ON_HOLD' as AffiliatePayoutStatus };
      payoutsService.hold.mockResolvedValue(heldPayout as any);

      await controller.holdPayout(mockRequest, 'payout-123');

      expect(payoutsService.hold).toHaveBeenCalledWith(mockUser, 'payout-123', undefined);
    });
  });

  describe('cancelPayout', () => {
    it('should cancel a payout', async () => {
      const cancelledPayout = { ...mockPayout, status: 'CANCELLED' as AffiliatePayoutStatus };
      payoutsService.cancel.mockResolvedValue(cancelledPayout as any);

      const result = await controller.cancelPayout(mockRequest, 'payout-123', 'No longer needed');

      expect(result.status).toBe('CANCELLED');
      expect(payoutsService.cancel).toHaveBeenCalledWith(mockUser, 'payout-123', 'No longer needed');
    });

    it('should cancel a payout without reason', async () => {
      const cancelledPayout = { ...mockPayout, status: 'CANCELLED' as AffiliatePayoutStatus };
      payoutsService.cancel.mockResolvedValue(cancelledPayout as any);

      await controller.cancelPayout(mockRequest, 'payout-123');

      expect(payoutsService.cancel).toHaveBeenCalledWith(mockUser, 'payout-123', undefined);
    });
  });
});
