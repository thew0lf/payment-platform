import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CredentialEncryptionService } from '../credential-encryption.service';
import { IntegrationProvider, IntegrationStatus } from '../../types/integration.types';

// Handle CommonJS/ESM interop for Twilio
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Twilio = require('twilio');

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  fromNumber?: string;
}

export interface TwilioCallOptions {
  to: string;
  from?: string;
  url?: string;
  statusCallback?: string;
  statusCallbackEvent?: ('initiated' | 'ringing' | 'answered' | 'completed')[];
  statusCallbackMethod?: 'POST' | 'GET';
  timeout?: number;
  record?: boolean;
  recordingStatusCallback?: string;
  machineDetection?: 'Enable' | 'DetectMessageEnd';
  twiml?: string;
}

export interface TwilioSmsOptions {
  to: string;
  from?: string;
  body: string;
  statusCallback?: string;
  mediaUrl?: string[];
}

export interface TwilioCallResult {
  sid: string;
  status: string;
  to: string;
  from: string;
  direction: string;
  dateCreated: Date;
}

export interface TwilioSmsResult {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  dateCreated: Date;
}

export interface TwiMLGatherOptions {
  input?: 'speech' | 'dtmf' | 'speech dtmf';
  timeout?: number;
  speechTimeout?: number | 'auto';
  language?: string;
  action?: string;
  method?: 'GET' | 'POST';
  numDigits?: number;
  hints?: string;
  speechModel?: 'default' | 'numbers_and_commands' | 'phone_call';
}

export interface TwiMLSayOptions {
  voice?: string;
  language?: string;
  loop?: number;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private clientCache = new Map<string, any>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: CredentialEncryptionService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CLIENT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get Twilio client for a company (uses integration credentials)
   */
  async getClient(companyId: string): Promise<any | null> {
    // Check cache first
    const cached = this.clientCache.get(companyId);
    if (cached) {
      return cached;
    }

    try {
      const credentials = await this.getCredentials(companyId);
      if (!credentials?.accountSid || !credentials?.authToken) {
        this.logger.warn(`No valid Twilio credentials for company ${companyId}`);
        return null;
      }

      // Create and cache client
      const client = Twilio(credentials.accountSid, credentials.authToken);
      this.clientCache.set(companyId, client);

      return client;
    } catch (error) {
      this.logger.error(`Error getting Twilio client for company ${companyId}:`, error);
      return null;
    }
  }

  /**
   * Get Twilio credentials for a company
   * Looks up clientId from the company, then finds the Twilio integration
   */
  async getCredentials(companyId: string): Promise<TwilioCredentials | null> {
    try {
      // Get the company to find its clientId
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { clientId: true },
      });

      if (!company?.clientId) {
        this.logger.warn(`Company ${companyId} not found or has no clientId`);
        return null;
      }

      // Find the Twilio integration for this client
      const integration = await this.prisma.clientIntegration.findFirst({
        where: {
          clientId: company.clientId,
          provider: IntegrationProvider.TWILIO,
          status: IntegrationStatus.ACTIVE,
        },
      });

      if (!integration?.credentials) {
        this.logger.warn(`No active Twilio integration for client ${company.clientId}`);
        return null;
      }

