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

// ═══════════════════════════════════════════════════════════════
// PAYMENT GATEWAY SERVICE
// Orchestrates payment processing across multiple gateways
// ═══════════════════════════════════════════════════════════════

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
   */
  async getAvailableGateways(companyId: string): Promise<GatewayIntegration[]> {
    // TODO: Fetch from ClientIntegration table
    // For now, return mock data
    return [
      {
        type: PaymentGatewayType.STRIPE,
        credentials: {
          environment: 'sandbox',
          publicKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
          secretKey: process.env.STRIPE_SECRET_KEY || '',
        },
        priority: 1,
        enabled: true,
      },
    ];
  }

  /**
   * Get gateway configuration for a company and gateway type
   */
  private async getGatewayConfig(
    companyId: string,
    gatewayType: PaymentGatewayType,
  ): Promise<GatewayConfig> {
    // TODO: Fetch credentials from ClientIntegration table using encryption service
    // For now, use environment variables for development

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
   * Get gateway credentials from integrations
   */
  private async getGatewayCredentials(
    _companyId: string,
    gatewayType: PaymentGatewayType,
  ): Promise<GatewayCredentials> {
    // TODO: Implement proper credential retrieval from ClientIntegration
    // with decryption using EncryptionService

    // Development fallback - use environment variables
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
