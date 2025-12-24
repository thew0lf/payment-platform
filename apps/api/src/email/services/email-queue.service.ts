// Email Queue Service - SQS-based email queuing for production reliability
// Decouples email sending from request processing for better performance and reliability
import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import {
  SQSClient,
  SendMessageCommand,
  GetQueueAttributesCommand,
  PurgeQueueCommand,
} from '@aws-sdk/client-sqs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AuditAction } from '../../audit-logs/types/audit-log.types';
import { SendEmailOptions, EmailSendResult } from '../types/email.types';
import { EmailTemplateCategory, EmailSendStatus, DataClassification } from '@prisma/client';
import { PlatformIntegrationService } from '../../integrations/services/platform-integration.service';
import { IntegrationProvider } from '../../integrations/types/integration.types';

// AWS SES Integration credentials structure
interface AWSSESCredentials {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  fromEmail: string;
  sqsQueueUrl?: string;
}

// Queue message structure
export interface EmailQueueMessage {
  id: string; // EmailSendLog ID for tracking
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  templateCode?: string;
  templateId?: string;
  category: EmailTemplateCategory;
  variables?: Record<string, unknown>;
  organizationId?: string;
  clientId?: string;
  companyId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  retryCount: number;
  queuedAt: string;
}

export interface QueueStats {
  approximateMessages: number;
  approximateMessagesNotVisible: number;
  approximateMessagesDelayed: number;
  queueArn: string;
  createdTimestamp: string;
  lastModifiedTimestamp: string;
}

export interface QueueStatusReport {
  queueUrl: string;
  stats: QueueStats;
  // Database stats
  dbStats: {
    queued: number;
    sending: number;
    sent: number;
    failed: number;
    last24Hours: {
      total: number;
      sent: number;
      failed: number;
    };
  };
  healthStatus: 'healthy' | 'degraded' | 'critical';
  lastChecked: string;
}

