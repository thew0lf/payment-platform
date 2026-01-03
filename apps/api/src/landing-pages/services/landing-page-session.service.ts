import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LandingPageSession, LandingPageSessionStatus, CartSourceType } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════

export interface CreateSessionDto {
  visitorId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface UpdateSessionDto {
  status?: LandingPageSessionStatus;
  visitorId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface SessionEventDto {
  eventType: string;
  eventData?: Record<string, any>;
  timestamp?: Date;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class LandingPageSessionService {
  private readonly logger = new Logger(LandingPageSessionService.name);
  private readonly IP_HASH_SALT: string;

  constructor(private readonly prisma: PrismaService) {
    // Use environment variable for salt, or generate a random one for development
    this.IP_HASH_SALT = process.env.IP_HASH_SALT || randomBytes(16).toString('hex');
    if (!process.env.IP_HASH_SALT) {
      this.logger.warn('IP_HASH_SALT not set in environment, using random salt (sessions will not be linkable across restarts)');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SESSION CRUD
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a new landing page session
   * Generates a secure session token and hashes IP for privacy
   */
  async createSession(
    landingPageId: string,
    companyId: string,
    dto: CreateSessionDto,
  ): Promise<LandingPageSession> {
    // Verify landing page exists
    const landingPage = await this.prisma.landingPage.findFirst({
      where: { id: landingPageId, companyId, deletedAt: null },
    });

    if (!landingPage) {
      throw new NotFoundException('Landing page not found');
    }

    // Generate secure session token (32 bytes = 256 bits, base64url encoded)
    const sessionToken = randomBytes(32).toString('base64url');

    // Hash IP address for privacy (SHA-256 with salt)
    const ipAddressHash = dto.ipAddress
      ? this.hashIpAddress(dto.ipAddress)
      : null;

    // Detect device info from user agent
    const deviceInfo = dto.userAgent
      ? this.parseUserAgent(dto.userAgent)
      : { deviceType: null, browser: null, os: null };

    const session = await this.prisma.landingPageSession.create({
      data: {
        sessionToken,
        landingPageId,
        companyId,
        visitorId: dto.visitorId,
        ipAddressHash,
        userAgent: dto.userAgent,
        referrer: dto.referrer,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
        utmTerm: dto.utmTerm,
        utmContent: dto.utmContent,
        status: LandingPageSessionStatus.ACTIVE,
      },
    });

    this.logger.log(`Created session ${session.id} for landing page ${landingPageId}`);
    return session;
  }

  /**
   * Get session by token
   * Includes landing page and cart relations
   */
  async getSessionByToken(sessionToken: string): Promise<LandingPageSession | null> {
    return this.prisma.landingPageSession.findUnique({
      where: { sessionToken },
      include: {
        landingPage: true,
        cart: true,
      },
    });
  }

  /**
   * Update session data
   * Automatically updates lastActivityAt
   */
  async updateSession(
    sessionToken: string,
    dto: UpdateSessionDto,
  ): Promise<LandingPageSession> {
    const session = await this.prisma.landingPageSession.findUnique({
      where: { sessionToken },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.landingPageSession.update({
      where: { sessionToken },
      data: {
        ...dto,
        lastActivityAt: new Date(),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CART INTEGRATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Link a cart to this session
   * Also updates the cart with landing page attribution
   */
  async linkCart(sessionToken: string, cartId: string): Promise<LandingPageSession> {
    const session = await this.prisma.landingPageSession.findUnique({
      where: { sessionToken },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Update cart with landing page attribution
    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        landingPageId: session.landingPageId,
        sourceType: CartSourceType.LANDING_PAGE,
        utmSource: session.utmSource,
        utmMedium: session.utmMedium,
        utmCampaign: session.utmCampaign,
      },
    });

    // Link cart to session
    const updatedSession = await this.prisma.landingPageSession.update({
      where: { sessionToken },
      data: {
        cartId,
        lastActivityAt: new Date(),
      },
      include: {
        landingPage: true,
        cart: true,
      },
    });

    this.logger.log(`Linked cart ${cartId} to session ${session.id}`);
    return updatedSession;
  }

  // ═══════════════════════════════════════════════════════════════
  // CONVERSION TRACKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Mark session as converted
   * Sets status to CONVERTED, records timestamp and order ID
   */
  async convertSession(
    sessionToken: string,
    orderId: string,
  ): Promise<LandingPageSession> {
    const session = await this.prisma.landingPageSession.findUnique({
      where: { sessionToken },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const updatedSession = await this.prisma.landingPageSession.update({
      where: { sessionToken },
      data: {
        status: LandingPageSessionStatus.CONVERTED,
        convertedAt: new Date(),
        orderId,
        lastActivityAt: new Date(),
      },
      include: {
        landingPage: true,
        cart: true,
      },
    });

    this.logger.log(`Session ${session.id} converted with order ${orderId}`);
    return updatedSession;
  }

  /**
   * Mark session as abandoned
   * Sets status to ABANDONED and records timestamp
   */
  async abandonSession(sessionToken: string): Promise<LandingPageSession> {
    const session = await this.prisma.landingPageSession.findUnique({
      where: { sessionToken },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const updatedSession = await this.prisma.landingPageSession.update({
      where: { sessionToken },
      data: {
        status: LandingPageSessionStatus.ABANDONED,
        abandonedAt: new Date(),
        lastActivityAt: new Date(),
      },
      include: {
        landingPage: true,
        cart: true,
      },
    });

    this.logger.log(`Session ${session.id} marked as abandoned`);
    return updatedSession;
  }

  // ═══════════════════════════════════════════════════════════════
  // EVENT TRACKING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Track a session event
   * Updates lastActivityAt and can be extended to store events in a separate table
   */
  async trackEvent(
    sessionToken: string,
    event: SessionEventDto,
  ): Promise<void> {
    const session = await this.prisma.landingPageSession.findUnique({
      where: { sessionToken },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Update last activity timestamp
    await this.prisma.landingPageSession.update({
      where: { sessionToken },
      data: {
        lastActivityAt: new Date(),
      },
    });

    // Log event for analytics (can be extended to store in separate table)
    this.logger.debug(
      `Event tracked for session ${session.id}: ${event.eventType}`,
      event.eventData,
    );

    // Future: Store events in a dedicated analytics table
    // await this.prisma.sessionEvent.create({
    //   data: {
    //     sessionId: session.id,
    //     eventType: event.eventType,
    //     eventData: event.eventData,
    //     occurredAt: event.timestamp || new Date(),
    //   },
    // });
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Hash IP address for privacy using SHA-256 with salt
   * This allows linking sessions from the same IP without storing the actual IP
   */
  private hashIpAddress(ip: string): string {
    return createHash('sha256')
      .update(this.IP_HASH_SALT + ip)
      .digest('hex');
  }

  /**
   * Parse user agent string to extract device info
   * Uses regex patterns for common browsers, OS, and devices
   */
  private parseUserAgent(userAgent: string): {
    deviceType: string | null;
    browser: string | null;
    os: string | null;
  } {
    const ua = userAgent.toLowerCase();

    // Detect device type
    let deviceType: string | null = null;
    if (/mobile|android.*mobile|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      deviceType = 'mobile';
    } else if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) {
      deviceType = 'tablet';
    } else {
      deviceType = 'desktop';
    }

    // Detect browser
    let browser: string | null = null;
    if (/edg\//i.test(userAgent)) {
      browser = 'Edge';
    } else if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) {
      browser = 'Chrome';
    } else if (/firefox|fxios/i.test(ua)) {
      browser = 'Firefox';
    } else if (/safari/i.test(ua) && !/chrome|chromium|crios/i.test(ua)) {
      browser = 'Safari';
    } else if (/opr|opera/i.test(ua)) {
      browser = 'Opera';
    } else if (/msie|trident/i.test(ua)) {
      browser = 'Internet Explorer';
    }

    // Detect OS
    let os: string | null = null;
    if (/windows/i.test(ua)) {
      os = 'Windows';
    } else if (/macintosh|mac os x/i.test(ua)) {
      os = 'macOS';
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      os = 'iOS';
    } else if (/android/i.test(ua)) {
      os = 'Android';
    } else if (/linux/i.test(ua)) {
      os = 'Linux';
    }

    return { deviceType, browser, os };
  }
}
