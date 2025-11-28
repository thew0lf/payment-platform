import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { AbstractPaymentProvider } from './abstract-payment.provider';
import {
  PaymentProviderType, ProviderConfig, ProviderHealth, TransactionRequest,
  TransactionResponse, TransactionStatus, TransactionType, TokenizedCard,
  CardData, CardBrand, AVSResult, CVVResult,
} from '../types/payment.types';

export interface PayPalRestCredentials {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
}

interface PayPalAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expiresAt: number;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount: { value: string; currency_code: string };
      }>;
      authorizations?: Array<{
        id: string;
        status: string;
        amount: { value: string; currency_code: string };
      }>;
    };
  }>;
  payment_source?: {
    card?: {
      last_digits: string;
      brand: string;
      authentication_result?: {
        liability_shift: string;
      };
    };
  };
}

@Injectable()
export class PayPalRestProvider extends AbstractPaymentProvider {
  private readonly credentials: PayPalRestCredentials;
  private readonly apiEndpoint: string;
  private accessToken: PayPalAccessToken | null = null;

  constructor(config: ProviderConfig, configService?: ConfigService) {
    super(config);
    this.credentials = config.credentials as PayPalRestCredentials;
    this.apiEndpoint = this.credentials.environment === 'production'
      ? 'api-m.paypal.com'
      : 'api-m.sandbox.paypal.com';
    this.logger.log(`PayPalRestProvider initialized (${this.credentials.environment})`);
  }

  getProviderType(): PaymentProviderType {
    return PaymentProviderType.PAYPAL_REST;
  }

  async sale(request: TransactionRequest): Promise<TransactionResponse> {
    const startTime = Date.now();
    this.logTransaction('SALE', request);
    try {
      // Create order with immediate capture
      const order = await this.createOrder(request, 'CAPTURE');

      if (!request.card) {
        // Return order ID for redirect flow (PayPal checkout)
        return this.createOrderResponse(request, order, startTime);
      }

      // For card payments, process the order directly
      const capturedOrder = await this.captureOrder(order.id);
      return this.parseOrderResponse(request, capturedOrder, startTime);
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'CONNECTION_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'CONNECTION_ERROR', `Failed to connect to PayPal: ${(error as Error).message}`);
    }
  }

  async authorize(request: TransactionRequest): Promise<TransactionResponse> {
    const startTime = Date.now();
    try {
      const order = await this.createOrder(request, 'AUTHORIZE');

      if (!request.card) {
        return this.createOrderResponse(request, order, startTime);
      }

      const authorizedOrder = await this.authorizeOrder(order.id);
      return this.parseOrderResponse(request, authorizedOrder, startTime, true);
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'CONNECTION_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'CONNECTION_ERROR', `Failed: ${(error as Error).message}`);
    }
  }

