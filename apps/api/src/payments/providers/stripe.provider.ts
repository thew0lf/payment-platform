/**
 * Stripe Payment Provider
 *
 * Uses Stripe's Payment Intents API for card processing.
 * Supports one-time payments, tokenization, and 3D Secure.
 *
 * @see https://stripe.com/docs/api/payment_intents
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { AbstractPaymentProvider } from './abstract-payment.provider';
import {
  PaymentProviderType, ProviderConfig, ProviderHealth, TransactionRequest,
  TransactionResponse, TransactionStatus, TransactionType, TokenizedCard,
  CardData, CardBrand, AVSResult, CVVResult, StripeCredentials,
} from '../types/payment.types';

@Injectable()
export class StripeProvider extends AbstractPaymentProvider {
  private readonly credentials: StripeCredentials;
  private readonly stripe: Stripe;

  constructor(config: ProviderConfig, configService?: ConfigService) {
    super(config);
    this.credentials = config.credentials as StripeCredentials;

    // Initialize Stripe client - use SDK default API version
    this.stripe = new Stripe(this.credentials.secretKey);

    this.logger.log(`StripeProvider initialized (${this.credentials.environment || 'test'})`);
  }

  getProviderType(): PaymentProviderType { return PaymentProviderType.STRIPE; }

  async sale(request: TransactionRequest): Promise<TransactionResponse> {
    const startTime = Date.now();
    this.logTransaction('SALE', request);
    try {
      // Create payment intent with immediate capture
      const paymentIntent = await this.createPaymentIntent(request, true);
      const result = this.parsePaymentIntentResponse(request, paymentIntent);
      this.updateHealth(result.success, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'STRIPE_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'STRIPE_ERROR', `Failed: ${(error as Error).message}`);
    }
  }

  async authorize(request: TransactionRequest): Promise<TransactionResponse> {
    const startTime = Date.now();
    this.logTransaction('AUTHORIZE', request);
    try {
      // Create payment intent with manual capture
      const paymentIntent = await this.createPaymentIntent(request, false);
      const result = this.parsePaymentIntentResponse(request, paymentIntent);
      this.updateHealth(result.success, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'STRIPE_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'STRIPE_ERROR', `Failed: ${(error as Error).message}`);
    }
  }

  async capture(transactionId: string, amount?: number): Promise<TransactionResponse> {
    const startTime = Date.now();
    const request: TransactionRequest = {
      referenceId: this.generateReferenceId(),
      type: TransactionType.CAPTURE,
      amount: amount || 0,
      currency: 'USD',
      originalTransactionId: transactionId
    };
    try {
      const paymentIntent = await this.stripe.paymentIntents.capture(transactionId, {
        amount_to_capture: amount ? Math.round(amount * 100) : undefined,
      });
      const result = this.parsePaymentIntentResponse(request, paymentIntent);
      this.updateHealth(result.success, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'CAPTURE_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'CAPTURE_ERROR', `Failed: ${(error as Error).message}`);
    }
  }

  async void(transactionId: string): Promise<TransactionResponse> {
    const startTime = Date.now();
    const request: TransactionRequest = {
      referenceId: this.generateReferenceId(),
      type: TransactionType.VOID,
      amount: 0,
      currency: 'USD',
      originalTransactionId: transactionId
    };
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(transactionId);
      const result: TransactionResponse = {
        success: paymentIntent.status === 'canceled',
        status: paymentIntent.status === 'canceled' ? TransactionStatus.VOIDED : TransactionStatus.ERROR,
        transactionId: paymentIntent.id,
        referenceId: request.referenceId,
        amount: (paymentIntent.amount || 0) / 100,
        currency: paymentIntent.currency?.toUpperCase() || 'USD',
        rawResponse: paymentIntent as unknown as Record<string, unknown>,
        processedAt: new Date(),
      };
      this.updateHealth(result.success, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'VOID_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'VOID_ERROR', `Failed: ${(error as Error).message}`);
    }
  }

  async refund(transactionId: string, amount?: number): Promise<TransactionResponse> {
    const startTime = Date.now();
    const request: TransactionRequest = {
      referenceId: this.generateReferenceId(),
      type: TransactionType.REFUND,
      amount: amount || 0,
      currency: 'USD',
      originalTransactionId: transactionId
    };
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: transactionId,
        amount: amount ? Math.round(amount * 100) : undefined, // Full refund if not specified
      });

      const result: TransactionResponse = {
        success: refund.status === 'succeeded' || refund.status === 'pending',
        status: refund.status === 'succeeded' ? TransactionStatus.REFUNDED : TransactionStatus.PENDING,
        transactionId: refund.id,
        referenceId: request.referenceId,
        amount: (refund.amount || 0) / 100,
        currency: refund.currency?.toUpperCase() || 'USD',
        rawResponse: refund as unknown as Record<string, unknown>,
        processedAt: new Date(),
      };
      this.updateHealth(result.success, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'REFUND_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'REFUND_ERROR', `Failed: ${(error as Error).message}`);
    }
  }

  async verify(request: TransactionRequest): Promise<TransactionResponse> {
    // For Stripe, use a $1 authorization and immediately void it
    const startTime = Date.now();
    this.logTransaction('VERIFY', request);
    try {
      // Create a $1 auth-only payment intent
      const paymentIntent = await this.createPaymentIntent({ ...request, amount: 1.00 }, false);

      // Immediately cancel it
      if (paymentIntent.status === 'requires_capture') {
        await this.stripe.paymentIntents.cancel(paymentIntent.id);
      }

      const success = paymentIntent.status === 'requires_capture' || paymentIntent.status === 'succeeded';
      const result: TransactionResponse = {
        success,
        status: success ? TransactionStatus.APPROVED : TransactionStatus.DECLINED,
        transactionId: paymentIntent.id,
        referenceId: request.referenceId,
        amount: 0,
        currency: request.currency || 'USD',
        rawResponse: paymentIntent as unknown as Record<string, unknown>,
        processedAt: new Date(),
      };
      this.updateHealth(result.success, Date.now() - startTime);
      return result;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'VERIFY_ERROR', message: (error as Error).message });
      return this.createErrorResponse(request, 'VERIFY_ERROR', `Failed: ${(error as Error).message}`);
    }
  }

  async tokenize(card: CardData): Promise<TokenizedCard> {
    const startTime = Date.now();
    try {
      // Create a payment method (Stripe's token equivalent)
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: card.number,
          exp_month: parseInt(card.expiryMonth, 10),
          exp_year: parseInt(card.expiryYear, 10),
          cvc: card.cvv,
        },
        billing_details: card.cardholderName ? {
          name: card.cardholderName,
        } : undefined,
      });

      const tokenizedCard: TokenizedCard = {
        token: paymentMethod.id,
        last4: paymentMethod.card?.last4 || card.number.slice(-4),
        brand: this.mapStripeBrand(paymentMethod.card?.brand),
        expiryMonth: paymentMethod.card?.exp_month || parseInt(card.expiryMonth, 10),
        expiryYear: paymentMethod.card?.exp_year || this.normalizeYear(card.expiryYear),
        fingerprint: paymentMethod.card?.fingerprint || this.generateSecureFingerprint(card.number),
      };
      this.updateHealth(true, Date.now() - startTime);
      return tokenizedCard;
    } catch (error) {
      this.updateHealth(false, Date.now() - startTime, { code: 'TOKENIZATION_ERROR', message: (error as Error).message });
      throw error;
    }
  }

  async deleteToken(token: string): Promise<boolean> {
    try {
      // Stripe payment methods can be detached if attached to a customer
      // For non-attached payment methods, they just expire
      await this.stripe.paymentMethods.detach(token);
      return true;
    } catch {
      // Payment method might not be attached, which is fine
      return true;
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      // Use balance API as health check
      await this.stripe.balance.retrieve();
      this.health.status = 'healthy';
      this.health.latencyMs = Date.now() - startTime;
      this.health.lastChecked = new Date();
    } catch (error) {
      this.health.status = 'down';
      this.health.latencyMs = Date.now() - startTime;
      this.health.lastChecked = new Date();
      this.health.lastError = { code: 'HEALTH_CHECK_FAILED', message: (error as Error).message, timestamp: new Date() };
    }
    return this.health;
  }

  private async createPaymentIntent(request: TransactionRequest, capture: boolean): Promise<Stripe.PaymentIntent> {
    // Defensive validation - card should be validated by payment-processing.service.ts
    if (!request.card) {
      throw new Error('Card data required for Stripe payment');
    }

    // Create payment method first with card data
    const paymentMethod = await this.stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: request.card.number,
        exp_month: parseInt(request.card.expiryMonth, 10),
        exp_year: parseInt(request.card.expiryYear, 10),
        cvc: request.card.cvv,
      },
      billing_details: this.buildBillingDetails(request),
    });

    const params: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(request.amount * 100), // Stripe uses cents
      currency: (request.currency || 'USD').toLowerCase(),
      capture_method: capture ? 'automatic' : 'manual',
      confirm: true,
      payment_method: paymentMethod.id,
      metadata: {
        reference_id: request.referenceId,
        order_id: request.orderId || '',
        ...request.metadata,
      },
    };

    // Add shipping if present
    if (request.shippingAddress) {
      params.shipping = {
        name: `${request.shippingAddress.firstName} ${request.shippingAddress.lastName}`,
        address: {
          line1: request.shippingAddress.street1,
          line2: request.shippingAddress.street2,
          city: request.shippingAddress.city,
          state: request.shippingAddress.state,
          postal_code: request.shippingAddress.postalCode,
          country: request.shippingAddress.country,
        },
      };
    }

    // Add description
    if (request.description) {
      params.description = request.description;
    }

    return this.executeWithRetry(async () => {
      return this.stripe.paymentIntents.create(params);
    }, 'Stripe PaymentIntent Create');
  }

  private buildBillingDetails(request: TransactionRequest): Stripe.PaymentMethodCreateParams.BillingDetails {
    const details: Stripe.PaymentMethodCreateParams.BillingDetails = {};

    if (request.card?.cardholderName) {
      details.name = request.card.cardholderName;
    }

    if (request.billingAddress) {
      const addr = request.billingAddress;
      details.name = details.name || `${addr.firstName} ${addr.lastName}`;
      details.email = addr.email;
      details.phone = addr.phone;
      details.address = {
        line1: addr.street1,
        line2: addr.street2,
        city: addr.city,
        state: addr.state,
        postal_code: addr.postalCode,
        country: addr.country,
      };
    }

    return details;
  }

  private parsePaymentIntentResponse(request: TransactionRequest, pi: Stripe.PaymentIntent): TransactionResponse {
    const success = pi.status === 'succeeded' || pi.status === 'requires_capture';

    // Get charge info from latest_charge
    const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
    const charge = typeof pi.latest_charge === 'object' ? pi.latest_charge : null;

    const response: TransactionResponse = {
      success,
      status: this.mapPaymentIntentStatus(pi.status),
      transactionId: pi.id,
      referenceId: request.referenceId,
      amount: (pi.amount || 0) / 100,
      currency: pi.currency?.toUpperCase() || 'USD',
      authorizationCode: charge?.payment_method_details?.card?.network_transaction_id || undefined,
      avsResult: this.mapAVSCheck(charge?.payment_method_details?.card?.checks?.address_postal_code_check || null),
      cvvResult: this.mapCVCCheck(charge?.payment_method_details?.card?.checks?.cvc_check || null),
      rawResponse: pi as unknown as Record<string, unknown>,
      processedAt: new Date(),
    };

    if (!success && charge) {
      if (charge.failure_code) {
        response.errorCode = charge.failure_code;
        response.errorMessage = charge.failure_message || 'Payment failed';

        if (charge.outcome?.type === 'blocked' || charge.outcome?.type === 'issuer_declined') {
          response.status = TransactionStatus.DECLINED;
          response.declineCode = charge.failure_code;
        }
      }
    }

    return response;
  }

  private mapPaymentIntentStatus(status: Stripe.PaymentIntent.Status): TransactionStatus {
    switch (status) {
      case 'succeeded': return TransactionStatus.APPROVED;
      case 'requires_capture': return TransactionStatus.APPROVED; // Auth only
      case 'processing': return TransactionStatus.PROCESSING;
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action': return TransactionStatus.PENDING;
      case 'canceled': return TransactionStatus.VOIDED;
      default: return TransactionStatus.ERROR;
    }
  }

  private mapStripeBrand(brand?: string | null): CardBrand {
    if (!brand) return CardBrand.UNKNOWN;
    const brandMap: Record<string, CardBrand> = {
      'visa': CardBrand.VISA,
      'mastercard': CardBrand.MASTERCARD,
      'amex': CardBrand.AMEX,
      'discover': CardBrand.DISCOVER,
      'diners': CardBrand.DINERS,
      'jcb': CardBrand.JCB,
      'unionpay': CardBrand.UNIONPAY,
    };
    return brandMap[brand.toLowerCase()] || CardBrand.UNKNOWN;
  }

  private mapAVSCheck(check: string | null): AVSResult {
    if (!check) return AVSResult.NOT_AVAILABLE;
    switch (check) {
      case 'pass': return AVSResult.MATCH;
      case 'fail': return AVSResult.NO_MATCH;
      case 'unavailable': return AVSResult.NOT_AVAILABLE;
      case 'unchecked': return AVSResult.NOT_AVAILABLE;
      default: return AVSResult.NOT_AVAILABLE;
    }
  }

  private mapCVCCheck(check: string | null): CVVResult {
    if (!check) return CVVResult.NOT_PROCESSED;
    switch (check) {
      case 'pass': return CVVResult.MATCH;
      case 'fail': return CVVResult.NO_MATCH;
      case 'unavailable': return CVVResult.NOT_SUPPORTED;
      case 'unchecked': return CVVResult.NOT_PROCESSED;
      default: return CVVResult.NOT_PROCESSED;
    }
  }

  private normalizeYear(year: string): number {
    const y = parseInt(year, 10);
    return y < 100 ? 2000 + y : y;
  }

}
