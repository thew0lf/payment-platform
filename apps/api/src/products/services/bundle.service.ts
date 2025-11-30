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
import { BundleType, BundlePricing, AdjustmentType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  CreateBundleDto,
  UpdateBundleDto,
  AddBundleItemDto,
  UpdateBundleItemDto,
} from '../dto/bundle.dto';

export interface PriceCalculation {
  basePrice: number;
  itemsTotal: number;
  discountAmount: number;
  finalPrice: number;
  breakdown: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

@Injectable()
export class BundleService {
  private readonly logger = new Logger(BundleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  /**
   * List all bundles for a company
   */
  async listBundles(
    companyId: string,
    user: UserContext,
    filters?: { type?: BundleType; isActive?: boolean },
  ) {
    await this.validateCompanyAccess(user, companyId);

    const where: any = { companyId, deletedAt: null };

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.bundle.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, price: true },
            },
            variant: {
              select: { id: true, name: true, sku: true, price: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single bundle by ID
   */
  async getBundle(id: string, user: UserContext) {
    const bundle = await this.prisma.bundle.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true, companyId: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, price: true },
            },
            variant: {
              select: { id: true, name: true, sku: true, price: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!bundle || bundle.deletedAt) {
      throw new NotFoundException('Bundle not found');
    }

    await this.validateCompanyAccess(user, bundle.companyId);

    return bundle;
  }

  /**
   * Get bundle by product ID
   */
  async getBundleByProduct(productId: string, user: UserContext) {
    const bundle = await this.prisma.bundle.findUnique({
      where: { productId },
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true, companyId: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, price: true },
            },
            variant: {
              select: { id: true, name: true, sku: true, price: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!bundle || bundle.deletedAt) {
      return null;
    }

    await this.validateCompanyAccess(user, bundle.companyId);

    return bundle;
  }

  /**
   * Create a new bundle
   */
  async createBundle(dto: CreateBundleDto, user: UserContext) {
    // Verify product exists and get company
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, companyId: true, deletedAt: true },
    });

    if (!product || product.deletedAt) {
      throw new BadRequestException('Product not found');
    }

    await this.validateCompanyAccess(user, product.companyId);

