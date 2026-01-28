import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderNumberService } from '../../orders/services/order-number.service';
import { CompanyCartSettingsService } from './company-cart-settings.service';
import { ClientIntegrationService } from '../../integrations/services/client-integration.service';
import { CredentialEncryptionService } from '../../integrations/services/credential-encryption.service';
import { PlatformIntegrationService } from '../../integrations/services/platform-integration.service';
import { PayPalClassicService, PayPalPaymentRequest } from '../../integrations/services/providers/paypal-classic.service';
import { IntegrationProvider, IntegrationMode } from '../../integrations/types/integration.types';
import { ExpressCheckoutProvider } from '../types/cart-settings.types';
import { CartStatus, TransactionType, TransactionStatus, ProductFulfillmentType } from '@prisma/client';
import * as crypto from 'crypto';
import Stripe from 'stripe';

// Re-export from types to maintain backward compatibility
export { ExpressCheckoutProvider } from '../types/cart-settings.types';

export interface ExpressCheckoutSession {
  sessionId: string;
  provider: ExpressCheckoutProvider;
  cartId: string;
  amount: number;
  currency: string;
  expiresAt: Date;
  paymentIntentId?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
}

export interface ExpressCheckoutConfig {
  enabledProviders: ExpressCheckoutProvider[];
  applePayMerchantId?: string;
  googlePayMerchantId?: string;
  paypalClientId?: string;
  shopPayEnabled?: boolean;
}

export interface PaymentRequestData {
  amount: number;
  currency: string;
  label: string;
  lineItems: Array<{
    label: string;
    amount: number;
  }>;
  shippingOptions?: Array<{
    id: string;
    label: string;
    amount: number;
  }>;
  requiresShipping: boolean;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  providerTransactionId?: string;
  errorCode?: string;
  errorMessage?: string;
  avsResult?: string;
  cvvResult?: string;
  rawResponse?: Record<string, any>;
}

const DEFAULT_SESSION_EXPIRY_MINUTES = 30;

/**
 * Convert provider enum to user-friendly display name
 */
function getProviderDisplayName(provider: ExpressCheckoutProvider): string {
  const displayNames: Record<ExpressCheckoutProvider, string> = {
    [ExpressCheckoutProvider.APPLE_PAY]: 'Apple Pay',
    [ExpressCheckoutProvider.GOOGLE_PAY]: 'Google Pay',
    [ExpressCheckoutProvider.PAYPAL_EXPRESS]: 'PayPal',
    [ExpressCheckoutProvider.SHOP_PAY]: 'Shop Pay',
  };
  return displayNames[provider] || provider;
}

