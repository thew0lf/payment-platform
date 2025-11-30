import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateCategoryDto {
  name: string;
  slug?: string;
  parentId?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  level: number;
  path: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  children: CategoryTreeNode[];
}

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new category
   */
  async create(companyId: string, dto: CreateCategoryDto): Promise<any> {
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check for duplicate slug (only among non-deleted categories)
    const existing = await this.prisma.category.findFirst({
      where: { companyId, slug, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Category with slug "${slug}" already exists`);
    }

    // Calculate level and path
    let level = 0;
    let path = slug;

    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, deletedAt: null },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
      level = parent.level + 1;
      path = `${parent.path}/${slug}`;
    }

    return this.prisma.category.create({
      data: {
        companyId,
        parentId: dto.parentId,
        name: dto.name,
        slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        level,
        path,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
      },
    });
  }

  /**
   * Update a category
   */
  async update(companyId: string, categoryId: string, dto: UpdateCategoryDto): Promise<any> {
    const existing = await this.prisma.category.findFirst({
      where: { id: categoryId, companyId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    // If slug is changing, check for conflicts (only among non-deleted)
    if (dto.slug && dto.slug !== existing.slug) {
      const slugConflict = await this.prisma.category.findFirst({
        where: { companyId, slug: dto.slug, deletedAt: null, id: { not: categoryId } },
      });
      if (slugConflict) {
        throw new ConflictException(`Category with slug "${dto.slug}" already exists`);
      }
    }

    // Handle parent change - rebuild path
    let updateData: Prisma.CategoryUpdateInput = {
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      imageUrl: dto.imageUrl,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
    };

    if (dto.parentId !== undefined && dto.parentId !== existing.parentId) {
      if (dto.parentId) {
        const newParent = await this.prisma.category.findUnique({
          where: { id: dto.parentId },
        });
        if (!newParent) {
          throw new NotFoundException('New parent category not found');
        }
        updateData.level = newParent.level + 1;
        updateData.path = `${newParent.path}/${dto.slug || existing.slug}`;
        updateData.parent = { connect: { id: dto.parentId } };
      } else {
        updateData.level = 0;
        updateData.path = dto.slug || existing.slug;
        updateData.parent = { disconnect: true };
      }
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: updateData,
    });
  }

  /**
   * Get all categories as a flat list
   */
  async findAll(companyId: string, includeInactive = false): Promise<any[]> {
    const where: Prisma.CategoryWhereInput = { companyId, deletedAt: null };
    if (!includeInactive) {
      where.isActive = true;
    }

    return this.prisma.category.findMany({
      where,
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  /**
   * Get category tree structure
   */
  async getTree(companyId: string): Promise<CategoryTreeNode[]> {
    const categories = await this.prisma.category.findMany({
      where: { companyId, isActive: true, deletedAt: null },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    // Build tree structure
    const categoryMap = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    // First pass: create nodes
    for (const cat of categories) {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description || undefined,
        imageUrl: cat.imageUrl || undefined,
        level: cat.level,
        path: cat.path,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
        productCount: cat._count.products,
        children: [],
      });
    }

    // Second pass: build hierarchy
    for (const cat of categories) {
      const node = categoryMap.get(cat.id)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * Get a single category by ID
   */
  async findById(companyId: string, categoryId: string): Promise<any> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, companyId, deletedAt: null },
      include: {
        parent: true,
        children: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Delete a category (soft delete)
   */
  async delete(companyId: string, categoryId: string, deletedBy?: string): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, companyId, deletedAt: null },
      include: {
        children: {
          where: { deletedAt: null },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Prevent deletion if has active children
    if (category.children.length > 0) {
      throw new ConflictException('Cannot delete category with subcategories');
    }

    // Soft delete the category (keep product associations for audit trail)
    await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
