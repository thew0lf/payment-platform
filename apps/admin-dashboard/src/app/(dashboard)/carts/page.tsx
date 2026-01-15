'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Filter,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  X,
  User,
  Package,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  adminCartsApi,
  Cart,
  CartStatus,
  CartFilters,
  CartStats,
} from '@/lib/api/cart';
import { Header } from '@/components/layout/header';
import { useHierarchy } from '@/contexts/hierarchy-context';

// ===============================================================
// CONSTANTS
// ===============================================================

const STATUS_CONFIG: Record<CartStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: ShoppingCart },
  ABANDONED: { label: 'Abandoned', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: AlertCircle },
  CONVERTED: { label: 'Converted', color: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle2 },
  MERGED: { label: 'Merged', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: RefreshCw },
  EXPIRED: { label: 'Expired', color: 'bg-muted text-muted-foreground border-border', icon: XCircle },
  ARCHIVED: { label: 'Archived', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: Package },
};

const PAGE_SIZE = 20;

type TimeFilter = 'hour' | 'day' | 'week' | 'month' | 'custom' | 'all';

const TIME_FILTER_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: 'hour', label: 'Last Hour' },
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom' },
  { value: 'all', label: 'All Time' },
];

function getDateRangeForFilter(filter: TimeFilter): { startDate: string; endDate: string } | null {
  if (filter === 'all') return null;
  if (filter === 'custom') return null;

  const now = new Date();
  const endDate = now.toISOString();
  let startDate: Date;

  switch (filter) {
    case 'hour':
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case 'day':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      return null;
  }

  return { startDate: startDate.toISOString(), endDate };
}

// ===============================================================
// COMPONENTS
// ===============================================================

