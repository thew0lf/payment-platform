import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { Product } from '../types/product.types';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
} from '../dto/product.dto';

const MAX_PAGE_SIZE = 100;

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════

  async create(companyId: string, dto: CreateProductDto, userId: string): Promise<Product> {
    // Check for duplicate SKU (only among non-deleted products)
    const existing = await this.prisma.product.findFirst({
      where: { companyId, sku: dto.sku, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException(`Product with SKU ${dto.sku} already exists`);
    }

    const slug = dto.slug || this.generateSlug(dto.name);

    // Create product with category assignments in a transaction
    const product = await this.prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          companyId,
          sku: dto.sku,
          slug,
          name: dto.name,
          description: dto.description,
          weight: dto.weight,
          weightUnit: dto.weightUnit || 'oz',
          price: dto.price,
          compareAtPrice: dto.compareAtPrice,
          costPrice: dto.costPrice,
          currency: dto.currency || 'USD',
          trackInventory: dto.trackInventory ?? true,
          stockQuantity: dto.stockQuantity || 0,
          lowStockThreshold: dto.lowStockThreshold || 10,
          status: dto.status || 'ACTIVE',
          isVisible: dto.isVisible ?? true,
          images: dto.images || [],
          metaTitle: dto.metaTitle,
          metaDescription: dto.metaDescription,
        },
      });

      // Create category assignments if categoryIds provided
      if (dto.categoryIds && dto.categoryIds.length > 0) {
        await tx.productCategoryAssignment.createMany({
          data: dto.categoryIds.map((categoryId, index) => ({
            productId: newProduct.id,
            categoryId,
            isPrimary: index === 0, // First category is primary
          })),
        });
      }

      return newProduct;
    });

    const productWithCategories = await this.findById(product.id, companyId);
    this.logger.log(`Created product: ${product.name} (${product.sku}) by user ${userId}`);
    this.eventEmitter.emit('product.created', { product: productWithCategories, userId });

    return productWithCategories;
  }

  // ═══════════════════════════════════════════════════════════════
  // READ
  // ═══════════════════════════════════════════════════════════════

  async findAll(
    companyId: string | undefined,
    query: ProductQueryDto,
  ): Promise<{ products: Product[]; total: number }> {
    const where: Prisma.ProductWhereInput = { deletedAt: null };

    // Only filter by companyId if provided (undefined = all products for org/client admins)
    if (companyId) {
      where.companyId = companyId;
    }

    // Filter by dynamic category (via categoryAssignments)
    if (query.category) {
      where.categoryAssignments = {
        some: {
          category: {
            slug: query.category,
          },
        },
      };
    }
    if (query.status) where.status = query.status as any;
    if (query.inStock) where.stockQuantity = { gt: 0 };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const limit = Math.min(query.limit || 50, MAX_PAGE_SIZE);
    const offset = query.offset || 0;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          categoryAssignments: {
            include: {
              category: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products: products.map(this.mapToProduct.bind(this)),
      total,
    };
  }

  async findById(id: string, companyId: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        categoryAssignments: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return this.mapToProduct(product);
  }

  async findBySku(companyId: string, sku: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: { companyId, sku, deletedAt: null },
      include: {
        categoryAssignments: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with SKU ${sku} not found`);
    }

    return this.mapToProduct(product);
  }

  // ═══════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════

  async update(id: string, companyId: string, dto: UpdateProductDto, userId: string): Promise<Product> {
    const existing = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    // Check for duplicate SKU if changing (only among non-deleted products)
    if (dto.sku && dto.sku !== existing.sku) {
      const duplicate = await this.prisma.product.findFirst({
        where: { companyId, sku: dto.sku, id: { not: id }, deletedAt: null },
      });
      if (duplicate) {
        throw new ConflictException(`Product with SKU ${dto.sku} already exists`);
      }
    }

    // Update product with category assignments in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          sku: dto.sku,
          slug: dto.slug,
          name: dto.name,
          description: dto.description,
          price: dto.price,
          compareAtPrice: dto.compareAtPrice,
          costPrice: dto.costPrice,
          trackInventory: dto.trackInventory,
          stockQuantity: dto.stockQuantity,
          lowStockThreshold: dto.lowStockThreshold,
          status: dto.status,
          isVisible: dto.isVisible,
          images: dto.images,
          metaTitle: dto.metaTitle,
          metaDescription: dto.metaDescription,
        },
      });

      // Update category assignments if categoryIds provided
      if (dto.categoryIds !== undefined) {
        // Delete existing assignments
        await tx.productCategoryAssignment.deleteMany({
          where: { productId: id },
        });

        // Create new assignments
        if (dto.categoryIds.length > 0) {
          await tx.productCategoryAssignment.createMany({
            data: dto.categoryIds.map((categoryId, index) => ({
              productId: id,
              categoryId,
              isPrimary: index === 0,
            })),
          });
        }
      }
    });

    const productWithCategories = await this.findById(id, companyId);
    this.logger.log(`Updated product: ${productWithCategories.name} by user ${userId}`);
    this.eventEmitter.emit('product.updated', { product: productWithCategories, userId });

    return productWithCategories;
  }

  // ═══════════════════════════════════════════════════════════════
  // STOCK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async updateStock(id: string, companyId: string, quantity: number, userId: string): Promise<Product> {
    const existing = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: { stockQuantity: quantity },
    });

    this.checkLowStock(product);
    this.logger.log(`Set stock for ${product.sku} to ${quantity} by user ${userId}`);

    return this.mapToProduct(product);
  }

  async adjustStock(
    id: string,
    companyId: string,
    adjustment: number,
    userId: string,
    reason?: string,
  ): Promise<Product> {
    const existing = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    const newQuantity = existing.stockQuantity + adjustment;
    if (newQuantity < 0) {
      throw new ConflictException('Cannot reduce stock below zero');
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: { stockQuantity: newQuantity },
    });

    this.checkLowStock(product);
    this.logger.log(
      `Adjusted stock for ${product.sku} by ${adjustment} (${reason || 'no reason'}) by user ${userId}`,
    );

    return this.mapToProduct(product);
  }

  private checkLowStock(product: any): void {
    if (product.trackInventory && product.stockQuantity <= product.lowStockThreshold) {
      this.eventEmitter.emit('product.low_stock', {
        product: this.mapToProduct(product),
        stockQuantity: product.stockQuantity,
        threshold: product.lowStockThreshold,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DELETE (Archive)
  // ═══════════════════════════════════════════════════════════════

  async archive(id: string, companyId: string, userId: string): Promise<void> {
    const existing = await this.prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    await this.prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    this.logger.log(`Archived product: ${existing.sku} by user ${userId}`);
    this.eventEmitter.emit('product.archived', { productId: id, userId });
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

  private mapToProduct(data: any): Product {
    // Map dynamic categories from categoryAssignments
    const categories = data.categoryAssignments?.map((assignment: any) => ({
      id: assignment.category.id,
      name: assignment.category.name,
      slug: assignment.category.slug,
      isPrimary: assignment.isPrimary,
    })) || [];

    return {
      id: data.id,
      companyId: data.companyId,
      sku: data.sku,
      slug: data.slug,
      name: data.name,
      description: data.description,
      categories, // Dynamic categories
      weight: data.weight ? Number(data.weight) : undefined,
      weightUnit: data.weightUnit,
      price: Number(data.price),
      compareAtPrice: data.compareAtPrice ? Number(data.compareAtPrice) : undefined,
      costPrice: data.costPrice ? Number(data.costPrice) : undefined,
      currency: data.currency,
      isSubscribable: data.isSubscribable,
      subscriptionDiscount: data.subscriptionDiscount ? Number(data.subscriptionDiscount) : undefined,
      trackInventory: data.trackInventory,
      stockQuantity: data.stockQuantity,
      lowStockThreshold: data.lowStockThreshold,
      status: data.status,
      isVisible: data.isVisible,
      images: data.images || [],
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
