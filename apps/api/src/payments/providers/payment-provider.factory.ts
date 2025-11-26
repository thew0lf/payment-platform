import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AbstractPaymentProvider } from './abstract-payment.provider';
import { PayflowProvider } from './payflow.provider';
import { PaymentProviderType, ProviderConfig, ProviderHealth, PayflowCredentials } from '../types/payment.types';

@Injectable()
export class PaymentProviderFactory implements OnModuleInit {
  private readonly logger = new Logger(PaymentProviderFactory.name);
  private readonly providers: Map<string, AbstractPaymentProvider> = new Map();
  private readonly providersByCompany: Map<string, string[]> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('PaymentProviderFactory initializing...');
    await this.registerDefaultProviders();
  }

  private async registerDefaultProviders(): Promise<void> {
    const payflowVendor = this.configService.get<string>('PAYFLOW_VENDOR');
    if (payflowVendor) {
      const defaultConfig: ProviderConfig = {
        id: 'default-payflow', companyId: 'system', name: 'Default Payflow', type: PaymentProviderType.PAYFLOW,
        credentials: { vendor: payflowVendor, user: this.configService.get<string>('PAYFLOW_USER') || '', password: this.configService.get<string>('PAYFLOW_PASSWORD') || '', partner: this.configService.get<string>('PAYFLOW_PARTNER') || 'PayPal', environment: (this.configService.get<string>('NODE_ENV') === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production' } as PayflowCredentials,
        isDefault: true, isActive: true, priority: 1, supportsTokenization: true, supportsRecurring: true, supports3DSecure: false, supportsACH: false, maxRetries: 3, retryDelayMs: 1000
      };
      this.registerProvider(defaultConfig);
      this.logger.log('Default Payflow provider registered from environment');
    }
  }

  registerProvider(config: ProviderConfig): AbstractPaymentProvider {
    const provider = this.createProvider(config);
    this.providers.set(config.id, provider);
    const companyProviders = this.providersByCompany.get(config.companyId) || [];
    if (!companyProviders.includes(config.id)) { companyProviders.push(config.id); this.providersByCompany.set(config.companyId, companyProviders); }
    this.logger.log(`Registered provider: ${config.name} (${config.type}) for company ${config.companyId}`);
    return provider;
  }

  private createProvider(config: ProviderConfig): AbstractPaymentProvider {
    switch (config.type) {
      case PaymentProviderType.PAYFLOW: return new PayflowProvider(config, this.configService);
      default: throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }

  getProvider(providerId: string): AbstractPaymentProvider | undefined { return this.providers.get(providerId); }
  getProvidersByCompany(companyId: string): AbstractPaymentProvider[] { const providerIds = this.providersByCompany.get(companyId) || []; return providerIds.map((id) => this.providers.get(id)).filter((p): p is AbstractPaymentProvider => p !== undefined); }
  getDefaultProvider(companyId: string): AbstractPaymentProvider | undefined { return this.getProvidersByCompany(companyId).find((p) => p.getConfig().isDefault && p.isAvailable()); }
  getActiveProviders(companyId: string): AbstractPaymentProvider[] { return this.getProvidersByCompany(companyId).filter((p) => p.isAvailable()).sort((a, b) => a.getConfig().priority - b.getConfig().priority); }
  async getProvidersHealth(companyId: string): Promise<ProviderHealth[]> { return Promise.all(this.getProvidersByCompany(companyId).map((p) => p.healthCheck())); }
  getProviderByType(companyId: string, type: PaymentProviderType): AbstractPaymentProvider | undefined { return this.getProvidersByCompany(companyId).find((p) => p.getProviderType() === type && p.isAvailable()); }
  unregisterProvider(providerId: string): boolean { const provider = this.providers.get(providerId); if (!provider) return false; const config = provider.getConfig(); this.providers.delete(providerId); const companyProviders = this.providersByCompany.get(config.companyId) || []; const index = companyProviders.indexOf(providerId); if (index > -1) { companyProviders.splice(index, 1); this.providersByCompany.set(config.companyId, companyProviders); } return true; }
  getAllProviders(): AbstractPaymentProvider[] { return Array.from(this.providers.values()); }
}
