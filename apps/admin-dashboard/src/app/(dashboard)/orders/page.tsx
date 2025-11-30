'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  ChevronDown,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Calendar,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ordersApi, Order, OrderQueryParams, OrderStats } from '@/lib/api/orders';
import { formatOrderNumber } from '@/lib/order-utils';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: CheckCircle2 },
  PROCESSING: { label: 'Processing', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', icon: Package },
  SHIPPED: { label: 'Shipped', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  CANCELED: { label: 'Canceled', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
  REFUNDED: { label: 'Refunded', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: RefreshCw },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400' },
  AUTHORIZED: { label: 'Authorized', color: 'bg-blue-500/10 text-blue-400' },
  PAID: { label: 'Paid', color: 'bg-green-500/10 text-green-400' },
  PARTIALLY_PAID: { label: 'Partial', color: 'bg-orange-500/10 text-orange-400' },
  REFUNDED: { label: 'Refunded', color: 'bg-red-500/10 text-red-400' },
  FAILED: { label: 'Failed', color: 'bg-red-500/10 text-red-400' },
};

const FULFILLMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  UNFULFILLED: { label: 'Unfulfilled', color: 'bg-zinc-500/10 text-zinc-400' },
  PARTIALLY_FULFILLED: { label: 'Partial', color: 'bg-yellow-500/10 text-yellow-400' },
  FULFILLED: { label: 'Fulfilled', color: 'bg-green-500/10 text-green-400' },
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

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'bg-zinc-500/10 text-zinc-400', icon: AlertCircle };
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border', config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const config = PAYMENT_STATUS_CONFIG[status] || { label: status, color: 'bg-zinc-500/10 text-zinc-400' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', config.color)}>
      {config.label}
    </span>
  );
}

function FulfillmentBadge({ status }: { status: string }) {
  const config = FULFILLMENT_STATUS_CONFIG[status] || { label: status, color: 'bg-zinc-500/10 text-zinc-400' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', config.color)}>
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'cyan'
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color?: 'cyan' | 'yellow' | 'green' | 'purple';
}) {
  const colorClasses = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs md:text-sm text-zinc-500 mb-1">{title}</p>
          <p className="text-xl md:text-2xl font-bold text-white">{value}</p>
          {trend && <p className="text-xs text-zinc-500 mt-1">{trend}</p>}
        </div>
        <div className={cn('p-2.5 md:p-3 rounded-xl border', colorClasses[color])}>
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OrderStats | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentFilter, setPaymentFilter] = useState<string>('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Time filter - default to day
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('day');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Fetch stats on mount
  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await ordersApi.getStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    }
    fetchStats();
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: OrderQueryParams = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };

      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (paymentFilter) params.paymentStatus = paymentFilter;
      if (fulfillmentFilter) params.fulfillmentStatus = fulfillmentFilter;

      // Add date range filter
      if (timeFilter === 'custom' && customStartDate && customEndDate) {
        params.startDate = new Date(customStartDate).toISOString();
        params.endDate = new Date(customEndDate + 'T23:59:59').toISOString();
      } else {
        const dateRange = getDateRangeForFilter(timeFilter);
        if (dateRange) {
          params.startDate = dateRange.startDate;
          params.endDate = dateRange.endDate;
        }
      }

      const result = await ordersApi.list(params);
      setOrders(result.orders);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, paymentFilter, fulfillmentFilter, timeFilter, customStartDate, customEndDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, paymentFilter, fulfillmentFilter, timeFilter, customStartDate, customEndDate]);

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

  return (
    <>
      <Header
        title="Orders"
        subtitle={loading ? 'Loading...' : `${total} orders`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatsCard
            title="Total Orders"
            value={stats?.totalOrders ?? '-'}
            icon={ShoppingCart}
            color="cyan"
          />
          <StatsCard
            title="Pending"
            value={stats?.pendingOrders ?? '-'}
            icon={Clock}
            color="yellow"
          />
          <StatsCard
            title="Processing"
            value={stats?.processingOrders ?? '-'}
            icon={Package}
            color="purple"
          />
          <StatsCard
            title="Revenue"
            value={stats ? formatCurrencyShort(stats.totalRevenue) : '-'}
            icon={DollarSign}
            trend={stats ? `Avg: ${formatCurrency(stats.averageOrderValue)}` : undefined}
            color="green"
          />
        </div>

        {/* Time Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-900/50 border border-zinc-800 rounded-lg w-fit">
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
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                timeFilter === option.value
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Custom Date Picker */}
        {showCustomDatePicker && timeFilter === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <button
              onClick={() => {
                setCustomStartDate('');
                setCustomEndDate('');
                setTimeFilter('day');
                setShowCustomDatePicker(false);
              }}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by order number, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  showFilters
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                )}
              >
                <Filter className="w-4 h-4" />
                <span className="sm:inline">Filters</span>
                {(statusFilter || paymentFilter || fulfillmentFilter) && (
                  <span className="w-2 h-2 bg-cyan-400 rounded-full" />
                )}
              </button>

              {/* Refresh */}
              <button
                onClick={fetchOrders}
                className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Refresh"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              {/* Status Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Payment Status Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Payment</label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="">All Payments</option>
                  {Object.entries(PAYMENT_STATUS_CONFIG).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Fulfillment Status Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">Fulfillment</label>
                <select
                  value={fulfillmentFilter}
                  onChange={(e) => setFulfillmentFilter(e.target.value)}
                  className="px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="">All Fulfillment</option>
                  {Object.entries(FULFILLMENT_STATUS_CONFIG).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                {(statusFilter || paymentFilter || fulfillmentFilter) && (
                  <button
                    onClick={() => {
                      setStatusFilter('');
                      setPaymentFilter('');
                      setFulfillmentFilter('');
                    }}
                    className="w-full sm:w-auto px-3 py-2.5 text-sm text-zinc-400 hover:text-white transition-colors bg-zinc-800/50 rounded-lg"
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
      {loading && orders.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="w-12 h-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No orders found</h3>
          <p className="text-sm text-zinc-500 max-w-md">
            {search || statusFilter || paymentFilter || fulfillmentFilter
              ? 'Try adjusting your search or filters to find what you\'re looking for.'
              : 'Orders will appear here once customers place them.'}
          </p>
        </div>
      )}

      {/* Orders Table */}
      {orders.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Fulfillment</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <td className="px-4 py-4">
                      <Link href={`/orders/${order.id}`} className="block" onClick={(e) => e.stopPropagation()}>
                        <p className="text-sm font-medium text-white hover:text-cyan-400 transition-colors">
                          {formatOrderNumber(order.orderNumber)}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {order.items?.length || 0} items
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-300">{formatDate(order.orderedAt)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-4">
                      <PaymentBadge status={order.paymentStatus} />
                    </td>
                    <td className="px-4 py-4">
                      <FulfillmentBadge status={order.fulfillmentStatus} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="text-sm font-medium text-white">
                        {formatCurrency(order.total, order.currency)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
              <p className="text-sm text-zinc-500">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} orders
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-zinc-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
