import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VoiceAIService } from '../../src/momentum-intelligence/voice-ai/voice-ai.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TwilioService } from '../../src/integrations/services/providers/twilio.service';
import {
  CallDirection,
  VoiceCallStatus,
  CallOutcome,
  Sentiment,
  VoiceScriptType,
} from '../../src/momentum-intelligence/types/momentum.types';

describe('VoiceAIService', () => {
  let service: VoiceAIService;
  let prismaService: jest.Mocked<PrismaService>;
  let twilioService: jest.Mocked<TwilioService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockCompanyId = 'company-test-1';
  const mockCustomerId = 'customer-test-1';
  const mockScriptId = 'script-test-1';
  const mockCallSid = 'CA1234567890abcdef';

  const mockCustomer = {
    id: mockCustomerId,
    companyId: mockCompanyId,
    email: 'customer@test.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+15551234567',
  };

  const mockVoiceScript = {
    id: mockScriptId,
    companyId: mockCompanyId,
    name: 'Test Save Script',
    type: VoiceScriptType.OUTBOUND_SAVE,
    isActive: true,
    isDefault: true,
    opening: { greeting: 'Hello, thank you for taking our call.' },
    diagnosis: {
      primaryQuestion: 'How can we help you today?',
      sentimentResponses: {
        angry: "I understand your frustration. Let me help make this right.",
      },
      followUpQuestions: [
        { trigger: 'cancel', question: 'May I ask what led to this decision?' },
      ],
    },
    interventions: [
      { condition: 'price_concern', response: 'I can offer you a discount.' },
    ],
    closing: {
      acceptOffer: "Wonderful! I've applied that to your account.",
      declineOffer: 'I understand. Is there anything else I can help with?',
      escalateToHuman: "I'll connect you with a team member right away.",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVoiceCall = {
    id: 'call-test-1',
    companyId: mockCompanyId,
    customerId: mockCustomerId,
    direction: CallDirection.OUTBOUND,
    fromNumber: '+15559876543',
    toNumber: '+15551234567',
    scriptId: mockScriptId,
    status: VoiceCallStatus.INITIATED,
    twilioCallSid: mockCallSid,
    detectedIntents: [],
    transcriptRaw: '',
    transcriptProcessed: [],
    initiatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTwilioCall = {
    sid: mockCallSid,
    from: '+15559876543',
    to: '+15551234567',
    status: 'queued',
  };

  beforeEach(async () => {
    const mockPrisma = {
      customer: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      voiceScript: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      voiceCall: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      intervention: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      clientIntegration: {
        findMany: jest.fn(),
      },
      company: {
        findUnique: jest.fn(),
      },
      cSAIPricing: {
        findFirst: jest.fn(),
      },
    };

    const mockTwilio = {
      getCredentials: jest.fn(),
      makeCall: jest.fn(),
      updateCall: jest.fn(),
      generateGatherTwiML: jest.fn(),
      generateSayTwiML: jest.fn(),
      generateTransferTwiML: jest.fn(),
      generateHangupTwiML: jest.fn(),
      createVoiceResponse: jest.fn(),
      getRecordings: jest.fn(),
      sendSms: jest.fn(),
      testConnection: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceAIService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TwilioService, useValue: mockTwilio },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<VoiceAIService>(VoiceAIService);
    prismaService = module.get(PrismaService);
    twilioService = module.get(TwilioService);
    eventEmitter = module.get(EventEmitter2);

    // Set up environment variables for testing
    process.env.API_URL = 'http://localhost:3001';
    process.env.TWILIO_ACCOUNT_SID = 'ACtest123';
    process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
    process.env.TWILIO_PHONE_NUMBER = '+15559876543';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // OUTBOUND CALL INITIATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('initiateOutboundCall', () => {
    it('should successfully initiate an outbound call', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      (prismaService.voiceScript.findUnique as jest.Mock).mockResolvedValue(mockVoiceScript);
      (twilioService.getCredentials as jest.Mock).mockResolvedValue({
        accountSid: 'ACtest123',
        authToken: 'test-token',
        fromNumber: '+15559876543',
      });
      (twilioService.generateGatherTwiML as jest.Mock).mockReturnValue('<Response><Gather>...</Gather></Response>');
      (twilioService.makeCall as jest.Mock).mockResolvedValue(mockTwilioCall);
      (prismaService.voiceCall.create as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.intervention.create as jest.Mock).mockResolvedValue({});

      const result = await service.initiateOutboundCall(
        mockCompanyId,
        mockCustomerId,
        mockScriptId,
        'high',
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(mockVoiceCall.id);
      expect(result.twilioCallSid).toBe(mockCallSid);
      expect(twilioService.makeCall).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          to: mockCustomer.phone,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'voice.call.initiated',
        expect.objectContaining({
          companyId: mockCompanyId,
          customerId: mockCustomerId,
        }),
      );
    });

    it('should throw BadRequestException when customer not found', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.initiateOutboundCall(mockCompanyId, mockCustomerId, mockScriptId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when customer has no phone', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue({
        ...mockCustomer,
        phone: null,
      });

      await expect(
        service.initiateOutboundCall(mockCompanyId, mockCustomerId, mockScriptId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when script not found', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      (prismaService.voiceScript.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.initiateOutboundCall(mockCompanyId, mockCustomerId, mockScriptId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when Twilio not configured', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      (prismaService.voiceScript.findUnique as jest.Mock).mockResolvedValue(mockVoiceScript);
      (twilioService.getCredentials as jest.Mock).mockResolvedValue(null);
      // Remove env vars
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_PHONE_NUMBER;

      await expect(
        service.initiateOutboundCall(mockCompanyId, mockCustomerId, mockScriptId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when Twilio call fails', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      (prismaService.voiceScript.findUnique as jest.Mock).mockResolvedValue(mockVoiceScript);
      (twilioService.getCredentials as jest.Mock).mockResolvedValue({
        accountSid: 'ACtest123',
        authToken: 'test-token',
        fromNumber: '+15559876543',
      });
      (twilioService.generateGatherTwiML as jest.Mock).mockReturnValue('<Response/>');
      (twilioService.makeCall as jest.Mock).mockResolvedValue(null);

      await expect(
        service.initiateOutboundCall(mockCompanyId, mockCustomerId, mockScriptId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // INBOUND CALL HANDLING TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('handleInboundCall', () => {
    const mockWebhookData = {
      CallSid: mockCallSid,
      From: '+15551234567',
      To: '+15559876543',
    };

    const mockCompany = {
      id: mockCompanyId,
      name: 'Test Company',
      code: 'TEST',
    };

    it('should handle inbound call successfully', async () => {
      (prismaService.clientIntegration.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'integration-1',
          provider: 'TWILIO',
          credentials: {},
          settings: { fromNumber: '+15559876543' },
          client: {
            companies: [mockCompany],
          },
        },
      ]);
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      (prismaService.voiceScript.findFirst as jest.Mock).mockResolvedValue(mockVoiceScript);
      (prismaService.voiceCall.create as jest.Mock).mockResolvedValue(mockVoiceCall);
      (twilioService.generateGatherTwiML as jest.Mock).mockReturnValue('<Response><Gather>...</Gather></Response>');

      const result = await service.handleInboundCall(mockWebhookData);

      expect(result).toContain('Response');
      expect(prismaService.voiceCall.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'voice.call.inbound',
        expect.objectContaining({
          companyId: mockCompanyId,
        }),
      );
    });

    it('should return error TwiML when company not found', async () => {
      (prismaService.clientIntegration.findMany as jest.Mock).mockResolvedValue([]);
      (twilioService.generateSayTwiML as jest.Mock).mockReturnValue(
        '<Response><Say>Sorry, we cannot process your call.</Say></Response>',
      );

      const result = await service.handleInboundCall(mockWebhookData);

      expect(result).toContain('Sorry');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SPEECH PROCESSING TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('processSpeechResult', () => {
    it('should process speech and return appropriate response', async () => {
      (prismaService.voiceCall.findUnique as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.voiceCall.update as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.voiceScript.findUnique as jest.Mock).mockResolvedValue(mockVoiceScript);
      (twilioService.generateGatherTwiML as jest.Mock).mockReturnValue('<Response><Gather>...</Gather></Response>');

      const result = await service.processSpeechResult(
        mockCallSid,
        'I want to cancel my subscription',
        0.95,
      );

      expect(result).toBeDefined();
      expect(prismaService.voiceCall.update).toHaveBeenCalled();
    });

    it('should detect cancel intent', async () => {
      (prismaService.voiceCall.findUnique as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.voiceCall.update as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.voiceScript.findUnique as jest.Mock).mockResolvedValue(mockVoiceScript);
      (twilioService.generateGatherTwiML as jest.Mock).mockReturnValue('<Response/>');

      await service.processSpeechResult(mockCallSid, 'I want to cancel', 0.95);

      expect(prismaService.voiceCall.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            detectedIntents: expect.arrayContaining(['cancel']),
          }),
        }),
      );
    });

    it('should detect angry sentiment', async () => {
      (prismaService.voiceCall.findUnique as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.voiceCall.update as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.voiceScript.findUnique as jest.Mock).mockResolvedValue(mockVoiceScript);
      (twilioService.generateGatherTwiML as jest.Mock).mockReturnValue('<Response/>');

      await service.processSpeechResult(
        mockCallSid,
        'This is terrible, I am furious!',
        0.95,
      );

      expect(prismaService.voiceCall.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            overallSentiment: Sentiment.ANGRY,
          }),
        }),
      );
    });

    it('should handle escalation request', async () => {
      (prismaService.voiceCall.findUnique as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.voiceCall.update as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.voiceScript.findUnique as jest.Mock).mockResolvedValue(mockVoiceScript);
      const mockResponse = {
        say: jest.fn().mockReturnThis(),
        redirect: jest.fn().mockReturnThis(),
        toString: jest.fn().mockReturnValue('<Response><Say>...</Say><Redirect>/escalate</Redirect></Response>'),
      };
      (twilioService.createVoiceResponse as jest.Mock).mockReturnValue(mockResponse);

      const result = await service.processSpeechResult(
        mockCallSid,
        'I want to speak to a human',
        0.95,
      );

      expect(result).toContain('escalate');
    });

    it('should return error TwiML when call not found', async () => {
      (prismaService.voiceCall.findUnique as jest.Mock).mockResolvedValue(null);
      (twilioService.generateSayTwiML as jest.Mock).mockReturnValue(
        '<Response><Say>Sorry, there was an error.</Say></Response>',
      );

      const result = await service.processSpeechResult(mockCallSid, 'Hello', 0.95);

      expect(result).toContain('error');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CALL STATUS UPDATE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('handleCallStatusUpdate', () => {
    it('should update call status to completed', async () => {
      const completedCall = {
        ...mockVoiceCall,
        detectedIntents: ['accept_offer'],
      };
      (prismaService.voiceCall.findUnique as jest.Mock).mockResolvedValue(completedCall);
      (prismaService.voiceCall.update as jest.Mock).mockResolvedValue(completedCall);
      (prismaService.intervention.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.handleCallStatusUpdate({
        CallSid: mockCallSid,
        CallStatus: 'completed',
        CallDuration: '120',
      });

      expect(prismaService.voiceCall.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: VoiceCallStatus.COMPLETED,
            duration: 120,
          }),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'voice.call.completed',
        expect.objectContaining({
          outcome: CallOutcome.OFFER_ACCEPTED,
        }),
      );
    });

    it('should update call status to in-progress', async () => {
      (prismaService.voiceCall.findUnique as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.voiceCall.update as jest.Mock).mockResolvedValue(mockVoiceCall);

      await service.handleCallStatusUpdate({
        CallSid: mockCallSid,
        CallStatus: 'in-progress',
      });

      expect(prismaService.voiceCall.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: VoiceCallStatus.IN_PROGRESS,
          }),
        }),
      );
    });

    it('should handle failed call status', async () => {
      (prismaService.voiceCall.findUnique as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.voiceCall.update as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.intervention.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.handleCallStatusUpdate({
        CallSid: mockCallSid,
        CallStatus: 'failed',
      });

      expect(prismaService.voiceCall.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: VoiceCallStatus.FAILED,
          }),
        }),
      );
    });

    it('should skip update when call not found', async () => {
      (prismaService.voiceCall.findUnique as jest.Mock).mockResolvedValue(null);

      await service.handleCallStatusUpdate({
        CallSid: 'unknown-sid',
        CallStatus: 'completed',
      });

      expect(prismaService.voiceCall.update).not.toHaveBeenCalled();
    });

    it('should determine correct outcome for declined call', async () => {
      const declinedCall = {
        ...mockVoiceCall,
        detectedIntents: ['decline_offer'],
      };
      (prismaService.voiceCall.findUnique as jest.Mock).mockResolvedValue(declinedCall);
      (prismaService.voiceCall.update as jest.Mock).mockResolvedValue(declinedCall);
      (prismaService.intervention.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.handleCallStatusUpdate({
        CallSid: mockCallSid,
        CallStatus: 'completed',
        CallDuration: '60',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'voice.call.completed',
        expect.objectContaining({
          outcome: CallOutcome.DECLINED,
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // VOICE SCRIPTS TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getScripts', () => {
    it('should return all scripts for company', async () => {
      (prismaService.voiceScript.findMany as jest.Mock).mockResolvedValue([mockVoiceScript]);

      const result = await service.getScripts(mockCompanyId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockScriptId);
    });

    it('should filter scripts by type', async () => {
      (prismaService.voiceScript.findMany as jest.Mock).mockResolvedValue([mockVoiceScript]);

      await service.getScripts(mockCompanyId, VoiceScriptType.OUTBOUND_SAVE);

      expect(prismaService.voiceScript.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: mockCompanyId,
            type: VoiceScriptType.OUTBOUND_SAVE,
          },
        }),
      );
    });
  });

  describe('createScript', () => {
    it('should create a new script', async () => {
      const newScript = {
        name: 'New Script',
        type: VoiceScriptType.OUTBOUND_SAVE,
        opening: {},
        diagnosis: {},
        interventions: [],
        closing: {},
      };
      (prismaService.voiceScript.create as jest.Mock).mockResolvedValue({
        ...newScript,
        id: 'new-script-id',
        companyId: mockCompanyId,
      });

      const result = await service.createScript(mockCompanyId, newScript);

      expect(result.id).toBe('new-script-id');
      expect(prismaService.voiceScript.create).toHaveBeenCalled();
    });

    it('should unset other default scripts when creating new default', async () => {
      const newScript = {
        name: 'New Default Script',
        type: VoiceScriptType.OUTBOUND_SAVE,
        isDefault: true,
        opening: {},
        diagnosis: {},
        interventions: [],
        closing: {},
      };
      (prismaService.voiceScript.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.voiceScript.create as jest.Mock).mockResolvedValue({
        ...newScript,
        id: 'new-script-id',
        companyId: mockCompanyId,
      });

      await service.createScript(mockCompanyId, newScript);

      expect(prismaService.voiceScript.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: mockCompanyId,
            type: VoiceScriptType.OUTBOUND_SAVE,
            isDefault: true,
          },
        }),
      );
    });
  });

  describe('updateScript', () => {
    it('should update an existing script', async () => {
      (prismaService.voiceScript.findUnique as jest.Mock).mockResolvedValue(mockVoiceScript);
      (prismaService.voiceScript.update as jest.Mock).mockResolvedValue({
        ...mockVoiceScript,
        name: 'Updated Name',
      });

      const result = await service.updateScript(mockScriptId, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when script not found', async () => {
      (prismaService.voiceScript.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateScript('unknown-id', { name: 'Updated Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CALL QUERIES TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getCalls', () => {
    it('should return calls for company', async () => {
      (prismaService.voiceCall.findMany as jest.Mock).mockResolvedValue([mockVoiceCall]);

      const result = await service.getCalls(mockCompanyId);

      expect(result).toHaveLength(1);
    });

    it('should filter by status', async () => {
      (prismaService.voiceCall.findMany as jest.Mock).mockResolvedValue([]);

      await service.getCalls(mockCompanyId, { status: VoiceCallStatus.COMPLETED });

      expect(prismaService.voiceCall.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: mockCompanyId,
            status: VoiceCallStatus.COMPLETED,
          },
        }),
      );
    });

    it('should filter by outcome', async () => {
      (prismaService.voiceCall.findMany as jest.Mock).mockResolvedValue([]);

      await service.getCalls(mockCompanyId, { outcome: CallOutcome.SAVED });

      expect(prismaService.voiceCall.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: mockCompanyId,
            outcome: CallOutcome.SAVED,
          },
        }),
      );
    });

    it('should respect limit parameter', async () => {
      (prismaService.voiceCall.findMany as jest.Mock).mockResolvedValue([]);

      await service.getCalls(mockCompanyId, { limit: 10 });

      expect(prismaService.voiceCall.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });
  });

  describe('getCallById', () => {
    it('should return call by ID', async () => {
      (prismaService.voiceCall.findUnique as jest.Mock).mockResolvedValue({
        ...mockVoiceCall,
        customer: mockCustomer,
        intervention: null,
      });

      const result = await service.getCallById(mockVoiceCall.id);

      expect(result.id).toBe(mockVoiceCall.id);
    });

    it('should throw NotFoundException when call not found', async () => {
      (prismaService.voiceCall.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getCallById('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TWILIO HELPER METHODS TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('transferToHuman', () => {
    it('should transfer call to human agent', async () => {
      (twilioService.generateTransferTwiML as jest.Mock).mockReturnValue('<Response><Dial>...</Dial></Response>');
      (twilioService.updateCall as jest.Mock).mockResolvedValue(true);
      (prismaService.voiceCall.update as jest.Mock).mockResolvedValue(mockVoiceCall);

      const result = await service.transferToHuman(mockCompanyId, mockCallSid, '+15559999999');

      expect(result).toBe(true);
      expect(prismaService.voiceCall.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { escalatedToHuman: true },
        }),
      );
    });

    it('should return false when transfer fails', async () => {
      (twilioService.generateTransferTwiML as jest.Mock).mockReturnValue('<Response/>');
      (twilioService.updateCall as jest.Mock).mockRejectedValue(new Error('Transfer failed'));

      const result = await service.transferToHuman(mockCompanyId, mockCallSid, '+15559999999');

      expect(result).toBe(false);
    });
  });

  describe('endCall', () => {
    it('should end call with message', async () => {
      (twilioService.generateHangupTwiML as jest.Mock).mockReturnValue('<Response><Say>Goodbye</Say><Hangup/></Response>');
      (twilioService.updateCall as jest.Mock).mockResolvedValue(true);

      const result = await service.endCall(mockCompanyId, mockCallSid, 'Goodbye');

      expect(result).toBe(true);
      expect(twilioService.generateHangupTwiML).toHaveBeenCalledWith('Goodbye');
    });

    it('should return false when end call fails', async () => {
      (twilioService.generateHangupTwiML as jest.Mock).mockReturnValue('<Response/>');
      (twilioService.updateCall as jest.Mock).mockRejectedValue(new Error('Failed'));

      const result = await service.endCall(mockCompanyId, mockCallSid);

      expect(result).toBe(false);
    });
  });

  describe('sendSmsNotification', () => {
    it('should send SMS notification', async () => {
      (twilioService.sendSms as jest.Mock).mockResolvedValue({ sid: 'SM123' });

      const result = await service.sendSmsNotification(
        mockCompanyId,
        '+15551234567',
        'Test message',
      );

      expect(result.sid).toBe('SM123');
      expect(twilioService.sendSms).toHaveBeenCalledWith(mockCompanyId, {
        to: '+15551234567',
        body: 'Test message',
      });
    });
  });

  describe('isTwilioConfigured', () => {
    it('should return true when Twilio is configured', async () => {
      (twilioService.testConnection as jest.Mock).mockResolvedValue({ success: true });

      const result = await service.isTwilioConfigured(mockCompanyId);

      expect(result).toBe(true);
    });

    it('should return false when Twilio is not configured', async () => {
      (twilioService.testConnection as jest.Mock).mockResolvedValue({ success: false });

      const result = await service.isTwilioConfigured(mockCompanyId);

      expect(result).toBe(false);
    });
  });

  describe('getCallRecordings', () => {
    it('should return recordings for a call', async () => {
      const mockRecordings = [{ sid: 'RE123', duration: 60 }];
      (twilioService.getRecordings as jest.Mock).mockResolvedValue(mockRecordings);

      const result = await service.getCallRecordings(mockCompanyId, mockCallSid);

      expect(result).toHaveLength(1);
      expect(result[0].sid).toBe('RE123');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SENTIMENT ANALYSIS TESTS (Private method tested through public methods)
  // ═══════════════════════════════════════════════════════════════

  describe('sentiment analysis', () => {
    beforeEach(() => {
      (prismaService.voiceCall.findUnique as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.voiceCall.update as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.voiceScript.findUnique as jest.Mock).mockResolvedValue(mockVoiceScript);
      (twilioService.generateGatherTwiML as jest.Mock).mockReturnValue('<Response/>');
    });

    it('should detect positive sentiment', async () => {
      await service.processSpeechResult(mockCallSid, 'This is great, thank you!', 0.95);

      expect(prismaService.voiceCall.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            overallSentiment: Sentiment.POSITIVE,
          }),
        }),
      );
    });

    it('should detect negative sentiment', async () => {
      await service.processSpeechResult(mockCallSid, 'I am disappointed with this', 0.95);

      expect(prismaService.voiceCall.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            overallSentiment: Sentiment.NEGATIVE,
          }),
        }),
      );
    });

    it('should detect neutral sentiment', async () => {
      await service.processSpeechResult(mockCallSid, 'I have a question about my order', 0.95);

      expect(prismaService.voiceCall.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            overallSentiment: Sentiment.NEUTRAL,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // INTENT DETECTION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('intent detection', () => {
    beforeEach(() => {
      (prismaService.voiceCall.findUnique as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.voiceCall.update as jest.Mock).mockResolvedValue(mockVoiceCall);
      (prismaService.voiceScript.findUnique as jest.Mock).mockResolvedValue(mockVoiceScript);
      (twilioService.generateGatherTwiML as jest.Mock).mockReturnValue('<Response/>');
    });

    it('should detect price concern intent', async () => {
      await service.processSpeechResult(mockCallSid, 'It is too expensive for me', 0.95);

      expect(prismaService.voiceCall.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            detectedIntents: expect.arrayContaining(['price_concern']),
          }),
        }),
      );
    });

    it('should detect pause request intent', async () => {
      await service.processSpeechResult(mockCallSid, 'I need to pause my subscription', 0.95);

      expect(prismaService.voiceCall.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            detectedIntents: expect.arrayContaining(['pause_request']),
          }),
        }),
      );
    });

    it('should detect accept offer intent', async () => {
      await service.processSpeechResult(mockCallSid, 'Yes, that sounds good', 0.95);

      expect(prismaService.voiceCall.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            detectedIntents: expect.arrayContaining(['accept_offer']),
          }),
        }),
      );
    });

    it('should detect decline offer intent', async () => {
      await service.processSpeechResult(mockCallSid, 'No, I am not interested', 0.95);

      expect(prismaService.voiceCall.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            detectedIntents: expect.arrayContaining(['decline_offer']),
          }),
        }),
      );
    });
  });
});
