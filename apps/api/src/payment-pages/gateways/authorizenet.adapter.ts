import { BaseGatewayAdapter } from './base-gateway.adapter';
import {
  GatewayCredentials,
  GatewayCapabilities,
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
} from './gateway.types';

// ═══════════════════════════════════════════════════════════════
// AUTHORIZE.NET GATEWAY ADAPTER
// Supports: Accept.js, Accept Hosted, AIM (legacy)
// ═══════════════════════════════════════════════════════════════

interface AuthNetResponse {
  transactionResponse?: {
    responseCode: '1' | '2' | '3' | '4';  // 1=Approved, 2=Declined, 3=Error, 4=Held
    authCode?: string;
    transId: string;
    avsResultCode?: string;
    cvvResultCode?: string;
    refTransId?: string;
    errors?: Array<{ errorCode: string; errorText: string }>;
  };
  messages: {
    resultCode: 'Ok' | 'Error';
    message: Array<{ code: string; text: string }>;
  };
}

export class AuthorizeNetAdapter extends BaseGatewayAdapter {
  private baseUrl: string;

  constructor(credentials: GatewayCredentials) {
    super(credentials);
    this.baseUrl = credentials.environment === 'production'
      ? 'https://api.authorize.net/xml/v1/request.api'
      : 'https://apitest.authorize.net/xml/v1/request.api';
  }

  getName(): string {
    return 'Authorize.Net';
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
      supportedCurrencies: ['USD', 'CAD', 'GBP', 'EUR'],
      supportedCardBrands: ['visa', 'mastercard', 'amex', 'discover', 'jcb', 'diners'],
      requiresCardPresent: false,
    };
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const payload = {
        authenticateTestRequest: {
          merchantAuthentication: this.getMerchantAuth(),
        },
      };

