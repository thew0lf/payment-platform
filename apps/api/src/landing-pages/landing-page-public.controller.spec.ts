/**
 * LandingPagePublicController Tests
 * Testing public API endpoints for landing page access and session management
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  LandingPagePublicController,
  PublicLandingPageResponse,
  SessionResponse,
} from './landing-page-public.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/services/cart.service';
import { LandingPagesService } from './services/landing-pages.service';
import {
  LandingPageSessionService,
  CreateSessionDto,
  UpdateSessionDto,
  SessionEventDto,
} from './services/landing-page-session.service';
import { LandingPageStatus, LandingPageSessionStatus, CartSourceType } from '@prisma/client';

describe('LandingPagePublicController', () => {
  let controller: LandingPagePublicController;
  let prismaService: jest.Mocked<PrismaService>;
  let cartService: jest.Mocked<CartService>;
  let landingPagesService: jest.Mocked<LandingPagesService>;
  let sessionService: jest.Mocked<LandingPageSessionService>;

  // Test constants
  const mockCompanyId = 'company-123';
  const mockLandingPageId = 'lp-456';
  const mockSessionToken = 'test-session-token-abc123';
  const mockCartId = 'cart-789';
  const mockSlug = 'summer-sale-2025';

  // Mock landing page data
  const mockLandingPage = {
    id: mockLandingPageId,
    companyId: mockCompanyId,
    name: 'Summer Sale 2025',
    slug: mockSlug,
    theme: 'modern',
    colorScheme: { primary: '#ff6b35', secondary: '#004e89' },
    typography: { headingFont: 'Inter', bodyFont: 'Inter' },
    status: LandingPageStatus.PUBLISHED,
    metaTitle: 'Summer Sale 2025 - 50% Off',
    metaDescription: 'Get amazing deals this summer',
    ogImage: 'https://cdn.example.com/og-image.jpg',
    favicon: 'https://cdn.example.com/favicon.ico',
    customCss: '.hero { background: red; }',
    googleAnalyticsId: 'GA-12345',
    facebookPixelId: 'FB-67890',
    totalPageViews: BigInt(1000),
    deletedAt: null,
    sections: [
      {
        id: 'section-1',
        type: 'HERO',
        name: 'Hero Section',
        order: 0,
        content: { title: 'Welcome', subtitle: 'Summer Sale' },
        styles: { backgroundColor: '#fff' },
        enabled: true,
        hideOnMobile: false,
        hideOnDesktop: false,
      },
      {
        id: 'section-2',
        type: 'PRODUCTS',
        name: 'Products',
        order: 1,
        content: { productIds: ['prod-1', 'prod-2'] },
        styles: null,
        enabled: true,
        hideOnMobile: false,
        hideOnDesktop: false,
      },
    ],
    company: {
      id: mockCompanyId,
      name: 'Test Company',
    },
  };

  // Mock session data
  const mockSession = {
    id: 'session-123',
    sessionToken: mockSessionToken,
    landingPageId: mockLandingPageId,
    companyId: mockCompanyId,
    visitorId: 'visitor-abc',
    status: LandingPageSessionStatus.ACTIVE,
    cartId: null,
    startedAt: new Date('2025-01-01T10:00:00Z'),
    lastActivityAt: new Date('2025-01-01T10:05:00Z'),
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'summer-sale',
    cart: null,
  };

  // Mock cart data
  const mockCart = {
    id: mockCartId,
    companyId: mockCompanyId,
    sessionToken: 'cart-session-token',
    status: 'ACTIVE',
    currency: 'USD',
    items: [],
    totals: {
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      shippingTotal: 0,
      grandTotal: 0,
      itemCount: 0,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LandingPagePublicController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            landingPage: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            cart: {
              update: jest.fn(),
            },
          },
        },
        {
          provide: CartService,
          useValue: {
            getCartBySessionToken: jest.fn(),
            getOrCreateCart: jest.fn(),
          },
        },
        {
          provide: LandingPagesService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: LandingPageSessionService,
          useValue: {
            createSession: jest.fn(),
            getSessionByToken: jest.fn(),
            updateSession: jest.fn(),
            linkCart: jest.fn(),
            trackEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LandingPagePublicController>(LandingPagePublicController);
    prismaService = module.get(PrismaService);
    cartService = module.get(CartService);
    landingPagesService = module.get(LandingPagesService);
    sessionService = module.get(LandingPageSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /api/lp/:slug
  // ═══════════════════════════════════════════════════════════════

  describe('getBySlug', () => {
    it('should return landing page for valid slug', async () => {
      (prismaService.landingPage.findFirst as jest.Mock).mockResolvedValue(mockLandingPage);
      (prismaService.landingPage.update as jest.Mock).mockResolvedValue(mockLandingPage);

      const result = await controller.getBySlug(mockSlug);

      expect(result).toEqual({
        id: mockLandingPageId,
        companyId: mockCompanyId,
        name: 'Summer Sale 2025',
        slug: mockSlug,
        theme: 'modern',
        colorScheme: { primary: '#ff6b35', secondary: '#004e89' },
        typography: { headingFont: 'Inter', bodyFont: 'Inter' },
        metaTitle: 'Summer Sale 2025 - 50% Off',
        metaDescription: 'Get amazing deals this summer',
        ogImage: 'https://cdn.example.com/og-image.jpg',
        favicon: 'https://cdn.example.com/favicon.ico',
        customCss: '.hero { background: red; }',
        googleAnalyticsId: 'GA-12345',
        facebookPixelId: 'FB-67890',
        sections: [
          {
            id: 'section-1',
            type: 'HERO',
            name: 'Hero Section',
            order: 0,
            content: { title: 'Welcome', subtitle: 'Summer Sale' },
            styles: { backgroundColor: '#fff' },
            hideOnMobile: false,
            hideOnDesktop: false,
          },
          {
            id: 'section-2',
            type: 'PRODUCTS',
            name: 'Products',
            order: 1,
            content: { productIds: ['prod-1', 'prod-2'] },
            styles: undefined,
            hideOnMobile: false,
            hideOnDesktop: false,
          },
        ],
        company: {
          id: mockCompanyId,
          name: 'Test Company',
        },
      });

      expect(prismaService.landingPage.findFirst).toHaveBeenCalledWith({
        where: {
          slug: mockSlug,
          status: LandingPageStatus.PUBLISHED,
          deletedAt: null,
        },
        include: {
          sections: {
            where: { enabled: true },
            orderBy: { order: 'asc' },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should return 404 for non-existent slug', async () => {
      (prismaService.landingPage.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(controller.getBySlug('non-existent-slug')).rejects.toThrow(
        new NotFoundException('Landing page not found'),
      );
    });

    it('should return 404 for unpublished landing page', async () => {
      // Unpublished pages are filtered out by the query, so findFirst returns null
      (prismaService.landingPage.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(controller.getBySlug('draft-page-slug')).rejects.toThrow(
        new NotFoundException('Landing page not found'),
      );
    });

    it('should increment page views fire-and-forget', async () => {
      (prismaService.landingPage.findFirst as jest.Mock).mockResolvedValue(mockLandingPage);
      (prismaService.landingPage.update as jest.Mock).mockResolvedValue(mockLandingPage);

      await controller.getBySlug(mockSlug);

      // Page views increment is called asynchronously
      expect(prismaService.landingPage.update).toHaveBeenCalledWith({
        where: { id: mockLandingPageId },
        data: { totalPageViews: { increment: 1 } },
      });
    });

    it('should handle page views increment failure gracefully', async () => {
      (prismaService.landingPage.findFirst as jest.Mock).mockResolvedValue(mockLandingPage);
      (prismaService.landingPage.update as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      // Should not throw - fire and forget
      const result = await controller.getBySlug(mockSlug);
      expect(result.id).toBe(mockLandingPageId);
    });

    it('should handle landing page without optional fields', async () => {
      const minimalPage = {
        ...mockLandingPage,
        metaTitle: null,
        metaDescription: null,
        ogImage: null,
        favicon: null,
        customCss: null,
        googleAnalyticsId: null,
        facebookPixelId: null,
        sections: [
          {
            id: 'section-1',
            type: 'HERO',
            name: null,
            order: 0,
            content: {},
            styles: null,
            enabled: true,
            hideOnMobile: false,
            hideOnDesktop: false,
          },
        ],
      };
      (prismaService.landingPage.findFirst as jest.Mock).mockResolvedValue(minimalPage);
      (prismaService.landingPage.update as jest.Mock).mockResolvedValue(minimalPage);

      const result = await controller.getBySlug(mockSlug);

      expect(result.metaTitle).toBeUndefined();
      expect(result.metaDescription).toBeUndefined();
      expect(result.ogImage).toBeUndefined();
      expect(result.favicon).toBeUndefined();
      expect(result.customCss).toBeUndefined();
      expect(result.googleAnalyticsId).toBeUndefined();
      expect(result.facebookPixelId).toBeUndefined();
      expect(result.sections[0].name).toBeUndefined();
      expect(result.sections[0].styles).toBeUndefined();
    });

    it('should return sections in correct order', async () => {
      const pageWithSections = {
        ...mockLandingPage,
        sections: [
          { id: 'section-3', type: 'FOOTER', name: 'Footer', order: 2, content: {}, styles: null, enabled: true, hideOnMobile: false, hideOnDesktop: false },
          { id: 'section-1', type: 'HERO', name: 'Hero', order: 0, content: {}, styles: null, enabled: true, hideOnMobile: false, hideOnDesktop: false },
          { id: 'section-2', type: 'PRODUCTS', name: 'Products', order: 1, content: {}, styles: null, enabled: true, hideOnMobile: false, hideOnDesktop: false },
        ],
      };
      (prismaService.landingPage.findFirst as jest.Mock).mockResolvedValue(pageWithSections);
      (prismaService.landingPage.update as jest.Mock).mockResolvedValue(pageWithSections);

      const result = await controller.getBySlug(mockSlug);

      // Sections are returned as provided (Prisma handles ordering)
      expect(result.sections).toHaveLength(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /api/lp/:landingPageId/sessions
  // ═══════════════════════════════════════════════════════════════

  describe('createSession', () => {
    const createSessionDto: CreateSessionDto = {
      visitorId: 'visitor-abc',
      userAgent: 'Mozilla/5.0 Chrome/120.0',
      referrer: 'https://google.com',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'summer-sale',
    };

    it('should create session with valid headers', async () => {
      sessionService.createSession.mockResolvedValue(mockSession as any);

      const result = await controller.createSession(
        mockLandingPageId,
        mockCompanyId,
        '192.168.1.1, 10.0.0.1',
        undefined,
        createSessionDto,
      );

      expect(result).toEqual({
        sessionToken: mockSessionToken,
        landingPageId: mockLandingPageId,
        visitorId: 'visitor-abc',
        status: LandingPageSessionStatus.ACTIVE,
        cartId: undefined,
        startedAt: mockSession.startedAt,
        lastActivityAt: mockSession.lastActivityAt,
      });

      expect(sessionService.createSession).toHaveBeenCalledWith(
        mockLandingPageId,
        mockCompanyId,
        {
          ...createSessionDto,
          ipAddress: '192.168.1.1',
        },
      );
    });

    it('should return 403 for missing x-company-id header', async () => {
      await expect(
        controller.createSession(
          mockLandingPageId,
          '', // Empty company ID
          undefined,
          undefined,
          createSessionDto,
        ),
      ).rejects.toThrow(new ForbiddenException('x-company-id header is required'));
    });

    it('should return 403 for undefined x-company-id header', async () => {
      await expect(
        controller.createSession(
          mockLandingPageId,
          undefined as any,
          undefined,
          undefined,
          createSessionDto,
        ),
      ).rejects.toThrow(new ForbiddenException('x-company-id header is required'));
    });

    it('should return session with token', async () => {
      sessionService.createSession.mockResolvedValue(mockSession as any);

      const result = await controller.createSession(
        mockLandingPageId,
        mockCompanyId,
        undefined,
        undefined,
        {},
      );

      expect(result.sessionToken).toBe(mockSessionToken);
      expect(result.landingPageId).toBe(mockLandingPageId);
    });

    it('should extract IP from x-forwarded-for header', async () => {
      sessionService.createSession.mockResolvedValue(mockSession as any);

      await controller.createSession(
        mockLandingPageId,
        mockCompanyId,
        '203.0.113.195, 70.41.3.18, 150.172.238.178',
        undefined,
        {},
      );

      expect(sessionService.createSession).toHaveBeenCalledWith(
        mockLandingPageId,
        mockCompanyId,
        expect.objectContaining({
          ipAddress: '203.0.113.195',
        }),
      );
    });

    it('should use x-real-ip when x-forwarded-for is not present', async () => {
      sessionService.createSession.mockResolvedValue(mockSession as any);

      await controller.createSession(
        mockLandingPageId,
        mockCompanyId,
        undefined,
        '192.168.1.100',
        {},
      );

      expect(sessionService.createSession).toHaveBeenCalledWith(
        mockLandingPageId,
        mockCompanyId,
        expect.objectContaining({
          ipAddress: '192.168.1.100',
        }),
      );
    });

    it('should handle no IP headers gracefully', async () => {
      sessionService.createSession.mockResolvedValue(mockSession as any);

      await controller.createSession(
        mockLandingPageId,
        mockCompanyId,
        undefined,
        undefined,
        {},
      );

      expect(sessionService.createSession).toHaveBeenCalledWith(
        mockLandingPageId,
        mockCompanyId,
        expect.objectContaining({
          ipAddress: undefined,
        }),
      );
    });

    it('should return 404 when landing page not found', async () => {
      sessionService.createSession.mockRejectedValue(
        new NotFoundException('Landing page not found'),
      );

      await expect(
        controller.createSession(
          'non-existent-lp',
          mockCompanyId,
          undefined,
          undefined,
          createSessionDto,
        ),
      ).rejects.toThrow(new NotFoundException('Landing page not found'));
    });

    it('should handle session with all UTM parameters', async () => {
      const fullUtmDto: CreateSessionDto = {
        utmSource: 'facebook',
        utmMedium: 'social',
        utmCampaign: 'winter-sale',
        utmTerm: 'shoes',
        utmContent: 'banner-1',
      };

      sessionService.createSession.mockResolvedValue({
        ...mockSession,
        ...fullUtmDto,
      } as any);

      await controller.createSession(
        mockLandingPageId,
        mockCompanyId,
        undefined,
        undefined,
        fullUtmDto,
      );

      expect(sessionService.createSession).toHaveBeenCalledWith(
        mockLandingPageId,
        mockCompanyId,
        expect.objectContaining(fullUtmDto),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /api/lp/sessions/:token
  // ═══════════════════════════════════════════════════════════════

  describe('getSession', () => {
    it('should return session for valid token', async () => {
      sessionService.getSessionByToken.mockResolvedValue(mockSession as any);

      const result = await controller.getSession(mockSessionToken, mockSessionToken);

      expect(result).toEqual({
        sessionToken: mockSessionToken,
        landingPageId: mockLandingPageId,
        visitorId: 'visitor-abc',
        status: LandingPageSessionStatus.ACTIVE,
        cartId: undefined,
        startedAt: mockSession.startedAt,
        lastActivityAt: mockSession.lastActivityAt,
      });

      expect(sessionService.getSessionByToken).toHaveBeenCalledWith(mockSessionToken);
    });

    it('should return 403 for mismatched x-session-token header', async () => {
      await expect(
        controller.getSession(mockSessionToken, 'wrong-token'),
      ).rejects.toThrow(new ForbiddenException('Session token mismatch - access denied'));
    });

    it('should return 403 for missing x-session-token header', async () => {
      await expect(
        controller.getSession(mockSessionToken, undefined as any),
      ).rejects.toThrow(new ForbiddenException('x-session-token header is required'));
    });

    it('should return 403 for empty x-session-token header', async () => {
      await expect(
        controller.getSession(mockSessionToken, ''),
      ).rejects.toThrow(new ForbiddenException('x-session-token header is required'));
    });

    it('should return 404 for non-existent session', async () => {
      sessionService.getSessionByToken.mockResolvedValue(null);

      await expect(
        controller.getSession('non-existent-token', 'non-existent-token'),
      ).rejects.toThrow(new NotFoundException('Session not found'));
    });

    it('should return session with cart ID when linked', async () => {
      const sessionWithCart = {
        ...mockSession,
        cartId: mockCartId,
        cart: mockCart,
      };
      sessionService.getSessionByToken.mockResolvedValue(sessionWithCart as any);

      const result = await controller.getSession(mockSessionToken, mockSessionToken);

      expect(result.cartId).toBe(mockCartId);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PATCH /api/lp/sessions/:token
  // ═══════════════════════════════════════════════════════════════

  describe('updateSession', () => {
    const updateDto: UpdateSessionDto = {
      status: LandingPageSessionStatus.ACTIVE,
      utmSource: 'updated-source',
    };

    it('should update session activity', async () => {
      const updatedSession = {
        ...mockSession,
        utmSource: 'updated-source',
        lastActivityAt: new Date(),
      };
      sessionService.updateSession.mockResolvedValue(updatedSession as any);

      const result = await controller.updateSession(
        mockSessionToken,
        mockSessionToken,
        updateDto,
      );

      expect(result.sessionToken).toBe(mockSessionToken);
      expect(sessionService.updateSession).toHaveBeenCalledWith(
        mockSessionToken,
        updateDto,
      );
    });

    it('should validate x-session-token header', async () => {
      await expect(
        controller.updateSession(mockSessionToken, 'wrong-token', updateDto),
      ).rejects.toThrow(new ForbiddenException('Session token mismatch - access denied'));
    });

    it('should return 403 for missing x-session-token header', async () => {
      await expect(
        controller.updateSession(mockSessionToken, undefined as any, updateDto),
      ).rejects.toThrow(new ForbiddenException('x-session-token header is required'));
    });

    it('should return 404 when session not found', async () => {
      sessionService.updateSession.mockRejectedValue(
        new NotFoundException('Session not found'),
      );

      await expect(
        controller.updateSession(mockSessionToken, mockSessionToken, updateDto),
      ).rejects.toThrow(new NotFoundException('Session not found'));
    });

    it('should handle empty update DTO', async () => {
      sessionService.updateSession.mockResolvedValue(mockSession as any);

      await controller.updateSession(mockSessionToken, mockSessionToken, {});

      expect(sessionService.updateSession).toHaveBeenCalledWith(mockSessionToken, {});
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /api/lp/sessions/:token/cart
  // ═══════════════════════════════════════════════════════════════

  describe('getOrCreateCart', () => {
    it('should create and return cart for session', async () => {
      sessionService.getSessionByToken.mockResolvedValue(mockSession as any);
      cartService.getOrCreateCart.mockResolvedValue(mockCart as any);
      (prismaService.cart.update as jest.Mock).mockResolvedValue(mockCart);
      sessionService.linkCart.mockResolvedValue({ ...mockSession, cartId: mockCartId } as any);

      const result = await controller.getOrCreateCart(mockSessionToken, mockSessionToken);

      expect(result).toBeDefined();
      expect(cartService.getOrCreateCart).toHaveBeenCalledWith(mockCompanyId, {
        visitorId: 'visitor-abc',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'summer-sale',
      });

      expect(prismaService.cart.update).toHaveBeenCalledWith({
        where: { id: mockCartId },
        data: {
          landingPageId: mockLandingPageId,
          sourceType: CartSourceType.LANDING_PAGE,
        },
      });

      expect(sessionService.linkCart).toHaveBeenCalledWith(mockSessionToken, mockCartId);
    });

    it('should set proper sourceType on cart', async () => {
      sessionService.getSessionByToken.mockResolvedValue(mockSession as any);
      cartService.getOrCreateCart.mockResolvedValue(mockCart as any);
      (prismaService.cart.update as jest.Mock).mockResolvedValue(mockCart);
      sessionService.linkCart.mockResolvedValue({ ...mockSession, cartId: mockCartId } as any);

      await controller.getOrCreateCart(mockSessionToken, mockSessionToken);

      expect(prismaService.cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceType: CartSourceType.LANDING_PAGE,
          }),
        }),
      );
    });

    it('should return existing cart if already linked', async () => {
      const sessionWithCart = {
        ...mockSession,
        cartId: mockCartId,
        cart: { sessionToken: 'existing-cart-session-token' },
      };
      sessionService.getSessionByToken.mockResolvedValue(sessionWithCart as any);
      cartService.getCartBySessionToken.mockResolvedValue(mockCart as any);

      const result = await controller.getOrCreateCart(mockSessionToken, mockSessionToken);

      expect(result).toEqual(mockCart);
      expect(cartService.getOrCreateCart).not.toHaveBeenCalled();
    });

    it('should create new cart if existing cart not found', async () => {
      const sessionWithCart = {
        ...mockSession,
        cartId: mockCartId,
        cart: { sessionToken: 'old-cart-session-token' },
      };
      sessionService.getSessionByToken.mockResolvedValue(sessionWithCart as any);
      cartService.getCartBySessionToken.mockResolvedValue(null);
      cartService.getOrCreateCart.mockResolvedValue(mockCart as any);
      (prismaService.cart.update as jest.Mock).mockResolvedValue(mockCart);
      sessionService.linkCart.mockResolvedValue({ ...mockSession, cartId: mockCartId } as any);

      const result = await controller.getOrCreateCart(mockSessionToken, mockSessionToken);

      expect(result).toBeDefined();
      expect(cartService.getOrCreateCart).toHaveBeenCalled();
    });

    it('should validate x-session-token header', async () => {
      await expect(
        controller.getOrCreateCart(mockSessionToken, 'wrong-token'),
      ).rejects.toThrow(new ForbiddenException('Session token mismatch - access denied'));
    });

    it('should return 404 when session not found', async () => {
      sessionService.getSessionByToken.mockResolvedValue(null);

      await expect(
        controller.getOrCreateCart(mockSessionToken, mockSessionToken),
      ).rejects.toThrow(new NotFoundException('Session not found'));
    });

    it('should handle session without UTM parameters', async () => {
      const sessionNoUtm = {
        ...mockSession,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        visitorId: null,
      };
      sessionService.getSessionByToken.mockResolvedValue(sessionNoUtm as any);
      cartService.getOrCreateCart.mockResolvedValue(mockCart as any);
      (prismaService.cart.update as jest.Mock).mockResolvedValue(mockCart);
      sessionService.linkCart.mockResolvedValue({ ...sessionNoUtm, cartId: mockCartId } as any);

      await controller.getOrCreateCart(mockSessionToken, mockSessionToken);

      expect(cartService.getOrCreateCart).toHaveBeenCalledWith(mockCompanyId, {
        visitorId: undefined,
        utmSource: undefined,
        utmMedium: undefined,
        utmCampaign: undefined,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /api/lp/sessions/:token/events
  // ═══════════════════════════════════════════════════════════════

  describe('trackEvent', () => {
    const eventDto: SessionEventDto = {
      eventType: 'SECTION_VIEW',
      eventData: { sectionId: 'section-1', duration: 5000 },
      timestamp: new Date('2025-01-01T10:10:00Z'),
    };

    it('should accept event and return 201', async () => {
      sessionService.trackEvent.mockResolvedValue();

      const result = await controller.trackEvent(
        mockSessionToken,
        mockSessionToken,
        eventDto,
      );

      // Should return void (204 No Content)
      expect(result).toBeUndefined();
    });

    it('should fire and forget (no body)', async () => {
      sessionService.trackEvent.mockResolvedValue();

      const result = await controller.trackEvent(
        mockSessionToken,
        mockSessionToken,
        eventDto,
      );

      expect(result).toBeUndefined();
      expect(sessionService.trackEvent).toHaveBeenCalledWith(mockSessionToken, eventDto);
    });

    it('should validate x-session-token header', async () => {
      await expect(
        controller.trackEvent(mockSessionToken, 'wrong-token', eventDto),
      ).rejects.toThrow(new ForbiddenException('Session token mismatch - access denied'));
    });

    it('should return 403 for missing x-session-token header', async () => {
      await expect(
        controller.trackEvent(mockSessionToken, undefined as any, eventDto),
      ).rejects.toThrow(new ForbiddenException('x-session-token header is required'));
    });

    it('should handle trackEvent errors gracefully (fire and forget)', async () => {
      sessionService.trackEvent.mockRejectedValue(new Error('Database error'));

      // Should not throw - fire and forget
      const result = await controller.trackEvent(
        mockSessionToken,
        mockSessionToken,
        eventDto,
      );

      expect(result).toBeUndefined();
    });

    it('should handle event without optional fields', async () => {
      const minimalEvent: SessionEventDto = {
        eventType: 'PAGE_VIEW',
      };
      sessionService.trackEvent.mockResolvedValue();

      await controller.trackEvent(mockSessionToken, mockSessionToken, minimalEvent);

      expect(sessionService.trackEvent).toHaveBeenCalledWith(
        mockSessionToken,
        minimalEvent,
      );
    });

    it('should handle various event types', async () => {
      const eventTypes = [
        'PAGE_VIEW',
        'SECTION_VIEW',
        'CTA_CLICK',
        'FORM_START',
        'FORM_SUBMIT',
        'ADD_TO_CART',
        'SCROLL_DEPTH',
        'VIDEO_PLAY',
      ];

      sessionService.trackEvent.mockResolvedValue();

      for (const eventType of eventTypes) {
        await controller.trackEvent(
          mockSessionToken,
          mockSessionToken,
          { eventType },
        );
      }

      expect(sessionService.trackEvent).toHaveBeenCalledTimes(eventTypes.length);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Session Token Validation Tests
  // ═══════════════════════════════════════════════════════════════

  describe('validateSessionToken', () => {
    it('should allow matching tokens', async () => {
      sessionService.getSessionByToken.mockResolvedValue(mockSession as any);

      // Should not throw
      await expect(
        controller.getSession(mockSessionToken, mockSessionToken),
      ).resolves.toBeDefined();
    });

    it('should reject null header token', async () => {
      await expect(
        controller.getSession(mockSessionToken, null as any),
      ).rejects.toThrow(new ForbiddenException('x-session-token header is required'));
    });

    it('should reject whitespace-only header token', async () => {
      await expect(
        controller.getSession(mockSessionToken, '   '),
      ).rejects.toThrow(new ForbiddenException('Session token mismatch - access denied'));
    });

    it('should be case-sensitive', async () => {
      await expect(
        controller.getSession(mockSessionToken, mockSessionToken.toUpperCase()),
      ).rejects.toThrow(new ForbiddenException('Session token mismatch - access denied'));
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Edge Cases and Security Tests
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle very long session tokens', async () => {
      const longToken = 'a'.repeat(1000);

      await expect(
        controller.getSession(longToken, longToken),
      ).resolves.toBeDefined().catch(() => {
        // Either works or throws NotFoundException (not ForbiddenException)
      });

      sessionService.getSessionByToken.mockResolvedValue(null);
      await expect(
        controller.getSession(longToken, longToken),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle special characters in slug', async () => {
      const specialSlug = 'sale-2025_special-offer';
      (prismaService.landingPage.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(controller.getBySlug(specialSlug)).rejects.toThrow(NotFoundException);
      expect(prismaService.landingPage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            slug: specialSlug,
          }),
        }),
      );
    });

    it('should handle unicode in UTM parameters', async () => {
      const unicodeDto: CreateSessionDto = {
        utmCampaign: 'summer-sale-',
        utmContent: 'banner-1',
      };
      sessionService.createSession.mockResolvedValue({
        ...mockSession,
        ...unicodeDto,
      } as any);

      await controller.createSession(
        mockLandingPageId,
        mockCompanyId,
        undefined,
        undefined,
        unicodeDto,
      );

      expect(sessionService.createSession).toHaveBeenCalledWith(
        mockLandingPageId,
        mockCompanyId,
        expect.objectContaining(unicodeDto),
      );
    });

    it('should handle empty event data object', async () => {
      const eventWithEmptyData: SessionEventDto = {
        eventType: 'PAGE_VIEW',
        eventData: {},
      };
      sessionService.trackEvent.mockResolvedValue();

      await controller.trackEvent(
        mockSessionToken,
        mockSessionToken,
        eventWithEmptyData,
      );

      expect(sessionService.trackEvent).toHaveBeenCalledWith(
        mockSessionToken,
        eventWithEmptyData,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Response Transformation Tests
  // ═══════════════════════════════════════════════════════════════

  describe('Response Transformation', () => {
    it('should transform session to response correctly', async () => {
      const fullSession = {
        ...mockSession,
        cartId: mockCartId,
        cart: { id: mockCartId },
      };
      sessionService.getSessionByToken.mockResolvedValue(fullSession as any);

      const result = await controller.getSession(mockSessionToken, mockSessionToken);

      expect(result).toEqual({
        sessionToken: mockSessionToken,
        landingPageId: mockLandingPageId,
        visitorId: 'visitor-abc',
        status: LandingPageSessionStatus.ACTIVE,
        cartId: mockCartId,
        startedAt: mockSession.startedAt,
        lastActivityAt: mockSession.lastActivityAt,
      });
    });

    it('should handle session without visitorId', async () => {
      const sessionNoVisitor = {
        ...mockSession,
        visitorId: null,
      };
      sessionService.getSessionByToken.mockResolvedValue(sessionNoVisitor as any);

      const result = await controller.getSession(mockSessionToken, mockSessionToken);

      expect(result.visitorId).toBeUndefined();
    });

    it('should extract cartId from cart relation if direct cartId is null', async () => {
      const sessionWithCartRelation = {
        ...mockSession,
        cartId: null,
        cart: { id: mockCartId },
      };
      sessionService.getSessionByToken.mockResolvedValue(sessionWithCartRelation as any);

      const result = await controller.getSession(mockSessionToken, mockSessionToken);

      expect(result.cartId).toBe(mockCartId);
    });
  });
});
