/**
 * PayPal Webhook Service
 *
 * Handles PayPal webhook events for subscriptions, payments, and disputes.
 * PayPal manages subscription billing directly - we just listen for events.
 *
 * Key subscription events:
 * - BILLING.SUBSCRIPTION.CREATED
 * - BILLING.SUBSCRIPTION.ACTIVATED
 * - BILLING.SUBSCRIPTION.CANCELLED
 * - BILLING.SUBSCRIPTION.SUSPENDED
 * - BILLING.SUBSCRIPTION.PAYMENT.FAILED
 * - PAYMENT.SALE.COMPLETED (recurring payment success)
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

// PayPal Webhook Event Types
export enum PayPalWebhookEventType {
  // Subscription Events
  SUBSCRIPTION_CREATED = 'BILLING.SUBSCRIPTION.CREATED',
  SUBSCRIPTION_ACTIVATED = 'BILLING.SUBSCRIPTION.ACTIVATED',
  SUBSCRIPTION_CANCELLED = 'BILLING.SUBSCRIPTION.CANCELLED',
  SUBSCRIPTION_SUSPENDED = 'BILLING.SUBSCRIPTION.SUSPENDED',
  SUBSCRIPTION_EXPIRED = 'BILLING.SUBSCRIPTION.EXPIRED',
  SUBSCRIPTION_UPDATED = 'BILLING.SUBSCRIPTION.UPDATED',
  SUBSCRIPTION_RE_ACTIVATED = 'BILLING.SUBSCRIPTION.RE-ACTIVATED',
  SUBSCRIPTION_PAYMENT_FAILED = 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',

  // Payment Events
  PAYMENT_SALE_COMPLETED = 'PAYMENT.SALE.COMPLETED',
  PAYMENT_SALE_REFUNDED = 'PAYMENT.SALE.REFUNDED',
  PAYMENT_SALE_REVERSED = 'PAYMENT.SALE.REVERSED',
  PAYMENT_CAPTURE_COMPLETED = 'PAYMENT.CAPTURE.COMPLETED',
  PAYMENT_CAPTURE_REFUNDED = 'PAYMENT.CAPTURE.REFUNDED',

  // Dispute Events
  CUSTOMER_DISPUTE_CREATED = 'CUSTOMER.DISPUTE.CREATED',
  CUSTOMER_DISPUTE_RESOLVED = 'CUSTOMER.DISPUTE.RESOLVED',
}

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  event_version: string;
  create_time: string;
  resource_type: string;
  resource_version: string;
  resource: Record<string, any>;
  summary: string;
  links: Array<{ href: string; rel: string; method: string }>;
}

interface WebhookVerificationResult {
  verified: boolean;
  error?: string;
}

@Injectable()
export class PayPalWebhookService {
  private readonly logger = new Logger(PayPalWebhookService.name);
  private readonly webhookId: string;
  private readonly apiEndpoint: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.webhookId = this.configService.get<string>('PAYPAL_WEBHOOK_ID') || '';
    const env = this.configService.get<string>('PAYPAL_ENV') || 'sandbox';
    this.apiEndpoint = env === 'production' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';
  }

  /**
   * Process incoming PayPal webhook event
   */
  async handleWebhook(
    event: PayPalWebhookEvent,
    headers: Record<string, string>,
    rawBody: string,
  ): Promise<{ status: string; message: string }> {
    // Verify webhook signature
    if (this.webhookId) {
      const verification = await this.verifyWebhookSignature(headers, rawBody);
      if (!verification.verified) {
        this.logger.warn(`Webhook signature verification failed: ${verification.error}`);
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    this.logger.log(`Processing PayPal webhook: ${event.event_type} (${event.id})`);

    try {
      // Route to appropriate handler based on event type
      switch (event.event_type) {
        // Subscription lifecycle events
        case PayPalWebhookEventType.SUBSCRIPTION_CREATED:
          await this.handleSubscriptionCreated(event);
          break;

        case PayPalWebhookEventType.SUBSCRIPTION_ACTIVATED:
          await this.handleSubscriptionActivated(event);
          break;

        case PayPalWebhookEventType.SUBSCRIPTION_CANCELLED:
          await this.handleSubscriptionCancelled(event);
          break;

        case PayPalWebhookEventType.SUBSCRIPTION_SUSPENDED:
          await this.handleSubscriptionSuspended(event);
          break;

        case PayPalWebhookEventType.SUBSCRIPTION_EXPIRED:
          await this.handleSubscriptionExpired(event);
          break;

        case PayPalWebhookEventType.SUBSCRIPTION_RE_ACTIVATED:
          await this.handleSubscriptionReactivated(event);
          break;

        case PayPalWebhookEventType.SUBSCRIPTION_PAYMENT_FAILED:
          await this.handleSubscriptionPaymentFailed(event);
          break;

        // Payment events
        case PayPalWebhookEventType.PAYMENT_SALE_COMPLETED:
        case PayPalWebhookEventType.PAYMENT_CAPTURE_COMPLETED:
          await this.handlePaymentCompleted(event);
          break;

        case PayPalWebhookEventType.PAYMENT_SALE_REFUNDED:
        case PayPalWebhookEventType.PAYMENT_CAPTURE_REFUNDED:
          await this.handlePaymentRefunded(event);
          break;

        case PayPalWebhookEventType.PAYMENT_SALE_REVERSED:
          await this.handlePaymentReversed(event);
          break;

        // Dispute events
        case PayPalWebhookEventType.CUSTOMER_DISPUTE_CREATED:
          await this.handleDisputeCreated(event);
          break;

        case PayPalWebhookEventType.CUSTOMER_DISPUTE_RESOLVED:
          await this.handleDisputeResolved(event);
          break;

        default:
          this.logger.debug(`Unhandled PayPal webhook event type: ${event.event_type}`);
      }

      // Store webhook event for audit
      await this.storeWebhookEvent(event);

      return { status: 'success', message: `Processed ${event.event_type}` };
    } catch (error) {
      this.logger.error(`Error processing webhook ${event.id}:`, error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async handleSubscriptionCreated(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const subscriptionId = resource.id;

    this.logger.log(`PayPal subscription created: ${subscriptionId}`);

    // Find or create subscription in our system
    // PayPal subscription ID is stored in metadata.paypalSubscriptionId
    const subscription = await this.findSubscriptionByPayPalId(subscriptionId);

    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          metadata: {
            ...(subscription.metadata || {}),
            paypalSubscriptionId: subscriptionId,
            paypalStatus: resource.status,
            paypalPlanId: resource.plan_id,
            paypalCreatedAt: resource.create_time,
          },
        },
      });
    }

    this.eventEmitter.emit('paypal.subscription.created', {
      paypalSubscriptionId: subscriptionId,
      planId: resource.plan_id,
      status: resource.status,
    });
  }

  private async handleSubscriptionActivated(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const subscriptionId = resource.id;

    this.logger.log(`PayPal subscription activated: ${subscriptionId}`);

    const subscription = await this.findSubscriptionByPayPalId(subscriptionId);
    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          metadata: {
            ...(subscription.metadata || {}),
            paypalStatus: 'ACTIVE',
            paypalActivatedAt: new Date().toISOString(),
          },
        },
      });

      this.eventEmitter.emit('subscription.activated', {
        subscriptionId: subscription.id,
        source: 'paypal',
      });
    }
  }

  private async handleSubscriptionCancelled(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const subscriptionId = resource.id;

    this.logger.log(`PayPal subscription cancelled: ${subscriptionId}`);

    const subscription = await this.findSubscriptionByPayPalId(subscriptionId);
    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
          cancelReason: 'Cancelled via PayPal',
          metadata: {
            ...(subscription.metadata || {}),
            paypalStatus: 'CANCELLED',
            paypalCancelledAt: new Date().toISOString(),
          },
        },
      });

      this.eventEmitter.emit('subscription.canceled', {
        subscriptionId: subscription.id,
        source: 'paypal',
        reason: 'User cancelled via PayPal',
      });
    }
  }

  private async handleSubscriptionSuspended(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const subscriptionId = resource.id;

    this.logger.log(`PayPal subscription suspended: ${subscriptionId}`);

    const subscription = await this.findSubscriptionByPayPalId(subscriptionId);
    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.PAUSED,
          pausedAt: new Date(),
          metadata: {
            ...(subscription.metadata || {}),
            paypalStatus: 'SUSPENDED',
            paypalSuspendedAt: new Date().toISOString(),
          },
        },
      });

      this.eventEmitter.emit('subscription.paused', {
        subscriptionId: subscription.id,
        source: 'paypal',
        reason: 'Suspended by PayPal',
      });
    }
  }

  private async handleSubscriptionExpired(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const subscriptionId = resource.id;

    this.logger.log(`PayPal subscription expired: ${subscriptionId}`);

    const subscription = await this.findSubscriptionByPayPalId(subscriptionId);
    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.EXPIRED,
          metadata: {
            ...(subscription.metadata || {}),
            paypalStatus: 'EXPIRED',
            paypalExpiredAt: new Date().toISOString(),
          },
        },
      });

      this.eventEmitter.emit('subscription.expired', {
        subscriptionId: subscription.id,
        source: 'paypal',
      });
    }
  }

  private async handleSubscriptionReactivated(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const subscriptionId = resource.id;

    this.logger.log(`PayPal subscription reactivated: ${subscriptionId}`);

    const subscription = await this.findSubscriptionByPayPalId(subscriptionId);
    if (subscription) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          pausedAt: null,
          pauseResumeAt: null,
          metadata: {
            ...(subscription.metadata || {}),
            paypalStatus: 'ACTIVE',
            paypalReactivatedAt: new Date().toISOString(),
          },
        },
      });

      this.eventEmitter.emit('subscription.resumed', {
        subscriptionId: subscription.id,
        source: 'paypal',
      });
    }
  }

  private async handleSubscriptionPaymentFailed(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const subscriptionId = resource.id;

    this.logger.warn(`PayPal subscription payment failed: ${subscriptionId}`);

    const subscription = await this.findSubscriptionByPayPalId(subscriptionId);
    if (subscription) {
      // PayPal handles dunning automatically, we just track the failure
      const failureCount = ((subscription.metadata as any)?.paypalFailureCount || 0) + 1;

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          // Don't change status - PayPal handles the suspension if needed
          metadata: {
            ...(subscription.metadata || {}),
            paypalLastFailure: new Date().toISOString(),
            paypalFailureCount: failureCount,
            paypalFailureReason: resource.status_update_reason,
          },
        },
      });

      this.eventEmitter.emit('subscription.payment_failed', {
        subscriptionId: subscription.id,
        source: 'paypal',
        reason: resource.status_update_reason,
        failureCount,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENT EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async handlePaymentCompleted(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const paymentId = resource.id;
    const amount = parseFloat(resource.amount?.total || resource.amount?.value || '0');
    const currency = resource.amount?.currency || resource.amount?.currency_code || 'USD';

    this.logger.log(`PayPal payment completed: ${paymentId} - ${amount} ${currency}`);

    // For subscription payments, find the billing agreement ID
    const billingAgreementId = resource.billing_agreement_id ||
      resource.supplementary_data?.related_ids?.billing_agreement_id;

    if (billingAgreementId) {
      const subscription = await this.findSubscriptionByPayPalId(billingAgreementId);
      if (subscription) {
        // Calculate next billing period based on interval
        const now = new Date();
        const periodStart = now;
        const periodEnd = this.calculateNextPeriodEnd(now, subscription.interval);

        // Update subscription billing dates
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            nextBillingDate: periodEnd,
            metadata: {
              ...(subscription.metadata || {}),
              paypalLastPaymentId: paymentId,
              paypalLastPaymentAt: now.toISOString(),
              paypalLastPaymentAmount: amount,
            },
          },
        });

        // Create transaction record
        await this.prisma.transaction.create({
          data: {
            companyId: subscription.companyId,
            customerId: subscription.customerId,
            subscriptionId: subscription.id,
            transactionNumber: `PP-${paymentId.slice(-8).toUpperCase()}`,
            type: 'CHARGE',
            amount,
            currency,
            status: 'COMPLETED',
            providerTransactionId: paymentId,
            providerResponse: {
              source: 'paypal_webhook',
              eventId: event.id,
              billingAgreementId,
              paymentMethod: 'PAYPAL',
            },
          },
        });

        this.eventEmitter.emit('subscription.rebill.success', {
          subscriptionId: subscription.id,
          transactionId: paymentId,
          amount,
          source: 'paypal',
        });
      }
    }
  }

  private async handlePaymentRefunded(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const refundId = resource.id;
    const originalSaleId = resource.sale_id || resource.parent_payment;

    this.logger.log(`PayPal payment refunded: ${refundId} (original: ${originalSaleId})`);

    // Find the original transaction
    const originalTxn = await this.prisma.transaction.findFirst({
      where: { providerTransactionId: originalSaleId },
    });

    if (originalTxn) {
      const amount = parseFloat(resource.amount?.total || resource.amount?.value || '0');

      // Create refund transaction
      await this.prisma.transaction.create({
        data: {
          companyId: originalTxn.companyId,
          customerId: originalTxn.customerId,
          subscriptionId: originalTxn.subscriptionId,
          transactionNumber: `PP-R-${refundId.slice(-8).toUpperCase()}`,
          type: 'REFUND',
          amount,
          currency: originalTxn.currency,
          status: 'COMPLETED',
          providerTransactionId: refundId,
          parentTransactionId: originalTxn.id,
          providerResponse: {
            source: 'paypal_webhook',
            eventId: event.id,
            originalSaleId,
            paymentMethod: 'PAYPAL',
          },
        },
      });

      this.eventEmitter.emit('transaction.refunded', {
        transactionId: originalTxn.id,
        refundId,
        amount,
        source: 'paypal',
      });
    }
  }

  private async handlePaymentReversed(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const saleId = resource.id || resource.sale_id;

    this.logger.warn(`PayPal payment reversed (chargeback): ${saleId}`);

    const originalTxn = await this.prisma.transaction.findFirst({
      where: { providerTransactionId: saleId },
    });

    if (originalTxn) {
      await this.prisma.transaction.update({
        where: { id: originalTxn.id },
        data: {
          status: 'DISPUTED',
          providerResponse: {
            ...((originalTxn.providerResponse as Record<string, any>) || {}),
            reversedAt: new Date().toISOString(),
            reversalReason: resource.reason_code,
          },
        },
      });

      this.eventEmitter.emit('transaction.disputed', {
        transactionId: originalTxn.id,
        reason: resource.reason_code,
        source: 'paypal',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISPUTE EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async handleDisputeCreated(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const disputeId = resource.dispute_id;
    const transactionId = resource.disputed_transactions?.[0]?.seller_transaction_id;

    this.logger.warn(`PayPal dispute created: ${disputeId} for transaction ${transactionId}`);

    if (transactionId) {
      const txn = await this.prisma.transaction.findFirst({
        where: { providerTransactionId: transactionId },
      });

      if (txn) {
        await this.prisma.transaction.update({
          where: { id: txn.id },
          data: {
            status: 'DISPUTED',
            providerResponse: {
              ...((txn.providerResponse as Record<string, any>) || {}),
              disputeId,
              disputeReason: resource.reason,
              disputeStatus: resource.status,
              disputeCreatedAt: resource.create_time,
            },
          },
        });
      }
    }

    this.eventEmitter.emit('paypal.dispute.created', {
      disputeId,
      transactionId,
      reason: resource.reason,
      amount: resource.dispute_amount,
    });
  }

  private async handleDisputeResolved(event: PayPalWebhookEvent): Promise<void> {
    const resource = event.resource;
    const disputeId = resource.dispute_id;

    this.logger.log(`PayPal dispute resolved: ${disputeId} - ${resource.dispute_outcome}`);

    // Find transaction with this dispute ID in providerResponse JSON
    const txn = await this.prisma.transaction.findFirst({
      where: {
        providerResponse: {
          path: ['disputeId'],
          equals: disputeId,
        },
      },
    });

    if (txn) {
      const wonDispute = resource.dispute_outcome?.outcome_code === 'RESOLVED_BUYER_FAVOUR' ? false : true;

      await this.prisma.transaction.update({
        where: { id: txn.id },
        data: {
          status: wonDispute ? 'COMPLETED' : 'REFUNDED',
          providerResponse: {
            ...((txn.providerResponse as Record<string, any>) || {}),
            disputeResolvedAt: new Date().toISOString(),
            disputeOutcome: resource.dispute_outcome,
            disputeWon: wonDispute,
          },
        },
      });
    }

    this.eventEmitter.emit('paypal.dispute.resolved', {
      disputeId,
      outcome: resource.dispute_outcome,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  private async findSubscriptionByPayPalId(paypalSubscriptionId: string): Promise<any> {
    return this.prisma.subscription.findFirst({
      where: {
        metadata: {
          path: ['paypalSubscriptionId'],
          equals: paypalSubscriptionId,
        },
      },
    });
  }

  private calculateNextPeriodEnd(start: Date, interval: string): Date {
    const end = new Date(start);
    switch (interval) {
      case 'DAILY':
        end.setDate(end.getDate() + 1);
        break;
      case 'WEEKLY':
        end.setDate(end.getDate() + 7);
        break;
      case 'BIWEEKLY':
        end.setDate(end.getDate() + 14);
        break;
      case 'MONTHLY':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'QUARTERLY':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'YEARLY':
        end.setFullYear(end.getFullYear() + 1);
        break;
      default:
        end.setMonth(end.getMonth() + 1);
    }
    return end;
  }

  private async storeWebhookEvent(event: PayPalWebhookEvent): Promise<void> {
    // Store in audit log or webhook events table
    // For now, just log it
    this.logger.debug(`Stored webhook event: ${event.id}`);
  }

  /**
   * Verify PayPal webhook signature
   * Uses PayPal's verify webhook signature API
   */
  private async verifyWebhookSignature(
    headers: Record<string, string>,
    rawBody: string,
  ): Promise<WebhookVerificationResult> {
    const transmissionId = headers['paypal-transmission-id'];
    const transmissionTime = headers['paypal-transmission-time'];
    const transmissionSig = headers['paypal-transmission-sig'];
    const certUrl = headers['paypal-cert-url'];
    const authAlgo = headers['paypal-auth-algo'];

    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl) {
      return { verified: false, error: 'Missing required PayPal headers' };
    }

    try {
      // Get access token for API call
      const accessToken = await this.getAccessToken();

      // Call PayPal verify endpoint
      const verifyData = JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: this.webhookId,
        webhook_event: JSON.parse(rawBody),
      });

      return new Promise((resolve) => {
        const options: https.RequestOptions = {
          hostname: this.apiEndpoint,
          port: 443,
          path: '/v1/notifications/verify-webhook-signature',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(verifyData),
          },
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              resolve({
                verified: response.verification_status === 'SUCCESS',
                error: response.verification_status !== 'SUCCESS' ? 'Verification failed' : undefined,
              });
            } catch {
              resolve({ verified: false, error: 'Failed to parse verification response' });
            }
          });
        });

        req.on('error', (error) => {
          resolve({ verified: false, error: error.message });
        });

        req.setTimeout(10000, () => {
          req.destroy();
          resolve({ verified: false, error: 'Verification timeout' });
        });

        req.write(verifyData);
        req.end();
      });
    } catch (error) {
      return { verified: false, error: (error as Error).message };
    }
  }

  private async getAccessToken(): Promise<string> {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const postData = 'grant_type=client_credentials';

      const options: https.RequestOptions = {
        hostname: this.apiEndpoint,
        port: 443,
        path: '/v1/oauth2/token',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.access_token) {
              resolve(response.access_token);
            } else {
              reject(new Error(response.error_description || 'Failed to get access token'));
            }
          } catch {
            reject(new Error('Failed to parse auth response'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('Auth timeout')); });
      req.write(postData);
      req.end();
    });
  }
}
