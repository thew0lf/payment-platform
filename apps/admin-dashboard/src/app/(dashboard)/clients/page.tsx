'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  clientsApi,
  Client,
  ClientQueryParams,
  ClientStatus,
  ClientPlan,
  ClientStats,
  CreateClientInput,
  UpdateClientInput,
} from '@/lib/api/clients';
import { createPortal } from 'react-dom';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<
  ClientStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
  INACTIVE: { label: 'Inactive', color: 'bg-muted text-muted-foreground border-border', icon: Clock },
  SUSPENDED: { label: 'Suspended', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertCircle },
};

const PLAN_CONFIG: Record<ClientPlan, { label: string; color: string }> = {
  FOUNDERS: { label: 'Founders', color: 'bg-amber-500/10 text-amber-400' },
  BASIC: { label: 'Basic', color: 'bg-muted text-muted-foreground' },
  STANDARD: { label: 'Standard', color: 'bg-blue-500/10 text-blue-400' },
  PREMIUM: { label: 'Premium', color: 'bg-purple-500/10 text-purple-400' },
  ENTERPRISE: { label: 'Enterprise', color: 'bg-green-500/10 text-green-400' },
};

const PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: ClientStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.INACTIVE;
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border', config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function PlanBadge({ plan }: { plan: ClientPlan }) {
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.BASIC;
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', config.color)}>
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// CLIENT FORM MODAL
// ═══════════════════════════════════════════════════════════════

interface ClientFormModalProps {
  client?: Client | null;
  onClose: () => void;
  onSave: (data: CreateClientInput | UpdateClientInput) => Promise<void>;
  loading: boolean;
}

