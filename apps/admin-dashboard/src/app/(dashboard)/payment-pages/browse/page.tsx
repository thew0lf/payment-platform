'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  RefreshCw,
  Building2,
  Eye,
  Edit,
  Copy,
  ExternalLink,
  Globe,
  CreditCard,
  FileText,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle,
  Archive,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  paymentPagesApi,
  PaymentPage,
  PaymentPageFilters,
  PAGE_TYPES,
  PAGE_STATUSES,
  PaymentPageType,
  PaymentPageStatus,
} from '@/lib/api/payment-pages';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PAGE_SIZE = 12;

const TYPE_ICONS: Record<PaymentPageType, React.ReactNode> = {
  CHECKOUT: <CreditCard className="w-5 h-5" />,
  SUBSCRIPTION: <RefreshCw className="w-5 h-5" />,
  DONATION: <Globe className="w-5 h-5" />,
  INVOICE: <FileText className="w-5 h-5" />,
};

const STATUS_ICONS: Record<PaymentPageStatus, React.ReactNode> = {
  DRAFT: <Clock className="w-4 h-4" />,
  PUBLISHED: <CheckCircle className="w-4 h-4" />,
  ARCHIVED: <Archive className="w-4 h-4" />,
};

// ═══════════════════════════════════════════════════════════════
// PAGE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

interface PageCardProps {
  page: PaymentPage;
  onPreview: () => void;
}

