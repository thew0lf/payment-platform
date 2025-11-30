import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { Prisma } from '@prisma/client';
import {
  CreateVariantDto,
  UpdateVariantDto,
  BulkCreateVariantsDto,
  BulkUpdateVariantsDto,
  GenerateVariantsDto,
  UpdateInventoryDto,
  ReorderVariantsDto,
} from '../dto/product-variant.dto';

@Injectable()
export class ProductVariantService {
  private readonly logger = new Logger(ProductVariantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * Get all variants for a product
   */
  async findAll(productId: string, user: UserContext, includeDeleted = false) {
    const product = await this.getProductWithAccess(productId, user);

    const variants = await this.prisma.productVariant.findMany({
      where: {
        productId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return variants;
  }

  /**
   * Get a single variant by ID
   */
  async findOne(variantId: string, user: UserContext) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: { id: true, companyId: true, name: true },
        },
        media: {
          orderBy: { sortOrder: 'asc' },
        },
        inventoryLevels: true,
      },
    });

    if (!variant || variant.deletedAt) {
      throw new NotFoundException('Variant not found');
    }

    await this.validateCompanyAccess(user, variant.product.companyId);

    return variant;
  }

  /**
   * Create a new variant for a product
   */
  async create(productId: string, dto: CreateVariantDto, user: UserContext) {
    const product = await this.getProductWithAccess(productId, user);

    // Check for duplicate SKU within product
    const existingSku = await this.prisma.productVariant.findFirst({
      where: {
        productId,
        sku: dto.sku,
        deletedAt: null,
      },
    });

    if (existingSku) {
      throw new ConflictException(`SKU "${dto.sku}" already exists for this product`);
    }

    // Get max sort order
    const maxSortOrder = await this.prisma.productVariant.aggregate({
      where: { productId, deletedAt: null },
      _max: { sortOrder: true },
    });

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        name: dto.name,
        sku: dto.sku,
        barcode: dto.barcode,
        options: dto.options as Prisma.JsonObject,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        costPrice: dto.costPrice,
        weight: dto.weight,
        trackInventory: dto.trackInventory ?? true,
        inventoryQuantity: dto.inventoryQuantity ?? 0,
        lowStockThreshold: dto.lowStockThreshold,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? (maxSortOrder._max.sortOrder ?? -1) + 1,
      },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.logger.log(`Created variant "${dto.name}" for product ${productId}`);

    return variant;
  }

  /**
   * Update a variant
   */
  async update(variantId: string, dto: UpdateVariantDto, user: UserContext) {
    const existing = await this.findOne(variantId, user);

    // Check for duplicate SKU if SKU is being changed
    if (dto.sku && dto.sku !== existing.sku) {
      const duplicateSku = await this.prisma.productVariant.findFirst({
        where: {
          productId: existing.productId,
          sku: dto.sku,
          id: { not: variantId },
          deletedAt: null,
        },
      });

      if (duplicateSku) {
        throw new ConflictException(`SKU "${dto.sku}" already exists for this product`);
      }
    }

    const variant = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        name: dto.name,
        sku: dto.sku,
        barcode: dto.barcode,
        options: dto.options as Prisma.JsonObject | undefined,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        costPrice: dto.costPrice,
        weight: dto.weight,
        trackInventory: dto.trackInventory,
        inventoryQuantity: dto.inventoryQuantity,
        lowStockThreshold: dto.lowStockThreshold,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.logger.log(`Updated variant ${variantId}`);

    return variant;
  }

  /**
   * Soft delete a variant
   */
  async remove(variantId: string, user: UserContext) {
    await this.findOne(variantId, user);

    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Soft deleted variant ${variantId}`);
  }

  /**
   * Bulk create variants
   */
  async bulkCreate(productId: string, dto: BulkCreateVariantsDto, user: UserContext) {
    await this.getProductWithAccess(productId, user);

    // Check for duplicate SKUs in the batch
    const skus = dto.variants.map(v => v.sku);
    const uniqueSkus = new Set(skus);
    if (uniqueSkus.size !== skus.length) {
      throw new BadRequestException('Duplicate SKUs in batch');
    }

    // Check for existing SKUs
    const existingSkus = await this.prisma.productVariant.findMany({
      where: {
        productId,
        sku: { in: skus },
        deletedAt: null,
      },
      select: { sku: true },
    });

    if (existingSkus.length > 0) {
      throw new ConflictException(
        `SKUs already exist: ${existingSkus.map(s => s.sku).join(', ')}`
      );
    }

    // Get max sort order
    const maxSortOrder = await this.prisma.productVariant.aggregate({
      where: { productId, deletedAt: null },
      _max: { sortOrder: true },
    });

    const variants = await this.prisma.$transaction(
      dto.variants.map((variant, index) =>
        this.prisma.productVariant.create({
          data: {
            productId,
            name: variant.name,
            sku: variant.sku,
            barcode: variant.barcode,
            options: variant.options as Prisma.JsonObject,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            costPrice: variant.costPrice,
            weight: variant.weight,
            trackInventory: variant.trackInventory ?? true,
            inventoryQuantity: variant.inventoryQuantity ?? 0,
            lowStockThreshold: variant.lowStockThreshold,
            isActive: variant.isActive ?? true,
            sortOrder: variant.sortOrder ?? (maxSortOrder._max.sortOrder ?? -1) + index + 1,
          },
        })
      )
    );

    this.logger.log(`Bulk created ${variants.length} variants for product ${productId}`);

    return variants;
  }

  /**
   * Bulk update variants
   */
  async bulkUpdate(productId: string, dto: BulkUpdateVariantsDto, user: UserContext) {
    await this.getProductWithAccess(productId, user);

    // Verify all variants belong to this product
    const variantIds = dto.variants.map(v => v.id);
    const existingVariants = await this.prisma.productVariant.findMany({
      where: {
        id: { in: variantIds },
        productId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingVariants.length !== variantIds.length) {
      throw new BadRequestException('Some variants not found or do not belong to this product');
    }

    const variants = await this.prisma.$transaction(
      dto.variants.map(variant =>
        this.prisma.productVariant.update({
          where: { id: variant.id },
          data: {
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            inventoryQuantity: variant.inventoryQuantity,
            isActive: variant.isActive,
            sortOrder: variant.sortOrder,
          },
        })
      )
    );

    this.logger.log(`Bulk updated ${variants.length} variants for product ${productId}`);

    return variants;
  }

  /**
   * Generate variant matrix from options
   */
  async generateVariants(productId: string, dto: GenerateVariantsDto, user: UserContext) {
    const product = await this.getProductWithAccess(productId, user);

    // Get the variant options with their values
    const options = await this.prisma.variantOption.findMany({
      where: {
        id: { in: dto.optionIds },
        companyId: product.companyId,
      },
      include: {
        values: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (options.length !== dto.optionIds.length) {
      throw new BadRequestException('Some options not found');
    }

    // Generate cartesian product of all values
    const combinations = this.generateCombinations(options);

    if (combinations.length === 0) {
      throw new BadRequestException('No combinations to generate');
    }

    // Get existing SKUs to avoid duplicates
    const existingVariants = await this.prisma.productVariant.findMany({
      where: { productId, deletedAt: null },
      select: { sku: true, options: true },
    });

    const existingSkuSet = new Set(existingVariants.map(v => v.sku));
    const existingOptionsSet = new Set(
      existingVariants.map(v => JSON.stringify(v.options))
    );

    // Filter out combinations that already exist
    const newCombinations = combinations.filter(
      combo => !existingOptionsSet.has(JSON.stringify(combo.options))
    );

    if (newCombinations.length === 0) {
      return { created: 0, variants: [] };
    }

    // Generate SKUs and create variants
    const skuPrefix = dto.skuPrefix || product.sku || product.name.substring(0, 10).toUpperCase();
    let skuCounter = 1;

    // Get max sort order
    const maxSortOrder = await this.prisma.productVariant.aggregate({
      where: { productId, deletedAt: null },
      _max: { sortOrder: true },
    });

    const variants = await this.prisma.$transaction(
      newCombinations.map((combo, index) => {
        // Generate unique SKU
        let sku = `${skuPrefix}-${String(skuCounter++).padStart(3, '0')}`;
        while (existingSkuSet.has(sku)) {
          sku = `${skuPrefix}-${String(skuCounter++).padStart(3, '0')}`;
        }
        existingSkuSet.add(sku);

        return this.prisma.productVariant.create({
          data: {
            productId,
            name: combo.name,
            sku,
            options: combo.options as Prisma.JsonObject,
            price: dto.defaultPrice,
            trackInventory: dto.trackInventory ?? true,
            inventoryQuantity: dto.defaultInventory ?? 0,
            isActive: true,
            sortOrder: (maxSortOrder._max.sortOrder ?? -1) + index + 1,
          },
        });
      })
    );

    this.logger.log(`Generated ${variants.length} variants for product ${productId}`);

    return {
      created: variants.length,
      variants,
    };
  }

  /**
   * Update inventory for a variant
   */
  async updateInventory(
    variantId: string,
    dto: UpdateInventoryDto,
    user: UserContext,
  ) {
    const variant = await this.findOne(variantId, user);

    if (!variant.trackInventory) {
      throw new BadRequestException('Inventory tracking is disabled for this variant');
    }

    const newQuantity = variant.inventoryQuantity + dto.quantity;
    if (newQuantity < 0) {
      throw new BadRequestException('Inventory cannot be negative');
    }

    const updated = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { inventoryQuantity: newQuantity },
    });

    this.logger.log(
      `Updated inventory for variant ${variantId}: ${variant.inventoryQuantity} -> ${newQuantity}${
        dto.reason ? ` (${dto.reason})` : ''
      }`
    );

    return updated;
  }

  /**
   * Reorder variants
   */
  async reorderVariants(productId: string, dto: ReorderVariantsDto, user: UserContext) {
    await this.getProductWithAccess(productId, user);

    await this.prisma.$transaction(
      dto.variantIds.map((id, index) =>
        this.prisma.productVariant.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    this.logger.log(`Reordered variants for product ${productId}`);
  }

  /**
   * Get variant options available for a product's company
   */
  async getAvailableOptions(productId: string, user: UserContext) {
    const product = await this.getProductWithAccess(productId, user);

    const options = await this.prisma.variantOption.findMany({
      where: { companyId: product.companyId },
      include: {
        values: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return options;
  }

  /**
   * Helper to generate cartesian product of option values
   */
  private generateCombinations(
    options: Array<{
      name: string;
      values: Array<{ value: string }>;
    }>
  ): Array<{ name: string; options: Record<string, string> }> {
    if (options.length === 0) return [];

    const result: Array<{ name: string; options: Record<string, string> }> = [];

    const generate = (
      index: number,
      current: Record<string, string>,
      nameParts: string[]
    ) => {
      if (index === options.length) {
        result.push({
          name: nameParts.join(' / '),
          options: { ...current },
        });
        return;
      }

      const option = options[index];
      for (const value of option.values) {
        current[option.name] = value.value;
        nameParts.push(value.value);
        generate(index + 1, current, nameParts);
        nameParts.pop();
      }
    };

    generate(0, {}, []);
    return result;
  }

  /**
   * Helper to get product and validate access
   */
  private async getProductWithAccess(productId: string, user: UserContext) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        companyId: true,
        name: true,
        sku: true,
        deletedAt: true,
      },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    await this.validateCompanyAccess(user, product.companyId);

    return product;
  }

  /**
   * Validate user has access to company
   */
  private async validateCompanyAccess(user: UserContext, companyId: string) {
    const hasAccess = await this.hierarchyService.canAccessCompany(user, companyId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this company');
    }
  }
}
