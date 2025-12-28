'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  Building2,
  Users,
  ShoppingCart,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Globe,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  companiesApi,
  Company,
  CompanyQueryParams,
  CompanyStatus,
  CompanyStats,
  CreateCompanyInput,
  UpdateCompanyInput,
} from '@/lib/api/companies';
import { clientsApi, Client } from '@/lib/api/clients';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/auth-context';

// ═══════════════════════════════════════════════════════════════
// ACTION MENU COMPONENT (Portal-based dropdown)
// ═══════════════════════════════════════════════════════════════

interface ActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  children: React.ReactNode;
}

function ActionMenu({ isOpen, onClose, triggerRef, children }: ActionMenuProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right - 160 + window.scrollX, // 160 = menu width (w-40 = 10rem = 160px)
      });
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Don't close if clicking inside the menu or on the trigger
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    };

    const handleScroll = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Use mousedown for outside clicks, but the menu items use onClick which fires after
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed w-40 bg-card border border-border rounded-lg shadow-lg z-[9999] py-1"
      style={{ top: position.top, left: position.left }}
    >
      {children}
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPANY TABLE ROW (with portal-based action menu)
// ═══════════════════════════════════════════════════════════════

interface CompanyTableRowProps {
  company: Company;
  isMenuOpen: boolean;
  onMenuToggle: (companyId: string | null) => void;
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
}

