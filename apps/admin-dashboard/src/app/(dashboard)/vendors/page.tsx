'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  Store,
  Building2,
  Star,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  vendorsApi,
  Vendor,
  VendorQueryParams,
  VendorStatus,
  VendorTier,
  VendorType,
} from '@/lib/api/vendors';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<
  VendorStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING_VERIFICATION: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock },
  VERIFIED: { label: 'Verified', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: CheckCircle2 },
  ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
  SUSPENDED: { label: 'Suspended', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertCircle },
  INACTIVE: { label: 'Inactive', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', icon: AlertCircle },
};

const TIER_CONFIG: Record<VendorTier, { label: string; color: string }> = {
  BRONZE: { label: 'Bronze', color: 'bg-orange-500/10 text-orange-400' },
  SILVER: { label: 'Silver', color: 'bg-zinc-500/10 text-zinc-400' },
  GOLD: { label: 'Gold', color: 'bg-yellow-500/10 text-yellow-400' },
  PLATINUM: { label: 'Platinum', color: 'bg-purple-500/10 text-purple-400' },
};

const TYPE_CONFIG: Record<VendorType, { label: string }> = {
  SUPPLIER: { label: 'Supplier' },
  DROPSHIPPER: { label: 'Dropshipper' },
  WHITE_LABEL: { label: 'White Label' },
  AFFILIATE: { label: 'Affiliate' },
};

const PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: VendorStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.INACTIVE;
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border', config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function TierBadge({ tier }: { tier: VendorTier }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.BRONZE;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', config.color)}>
      {config.label}
    </span>
  );
}

function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            'w-3 h-3',
            i < fullStars
              ? 'text-yellow-400 fill-yellow-400'
              : i === fullStars && hasHalfStar
              ? 'text-yellow-400 fill-yellow-400/50'
              : 'text-zinc-600'
          )}
        />
      ))}
      <span className="ml-1 text-xs text-zinc-400">{rating.toFixed(1)}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VendorStatus | ''>('');
  const [tierFilter, setTierFilter] = useState<VendorTier | ''>('');
  const [typeFilter, setTypeFilter] = useState<VendorType | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: VendorQueryParams = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };

      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (tierFilter) params.tier = tierFilter;
      if (typeFilter) params.vendorType = typeFilter;

      const result = await vendorsApi.list(params);
      setVendors(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
      setError('Failed to load vendors. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, tierFilter, typeFilter]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, tierFilter, typeFilter]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Vendors</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {total > 0 ? `${total} vendors found` : 'Manage your vendor network'}
          </p>
        </div>
        <Link
          href="/vendors/new"
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Vendor
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, email, business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              showFilters
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
            )}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(statusFilter || tierFilter || typeFilter) && (
              <span className="w-2 h-2 bg-cyan-400 rounded-full" />
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={fetchVendors}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Filter Dropdowns */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            {/* Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as VendorStatus | '')}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tier Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Tier</label>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value as VendorTier | '')}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="">All Tiers</option>
                {Object.entries(TIER_CONFIG).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as VendorType | '')}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="">All Types</option>
                {Object.entries(TYPE_CONFIG).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(statusFilter || tierFilter || typeFilter) && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  setTierFilter('');
                  setTypeFilter('');
                }}
                className="self-end px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
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
      {loading && vendors.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && vendors.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Store className="w-12 h-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No vendors found</h3>
          <p className="text-sm text-zinc-500 max-w-md">
            {search || statusFilter || tierFilter || typeFilter
              ? "Try adjusting your search or filters to find what you're looking for."
              : 'Get started by adding your first vendor.'}
          </p>
          {!search && !statusFilter && !tierFilter && !typeFilter && (
            <Link
              href="/vendors/new"
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Vendor
            </Link>
          )}
        </div>
      )}

      {/* Vendors Grid */}
      {vendors.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {vendors.map((vendor) => (
              <Link
                key={vendor.id}
                href={`/vendors/${vendor.id}`}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:bg-zinc-800/50 transition-colors group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-lg font-bold text-white">
                      {vendor.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                        {vendor.name}
                      </h3>
                      <p className="text-xs text-zinc-500">{vendor.code}</p>
                    </div>
                  </div>
                  <StatusBadge status={vendor.status} />
                </div>

                {/* Info */}
                <div className="space-y-2 mb-3">
                  {vendor.businessName && (
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <Building2 className="w-3 h-3" />
                      {vendor.businessName}
                    </p>
                  )}
                  {vendor.website && (
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                      <ExternalLink className="w-3 h-3" />
                      {vendor.website.replace(/^https?:\/\//, '')}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                  <div className="flex items-center gap-2">
                    <TierBadge tier={vendor.tier} />
                    <span className="text-xs text-zinc-500">
                      {TYPE_CONFIG[vendor.vendorType]?.label}
                    </span>
                  </div>
                  <RatingStars rating={vendor.averageRating} />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                  <span>{vendor._count?.vendorCompanies || 0} companies</span>
                  <span>{vendor._count?.clientConnections || 0} connections</span>
                  <span>{vendor.totalOrders || 0} orders</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <p className="text-sm text-zinc-500">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total}{' '}
                vendors
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
        </>
      )}
    </div>
  );
}
