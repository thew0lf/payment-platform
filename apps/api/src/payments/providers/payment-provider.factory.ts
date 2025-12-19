import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AbstractPaymentProvider } from './abstract-payment.provider';
import { PayflowProvider } from './payflow.provider';
import { PayPalRestProvider } from './paypal-rest.provider';
import { PayPalClassicProvider } from './paypal-classic.provider';
import { NMIProvider } from './nmi.provider';
import { StripeProvider } from './stripe.provider';
import { PaymentProviderType, ProviderConfig, ProviderHealth, PayflowCredentials, PayPalRestCredentials, PayPalClassicCredentials, NMICredentials } from '../types/payment.types';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialEncryptionService } from '../../integrations/services/credential-encryption.service';
import { IntegrationCategory, IntegrationStatus, IntegrationProvider, IntegrationMode } from '../../integrations/types/integration.types';

@Injectable()
export class PaymentProviderFactory implements OnModuleInit {
  private readonly logger = new Logger(PaymentProviderFactory.name);
  private readonly providers: Map<string, AbstractPaymentProvider> = new Map();
  private readonly providersByCompany: Map<string, string[]> = new Map();
  private readonly loadedCompanies: Set<string> = new Set();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: CredentialEncryptionService,
  ) {}

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

  /**
   * Load client integrations from the database for a specific company.
   * Maps integrations to payment providers and registers them.
   *
   * OPTIMIZED: Batch loads platform integrations to avoid N+1 queries
   */
  async loadCompanyIntegrations(companyId: string): Promise<void> {
    if (this.loadedCompanies.has(companyId)) {
      return; // Already loaded
    }

    this.logger.log(`Loading integrations for company ${companyId}`);

    // Find the client that owns this company
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { clientId: true },
    });

    if (!company) {
      this.logger.warn(`Company not found: ${companyId}`);
      this.loadedCompanies.add(companyId);
      return;
    }

    // Load active payment gateway integrations for this client
    const integrations = await this.prisma.clientIntegration.findMany({
      where: {
        clientId: company.clientId,
        category: IntegrationCategory.PAYMENT_GATEWAY,
        status: IntegrationStatus.ACTIVE,
      },
      orderBy: { priority: 'asc' },
    });

    this.logger.log(`Found ${integrations.length} payment integrations for client ${company.clientId}`);

    // OPTIMIZATION: Batch load all platform integrations in one query to avoid N+1
    const platformIntegrationIds = integrations
      .filter(i => i.mode === IntegrationMode.PLATFORM && i.platformIntegrationId)
      .map(i => i.platformIntegrationId as string);

    const platformIntegrationsMap = new Map<string, any>();
    if (platformIntegrationIds.length > 0) {
      const platformIntegrations = await this.prisma.platformIntegration.findMany({
        where: { id: { in: platformIntegrationIds } },
      });
      for (const pi of platformIntegrations) {
        platformIntegrationsMap.set(pi.id, pi);
      }
    }

    for (const integration of integrations) {
      try {
        let credentials: any;

        if (integration.mode === IntegrationMode.PLATFORM && integration.platformIntegrationId) {
          // Use cached platform integration instead of querying
          const platformInt = platformIntegrationsMap.get(integration.platformIntegrationId);
          if (platformInt?.credentials) {
            credentials = this.encryptionService.decrypt(platformInt.credentials as any);
          } else {
            continue; // Skip if no credentials
          }
        } else if (integration.credentials) {
          // Decrypt client's own credentials
          credentials = this.encryptionService.decrypt(integration.credentials as any);
        } else {
          continue; // Skip if no credentials
        }

        // Map IntegrationProvider to PaymentProviderType
        const providerType = this.mapProviderType(integration.provider as IntegrationProvider);
        if (!providerType) {
          this.logger.warn(`Unsupported provider type: ${integration.provider}`);
          continue;
        }

        // Add environment to credentials
        credentials.environment = integration.environment?.toLowerCase() || 'sandbox';

        const config: ProviderConfig = {
          id: integration.id,
          companyId: companyId,
          name: integration.name,
          type: providerType,
          credentials: credentials as any,
          isDefault: integration.isDefault,
          isActive: true,
          priority: integration.priority,
          supportsTokenization: true,
          supportsRecurring: true,
          supports3DSecure: false,
          supportsACH: false,
          maxRetries: 3,
          retryDelayMs: 1000,
        };

        this.registerProvider(config);
        this.logger.log(`Registered provider from integration: ${integration.name} (${providerType})`);
      } catch (error) {
        this.logger.error(`Failed to register integration ${integration.id}: ${(error as Error).message}`);
      }
    }

    this.loadedCompanies.add(companyId);
  }

  private mapProviderType(provider: IntegrationProvider): PaymentProviderType | null {
    switch (provider) {
      case IntegrationProvider.PAYPAL_PAYFLOW:
        return PaymentProviderType.PAYFLOW;
      case IntegrationProvider.PAYPAL_REST:
        return PaymentProviderType.PAYPAL_REST;
      case IntegrationProvider.PAYPAL_CLASSIC:
        return PaymentProviderType.PAYPAL_CLASSIC;
      case IntegrationProvider.NMI:
        return PaymentProviderType.NMI;
      case IntegrationProvider.AUTHORIZE_NET:
        return PaymentProviderType.AUTHORIZE_NET;
      case IntegrationProvider.STRIPE:
        return PaymentProviderType.STRIPE;
      default:
        return null;
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
      case PaymentProviderType.PAYPAL_REST: return new PayPalRestProvider(config, this.configService);
      case PaymentProviderType.PAYPAL_CLASSIC: return new PayPalClassicProvider(config, this.configService);
      case PaymentProviderType.NMI: return new NMIProvider(config, this.configService);
      case PaymentProviderType.STRIPE: return new StripeProvider(config, this.configService);
      default: throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }

  getProvider(providerId: string): AbstractPaymentProvider | undefined { return this.providers.get(providerId); }

  // Synchronous version - use getProvidersByCompanyAsync for DB loading
  getProvidersByCompany(companyId: string): AbstractPaymentProvider[] {
    const providerIds = this.providersByCompany.get(companyId) || [];
    return providerIds.map((id) => this.providers.get(id)).filter((p): p is AbstractPaymentProvider => p !== undefined);
  }

  // Async version that loads from DB if needed
  async getProvidersByCompanyAsync(companyId: string): Promise<AbstractPaymentProvider[]> {
    await this.loadCompanyIntegrations(companyId);
    return this.getProvidersByCompany(companyId);
  }

  getDefaultProvider(companyId: string): AbstractPaymentProvider | undefined { return this.getProvidersByCompany(companyId).find((p) => p.getConfig().isDefault && p.isAvailable()); }

  async getDefaultProviderAsync(companyId: string): Promise<AbstractPaymentProvider | undefined> {
    await this.loadCompanyIntegrations(companyId);
    return this.getDefaultProvider(companyId);
  }

  getActiveProviders(companyId: string): AbstractPaymentProvider[] { return this.getProvidersByCompany(companyId).filter((p) => p.isAvailable()).sort((a, b) => a.getConfig().priority - b.getConfig().priority); }

  async getActiveProvidersAsync(companyId: string): Promise<AbstractPaymentProvider[]> {
    await this.loadCompanyIntegrations(companyId);
    return this.getActiveProviders(companyId);
  }

  async getProvidersHealth(companyId: string): Promise<ProviderHealth[]> { return Promise.all(this.getProvidersByCompany(companyId).map((p) => p.healthCheck())); }
  getProviderByType(companyId: string, type: PaymentProviderType): AbstractPaymentProvider | undefined { return this.getProvidersByCompany(companyId).find((p) => p.getProviderType() === type && p.isAvailable()); }

  async getProviderByTypeAsync(companyId: string, type: PaymentProviderType): Promise<AbstractPaymentProvider | undefined> {
    await this.loadCompanyIntegrations(companyId);
    return this.getProviderByType(companyId, type);
  }

  unregisterProvider(providerId: string): boolean { const provider = this.providers.get(providerId); if (!provider) return false; const config = provider.getConfig(); this.providers.delete(providerId); const companyProviders = this.providersByCompany.get(config.companyId) || []; const index = companyProviders.indexOf(providerId); if (index > -1) { companyProviders.splice(index, 1); this.providersByCompany.set(config.companyId, companyProviders); } return true; }
  getAllProviders(): AbstractPaymentProvider[] { return Array.from(this.providers.values()); }

  // Clear cached company to force reload
  invalidateCompanyCache(companyId: string): void {
    this.loadedCompanies.delete(companyId);
    const providerIds = this.providersByCompany.get(companyId) || [];
    for (const id of providerIds) {
      this.providers.delete(id);
    }
    this.providersByCompany.delete(companyId);
  }
}
