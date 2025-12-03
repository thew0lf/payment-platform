import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CreatePaymentPageDto, UpdatePaymentPageDto } from '../dto';
import {
  PaymentPageStatus,
  PaymentPageType,
  PaymentPage,
  Prisma,
} from '@prisma/client';
import { AuditAction } from '../../audit-logs/types/audit-log.types';

export interface PaymentPageFilters {
  search?: string;
  status?: PaymentPageStatus;
  type?: PaymentPageType;
  themeId?: string;
}

export interface PaginatedPaymentPages {
  items: PaymentPage[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class PaymentPagesService {
  private readonly logger = new Logger(PaymentPagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogsService,
  ) {}

  async findAll(
    companyId: string,
    filters: PaymentPageFilters = {},
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedPaymentPages> {
    const { search, status, type, themeId } = filters;

    const where: Prisma.PaymentPageWhereInput = {
      companyId,
      deletedAt: null,
      ...(status && { status }),
      ...(type && { type }),
      ...(themeId && { themeId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.paymentPage.findMany({
        where,
        include: {
          theme: {
            select: {
              id: true,
              name: true,
              category: true,
              previewImageUrl: true,
            },
          },
          _count: {
            select: {
              sessions: true,
              analytics: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.paymentPage.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string, companyId: string): Promise<PaymentPage> {
    const page = await this.prisma.paymentPage.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: {
        theme: true,
        sessions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        analytics: {
          take: 30,
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!page) {
      throw new NotFoundException(`Payment page with ID ${id} not found`);
    }

    return page;
  }

  async findBySlug(slug: string, companyId: string): Promise<PaymentPage> {
    const page = await this.prisma.paymentPage.findFirst({
      where: {
        slug,
        companyId,
        deletedAt: null,
      },
      include: {
        theme: true,
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!page) {
      throw new NotFoundException(`Payment page with slug ${slug} not found`);
    }

    return page;
  }

  /**
   * Find a published payment page for public checkout rendering
   * This is used by the public checkout page renderer
   */
  async findPublicPage(companyCode: string, slug: string) {
    // First find the company by code
    const company = await this.prisma.company.findFirst({
      where: {
        code: companyCode.toUpperCase(),
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        logo: true,
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with code ${companyCode} not found`);
    }

    // Find the published payment page
    const page = await this.prisma.paymentPage.findFirst({
      where: {
        slug,
        companyId: company.id,
        status: PaymentPageStatus.PUBLISHED,
        deletedAt: null,
      },
      include: {
        theme: true,
      },
    });

    if (!page) {
      throw new NotFoundException(`Payment page "${slug}" not found or not published`);
    }

    // Return public page configuration (exclude sensitive fields)
    return {
      id: page.id,
      companyCode: company.code,
      companyName: company.name,
      companyLogo: company.logo,
      // Page info
      name: page.name,
      slug: page.slug,
      type: page.type,
      // Branding
      logoUrl: page.logoUrl || company.logo,
      faviconUrl: page.faviconUrl,
      brandColor: page.brandColor,
      // Content
      title: page.title,
      description: page.description,
      headline: page.headline,
      subheadline: page.subheadline,
      // Theme (full styles)
      theme: page.theme ? {
        id: page.theme.id,
        name: page.theme.name,
        category: page.theme.category,
        styles: page.theme.styles,
      } : null,
      customStyles: page.customStyles,
      // Payment config
      paymentConfig: page.paymentConfig,
      acceptedGateways: page.acceptedGateways,
      customerFieldsConfig: page.customerFieldsConfig,
      // Shipping/Tax
      shippingEnabled: page.shippingEnabled,
      shippingConfig: page.shippingConfig,
      taxEnabled: page.taxEnabled,
      taxConfig: page.taxConfig,
      // Discounts
      discountsEnabled: page.discountsEnabled,
      // Terms (public URLs)
      termsUrl: page.termsUrl,
      privacyUrl: page.privacyUrl,
      refundPolicyUrl: page.refundPolicyUrl,
      customTermsText: page.customTermsText,
      requireTermsAccept: page.requireTermsAccept,
      // Success/Cancel (public URLs)
      successUrl: page.successUrl,
      cancelUrl: page.cancelUrl,
      successMessage: page.successMessage,
      // SEO
      metaTitle: page.metaTitle || page.title,
      metaDescription: page.metaDescription || page.description,
      ogImage: page.ogImage,
      noIndex: page.noIndex,
      // Security
      allowedDomains: page.allowedDomains,
      // PCI compliance (CSP policy for frontend)
      cspPolicy: page.cspPolicy,
    };
  }

  /**
   * Generate a preview of a payment page (admin only)
   * Works for any status (DRAFT, PUBLISHED, ARCHIVED)
   * Used in the admin dashboard for previewing before publish
   */
  async getPreview(pageId: string, companyId: string) {
    // Find the page
    const page = await this.prisma.paymentPage.findFirst({
      where: {
        id: pageId,
        companyId,
        deletedAt: null,
      },
      include: {
        theme: true,
        company: {
          select: {
            id: true,
            name: true,
            code: true,
            logo: true,
          },
        },
      },
    });

    if (!page) {
      throw new NotFoundException(`Payment page with ID ${pageId} not found`);
    }

    // Return preview configuration (same structure as findPublicPage)
    return {
      id: page.id,
      companyCode: page.company.code,
      companyName: page.company.name,
      companyLogo: page.company.logo,
      // Page info
      name: page.name,
      slug: page.slug,
      type: page.type,
      status: page.status, // Include status for preview banner
      // Branding
      logoUrl: page.logoUrl || page.company.logo,
      faviconUrl: page.faviconUrl,
      brandColor: page.brandColor,
      // Content
      title: page.title,
      description: page.description,
      headline: page.headline,
      subheadline: page.subheadline,
      // Theme (full styles)
      theme: page.theme ? {
        id: page.theme.id,
        name: page.theme.name,
        category: page.theme.category,
        styles: page.theme.styles,
      } : null,
      customStyles: page.customStyles,
      // Payment config
      paymentConfig: page.paymentConfig,
      acceptedGateways: page.acceptedGateways,
      customerFieldsConfig: page.customerFieldsConfig,
      // Shipping/Tax
      shippingEnabled: page.shippingEnabled,
      shippingConfig: page.shippingConfig,
      taxEnabled: page.taxEnabled,
      taxConfig: page.taxConfig,
      // Discounts
      discountsEnabled: page.discountsEnabled,
      // Terms
      termsUrl: page.termsUrl,
      privacyUrl: page.privacyUrl,
      refundPolicyUrl: page.refundPolicyUrl,
      customTermsText: page.customTermsText,
      requireTermsAccept: page.requireTermsAccept,
      // Success/Cancel
      successUrl: page.successUrl,
      cancelUrl: page.cancelUrl,
      successMessage: page.successMessage,
      // SEO
      metaTitle: page.metaTitle || page.title,
      metaDescription: page.metaDescription || page.description,
      ogImage: page.ogImage,
      noIndex: page.noIndex,
      // Security
      allowedDomains: page.allowedDomains,
      cspPolicy: page.cspPolicy,
      // Preview metadata
      isPreview: true,
      previewGeneratedAt: new Date().toISOString(),
    };
  }

  async findByDomain(domain: string): Promise<PaymentPage | null> {
    const domainRecord = await this.prisma.paymentPageDomain.findFirst({
      where: {
        domain,
        isVerified: true,
      },
    });

    if (!domainRecord || !domainRecord.defaultPageId) {
      return null;
    }

    const page = await this.prisma.paymentPage.findFirst({
      where: {
        id: domainRecord.defaultPageId,
        deletedAt: null,
      },
      include: {
        theme: true,
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return page;
  }

  async create(
    companyId: string,
    dto: CreatePaymentPageDto,
    userId: string,
  ): Promise<PaymentPage> {
    // Check for slug uniqueness within company
    const existing = await this.prisma.paymentPage.findFirst({
      where: {
        companyId,
        slug: dto.slug,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`A payment page with slug "${dto.slug}" already exists`);
    }

    // Validate theme exists if provided
    if (dto.themeId) {
      const theme = await this.prisma.checkoutPageTheme.findUnique({
        where: { id: dto.themeId },
      });

      if (!theme) {
        throw new BadRequestException(`Theme with ID ${dto.themeId} not found`);
      }
    }

    const page = await this.prisma.paymentPage.create({
      data: {
        companyId,
        name: dto.name,
        slug: dto.slug,
        customDomain: dto.customDomain,
        type: dto.type,
        status: dto.status || PaymentPageStatus.DRAFT,
        themeId: dto.themeId,
        customStyles: dto.customStyles as Prisma.InputJsonValue,
        // Branding
        logoUrl: dto.logoUrl,
        faviconUrl: dto.faviconUrl,
        brandColor: dto.brandColor,
        // Content
        title: dto.title,
        description: dto.description,
        headline: dto.headline,
        subheadline: dto.subheadline,
        // Payment config (JSON)
        paymentConfig: dto.paymentConfig as Prisma.InputJsonValue,
        acceptedGateways: dto.acceptedGateways as Prisma.InputJsonValue,
        lineItemsConfig: dto.lineItemsConfig as Prisma.InputJsonValue,
        subscriptionConfig: dto.subscriptionConfig as Prisma.InputJsonValue,
        donationConfig: dto.donationConfig as Prisma.InputJsonValue,
        customerFieldsConfig: dto.customerFieldsConfig as Prisma.InputJsonValue,
        // Shipping
        shippingEnabled: dto.shippingEnabled ?? false,
        shippingConfig: dto.shippingConfig as Prisma.InputJsonValue,
        // Tax
        taxEnabled: dto.taxEnabled ?? false,
        taxConfig: dto.taxConfig as Prisma.InputJsonValue,
        // Discounts
        discountsEnabled: dto.discountsEnabled ?? false,
        discountsConfig: dto.discountsConfig as Prisma.InputJsonValue,
        // Terms
        termsUrl: dto.termsUrl,
        privacyUrl: dto.privacyUrl,
        refundPolicyUrl: dto.refundPolicyUrl,
        customTermsText: dto.customTermsText,
        requireTermsAccept: dto.requireTermsAccept ?? false,
        // Success/Cancel
        successUrl: dto.successUrl,
        cancelUrl: dto.cancelUrl,
        successMessage: dto.successMessage,
        // Webhook
        webhookUrl: dto.webhookUrl,
        webhookSecret: dto.webhookSecret,
        // AI & Analytics
        aiInsightsEnabled: dto.aiInsightsEnabled ?? true,
        conversionTracking: dto.conversionTracking ?? true,
        // A/B Testing
        isVariant: dto.isVariant ?? false,
        parentPageId: dto.parentPageId,
        variantName: dto.variantName,
        variantWeight: dto.variantWeight,
        // SEO
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        ogImage: dto.ogImage,
        noIndex: dto.noIndex ?? false,
        // Security
        allowedDomains: dto.allowedDomains as Prisma.InputJsonValue,
        rateLimit: dto.rateLimit,
        // PCI
        scriptInventory: dto.scriptInventory as Prisma.InputJsonValue,
        cspPolicy: dto.cspPolicy as Prisma.InputJsonValue,
        // Audit
        createdBy: userId,
      },
      include: {
        theme: true,
      },
    });

    // Increment theme usage count
    if (dto.themeId) {
      await this.prisma.checkoutPageTheme.update({
        where: { id: dto.themeId },
        data: { usageCount: { increment: 1 } },
      });
    }

    await this.auditLog.log(AuditAction.CREATE, 'PaymentPage', page.id, {
      userId,
      metadata: {
        name: page.name,
        slug: page.slug,
        type: page.type,
        companyId,
      },
    });

    this.logger.log(`Created payment page ${page.id} for company ${companyId}`);

    return page;
  }

  async update(
    id: string,
    companyId: string,
    dto: UpdatePaymentPageDto,
    userId: string,
  ): Promise<PaymentPage> {
    const existing = await this.findById(id, companyId);

    // Check slug uniqueness if being changed
    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.prisma.paymentPage.findFirst({
        where: {
          companyId,
          slug: dto.slug,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (slugExists) {
        throw new ConflictException(`A payment page with slug "${dto.slug}" already exists`);
      }
    }

    // Validate theme if being changed
    if (dto.themeId && dto.themeId !== existing.themeId) {
      const theme = await this.prisma.checkoutPageTheme.findUnique({
        where: { id: dto.themeId },
      });

      if (!theme) {
        throw new BadRequestException(`Theme with ID ${dto.themeId} not found`);
      }

      // Update theme usage counts
      if (existing.themeId) {
        await this.prisma.checkoutPageTheme.update({
          where: { id: existing.themeId },
          data: { usageCount: { decrement: 1 } },
        });
      }

      await this.prisma.checkoutPageTheme.update({
        where: { id: dto.themeId },
        data: { usageCount: { increment: 1 } },
      });
    }

    const page = await this.prisma.paymentPage.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.customDomain !== undefined && { customDomain: dto.customDomain }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.themeId !== undefined && { themeId: dto.themeId }),
        ...(dto.customStyles !== undefined && { customStyles: dto.customStyles as Prisma.InputJsonValue }),
        // Branding
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.faviconUrl !== undefined && { faviconUrl: dto.faviconUrl }),
        ...(dto.brandColor !== undefined && { brandColor: dto.brandColor }),
        // Content
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.headline !== undefined && { headline: dto.headline }),
        ...(dto.subheadline !== undefined && { subheadline: dto.subheadline }),
        // Payment config
        ...(dto.paymentConfig !== undefined && { paymentConfig: dto.paymentConfig as Prisma.InputJsonValue }),
        ...(dto.acceptedGateways !== undefined && { acceptedGateways: dto.acceptedGateways as Prisma.InputJsonValue }),
        ...(dto.lineItemsConfig !== undefined && { lineItemsConfig: dto.lineItemsConfig as Prisma.InputJsonValue }),
        ...(dto.subscriptionConfig !== undefined && { subscriptionConfig: dto.subscriptionConfig as Prisma.InputJsonValue }),
        ...(dto.donationConfig !== undefined && { donationConfig: dto.donationConfig as Prisma.InputJsonValue }),
        ...(dto.customerFieldsConfig !== undefined && { customerFieldsConfig: dto.customerFieldsConfig as Prisma.InputJsonValue }),
        // Shipping
        ...(dto.shippingEnabled !== undefined && { shippingEnabled: dto.shippingEnabled }),
        ...(dto.shippingConfig !== undefined && { shippingConfig: dto.shippingConfig as Prisma.InputJsonValue }),
        // Tax
        ...(dto.taxEnabled !== undefined && { taxEnabled: dto.taxEnabled }),
        ...(dto.taxConfig !== undefined && { taxConfig: dto.taxConfig as Prisma.InputJsonValue }),
        // Discounts
        ...(dto.discountsEnabled !== undefined && { discountsEnabled: dto.discountsEnabled }),
        ...(dto.discountsConfig !== undefined && { discountsConfig: dto.discountsConfig as Prisma.InputJsonValue }),
        // Terms
        ...(dto.termsUrl !== undefined && { termsUrl: dto.termsUrl }),
        ...(dto.privacyUrl !== undefined && { privacyUrl: dto.privacyUrl }),
        ...(dto.refundPolicyUrl !== undefined && { refundPolicyUrl: dto.refundPolicyUrl }),
        ...(dto.customTermsText !== undefined && { customTermsText: dto.customTermsText }),
        ...(dto.requireTermsAccept !== undefined && { requireTermsAccept: dto.requireTermsAccept }),
        // Success/Cancel
        ...(dto.successUrl !== undefined && { successUrl: dto.successUrl }),
        ...(dto.cancelUrl !== undefined && { cancelUrl: dto.cancelUrl }),
        ...(dto.successMessage !== undefined && { successMessage: dto.successMessage }),
        // Webhook
        ...(dto.webhookUrl !== undefined && { webhookUrl: dto.webhookUrl }),
        ...(dto.webhookSecret !== undefined && { webhookSecret: dto.webhookSecret }),
        // AI & Analytics
        ...(dto.aiInsightsEnabled !== undefined && { aiInsightsEnabled: dto.aiInsightsEnabled }),
        ...(dto.conversionTracking !== undefined && { conversionTracking: dto.conversionTracking }),
        // A/B Testing
        ...(dto.isVariant !== undefined && { isVariant: dto.isVariant }),
        ...(dto.parentPageId !== undefined && { parentPageId: dto.parentPageId }),
        ...(dto.variantName !== undefined && { variantName: dto.variantName }),
        ...(dto.variantWeight !== undefined && { variantWeight: dto.variantWeight }),
        // SEO
        ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
        ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
        ...(dto.ogImage !== undefined && { ogImage: dto.ogImage }),
        ...(dto.noIndex !== undefined && { noIndex: dto.noIndex }),
        // Security
        ...(dto.allowedDomains !== undefined && { allowedDomains: dto.allowedDomains as Prisma.InputJsonValue }),
        ...(dto.rateLimit !== undefined && { rateLimit: dto.rateLimit }),
        // PCI
        ...(dto.scriptInventory !== undefined && { scriptInventory: dto.scriptInventory as Prisma.InputJsonValue }),
        ...(dto.cspPolicy !== undefined && { cspPolicy: dto.cspPolicy as Prisma.InputJsonValue }),
      },
      include: {
        theme: true,
      },
    });

    await this.auditLog.log(AuditAction.UPDATE, 'PaymentPage', page.id, {
      userId,
      metadata: { changes: dto, companyId },
    });

    this.logger.log(`Updated payment page ${page.id}`);

    return page;
  }

  async publish(id: string, companyId: string, userId: string): Promise<PaymentPage> {
    const page = await this.findById(id, companyId);

    if (page.status === PaymentPageStatus.PUBLISHED) {
      throw new BadRequestException('Payment page is already published');
    }

    // Validate required fields for publishing
    const paymentConfig = page.paymentConfig as Record<string, unknown>;
    const acceptedGateways = page.acceptedGateways as Record<string, unknown>;

    if (!paymentConfig || !acceptedGateways) {
      throw new BadRequestException('Payment page must have payment config and accepted gateways to publish');
    }

    const updated = await this.prisma.paymentPage.update({
      where: { id },
      data: {
        status: PaymentPageStatus.PUBLISHED,
        publishedAt: new Date(),
        publishedBy: userId,
      },
      include: {
        theme: true,
      },
    });

    await this.auditLog.log(AuditAction.UPDATE, 'PaymentPage', page.id, {
      userId,
      metadata: { action: 'publish', previousStatus: page.status, companyId },
    });

    this.logger.log(`Published payment page ${page.id}`);

    return updated;
  }

  async archive(id: string, companyId: string, userId: string): Promise<PaymentPage> {
    const page = await this.findById(id, companyId);

    const updated = await this.prisma.paymentPage.update({
      where: { id },
      data: {
        status: PaymentPageStatus.ARCHIVED,
      },
      include: {
        theme: true,
      },
    });

    await this.auditLog.log(AuditAction.UPDATE, 'PaymentPage', page.id, {
      userId,
      metadata: { action: 'archive', previousStatus: page.status, companyId },
    });

    this.logger.log(`Archived payment page ${page.id}`);

    return updated;
  }

  async delete(id: string, companyId: string, userId: string): Promise<void> {
    const page = await this.findById(id, companyId);

    await this.prisma.paymentPage.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    // Decrement theme usage count
    if (page.themeId) {
      await this.prisma.checkoutPageTheme.update({
        where: { id: page.themeId },
        data: { usageCount: { decrement: 1 } },
      });
    }

    await this.auditLog.log(AuditAction.SOFT_DELETE, 'PaymentPage', page.id, {
      userId,
      metadata: { name: page.name, slug: page.slug, companyId },
    });

    this.logger.log(`Soft deleted payment page ${page.id}`);
  }

  async duplicate(
    id: string,
    companyId: string,
    newName: string,
    newSlug: string,
    userId: string,
  ): Promise<PaymentPage> {
    const original = await this.findById(id, companyId);

    // Check slug uniqueness
    const slugExists = await this.prisma.paymentPage.findFirst({
      where: {
        companyId,
        slug: newSlug,
        deletedAt: null,
      },
    });

    if (slugExists) {
      throw new ConflictException(`A payment page with slug "${newSlug}" already exists`);
    }

    const duplicate = await this.prisma.paymentPage.create({
      data: {
        companyId,
        name: newName,
        slug: newSlug,
        type: original.type,
        status: PaymentPageStatus.DRAFT,
        themeId: original.themeId,
        customStyles: original.customStyles as Prisma.InputJsonValue,
        // Branding
        logoUrl: original.logoUrl,
        faviconUrl: original.faviconUrl,
        brandColor: original.brandColor,
        // Content
        title: original.title,
        description: original.description,
        headline: original.headline,
        subheadline: original.subheadline,
        // Payment config
        paymentConfig: original.paymentConfig as Prisma.InputJsonValue,
        acceptedGateways: original.acceptedGateways as Prisma.InputJsonValue,
        lineItemsConfig: original.lineItemsConfig as Prisma.InputJsonValue,
        subscriptionConfig: original.subscriptionConfig as Prisma.InputJsonValue,
        donationConfig: original.donationConfig as Prisma.InputJsonValue,
        customerFieldsConfig: original.customerFieldsConfig as Prisma.InputJsonValue,
        // Shipping
        shippingEnabled: original.shippingEnabled,
        shippingConfig: original.shippingConfig as Prisma.InputJsonValue,
        // Tax
        taxEnabled: original.taxEnabled,
        taxConfig: original.taxConfig as Prisma.InputJsonValue,
        // Discounts
        discountsEnabled: original.discountsEnabled,
        discountsConfig: original.discountsConfig as Prisma.InputJsonValue,
        // Terms
        termsUrl: original.termsUrl,
        privacyUrl: original.privacyUrl,
        refundPolicyUrl: original.refundPolicyUrl,
        customTermsText: original.customTermsText,
        requireTermsAccept: original.requireTermsAccept,
        // Success/Cancel
        successUrl: original.successUrl,
        cancelUrl: original.cancelUrl,
        successMessage: original.successMessage,
        // Webhook
        webhookUrl: original.webhookUrl,
        webhookSecret: original.webhookSecret,
        // AI & Analytics
        aiInsightsEnabled: original.aiInsightsEnabled,
        conversionTracking: original.conversionTracking,
        // SEO
        metaTitle: original.metaTitle,
        metaDescription: original.metaDescription,
        ogImage: original.ogImage,
        noIndex: original.noIndex,
        // Security
        allowedDomains: original.allowedDomains as Prisma.InputJsonValue,
        rateLimit: original.rateLimit,
        // PCI
        scriptInventory: original.scriptInventory as Prisma.InputJsonValue,
        cspPolicy: original.cspPolicy as Prisma.InputJsonValue,
        // Audit
        createdBy: userId,
      },
      include: {
        theme: true,
      },
    });

    // Increment theme usage count
    if (original.themeId) {
      await this.prisma.checkoutPageTheme.update({
        where: { id: original.themeId },
        data: { usageCount: { increment: 1 } },
      });
    }

    await this.auditLog.log(AuditAction.CREATE, 'PaymentPage', duplicate.id, {
      userId,
      metadata: {
        action: 'duplicate',
        originalId: original.id,
        name: duplicate.name,
        slug: duplicate.slug,
        companyId,
      },
    });

    this.logger.log(`Duplicated payment page ${original.id} to ${duplicate.id}`);

    return duplicate;
  }

  async getStats(companyId: string): Promise<{
    total: number;
    published: number;
    draft: number;
    archived: number;
    totalSessions: number;
    completedSessions: number;
    conversionRate: number;
    totalRevenue: number;
  }> {
    // Get page counts by status
    const pages = await this.prisma.paymentPage.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    const pageCounts = pages.reduce(
      (acc, page) => {
        acc.total++;
        const statusKey = page.status.toLowerCase() as 'published' | 'draft' | 'archived';
        acc[statusKey]++;
        return acc;
      },
      {
        total: 0,
        published: 0,
        draft: 0,
        archived: 0,
      },
    );

    // Get session stats from sessions table
    const pageIds = pages.map(p => p.id);

    if (pageIds.length === 0) {
      return {
        ...pageCounts,
        totalSessions: 0,
        completedSessions: 0,
        conversionRate: 0,
        totalRevenue: 0,
      };
    }

    const sessionStats = await this.prisma.paymentPageSession.aggregate({
      where: {
        pageId: { in: pageIds },
      },
      _count: {
        id: true,
      },
      _sum: {
        total: true,
      },
    });

    const completedSessions = await this.prisma.paymentPageSession.count({
      where: {
        pageId: { in: pageIds },
        status: 'COMPLETED',
      },
    });

    const totalSessions = sessionStats._count.id || 0;
    const totalRevenue = sessionStats._sum.total?.toNumber() || 0;

    const conversionRate = totalSessions > 0
      ? (completedSessions / totalSessions) * 100
      : 0;

    return {
      ...pageCounts,
      totalSessions,
      completedSessions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalRevenue,
    };
  }
}
