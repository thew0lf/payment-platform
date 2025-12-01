'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RotateCcw,
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  Package,
  RefreshCw,
  Settings,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  refundsApi,
  Refund,
  RefundStatus,
  RefundType,
  RefundReason,
  formatRefundNumber,
  getRefundStatusColor,
  getRefundReasonLabel,
  canApproveRefund,
  canRejectRefund,
} from '@/lib/api/refunds';
import { formatOrderNumber } from '@/lib/order-utils';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_FILTERS: { value: RefundStatus | 'ALL'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'ALL', label: 'All Refunds', icon: RotateCcw },
  { value: 'PENDING', label: 'Pending', icon: Clock },
  { value: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
  { value: 'REJECTED', label: 'Rejected', icon: XCircle },
  { value: 'PROCESSING', label: 'Processing', icon: RefreshCw },
  { value: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
  { value: 'CANCELLED', label: 'Cancelled', icon: XCircle },
  { value: 'FAILED', label: 'Failed', icon: AlertCircle },
];

const STATUS_CONFIG: Record<RefundStatus, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: 'Pending', icon: Clock },
  APPROVED: { label: 'Approved', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', icon: XCircle },
  PROCESSING: { label: 'Processing', icon: RefreshCw },
  COMPLETED: { label: 'Completed', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', icon: XCircle },
  FAILED: { label: 'Failed', icon: AlertCircle },
};

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

function StatusBadge({ status }: { status: RefundStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', getRefundStatusColor(status))}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color = 'text-cyan-400'
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-zinc-500">{title}</span>
        <Icon className={cn('w-5 h-5', color)} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<RefundStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRefunds, setSelectedRefunds] = useState<Set<string>>(new Set());
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Time filter
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Pagination
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    totalRefunds: 0,
    pendingRefunds: 0,
    approvedRefunds: 0,
    rejectedRefunds: 0,
    completedRefunds: 0,
    totalRefundAmount: 0,
    averageRefundAmount: 0,
  });

  useEffect(() => {
    fetchRefunds();
    fetchStats();
  }, [selectedStatus, searchQuery, offset, timeFilter, customStartDate, customEndDate]);

  const fetchRefunds = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        limit,
        offset,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };

      if (selectedStatus !== 'ALL') {
        params.status = selectedStatus;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      // Add date range from time filter
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

      const data = await refundsApi.list(params);
      setRefunds(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch refunds:', err);
      setError('Failed to load refunds. Please try again.');
      // Use mock data for development
      setRefunds(generateMockRefunds());
      setTotal(generateMockRefunds().length);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      let startDate: string | undefined;
      let endDate: string | undefined;

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

      const data = await refundsApi.getStats(startDate, endDate);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      // Use mock stats
      setStats({
        totalRefunds: 42,
        pendingRefunds: 8,
        approvedRefunds: 5,
        rejectedRefunds: 2,
        completedRefunds: 27,
        totalRefundAmount: 12450.00,
        averageRefundAmount: 296.43,
      });
    }
  };

  const handleApprove = async (refundId: string) => {
    setProcessingAction(refundId);
    try {
      const updated = await refundsApi.approve(refundId);
      setRefunds(refunds.map(r => r.id === refundId ? updated : r));
    } catch (err) {
      console.error('Failed to approve refund:', err);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async (refundId: string, reason: string) => {
    setProcessingAction(refundId);
    try {
      const updated = await refundsApi.reject(refundId, reason);
      setRefunds(refunds.map(r => r.id === refundId ? updated : r));
    } catch (err) {
      console.error('Failed to reject refund:', err);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedRefunds.size === 0) return;

    setProcessingAction('bulk');
    try {
      await refundsApi.bulkApprove(Array.from(selectedRefunds));
      setSelectedRefunds(new Set());
      fetchRefunds();
    } catch (err) {
      console.error('Failed to bulk approve:', err);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleBulkReject = async (reason: string) => {
    if (selectedRefunds.size === 0) return;

    setProcessingAction('bulk');
    try {
      await refundsApi.bulkReject(Array.from(selectedRefunds), reason);
      setSelectedRefunds(new Set());
      fetchRefunds();
    } catch (err) {
      console.error('Failed to bulk reject:', err);
    } finally {
      setProcessingAction(null);
    }
  };

  const toggleSelectRefund = (refundId: string) => {
    const newSelected = new Set(selectedRefunds);
    if (newSelected.has(refundId)) {
      newSelected.delete(refundId);
    } else {
      newSelected.add(refundId);
    }
    setSelectedRefunds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRefunds.size === refunds.length) {
      setSelectedRefunds(new Set());
    } else {
      setSelectedRefunds(new Set(refunds.map(r => r.id)));
    }
  };

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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Refunds</h1>
          <p className="text-sm text-zinc-500">Manage refund requests and approvals</p>
        </div>
        <Link
          href="/settings/refunds"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors text-sm"
        >
          <Settings className="w-4 h-4" />
          Refund Settings
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Refunds"
          value={stats.totalRefunds}
          icon={RotateCcw}
        />
        <StatCard
          title="Pending Approval"
          value={stats.pendingRefunds}
          icon={Clock}
          color="text-yellow-400"
        />
        <StatCard
          title="Total Amount"
          value={formatCurrency(stats.totalRefundAmount)}
          icon={DollarSign}
          color="text-green-400"
        />
        <StatCard
          title="Avg Refund"
          value={formatCurrency(stats.averageRefundAmount)}
          icon={DollarSign}
        />
      </div>

      {/* Time Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
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
                setOffset(0);
              }}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                timeFilter === option.value
                  ? 'bg-cyan-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Custom Date Picker */}
        {showCustomDatePicker && (
          <div className="mt-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm text-zinc-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-zinc-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by refund number, order, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {STATUS_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = selectedStatus === filter.value;
            return (
              <button
                key={filter.value}
                onClick={() => setSelectedStatus(filter.value)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-cyan-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                )}
              >
                <Icon className="w-4 h-4" />
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRefunds.size > 0 && (
        <div className="bg-cyan-900/20 border border-cyan-800 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm text-cyan-400">
              {selectedRefunds.size} refund{selectedRefunds.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleBulkApprove}
                disabled={processingAction === 'bulk'}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <Check className="w-4 h-4" />
                Approve All
              </button>
              <button
                onClick={() => handleBulkReject('Bulk rejection')}
                disabled={processingAction === 'bulk'}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                Reject All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refunds List */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-3 p-4 bg-zinc-800/50 border-b border-zinc-700 text-sm font-medium text-zinc-400">
          <div className="col-span-1 flex items-center">
            <input
              type="checkbox"
              checked={selectedRefunds.size === refunds.length && refunds.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 bg-zinc-700 border-zinc-600 rounded text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0"
            />
          </div>
          <div className="col-span-2">Refund #</div>
          <div className="col-span-2">Order</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-1">Reason</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-zinc-800">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
            </div>
          ) : refunds.length > 0 ? (
            refunds.map((refund) => (
              <div
                key={refund.id}
                className="lg:grid lg:grid-cols-12 gap-3 p-4 hover:bg-zinc-800/30 transition-colors"
              >
                {/* Mobile Layout */}
                <div className="lg:hidden space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedRefunds.has(refund.id)}
                        onChange={() => toggleSelectRefund(refund.id)}
                        className="mt-1 w-4 h-4 bg-zinc-700 border-zinc-600 rounded text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0"
                      />
                      <div>
                        <p className="text-sm font-medium text-white font-mono">
                          {formatRefundNumber(refund.refundNumber || refund.id)}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {formatDate(refund.createdAt)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={refund.status} />
                  </div>

                  <div className="pl-7 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Order:</span>
                      <Link
                        href={`/orders/${refund.orderId}`}
                        className="text-cyan-400 hover:text-cyan-300 font-mono text-xs"
                      >
                        {refund.order ? formatOrderNumber(refund.order.orderNumber) : refund.orderId}
                      </Link>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Amount:</span>
                      <span className="text-white font-medium">
                        {formatCurrency(refund.refundAmount || 0, refund.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Reason:</span>
                      <span className="text-zinc-300 text-xs">
                        {getRefundReasonLabel(refund.reason)}
                      </span>
                    </div>
                  </div>

                  {canApproveRefund(refund) && (
                    <div className="pl-7 flex gap-2">
                      <button
                        onClick={() => handleApprove(refund.id)}
                        disabled={processingAction === refund.id}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(refund.id, 'Rejected')}
                        disabled={processingAction === refund.id}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {/* Desktop Layout */}
                <div className="hidden lg:contents">
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedRefunds.has(refund.id)}
                      onChange={() => toggleSelectRefund(refund.id)}
                      className="w-4 h-4 bg-zinc-700 border-zinc-600 rounded text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0"
                    />
                  </div>
                  <div className="col-span-2 flex flex-col justify-center min-w-0">
                    <p className="text-sm font-medium text-white font-mono truncate">
                      {formatRefundNumber(refund.refundNumber || refund.id)}
                    </p>
                    <p className="text-xs text-zinc-500">{formatDate(refund.createdAt)}</p>
                  </div>
                  <div className="col-span-2 flex items-center min-w-0">
                    <Link
                      href={`/orders/${refund.orderId}`}
                      className="text-sm text-cyan-400 hover:text-cyan-300 truncate"
                    >
                      {refund.order?.orderNumber ? formatOrderNumber(refund.order.orderNumber) : 'View Order'}
                    </Link>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <p className="text-sm font-medium text-white">
                      {formatCurrency(refund.refundAmount || 0, refund.currency)}
                    </p>
                  </div>
                  <div className="col-span-1 flex items-center min-w-0">
                    <p className="text-xs text-zinc-300 truncate" title={getRefundReasonLabel(refund.reason)}>{getRefundReasonLabel(refund.reason)}</p>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <StatusBadge status={refund.status} />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    {canApproveRefund(refund) ? (
                      <>
                        <button
                          onClick={() => handleApprove(refund.id)}
                          disabled={processingAction === refund.id}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs font-medium"
                          title="Approve"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(refund.id, 'Rejected')}
                          disabled={processingAction === refund.id}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-xs font-medium"
                          title="Reject"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-500">—</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <RotateCcw className="w-12 h-12 text-zinc-700 mb-4" />
              <h3 className="text-lg font-medium text-white mb-1">No refunds found</h3>
              <p className="text-sm text-zinc-500">
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'Refund requests will appear here'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between p-4 bg-zinc-800/50 border-t border-zinc-700">
            <p className="text-sm text-zinc-500">
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} refunds
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-1.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-3 py-1.5 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MOCK DATA (for development)
// ═══════════════════════════════════════════════════════════════

function generateMockRefunds(): Refund[] {
  const statuses: RefundStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED'];
  const reasons: RefundReason[] = ['CUSTOMER_REQUEST', 'DAMAGED_ITEM', 'WRONG_ITEM', 'QUALITY_ISSUE'];

  return Array.from({ length: 10 }, (_, i) => ({
    id: `refund-${i + 1}`,
    companyId: 'company-1',
    orderId: `order-${i + 1}`,
    customerId: `customer-${i + 1}`,
    requestedBy: null,
    refundNumber: `RFN-${String(i + 1).padStart(9, '0')}`,
    type: 'FULL' as RefundType,
    status: statuses[i % statuses.length],
    reason: reasons[i % reasons.length],
    reasonDetails: 'Customer requested refund',
    originalAmount: 100 + (i * 25),
    refundAmount: 100 + (i * 25),
    currency: 'USD',
    lineItems: [],
    autoApproved: false,
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - i * 86400000).toISOString(),
    order: {
      id: `order-${i + 1}`,
      orderNumber: `VELO-COFF-A-${String(i + 1).padStart(9, '0')}`,
      total: 100 + (i * 25),
    },
    customer: {
      id: `customer-${i + 1}`,
      email: `customer${i + 1}@example.com`,
      firstName: 'John',
      lastName: `Doe ${i + 1}`,
    },
  }));
}
