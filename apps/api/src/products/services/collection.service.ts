import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CollectionType, Prisma } from '@prisma/client';

export interface CreateCollectionDto {
  name: string;
  slug?: string;
  description?: string;
  type?: CollectionType;
  rules?: CollectionRules;
  imageUrl?: string;
  bannerUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateCollectionDto extends Partial<CreateCollectionDto> {}

export interface CollectionRules {
  conditions: CollectionCondition[];
  matchType: 'ALL' | 'ANY';
}

export interface CollectionCondition {
  field: 'category' | 'tag' | 'price' | 'vendor' | 'title' | 'sku';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with';
  value: string | number;
}

export interface Collection {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description?: string;
  type: CollectionType;
  rules?: CollectionRules;
  imageUrl?: string;
  bannerUrl?: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  metaTitle?: string;
  metaDescription?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new collection
   */
  async create(companyId: string, dto: CreateCollectionDto): Promise<Collection> {
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check for duplicate slug
    const existing = await this.prisma.collection.findUnique({
      where: { companyId_slug: { companyId, slug } },
    });
    if (existing) {
      throw new ConflictException(`Collection with slug "${slug}" already exists`);
    }

    const collection = await this.prisma.collection.create({
      data: {
        companyId,
        name: dto.name,
        slug,
        description: dto.description,
        type: dto.type || 'MANUAL',
        rules: dto.rules as any,
        imageUrl: dto.imageUrl,
        bannerUrl: dto.bannerUrl,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    // For automatic collections, auto-populate
    if (dto.type === 'AUTOMATIC' && dto.rules) {
      await this.populateAutomaticCollection(collection.id, companyId, dto.rules);
    }

    return this.mapToCollection(collection);
  }

  /**
   * Update a collection
   */
  async update(
    companyId: string,
    collectionId: string,
    dto: UpdateCollectionDto,
  ): Promise<Collection> {
    const existing = await this.prisma.collection.findFirst({
      where: { id: collectionId, companyId },
    });
    if (!existing) {
      throw new NotFoundException('Collection not found');
    }

    // If slug is changing, check for conflicts
    if (dto.slug && dto.slug !== existing.slug) {
      const slugConflict = await this.prisma.collection.findUnique({
        where: { companyId_slug: { companyId, slug: dto.slug } },
      });
      if (slugConflict) {
        throw new ConflictException(`Collection with slug "${dto.slug}" already exists`);
      }
    }

    const collection = await this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        type: dto.type,
        rules: dto.rules as any,
        imageUrl: dto.imageUrl,
        bannerUrl: dto.bannerUrl,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    // Re-populate if it's an automatic collection with updated rules
    if (collection.type === 'AUTOMATIC' && dto.rules) {
      await this.populateAutomaticCollection(collection.id, companyId, dto.rules);
    }

    return this.mapToCollection(collection);
  }

  /**
   * Get all collections
   */
  async findAll(companyId: string, includeInactive = false): Promise<Collection[]> {
    const where: Prisma.CollectionWhereInput = { companyId };
    if (!includeInactive) {
      where.isActive = true;
    }

    const collections = await this.prisma.collection.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { products: true } },
      },
    });

    return collections.map(this.mapToCollection.bind(this));
  }

  /**
   * Get featured collections (published and active)
   */
  async getFeatured(companyId: string): Promise<Collection[]> {
    const collections = await this.prisma.collection.findMany({
      where: {
        companyId,
        isActive: true,
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      include: {
        _count: { select: { products: true } },
      },
    });

    return collections.map(this.mapToCollection.bind(this));
  }

  /**
   * Get a collection by ID
   */
  async findById(companyId: string, collectionId: string): Promise<Collection> {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, companyId },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return this.mapToCollection(collection);
  }

  /**
   * Delete a collection
   */
  async delete(companyId: string, collectionId: string): Promise<void> {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, companyId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    await this.prisma.$transaction([
      this.prisma.collectionProduct.deleteMany({
        where: { collectionId },
      }),
      this.prisma.collection.delete({
        where: { id: collectionId },
      }),
    ]);
  }

