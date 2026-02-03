import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * Idempotency Service
 *
 * Provides idempotency key management for critical mutations to prevent
 * duplicate processing of requests. Uses Redis for distributed locking
 * with a configurable TTL.
 *
 * Usage:
 * 1. Extract idempotency key from request header (X-Idempotency-Key)
 * 2. Call checkAndLock() before processing
 * 3. Store result on success
 * 4. On duplicate request, return cached result
 */

export interface IdempotencyResult<T = unknown> {
  isDuplicate: boolean;
  cachedResult?: T;
  key: string;
}

export interface IdempotencyEntry {
  key: string;
  status: 'processing' | 'completed' | 'failed';
  result?: unknown;
  createdAt: Date;
  completedAt?: Date;
  hash: string; // Hash of request body for verification
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  // In-memory store for development (use Redis in production)
  private readonly store = new Map<string, IdempotencyEntry>();

  // Default TTL: 24 hours (in milliseconds)
  private readonly DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

  // Lock timeout: 30 seconds (in milliseconds)
  private readonly LOCK_TIMEOUT_MS = 30 * 1000;

  constructor() {
    // Clean up expired entries periodically
    setInterval(() => this.cleanupExpiredEntries(), 60 * 1000);
  }

  /**
   * Generate an idempotency key from request data
   * Used when client doesn't provide one
   */
  generateKey(
    prefix: string,
    userId: string,
    action: string,
    body: Record<string, unknown>,
  ): string {
    const hash = this.hashRequestBody(body);
    return `${prefix}:${userId}:${action}:${hash}`;
  }

  /**
   * Hash request body for verification
   */
  private hashRequestBody(body: Record<string, unknown>): string {
    const normalized = JSON.stringify(body, Object.keys(body).sort());
    return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  /**
   * Check if an idempotency key exists and lock it for processing
   * Returns isDuplicate: true if already processed
   * Throws ConflictException if currently being processed
   */
  async checkAndLock<T>(
    key: string,
    requestBodyHash?: string,
  ): Promise<IdempotencyResult<T>> {
    const existing = this.store.get(key);

    if (existing) {
      // Verify request body matches (optional)
      if (requestBodyHash && existing.hash !== requestBodyHash) {
        throw new ConflictException(
          'Idempotency key reused with different request body',
        );
      }

      // If completed, return cached result
      if (existing.status === 'completed') {
        this.logger.debug(`Idempotency hit: ${key}`);
        return {
          isDuplicate: true,
          cachedResult: existing.result as T,
          key,
        };
      }

      // If still processing, check if lock has expired
      const lockAge = Date.now() - existing.createdAt.getTime();
      if (existing.status === 'processing' && lockAge < this.LOCK_TIMEOUT_MS) {
        throw new ConflictException(
          'Request is currently being processed. Please wait.',
        );
      }

      // Lock expired, allow retry
      this.logger.warn(`Stale lock detected, allowing retry: ${key}`);
    }

    // Create new entry with processing status
    const entry: IdempotencyEntry = {
      key,
      status: 'processing',
      createdAt: new Date(),
      hash: requestBodyHash || '',
    };

    this.store.set(key, entry);
    this.logger.debug(`Idempotency lock acquired: ${key}`);

    return {
      isDuplicate: false,
      key,
    };
  }

  /**
   * Mark request as completed and store result
   */
  async complete<T>(key: string, result: T): Promise<void> {
    const entry = this.store.get(key);

    if (!entry) {
      this.logger.warn(`Completing unknown idempotency key: ${key}`);
      return;
    }

    entry.status = 'completed';
    entry.result = result;
    entry.completedAt = new Date();

    this.store.set(key, entry);
    this.logger.debug(`Idempotency completed: ${key}`);
  }

  /**
   * Mark request as failed (allows retry)
   */
  async fail(key: string): Promise<void> {
    const entry = this.store.get(key);

    if (!entry) {
      return;
    }

    entry.status = 'failed';
    entry.completedAt = new Date();

    this.store.set(key, entry);
    this.logger.debug(`Idempotency failed: ${key}`);
  }

  /**
   * Remove an idempotency key (for cleanup or testing)
   */
  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Get entry status (for debugging)
   */
  async getStatus(key: string): Promise<IdempotencyEntry | null> {
    return this.store.get(key) || null;
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      const age = now - entry.createdAt.getTime();
      if (age > this.DEFAULT_TTL_MS) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired idempotency entries`);
    }
  }

  /**
   * Get store size (for monitoring)
   */
  getStoreSize(): number {
    return this.store.size;
  }
}

/**
 * Decorator for idempotent methods
 * Usage: @Idempotent('affiliate-conversion')
 *
 * Note: This decorator requires the IdempotencyService to be injected
 * in the class using the decorator.
 */
export function Idempotent(prefix: string) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const idempotencyService = (this as { idempotencyService?: IdempotencyService }).idempotencyService;

      if (!idempotencyService) {
        // If service not available, just execute the method
        return originalMethod.apply(this, args);
      }

      // Look for idempotency key in first argument (usually DTO)
      const dto = args[0] as Record<string, unknown> | undefined;
      const key = dto?.idempotencyKey as string | undefined;

      if (!key) {
        // No idempotency key provided, execute normally
        return originalMethod.apply(this, args);
      }

      const fullKey = `${prefix}:${key}`;
      const result = await idempotencyService.checkAndLock(fullKey);

      if (result.isDuplicate) {
        return result.cachedResult;
      }

      try {
        const methodResult = await originalMethod.apply(this, args);
        await idempotencyService.complete(fullKey, methodResult);
        return methodResult;
      } catch (error) {
        await idempotencyService.fail(fullKey);
        throw error;
      }
    };

    return descriptor;
  };
}
