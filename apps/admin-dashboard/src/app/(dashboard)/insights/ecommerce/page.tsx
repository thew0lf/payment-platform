'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ShoppingCart,
  Heart,
  GitCompare,
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw,
  Calendar,
  DollarSign,
  Package,
  Users,
  ArrowRightLeft,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  ecommerceAnalyticsApi,
  EcommerceOverviewData,
  getDateRangeForPeriod,
} from '@/lib/api/ecommerce-analytics';

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof TrendingUp;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn('p-2 rounded-lg', iconBg)}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
          {trend && trendValue && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
            )}>
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" />}
              {trendValue}
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-lg" />
                <div className="mt-3 space-y-2">
                  <div className="h-6 w-20 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-48 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-48 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <ShoppingCart className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Buyer Intent Data</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Buyer intent signals will appear here once you have cart, wishlist, and comparison activity.
        </p>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function EcommerceAnalyticsPage() {
  const { selectedCompanyId } = useHierarchy();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [data, setData] = useState<EcommerceOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getDateRangeForPeriod(dateRange);
      const result = await ecommerceAnalyticsApi.getOverview({
        companyId: selectedCompanyId || undefined,
        startDate,
        endDate,
      });
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, selectedCompanyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getTrend = (value: number): 'up' | 'down' | 'neutral' => {
    if (value > 0) return 'up';
    if (value < 0) return 'down';
    return 'neutral';
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Buyer Intent</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Understand purchasing signals through cart, wishlist, and comparison behavior
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
            <SelectTrigger className="w-[140px] min-h-[44px] touch-manipulation">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            disabled={isLoading}
            className="min-h-[44px] min-w-[44px] touch-manipulation"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button onClick={fetchData} className="min-h-[44px] touch-manipulation">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : !data ? (
        <EmptyState />
      ) : (
        <>
          {/* Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Cart Conversion Rate"
              value={`${(data.cart?.conversionRate || 0).toFixed(1)}%`}
              subtitle={`${data.cart?.convertedCarts || 0} converted`}
              icon={ShoppingCart}
              trend={getTrend(data.trends?.cartConversionTrend || 0)}
              trendValue={formatPercent(data.trends?.cartConversionTrend || 0)}
              iconColor="text-blue-500"
              iconBg="bg-blue-500/10"
            />
            <MetricCard
              title="Average Cart Value"
              value={formatCurrency(data.cart?.averageCartValue || 0)}
              subtitle={`${data.cart?.activeCarts || 0} active carts`}
              icon={DollarSign}
              iconColor="text-green-500"
              iconBg="bg-green-500/10"
            />
            <MetricCard
              title="Wishlist Items"
              value={data.wishlist?.totalItems || 0}
              subtitle={`${data.wishlist?.totalWishlists || 0} wishlists`}
              icon={Heart}
              trend={getTrend(data.trends?.wishlistGrowthTrend || 0)}
              trendValue={formatPercent(data.trends?.wishlistGrowthTrend || 0)}
              iconColor="text-red-500"
              iconBg="bg-red-500/10"
            />
            <MetricCard
              title="Comparisons"
              value={data.comparison?.totalComparisons || 0}
              subtitle={`${data.comparison?.averageProductsPerComparison?.toFixed(1) || 0} avg products`}
              icon={GitCompare}
              trend={getTrend(data.trends?.comparisonEngagementTrend || 0)}
              trendValue={formatPercent(data.trends?.comparisonEngagementTrend || 0)}
              iconColor="text-purple-500"
              iconBg="bg-purple-500/10"
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Abandoned Carts"
              value={data.cart?.abandonedCarts || 0}
              subtitle={`${(data.cart?.abandonmentRate || 0).toFixed(1)}% abandonment rate`}
              icon={ShoppingCart}
              iconColor="text-orange-500"
              iconBg="bg-orange-500/10"
            />
            <MetricCard
              title="Total Carts"
              value={data.cart?.totalCarts || 0}
              subtitle={`${(data.cart?.averageItemsPerCart || 0).toFixed(1)} avg items per cart`}
              icon={Package}
              iconColor="text-cyan-500"
              iconBg="bg-cyan-500/10"
            />
            <MetricCard
              title="Active Wishlists"
              value={data.wishlist?.activeWishlists || 0}
              subtitle={`${(data.wishlist?.moveToCartRate || 0).toFixed(1)}% move to cart rate`}
              icon={Users}
              iconColor="text-pink-500"
              iconBg="bg-pink-500/10"
            />
            <MetricCard
              title="Cross-Site Sessions"
              value={data.crossSiteSession?.activeSessions || 0}
              subtitle={`${(data.crossSiteSession?.sessionMergeRate || 0).toFixed(1)}% merge rate`}
              icon={ArrowRightLeft}
              trend={getTrend(data.trends?.crossSiteEngagementTrend || 0)}
              trendValue={formatPercent(data.trends?.crossSiteEngagementTrend || 0)}
              iconColor="text-indigo-500"
              iconBg="bg-indigo-500/10"
            />
          </div>

          {/* Detailed Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cart Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-500" />
                  Cart Performance
                </CardTitle>
                <CardDescription>Shopping cart metrics and conversion funnel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Active Carts</p>
                    <p className="text-xl font-semibold">{data.cart?.activeCarts || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Converted</p>
                    <p className="text-xl font-semibold">{data.cart?.convertedCarts || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Abandoned</p>
                    <p className="text-xl font-semibold">{data.cart?.abandonedCarts || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Conversion Rate</p>
                    <p className="text-xl font-semibold">{(data.cart?.conversionRate || 0).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Avg Cart Value</span>
                    <span className="font-medium">{formatCurrency(data.cart?.averageCartValue || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Abandonment Rate</span>
                    <span className="font-medium text-orange-500">{(data.cart?.abandonmentRate || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wishlist Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Wishlist Insights
                </CardTitle>
                <CardDescription>Customer wishlist activity and engagement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Wishlists</p>
                    <p className="text-xl font-semibold">{data.wishlist?.totalWishlists || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Items</p>
                    <p className="text-xl font-semibold">{data.wishlist?.totalItems || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Active Wishlists</p>
                    <p className="text-xl font-semibold">{data.wishlist?.activeWishlists || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Avg Items/Wishlist</p>
                    <p className="text-xl font-semibold">{(data.wishlist?.averageItemsPerWishlist || 0).toFixed(1)}</p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Move to Cart Rate</span>
                    <span className="font-medium">{(data.wishlist?.moveToCartRate || 0).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Purchase Rate</span>
                    <span className="font-medium">{(data.wishlist?.purchaseFromWishlistRate || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comparison and Session Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Comparison Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-purple-500" />
                  Product Comparisons
                </CardTitle>
                <CardDescription>How customers compare products</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Comparisons</p>
                    <p className="text-xl font-semibold">{data.comparison?.totalComparisons || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Active Comparisons</p>
                    <p className="text-xl font-semibold">{data.comparison?.activeComparisons || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Add to Cart Rate</p>
                    <p className="text-xl font-semibold">{(data.comparison?.comparisonToCartRate || 0).toFixed(1)}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Avg Products</p>
                    <p className="text-xl font-semibold">{(data.comparison?.averageProductsPerComparison || 0).toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cross-Site Session Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
                  Cross-Site Sessions
                </CardTitle>
                <CardDescription>Multi-site customer journey tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Sessions</p>
                    <p className="text-xl font-semibold">{data.crossSiteSession?.totalSessions || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Active Sessions</p>
                    <p className="text-xl font-semibold">{data.crossSiteSession?.activeSessions || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Transfer Rate</p>
                    <p className="text-xl font-semibold">{(data.crossSiteSession?.crossSiteTransferRate || 0).toFixed(1)}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Merge Rate</p>
                    <p className="text-xl font-semibold">{(data.crossSiteSession?.sessionMergeRate || 0).toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
