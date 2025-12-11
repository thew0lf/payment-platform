/**
 * Test Checkout Service
 * Processes test transactions against merchant accounts for verification
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MerchantAccountService } from './merchant-account.service';
import {
  TestCheckoutRequestDto,
  TestCheckoutResponseDto,
  TestCheckoutTestCardsDto,
} from '../dto/test-checkout.dto';
import { MerchantAccount, PaymentProviderType } from '../types/merchant-account.types';
import { OrderNumberService } from '../../orders/services/order-number.service';

// Request timeout for provider API calls (30 seconds)
const PROVIDER_TIMEOUT_MS = 30000;

// Test cards for different providers
const PROVIDER_TEST_CARDS: Record<string, Array<{
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  brand: string;
  description: string;
}>> = {
  PAYFLOW: [
    { number: '4032036234479689', expiryMonth: '04', expiryYear: '2030', cvv: '288', brand: 'Visa', description: 'PayPal Sandbox Visa - Approved' },
    { number: '5425233430109903', expiryMonth: '04', expiryYear: '2030', cvv: '123', brand: 'MasterCard', description: 'PayPal Sandbox MasterCard - Approved' },
    { number: '378282246310005', expiryMonth: '04', expiryYear: '2030', cvv: '1234', brand: 'Amex', description: 'PayPal Sandbox Amex - Approved' },
    { number: '6011111111111117', expiryMonth: '04', expiryYear: '2030', cvv: '123', brand: 'Discover', description: 'PayPal Sandbox Discover - Approved' },
  ],
  PAYPAL_CLASSIC: [
    { number: '4032036234479689', expiryMonth: '04', expiryYear: '2030', cvv: '288', brand: 'Visa', description: 'PayPal Classic Sandbox Visa - Approved' },
    { number: '5425233430109903', expiryMonth: '04', expiryYear: '2030', cvv: '123', brand: 'MasterCard', description: 'PayPal Classic Sandbox MasterCard - Approved' },
    { number: '378282246310005', expiryMonth: '04', expiryYear: '2030', cvv: '1234', brand: 'Amex', description: 'PayPal Classic Sandbox Amex - Approved' },
  ],
  PAYPAL_REST: [
    { number: '4032036234479689', expiryMonth: '04', expiryYear: '2030', cvv: '288', brand: 'Visa', description: 'PayPal REST Sandbox Visa - Approved' },
    { number: '5425233430109903', expiryMonth: '04', expiryYear: '2030', cvv: '123', brand: 'MasterCard', description: 'PayPal REST Sandbox MasterCard - Approved' },
  ],
  NMI: [
    { number: '4111111111111111', expiryMonth: '12', expiryYear: '2030', cvv: '999', brand: 'Visa', description: 'NMI Test Visa - Approved' },
    { number: '5431111111111111', expiryMonth: '12', expiryYear: '2030', cvv: '999', brand: 'MasterCard', description: 'NMI Test MasterCard - Approved' },
    { number: '341111111111111', expiryMonth: '12', expiryYear: '2030', cvv: '9999', brand: 'Amex', description: 'NMI Test Amex - Approved' },
  ],
  AUTHORIZE_NET: [
    { number: '4007000000027', expiryMonth: '12', expiryYear: '2030', cvv: '999', brand: 'Visa', description: 'Authorize.Net Test Visa - Approved' },
    { number: '5424000000000015', expiryMonth: '12', expiryYear: '2030', cvv: '999', brand: 'MasterCard', description: 'Authorize.Net Test MasterCard - Approved' },
    { number: '370000000000002', expiryMonth: '12', expiryYear: '2030', cvv: '9999', brand: 'Amex', description: 'Authorize.Net Test Amex - Approved' },
  ],
  STRIPE: [
    { number: '4242424242424242', expiryMonth: '12', expiryYear: '2030', cvv: '123', brand: 'Visa', description: 'Stripe Test Visa - Approved' },
    { number: '5555555555554444', expiryMonth: '12', expiryYear: '2030', cvv: '123', brand: 'MasterCard', description: 'Stripe Test MasterCard - Approved' },
    { number: '378282246310005', expiryMonth: '12', expiryYear: '2030', cvv: '1234', brand: 'Amex', description: 'Stripe Test Amex - Approved' },
    { number: '4000000000000002', expiryMonth: '12', expiryYear: '2030', cvv: '123', brand: 'Visa', description: 'Stripe Test Visa - Declined' },
  ],
};

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = PROVIDER_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sanitize provider response to remove sensitive card data before storage
 */
