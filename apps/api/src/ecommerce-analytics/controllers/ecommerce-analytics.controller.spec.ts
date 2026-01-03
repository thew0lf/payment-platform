import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  AnalyticsEventType,
  TrackEventInput,
  EcommerceOverviewData,
  AdminEcommerceOverviewData,
  CartAnalyticsData,
  WishlistAnalyticsData,
  ComparisonAnalyticsData,
  CrossSiteSessionAnalyticsData,
} from '../types/ecommerce-analytics.types';

// Mock the EcommerceAnalyticsService before importing controller
jest.mock('../services/ecommerce-analytics.service', () => {
  return {
    EcommerceAnalyticsService: jest.fn().mockImplementation(() => ({
      getOverview: jest.fn(),
      getAdminOverview: jest.fn(),
      getAbandonmentTimeSeries: jest.fn(),
      getRecoveryAnalytics: jest.fn(),
      getCartValueDistribution: jest.fn(),
      getFunnelDropoff: jest.fn(),
      getCartAnalytics: jest.fn(),
      getWishlistAnalytics: jest.fn(),
      getComparisonAnalytics: jest.fn(),
      getCrossSiteSessionAnalytics: jest.fn(),
      trackEvent: jest.fn(),
    })),
  };
});

// Import after mock
import { EcommerceAnalyticsController } from './ecommerce-analytics.controller';
import { EcommerceAnalyticsService } from '../services/ecommerce-analytics.service';

