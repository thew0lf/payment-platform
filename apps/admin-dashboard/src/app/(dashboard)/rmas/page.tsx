'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  rmasApi,
  RMA,
  RMAStatus,
  RMAType,
  getRMAStatusColor,
  getRMAStatusLabel,
  getRMATypeLabel,
  getReturnReasonLabel,
  formatRMANumber,
} from '@/lib/api/rmas';
import { formatOrderNumber } from '@/lib/order-utils';
import { Header } from '@/components/layout/header';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_FILTERS: { value: RMAStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'LABEL_SENT', label: 'Label Sent' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'INSPECTING', label: 'Inspecting' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
];

const TYPE_FILTERS: { value: RMAType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'RETURN', label: 'Return' },
  { value: 'EXCHANGE', label: 'Exchange' },
  { value: 'WARRANTY', label: 'Warranty' },
  { value: 'REPAIR', label: 'Repair' },
];

const PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: RMAStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border', getRMAStatusColor(status))}>
      {getRMAStatusLabel(status)}
    </span>
  );
}

function StatsCard({ title, value, icon: Icon, color }: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs text-zinc-500">{title}</p>
          <p className="text-lg font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ isError }: { isError?: boolean }) {
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <AlertCircle className="w-12 h-12 text-red-500/50 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Failed to Load Returns</h3>
        <p className="text-sm text-zinc-500 text-center max-w-md">
          There was an error loading the RMA data. Please try refreshing the page.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Package className="w-12 h-12 text-zinc-700 mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">No Returns Found</h3>
      <p className="text-sm text-zinc-500 text-center max-w-md">
        No return requests match your current filters. Try adjusting your search or filters.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function RMAsPage() {
  const [rmas, setRmas] = useState<RMA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<RMAStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<RMAType | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Stats
  const [stats, setStats] = useState({
    requested: 0,
    inTransit: 0,
    received: 0,
    completed: 0,
  });

  const fetchRMAs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await rmasApi.list({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        search: searchQuery || undefined,
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
      });

      setRmas(response.items);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch RMAs:', err);
      setError('Failed to load returns. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery, currentPage]);

  const fetchStats = useCallback(async () => {
    try {
      // Count by status from the list response
      const [requested, inTransit, received, completed] = await Promise.all([
        rmasApi.list({ status: 'REQUESTED', limit: 1 }),
        rmasApi.list({ status: 'IN_TRANSIT', limit: 1 }),
        rmasApi.list({ status: 'RECEIVED', limit: 1 }),
        rmasApi.list({ status: 'COMPLETED', limit: 1 }),
      ]);

      setStats({
        requested: requested.total,
        inTransit: inTransit.total,
        received: received.total,
        completed: completed.total,
      });
    } catch (err) {
      console.error('Failed to fetch RMA stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchRMAs();
  }, [fetchRMAs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  return (
    <>
      <Header
        title="Returns (RMA)"
        subtitle="Manage return merchandise authorizations"
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Requested"
            value={stats.requested}
            icon={Clock}
            color="bg-yellow-500/10 text-yellow-400"
          />
          <StatsCard
            title="In Transit"
            value={stats.inTransit}
            icon={Truck}
            color="bg-purple-500/10 text-purple-400"
          />
          <StatsCard
            title="Received"
            value={stats.received}
            icon={Package}
            color="bg-blue-500/10 text-blue-400"
          />
          <StatsCard
            title="Completed"
            value={stats.completed}
            icon={CheckCircle2}
            color="bg-green-500/10 text-green-400"
          />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by RMA number, order, or customer..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Status:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setStatusFilter(filter.value);
                  setCurrentPage(1);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  statusFilter === filter.value
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Type:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setTypeFilter(filter.value);
                  setCurrentPage(1);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  typeFilter === filter.value
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>


        {/* Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-3 p-4 bg-zinc-800/50 border-b border-zinc-700 text-sm font-medium text-zinc-400">
            <div className="col-span-2">RMA #</div>
            <div className="col-span-2">Order</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Reason</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 text-zinc-500 animate-spin" />
            </div>
          )}

          {/* Empty State */}
          {!loading && rmas.length === 0 && <EmptyState isError={!!error} />}

          {/* Table Rows */}
          {!loading && rmas.length > 0 && (
            <div className="divide-y divide-zinc-800">
              {rmas.map((rma) => {
                const totalValue = rma.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

                return (
                  <div
                    key={rma.id}
                    className="p-4 hover:bg-zinc-800/30 transition-colors"
                  >
                    {/* Mobile Layout */}
                    <div className="lg:hidden space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {formatRMANumber(rma.rmaNumber)}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {formatDate(rma.createdAt)}
                          </p>
                        </div>
                        <StatusBadge status={rma.status} />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-zinc-500">Order: </span>
                          <Link
                            href={`/orders/${rma.orderId}`}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            {rma.order?.orderNumber ? formatOrderNumber(rma.order.orderNumber) : rma.orderId.slice(0, 8)}
                          </Link>
                        </div>
                        <span className="text-zinc-400">{formatCurrency(totalValue)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-zinc-400">
                          {getRMATypeLabel(rma.type)} - {getReturnReasonLabel(rma.reason)}
                        </div>
                        <Link
                          href={`/rmas/${rma.id}`}
                          className="text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden lg:grid lg:grid-cols-12 gap-3 items-center">
                      <div className="col-span-2 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {formatRMANumber(rma.rmaNumber)}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {formatDate(rma.createdAt)}
                        </p>
                      </div>
                      <div className="col-span-2 min-w-0">
                        <Link
                          href={`/orders/${rma.orderId}`}
                          className="text-sm text-cyan-400 hover:text-cyan-300 truncate block"
                        >
                          {rma.order?.orderNumber ? formatOrderNumber(rma.order.orderNumber) : rma.orderId.slice(0, 8)}
                        </Link>
                        <p className="text-xs text-zinc-500">{formatCurrency(totalValue)}</p>
                      </div>
                      <div className="col-span-2 min-w-0">
                        <span className="text-sm text-zinc-300">{getRMATypeLabel(rma.type)}</span>
                      </div>
                      <div className="col-span-2 min-w-0">
                        <span className="text-sm text-zinc-400 truncate block" title={getReturnReasonLabel(rma.reason)}>
                          {getReturnReasonLabel(rma.reason)}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <StatusBadge status={rma.status} />
                      </div>
                      <div className="col-span-2 text-right">
                        <Link
                          href={`/rmas/${rma.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Showing {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-zinc-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
