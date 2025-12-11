'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
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
  Plus,
  ShoppingBag,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
import { ordersApi, Order } from '@/lib/api/orders';
import { formatOrderNumber } from '@/lib/order-utils';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';

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
    <div className="bg-card/50 border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-lg font-semibold text-foreground">{value}</p>
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
        <h3 className="text-lg font-medium text-foreground mb-2">Failed to Load Returns</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          There was an error loading the RMA data. Please try refreshing the page.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Package className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">No Returns Found</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        No return requests match your current filters. Try adjusting your search or filters.
      </p>
    </div>
  );
}

// Order Selection Modal for creating RMAs
function OrderSelectionModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [orderSearch, setOrderSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchOrders = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setOrders([]);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const result = await ordersApi.list({ search: query, limit: 10 });
      setOrders(result.orders || []);
    } catch (err) {
      console.error('Failed to search orders:', err);
      toast.error('Failed to search orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (orderSearch) {
        searchOrders(orderSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [orderSearch, searchOrders]);

  const handleSelectOrder = (order: Order) => {
    router.push(`/rmas/new?orderId=${order.id}&customerId=${order.customerId}`);
    onClose();
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Create RMA</h2>
            <p className="text-sm text-muted-foreground">Select an order to create a return for</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by order number, customer name, or email..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[400px]">
          {!hasSearched && (
            <div className="py-12 text-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Search for an order to get started</p>
            </div>
          )}

          {hasSearched && !loading && orders.length === 0 && (
            <div className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No orders found matching your search</p>
            </div>
          )}

          {orders.length > 0 && (
            <div className="divide-y divide-border">
              {orders.map((order) => {
                // Get customer info from shippingSnapshot if available
                const shipping = order.shippingSnapshot as { firstName?: string; lastName?: string; email?: string } | null;
                const customerName = shipping?.firstName && shipping?.lastName
                  ? `${shipping.firstName} ${shipping.lastName}`
                  : `Customer ${order.customerId.slice(0, 8)}`;

                return (
                  <button
                    key={order.id}
                    onClick={() => handleSelectOrder(order)}
                    className="w-full px-6 py-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {formatOrderNumber(order.orderNumber)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {customerName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(order.createdAt)} • {order.items?.length || 0} items
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(order.total, order.currency)}
                        </p>
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1',
                          order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' :
                          order.status === 'PROCESSING' ? 'bg-blue-500/10 text-blue-400' :
                          order.status === 'SHIPPED' ? 'bg-purple-500/10 text-purple-400' :
                          'bg-zinc-500/10 text-zinc-400'
                        )}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Tip: You can also create an RMA from the order detail page
          </p>
        </div>
      </div>
    </div>,
    document.body
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

  // Create RMA modal
  const [showCreateModal, setShowCreateModal] = useState(false);

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
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create RMA
          </Button>
        }
      />

      {/* Order Selection Modal */}
      <OrderSelectionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by RMA number, order, or customer..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 bg-card/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Status:</span>
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
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-muted text-muted-foreground border border-border hover:bg-muted'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Type:</span>
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
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-muted text-muted-foreground border border-border hover:bg-muted'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>


        {/* Table */}
        <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-3 p-4 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
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
              <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          )}

          {/* Empty State */}
          {!loading && rmas.length === 0 && <EmptyState isError={!!error} />}

          {/* Table Rows */}
          {!loading && rmas.length > 0 && (
            <div className="divide-y divide-border">
              {rmas.map((rma) => {
                const totalValue = rma.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

                return (
                  <div
                    key={rma.id}
                    className="p-4 hover:bg-muted/30 transition-colors"
                  >
                    {/* Mobile Layout */}
                    <div className="lg:hidden space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {formatRMANumber(rma.rmaNumber)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(rma.createdAt)}
                          </p>
                        </div>
                        <StatusBadge status={rma.status} />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-muted-foreground">Order: </span>
                          <Link
                            href={`/orders/${rma.orderId}`}
                            className="text-primary hover:text-primary"
                          >
                            {rma.order?.orderNumber ? formatOrderNumber(rma.order.orderNumber) : rma.orderId.slice(0, 8)}
                          </Link>
                        </div>
                        <span className="text-muted-foreground">{formatCurrency(totalValue)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {getRMATypeLabel(rma.type)} - {getReturnReasonLabel(rma.reason)}
                        </div>
                        <Link
                          href={`/rmas/${rma.id}`}
                          className="text-xs text-primary hover:text-primary"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden lg:grid lg:grid-cols-12 gap-3 items-center">
                      <div className="col-span-2 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {formatRMANumber(rma.rmaNumber)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(rma.createdAt)}
                        </p>
                      </div>
                      <div className="col-span-2 min-w-0">
                        <Link
                          href={`/orders/${rma.orderId}`}
                          className="text-sm text-primary hover:text-primary truncate block"
                        >
                          {rma.order?.orderNumber ? formatOrderNumber(rma.order.orderNumber) : rma.orderId.slice(0, 8)}
                        </Link>
                        <p className="text-xs text-muted-foreground">{formatCurrency(totalValue)}</p>
                      </div>
                      <div className="col-span-2 min-w-0">
                        <span className="text-sm text-foreground">{getRMATypeLabel(rma.type)}</span>
                      </div>
                      <div className="col-span-2 min-w-0">
                        <span className="text-sm text-muted-foreground truncate block" title={getReturnReasonLabel(rma.reason)}>
                          {getReturnReasonLabel(rma.reason)}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <StatusBadge status={rma.status} />
                      </div>
                      <div className="col-span-2 text-right">
                        <Link
                          href={`/rmas/${rma.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary hover:text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
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
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
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