describe('EcommerceAnalyticsController', () => {
  let controller: EcommerceAnalyticsController;
  let analyticsService: jest.Mocked<EcommerceAnalyticsService>;
  let hierarchyService: jest.Mocked<HierarchyService>;

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA FACTORIES
  // ═══════════════════════════════════════════════════════════════

  const mockCompanyId = 'company_123';
  const mockClientId = 'client_456';
  const mockUserId = 'user_789';
  const mockOtherCompanyId = 'other_company_999';
  const mockOrgId = 'org_123';

  const createMockUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
    sub: mockUserId,
    id: mockUserId,
    email: 'test@example.com',
    role: 'ADMIN',
    organizationId: mockOrgId,
    clientId: mockClientId,
    companyId: mockCompanyId,
    scopeType: 'COMPANY',
    scopeId: mockCompanyId,
    ...overrides,
  } as AuthenticatedUser);

  const mockDateRange = {
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
  };

  const mockOverviewData: EcommerceOverviewData = {
    companyId: mockCompanyId,
    dateRange: mockDateRange,
    cart: {
      totalCarts: 100,
      activeCarts: 25,
      abandonedCarts: 40,
      convertedCarts: 35,
      abandonmentRate: 0.4,
      conversionRate: 0.35,
      averageCartValue: 75.5,
      averageItemsPerCart: 3.2,
    },
    wishlist: {
      totalWishlists: 50,
      activeWishlists: 30,
      totalItems: 150,
      averageItemsPerWishlist: 3,
      moveToCartRate: 0.25,
      purchaseFromWishlistRate: 0.15,
    },
    comparison: {
      totalComparisons: 80,
      activeComparisons: 45,
      averageProductsPerComparison: 2.5,
      comparisonToCartRate: 0.3,
      comparisonToWishlistRate: 0.1,
    },
    crossSiteSession: {
      totalSessions: 500,
      activeSessions: 120,
      averageSessionDuration: 1800,
      crossSiteTransferRate: 0.15,
      sessionMergeRate: 0.05,
      returningVisitorRate: 0.4,
    },
    trends: {
      cartConversionTrend: 5.2,
      wishlistGrowthTrend: 10.5,
      comparisonEngagementTrend: -2.3,
      crossSiteEngagementTrend: 8.1,
    },
  };

  const mockAdminOverviewData: AdminEcommerceOverviewData = {
    companyId: mockCompanyId,
    dateRange: mockDateRange,
    totalCarts: 100,
    activeCarts: 25,
    abandonedCarts: 40,
    convertedCarts: 35,
    abandonmentRate: 0.4,
    conversionRate: 0.35,
    averageCartValue: 75.5,
    totalCartValue: 7550,
    potentialRevenueLost: 3020,
    recoveredCarts: 15,
    recoveryRate: 0.375,
    totalValueRecovered: 1132.5,
    totalFunnelSessions: 500,
    funnelCompletionRate: 0.35,
    trends: {
      abandonmentRateChange: -5.2,
      conversionRateChange: 10.5,
      cartValueChange: 8.1,
      recoveryRateChange: 2.3,
    },
  };

  const mockCartAnalytics: CartAnalyticsData = {
    companyId: mockCompanyId,
    siteId: 'site_1',
    dateRange: mockDateRange,
    totalCarts: 100,
    activeCarts: 25,
    abandonedCarts: 40,
    convertedCarts: 35,
    abandonmentRate: 0.4,
    conversionRate: 0.35,
    averageCartValue: 75.5,
    averageItemsPerCart: 3.2,
    addToCartEvents: 250,
    removeFromCartEvents: 50,
    bundleAddEvents: 10,
    discountAppliedEvents: 30,
    saveForLaterEvents: 15,
    cartValueOverTime: [
      { date: '2025-01-01', value: 70 },
      { date: '2025-01-15', value: 80 },
    ],
    conversionFunnel: {
      cartsCreated: 100,
      cartsWithItems: 85,
      checkoutStarted: 60,
      checkoutCompleted: 35,
    },
    topAbandonedProducts: [
      { productId: 'prod_1', productName: 'Product 1', abandonmentCount: 15 },
    ],
  };

  const mockWishlistAnalytics: WishlistAnalyticsData = {
    companyId: mockCompanyId,
    siteId: 'site_1',
    dateRange: mockDateRange,
    totalWishlists: 50,
    activeWishlists: 30,
    totalItems: 150,
    averageItemsPerWishlist: 3,
    moveToCartRate: 0.25,
    purchaseFromWishlistRate: 0.15,
    addToWishlistEvents: 200,
    removeFromWishlistEvents: 30,
    moveToCartEvents: 50,
    purchaseFromWishlistEvents: 25,
    wishlistActivityOverTime: [
      { date: '2025-01-01', value: 10 },
      { date: '2025-01-15', value: 20 },
    ],
    topWishlistedProducts: [
      { productId: 'prod_1', productName: 'Product 1', wishlistCount: 25, conversionCount: 5 },
    ],
    categoryBreakdown: [
      { categoryId: 'cat_1', categoryName: 'Electronics', itemCount: 50 },
    ],
  };

  const mockComparisonAnalytics: ComparisonAnalyticsData = {
    companyId: mockCompanyId,
    siteId: 'site_1',
    dateRange: mockDateRange,
    totalComparisons: 80,
    activeComparisons: 45,
    averageProductsPerComparison: 2.5,
    comparisonToCartRate: 0.3,
    comparisonToWishlistRate: 0.1,
    addToComparisonEvents: 150,
    removeFromComparisonEvents: 20,
    comparisonViewEvents: 300,
    comparisonShareEvents: 10,
    comparisonActivityOverTime: [
      { date: '2025-01-01', value: 15 },
      { date: '2025-01-15', value: 25 },
    ],
    mostComparedProducts: [
      { productId: 'prod_1', productName: 'Product 1', comparisonCount: 30, winRate: 0.6 },
    ],
    categoryComparisonBreakdown: [
      { categoryId: 'cat_1', categoryName: 'Electronics', comparisonCount: 40 },
    ],
  };

  const mockCrossSiteSessionAnalytics: CrossSiteSessionAnalyticsData = {
    companyId: mockCompanyId,
    dateRange: mockDateRange,
    totalSessions: 500,
    activeSessions: 120,
    averageSessionDuration: 1800,
    crossSiteTransferRate: 0.15,
    sessionMergeRate: 0.05,
    returningVisitorRate: 0.4,
    sessionCreatedEvents: 500,
    sessionTransferEvents: 75,
    sessionMergeEvents: 25,
    cartSyncEvents: 100,
    wishlistSyncEvents: 50,
    sessionActivityOverTime: [
      { date: '2025-01-01', value: 50 },
      { date: '2025-01-15', value: 60 },
    ],
    siteEngagement: [
      {
        siteId: 'site_1',
        siteName: 'Main Store',
        sessionsStarted: 300,
        sessionsTransferredIn: 30,
        sessionsTransferredOut: 45,
        averageTimeOnSite: 900,
      },
    ],
    deviceBreakdown: [
      { deviceType: 'desktop', sessionCount: 300, averageDuration: 1200 },
      { deviceType: 'mobile', sessionCount: 200, averageDuration: 600 },
    ],
    crossSiteJourneys: [
      { fromSiteId: 'site_1', toSiteId: 'site_2', transferCount: 45, conversionRate: 0.2 },
    ],
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    const mockServiceInstance = {
      getOverview: jest.fn(),
      getAdminOverview: jest.fn(),
      getAbandonmentTimeSeries: jest.fn(),
      getRecoveryAnalytics: jest.fn(),
      getCartValueDistribution: jest.fn(),
      getFunnelDropoff: jest.fn(),
      getCartAnalytics: jest.fn(),
      getWishlistAnalytics: jest.fn(),
      getComparisonAnalytics: jest.fn(),
      getCrossSiteSessionAnalytics: jest.fn(),
      trackEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EcommerceAnalyticsController],
      providers: [
        {
          provide: EcommerceAnalyticsService,
          useValue: mockServiceInstance,
        },
        {
          provide: HierarchyService,
          useValue: {
            canAccessCompany: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EcommerceAnalyticsController>(EcommerceAnalyticsController);
    analyticsService = module.get(EcommerceAnalyticsService);
    hierarchyService = module.get(HierarchyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Authentication', () => {
    it('should be protected by JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', EcommerceAnalyticsController);
      expect(guards).toBeDefined();
      expect(guards).toContain(JwtAuthGuard);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // COMPANY ACCESS TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Company Access Control', () => {
    describe('COMPANY-scoped users', () => {
      it('should use user scopeId for COMPANY scope', async () => {
        const companyUser = createMockUser({ scopeType: 'COMPANY', scopeId: mockCompanyId });
        analyticsService.getAdminOverview.mockResolvedValue(mockAdminOverviewData);

        await controller.getOverview(companyUser);

        expect(analyticsService.getAdminOverview).toHaveBeenCalledWith(
          mockCompanyId,
          expect.any(Object),
        );
      });

      it('should ignore query companyId for COMPANY scope users', async () => {
        const companyUser = createMockUser({ scopeType: 'COMPANY', scopeId: mockCompanyId });
        analyticsService.getAdminOverview.mockResolvedValue(mockAdminOverviewData);

        await controller.getOverview(companyUser, mockOtherCompanyId);

        expect(analyticsService.getAdminOverview).toHaveBeenCalledWith(
          mockCompanyId,
          expect.any(Object),
        );
        expect(hierarchyService.canAccessCompany).not.toHaveBeenCalled();
      });
    });

    describe('ORG/CLIENT-scoped users with companyId query param', () => {
      it('should allow ORG user to access company after validation', async () => {
        const orgUser = createMockUser({
          scopeType: 'ORGANIZATION',
          scopeId: mockOrgId,
          companyId: undefined,
        });
        hierarchyService.canAccessCompany.mockResolvedValue(true);
        analyticsService.getAdminOverview.mockResolvedValue(mockAdminOverviewData);

        await controller.getOverview(orgUser, mockCompanyId);

        expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
        expect(analyticsService.getAdminOverview).toHaveBeenCalledWith(
          mockCompanyId,
          expect.any(Object),
        );
      });

      it('should allow CLIENT user to access company after validation', async () => {
        const clientUser = createMockUser({
          scopeType: 'CLIENT',
          scopeId: mockClientId,
          companyId: undefined,
        });
        hierarchyService.canAccessCompany.mockResolvedValue(true);
        analyticsService.getAdminOverview.mockResolvedValue(mockAdminOverviewData);

        await controller.getOverview(clientUser, mockCompanyId);

        expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
        expect(analyticsService.getAdminOverview).toHaveBeenCalledWith(
          mockCompanyId,
          expect.any(Object),
        );
      });

      it('should throw ForbiddenException when ORG user accesses unauthorized company', async () => {
        const orgUser = createMockUser({
          scopeType: 'ORGANIZATION',
          scopeId: mockOrgId,
          companyId: undefined,
        });
        hierarchyService.canAccessCompany.mockResolvedValue(false);

        await expect(controller.getOverview(orgUser, mockOtherCompanyId)).rejects.toThrow(
          ForbiddenException,
        );
        await expect(controller.getOverview(orgUser, mockOtherCompanyId)).rejects.toThrow(
          'Access denied to this company',
        );
      });

      it('should throw ForbiddenException when CLIENT user accesses unauthorized company', async () => {
        const clientUser = createMockUser({
          scopeType: 'CLIENT',
          scopeId: mockClientId,
          companyId: undefined,
        });
        hierarchyService.canAccessCompany.mockResolvedValue(false);

        await expect(controller.getOverview(clientUser, mockOtherCompanyId)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('User without companyId and no query param', () => {
      it('should use user.companyId if available', async () => {
        const userWithCompany = createMockUser({
          scopeType: 'CLIENT',
          scopeId: mockClientId,
          companyId: mockCompanyId,
        });
        analyticsService.getAdminOverview.mockResolvedValue(mockAdminOverviewData);

        await controller.getOverview(userWithCompany);

        expect(analyticsService.getAdminOverview).toHaveBeenCalledWith(
          mockCompanyId,
          expect.any(Object),
        );
      });

      it('should throw ForbiddenException if no companyId available', async () => {
        const userWithoutCompany = createMockUser({
          scopeType: 'CLIENT',
          scopeId: mockClientId,
          companyId: undefined,
        });

        await expect(controller.getOverview(userWithoutCompany)).rejects.toThrow(
          ForbiddenException,
        );
        await expect(controller.getOverview(userWithoutCompany)).rejects.toThrow(
          'Company ID required',
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getOverview TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getOverview', () => {
    it('should return overview data with valid auth', async () => {
      const user = createMockUser();
      analyticsService.getAdminOverview.mockResolvedValue(mockAdminOverviewData);

      const result = await controller.getOverview(user);

      expect(analyticsService.getAdminOverview).toHaveBeenCalledWith(
        mockCompanyId,
        expect.any(Object),
      );
      expect(result).toEqual(mockAdminOverviewData);
    });

    it('should handle date range query params', async () => {
      const user = createMockUser();
      analyticsService.getAdminOverview.mockResolvedValue(mockAdminOverviewData);

      await controller.getOverview(user, undefined, '2025-01-01', '2025-01-31');

      expect(analyticsService.getAdminOverview).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      );
    });

    it('should use default date range when not provided (last 30 days)', async () => {
      const user = createMockUser();
      analyticsService.getAdminOverview.mockResolvedValue(mockAdminOverviewData);

      await controller.getOverview(user);

      const call = analyticsService.getAdminOverview.mock.calls[0];
      const dateRange = call[1];
      const daysDiff = Math.round(
        (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBe(30);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getCartAnalytics TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getCartAnalytics', () => {
    it('should return cart analytics with valid auth', async () => {
      const user = createMockUser();
      analyticsService.getCartAnalytics.mockResolvedValue(mockCartAnalytics);

      const result = await controller.getCartAnalytics(user);

      expect(analyticsService.getCartAnalytics).toHaveBeenCalledWith(
        mockCompanyId,
        expect.any(Object),
        undefined,
      );
      expect(result).toEqual(mockCartAnalytics);
    });

    it('should filter by siteId when provided', async () => {
      const user = createMockUser();
      analyticsService.getCartAnalytics.mockResolvedValue(mockCartAnalytics);

      await controller.getCartAnalytics(user, undefined, 'site_1');

      expect(analyticsService.getCartAnalytics).toHaveBeenCalledWith(
        mockCompanyId,
        expect.any(Object),
        'site_1',
      );
    });

    it('should filter by date range when provided', async () => {
      const user = createMockUser();
      analyticsService.getCartAnalytics.mockResolvedValue(mockCartAnalytics);

      await controller.getCartAnalytics(user, undefined, undefined, '2025-01-01', '2025-01-31');

      expect(analyticsService.getCartAnalytics).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
        undefined,
      );
    });

    it('should throw ForbiddenException without company access', async () => {
      const userWithoutCompany = createMockUser({
        scopeType: 'CLIENT',
        scopeId: mockClientId,
        companyId: undefined,
      });

      await expect(controller.getCartAnalytics(userWithoutCompany)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getWishlistAnalytics TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getWishlistAnalytics', () => {
    it('should return wishlist analytics with valid auth', async () => {
      const user = createMockUser();
      analyticsService.getWishlistAnalytics.mockResolvedValue(mockWishlistAnalytics);

      const result = await controller.getWishlistAnalytics(user);

      expect(analyticsService.getWishlistAnalytics).toHaveBeenCalledWith(
        mockCompanyId,
        expect.any(Object),
        undefined,
      );
      expect(result).toEqual(mockWishlistAnalytics);
    });

    it('should filter by siteId when provided', async () => {
      const user = createMockUser();
      analyticsService.getWishlistAnalytics.mockResolvedValue(mockWishlistAnalytics);

      await controller.getWishlistAnalytics(user, undefined, 'site_1');

      expect(analyticsService.getWishlistAnalytics).toHaveBeenCalledWith(
        mockCompanyId,
        expect.any(Object),
        'site_1',
      );
    });

    it('should filter by date range when provided', async () => {
      const user = createMockUser();
      analyticsService.getWishlistAnalytics.mockResolvedValue(mockWishlistAnalytics);

      await controller.getWishlistAnalytics(user, undefined, undefined, '2025-01-01', '2025-01-31');

      expect(analyticsService.getWishlistAnalytics).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
        undefined,
      );
    });

    it('should throw ForbiddenException without company access', async () => {
      const userWithoutCompany = createMockUser({
        scopeType: 'CLIENT',
        scopeId: mockClientId,
        companyId: undefined,
      });

      await expect(controller.getWishlistAnalytics(userWithoutCompany)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getComparisonAnalytics TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getComparisonAnalytics', () => {
    it('should return comparison analytics with valid auth', async () => {
      const user = createMockUser();
      analyticsService.getComparisonAnalytics.mockResolvedValue(mockComparisonAnalytics);

      const result = await controller.getComparisonAnalytics(user);

      expect(analyticsService.getComparisonAnalytics).toHaveBeenCalledWith(
        mockCompanyId,
        expect.any(Object),
        undefined,
      );
      expect(result).toEqual(mockComparisonAnalytics);
    });

    it('should filter by siteId when provided', async () => {
      const user = createMockUser();
      analyticsService.getComparisonAnalytics.mockResolvedValue(mockComparisonAnalytics);

      await controller.getComparisonAnalytics(user, undefined, 'site_1');

      expect(analyticsService.getComparisonAnalytics).toHaveBeenCalledWith(
        mockCompanyId,
        expect.any(Object),
        'site_1',
      );
    });

    it('should filter by date range when provided', async () => {
      const user = createMockUser();
      analyticsService.getComparisonAnalytics.mockResolvedValue(mockComparisonAnalytics);

      await controller.getComparisonAnalytics(
        user,
        undefined,
        undefined,
        '2025-01-01',
        '2025-01-31',
      );

      expect(analyticsService.getComparisonAnalytics).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
        undefined,
      );
    });

    it('should throw ForbiddenException without company access', async () => {
      const userWithoutCompany = createMockUser({
        scopeType: 'CLIENT',
        scopeId: mockClientId,
        companyId: undefined,
      });

      await expect(controller.getComparisonAnalytics(userWithoutCompany)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getCrossSiteSessionAnalytics TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getCrossSiteSessionAnalytics', () => {
    it('should return session analytics with valid auth', async () => {
      const user = createMockUser();
      analyticsService.getCrossSiteSessionAnalytics.mockResolvedValue(mockCrossSiteSessionAnalytics);

      const result = await controller.getCrossSiteSessionAnalytics(user);

      expect(analyticsService.getCrossSiteSessionAnalytics).toHaveBeenCalledWith(
        mockCompanyId,
        expect.any(Object),
      );
      expect(result).toEqual(mockCrossSiteSessionAnalytics);
    });

    it('should filter by date range when provided', async () => {
      const user = createMockUser();
      analyticsService.getCrossSiteSessionAnalytics.mockResolvedValue(mockCrossSiteSessionAnalytics);

      await controller.getCrossSiteSessionAnalytics(user, undefined, '2025-01-01', '2025-01-31');

      expect(analyticsService.getCrossSiteSessionAnalytics).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      );
    });

    it('should use default date range when not provided', async () => {
      const user = createMockUser();
      analyticsService.getCrossSiteSessionAnalytics.mockResolvedValue(mockCrossSiteSessionAnalytics);

      await controller.getCrossSiteSessionAnalytics(user);

      const call = analyticsService.getCrossSiteSessionAnalytics.mock.calls[0];
      const dateRange = call[1];
      expect(dateRange.startDate).toBeInstanceOf(Date);
      expect(dateRange.endDate).toBeInstanceOf(Date);
    });

    it('should throw ForbiddenException without company access', async () => {
      const userWithoutCompany = createMockUser({
        scopeType: 'CLIENT',
        scopeId: mockClientId,
        companyId: undefined,
      });

      await expect(controller.getCrossSiteSessionAnalytics(userWithoutCompany)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // trackEvent TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('trackEvent', () => {
    const validEventInput: TrackEventInput = {
      eventType: AnalyticsEventType.CART_ITEM_ADDED,
      entityType: 'Cart',
      entityId: 'cart_123',
      siteId: 'site_1',
      sessionId: 'session_123',
      customerId: 'customer_123',
      metadata: { quantity: 2 },
    };

    it('should create event with valid data', async () => {
      const user = createMockUser();
      analyticsService.trackEvent.mockResolvedValue(undefined);

      const result = await controller.trackEvent(user, validEventInput);

      expect(analyticsService.trackEvent).toHaveBeenCalledWith(mockCompanyId, validEventInput);
      expect(result).toEqual({ success: true });
    });

    it('should track different event types', async () => {
      const user = createMockUser();
      analyticsService.trackEvent.mockResolvedValue(undefined);

      const wishlistEvent: TrackEventInput = {
        eventType: AnalyticsEventType.WISHLIST_ITEM_ADDED,
        entityType: 'Wishlist',
        entityId: 'wishlist_123',
      };

      await controller.trackEvent(user, wishlistEvent);

      expect(analyticsService.trackEvent).toHaveBeenCalledWith(mockCompanyId, wishlistEvent);
    });

    it('should track comparison events', async () => {
      const user = createMockUser();
      analyticsService.trackEvent.mockResolvedValue(undefined);

      const comparisonEvent: TrackEventInput = {
        eventType: AnalyticsEventType.COMPARISON_PRODUCT_SELECTED,
        entityType: 'Comparison',
        entityId: 'comparison_123',
        metadata: { selectedProductId: 'prod_1' },
      };

      await controller.trackEvent(user, comparisonEvent);

      expect(analyticsService.trackEvent).toHaveBeenCalledWith(mockCompanyId, comparisonEvent);
    });

    it('should track cross-site session events', async () => {
      const user = createMockUser();
      analyticsService.trackEvent.mockResolvedValue(undefined);

      const sessionEvent: TrackEventInput = {
        eventType: AnalyticsEventType.SESSION_TRANSFERRED,
        entityType: 'CrossSiteSession',
        entityId: 'session_123',
        metadata: { fromSiteId: 'site_1', toSiteId: 'site_2' },
      };

      await controller.trackEvent(user, sessionEvent);

      expect(analyticsService.trackEvent).toHaveBeenCalledWith(mockCompanyId, sessionEvent);
    });

    it('should return success response', async () => {
      const user = createMockUser();
      analyticsService.trackEvent.mockResolvedValue(undefined);

      const result = await controller.trackEvent(user, validEventInput);

      expect(result).toEqual({ success: true });
    });

    it('should respect company access control', async () => {
      const clientUser = createMockUser({
        scopeType: 'CLIENT',
        scopeId: mockClientId,
        companyId: undefined,
      });
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      analyticsService.trackEvent.mockResolvedValue(undefined);

      await controller.trackEvent(clientUser, validEventInput, mockCompanyId);

      expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(mockCompanyId, validEventInput);
    });

    it('should throw ForbiddenException when accessing unauthorized company', async () => {
      const clientUser = createMockUser({
        scopeType: 'CLIENT',
        scopeId: mockClientId,
        companyId: undefined,
      });
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      await expect(
        controller.trackEvent(clientUser, validEventInput, mockOtherCompanyId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException without company access', async () => {
      const userWithoutCompany = createMockUser({
        scopeType: 'CLIENT',
        scopeId: mockClientId,
        companyId: undefined,
      });

      await expect(controller.trackEvent(userWithoutCompany, validEventInput)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // RBAC ACCESS CONTROL TESTS (SOC2/ISO27001 Compliance)
  // ═══════════════════════════════════════════════════════════════

  describe('RBAC Access Control', () => {
    describe('Cross-tenant isolation', () => {
      it('should prevent CLIENT users from accessing other client companies', async () => {
        const clientUser = createMockUser({
          scopeType: 'CLIENT',
          scopeId: mockClientId,
          companyId: undefined,
        });
        hierarchyService.canAccessCompany.mockResolvedValue(false);

        await expect(
          controller.getCartAnalytics(clientUser, mockOtherCompanyId),
        ).rejects.toThrow(ForbiddenException);

        await expect(
          controller.getWishlistAnalytics(clientUser, mockOtherCompanyId),
        ).rejects.toThrow(ForbiddenException);

        await expect(
          controller.getComparisonAnalytics(clientUser, mockOtherCompanyId),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should validate company access for all analytics endpoints', async () => {
        const orgUser = createMockUser({
          scopeType: 'ORGANIZATION',
          scopeId: mockOrgId,
          companyId: undefined,
        });
        hierarchyService.canAccessCompany.mockResolvedValue(true);
        analyticsService.getAdminOverview.mockResolvedValue(mockAdminOverviewData);
        analyticsService.getCartAnalytics.mockResolvedValue(mockCartAnalytics);
        analyticsService.getWishlistAnalytics.mockResolvedValue(mockWishlistAnalytics);
        analyticsService.getComparisonAnalytics.mockResolvedValue(mockComparisonAnalytics);
        analyticsService.getCrossSiteSessionAnalytics.mockResolvedValue(mockCrossSiteSessionAnalytics);

        await controller.getOverview(orgUser, mockCompanyId);
        await controller.getCartAnalytics(orgUser, mockCompanyId);
        await controller.getWishlistAnalytics(orgUser, mockCompanyId);
        await controller.getComparisonAnalytics(orgUser, mockCompanyId);
        await controller.getCrossSiteSessionAnalytics(orgUser, mockCompanyId);

        expect(hierarchyService.canAccessCompany).toHaveBeenCalledTimes(5);
      });
    });

    describe('DEPARTMENT/TEAM-scoped users', () => {
      it('should use parent company for department users when no query param', async () => {
        const deptUser = createMockUser({
          scopeType: 'DEPARTMENT',
          scopeId: 'dept_123',
          companyId: mockCompanyId,
        });
        analyticsService.getAdminOverview.mockResolvedValue(mockAdminOverviewData);

        // When no query param is provided, should use user's companyId
        await controller.getOverview(deptUser);

        expect(analyticsService.getAdminOverview).toHaveBeenCalledWith(
          mockCompanyId,
          expect.any(Object),
        );
      });

      it('should use parent company for team users when no query param', async () => {
        const teamUser = createMockUser({
          scopeType: 'TEAM',
          scopeId: 'team_123',
          companyId: mockCompanyId,
        });
        analyticsService.getAdminOverview.mockResolvedValue(mockAdminOverviewData);

        // When no query param is provided, should use user's companyId
        await controller.getOverview(teamUser);

        expect(analyticsService.getAdminOverview).toHaveBeenCalledWith(
          mockCompanyId,
          expect.any(Object),
        );
      });

      it('should validate access when department user provides companyId query param', async () => {
        const deptUser = createMockUser({
          scopeType: 'DEPARTMENT',
          scopeId: 'dept_123',
          companyId: mockCompanyId,
        });
        hierarchyService.canAccessCompany.mockResolvedValue(true);
        analyticsService.getAdminOverview.mockResolvedValue(mockAdminOverviewData);

        // When query param is provided, should validate access
        await controller.getOverview(deptUser, mockOtherCompanyId);

        expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
        expect(analyticsService.getAdminOverview).toHaveBeenCalledWith(
          mockOtherCompanyId,
          expect.any(Object),
        );
      });
    });
  });
});
