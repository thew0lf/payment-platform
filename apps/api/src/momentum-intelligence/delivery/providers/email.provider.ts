import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailSendOptions {
  to: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  trackingId: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
}

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private readonly sesRegion: string;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly config: ConfigService) {
    this.sesRegion = this.config.get('AWS_SES_REGION', 'us-east-1');
    this.fromEmail = this.config.get('AWS_SES_FROM_EMAIL', 'noreply@example.com');
    this.fromName = this.config.get('AWS_SES_FROM_NAME', 'Momentum Intelligence');
  }

  async send(options: EmailSendOptions): Promise<string> {
    this.logger.log(`Sending email to ${options.to} with subject: ${options.subject}`);

    // In production, this would use AWS SES
    // For now, we'll simulate the send and return a message ID
    try {
      // Simulate API call delay
      await this.simulateApiCall();

      // Generate a mock message ID
      const messageId = `ses-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      this.logger.log(`Email sent successfully. MessageId: ${messageId}`);

      // In production:
      // const ses = new SESClient({ region: this.sesRegion });
      // const command = new SendEmailCommand({
      //   Source: `${options.fromName || this.fromName} <${options.from || this.fromEmail}>`,
      //   Destination: { ToAddresses: [options.to] },
      //   Message: {
      //     Subject: { Data: options.subject },
      //     Body: {
      //       Text: { Data: options.body },
      //       Html: options.bodyHtml ? { Data: options.bodyHtml } : undefined,
      //     },
      //   },
      //   Tags: [{ Name: 'TrackingId', Value: options.trackingId }],
      // });
      // const result = await ses.send(command);
      // return result.MessageId;

      return messageId;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      throw error;
    }
  }

  async sendBatch(
    emails: EmailSendOptions[],
  ): Promise<{ messageId: string; to: string }[]> {
    this.logger.log(`Sending batch of ${emails.length} emails`);

    const results: { messageId: string; to: string }[] = [];

    for (const email of emails) {
      try {
        const messageId = await this.send(email);
        results.push({ messageId, to: email.to });
      } catch (error) {
        this.logger.error(`Failed to send email to ${email.to} in batch`, error);
        results.push({ messageId: '', to: email.to });
      }
    }

    return results;
  }

  async verifyEmail(email: string): Promise<boolean> {
    // In production, this would verify the email address is valid
    // and not on any suppression lists
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async checkSuppressionList(email: string): Promise<boolean> {
    // In production, check if email is on SES suppression list
    // For now, always return false (not suppressed)
    return false;
  }

  private async simulateApiCall(): Promise<void> {
    // Simulate network latency
    return new Promise((resolve) => setTimeout(resolve, 50));
  }
}
