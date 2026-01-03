/**
 * Sales Channel Service
 * Manages sales channels and product publishing
 * Part of Shopify-Inspired Product Management
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SalesChannelType, Prisma } from '@prisma/client';

// ============================================================
// DTOs
// ============================================================

export interface CreateSalesChannelDto {
  name: string;
  slug?: string;
  type: SalesChannelType;
  description?: string;
  iconUrl?: string;
  settings?: Record<string, unknown>;
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface UpdateSalesChannelDto {
  name?: string;
  slug?: string;
  description?: string;
  iconUrl?: string;
  settings?: Record<string, unknown>;
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface PublishProductToChannelDto {
  channelId: string;
  isPublished?: boolean;
  channelPrice?: number;
  isVisible?: boolean;
}

export interface BulkPublishDto {
  productIds: string[];
  channelId: string;
  isPublished: boolean;
}

export interface SalesChannelResponse {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  type: SalesChannelType;
  description?: string;
  iconUrl?: string;
  settings?: Record<string, unknown>;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  productCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductChannelResponse {
  id: string;
  productId: string;
  channelId: string;
  channel: SalesChannelResponse;
  isPublished: boolean;
  publishedAt?: Date;
  channelPrice?: number;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Service
// ============================================================

@Injectable()
export class SalesChannelService {
  private readonly logger = new Logger(SalesChannelService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // Sales Channel CRUD
  // ============================================================

  /**
   * Validates slug format - lowercase letters, numbers, and hyphens only
   */
  private validateSlug(slug: string): void {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new BadRequestException(
        'The URL-friendly name (slug) must contain only lowercase letters, numbers, and hyphens (e.g., "online-store").',
      );
    }
    if (slug.length > 64) {
      throw new BadRequestException(
        'The URL-friendly name (slug) must be 64 characters or less.',
      );
    }
  }

  /**
   * Create a new sales channel
   */
  async create(
    companyId: string,
    dto: CreateSalesChannelDto,
  ): Promise<SalesChannelResponse> {
    const slug = dto.slug || this.generateSlug(dto.name);

    // Validate slug format
    this.validateSlug(slug);

    // Use transaction to prevent race conditions with default channel
    return this.prisma.$transaction(async (tx) => {
      // Check for duplicate slug (only among non-deleted channels)
      const existing = await tx.salesChannel.findFirst({
        where: { companyId, slug, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(
          `A sales channel with the URL "${slug}" already exists. Try a different name or custom URL.`,
        );
      }

      // If this is set as default, unset other defaults
      if (dto.isDefault) {
        await tx.salesChannel.updateMany({
          where: { companyId, isDefault: true, deletedAt: null },
          data: { isDefault: false },
        });
      }

      // Get highest sortOrder
      const lastChannel = await tx.salesChannel.findFirst({
        where: { companyId, deletedAt: null },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      const sortOrder = dto.sortOrder ?? (lastChannel?.sortOrder ?? -1) + 1;

      const channel = await tx.salesChannel.create({
        data: {
          companyId,
          name: dto.name,
          slug,
          type: dto.type,
          description: dto.description,
          iconUrl: dto.iconUrl,
          settings: dto.settings
            ? (dto.settings as Prisma.InputJsonValue)
            : undefined,
          isActive: dto.isActive ?? true,
          isDefault: dto.isDefault ?? false,
          sortOrder,
        },
      });

      return this.formatChannelResponse(channel);
    });
  }

  /**
   * Get all sales channels for a company
   */
  async findAll(
    companyId: string,
    includeInactive = false,
  ): Promise<SalesChannelResponse[]> {
    const where: Prisma.SalesChannelWhereInput = {
      companyId,
      deletedAt: null,
    };
    if (!includeInactive) {
      where.isActive = true;
    }

    const channels = await this.prisma.salesChannel.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            products: {
              where: { isPublished: true },
            },
          },
        },
      },
    });

    return channels.map((c) => ({
      ...this.formatChannelResponse(c),
      productCount: c._count.products,
    }));
  }

  /**
   * Get a single sales channel by ID
   */
  async findById(
    companyId: string,
    channelId: string,
  ): Promise<SalesChannelResponse> {
    const channel = await this.prisma.salesChannel.findFirst({
      where: { id: channelId, companyId, deletedAt: null },
      include: {
        _count: {
          select: {
            products: {
              where: { isPublished: true },
            },
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException(
        'We couldn\'t find this sales channel. It may have been deleted or you may not have access to it.',
      );
    }

    return {
      ...this.formatChannelResponse(channel),
      productCount: channel._count.products,
    };
  }

  /**
   * Update a sales channel
   */
  async update(
    companyId: string,
    channelId: string,
    dto: UpdateSalesChannelDto,
  ): Promise<SalesChannelResponse> {
    // Validate slug format if provided
    if (dto.slug) {
      this.validateSlug(dto.slug);
    }

    // Use transaction to prevent race conditions with default channel
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.salesChannel.findFirst({
        where: { id: channelId, companyId, deletedAt: null },
      });

      if (!existing) {
        throw new NotFoundException(
          'We couldn\'t find this sales channel. It may have been deleted or you may not have access to it.',
        );
      }

      // If slug is changing, check for conflicts
      if (dto.slug && dto.slug !== existing.slug) {
        const slugConflict = await tx.salesChannel.findFirst({
          where: {
            companyId,
            slug: dto.slug,
            deletedAt: null,
            id: { not: channelId },
          },
        });
        if (slugConflict) {
          throw new ConflictException(
            `A sales channel with the URL "${dto.slug}" already exists. Try a different URL.`,
          );
        }
      }

      // If setting as default, unset other defaults
      if (dto.isDefault && !existing.isDefault) {
        await tx.salesChannel.updateMany({
          where: { companyId, isDefault: true, deletedAt: null, id: { not: channelId } },
          data: { isDefault: false },
        });
      }

      const channel = await tx.salesChannel.update({
        where: { id: channelId },
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          iconUrl: dto.iconUrl,
          settings: dto.settings
            ? (dto.settings as Prisma.InputJsonValue)
            : undefined,
          isActive: dto.isActive,
          isDefault: dto.isDefault,
          sortOrder: dto.sortOrder,
        },
      });

      return this.formatChannelResponse(channel);
    });
  }

  /**
   * Delete a sales channel (soft delete)
   */
  async delete(
    companyId: string,
    channelId: string,
    deletedBy?: string,
  ): Promise<void> {
    const existing = await this.prisma.salesChannel.findFirst({
      where: { id: channelId, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(
        'We couldn\'t find this sales channel. It may have been deleted or you may not have access to it.',
      );
    }

    // Prevent deletion of default channel
    if (existing.isDefault) {
      throw new BadRequestException(
        'You can\'t delete the default sales channel. First, set another channel as default, then try again.',
      );
    }

    await this.prisma.salesChannel.update({
      where: { id: channelId },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  /**
   * Reorder sales channels
   */
  async reorder(
    companyId: string,
    channelIds: string[],
  ): Promise<SalesChannelResponse[]> {
    await this.prisma.$transaction(
      channelIds.map((id, index) =>
        this.prisma.salesChannel.updateMany({
          where: { id, companyId, deletedAt: null },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.findAll(companyId);
  }

  // ============================================================
  // Product Publishing
  // ============================================================

  /**
   * Get all channels a product is published to
   */
  async getProductChannels(
    companyId: string,
    productId: string,
  ): Promise<ProductChannelResponse[]> {
    // Verify product exists and belongs to company
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException(
        'We couldn\'t find this product. It may have been deleted or you may not have access to it.',
      );
    }

    const productChannels = await this.prisma.productSalesChannel.findMany({
      where: { productId },
      include: { channel: true },
    });

    return productChannels.map((pc) => ({
      id: pc.id,
      productId: pc.productId,
      channelId: pc.channelId,
      channel: this.formatChannelResponse(pc.channel),
      isPublished: pc.isPublished,
      publishedAt: pc.publishedAt || undefined,
      channelPrice: pc.channelPrice ? Number(pc.channelPrice) : undefined,
      isVisible: pc.isVisible,
      createdAt: pc.createdAt,
      updatedAt: pc.updatedAt,
    }));
  }

  /**
   * Publish or update a product's presence on a channel
   */
  async publishToChannel(
    companyId: string,
    productId: string,
    dto: PublishProductToChannelDto,
  ): Promise<ProductChannelResponse> {
    // Verify product exists and belongs to company
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException(
        'We couldn\'t find this product. It may have been deleted or you may not have access to it.',
      );
    }

    // Verify channel exists and belongs to company
    const channel = await this.prisma.salesChannel.findFirst({
      where: { id: dto.channelId, companyId, deletedAt: null },
    });
    if (!channel) {
      throw new NotFoundException(
        'We couldn\'t find this sales channel. It may have been deleted or you may not have access to it.',
      );
    }

    const now = new Date();
    const isPublished = dto.isPublished ?? true;

    const productChannel = await this.prisma.productSalesChannel.upsert({
      where: {
        productId_channelId: {
          productId,
          channelId: dto.channelId,
        },
      },
      update: {
        isPublished,
        publishedAt: isPublished ? now : null,
        channelPrice: dto.channelPrice,
        isVisible: dto.isVisible ?? true,
      },
      create: {
        productId,
        channelId: dto.channelId,
        isPublished,
        publishedAt: isPublished ? now : null,
        channelPrice: dto.channelPrice,
        isVisible: dto.isVisible ?? true,
      },
      include: { channel: true },
    });

    return {
      id: productChannel.id,
      productId: productChannel.productId,
      channelId: productChannel.channelId,
      channel: this.formatChannelResponse(productChannel.channel),
      isPublished: productChannel.isPublished,
      publishedAt: productChannel.publishedAt || undefined,
      channelPrice: productChannel.channelPrice
        ? Number(productChannel.channelPrice)
        : undefined,
      isVisible: productChannel.isVisible,
      createdAt: productChannel.createdAt,
      updatedAt: productChannel.updatedAt,
    };
  }

  /**
   * Update multiple product channels at once
   */
  async updateProductChannels(
    companyId: string,
    productId: string,
    channels: PublishProductToChannelDto[],
  ): Promise<ProductChannelResponse[]> {
    for (const channel of channels) {
      await this.publishToChannel(companyId, productId, channel);
    }
    return this.getProductChannels(companyId, productId);
  }

  /**
   * Unpublish a product from a channel
   */
  async unpublishFromChannel(
    companyId: string,
    productId: string,
    channelId: string,
  ): Promise<void> {
    // Verify product exists and belongs to company
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException(
        'We couldn\'t find this product. It may have been deleted or you may not have access to it.',
      );
    }

    await this.prisma.productSalesChannel.deleteMany({
      where: { productId, channelId },
    });
  }

  /**
   * Bulk publish products to a channel
   * Uses batch loading to avoid N+1 queries
   */
  async bulkPublish(
    companyId: string,
    dto: BulkPublishDto,
  ): Promise<{ success: number; failed: number; errors?: string[] }> {
    // Verify channel exists and belongs to company
    const channel = await this.prisma.salesChannel.findFirst({
      where: { id: dto.channelId, companyId, deletedAt: null },
    });
    if (!channel) {
      throw new NotFoundException(
        'We couldn\'t find this sales channel. It may have been deleted or you may not have access to it.',
      );
    }

    if (!dto.productIds || dto.productIds.length === 0) {
      return { success: 0, failed: 0 };
    }

    // Batch load all products at once to avoid N+1 queries
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: dto.productIds },
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    const validProductIds = new Set(products.map((p) => p.id));
    const invalidProductIds = dto.productIds.filter((id) => !validProductIds.has(id));
    const errors: string[] = [];

    if (invalidProductIds.length > 0) {
      errors.push(
        `${invalidProductIds.length} product(s) couldn't be found or don't belong to this company.`,
      );
    }

    const now = new Date();
    let success = 0;
    let failed = invalidProductIds.length;

    // Process valid products in a transaction for atomicity
    if (validProductIds.size > 0) {
      try {
        await this.prisma.$transaction(
          Array.from(validProductIds).map((productId) =>
            this.prisma.productSalesChannel.upsert({
              where: {
                productId_channelId: {
                  productId,
                  channelId: dto.channelId,
                },
              },
              update: {
                isPublished: dto.isPublished,
                publishedAt: dto.isPublished ? now : null,
              },
              create: {
                productId,
                channelId: dto.channelId,
                isPublished: dto.isPublished,
                publishedAt: dto.isPublished ? now : null,
              },
            }),
          ),
        );
        success = validProductIds.size;
      } catch (error) {
        this.logger.error('Bulk publish transaction failed', error);
        failed += validProductIds.size;
        errors.push('Failed to publish products. Please try again.');
      }
    }

    return {
      success,
      failed,
      ...(errors.length > 0 && { errors }),
    };
  }

  /**
   * Get all products published to a channel
   */
  async getChannelProducts(
    companyId: string,
    channelId: string,
    options: {
      publishedOnly?: boolean;
      visibleOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ products: unknown[]; total: number }> {
    // Verify channel exists and belongs to company
    const channel = await this.prisma.salesChannel.findFirst({
      where: { id: channelId, companyId, deletedAt: null },
    });
    if (!channel) {
      throw new NotFoundException(
        'We couldn\'t find this sales channel. It may have been deleted or you may not have access to it.',
      );
    }

    const where: Prisma.ProductSalesChannelWhereInput = {
      channelId,
      product: { companyId, deletedAt: null },
    };
    if (options.publishedOnly) {
      where.isPublished = true;
    }
    if (options.visibleOnly) {
      where.isVisible = true;
    }

    const [productChannels, total] = await Promise.all([
      this.prisma.productSalesChannel.findMany({
        where,
        include: {
          product: true,
        },
        take: options.limit || 50,
        skip: options.offset || 0,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productSalesChannel.count({ where }),
    ]);

    return {
      products: productChannels.map((pc) => ({
        ...pc.product,
        channelData: {
          isPublished: pc.isPublished,
          publishedAt: pc.publishedAt,
          channelPrice: pc.channelPrice ? Number(pc.channelPrice) : undefined,
          isVisible: pc.isVisible,
        },
      })),
      total,
    };
  }

  // ============================================================
  // Helpers
  // ============================================================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private formatChannelResponse(channel: any): SalesChannelResponse {
    return {
      id: channel.id,
      companyId: channel.companyId,
      name: channel.name,
      slug: channel.slug,
      type: channel.type,
      description: channel.description || undefined,
      iconUrl: channel.iconUrl || undefined,
      settings: channel.settings as Record<string, unknown> | undefined,
      isActive: channel.isActive,
      isDefault: channel.isDefault,
      sortOrder: channel.sortOrder,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    };
  }
}
