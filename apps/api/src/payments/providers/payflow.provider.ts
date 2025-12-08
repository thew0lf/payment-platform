import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { AbstractPaymentProvider } from './abstract-payment.provider';
import {
  PaymentProviderType, ProviderConfig, ProviderHealth, TransactionRequest,
  TransactionResponse, TransactionStatus, TransactionType, TokenizedCard,
  CardData, CardBrand, AVSResult, CVVResult, PayflowCredentials,
} from '../types/payment.types';

interface PayflowParams { [key: string]: string; }
interface PayflowResponse { RESULT: string; PNREF: string; RESPMSG: string; AUTHCODE?: string; AVSADDR?: string; AVSZIP?: string; CVV2MATCH?: string; [key: string]: string | undefined; }

@Injectable()
export class PayflowProvider extends AbstractPaymentProvider {
  private readonly credentials: PayflowCredentials;
  private readonly apiEndpoint: string;

  constructor(config: ProviderConfig, configService?: ConfigService) {
    super(config);
    this.credentials = config.credentials as PayflowCredentials;
    this.apiEndpoint = this.credentials.environment === 'production' ? 'payflowpro.paypal.com' : 'pilot-payflowpro.paypal.com';
    this.logger.log(`PayflowProvider initialized (${this.credentials.environment})`);
  }

  getProviderType(): PaymentProviderType { return PaymentProviderType.PAYFLOW; }

