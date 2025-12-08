import { Injectable } from '@nestjs/common';
import Sqids from 'sqids';

/**
 * ShortIdService - Generates short, URL-friendly IDs for public resources
 *
 * Uses sqids to encode numeric IDs into short strings like "x7Kq3m"
 * - Collision-free (reversible encoding)
 * - URL-safe characters only
 * - Customizable alphabet and minimum length
 * - Different alphabets for different resource types (funnels, checkouts, etc.)
 */
@Injectable()
export class ShortIdService {
  // Different encoders for different resource types to avoid ID collisions
  private readonly funnelEncoder: Sqids;
  private readonly checkoutEncoder: Sqids;
  private readonly pageEncoder: Sqids;
  private readonly genericEncoder: Sqids;

  // Counter storage (in production, use Redis or database sequence)
  private counters: Map<string, number> = new Map();

  constructor() {
    // Use different shuffled alphabets for each resource type
    // This ensures the same numeric ID produces different short IDs for different resources
    this.funnelEncoder = new Sqids({
      alphabet: 'k6wgTfRyLpCJmN3bxS9HvZ8VqdM2aXznPYjKQ5rDhFcE7UsW4BtGA',
      minLength: 6,
    });

    this.checkoutEncoder = new Sqids({
      alphabet: 'N3bxS9HvZ8VqdM2aXznPYjKQ5rDhFcE7UsW4BtGAk6wgTfRyLpCJm',
      minLength: 6,
    });

    this.pageEncoder = new Sqids({
      alphabet: 'M2aXznPYjKQ5rDhFcE7UsW4BtGAk6wgTfRyLpCJmN3bxS9HvZ8Vqd',
      minLength: 6,
    });

    this.genericEncoder = new Sqids({
      alphabet: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      minLength: 8,
    });
  }

  /**
   * Generate a short ID from a numeric sequence
   * @param type - Resource type (funnel, checkout, page)
   * @param numericId - The numeric ID to encode
   */
  encode(type: 'funnel' | 'checkout' | 'page' | 'generic', numericId: number): string {
    const encoder = this.getEncoder(type);
    return encoder.encode([numericId]);
  }

  /**
   * Decode a short ID back to numeric ID
   * @param type - Resource type
   * @param shortId - The short ID to decode
   */
  decode(type: 'funnel' | 'checkout' | 'page' | 'generic', shortId: string): number | null {
    try {
      const encoder = this.getEncoder(type);
      const decoded = encoder.decode(shortId);
      return decoded.length > 0 ? decoded[0] : null;
    } catch {
      return null;
    }
  }

  /**
   * Generate a unique short ID using timestamp + random component
   * This is useful when you don't have a sequential numeric ID
   */
  generateUnique(type: 'funnel' | 'checkout' | 'page' | 'generic' = 'generic'): string {
    // Use timestamp (seconds since epoch) + random number for uniqueness
    const timestamp = Math.floor(Date.now() / 1000);
    const random = Math.floor(Math.random() * 10000);
    const encoder = this.getEncoder(type);
    return encoder.encode([timestamp, random]);
  }

  /**
   * Generate a short ID from a CUID/UUID by hashing it to a number
   * This provides a deterministic short ID for any string ID
   */
  fromCuid(type: 'funnel' | 'checkout' | 'page' | 'generic', cuid: string): string {
    // Simple hash function to convert CUID to number
    let hash = 0;
    for (let i = 0; i < cuid.length; i++) {
      const char = cuid.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Make positive and add timestamp component for uniqueness
    const positiveHash = Math.abs(hash);
    const encoder = this.getEncoder(type);
    return encoder.encode([positiveHash]);
  }

  /**
   * Validate that a short ID is properly formatted
   * Accepts both sqids-encoded IDs and nanoid-generated IDs
   */
  isValid(type: 'funnel' | 'checkout' | 'page' | 'generic', shortId: string): boolean {
    if (!shortId || shortId.length < 6) return false;
    // Accept any alphanumeric string of sufficient length
    // This allows both sqids-encoded and nanoid-generated IDs
    return /^[a-zA-Z0-9_-]+$/.test(shortId);
  }

  private getEncoder(type: 'funnel' | 'checkout' | 'page' | 'generic'): Sqids {
    switch (type) {
      case 'funnel':
        return this.funnelEncoder;
      case 'checkout':
        return this.checkoutEncoder;
      case 'page':
        return this.pageEncoder;
      default:
        return this.genericEncoder;
    }
  }
}