function sanitizeProviderResponse(response: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...response };

  // Common card-related field patterns to remove or mask
  const sensitiveFields = [
    'ACCT', 'ccnumber', 'cardNumber', 'card_number', 'pan',
    'CVV2', 'cvv', 'cvc', 'cardCode', 'security_code',
    'PWD', 'password', 'transactionKey', 'security_key', 'secretKey', 'apiKey',
  ];

  const maskValue = (value: string, showLast = 4): string => {
    if (value.length <= showLast) return '****';
    return '*'.repeat(value.length - showLast) + value.slice(-showLast);
  };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      if (typeof sanitized[key] === 'string' && (sanitized[key] as string).length > 0) {
        sanitized[key] = maskValue(sanitized[key] as string);
      } else {
        sanitized[key] = '[REDACTED]';
      }
    }
    // Recursively sanitize nested objects
    if (sanitized[key] && typeof sanitized[key] === 'object' && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeProviderResponse(sanitized[key] as Record<string, unknown>);
    }
  }

  return sanitized;
}

@Injectable()
export class TestCheckoutService {
  private readonly logger = new Logger(TestCheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly merchantAccountService: MerchantAccountService,
    private readonly orderNumberService: OrderNumberService,
  ) {}

  /**
   * Get available test cards for a merchant account
   */
  async getTestCards(merchantAccountId: string): Promise<TestCheckoutTestCardsDto> {
    const account = await this.merchantAccountService.findById(merchantAccountId);
    if (!account) {
      throw new NotFoundException(`Merchant account ${merchantAccountId} not found`);
    }

    const testCards = PROVIDER_TEST_CARDS[account.providerType] || [];

    return {
      merchantAccountId: account.id,
      providerType: account.providerType,
      environment: account.environment,
      testCards,
    };
  }

