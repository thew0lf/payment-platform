import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface CreateCheckoutSessionOptions {
  clientId: string;
  planId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  metadata?: Record<string, string>;
}

export interface CreateBillingPortalOptions {
  clientId: string;
  customerId: string;
  returnUrl: string;
}

@Injectable()
export class StripeBillingService {
  private readonly logger = new Logger(StripeBillingService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeStripe();
  }

  private initializeStripe(): void {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
      this.logger.log('Stripe billing service initialized');
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not configured - Stripe billing features disabled');
    }
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  /**
   * Create or retrieve a Stripe customer for the given client
   */
  async ensureStripeCustomer(clientId: string): Promise<string> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    // Check if client already has a Stripe customer ID
    const subscription = await this.prisma.clientSubscription.findUnique({
      where: { clientId },
      select: { stripeCustomerId: true },
    });

    if (subscription?.stripeCustomerId) {
      return subscription.stripeCustomerId;
    }

    // Get client details
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, code: true },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    // Create new Stripe customer
    const customer = await this.stripe.customers.create({
      name: client.name,
      metadata: {
        clientId: client.id,
        clientCode: client.code,
        source: 'payment-platform',
      },
    });

    this.logger.log(`Created Stripe customer ${customer.id} for client ${clientId}`);

    return customer.id;
  }

  /**
   * Create a Stripe Checkout session for plan upgrade
   */
  async createCheckoutSession(options: CreateCheckoutSessionOptions): Promise<string> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const { clientId, planId, priceId, successUrl, cancelUrl, customerId, metadata } = options;

    // Ensure we have a Stripe customer
    const stripeCustomerId = customerId || await this.ensureStripeCustomer(clientId);

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        clientId,
        planId,
        action: 'upgrade',
        ...metadata,
      },
      subscription_data: {
        metadata: {
          clientId,
          planId,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    this.logger.log(`Created Stripe checkout session ${session.id} for client ${clientId}`);
    this.eventEmitter.emit('billing.checkoutSessionCreated', {
      sessionId: session.id,
      clientId,
      planId,
    });

    if (!session.url) {
      throw new BadRequestException('Failed to create checkout session URL');
    }

    return session.url;
  }

  /**
   * Create a Stripe Billing Portal session for subscription management
   */
  async createBillingPortalSession(options: CreateBillingPortalOptions): Promise<string> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const { clientId, customerId, returnUrl } = options;

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    this.logger.log(`Created Stripe billing portal session for client ${clientId}`);

    return session.url;
  }

  /**
   * Handle Stripe webhook events for subscription updates
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Handling Stripe webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const clientId = session.metadata?.clientId;
    const planId = session.metadata?.planId;

    if (!clientId || !planId) {
      this.logger.warn('Checkout session missing clientId or planId metadata');
      return;
    }

    // Update subscription with Stripe IDs
    await this.prisma.clientSubscription.upsert({
      where: { clientId },
      update: {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        planId,
        status: 'ACTIVE',
      },
      create: {
        clientId,
        planId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        billingAnchorDay: new Date().getDate(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: 'ACTIVE',
      },
    });

    this.logger.log(`Updated subscription for client ${clientId} after checkout`);
    this.eventEmitter.emit('billing.subscriptionActivated', { clientId, planId });
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const clientId = subscription.metadata?.clientId;
    if (!clientId) return;

    const status = this.mapStripeStatus(subscription.status);

    // Access subscription period from the raw object
    const subData = subscription as unknown as { current_period_start: number; current_period_end: number };

    await this.prisma.clientSubscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status,
        currentPeriodStart: new Date(subData.current_period_start * 1000),
        currentPeriodEnd: new Date(subData.current_period_end * 1000),
      },
    });

    this.eventEmitter.emit('billing.subscriptionUpdated', { clientId, status });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    await this.prisma.clientSubscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    this.eventEmitter.emit('billing.subscriptionCanceled', {
      subscriptionId: subscription.id,
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    // Access subscription from raw invoice data
    const invoiceData = invoice as unknown as { subscription?: string };
    const subscriptionId = invoiceData.subscription;
    if (!subscriptionId) return;

    // Could create invoice records in our database
    this.logger.log(`Invoice ${invoice.id} paid for subscription ${subscriptionId}`);
    this.eventEmitter.emit('billing.invoicePaid', { invoiceId: invoice.id });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Access subscription from raw invoice data
    const invoiceData = invoice as unknown as { subscription?: string };
    const subscriptionId = invoiceData.subscription;
    if (!subscriptionId) return;

    // Update subscription status to past_due
    await this.prisma.clientSubscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: 'PAST_DUE' },
    });

    this.eventEmitter.emit('billing.paymentFailed', { invoiceId: invoice.id });
  }

  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
    const statusMap: Record<Stripe.Subscription.Status, string> = {
      active: 'ACTIVE',
      canceled: 'CANCELED',
      incomplete: 'PENDING',
      incomplete_expired: 'CANCELED',
      past_due: 'PAST_DUE',
      paused: 'PAUSED',
      trialing: 'TRIALING',
      unpaid: 'PAST_DUE',
    };
    return statusMap[stripeStatus] || 'ACTIVE';
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET is not configured');
    }

    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
