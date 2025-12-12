import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentGatewayType, PaymentSessionStatus } from '@prisma/client';
import { GatewayFactory } from './gateway.factory';
import {
  GatewayCredentials,
  GatewayConfig,
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
  StripeCreatePaymentIntentRequest,
  StripePaymentIntentResult,
  PayPalCreateOrderRequest,
  PayPalOrderResult,
} from './gateway.types';
import { SessionsService } from '../services/sessions.service';
import { StripeAdapter } from './stripe.adapter';
import { PayPalAdapter } from './paypal.adapter';
import { ClientIntegrationService } from '../../integrations/services/client-integration.service';
import { CredentialEncryptionService } from '../../integrations/services/credential-encryption.service';
import { PlatformIntegrationService } from '../../integrations/services/platform-integration.service';
import {
  IntegrationProvider,
  IntegrationCategory,
  IntegrationStatus,
  IntegrationMode,
  EncryptedCredentials,
} from '../../integrations/types/integration.types';

// ═══════════════════════════════════════════════════════════════
// PAYMENT GATEWAY SERVICE
// Orchestrates payment processing across multiple gateways
// ═══════════════════════════════════════════════════════════════

// Mapping between PaymentGatewayType and IntegrationProvider
const GATEWAY_TO_PROVIDER: Record<PaymentGatewayType, IntegrationProvider | null> = {
  [PaymentGatewayType.STRIPE]: IntegrationProvider.STRIPE,
  [PaymentGatewayType.PAYPAL]: IntegrationProvider.PAYPAL_REST,
  [PaymentGatewayType.PAYPAL_REST]: IntegrationProvider.PAYPAL_REST,
  [PaymentGatewayType.NMI]: IntegrationProvider.NMI,
  [PaymentGatewayType.AUTHORIZE_NET]: IntegrationProvider.AUTHORIZE_NET,
  [PaymentGatewayType.SQUARE]: null, // Not yet supported
  [PaymentGatewayType.OWN_HOSTED]: null, // No provider needed
};

const PROVIDER_TO_GATEWAY: Record<string, PaymentGatewayType> = {
  [IntegrationProvider.STRIPE]: PaymentGatewayType.STRIPE,
  [IntegrationProvider.PAYPAL_REST]: PaymentGatewayType.PAYPAL_REST,
  [IntegrationProvider.PAYPAL_PAYFLOW]: PaymentGatewayType.PAYPAL,
  [IntegrationProvider.NMI]: PaymentGatewayType.NMI,
  [IntegrationProvider.AUTHORIZE_NET]: PaymentGatewayType.AUTHORIZE_NET,
};

interface GatewayIntegration {
  type: PaymentGatewayType;
  credentials: GatewayCredentials;
  priority: number;
  enabled: boolean;
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayFactory: GatewayFactory,
    private readonly sessionsService: SessionsService,
    private readonly clientIntegrationService: ClientIntegrationService,
    private readonly encryptionService: CredentialEncryptionService,
    private readonly platformIntegrationService: PlatformIntegrationService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Client-Side Integration (Stripe Elements, PayPal Buttons)
  // ─────────────────────────────────────────────────────────────

  /**
   * Create a Stripe Payment Intent for client-side confirmation
   * Used with Stripe Elements
   */
  async createStripePaymentIntent(
    sessionId: string,
    companyId: string,
  ): Promise<StripePaymentIntentResult & { publishableKey: string }> {
    const session = await this.sessionsService.findById(sessionId);

    // Get Stripe credentials for the company
    const config = await this.getGatewayConfig(companyId, PaymentGatewayType.STRIPE);
    const adapter = this.gatewayFactory.getAdapter(config) as StripeAdapter;

    const intentRequest: StripeCreatePaymentIntentRequest = {
      amount: Number(session.total),
      currency: session.currency,
      customerEmail: session.customerEmail || undefined,
      metadata: {
        sessionId: session.id,
        pageId: session.pageId,
        companyId,
      },
    };

    const result = await adapter.createPaymentIntent(intentRequest);

    // Update session with payment intent ID
    await this.prisma.paymentPageSession.update({
      where: { id: sessionId },
      data: {
        gatewaySessionId: result.paymentIntentId,
        selectedGateway: PaymentGatewayType.STRIPE,
        status: PaymentSessionStatus.PROCESSING,
      },
    });

    return {
      ...result,
      publishableKey: adapter.getPublishableKey(),
    };
  }

