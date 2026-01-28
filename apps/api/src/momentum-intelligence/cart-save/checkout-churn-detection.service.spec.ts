import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutChurnDetectionService, CheckoutEvent, ChurnAlert } from './checkout-churn-detection.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CartSaveService } from './cart-save.service';
import { CartAbandonmentReason } from './types/cart-save.types';

describe('CheckoutChurnDetectionService', () => {
  let service: CheckoutChurnDetectionService;
  let prisma: any;

  beforeEach(async () => {
    const mockPrisma = {
      funnelSession: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({
          id: 'session-1',
          sessionToken: 'session-1',
          checkoutData: {},
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      churnAlert: {
        create: jest.fn().mockResolvedValue({}),
      },
      cSSession: {
        create: jest.fn().mockResolvedValue({
          id: 'cs-session-1',
          companyId: 'company-1',
          customerId: 'customer-1',
          channel: 'CHAT',
          currentTier: 'AI_REP',
          status: 'ACTIVE',
        }),
      },
      cSMessage: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockCartSaveService = {
      initiateCartSaveFlow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutChurnDetectionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: CartSaveService, useValue: mockCartSaveService },
      ],
    }).compile();

    service = module.get<CheckoutChurnDetectionService>(CheckoutChurnDetectionService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackCheckoutEvent', () => {
    it('should track field focus event', async () => {
      const event: CheckoutEvent = {
        type: 'FIELD_FOCUS',
        field: 'email',
        timestamp: Date.now(),
      };

      const result = await service.trackCheckoutEvent('session-1', event);

      expect(result).toBeDefined();
    });

    it('should track field blur event', async () => {
      const blurEvent: CheckoutEvent = {
        type: 'FIELD_BLUR',
        field: 'cardNumber',
        duration: 30000,
        timestamp: Date.now(),
      };

      const result = await service.trackCheckoutEvent('session-2', blurEvent);

      expect(result).toBeDefined();
    });

    it('should track tab blur event', async () => {
      const event: CheckoutEvent = {
        type: 'TAB_BLUR',
        timestamp: Date.now(),
      };

      const result = await service.trackCheckoutEvent('session-3', event);

      expect(result).toBeDefined();
    });

    it('should track promo code attempt', async () => {
      const event: CheckoutEvent = {
        type: 'PROMO_CODE_ATTEMPT',
        promoCode: 'SAVE10',
        timestamp: Date.now(),
      };

      const result = await service.trackCheckoutEvent('session-4', event);

      expect(result).toBeDefined();
    });

    it('should track scroll up event', async () => {
      const event: CheckoutEvent = {
        type: 'SCROLL_UP',
        timestamp: Date.now(),
      };

      const result = await service.trackCheckoutEvent('session-5', event);

      expect(result).toBeDefined();
    });

    it('should track back navigation', async () => {
      const event: CheckoutEvent = {
        type: 'BACK_NAVIGATION',
        timestamp: Date.now(),
      };

      const result = await service.trackCheckoutEvent('session-6', event);

      expect(result).toBeDefined();
    });

    it('should track payment method changes', async () => {
      const event: CheckoutEvent = {
        type: 'PAYMENT_METHOD_CHANGED',
        timestamp: Date.now(),
      };

      const result = await service.trackCheckoutEvent('session-7', event);

      expect(result).toBeDefined();
    });

    it('should track checkout step changes', async () => {
      const event: CheckoutEvent = {
        type: 'CHECKOUT_STEP_CHANGED',
        step: 'payment',
        timestamp: Date.now(),
      };

      const result = await service.trackCheckoutEvent('session-8', event);

      expect(result).toBeDefined();
    });
  });

  describe('escalateToCSAI', () => {
    it('should escalate high-risk session to CS AI', async () => {
      // Setup mock for funnelSession.findUnique to return proper session data
      (prisma.funnelSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'session-9',
        sessionToken: 'session-9',
        funnel: {
          id: 'funnel-1',
          companyId: 'company-1',
        },
        cart: {
          id: 'cart-1',
          customer: {
            id: 'customer-1',
            email: 'test@example.com',
          },
          items: [
            { quantity: 1, unitPrice: 99.99 },
          ],
        },
      });

      const alert: ChurnAlert = {
        sessionId: 'session-9',
        riskScore: 85,
        predictedReason: CartAbandonmentReason.TOO_EXPENSIVE,
        signals: [{ type: 'PROMO_SEEKING', severity: 'high' as const, count: 3 }],
        suggestedIntervention: {
          type: 'CHAT_OFFER',
          message: 'Need help with a discount code?',
          urgency: 'immediate',
          channel: 'CHAT_WIDGET',
        },
        timestamp: Date.now(),
      };

      const result = await service.escalateToCSAI('session-9', alert);

      expect(result).toHaveProperty('escalated', true);
      expect(result).toHaveProperty('chatSessionId');
      expect(prisma.cSSession.create).toHaveBeenCalled();
      expect(prisma.cSMessage.create).toHaveBeenCalled();
    });

    it('should return escalated false if session not found', async () => {
      (prisma.funnelSession.findUnique as jest.Mock).mockResolvedValue(null);

      const alert: ChurnAlert = {
        sessionId: 'invalid-session',
        riskScore: 85,
        predictedReason: CartAbandonmentReason.TOO_EXPENSIVE,
        signals: [],
        suggestedIntervention: {
          type: 'CHAT_OFFER',
          message: 'Help?',
          urgency: 'immediate',
          channel: 'CHAT_WIDGET',
        },
        timestamp: Date.now(),
      };

      const result = await service.escalateToCSAI('invalid-session', alert);

      expect(result).toHaveProperty('escalated', false);
    });
  });
});
