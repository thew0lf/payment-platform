import { Injectable, Logger } from '@nestjs/common';
import { PaymentGatewayType } from '@prisma/client';
import { BaseGatewayAdapter } from './base-gateway.adapter';
import { StripeAdapter } from './stripe.adapter';
import { PayPalAdapter } from './paypal.adapter';
import { NMIAdapter } from './nmi.adapter';
import { AuthorizeNetAdapter } from './authorizenet.adapter';
import { GatewayCredentials, GatewayConfig } from './gateway.types';

// ═══════════════════════════════════════════════════════════════
// GATEWAY FACTORY
// Creates and caches gateway adapter instances
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class GatewayFactory {
  private readonly logger = new Logger(GatewayFactory.name);
  private readonly adapters: Map<string, BaseGatewayAdapter> = new Map();

  /**
   * Get or create a gateway adapter
   * @param config Gateway configuration including credentials
   * @returns Gateway adapter instance
   */
  getAdapter(config: GatewayConfig): BaseGatewayAdapter {
    const cacheKey = this.getCacheKey(config);

    // Check cache first
    if (this.adapters.has(cacheKey)) {
      return this.adapters.get(cacheKey)!;
    }

    // Create new adapter
    const adapter = this.createAdapter(config.type, config.credentials);
    this.adapters.set(cacheKey, adapter);

    this.logger.log(`Created ${config.type} adapter (${config.credentials.environment})`);
    return adapter;
  }

  /**
   * Create a new adapter instance
   */
  private createAdapter(
    type: PaymentGatewayType,
    credentials: GatewayCredentials,
  ): BaseGatewayAdapter {
    switch (type) {
      case PaymentGatewayType.STRIPE:
        return new StripeAdapter(credentials);

      case PaymentGatewayType.PAYPAL_REST:
      case PaymentGatewayType.PAYPAL:
        return new PayPalAdapter(credentials);

      case PaymentGatewayType.NMI:
        return new NMIAdapter(credentials);

      case PaymentGatewayType.AUTHORIZE_NET:
        return new AuthorizeNetAdapter(credentials);

      default:
        throw new Error(`Unsupported gateway type: ${type}`);
    }
  }

  /**
   * Generate cache key for adapter
   */
  private getCacheKey(config: GatewayConfig): string {
    // Include type, environment, and a hash of the API key to ensure unique adapters
    const keyHash = this.hashKey(config.credentials.apiKey || '');
    return `${config.type}-${config.credentials.environment}-${keyHash}`;
  }

  /**
   * Simple hash for cache key (not for security)
   */
  private hashKey(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear cached adapter (useful when credentials change)
   */
  clearAdapter(config: GatewayConfig): void {
    const cacheKey = this.getCacheKey(config);
    this.adapters.delete(cacheKey);
    this.logger.log(`Cleared ${config.type} adapter cache`);
  }

  /**
   * Clear all cached adapters
   */
  clearAllAdapters(): void {
    this.adapters.clear();
    this.logger.log('Cleared all adapter caches');
  }

  /**
   * Get list of supported gateway types
   */
  getSupportedGateways(): PaymentGatewayType[] {
    return [
      PaymentGatewayType.STRIPE,
      PaymentGatewayType.PAYPAL_REST,
      PaymentGatewayType.PAYPAL,
      PaymentGatewayType.NMI,
      PaymentGatewayType.AUTHORIZE_NET,
    ];
  }

  /**
   * Check if a gateway type is supported
   */
  isSupported(type: PaymentGatewayType): boolean {
    return this.getSupportedGateways().includes(type);
  }
}
