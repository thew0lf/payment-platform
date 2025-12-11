import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TestCheckoutService } from '../../src/merchant-accounts/services/test-checkout.service';
import { MerchantAccountService } from '../../src/merchant-accounts/services/merchant-account.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { OrderNumberService } from '../../src/orders/services/order-number.service';

describe('TestCheckoutService', () => {
  let service: TestCheckoutService;
  let prismaService: PrismaService;
  let merchantAccountService: MerchantAccountService;

  const mockMerchantAccount = {
    id: 'ma-123',
    companyId: 'company-1',
    name: 'Test Sandbox Account',
    providerType: 'PAYFLOW',
    merchantId: 'test-merchant',
    environment: 'sandbox',
    credentials: {
      partner: 'PayPal',
      vendor: 'test-vendor',
      user: 'test-user',
      password: 'test-pass',
    },
    limits: {
      minTransactionAmount: 50, // $0.50
      maxTransactionAmount: 100000, // $1000
    },
  };

  const mockCustomer = {
    id: 'cust-123',
    companyId: 'company-1',
    email: 'test-checkout@example.com',
    firstName: 'Test',
    lastName: 'Checkout',
    status: 'ACTIVE',
  };

  const mockCompany = {
    id: 'company-1',
    code: 'TEST',
  };

  const mockOrder = {
    id: 'order-123',
    orderNumber: 'TEST-A-000000001',
    status: 'PENDING',
  };

  const mockTransaction = {
    id: 'txn-123',
    transactionNumber: 'TXN-TEST-ABC123',
    status: 'COMPLETED',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      customer: {
        findFirst: jest.fn().mockResolvedValue(mockCustomer),
        create: jest.fn().mockResolvedValue(mockCustomer),
      },
      company: {
        findUnique: jest.fn().mockResolvedValue(mockCompany),
      },
      order: {
        create: jest.fn().mockResolvedValue(mockOrder),
        update: jest.fn().mockResolvedValue(mockOrder),
      },
      transaction: {
        create: jest.fn().mockResolvedValue(mockTransaction),
      },
    };

    const mockMerchantService = {
      findById: jest.fn().mockResolvedValue(mockMerchantAccount),
    };

    const mockOrderNumberService = {
      generate: jest.fn().mockResolvedValue('TEST-A-000000001'),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestCheckoutService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MerchantAccountService, useValue: mockMerchantService },
        { provide: OrderNumberService, useValue: mockOrderNumberService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<TestCheckoutService>(TestCheckoutService);
    prismaService = module.get<PrismaService>(PrismaService);
    merchantAccountService = module.get<MerchantAccountService>(MerchantAccountService);
  });

  describe('getTestCards', () => {
    it('should return test cards for PAYFLOW provider', async () => {
      const result = await service.getTestCards('ma-123');

      expect(result.merchantAccountId).toBe('ma-123');
      expect(result.providerType).toBe('PAYFLOW');
      expect(result.environment).toBe('sandbox');
      expect(result.testCards).toBeDefined();
      expect(result.testCards.length).toBeGreaterThan(0);
      expect(result.testCards[0]).toHaveProperty('number');
      expect(result.testCards[0]).toHaveProperty('brand');
    });

    it('should throw NotFoundException for non-existent merchant account', async () => {
      (merchantAccountService.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.getTestCards('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should return empty cards for unsupported provider', async () => {
      (merchantAccountService.findById as jest.Mock).mockResolvedValue({
        ...mockMerchantAccount,
        providerType: 'UNKNOWN_PROVIDER',
      });

      const result = await service.getTestCards('ma-123');

      expect(result.testCards).toEqual([]);
    });
  });

  describe('processTestCheckout', () => {
    const validRequest = {
      merchantAccountId: 'ma-123',
      amount: 1.00,
      currency: 'USD',
      card: {
        number: '4032036234479689',
        expiryMonth: '04',
        expiryYear: '2030',
        cvv: '288',
        cardholderName: 'Test User',
      },
      description: 'Test transaction',
      createOrder: true,
    };

    it('should throw NotFoundException for non-existent merchant account', async () => {
      (merchantAccountService.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.processTestCheckout(validRequest, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for amount below minimum', async () => {
      const lowAmountRequest = {
        ...validRequest,
        amount: 0.01, // Below minimum of $0.50
      };

      await expect(
        service.processTestCheckout(lowAmountRequest, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for amount above maximum', async () => {
      const highAmountRequest = {
        ...validRequest,
        amount: 2000, // Above maximum of $1000
      };

      await expect(
        service.processTestCheckout(highAmountRequest, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create customer if not exists', async () => {
      (prismaService.customer.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock the provider response (Payflow)
      global.fetch = jest.fn().mockResolvedValue({
        text: () => Promise.resolve('RESULT=0&PNREF=A1B2C3&RESPMSG=APPROVED&CVV2MATCH=Y&AVSADDR=Y&AVSZIP=Y'),
      });

      try {
        await service.processTestCheckout(validRequest, 'user-1');
      } catch {
        // Provider call might fail, but we're testing customer creation
      }

      expect(prismaService.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test-checkout@example.com',
            firstName: 'Test',
            lastName: 'Checkout',
          }),
        }),
      );
    });

    it('should create order when createOrder is true', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        text: () => Promise.resolve('RESULT=0&PNREF=A1B2C3&RESPMSG=APPROVED&CVV2MATCH=Y&AVSADDR=Y&AVSZIP=Y'),
      });

      try {
        await service.processTestCheckout(validRequest, 'user-1');
      } catch {
        // Provider call might fail
      }

      expect(prismaService.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            environment: 'sandbox',
          }),
        }),
      );
    });

    it('should not create order when createOrder is false', async () => {
      const noOrderRequest = { ...validRequest, createOrder: false };

      global.fetch = jest.fn().mockResolvedValue({
        text: () => Promise.resolve('RESULT=0&PNREF=A1B2C3&RESPMSG=APPROVED'),
      });

      try {
        await service.processTestCheckout(noOrderRequest, 'user-1');
      } catch {
        // Provider call might fail
      }

      expect(prismaService.order.create).not.toHaveBeenCalled();
    });

    it('should create transaction record', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        text: () => Promise.resolve('RESULT=0&PNREF=A1B2C3&RESPMSG=APPROVED&CVV2MATCH=Y'),
      });

      try {
        await service.processTestCheckout(validRequest, 'user-1');
      } catch {
        // Provider call might fail
      }

      expect(prismaService.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-1',
            type: 'CHARGE',
            amount: 1.00,
            currency: 'USD',
            environment: 'sandbox',
          }),
        }),
      );
    });

    it('should set environment to sandbox for sandbox accounts', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        text: () => Promise.resolve('RESULT=0&PNREF=A1B2C3&RESPMSG=APPROVED'),
      });

      try {
        await service.processTestCheckout(validRequest, 'user-1');
      } catch {
        // Provider call might fail
      }

      expect(prismaService.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            environment: 'sandbox',
          }),
        }),
      );
    });

    it('should set environment to production for production accounts', async () => {
      (merchantAccountService.findById as jest.Mock).mockResolvedValue({
        ...mockMerchantAccount,
        environment: 'production',
      });

      global.fetch = jest.fn().mockResolvedValue({
        text: () => Promise.resolve('RESULT=0&PNREF=A1B2C3&RESPMSG=APPROVED'),
      });

      try {
        await service.processTestCheckout(validRequest, 'user-1');
      } catch {
        // Provider call might fail
      }

      expect(prismaService.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            environment: 'production',
          }),
        }),
      );
    });
  });

  describe('card brand detection', () => {
    it('should detect Visa cards', async () => {
      const result = await service.getTestCards('ma-123');
      const visaCard = result.testCards.find(c => c.number.startsWith('4'));
      expect(visaCard?.brand).toBe('Visa');
    });

    it('should detect MasterCard cards', async () => {
      const result = await service.getTestCards('ma-123');
      const mcCard = result.testCards.find(c => c.number.startsWith('5'));
      expect(mcCard?.brand).toBe('MasterCard');
    });

    it('should detect Amex cards', async () => {
      const result = await service.getTestCards('ma-123');
      const amexCard = result.testCards.find(c => c.number.startsWith('3'));
      expect(amexCard?.brand).toBe('Amex');
    });
  });

  describe('provider-specific test cards', () => {
    it('should return PAYFLOW test cards', async () => {
      const result = await service.getTestCards('ma-123');
      expect(result.testCards.some(c => c.description.includes('PayPal'))).toBe(true);
    });

    it('should return NMI test cards', async () => {
      (merchantAccountService.findById as jest.Mock).mockResolvedValue({
        ...mockMerchantAccount,
        providerType: 'NMI',
      });

      const result = await service.getTestCards('ma-123');
      expect(result.testCards.some(c => c.description.includes('NMI'))).toBe(true);
    });

    it('should return Stripe test cards', async () => {
      (merchantAccountService.findById as jest.Mock).mockResolvedValue({
        ...mockMerchantAccount,
        providerType: 'STRIPE',
      });

      const result = await service.getTestCards('ma-123');
      expect(result.testCards.some(c => c.description.includes('Stripe'))).toBe(true);
    });

    it('should return Authorize.Net test cards', async () => {
      (merchantAccountService.findById as jest.Mock).mockResolvedValue({
        ...mockMerchantAccount,
        providerType: 'AUTHORIZE_NET',
      });

      const result = await service.getTestCards('ma-123');
      expect(result.testCards.some(c => c.description.includes('Authorize.Net'))).toBe(true);
    });
  });
});
