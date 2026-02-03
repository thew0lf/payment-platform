/**
 * Affiliate Public Controller
 *
 * Public endpoints for affiliate click tracking and redirect.
 * No authentication required.
 *
 * Features:
 * - Click redirect with tracking (/go/:linkCode)
 * - SubID pass-through (t1-t5 + custom)
 * - Macro expansion ({CLICK_ID}, {TIMESTAMP}, etc.)
 * - Cookie-based attribution tracking
 * - Tracking pixel for impressions
 * - Rate limiting for fraud prevention
 * - Redis-cached link lookups
 */

import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  Headers,
  HttpStatus,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ClickQueueService, RawClickData } from '../services/click-queue.service';
import { randomBytes, createHash } from 'crypto';
import { LRUCache } from 'lru-cache';

// 1x1 transparent GIF for tracking pixel
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

// Supported macro tokens
const MACROS = {
  CLICK_ID: '{CLICK_ID}',
  TIMESTAMP: '{TIMESTAMP}',
  RANDOM: '{RANDOM}',
  DATE: '{DATE}',
  SOURCE: '{SOURCE}',
  T1: '{T1}',
  T2: '{T2}',
  T3: '{T3}',
  T4: '{T4}',
  T5: '{T5}',
} as const;

interface SubIdParams {
  t1?: string;
  t2?: string;
  t3?: string;
  t4?: string;
  t5?: string;
  // Custom overflow params stored in JSON
  custom?: Record<string, string>;
}

interface LinkCacheEntry {
  link: any;
  cachedAt: number;
}

@Controller()
export class AffiliatePublicController {
  private readonly logger = new Logger(AffiliatePublicController.name);

  // LRU cache for link lookups (Redis should be used in production for distributed caching)
  private readonly linkCache: LRUCache<string, LinkCacheEntry>;
  private readonly LINK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly LINK_CACHE_MAX_SIZE = 5000; // Max links to cache

  // LRU cache for company config (fallback URLs)
  private readonly companyConfigCache: LRUCache<string, { fallbackUrl: string | null; cachedAt: number }>;
  private readonly COMPANY_CONFIG_CACHE_MAX_SIZE = 1000;

  // LRU cache for rate limiting per IP (prevents memory DoS)
  private readonly rateLimitCache: LRUCache<string, { count: number; resetAt: number }>;
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  private readonly RATE_LIMIT_MAX_CLICKS = 30; // Max 30 clicks per minute per IP
  private readonly RATE_LIMIT_MAX_ENTRIES = 10000; // Max IPs to track (memory bound)

  // Global fallback URL when no company-specific fallback is configured
  private readonly GLOBAL_FALLBACK_URL = process.env.AFFILIATE_FALLBACK_URL || '/';

