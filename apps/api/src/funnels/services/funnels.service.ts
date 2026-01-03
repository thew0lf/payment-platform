import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShortIdService } from '../../common/services/short-id.service';
import {
  CreateFunnelDto,
  UpdateFunnelDto,
  CreateStageDto,
  UpdateStageDto,
  ReorderStagesDto,
  CreateVariantDto,
  UpdateVariantDto,
  FunnelQueryDto,
} from '../dto/funnel.dto';
import { FunnelStatus, FunnelType, StageType } from '../types/funnel.types';
import { Prisma } from '@prisma/client';

@Injectable()
export class FunnelsService {
  constructor(
    private prisma: PrismaService,
    private shortIdService: ShortIdService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // FUNNEL CRUD
  // ═══════════════════════════════════════════════════════════════

  async create(companyId: string, dto: CreateFunnelDto, userId: string) {
    // Generate slug if not provided
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check for duplicate slug
    const existing = await this.prisma.funnel.findUnique({
      where: { companyId_slug: { companyId, slug } },
    });

    if (existing) {
      throw new BadRequestException(`Funnel with slug "${slug}" already exists`);
    }

    // Default settings
    const defaultSettings = {
      branding: {
        primaryColor: '#000000',
      },
      urls: {},
      behavior: {
        allowBackNavigation: true,
        showProgressBar: true,
        autoSaveProgress: true,
        sessionTimeout: 30,
        abandonmentEmail: false,
      },
      seo: {},
      ai: {
        insightsEnabled: true,
        insightTiming: 'hybrid',
        actionMode: 'draft_review',
      },
    };

    // Generate unique short ID for public URL
    const shortId = this.shortIdService.generateUnique('funnel');

    // Create funnel with default stages based on type
    const funnel = await this.prisma.funnel.create({
      data: {
        companyId,
        name: dto.name,
        slug,
        shortId,
        description: dto.description,
        type: dto.type,
        settings: { ...defaultSettings, ...dto.settings } as object,
        createdBy: userId,
        stages: {
          create: this.getDefaultStagesForType(dto.type),
        },
        variants: {
          create: {
            name: 'Control',
            isControl: true,
            trafficWeight: 100,
          },
        },
      },
      include: {
        stages: { orderBy: { order: 'asc' } },
        variants: true,
      },
    });

    return {
      ...funnel,
      seoUrl: this.generateSeoSlug(funnel.slug, funnel.shortId),
    };
  }

  async findAll(query: FunnelQueryDto) {
    const where: Prisma.FunnelWhereInput = {};

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [funnels, total] = await Promise.all([
      this.prisma.funnel.findMany({
        where,
        include: {
          stages: { orderBy: { order: 'asc' } },
          _count: { select: { sessions: true, variants: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: query.limit || 20,
        skip: query.offset || 0,
      }),
      this.prisma.funnel.count({ where }),
    ]);

    return {
      items: funnels.map((f) => ({
        ...f,
        seoUrl: this.generateSeoSlug(f.slug, f.shortId),
      })),
      total,
      limit: query.limit || 20,
      offset: query.offset || 0,
    };
  }

  async findOne(id: string, companyId?: string) {
    const where: Prisma.FunnelWhereUniqueInput = { id };

    const funnel = await this.prisma.funnel.findUnique({
      where,
      include: {
        stages: { orderBy: { order: 'asc' } },
        variants: { orderBy: { createdAt: 'asc' } },
        abTests: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { sessions: true } },
      },
    });

    if (!funnel) {
      throw new NotFoundException(`Funnel with ID "${id}" not found`);
    }

    if (companyId && funnel.companyId !== companyId) {
      throw new NotFoundException(`Funnel with ID "${id}" not found`);
    }

    return {
      ...funnel,
      seoUrl: this.generateSeoSlug(funnel.slug, funnel.shortId),
    };
  }

  async findBySlug(companyId: string, slug: string) {
    const funnel = await this.prisma.funnel.findUnique({
      where: { companyId_slug: { companyId, slug } },
      include: {
        stages: { orderBy: { order: 'asc' } },
        variants: { where: { status: 'ACTIVE' } },
      },
    });

    if (!funnel) {
      throw new NotFoundException(`Funnel "${slug}" not found`);
    }

    return funnel;
  }

  /**
   * Find funnel by SEO-friendly slug for public access
   * URL format: {slug}-{shortId} e.g., "summer-sale-x7Kq3m"
   * The shortId is extracted from the end (last 6+ chars after final hyphen)
   * Includes company info for branding
   */
  async findBySeoSlug(seoSlug: string) {
    // Extract the shortId from the end of the SEO slug
    // Format: {slug}-{shortId} where shortId is minimum 6 chars
    const shortId = this.extractShortIdFromSeoSlug(seoSlug);

    if (!shortId) {
      throw new NotFoundException(`Funnel not found`);
    }

    const funnel = await this.prisma.funnel.findUnique({
      where: { shortId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
            settings: true, // Includes company.settings.brandKit for fallback branding
          },
        },
        stages: { orderBy: { order: 'asc' } },
        variants: { where: { status: 'ACTIVE' } },
      },
    });

    if (!funnel) {
      throw new NotFoundException(`Funnel not found`);
    }

    // Only return published funnels for public access
    if (funnel.status !== FunnelStatus.PUBLISHED) {
      throw new NotFoundException(`Funnel not found`);
    }

    // Increment visit count
    await this.prisma.funnel.update({
      where: { id: funnel.id },
      data: { totalVisits: { increment: 1 } },
    });

    // Return funnel with its canonical SEO URL for redirects if needed
    return {
      ...funnel,
      seoUrl: this.generateSeoSlug(funnel.slug, funnel.shortId),
    };
  }

  /**
   * Generate SEO-friendly slug: {slug}-{shortId}
   */
  generateSeoSlug(slug: string, shortId: string): string {
    return `${slug}-${shortId}`;
  }

  /**
   * Extract shortId from SEO slug
   * Tries to find a valid shortId at the end after the last hyphen
   */
  private extractShortIdFromSeoSlug(seoSlug: string): string | null {
    if (!seoSlug) return null;

    // If it's just the shortId (no slug prefix), validate and return it
    if (!seoSlug.includes('-') && seoSlug.length >= 6) {
      return this.shortIdService.isValid('funnel', seoSlug) ? seoSlug : null;
    }

    // Extract the last segment after the final hyphen
    const lastHyphenIndex = seoSlug.lastIndexOf('-');
    if (lastHyphenIndex === -1) return null;

    const potentialShortId = seoSlug.substring(lastHyphenIndex + 1);

    // Validate it's a proper shortId (minimum 6 chars, valid encoding)
    if (potentialShortId.length >= 6 && this.shortIdService.isValid('funnel', potentialShortId)) {
      return potentialShortId;
    }

    return null;
  }

  async update(id: string, dto: UpdateFunnelDto, companyId?: string) {
    const funnel = await this.findOne(id, companyId);

    // Check slug uniqueness if changing
    if (dto.slug && dto.slug !== funnel.slug) {
      const existing = await this.prisma.funnel.findUnique({
        where: { companyId_slug: { companyId: funnel.companyId, slug: dto.slug } },
      });

      if (existing) {
        throw new BadRequestException(`Funnel with slug "${dto.slug}" already exists`);
      }
    }

    return this.prisma.funnel.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        type: dto.type,
        status: dto.status,
        settings: dto.settings
          ? ({ ...(funnel.settings as object), ...dto.settings } as Prisma.InputJsonValue)
          : undefined,
      },
      include: {
        stages: { orderBy: { order: 'asc' } },
        variants: true,
      },
    });
  }

  async publish(id: string, publish: boolean, companyId?: string) {
    await this.findOne(id, companyId);

    return this.prisma.funnel.update({
      where: { id },
      data: {
        status: publish ? FunnelStatus.PUBLISHED : FunnelStatus.DRAFT,
        publishedAt: publish ? new Date() : null,
      },
    });
  }

  async delete(id: string, companyId?: string) {
    await this.findOne(id, companyId);

    return this.prisma.funnel.delete({
      where: { id },
    });
  }

  async duplicate(id: string, companyId: string, userId: string) {
    const funnel = await this.findOne(id, companyId);

    const newSlug = `${funnel.slug}-copy-${Date.now()}`;
    const newShortId = this.shortIdService.generateUnique('funnel');

    return this.prisma.funnel.create({
      data: {
        companyId,
        name: `${funnel.name} (Copy)`,
        slug: newSlug,
        shortId: newShortId,
        description: funnel.description,
        type: funnel.type,
        settings: funnel.settings as Prisma.JsonObject,
        createdBy: userId,
        stages: {
          create: funnel.stages.map((stage) => ({
            name: stage.name,
            type: stage.type,
            order: stage.order,
            config: stage.config as Prisma.JsonObject,
            themeId: stage.themeId,
            customStyles: stage.customStyles as Prisma.JsonObject | undefined,
          })),
        },
        variants: {
          create: {
            name: 'Control',
            isControl: true,
            trafficWeight: 100,
          },
        },
      },
      include: {
        stages: { orderBy: { order: 'asc' } },
        variants: true,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // STAGE CRUD
  // ═══════════════════════════════════════════════════════════════

  async createStage(funnelId: string, dto: CreateStageDto, companyId?: string) {
    await this.findOne(funnelId, companyId);

    return this.prisma.funnelStage.create({
      data: {
        funnelId,
        name: dto.name,
        type: dto.type,
        order: dto.order,
        config: (dto.config || this.getDefaultStageConfig(dto.type)) as unknown as Prisma.InputJsonValue,
        themeId: dto.themeId,
        customStyles: dto.customStyles as Prisma.InputJsonValue,
      },
    });
  }

  async updateStage(
    funnelId: string,
    stageId: string,
    dto: UpdateStageDto,
    companyId?: string,
  ) {
    await this.findOne(funnelId, companyId);

    return this.prisma.funnelStage.update({
      where: { id: stageId },
      data: {
        name: dto.name,
        order: dto.order,
        config: dto.config as unknown as Prisma.InputJsonValue,
        themeId: dto.themeId,
        customStyles: dto.customStyles as Prisma.InputJsonValue,
      },
    });
  }

  async deleteStage(funnelId: string, stageId: string, companyId?: string) {
    await this.findOne(funnelId, companyId);

    return this.prisma.funnelStage.delete({
      where: { id: stageId },
    });
  }

  async reorderStages(funnelId: string, dto: ReorderStagesDto, companyId?: string) {
    await this.findOne(funnelId, companyId);

    // Update each stage's order
    const updates = dto.stageIds.map((stageId, index) =>
      this.prisma.funnelStage.update({
        where: { id: stageId },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);

    return this.prisma.funnelStage.findMany({
      where: { funnelId },
      orderBy: { order: 'asc' },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // VARIANT CRUD
  // ═══════════════════════════════════════════════════════════════

  async createVariant(funnelId: string, dto: CreateVariantDto, companyId?: string) {
    await this.findOne(funnelId, companyId);

    return this.prisma.funnelVariant.create({
      data: {
        funnelId,
        name: dto.name,
        description: dto.description,
        isControl: dto.isControl || false,
        trafficWeight: dto.trafficWeight || 50,
        stageOverrides: dto.stageOverrides as Prisma.InputJsonValue,
      },
    });
  }

  async updateVariant(
    funnelId: string,
    variantId: string,
    dto: UpdateVariantDto,
    companyId?: string,
  ) {
    await this.findOne(funnelId, companyId);

    return this.prisma.funnelVariant.update({
      where: { id: variantId },
      data: {
        name: dto.name,
        description: dto.description,
        trafficWeight: dto.trafficWeight,
        stageOverrides: dto.stageOverrides as Prisma.InputJsonValue,
      },
    });
  }

  async deleteVariant(funnelId: string, variantId: string, companyId?: string) {
    const funnel = await this.findOne(funnelId, companyId);

    // Can't delete control variant
    const variant = funnel.variants.find((v) => v.id === variantId);
    if (variant?.isControl) {
      throw new BadRequestException('Cannot delete control variant');
    }

    return this.prisma.funnelVariant.delete({
      where: { id: variantId },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private getDefaultStagesForType(type: FunnelType) {
    switch (type) {
      case FunnelType.DIRECT_CHECKOUT:
        return [
          {
            name: 'Checkout',
            type: StageType.CHECKOUT,
            order: 0,
            config: this.getDefaultStageConfig(StageType.CHECKOUT),
          },
        ];

      case FunnelType.PRODUCT_CHECKOUT:
        return [
          {
            name: 'Products',
            type: StageType.PRODUCT_SELECTION,
            order: 0,
            config: this.getDefaultStageConfig(StageType.PRODUCT_SELECTION),
          },
          {
            name: 'Checkout',
            type: StageType.CHECKOUT,
            order: 1,
            config: this.getDefaultStageConfig(StageType.CHECKOUT),
          },
        ];

      case FunnelType.LANDING_CHECKOUT:
        return [
          {
            name: 'Landing',
            type: StageType.LANDING,
            order: 0,
            config: this.getDefaultStageConfig(StageType.LANDING),
          },
          {
            name: 'Checkout',
            type: StageType.CHECKOUT,
            order: 1,
            config: this.getDefaultStageConfig(StageType.CHECKOUT),
          },
        ];

      case FunnelType.FULL_FUNNEL:
      default:
        return [
          {
            name: 'Landing',
            type: StageType.LANDING,
            order: 0,
            config: this.getDefaultStageConfig(StageType.LANDING),
          },
          {
            name: 'Products',
            type: StageType.PRODUCT_SELECTION,
            order: 1,
            config: this.getDefaultStageConfig(StageType.PRODUCT_SELECTION),
          },
          {
            name: 'Checkout',
            type: StageType.CHECKOUT,
            order: 2,
            config: this.getDefaultStageConfig(StageType.CHECKOUT),
          },
        ];
    }
  }

  private getDefaultStageConfig(type: StageType): object {
    switch (type) {
      case StageType.LANDING:
        return {
          layout: 'hero-cta',
          sections: [],
          cta: { text: 'Get Started', style: 'solid' },
        };

      case StageType.PRODUCT_SELECTION:
        return {
          layout: 'grid',
          source: { type: 'manual', productIds: [] },
          display: {
            showPrices: true,
            showDescription: true,
            showVariants: true,
            showQuantity: true,
            showFilters: false,
            showSearch: false,
            itemsPerPage: 12,
          },
          selection: { mode: 'single', allowQuantity: true },
          cta: { text: 'Continue', position: 'fixed-bottom' },
        };

      case StageType.CHECKOUT:
        return {
          layout: 'two-column',
          fields: {
            customer: {
              email: { enabled: true, required: true },
              firstName: { enabled: true, required: true },
              lastName: { enabled: true, required: true },
              phone: { enabled: true, required: false },
              company: { enabled: false, required: false },
            },
            shipping: { enabled: true, required: true },
            billing: { enabled: true, sameAsShipping: true },
            custom: [],
          },
          payment: {
            methods: [
              { type: 'card', enabled: true },
              { type: 'paypal', enabled: true },
            ],
            showOrderSummary: true,
            allowCoupons: true,
            allowGiftCards: false,
            showTaxEstimate: true,
            showShippingEstimate: true,
          },
          trust: {
            showSecurityBadges: true,
            showGuarantee: true,
            showTestimonial: false,
          },
        };

      default:
        return {};
    }
  }
}
