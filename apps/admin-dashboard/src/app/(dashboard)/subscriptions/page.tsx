'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  DollarSign,
  Clock,
  Calendar,
  X,
  Repeat,
  PlayCircle,
  PauseCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  CalendarClock,
  MoreHorizontal,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  subscriptionsApi,
  Subscription,
  SubscriptionQueryParams,
  SubscriptionStats,
  SubscriptionStatus,
  BillingInterval,
} from '@/lib/api/subscriptions';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: PlayCircle },
  PAUSED: { label: 'Paused', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: PauseCircle },
  CANCELED: { label: 'Canceled', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
  EXPIRED: { label: 'Expired', color: 'bg-muted text-muted-foreground border-border', icon: AlertTriangle },
};

const INTERVAL_CONFIG: Record<BillingInterval, { label: string; shortLabel: string }> = {
  DAILY: { label: 'Daily', shortLabel: 'Day' },
  WEEKLY: { label: 'Weekly', shortLabel: 'Week' },
  BIWEEKLY: { label: 'Bi-Weekly', shortLabel: '2 Weeks' },
  MONTHLY: { label: 'Monthly', shortLabel: 'Month' },
  QUARTERLY: { label: 'Quarterly', shortLabel: 'Quarter' },
  YEARLY: { label: 'Yearly', shortLabel: 'Year' },
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

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'bg-muted text-muted-foreground', icon: AlertTriangle };
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border', config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function IntervalBadge({ interval }: { interval: BillingInterval }) {
  const config = INTERVAL_CONFIG[interval] || { label: interval, shortLabel: interval };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
      {config.label}
    </span>
  );
}

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
  color?: 'cyan' | 'yellow' | 'green' | 'purple' | 'red';
}) {
  const colorClasses = {
    cyan: 'bg-primary/10 text-primary border-primary/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className="bg-card/50 border border-border rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs md:text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-xl md:text-2xl font-bold text-foreground">{value}</p>
          {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
        <div className={cn('p-2.5 md:p-3 rounded-xl border', colorClasses[color])}>
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [intervalFilter, setIntervalFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Time filter - default to all (subscriptions are typically viewed without time constraint)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Create subscription modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Row actions
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pauseSubscription, setPauseSubscription] = useState<Subscription | null>(null);
  const [cancelSubscription, setCancelSubscription] = useState<Subscription | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Fetch stats when filters change
  useEffect(() => {
    async function fetchStats() {
      try {
        let startDate: string | undefined;
        let endDate: string | undefined;

        // Use date range from time filter
        if (timeFilter === 'custom' && customStartDate && customEndDate) {
          startDate = new Date(customStartDate).toISOString();
          endDate = new Date(customEndDate + 'T23:59:59').toISOString();
        } else {
          const dateRange = getDateRangeForFilter(timeFilter);
          if (dateRange) {
            startDate = dateRange.startDate;
            endDate = dateRange.endDate;
          }
        }

        const data = await subscriptionsApi.getStats(startDate, endDate);
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    }
    fetchStats();
  }, [timeFilter, customStartDate, customEndDate]);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: SubscriptionQueryParams = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };

      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter as SubscriptionStatus;
      if (intervalFilter) params.interval = intervalFilter as BillingInterval;

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

      const result = await subscriptionsApi.list(params);
      setSubscriptions(result.subscriptions);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
      setError('Failed to load subscriptions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, intervalFilter, timeFilter, customStartDate, customEndDate]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, intervalFilter, timeFilter, customStartDate, customEndDate]);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  const handlePauseResume = async (subscription: Subscription) => {
    setActionLoading(true);
    try {
      if (subscription.status === 'PAUSED') {
        await subscriptionsApi.resume(subscription.id);
        toast.success('Subscription resumed successfully');
      } else {
        await subscriptionsApi.pause(subscription.id);
        toast.success('Subscription paused successfully');
      }
      setPauseSubscription(null);
      fetchSubscriptions();
    } catch (err) {
      console.error('Failed to update subscription:', err);
      toast.error('Failed to update subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelSubscription) return;

    setActionLoading(true);
    try {
      await subscriptionsApi.cancel(cancelSubscription.id, {
        reason: cancelReason || undefined,
        cancelImmediately: true,
      });
      toast.success('Subscription canceled successfully');
      setCancelSubscription(null);
      setCancelReason('');
      fetchSubscriptions();
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      toast.error('Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Header
        title="Subscriptions"
        subtitle={loading ? 'Loading...' : `${total} subscriptions`}
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Subscription
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatsCard
            title="Total Active"
            value={stats?.activeSubscriptions ?? '-'}
            icon={Repeat}
            color="green"
          />
          <StatsCard
            title="Paused"
            value={stats?.pausedSubscriptions ?? '-'}
            icon={PauseCircle}
            color="yellow"
          />
          <StatsCard
            title="MRR"
            value={stats ? formatCurrencyShort(stats.monthlyRecurringRevenue) : '-'}
            icon={TrendingUp}
            trend={stats ? `Avg: ${formatCurrency(stats.averageSubscriptionValue)}` : undefined}
            color="cyan"
          />
          <StatsCard
            title="Renewing Soon"
            value={stats?.renewingThisWeek ?? '-'}
            icon={CalendarClock}
            trend={stats ? `${stats.renewingThisMonth} this month` : undefined}
            color="purple"
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
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
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
                className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={() => {
                setCustomStartDate('');
                setCustomEndDate('');
                setTimeFilter('all');
                setShowCustomDatePicker(false);
              }}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
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
                placeholder="Search by plan name, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  showFilters
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-card text-muted-foreground border border-border hover:text-foreground'
                )}
              >
                <Filter className="w-4 h-4" />
                <span className="sm:inline">Filters</span>
                {(statusFilter || intervalFilter) && (
                  <span className="w-2 h-2 bg-primary rounded-full" />
                )}
              </button>

              {/* Refresh */}
              <button
                onClick={fetchSubscriptions}
                className="p-2.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-card/50 border border-border rounded-lg">
              {/* Status Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Interval Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Billing Interval</label>
                <select
                  value={intervalFilter}
                  onChange={(e) => setIntervalFilter(e.target.value)}
                  className="px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">All Intervals</option>
                  {Object.entries(INTERVAL_CONFIG).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end lg:col-span-2">
                {(statusFilter || intervalFilter) && (
                  <button
                    onClick={() => {
                      setStatusFilter('');
                      setIntervalFilter('');
                    }}
                    className="w-full sm:w-auto px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors bg-muted/50 rounded-lg"
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
        {loading && subscriptions.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && subscriptions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Repeat className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No subscriptions found</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {search || statusFilter || intervalFilter
                ? "Try adjusting your search or filters to find what you're looking for."
                : 'Subscriptions will appear here once customers subscribe to recurring plans.'}
            </p>
          </div>
        )}

        {/* Subscriptions Table */}
        {subscriptions.length > 0 && (
          <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Interval</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Next Billing</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subscriptions.map((subscription) => (
                    <tr
                      key={subscription.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-foreground">
                          {subscription.planName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ID: {subscription.id.slice(0, 8)}...
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {subscription.customer ? (
                          <div>
                            <p className="text-sm text-foreground">
                              {subscription.customer.firstName} {subscription.customer.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {subscription.customer.email}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Customer {subscription.customerId.slice(0, 8)}...
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={subscription.status} />
                      </td>
                      <td className="px-4 py-4">
                        <IntervalBadge interval={subscription.interval} />
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-foreground">
                          {formatDate(subscription.nextBillingDate)}
                        </p>
                        {subscription.status === 'PAUSED' && subscription.pauseResumeAt && (
                          <p className="text-xs text-yellow-400 mt-0.5">
                            Resumes: {formatDate(subscription.pauseResumeAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(subscription.planAmount, subscription.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          /{INTERVAL_CONFIG[subscription.interval]?.shortLabel || subscription.interval}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === subscription.id ? null : subscription.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openMenuId === subscription.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-10">
                              {subscription.customerId && (
                                <Link
                                  href={`/customers/${subscription.customerId}`}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  <User className="w-4 h-4" />
                                  View Customer
                                </Link>
                              )}
                              {subscription.status === 'ACTIVE' && (
                                <button
                                  onClick={() => {
                                    setPauseSubscription(subscription);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-400 hover:bg-muted transition-colors"
                                >
                                  <PauseCircle className="w-4 h-4" />
                                  Pause Subscription
                                </button>
                              )}
                              {subscription.status === 'PAUSED' && (
                                <button
                                  onClick={() => {
                                    setPauseSubscription(subscription);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-400 hover:bg-muted transition-colors"
                                >
                                  <PlayCircle className="w-4 h-4" />
                                  Resume Subscription
                                </button>
                              )}
                              {(subscription.status === 'ACTIVE' || subscription.status === 'PAUSED') && (
                                <button
                                  onClick={() => {
                                    setCancelSubscription(subscription);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-muted transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Cancel Subscription
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} subscriptions
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Subscription Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Create Subscription</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                To create a new subscription, please navigate to a customer&apos;s profile and add a subscription from there.
              </p>
              <p className="text-sm text-muted-foreground">
                This ensures the subscription is properly linked to the customer and their payment methods.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pause/Resume Confirmation Modal */}
      {pauseSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPauseSubscription(null)}
          />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {pauseSubscription.status === 'PAUSED' ? 'Resume Subscription' : 'Pause Subscription'}
              </h2>
              <button
                onClick={() => setPauseSubscription(null)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                {pauseSubscription.status === 'PAUSED'
                  ? `Are you sure you want to resume the subscription for "${pauseSubscription.planName}"?`
                  : `Are you sure you want to pause the subscription for "${pauseSubscription.planName}"?`}
              </p>
              {pauseSubscription.customer && (
                <p className="text-sm text-foreground">
                  Customer: {pauseSubscription.customer.firstName} {pauseSubscription.customer.lastName}
                </p>
              )}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setPauseSubscription(null)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePauseResume(pauseSubscription)}
                  disabled={actionLoading}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
                    pauseSubscription.status === 'PAUSED'
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                  )}
                >
                  {actionLoading ? 'Processing...' : pauseSubscription.status === 'PAUSED' ? 'Resume' : 'Pause'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Subscription Modal */}
      {cancelSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setCancelSubscription(null);
              setCancelReason('');
            }}
          />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-red-400">Cancel Subscription</h2>
              <button
                onClick={() => {
                  setCancelSubscription(null);
                  setCancelReason('');
                }}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to cancel the subscription for &quot;{cancelSubscription.planName}&quot;?
              </p>
              {cancelSubscription.customer && (
                <p className="text-sm text-foreground">
                  Customer: {cancelSubscription.customer.firstName} {cancelSubscription.customer.lastName}
                </p>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Reason (optional)</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter a reason for cancellation..."
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={3}
                />
              </div>
              <p className="text-xs text-red-400">
                This action cannot be undone. The subscription will be immediately canceled.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setCancelSubscription(null);
                    setCancelReason('');
                  }}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Canceling...' : 'Cancel Subscription'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