    // Check if product already has a bundle
    const existing = await this.prisma.bundle.findUnique({
      where: { productId: dto.productId },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException('Product already has a bundle configuration');
    }

    // Validate min/max for mix-and-match
    if (dto.type === 'MIX_AND_MATCH') {
      if (!dto.minItems || !dto.maxItems) {
        throw new BadRequestException(
          'Mix-and-match bundles require minItems and maxItems',
        );
      }
      if (dto.minItems > dto.maxItems) {
        throw new BadRequestException(
          'minItems cannot be greater than maxItems',
        );
      }
    }

    // If existing but soft-deleted, restore it with new data
    if (existing && existing.deletedAt) {
      const bundle = await this.prisma.bundle.update({
        where: { id: existing.id },
        data: {
          type: dto.type || 'FIXED',
          pricingStrategy: dto.pricingStrategy || 'FIXED',
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          minItems: dto.minItems,
          maxItems: dto.maxItems,
          isActive: dto.isActive ?? true,
          deletedAt: null,
          items: dto.items
            ? {
                deleteMany: {},
                create: dto.items.map((item, index) => ({
                  productId: item.productId,
                  variantId: item.variantId,
                  quantity: item.quantity || 1,
                  isRequired: item.isRequired ?? true,
                  sortOrder: index,
                  priceOverride: item.priceOverride,
                })),
              }
            : { deleteMany: {} },
        },
        include: {
          product: {
            select: { id: true, name: true, sku: true, price: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, price: true },
              },
              variant: {
                select: { id: true, name: true, sku: true, price: true },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      this.logger.log(`Restored bundle ${bundle.id} for product ${dto.productId}`);
      return bundle;
    }

    const bundle = await this.prisma.bundle.create({
      data: {
        companyId: product.companyId,
        productId: dto.productId,
        type: dto.type || 'FIXED',
        pricingStrategy: dto.pricingStrategy || 'FIXED',
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minItems: dto.minItems,
        maxItems: dto.maxItems,
        isActive: dto.isActive ?? true,
        items: dto.items
          ? {
              create: dto.items.map((item, index) => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity || 1,
                isRequired: item.isRequired ?? true,
                sortOrder: index,
                priceOverride: item.priceOverride,
              })),
            }
          : undefined,
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, price: true },
            },
            variant: {
              select: { id: true, name: true, sku: true, price: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.logger.log(`Created bundle ${bundle.id} for product ${dto.productId}`);
    return bundle;
  }

  /**
   * Update a bundle
   */
  async updateBundle(id: string, dto: UpdateBundleDto, user: UserContext) {
    const bundle = await this.getBundle(id, user);

    // Validate min/max for mix-and-match
    const newType = dto.type || bundle.type;
    if (newType === 'MIX_AND_MATCH') {
      const minItems = dto.minItems ?? bundle.minItems;
      const maxItems = dto.maxItems ?? bundle.maxItems;
      if (!minItems || !maxItems) {
        throw new BadRequestException(
          'Mix-and-match bundles require minItems and maxItems',
        );
      }
      if (minItems > maxItems) {
        throw new BadRequestException(
          'minItems cannot be greater than maxItems',
        );
      }
    }

    const updated = await this.prisma.bundle.update({
      where: { id },
      data: {
        type: dto.type,
        pricingStrategy: dto.pricingStrategy,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minItems: dto.minItems,
        maxItems: dto.maxItems,
        isActive: dto.isActive,
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, price: true },
            },
            variant: {
              select: { id: true, name: true, sku: true, price: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    this.logger.log(`Updated bundle ${id}`);
    return updated;
  }

  /**
   * Soft delete a bundle
   */
  async deleteBundle(id: string, user: UserContext) {
    await this.getBundle(id, user);

    await this.prisma.bundle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Soft deleted bundle ${id}`);
  }

  /**
   * Add item to bundle
   */
  async addItem(bundleId: string, dto: AddBundleItemDto, user: UserContext) {
    const bundle = await this.getBundle(bundleId, user);

    // Verify item product exists and belongs to same company
    const itemProduct = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, companyId: true, deletedAt: true },
    });

    if (!itemProduct || itemProduct.deletedAt) {
      throw new BadRequestException('Item product not found');
    }

    if (itemProduct.companyId !== bundle.companyId) {
      throw new BadRequestException('Item product must belong to the same company');
    }

    // If variant specified, verify it belongs to the product
    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.variantId, productId: dto.productId, deletedAt: null },
      });
      if (!variant) {
        throw new BadRequestException('Variant not found or does not belong to the product');
      }
    }

    // Check for duplicate
    const existing = await this.prisma.bundleItem.findUnique({
      where: {
        bundleId_productId_variantId: {
          bundleId,
          productId: dto.productId,
          variantId: dto.variantId || '',
        },
      },
    });

    if (existing) {
      throw new ConflictException('Item already exists in bundle');
    }

    // Get next sort order
    const lastItem = await this.prisma.bundleItem.findFirst({
      where: { bundleId },
      orderBy: { sortOrder: 'desc' },
    });

    const item = await this.prisma.bundleItem.create({
      data: {
        bundleId,
        productId: dto.productId,
        variantId: dto.variantId,
        quantity: dto.quantity || 1,
        isRequired: dto.isRequired ?? true,
        sortOrder: (lastItem?.sortOrder ?? -1) + 1,
        priceOverride: dto.priceOverride,
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true },
        },
        variant: {
          select: { id: true, name: true, sku: true, price: true },
        },
      },
    });

    this.logger.log(`Added item ${item.id} to bundle ${bundleId}`);
    return item;
  }

  /**
   * Update bundle item
   */
  async updateItem(
    bundleId: string,
    itemId: string,
    dto: UpdateBundleItemDto,
    user: UserContext,
  ) {
    await this.getBundle(bundleId, user);

    const item = await this.prisma.bundleItem.findFirst({
      where: { id: itemId, bundleId },
    });

    if (!item) {
      throw new NotFoundException('Bundle item not found');
    }

    const updated = await this.prisma.bundleItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity,
        isRequired: dto.isRequired,
        priceOverride: dto.priceOverride,
        sortOrder: dto.sortOrder,
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true },
        },
        variant: {
          select: { id: true, name: true, sku: true, price: true },
        },
      },
    });

    this.logger.log(`Updated item ${itemId} in bundle ${bundleId}`);
    return updated;
  }

  /**
   * Remove item from bundle
   */
  async removeItem(bundleId: string, itemId: string, user: UserContext) {
    await this.getBundle(bundleId, user);

    const item = await this.prisma.bundleItem.findFirst({
      where: { id: itemId, bundleId },
    });

    if (!item) {
      throw new NotFoundException('Bundle item not found');
    }

    await this.prisma.bundleItem.delete({
      where: { id: itemId },
    });

    this.logger.log(`Removed item ${itemId} from bundle ${bundleId}`);
  }

  /**
   * Reorder bundle items
   */
  async reorderItems(bundleId: string, itemIds: string[], user: UserContext) {
    await this.getBundle(bundleId, user);

    await this.prisma.$transaction(
      itemIds.map((id, index) =>
        this.prisma.bundleItem.updateMany({
          where: { id, bundleId },
          data: { sortOrder: index },
        }),
      ),
    );

    const items = await this.prisma.bundleItem.findMany({
      where: { bundleId },
      include: {
        product: {
          select: { id: true, name: true, sku: true, price: true },
        },
        variant: {
          select: { id: true, name: true, sku: true, price: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    this.logger.log(`Reordered items in bundle ${bundleId}`);
    return items;
  }

  /**
   * Calculate bundle price
   */
  async calculatePrice(
    bundleId: string,
    user: UserContext,
    selectedItems?: Array<{ productId: string; variantId?: string; quantity: number }>,
  ): Promise<PriceCalculation> {
    const bundle = await this.getBundle(bundleId, user);

    let itemsTotal = 0;
    const breakdown: PriceCalculation['breakdown'] = [];

    const itemsToProcess =
      selectedItems ||
      bundle.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId || undefined,
        quantity: i.quantity,
      }));

    for (const selected of itemsToProcess) {
      const bundleItem = bundle.items.find(
        (i) =>
          i.productId === selected.productId &&
          (i.variantId || null) === (selected.variantId || null),
      );

      if (bundleItem) {
        // Use price override if set, otherwise use variant/product price
        const basePrice = bundleItem.priceOverride
          ? Number(bundleItem.priceOverride)
          : Number(bundleItem.variant?.price || bundleItem.product?.price || 0);

        const lineTotal = basePrice * selected.quantity;

        itemsTotal += lineTotal;
        breakdown.push({
          productName:
            bundleItem.variant?.name || bundleItem.product?.name || 'Unknown',
          quantity: selected.quantity,
          unitPrice: basePrice,
          lineTotal,
        });
      }
    }

    const basePrice = Number(bundle.product?.price || 0);
    let finalPrice: number;
    let discountAmount = 0;

    switch (bundle.pricingStrategy) {
      case 'FIXED':
        // Bundle has a fixed price (the product price)
        finalPrice = basePrice;
        discountAmount = Math.max(0, itemsTotal - basePrice);
        break;

      case 'CALCULATED':
        // Sum of items with optional discount
        if (bundle.discountType && bundle.discountValue) {
          const discountVal = Number(bundle.discountValue);
          switch (bundle.discountType) {
            case 'PERCENTAGE':
              discountAmount = itemsTotal * (discountVal / 100);
              break;
            case 'FIXED_AMOUNT':
              discountAmount = discountVal;
              break;
            case 'FIXED_PRICE':
              finalPrice = discountVal;
              discountAmount = itemsTotal - discountVal;
              break;
          }
        }
        if (bundle.discountType !== 'FIXED_PRICE') {
          finalPrice = itemsTotal - discountAmount;
        }
        break;

      case 'TIERED':
        // More items = bigger discount
        const itemCount = itemsToProcess.reduce((sum, i) => sum + i.quantity, 0);
        let tierDiscount = 0;
        if (itemCount >= 5) tierDiscount = 0.15;
        else if (itemCount >= 3) tierDiscount = 0.1;
        else if (itemCount >= 2) tierDiscount = 0.05;
        discountAmount = itemsTotal * tierDiscount;
        finalPrice = itemsTotal - discountAmount;
        break;

      default:
        finalPrice = itemsTotal;
    }

    return {
      basePrice,
      itemsTotal,
      discountAmount,
      finalPrice: finalPrice!,
      breakdown,
    };
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
