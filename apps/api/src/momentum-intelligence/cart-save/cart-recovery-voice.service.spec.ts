import { Test, TestingModule } from '@nestjs/testing';
import { CartRecoveryVoiceService } from './cart-recovery-voice.service';
import { PrismaService } from '../../prisma/prisma.service';
import { VoiceAIService } from '../voice-ai/voice-ai.service';
import { CartSaveService } from './cart-save.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CartAbandonmentReason, CartSaveStatus, CartSaveStage, DEFAULT_CART_SAVE_CONFIG } from './types/cart-save.types';

describe('CartRecoveryVoiceService', () => {
  let service: CartRecoveryVoiceService;
  let prisma: any;
  let voiceService: any;
  let cartSaveService: any;
  let eventEmitter: any;

  const mockCart = {
    id: 'cart-1',
    companyId: 'company-1',
    customerId: 'customer-1',
    grandTotal: 99.99,
    customer: {
      id: 'customer-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    },
    items: [
      {
        productSnapshot: { name: 'Product 1' },
        quantity: 1,
        unitPrice: 99.99,
      },
    ],
  };

  const mockAttempt = {
    id: 'attempt-1',
    cartId: 'cart-1',
    companyId: 'company-1',
    customerId: 'customer-1',
    status: CartSaveStatus.ACTIVE,
    currentStage: CartSaveStage.VOICE_RECOVERY,
    metadata: { callId: 'call-1' },
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      cart: {
        findUnique: jest.fn(),
      },
      voiceCall: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      voiceScript: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      cartSaveAttempt: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      cartIntervention: {
        create: jest.fn(),
      },
    };

    const mockVoiceService = {
      initiateOutboundCall: jest.fn(),
      getCallStatus: jest.fn(),
    };

    const mockCartSaveService = {
      getFlowConfig: jest.fn().mockResolvedValue({
        ...DEFAULT_CART_SAVE_CONFIG,
        stages: {
          ...DEFAULT_CART_SAVE_CONFIG.stages,
          voiceRecovery: { enabled: true },
        },
      }),
      initiateCartSaveFlow: jest.fn(),
      progressCartSaveFlow: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartRecoveryVoiceService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: VoiceAIService,
          useValue: mockVoiceService,
        },
        {
          provide: CartSaveService,
          useValue: mockCartSaveService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<CartRecoveryVoiceService>(CartRecoveryVoiceService);
    prisma = module.get(PrismaService);
    voiceService = module.get(VoiceAIService);
    cartSaveService = module.get(CartSaveService);
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiateVoiceRecovery', () => {
    it('should initiate voice recovery call when outside blackout hours', async () => {
      // Set time to midday (outside blackout)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-27T12:00:00'));

      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.cartSaveAttempt.count.mockResolvedValue(0);
      prisma.voiceScript.findFirst.mockResolvedValue({
        id: 'script-1',
        name: 'Cart Recovery',
      });
      prisma.cartSaveAttempt.create.mockResolvedValue(mockAttempt);
      voiceService.initiateOutboundCall.mockResolvedValue({
        id: 'call-1',
        twilioCallSid: 'CA123',
        status: 'queued',
      });

      const result = await service.initiateVoiceRecovery('company-1', 'cart-1');

      expect(result.success).toBe(true);
      expect(result.callId).toBeDefined();
      expect(prisma.cartSaveAttempt.create).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should return success false if cart not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      const result = await service.initiateVoiceRecovery('company-1', 'invalid-cart');

      expect(result.success).toBe(false);
    });

    it('should return success false if customer has no phone', async () => {
      const cartNoPhone = {
        ...mockCart,
        customer: { ...mockCart.customer, phone: null },
      };
      prisma.cart.findUnique.mockResolvedValue(cartNoPhone);

      const result = await service.initiateVoiceRecovery('company-1', 'cart-1');

      expect(result.success).toBe(false);
    });

    it('should schedule call during blackout hours', async () => {
      // Set time to 11 PM (within blackout)
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-27T23:00:00'));

      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.cartSaveAttempt.create.mockResolvedValue(mockAttempt);

      const result = await service.initiateVoiceRecovery('company-1', 'cart-1');

      expect(result.success).toBe(true);
      expect(result.scheduledAt).toBeDefined();

      jest.useRealTimers();
    });

    it('should return false if voice recovery disabled', async () => {
      prisma.cart.findUnique.mockResolvedValue(mockCart);
      cartSaveService.getFlowConfig.mockResolvedValue({
        ...DEFAULT_CART_SAVE_CONFIG,
        stages: {
          ...DEFAULT_CART_SAVE_CONFIG.stages,
          voiceRecovery: { enabled: false },
        },
      });

      const result = await service.initiateVoiceRecovery('company-1', 'cart-1');

      expect(result.success).toBe(false);
    });
  });

  describe('processCallOutcome', () => {
    beforeEach(() => {
      prisma.cartSaveAttempt.findMany.mockResolvedValue([mockAttempt]);
      prisma.cartSaveAttempt.update.mockResolvedValue(mockAttempt);
      prisma.cartIntervention.create.mockResolvedValue({});
    });

    it('should process SAVED outcome', async () => {
      await service.processCallOutcome('call-1', 'SAVED', {
        offerAccepted: 'DISCOUNT_10',
      });

      expect(prisma.cartSaveAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'attempt-1' },
          data: expect.objectContaining({
            status: CartSaveStatus.CONVERTED,
          }),
        }),
      );
      expect(prisma.cartIntervention.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'cart.voice.recovery.converted',
        expect.any(Object),
      );
    });

    it('should process DECLINED outcome', async () => {
      await service.processCallOutcome('call-1', 'DECLINED', {
        reason: CartAbandonmentReason.OTHER,
      });

      expect(prisma.cartSaveAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: CartSaveStatus.EXHAUSTED,
            diagnosisReason: CartAbandonmentReason.OTHER,
          }),
        }),
      );
    });

    it('should schedule callback for CALLBACK_SCHEDULED outcome', async () => {
      const nextAttemptTime = new Date(Date.now() + 3600000);
      prisma.cartSaveAttempt.create.mockResolvedValue({});

      await service.processCallOutcome('call-1', 'CALLBACK_SCHEDULED', {
        nextAttemptTime,
      });

      expect(prisma.cartSaveAttempt.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'cart.voice.recovery.scheduled',
        expect.any(Object),
      );
    });

    it('should handle missing attempt gracefully', async () => {
      prisma.cartSaveAttempt.findMany.mockResolvedValue([]);

      await service.processCallOutcome('invalid-call', 'SAVED', {});

      expect(prisma.cartSaveAttempt.update).not.toHaveBeenCalled();
    });
  });

  describe('getVoiceRecoveryAnalytics', () => {
    const mockAttempts = [
      { ...mockAttempt, status: CartSaveStatus.CONVERTED, cart: mockCart },
      { ...mockAttempt, id: 'attempt-2', status: CartSaveStatus.EXHAUSTED, diagnosisReason: 'TOO_EXPENSIVE', cart: mockCart },
    ];

    beforeEach(() => {
      prisma.cartSaveAttempt.findMany.mockResolvedValue(mockAttempts);
      prisma.voiceCall.findMany.mockResolvedValue([]);
    });

    it('should return analytics data', async () => {
      const result = await service.getVoiceRecoveryAnalytics('company-1');

      expect(result).toHaveProperty('totalCalls');
      expect(result).toHaveProperty('converted');
      expect(result).toHaveProperty('conversionRate');
      expect(result).toHaveProperty('topDeclineReasons');
    });

    it('should filter by date range', async () => {
      const dateRange = {
        start: new Date('2026-01-01'),
        end: new Date('2026-01-31'),
      };

      await service.getVoiceRecoveryAnalytics('company-1', dateRange);

      expect(prisma.cartSaveAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end,
            },
          }),
        }),
      );
    });
  });
});
