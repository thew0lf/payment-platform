/**
 * Cart Controller Tests
 * Testing API endpoints for cart management (authenticated and public)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CartController, PublicCartController } from './cart.controller';
import { CartService } from '../services/cart.service';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ScopeType, CartStatus } from '@prisma/client';
import { CartData, CartTotals } from '../types/cart.types';

describe('CartController', () => {
  let controller: CartController;
  let cartService: jest.Mocked<CartService>;

  const mockCompanyId = 'company-123';
  const mockClientId = 'client-456';
  const mockCartId = 'cart-789';
  const mockProductId = 'product-001';
  const mockItemId = 'item-001';
  const mockSavedItemId = 'saved-item-001';

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    sub: 'user-1',
    email: 'user@company.com',
    scopeType: 'COMPANY' as ScopeType,
    scopeId: mockCompanyId,
    companyId: mockCompanyId,
    clientId: mockClientId,
    organizationId: 'org-1',
    role: 'ADMIN',
  };

  const mockTotals: CartTotals = {
    subtotal: 100,
    discountTotal: 0,
    taxTotal: 10,
    shippingTotal: 5,
    grandTotal: 115,
    itemCount: 2,
  };

  const mockCartData: CartData = {
    id: mockCartId,
    companyId: mockCompanyId,
    customerId: mockUser.id,
    sessionToken: 'session-token-123',
    status: CartStatus.ACTIVE,
    currency: 'USD',
    totals: mockTotals,
    discountCodes: [],
    items: [
      {
        id: mockItemId,
        productId: mockProductId,
        productSnapshot: {
          name: 'Test Product',
          sku: 'SKU-001',
          originalPrice: 50,
        },
        quantity: 2,
        unitPrice: 50,
        originalPrice: 50,
        discountAmount: 0,
        lineTotal: 100,
        isGift: false,
        addedAt: new Date(),
      },
    ],
    savedItems: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivityAt: new Date(),
  };

  const mockEmptyCart: CartData = {
    ...mockCartData,
    items: [],
    totals: { ...mockTotals, subtotal: 0, grandTotal: 0, itemCount: 0 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: {
            getCartByCustomerId: jest.fn(),
            getCartBySessionToken: jest.fn(),
            getOrCreateCart: jest.fn(),
            getCartById: jest.fn(),
            addItem: jest.fn(),
            updateItem: jest.fn(),
            removeItem: jest.fn(),
            saveForLater: jest.fn(),
            moveToCart: jest.fn(),
            applyDiscount: jest.fn(),
            removeDiscount: jest.fn(),
            clearCart: jest.fn(),
            mergeCarts: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
    cartService = module.get(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should return existing cart for user', async () => {
      cartService.getCartByCustomerId.mockResolvedValue(mockCartData);

      const result = await controller.getCart(mockUser, {});

      expect(result).toEqual(mockCartData);
      expect(cartService.getCartByCustomerId).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.companyId,
      );
    });

    it('should create new cart if none exists', async () => {
      cartService.getCartByCustomerId.mockResolvedValue(null);
      cartService.getOrCreateCart.mockResolvedValue(mockEmptyCart);

      const result = await controller.getCart(mockUser, { siteId: 'site-1' });

      expect(result).toEqual(mockEmptyCart);
      expect(cartService.getOrCreateCart).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
        siteId: 'site-1',
      });
    });

    it('should handle query with sessionToken', async () => {
      cartService.getCartByCustomerId.mockResolvedValue(mockCartData);

      await controller.getCart(mockUser, { sessionToken: 'token-123' });

      expect(cartService.getCartByCustomerId).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.companyId,
      );
    });
  });

  describe('addItem', () => {
    const addDto = {
      productId: mockProductId,
      quantity: 1,
      variantId: 'variant-1',
      customFields: { color: 'red' },
      giftMessage: 'Happy Birthday!',
      isGift: true,
    };

    it('should add item to existing cart', async () => {
      cartService.getOrCreateCart.mockResolvedValue(mockCartData);
      cartService.addItem.mockResolvedValue(mockCartData);

      const result = await controller.addItem(mockUser, addDto);

      expect(result).toEqual(mockCartData);
      expect(cartService.getOrCreateCart).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
        siteId: undefined,
      });
      expect(cartService.addItem).toHaveBeenCalledWith(mockCartId, addDto, mockUser.id);
    });

    it('should add item with siteId query parameter', async () => {
      cartService.getOrCreateCart.mockResolvedValue(mockCartData);
      cartService.addItem.mockResolvedValue(mockCartData);

      await controller.addItem(mockUser, addDto, 'site-123');

      expect(cartService.getOrCreateCart).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
        siteId: 'site-123',
      });
    });

    it('should add item with minimal data', async () => {
      const minimalDto = { productId: mockProductId, quantity: 1 };
      cartService.getOrCreateCart.mockResolvedValue(mockCartData);
      cartService.addItem.mockResolvedValue(mockCartData);

      const result = await controller.addItem(mockUser, minimalDto);

      expect(result).toEqual(mockCartData);
      expect(cartService.addItem).toHaveBeenCalledWith(mockCartId, minimalDto, mockUser.id);
    });
  });

  describe('updateItem', () => {
    const updateDto = {
      quantity: 3,
      customFields: { size: 'large' },
      giftMessage: 'Updated message',
      isGift: false,
    };

    it('should update cart item', async () => {
      cartService.getCartByCustomerId.mockResolvedValue(mockCartData);
      cartService.updateItem.mockResolvedValue(mockCartData);

      const result = await controller.updateItem(mockUser, mockItemId, updateDto);

      expect(result).toEqual(mockCartData);
      expect(cartService.updateItem).toHaveBeenCalledWith(
        mockCartId,
        mockItemId,
        updateDto,
        mockUser.id,
      );
    });

    it('should throw error when cart not found', async () => {
      cartService.getCartByCustomerId.mockResolvedValue(null);

      await expect(controller.updateItem(mockUser, mockItemId, updateDto)).rejects.toThrow(
        'Cart not found',
      );
    });

    it('should update item quantity only', async () => {
      const quantityOnlyDto = { quantity: 5 };
      cartService.getCartByCustomerId.mockResolvedValue(mockCartData);
      cartService.updateItem.mockResolvedValue(mockCartData);

      await controller.updateItem(mockUser, mockItemId, quantityOnlyDto);

      expect(cartService.updateItem).toHaveBeenCalledWith(
        mockCartId,
        mockItemId,
        quantityOnlyDto,
        mockUser.id,
      );
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      cartService.getCartByCustomerId.mockResolvedValue(mockCartData);
      cartService.removeItem.mockResolvedValue(mockEmptyCart);

      const result = await controller.removeItem(mockUser, mockItemId);

      expect(result).toEqual(mockEmptyCart);
      expect(cartService.removeItem).toHaveBeenCalledWith(mockCartId, mockItemId, mockUser.id);
    });

    it('should throw error when cart not found', async () => {
      cartService.getCartByCustomerId.mockResolvedValue(null);

      await expect(controller.removeItem(mockUser, mockItemId)).rejects.toThrow('Cart not found');
    });
  });

  describe('saveForLater', () => {
    it('should save item for later', async () => {
      const cartWithSaved = {
        ...mockCartData,
        items: [],
        savedItems: [
          {
            id: mockSavedItemId,
            productId: mockProductId,
            quantity: 2,
            priceAtSave: 50,
            savedAt: new Date(),
          },
        ],
      };
      cartService.getCartByCustomerId.mockResolvedValue(mockCartData);
      cartService.saveForLater.mockResolvedValue(cartWithSaved);

      const result = await controller.saveForLater(mockUser, mockItemId);

      expect(result).toEqual(cartWithSaved);
      expect(cartService.saveForLater).toHaveBeenCalledWith(mockCartId, mockItemId, mockUser.id);
    });

    it('should throw error when cart not found', async () => {
      cartService.getCartByCustomerId.mockResolvedValue(null);

      await expect(controller.saveForLater(mockUser, mockItemId)).rejects.toThrow('Cart not found');
    });
  });

  describe('moveToCart', () => {
    const moveDto = { savedItemId: mockSavedItemId, quantity: 1 };

    it('should move saved item back to cart', async () => {
      cartService.getCartByCustomerId.mockResolvedValue(mockCartData);
      cartService.moveToCart.mockResolvedValue(mockCartData);

      const result = await controller.moveToCart(mockUser, mockSavedItemId, moveDto);

      expect(result).toEqual(mockCartData);
      expect(cartService.moveToCart).toHaveBeenCalledWith(
        mockCartId,
        mockSavedItemId,
        moveDto.quantity,
        mockUser.id,
      );
    });

    it('should move saved item with default quantity', async () => {
      const moveNoQuantity = { savedItemId: mockSavedItemId };
      cartService.getCartByCustomerId.mockResolvedValue(mockCartData);
      cartService.moveToCart.mockResolvedValue(mockCartData);

      await controller.moveToCart(mockUser, mockSavedItemId, moveNoQuantity);

      expect(cartService.moveToCart).toHaveBeenCalledWith(
        mockCartId,
        mockSavedItemId,
        undefined,
        mockUser.id,
      );
    });

    it('should throw error when cart not found', async () => {
      cartService.getCartByCustomerId.mockResolvedValue(null);

      await expect(controller.moveToCart(mockUser, mockSavedItemId, moveDto)).rejects.toThrow(
        'Cart not found',
      );
    });
  });

  describe('applyDiscount', () => {
    const discountDto = { code: 'SAVE10' };

    it('should apply discount code', async () => {
      const cartWithDiscount = {
        ...mockCartData,
        discountCodes: [{ code: 'SAVE10', discountAmount: 10, type: 'fixed' as const }],
        totals: { ...mockTotals, discountTotal: 10, grandTotal: 105 },
      };
      cartService.getCartByCustomerId.mockResolvedValue(mockCartData);
      cartService.applyDiscount.mockResolvedValue(cartWithDiscount);

      const result = await controller.applyDiscount(mockUser, discountDto);

      expect(result.discountCodes).toHaveLength(1);
      expect(result.discountCodes[0].code).toBe('SAVE10');
      expect(cartService.applyDiscount).toHaveBeenCalledWith(
        mockCartId,
        discountDto.code,
        mockUser.id,
      );
    });

    it('should throw error when cart not found', async () => {
      cartService.getCartByCustomerId.mockResolvedValue(null);

      await expect(controller.applyDiscount(mockUser, discountDto)).rejects.toThrow(
        'Cart not found',
      );
    });
  });

  describe('removeDiscount', () => {
    it('should remove discount code', async () => {
      cartService.getCartByCustomerId.mockResolvedValue(mockCartData);
      cartService.removeDiscount.mockResolvedValue(mockCartData);

      const result = await controller.removeDiscount(mockUser, 'SAVE10');

      expect(result).toEqual(mockCartData);
      expect(cartService.removeDiscount).toHaveBeenCalledWith(mockCartId, 'SAVE10', mockUser.id);
    });

    it('should throw error when cart not found', async () => {
      cartService.getCartByCustomerId.mockResolvedValue(null);

      await expect(controller.removeDiscount(mockUser, 'SAVE10')).rejects.toThrow('Cart not found');
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', async () => {
      cartService.getCartByCustomerId.mockResolvedValue(mockCartData);
      cartService.clearCart.mockResolvedValue(mockEmptyCart);

      const result = await controller.clearCart(mockUser);

      expect(result).toEqual(mockEmptyCart);
      expect(result.items).toHaveLength(0);
      expect(cartService.clearCart).toHaveBeenCalledWith(mockCartId, mockUser.id);
    });

    it('should throw error when cart not found', async () => {
      cartService.getCartByCustomerId.mockResolvedValue(null);

      await expect(controller.clearCart(mockUser)).rejects.toThrow('Cart not found');
    });
  });

  describe('mergeCarts', () => {
    const mergeDto = { sourceCartId: 'guest-cart-123' };

    it('should merge guest cart into user cart', async () => {
      const mergedCart = {
        ...mockCartData,
        items: [
          ...mockCartData.items,
          {
            id: 'item-002',
            productId: 'product-002',
            productSnapshot: { name: 'Another Product', sku: 'SKU-002', originalPrice: 25 },
            quantity: 1,
            unitPrice: 25,
            originalPrice: 25,
            discountAmount: 0,
            lineTotal: 25,
            isGift: false,
            addedAt: new Date(),
          },
        ],
        totals: { ...mockTotals, subtotal: 125, grandTotal: 140, itemCount: 3 },
      };
      cartService.getOrCreateCart.mockResolvedValue(mockCartData);
      cartService.mergeCarts.mockResolvedValue(mergedCart);

      const result = await controller.mergeCarts(mockUser, mergeDto);

      expect(result.items).toHaveLength(2);
      expect(cartService.mergeCarts).toHaveBeenCalledWith(
        mergeDto.sourceCartId,
        mockCartId,
        mockUser.id,
      );
    });
  });
});

describe('PublicCartController', () => {
  let controller: PublicCartController;
  let cartService: jest.Mocked<CartService>;

  const mockCompanyId = 'company-123';
  const mockCartId = 'cart-789';
  const mockProductId = 'product-001';
  const mockItemId = 'item-001';
  const mockSessionToken = 'session-token-abc123';

  const mockTotals: CartTotals = {
    subtotal: 100,
    discountTotal: 0,
    taxTotal: 10,
    shippingTotal: 5,
    grandTotal: 115,
    itemCount: 2,
  };

  const mockCartData: CartData = {
    id: mockCartId,
    companyId: mockCompanyId,
    sessionToken: mockSessionToken,
    status: CartStatus.ACTIVE,
    currency: 'USD',
    totals: mockTotals,
    discountCodes: [],
    items: [
      {
        id: mockItemId,
        productId: mockProductId,
        productSnapshot: {
          name: 'Test Product',
          sku: 'SKU-001',
          originalPrice: 50,
        },
        quantity: 2,
        unitPrice: 50,
        originalPrice: 50,
        discountAmount: 0,
        lineTotal: 100,
        isGift: false,
        addedAt: new Date(),
      },
    ],
    savedItems: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivityAt: new Date(),
  };

  const emptyCartResponse = {
    items: [],
    totals: { subtotal: 0, grandTotal: 0, itemCount: 0 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicCartController],
      providers: [
        {
          provide: CartService,
          useValue: {
            getCartBySessionToken: jest.fn(),
            getOrCreateCart: jest.fn(),
            getCartById: jest.fn(),
            addItem: jest.fn(),
            updateItem: jest.fn(),
            removeItem: jest.fn(),
            applyDiscount: jest.fn(),
            removeDiscount: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PublicCartController>(PublicCartController);
    cartService = module.get(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should return cart by session token', async () => {
      cartService.getCartBySessionToken.mockResolvedValue(mockCartData);

      const result = await controller.getCart(mockSessionToken, mockCompanyId);

      expect(result).toEqual(mockCartData);
      expect(cartService.getCartBySessionToken).toHaveBeenCalledWith(
        mockSessionToken,
        mockCompanyId,
      );
    });

    it('should return empty cart response when no session token', async () => {
      const result = await controller.getCart('', mockCompanyId);

      expect(result).toEqual(emptyCartResponse);
      expect(cartService.getCartBySessionToken).not.toHaveBeenCalled();
    });

    it('should return empty cart response when no company ID', async () => {
      const result = await controller.getCart(mockSessionToken, '');

      expect(result).toEqual(emptyCartResponse);
      expect(cartService.getCartBySessionToken).not.toHaveBeenCalled();
    });

    it('should return empty cart response when both headers missing', async () => {
      const result = await controller.getCart('', '');

      expect(result).toEqual(emptyCartResponse);
      expect(cartService.getCartBySessionToken).not.toHaveBeenCalled();
    });

    it('should return empty cart response when cart not found', async () => {
      cartService.getCartBySessionToken.mockResolvedValue(null);

      const result = await controller.getCart(mockSessionToken, mockCompanyId);

      expect(result).toEqual(emptyCartResponse);
    });

    it('should return empty cart response when session token is undefined', async () => {
      const result = await controller.getCart(undefined as unknown as string, mockCompanyId);

      expect(result).toEqual(emptyCartResponse);
      expect(cartService.getCartBySessionToken).not.toHaveBeenCalled();
    });

    it('should return empty cart response when company ID is undefined', async () => {
      const result = await controller.getCart(mockSessionToken, undefined as unknown as string);

      expect(result).toEqual(emptyCartResponse);
      expect(cartService.getCartBySessionToken).not.toHaveBeenCalled();
    });
  });

  describe('createCart', () => {
    it('should create new anonymous cart', async () => {
      cartService.getOrCreateCart.mockResolvedValue(mockCartData);

      const createDto = {
        siteId: 'site-123',
        visitorId: 'visitor-456',
        currency: 'EUR',
      };

      const result = await controller.createCart(mockCompanyId, createDto);

      expect(result).toEqual(mockCartData);
      expect(cartService.getOrCreateCart).toHaveBeenCalledWith(mockCompanyId, {
        siteId: 'site-123',
        visitorId: 'visitor-456',
        currency: 'EUR',
        utmSource: undefined,
        utmMedium: undefined,
        utmCampaign: undefined,
      });
    });

    it('should create cart with UTM parameters', async () => {
      cartService.getOrCreateCart.mockResolvedValue(mockCartData);

      const createDto = {
        siteId: 'site-123',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'summer_sale',
      };

      await controller.createCart(mockCompanyId, createDto);

      expect(cartService.getOrCreateCart).toHaveBeenCalledWith(mockCompanyId, {
        siteId: 'site-123',
        visitorId: undefined,
        currency: undefined,
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'summer_sale',
      });
    });

    it('should create cart with minimal data', async () => {
      cartService.getOrCreateCart.mockResolvedValue(mockCartData);

      const createDto = {};

      await controller.createCart(mockCompanyId, createDto);

      expect(cartService.getOrCreateCart).toHaveBeenCalledWith(mockCompanyId, {
        siteId: undefined,
        visitorId: undefined,
        currency: undefined,
        utmSource: undefined,
        utmMedium: undefined,
        utmCampaign: undefined,
      });
    });
  });

  describe('addItem', () => {
    const addDto = {
      productId: mockProductId,
      quantity: 2,
      variantId: 'variant-1',
    };

    it('should add item to cart with valid session token', async () => {
      cartService.getCartById.mockResolvedValue(mockCartData);
      cartService.addItem.mockResolvedValue(mockCartData);

      const result = await controller.addItem(mockCartId, mockSessionToken, mockCompanyId, addDto);

      expect(result).toEqual(mockCartData);
      expect(cartService.addItem).toHaveBeenCalledWith(mockCartId, addDto);
    });

    it('should add item with all optional fields', async () => {
      const fullDto = {
        productId: mockProductId,
        quantity: 1,
        variantId: 'variant-1',
        customFields: { engraving: 'John' },
        giftMessage: 'Happy Birthday!',
        isGift: true,
      };
      cartService.getCartById.mockResolvedValue(mockCartData);
      cartService.addItem.mockResolvedValue(mockCartData);

      await controller.addItem(mockCartId, mockSessionToken, mockCompanyId, fullDto);

      expect(cartService.addItem).toHaveBeenCalledWith(mockCartId, fullDto);
    });

    it('should add item with minimal data', async () => {
      const minimalDto = { productId: mockProductId, quantity: 1 };
      cartService.getCartById.mockResolvedValue(mockCartData);
      cartService.addItem.mockResolvedValue(mockCartData);

      await controller.addItem(mockCartId, mockSessionToken, mockCompanyId, minimalDto);

      expect(cartService.addItem).toHaveBeenCalledWith(mockCartId, minimalDto);
    });

    it('should throw ForbiddenException when session token is missing', async () => {
      await expect(
        controller.addItem(mockCartId, '', mockCompanyId, addDto),
      ).rejects.toThrow('Session token required for cart operations');
    });

    it('should throw ForbiddenException when session token does not match', async () => {
      cartService.getCartById.mockResolvedValue(mockCartData);

      await expect(
        controller.addItem(mockCartId, 'wrong-token', mockCompanyId, addDto),
      ).rejects.toThrow('Session token mismatch - access denied');
    });
  });

  describe('updateItem', () => {
    const updateDto = { quantity: 5 };

    it('should update cart item with valid session token', async () => {
      cartService.getCartById.mockResolvedValue(mockCartData);
      cartService.updateItem.mockResolvedValue(mockCartData);

      const result = await controller.updateItem(mockCartId, mockItemId, mockSessionToken, mockCompanyId, updateDto);

      expect(result).toEqual(mockCartData);
      expect(cartService.updateItem).toHaveBeenCalledWith(mockCartId, mockItemId, updateDto);
    });

    it('should update item with all optional fields', async () => {
      const fullUpdateDto = {
        quantity: 3,
        customFields: { size: 'XL' },
        giftMessage: 'Updated message',
        isGift: false,
      };
      cartService.getCartById.mockResolvedValue(mockCartData);
      cartService.updateItem.mockResolvedValue(mockCartData);

      await controller.updateItem(mockCartId, mockItemId, mockSessionToken, mockCompanyId, fullUpdateDto);

      expect(cartService.updateItem).toHaveBeenCalledWith(mockCartId, mockItemId, fullUpdateDto);
    });

    it('should update item quantity to zero (remove)', async () => {
      const zeroQuantityDto = { quantity: 0 };
      const emptyCart = { ...mockCartData, items: [] };
      cartService.getCartById.mockResolvedValue(mockCartData);
      cartService.updateItem.mockResolvedValue(emptyCart);

      const result = await controller.updateItem(mockCartId, mockItemId, mockSessionToken, mockCompanyId, zeroQuantityDto);

      expect(result.items).toHaveLength(0);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart with valid session token', async () => {
      const cartAfterRemoval = { ...mockCartData, items: [] };
      cartService.getCartById.mockResolvedValue(mockCartData);
      cartService.removeItem.mockResolvedValue(cartAfterRemoval);

      const result = await controller.removeItem(mockCartId, mockItemId, mockSessionToken, mockCompanyId);

      expect(result.items).toHaveLength(0);
      expect(cartService.removeItem).toHaveBeenCalledWith(mockCartId, mockItemId);
    });
  });

  describe('applyDiscount', () => {
    const discountDto = { code: 'WELCOME20' };

    it('should apply discount code with valid session token', async () => {
      const cartWithDiscount = {
        ...mockCartData,
        discountCodes: [{ code: 'WELCOME20', discountAmount: 20, type: 'percentage' as const }],
      };
      cartService.getCartById.mockResolvedValue(mockCartData);
      cartService.applyDiscount.mockResolvedValue(cartWithDiscount);

      const result = await controller.applyDiscount(mockCartId, mockSessionToken, mockCompanyId, discountDto);

      expect(result.discountCodes).toHaveLength(1);
      expect(result.discountCodes[0].code).toBe('WELCOME20');
      expect(cartService.applyDiscount).toHaveBeenCalledWith(mockCartId, discountDto.code);
    });
  });

  describe('removeDiscount', () => {
    it('should remove discount code with valid session token', async () => {
      cartService.getCartById.mockResolvedValue(mockCartData);
      cartService.removeDiscount.mockResolvedValue(mockCartData);

      const result = await controller.removeDiscount(mockCartId, 'WELCOME20', mockSessionToken, mockCompanyId);

      expect(result).toEqual(mockCartData);
      expect(cartService.removeDiscount).toHaveBeenCalledWith(mockCartId, 'WELCOME20');
    });
  });

  describe('updateShipping', () => {
    it('should update shipping info for estimation with valid session token', async () => {
      cartService.getCartById.mockResolvedValue(mockCartData);

      const shippingDto = {
        postalCode: '12345',
        country: 'US',
      };

      const result = await controller.updateShipping(mockCartId, mockSessionToken, mockCompanyId, shippingDto);

      expect(result).toEqual(mockCartData);
      expect(cartService.getCartById).toHaveBeenCalledWith(mockCartId);
    });

    it('should handle partial shipping data', async () => {
      cartService.getCartById.mockResolvedValue(mockCartData);

      const partialDto = { postalCode: '90210' };

      const result = await controller.updateShipping(mockCartId, mockSessionToken, mockCompanyId, partialDto);

      expect(result).toEqual(mockCartData);
    });

    it('should handle empty shipping data', async () => {
      cartService.getCartById.mockResolvedValue(mockCartData);

      const result = await controller.updateShipping(mockCartId, mockSessionToken, mockCompanyId, {});

      expect(result).toEqual(mockCartData);
    });
  });

  describe('Security - Session Token Validation', () => {
    it('should throw ForbiddenException when session token missing for addItem', async () => {
      await expect(
        controller.addItem(mockCartId, '', mockCompanyId, { productId: mockProductId, quantity: 1 }),
      ).rejects.toThrow('Session token required for cart operations');
    });

    it('should throw ForbiddenException when company ID mismatch for addItem', async () => {
      cartService.getCartById.mockResolvedValue(mockCartData);

      await expect(
        controller.addItem(mockCartId, mockSessionToken, 'wrong-company', { productId: mockProductId, quantity: 1 }),
      ).rejects.toThrow('Access denied to this cart');
    });

    it('should throw ForbiddenException when session token mismatch for updateItem', async () => {
      cartService.getCartById.mockResolvedValue(mockCartData);

      await expect(
        controller.updateItem(mockCartId, mockItemId, 'wrong-token', mockCompanyId, { quantity: 1 }),
      ).rejects.toThrow('Session token mismatch - access denied');
    });

    it('should throw ForbiddenException when session token mismatch for removeItem', async () => {
      cartService.getCartById.mockResolvedValue(mockCartData);

      await expect(
        controller.removeItem(mockCartId, mockItemId, 'wrong-token', mockCompanyId),
      ).rejects.toThrow('Session token mismatch - access denied');
    });
  });
});

describe('CartController - Edge Cases', () => {
  let controller: CartController;
  let cartService: jest.Mocked<CartService>;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    sub: 'user-1',
    email: 'user@company.com',
    scopeType: 'COMPANY' as ScopeType,
    scopeId: 'company-123',
    companyId: 'company-123',
    clientId: 'client-456',
    organizationId: 'org-1',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: {
            getCartByCustomerId: jest.fn(),
            getOrCreateCart: jest.fn(),
            addItem: jest.fn(),
            updateItem: jest.fn(),
            removeItem: jest.fn(),
            saveForLater: jest.fn(),
            moveToCart: jest.fn(),
            applyDiscount: jest.fn(),
            removeDiscount: jest.fn(),
            clearCart: jest.fn(),
            mergeCarts: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
    cartService = module.get(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User with undefined companyId', () => {
    it('should handle user without companyId in getCart', async () => {
      const userNoCompany = { ...mockUser, companyId: undefined };
      cartService.getCartByCustomerId.mockResolvedValue(null);
      cartService.getOrCreateCart.mockResolvedValue({
        id: 'cart-1',
        companyId: userNoCompany.scopeId,
        status: 'ACTIVE',
        currency: 'USD',
        totals: { subtotal: 0, discountTotal: 0, taxTotal: 0, shippingTotal: 0, grandTotal: 0, itemCount: 0 },
        discountCodes: [],
        items: [],
        savedItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      } as CartData);

      const result = await controller.getCart(userNoCompany, {});

      expect(cartService.getCartByCustomerId).toHaveBeenCalledWith(
        userNoCompany.id,
        undefined,
      );
    });
  });

  describe('Large quantity handling', () => {
    it('should handle maximum quantity in addItem', async () => {
      const mockCart = {
        id: 'cart-1',
        companyId: 'company-123',
        status: 'ACTIVE',
        currency: 'USD',
        totals: { subtotal: 5000, discountTotal: 0, taxTotal: 500, shippingTotal: 50, grandTotal: 5550, itemCount: 100 },
        discountCodes: [],
        items: [],
        savedItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      } as CartData;

      cartService.getOrCreateCart.mockResolvedValue(mockCart);
      cartService.addItem.mockResolvedValue(mockCart);

      const addDto = { productId: 'prod-1', quantity: 100 }; // Max quantity per DTO validation

      await controller.addItem(mockUser, addDto);

      expect(cartService.addItem).toHaveBeenCalledWith('cart-1', addDto, mockUser.id);
    });
  });

  describe('Special characters in discount codes', () => {
    it('should handle discount code with special characters', async () => {
      const mockCart = {
        id: 'cart-1',
        companyId: 'company-123',
        status: 'ACTIVE',
        currency: 'USD',
        totals: { subtotal: 100, discountTotal: 0, taxTotal: 10, shippingTotal: 5, grandTotal: 115, itemCount: 1 },
        discountCodes: [],
        items: [],
        savedItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      } as CartData;

      cartService.getCartByCustomerId.mockResolvedValue(mockCart);
      cartService.applyDiscount.mockResolvedValue(mockCart);

      const discountDto = { code: 'SAVE-10%_OFF!' };

      await controller.applyDiscount(mockUser, discountDto);

      expect(cartService.applyDiscount).toHaveBeenCalledWith('cart-1', 'SAVE-10%_OFF!', mockUser.id);
    });
  });
});

describe('PublicCartController - Edge Cases', () => {
  let controller: PublicCartController;
  let cartService: jest.Mocked<CartService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicCartController],
      providers: [
        {
          provide: CartService,
          useValue: {
            getCartBySessionToken: jest.fn(),
            getOrCreateCart: jest.fn(),
            getCartById: jest.fn(),
            addItem: jest.fn(),
            updateItem: jest.fn(),
            removeItem: jest.fn(),
            applyDiscount: jest.fn(),
            removeDiscount: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PublicCartController>(PublicCartController);
    cartService = module.get(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Whitespace handling in headers', () => {
    it('should handle whitespace-only session token as empty', async () => {
      const result = await controller.getCart('   ', 'company-123');

      // Whitespace is truthy, so it will attempt to fetch
      expect(cartService.getCartBySessionToken).toHaveBeenCalledWith('   ', 'company-123');
    });
  });

  describe('Unicode in UTM parameters', () => {
    it('should handle unicode characters in UTM campaign', async () => {
      const mockCart = {
        id: 'cart-1',
        companyId: 'company-123',
        status: 'ACTIVE',
        currency: 'USD',
        totals: { subtotal: 0, discountTotal: 0, taxTotal: 0, shippingTotal: 0, grandTotal: 0, itemCount: 0 },
        discountCodes: [],
        items: [],
        savedItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      } as CartData;

      cartService.getOrCreateCart.mockResolvedValue(mockCart);

      const createDto = {
        utmCampaign: 'summer_sale_',
      };

      await controller.createCart('company-123', createDto);

      expect(cartService.getOrCreateCart).toHaveBeenCalledWith('company-123', expect.objectContaining({
        utmCampaign: 'summer_sale_',
      }));
    });
  });

  describe('Long strings handling', () => {
    it('should handle long gift message', async () => {
      const mockCart = {
        id: 'cart-1',
        companyId: 'company-123',
        sessionToken: 'session-token-123',
        status: 'ACTIVE',
        currency: 'USD',
        totals: { subtotal: 50, discountTotal: 0, taxTotal: 5, shippingTotal: 3, grandTotal: 58, itemCount: 1 },
        discountCodes: [],
        items: [],
        savedItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      } as CartData;

      cartService.getCartById.mockResolvedValue(mockCart);
      cartService.addItem.mockResolvedValue(mockCart);

      const longMessage = 'A'.repeat(1000);
      const addDto = {
        productId: 'prod-1',
        quantity: 1,
        giftMessage: longMessage,
        isGift: true,
      };

      await controller.addItem('cart-1', 'session-token-123', 'company-123', addDto);

      expect(cartService.addItem).toHaveBeenCalledWith('cart-1', expect.objectContaining({
        giftMessage: longMessage,
      }));
    });
  });

  describe('Multiple discount codes', () => {
    it('should handle applying multiple discount codes', async () => {
      const mockCart = {
        id: 'cart-1',
        companyId: 'company-123',
        sessionToken: 'session-token-123',
        status: 'ACTIVE',
        currency: 'USD',
        totals: { subtotal: 100, discountTotal: 25, taxTotal: 7.5, shippingTotal: 5, grandTotal: 87.5, itemCount: 2 },
        discountCodes: [
          { code: 'FIRST10', discountAmount: 10, type: 'fixed' as const },
          { code: 'EXTRA15', discountAmount: 15, type: 'fixed' as const },
        ],
        items: [],
        savedItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      } as CartData;

      cartService.getCartById.mockResolvedValue(mockCart);
      cartService.applyDiscount.mockResolvedValue(mockCart);

      const result = await controller.applyDiscount('cart-1', 'session-token-123', 'company-123', { code: 'EXTRA15' });

      expect(result.discountCodes).toHaveLength(2);
    });
  });

  describe('Empty custom fields', () => {
    it('should handle empty object for custom fields', async () => {
      const mockCart = {
        id: 'cart-1',
        companyId: 'company-123',
        sessionToken: 'session-token-123',
        status: 'ACTIVE',
        currency: 'USD',
        totals: { subtotal: 50, discountTotal: 0, taxTotal: 5, shippingTotal: 3, grandTotal: 58, itemCount: 1 },
        discountCodes: [],
        items: [],
        savedItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      } as CartData;

      cartService.getCartById.mockResolvedValue(mockCart);
      cartService.addItem.mockResolvedValue(mockCart);

      const addDto = {
        productId: 'prod-1',
        quantity: 1,
        customFields: {},
      };

      await controller.addItem('cart-1', 'session-token-123', 'company-123', addDto);

      expect(cartService.addItem).toHaveBeenCalledWith('cart-1', expect.objectContaining({
        customFields: {},
      }));
    });
  });
});

describe('CartController - Authorization Scenarios', () => {
  let controller: CartController;
  let cartService: jest.Mocked<CartService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: {
            getCartByCustomerId: jest.fn(),
            getOrCreateCart: jest.fn(),
            addItem: jest.fn(),
            updateItem: jest.fn(),
            removeItem: jest.fn(),
            saveForLater: jest.fn(),
            moveToCart: jest.fn(),
            applyDiscount: jest.fn(),
            removeDiscount: jest.fn(),
            clearCart: jest.fn(),
            mergeCarts: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
    cartService = module.get(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Different scope types', () => {
    it('should work with CLIENT scope type user', async () => {
      const clientUser: AuthenticatedUser = {
        id: 'user-client',
        sub: 'user-client',
        email: 'client@example.com',
        scopeType: 'CLIENT' as ScopeType,
        scopeId: 'client-123',
        clientId: 'client-123',
        companyId: 'company-abc',
        organizationId: 'org-1',
        role: 'ADMIN',
      };

      const mockCart = {
        id: 'cart-1',
        companyId: 'company-abc',
        customerId: 'user-client',
        status: 'ACTIVE',
        currency: 'USD',
        totals: { subtotal: 0, discountTotal: 0, taxTotal: 0, shippingTotal: 0, grandTotal: 0, itemCount: 0 },
        discountCodes: [],
        items: [],
        savedItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      } as CartData;

      cartService.getCartByCustomerId.mockResolvedValue(mockCart);

      const result = await controller.getCart(clientUser, {});

      expect(result).toEqual(mockCart);
      expect(cartService.getCartByCustomerId).toHaveBeenCalledWith('user-client', 'company-abc');
    });

    it('should work with ORGANIZATION scope type user', async () => {
      const orgUser: AuthenticatedUser = {
        id: 'user-org',
        sub: 'user-org',
        email: 'org@example.com',
        scopeType: 'ORGANIZATION' as ScopeType,
        scopeId: 'org-123',
        organizationId: 'org-123',
        role: 'SUPER_ADMIN',
      };

      const mockCart = {
        id: 'cart-1',
        companyId: 'org-123',
        customerId: 'user-org',
        status: 'ACTIVE',
        currency: 'USD',
        totals: { subtotal: 0, discountTotal: 0, taxTotal: 0, shippingTotal: 0, grandTotal: 0, itemCount: 0 },
        discountCodes: [],
        items: [],
        savedItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      } as CartData;

      cartService.getCartByCustomerId.mockResolvedValue(null);
      cartService.getOrCreateCart.mockResolvedValue(mockCart);

      const result = await controller.getCart(orgUser, {});

      expect(result).toEqual(mockCart);
      // Note: companyId is undefined for org users without companyId
      expect(cartService.getCartByCustomerId).toHaveBeenCalledWith('user-org', undefined);
    });
  });

  describe('User ID usage', () => {
    it('should use user.id as performedBy for audit logging', async () => {
      const mockUser: AuthenticatedUser = {
        id: 'user-audit-test',
        sub: 'user-audit-test',
        email: 'audit@example.com',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-123',
        companyId: 'company-123',
        role: 'ADMIN',
      };

      const mockCart = {
        id: 'cart-1',
        companyId: 'company-123',
        status: 'ACTIVE',
        currency: 'USD',
        totals: { subtotal: 50, discountTotal: 0, taxTotal: 5, shippingTotal: 3, grandTotal: 58, itemCount: 1 },
        discountCodes: [],
        items: [],
        savedItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      } as CartData;

      cartService.getCartByCustomerId.mockResolvedValue(mockCart);
      cartService.clearCart.mockResolvedValue(mockCart);

      await controller.clearCart(mockUser);

      // Verify user.id is passed as performedBy
      expect(cartService.clearCart).toHaveBeenCalledWith('cart-1', 'user-audit-test');
    });
  });
});
