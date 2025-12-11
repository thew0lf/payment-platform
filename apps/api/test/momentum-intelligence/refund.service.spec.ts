import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RefundService } from '../../src/momentum-intelligence/refunds/refund.service';
import { RefundReason, RefundStatus, RefundMethod } from '../../src/momentum-intelligence/types/refund.types';

describe('RefundService', () => {
  let service: RefundService;
  let prismaService: any;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockCompanyId = 'company-test-1';
  const mockCustomerId = 'customer-test-1';
  const mockOrderId = 'order-test-1';

  beforeEach(async () => {
    const mockPrisma = {
      company: {
        findUnique: jest.fn().mockResolvedValue({
          id: mockCompanyId,
          settings: { refundPolicy: { enabled: true } },
        }),
      },
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: mockOrderId,
          total: 99.99,
          createdAt: new Date(),
        }),
      },
      refund: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      miCustomerProfile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'profile-1',
          riskLevel: 'LOW',
        }),
      },
    };

    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<RefundService>(RefundService);
    prismaService = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('createRefund', () => {
    it('should create a refund and emit an event', async () => {
      const dto = {
        companyId: mockCompanyId,
        customerId: mockCustomerId,
        orderId: mockOrderId,
        reason: RefundReason.CUSTOMER_REQUEST,
        reasonDetails: 'No longer need the product',
        amount: 50,
      };

      const result = await service.createRefund(dto);

      expect(result).toBeDefined();
      expect(result.companyId).toBe(mockCompanyId);
      expect(result.orderId).toBe(mockOrderId);
      expect(result.amount.requested).toBe(50);
      expect(eventEmitter.emit).toHaveBeenCalledWith('refund.created', expect.any(Object));
    });

    it('should emit refund.created event with correct structure', async () => {
      const dto = {
        companyId: mockCompanyId,
        customerId: mockCustomerId,
        orderId: mockOrderId,
        reason: RefundReason.NOT_AS_DESCRIBED,
        amount: 30,
      };

      await service.createRefund(dto);

      expect(eventEmitter.emit).toHaveBeenCalledWith('refund.created', {
        refundId: expect.any(String),
        orderId: mockOrderId,
        amount: 30,
        autoApproved: expect.any(Boolean),
      });
    });
  });

  describe('createBulkRefund', () => {
    it('should create multiple refunds and return summary', async () => {
      const dto = {
        companyId: mockCompanyId,
        reason: RefundReason.SUBSCRIPTION_CANCELLATION,
        reasonDetails: 'Order cancelled by customer',
        refunds: [
          { customerId: 'cust-1', orderId: 'order-1', amount: 25 },
          { customerId: 'cust-2', orderId: 'order-2', amount: 50 },
        ],
      };

      const result = await service.createBulkRefund(dto);

      expect(result.refunds).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith('refund.bulk.created', expect.any(Object));
    });
  });

  describe('service initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });
});
