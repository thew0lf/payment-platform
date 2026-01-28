import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ProductCatalog,
  CatalogMode,
  CatalogSort,
  DEFAULT_PRODUCT_CATALOG,
} from '../types/cart-theme.types';

export interface ProductWithDetails {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  images: unknown; // JSON array of image URLs
  status: string;
  trackInventory: boolean;
  stockQuantity: number;
  tags: Array<{ tag: { id: string; name: string } }>;
}

export interface CatalogProduct extends ProductWithDetails {
  sortOrder: number;
  inStock: boolean;
}

@Injectable()
export class ProductCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get product catalog configuration for a landing page
   */
  async getProductCatalog(landingPageId: string): Promise<ProductCatalog> {
    const landingPage = await this.prisma.landingPage.findUnique({
      where: { id: landingPageId },
      select: { productCatalog: true },
    });

    if (!landingPage) {
      throw new NotFoundException('Hmm, we can\'t find that landing page. It may have been removed or the link might be incorrect.');
    }

    const catalog = landingPage.productCatalog as Partial<ProductCatalog> | null;
    return { ...DEFAULT_PRODUCT_CATALOG, ...catalog };
  }

  /**
   * Update product catalog configuration
   */
  async updateProductCatalog(
    landingPageId: string,
    companyId: string,
    updates: Partial<ProductCatalog>,
  ): Promise<ProductCatalog> {
    const landingPage = await this.prisma.landingPage.findFirst({
      where: {
        id: landingPageId,
        companyId,
        deletedAt: null,
      },
      select: { productCatalog: true },
    });

    if (!landingPage) {
      throw new NotFoundException('Hmm, we can\'t find that landing page. It may have been removed or doesn\'t belong to your company.');
    }

    const existing = landingPage.productCatalog as Partial<ProductCatalog> | null;
    const newCatalog: ProductCatalog = {
      ...DEFAULT_PRODUCT_CATALOG,
      ...existing,
      ...updates,
    };

    await this.prisma.landingPage.update({
      where: { id: landingPageId },
      data: { productCatalog: newCatalog as unknown as object },
    });

    return newCatalog;
  }

  /**
   * Get resolved products for a landing page based on catalog config
   */
  async getProducts(
    landingPageId: string,
    companyId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{
    products: CatalogProduct[];
    total: number;
    catalog: ProductCatalog;
  }> {
    const landingPage = await this.prisma.landingPage.findFirst({
      where: {
        id: landingPageId,
        companyId,
        deletedAt: null,
      },
      select: {
        productCatalog: true,
        catalogProducts: {
          select: {
            productId: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!landingPage) {
      throw new NotFoundException('Hmm, we can\'t find that landing page. It may have been removed or doesn\'t belong to your company.');
    }

    const catalog: ProductCatalog = {
      ...DEFAULT_PRODUCT_CATALOG,
      ...(landingPage.productCatalog as Partial<ProductCatalog> | null),
    };

    const { page = 1, limit = 50 } = options || {};
    const skip = (page - 1) * limit;

    // Build product query based on mode
    const products = await this.queryProducts(
      companyId,
      catalog,
      landingPage.catalogProducts,
      skip,
      limit,
    );

    const total = await this.countProducts(
      companyId,
      catalog,
      landingPage.catalogProducts,
    );

    return { products, total, catalog };
  }

  /**
   * Add products to catalog (for SELECTED mode)
   */
  async addProducts(
    landingPageId: string,
    companyId: string,
    productIds: string[],
  ): Promise<void> {
    // Verify landing page and products belong to company
    const [landingPage, products] = await Promise.all([
      this.prisma.landingPage.findFirst({
        where: { id: landingPageId, companyId, deletedAt: null },
      }),
      this.prisma.product.findMany({
        where: { id: { in: productIds }, companyId, deletedAt: null },
        select: { id: true },
      }),
    ]);

    if (!landingPage) {
      throw new NotFoundException('Hmm, we can\'t find that landing page. It may have been removed or doesn\'t belong to your company.');
    }

    const validProductIds = products.map((p) => p.id);

    // Get max sort order
    const maxOrder = await this.prisma.landingPageProduct.aggregate({
      where: { landingPageId },
      _max: { sortOrder: true },
    });

    let sortOrder = (maxOrder._max.sortOrder || 0) + 1;

    // Create landing page product entries
    await this.prisma.landingPageProduct.createMany({
      data: validProductIds.map((productId) => ({
        landingPageId,
        productId,
        sortOrder: sortOrder++,
      })),
      skipDuplicates: true,
    });

    // Update catalog mode to SELECTED if not already
    await this.updateProductCatalog(landingPageId, companyId, {
      mode: 'SELECTED',
      selectedProductIds: [
        ...((landingPage as unknown as { productCatalog: ProductCatalog })
          .productCatalog?.selectedProductIds || []),
        ...validProductIds,
      ],
    });
  }

  /**
   * Remove products from catalog
   */
  async removeProducts(
    landingPageId: string,
    companyId: string,
    productIds: string[],
  ): Promise<void> {
    const landingPage = await this.prisma.landingPage.findFirst({
      where: { id: landingPageId, companyId, deletedAt: null },
    });

    if (!landingPage) {
      throw new NotFoundException('Hmm, we can\'t find that landing page. It may have been removed or doesn\'t belong to your company.');
    }

    await this.prisma.landingPageProduct.deleteMany({
      where: {
        landingPageId,
        productId: { in: productIds },
      },
    });
  }

  /**
   * Reorder products in catalog
   */
  async reorderProducts(
    landingPageId: string,
    companyId: string,
    productIds: string[],
  ): Promise<void> {
    const landingPage = await this.prisma.landingPage.findFirst({
      where: { id: landingPageId, companyId, deletedAt: null },
    });

    if (!landingPage) {
      throw new NotFoundException('Hmm, we can\'t find that landing page. It may have been removed or doesn\'t belong to your company.');
    }

    // Update sort orders in transaction
    await this.prisma.$transaction(
      productIds.map((productId, index) =>
        this.prisma.landingPageProduct.updateMany({
          where: { landingPageId, productId },
          data: { sortOrder: index },
        }),
      ),
    );

    // Update selectedProductIds in catalog config
    await this.updateProductCatalog(landingPageId, companyId, {
      selectedProductIds: productIds,
      sortBy: 'MANUAL',
    });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async queryProducts(
    companyId: string,
    catalog: ProductCatalog,
    manualProducts: Array<{ productId: string; sortOrder: number }>,
    skip: number,
    take: number,
  ): Promise<CatalogProduct[]> {
    const where = this.buildProductWhere(companyId, catalog, manualProducts);
    const orderBy = this.buildProductOrderBy(catalog, manualProducts);

    const products = await this.prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: catalog.maxProducts
        ? Math.min(take, catalog.maxProducts - skip)
        : take,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        compareAtPrice: true,
        images: true,
        status: true,
        trackInventory: true,
        stockQuantity: true,
        tags: {
          select: {
            tag: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Map manual sort orders
    const sortOrderMap = new Map(
      manualProducts.map((p) => [p.productId, p.sortOrder]),
    );

    return products.map((product) => ({
      ...product,
      price: Number(product.price),
      compareAtPrice: product.compareAtPrice
        ? Number(product.compareAtPrice)
        : null,
      sortOrder: sortOrderMap.get(product.id) ?? 999,
      inStock: !product.trackInventory || product.stockQuantity > 0,
    })) as unknown as CatalogProduct[];
  }

  private async countProducts(
    companyId: string,
    catalog: ProductCatalog,
    manualProducts: Array<{ productId: string; sortOrder: number }>,
  ): Promise<number> {
    const where = this.buildProductWhere(companyId, catalog, manualProducts);
    const count = await this.prisma.product.count({ where });

    return catalog.maxProducts ? Math.min(count, catalog.maxProducts) : count;
  }

  private buildProductWhere(
    companyId: string,
    catalog: ProductCatalog,
    manualProducts: Array<{ productId: string; sortOrder: number }>,
  ) {
    const baseWhere = {
      companyId,
      deletedAt: null,
      status: 'ACTIVE' as const,
      ...(catalog.showOutOfStock
        ? {}
        : {
            OR: [{ trackInventory: false }, { quantity: { gt: 0 } }],
          }),
    };

    switch (catalog.mode) {
      case 'SELECTED':
        return {
          ...baseWhere,
          id: { in: manualProducts.map((p) => p.productId) },
        };

      case 'CATEGORY':
        return {
          ...baseWhere,
          categoryId: { in: catalog.categoryIds },
        };

      case 'TAG':
        return {
          ...baseWhere,
          tags: {
            some: { id: { in: catalog.tagIds } },
          },
        };

      case 'ALL':
      default:
        return baseWhere;
    }
  }

  private buildProductOrderBy(
    catalog: ProductCatalog,
    manualProducts: Array<{ productId: string; sortOrder: number }>,
  ): Array<Record<string, 'asc' | 'desc'>> {
    switch (catalog.sortBy) {
      case 'PRICE_ASC':
        return [{ price: 'asc' }];
      case 'PRICE_DESC':
        return [{ price: 'desc' }];
      case 'NAME_ASC':
        return [{ name: 'asc' }];
      case 'NAME_DESC':
        return [{ name: 'desc' }];
      case 'NEWEST':
        return [{ createdAt: 'desc' }];
      case 'MANUAL':
      default:
        // For manual ordering, we sort by the order in selectedProductIds
        return [{ createdAt: 'desc' }];
    }
  }
}
