/**
 * IP-Based Rate Limiting Types
 * SOC2 CC7.2 Compliance - Rate limit detection and anomaly logging
 */

/**
 * Rate limit tiers for different endpoint categories
 */
export enum RateLimitTier {
  PUBLIC = 'public',
  AUTH = 'auth',
  PAYMENT = 'payment',
  ADMIN = 'admin',
  API = 'api',
}

/**
 * Rate limit configuration for each tier
 */
export interface RateLimitConfig {
  tier: RateLimitTier;
  limit: number; // Number of requests
  window: number; // Time window in seconds
  blockDuration?: number; // Optional block duration in seconds after limit exceeded
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMIT_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  [RateLimitTier.PUBLIC]: {
    tier: RateLimitTier.PUBLIC,
    limit: 100,
    window: 60, // 100 requests per minute
  },
  [RateLimitTier.AUTH]: {
    tier: RateLimitTier.AUTH,
    limit: 10,
    window: 60, // 10 requests per minute (brute force protection)
    blockDuration: 300, // 5 minute block after limit exceeded
  },
  [RateLimitTier.PAYMENT]: {
    tier: RateLimitTier.PAYMENT,
    limit: 20,
    window: 60, // 20 requests per minute
    blockDuration: 60, // 1 minute block after limit exceeded
  },
  [RateLimitTier.ADMIN]: {
    tier: RateLimitTier.ADMIN,
    limit: 200,
    window: 60, // 200 requests per minute for admin operations
  },
  [RateLimitTier.API]: {
    tier: RateLimitTier.API,
    limit: 60,
    window: 60, // 60 requests per minute for general API
  },
};

/**
 * Rate limit state stored in Redis
 */
export interface RateLimitState {
  count: number;
  firstRequestAt: number; // Unix timestamp in ms
  blockedUntil?: number; // Unix timestamp in ms if blocked
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp in ms
  retryAfter?: number; // Seconds until retry allowed
  blocked?: boolean;
}

/**
 * Rate limit violation event for audit logging
 */
export interface RateLimitViolation {
  ip: string;
  tier: RateLimitTier;
  path: string;
  method: string;
  currentCount: number;
  limit: number;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Redis key prefix for rate limiting
 */
export const REDIS_RATE_LIMIT_PREFIX = 'rate_limit:ip:';

/**
 * Redis key for blocked IPs
 */
export const REDIS_BLOCKED_IP_PREFIX = 'rate_limit:blocked:';
