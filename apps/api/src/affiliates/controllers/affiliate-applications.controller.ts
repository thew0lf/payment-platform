/**
 * Affiliate Applications Controller
 *
 * Admin endpoints for managing affiliate applications.
 * Provides CRUD operations, approval workflows, and bulk actions.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AuditAction, AuditEntity } from '../../audit-logs/types/audit-log.types';
import { DataClassification, Prisma, AffiliateStatus } from '@prisma/client';
import { AffiliatePartnersService } from '../services/affiliate-partners.service';
import { EmailService } from '../../email/services/email.service';

// DTOs
import {
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  IsEnum,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class ApplicationQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

class ApproveApplicationDto {
  @IsOptional()
  @IsEnum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'])
  tier?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class RejectApplicationDto {
  @IsString()
  reason: string;
}

class BulkApproveDto {
  @IsArray()
  @IsString({ each: true })
  applicationIds: string[];

  @IsOptional()
  @IsEnum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'])
  tier?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;
}

class BulkRejectDto {
  @IsArray()
  @IsString({ each: true })
  applicationIds: string[];

  @IsString()
  reason: string;
}

@Controller('affiliates/applications')
@UseGuards(JwtAuthGuard)
export class AffiliateApplicationsController {
  private readonly logger = new Logger(AffiliateApplicationsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditLogsService: AuditLogsService,
    private readonly partnersService: AffiliatePartnersService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * List affiliate applications with filters
   */
  @Get()
  async listApplications(
    @Request() req,
    @Query() query: ApplicationQueryDto,
  ) {
    const user: UserContext = req.user;
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    let targetCompanyIds = companyIds;
    if (query.companyId && companyIds.includes(query.companyId)) {
      targetCompanyIds = [query.companyId];
    }

    const where: Prisma.AffiliateApplicationWhereInput = {
      companyId: { in: targetCompanyIds },
    };

    if (query.status) {
      where.status = query.status as AffiliateStatus;
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { website: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const limit = Math.min(query.limit || 50, 100);
    const offset = query.offset || 0;

    const [applications, total] = await Promise.all([
      this.prisma.affiliateApplication.findMany({
        where,
        include: {
          company: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.affiliateApplication.count({ where }),
    ]);

    return { applications, total, limit, offset };
  }

  /**
   * Get application statistics
   */
  @Get('stats')
  async getApplicationStats(
    @Request() req,
    @Query('companyId') companyId?: string,
  ) {
    const user: UserContext = req.user;
    const companyIds = await this.hierarchyService.getAccessibleCompanyIds(user);

    let targetCompanyIds = companyIds;
    if (companyId && companyIds.includes(companyId)) {
      targetCompanyIds = [companyId];
    }

    const where: Prisma.AffiliateApplicationWhereInput = {
      companyId: { in: targetCompanyIds },
    };

    const [total, pending, approved, rejected, thisMonth] = await Promise.all([
      this.prisma.affiliateApplication.count({ where }),
      this.prisma.affiliateApplication.count({ where: { ...where, status: 'PENDING_APPROVAL' } }),
      this.prisma.affiliateApplication.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.affiliateApplication.count({ where: { ...where, status: 'REJECTED' } }),
      this.prisma.affiliateApplication.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      thisMonth,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    };
  }

  /**
   * Get a single application by ID
   */
  @Get(':id')
  async getApplication(
    @Request() req,
    @Param('id') id: string,
  ) {
    const user: UserContext = req.user;

    const application = await this.prisma.affiliateApplication.findUnique({
      where: { id },
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!application) {
      return { error: 'Application not found', statusCode: 404 };
    }

    // Verify access
    await this.hierarchyService.validateCompanyAccess(
      user,
      application.companyId,
      'view affiliate application',
    );

    return application;
  }

  /**
   * Approve an application (creates partner from application)
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveApplication(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ApproveApplicationDto,
  ) {
    const user: UserContext = req.user;

    // Get application
    const application = await this.prisma.affiliateApplication.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            affiliateProgramConfig: true,
          },
        },
      },
    });

    if (!application) {
      return { error: 'Application not found', statusCode: 404 };
    }

    // Verify access
    await this.hierarchyService.validateCompanyAccess(
      user,
      application.companyId,
      'approve affiliate application',
    );

    if (application.status !== 'PENDING_APPROVAL') {
      return { error: 'Application is not pending approval', statusCode: 400 };
    }

    // Get default config values
    const config = application.company.affiliateProgramConfig;

    // Create partner from application
    const partner = await this.prisma.$transaction(async (tx) => {
      // Update application status
      await tx.affiliateApplication.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          reviewedAt: new Date(),
          reviewedBy: user.sub,
        },
      });

      // Create the affiliate partner
      const newPartner = await tx.affiliatePartner.create({
        data: {
          companyId: application.companyId,
          email: application.email,
          firstName: application.firstName,
          lastName: application.lastName,
          phone: application.phone,
          website: application.website,
          socialMedia: application.socialMedia,
          affiliateCode: await this.generateAffiliateCode(
            application.firstName,
            application.lastName,
          ),
          partnershipType: 'AFFILIATE',
          status: 'ACTIVE',
          tier: (dto.tier as any) || 'BRONZE',
          commissionRate: dto.commissionRate ?? config?.defaultCommissionRate ?? 10,
          cookieDurationDays: config?.defaultCookieDurationDays ?? 30,
          payoutThreshold: config?.minimumPayoutThreshold ?? 50,
          payoutMethod: 'PAYPAL',
          approvedAt: new Date(),
          approvedBy: user.sub,
          applicationNotes: dto.notes,
        },
        include: {
          company: {
            select: { id: true, name: true, slug: true },
          },
        },
      });

      return newPartner;
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.AFFILIATE_APPROVED,
      AuditEntity.AFFILIATE_PARTNER,
      partner.id,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.PII,
        metadata: {
          applicationId: id,
          email: application.email,
          tier: dto.tier || 'BRONZE',
        },
      },
    );

    // Send approval email
    await this.sendApprovalEmail(application, partner, application.company.name);

    return partner;
  }

  /**
   * Reject an application
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectApplication(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RejectApplicationDto,
  ) {
    const user: UserContext = req.user;

    const application = await this.prisma.affiliateApplication.findUnique({
      where: { id },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    });

    if (!application) {
      return { error: 'Application not found', statusCode: 404 };
    }

    // Verify access
    await this.hierarchyService.validateCompanyAccess(
      user,
      application.companyId,
      'reject affiliate application',
    );

    if (application.status !== 'PENDING_APPROVAL') {
      return { error: 'Application is not pending approval', statusCode: 400 };
    }

    // Update application
    const updated = await this.prisma.affiliateApplication.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: user.sub,
        rejectionReason: dto.reason,
      },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.AFFILIATE_REJECTED,
      AuditEntity.AFFILIATE_APPLICATION,
      id,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.PII,
        metadata: {
          email: application.email,
          reason: dto.reason,
        },
      },
    );

    // Send rejection email
    await this.sendRejectionEmail(application, dto.reason, application.company.name);

    return updated;
  }

  /**
   * Bulk approve applications
   */
  @Post('bulk/approve')
  @HttpCode(HttpStatus.OK)
  async bulkApprove(
    @Request() req,
    @Body() dto: BulkApproveDto,
  ) {
    const user: UserContext = req.user;
    const results: { id: string; success: boolean; error?: string; partnerId?: string }[] = [];

    for (const id of dto.applicationIds) {
      try {
        const result = await this.approveApplication(req, id, {
          tier: dto.tier,
          commissionRate: dto.commissionRate,
        });
        results.push({ id, success: true, partnerId: result.id });
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      total: dto.applicationIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Bulk reject applications
   */
  @Post('bulk/reject')
  @HttpCode(HttpStatus.OK)
  async bulkReject(
    @Request() req,
    @Body() dto: BulkRejectDto,
  ) {
    const user: UserContext = req.user;
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const id of dto.applicationIds) {
      try {
        await this.rejectApplication(req, id, { reason: dto.reason });
        results.push({ id, success: true });
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      total: dto.applicationIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Delete an application (soft delete or hard delete if not processed)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteApplication(
    @Request() req,
    @Param('id') id: string,
  ) {
    const user: UserContext = req.user;

    const application = await this.prisma.affiliateApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return { error: 'Application not found', statusCode: 404 };
    }

    // Verify access
    await this.hierarchyService.validateCompanyAccess(
      user,
      application.companyId,
      'delete affiliate application',
    );

    // Only pending applications can be deleted
    if (application.status !== 'PENDING_APPROVAL') {
      return { error: 'Only pending applications can be deleted', statusCode: 400 };
    }

    await this.prisma.affiliateApplication.delete({
      where: { id },
    });

    // Audit log
    await this.auditLogsService.log(
      AuditAction.DELETE,
      AuditEntity.AFFILIATE_APPLICATION,
      id,
      {
        userId: user.sub,
        scopeType: user.scopeType,
        scopeId: user.scopeId,
        dataClassification: DataClassification.PII,
        metadata: {
          email: application.email,
        },
      },
    );

    return { success: true };
  }

  /**
   * Generate unique affiliate code
   */
  private async generateAffiliateCode(firstName: string, lastName: string): Promise<string> {
    const base = `${firstName.slice(0, 2)}${lastName.slice(0, 2)}`.toUpperCase();
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();

    const code = `${base}${year}${random}`;

    // Check uniqueness
    const existing = await this.prisma.affiliatePartner.findUnique({
      where: { affiliateCode: code },
    });

    if (existing) {
      // Retry with different random
      return this.generateAffiliateCode(firstName, lastName);
    }

    return code;
  }

  /**
   * Send approval email to applicant
   */
  private async sendApprovalEmail(
    application: { email: string; firstName: string },
    partner: { affiliateCode: string },
    companyName: string,
  ): Promise<void> {
    try {
      await this.emailService.sendTemplatedEmail({
        to: application.email,
        templateCode: 'affiliate-application-approved',
        variables: {
          firstName: application.firstName,
          companyName,
          affiliateCode: partner.affiliateCode,
          dashboardUrl: `${process.env.AFFILIATE_PORTAL_URL || 'https://affiliate.avnz.io'}/login`,
        },
        fallbackSubject: `Welcome to the ${companyName} Affiliate Program!`,
        fallbackHtml: `
          <h1>Congratulations, ${application.firstName}!</h1>
          <p>Your application to join the ${companyName} affiliate program has been approved!</p>
          <p><strong>Your Affiliate Code:</strong> ${partner.affiliateCode}</p>
          <p>Log in to your affiliate dashboard to start creating tracking links and earning commissions.</p>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send approval email: ${error.message}`);
    }
  }

  /**
   * Send rejection email to applicant
   */
  private async sendRejectionEmail(
    application: { email: string; firstName: string },
    reason: string,
    companyName: string,
  ): Promise<void> {
    try {
      await this.emailService.sendTemplatedEmail({
        to: application.email,
        templateCode: 'affiliate-application-rejected',
        variables: {
          firstName: application.firstName,
          companyName,
          reason,
        },
        fallbackSubject: `Update on Your ${companyName} Affiliate Application`,
        fallbackHtml: `
          <h1>Hi ${application.firstName},</h1>
          <p>Thank you for your interest in the ${companyName} affiliate program.</p>
          <p>After reviewing your application, we've decided not to move forward at this time.</p>
          <p>If you have any questions, please don't hesitate to reach out.</p>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send rejection email: ${error.message}`);
    }
  }
}
