import { Injectable, Logger } from '@nestjs/common';
import { SNSClient, GetSMSAttributesCommand } from '@aws-sdk/client-sns';

export interface AWSSNSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

export interface AWSSNSTestResult {
  success: boolean;
  message: string;
}

@Injectable()
export class AWSSNSService {
  private readonly logger = new Logger(AWSSNSService.name);

  async testConnection(credentials: AWSSNSCredentials): Promise<AWSSNSTestResult> {
    try {
      if (!credentials.accessKeyId || !credentials.secretAccessKey) {
        return { success: false, message: 'Access Key ID and Secret Access Key are required' };
      }

      const client = new SNSClient({
        region: credentials.region || 'us-east-1',
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
        },
      });

      // Get SMS attributes to validate credentials
      await client.send(new GetSMSAttributesCommand({ attributes: ['DefaultSenderID'] }));

      this.logger.log('AWS SNS connection test successful');
      return {
        success: true,
        message: `Connected to AWS SNS (${credentials.region || 'us-east-1'})`,
      };
    } catch (error: any) {
      const message = error.message || 'Unknown error';
      this.logger.error(`AWS SNS connection test failed: ${message}`);

      if (message.includes('InvalidClientTokenId') || message.includes('SignatureDoesNotMatch')) {
        return { success: false, message: 'Invalid AWS credentials' };
      }
      if (message.includes('AccessDenied')) {
        return { success: false, message: 'Access denied. Check IAM permissions for SNS.' };
      }

      return { success: false, message: `Connection failed: ${message}` };
    }
  }
}
