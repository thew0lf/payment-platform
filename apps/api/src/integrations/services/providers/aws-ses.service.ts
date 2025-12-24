import { Injectable, Logger } from '@nestjs/common';
import { SESClient, GetSendQuotaCommand, GetIdentityVerificationAttributesCommand } from '@aws-sdk/client-ses';
import { SQSClient, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';

export interface AWSSESCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  fromEmail?: string;
  sqsQueueUrl?: string;
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

      const region = credentials.region || 'us-east-1';
      const awsCredentials = {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      };

      // Test SES credentials
      const sesClient = new SESClient({
        region,
        credentials: awsCredentials,
      });

      // Get send quota to validate credentials
      const quotaResponse = await sesClient.send(new GetSendQuotaCommand({}));

      // Validate From Email is verified (if provided)
      if (credentials.fromEmail) {
        const domain = credentials.fromEmail.split('@')[1];
        const verifyResponse = await sesClient.send(new GetIdentityVerificationAttributesCommand({
          Identities: [credentials.fromEmail, domain],
        }));

        const attrs = verifyResponse.VerificationAttributes || {};
        const emailVerified = attrs[credentials.fromEmail]?.VerificationStatus === 'Success';
        const domainVerified = attrs[domain]?.VerificationStatus === 'Success';

        if (!emailVerified && !domainVerified) {
          return {
            success: false,
            message: `From email "${credentials.fromEmail}" is not verified in SES. Please verify the email or domain.`,
          };
        }
      }

      // Validate SQS Queue URL (if provided)
      if (credentials.sqsQueueUrl) {
        // Validate URL format
        const sqsUrlRegex = /^https:\/\/sqs\.[a-z0-9-]+\.amazonaws\.com\/\d{12}\/[a-zA-Z0-9_-]+$/;
        if (!sqsUrlRegex.test(credentials.sqsQueueUrl)) {
          return {
            success: false,
            message: 'Invalid SQS Queue URL format. Expected: https://sqs.REGION.amazonaws.com/ACCOUNT_ID/QUEUE_NAME',
          };
        }

        // Test SQS access
        const sqsClient = new SQSClient({
          region,
          credentials: awsCredentials,
        });

        try {
          await sqsClient.send(new GetQueueAttributesCommand({
            QueueUrl: credentials.sqsQueueUrl,
            AttributeNames: ['QueueArn'],
          }));
        } catch (sqsError: any) {
          const sqsMessage = sqsError.message || 'Unknown SQS error';
          if (sqsMessage.includes('NonExistentQueue') || sqsMessage.includes('does not exist')) {
            return { success: false, message: 'SQS Queue not found. Check the queue URL.' };
          }
          if (sqsMessage.includes('AccessDenied')) {
            return { success: false, message: 'Access denied to SQS Queue. Check IAM permissions.' };
          }
          return { success: false, message: `SQS connection failed: ${sqsMessage}` };
        }
      }

      this.logger.log('AWS SES connection test successful');
      return {
        success: true,
        message: `Connected to AWS SES (${region}) - Quota: ${quotaResponse.Max24HourSend}/day`,
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
