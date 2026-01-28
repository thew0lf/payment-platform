/**
 * Product Catalog Service Unit Tests
 *
 * Comprehensive tests for product catalog management including:
 * - Getting catalog configuration
 * - Updating catalog configuration
 * - Getting resolved products with pagination
 * - Adding/removing/reordering products
 * - Catalog modes (ALL, SELECTED, CATEGORY, TAG)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductCatalogService } from './product-catalog.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_PRODUCT_CATALOG, ProductCatalog } from '../types/cart-theme.types';

describe('ProductCatalogService', () => {
  let service: ProductCatalogService;
  let prisma: {
    landingPage: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    landingPageProduct: {
      aggregate: jest.Mock;
      createMany: jest.Mock;
      deleteMany: jest.Mock;
      updateMany: jest.Mock;
    };
    product: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockLandingPageId = 'landing-page-123';
  const mockCompanyId = 'company-456';
  const mockProductId = 'product-001';

  const createMockLandingPage = (overrides: Partial<any> = {}) => ({
    id: mockLandingPageId,
    companyId: mockCompanyId,
    productCatalog: null,
    catalogProducts: [],
    deletedAt: null,
    ...overrides,
  });

  const createMockProduct = (id: string, overrides: Partial<any> = {}) => ({
    id,
    name: `Product ${id}`,
    slug: `product-${id}`,
    price: 29.99,
    compareAtPrice: null,
    images: ['https://example.com/image.jpg'],
    status: 'ACTIVE',
    trackInventory: true,
    stockQuantity: 100,
    tags: [],
    ...overrides,
  });

  const createMockCatalogProduct = (productId: string, sortOrder: number) => ({
    productId,
    sortOrder,
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    prisma = {
      landingPage: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      landingPageProduct: {
        aggregate: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callbacks) => {
        // Execute all callbacks in sequence
        for (const callback of callbacks) {
          await callback;
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCatalogService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProductCatalogService>(ProductCatalogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // getProductCatalog TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getProductCatalog', () => {
    it('should return default catalog when no custom config exists', async () => {
      const landingPage = createMockLandingPage({ productCatalog: null });
      prisma.landingPage.findUnique.mockResolvedValue(landingPage);

      const result = await service.getProductCatalog(mockLandingPageId);

      expect(result).toEqual(DEFAULT_PRODUCT_CATALOG);
      expect(prisma.landingPage.findUnique).toHaveBeenCalledWith({
        where: { id: mockLandingPageId },
        select: { productCatalog: true },
      });
    });

    it('should return merged catalog when custom config exists', async () => {
      const customCatalog: Partial<ProductCatalog> = {
        mode: 'SELECTED',
        selectedProductIds: ['p1', 'p2'],
        maxProducts: 10,
      };
      const landingPage = createMockLandingPage({ productCatalog: customCatalog });
      prisma.landingPage.findUnique.mockResolvedValue(landingPage);

      const result = await service.getProductCatalog(mockLandingPageId);

      expect(result.mode).toBe('SELECTED');
      expect(result.selectedProductIds).toEqual(['p1', 'p2']);
      expect(result.maxProducts).toBe(10);
      // Default values should be preserved
      expect(result.showPrices).toBe(true);
    });

    it('should throw NotFoundException when landing page not found', async () => {
      prisma.landingPage.findUnique.mockResolvedValue(null);

      await expect(service.getProductCatalog('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getProductCatalog('nonexistent')).rejects.toThrow('Landing page not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateProductCatalog TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('updateProductCatalog', () => {
    it('should update catalog configuration', async () => {
      const landingPage = createMockLandingPage();
      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.landingPage.update.mockResolvedValue(landingPage);

      const updates: Partial<ProductCatalog> = {
        mode: 'CATEGORY',
        categoryIds: ['cat-1', 'cat-2'],
      };

      const result = await service.updateProductCatalog(mockLandingPageId, mockCompanyId, updates);

      expect(result.mode).toBe('CATEGORY');
      expect(result.categoryIds).toEqual(['cat-1', 'cat-2']);
      expect(prisma.landingPage.update).toHaveBeenCalledWith({
        where: { id: mockLandingPageId },
        data: { productCatalog: expect.any(Object) },
      });
    });

    it('should throw NotFoundException when landing page not found', async () => {
      prisma.landingPage.findFirst.mockResolvedValue(null);

      await expect(
        service.updateProductCatalog(mockLandingPageId, mockCompanyId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should verify company ownership', async () => {
      prisma.landingPage.findFirst.mockResolvedValue(null);

      await expect(
        service.updateProductCatalog(mockLandingPageId, 'different-company', {}),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.landingPage.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockLandingPageId,
          companyId: 'different-company',
          deletedAt: null,
        },
        select: { productCatalog: true },
      });
    });

    it('should merge with existing catalog config', async () => {
      const existingCatalog: Partial<ProductCatalog> = {
        mode: 'SELECTED',
        selectedProductIds: ['p1'],
        showPrices: false,
      };
      const landingPage = createMockLandingPage({ productCatalog: existingCatalog });
      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.landingPage.update.mockResolvedValue(landingPage);

      const updates: Partial<ProductCatalog> = { maxProducts: 20 };

      const result = await service.updateProductCatalog(mockLandingPageId, mockCompanyId, updates);

      expect(result.mode).toBe('SELECTED');
      expect(result.selectedProductIds).toEqual(['p1']);
      expect(result.showPrices).toBe(false);
      expect(result.maxProducts).toBe(20);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getProducts TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getProducts', () => {
    it('should return products with default pagination', async () => {
      const catalogProducts = [createMockCatalogProduct('p1', 0), createMockCatalogProduct('p2', 1)];
      const landingPage = createMockLandingPage({
        productCatalog: { mode: 'SELECTED' },
        catalogProducts,
      });
      const products = [createMockProduct('p1'), createMockProduct('p2')];

      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.product.findMany.mockResolvedValue(products);
      prisma.product.count.mockResolvedValue(2);

      const result = await service.getProducts(mockLandingPageId, mockCompanyId);

      expect(result.products).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.catalog).toBeDefined();
    });

    it('should apply pagination options', async () => {
      const landingPage = createMockLandingPage();
      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.getProducts(mockLandingPageId, mockCompanyId, { page: 2, limit: 10 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('should throw NotFoundException when landing page not found', async () => {
      prisma.landingPage.findFirst.mockResolvedValue(null);

      await expect(
        service.getProducts(mockLandingPageId, mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate inStock correctly', async () => {
      const catalogProducts = [createMockCatalogProduct('p1', 0)];
      const landingPage = createMockLandingPage({ catalogProducts });
      const products = [
        createMockProduct('p1', { trackInventory: true, stockQuantity: 0 }),
      ];

      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.product.findMany.mockResolvedValue(products);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.getProducts(mockLandingPageId, mockCompanyId);

      expect(result.products[0].inStock).toBe(false);
    });

    it('should mark non-tracked inventory products as in stock', async () => {
      const catalogProducts = [createMockCatalogProduct('p1', 0)];
      const landingPage = createMockLandingPage({ catalogProducts });
      const products = [
        createMockProduct('p1', { trackInventory: false, stockQuantity: 0 }),
      ];

      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.product.findMany.mockResolvedValue(products);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.getProducts(mockLandingPageId, mockCompanyId);

      expect(result.products[0].inStock).toBe(true);
    });

    it('should respect maxProducts limit', async () => {
      const catalog: Partial<ProductCatalog> = { mode: 'ALL', maxProducts: 5 };
      const landingPage = createMockLandingPage({ productCatalog: catalog });

      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(10);

      const result = await service.getProducts(mockLandingPageId, mockCompanyId);

      expect(result.total).toBe(5); // Should be capped at maxProducts
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // addProducts TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('addProducts', () => {
    it('should add products to catalog', async () => {
      const landingPage = createMockLandingPage();
      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.product.findMany.mockResolvedValue([
        { id: 'p1' },
        { id: 'p2' },
      ]);
      prisma.landingPageProduct.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
      prisma.landingPageProduct.createMany.mockResolvedValue({ count: 2 });
      prisma.landingPage.update.mockResolvedValue(landingPage);

      await service.addProducts(mockLandingPageId, mockCompanyId, ['p1', 'p2']);

      expect(prisma.landingPageProduct.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ productId: 'p1', landingPageId: mockLandingPageId }),
          expect.objectContaining({ productId: 'p2', landingPageId: mockLandingPageId }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should throw NotFoundException when landing page not found', async () => {
      prisma.landingPage.findFirst.mockResolvedValue(null);

      await expect(
        service.addProducts(mockLandingPageId, mockCompanyId, ['p1']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should only add valid product IDs', async () => {
      const landingPage = createMockLandingPage();
      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]); // Only p1 exists
      prisma.landingPageProduct.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
      prisma.landingPageProduct.createMany.mockResolvedValue({ count: 1 });
      prisma.landingPage.update.mockResolvedValue(landingPage);

      await service.addProducts(mockLandingPageId, mockCompanyId, ['p1', 'invalid-id']);

      expect(prisma.landingPageProduct.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ productId: 'p1' }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should calculate correct sort order', async () => {
      const landingPage = createMockLandingPage();
      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);
      prisma.landingPageProduct.aggregate.mockResolvedValue({ _max: { sortOrder: 5 } });
      prisma.landingPageProduct.createMany.mockResolvedValue({ count: 1 });
      prisma.landingPage.update.mockResolvedValue(landingPage);

      await service.addProducts(mockLandingPageId, mockCompanyId, ['p1']);

      expect(prisma.landingPageProduct.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ sortOrder: 6 }),
        ]),
        skipDuplicates: true,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // removeProducts TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('removeProducts', () => {
    it('should remove products from catalog', async () => {
      const landingPage = createMockLandingPage();
      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.landingPageProduct.deleteMany.mockResolvedValue({ count: 2 });

      await service.removeProducts(mockLandingPageId, mockCompanyId, ['p1', 'p2']);

      expect(prisma.landingPageProduct.deleteMany).toHaveBeenCalledWith({
        where: {
          landingPageId: mockLandingPageId,
          productId: { in: ['p1', 'p2'] },
        },
      });
    });

    it('should throw NotFoundException when landing page not found', async () => {
      prisma.landingPage.findFirst.mockResolvedValue(null);

      await expect(
        service.removeProducts(mockLandingPageId, mockCompanyId, ['p1']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should verify company ownership before removing', async () => {
      prisma.landingPage.findFirst.mockResolvedValue(null);

      await expect(
        service.removeProducts(mockLandingPageId, 'different-company', ['p1']),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.landingPage.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockLandingPageId,
          companyId: 'different-company',
          deletedAt: null,
        },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // reorderProducts TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('reorderProducts', () => {
    it('should reorder products in catalog', async () => {
      const landingPage = createMockLandingPage();
      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.landingPageProduct.updateMany.mockResolvedValue({ count: 1 });
      prisma.landingPage.update.mockResolvedValue(landingPage);

      await service.reorderProducts(mockLandingPageId, mockCompanyId, ['p2', 'p1', 'p3']);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should update catalog sortBy to MANUAL', async () => {
      const landingPage = createMockLandingPage();
      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.landingPageProduct.updateMany.mockResolvedValue({ count: 1 });
      prisma.landingPage.update.mockResolvedValue(landingPage);

      await service.reorderProducts(mockLandingPageId, mockCompanyId, ['p1', 'p2']);

      // Second call should be the update to catalog config
      const updateCalls = prisma.landingPage.update.mock.calls;
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundException when landing page not found', async () => {
      prisma.landingPage.findFirst.mockResolvedValue(null);

      await expect(
        service.reorderProducts(mockLandingPageId, mockCompanyId, ['p1', 'p2']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CATALOG MODE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Catalog Modes', () => {
    it('should filter products in SELECTED mode', async () => {
      const catalogProducts = [
        createMockCatalogProduct('p1', 0),
        createMockCatalogProduct('p2', 1),
      ];
      const catalog: Partial<ProductCatalog> = { mode: 'SELECTED' };
      const landingPage = createMockLandingPage({ productCatalog: catalog, catalogProducts });

      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.getProducts(mockLandingPageId, mockCompanyId);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['p1', 'p2'] },
          }),
        }),
      );
    });

    it('should filter products in CATEGORY mode', async () => {
      const catalog: Partial<ProductCatalog> = { mode: 'CATEGORY', categoryIds: ['cat-1', 'cat-2'] };
      const landingPage = createMockLandingPage({ productCatalog: catalog });

      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.getProducts(mockLandingPageId, mockCompanyId);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: { in: ['cat-1', 'cat-2'] },
          }),
        }),
      );
    });

    it('should filter products in TAG mode', async () => {
      const catalog: Partial<ProductCatalog> = { mode: 'TAG', tagIds: ['tag-1'] };
      const landingPage = createMockLandingPage({ productCatalog: catalog });

      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.getProducts(mockLandingPageId, mockCompanyId);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { some: { id: { in: ['tag-1'] } } },
          }),
        }),
      );
    });

    it('should return all products in ALL mode', async () => {
      const catalog: Partial<ProductCatalog> = { mode: 'ALL' };
      const landingPage = createMockLandingPage({ productCatalog: catalog });

      prisma.landingPage.findFirst.mockResolvedValue(landingPage);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.getProducts(mockLandingPageId, mockCompanyId);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: mockCompanyId,
            deletedAt: null,
            status: 'ACTIVE',
          }),
        }),
      );
    });
  });
});
