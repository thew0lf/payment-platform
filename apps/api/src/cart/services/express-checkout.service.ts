import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderNumberService } from '../../orders/services/order-number.service';
import { CartStatus } from '@prisma/client';
import * as crypto from 'crypto';

export enum ExpressCheckoutProvider {
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
  PAYPAL_EXPRESS = 'PAYPAL_EXPRESS',
  SHOP_PAY = 'SHOP_PAY',
}

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
              select: { name: true },
            },
          },
        },
        company: {
          select: { name: true },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.status !== CartStatus.ACTIVE) {
      throw new BadRequestException('Cart is not active');
    }

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
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

    return {
      amount: total,
      currency: cart.currency || 'USD',
      label: `${cart.company?.name || 'Store'} Order`,
      lineItems,
      requiresShipping: true, // TODO: Determine from product types
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

      // TODO: Process payment with provider
      // This would integrate with the payment gateway based on session.provider
      this.logger.log(`Processing ${session.provider} payment for session ${sessionId}`);

      // Simulate payment processing
      const paymentSuccess = true; // Replace with actual payment processing

      if (!paymentSuccess) {
        session.status = 'FAILED';
        return { success: false, error: 'We couldn\'t process your payment. Please check your details and try again. Your card was not charged.' };
      }

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
   */
  async getMerchantConfig(
    companyId: string,
    provider: ExpressCheckoutProvider,
  ): Promise<Record<string, any>> {
    const config = await this.getConfig(companyId);

    switch (provider) {
      case ExpressCheckoutProvider.APPLE_PAY:
        return {
          merchantId: config.applePayMerchantId,
          countryCode: 'US',
          supportedNetworks: ['visa', 'mastercard', 'amex', 'discover'],
        };
      case ExpressCheckoutProvider.GOOGLE_PAY:
        return {
          merchantId: config.googlePayMerchantId,
          environment: 'TEST', // TODO: Use PRODUCTION in prod
          allowedPaymentMethods: ['CARD', 'TOKENIZED_CARD'],
        };
      case ExpressCheckoutProvider.PAYPAL_EXPRESS:
        return {
          clientId: config.paypalClientId,
          currency: 'USD',
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
   */
  private async getConfig(companyId: string): Promise<ExpressCheckoutConfig> {
    // TODO: Load from company settings/integrations
    return {
      enabledProviders: [
        ExpressCheckoutProvider.APPLE_PAY,
        ExpressCheckoutProvider.GOOGLE_PAY,
        ExpressCheckoutProvider.PAYPAL_EXPRESS,
      ],
      applePayMerchantId: 'merchant.com.example',
      googlePayMerchantId: 'example-merchant',
      paypalClientId: 'test-client-id',
    };
  }
}
