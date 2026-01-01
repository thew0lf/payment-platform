/**
 * E-commerce Analytics Service Unit Tests
 *
 * Comprehensive tests for e-commerce analytics including:
 * - Overview dashboard data
 * - Cart analytics (conversion funnel, abandoned products)
 * - Wishlist analytics (top products, category breakdown)
 * - Comparison analytics (most compared products)
 * - Cross-site session analytics (site engagement, device breakdown)
 * - Event tracking
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EcommerceAnalyticsService } from './ecommerce-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CartStatus, CrossSiteSessionStatus } from '@prisma/client';
import {
  DateRange,
  AnalyticsEventType,
  TrackEventInput,
} from '../types/ecommerce-analytics.types';

describe('EcommerceAnalyticsService', () => {
  let service: EcommerceAnalyticsService;
  let prisma: {
    cart: {
      count: jest.Mock;
      groupBy: jest.Mock;
      aggregate: jest.Mock;
    };
    cartItem: {
      findMany: jest.Mock;
      groupBy: jest.Mock;
    };
    wishlist: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
    wishlistItem: {
      count: jest.Mock;
      aggregate: jest.Mock;
      groupBy: jest.Mock;
    };
    productComparison: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
    productComparisonItem: {
      count: jest.Mock;
      aggregate: jest.Mock;
      groupBy: jest.Mock;
    };
    crossSiteSession: {
      count: jest.Mock;
      groupBy: jest.Mock;
      findMany: jest.Mock;
    };
    product: {
      findMany: jest.Mock;
    };
    site: {
      findMany: jest.Mock;
    };
    $queryRaw: jest.Mock;
  };

  // ═══════════════════════════════════════════════════════════════
  // TEST DATA
  // ═══════════════════════════════════════════════════════════════

  const mockCompanyId = 'company-123';
  const mockSiteId = 'site-456';
  const mockDateRange: DateRange = {
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
  };

  const mockProduct = (id: string, name: string) => ({
    id,
    name,
  });

  const mockSite = (id: string, name: string) => ({
    id,
    name,
  });

  // ═══════════════════════════════════════════════════════════════
  // SETUP
  // ═══════════════════════════════════════════════════════════════

  beforeEach(async () => {
    prisma = {
      cart: {
        count: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      cartItem: {
        findMany: jest.fn(),
        groupBy: jest.fn(),
      },
      wishlist: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      wishlistItem: {
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      productComparison: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      productComparisonItem: {
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      crossSiteSession: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
      },
      site: {
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EcommerceAnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<EcommerceAnalyticsService>(EcommerceAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // getOverview TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getOverview', () => {
    beforeEach(() => {
      // Setup default mocks for all sub-queries
      prisma.cart.groupBy.mockResolvedValue([
        { status: CartStatus.ACTIVE, _count: 10 },
        { status: CartStatus.ABANDONED, _count: 5 },
        { status: CartStatus.CONVERTED, _count: 15 },
      ]);
      prisma.cart.aggregate.mockResolvedValue({
        _avg: { grandTotal: 75.5, itemCount: 3 },
      });
      prisma.wishlist.count.mockResolvedValue(20);
      prisma.wishlistItem.count.mockResolvedValue(50);
      prisma.wishlistItem.aggregate.mockResolvedValue({ _count: 50 });
      prisma.productComparison.count.mockResolvedValue(8);
      prisma.productComparisonItem.count.mockResolvedValue(24);
      prisma.productComparisonItem.aggregate.mockResolvedValue({ _count: 24 });
      prisma.crossSiteSession.count.mockResolvedValue(100);
      prisma.crossSiteSession.groupBy.mockResolvedValue([
        { status: CrossSiteSessionStatus.ACTIVE, _count: 60 },
        { status: CrossSiteSessionStatus.MERGED, _count: 10 },
      ]);
    });

    it('should return combined metrics from all services', async () => {
      const result = await service.getOverview(mockCompanyId, mockDateRange);

      expect(result.companyId).toBe(mockCompanyId);
      expect(result.dateRange).toEqual(mockDateRange);
      expect(result.cart).toBeDefined();
      expect(result.wishlist).toBeDefined();
      expect(result.comparison).toBeDefined();
      expect(result.crossSiteSession).toBeDefined();
    });

    it('should return trends for all metric types', async () => {
      const result = await service.getOverview(mockCompanyId, mockDateRange);

      expect(result.trends).toBeDefined();
      expect(result.trends.cartConversionTrend).toBe(0);
      expect(result.trends.wishlistGrowthTrend).toBe(0);
      expect(result.trends.comparisonEngagementTrend).toBe(0);
      expect(result.trends.crossSiteEngagementTrend).toBe(0);
    });

    it('should calculate cart metrics correctly', async () => {
      const result = await service.getOverview(mockCompanyId, mockDateRange);

      expect(result.cart.totalCarts).toBe(30); // 10 + 5 + 15
      expect(result.cart.activeCarts).toBe(10);
      expect(result.cart.abandonedCarts).toBe(5);
      expect(result.cart.convertedCarts).toBe(15);
      expect(result.cart.averageCartValue).toBe(75.5);
    });

    it('should calculate wishlist metrics correctly', async () => {
      const result = await service.getOverview(mockCompanyId, mockDateRange);

      expect(result.wishlist.totalWishlists).toBe(20);
      // All wishlists are considered active since there's no status field
      expect(result.wishlist.activeWishlists).toBe(20);
      expect(result.wishlist.totalItems).toBe(50);
      expect(result.wishlist.averageItemsPerWishlist).toBe(2.5); // 50 / 20
    });

    it('should calculate comparison metrics correctly', async () => {
      const result = await service.getOverview(mockCompanyId, mockDateRange);

      expect(result.comparison.totalComparisons).toBe(8);
      // Active count is based on non-expired comparisons (mocked to return 8)
      expect(result.comparison.activeComparisons).toBe(8);
      expect(result.comparison.averageProductsPerComparison).toBe(3); // 24 / 8
    });

    it('should calculate session metrics correctly', async () => {
      // Mock crossSiteSession.count for getCrossSiteSessionMetrics: total, active, merged
      prisma.crossSiteSession.count
        .mockResolvedValueOnce(100)  // totalSessions
        .mockResolvedValueOnce(60)   // activeSessions
        .mockResolvedValueOnce(10);  // mergedSessions

      const result = await service.getOverview(mockCompanyId, mockDateRange);

      expect(result.crossSiteSession.totalSessions).toBe(100);
      expect(result.crossSiteSession.activeSessions).toBe(60);
      expect(result.crossSiteSession.sessionMergeRate).toBe(0.1); // 10 / 100
    });

    it('should handle empty data gracefully', async () => {
      prisma.cart.groupBy.mockResolvedValue([]);
      prisma.cart.aggregate.mockResolvedValue({ _avg: { grandTotal: null, itemCount: null } });
      prisma.wishlist.count.mockResolvedValue(0);
      prisma.wishlistItem.count.mockResolvedValue(0);
      prisma.wishlistItem.aggregate.mockResolvedValue({ _count: 0 });
      prisma.productComparison.count.mockResolvedValue(0);
      prisma.productComparisonItem.count.mockResolvedValue(0);
      prisma.productComparisonItem.aggregate.mockResolvedValue({ _count: 0 });
      prisma.crossSiteSession.count.mockResolvedValue(0);
      prisma.crossSiteSession.groupBy.mockResolvedValue([]);

      const result = await service.getOverview(mockCompanyId, mockDateRange);

      expect(result.cart.totalCarts).toBe(0);
      expect(result.cart.averageCartValue).toBe(0);
      expect(result.wishlist.averageItemsPerWishlist).toBe(0);
      expect(result.comparison.averageProductsPerComparison).toBe(0);
      expect(result.crossSiteSession.sessionMergeRate).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getCartAnalytics TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getCartAnalytics', () => {
    beforeEach(() => {
      prisma.cart.count.mockResolvedValue(100);
      prisma.cart.groupBy.mockResolvedValue([
        { status: CartStatus.ACTIVE, _count: 30 },
        { status: CartStatus.ABANDONED, _count: 40 },
        { status: CartStatus.CONVERTED, _count: 30 },
      ]);
      prisma.cart.aggregate.mockResolvedValue({
        _avg: { grandTotal: 85.99, itemCount: 4.5 },
      });
      prisma.$queryRaw.mockResolvedValue([
        { date: new Date('2025-01-01'), value: 75.0 },
        { date: new Date('2025-01-02'), value: 82.5 },
      ]);
      // Now uses groupBy for database-level aggregation
      prisma.cartItem.groupBy.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
    });

    it('should return cart metrics with counts by status', async () => {
      const result = await service.getCartAnalytics(mockCompanyId, mockDateRange);

      expect(result.companyId).toBe(mockCompanyId);
      expect(result.dateRange).toEqual(mockDateRange);
      expect(result.totalCarts).toBe(100);
      expect(result.activeCarts).toBe(30);
      expect(result.abandonedCarts).toBe(40);
      expect(result.convertedCarts).toBe(30);
    });

    it('should calculate abandonment and conversion rates', async () => {
      const result = await service.getCartAnalytics(mockCompanyId, mockDateRange);

      expect(result.abandonmentRate).toBe(0.4); // 40 / 100
      expect(result.conversionRate).toBe(0.3); // 30 / 100
    });

    it('should calculate average cart value and items', async () => {
      const result = await service.getCartAnalytics(mockCompanyId, mockDateRange);

      expect(result.averageCartValue).toBe(85.99);
      expect(result.averageItemsPerCart).toBe(4.5);
    });

    it('should return conversion funnel data', async () => {
      // Mock cartsWithItems count
      prisma.cart.count
        .mockResolvedValueOnce(100) // totalCarts
        .mockResolvedValueOnce(80); // cartsWithItems

      const result = await service.getCartAnalytics(mockCompanyId, mockDateRange);

      expect(result.conversionFunnel).toBeDefined();
      expect(result.conversionFunnel.cartsCreated).toBe(100);
      expect(result.conversionFunnel.cartsWithItems).toBe(80);
      expect(result.conversionFunnel.checkoutStarted).toBe(70); // converted + abandoned
      expect(result.conversionFunnel.checkoutCompleted).toBe(30);
    });

    it('should return top abandoned products', async () => {
      // Now uses groupBy for database-level aggregation
      prisma.cartItem.groupBy.mockResolvedValue([
        { productId: 'prod-1', _count: 2 },
        { productId: 'prod-2', _count: 1 },
      ]);
      prisma.product.findMany.mockResolvedValue([
        { id: 'prod-1', name: 'Product A' },
        { id: 'prod-2', name: 'Product B' },
      ]);

      const result = await service.getCartAnalytics(mockCompanyId, mockDateRange);

      expect(result.topAbandonedProducts).toBeDefined();
      expect(Array.isArray(result.topAbandonedProducts)).toBe(true);
      expect(result.topAbandonedProducts[0]?.productName).toBe('Product A');
      expect(result.topAbandonedProducts[0]?.abandonmentCount).toBe(2);
    });

    it('should filter by siteId when provided', async () => {
      await service.getCartAnalytics(mockCompanyId, mockDateRange, mockSiteId);

      expect(prisma.cart.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          companyId: mockCompanyId,
          siteId: mockSiteId,
        }),
      });
    });

    it('should return empty arrays when no data', async () => {
      prisma.cart.count.mockResolvedValue(0);
      prisma.cart.groupBy.mockResolvedValue([]);
      prisma.cart.aggregate.mockResolvedValue({
        _avg: { grandTotal: null, itemCount: null },
      });
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getCartAnalytics(mockCompanyId, mockDateRange);

      expect(result.totalCarts).toBe(0);
      expect(result.abandonmentRate).toBe(0);
      expect(result.conversionRate).toBe(0);
      expect(result.averageCartValue).toBe(0);
    });

    it('should return cart value over time series', async () => {
      const result = await service.getCartAnalytics(mockCompanyId, mockDateRange);

      expect(result.cartValueOverTime).toBeDefined();
      expect(Array.isArray(result.cartValueOverTime)).toBe(true);
    });

    it('should include event metrics with default values', async () => {
      const result = await service.getCartAnalytics(mockCompanyId, mockDateRange);

      expect(result.addToCartEvents).toBe(0);
      expect(result.removeFromCartEvents).toBe(0);
      expect(result.bundleAddEvents).toBe(0);
      expect(result.discountAppliedEvents).toBe(0);
      expect(result.saveForLaterEvents).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getWishlistAnalytics TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getWishlistAnalytics', () => {
    beforeEach(() => {
      prisma.wishlist.count.mockResolvedValue(50);
      prisma.wishlistItem.aggregate.mockResolvedValue({ _count: 150 });
      prisma.wishlistItem.groupBy.mockResolvedValue([
        { productId: 'prod-1', _count: 25 },
        { productId: 'prod-2', _count: 18 },
      ]);
      prisma.product.findMany.mockResolvedValue([
        mockProduct('prod-1', 'Popular Product'),
        mockProduct('prod-2', 'Second Product'),
      ]);
      // Time series now uses $queryRaw for database-level aggregation
      prisma.$queryRaw.mockResolvedValue([
        { date: new Date('2025-01-15'), count: BigInt(2) },
        { date: new Date('2025-01-16'), count: BigInt(1) },
      ]);
    });

    it('should return wishlist metrics', async () => {
      const result = await service.getWishlistAnalytics(mockCompanyId, mockDateRange);

      expect(result.companyId).toBe(mockCompanyId);
      expect(result.dateRange).toEqual(mockDateRange);
      expect(result.totalWishlists).toBe(50);
      // All wishlists are considered active since there's no status field
      expect(result.activeWishlists).toBe(50);
      expect(result.totalItems).toBe(150);
    });

    it('should calculate average items per wishlist', async () => {
      const result = await service.getWishlistAnalytics(mockCompanyId, mockDateRange);

      expect(result.averageItemsPerWishlist).toBe(3); // 150 / 50
    });

    it('should return top wishlisted products', async () => {
      const result = await service.getWishlistAnalytics(mockCompanyId, mockDateRange);

      expect(result.topWishlistedProducts).toBeDefined();
      expect(Array.isArray(result.topWishlistedProducts)).toBe(true);
      expect(result.topWishlistedProducts.length).toBeLessThanOrEqual(10);
    });

    it('should return category breakdown (empty by default)', async () => {
      const result = await service.getWishlistAnalytics(mockCompanyId, mockDateRange);

      expect(result.categoryBreakdown).toBeDefined();
      expect(Array.isArray(result.categoryBreakdown)).toBe(true);
    });

    it('should filter by siteId when provided', async () => {
      await service.getWishlistAnalytics(mockCompanyId, mockDateRange, mockSiteId);

      expect(prisma.wishlist.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          companyId: mockCompanyId,
          siteId: mockSiteId,
        }),
      });
    });

    it('should return activity over time', async () => {
      const result = await service.getWishlistAnalytics(mockCompanyId, mockDateRange);

      expect(result.wishlistActivityOverTime).toBeDefined();
      expect(Array.isArray(result.wishlistActivityOverTime)).toBe(true);
    });

    it('should handle zero wishlists', async () => {
      prisma.wishlist.count.mockResolvedValue(0);
      prisma.wishlistItem.aggregate.mockResolvedValue({ _count: 0 });
      prisma.wishlistItem.groupBy.mockResolvedValue([]);
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getWishlistAnalytics(mockCompanyId, mockDateRange);

      expect(result.totalWishlists).toBe(0);
      expect(result.averageItemsPerWishlist).toBe(0);
    });

    it('should include event metrics with default values', async () => {
      const result = await service.getWishlistAnalytics(mockCompanyId, mockDateRange);

      expect(result.addToWishlistEvents).toBe(0);
      expect(result.removeFromWishlistEvents).toBe(0);
      expect(result.moveToCartEvents).toBe(0);
      expect(result.purchaseFromWishlistEvents).toBe(0);
      expect(result.moveToCartRate).toBe(0);
      expect(result.purchaseFromWishlistRate).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getComparisonAnalytics TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getComparisonAnalytics', () => {
    beforeEach(() => {
      // First call for totalComparisons, second call for activeComparisons (non-expired)
      prisma.productComparison.count
        .mockResolvedValueOnce(25)  // totalComparisons
        .mockResolvedValueOnce(20); // activeComparisons (non-expired)
      prisma.productComparisonItem.aggregate.mockResolvedValue({ _count: 75 });
      prisma.productComparisonItem.groupBy.mockResolvedValue([
        { productId: 'prod-1', _count: 15 },
        { productId: 'prod-2', _count: 12 },
      ]);
      prisma.product.findMany.mockResolvedValue([
        mockProduct('prod-1', 'Compared Product A'),
        mockProduct('prod-2', 'Compared Product B'),
      ]);
      // Time series now uses $queryRaw for database-level aggregation
      prisma.$queryRaw.mockResolvedValue([
        { date: new Date('2025-01-10'), count: BigInt(2) },
      ]);
    });

    it('should return comparison metrics', async () => {
      const result = await service.getComparisonAnalytics(mockCompanyId, mockDateRange);

      expect(result.companyId).toBe(mockCompanyId);
      expect(result.dateRange).toEqual(mockDateRange);
      expect(result.totalComparisons).toBe(25);
      expect(result.activeComparisons).toBe(20);
    });

    it('should calculate average products per comparison', async () => {
      // Reset mocks for this test
      prisma.productComparison.count
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(20);
      const result = await service.getComparisonAnalytics(mockCompanyId, mockDateRange);

      expect(result.averageProductsPerComparison).toBe(3); // 75 / 25
    });

    it('should return most compared products', async () => {
      // Reset mocks for this test
      prisma.productComparison.count
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(20);
      const result = await service.getComparisonAnalytics(mockCompanyId, mockDateRange);

      expect(result.mostComparedProducts).toBeDefined();
      expect(Array.isArray(result.mostComparedProducts)).toBe(true);
    });

    it('should return category comparison breakdown (empty by default)', async () => {
      // Reset mocks for this test
      prisma.productComparison.count
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(20);
      const result = await service.getComparisonAnalytics(mockCompanyId, mockDateRange);

      expect(result.categoryComparisonBreakdown).toBeDefined();
      expect(Array.isArray(result.categoryComparisonBreakdown)).toBe(true);
    });

    it('should filter by siteId when provided', async () => {
      // Reset mocks for this specific test
      prisma.productComparison.count
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(20);

      await service.getComparisonAnalytics(mockCompanyId, mockDateRange, mockSiteId);

      expect(prisma.productComparison.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          companyId: mockCompanyId,
          siteId: mockSiteId,
        }),
      });
    });

    it('should handle zero comparisons', async () => {
      // Reset specific mocks for this test
      prisma.productComparison.count.mockReset();
      prisma.productComparisonItem.aggregate.mockReset();
      prisma.productComparisonItem.groupBy.mockReset();
      prisma.product.findMany.mockReset();
      prisma.productComparison.findMany.mockReset();

      // Set up fresh mocks
      prisma.productComparison.count
        .mockResolvedValueOnce(0)  // totalComparisons
        .mockResolvedValueOnce(0); // activeComparisons
      prisma.productComparisonItem.aggregate.mockResolvedValue({ _count: 0 });
      prisma.productComparisonItem.groupBy.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.productComparison.findMany.mockResolvedValue([]);

      const result = await service.getComparisonAnalytics(mockCompanyId, mockDateRange);

      expect(result.totalComparisons).toBe(0);
      expect(result.averageProductsPerComparison).toBe(0);
    });

    it('should return comparison activity over time', async () => {
      // Reset mocks for this test
      prisma.productComparison.count
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(20);
      const result = await service.getComparisonAnalytics(mockCompanyId, mockDateRange);

      expect(result.comparisonActivityOverTime).toBeDefined();
      expect(Array.isArray(result.comparisonActivityOverTime)).toBe(true);
    });

    it('should include event metrics with default values', async () => {
      // Reset mocks for this test
      prisma.productComparison.count
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(20);
      const result = await service.getComparisonAnalytics(mockCompanyId, mockDateRange);

      expect(result.addToComparisonEvents).toBe(0);
      expect(result.removeFromComparisonEvents).toBe(0);
      expect(result.comparisonViewEvents).toBe(0);
      expect(result.comparisonShareEvents).toBe(0);
      expect(result.comparisonToCartRate).toBe(0);
      expect(result.comparisonToWishlistRate).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getCrossSiteSessionAnalytics TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getCrossSiteSessionAnalytics', () => {
    beforeEach(() => {
      prisma.crossSiteSession.count.mockResolvedValue(200);
      prisma.crossSiteSession.groupBy.mockResolvedValue([
        { status: CrossSiteSessionStatus.ACTIVE, _count: 120 },
        { status: CrossSiteSessionStatus.MERGED, _count: 30 },
        { status: CrossSiteSessionStatus.EXPIRED, _count: 50 },
      ]);
      // Time series now uses $queryRaw for database-level aggregation
      prisma.$queryRaw.mockResolvedValue([
        { date: new Date('2025-01-20'), count: BigInt(2) },
        { date: new Date('2025-01-21'), count: BigInt(1) },
      ]);
      prisma.site.findMany.mockResolvedValue([
        mockSite('site-1', 'Main Site'),
        mockSite('site-2', 'Secondary Site'),
      ]);
    });

    it('should return session metrics', async () => {
      const result = await service.getCrossSiteSessionAnalytics(mockCompanyId, mockDateRange);

      expect(result.companyId).toBe(mockCompanyId);
      expect(result.dateRange).toEqual(mockDateRange);
      expect(result.totalSessions).toBe(200);
      expect(result.activeSessions).toBe(120);
    });

    it('should calculate session merge rate', async () => {
      const result = await service.getCrossSiteSessionAnalytics(mockCompanyId, mockDateRange);

      expect(result.sessionMergeRate).toBe(0.15); // 30 / 200
    });

    it('should return site engagement data', async () => {
      const result = await service.getCrossSiteSessionAnalytics(mockCompanyId, mockDateRange);

      expect(result.siteEngagement).toBeDefined();
      expect(Array.isArray(result.siteEngagement)).toBe(true);
    });

    it('should return device breakdown (empty by default)', async () => {
      const result = await service.getCrossSiteSessionAnalytics(mockCompanyId, mockDateRange);

      expect(result.deviceBreakdown).toBeDefined();
      expect(Array.isArray(result.deviceBreakdown)).toBe(true);
    });

    it('should return cross-site journeys (empty by default)', async () => {
      const result = await service.getCrossSiteSessionAnalytics(mockCompanyId, mockDateRange);

      expect(result.crossSiteJourneys).toBeDefined();
      expect(Array.isArray(result.crossSiteJourneys)).toBe(true);
    });

    it('should return session activity over time', async () => {
      const result = await service.getCrossSiteSessionAnalytics(mockCompanyId, mockDateRange);

      expect(result.sessionActivityOverTime).toBeDefined();
      expect(Array.isArray(result.sessionActivityOverTime)).toBe(true);
    });

    it('should handle zero sessions', async () => {
      prisma.crossSiteSession.count.mockResolvedValue(0);
      prisma.crossSiteSession.groupBy.mockResolvedValue([]);
      prisma.crossSiteSession.findMany.mockResolvedValue([]);

      const result = await service.getCrossSiteSessionAnalytics(mockCompanyId, mockDateRange);

      expect(result.totalSessions).toBe(0);
      expect(result.sessionMergeRate).toBe(0);
    });

    it('should include event metrics with default values', async () => {
      const result = await service.getCrossSiteSessionAnalytics(mockCompanyId, mockDateRange);

      expect(result.sessionCreatedEvents).toBe(0);
      expect(result.sessionTransferEvents).toBe(0);
      expect(result.cartSyncEvents).toBe(0);
      expect(result.wishlistSyncEvents).toBe(0);
      expect(result.averageSessionDuration).toBe(0);
      expect(result.crossSiteTransferRate).toBe(0);
      expect(result.returningVisitorRate).toBe(0);
    });

    it('should include sessionMergeEvents from merged count', async () => {
      const result = await service.getCrossSiteSessionAnalytics(mockCompanyId, mockDateRange);

      expect(result.sessionMergeEvents).toBe(30);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // trackEvent TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('trackEvent', () => {
    it('should log cart item added event', async () => {
      const input: TrackEventInput = {
        eventType: AnalyticsEventType.CART_ITEM_ADDED,
        entityType: 'Cart',
        entityId: 'cart-123',
        siteId: mockSiteId,
        metadata: { productId: 'prod-1', quantity: 2 },
      };

      // Should not throw
      await expect(service.trackEvent(mockCompanyId, input)).resolves.not.toThrow();
    });

    it('should log wishlist item added event', async () => {
      const input: TrackEventInput = {
        eventType: AnalyticsEventType.WISHLIST_ITEM_ADDED,
        entityType: 'Wishlist',
        entityId: 'wishlist-123',
        customerId: 'customer-456',
      };

      await expect(service.trackEvent(mockCompanyId, input)).resolves.not.toThrow();
    });

    it('should log comparison created event', async () => {
      const input: TrackEventInput = {
        eventType: AnalyticsEventType.COMPARISON_CREATED,
        entityType: 'Comparison',
        entityId: 'comparison-123',
        visitorId: 'visitor-789',
      };

      await expect(service.trackEvent(mockCompanyId, input)).resolves.not.toThrow();
    });

    it('should log session transfer event', async () => {
      const input: TrackEventInput = {
        eventType: AnalyticsEventType.SESSION_TRANSFERRED,
        entityType: 'CrossSiteSession',
        entityId: 'session-123',
        sessionId: 'session-123',
        metadata: { fromSiteId: 'site-1', toSiteId: 'site-2' },
      };

      await expect(service.trackEvent(mockCompanyId, input)).resolves.not.toThrow();
    });

    it('should handle events with minimal data', async () => {
      const input: TrackEventInput = {
        eventType: AnalyticsEventType.CART_CREATED,
        entityType: 'Cart',
        entityId: 'cart-minimal',
      };

      await expect(service.trackEvent(mockCompanyId, input)).resolves.not.toThrow();
    });

    it('should handle events with all optional fields', async () => {
      const input: TrackEventInput = {
        eventType: AnalyticsEventType.CART_CHECKOUT_COMPLETED,
        entityType: 'Cart',
        entityId: 'cart-full',
        siteId: mockSiteId,
        sessionId: 'session-xyz',
        customerId: 'customer-abc',
        visitorId: 'visitor-def',
        metadata: {
          orderId: 'order-123',
          orderTotal: 199.99,
          itemCount: 3,
        },
      };

      await expect(service.trackEvent(mockCompanyId, input)).resolves.not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DATE RANGE FILTERING TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('date range filtering', () => {
    beforeEach(() => {
      prisma.cart.count.mockResolvedValue(50);
      prisma.cart.groupBy.mockResolvedValue([]);
      prisma.cart.aggregate.mockResolvedValue({ _avg: { grandTotal: null, itemCount: null } });
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.cartItem.groupBy.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
    });

    it('should apply date range to cart queries', async () => {
      await service.getCartAnalytics(mockCompanyId, mockDateRange);

      expect(prisma.cart.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          createdAt: {
            gte: mockDateRange.startDate,
            lte: mockDateRange.endDate,
          },
        }),
      });
    });

    it('should apply date range to wishlist queries', async () => {
      prisma.wishlist.count.mockResolvedValue(10);
      prisma.wishlistItem.aggregate.mockResolvedValue({ _count: 0 });
      prisma.wishlistItem.groupBy.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.wishlist.findMany.mockResolvedValue([]);

      await service.getWishlistAnalytics(mockCompanyId, mockDateRange);

      expect(prisma.wishlist.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          createdAt: {
            gte: mockDateRange.startDate,
            lte: mockDateRange.endDate,
          },
        }),
      });
    });

    it('should apply date range to comparison queries', async () => {
      prisma.productComparison.count
        .mockResolvedValueOnce(5)   // totalComparisons
        .mockResolvedValueOnce(5);  // activeComparisons
      prisma.productComparisonItem.aggregate.mockResolvedValue({ _count: 0 });
      prisma.productComparisonItem.groupBy.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.productComparison.findMany.mockResolvedValue([]);

      await service.getComparisonAnalytics(mockCompanyId, mockDateRange);

      expect(prisma.productComparison.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          createdAt: {
            gte: mockDateRange.startDate,
            lte: mockDateRange.endDate,
          },
        }),
      });
    });

    it('should apply date range to session queries', async () => {
      prisma.crossSiteSession.count.mockResolvedValue(100);
      prisma.crossSiteSession.groupBy.mockResolvedValue([]);
      prisma.crossSiteSession.findMany.mockResolvedValue([]);

      await service.getCrossSiteSessionAnalytics(mockCompanyId, mockDateRange);

      expect(prisma.crossSiteSession.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          createdAt: {
            gte: mockDateRange.startDate,
            lte: mockDateRange.endDate,
          },
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASES TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle products with unknown names', async () => {
      prisma.wishlist.count.mockResolvedValue(10);
      prisma.wishlistItem.aggregate.mockResolvedValue({ _count: 5 });
      prisma.wishlistItem.groupBy.mockResolvedValue([
        { productId: 'unknown-prod', _count: 5 },
      ]);
      prisma.product.findMany.mockResolvedValue([]); // No products found
      // Time series now uses $queryRaw
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getWishlistAnalytics(mockCompanyId, mockDateRange);

      // Should not throw and return 'Unknown' as product name
      expect(result.topWishlistedProducts).toBeDefined();
    });

    it('should handle sites with null currentSiteId', async () => {
      prisma.crossSiteSession.count.mockResolvedValue(50);
      prisma.crossSiteSession.groupBy.mockResolvedValue([
        { status: CrossSiteSessionStatus.ACTIVE, _count: 50 },
      ]);
      // Time series now uses $queryRaw
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.site.findMany.mockResolvedValue([]);

      const result = await service.getCrossSiteSessionAnalytics(mockCompanyId, mockDateRange);

      expect(result.siteEngagement).toBeDefined();
    });

    it('should handle cart items without product data', async () => {
      prisma.cart.count.mockResolvedValue(10);
      prisma.cart.groupBy.mockResolvedValue([{ status: CartStatus.ABANDONED, _count: 10 }]);
      prisma.cart.aggregate.mockResolvedValue({ _avg: { grandTotal: null, itemCount: null } });
      prisma.$queryRaw.mockResolvedValue([]);
      // Now uses groupBy instead of findMany
      prisma.cartItem.groupBy.mockResolvedValue([
        { productId: 'prod-1', _count: 5 },
      ]);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getCartAnalytics(mockCompanyId, mockDateRange);

      // Should handle missing product gracefully (returns 'Unknown')
      expect(result.topAbandonedProducts).toBeDefined();
      expect(result.topAbandonedProducts[0]?.productName).toBe('Unknown');
    });

    it('should handle time series with same date entries', async () => {
      prisma.wishlist.count.mockResolvedValue(10);
      prisma.wishlistItem.aggregate.mockResolvedValue({ _count: 0 });
      prisma.wishlistItem.groupBy.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);
      // Now uses $queryRaw for time series aggregation (database-level GROUP BY)
      prisma.$queryRaw.mockResolvedValue([
        { date: new Date('2025-01-15'), count: BigInt(3) },
      ]);

      const result = await service.getWishlistAnalytics(mockCompanyId, mockDateRange);

      // Should show aggregated count from database
      const jan15Entry = result.wishlistActivityOverTime.find((d) => d.date === '2025-01-15');
      expect(jan15Entry?.value).toBe(3);
    });
  });
});
