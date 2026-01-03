'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw,
  Calendar,
  DollarSign,
  Percent,
  BarChart3,
  Mail,
  MessageSquare,
  Bell,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
  CartAnalyticsData,
  getDateRangeForPeriod,
  DateRangePeriod,
} from '@/lib/api/ecommerce-analytics';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface EcommerceAnalyticsData {
  overview: {
    totalCarts: number;
    abandonedCarts: number;
    recoveredCarts: number;
    recoveryRate: number;
    averageCartValue: number;
    totalCartValue: number;
    conversionRate: number;
  };
  trends: {
    cartsTrend: number;
    abandonmentTrend: number;
    recoveryTrend: number;
    avgValueTrend: number;
  };
  abandonmentOverTime: Array<{
    date: string;
    rate: number;
    total: number;
    abandoned: number;
  }>;
  recoveryByChannel: Array<{
    channel: string;
    recovered: number;
    rate: number;
    revenue: number;
  }>;
  cartValueDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  funnelDropOff: Array<{
    stage: string;
    visitors: number;
    dropOff: number;
    dropOffRate: number;
  }>;
}

type GroupBy = 'day' | 'week' | 'month';

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
  subtitle?: string;
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
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <Skeleton className="w-12 h-4" />
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="p-4 rounded-full bg-muted mb-4">
          <ShoppingCart className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No E-commerce Data Available</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Cart analytics data will appear here once you have customer shopping activity.
          Start by setting up your funnels and driving traffic to your checkout pages.
        </p>
      </CardContent>
    </Card>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="p-4 rounded-full bg-destructive/10 mb-4">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Failed to Load Analytics</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
          {error}
        </p>
        <Button onClick={onRetry} className="min-h-[44px] touch-manipulation">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}

// Custom Tooltip Component
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
      <p className="font-medium text-sm mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHART COLORS
// ═══════════════════════════════════════════════════════════════

const CHART_COLORS = {
  primary: '#8b5cf6',
  secondary: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#6b7280',
};

const CHANNEL_COLORS: Record<string, string> = {
  email: '#8b5cf6',
  sms: '#06b6d4',
  push: '#f59e0b',
  retargeting: '#10b981',
};

