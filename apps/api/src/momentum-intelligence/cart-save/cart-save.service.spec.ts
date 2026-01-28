import { Test, TestingModule } from '@nestjs/testing';
import { CartSaveService } from './cart-save.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CartSaveStage,
  CartAbandonmentReason,
  CartSaveStatus,
} from './types/cart-save.types';

describe('CartSaveService', () => {
  let service: CartSaveService;
  let prisma: any;

  const mockCart = {
    id: 'cart-1',
    companyId: 'company-1',
    customerId: 'customer-1',
    grandTotal: 99.99,
    itemCount: 2,
    status: 'ACTIVE',
    customer: {
      id: 'customer-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      createdAt: new Date(),
    },
    items: [
      {
        id: 'item-1',
        productSnapshot: { name: 'Test Product' },
        unitPrice: 49.99,
        quantity: 2,
      },
    ],
  };

  const mockAttempt = {
    id: 'attempt-1',
    cartId: 'cart-1',
    companyId: 'company-1',
    customerId: 'customer-1',
    status: CartSaveStatus.ACTIVE,
    currentStage: CartSaveStage.BROWSE_REMINDER,
    cartValue: 99.99,
    customerRiskScore: 0.5,
    stageHistory: [],
    startedAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    cart: {
      id: 'cart-1',
      status: 'ACTIVE',
    },
    interventions: [],
    _count: {
      interventions: 0,
    },
  };

  const mockConfig = {
    id: 'config-1',
    companyId: 'company-1',
    enabled: true,
    stageConfigs: {},
    maxAttemptsPerCart: 10,
    respectUnsubscribe: true,
    blackoutHoursStart: 22,
    blackoutHoursEnd: 8,
  };

  beforeEach(async () => {
    const mockPrisma = {
      cart: {
        findUnique: jest.fn(),
      },
      cartSaveAttempt: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      cartSaveConfig: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      cartIntervention: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartSaveService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CartSaveService>(CartSaveService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiateCartSaveFlow', () => {
    it('should create a new save attempt', async () => {
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.cartSaveAttempt.findFirst.mockResolvedValue(null);
      prisma.cartSaveAttempt.create.mockResolvedValue(mockAttempt);
      prisma.cartSaveConfig.findUnique.mockResolvedValue(mockConfig);

      const result = await service.initiateCartSaveFlow('cart-1');

      expect(result).toHaveProperty('attemptId');
      expect(result).toHaveProperty('stage', CartSaveStage.BROWSE_REMINDER);
      expect(prisma.cartSaveAttempt.create).toHaveBeenCalled();
    });

    it('should return existing active attempt', async () => {
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.cartSaveAttempt.findFirst.mockResolvedValue(mockAttempt);

      const result = await service.initiateCartSaveFlow('cart-1');

      expect(result.attemptId).toBe('attempt-1');
      expect(prisma.cartSaveAttempt.create).not.toHaveBeenCalled();
    });

    it('should throw error if cart not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      await expect(service.initiateCartSaveFlow('invalid-cart')).rejects.toThrow(
        'Cart not found',
      );
    });
  });

  describe('progressCartSaveFlow', () => {
    it('should progress to next stage', async () => {
      const updatedAttempt = {
        ...mockAttempt,
        currentStage: CartSaveStage.PATTERN_INTERRUPT,
      };
      prisma.cartSaveAttempt.findUnique.mockResolvedValue(mockAttempt);
      prisma.cartSaveAttempt.update.mockResolvedValue(updatedAttempt);

      const result = await service.progressCartSaveFlow('attempt-1');

      expect(result.stage).toBe(CartSaveStage.PATTERN_INTERRUPT);
    });

    it('should mark as exhausted when no more stages', async () => {
      const lastStageAttempt = {
        ...mockAttempt,
        currentStage: CartSaveStage.WINBACK_SEQUENCE,
      };
      const exhaustedAttempt = {
        ...lastStageAttempt,
        status: CartSaveStatus.EXHAUSTED,
      };
      prisma.cartSaveAttempt.findUnique.mockResolvedValue(lastStageAttempt);
      prisma.cartSaveAttempt.update.mockResolvedValue(exhaustedAttempt);

      const result = await service.progressCartSaveFlow('attempt-1');

      expect(result.status).toBe(CartSaveStatus.EXHAUSTED);
    });
  });

  describe('recordDiagnosisAnswer', () => {
    it('should update attempt with diagnosis reason', async () => {
      const diagnosedAttempt = {
        ...mockAttempt,
        diagnosisReason: CartAbandonmentReason.TOO_EXPENSIVE,
      };
      prisma.cartSaveAttempt.findUnique.mockResolvedValue(mockAttempt);
      prisma.cartSaveConfig.findUnique.mockResolvedValue(mockConfig);
      prisma.cartSaveAttempt.update.mockResolvedValue(diagnosedAttempt);

      await service.recordDiagnosisAnswer(
        'attempt-1',
        CartAbandonmentReason.TOO_EXPENSIVE,
      );

      expect(prisma.cartSaveAttempt.update).toHaveBeenCalled();
    });
  });

  describe('getFlowConfig', () => {
    it('should return company config', async () => {
      prisma.cartSaveConfig.findUnique.mockResolvedValue(mockConfig);

      const result = await service.getFlowConfig('company-1');

      expect(result).toBeDefined();
    });

    it('should return default config if no config exists', async () => {
      prisma.cartSaveConfig.findUnique.mockResolvedValue(null);

      const result = await service.getFlowConfig('company-1');

      expect(result).toBeDefined();
    });
  });

  describe('getAttemptStatus', () => {
    it('should return attempt status', async () => {
      prisma.cartSaveAttempt.findUnique.mockResolvedValue({
        ...mockAttempt,
        cart: mockCart,
        interventions: [],
      });

      const result = await service.getAttemptStatus('attempt-1');

      expect(result).toHaveProperty('status', CartSaveStatus.ACTIVE);
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics data', async () => {
      prisma.cartSaveAttempt.findMany.mockResolvedValue([
        { ...mockAttempt, status: CartSaveStatus.CONVERTED, cartValue: 100 },
        { ...mockAttempt, id: 'attempt-2', status: CartSaveStatus.ACTIVE, cartValue: 50 },
      ]);
      prisma.cartIntervention.findMany.mockResolvedValue([]);

      const result = await service.getAnalytics('company-1');

      expect(result).toHaveProperty('totalAbandoned');
      expect(result).toHaveProperty('totalRecovered');
      expect(result).toHaveProperty('recoveryRate');
    });
  });

  describe('getAttempts', () => {
    it('should return attempts list', async () => {
      prisma.cartSaveAttempt.findMany.mockResolvedValue([mockAttempt]);

      const result = await service.getAttempts('company-1', { limit: 10 });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('attempt-1');
    });

    it('should filter by status', async () => {
      prisma.cartSaveAttempt.findMany.mockResolvedValue([]);

      await service.getAttempts('company-1', { status: CartSaveStatus.CONVERTED });

      expect(prisma.cartSaveAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CartSaveStatus.CONVERTED,
          }),
        }),
      );
    });
  });
});
