import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CardDto,
  BillingAddressDto,
  CreateTransactionDto,
  CaptureDto,
  RefundDto,
  TokenizeCardDto,
} from '../../src/payments/dto/payment.dto';

describe('Payment DTOs', () => {
  // ═══════════════════════════════════════════════════════════════
  // CardDto Tests
  // ═══════════════════════════════════════════════════════════════

  describe('CardDto', () => {
    const validCard = {
      number: '4111111111111111',
      expiryMonth: '12',
      expiryYear: '25',
      cvv: '123',
    };

    it('should pass validation with valid card data', async () => {
      const card = plainToInstance(CardDto, validCard);
      const errors = await validate(card);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with card number containing letters', async () => {
      const card = plainToInstance(CardDto, {
        ...validCard,
        number: '4111111111111abc',
      });
      const errors = await validate(card);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('number');
    });

    it('should fail validation with card number too short', async () => {
      const card = plainToInstance(CardDto, {
        ...validCard,
        number: '411111111',
      });
      const errors = await validate(card);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with card number too long', async () => {
      const card = plainToInstance(CardDto, {
        ...validCard,
        number: '41111111111111111111',
      });
      const errors = await validate(card);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with invalid expiry month (13)', async () => {
      const card = plainToInstance(CardDto, {
        ...validCard,
        expiryMonth: '13',
      });
      const errors = await validate(card);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('expiryMonth');
    });

    it('should fail validation with invalid expiry month (00)', async () => {
      const card = plainToInstance(CardDto, {
        ...validCard,
        expiryMonth: '00',
      });
      const errors = await validate(card);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass validation with single-digit expiry month', async () => {
      const card = plainToInstance(CardDto, {
        ...validCard,
        expiryMonth: '1',
      });
      const errors = await validate(card);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with CVV too short', async () => {
      const card = plainToInstance(CardDto, {
        ...validCard,
        cvv: '12',
      });
      const errors = await validate(card);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('cvv');
    });

    it('should fail validation with CVV too long', async () => {
      const card = plainToInstance(CardDto, {
        ...validCard,
        cvv: '12345',
      });
      const errors = await validate(card);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass validation with 4-digit CVV (AMEX)', async () => {
      const card = plainToInstance(CardDto, {
        ...validCard,
        cvv: '1234',
      });
      const errors = await validate(card);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with CVV containing letters', async () => {
      const card = plainToInstance(CardDto, {
        ...validCard,
        cvv: '12a',
      });
      const errors = await validate(card);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass with optional cardholder name', async () => {
      const card = plainToInstance(CardDto, {
        ...validCard,
        cardholderName: 'John Doe',
      });
      const errors = await validate(card);
      expect(errors.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // BillingAddressDto Tests
  // ═══════════════════════════════════════════════════════════════

  describe('BillingAddressDto', () => {
    const validAddress = {
      firstName: 'John',
      lastName: 'Doe',
      street1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'US',
    };

    it('should pass validation with valid address data', async () => {
      const address = plainToInstance(BillingAddressDto, validAddress);
      const errors = await validate(address);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with country code too long', async () => {
      const address = plainToInstance(BillingAddressDto, {
        ...validAddress,
        country: 'USA',
      });
      const errors = await validate(address);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with country code too short', async () => {
      const address = plainToInstance(BillingAddressDto, {
        ...validAddress,
        country: 'U',
      });
      const errors = await validate(address);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with invalid email', async () => {
      const address = plainToInstance(BillingAddressDto, {
        ...validAddress,
        email: 'invalid-email',
      });
      const errors = await validate(address);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should pass with valid email', async () => {
      const address = plainToInstance(BillingAddressDto, {
        ...validAddress,
        email: 'john@example.com',
      });
      const errors = await validate(address);
      expect(errors.length).toBe(0);
    });

    it('should pass with optional fields', async () => {
      const address = plainToInstance(BillingAddressDto, {
        ...validAddress,
        company: 'Acme Inc',
        street2: 'Suite 100',
        phone: '415-555-1234',
      });
      const errors = await validate(address);
      expect(errors.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CreateTransactionDto Tests
  // ═══════════════════════════════════════════════════════════════

  describe('CreateTransactionDto', () => {
    it('should pass validation with minimum required fields', async () => {
      const dto = plainToInstance(CreateTransactionDto, {
        amount: 10.00,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with amount of 0', async () => {
      const dto = plainToInstance(CreateTransactionDto, {
        amount: 0,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('amount');
    });

    it('should fail validation with negative amount', async () => {
      const dto = plainToInstance(CreateTransactionDto, {
        amount: -10,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with amount exceeding maximum', async () => {
      const dto = plainToInstance(CreateTransactionDto, {
        amount: 1000000.00,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass validation with maximum allowed amount', async () => {
      const dto = plainToInstance(CreateTransactionDto, {
        amount: 999999.99,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with invalid currency format', async () => {
      const dto = plainToInstance(CreateTransactionDto, {
        amount: 10.00,
        currency: 'US',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('currency');
    });

    it('should pass validation with valid currency', async () => {
      const dto = plainToInstance(CreateTransactionDto, {
        amount: 10.00,
        currency: 'USD',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation with lowercase currency', async () => {
      const dto = plainToInstance(CreateTransactionDto, {
        amount: 10.00,
        currency: 'usd',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with invalid IP address', async () => {
      const dto = plainToInstance(CreateTransactionDto, {
        amount: 10.00,
        ipAddress: 'invalid-ip',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('ipAddress');
    });

    it('should pass validation with valid IPv4 address', async () => {
      const dto = plainToInstance(CreateTransactionDto, {
        amount: 10.00,
        ipAddress: '192.168.1.1',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with valid IPv6 address', async () => {
      const dto = plainToInstance(CreateTransactionDto, {
        amount: 10.00,
        ipAddress: '::1',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate nested card dto', async () => {
      const dto = plainToInstance(CreateTransactionDto, {
        amount: 10.00,
        card: {
          number: 'invalid',
          expiryMonth: '12',
          expiryYear: '25',
          cvv: '123',
        },
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      // Nested validation errors
      expect(errors.some(e => e.property === 'card')).toBe(true);
    });

    it('should pass with full valid transaction data', async () => {
      const dto = plainToInstance(CreateTransactionDto, {
        amount: 99.99,
        currency: 'USD',
        card: {
          number: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
        },
        orderId: 'order-123',
        customerId: 'customer-456',
        description: 'Test transaction',
        ipAddress: '192.168.1.1',
        allowFallback: true,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CaptureDto Tests
  // ═══════════════════════════════════════════════════════════════

  describe('CaptureDto', () => {
    it('should pass with no amount (full capture)', async () => {
      const dto = plainToInstance(CaptureDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with valid partial capture amount', async () => {
      const dto = plainToInstance(CaptureDto, { amount: 50.00 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with zero amount', async () => {
      const dto = plainToInstance(CaptureDto, { amount: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with negative amount', async () => {
      const dto = plainToInstance(CaptureDto, { amount: -10 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RefundDto Tests
  // ═══════════════════════════════════════════════════════════════

  describe('RefundDto', () => {
    it('should pass with no amount (full refund)', async () => {
      const dto = plainToInstance(RefundDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with valid partial refund amount', async () => {
      const dto = plainToInstance(RefundDto, { amount: 25.00 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with refund reason', async () => {
      const dto = plainToInstance(RefundDto, {
        amount: 25.00,
        reason: 'Customer requested refund',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with zero amount', async () => {
      const dto = plainToInstance(RefundDto, { amount: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with amount exceeding maximum', async () => {
      const dto = plainToInstance(RefundDto, { amount: 1000000 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TokenizeCardDto Tests
  // ═══════════════════════════════════════════════════════════════

  describe('TokenizeCardDto', () => {
    it('should pass with valid card data', async () => {
      const dto = plainToInstance(TokenizeCardDto, {
        card: {
          number: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '25',
          cvv: '123',
        },
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with invalid card data', async () => {
      const dto = plainToInstance(TokenizeCardDto, {
        card: {
          number: 'invalid',
          expiryMonth: '12',
          expiryYear: '25',
          cvv: '123',
        },
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass with optional providerId', async () => {
      const dto = plainToInstance(TokenizeCardDto, {
        card: {
          number: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '25',
          cvv: '123',
        },
        providerId: 'stripe-provider-1',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