  // ═══════════════════════════════════════════════════════════════
  // PRODUCT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Add products to a manual collection
   */
  async addProducts(
    companyId: string,
    collectionId: string,
    productIds: string[],
  ): Promise<void> {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, companyId },
    });
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.type === 'AUTOMATIC') {
      throw new ConflictException('Cannot manually add products to an automatic collection');
    }

    // Verify products belong to company
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId },
      select: { id: true },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    // Get current max sort order
    const maxSort = await this.prisma.collectionProduct.findFirst({
      where: { collectionId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    let nextSort = (maxSort?.sortOrder ?? -1) + 1;

    // Add products (skip existing)
    for (const productId of productIds) {
      try {
        await this.prisma.collectionProduct.create({
          data: {
            collectionId,
            productId,
            sortOrder: nextSort++,
          },
        });
      } catch {
        // Skip duplicates (unique constraint)
      }
    }
  }

  /**
   * Remove products from a manual collection
   */
  async removeProducts(
    companyId: string,
    collectionId: string,
    productIds: string[],
  ): Promise<void> {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, companyId },
    });
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.type === 'AUTOMATIC') {
      throw new ConflictException('Cannot manually remove products from an automatic collection');
    }

    await this.prisma.collectionProduct.deleteMany({
      where: {
        collectionId,
        productId: { in: productIds },
      },
    });
  }

  /**
   * Reorder products in a collection
   */
  async reorderProducts(
    companyId: string,
    collectionId: string,
    productIds: string[],
  ): Promise<void> {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, companyId },
    });
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    await this.prisma.$transaction(
      productIds.map((productId, index) =>
        this.prisma.collectionProduct.updateMany({
          where: { collectionId, productId },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  /**
   * Get products in a collection
   */
  async getProducts(collectionId: string, limit = 50, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.collectionProduct.findMany({
        where: { collectionId },
        orderBy: { sortOrder: 'asc' },
        take: limit,
        skip: offset,
        include: {
          product: true,
        },
      }),
      this.prisma.collectionProduct.count({ where: { collectionId } }),
    ]);

    return {
      products: items.map((cp) => cp.product),
      total,
    };
  }

  /**
   * Refresh automatic collection membership
   */
  async refreshAutomaticCollection(companyId: string, collectionId: string): Promise<void> {
    const collection = await this.prisma.collection.findFirst({
      where: { id: collectionId, companyId },
    });
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.type !== 'AUTOMATIC') {
      throw new ConflictException('Can only refresh automatic collections');
    }

    if (collection.rules) {
      await this.populateAutomaticCollection(collectionId, companyId, collection.rules as any);
    }
  }

  /**
   * Populate automatic collection based on rules
   */
  private async populateAutomaticCollection(
    collectionId: string,
    companyId: string,
    rules: CollectionRules,
  ): Promise<void> {
    // Build where clause from rules
    const conditions = rules.conditions.map((c) => this.buildCondition(c));

    const where: Prisma.ProductWhereInput = {
      companyId,
      status: 'ACTIVE',
    };

    if (rules.matchType === 'ALL') {
      where.AND = conditions;
    } else {
      where.OR = conditions;
    }

    // Find matching products
    const products = await this.prisma.product.findMany({
      where,
      select: { id: true },
    });

    // Clear existing and add new
    await this.prisma.$transaction([
      this.prisma.collectionProduct.deleteMany({ where: { collectionId } }),
      this.prisma.collectionProduct.createMany({
        data: products.map((p, i) => ({
          collectionId,
          productId: p.id,
          sortOrder: i,
        })),
      }),
    ]);
  }

  private buildCondition(condition: CollectionCondition): Prisma.ProductWhereInput {
    const { field, operator, value } = condition;

    switch (field) {
      case 'category':
        // Use dynamic categories via categoryAssignments
        return {
          categoryAssignments: {
            some: {
              category: {
                slug: String(value),
              },
            },
          },
        };
      case 'price':
        return { price: this.buildNumericOperator(operator, Number(value)) };
      case 'title':
        return { name: this.buildOperator(operator, value) as any };
      case 'sku':
        return { sku: this.buildOperator(operator, value) as any };
      case 'tag':
        return {
          tags: {
            some: {
              tag: {
                slug: String(value),
              },
            },
          },
        };
      default:
        return {};
    }
  }

  private buildOperator(operator: string, value: string | number) {
    switch (operator) {
      case 'equals':
        return value;
      case 'not_equals':
        return { not: value };
      case 'contains':
        return { contains: String(value), mode: 'insensitive' };
      case 'starts_with':
        return { startsWith: String(value), mode: 'insensitive' };
      default:
        return value;
    }
  }

  private buildNumericOperator(operator: string, value: number) {
    switch (operator) {
      case 'equals':
        return value;
      case 'not_equals':
        return { not: value };
      case 'greater_than':
        return { gt: value };
      case 'less_than':
        return { lt: value };
      default:
        return value;
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private mapToCollection(data: any): Collection {
    return {
      id: data.id,
      companyId: data.companyId,
      name: data.name,
      slug: data.slug,
      description: data.description || undefined,
      type: data.type,
      rules: data.rules || undefined,
      imageUrl: data.imageUrl || undefined,
      bannerUrl: data.bannerUrl || undefined,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
      productCount: data._count?.products || 0,
      metaTitle: data.metaTitle || undefined,
      metaDescription: data.metaDescription || undefined,
      publishedAt: data.publishedAt || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