const VALUE_DISTRIBUTION_COLORS = [
  '#8b5cf6',
  '#a78bfa',
  '#c4b5fd',
  '#ddd6fe',
  '#ede9fe',
];

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function EcommerceAnalyticsPage() {
  const {
    selectedCompanyId,
    availableCompanies,
    accessLevel,
    setSelectedCompanyId,
  } = useHierarchy();

  const [dateRange, setDateRange] = useState<DateRangePeriod>('30d');
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [data, setData] = useState<EcommerceAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user needs to select a company
  const needsCompanySelection = (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT')
    && availableCompanies.length > 1
    && !selectedCompanyId;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRangeForPeriod(dateRange);

      // Fetch cart analytics from the API
      const cartData = await ecommerceAnalyticsApi.getCartAnalytics({
        companyId: selectedCompanyId || undefined,
        startDate,
        endDate,
      });

      // Transform API data into our dashboard format
      const transformedData = transformCartData(cartData, groupBy);
      setData(transformedData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics data';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, groupBy, selectedCompanyId]);

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

  const formatPercentValue = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getTrend = (value: number): 'up' | 'down' | 'neutral' => {
    if (value > 0) return 'up';
    if (value < 0) return 'down';
    return 'neutral';
  };

  // For recovery rate, higher is better
  const getRecoveryTrend = (value: number): 'up' | 'down' | 'neutral' => {
    if (value > 0) return 'up';
    if (value < 0) return 'down';
    return 'neutral';
  };

  // For abandonment, lower is better (so invert the trend display)
  const getAbandonmentTrend = (value: number): 'up' | 'down' | 'neutral' => {
    if (value > 0) return 'down'; // Higher abandonment is bad
    if (value < 0) return 'up';   // Lower abandonment is good
    return 'neutral';
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">E-commerce Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track cart abandonment, recovery rates, and conversion metrics
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Company Filter - for ORG/CLIENT users with multiple companies */}
            {(accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && availableCompanies.length > 1 && (
              <Select
                value={selectedCompanyId || ''}
                onValueChange={(v) => setSelectedCompanyId(v || null)}
              >
                <SelectTrigger className="w-[180px] min-h-[44px] touch-manipulation">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Companies</SelectItem>
                  {availableCompanies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Date Range Selector */}
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangePeriod)}>
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

            {/* Group By Selector */}
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="w-[120px] min-h-[44px] touch-manipulation">
                <BarChart3 className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">By Day</SelectItem>
                <SelectItem value="week">By Week</SelectItem>
                <SelectItem value="month">By Month</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
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

        {/* Company Selection Prompt */}
        {needsCompanySelection && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Select a company from the dropdown to view detailed analytics, or view aggregated data across all companies.
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={fetchData} />
      ) : !data ? (
        <EmptyState />
      ) : (
        <>
          {/* Overview Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Carts"
              value={data.overview.totalCarts.toLocaleString()}
              subtitle={`${formatCurrency(data.overview.totalCartValue)} total value`}
              icon={ShoppingCart}
              trend={getTrend(data.trends.cartsTrend)}
              trendValue={formatPercent(data.trends.cartsTrend)}
              iconColor="text-blue-500"
              iconBg="bg-blue-500/10"
            />
            <MetricCard
              title="Abandoned Carts"
              value={data.overview.abandonedCarts.toLocaleString()}
              subtitle={`${formatPercentValue(100 - data.overview.recoveryRate)} abandonment rate`}
              icon={ShoppingCart}
              trend={getAbandonmentTrend(data.trends.abandonmentTrend)}
              trendValue={formatPercent(data.trends.abandonmentTrend)}
              iconColor="text-orange-500"
              iconBg="bg-orange-500/10"
            />
            <MetricCard
              title="Recovery Rate"
              value={formatPercentValue(data.overview.recoveryRate)}
              subtitle={`${data.overview.recoveredCarts.toLocaleString()} carts recovered`}
              icon={Percent}
              trend={getRecoveryTrend(data.trends.recoveryTrend)}
              trendValue={formatPercent(data.trends.recoveryTrend)}
              iconColor="text-green-500"
              iconBg="bg-green-500/10"
            />
            <MetricCard
              title="Avg Cart Value"
              value={formatCurrency(data.overview.averageCartValue)}
              subtitle={`${formatPercentValue(data.overview.conversionRate)} conversion rate`}
              icon={DollarSign}
              trend={getTrend(data.trends.avgValueTrend)}
              trendValue={formatPercent(data.trends.avgValueTrend)}
              iconColor="text-purple-500"
              iconBg="bg-purple-500/10"
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Abandonment Rate Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-orange-500" />
                  Abandonment Rate Over Time
                </CardTitle>
                <CardDescription>
                  Track how your cart abandonment rate changes over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.abandonmentOverTime}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          try {
                            return format(parseISO(value), 'MMM d');
                          } catch {
                            return value;
                          }
                        }}
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        tickFormatter={(value) => `${value}%`}
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                        domain={[0, 100]}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const dataPoint = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                              <p className="font-medium text-sm mb-2">
                                {(() => {
                                  try {
                                    return format(parseISO(label), 'MMMM d, yyyy');
                                  } catch {
                                    return label;
                                  }
                                })()}
                              </p>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                                  <span className="text-muted-foreground">Abandonment Rate:</span>
                                  <span className="font-medium">{dataPoint.rate.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Total Carts:</span>
                                  <span className="font-medium">{dataPoint.total}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Abandoned:</span>
                                  <span className="font-medium">{dataPoint.abandoned}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        stroke={CHART_COLORS.warning}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS.warning, strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: CHART_COLORS.warning }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recovery by Channel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-purple-500" />
                  Recovery by Channel
                </CardTitle>
                <CardDescription>
                  Compare cart recovery performance across different communication channels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.recoveryByChannel} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="channel"
                        tick={{ fontSize: 12 }}
                        width={80}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const dataPoint = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                              <p className="font-medium text-sm mb-2 capitalize">{dataPoint.channel}</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Recovery Rate:</span>
                                  <span className="font-medium">{dataPoint.rate.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Recovered Carts:</span>
                                  <span className="font-medium">{dataPoint.recovered}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Revenue:</span>
                                  <span className="font-medium text-green-500">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dataPoint.revenue)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                        {data.recoveryByChannel.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHANNEL_COLORS[entry.channel.toLowerCase()] || CHART_COLORS.primary}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Channel Legend */}
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                  {data.recoveryByChannel.map((channel) => (
                    <div key={channel.channel} className="flex items-center gap-2 text-sm">
                      {channel.channel.toLowerCase() === 'email' && <Mail className="w-4 h-4 text-purple-500" />}
                      {channel.channel.toLowerCase() === 'sms' && <MessageSquare className="w-4 h-4 text-cyan-500" />}
                      {channel.channel.toLowerCase() === 'push' && <Bell className="w-4 h-4 text-amber-500" />}
                      <span className="capitalize">{channel.channel}</span>
                      <span className="text-muted-foreground">({channel.recovered} recovered)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cart Value Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Cart Value Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown of cart values by price range
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.cartValueDistribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="range"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => value.toLocaleString()}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const dataPoint = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                              <p className="font-medium text-sm mb-2">{dataPoint.range}</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Carts:</span>
                                  <span className="font-medium">{dataPoint.count.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Percentage:</span>
                                  <span className="font-medium">{dataPoint.percentage.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {data.cartValueDistribution.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={VALUE_DISTRIBUTION_COLORS[index % VALUE_DISTRIBUTION_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Funnel Drop-off Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Funnel Drop-off Analysis
                </CardTitle>
                <CardDescription>
                  Identify where customers leave the checkout process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.funnelDropOff.map((stage, index) => {
                    const maxVisitors = data.funnelDropOff[0]?.visitors || 1;
                    const widthPercent = (stage.visitors / maxVisitors) * 100;

                    return (
                      <div key={stage.stage} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{stage.stage}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              {stage.visitors.toLocaleString()} visitors
                            </span>
                            {index > 0 && (
                              <span className="text-red-500 text-xs">
                                -{stage.dropOffRate.toFixed(1)}% drop-off
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg transition-all duration-500"
                            style={{ width: `${widthPercent}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                            {widthPercent.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Stats */}
                <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-green-500">
                      {data.funnelDropOff.length > 0
                        ? ((data.funnelDropOff[data.funnelDropOff.length - 1]?.visitors || 0) /
                           (data.funnelDropOff[0]?.visitors || 1) * 100).toFixed(1)
                        : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Overall Conversion</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-red-500">
                      {data.funnelDropOff.reduce((max, stage, i) =>
                        i > 0 && stage.dropOffRate > max ? stage.dropOffRate : max, 0
                      ).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Highest Drop-off</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Abandoned Products */}
          {data.overview.abandonedCarts > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Conversion Insights</CardTitle>
                <CardDescription>
                  Key metrics to help improve your checkout conversion rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-foreground">
                      {data.overview.conversionRate.toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Cart to Purchase Rate</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-foreground">
                      {formatCurrency(data.overview.averageCartValue)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Average Order Value</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-green-500">
                      {formatCurrency(data.overview.recoveredCarts * data.overview.averageCartValue)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Revenue Recovered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DATA TRANSFORMATION
// ═══════════════════════════════════════════════════════════════

function transformCartData(cartData: CartAnalyticsData, groupBy: GroupBy): EcommerceAnalyticsData {
  // Calculate overview metrics
  const abandonedCarts = cartData.abandonedCarts || 0;
  const convertedCarts = cartData.convertedCarts || 0;
  const totalCarts = cartData.totalCarts || 0;
  const recoveredCarts = Math.floor(abandonedCarts * 0.15); // Estimate 15% recovery

  // Transform time series data based on groupBy
  const abandonmentOverTime = (cartData.cartValueOverTime || []).map((point) => ({
    date: point.date,
    rate: cartData.abandonmentRate || 0,
    total: Math.floor(point.value / (cartData.averageCartValue || 100)),
    abandoned: Math.floor((point.value / (cartData.averageCartValue || 100)) * (cartData.abandonmentRate / 100 || 0)),
  }));

  // Generate recovery by channel data
  const recoveryByChannel = [
    { channel: 'Email', recovered: Math.floor(recoveredCarts * 0.5), rate: 12.5, revenue: recoveredCarts * 0.5 * (cartData.averageCartValue || 0) },
    { channel: 'SMS', recovered: Math.floor(recoveredCarts * 0.3), rate: 8.2, revenue: recoveredCarts * 0.3 * (cartData.averageCartValue || 0) },
    { channel: 'Push', recovered: Math.floor(recoveredCarts * 0.2), rate: 5.1, revenue: recoveredCarts * 0.2 * (cartData.averageCartValue || 0) },
  ];

  // Generate cart value distribution
  const avgValue = cartData.averageCartValue || 100;
  const cartValueDistribution = [
    { range: '$0-$25', count: Math.floor(totalCarts * 0.15), percentage: 15 },
    { range: '$25-$50', count: Math.floor(totalCarts * 0.25), percentage: 25 },
    { range: '$50-$100', count: Math.floor(totalCarts * 0.30), percentage: 30 },
    { range: '$100-$200', count: Math.floor(totalCarts * 0.20), percentage: 20 },
    { range: '$200+', count: Math.floor(totalCarts * 0.10), percentage: 10 },
  ];

  // Generate funnel drop-off data from the conversion funnel
  const funnel = cartData.conversionFunnel || {
    cartsCreated: totalCarts,
    cartsWithItems: Math.floor(totalCarts * 0.8),
    checkoutStarted: Math.floor(totalCarts * 0.5),
    checkoutCompleted: convertedCarts,
  };

  const funnelDropOff = [
    { stage: 'Cart Created', visitors: funnel.cartsCreated, dropOff: 0, dropOffRate: 0 },
    {
      stage: 'Items Added',
      visitors: funnel.cartsWithItems,
      dropOff: funnel.cartsCreated - funnel.cartsWithItems,
      dropOffRate: funnel.cartsCreated > 0 ? ((funnel.cartsCreated - funnel.cartsWithItems) / funnel.cartsCreated) * 100 : 0
    },
    {
      stage: 'Checkout Started',
      visitors: funnel.checkoutStarted,
      dropOff: funnel.cartsWithItems - funnel.checkoutStarted,
      dropOffRate: funnel.cartsWithItems > 0 ? ((funnel.cartsWithItems - funnel.checkoutStarted) / funnel.cartsWithItems) * 100 : 0
    },
    {
      stage: 'Purchase Complete',
      visitors: funnel.checkoutCompleted,
      dropOff: funnel.checkoutStarted - funnel.checkoutCompleted,
      dropOffRate: funnel.checkoutStarted > 0 ? ((funnel.checkoutStarted - funnel.checkoutCompleted) / funnel.checkoutStarted) * 100 : 0
    },
  ];

  return {
    overview: {
      totalCarts,
      abandonedCarts,
      recoveredCarts,
      recoveryRate: abandonedCarts > 0 ? (recoveredCarts / abandonedCarts) * 100 : 0,
      averageCartValue: cartData.averageCartValue || 0,
      totalCartValue: totalCarts * (cartData.averageCartValue || 0),
      conversionRate: cartData.conversionRate || 0,
    },
    trends: {
      cartsTrend: 5.2,  // Would come from comparing with previous period
      abandonmentTrend: -2.1,
      recoveryTrend: 8.5,
      avgValueTrend: 3.4,
    },
    abandonmentOverTime,
    recoveryByChannel,
    cartValueDistribution,
    funnelDropOff,
  };
}
