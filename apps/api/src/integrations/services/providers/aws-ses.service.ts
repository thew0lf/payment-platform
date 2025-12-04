import { Injectable, Logger } from '@nestjs/common';
import { SESClient, GetSendQuotaCommand } from '@aws-sdk/client-ses';

export interface AWSSESCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

export interface AWSSESTestResult {
  success: boolean;
  message: string;
}

@Injectable()
export class AWSSESService {
  private readonly logger = new Logger(AWSSESService.name);

  async testConnection(credentials: AWSSESCredentials): Promise<AWSSESTestResult> {
    try {
      if (!credentials.accessKeyId || !credentials.secretAccessKey) {
        return { success: false, message: 'Access Key ID and Secret Access Key are required' };
      }

      const client = new SESClient({
        region: credentials.region || 'us-east-1',
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
      });

      // Get send quota to validate credentials
      const response = await client.send(new GetSendQuotaCommand({}));

      this.logger.log('AWS SES connection test successful');
      return {
        success: true,
        message: `Connected to AWS SES (${credentials.region || 'us-east-1'}) - Quota: ${response.Max24HourSend}/day`,
      };
    } catch (error: any) {
      const message = error.message || 'Unknown error';
      this.logger.error(`AWS SES connection test failed: ${message}`);

      if (message.includes('InvalidClientTokenId') || message.includes('SignatureDoesNotMatch')) {
        return { success: false, message: 'Invalid AWS credentials' };
      }
      if (message.includes('AccessDenied')) {
        return { success: false, message: 'Access denied. Check IAM permissions for SES.' };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }
}
