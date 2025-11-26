import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
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

    // Create voice call record
    const voiceCall = await this.prisma.voiceCall.create({
      data: {
        companyId,
        customerId,
        direction: CallDirection.OUTBOUND,
        fromNumber: twilioConfig.phoneNumber,
        toNumber: customer.phone,
        scriptId,
        status: VoiceCallStatus.INITIATED,
        twilioCallSid: `MOCK_${Date.now()}`, // Would be from Twilio API
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

    // In production, would call Twilio API here
    // const call = await this.twilioClient.calls.create({...})

    this.eventEmitter.emit('voice.call.initiated', {
      companyId,
      customerId,
      callId: voiceCall.id,
      direction: CallDirection.OUTBOUND,
    });

    this.logger.log(`Initiated outbound call to customer ${customerId}`);

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
    // Would be retrieved from company settings in production
    // For now, return a mock config
    return {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
      inboundWebhookUrl: `${process.env.API_URL}/api/momentum/voice/inbound`,
      statusCallbackUrl: `${process.env.API_URL}/api/momentum/voice/status`,
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
    // Would lookup company by their Twilio phone number
    // For now, return first company (simplified)
    return this.prisma.company.findFirst();
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
    const voice = 'Polly.Joanna';
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    if (options.gather) {
      twiml += `<Gather input="speech" speechTimeout="${options.speechTimeout || 3}" language="en-US">`;
      twiml += `<Say voice="${voice}">${this.escapeXml(text)}</Say>`;
      twiml += '</Gather>';
    } else {
      twiml += `<Say voice="${voice}">${this.escapeXml(text)}</Say>`;
    }

    if (options.action === 'escalate') {
      // Would add transfer logic here
      twiml += '<Redirect>/api/momentum/voice/escalate</Redirect>';
    }

    twiml += '</Response>';
    return twiml;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
