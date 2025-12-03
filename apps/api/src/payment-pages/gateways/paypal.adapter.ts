import { BaseGatewayAdapter } from './base-gateway.adapter';
import {
  GatewayCredentials,
  GatewayCapabilities,
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
  PayPalCreateOrderRequest,
  PayPalOrderResult,
} from './gateway.types';

// ═══════════════════════════════════════════════════════════════
// PAYPAL GATEWAY ADAPTER
// Supports: PayPal Orders API (redirect flow), PayPal Buttons
// ═══════════════════════════════════════════════════════════════

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{ rel: string; href: string; method: string }>;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount: { value: string; currency_code: string };
      }>;
    };
  }>;
}

export class PayPalAdapter extends BaseGatewayAdapter {
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(credentials: GatewayCredentials) {
    super(credentials);
    this.baseUrl = credentials.environment === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  getName(): string {
    return 'PayPal';
  }

  protected getDefaultCapabilities(): GatewayCapabilities {
    return {
      supportsTokenization: false,
      supportsRecurring: true,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsVoid: true,
      supports3DS: false,
      supportsACH: false,
      supportedCurrencies: [
        'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'HKD', 'SGD', 'SEK',
        'DKK', 'NOK', 'NZD', 'MXN', 'BRL', 'PLN', 'CZK', 'HUF', 'PHP', 'THB',
      ],
      supportedCardBrands: ['visa', 'mastercard', 'amex', 'discover'],
      requiresCardPresent: false,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Authentication
  // ─────────────────────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const clientId = this.credentials.apiKey as string;
    const clientSecret = this.credentials.secretKey as string;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`PayPal auth failed: ${response.statusText}`);
      }

      const data: PayPalTokenResponse = await response.json();
      this.accessToken = data.access_token;
      // Set expiry 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      this.logger.error('PayPal authentication failed', error);
      throw error;
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Order Creation (PayPal Buttons/Redirect Flow)
  // ─────────────────────────────────────────────────────────────

  async createPayPalOrder(request: PayPalCreateOrderRequest): Promise<PayPalOrderResult> {
    this.logRequest('createPayPalOrder', request as unknown as Record<string, unknown>);

    const accessToken = await this.getAccessToken();

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: request.currency.toUpperCase(),
            value: request.amount.toFixed(2),
          },
          description: request.description,
          custom_id: JSON.stringify(request.metadata || {}),
        },
      ],
      application_context: {
        return_url: request.returnUrl,
        cancel_url: request.cancelUrl,
        brand_name: 'Payment Platform',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`PayPal order creation failed: ${JSON.stringify(errorData)}`);
      }

      const order: PayPalOrder = await response.json();
      const approveLink = order.links.find(l => l.rel === 'approve');

      const result: PayPalOrderResult = {
        orderId: order.id,
        approveUrl: approveLink?.href || '',
        status: order.status,
      };

      this.logResponse('createPayPalOrder', result as unknown as Record<string, unknown>);
      return result;
    } catch (error) {
      this.logger.error('Failed to create PayPal order', error);
      throw error;
    }
  }

  async capturePayPalOrder(orderId: string): Promise<PaymentResult> {
    this.logRequest('capturePayPalOrder', { orderId });

    const accessToken = await this.getAccessToken();

    try {
      const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          status: 'failed',
          message: `PayPal capture failed: ${JSON.stringify(errorData)}`,
        };
      }

      const order: PayPalOrder = await response.json();
      const capture = order.purchase_units?.[0]?.payments?.captures?.[0];

      const result: PaymentResult = {
        success: order.status === 'COMPLETED',
        transactionId: orderId,
        gatewayTransactionId: capture?.id || orderId,
        status: order.status === 'COMPLETED' ? 'succeeded' : 'failed',
        rawResponse: order as unknown as Record<string, unknown>,
      };

      this.logResponse('capturePayPalOrder', result as unknown as Record<string, unknown>);
      return result;
    } catch (error) {
      this.logger.error('Failed to capture PayPal order', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Payment Processing (Not typically used - PayPal uses redirect)
  // ─────────────────────────────────────────────────────────────

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    // For PayPal, we create an order and return redirect URL
    const orderResult = await this.createPayPalOrder({
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      returnUrl: request.returnUrl!,
      cancelUrl: request.cancelUrl!,
      metadata: { sessionId: request.sessionId, ...request.metadata },
    });

    return {
      success: false, // Not completed yet - needs redirect
      transactionId: request.sessionId,
      gatewayTransactionId: orderResult.orderId,
      status: 'requires_action',
      requiresAction: true,
      actionType: 'redirect',
      actionUrl: orderResult.approveUrl,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Refunds
  // ─────────────────────────────────────────────────────────────

  async processRefund(request: RefundRequest): Promise<RefundResult> {
    this.logRequest('processRefund', request as unknown as Record<string, unknown>);

    const accessToken = await this.getAccessToken();

    const refundPayload = {
      amount: {
        value: request.amount.toFixed(2),
        currency_code: 'USD', // Should come from original transaction
      },
      note_to_payer: request.reason,
    };

    try {
      const response = await fetch(
        `${this.baseUrl}/v2/payments/captures/${request.gatewayTransactionId}/refund`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(refundPayload),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          status: 'failed',
          message: `PayPal refund failed: ${JSON.stringify(errorData)}`,
        };
      }

      const refund = await response.json();

      const result: RefundResult = {
        success: refund.status === 'COMPLETED',
        refundId: request.transactionId,
        gatewayRefundId: refund.id,
        status: refund.status === 'COMPLETED' ? 'succeeded' : 'pending',
        rawResponse: refund,
      };

      this.logResponse('processRefund', result as unknown as Record<string, unknown>);
      return result;
    } catch (error) {
      this.logger.error('PayPal refund failed', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Void / Cancel
  // ─────────────────────────────────────────────────────────────

  async voidTransaction(transactionId: string): Promise<PaymentResult> {
    const accessToken = await this.getAccessToken();

    try {
      const response = await fetch(
        `${this.baseUrl}/v2/payments/authorizations/${transactionId}/void`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          status: 'failed',
          message: `PayPal void failed: ${JSON.stringify(errorData)}`,
        };
      }

      return {
        success: true,
        transactionId,
        gatewayTransactionId: transactionId,
        status: 'cancelled',
      };
    } catch (error) {
      this.logger.error('PayPal void failed', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Webhook Handling
  // ─────────────────────────────────────────────────────────────

  async handleWebhook(
    payload: string,
    signature: string,
  ): Promise<{ event: string; data: unknown }> {
    // PayPal webhook verification requires additional headers
    // For now, parse the event and verify the event type
    try {
      const event = JSON.parse(payload);

      // In production, verify the webhook signature using PayPal's API
      // POST /v1/notifications/verify-webhook-signature

      return {
        event: event.event_type,
        data: event.resource,
      };
    } catch (error) {
      this.logger.error('PayPal webhook parsing failed', error);
      throw error;
    }
  }

  /**
   * Get the client ID for PayPal Buttons
   */
  getClientId(): string {
    return this.credentials.apiKey as string;
  }
}
