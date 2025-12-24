/**
 * Email Queue Controller Unit Tests
 * SOC2/ISO27001 Compliance - API Endpoint Authorization Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { EmailQueueController } from './email-queue.controller';
import { EmailQueueService, QueueStatusReport } from '../services/email-queue.service';
import { EmailQueueProcessorService } from '../services/email-queue-processor.service';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';

describe('EmailQueueController', () => {
  let controller: EmailQueueController;
  let emailQueueService: EmailQueueService;
  let emailQueueProcessorService: EmailQueueProcessorService;

  const mockQueueStatusReport: QueueStatusReport = {
    queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue',
    stats: {
      approximateMessages: 10,
      approximateMessagesNotVisible: 5,
      approximateMessagesDelayed: 2,
      queueArn: 'arn:aws:sqs:us-east-1:123456789:test-queue',
      createdTimestamp: '1234567890',
      lastModifiedTimestamp: '1234567891',
    },
    dbStats: {
      queued: 10,
      sending: 5,
      sent: 100,
      failed: 3,
      last24Hours: {
        total: 108,
        sent: 100,
        failed: 8,
      },
    },
    healthStatus: 'healthy',
    lastChecked: new Date().toISOString(),
  };

  const mockEmailQueueService = {
    getQueueStatus: jest.fn().mockResolvedValue(mockQueueStatusReport),
    purgeQueue: jest.fn().mockResolvedValue(undefined),
  };

  const mockEmailQueueProcessorService = {
    processNow: jest.fn().mockResolvedValue(5),
  };

  const mockOrganizationUser: AuthenticatedUser = {
    sub: 'user-123',
    id: 'user-123',
    email: 'admin@avnz.io',
    role: 'admin',
    scopeType: 'ORGANIZATION',
    scopeId: 'org-123',
    organizationId: 'org-123',
  };

  const mockClientUser: AuthenticatedUser = {
    sub: 'user-456',
    id: 'user-456',
    email: 'client@example.com',
    role: 'admin',
    scopeType: 'CLIENT',
    scopeId: 'client-123',
    clientId: 'client-123',
  };

  const mockCompanyUser: AuthenticatedUser = {
    sub: 'user-789',
    id: 'user-789',
    email: 'company@example.com',
    role: 'admin',
    scopeType: 'COMPANY',
    scopeId: 'company-123',
    companyId: 'company-123',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailQueueController],
      providers: [
        { provide: EmailQueueService, useValue: mockEmailQueueService },
        { provide: EmailQueueProcessorService, useValue: mockEmailQueueProcessorService },
      ],
    }).compile();

    controller = module.get<EmailQueueController>(EmailQueueController);
    emailQueueService = module.get<EmailQueueService>(EmailQueueService);
    emailQueueProcessorService = module.get<EmailQueueProcessorService>(EmailQueueProcessorService);
  });

  describe('getQueueStatus', () => {
    it('should return queue status for organization admin', async () => {
      const result = await controller.getQueueStatus(mockOrganizationUser);

      expect(result).toEqual(mockQueueStatusReport);
      expect(mockEmailQueueService.getQueueStatus).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for client user', async () => {
      await expect(controller.getQueueStatus(mockClientUser)).rejects.toThrow(ForbiddenException);
      expect(mockEmailQueueService.getQueueStatus).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException for company user', async () => {
      await expect(controller.getQueueStatus(mockCompanyUser)).rejects.toThrow(ForbiddenException);
      expect(mockEmailQueueService.getQueueStatus).not.toHaveBeenCalled();
    });

    it('should include correct error message for unauthorized access', async () => {
      try {
        await controller.getQueueStatus(mockClientUser);
        fail('Expected ForbiddenException');
      } catch (error) {
        expect(error.message).toContain('Only organization admins');
      }
    });
  });

  describe('processNow', () => {
    it('should trigger manual processing for organization admin', async () => {
      const result = await controller.processNow(mockOrganizationUser);

      expect(result).toEqual({ processed: 5 });
      expect(mockEmailQueueProcessorService.processNow).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for client user', async () => {
      await expect(controller.processNow(mockClientUser)).rejects.toThrow(ForbiddenException);
      expect(mockEmailQueueProcessorService.processNow).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException for company user', async () => {
      await expect(controller.processNow(mockCompanyUser)).rejects.toThrow(ForbiddenException);
      expect(mockEmailQueueProcessorService.processNow).not.toHaveBeenCalled();
    });

    it('should return number of processed emails', async () => {
      mockEmailQueueProcessorService.processNow.mockResolvedValue(10);

      const result = await controller.processNow(mockOrganizationUser);

      expect(result.processed).toBe(10);
    });
  });

  describe('purgeQueue', () => {
    it('should purge queue for organization admin', async () => {
      const result = await controller.purgeQueue(mockOrganizationUser);

      expect(result.success).toBe(true);
      expect(result.message).toContain('purged');
      expect(mockEmailQueueService.purgeQueue).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for client user', async () => {
      await expect(controller.purgeQueue(mockClientUser)).rejects.toThrow(ForbiddenException);
      expect(mockEmailQueueService.purgeQueue).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException for company user', async () => {
      await expect(controller.purgeQueue(mockCompanyUser)).rejects.toThrow(ForbiddenException);
      expect(mockEmailQueueService.purgeQueue).not.toHaveBeenCalled();
    });

    it('should include informative message about purge action', async () => {
      const result = await controller.purgeQueue(mockOrganizationUser);

      expect(result.message).toContain('pending emails have been removed');
    });
  });

  describe('Authorization - Edge Cases', () => {
    it('should reject user with undefined scopeType', async () => {
      const userWithUndefinedScope = {
        ...mockOrganizationUser,
        scopeType: undefined as any,
      };

      await expect(controller.getQueueStatus(userWithUndefinedScope)).rejects.toThrow(ForbiddenException);
    });

    it('should reject user with empty string scopeType', async () => {
      const userWithEmptyScope = {
        ...mockOrganizationUser,
        scopeType: '' as any,
      };

      await expect(controller.getQueueStatus(userWithEmptyScope)).rejects.toThrow(ForbiddenException);
    });

    it('should be case-sensitive for scopeType check', async () => {
      const userWithLowercaseScope = {
        ...mockOrganizationUser,
        scopeType: 'organization' as any, // lowercase
      };

      await expect(controller.getQueueStatus(userWithLowercaseScope)).rejects.toThrow(ForbiddenException);
    });
  });
});
