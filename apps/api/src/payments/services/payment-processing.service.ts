import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentProviderFactory } from '../providers/payment-provider.factory';
import { AbstractPaymentProvider } from '../providers/abstract-payment.provider';
import { TransactionRequest, TransactionResponse, TransactionType, TransactionStatus, PaymentEventType, PaymentEvent, TokenizedCard, CardData, ProviderHealth } from '../types/payment.types';

export interface ProcessPaymentOptions { companyId: string; providerId?: string; allowFallback?: boolean; skipRiskCheck?: boolean; metadata?: Record<string, string>; }
export interface PaymentResult extends TransactionResponse { providerId: string; providerName: string; processingTimeMs: number; fallbackUsed: boolean; }

@Injectable()
export class PaymentProcessingService {
  private readonly logger = new Logger(PaymentProcessingService.name);
  constructor(private readonly providerFactory: PaymentProviderFactory, private readonly eventEmitter: EventEmitter2) {}

  async sale(request: TransactionRequest, options: ProcessPaymentOptions): Promise<PaymentResult> { request.type = TransactionType.SALE; return this.processTransaction(request, options, 'sale'); }
  async authorize(request: TransactionRequest, options: ProcessPaymentOptions): Promise<PaymentResult> { request.type = TransactionType.AUTHORIZATION; return this.processTransaction(request, options, 'authorize'); }
  
  async capture(transactionId: string, providerId: string, amount?: number): Promise<PaymentResult> {
    const startTime = Date.now(); const provider = this.getProviderOrThrow(providerId);
    const response = await provider.capture(transactionId, amount);
    const result = this.createPaymentResult(response, provider, Date.now() - startTime, false);
    this.emitEvent(result.success ? PaymentEventType.TRANSACTION_APPROVED : PaymentEventType.TRANSACTION_DECLINED, provider.getConfig().companyId, providerId, result);
    return result;
  }

  async void(transactionId: string, providerId: string): Promise<PaymentResult> {
    const startTime = Date.now(); const provider = this.getProviderOrThrow(providerId);
    const response = await provider.void(transactionId);
    const result = this.createPaymentResult(response, provider, Date.now() - startTime, false);
    if (result.success) this.emitEvent(PaymentEventType.TRANSACTION_VOIDED, provider.getConfig().companyId, providerId, result);
    return result;
  }

  async refund(transactionId: string, providerId: string, amount?: number): Promise<PaymentResult> {
    const startTime = Date.now(); const provider = this.getProviderOrThrow(providerId);
    const response = await provider.refund(transactionId, amount);
    const result = this.createPaymentResult(response, provider, Date.now() - startTime, false);
    if (result.success) this.emitEvent(PaymentEventType.TRANSACTION_REFUNDED, provider.getConfig().companyId, providerId, result);
    return result;
  }

  async verify(request: TransactionRequest, options: ProcessPaymentOptions): Promise<PaymentResult> { request.type = TransactionType.VERIFY; request.amount = 0; return this.processTransaction(request, options, 'verify'); }

  async tokenize(card: CardData, companyId: string, providerId?: string): Promise<TokenizedCard & { providerId: string }> {
    const provider = providerId ? this.getProviderOrThrow(providerId) : await this.getDefaultProviderOrThrowAsync(companyId);
    const token = await provider.tokenize(card);
    this.emitEvent(PaymentEventType.TOKEN_CREATED, companyId, provider.getConfig().id, { token: token.token, last4: token.last4, brand: token.brand });
    return { ...token, providerId: provider.getConfig().id };
  }

  async deleteToken(token: string, providerId: string): Promise<boolean> {
    const provider = this.getProviderOrThrow(providerId);
    const result = await provider.deleteToken(token);
    if (result) this.emitEvent(PaymentEventType.TOKEN_DELETED, provider.getConfig().companyId, providerId, { token });
    return result;
  }

  async getProvidersHealth(companyId: string): Promise<ProviderHealth[]> {
    await this.providerFactory.loadCompanyIntegrations(companyId);
    return this.providerFactory.getProvidersHealth(companyId);
  }
  async getAvailableProviders(companyId: string): Promise<Array<{ id: string; name: string; type: string; isDefault: boolean; isAvailable: boolean; health: ProviderHealth }>> {
    const providers = await this.providerFactory.getProvidersByCompanyAsync(companyId);
    return providers.map((p) => { const config = p.getConfig(); return { id: config.id, name: config.name, type: config.type, isDefault: config.isDefault, isAvailable: p.isAvailable(), health: p.getHealth() }; });
  }