function CompanyTableRow({ company, isMenuOpen, onMenuToggle, onEdit, onDelete }: CompanyTableRowProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMenuToggle(isMenuOpen ? null : company.id);
  };

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-lg font-bold text-white">
            {company.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{company.name}</p>
            <p className="text-xs text-muted-foreground">{company.code}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {company.client && (
          <div>
            <p className="text-sm text-foreground">{company.client.name}</p>
            <p className="text-xs text-muted-foreground">{company.client.code}</p>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {company.domain && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Globe className="w-3 h-3" />
            {company.domain}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={company.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {company._count?.customers || 0}
          </span>
          <span className="flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" />
            {company._count?.orders || 0}
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {company._count?.products || 0}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          ref={triggerRef}
          onClick={handleMenuToggle}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        <ActionMenu
          isOpen={isMenuOpen}
          onClose={() => onMenuToggle(null)}
          triggerRef={triggerRef}
        >
          <button
            onClick={() => onEdit(company)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => onDelete(company)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-muted transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </ActionMenu>
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<
  CompanyStatus,
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

function StatusBadge({ status }: { status: CompanyStatus }) {
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
// COMPANY FORM MODAL
// ═══════════════════════════════════════════════════════════════

interface CompanyFormModalProps {
  company?: Company | null;
  clients: Client[];
  defaultClientId?: string;
  userScopeType?: string;
  userClientId?: string;
  onClose: () => void;
  onSave: (data: CreateCompanyInput | UpdateCompanyInput) => Promise<void>;
  loading: boolean;
}

function CompanyFormModal({ company, clients, defaultClientId, userScopeType, userClientId, onClose, onSave, loading }: CompanyFormModalProps) {
  // For CLIENT-scoped users, auto-set clientId to their own client
  const isClientScoped = userScopeType === 'CLIENT';
  const initialClientId = isClientScoped && userClientId ? userClientId : (company?.clientId || defaultClientId || '');

  const [clientId, setClientId] = useState(initialClientId);
  const [name, setName] = useState(company?.name || '');
  const [domain, setDomain] = useState(company?.domain || '');
  const [timezone, setTimezone] = useState(company?.timezone || 'UTC');
  const [currency, setCurrency] = useState(company?.currency || 'USD');
  const [status, setStatus] = useState<CompanyStatus>(company?.status || 'ACTIVE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Company name is required');
      return;
    }
    // CLIENT-scoped users don't need to select a client - backend uses their clientId automatically
    if (!company && !isClientScoped && !clientId) {
      toast.error('Please select a client');
      return;
    }

    const data: CreateCompanyInput | UpdateCompanyInput = company
      ? {
          name: name.trim(),
          domain: domain.trim() || undefined,
          timezone,
          currency,
          status,
        }
      : {
          // For CLIENT-scoped users, omit clientId - backend will use user.clientId
          // For ORGANIZATION users, include the selected clientId
          clientId: isClientScoped ? undefined : clientId,
          name: name.trim(),
          domain: domain.trim() || undefined,
          timezone,
          currency,
        };

    await onSave(data);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {company ? 'Edit Company' : 'Add Company'}
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
          {/* Client (only for create, and only for ORGANIZATION-scoped users) */}
          {!company && !isClientScoped && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Client <span className="text-red-400">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Company Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter company name"
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

          {/* Status (only for edit) */}
          {company && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CompanyStatus)}
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
              {loading ? 'Saving...' : company ? 'Update Company' : 'Create Company'}
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
  company: Company;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

function DeleteModal({ company, onClose, onConfirm, loading }: DeleteModalProps) {
  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">Delete Company</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to delete <strong>{company.name}</strong>? This action will also delete
          all associated data and cannot be undone.
        </p>
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

export default function CompaniesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const clientIdFilter = searchParams?.get('clientId') || '';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | ''>('');
  const [selectedClientId, setSelectedClientId] = useState(clientIdFilter);
  const [showFilters, setShowFilters] = useState(!!clientIdFilter);

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Dropdown menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Fetch clients for dropdown (only for organization-level users)
  // CLIENT-scoped users don't need this since they're already scoped to a single client
  const isOrgUser = user?.scopeType === 'ORGANIZATION';
  useEffect(() => {
    if (!isOrgUser) return; // Skip for non-org users

    const fetchClients = async () => {
      try {
        const result = await clientsApi.list({ limit: 100 });
        setClients(result.clients);
      } catch (err) {
        console.error('Failed to fetch clients:', err);
      }
    };
    fetchClients();
  }, [isOrgUser]);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: CompanyQueryParams = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };

      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (selectedClientId) params.clientId = selectedClientId;

      const [result, statsResult] = await Promise.all([
        companiesApi.list(params),
        companiesApi.getStats(),
      ]);

      setCompanies(result.companies);
      setTotal(result.total);
      setStats(statsResult);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
      setError('Failed to load companies. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, selectedClientId]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, selectedClientId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [openMenuId]);

  const handleAddCompany = () => {
    setEditingCompany(null);
    setShowFormModal(true);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setShowFormModal(true);
    setOpenMenuId(null);
  };

  const handleDeleteCompany = (company: Company) => {
    setDeletingCompany(company);
    setOpenMenuId(null);
  };

  const handleSaveCompany = async (data: CreateCompanyInput | UpdateCompanyInput) => {
    setFormLoading(true);
    try {
      if (editingCompany) {
        await companiesApi.update(editingCompany.id, data);
        toast.success(`"${data.name}" updated successfully`);
      } else {
        await companiesApi.create(data as CreateCompanyInput);
        toast.success(`"${data.name}" created successfully`);
      }
      setShowFormModal(false);
      setEditingCompany(null);
      fetchCompanies();
    } catch (err) {
      console.error('Failed to save company:', err);
      toast.error(editingCompany ? 'Failed to update company' : 'Failed to create company');
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCompany) return;
    setFormLoading(true);
    try {
      await companiesApi.delete(deletingCompany.id);
      toast.success(`"${deletingCompany.name}" deleted successfully`);
      setDeletingCompany(null);
      fetchCompanies();
    } catch (err) {
      console.error('Failed to delete company:', err);
      toast.error('Failed to delete company');
    } finally {
      setFormLoading(false);
    }
  };

  // Get selected client name for breadcrumb
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="p-4 md:p-6">
      {/* Breadcrumb if filtered by client */}
      {selectedClient && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => {
              setSelectedClientId('');
              router.push('/companies');
            }}
            className="hover:text-foreground transition-colors"
          >
            All Companies
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">{selectedClient.name}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Companies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stats ? `${stats.totalCompanies} companies • ${stats.activeCompanies} active` : 'Manage your company portfolio'}
          </p>
        </div>
        <button
          onClick={handleAddCompany}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card/50 border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Companies</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalCompanies}</p>
          </div>
          <div className="bg-card/50 border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Active</p>
            <p className="text-2xl font-bold text-green-400">{stats.activeCompanies}</p>
          </div>
          {stats.companiesByClient.slice(0, 2).map((item) => (
            <div key={item.clientId} className="bg-card/50 border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1 truncate">{item.clientName}</p>
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
              {(statusFilter || (selectedClientId && user?.scopeType !== 'CLIENT')) && (
                <span className="w-2 h-2 bg-primary rounded-full" />
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={fetchCompanies}
              className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] touch-manipulation active:scale-[0.98]"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 p-4 bg-card/50 border border-border rounded-lg">
            {/* Client Filter - Only show for ORGANIZATION users */}
            {user?.scopeType !== 'CLIENT' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Client</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
                >
                  <option value="">All Clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as CompanyStatus | '')}
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
            {(statusFilter || (selectedClientId && user?.scopeType !== 'CLIENT')) && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  if (user?.scopeType !== 'CLIENT') {
                    setSelectedClientId('');
                  }
                  router.push('/companies');
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
      {loading && companies.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && companies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No companies found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {search || statusFilter || selectedClientId
              ? "Try adjusting your search or filters to find what you're looking for."
              : 'Get started by adding your first company.'}
          </p>
          {!search && !statusFilter && !selectedClientId && (
            <button
              onClick={handleAddCompany}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Add Company
            </button>
          )}
        </div>
      )}

      {/* Desktop Table */}
      {companies.length > 0 && (
        <>
          <div className="hidden md:block bg-card/50 border border-border rounded-xl overflow-x-auto overflow-y-visible mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Company
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Client
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Domain
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Stats
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {companies.map((company) => (
                  <CompanyTableRow
                    key={company.id}
                    company={company}
                    isMenuOpen={openMenuId === company.id}
                    onMenuToggle={setOpenMenuId}
                    onEdit={handleEditCompany}
                    onDelete={handleDeleteCompany}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border mb-6">
            {companies.map((company) => (
              <div
                key={company.id}
                className="p-4 active:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                      {company.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
                      <p className="text-xs text-muted-foreground">{company.code}</p>
                    </div>
                  </div>
                  <StatusBadge status={company.status} />
                </div>

                {company.client && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Client: {company.client.name} ({company.client.code})
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {company.domain && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {company.domain}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {company._count?.customers || 0} customers
                  </span>
                  <span className="flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" />
                    {company._count?.orders || 0} orders
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => handleEditCompany(company)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm text-foreground hover:bg-muted/80 transition-colors min-h-[44px] touch-manipulation active:scale-[0.98]"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCompany(company)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors min-h-[44px] min-w-[44px] touch-manipulation active:scale-[0.98]"
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
                companies
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
        <CompanyFormModal
          company={editingCompany}
          clients={clients}
          defaultClientId={selectedClientId}
          userScopeType={user?.scopeType}
          userClientId={user?.clientId}
          onClose={() => {
            setShowFormModal(false);
            setEditingCompany(null);
          }}
          onSave={handleSaveCompany}
          loading={formLoading}
        />
      )}

      {deletingCompany && (
        <DeleteModal
          company={deletingCompany}
          onClose={() => setDeletingCompany(null)}
          onConfirm={handleConfirmDelete}
          loading={formLoading}
        />
      )}
    </div>
  );
}
