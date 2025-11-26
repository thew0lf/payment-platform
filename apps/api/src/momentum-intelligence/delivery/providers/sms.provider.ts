import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsSendOptions {
  to: string;
  body: string;
  trackingId: string;
  from?: string;
}

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);
  private readonly twilioAccountSid: string;
  private readonly twilioAuthToken: string;
  private readonly twilioFromNumber: string;

  constructor(private readonly config: ConfigService) {
    this.twilioAccountSid = this.config.get('TWILIO_ACCOUNT_SID', '');
    this.twilioAuthToken = this.config.get('TWILIO_AUTH_TOKEN', '');
    this.twilioFromNumber = this.config.get('TWILIO_FROM_NUMBER', '');
  }

  async send(options: SmsSendOptions): Promise<string> {
    this.logger.log(`Sending SMS to ${options.to}`);

    // Validate phone number
    if (!this.isValidPhoneNumber(options.to)) {
      throw new Error(`Invalid phone number: ${options.to}`);
    }

    try {
      // Simulate API call delay
      await this.simulateApiCall();

      // Generate a mock message SID
      const messageSid = `SM${Date.now()}${Math.random().toString(36).substring(2, 15)}`;

      this.logger.log(`SMS sent successfully. MessageSid: ${messageSid}`);

      // In production:
      // const client = twilio(this.twilioAccountSid, this.twilioAuthToken);
      // const message = await client.messages.create({
      //   body: options.body,
      //   to: options.to,
      //   from: options.from || this.twilioFromNumber,
      //   statusCallback: `${baseUrl}/api/webhooks/twilio/status?trackingId=${options.trackingId}`,
      // });
      // return message.sid;

      return messageSid;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${options.to}`, error);
      throw error;
    }
  }

  async sendBatch(
    messages: SmsSendOptions[],
  ): Promise<{ messageSid: string; to: string }[]> {
    this.logger.log(`Sending batch of ${messages.length} SMS messages`);

    const results: { messageSid: string; to: string }[] = [];

    for (const message of messages) {
      try {
        const messageSid = await this.send(message);
        results.push({ messageSid, to: message.to });
      } catch (error) {
        this.logger.error(`Failed to send SMS to ${message.to} in batch`, error);
        results.push({ messageSid: '', to: message.to });
      }
    }

    return results;
  }

  async checkDeliveryStatus(messageSid: string): Promise<string> {
    // In production, check the delivery status from Twilio
    // For now, simulate a delivered status
    return 'delivered';
  }

  async lookupCarrier(phoneNumber: string): Promise<{
    carrier: string;
    type: string;
  }> {
    // In production, use Twilio Lookup API
    // For now, return mock data
    return {
      carrier: 'Unknown',
      type: 'mobile',
    };
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic E.164 format validation
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  private async simulateApiCall(): Promise<void> {
    // Simulate network latency
    return new Promise((resolve) => setTimeout(resolve, 100));
  }
}
