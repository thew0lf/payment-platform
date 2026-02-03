import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { IpThrottleService } from './ip-throttle.service';
import {
  IP_THROTTLE_METADATA_KEY,
  SKIP_IP_THROTTLE_METADATA_KEY,
} from './ip-throttle.decorator';
import {
  RateLimitConfig,
  RateLimitTier,
  RATE_LIMIT_CONFIGS,
} from './ip-throttle.types';

/**
 * IP-Based Rate Limiting Guard
 *
 * Features:
 * - Extracts client IP from request (supports proxies via X-Forwarded-For)
 * - Uses tier-based rate limits (public, auth, payment, admin, api)
 * - Adds rate limit headers to responses
 * - Logs violations to audit trail
 *
 * Usage:
 * 1. Add to controller/route with @UseGuards(IpThrottleGuard)
 * 2. Configure limits with @IpThrottle({ tier: RateLimitTier.AUTH })
 * 3. Skip with @SkipIpThrottle() for health checks etc.
 */
@Injectable()
export class IpThrottleGuard implements CanActivate {
  private readonly logger = new Logger(IpThrottleGuard.name);

  constructor(
    private readonly throttleService: IpThrottleService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if throttling should be skipped
    const skipThrottle = this.reflector.getAllAndOverride<boolean>(
      SKIP_IP_THROTTLE_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipThrottle) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Get rate limit config from decorator or use default
    const config = this.getConfig(context);

    // Extract client IP
    const clientIp = this.extractClientIp(request);

    // Check rate limit
    const result = await this.throttleService.checkRateLimit(clientIp, config, {
      path: request.path,
      method: request.method,
      userAgent: request.headers['user-agent'],
    });

    // Add rate limit headers to response
    const headers = this.throttleService.getRateLimitHeaders(result, config);
    Object.entries(headers).forEach(([key, value]) => {
      response.setHeader(key, value);
    });

    if (!result.allowed) {
      const message = result.blocked
        ? `Too many requests. Your IP has been temporarily blocked. Try again in ${result.retryAfter} seconds.`
        : `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`;

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message,
          retryAfter: result.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Get rate limit config from metadata or determine from route
   */
  private getConfig(context: ExecutionContext): RateLimitConfig {
    // Check for explicit decorator
    const decoratorConfig = this.reflector.getAllAndOverride<RateLimitConfig>(
      IP_THROTTLE_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (decoratorConfig) {
      return decoratorConfig;
    }

    // Auto-detect tier from route
    const request = context.switchToHttp().getRequest<Request>();
    const tier = this.detectTierFromRoute(request.path);
    return RATE_LIMIT_CONFIGS[tier];
  }

  /**
   * Detect appropriate rate limit tier from route path
   */
  private detectTierFromRoute(path: string): RateLimitTier {
    const lowerPath = path.toLowerCase();

    // Auth endpoints - strictest limits
    if (
      lowerPath.includes('/auth/login') ||
      lowerPath.includes('/auth/forgot-password') ||
      lowerPath.includes('/auth/reset-password') ||
      lowerPath.includes('/auth/register') ||
      lowerPath.includes('/auth/verify')
    ) {
      return RateLimitTier.AUTH;
    }

    // Payment endpoints - strict limits
    if (
      lowerPath.includes('/payments') ||
      lowerPath.includes('/checkout') ||
      lowerPath.includes('/charge') ||
      lowerPath.includes('/refund') ||
      lowerPath.includes('/card-vault')
    ) {
      return RateLimitTier.PAYMENT;
    }

    // Admin endpoints - higher limits for admin work
    if (lowerPath.includes('/admin/') || lowerPath.includes('/settings/')) {
      return RateLimitTier.ADMIN;
    }

    // API endpoints (authenticated)
    if (lowerPath.startsWith('/api/')) {
      return RateLimitTier.API;
    }

    // Default to public limits
    return RateLimitTier.PUBLIC;
  }

  /**
   * Extract client IP from request, handling proxies
   */
  private extractClientIp(request: Request): string {
    // Check X-Forwarded-For header (set by reverse proxies)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2, ...
      // The first IP is the original client
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    // Check X-Real-IP header (set by nginx)
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Check CF-Connecting-IP (Cloudflare)
    const cfIp = request.headers['cf-connecting-ip'];
    if (cfIp) {
      return Array.isArray(cfIp) ? cfIp[0] : cfIp;
    }

    // Fallback to connection remote address
    const remoteAddress = request.socket?.remoteAddress || request.ip || '0.0.0.0';

    // Handle IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)
    if (remoteAddress.startsWith('::ffff:')) {
      return remoteAddress.substring(7);
    }

    return remoteAddress;
  }
}
