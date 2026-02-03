import { SetMetadata, applyDecorators } from '@nestjs/common';
import { RateLimitTier, RateLimitConfig, RATE_LIMIT_CONFIGS } from './ip-throttle.types';

/**
 * Metadata key for IP throttle configuration
 */
export const IP_THROTTLE_METADATA_KEY = 'ip-throttle:config';

/**
 * Decorator options for custom rate limits
 */
export interface IpThrottleOptions {
  tier?: RateLimitTier;
  limit?: number;
  window?: number;
  blockDuration?: number;
}

/**
 * Apply IP-based rate limiting to a controller or route handler
 *
 * Usage:
 * @IpThrottle() - Uses PUBLIC tier defaults
 * @IpThrottle({ tier: RateLimitTier.AUTH }) - Uses AUTH tier defaults
 * @IpThrottle({ limit: 5, window: 60 }) - Custom: 5 requests per minute
 * @IpThrottle({ tier: RateLimitTier.PAYMENT, limit: 10 }) - Override PAYMENT tier limit
 */
export function IpThrottle(options?: IpThrottleOptions): MethodDecorator & ClassDecorator {
  const tier = options?.tier ?? RateLimitTier.PUBLIC;
  const defaultConfig = RATE_LIMIT_CONFIGS[tier];

  const config: RateLimitConfig = {
    tier,
    limit: options?.limit ?? defaultConfig.limit,
    window: options?.window ?? defaultConfig.window,
    blockDuration: options?.blockDuration ?? defaultConfig.blockDuration,
  };

  return applyDecorators(SetMetadata(IP_THROTTLE_METADATA_KEY, config));
}

/**
 * Skip IP throttling for a specific route
 * Useful for health checks, metrics endpoints, etc.
 */
export const SKIP_IP_THROTTLE_METADATA_KEY = 'ip-throttle:skip';

export function SkipIpThrottle(): MethodDecorator {
  return SetMetadata(SKIP_IP_THROTTLE_METADATA_KEY, true);
}

/**
 * Preset decorators for common use cases
 */

/**
 * Public endpoint rate limiting: 100 req/min
 */
export function PublicRateLimit(): MethodDecorator & ClassDecorator {
  return IpThrottle({ tier: RateLimitTier.PUBLIC });
}

/**
 * Auth endpoint rate limiting: 10 req/min with 5-minute block
 */
export function AuthRateLimit(): MethodDecorator & ClassDecorator {
  return IpThrottle({ tier: RateLimitTier.AUTH });
}

/**
 * Payment endpoint rate limiting: 20 req/min with 1-minute block
 */
export function PaymentRateLimit(): MethodDecorator & ClassDecorator {
  return IpThrottle({ tier: RateLimitTier.PAYMENT });
}

/**
 * Admin endpoint rate limiting: 200 req/min
 */
export function AdminRateLimit(): MethodDecorator & ClassDecorator {
  return IpThrottle({ tier: RateLimitTier.ADMIN });
}

/**
 * API endpoint rate limiting: 60 req/min
 */
export function ApiRateLimit(): MethodDecorator & ClassDecorator {
  return IpThrottle({ tier: RateLimitTier.API });
}
