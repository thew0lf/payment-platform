/**
 * Recommendations Controller Unit Tests
 *
 * Comprehensive tests for recommendation endpoints including:
 * - Public recommendation endpoints
 * - Tracking endpoints (view, click, add to cart)
 * - Admin configuration endpoints
 * - Authorization/access control
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { ProductRecommendationService } from '../services/product-recommendation.service';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { RecommendationConfigData } from '../types/recommendation.types';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let recommendationService: {
    getProductPageRecommendations: jest.Mock;
    getRecommendationConfig: jest.Mock;
    getAlsoBoughtRecommendations: jest.Mock;
    getYouMightLikeRecommendations: jest.Mock;
    getFrequentlyViewedRecommendations: jest.Mock;
    updateRecommendationConfig: jest.Mock;
    trackProductView: jest.Mock;
    trackRecommendationClick: jest.Mock;
    trackRecommendationAddToCart: jest.Mock;
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockProductId = 'product-001';
  const mockCompanyId = 'company-123';
  const mockCustomerId = 'customer-456';
  const mockSessionId = 'session-789';

  const createMockUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
    sub: 'user-123',
    id: 'user-123',
    email: 'test@example.com',
    role: 'ADMIN',
    scopeType: 'COMPANY',
    scopeId: mockCompanyId,
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: mockCompanyId,
    departmentId: undefined,
    ...overrides,
  });

  const createMockRecommendations = () => ({
    alsoBought: {
      type: 'ALSO_BOUGHT',
      title: 'Customers Who Bought This Also Bought',
      products: [],
      displayStyle: 'CAROUSEL',
    },
    youMightLike: {
      type: 'YOU_MIGHT_LIKE',
      title: 'Recommended For You',
      products: [],
      displayStyle: 'GRID',
      personalized: true,
    },
    frequentlyViewed: null,
  });

  const createMockConfig = (): RecommendationConfigData => ({
    companyId: mockCompanyId,
    alsoBought: {
      enabled: true,
      title: 'Customers Who Bought This Also Bought',
      minCoOccurrences: 5,
      lookbackDays: 90,
      maxResults: 10,
      displayStyle: 'CAROUSEL',
      useAIRanking: false,
      excludeCategories: [],
      boostHighMargin: true,
      boostInStock: true,
      showRatings: true,
      showQuickAdd: true,
    },
    youMightLike: {
      enabled: true,
      title: 'Recommended For You',
      titleForGuests: 'You Might Also Like',
      maxResults: 8,
      displayStyle: 'GRID',
      browsingWeight: 0.3,
      purchaseWeight: 0.4,
      contentWeight: 0.3,
      diversityFactor: 0.5,
      excludeRecentlyViewed: true,
      excludePurchased: true,
      showPersonalizationBadge: true,
    },
    frequentlyViewed: {
      enabled: true,
      title: 'Frequently Viewed Together',
      minSessionCoViews: 10,
      lookbackDays: 60,
      maxBundleSize: 3,
      bundleDiscountPercent: 10,
      showBundleSavings: true,
      showAddAllButton: true,
      displayStyle: 'BUNDLE_CARDS',
    },
    global: {
      maxSectionsPerPage: 3,
      respectInventory: true,
      minRatingToShow: 0,
      trackImpressions: true,
      trackClicks: true,
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    recommendationService = {
      getProductPageRecommendations: jest.fn(),
      getRecommendationConfig: jest.fn(),
      getAlsoBoughtRecommendations: jest.fn(),
      getYouMightLikeRecommendations: jest.fn(),
      getFrequentlyViewedRecommendations: jest.fn(),
      updateRecommendationConfig: jest.fn(),
      trackProductView: jest.fn(),
      trackRecommendationClick: jest.fn(),
      trackRecommendationAddToCart: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        { provide: ProductRecommendationService, useValue: recommendationService },
      ],
    }).compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getProductRecommendations', () => {
    it('should return recommendations for a product', async () => {
      const mockRecommendations = createMockRecommendations();
      recommendationService.getProductPageRecommendations.mockResolvedValue(mockRecommendations);

      const query = { customerId: mockCustomerId, sessionId: mockSessionId };
      const result = await controller.getProductRecommendations(
        mockProductId,
        mockCompanyId,
        query,
      );

      expect(result).toEqual(mockRecommendations);
      expect(recommendationService.getProductPageRecommendations).toHaveBeenCalledWith(
        mockProductId,
        mockCompanyId,
        mockCustomerId,
        mockSessionId,
      );
    });

    it('should work without customer and session IDs', async () => {
      const mockRecommendations = createMockRecommendations();
      recommendationService.getProductPageRecommendations.mockResolvedValue(mockRecommendations);

      const query = {};
      await controller.getProductRecommendations(mockProductId, mockCompanyId, query);

      expect(recommendationService.getProductPageRecommendations).toHaveBeenCalledWith(
        mockProductId,
        mockCompanyId,
        undefined,
        undefined,
      );
    });
  });

  describe('getAlsoBoughtRecommendations', () => {
    it('should return also bought recommendations', async () => {
      const mockConfig = createMockConfig();
      const mockSection = {
        type: 'ALSO_BOUGHT',
        title: 'Customers Who Bought This Also Bought',
        products: [],
        displayStyle: 'CAROUSEL',
      };
      recommendationService.getRecommendationConfig.mockResolvedValue(mockConfig);
      recommendationService.getAlsoBoughtRecommendations.mockResolvedValue(mockSection);

      const result = await controller.getAlsoBoughtRecommendations(mockProductId, mockCompanyId);

      expect(result).toEqual(mockSection);
      expect(recommendationService.getRecommendationConfig).toHaveBeenCalledWith(mockCompanyId);
      expect(recommendationService.getAlsoBoughtRecommendations).toHaveBeenCalledWith(
        mockProductId,
        mockCompanyId,
        mockConfig.alsoBought,
      );
    });
  });

  describe('getYouMightLikeRecommendations', () => {
    it('should return you might like recommendations', async () => {
      const mockConfig = createMockConfig();
      const mockSection = {
        type: 'YOU_MIGHT_LIKE',
        title: 'Recommended For You',
        products: [],
        displayStyle: 'GRID',
      };
      recommendationService.getRecommendationConfig.mockResolvedValue(mockConfig);
      recommendationService.getYouMightLikeRecommendations.mockResolvedValue(mockSection);

      const result = await controller.getYouMightLikeRecommendations(
        mockProductId,
        mockCompanyId,
        mockCustomerId,
        mockSessionId,
      );

      expect(result).toEqual(mockSection);
      expect(recommendationService.getYouMightLikeRecommendations).toHaveBeenCalledWith(
        mockProductId,
        mockCompanyId,
        mockCustomerId,
        mockSessionId,
        mockConfig.youMightLike,
      );
    });
  });

  describe('getFrequentlyViewedRecommendations', () => {
    it('should return frequently viewed recommendations', async () => {
      const mockConfig = createMockConfig();
      const mockSection = {
        type: 'FREQUENTLY_VIEWED',
        title: 'Frequently Viewed Together',
        bundles: [],
        displayStyle: 'BUNDLE_CARDS',
      };
      recommendationService.getRecommendationConfig.mockResolvedValue(mockConfig);
      recommendationService.getFrequentlyViewedRecommendations.mockResolvedValue(mockSection);

      const result = await controller.getFrequentlyViewedRecommendations(
        mockProductId,
        mockCompanyId,
      );

      expect(result).toEqual(mockSection);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TRACKING ENDPOINTS TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('trackProductView', () => {
    it('should track product view', async () => {
      recommendationService.trackProductView.mockResolvedValue(undefined);

      const dto = {
        productId: mockProductId,
        sessionId: mockSessionId,
        customerId: mockCustomerId,
        source: 'DIRECT',
        duration: 30,
      };
      const result = await controller.trackProductView(dto, mockCompanyId);

      expect(result).toEqual({ success: true });
      expect(recommendationService.trackProductView).toHaveBeenCalledWith({
        productId: mockProductId,
        companyId: mockCompanyId,
        sessionId: mockSessionId,
        customerId: mockCustomerId,
        source: 'DIRECT',
        sourceProductId: undefined,
        duration: 30,
      });
    });

    it('should handle optional fields', async () => {
      recommendationService.trackProductView.mockResolvedValue(undefined);

      const dto = {
        productId: mockProductId,
        sessionId: mockSessionId,
      };
      await controller.trackProductView(dto, mockCompanyId);

      expect(recommendationService.trackProductView).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: mockProductId,
          sessionId: mockSessionId,
          customerId: undefined,
        }),
      );
    });
  });

  describe('trackClick', () => {
    it('should track recommendation click', async () => {
      recommendationService.trackRecommendationClick.mockResolvedValue(undefined);

      const dto = {
        impressionId: 'impression-123',
        clickedProductId: 'product-456',
      };
      const result = await controller.trackClick(dto);

      expect(result).toEqual({ success: true });
      expect(recommendationService.trackRecommendationClick).toHaveBeenCalledWith(
        'impression-123',
        'product-456',
      );
    });
  });

  describe('trackAddToCart', () => {
    it('should track add to cart from recommendation', async () => {
      recommendationService.trackRecommendationAddToCart.mockResolvedValue(undefined);

      const dto = { impressionId: 'impression-123' };
      const result = await controller.trackAddToCart(dto);

      expect(result).toEqual({ success: true });
      expect(recommendationService.trackRecommendationAddToCart).toHaveBeenCalledWith(
        'impression-123',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ADMIN ENDPOINTS TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getConfig', () => {
    it('should return recommendation config for company', async () => {
      const mockConfig = createMockConfig();
      const mockUser = createMockUser();
      recommendationService.getRecommendationConfig.mockResolvedValue(mockConfig);

      const result = await controller.getConfig(mockUser);

      expect(result).toEqual(mockConfig);
      expect(recommendationService.getRecommendationConfig).toHaveBeenCalledWith(mockCompanyId);
    });

    it('should throw ForbiddenException when no company context', async () => {
      const mockUser = createMockUser({ scopeType: 'ORGANIZATION', scopeId: 'org-1', companyId: undefined });

      await expect(controller.getConfig(mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateConfig', () => {
    it('should update recommendation config', async () => {
      const mockConfig = createMockConfig();
      const mockUser = createMockUser();
      recommendationService.updateRecommendationConfig.mockResolvedValue(mockConfig);

      const dto = { alsoBought: { enabled: false } };
      const result = await controller.updateConfig(mockUser, dto);

      expect(result).toEqual(mockConfig);
      expect(recommendationService.updateRecommendationConfig).toHaveBeenCalledWith(
        mockCompanyId,
        dto,
      );
    });

    it('should throw ForbiddenException when no company context', async () => {
      const mockUser = createMockUser({ scopeType: 'ORGANIZATION', scopeId: 'org-1', companyId: undefined });

      await expect(controller.updateConfig(mockUser, {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('previewRecommendations', () => {
    it('should return preview recommendations for admin', async () => {
      const mockRecommendations = createMockRecommendations();
      const mockUser = createMockUser();
      recommendationService.getProductPageRecommendations.mockResolvedValue(mockRecommendations);

      const result = await controller.previewRecommendations(mockUser, mockProductId);

      expect(result).toEqual(mockRecommendations);
      expect(recommendationService.getProductPageRecommendations).toHaveBeenCalledWith(
        mockProductId,
        mockCompanyId,
      );
    });

    it('should throw ForbiddenException when no company context', async () => {
      const mockUser = createMockUser({ scopeType: 'ORGANIZATION', scopeId: 'org-1', companyId: undefined });

      await expect(controller.previewRecommendations(mockUser, mockProductId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ACCESS CONTROL TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Access Control', () => {
    it('should extract companyId from scopeId when scopeType is COMPANY', async () => {
      const mockConfig = createMockConfig();
      const mockUser = createMockUser({ scopeType: 'COMPANY', scopeId: 'company-999' });
      recommendationService.getRecommendationConfig.mockResolvedValue(mockConfig);

      await controller.getConfig(mockUser);

      expect(recommendationService.getRecommendationConfig).toHaveBeenCalledWith('company-999');
    });

    it('should fall back to companyId when scopeType is not COMPANY', async () => {
      const mockConfig = createMockConfig();
      const mockUser = createMockUser({ scopeType: 'CLIENT', scopeId: 'client-1', companyId: 'company-from-context' });
      recommendationService.getRecommendationConfig.mockResolvedValue(mockConfig);

      await controller.getConfig(mockUser);

      expect(recommendationService.getRecommendationConfig).toHaveBeenCalledWith('company-from-context');
    });
  });
});