      const response = await this.makeRequest(payload);
      return response.messages.resultCode === 'Ok';
    } catch {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Payment Processing
  // ─────────────────────────────────────────────────────────────

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    this.logRequest('processPayment', request as unknown as Record<string, unknown>);

    // If we have a token (from Accept.js), use it
    if (request.paymentMethod?.token) {
      return this.processTokenizedPayment(request);
    }

    // If we have direct card data (PCI compliance required)
    if (request.paymentMethod?.card) {
      return this.processDirectPayment(request);
    }

    return {
      success: false,
      status: 'failed',
      message: 'No valid payment method provided',
    };
  }

  private async processTokenizedPayment(request: PaymentRequest): Promise<PaymentResult> {
    // Accept.js provides an opaque data descriptor and value
    // For this implementation, we assume the token is in format "dataDescriptor|dataValue"
    const [dataDescriptor, dataValue] = (request.paymentMethod!.token || '').split('|');

    const payload = {
      createTransactionRequest: {
        merchantAuthentication: this.getMerchantAuth(),
        transactionRequest: {
          transactionType: 'authCaptureTransaction',
          amount: request.amount.toFixed(2),
          payment: {
            opaqueData: {
              dataDescriptor,
              dataValue,
            },
          },
          order: {
            invoiceNumber: request.sessionId.substring(0, 20),
            description: request.description?.substring(0, 255),
          },
          ...(request.billingAddress && {
            billTo: this.formatBillTo(request),
          }),
          ...(request.shippingAddress && {
            shipTo: this.formatShipTo(request),
          }),
          customerIP: request.metadata?.ipAddress as string,
          transactionSettings: {
            setting: [
              { settingName: 'duplicateWindow', settingValue: '60' },
            ],
          },
        },
      },
    };

    try {
      const response = await this.makeRequest(payload);
      return this.mapResponse(response, request.sessionId);
    } catch (error) {
      this.logger.error('Authorize.Net tokenized payment failed', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async processDirectPayment(request: PaymentRequest): Promise<PaymentResult> {
    const card = request.paymentMethod!.card!;

    const payload = {
      createTransactionRequest: {
        merchantAuthentication: this.getMerchantAuth(),
        transactionRequest: {
          transactionType: 'authCaptureTransaction',
          amount: request.amount.toFixed(2),
          payment: {
            creditCard: {
              cardNumber: card.number,
              expirationDate: `${String(card.expMonth).padStart(2, '0')}${String(card.expYear).slice(-2)}`,
              cardCode: card.cvc,
            },
          },
          order: {
            invoiceNumber: request.sessionId.substring(0, 20),
            description: request.description?.substring(0, 255),
          },
          ...(request.billingAddress && {
            billTo: this.formatBillTo(request),
          }),
          ...(request.shippingAddress && {
            shipTo: this.formatShipTo(request),
          }),
          customerIP: request.metadata?.ipAddress as string,
        },
      },
    };

    try {
      const response = await this.makeRequest(payload);
      return this.mapResponse(response, request.sessionId);
    } catch (error) {
      this.logger.error('Authorize.Net direct payment failed', error);
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

    const payload = {
      createTransactionRequest: {
        merchantAuthentication: this.getMerchantAuth(),
        transactionRequest: {
          transactionType: 'refundTransaction',
          amount: request.amount.toFixed(2),
          refTransId: request.gatewayTransactionId,
          payment: {
            creditCard: {
              cardNumber: 'XXXX', // Last 4 digits needed, or use stored payment profile
              expirationDate: 'XXXX',
            },
          },
        },
      },
    };

    try {
      const response = await this.makeRequest(payload);
      const transResponse = response.transactionResponse;

      const result: RefundResult = {
        success: transResponse?.responseCode === '1',
        refundId: request.transactionId,
        gatewayRefundId: transResponse?.transId,
        status: transResponse?.responseCode === '1' ? 'succeeded' : 'failed',
        message: transResponse?.errors?.[0]?.errorText || response.messages.message[0]?.text,
      };

      this.logResponse('processRefund', result as unknown as Record<string, unknown>);
      return result;
    } catch (error) {
      this.logger.error('Authorize.Net refund failed', error);
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
    const payload = {
      createTransactionRequest: {
        merchantAuthentication: this.getMerchantAuth(),
        transactionRequest: {
          transactionType: 'voidTransaction',
          refTransId: transactionId,
        },
      },
    };

    try {
      const response = await this.makeRequest(payload);
      const transResponse = response.transactionResponse;

      return {
        success: transResponse?.responseCode === '1',
        transactionId,
        gatewayTransactionId: transResponse?.transId,
        status: transResponse?.responseCode === '1' ? 'cancelled' : 'failed',
        message: transResponse?.errors?.[0]?.errorText || response.messages.message[0]?.text,
      };
    } catch (error) {
      this.logger.error('Authorize.Net void failed', error);
      return {
        success: false,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Customer Profile (CIM)
  // ─────────────────────────────────────────────────────────────

  async createCustomer(data: {
    email: string;
    name?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ customerId: string }> {
    const payload = {
      createCustomerProfileRequest: {
        merchantAuthentication: this.getMerchantAuth(),
        profile: {
          merchantCustomerId: data.metadata?.customerId || `cust_${Date.now()}`,
          email: data.email,
          ...(data.name && { description: data.name }),
        },
      },
    };

    try {
      const response = await this.makeRequest(payload);

      if (response.messages.resultCode !== 'Ok') {
        throw new Error(response.messages.message[0]?.text);
      }

      return { customerId: (response as any).customerProfileId };
    } catch (error) {
      this.logger.error('Authorize.Net customer creation failed', error);
      throw error;
    }
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

    const payload = {
      createCustomerPaymentProfileRequest: {
        merchantAuthentication: this.getMerchantAuth(),
        customerProfileId: data.customerId,
        paymentProfile: {
          payment: {
            creditCard: {
              cardNumber: card.number,
              expirationDate: `${String(card.expYear)}-${String(card.expMonth).padStart(2, '0')}`,
              cardCode: card.cvc,
            },
          },
        },
        validationMode: 'liveMode',
      },
    };

    try {
      const response = await this.makeRequest(payload);

      if (response.messages.resultCode !== 'Ok') {
        throw new Error(response.messages.message[0]?.text);
      }

      return { token: (response as any).customerPaymentProfileId };
    } catch (error) {
      this.logger.error('Authorize.Net tokenization failed', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────

  private getMerchantAuth() {
    return {
      name: this.credentials.apiKey,
      transactionKey: this.credentials.secretKey,
    };
  }

  private async makeRequest(payload: unknown): Promise<AuthNetResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, '');
    return JSON.parse(cleanText);
  }

  private formatBillTo(request: PaymentRequest) {
    const addr = request.billingAddress!;
    return {
      firstName: addr.firstName,
      lastName: addr.lastName,
      address: addr.line1,
      city: addr.city,
      state: addr.state,
      zip: addr.postalCode,
      country: addr.country,
    };
  }

  private formatShipTo(request: PaymentRequest) {
    const addr = request.shippingAddress!;
    return {
      firstName: addr.firstName,
      lastName: addr.lastName,
      address: addr.line1,
      city: addr.city,
      state: addr.state,
      zip: addr.postalCode,
      country: addr.country,
    };
  }

  private mapResponse(response: AuthNetResponse, sessionId: string): PaymentResult {
    const transResponse = response.transactionResponse;

    if (!transResponse) {
      return {
        success: false,
        status: 'failed',
        message: response.messages.message[0]?.text || 'No transaction response',
      };
    }

    const statusMap: Record<string, PaymentResult['status']> = {
      '1': 'succeeded',
      '2': 'failed',
      '3': 'failed',
      '4': 'pending', // Held for review
    };

    return {
      success: transResponse.responseCode === '1',
      transactionId: sessionId,
      gatewayTransactionId: transResponse.transId,
      status: statusMap[transResponse.responseCode] || 'failed',
      message: transResponse.errors?.[0]?.errorText || response.messages.message[0]?.text,
      errorCode: transResponse.errors?.[0]?.errorCode,
      rawResponse: response as unknown as Record<string, unknown>,
    };
  }

  /**
   * Get the client key for Accept.js
   */
  getClientKey(): string {
    return this.credentials.publicKey as string;
  }

  /**
   * Get the API login ID for Accept.js
   */
  getApiLoginId(): string {
    return this.credentials.apiKey as string;
  }
}
