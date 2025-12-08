/**
 * NMI Payment Gateway Provider
 *
 * Network Merchants Inc (NMI) direct integration.
 * Uses URL-encoded POST requests similar to PayPal Classic.
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AbstractPaymentProvider } from './abstract-payment.provider';
import {
  PaymentProviderType, ProviderConfig, ProviderHealth, TransactionRequest,
  TransactionResponse, TransactionStatus, TransactionType, TokenizedCard,
  CardData, CardBrand, AVSResult, CVVResult, NMICredentials,
} from '../types/payment.types';

@Injectable()
export class NMIProvider extends AbstractPaymentProvider {
  private readonly credentials: NMICredentials;
  private readonly endpoint = 'https://secure.nmi.com/api/transact.php';

  constructor(config: ProviderConfig, configService?: ConfigService) {
    super(config);
    this.credentials = config.credentials as NMICredentials;
    this.logger.log(`NMIProvider initialized (${this.credentials.environment || 'sandbox'})`);
  }

  getProviderType(): PaymentProviderType { return PaymentProviderType.NMI; }

  async sale(request: TransactionRequest): Promise<TransactionResponse> {
    const startTime = Date.now();
    this.logTransaction('SALE', request);
    try {
      const params = this.buildTransactionParams(request, 'sale');
      const response = await this.sendRequest(params);
      const result = this.parseResponse(request, response);
      this.updateHealth(result.success, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'CONNECTION_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'CONNECTION_ERROR', `Failed to connect to NMI: ${(error as Error).message}`);
    }
  }

  async authorize(request: TransactionRequest): Promise<TransactionResponse> {
    const startTime = Date.now();
    this.logTransaction('AUTHORIZE', request);
    try {
      const params = this.buildTransactionParams(request, 'auth');
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
      const params = new URLSearchParams({
        security_key: this.credentials.securityKey,
        type: 'capture',
        transactionid: transactionId,
      });
      if (amount) params.append('amount', amount.toFixed(2));

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
      const params = new URLSearchParams({
        security_key: this.credentials.securityKey,
        type: 'void',
        transactionid: transactionId,
      });
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
      const params = new URLSearchParams({
        security_key: this.credentials.securityKey,
        type: 'refund',
        transactionid: transactionId,
      });
      if (amount) params.append('amount', amount.toFixed(2));

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
    const startTime = Date.now();
    this.logTransaction('VERIFY', request);
    try {
      const params = this.buildTransactionParams({ ...request, amount: 0 }, 'validate');
      const response = await this.sendRequest(params);
      const result = this.parseResponse(request, response);
      this.updateHealth(result.success, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'CONNECTION_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'CONNECTION_ERROR', `Failed: ${(error as Error).message}`);
    }
  }

  async tokenize(card: CardData): Promise<TokenizedCard> {
    const startTime = Date.now();
    try {
      // NMI supports customer vault for tokenization
      const params = new URLSearchParams({
        security_key: this.credentials.securityKey,
        customer_vault: 'add_customer',
        ccnumber: card.number,
        ccexp: this.formatExpiry(card.expiryMonth, card.expiryYear),
        cvv: card.cvv,
      });
      if (card.cardholderName) {
        const names = card.cardholderName.split(' ');
        params.append('first_name', names[0] || '');
        params.append('last_name', names.slice(1).join(' ') || names[0] || '');
      }

      const response = await this.sendRequest(params);

      if (response.get('response') !== '1') {
        throw new Error(`Tokenization failed: ${response.get('responsetext') || 'Unknown error'}`);
      }

      const tokenizedCard: TokenizedCard = {
        token: response.get('customer_vault_id') || '',
        last4: card.number.slice(-4),
        brand: this.detectCardBrand(card.number),
        expiryMonth: parseInt(card.expiryMonth, 10),
        expiryYear: this.normalizeYear(card.expiryYear),
        fingerprint: this.generateSecureFingerprint(card.number),
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
      const params = new URLSearchParams({
        security_key: this.credentials.securityKey,
        customer_vault: 'delete_customer',
        customer_vault_id: token,
      });
      const response = await this.sendRequest(params);
      return response.get('response') === '1';
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      // Use validate as a health check
      const params = new URLSearchParams({
        security_key: this.credentials.securityKey,
        type: 'validate',
        ccnumber: '4111111111111111',
        ccexp: '1225',
        cvv: '999',
      });
      const response = await this.sendRequest(params);

      if (response.get('response') === '1' || response.get('response') === '2') {
        this.health.status = 'healthy';
      } else {
        this.health.status = 'degraded';
        this.health.lastError = {
          code: response.get('response_code') || 'UNKNOWN',
          message: response.get('responsetext') || 'Unknown error',
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

  private buildTransactionParams(request: TransactionRequest, type: 'sale' | 'auth' | 'validate'): URLSearchParams {
    const params = new URLSearchParams({
      security_key: this.credentials.securityKey,
      type,
      amount: request.amount.toFixed(2),
      orderid: request.orderId || request.referenceId,
    });

    // Card details
    if (request.card) {
      params.append('ccnumber', request.card.number);
      params.append('ccexp', this.formatExpiry(request.card.expiryMonth, request.card.expiryYear));
      params.append('cvv', request.card.cvv);
      if (request.card.cardholderName) {
        const names = request.card.cardholderName.split(' ');
        params.append('first_name', names[0] || '');
        params.append('last_name', names.slice(1).join(' ') || names[0] || '');
      }
    }

    // Billing address
    if (request.billingAddress) {
      const addr = request.billingAddress;
      params.append('first_name', params.get('first_name') || addr.firstName);
      if (!params.get('last_name')) params.append('last_name', addr.lastName);
      params.append('address1', addr.street1);
      if (addr.street2) params.append('address2', addr.street2);
      params.append('city', addr.city);
      params.append('state', addr.state);
      params.append('zip', addr.postalCode);
      params.append('country', addr.country);
      if (addr.email) params.append('email', addr.email);
      if (addr.phone) params.append('phone', addr.phone);
    }

    // Shipping address
    if (request.shippingAddress) {
      const ship = request.shippingAddress;
      params.append('shipping_firstname', ship.firstName);
      params.append('shipping_lastname', ship.lastName);
      params.append('shipping_address1', ship.street1);
      if (ship.street2) params.append('shipping_address2', ship.street2);
      params.append('shipping_city', ship.city);
      params.append('shipping_state', ship.state);
      params.append('shipping_zip', ship.postalCode);
      params.append('shipping_country', ship.country);
    }

    // IP address for fraud detection
    if (request.ipAddress) params.append('ipaddress', request.ipAddress);

    return params;
  }

  private async sendRequest(params: URLSearchParams): Promise<URLSearchParams> {
    return this.executeWithRetry(async () => {
      const response = await axios.post(this.endpoint, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 45000,
      });
      return new URLSearchParams(response.data);
    }, 'NMI API Request');
  }

  private parseResponse(request: TransactionRequest, response: URLSearchParams): TransactionResponse {
    const responseCode = response.get('response');
    const success = responseCode === '1';
    const transactionId = response.get('transactionid') || '';

    const txnResponse: TransactionResponse = {
      success,
      status: success ? TransactionStatus.APPROVED : this.mapResponseToStatus(responseCode),
      transactionId,
      referenceId: request.referenceId,
      amount: request.amount,
      currency: request.currency,
      avsResult: this.mapAVSResult(response.get('avsresponse')),
      cvvResult: this.mapCVVResult(response.get('cvvresponse')),
      rawResponse: Object.fromEntries(response.entries()) as Record<string, unknown>,
      processedAt: new Date(),
    };

    if (!success) {
      txnResponse.errorCode = response.get('response_code') || responseCode || undefined;
      txnResponse.errorMessage = response.get('responsetext') || 'Transaction failed';

      if (responseCode === '2') {
        txnResponse.status = TransactionStatus.DECLINED;
        txnResponse.declineCode = response.get('response_code') || undefined;
      }
    }

    return txnResponse;
  }

  private mapResponseToStatus(responseCode?: string | null): TransactionStatus {
    if (!responseCode) return TransactionStatus.ERROR;
    if (responseCode === '1') return TransactionStatus.APPROVED;
    if (responseCode === '2') return TransactionStatus.DECLINED;
    return TransactionStatus.ERROR;
  }

  private mapAVSResult(avsCode?: string | null): AVSResult {
    if (!avsCode) return AVSResult.NOT_AVAILABLE;
    const avsMap: Record<string, AVSResult> = {
      'A': AVSResult.ADDRESS_MATCH,
      'E': AVSResult.ERROR,
      'G': AVSResult.NOT_SUPPORTED,
      'N': AVSResult.NO_MATCH,
      'R': AVSResult.ERROR,
      'S': AVSResult.NOT_SUPPORTED,
      'U': AVSResult.NOT_AVAILABLE,
      'W': AVSResult.ZIP_MATCH,
      'X': AVSResult.MATCH,
      'Y': AVSResult.MATCH,
      'Z': AVSResult.ZIP_MATCH,
    };
    return avsMap[avsCode] || AVSResult.NOT_AVAILABLE;
  }

  private mapCVVResult(cvvCode?: string | null): CVVResult {
    if (!cvvCode) return CVVResult.NOT_PROCESSED;
    const cvvMap: Record<string, CVVResult> = {
      'M': CVVResult.MATCH,
      'N': CVVResult.NO_MATCH,
      'P': CVVResult.NOT_PROCESSED,
      'S': CVVResult.NOT_PRESENT,
      'U': CVVResult.NOT_SUPPORTED,
    };
    return cvvMap[cvvCode] || CVVResult.NOT_PROCESSED;
  }

  private formatExpiry(month: string, year: string): string {
    const mm = month.padStart(2, '0');
    const yy = year.length === 4 ? year.slice(-2) : year;
    return `${mm}${yy}`;
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

}
