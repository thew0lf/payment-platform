/**
 * Comparison Controller Tests
 * Testing API endpoints for comparison management (authenticated and public)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ComparisonController, PublicComparisonController } from './comparison.controller';
import { ComparisonService } from '../services/comparison.service';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ScopeType } from '@prisma/client';
import { ComparisonData, ShareComparisonResult, MAX_COMPARISON_ITEMS } from '../types/comparison.types';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ComparisonController', () => {
  let controller: ComparisonController;
  let comparisonService: jest.Mocked<ComparisonService>;

  const mockCompanyId = 'company-123';
  const mockClientId = 'client-456';
  const mockComparisonId = 'comparison-789';
  const mockProductId = 'product-001';
  const mockItemId = 'item-001';
  const mockSessionToken = 'session-token-abc123';
  const mockShareToken = 'share-token-xyz789';

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

  const mockComparisonData: ComparisonData = {
    id: mockComparisonId,
    companyId: mockCompanyId,
    customerId: mockUser.id,
    sessionToken: mockSessionToken,
    isShared: false,
    items: [
      {
        id: mockItemId,
        comparisonId: mockComparisonId,
        productId: mockProductId,
        productSnapshot: {
          name: 'Test Product',
          sku: 'SKU-001',
          price: 50,
          currency: 'USD',
        },
        position: 0,
        addedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEmptyComparison: ComparisonData = {
    ...mockComparisonData,
    items: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComparisonController],
      providers: [
        {
          provide: ComparisonService,
          useValue: {
            getComparisonByCustomerId: jest.fn(),
            getComparisonById: jest.fn(),
            getComparisonBySessionToken: jest.fn(),
            getComparisonByShareToken: jest.fn(),
            getOrCreateComparison: jest.fn(),
            addItem: jest.fn(),
            removeItem: jest.fn(),
            reorderItems: jest.fn(),
            updateComparison: jest.fn(),
            clearComparison: jest.fn(),
            shareComparison: jest.fn(),
            unshareComparison: jest.fn(),
            mergeComparisons: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ComparisonController>(ComparisonController);
    comparisonService = module.get(ComparisonService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getComparison', () => {
    it('should return existing comparison for user', async () => {
      comparisonService.getComparisonByCustomerId.mockResolvedValue(mockComparisonData);

      const result = await controller.getComparison(mockUser, {});

      expect(result).toEqual(mockComparisonData);
      expect(comparisonService.getComparisonByCustomerId).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.companyId,
      );
    });

    it('should create new comparison if none exists', async () => {
      comparisonService.getComparisonByCustomerId.mockResolvedValue(null);
      comparisonService.getOrCreateComparison.mockResolvedValue(mockEmptyComparison);

      const result = await controller.getComparison(mockUser, { siteId: 'site-1' });

      expect(result).toEqual(mockEmptyComparison);
      expect(comparisonService.getOrCreateComparison).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
        siteId: 'site-1',
      });
    });

    it('should handle query with sessionToken', async () => {
      comparisonService.getComparisonByCustomerId.mockResolvedValue(mockComparisonData);

      await controller.getComparison(mockUser, { sessionToken: 'token-123' });

      expect(comparisonService.getComparisonByCustomerId).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.companyId,
      );
    });

    it('should create comparison without siteId if not provided', async () => {
      comparisonService.getComparisonByCustomerId.mockResolvedValue(null);
      comparisonService.getOrCreateComparison.mockResolvedValue(mockEmptyComparison);

      await controller.getComparison(mockUser, {});

      expect(comparisonService.getOrCreateComparison).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
        siteId: undefined,
      });
    });
  });

  describe('addItem', () => {
    const addDto = {
      productId: mockProductId,
      variantId: 'variant-1',
      position: 0,
    };

    it('should add item to existing comparison', async () => {
      comparisonService.getOrCreateComparison.mockResolvedValue(mockEmptyComparison);
      comparisonService.addItem.mockResolvedValue(mockComparisonData);

      const result = await controller.addItem(mockUser, addDto);

      expect(result).toEqual(mockComparisonData);
      expect(comparisonService.getOrCreateComparison).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
        siteId: undefined,
      });
      expect(comparisonService.addItem).toHaveBeenCalledWith(
        mockEmptyComparison.id,
        addDto,
        mockUser.id,
      );
    });

    it('should add item with siteId query parameter', async () => {
      comparisonService.getOrCreateComparison.mockResolvedValue(mockEmptyComparison);
      comparisonService.addItem.mockResolvedValue(mockComparisonData);

      await controller.addItem(mockUser, addDto, 'site-123');

      expect(comparisonService.getOrCreateComparison).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
        siteId: 'site-123',
      });
    });

    it('should add item with minimal data (productId only)', async () => {
      const minimalDto = { productId: mockProductId };
      comparisonService.getOrCreateComparison.mockResolvedValue(mockEmptyComparison);
      comparisonService.addItem.mockResolvedValue(mockComparisonData);

      const result = await controller.addItem(mockUser, minimalDto);

      expect(result).toEqual(mockComparisonData);
      expect(comparisonService.addItem).toHaveBeenCalledWith(
        mockEmptyComparison.id,
        minimalDto,
        mockUser.id,
      );
    });

    it('should throw BadRequestException when max items limit reached', async () => {
      const comparisonAtLimit: ComparisonData = {
        ...mockComparisonData,
        items: Array(MAX_COMPARISON_ITEMS).fill({
          id: 'item-x',
          comparisonId: mockComparisonId,
          productId: 'product-x',
          productSnapshot: { name: 'Test', sku: 'SKU', price: 10, currency: 'USD' },
          position: 0,
          addedAt: new Date(),
        }),
      };
      comparisonService.getOrCreateComparison.mockResolvedValue(comparisonAtLimit);

      await expect(controller.addItem(mockUser, addDto)).rejects.toThrow(BadRequestException);
      await expect(controller.addItem(mockUser, addDto)).rejects.toThrow(
        `Maximum of ${MAX_COMPARISON_ITEMS} items allowed in comparison`,
      );
    });
  });

  describe('removeItem', () => {
    it('should remove item from comparison', async () => {
      comparisonService.getComparisonByCustomerId.mockResolvedValue(mockComparisonData);
      comparisonService.removeItem.mockResolvedValue(mockEmptyComparison);

      const result = await controller.removeItem(mockUser, mockItemId);

      expect(result).toEqual(mockEmptyComparison);
      expect(comparisonService.removeItem).toHaveBeenCalledWith(
        mockComparisonId,
        mockItemId,
        mockUser.id,
      );
    });

    it('should throw NotFoundException when comparison not found', async () => {
      comparisonService.getComparisonByCustomerId.mockResolvedValue(null);

      await expect(controller.removeItem(mockUser, mockItemId)).rejects.toThrow(
        'Comparison not found',
      );
    });
  });

  describe('reorderItems', () => {
    const reorderDto = { itemIds: ['item-001', 'item-002'] };

    it('should reorder items in comparison', async () => {
      comparisonService.getComparisonByCustomerId.mockResolvedValue(mockComparisonData);
      comparisonService.reorderItems.mockResolvedValue(mockComparisonData);

      const result = await controller.reorderItems(mockUser, reorderDto);

      expect(result).toEqual(mockComparisonData);
      expect(comparisonService.reorderItems).toHaveBeenCalledWith(
        mockComparisonId,
        reorderDto,
        mockUser.id,
      );
    });

    it('should throw NotFoundException when comparison not found', async () => {
      comparisonService.getComparisonByCustomerId.mockResolvedValue(null);

      await expect(controller.reorderItems(mockUser, reorderDto)).rejects.toThrow(
        'Comparison not found',
      );
    });
  });

  describe('updateComparison', () => {
    const updateDto = { name: 'My Comparison List' };

    it('should update comparison metadata', async () => {
      const updatedComparison = { ...mockComparisonData, name: 'My Comparison List' };
      comparisonService.getComparisonByCustomerId.mockResolvedValue(mockComparisonData);
      comparisonService.updateComparison.mockResolvedValue(updatedComparison);

      const result = await controller.updateComparison(mockUser, updateDto);

      expect(result).toEqual(updatedComparison);
      expect(comparisonService.updateComparison).toHaveBeenCalledWith(
        mockComparisonId,
        updateDto,
        mockUser.id,
      );
    });

    it('should throw NotFoundException when comparison not found', async () => {
      comparisonService.getComparisonByCustomerId.mockResolvedValue(null);

      await expect(controller.updateComparison(mockUser, updateDto)).rejects.toThrow(
        'Comparison not found',
      );
    });
  });

  describe('clearComparison', () => {
    it('should clear all items from comparison', async () => {
      comparisonService.getComparisonByCustomerId.mockResolvedValue(mockComparisonData);
      comparisonService.clearComparison.mockResolvedValue(mockEmptyComparison);

      const result = await controller.clearComparison(mockUser);

      expect(result).toEqual(mockEmptyComparison);
      expect(result.items).toHaveLength(0);
      expect(comparisonService.clearComparison).toHaveBeenCalledWith(mockComparisonId, mockUser.id);
    });

    it('should throw NotFoundException when comparison not found', async () => {
      comparisonService.getComparisonByCustomerId.mockResolvedValue(null);

      await expect(controller.clearComparison(mockUser)).rejects.toThrow('Comparison not found');
    });
  });

  describe('shareComparison', () => {
    const shareDto = { name: 'My Shared Comparison', expiresInDays: 7 };

    const mockShareResult: ShareComparisonResult = {
      comparisonId: mockComparisonId,
      shareToken: mockShareToken,
      shareUrl: `http://localhost:3003/compare/${mockShareToken}`,
      expiresAt: new Date(),
    };

    it('should create share link for comparison', async () => {
      comparisonService.getComparisonByCustomerId.mockResolvedValue(mockComparisonData);
      comparisonService.shareComparison.mockResolvedValue(mockShareResult);

      const result = await controller.shareComparison(mockUser, shareDto);

      expect(result).toEqual(mockShareResult);
      expect(result.shareToken).toBe(mockShareToken);
      expect(comparisonService.shareComparison).toHaveBeenCalledWith(
        mockComparisonId,
        shareDto,
        mockUser.id,
      );
    });

    it('should create share link with default expiration', async () => {
      const minimalShareDto = {};
      comparisonService.getComparisonByCustomerId.mockResolvedValue(mockComparisonData);
      comparisonService.shareComparison.mockResolvedValue(mockShareResult);

      await controller.shareComparison(mockUser, minimalShareDto);

      expect(comparisonService.shareComparison).toHaveBeenCalledWith(
        mockComparisonId,
        minimalShareDto,
        mockUser.id,
      );
    });

    it('should throw NotFoundException when comparison not found', async () => {
      comparisonService.getComparisonByCustomerId.mockResolvedValue(null);

      await expect(controller.shareComparison(mockUser, shareDto)).rejects.toThrow(
        'Comparison not found',
      );
    });
  });

  describe('unshareComparison', () => {
    it('should remove share link from comparison', async () => {
      const unsharedComparison = { ...mockComparisonData, isShared: false, shareToken: undefined };
      comparisonService.getComparisonByCustomerId.mockResolvedValue(mockComparisonData);
      comparisonService.unshareComparison.mockResolvedValue(unsharedComparison);

      const result = await controller.unshareComparison(mockUser);

      expect(result.isShared).toBe(false);
      expect(result.shareToken).toBeUndefined();
      expect(comparisonService.unshareComparison).toHaveBeenCalledWith(mockComparisonId, mockUser.id);
    });

    it('should throw NotFoundException when comparison not found', async () => {
      comparisonService.getComparisonByCustomerId.mockResolvedValue(null);

      await expect(controller.unshareComparison(mockUser)).rejects.toThrow('Comparison not found');
    });
  });

  describe('mergeComparisons', () => {
    const mergeDto = { sourceComparisonId: 'guest-comparison-123' };

    it('should merge guest comparison into user comparison', async () => {
      const mergedComparison = {
        ...mockComparisonData,
        items: [
          ...mockComparisonData.items,
          {
            id: 'item-002',
            comparisonId: mockComparisonId,
            productId: 'product-002',
            productSnapshot: { name: 'Another Product', sku: 'SKU-002', price: 25, currency: 'USD' },
            position: 1,
            addedAt: new Date(),
          },
        ],
      };
      comparisonService.getOrCreateComparison.mockResolvedValue(mockComparisonData);
      comparisonService.mergeComparisons.mockResolvedValue(mergedComparison);

      const result = await controller.mergeComparisons(mockUser, mergeDto);

      expect(result.items).toHaveLength(2);
      expect(comparisonService.mergeComparisons).toHaveBeenCalledWith(
        mergeDto.sourceComparisonId,
        mockComparisonId,
        mockUser.id,
      );
    });

    it('should create user comparison if it does not exist before merging', async () => {
      comparisonService.getOrCreateComparison.mockResolvedValue(mockEmptyComparison);
      comparisonService.mergeComparisons.mockResolvedValue(mockComparisonData);

      await controller.mergeComparisons(mockUser, mergeDto);

      expect(comparisonService.getOrCreateComparison).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
      });
    });
  });
});

describe('PublicComparisonController', () => {
  let controller: PublicComparisonController;
  let comparisonService: jest.Mocked<ComparisonService>;

  const mockCompanyId = 'company-123';
  const mockComparisonId = 'comparison-789';
  const mockProductId = 'product-001';
  const mockItemId = 'item-001';
  const mockSessionToken = 'session-token-abc123';
  const mockShareToken = 'share-token-xyz789';

  const mockComparisonData: ComparisonData = {
    id: mockComparisonId,
    companyId: mockCompanyId,
    sessionToken: mockSessionToken,
    isShared: false,
    items: [
      {
        id: mockItemId,
        comparisonId: mockComparisonId,
        productId: mockProductId,
        productSnapshot: {
          name: 'Test Product',
          sku: 'SKU-001',
          price: 50,
          currency: 'USD',
        },
        position: 0,
        addedAt: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const emptyComparisonResponse = { items: [], isShared: false };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicComparisonController],
      providers: [
        {
          provide: ComparisonService,
          useValue: {
            getComparisonById: jest.fn(),
            getComparisonBySessionToken: jest.fn(),
            getComparisonByShareToken: jest.fn(),
            getOrCreateComparison: jest.fn(),
            addItem: jest.fn(),
            removeItem: jest.fn(),
            reorderItems: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PublicComparisonController>(PublicComparisonController);
    comparisonService = module.get(ComparisonService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getComparison', () => {
    it('should return comparison by session token', async () => {
      comparisonService.getComparisonBySessionToken.mockResolvedValue(mockComparisonData);

      const result = await controller.getComparison(mockSessionToken, mockCompanyId);

      expect(result).toEqual(mockComparisonData);
      expect(comparisonService.getComparisonBySessionToken).toHaveBeenCalledWith(
        mockSessionToken,
        mockCompanyId,
      );
    });

    it('should return empty comparison response when no session token', async () => {
      const result = await controller.getComparison('', mockCompanyId);

      expect(result).toEqual(emptyComparisonResponse);
      expect(comparisonService.getComparisonBySessionToken).not.toHaveBeenCalled();
    });

    it('should return empty comparison response when no company ID', async () => {
      const result = await controller.getComparison(mockSessionToken, '');

      expect(result).toEqual(emptyComparisonResponse);
      expect(comparisonService.getComparisonBySessionToken).not.toHaveBeenCalled();
    });

    it('should return empty comparison response when both headers missing', async () => {
      const result = await controller.getComparison('', '');

      expect(result).toEqual(emptyComparisonResponse);
      expect(comparisonService.getComparisonBySessionToken).not.toHaveBeenCalled();
    });

    it('should return empty comparison response when comparison not found', async () => {
      comparisonService.getComparisonBySessionToken.mockResolvedValue(null);

      const result = await controller.getComparison(mockSessionToken, mockCompanyId);

      expect(result).toEqual(emptyComparisonResponse);
    });

    it('should return empty comparison response when session token is undefined', async () => {
      const result = await controller.getComparison(undefined as unknown as string, mockCompanyId);

      expect(result).toEqual(emptyComparisonResponse);
      expect(comparisonService.getComparisonBySessionToken).not.toHaveBeenCalled();
    });

    it('should return empty comparison response when company ID is undefined', async () => {
      const result = await controller.getComparison(
        mockSessionToken,
        undefined as unknown as string,
      );

      expect(result).toEqual(emptyComparisonResponse);
      expect(comparisonService.getComparisonBySessionToken).not.toHaveBeenCalled();
    });
  });

  describe('createComparison', () => {
    it('should create new anonymous comparison', async () => {
      comparisonService.getOrCreateComparison.mockResolvedValue(mockComparisonData);

      const createDto = {
        siteId: 'site-123',
        visitorId: 'visitor-456',
        name: 'My Comparison',
      };

      const result = await controller.createComparison(mockCompanyId, createDto);

      expect(result).toEqual(mockComparisonData);
      expect(comparisonService.getOrCreateComparison).toHaveBeenCalledWith(mockCompanyId, {
        siteId: 'site-123',
        visitorId: 'visitor-456',
        name: 'My Comparison',
      });
    });

    it('should create comparison with minimal data', async () => {
      comparisonService.getOrCreateComparison.mockResolvedValue(mockComparisonData);

      const createDto = {};

      await controller.createComparison(mockCompanyId, createDto);

      expect(comparisonService.getOrCreateComparison).toHaveBeenCalledWith(mockCompanyId, {
        siteId: undefined,
        visitorId: undefined,
        name: undefined,
      });
    });

    it('should throw BadRequestException when company ID is missing', async () => {
      await expect(controller.createComparison('', {})).rejects.toThrow(BadRequestException);
      await expect(controller.createComparison('', {})).rejects.toThrow('Company ID is required');
    });
  });

  describe('addItem', () => {
    const addDto = {
      productId: mockProductId,
      variantId: 'variant-1',
    };

    it('should add item to comparison with valid session token', async () => {
      const emptyComparison: ComparisonData = { ...mockComparisonData, items: [] };
      comparisonService.getComparisonById.mockResolvedValue(mockComparisonData);
      comparisonService.addItem.mockResolvedValue(mockComparisonData);

      const result = await controller.addItem(
        mockComparisonId,
        mockSessionToken,
        mockCompanyId,
        addDto,
      );

      expect(result).toEqual(mockComparisonData);
      expect(comparisonService.addItem).toHaveBeenCalledWith(mockComparisonId, addDto);
    });

    it('should add item with all optional fields', async () => {
      const fullDto = {
        productId: mockProductId,
        variantId: 'variant-1',
        position: 2,
      };
      comparisonService.getComparisonById.mockResolvedValue(mockComparisonData);
      comparisonService.addItem.mockResolvedValue(mockComparisonData);

      await controller.addItem(mockComparisonId, mockSessionToken, mockCompanyId, fullDto);

      expect(comparisonService.addItem).toHaveBeenCalledWith(mockComparisonId, fullDto);
    });

    it('should add item with minimal data (productId only)', async () => {
      const minimalDto = { productId: mockProductId };
      comparisonService.getComparisonById.mockResolvedValue(mockComparisonData);
      comparisonService.addItem.mockResolvedValue(mockComparisonData);

      await controller.addItem(mockComparisonId, mockSessionToken, mockCompanyId, minimalDto);

      expect(comparisonService.addItem).toHaveBeenCalledWith(mockComparisonId, minimalDto);
    });

    it('should throw ForbiddenException when session token is missing', async () => {
      await expect(
        controller.addItem(mockComparisonId, '', mockCompanyId, addDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.addItem(mockComparisonId, '', mockCompanyId, addDto),
      ).rejects.toThrow('Session token required for comparison operations');
    });

    it('should throw ForbiddenException when session token does not match', async () => {
      comparisonService.getComparisonById.mockResolvedValue(mockComparisonData);

      await expect(
        controller.addItem(mockComparisonId, 'wrong-token', mockCompanyId, addDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.addItem(mockComparisonId, 'wrong-token', mockCompanyId, addDto),
      ).rejects.toThrow('Session token mismatch - access denied');
    });

    it('should throw ForbiddenException when company ID mismatch', async () => {
      comparisonService.getComparisonById.mockResolvedValue(mockComparisonData);

      await expect(
        controller.addItem(mockComparisonId, mockSessionToken, 'wrong-company', addDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.addItem(mockComparisonId, mockSessionToken, 'wrong-company', addDto),
      ).rejects.toThrow('Access denied to this comparison');
    });

    it('should throw BadRequestException when max items limit reached', async () => {
      const comparisonAtLimit: ComparisonData = {
        ...mockComparisonData,
        items: Array(MAX_COMPARISON_ITEMS).fill({
          id: 'item-x',
          comparisonId: mockComparisonId,
          productId: 'product-x',
          productSnapshot: { name: 'Test', sku: 'SKU', price: 10, currency: 'USD' },
          position: 0,
          addedAt: new Date(),
        }),
      };
      comparisonService.getComparisonById.mockResolvedValue(comparisonAtLimit);

      await expect(
        controller.addItem(mockComparisonId, mockSessionToken, mockCompanyId, addDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.addItem(mockComparisonId, mockSessionToken, mockCompanyId, addDto),
      ).rejects.toThrow(`Maximum of ${MAX_COMPARISON_ITEMS} items allowed in comparison`);
    });
  });

  describe('removeItem', () => {
    it('should remove item from comparison with valid session token', async () => {
      const comparisonAfterRemoval = { ...mockComparisonData, items: [] };
      comparisonService.getComparisonById.mockResolvedValue(mockComparisonData);
      comparisonService.removeItem.mockResolvedValue(comparisonAfterRemoval);

      const result = await controller.removeItem(
        mockComparisonId,
        mockItemId,
        mockSessionToken,
        mockCompanyId,
      );

      expect(result.items).toHaveLength(0);
      expect(comparisonService.removeItem).toHaveBeenCalledWith(mockComparisonId, mockItemId);
    });

    it('should throw ForbiddenException when session token is missing', async () => {
      await expect(
        controller.removeItem(mockComparisonId, mockItemId, '', mockCompanyId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when session token mismatch', async () => {
      comparisonService.getComparisonById.mockResolvedValue(mockComparisonData);

      await expect(
        controller.removeItem(mockComparisonId, mockItemId, 'wrong-token', mockCompanyId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reorderItems', () => {
    const reorderDto = { itemIds: ['item-002', 'item-001'] };

    it('should reorder items with valid session token', async () => {
      comparisonService.getComparisonById.mockResolvedValue(mockComparisonData);
      comparisonService.reorderItems.mockResolvedValue(mockComparisonData);

      const result = await controller.reorderItems(
        mockComparisonId,
        mockSessionToken,
        mockCompanyId,
        reorderDto,
      );

      expect(result).toEqual(mockComparisonData);
      expect(comparisonService.reorderItems).toHaveBeenCalledWith(
        mockComparisonId,
        reorderDto,
      );
    });

    it('should throw ForbiddenException when session token is missing', async () => {
      await expect(
        controller.reorderItems(mockComparisonId, '', mockCompanyId, reorderDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when session token mismatch', async () => {
      comparisonService.getComparisonById.mockResolvedValue(mockComparisonData);

      await expect(
        controller.reorderItems(mockComparisonId, 'wrong-token', mockCompanyId, reorderDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSharedComparison', () => {
    it('should return shared comparison by share token', async () => {
      const sharedComparison = { ...mockComparisonData, isShared: true, shareToken: mockShareToken };
      comparisonService.getComparisonByShareToken.mockResolvedValue(sharedComparison);

      const result = await controller.getSharedComparison(mockShareToken);

      expect(result).toEqual(sharedComparison);
      expect(result.isShared).toBe(true);
      expect(comparisonService.getComparisonByShareToken).toHaveBeenCalledWith(mockShareToken);
    });

    it('should throw NotFoundException when shared comparison not found', async () => {
      comparisonService.getComparisonByShareToken.mockResolvedValue(null);

      await expect(controller.getSharedComparison(mockShareToken)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getSharedComparison(mockShareToken)).rejects.toThrow(
        'Shared comparison not found or has expired',
      );
    });

    it('should throw NotFoundException when share token is invalid', async () => {
      comparisonService.getComparisonByShareToken.mockResolvedValue(null);

      await expect(controller.getSharedComparison('invalid-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Security - Session Token Validation', () => {
    const addDto = { productId: mockProductId };

    it('should throw ForbiddenException when session token missing for addItem', async () => {
      await expect(
        controller.addItem(mockComparisonId, '', mockCompanyId, addDto),
      ).rejects.toThrow('Session token required for comparison operations');
    });

    it('should throw ForbiddenException when session token undefined for addItem', async () => {
      await expect(
        controller.addItem(mockComparisonId, undefined as unknown as string, mockCompanyId, addDto),
      ).rejects.toThrow('Session token required for comparison operations');
    });

    it('should throw NotFoundException when comparison not found during validation', async () => {
      comparisonService.getComparisonById.mockResolvedValue(null as unknown as ComparisonData);

      await expect(
        controller.addItem(mockComparisonId, mockSessionToken, mockCompanyId, addDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when company ID mismatch for removeItem', async () => {
      comparisonService.getComparisonById.mockResolvedValue(mockComparisonData);

      await expect(
        controller.removeItem(mockComparisonId, mockItemId, mockSessionToken, 'wrong-company'),
      ).rejects.toThrow('Access denied to this comparison');
    });

    it('should throw ForbiddenException when session token mismatch for reorderItems', async () => {
      comparisonService.getComparisonById.mockResolvedValue(mockComparisonData);

      await expect(
        controller.reorderItems(mockComparisonId, 'wrong-token', mockCompanyId, {
          itemIds: ['item-1'],
        }),
      ).rejects.toThrow('Session token mismatch - access denied');
    });
  });
});

describe('ComparisonController - Edge Cases', () => {
  let controller: ComparisonController;
  let comparisonService: jest.Mocked<ComparisonService>;

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
      controllers: [ComparisonController],
      providers: [
        {
          provide: ComparisonService,
          useValue: {
            getComparisonByCustomerId: jest.fn(),
            getComparisonById: jest.fn(),
            getOrCreateComparison: jest.fn(),
            addItem: jest.fn(),
            removeItem: jest.fn(),
            reorderItems: jest.fn(),
            updateComparison: jest.fn(),
            clearComparison: jest.fn(),
            shareComparison: jest.fn(),
            unshareComparison: jest.fn(),
            mergeComparisons: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ComparisonController>(ComparisonController);
    comparisonService = module.get(ComparisonService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User with undefined companyId', () => {
    it('should handle user without companyId in getComparison', async () => {
      const userNoCompany = { ...mockUser, companyId: undefined };
      comparisonService.getComparisonByCustomerId.mockResolvedValue(null);
      comparisonService.getOrCreateComparison.mockResolvedValue({
        id: 'comparison-1',
        companyId: userNoCompany.scopeId,
        isShared: false,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ComparisonData);

      const result = await controller.getComparison(userNoCompany, {});

      expect(comparisonService.getComparisonByCustomerId).toHaveBeenCalledWith(
        userNoCompany.id,
        undefined,
      );
    });
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

      const mockComparison: ComparisonData = {
        id: 'comparison-1',
        companyId: 'company-abc',
        customerId: 'user-client',
        isShared: false,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      comparisonService.getComparisonByCustomerId.mockResolvedValue(mockComparison);

      const result = await controller.getComparison(clientUser, {});

      expect(result).toEqual(mockComparison);
      expect(comparisonService.getComparisonByCustomerId).toHaveBeenCalledWith(
        'user-client',
        'company-abc',
      );
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

      const mockComparison: ComparisonData = {
        id: 'comparison-1',
        companyId: 'org-123',
        customerId: 'user-org',
        isShared: false,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      comparisonService.getComparisonByCustomerId.mockResolvedValue(null);
      comparisonService.getOrCreateComparison.mockResolvedValue(mockComparison);

      const result = await controller.getComparison(orgUser, {});

      expect(result).toEqual(mockComparison);
      // Note: companyId is undefined for org users without companyId
      expect(comparisonService.getComparisonByCustomerId).toHaveBeenCalledWith('user-org', undefined);
    });
  });

  describe('User ID usage for audit logging', () => {
    it('should use user.id as actorId for addItem', async () => {
      const mockComparison: ComparisonData = {
        id: 'comparison-1',
        companyId: 'company-123',
        isShared: false,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      comparisonService.getOrCreateComparison.mockResolvedValue(mockComparison);
      comparisonService.addItem.mockResolvedValue(mockComparison);

      await controller.addItem(mockUser, { productId: 'prod-1' });

      // Verify user.id is passed as actorId
      expect(comparisonService.addItem).toHaveBeenCalledWith(
        'comparison-1',
        { productId: 'prod-1' },
        'user-1',
      );
    });

    it('should use user.id as actorId for removeItem', async () => {
      const mockComparison: ComparisonData = {
        id: 'comparison-1',
        companyId: 'company-123',
        isShared: false,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      comparisonService.getComparisonByCustomerId.mockResolvedValue(mockComparison);
      comparisonService.removeItem.mockResolvedValue(mockComparison);

      await controller.removeItem(mockUser, 'item-1');

      expect(comparisonService.removeItem).toHaveBeenCalledWith('comparison-1', 'item-1', 'user-1');
    });

    it('should use user.id as actorId for clearComparison', async () => {
      const mockComparison: ComparisonData = {
        id: 'comparison-1',
        companyId: 'company-123',
        isShared: false,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      comparisonService.getComparisonByCustomerId.mockResolvedValue(mockComparison);
      comparisonService.clearComparison.mockResolvedValue(mockComparison);

      await controller.clearComparison(mockUser);

      expect(comparisonService.clearComparison).toHaveBeenCalledWith('comparison-1', 'user-1');
    });
  });

  describe('Comparison with maximum items', () => {
    it('should allow adding item when comparison has fewer than max items', async () => {
      const comparisonBelowLimit: ComparisonData = {
        id: 'comparison-1',
        companyId: 'company-123',
        isShared: false,
        items: Array(MAX_COMPARISON_ITEMS - 1).fill({
          id: 'item-x',
          comparisonId: 'comparison-1',
          productId: 'product-x',
          productSnapshot: { name: 'Test', sku: 'SKU', price: 10, currency: 'USD' },
          position: 0,
          addedAt: new Date(),
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      comparisonService.getOrCreateComparison.mockResolvedValue(comparisonBelowLimit);
      comparisonService.addItem.mockResolvedValue(comparisonBelowLimit);

      // Should not throw
      await expect(
        controller.addItem(mockUser, { productId: 'new-product' }),
      ).resolves.toBeDefined();
    });

    it('should throw when adding item at exact max limit', async () => {
      const comparisonAtLimit: ComparisonData = {
        id: 'comparison-1',
        companyId: 'company-123',
        isShared: false,
        items: Array(MAX_COMPARISON_ITEMS).fill({
          id: 'item-x',
          comparisonId: 'comparison-1',
          productId: 'product-x',
          productSnapshot: { name: 'Test', sku: 'SKU', price: 10, currency: 'USD' },
          position: 0,
          addedAt: new Date(),
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      comparisonService.getOrCreateComparison.mockResolvedValue(comparisonAtLimit);

      await expect(controller.addItem(mockUser, { productId: 'new-product' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

describe('PublicComparisonController - Edge Cases', () => {
  let controller: PublicComparisonController;
  let comparisonService: jest.Mocked<ComparisonService>;

  const mockCompanyId = 'company-123';
  const mockSessionToken = 'session-token-abc123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicComparisonController],
      providers: [
        {
          provide: ComparisonService,
          useValue: {
            getComparisonById: jest.fn(),
            getComparisonBySessionToken: jest.fn(),
            getComparisonByShareToken: jest.fn(),
            getOrCreateComparison: jest.fn(),
            addItem: jest.fn(),
            removeItem: jest.fn(),
            reorderItems: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PublicComparisonController>(PublicComparisonController);
    comparisonService = module.get(ComparisonService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Whitespace handling in headers', () => {
    it('should handle whitespace-only session token as truthy', async () => {
      await controller.getComparison('   ', mockCompanyId);

      // Whitespace is truthy, so it will attempt to fetch
      expect(comparisonService.getComparisonBySessionToken).toHaveBeenCalledWith(
        '   ',
        mockCompanyId,
      );
    });

    it('should handle whitespace-only company ID as truthy', async () => {
      await controller.getComparison(mockSessionToken, '   ');

      expect(comparisonService.getComparisonBySessionToken).toHaveBeenCalledWith(
        mockSessionToken,
        '   ',
      );
    });
  });

  describe('Unicode handling', () => {
    it('should handle unicode characters in comparison name', async () => {
      const mockComparison: ComparisonData = {
        id: 'comparison-1',
        companyId: mockCompanyId,
        sessionToken: mockSessionToken,
        isShared: false,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      comparisonService.getOrCreateComparison.mockResolvedValue(mockComparison);

      const createDto = {
        name: 'My Comparison List - Summer Sale!',
      };

      await controller.createComparison(mockCompanyId, createDto);

      expect(comparisonService.getOrCreateComparison).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          name: 'My Comparison List - Summer Sale!',
        }),
      );
    });
  });

  describe('Long strings handling', () => {
    it('should handle long comparison name', async () => {
      const mockComparison: ComparisonData = {
        id: 'comparison-1',
        companyId: mockCompanyId,
        sessionToken: mockSessionToken,
        isShared: false,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      comparisonService.getOrCreateComparison.mockResolvedValue(mockComparison);

      const longName = 'A'.repeat(100); // Max length is 100 per DTO validation
      const createDto = { name: longName };

      await controller.createComparison(mockCompanyId, createDto);

      expect(comparisonService.getOrCreateComparison).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          name: longName,
        }),
      );
    });
  });

  describe('Empty items array handling', () => {
    it('should handle reorder with empty itemIds array', async () => {
      const mockComparison: ComparisonData = {
        id: 'comparison-1',
        companyId: mockCompanyId,
        sessionToken: mockSessionToken,
        isShared: false,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      comparisonService.getComparisonById.mockResolvedValue(mockComparison);
      comparisonService.reorderItems.mockResolvedValue(mockComparison);

      const reorderDto = { itemIds: [] };

      await controller.reorderItems('comparison-1', mockSessionToken, mockCompanyId, reorderDto);

      expect(comparisonService.reorderItems).toHaveBeenCalledWith('comparison-1', reorderDto);
    });
  });

  describe('Shared comparison edge cases', () => {
    it('should return comparison data for valid share token', async () => {
      const sharedComparison: ComparisonData = {
        id: 'comparison-shared',
        companyId: mockCompanyId,
        isShared: true,
        shareToken: 'valid-share-token',
        items: [
          {
            id: 'item-1',
            comparisonId: 'comparison-shared',
            productId: 'product-1',
            productSnapshot: { name: 'Product', sku: 'SKU', price: 99, currency: 'USD' },
            position: 0,
            addedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      comparisonService.getComparisonByShareToken.mockResolvedValue(sharedComparison);

      const result = await controller.getSharedComparison('valid-share-token');

      expect(result.items).toHaveLength(1);
      expect(result.isShared).toBe(true);
    });

    it('should throw for expired share token', async () => {
      comparisonService.getComparisonByShareToken.mockResolvedValue(null);

      await expect(controller.getSharedComparison('expired-token')).rejects.toThrow(
        'Shared comparison not found or has expired',
      );
    });

    it('should throw for empty share token', async () => {
      comparisonService.getComparisonByShareToken.mockResolvedValue(null);

      await expect(controller.getSharedComparison('')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Validation at boundary conditions', () => {
    it('should validate session token before calling service methods', async () => {
      // Session token validation should happen before any service calls
      await expect(
        controller.addItem('comparison-1', '', mockCompanyId, { productId: 'p1' }),
      ).rejects.toThrow(ForbiddenException);

      // Service should never be called when session token is missing
      expect(comparisonService.getComparisonById).not.toHaveBeenCalled();
      expect(comparisonService.addItem).not.toHaveBeenCalled();
    });

    it('should validate comparison exists before checking session token match', async () => {
      comparisonService.getComparisonById.mockResolvedValue(null as unknown as ComparisonData);

      await expect(
        controller.addItem('nonexistent-comparison', mockSessionToken, mockCompanyId, {
          productId: 'p1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate company ID before checking session token match', async () => {
      const mockComparison: ComparisonData = {
        id: 'comparison-1',
        companyId: 'different-company',
        sessionToken: mockSessionToken,
        isShared: false,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      comparisonService.getComparisonById.mockResolvedValue(mockComparison);

      await expect(
        controller.addItem('comparison-1', mockSessionToken, mockCompanyId, { productId: 'p1' }),
      ).rejects.toThrow('Access denied to this comparison');
    });
  });
});

describe('ComparisonController - Authorization Scenarios', () => {
  let controller: ComparisonController;
  let comparisonService: jest.Mocked<ComparisonService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComparisonController],
      providers: [
        {
          provide: ComparisonService,
          useValue: {
            getComparisonByCustomerId: jest.fn(),
            getComparisonById: jest.fn(),
            getOrCreateComparison: jest.fn(),
            addItem: jest.fn(),
            removeItem: jest.fn(),
            reorderItems: jest.fn(),
            updateComparison: jest.fn(),
            clearComparison: jest.fn(),
            shareComparison: jest.fn(),
            unshareComparison: jest.fn(),
            mergeComparisons: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ComparisonController>(ComparisonController);
    comparisonService = module.get(ComparisonService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Merge comparisons authorization', () => {
    it('should allow merging when user has access to both comparisons', async () => {
      const mockUser: AuthenticatedUser = {
        id: 'user-1',
        sub: 'user-1',
        email: 'user@example.com',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-123',
        companyId: 'company-123',
        role: 'USER',
      };

      const userComparison: ComparisonData = {
        id: 'user-comparison',
        companyId: 'company-123',
        customerId: 'user-1',
        isShared: false,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mergedComparison: ComparisonData = {
        ...userComparison,
        items: [
          {
            id: 'merged-item',
            comparisonId: 'user-comparison',
            productId: 'product-from-guest',
            productSnapshot: { name: 'Guest Product', sku: 'G-SKU', price: 30, currency: 'USD' },
            position: 0,
            addedAt: new Date(),
          },
        ],
      };

      comparisonService.getOrCreateComparison.mockResolvedValue(userComparison);
      comparisonService.mergeComparisons.mockResolvedValue(mergedComparison);

      const mergeDto = { sourceComparisonId: 'guest-comparison' };
      const result = await controller.mergeComparisons(mockUser, mergeDto);

      expect(result.items).toHaveLength(1);
      expect(comparisonService.mergeComparisons).toHaveBeenCalledWith(
        'guest-comparison',
        'user-comparison',
        'user-1',
      );
    });
  });

  describe('Share link authorization', () => {
    it('should allow creating share link for own comparison', async () => {
      const mockUser: AuthenticatedUser = {
        id: 'user-share',
        sub: 'user-share',
        email: 'share@example.com',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-123',
        companyId: 'company-123',
        role: 'USER',
      };

      const mockComparison: ComparisonData = {
        id: 'comparison-to-share',
        companyId: 'company-123',
        customerId: 'user-share',
        isShared: false,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const shareResult: ShareComparisonResult = {
        comparisonId: 'comparison-to-share',
        shareToken: 'new-share-token',
        shareUrl: 'http://localhost:3003/compare/new-share-token',
        expiresAt: new Date(),
      };

      comparisonService.getComparisonByCustomerId.mockResolvedValue(mockComparison);
      comparisonService.shareComparison.mockResolvedValue(shareResult);

      const shareDto = { expiresInDays: 14 };
      const result = await controller.shareComparison(mockUser, shareDto);

      expect(result.shareToken).toBe('new-share-token');
      expect(comparisonService.shareComparison).toHaveBeenCalledWith(
        'comparison-to-share',
        shareDto,
        'user-share',
      );
    });

    it('should allow removing share link from own comparison', async () => {
      const mockUser: AuthenticatedUser = {
        id: 'user-unshare',
        sub: 'user-unshare',
        email: 'unshare@example.com',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-123',
        companyId: 'company-123',
        role: 'USER',
      };

      const sharedComparison: ComparisonData = {
        id: 'comparison-shared',
        companyId: 'company-123',
        customerId: 'user-unshare',
        isShared: true,
        shareToken: 'existing-token',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const unsharedComparison: ComparisonData = {
        ...sharedComparison,
        isShared: false,
        shareToken: undefined,
      };

      comparisonService.getComparisonByCustomerId.mockResolvedValue(sharedComparison);
      comparisonService.unshareComparison.mockResolvedValue(unsharedComparison);

      const result = await controller.unshareComparison(mockUser);

      expect(result.isShared).toBe(false);
      expect(result.shareToken).toBeUndefined();
    });
  });
});
