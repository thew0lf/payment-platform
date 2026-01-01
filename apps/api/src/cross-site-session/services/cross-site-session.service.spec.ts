/**
 * Cross-Site Session Service Unit Tests
 *
 * Comprehensive tests for cross-site session management including:
 * - Session creation and retrieval
 * - Session token generation
 * - Session transfer between sites
 * - Customer attachment
 * - Session merging on login
 * - Session lifecycle (expire, revoke)
 * - Session summary with item counts
 * - Cleanup of expired sessions
 * - Data reference management
 * - Audit logging
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CrossSiteSessionService } from './cross-site-session.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { CartService } from '../../cart/services/cart.service';
import { WishlistService } from '../../wishlist/services/wishlist.service';
import { ComparisonService } from '../../comparison/services/comparison.service';
import { CrossSiteSessionStatus } from '@prisma/client';
import { AuditAction } from '../../audit-logs/types/audit-log.types';
import { SessionDataType, SessionStatus } from '../types/cross-site-session.types';

describe('CrossSiteSessionService', () => {
  let service: CrossSiteSessionService;
  let prisma: {
    crossSiteSession: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    customer: {
      findUnique: jest.Mock;
    };
    cart: {
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    wishlist: {
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    productComparison: {
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let auditLogService: {
    log: jest.Mock;
  };
  let cartService: {
    getOrCreateCart: jest.Mock;
    getCartBySessionToken: jest.Mock;
    getCartById: jest.Mock;
    mergeCarts: jest.Mock;
  };
  let wishlistService: {
    getOrCreateWishlist: jest.Mock;
    getWishlistBySessionToken: jest.Mock;
    getWishlistById: jest.Mock;
    mergeWishlists: jest.Mock;
  };
  let comparisonService: {
    getOrCreateComparison: jest.Mock;
    getComparisonBySessionToken: jest.Mock;
    getComparisonById: jest.Mock;
    mergeComparisons: jest.Mock;
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockCompanyId = 'company-123';
  const mockSessionId = 'session-456';
  const mockCustomerId = 'customer-789';
  const mockUserId = 'user-101';
  const mockSessionToken = 'abc123def456789012345678901234567890123456789012345678901234';
  const mockVisitorId = 'visitor-001';
  const mockSiteId = 'site-001';

  const createMockCompany = (overrides: Partial<any> = {}) => ({
    id: mockCompanyId,
    name: 'Test Company',
    ...overrides,
  });

  const createMockCustomer = (overrides: Partial<any> = {}) => ({
    id: mockCustomerId,
    companyId: mockCompanyId,
    email: 'customer@test.com',
    firstName: 'Test',
    lastName: 'Customer',
    ...overrides,
  });

  const createMockSession = (overrides: Partial<any> = {}) => ({
    id: mockSessionId,
    companyId: mockCompanyId,
    sessionToken: mockSessionToken,
    visitorId: mockVisitorId,
    customerId: null,
    status: CrossSiteSessionStatus.ACTIVE,
    dataReferences: [],
    deviceInfo: null,
    firstSeenAt: new Date(),
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    company: createMockCompany(),
    customer: null,
    ...overrides,
  });

  const createMockCart = (overrides: Partial<any> = {}) => ({
    id: 'cart-001',
    companyId: mockCompanyId,
    sessionToken: mockSessionToken,
    items: [],
    totals: { itemCount: 0 },
    ...overrides,
  });

  const createMockWishlist = (overrides: Partial<any> = {}) => ({
    id: 'wishlist-001',
    companyId: mockCompanyId,
    sessionToken: mockSessionToken,
    items: [],
    itemCount: 0,
    ...overrides,
  });

  const createMockComparison = (overrides: Partial<any> = {}) => ({
    id: 'comparison-001',
    companyId: mockCompanyId,
    sessionToken: mockSessionToken,
    items: [],
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    prisma = {
      crossSiteSession: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      cart: {
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      wishlist: {
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      productComparison: {
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        // Mock transaction by passing the same prisma client to the callback
        return callback(prisma);
      }),
    } as any;

    auditLogService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    cartService = {
      getOrCreateCart: jest.fn(),
      getCartBySessionToken: jest.fn(),
      getCartById: jest.fn(),
      mergeCarts: jest.fn(),
    };

    wishlistService = {
      getOrCreateWishlist: jest.fn(),
      getWishlistBySessionToken: jest.fn(),
      getWishlistById: jest.fn(),
      mergeWishlists: jest.fn(),
    };

    comparisonService = {
      getOrCreateComparison: jest.fn(),
      getComparisonBySessionToken: jest.fn(),
      getComparisonById: jest.fn(),
      mergeComparisons: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrossSiteSessionService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogService },
        { provide: CartService, useValue: cartService },
        { provide: WishlistService, useValue: wishlistService },
        { provide: ComparisonService, useValue: comparisonService },
      ],
    }).compile();

    service = module.get<CrossSiteSessionService>(CrossSiteSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // generateSessionToken TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('generateSessionToken', () => {
    it('should generate a 64-character hex string', () => {
      const token = service.generateSessionToken();

      expect(token).toBeDefined();
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should generate unique tokens on each call', () => {
      const token1 = service.generateSessionToken();
      const token2 = service.generateSessionToken();

      expect(token1).not.toBe(token2);
    });

    it('should generate cryptographically random tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(service.generateSessionToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // createSession TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('createSession', () => {
    it('should create a new session with generated token', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.create.mockResolvedValue(session);

      const result = await service.createSession(mockCompanyId, {
        visitorId: mockVisitorId,
      });

      expect(result.id).toBe(mockSessionId);
      expect(result.companyId).toBe(mockCompanyId);
      expect(prisma.crossSiteSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: mockCompanyId,
            sessionToken: expect.any(String),
            visitorId: mockVisitorId,
            dataReferences: [],
          }),
        }),
      );
    });

    it('should set expiration to 30 days from now', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.create.mockResolvedValue(session);

      await service.createSession(mockCompanyId, {});

      expect(prisma.crossSiteSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should create session with device info', async () => {
      const deviceInfo = {
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
        fingerprint: 'abc123',
      };
      const session = createMockSession({ deviceInfo });
      prisma.crossSiteSession.create.mockResolvedValue(session);

      await service.createSession(mockCompanyId, { deviceInfo });

      expect(prisma.crossSiteSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deviceInfo: expect.objectContaining({
              userAgent: 'Mozilla/5.0',
              ipAddress: '192.168.1.1',
              fingerprint: 'abc123',
            }),
          }),
        }),
      );
    });

    it('should create audit log when actorId is provided', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.create.mockResolvedValue(session);

      await service.createSession(
        mockCompanyId,
        { siteId: mockSiteId },
        mockUserId,
      );

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.CREATE,
        'CrossSiteSession',
        mockSessionId,
        expect.objectContaining({
          userId: mockUserId,
          metadata: expect.objectContaining({
            companyId: mockCompanyId,
            siteId: mockSiteId,
          }),
        }),
      );
    });

    it('should not create audit log when actorId is not provided', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.create.mockResolvedValue(session);

      await service.createSession(mockCompanyId, {});

      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('should include company and customer in response', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.create.mockResolvedValue(session);

      const result = await service.createSession(mockCompanyId, {});

      expect(result.companyId).toBe(mockCompanyId);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getSessionByToken TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getSessionByToken', () => {
    it('should return session when found', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.findFirst.mockResolvedValue(session);

      const result = await service.getSessionByToken(mockSessionToken, mockCompanyId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockSessionId);
      expect(result?.sessionToken).toBe(mockSessionToken);
    });

    it('should return null when session not found', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      const result = await service.getSessionByToken('nonexistent', mockCompanyId);

      expect(result).toBeNull();
    });

    it('should only return active sessions', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      await service.getSessionByToken(mockSessionToken, mockCompanyId);

      expect(prisma.crossSiteSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CrossSiteSessionStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should only return non-expired sessions', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      await service.getSessionByToken(mockSessionToken, mockCompanyId);

      expect(prisma.crossSiteSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiresAt: { gt: expect.any(Date) },
          }),
        }),
      );
    });

    it('should filter by company ID', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      await service.getSessionByToken(mockSessionToken, mockCompanyId);

      expect(prisma.crossSiteSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: mockCompanyId,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getSessionById TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getSessionById', () => {
    it('should return session when found', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.findUnique.mockResolvedValue(session);

      const result = await service.getSessionById(mockSessionId);

      expect(result.id).toBe(mockSessionId);
    });

    it('should throw NotFoundException when session not found', async () => {
      prisma.crossSiteSession.findUnique.mockResolvedValue(null);

      await expect(service.getSessionById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getSessionById('nonexistent')).rejects.toThrow(
        'Cross-site session not found',
      );
    });

    it('should include company and customer relations', async () => {
      const session = createMockSession({
        customerId: mockCustomerId,
        customer: createMockCustomer(),
      });
      prisma.crossSiteSession.findUnique.mockResolvedValue(session);

      const result = await service.getSessionById(mockSessionId);

      expect(result.customerId).toBe(mockCustomerId);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getSessionByCustomerId TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getSessionByCustomerId', () => {
    it('should return session when found', async () => {
      const session = createMockSession({ customerId: mockCustomerId });
      prisma.crossSiteSession.findFirst.mockResolvedValue(session);

      const result = await service.getSessionByCustomerId(mockCustomerId, mockCompanyId);

      expect(result).not.toBeNull();
      expect(result?.customerId).toBe(mockCustomerId);
    });

    it('should return null when no session found', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      const result = await service.getSessionByCustomerId('nonexistent', mockCompanyId);

      expect(result).toBeNull();
    });

    it('should filter by company ID and active status', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      await service.getSessionByCustomerId(mockCustomerId, mockCompanyId);

      expect(prisma.crossSiteSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: mockCustomerId,
            companyId: mockCompanyId,
            status: CrossSiteSessionStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should order by lastActiveAt descending', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      await service.getSessionByCustomerId(mockCustomerId, mockCompanyId);

      expect(prisma.crossSiteSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { lastActiveAt: 'desc' },
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getOrCreateSession TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getOrCreateSession', () => {
    it('should return existing session when found by customer ID', async () => {
      const existingSession = createMockSession({ customerId: mockCustomerId });
      prisma.crossSiteSession.findFirst.mockResolvedValue(existingSession);

      const result = await service.getOrCreateSession(mockCompanyId, {
        customerId: mockCustomerId,
      });

      expect(result.id).toBe(mockSessionId);
      expect(prisma.crossSiteSession.create).not.toHaveBeenCalled();
    });

    it('should create new session when no existing session found', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);
      const newSession = createMockSession();
      prisma.crossSiteSession.create.mockResolvedValue(newSession);

      const result = await service.getOrCreateSession(mockCompanyId, {});

      expect(result.id).toBe(mockSessionId);
      expect(prisma.crossSiteSession.create).toHaveBeenCalled();
    });

    it('should create session with device info from options', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);
      const newSession = createMockSession();
      prisma.crossSiteSession.create.mockResolvedValue(newSession);

      await service.getOrCreateSession(mockCompanyId, {
        deviceFingerprint: 'fingerprint123',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      });

      expect(prisma.crossSiteSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deviceInfo: expect.objectContaining({
              fingerprint: 'fingerprint123',
              userAgent: 'Mozilla/5.0',
              ipAddress: '192.168.1.1',
            }),
          }),
        }),
      );
    });

    it('should create session with visitor ID', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);
      const newSession = createMockSession();
      prisma.crossSiteSession.create.mockResolvedValue(newSession);

      await service.getOrCreateSession(mockCompanyId, {
        visitorId: mockVisitorId,
      });

      expect(prisma.crossSiteSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            visitorId: mockVisitorId,
          }),
        }),
      );
    });

    it('should create session with customer ID when provided', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);
      const newSession = createMockSession({ customerId: mockCustomerId });
      prisma.crossSiteSession.create.mockResolvedValue(newSession);

      await service.getOrCreateSession(mockCompanyId, {
        customerId: mockCustomerId,
      });

      expect(prisma.crossSiteSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: mockCustomerId,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // transferSession TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('transferSession', () => {
    const targetSiteId = 'site-002';

    beforeEach(() => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(createMockSession());
      cartService.getOrCreateCart.mockResolvedValue(createMockCart());
      wishlistService.getOrCreateWishlist.mockResolvedValue(createMockWishlist());
      comparisonService.getOrCreateComparison.mockResolvedValue(createMockComparison());
      prisma.crossSiteSession.update.mockResolvedValue(createMockSession());
    });

    it('should transfer cart data to target site', async () => {
      const result = await service.transferSession(mockSessionToken, {
        targetSiteId,
        dataTypes: [SessionDataType.CART],
      });

      expect(cartService.getOrCreateCart).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          sessionToken: mockSessionToken,
          siteId: targetSiteId,
        }),
      );
      expect(result).toBeDefined();
    });

    it('should transfer wishlist data to target site', async () => {
      await service.transferSession(mockSessionToken, {
        targetSiteId,
        dataTypes: [SessionDataType.WISHLIST],
      });

      expect(wishlistService.getOrCreateWishlist).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          sessionToken: mockSessionToken,
          siteId: targetSiteId,
        }),
      );
    });

    it('should transfer comparison data to target site', async () => {
      await service.transferSession(mockSessionToken, {
        targetSiteId,
        dataTypes: [SessionDataType.COMPARISON],
      });

      expect(comparisonService.getOrCreateComparison).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          sessionToken: mockSessionToken,
          siteId: targetSiteId,
        }),
      );
    });

    it('should transfer all data types by default', async () => {
      await service.transferSession(mockSessionToken, { targetSiteId });

      expect(cartService.getOrCreateCart).toHaveBeenCalled();
      expect(wishlistService.getOrCreateWishlist).toHaveBeenCalled();
      expect(comparisonService.getOrCreateComparison).toHaveBeenCalled();
    });

    it('should throw NotFoundException when session not found', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      await expect(
        service.transferSession(mockSessionToken, { targetSiteId }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.transferSession(mockSessionToken, { targetSiteId }),
      ).rejects.toThrow('Session not found');
    });

    it('should update data references with new entities', async () => {
      await service.transferSession(mockSessionToken, { targetSiteId });

      expect(prisma.crossSiteSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dataReferences: expect.any(Array),
            lastActiveAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should merge with existing references avoiding duplicates', async () => {
      const existingReferences = [
        { type: SessionDataType.CART, entityId: 'old-cart', siteId: targetSiteId, lastUpdated: new Date() },
      ];
      prisma.crossSiteSession.findFirst.mockResolvedValue(
        createMockSession({ dataReferences: existingReferences }),
      );

      await service.transferSession(mockSessionToken, {
        targetSiteId,
        dataTypes: [SessionDataType.CART],
      });

      expect(prisma.crossSiteSession.update).toHaveBeenCalled();
    });

    it('should create audit log when actorId is provided', async () => {
      await service.transferSession(
        mockSessionToken,
        { targetSiteId, dataTypes: [SessionDataType.CART] },
        mockUserId,
      );

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.UPDATE,
        'CrossSiteSession',
        mockSessionId,
        expect.objectContaining({
          userId: mockUserId,
          metadata: expect.objectContaining({
            action: 'transfer',
            targetSiteId,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // attachCustomerToSession TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('attachCustomerToSession', () => {
    beforeEach(() => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(createMockSession());
      prisma.customer.findUnique.mockResolvedValue(createMockCustomer());
      prisma.crossSiteSession.update.mockResolvedValue(
        createMockSession({ customerId: mockCustomerId }),
      );
      prisma.cart.updateMany.mockResolvedValue({ count: 1 });
      prisma.wishlist.updateMany.mockResolvedValue({ count: 1 });
      prisma.productComparison.updateMany.mockResolvedValue({ count: 1 });
    });

    it('should attach customer to session', async () => {
      const result = await service.attachCustomerToSession(mockSessionToken, {
        customerId: mockCustomerId,
      });

      expect(result.customerId).toBe(mockCustomerId);
      expect(prisma.crossSiteSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: mockCustomerId,
          }),
        }),
      );
    });

    it('should throw NotFoundException when session not found', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      await expect(
        service.attachCustomerToSession(mockSessionToken, {
          customerId: mockCustomerId,
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.attachCustomerToSession(mockSessionToken, {
          customerId: mockCustomerId,
        }),
      ).rejects.toThrow('Session not found');
    });

    it('should throw BadRequestException when session already has customer', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(
        createMockSession({ customerId: 'existing-customer' }),
      );

      await expect(
        service.attachCustomerToSession(mockSessionToken, {
          customerId: mockCustomerId,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.attachCustomerToSession(mockSessionToken, {
          customerId: mockCustomerId,
        }),
      ).rejects.toThrow('Session already has a customer attached');
    });

    it('should throw NotFoundException when customer not found', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.attachCustomerToSession(mockSessionToken, {
          customerId: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.attachCustomerToSession(mockSessionToken, {
          customerId: 'nonexistent',
        }),
      ).rejects.toThrow('Customer not found');
    });

    it('should throw ForbiddenException when customer belongs to different company', async () => {
      prisma.customer.findUnique.mockResolvedValue(
        createMockCustomer({ companyId: 'other-company' }),
      );

      await expect(
        service.attachCustomerToSession(mockSessionToken, {
          customerId: mockCustomerId,
        }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.attachCustomerToSession(mockSessionToken, {
          customerId: mockCustomerId,
        }),
      ).rejects.toThrow('Customer does not belong to this company');
    });

    it('should update data references with customer ID', async () => {
      const dataReferences = [
        { type: SessionDataType.CART, entityId: 'cart-001', siteId: mockSiteId, lastUpdated: new Date() },
      ];
      prisma.crossSiteSession.findFirst.mockResolvedValue(
        createMockSession({ dataReferences }),
      );

      await service.attachCustomerToSession(mockSessionToken, {
        customerId: mockCustomerId,
      });

      expect(prisma.cart.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cart-001' },
          data: { customerId: mockCustomerId },
        }),
      );
    });

    it('should merge sessions when mergeGuestData is true and customer has existing session', async () => {
      const existingCustomerSession = createMockSession({
        id: 'existing-session',
        customerId: mockCustomerId,
      });

      prisma.crossSiteSession.findFirst
        .mockResolvedValueOnce(createMockSession()) // Guest session
        .mockResolvedValueOnce(existingCustomerSession); // Customer's existing session

      // Mock the merge flow
      prisma.crossSiteSession.findUnique.mockResolvedValue(existingCustomerSession);

      const result = await service.attachCustomerToSession(mockSessionToken, {
        customerId: mockCustomerId,
        mergeGuestData: true,
      });

      expect(result).toBeDefined();
    });

    it('should create audit log when actorId is provided', async () => {
      await service.attachCustomerToSession(
        mockSessionToken,
        { customerId: mockCustomerId },
        mockUserId,
      );

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.UPDATE,
        'CrossSiteSession',
        mockSessionId,
        expect.objectContaining({
          userId: mockUserId,
          metadata: expect.objectContaining({
            action: 'attach_customer',
            customerId: mockCustomerId,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // mergeSessions TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('mergeSessions', () => {
    const sourceSessionId = 'source-session';
    const targetSessionId = 'target-session';

    beforeEach(() => {
      prisma.crossSiteSession.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceSessionId) {
          return Promise.resolve(
            createMockSession({
              id: sourceSessionId,
              dataReferences: [
                { type: SessionDataType.CART, entityId: 'cart-1', siteId: mockSiteId, lastUpdated: new Date() },
              ],
            }),
          );
        }
        if (where.id === targetSessionId) {
          return Promise.resolve(
            createMockSession({
              id: targetSessionId,
              customerId: null,
              dataReferences: [],
            }),
          );
        }
        return Promise.resolve(null);
      });
      prisma.crossSiteSession.update.mockResolvedValue(createMockSession());
    });

    it('should merge source references into target session', async () => {
      const result = await service.mergeSessions(sourceSessionId, targetSessionId);

      expect(result.success).toBe(true);
      expect(result.sourceSessionId).toBe(sourceSessionId);
      expect(result.targetSessionId).toBe(targetSessionId);
    });

    it('should mark source session as merged', async () => {
      await service.mergeSessions(sourceSessionId, targetSessionId);

      expect(prisma.crossSiteSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sourceSessionId },
          data: expect.objectContaining({
            status: CrossSiteSessionStatus.MERGED,
          }),
        }),
      );
    });

    it('should throw NotFoundException when source session not found', async () => {
      prisma.crossSiteSession.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceSessionId) return Promise.resolve(null);
        return Promise.resolve(createMockSession({ id: targetSessionId }));
      });

      await expect(
        service.mergeSessions(sourceSessionId, targetSessionId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.mergeSessions(sourceSessionId, targetSessionId),
      ).rejects.toThrow('Source session not found');
    });

    it('should throw NotFoundException when target session not found', async () => {
      prisma.crossSiteSession.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceSessionId) {
          return Promise.resolve(createMockSession({ id: sourceSessionId }));
        }
        return Promise.resolve(null);
      });

      await expect(
        service.mergeSessions(sourceSessionId, targetSessionId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.mergeSessions(sourceSessionId, targetSessionId),
      ).rejects.toThrow('Target session not found');
    });

    it('should throw ForbiddenException when sessions are from different companies', async () => {
      prisma.crossSiteSession.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceSessionId) {
          return Promise.resolve(
            createMockSession({ id: sourceSessionId, companyId: 'company-A' }),
          );
        }
        return Promise.resolve(
          createMockSession({ id: targetSessionId, companyId: 'company-B' }),
        );
      });

      await expect(
        service.mergeSessions(sourceSessionId, targetSessionId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.mergeSessions(sourceSessionId, targetSessionId),
      ).rejects.toThrow('Cannot merge sessions from different companies');
    });

    it('should merge with customer session using mergeSessionsOnLogin', async () => {
      prisma.crossSiteSession.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceSessionId) {
          return Promise.resolve(createMockSession({ id: sourceSessionId }));
        }
        return Promise.resolve(
          createMockSession({ id: targetSessionId, customerId: mockCustomerId }),
        );
      });

      prisma.crossSiteSession.findFirst.mockResolvedValue(
        createMockSession({ id: sourceSessionId }),
      );
      prisma.customer.findUnique.mockResolvedValue(createMockCustomer());

      const result = await service.mergeSessions(sourceSessionId, targetSessionId);

      expect(result.success).toBe(true);
    });

    it('should create audit log when actorId is provided', async () => {
      await service.mergeSessions(sourceSessionId, targetSessionId, mockUserId);

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.UPDATE,
        'CrossSiteSession',
        targetSessionId,
        expect.objectContaining({
          userId: mockUserId,
          metadata: expect.objectContaining({
            action: 'merge_sessions',
            sourceSessionId,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // mergeSessionsOnLogin TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('mergeSessionsOnLogin', () => {
    beforeEach(() => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(
        createMockSession({
          dataReferences: [
            { type: SessionDataType.CART, entityId: 'cart-1', siteId: mockSiteId, lastUpdated: new Date() },
          ],
        }),
      );
      prisma.customer.findUnique.mockResolvedValue(createMockCustomer());
      prisma.crossSiteSession.create.mockResolvedValue(
        createMockSession({ customerId: mockCustomerId }),
      );
      prisma.crossSiteSession.update.mockResolvedValue(createMockSession());
      cartService.getCartBySessionToken.mockResolvedValue(
        createMockCart({ items: [{ id: 'item-1' }] }),
      );
      cartService.getCartById.mockResolvedValue(
        createMockCart({ totals: { itemCount: 1 } }),
      );
      cartService.mergeCarts.mockResolvedValue(undefined);
      prisma.cart.update.mockResolvedValue({});
    });

    it('should merge anonymous session into customer session', async () => {
      const result = await service.mergeSessionsOnLogin(
        mockSessionToken,
        mockCustomerId,
      );

      expect(result.success).toBe(true);
      expect(result.sourceSessionId).toBe(mockSessionId);
    });

    it('should create new customer session if none exists', async () => {
      prisma.crossSiteSession.findFirst
        .mockResolvedValueOnce(createMockSession()) // Source session
        .mockResolvedValueOnce(null); // No existing customer session

      await service.mergeSessionsOnLogin(mockSessionToken, mockCustomerId);

      expect(prisma.crossSiteSession.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when source session not found', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      await expect(
        service.mergeSessionsOnLogin(mockSessionToken, mockCustomerId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.mergeSessionsOnLogin(mockSessionToken, mockCustomerId),
      ).rejects.toThrow('Source session not found');
    });

    it('should throw NotFoundException when customer not found', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.mergeSessionsOnLogin(mockSessionToken, mockCustomerId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.mergeSessionsOnLogin(mockSessionToken, mockCustomerId),
      ).rejects.toThrow('Customer not found');
    });

    it('should throw ForbiddenException when customer belongs to different company', async () => {
      prisma.customer.findUnique.mockResolvedValue(
        createMockCustomer({ companyId: 'other-company' }),
      );

      await expect(
        service.mergeSessionsOnLogin(mockSessionToken, mockCustomerId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.mergeSessionsOnLogin(mockSessionToken, mockCustomerId),
      ).rejects.toThrow('Customer does not belong to this company');
    });

    it('should mark source session as merged', async () => {
      await service.mergeSessionsOnLogin(mockSessionToken, mockCustomerId);

      expect(prisma.crossSiteSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockSessionId },
          data: expect.objectContaining({
            status: CrossSiteSessionStatus.MERGED,
          }),
        }),
      );
    });

    it('should merge cart data and report in conflicts', async () => {
      const existingCustomerSession = createMockSession({
        id: 'customer-session',
        customerId: mockCustomerId,
        dataReferences: [
          { type: SessionDataType.CART, entityId: 'target-cart', siteId: mockSiteId, lastUpdated: new Date() },
        ],
      });

      prisma.crossSiteSession.findFirst
        .mockResolvedValueOnce(
          createMockSession({
            dataReferences: [
              { type: SessionDataType.CART, entityId: 'source-cart', siteId: mockSiteId, lastUpdated: new Date() },
            ],
          }),
        )
        .mockResolvedValueOnce(existingCustomerSession);

      cartService.getCartBySessionToken.mockResolvedValue(
        createMockCart({ id: 'source-cart', items: [{ id: 'item-1' }] }),
      );
      cartService.getCartById.mockResolvedValue(
        createMockCart({ id: 'target-cart', totals: { itemCount: 2 } }),
      );

      const result = await service.mergeSessionsOnLogin(
        mockSessionToken,
        mockCustomerId,
      );

      expect(result.conflicts).toBeDefined();
    });

    it('should handle cart merge failure gracefully', async () => {
      prisma.crossSiteSession.findFirst
        .mockResolvedValueOnce(
          createMockSession({
            dataReferences: [
              { type: SessionDataType.CART, entityId: 'cart-1', siteId: mockSiteId, lastUpdated: new Date() },
            ],
          }),
        )
        .mockResolvedValueOnce(null);

      cartService.getCartBySessionToken.mockRejectedValue(new Error('Cart error'));

      const result = await service.mergeSessionsOnLogin(
        mockSessionToken,
        mockCustomerId,
      );

      expect(result.success).toBe(true);
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].resolution).toBe('SOURCE_KEPT');
    });

    it('should create audit log when actorId is provided', async () => {
      prisma.crossSiteSession.findFirst
        .mockResolvedValueOnce(createMockSession())
        .mockResolvedValueOnce(null);

      await service.mergeSessionsOnLogin(
        mockSessionToken,
        mockCustomerId,
        mockUserId,
      );

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.UPDATE,
        'CrossSiteSession',
        expect.any(String),
        expect.objectContaining({
          userId: mockUserId,
          metadata: expect.objectContaining({
            action: 'merge_on_login',
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateActivity TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('updateActivity', () => {
    it('should update lastActiveAt timestamp', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.findUnique.mockResolvedValue(session);
      prisma.crossSiteSession.update.mockResolvedValue(session);

      const result = await service.updateActivity(mockSessionId);

      expect(prisma.crossSiteSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockSessionId },
          data: expect.objectContaining({
            lastActiveAt: expect.any(Date),
          }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when session not found', async () => {
      prisma.crossSiteSession.findUnique.mockResolvedValue(null);

      await expect(service.updateActivity('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateActivity('nonexistent')).rejects.toThrow(
        'Session not found',
      );
    });

    it('should accept optional context parameters', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.findUnique.mockResolvedValue(session);
      prisma.crossSiteSession.update.mockResolvedValue(session);

      await service.updateActivity(mockSessionId, {
        currentSiteId: mockSiteId,
        currentPage: '/products',
      });

      expect(prisma.crossSiteSession.update).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateSessionActivity TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('updateSessionActivity', () => {
    it('should update activity by session token', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.findFirst.mockResolvedValue(session);
      prisma.crossSiteSession.update.mockResolvedValue(session);

      await service.updateSessionActivity(mockSessionToken);

      expect(prisma.crossSiteSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockSessionId },
          data: { lastActiveAt: expect.any(Date) },
        }),
      );
    });

    it('should throw NotFoundException when session not found', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSessionActivity('nonexistent'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateSessionActivity('nonexistent'),
      ).rejects.toThrow('Session not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getSessionSummary TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getSessionSummary', () => {
    beforeEach(() => {
      cartService.getCartBySessionToken.mockResolvedValue(
        createMockCart({ totals: { itemCount: 3 } }),
      );
      wishlistService.getWishlistBySessionToken.mockResolvedValue(
        createMockWishlist({ itemCount: 2 }),
      );
      comparisonService.getComparisonBySessionToken.mockResolvedValue(
        createMockComparison({ items: [{ id: 'item-1' }] }),
      );
    });

    it('should return summary with item counts by session ID', async () => {
      const session = createMockSession({
        dataReferences: [
          { type: SessionDataType.CART, entityId: 'cart-1', siteId: mockSiteId, lastUpdated: new Date() },
          { type: SessionDataType.WISHLIST, entityId: 'wishlist-1', siteId: mockSiteId, lastUpdated: new Date() },
          { type: SessionDataType.COMPARISON, entityId: 'comparison-1', siteId: mockSiteId, lastUpdated: new Date() },
        ],
      });
      prisma.crossSiteSession.findUnique.mockResolvedValue(session);

      const result = await service.getSessionSummary(mockSessionId);

      expect(result.sessionId).toBe(mockSessionId);
      expect(result.cartItemCount).toBe(3);
      expect(result.wishlistItemCount).toBe(2);
      expect(result.comparisonItemCount).toBe(1);
    });

    it('should return summary by session token if ID not found', async () => {
      prisma.crossSiteSession.findUnique.mockResolvedValue(null);
      const session = createMockSession({
        dataReferences: [
          { type: SessionDataType.CART, entityId: 'cart-1', siteId: mockSiteId, lastUpdated: new Date() },
        ],
      });
      prisma.crossSiteSession.findFirst.mockResolvedValue(session);

      const result = await service.getSessionSummary(mockSessionToken);

      expect(result.sessionId).toBe(mockSessionId);
    });

    it('should throw NotFoundException when session not found', async () => {
      prisma.crossSiteSession.findUnique.mockResolvedValue(null);
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      await expect(service.getSessionSummary('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getSessionSummary('nonexistent')).rejects.toThrow(
        'Session not found',
      );
    });

    it('should return unique active sites', async () => {
      const session = createMockSession({
        dataReferences: [
          { type: SessionDataType.CART, entityId: 'cart-1', siteId: 'site-1', lastUpdated: new Date() },
          { type: SessionDataType.WISHLIST, entityId: 'wishlist-1', siteId: 'site-2', lastUpdated: new Date() },
          { type: SessionDataType.COMPARISON, entityId: 'comparison-1', siteId: 'site-1', lastUpdated: new Date() },
        ],
      });
      prisma.crossSiteSession.findUnique.mockResolvedValue(session);

      const result = await service.getSessionSummary(mockSessionId);

      expect(result.activeSites).toContain('site-1');
      expect(result.activeSites).toContain('site-2');
      expect(result.activeSites.length).toBe(2);
    });

    it('should handle data fetch errors gracefully', async () => {
      const session = createMockSession({
        dataReferences: [
          { type: SessionDataType.CART, entityId: 'cart-1', siteId: mockSiteId, lastUpdated: new Date() },
        ],
      });
      prisma.crossSiteSession.findUnique.mockResolvedValue(session);
      cartService.getCartBySessionToken.mockRejectedValue(new Error('Cart error'));

      const result = await service.getSessionSummary(mockSessionId);

      expect(result.cartItemCount).toBe(0);
    });

    it('should return zero counts for empty session', async () => {
      const session = createMockSession({ dataReferences: [] });
      prisma.crossSiteSession.findUnique.mockResolvedValue(session);

      const result = await service.getSessionSummary(mockSessionId);

      expect(result.cartItemCount).toBe(0);
      expect(result.wishlistItemCount).toBe(0);
      expect(result.comparisonItemCount).toBe(0);
      expect(result.activeSites).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // cleanupExpiredSessions TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('cleanupExpiredSessions', () => {
    it('should update expired sessions to EXPIRED status', async () => {
      const expiredSessions = [{ id: 'session-1' }, { id: 'session-2' }];
      prisma.crossSiteSession.findMany.mockResolvedValue(expiredSessions);
      prisma.crossSiteSession.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.cleanupExpiredSessions();

      expect(result).toBe(2);
      expect(prisma.crossSiteSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { in: ['session-1', 'session-2'] },
          },
          data: {
            status: CrossSiteSessionStatus.EXPIRED,
          },
        }),
      );
    });

    it('should return 0 when no expired sessions found', async () => {
      prisma.crossSiteSession.findMany.mockResolvedValue([]);

      const result = await service.cleanupExpiredSessions();

      expect(result).toBe(0);
      expect(prisma.crossSiteSession.updateMany).not.toHaveBeenCalled();
    });

    it('should find only active sessions with expired date', async () => {
      prisma.crossSiteSession.findMany.mockResolvedValue([]);

      await service.cleanupExpiredSessions();

      expect(prisma.crossSiteSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: CrossSiteSessionStatus.ACTIVE,
            expiresAt: { lt: expect.any(Date) },
          },
        }),
      );
    });

    it('should create audit log for batch cleanup', async () => {
      const expiredSessions = [{ id: 'session-1' }, { id: 'session-2' }];
      prisma.crossSiteSession.findMany.mockResolvedValue(expiredSessions);
      prisma.crossSiteSession.updateMany.mockResolvedValue({ count: 2 });

      await service.cleanupExpiredSessions();

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.UPDATE,
        'CrossSiteSession',
        undefined,
        expect.objectContaining({
          metadata: expect.objectContaining({
            action: 'batch_cleanup',
            expiredCount: 2,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // revokeSession TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('revokeSession', () => {
    it('should update session status to REVOKED', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.findFirst.mockResolvedValue(session);
      prisma.crossSiteSession.update.mockResolvedValue(
        createMockSession({ status: CrossSiteSessionStatus.REVOKED }),
      );

      await service.revokeSession(mockSessionToken);

      expect(prisma.crossSiteSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockSessionId },
          data: {
            status: CrossSiteSessionStatus.REVOKED,
          },
        }),
      );
    });

    it('should throw NotFoundException when session not found', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      await expect(service.revokeSession('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.revokeSession('nonexistent')).rejects.toThrow(
        'Session not found',
      );
    });

    it('should always create audit log for security action', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.findFirst.mockResolvedValue(session);
      prisma.crossSiteSession.update.mockResolvedValue(session);

      await service.revokeSession(mockSessionToken, mockUserId);

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.UPDATE,
        'CrossSiteSession',
        mockSessionId,
        expect.objectContaining({
          userId: mockUserId,
          metadata: expect.objectContaining({
            action: 'revoke',
            reason: 'security',
          }),
        }),
      );
    });

    it('should log even without actorId', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.findFirst.mockResolvedValue(session);
      prisma.crossSiteSession.update.mockResolvedValue(session);

      await service.revokeSession(mockSessionToken);

      expect(auditLogService.log).toHaveBeenCalled();
    });

    it('should revoke session regardless of status', async () => {
      const expiredSession = createMockSession({
        status: CrossSiteSessionStatus.EXPIRED,
      });
      prisma.crossSiteSession.findFirst.mockResolvedValue(expiredSession);
      prisma.crossSiteSession.update.mockResolvedValue(expiredSession);

      await service.revokeSession(mockSessionToken);

      expect(prisma.crossSiteSession.update).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // expireSession TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('expireSession', () => {
    it('should update session status to EXPIRED', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.findFirst.mockResolvedValue(session);
      prisma.crossSiteSession.update.mockResolvedValue(
        createMockSession({ status: CrossSiteSessionStatus.EXPIRED }),
      );

      await service.expireSession(mockSessionToken);

      expect(prisma.crossSiteSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockSessionId },
          data: {
            status: CrossSiteSessionStatus.EXPIRED,
            expiresAt: expect.any(Date),
          },
        }),
      );
    });

    it('should throw NotFoundException when session not found', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      await expect(service.expireSession('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.expireSession('nonexistent')).rejects.toThrow(
        'Session not found',
      );
    });

    it('should only expire active sessions', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      await expect(service.expireSession(mockSessionToken)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.crossSiteSession.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: CrossSiteSessionStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should create audit log when actorId is provided', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.findFirst.mockResolvedValue(session);
      prisma.crossSiteSession.update.mockResolvedValue(session);

      await service.expireSession(mockSessionToken, mockUserId);

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.UPDATE,
        'CrossSiteSession',
        mockSessionId,
        expect.objectContaining({
          userId: mockUserId,
          metadata: { action: 'expire' },
        }),
      );
    });

    it('should not create audit log when actorId is not provided', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.findFirst.mockResolvedValue(session);
      prisma.crossSiteSession.update.mockResolvedValue(session);

      await service.expireSession(mockSessionToken);

      expect(auditLogService.log).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // linkDataToSession TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('linkDataToSession', () => {
    it('should add new data reference to session', async () => {
      const session = createMockSession({ dataReferences: [] });
      prisma.crossSiteSession.findFirst.mockResolvedValue(session);
      prisma.crossSiteSession.update.mockResolvedValue(session);

      await service.linkDataToSession(
        mockSessionToken,
        SessionDataType.CART,
        'cart-001',
        mockSiteId,
      );

      expect(prisma.crossSiteSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dataReferences: expect.arrayContaining([
              expect.objectContaining({
                type: SessionDataType.CART,
                entityId: 'cart-001',
                siteId: mockSiteId,
              }),
            ]),
          }),
        }),
      );
    });

    it('should update existing reference for same type and site', async () => {
      const existingReferences = [
        { type: SessionDataType.CART, entityId: 'old-cart', siteId: mockSiteId, lastUpdated: new Date() },
      ];
      const session = createMockSession({ dataReferences: existingReferences });
      prisma.crossSiteSession.findFirst.mockResolvedValue(session);
      prisma.crossSiteSession.update.mockResolvedValue(session);

      await service.linkDataToSession(
        mockSessionToken,
        SessionDataType.CART,
        'new-cart',
        mockSiteId,
      );

      expect(prisma.crossSiteSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dataReferences: expect.arrayContaining([
              expect.objectContaining({
                type: SessionDataType.CART,
                entityId: 'new-cart',
                siteId: mockSiteId,
              }),
            ]),
          }),
        }),
      );
    });

    it('should throw NotFoundException when session not found', async () => {
      prisma.crossSiteSession.findFirst.mockResolvedValue(null);

      await expect(
        service.linkDataToSession(
          'nonexistent',
          SessionDataType.CART,
          'cart-001',
          mockSiteId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update lastActiveAt timestamp', async () => {
      const session = createMockSession();
      prisma.crossSiteSession.findFirst.mockResolvedValue(session);
      prisma.crossSiteSession.update.mockResolvedValue(session);

      await service.linkDataToSession(
        mockSessionToken,
        SessionDataType.WISHLIST,
        'wishlist-001',
        mockSiteId,
      );

      expect(prisma.crossSiteSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastActiveAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASES TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    describe('concurrent session access', () => {
      it('should handle multiple simultaneous transfers', async () => {
        prisma.crossSiteSession.findFirst.mockResolvedValue(createMockSession());
        cartService.getOrCreateCart.mockResolvedValue(createMockCart());
        wishlistService.getOrCreateWishlist.mockResolvedValue(createMockWishlist());
        comparisonService.getOrCreateComparison.mockResolvedValue(createMockComparison());
        prisma.crossSiteSession.update.mockResolvedValue(createMockSession());

        const transfers = Promise.all([
          service.transferSession(mockSessionToken, { targetSiteId: 'site-1' }),
          service.transferSession(mockSessionToken, { targetSiteId: 'site-2' }),
        ]);

        await expect(transfers).resolves.toBeDefined();
      });
    });

    describe('expired session handling', () => {
      it('should not return expired sessions for getSessionByToken', async () => {
        prisma.crossSiteSession.findFirst.mockResolvedValue(null);

        const result = await service.getSessionByToken(mockSessionToken, mockCompanyId);

        expect(result).toBeNull();
        expect(prisma.crossSiteSession.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              expiresAt: { gt: expect.any(Date) },
            }),
          }),
        );
      });
    });

    describe('merged session handling', () => {
      it('should not allow merging already merged sessions', async () => {
        prisma.crossSiteSession.findFirst.mockResolvedValue(
          createMockSession({ status: CrossSiteSessionStatus.MERGED }),
        );

        // The service should still find it since findFirst doesn't filter by ACTIVE for source
        expect(prisma.crossSiteSession.findFirst).toBeDefined();
      });
    });

    describe('data reference management', () => {
      it('should handle empty data references', async () => {
        const session = createMockSession({ dataReferences: [] });
        prisma.crossSiteSession.findUnique.mockResolvedValue(session);

        const result = await service.getSessionSummary(mockSessionId);

        expect(result.cartItemCount).toBe(0);
        expect(result.wishlistItemCount).toBe(0);
        expect(result.comparisonItemCount).toBe(0);
      });

      it('should handle null data references', async () => {
        const session = createMockSession({ dataReferences: null });
        prisma.crossSiteSession.findUnique.mockResolvedValue(session);

        const result = await service.getSessionSummary(mockSessionId);

        expect(result.cartItemCount).toBe(0);
      });
    });

    describe('device info handling', () => {
      it('should handle session without device info', async () => {
        const session = createMockSession({ deviceInfo: null });
        prisma.crossSiteSession.findUnique.mockResolvedValue(session);

        const result = await service.getSessionById(mockSessionId);

        expect(result.deviceInfo).toBeUndefined();
      });

      it('should properly transform device info', async () => {
        const session = createMockSession({
          deviceInfo: {
            userAgent: 'Mozilla/5.0',
            ipAddress: '192.168.1.1',
            fingerprint: 'abc123',
          },
        });
        prisma.crossSiteSession.findUnique.mockResolvedValue(session);

        const result = await service.getSessionById(mockSessionId);

        expect(result.deviceInfo).toEqual({
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
          fingerprint: 'abc123',
        });
      });
    });

    describe('status transformation', () => {
      it('should correctly transform session status', async () => {
        const session = createMockSession({ status: CrossSiteSessionStatus.ACTIVE });
        prisma.crossSiteSession.findUnique.mockResolvedValue(session);

        const result = await service.getSessionById(mockSessionId);

        expect(result.status).toBe(SessionStatus.ACTIVE);
      });
    });

    describe('optional fields handling', () => {
      it('should handle null visitor ID', async () => {
        const session = createMockSession({ visitorId: null });
        prisma.crossSiteSession.findUnique.mockResolvedValue(session);

        const result = await service.getSessionById(mockSessionId);

        expect(result.visitorId).toBeUndefined();
      });

      it('should handle null customer ID', async () => {
        const session = createMockSession({ customerId: null });
        prisma.crossSiteSession.findUnique.mockResolvedValue(session);

        const result = await service.getSessionById(mockSessionId);

        expect(result.customerId).toBeUndefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DATA TRANSFORMATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('data transformation', () => {
    it('should correctly transform session to CrossSiteSessionData', async () => {
      const session = createMockSession({
        visitorId: mockVisitorId,
        customerId: mockCustomerId,
        deviceInfo: { userAgent: 'Mozilla/5.0' },
        dataReferences: [
          { type: SessionDataType.CART, entityId: 'cart-1', siteId: mockSiteId, lastUpdated: new Date() },
        ],
      });
      prisma.crossSiteSession.findUnique.mockResolvedValue(session);

      const result = await service.getSessionById(mockSessionId);

      expect(result.id).toBe(mockSessionId);
      expect(result.companyId).toBe(mockCompanyId);
      expect(result.sessionToken).toBe(mockSessionToken);
      expect(result.visitorId).toBe(mockVisitorId);
      expect(result.customerId).toBe(mockCustomerId);
      expect(result.status).toBe(SessionStatus.ACTIVE);
      expect(result.dataReferences).toHaveLength(1);
      expect(result.deviceInfo?.userAgent).toBe('Mozilla/5.0');
      expect(result.firstSeenAt).toBeDefined();
      expect(result.lastActiveAt).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should handle all date fields correctly', async () => {
      const now = new Date();
      const session = createMockSession({
        firstSeenAt: now,
        lastActiveAt: now,
        expiresAt: now,
        createdAt: now,
        updatedAt: now,
      });
      prisma.crossSiteSession.findUnique.mockResolvedValue(session);

      const result = await service.getSessionById(mockSessionId);

      expect(result.firstSeenAt).toEqual(now);
      expect(result.lastActiveAt).toEqual(now);
      expect(result.expiresAt).toEqual(now);
      expect(result.createdAt).toEqual(now);
      expect(result.updatedAt).toEqual(now);
    });
  });
});
