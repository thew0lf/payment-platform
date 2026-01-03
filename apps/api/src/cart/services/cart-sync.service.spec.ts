import { Test, TestingModule } from '@nestjs/testing';
import { CartSyncService, CartMergeResult, SyncResult } from './cart-sync.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CartStatus } from '@prisma/client';

describe('CartSyncService', () => {
  let service: CartSyncService;
  let prisma: any;

  const mockCompanyId = 'company-123';
  const mockCustomerId = 'customer-456';
  const mockSessionToken = 'session-abc';

  const mockCustomerCart = {
    id: 'cart-customer',
    companyId: mockCompanyId,
    customerId: mockCustomerId,
    sessionToken: 'session-customer',
    status: CartStatus.ACTIVE,
    currency: 'USD',
    subtotal: 100,
    items: [
      { id: 'item-1', productId: 'prod-1', variantId: null, quantity: 2, unitPrice: 25, originalPrice: 25, lineTotal: 50 },
    ],
    savedItems: [],
    discountCodes: [],
  };

  const mockAnonymousCart = {
    id: 'cart-anonymous',
    companyId: mockCompanyId,
    customerId: null,
    sessionToken: mockSessionToken,
    status: CartStatus.ACTIVE,
    currency: 'USD',
    subtotal: 150,
    items: [
      { id: 'item-2', productId: 'prod-2', variantId: null, quantity: 1, unitPrice: 30, originalPrice: 30, lineTotal: 30 },
      { id: 'item-3', productId: 'prod-3', variantId: 'var-1', quantity: 3, unitPrice: 40, originalPrice: 40, lineTotal: 120 },
    ],
    savedItems: [
      { id: 'saved-1', productId: 'prod-4', variantId: null },
    ],
    discountCodes: ['SAVE10'],
  };

  const mockHistoricalCart = {
    id: 'cart-historical',
    companyId: mockCompanyId,
    customerId: mockCustomerId,
    status: CartStatus.CONVERTED,
    currency: 'USD',
    subtotal: 200,
    convertedAt: new Date(),
    abandonedAt: null,
    items: [
      {
        id: 'hist-item-1',
        productId: 'prod-5',
        variantId: null,
        quantity: 2,
        unitPrice: 50,
        originalPrice: 50,
        lineTotal: 100,
        productSnapshot: { name: 'Product 5' },
        product: { id: 'prod-5', name: 'Product 5', images: ['img1.jpg'] },
      },
    ],
  };

  beforeEach(async () => {
    const mockPrisma = {
      cart: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      cartItem: {
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      savedCartItem: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartSyncService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CartSyncService>(CartSyncService);
    prisma = module.get(PrismaService);
  });

  describe('mergeCartsOnLogin', () => {
    it('should return null if no anonymous cart exists', async () => {
      prisma.cart.findFirst
        .mockResolvedValueOnce(mockCustomerCart) // customer cart
        .mockResolvedValueOnce(null); // no anonymous cart

      const result = await service.mergeCartsOnLogin(
        mockCustomerId,
        mockSessionToken,
        mockCompanyId,
      );

      expect(result).toBeNull();
    });

    it('should assign anonymous cart to customer if no customer cart exists', async () => {
      prisma.cart.findFirst
        .mockResolvedValueOnce(null) // no customer cart
        .mockResolvedValueOnce(mockAnonymousCart); // anonymous cart exists
      prisma.cart.update.mockResolvedValue({
        ...mockAnonymousCart,
        customerId: mockCustomerId,
      });

      const result = await service.mergeCartsOnLogin(
        mockCustomerId,
        mockSessionToken,
        mockCompanyId,
      );

      expect(result).toEqual({
        mergedCartId: 'cart-anonymous',
        itemsMerged: 2,
        itemsFromAnonymous: 2,
        itemsFromCustomer: 0,
        savedItemsMerged: 1,
        discountsPreserved: [],
      });
      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-anonymous' },
        data: { customerId: mockCustomerId },
      });
    });

    it('should merge anonymous cart into customer cart', async () => {
      prisma.cart.findFirst
        .mockResolvedValueOnce(mockCustomerCart) // customer cart
        .mockResolvedValueOnce(mockAnonymousCart); // anonymous cart
      prisma.cartItem.updateMany.mockResolvedValue({ count: 2 });
      prisma.savedCartItem.updateMany.mockResolvedValue({ count: 1 });
      prisma.cart.update.mockResolvedValue({});
      prisma.cartItem.findMany.mockResolvedValue([
        { lineTotal: 50, quantity: 2 },
        { lineTotal: 30, quantity: 1 },
        { lineTotal: 120, quantity: 3 },
      ]);

      const result = await service.mergeCartsOnLogin(
        mockCustomerId,
        mockSessionToken,
        mockCompanyId,
      );

      expect(result).toEqual({
        mergedCartId: 'cart-customer',
        itemsMerged: 3, // 2 items + 1 saved item
        itemsFromAnonymous: 2,
        itemsFromCustomer: 1,
        savedItemsMerged: 1,
        discountsPreserved: ['SAVE10'],
      });
    });

    it('should not merge duplicate products', async () => {
      const anonymousWithDuplicate = {
        ...mockAnonymousCart,
        items: [
          { id: 'item-dup', productId: 'prod-1', variantId: null, quantity: 1 }, // Same as customer cart
        ],
        savedItems: [],
      };

      prisma.cart.findFirst
        .mockResolvedValueOnce(mockCustomerCart)
        .mockResolvedValueOnce(anonymousWithDuplicate);
      prisma.cart.update.mockResolvedValue({});
      prisma.cartItem.findMany.mockResolvedValue([{ lineTotal: 50, quantity: 2 }]);

      const result = await service.mergeCartsOnLogin(
        mockCustomerId,
        mockSessionToken,
        mockCompanyId,
      );

      // No items should be merged since it's a duplicate
      expect(result?.itemsMerged).toBe(0);
    });

    it('should mark source cart as merged', async () => {
      prisma.cart.findFirst
        .mockResolvedValueOnce(mockCustomerCart)
        .mockResolvedValueOnce(mockAnonymousCart);
      prisma.cartItem.updateMany.mockResolvedValue({ count: 2 });
      prisma.savedCartItem.updateMany.mockResolvedValue({ count: 1 });
      prisma.cart.update.mockResolvedValue({});
      prisma.cartItem.findMany.mockResolvedValue([]);

      await service.mergeCartsOnLogin(mockCustomerId, mockSessionToken, mockCompanyId);

      expect(prisma.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cart-anonymous' },
          data: expect.objectContaining({
            status: CartStatus.MERGED,
            mergedIntoCartId: 'cart-customer',
          }),
        }),
      );
    });
  });

  describe('syncCartForCustomer', () => {
    it('should return null if no active cart exists', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);

      const result = await service.syncCartForCustomer(mockCustomerId, mockCompanyId);

      expect(result).toBeNull();
    });

    it('should return sync result with cart info', async () => {
      prisma.cart.findFirst.mockResolvedValue({
        ...mockCustomerCart,
        items: [
          { quantity: 2 },
          { quantity: 3 },
        ],
      });

      const result = await service.syncCartForCustomer(mockCustomerId, mockCompanyId);

      expect(result).toEqual({
        success: true,
        cartId: 'cart-customer',
        sessionToken: 'session-customer',
        itemCount: 5, // 2 + 3
        lastSyncedAt: expect.any(Date),
      });
    });

    it('should update activity when device session token differs', async () => {
      prisma.cart.findFirst.mockResolvedValue(mockCustomerCart);
      prisma.cart.update.mockResolvedValue({});

      await service.syncCartForCustomer(
        mockCustomerId,
        mockCompanyId,
        'different-session',
      );

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-customer' },
        data: { lastActivityAt: expect.any(Date) },
      });
    });

    it('should not update if session token matches', async () => {
      prisma.cart.findFirst.mockResolvedValue(mockCustomerCart);

      await service.syncCartForCustomer(
        mockCustomerId,
        mockCompanyId,
        'session-customer', // Same as cart's session
      );

      expect(prisma.cart.update).not.toHaveBeenCalled();
    });
  });

  describe('getCartHistory', () => {
    it('should return empty array when no history', async () => {
      prisma.cart.findMany.mockResolvedValue([]);

      const result = await service.getCartHistory(mockCustomerId, mockCompanyId);

      expect(result).toEqual([]);
    });

    it('should return formatted cart history', async () => {
      prisma.cart.findMany.mockResolvedValue([mockHistoricalCart]);

      const result = await service.getCartHistory(mockCustomerId, mockCompanyId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'cart-historical',
        status: CartStatus.CONVERTED,
        itemCount: 1,
        subtotal: 200,
        currency: 'USD',
        convertedAt: expect.any(Date),
        abandonedAt: null,
        items: [
          {
            productId: 'prod-5',
            productName: 'Product 5',
            productImage: 'img1.jpg',
            quantity: 2,
            price: 50,
          },
        ],
      });
    });

    it('should limit results to specified amount', async () => {
      prisma.cart.findMany.mockResolvedValue([]);

      await service.getCartHistory(mockCustomerId, mockCompanyId, 10);

      expect(prisma.cart.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        }),
      );
    });

    it('should only include converted and abandoned carts', async () => {
      prisma.cart.findMany.mockResolvedValue([]);

      await service.getCartHistory(mockCustomerId, mockCompanyId);

      expect(prisma.cart.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [CartStatus.CONVERTED, CartStatus.ABANDONED] },
          }),
        }),
      );
    });

    it('should limit items preview to 3', async () => {
      const cartWithManyItems = {
        ...mockHistoricalCart,
        items: [
          { product: { name: 'P1', images: [] }, productId: '1', quantity: 1, unitPrice: 10 },
          { product: { name: 'P2', images: [] }, productId: '2', quantity: 1, unitPrice: 20 },
          { product: { name: 'P3', images: [] }, productId: '3', quantity: 1, unitPrice: 30 },
          { product: { name: 'P4', images: [] }, productId: '4', quantity: 1, unitPrice: 40 },
          { product: { name: 'P5', images: [] }, productId: '5', quantity: 1, unitPrice: 50 },
        ],
      };
      prisma.cart.findMany.mockResolvedValue([cartWithManyItems]);

      const result = await service.getCartHistory(mockCustomerId, mockCompanyId);

      expect(result[0].items).toHaveLength(3);
    });
  });

  describe('restoreFromHistory', () => {
    it('should return 0 if historical cart not found', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);

      const result = await service.restoreFromHistory(
        'nonexistent',
        mockCustomerId,
        mockCompanyId,
      );

      expect(result).toBe(0);
    });

    it('should create new cart if no active cart exists', async () => {
      prisma.cart.findFirst
        .mockResolvedValueOnce(mockHistoricalCart) // historical cart
        .mockResolvedValueOnce(null); // no active cart
      prisma.cart.create.mockResolvedValue({
        id: 'new-cart',
        companyId: mockCompanyId,
        customerId: mockCustomerId,
      });
      prisma.cartItem.findMany.mockResolvedValue([]);
      prisma.cartItem.create.mockResolvedValue({});
      prisma.cart.update.mockResolvedValue({});

      const result = await service.restoreFromHistory(
        'cart-historical',
        mockCustomerId,
        mockCompanyId,
      );

      expect(result).toBe(1);
      expect(prisma.cart.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCompanyId,
          customerId: mockCustomerId,
          status: CartStatus.ACTIVE,
          currency: 'USD',
        }),
      });
    });

    it('should restore items to existing active cart', async () => {
      prisma.cart.findFirst
        .mockResolvedValueOnce(mockHistoricalCart)
        .mockResolvedValueOnce(mockCustomerCart);
      prisma.cartItem.findMany.mockResolvedValue(mockCustomerCart.items);
      prisma.cartItem.create.mockResolvedValue({});
      prisma.cart.update.mockResolvedValue({});

      const result = await service.restoreFromHistory(
        'cart-historical',
        mockCustomerId,
        mockCompanyId,
      );

      expect(result).toBe(1);
      expect(prisma.cartItem.create).toHaveBeenCalled();
    });

    it('should not restore duplicate products', async () => {
      const historicalWithDuplicate = {
        ...mockHistoricalCart,
        items: [
          { id: 'dup', productId: 'prod-1', variantId: null, quantity: 1 }, // Same as customer cart
        ],
      };
      prisma.cart.findFirst
        .mockResolvedValueOnce(historicalWithDuplicate)
        .mockResolvedValueOnce(mockCustomerCart);
      prisma.cartItem.findMany.mockResolvedValue(mockCustomerCart.items);

      const result = await service.restoreFromHistory(
        'cart-historical',
        mockCustomerId,
        mockCompanyId,
      );

      expect(result).toBe(0);
      expect(prisma.cartItem.create).not.toHaveBeenCalled();
    });

    it('should restore only specified item IDs', async () => {
      const cartWithMultipleItems = {
        ...mockHistoricalCart,
        items: [
          { id: 'item-a', productId: 'prod-a', variantId: null, quantity: 1 },
          { id: 'item-b', productId: 'prod-b', variantId: null, quantity: 2 },
        ],
      };
      prisma.cart.findFirst
        .mockResolvedValueOnce(cartWithMultipleItems)
        .mockResolvedValueOnce(mockCustomerCart);
      prisma.cartItem.findMany.mockResolvedValue([]);
      prisma.cartItem.create.mockResolvedValue({});
      prisma.cart.update.mockResolvedValue({});

      const result = await service.restoreFromHistory(
        'cart-historical',
        mockCustomerId,
        mockCompanyId,
        ['item-a'], // Only restore item-a
      );

      expect(result).toBe(1);
      expect(prisma.cartItem.create).toHaveBeenCalledTimes(1);
    });

    it('should recalculate cart totals after restore', async () => {
      prisma.cart.findFirst
        .mockResolvedValueOnce(mockHistoricalCart)
        .mockResolvedValueOnce(mockCustomerCart);
      prisma.cartItem.findMany
        .mockResolvedValueOnce([]) // existing items check
        .mockResolvedValueOnce([{ lineTotal: 100, quantity: 2 }]); // recalculate
      prisma.cartItem.create.mockResolvedValue({});
      prisma.cart.update.mockResolvedValue({});

      await service.restoreFromHistory(
        'cart-historical',
        mockCustomerId,
        mockCompanyId,
      );

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-customer' },
        data: expect.objectContaining({
          subtotal: 100,
          itemCount: 2,
          grandTotal: 100,
        }),
      });
    });
  });

  describe('variant handling', () => {
    it('should treat same product with different variants as different items', async () => {
      const cartWithVariants = {
        ...mockCustomerCart,
        items: [
          { id: 'item-v1', productId: 'prod-1', variantId: 'var-a', quantity: 1 },
        ],
      };
      const anonymousWithSameProduct = {
        ...mockAnonymousCart,
        items: [
          { id: 'item-v2', productId: 'prod-1', variantId: 'var-b', quantity: 1 }, // Same product, different variant
        ],
        savedItems: [],
      };

      prisma.cart.findFirst
        .mockResolvedValueOnce(cartWithVariants)
        .mockResolvedValueOnce(anonymousWithSameProduct);
      prisma.cartItem.updateMany.mockResolvedValue({ count: 1 });
      prisma.cart.update.mockResolvedValue({});
      prisma.cartItem.findMany.mockResolvedValue([]);

      const result = await service.mergeCartsOnLogin(
        mockCustomerId,
        mockSessionToken,
        mockCompanyId,
      );

      // Should merge because variants are different
      expect(result?.itemsMerged).toBe(1);
    });

    it('should not merge same product with same variant', async () => {
      const cartWithVariant = {
        ...mockCustomerCart,
        items: [
          { id: 'item-v1', productId: 'prod-1', variantId: 'var-a', quantity: 1 },
        ],
      };
      const anonymousWithSameVariant = {
        ...mockAnonymousCart,
        items: [
          { id: 'item-v2', productId: 'prod-1', variantId: 'var-a', quantity: 2 }, // Same product AND variant
        ],
        savedItems: [],
      };

      prisma.cart.findFirst
        .mockResolvedValueOnce(cartWithVariant)
        .mockResolvedValueOnce(anonymousWithSameVariant);
      prisma.cart.update.mockResolvedValue({});
      prisma.cartItem.findMany.mockResolvedValue([]);

      const result = await service.mergeCartsOnLogin(
        mockCustomerId,
        mockSessionToken,
        mockCompanyId,
      );

      // Should not merge because it's the same product+variant
      expect(result?.itemsMerged).toBe(0);
    });
  });
});
