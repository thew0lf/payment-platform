import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FunnelSessionsService } from './funnel-sessions.service';
import { CardVaultService } from '../../card-vault/services/card-vault.service';
import { PaymentProcessingService, ProcessPaymentOptions, PaymentResult } from '../../payments/services/payment-processing.service';
import { OrdersService } from '../../orders/services/orders.service';
import { LeadCaptureService } from '../../leads/services/lead-capture.service';
import { FunnelPricingService, ShippingCalculationResult, TaxCalculationResult } from './funnel-pricing.service';
import { TransactionRequest, TransactionType } from '../../payments/types/payment.types';
import { Prisma, CardVaultProvider, FunnelSessionStatus } from '@prisma/client';

export interface FunnelCheckoutDto {
  sessionToken: string;
  card: {
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardholderName?: string;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    email?: string;
    phone?: string;
  };
  saveCard?: boolean;
  email: string;
}

export interface FunnelCheckoutResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  transactionId?: string;
  customerId?: string;
  error?: string;
  errorCode?: string;
}

@Injectable()
export class FunnelPaymentService {
  private readonly logger = new Logger(FunnelPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly sessionsService: FunnelSessionsService,
    private readonly cardVaultService: CardVaultService,
    private readonly paymentService: PaymentProcessingService,
    private readonly ordersService: OrdersService,
    private readonly leadCaptureService: LeadCaptureService,
    private readonly pricingService: FunnelPricingService,
  ) {}

  /**
   * Process a checkout from a funnel session
   * This is the main entry point for funnel purchases
   */
  async processCheckout(dto: FunnelCheckoutDto): Promise<FunnelCheckoutResult> {
    const startTime = Date.now();

    // 1. Get and validate session
    const session = await this.sessionsService.findByToken(dto.sessionToken);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== FunnelSessionStatus.ACTIVE) {
      throw new BadRequestException(`Session is ${session.status}, cannot checkout`);
    }

    const funnel = session.funnel;

    // Safely extract selectedProducts - handle malformed data
    const rawProducts = session.selectedProducts as unknown;
    let selectedProducts: Array<{
      productId: string;
      quantity: number;
      price: number;
      name: string;
      sku?: string;
    }> = [];

    if (Array.isArray(rawProducts)) {
      selectedProducts = rawProducts.filter(
        (p): p is { productId: string; quantity: number; price: number; name: string; sku?: string } =>
          p && typeof p === 'object' && 'productId' in p && 'price' in p
      );
    }

    if (selectedProducts.length === 0) {
      throw new BadRequestException('No products selected');
    }

    // Build shipping address for pricing calculation
    const sessionShippingAddr = session.shippingAddress as Record<string, unknown> | null;
    const pricingShippingAddress = {
      state: (sessionShippingAddr?.state as string) || dto.billingAddress.state,
      postalCode: (sessionShippingAddr?.postalCode as string) || dto.billingAddress.postalCode,
      country: (sessionShippingAddr?.country as string) || dto.billingAddress.country,
    };

