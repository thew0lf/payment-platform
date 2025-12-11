import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RMAService } from '../../src/momentum-intelligence/rma/rma.service';
import { RMAStatus, RMAType, ReturnReason, ItemCondition, InspectionResult } from '../../src/momentum-intelligence/types/rma.types';

describe('RMAService', () => {
  let service: RMAService;
  let prismaService: any;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockCompanyId = 'company-test-1';
  const mockCustomerId = 'customer-test-1';
  const mockOrderId = 'order-test-1';

  beforeEach(async () => {
    const mockRMAPolicy = {
      companyId: mockCompanyId,
      enabled: true,
      generalRules: {
        returnWindowDays: 30,
        warrantyDays: 365,
        maxItemsPerRMA: 10,
        rmaExpirationDays: 14,
      },
      automation: {
        autoApprove: { enabled: false, conditions: [] },
        autoCreateLabel: false,
        autoProcessRefund: false,
        autoCloseAfterDays: 30,
        autoExpireReminders: true,
      },
      shippingConfig: {
        defaultCarrier: 'USPS',
        returnAddresses: [{ name: 'Returns', street1: '123 Main', city: 'Test', state: 'CA', postalCode: '12345', country: 'US' }],
      },
    };

    const mockPrisma = {
      company: {
        findUnique: jest.fn().mockResolvedValue({
          id: mockCompanyId,
          settings: { rmaPolicy: { enabled: true } },
        }),
      },
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: mockOrderId,
          total: 99.99,
          createdAt: new Date(),
          items: [
            { id: 'item-1', productId: 'prod-1', quantity: 1, unitPrice: 49.99 },
            { id: 'item-2', productId: 'prod-2', quantity: 2, unitPrice: 25.00 },
          ],
        }),
      },
      rMA: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      rMAPolicy: {
        findUnique: jest.fn().mockResolvedValue(mockRMAPolicy),
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
        RMAService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<RMAService>(RMAService);
    prismaService = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('service initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createRMA', () => {
    it('should create an RMA with requested status', async () => {
      const dto = {
        companyId: mockCompanyId,
        customerId: mockCustomerId,
        orderId: mockOrderId,
        type: RMAType.RETURN,
        reason: ReturnReason.NO_LONGER_NEEDED,
        reasonDetails: 'No longer need the product',
        items: [
          { orderItemId: 'item-1', quantity: 1 },
        ],
      };

      const result = await service.createRMA(dto);

      expect(result).toBeDefined();
      expect(result.companyId).toBe(mockCompanyId);
      expect(result.orderId).toBe(mockOrderId);
      expect(result.type).toBe(RMAType.RETURN);
      expect(result.rmaNumber).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith('rma.created', expect.any(Object));
    });

    it('should emit rma.created event with correct data', async () => {
      const dto = {
        companyId: mockCompanyId,
        customerId: mockCustomerId,
        orderId: mockOrderId,
        type: RMAType.EXCHANGE,
        reason: ReturnReason.WRONG_SIZE,
        items: [
          { orderItemId: 'item-1', quantity: 1 },
        ],
      };

      await service.createRMA(dto);

      expect(eventEmitter.emit).toHaveBeenCalledWith('rma.created', {
        rmaId: expect.any(String),
        rmaNumber: expect.any(String),
        orderId: mockOrderId,
        autoApproved: expect.any(Boolean),
      });
    });

    it('should set correct expiration date', async () => {
      const dto = {
        companyId: mockCompanyId,
        customerId: mockCustomerId,
        orderId: mockOrderId,
        type: RMAType.RETURN,
        reason: ReturnReason.NOT_AS_DESCRIBED,
        items: [
          { orderItemId: 'item-1', quantity: 1 },
        ],
      };

      const result = await service.createRMA(dto);

      expect(result.expiresAt).toBeDefined();
      // Should be a future date
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('approveRMA', () => {
    it('should approve a requested RMA and generate shipping label', async () => {
      const mockRMA = {
        id: 'rma-1',
        rmaNumber: 'RMA-001',
        status: RMAStatus.REQUESTED,
        companyId: mockCompanyId,
        timeline: [{ status: RMAStatus.REQUESTED, timestamp: new Date() }],
        shipping: {},
      };

      (prismaService.rMA.findUnique as jest.Mock).mockResolvedValue(mockRMA);

      const dto = {
        rmaId: 'rma-1',
        notes: 'Approved for return',
      };

      const result = await service.approveRMA(dto);

      expect(result).toBeDefined();
      // Service transitions through APPROVED to LABEL_SENT
      expect([RMAStatus.APPROVED, RMAStatus.LABEL_SENT]).toContain(result.status);
      expect(result.timeline).toContainEqual(
        expect.objectContaining({ status: RMAStatus.APPROVED }),
      );
    });

    it('should throw NotFoundException for non-existent RMA', async () => {
      (prismaService.rMA.findUnique as jest.Mock).mockResolvedValue(null);

      const dto = {
        rmaId: 'non-existent',
      };

      await expect(service.approveRMA(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('rejectRMA', () => {
    it('should reject an RMA with reason', async () => {
      const mockRMA = {
        id: 'rma-1',
        rmaNumber: 'RMA-001',
        status: RMAStatus.REQUESTED,
        companyId: mockCompanyId,
        timeline: [{ status: RMAStatus.REQUESTED, timestamp: new Date() }],
      };

      (prismaService.rMA.findUnique as jest.Mock).mockResolvedValue(mockRMA);

      const dto = {
        rmaId: 'rma-1',
        reason: 'Outside return window',
      };

      const result = await service.rejectRMA(dto);

      expect(result).toBeDefined();
      expect(result.status).toBe(RMAStatus.REJECTED);
    });
  });

  describe('recordInspection', () => {
    it('should record inspection results', async () => {
      const mockRMA = {
        id: 'rma-1',
        status: RMAStatus.RECEIVED,
        items: [
          { id: 'item-1', productId: 'prod-1', quantity: 1 },
        ],
        inspection: {},
        timeline: [],
      };

      (prismaService.rMA.findUnique as jest.Mock).mockResolvedValue(mockRMA);

      const dto = {
        rmaId: 'rma-1',
        items: [
          {
            rmaItemId: 'item-1',
            result: InspectionResult.PASSED,
            condition: ItemCondition.LIKE_NEW,
            notes: 'Item in excellent condition',
          },
        ],
      };

      const result = await service.recordInspection(dto);

      expect(result).toBeDefined();
      expect(result.status).toBe(RMAStatus.INSPECTION_COMPLETE);
      expect(result.inspection.completedAt).toBeDefined();
    });
  });
});
