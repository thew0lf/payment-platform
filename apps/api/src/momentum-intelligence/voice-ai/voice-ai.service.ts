import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TwilioService } from '../../integrations/services/providers/twilio.service';
import { IntegrationProvider, IntegrationStatus } from '../../integrations/types/integration.types';
import {
  CallDirection,
  VoiceCallStatus,
  CallOutcome,
  Sentiment,
  VoiceScriptType,
  DeliveryChannel,
  InterventionType,
  InterventionStatus,
  TwilioConfig,
  TranscriptSegment,
  KeyMoment,
} from '../types/momentum.types';

@Injectable()
export class VoiceAIService {
  private readonly logger = new Logger(VoiceAIService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly twilioService: TwilioService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // OUTBOUND CALL INITIATION
  // ═══════════════════════════════════════════════════════════════

  async initiateOutboundCall(
    companyId: string,
    customerId: string,
    scriptId: string,
    priority?: string,
  ): Promise<any> {
    // Verify customer exists and get phone
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId },
    });

    if (!customer || !customer.phone) {
      throw new BadRequestException('Customer not found or has no phone number');
    }

    // Verify script exists
    const script = await this.prisma.voiceScript.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      throw new NotFoundException(`Voice script ${scriptId} not found`);
    }

    // Get company Twilio config (would be stored in company settings)
    const twilioConfig = await this.getTwilioConfig(companyId);
    if (!twilioConfig) {
      throw new BadRequestException('Twilio is not configured for this company');
    }

    // Generate TwiML for the initial greeting using script
    const opening = script.opening as any;
    const greeting = opening?.greeting || 'Hello, thank you for taking our call.';
    const twiml = this.twilioService.generateGatherTwiML(
      greeting,
      {
        action: `${process.env.API_URL || ''}/api/momentum/voice/speech`,
        speechTimeout: 3,
        speechModel: 'phone_call',
      },
      { voice: 'Polly.Joanna' },
    );

    // Initiate real Twilio call
    const twilioCall = await this.twilioService.makeCall(companyId, {
      to: customer.phone,
      twiml,
      statusCallback: `${process.env.API_URL || ''}/api/momentum/voice/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      timeout: 30,
      machineDetection: 'Enable',
    });

    if (!twilioCall) {
      throw new BadRequestException('Failed to initiate Twilio call');
    }

    // Create voice call record with real Twilio SID
    const voiceCall = await this.prisma.voiceCall.create({
      data: {
        companyId,
        customerId,
        direction: CallDirection.OUTBOUND,
        fromNumber: twilioCall.from,
        toNumber: twilioCall.to,
        scriptId,
        status: VoiceCallStatus.INITIATED,
        twilioCallSid: twilioCall.sid,
        detectedIntents: [],
      },
    });

    // Create intervention record
    await this.prisma.intervention.create({
      data: {
        companyId,
        customerId,
        type: InterventionType.SAVE_FLOW,
        channel: DeliveryChannel.VOICE,
        status: InterventionStatus.IN_PROGRESS,
      },
    });

    this.eventEmitter.emit('voice.call.initiated', {
      companyId,
      customerId,
      callId: voiceCall.id,
      twilioCallSid: twilioCall.sid,
      direction: CallDirection.OUTBOUND,
    });

    this.logger.log(`Initiated outbound call ${twilioCall.sid} to customer ${customerId}`);

    return voiceCall;
  }

  // ═══════════════════════════════════════════════════════════════
  // INBOUND CALL HANDLING
  // ═══════════════════════════════════════════════════════════════

  async handleInboundCall(webhookData: any): Promise<string> {
    const { CallSid, From, To } = webhookData;

    // Find company by phone number
    const company = await this.findCompanyByPhone(To);
    if (!company) {
      return this.generateTwiML('Sorry, we cannot process your call at this time.');
    }

    // Find customer by phone
    const customer = await this.prisma.customer.findFirst({
      where: {
        companyId: company.id,
        phone: From,
      },
    });

    // Get default inbound script
    const script = await this.prisma.voiceScript.findFirst({
      where: {
        companyId: company.id,
        type: VoiceScriptType.INBOUND_SAVE,
        isActive: true,
        isDefault: true,
      },
    });

    // Create call record
    const voiceCall = await this.prisma.voiceCall.create({
      data: {
        companyId: company.id,
        customerId: customer?.id || '',
        direction: CallDirection.INBOUND,
        fromNumber: From,
        toNumber: To,
        scriptId: script?.id || '',
        status: VoiceCallStatus.IN_PROGRESS,
        twilioCallSid: CallSid,
        answeredAt: new Date(),
        detectedIntents: [],
      },
    });

    this.eventEmitter.emit('voice.call.inbound', {
      companyId: company.id,
      customerId: customer?.id,
      callId: voiceCall.id,
    });

    // Generate initial TwiML response
    const opening = script?.opening as any;
    const greeting = opening?.greeting || 'Hello, thank you for calling.';

    return this.generateTwiML(greeting, {
      gather: true,
      speechTimeout: 3,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SPEECH PROCESSING
  // ═══════════════════════════════════════════════════════════════

  async processSpeechResult(callSid: string, speechResult: string, confidence: number): Promise<string> {
    const voiceCall = await this.prisma.voiceCall.findUnique({
      where: { twilioCallSid: callSid },
    });

    if (!voiceCall) {
      return this.generateTwiML('Sorry, there was an error processing your request.');
    }

    // Analyze sentiment
    const sentiment = this.analyzeSentiment(speechResult);

    // Detect intent
    const intent = this.detectIntent(speechResult);

    // Update call with transcript segment
    const transcriptProcessed = (voiceCall.transcriptProcessed as unknown as TranscriptSegment[]) || [];
    transcriptProcessed.push({
      speaker: 'customer',
      text: speechResult,
      timestamp: Date.now(),
      sentiment,
      detectedIntent: intent,
    });

    // Update detected intents
    const detectedIntents = [...voiceCall.detectedIntents];
    if (intent && !detectedIntents.includes(intent)) {
      detectedIntents.push(intent);
    }

    await this.prisma.voiceCall.update({
      where: { id: voiceCall.id },
      data: {
        transcriptRaw: (voiceCall.transcriptRaw || '') + `\nCustomer: ${speechResult}`,
        transcriptProcessed: transcriptProcessed as any,
        overallSentiment: sentiment,
        detectedIntents,
      },
    });

    // Get script and generate response
    const script = await this.prisma.voiceScript.findUnique({
      where: { id: voiceCall.scriptId },
    });

    const response = await this.generateScriptedResponse(script, intent, sentiment, speechResult);

    // Update transcript with agent response
    transcriptProcessed.push({
      speaker: 'agent',
      text: response.text,
      timestamp: Date.now(),
    });

    await this.prisma.voiceCall.update({
      where: { id: voiceCall.id },
      data: {
        transcriptRaw: (voiceCall.transcriptRaw || '') + `\nAgent: ${response.text}`,
        transcriptProcessed: transcriptProcessed as any,
      },
    });

    return this.generateTwiML(response.text, {
      gather: !response.endCall,
      speechTimeout: 3,
      action: response.action,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CALL COMPLETION
  // ═══════════════════════════════════════════════════════════════

  async handleCallStatusUpdate(webhookData: any): Promise<void> {
    const { CallSid, CallStatus, CallDuration } = webhookData;

    const voiceCall = await this.prisma.voiceCall.findUnique({
      where: { twilioCallSid: CallSid },
    });

    if (!voiceCall) return;

    const statusMap: Record<string, VoiceCallStatus> = {
      'ringing': VoiceCallStatus.RINGING,
      'in-progress': VoiceCallStatus.IN_PROGRESS,
      'completed': VoiceCallStatus.COMPLETED,
      'failed': VoiceCallStatus.FAILED,
      'busy': VoiceCallStatus.BUSY,
      'no-answer': VoiceCallStatus.NO_ANSWER,
    };

    const status = statusMap[CallStatus] || VoiceCallStatus.COMPLETED;
    const isEnded = ['completed', 'failed', 'busy', 'no-answer'].includes(CallStatus);

    const updateData: any = {
      status,
    };

    if (isEnded) {
      updateData.endedAt = new Date();
      updateData.duration = CallDuration ? parseInt(CallDuration) : null;

      // Determine outcome based on detected intents and transcript
      updateData.outcome = await this.determineCallOutcome(voiceCall);
    }

    await this.prisma.voiceCall.update({
      where: { id: voiceCall.id },
      data: updateData,
    });

    if (isEnded) {
      // Update intervention if exists
      await this.prisma.intervention.updateMany({
        where: {
          companyId: voiceCall.companyId,
          customerId: voiceCall.customerId,
          channel: DeliveryChannel.VOICE,
          status: InterventionStatus.IN_PROGRESS,
        },
        data: {
          status: InterventionStatus.COMPLETED,
          executedAt: new Date(),
          outcome: updateData.outcome === CallOutcome.SAVED ? 'SAVED' : 'NO_RESPONSE',
        },
      });

      this.eventEmitter.emit('voice.call.completed', {
        companyId: voiceCall.companyId,
        customerId: voiceCall.customerId,
        callId: voiceCall.id,
        outcome: updateData.outcome,
        duration: updateData.duration,
      });

      this.logger.log(`Call ${CallSid} completed with outcome: ${updateData.outcome}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // VOICE SCRIPTS
  // ═══════════════════════════════════════════════════════════════

  async getScripts(companyId: string, type?: VoiceScriptType): Promise<any[]> {
    const where: any = { companyId };
    if (type) where.type = type;

    return this.prisma.voiceScript.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createScript(companyId: string, data: any): Promise<any> {
    // If setting as default, unset others
    if (data.isDefault) {
      await this.prisma.voiceScript.updateMany({
        where: { companyId, type: data.type, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.voiceScript.create({
      data: {
        companyId,
        ...data,
      },
    });
  }

  async updateScript(scriptId: string, data: any): Promise<any> {
    const script = await this.prisma.voiceScript.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      throw new NotFoundException(`Voice script ${scriptId} not found`);
    }

    // If setting as default, unset others
    if (data.isDefault) {
      await this.prisma.voiceScript.updateMany({
        where: {
          companyId: script.companyId,
          type: script.type,
          isDefault: true,
          id: { not: scriptId },
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.voiceScript.update({
      where: { id: scriptId },
      data,
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CALL QUERIES
  // ═══════════════════════════════════════════════════════════════

  async getCalls(
    companyId: string,
    options: {
      status?: VoiceCallStatus;
      outcome?: CallOutcome;
      direction?: CallDirection;
      limit?: number;
    } = {},
  ): Promise<any[]> {
    const where: any = { companyId };
    if (options.status) where.status = options.status;
    if (options.outcome) where.outcome = options.outcome;
    if (options.direction) where.direction = options.direction;

    return this.prisma.voiceCall.findMany({
      where,
      orderBy: { initiatedAt: 'desc' },
      take: options.limit || 50,
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getCallById(callId: string): Promise<any> {
    const call = await this.prisma.voiceCall.findUnique({
      where: { id: callId },
      include: {
        customer: true,
        intervention: true,
      },
    });

    if (!call) {
      throw new NotFoundException(`Voice call ${callId} not found`);
    }

    return call;
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async getTwilioConfig(companyId: string): Promise<TwilioConfig | null> {
    // Get Twilio credentials from TwilioService (which reads from ClientIntegration)
    const credentials = await this.twilioService.getCredentials(companyId);

    if (!credentials) {
      // Fall back to environment variables for development/testing
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !phoneNumber) {
        this.logger.warn(`No Twilio configuration found for company ${companyId}`);
        return null;
      }

      this.logger.log(`Using environment variable Twilio config for company ${companyId}`);
      return {
        accountSid,
        authToken,
        phoneNumber,
        inboundWebhookUrl: `${process.env.API_URL || 'http://localhost:3001'}/api/momentum/voice/inbound`,
        statusCallbackUrl: `${process.env.API_URL || 'http://localhost:3001'}/api/momentum/voice/status`,
        voiceSettings: {
          voice: 'Polly.Joanna',
          language: 'en-US',
          speechTimeout: 3,
          maxCallDuration: 600,
        },
        speechRecognition: {
          provider: 'google',
          hints: [],
          model: 'phone_call',
        },
        fallbackBehavior: {
          maxRetries: 3,
          fallbackMessage: "I'm sorry, I didn't catch that. Could you please repeat?",
          transferToHuman: true,
        },
      };
    }

    // Return config from ClientIntegration credentials
    return {
      accountSid: credentials.accountSid,
      authToken: credentials.authToken,
      phoneNumber: credentials.fromNumber || '',
      inboundWebhookUrl: `${process.env.API_URL || 'http://localhost:3001'}/api/momentum/voice/inbound`,
      statusCallbackUrl: `${process.env.API_URL || 'http://localhost:3001'}/api/momentum/voice/status`,
      voiceSettings: {
        voice: 'Polly.Joanna',
        language: 'en-US',
        speechTimeout: 3,
        maxCallDuration: 600,
      },
      speechRecognition: {
        provider: 'google',
        hints: [],
        model: 'phone_call',
      },
      fallbackBehavior: {
        maxRetries: 3,
        fallbackMessage: "I'm sorry, I didn't catch that. Could you please repeat?",
        transferToHuman: true,
      },
    };
  }

  private async findCompanyByPhone(phoneNumber: string): Promise<any> {
    // Look up company by matching the Twilio phone number in their ClientIntegration
    // The fromNumber is stored in the credentials JSON field

    // First, find all active Twilio integrations
    const twilioIntegrations = await this.prisma.clientIntegration.findMany({
      where: {
        provider: IntegrationProvider.TWILIO,
        status: IntegrationStatus.ACTIVE,
      },
      include: {
        client: {
          include: {
            companies: true,
          },
        },
      },
    });

    // Normalize the phone number (remove +, spaces, etc.)
    const normalizedInput = phoneNumber.replace(/\D/g, '');

    // Check each integration's credentials for matching phone number
    for (const integration of twilioIntegrations) {
      if (!integration.credentials) continue;

      try {
        // Note: Credentials are encrypted - this would need decryption in production
        // For now, we're looking at the fromNumber field that should be in settings
        const settings = integration.settings as { fromNumber?: string } | null;
        const fromNumber = settings?.fromNumber?.replace(/\D/g, '');

        if (fromNumber && fromNumber === normalizedInput) {
          // Return the first company for this client
          const company = integration.client?.companies?.[0];
          if (company) {
            this.logger.log(`Found company ${company.id} for phone number ${phoneNumber}`);
            return company;
          }
        }
      } catch (error) {
        this.logger.warn(`Error checking integration ${integration.id}:`, error);
      }
    }

    this.logger.warn(`No company found for phone number ${phoneNumber}`);
    return null;
  }

  private analyzeSentiment(text: string): Sentiment {
    const textLower = text.toLowerCase();

    // Simple sentiment analysis (would use ML in production)
    const angryWords = ['angry', 'furious', 'terrible', 'worst', 'hate', 'ridiculous', 'unacceptable'];
    const negativeWords = ['bad', 'poor', 'disappointed', 'frustrated', 'unhappy', 'cancel', 'problem'];
    const positiveWords = ['great', 'good', 'happy', 'love', 'excellent', 'thanks', 'appreciate'];

    if (angryWords.some((word) => textLower.includes(word))) {
      return Sentiment.ANGRY;
    }
    if (negativeWords.some((word) => textLower.includes(word))) {
      return Sentiment.NEGATIVE;
    }
    if (positiveWords.some((word) => textLower.includes(word))) {
      return Sentiment.POSITIVE;
    }
    return Sentiment.NEUTRAL;
  }

  private detectIntent(text: string): string | null {
    const textLower = text.toLowerCase();

    // Intent detection patterns
    const intents: Record<string, string[]> = {
      'cancel': ['cancel', 'stop', 'end', 'terminate', 'unsubscribe'],
      'price_concern': ['expensive', 'price', 'cost', 'afford', 'budget', 'money'],
      'product_issue': ['product', 'quality', 'taste', 'flavor', "don't like", 'wrong'],
      'shipping_issue': ['shipping', 'delivery', 'late', 'damaged', 'lost'],
      'pause_request': ['pause', 'hold', 'break', 'skip', 'later'],
      'speak_human': ['human', 'person', 'agent', 'representative', 'manager'],
      'accept_offer': ['yes', 'okay', 'sure', 'accept', "that's fine", 'deal'],
      'decline_offer': ['no', 'not interested', 'decline', 'pass'],
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some((keyword) => textLower.includes(keyword))) {
        return intent;
      }
    }

    return null;
  }

  private async generateScriptedResponse(
    script: any,
    intent: string | null,
    sentiment: Sentiment,
    customerText: string,
  ): Promise<{ text: string; endCall: boolean; action?: string }> {
    if (!script) {
      return {
        text: 'Thank you for your call. How can I help you today?',
        endCall: false,
      };
    }

    const diagnosis = script.diagnosis as any;
    const interventions = script.interventions as any[];
    const closing = script.closing as any;

    // Handle escalation request
    if (intent === 'speak_human') {
      return {
        text: closing?.escalateToHuman || "I'll connect you with a team member right away.",
        endCall: false,
        action: 'escalate',
      };
    }

    // Handle angry sentiment
    if (sentiment === Sentiment.ANGRY) {
      const sentimentResponses = diagnosis?.sentimentResponses as any;
      return {
        text: sentimentResponses?.angry || "I understand your frustration. Let me help make this right.",
        endCall: false,
      };
    }

    // Handle accept offer
    if (intent === 'accept_offer') {
      return {
        text: closing?.acceptOffer || "Wonderful! I've applied that to your account.",
        endCall: true,
      };
    }

    // Handle decline
    if (intent === 'decline_offer') {
      return {
        text: closing?.declineOffer || "I understand. Is there anything else I can help with?",
        endCall: true,
      };
    }

    // Find matching intervention
    if (interventions && intent) {
      const intervention = interventions.find((i: any) =>
        i.condition?.includes(intent),
      );
      if (intervention) {
        return {
          text: intervention.response,
          endCall: false,
        };
      }
    }

    // Default follow-up question
    const followUp = diagnosis?.followUpQuestions?.find((q: any) =>
      new RegExp(q.trigger, 'i').test(customerText),
    );

    if (followUp) {
      return {
        text: followUp.question,
        endCall: false,
      };
    }

    // Default response
    return {
      text: diagnosis?.primaryQuestion || 'Could you tell me more about what brought you to call today?',
      endCall: false,
    };
  }

  private async determineCallOutcome(voiceCall: any): Promise<CallOutcome> {
    const intents = voiceCall.detectedIntents || [];
    const sentiment = voiceCall.overallSentiment;

    if (intents.includes('accept_offer')) {
      return CallOutcome.OFFER_ACCEPTED;
    }

    if (intents.includes('speak_human') || voiceCall.escalatedToHuman) {
      return CallOutcome.ESCALATED_TO_HUMAN;
    }

    if (intents.includes('decline_offer') || intents.includes('cancel')) {
      return CallOutcome.DECLINED;
    }

    // If call ended without clear resolution
    if (voiceCall.duration && voiceCall.duration < 30) {
      return CallOutcome.DISCONNECTED;
    }

    // Default - need to follow up
    return CallOutcome.CALLBACK_SCHEDULED;
  }

  private generateTwiML(
    text: string,
    options: {
      gather?: boolean;
      speechTimeout?: number;
      action?: string;
    } = {},
  ): string {
    if (options.action === 'escalate') {
      // Generate TwiML for escalation with message before redirect
      const response = this.twilioService.createVoiceResponse();
      response.say({ voice: 'Polly.Joanna', language: 'en-US' }, text);
      response.redirect('/api/momentum/voice/escalate');
      return response.toString();
    }

    if (options.gather) {
      return this.twilioService.generateGatherTwiML(
        text,
        {
          speechTimeout: options.speechTimeout || 3,
          action: `${process.env.API_URL || ''}/api/momentum/voice/speech`,
          speechModel: 'phone_call',
        },
        { voice: 'Polly.Joanna' },
      );
    }

    return this.twilioService.generateSayTwiML(text, { voice: 'Polly.Joanna' });
  }

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL TWILIO HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Transfer call to a human agent
   */
  async transferToHuman(companyId: string, callSid: string, agentNumber: string): Promise<boolean> {
    try {
      const twiml = this.twilioService.generateTransferTwiML(agentNumber, {
        message: "I'll connect you with a team member right away. Please hold.",
        timeout: 30,
        record: true,
      });

      await this.twilioService.updateCall(companyId, callSid, { twiml });

      // Update call record
      await this.prisma.voiceCall.update({
        where: { twilioCallSid: callSid },
        data: { escalatedToHuman: true },
      });

      return true;
    } catch (error) {
      this.logger.error(`Error transferring call ${callSid}:`, error);
      return false;
    }
  }

  /**
   * End a call with a message
   */
  async endCall(companyId: string, callSid: string, message?: string): Promise<boolean> {
    try {
      const twiml = this.twilioService.generateHangupTwiML(message);
      await this.twilioService.updateCall(companyId, callSid, { twiml });
      return true;
    } catch (error) {
      this.logger.error(`Error ending call ${callSid}:`, error);
      return false;
    }
  }

  /**
   * Get call recordings
   */
  async getCallRecordings(companyId: string, callSid: string): Promise<any[]> {
    return this.twilioService.getRecordings(companyId, callSid);
  }

  /**
   * Send SMS notification to customer
   */
  async sendSmsNotification(
    companyId: string,
    phoneNumber: string,
    message: string,
  ): Promise<any> {
    return this.twilioService.sendSms(companyId, {
      to: phoneNumber,
      body: message,
    });
  }

  /**
   * Check if Twilio is configured for a company
   */
  async isTwilioConfigured(companyId: string): Promise<boolean> {
    const result = await this.twilioService.testConnection(companyId);
    return result.success;
  }
}
