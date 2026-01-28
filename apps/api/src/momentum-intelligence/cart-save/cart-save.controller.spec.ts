import { Test, TestingModule } from '@nestjs/testing';
import { CartSaveController } from './cart-save.controller';
import { CartSaveService } from './cart-save.service';
import { CartRecoveryVoiceService } from './cart-recovery-voice.service';
import { CheckoutChurnDetectionService } from './checkout-churn-detection.service';
import { ForbiddenException } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  CartSaveStage,
  CartAbandonmentReason,
  CartSaveStatus,
  CartSaveChannel,
  DEFAULT_CART_SAVE_CONFIG,
} from './types/cart-save.types';

describe('CartSaveController', () => {
  let controller: CartSaveController;
  let cartSaveService: any;
  let voiceService: any;
  let churnService: any;

  const mockUser = {
    id: 'user-1',
    sub: 'user-1',
    email: 'user@example.com',
    role: 'ADMIN',
    scopeType: 'COMPANY' as const,
    scopeId: 'company-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: 'company-1',
  };

  beforeEach(async () => {
    const mockCartSaveService = {
      initiateCartSaveFlow: jest.fn(),
      progressCartSaveFlow: jest.fn(),
      recordDiagnosisAnswer: jest.fn(),
      executeIntervention: jest.fn(),
      getAttemptStatus: jest.fn(),
      getFlowConfig: jest.fn(),
      updateFlowConfig: jest.fn(),
      getAnalytics: jest.fn(),
      getAttempts: jest.fn(),
    };

    const mockVoiceService = {
      initiateVoiceRecovery: jest.fn(),
      processCallOutcome: jest.fn(),
      getVoiceRecoveryAnalytics: jest.fn(),
    };

    const mockChurnService = {
      trackCheckoutEvent: jest.fn(),
      escalateToCSAI: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{
          ttl: 60000,
          limit: 100,
        }]),
      ],
      controllers: [CartSaveController],
      providers: [
        { provide: CartSaveService, useValue: mockCartSaveService },
        { provide: CartRecoveryVoiceService, useValue: mockVoiceService },
        { provide: CheckoutChurnDetectionService, useValue: mockChurnService },
      ],
    }).compile();

    controller = module.get<CartSaveController>(CartSaveController);
    cartSaveService = module.get(CartSaveService);
    voiceService = module.get(CartRecoveryVoiceService);
    churnService = module.get(CheckoutChurnDetectionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initiateSaveFlow', () => {
    it('should initiate save flow', async () => {
      cartSaveService.initiateCartSaveFlow.mockResolvedValue({
        attemptId: 'attempt-1',
        stage: CartSaveStage.BROWSE_REMINDER,
      });

      const result = await controller.initiateSaveFlow({
        cartId: 'cart-1',
        reason: CartAbandonmentReason.TOO_EXPENSIVE,
      });

      expect(result).toHaveProperty('attemptId');
      expect(cartSaveService.initiateCartSaveFlow).toHaveBeenCalledWith(
        'cart-1',
        CartAbandonmentReason.TOO_EXPENSIVE,
      );
    });
  });

  describe('progressSaveFlow', () => {
    it('should progress save flow', async () => {
      const mockResult = {
        stage: CartSaveStage.PATTERN_INTERRUPT,
        status: CartSaveStatus.ACTIVE,
      };
      cartSaveService.progressCartSaveFlow.mockResolvedValue(mockResult);

      const result = await controller.progressSaveFlow('attempt-1', {
        responseType: 'CONTINUE',
      });

      expect(result).toEqual(mockResult);
    });
  });

  describe('recordDiagnosis', () => {
    it('should record diagnosis', async () => {
      cartSaveService.recordDiagnosisAnswer.mockResolvedValue(undefined);

      const result = await controller.recordDiagnosis('attempt-1', {
        reason: CartAbandonmentReason.SHIPPING_COST,
      });

      expect(result).toEqual({ success: true });
      expect(cartSaveService.recordDiagnosisAnswer).toHaveBeenCalledWith(
        'attempt-1',
        CartAbandonmentReason.SHIPPING_COST,
      );
    });
  });

  describe('executeIntervention', () => {
    it('should execute intervention', async () => {
      const intervention = {
        interventionId: 'intervention-1',
        channels: [CartSaveChannel.EMAIL],
      };
      cartSaveService.executeIntervention.mockResolvedValue(intervention);

      const result = await controller.executeIntervention('attempt-1');

      expect(result).toEqual(intervention);
    });
  });

  describe('getAttemptStatus', () => {
    it('should return attempt status', async () => {
      const mockStatus = {
        status: CartSaveStatus.ACTIVE,
        currentStage: CartSaveStage.BROWSE_REMINDER,
        interventionCount: 0,
        startedAt: new Date(),
        completedAt: null,
      };
      cartSaveService.getAttemptStatus.mockResolvedValue(mockStatus);

      const result = await controller.getAttemptStatus('attempt-1');

      expect(result).toEqual(mockStatus);
    });
  });

  describe('getConfig', () => {
    it('should return company config', async () => {
      cartSaveService.getFlowConfig.mockResolvedValue(DEFAULT_CART_SAVE_CONFIG);

      const result = await controller.getConfig(mockUser);

      expect(result).toEqual(DEFAULT_CART_SAVE_CONFIG);
      expect(cartSaveService.getFlowConfig).toHaveBeenCalledWith('company-1');
    });
  });

  describe('updateConfig', () => {
    it('should update company config', async () => {
      const updatedConfig = { ...DEFAULT_CART_SAVE_CONFIG, maxAttemptsPerCart: 5 };
      cartSaveService.updateFlowConfig.mockResolvedValue(updatedConfig);

      await controller.updateConfig(mockUser, {
        maxAttemptsPerCart: 5,
      });

      expect(cartSaveService.updateFlowConfig).toHaveBeenCalled();
    });
  });

  describe('Voice Recovery Endpoints', () => {
    describe('initiateVoiceRecovery', () => {
      it('should initiate voice recovery', async () => {
        voiceService.initiateVoiceRecovery.mockResolvedValue({
          success: true,
          callId: 'call-1',
        });

        const result = await controller.initiateVoiceRecovery(mockUser, {
          cartId: 'cart-1',
          priority: 'high',
        });

        expect(result).toHaveProperty('callId');
        expect(voiceService.initiateVoiceRecovery).toHaveBeenCalledWith(
          'company-1',
          'cart-1',
          { priority: 'high' },
        );
      });
    });

    describe('processVoiceOutcome', () => {
      it('should process voice outcome', async () => {
        voiceService.processCallOutcome.mockResolvedValue(undefined);

        const result = await controller.processVoiceOutcome('call-1', {
          outcome: 'SAVED',
          offerAccepted: 'DISCOUNT_10',
        });

        expect(result).toEqual({ success: true });
      });
    });

    describe('getVoiceAnalytics', () => {
      it('should return voice analytics', async () => {
        const analytics = {
          totalCalls: 10,
          answered: 8,
          converted: 3,
          conversionRate: 0.375,
          totalRecovered: 450,
          averageCallDuration: 180,
          topDeclineReasons: [],
          successByTimeOfDay: [],
        };
        voiceService.getVoiceRecoveryAnalytics.mockResolvedValue(analytics);

        const result = await controller.getVoiceAnalytics(mockUser);

        expect(result).toEqual(analytics);
      });

      it('should pass date range filters', async () => {
        voiceService.getVoiceRecoveryAnalytics.mockResolvedValue({});

        await controller.getVoiceAnalytics(
          mockUser,
          '2026-01-01',
          '2026-01-31',
        );

        expect(voiceService.getVoiceRecoveryAnalytics).toHaveBeenCalledWith(
          'company-1',
          expect.objectContaining({
            start: expect.any(Date),
            end: expect.any(Date),
          }),
        );
      });
    });
  });

  describe('Churn Detection Endpoints', () => {
    describe('trackCheckoutEvent', () => {
      it('should track checkout event', async () => {
        churnService.trackCheckoutEvent.mockResolvedValue({});

        await controller.trackCheckoutEvent({
          sessionId: 'session-1',
          event: { type: 'FIELD_FOCUS', field: 'email', timestamp: Date.now() },
        });

        expect(churnService.trackCheckoutEvent).toHaveBeenCalled();
      });
    });

    describe('escalateToCSAI', () => {
      it('should escalate to CS AI', async () => {
        churnService.escalateToCSAI.mockResolvedValue({ escalated: true });

        const result = await controller.escalateToCSAI({
          sessionId: 'session-1',
          riskScore: 85,
          predictedReason: CartAbandonmentReason.TOO_EXPENSIVE,
          signals: [],
        });

        expect(result).toHaveProperty('escalated', true);
      });
    });
  });

  describe('Analytics Endpoints', () => {
    describe('getAnalyticsOverview', () => {
      it('should return analytics overview', async () => {
        const analytics = {
          totalAbandoned: 100,
          totalRecovered: 25,
          recoveryRate: 0.25,
          revenueRecovered: 2500,
          averageCartValue: 100,
          byChannel: {},
          byReason: [],
          byStage: [],
          timeline: [],
        };
        cartSaveService.getAnalytics.mockResolvedValue(analytics);

        const result = await controller.getAnalyticsOverview(mockUser);

        expect(result).toEqual(analytics);
      });
    });

    describe('getAttempts', () => {
      it('should return attempts list', async () => {
        const mockAttempt = {
          id: 'attempt-1',
          cartId: 'cart-1',
          companyId: 'company-1',
          status: CartSaveStatus.ACTIVE,
          currentStage: CartSaveStage.BROWSE_REMINDER,
        };
        cartSaveService.getAttempts.mockResolvedValue([mockAttempt]);

        const result = await controller.getAttempts(mockUser);

        expect(result).toHaveLength(1);
      });

      it('should pass filters', async () => {
        cartSaveService.getAttempts.mockResolvedValue([]);

        await controller.getAttempts(
          mockUser,
          'CONVERTED',
          'EMAIL',
          '10',
        );

        expect(cartSaveService.getAttempts).toHaveBeenCalledWith(
          'company-1',
          {
            status: 'CONVERTED',
            channel: 'EMAIL',
            limit: 10,
          },
        );
      });
    });
  });

  describe('Access Control', () => {
    it('should throw ForbiddenException for ORG user without companyId', async () => {
      const orgUser = {
        ...mockUser,
        scopeType: 'ORGANIZATION' as const,
        companyId: undefined,
      };

      await expect(controller.getConfig(orgUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