  /**
   * Process a test checkout transaction
   */
  async processTestCheckout(
    dto: TestCheckoutRequestDto,
    userId: string,
  ): Promise<TestCheckoutResponseDto> {
    const startTime = Date.now();

    // Get merchant account
    const account = await this.merchantAccountService.findById(dto.merchantAccountId);
    if (!account) {
      throw new NotFoundException(`Merchant account ${dto.merchantAccountId} not found`);
    }

    // Validate amount
    const amountCents = Math.round(dto.amount * 100);
    if (amountCents < account.limits.minTransactionAmount) {
      throw new BadRequestException(
        `Amount must be at least ${(account.limits.minTransactionAmount / 100).toFixed(2)} ${dto.currency || 'USD'}`,
      );
    }
    if (amountCents > account.limits.maxTransactionAmount) {
      throw new BadRequestException(
        `Amount must be at most ${(account.limits.maxTransactionAmount / 100).toFixed(2)} ${dto.currency || 'USD'}`,
      );
    }

    const currency = dto.currency || 'USD';
    const environment = account.environment;

    // Generate transaction number
    const transactionNumber = await this.generateTransactionNumber(account.companyId);

    let orderId: string | undefined;
    let orderNumber: string | undefined;
    let order: any;

    // Create order if requested (default true)
    if (dto.createOrder !== false) {
      // Get or create a test customer
      const testCustomer = await this.getOrCreateTestCustomer(account.companyId);

      orderNumber = await this.orderNumberService.generate(account.companyId);

      order = await this.prisma.order.create({
        data: {
          companyId: account.companyId,
          customerId: testCustomer.id,
          orderNumber,
          externalId: `test-checkout-${Date.now()}`,
          type: 'ONE_TIME',
          status: 'PENDING',
          shippingSnapshot: {
            firstName: 'Test',
            lastName: 'User',
            address1: '123 Test Street',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94105',
            country: 'US',
          },
          billingSnapshot: {
            firstName: dto.card.cardholderName?.split(' ')[0] || 'Test',
            lastName: dto.card.cardholderName?.split(' ').slice(1).join(' ') || 'User',
            address1: '123 Test Street',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94105',
            country: 'US',
          },
          subtotal: dto.amount,
          discountAmount: 0,
          shippingAmount: 0,
          taxAmount: 0,
          total: dto.amount,
          currency,
          paymentStatus: 'PENDING',
          fulfillmentStatus: 'UNFULFILLED',
          customerNotes: dto.description || 'Test checkout transaction',
          internalNotes: `Test transaction via ${account.providerType}`,
          metadata: {
            testCheckout: true,
            merchantAccountId: account.id,
            userId,
          },
          environment,
          items: {
            create: [{
              sku: 'TEST-PRODUCT-001',
              name: 'Test Product',
              description: 'Test checkout product',
              productSnapshot: {
                sku: 'TEST-PRODUCT-001',
                name: 'Test Product',
                price: dto.amount,
              },
              quantity: 1,
              unitPrice: dto.amount,
              discountAmount: 0,
              taxAmount: 0,
              totalPrice: dto.amount,
              fulfilledQuantity: 0,
              fulfillmentStatus: 'UNFULFILLED',
            }],
          },
        },
      });
      orderId = order.id;
    }

    // Process payment via the provider
    let providerResult: any;
    let success = false;
    let errorMessage: string | undefined;
    let errorCode: string | undefined;
    let providerTransactionId: string | undefined;
    let avsResult: string | undefined;
    let cvvResult: string | undefined;

    try {
      providerResult = await this.processWithProvider(account, dto, amountCents, currency);
      success = providerResult.success;
      providerTransactionId = providerResult.transactionId;
      avsResult = providerResult.avsResult;
      cvvResult = providerResult.cvvResult;

      if (!success) {
        errorMessage = providerResult.errorMessage;
        errorCode = providerResult.errorCode;
      }
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errorCode = 'PROVIDER_ERROR';
      this.logger.error(`Test checkout error: ${errorMessage}`, error);
    }

    // Create transaction record
    const transaction = await this.prisma.transaction.create({
      data: {
        companyId: account.companyId,
        customerId: order?.customerId,
        orderId,
        transactionNumber,
        type: 'CHARGE',
        amount: dto.amount,
        currency,
        description: dto.description || 'Test checkout transaction',
        providerTransactionId,
        providerResponse: providerResult || null,
        status: success ? 'COMPLETED' : 'FAILED',
        failureReason: errorMessage,
        failureCode: errorCode,
        avsResult,
        cvvResult,
        environment,
        processedAt: new Date(),
      },
    });

    // Update order status if created
    if (orderId) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: success ? 'CONFIRMED' : 'CANCELED',
          paymentStatus: success ? 'PAID' : 'FAILED',
          paymentMethod: `${this.getCardBrand(dto.card.number)} ending ${dto.card.number.slice(-4)}`,
          paymentSnapshot: {
            type: 'card',
            brand: this.getCardBrand(dto.card.number),
            last4: dto.card.number.slice(-4),
            expMonth: dto.card.expiryMonth,
            expYear: dto.card.expiryYear,
          },
          confirmedAt: success ? new Date() : undefined,
          cancelReason: success ? undefined : errorMessage,
          canceledAt: success ? undefined : new Date(),
        },
      });
    }

    // Emit event
    this.eventEmitter.emit('test-checkout.completed', {
      merchantAccountId: account.id,
      transactionId: transaction.id,
      orderId,
      success,
      environment,
      userId,
    });

    const processingTimeMs = Date.now() - startTime;

    return {
      success,
      transactionId: transaction.id,
      orderId,
      orderNumber,
      transactionNumber,
      amount: dto.amount,
      currency,
      status: success ? 'COMPLETED' : 'FAILED',
      environment,
      providerTransactionId,
      avsResult,
      cvvResult,
      errorMessage,
      errorCode,
      processingTimeMs,
      createdAt: transaction.createdAt,
    };
  }

  /**
   * Provider result interface for type safety
   */
  private createProviderResult(data: {
    success: boolean;
    transactionId?: string;
    avsResult?: string;
    cvvResult?: string;
    errorMessage?: string;
    errorCode?: string;
    raw?: Record<string, unknown>;
  }) {
    return {
      ...data,
      // Sanitize raw response to remove sensitive data before storage
      raw: data.raw ? sanitizeProviderResponse(data.raw) : undefined,
    };
  }

  /**
   * Process the payment with the appropriate provider
   */
  private async processWithProvider(
    account: MerchantAccount,
    dto: TestCheckoutRequestDto,
    amountCents: number,
    currency: string,
  ): Promise<{
    success: boolean;
    transactionId?: string;
    avsResult?: string;
    cvvResult?: string;
    errorMessage?: string;
    errorCode?: string;
    raw?: Record<string, unknown>;
  }> {
    const credentials = account.credentials as Record<string, string>;
    const isSandbox = account.environment === 'sandbox';

    switch (account.providerType) {
      case 'PAYFLOW':
        return this.processPayflow(credentials, dto, amountCents, currency, isSandbox);
      case 'PAYPAL_CLASSIC':
        return this.processPayPalClassic(credentials, dto, amountCents, currency, isSandbox);
      case 'NMI':
        return this.processNMI(credentials, dto, amountCents, currency, isSandbox);
      case 'AUTHORIZE_NET':
        return this.processAuthorizeNet(credentials, dto, amountCents, currency, isSandbox);
      case 'STRIPE':
        return this.processStripe(credentials, dto, amountCents, currency, isSandbox);
      default:
        throw new BadRequestException(`Provider ${account.providerType} not supported for test checkout`);
    }
  }

  /**
   * Process with PayPal Payflow Pro (NVP API)
   */
  private async processPayflow(
    credentials: Record<string, string>,
    dto: TestCheckoutRequestDto,
    amountCents: number,
    currency: string,
    isSandbox: boolean,
  ) {
    const endpoint = isSandbox
      ? 'https://pilot-payflowpro.paypal.com'
      : 'https://payflowpro.paypal.com';

    const amount = (amountCents / 100).toFixed(2);

    const params = new URLSearchParams({
      PARTNER: credentials.partner || 'PayPal',
      VENDOR: credentials.vendor,
      USER: credentials.user,
      PWD: credentials.password,
      TRXTYPE: 'S', // Sale
      TENDER: 'C', // Credit card
      ACCT: dto.card.number,
      EXPDATE: `${dto.card.expiryMonth}${dto.card.expiryYear.slice(-2)}`,
      CVV2: dto.card.cvv,
      AMT: amount,
      CURRENCY: currency,
      VERBOSITY: 'HIGH',
    });

    if (dto.card.cardholderName) {
      const nameParts = dto.card.cardholderName.split(' ');
      params.set('FIRSTNAME', nameParts[0] || '');
      params.set('LASTNAME', nameParts.slice(1).join(' ') || '');
    }

    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const responseText = await response.text();
      const result = this.parseNVPResponse(responseText) as Record<string, unknown>;

      const success = result.RESULT === '0';

      return this.createProviderResult({
        success,
        transactionId: result.PNREF as string | undefined,
        avsResult: result.AVSADDR === 'Y' && result.AVSZIP === 'Y' ? 'Y' :
                   result.AVSADDR === 'Y' ? 'A' :
                   result.AVSZIP === 'Y' ? 'Z' : 'N',
        cvvResult: result.CVV2MATCH === 'Y' ? 'M' : result.CVV2MATCH === 'N' ? 'N' : 'U',
        errorMessage: success ? undefined : result.RESPMSG as string | undefined,
        errorCode: success ? undefined : result.RESULT as string | undefined,
        raw: result,
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.logger.error('Payflow request timed out');
        throw new BadRequestException('Payment provider request timed out');
      }
      this.logger.error('Payflow request failed', error);
      throw error;
    }
  }

  /**
   * Process with PayPal Classic NVP API
   */
  private async processPayPalClassic(
    credentials: Record<string, string>,
    dto: TestCheckoutRequestDto,
    amountCents: number,
    currency: string,
    isSandbox: boolean,
  ) {
    const endpoint = isSandbox
      ? 'https://api-3t.sandbox.paypal.com/nvp'
      : 'https://api-3t.paypal.com/nvp';

    const amount = (amountCents / 100).toFixed(2);

    // Format expiry as MMYYYY for PayPal Classic
    const expiryDate = `${dto.card.expiryMonth}${dto.card.expiryYear}`;

    const params = new URLSearchParams({
      METHOD: 'DoDirectPayment',
      VERSION: '124.0',
      USER: credentials.apiUsername,
      PWD: credentials.apiPassword,
      SIGNATURE: credentials.apiSignature,
      PAYMENTACTION: 'Sale',
      IPADDRESS: '127.0.0.1',
      ACCT: dto.card.number,
      EXPDATE: expiryDate,
      CVV2: dto.card.cvv,
      AMT: amount,
      CURRENCYCODE: currency,
      CREDITCARDTYPE: this.detectCardBrand(dto.card.number),
    });

    if (dto.card.cardholderName) {
      const nameParts = dto.card.cardholderName.split(' ');
      params.set('FIRSTNAME', nameParts[0] || 'Test');
      params.set('LASTNAME', nameParts.slice(1).join(' ') || 'User');
    } else {
      params.set('FIRSTNAME', 'Test');
      params.set('LASTNAME', 'User');
    }

    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const responseText = await response.text();
      const result = this.parseNVPResponse(responseText) as Record<string, unknown>;

      const success = result.ACK === 'Success' || result.ACK === 'SuccessWithWarning';

      return this.createProviderResult({
        success,
        transactionId: result.TRANSACTIONID as string | undefined,
        avsResult: result.AVSCODE as string | undefined,
        cvvResult: result.CVV2MATCH as string | undefined,
        errorMessage: success ? undefined : result.L_LONGMESSAGE0 as string | undefined,
        errorCode: success ? undefined : result.L_ERRORCODE0 as string | undefined,
        raw: result,
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.logger.error('PayPal Classic request timed out');
        throw new BadRequestException('Payment provider request timed out');
      }
      this.logger.error('PayPal Classic request failed', error);
      throw error;
    }
  }

  /**
   * Detect card brand for PayPal Classic API
   */
  private detectCardBrand(cardNumber: string): string {
    const num = cardNumber.replace(/\D/g, '');
    if (num.startsWith('4')) return 'Visa';
    if (num.startsWith('5') || (num.startsWith('2') && num.length === 16)) return 'MasterCard';
    if (num.startsWith('34') || num.startsWith('37')) return 'Amex';
    if (num.startsWith('6011') || num.startsWith('65')) return 'Discover';
    return 'Visa';
  }

  /**
   * Process with NMI
   */
  private async processNMI(
    credentials: Record<string, string>,
    dto: TestCheckoutRequestDto,
    amountCents: number,
    currency: string,
    _isSandbox: boolean,
  ) {
    const endpoint = 'https://secure.networkmerchants.com/api/transact.php';
    const amount = (amountCents / 100).toFixed(2);

    const params = new URLSearchParams({
      security_key: credentials.securityKey,
      type: 'sale',
      ccnumber: dto.card.number,
      ccexp: `${dto.card.expiryMonth}${dto.card.expiryYear.slice(-2)}`,
      cvv: dto.card.cvv,
      amount,
      currency,
    });

    if (dto.card.cardholderName) {
      const nameParts = dto.card.cardholderName.split(' ');
      params.set('first_name', nameParts[0] || '');
      params.set('last_name', nameParts.slice(1).join(' ') || '');
    }

    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const responseText = await response.text();
      const result = this.parseNVPResponse(responseText) as Record<string, unknown>;

      const success = result.response === '1';

      return this.createProviderResult({
        success,
        transactionId: result.transactionid as string | undefined,
        avsResult: result.avsresponse as string | undefined,
        cvvResult: result.cvvresponse as string | undefined,
        errorMessage: success ? undefined : result.responsetext as string | undefined,
        errorCode: success ? undefined : result.response_code as string | undefined,
        raw: result,
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.logger.error('NMI request timed out');
        throw new BadRequestException('Payment provider request timed out');
      }
      this.logger.error('NMI request failed', error);
      throw error;
    }
  }

  /**
   * Process with Authorize.Net
   */
  private async processAuthorizeNet(
    credentials: Record<string, string>,
    dto: TestCheckoutRequestDto,
    amountCents: number,
    _currency: string,
    isSandbox: boolean,
  ) {
    const endpoint = isSandbox
      ? 'https://apitest.authorize.net/xml/v1/request.api'
      : 'https://api.authorize.net/xml/v1/request.api';

    const amount = (amountCents / 100).toFixed(2);

    const requestBody = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: credentials.apiLoginId,
          transactionKey: credentials.transactionKey,
        },
        transactionRequest: {
          transactionType: 'authCaptureTransaction',
          amount,
          payment: {
            creditCard: {
              cardNumber: dto.card.number,
              expirationDate: `${dto.card.expiryMonth}${dto.card.expiryYear.slice(-2)}`,
              cardCode: dto.card.cvv,
            },
          },
        },
      },
    };

    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json() as Record<string, unknown>;
      const txnResponse = result.transactionResponse as Record<string, unknown> | undefined;

      const success = txnResponse?.responseCode === '1';

      return this.createProviderResult({
        success,
        transactionId: txnResponse?.transId as string | undefined,
        avsResult: txnResponse?.avsResultCode as string | undefined,
        cvvResult: txnResponse?.cvvResultCode as string | undefined,
        errorMessage: success ? undefined : (txnResponse?.errors as Array<{ errorText: string }>)?.[0]?.errorText,
        errorCode: success ? undefined : (txnResponse?.errors as Array<{ errorCode: string }>)?.[0]?.errorCode,
        raw: result,
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.logger.error('Authorize.Net request timed out');
        throw new BadRequestException('Payment provider request timed out');
      }
      this.logger.error('Authorize.Net request failed', error);
      throw error;
    }
  }

  /**
   * Process with Stripe
   */
  private async processStripe(
    credentials: Record<string, string>,
    dto: TestCheckoutRequestDto,
    amountCents: number,
    currency: string,
    _isSandbox: boolean,
  ) {
    const stripeSecretKey = credentials.secretKey;

    try {
      // Create payment method
      const pmResponse = await fetchWithTimeout('https://api.stripe.com/v1/payment_methods', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          type: 'card',
          'card[number]': dto.card.number,
          'card[exp_month]': dto.card.expiryMonth,
          'card[exp_year]': dto.card.expiryYear,
          'card[cvc]': dto.card.cvv,
        }).toString(),
      });

      const paymentMethod = await pmResponse.json() as Record<string, unknown>;
      if (paymentMethod.error) {
        const err = paymentMethod.error as { message?: string; code?: string };
        return this.createProviderResult({
          success: false,
          errorMessage: err.message,
          errorCode: err.code,
          raw: paymentMethod,
        });
      }

      // Create payment intent with proper Stripe API format for nested params
      const piParams = new URLSearchParams();
      piParams.set('amount', amountCents.toString());
      piParams.set('currency', currency.toLowerCase());
      piParams.set('payment_method', paymentMethod.id as string);
      piParams.set('confirm', 'true');
      // Stripe nested params use bracket notation
      piParams.set('automatic_payment_methods[enabled]', 'true');
      piParams.set('automatic_payment_methods[allow_redirects]', 'never');

      const piResponse = await fetchWithTimeout('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: piParams.toString(),
      });

      const paymentIntent = await piResponse.json() as Record<string, unknown>;

      const success = paymentIntent.status === 'succeeded';

      // Navigate the nested Stripe response safely
      const charges = paymentIntent.charges as { data?: Array<Record<string, unknown>> } | undefined;
      const charge = charges?.data?.[0];
      const pmDetails = charge?.payment_method_details as Record<string, unknown> | undefined;
      const cardDetails = pmDetails?.card as Record<string, unknown> | undefined;
      const checks = cardDetails?.checks as Record<string, string> | undefined;

      const lastError = paymentIntent.last_payment_error as { message?: string; code?: string } | undefined;
      const apiError = paymentIntent.error as { message?: string; code?: string } | undefined;

      return this.createProviderResult({
        success,
        transactionId: paymentIntent.id as string | undefined,
        avsResult: checks?.address_postal_code_check,
        cvvResult: checks?.cvc_check,
        errorMessage: success ? undefined : apiError?.message || lastError?.message,
        errorCode: success ? undefined : apiError?.code || lastError?.code,
        raw: paymentIntent,
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.logger.error('Stripe request timed out');
        throw new BadRequestException('Payment provider request timed out');
      }
      this.logger.error('Stripe request failed', error);
      throw error;
    }
  }

  /**
   * Parse NVP response string into object
   */
  private parseNVPResponse(response: string): Record<string, string> {
    const result: Record<string, string> = {};
    const pairs = response.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        result[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    }
    return result;
  }

  /**
   * Get card brand from number
   */
  private getCardBrand(cardNumber: string): string {
    const num = cardNumber.replace(/\D/g, '');
    if (num.startsWith('4')) return 'Visa';
    if (num.startsWith('5') || num.startsWith('2')) return 'MasterCard';
    if (num.startsWith('3')) return 'Amex';
    if (num.startsWith('6')) return 'Discover';
    return 'Card';
  }

  /**
   * Get or create a test customer for test transactions
   */
  private async getOrCreateTestCustomer(companyId: string) {
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        companyId,
        email: 'test-checkout@example.com',
        deletedAt: null,
      },
    });

    if (existingCustomer) {
      return existingCustomer;
    }

    return this.prisma.customer.create({
      data: {
        companyId,
        email: 'test-checkout@example.com',
        firstName: 'Test',
        lastName: 'Checkout',
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Generate a unique transaction number
   */
  private async generateTransactionNumber(companyId: string): Promise<string> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { code: true },
    });

    const code = company?.code || 'TEST';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();

    return `TXN-${code}-${timestamp}-${random}`;
  }
}