  /**
   * Confirm Stripe payment after client-side processing
   */
  async confirmStripePayment(
    sessionId: string,
    companyId: string,
  ): Promise<PaymentResult> {
    const session = await this.sessionsService.findById(sessionId);

    if (!session.gatewaySessionId) {
      throw new BadRequestException('No payment intent found for this session');
    }

    const config = await this.getGatewayConfig(companyId, PaymentGatewayType.STRIPE);
    const adapter = this.gatewayFactory.getAdapter(config) as StripeAdapter;

    const result = await adapter.confirmPaymentIntent(session.gatewaySessionId);

    // Update session status based on result
    await this.updateSessionFromResult(sessionId, result);

    return result;
  }

  /**
   * Create a PayPal order for redirect flow
   */
  async createPayPalOrder(
    sessionId: string,
    companyId: string,
    returnUrl: string,
    cancelUrl: string,
  ): Promise<PayPalOrderResult & { clientId: string }> {
    const session = await this.sessionsService.findById(sessionId);

    const config = await this.getGatewayConfig(companyId, PaymentGatewayType.PAYPAL_REST);
    const adapter = this.gatewayFactory.getAdapter(config) as PayPalAdapter;

    const orderRequest: PayPalCreateOrderRequest = {
      amount: Number(session.total),
      currency: session.currency,
      description: `Order from ${session.page.company.name}`,
      returnUrl,
      cancelUrl,
      metadata: {
        sessionId: session.id,
        pageId: session.pageId,
      },
    };

    const result = await adapter.createPayPalOrder(orderRequest);

    // Update session with PayPal order ID
    await this.prisma.paymentPageSession.update({
      where: { id: sessionId },
      data: {
        gatewaySessionId: result.orderId,
        selectedGateway: PaymentGatewayType.PAYPAL_REST,
        status: PaymentSessionStatus.REQUIRES_ACTION,
      },
    });

    return {
      ...result,
      clientId: adapter.getClientId(),
    };
  }

  /**
   * Capture PayPal order after customer approval
   */
  async capturePayPalOrder(
    sessionId: string,
    companyId: string,
  ): Promise<PaymentResult> {
    const session = await this.sessionsService.findById(sessionId);

    if (!session.gatewaySessionId) {
      throw new BadRequestException('No PayPal order found for this session');
    }

    const config = await this.getGatewayConfig(companyId, PaymentGatewayType.PAYPAL_REST);
    const adapter = this.gatewayFactory.getAdapter(config) as PayPalAdapter;

    const result = await adapter.capturePayPalOrder(session.gatewaySessionId);

    // Update session status based on result
    await this.updateSessionFromResult(sessionId, result);

    return result;
  }

  // ─────────────────────────────────────────────────────────────
  // Direct Payment Processing
  // ─────────────────────────────────────────────────────────────

  /**
   * Process a payment using the selected gateway
   */
  async processPayment(
    sessionId: string,
    companyId: string,
    gatewayType: PaymentGatewayType,
    paymentData: {
      token?: string;
      returnUrl?: string;
      cancelUrl?: string;
    },
  ): Promise<PaymentResult> {
    const session = await this.sessionsService.findById(sessionId);

    const config = await this.getGatewayConfig(companyId, gatewayType);
    const adapter = this.gatewayFactory.getAdapter(config);

    // Update session to processing
    await this.prisma.paymentPageSession.update({
      where: { id: sessionId },
      data: {
        selectedGateway: gatewayType,
        status: PaymentSessionStatus.PROCESSING,
      },
    });

    const request: PaymentRequest = {
      sessionId,
      amount: Number(session.total),
      currency: session.currency,
      customerId: session.customerId || undefined,
      customerEmail: session.customerEmail || undefined,
      customerName: session.customerName || undefined,
      description: `Payment for ${session.page.name}`,
      metadata: {
        pageId: session.pageId,
        companyId,
      },
      billingAddress: session.billingAddress as any,
      shippingAddress: session.shippingAddress as any,
      returnUrl: paymentData.returnUrl,
      cancelUrl: paymentData.cancelUrl,
      paymentMethod: paymentData.token ? { type: 'card', token: paymentData.token } : undefined,
    };

    const result = await adapter.processPayment(request);

    // Update session with result
    await this.updateSessionFromResult(sessionId, result);

    return result;
  }

