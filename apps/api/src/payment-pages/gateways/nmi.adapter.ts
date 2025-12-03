import { BaseGatewayAdapter } from './base-gateway.adapter';
import {
  GatewayCredentials,
  GatewayCapabilities,
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
  DirectPostRequest,
  DirectPostResult,
} from './gateway.types';

// ═══════════════════════════════════════════════════════════════
// NMI GATEWAY ADAPTER
// Supports: Direct Post, Three-Step Redirect, Customer Vault
// ═══════════════════════════════════════════════════════════════

interface NMIResponse {
  response: '1' | '2' | '3';  // 1=Approved, 2=Declined, 3=Error
  responsetext: string;
  authcode?: string;
  transactionid: string;
  avsresponse?: string;
  cvvresponse?: string;
  orderid?: string;
  response_code?: string;
}

export class NMIAdapter extends BaseGatewayAdapter {
  private baseUrl = 'https://secure.nmi.com/api/transact.php';

  constructor(credentials: GatewayCredentials) {
    super(credentials);
  }

  getName(): string {
    return 'NMI';
  }

  protected getDefaultCapabilities(): GatewayCapabilities {
    return {
      supportsTokenization: true,
      supportsRecurring: true,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      supportsVoid: true,
      supports3DS: false,
      supportsACH: true,
      supportedCurrencies: ['USD', 'CAD'],
      supportedCardBrands: ['visa', 'mastercard', 'amex', 'discover', 'jcb', 'diners'],
      requiresCardPresent: false,
    };
  }

  async validateCredentials(): Promise<boolean> {
    try {
      // NMI doesn't have a dedicated validation endpoint
      // We'll try a void transaction type which will validate the API key
      const params = new URLSearchParams({
        security_key: this.credentials.apiKey as string,
        type: 'validate',
      });

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: params,
      });

      // If we get any response, credentials are likely valid
      return response.ok;
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Direct Post (Server-to-Server)
  // Note: This requires PCI DSS Level 1 compliance
  // ─────────────────────────────────────────────────────────────

