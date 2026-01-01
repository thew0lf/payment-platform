/**
 * Wishlist Service Unit Tests
 *
 * Comprehensive tests for wishlist management including:
 * - Wishlist CRUD operations
 * - Wishlist item management (add, update, remove)
 * - Public sharing functionality
 * - Wishlist merging
 * - Item reordering
 * - Cross-company product validation
 * - Audit logging
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { AuditAction } from '../../audit-logs/types/audit-log.types';

describe('WishlistService', () => {
  let service: WishlistService;
  let prisma: {
    wishlist: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    wishlistItem: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
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
  const mockWishlistId = 'wishlist-456';
  const mockCustomerId = 'customer-789';
  const mockUserId = 'user-101';
  const mockSessionToken = 'abc123def456789012345678901234567890123456789012345678901234';
  const mockProductId = 'product-001';
  const mockItemId = 'item-001';
  const mockSharedUrl = 'abcd1234';

  const createMockProduct = (overrides: Partial<any> = {}) => ({
    id: mockProductId,
    companyId: mockCompanyId, // Must match wishlist's companyId for cross-company validation
    name: 'Test Product',
    sku: 'TEST-001',
    price: 29.99,
    compareAtPrice: 39.99,
    status: 'ACTIVE',
    isVisible: true,
    images: [{ url: 'https://example.com/image.jpg' }],
    ...overrides,
  });

  const createMockWishlistItem = (overrides: Partial<any> = {}) => ({
    id: mockItemId,
    wishlistId: mockWishlistId,
    productId: mockProductId,
    variantId: null,
    productSnapshot: {
      name: 'Test Product',
      sku: 'TEST-001',
      image: 'https://example.com/image.jpg',
      price: 29.99,
      compareAtPrice: 39.99,
    },
    priority: 100,
    notes: null,
    addedAt: new Date(),
    product: createMockProduct(),
    ...overrides,
  });

  const createMockWishlist = (overrides: Partial<any> = {}) => ({
    id: mockWishlistId,
    companyId: mockCompanyId,
    sessionToken: mockSessionToken,
    customerId: null,
    siteId: null,
    name: 'My Wishlist',
    isPublic: false,
    sharedUrl: null,
    itemCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
    items: [createMockWishlistItem()],
    ...overrides,
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    prisma = {
      wishlist: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      wishlistItem: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
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
        WishlistService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
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
  // getOrCreateWishlist TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getOrCreateWishlist', () => {
    it('should return existing wishlist if found by session token', async () => {
      const existingWishlist = createMockWishlist();
      prisma.wishlist.findFirst.mockResolvedValue(existingWishlist);

      const result = await service.getOrCreateWishlist(mockCompanyId, {
        sessionToken: mockSessionToken,
      });

      expect(result.id).toBe(mockWishlistId);
      expect(prisma.wishlist.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: mockCompanyId,
          }),
        }),
      );
      expect(prisma.wishlist.create).not.toHaveBeenCalled();
    });

    it('should return existing wishlist if found by customer ID', async () => {
      const existingWishlist = createMockWishlist({ customerId: mockCustomerId });
      prisma.wishlist.findFirst.mockResolvedValue(existingWishlist);

      const result = await service.getOrCreateWishlist(mockCompanyId, {
        customerId: mockCustomerId,
      });

      expect(result.customerId).toBe(mockCustomerId);
      expect(prisma.wishlist.create).not.toHaveBeenCalled();
    });

    it('should create new wishlist if no existing wishlist found', async () => {
      prisma.wishlist.findFirst.mockResolvedValue(null);
      const newWishlist = createMockWishlist({ items: [] });
      prisma.wishlist.create.mockResolvedValue(newWishlist);

      const result = await service.getOrCreateWishlist(mockCompanyId, {});

      expect(result.id).toBe(mockWishlistId);
      expect(prisma.wishlist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: mockCompanyId,
            name: 'My Wishlist',
          }),
        }),
      );
    });

    it('should create wishlist with provided session token', async () => {
      prisma.wishlist.findFirst.mockResolvedValue(null);
      const newWishlist = createMockWishlist({ items: [] });
      prisma.wishlist.create.mockResolvedValue(newWishlist);

      await service.getOrCreateWishlist(mockCompanyId, {
        sessionToken: 'provided-token',
      });

      expect(prisma.wishlist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionToken: 'provided-token',
          }),
        }),
      );
    });

    it('should create wishlist with custom name', async () => {
      prisma.wishlist.findFirst.mockResolvedValue(null);
      const newWishlist = createMockWishlist({ name: 'Birthday Wishlist', items: [] });
      prisma.wishlist.create.mockResolvedValue(newWishlist);

      await service.getOrCreateWishlist(mockCompanyId, {
        name: 'Birthday Wishlist',
      });

      expect(prisma.wishlist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Birthday Wishlist',
          }),
        }),
      );
    });

    it('should create public wishlist with shared URL when isPublic is true', async () => {
      prisma.wishlist.findFirst.mockResolvedValue(null);
      const newWishlist = createMockWishlist({
        isPublic: true,
        sharedUrl: mockSharedUrl,
        items: [],
      });
      prisma.wishlist.create.mockResolvedValue(newWishlist);

      await service.getOrCreateWishlist(mockCompanyId, {
        isPublic: true,
      });

      expect(prisma.wishlist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPublic: true,
            sharedUrl: expect.any(String),
          }),
        }),
      );
    });

    it('should not generate session token for customer wishlists', async () => {
      prisma.wishlist.findFirst.mockResolvedValue(null);
      const newWishlist = createMockWishlist({
        customerId: mockCustomerId,
        sessionToken: null,
        items: [],
      });
      prisma.wishlist.create.mockResolvedValue(newWishlist);

      await service.getOrCreateWishlist(mockCompanyId, {
        customerId: mockCustomerId,
      });

      expect(prisma.wishlist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: mockCustomerId,
            sessionToken: null,
          }),
        }),
      );
    });

    it('should create wishlist with site ID', async () => {
      prisma.wishlist.findFirst.mockResolvedValue(null);
      const newWishlist = createMockWishlist({ siteId: 'site-001', items: [] });
      prisma.wishlist.create.mockResolvedValue(newWishlist);

      await service.getOrCreateWishlist(mockCompanyId, {
        siteId: 'site-001',
      });

      expect(prisma.wishlist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            siteId: 'site-001',
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getWishlistById TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getWishlistById', () => {
    it('should return wishlist when found', async () => {
      const wishlist = createMockWishlist();
      prisma.wishlist.findUnique.mockResolvedValue(wishlist);

      const result = await service.getWishlistById(mockWishlistId);

      expect(result.id).toBe(mockWishlistId);
      expect(result.name).toBe('My Wishlist');
      expect(result.items).toHaveLength(1);
    });

    it('should throw NotFoundException when wishlist not found', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);

      await expect(service.getWishlistById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getWishlistById('nonexistent')).rejects.toThrow(
        'Wishlist not found',
      );
    });

    it('should include items with product data', async () => {
      const wishlist = createMockWishlist();
      prisma.wishlist.findUnique.mockResolvedValue(wishlist);

      const result = await service.getWishlistById(mockWishlistId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productSnapshot.name).toBe('Test Product');
    });

    it('should return itemCount correctly', async () => {
      const items = [
        createMockWishlistItem({ id: 'item-1' }),
        createMockWishlistItem({ id: 'item-2' }),
        createMockWishlistItem({ id: 'item-3' }),
      ];
      const wishlist = createMockWishlist({ items, itemCount: 3 });
      prisma.wishlist.findUnique.mockResolvedValue(wishlist);

      const result = await service.getWishlistById(mockWishlistId);

      expect(result.itemCount).toBe(3);
      expect(result.items).toHaveLength(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getWishlistBySessionToken TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getWishlistBySessionToken', () => {
    it('should return wishlist when found', async () => {
      const wishlist = createMockWishlist();
      prisma.wishlist.findFirst.mockResolvedValue(wishlist);

      const result = await service.getWishlistBySessionToken(
        mockSessionToken,
        mockCompanyId,
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockWishlistId);
      expect(prisma.wishlist.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sessionToken: mockSessionToken,
            companyId: mockCompanyId,
          },
        }),
      );
    });

    it('should return null when wishlist not found', async () => {
      prisma.wishlist.findFirst.mockResolvedValue(null);

      const result = await service.getWishlistBySessionToken(
        'nonexistent',
        mockCompanyId,
      );

      expect(result).toBeNull();
    });

    it('should filter by both session token and company ID', async () => {
      prisma.wishlist.findFirst.mockResolvedValue(null);

      await service.getWishlistBySessionToken(mockSessionToken, mockCompanyId);

      expect(prisma.wishlist.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sessionToken: mockSessionToken,
            companyId: mockCompanyId,
          },
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getWishlistByCustomerId TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getWishlistByCustomerId', () => {
    it('should return wishlist when found', async () => {
      const wishlist = createMockWishlist({ customerId: mockCustomerId });
      prisma.wishlist.findFirst.mockResolvedValue(wishlist);

      const result = await service.getWishlistByCustomerId(
        mockCustomerId,
        mockCompanyId,
      );

      expect(result).not.toBeNull();
      expect(result?.customerId).toBe(mockCustomerId);
    });

    it('should return null when wishlist not found', async () => {
      prisma.wishlist.findFirst.mockResolvedValue(null);

      const result = await service.getWishlistByCustomerId(
        'nonexistent',
        mockCompanyId,
      );

      expect(result).toBeNull();
    });

    it('should filter by both customer ID and company ID', async () => {
      prisma.wishlist.findFirst.mockResolvedValue(null);

      await service.getWishlistByCustomerId(mockCustomerId, mockCompanyId);

      expect(prisma.wishlist.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            customerId: mockCustomerId,
            companyId: mockCompanyId,
          },
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getWishlistBySharedUrl TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getWishlistBySharedUrl', () => {
    it('should return public wishlist when found', async () => {
      const wishlist = createMockWishlist({
        isPublic: true,
        sharedUrl: mockSharedUrl,
      });
      prisma.wishlist.findFirst.mockResolvedValue(wishlist);

      const result = await service.getWishlistBySharedUrl(mockSharedUrl);

      expect(result).not.toBeNull();
      expect(result?.sharedUrl).toBe(mockSharedUrl);
      expect(result?.isPublic).toBe(true);
    });

    it('should return null when wishlist not found', async () => {
      prisma.wishlist.findFirst.mockResolvedValue(null);

      const result = await service.getWishlistBySharedUrl('nonexistent');

      expect(result).toBeNull();
    });

    it('should only search for public wishlists', async () => {
      prisma.wishlist.findFirst.mockResolvedValue(null);

      await service.getWishlistBySharedUrl(mockSharedUrl);

      expect(prisma.wishlist.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sharedUrl: mockSharedUrl,
            isPublic: true,
          },
        }),
      );
    });

    it('should return null for private wishlist with matching URL', async () => {
      // Even if a wishlist has a sharedUrl, if isPublic is false it should not be found
      prisma.wishlist.findFirst.mockResolvedValue(null);

      const result = await service.getWishlistBySharedUrl(mockSharedUrl);

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // addItem TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('addItem', () => {
    beforeEach(() => {
      prisma.wishlist.findUnique.mockResolvedValue(
        createMockWishlist({ items: [] }),
      );
      prisma.product.findUnique.mockResolvedValue(createMockProduct());
      prisma.wishlistItem.findFirst.mockResolvedValue(null);
      prisma.wishlistItem.count.mockResolvedValue(1);
      prisma.wishlist.update.mockResolvedValue(createMockWishlist());
    });

    it('should add new item to wishlist', async () => {
      prisma.wishlistItem.create.mockResolvedValue(createMockWishlistItem());

      const result = await service.addItem(mockWishlistId, {
        productId: mockProductId,
      });

      expect(result).toBeDefined();
      expect(prisma.wishlistItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            wishlistId: mockWishlistId,
            productId: mockProductId,
          }),
        }),
      );
    });

    it('should throw NotFoundException when wishlist not found', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem(mockWishlistId, { productId: mockProductId }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.addItem(mockWishlistId, { productId: mockProductId }),
      ).rejects.toThrow('Wishlist not found');
    });

    it('should throw NotFoundException when product not found', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(createMockWishlist());
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem(mockWishlistId, { productId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.addItem(mockWishlistId, { productId: 'nonexistent' }),
      ).rejects.toThrow('Product not found');
    });

    it('should throw ForbiddenException when product belongs to different company', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(createMockWishlist());
      prisma.product.findUnique.mockResolvedValue(
        createMockProduct({ companyId: 'other-company' }),
      );

      await expect(
        service.addItem(mockWishlistId, { productId: mockProductId }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.addItem(mockWishlistId, { productId: mockProductId }),
      ).rejects.toThrow('Product does not belong to this company');
    });

    it('should throw BadRequestException when product is not active', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(createMockWishlist());
      prisma.product.findUnique.mockResolvedValue(
        createMockProduct({ status: 'INACTIVE' }),
      );

      await expect(
        service.addItem(mockWishlistId, { productId: mockProductId }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addItem(mockWishlistId, { productId: mockProductId }),
      ).rejects.toThrow('Product is not available');
    });

    it('should throw BadRequestException when product is not visible', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(createMockWishlist());
      prisma.product.findUnique.mockResolvedValue(
        createMockProduct({ isVisible: false }),
      );

      await expect(
        service.addItem(mockWishlistId, { productId: mockProductId }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addItem(mockWishlistId, { productId: mockProductId }),
      ).rejects.toThrow('Product is not available');
    });

    it('should update existing item priority and notes if item already exists', async () => {
      const existingItem = createMockWishlistItem({ priority: 100, notes: null });
      prisma.wishlistItem.findFirst.mockResolvedValue(existingItem);
      prisma.wishlistItem.update.mockResolvedValue({
        ...existingItem,
        priority: 50,
        notes: 'Updated notes',
      });

      await service.addItem(mockWishlistId, {
        productId: mockProductId,
        priority: 50,
        notes: 'Updated notes',
      });

      expect(prisma.wishlistItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockItemId },
          data: expect.objectContaining({
            priority: 50,
            notes: 'Updated notes',
          }),
        }),
      );
      expect(prisma.wishlistItem.create).not.toHaveBeenCalled();
    });

    it('should store product snapshot when adding item', async () => {
      prisma.wishlistItem.create.mockResolvedValue(createMockWishlistItem());

      await service.addItem(mockWishlistId, {
        productId: mockProductId,
      });

      expect(prisma.wishlistItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productSnapshot: expect.objectContaining({
              name: 'Test Product',
              sku: 'TEST-001',
              image: 'https://example.com/image.jpg',
              price: 29.99,
              compareAtPrice: 39.99,
            }),
          }),
        }),
      );
    });

    it('should add item with variant', async () => {
      prisma.wishlistItem.create.mockResolvedValue(
        createMockWishlistItem({ variantId: 'variant-001' }),
      );

      await service.addItem(mockWishlistId, {
        productId: mockProductId,
        variantId: 'variant-001',
      });

      expect(prisma.wishlistItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            variantId: 'variant-001',
          }),
        }),
      );
    });

    it('should add item with priority', async () => {
      prisma.wishlistItem.create.mockResolvedValue(
        createMockWishlistItem({ priority: 1 }),
      );

      await service.addItem(mockWishlistId, {
        productId: mockProductId,
        priority: 1,
      });

      expect(prisma.wishlistItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 1,
          }),
        }),
      );
    });

    it('should add item with notes', async () => {
      prisma.wishlistItem.create.mockResolvedValue(
        createMockWishlistItem({ notes: 'Want this in blue!' }),
      );

      await service.addItem(mockWishlistId, {
        productId: mockProductId,
        notes: 'Want this in blue!',
      });

      expect(prisma.wishlistItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'Want this in blue!',
          }),
        }),
      );
    });

    it('should use default priority of 100 when not provided', async () => {
      prisma.wishlistItem.create.mockResolvedValue(createMockWishlistItem());

      await service.addItem(mockWishlistId, {
        productId: mockProductId,
      });

      expect(prisma.wishlistItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 100,
          }),
        }),
      );
    });

    it('should update item count after adding item', async () => {
      prisma.wishlistItem.create.mockResolvedValue(createMockWishlistItem());
      prisma.wishlistItem.count.mockResolvedValue(2);

      await service.addItem(mockWishlistId, {
        productId: mockProductId,
      });

      expect(prisma.wishlist.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockWishlistId },
          data: { itemCount: 2 },
        }),
      );
    });

    it('should create audit log when actorId is provided', async () => {
      prisma.wishlistItem.create.mockResolvedValue(createMockWishlistItem());

      await service.addItem(
        mockWishlistId,
        { productId: mockProductId },
        mockUserId,
      );

      expect(auditLogService.log).toHaveBeenCalledWith(
        AuditAction.CREATE,
        'WishlistItem',
        mockWishlistId,
        expect.objectContaining({
          userId: mockUserId,
          changes: expect.objectContaining({
            productId: expect.any(Object),
          }),
        }),
      );
    });

    it('should not create audit log when actorId is not provided', async () => {
      prisma.wishlistItem.create.mockResolvedValue(createMockWishlistItem());

      await service.addItem(mockWishlistId, { productId: mockProductId });

      expect(auditLogService.log).not.toHaveBeenCalled();
    });

    it('should handle product with no images', async () => {
      prisma.product.findUnique.mockResolvedValue(
        createMockProduct({ images: [] }),
      );
      prisma.wishlistItem.create.mockResolvedValue(createMockWishlistItem());

      await service.addItem(mockWishlistId, {
        productId: mockProductId,
      });

      expect(prisma.wishlistItem.create).toHaveBeenCalledWith(
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
      prisma.product.findUnique.mockResolvedValue(
        createMockProduct({ images: null }),
      );
      prisma.wishlistItem.create.mockResolvedValue(createMockWishlistItem());

      await service.addItem(mockWishlistId, {
        productId: mockProductId,
      });

      expect(prisma.wishlistItem.create).toHaveBeenCalled();
    });

    it('should handle product without compareAtPrice', async () => {
      prisma.product.findUnique.mockResolvedValue(
        createMockProduct({ compareAtPrice: null }),
      );
      prisma.wishlistItem.create.mockResolvedValue(createMockWishlistItem());

      await service.addItem(mockWishlistId, {
        productId: mockProductId,
      });

      expect(prisma.wishlistItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productSnapshot: expect.objectContaining({
              compareAtPrice: undefined,
            }),
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateItem TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('updateItem', () => {
    beforeEach(() => {
      prisma.wishlistItem.findFirst.mockResolvedValue(createMockWishlistItem());
      prisma.wishlist.findUnique.mockResolvedValue(createMockWishlist());
    });

    it('should update item priority', async () => {
      prisma.wishlistItem.update.mockResolvedValue(
        createMockWishlistItem({ priority: 1 }),
      );

      await service.updateItem(mockWishlistId, mockItemId, { priority: 1 });

      expect(prisma.wishlistItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockItemId },
          data: expect.objectContaining({
            priority: 1,
          }),
        }),
      );
    });

    it('should update item notes', async () => {
      prisma.wishlistItem.update.mockResolvedValue(
        createMockWishlistItem({ notes: 'Updated notes' }),
      );

      await service.updateItem(mockWishlistId, mockItemId, {
        notes: 'Updated notes',
      });

      expect(prisma.wishlistItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockItemId },
          data: expect.objectContaining({
            notes: 'Updated notes',
          }),
        }),
      );
    });

    it('should throw NotFoundException when item not found', async () => {
      prisma.wishlistItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateItem(mockWishlistId, 'nonexistent', { priority: 1 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateItem(mockWishlistId, 'nonexistent', { priority: 1 }),
      ).rejects.toThrow('Wishlist item not found');
    });

    it('should only update item belonging to specified wishlist', async () => {
      prisma.wishlistItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateItem('other-wishlist', mockItemId, { priority: 1 }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.wishlistItem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockItemId, wishlistId: 'other-wishlist' },
        }),
      );
    });

    it('should update both priority and notes when provided', async () => {
      prisma.wishlistItem.update.mockResolvedValue(
        createMockWishlistItem({ priority: 5, notes: 'New notes' }),
      );

      await service.updateItem(mockWishlistId, mockItemId, {
        priority: 5,
        notes: 'New notes',
      });

      expect(prisma.wishlistItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 5,
            notes: 'New notes',
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
      prisma.wishlistItem.findFirst.mockResolvedValue(createMockWishlistItem());
      prisma.wishlist.findUnique.mockResolvedValue(
        createMockWishlist({ items: [] }),
      );
    });

    it('should remove item from wishlist', async () => {
      prisma.wishlistItem.delete.mockResolvedValue(createMockWishlistItem());

      await service.removeItem(mockWishlistId, mockItemId);

      expect(prisma.wishlistItem.delete).toHaveBeenCalledWith({
        where: { id: mockItemId },
      });
    });

    it('should throw NotFoundException when item not found', async () => {
      prisma.wishlistItem.findFirst.mockResolvedValue(null);

      await expect(
        service.removeItem(mockWishlistId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.removeItem(mockWishlistId, 'nonexistent'),
      ).rejects.toThrow('Wishlist item not found');
    });

    it('should only remove item belonging to specified wishlist', async () => {
      prisma.wishlistItem.findFirst.mockResolvedValue(null);

      await expect(
        service.removeItem('other-wishlist', mockItemId),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.wishlistItem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockItemId, wishlistId: 'other-wishlist' },
        }),
      );
    });

    it('should return updated wishlist after removal', async () => {
      prisma.wishlistItem.delete.mockResolvedValue(createMockWishlistItem());
      const updatedWishlist = createMockWishlist({ items: [], itemCount: 0 });
      prisma.wishlist.findUnique.mockResolvedValue(updatedWishlist);

      const result = await service.removeItem(mockWishlistId, mockItemId);

      expect(result.items).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // updateWishlist TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('updateWishlist', () => {
    beforeEach(() => {
      prisma.wishlist.findUnique.mockResolvedValue(createMockWishlist());
      prisma.wishlist.update.mockResolvedValue(createMockWishlist());
    });

    it('should update wishlist name', async () => {
      // First call checks wishlist exists, second returns updated wishlist
      prisma.wishlist.findUnique
        .mockResolvedValueOnce(createMockWishlist())
        .mockResolvedValueOnce(createMockWishlist({ name: 'New Name' }));
      prisma.wishlist.update.mockResolvedValue(
        createMockWishlist({ name: 'New Name' }),
      );

      await service.updateWishlist(mockWishlistId, { name: 'New Name' });

      expect(prisma.wishlist.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockWishlistId },
          data: expect.objectContaining({
            name: 'New Name',
          }),
        }),
      );
    });

    it('should update wishlist to public and generate shared URL', async () => {
      const privateWishlist = createMockWishlist({
        isPublic: false,
        sharedUrl: null,
      });
      // First call checks wishlist exists, second returns updated wishlist
      prisma.wishlist.findUnique
        .mockResolvedValueOnce(privateWishlist)
        .mockResolvedValueOnce(createMockWishlist({ isPublic: true, sharedUrl: mockSharedUrl }));
      prisma.wishlist.update.mockResolvedValue(
        createMockWishlist({ isPublic: true, sharedUrl: mockSharedUrl }),
      );

      await service.updateWishlist(mockWishlistId, { isPublic: true });

      expect(prisma.wishlist.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPublic: true,
            sharedUrl: expect.any(String),
          }),
        }),
      );
    });

    it('should keep existing shared URL when making public again', async () => {
      const wishlistWithUrl = createMockWishlist({
        isPublic: false,
        sharedUrl: mockSharedUrl,
      });
      // First call checks wishlist exists, second returns updated wishlist
      prisma.wishlist.findUnique
        .mockResolvedValueOnce(wishlistWithUrl)
        .mockResolvedValueOnce(createMockWishlist({ isPublic: true, sharedUrl: mockSharedUrl }));
      prisma.wishlist.update.mockResolvedValue(
        createMockWishlist({ isPublic: true, sharedUrl: mockSharedUrl }),
      );

      const result = await service.updateWishlist(mockWishlistId, { isPublic: true });

      // When sharedUrl already exists, it should NOT be included in update data
      // (preserves existing URL by not touching it)
      expect(prisma.wishlist.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isPublic: true },
        }),
      );
      // Result should still have the shared URL from the second findUnique call
      expect(result.sharedUrl).toBe(mockSharedUrl);
    });

    it('should throw NotFoundException when wishlist not found', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);

      await expect(
        service.updateWishlist('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateWishlist('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow('Wishlist not found');
    });

    it('should verify wishlist exists before updating', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);

      await expect(
        service.updateWishlist(mockWishlistId, { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.wishlist.findUnique).toHaveBeenCalledWith({
        where: { id: mockWishlistId },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // clearWishlist TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('clearWishlist', () => {
    beforeEach(() => {
      prisma.wishlist.findUnique.mockResolvedValue(createMockWishlist());
      prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 2 });
      prisma.wishlist.update.mockResolvedValue(createMockWishlist({ items: [], itemCount: 0 }));
    });

    it('should remove all items from wishlist', async () => {
      // First call returns existing wishlist, second returns cleared wishlist
      prisma.wishlist.findUnique
        .mockResolvedValueOnce(createMockWishlist())
        .mockResolvedValueOnce(createMockWishlist({ items: [], itemCount: 0 }));

      const result = await service.clearWishlist(mockWishlistId);

      expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
        where: { wishlistId: mockWishlistId },
      });
      expect(result.items).toHaveLength(0);
    });

    it('should throw NotFoundException when wishlist not found', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);

      await expect(service.clearWishlist('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.clearWishlist('nonexistent')).rejects.toThrow(
        'Wishlist not found',
      );
    });

    it('should handle clearing already empty wishlist', async () => {
      prisma.wishlist.findUnique
        .mockResolvedValueOnce(createMockWishlist({ items: [], itemCount: 0 }))
        .mockResolvedValueOnce(createMockWishlist({ items: [], itemCount: 0 }));
      prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.clearWishlist(mockWishlistId);

      expect(result.items).toHaveLength(0);
      expect(prisma.wishlistItem.deleteMany).toHaveBeenCalled();
    });

    it('should verify wishlist exists before clearing', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);

      await expect(service.clearWishlist(mockWishlistId)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.wishlist.findUnique).toHaveBeenCalledWith({
        where: { id: mockWishlistId },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // setPublic (shareWishlist) TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('shareWishlist', () => {
    beforeEach(() => {
      prisma.wishlist.findUnique.mockResolvedValue(createMockWishlist());
      prisma.wishlist.update.mockResolvedValue(createMockWishlist());
    });

    it('should make wishlist public', async () => {
      // First call checks wishlist exists, second returns updated wishlist
      prisma.wishlist.findUnique
        .mockResolvedValueOnce(createMockWishlist({ isPublic: false }))
        .mockResolvedValueOnce(createMockWishlist({ isPublic: true, sharedUrl: mockSharedUrl }));
      prisma.wishlist.update.mockResolvedValue(
        createMockWishlist({ isPublic: true, sharedUrl: mockSharedUrl }),
      );

      const result = await service.shareWishlist(mockWishlistId, true);

      expect(result.isPublic).toBe(true);
    });

    it('should make wishlist private', async () => {
      // First call checks wishlist exists, second returns updated wishlist
      prisma.wishlist.findUnique
        .mockResolvedValueOnce(createMockWishlist({ isPublic: true }))
        .mockResolvedValueOnce(createMockWishlist({ isPublic: false }));
      prisma.wishlist.update.mockResolvedValue(
        createMockWishlist({ isPublic: false }),
      );

      const result = await service.shareWishlist(mockWishlistId, false);

      expect(result.isPublic).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // mergeWishlists TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('mergeWishlists', () => {
    const sourceWishlistId = 'source-wishlist-123';
    const targetWishlistId = 'target-wishlist-456';
    const sourceItem = createMockWishlistItem({ id: 'source-item-1' });

    beforeEach(() => {
      // Service uses findUnique to fetch wishlists
      prisma.wishlist.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceWishlistId) {
          return Promise.resolve(
            createMockWishlist({
              id: sourceWishlistId,
              items: [sourceItem],
            }),
          );
        }
        if (where.id === targetWishlistId) {
          return Promise.resolve(
            createMockWishlist({
              id: targetWishlistId,
              items: [],
            }),
          );
        }
        return Promise.resolve(null);
      });
      // Service uses findFirst to check for existing items
      prisma.wishlistItem.findFirst.mockResolvedValue(null);
      // Service creates new items in target
      prisma.wishlistItem.create.mockResolvedValue(createMockWishlistItem());
      // Service hard deletes source wishlist
      prisma.wishlist.delete.mockResolvedValue(createMockWishlist({ id: sourceWishlistId }));
      // Service updates item count
      prisma.wishlist.update.mockResolvedValue(createMockWishlist({ id: targetWishlistId }));
      prisma.wishlistItem.count.mockResolvedValue(1);
    });

    it('should create items in target wishlist', async () => {
      const result = await service.mergeWishlists(
        sourceWishlistId,
        targetWishlistId,
      );

      expect(prisma.wishlistItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            wishlistId: targetWishlistId,
            productId: sourceItem.productId,
          }),
        }),
      );
      expect(result.id).toBe(targetWishlistId);
    });

    it('should hard delete source wishlist after merge', async () => {
      await service.mergeWishlists(sourceWishlistId, targetWishlistId);

      expect(prisma.wishlist.delete).toHaveBeenCalledWith({
        where: { id: sourceWishlistId },
      });
    });

    it('should throw NotFoundException when source wishlist not found', async () => {
      prisma.wishlist.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceWishlistId) {
          return Promise.resolve(null);
        }
        return Promise.resolve(createMockWishlist({ id: targetWishlistId }));
      });

      await expect(
        service.mergeWishlists(sourceWishlistId, targetWishlistId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.mergeWishlists(sourceWishlistId, targetWishlistId),
      ).rejects.toThrow('Source wishlist not found');
    });

    it('should throw NotFoundException when target wishlist not found', async () => {
      prisma.wishlist.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceWishlistId) {
          return Promise.resolve(
            createMockWishlist({ id: sourceWishlistId, items: [] }),
          );
        }
        return Promise.resolve(null);
      });

      await expect(
        service.mergeWishlists(sourceWishlistId, targetWishlistId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.mergeWishlists(sourceWishlistId, targetWishlistId),
      ).rejects.toThrow('Target wishlist not found');
    });

    it('should skip items that already exist in target wishlist', async () => {
      const duplicateProductId = 'product-duplicate';
      prisma.wishlist.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceWishlistId) {
          return Promise.resolve(
            createMockWishlist({
              id: sourceWishlistId,
              items: [
                createMockWishlistItem({
                  id: 'source-item-1',
                  productId: duplicateProductId,
                  variantId: null,
                }),
              ],
            }),
          );
        }
        if (where.id === targetWishlistId) {
          return Promise.resolve(
            createMockWishlist({
              id: targetWishlistId,
              items: [],
            }),
          );
        }
        return Promise.resolve(null);
      });
      // Item already exists in target
      prisma.wishlistItem.findFirst.mockResolvedValue(
        createMockWishlistItem({ productId: duplicateProductId }),
      );

      await service.mergeWishlists(sourceWishlistId, targetWishlistId);

      // Should not create item since it already exists in target
      expect(prisma.wishlistItem.create).not.toHaveBeenCalled();
    });

    it('should create items with different variants even if product exists in target', async () => {
      const sharedProductId = 'product-shared';
      prisma.wishlist.findUnique.mockImplementation(({ where }) => {
        if (where.id === sourceWishlistId) {
          return Promise.resolve(
            createMockWishlist({
              id: sourceWishlistId,
              items: [
                createMockWishlistItem({
                  id: 'source-item-1',
                  productId: sharedProductId,
                  variantId: 'variant-blue',
                }),
              ],
            }),
          );
        }
        if (where.id === targetWishlistId) {
          return Promise.resolve(
            createMockWishlist({
              id: targetWishlistId,
              items: [],
            }),
          );
        }
        return Promise.resolve(null);
      });
      // Different variant, so item doesn't exist
      prisma.wishlistItem.findFirst.mockResolvedValue(null);

      await service.mergeWishlists(sourceWishlistId, targetWishlistId);

      expect(prisma.wishlistItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            wishlistId: targetWishlistId,
            productId: sharedProductId,
            variantId: 'variant-blue',
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // reorderItems TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('reorderItems', () => {
    const threeItems = [
      createMockWishlistItem({ id: 'item-1', priority: 100 }),
      createMockWishlistItem({ id: 'item-2', priority: 101 }),
      createMockWishlistItem({ id: 'item-3', priority: 102 }),
    ];

    beforeEach(() => {
      prisma.wishlist.findFirst.mockResolvedValue(createMockWishlist({ items: threeItems }));
      prisma.wishlist.findUnique.mockResolvedValue(createMockWishlist({ items: threeItems }));
      prisma.wishlistItem.update.mockResolvedValue(createMockWishlistItem());
    });

    it('should update priority based on order in array', async () => {
      const itemIds = ['item-3', 'item-1', 'item-2'];

      await service.reorderItems(mockWishlistId, itemIds);

      expect(prisma.wishlistItem.update).toHaveBeenCalledTimes(3);
      expect(prisma.wishlistItem.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { id: 'item-3' },
          data: { priority: 1 },
        }),
      );
      expect(prisma.wishlistItem.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { id: 'item-1' },
          data: { priority: 2 },
        }),
      );
      expect(prisma.wishlistItem.update).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: { id: 'item-2' },
          data: { priority: 3 },
        }),
      );
    });

    it('should throw NotFoundException when wishlist not found', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);

      await expect(
        service.reorderItems('nonexistent', ['item-1', 'item-2']),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.reorderItems('nonexistent', ['item-1', 'item-2']),
      ).rejects.toThrow('Wishlist not found');
    });

    it('should handle empty item array', async () => {
      await service.reorderItems(mockWishlistId, []);

      expect(prisma.wishlistItem.update).not.toHaveBeenCalled();
    });

    it('should handle single item array', async () => {
      await service.reorderItems(mockWishlistId, ['item-1']);

      expect(prisma.wishlistItem.update).toHaveBeenCalledTimes(1);
      expect(prisma.wishlistItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: { priority: 1 },
        }),
      );
    });

    it('should return updated wishlist after reordering', async () => {
      const reorderedItems = [
        createMockWishlistItem({ id: 'item-3', priority: 1 }),
        createMockWishlistItem({ id: 'item-1', priority: 2 }),
        createMockWishlistItem({ id: 'item-2', priority: 3 }),
      ];
      prisma.wishlist.findUnique.mockResolvedValue(
        createMockWishlist({ items: reorderedItems }),
      );

      const result = await service.reorderItems(mockWishlistId, [
        'item-3',
        'item-1',
        'item-2',
      ]);

      expect(result.items).toHaveLength(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getWishlistStats TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getWishlistStats', () => {
    it('should return correct statistics', async () => {
      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-12-01');
      const items = [
        createMockWishlistItem({
          id: 'item-1',
          addedAt: oldDate,
          productSnapshot: { price: 10 },
        }),
        createMockWishlistItem({
          id: 'item-2',
          addedAt: newDate,
          productSnapshot: { price: 20 },
        }),
      ];
      prisma.wishlist.findUnique.mockResolvedValue(
        createMockWishlist({ items, itemCount: 2 }),
      );

      const result = await service.getWishlistStats(mockWishlistId);

      expect(result.totalItems).toBe(2);
      expect(result.totalValue).toBe(30);
      expect(result.oldestItemDate).toEqual(oldDate);
      expect(result.newestItemDate).toEqual(newDate);
    });

    it('should throw NotFoundException when wishlist not found', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);

      await expect(service.getWishlistStats('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getWishlistStats('nonexistent')).rejects.toThrow(
        'Wishlist not found',
      );
    });

    it('should handle empty wishlist', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(
        createMockWishlist({ items: [], itemCount: 0 }),
      );

      const result = await service.getWishlistStats(mockWishlistId);

      expect(result.totalItems).toBe(0);
      expect(result.totalValue).toBe(0);
      expect(result.oldestItemDate).toBeUndefined();
      expect(result.newestItemDate).toBeUndefined();
    });

    it('should handle items without price in snapshot', async () => {
      const items = [
        createMockWishlistItem({
          id: 'item-1',
          productSnapshot: {},
        }),
        createMockWishlistItem({
          id: 'item-2',
          productSnapshot: { price: 50 },
        }),
      ];
      prisma.wishlist.findUnique.mockResolvedValue(
        createMockWishlist({ items, itemCount: 2 }),
      );

      const result = await service.getWishlistStats(mockWishlistId);

      expect(result.totalValue).toBe(50);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASES TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    describe('empty wishlist operations', () => {
      it('should handle adding to empty wishlist', async () => {
        prisma.wishlist.findUnique.mockResolvedValue(
          createMockWishlist({ items: [] }),
        );
        prisma.product.findUnique.mockResolvedValue(createMockProduct());
        prisma.wishlistItem.findFirst.mockResolvedValue(null);
        prisma.wishlistItem.create.mockResolvedValue(createMockWishlistItem());
        prisma.wishlistItem.count.mockResolvedValue(1);
        prisma.wishlist.update.mockResolvedValue(createMockWishlist());

        const result = await service.addItem(mockWishlistId, {
          productId: mockProductId,
        });

        expect(result).toBeDefined();
        expect(prisma.wishlistItem.create).toHaveBeenCalled();
      });
    });

    describe('duplicate item handling', () => {
      it('should update existing item with same variant instead of creating duplicate', async () => {
        const existingItem = createMockWishlistItem({
          variantId: 'variant-001',
          priority: 100,
        });
        prisma.wishlist.findUnique.mockResolvedValue(createMockWishlist());
        prisma.product.findUnique.mockResolvedValue(createMockProduct());
        prisma.wishlistItem.findFirst.mockResolvedValue(existingItem);
        prisma.wishlistItem.update.mockResolvedValue({
          ...existingItem,
          priority: 1,
        });

        await service.addItem(mockWishlistId, {
          productId: mockProductId,
          variantId: 'variant-001',
          priority: 1,
        });

        expect(prisma.wishlistItem.update).toHaveBeenCalled();
        expect(prisma.wishlistItem.create).not.toHaveBeenCalled();
      });

      it('should create new item for same product with different variant', async () => {
        prisma.wishlist.findUnique.mockResolvedValue(createMockWishlist());
        prisma.product.findUnique.mockResolvedValue(createMockProduct());
        prisma.wishlistItem.findFirst.mockResolvedValue(null); // No existing item with this variant
        prisma.wishlistItem.create.mockResolvedValue(
          createMockWishlistItem({ variantId: 'variant-002' }),
        );
        prisma.wishlistItem.count.mockResolvedValue(2);
        prisma.wishlist.update.mockResolvedValue(createMockWishlist());

        await service.addItem(mockWishlistId, {
          productId: mockProductId,
          variantId: 'variant-002',
        });

        expect(prisma.wishlistItem.create).toHaveBeenCalled();
      });
    });

    describe('data transformation', () => {
      it('should correctly transform wishlist to WishlistData', async () => {
        const wishlist = createMockWishlist({
          siteId: 'site-001',
          customerId: mockCustomerId,
          isPublic: true,
          sharedUrl: mockSharedUrl,
        });
        prisma.wishlist.findUnique.mockResolvedValue(wishlist);

        const result = await service.getWishlistById(mockWishlistId);

        expect(result.id).toBe(mockWishlistId);
        expect(result.companyId).toBe(mockCompanyId);
        expect(result.siteId).toBe('site-001');
        expect(result.customerId).toBe(mockCustomerId);
        expect(result.name).toBe('My Wishlist');
        expect(result.isPublic).toBe(true);
        expect(result.sharedUrl).toBe(mockSharedUrl);
        expect(result.items).toHaveLength(1);
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
      });

      it('should handle null optional fields', async () => {
        const wishlist = createMockWishlist({
          siteId: null,
          customerId: null,
          sharedUrl: null,
        });
        prisma.wishlist.findUnique.mockResolvedValue(wishlist);

        const result = await service.getWishlistById(mockWishlistId);

        expect(result.siteId).toBeUndefined();
        expect(result.customerId).toBeUndefined();
        expect(result.sharedUrl).toBeUndefined();
      });
    });

    describe('decimal precision handling', () => {
      it('should handle prices with decimal precision in snapshots', async () => {
        prisma.wishlist.findUnique.mockResolvedValue(
          createMockWishlist({ items: [] }),
        );
        prisma.product.findUnique.mockResolvedValue(
          createMockProduct({ price: 19.99, compareAtPrice: 29.99 }),
        );
        prisma.wishlistItem.findFirst.mockResolvedValue(null);
        prisma.wishlistItem.create.mockResolvedValue(createMockWishlistItem());
        prisma.wishlistItem.count.mockResolvedValue(1);
        prisma.wishlist.update.mockResolvedValue(createMockWishlist());

        await service.addItem(mockWishlistId, {
          productId: mockProductId,
        });

        expect(prisma.wishlistItem.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              productSnapshot: expect.objectContaining({
                price: 19.99,
                compareAtPrice: 29.99,
              }),
            }),
          }),
        );
      });
    });

    describe('security validations', () => {
      it('should validate cross-company product access', async () => {
        prisma.wishlist.findUnique.mockResolvedValue(
          createMockWishlist({ companyId: 'company-A' }),
        );
        prisma.product.findUnique.mockResolvedValue(
          createMockProduct({ companyId: 'company-B' }),
        );

        await expect(
          service.addItem(mockWishlistId, { productId: mockProductId }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should prevent adding inactive products', async () => {
        prisma.wishlist.findUnique.mockResolvedValue(createMockWishlist());
        prisma.product.findUnique.mockResolvedValue(
          createMockProduct({ status: 'DRAFT' }),
        );

        await expect(
          service.addItem(mockWishlistId, { productId: mockProductId }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should prevent adding hidden products', async () => {
        prisma.wishlist.findUnique.mockResolvedValue(createMockWishlist());
        prisma.product.findUnique.mockResolvedValue(
          createMockProduct({ isVisible: false }),
        );

        await expect(
          service.addItem(mockWishlistId, { productId: mockProductId }),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });
});
