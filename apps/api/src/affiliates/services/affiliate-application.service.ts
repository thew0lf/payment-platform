/**
 * Affiliate Application Service
 *
 * Handles the affiliate application/registration process.
 * Creates applications, sends notifications, and manages application status.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/services/email.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AuditAction, AuditEntity } from '../../audit-logs/types/audit-log.types';
import { DataClassification } from '@prisma/client';
import {
  AffiliateApplicationResult,
  AffiliateApplicationSummary,
  AffiliateProgramPublicInfo,
} from '../types/affiliate-application.types';
import { CreateAffiliateApplicationDto } from '../dto/affiliate-application.dto';

@Injectable()
export class AffiliateApplicationService {
  private readonly logger = new Logger(AffiliateApplicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Get public program information for a company
   */
  async getProgramInfo(companyCode: string): Promise<AffiliateProgramPublicInfo> {
    const company = await this.prisma.company.findFirst({
      where: {
        code: companyCode,
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        affiliateProgramConfig: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const config = company.affiliateProgramConfig;

    if (!config || !config.isEnabled) {
      throw new NotFoundException('Affiliate program not available');
    }

    return {
      companyName: company.name,
      companyLogo: company.logo || undefined,
      programName: config.programName,
      programDescription: config.programDescription || undefined,
      defaultCommissionRate: config.defaultCommissionRate,
      cookieDurationDays: config.defaultCookieDurationDays,
      minimumPayoutThreshold: config.minimumPayoutThreshold,
      termsUrl: config.termsUrl || undefined,
      privacyUrl: config.privacyUrl || undefined,
    };
  }

  /**
   * Get public program information by company ID
   */
  async getProgramInfoById(companyId: string): Promise<AffiliateProgramPublicInfo> {
    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        affiliateProgramConfig: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const config = company.affiliateProgramConfig;

    if (!config || !config.isEnabled) {
      throw new NotFoundException('Affiliate program not available');
    }

    return {
      companyName: company.name,
      companyLogo: company.logo || undefined,
      programName: config.programName,
      programDescription: config.programDescription || undefined,
      defaultCommissionRate: config.defaultCommissionRate,
      cookieDurationDays: config.defaultCookieDurationDays,
      minimumPayoutThreshold: config.minimumPayoutThreshold,
      termsUrl: config.termsUrl || undefined,
      privacyUrl: config.privacyUrl || undefined,
    };
  }

  /**
   * Submit a new affiliate application
   */
  async submitApplication(
    dto: CreateAffiliateApplicationDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AffiliateApplicationResult> {
    const { companyId, ...applicationData } = dto;

    // Verify company exists and has affiliate program enabled
    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        affiliateProgramConfig: true,
        client: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (!company.affiliateProgramConfig?.isEnabled) {
      throw new BadRequestException('Affiliate program is not available for this company');
    }

    // Check for existing application or partner with same email
    const existingApplication = await this.prisma.affiliateApplication.findFirst({
      where: {
        companyId,
        email: applicationData.email.toLowerCase(),
        status: { in: ['PENDING_APPROVAL', 'ACTIVE'] },
      },
    });

    if (existingApplication) {
      throw new ConflictException(
        'An application with this email address already exists for this program',
      );
    }

    const existingPartner = await this.prisma.affiliatePartner.findFirst({
      where: {
        companyId,
        email: applicationData.email.toLowerCase(),
        deletedAt: null,
      },
    });

    if (existingPartner) {
      throw new ConflictException(
        'You are already a partner in this affiliate program',
      );
    }

    // Generate a reference number
    const referenceNumber = this.generateReferenceNumber();

    // Create the application
    const application = await this.prisma.affiliateApplication.create({
      data: {
        companyId,
        email: applicationData.email.toLowerCase(),
        firstName: applicationData.firstName.trim(),
        lastName: applicationData.lastName.trim(),
        phone: applicationData.phone?.trim() || null,
        website: applicationData.website?.trim() || null,
        socialMedia: applicationData.socialMedia ? JSON.parse(JSON.stringify(applicationData.socialMedia)) : null,
        howDidYouHear: applicationData.howDidYouHear || null,
        promotionMethods: applicationData.promotionMethods,
        estimatedReach: applicationData.estimatedReach || null,
        relevantExperience: applicationData.relevantExperience?.trim() || null,
        additionalNotes: applicationData.additionalNotes?.trim() || null,
        status: 'PENDING_APPROVAL',
      },
    });

    // Log the application submission
    await this.auditLogsService.log(
      AuditAction.CREATE,
      AuditEntity.AFFILIATE_APPLICATION,
      application.id,
      {
        dataClassification: DataClassification.PII,
        metadata: {
          referenceNumber,
          companyId,
          ipAddress,
          userAgent,
          email: applicationData.email,
        },
      },
    );

    // Send confirmation email to applicant
    await this.sendApplicationConfirmationEmail(
      applicationData.email,
      applicationData.firstName,
      company.name,
      referenceNumber,
    );

    // Send notification email to admin (if configured)
    await this.sendAdminNotificationEmail(
      company,
      application,
      referenceNumber,
    );

    this.logger.log(
      `Affiliate application submitted: ${application.id} for company ${companyId}`,
    );

    return {
      success: true,
      applicationId: application.id,
      message: 'Your application has been submitted successfully!',
      estimatedReviewDays: 3,
      referenceNumber,
    };
  }

  /**
   * Get application status by email (for public status check)
   */
  async getApplicationStatus(
    companyId: string,
    email: string,
  ): Promise<AffiliateApplicationSummary | null> {
    const application = await this.prisma.affiliateApplication.findFirst({
      where: {
        companyId,
        email: email.toLowerCase(),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!application) {
      return null;
    }

    return {
      id: application.id,
      email: application.email,
      firstName: application.firstName,
      lastName: application.lastName,
      status: application.status,
      createdAt: application.createdAt,
      companyName: undefined, // Could fetch if needed
      website: application.website || undefined,
    };
  }

  /**
   * Generate a human-readable reference number
   */
  private generateReferenceNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `AFF-${timestamp}-${random}`;
  }

  /**
   * Send confirmation email to applicant
   */
  private async sendApplicationConfirmationEmail(
    email: string,
    firstName: string,
    companyName: string,
    referenceNumber: string,
  ): Promise<void> {
    try {
      await this.emailService.sendTemplatedEmail({
        to: email,
        templateCode: 'affiliate-application-confirmation',
        variables: {
          firstName,
          companyName,
          referenceNumber,
          estimatedReviewDays: '3',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send application confirmation email: ${error.message}`,
        error.stack,
      );
      // Don't throw - email failure shouldn't block application
    }
  }

  /**
   * Send notification email to admin
   */
  private async sendAdminNotificationEmail(
    company: { id: string; name: string; clientId: string },
    application: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      website?: string | null;
    },
    referenceNumber: string,
  ): Promise<void> {
    try {
      // Get company admin emails (could be from config or users with admin role)
      // For now, we'll just log - in production this would send to configured admin emails
      this.logger.log(
        `Admin notification: New affiliate application ${referenceNumber} for ${company.name} from ${application.email}`,
      );

      // TODO: Implement admin notification when email recipients are configured
      // await this.emailService.sendTemplatedEmail({
      //   to: adminEmail,
      //   templateCode: 'affiliate-application-admin-notification',
      //   variables: { ... },
      // });
    } catch (error) {
      this.logger.error(
        `Failed to send admin notification email: ${error.message}`,
        error.stack,
      );
    }
  }
}
