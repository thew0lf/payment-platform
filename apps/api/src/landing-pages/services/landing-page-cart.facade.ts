import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../../cart/services/cart.service';
import { LandingPagesService } from './landing-pages.service';
import { LandingPageSessionService, CreateSessionDto as SessionCreateDto } from './landing-page-session.service';
import { LandingPageStatus, LandingPageSessionStatus } from '@prisma/client';
import {
  CreateSessionDto,
  SessionResponse,
} from '../types/landing-page-session.types';
import { CartData } from '../../cart/types/cart.types';

/**
 * LandingPageCartFacade - Orchestration service for landing page cart operations
 *
 * This facade coordinates between:
 * - LandingPageSessionService (for session management)
 * - CartService (for cart CRUD operations)
 * - LandingPagesService (for landing page verification)
 *
 * It provides a unified API for frontend landing pages to:
 * - Start visitor sessions
 * - Create and manage carts
 * - Track conversions
 */
@Injectable()
export class LandingPageCartFacade {
  private readonly logger = new Logger(LandingPageCartFacade.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly landingPagesService: LandingPagesService,
    private readonly sessionService: LandingPageSessionService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start a new session for a landing page visitor
   *
   * Verifies the landing page exists and is published, then creates
   * a new session with the provided visitor information.
   *
   * @param landingPageId - The landing page ID
   * @param companyId - The company ID (for scoping)
   * @param dto - Session creation data (visitor info, UTM params, device info)
   * @returns Session response with token and initial data
   */
  async startSession(
    landingPageId: string,
    companyId: string,
    dto: CreateSessionDto,
  ): Promise<SessionResponse> {
    // Verify landing page exists and is published
    const landingPage = await this.prisma.landingPage.findFirst({
      where: {
        id: landingPageId,
        companyId,
        deletedAt: null,
      },
    });

    if (!landingPage) {
      throw new NotFoundException('Landing page not found');
    }

    if (landingPage.status !== LandingPageStatus.PUBLISHED) {
      throw new ForbiddenException('Landing page is not published');
    }

    // Map the DTO to the session service's expected format
    const sessionDto: SessionCreateDto = {
      visitorId: dto.visitorId,
      ipAddress: dto.ipAddress, // Server-captured IP for privacy hashing
      userAgent: dto.userAgent,
      referrer: dto.referrer,
      utmSource: dto.utmSource,
      utmMedium: dto.utmMedium,
      utmCampaign: dto.utmCampaign,
      utmTerm: dto.utmTerm,
      utmContent: dto.utmContent,
    };

    // Create the session via session service
    const session = await this.sessionService.createSession(
      landingPageId,
      companyId,
      sessionDto,
    );

    this.logger.log(`Session started for landing page ${landingPageId}: ${session.id}`);

    return this.mapToSessionResponse(session);
  }

  /**
   * Get session by token
   */
  async getSession(sessionToken: string): Promise<SessionResponse> {
    const session = await this.sessionService.getSessionByToken(sessionToken);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.mapToSessionResponse(session);
  }

  // ═══════════════════════════════════════════════════════════════
  // CART MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get or create a cart for the session
   *
   * If the session already has a cart, returns it.
   * Otherwise creates a new cart linked to the landing page.
   *
   * @param sessionToken - The session token
   * @returns Cart with items
   */
  async getOrCreateCart(sessionToken: string): Promise<CartData> {
    const session = await this.sessionService.getSessionByToken(sessionToken);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // If session already has a cart, return it
    if (session.cartId) {
      return this.cartService.getCartById(session.cartId);
    }

    // Create new cart linked to landing page
    const cart = await this.cartService.getOrCreateCart(session.companyId, {
      sessionToken: session.sessionToken,
      visitorId: session.visitorId || undefined,
      utmSource: session.utmSource || undefined,
      utmMedium: session.utmMedium || undefined,
      utmCampaign: session.utmCampaign || undefined,
    });

    // Link cart to session (this also sets landing page attribution on the cart)
    await this.sessionService.linkCart(sessionToken, cart.id);

    this.logger.log(`Cart created for session ${session.id}: ${cart.id}`);

    // Return updated cart with landing page info
    return this.cartService.getCartById(cart.id);
  }

  /**
   * Add item to cart
   *
   * @param sessionToken - The session token
   * @param productId - Product to add
   * @param quantity - Quantity to add
   * @param variantId - Optional variant ID
   * @returns Updated cart with items
   */
  async addToCart(
    sessionToken: string,
    productId: string,
    quantity: number,
    variantId?: string,
  ): Promise<CartData> {
    // Get or create cart for session
    const cart = await this.getOrCreateCart(sessionToken);

    // Add item to cart
    const updatedCart = await this.cartService.addItem(cart.id, {
      productId,
      quantity,
      variantId,
    });

    // Update session last activity via event tracking
    await this.sessionService.trackEvent(sessionToken, {
      eventType: 'ADD_TO_CART',
      eventData: { productId, quantity, variantId },
    });

    this.logger.debug(`Added product ${productId} to cart ${cart.id}`);

    return updatedCart;
  }

  /**
   * Update cart item quantity
   *
   * @param sessionToken - The session token
   * @param itemId - Cart item ID to update
   * @param quantity - New quantity
   * @returns Updated cart with items
   */
  async updateCartItem(
    sessionToken: string,
    itemId: string,
    quantity: number,
  ): Promise<CartData> {
    const cart = await this.getSessionCart(sessionToken);

    // Validate item belongs to this cart
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    // Update item quantity
    const updatedCart = await this.cartService.updateItem(cart.id, itemId, {
      quantity,
    });

    // Track cart update event
    await this.sessionService.trackEvent(sessionToken, {
      eventType: 'UPDATE_CART_ITEM',
      eventData: { itemId, quantity, productId: item.productId },
    });

    return updatedCart;
  }

  /**
   * Remove item from cart
   *
   * @param sessionToken - The session token
   * @param itemId - Cart item ID to remove
   * @returns Updated cart with items
   */
  async removeFromCart(
    sessionToken: string,
    itemId: string,
  ): Promise<CartData> {
    const cart = await this.getSessionCart(sessionToken);

    // Validate item belongs to this cart
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    // Remove item
    const updatedCart = await this.cartService.removeItem(cart.id, itemId);

    // Track removal event
    await this.sessionService.trackEvent(sessionToken, {
      eventType: 'REMOVE_FROM_CART',
      eventData: { itemId, productId: item.productId },
    });

    return updatedCart;
  }

  // ═══════════════════════════════════════════════════════════════
  // CONVERSION TRACKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Complete checkout and mark session as converted
   *
   * @param sessionToken - The session token
   * @param orderId - The order ID from checkout
   */
  async completeCheckout(sessionToken: string, orderId: string): Promise<void> {
    const session = await this.sessionService.getSessionByToken(sessionToken);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Mark session as converted via session service
    await this.sessionService.convertSession(sessionToken, orderId);

    // Mark cart as converted
    if (session.cartId) {
      await this.cartService.markConverted(session.cartId, orderId);
    }

    this.logger.log(`Session ${session.id} converted with order ${orderId}`);
  }

  /**
   * Abandon session (visitor left without converting)
   *
   * @param sessionToken - The session token
   */
  async abandonSession(sessionToken: string): Promise<void> {
    const session = await this.sessionService.getSessionByToken(sessionToken);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Only abandon active sessions
    if (session.status !== LandingPageSessionStatus.ACTIVE) {
      this.logger.debug(`Session ${session.id} already in ${session.status} status, skipping abandon`);
      return;
    }

    // Mark session as abandoned via session service
    await this.sessionService.abandonSession(sessionToken);

    // Mark cart as abandoned (triggers abandoned cart flow if configured)
    if (session.cartId) {
      await this.cartService.markAbandoned(session.cartId);
    }

    this.logger.log(`Session ${session.id} abandoned`);

    // TODO: Trigger abandoned cart email flow if configured
    // This could be done via events/messaging system
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get cart for session, throws if not found
   */
  private async getSessionCart(sessionToken: string): Promise<CartData> {
    const session = await this.sessionService.getSessionByToken(sessionToken);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (!session.cartId) {
      throw new NotFoundException('Session does not have a cart');
    }

    return this.cartService.getCartById(session.cartId);
  }

  /**
   * Map Prisma session to SessionResponse
   */
  private mapToSessionResponse(session: any): SessionResponse {
    return {
      id: session.id,
      sessionToken: session.sessionToken,
      landingPageId: session.landingPageId,
      status: session.status,
      visitorId: session.visitorId,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      utmSource: session.utmSource,
      utmMedium: session.utmMedium,
      utmCampaign: session.utmCampaign,
      cartId: session.cartId,
      orderId: session.orderId,
      convertedAt: session.convertedAt,
      abandonedAt: session.abandonedAt,
      startedAt: session.startedAt,
      lastActivityAt: session.lastActivityAt,
    };
  }
}
