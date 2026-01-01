/**
 * Wishlist Controller Tests
 * Testing API endpoints for wishlist management (authenticated and public)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { WishlistController, PublicWishlistController } from './wishlist.controller';
import { WishlistService } from '../services/wishlist.service';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ScopeType } from '@prisma/client';
import { WishlistData, WishlistItemData, WishlistStats } from '../types/wishlist.types';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('WishlistController', () => {
  let controller: WishlistController;
  let wishlistService: jest.Mocked<WishlistService>;

  const mockCompanyId = 'company-123';
  const mockClientId = 'client-456';
  const mockWishlistId = 'wishlist-789';
  const mockProductId = 'product-001';
  const mockItemId = 'item-001';

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    sub: 'user-1',
    email: 'user@company.com',
    scopeType: 'COMPANY' as ScopeType,
    scopeId: mockCompanyId,
    companyId: mockCompanyId,
    clientId: mockClientId,
    organizationId: 'org-1',
    role: 'ADMIN',
  };

  const mockWishlistItem: WishlistItemData = {
    id: mockItemId,
    wishlistId: mockWishlistId,
    productId: mockProductId,
    productSnapshot: {
      name: 'Test Product',
      sku: 'SKU-001',
      price: 50,
      compareAtPrice: 75,
    },
    priority: 1,
    notes: 'Great product',
    addedAt: new Date(),
  };

  const mockWishlistData: WishlistData = {
    id: mockWishlistId,
    companyId: mockCompanyId,
    customerId: mockUser.id,
    sessionToken: undefined,
    name: 'My Wishlist',
    isPublic: false,
    sharedUrl: undefined,
    items: [mockWishlistItem],
    itemCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEmptyWishlist: WishlistData = {
    ...mockWishlistData,
    items: [],
    itemCount: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WishlistController],
      providers: [
        {
          provide: WishlistService,
          useValue: {
            getWishlistByCustomerId: jest.fn(),
            getWishlistById: jest.fn(),
            getWishlistBySessionToken: jest.fn(),
            getWishlistBySharedUrl: jest.fn(),
            getOrCreateWishlist: jest.fn(),
            addItem: jest.fn(),
            updateItem: jest.fn(),
            removeItem: jest.fn(),
            updateWishlist: jest.fn(),
            clearWishlist: jest.fn(),
            shareWishlist: jest.fn(),
            mergeWishlists: jest.fn(),
            reorderItems: jest.fn(),
            getWishlistStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WishlistController>(WishlistController);
    wishlistService = module.get(WishlistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWishlist', () => {
    it('should return existing wishlist for user', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlistData);

      const result = await controller.getWishlist(mockUser, {});

      expect(result).toEqual(mockWishlistData);
      expect(wishlistService.getWishlistByCustomerId).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.companyId,
      );
    });

    it('should create new wishlist if none exists', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(null);
      wishlistService.getOrCreateWishlist.mockResolvedValue(mockEmptyWishlist);

      const result = await controller.getWishlist(mockUser, { siteId: 'site-1' });

      expect(result).toEqual(mockEmptyWishlist);
      expect(wishlistService.getOrCreateWishlist).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
        siteId: 'site-1',
      });
    });

    it('should handle query with sessionToken', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlistData);

      await controller.getWishlist(mockUser, { sessionToken: 'token-123' });

      expect(wishlistService.getWishlistByCustomerId).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.companyId,
      );
    });

    it('should pass siteId when creating new wishlist', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(null);
      wishlistService.getOrCreateWishlist.mockResolvedValue(mockEmptyWishlist);

      await controller.getWishlist(mockUser, { siteId: 'storefront-123' });

      expect(wishlistService.getOrCreateWishlist).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
        siteId: 'storefront-123',
      });
    });
  });

  describe('addItem', () => {
    const addDto = {
      productId: mockProductId,
      variantId: 'variant-1',
      priority: 5,
      notes: 'Birthday gift idea',
    };

    it('should add item to existing wishlist', async () => {
      wishlistService.getOrCreateWishlist.mockResolvedValue(mockWishlistData);
      wishlistService.addItem.mockResolvedValue(mockWishlistData);

      const result = await controller.addItem(mockUser, addDto);

      expect(result).toEqual(mockWishlistData);
      expect(wishlistService.getOrCreateWishlist).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
        siteId: undefined,
      });
      expect(wishlistService.addItem).toHaveBeenCalledWith(mockWishlistId, addDto, mockUser.id);
    });

    it('should add item with siteId query parameter', async () => {
      wishlistService.getOrCreateWishlist.mockResolvedValue(mockWishlistData);
      wishlistService.addItem.mockResolvedValue(mockWishlistData);

      await controller.addItem(mockUser, addDto, 'site-123');

      expect(wishlistService.getOrCreateWishlist).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
        siteId: 'site-123',
      });
    });

    it('should add item with minimal data', async () => {
      const minimalDto = { productId: mockProductId };
      wishlistService.getOrCreateWishlist.mockResolvedValue(mockWishlistData);
      wishlistService.addItem.mockResolvedValue(mockWishlistData);

      const result = await controller.addItem(mockUser, minimalDto);

      expect(result).toEqual(mockWishlistData);
      expect(wishlistService.addItem).toHaveBeenCalledWith(mockWishlistId, minimalDto, mockUser.id);
    });
  });

  describe('updateItem', () => {
    const updateDto = {
      priority: 10,
      notes: 'Updated notes',
    };

    it('should update wishlist item', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlistData);
      wishlistService.updateItem.mockResolvedValue(mockWishlistData);

      const result = await controller.updateItem(mockUser, mockItemId, updateDto);

      expect(result).toEqual(mockWishlistData);
      expect(wishlistService.updateItem).toHaveBeenCalledWith(
        mockWishlistId,
        mockItemId,
        updateDto,
        mockUser.id,
      );
    });

    it('should throw NotFoundException when wishlist not found', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(null);

      await expect(controller.updateItem(mockUser, mockItemId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.updateItem(mockUser, mockItemId, updateDto)).rejects.toThrow(
        'Wishlist not found',
      );
    });

    it('should update item priority only', async () => {
      const priorityOnlyDto = { priority: 1 };
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlistData);
      wishlistService.updateItem.mockResolvedValue(mockWishlistData);

      await controller.updateItem(mockUser, mockItemId, priorityOnlyDto);

      expect(wishlistService.updateItem).toHaveBeenCalledWith(
        mockWishlistId,
        mockItemId,
        priorityOnlyDto,
        mockUser.id,
      );
    });

    it('should update item notes only', async () => {
      const notesOnlyDto = { notes: 'New notes for this item' };
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlistData);
      wishlistService.updateItem.mockResolvedValue(mockWishlistData);

      await controller.updateItem(mockUser, mockItemId, notesOnlyDto);

      expect(wishlistService.updateItem).toHaveBeenCalledWith(
        mockWishlistId,
        mockItemId,
        notesOnlyDto,
        mockUser.id,
      );
    });
  });

  describe('removeItem', () => {
    it('should remove item from wishlist', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlistData);
      wishlistService.removeItem.mockResolvedValue(mockEmptyWishlist);

      const result = await controller.removeItem(mockUser, mockItemId);

      expect(result).toEqual(mockEmptyWishlist);
      expect(wishlistService.removeItem).toHaveBeenCalledWith(mockWishlistId, mockItemId, mockUser.id);
    });

    it('should throw NotFoundException when wishlist not found', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(null);

      await expect(controller.removeItem(mockUser, mockItemId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.removeItem(mockUser, mockItemId)).rejects.toThrow(
        'Wishlist not found',
      );
    });
  });

  describe('updateWishlist', () => {
    const updateDto = {
      name: 'Birthday Wishlist',
      isPublic: true,
    };

    it('should update wishlist name and visibility', async () => {
      const updatedWishlist = {
        ...mockWishlistData,
        name: 'Birthday Wishlist',
        isPublic: true,
        sharedUrl: 'abc123',
      };
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlistData);
      wishlistService.updateWishlist.mockResolvedValue(updatedWishlist);

      const result = await controller.updateWishlist(mockUser, updateDto);

      expect(result.name).toBe('Birthday Wishlist');
      expect(result.isPublic).toBe(true);
      expect(wishlistService.updateWishlist).toHaveBeenCalledWith(
        mockWishlistId,
        updateDto,
        mockUser.id,
      );
    });

    it('should throw NotFoundException when wishlist not found', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(null);

      await expect(controller.updateWishlist(mockUser, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.updateWishlist(mockUser, updateDto)).rejects.toThrow(
        'Wishlist not found',
      );
    });

    it('should update name only', async () => {
      const nameOnlyDto = { name: 'New Name' };
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlistData);
      wishlistService.updateWishlist.mockResolvedValue({ ...mockWishlistData, name: 'New Name' });

      await controller.updateWishlist(mockUser, nameOnlyDto);

      expect(wishlistService.updateWishlist).toHaveBeenCalledWith(
        mockWishlistId,
        nameOnlyDto,
        mockUser.id,
      );
    });
  });

  describe('clearWishlist', () => {
    it('should clear all items from wishlist', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlistData);
      wishlistService.clearWishlist.mockResolvedValue(mockEmptyWishlist);

      const result = await controller.clearWishlist(mockUser);

      expect(result).toEqual(mockEmptyWishlist);
      expect(result.items).toHaveLength(0);
      expect(wishlistService.clearWishlist).toHaveBeenCalledWith(mockWishlistId, mockUser.id);
    });

    it('should throw NotFoundException when wishlist not found', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(null);

      await expect(controller.clearWishlist(mockUser)).rejects.toThrow(NotFoundException);
      await expect(controller.clearWishlist(mockUser)).rejects.toThrow('Wishlist not found');
    });
  });

  describe('toggleSharing (shareWishlist)', () => {
    it('should enable public sharing', async () => {
      const sharedWishlist = {
        ...mockWishlistData,
        isPublic: true,
        sharedUrl: 'shared-url-123',
      };
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlistData);
      wishlistService.shareWishlist.mockResolvedValue(sharedWishlist);

      const result = await controller.toggleSharing(mockUser, { isPublic: true });

      expect(result.isPublic).toBe(true);
      expect(result.sharedUrl).toBe('shared-url-123');
      expect(wishlistService.shareWishlist).toHaveBeenCalledWith(
        mockWishlistId,
        true,
        mockUser.id,
      );
    });

    it('should disable public sharing', async () => {
      const privateWishlist = {
        ...mockWishlistData,
        isPublic: false,
        sharedUrl: undefined,
      };
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlistData);
      wishlistService.shareWishlist.mockResolvedValue(privateWishlist);

      const result = await controller.toggleSharing(mockUser, { isPublic: false });

      expect(result.isPublic).toBe(false);
      expect(wishlistService.shareWishlist).toHaveBeenCalledWith(
        mockWishlistId,
        false,
        mockUser.id,
      );
    });

    it('should throw NotFoundException when wishlist not found', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(null);

      await expect(controller.toggleSharing(mockUser, { isPublic: true })).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.toggleSharing(mockUser, { isPublic: true })).rejects.toThrow(
        'Wishlist not found',
      );
    });
  });

  describe('mergeWishlists', () => {
    const sourceWishlistId = 'guest-wishlist-123';

    it('should merge guest wishlist into user wishlist', async () => {
      const mergedWishlist: WishlistData = {
        ...mockWishlistData,
        items: [
          mockWishlistItem,
          {
            ...mockWishlistItem,
            id: 'item-002',
            productId: 'product-002',
            productSnapshot: {
              name: 'Another Product',
              sku: 'SKU-002',
              price: 25,
            },
          },
        ],
        itemCount: 2,
      };
      wishlistService.getOrCreateWishlist.mockResolvedValue(mockWishlistData);
      wishlistService.mergeWishlists.mockResolvedValue(mergedWishlist);

      const result = await controller.mergeWishlists(mockUser, sourceWishlistId);

      expect(result.items).toHaveLength(2);
      expect(wishlistService.mergeWishlists).toHaveBeenCalledWith(
        sourceWishlistId,
        mockWishlistId,
        mockUser.id,
      );
    });

    it('should create user wishlist if none exists and merge', async () => {
      wishlistService.getOrCreateWishlist.mockResolvedValue(mockEmptyWishlist);
      wishlistService.mergeWishlists.mockResolvedValue(mockWishlistData);

      const result = await controller.mergeWishlists(mockUser, sourceWishlistId);

      expect(result).toEqual(mockWishlistData);
      expect(wishlistService.getOrCreateWishlist).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
      });
    });
  });

  describe('getStats', () => {
    const mockStats: WishlistStats = {
      totalItems: 5,
      totalValue: 250,
      oldestItemDate: new Date('2024-01-01'),
      newestItemDate: new Date('2024-06-15'),
    };

    it('should return wishlist statistics', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlistData);
      wishlistService.getWishlistStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(mockUser);

      expect(result).toEqual(mockStats);
      expect(wishlistService.getWishlistStats).toHaveBeenCalledWith(mockWishlistId);
    });

    it('should return empty stats when no wishlist exists', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(null);

      const result = await controller.getStats(mockUser);

      expect(result).toEqual({
        totalItems: 0,
        totalValue: 0,
        oldestItemDate: null,
        newestItemDate: null,
      });
      expect(wishlistService.getWishlistStats).not.toHaveBeenCalled();
    });
  });
});

describe('PublicWishlistController', () => {
  let controller: PublicWishlistController;
  let wishlistService: jest.Mocked<WishlistService>;

  const mockCompanyId = 'company-123';
  const mockWishlistId = 'wishlist-789';
  const mockProductId = 'product-001';
  const mockItemId = 'item-001';
  const mockSessionToken = 'session-token-abc123';

  const mockWishlistItem: WishlistItemData = {
    id: mockItemId,
    wishlistId: mockWishlistId,
    productId: mockProductId,
    productSnapshot: {
      name: 'Test Product',
      sku: 'SKU-001',
      price: 50,
    },
    priority: 1,
    addedAt: new Date(),
  };

  const mockWishlistData: WishlistData = {
    id: mockWishlistId,
    companyId: mockCompanyId,
    sessionToken: mockSessionToken,
    name: 'Guest Wishlist',
    isPublic: false,
    items: [mockWishlistItem],
    itemCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const emptyWishlistResponse = {
    items: [],
    itemCount: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicWishlistController],
      providers: [
        {
          provide: WishlistService,
          useValue: {
            getWishlistBySessionToken: jest.fn(),
            getWishlistById: jest.fn(),
            getWishlistBySharedUrl: jest.fn(),
            getOrCreateWishlist: jest.fn(),
            addItem: jest.fn(),
            updateItem: jest.fn(),
            removeItem: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PublicWishlistController>(PublicWishlistController);
    wishlistService = module.get(WishlistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWishlist', () => {
    it('should return wishlist by session token', async () => {
      wishlistService.getWishlistBySessionToken.mockResolvedValue(mockWishlistData);

      const result = await controller.getWishlist(mockSessionToken, mockCompanyId);

      expect(result).toEqual(mockWishlistData);
      expect(wishlistService.getWishlistBySessionToken).toHaveBeenCalledWith(
        mockSessionToken,
        mockCompanyId,
      );
    });

    it('should return empty response when no session token', async () => {
      const result = await controller.getWishlist('', mockCompanyId);

      expect(result).toEqual(emptyWishlistResponse);
      expect(wishlistService.getWishlistBySessionToken).not.toHaveBeenCalled();
    });

    it('should return empty response when no company ID', async () => {
      const result = await controller.getWishlist(mockSessionToken, '');

      expect(result).toEqual(emptyWishlistResponse);
      expect(wishlistService.getWishlistBySessionToken).not.toHaveBeenCalled();
    });

    it('should return empty response when both headers missing', async () => {
      const result = await controller.getWishlist('', '');

      expect(result).toEqual(emptyWishlistResponse);
      expect(wishlistService.getWishlistBySessionToken).not.toHaveBeenCalled();
    });

    it('should return empty response when wishlist not found', async () => {
      wishlistService.getWishlistBySessionToken.mockResolvedValue(null);

      const result = await controller.getWishlist(mockSessionToken, mockCompanyId);

      expect(result).toEqual(emptyWishlistResponse);
    });

    it('should return empty response when session token is undefined', async () => {
      const result = await controller.getWishlist(undefined as unknown as string, mockCompanyId);

      expect(result).toEqual(emptyWishlistResponse);
      expect(wishlistService.getWishlistBySessionToken).not.toHaveBeenCalled();
    });

    it('should return empty response when company ID is undefined', async () => {
      const result = await controller.getWishlist(mockSessionToken, undefined as unknown as string);

      expect(result).toEqual(emptyWishlistResponse);
      expect(wishlistService.getWishlistBySessionToken).not.toHaveBeenCalled();
    });
  });

  describe('createWishlist', () => {
    it('should create new anonymous wishlist', async () => {
      wishlistService.getOrCreateWishlist.mockResolvedValue(mockWishlistData);

      const createDto = {
        siteId: 'site-123',
        name: 'My Favorites',
        isPublic: false,
      };

      const result = await controller.createWishlist(mockCompanyId, createDto);

      expect(result).toEqual(mockWishlistData);
      expect(wishlistService.getOrCreateWishlist).toHaveBeenCalledWith(mockCompanyId, {
        siteId: 'site-123',
        name: 'My Favorites',
        isPublic: false,
      });
    });

    it('should create public wishlist', async () => {
      const publicWishlist = {
        ...mockWishlistData,
        isPublic: true,
        sharedUrl: 'share-url-123',
      };
      wishlistService.getOrCreateWishlist.mockResolvedValue(publicWishlist);

      const createDto = {
        name: 'Public List',
        isPublic: true,
      };

      const result = await controller.createWishlist(mockCompanyId, createDto);

      expect(result.isPublic).toBe(true);
      expect(result.sharedUrl).toBe('share-url-123');
    });

    it('should create wishlist with minimal data', async () => {
      wishlistService.getOrCreateWishlist.mockResolvedValue(mockWishlistData);

      const createDto = {};

      await controller.createWishlist(mockCompanyId, createDto);

      expect(wishlistService.getOrCreateWishlist).toHaveBeenCalledWith(mockCompanyId, {
        siteId: undefined,
        name: undefined,
        isPublic: undefined,
      });
    });
  });

  describe('addItem', () => {
    const addDto = {
      productId: mockProductId,
      variantId: 'variant-1',
      priority: 5,
      notes: 'Great product',
    };

    it('should add item to wishlist with valid session token', async () => {
      wishlistService.getWishlistById.mockResolvedValue(mockWishlistData);
      wishlistService.addItem.mockResolvedValue(mockWishlistData);

      const result = await controller.addItem(mockWishlistId, mockSessionToken, mockCompanyId, addDto);

      expect(result).toEqual(mockWishlistData);
      expect(wishlistService.addItem).toHaveBeenCalledWith(mockWishlistId, addDto);
    });

    it('should add item with minimal data', async () => {
      const minimalDto = { productId: mockProductId };
      wishlistService.getWishlistById.mockResolvedValue(mockWishlistData);
      wishlistService.addItem.mockResolvedValue(mockWishlistData);

      await controller.addItem(mockWishlistId, mockSessionToken, mockCompanyId, minimalDto);

      expect(wishlistService.addItem).toHaveBeenCalledWith(mockWishlistId, minimalDto);
    });

    it('should throw ForbiddenException when session token is missing', async () => {
      await expect(
        controller.addItem(mockWishlistId, '', mockCompanyId, addDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.addItem(mockWishlistId, '', mockCompanyId, addDto),
      ).rejects.toThrow('Session token required for wishlist operations');
    });

    it('should throw ForbiddenException when session token is undefined', async () => {
      await expect(
        controller.addItem(mockWishlistId, undefined as unknown as string, mockCompanyId, addDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when session token does not match', async () => {
      wishlistService.getWishlistById.mockResolvedValue(mockWishlistData);

      await expect(
        controller.addItem(mockWishlistId, 'wrong-token', mockCompanyId, addDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.addItem(mockWishlistId, 'wrong-token', mockCompanyId, addDto),
      ).rejects.toThrow('Session token mismatch - access denied');
    });

    it('should throw ForbiddenException when company ID does not match', async () => {
      wishlistService.getWishlistById.mockResolvedValue(mockWishlistData);

      await expect(
        controller.addItem(mockWishlistId, mockSessionToken, 'wrong-company', addDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.addItem(mockWishlistId, mockSessionToken, 'wrong-company', addDto),
      ).rejects.toThrow('Access denied to this wishlist');
    });
  });

  describe('updateItem', () => {
    const updateDto = {
      priority: 10,
      notes: 'Updated notes',
    };

    it('should update wishlist item with valid session token', async () => {
      wishlistService.getWishlistById.mockResolvedValue(mockWishlistData);
      wishlistService.updateItem.mockResolvedValue(mockWishlistData);

      const result = await controller.updateItem(mockWishlistId, mockItemId, mockSessionToken, mockCompanyId, updateDto);

      expect(result).toEqual(mockWishlistData);
      expect(wishlistService.updateItem).toHaveBeenCalledWith(mockWishlistId, mockItemId, updateDto);
    });

    it('should update item with priority only', async () => {
      const priorityOnlyDto = { priority: 1 };
      wishlistService.getWishlistById.mockResolvedValue(mockWishlistData);
      wishlistService.updateItem.mockResolvedValue(mockWishlistData);

      await controller.updateItem(mockWishlistId, mockItemId, mockSessionToken, mockCompanyId, priorityOnlyDto);

      expect(wishlistService.updateItem).toHaveBeenCalledWith(mockWishlistId, mockItemId, priorityOnlyDto);
    });

    it('should throw ForbiddenException when session token mismatch', async () => {
      wishlistService.getWishlistById.mockResolvedValue(mockWishlistData);

      await expect(
        controller.updateItem(mockWishlistId, mockItemId, 'wrong-token', mockCompanyId, updateDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.updateItem(mockWishlistId, mockItemId, 'wrong-token', mockCompanyId, updateDto),
      ).rejects.toThrow('Session token mismatch - access denied');
    });

    it('should throw ForbiddenException when company ID mismatch', async () => {
      wishlistService.getWishlistById.mockResolvedValue(mockWishlistData);

      await expect(
        controller.updateItem(mockWishlistId, mockItemId, mockSessionToken, 'wrong-company', updateDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.updateItem(mockWishlistId, mockItemId, mockSessionToken, 'wrong-company', updateDto),
      ).rejects.toThrow('Access denied to this wishlist');
    });
  });

  describe('removeItem', () => {
    it('should remove item from wishlist with valid session token', async () => {
      const wishlistAfterRemoval = { ...mockWishlistData, items: [], itemCount: 0 };
      wishlistService.getWishlistById.mockResolvedValue(mockWishlistData);
      wishlistService.removeItem.mockResolvedValue(wishlistAfterRemoval);

      const result = await controller.removeItem(mockWishlistId, mockItemId, mockSessionToken, mockCompanyId);

      expect(result.items).toHaveLength(0);
      expect(wishlistService.removeItem).toHaveBeenCalledWith(mockWishlistId, mockItemId);
    });

    it('should throw ForbiddenException when session token missing', async () => {
      await expect(
        controller.removeItem(mockWishlistId, mockItemId, '', mockCompanyId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when session token mismatch', async () => {
      wishlistService.getWishlistById.mockResolvedValue(mockWishlistData);

      await expect(
        controller.removeItem(mockWishlistId, mockItemId, 'wrong-token', mockCompanyId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSharedWishlist', () => {
    const mockSharedWishlist: WishlistData = {
      ...mockWishlistData,
      isPublic: true,
      sharedUrl: 'share-abc123',
    };

    it('should return public wishlist by shared URL', async () => {
      wishlistService.getWishlistBySharedUrl.mockResolvedValue(mockSharedWishlist);

      const result = await controller.getSharedWishlist('share-abc123');

      expect(result).toEqual(mockSharedWishlist);
      expect(wishlistService.getWishlistBySharedUrl).toHaveBeenCalledWith('share-abc123');
    });

    it('should throw NotFoundException when wishlist not found', async () => {
      wishlistService.getWishlistBySharedUrl.mockResolvedValue(null);

      await expect(controller.getSharedWishlist('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(controller.getSharedWishlist('nonexistent')).rejects.toThrow(
        'Wishlist not found or not publicly shared',
      );
    });

    it('should throw NotFoundException when wishlist is not public', async () => {
      const privateWishlist = { ...mockWishlistData, isPublic: false, sharedUrl: 'share-abc123' };
      wishlistService.getWishlistBySharedUrl.mockResolvedValue(privateWishlist);

      await expect(controller.getSharedWishlist('share-abc123')).rejects.toThrow(NotFoundException);
      await expect(controller.getSharedWishlist('share-abc123')).rejects.toThrow(
        'Wishlist not found or not publicly shared',
      );
    });
  });

  describe('Security - Session Token Validation', () => {
    it('should throw ForbiddenException when session token missing for addItem', async () => {
      await expect(
        controller.addItem(mockWishlistId, '', mockCompanyId, { productId: mockProductId }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.addItem(mockWishlistId, '', mockCompanyId, { productId: mockProductId }),
      ).rejects.toThrow('Session token required for wishlist operations');
    });

    it('should throw ForbiddenException when company ID mismatch for addItem', async () => {
      wishlistService.getWishlistById.mockResolvedValue(mockWishlistData);

      await expect(
        controller.addItem(mockWishlistId, mockSessionToken, 'wrong-company', { productId: mockProductId }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.addItem(mockWishlistId, mockSessionToken, 'wrong-company', { productId: mockProductId }),
      ).rejects.toThrow('Access denied to this wishlist');
    });

    it('should throw ForbiddenException when session token mismatch for updateItem', async () => {
      wishlistService.getWishlistById.mockResolvedValue(mockWishlistData);

      await expect(
        controller.updateItem(mockWishlistId, mockItemId, 'wrong-token', mockCompanyId, { priority: 1 }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.updateItem(mockWishlistId, mockItemId, 'wrong-token', mockCompanyId, { priority: 1 }),
      ).rejects.toThrow('Session token mismatch - access denied');
    });

    it('should throw ForbiddenException when session token mismatch for removeItem', async () => {
      wishlistService.getWishlistById.mockResolvedValue(mockWishlistData);

      await expect(
        controller.removeItem(mockWishlistId, mockItemId, 'wrong-token', mockCompanyId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.removeItem(mockWishlistId, mockItemId, 'wrong-token', mockCompanyId),
      ).rejects.toThrow('Session token mismatch - access denied');
    });
  });
});

describe('WishlistController - Edge Cases', () => {
  let controller: WishlistController;
  let wishlistService: jest.Mocked<WishlistService>;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    sub: 'user-1',
    email: 'user@company.com',
    scopeType: 'COMPANY' as ScopeType,
    scopeId: 'company-123',
    companyId: 'company-123',
    clientId: 'client-456',
    organizationId: 'org-1',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WishlistController],
      providers: [
        {
          provide: WishlistService,
          useValue: {
            getWishlistByCustomerId: jest.fn(),
            getOrCreateWishlist: jest.fn(),
            addItem: jest.fn(),
            updateItem: jest.fn(),
            removeItem: jest.fn(),
            updateWishlist: jest.fn(),
            clearWishlist: jest.fn(),
            shareWishlist: jest.fn(),
            mergeWishlists: jest.fn(),
            getWishlistStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WishlistController>(WishlistController);
    wishlistService = module.get(WishlistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User with undefined companyId', () => {
    it('should handle user without companyId in getWishlist', async () => {
      const userNoCompany = { ...mockUser, companyId: undefined };
      wishlistService.getWishlistByCustomerId.mockResolvedValue(null);
      wishlistService.getOrCreateWishlist.mockResolvedValue({
        id: 'wishlist-1',
        companyId: userNoCompany.scopeId,
        customerId: userNoCompany.id,
        name: 'My Wishlist',
        isPublic: false,
        items: [],
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as WishlistData);

      const result = await controller.getWishlist(userNoCompany, {});

      expect(wishlistService.getWishlistByCustomerId).toHaveBeenCalledWith(
        userNoCompany.id,
        undefined,
      );
    });
  });

  describe('Maximum priority handling', () => {
    it('should handle maximum priority value in addItem', async () => {
      const mockWishlist: WishlistData = {
        id: 'wishlist-1',
        companyId: 'company-123',
        customerId: 'user-1',
        name: 'My Wishlist',
        isPublic: false,
        items: [],
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      wishlistService.getOrCreateWishlist.mockResolvedValue(mockWishlist);
      wishlistService.addItem.mockResolvedValue(mockWishlist);

      const addDto = { productId: 'prod-1', priority: 1000 }; // Max priority per DTO validation

      await controller.addItem(mockUser, addDto);

      expect(wishlistService.addItem).toHaveBeenCalledWith('wishlist-1', addDto, mockUser.id);
    });
  });

  describe('Long notes handling', () => {
    it('should handle maximum length notes', async () => {
      const mockWishlist: WishlistData = {
        id: 'wishlist-1',
        companyId: 'company-123',
        customerId: 'user-1',
        name: 'My Wishlist',
        isPublic: false,
        items: [],
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      wishlistService.getOrCreateWishlist.mockResolvedValue(mockWishlist);
      wishlistService.addItem.mockResolvedValue(mockWishlist);

      const longNotes = 'A'.repeat(500); // Max notes length per DTO validation
      const addDto = { productId: 'prod-1', notes: longNotes };

      await controller.addItem(mockUser, addDto);

      expect(wishlistService.addItem).toHaveBeenCalledWith('wishlist-1', expect.objectContaining({
        notes: longNotes,
      }), mockUser.id);
    });
  });

  describe('Special characters in wishlist name', () => {
    it('should handle special characters in wishlist name', async () => {
      const mockWishlist: WishlistData = {
        id: 'wishlist-1',
        companyId: 'company-123',
        customerId: 'user-1',
        name: 'My Wishlist',
        isPublic: false,
        items: [],
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlist);
      wishlistService.updateWishlist.mockResolvedValue({
        ...mockWishlist,
        name: "John's Birthday List!",
      });

      const updateDto = { name: "John's Birthday List!" };

      await controller.updateWishlist(mockUser, updateDto);

      expect(wishlistService.updateWishlist).toHaveBeenCalledWith('wishlist-1', updateDto, mockUser.id);
    });
  });
});

describe('PublicWishlistController - Edge Cases', () => {
  let controller: PublicWishlistController;
  let wishlistService: jest.Mocked<WishlistService>;

  const mockSessionToken = 'session-token-123';
  const mockCompanyId = 'company-123';
  const mockWishlistId = 'wishlist-789';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicWishlistController],
      providers: [
        {
          provide: WishlistService,
          useValue: {
            getWishlistBySessionToken: jest.fn(),
            getWishlistById: jest.fn(),
            getWishlistBySharedUrl: jest.fn(),
            getOrCreateWishlist: jest.fn(),
            addItem: jest.fn(),
            updateItem: jest.fn(),
            removeItem: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PublicWishlistController>(PublicWishlistController);
    wishlistService = module.get(WishlistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Whitespace handling in headers', () => {
    it('should handle whitespace-only session token', async () => {
      // Whitespace is truthy, so it will attempt to fetch
      await controller.getWishlist('   ', mockCompanyId);

      expect(wishlistService.getWishlistBySessionToken).toHaveBeenCalledWith('   ', mockCompanyId);
    });

    it('should handle whitespace-only company ID', async () => {
      await controller.getWishlist(mockSessionToken, '   ');

      expect(wishlistService.getWishlistBySessionToken).toHaveBeenCalledWith(mockSessionToken, '   ');
    });
  });

  describe('Unicode handling', () => {
    it('should handle unicode characters in wishlist name', async () => {
      const mockWishlist: WishlistData = {
        id: mockWishlistId,
        companyId: mockCompanyId,
        sessionToken: mockSessionToken,
        name: 'Lista de deseos',
        isPublic: false,
        items: [],
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      wishlistService.getOrCreateWishlist.mockResolvedValue(mockWishlist);

      const createDto = {
        name: 'Lista de deseos',
      };

      await controller.createWishlist(mockCompanyId, createDto);

      expect(wishlistService.getOrCreateWishlist).toHaveBeenCalledWith(mockCompanyId, expect.objectContaining({
        name: 'Lista de deseos',
      }));
    });
  });

  describe('Empty notes handling', () => {
    it('should handle empty string notes', async () => {
      const mockWishlist: WishlistData = {
        id: mockWishlistId,
        companyId: mockCompanyId,
        sessionToken: mockSessionToken,
        name: 'My Wishlist',
        isPublic: false,
        items: [],
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      wishlistService.getWishlistById.mockResolvedValue(mockWishlist);
      wishlistService.addItem.mockResolvedValue(mockWishlist);

      const addDto = {
        productId: 'prod-1',
        notes: '',
      };

      await controller.addItem(mockWishlistId, mockSessionToken, mockCompanyId, addDto);

      expect(wishlistService.addItem).toHaveBeenCalledWith(mockWishlistId, expect.objectContaining({
        notes: '',
      }));
    });
  });

  describe('Multiple items handling', () => {
    it('should handle wishlist with many items', async () => {
      const manyItems = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        wishlistId: mockWishlistId,
        productId: `product-${i}`,
        productSnapshot: {
          name: `Product ${i}`,
          sku: `SKU-${i}`,
          price: 10 + i,
        },
        priority: i + 1,
        addedAt: new Date(),
      }));

      const mockWishlist: WishlistData = {
        id: mockWishlistId,
        companyId: mockCompanyId,
        sessionToken: mockSessionToken,
        name: 'Big Wishlist',
        isPublic: false,
        items: manyItems,
        itemCount: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      wishlistService.getWishlistBySessionToken.mockResolvedValue(mockWishlist);

      const result = await controller.getWishlist(mockSessionToken, mockCompanyId);

      expect(result.items).toHaveLength(100);
      expect(result.itemCount).toBe(100);
    });
  });

  describe('Shared URL edge cases', () => {
    it('should handle shared URL with special characters', async () => {
      const sharedUrl = 'abc-123_xyz';
      wishlistService.getWishlistBySharedUrl.mockResolvedValue({
        id: mockWishlistId,
        companyId: mockCompanyId,
        name: 'Public Wishlist',
        isPublic: true,
        sharedUrl,
        items: [],
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await controller.getSharedWishlist(sharedUrl);

      expect(result.sharedUrl).toBe(sharedUrl);
      expect(wishlistService.getWishlistBySharedUrl).toHaveBeenCalledWith(sharedUrl);
    });

    it('should handle very long shared URL', async () => {
      const longUrl = 'a'.repeat(100);
      wishlistService.getWishlistBySharedUrl.mockResolvedValue(null);

      await expect(controller.getSharedWishlist(longUrl)).rejects.toThrow(NotFoundException);
    });
  });
});

describe('WishlistController - Authorization Scenarios', () => {
  let controller: WishlistController;
  let wishlistService: jest.Mocked<WishlistService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WishlistController],
      providers: [
        {
          provide: WishlistService,
          useValue: {
            getWishlistByCustomerId: jest.fn(),
            getOrCreateWishlist: jest.fn(),
            addItem: jest.fn(),
            updateItem: jest.fn(),
            removeItem: jest.fn(),
            updateWishlist: jest.fn(),
            clearWishlist: jest.fn(),
            shareWishlist: jest.fn(),
            mergeWishlists: jest.fn(),
            getWishlistStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WishlistController>(WishlistController);
    wishlistService = module.get(WishlistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Different scope types', () => {
    it('should work with CLIENT scope type user', async () => {
      const clientUser: AuthenticatedUser = {
        id: 'user-client',
        sub: 'user-client',
        email: 'client@example.com',
        scopeType: 'CLIENT' as ScopeType,
        scopeId: 'client-123',
        clientId: 'client-123',
        companyId: 'company-abc',
        organizationId: 'org-1',
        role: 'ADMIN',
      };

      const mockWishlist: WishlistData = {
        id: 'wishlist-1',
        companyId: 'company-abc',
        customerId: 'user-client',
        name: 'My Wishlist',
        isPublic: false,
        items: [],
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlist);

      const result = await controller.getWishlist(clientUser, {});

      expect(result).toEqual(mockWishlist);
      expect(wishlistService.getWishlistByCustomerId).toHaveBeenCalledWith('user-client', 'company-abc');
    });

    it('should work with ORGANIZATION scope type user', async () => {
      const orgUser: AuthenticatedUser = {
        id: 'user-org',
        sub: 'user-org',
        email: 'org@example.com',
        scopeType: 'ORGANIZATION' as ScopeType,
        scopeId: 'org-123',
        organizationId: 'org-123',
        role: 'SUPER_ADMIN',
      };

      const mockWishlist: WishlistData = {
        id: 'wishlist-1',
        companyId: 'org-123',
        customerId: 'user-org',
        name: 'My Wishlist',
        isPublic: false,
        items: [],
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      wishlistService.getWishlistByCustomerId.mockResolvedValue(null);
      wishlistService.getOrCreateWishlist.mockResolvedValue(mockWishlist);

      const result = await controller.getWishlist(orgUser, {});

      expect(result).toEqual(mockWishlist);
      // Note: companyId is undefined for org users without companyId
      expect(wishlistService.getWishlistByCustomerId).toHaveBeenCalledWith('user-org', undefined);
    });
  });

  describe('User ID usage', () => {
    it('should use user.id as performedBy for audit logging', async () => {
      const mockUser: AuthenticatedUser = {
        id: 'user-audit-test',
        sub: 'user-audit-test',
        email: 'audit@example.com',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-123',
        companyId: 'company-123',
        role: 'ADMIN',
      };

      const mockWishlist: WishlistData = {
        id: 'wishlist-1',
        companyId: 'company-123',
        customerId: 'user-audit-test',
        name: 'My Wishlist',
        isPublic: false,
        items: [],
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlist);
      wishlistService.clearWishlist.mockResolvedValue(mockWishlist);

      await controller.clearWishlist(mockUser);

      // Verify user.id is passed as performedBy
      expect(wishlistService.clearWishlist).toHaveBeenCalledWith('wishlist-1', 'user-audit-test');
    });
  });
});

describe('DTO Validation', () => {
  let controller: WishlistController;
  let publicController: PublicWishlistController;
  let wishlistService: jest.Mocked<WishlistService>;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    sub: 'user-1',
    email: 'user@company.com',
    scopeType: 'COMPANY' as ScopeType,
    scopeId: 'company-123',
    companyId: 'company-123',
    role: 'ADMIN',
  };

  const mockWishlist: WishlistData = {
    id: 'wishlist-1',
    companyId: 'company-123',
    customerId: 'user-1',
    name: 'My Wishlist',
    isPublic: false,
    items: [],
    itemCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WishlistController, PublicWishlistController],
      providers: [
        {
          provide: WishlistService,
          useValue: {
            getWishlistByCustomerId: jest.fn(),
            getWishlistById: jest.fn(),
            getWishlistBySessionToken: jest.fn(),
            getWishlistBySharedUrl: jest.fn(),
            getOrCreateWishlist: jest.fn(),
            addItem: jest.fn(),
            updateItem: jest.fn(),
            removeItem: jest.fn(),
            updateWishlist: jest.fn(),
            clearWishlist: jest.fn(),
            shareWishlist: jest.fn(),
            mergeWishlists: jest.fn(),
            getWishlistStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WishlistController>(WishlistController);
    publicController = module.get<PublicWishlistController>(PublicWishlistController);
    wishlistService = module.get(WishlistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AddToWishlistDto', () => {
    it('should pass productId to service', async () => {
      wishlistService.getOrCreateWishlist.mockResolvedValue(mockWishlist);
      wishlistService.addItem.mockResolvedValue(mockWishlist);

      const dto = { productId: 'product-123' };
      await controller.addItem(mockUser, dto);

      expect(wishlistService.addItem).toHaveBeenCalledWith(
        'wishlist-1',
        expect.objectContaining({ productId: 'product-123' }),
        mockUser.id,
      );
    });

    it('should pass all optional fields to service', async () => {
      wishlistService.getOrCreateWishlist.mockResolvedValue(mockWishlist);
      wishlistService.addItem.mockResolvedValue(mockWishlist);

      const dto = {
        productId: 'product-123',
        variantId: 'variant-456',
        priority: 5,
        notes: 'Gift idea',
      };
      await controller.addItem(mockUser, dto);

      expect(wishlistService.addItem).toHaveBeenCalledWith(
        'wishlist-1',
        expect.objectContaining({
          productId: 'product-123',
          variantId: 'variant-456',
          priority: 5,
          notes: 'Gift idea',
        }),
        mockUser.id,
      );
    });
  });

  describe('UpdateWishlistDto', () => {
    it('should pass name to service', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlist);
      wishlistService.updateWishlist.mockResolvedValue({ ...mockWishlist, name: 'New Name' });

      const dto = { name: 'New Name' };
      await controller.updateWishlist(mockUser, dto);

      expect(wishlistService.updateWishlist).toHaveBeenCalledWith(
        'wishlist-1',
        expect.objectContaining({ name: 'New Name' }),
        mockUser.id,
      );
    });

    it('should pass isPublic to service', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlist);
      wishlistService.updateWishlist.mockResolvedValue({ ...mockWishlist, isPublic: true });

      const dto = { isPublic: true };
      await controller.updateWishlist(mockUser, dto);

      expect(wishlistService.updateWishlist).toHaveBeenCalledWith(
        'wishlist-1',
        expect.objectContaining({ isPublic: true }),
        mockUser.id,
      );
    });
  });

  describe('UpdateWishlistItemDto', () => {
    it('should pass priority and notes to service', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlist);
      wishlistService.updateItem.mockResolvedValue(mockWishlist);

      const dto = { priority: 10, notes: 'Updated notes' };
      await controller.updateItem(mockUser, 'item-1', dto);

      expect(wishlistService.updateItem).toHaveBeenCalledWith(
        'wishlist-1',
        'item-1',
        expect.objectContaining({ priority: 10, notes: 'Updated notes' }),
        mockUser.id,
      );
    });
  });

  describe('ShareWishlistDto', () => {
    it('should pass isPublic to shareWishlist service', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(mockWishlist);
      wishlistService.shareWishlist.mockResolvedValue({ ...mockWishlist, isPublic: true });

      const dto = { isPublic: true };
      await controller.toggleSharing(mockUser, dto);

      expect(wishlistService.shareWishlist).toHaveBeenCalledWith('wishlist-1', true, mockUser.id);
    });
  });

  describe('CreateWishlistDto (Public Controller)', () => {
    it('should pass all fields to service', async () => {
      wishlistService.getOrCreateWishlist.mockResolvedValue(mockWishlist);

      const dto = {
        name: 'My Favorites',
        siteId: 'site-123',
        isPublic: true,
      };
      await publicController.createWishlist('company-123', dto);

      expect(wishlistService.getOrCreateWishlist).toHaveBeenCalledWith(
        'company-123',
        expect.objectContaining({
          name: 'My Favorites',
          siteId: 'site-123',
          isPublic: true,
        }),
      );
    });
  });

  describe('WishlistQueryDto', () => {
    it('should pass siteId from query to service when creating new wishlist', async () => {
      wishlistService.getWishlistByCustomerId.mockResolvedValue(null);
      wishlistService.getOrCreateWishlist.mockResolvedValue(mockWishlist);

      const query = { siteId: 'storefront-1', sessionToken: 'token-123' };
      await controller.getWishlist(mockUser, query);

      expect(wishlistService.getOrCreateWishlist).toHaveBeenCalledWith(
        'company-123',
        expect.objectContaining({ siteId: 'storefront-1' }),
      );
    });
  });
});
