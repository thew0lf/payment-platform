/**
 * Email Queue Service Unit Tests
 * SOC2/ISO27001 Compliance - Email Queue Management Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EmailQueueService } from './email-queue.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { EmailTemplateCategory, EmailSendStatus, DataClassification } from '@prisma/client';

// Mock AWS SQS Client
jest.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
  SendMessageCommand: jest.fn().mockImplementation((params) => params),
  GetQueueAttributesCommand: jest.fn().mockImplementation((params) => params),
  PurgeQueueCommand: jest.fn().mockImplementation((params) => params),
}));

describe('EmailQueueService', () => {
  let service: EmailQueueService;
  let prismaService: PrismaService;
  let auditLogsService: AuditLogsService;
  let mockSqsSend: jest.Mock;

  const mockPrismaService = {
    emailSendLog: {
      create: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockAuditLogsService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.AWS_REGION = 'us-east-1';
    process.env.EMAIL_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789/test-email-queue';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailQueueService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    service = module.get<EmailQueueService>(EmailQueueService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditLogsService = module.get<AuditLogsService>(AuditLogsService);

    // Initialize the service (which sets up SQS client)
    await service.onModuleInit();

    // Get reference to the mock send function
    mockSqsSend = (service as any).sqsClient.send;
    mockSqsSend.mockResolvedValue({});
  });

  describe('onModuleInit', () => {
    it('should initialize SQS client with correct region', async () => {
      expect((service as any).sqsClient).toBeDefined();
    });

    it('should use EMAIL_QUEUE_URL from environment', async () => {
      expect((service as any).queueUrl).toBe('https://sqs.us-east-1.amazonaws.com/123456789/test-email-queue');
    });
  });

  describe('queueEmail', () => {
    const mockEmailOptions = {
      to: 'test@example.com',
      toName: 'Test User',
      subject: 'Test Subject',
      htmlBody: '<p>Test body</p>',
      textBody: 'Test body',
      category: EmailTemplateCategory.TRANSACTIONAL,
      templateCode: 'test-template',
    };

    beforeEach(() => {
      mockPrismaService.emailSendLog.create.mockResolvedValue({
        id: 'log-123',
        toEmail: mockEmailOptions.to,
        status: EmailSendStatus.QUEUED,
      });
    });

    it('should create email send log with QUEUED status', async () => {
      const result = await service.queueEmail(mockEmailOptions);

      expect(mockPrismaService.emailSendLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          toEmail: mockEmailOptions.to,
          subject: mockEmailOptions.subject,
          status: EmailSendStatus.QUEUED,
          category: EmailTemplateCategory.TRANSACTIONAL,
        }),
      });
      expect(result.success).toBe(true);
      expect(result.logId).toBe('log-123');
    });

    it('should send message to SQS queue', async () => {
      await service.queueEmail(mockEmailOptions);

      expect(mockSqsSend).toHaveBeenCalled();
    });

    it('should include message attributes with category and priority', async () => {
      await service.queueEmail(mockEmailOptions);

      // Check that SendMessageCommand was called with correct attributes
      const { SendMessageCommand } = require('@aws-sdk/client-sqs');
      expect(SendMessageCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          MessageAttributes: expect.objectContaining({
            category: expect.objectContaining({
              StringValue: EmailTemplateCategory.TRANSACTIONAL,
            }),
            priority: expect.objectContaining({
              StringValue: 'high', // TRANSACTIONAL is high priority
            }),
          }),
        }),
      );
    });

    it('should create audit log for queued email', async () => {
      await service.queueEmail(mockEmailOptions);

      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        'EMAIL_QUEUED',
        'email',
        'log-123',
        expect.objectContaining({
          dataClassification: DataClassification.PII,
        }),
      );
    });

    it('should return error on SQS failure', async () => {
      mockSqsSend.mockRejectedValue(new Error('SQS connection failed'));

      const result = await service.queueEmail(mockEmailOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('SQS connection failed');
    });

    it('should create audit log for queue failure', async () => {
      mockSqsSend.mockRejectedValue(new Error('SQS connection failed'));

      await service.queueEmail(mockEmailOptions);

      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        'EMAIL_QUEUE_FAILED',
        'email',
        undefined,
        expect.objectContaining({
          metadata: expect.objectContaining({
            error: 'SQS connection failed',
          }),
        }),
      );
    });

    it('should set default fromEmail and fromName if not provided', async () => {
      await service.queueEmail({
        ...mockEmailOptions,
        fromEmail: undefined,
        fromName: undefined,
      });

      expect(mockPrismaService.emailSendLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fromEmail: 'noreply@avnz.io',
          fromName: 'AVNZ Platform',
        }),
      });
    });

    it('should include organization, client, and company IDs in message', async () => {
      const optionsWithIds = {
        ...mockEmailOptions,
        organizationId: 'org-123',
        clientId: 'client-123',
        companyId: 'company-123',
      };

      await service.queueEmail(optionsWithIds);

      expect(mockPrismaService.emailSendLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-123',
          clientId: 'client-123',
          companyId: 'company-123',
        }),
      });
    });
  });

  describe('getQueueStatus', () => {
    beforeEach(() => {
      mockSqsSend.mockResolvedValue({
        Attributes: {
          ApproximateNumberOfMessages: '10',
          ApproximateNumberOfMessagesNotVisible: '5',
          ApproximateNumberOfMessagesDelayed: '2',
          QueueArn: 'arn:aws:sqs:us-east-1:123456789:test-queue',
          CreatedTimestamp: '1234567890',
          LastModifiedTimestamp: '1234567891',
        },
      });

      mockPrismaService.emailSendLog.groupBy.mockResolvedValue([
        { status: 'QUEUED', _count: 10 },
        { status: 'SENT', _count: 100 },
        { status: 'FAILED', _count: 5 },
      ]);
      // Mock count to return 100 for sent (first call) and 5 for failed (second call)
      // This gives a 5% failure rate (healthy)
      mockPrismaService.emailSendLog.count
        .mockResolvedValueOnce(100)  // last24HoursSent
        .mockResolvedValueOnce(5);   // last24HoursFailed
    });

    it('should return queue status with SQS attributes', async () => {
      const status = await service.getQueueStatus();

      expect(status.stats.approximateMessages).toBe(10);
      expect(status.stats.approximateMessagesNotVisible).toBe(5);
      expect(status.stats.approximateMessagesDelayed).toBe(2);
      expect(status.stats.queueArn).toBe('arn:aws:sqs:us-east-1:123456789:test-queue');
    });

    it('should return database statistics', async () => {
      const status = await service.getQueueStatus();

      expect(status.dbStats.queued).toBe(10);
      expect(status.dbStats.sent).toBe(100);
      expect(status.dbStats.failed).toBe(5);
    });

    it('should calculate health status as healthy when queue is small', async () => {
      const status = await service.getQueueStatus();

      expect(status.healthStatus).toBe('healthy');
    });

    it('should calculate health status as degraded when queue is large', async () => {
      mockSqsSend.mockResolvedValue({
        Attributes: {
          ApproximateNumberOfMessages: '1500',
        },
      });
      // Reset count mocks for this test (low failure rate)
      mockPrismaService.emailSendLog.count
        .mockResolvedValueOnce(100)  // last24HoursSent
        .mockResolvedValueOnce(5);   // last24HoursFailed

      const status = await service.getQueueStatus();

      expect(status.healthStatus).toBe('degraded');
    });

    it('should calculate health status as critical when queue is very large', async () => {
      mockSqsSend.mockResolvedValue({
        Attributes: {
          ApproximateNumberOfMessages: '15000',
        },
      });
      // Reset count mocks for this test
      mockPrismaService.emailSendLog.count
        .mockResolvedValueOnce(100)  // last24HoursSent
        .mockResolvedValueOnce(5);   // last24HoursFailed

      const status = await service.getQueueStatus();

      expect(status.healthStatus).toBe('critical');
    });

    it('should calculate health status as degraded when failure rate > 10%', async () => {
      // Reset count mock and set high failure rate values
      mockPrismaService.emailSendLog.count.mockReset();
      mockPrismaService.emailSendLog.count
        .mockResolvedValueOnce(9)  // last24HoursSent
        .mockResolvedValueOnce(2); // last24HoursFailed (2/11 = 18% failure rate)

      const status = await service.getQueueStatus();

      expect(status.healthStatus).toBe('degraded');
    });

    it('should include lastChecked timestamp', async () => {
      // Reset count mocks for this test
      mockPrismaService.emailSendLog.count.mockReset();
      mockPrismaService.emailSendLog.count
        .mockResolvedValueOnce(100)  // last24HoursSent
        .mockResolvedValueOnce(5);   // last24HoursFailed

      const beforeTime = new Date().toISOString();
      const status = await service.getQueueStatus();
      const afterTime = new Date().toISOString();

      expect(status.lastChecked >= beforeTime).toBe(true);
      expect(status.lastChecked <= afterTime).toBe(true);
    });
  });

  describe('purgeQueue', () => {
    it('should send purge command to SQS', async () => {
      await service.purgeQueue();

      expect(mockSqsSend).toHaveBeenCalled();
    });

    it('should create audit log for queue purge', async () => {
      await service.purgeQueue();

      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        'EMAIL_QUEUE_PURGED',
        'email_queue',
        undefined,
        expect.objectContaining({
          dataClassification: DataClassification.INTERNAL,
        }),
      );
    });
  });

  describe('getPriority', () => {
    it('should return high priority for AUTHENTICATION emails', async () => {
      mockPrismaService.emailSendLog.create.mockResolvedValue({ id: 'log-1' });

      await service.queueEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
        category: EmailTemplateCategory.AUTHENTICATION,
      });

      const { SendMessageCommand } = require('@aws-sdk/client-sqs');
      expect(SendMessageCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          MessageAttributes: expect.objectContaining({
            priority: expect.objectContaining({
              StringValue: 'high',
            }),
          }),
        }),
      );
    });

    it('should return high priority for TRANSACTIONAL emails', async () => {
      mockPrismaService.emailSendLog.create.mockResolvedValue({ id: 'log-1' });

      await service.queueEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
        category: EmailTemplateCategory.TRANSACTIONAL,
      });

      const { SendMessageCommand } = require('@aws-sdk/client-sqs');
      expect(SendMessageCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          MessageAttributes: expect.objectContaining({
            priority: expect.objectContaining({
              StringValue: 'high',
            }),
          }),
        }),
      );
    });

    it('should return normal priority for MARKETING emails', async () => {
      mockPrismaService.emailSendLog.create.mockResolvedValue({ id: 'log-1' });

      await service.queueEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
        category: EmailTemplateCategory.MARKETING,
      });

      const { SendMessageCommand } = require('@aws-sdk/client-sqs');
      expect(SendMessageCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          MessageAttributes: expect.objectContaining({
            priority: expect.objectContaining({
              StringValue: 'normal',
            }),
          }),
        }),
      );
    });
  });
});