@Injectable()
export class EmailQueueService implements OnModuleInit {
  private readonly logger = new Logger(EmailQueueService.name);
  private sqsClient: SQSClient | null = null;
  private queueUrl: string = '';
  private isQueueConfigured: boolean = false;
  private credentials: AWSSESCredentials | null = null;
  private configurationError: string = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    @Inject(forwardRef(() => PlatformIntegrationService))
    private readonly platformIntegrationService: PlatformIntegrationService,
  ) {}

  async onModuleInit() {
    await this.loadCredentialsFromIntegration();
  }

  /**
   * Load AWS SES/SQS credentials from Platform Integration
   * Falls back to environment variables if no integration is configured
   */
  private async loadCredentialsFromIntegration(): Promise<void> {
    try {
      // Get the default organization
      const organizationId = await this.platformIntegrationService.getDefaultOrganizationId();

      if (!organizationId) {
        this.configurationError = 'No organization found. Please set up your organization first.';
        this.logger.warn('Email queue: No organization found');
        return;
      }

      // Try to get AWS SES integration credentials
      const integration = await this.platformIntegrationService.getCredentialsByProvider<AWSSESCredentials>(
        organizationId,
        IntegrationProvider.AWS_SES,
      );

      if (integration?.credentials) {
        this.credentials = integration.credentials;

        // Initialize SQS client with integration credentials
        this.sqsClient = new SQSClient({
          region: this.credentials.region || 'us-east-1',
          credentials: {
            accessKeyId: this.credentials.accessKeyId,
            secretAccessKey: this.credentials.secretAccessKey,
          },
        });

        // Get queue URL from integration or environment
        this.queueUrl = this.credentials.sqsQueueUrl || process.env.EMAIL_QUEUE_URL || '';

        // Validate queue URL
        this.isQueueConfigured = this.isValidQueueUrl(this.queueUrl);

        if (this.isQueueConfigured) {
          this.logger.log(`Email queue initialized from AWS SES integration: ${this.queueUrl}`);
        } else {
          this.configurationError = 'AWS SES integration found but SQS Queue URL is not configured. Please add the SQS Queue URL in your AWS SES integration settings, or set EMAIL_QUEUE_URL environment variable.';
          this.logger.warn('Email queue: SQS Queue URL not configured in integration');
        }
      } else {
        // Fallback to environment variables
        const region = process.env.AWS_REGION || 'us-east-1';
        this.queueUrl = process.env.EMAIL_QUEUE_URL ||
          (process.env.AWS_ACCOUNT_ID
            ? `https://sqs.${region}.amazonaws.com/${process.env.AWS_ACCOUNT_ID}/avnz-email-queue`
            : '');

        if (this.queueUrl) {
          this.sqsClient = new SQSClient({ region });
          this.isQueueConfigured = this.isValidQueueUrl(this.queueUrl);
        }

        if (!this.isQueueConfigured) {
          this.configurationError = 'Email service is not configured. Please configure AWS SES in Platform Integrations, or set EMAIL_QUEUE_URL and AWS credentials as environment variables.';
          this.logger.warn('Email queue: No AWS SES integration and no environment variables configured');
        }
      }
    } catch (error) {
      this.configurationError = 'Failed to load email configuration. Please check your AWS SES integration settings.';
      this.logger.error(`Failed to load email integration credentials: ${error}`);
    }
  }

  /**
   * Get the loaded AWS credentials (for use by the processor)
   */
  getCredentials(): AWSSESCredentials | null {
    return this.credentials;
  }

  /**
   * Check if the queue URL is valid
   */
  private isValidQueueUrl(url: string): boolean {
    if (!url) return false;
    // Must be a complete SQS URL with account ID
    const sqsUrlRegex = /^https:\/\/sqs\.[a-z0-9-]+\.amazonaws\.com\/\d{12}\/[a-zA-Z0-9_-]+$/;
    return sqsUrlRegex.test(url);
  }

  /**
   * Check if the email queue is properly configured
   */
  isConfigured(): boolean {
    return this.isQueueConfigured;
  }

  /**
   * Get configuration error message
   */
  getConfigurationError(): string {
    if (this.isQueueConfigured) return '';
    return this.configurationError || 'Email service is not configured. Please configure AWS SES in Platform Integrations.';
  }

  /**
   * Queue an email for sending
   * Creates a send log record and pushes to SQS
   */
  async queueEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    // Check if queue is properly configured before attempting to send
    if (!this.isQueueConfigured) {
      this.logger.warn(`Email queue not configured. Cannot send email to ${options.to}`);
      return {
        success: false,
        error: this.getConfigurationError(),
      };
    }

    const {
      to,
      toName,
      subject,
      htmlBody,
      textBody,
      fromEmail,
      fromName,
      replyTo,
      templateCode,
      templateId,
      category,
      variables,
      organizationId,
      clientId,
      companyId,
      relatedEntityType,
      relatedEntityId,
      ipAddress,
      userAgent,
    } = options;

    try {
      // Create send log entry with QUEUED status
      const sendLog = await this.prisma.emailSendLog.create({
        data: {
          templateId,
          templateCode,
          organizationId,
          clientId,
          companyId,
          toEmail: to,
          toName,
          fromEmail: fromEmail || 'noreply@avnz.io',
          fromName: fromName || 'AVNZ Platform',
          replyTo,
          subject,
          category,
          variablesUsed: variables ? JSON.parse(JSON.stringify(variables)) : null,
          provider: 'ses',
          status: EmailSendStatus.QUEUED,
          relatedEntityType,
          relatedEntityId,
          ipAddress,
          userAgent,
        },
      });

      // Build queue message
      const message: EmailQueueMessage = {
        id: sendLog.id,
        to,
        toName,
        subject,
        htmlBody,
        textBody,
        fromEmail: fromEmail || 'noreply@avnz.io',
        fromName: fromName || 'AVNZ Platform',
        replyTo,
        templateCode,
        templateId,
        category,
        variables,
        organizationId,
        clientId,
        companyId,
        relatedEntityType,
        relatedEntityId,
        retryCount: 0,
        queuedAt: new Date().toISOString(),
      };

      // Send to SQS
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          category: {
            DataType: 'String',
            StringValue: category,
          },
          templateCode: {
            DataType: 'String',
            StringValue: templateCode || 'raw',
          },
          priority: {
            DataType: 'String',
            StringValue: this.getPriority(category),
          },
        },
        // Add deduplication for FIFO queues (if using FIFO)
        // MessageGroupId: companyId || clientId || 'default',
        // MessageDeduplicationId: sendLog.id,
      });

      await this.sqsClient!.send(command);

      // Audit log: Email queued
      await this.auditLogsService.log(
        AuditAction.EMAIL_QUEUED,
        'email',
        sendLog.id,
        {
          metadata: {
            to,
            subject,
            templateCode,
            category,
            organizationId,
            clientId,
            companyId,
          },
          dataClassification: DataClassification.PII, // Email addresses are PII
          ipAddress,
          userAgent,
        },
      );

      this.logger.log(`Email queued successfully: ${sendLog.id} to ${to}`);

      return {
        success: true,
        logId: sendLog.id,
      };
    } catch (error) {
      this.logger.error(`Failed to queue email to ${to}: ${error}`);

      // Audit log: Queue failure
      await this.auditLogsService.log(
        AuditAction.EMAIL_QUEUE_FAILED,
        'email',
        undefined,
        {
          metadata: {
            to,
            subject,
            templateCode,
            organizationId,
            clientId,
            companyId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          dataClassification: DataClassification.PII,
          ipAddress,
          userAgent,
        },
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to queue email',
      };
    }
  }

  /**
   * Get queue status and statistics
   */
  async getQueueStatus(): Promise<QueueStatusReport> {
    // Check if queue is configured
    if (!this.isQueueConfigured) {
      throw new Error(this.getConfigurationError());
    }

    try {
      // Get SQS queue attributes
      const command = new GetQueueAttributesCommand({
        QueueUrl: this.queueUrl,
        AttributeNames: [
          'ApproximateNumberOfMessages',
          'ApproximateNumberOfMessagesNotVisible',
          'ApproximateNumberOfMessagesDelayed',
          'QueueArn',
          'CreatedTimestamp',
          'LastModifiedTimestamp',
        ],
      });

      const response = await this.sqsClient!.send(command);
      const attrs = response.Attributes || {};

      // Get database stats
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [statusCounts, last24HoursSent, last24HoursFailed] = await Promise.all([
        this.prisma.emailSendLog.groupBy({
          by: ['status'],
          _count: true,
        }),
        this.prisma.emailSendLog.count({
          where: {
            status: EmailSendStatus.SENT,
            sentAt: { gte: oneDayAgo },
          },
        }),
        this.prisma.emailSendLog.count({
          where: {
            status: EmailSendStatus.FAILED,
            createdAt: { gte: oneDayAgo },
          },
        }),
      ]);

      // Status counts for direct fields
      const statusCountMap: Record<string, number> = {
        queued: 0,
        sending: 0,
        sent: 0,
        failed: 0,
      };

      for (const item of statusCounts) {
        const status = item.status.toLowerCase();
        if (status in statusCountMap) {
          statusCountMap[status] = item._count;
        }
      }

      const dbStats = {
        queued: statusCountMap.queued,
        sending: statusCountMap.sending,
        sent: statusCountMap.sent,
        failed: statusCountMap.failed,
        last24Hours: {
          total: last24HoursSent + last24HoursFailed,
          sent: last24HoursSent,
          failed: last24HoursFailed,
        },
      };

      const sqsMessages = parseInt(attrs.ApproximateNumberOfMessages || '0', 10);
      const failureRate = dbStats.last24Hours.total > 0
        ? dbStats.last24Hours.failed / dbStats.last24Hours.total
        : 0;

      // Determine health status
      let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (sqsMessages > 1000 || failureRate > 0.1) {
        healthStatus = 'degraded';
      }
      if (sqsMessages > 10000 || failureRate > 0.25) {
        healthStatus = 'critical';
      }

      return {
        queueUrl: this.queueUrl,
        stats: {
          approximateMessages: sqsMessages,
          approximateMessagesNotVisible: parseInt(attrs.ApproximateNumberOfMessagesNotVisible || '0', 10),
          approximateMessagesDelayed: parseInt(attrs.ApproximateNumberOfMessagesDelayed || '0', 10),
          queueArn: attrs.QueueArn || '',
          createdTimestamp: attrs.CreatedTimestamp || '',
          lastModifiedTimestamp: attrs.LastModifiedTimestamp || '',
        },
        dbStats,
        healthStatus,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get queue status: ${error}`);
      throw error;
    }
  }

  /**
   * Purge the queue (admin only, for emergencies)
   */
  async purgeQueue(): Promise<void> {
    // Check if queue is configured
    if (!this.isQueueConfigured) {
      throw new Error(this.getConfigurationError());
    }

    const command = new PurgeQueueCommand({
      QueueUrl: this.queueUrl,
    });

    await this.sqsClient!.send(command);

    // Audit log
    await this.auditLogsService.log(
      AuditAction.EMAIL_QUEUE_PURGED,
      'email_queue',
      undefined,
      {
        metadata: {
          queueUrl: this.queueUrl,
        },
        dataClassification: DataClassification.INTERNAL,
      },
    );

    this.logger.warn('Email queue purged');
  }

  /**
   * Get priority based on email category
   */
  private getPriority(category: EmailTemplateCategory): string {
    // High priority for authentication and transactional emails
    const highPriority: EmailTemplateCategory[] = [
      EmailTemplateCategory.AUTHENTICATION,
      EmailTemplateCategory.TRANSACTIONAL,
    ];

    if (highPriority.includes(category)) {
      return 'high';
    }

    return 'normal';
  }
}
