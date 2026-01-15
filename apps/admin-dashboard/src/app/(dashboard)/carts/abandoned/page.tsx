'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Mail,
  RefreshCw,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  ExternalLink,
  Package,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  adminCartsApi,
  Cart,
  CartStats,
  CartFilters,
} from '@/lib/api/cart';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { formatDistanceToNow } from 'date-fns';

// ===============================================================
// CONSTANTS
// ===============================================================

const PAGE_SIZE = 20;

type TimeFilter = 'hour' | 'day' | 'week' | 'month' | 'all';

const TIME_FILTER_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: 'hour', label: 'Last Hour' },
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

function getDateRangeForFilter(filter: TimeFilter): { startDate: string; endDate: string } | null {
  if (filter === 'all') return null;

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

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'cyan',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'cyan' | 'yellow' | 'green' | 'orange' | 'purple' | 'red';
}) {
  const colorClasses = {
    cyan: 'bg-primary/10 text-primary border-primary/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="bg-card/50 border border-border rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs md:text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-xl md:text-2xl font-bold text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={cn('p-2.5 md:p-3 rounded-xl border', colorClasses[color])}>
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
      </div>
    </div>
  );
}

function RecoveryConfirmDialog({
  open,
  count,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-xl p-6 max-w-md w-[calc(100%-2rem)] sm:w-full shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Send Recovery Emails</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          You are about to send recovery emails to <strong>{count}</strong> abandoned cart{count !== 1 ? 's' : ''}.
          This will notify customers about their abandoned items and encourage them to complete their purchase.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading} className="min-h-[44px] touch-manipulation">
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="min-h-[44px] touch-manipulation">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
            Send {count} Email{count !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===============================================================
// MAIN PAGE
// ===============================================================

export default function AbandonedCartsPage() {
  const router = useRouter();
  const { selectedCompanyId } = useHierarchy();

  // Data state
  const [carts, setCarts] = useState<Cart[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<CartStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [minValue, setMinValue] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk actions
  const [sendingRecovery, setSendingRecovery] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const dateRange = getDateRangeForFilter(timeFilter);
        const data = await adminCartsApi.getStats({
          companyId: selectedCompanyId || undefined,
          dateFrom: dateRange?.startDate,
          dateTo: dateRange?.endDate,
        });
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    }
    fetchStats();
  }, [timeFilter, selectedCompanyId]);

  // Fetch abandoned carts
  const fetchCarts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: CartFilters = {
        status: 'ABANDONED',
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        sortBy: 'abandonedAt',
        sortOrder: 'desc',
      };

      if (search) params.search = search;
      if (minValue) params.minValue = parseFloat(minValue);

      const dateRange = getDateRangeForFilter(timeFilter);
      if (dateRange) {
        params.dateFrom = dateRange.startDate;
        params.dateTo = dateRange.endDate;
      }

      const result = await adminCartsApi.list(params);
      setCarts(result.carts || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error('Failed to fetch abandoned carts:', err);
      setError('Failed to load abandoned carts. Please try again.');
      toast.error('Failed to load abandoned carts');
    } finally {
      setLoading(false);
    }
  }, [page, search, timeFilter, minValue, selectedCompanyId]);

  useEffect(() => {
    fetchCarts();
  }, [fetchCarts]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [search, timeFilter, minValue, selectedCompanyId]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(carts.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (cartId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(cartId);
    } else {
      newSelected.delete(cartId);
    }
    setSelectedIds(newSelected);
  };

  // Send recovery email(s)
  const handleSendRecovery = async (ids: string[]) => {
    if (ids.length === 0) return;

    if (ids.length > 1) {
      setConfirmDialogOpen(true);
      return;
    }

    // Single email - send directly
    setSendingIds(new Set(ids));
    try {
      await adminCartsApi.sendRecoveryEmail(ids[0]);
      toast.success('Recovery email sent successfully');
      fetchCarts();
    } catch (err) {
      toast.error('Failed to send recovery email');
    } finally {
      setSendingIds(new Set());
    }
  };

  const handleBulkSendConfirm = async () => {
    setSendingRecovery(true);
    try {
      const result = await adminCartsApi.sendRecoveryEmailBulk(Array.from(selectedIds));
      toast.success(`Sent ${result.sent} recovery email${result.sent !== 1 ? 's' : ''}`);
      if (result.failed > 0) {
        toast.warning(`${result.failed} email${result.failed !== 1 ? 's' : ''} failed to send`);
      }
      setSelectedIds(new Set());
      fetchCarts();
    } catch (err) {
      toast.error('Failed to send recovery emails');
    } finally {
      setSendingRecovery(false);
      setConfirmDialogOpen(false);
    }
  };

  // Dismiss/archive cart
  const handleDismiss = async (cartId: string) => {
    try {
      await adminCartsApi.archive(cartId);
      toast.success('Cart archived');
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cartId);
        return newSet;
      });
      fetchCarts();
    } catch (err) {
      toast.error('Failed to archive cart');
    }
  };

  // Helpers
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const getCustomerDisplay = (cart: Cart) => {
    if (cart.customer) {
      const name = [cart.customer.firstName, cart.customer.lastName].filter(Boolean).join(' ');
      return {
        name: name || 'Unknown',
        email: cart.customer.email,
        hasEmail: true,
      };
    }
    return {
      name: 'Guest',
      email: cart.visitorId ? `Visitor ${cart.visitorId.substring(0, 8)}...` : 'Anonymous',
      hasEmail: false,
    };
  };

  const allSelected = carts.length > 0 && selectedIds.size === carts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < carts.length;
  const hasActiveFilters = search || minValue;

  // Filter carts with emails for recovery
  const cartsWithEmail = carts.filter((c) => c.customer?.email);
  const selectedWithEmail = Array.from(selectedIds).filter((id) => {
    const cart = carts.find((c) => c.id === id);
    return cart?.customer?.email;
  });

  return (
    <>
      <Header
        title="Abandoned Cart Recovery"
        subtitle={loading ? 'Loading...' : `${total} abandoned carts`}
        backLink={{ href: '/carts', label: 'All Carts' }}
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatsCard
            title="Abandoned Carts"
            value={stats?.abandonedCarts ?? '-'}
            icon={ShoppingCart}
            color="orange"
          />
          <StatsCard
            title="Total Value"
            value={stats ? formatCurrencyShort(stats.totalAbandonedValue || 0) : '-'}
            subtitle="Potential revenue"
            icon={DollarSign}
            color="red"
          />
          <StatsCard
            title="Abandonment Rate"
            value={stats ? `${stats.abandonmentRate.toFixed(1)}%` : '-'}
            icon={TrendingUp}
            color="yellow"
          />
          <StatsCard
            title="Avg Cart Value"
            value={stats ? formatCurrency(stats.averageCartValue) : '-'}
            icon={Users}
            color="purple"
          />
        </div>

        {/* Time Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-card/50 border border-border rounded-lg w-fit">
          {TIME_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeFilter(option.value)}
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

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by customer email, name..."
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
              Filters
              {hasActiveFilters && <span className="w-2 h-2 bg-primary rounded-full" />}
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

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-card/50 border border-border rounded-lg">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Min Cart Value</label>
              <input
                type="number"
                placeholder="$0"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                className="px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
              />
            </div>
            <div className="flex items-end">
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setSearch('');
                    setMinValue('');
                  }}
                  className="w-full sm:w-auto px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors bg-muted/50 rounded-lg min-h-[44px] touch-manipulation"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                className={cn(someSelected && 'data-[state=checked]:bg-primary/50')}
                {...(someSelected && { 'data-state': 'checked' })}
              />
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size} selected
              </span>
              {selectedWithEmail.length < selectedIds.size && (
                <Badge variant="warning" className="text-xs">
                  {selectedIds.size - selectedWithEmail.length} without email
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="min-h-[36px] touch-manipulation"
              >
                Clear
              </Button>
              {selectedWithEmail.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => handleSendRecovery(selectedWithEmail)}
                  disabled={sendingRecovery}
                  className="min-h-[36px] touch-manipulation"
                >
                  {sendingRecovery ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Send Recovery ({selectedWithEmail.length})
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && carts.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && carts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-green-500/10 p-4 mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No abandoned carts</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {hasActiveFilters
                ? 'No abandoned carts match your filters. Try adjusting your search criteria.'
                : "Great news! There are no abandoned carts to recover right now."}
            </p>
          </div>
        )}

        {/* Cart List */}
        {carts.length > 0 && (
          <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        className={cn(someSelected && 'data-[state=checked]:bg-primary/50')}
                        {...(someSelected && { 'data-state': 'checked' })}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Items</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Abandoned</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {carts.map((cart) => {
                    const customer = getCustomerDisplay(cart);
                    const isSelected = selectedIds.has(cart.id);
                    const isSending = sendingIds.has(cart.id);

                    return (
                      <tr
                        key={cart.id}
                        className={cn(
                          'hover:bg-muted/50 transition-colors',
                          isSelected && 'bg-primary/5'
                        )}
                      >
                        <td className="px-4 py-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectOne(cart.id, checked as boolean)}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">{customer.email}</p>
                            {!customer.hasEmail && (
                              <Badge variant="secondary" className="text-xs mt-1">No email</Badge>
                            )}
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
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {cart.abandonedAt
                                ? formatDistanceToNow(new Date(cart.abandonedAt), { addSuffix: true })
                                : 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/carts/${cart.id}`)}
                              className="min-h-[36px]"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            {customer.hasEmail && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendRecovery([cart.id])}
                                disabled={isSending}
                                className="min-h-[36px]"
                              >
                                {isSending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Mail className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDismiss(cart.id)}
                              className="min-h-[36px] text-muted-foreground hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
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
                const isSelected = selectedIds.has(cart.id);
                const isSending = sendingIds.has(cart.id);

                return (
                  <div
                    key={cart.id}
                    className={cn(
                      'p-4',
                      isSelected && 'bg-primary/5'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectOne(cart.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-foreground">{customer.name}</span>
                          {!customer.hasEmail && (
                            <Badge variant="secondary" className="text-xs">No email</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-2">{customer.email}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Package className="w-3.5 h-3.5" />
                            {cart.totals.itemCount} items
                          </span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(cart.totals.grandTotal, cart.currency)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Abandoned {cart.abandonedAt
                            ? formatDistanceToNow(new Date(cart.abandonedAt), { addSuffix: true })
                            : 'unknown time ago'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/carts/${cart.id}`)}
                          className="min-h-[36px] min-w-[36px] p-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        {customer.hasEmail && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendRecovery([cart.id])}
                            disabled={isSending}
                            className="min-h-[36px] min-w-[36px] p-2"
                          >
                            {isSending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
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

      {/* Bulk Recovery Confirmation Dialog */}
      <RecoveryConfirmDialog
        open={confirmDialogOpen}
        count={selectedWithEmail.length}
        onConfirm={handleBulkSendConfirm}
        onCancel={() => setConfirmDialogOpen(false)}
        loading={sendingRecovery}
      />
    </>
  );
}
