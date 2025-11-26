import { Logger } from '@nestjs/common';
import {
  PaymentProviderType,
  ProviderConfig,
  ProviderHealth,
  TransactionRequest,
  TransactionResponse,
  TransactionStatus,
  TokenizedCard,
  CardData,
} from '../types/payment.types';

export abstract class AbstractPaymentProvider {
  protected readonly logger: Logger;
  protected config: ProviderConfig;
  protected health: ProviderHealth;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.logger = new Logger(`${this.getProviderType()}Provider`);
    this.health = {
      providerId: config.id,
      status: 'healthy',
      latencyMs: 0,
      lastChecked: new Date(),
      successRate: 100,
      errorRate: 0,
    };
  }

  abstract getProviderType(): PaymentProviderType;
  abstract sale(request: TransactionRequest): Promise<TransactionResponse>;
  abstract authorize(request: TransactionRequest): Promise<TransactionResponse>;
  abstract capture(transactionId: string, amount?: number): Promise<TransactionResponse>;
  abstract void(transactionId: string): Promise<TransactionResponse>;
  abstract refund(transactionId: string, amount?: number): Promise<TransactionResponse>;
  abstract verify(request: TransactionRequest): Promise<TransactionResponse>;
  abstract tokenize(card: CardData): Promise<TokenizedCard>;
  abstract deleteToken(token: string): Promise<boolean>;
  abstract healthCheck(): Promise<ProviderHealth>;

  getConfig(): ProviderConfig {
    return this.config;
  }

  getHealth(): ProviderHealth {
    return this.health;
  }

  isAvailable(): boolean {
    return this.config.isActive && this.health.status !== 'down';
  }

  supportsFeature(feature: 'tokenization' | 'recurring' | '3ds' | 'ach'): boolean {
    switch (feature) {
      case 'tokenization': return this.config.supportsTokenization;
      case 'recurring': return this.config.supportsRecurring;
      case '3ds': return this.config.supports3DSecure;
      case 'ach': return this.config.supportsACH;
      default: return false;
    }
  }

  validateAmount(amount: number): { valid: boolean; error?: string } {
    if (this.config.minTransactionAmount && amount < this.config.minTransactionAmount) {
      return { valid: false, error: `Amount ${amount} is below minimum ${this.config.minTransactionAmount}` };
    }
    if (this.config.maxTransactionAmount && amount > this.config.maxTransactionAmount) {
      return { valid: false, error: `Amount ${amount} exceeds maximum ${this.config.maxTransactionAmount}` };
    }
    return { valid: true };
  }

  protected formatAmount(amountInCents: number, decimalPlaces: number = 2): string {
    return (amountInCents / 100).toFixed(decimalPlaces);
  }

  protected parseAmount(amountString: string): number {
    return Math.round(parseFloat(amountString) * 100);
  }

  protected generateReferenceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${this.getProviderType()}-${timestamp}-${random}`.toUpperCase();
  }

  protected createErrorResponse(
    request: TransactionRequest,
    errorCode: string,
    errorMessage: string,
    rawResponse?: Record<string, unknown>,
  ): TransactionResponse {
    return {
      success: false,
      status: TransactionStatus.ERROR,
      transactionId: '',
      referenceId: request.referenceId,
      amount: request.amount,
      currency: request.currency,
      errorCode,
      errorMessage,
      rawResponse,
      processedAt: new Date(),
    };
  }

  protected createDeclineResponse(
    request: TransactionRequest,
    transactionId: string,
    declineCode: string,
    declineMessage: string,
    rawResponse?: Record<string, unknown>,
  ): TransactionResponse {
    return {
      success: false,
      status: TransactionStatus.DECLINED,
      transactionId,
      referenceId: request.referenceId,
      amount: request.amount,
      currency: request.currency,
      declineCode,
      errorMessage: declineMessage,
      rawResponse,
      processedAt: new Date(),
    };
  }

  protected updateHealth(success: boolean, latencyMs: number, error?: { code: string; message: string }): void {
    this.health.lastChecked = new Date();
    this.health.latencyMs = latencyMs;
    const weight = 0.1;
    if (success) {
      this.health.successRate = this.health.successRate * (1 - weight) + 100 * weight;
      this.health.errorRate = this.health.errorRate * (1 - weight);
    } else {
      this.health.successRate = this.health.successRate * (1 - weight);
      this.health.errorRate = this.health.errorRate * (1 - weight) + 100 * weight;
      this.health.lastError = { code: error?.code || 'UNKNOWN', message: error?.message || 'Unknown error', timestamp: new Date() };
    }
    if (this.health.errorRate > 50) this.health.status = 'down';
    else if (this.health.errorRate > 20 || this.health.latencyMs > 5000) this.health.status = 'degraded';
    else this.health.status = 'healthy';
  }

  protected async executeWithRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`${operationName} attempt ${attempt}/${this.config.maxRetries} failed: ${lastError.message}`);
        if (attempt < this.config.maxRetries) await this.delay(this.config.retryDelayMs * attempt);
      }
    }
    throw lastError;
  }

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 8) return '****';
    return `****${cardNumber.slice(-4)}`;
  }

  protected logTransaction(operation: string, request: Partial<TransactionRequest>, response?: TransactionResponse): void {
    const safeRequest = {
      ...request,
      card: request.card ? { number: this.maskCardNumber(request.card.number), expiryMonth: request.card.expiryMonth, expiryYear: request.card.expiryYear, cvv: '***' } : undefined,
    };
    this.logger.log({ operation, providerId: this.config.id, request: safeRequest, response: response ? { success: response.success, status: response.status, transactionId: response.transactionId, errorCode: response.errorCode } : undefined });
  }
}
