/**
 * PayPal Classic NVP Provider (Legacy)
 *
 * Supports PayPal Website Payments Pro / DoDirectPayment API.
 * Uses NVP (Name-Value Pair) format over HTTPS.
 *
 * WARNING: This API is deprecated by PayPal. Use PayPal REST API for new integrations.
 * This provider is maintained for legacy account compatibility.
 *
 * API Operations:
 * - DoDirectPayment (sale/authorize)
 * - DoCapture
 * - DoVoid
 * - RefundTransaction
 *
 * @see https://developer.paypal.com/docs/classic/api/
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { AbstractPaymentProvider } from './abstract-payment.provider';
import {
  PaymentProviderType, ProviderConfig, ProviderHealth, TransactionRequest,
  TransactionResponse, TransactionStatus, TransactionType, TokenizedCard,
  CardData, CardBrand, AVSResult, CVVResult,
} from '../types/payment.types';

export interface PayPalClassicCredentials {
  apiUsername: string;
  apiPassword: string;
  apiSignature: string;
  environment: 'sandbox' | 'production';
}

interface NVPParams { [key: string]: string; }
interface NVPResponse { ACK: string; TRANSACTIONID?: string; AUTHORIZATIONID?: string; CORRELATIONID: string; VERSION: string; BUILD: string; AMT?: string; CURRENCYCODE?: string; AVSCODE?: string; CVV2MATCH?: string; L_ERRORCODE0?: string; L_SHORTMESSAGE0?: string; L_LONGMESSAGE0?: string; [key: string]: string | undefined; }

@Injectable()
export class PayPalClassicProvider extends AbstractPaymentProvider {
  private readonly credentials: PayPalClassicCredentials;
  private readonly apiEndpoint: string;
  private readonly apiVersion = '124.0';

  constructor(config: ProviderConfig, configService?: ConfigService) {
    super(config);
    this.credentials = config.credentials as PayPalClassicCredentials;
    this.apiEndpoint = this.credentials.environment === 'production'
      ? 'api-3t.paypal.com'
      : 'api-3t.sandbox.paypal.com';
    this.logger.log(`PayPalClassicProvider initialized (${this.credentials.environment}) [LEGACY]`);
  }

  getProviderType(): PaymentProviderType { return PaymentProviderType.PAYPAL_CLASSIC; }

  async sale(request: TransactionRequest): Promise<TransactionResponse> {
    const startTime = Date.now();
    this.logTransaction('SALE', request);
    try {
      const params = this.buildDoDirectPaymentParams(request, 'Sale');
      const response = await this.sendRequest(params);
      const result = this.parseResponse(request, response);
      this.updateHealth(result.success, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'CONNECTION_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'CONNECTION_ERROR', `Failed to connect to PayPal: ${(error as Error).message}`);
    }
  }

  async authorize(request: TransactionRequest): Promise<TransactionResponse> {
    const startTime = Date.now();
    this.logTransaction('AUTHORIZE', request);
    try {
      const params = this.buildDoDirectPaymentParams(request, 'Authorization');
      const response = await this.sendRequest(params);
      const result = this.parseResponse(request, response);
      this.updateHealth(result.success, Date.now() - startTime);
      return result;
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
      originalTransactionId: transactionId
    };
    try {
      const params: NVPParams = {
        ...this.getAuthParams(),
        METHOD: 'DoCapture',
        AUTHORIZATIONID: transactionId,
        AMT: this.formatAmount(amount || 0),
        CURRENCYCODE: 'USD',
        COMPLETETYPE: amount ? 'NotComplete' : 'Complete',
      };
      const response = await this.sendRequest(params);
      const result = this.parseResponse(request, response);
      this.updateHealth(result.success, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'CONNECTION_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'CONNECTION_ERROR', `Failed: ${(error as Error).message}`);
    }
  }

  async void(transactionId: string): Promise<TransactionResponse> {
    const startTime = Date.now();
    const request: TransactionRequest = {
      referenceId: this.generateReferenceId(),
      type: TransactionType.VOID,
      amount: 0,
      currency: 'USD',
      originalTransactionId: transactionId
    };
    try {
      const params: NVPParams = {
        ...this.getAuthParams(),
        METHOD: 'DoVoid',
        AUTHORIZATIONID: transactionId,
        NOTE: 'Voided via API',
      };
      const response = await this.sendRequest(params);
      const result = this.parseResponse(request, response);
      if (result.success) result.status = TransactionStatus.VOIDED;
      this.updateHealth(result.success, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'CONNECTION_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'CONNECTION_ERROR', `Failed: ${(error as Error).message}`);
    }
  }

  async refund(transactionId: string, amount?: number): Promise<TransactionResponse> {
    const startTime = Date.now();
    const request: TransactionRequest = {
      referenceId: this.generateReferenceId(),
      type: TransactionType.REFUND,
      amount: amount || 0,
      currency: 'USD',
      originalTransactionId: transactionId
    };
    try {
      const params: NVPParams = {
        ...this.getAuthParams(),
        METHOD: 'RefundTransaction',
        TRANSACTIONID: transactionId,
        REFUNDTYPE: amount ? 'Partial' : 'Full',
      };
      if (amount) {
        params.AMT = this.formatAmount(amount);
        params.CURRENCYCODE = 'USD';
      }
      const response = await this.sendRequest(params);
      const result = this.parseResponse(request, response);
      if (result.success) result.status = TransactionStatus.REFUNDED;
      this.updateHealth(result.success, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'CONNECTION_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'CONNECTION_ERROR', `Failed: ${(error as Error).message}`);
    }
  }

  async verify(request: TransactionRequest): Promise<TransactionResponse> {
    // PayPal Classic: Do a $0 authorization to verify the card
    return this.authorize({ ...request, amount: 0, type: TransactionType.VERIFY });
  }

  async tokenize(card: CardData): Promise<TokenizedCard> {
    // PayPal Classic NVP doesn't have native tokenization
    // We can simulate by doing a $0 auth and using the transaction ID as a reference
    const startTime = Date.now();
    try {
      const request: TransactionRequest = {
        referenceId: this.generateReferenceId(),
        type: TransactionType.VERIFY,
        amount: 0,
        currency: 'USD',
        card,
      };
      const params = this.buildDoDirectPaymentParams(request, 'Authorization');
      const response = await this.sendRequest(params);

      if (response.ACK !== 'Success' && response.ACK !== 'SuccessWithWarning') {
        throw new Error(`Tokenization failed: ${response.L_LONGMESSAGE0 || response.L_SHORTMESSAGE0 || 'Unknown error'}`);
      }

      const tokenizedCard: TokenizedCard = {
        token: response.TRANSACTIONID || response.AUTHORIZATIONID || '',
        last4: card.number.slice(-4),
        brand: this.detectCardBrand(card.number),
        expiryMonth: parseInt(card.expiryMonth, 10),
        expiryYear: this.normalizeYear(card.expiryYear),
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
    // PayPal Classic doesn't have token management
    // The "tokens" are just transaction IDs that can't be deleted
    return true;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      // Use GetBalance as a health check - lightweight API call
      const params: NVPParams = {
        ...this.getAuthParams(),
        METHOD: 'GetBalance',
        RETURNALLCURRENCIES: '0',
      };
      const response = await this.sendRequest(params);

      if (response.ACK === 'Success' || response.ACK === 'SuccessWithWarning') {
        this.health.status = 'healthy';
      } else {
        this.health.status = 'degraded';
        this.health.lastError = {
          code: response.L_ERRORCODE0 || 'UNKNOWN',
          message: response.L_SHORTMESSAGE0 || 'Unknown error',
          timestamp: new Date(),
        };
      }
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

  private getAuthParams(): NVPParams {
    return {
      USER: this.credentials.apiUsername,
      PWD: this.credentials.apiPassword,
      SIGNATURE: this.credentials.apiSignature,
      VERSION: this.apiVersion,
    };
  }

  private buildDoDirectPaymentParams(request: TransactionRequest, paymentAction: 'Sale' | 'Authorization'): NVPParams {
    const params: NVPParams = {
      ...this.getAuthParams(),
      METHOD: 'DoDirectPayment',
      PAYMENTACTION: paymentAction,
      AMT: this.formatAmount(request.amount),
      CURRENCYCODE: request.currency || 'USD',
      INVNUM: request.orderId || request.referenceId,
      CUSTOM: request.referenceId,
    };

    // Card details
    if (request.card) {
      params.CREDITCARDTYPE = this.getPayPalCardType(this.detectCardBrand(request.card.number));
      params.ACCT = request.card.number;
      params.EXPDATE = this.formatExpiry(request.card.expiryMonth, request.card.expiryYear);
      params.CVV2 = request.card.cvv;
      if (request.card.cardholderName) {
        const nameParts = request.card.cardholderName.split(' ');
        params.FIRSTNAME = nameParts[0] || '';
        params.LASTNAME = nameParts.slice(1).join(' ') || nameParts[0] || '';
      }
    }

    // Billing address
    if (request.billingAddress) {
      const addr = request.billingAddress;
      params.FIRSTNAME = params.FIRSTNAME || addr.firstName;
      params.LASTNAME = params.LASTNAME || addr.lastName;
      params.STREET = addr.street1;
      if (addr.street2) params.STREET2 = addr.street2;
      params.CITY = addr.city;
      params.STATE = addr.state;
      params.ZIP = addr.postalCode;
      params.COUNTRYCODE = this.getCountryCode(addr.country);
      if (addr.email) params.EMAIL = addr.email;
      if (addr.phone) params.PHONENUM = addr.phone;
    }

    // Shipping address
    if (request.shippingAddress) {
      const ship = request.shippingAddress;
      params.SHIPTONAME = `${ship.firstName} ${ship.lastName}`;
      params.SHIPTOSTREET = ship.street1;
      if (ship.street2) params.SHIPTOSTREET2 = ship.street2;
      params.SHIPTOCITY = ship.city;
      params.SHIPTOSTATE = ship.state;
      params.SHIPTOZIP = ship.postalCode;
      params.SHIPTOCOUNTRYCODE = this.getCountryCode(ship.country);
      if (ship.phone) params.SHIPTOPHONENUM = ship.phone;
    }

    // IP address for fraud detection
    if (request.ipAddress) params.IPADDRESS = request.ipAddress;

    // Recurring flag
    if (request.isRecurring) params.RECURRING = 'Y';

    // Description
    if (request.description) params.DESC = request.description.substring(0, 127);

    return params;
  }

  private async sendRequest(params: NVPParams): Promise<NVPResponse> {
    return this.executeWithRetry(async () => {
      return new Promise<NVPResponse>((resolve, reject) => {
        const postData = this.encodeParams(params);
        const options: https.RequestOptions = {
          hostname: this.apiEndpoint,
          port: 443,
          path: '/nvp',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
          },
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              resolve(this.decodeResponse(data));
            } catch (error) {
              reject(new Error(`Failed to parse response: ${data}`));
            }
          });
        });

        req.on('error', (error) => { reject(error); });
        req.setTimeout(45000, () => { req.destroy(); reject(new Error('Request timeout')); });
        req.write(postData);
        req.end();
      });
    }, 'PayPal Classic API Request');
  }

  private encodeParams(params: NVPParams): string {
    return Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  private decodeResponse(data: string): NVPResponse {
    const response: NVPResponse = { ACK: '', CORRELATIONID: '', VERSION: '', BUILD: '' };
    data.split('&').forEach(pair => {
      const [key, ...valueParts] = pair.split('=');
      response[decodeURIComponent(key)] = decodeURIComponent(valueParts.join('='));
    });
    return response;
  }

  private parseResponse(request: TransactionRequest, response: NVPResponse): TransactionResponse {
    const success = response.ACK === 'Success' || response.ACK === 'SuccessWithWarning';
    const transactionId = response.TRANSACTIONID || response.AUTHORIZATIONID || '';

    const txnResponse: TransactionResponse = {
      success,
      status: success ? TransactionStatus.APPROVED : this.mapErrorToStatus(response.L_ERRORCODE0),
      transactionId,
      referenceId: request.referenceId,
      amount: request.amount,
      currency: request.currency,
      avsResult: this.mapAVSResult(response.AVSCODE),
      cvvResult: this.mapCVVResult(response.CVV2MATCH),
      rawResponse: response as unknown as Record<string, unknown>,
      processedAt: new Date(),
    };

    if (!success) {
      txnResponse.errorCode = response.L_ERRORCODE0;
      txnResponse.errorMessage = response.L_LONGMESSAGE0 || response.L_SHORTMESSAGE0;

      // Determine if this is a decline vs error
      const declineCodes = ['10752', '10759', '10761', '10762', '15005', '15006', '15007'];
      if (declineCodes.includes(response.L_ERRORCODE0 || '')) {
        txnResponse.status = TransactionStatus.DECLINED;
        txnResponse.declineCode = response.L_ERRORCODE0;
      }
    }

    return txnResponse;
  }

  private mapErrorToStatus(errorCode?: string): TransactionStatus {
    if (!errorCode) return TransactionStatus.ERROR;

    // Decline codes
    const declineCodes = ['10752', '10759', '10761', '10762', '15005', '15006', '15007'];
    if (declineCodes.includes(errorCode)) return TransactionStatus.DECLINED;

    // Review codes
    const reviewCodes = ['10553', '10554', '10555'];
    if (reviewCodes.includes(errorCode)) return TransactionStatus.HELD_FOR_REVIEW;

    return TransactionStatus.ERROR;
  }

  private mapAVSResult(avsCode?: string): AVSResult {
    if (!avsCode) return AVSResult.NOT_AVAILABLE;

    const avsMap: Record<string, AVSResult> = {
      'A': AVSResult.ADDRESS_MATCH,   // Address only
      'B': AVSResult.ADDRESS_MATCH,   // Address only (international)
      'C': AVSResult.NO_MATCH,        // No match (international)
      'D': AVSResult.MATCH,           // Full match (international)
      'E': AVSResult.ERROR,           // Not allowed for MOTO
      'F': AVSResult.MATCH,           // Full match (UK)
      'G': AVSResult.NOT_SUPPORTED,   // Global unavailable
      'I': AVSResult.NOT_SUPPORTED,   // International unavailable
      'N': AVSResult.NO_MATCH,        // No match
      'P': AVSResult.ZIP_MATCH,       // Postal match (international)
      'R': AVSResult.ERROR,           // Retry
      'S': AVSResult.NOT_SUPPORTED,   // Service not supported
      'U': AVSResult.NOT_AVAILABLE,   // Unavailable
      'W': AVSResult.ZIP_MATCH,       // 9-digit ZIP match
      'X': AVSResult.MATCH,           // Exact match (9-digit ZIP)
      'Y': AVSResult.MATCH,           // Full match (5-digit ZIP)
      'Z': AVSResult.ZIP_MATCH,       // 5-digit ZIP match
    };

    return avsMap[avsCode] || AVSResult.NOT_AVAILABLE;
  }

  private mapCVVResult(cvv2Match?: string): CVVResult {
    if (!cvv2Match) return CVVResult.NOT_PROCESSED;

    const cvvMap: Record<string, CVVResult> = {
      'M': CVVResult.MATCH,
      'N': CVVResult.NO_MATCH,
      'P': CVVResult.NOT_PROCESSED,
      'S': CVVResult.NOT_PRESENT,
      'U': CVVResult.NOT_SUPPORTED,
      'X': CVVResult.NOT_PROCESSED,
    };

    return cvvMap[cvv2Match] || CVVResult.ERROR;
  }

  private getPayPalCardType(brand: CardBrand): string {
    const typeMap: Record<CardBrand, string> = {
      [CardBrand.VISA]: 'Visa',
      [CardBrand.MASTERCARD]: 'MasterCard',
      [CardBrand.AMEX]: 'Amex',
      [CardBrand.DISCOVER]: 'Discover',
      [CardBrand.DINERS]: 'DinersClub',
      [CardBrand.JCB]: 'JCB',
      [CardBrand.UNIONPAY]: 'UnionPay',
      [CardBrand.UNKNOWN]: 'Visa',
    };
    return typeMap[brand];
  }

  private getCountryCode(country: string): string {
    // If already a 2-letter code, return as-is
    if (country.length === 2) return country.toUpperCase();

    // Common country name mappings
    const countryMap: Record<string, string> = {
      'united states': 'US',
      'usa': 'US',
      'canada': 'CA',
      'united kingdom': 'GB',
      'uk': 'GB',
      'australia': 'AU',
      'germany': 'DE',
      'france': 'FR',
      'spain': 'ES',
      'italy': 'IT',
      'netherlands': 'NL',
      'mexico': 'MX',
    };

    return countryMap[country.toLowerCase()] || country.substring(0, 2).toUpperCase();
  }

  private formatExpiry(month: string, year: string): string {
    // PayPal Classic expects MMYYYY format
    const mm = month.padStart(2, '0');
    const yyyy = year.length === 4 ? year : `20${year}`;
    return `${mm}${yyyy}`;
  }

  private normalizeYear(year: string): number {
    const y = parseInt(year, 10);
    return y < 100 ? 2000 + y : y;
  }

  private detectCardBrand(cardNumber: string): CardBrand {
    const num = cardNumber.replace(/\D/g, '');
    if (/^4/.test(num)) return CardBrand.VISA;
    if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) return CardBrand.MASTERCARD;
    if (/^3[47]/.test(num)) return CardBrand.AMEX;
    if (/^6(?:011|5)/.test(num)) return CardBrand.DISCOVER;
    if (/^3(?:0[0-5]|[68])/.test(num)) return CardBrand.DINERS;
    if (/^35(?:2[89]|[3-8])/.test(num)) return CardBrand.JCB;
    if (/^62/.test(num)) return CardBrand.UNIONPAY;
    return CardBrand.UNKNOWN;
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
