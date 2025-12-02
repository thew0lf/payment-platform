import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LandingPageTheme, LandingPageStatus, LandingPageHosting, SectionType } from '@prisma/client';
import {
  CreateLandingPageDto,
  UpdateLandingPageDto,
  CreateSectionDto,
  UpdateSectionDto,
  LandingPageSummary,
  LandingPageDetail,
  THEME_DEFAULTS,
  ColorScheme,
  Typography,
} from '../types/landing-page.types';
import { PAGE_TEMPLATES, TEMPLATE_LIST, PageTemplate } from '../types/templates';

@Injectable()
export class LandingPagesService {
  private readonly logger = new Logger(LandingPagesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all landing pages for a company
   */
  async findAll(companyId: string): Promise<LandingPageSummary[]> {
    const pages = await this.prisma.landingPage.findMany({
      where: { companyId },
      include: {
        _count: {
          select: {
            sections: true,
            domains: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return pages.map(page => ({
      id: page.id,
      companyId: page.companyId,
      name: page.name,
      slug: page.slug,
      subdomain: page.subdomain || undefined,
      theme: page.theme,
      status: page.status,
      hostingType: page.hostingType,
      platformUrl: page.platformUrl || undefined,
      clientUrl: page.clientUrl || undefined,
      publishedAt: page.publishedAt || undefined,
      sectionCount: page._count.sections,
      domainCount: page._count.domains,
      totalPageViews: Number(page.totalPageViews),
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    }));
  }

  /**
   * Get a single landing page with all details
   */
  async findOne(companyId: string, pageId: string): Promise<LandingPageDetail> {
    const page = await this.prisma.landingPage.findFirst({
      where: { id: pageId, companyId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
        domains: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!page) {
      throw new NotFoundException(`Landing page not found`);
    }

    return {
      id: page.id,
      companyId: page.companyId,
      name: page.name,
      slug: page.slug,
      subdomain: page.subdomain || undefined,
      theme: page.theme,
      colorScheme: page.colorScheme as unknown as ColorScheme,
      typography: page.typography as unknown as Typography,
      status: page.status,
      hostingType: page.hostingType,
      platformUrl: page.platformUrl || undefined,
      clientUrl: page.clientUrl || undefined,
      publishedAt: page.publishedAt || undefined,
      metaTitle: page.metaTitle || undefined,
      metaDescription: page.metaDescription || undefined,
      ogImage: page.ogImage || undefined,
      favicon: page.favicon || undefined,
      customCss: page.customCss || undefined,
      customJs: page.customJs || undefined,
      googleAnalyticsId: page.googleAnalyticsId || undefined,
      facebookPixelId: page.facebookPixelId || undefined,
      billingEnabled: page.billingEnabled,
      monthlyFee: page.monthlyFee,
      sectionCount: page.sections.length,
      domainCount: page.domains.length,
      totalPageViews: Number(page.totalPageViews),
      sections: page.sections.map(section => ({
        id: section.id,
        type: section.type,
        name: section.name || undefined,
        order: section.order,
        enabled: section.enabled,
        content: section.content as any,
        styles: section.styles as any || undefined,
        hideOnMobile: section.hideOnMobile,
        hideOnDesktop: section.hideOnDesktop,
      })),
      domains: page.domains.map(domain => ({
        id: domain.id,
        domain: domain.domain,
        isPrimary: domain.isPrimary,
        sslStatus: domain.sslStatus,
        sslExpiresAt: domain.sslExpiresAt || undefined,
        monthlyFee: domain.monthlyFee,
        createdAt: domain.createdAt,
      })),
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  }

  /**
   * Create a new landing page
   */
  async create(companyId: string, dto: CreateLandingPageDto, userId: string): Promise<LandingPageDetail> {
    // Validate slug is unique within company
    const existing = await this.prisma.landingPage.findFirst({
      where: { companyId, slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`A landing page with slug "${dto.slug}" already exists`);
    }

    // Get theme defaults
    const theme = dto.theme || LandingPageTheme.STARTER;
    const themeDefaults = THEME_DEFAULTS[theme];

    const page = await this.prisma.landingPage.create({
      data: {
        companyId,
        name: dto.name,
        slug: dto.slug,
        theme,
        colorScheme: dto.colorScheme || themeDefaults.colorScheme as any,
        typography: dto.typography || themeDefaults.typography as any,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        ogImage: dto.ogImage,
        favicon: dto.favicon,
        customCss: dto.customCss,
        customJs: dto.customJs,
        googleAnalyticsId: dto.googleAnalyticsId,
        facebookPixelId: dto.facebookPixelId,
        status: LandingPageStatus.DRAFT,
        hostingType: LandingPageHosting.PLATFORM,
      },
      include: {
        sections: true,
        domains: true,
      },
    });

    return this.findOne(companyId, page.id);
  }

  /**
   * Update a landing page
   */
  async update(companyId: string, pageId: string, dto: UpdateLandingPageDto, userId: string): Promise<LandingPageDetail> {
    const page = await this.prisma.landingPage.findFirst({
      where: { id: pageId, companyId },
    });

    if (!page) {
      throw new NotFoundException(`Landing page not found`);
    }

    // Check slug uniqueness if changing
    if (dto.slug && dto.slug !== page.slug) {
      const existing = await this.prisma.landingPage.findFirst({
        where: { companyId, slug: dto.slug, id: { not: pageId } },
      });
      if (existing) {
        throw new ConflictException(`A landing page with slug "${dto.slug}" already exists`);
      }
    }

    // If changing theme, update color scheme and typography to theme defaults
    let colorScheme = dto.colorScheme;
    let typography = dto.typography;
    if (dto.theme && dto.theme !== page.theme) {
      const themeDefaults = THEME_DEFAULTS[dto.theme];
      colorScheme = colorScheme || themeDefaults.colorScheme;
      typography = typography || themeDefaults.typography;
    }

    await this.prisma.landingPage.update({
      where: { id: pageId },
      data: {
        name: dto.name,
        slug: dto.slug,
        theme: dto.theme,
        colorScheme: colorScheme as any,
        typography: typography as any,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        ogImage: dto.ogImage,
        favicon: dto.favicon,
        customCss: dto.customCss,
        customJs: dto.customJs,
        googleAnalyticsId: dto.googleAnalyticsId,
        facebookPixelId: dto.facebookPixelId,
        status: dto.status,
      },
    });

    return this.findOne(companyId, pageId);
  }

  /**
   * Delete a landing page (hard delete)
   */
  async delete(companyId: string, pageId: string, userId: string): Promise<void> {
    const page = await this.prisma.landingPage.findFirst({
      where: { id: pageId, companyId },
    });

    if (!page) {
      throw new NotFoundException(`Landing page not found`);
    }

    // Delete related records first (cascade should handle this, but being explicit)
    await this.prisma.landingPageSection.deleteMany({
      where: { landingPageId: pageId },
    });
    await this.prisma.landingPageDomain.deleteMany({
      where: { landingPageId: pageId },
    });
    await this.prisma.landingPageUsage.deleteMany({
      where: { landingPageId: pageId },
    });

    await this.prisma.landingPage.delete({
      where: { id: pageId },
    });
  }

  /**
   * Add a section to a landing page
   */
  async addSection(companyId: string, pageId: string, dto: CreateSectionDto): Promise<LandingPageDetail> {
    const page = await this.prisma.landingPage.findFirst({
      where: { id: pageId, companyId },
    });

    if (!page) {
      throw new NotFoundException(`Landing page not found`);
    }

    await this.prisma.landingPageSection.create({
      data: {
        landingPageId: pageId,
        type: dto.type,
        name: dto.name,
        order: dto.order,
        content: dto.content as any,
        styles: dto.styles as any,
        enabled: dto.enabled ?? true,
        hideOnMobile: dto.hideOnMobile ?? false,
        hideOnDesktop: dto.hideOnDesktop ?? false,
      },
    });

    return this.findOne(companyId, pageId);
  }

  /**
   * Update a section
   */
  async updateSection(
    companyId: string,
    pageId: string,
    sectionId: string,
    dto: UpdateSectionDto,
  ): Promise<LandingPageDetail> {
    const section = await this.prisma.landingPageSection.findFirst({
      where: {
        id: sectionId,
        landingPageId: pageId,
        landingPage: { companyId },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section not found`);
    }

    await this.prisma.landingPageSection.update({
      where: { id: sectionId },
      data: {
        name: dto.name,
        order: dto.order,
        content: dto.content as any,
        styles: dto.styles as any,
        enabled: dto.enabled,
        hideOnMobile: dto.hideOnMobile,
        hideOnDesktop: dto.hideOnDesktop,
      },
    });

    return this.findOne(companyId, pageId);
  }

  /**
   * Delete a section (hard delete)
   */
  async deleteSection(companyId: string, pageId: string, sectionId: string): Promise<LandingPageDetail> {
    const section = await this.prisma.landingPageSection.findFirst({
      where: {
        id: sectionId,
        landingPageId: pageId,
        landingPage: { companyId },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section not found`);
    }

    await this.prisma.landingPageSection.delete({
      where: { id: sectionId },
    });

    return this.findOne(companyId, pageId);
  }

  /**
   * Reorder sections
   */
  async reorderSections(companyId: string, pageId: string, sectionIds: string[]): Promise<LandingPageDetail> {
    const page = await this.prisma.landingPage.findFirst({
      where: { id: pageId, companyId },
      include: { sections: true },
    });

    if (!page) {
      throw new NotFoundException(`Landing page not found`);
    }

    // Validate all section IDs belong to this page
    const pageSectionIds = new Set(page.sections.map(s => s.id));
    for (const id of sectionIds) {
      if (!pageSectionIds.has(id)) {
        throw new BadRequestException(`Section ${id} does not belong to this page`);
      }
    }

    // Update order for each section
    await Promise.all(
      sectionIds.map((id, index) =>
        this.prisma.landingPageSection.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );

    return this.findOne(companyId, pageId);
  }

  /**
   * Duplicate a landing page
   */
  async duplicate(companyId: string, pageId: string, newName: string, userId: string): Promise<LandingPageDetail> {
    const original = await this.findOne(companyId, pageId);

    // Generate unique slug
    let slug = `${original.slug}-copy`;
    let counter = 1;
    while (await this.prisma.landingPage.findFirst({ where: { companyId, slug } })) {
      slug = `${original.slug}-copy-${counter}`;
      counter++;
    }

    // Create the duplicate
    const newPage = await this.prisma.landingPage.create({
      data: {
        companyId,
        name: newName,
        slug,
        theme: original.theme,
        colorScheme: original.colorScheme as any,
        typography: original.typography as any,
        metaTitle: original.metaTitle,
        metaDescription: original.metaDescription,
        ogImage: original.ogImage,
        favicon: original.favicon,
        customCss: original.customCss,
        customJs: original.customJs,
        googleAnalyticsId: original.googleAnalyticsId,
        facebookPixelId: original.facebookPixelId,
        status: LandingPageStatus.DRAFT,
        hostingType: LandingPageHosting.PLATFORM,
      },
    });

    // Duplicate sections
    for (const section of original.sections) {
      await this.prisma.landingPageSection.create({
        data: {
          landingPageId: newPage.id,
          type: section.type,
          name: section.name,
          order: section.order,
          content: section.content as any,
          styles: section.styles as any,
          enabled: section.enabled,
          hideOnMobile: section.hideOnMobile,
          hideOnDesktop: section.hideOnDesktop,
        },
      });
    }

    return this.findOne(companyId, newPage.id);
  }

  /**
   * Create a landing page from a pre-built template
   */
  async createFromTemplate(
    companyId: string,
    templateId: string,
    name: string,
    slug: string,
    userId: string,
  ): Promise<LandingPageDetail> {
    // Get the template
    const template = PAGE_TEMPLATES[templateId];
    if (!template) {
      throw new BadRequestException(`Template "${templateId}" not found`);
    }

    // Create the page with the template's theme
    const page = await this.create(
      companyId,
      { name, slug, theme: template.theme },
      userId,
    );

    // Add all template sections
    for (const section of template.sections) {
      await this.addSection(companyId, page.id, {
        type: section.type,
        name: section.name,
        order: section.order,
        content: section.content,
        enabled: section.enabled,
      });
    }

    return this.findOne(companyId, page.id);
  }

  /**
   * Get list of available templates
   */
  getTemplates(): PageTemplate[] {
    return TEMPLATE_LIST;
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(templateId: string): PageTemplate | undefined {
    return PAGE_TEMPLATES[templateId];
  }

  /**
   * Create a blank page with minimal sections
   */
  async createBlankPage(
    companyId: string,
    name: string,
    slug: string,
    theme: LandingPageTheme,
    userId: string,
  ): Promise<LandingPageDetail> {
    const page = await this.create(companyId, { name, slug, theme }, userId);

    // Add minimal starter sections
    const starterSections = [
      {
        type: SectionType.HEADER,
        content: { logoText: 'Your Brand' },
      },
      {
        type: SectionType.HERO_CENTERED,
        content: {
          headline: 'Welcome to Your New Landing Page',
          subheadline: 'Start customizing with the page builder',
        },
      },
      {
        type: SectionType.FOOTER,
        content: { logoText: 'Your Brand', copyright: `© ${new Date().getFullYear()} Your Brand` },
      },
    ];

    for (let i = 0; i < starterSections.length; i++) {
      await this.addSection(companyId, page.id, {
        type: starterSections[i].type,
        order: i,
        content: starterSections[i].content as any,
        enabled: true,
      });
    }

    return this.findOne(companyId, page.id);
  }
}