  async sale(request: TransactionRequest): Promise<TransactionResponse> {
    const startTime = Date.now();
    this.logTransaction('SALE', request);
    try {
      const params = this.buildTransactionParams(request, 'S');
      const response = await this.sendRequest(params);
      const result = this.parseResponse(request, response);
      this.updateHealth(result.success, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'CONNECTION_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'CONNECTION_ERROR', `Failed to connect to Payflow: ${(error as Error).message}`);
    }
  }

  async authorize(request: TransactionRequest): Promise<TransactionResponse> {
    const startTime = Date.now();
    try {
      const params = this.buildTransactionParams(request, 'A');
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
    const request: TransactionRequest = { referenceId: this.generateReferenceId(), type: TransactionType.CAPTURE, amount: amount || 0, currency: 'USD', originalTransactionId: transactionId };
    try {
      const params: PayflowParams = { ...this.getAuthParams(), TRXTYPE: 'D', ORIGID: transactionId };
      if (amount) params.AMT = this.formatAmount(amount);
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
    const request: TransactionRequest = { referenceId: this.generateReferenceId(), type: TransactionType.VOID, amount: 0, currency: 'USD', originalTransactionId: transactionId };
    try {
      const params: PayflowParams = { ...this.getAuthParams(), TRXTYPE: 'V', ORIGID: transactionId };
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
    const request: TransactionRequest = { referenceId: this.generateReferenceId(), type: TransactionType.REFUND, amount: amount || 0, currency: 'USD', originalTransactionId: transactionId };
    try {
      const params: PayflowParams = { ...this.getAuthParams(), TRXTYPE: 'C', ORIGID: transactionId };
      if (amount) params.AMT = this.formatAmount(amount);
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
    return this.authorize({ ...request, amount: 0, type: TransactionType.VERIFY });
  }

  async tokenize(card: CardData): Promise<TokenizedCard> {
    const startTime = Date.now();
    try {
      const params: PayflowParams = { ...this.getAuthParams(), TRXTYPE: 'A', TENDER: 'C', AMT: '0.00', ACCT: card.number, EXPDATE: this.formatExpiry(card.expiryMonth, card.expiryYear), CVV2: card.cvv };
      if (card.cardholderName) params.NAME = card.cardholderName;
      const response = await this.sendRequest(params);
      if (response.RESULT !== '0') throw new Error(`Tokenization failed: ${response.RESPMSG}`);
      const tokenizedCard: TokenizedCard = { token: response.PNREF, last4: card.number.slice(-4), brand: this.detectCardBrand(card.number), expiryMonth: parseInt(card.expiryMonth, 10), expiryYear: this.normalizeYear(card.expiryYear), fingerprint: this.generateSecureFingerprint(card.number) };
      this.updateHealth(true, Date.now() - startTime);
      return tokenizedCard;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'TOKENIZATION_ERROR', message: (error as Error).message });
      throw error;
    }
  }

  async deleteToken(token: string): Promise<boolean> { return true; }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      const params: PayflowParams = { ...this.getAuthParams(), TRXTYPE: 'I', ORIGID: 'HEALTHCHECK' };
      await this.sendRequest(params);
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

  private getAuthParams(): PayflowParams {
    return { VENDOR: this.credentials.vendor, USER: this.credentials.user, PWD: this.credentials.password, PARTNER: this.credentials.partner };
  }

  private buildTransactionParams(request: TransactionRequest, trxType: string): PayflowParams {
    const params: PayflowParams = { ...this.getAuthParams(), TRXTYPE: trxType, TENDER: 'C', AMT: this.formatAmount(request.amount), CURRENCY: request.currency || 'USD', COMMENT1: request.referenceId };
    if (request.card) { params.ACCT = request.card.number; params.EXPDATE = this.formatExpiry(request.card.expiryMonth, request.card.expiryYear); params.CVV2 = request.card.cvv; if (request.card.cardholderName) params.NAME = request.card.cardholderName; }
    if (request.token) params.ORIGID = request.token;
    if (request.billingAddress) { const addr = request.billingAddress; params.FIRSTNAME = addr.firstName; params.LASTNAME = addr.lastName; params.STREET = addr.street1; params.CITY = addr.city; params.STATE = addr.state; params.ZIP = addr.postalCode; params.COUNTRY = addr.country; if (addr.email) params.EMAIL = addr.email; if (addr.phone) params.PHONENUM = addr.phone; }
    if (request.orderId) params.PONUM = request.orderId;
    if (request.description) params.COMMENT2 = request.description;
    if (request.ipAddress) params.CUSTIP = request.ipAddress;
    if (request.isRecurring) params.RECURRING = 'Y';
    return params;
  }

  private async sendRequest(params: PayflowParams): Promise<PayflowResponse> {
    return this.executeWithRetry(async () => {
      return new Promise<PayflowResponse>((resolve, reject) => {
        const postData = this.encodeParams(params);
        const options: https.RequestOptions = { hostname: this.apiEndpoint, port: 443, path: '/', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData), 'X-VPS-Request-ID': this.generateRequestId(), 'X-VPS-Client-Timeout': '45' } };
        const req = https.request(options, (res) => { let data = ''; res.on('data', (chunk) => { data += chunk; }); res.on('end', () => { try { resolve(this.decodeResponse(data)); } catch (error) { reject(new Error(`Failed to parse response: ${data}`)); } }); });
        req.on('error', (error) => { reject(error); });
        req.setTimeout(45000, () => { req.destroy(); reject(new Error('Request timeout')); });
        req.write(postData);
        req.end();
      });
    }, 'Payflow API Request');
  }

  private encodeParams(params: PayflowParams): string { return Object.entries(params).map(([key, value]) => value.includes('&') || value.includes('=') ? `${key}[${value.length}]=${value}` : `${key}=${value}`).join('&'); }
  private decodeResponse(data: string): PayflowResponse { const response: PayflowResponse = { RESULT: '', PNREF: '', RESPMSG: '' }; data.split('&').forEach(pair => { const [key, ...valueParts] = pair.split('='); response[key] = valueParts.join('='); }); return response; }
  
  private parseResponse(request: TransactionRequest, response: PayflowResponse): TransactionResponse {
    const resultCode = parseInt(response.RESULT, 10);
    const success = resultCode === 0;
    const txnResponse: TransactionResponse = { success, status: this.mapResultToStatus(resultCode), transactionId: response.PNREF || '', referenceId: request.referenceId, amount: request.amount, currency: request.currency, authorizationCode: response.AUTHCODE, avsResult: this.mapAVSResult(response.AVSADDR, response.AVSZIP), cvvResult: this.mapCVVResult(response.CVV2MATCH), rawResponse: response as unknown as Record<string, unknown>, processedAt: new Date() };
    if (!success) { txnResponse.errorCode = response.RESULT; txnResponse.errorMessage = response.RESPMSG; if ([12, 13, 23].includes(resultCode)) txnResponse.declineCode = response.RESULT; }
    return txnResponse;
  }

  private mapResultToStatus(resultCode: number): TransactionStatus {
    switch (resultCode) { case 0: return TransactionStatus.APPROVED; case 12: case 13: case 23: return TransactionStatus.DECLINED; case 126: return TransactionStatus.HELD_FOR_REVIEW; default: return TransactionStatus.ERROR; }
  }

  private mapAVSResult(avsAddr?: string, avsZip?: string): AVSResult {
    if (!avsAddr && !avsZip) return AVSResult.NOT_AVAILABLE;
    const addrMatch = avsAddr === 'Y'; const zipMatch = avsZip === 'Y';
    if (addrMatch && zipMatch) return AVSResult.MATCH; if (addrMatch) return AVSResult.ADDRESS_MATCH; if (zipMatch) return AVSResult.ZIP_MATCH; return AVSResult.NO_MATCH;
  }

  private mapCVVResult(cvv2Match?: string): CVVResult {
    switch (cvv2Match) { case 'Y': return CVVResult.MATCH; case 'N': return CVVResult.NO_MATCH; case 'P': return CVVResult.NOT_PROCESSED; case 'S': return CVVResult.NOT_PRESENT; case 'U': return CVVResult.NOT_SUPPORTED; default: return CVVResult.ERROR; }
  }

  private formatExpiry(month: string, year: string): string { return `${month.padStart(2, '0')}${year.length === 4 ? year.slice(-2) : year}`; }
  private normalizeYear(year: string): number { const y = parseInt(year, 10); return y < 100 ? 2000 + y : y; }
  private detectCardBrand(cardNumber: string): CardBrand { const num = cardNumber.replace(/\D/g, ''); if (/^4/.test(num)) return CardBrand.VISA; if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) return CardBrand.MASTERCARD; if (/^3[47]/.test(num)) return CardBrand.AMEX; if (/^6(?:011|5)/.test(num)) return CardBrand.DISCOVER; return CardBrand.UNKNOWN; }
  private generateRequestId(): string { return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`; }
}