  // Cookie configuration
  private readonly COOKIE_NAME = '__aff_click';
  private readonly DEFAULT_COOKIE_EXPIRY_DAYS = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly clickQueueService: ClickQueueService,
  ) {
    // Initialize LRU caches
    this.linkCache = new LRUCache<string, LinkCacheEntry>({
      max: this.LINK_CACHE_MAX_SIZE,
      ttl: this.LINK_CACHE_TTL_MS,
    });

    this.companyConfigCache = new LRUCache<string, { fallbackUrl: string | null; cachedAt: number }>({
      max: this.COMPANY_CONFIG_CACHE_MAX_SIZE,
      ttl: this.LINK_CACHE_TTL_MS, // Same TTL as link cache
    });

    this.rateLimitCache = new LRUCache<string, { count: number; resetAt: number }>({
      max: this.RATE_LIMIT_MAX_ENTRIES,
      ttl: this.RATE_LIMIT_WINDOW_MS,
    });
  }

  /**
   * Click redirect endpoint - GET /go/:linkCode
   *
   * Tracks click and redirects to destination URL.
   * Supports SubID pass-through and macro expansion.
   *
   * Query params:
   * - t1, t2, t3, t4, t5: SubID values
   * - Any custom params are stored in overflow
   *
   * Headers used:
   * - User-Agent: Device/browser detection
   * - Referer: Traffic source
   * - X-Forwarded-For: Real IP behind proxy
   */
  @Get('go/:linkCode')
  async redirectClick(
    @Param('linkCode') linkCode: string,
    @Query() query: Record<string, string>,
    @Req() req: Request,
    @Res() res: Response,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referer?: string,
  ) {
    const startTime = Date.now();

    try {
      // Extract client IP
      const ipAddress = this.getClientIp(req);

      // Rate limiting check
      if (this.isRateLimited(ipAddress)) {
        this.logger.warn(`Rate limited click from IP: ${this.hashIp(ipAddress)}`);
        return res.redirect(HttpStatus.FOUND, this.GLOBAL_FALLBACK_URL);
      }

      // Lookup link (with caching)
      const link = await this.findLinkByCode(linkCode);

      if (!link) {
        this.logger.warn(`Link not found: ${linkCode}`);
        return res.redirect(HttpStatus.FOUND, this.GLOBAL_FALLBACK_URL);
      }

      // Get fallback URL hierarchy: link-specific -> company-configured -> global
      const fallbackUrl = await this.getFallbackUrl(link);

      // Validate link is active
      if (!link.isActive) {
        this.logger.debug(`Link inactive: ${linkCode}`);
        return res.redirect(HttpStatus.FOUND, fallbackUrl);
      }

      // Check if link has expired
      if (link.expiresAt && new Date() > link.expiresAt) {
        this.logger.debug(`Link expired: ${linkCode}`);
        return res.redirect(HttpStatus.FOUND, fallbackUrl);
      }

      // Check if partner is active
      if (link.partner?.status !== 'ACTIVE') {
        this.logger.debug(`Partner inactive for link: ${linkCode}`);
        return res.redirect(HttpStatus.FOUND, fallbackUrl);
      }

      // Check max clicks limit
      if (link.maxClicks && link.totalClicks >= link.maxClicks) {
        this.logger.debug(`Max clicks reached for link: ${linkCode}`);
        return res.redirect(HttpStatus.FOUND, fallbackUrl);
      }

      // Extract SubIDs from query params
      const subIds = this.extractSubIds(query);

      // Generate unique click ID
      const clickId = this.generateClickId();

      // Generate fingerprint for deduplication
      const fingerprint = this.generateFingerprint(ipAddress, userAgent, linkCode);

      // Capture tracking data
      const clickData: RawClickData = {
        partnerId: link.partnerId,
        linkId: link.id,
        companyId: link.companyId,
        ipAddress,
        userAgent,
        referrer: referer,
        subId1: subIds.t1 || link.subId1,
        subId2: subIds.t2 || link.subId2,
        subId3: subIds.t3 || link.subId3,
        subId4: subIds.t4 || link.subId4,
        subId5: subIds.t5 || link.subId5,
        customParams: subIds.custom, // Store overflow params
        timestamp: new Date(),
      };

      // Queue click for async processing (fast return)
      const queueResult = await this.clickQueueService.ingestClick(clickData);

      // Build redirect URL with macro expansion
      const redirectUrl = this.buildRedirectUrl(link.destinationUrl, {
        clickId: queueResult.idempotencyKey,
        subIds,
        source: this.extractSourceDomain(referer),
      });

      // Set affiliate cookie for attribution
      const cookieExpiry = (link.partner?.cookieDurationDays || this.DEFAULT_COOKIE_EXPIRY_DAYS) * 24 * 60 * 60 * 1000;
      res.cookie(this.COOKIE_NAME, queueResult.idempotencyKey, {
        maxAge: cookieExpiry,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      // Log performance
      const elapsed = Date.now() - startTime;
      if (elapsed > 50) {
        this.logger.warn(`Slow click redirect: ${elapsed}ms for ${linkCode}`);
      }

      // 302 redirect to destination
      return res.redirect(HttpStatus.FOUND, redirectUrl);
    } catch (error) {
      this.logger.error(`Click redirect error for ${linkCode}: ${error.message}`);
      return res.redirect(HttpStatus.FOUND, this.GLOBAL_FALLBACK_URL);
    }
  }

  /**
   * Get fallback URL with priority: link-specific -> company-configured -> global
   */
  private async getFallbackUrl(link: any): Promise<string> {
    // Priority 1: Link-specific fallback URL
    if (link.fallbackUrl) {
      return link.fallbackUrl;
    }

    // Priority 2: Company-configured fallback URL
    const companyFallback = await this.getCompanyFallbackUrl(link.companyId);
    if (companyFallback) {
      return companyFallback;
    }

    // Priority 3: Global fallback URL from environment
    return this.GLOBAL_FALLBACK_URL;
  }

  /**
   * Get company-level fallback URL with LRU caching
   */
  private async getCompanyFallbackUrl(companyId: string): Promise<string | null> {
    // Check cache first
    const cached = this.companyConfigCache.get(companyId);
    if (cached) {
      return cached.fallbackUrl;
    }

    // Query database for company affiliate config
    const config = await this.prisma.affiliateProgramConfig.findUnique({
      where: { companyId },
      select: { defaultFallbackUrl: true },
    });

    // Cache result (even null to prevent repeated DB hits)
    const fallbackUrl = config?.defaultFallbackUrl || null;
    this.companyConfigCache.set(companyId, { fallbackUrl, cachedAt: Date.now() });

    return fallbackUrl;
  }

  /**
   * Tracking pixel endpoint - GET /api/affiliates/public/pixel/:linkCode
   *
   * Returns a 1x1 transparent GIF and records an impression.
   * Used for email tracking, banner views, etc.
   *
   * Query params:
   * - cb: Cache buster (ignored, just for unique URLs)
   * - t1-t5: SubID values
   */
  @Get('affiliates/public/pixel/:linkCode')
  @HttpCode(HttpStatus.OK)
  async trackingPixel(
    @Param('linkCode') linkCode: string,
    @Query() query: Record<string, string>,
    @Req() req: Request,
    @Res() res: Response,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referer?: string,
  ) {
    try {
      const ipAddress = this.getClientIp(req);

      // Lookup link
      const link = await this.findLinkByCode(linkCode);

      if (link && link.isActive && link.partner?.status === 'ACTIVE') {
        // Extract SubIDs
        const subIds = this.extractSubIds(query);

        // Queue impression (separate from click)
        const impressionData: RawClickData = {
          partnerId: link.partnerId,
          linkId: link.id,
          companyId: link.companyId,
          ipAddress,
          userAgent,
          referrer: referer,
          subId1: subIds.t1 || link.subId1,
          subId2: subIds.t2 || link.subId2,
          subId3: subIds.t3 || link.subId3,
          subId4: subIds.t4 || link.subId4,
          subId5: subIds.t5 || link.subId5,
          timestamp: new Date(),
        };

        // Fire and forget - don't wait
        this.clickQueueService.ingestClick(impressionData).catch((err) => {
          this.logger.debug(`Impression tracking failed: ${err.message}`);
        });
      }
    } catch (error) {
      this.logger.debug(`Pixel tracking error: ${error.message}`);
    }

    // Always return the GIF regardless of errors
    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': TRANSPARENT_GIF_BUFFER.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    return res.send(TRANSPARENT_GIF_BUFFER);
  }

  /**
   * Health check for click tracking system
   */
  @Get('affiliates/public/health')
  async healthCheck() {
    const stats = await this.clickQueueService.getStats();
    return {
      status: 'ok',
      queue: {
        size: stats.queueSize,
        processed: stats.processedCount,
        duplicates: stats.duplicateCount,
        errors: stats.errorCount,
        pendingInDb: stats.pendingInDb,
        failedInDb: stats.failedInDb,
      },
      cache: {
        linksCached: this.linkCache.size,
        rateLimitEntries: this.rateLimitCache.size,
      },
    };
  }

  /**
   * Find link by short code or tracking code with LRU caching
   */
  private async findLinkByCode(code: string): Promise<any | null> {
    // Check LRU cache first (TTL handled automatically)
    const cached = this.linkCache.get(code);
    if (cached) {
      return cached.link;
    }

    // Query database
    const link = await this.prisma.affiliateLink.findFirst({
      where: {
        OR: [
          { shortCode: code },
          { trackingCode: code },
        ],
        deletedAt: null,
      },
      include: {
        partner: {
          select: {
            id: true,
            status: true,
            companyId: true,
            cookieDurationDays: true,
          },
        },
      },
    });

    // Cache result (even null to prevent repeated DB hits)
    // LRU cache handles TTL and eviction automatically
    this.linkCache.set(code, { link, cachedAt: Date.now() });

    return link;
  }

  /**
   * Extract SubIDs from query parameters
   */
  private extractSubIds(query: Record<string, string>): SubIdParams {
    const subIds: SubIdParams = {
      t1: query.t1 || query.sub1 || query.subid1 || query.subId1,
      t2: query.t2 || query.sub2 || query.subid2 || query.subId2,
      t3: query.t3 || query.sub3 || query.subid3 || query.subId3,
      t4: query.t4 || query.sub4 || query.subid4 || query.subId4,
      t5: query.t5 || query.sub5 || query.subid5 || query.subId5,
    };

    // Collect any additional custom params (overflow)
    const custom: Record<string, string> = {};
    const knownKeys = ['t1', 't2', 't3', 't4', 't5', 'sub1', 'sub2', 'sub3', 'sub4', 'sub5',
      'subid1', 'subid2', 'subid3', 'subid4', 'subid5', 'subId1', 'subId2', 'subId3', 'subId4', 'subId5',
      'cb', 'sid', 'session'];

    for (const [key, value] of Object.entries(query)) {
      if (!knownKeys.includes(key) && value) {
        custom[key] = value;
      }
    }

    if (Object.keys(custom).length > 0) {
      subIds.custom = custom;
    }

    return subIds;
  }

  /**
   * Build redirect URL with macro expansion
   * SECURITY: Validates URL scheme to prevent open redirects
   */
  private buildRedirectUrl(
    baseUrl: string,
    context: {
      clickId: string;
      subIds: SubIdParams;
      source?: string;
    },
  ): string {
    let url = baseUrl;

    // Expand macros
    const now = new Date();
    const macroValues: Record<string, string> = {
      [MACROS.CLICK_ID]: context.clickId,
      [MACROS.TIMESTAMP]: Math.floor(now.getTime() / 1000).toString(),
      [MACROS.RANDOM]: this.generateRandomString(8),
      [MACROS.DATE]: now.toISOString().split('T')[0],
      [MACROS.SOURCE]: context.source || 'direct',
      [MACROS.T1]: context.subIds.t1 || '',
      [MACROS.T2]: context.subIds.t2 || '',
      [MACROS.T3]: context.subIds.t3 || '',
      [MACROS.T4]: context.subIds.t4 || '',
      [MACROS.T5]: context.subIds.t5 || '',
    };

    for (const [macro, value] of Object.entries(macroValues)) {
      url = url.replace(new RegExp(this.escapeRegExp(macro), 'g'), encodeURIComponent(value));
    }

    // Append affiliate tracking params to URL
    try {
      const urlObj = new URL(url);

      // SECURITY: Validate URL scheme to prevent open redirect attacks
      // Only allow http and https schemes
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        this.logger.warn(`Invalid URL scheme blocked: ${urlObj.protocol} in ${url.substring(0, 50)}`);
        return this.GLOBAL_FALLBACK_URL;
      }

      urlObj.searchParams.set('aff_click', context.clickId);
      if (context.subIds.t1) urlObj.searchParams.set('sub1', context.subIds.t1);
      if (context.subIds.t2) urlObj.searchParams.set('sub2', context.subIds.t2);
      return urlObj.toString();
    } catch {
      // SECURITY: If URL parsing fails, don't allow arbitrary redirects
      // Log the issue and return fallback URL
      this.logger.warn(`Invalid URL format blocked: ${url.substring(0, 50)}`);
      return this.GLOBAL_FALLBACK_URL;
    }
  }

  /**
   * Generate unique click ID
   */
  private generateClickId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(6).toString('base64url');
    return `clk_${timestamp}${random}`;
  }

  /**
   * Generate fingerprint for deduplication
   */
  private generateFingerprint(ipAddress: string, userAgent?: string, linkCode?: string): string {
    const data = `${ipAddress}:${userAgent || ''}:${linkCode || ''}`;
    return createHash('sha256').update(data).digest('hex').slice(0, 16);
  }

  /**
   * Generate random alphanumeric string
   */
  private generateRandomString(length: number): string {
    return randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  /**
   * Extract source domain from referer
   */
  private extractSourceDomain(referer?: string): string {
    if (!referer) return 'direct';

    try {
      const url = new URL(referer);
      return url.hostname.replace(/^www\./, '');
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(req: Request): string {
    // Check for forwarded IP (behind proxy/load balancer)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ips.trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // CF-Connecting-IP for Cloudflare
    const cfIp = req.headers['cf-connecting-ip'];
    if (cfIp) {
      return Array.isArray(cfIp) ? cfIp[0] : cfIp;
    }

    return req.ip || req.socket?.remoteAddress || '0.0.0.0';
  }

  /**
   * Hash IP for logging (privacy)
   */
  private hashIp(ip: string): string {
    return createHash('sha256').update(ip).digest('hex').slice(0, 8);
  }

  /**
   * Check if IP is rate limited
   * Uses LRU cache with TTL for automatic memory management
   */
  private isRateLimited(ipAddress: string): boolean {
    const now = Date.now();
    const ipHash = this.hashIp(ipAddress);
    const entry = this.rateLimitCache.get(ipHash);

    if (!entry || now > entry.resetAt) {
      // New window - LRU cache handles eviction automatically
      this.rateLimitCache.set(ipHash, {
        count: 1,
        resetAt: now + this.RATE_LIMIT_WINDOW_MS,
      });
      return false;
    }

    // Increment count (need to re-set to update TTL)
    entry.count++;
    this.rateLimitCache.set(ipHash, entry);
    return entry.count > this.RATE_LIMIT_MAX_CLICKS;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

}