  async capture(transactionId: string, amount?: number): Promise<TransactionResponse> {
    const startTime = Date.now();
    const request: TransactionRequest = {
      referenceId: this.generateReferenceId(),
      type: TransactionType.CAPTURE,
      amount: amount || 0,
      currency: 'USD',
      originalTransactionId: transactionId,
    };

    try {
      const token = await this.getAccessToken();
      const captureData: Record<string, unknown> = {};
      if (amount) {
        captureData.amount = { value: this.formatAmount(amount), currency_code: 'USD' };
      }

      const response = await this.sendRequest<PayPalOrderResponse>(
        'POST',
        `/v2/payments/authorizations/${transactionId}/capture`,
        token,
        Object.keys(captureData).length > 0 ? captureData : undefined
      );

      const result: TransactionResponse = {
        success: response.status === 'COMPLETED',
        status: this.mapPayPalStatus(response.status),
        transactionId: response.id,
        referenceId: request.referenceId,
        amount: amount || 0,
        currency: 'USD',
        rawResponse: response as unknown as Record<string, unknown>,
        processedAt: new Date(),
      };

      this.updateHealth(result.success, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'CAPTURE_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'CAPTURE_ERROR', `Failed: ${(error as Error).message}`);
    }
  }

  async void(transactionId: string): Promise<TransactionResponse> {
    const startTime = Date.now();
    const request: TransactionRequest = {
      referenceId: this.generateReferenceId(),
      type: TransactionType.VOID,
      amount: 0,
      currency: 'USD',
      originalTransactionId: transactionId,
    };

    try {
      const token = await this.getAccessToken();
      await this.sendRequest<void>(
        'POST',
        `/v2/payments/authorizations/${transactionId}/void`,
        token
      );

      const result: TransactionResponse = {
        success: true,
        status: TransactionStatus.VOIDED,
        transactionId: transactionId,
        referenceId: request.referenceId,
        amount: 0,
        currency: 'USD',
        processedAt: new Date(),
      };

      this.updateHealth(true, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'VOID_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'VOID_ERROR', `Failed: ${(error as Error).message}`);
    }
  }

  async refund(transactionId: string, amount?: number): Promise<TransactionResponse> {
    const startTime = Date.now();
    const request: TransactionRequest = {
      referenceId: this.generateReferenceId(),
      type: TransactionType.REFUND,
      amount: amount || 0,
      currency: 'USD',
      originalTransactionId: transactionId,
    };

    try {
      const token = await this.getAccessToken();
      const refundData: Record<string, unknown> = {};
      if (amount) {
        refundData.amount = { value: this.formatAmount(amount), currency_code: 'USD' };
      }

      const response = await this.sendRequest<{ id: string; status: string }>(
        'POST',
        `/v2/payments/captures/${transactionId}/refund`,
        token,
        Object.keys(refundData).length > 0 ? refundData : undefined
      );

      const result: TransactionResponse = {
        success: response.status === 'COMPLETED',
        status: response.status === 'COMPLETED' ? TransactionStatus.REFUNDED : TransactionStatus.PENDING,
        transactionId: response.id,
        referenceId: request.referenceId,
        amount: amount || 0,
        currency: 'USD',
        rawResponse: response as unknown as Record<string, unknown>,
        processedAt: new Date(),
      };

      this.updateHealth(result.success, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'REFUND_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'REFUND_ERROR', `Failed: ${(error as Error).message}`);
    }
  }

  async verify(request: TransactionRequest): Promise<TransactionResponse> {
    // PayPal REST doesn't have a direct verify - use $0 authorization
    return this.authorize({ ...request, amount: 0, type: TransactionType.VERIFY });
  }

  async tokenize(card: CardData): Promise<TokenizedCard> {
    // PayPal REST uses vault for tokenization
    const startTime = Date.now();
    try {
      const token = await this.getAccessToken();

      const vaultData = {
        payment_source: {
          card: {
            number: card.number,
            expiry: `${card.expiryYear}-${card.expiryMonth.padStart(2, '0')}`,
            security_code: card.cvv,
            name: card.cardholderName,
          },
        },
      };

      const response = await this.sendRequest<{
        id: string;
        payment_source: { card: { last_digits: string; brand: string; expiry: string } };
      }>(
        'POST',
        '/v3/vault/payment-tokens',
        token,
        vaultData
      );

      const [year, month] = response.payment_source.card.expiry.split('-');

      const tokenizedCard: TokenizedCard = {
        token: response.id,
        last4: response.payment_source.card.last_digits,
        brand: this.mapCardBrand(response.payment_source.card.brand),
        expiryMonth: parseInt(month, 10),
        expiryYear: parseInt(year, 10),
        fingerprint: this.generateFingerprint(card.number),
      };

      this.updateHealth(true, Date.now() - startTime);
      return tokenizedCard;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'TOKENIZATION_ERROR', message: (error as Error).message });
      throw error;
    }
  }

  async deleteToken(token: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      await this.sendRequest<void>('DELETE', `/v3/vault/payment-tokens/${token}`, accessToken);
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      // Try to get an access token as a health check
      await this.getAccessToken();
      this.health.status = 'healthy';
      this.health.latencyMs = Date.now() - startTime;
      this.health.lastChecked = new Date();
    } catch (error) {
      this.health.status = 'down';
      this.health.latencyMs = Date.now() - startTime;
      this.health.lastChecked = new Date();
      this.health.lastError = { code: 'HEALTH_CHECK_FAILED', message: (error as Error).message, timestamp: new Date() };
    }
    return this.health;
  }

