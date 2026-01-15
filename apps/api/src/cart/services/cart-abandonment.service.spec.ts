import { Test, TestingModule } from '@nestjs/testing';
import { CartAbandonmentService, AbandonmentConfig, AbandonedCartStats } from './cart-abandonment.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/services/email.service';
import { CartStatus } from '@prisma/client';
import * as crypto from 'crypto';

// Helper to generate valid HMAC-signed tokens matching the service implementation
// Uses the same fallback as the service for dev/test environments
const RECOVERY_TOKEN_SECRET = process.env.CART_RECOVERY_SECRET || 'dev-only-recovery-secret-not-for-production';
const RECOVERY_TOKEN_EXPIRY_DAYS = 7;

function generateTestRecoveryToken(cartId: string, expireInMs?: number): string {
  const expiresAt = Date.now() + (expireInMs ?? RECOVERY_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const payload = `${cartId}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', RECOVERY_TOKEN_SECRET)
    .update(payload)
    .digest('hex')
    .substring(0, 16);
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

function generateExpiredToken(cartId: string): string {
  const expiresAt = Date.now() - 1000; // Already expired
  const payload = `${cartId}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', RECOVERY_TOKEN_SECRET)
    .update(payload)
    .digest('hex')
    .substring(0, 16);
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

describe('CartAbandonmentService', () => {
  let service: CartAbandonmentService;
  let prisma: any;
  let emailService: any;

  const mockCompanyId = 'company-123';
  const mockCartId = 'cart-123';

  const mockCart = {
    id: mockCartId,
    companyId: mockCompanyId,
    sessionToken: 'session-abc',
    status: CartStatus.ACTIVE,
    currency: 'USD',
    customerId: 'customer-1',
    abandonedAt: null,
    recoveryEmailSent: false,
    recoveryEmailSentAt: null,
    recoveryClicks: 0,
    updatedAt: new Date(Date.now() - 120 * 60 * 1000), // 2 hours ago
    items: [
      { id: 'item-1', productId: 'prod-1', quantity: 2, unitPrice: 25.00 },
    ],
    customer: { email: 'test@example.com', firstName: 'John' },
  };

  const mockAbandonedCart = {
    ...mockCart,
    status: CartStatus.ABANDONED,
    abandonedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      company: {
        findMany: jest.fn(),
      },
      cart: {
        updateMany: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockEmailService = {
      sendTemplatedEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartAbandonmentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<CartAbandonmentService>(CartAbandonmentService);
    prisma = module.get(PrismaService);
    emailService = module.get(EmailService);
  });

  describe('detectAbandonedCarts', () => {
    it('should detect abandoned carts for all companies', async () => {
      prisma.company.findMany.mockResolvedValue([
        { id: 'company-1' },
        { id: 'company-2' },
      ]);
      prisma.cart.updateMany.mockResolvedValue({ count: 0 });

      await service.detectAbandonedCarts();

      expect(prisma.company.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        select: { id: true },
      });
    });

    it('should handle errors gracefully', async () => {
      prisma.company.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.detectAbandonedCarts()).resolves.not.toThrow();
    });
  });

  describe('detectAbandonedCartsForCompany', () => {
    it('should mark inactive carts as abandoned', async () => {
      prisma.cart.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.detectAbandonedCartsForCompany(mockCompanyId);

      expect(result).toBe(5);
      expect(prisma.cart.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          companyId: mockCompanyId,
          status: CartStatus.ACTIVE,
        }),
        data: expect.objectContaining({
          status: CartStatus.ABANDONED,
        }),
      });
    });

    it('should return 0 when no carts need abandonment', async () => {
      prisma.cart.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.detectAbandonedCartsForCompany(mockCompanyId);

      expect(result).toBe(0);
    });
  });

  describe('getAtRiskCarts', () => {
    it('should return carts that are at risk of abandonment', async () => {
      prisma.cart.findMany.mockResolvedValue([mockCart]);

      const result = await service.getAtRiskCarts(mockCompanyId);

      expect(result).toHaveLength(1);
      expect(result[0].sessionToken).toBe('session-abc');
      expect(result[0].email).toBe('test@example.com');
    });

    it('should return empty array when no at-risk carts', async () => {
      prisma.cart.findMany.mockResolvedValue([]);

      const result = await service.getAtRiskCarts(mockCompanyId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getAbandonedCarts', () => {
    it('should return abandoned carts with default options', async () => {
      prisma.cart.findMany.mockResolvedValue([mockAbandonedCart]);

      const result = await service.getAbandonedCarts(mockCompanyId);

      expect(result).toHaveLength(1);
      expect(prisma.cart.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: mockCompanyId,
            status: CartStatus.ABANDONED,
          }),
          take: 50,
          skip: 0,
        }),
      );
    });

    it('should filter by email when hasEmail is true', async () => {
      prisma.cart.findMany.mockResolvedValue([mockAbandonedCart]);

      await service.getAbandonedCarts(mockCompanyId, { hasEmail: true });

      expect(prisma.cart.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: { not: null },
            customer: { is: { email: { not: null } } },
          }),
        }),
      );
    });

    it('should filter by recovery email status', async () => {
      prisma.cart.findMany.mockResolvedValue([]);

      await service.getAbandonedCarts(mockCompanyId, { maxRecoveryEmailsSent: 0 });

      expect(prisma.cart.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recoveryEmailSent: false,
          }),
        }),
      );
    });

    it('should apply pagination options', async () => {
      prisma.cart.findMany.mockResolvedValue([]);

      await service.getAbandonedCarts(mockCompanyId, { limit: 10, offset: 20 });

      expect(prisma.cart.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });
  });

  describe('getAbandonmentStats', () => {
    it('should return accurate abandonment statistics', async () => {
      prisma.cart.count.mockResolvedValueOnce(100); // totalAbandoned
      prisma.cart.count.mockResolvedValueOnce(15); // totalRecovered
      prisma.cart.count.mockResolvedValueOnce(50); // pendingRecoveryEmails
      prisma.cart.findMany.mockResolvedValueOnce([
        { items: [{ unitPrice: 50, quantity: 2 }] },
        { items: [{ unitPrice: 30, quantity: 1 }] },
      ]); // lostCarts
      prisma.cart.findMany.mockResolvedValueOnce([
        { items: [{ unitPrice: 50, quantity: 1 }] },
      ]); // recoveredCarts

      const result = await service.getAbandonmentStats(mockCompanyId);

      expect(result.totalAbandoned).toBe(100);
      expect(result.totalRecovered).toBe(15);
      expect(result.recoveryRate).toBe(15); // 15/100 * 100
      expect(result.totalRevenueLost).toBe(130); // (50*2) + (30*1)
      expect(result.totalRevenueRecovered).toBe(50); // 50*1
      expect(result.pendingRecoveryEmails).toBe(50);
    });

    it('should handle date range filter', async () => {
      const dateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      prisma.cart.count.mockResolvedValue(0);
      prisma.cart.findMany.mockResolvedValue([]);

      await service.getAbandonmentStats(mockCompanyId, dateRange);

      expect(prisma.cart.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            abandonedAt: { gte: dateRange.start, lte: dateRange.end },
          }),
        }),
      );
    });

    it('should return 0 recovery rate when no abandoned carts', async () => {
      prisma.cart.count.mockResolvedValue(0);
      prisma.cart.findMany.mockResolvedValue([]);

      const result = await service.getAbandonmentStats(mockCompanyId);

      expect(result.recoveryRate).toBe(0);
    });
  });

  describe('scheduleRecoveryEmail', () => {
    it('should not schedule if cart not found', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      await service.scheduleRecoveryEmail(mockCartId);

      expect(prisma.cart.update).not.toHaveBeenCalled();
    });

    it('should not schedule if no customer email', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        ...mockCart,
        customer: null,
      });

      await service.scheduleRecoveryEmail(mockCartId);

      expect(prisma.cart.update).not.toHaveBeenCalled();
    });

    it('should not schedule if already sent', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        ...mockCart,
        recoveryEmailSent: true,
      });

      await service.scheduleRecoveryEmail(mockCartId);

      expect(prisma.cart.update).not.toHaveBeenCalled();
    });

    it('should log eligible cart for recovery', async () => {
      prisma.cart.findUnique.mockResolvedValue(mockCart);

      await service.scheduleRecoveryEmail(mockCartId);

      // The service logs but doesn't update - that's done by sendPendingRecoveryEmails
      expect(prisma.cart.findUnique).toHaveBeenCalledWith({
        where: { id: mockCartId },
        include: { customer: { select: { email: true } } },
      });
    });
  });

  describe('sendPendingRecoveryEmails', () => {
    it('should find carts needing recovery emails', async () => {
      prisma.cart.findMany.mockResolvedValue([
        {
          ...mockAbandonedCart,
          company: { id: mockCompanyId, name: 'Test Co' },
        },
      ]);
      prisma.cart.update.mockResolvedValue({});

      await service.sendPendingRecoveryEmails();

      expect(prisma.cart.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CartStatus.ABANDONED,
            recoveryEmailSent: false,
          }),
        }),
      );
    });

    it('should update cart after sending email', async () => {
      prisma.cart.findMany.mockResolvedValue([
        {
          ...mockAbandonedCart,
          company: { id: mockCompanyId, name: 'Test Co' },
        },
      ]);
      prisma.cart.update.mockResolvedValue({});

      await service.sendPendingRecoveryEmails();

      expect(emailService.sendTemplatedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          templateCode: 'cart-recovery',
          companyId: mockCompanyId,
        }),
      );
      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: mockCartId },
        data: expect.objectContaining({
          recoveryEmailSent: true,
        }),
      });
    });

    it('should handle errors per cart without stopping batch', async () => {
      prisma.cart.findMany.mockResolvedValue([
        { ...mockAbandonedCart, company: { id: mockCompanyId, name: 'Test' } },
        { ...mockAbandonedCart, id: 'cart-2', company: { id: mockCompanyId, name: 'Test' } },
      ]);
      prisma.cart.update
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({});

      await expect(service.sendPendingRecoveryEmails()).resolves.not.toThrow();
      expect(prisma.cart.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('recoverCart', () => {
    it('should recover abandoned cart with valid HMAC token', async () => {
      const token = generateTestRecoveryToken(mockCartId);
      prisma.cart.findFirst.mockResolvedValue(mockAbandonedCart);
      prisma.cart.update.mockResolvedValue({
        ...mockAbandonedCart,
        status: CartStatus.ACTIVE,
      });

      const result = await service.recoverCart(token);

      expect(result).toBe('session-abc');
      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: mockCartId },
        data: expect.objectContaining({
          status: CartStatus.ACTIVE,
        }),
      });
    });

    it('should return null for invalid token format', async () => {
      const result = await service.recoverCart('invalid-token');

      expect(result).toBeNull();
      expect(prisma.cart.findFirst).not.toHaveBeenCalled();
    });

    it('should return null if cart not found', async () => {
      const token = generateTestRecoveryToken(mockCartId);
      prisma.cart.findFirst.mockResolvedValue(null);

      const result = await service.recoverCart(token);

      expect(result).toBeNull();
      expect(prisma.cart.update).not.toHaveBeenCalled();
    });

    it('should return null for expired token', async () => {
      const token = generateExpiredToken(mockCartId);

      const result = await service.recoverCart(token);

      expect(result).toBeNull();
      expect(prisma.cart.findFirst).not.toHaveBeenCalled();
    });

    it('should return null for tampered token signature', async () => {
      // Create a valid token and tamper with the signature
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      const payload = `${mockCartId}:${expiresAt}`;
      const tamperedSignature = 'invalid_signature_';
      const token = Buffer.from(`${payload}:${tamperedSignature}`).toString('base64url');

      const result = await service.recoverCart(token);

      expect(result).toBeNull();
    });
  });

  describe('mapCartToDetails', () => {
    it('should correctly map cart to details structure', async () => {
      prisma.cart.findMany.mockResolvedValue([mockCart]);

      const result = await service.getAtRiskCarts(mockCompanyId);

      expect(result[0]).toEqual(expect.objectContaining({
        id: mockCartId,
        sessionToken: 'session-abc',
        email: 'test@example.com',
        itemCount: 1,
        subtotal: 50, // 25 * 2
        currency: 'USD',
        recoveryEmailSent: false,
        recoveryClicks: 0,
      }));
    });

    it('should handle missing customer', async () => {
      prisma.cart.findMany.mockResolvedValue([{ ...mockCart, customer: null }]);

      const result = await service.getAtRiskCarts(mockCompanyId);

      expect(result[0].email).toBeUndefined();
    });

    it('should handle empty items', async () => {
      prisma.cart.findMany.mockResolvedValue([{ ...mockCart, items: [] }]);

      const result = await service.getAtRiskCarts(mockCompanyId);

      expect(result[0].itemCount).toBe(0);
      expect(result[0].subtotal).toBe(0);
    });
  });
});