      // Decrypt credentials
      const decrypted = this.encryptionService.decrypt(integration.credentials as any);
      return decrypted as TwilioCredentials;
    } catch (error) {
      this.logger.error(`Error getting Twilio credentials:`, error);
      return null;
    }
  }

  /**
   * Clear cached client (call when credentials are updated)
   */
  clearClientCache(companyId: string): void {
    this.clientCache.delete(companyId);
  }

  // ═══════════════════════════════════════════════════════════════
  // VOICE CALLS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Initiate an outbound voice call
   */
  async makeCall(companyId: string, options: TwilioCallOptions): Promise<TwilioCallResult | null> {
    const client = await this.getClient(companyId);
    if (!client) {
      this.logger.error(`Cannot make call: No Twilio client for company ${companyId}`);
      return null;
    }

    const credentials = await this.getCredentials(companyId);
    const fromNumber = options.from || credentials?.fromNumber;

    if (!fromNumber) {
      this.logger.error(`Cannot make call: No from number configured for company ${companyId}`);
      return null;
    }

    try {
      const callParams: any = {
        to: options.to,
        from: fromNumber,
      };

      // Use TwiML directly or a URL
      if (options.twiml) {
        callParams.twiml = options.twiml;
      } else if (options.url) {
        callParams.url = options.url;
      }

      // Status callback configuration
      if (options.statusCallback) {
        callParams.statusCallback = options.statusCallback;
        callParams.statusCallbackEvent = options.statusCallbackEvent || ['initiated', 'ringing', 'answered', 'completed'];
        callParams.statusCallbackMethod = options.statusCallbackMethod || 'POST';
      }

      // Optional settings
      if (options.timeout) {
        callParams.timeout = options.timeout;
      }
      if (options.record) {
        callParams.record = options.record;
        if (options.recordingStatusCallback) {
          callParams.recordingStatusCallback = options.recordingStatusCallback;
        }
      }
      if (options.machineDetection) {
        callParams.machineDetection = options.machineDetection;
      }

      const call = await client.calls.create(callParams);

      this.logger.log(`Initiated call ${call.sid} to ${options.to}`);

      return {
        sid: call.sid,
        status: call.status,
        to: call.to,
        from: call.from,
        direction: call.direction,
        dateCreated: call.dateCreated,
      };
    } catch (error) {
      this.logger.error(`Error making call to ${options.to}:`, error);
      throw error;
    }
  }

  /**
   * Get call details by SID
   */
  async getCall(companyId: string, callSid: string): Promise<any> {
    const client = await this.getClient(companyId);
    if (!client) return null;

    try {
      return await client.calls(callSid).fetch();
    } catch (error) {
      this.logger.error(`Error fetching call ${callSid}:`, error);
      return null;
    }
  }

  /**
   * Update an active call
   */
  async updateCall(
    companyId: string,
    callSid: string,
    options: { twiml?: string; url?: string; status?: 'canceled' | 'completed' },
  ): Promise<any> {
    const client = await this.getClient(companyId);
    if (!client) return null;

    try {
      return await client.calls(callSid).update(options);
    } catch (error) {
      this.logger.error(`Error updating call ${callSid}:`, error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SMS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send an SMS message
   */
  async sendSms(companyId: string, options: TwilioSmsOptions): Promise<TwilioSmsResult | null> {
    const client = await this.getClient(companyId);
    if (!client) {
      this.logger.error(`Cannot send SMS: No Twilio client for company ${companyId}`);
      return null;
    }

    const credentials = await this.getCredentials(companyId);
    const fromNumber = options.from || credentials?.fromNumber;

    if (!fromNumber) {
      this.logger.error(`Cannot send SMS: No from number configured for company ${companyId}`);
      return null;
    }

    try {
      const messageParams: any = {
        to: options.to,
        from: fromNumber,
        body: options.body,
      };

      if (options.statusCallback) {
        messageParams.statusCallback = options.statusCallback;
      }
      if (options.mediaUrl && options.mediaUrl.length > 0) {
        messageParams.mediaUrl = options.mediaUrl;
      }

      const message = await client.messages.create(messageParams);

      this.logger.log(`Sent SMS ${message.sid} to ${options.to}`);

      return {
        sid: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        dateCreated: message.dateCreated,
      };
    } catch (error) {
      this.logger.error(`Error sending SMS to ${options.to}:`, error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TWIML GENERATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new TwiML VoiceResponse
   */
  createVoiceResponse(): any {
    return new Twilio.twiml.VoiceResponse();
  }

  /**
   * Generate TwiML for speaking text
   */
  generateSayTwiML(text: string, options: TwiMLSayOptions = {}): string {
    const response = this.createVoiceResponse();
    response.say(
      {
        voice: options.voice || 'Polly.Joanna',
        language: options.language || 'en-US',
        loop: options.loop,
      } as any,
      text,
    );
    return response.toString();
  }

  /**
   * Generate TwiML for gathering speech input
   */
  generateGatherTwiML(
    prompt: string,
    gatherOptions: TwiMLGatherOptions = {},
    sayOptions: TwiMLSayOptions = {},
  ): string {
    const response = this.createVoiceResponse();

    const gather = response.gather({
      input: gatherOptions.input ? [gatherOptions.input] : ['speech'],
      timeout: gatherOptions.timeout || 3,
      speechTimeout: String(gatherOptions.speechTimeout || 'auto'),
      language: gatherOptions.language || 'en-US',
      action: gatherOptions.action,
      method: gatherOptions.method || 'POST',
      hints: gatherOptions.hints,
      speechModel: gatherOptions.speechModel || 'phone_call',
    } as any);

    gather.say(
      {
        voice: sayOptions.voice || 'Polly.Joanna',
        language: sayOptions.language || 'en-US',
      } as any,
      prompt,
    );

    return response.toString();
  }

  /**
   * Generate TwiML for playing audio
   */
  generatePlayTwiML(audioUrl: string, loop?: number): string {
    const response = this.createVoiceResponse();
    response.play({ loop }, audioUrl);
    return response.toString();
  }

  /**
   * Generate TwiML for redirecting to another TwiML URL
   */
  generateRedirectTwiML(url: string): string {
    const response = this.createVoiceResponse();
    response.redirect(url);
    return response.toString();
  }

  /**
   * Generate TwiML for connecting to a conference
   */
  generateConferenceTwiML(
    conferenceName: string,
    options: {
      beep?: boolean;
      startConferenceOnEnter?: boolean;
      endConferenceOnExit?: boolean;
      waitUrl?: string;
      muted?: boolean;
      record?: 'do-not-record' | 'record-from-start';
    } = {},
  ): string {
    const response = this.createVoiceResponse();
    const dial = response.dial();
    dial.conference(
      {
        beep: options.beep ?? true,
        startConferenceOnEnter: options.startConferenceOnEnter ?? true,
        endConferenceOnExit: options.endConferenceOnExit ?? false,
        waitUrl: options.waitUrl,
        muted: options.muted ?? false,
        record: options.record || 'do-not-record',
      } as any,
      conferenceName,
    );
    return response.toString();
  }

  /**
   * Generate TwiML for transferring to a human agent
   */
  generateTransferTwiML(
    phoneNumber: string,
    options: {
      message?: string;
      timeout?: number;
      callerId?: string;
      record?: boolean;
    } = {},
  ): string {
    const response = this.createVoiceResponse();

    if (options.message) {
      response.say(
        { voice: 'Polly.Joanna', language: 'en-US' },
        options.message,
      );
    }

    const dial = response.dial({
      timeout: options.timeout || 30,
      callerId: options.callerId,
      record: options.record ? 'record-from-ringing' : 'do-not-record',
    });
    dial.number(phoneNumber);

    return response.toString();
  }

  /**
   * Generate TwiML for hanging up
   */
  generateHangupTwiML(message?: string): string {
    const response = this.createVoiceResponse();

    if (message) {
      response.say({ voice: 'Polly.Joanna', language: 'en-US' }, message);
    }

    response.hangup();
    return response.toString();
  }

  // ═══════════════════════════════════════════════════════════════
  // WEBHOOK VALIDATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validate that a webhook request came from Twilio
   */
  validateWebhookSignature(
    authToken: string,
    signature: string,
    url: string,
    params: Record<string, string>,
  ): boolean {
    return Twilio.validateRequest(authToken, signature, url, params);
  }

  /**
   * Validate webhook for a specific company
   */
  async validateWebhookForCompany(
    companyId: string,
    signature: string,
    url: string,
    params: Record<string, string>,
  ): Promise<boolean> {
    const credentials = await this.getCredentials(companyId);
    if (!credentials?.authToken) {
      return false;
    }

    return this.validateWebhookSignature(credentials.authToken, signature, url, params);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHONE NUMBER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * List available phone numbers for purchase
   */
  async listAvailableNumbers(
    companyId: string,
    options: {
      country?: string;
      areaCode?: string;
      contains?: string;
      voiceEnabled?: boolean;
      smsEnabled?: boolean;
      limit?: number;
    } = {},
  ): Promise<any[]> {
    const client = await this.getClient(companyId);
    if (!client) return [];

    try {
      const country = options.country || 'US';
      let query = client.availablePhoneNumbers(country).local;

      const params: any = {
        voiceEnabled: options.voiceEnabled ?? true,
        smsEnabled: options.smsEnabled ?? true,
      };

      if (options.areaCode) {
        params.areaCode = options.areaCode;
      }
      if (options.contains) {
        params.contains = options.contains;
      }

      const numbers = await query.list({ limit: options.limit || 20, ...params });
      return numbers;
    } catch (error) {
      this.logger.error(`Error listing available numbers:`, error);
      return [];
    }
  }

  /**
   * Purchase a phone number
   */
  async purchaseNumber(
    companyId: string,
    phoneNumber: string,
    options: {
      voiceUrl?: string;
      voiceMethod?: 'GET' | 'POST';
      smsUrl?: string;
      smsMethod?: 'GET' | 'POST';
      statusCallback?: string;
    } = {},
  ): Promise<any> {
    const client = await this.getClient(companyId);
    if (!client) return null;

    try {
      const params: any = {
        phoneNumber,
      };

      if (options.voiceUrl) {
        params.voiceUrl = options.voiceUrl;
        params.voiceMethod = options.voiceMethod || 'POST';
      }
      if (options.smsUrl) {
        params.smsUrl = options.smsUrl;
        params.smsMethod = options.smsMethod || 'POST';
      }
      if (options.statusCallback) {
        params.statusCallback = options.statusCallback;
      }

      const number = await client.incomingPhoneNumbers.create(params);
      this.logger.log(`Purchased phone number ${phoneNumber}`);
      return number;
    } catch (error) {
      this.logger.error(`Error purchasing number ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Update phone number configuration
   */
  async updateNumber(
    companyId: string,
    phoneSid: string,
    options: {
      voiceUrl?: string;
      voiceMethod?: 'GET' | 'POST';
      smsUrl?: string;
      smsMethod?: 'GET' | 'POST';
      statusCallback?: string;
    },
  ): Promise<any> {
    const client = await this.getClient(companyId);
    if (!client) return null;

    try {
      return await client.incomingPhoneNumbers(phoneSid).update(options);
    } catch (error) {
      this.logger.error(`Error updating number ${phoneSid}:`, error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RECORDINGS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get call recordings
   */
  async getRecordings(companyId: string, callSid: string): Promise<any[]> {
    const client = await this.getClient(companyId);
    if (!client) return [];

    try {
      return await client.recordings.list({ callSid });
    } catch (error) {
      this.logger.error(`Error fetching recordings for call ${callSid}:`, error);
      return [];
    }
  }

  /**
   * Delete a recording
   */
  async deleteRecording(companyId: string, recordingSid: string): Promise<boolean> {
    const client = await this.getClient(companyId);
    if (!client) return false;

    try {
      await client.recordings(recordingSid).remove();
      return true;
    } catch (error) {
      this.logger.error(`Error deleting recording ${recordingSid}:`, error);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TRANSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get transcription for a recording
   */
  async getTranscription(companyId: string, transcriptionSid: string): Promise<any> {
    const client = await this.getClient(companyId);
    if (!client) return null;

    try {
      return await client.transcriptions(transcriptionSid).fetch();
    } catch (error) {
      this.logger.error(`Error fetching transcription ${transcriptionSid}:`, error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ACCOUNT INFO
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get account balance
   */
  async getAccountBalance(companyId: string): Promise<{ balance: string; currency: string } | null> {
    const client = await this.getClient(companyId);
    if (!client) return null;

    try {
      const credentials = await this.getCredentials(companyId);
      if (!credentials) return null;

      // Fetch account to verify connection (balance requires Balance API)
      await client.api.accounts(credentials.accountSid).fetch();

      // For actual balance, you'd need to use the Balance API
      // This is a simplified check that verifies the connection works
      return {
        balance: '0.00',
        currency: 'USD',
      };
    } catch (error) {
      this.logger.error(`Error fetching account balance:`, error);
      return null;
    }
  }

  /**
   * Test connection with Twilio using companyId
   */
  async testConnection(companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await this.getClient(companyId);
      if (!client) {
        return { success: false, error: 'No Twilio credentials configured' };
      }

      const credentials = await this.getCredentials(companyId);
      await client.api.accounts(credentials!.accountSid).fetch();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to connect to Twilio' };
    }
  }

  /**
   * Test connection with Twilio using direct credentials (for integration testing)
   */
  async testConnectionWithCredentials(credentials: TwilioCredentials): Promise<{ success: boolean; message: string }> {
    try {
      if (!credentials.accountSid || !credentials.authToken) {
        return { success: false, message: 'Account SID and Auth Token are required' };
      }

      const client = Twilio(credentials.accountSid, credentials.authToken);
      const account = await client.api.accounts(credentials.accountSid).fetch();

      return {
        success: true,
        message: `Connected to Twilio account: ${account.friendlyName || credentials.accountSid}`,
      };
    } catch (error: any) {
      const message = error.message || 'Failed to connect to Twilio';

      if (message.includes('authenticate')) {
        return { success: false, message: 'Invalid Account SID or Auth Token' };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }
}
