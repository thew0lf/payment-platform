/**
 * Affiliate Application Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AffiliateApplicationService } from './affiliate-application.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/services/email.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreateAffiliateApplicationDto } from '../dto/affiliate-application.dto';

describe('AffiliateApplicationService', () => {
  let service: AffiliateApplicationService;
  let prisma: PrismaService;
  let emailService: EmailService;
  let auditLogService: AuditLogsService;

  const mockCompanyWithProgram = {
    id: 'company-123',
    name: 'Test Company',
    code: 'TEST',
    logo: null,
    clientId: 'client-123',
    affiliateProgramConfig: {
      isEnabled: true,
      programName: 'Test Affiliate Program',
      programDescription: 'Earn commission on sales',
      defaultCommissionRate: 20,
      defaultCookieDurationDays: 30,
      minimumPayoutThreshold: 50,
      termsUrl: 'https://example.com/terms',
      privacyUrl: 'https://example.com/privacy',
    },
  };

  const mockCompanyWithoutProgram = {
    id: 'company-456',
    name: 'Other Company',
    code: 'OTHE',
    logo: null,
    clientId: 'client-456',
    affiliateProgramConfig: null,
  };

  const mockCompanyWithDisabledProgram = {
    id: 'company-789',
    name: 'Disabled Company',
    code: 'DISB',
    logo: null,
    clientId: 'client-789',
    affiliateProgramConfig: {
      isEnabled: false,
      programName: 'Disabled Program',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliateApplicationService,
        {
          provide: PrismaService,
          useValue: {
            company: {
              findFirst: jest.fn(),
            },
            affiliateApplication: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            affiliatePartner: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendTemplatedEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AuditLogsService,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AffiliateApplicationService>(AffiliateApplicationService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
    auditLogService = module.get<AuditLogsService>(AuditLogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProgramInfo', () => {
    it('should return program info for valid company code', async () => {
      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(mockCompanyWithProgram as any);

      const result = await service.getProgramInfo('TEST');

      expect(result).toEqual({
        companyName: 'Test Company',
        companyLogo: undefined,
        programName: 'Test Affiliate Program',
        programDescription: 'Earn commission on sales',
        defaultCommissionRate: 20,
        cookieDurationDays: 30,
        minimumPayoutThreshold: 50,
        termsUrl: 'https://example.com/terms',
        privacyUrl: 'https://example.com/privacy',
      });
    });

    it('should throw NotFoundException for non-existent company', async () => {
      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(null);

      await expect(service.getProgramInfo('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for company without affiliate program', async () => {
      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(mockCompanyWithoutProgram as any);

      await expect(service.getProgramInfo('OTHE')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for company with disabled program', async () => {
      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(mockCompanyWithDisabledProgram as any);

      await expect(service.getProgramInfo('DISB')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProgramInfoById', () => {
    it('should return program info for valid company ID', async () => {
      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(mockCompanyWithProgram as any);

      const result = await service.getProgramInfoById('company-123');

      expect(result.companyName).toBe('Test Company');
      expect(result.defaultCommissionRate).toBe(20);
    });
  });

  describe('submitApplication', () => {
    const validApplicationDto: CreateAffiliateApplicationDto = {
      companyId: 'company-123',
      email: 'affiliate@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      companyName: 'Affiliate Corp',
      website: 'https://affiliate.com',
      socialMedia: { twitter: 'https://twitter.com/affiliate' },
      howDidYouHear: 'google',
      promotionMethods: ['content_blog', 'social_media'],
      estimatedReach: '10k_50k',
      relevantExperience: 'I have 5 years of affiliate marketing experience',
      additionalNotes: 'Excited to partner with you!',
      agreedToTerms: true,
      agreedToPrivacy: true,
    };

    it('should create application successfully', async () => {
      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue({
        ...mockCompanyWithProgram,
        client: { id: 'client-123' },
      } as any);
      jest.spyOn(prisma.affiliateApplication, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.affiliatePartner, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.affiliateApplication, 'create').mockResolvedValue({
        id: 'app-123',
        ...validApplicationDto,
        status: 'PENDING_APPROVAL',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.submitApplication(validApplicationDto);

      expect(result.success).toBe(true);
      expect(result.applicationId).toBe('app-123');
      expect(result.message).toContain('successfully');
      expect(result.referenceNumber).toMatch(/^AFF-/);
      expect(result.estimatedReviewDays).toBe(3);

      // Verify email was sent
      expect(emailService.sendTemplatedEmail).toHaveBeenCalled();

      // Verify audit log was created
      expect(auditLogService.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-existent company', async () => {
      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue(null);

      await expect(service.submitApplication(validApplicationDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for disabled affiliate program', async () => {
      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue({
        ...mockCompanyWithDisabledProgram,
        client: { id: 'client-789' },
      } as any);

      await expect(service.submitApplication({
        ...validApplicationDto,
        companyId: 'company-789',
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for existing pending application', async () => {
      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue({
        ...mockCompanyWithProgram,
        client: { id: 'client-123' },
      } as any);
      jest.spyOn(prisma.affiliateApplication, 'findFirst').mockResolvedValue({
        id: 'existing-app',
        email: 'affiliate@example.com',
        status: 'PENDING_APPROVAL',
      } as any);

      await expect(service.submitApplication(validApplicationDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException for existing partner', async () => {
      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue({
        ...mockCompanyWithProgram,
        client: { id: 'client-123' },
      } as any);
      jest.spyOn(prisma.affiliateApplication, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.affiliatePartner, 'findFirst').mockResolvedValue({
        id: 'existing-partner',
        email: 'affiliate@example.com',
      } as any);

      await expect(service.submitApplication(validApplicationDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should normalize email to lowercase', async () => {
      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue({
        ...mockCompanyWithProgram,
        client: { id: 'client-123' },
      } as any);
      jest.spyOn(prisma.affiliateApplication, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.affiliatePartner, 'findFirst').mockResolvedValue(null);
      const createSpy = jest.spyOn(prisma.affiliateApplication, 'create').mockResolvedValue({
        id: 'app-123',
        status: 'PENDING_APPROVAL',
      } as any);

      await service.submitApplication({
        ...validApplicationDto,
        email: 'AFFILIATE@EXAMPLE.COM',
      });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'affiliate@example.com',
          }),
        }),
      );
    });

    it('should trim whitespace from names', async () => {
      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue({
        ...mockCompanyWithProgram,
        client: { id: 'client-123' },
      } as any);
      jest.spyOn(prisma.affiliateApplication, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.affiliatePartner, 'findFirst').mockResolvedValue(null);
      const createSpy = jest.spyOn(prisma.affiliateApplication, 'create').mockResolvedValue({
        id: 'app-123',
        status: 'PENDING_APPROVAL',
      } as any);

      await service.submitApplication({
        ...validApplicationDto,
        firstName: '  John  ',
        lastName: '  Doe  ',
      });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
          }),
        }),
      );
    });

    it('should continue even if email sending fails', async () => {
      jest.spyOn(prisma.company, 'findFirst').mockResolvedValue({
        ...mockCompanyWithProgram,
        client: { id: 'client-123' },
      } as any);
      jest.spyOn(prisma.affiliateApplication, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.affiliatePartner, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.affiliateApplication, 'create').mockResolvedValue({
        id: 'app-123',
        status: 'PENDING_APPROVAL',
      } as any);
      jest.spyOn(emailService, 'sendTemplatedEmail').mockRejectedValue(new Error('Email failed'));

      const result = await service.submitApplication(validApplicationDto);

      expect(result.success).toBe(true);
    });
  });

  describe('getApplicationStatus', () => {
    it('should return application status for existing application', async () => {
      jest.spyOn(prisma.affiliateApplication, 'findFirst').mockResolvedValue({
        id: 'app-123',
        email: 'affiliate@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: 'PENDING_APPROVAL',
        createdAt: new Date('2024-01-01'),
        website: 'https://affiliate.com',
      } as any);

      const result = await service.getApplicationStatus('company-123', 'affiliate@example.com');

      expect(result).toBeDefined();
      expect(result?.id).toBe('app-123');
      expect(result?.status).toBe('PENDING_APPROVAL');
    });

    it('should return null for non-existent application', async () => {
      jest.spyOn(prisma.affiliateApplication, 'findFirst').mockResolvedValue(null);

      const result = await service.getApplicationStatus('company-123', 'unknown@example.com');

      expect(result).toBeNull();
    });

    it('should search by lowercase email', async () => {
      const findSpy = jest.spyOn(prisma.affiliateApplication, 'findFirst').mockResolvedValue(null);

      await service.getApplicationStatus('company-123', 'TEST@EXAMPLE.COM');

      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: 'test@example.com',
          }),
        }),
      );
    });
  });
});
