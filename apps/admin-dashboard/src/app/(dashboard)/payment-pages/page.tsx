'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Plus,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Building2,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Archive,
  Trash2,
  Eye,
  Edit,
  X,
  Globe,
  TrendingUp,
  CreditCard,
  BarChart3,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  paymentPagesApi,
  PaymentPage,
  PaymentPageStats,
  PaymentPageFilters,
  CreatePaymentPageInput,
  UpdatePaymentPageInput,
  PAGE_TYPES,
  PAGE_STATUSES,
  PaymentPageType,
  PaymentPageStatus,
} from '@/lib/api/payment-pages';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PAGE_SIZE = 20;

const TYPE_ICONS: Record<PaymentPageType, React.ReactNode> = {
  CHECKOUT: <CreditCard className="w-4 h-4" />,
  SUBSCRIPTION: <RefreshCw className="w-4 h-4" />,
  DONATION: <Globe className="w-4 h-4" />,
  INVOICE: <FileText className="w-4 h-4" />,
};

// ═══════════════════════════════════════════════════════════════
// STATS CARDS COMPONENT
// ═══════════════════════════════════════════════════════════════

interface StatsCardsProps {
  stats: PaymentPageStats | null;
  loading: boolean;
}

function StatsCards({ stats, loading }: StatsCardsProps) {
  const cards = [
    {
      label: 'Total Pages',
      value: stats?.total || 0,
      icon: <FileText className="w-5 h-5" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Published',
      value: stats?.published || 0,
      icon: <Globe className="w-5 h-5" />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Conversion Rate',
      value: stats ? `${(stats.conversionRate * 100).toFixed(1)}%` : '0%',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Total Revenue',
      value: stats
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalRevenue)
        : '$0',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={cn('p-2 rounded-lg', card.bgColor, card.color)}>
              {card.icon}
            </div>
            <span className="text-sm text-zinc-500">{card.label}</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE ROW ACTIONS DROPDOWN
// ═══════════════════════════════════════════════════════════════

interface RowActionsProps {
  page: PaymentPage;
  onEdit: () => void;
  onDuplicate: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function RowActions({ page, onEdit, onDuplicate, onPublish, onArchive, onDelete }: RowActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1">
            <button
              onClick={() => { onEdit(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/checkout/${page.slug}`); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
            <button
              onClick={() => { window.open(`/payment-pages/preview/${page.id}`, '_blank'); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={() => { window.open(`/checkout/${page.slug}`, '_blank'); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700"
            >
              <ExternalLink className="w-4 h-4" />
              Open Live Page
            </button>
            <button
              onClick={() => { onDuplicate(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700"
            >
              <Copy className="w-4 h-4" />
              Duplicate
            </button>
            <div className="border-t border-zinc-700 my-1" />
            {page.status === 'DRAFT' && (
              <button
                onClick={() => { onPublish(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-400 hover:bg-zinc-700"
              >
                <Globe className="w-4 h-4" />
                Publish
              </button>
            )}
            {page.status === 'PUBLISHED' && (
              <button
                onClick={() => { onArchive(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-yellow-400 hover:bg-zinc-700"
              >
                <Archive className="w-4 h-4" />
                Archive
              </button>
            )}
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-zinc-700"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PAGE MODAL (CREATE/EDIT)
// ═══════════════════════════════════════════════════════════════

interface PageModalProps {
  page?: PaymentPage | null;
  onClose: () => void;
  onSave: (data: CreatePaymentPageInput | UpdatePaymentPageInput) => Promise<void>;
}

function PageModal({ page, onClose, onSave }: PageModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePaymentPageInput>({
    name: page?.name || '',
    slug: page?.slug || '',
    type: page?.type || 'CHECKOUT',
    themeId: page?.themeId || undefined,
    paymentConfig: page?.paymentConfig || {},
    acceptedGateways: page?.acceptedGateways || {},
    customerFieldsConfig: page?.customerFieldsConfig || {},
    logoUrl: page?.logoUrl || '',
    faviconUrl: page?.faviconUrl || '',
    brandColor: page?.brandColor || '#3B82F6',
    title: page?.title || '',
    description: page?.description || '',
    headline: page?.headline || '',
    subheadline: page?.subheadline || '',
    successUrl: page?.successUrl || '',
    cancelUrl: page?.cancelUrl || '',
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: !page ? generateSlug(name) : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Failed to save payment page:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-4 md:inset-x-auto md:inset-y-10 md:left-1/2 md:-translate-x-1/2 md:max-w-2xl md:w-full z-50 overflow-hidden">
        <div className="h-full bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">
              {page ? 'Edit Payment Page' : 'Create Payment Page'}
            </h2>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="My Checkout Page"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="my-checkout-page"
                  />
                  <p className="mt-1 text-xs text-zinc-500">URL: checkout/{formData.slug}</p>
                </div>
              </div>

              {/* Page Type */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Page Type *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(Object.keys(PAGE_TYPES) as PaymentPageType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, type }))}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors',
                        formData.type === type
                          ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400'
                          : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      )}
                    >
                      {TYPE_ICONS[type]}
                      <span className="text-xs font-medium">{PAGE_TYPES[type].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Branding */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white">Branding</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Headline</label>
                    <input
                      type="text"
                      value={formData.headline || ''}
                      onChange={(e) => setFormData((p) => ({ ...p, headline: e.target.value }))}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      placeholder="Complete your purchase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Brand Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.brandColor || '#3B82F6'}
                        onChange={(e) => setFormData((p) => ({ ...p, brandColor: e.target.value }))}
                        className="w-10 h-10 rounded-lg border border-zinc-700 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.brandColor || '#3B82F6'}
                        onChange={(e) => setFormData((p) => ({ ...p, brandColor: e.target.value }))}
                        className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Subheadline</label>
                  <input
                    type="text"
                    value={formData.subheadline || ''}
                    onChange={(e) => setFormData((p) => ({ ...p, subheadline: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="Secure payment powered by our platform"
                  />
                </div>
              </div>

              {/* URLs */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white">Redirect URLs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Success URL</label>
                    <input
                      type="url"
                      value={formData.successUrl || ''}
                      onChange={(e) => setFormData((p) => ({ ...p, successUrl: e.target.value }))}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      placeholder="https://yoursite.com/success"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Cancel URL</label>
                    <input
                      type="url"
                      value={formData.cancelUrl || ''}
                      onChange={(e) => setFormData((p) => ({ ...p, cancelUrl: e.target.value }))}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      placeholder="https://yoursite.com/cancel"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 transition-colors"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {page ? 'Save Changes' : 'Create Page'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function PaymentPagesPage() {
  const { accessLevel, selectedCompanyId } = useHierarchy();
  const [pages, setPages] = useState<PaymentPage[]>([]);
  const [stats, setStats] = useState<PaymentPageStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<PaymentPageType | ''>('');
  const [statusFilter, setStatusFilter] = useState<PaymentPageStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState<PaymentPage | null>(null);

  // Check if user needs to select a company
  const needsCompanySelection = (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (needsCompanySelection) {
      setStats(null);
      setStatsLoading(false);
      return;
    }

    setStatsLoading(true);
    try {
      const result = await paymentPagesApi.getStats(selectedCompanyId || undefined);
      setStats(result);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [selectedCompanyId, needsCompanySelection]);

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
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter]);

  // Handlers
  const handleSavePage = async (data: CreatePaymentPageInput | UpdatePaymentPageInput) => {
    if (editingPage) {
      await paymentPagesApi.update(editingPage.id, data as UpdatePaymentPageInput, selectedCompanyId || undefined);
    } else {
      await paymentPagesApi.create(data as CreatePaymentPageInput, selectedCompanyId || undefined);
    }
    fetchPages();
    fetchStats();
  };

  const handlePublish = async (pageItem: PaymentPage) => {
    try {
      await paymentPagesApi.publish(pageItem.id, selectedCompanyId || undefined);
      fetchPages();
      fetchStats();
    } catch (err) {
      console.error('Failed to publish page:', err);
    }
  };

  const handleArchive = async (pageItem: PaymentPage) => {
    try {
      await paymentPagesApi.archive(pageItem.id, selectedCompanyId || undefined);
      fetchPages();
      fetchStats();
    } catch (err) {
      console.error('Failed to archive page:', err);
    }
  };

  const handleDuplicate = async (pageItem: PaymentPage) => {
    try {
      const newName = `${pageItem.name} (Copy)`;
      const newSlug = `${pageItem.slug}-copy-${Date.now()}`;
      await paymentPagesApi.duplicate(pageItem.id, newName, newSlug, selectedCompanyId || undefined);
      fetchPages();
      fetchStats();
    } catch (err) {
      console.error('Failed to duplicate page:', err);
    }
  };

  const handleDelete = async (pageItem: PaymentPage) => {
    if (!confirm(`Are you sure you want to delete "${pageItem.name}"?`)) return;
    try {
      await paymentPagesApi.delete(pageItem.id, selectedCompanyId || undefined);
      fetchPages();
      fetchStats();
    } catch (err) {
      console.error('Failed to delete page:', err);
    }
  };

  const openCreateModal = () => {
    setEditingPage(null);
    setShowModal(true);
  };

  const openEditModal = (pageItem: PaymentPage) => {
    setEditingPage(pageItem);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPage(null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Pages</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Create and manage hosted checkout pages
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/payment-pages/browse"
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <LayoutGrid className="w-4 h-4" />
            Browse
          </Link>
          <Link
            href="/payment-pages/templates"
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Templates
          </Link>
          <button
            onClick={openCreateModal}
            disabled={needsCompanySelection}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Page
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {!needsCompanySelection && <StatsCards stats={stats} loading={statsLoading} />}

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name or slug..."
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
            onClick={() => { fetchPages(); fetchStats(); }}
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
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
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
            Choose a company from the sidebar to view and manage payment pages.
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
              : 'Get started by creating your first payment page.'}
          </p>
          {!search && !typeFilter && !statusFilter && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Page
            </button>
          )}
        </div>
      )}

      {/* Pages Table */}
      {pages.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Created
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
                const statusConfig = PAGE_STATUSES[pageItem.status] || { label: pageItem.status, color: 'bg-zinc-500/10 text-zinc-400' };
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
                          style={{ backgroundColor: pageItem.brandColor ? `${pageItem.brandColor}20` : 'rgba(59, 130, 246, 0.1)' }}
                        >
                          {pageItem.logoUrl ? (
                            <img src={pageItem.logoUrl} alt="" className="w-6 h-6 object-contain" />
                          ) : (
                            <span className="text-lg" style={{ color: pageItem.brandColor || '#3B82F6' }}>
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
                        {typeConfig?.label || pageItem.type}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('px-2 py-1 rounded text-xs font-medium', statusConfig.color)}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {formatDate(pageItem.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-zinc-500">
                        <span className="truncate max-w-[150px]">checkout/{pageItem.slug}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/checkout/${pageItem.slug}`)}
                          className="p-1 text-zinc-500 hover:text-white transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <RowActions
                        page={pageItem}
                        onEdit={() => openEditModal(pageItem)}
                        onDuplicate={() => handleDuplicate(pageItem)}
                        onPublish={() => handlePublish(pageItem)}
                        onArchive={() => handleArchive(pageItem)}
                        onDelete={() => handleDelete(pageItem)}
                      />
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
        <div className="flex items-center justify-between mt-4">
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

      {/* Page Modal */}
      {showModal && (
        <PageModal
          page={editingPage}
          onClose={closeModal}
          onSave={handleSavePage}
        />
      )}
    </div>
  );
}