function ClientFormModal({ client, onClose, onSave, loading }: ClientFormModalProps) {
  const [name, setName] = useState(client?.name || '');
  const [contactName, setContactName] = useState(client?.contactName || '');
  const [contactEmail, setContactEmail] = useState(client?.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(client?.contactPhone || '');
  const [plan, setPlan] = useState<ClientPlan>(client?.plan || 'BASIC');
  const [status, setStatus] = useState<ClientStatus>(client?.status || 'ACTIVE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Client name is required');
      return;
    }

    const data: CreateClientInput | UpdateClientInput = {
      name: name.trim(),
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      plan,
      ...(client ? { status } : {}),
    };

    await onSave(data);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {client ? 'Edit Client' : 'Add Client'}
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
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Client Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter client name"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>

          {/* Contact Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Contact Name
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Primary contact person"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Contact Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Contact Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contact@example.com"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Plan */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Plan
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as ClientPlan)}
              className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {Object.entries(PLAN_CONFIG).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Status (only for edit) */}
          {client && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ClientStatus)}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
              {loading ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
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
  client: Client;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

function DeleteModal({ client, onClose, onConfirm, loading }: DeleteModalProps) {
  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">Delete Client</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to delete <strong>{client.name}</strong>? This action will also delete
          all associated companies and cannot be undone.
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

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | ''>('');
  const [planFilter, setPlanFilter] = useState<ClientPlan | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Dropdown menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: ClientQueryParams = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };

      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (planFilter) params.plan = planFilter;

      const [result, statsResult] = await Promise.all([
        clientsApi.list(params),
        clientsApi.getStats(),
      ]);

      setClients(result.clients);
      setTotal(result.total);
      setStats(statsResult);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
      setError('Failed to load clients. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, planFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, planFilter]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [openMenuId]);

  const handleAddClient = () => {
    setEditingClient(null);
    setShowFormModal(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowFormModal(true);
    setOpenMenuId(null);
  };

  const handleDeleteClient = (client: Client) => {
    setDeletingClient(client);
    setOpenMenuId(null);
  };

  const handleSaveClient = async (data: CreateClientInput | UpdateClientInput) => {
    setFormLoading(true);
    try {
      if (editingClient) {
        await clientsApi.update(editingClient.id, data);
        toast.success(`"${data.name}" updated successfully`);
      } else {
        await clientsApi.create(data as CreateClientInput);
        toast.success(`"${data.name}" created successfully`);
      }
      setShowFormModal(false);
      setEditingClient(null);
      fetchClients();
    } catch (err) {
      console.error('Failed to save client:', err);
      toast.error(editingClient ? 'Failed to update client' : 'Failed to create client');
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingClient) return;
    setFormLoading(true);
    try {
      await clientsApi.delete(deletingClient.id);
      toast.success(`"${deletingClient.name}" deleted successfully`);
      setDeletingClient(null);
      fetchClients();
    } catch (err) {
      console.error('Failed to delete client:', err);
      toast.error('Failed to delete client');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {stats ? `${stats.totalClients} clients • ${stats.activeClients} active` : 'Manage your client portfolio'}
          </p>
        </div>
        <button
          onClick={handleAddClient}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card/50 border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Clients</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalClients}</p>
          </div>
          <div className="bg-card/50 border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Active</p>
            <p className="text-2xl font-bold text-green-400">{stats.activeClients}</p>
          </div>
          {Object.entries(stats.clientsByPlan).map(([plan, count]) => (
            <div key={plan} className="bg-card/50 border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{PLAN_CONFIG[plan as ClientPlan]?.label || plan}</p>
              <p className="text-2xl font-bold text-foreground">{count}</p>
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
              placeholder="Search by name, code, email..."
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
              {(statusFilter || planFilter) && (
                <span className="w-2 h-2 bg-primary rounded-full" />
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={fetchClients}
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
            {/* Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ClientStatus | '')}
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

            {/* Plan Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Plan</label>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value as ClientPlan | '')}
                className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
              >
                <option value="">All Plans</option>
                {Object.entries(PLAN_CONFIG).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(statusFilter || planFilter) && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  setPlanFilter('');
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
      {loading && clients.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && clients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No clients found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {search || statusFilter || planFilter
              ? "Try adjusting your search or filters to find what you're looking for."
              : 'Get started by adding your first client.'}
          </p>
          {!search && !statusFilter && !planFilter && (
            <button
              onClick={handleAddClient}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Add Client
            </button>
          )}
        </div>
      )}

      {/* Desktop Table */}
      {clients.length > 0 && (
        <>
          <div className="hidden md:block bg-card/50 border border-border rounded-xl overflow-hidden mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Client
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Contact
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Plan
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Companies
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-lg font-bold text-white">
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {client.contactName && (
                        <p className="text-sm text-foreground">{client.contactName}</p>
                      )}
                      {client.contactEmail && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {client.contactEmail}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={client.plan} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        {client._count?.companies || 0}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === client.id ? null : client.id);
                          }}
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === client.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-10">
                            <button
                              onClick={() => handleEditClient(client)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => router.push(`/companies?clientId=${client.id}`)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            >
                              <Building2 className="w-4 h-4" />
                              View Companies
                            </button>
                            <button
                              onClick={() => handleDeleteClient(client)}
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
            {clients.map((client) => (
              <div
                key={client.id}
                className="p-4 active:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                      {client.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.code}</p>
                    </div>
                  </div>
                  <StatusBadge status={client.status} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <PlanBadge plan={client.plan} />
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {client._count?.companies || 0} companies
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {client._count?.users || 0} users
                  </span>
                </div>

                {(client.contactEmail || client.contactPhone) && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {client.contactEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {client.contactEmail}
                      </span>
                    )}
                    {client.contactPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {client.contactPhone}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => handleEditClient(client)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm text-foreground hover:bg-muted/80 transition-colors min-h-[44px] touch-manipulation active:scale-[0.98]"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => router.push(`/companies?clientId=${client.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm text-foreground hover:bg-muted/80 transition-colors min-h-[44px] touch-manipulation active:scale-[0.98]"
                  >
                    <Building2 className="w-4 h-4" />
                    Companies
                  </button>
                  <button
                    onClick={() => handleDeleteClient(client)}
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
                clients
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
        <ClientFormModal
          client={editingClient}
          onClose={() => {
            setShowFormModal(false);
            setEditingClient(null);
          }}
          onSave={handleSaveClient}
          loading={formLoading}
        />
      )}

      {deletingClient && (
        <DeleteModal
          client={deletingClient}
          onClose={() => setDeletingClient(null)}
          onConfirm={handleConfirmDelete}
          loading={formLoading}
        />
      )}
    </div>
  );
}
