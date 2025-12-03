import Stripe from 'stripe';
import { BaseGatewayAdapter } from './base-gateway.adapter';
import {
  GatewayCredentials,
  GatewayCapabilities,
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
  StripeCreatePaymentIntentRequest,
  StripePaymentIntentResult,
} from './gateway.types';

// ═══════════════════════════════════════════════════════════════
// STRIPE GATEWAY ADAPTER
// Supports: Stripe Elements, Payment Intents, 3DS, Subscriptions
// ═══════════════════════════════════════════════════════════════

export class StripeAdapter extends BaseGatewayAdapter {
  private stripe: Stripe;

  constructor(credentials: GatewayCredentials) {
    super(credentials);
    this.stripe = new Stripe(credentials.secretKey as string, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    });
  }

  getName(): string {
    return 'Stripe';
  }

  protected getDefaultCapabilities(): GatewayCapabilities {
    return {
      supportsTokenization: true,
      supportsRecurring: true,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsVoid: true,
      supports3DS: true,
      supportsACH: true,
      supportedCurrencies: [
        'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'HKD', 'SGD', 'SEK',
        'DKK', 'NOK', 'NZD', 'MXN', 'BRL', 'INR', 'PLN', 'CZK', 'HUF', 'RON',
      ],
      supportedCardBrands: ['visa', 'mastercard', 'amex', 'discover', 'jcb', 'diners', 'unionpay'],
      requiresCardPresent: false,
    };
  }

  async validateCredentials(): Promise<boolean> {
    try {
      // Try to retrieve account to validate API key
      await this.stripe.accounts.retrieve();
      return true;
    } catch (error) {
      this.logger.error('Stripe credential validation failed', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Payment Intent (Stripe Elements) Flow
  // ─────────────────────────────────────────────────────────────

  async createPaymentIntent(
    request: StripeCreatePaymentIntentRequest,
  ): Promise<StripePaymentIntentResult> {
    this.logRequest('createPaymentIntent', request as unknown as Record<string, unknown>);

    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: this.formatAmount(request.amount, request.currency),
        currency: request.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: request.metadata as Stripe.MetadataParam || {},
        ...(request.customerEmail && { receipt_email: request.customerEmail }),
        ...(request.customerId && { customer: request.customerId }),
        ...(request.statementDescriptor && {
          statement_descriptor_suffix: request.statementDescriptor.substring(0, 22),
        }),
        ...(request.setupFutureUsage && { setup_future_usage: request.setupFutureUsage }),
      });

      const result: StripePaymentIntentResult = {
        clientSecret: intent.client_secret!,
        paymentIntentId: intent.id,
        status: intent.status,
      };

      this.logResponse('createPaymentIntent', result as unknown as Record<string, unknown>);
      return result;
    } catch (error) {
      this.logger.error('Failed to create payment intent', error);
      throw error;
    }
  }

  async confirmPaymentIntent(paymentIntentId: string): Promise<PaymentResult> {
    try {
      const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return this.mapStripeStatusToResult(intent);
    } catch (error) {
      this.logger.error('Failed to confirm payment intent', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as Stripe.errors.StripeError)?.code,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Direct Payment Processing (server-side)
  // ─────────────────────────────────────────────────────────────

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    this.logRequest('processPayment', request as unknown as Record<string, unknown>);

    try {
      // If we have a token (from Elements), create and confirm payment intent
      if (request.paymentMethod?.token) {
        const intent = await this.stripe.paymentIntents.create({
          amount: this.formatAmount(request.amount, request.currency),
          currency: request.currency.toLowerCase(),
          payment_method: request.paymentMethod.token,
          confirm: true,
          return_url: request.returnUrl,
          metadata: {
            sessionId: request.sessionId,
            ...request.metadata,
          } as Stripe.MetadataParam,
          ...(request.customerEmail && { receipt_email: request.customerEmail }),
        });

        return this.mapStripeStatusToResult(intent);
      }

      // For server-side only (not recommended for cards - PCI compliance)
      throw new Error('Direct card processing requires tokenization via Stripe Elements');
    } catch (error) {
      this.logger.error('Payment processing failed', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as Stripe.errors.StripeError)?.code,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Refunds
  // ─────────────────────────────────────────────────────────────

  async processRefund(request: RefundRequest): Promise<RefundResult> {
    this.logRequest('processRefund', request as unknown as Record<string, unknown>);

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: request.gatewayTransactionId,
        amount: this.formatAmount(request.amount, 'USD'), // Amount in cents
        reason: request.reason as Stripe.RefundCreateParams.Reason,
        metadata: request.metadata as Stripe.MetadataParam,
      });

      const result: RefundResult = {
        success: refund.status === 'succeeded',
        refundId: request.transactionId,
        gatewayRefundId: refund.id,
        status: refund.status === 'succeeded' ? 'succeeded' : 'pending',
        rawResponse: refund as unknown as Record<string, unknown>,
      };

      this.logResponse('processRefund', result as unknown as Record<string, unknown>);
      return result;
    } catch (error) {
      this.logger.error('Refund processing failed', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as Stripe.errors.StripeError)?.code,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Void / Cancel
  // ─────────────────────────────────────────────────────────────

  async voidTransaction(transactionId: string): Promise<PaymentResult> {
    try {
      const intent = await this.stripe.paymentIntents.cancel(transactionId);

      return {
        success: intent.status === 'canceled',
        transactionId,
        gatewayTransactionId: intent.id,
        status: intent.status === 'canceled' ? 'cancelled' : 'failed',
        rawResponse: intent as unknown as Record<string, unknown>,
      };
    } catch (error) {
      this.logger.error('Void transaction failed', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as Stripe.errors.StripeError)?.code,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Customer Management
  // ─────────────────────────────────────────────────────────────

  async createCustomer(data: {
    email: string;
    name?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ customerId: string }> {
    try {
      const customer = await this.stripe.customers.create({
        email: data.email,
        name: data.name,
        metadata: data.metadata as Stripe.MetadataParam,
      });

      return { customerId: customer.id };
    } catch (error) {
      this.logger.error('Customer creation failed', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Webhook Handling
  // ─────────────────────────────────────────────────────────────

  async handleWebhook(
    payload: string,
    signature: string,
  ): Promise<{ event: string; data: unknown }> {
    const webhookSecret = this.credentials.webhookSecret as string;
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      return {
        event: event.type,
        data: event.data.object,
      };
    } catch (error) {
      this.logger.error('Webhook validation failed', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────

  private mapStripeStatusToResult(intent: Stripe.PaymentIntent): PaymentResult {
    const statusMap: Record<Stripe.PaymentIntent.Status, PaymentResult> = {
      succeeded: {
        success: true,
        transactionId: intent.id,
        gatewayTransactionId: intent.id,
        status: 'succeeded',
        rawResponse: intent as unknown as Record<string, unknown>,
      },
      processing: {
        success: false,
        transactionId: intent.id,
        gatewayTransactionId: intent.id,
        status: 'processing',
        rawResponse: intent as unknown as Record<string, unknown>,
      },
      requires_action: {
        success: false,
        transactionId: intent.id,
        gatewayTransactionId: intent.id,
        status: 'requires_action',
        requiresAction: true,
        actionType: '3ds',
        clientSecret: intent.client_secret!,
        rawResponse: intent as unknown as Record<string, unknown>,
      },
      requires_payment_method: {
        success: false,
        transactionId: intent.id,
        gatewayTransactionId: intent.id,
        status: 'failed',
        message: 'Payment method required',
        rawResponse: intent as unknown as Record<string, unknown>,
      },
      requires_confirmation: {
        success: false,
        transactionId: intent.id,
        gatewayTransactionId: intent.id,
        status: 'pending',
        rawResponse: intent as unknown as Record<string, unknown>,
      },
      requires_capture: {
        success: true,
        transactionId: intent.id,
        gatewayTransactionId: intent.id,
        status: 'pending',
        requiresAction: true,
        actionType: 'capture',
        rawResponse: intent as unknown as Record<string, unknown>,
      },
      canceled: {
        success: false,
        transactionId: intent.id,
        gatewayTransactionId: intent.id,
        status: 'cancelled',
        rawResponse: intent as unknown as Record<string, unknown>,
      },
    };

    return statusMap[intent.status] || {
      success: false,
      status: 'failed',
      message: `Unknown status: ${intent.status}`,
    };
  }

  /**
   * Get the publishable key for client-side Stripe Elements
   */
  getPublishableKey(): string {
    return this.credentials.publicKey as string;
  }
}
