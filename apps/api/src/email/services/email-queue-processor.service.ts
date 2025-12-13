// Email Queue Processor - Consumes SQS messages and sends via SES
// Runs as a background worker with automatic retries and dead-letter handling
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
} from '@aws-sdk/client-sqs';
import {
  SESv2Client,
  SendEmailCommand,
  SendEmailCommandInput,
} from '@aws-sdk/client-sesv2';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AuditAction } from '../../audit-logs/types/audit-log.types';
import { EmailQueueMessage } from './email-queue.service';
import {
  DEFAULT_FROM_EMAIL,
  DEFAULT_FROM_NAME,
  DEFAULT_REPLY_TO,
  SES_CONFIGURATION_SET,
} from '../types/email.types';
import { EmailSendStatus, DataClassification } from '@prisma/client';

const MAX_RETRY_COUNT = 3;
const POLL_INTERVAL_MS = 5000; // 5 seconds
const VISIBILITY_TIMEOUT_SECONDS = 60;
const MAX_MESSAGES_PER_POLL = 10;

@Injectable()
export class EmailQueueProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueProcessorService.name);
  private sqsClient: SQSClient;
  private sesClient: SESv2Client;
  private queueUrl: string;
  private isProcessing = false;
  private shouldStop = false;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async onModuleInit() {
    const region = process.env.AWS_REGION || 'us-east-1';

    this.sqsClient = new SQSClient({ region });
    this.sesClient = new SESv2Client({ region });

    this.queueUrl = process.env.EMAIL_QUEUE_URL ||
      `https://sqs.${region}.amazonaws.com/${process.env.AWS_ACCOUNT_ID}/avnz-email-queue`;

    // Only start polling in production or if explicitly enabled
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_EMAIL_PROCESSOR === 'true') {
      this.startPolling();
      this.logger.log('Email queue processor started');
    } else {
      this.logger.log('Email queue processor disabled (not production)');
    }
  }

  onModuleDestroy() {
    this.stopPolling();
  }

  private startPolling() {
    this.shouldStop = false;
    this.pollInterval = setInterval(() => this.pollQueue(), POLL_INTERVAL_MS);
  }

  private stopPolling() {
    this.shouldStop = true;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.logger.log('Email queue processor stopped');
  }

  private async pollQueue() {
    if (this.isProcessing || this.shouldStop) {
      return;
    }

    this.isProcessing = true;

    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: MAX_MESSAGES_PER_POLL,
        WaitTimeSeconds: 20, // Long polling
        VisibilityTimeout: VISIBILITY_TIMEOUT_SECONDS,
        MessageAttributeNames: ['All'],
      });

      const response = await this.sqsClient.send(command);
      const messages = response.Messages || [];

      if (messages.length > 0) {
        this.logger.debug(`Processing ${messages.length} email(s) from queue`);
      }

      // Process messages concurrently with a limit
      await Promise.all(
        messages.map(async (message) => {
          try {
            const body = JSON.parse(message.Body || '{}') as EmailQueueMessage;
            await this.processMessage(body, message.ReceiptHandle!);
          } catch (error) {
            this.logger.error(`Failed to process message: ${error}`);
          }
        }),
      );
    } catch (error) {
      this.logger.error(`Queue polling error: ${error}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processMessage(message: EmailQueueMessage, receiptHandle: string) {
    const {
      id,
      to,
      toName,
      subject,
      htmlBody,
      textBody,
      fromEmail,
      fromName,
      replyTo,
      templateCode,
      category,
      organizationId,
      clientId,
      companyId,
      retryCount,
    } = message;

    try {
      // Update status to SENDING
      await this.prisma.emailSendLog.update({
        where: { id },
        data: { status: EmailSendStatus.SENDING },
      });

      // Build SES email request
      const fromAddress = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
      const unsubscribeEmail = `unsubscribe@avnz.io?subject=Unsubscribe&body=Unsubscribe%20${encodeURIComponent(to)}`;
      const unsubscribeUrl = `https://avnz.io/unsubscribe?email=${encodeURIComponent(to)}&token=${id}`;

      const params: SendEmailCommandInput = {
        FromEmailAddress: fromAddress,
        Destination: {
          ToAddresses: [to],
        },
        Content: {
          Simple: {
            Subject: {
              Charset: 'UTF-8',
              Data: subject,
            },
            Body: {
              Html: {
                Charset: 'UTF-8',
                Data: htmlBody,
              },
              ...(textBody && {
                Text: {
                  Charset: 'UTF-8',
                  Data: textBody,
                },
              }),
            },
            Headers: [
              {
                Name: 'List-Unsubscribe',
                Value: `<mailto:${unsubscribeEmail}>, <${unsubscribeUrl}>`,
              },
              {
                Name: 'List-Unsubscribe-Post',
                Value: 'List-Unsubscribe=One-Click',
              },
              {
                Name: 'Precedence',
                Value: 'bulk',
              },
            ],
          },
        },
        ReplyToAddresses: replyTo ? [replyTo] : [DEFAULT_REPLY_TO],
        ConfigurationSetName: SES_CONFIGURATION_SET,
        EmailTags: [
          { Name: 'environment', Value: process.env.NODE_ENV || 'development' },
          { Name: 'category', Value: category || 'transactional' },
          { Name: 'templateCode', Value: templateCode || 'raw' },
          { Name: 'logId', Value: id },
        ],
      };

      // Send via SES
      const sesCommand = new SendEmailCommand(params);
      const response = await this.sesClient.send(sesCommand);

      // Update success in database
      await this.prisma.emailSendLog.update({
        where: { id },
        data: {
          status: EmailSendStatus.SENT,
          messageId: response.MessageId,
          sentAt: new Date(),
        },
      });

      // Delete message from queue
      await this.sqsClient.send(new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      }));

      // Audit log: Email sent
      await this.auditLogsService.log(
        AuditAction.EMAIL_SENT,
        'email',
        id,
        {
          metadata: {
            to,
            subject,
            templateCode,
            messageId: response.MessageId,
            organizationId,
            clientId,
            companyId,
          },
          dataClassification: DataClassification.PII,
        },
      );

      this.logger.log(`Email sent: ${id} to ${to} (MessageId: ${response.MessageId})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email ${id} to ${to}: ${errorMessage}`);

      // Check if we should retry
      if (retryCount < MAX_RETRY_COUNT) {
        // Update retry count and extend visibility timeout
        await this.prisma.emailSendLog.update({
          where: { id },
          data: {
            retryCount: { increment: 1 },
            lastRetryAt: new Date(),
            errorMessage,
          },
        });

        // Extend visibility timeout for retry (exponential backoff)
        const backoffSeconds = Math.min(300, 30 * Math.pow(2, retryCount));
        await this.sqsClient.send(new ChangeMessageVisibilityCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: receiptHandle,
          VisibilityTimeout: backoffSeconds,
        }));

        // Audit log: Email retry
        await this.auditLogsService.log(
          AuditAction.EMAIL_RETRY,
          'email',
          id,
          {
            metadata: {
              to,
              subject,
              templateCode,
              retryCount: retryCount + 1,
              error: errorMessage,
              nextRetryIn: `${backoffSeconds}s`,
              organizationId,
              clientId,
              companyId,
            },
            dataClassification: DataClassification.PII,
          },
        );

        this.logger.warn(`Email ${id} will be retried in ${backoffSeconds}s (attempt ${retryCount + 1})`);
      } else {
        // Max retries exceeded - mark as failed and delete from queue
        await this.prisma.emailSendLog.update({
          where: { id },
          data: {
            status: EmailSendStatus.FAILED,
            errorMessage,
          },
        });

        await this.sqsClient.send(new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: receiptHandle,
        }));

        // Audit log: Email failed
        await this.auditLogsService.log(
          AuditAction.EMAIL_FAILED,
          'email',
          id,
          {
            metadata: {
              to,
              subject,
              templateCode,
              error: errorMessage,
              retryCount,
              organizationId,
              clientId,
              companyId,
            },
            dataClassification: DataClassification.PII,
          },
        );

        this.logger.error(`Email ${id} failed permanently after ${retryCount} retries`);
      }
    }
  }

  /**
   * Manually trigger processing (for testing/debugging)
   */
  async processNow(): Promise<number> {
    if (this.isProcessing) {
      return 0;
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: MAX_MESSAGES_PER_POLL,
        WaitTimeSeconds: 0,
        VisibilityTimeout: VISIBILITY_TIMEOUT_SECONDS,
        MessageAttributeNames: ['All'],
      });

      const response = await this.sqsClient.send(command);
      const messages = response.Messages || [];

      for (const message of messages) {
        try {
          const body = JSON.parse(message.Body || '{}') as EmailQueueMessage;
          await this.processMessage(body, message.ReceiptHandle!);
          processedCount++;
        } catch (error) {
          this.logger.error(`Failed to process message: ${error}`);
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }
}
