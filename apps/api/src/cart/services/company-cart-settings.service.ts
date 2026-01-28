/**
 * Company Cart Settings Service
 *
 * Provides centralized access to cart-related company settings.
 * Settings are stored in the Company.settings JSON field under 'cart' key.
 * Also loads payment gateway configuration from ClientIntegration.
 *
 * This service handles:
 * - Loading settings from company.settings.cart
 * - Applying default values for missing settings
 * - Loading express checkout config from ClientIntegration
 * - Determining environment (SANDBOX/PRODUCTION) from integration settings
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ExpressCheckoutProvider,
  ExpressCheckoutSettings,
  UpsellSettings,
  InventoryHoldSettings,
  CartAbandonmentSettings,
  CompanyCartSettings,
  DEFAULT_EXPRESS_CHECKOUT_SETTINGS,
  DEFAULT_UPSELL_SETTINGS,
  DEFAULT_INVENTORY_HOLD_SETTINGS,
  DEFAULT_ABANDONMENT_SETTINGS,
} from '../types/cart-settings.types';
import { IntegrationCategory, IntegrationProvider, IntegrationStatus, IntegrationMode } from '../../integrations/types/integration.types';

// Mapping from IntegrationProvider to ExpressCheckoutProvider
const PAYMENT_PROVIDER_TO_EXPRESS_CHECKOUT: Partial<Record<IntegrationProvider, ExpressCheckoutProvider>> = {
  [IntegrationProvider.STRIPE]: ExpressCheckoutProvider.APPLE_PAY,
  [IntegrationProvider.PAYPAL_REST]: ExpressCheckoutProvider.PAYPAL_EXPRESS,
  [IntegrationProvider.PAYPAL_CLASSIC]: ExpressCheckoutProvider.PAYPAL_EXPRESS,
  [IntegrationProvider.PAYPAL_PAYFLOW]: ExpressCheckoutProvider.PAYPAL_EXPRESS,
};

// Providers that support Google Pay
const GOOGLE_PAY_PROVIDERS = [IntegrationProvider.STRIPE, IntegrationProvider.NMI, IntegrationProvider.AUTHORIZE_NET];

// Providers that support Apple Pay
const APPLE_PAY_PROVIDERS = [IntegrationProvider.STRIPE, IntegrationProvider.NMI, IntegrationProvider.AUTHORIZE_NET];

@Injectable()
export class CompanyCartSettingsService {
  private readonly logger = new Logger(CompanyCartSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get express checkout settings for a company
   * Loads from company settings and enriches with ClientIntegration data
   */
  async getExpressCheckoutSettings(companyId: string): Promise<ExpressCheckoutSettings> {
    const company = await this.getCompanyWithClient(companyId);
    const cartSettings = this.extractCartSettings(company.settings);
    const baseSettings = { ...DEFAULT_EXPRESS_CHECKOUT_SETTINGS, ...cartSettings.expressCheckout };

    // Load payment gateway integrations for the client
    const paymentIntegrations = await this.prisma.clientIntegration.findMany({
      where: {
        clientId: company.clientId,
        category: IntegrationCategory.PAYMENT_GATEWAY,
        status: IntegrationStatus.ACTIVE,
      },
      orderBy: { priority: 'asc' },
    });

    if (paymentIntegrations.length === 0) {
      this.logger.debug(`No active payment integrations for company ${companyId}`);
      return baseSettings;
    }

    // Determine enabled providers based on active integrations
    const enabledProviders = new Set<ExpressCheckoutProvider>();
    let environment: 'SANDBOX' | 'PRODUCTION' = 'SANDBOX';
    let applePayMerchantId: string | undefined;
    let googlePayMerchantId: string | undefined;
    let paypalClientId: string | undefined;

    for (const integration of paymentIntegrations) {
      const provider = integration.provider as IntegrationProvider;
      const integrationSettings = (integration.settings as Record<string, any>) || {};

      // Use production environment if any integration is in production mode
      if (integration.environment === 'PRODUCTION') {
        environment = 'PRODUCTION';
      }

      // Stripe supports Apple Pay, Google Pay
      if (provider === IntegrationProvider.STRIPE) {
        if (APPLE_PAY_PROVIDERS.includes(provider)) {
          enabledProviders.add(ExpressCheckoutProvider.APPLE_PAY);
          applePayMerchantId = integrationSettings.applePayMerchantId || applePayMerchantId;
        }
        if (GOOGLE_PAY_PROVIDERS.includes(provider)) {
          enabledProviders.add(ExpressCheckoutProvider.GOOGLE_PAY);
          googlePayMerchantId = integrationSettings.googlePayMerchantId || googlePayMerchantId;
        }
      }

      // NMI and Authorize.Net support Apple Pay and Google Pay
      if (provider === IntegrationProvider.NMI || provider === IntegrationProvider.AUTHORIZE_NET) {
        if (integrationSettings.applePayEnabled !== false) {
          enabledProviders.add(ExpressCheckoutProvider.APPLE_PAY);
          applePayMerchantId = integrationSettings.applePayMerchantId || applePayMerchantId;
        }
        if (integrationSettings.googlePayEnabled !== false) {
          enabledProviders.add(ExpressCheckoutProvider.GOOGLE_PAY);
          googlePayMerchantId = integrationSettings.googlePayMerchantId || googlePayMerchantId;
        }
      }

      // PayPal integrations enable PayPal Express
      if (
        provider === IntegrationProvider.PAYPAL_REST ||
        provider === IntegrationProvider.PAYPAL_CLASSIC ||
        provider === IntegrationProvider.PAYPAL_PAYFLOW
      ) {
        enabledProviders.add(ExpressCheckoutProvider.PAYPAL_EXPRESS);
        paypalClientId = integrationSettings.clientId || paypalClientId;
      }
    }

    return {
      ...baseSettings,
      enabledProviders: Array.from(enabledProviders),
      environment,
      applePayMerchantId: applePayMerchantId || baseSettings.applePayMerchantId,
      googlePayMerchantId: googlePayMerchantId || baseSettings.googlePayMerchantId,
      paypalClientId: paypalClientId || baseSettings.paypalClientId,
    };
  }

  /**
   * Get default payment gateway for a company's client
   * Returns the integration and whether it's in production mode
   */
  async getDefaultPaymentGateway(companyId: string): Promise<{
    integration: any | null;
    environment: 'SANDBOX' | 'PRODUCTION';
    provider: IntegrationProvider | null;
  }> {
    const company = await this.getCompanyWithClient(companyId);

    const integration = await this.prisma.clientIntegration.findFirst({
      where: {
        clientId: company.clientId,
        category: IntegrationCategory.PAYMENT_GATEWAY,
        status: IntegrationStatus.ACTIVE,
        isDefault: true,
      },
    });

    if (!integration) {
      // Try to get any active payment gateway
      const fallbackIntegration = await this.prisma.clientIntegration.findFirst({
        where: {
          clientId: company.clientId,
          category: IntegrationCategory.PAYMENT_GATEWAY,
          status: IntegrationStatus.ACTIVE,
        },
        orderBy: { priority: 'asc' },
      });

      return {
        integration: fallbackIntegration,
        environment: (fallbackIntegration?.environment as 'SANDBOX' | 'PRODUCTION') || 'SANDBOX',
        provider: fallbackIntegration?.provider as IntegrationProvider || null,
      };
    }

    return {
      integration,
      environment: (integration.environment as 'SANDBOX' | 'PRODUCTION') || 'SANDBOX',
      provider: integration.provider as IntegrationProvider,
    };
  }

  /**
   * Get upsell settings for a company
   */
  async getUpsellSettings(companyId: string): Promise<UpsellSettings> {
    const company = await this.getCompany(companyId);
    const cartSettings = this.extractCartSettings(company.settings);
    return { ...DEFAULT_UPSELL_SETTINGS, ...cartSettings.upsell };
  }

  /**
   * Get inventory hold settings for a company
   */
  async getInventoryHoldSettings(companyId: string): Promise<InventoryHoldSettings> {
    const company = await this.getCompany(companyId);
    const cartSettings = this.extractCartSettings(company.settings);
    return { ...DEFAULT_INVENTORY_HOLD_SETTINGS, ...cartSettings.inventoryHold };
  }

  /**
   * Get cart abandonment settings for a company
   */
  async getAbandonmentSettings(companyId: string): Promise<CartAbandonmentSettings> {
    const company = await this.getCompany(companyId);
    const cartSettings = this.extractCartSettings(company.settings);
    return { ...DEFAULT_ABANDONMENT_SETTINGS, ...cartSettings.abandonment };
  }

  /**
   * Get all cart settings for a company
   */
  async getAllCartSettings(companyId: string): Promise<{
    expressCheckout: ExpressCheckoutSettings;
    upsell: UpsellSettings;
    inventoryHold: InventoryHoldSettings;
    abandonment: CartAbandonmentSettings;
  }> {
    const [expressCheckout, upsell, inventoryHold, abandonment] = await Promise.all([
      this.getExpressCheckoutSettings(companyId),
      this.getUpsellSettings(companyId),
      this.getInventoryHoldSettings(companyId),
      this.getAbandonmentSettings(companyId),
    ]);

    return { expressCheckout, upsell, inventoryHold, abandonment };
  }

  /**
   * Update cart settings for a company
   */
  async updateCartSettings(companyId: string, settings: Partial<CompanyCartSettings>): Promise<void> {
    const company = await this.getCompany(companyId);
    const currentSettings = (company.settings as Record<string, any>) || {};
    const currentCartSettings = currentSettings.cart || {};

    const updatedCartSettings = {
      ...currentCartSettings,
      ...settings,
    };

    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        settings: {
          ...currentSettings,
          cart: updatedCartSettings,
        },
      },
    });

    this.logger.log(`Updated cart settings for company ${companyId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════

  private async getCompany(companyId: string): Promise<{ id: string; settings: any }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, settings: true },
    });

    if (!company) {
      throw new NotFoundException('We couldn\'t find that company. Please select a different one or contact support.');
    }

    return company;
  }

  private async getCompanyWithClient(companyId: string): Promise<{ id: string; clientId: string; settings: any }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, clientId: true, settings: true },
    });

    if (!company) {
      throw new NotFoundException('We couldn\'t find that company. Please select a different one or contact support.');
    }

    return company;
  }

  private extractCartSettings(settings: any): CompanyCartSettings {
    if (!settings || typeof settings !== 'object') {
      return {};
    }

    return (settings.cart as CompanyCartSettings) || {};
  }
}
