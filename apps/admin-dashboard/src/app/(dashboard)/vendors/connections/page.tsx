'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  RefreshCw,
  Link2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
  Store,
  Package,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  vendorConnectionsApi,
  VendorConnection,
  ConnectionQueryParams,
  ConnectionStatus,
} from '@/lib/api/vendors';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock },
  ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
  SUSPENDED: { label: 'Suspended', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertCircle },
  TERMINATED: { label: 'Terminated', color: 'bg-muted text-muted-foreground border-border', icon: XCircle },
};

const PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.TERMINATED;
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border', config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<VendorConnection[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ConnectionStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: ConnectionQueryParams = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };

      if (statusFilter) params.status = statusFilter;

      const result = await vendorConnectionsApi.list(params);
      setConnections(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
      setError('Failed to load connections. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const handleApprove = async (id: string, approved: boolean) => {
    try {
      await vendorConnectionsApi.approve(id, approved);
      fetchConnections();
    } catch (err) {
      console.error('Failed to approve connection:', err);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendor Connections</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total > 0 ? `${total} connections found` : 'Manage vendor-client connections'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              showFilters
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-card text-muted-foreground border border-border hover:text-foreground'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {statusFilter && <span className="w-2 h-2 bg-primary rounded-full" />}
          </button>

          {/* Refresh */}
          <button
            onClick={fetchConnections}
            className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Filter Dropdowns */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 bg-card/50 border border-border rounded-lg">
            {/* Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ConnectionStatus | '')}
                className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {statusFilter && (
              <button
                onClick={() => setStatusFilter('')}
                className="self-end px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
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
      {loading && connections.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && connections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Link2 className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No connections found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {statusFilter
              ? "Try adjusting your filters to find what you're looking for."
              : 'Connections between vendors and clients will appear here.'}
          </p>
        </div>
      )}

      {/* Connections Table */}
      {connections.length > 0 && (
        <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Client Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {connections.map((connection) => (
                  <tr key={connection.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-xs font-bold text-white">
                          {connection.vendor?.name?.charAt(0) || 'V'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {connection.vendor?.name || 'Unknown Vendor'}
                          </p>
                          <p className="text-xs text-muted-foreground">{connection.vendor?.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-foreground">
                            {connection.vendorCompany?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">{connection.vendorCompany?.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-foreground">{connection.company?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{connection.company?.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={connection.status} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Package className="w-3 h-3" />
                        <span className="text-sm">{connection._count?.syncedProducts || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <ShoppingCart className="w-3 h-3" />
                        <span className="text-sm">{connection._count?.orders || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {connection.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(connection.id, true)}
                            className="px-2 py-1 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded hover:bg-green-500/20 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApprove(connection.id, false)}
                            className="px-2 py-1 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded hover:bg-red-500/20 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {connection.status !== 'PENDING' && (
                        <Link
                          href={`/vendors/connections/${connection.id}`}
                          className="text-sm text-primary hover:text-primary transition-colors"
                        >
                          View
                        </Link>
                      )}
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
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total}{' '}
                connections
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
  );
}