@Injectable()
export class ExpressCheckoutService {
  private readonly logger = new Logger(ExpressCheckoutService.name);
  /**
   * NOTE: In-memory session storage for development only.
   * For production deployments:
   * 1. Inject RedisService and store sessions with SETEX for TTL
   * 2. Or store in database with ExpressCheckoutSession model
   * Sessions will be lost on server restart and won't work in multi-instance deployments.
   */
  private readonly sessions = new Map<string, ExpressCheckoutSession>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderNumberService: OrderNumberService,
    private readonly companyCartSettingsService: CompanyCartSettingsService,
    private readonly clientIntegrationService: ClientIntegrationService,
    private readonly encryptionService: CredentialEncryptionService,
    private readonly platformIntegrationService: PlatformIntegrationService,
    private readonly paypalService: PayPalClassicService,
  ) {}

  /**
   * Get available express checkout providers for a company
   */
  async getAvailableProviders(companyId: string): Promise<ExpressCheckoutProvider[]> {
    const config = await this.getConfig(companyId);
    return config.enabledProviders;
  }

  /**
   * Create payment request data for express checkout
   */
  async createPaymentRequest(
    cartId: string,
    provider: ExpressCheckoutProvider,
  ): Promise<PaymentRequestData> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, fulfillmentType: true },
            },
          },
        },
        company: {
          select: { name: true },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Hmm, we can\'t find that cart. It may have expired or been removed.');
    }

    if (cart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException('This cart is no longer active. Please start a new cart to continue.');
    }

    if (cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty! Add some items before checking out.');
    }

    const lineItems = cart.items.map((item) => ({
      label: `${item.product?.name || 'Product'} x${item.quantity}`,
      amount: Number(item.lineTotal),
    }));

    const subtotal = Number(cart.subtotal || 0);
    const tax = Number(cart.taxTotal || 0);
    const shipping = Number(cart.shippingTotal || 0);
    const discount = Number(cart.discountTotal || 0);
    const total = Number(cart.grandTotal || subtotal + tax + shipping - discount);

    // Add tax and shipping as line items if applicable
    if (tax > 0) {
      lineItems.push({ label: 'Tax', amount: tax });
    }
    if (shipping > 0) {
      lineItems.push({ label: 'Shipping', amount: shipping });
    }
    if (discount > 0) {
      lineItems.push({ label: 'Discount', amount: -discount });
    }

    // Determine if shipping is required based on product types
    // Shipping is required if ANY item is a physical product
    // PHYSICAL products require shipping; VIRTUAL and ELECTRONIC products do not
    const requiresShipping = cart.items.some((item) => {
      const fulfillmentType = item.product?.fulfillmentType;
      // Default to requiring shipping if fulfillmentType is not set (for safety)
      // Only VIRTUAL and ELECTRONIC products explicitly don't require shipping
      return (
        fulfillmentType === ProductFulfillmentType.PHYSICAL ||
        fulfillmentType === undefined ||
        fulfillmentType === null
      );
    });

    return {
      amount: total,
      currency: cart.currency || 'USD',
      label: `${cart.company?.name || 'Store'} Order`,
      lineItems,
      requiresShipping,
    };
  }

  /**
   * Initialize an express checkout session
   */
  async initializeSession(
    cartId: string,
    provider: ExpressCheckoutProvider,
    companyId: string,
  ): Promise<ExpressCheckoutSession> {
    const config = await this.getConfig(companyId);

    if (!config.enabledProviders.includes(provider)) {
      throw new BadRequestException(
        `${getProviderDisplayName(provider)} isn't available for this store. Please try another payment method.`,
      );
    }

    const cart = await this.prisma.cart.findFirst({
      where: {
        id: cartId,
        companyId,
        status: CartStatus.ACTIVE,
      },
    });

    if (!cart) {
      throw new NotFoundException('Your cart has expired or is no longer available. Please add items again to continue.');
    }

    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + DEFAULT_SESSION_EXPIRY_MINUTES * 60 * 1000);

    const session: ExpressCheckoutSession = {
      sessionId,
      provider,
      cartId,
      amount: Number(cart.grandTotal || cart.subtotal || 0),
      currency: cart.currency || 'USD',
      expiresAt,
      status: 'PENDING',
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Clean up expired sessions periodically
    this.cleanupExpiredSessions();

    this.logger.log(`Express checkout session created: ${sessionId} for cart ${cartId}`);

    return session;
  }

  /**
   * Process express checkout payment
   * Supports guest checkout by creating a customer on-the-fly from payment provider data
   */
  async processPayment(
    sessionId: string,
    paymentToken: string,
    shippingAddress?: {
      name: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    },
    billingAddress?: {
      name: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    },
    payerEmail?: string,
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'Your checkout session has expired. Please try again.' };
    }

    if (session.status !== 'PENDING') {
      // Don't expose internal status enum - provide user-friendly message based on status
      const statusMessages: Record<string, string> = {
        'PROCESSING': 'Your order is already being processed. Please wait.',
        'COMPLETED': 'This order has already been completed.',
        'FAILED': 'There was an issue with your previous checkout attempt. Please try again.',
        'EXPIRED': 'Your checkout session has expired. Please try again.',
      };
      return { success: false, error: statusMessages[session.status] || 'Unable to process checkout. Please try again.' };
    }

    if (new Date() > session.expiresAt) {
      session.status = 'EXPIRED';
      return { success: false, error: 'Your checkout session has expired. Please try again.' };
    }

    try {
      session.status = 'PROCESSING';

      // Get cart with product details for order item creation
      const cart = await this.prisma.cart.findUnique({
        where: { id: session.cartId },
        include: {
          items: {
            include: {
              product: {
                select: { sku: true, name: true, description: true },
              },
            },
          },
          company: true,
        },
      });

      if (!cart || cart.status !== CartStatus.ACTIVE) {
        session.status = 'FAILED';
        return { success: false, error: 'Your cart has changed or is no longer available. Please try again.' };
      }

      // Get or create customer for order
      let customerId = cart.customerId;

      if (!customerId) {
        // Guest checkout: create customer on-the-fly from payment provider data
        // Apple Pay, Google Pay, and PayPal all provide payer email and billing info
        if (!payerEmail) {
          session.status = 'FAILED';
          return { success: false, error: 'Please provide your email address to complete checkout.' };
        }

        // Parse name from billing address (format: "First Last" or "First Middle Last")
        const nameParts = (billingAddress?.name || '').trim().split(/\s+/);
        const firstName = nameParts[0] || 'Guest';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

        // Create guest customer
        const guestCustomer = await this.prisma.customer.create({
          data: {
            companyId: cart.companyId,
            email: payerEmail,
            firstName,
            lastName,
            metadata: {
              source: 'express_checkout',
              provider: session.provider,
              isGuest: true,
            },
          },
        });

        customerId = guestCustomer.id;

        // Update cart with customer for future reference
        await this.prisma.cart.update({
          where: { id: cart.id },
          data: { customerId },
        });

        this.logger.log(`Guest customer created: ${customerId} for express checkout`);
      }

      // Process payment with the appropriate provider
      this.logger.log(`Processing ${session.provider} payment for session ${sessionId}`);

      const paymentResult = await this.processPaymentWithProvider(
        cart,
        session,
        paymentToken,
        billingAddress,
        payerEmail,
      );

      if (!paymentResult.success) {
        session.status = 'FAILED';
        return {
          success: false,
          error: paymentResult.errorMessage || 'We couldn\'t process your payment. Please check your details and try again. Your card was not charged.',
        };
      }

      // Create transaction record
      const transactionNumber = await this.generateTransactionNumber(cart.companyId);
      await this.prisma.transaction.create({
        data: {
          companyId: cart.companyId,
          customerId,
          transactionNumber,
          type: TransactionType.CHARGE,
          amount: cart.grandTotal || cart.subtotal || 0,
          currency: cart.currency || 'USD',
          description: `Express checkout payment via ${session.provider}`,
          providerTransactionId: paymentResult.providerTransactionId,
          providerResponse: paymentResult.rawResponse as any,
          status: TransactionStatus.COMPLETED,
          avsResult: paymentResult.avsResult,
          cvvResult: paymentResult.cvvResult,
          environment: 'production',
          processedAt: new Date(),
        },
      });

      // Generate proper order number using OrderNumberService
      const orderNumber = await this.orderNumberService.generate(cart.companyId);

      // Create order
      const order = await this.prisma.order.create({
        data: {
          companyId: cart.companyId,
          customerId,  // Either existing customer or newly created guest
          orderNumber,
          status: 'PENDING',
          paymentStatus: 'PAID',
          currency: cart.currency || 'USD',
          subtotal: cart.subtotal || 0,
          taxAmount: cart.taxTotal || 0,
          shippingAmount: cart.shippingTotal || 0,
          discountAmount: cart.discountTotal || 0,
          total: cart.grandTotal || cart.subtotal || 0,
          shippingSnapshot: shippingAddress || {},
          billingSnapshot: billingAddress || {},
          paymentMethod: session.provider,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              sku: item.product?.sku || `SKU-${item.productId.slice(0, 8)}`,
              name: item.product?.name || 'Product',
              description: item.product?.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.lineTotal,
              productSnapshot: item.productSnapshot || {},
            })),
          },
        },
      });

      // Mark cart as converted
      await this.prisma.cart.update({
        where: { id: cart.id },
        data: {
          status: CartStatus.CONVERTED,
          convertedAt: new Date(),
        },
      });

      session.status = 'COMPLETED';

      this.logger.log(`Express checkout completed: order ${order.id} created`);

      return { success: true, orderId: order.id };
    } catch (error) {
      session.status = 'FAILED';
      this.logger.error(`Express checkout failed for session ${sessionId}:`, error);
      return { success: false, error: 'Something went wrong during checkout. Don\'t worry—your card wasn\'t charged. Please try again.' };
    }
  }

  /**
   * Get session status
   */
  async getSessionStatus(sessionId: string): Promise<ExpressCheckoutSession | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if expired
    if (session.status === 'PENDING' && new Date() > session.expiresAt) {
      session.status = 'EXPIRED';
    }

    return session;
  }

  /**
   * Cancel an express checkout session
   */
  async cancelSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);

    if (!session || session.status !== 'PENDING') {
      return false;
    }

    this.sessions.delete(sessionId);
    this.logger.log(`Express checkout session cancelled: ${sessionId}`);

    return true;
  }

  /**
   * Get merchant configuration for a provider
   * Environment is determined from the company's payment gateway integration
   */
  async getMerchantConfig(
    companyId: string,
    provider: ExpressCheckoutProvider,
  ): Promise<Record<string, any>> {
    const settings = await this.companyCartSettingsService.getExpressCheckoutSettings(companyId);

    switch (provider) {
      case ExpressCheckoutProvider.APPLE_PAY:
        return {
          merchantId: settings.applePayMerchantId,
          countryCode: 'US',
          supportedNetworks: ['visa', 'mastercard', 'amex', 'discover'],
        };
      case ExpressCheckoutProvider.GOOGLE_PAY:
        return {
          merchantId: settings.googlePayMerchantId,
          environment: settings.environment, // Now loaded from company/integration settings
          allowedPaymentMethods: ['CARD', 'TOKENIZED_CARD'],
        };
      case ExpressCheckoutProvider.PAYPAL_EXPRESS:
        return {
          clientId: settings.paypalClientId,
          currency: 'USD',
          environment: settings.environment,
        };
      default:
        return {};
    }
  }

  /**
   * Generate a cryptographically secure unique session ID
   */
  private generateSessionId(): string {
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `exp_${randomBytes}`;
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now && session.status === 'PENDING') {
        this.sessions.delete(id);
      }
    }
  }

  /**
   * Get express checkout config for company
   * Loads settings from company configuration and active integrations
   */
  private async getConfig(companyId: string): Promise<ExpressCheckoutConfig> {
    const settings = await this.companyCartSettingsService.getExpressCheckoutSettings(companyId);

    return {
      enabledProviders: settings.enabledProviders,
      applePayMerchantId: settings.applePayMerchantId,
      googlePayMerchantId: settings.googlePayMerchantId,
      paypalClientId: settings.paypalClientId,
      shopPayEnabled: settings.shopPayEnabled,
    };
  }

  /**
   * Process payment with the appropriate provider based on session type
   * Integrates with the payment gateway via ClientIntegration service (Feature 01)
   */
  private async processPaymentWithProvider(
    cart: any,
    session: ExpressCheckoutSession,
    paymentToken: string,
    billingAddress?: {
      name: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    },
    payerEmail?: string,
  ): Promise<PaymentResult> {
    // Get the company's client to find payment gateway integration
    const company = await this.prisma.company.findUnique({
      where: { id: cart.companyId },
      select: { clientId: true },
    });

    if (!company?.clientId) {
      this.logger.error(`No client found for company ${cart.companyId}`);
      return {
        success: false,
        errorMessage: 'Payment processing is not configured for this store.',
      };
    }

    // Get the default payment gateway for the client
    const paymentIntegration = await this.clientIntegrationService.getDefaultPaymentGateway(company.clientId);

    if (!paymentIntegration) {
      this.logger.error(`No payment gateway configured for client ${company.clientId}`);
      return {
        success: false,
        errorMessage: 'Payment processing is not available. Please contact support.',
      };
    }

    // Get decrypted credentials
    let credentials: Record<string, any>;
    try {
      if (paymentIntegration.mode === IntegrationMode.PLATFORM && paymentIntegration.platformIntegrationId) {
        credentials = (await this.platformIntegrationService.getDecryptedCredentials(
          paymentIntegration.platformIntegrationId,
        )) as Record<string, any>;
      } else {
        // Fetch the integration with encrypted credentials
        const integrationWithCreds = await this.prisma.clientIntegration.findUnique({
          where: { id: paymentIntegration.id },
        });
        if (!integrationWithCreds?.credentials) {
          return {
            success: false,
            errorMessage: 'Payment gateway credentials are not configured.',
          };
        }
        credentials = this.encryptionService.decrypt(integrationWithCreds.credentials as any) as Record<string, any>;
      }
    } catch (error) {
      this.logger.error(`Failed to decrypt credentials for integration ${paymentIntegration.id}:`, error);
      return {
        success: false,
        errorMessage: 'Unable to process payment. Please try again later.',
      };
    }

    // Include environment in credentials
    credentials.environment = paymentIntegration.environment || 'sandbox';

    const amount = Number(cart.grandTotal || cart.subtotal || 0);
    const currency = cart.currency || 'USD';

    // Route to the appropriate payment provider
    switch (paymentIntegration.provider) {
      case IntegrationProvider.STRIPE:
        return this.processStripePayment(credentials, paymentToken, amount, currency, session, billingAddress, payerEmail);

      case IntegrationProvider.PAYPAL_PAYFLOW:
        return this.processPayPalPayment(credentials, paymentToken, amount, currency, cart, session, billingAddress, payerEmail);

      case IntegrationProvider.NMI:
        return this.processNMIPayment(credentials, paymentToken, amount, currency, cart, session, billingAddress);

      case IntegrationProvider.AUTHORIZE_NET:
        return this.processAuthorizeNetPayment(credentials, paymentToken, amount, currency, cart, session, billingAddress);

      default:
        this.logger.error(`Unsupported payment provider: ${paymentIntegration.provider}`);
        return {
          success: false,
          errorMessage: 'This payment method is not currently supported.',
        };
    }
  }

  /**
   * Process payment via Stripe
   */
  private async processStripePayment(
    credentials: Record<string, any>,
    paymentToken: string,
    amount: number,
    currency: string,
    session: ExpressCheckoutSession,
    billingAddress?: any,
    payerEmail?: string,
  ): Promise<PaymentResult> {
    try {
      const stripe = new Stripe(credentials.secretKey, {
        apiVersion: '2025-11-17.clover',
      });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe expects amount in cents
        currency: currency.toLowerCase(),
        payment_method: paymentToken,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          express_checkout_provider: session.provider,
          cart_id: session.cartId,
        },
        receipt_email: payerEmail,
      });

      if (paymentIntent.status === 'succeeded') {
        this.logger.log(`Stripe payment succeeded: ${paymentIntent.id}`);
        return {
          success: true,
          providerTransactionId: paymentIntent.id,
          rawResponse: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
          },
        };
      }

      if (paymentIntent.status === 'requires_action') {
        return {
          success: false,
          errorCode: 'REQUIRES_ACTION',
          errorMessage: 'Additional authentication required. Please try again.',
        };
      }

      return {
        success: false,
        errorCode: paymentIntent.status,
        errorMessage: 'Payment was not completed. Please try again.',
      };
    } catch (error: any) {
      this.logger.error(`Stripe payment failed:`, error);
      if (error.type === 'StripeCardError') {
        return {
          success: false,
          errorCode: error.code,
          errorMessage: error.message || 'Your card was declined.',
        };
      }
      return {
        success: false,
        errorCode: error.code || 'STRIPE_ERROR',
        errorMessage: 'Payment processing failed. Please try again.',
      };
    }
  }

  /**
   * Process payment via PayPal Classic (Payflow/DoDirectPayment)
   */
  private async processPayPalPayment(
    credentials: Record<string, any>,
    paymentToken: string,
    amount: number,
    currency: string,
    cart: any,
    session: ExpressCheckoutSession,
    billingAddress?: any,
    payerEmail?: string,
  ): Promise<PaymentResult> {
    try {
      let paymentData: any;
      try {
        paymentData = JSON.parse(paymentToken);
      } catch {
        paymentData = { token: paymentToken };
      }

      if (paymentData.cardNumber || paymentData.card) {
        const cardInfo = paymentData.card || paymentData;
        const paymentRequest: PayPalPaymentRequest = {
          amount,
          currencyCode: currency,
          paymentAction: 'Sale',
          card: {
            cardNumber: cardInfo.cardNumber || cardInfo.number,
            expirationMonth: cardInfo.expirationMonth || cardInfo.expMonth,
            expirationYear: cardInfo.expirationYear || cardInfo.expYear,
            cvv: cardInfo.cvv || cardInfo.cvc || '000',
          },
          billingAddress: billingAddress
            ? {
                firstName: billingAddress.name?.split(' ')[0] || 'Customer',
                lastName: billingAddress.name?.split(' ').slice(1).join(' ') || '',
                street1: billingAddress.addressLine1,
                street2: billingAddress.addressLine2,
                city: billingAddress.city,
                state: billingAddress.state,
                postalCode: billingAddress.postalCode,
                countryCode: billingAddress.country || 'US',
                email: payerEmail,
              }
            : {
                firstName: 'Customer',
                lastName: '',
                street1: '123 Main St',
                city: 'Anytown',
                state: 'CA',
                postalCode: '12345',
                countryCode: 'US',
              },
          invoiceId: cart.id,
          description: `Order from ${session.provider}`,
          itemAmount: Number(cart.subtotal || 0),
          taxAmount: Number(cart.taxTotal || 0),
          shippingAmount: Number(cart.shippingTotal || 0),
        };

        const result = await this.paypalService.doDirectPayment(
          {
            apiUsername: credentials.apiUsername,
            apiPassword: credentials.apiPassword,
            apiSignature: credentials.apiSignature,
            environment: credentials.environment,
          },
          paymentRequest,
        );

        if (result.success) {
          return {
            success: true,
            providerTransactionId: result.transactionId,
            avsResult: result.avsCode,
            cvvResult: result.cvv2Match,
            rawResponse: result.rawResponse,
          };
        }

        return {
          success: false,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage || 'PayPal payment failed.',
        };
      }

      return {
        success: false,
        errorCode: 'INVALID_TOKEN',
        errorMessage: 'Invalid payment token format.',
      };
    } catch (error: any) {
      this.logger.error(`PayPal payment failed:`, error);
      return {
        success: false,
        errorCode: 'PAYPAL_ERROR',
        errorMessage: 'PayPal payment processing failed. Please try again.',
      };
    }
  }

  /**
   * Process payment via NMI gateway
   */
  private async processNMIPayment(
    credentials: Record<string, any>,
    paymentToken: string,
    amount: number,
    currency: string,
    cart: any,
    session: ExpressCheckoutSession,
    billingAddress?: any,
  ): Promise<PaymentResult> {
    try {
      const axios = await import('axios');
      const params = new URLSearchParams({
        security_key: credentials.securityKey,
        type: 'sale',
        amount: amount.toFixed(2),
        currency: currency,
        payment_token: paymentToken,
        orderid: cart.id,
      });

      if (billingAddress) {
        const nameParts = (billingAddress.name || '').split(' ');
        params.append('first_name', nameParts[0] || '');
        params.append('last_name', nameParts.slice(1).join(' ') || '');
        params.append('address1', billingAddress.addressLine1 || '');
        if (billingAddress.addressLine2) {
          params.append('address2', billingAddress.addressLine2);
        }
        params.append('city', billingAddress.city || '');
        params.append('state', billingAddress.state || '');
        params.append('zip', billingAddress.postalCode || '');
        params.append('country', billingAddress.country || 'US');
      }

      const response = await axios.default.post(
        'https://secure.nmi.com/api/transact.php',
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 30000,
        },
      );

      const result = new URLSearchParams(response.data);
      const responseCode = result.get('response');
      const responseText = result.get('responsetext');
      const transactionId = result.get('transactionid');

      if (responseCode === '1') {
        this.logger.log(`NMI payment succeeded: ${transactionId}`);
        return {
          success: true,
          providerTransactionId: transactionId || undefined,
          avsResult: result.get('avsresponse') || undefined,
          cvvResult: result.get('cvvresponse') || undefined,
          rawResponse: Object.fromEntries(result.entries()),
        };
      }

      return {
        success: false,
        errorCode: result.get('response_code') || responseCode || 'NMI_ERROR',
        errorMessage: responseText || 'Payment declined.',
      };
    } catch (error: any) {
      this.logger.error(`NMI payment failed:`, error);
      return {
        success: false,
        errorCode: 'NMI_ERROR',
        errorMessage: 'Payment processing failed. Please try again.',
      };
    }
  }

  /**
   * Process payment via Authorize.Net
   */
  private async processAuthorizeNetPayment(
    credentials: Record<string, any>,
    paymentToken: string,
    amount: number,
    currency: string,
    cart: any,
    session: ExpressCheckoutSession,
    billingAddress?: any,
  ): Promise<PaymentResult> {
    try {
      const axios = await import('axios');
      const endpoint =
        credentials.environment === 'production'
          ? 'https://api.authorize.net/xml/v1/request.api'
          : 'https://apitest.authorize.net/xml/v1/request.api';

      let paymentData: any;
      try {
        paymentData = JSON.parse(paymentToken);
      } catch {
        paymentData = { dataValue: paymentToken };
      }

      const requestBody: any = {
        createTransactionRequest: {
          merchantAuthentication: {
            name: credentials.apiLoginId,
            transactionKey: credentials.transactionKey,
          },
          transactionRequest: {
            transactionType: 'authCaptureTransaction',
            amount: amount.toFixed(2),
            currencyCode: currency,
            order: {
              invoiceNumber: cart.id.substring(0, 20),
              description: `Express checkout via ${session.provider}`,
            },
          },
        },
      };

      if (paymentData.dataValue) {
        requestBody.createTransactionRequest.transactionRequest.payment = {
          opaqueData: {
            dataDescriptor: paymentData.dataDescriptor || 'COMMON.APPLE.INAPP.PAYMENT',
            dataValue: paymentData.dataValue,
          },
        };
      } else if (paymentData.cardNumber) {
        requestBody.createTransactionRequest.transactionRequest.payment = {
          creditCard: {
            cardNumber: paymentData.cardNumber,
            expirationDate: `${paymentData.expirationMonth}${paymentData.expirationYear}`,
            cardCode: paymentData.cvv || '',
          },
        };
      }

      if (billingAddress) {
        const nameParts = (billingAddress.name || '').split(' ');
        requestBody.createTransactionRequest.transactionRequest.billTo = {
          firstName: nameParts[0] || 'Customer',
          lastName: nameParts.slice(1).join(' ') || '',
          address: billingAddress.addressLine1 || '',
          city: billingAddress.city || '',
          state: billingAddress.state || '',
          zip: billingAddress.postalCode || '',
          country: billingAddress.country || 'US',
        };
      }

      const response = await axios.default.post(endpoint, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      const data = response.data;
      const transactionResponse = data.transactionResponse;

      if (transactionResponse?.responseCode === '1') {
        this.logger.log(`Authorize.Net payment succeeded: ${transactionResponse.transId}`);
        return {
          success: true,
          providerTransactionId: transactionResponse.transId,
          avsResult: transactionResponse.avsResultCode,
          cvvResult: transactionResponse.cvvResultCode,
          rawResponse: transactionResponse,
        };
      }

      return {
        success: false,
        errorCode: transactionResponse?.responseCode || 'AUTH_NET_ERROR',
        errorMessage:
          transactionResponse?.errors?.[0]?.errorText ||
          data.messages?.message?.[0]?.text ||
          'Payment declined.',
      };
    } catch (error: any) {
      this.logger.error(`Authorize.Net payment failed:`, error);
      return {
        success: false,
        errorCode: 'AUTH_NET_ERROR',
        errorMessage: 'Payment processing failed. Please try again.',
      };
    }
  }

  /**
   * Generate a transaction number
   */
  private async generateTransactionNumber(companyId: string): Promise<string> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { code: true },
    });

    const prefix = company?.code || 'TXN';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();

    return `${prefix}-${timestamp}-${random}`;
  }
}
