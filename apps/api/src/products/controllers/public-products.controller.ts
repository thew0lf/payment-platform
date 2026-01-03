import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Product } from '../types/product.types';

interface PublicProductQueryDto {
  companyId: string;
  ids?: string;
  category?: string;
  limit?: string;
  offset?: string;
  search?: string;
}

/**
 * Public products controller - no authentication required.
 * Used by storefronts and funnels to display products.
 */
@Controller('products/public')
export class PublicProductsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query() query: PublicProductQueryDto,
  ): Promise<{ items: Product[]; total: number }> {
    if (!query.companyId) {
      throw new BadRequestException('companyId is required');
    }

    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    // Build product IDs filter if provided
    const productIds = query.ids ? query.ids.split(',').filter(Boolean) : undefined;

    const where: any = {
      companyId: query.companyId,
      status: 'ACTIVE',
      isVisible: true,
      deletedAt: null,
    };

    if (productIds?.length) {
      where.id = { in: productIds };
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          productImages: {
            orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Transform to public-safe format (strip internal fields)
    const publicProducts = products.map((p) => this.toPublicProduct(p));

    return {
      items: publicProducts,
      total,
    };
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        status: 'ACTIVE',
        isVisible: true,
        deletedAt: null,
      },
      include: {
        productImages: {
          orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.toPublicProduct(product);
  }

  /**
   * Transform product to public-safe format
   * Converts Prisma model to our Product interface and strips sensitive data
   */
  private toPublicProduct(product: any): Product {
    // Map dynamic categories from categoryAssignments
    const categories = product.categoryAssignments?.map((assignment: any) => ({
      id: assignment.category.id,
      name: assignment.category.name,
      slug: assignment.category.slug,
      isPrimary: assignment.isPrimary,
    })) || [];

    // Build images array from productImages relation (preferred) or JSON field (fallback)
    let images: Array<{ id: string; url: string; alt?: string; position: number }> = [];

    if (product.productImages && product.productImages.length > 0) {
      // Use ProductImage relation data (includes thumbnails, CDN URLs)
      images = product.productImages.map((img: any, index: number) => ({
        id: img.id,
        url: img.cdnUrl || img.originalUrl, // Prefer CDN URL
        alt: img.altText || undefined,
        position: img.position ?? index,
        // Include thumbnails for responsive loading
        thumbnails: {
          small: img.thumbnailSmall,
          medium: img.thumbnailMedium,
          large: img.thumbnailLarge,
        },
      }));
    } else if (product.images && Array.isArray(product.images)) {
      // Fallback to JSON field (legacy or simple products)
      images = product.images.map((url: string, index: number) => ({
        id: `legacy-${index}`,
        url,
        position: index,
      }));
    }

    return {
      id: product.id,
      companyId: product.companyId,
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      description: product.description || undefined,
      categories, // Dynamic categories
      weight: product.weight ? Number(product.weight) : undefined,
      weightUnit: product.weightUnit || 'oz',
      price: Number(product.price),
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : undefined,
      // costPrice intentionally omitted for public API
      currency: product.currency,
      isSubscribable: product.isSubscribable,
      subscriptionDiscount: product.subscriptionDiscount ? Number(product.subscriptionDiscount) : undefined,
      trackInventory: product.trackInventory,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      status: product.status,
      isVisible: product.isVisible,
      images,
      metaTitle: product.metaTitle || undefined,
      metaDescription: product.metaDescription || undefined,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
