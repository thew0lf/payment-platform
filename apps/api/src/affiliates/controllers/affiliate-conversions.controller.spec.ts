/**
 * Affiliate Conversions Controller Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AffiliateConversionsController } from './affiliate-conversions.controller';
import { AffiliateConversionsService } from '../services/affiliate-conversions.service';
import { UserContext } from '../../hierarchy/hierarchy.service';
import { ConversionStatus, AffiliateTier, OrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('AffiliateConversionsController', () => {
  let controller: AffiliateConversionsController;
  let service: jest.Mocked<AffiliateConversionsService>;

  const mockUser: UserContext = {
    sub: 'user-123',
    scopeType: 'ORGANIZATION',
    scopeId: 'org-123',
  };

  const mockConversion = {
    id: 'conv-123',
    partnerId: 'partner-123',
    linkId: 'link-123',
    companyId: 'company-123',
    clickId: 'click-123',
    orderId: 'order-123',
    orderNumber: 'A-000000001',
    orderTotal: 100,
    currency: 'USD',
    commissionRate: 10,
    commissionAmount: 10,
    secondTierAmount: 0,
    attributionWindow: 5,
    isFirstPurchase: false,
    customerId: 'customer-123',
    subId1: 'sub1-value',
    subId2: 'sub2-value',
    subId3: null,
    subId4: null,
    subId5: null,
    customParams: null,
    status: 'PENDING' as ConversionStatus,
    approvedAt: null,
    approvedBy: null,
    rejectedAt: null,
    rejectedBy: null,
    rejectReason: null,
    reversedAt: null,
    reversalReason: null,
    reversalAmount: null,
    idempotencyKey: 'conv-order-123',
    convertedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    partner: {
      id: 'partner-123',
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'JohnD',
      email: 'john@test.com',
      affiliateCode: 'JOHN24AB',
      tier: AffiliateTier.BRONZE,
      commissionRate: 10,
    },
    link: {
      id: 'link-123',
      name: 'Test Link',
      trackingCode: 'TRK123',
      campaign: 'TestCampaign',
      source: 'web',
      medium: 'affiliate',
    },
    company: {
      id: 'company-123',
      name: 'Test Company',
      slug: 'test-company',
    },
    order: {
      id: 'order-123',
      orderNumber: 'A-000000001',
      status: OrderStatus.COMPLETED,
      total: new Decimal(100),
    },
  };

  const mockStats = {
    total: 100,
    pending: 20,
    approved: 70,
    rejected: 5,
    reversed: 5,
    totalRevenue: 10000,
    totalCommissions: 1000,
    conversionRate: 5.5,
    averageOrderValue: 100,
    averageCommission: 10,
  };

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      recordConversion: jest.fn(),
      updateStatus: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      reverse: jest.fn(),
      bulkApprove: jest.fn(),
      bulkReject: jest.fn(),
      getStats: jest.fn(),
      getStatsBySubId: jest.fn(),
      getPendingApproval: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AffiliateConversionsController],
      providers: [
        { provide: AffiliateConversionsService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<AffiliateConversionsController>(AffiliateConversionsController);
    service = module.get(AffiliateConversionsService) as unknown as jest.Mocked<AffiliateConversionsService>;
  });

  describe('listConversions', () => {
    it('should return paginated conversions', async () => {
      const mockResult = {
        conversions: [mockConversion],
        total: 1,
        limit: 50,
        offset: 0,
      };
      service.findAll.mockResolvedValue(mockResult);

      const result = await controller.listConversions(
        { user: mockUser },
        { companyId: 'company-123' },
      );

      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(mockUser, expect.objectContaining({
        companyId: 'company-123',
      }));
    });

    it('should parse pagination parameters', async () => {
      service.findAll.mockResolvedValue({ conversions: [], total: 0, limit: 10, offset: 20 });

      await controller.listConversions(
        { user: mockUser },
        { limit: '10', offset: '20' },
      );

      expect(service.findAll).toHaveBeenCalledWith(mockUser, expect.objectContaining({
        limit: 10,
        offset: 20,
      }));
    });

    it('should filter by status', async () => {
      service.findAll.mockResolvedValue({ conversions: [], total: 0, limit: 50, offset: 0 });

      await controller.listConversions(
        { user: mockUser },
        { status: 'PENDING' as ConversionStatus },
      );

      expect(service.findAll).toHaveBeenCalledWith(mockUser, expect.objectContaining({
        status: 'PENDING',
      }));
    });

    it('should filter by date range', async () => {
      service.findAll.mockResolvedValue({ conversions: [], total: 0, limit: 50, offset: 0 });

      await controller.listConversions(
        { user: mockUser },
        { startDate: '2024-01-01', endDate: '2024-12-31' },
      );

      expect(service.findAll).toHaveBeenCalledWith(mockUser, expect.objectContaining({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      }));
    });
  });

  describe('getConversion', () => {
    it('should return a single conversion by ID', async () => {
      service.findById.mockResolvedValue(mockConversion);

      const result = await controller.getConversion({ user: mockUser }, 'conv-123');

      expect(result).toEqual(mockConversion);
      expect(service.findById).toHaveBeenCalledWith(mockUser, 'conv-123');
    });
  });

  describe('getConversionStats', () => {
    it('should return aggregated statistics', async () => {
      service.getStats.mockResolvedValue(mockStats);

      const result = await controller.getConversionStats(
        { user: mockUser },
        { companyId: 'company-123' },
      );

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalledWith(mockUser, expect.objectContaining({
        companyId: 'company-123',
      }));
    });

    it('should filter stats by date range', async () => {
      service.getStats.mockResolvedValue(mockStats);

      await controller.getConversionStats(
        { user: mockUser },
        { startDate: '2024-01-01', endDate: '2024-12-31' },
      );

      expect(service.getStats).toHaveBeenCalledWith(mockUser, expect.objectContaining({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      }));
    });
  });

  describe('getConversionsBySubId', () => {
    const mockSubIdData = {
      groupBy: 'subId1' as const,
      data: [
        { subIdValue: 'campaign1', conversions: 50, revenue: 5000, commissions: 500, clicks: 1000, conversionRate: 5, averageOrderValue: 100 },
        { subIdValue: 'campaign2', conversions: 30, revenue: 3000, commissions: 300, clicks: 750, conversionRate: 4, averageOrderValue: 100 },
      ],
      totals: { conversions: 80, revenue: 8000, commissions: 800, clicks: 1750 },
    };

    it('should return SubID breakdown', async () => {
      service.getStatsBySubId.mockResolvedValue(mockSubIdData);

      const result = await controller.getConversionsBySubId(
        { user: mockUser },
        { groupBy: 'subId1' },
      );

      expect(result).toEqual(mockSubIdData);
      expect(service.getStatsBySubId).toHaveBeenCalledWith(mockUser, expect.objectContaining({
        groupBy: 'subId1',
      }));
    });

    it('should default to subId1 when groupBy not specified', async () => {
      service.getStatsBySubId.mockResolvedValue(mockSubIdData);

      await controller.getConversionsBySubId(
        { user: mockUser },
        {},
      );

      expect(service.getStatsBySubId).toHaveBeenCalledWith(mockUser, expect.objectContaining({
        groupBy: 'subId1',
      }));
    });
  });

  describe('recordConversion', () => {
    const recordDto = {
      companyId: 'company-123',
      orderId: 'order-456',
      orderNumber: 'A-000000002',
      saleAmount: 150,
      currency: 'USD',
      clickId: 'click-123',
    };

    it('should record a new conversion', async () => {
      const mockResult = {
        attributed: true,
        conversionId: 'conv-456',
        partnerId: 'partner-123',
        commissionAmount: 15,
      };
      service.recordConversion.mockResolvedValue(mockResult);

      const result = await controller.recordConversion({ user: mockUser }, recordDto);

      expect(result).toEqual(mockResult);
      expect(service.recordConversion).toHaveBeenCalledWith(mockUser, recordDto);
    });

    it('should return not attributed when no affiliate found', async () => {
      service.recordConversion.mockResolvedValue({ attributed: false });

      const result = await controller.recordConversion({ user: mockUser }, recordDto);

      expect(result.attributed).toBe(false);
    });
  });

  describe('updateConversionStatus', () => {
    it('should update conversion status', async () => {
      const updatedConversion = { ...mockConversion, status: 'APPROVED' as ConversionStatus };
      service.updateStatus.mockResolvedValue(updatedConversion);

      const result = await controller.updateConversionStatus(
        { user: mockUser },
        'conv-123',
        { status: 'APPROVED' as ConversionStatus },
      );

      expect(result.status).toBe('APPROVED');
      expect(service.updateStatus).toHaveBeenCalledWith(mockUser, 'conv-123', 'APPROVED', undefined);
    });

    it('should pass reason when rejecting', async () => {
      const updatedConversion = { ...mockConversion, status: 'REJECTED' as ConversionStatus };
      service.updateStatus.mockResolvedValue(updatedConversion);

      await controller.updateConversionStatus(
        { user: mockUser },
        'conv-123',
        { status: 'REJECTED' as ConversionStatus, reason: 'Fraudulent order' },
      );

      expect(service.updateStatus).toHaveBeenCalledWith(mockUser, 'conv-123', 'REJECTED', 'Fraudulent order');
    });
  });

  describe('approveConversion', () => {
    it('should approve a pending conversion', async () => {
      const approvedConversion = { ...mockConversion, status: 'APPROVED' as ConversionStatus };
      service.approve.mockResolvedValue(approvedConversion);

      const result = await controller.approveConversion({ user: mockUser }, 'conv-123');

      expect(result.status).toBe('APPROVED');
      expect(service.approve).toHaveBeenCalledWith(mockUser, 'conv-123');
    });
  });

  describe('rejectConversion', () => {
    it('should reject a pending conversion', async () => {
      const rejectedConversion = { ...mockConversion, status: 'REJECTED' as ConversionStatus };
      service.reject.mockResolvedValue(rejectedConversion);

      const result = await controller.rejectConversion(
        { user: mockUser },
        'conv-123',
        'Suspected fraud',
      );

      expect(result.status).toBe('REJECTED');
      expect(service.reject).toHaveBeenCalledWith(mockUser, 'conv-123', 'Suspected fraud');
    });

    it('should allow rejection without reason', async () => {
      const rejectedConversion = { ...mockConversion, status: 'REJECTED' as ConversionStatus };
      service.reject.mockResolvedValue(rejectedConversion);

      await controller.rejectConversion({ user: mockUser }, 'conv-123', undefined);

      expect(service.reject).toHaveBeenCalledWith(mockUser, 'conv-123', undefined);
    });
  });

  describe('reverseConversion', () => {
    it('should reverse an approved conversion', async () => {
      const reversedConversion = {
        ...mockConversion,
        status: 'REVERSED' as ConversionStatus,
        reversalReason: 'Order refunded',
        reversalAmount: 10,
      };
      service.reverse.mockResolvedValue(reversedConversion);

      const result = await controller.reverseConversion(
        { user: mockUser },
        'conv-123',
        'Order refunded',
        10,
      );

      expect(result.status).toBe('REVERSED');
      expect(service.reverse).toHaveBeenCalledWith(mockUser, 'conv-123', 'Order refunded', 10);
    });

    it('should reverse with partial amount', async () => {
      const reversedConversion = {
        ...mockConversion,
        status: 'REVERSED' as ConversionStatus,
        reversalAmount: 5,
      };
      service.reverse.mockResolvedValue(reversedConversion);

      const result = await controller.reverseConversion(
        { user: mockUser },
        'conv-123',
        'Partial refund',
        5,
      );

      expect(result.reversalAmount).toBe(5);
      expect(service.reverse).toHaveBeenCalledWith(mockUser, 'conv-123', 'Partial refund', 5);
    });
  });

  describe('bulkApprove', () => {
    it('should bulk approve multiple conversions', async () => {
      const mockResult = {
        total: 3,
        successful: 2,
        failed: 1,
        results: [
          { id: 'conv-1', success: true },
          { id: 'conv-2', success: true },
          { id: 'conv-3', success: false, error: 'Not pending' },
        ],
      };
      service.bulkApprove.mockResolvedValue(mockResult);

      const result = await controller.bulkApprove(
        { user: mockUser },
        { conversionIds: ['conv-1', 'conv-2', 'conv-3'] },
      );

      expect(result.total).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(service.bulkApprove).toHaveBeenCalledWith(mockUser, ['conv-1', 'conv-2', 'conv-3']);
    });
  });

  describe('bulkReject', () => {
    it('should bulk reject multiple conversions', async () => {
      const mockResult = {
        total: 2,
        successful: 2,
        failed: 0,
        results: [
          { id: 'conv-1', success: true },
          { id: 'conv-2', success: true },
        ],
      };
      service.bulkReject.mockResolvedValue(mockResult);

      const result = await controller.bulkReject(
        { user: mockUser },
        { conversionIds: ['conv-1', 'conv-2'], reason: 'Bulk rejection' },
      );

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(service.bulkReject).toHaveBeenCalledWith(mockUser, ['conv-1', 'conv-2'], 'Bulk rejection');
    });
  });

  describe('getPendingApproval', () => {
    it('should return conversions ready for approval', async () => {
      const mockResult = {
        conversions: [{ ...mockConversion, holdPeriodDays: 30, readyForApproval: true }],
        total: 1,
      };
      service.getPendingApproval.mockResolvedValue(mockResult);

      const result = await controller.getPendingApproval(
        { user: mockUser },
        'company-123',
      );

      expect(result.conversions).toHaveLength(1);
      expect(result.conversions[0].readyForApproval).toBe(true);
      expect(service.getPendingApproval).toHaveBeenCalledWith(mockUser, { companyId: 'company-123' });
    });

    it('should work without company filter', async () => {
      service.getPendingApproval.mockResolvedValue({ conversions: [], total: 0 });

      await controller.getPendingApproval({ user: mockUser }, undefined);

      expect(service.getPendingApproval).toHaveBeenCalledWith(mockUser, { companyId: undefined });
    });
  });
});
