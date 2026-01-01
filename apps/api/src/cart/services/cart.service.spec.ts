/**
 * Cart Service Unit Tests
 *
 * Comprehensive tests for cart management including:
 * - Cart CRUD operations
 * - Cart item management (add, update, remove)
 * - Save for later functionality
 * - Discount code management
 * - Cart merging
 * - Cart status transitions
 * - Audit logging
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CartStatus } from '@prisma/client';
import { AuditAction } from '../../audit-logs/types/audit-log.types';
import { AddBundleToCartInput, BundleItemSelection } from '../types/cart.types';

describe('CartService', () => {
  let service: CartService;
  let prisma: {
    cart: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    cartItem: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    savedCartItem: {
      findFirst: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    product: {
      findUnique: jest.Mock;
    };
    bundle: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let auditLogService: {
    log: jest.Mock;
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockCompanyId = 'company-123';
  const mockCartId = 'cart-456';
  const mockCustomerId = 'customer-789';
  const mockUserId = 'user-101';
  const mockSessionToken = 'abc123def456';
  const mockProductId = 'product-001';
  const mockItemId = 'item-001';
  const mockSavedItemId = 'saved-item-001';

  const createMockProduct = (overrides: Partial<any> = {}) => ({
    id: mockProductId,
    companyId: mockCompanyId, // Must match cart's companyId for cross-company validation
    name: 'Test Product',
    sku: 'TEST-001',
    price: 29.99,
    status: 'ACTIVE',
    isVisible: true,
    images: [{ url: 'https://example.com/image.jpg' }],
    ...overrides,
  });

  const createMockCartItem = (overrides: Partial<any> = {}) => ({
    id: mockItemId,
    cartId: mockCartId,
    productId: mockProductId,
    variantId: null,
    quantity: 2,
    unitPrice: 29.99,
    originalPrice: 29.99,
    discountAmount: 0,
    lineTotal: 59.98,
    productSnapshot: {
      name: 'Test Product',
      sku: 'TEST-001',
      image: 'https://example.com/image.jpg',
      originalPrice: 29.99,
    },
    customFields: {},
    giftMessage: null,
    isGift: false,
    addedAt: new Date(),
    ...overrides,
  });

  const createMockSavedItem = (overrides: Partial<any> = {}) => ({
    id: mockSavedItemId,
    cartId: mockCartId,
    productId: mockProductId,
    variantId: null,
    quantity: 1,
    priceAtSave: 29.99,
    savedAt: new Date(),
    product: createMockProduct(),
    ...overrides,
  });

  const createMockCart = (overrides: Partial<any> = {}) => ({
    id: mockCartId,
    companyId: mockCompanyId,
    sessionToken: mockSessionToken,
    customerId: null,
    visitorId: null,
    siteId: null,
    status: CartStatus.ACTIVE,
    currency: 'USD',
    subtotal: 59.98,
    discountTotal: 0,
    taxTotal: 0,
    shippingTotal: 0,
    grandTotal: 59.98,
    itemCount: 2,
    discountCodes: [],
    shippingPostalCode: null,
    shippingCountry: null,
    notes: null,
    metadata: {},
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    items: [createMockCartItem()],
    savedItems: [],
    ...overrides,
  });

  // Bundle-related mock data
  const mockBundleId = 'bundle-001';
  const mockBundleProductId = 'bundle-product-001';
  const mockBundleGroupId = 'bundle_abc123def456';

  const createMockBundleProduct = (overrides: Partial<any> = {}) => ({
    id: mockBundleProductId,
    name: 'Coffee Lovers Bundle',
    sku: 'BUNDLE-COFFEE',
    price: 49.99,
    companyId: mockCompanyId,
    ...overrides,
  });

  const createMockBundleItem = (overrides: Partial<any> = {}) => ({
    id: 'bundle-item-001',
    bundleId: mockBundleId,
    productId: mockProductId,
    variantId: null,
    quantity: 1,
    priceOverride: null,
    sortOrder: 0,
    product: createMockProduct(),
    variant: null,
    ...overrides,
  });

  const createMockBundle = (overrides: Partial<any> = {}) => ({
    id: mockBundleId,
    companyId: mockCompanyId,
    productId: mockBundleProductId,
    type: 'FIXED',
    isActive: true,
    pricingStrategy: 'FIXED',
    discountType: null,
    discountValue: null,
    minItems: null,
    maxItems: null,
    deletedAt: null,
    product: createMockBundleProduct(),
    items: [createMockBundleItem()],
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    prisma = {
      cart: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      cartItem: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      savedCartItem: {
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
      bundle: {
        findUnique: jest.fn(),
      },
      // Transaction mock that executes callback with prisma as tx client
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(prisma);
      }),
    };

    auditLogService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // generateSessionToken TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('generateSessionToken', () => {
    it('should generate a 64-character hex string', () => {
      const token = service.generateSessionToken();

      expect(token).toBeDefined();
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should generate unique tokens on each call', () => {
      const token1 = service.generateSessionToken();
      const token2 = service.generateSessionToken();

      expect(token1).not.toBe(token2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getOrCreateCart TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getOrCreateCart', () => {
    it('should return existing cart if found by session token', async () => {
      const existingCart = createMockCart();
      prisma.cart.findFirst.mockResolvedValue(existingCart);

      const result = await service.getOrCreateCart(mockCompanyId, {
        sessionToken: mockSessionToken,
      });

      expect(result.id).toBe(mockCartId);
      expect(prisma.cart.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: mockCompanyId,
            status: CartStatus.ACTIVE,
          }),
        }),
      );
      expect(prisma.cart.create).not.toHaveBeenCalled();
    });

    it('should return existing cart if found by customer ID', async () => {
      const existingCart = createMockCart({ customerId: mockCustomerId });
      prisma.cart.findFirst.mockResolvedValue(existingCart);

      const result = await service.getOrCreateCart(mockCompanyId, {
        customerId: mockCustomerId,
      });

      expect(result.customerId).toBe(mockCustomerId);
      expect(prisma.cart.create).not.toHaveBeenCalled();
    });

    it('should create new cart if no existing cart found', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);
      const newCart = createMockCart({ items: [], savedItems: [] });
      prisma.cart.create.mockResolvedValue(newCart);

      const result = await service.getOrCreateCart(mockCompanyId, {});

      expect(result.id).toBe(mockCartId);
      expect(prisma.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: mockCompanyId,
            currency: 'USD',
          }),
        }),
      );
    });

    it('should create cart with provided session token', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);
      const newCart = createMockCart({ items: [], savedItems: [] });
      prisma.cart.create.mockResolvedValue(newCart);

      await service.getOrCreateCart(mockCompanyId, {
        sessionToken: 'provided-token',
      });

      expect(prisma.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionToken: 'provided-token',
          }),
        }),
      );
    });

    it('should create cart with UTM parameters', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);
      const newCart = createMockCart({ items: [], savedItems: [] });
      prisma.cart.create.mockResolvedValue(newCart);

      await service.getOrCreateCart(mockCompanyId, {
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'summer-sale',
      });

      expect(prisma.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            utmSource: 'google',
            utmMedium: 'cpc',
            utmCampaign: 'summer-sale',
          }),
        }),
      );
    });

    it('should create cart with custom currency', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);
      const newCart = createMockCart({ currency: 'EUR', items: [], savedItems: [] });
      prisma.cart.create.mockResolvedValue(newCart);

      await service.getOrCreateCart(mockCompanyId, {
        currency: 'EUR',
      });

      expect(prisma.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'EUR',
          }),
        }),
      );
    });

    it('should set 30-day expiration on new cart', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);
      const newCart = createMockCart({ items: [], savedItems: [] });
      prisma.cart.create.mockResolvedValue(newCart);

      await service.getOrCreateCart(mockCompanyId, {});

      expect(prisma.cart.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getCartBySessionToken TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getCartBySessionToken', () => {
    it('should return cart when found', async () => {
      const cart = createMockCart();
      prisma.cart.findFirst.mockResolvedValue(cart);

      const result = await service.getCartBySessionToken(mockSessionToken, mockCompanyId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockCartId);
      expect(prisma.cart.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sessionToken: mockSessionToken,
            companyId: mockCompanyId,
            status: CartStatus.ACTIVE,
          },
        }),
      );
    });

    it('should return null when cart not found', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);

      const result = await service.getCartBySessionToken('nonexistent', mockCompanyId);

      expect(result).toBeNull();
    });

    it('should only return active carts', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);

      await service.getCartBySessionToken(mockSessionToken, mockCompanyId);

      expect(prisma.cart.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CartStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getCartByCustomerId TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getCartByCustomerId', () => {
    it('should return cart when found', async () => {
      const cart = createMockCart({ customerId: mockCustomerId });
      prisma.cart.findFirst.mockResolvedValue(cart);

      const result = await service.getCartByCustomerId(mockCustomerId, mockCompanyId);

      expect(result).not.toBeNull();
      expect(result?.customerId).toBe(mockCustomerId);
    });

    it('should return null when cart not found', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);

      const result = await service.getCartByCustomerId('nonexistent', mockCompanyId);

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getCartById TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getCartById', () => {
    it('should return cart when found', async () => {
      const cart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(cart);

      const result = await service.getCartById(mockCartId);

      expect(result.id).toBe(mockCartId);
      expect(result.totals).toEqual({
        subtotal: 59.98,
        discountTotal: 0,
        taxTotal: 0,
        shippingTotal: 0,
        grandTotal: 59.98,
        itemCount: 2,
      });
    });

    it('should throw NotFoundException when cart not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      await expect(service.getCartById('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getCartById('nonexistent')).rejects.toThrow('Cart not found');
    });

    it('should include items with product data', async () => {
      const cart = createMockCart();
      prisma.cart.findUnique.mockResolvedValue(cart);

      const result = await service.getCartById(mockCartId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productSnapshot.name).toBe('Test Product');
    });

    it('should include saved items', async () => {
      const cart = createMockCart({ savedItems: [createMockSavedItem()] });
      prisma.cart.findUnique.mockResolvedValue(cart);

      const result = await service.getCartById(mockCartId);

      expect(result.savedItems).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // addItem TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('addItem', () => {
    beforeEach(() => {
      prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [], savedItems: [] }));
      prisma.product.findUnique.mockResolvedValue(createMockProduct());
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.cartItem.findMany.mockResolvedValue([]);
    });

    it('should add new item to cart', async () => {
      prisma.cartItem.create.mockResolvedValue(createMockCartItem());
      prisma.cart.update.mockResolvedValue(createMockCart());
      prisma.cart.findUnique.mockResolvedValue(createMockCart());

      const result = await service.addItem(mockCartId, {
        productId: mockProductId,
        quantity: 2,
      });

      expect(result).toBeDefined();
      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cartId: mockCartId,
            productId: mockProductId,
            quantity: 2,
          }),
        }),
      );
    });

    it('should update quantity if item already exists in cart', async () => {
      const existingItem = createMockCartItem({ quantity: 1 });
      prisma.cartItem.findFirst.mockResolvedValue(existingItem);
      prisma.cartItem.update.mockResolvedValue({ ...existingItem, quantity: 3 });
      prisma.cart.update.mockResolvedValue(createMockCart());
      prisma.cart.findUnique.mockResolvedValue(createMockCart());

      await service.addItem(mockCartId, {
        productId: mockProductId,
        quantity: 2,
      });

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockItemId },
          data: expect.objectContaining({
            quantity: 3,
          }),
        }),
      );
      expect(prisma.cartItem.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when cart not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem(mockCartId, { productId: mockProductId, quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.addItem(mockCartId, { productId: mockProductId, quantity: 1 }),
      ).rejects.toThrow('Cart not found');
    });

    it('should throw NotFoundException when product not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(createMockCart());
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem(mockCartId, { productId: 'nonexistent', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.addItem(mockCartId, { productId: 'nonexistent', quantity: 1 }),
      ).rejects.toThrow('Product not found');
    });

    it('should throw BadRequestException when product is not active', async () => {
      prisma.cart.findUnique.mockResolvedValue(createMockCart());
      prisma.product.findUnique.mockResolvedValue(createMockProduct({ status: 'INACTIVE' }));

      await expect(
        service.addItem(mockCartId, { productId: mockProductId, quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addItem(mockCartId, { productId: mockProductId, quantity: 1 }),
      ).rejects.toThrow('Product is not available');
    });

    it('should throw BadRequestException when product is not visible', async () => {
      prisma.cart.findUnique.mockResolvedValue(createMockCart());
      prisma.product.findUnique.mockResolvedValue(createMockProduct({ isVisible: false }));

      await expect(
        service.addItem(mockCartId, { productId: mockProductId, quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addItem(mockCartId, { productId: mockProductId, quantity: 1 }),
      ).rejects.toThrow('Product is not available');
    });

    it('should store product snapshot when adding item', async () => {
      prisma.cartItem.create.mockResolvedValue(createMockCartItem());
      prisma.cart.update.mockResolvedValue(createMockCart());
      prisma.cart.findUnique.mockResolvedValue(createMockCart());

      await service.addItem(mockCartId, {
        productId: mockProductId,
        quantity: 1,
      });

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productSnapshot: expect.objectContaining({
              name: 'Test Product',
              sku: 'TEST-001',
              image: 'https://example.com/image.jpg',
              originalPrice: 29.99,
            }),
          }),
        }),
      );
    });

    it('should add item with variant', async () => {
      prisma.cartItem.create.mockResolvedValue(createMockCartItem({ variantId: 'variant-001' }));
      prisma.cart.update.mockResolvedValue(createMockCart());
      prisma.cart.findUnique.mockResolvedValue(createMockCart());

      await service.addItem(mockCartId, {
        productId: mockProductId,
        variantId: 'variant-001',
        quantity: 1,
      });

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            variantId: 'variant-001',
          }),
        }),
      );
    });

    it('should add item with gift options', async () => {
      prisma.cartItem.create.mockResolvedValue(
        createMockCartItem({ isGift: true, giftMessage: 'Happy Birthday!' }),
      );
      prisma.cart.update.mockResolvedValue(createMockCart());
      prisma.cart.findUnique.mockResolvedValue(createMockCart());

      await service.addItem(mockCartId, {
        productId: mockProductId,
        quantity: 1,
        isGift: true,
        giftMessage: 'Happy Birthday!',
      });

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isGift: true,
            giftMessage: 'Happy Birthday!',
          }),
        }),
      );
    });

    it('should add item with custom fields', async () => {
      prisma.cartItem.create.mockResolvedValue(
        createMockCartItem({ customFields: { engraving: 'ABC' } }),
      );
      prisma.cart.update.mockResolvedValue(createMockCart());
      prisma.cart.findUnique.mockResolvedValue(createMockCart());

      await service.addItem(mockCartId, {
        productId: mockProductId,
        quantity: 1,
        customFields: { engraving: 'ABC' },
      });

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customFields: { engraving: 'ABC' },
          }),
        }),
      );
    });

    it('should update lastActivityAt on cart', async () => {
      prisma.cartItem.create.mockResolvedValue(createMockCartItem());
      prisma.cart.update.mockResolvedValue(createMockCart());
      prisma.cart.findUnique.mockResolvedValue(createMockCart());

      await service.addItem(mockCartId, {
        productId: mockProductId,
        quantity: 1,
      });

      expect(prisma.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockCartId },
          data: { lastActivityAt: expect.any(Date) },
        }),
      );
    });

    it('should create audit log when performedBy is provided', async () => {
      prisma.cartItem.create.mockResolvedValue(createMockCartItem());
      prisma.cart.update.mockResolvedValue(createMockCart());
      prisma.cart.findUnique.mockResolvedValue(createMockCart());

      await service.addItem(
        mockCartId,
        { productId: mockProductId, quantity: 2 },
        mockUserId,
      );

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.CREATE,
        'CartItem',
        mockCartId,
        expect.objectContaining({
          userId: mockUserId,
          changes: expect.objectContaining({
            productId: expect.any(Object),
            quantity: expect.any(Object),
          }),
        }),
      );
    });

    it('should not create audit log when performedBy is not provided', async () => {
      prisma.cartItem.create.mockResolvedValue(createMockCartItem());
      prisma.cart.update.mockResolvedValue(createMockCart());
      prisma.cart.findUnique.mockResolvedValue(createMockCart());

      await service.addItem(mockCartId, { productId: mockProductId, quantity: 1 });

      expect(auditLogService.log).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateItem TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('updateItem', () => {
    beforeEach(() => {
      prisma.cartItem.findFirst.mockResolvedValue(createMockCartItem());
      prisma.cartItem.findMany.mockResolvedValue([createMockCartItem()]);
      prisma.cart.update.mockResolvedValue(createMockCart());
      prisma.cart.findUnique.mockResolvedValue(createMockCart());
    });

    it('should update item quantity', async () => {
      prisma.cartItem.update.mockResolvedValue(createMockCartItem({ quantity: 5 }));

      await service.updateItem(mockCartId, mockItemId, { quantity: 5 });

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockItemId },
          data: expect.objectContaining({
            quantity: 5,
          }),
        }),
      );
    });

    it('should update line total when quantity changes', async () => {
      prisma.cartItem.update.mockResolvedValue(createMockCartItem({ quantity: 3, lineTotal: 89.97 }));

      await service.updateItem(mockCartId, mockItemId, { quantity: 3 });

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lineTotal: 89.97,
          }),
        }),
      );
    });

    it('should remove item when quantity is 0', async () => {
      prisma.cartItem.delete.mockResolvedValue(createMockCartItem());

      await service.updateItem(mockCartId, mockItemId, { quantity: 0 });

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: mockItemId },
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.updateItem(mockCartId, 'nonexistent', { quantity: 5 })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateItem(mockCartId, 'nonexistent', { quantity: 5 })).rejects.toThrow(
        'Cart item not found',
      );
    });

    it('should update custom fields', async () => {
      prisma.cartItem.update.mockResolvedValue(
        createMockCartItem({ customFields: { size: 'XL' } }),
      );

      await service.updateItem(mockCartId, mockItemId, { customFields: { size: 'XL' } });

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customFields: { size: 'XL' },
          }),
        }),
      );
    });

    it('should update gift options', async () => {
      prisma.cartItem.update.mockResolvedValue(
        createMockCartItem({ isGift: true, giftMessage: 'Congrats!' }),
      );

      await service.updateItem(mockCartId, mockItemId, {
        isGift: true,
        giftMessage: 'Congrats!',
      });

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isGift: true,
            giftMessage: 'Congrats!',
          }),
        }),
      );
    });

    it('should create audit log when performedBy is provided', async () => {
      prisma.cartItem.update.mockResolvedValue(createMockCartItem({ quantity: 5 }));

      await service.updateItem(mockCartId, mockItemId, { quantity: 5 }, mockUserId);

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.UPDATE,
        'CartItem',
        mockItemId,
        expect.objectContaining({
          userId: mockUserId,
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // removeItem TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('removeItem', () => {
    beforeEach(() => {
      prisma.cartItem.findFirst.mockResolvedValue(createMockCartItem());
      prisma.cartItem.findMany.mockResolvedValue([]);
      prisma.cart.update.mockResolvedValue(createMockCart({ items: [] }));
      prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [] }));
    });

    it('should remove item from cart', async () => {
      prisma.cartItem.delete.mockResolvedValue(createMockCartItem());

      await service.removeItem(mockCartId, mockItemId);

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: mockItemId },
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.removeItem(mockCartId, 'nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.removeItem(mockCartId, 'nonexistent')).rejects.toThrow(
        'Cart item not found',
      );
    });

    it('should recalculate totals after removal', async () => {
      prisma.cartItem.delete.mockResolvedValue(createMockCartItem());

      await service.removeItem(mockCartId, mockItemId);

      // Verify recalculateTotals is called by checking cart update
      expect(prisma.cart.update).toHaveBeenCalled();
    });

    it('should update lastActivityAt', async () => {
      prisma.cartItem.delete.mockResolvedValue(createMockCartItem());

      await service.removeItem(mockCartId, mockItemId);

      expect(prisma.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockCartId },
          data: { lastActivityAt: expect.any(Date) },
        }),
      );
    });

    it('should create audit log when performedBy is provided', async () => {
      prisma.cartItem.delete.mockResolvedValue(createMockCartItem());

      await service.removeItem(mockCartId, mockItemId, mockUserId);

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.DELETE,
        'CartItem',
        mockItemId,
        expect.objectContaining({
          userId: mockUserId,
          metadata: expect.objectContaining({ productId: mockProductId }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // saveForLater TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('saveForLater', () => {
    beforeEach(() => {
      prisma.cartItem.findFirst.mockResolvedValue(createMockCartItem());
      prisma.cartItem.findMany.mockResolvedValue([]);
      prisma.cart.update.mockResolvedValue(createMockCart());
      prisma.cart.findUnique.mockResolvedValue(createMockCart({ savedItems: [createMockSavedItem()] }));
    });

    it('should move item to saved items', async () => {
      prisma.savedCartItem.create.mockResolvedValue(createMockSavedItem());
      prisma.cartItem.delete.mockResolvedValue(createMockCartItem());

      const result = await service.saveForLater(mockCartId, mockItemId);

      expect(prisma.savedCartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cartId: mockCartId,
            productId: mockProductId,
            quantity: 2,
          }),
        }),
      );
      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: mockItemId },
      });
      expect(result.savedItems).toHaveLength(1);
    });

    it('should throw NotFoundException when item not found', async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.saveForLater(mockCartId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.saveForLater(mockCartId, 'nonexistent')).rejects.toThrow(
        'Cart item not found',
      );
    });

    it('should preserve price at time of save', async () => {
      prisma.savedCartItem.create.mockResolvedValue(createMockSavedItem());
      prisma.cartItem.delete.mockResolvedValue(createMockCartItem());

      await service.saveForLater(mockCartId, mockItemId);

      expect(prisma.savedCartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priceAtSave: 29.99,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // moveToCart TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('moveToCart', () => {
    beforeEach(() => {
      prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [], savedItems: [] }));
      prisma.product.findUnique.mockResolvedValue(createMockProduct());
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.cartItem.findMany.mockResolvedValue([createMockCartItem()]);
      prisma.cart.update.mockResolvedValue(createMockCart());
    });

    it('should move saved item to cart', async () => {
      prisma.savedCartItem.findFirst.mockResolvedValue(createMockSavedItem());
      prisma.cartItem.create.mockResolvedValue(createMockCartItem());
      prisma.savedCartItem.delete.mockResolvedValue(createMockSavedItem());
      prisma.cart.findUnique.mockResolvedValue(createMockCart());

      const result = await service.moveToCart(mockCartId, mockSavedItemId);

      expect(prisma.savedCartItem.delete).toHaveBeenCalledWith({
        where: { id: mockSavedItemId },
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when saved item not found', async () => {
      prisma.savedCartItem.findFirst.mockResolvedValue(null);

      await expect(service.moveToCart(mockCartId, 'nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.moveToCart(mockCartId, 'nonexistent')).rejects.toThrow(
        'Saved item not found',
      );
    });

    it('should use custom quantity when provided', async () => {
      prisma.savedCartItem.findFirst.mockResolvedValue(createMockSavedItem({ quantity: 1 }));
      prisma.cartItem.create.mockResolvedValue(createMockCartItem({ quantity: 5 }));
      prisma.savedCartItem.delete.mockResolvedValue(createMockSavedItem());
      prisma.cart.findUnique.mockResolvedValue(createMockCart());

      await service.moveToCart(mockCartId, mockSavedItemId, 5);

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantity: 5,
          }),
        }),
      );
    });

    it('should use saved item quantity when custom quantity not provided', async () => {
      const savedItem = createMockSavedItem({ quantity: 3 });
      prisma.savedCartItem.findFirst.mockResolvedValue(savedItem);
      prisma.cartItem.create.mockResolvedValue(createMockCartItem({ quantity: 3 }));
      prisma.savedCartItem.delete.mockResolvedValue(savedItem);
      prisma.cart.findUnique.mockResolvedValue(createMockCart());

      await service.moveToCart(mockCartId, mockSavedItemId);

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantity: 3,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // applyDiscount TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('applyDiscount', () => {
    beforeEach(() => {
      prisma.cart.findUnique.mockResolvedValue(createMockCart({ discountCodes: [] }));
      prisma.cartItem.findMany.mockResolvedValue([createMockCartItem()]);
      prisma.cart.update.mockResolvedValue(createMockCart({ discountCodes: [{ code: 'SAVE10', discountAmount: 0, type: 'fixed' }] }));
    });

    it('should apply discount code to cart', async () => {
      const result = await service.applyDiscount(mockCartId, 'SAVE10');

      expect(prisma.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockCartId },
          data: expect.objectContaining({
            discountCodes: expect.arrayContaining([
              expect.objectContaining({ code: 'SAVE10' }),
            ]),
          }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when cart not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      await expect(service.applyDiscount('nonexistent', 'SAVE10')).rejects.toThrow(NotFoundException);
      await expect(service.applyDiscount('nonexistent', 'SAVE10')).rejects.toThrow('Cart not found');
    });

    it('should throw BadRequestException when discount already applied', async () => {
      prisma.cart.findUnique.mockResolvedValue(
        createMockCart({ discountCodes: [{ code: 'SAVE10', discountAmount: 10, type: 'fixed' }] }),
      );

      await expect(service.applyDiscount(mockCartId, 'SAVE10')).rejects.toThrow(BadRequestException);
      await expect(service.applyDiscount(mockCartId, 'SAVE10')).rejects.toThrow(
        'Discount code already applied',
      );
    });

    it('should update lastActivityAt', async () => {
      await service.applyDiscount(mockCartId, 'SAVE10');

      expect(prisma.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastActivityAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should allow multiple different discount codes', async () => {
      const cartWithOneDiscount = createMockCart({
        discountCodes: [{ code: 'SAVE10', discountAmount: 10, type: 'percentage' }],
        items: [createMockCartItem()],
      });
      const cartWithTwoDiscounts = createMockCart({
        discountCodes: [
          { code: 'SAVE10', discountAmount: 6, type: 'percentage' },
          { code: 'SAVE20', discountAmount: 12, type: 'percentage' },
        ],
        items: [createMockCartItem()],
      });

      // applyDiscount needs: 1. initial lookup, then recalculateTotals, then getCartById
      prisma.cart.findUnique
        .mockResolvedValueOnce(cartWithOneDiscount)    // applyDiscount lookup
        .mockResolvedValueOnce(cartWithTwoDiscounts)   // recalculateTotals lookup
        .mockResolvedValueOnce(cartWithTwoDiscounts);  // getCartById
      prisma.cart.update.mockResolvedValue(cartWithTwoDiscounts);

      const result = await service.applyDiscount(mockCartId, 'SAVE20');

      expect(result.discountCodes).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // removeDiscount TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('removeDiscount', () => {
    it('should remove discount code from cart', async () => {
      const cartWithItems = createMockCart({
        discountCodes: [{ code: 'SAVE10', discountAmount: 10, type: 'fixed' }],
        items: [createMockCartItem()],
      });
      const cartAfterUpdate = createMockCart({
        discountCodes: [],
        items: [createMockCartItem()],
      });

      // 1. First call: removeDiscount looks up the cart
      // 2. Second call: recalculateTotals looks up the cart with items
      // 3. Third call: getCartById at the end
      prisma.cart.findUnique
        .mockResolvedValueOnce(cartWithItems)     // removeDiscount lookup
        .mockResolvedValueOnce(cartAfterUpdate)   // recalculateTotals lookup
        .mockResolvedValueOnce(cartAfterUpdate);  // getCartById
      prisma.cart.update.mockResolvedValue(cartAfterUpdate);

      const result = await service.removeDiscount(mockCartId, 'SAVE10');

      expect(result.discountCodes).toHaveLength(0);
    });

    it('should throw NotFoundException when cart not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      await expect(service.removeDiscount('nonexistent', 'SAVE10')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not throw when removing non-existent discount code', async () => {
      const cartWithDiscount = createMockCart({
        discountCodes: [{ code: 'SAVE10', discountAmount: 10, type: 'fixed' }],
        items: [createMockCartItem()],
      });

      prisma.cart.findUnique
        .mockResolvedValueOnce(cartWithDiscount)   // removeDiscount lookup
        .mockResolvedValueOnce(cartWithDiscount)   // recalculateTotals lookup
        .mockResolvedValueOnce(cartWithDiscount);  // getCartById
      prisma.cart.update.mockResolvedValue(cartWithDiscount);

      await expect(service.removeDiscount(mockCartId, 'NONEXISTENT')).resolves.toBeDefined();
    });

    it('should only remove specified discount code', async () => {
      const cartWithTwoDiscounts = createMockCart({
        discountCodes: [
          { code: 'SAVE10', discountAmount: 10, type: 'fixed' },
          { code: 'FLAT5', discountAmount: 5, type: 'fixed' },
        ],
        items: [createMockCartItem()],
      });
      const cartAfterRemove = createMockCart({
        discountCodes: [{ code: 'FLAT5', discountAmount: 5, type: 'fixed' }],
        items: [createMockCartItem()],
      });

      prisma.cart.findUnique
        .mockResolvedValueOnce(cartWithTwoDiscounts)   // removeDiscount lookup
        .mockResolvedValueOnce(cartAfterRemove)        // recalculateTotals lookup
        .mockResolvedValueOnce(cartAfterRemove);       // getCartById
      prisma.cart.update.mockResolvedValue(cartAfterRemove);

      const result = await service.removeDiscount(mockCartId, 'SAVE10');

      expect(result.discountCodes).toHaveLength(1);
      expect(result.discountCodes[0].code).toBe('FLAT5');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // clearCart TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('clearCart', () => {
    beforeEach(() => {
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 2 });
      prisma.cart.update.mockResolvedValue(
        createMockCart({
          items: [],
          subtotal: 0,
          grandTotal: 0,
          itemCount: 0,
          discountCodes: [],
        }),
      );
      prisma.cart.findUnique.mockResolvedValue(
        createMockCart({ items: [], subtotal: 0, grandTotal: 0, itemCount: 0 }),
      );
    });

    it('should remove all items from cart', async () => {
      const result = await service.clearCart(mockCartId);

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: mockCartId },
      });
      expect(result.items).toHaveLength(0);
    });

    it('should reset cart totals to zero', async () => {
      await service.clearCart(mockCartId);

      expect(prisma.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockCartId },
          data: expect.objectContaining({
            subtotal: 0,
            discountTotal: 0,
            taxTotal: 0,
            shippingTotal: 0,
            grandTotal: 0,
            itemCount: 0,
          }),
        }),
      );
    });

    it('should clear discount codes', async () => {
      await service.clearCart(mockCartId);

      expect(prisma.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            discountCodes: [],
          }),
        }),
      );
    });

    it('should create audit log when performedBy is provided', async () => {
      await service.clearCart(mockCartId, mockUserId);

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.DELETE,
        'Cart',
        mockCartId,
        expect.objectContaining({
          userId: mockUserId,
          metadata: expect.objectContaining({ action: 'clear' }),
        }),
      );
    });

    it('should not create audit log when performedBy is not provided', async () => {
      await service.clearCart(mockCartId);

      expect(auditLogService.log).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // mergeCarts TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('mergeCarts', () => {
    const sourceCartId = 'source-cart-123';
    const targetCartId = 'target-cart-456';

    beforeEach(() => {
      prisma.cart.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceCartId) {
          return Promise.resolve(
            createMockCart({
              id: sourceCartId,
              items: [createMockCartItem({ id: 'source-item-1' })],
            }),
          );
        }
        if (where.id === targetCartId) {
          return Promise.resolve(
            createMockCart({
              id: targetCartId,
              items: [],
              savedItems: [],
            }),
          );
        }
        return Promise.resolve(null);
      });
      prisma.product.findUnique.mockResolvedValue(createMockProduct());
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.cartItem.findMany.mockResolvedValue([createMockCartItem()]);
      prisma.cartItem.create.mockResolvedValue(createMockCartItem());
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });
      prisma.cart.update.mockResolvedValue(createMockCart({ id: targetCartId }));
    });

    it('should move items from source cart to target cart', async () => {
      const result = await service.mergeCarts(sourceCartId, targetCartId);

      expect(prisma.cartItem.create).toHaveBeenCalled();
      expect(result.id).toBe(targetCartId);
    });

    it('should mark source cart as merged', async () => {
      await service.mergeCarts(sourceCartId, targetCartId);

      expect(prisma.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sourceCartId },
          data: expect.objectContaining({
            status: CartStatus.MERGED,
            mergedIntoCartId: targetCartId,
            mergedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should delete items from source cart after merge', async () => {
      await service.mergeCarts(sourceCartId, targetCartId);

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: sourceCartId },
      });
    });

    it('should throw NotFoundException when source cart not found', async () => {
      prisma.cart.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceCartId) {
          return Promise.resolve(null);
        }
        return Promise.resolve(createMockCart({ id: targetCartId }));
      });

      await expect(service.mergeCarts(sourceCartId, targetCartId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when target cart not found', async () => {
      prisma.cart.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceCartId) {
          return Promise.resolve(createMockCart({ id: sourceCartId, items: [] }));
        }
        return Promise.resolve(null);
      });

      await expect(service.mergeCarts(sourceCartId, targetCartId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should merge items with custom fields and gift options', async () => {
      const sourceItem = createMockCartItem({
        id: 'source-item-1',
        customFields: { engraving: 'ABC' },
        giftMessage: 'Happy Birthday!',
        isGift: true,
      });

      prisma.cart.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceCartId) {
          return Promise.resolve(
            createMockCart({ id: sourceCartId, items: [sourceItem] }),
          );
        }
        return Promise.resolve(
          createMockCart({ id: targetCartId, items: [], savedItems: [] }),
        );
      });

      await service.mergeCarts(sourceCartId, targetCartId);

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customFields: { engraving: 'ABC' },
            giftMessage: 'Happy Birthday!',
            isGift: true,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // markAbandoned TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('markAbandoned', () => {
    it('should update cart status to ABANDONED', async () => {
      prisma.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.ABANDONED }),
      );

      await service.markAbandoned(mockCartId);

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: mockCartId },
        data: {
          status: CartStatus.ABANDONED,
          abandonedAt: expect.any(Date),
        },
      });
    });

    it('should set abandonedAt timestamp', async () => {
      prisma.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.ABANDONED, abandonedAt: new Date() }),
      );

      await service.markAbandoned(mockCartId);

      expect(prisma.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            abandonedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // markConverted TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('markConverted', () => {
    const mockOrderId = 'order-123';

    it('should update cart status to CONVERTED', async () => {
      prisma.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      await service.markConverted(mockCartId, mockOrderId);

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: mockCartId },
        data: {
          status: CartStatus.CONVERTED,
          convertedAt: expect.any(Date),
          orderId: mockOrderId,
        },
      });
    });

    it('should set convertedAt timestamp', async () => {
      prisma.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      await service.markConverted(mockCartId, mockOrderId);

      expect(prisma.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            convertedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should associate order with cart', async () => {
      prisma.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED, orderId: mockOrderId }),
      );

      await service.markConverted(mockCartId, mockOrderId);

      expect(prisma.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: mockOrderId,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASES TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    describe('empty cart operations', () => {
      it('should handle adding to empty cart', async () => {
        prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [], savedItems: [] }));
        prisma.product.findUnique.mockResolvedValue(createMockProduct());
        prisma.cartItem.findFirst.mockResolvedValue(null);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cartItem.findMany.mockResolvedValue([createMockCartItem()]);
        prisma.cart.update.mockResolvedValue(createMockCart());

        const result = await service.addItem(mockCartId, {
          productId: mockProductId,
          quantity: 1,
        });

        expect(result).toBeDefined();
        expect(prisma.cartItem.create).toHaveBeenCalled();
      });

      it('should handle clearing already empty cart', async () => {
        prisma.cartItem.deleteMany.mockResolvedValue({ count: 0 });
        prisma.cart.update.mockResolvedValue(createMockCart({ items: [], itemCount: 0 }));
        prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [] }));

        const result = await service.clearCart(mockCartId);

        expect(result.items).toHaveLength(0);
        expect(prisma.cartItem.deleteMany).toHaveBeenCalled();
      });
    });

    describe('cart with no images', () => {
      it('should handle product with no images', async () => {
        prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [], savedItems: [] }));
        prisma.product.findUnique.mockResolvedValue(createMockProduct({ images: [] }));
        prisma.cartItem.findFirst.mockResolvedValue(null);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cartItem.findMany.mockResolvedValue([createMockCartItem()]);
        prisma.cart.update.mockResolvedValue(createMockCart());

        await service.addItem(mockCartId, {
          productId: mockProductId,
          quantity: 1,
        });

        expect(prisma.cartItem.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              productSnapshot: expect.objectContaining({
                image: undefined,
              }),
            }),
          }),
        );
      });

      it('should handle product with null images', async () => {
        prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [], savedItems: [] }));
        prisma.product.findUnique.mockResolvedValue(createMockProduct({ images: null }));
        prisma.cartItem.findFirst.mockResolvedValue(null);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cartItem.findMany.mockResolvedValue([createMockCartItem()]);
        prisma.cart.update.mockResolvedValue(createMockCart());

        await service.addItem(mockCartId, {
          productId: mockProductId,
          quantity: 1,
        });

        expect(prisma.cartItem.create).toHaveBeenCalled();
      });
    });

    describe('duplicate item handling', () => {
      it('should update quantity for existing item with same variant', async () => {
        const existingItem = createMockCartItem({ variantId: 'variant-001', quantity: 2 });
        prisma.cart.findUnique.mockResolvedValue(createMockCart());
        prisma.product.findUnique.mockResolvedValue(createMockProduct());
        prisma.cartItem.findFirst.mockResolvedValue(existingItem);
        prisma.cartItem.update.mockResolvedValue({ ...existingItem, quantity: 5 });
        prisma.cartItem.findMany.mockResolvedValue([{ ...existingItem, quantity: 5 }]);
        prisma.cart.update.mockResolvedValue(createMockCart());

        await service.addItem(mockCartId, {
          productId: mockProductId,
          variantId: 'variant-001',
          quantity: 3,
        });

        expect(prisma.cartItem.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              quantity: 5,
            }),
          }),
        );
      });

      it('should create new item for same product with different variant', async () => {
        prisma.cart.findUnique.mockResolvedValue(createMockCart());
        prisma.product.findUnique.mockResolvedValue(createMockProduct());
        prisma.cartItem.findFirst.mockResolvedValue(null); // No existing item with this variant
        prisma.cartItem.create.mockResolvedValue(createMockCartItem({ variantId: 'variant-002' }));
        prisma.cartItem.findMany.mockResolvedValue([
          createMockCartItem({ variantId: 'variant-001' }),
          createMockCartItem({ variantId: 'variant-002' }),
        ]);
        prisma.cart.update.mockResolvedValue(createMockCart());

        await service.addItem(mockCartId, {
          productId: mockProductId,
          variantId: 'variant-002',
          quantity: 1,
        });

        expect(prisma.cartItem.create).toHaveBeenCalled();
      });
    });

    describe('decimal precision handling', () => {
      it('should handle prices with decimal precision', async () => {
        prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [], savedItems: [] }));
        prisma.product.findUnique.mockResolvedValue(createMockProduct({ price: 19.99 }));
        prisma.cartItem.findFirst.mockResolvedValue(null);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem({ unitPrice: 19.99, lineTotal: 39.98 }));
        prisma.cartItem.findMany.mockResolvedValue([createMockCartItem({ unitPrice: 19.99, lineTotal: 39.98 })]);
        prisma.cart.update.mockResolvedValue(createMockCart());

        await service.addItem(mockCartId, {
          productId: mockProductId,
          quantity: 2,
        });

        expect(prisma.cartItem.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              unitPrice: 19.99,
              lineTotal: 39.98,
            }),
          }),
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CART DATA TRANSFORMATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('cart data transformation', () => {
    it('should correctly transform cart to CartData', async () => {
      const cart = createMockCart({
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'test',
        shippingPostalCode: '12345',
        shippingCountry: 'US',
        notes: 'Test notes',
        metadata: { customField: 'value' },
      });
      prisma.cart.findUnique.mockResolvedValue(cart);

      const result = await service.getCartById(mockCartId);

      expect(result.utmSource).toBe('google');
      expect(result.utmMedium).toBe('cpc');
      expect(result.utmCampaign).toBe('test');
      expect(result.shippingPostalCode).toBe('12345');
      expect(result.shippingCountry).toBe('US');
      expect(result.notes).toBe('Test notes');
      expect(result.metadata).toEqual({ customField: 'value' });
    });

    it('should include all cart items in response', async () => {
      const items = [
        createMockCartItem({ id: 'item-1' }),
        createMockCartItem({ id: 'item-2' }),
        createMockCartItem({ id: 'item-3' }),
      ];
      const cart = createMockCart({ items, itemCount: 3 });
      prisma.cart.findUnique.mockResolvedValue(cart);

      const result = await service.getCartById(mockCartId);

      expect(result.items).toHaveLength(3);
    });

    it('should include saved items in response', async () => {
      const savedItems = [
        createMockSavedItem({ id: 'saved-1' }),
        createMockSavedItem({ id: 'saved-2' }),
      ];
      const cart = createMockCart({ savedItems });
      prisma.cart.findUnique.mockResolvedValue(cart);

      const result = await service.getCartById(mockCartId);

      expect(result.savedItems).toHaveLength(2);
    });

    it('should handle null optional fields', async () => {
      const cart = createMockCart({
        siteId: null,
        customerId: null,
        visitorId: null,
        shippingPostalCode: null,
        shippingCountry: null,
        notes: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        expiresAt: null,
      });
      prisma.cart.findUnique.mockResolvedValue(cart);

      const result = await service.getCartById(mockCartId);

      expect(result.siteId).toBeUndefined();
      expect(result.customerId).toBeUndefined();
      expect(result.visitorId).toBeUndefined();
      expect(result.shippingPostalCode).toBeUndefined();
      expect(result.shippingCountry).toBeUndefined();
      expect(result.notes).toBeUndefined();
      expect(result.utmSource).toBeUndefined();
      expect(result.utmMedium).toBeUndefined();
      expect(result.utmCampaign).toBeUndefined();
      expect(result.expiresAt).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // BUNDLE OPERATIONS TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('addBundleToCart', () => {
    beforeEach(() => {
      prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [], savedItems: [] }));
      prisma.bundle.findUnique.mockResolvedValue(createMockBundle());
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.cartItem.findMany.mockResolvedValue([]);
      prisma.cart.update.mockResolvedValue(createMockCart());
    });

    describe('success cases', () => {
      it('should add fixed bundle to cart', async () => {
        const bundle = createMockBundle({
          type: 'FIXED',
          items: [
            createMockBundleItem({ productId: 'product-1', quantity: 1, product: createMockProduct({ id: 'product-1' }) }),
            createMockBundleItem({ id: 'item-2', productId: 'product-2', quantity: 2, product: createMockProduct({ id: 'product-2', name: 'Product 2' }) }),
          ],
        });
        prisma.bundle.findUnique.mockResolvedValue(bundle);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))  // addBundleToCart lookup
          .mockResolvedValueOnce(createMockCart({ items: [] }))  // recalculateTotals
          .mockResolvedValueOnce(createMockCart());  // getCartById

        const result = await service.addBundleToCart(mockCartId, { bundleId: mockBundleId });

        expect(result).toBeDefined();
        expect(result.bundleGroupId).toBeDefined();
        expect(result.bundleGroupId).toMatch(/^bundle_[a-f0-9]+$/);
        expect(result.itemsAdded).toBe(2);
        expect(prisma.cartItem.create).toHaveBeenCalledTimes(2);
      });

      it('should add mix-and-match bundle with selected items', async () => {
        const bundle = createMockBundle({
          type: 'MIX_AND_MATCH',
          minItems: 2,
          maxItems: 5,
          items: [
            createMockBundleItem({ productId: 'product-1', quantity: 1, product: createMockProduct({ id: 'product-1' }) }),
            createMockBundleItem({ id: 'item-2', productId: 'product-2', quantity: 1, product: createMockProduct({ id: 'product-2' }) }),
            createMockBundleItem({ id: 'item-3', productId: 'product-3', quantity: 1, product: createMockProduct({ id: 'product-3' }) }),
          ],
        });
        prisma.bundle.findUnique.mockResolvedValue(bundle);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart());

        const selectedItems: BundleItemSelection[] = [
          { productId: 'product-1', quantity: 1 },
          { productId: 'product-2', quantity: 2 },
        ];

        const result = await service.addBundleToCart(mockCartId, {
          bundleId: mockBundleId,
          selectedItems,
        });

        expect(result.itemsAdded).toBe(2);
        expect(prisma.cartItem.create).toHaveBeenCalledTimes(2);
      });

      it('should add bundle with quantity greater than 1', async () => {
        const bundle = createMockBundle({
          items: [createMockBundleItem({ quantity: 1, product: createMockProduct() })],
        });
        prisma.bundle.findUnique.mockResolvedValue(bundle);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart());

        await service.addBundleToCart(mockCartId, {
          bundleId: mockBundleId,
          quantity: 3,
        });

        expect(prisma.cartItem.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              quantity: 3, // 1 item * 3 bundles
            }),
          }),
        );
      });

      it('should store bundleGroupId in customFields for each item', async () => {
        const bundle = createMockBundle({
          items: [createMockBundleItem({ product: createMockProduct() })],
        });
        prisma.bundle.findUnique.mockResolvedValue(bundle);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart());

        const result = await service.addBundleToCart(mockCartId, { bundleId: mockBundleId });

        expect(prisma.cartItem.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              customFields: expect.objectContaining({
                bundleId: mockBundleId,
                bundleGroupId: result.bundleGroupId,
                isBundleItem: true,
              }),
            }),
          }),
        );
      });

      it('should store bundle info in productSnapshot', async () => {
        const bundle = createMockBundle({
          items: [createMockBundleItem({ product: createMockProduct() })],
        });
        prisma.bundle.findUnique.mockResolvedValue(bundle);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart());

        const result = await service.addBundleToCart(mockCartId, { bundleId: mockBundleId });

        expect(prisma.cartItem.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              productSnapshot: expect.objectContaining({
                bundleId: mockBundleId,
                bundleName: 'Coffee Lovers Bundle',
                bundleGroupId: result.bundleGroupId,
              }),
            }),
          }),
        );
      });

      it('should create audit log when performedBy is provided', async () => {
        const bundle = createMockBundle({
          items: [createMockBundleItem({ product: createMockProduct() })],
        });
        prisma.bundle.findUnique.mockResolvedValue(bundle);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart());

        await service.addBundleToCart(mockCartId, { bundleId: mockBundleId }, mockUserId);

        expect(auditLogService.log).toHaveBeenCalledWith(
          AuditAction.CREATE,
          'CartItem',
          mockCartId,
          expect.objectContaining({
            userId: mockUserId,
            changes: expect.objectContaining({
              bundleId: expect.any(Object),
              bundleGroupId: expect.any(Object),
              itemsAdded: expect.any(Object),
            }),
          }),
        );
      });
    });

    describe('error cases', () => {
      it('should throw NotFoundException when cart not found', async () => {
        prisma.cart.findUnique.mockResolvedValue(null);

        await expect(
          service.addBundleToCart(mockCartId, { bundleId: mockBundleId }),
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.addBundleToCart(mockCartId, { bundleId: mockBundleId }),
        ).rejects.toThrow('Cart not found');
      });

      it('should throw NotFoundException when bundle not found', async () => {
        prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [] }));
        prisma.bundle.findUnique.mockResolvedValue(null);

        await expect(
          service.addBundleToCart(mockCartId, { bundleId: 'nonexistent' }),
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.addBundleToCart(mockCartId, { bundleId: 'nonexistent' }),
        ).rejects.toThrow('Bundle not found');
      });

      it('should throw NotFoundException when bundle is soft-deleted', async () => {
        prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [] }));
        prisma.bundle.findUnique.mockResolvedValue(
          createMockBundle({ deletedAt: new Date() }),
        );

        await expect(
          service.addBundleToCart(mockCartId, { bundleId: mockBundleId }),
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.addBundleToCart(mockCartId, { bundleId: mockBundleId }),
        ).rejects.toThrow('Bundle not found');
      });

      it('should throw BadRequestException when bundle is not active', async () => {
        prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [] }));
        prisma.bundle.findUnique.mockResolvedValue(
          createMockBundle({ isActive: false }),
        );

        await expect(
          service.addBundleToCart(mockCartId, { bundleId: mockBundleId }),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.addBundleToCart(mockCartId, { bundleId: mockBundleId }),
        ).rejects.toThrow('Bundle is not active');
      });

      it('should throw ForbiddenException when bundle is from different company (SECURITY)', async () => {
        prisma.cart.findUnique.mockResolvedValue(createMockCart({ companyId: 'company-A' }));
        prisma.bundle.findUnique.mockResolvedValue(
          createMockBundle({ companyId: 'company-B' }),
        );

        await expect(
          service.addBundleToCart(mockCartId, { bundleId: mockBundleId }),
        ).rejects.toThrow(ForbiddenException);
        await expect(
          service.addBundleToCart(mockCartId, { bundleId: mockBundleId }),
        ).rejects.toThrow('Bundle does not belong to this company');
      });

      it('should throw BadRequestException when mix-and-match selection is below minItems', async () => {
        const bundle = createMockBundle({
          type: 'MIX_AND_MATCH',
          minItems: 3,
          maxItems: 5,
          items: [
            createMockBundleItem({ productId: 'product-1', product: createMockProduct({ id: 'product-1' }) }),
            createMockBundleItem({ productId: 'product-2', product: createMockProduct({ id: 'product-2' }) }),
            createMockBundleItem({ productId: 'product-3', product: createMockProduct({ id: 'product-3' }) }),
          ],
        });
        prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [] }));
        prisma.bundle.findUnique.mockResolvedValue(bundle);

        const selectedItems: BundleItemSelection[] = [
          { productId: 'product-1', quantity: 1 },
          { productId: 'product-2', quantity: 1 },
        ];

        await expect(
          service.addBundleToCart(mockCartId, { bundleId: mockBundleId, selectedItems }),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.addBundleToCart(mockCartId, { bundleId: mockBundleId, selectedItems }),
        ).rejects.toThrow('Minimum 3 items required for this bundle');
      });

      it('should throw BadRequestException when mix-and-match selection exceeds maxItems', async () => {
        const bundle = createMockBundle({
          type: 'MIX_AND_MATCH',
          minItems: 2,
          maxItems: 4,
          items: [
            createMockBundleItem({ productId: 'product-1', product: createMockProduct({ id: 'product-1' }) }),
            createMockBundleItem({ productId: 'product-2', product: createMockProduct({ id: 'product-2' }) }),
            createMockBundleItem({ productId: 'product-3', product: createMockProduct({ id: 'product-3' }) }),
          ],
        });
        prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [] }));
        prisma.bundle.findUnique.mockResolvedValue(bundle);

        const selectedItems: BundleItemSelection[] = [
          { productId: 'product-1', quantity: 2 },
          { productId: 'product-2', quantity: 2 },
          { productId: 'product-3', quantity: 2 },
        ];

        await expect(
          service.addBundleToCart(mockCartId, { bundleId: mockBundleId, selectedItems }),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.addBundleToCart(mockCartId, { bundleId: mockBundleId, selectedItems }),
        ).rejects.toThrow('Maximum 4 items allowed for this bundle');
      });
    });

    describe('pricing strategies', () => {
      it('should use FIXED pricing strategy and return bundle product price', async () => {
        const bundle = createMockBundle({
          pricingStrategy: 'FIXED',
          product: createMockBundleProduct({ price: 49.99 }),
          items: [
            createMockBundleItem({
              product: createMockProduct({ price: 20.00 }),
              quantity: 1
            }),
            createMockBundleItem({
              id: 'item-2',
              productId: 'product-2',
              product: createMockProduct({ id: 'product-2', price: 25.00 }),
              quantity: 1
            }),
          ],
        });
        prisma.bundle.findUnique.mockResolvedValue(bundle);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart());

        const result = await service.addBundleToCart(mockCartId, { bundleId: mockBundleId });

        // FIXED pricing uses the bundle product price, not sum of items
        expect(result.bundlePrice).toBe(49.99);
      });

      it('should use CALCULATED pricing with PERCENTAGE discount', async () => {
        const bundle = createMockBundle({
          pricingStrategy: 'CALCULATED',
          discountType: 'PERCENTAGE',
          discountValue: 20, // 20% off
          product: createMockBundleProduct({ price: 0 }),
          items: [
            createMockBundleItem({
              product: createMockProduct({ price: 50.00 }),
              quantity: 2
            }),
          ],
        });
        prisma.bundle.findUnique.mockResolvedValue(bundle);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart());

        const result = await service.addBundleToCart(mockCartId, { bundleId: mockBundleId });

        // Items total = 50 * 2 = 100, 20% off = 80
        expect(result.bundlePrice).toBe(80);
      });

      it('should use CALCULATED pricing with FIXED_AMOUNT discount', async () => {
        const bundle = createMockBundle({
          pricingStrategy: 'CALCULATED',
          discountType: 'FIXED_AMOUNT',
          discountValue: 15, // $15 off
          product: createMockBundleProduct({ price: 0 }),
          items: [
            createMockBundleItem({
              product: createMockProduct({ price: 30.00 }),
              quantity: 2
            }),
          ],
        });
        prisma.bundle.findUnique.mockResolvedValue(bundle);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart());

        const result = await service.addBundleToCart(mockCartId, { bundleId: mockBundleId });

        // Items total = 30 * 2 = 60, $15 off = 45
        expect(result.bundlePrice).toBe(45);
      });

      it('should use CALCULATED pricing with FIXED_PRICE (overrides item total)', async () => {
        const bundle = createMockBundle({
          pricingStrategy: 'CALCULATED',
          discountType: 'FIXED_PRICE',
          discountValue: 39.99, // Fixed price regardless of items
          product: createMockBundleProduct({ price: 0 }),
          items: [
            createMockBundleItem({
              product: createMockProduct({ price: 100.00 }),
              quantity: 2
            }),
          ],
        });
        prisma.bundle.findUnique.mockResolvedValue(bundle);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart());

        const result = await service.addBundleToCart(mockCartId, { bundleId: mockBundleId });

        expect(result.bundlePrice).toBe(39.99);
      });

      it('should use TIERED pricing based on item quantity', async () => {
        const bundle = createMockBundle({
          pricingStrategy: 'TIERED',
          product: createMockBundleProduct({ price: 0 }),
          items: [
            createMockBundleItem({
              product: createMockProduct({ price: 10.00 }),
              quantity: 5 // 5 items = 15% discount tier
            }),
          ],
        });
        prisma.bundle.findUnique.mockResolvedValue(bundle);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart());

        const result = await service.addBundleToCart(mockCartId, { bundleId: mockBundleId });

        // Items total = 10 * 5 = 50, 15% tier discount = 42.5
        expect(result.bundlePrice).toBe(42.5);
      });

      it('should apply 5% tiered discount for 2 items', async () => {
        const bundle = createMockBundle({
          pricingStrategy: 'TIERED',
          product: createMockBundleProduct({ price: 0 }),
          items: [
            createMockBundleItem({
              product: createMockProduct({ price: 100.00 }),
              quantity: 2
            }),
          ],
        });
        prisma.bundle.findUnique.mockResolvedValue(bundle);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart());

        const result = await service.addBundleToCart(mockCartId, { bundleId: mockBundleId });

        // Items total = 100 * 2 = 200, 5% tier discount = 190
        expect(result.bundlePrice).toBe(190);
      });

      it('should apply 10% tiered discount for 3-4 items', async () => {
        const bundle = createMockBundle({
          pricingStrategy: 'TIERED',
          product: createMockBundleProduct({ price: 0 }),
          items: [
            createMockBundleItem({
              product: createMockProduct({ price: 100.00 }),
              quantity: 3
            }),
          ],
        });
        prisma.bundle.findUnique.mockResolvedValue(bundle);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart());

        const result = await service.addBundleToCart(mockCartId, { bundleId: mockBundleId });

        // Items total = 100 * 3 = 300, 10% tier discount = 270
        expect(result.bundlePrice).toBe(270);
      });

      it('should use priceOverride when specified on bundle item', async () => {
        const bundle = createMockBundle({
          pricingStrategy: 'CALCULATED',
          discountType: null,
          discountValue: null,
          items: [
            createMockBundleItem({
              product: createMockProduct({ price: 100.00 }),
              priceOverride: 75.00,  // Override the $100 price to $75
              quantity: 2
            }),
          ],
        });
        prisma.bundle.findUnique.mockResolvedValue(bundle);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart());

        const result = await service.addBundleToCart(mockCartId, { bundleId: mockBundleId });

        // Uses priceOverride: 75 * 2 = 150
        expect(result.bundlePrice).toBe(150);
      });

      it('should return zero price when calculated price would be negative', async () => {
        const bundle = createMockBundle({
          pricingStrategy: 'CALCULATED',
          discountType: 'FIXED_AMOUNT',
          discountValue: 500, // More than the items total
          items: [
            createMockBundleItem({
              product: createMockProduct({ price: 20.00 }),
              quantity: 1
            }),
          ],
        });
        prisma.bundle.findUnique.mockResolvedValue(bundle);
        prisma.cartItem.create.mockResolvedValue(createMockCartItem());
        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart());

        const result = await service.addBundleToCart(mockCartId, { bundleId: mockBundleId });

        // 20 - 500 would be -480, but should floor at 0
        expect(result.bundlePrice).toBe(0);
      });
    });
  });

  describe('removeBundleFromCart', () => {
    describe('success cases', () => {
      it('should remove all items with bundleGroupId', async () => {
        const bundleGroupId = 'bundle_test123';
        const bundleItems = [
          createMockCartItem({
            id: 'item-1',
            customFields: { bundleGroupId, isBundleItem: true }
          }),
          createMockCartItem({
            id: 'item-2',
            customFields: { bundleGroupId, isBundleItem: true }
          }),
          createMockCartItem({
            id: 'item-3',
            customFields: { bundleGroupId, isBundleItem: true }
          }),
        ];

        prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: bundleItems }));
        prisma.cartItem.findMany.mockResolvedValue(bundleItems);
        prisma.cartItem.deleteMany.mockResolvedValue({ count: 3 });
        prisma.cart.update.mockResolvedValue(createMockCart({ items: [] }));

        const result = await service.removeBundleFromCart(mockCartId, bundleGroupId);

        expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
          where: {
            id: { in: ['item-1', 'item-2', 'item-3'] },
          },
        });
        expect(result).toBeDefined();
      });

      it('should recalculate totals after bundle removal', async () => {
        const bundleGroupId = 'bundle_test123';
        const bundleItems = [
          createMockCartItem({ id: 'item-1', customFields: { bundleGroupId } }),
        ];

        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: bundleItems }))  // removeBundleFromCart lookup
          .mockResolvedValueOnce(createMockCart({ items: [] }))  // recalculateTotals
          .mockResolvedValueOnce(createMockCart({ items: [] }));  // getCartById
        prisma.cartItem.findMany.mockResolvedValue(bundleItems);
        prisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });
        prisma.cart.update.mockResolvedValue(createMockCart({ items: [] }));

        await service.removeBundleFromCart(mockCartId, bundleGroupId);

        // Verify cart.update was called (for recalculating totals and lastActivityAt)
        expect(prisma.cart.update).toHaveBeenCalled();
      });

      it('should update lastActivityAt after removal', async () => {
        const bundleGroupId = 'bundle_test123';
        const bundleItems = [
          createMockCartItem({ id: 'item-1', customFields: { bundleGroupId } }),
        ];

        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: bundleItems }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }));
        prisma.cartItem.findMany.mockResolvedValue(bundleItems);
        prisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });
        prisma.cart.update.mockResolvedValue(createMockCart({ items: [] }));

        await service.removeBundleFromCart(mockCartId, bundleGroupId);

        expect(prisma.cart.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: mockCartId },
            data: { lastActivityAt: expect.any(Date) },
          }),
        );
      });

      it('should create audit log when performedBy is provided', async () => {
        const bundleGroupId = 'bundle_test123';
        const bundleItems = [
          createMockCartItem({ id: 'item-1', customFields: { bundleGroupId } }),
          createMockCartItem({ id: 'item-2', customFields: { bundleGroupId } }),
        ];

        prisma.cart.findUnique
          .mockResolvedValueOnce(createMockCart({ items: bundleItems }))
          .mockResolvedValueOnce(createMockCart({ items: [] }))
          .mockResolvedValueOnce(createMockCart({ items: [] }));
        prisma.cartItem.findMany.mockResolvedValue(bundleItems);
        prisma.cartItem.deleteMany.mockResolvedValue({ count: 2 });
        prisma.cart.update.mockResolvedValue(createMockCart({ items: [] }));

        await service.removeBundleFromCart(mockCartId, bundleGroupId, mockUserId);

        expect(auditLogService.log).toHaveBeenCalledWith(
          AuditAction.DELETE,
          'CartItem',
          mockCartId,
          expect.objectContaining({
            userId: mockUserId,
            metadata: expect.objectContaining({
              bundleGroupId,
              itemsRemoved: 2,
            }),
          }),
        );
      });
    });

    describe('error cases', () => {
      it('should throw NotFoundException when cart not found', async () => {
        prisma.cart.findUnique.mockResolvedValue(null);

        await expect(
          service.removeBundleFromCart(mockCartId, 'bundle_123'),
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.removeBundleFromCart(mockCartId, 'bundle_123'),
        ).rejects.toThrow('Cart not found');
      });

      it('should throw NotFoundException when bundle group not found in cart', async () => {
        prisma.cart.findUnique.mockResolvedValue(createMockCart({ items: [] }));
        prisma.cartItem.findMany.mockResolvedValue([]); // No items with this bundleGroupId

        await expect(
          service.removeBundleFromCart(mockCartId, 'nonexistent_bundle_group'),
        ).rejects.toThrow(NotFoundException);
        await expect(
          service.removeBundleFromCart(mockCartId, 'nonexistent_bundle_group'),
        ).rejects.toThrow('Bundle group not found in cart');
      });
    });
  });

  describe('bundle edge cases', () => {
    it('should handle bundle with variant items', async () => {
      const bundle = createMockBundle({
        items: [
          createMockBundleItem({
            productId: 'product-1',
            variantId: 'variant-1',
            product: createMockProduct({ id: 'product-1' }),
            variant: { id: 'variant-1', name: 'Large', sku: 'PROD-1-L', price: 39.99 },
            quantity: 1
          }),
        ],
      });
      prisma.bundle.findUnique.mockResolvedValue(bundle);
      prisma.cartItem.create.mockResolvedValue(createMockCartItem());
      prisma.cart.findUnique
        .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
        .mockResolvedValueOnce(createMockCart({ items: [] }))
        .mockResolvedValueOnce(createMockCart());
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.cart.update.mockResolvedValue(createMockCart());

      const result = await service.addBundleToCart(mockCartId, { bundleId: mockBundleId });

      expect(result.itemsAdded).toBe(1);
      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            variantId: 'variant-1',
            unitPrice: 39.99, // Uses variant price
            productSnapshot: expect.objectContaining({
              name: 'Large', // Uses variant name
              sku: 'PROD-1-L', // Uses variant SKU
            }),
          }),
        }),
      );
    });

    it('should update existing bundle item quantity instead of creating new', async () => {
      const bundleGroupId = 'bundle_existing123';
      const existingItem = createMockCartItem({
        id: 'existing-item',
        quantity: 2,
        customFields: { bundleGroupId }
      });

      const bundle = createMockBundle({
        items: [createMockBundleItem({ product: createMockProduct() })],
      });

      prisma.bundle.findUnique.mockResolvedValue(bundle);
      prisma.cartItem.findFirst.mockResolvedValue(existingItem);
      prisma.cartItem.update.mockResolvedValue({ ...existingItem, quantity: 3 });
      prisma.cart.findUnique
        .mockResolvedValueOnce(createMockCart({ items: [existingItem], savedItems: [] }))
        .mockResolvedValueOnce(createMockCart({ items: [] }))
        .mockResolvedValueOnce(createMockCart());
      prisma.cart.update.mockResolvedValue(createMockCart());

      const result = await service.addBundleToCart(mockCartId, { bundleId: mockBundleId });

      // Should update, not create new
      expect(prisma.cartItem.update).toHaveBeenCalled();
      expect(result.itemsAdded).toBe(0); // No NEW items added, just updated
    });

    it('should skip bundle items with no product', async () => {
      const bundle = createMockBundle({
        items: [
          createMockBundleItem({ product: null }), // No product (edge case)
          createMockBundleItem({
            id: 'item-2',
            productId: 'product-2',
            product: createMockProduct({ id: 'product-2' })
          }),
        ],
      });
      prisma.bundle.findUnique.mockResolvedValue(bundle);
      prisma.cartItem.create.mockResolvedValue(createMockCartItem());
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.cart.findUnique
        .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
        .mockResolvedValueOnce(createMockCart({ items: [] }))
        .mockResolvedValueOnce(createMockCart());
      prisma.cart.update.mockResolvedValue(createMockCart());

      const result = await service.addBundleToCart(mockCartId, { bundleId: mockBundleId });

      // Should only add the item with a product
      expect(result.itemsAdded).toBe(1);
      expect(prisma.cartItem.create).toHaveBeenCalledTimes(1);
    });

    it('should handle mix-and-match with custom quantities per selected item', async () => {
      const bundle = createMockBundle({
        type: 'MIX_AND_MATCH',
        minItems: 2,
        maxItems: 10,
        items: [
          createMockBundleItem({ productId: 'product-1', quantity: 1, product: createMockProduct({ id: 'product-1' }) }),
          createMockBundleItem({ id: 'item-2', productId: 'product-2', quantity: 1, product: createMockProduct({ id: 'product-2' }) }),
        ],
      });
      prisma.bundle.findUnique.mockResolvedValue(bundle);
      prisma.cartItem.create.mockResolvedValue(createMockCartItem());
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.cart.findUnique
        .mockResolvedValueOnce(createMockCart({ items: [], savedItems: [] }))
        .mockResolvedValueOnce(createMockCart({ items: [] }))
        .mockResolvedValueOnce(createMockCart());
      prisma.cart.update.mockResolvedValue(createMockCart());

      const selectedItems: BundleItemSelection[] = [
        { productId: 'product-1', quantity: 3 },
        { productId: 'product-2', quantity: 2 },
      ];

      await service.addBundleToCart(mockCartId, {
        bundleId: mockBundleId,
        selectedItems,
      });

      // Verify quantities are from selected items
      const createCalls = (prisma.cartItem.create as jest.Mock).mock.calls;
      expect(createCalls[0][0].data.quantity).toBe(3);
      expect(createCalls[1][0].data.quantity).toBe(2);
    });
  });
});