    // Calculate complete pricing (subtotal, shipping, tax)
    const pricing = await this.pricingService.calculatePricing(
      selectedProducts.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        price: p.price,
      })),
      pricingShippingAddress,
    );

    const subtotal = pricing.subtotal;
    const shippingAmount = pricing.shipping.shippingAmount;
    const taxAmount = pricing.tax.taxAmount;
    const total = pricing.total;

    // Get company info
    const company = await this.prisma.company.findUnique({
      where: { id: funnel.companyId },
      include: { client: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    this.logger.log(`Processing checkout for session ${dto.sessionToken}, amount: ${total}`);

    // 2. Store card temporarily (encrypted, 15 min TTL)
    let encryptedCardId: string | undefined;
    try {
      const storedCard = await this.cardVaultService.storeCardTemporarily({
        companyId: funnel.companyId,
        sessionToken: dto.sessionToken,
        cardNumber: dto.card.number,
        cvv: dto.card.cvv,
        expirationMonth: parseInt(dto.card.expiryMonth, 10),
        expirationYear: parseInt(dto.card.expiryYear, 10),
        cardholderName: dto.card.cardholderName,
        billingAddress: {
          address1: dto.billingAddress.street1,
          address2: dto.billingAddress.street2,
          city: dto.billingAddress.city,
          state: dto.billingAddress.state,
          postalCode: dto.billingAddress.postalCode,
          country: dto.billingAddress.country,
        },
      });
      encryptedCardId = storedCard.id;
      this.logger.debug(`Card stored temporarily: ${encryptedCardId}`);
    } catch (error) {
      this.logger.error(`Failed to store card: ${(error as Error).message}`);
      return {
        success: false,
        error: 'Failed to process card',
        errorCode: 'CARD_STORAGE_ERROR',
      };
    }

    // 3. Process payment
    const transactionRequest: TransactionRequest = {
      referenceId: `FNL-${session.id.slice(0, 8)}-${Date.now()}`,
      type: TransactionType.SALE,
      amount: total,
      currency: 'USD',
      card: {
        number: dto.card.number,
        expiryMonth: dto.card.expiryMonth,
        expiryYear: dto.card.expiryYear,
        cvv: dto.card.cvv,
        cardholderName: dto.card.cardholderName,
      },
      billingAddress: dto.billingAddress,
      description: `Funnel purchase: ${funnel.name}`,
      metadata: {
        funnelId: funnel.id,
        sessionToken: dto.sessionToken,
        variantId: session.variantId || '',
      },
    };

    const paymentOptions: ProcessPaymentOptions = {
      companyId: funnel.companyId,
      allowFallback: true,
      metadata: {
        source: 'funnel',
        funnelId: funnel.id,
      },
    };

    let paymentResult: PaymentResult;
    try {
      paymentResult = await this.paymentService.sale(transactionRequest, paymentOptions);
    } catch (error) {
      this.logger.error(`Payment processing failed: ${(error as Error).message}`);

      // Mark encrypted card as processed (failed)
      if (encryptedCardId) {
        await this.cardVaultService.markEncryptedCardProcessed(encryptedCardId);
      }

      return {
        success: false,
        error: (error as Error).message || 'Payment processing failed',
        errorCode: 'PAYMENT_ERROR',
      };
    }

    if (!paymentResult.success) {
      this.logger.warn(`Payment declined: ${paymentResult.errorMessage}`);

      // Mark encrypted card as processed
      if (encryptedCardId) {
        await this.cardVaultService.markEncryptedCardProcessed(encryptedCardId);
      }

      return {
        success: false,
        error: paymentResult.errorMessage || 'Payment declined',
        errorCode: paymentResult.declineCode || paymentResult.errorCode || 'DECLINED',
        transactionId: paymentResult.transactionId,
      };
    }

    this.logger.log(`Payment approved: ${paymentResult.transactionId}`);

    // 4. Find or create customer
    let customer = await this.prisma.customer.findFirst({
      where: {
        companyId: funnel.companyId,
        email: dto.email,
      },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          companyId: funnel.companyId,
          email: dto.email,
          firstName: dto.billingAddress.firstName,
          lastName: dto.billingAddress.lastName,
          phone: dto.billingAddress.phone,
          status: 'ACTIVE',
          metadata: {
            source: 'funnel',
            funnelId: funnel.id,
            sessionToken: dto.sessionToken,
          } as Prisma.InputJsonValue,
        },
      });
      this.logger.log(`Created customer: ${customer.id}`);
    }

    // 5. Create order
    const orderItems = selectedProducts.map((p) => ({
      productId: p.productId,
      sku: p.sku || `SKU-${p.productId.slice(0, 8)}`,
      name: p.name,
      quantity: p.quantity,
      unitPrice: p.price,
    }));

    // Build shipping address from session or billing
    const sessionShipping = session.shippingAddress as Record<string, unknown> | null;
    const shippingAddr = {
      firstName: (sessionShipping?.firstName as string) || dto.billingAddress.firstName,
      lastName: (sessionShipping?.lastName as string) || dto.billingAddress.lastName,
      address1: (sessionShipping?.street1 as string) || (sessionShipping?.address1 as string) || dto.billingAddress.street1,
      address2: (sessionShipping?.street2 as string) || (sessionShipping?.address2 as string) || dto.billingAddress.street2,
      city: (sessionShipping?.city as string) || dto.billingAddress.city,
      state: (sessionShipping?.state as string) || dto.billingAddress.state,
      postalCode: (sessionShipping?.postalCode as string) || dto.billingAddress.postalCode,
      country: (sessionShipping?.country as string) || dto.billingAddress.country,
    };

    const order = await this.ordersService.create(
      funnel.companyId,
      {
        customerId: customer.id,
        items: orderItems,
        shippingAddress: shippingAddr,
        billingAddress: {
          firstName: dto.billingAddress.firstName,
          lastName: dto.billingAddress.lastName,
          address1: dto.billingAddress.street1,
          address2: dto.billingAddress.street2,
          city: dto.billingAddress.city,
          state: dto.billingAddress.state,
          postalCode: dto.billingAddress.postalCode,
          country: dto.billingAddress.country,
        },
        currency: 'USD',
        shippingAmount,
        metadata: {
          funnelId: funnel.id,
          sessionToken: dto.sessionToken,
          transactionId: paymentResult.transactionId,
          providerId: paymentResult.providerId,
        },
      },
      'system', // userId - funnel purchases are system-initiated
    );

    this.logger.log(`Created order: ${order.orderNumber}`);

    // 6. Mark order as paid
    await this.ordersService.markPaid(
      order.id,
      funnel.companyId,
      'system',
      paymentResult.providerName,
    );

    // 7. Vault card if requested and payment had token
    if (dto.saveCard && paymentResult.token) {
      try {
        // Map provider name to CardVaultProvider enum
        const vaultProvider = this.mapToVaultProvider(paymentResult.providerName);

        await this.cardVaultService.createVaultFromEncrypted({
          encryptedCardId: encryptedCardId!,
          customerId: customer.id,
          provider: vaultProvider,
          providerToken: paymentResult.token.token,
          isDefault: true,
        });
        this.logger.log(`Card vaulted for customer ${customer.id}`);
      } catch (error) {
        // Don't fail the checkout if vaulting fails
        this.logger.warn(`Failed to vault card: ${(error as Error).message}`);
      }
    } else if (encryptedCardId) {
      // Mark as processed without vaulting
      await this.cardVaultService.markEncryptedCardProcessed(encryptedCardId);
    }

    // 8. Complete funnel session
    await this.sessionsService.complete(
      dto.sessionToken,
      order.id,
      total,
      'USD',
    );

    // 9. Convert lead to customer if lead exists
    try {
      const lead = await this.prisma.lead.findFirst({
        where: {
          companyId: funnel.companyId,
          OR: [
            { email: dto.email },
            { sessions: { some: { sessionToken: dto.sessionToken } } },
          ],
        },
      });

      if (lead) {
        await this.leadCaptureService.convertToCustomer(lead.id, customer.id, order.id);
        this.logger.log(`Converted lead ${lead.id} to customer ${customer.id}`);
      }
    } catch (error) {
      // Don't fail checkout if lead conversion fails
      this.logger.warn(`Failed to convert lead: ${(error as Error).message}`);
    }

    // 10. Emit events
    this.eventEmitter.emit('funnel.checkout_completed', {
      sessionToken: dto.sessionToken,
      funnelId: funnel.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: customer.id,
      amount: total,
      processingTimeMs: Date.now() - startTime,
    });

    this.logger.log(
      `Checkout completed in ${Date.now() - startTime}ms: Order ${order.orderNumber}`,
    );

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      transactionId: paymentResult.transactionId,
      customerId: customer.id,
    };
  }

  /**
   * Map payment provider name to CardVaultProvider enum
   */
  private mapToVaultProvider(providerName: string): CardVaultProvider {
    const name = providerName.toLowerCase();

    if (name.includes('payflow') || name.includes('paypal')) {
      return CardVaultProvider.PAYPAL_PAYFLOW;
    }
    if (name.includes('stripe')) {
      return CardVaultProvider.STRIPE;
    }
    if (name.includes('nmi')) {
      return CardVaultProvider.NMI;
    }
    if (name.includes('authorize')) {
      return CardVaultProvider.AUTHORIZE_NET;
    }

    return CardVaultProvider.INTERNAL;
  }

  /**
   * Get checkout summary for a session (pre-checkout)
   */
  async getCheckoutSummary(sessionToken: string) {
    const session = await this.sessionsService.findByToken(sessionToken);

    // Safely extract selectedProducts - handle malformed data
    const rawProducts = session.selectedProducts as unknown;
    let selectedProducts: Array<{
      productId: string;
      quantity: number;
      price: number;
      name: string;
    }> = [];

    if (Array.isArray(rawProducts)) {
      selectedProducts = rawProducts.filter(
        (p): p is { productId: string; quantity: number; price: number; name: string } =>
          p && typeof p === 'object' && 'productId' in p && 'price' in p
      );
    }

    // Get shipping address from session (required for pricing)
    const sessionShipping = session.shippingAddress as Record<string, unknown> | null;
    const shippingAddress = {
      state: (sessionShipping?.state as string) || 'CA', // Default for preview
      postalCode: (sessionShipping?.postalCode as string) || '90210',
      country: (sessionShipping?.country as string) || 'US',
    };

    // Calculate pricing if products selected and shipping address available
    let subtotal = 0;
    let shippingAmount = 0;
    let taxAmount = 0;
    let total = 0;
    let shippingDetails: { carrier: string; estimatedDays: number; method: string } | null = null;
    let taxDetails: { taxRate: number; taxJurisdiction: string } | null = null;

    if (selectedProducts.length > 0 && sessionShipping?.state) {
      const pricing = await this.pricingService.calculatePricing(
        selectedProducts.map((p) => ({
          productId: p.productId,
          quantity: p.quantity,
          price: p.price,
        })),
        shippingAddress,
      );

      subtotal = pricing.subtotal;
      shippingAmount = pricing.shipping.shippingAmount;
      taxAmount = pricing.tax.taxAmount;
      total = pricing.total;
      shippingDetails = {
        carrier: pricing.shipping.carrier,
        estimatedDays: pricing.shipping.estimatedDays,
        method: pricing.shipping.method,
      };
      taxDetails = {
        taxRate: pricing.tax.taxRate,
        taxJurisdiction: pricing.tax.taxJurisdiction,
      };
    } else {
      // Just calculate subtotal if no shipping address yet
      subtotal = selectedProducts.reduce((sum, p) => sum + p.price * p.quantity, 0);
      total = subtotal; // Tax and shipping TBD
    }

    return {
      sessionToken,
      funnelId: session.funnelId,
      funnelName: session.funnel.name,
      items: selectedProducts,
      subtotal,
      shippingAmount,
      shippingDetails,
      taxAmount,
      taxDetails,
      total,
      currency: 'USD',
      shippingAddress: session.shippingAddress,
      customerInfo: session.customerInfo,
    };
  }
}
