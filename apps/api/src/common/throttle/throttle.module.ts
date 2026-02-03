import { Module, Global } from '@nestjs/common';
import { IpThrottleService } from './ip-throttle.service';
import { IpThrottleGuard } from './ip-throttle.guard';

/**
 * IP-Based Rate Limiting Module
 *
 * Provides Redis-backed rate limiting with:
 * - Multiple tier support (public, auth, payment, admin, api)
 * - Automatic IP blocking for repeated violations
 * - SOC2 CC7.2 compliant audit logging
 * - Graceful fallback when Redis unavailable
 *
 * Usage:
 * 1. Import ThrottleModule in your module
 * 2. Apply @UseGuards(IpThrottleGuard) to controllers
 * 3. Configure limits with @IpThrottle({ tier: RateLimitTier.AUTH })
 *
 * Default limits:
 * - PUBLIC: 100 req/min
 * - AUTH: 10 req/min (5-min block on violation)
 * - PAYMENT: 20 req/min (1-min block on violation)
 * - ADMIN: 200 req/min
 * - API: 60 req/min
 */
@Global()
@Module({
  providers: [IpThrottleService, IpThrottleGuard],
  exports: [IpThrottleService, IpThrottleGuard],
})
export class ThrottleModule {}
