/**
 * Express Checkout Service Unit Tests
 *
 * Comprehensive tests for express checkout functionality including:
 * - Available provider retrieval
 * - Payment request creation
 * - Session lifecycle (create, process, complete, cancel)
 * - Error handling scenarios
 * - Multi-provider support (Apple Pay, Google Pay, PayPal, Shop Pay)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ExpressCheckoutService,
  ExpressCheckoutProvider,
  ExpressCheckoutSession,
} from './express-checkout.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderNumberService } from '../../orders/services/order-number.service';
import { CartStatus } from '@prisma/client';

describe('ExpressCheckoutService', () => {
  let service: ExpressCheckoutService;
  let prisma: any;

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockCompanyId = 'company-123';
  const mockCartId = 'cart-456';
  const mockCustomerId = 'customer-789';
  const mockProductId = 'product-001';
  const mockOrderId = 'order-001';

  const createMockProduct = (overrides: Partial<any> = {}) => ({
    id: mockProductId,
    name: 'Test Product',
    sku: 'TEST-001',
    description: 'A test product',
    ...overrides,
  });

  const createMockCartItem = (overrides: Partial<any> = {}) => ({
    id: 'item-001',
    cartId: mockCartId,
    productId: mockProductId,
    quantity: 2,
    unitPrice: 29.99,
    lineTotal: 59.98,
    product: createMockProduct(),
    productSnapshot: { name: 'Test Product' },
    ...overrides,
  });

  const createMockCompany = (overrides: Partial<any> = {}) => ({
    id: mockCompanyId,
    name: 'Test Company',
    ...overrides,
  });

  const createMockCart = (overrides: Partial<any> = {}) => ({
    id: mockCartId,
    companyId: mockCompanyId,
    customerId: mockCustomerId,
    status: CartStatus.ACTIVE,
    currency: 'USD',
    subtotal: 59.98,
    taxTotal: 5.0,
    shippingTotal: 10.0,
    discountTotal: 0,
    grandTotal: 74.98,
    items: [createMockCartItem()],
    company: createMockCompany(),
    ...overrides,
  });

  const createMockShippingAddress = () => ({
    name: 'John Doe',
    addressLine1: '123 Main St',
    addressLine2: 'Apt 4',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'US',
  });

  const createMockBillingAddress = () => ({
    name: 'John Doe',
    addressLine1: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'US',
  });

  const mockPrismaService = {
    cart: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
    },
    customer: {
      create: jest.fn(),
    },
  };

  const mockOrderNumberService = {
    generate: jest.fn().mockResolvedValue('TEST-COMP-A-000000001'),
    generateShipmentNumber: jest.fn().mockResolvedValue('TEST-COMP-S-A-000000001'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpressCheckoutService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OrderNumberService,
          useValue: mockOrderNumberService,
        },
      ],
    }).compile();

    service = module.get<ExpressCheckoutService>(ExpressCheckoutService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up sessions after each test
    (service as any).sessions.clear();
  });

  // ═══════════════════════════════════════════════════════════════
  // SERVICE INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET AVAILABLE PROVIDERS
  // ═══════════════════════════════════════════════════════════════

  describe('getAvailableProviders', () => {
    it('should return enabled providers for a company', async () => {
      const providers = await service.getAvailableProviders(mockCompanyId);

      expect(providers).toContain(ExpressCheckoutProvider.APPLE_PAY);
      expect(providers).toContain(ExpressCheckoutProvider.GOOGLE_PAY);
      expect(providers).toContain(ExpressCheckoutProvider.PAYPAL_EXPRESS);
    });

    it('should return array of ExpressCheckoutProvider enum values', async () => {
      const providers = await service.getAvailableProviders(mockCompanyId);

      providers.forEach((provider) => {
        expect(Object.values(ExpressCheckoutProvider)).toContain(provider);
      });
    });

    it('should return consistent providers for same company', async () => {
      const providers1 = await service.getAvailableProviders(mockCompanyId);
      const providers2 = await service.getAvailableProviders(mockCompanyId);

      expect(providers1).toEqual(providers2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CREATE PAYMENT REQUEST
  // ═══════════════════════════════════════════════════════════════

  describe('createPaymentRequest', () => {
    it('should create payment request data for Apple Pay', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart());

      const request = await service.createPaymentRequest(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
      );

      expect(request).toEqual({
        amount: 74.98,
        currency: 'USD',
        label: 'Test Company Order',
        lineItems: expect.arrayContaining([
          expect.objectContaining({ label: expect.stringContaining('Test Product') }),
        ]),
        requiresShipping: true,
      });
    });

    it('should create payment request data for Google Pay', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart());

      const request = await service.createPaymentRequest(
        mockCartId,
        ExpressCheckoutProvider.GOOGLE_PAY,
      );

      expect(request.amount).toBe(74.98);
      expect(request.currency).toBe('USD');
    });

    it('should throw NotFoundException when cart not found', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentRequest(mockCartId, ExpressCheckoutProvider.APPLE_PAY),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when cart is not active', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      await expect(
        service.createPaymentRequest(mockCartId, ExpressCheckoutProvider.APPLE_PAY),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when cart is empty', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart({ items: [] }));

      await expect(
        service.createPaymentRequest(mockCartId, ExpressCheckoutProvider.APPLE_PAY),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include tax in line items when present', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart({ taxTotal: 8.5 }));

      const request = await service.createPaymentRequest(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
      );

      const taxLineItem = request.lineItems.find((item) => item.label === 'Tax');
      expect(taxLineItem).toBeDefined();
      expect(taxLineItem?.amount).toBe(8.5);
    });

    it('should include shipping in line items when present', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart({ shippingTotal: 12.0 }));

      const request = await service.createPaymentRequest(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
      );

      const shippingLineItem = request.lineItems.find((item) => item.label === 'Shipping');
      expect(shippingLineItem).toBeDefined();
      expect(shippingLineItem?.amount).toBe(12.0);
    });

    it('should include discount as negative line item when present', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart({ discountTotal: 10.0 }));

      const request = await service.createPaymentRequest(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
      );

      const discountLineItem = request.lineItems.find((item) => item.label === 'Discount');
      expect(discountLineItem).toBeDefined();
      expect(discountLineItem?.amount).toBe(-10.0);
    });

    it('should handle cart without company name', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart({ company: null }));

      const request = await service.createPaymentRequest(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
      );

      expect(request.label).toBe('Store Order');
    });

    it('should handle cart items without product name', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(
        createMockCart({
          items: [createMockCartItem({ product: null })],
        }),
      );

      const request = await service.createPaymentRequest(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
      );

      expect(request.lineItems[0].label).toContain('Product');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZE SESSION
  // ═══════════════════════════════════════════════════════════════

  describe('initializeSession', () => {
    it('should initialize a session for Apple Pay', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());

      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );

      expect(session).toMatchObject({
        provider: ExpressCheckoutProvider.APPLE_PAY,
        cartId: mockCartId,
        status: 'PENDING',
        amount: 74.98,
        currency: 'USD',
      });
      expect(session.sessionId).toMatch(/^exp_/);
      expect(session.expiresAt).toBeInstanceOf(Date);
    });

    it('should initialize a session for Google Pay', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());

      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.GOOGLE_PAY,
        mockCompanyId,
      );

      expect(session.provider).toBe(ExpressCheckoutProvider.GOOGLE_PAY);
      expect(session.status).toBe('PENDING');
    });

    it('should initialize a session for PayPal Express', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());

      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.PAYPAL_EXPRESS,
        mockCompanyId,
      );

      expect(session.provider).toBe(ExpressCheckoutProvider.PAYPAL_EXPRESS);
    });

    it('should throw BadRequestException for disabled provider', async () => {
      await expect(
        service.initializeSession(mockCartId, ExpressCheckoutProvider.SHOP_PAY, mockCompanyId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when cart not found', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(null);

      await expect(
        service.initializeSession(mockCartId, ExpressCheckoutProvider.APPLE_PAY, mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set expiration 30 minutes in the future', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());
      const beforeInit = Date.now();

      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );

      const afterInit = Date.now();
      const expectedMinExpiry = beforeInit + 30 * 60 * 1000;
      const expectedMaxExpiry = afterInit + 30 * 60 * 1000;

      expect(session.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(session.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
    });

    it('should generate unique session IDs', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());

      const session1 = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );
      const session2 = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.GOOGLE_PAY,
        mockCompanyId,
      );

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PROCESS PAYMENT
  // ═══════════════════════════════════════════════════════════════

  describe('processPayment', () => {
    let sessionId: string;

    beforeEach(async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());
      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );
      sessionId = session.sessionId;
    });

    it('should process payment successfully', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart());
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      const result = await service.processPayment(
        sessionId,
        'payment-token-123',
        createMockShippingAddress(),
        createMockBillingAddress(),
      );

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(mockOrderId);
    });

    it('should return error for non-existent session', async () => {
      const result = await service.processPayment(
        'invalid-session',
        'payment-token-123',
        createMockShippingAddress(),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Your checkout session has expired. Please try again.');
    });

    it('should return error for already processed session', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart());
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      // Process once
      await service.processPayment(sessionId, 'token-1');

      // Try to process again
      const result = await service.processPayment(sessionId, 'token-2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('This order has already been completed.');
    });

    it('should return error for expired session', async () => {
      // Manually expire the session
      const session = (service as any).sessions.get(sessionId);
      session.expiresAt = new Date(Date.now() - 1000);

      const result = await service.processPayment(sessionId, 'payment-token-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Your checkout session has expired. Please try again.');
    });

    it('should return error when cart no longer available', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(null);

      const result = await service.processPayment(sessionId, 'payment-token-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Your cart has changed or is no longer available. Please try again.');
    });

    it('should return error when cart status is not active', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(
        createMockCart({ status: CartStatus.ABANDONED }),
      );

      const result = await service.processPayment(sessionId, 'payment-token-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Your cart has changed or is no longer available. Please try again.');
    });

    it('should update cart status to CONVERTED on success', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart());
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      await service.processPayment(sessionId, 'payment-token-123');

      expect(mockPrismaService.cart.update).toHaveBeenCalledWith({
        where: { id: mockCartId },
        data: {
          status: CartStatus.CONVERTED,
          convertedAt: expect.any(Date),
        },
      });
    });

    it('should create order with correct data', async () => {
      const cart = createMockCart();
      mockPrismaService.cart.findUnique.mockResolvedValue(cart);
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      const shippingAddress = createMockShippingAddress();
      const billingAddress = createMockBillingAddress();

      await service.processPayment(sessionId, 'payment-token-123', shippingAddress, billingAddress);

      expect(mockPrismaService.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCompanyId,
          customerId: mockCustomerId,
          status: 'PENDING',
          paymentStatus: 'PAID',
          currency: 'USD',
          paymentMethod: ExpressCheckoutProvider.APPLE_PAY,
          shippingSnapshot: shippingAddress,
          billingSnapshot: billingAddress,
        }),
      });
    });

    it('should handle order creation failure gracefully', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart());
      mockPrismaService.order.create.mockRejectedValue(new Error('Database error'));

      const result = await service.processPayment(sessionId, 'payment-token-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe("Something went wrong during checkout. Don't worry—your card wasn't charged. Please try again.");
    });

    it('should set session status to FAILED on error', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart());
      mockPrismaService.order.create.mockRejectedValue(new Error('Database error'));

      await service.processPayment(sessionId, 'payment-token-123');

      const session = await service.getSessionStatus(sessionId);
      expect(session?.status).toBe('FAILED');
    });

    it('should process payment without addresses', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart());
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      const result = await service.processPayment(sessionId, 'payment-token-123');

      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET SESSION STATUS
  // ═══════════════════════════════════════════════════════════════

  describe('getSessionStatus', () => {
    it('should return session status for valid session', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());

      const createdSession = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );

      const status = await service.getSessionStatus(createdSession.sessionId);

      expect(status).toMatchObject({
        sessionId: createdSession.sessionId,
        provider: ExpressCheckoutProvider.APPLE_PAY,
        status: 'PENDING',
      });
    });

    it('should return null for non-existent session', async () => {
      const status = await service.getSessionStatus('invalid-session-id');

      expect(status).toBeNull();
    });

    it('should update status to EXPIRED for expired pending session', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());

      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );

      // Manually expire the session
      const internalSession = (service as any).sessions.get(session.sessionId);
      internalSession.expiresAt = new Date(Date.now() - 1000);

      const status = await service.getSessionStatus(session.sessionId);

      expect(status?.status).toBe('EXPIRED');
    });

    it('should not change status of non-pending session to expired', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart());
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );

      // Process the payment to change status to COMPLETED
      await service.processPayment(session.sessionId, 'token');

      // Manually set expiry to past
      const internalSession = (service as any).sessions.get(session.sessionId);
      internalSession.expiresAt = new Date(Date.now() - 1000);

      const status = await service.getSessionStatus(session.sessionId);

      expect(status?.status).toBe('COMPLETED');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CANCEL SESSION
  // ═══════════════════════════════════════════════════════════════

  describe('cancelSession', () => {
    it('should cancel a pending session', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());

      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );

      const result = await service.cancelSession(session.sessionId);

      expect(result).toBe(true);

      const status = await service.getSessionStatus(session.sessionId);
      expect(status).toBeNull();
    });

    it('should return false for non-existent session', async () => {
      const result = await service.cancelSession('invalid-session-id');

      expect(result).toBe(false);
    });

    it('should return false for non-pending session', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart());
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );

      // Process the payment
      await service.processPayment(session.sessionId, 'token');

      // Try to cancel
      const result = await service.cancelSession(session.sessionId);

      expect(result).toBe(false);
    });

    it('should not affect other sessions when cancelling one', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());

      const session1 = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );
      const session2 = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.GOOGLE_PAY,
        mockCompanyId,
      );

      await service.cancelSession(session1.sessionId);

      const status1 = await service.getSessionStatus(session1.sessionId);
      const status2 = await service.getSessionStatus(session2.sessionId);

      expect(status1).toBeNull();
      expect(status2).not.toBeNull();
      expect(status2?.status).toBe('PENDING');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET MERCHANT CONFIG
  // ═══════════════════════════════════════════════════════════════

  describe('getMerchantConfig', () => {
    it('should return Apple Pay config', async () => {
      const config = await service.getMerchantConfig(
        mockCompanyId,
        ExpressCheckoutProvider.APPLE_PAY,
      );

      expect(config).toMatchObject({
        merchantId: 'merchant.com.example',
        countryCode: 'US',
        supportedNetworks: expect.arrayContaining(['visa', 'mastercard', 'amex', 'discover']),
      });
    });

    it('should return Google Pay config', async () => {
      const config = await service.getMerchantConfig(
        mockCompanyId,
        ExpressCheckoutProvider.GOOGLE_PAY,
      );

      expect(config).toMatchObject({
        merchantId: 'example-merchant',
        environment: 'TEST',
        allowedPaymentMethods: expect.arrayContaining(['CARD', 'TOKENIZED_CARD']),
      });
    });

    it('should return PayPal Express config', async () => {
      const config = await service.getMerchantConfig(
        mockCompanyId,
        ExpressCheckoutProvider.PAYPAL_EXPRESS,
      );

      expect(config).toMatchObject({
        clientId: 'test-client-id',
        currency: 'USD',
      });
    });

    it('should return empty object for Shop Pay', async () => {
      const config = await service.getMerchantConfig(
        mockCompanyId,
        ExpressCheckoutProvider.SHOP_PAY,
      );

      expect(config).toEqual({});
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SESSION LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  describe('Session Lifecycle', () => {
    it('should complete full session lifecycle: create -> process -> complete', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart());
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      // 1. Initialize session
      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );
      expect(session.status).toBe('PENDING');

      // 2. Check status before processing
      let status = await service.getSessionStatus(session.sessionId);
      expect(status?.status).toBe('PENDING');

      // 3. Process payment
      const result = await service.processPayment(session.sessionId, 'payment-token');
      expect(result.success).toBe(true);

      // 4. Check status after processing
      status = await service.getSessionStatus(session.sessionId);
      expect(status?.status).toBe('COMPLETED');
    });

    it('should handle session lifecycle: create -> expire', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());

      // 1. Initialize session
      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.GOOGLE_PAY,
        mockCompanyId,
      );
      expect(session.status).toBe('PENDING');

      // 2. Manually expire it
      const internalSession = (service as any).sessions.get(session.sessionId);
      internalSession.expiresAt = new Date(Date.now() - 1000);

      // 3. Try to process
      const result = await service.processPayment(session.sessionId, 'token');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Your checkout session has expired. Please try again.');

      // 4. Check status
      const status = await service.getSessionStatus(session.sessionId);
      expect(status?.status).toBe('EXPIRED');
    });

    it('should handle session lifecycle: create -> cancel', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());

      // 1. Initialize session
      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.PAYPAL_EXPRESS,
        mockCompanyId,
      );
      expect(session.status).toBe('PENDING');

      // 2. Cancel session
      const cancelled = await service.cancelSession(session.sessionId);
      expect(cancelled).toBe(true);

      // 3. Session should be removed
      const status = await service.getSessionStatus(session.sessionId);
      expect(status).toBeNull();
    });

    it('should handle session lifecycle: create -> fail', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart());
      mockPrismaService.order.create.mockRejectedValue(new Error('Payment failed'));

      // 1. Initialize session
      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );

      // 2. Attempt to process (will fail)
      const result = await service.processPayment(session.sessionId, 'token');
      expect(result.success).toBe(false);

      // 3. Check status is FAILED
      const status = await service.getSessionStatus(session.sessionId);
      expect(status?.status).toBe('FAILED');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // MULTI-PROVIDER SCENARIOS
  // ═══════════════════════════════════════════════════════════════

  describe('Multi-Provider Scenarios', () => {
    it('should handle concurrent sessions for different providers', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());

      const appleSession = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );
      const googleSession = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.GOOGLE_PAY,
        mockCompanyId,
      );
      const paypalSession = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.PAYPAL_EXPRESS,
        mockCompanyId,
      );

      expect(appleSession.provider).toBe(ExpressCheckoutProvider.APPLE_PAY);
      expect(googleSession.provider).toBe(ExpressCheckoutProvider.GOOGLE_PAY);
      expect(paypalSession.provider).toBe(ExpressCheckoutProvider.PAYPAL_EXPRESS);

      // All should be pending
      expect((await service.getSessionStatus(appleSession.sessionId))?.status).toBe('PENDING');
      expect((await service.getSessionStatus(googleSession.sessionId))?.status).toBe('PENDING');
      expect((await service.getSessionStatus(paypalSession.sessionId))?.status).toBe('PENDING');
    });

    it('should process payment for correct provider', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart());
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      const googleSession = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.GOOGLE_PAY,
        mockCompanyId,
      );

      await service.processPayment(googleSession.sessionId, 'google-token');

      expect(mockPrismaService.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          paymentMethod: ExpressCheckoutProvider.GOOGLE_PAY,
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GUEST CHECKOUT
  // ═══════════════════════════════════════════════════════════════

  describe('Guest Checkout', () => {
    let sessionId: string;
    const mockGuestCustomerId = 'guest-customer-001';

    beforeEach(async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart());
      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );
      sessionId = session.sessionId;
    });

    it('should create guest customer when cart has no customerId', async () => {
      // Cart without customerId
      mockPrismaService.cart.findUnique.mockResolvedValue(
        createMockCart({ customerId: null }),
      );
      mockPrismaService.customer.create.mockResolvedValue({ id: mockGuestCustomerId });
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      const result = await service.processPayment(
        sessionId,
        'payment-token-123',
        createMockShippingAddress(),
        createMockBillingAddress(),
        'guest@example.com', // payerEmail
      );

      expect(result.success).toBe(true);
      expect(mockPrismaService.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCompanyId,
          email: 'guest@example.com',
          firstName: 'John',
          lastName: 'Doe',
          metadata: expect.objectContaining({
            source: 'express_checkout',
            provider: ExpressCheckoutProvider.APPLE_PAY,
            isGuest: true,
          }),
        }),
      });
    });

    it('should return error when guest checkout has no email', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(
        createMockCart({ customerId: null }),
      );

      const result = await service.processPayment(
        sessionId,
        'payment-token-123',
        createMockShippingAddress(),
        createMockBillingAddress(),
        // No payerEmail
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Please provide your email address to complete checkout.');
    });

    it('should update cart with guest customer ID', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(
        createMockCart({ customerId: null }),
      );
      mockPrismaService.customer.create.mockResolvedValue({ id: mockGuestCustomerId });
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      await service.processPayment(
        sessionId,
        'payment-token-123',
        createMockShippingAddress(),
        createMockBillingAddress(),
        'guest@example.com',
      );

      // First update: set customerId on cart
      // Second update: set status to CONVERTED
      expect(mockPrismaService.cart.update).toHaveBeenCalledWith({
        where: { id: mockCartId },
        data: { customerId: mockGuestCustomerId },
      });
    });

    it('should parse single name correctly', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(
        createMockCart({ customerId: null }),
      );
      mockPrismaService.customer.create.mockResolvedValue({ id: mockGuestCustomerId });
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      await service.processPayment(
        sessionId,
        'payment-token-123',
        createMockShippingAddress(),
        { ...createMockBillingAddress(), name: 'Madonna' }, // Single name
        'guest@example.com',
      );

      expect(mockPrismaService.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'Madonna',
          lastName: undefined,
        }),
      });
    });

    it('should parse multi-part name correctly', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(
        createMockCart({ customerId: null }),
      );
      mockPrismaService.customer.create.mockResolvedValue({ id: mockGuestCustomerId });
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      await service.processPayment(
        sessionId,
        'payment-token-123',
        createMockShippingAddress(),
        { ...createMockBillingAddress(), name: 'Mary Jane Watson' },
        'guest@example.com',
      );

      expect(mockPrismaService.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'Mary',
          lastName: 'Jane Watson',
        }),
      });
    });

    it('should use "Guest" for empty billing name', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(
        createMockCart({ customerId: null }),
      );
      mockPrismaService.customer.create.mockResolvedValue({ id: mockGuestCustomerId });
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      await service.processPayment(
        sessionId,
        'payment-token-123',
        createMockShippingAddress(),
        { ...createMockBillingAddress(), name: '' },
        'guest@example.com',
      );

      expect(mockPrismaService.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: 'Guest',
        }),
      });
    });

    it('should skip customer creation when cart has customerId', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(createMockCart()); // Has customerId
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      await service.processPayment(
        sessionId,
        'payment-token-123',
        createMockShippingAddress(),
        createMockBillingAddress(),
        'guest@example.com', // Email provided but should be ignored
      );

      expect(mockPrismaService.customer.create).not.toHaveBeenCalled();
    });

    it('should use guest customer ID in order creation', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(
        createMockCart({ customerId: null }),
      );
      mockPrismaService.customer.create.mockResolvedValue({ id: mockGuestCustomerId });
      mockPrismaService.order.create.mockResolvedValue({ id: mockOrderId });
      mockPrismaService.cart.update.mockResolvedValue(
        createMockCart({ status: CartStatus.CONVERTED }),
      );

      await service.processPayment(
        sessionId,
        'payment-token-123',
        createMockShippingAddress(),
        createMockBillingAddress(),
        'guest@example.com',
      );

      expect(mockPrismaService.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: mockGuestCustomerId,
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle cart with zero totals', async () => {
      mockPrismaService.cart.findUnique.mockResolvedValue(
        createMockCart({
          subtotal: 0,
          taxTotal: 0,
          shippingTotal: 0,
          discountTotal: 0,
          grandTotal: 0,
        }),
      );

      const request = await service.createPaymentRequest(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
      );

      expect(request.amount).toBe(0);
    });

    it('should handle cart with null currency', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(createMockCart({ currency: null }));

      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );

      expect(session.currency).toBe('USD');
    });

    it('should handle multiple items in cart', async () => {
      const multiItemCart = createMockCart({
        items: [
          createMockCartItem({ id: 'item-1', productId: 'prod-1', lineTotal: 29.99 }),
          createMockCartItem({
            id: 'item-2',
            productId: 'prod-2',
            lineTotal: 49.99,
            product: createMockProduct({ id: 'prod-2', name: 'Second Product' }),
          }),
          createMockCartItem({
            id: 'item-3',
            productId: 'prod-3',
            lineTotal: 19.99,
            product: createMockProduct({ id: 'prod-3', name: 'Third Product' }),
          }),
        ],
      });
      mockPrismaService.cart.findUnique.mockResolvedValue(multiItemCart);

      const request = await service.createPaymentRequest(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
      );

      expect(request.lineItems.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle cart with null grandTotal but valid subtotal', async () => {
      mockPrismaService.cart.findFirst.mockResolvedValue(
        createMockCart({
          grandTotal: null,
          subtotal: 100.0,
        }),
      );

      const session = await service.initializeSession(
        mockCartId,
        ExpressCheckoutProvider.APPLE_PAY,
        mockCompanyId,
      );

      expect(session.amount).toBe(100.0);
    });
  });
});