  async directPost(request: DirectPostRequest): Promise<DirectPostResult> {
    this.logRequest('directPost', { ...request, cardNumber: '****', cardCvv: '***' });

    const params = new URLSearchParams({
      security_key: this.credentials.apiKey as string,
      type: 'sale',
      amount: request.amount.toFixed(2),
      ccnumber: request.cardNumber,
      ccexp: `${request.cardExpMonth.padStart(2, '0')}${request.cardExpYear.slice(-2)}`,
      cvv: request.cardCvv,
      ...(request.firstName && { first_name: request.firstName }),
      ...(request.lastName && { last_name: request.lastName }),
      ...(request.email && { email: request.email }),
      ...(request.billingAddress && {
        address1: request.billingAddress.line1,
        city: request.billingAddress.city,
        state: request.billingAddress.state || '',
        zip: request.billingAddress.postalCode,
        country: request.billingAddress.country,
      }),
      ...(request.orderId && { orderid: request.orderId }),
      ...(request.description && { order_description: request.description }),
    });

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: params,
      });

      const text = await response.text();
      const data = this.parseNMIResponse(text);

      const result: DirectPostResult = {
        success: data.response === '1',
        transactionId: data.transactionid,
        authCode: data.authcode,
        avsResponse: data.avsresponse,
        cvvResponse: data.cvvresponse,
        message: data.responsetext,
        errorCode: data.response_code,
      };

      this.logResponse('directPost', result as unknown as Record<string, unknown>);
      return result;
    } catch (error) {
      this.logger.error('NMI direct post failed', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Payment Processing
  // ─────────────────────────────────────────────────────────────

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    this.logRequest('processPayment', request as unknown as Record<string, unknown>);

    // If we have a token (from Customer Vault), use it
    if (request.paymentMethod?.token) {
      return this.processTokenizedPayment(request);
    }

    // If we have direct card data (PCI compliance required)
    if (request.paymentMethod?.card) {
      const directResult = await this.directPost({
        amount: request.amount,
        currency: request.currency,
        cardNumber: request.paymentMethod.card.number,
        cardExpMonth: String(request.paymentMethod.card.expMonth),
        cardExpYear: String(request.paymentMethod.card.expYear),
        cardCvv: request.paymentMethod.card.cvc,
        firstName: request.billingAddress?.firstName,
        lastName: request.billingAddress?.lastName,
        email: request.customerEmail,
        billingAddress: request.billingAddress,
        orderId: request.sessionId,
        description: request.description,
      });

      return {
        success: directResult.success,
        transactionId: request.sessionId,
        gatewayTransactionId: directResult.transactionId,
        status: directResult.success ? 'succeeded' : 'failed',
        message: directResult.message,
        errorCode: directResult.errorCode,
      };
    }

    return {
      success: false,
      status: 'failed',
      message: 'No valid payment method provided',
    };
  }

  private async processTokenizedPayment(request: PaymentRequest): Promise<PaymentResult> {
    const params = new URLSearchParams({
      security_key: this.credentials.apiKey as string,
      type: 'sale',
      amount: request.amount.toFixed(2),
      customer_vault_id: request.paymentMethod!.token!,
      ...(request.sessionId && { orderid: request.sessionId }),
      ...(request.description && { order_description: request.description }),
    });

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: params,
      });

      const text = await response.text();
      const data = this.parseNMIResponse(text);

      return {
        success: data.response === '1',
        transactionId: request.sessionId,
        gatewayTransactionId: data.transactionid,
        status: data.response === '1' ? 'succeeded' : 'failed',
        message: data.responsetext,
        errorCode: data.response_code,
      };
    } catch (error) {
      this.logger.error('NMI tokenized payment failed', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Refunds
  // ─────────────────────────────────────────────────────────────

  async processRefund(request: RefundRequest): Promise<RefundResult> {
    this.logRequest('processRefund', request as unknown as Record<string, unknown>);

    const params = new URLSearchParams({
      security_key: this.credentials.apiKey as string,
      type: 'refund',
      transactionid: request.gatewayTransactionId,
      amount: request.amount.toFixed(2),
    });

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: params,
      });

      const text = await response.text();
      const data = this.parseNMIResponse(text);

      const result: RefundResult = {
        success: data.response === '1',
        refundId: request.transactionId,
        gatewayRefundId: data.transactionid,
        status: data.response === '1' ? 'succeeded' : 'failed',
        message: data.responsetext,
        errorCode: data.response_code,
      };

      this.logResponse('processRefund', result as unknown as Record<string, unknown>);
      return result;
    } catch (error) {
      this.logger.error('NMI refund failed', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Void
  // ─────────────────────────────────────────────────────────────

  async voidTransaction(transactionId: string): Promise<PaymentResult> {
    const params = new URLSearchParams({
      security_key: this.credentials.apiKey as string,
      type: 'void',
      transactionid: transactionId,
    });

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: params,
      });

      const text = await response.text();
      const data = this.parseNMIResponse(text);

      return {
        success: data.response === '1',
        transactionId,
        gatewayTransactionId: data.transactionid,
        status: data.response === '1' ? 'cancelled' : 'failed',
        message: data.responsetext,
        errorCode: data.response_code,
      };
    } catch (error) {
      this.logger.error('NMI void failed', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Customer Vault (Tokenization)
  // ─────────────────────────────────────────────────────────────

  async createCustomer(data: {
    email: string;
    name?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ customerId: string }> {
    // NMI uses customer_vault_id - generate a unique ID
    const customerId = `cv_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return { customerId };
  }

  async tokenizePaymentMethod(data: {
    customerId?: string;
    paymentMethodData: unknown;
  }): Promise<{ token: string }> {
    const card = data.paymentMethodData as {
      number: string;
      expMonth: number;
      expYear: number;
      cvc: string;
    };

    const customerId = data.customerId || `cv_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const params = new URLSearchParams({
      security_key: this.credentials.apiKey as string,
      customer_vault: 'add_customer',
      customer_vault_id: customerId,
      ccnumber: card.number,
      ccexp: `${String(card.expMonth).padStart(2, '0')}${String(card.expYear).slice(-2)}`,
      cvv: card.cvc,
    });

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: params,
      });

      const text = await response.text();
      const responseData = this.parseNMIResponse(text);

      if (responseData.response !== '1') {
        throw new Error(responseData.responsetext);
      }

      return { token: customerId };
    } catch (error) {
      this.logger.error('NMI tokenization failed', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────

  private parseNMIResponse(text: string): NMIResponse {
    const params = new URLSearchParams(text);
    return {
      response: params.get('response') as '1' | '2' | '3',
      responsetext: params.get('responsetext') || '',
      authcode: params.get('authcode') || undefined,
      transactionid: params.get('transactionid') || '',
      avsresponse: params.get('avsresponse') || undefined,
      cvvresponse: params.get('cvvresponse') || undefined,
      orderid: params.get('orderid') || undefined,
      response_code: params.get('response_code') || undefined,
    };
  }

  /**
   * Get the tokenization key for Collect.js
   */
  getTokenizationKey(): string {
    return this.credentials.publicKey as string;
  }
}