function StatusBadge({ status }: { status: CartStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'bg-muted text-muted-foreground', icon: AlertCircle };
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border', config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'cyan',
  loading = false,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color?: 'cyan' | 'yellow' | 'green' | 'orange' | 'purple';
  loading?: boolean;
}) {
  const colorClasses = {
    cyan: 'bg-primary/10 text-primary border-primary/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  const isLoading = loading || value === '-' || value === undefined || value === null;

  return (
    <div className="bg-card/50 border border-border rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs md:text-sm text-muted-foreground mb-1">{title}</p>
          {isLoading ? (
            <div className="h-7 md:h-8 w-20 bg-muted/50 rounded animate-pulse" />
          ) : (
            <p className="text-xl md:text-2xl font-bold text-foreground">{value}</p>
          )}
          {isLoading ? (
            trend && <div className="h-3 w-24 bg-muted/30 rounded mt-1.5 animate-pulse" />
          ) : (
            trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>
          )}
        </div>
        <div className={cn('p-2.5 md:p-3 rounded-xl border', colorClasses[color])}>
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
      </div>
    </div>
  );
}

// ===============================================================
// MAIN PAGE
// ===============================================================

export default function CartsPage() {
  const router = useRouter();
  const { selectedCompanyId } = useHierarchy();
  const [carts, setCarts] = useState<Cart[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CartStats | null>(null);
  const [funnels, setFunnels] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CartStatus | ''>('');
  const [funnelFilter, setFunnelFilter] = useState<string>('');
  const [minValue, setMinValue] = useState<string>('');
  const [maxValue, setMaxValue] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Time filter
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Fetch funnels for filter dropdown
  useEffect(() => {
    async function fetchFunnels() {
      try {
        const data = await adminCartsApi.getFunnels(selectedCompanyId || undefined);
        setFunnels(data);
      } catch (err) {
        console.error('Failed to fetch funnels:', err);
      }
    }
    fetchFunnels();
  }, [selectedCompanyId]);

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      try {
        let dateFrom: string | undefined;
        let dateTo: string | undefined;

        if (timeFilter === 'custom' && customStartDate && customEndDate) {
          dateFrom = new Date(customStartDate).toISOString();
          dateTo = new Date(customEndDate + 'T23:59:59').toISOString();
        } else {
          const dateRange = getDateRangeForFilter(timeFilter);
          if (dateRange) {
            dateFrom = dateRange.startDate;
            dateTo = dateRange.endDate;
          }
        }

        const data = await adminCartsApi.getStats({
          companyId: selectedCompanyId || undefined,
          dateFrom,
          dateTo,
        });
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    }
    fetchStats();
  }, [timeFilter, customStartDate, customEndDate, selectedCompanyId]);

  const fetchCarts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: CartFilters = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };

      if (selectedCompanyId) params.companyId = selectedCompanyId;
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (funnelFilter) params.funnelId = funnelFilter;
      if (minValue) params.minValue = parseFloat(minValue);
      if (maxValue) params.maxValue = parseFloat(maxValue);

      // Add date range filter
      if (timeFilter === 'custom' && customStartDate && customEndDate) {
        params.dateFrom = new Date(customStartDate).toISOString();
        params.dateTo = new Date(customEndDate + 'T23:59:59').toISOString();
      } else {
        const dateRange = getDateRangeForFilter(timeFilter);
        if (dateRange) {
          params.dateFrom = dateRange.startDate;
          params.dateTo = dateRange.endDate;
        }
      }

      const result = await adminCartsApi.list(params);
      setCarts(result.carts || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error('Failed to fetch carts:', err);
      setError('Failed to load carts. Please try again.');
      toast.error('Failed to load carts');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, funnelFilter, minValue, maxValue, timeFilter, customStartDate, customEndDate, selectedCompanyId]);

  useEffect(() => {
    fetchCarts();
  }, [fetchCarts]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, funnelFilter, minValue, maxValue, timeFilter, customStartDate, customEndDate, selectedCompanyId]);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const getCustomerDisplay = (cart: Cart) => {
    if (cart.customer) {
      const name = [cart.customer.firstName, cart.customer.lastName].filter(Boolean).join(' ');
      return {
        name: name || 'Unknown',
        email: cart.customer.email,
      };
    }
    return {
      name: 'Guest',
      email: cart.visitorId ? `Visitor ${cart.visitorId.substring(0, 8)}...` : 'Anonymous',
    };
  };

  const hasActiveFilters = statusFilter || funnelFilter || minValue || maxValue;

  return (
    <>
      <Header
        title="Carts"
        subtitle={loading ? 'Loading...' : `${total} carts`}
        actions={
          <Link
            href="/carts/abandoned"
            className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg text-sm font-medium hover:bg-orange-500/20 transition-colors min-h-[44px] touch-manipulation"
          >
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Recovery Queue</span>
            {stats?.abandonedCarts && stats.abandonedCarts > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-orange-500/20 rounded-full text-xs font-semibold">
                {stats.abandonedCarts}
              </span>
            )}
          </Link>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatsCard
            title="Total Carts"
            value={stats?.totalCarts ?? 0}
            icon={ShoppingCart}
            color="cyan"
            loading={!stats}
          />
          <StatsCard
            title="Active"
            value={stats?.activeCarts ?? 0}
            icon={Clock}
            color="green"
            loading={!stats}
          />
          <StatsCard
            title="Abandoned"
            value={stats?.abandonedCarts ?? 0}
            icon={AlertCircle}
            color="orange"
            loading={!stats}
          />
          <StatsCard
            title="Abandoned Value"
            value={stats ? formatCurrencyShort(stats.totalAbandonedValue) : '$0'}
            icon={DollarSign}
            trend={stats ? `Avg: ${formatCurrency(stats.averageCartValue)}` : undefined}
            color="purple"
            loading={!stats}
          />
        </div>

        {/* Time Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-card/50 border border-border rounded-lg w-fit">
          {TIME_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setTimeFilter(option.value);
                if (option.value === 'custom') {
                  setShowCustomDatePicker(true);
                } else {
                  setShowCustomDatePicker(false);
                }
              }}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors min-h-[44px] touch-manipulation',
                timeFilter === option.value
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Custom Date Picker */}
        {showCustomDatePicker && timeFilter === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 p-4 bg-card/50 border border-border rounded-lg">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
              />
            </div>
            <button
              onClick={() => {
                setCustomStartDate('');
                setCustomEndDate('');
                setTimeFilter('all');
                setShowCustomDatePicker(false);
              }}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] touch-manipulation"
              title="Clear custom dates"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by cart ID, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation',
                  showFilters
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-card text-muted-foreground border border-border hover:text-foreground'
                )}
              >
                <Filter className="w-4 h-4" />
                <span className="sm:inline">Filters</span>
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-primary rounded-full" />
                )}
              </button>

              {/* Refresh */}
              <button
                onClick={fetchCarts}
                className="p-2.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors min-h-[44px] touch-manipulation"
                title="Refresh"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-card/50 border border-border rounded-lg">
              {/* Status Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as CartStatus | '')}
                  className="px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
                >
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Funnel Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Funnel Source</label>
                <select
                  value={funnelFilter}
                  onChange={(e) => setFunnelFilter(e.target.value)}
                  className="px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
                >
                  <option value="">All Funnels</option>
                  {funnels.map((funnel) => (
                    <option key={funnel.id} value={funnel.id}>{funnel.name}</option>
                  ))}
                </select>
              </div>

              {/* Min Value */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Min Value</label>
                <input
                  type="number"
                  placeholder="$0"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                  className="px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
                />
              </div>

              {/* Max Value */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Max Value</label>
                <input
                  type="number"
                  placeholder="$1000"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                  className="px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
                />
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setStatusFilter('');
                      setFunnelFilter('');
                      setMinValue('');
                      setMaxValue('');
                    }}
                    className="w-full sm:w-auto px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors bg-muted/50 rounded-lg min-h-[44px] touch-manipulation"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (!carts || carts.length === 0) && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && (!carts || carts.length === 0) && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No carts found</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {search || hasActiveFilters
                ? 'Try adjusting your search or filters to find what you\'re looking for.'
                : 'Carts will appear here when customers add items to their shopping cart.'}
            </p>
          </div>
        )}

        {/* Carts Table (Desktop) */}
        {carts && carts.length > 0 && (
          <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Cart ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Items</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {carts.map((cart) => {
                    const customer = getCustomerDisplay(cart);
                    return (
                      <tr
                        key={cart.id}
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/carts/${cart.id}`)}
                        onKeyDown={(e) => e.key === 'Enter' && router.push(`/carts/${cart.id}`)}
                        tabIndex={0}
                        role="button"
                      >
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                            {cart.id.substring(0, 8)}...
                          </p>
                          {cart.funnel && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              via {cart.funnel.name}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">{customer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-foreground">{cart.totals.itemCount} items</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <p className="text-sm font-medium text-foreground">
                            {formatCurrency(cart.totals.grandTotal, cart.currency)}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={cart.status} />
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-foreground">
                            {formatDate(cart.lastActivityAt || cart.updatedAt)}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-border">
              {carts.map((cart) => {
                const customer = getCustomerDisplay(cart);
                return (
                  <div
                    key={cart.id}
                    className="p-4 active:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/carts/${cart.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/carts/${cart.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Primary row: Customer & Status */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground truncate">
                            {customer.name}
                          </span>
                          <StatusBadge status={cart.status} />
                        </div>

                        {/* Cart ID and email */}
                        <p className="text-sm text-muted-foreground truncate">
                          {cart.id.substring(0, 8)}... - {customer.email}
                        </p>

                        {/* Items and Total */}
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-foreground">{cart.totals.itemCount} items</span>
                          </div>
                          <div>
                            <span className="font-medium text-foreground">
                              {formatCurrency(cart.totals.grandTotal, cart.currency)}
                            </span>
                          </div>
                        </div>

                        {/* Last activity */}
                        <p className="text-xs text-muted-foreground">
                          Last activity: {formatDate(cart.lastActivityAt || cart.updatedAt)}
                        </p>
                      </div>

                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-border gap-3">
                <p className="text-sm text-muted-foreground text-center sm:text-left">
                  Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} carts
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] touch-manipulation"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] touch-manipulation"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
