import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  NotFoundException,
  Logger,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/services/cart.service';
import { LandingPagesService } from './services/landing-pages.service';
import { LandingPageSessionService, CreateSessionDto, UpdateSessionDto, SessionEventDto } from './services/landing-page-session.service';
import { LandingPageStatus, LandingPageSessionStatus, CartSourceType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

export interface SessionResponse {
  sessionToken: string;
  landingPageId: string;
  visitorId?: string;
  status: LandingPageSessionStatus;
  cartId?: string;
  startedAt: Date;
  lastActivityAt: Date;
}

export interface PublicLandingPageResponse {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  theme: string;
  colorScheme: any;
  typography: any;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  favicon?: string;
  customCss?: string;
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  sections: Array<{
    id: string;
    type: string;
    name?: string;
    order: number;
    content: any;
    styles?: any;
    hideOnMobile: boolean;
    hideOnDesktop: boolean;
  }>;
  company: {
    id: string;
    name: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC LANDING PAGE CONTROLLER
// No authentication required - for landing page visitors
// ═══════════════════════════════════════════════════════════════

@ApiTags('Public Landing Pages')
@Controller('lp')
export class LandingPagePublicController {
  private readonly logger = new Logger(LandingPagePublicController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly landingPagesService: LandingPagesService,
    private readonly sessionService: LandingPageSessionService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC PAGE ACCESS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get published landing page by SEO slug
   * CDN-cacheable endpoint for high-traffic landing pages
   */
  @Get(':slug')
  @ApiOperation({ summary: 'Get published landing page by SEO slug' })
  @ApiResponse({ status: 200, description: 'Landing page data returned' })
  @ApiResponse({ status: 404, description: 'Landing page not found or not published' })
  @Header('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400')
  @Header('Vary', 'Accept-Encoding')
  async getBySlug(@Param('slug') slug: string): Promise<PublicLandingPageResponse> {
    const page = await this.prisma.landingPage.findFirst({
      where: {
        slug,
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

    if (!page) {
      throw new NotFoundException('Landing page not found');
    }

    // Increment page views (fire and forget)
    this.prisma.landingPage
      .update({
        where: { id: page.id },
        data: { totalPageViews: { increment: 1 } },
      })
      .catch(err => this.logger.warn(`Failed to increment page views: ${err.message}`));

    return {
      id: page.id,
      companyId: page.companyId,
      name: page.name,
      slug: page.slug,
      theme: page.theme,
      colorScheme: page.colorScheme,
      typography: page.typography,
      metaTitle: page.metaTitle || undefined,
      metaDescription: page.metaDescription || undefined,
      ogImage: page.ogImage || undefined,
      favicon: page.favicon || undefined,
      customCss: page.customCss || undefined,
      googleAnalyticsId: page.googleAnalyticsId || undefined,
      facebookPixelId: page.facebookPixelId || undefined,
      sections: page.sections.map(section => ({
        id: section.id,
        type: section.type,
        name: section.name || undefined,
        order: section.order,
        content: section.content,
        styles: section.styles || undefined,
        hideOnMobile: section.hideOnMobile,
        hideOnDesktop: section.hideOnDesktop,
      })),
      company: page.company,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Start a new visitor session for a landing page
   * Rate limited to prevent session flooding
   */
  @Post(':landingPageId/sessions')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute per IP
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new visitor session' })
  @ApiHeader({ name: 'x-company-id', description: 'Company ID', required: true })
  @ApiResponse({ status: 201, description: 'Session created' })
  @ApiResponse({ status: 403, description: 'Missing required headers' })
  @ApiResponse({ status: 404, description: 'Landing page not found' })
  async createSession(
    @Param('landingPageId') landingPageId: string,
    @Headers('x-company-id') companyId: string,
    @Headers('x-forwarded-for') forwardedFor: string | undefined,
    @Headers('x-real-ip') realIp: string | undefined,
    @Body() dto: CreateSessionDto,
  ): Promise<SessionResponse> {
    if (!companyId) {
      throw new ForbiddenException('x-company-id header is required');
    }

    // Get client IP for session tracking
    const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || undefined;

    // Create session using the service
    const session = await this.sessionService.createSession(landingPageId, companyId, {
      ...dto,
      ipAddress: clientIp,
    });

    return this.toSessionResponse(session);
  }

  /**
   * Get session by token
   */
  @Get('sessions/:token')
  @ApiOperation({ summary: 'Get session by token' })
  @ApiHeader({ name: 'x-session-token', description: 'Session token for validation', required: true })
  @ApiResponse({ status: 200, description: 'Session data returned' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSession(
    @Param('token') token: string,
    @Headers('x-session-token') headerToken: string,
  ): Promise<SessionResponse> {
    this.validateSessionToken(token, headerToken);

    const session = await this.sessionService.getSessionByToken(token);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.toSessionResponse(session);
  }

  /**
   * Update session (activity tracking)
   */
  @Patch('sessions/:token')
  @ApiOperation({ summary: 'Update session activity' })
  @ApiHeader({ name: 'x-session-token', description: 'Session token for validation', required: true })
  @ApiResponse({ status: 200, description: 'Session updated' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async updateSession(
    @Param('token') token: string,
    @Headers('x-session-token') headerToken: string,
    @Body() dto: UpdateSessionDto,
  ): Promise<SessionResponse> {
    this.validateSessionToken(token, headerToken);

    const session = await this.sessionService.updateSession(token, dto);

    return this.toSessionResponse(session);
  }

  // ═══════════════════════════════════════════════════════════════
  // CART INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get or create cart for session
   * Creates a cart linked to the landing page session with proper attribution
   */
  @Post('sessions/:token/cart')
  @ApiOperation({ summary: 'Get or create cart for session' })
  @ApiHeader({ name: 'x-session-token', description: 'Session token for validation', required: true })
  @ApiResponse({ status: 200, description: 'Cart data returned' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getOrCreateCart(
    @Param('token') token: string,
    @Headers('x-session-token') headerToken: string,
  ) {
    this.validateSessionToken(token, headerToken);

    const session = await this.sessionService.getSessionByToken(token);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // If cart already linked, return it
    if (session.cartId) {
      const existingCart = await this.cartService.getCartBySessionToken(
        (session as any).cart?.sessionToken,
        session.companyId,
      );
      if (existingCart) {
        return existingCart;
      }
    }

    // Create new cart with landing page attribution
    const cart = await this.cartService.getOrCreateCart(session.companyId, {
      visitorId: session.visitorId || undefined,
      utmSource: session.utmSource || undefined,
      utmMedium: session.utmMedium || undefined,
      utmCampaign: session.utmCampaign || undefined,
    });

    // Update cart with landing page attribution
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        landingPageId: session.landingPageId,
        sourceType: CartSourceType.LANDING_PAGE,
      },
    });

    // Link cart to session
    await this.sessionService.linkCart(token, cart.id);

    return cart;
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS EVENTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Track analytics events for the session
   * Fire and forget - no response body for performance
   */
  @Post('sessions/:token/events')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Track analytics event' })
  @ApiHeader({ name: 'x-session-token', description: 'Session token for validation', required: true })
  @ApiResponse({ status: 204, description: 'Event tracked (no content)' })
  @ApiResponse({ status: 403, description: 'Session token mismatch' })
  async trackEvent(
    @Param('token') token: string,
    @Headers('x-session-token') headerToken: string,
    @Body() dto: SessionEventDto,
  ): Promise<void> {
    this.validateSessionToken(token, headerToken);

    // Fire and forget - track event using service
    this.sessionService.trackEvent(token, dto).catch(err => {
      this.logger.warn(`Failed to track event: ${err.message}`);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validate session token header matches URL param
   */
  private validateSessionToken(urlToken: string, headerToken: string | undefined): void {
    if (!headerToken) {
      throw new ForbiddenException('x-session-token header is required');
    }

    if (headerToken !== urlToken) {
      throw new ForbiddenException('Session token mismatch - access denied');
    }
  }

  /**
   * Convert Prisma session to API response
   */
  private toSessionResponse(session: any): SessionResponse {
    return {
      sessionToken: session.sessionToken,
      landingPageId: session.landingPageId,
      visitorId: session.visitorId || undefined,
      status: session.status,
      cartId: session.cartId || (session.cart?.id) || undefined,
      startedAt: session.startedAt,
      lastActivityAt: session.lastActivityAt,
    };
  }
}