  // ─────────────────────────────────────────────────────────────
  // Refunds
  // ─────────────────────────────────────────────────────────────

  /**
   * Process a refund for a completed payment
   */
  async processRefund(
    sessionId: string,
    companyId: string,
    amount: number,
    reason?: string,
  ): Promise<RefundResult> {
    const session = await this.sessionsService.findById(sessionId);

    if (session.status !== PaymentSessionStatus.COMPLETED) {
      throw new BadRequestException('Can only refund completed payments');
    }

    if (!session.selectedGateway || !session.gatewaySessionId) {
      throw new BadRequestException('No gateway payment found for this session');
    }

    const config = await this.getGatewayConfig(companyId, session.selectedGateway);
    const adapter = this.gatewayFactory.getAdapter(config);

    const request: RefundRequest = {
      transactionId: sessionId,
      gatewayTransactionId: session.gatewaySessionId,
      amount,
      reason,
    };

    const result = await adapter.processRefund(request);

    // Update session if full refund
    if (result.success && amount >= Number(session.total)) {
      await this.prisma.paymentPageSession.update({
        where: { id: sessionId },
        data: {
          status: PaymentSessionStatus.COMPLETED, // Keep as completed but mark refunded
          metadata: {
            ...(session.metadata as object || {}),
            refunded: true,
            refundAmount: amount,
            refundReason: reason,
            refundId: result.gatewayRefundId,
          },
        },
      });
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────────
  // Gateway Configuration
  // ─────────────────────────────────────────────────────────────

  /**
   * Get available gateways for a company
   * Fetches from ClientIntegration table with fallback to environment variables
   */
  async getAvailableGateways(companyId: string): Promise<GatewayIntegration[]> {
    // Get company to find its clientId
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { clientId: true },
    });

    if (!company) {
      this.logger.warn(`Company ${companyId} not found, using fallback gateways`);
      return this.getFallbackGateways();
    }

    // Fetch payment gateway integrations from ClientIntegration table
    const integrations = await this.prisma.clientIntegration.findMany({
      where: {
        clientId: company.clientId,
        category: IntegrationCategory.PAYMENT_GATEWAY,
        status: IntegrationStatus.ACTIVE,
      },
      orderBy: [
        { isDefault: 'desc' },
        { priority: 'asc' },
      ],
    });

    if (integrations.length === 0) {
      this.logger.debug(`No client integrations found for company ${companyId}, using fallback`);
      return this.getFallbackGateways();
    }

    const gateways: GatewayIntegration[] = [];

    for (const integration of integrations) {
      const gatewayType = PROVIDER_TO_GATEWAY[integration.provider];
      if (!gatewayType) continue;

      try {
        let credentials: GatewayCredentials;

        if (integration.mode === IntegrationMode.PLATFORM && integration.platformIntegrationId) {
          // Using platform shared credentials
          const decrypted = await this.platformIntegrationService.getDecryptedCredentials(
            integration.platformIntegrationId,
          );
          const env = (integration.environment?.toLowerCase() === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production';
          credentials = {
            ...decrypted,
            environment: env,
          };
        } else if (integration.credentials) {
          // Using own credentials
          const decrypted = this.encryptionService.decrypt(
            integration.credentials as unknown as EncryptedCredentials,
          );
          const env = (integration.environment?.toLowerCase() === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production';
          credentials = {
            ...decrypted,
            environment: env,
          };
        } else {
          continue; // No credentials available
        }

        gateways.push({
          type: gatewayType,
          credentials,
          priority: integration.priority,
          enabled: integration.status === IntegrationStatus.ACTIVE,
        });
      } catch (error) {
        this.logger.warn(`Failed to decrypt credentials for integration ${integration.id}: ${error}`);
      }
    }

    // If no gateways were successfully loaded, use fallback
    if (gateways.length === 0) {
      return this.getFallbackGateways();
    }

    return gateways;
  }

  /**
   * Get fallback gateways from environment variables (development only)
   */
  private getFallbackGateways(): GatewayIntegration[] {
    const gateways: GatewayIntegration[] = [];

    // Stripe fallback
    if (process.env.STRIPE_SECRET_KEY) {
      gateways.push({
        type: PaymentGatewayType.STRIPE,
        credentials: {
          environment: (process.env.STRIPE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
          publicKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
          secretKey: process.env.STRIPE_SECRET_KEY || '',
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        },
        priority: 1,
        enabled: true,
      });
    }

    // PayPal fallback
    if (process.env.PAYPAL_CLIENT_SECRET) {
      gateways.push({
        type: PaymentGatewayType.PAYPAL_REST,
        credentials: {
          environment: (process.env.PAYPAL_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
          apiKey: process.env.PAYPAL_CLIENT_ID || '',
          secretKey: process.env.PAYPAL_CLIENT_SECRET || '',
        },
        priority: 2,
        enabled: true,
      });
    }

    return gateways;
  }

  /**
   * Get gateway configuration for a company and gateway type
   * Credentials are fetched from ClientIntegration with fallback to environment variables
   */
  private async getGatewayConfig(
    companyId: string,
    gatewayType: PaymentGatewayType,
  ): Promise<GatewayConfig> {
    const credentials = await this.getGatewayCredentials(companyId, gatewayType);

    return {
      type: gatewayType,
      credentials,
      capabilities: this.gatewayFactory.getAdapter({
        type: gatewayType,
        credentials,
        capabilities: {} as any, // Will be filled by adapter
      }).getCapabilities(),
    };
  }

  /**
   * Get gateway credentials from ClientIntegration with decryption
   * Falls back to environment variables if no integration is configured
   */
  private async getGatewayCredentials(
    companyId: string,
    gatewayType: PaymentGatewayType,
  ): Promise<GatewayCredentials> {
    // Map gateway type to integration provider
    const provider = GATEWAY_TO_PROVIDER[gatewayType];
    if (!provider) {
      throw new NotFoundException(`Gateway type ${gatewayType} not supported`);
    }

    // Get company to find its clientId
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { clientId: true },
    });

    if (company) {
      // Try to find a matching client integration
      const integration = await this.prisma.clientIntegration.findFirst({
        where: {
          clientId: company.clientId,
          provider: provider,
          status: IntegrationStatus.ACTIVE,
        },
        orderBy: [
          { isDefault: 'desc' },
          { priority: 'asc' },
        ],
      });

      if (integration) {
        try {
          let decrypted: Record<string, unknown>;

          if (integration.mode === IntegrationMode.PLATFORM && integration.platformIntegrationId) {
            // Using platform shared credentials
            decrypted = await this.platformIntegrationService.getDecryptedCredentials(
              integration.platformIntegrationId,
            ) as Record<string, unknown>;
          } else if (integration.credentials) {
            // Using own credentials
            decrypted = this.encryptionService.decrypt(
              integration.credentials as unknown as EncryptedCredentials,
            ) as Record<string, unknown>;
          } else {
            throw new Error('No credentials available');
          }

          this.logger.debug(`Loaded credentials from ClientIntegration for ${provider}`);
          return {
            environment: integration.environment as 'sandbox' | 'production',
            ...decrypted,
          } as GatewayCredentials;
        } catch (error) {
          this.logger.warn(`Failed to decrypt ClientIntegration credentials for ${provider}, using fallback: ${error}`);
        }
      }
    }

    // Fallback to environment variables (development only)
    this.logger.debug(`Using environment variable fallback for ${gatewayType}`);
    return this.getEnvironmentFallbackCredentials(gatewayType);
  }

  /**
   * Get fallback credentials from environment variables
   */
  private getEnvironmentFallbackCredentials(gatewayType: PaymentGatewayType): GatewayCredentials {
    switch (gatewayType) {
      case PaymentGatewayType.STRIPE:
        return {
          environment: (process.env.STRIPE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
          publicKey: process.env.STRIPE_PUBLISHABLE_KEY,
          secretKey: process.env.STRIPE_SECRET_KEY,
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        };

      case PaymentGatewayType.PAYPAL_REST:
      case PaymentGatewayType.PAYPAL:
        return {
          environment: (process.env.PAYPAL_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
          apiKey: process.env.PAYPAL_CLIENT_ID,
          secretKey: process.env.PAYPAL_CLIENT_SECRET,
        };

      case PaymentGatewayType.NMI:
        return {
          environment: (process.env.NMI_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
          apiKey: process.env.NMI_SECURITY_KEY,
          publicKey: process.env.NMI_TOKENIZATION_KEY,
        };

      case PaymentGatewayType.AUTHORIZE_NET:
        return {
          environment: (process.env.AUTHNET_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
          apiKey: process.env.AUTHNET_API_LOGIN_ID,
          secretKey: process.env.AUTHNET_TRANSACTION_KEY,
          publicKey: process.env.AUTHNET_CLIENT_KEY,
        };

      default:
        throw new NotFoundException(`Gateway type ${gatewayType} not configured`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Helper Methods
  // ─────────────────────────────────────────────────────────────

  /**
   * Update session status based on payment result
   */
  private async updateSessionFromResult(
    sessionId: string,
    result: PaymentResult,
  ): Promise<void> {
    const statusMap: Record<string, PaymentSessionStatus> = {
      succeeded: PaymentSessionStatus.COMPLETED,
      processing: PaymentSessionStatus.PROCESSING,
      requires_action: PaymentSessionStatus.REQUIRES_ACTION,
      pending: PaymentSessionStatus.PENDING,
      failed: PaymentSessionStatus.FAILED,
      cancelled: PaymentSessionStatus.CANCELLED,
    };

    const updateData: any = {
      status: statusMap[result.status] || PaymentSessionStatus.FAILED,
    };

    if (result.gatewayTransactionId) {
      updateData.gatewaySessionId = result.gatewayTransactionId;
    }

    if (result.status === 'succeeded') {
      updateData.completedAt = new Date();
    }

    if (result.status === 'failed') {
      updateData.failedAt = new Date();
      updateData.failureReason = result.message;
    }

    await this.prisma.paymentPageSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    this.logger.log(`Session ${sessionId} updated to status ${updateData.status}`);
  }

  /**
   * Get gateway client configuration for frontend
   */
  async getClientConfig(
    companyId: string,
    gatewayType: PaymentGatewayType,
  ): Promise<Record<string, unknown>> {
    const config = await this.getGatewayConfig(companyId, gatewayType);
    const adapter = this.gatewayFactory.getAdapter(config);

    // Return only public/client-safe configuration
    switch (gatewayType) {
      case PaymentGatewayType.STRIPE:
        return {
          publishableKey: (adapter as StripeAdapter).getPublishableKey(),
          environment: config.credentials.environment,
        };

      case PaymentGatewayType.PAYPAL_REST:
      case PaymentGatewayType.PAYPAL:
        return {
          clientId: (adapter as PayPalAdapter).getClientId(),
          environment: config.credentials.environment,
        };

      case PaymentGatewayType.NMI:
        return {
          tokenizationKey: config.credentials.publicKey,
          environment: config.credentials.environment,
        };

      case PaymentGatewayType.AUTHORIZE_NET:
        return {
          apiLoginId: config.credentials.apiKey,
          clientKey: config.credentials.publicKey,
          environment: config.credentials.environment,
        };

      default:
        return { environment: config.credentials.environment };
    }
  }
}
