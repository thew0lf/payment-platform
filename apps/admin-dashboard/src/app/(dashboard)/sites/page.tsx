'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  Globe,
  Store,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Star,
  Layers,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  sitesApi,
  Site,
  SiteQueryParams,
  SiteStatus,
  SiteStats,
  CreateSiteInput,
  UpdateSiteInput,
} from '@/lib/api/sites';
import { companiesApi, Company } from '@/lib/api/companies';
import { createPortal } from 'react-dom';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<
  SiteStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
  INACTIVE: { label: 'Inactive', color: 'bg-muted text-muted-foreground border-border', icon: Clock },
  SUSPENDED: { label: 'Suspended', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertCircle },
};

const PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: SiteStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.INACTIVE;
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border', config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// SITE FORM MODAL
// ═══════════════════════════════════════════════════════════════

interface SiteFormModalProps {
  site?: Site | null;
  companies: Company[];
  defaultCompanyId?: string;
  onClose: () => void;
  onSave: (data: CreateSiteInput | UpdateSiteInput) => Promise<void>;
  loading: boolean;
}

function SiteFormModal({ site, companies, defaultCompanyId, onClose, onSave, loading }: SiteFormModalProps) {
  const [companyId, setCompanyId] = useState(site?.companyId || defaultCompanyId || '');
  const [name, setName] = useState(site?.name || '');
  const [domain, setDomain] = useState(site?.domain || '');
  const [subdomain, setSubdomain] = useState(site?.subdomain || '');
  const [description, setDescription] = useState(site?.description || '');
  const [timezone, setTimezone] = useState(site?.timezone || 'UTC');
  const [currency, setCurrency] = useState(site?.currency || 'USD');
  const [isDefault, setIsDefault] = useState(site?.isDefault || false);
  const [status, setStatus] = useState<SiteStatus>(site?.status || 'ACTIVE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Site name is required');
      return;
    }
    if (!site && !companyId) {
      toast.error('Please select a company');
      return;
    }

    const data: CreateSiteInput | UpdateSiteInput = site
      ? {
          name: name.trim(),
          domain: domain.trim() || undefined,
          subdomain: subdomain.trim() || undefined,
          description: description.trim() || undefined,
          timezone,
          currency,
          isDefault,
          status,
        }
      : {
          companyId,
          name: name.trim(),
          domain: domain.trim() || undefined,
          subdomain: subdomain.trim() || undefined,
          description: description.trim() || undefined,
          timezone,
          currency,
          isDefault,
        };

    await onSave(data);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {site ? 'Edit Site' : 'Add Site'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Company (only for create) */}
          {!site && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Company <span className="text-red-400">*</span>
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
              >
                <option value="">Select a company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Site Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter site name"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
              autoFocus
            />
          </div>

          {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Domain
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
            />
          </div>

          {/* Subdomain */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Subdomain
            </label>
            <input
              type="text"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="shop.example.com"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Site description..."
              rows={3}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value="Asia/Shanghai">Shanghai</option>
              <option value="Australia/Sydney">Sydney</option>
            </select>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="AUD">AUD - Australian Dollar</option>
              <option value="JPY">JPY - Japanese Yen</option>
              <option value="CNY">CNY - Chinese Yuan</option>
              <option value="MXN">MXN - Mexican Peso</option>
            </select>
          </div>

          {/* Default Site Toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted border border-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
            <span className="text-sm text-foreground">Set as default site</span>
          </div>

          {/* Status (only for edit) */}
          {site && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SiteStatus)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
              >
                {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation active:scale-[0.98]"
            >
              {loading ? 'Saving...' : site ? 'Update Site' : 'Create Site'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════
// DELETE CONFIRMATION MODAL
// ═══════════════════════════════════════════════════════════════

interface DeleteModalProps {
  site: Site;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

function DeleteModal({ site, onClose, onConfirm, loading }: DeleteModalProps) {
  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">Delete Site</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to delete <strong>{site.name}</strong>? This action will also delete
          all associated funnels and landing pages.
        </p>
        {site.isDefault && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
            This is the default site. You may need to set another site as default first.
          </div>
        )}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation active:scale-[0.98]"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function SitesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyIdFilter = searchParams?.get('companyId') || '';

  const [sites, setSites] = useState<Site[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SiteStatus | ''>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyIdFilter);
  const [showFilters, setShowFilters] = useState(!!companyIdFilter);

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [deletingSite, setDeletingSite] = useState<Site | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Dropdown menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Fetch companies for dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const result = await companiesApi.list({ limit: 100 });
        setCompanies(result.companies);
      } catch (err) {
        console.error('Failed to fetch companies:', err);
      }
    };
    fetchCompanies();
  }, []);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: SiteQueryParams = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };

      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (selectedCompanyId) params.companyId = selectedCompanyId;

      const [result, statsResult] = await Promise.all([
        sitesApi.list(params),
        sitesApi.getStats(selectedCompanyId || undefined),
      ]);

      setSites(result.sites);
      setTotal(result.total);
      setStats(statsResult);
    } catch (err) {
      console.error('Failed to fetch sites:', err);
      setError('Failed to load sites. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, selectedCompanyId]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, selectedCompanyId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [openMenuId]);

  const handleAddSite = () => {
    setEditingSite(null);
    setShowFormModal(true);
  };

  const handleEditSite = (site: Site) => {
    setEditingSite(site);
    setShowFormModal(true);
    setOpenMenuId(null);
  };

  const handleDeleteSite = (site: Site) => {
    setDeletingSite(site);
    setOpenMenuId(null);
  };

  const handleSetDefault = async (site: Site) => {
    try {
      await sitesApi.setDefault(site.id);
      toast.success(`"${site.name}" set as default site`);
      fetchSites();
    } catch (err) {
      console.error('Failed to set default:', err);
      toast.error('Failed to set as default');
    }
    setOpenMenuId(null);
  };

  const handleSaveSite = async (data: CreateSiteInput | UpdateSiteInput) => {
    setFormLoading(true);
    try {
      if (editingSite) {
        await sitesApi.update(editingSite.id, data);
        toast.success(`"${data.name}" updated successfully`);
      } else {
        await sitesApi.create(data as CreateSiteInput);
        toast.success(`"${data.name}" created successfully`);
      }
      setShowFormModal(false);
      setEditingSite(null);
      fetchSites();
    } catch (err) {
      console.error('Failed to save site:', err);
      toast.error(editingSite ? 'Failed to update site' : 'Failed to create site');
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSite) return;
    setFormLoading(true);
    try {
      await sitesApi.delete(deletingSite.id);
      toast.success(`"${deletingSite.name}" deleted successfully`);
      setDeletingSite(null);
      fetchSites();
    } catch (err) {
      console.error('Failed to delete site:', err);
      toast.error('Failed to delete site');
    } finally {
      setFormLoading(false);
    }
  };

  // Get selected company name for breadcrumb
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <div className="p-4 md:p-6">
      {/* Breadcrumb if filtered by company */}
      {selectedCompany && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => {
              setSelectedCompanyId('');
              router.push('/sites');
            }}
            className="hover:text-foreground transition-colors"
          >
            All Sites
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">{selectedCompany.name}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Sites</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stats ? `${stats.totalSites} sites • ${stats.activeSites} active` : 'Manage your storefront sites'}
          </p>
        </div>
        <button
          onClick={handleAddSite}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Add Site
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card/50 border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Sites</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalSites}</p>
          </div>
          <div className="bg-card/50 border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Active</p>
            <p className="text-2xl font-bold text-green-400">{stats.activeSites}</p>
          </div>
          {stats.sitesByCompany.slice(0, 2).map((item) => (
            <div key={item.companyId} className="bg-card/50 border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1 truncate">{item.companyName}</p>
              <p className="text-2xl font-bold text-foreground">{item.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, code, domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation active:scale-[0.98]',
                showFilters
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-card text-muted-foreground border border-border hover:text-foreground'
              )}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {(statusFilter || selectedCompanyId) && (
                <span className="w-2 h-2 bg-primary rounded-full" />
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={fetchSites}
              className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] touch-manipulation active:scale-[0.98]"
              title="Refresh"
              aria-label="Refresh sites list"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 bg-card/50 border border-border rounded-lg">
            {/* Company Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Company</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
              >
                <option value="">All Companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as SiteStatus | '')}
                className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
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
            {(statusFilter || selectedCompanyId) && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  setSelectedCompanyId('');
                  router.push('/sites');
                }}
                className="self-end px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] touch-manipulation"
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
      {loading && sites.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && sites.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Store className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No sites found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {search || statusFilter || selectedCompanyId
              ? "Try adjusting your search or filters to find what you're looking for."
              : 'Get started by adding your first site.'}
          </p>
          {!search && !statusFilter && !selectedCompanyId && (
            <button
              onClick={handleAddSite}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Add Site
            </button>
          )}
        </div>
      )}

      {/* Desktop Table */}
      {sites.length > 0 && (
        <>
          <div className="hidden md:block bg-card/50 border border-border rounded-xl overflow-hidden mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Site
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Company
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Domain
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Assets
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sites.map((site) => (
                  <tr key={site.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-lg font-bold text-white">
                          {site.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{site.name}</p>
                            {site.isDefault && (
                              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{site.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {site.company && (
                        <div>
                          <p className="text-sm text-foreground">{site.company.name}</p>
                          <p className="text-xs text-muted-foreground">{site.company.code}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(site.domain || site.subdomain) && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Globe className="w-3 h-3" />
                          {site.domain || site.subdomain}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={site.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {site._count?.funnels || 0} funnels
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {site._count?.landingPages || 0} pages
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === site.id ? null : site.id);
                          }}
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === site.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-lg shadow-lg z-10">
                            <button
                              onClick={() => handleEditSite(site)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </button>
                            {!site.isDefault && (
                              <button
                                onClick={() => handleSetDefault(site)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <Star className="w-4 h-4" />
                                Set as Default
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSite(site)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-muted transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border mb-6">
            {sites.map((site) => (
              <div
                key={site.id}
                className="p-4 active:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                      {site.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{site.name}</p>
                        {site.isDefault && (
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{site.code}</p>
                    </div>
                  </div>
                  <StatusBadge status={site.status} />
                </div>

                {site.company && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Company: {site.company.name} ({site.company.code})
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {(site.domain || site.subdomain) && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {site.domain || site.subdomain}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {site._count?.funnels || 0} funnels
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {site._count?.landingPages || 0} pages
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => handleEditSite(site)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm text-foreground hover:bg-muted/80 transition-colors min-h-[44px] touch-manipulation active:scale-[0.98]"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  {!site.isDefault && (
                    <button
                      onClick={() => handleSetDefault(site)}
                      className="p-2 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition-colors min-h-[44px] min-w-[44px] touch-manipulation active:scale-[0.98]"
                      aria-label={`Set ${site.name} as default`}
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteSite(site)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors min-h-[44px] min-w-[44px] touch-manipulation active:scale-[0.98]"
                    aria-label={`Delete ${site.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-card/50 border border-border rounded-xl">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total}{' '}
                sites
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px] touch-manipulation active:scale-[0.98]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px] touch-manipulation active:scale-[0.98]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showFormModal && (
        <SiteFormModal
          site={editingSite}
          companies={companies}
          defaultCompanyId={selectedCompanyId}
          onClose={() => {
            setShowFormModal(false);
            setEditingSite(null);
          }}
          onSave={handleSaveSite}
          loading={formLoading}
        />
      )}

      {deletingSite && (
        <DeleteModal
          site={deletingSite}
          onClose={() => setDeletingSite(null)}
          onConfirm={handleConfirmDelete}
          loading={formLoading}
        />
      )}
    </div>
  );
}
