import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateTagDto {
  name: string;
  slug?: string;
  color?: string;
}

export interface UpdateTagDto extends Partial<CreateTagDto> {}

export interface Tag {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  color?: string;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TagService {
  private readonly logger = new Logger(TagService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new tag
   */
  async create(companyId: string, dto: CreateTagDto): Promise<Tag> {
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check for duplicate slug
    const existing = await this.prisma.tag.findUnique({
      where: { companyId_slug: { companyId, slug } },
    });
    if (existing) {
      throw new ConflictException(`Tag with slug "${slug}" already exists`);
    }

    const tag = await this.prisma.tag.create({
      data: {
        companyId,
        name: dto.name,
        slug,
        color: dto.color,
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    return this.mapToTag(tag);
  }

  /**
   * Update a tag
   */
  async update(companyId: string, tagId: string, dto: UpdateTagDto): Promise<Tag> {
    const existing = await this.prisma.tag.findFirst({
      where: { id: tagId, companyId },
    });
    if (!existing) {
      throw new NotFoundException('Tag not found');
    }

    // If slug is changing, check for conflicts
    if (dto.slug && dto.slug !== existing.slug) {
      const slugConflict = await this.prisma.tag.findUnique({
        where: { companyId_slug: { companyId, slug: dto.slug } },
      });
      if (slugConflict) {
        throw new ConflictException(`Tag with slug "${dto.slug}" already exists`);
      }
    }

    const tag = await this.prisma.tag.update({
      where: { id: tagId },
      data: {
        name: dto.name,
        slug: dto.slug,
        color: dto.color,
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    return this.mapToTag(tag);
  }

  /**
   * Get all tags for a company
   */
  async findAll(companyId: string): Promise<Tag[]> {
    const tags = await this.prisma.tag.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });

    return tags.map(this.mapToTag.bind(this));
  }

  /**
   * Get a tag by ID
   */
  async findById(companyId: string, tagId: string): Promise<Tag> {
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, companyId },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return this.mapToTag(tag);
  }

  /**
   * Delete a tag
   */
  async delete(companyId: string, tagId: string): Promise<void> {
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, companyId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Delete tag assignments first, then the tag
    await this.prisma.$transaction([
      this.prisma.productTag.deleteMany({
        where: { tagId },
      }),
      this.prisma.tag.delete({
        where: { id: tagId },
      }),
    ]);
  }

  /**
   * Assign tags to a product
   */
  async assignToProduct(companyId: string, productId: string, tagIds: string[]): Promise<void> {
    // Verify product belongs to company
    const product = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Verify all tags belong to company
    const tags = await this.prisma.tag.findMany({
      where: { id: { in: tagIds }, companyId },
    });
    if (tags.length !== tagIds.length) {
      throw new NotFoundException('One or more tags not found');
    }

    // Remove existing assignments and create new ones
    await this.prisma.$transaction([
      this.prisma.productTag.deleteMany({
        where: { productId },
      }),
      this.prisma.productTag.createMany({
        data: tagIds.map((tagId) => ({
          productId,
          tagId,
        })),
      }),
    ]);
  }

  /**
   * Get tags for a product
   */
  async getProductTags(productId: string): Promise<Tag[]> {
    const productTags = await this.prisma.productTag.findMany({
      where: { productId },
      include: {
        tag: {
          include: {
            _count: { select: { products: true } },
          },
        },
      },
    });

    return productTags.map((pt) => this.mapToTag(pt.tag));
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private mapToTag(data: any): Tag {
    return {
      id: data.id,
      companyId: data.companyId,
      name: data.name,
      slug: data.slug,
      color: data.color || undefined,
      productCount: data._count?.products || 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
