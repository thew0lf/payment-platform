/**
 * Cart Theme Controller Unit Tests
 *
 * Comprehensive tests for cart theme and product catalog endpoints including:
 * - Cart theme CRUD operations
 * - Product catalog management
 * - Theme presets and generation
 * - Authorization/access control
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CartThemeController } from './cart-theme.controller';
import { CartThemeService } from '../services/cart-theme.service';
import { ProductCatalogService } from '../services/product-catalog.service';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { CartTheme, CartThemePreset } from '../types/cart-theme.types';
import { CART_THEME_PRESETS } from '../constants/cart-theme-presets';

describe('CartThemeController', () => {
  let controller: CartThemeController;
  let cartThemeService: {
    getCartTheme: jest.Mock;
    updateCartTheme: jest.Mock;
    resetCartTheme: jest.Mock;
    getThemePreview: jest.Mock;
    getThemePresets: jest.Mock;
    generateFromColors: jest.Mock;
  };
  let productCatalogService: {
    getProductCatalog: jest.Mock;
    updateProductCatalog: jest.Mock;
    getProducts: jest.Mock;
    addProducts: jest.Mock;
    removeProducts: jest.Mock;
    reorderProducts: jest.Mock;
  };
  let hierarchyService: {
    canAccessCompany: jest.Mock;
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockLandingPageId = 'landing-page-123';
  const mockCompanyId = 'company-456';

  const createMockUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
    sub: 'user-123',
    id: 'user-123',
    email: 'test@example.com',
    role: 'ADMIN',
    scopeType: 'COMPANY',
    scopeId: mockCompanyId,
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: mockCompanyId,
    departmentId: undefined,
    ...overrides,
  });

  const createMockTheme = (): CartTheme => ({
    ...CART_THEME_PRESETS.STARTER,
  });

  const createMockCatalog = () => ({
    mode: 'ALL',
    selectedProductIds: [],
    categoryIds: [],
    tagIds: [],
    sortBy: 'MANUAL',
    maxProducts: null,
    showOutOfStock: false,
    showPrices: true,
    showCompareAtPrice: true,
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    cartThemeService = {
      getCartTheme: jest.fn(),
      updateCartTheme: jest.fn(),
      resetCartTheme: jest.fn(),
      getThemePreview: jest.fn(),
      getThemePresets: jest.fn(),
      generateFromColors: jest.fn(),
    };

    productCatalogService = {
      getProductCatalog: jest.fn(),
      updateProductCatalog: jest.fn(),
      getProducts: jest.fn(),
      addProducts: jest.fn(),
      removeProducts: jest.fn(),
      reorderProducts: jest.fn(),
    };

    hierarchyService = {
      canAccessCompany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartThemeController],
      providers: [
        { provide: CartThemeService, useValue: cartThemeService },
        { provide: ProductCatalogService, useValue: productCatalogService },
        { provide: HierarchyService, useValue: hierarchyService },
      ],
    }).compile();

    controller = module.get<CartThemeController>(CartThemeController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // getCartTheme TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getCartTheme', () => {
    it('should return cart theme for a landing page', async () => {
      const mockTheme = createMockTheme();
      cartThemeService.getCartTheme.mockResolvedValue(mockTheme);

      const result = await controller.getCartTheme(mockLandingPageId);

      expect(result).toEqual(mockTheme);
      expect(cartThemeService.getCartTheme).toHaveBeenCalledWith(mockLandingPageId);
    });

    it('should throw NotFoundException when landing page not found', async () => {
      cartThemeService.getCartTheme.mockRejectedValue(new NotFoundException('Landing page not found'));

      await expect(controller.getCartTheme('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateCartTheme TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('updateCartTheme', () => {
    it('should update cart theme when user has company context', async () => {
      const mockTheme = createMockTheme();
      const mockUser = createMockUser();
      cartThemeService.updateCartTheme.mockResolvedValue(mockTheme);

      const dto = { colors: { primaryButton: '#FF0000' } };
      const result = await controller.updateCartTheme(mockUser, mockLandingPageId, dto);

      expect(result).toEqual(mockTheme);
      expect(cartThemeService.updateCartTheme).toHaveBeenCalledWith(
        mockLandingPageId,
        mockCompanyId,
        dto,
      );
    });

    it('should use companyId when scopeType is CLIENT', async () => {
      const mockTheme = createMockTheme();
      const mockUser = createMockUser({ scopeType: 'CLIENT', scopeId: 'client-1' });
      cartThemeService.updateCartTheme.mockResolvedValue(mockTheme);

      const dto = { colors: { primaryButton: '#FF0000' } };
      await controller.updateCartTheme(mockUser, mockLandingPageId, dto);

      expect(cartThemeService.updateCartTheme).toHaveBeenCalledWith(
        mockLandingPageId,
        mockCompanyId,
        dto,
      );
    });

    it('should throw ForbiddenException when no company context', async () => {
      const mockUser = createMockUser({ scopeType: 'ORGANIZATION', scopeId: 'org-1', companyId: undefined });

      await expect(
        controller.updateCartTheme(mockUser, mockLandingPageId, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // resetCartTheme TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('resetCartTheme', () => {
    it('should reset cart theme to preset default', async () => {
      const mockTheme = createMockTheme();
      const mockUser = createMockUser();
      cartThemeService.resetCartTheme.mockResolvedValue(mockTheme);

      const result = await controller.resetCartTheme(mockUser, mockLandingPageId);

      expect(result).toEqual(mockTheme);
      expect(cartThemeService.resetCartTheme).toHaveBeenCalledWith(mockLandingPageId, mockCompanyId);
    });

    it('should throw ForbiddenException when no company context', async () => {
      const mockUser = createMockUser({ scopeType: 'ORGANIZATION', scopeId: 'org-1', companyId: undefined });

      await expect(controller.resetCartTheme(mockUser, mockLandingPageId)).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getCartThemePreview TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getCartThemePreview', () => {
    it('should return theme preview with CSS variables', async () => {
      const mockTheme = createMockTheme();
      const mockPreview = {
        cssVariables: { '--cart-bg': '#F9FAFB' },
        theme: mockTheme,
      };
      cartThemeService.getCartTheme.mockResolvedValue(mockTheme);
      cartThemeService.getThemePreview.mockReturnValue(mockPreview);

      const result = await controller.getCartThemePreview(mockLandingPageId);

      expect(result).toEqual(mockPreview);
      expect(cartThemeService.getCartTheme).toHaveBeenCalledWith(mockLandingPageId);
      expect(cartThemeService.getThemePreview).toHaveBeenCalledWith(mockTheme);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getProductCatalog TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getProductCatalog', () => {
    it('should return product catalog configuration', async () => {
      const mockCatalog = createMockCatalog();
      productCatalogService.getProductCatalog.mockResolvedValue(mockCatalog);

      const result = await controller.getProductCatalog(mockLandingPageId);

      expect(result).toEqual(mockCatalog);
      expect(productCatalogService.getProductCatalog).toHaveBeenCalledWith(mockLandingPageId);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateProductCatalog TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('updateProductCatalog', () => {
    it('should update product catalog configuration', async () => {
      const mockCatalog = createMockCatalog();
      const mockUser = createMockUser();
      productCatalogService.updateProductCatalog.mockResolvedValue(mockCatalog);

      const dto = { mode: 'SELECTED', selectedProductIds: ['p1', 'p2'] };
      const result = await controller.updateProductCatalog(mockUser, mockLandingPageId, dto);

      expect(result).toEqual(mockCatalog);
      expect(productCatalogService.updateProductCatalog).toHaveBeenCalledWith(
        mockLandingPageId,
        mockCompanyId,
        dto,
      );
    });

    it('should throw ForbiddenException when no company context', async () => {
      const mockUser = createMockUser({ scopeType: 'ORGANIZATION', scopeId: 'org-1', companyId: undefined });

      await expect(
        controller.updateProductCatalog(mockUser, mockLandingPageId, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getProducts TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getProducts', () => {
    it('should return products for landing page when user has company context', async () => {
      const mockUser = createMockUser();
      const mockResult = {
        products: [{ id: 'p1', name: 'Product 1' }],
        total: 1,
        catalog: createMockCatalog(),
      };
      productCatalogService.getProducts.mockResolvedValue(mockResult);

      const result = await controller.getProducts(mockUser, mockLandingPageId);

      expect(result).toEqual(mockResult);
      expect(productCatalogService.getProducts).toHaveBeenCalledWith(
        mockLandingPageId,
        mockCompanyId,
        { page: 1, limit: 50 },
      );
    });

    it('should accept pagination parameters', async () => {
      const mockUser = createMockUser();
      const mockResult = { products: [], total: 0, catalog: createMockCatalog() };
      productCatalogService.getProducts.mockResolvedValue(mockResult);

      await controller.getProducts(mockUser, mockLandingPageId, undefined, '2', '20');

      expect(productCatalogService.getProducts).toHaveBeenCalledWith(
        mockLandingPageId,
        mockCompanyId,
        { page: 2, limit: 20 },
      );
    });

    it('should validate company access when queryCompanyId is provided', async () => {
      const mockUser = createMockUser({ scopeType: 'CLIENT', scopeId: 'client-1', companyId: undefined });
      const queryCompanyId = 'requested-company';
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      const mockResult = { products: [], total: 0, catalog: createMockCatalog() };
      productCatalogService.getProducts.mockResolvedValue(mockResult);

      await controller.getProducts(mockUser, mockLandingPageId, queryCompanyId);

      expect(hierarchyService.canAccessCompany).toHaveBeenCalledWith(
        { sub: mockUser.id, scopeType: mockUser.scopeType, scopeId: mockUser.scopeId },
        queryCompanyId,
      );
      expect(productCatalogService.getProducts).toHaveBeenCalledWith(
        mockLandingPageId,
        queryCompanyId,
        { page: 1, limit: 50 },
      );
    });

    it('should throw ForbiddenException when user cannot access the requested company', async () => {
      const mockUser = createMockUser({ scopeType: 'CLIENT', scopeId: 'client-1', companyId: undefined });
      const queryCompanyId = 'unauthorized-company';
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      await expect(
        controller.getProducts(mockUser, mockLandingPageId, queryCompanyId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when ORG user has no company context', async () => {
      const mockUser = createMockUser({ scopeType: 'ORGANIZATION', scopeId: 'org-1', companyId: undefined });

      await expect(
        controller.getProducts(mockUser, mockLandingPageId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // addProducts TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('addProducts', () => {
    it('should add products to catalog', async () => {
      const mockUser = createMockUser();
      productCatalogService.addProducts.mockResolvedValue(undefined);

      const dto = { productIds: ['p1', 'p2'] };
      const result = await controller.addProducts(mockUser, mockLandingPageId, dto);

      expect(result).toEqual({ success: true });
      expect(productCatalogService.addProducts).toHaveBeenCalledWith(
        mockLandingPageId,
        mockCompanyId,
        ['p1', 'p2'],
      );
    });

    it('should throw ForbiddenException when no company context', async () => {
      const mockUser = createMockUser({ scopeType: 'ORGANIZATION', scopeId: 'org-1', companyId: undefined });

      await expect(
        controller.addProducts(mockUser, mockLandingPageId, { productIds: ['p1'] }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // removeProducts TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('removeProducts', () => {
    it('should remove products from catalog', async () => {
      const mockUser = createMockUser();
      productCatalogService.removeProducts.mockResolvedValue(undefined);

      const dto = { productIds: ['p1'] };
      const result = await controller.removeProducts(mockUser, mockLandingPageId, dto);

      expect(result).toEqual({ success: true });
      expect(productCatalogService.removeProducts).toHaveBeenCalledWith(
        mockLandingPageId,
        mockCompanyId,
        ['p1'],
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // reorderProducts TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('reorderProducts', () => {
    it('should reorder products in catalog', async () => {
      const mockUser = createMockUser();
      productCatalogService.reorderProducts.mockResolvedValue(undefined);

      const dto = { productIds: ['p2', 'p1', 'p3'] };
      const result = await controller.reorderProducts(mockUser, mockLandingPageId, dto);

      expect(result).toEqual({ success: true });
      expect(productCatalogService.reorderProducts).toHaveBeenCalledWith(
        mockLandingPageId,
        mockCompanyId,
        ['p2', 'p1', 'p3'],
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getThemePresets TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getThemePresets', () => {
    it('should return all theme presets', () => {
      const mockPresets = [
        { preset: 'STARTER', name: 'Starter', description: 'Clean design', preview: {} },
      ];
      cartThemeService.getThemePresets.mockReturnValue(mockPresets);

      const result = controller.getThemePresets();

      expect(result).toEqual(mockPresets);
      expect(cartThemeService.getThemePresets).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // generateThemeFromColors TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('generateThemeFromColors', () => {
    it('should generate theme from primary color', () => {
      const mockTheme = createMockTheme();
      cartThemeService.generateFromColors.mockReturnValue(mockTheme);

      const dto = { primaryColor: '#FF5733', mode: 'light' as const };
      const result = controller.generateThemeFromColors(dto);

      expect(result).toEqual(mockTheme);
      expect(cartThemeService.generateFromColors).toHaveBeenCalledWith('#FF5733', 'light');
    });

    it('should default to light mode', () => {
      const mockTheme = createMockTheme();
      cartThemeService.generateFromColors.mockReturnValue(mockTheme);

      const dto = { primaryColor: '#FF5733' };
      controller.generateThemeFromColors(dto);

      expect(cartThemeService.generateFromColors).toHaveBeenCalledWith('#FF5733', 'light');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCESS CONTROL TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Access Control', () => {
    it('should extract companyId from scopeId when scopeType is COMPANY', async () => {
      const mockTheme = createMockTheme();
      const mockUser = createMockUser({ scopeType: 'COMPANY', scopeId: 'company-999' });
      cartThemeService.updateCartTheme.mockResolvedValue(mockTheme);

      await controller.updateCartTheme(mockUser, mockLandingPageId, {});

      expect(cartThemeService.updateCartTheme).toHaveBeenCalledWith(
        mockLandingPageId,
        'company-999',
        {},
      );
    });

    it('should fall back to companyId when scopeType is not COMPANY', async () => {
      const mockTheme = createMockTheme();
      const mockUser = createMockUser({ scopeType: 'CLIENT', scopeId: 'client-1', companyId: 'company-from-context' });
      cartThemeService.updateCartTheme.mockResolvedValue(mockTheme);

      await controller.updateCartTheme(mockUser, mockLandingPageId, {});

      expect(cartThemeService.updateCartTheme).toHaveBeenCalledWith(
        mockLandingPageId,
        'company-from-context',
        {},
      );
    });
  });
});
