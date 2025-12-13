// Email Service - SOC2/ISO27001 Compliant Email Sending with AWS SES
// Production-optimized: All emails are queued via SQS for reliability and audit compliance
import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TemplateRendererService } from './template-renderer.service';
import { EmailQueueService } from './email-queue.service';
import {
  SendEmailOptions,
  SendTemplatedEmailOptions,
  EmailSendResult,
  EmailTemplateWithContent,
  DEFAULT_FROM_EMAIL,
  DEFAULT_FROM_NAME,
  DEFAULT_REPLY_TO,
} from '../types/email.types';
import { EmailSendStatus } from '@prisma/client';

// Simple email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateRenderer: TemplateRendererService,
    @Inject(forwardRef(() => EmailQueueService))
    private readonly emailQueueService: EmailQueueService,
  ) {}

  async onModuleInit() {
    this.logger.log('Email service initialized (SQS queue-based sending)');
  }

  /**
   * Validate email address format
   */
  private isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email) && email.length <= 254;
  }

  /**
   * Send an email using a template code
   * Looks up template by code with hierarchical fallback: Company → Client → Organization
   */
  async sendTemplatedEmail(options: SendTemplatedEmailOptions): Promise<EmailSendResult> {
    const { to, toName, templateCode, variables, companyId, clientId, organizationId } = options;

    try {
      // Find template with hierarchical fallback
      const template = await this.findTemplate(templateCode, { companyId, clientId, organizationId });

      if (!template) {
        this.logger.error(`Email template not found: ${templateCode}`);
        return { success: false, error: `Template not found: ${templateCode}` };
      }

      // Render the template
      const rendered = this.templateRenderer.render(template, variables);

      // Send the email
      return this.sendEmail({
        to,
        toName,
        subject: rendered.subject,
        htmlBody: rendered.htmlBody,
        textBody: rendered.textBody,
        fromEmail: template.fromEmail || DEFAULT_FROM_EMAIL,
        fromName: template.fromName || DEFAULT_FROM_NAME,
        replyTo: template.replyTo || DEFAULT_REPLY_TO,
        templateCode,
        templateId: template.id,
        category: template.category,
        variables,
        organizationId,
        clientId,
        companyId,
        relatedEntityType: options.relatedEntityType,
        relatedEntityId: options.relatedEntityId,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      });
    } catch (error) {
      this.logger.error(`Failed to send templated email: ${error}`);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Send a raw email (without template)
   * All emails are queued via SQS for reliability, retry handling, and audit compliance
   * The EmailQueueProcessorService handles the actual SES sending
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const { to } = options;

    // Validate email address before queuing
    if (!this.isValidEmail(to)) {
      this.logger.warn(`Invalid email address: ${to}`);
      return { success: false, error: `Invalid email address: ${to}` };
    }

    // Delegate to queue service - handles logging, audit trail, and SQS queuing
    return this.emailQueueService.queueEmail(options);
  }

  /**
   * Find template with hierarchical fallback
   * Priority: Company → Client → Organization → System
   */
  private async findTemplate(
    code: string,
    scope: { companyId?: string; clientId?: string; organizationId?: string },
  ): Promise<EmailTemplateWithContent | null> {
    const { companyId, clientId, organizationId } = scope;

    // Try company-specific template first
    if (companyId) {
      const template = await this.prisma.emailTemplate.findFirst({
        where: { code, companyId, isActive: true, deletedAt: null },
      });
      if (template) return template as unknown as EmailTemplateWithContent;
    }

    // Try client-specific template
    if (clientId) {
      const template = await this.prisma.emailTemplate.findFirst({
        where: { code, clientId, companyId: null, isActive: true, deletedAt: null },
      });
      if (template) return template as unknown as EmailTemplateWithContent;
    }

    // Try organization-specific template
    if (organizationId) {
      const template = await this.prisma.emailTemplate.findFirst({
        where: { code, organizationId, clientId: null, companyId: null, isActive: true, deletedAt: null },
      });
      if (template) return template as unknown as EmailTemplateWithContent;
    }

    // Fall back to system template (isSystem = true, no scope)
    const systemTemplate = await this.prisma.emailTemplate.findFirst({
      where: {
        code,
        isSystem: true,
        isActive: true,
        deletedAt: null,
        organizationId: null,
        clientId: null,
        companyId: null,
      },
    });

    return systemTemplate as unknown as EmailTemplateWithContent | null;
  }

  /**
   * Get all templates for a scope
   */
  async getTemplates(scope: {
    organizationId?: string;
    clientId?: string;
    companyId?: string;
  }): Promise<EmailTemplateWithContent[]> {
    const templates = await this.prisma.emailTemplate.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        OR: [
          { isSystem: true },
          { organizationId: scope.organizationId },
          { clientId: scope.clientId },
          { companyId: scope.companyId },
        ],
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return templates as unknown as EmailTemplateWithContent[];
  }

  /**
   * Create or update a template
   */
  async upsertTemplate(
    code: string,
    data: Omit<EmailTemplateWithContent, 'id' | 'code'> & {
      organizationId?: string;
      clientId?: string;
      companyId?: string;
    },
  ): Promise<EmailTemplateWithContent> {
    const { organizationId, clientId, companyId, variables, ...templateData } = data;

    // Validate template syntax before saving
    const subjectValidation = this.templateRenderer.validateTemplate(templateData.subject);
    if (!subjectValidation.valid) {
      throw new Error(`Invalid subject template: ${subjectValidation.error}`);
    }

    const htmlValidation = this.templateRenderer.validateTemplate(templateData.htmlBody);
    if (!htmlValidation.valid) {
      throw new Error(`Invalid HTML template: ${htmlValidation.error}`);
    }

    if (templateData.textBody) {
      const textValidation = this.templateRenderer.validateTemplate(templateData.textBody);
      if (!textValidation.valid) {
        throw new Error(`Invalid text template: ${textValidation.error}`);
      }
    }

    // Build unique identifier based on scope
    const scopeWhere = companyId
      ? { company_template_code: { companyId, code } }
      : clientId
        ? { client_template_code: { clientId, code } }
        : organizationId
          ? { org_template_code: { organizationId, code } }
          : null;

    if (!scopeWhere) {
      throw new Error('Template must have a scope (organization, client, or company)');
    }

    const template = await this.prisma.emailTemplate.upsert({
      where: scopeWhere,
      create: {
        code,
        organizationId: organizationId ?? null,
        clientId: clientId ?? null,
        companyId: companyId ?? null,
        variables: variables ?? undefined,
        ...templateData,
      },
      update: {
        ...templateData,
        variables: variables ?? undefined,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    return template as unknown as EmailTemplateWithContent;
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    options?: {
      toName?: string;
      companyId?: string;
      clientId?: string;
      organizationId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<EmailSendResult> {
    const resetUrl = `${process.env.ADMIN_DASHBOARD_URL || 'https://app.avnz.io'}/reset-password?token=${resetToken}`;

    return this.sendTemplatedEmail({
      to,
      toName: options?.toName,
      templateCode: 'password-reset',
      variables: {
        resetUrl,
        userName: options?.toName || to.split('@')[0],
        expiresIn: '1 hour',
        supportEmail: DEFAULT_REPLY_TO,
      },
      companyId: options?.companyId,
      clientId: options?.clientId,
      organizationId: options?.organizationId,
      relatedEntityType: 'password_reset',
      relatedEntityId: resetToken,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    to: string,
    options: {
      toName?: string;
      companyName?: string;
      loginUrl?: string;
      companyId?: string;
      clientId?: string;
      organizationId?: string;
    },
  ): Promise<EmailSendResult> {
    return this.sendTemplatedEmail({
      to,
      toName: options.toName,
      templateCode: 'welcome',
      variables: {
        userName: options.toName || to.split('@')[0],
        companyName: options.companyName || 'AVNZ Platform',
        loginUrl: options.loginUrl || `${process.env.ADMIN_DASHBOARD_URL || 'https://app.avnz.io'}/login`,
        supportEmail: DEFAULT_REPLY_TO,
      },
      companyId: options.companyId,
      clientId: options.clientId,
      organizationId: options.organizationId,
      relatedEntityType: 'user_registration',
    });
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(
    to: string,
    verificationToken: string,
    options?: {
      toName?: string;
      companyId?: string;
      clientId?: string;
      organizationId?: string;
    },
  ): Promise<EmailSendResult> {
    const verifyUrl = `${process.env.ADMIN_DASHBOARD_URL || 'https://app.avnz.io'}/verify-email?token=${verificationToken}`;

    return this.sendTemplatedEmail({
      to,
      toName: options?.toName,
      templateCode: 'email-verification',
      variables: {
        verifyUrl,
        userName: options?.toName || to.split('@')[0],
        expiresIn: '24 hours',
        supportEmail: DEFAULT_REPLY_TO,
      },
      companyId: options?.companyId,
      clientId: options?.clientId,
      organizationId: options?.organizationId,
      relatedEntityType: 'email_verification',
      relatedEntityId: verificationToken,
    });
  }

  /**
   * Get email send logs
   */
  async getSendLogs(options: {
    companyId?: string;
    clientId?: string;
    organizationId?: string;
    templateCode?: string;
    status?: EmailSendStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: any[]; total: number }> {
    const where: any = {};

    if (options.companyId) where.companyId = options.companyId;
    if (options.clientId) where.clientId = options.clientId;
    if (options.organizationId) where.organizationId = options.organizationId;
    if (options.templateCode) where.templateCode = options.templateCode;
    if (options.status) where.status = options.status;

    const [logs, total] = await Promise.all([
      this.prisma.emailSendLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
        include: {
          template: {
            select: { name: true, code: true, category: true },
          },
        },
      }),
      this.prisma.emailSendLog.count({ where }),
    ]);

    return { logs, total };
  }
}
