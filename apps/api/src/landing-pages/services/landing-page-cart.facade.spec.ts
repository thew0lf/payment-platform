import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { LandingPageCartFacade } from './landing-page-cart.facade';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../../cart/services/cart.service';
import { LandingPagesService } from './landing-pages.service';
import { LandingPageSessionService, CreateSessionDto as SessionCreateDto } from './landing-page-session.service';
import { LandingPageStatus, LandingPageSessionStatus } from '@prisma/client';
import { CreateSessionDto } from '../types/landing-page-session.types';
import { CartData } from '../../cart/types/cart.types';

describe('LandingPageCartFacade', () => {
  let facade: LandingPageCartFacade;
  let prismaService: jest.Mocked<PrismaService>;
  let cartService: jest.Mocked<CartService>;
  let landingPagesService: jest.Mocked<LandingPagesService>;
  let sessionService: jest.Mocked<LandingPageSessionService>;

  // Test data
  const mockCompanyId = 'company-test-1';
  const mockLandingPageId = 'lp-test-1';
  const mockSessionId = 'session-test-1';
  const mockSessionToken = 'session-token-abc123';
  const mockCartId = 'cart-test-1';
  const mockOrderId = 'order-test-1';
  const mockProductId = 'product-test-1';
  const mockItemId = 'item-test-1';

  const mockLandingPage = {
    id: mockLandingPageId,
    companyId: mockCompanyId,
    name: 'Test Landing Page',
    slug: 'test-page',
    status: LandingPageStatus.PUBLISHED,
    deletedAt: null,
  };

  const mockSession = {
    id: mockSessionId,
    sessionToken: mockSessionToken,
    landingPageId: mockLandingPageId,
    companyId: mockCompanyId,
    status: LandingPageSessionStatus.ACTIVE,
    visitorId: 'visitor-123',
    ipAddressHash: 'hash-abc',
    userAgent: 'Mozilla/5.0',
    referrer: 'https://google.com',
    deviceType: 'desktop',
    browser: 'Chrome',
    os: 'macOS',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'summer-sale',
    utmTerm: 'coffee',
    utmContent: 'ad-1',
    cartId: null,
    orderId: null,
    convertedAt: null,
    abandonedAt: null,
    startedAt: new Date('2025-01-01'),
    lastActivityAt: new Date('2025-01-01'),
  };

  const mockSessionWithCart = {
    ...mockSession,
    cartId: mockCartId,
  };

  const mockCart: CartData = {
    id: mockCartId,
    companyId: mockCompanyId,
    sessionToken: mockSessionToken,
    visitorId: 'visitor-123',
    status: 'ACTIVE',
    currency: 'USD',
    totals: {
      subtotal: 50,
      discountTotal: 0,
      taxTotal: 0,
      shippingTotal: 0,
      grandTotal: 50,
      itemCount: 2,
    },
    discountCodes: [],
    items: [
      {
        id: mockItemId,
        productId: mockProductId,
        productSnapshot: {
          name: 'Test Product',
          sku: 'TEST-001',
          originalPrice: 25,
        },
        quantity: 2,
        unitPrice: 25,
        originalPrice: 25,
        discountAmount: 0,
        lineTotal: 50,
        isGift: false,
        addedAt: new Date(),
      },
    ],
    savedItems: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivityAt: new Date(),
  };

  const mockCartItem = {
    id: mockItemId,
    cartId: mockCartId,
    productId: mockProductId,
    variantId: null,
    quantity: 2,
  };

  beforeEach(async () => {
    const mockPrisma = {
      landingPage: {
        findFirst: jest.fn(),
      },
      cartItem: {
        findFirst: jest.fn(),
      },
    };

    const mockCartService = {
      getOrCreateCart: jest.fn(),
      getCartById: jest.fn(),
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      markConverted: jest.fn(),
      markAbandoned: jest.fn(),
    };

    const mockLandingPagesService = {
      findOne: jest.fn(),
    };

    const mockSessionService = {
      createSession: jest.fn(),
      getSessionByToken: jest.fn(),
      linkCart: jest.fn(),
      trackEvent: jest.fn(),
      convertSession: jest.fn(),
      abandonSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandingPageCartFacade,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CartService, useValue: mockCartService },
        { provide: LandingPagesService, useValue: mockLandingPagesService },
        { provide: LandingPageSessionService, useValue: mockSessionService },
      ],
    }).compile();

    facade = module.get<LandingPageCartFacade>(LandingPageCartFacade);
    prismaService = module.get(PrismaService);
    cartService = module.get(CartService);
    landingPagesService = module.get(LandingPagesService);
    sessionService = module.get(LandingPageSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // startSession Tests
  // ═══════════════════════════════════════════════════════════════

  describe('startSession', () => {
    const createSessionDto: CreateSessionDto = {
      visitorId: 'visitor-123',
      userAgent: 'Mozilla/5.0',
      referrer: 'https://google.com',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'summer-sale',
      utmTerm: 'coffee',
      utmContent: 'ad-1',
    };

    it('should create a session for a published landing page', async () => {
      (prismaService.landingPage.findFirst as jest.Mock).mockResolvedValue(mockLandingPage);
      (sessionService.createSession as jest.Mock).mockResolvedValue(mockSession);

      const result = await facade.startSession(mockLandingPageId, mockCompanyId, createSessionDto);

      expect(prismaService.landingPage.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockLandingPageId,
          companyId: mockCompanyId,
          deletedAt: null,
        },
      });
      expect(sessionService.createSession).toHaveBeenCalledWith(
        mockLandingPageId,
        mockCompanyId,
        expect.objectContaining({
          visitorId: createSessionDto.visitorId,
          userAgent: createSessionDto.userAgent,
          referrer: createSessionDto.referrer,
          utmSource: createSessionDto.utmSource,
          utmMedium: createSessionDto.utmMedium,
          utmCampaign: createSessionDto.utmCampaign,
          utmTerm: createSessionDto.utmTerm,
          utmContent: createSessionDto.utmContent,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: mockSessionId,
          sessionToken: mockSessionToken,
          landingPageId: mockLandingPageId,
          status: LandingPageSessionStatus.ACTIVE,
        }),
      );
    });

    it('should throw NotFoundException when landing page does not exist', async () => {
      (prismaService.landingPage.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        facade.startSession(mockLandingPageId, mockCompanyId, createSessionDto),
      ).rejects.toThrow(NotFoundException);

      expect(sessionService.createSession).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when landing page is not published (DRAFT)', async () => {
      const draftPage = { ...mockLandingPage, status: LandingPageStatus.DRAFT };
      (prismaService.landingPage.findFirst as jest.Mock).mockResolvedValue(draftPage);

      await expect(
        facade.startSession(mockLandingPageId, mockCompanyId, createSessionDto),
      ).rejects.toThrow(ForbiddenException);

      expect(sessionService.createSession).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when landing page is archived', async () => {
      const archivedPage = { ...mockLandingPage, status: LandingPageStatus.ARCHIVED };
      (prismaService.landingPage.findFirst as jest.Mock).mockResolvedValue(archivedPage);

      await expect(
        facade.startSession(mockLandingPageId, mockCompanyId, createSessionDto),
      ).rejects.toThrow(ForbiddenException);

      expect(sessionService.createSession).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when landing page is soft-deleted', async () => {
      // When deletedAt is not null, findFirst with deletedAt: null returns null
      (prismaService.landingPage.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        facade.startSession(mockLandingPageId, mockCompanyId, createSessionDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should map session response correctly with all fields', async () => {
      (prismaService.landingPage.findFirst as jest.Mock).mockResolvedValue(mockLandingPage);
      (sessionService.createSession as jest.Mock).mockResolvedValue(mockSession);

      const result = await facade.startSession(mockLandingPageId, mockCompanyId, createSessionDto);

      expect(result).toMatchObject({
        id: mockSessionId,
        sessionToken: mockSessionToken,
        landingPageId: mockLandingPageId,
        status: LandingPageSessionStatus.ACTIVE,
        visitorId: 'visitor-123',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'macOS',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'summer-sale',
        cartId: null,
        orderId: null,
        convertedAt: null,
        abandonedAt: null,
      });
    });

    it('should handle minimal session creation without optional fields', async () => {
      const minimalDto: CreateSessionDto = {};
      const minimalSession = {
        ...mockSession,
        visitorId: null,
        userAgent: null,
        referrer: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmTerm: null,
        utmContent: null,
      };
      (prismaService.landingPage.findFirst as jest.Mock).mockResolvedValue(mockLandingPage);
      (sessionService.createSession as jest.Mock).mockResolvedValue(minimalSession);

      const result = await facade.startSession(mockLandingPageId, mockCompanyId, minimalDto);

      expect(result.id).toBe(mockSessionId);
      expect(result.sessionToken).toBe(mockSessionToken);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getSession Tests
  // ═══════════════════════════════════════════════════════════════

  describe('getSession', () => {
    it('should return session by token', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSession);

      const result = await facade.getSession(mockSessionToken);

      expect(sessionService.getSessionByToken).toHaveBeenCalledWith(mockSessionToken);
      expect(result.id).toBe(mockSessionId);
      expect(result.sessionToken).toBe(mockSessionToken);
    });

    it('should throw NotFoundException when session not found', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(null);

      await expect(facade.getSession('invalid-token')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getOrCreateCart Tests
  // ═══════════════════════════════════════════════════════════════

  describe('getOrCreateCart', () => {
    it('should return existing cart when session already has one', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (cartService.getCartById as jest.Mock).mockResolvedValue(mockCart);

      const result = await facade.getOrCreateCart(mockSessionToken);

      expect(sessionService.getSessionByToken).toHaveBeenCalledWith(mockSessionToken);
      expect(cartService.getCartById).toHaveBeenCalledWith(mockCartId);
      expect(cartService.getOrCreateCart).not.toHaveBeenCalled();
      expect(result.id).toBe(mockCartId);
    });

    it('should create new cart when session has no cart', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSession);
      (cartService.getOrCreateCart as jest.Mock).mockResolvedValue(mockCart);
      (sessionService.linkCart as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (cartService.getCartById as jest.Mock).mockResolvedValue(mockCart);

      const result = await facade.getOrCreateCart(mockSessionToken);

      expect(cartService.getOrCreateCart).toHaveBeenCalledWith(mockCompanyId, {
        sessionToken: mockSessionToken,
        visitorId: 'visitor-123',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'summer-sale',
      });
      expect(sessionService.linkCart).toHaveBeenCalledWith(mockSessionToken, mockCartId);
      expect(cartService.getCartById).toHaveBeenCalledWith(mockCartId);
      expect(result.id).toBe(mockCartId);
    });

    it('should throw NotFoundException when session not found', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(null);

      await expect(facade.getOrCreateCart('invalid-token')).rejects.toThrow(NotFoundException);

      expect(cartService.getOrCreateCart).not.toHaveBeenCalled();
    });

    it('should pass undefined for nullable fields when creating cart', async () => {
      const sessionWithNullFields = {
        ...mockSession,
        visitorId: null,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
      };
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(sessionWithNullFields);
      (cartService.getOrCreateCart as jest.Mock).mockResolvedValue(mockCart);
      (sessionService.linkCart as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (cartService.getCartById as jest.Mock).mockResolvedValue(mockCart);

      await facade.getOrCreateCart(mockSessionToken);

      expect(cartService.getOrCreateCart).toHaveBeenCalledWith(mockCompanyId, {
        sessionToken: mockSessionToken,
        visitorId: undefined,
        utmSource: undefined,
        utmMedium: undefined,
        utmCampaign: undefined,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // addToCart Tests
  // ═══════════════════════════════════════════════════════════════

  describe('addToCart', () => {
    it('should add item to cart and track event', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (cartService.getCartById as jest.Mock).mockResolvedValue(mockCart);
      (cartService.addItem as jest.Mock).mockResolvedValue(mockCart);
      (sessionService.trackEvent as jest.Mock).mockResolvedValue(undefined);

      const result = await facade.addToCart(mockSessionToken, mockProductId, 2);

      expect(cartService.addItem).toHaveBeenCalledWith(mockCartId, {
        productId: mockProductId,
        quantity: 2,
        variantId: undefined,
      });
      expect(sessionService.trackEvent).toHaveBeenCalledWith(mockSessionToken, {
        eventType: 'ADD_TO_CART',
        eventData: { productId: mockProductId, quantity: 2, variantId: undefined },
      });
      expect(result.id).toBe(mockCartId);
    });

    it('should add item with variant to cart', async () => {
      const variantId = 'variant-1';
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (cartService.getCartById as jest.Mock).mockResolvedValue(mockCart);
      (cartService.addItem as jest.Mock).mockResolvedValue(mockCart);
      (sessionService.trackEvent as jest.Mock).mockResolvedValue(undefined);

      await facade.addToCart(mockSessionToken, mockProductId, 1, variantId);

      expect(cartService.addItem).toHaveBeenCalledWith(mockCartId, {
        productId: mockProductId,
        quantity: 1,
        variantId,
      });
      expect(sessionService.trackEvent).toHaveBeenCalledWith(mockSessionToken, {
        eventType: 'ADD_TO_CART',
        eventData: { productId: mockProductId, quantity: 1, variantId },
      });
    });

    it('should create cart if session does not have one', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSession);
      (cartService.getOrCreateCart as jest.Mock).mockResolvedValue(mockCart);
      (sessionService.linkCart as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (cartService.getCartById as jest.Mock).mockResolvedValue(mockCart);
      (cartService.addItem as jest.Mock).mockResolvedValue(mockCart);
      (sessionService.trackEvent as jest.Mock).mockResolvedValue(undefined);

      await facade.addToCart(mockSessionToken, mockProductId, 1);

      expect(cartService.getOrCreateCart).toHaveBeenCalled();
      expect(sessionService.linkCart).toHaveBeenCalled();
      expect(cartService.addItem).toHaveBeenCalled();
    });

    it('should throw NotFoundException when session not found', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(null);

      await expect(
        facade.addToCart('invalid-token', mockProductId, 1),
      ).rejects.toThrow(NotFoundException);

      expect(cartService.addItem).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateCartItem Tests
  // ═══════════════════════════════════════════════════════════════

  describe('updateCartItem', () => {
    it('should update cart item quantity', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (cartService.getCartById as jest.Mock).mockResolvedValue(mockCart);
      (prismaService.cartItem.findFirst as jest.Mock).mockResolvedValue(mockCartItem);
      (cartService.updateItem as jest.Mock).mockResolvedValue(mockCart);
      (sessionService.trackEvent as jest.Mock).mockResolvedValue(undefined);

      const result = await facade.updateCartItem(mockSessionToken, mockItemId, 5);

      expect(prismaService.cartItem.findFirst).toHaveBeenCalledWith({
        where: { id: mockItemId, cartId: mockCartId },
      });
      expect(cartService.updateItem).toHaveBeenCalledWith(mockCartId, mockItemId, { quantity: 5 });
      expect(sessionService.trackEvent).toHaveBeenCalledWith(mockSessionToken, {
        eventType: 'UPDATE_CART_ITEM',
        eventData: { itemId: mockItemId, quantity: 5, productId: mockProductId },
      });
      expect(result.id).toBe(mockCartId);
    });

    it('should throw NotFoundException when session not found', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(null);

      await expect(
        facade.updateCartItem('invalid-token', mockItemId, 5),
      ).rejects.toThrow(NotFoundException);

      expect(cartService.updateItem).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when session does not have a cart', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSession);

      await expect(
        facade.updateCartItem(mockSessionToken, mockItemId, 5),
      ).rejects.toThrow(NotFoundException);

      expect(cartService.updateItem).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when item not found in cart', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (cartService.getCartById as jest.Mock).mockResolvedValue(mockCart);
      (prismaService.cartItem.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        facade.updateCartItem(mockSessionToken, 'invalid-item', 5),
      ).rejects.toThrow(NotFoundException);

      expect(cartService.updateItem).not.toHaveBeenCalled();
    });

    it('should validate item belongs to the session cart', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (cartService.getCartById as jest.Mock).mockResolvedValue(mockCart);
      (prismaService.cartItem.findFirst as jest.Mock).mockResolvedValue(null); // Item not in this cart

      await expect(
        facade.updateCartItem(mockSessionToken, 'other-cart-item', 5),
      ).rejects.toThrow(NotFoundException);

      expect(prismaService.cartItem.findFirst).toHaveBeenCalledWith({
        where: { id: 'other-cart-item', cartId: mockCartId },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // removeFromCart Tests
  // ═══════════════════════════════════════════════════════════════

  describe('removeFromCart', () => {
    it('should remove item from cart', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (cartService.getCartById as jest.Mock).mockResolvedValue(mockCart);
      (prismaService.cartItem.findFirst as jest.Mock).mockResolvedValue(mockCartItem);
      (cartService.removeItem as jest.Mock).mockResolvedValue({ ...mockCart, items: [] });
      (sessionService.trackEvent as jest.Mock).mockResolvedValue(undefined);

      const result = await facade.removeFromCart(mockSessionToken, mockItemId);

      expect(prismaService.cartItem.findFirst).toHaveBeenCalledWith({
        where: { id: mockItemId, cartId: mockCartId },
      });
      expect(cartService.removeItem).toHaveBeenCalledWith(mockCartId, mockItemId);
      expect(sessionService.trackEvent).toHaveBeenCalledWith(mockSessionToken, {
        eventType: 'REMOVE_FROM_CART',
        eventData: { itemId: mockItemId, productId: mockProductId },
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when session not found', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(null);

      await expect(
        facade.removeFromCart('invalid-token', mockItemId),
      ).rejects.toThrow(NotFoundException);

      expect(cartService.removeItem).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when session does not have a cart', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSession);

      await expect(
        facade.removeFromCart(mockSessionToken, mockItemId),
      ).rejects.toThrow(NotFoundException);

      expect(cartService.removeItem).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when item not found in cart', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (cartService.getCartById as jest.Mock).mockResolvedValue(mockCart);
      (prismaService.cartItem.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        facade.removeFromCart(mockSessionToken, 'invalid-item'),
      ).rejects.toThrow(NotFoundException);

      expect(cartService.removeItem).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // completeCheckout Tests
  // ═══════════════════════════════════════════════════════════════

  describe('completeCheckout', () => {
    it('should mark session and cart as converted', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (sessionService.convertSession as jest.Mock).mockResolvedValue(undefined);
      (cartService.markConverted as jest.Mock).mockResolvedValue(undefined);

      await facade.completeCheckout(mockSessionToken, mockOrderId);

      expect(sessionService.getSessionByToken).toHaveBeenCalledWith(mockSessionToken);
      expect(sessionService.convertSession).toHaveBeenCalledWith(mockSessionToken, mockOrderId);
      expect(cartService.markConverted).toHaveBeenCalledWith(mockCartId, mockOrderId);
    });

    it('should not call markConverted when session has no cart', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSession);
      (sessionService.convertSession as jest.Mock).mockResolvedValue(undefined);

      await facade.completeCheckout(mockSessionToken, mockOrderId);

      expect(sessionService.convertSession).toHaveBeenCalledWith(mockSessionToken, mockOrderId);
      expect(cartService.markConverted).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when session not found', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(null);

      await expect(
        facade.completeCheckout('invalid-token', mockOrderId),
      ).rejects.toThrow(NotFoundException);

      expect(sessionService.convertSession).not.toHaveBeenCalled();
      expect(cartService.markConverted).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // abandonSession Tests
  // ═══════════════════════════════════════════════════════════════

  describe('abandonSession', () => {
    it('should mark session and cart as abandoned for ACTIVE sessions', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (sessionService.abandonSession as jest.Mock).mockResolvedValue(undefined);
      (cartService.markAbandoned as jest.Mock).mockResolvedValue(undefined);

      await facade.abandonSession(mockSessionToken);

      expect(sessionService.getSessionByToken).toHaveBeenCalledWith(mockSessionToken);
      expect(sessionService.abandonSession).toHaveBeenCalledWith(mockSessionToken);
      expect(cartService.markAbandoned).toHaveBeenCalledWith(mockCartId);
    });

    it('should skip abandonment for already CONVERTED sessions', async () => {
      const convertedSession = {
        ...mockSessionWithCart,
        status: LandingPageSessionStatus.CONVERTED,
      };
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(convertedSession);

      await facade.abandonSession(mockSessionToken);

      expect(sessionService.abandonSession).not.toHaveBeenCalled();
      expect(cartService.markAbandoned).not.toHaveBeenCalled();
    });

    it('should skip abandonment for already ABANDONED sessions', async () => {
      const abandonedSession = {
        ...mockSessionWithCart,
        status: LandingPageSessionStatus.ABANDONED,
      };
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(abandonedSession);

      await facade.abandonSession(mockSessionToken);

      expect(sessionService.abandonSession).not.toHaveBeenCalled();
      expect(cartService.markAbandoned).not.toHaveBeenCalled();
    });

    it('should not call markAbandoned when session has no cart', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSession);
      (sessionService.abandonSession as jest.Mock).mockResolvedValue(undefined);

      await facade.abandonSession(mockSessionToken);

      expect(sessionService.abandonSession).toHaveBeenCalledWith(mockSessionToken);
      expect(cartService.markAbandoned).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when session not found', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(null);

      await expect(
        facade.abandonSession('invalid-token'),
      ).rejects.toThrow(NotFoundException);

      expect(sessionService.abandonSession).not.toHaveBeenCalled();
      expect(cartService.markAbandoned).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Private Helper Method Coverage (via public methods)
  // ═══════════════════════════════════════════════════════════════

  describe('getSessionCart (private helper)', () => {
    it('should return cart via updateCartItem flow', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (cartService.getCartById as jest.Mock).mockResolvedValue(mockCart);
      (prismaService.cartItem.findFirst as jest.Mock).mockResolvedValue(mockCartItem);
      (cartService.updateItem as jest.Mock).mockResolvedValue(mockCart);
      (sessionService.trackEvent as jest.Mock).mockResolvedValue(undefined);

      const result = await facade.updateCartItem(mockSessionToken, mockItemId, 3);

      expect(cartService.getCartById).toHaveBeenCalledWith(mockCartId);
      expect(result).toBeDefined();
    });

    it('should throw when session has no cartId via removeFromCart flow', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSession);

      await expect(
        facade.removeFromCart(mockSessionToken, mockItemId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('mapToSessionResponse (private helper)', () => {
    it('should correctly map all session fields', async () => {
      const fullSession = {
        ...mockSession,
        convertedAt: new Date('2025-01-02'),
        abandonedAt: new Date('2025-01-03'),
        orderId: 'order-123',
        cartId: 'cart-123',
      };
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(fullSession);

      const result = await facade.getSession(mockSessionToken);

      expect(result).toMatchObject({
        id: fullSession.id,
        sessionToken: fullSession.sessionToken,
        landingPageId: fullSession.landingPageId,
        status: fullSession.status,
        visitorId: fullSession.visitorId,
        deviceType: fullSession.deviceType,
        browser: fullSession.browser,
        os: fullSession.os,
        utmSource: fullSession.utmSource,
        utmMedium: fullSession.utmMedium,
        utmCampaign: fullSession.utmCampaign,
        cartId: fullSession.cartId,
        orderId: fullSession.orderId,
        convertedAt: fullSession.convertedAt,
        abandonedAt: fullSession.abandonedAt,
        startedAt: fullSession.startedAt,
        lastActivityAt: fullSession.lastActivityAt,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases and Error Handling
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle session with null UTM fields when creating cart', async () => {
      const sessionNoUtm = {
        ...mockSession,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        visitorId: null,
      };
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(sessionNoUtm);
      (cartService.getOrCreateCart as jest.Mock).mockResolvedValue(mockCart);
      (sessionService.linkCart as jest.Mock).mockResolvedValue({ ...sessionNoUtm, cartId: mockCartId });
      (cartService.getCartById as jest.Mock).mockResolvedValue(mockCart);

      const result = await facade.getOrCreateCart(mockSessionToken);

      expect(cartService.getOrCreateCart).toHaveBeenCalledWith(mockCompanyId, {
        sessionToken: mockSessionToken,
        visitorId: undefined,
        utmSource: undefined,
        utmMedium: undefined,
        utmCampaign: undefined,
      });
      expect(result).toBeDefined();
    });

    it('should handle addToCart with quantity of 1 (default use case)', async () => {
      (sessionService.getSessionByToken as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (cartService.getCartById as jest.Mock).mockResolvedValue(mockCart);
      (cartService.addItem as jest.Mock).mockResolvedValue(mockCart);
      (sessionService.trackEvent as jest.Mock).mockResolvedValue(undefined);

      await facade.addToCart(mockSessionToken, mockProductId, 1);

      expect(cartService.addItem).toHaveBeenCalledWith(mockCartId, {
        productId: mockProductId,
        quantity: 1,
        variantId: undefined,
      });
    });

    it('should properly chain operations: getOrCreateCart -> addToCart', async () => {
      // Simulate a fresh session without cart
      (sessionService.getSessionByToken as jest.Mock)
        .mockResolvedValueOnce(mockSession)  // First call for getOrCreateCart
        .mockResolvedValueOnce(mockSessionWithCart); // After linkCart

      (cartService.getOrCreateCart as jest.Mock).mockResolvedValue(mockCart);
      (sessionService.linkCart as jest.Mock).mockResolvedValue(mockSessionWithCart);
      (cartService.getCartById as jest.Mock).mockResolvedValue(mockCart);
      (cartService.addItem as jest.Mock).mockResolvedValue(mockCart);
      (sessionService.trackEvent as jest.Mock).mockResolvedValue(undefined);

      await facade.addToCart(mockSessionToken, mockProductId, 2);

      // Should have called getOrCreateCart and linkCart since session had no cart
      expect(cartService.getOrCreateCart).toHaveBeenCalled();
      expect(sessionService.linkCart).toHaveBeenCalled();
      expect(cartService.addItem).toHaveBeenCalled();
    });
  });
});