function PageCard({ page, onPreview }: PageCardProps) {
  const statusConfig = PAGE_STATUSES[page.status];
  const typeConfig = PAGE_TYPES[page.type];

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/checkout/${page.slug}`);
  };

  return (
    <div className="group bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all hover:shadow-lg hover:shadow-cyan-500/5">
      {/* Preview Image / Thumbnail */}
      <div
        className="relative aspect-[16/10] bg-zinc-800 overflow-hidden cursor-pointer"
        onClick={onPreview}
      >
        {/* Gradient Background with Brand Color */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${page.brandColor || '#3B82F6'}15, ${page.brandColor || '#3B82F6'}05)`,
          }}
        />

        {/* Simulated Page Preview */}
        <div className="absolute inset-4 bg-zinc-900/80 rounded-lg border border-zinc-700/50 p-3 transform group-hover:scale-[1.02] transition-transform">
          {/* Mini Header */}
          <div className="flex items-center gap-2 mb-3">
            {page.logoUrl ? (
              <img src={page.logoUrl} alt="" className="w-6 h-6 object-contain rounded" />
            ) : (
              <div
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: `${page.brandColor || '#3B82F6'}30` }}
              >
                <span style={{ color: page.brandColor || '#3B82F6' }} className="text-xs font-bold">
                  {page.name.charAt(0)}
                </span>
              </div>
            )}
            <div className="h-2 bg-zinc-700 rounded w-20" />
          </div>

          {/* Mini Form Preview */}
          <div className="space-y-2">
            <div className="h-2 bg-zinc-700/50 rounded w-3/4" />
            <div className="h-6 bg-zinc-800 rounded border border-zinc-700" />
            <div className="h-6 bg-zinc-800 rounded border border-zinc-700" />
            <div
              className="h-8 rounded mt-3"
              style={{ backgroundColor: page.brandColor || '#3B82F6' }}
            />
          </div>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-900 rounded-lg font-medium hover:bg-zinc-100 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
            statusConfig.color
          )}>
            {STATUS_ICONS[page.status]}
            {statusConfig.label}
          </span>
        </div>

        {/* Type Badge */}
        <div className="absolute top-3 left-3">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-zinc-900/80 text-zinc-300">
            {TYPE_ICONS[page.type]}
            {typeConfig.label}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white truncate">{page.name}</h3>
            {page.headline && (
              <p className="text-xs text-zinc-500 truncate mt-0.5">{page.headline}</p>
            )}
          </div>
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0"
            style={{ backgroundColor: `${page.brandColor || '#3B82F6'}20` }}
          />
        </div>

        {/* URL */}
        <div className="flex items-center gap-2 mb-4">
          <code className="flex-1 text-xs text-zinc-500 truncate bg-zinc-800/50 px-2 py-1 rounded">
            checkout/{page.slug}
          </code>
          <button
            onClick={copyLink}
            className="p-1.5 text-zinc-500 hover:text-white transition-colors"
            title="Copy link"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/payment-pages/${page.id}`}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
          <button
            onClick={onPreview}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium hover:bg-cyan-500/20 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          {page.status === 'PUBLISHED' && (
            <a
              href={`/checkout/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors"
              title="Open live page"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function BrowsePaymentPagesPage() {
  const { accessLevel, selectedCompanyId } = useHierarchy();
  const [pages, setPages] = useState<PaymentPage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<PaymentPageType | ''>('');
  const [statusFilter, setStatusFilter] = useState<PaymentPageStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Check if user needs to select a company
  const needsCompanySelection = (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  // Fetch pages
  const fetchPages = useCallback(async () => {
    if (needsCompanySelection) {
      setPages([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters: PaymentPageFilters = {};
      if (search) filters.search = search;
      if (typeFilter) filters.type = typeFilter;
      if (statusFilter) filters.status = statusFilter;

      const result = await paymentPagesApi.list(
        selectedCompanyId || undefined,
        filters,
        page,
        PAGE_SIZE
      );
      setPages(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch payment pages:', err);
      setError('Failed to load payment pages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter, selectedCompanyId, needsCompanySelection]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter]);

  const handlePreview = (pageItem: PaymentPage) => {
    window.open(`/payment-pages/preview/${pageItem.id}`, '_blank');
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Browse Payment Pages</h1>
            <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs font-medium rounded-full">
              {total} pages
            </span>
          </div>
          <p className="text-sm text-zinc-500">
            Explore and preview your payment pages
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'grid'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-white'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'list'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-white'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Link
            href="/payment-pages"
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Manage Pages
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => { setStatusFilter(''); setTypeFilter(''); }}
          className={cn(
            'p-4 rounded-xl border transition-colors text-left',
            !statusFilter && !typeFilter
              ? 'bg-cyan-500/10 border-cyan-500/30'
              : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
          )}
        >
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <LayoutGrid className="w-4 h-4" />
            <span className="text-xs">All Pages</span>
          </div>
          <p className="text-xl font-bold text-white">{total}</p>
        </button>
        <button
          onClick={() => { setStatusFilter('PUBLISHED'); setTypeFilter(''); }}
          className={cn(
            'p-4 rounded-xl border transition-colors text-left',
            statusFilter === 'PUBLISHED'
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
          )}
        >
          <div className="flex items-center gap-2 text-green-400 mb-1">
            <Globe className="w-4 h-4" />
            <span className="text-xs">Published</span>
          </div>
          <p className="text-xl font-bold text-white">
            {pages.filter(p => p.status === 'PUBLISHED').length}
          </p>
        </button>
        <button
          onClick={() => { setStatusFilter('DRAFT'); setTypeFilter(''); }}
          className={cn(
            'p-4 rounded-xl border transition-colors text-left',
            statusFilter === 'DRAFT'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
          )}
        >
          <div className="flex items-center gap-2 text-yellow-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Drafts</span>
          </div>
          <p className="text-xl font-bold text-white">
            {pages.filter(p => p.status === 'DRAFT').length}
          </p>
        </button>
        <button
          onClick={() => { setTypeFilter('CHECKOUT'); setStatusFilter(''); }}
          className={cn(
            'p-4 rounded-xl border transition-colors text-left',
            typeFilter === 'CHECKOUT'
              ? 'bg-blue-500/10 border-blue-500/30'
              : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
          )}
        >
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <CreditCard className="w-4 h-4" />
            <span className="text-xs">Checkout</span>
          </div>
          <p className="text-xl font-bold text-white">
            {pages.filter(p => p.type === 'CHECKOUT').length}
          </p>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

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
          </button>

          <button
            onClick={fetchPages}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as PaymentPageType | '')}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="">All Types</option>
                {(Object.keys(PAGE_TYPES) as PaymentPageType[]).map((type) => (
                  <option key={type} value={type}>{PAGE_TYPES[type].label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PaymentPageStatus | '')}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="">All Statuses</option>
                {(Object.keys(PAGE_STATUSES) as PaymentPageStatus[]).map((status) => (
                  <option key={status} value={status}>{PAGE_STATUSES[status].label}</option>
                ))}
              </select>
            </div>

            {(typeFilter || statusFilter) && (
              <button
                onClick={() => {
                  setTypeFilter('');
                  setStatusFilter('');
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
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* Company Selection Required */}
      {needsCompanySelection && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Select a Company</h3>
          <p className="text-sm text-zinc-500 max-w-md">
            Choose a company from the sidebar to browse payment pages.
          </p>
        </div>
      )}

      {/* Loading State */}
      {!needsCompanySelection && loading && pages.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!needsCompanySelection && !loading && pages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="w-12 h-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No payment pages found</h3>
          <p className="text-sm text-zinc-500 max-w-md mb-4">
            {search || typeFilter || statusFilter
              ? 'Try adjusting your search or filters.'
              : 'Create your first payment page to get started.'}
          </p>
          <Link
            href="/payment-pages"
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Create Page
          </Link>
        </div>
      )}

      {/* Pages Grid */}
      {pages.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {pages.map((pageItem) => (
            <PageCard
              key={pageItem.id}
              page={pageItem}
              onPreview={() => handlePreview(pageItem)}
            />
          ))}
        </div>
      )}

      {/* Pages List */}
      {pages.length > 0 && viewMode === 'list' && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Page
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {pages.map((pageItem) => {
                const statusConfig = PAGE_STATUSES[pageItem.status];
                const typeConfig = PAGE_TYPES[pageItem.type];

                return (
                  <tr
                    key={pageItem.id}
                    className="hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${pageItem.brandColor || '#3B82F6'}20` }}
                        >
                          {pageItem.logoUrl ? (
                            <img src={pageItem.logoUrl} alt="" className="w-6 h-6 object-contain" />
                          ) : (
                            <span style={{ color: pageItem.brandColor || '#3B82F6' }}>
                              {TYPE_ICONS[pageItem.type]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{pageItem.name}</p>
                          {pageItem.headline && (
                            <p className="text-xs text-zinc-500 truncate max-w-[200px]">{pageItem.headline}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        {TYPE_ICONS[pageItem.type]}
                        {typeConfig.label}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium w-fit', statusConfig.color)}>
                        {STATUS_ICONS[pageItem.status]}
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-zinc-500">checkout/{pageItem.slug}</code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handlePreview(pageItem)}
                          className="p-2 text-zinc-500 hover:text-cyan-400 transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/payment-pages/${pageItem.id}`}
                          className="p-2 text-zinc-500 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        {pageItem.status === 'PUBLISHED' && (
                          <a
                            href={`/checkout/${pageItem.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-zinc-500 hover:text-green-400 transition-colors"
                            title="Open live page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-zinc-500">
            Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-zinc-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