  private async processTransaction(request: TransactionRequest, options: ProcessPaymentOptions, operation: 'sale' | 'authorize' | 'verify'): Promise<PaymentResult> {
    const startTime = Date.now();
    this.validateTransactionRequest(request);
    let providers: AbstractPaymentProvider[];
    if (options.providerId) { providers = [this.getProviderOrThrow(options.providerId)]; }
    else if (options.allowFallback) { providers = await this.providerFactory.getActiveProvidersAsync(options.companyId); if (providers.length === 0) throw new NotFoundException(`No active providers for company ${options.companyId}`); }
    else { const defaultProvider = await this.providerFactory.getDefaultProviderAsync(options.companyId); if (!defaultProvider) throw new NotFoundException(`No default provider for company ${options.companyId}`); providers = [defaultProvider]; }
    if (options.metadata) request.metadata = { ...request.metadata, ...options.metadata };

    let lastError: Error | null = null; let fallbackUsed = false;
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i]; const config = provider.getConfig();
      if (i > 0) { fallbackUsed = true; this.logger.warn(`Falling back to provider ${config.name}`); }
      try {
        const amountValidation = provider.validateAmount(request.amount);
        if (!amountValidation.valid) { this.logger.warn(`Skipping ${config.name}: ${amountValidation.error}`); continue; }
        let response: TransactionResponse;
        switch (operation) { case 'sale': response = await provider.sale(request); break; case 'authorize': response = await provider.authorize(request); break; case 'verify': response = await provider.verify(request); break; }
        const result = this.createPaymentResult(response, provider, Date.now() - startTime, fallbackUsed);
        this.emitEvent(result.success ? PaymentEventType.TRANSACTION_APPROVED : PaymentEventType.TRANSACTION_DECLINED, options.companyId, config.id, result);
        if (result.success || result.status === TransactionStatus.DECLINED) return result;
        if (!options.allowFallback) return result;
        lastError = new Error(result.errorMessage || 'Transaction failed');
      } catch (error) { lastError = error as Error; this.logger.error(`Provider ${config.name} error: ${lastError.message}`); if (!options.allowFallback) throw error; }
    }
    throw lastError || new Error('All payment providers failed');
  }

  private validateTransactionRequest(request: TransactionRequest): void {
    if (!request.referenceId) request.referenceId = this.generateReferenceId();
    if (request.amount < 0) throw new BadRequestException('Amount cannot be negative');
    if (!request.currency) request.currency = 'USD';
    if (!request.card && !request.token && !request.bankAccount) throw new BadRequestException('Payment method required');
    if (request.card && (!request.card.number || !request.card.expiryMonth || !request.card.expiryYear || !request.card.cvv)) throw new BadRequestException('Incomplete card data');
  }

  private getProviderOrThrow(providerId: string): AbstractPaymentProvider { const provider = this.providerFactory.getProvider(providerId); if (!provider) throw new NotFoundException(`Provider not found: ${providerId}`); if (!provider.isAvailable()) throw new BadRequestException(`Provider not available: ${providerId}`); return provider; }
  private getDefaultProviderOrThrow(companyId: string): AbstractPaymentProvider { const provider = this.providerFactory.getDefaultProvider(companyId); if (!provider) throw new NotFoundException(`No default provider for company: ${companyId}`); return provider; }
  private async getDefaultProviderOrThrowAsync(companyId: string): Promise<AbstractPaymentProvider> { const provider = await this.providerFactory.getDefaultProviderAsync(companyId); if (!provider) throw new NotFoundException(`No default provider for company: ${companyId}`); return provider; }
  private createPaymentResult(response: TransactionResponse, provider: AbstractPaymentProvider, processingTimeMs: number, fallbackUsed: boolean): PaymentResult { const config = provider.getConfig(); return { ...response, providerId: config.id, providerName: config.name, processingTimeMs, fallbackUsed }; }
  private generateReferenceId(): string { return `TXN-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase(); }
  private emitEvent(type: PaymentEventType, companyId: string, providerId: string, data: Record<string, unknown> | PaymentResult): void { const event: PaymentEvent = { id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`, type, providerId, companyId, transactionId: (data as { transactionId?: string }).transactionId, data: data as Record<string, unknown>, timestamp: new Date() }; this.eventEmitter.emit(type, event); this.eventEmitter.emit('payment.*', event); }
}
