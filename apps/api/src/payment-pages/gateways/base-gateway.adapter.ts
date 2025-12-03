import { Logger } from '@nestjs/common';
import {
  GatewayCredentials,
  GatewayCapabilities,
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
  StripeCreatePaymentIntentRequest,
  StripePaymentIntentResult,
  PayPalCreateOrderRequest,
  PayPalOrderResult,
} from './gateway.types';

// ═══════════════════════════════════════════════════════════════
// BASE GATEWAY ADAPTER (Abstract)
// ═══════════════════════════════════════════════════════════════

export abstract class BaseGatewayAdapter {
  protected logger: Logger;
  protected credentials: GatewayCredentials;
  protected capabilities: GatewayCapabilities;

  constructor(credentials: GatewayCredentials) {
    this.credentials = credentials;
    this.logger = new Logger(this.constructor.name);
    this.capabilities = this.getDefaultCapabilities();
  }

  // ─────────────────────────────────────────────────────────────
  // Abstract methods - must be implemented by each gateway
  // ─────────────────────────────────────────────────────────────

  /**
   * Get gateway name for logging and display
   */
  abstract getName(): string;

  /**
   * Validate credentials before processing
   */
  abstract validateCredentials(): Promise<boolean>;

  /**
   * Process a payment
   */
  abstract processPayment(request: PaymentRequest): Promise<PaymentResult>;

  /**
   * Process a refund
   */
  abstract processRefund(request: RefundRequest): Promise<RefundResult>;

  /**
   * Get default capabilities for this gateway
   */
  protected abstract getDefaultCapabilities(): GatewayCapabilities;

  // ─────────────────────────────────────────────────────────────
  // Optional methods - can be overridden by specific gateways
  // ─────────────────────────────────────────────────────────────

  /**
   * Create a payment intent (Stripe-style client-side confirmation)
   * Used for Stripe Elements integration
   */
  async createPaymentIntent(
    _request: StripeCreatePaymentIntentRequest,
  ): Promise<StripePaymentIntentResult> {
    throw new Error(`${this.getName()} does not support payment intents`);
  }

  /**
   * Confirm a payment intent after client-side confirmation
   */
  async confirmPaymentIntent(_paymentIntentId: string): Promise<PaymentResult> {
    throw new Error(`${this.getName()} does not support payment intent confirmation`);
  }

  /**
   * Create a PayPal order (redirect-based flow)
   */
  async createPayPalOrder(
    _request: PayPalCreateOrderRequest,
  ): Promise<PayPalOrderResult> {
    throw new Error(`${this.getName()} does not support PayPal orders`);
  }

  /**
   * Capture a PayPal order after approval
   */
  async capturePayPalOrder(_orderId: string): Promise<PaymentResult> {
    throw new Error(`${this.getName()} does not support PayPal capture`);
  }

  /**
   * Void an authorized transaction
   */
  async voidTransaction(_transactionId: string): Promise<PaymentResult> {
    throw new Error(`${this.getName()} does not support void transactions`);
  }

  /**
   * Handle webhook events from the gateway
   */
  async handleWebhook(
    _payload: string,
    _signature: string,
  ): Promise<{ event: string; data: unknown }> {
    throw new Error(`${this.getName()} does not support webhooks`);
  }

  /**
   * Create a customer profile for recurring payments
   */
  async createCustomer(_data: {
    email: string;
    name?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ customerId: string }> {
    throw new Error(`${this.getName()} does not support customer creation`);
  }

  /**
   * Tokenize a payment method for future use
   */
  async tokenizePaymentMethod(_data: {
    customerId?: string;
    paymentMethodData: unknown;
  }): Promise<{ token: string }> {
    throw new Error(`${this.getName()} does not support tokenization`);
  }

  // ─────────────────────────────────────────────────────────────
  // Utility methods
  // ─────────────────────────────────────────────────────────────

  /**
   * Get gateway capabilities
   */
  getCapabilities(): GatewayCapabilities {
    return this.capabilities;
  }

  /**
   * Check if gateway is in sandbox/test mode
   */
  isSandbox(): boolean {
    return this.credentials.environment === 'sandbox';
  }

  /**
   * Check if a currency is supported
   */
  supportsCurrency(currency: string): boolean {
    return this.capabilities.supportedCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Format amount for the gateway (most use cents)
   */
  protected formatAmount(amount: number, currency: string): number {
    // Most gateways use smallest currency unit (cents for USD)
    // Some currencies (JPY, KRW) don't have decimal places
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'KMF', 'PYG', 'RWF', 'UGX', 'VUV', 'XAF', 'XOF', 'XPF'];
    if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
      return Math.round(amount);
    }
    return Math.round(amount * 100);
  }

  /**
   * Parse amount from gateway response (convert back to dollars)
   */
  protected parseAmount(amount: number, currency: string): number {
    const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'KMF', 'PYG', 'RWF', 'UGX', 'VUV', 'XAF', 'XOF', 'XPF'];
    if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
      return amount;
    }
    return amount / 100;
  }

  /**
   * Log gateway request (sanitized)
   */
  protected logRequest(method: string, data: Record<string, unknown>): void {
    const sanitized = this.sanitizeLogData(data);
    this.logger.debug(`${method} request: ${JSON.stringify(sanitized)}`);
  }

  /**
   * Log gateway response (sanitized)
   */
  protected logResponse(method: string, data: Record<string, unknown>): void {
    const sanitized = this.sanitizeLogData(data);
    this.logger.debug(`${method} response: ${JSON.stringify(sanitized)}`);
  }

  /**
   * Sanitize sensitive data for logging
   */
  private sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = [
      'card_number', 'cardNumber', 'number',
      'cvv', 'cvc', 'cvv2',
      'password', 'api_key', 'apiKey', 'secret_key', 'secretKey',
      'account_number', 'accountNumber', 'routing_number', 'routingNumber',
    ];

    const sanitized = { ...data };
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeLogData(sanitized[key] as Record<string, unknown>);
      }
    }
    return sanitized;
  }
}
