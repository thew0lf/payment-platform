/**
 * Inventory Hold Service Unit Tests
 *
 * Comprehensive tests for inventory hold management including:
 * - Creating inventory holds for cart items
 * - Releasing holds (cart-level and item-level)
 * - Converting holds to orders
 * - Checking availability (single and bulk)
 * - Extending hold duration
 * - Low stock warnings
 * - Expired hold cleanup (cron job)
 * - Hold status retrieval
 *
 * @environment jsdom
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  InventoryHoldService,
  InventoryHold,
  InventoryAvailability,
  HoldConfig,
} from './inventory-hold.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('InventoryHoldService', () => {
  let service: InventoryHoldService;
  let prisma: any;

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockCompanyId = 'company-123';
  const mockCartId = 'cart-456';
  const mockProductId = 'product-001';
  const mockVariantId = 'variant-001';
  const mockOrderId = 'order-789';
  const mockHoldId = 'hold-001';

  const createMockProduct = (overrides: Partial<any> = {}) => ({
    id: mockProductId,
    companyId: mockCompanyId,
    stockQuantity: 100,
    trackInventory: true,
    deletedAt: null,
    ...overrides,
  });

  const createMockCartItem = (overrides: Partial<any> = {}) => ({
    id: 'item-001',
    cartId: mockCartId,
    productId: mockProductId,
    variantId: null,
    quantity: 2,
    ...overrides,
  });

  const createMockCart = (overrides: Partial<any> = {}) => ({
    id: mockCartId,
    companyId: mockCompanyId,
    items: [createMockCartItem()],
    ...overrides,
  });

  const createMockHold = (overrides: Partial<any> = {}) => ({
    id: mockHoldId,
    cartId: mockCartId,
    productId: mockProductId,
    variantId: '',
    companyId: mockCompanyId,
    quantity: 2,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
    status: 'ACTIVE',
    orderId: null,
    releasedAt: null,
    convertedAt: null,
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    prisma = {
      cart: {
        findUnique: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      inventoryHold: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryHoldService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<InventoryHoldService>(InventoryHoldService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // createHoldsForCart TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('createHoldsForCart', () => {
    it('should create inventory holds for all cart items', async () => {
      const mockCart = createMockCart();
      const mockProduct = createMockProduct();
      const mockHold = createMockHold();

      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
      prisma.inventoryHold.upsert.mockResolvedValue(mockHold);

      const result = await service.createHoldsForCart(mockCartId, mockCompanyId);

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe(mockProductId);
      expect(result[0].status).toBe('ACTIVE');
      expect(prisma.inventoryHold.upsert).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException if cart not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      await expect(
        service.createHoldsForCart(mockCartId, mockCompanyId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if insufficient stock and oversell not allowed', async () => {
      const mockCart = createMockCart({
        items: [createMockCartItem({ quantity: 10 })],
      });
      // Product with zero stock - checkAvailability returns isAvailable: false
      const mockProduct = createMockProduct({ stockQuantity: 0 });

      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

      await expect(
        service.createHoldsForCart(mockCartId, mockCompanyId),
      ).rejects.toThrow('Sorry, one or more items in your cart are no longer available in the requested quantity.');
    });

    it('should handle cart with multiple items', async () => {
      const mockCart = createMockCart({
        items: [
          createMockCartItem({ productId: 'product-001', quantity: 2 }),
          createMockCartItem({ productId: 'product-002', quantity: 3 }),
        ],
      });
      const mockProduct = createMockProduct();
      const mockHold = createMockHold();

      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
      prisma.inventoryHold.upsert.mockResolvedValue(mockHold);

      const result = await service.createHoldsForCart(mockCartId, mockCompanyId);

      expect(result).toHaveLength(2);
      expect(prisma.inventoryHold.upsert).toHaveBeenCalledTimes(2);
    });

    it('should handle cart items with variants', async () => {
      const mockCart = createMockCart({
        items: [createMockCartItem({ variantId: mockVariantId })],
      });
      const mockProduct = createMockProduct();
      const mockHold = createMockHold({ variantId: mockVariantId });

      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
      prisma.inventoryHold.upsert.mockResolvedValue(mockHold);

      const result = await service.createHoldsForCart(mockCartId, mockCompanyId);

      expect(result[0].variantId).toBe(mockVariantId);
    });

    it('should update existing hold if one exists for same product', async () => {
      const mockCart = createMockCart();
      const mockProduct = createMockProduct();
      const updatedHold = createMockHold({ quantity: 5 });

      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
      prisma.inventoryHold.upsert.mockResolvedValue(updatedHold);

      await service.createHoldsForCart(mockCartId, mockCompanyId);

      expect(prisma.inventoryHold.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            cartId_productId_variantId: {
              cartId: mockCartId,
              productId: mockProductId,
              variantId: '',
            },
          },
        }),
      );
    });

    it('should return empty array if cart has no items', async () => {
      const mockCart = createMockCart({ items: [] });

      prisma.cart.findUnique.mockResolvedValue(mockCart);

      const result = await service.createHoldsForCart(mockCartId, mockCompanyId);

      expect(result).toHaveLength(0);
      expect(prisma.inventoryHold.upsert).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // releaseHoldsForCart TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('releaseHoldsForCart', () => {
    it('should release all active holds for a cart', async () => {
      prisma.inventoryHold.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.releaseHoldsForCart(mockCartId);

      expect(result).toBe(3);
      expect(prisma.inventoryHold.updateMany).toHaveBeenCalledWith({
        where: {
          cartId: mockCartId,
          status: 'ACTIVE',
        },
        data: {
          status: 'RELEASED',
          releasedAt: expect.any(Date),
        },
      });
    });

    it('should return 0 if no active holds exist', async () => {
      prisma.inventoryHold.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.releaseHoldsForCart(mockCartId);

      expect(result).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // releaseHoldForItem TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('releaseHoldForItem', () => {
    it('should release hold for a specific item without variant', async () => {
      prisma.inventoryHold.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.releaseHoldForItem(mockCartId, mockProductId);

      expect(result).toBe(true);
      expect(prisma.inventoryHold.updateMany).toHaveBeenCalledWith({
        where: {
          cartId: mockCartId,
          productId: mockProductId,
          variantId: '',
          status: 'ACTIVE',
        },
        data: {
          status: 'RELEASED',
          releasedAt: expect.any(Date),
        },
      });
    });

    it('should release hold for a specific item with variant', async () => {
      prisma.inventoryHold.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.releaseHoldForItem(
        mockCartId,
        mockProductId,
        mockVariantId,
      );

      expect(result).toBe(true);
      expect(prisma.inventoryHold.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            variantId: mockVariantId,
          }),
        }),
      );
    });

    it('should return false if no hold found for item', async () => {
      prisma.inventoryHold.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.releaseHoldForItem(mockCartId, mockProductId);

      expect(result).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // convertHoldsToOrder TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('convertHoldsToOrder', () => {
    it('should convert all active holds to order', async () => {
      prisma.inventoryHold.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.convertHoldsToOrder(mockCartId, mockOrderId);

      expect(result).toBe(2);
      expect(prisma.inventoryHold.updateMany).toHaveBeenCalledWith({
        where: {
          cartId: mockCartId,
          status: 'ACTIVE',
        },
        data: {
          status: 'CONVERTED',
          orderId: mockOrderId,
          convertedAt: expect.any(Date),
        },
      });
    });

    it('should return 0 if no active holds to convert', async () => {
      prisma.inventoryHold.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.convertHoldsToOrder(mockCartId, mockOrderId);

      expect(result).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // checkAvailability TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('checkAvailability', () => {
    it('should return availability for product with stock', async () => {
      const mockProduct = createMockProduct({ stockQuantity: 100 });
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 20 } });

      const result = await service.checkAvailability(
        mockProductId,
        undefined,
        mockCompanyId,
      );

      expect(result).toEqual({
        productId: mockProductId,
        variantId: undefined,
        totalStock: 100,
        reserved: 20,
        available: 80,
        isAvailable: true,
      });
    });

    it('should return isAvailable false when no stock available', async () => {
      const mockProduct = createMockProduct({ stockQuantity: 10 });
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 10 } });

      const result = await service.checkAvailability(
        mockProductId,
        undefined,
        mockCompanyId,
      );

      expect(result.available).toBe(0);
      expect(result.isAvailable).toBe(false);
    });

    it('should return unavailable for non-existent product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      const result = await service.checkAvailability(
        'non-existent',
        undefined,
        mockCompanyId,
      );

      expect(result).toEqual({
        productId: 'non-existent',
        variantId: undefined,
        totalStock: 0,
        reserved: 0,
        available: 0,
        isAvailable: false,
      });
    });

    it('should return always available for products not tracking inventory', async () => {
      const mockProduct = createMockProduct({ trackInventory: false });
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.checkAvailability(
        mockProductId,
        undefined,
        mockCompanyId,
      );

      expect(result).toEqual({
        productId: mockProductId,
        variantId: undefined,
        totalStock: 999999,
        reserved: 0,
        available: 999999,
        isAvailable: true,
      });
    });

    it('should handle variant-specific availability check', async () => {
      const mockProduct = createMockProduct();
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 5 } });

      const result = await service.checkAvailability(
        mockProductId,
        mockVariantId,
        mockCompanyId,
      );

      expect(result.variantId).toBe(mockVariantId);
      expect(prisma.inventoryHold.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            variantId: mockVariantId,
          }),
        }),
      );
    });

    it('should handle null stockQuantity as 0', async () => {
      const mockProduct = createMockProduct({ stockQuantity: null });
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

      const result = await service.checkAvailability(
        mockProductId,
        undefined,
        mockCompanyId,
      );

      expect(result.totalStock).toBe(0);
      expect(result.available).toBe(0);
    });

    it('should handle null aggregate sum as 0 reserved', async () => {
      const mockProduct = createMockProduct();
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: null } });

      const result = await service.checkAvailability(
        mockProductId,
        undefined,
        mockCompanyId,
      );

      expect(result.reserved).toBe(0);
      expect(result.available).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // checkBulkAvailability TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('checkBulkAvailability', () => {
    it('should check availability for multiple products', async () => {
      // Mock batch product fetch
      prisma.product.findMany.mockResolvedValue([
        createMockProduct({ id: 'product-001' }),
        createMockProduct({ id: 'product-002' }),
        createMockProduct({ id: 'product-003' }),
      ]);
      // Mock batch holds fetch (no active holds)
      prisma.inventoryHold.findMany.mockResolvedValue([]);

      const items = [
        { productId: 'product-001', quantity: 2 },
        { productId: 'product-002', quantity: 3 },
        { productId: 'product-003', variantId: 'variant-001', quantity: 1 },
      ];

      const result = await service.checkBulkAvailability(items, mockCompanyId);

      expect(result.size).toBe(3);
      expect(result.get('product-001:')).toBeDefined();
      expect(result.get('product-002:')).toBeDefined();
      expect(result.get('product-003:variant-001')).toBeDefined();
    });

    it('should return empty map for empty items array', async () => {
      const result = await service.checkBulkAvailability([], mockCompanyId);

      expect(result.size).toBe(0);
    });

    it('should use correct key format for items with and without variants', async () => {
      // Mock batch product fetch
      prisma.product.findMany.mockResolvedValue([
        createMockProduct({ id: 'product-001' }),
      ]);
      // Mock batch holds fetch (no active holds)
      prisma.inventoryHold.findMany.mockResolvedValue([]);

      const items = [
        { productId: 'product-001', quantity: 1 },
        { productId: 'product-001', variantId: 'variant-001', quantity: 1 },
      ];

      const result = await service.checkBulkAvailability(items, mockCompanyId);

      expect(result.has('product-001:')).toBe(true);
      expect(result.has('product-001:variant-001')).toBe(true);
    });

    it('should correctly calculate availability with existing holds', async () => {
      prisma.product.findMany.mockResolvedValue([
        createMockProduct({ id: 'product-001', stockQuantity: 100 }),
      ]);
      // Mock holds that reserve 30 units
      prisma.inventoryHold.findMany.mockResolvedValue([
        { productId: 'product-001', variantId: '', quantity: 20 },
        { productId: 'product-001', variantId: '', quantity: 10 },
      ]);

      const items = [{ productId: 'product-001', quantity: 5 }];
      const result = await service.checkBulkAvailability(items, mockCompanyId);

      const availability = result.get('product-001:');
      expect(availability?.totalStock).toBe(100);
      expect(availability?.reserved).toBe(30);
      expect(availability?.available).toBe(70);
      expect(availability?.isAvailable).toBe(true);
    });

    it('should return unavailable for products not found', async () => {
      prisma.product.findMany.mockResolvedValue([]); // No products found
      prisma.inventoryHold.findMany.mockResolvedValue([]);

      const items = [{ productId: 'non-existent', quantity: 1 }];
      const result = await service.checkBulkAvailability(items, mockCompanyId);

      const availability = result.get('non-existent:');
      expect(availability?.isAvailable).toBe(false);
      expect(availability?.totalStock).toBe(0);
    });

    it('should handle products not tracking inventory', async () => {
      prisma.product.findMany.mockResolvedValue([
        createMockProduct({ id: 'product-001', trackInventory: false }),
      ]);
      prisma.inventoryHold.findMany.mockResolvedValue([]);

      const items = [{ productId: 'product-001', quantity: 1 }];
      const result = await service.checkBulkAvailability(items, mockCompanyId);

      const availability = result.get('product-001:');
      expect(availability?.totalStock).toBe(999999);
      expect(availability?.isAvailable).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // extendHolds TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('extendHolds', () => {
    it('should extend hold duration for all active holds', async () => {
      const mockHolds = [
        createMockHold({ id: 'hold-1', expiresAt: new Date() }),
        createMockHold({ id: 'hold-2', expiresAt: new Date() }),
      ];

      prisma.inventoryHold.findMany.mockResolvedValue(mockHolds);
      prisma.inventoryHold.update.mockResolvedValue({});

      const result = await service.extendHolds(mockCartId, 10);

      expect(result).toBe(2);
      expect(prisma.inventoryHold.update).toHaveBeenCalledTimes(2);
    });

    it('should return 0 if no active holds exist', async () => {
      prisma.inventoryHold.findMany.mockResolvedValue([]);

      const result = await service.extendHolds(mockCartId, 10);

      expect(result).toBe(0);
      expect(prisma.inventoryHold.update).not.toHaveBeenCalled();
    });

    it('should calculate new expiration time correctly', async () => {
      const originalExpiresAt = new Date('2024-01-01T12:00:00Z');
      const mockHold = createMockHold({ expiresAt: originalExpiresAt });

      prisma.inventoryHold.findMany.mockResolvedValue([mockHold]);
      prisma.inventoryHold.update.mockResolvedValue({});

      await service.extendHolds(mockCartId, 30);

      expect(prisma.inventoryHold.update).toHaveBeenCalledWith({
        where: { id: mockHold.id },
        data: {
          expiresAt: new Date(originalExpiresAt.getTime() + 30 * 60 * 1000),
        },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getLowStockWarnings TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getLowStockWarnings', () => {
    it('should return warnings for items with low stock', async () => {
      const mockCart = createMockCart();
      const mockProduct = createMockProduct({ stockQuantity: 3 }); // Below default threshold of 5

      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

      const result = await service.getLowStockWarnings(mockCartId, mockCompanyId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        productId: mockProductId,
        variantId: undefined,
        available: 3,
        requested: 2,
      });
    });

    it('should return empty array if cart not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      const result = await service.getLowStockWarnings(mockCartId, mockCompanyId);

      expect(result).toHaveLength(0);
    });

    it('should not include items with stock above threshold', async () => {
      const mockCart = createMockCart();
      const mockProduct = createMockProduct({ stockQuantity: 100 }); // Above threshold

      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

      const result = await service.getLowStockWarnings(mockCartId, mockCompanyId);

      expect(result).toHaveLength(0);
    });

    it('should handle multiple items with varying stock levels', async () => {
      const mockCart = createMockCart({
        items: [
          createMockCartItem({ productId: 'product-low', quantity: 1 }),
          createMockCartItem({ productId: 'product-high', quantity: 1 }),
        ],
      });

      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.product.findFirst
        .mockResolvedValueOnce(createMockProduct({ id: 'product-low', stockQuantity: 2 }))
        .mockResolvedValueOnce(createMockProduct({ id: 'product-high', stockQuantity: 100 }));
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

      const result = await service.getLowStockWarnings(mockCartId, mockCompanyId);

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('product-low');
    });

    it('should include variantId in warning when applicable', async () => {
      const mockCart = createMockCart({
        items: [createMockCartItem({ variantId: mockVariantId })],
      });
      const mockProduct = createMockProduct({ stockQuantity: 2 });

      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

      const result = await service.getLowStockWarnings(mockCartId, mockCompanyId);

      expect(result[0].variantId).toBe(mockVariantId);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // releaseExpiredHolds TESTS (Cron Job)
  // ═══════════════════════════════════════════════════════════════

  describe('releaseExpiredHolds', () => {
    it('should release all expired active holds', async () => {
      prisma.inventoryHold.updateMany.mockResolvedValue({ count: 5 });

      await service.releaseExpiredHolds();

      expect(prisma.inventoryHold.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          expiresAt: { lt: expect.any(Date) },
        },
        data: {
          status: 'EXPIRED',
          releasedAt: expect.any(Date),
        },
      });
    });

    it('should handle case where no expired holds exist', async () => {
      prisma.inventoryHold.updateMany.mockResolvedValue({ count: 0 });

      await service.releaseExpiredHolds();

      expect(prisma.inventoryHold.updateMany).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getHoldStatus TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getHoldStatus', () => {
    it('should return hold status with active holds', async () => {
      const mockHolds = [
        createMockHold({ id: 'hold-1', expiresAt: new Date('2024-01-01T12:00:00Z') }),
        createMockHold({ id: 'hold-2', expiresAt: new Date('2024-01-01T12:30:00Z') }),
      ];

      prisma.inventoryHold.findMany.mockResolvedValue(mockHolds);

      const result = await service.getHoldStatus(mockCartId);

      expect(result.hasActiveHolds).toBe(true);
      expect(result.holds).toHaveLength(2);
      expect(result.expiresAt).toEqual(new Date('2024-01-01T12:00:00Z'));
    });

    it('should return no active holds when none exist', async () => {
      prisma.inventoryHold.findMany.mockResolvedValue([]);

      const result = await service.getHoldStatus(mockCartId);

      expect(result.hasActiveHolds).toBe(false);
      expect(result.holds).toHaveLength(0);
      expect(result.expiresAt).toBeUndefined();
    });

    it('should query only active holds for the cart', async () => {
      prisma.inventoryHold.findMany.mockResolvedValue([]);

      await service.getHoldStatus(mockCartId);

      expect(prisma.inventoryHold.findMany).toHaveBeenCalledWith({
        where: {
          cartId: mockCartId,
          status: 'ACTIVE',
        },
        orderBy: { expiresAt: 'asc' },
      });
    });

    it('should correctly map hold data to InventoryHold interface', async () => {
      const mockHold = createMockHold({ variantId: mockVariantId });
      prisma.inventoryHold.findMany.mockResolvedValue([mockHold]);

      const result = await service.getHoldStatus(mockCartId);

      expect(result.holds[0]).toEqual({
        id: mockHold.id,
        cartId: mockHold.cartId,
        productId: mockHold.productId,
        variantId: mockVariantId,
        quantity: mockHold.quantity,
        expiresAt: mockHold.expiresAt,
        status: 'ACTIVE',
      });
    });

    it('should convert empty variantId string to undefined', async () => {
      const mockHold = createMockHold({ variantId: '' });
      prisma.inventoryHold.findMany.mockResolvedValue([mockHold]);

      const result = await service.getHoldStatus(mockCartId);

      expect(result.holds[0].variantId).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // HOLD LIFECYCLE INTEGRATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Hold Lifecycle', () => {
    it('should support full lifecycle: create → extend → convert', async () => {
      // Create
      const mockCart = createMockCart();
      const mockProduct = createMockProduct();
      const mockHold = createMockHold();

      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
      prisma.inventoryHold.upsert.mockResolvedValue(mockHold);

      const holds = await service.createHoldsForCart(mockCartId, mockCompanyId);
      expect(holds).toHaveLength(1);

      // Extend
      prisma.inventoryHold.findMany.mockResolvedValue([mockHold]);
      prisma.inventoryHold.update.mockResolvedValue({});

      const extendedCount = await service.extendHolds(mockCartId, 15);
      expect(extendedCount).toBe(1);

      // Convert
      prisma.inventoryHold.updateMany.mockResolvedValue({ count: 1 });

      const convertedCount = await service.convertHoldsToOrder(mockCartId, mockOrderId);
      expect(convertedCount).toBe(1);
    });

    it('should support full lifecycle: create → release', async () => {
      // Create
      const mockCart = createMockCart();
      const mockProduct = createMockProduct();
      const mockHold = createMockHold();

      prisma.cart.findUnique.mockResolvedValue(mockCart);
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
      prisma.inventoryHold.upsert.mockResolvedValue(mockHold);

      const holds = await service.createHoldsForCart(mockCartId, mockCompanyId);
      expect(holds).toHaveLength(1);

      // Release
      prisma.inventoryHold.updateMany.mockResolvedValue({ count: 1 });

      const releasedCount = await service.releaseHoldsForCart(mockCartId);
      expect(releasedCount).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle product with zero stock', async () => {
      const mockProduct = createMockProduct({ stockQuantity: 0 });
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

      const result = await service.checkAvailability(
        mockProductId,
        undefined,
        mockCompanyId,
      );

      expect(result.available).toBe(0);
      expect(result.isAvailable).toBe(false);
    });

    it('should handle reserved quantity exceeding stock', async () => {
      const mockProduct = createMockProduct({ stockQuantity: 10 });
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 15 } });

      const result = await service.checkAvailability(
        mockProductId,
        undefined,
        mockCompanyId,
      );

      expect(result.available).toBe(0); // Math.max(0, 10-15) = 0
      expect(result.isAvailable).toBe(false);
    });

    it('should handle deleted product (deletedAt not null)', async () => {
      prisma.product.findFirst.mockResolvedValue(null); // Query excludes deleted products

      const result = await service.checkAvailability(
        mockProductId,
        undefined,
        mockCompanyId,
      );

      expect(result.isAvailable).toBe(false);
    });

    it('should handle very large stock quantities', async () => {
      const mockProduct = createMockProduct({ stockQuantity: 1000000 });
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 500000 } });

      const result = await service.checkAvailability(
        mockProductId,
        undefined,
        mockCompanyId,
      );

      expect(result.totalStock).toBe(1000000);
      expect(result.reserved).toBe(500000);
      expect(result.available).toBe(500000);
      expect(result.isAvailable).toBe(true);
    });

    it('should handle exactly 1 item available', async () => {
      const mockProduct = createMockProduct({ stockQuantity: 5 });
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 4 } });

      const result = await service.checkAvailability(
        mockProductId,
        undefined,
        mockCompanyId,
      );

      expect(result.available).toBe(1);
      expect(result.isAvailable).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL COVERAGE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Additional Coverage', () => {
    describe('createHoldsForCart - additional scenarios', () => {
      it('should set correct expiresAt based on config duration', async () => {
        const mockCart = createMockCart();
        const mockProduct = createMockProduct();
        const beforeCreate = Date.now();

        prisma.cart.findUnique.mockResolvedValue(mockCart);
        prisma.product.findFirst.mockResolvedValue(mockProduct);
        prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
        prisma.inventoryHold.upsert.mockImplementation(async (args: any) => ({
          id: 'hold-123',
          cartId: mockCartId,
          productId: mockProductId,
          variantId: '',
          quantity: 2,
          expiresAt: args.create.expiresAt,
          status: 'ACTIVE',
        }));

        const result = await service.createHoldsForCart(mockCartId, mockCompanyId);
        const afterCreate = Date.now();

        // Default config is 15 minutes
        const expectedMinExpiry = beforeCreate + 15 * 60 * 1000;
        const expectedMaxExpiry = afterCreate + 15 * 60 * 1000;

        expect(result[0].expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
        expect(result[0].expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
      });

      it('should handle null variantId in cart items', async () => {
        const mockCart = createMockCart({
          items: [createMockCartItem({ variantId: null })],
        });
        const mockProduct = createMockProduct();
        const mockHold = createMockHold();

        prisma.cart.findUnique.mockResolvedValue(mockCart);
        prisma.product.findFirst.mockResolvedValue(mockProduct);
        prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });
        prisma.inventoryHold.upsert.mockResolvedValue(mockHold);

        await service.createHoldsForCart(mockCartId, mockCompanyId);

        expect(prisma.inventoryHold.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              cartId_productId_variantId: expect.objectContaining({
                variantId: '',
              }),
            }),
          }),
        );
      });
    });

    describe('releaseHoldForItem - additional scenarios', () => {
      it('should use empty string for undefined variantId', async () => {
        prisma.inventoryHold.updateMany.mockResolvedValue({ count: 1 });

        await service.releaseHoldForItem(mockCartId, mockProductId, undefined);

        expect(prisma.inventoryHold.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              variantId: '',
            }),
          }),
        );
      });
    });

    describe('checkAvailability - additional scenarios', () => {
      it('should only consider non-expired active holds', async () => {
        const mockProduct = createMockProduct();
        prisma.product.findFirst.mockResolvedValue(mockProduct);
        prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 10 } });

        await service.checkAvailability(mockProductId, undefined, mockCompanyId);

        expect(prisma.inventoryHold.aggregate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: 'ACTIVE',
              expiresAt: { gt: expect.any(Date) },
            }),
          }),
        );
      });

      it('should use empty string for undefined variantId in aggregate query', async () => {
        const mockProduct = createMockProduct();
        prisma.product.findFirst.mockResolvedValue(mockProduct);
        prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

        await service.checkAvailability(mockProductId, undefined, mockCompanyId);

        expect(prisma.inventoryHold.aggregate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              variantId: '',
            }),
          }),
        );
      });
    });

    describe('extendHolds - additional scenarios', () => {
      it('should extend each hold individually', async () => {
        const holds = [
          createMockHold({ id: 'hold-1', expiresAt: new Date('2024-01-01T10:00:00Z') }),
          createMockHold({ id: 'hold-2', expiresAt: new Date('2024-01-01T11:00:00Z') }),
          createMockHold({ id: 'hold-3', expiresAt: new Date('2024-01-01T12:00:00Z') }),
        ];

        prisma.inventoryHold.findMany.mockResolvedValue(holds);
        prisma.inventoryHold.update.mockResolvedValue({});

        const result = await service.extendHolds(mockCartId, 60);

        expect(result).toBe(3);
        expect(prisma.inventoryHold.update).toHaveBeenCalledWith({
          where: { id: 'hold-1' },
          data: { expiresAt: new Date('2024-01-01T11:00:00Z') },
        });
        expect(prisma.inventoryHold.update).toHaveBeenCalledWith({
          where: { id: 'hold-2' },
          data: { expiresAt: new Date('2024-01-01T12:00:00Z') },
        });
        expect(prisma.inventoryHold.update).toHaveBeenCalledWith({
          where: { id: 'hold-3' },
          data: { expiresAt: new Date('2024-01-01T13:00:00Z') },
        });
      });
    });

    describe('getHoldStatus - additional scenarios', () => {
      it('should order holds by expiresAt ascending', async () => {
        prisma.inventoryHold.findMany.mockResolvedValue([]);

        await service.getHoldStatus(mockCartId);

        expect(prisma.inventoryHold.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { expiresAt: 'asc' },
          }),
        );
      });

      it('should return earliest expiration time as expiresAt', async () => {
        const holds = [
          createMockHold({ expiresAt: new Date('2024-01-01T10:00:00Z') }),
          createMockHold({ expiresAt: new Date('2024-01-01T09:00:00Z') }),
        ];

        // Mocking assumes findMany returns in the correct order (ordered by expiresAt asc)
        prisma.inventoryHold.findMany.mockResolvedValue([
          createMockHold({ expiresAt: new Date('2024-01-01T09:00:00Z') }),
          createMockHold({ expiresAt: new Date('2024-01-01T10:00:00Z') }),
        ]);

        const result = await service.getHoldStatus(mockCartId);

        expect(result.expiresAt).toEqual(new Date('2024-01-01T09:00:00Z'));
      });
    });

    describe('getLowStockWarnings - additional scenarios', () => {
      it('should include items at exactly threshold value', async () => {
        const mockCart = createMockCart({
          items: [createMockCartItem({ quantity: 1 })],
        });
        // Stock exactly at threshold (5)
        const mockProduct = createMockProduct({ stockQuantity: 5 });

        prisma.cart.findUnique.mockResolvedValue(mockCart);
        prisma.product.findFirst.mockResolvedValue(mockProduct);
        prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

        const result = await service.getLowStockWarnings(mockCartId, mockCompanyId);

        // 5 <= 5 (threshold), so should be included
        expect(result).toHaveLength(1);
        expect(result[0].available).toBe(5);
      });

      it('should exclude items just above threshold', async () => {
        const mockCart = createMockCart({
          items: [createMockCartItem({ quantity: 1 })],
        });
        // Stock just above threshold (6 > 5)
        const mockProduct = createMockProduct({ stockQuantity: 6 });

        prisma.cart.findUnique.mockResolvedValue(mockCart);
        prisma.product.findFirst.mockResolvedValue(mockProduct);
        prisma.inventoryHold.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

        const result = await service.getLowStockWarnings(mockCartId, mockCompanyId);

        expect(result).toHaveLength(0);
      });
    });

    describe('convertHoldsToOrder - additional scenarios', () => {
      it('should set convertedAt timestamp when converting', async () => {
        prisma.inventoryHold.updateMany.mockResolvedValue({ count: 1 });
        const beforeConvert = new Date();

        await service.convertHoldsToOrder(mockCartId, mockOrderId);

        expect(prisma.inventoryHold.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'CONVERTED',
              orderId: mockOrderId,
              convertedAt: expect.any(Date),
            }),
          }),
        );

        const callArg = prisma.inventoryHold.updateMany.mock.calls[0][0];
        expect(callArg.data.convertedAt.getTime()).toBeGreaterThanOrEqual(beforeConvert.getTime());
      });
    });
  });
});
