/**
 * Comparison Service Unit Tests
 *
 * Comprehensive tests for product comparison management including:
 * - Comparison CRUD operations
 * - Item management (add, remove, reorder)
 * - Share functionality with token generation
 * - Comparison merging
 * - MAX_COMPARISON_ITEMS (4) limit enforcement
 * - Cross-company product validation
 * - Audit logging
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ComparisonService } from './comparison.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AuditAction } from '../../audit-logs/types/audit-log.types';
import {
  MAX_COMPARISON_ITEMS,
  DEFAULT_COMPARISON_EXPIRY_DAYS,
  DEFAULT_SHARED_COMPARISON_EXPIRY_DAYS,
} from '../types/comparison.types';

describe('ComparisonService', () => {
  let service: ComparisonService;
  let prisma: {
    productComparison: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    productComparisonItem: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      updateMany: jest.Mock;
    };
    product: {
      findUnique: jest.Mock;
    };
  };
  let auditLogService: {
    log: jest.Mock;
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockCompanyId = 'company-123';
  const mockComparisonId = 'comparison-456';
  const mockCustomerId = 'customer-789';
  const mockUserId = 'user-101';
  const mockSessionToken = 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz5678901234';
  const mockShareToken = 'share123def456ghi789jkl012mno345pqr678stu901vwx234yz5678901234';
  const mockProductId = 'product-001';
  const mockItemId = 'item-001';
  const mockVisitorId = 'visitor-001';

  const createMockProduct = (overrides: Partial<any> = {}) => ({
    id: mockProductId,
    companyId: mockCompanyId,
    name: 'Test Product',
    sku: 'TEST-001',
    price: 29.99,
    compareAtPrice: 39.99,
    status: 'ACTIVE',
    isVisible: true,
    description: 'A test product description',
    images: [{ url: 'https://example.com/image.jpg' }],
    attributes: { color: 'red', size: 'medium' },
    ...overrides,
  });

  const createMockComparisonItem = (overrides: Partial<any> = {}) => ({
    id: mockItemId,
    comparisonId: mockComparisonId,
    productId: mockProductId,
    variantId: null,
    productSnapshot: {
      name: 'Test Product',
      sku: 'TEST-001',
      image: 'https://example.com/image.jpg',
      price: 29.99,
      compareAtPrice: 39.99,
      currency: 'USD',
      description: 'A test product description',
      attributes: { color: 'red', size: 'medium' },
    },
    position: 0,
    addedAt: new Date(),
    product: createMockProduct(),
    ...overrides,
  });

  const createMockComparison = (overrides: Partial<any> = {}) => ({
    id: mockComparisonId,
    companyId: mockCompanyId,
    sessionToken: mockSessionToken,
    customerId: null,
    visitorId: null,
    siteId: null,
    name: null,
    shareToken: null,
    isShared: false,
    sharedAt: null,
    mergedIntoComparisonId: null,
    mergedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + DEFAULT_COMPARISON_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    items: [],
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    prisma = {
      productComparison: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productComparisonItem: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
    };

    auditLogService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparisonService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get<ComparisonService>(ComparisonService);
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
  });

  // ═══════════════════════════════════════════════════════════════
  // getOrCreateComparison TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getOrCreateComparison', () => {
    it('should return existing comparison if found by session token', async () => {
      const existingComparison = createMockComparison();
      prisma.productComparison.findFirst.mockResolvedValue(existingComparison);

      const result = await service.getOrCreateComparison(mockCompanyId, {
        sessionToken: mockSessionToken,
      });

      expect(result.id).toBe(mockComparisonId);
      expect(prisma.productComparison.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: mockCompanyId,
            mergedIntoComparisonId: null,
          }),
        }),
      );
      expect(prisma.productComparison.create).not.toHaveBeenCalled();
    });

    it('should return existing comparison if found by customer ID', async () => {
      const existingComparison = createMockComparison({ customerId: mockCustomerId });
      prisma.productComparison.findFirst.mockResolvedValue(existingComparison);

      const result = await service.getOrCreateComparison(mockCompanyId, {
        customerId: mockCustomerId,
      });

      expect(result.customerId).toBe(mockCustomerId);
      expect(prisma.productComparison.create).not.toHaveBeenCalled();
    });

    it('should return existing comparison if found by visitor ID', async () => {
      const existingComparison = createMockComparison({ visitorId: mockVisitorId });
      prisma.productComparison.findFirst.mockResolvedValue(existingComparison);

      const result = await service.getOrCreateComparison(mockCompanyId, {
        visitorId: mockVisitorId,
      });

      expect(result.visitorId).toBe(mockVisitorId);
      expect(prisma.productComparison.create).not.toHaveBeenCalled();
    });

    it('should create new comparison if no existing comparison found', async () => {
      prisma.productComparison.findFirst.mockResolvedValue(null);
      const newComparison = createMockComparison({ items: [] });
      prisma.productComparison.create.mockResolvedValue(newComparison);

      const result = await service.getOrCreateComparison(mockCompanyId, {});

      expect(result.id).toBe(mockComparisonId);
      expect(prisma.productComparison.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: mockCompanyId,
          }),
        }),
      );
    });

    it('should create comparison with provided session token', async () => {
      prisma.productComparison.findFirst.mockResolvedValue(null);
      const newComparison = createMockComparison({ items: [] });
      prisma.productComparison.create.mockResolvedValue(newComparison);

      await service.getOrCreateComparison(mockCompanyId, {
        sessionToken: 'provided-token',
      });

      expect(prisma.productComparison.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionToken: 'provided-token',
          }),
        }),
      );
    });

    it('should generate session token if not provided', async () => {
      prisma.productComparison.findFirst.mockResolvedValue(null);
      const newComparison = createMockComparison({ items: [] });
      prisma.productComparison.create.mockResolvedValue(newComparison);

      await service.getOrCreateComparison(mockCompanyId, {});

      expect(prisma.productComparison.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionToken: expect.stringMatching(/^[a-f0-9]{64}$/),
          }),
        }),
      );
    });

    it('should create comparison with customer ID', async () => {
      prisma.productComparison.findFirst.mockResolvedValue(null);
      const newComparison = createMockComparison({ customerId: mockCustomerId, items: [] });
      prisma.productComparison.create.mockResolvedValue(newComparison);

      await service.getOrCreateComparison(mockCompanyId, {
        customerId: mockCustomerId,
      });

      expect(prisma.productComparison.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: mockCustomerId,
          }),
        }),
      );
    });

    it('should create comparison with site ID', async () => {
      prisma.productComparison.findFirst.mockResolvedValue(null);
      const newComparison = createMockComparison({ siteId: 'site-001', items: [] });
      prisma.productComparison.create.mockResolvedValue(newComparison);

      await service.getOrCreateComparison(mockCompanyId, {
        siteId: 'site-001',
      });

      expect(prisma.productComparison.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            siteId: 'site-001',
          }),
        }),
      );
    });

    it('should create comparison with name', async () => {
      prisma.productComparison.findFirst.mockResolvedValue(null);
      const newComparison = createMockComparison({ name: 'My Comparison', items: [] });
      prisma.productComparison.create.mockResolvedValue(newComparison);

      await service.getOrCreateComparison(mockCompanyId, {
        name: 'My Comparison',
      });

      expect(prisma.productComparison.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'My Comparison',
          }),
        }),
      );
    });

    it('should set default expiration date', async () => {
      prisma.productComparison.findFirst.mockResolvedValue(null);
      const newComparison = createMockComparison({ items: [] });
      prisma.productComparison.create.mockResolvedValue(newComparison);

      await service.getOrCreateComparison(mockCompanyId, {});

      expect(prisma.productComparison.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should not match merged comparisons', async () => {
      prisma.productComparison.findFirst.mockResolvedValue(null);
      const newComparison = createMockComparison({ items: [] });
      prisma.productComparison.create.mockResolvedValue(newComparison);

      await service.getOrCreateComparison(mockCompanyId, {
        sessionToken: mockSessionToken,
      });

      expect(prisma.productComparison.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            mergedIntoComparisonId: null,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getComparisonById TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getComparisonById', () => {
    it('should return comparison when found', async () => {
      const comparison = createMockComparison();
      prisma.productComparison.findUnique.mockResolvedValue(comparison);

      const result = await service.getComparisonById(mockComparisonId);

      expect(result.id).toBe(mockComparisonId);
      expect(result.companyId).toBe(mockCompanyId);
    });

    it('should throw NotFoundException when comparison not found', async () => {
      prisma.productComparison.findUnique.mockResolvedValue(null);

      await expect(service.getComparisonById('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getComparisonById('nonexistent')).rejects.toThrow('Comparison not found');
    });

    it('should include items with product data', async () => {
      const comparison = createMockComparison({
        items: [createMockComparisonItem()],
      });
      prisma.productComparison.findUnique.mockResolvedValue(comparison);

      const result = await service.getComparisonById(mockComparisonId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productSnapshot.name).toBe('Test Product');
    });

    it('should return items ordered by position', async () => {
      const comparison = createMockComparison({
        items: [
          createMockComparisonItem({ id: 'item-2', position: 1 }),
          createMockComparisonItem({ id: 'item-1', position: 0 }),
        ],
      });
      prisma.productComparison.findUnique.mockResolvedValue(comparison);

      await service.getComparisonById(mockComparisonId);

      expect(prisma.productComparison.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            items: expect.objectContaining({
              orderBy: { position: 'asc' },
            }),
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getComparisonBySessionToken TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getComparisonBySessionToken', () => {
    it('should return comparison when found', async () => {
      const comparison = createMockComparison();
      prisma.productComparison.findFirst.mockResolvedValue(comparison);

      const result = await service.getComparisonBySessionToken(mockSessionToken, mockCompanyId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockComparisonId);
      expect(prisma.productComparison.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sessionToken: mockSessionToken,
            companyId: mockCompanyId,
            mergedIntoComparisonId: null,
          },
        }),
      );
    });

    it('should return null when comparison not found', async () => {
      prisma.productComparison.findFirst.mockResolvedValue(null);

      const result = await service.getComparisonBySessionToken('nonexistent', mockCompanyId);

      expect(result).toBeNull();
    });

    it('should not return merged comparisons', async () => {
      prisma.productComparison.findFirst.mockResolvedValue(null);

      await service.getComparisonBySessionToken(mockSessionToken, mockCompanyId);

      expect(prisma.productComparison.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            mergedIntoComparisonId: null,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getComparisonByCustomerId TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getComparisonByCustomerId', () => {
    it('should return comparison when found', async () => {
      const comparison = createMockComparison({ customerId: mockCustomerId });
      prisma.productComparison.findFirst.mockResolvedValue(comparison);

      const result = await service.getComparisonByCustomerId(mockCustomerId, mockCompanyId);

      expect(result).not.toBeNull();
      expect(result?.customerId).toBe(mockCustomerId);
    });

    it('should return null when comparison not found', async () => {
      prisma.productComparison.findFirst.mockResolvedValue(null);

      const result = await service.getComparisonByCustomerId('nonexistent', mockCompanyId);

      expect(result).toBeNull();
    });

    it('should not return merged comparisons', async () => {
      prisma.productComparison.findFirst.mockResolvedValue(null);

      await service.getComparisonByCustomerId(mockCustomerId, mockCompanyId);

      expect(prisma.productComparison.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            mergedIntoComparisonId: null,
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getComparisonByShareToken TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getComparisonByShareToken', () => {
    it('should return comparison when found with valid share token', async () => {
      const comparison = createMockComparison({
        shareToken: mockShareToken,
        isShared: true,
      });
      prisma.productComparison.findFirst.mockResolvedValue(comparison);

      const result = await service.getComparisonByShareToken(mockShareToken);

      expect(result).not.toBeNull();
      expect(result?.shareToken).toBe(mockShareToken);
      expect(result?.isShared).toBe(true);
    });

    it('should return null when share token not found', async () => {
      prisma.productComparison.findFirst.mockResolvedValue(null);

      const result = await service.getComparisonByShareToken('nonexistent');

      expect(result).toBeNull();
    });

    it('should only return shared comparisons', async () => {
      prisma.productComparison.findFirst.mockResolvedValue(null);

      await service.getComparisonByShareToken(mockShareToken);

      expect(prisma.productComparison.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            shareToken: mockShareToken,
            isShared: true,
          }),
        }),
      );
    });

    it('should check expiration date', async () => {
      prisma.productComparison.findFirst.mockResolvedValue(null);

      await service.getComparisonByShareToken(mockShareToken);

      expect(prisma.productComparison.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
          }),
        }),
      );
    });

    it('should return null for expired share links', async () => {
      // The Prisma query handles this - mocking null return
      prisma.productComparison.findFirst.mockResolvedValue(null);

      const result = await service.getComparisonByShareToken(mockShareToken);

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // addItem TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('addItem', () => {
    beforeEach(() => {
      prisma.productComparison.findUnique.mockResolvedValue(createMockComparison({ items: [] }));
      prisma.product.findUnique.mockResolvedValue(createMockProduct());
      prisma.productComparisonItem.create.mockResolvedValue(createMockComparisonItem());
      prisma.productComparison.update.mockResolvedValue(createMockComparison());
    });

    it('should add new item to comparison', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison({ items: [] }))
        .mockResolvedValueOnce(createMockComparison({ items: [createMockComparisonItem()] }));

      const result = await service.addItem(mockComparisonId, {
        productId: mockProductId,
      });

      expect(result).toBeDefined();
      expect(prisma.productComparisonItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            comparisonId: mockComparisonId,
            productId: mockProductId,
          }),
        }),
      );
    });

    it('should throw NotFoundException when comparison not found', async () => {
      prisma.productComparison.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem(mockComparisonId, { productId: mockProductId }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.addItem(mockComparisonId, { productId: mockProductId }),
      ).rejects.toThrow('Comparison not found');
    });

    it('should throw NotFoundException when product not found', async () => {
      prisma.productComparison.findUnique.mockResolvedValue(createMockComparison());
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem(mockComparisonId, { productId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.addItem(mockComparisonId, { productId: 'nonexistent' }),
      ).rejects.toThrow('Product not found');
    });

    it('should throw ForbiddenException when product belongs to different company', async () => {
      prisma.productComparison.findUnique.mockResolvedValue(createMockComparison());
      prisma.product.findUnique.mockResolvedValue(
        createMockProduct({ companyId: 'different-company' }),
      );

      await expect(
        service.addItem(mockComparisonId, { productId: mockProductId }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.addItem(mockComparisonId, { productId: mockProductId }),
      ).rejects.toThrow('Product does not belong to this company');
    });

    it('should throw BadRequestException when product is not active', async () => {
      prisma.productComparison.findUnique.mockResolvedValue(createMockComparison());
      prisma.product.findUnique.mockResolvedValue(createMockProduct({ status: 'INACTIVE' }));

      await expect(
        service.addItem(mockComparisonId, { productId: mockProductId }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addItem(mockComparisonId, { productId: mockProductId }),
      ).rejects.toThrow('Product is not available');
    });

    it('should throw BadRequestException when product is not visible', async () => {
      prisma.productComparison.findUnique.mockResolvedValue(createMockComparison());
      prisma.product.findUnique.mockResolvedValue(createMockProduct({ isVisible: false }));

      await expect(
        service.addItem(mockComparisonId, { productId: mockProductId }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addItem(mockComparisonId, { productId: mockProductId }),
      ).rejects.toThrow('Product is not available');
    });

    it('should throw BadRequestException when MAX_COMPARISON_ITEMS limit is reached', async () => {
      const items = [
        createMockComparisonItem({ id: 'item-1', position: 0 }),
        createMockComparisonItem({ id: 'item-2', position: 1 }),
        createMockComparisonItem({ id: 'item-3', position: 2 }),
        createMockComparisonItem({ id: 'item-4', position: 3 }),
      ];
      prisma.productComparison.findUnique.mockResolvedValue(createMockComparison({ items }));

      await expect(
        service.addItem(mockComparisonId, { productId: 'new-product' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addItem(mockComparisonId, { productId: 'new-product' }),
      ).rejects.toThrow(`Maximum of ${MAX_COMPARISON_ITEMS} items allowed in comparison`);
    });

    it('should throw BadRequestException when product already in comparison', async () => {
      const existingItem = createMockComparisonItem();
      prisma.productComparison.findUnique.mockResolvedValue(
        createMockComparison({ items: [existingItem] }),
      );

      await expect(
        service.addItem(mockComparisonId, { productId: mockProductId }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addItem(mockComparisonId, { productId: mockProductId }),
      ).rejects.toThrow('Product already in comparison');
    });

    it('should allow same product with different variant', async () => {
      const existingItem = createMockComparisonItem({ variantId: 'variant-1' });
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison({ items: [existingItem] }))
        .mockResolvedValueOnce(createMockComparison({
          items: [
            existingItem,
            createMockComparisonItem({ id: 'item-2', variantId: 'variant-2' }),
          ],
        }));

      const result = await service.addItem(mockComparisonId, {
        productId: mockProductId,
        variantId: 'variant-2',
      });

      expect(result).toBeDefined();
      expect(prisma.productComparisonItem.create).toHaveBeenCalled();
    });

    it('should store product snapshot when adding item', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison({ items: [] }))
        .mockResolvedValueOnce(createMockComparison({ items: [createMockComparisonItem()] }));

      await service.addItem(mockComparisonId, {
        productId: mockProductId,
      });

      expect(prisma.productComparisonItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productSnapshot: expect.objectContaining({
              name: 'Test Product',
              sku: 'TEST-001',
              price: 29.99,
              currency: 'USD',
            }),
          }),
        }),
      );
    });

    it('should add item at default position (end of list)', async () => {
      const existingItem = createMockComparisonItem({ position: 0 });
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison({ items: [existingItem] }))
        .mockResolvedValueOnce(createMockComparison({ items: [existingItem, createMockComparisonItem({ id: 'item-2', position: 1 })] }));
      prisma.product.findUnique.mockResolvedValue(createMockProduct({ id: 'product-002' }));

      await service.addItem(mockComparisonId, {
        productId: 'product-002',
      });

      expect(prisma.productComparisonItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            position: 1,
          }),
        }),
      );
    });

    it('should add item at specified position', async () => {
      const existingItem = createMockComparisonItem({ position: 0 });
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison({ items: [existingItem] }))
        .mockResolvedValueOnce(createMockComparison({ items: [createMockComparisonItem({ position: 0 }), existingItem] }));
      prisma.product.findUnique.mockResolvedValue(createMockProduct({ id: 'product-002' }));

      await service.addItem(mockComparisonId, {
        productId: 'product-002',
        position: 0,
      });

      expect(prisma.productComparisonItem.updateMany).toHaveBeenCalled();
      expect(prisma.productComparisonItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            position: 0,
          }),
        }),
      );
    });

    it('should update comparison timestamp', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison({ items: [] }))
        .mockResolvedValueOnce(createMockComparison({ items: [createMockComparisonItem()] }));

      await service.addItem(mockComparisonId, {
        productId: mockProductId,
      });

      expect(prisma.productComparison.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockComparisonId },
          data: { updatedAt: expect.any(Date) },
        }),
      );
    });

    it('should create audit log when actorId is provided', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison({ items: [] }))
        .mockResolvedValueOnce(createMockComparison({ items: [createMockComparisonItem()] }));

      await service.addItem(
        mockComparisonId,
        { productId: mockProductId },
        mockUserId,
      );

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.CREATE,
        'ProductComparisonItem',
        mockComparisonId,
        expect.objectContaining({
          userId: mockUserId,
          changes: expect.objectContaining({
            productId: expect.any(Object),
            position: expect.any(Object),
          }),
        }),
      );
    });

    it('should not create audit log when actorId is not provided', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison({ items: [] }))
        .mockResolvedValueOnce(createMockComparison({ items: [createMockComparisonItem()] }));

      await service.addItem(mockComparisonId, { productId: mockProductId });

      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('should add item with variant ID', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison({ items: [] }))
        .mockResolvedValueOnce(createMockComparison({ items: [createMockComparisonItem({ variantId: 'variant-001' })] }));

      await service.addItem(mockComparisonId, {
        productId: mockProductId,
        variantId: 'variant-001',
      });

      expect(prisma.productComparisonItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            variantId: 'variant-001',
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // removeItem TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('removeItem', () => {
    beforeEach(() => {
      prisma.productComparisonItem.findFirst.mockResolvedValue(createMockComparisonItem());
      prisma.productComparisonItem.delete.mockResolvedValue(createMockComparisonItem());
      prisma.productComparisonItem.updateMany.mockResolvedValue({ count: 0 });
      prisma.productComparison.update.mockResolvedValue(createMockComparison());
      prisma.productComparison.findUnique.mockResolvedValue(createMockComparison({ items: [] }));
    });

    it('should remove item from comparison', async () => {
      const result = await service.removeItem(mockComparisonId, mockItemId);

      expect(result).toBeDefined();
      expect(prisma.productComparisonItem.delete).toHaveBeenCalledWith({
        where: { id: mockItemId },
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      prisma.productComparisonItem.findFirst.mockResolvedValue(null);

      await expect(service.removeItem(mockComparisonId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeItem(mockComparisonId, 'nonexistent')).rejects.toThrow(
        'Comparison item not found',
      );
    });

    it('should reorder remaining items to close the gap', async () => {
      const item = createMockComparisonItem({ position: 1 });
      prisma.productComparisonItem.findFirst.mockResolvedValue(item);

      await service.removeItem(mockComparisonId, mockItemId);

      expect(prisma.productComparisonItem.updateMany).toHaveBeenCalledWith({
        where: {
          comparisonId: mockComparisonId,
          position: { gt: 1 },
        },
        data: {
          position: { decrement: 1 },
        },
      });
    });

    it('should update comparison timestamp', async () => {
      await service.removeItem(mockComparisonId, mockItemId);

      expect(prisma.productComparison.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockComparisonId },
          data: { updatedAt: expect.any(Date) },
        }),
      );
    });

    it('should create audit log when actorId is provided', async () => {
      await service.removeItem(mockComparisonId, mockItemId, mockUserId);

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.DELETE,
        'ProductComparisonItem',
        mockItemId,
        expect.objectContaining({
          userId: mockUserId,
          metadata: expect.objectContaining({ productId: mockProductId }),
        }),
      );
    });

    it('should not create audit log when actorId is not provided', async () => {
      await service.removeItem(mockComparisonId, mockItemId);

      expect(auditLogService.log).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // reorderItems TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('reorderItems', () => {
    const item1 = createMockComparisonItem({ id: 'item-1', position: 0 });
    const item2 = createMockComparisonItem({ id: 'item-2', position: 1 });
    const item3 = createMockComparisonItem({ id: 'item-3', position: 2 });

    beforeEach(() => {
      prisma.productComparison.findUnique.mockResolvedValue(
        createMockComparison({ items: [item1, item2, item3] }),
      );
      prisma.productComparisonItem.update.mockResolvedValue(createMockComparisonItem());
      prisma.productComparison.update.mockResolvedValue(createMockComparison());
    });

    it('should reorder items according to new order', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison({ items: [item1, item2, item3] }))
        .mockResolvedValueOnce(createMockComparison({ items: [item3, item1, item2] }));

      const result = await service.reorderItems(mockComparisonId, {
        itemIds: ['item-3', 'item-1', 'item-2'],
      });

      expect(result).toBeDefined();
      expect(prisma.productComparisonItem.update).toHaveBeenCalledTimes(3);
    });

    it('should throw NotFoundException when comparison not found', async () => {
      prisma.productComparison.findUnique.mockResolvedValue(null);

      await expect(
        service.reorderItems(mockComparisonId, { itemIds: ['item-1', 'item-2'] }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.reorderItems(mockComparisonId, { itemIds: ['item-1', 'item-2'] }),
      ).rejects.toThrow('Comparison not found');
    });

    it('should throw BadRequestException when item ID not in comparison', async () => {
      await expect(
        service.reorderItems(mockComparisonId, { itemIds: ['item-1', 'item-2', 'nonexistent'] }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reorderItems(mockComparisonId, { itemIds: ['item-1', 'item-2', 'nonexistent'] }),
      ).rejects.toThrow('Item nonexistent not found in comparison');
    });

    it('should throw BadRequestException when not all items included', async () => {
      await expect(
        service.reorderItems(mockComparisonId, { itemIds: ['item-1', 'item-2'] }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reorderItems(mockComparisonId, { itemIds: ['item-1', 'item-2'] }),
      ).rejects.toThrow('All comparison items must be included in reorder');
    });

    it('should update comparison timestamp', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison({ items: [item1, item2, item3] }))
        .mockResolvedValueOnce(createMockComparison({ items: [item1, item2, item3] }));

      await service.reorderItems(mockComparisonId, {
        itemIds: ['item-1', 'item-2', 'item-3'],
      });

      expect(prisma.productComparison.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockComparisonId },
          data: { updatedAt: expect.any(Date) },
        }),
      );
    });

    it('should create audit log when actorId is provided', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison({ items: [item1, item2, item3] }))
        .mockResolvedValueOnce(createMockComparison({ items: [item1, item2, item3] }));

      await service.reorderItems(
        mockComparisonId,
        { itemIds: ['item-1', 'item-2', 'item-3'] },
        mockUserId,
      );

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.UPDATE,
        'ProductComparison',
        mockComparisonId,
        expect.objectContaining({
          userId: mockUserId,
          metadata: expect.objectContaining({
            action: 'reorder',
            itemIds: ['item-1', 'item-2', 'item-3'],
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // shareComparison TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('shareComparison', () => {
    beforeEach(() => {
      prisma.productComparison.findUnique.mockResolvedValue(createMockComparison());
      prisma.productComparison.update.mockResolvedValue(
        createMockComparison({ isShared: true, shareToken: mockShareToken }),
      );
    });

    it('should generate share token and return share result', async () => {
      const result = await service.shareComparison(mockComparisonId, {});

      expect(result.comparisonId).toBe(mockComparisonId);
      expect(result.shareToken).toMatch(/^[a-f0-9]{64}$/);
      expect(result.shareUrl).toContain('/compare/');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when comparison not found', async () => {
      prisma.productComparison.findUnique.mockResolvedValue(null);

      await expect(service.shareComparison('nonexistent', {})).rejects.toThrow(NotFoundException);
      await expect(service.shareComparison('nonexistent', {})).rejects.toThrow(
        'Comparison not found',
      );
    });

    it('should update comparison with share data', async () => {
      await service.shareComparison(mockComparisonId, {});

      expect(prisma.productComparison.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockComparisonId },
          data: expect.objectContaining({
            shareToken: expect.stringMatching(/^[a-f0-9]{64}$/),
            isShared: true,
            sharedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should use default expiration days when not specified', async () => {
      const result = await service.shareComparison(mockComparisonId, {});

      const expectedExpiry = new Date();
      expectedExpiry.setDate(expectedExpiry.getDate() + DEFAULT_SHARED_COMPARISON_EXPIRY_DAYS);

      // Check expiration is approximately correct (within 1 minute)
      expect(Math.abs(result.expiresAt!.getTime() - expectedExpiry.getTime())).toBeLessThan(60000);
    });

    it('should use custom expiration days when specified', async () => {
      await service.shareComparison(mockComparisonId, { expiresInDays: 14 });

      expect(prisma.productComparison.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should use provided name for shared comparison', async () => {
      await service.shareComparison(mockComparisonId, { name: 'My Shared Comparison' });

      expect(prisma.productComparison.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'My Shared Comparison',
          }),
        }),
      );
    });

    it('should create audit log when actorId is provided', async () => {
      await service.shareComparison(mockComparisonId, { expiresInDays: 10 }, mockUserId);

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.UPDATE,
        'ProductComparison',
        mockComparisonId,
        expect.objectContaining({
          userId: mockUserId,
          metadata: expect.objectContaining({
            action: 'share',
            expiresInDays: 10,
          }),
        }),
      );
    });

    it('should build correct share URL', async () => {
      const result = await service.shareComparison(mockComparisonId, {});

      expect(result.shareUrl).toMatch(/^http.*\/compare\/[a-f0-9]{64}$/);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // unshareComparison TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('unshareComparison', () => {
    beforeEach(() => {
      prisma.productComparison.findUnique.mockResolvedValue(
        createMockComparison({ isShared: true, shareToken: mockShareToken }),
      );
      prisma.productComparison.update.mockResolvedValue(createMockComparison());
    });

    it('should remove share token and unshare comparison', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison({ isShared: true, shareToken: mockShareToken }))
        .mockResolvedValueOnce(createMockComparison({ isShared: false, shareToken: null }));

      const result = await service.unshareComparison(mockComparisonId);

      expect(result.isShared).toBe(false);
      expect(prisma.productComparison.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockComparisonId },
          data: expect.objectContaining({
            shareToken: null,
            isShared: false,
            sharedAt: null,
          }),
        }),
      );
    });

    it('should throw NotFoundException when comparison not found', async () => {
      prisma.productComparison.findUnique.mockResolvedValue(null);

      await expect(service.unshareComparison('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.unshareComparison('nonexistent')).rejects.toThrow(
        'Comparison not found',
      );
    });

    it('should create audit log when actorId is provided', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison({ isShared: true, shareToken: mockShareToken }))
        .mockResolvedValueOnce(createMockComparison({ isShared: false, shareToken: null }));

      await service.unshareComparison(mockComparisonId, mockUserId);

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.UPDATE,
        'ProductComparison',
        mockComparisonId,
        expect.objectContaining({
          userId: mockUserId,
          metadata: expect.objectContaining({ action: 'unshare' }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // clearComparison TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('clearComparison', () => {
    beforeEach(() => {
      prisma.productComparison.findUnique.mockResolvedValue(createMockComparison());
      prisma.productComparisonItem.deleteMany.mockResolvedValue({ count: 3 });
      prisma.productComparison.update.mockResolvedValue(createMockComparison({ items: [] }));
    });

    it('should remove all items from comparison', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison())
        .mockResolvedValueOnce(createMockComparison({ items: [] }));

      const result = await service.clearComparison(mockComparisonId);

      expect(result.items).toHaveLength(0);
      expect(prisma.productComparisonItem.deleteMany).toHaveBeenCalledWith({
        where: { comparisonId: mockComparisonId },
      });
    });

    it('should throw NotFoundException when comparison not found', async () => {
      prisma.productComparison.findUnique.mockResolvedValue(null);

      await expect(service.clearComparison('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.clearComparison('nonexistent')).rejects.toThrow('Comparison not found');
    });

    it('should update comparison timestamp', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison())
        .mockResolvedValueOnce(createMockComparison({ items: [] }));

      await service.clearComparison(mockComparisonId);

      expect(prisma.productComparison.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockComparisonId },
          data: { updatedAt: expect.any(Date) },
        }),
      );
    });

    it('should create audit log when actorId is provided', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison())
        .mockResolvedValueOnce(createMockComparison({ items: [] }));

      await service.clearComparison(mockComparisonId, mockUserId);

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.DELETE,
        'ProductComparison',
        mockComparisonId,
        expect.objectContaining({
          userId: mockUserId,
          metadata: expect.objectContaining({ action: 'clear' }),
        }),
      );
    });

    it('should not create audit log when actorId is not provided', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison())
        .mockResolvedValueOnce(createMockComparison({ items: [] }));

      await service.clearComparison(mockComparisonId);

      expect(auditLogService.log).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // mergeComparisons TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('mergeComparisons', () => {
    const sourceComparisonId = 'source-comparison-123';
    const targetComparisonId = 'target-comparison-456';
    const sourceItem = createMockComparisonItem({ id: 'source-item-1', productId: 'product-source' });
    const targetItem = createMockComparisonItem({ id: 'target-item-1', productId: 'product-target' });

    beforeEach(() => {
      prisma.productComparison.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceComparisonId) {
          return Promise.resolve(
            createMockComparison({
              id: sourceComparisonId,
              items: [sourceItem],
            }),
          );
        }
        if (where.id === targetComparisonId) {
          return Promise.resolve(
            createMockComparison({
              id: targetComparisonId,
              items: [targetItem],
            }),
          );
        }
        return Promise.resolve(null);
      });
      prisma.productComparisonItem.create.mockResolvedValue(createMockComparisonItem());
      prisma.productComparisonItem.deleteMany.mockResolvedValue({ count: 1 });
      prisma.productComparison.update.mockResolvedValue(createMockComparison());
    });

    it('should merge items from source to target comparison', async () => {
      const result = await service.mergeComparisons(sourceComparisonId, targetComparisonId);

      expect(result).toBeDefined();
      expect(prisma.productComparisonItem.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when source comparison not found', async () => {
      prisma.productComparison.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceComparisonId) {
          return Promise.resolve(null);
        }
        return Promise.resolve(createMockComparison({ id: targetComparisonId }));
      });

      await expect(
        service.mergeComparisons(sourceComparisonId, targetComparisonId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.mergeComparisons(sourceComparisonId, targetComparisonId),
      ).rejects.toThrow('Source comparison not found');
    });

    it('should throw NotFoundException when target comparison not found', async () => {
      prisma.productComparison.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceComparisonId) {
          return Promise.resolve(createMockComparison({ id: sourceComparisonId, items: [] }));
        }
        return Promise.resolve(null);
      });

      await expect(
        service.mergeComparisons(sourceComparisonId, targetComparisonId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.mergeComparisons(sourceComparisonId, targetComparisonId),
      ).rejects.toThrow('Target comparison not found');
    });

    it('should throw ForbiddenException when comparisons belong to different companies', async () => {
      prisma.productComparison.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceComparisonId) {
          return Promise.resolve(
            createMockComparison({
              id: sourceComparisonId,
              companyId: 'company-1',
              items: [],
            }),
          );
        }
        if (where.id === targetComparisonId) {
          return Promise.resolve(
            createMockComparison({
              id: targetComparisonId,
              companyId: 'company-2',
              items: [],
            }),
          );
        }
        return Promise.resolve(null);
      });

      await expect(
        service.mergeComparisons(sourceComparisonId, targetComparisonId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.mergeComparisons(sourceComparisonId, targetComparisonId),
      ).rejects.toThrow('Cannot merge comparisons from different companies');
    });

    it('should not duplicate items that already exist in target', async () => {
      const duplicateItem = createMockComparisonItem({ productId: 'product-001', variantId: null });
      prisma.productComparison.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceComparisonId) {
          return Promise.resolve(
            createMockComparison({
              id: sourceComparisonId,
              items: [duplicateItem],
            }),
          );
        }
        if (where.id === targetComparisonId) {
          return Promise.resolve(
            createMockComparison({
              id: targetComparisonId,
              items: [duplicateItem],
            }),
          );
        }
        return Promise.resolve(null);
      });

      await service.mergeComparisons(sourceComparisonId, targetComparisonId);

      // Create should not be called for duplicates
      expect(prisma.productComparisonItem.create).not.toHaveBeenCalled();
    });

    it('should respect MAX_COMPARISON_ITEMS limit when merging', async () => {
      const targetItems = [
        createMockComparisonItem({ id: 'target-1', productId: 'p1', position: 0 }),
        createMockComparisonItem({ id: 'target-2', productId: 'p2', position: 1 }),
        createMockComparisonItem({ id: 'target-3', productId: 'p3', position: 2 }),
      ];
      const sourceItems = [
        createMockComparisonItem({ id: 'source-1', productId: 'p4', position: 0 }),
        createMockComparisonItem({ id: 'source-2', productId: 'p5', position: 1 }),
      ];

      prisma.productComparison.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceComparisonId) {
          return Promise.resolve(
            createMockComparison({
              id: sourceComparisonId,
              items: sourceItems,
            }),
          );
        }
        if (where.id === targetComparisonId) {
          return Promise.resolve(
            createMockComparison({
              id: targetComparisonId,
              items: targetItems,
            }),
          );
        }
        return Promise.resolve(null);
      });

      await service.mergeComparisons(sourceComparisonId, targetComparisonId);

      // Should only add 1 item (MAX=4, target has 3, so only 1 can be added)
      expect(prisma.productComparisonItem.create).toHaveBeenCalledTimes(1);
    });

    it('should mark source comparison as merged', async () => {
      await service.mergeComparisons(sourceComparisonId, targetComparisonId);

      expect(prisma.productComparison.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sourceComparisonId },
          data: expect.objectContaining({
            mergedIntoComparisonId: targetComparisonId,
            mergedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should delete items from source comparison after merge', async () => {
      await service.mergeComparisons(sourceComparisonId, targetComparisonId);

      expect(prisma.productComparisonItem.deleteMany).toHaveBeenCalledWith({
        where: { comparisonId: sourceComparisonId },
      });
    });

    it('should update target comparison timestamp', async () => {
      await service.mergeComparisons(sourceComparisonId, targetComparisonId);

      expect(prisma.productComparison.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: targetComparisonId },
          data: { updatedAt: expect.any(Date) },
        }),
      );
    });

    it('should create audit log when actorId is provided', async () => {
      await service.mergeComparisons(sourceComparisonId, targetComparisonId, mockUserId);

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.UPDATE,
        'ProductComparison',
        targetComparisonId,
        expect.objectContaining({
          userId: mockUserId,
          metadata: expect.objectContaining({
            action: 'merge',
            sourceComparisonId: sourceComparisonId,
          }),
        }),
      );
    });

    it('should copy product snapshot when merging items', async () => {
      await service.mergeComparisons(sourceComparisonId, targetComparisonId);

      expect(prisma.productComparisonItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            comparisonId: targetComparisonId,
            productSnapshot: expect.any(Object),
          }),
        }),
      );
    });

    it('should preserve variant information when merging', async () => {
      const sourceItemWithVariant = createMockComparisonItem({
        id: 'source-item-1',
        productId: 'product-source',
        variantId: 'variant-123',
      });
      prisma.productComparison.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceComparisonId) {
          return Promise.resolve(
            createMockComparison({
              id: sourceComparisonId,
              items: [sourceItemWithVariant],
            }),
          );
        }
        if (where.id === targetComparisonId) {
          return Promise.resolve(
            createMockComparison({
              id: targetComparisonId,
              items: [],
            }),
          );
        }
        return Promise.resolve(null);
      });

      await service.mergeComparisons(sourceComparisonId, targetComparisonId);

      expect(prisma.productComparisonItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            variantId: 'variant-123',
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateComparison TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('updateComparison', () => {
    beforeEach(() => {
      prisma.productComparison.findUnique.mockResolvedValue(createMockComparison());
      prisma.productComparison.update.mockResolvedValue(createMockComparison({ name: 'Updated Name' }));
    });

    it('should update comparison name', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison())
        .mockResolvedValueOnce(createMockComparison({ name: 'Updated Name' }));

      const result = await service.updateComparison(mockComparisonId, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(prisma.productComparison.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockComparisonId },
          data: expect.objectContaining({
            name: 'Updated Name',
          }),
        }),
      );
    });

    it('should throw NotFoundException when comparison not found', async () => {
      prisma.productComparison.findUnique.mockResolvedValue(null);

      await expect(service.updateComparison('nonexistent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.updateComparison('nonexistent', { name: 'Test' })).rejects.toThrow(
        'Comparison not found',
      );
    });

    it('should create audit log when actorId is provided', async () => {
      prisma.productComparison.findUnique
        .mockResolvedValueOnce(createMockComparison())
        .mockResolvedValueOnce(createMockComparison({ name: 'Updated Name' }));

      await service.updateComparison(mockComparisonId, { name: 'Updated Name' }, mockUserId);

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.UPDATE,
        'ProductComparison',
        mockComparisonId,
        expect.objectContaining({
          userId: mockUserId,
          metadata: expect.objectContaining({ name: 'Updated Name' }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASES TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    describe('empty comparison operations', () => {
      it('should handle adding to empty comparison', async () => {
        prisma.productComparison.findUnique
          .mockResolvedValueOnce(createMockComparison({ items: [] }))
          .mockResolvedValueOnce(createMockComparison({ items: [createMockComparisonItem()] }));
        prisma.product.findUnique.mockResolvedValue(createMockProduct());
        prisma.productComparisonItem.create.mockResolvedValue(createMockComparisonItem());
        prisma.productComparison.update.mockResolvedValue(createMockComparison());

        const result = await service.addItem(mockComparisonId, {
          productId: mockProductId,
        });

        expect(result).toBeDefined();
        expect(prisma.productComparisonItem.create).toHaveBeenCalled();
      });

      it('should handle clearing already empty comparison', async () => {
        prisma.productComparison.findUnique
          .mockResolvedValueOnce(createMockComparison({ items: [] }))
          .mockResolvedValueOnce(createMockComparison({ items: [] }));
        prisma.productComparisonItem.deleteMany.mockResolvedValue({ count: 0 });
        prisma.productComparison.update.mockResolvedValue(createMockComparison({ items: [] }));

        const result = await service.clearComparison(mockComparisonId);

        expect(result.items).toHaveLength(0);
        expect(prisma.productComparisonItem.deleteMany).toHaveBeenCalled();
      });
    });

    describe('product with no images', () => {
      it('should handle product with no images', async () => {
        prisma.productComparison.findUnique
          .mockResolvedValueOnce(createMockComparison({ items: [] }))
          .mockResolvedValueOnce(createMockComparison({ items: [createMockComparisonItem()] }));
        prisma.product.findUnique.mockResolvedValue(createMockProduct({ images: [] }));
        prisma.productComparisonItem.create.mockResolvedValue(createMockComparisonItem());
        prisma.productComparison.update.mockResolvedValue(createMockComparison());

        await service.addItem(mockComparisonId, {
          productId: mockProductId,
        });

        expect(prisma.productComparisonItem.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              productSnapshot: expect.objectContaining({
                image: undefined,
              }),
            }),
          }),
        );
      });

      it('should handle product with null images', async () => {
        prisma.productComparison.findUnique
          .mockResolvedValueOnce(createMockComparison({ items: [] }))
          .mockResolvedValueOnce(createMockComparison({ items: [createMockComparisonItem()] }));
        prisma.product.findUnique.mockResolvedValue(createMockProduct({ images: null }));
        prisma.productComparisonItem.create.mockResolvedValue(createMockComparisonItem());
        prisma.productComparison.update.mockResolvedValue(createMockComparison());

        await service.addItem(mockComparisonId, {
          productId: mockProductId,
        });

        expect(prisma.productComparisonItem.create).toHaveBeenCalled();
      });
    });

    describe('MAX_COMPARISON_ITEMS limit', () => {
      it('should allow adding up to MAX_COMPARISON_ITEMS', async () => {
        const threeItems = [
          createMockComparisonItem({ id: 'item-1', productId: 'p1', position: 0 }),
          createMockComparisonItem({ id: 'item-2', productId: 'p2', position: 1 }),
          createMockComparisonItem({ id: 'item-3', productId: 'p3', position: 2 }),
        ];
        prisma.productComparison.findUnique
          .mockResolvedValueOnce(createMockComparison({ items: threeItems }))
          .mockResolvedValueOnce(createMockComparison({ items: [...threeItems, createMockComparisonItem({ id: 'item-4', productId: 'p4' })] }));
        prisma.product.findUnique.mockResolvedValue(createMockProduct({ id: 'p4' }));
        prisma.productComparisonItem.create.mockResolvedValue(createMockComparisonItem());
        prisma.productComparison.update.mockResolvedValue(createMockComparison());

        const result = await service.addItem(mockComparisonId, {
          productId: 'p4',
        });

        expect(result).toBeDefined();
        expect(prisma.productComparisonItem.create).toHaveBeenCalled();
      });

      it('should reject adding beyond MAX_COMPARISON_ITEMS', async () => {
        const fourItems = [
          createMockComparisonItem({ id: 'item-1', productId: 'p1', position: 0 }),
          createMockComparisonItem({ id: 'item-2', productId: 'p2', position: 1 }),
          createMockComparisonItem({ id: 'item-3', productId: 'p3', position: 2 }),
          createMockComparisonItem({ id: 'item-4', productId: 'p4', position: 3 }),
        ];
        prisma.productComparison.findUnique.mockResolvedValue(createMockComparison({ items: fourItems }));
        prisma.product.findUnique.mockResolvedValue(createMockProduct({ id: 'p5' }));

        await expect(
          service.addItem(mockComparisonId, { productId: 'p5' }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('data transformation', () => {
      it('should correctly transform comparison to ComparisonData', async () => {
        const comparison = createMockComparison({
          name: 'Test Comparison',
          siteId: 'site-001',
          visitorId: 'visitor-001',
          customerId: 'customer-001',
          shareToken: mockShareToken,
          isShared: true,
          items: [createMockComparisonItem()],
        });
        prisma.productComparison.findUnique.mockResolvedValue(comparison);

        const result = await service.getComparisonById(mockComparisonId);

        expect(result.name).toBe('Test Comparison');
        expect(result.siteId).toBe('site-001');
        expect(result.visitorId).toBe('visitor-001');
        expect(result.customerId).toBe('customer-001');
        expect(result.shareToken).toBe(mockShareToken);
        expect(result.isShared).toBe(true);
        expect(result.items).toHaveLength(1);
      });

      it('should handle null optional fields', async () => {
        const comparison = createMockComparison({
          name: null,
          siteId: null,
          visitorId: null,
          customerId: null,
          shareToken: null,
          expiresAt: null,
        });
        prisma.productComparison.findUnique.mockResolvedValue(comparison);

        const result = await service.getComparisonById(mockComparisonId);

        expect(result.name).toBeUndefined();
        expect(result.siteId).toBeUndefined();
        expect(result.visitorId).toBeUndefined();
        expect(result.customerId).toBeUndefined();
        expect(result.shareToken).toBeUndefined();
        expect(result.expiresAt).toBeUndefined();
      });
    });

    describe('comparison item data transformation', () => {
      it('should correctly transform item with all fields', async () => {
        const item = createMockComparisonItem({
          variantId: 'variant-001',
          position: 2,
        });
        const comparison = createMockComparison({ items: [item] });
        prisma.productComparison.findUnique.mockResolvedValue(comparison);

        const result = await service.getComparisonById(mockComparisonId);

        expect(result.items[0].variantId).toBe('variant-001');
        expect(result.items[0].position).toBe(2);
        expect(result.items[0].productSnapshot).toBeDefined();
      });

      it('should handle item with null variant', async () => {
        const item = createMockComparisonItem({ variantId: null });
        const comparison = createMockComparison({ items: [item] });
        prisma.productComparison.findUnique.mockResolvedValue(comparison);

        const result = await service.getComparisonById(mockComparisonId);

        expect(result.items[0].variantId).toBeUndefined();
      });
    });
  });
});