  // Private helper methods

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.accessToken.expiresAt - 60000) {
      return this.accessToken.access_token;
    }

    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.credentials.clientId}:${this.credentials.clientSecret}`).toString('base64');
      const postData = 'grant_type=client_credentials';

      const options: https.RequestOptions = {
        hostname: this.apiEndpoint,
        port: 443,
        path: '/v1/oauth2/token',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.access_token) {
              this.accessToken = {
                ...response,
                expiresAt: Date.now() + (response.expires_in * 1000),
              };
              resolve(response.access_token);
            } else {
              reject(new Error(response.error_description || 'Failed to get access token'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse auth response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => { req.destroy(); reject(new Error('Auth request timeout')); });
      req.write(postData);
      req.end();
    });
  }

  private async createOrder(request: TransactionRequest, intent: 'CAPTURE' | 'AUTHORIZE'): Promise<PayPalOrderResponse> {
    const token = await this.getAccessToken();

    const orderData: Record<string, unknown> = {
      intent,
      purchase_units: [{
        reference_id: request.referenceId,
        amount: {
          currency_code: request.currency || 'USD',
          value: this.formatAmount(request.amount),
        },
        description: request.description,
      }],
    };

    // Add card payment source if card data provided
    if (request.card) {
      orderData.payment_source = {
        card: {
          number: request.card.number,
          expiry: `${request.card.expiryYear}-${request.card.expiryMonth.padStart(2, '0')}`,
          security_code: request.card.cvv,
          name: request.card.cardholderName,
          billing_address: request.billingAddress ? {
            address_line_1: request.billingAddress.street1,
            address_line_2: request.billingAddress.street2,
            admin_area_2: request.billingAddress.city,
            admin_area_1: request.billingAddress.state,
            postal_code: request.billingAddress.postalCode,
            country_code: request.billingAddress.country,
          } : undefined,
        },
      };
    }

    return this.sendRequest<PayPalOrderResponse>('POST', '/v2/checkout/orders', token, orderData);
  }

  private async captureOrder(orderId: string): Promise<PayPalOrderResponse> {
    const token = await this.getAccessToken();
    return this.sendRequest<PayPalOrderResponse>('POST', `/v2/checkout/orders/${orderId}/capture`, token);
  }

  private async authorizeOrder(orderId: string): Promise<PayPalOrderResponse> {
    const token = await this.getAccessToken();
    return this.sendRequest<PayPalOrderResponse>('POST', `/v2/checkout/orders/${orderId}/authorize`, token);
  }

  private async sendRequest<T>(method: string, path: string, token: string, data?: Record<string, unknown>): Promise<T> {
    return this.executeWithRetry(async () => {
      return new Promise<T>((resolve, reject) => {
        const postData = data ? JSON.stringify(data) : '';

        const options: https.RequestOptions = {
          hostname: this.apiEndpoint,
          port: 443,
          path,
          method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(postData && { 'Content-Length': Buffer.byteLength(postData) }),
          },
        };

        const req = https.request(options, (res) => {
          let responseData = '';
          res.on('data', (chunk) => { responseData += chunk; });
          res.on('end', () => {
            // Handle 204 No Content
            if (res.statusCode === 204) {
              resolve({} as T);
              return;
            }

            try {
              const response = JSON.parse(responseData);
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve(response as T);
              } else {
                const errorMsg = response.details?.[0]?.description || response.message || 'PayPal API error';
                reject(new Error(`PayPal API error: ${errorMsg}`));
              }
            } catch (error) {
              reject(new Error(`Failed to parse response: ${responseData}`));
            }
          });
        });

        req.on('error', reject);
        req.setTimeout(45000, () => { req.destroy(); reject(new Error('Request timeout')); });
        if (postData) req.write(postData);
        req.end();
      });
    }, 'PayPal REST API Request');
  }

  private createOrderResponse(request: TransactionRequest, order: PayPalOrderResponse, startTime: number): TransactionResponse {
    const success = ['CREATED', 'PAYER_ACTION_REQUIRED'].includes(order.status);
    this.updateHealth(success, Date.now() - startTime);

    return {
      success,
      status: TransactionStatus.PENDING,
      transactionId: order.id,
      referenceId: request.referenceId,
      amount: request.amount,
      currency: request.currency,
      rawResponse: order as unknown as Record<string, unknown>,
      processedAt: new Date(),
    };
  }

  private parseOrderResponse(request: TransactionRequest, order: PayPalOrderResponse, startTime: number, isAuth = false): TransactionResponse {
    const payments = order.purchase_units?.[0]?.payments;
    const capture = payments?.captures?.[0];
    const authorization = payments?.authorizations?.[0];
    const payment = isAuth ? authorization : capture;

    const success = payment?.status === 'COMPLETED' || (isAuth && payment?.status === 'CREATED');
    this.updateHealth(success, Date.now() - startTime);

    const response: TransactionResponse = {
      success,
      status: this.mapPayPalStatus(payment?.status || order.status),
      transactionId: payment?.id || order.id,
      referenceId: request.referenceId,
      amount: request.amount,
      currency: request.currency,
      rawResponse: order as unknown as Record<string, unknown>,
      processedAt: new Date(),
    };

    // Add card info if available
    if (order.payment_source?.card) {
      response.avsResult = AVSResult.NOT_AVAILABLE;
      response.cvvResult = CVVResult.NOT_PROCESSED;
    }

    if (!success) {
      response.errorCode = order.status;
      response.errorMessage = `Payment ${order.status}`;
    }

    return response;
  }

  private mapPayPalStatus(status: string): TransactionStatus {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return TransactionStatus.APPROVED;
      case 'CREATED':
      case 'SAVED':
      case 'PAYER_ACTION_REQUIRED':
        return TransactionStatus.PENDING;
      case 'VOIDED':
        return TransactionStatus.VOIDED;
      case 'DECLINED':
        return TransactionStatus.DECLINED;
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return TransactionStatus.REFUNDED;
      default:
        return TransactionStatus.ERROR;
    }
  }

  private mapCardBrand(brand: string): CardBrand {
    switch (brand?.toUpperCase()) {
      case 'VISA': return CardBrand.VISA;
      case 'MASTERCARD': return CardBrand.MASTERCARD;
      case 'AMEX': return CardBrand.AMEX;
      case 'DISCOVER': return CardBrand.DISCOVER;
      case 'JCB': return CardBrand.JCB;
      case 'DINERS': return CardBrand.DINERS;
      default: return CardBrand.UNKNOWN;
    }
  }

  private generateFingerprint(cardNumber: string): string {
    const num = cardNumber.replace(/\D/g, '');
    let hash = 0;
    for (let i = 0; i < num.length; i++) {
      hash = ((hash << 5) - hash) + num.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}
