'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Repeat,
  CheckCircle2,
  Clock,
  Archive,
  AlertTriangle,
  DollarSign,
  Star,
  Building2,
  Users,
  Store,
  MoreVertical,
  Copy,
  Trash2,
  Edit2,
  Eye,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  subscriptionPlansApi,
  SubscriptionPlan,
  SubscriptionPlanQuery,
  SubscriptionPlanStats,
  SubscriptionPlanScope,
  SubscriptionPlanStatus,
  CreateSubscriptionPlanDto,
  BillingInterval,
  formatPlanPrice,
  getPlanStatusColor,
  getScopeColor,
  formatInterval,
} from '@/lib/api/subscription-plans';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useHierarchy } from '@/contexts/hierarchy-context';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
  DRAFT: { label: 'Draft', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock },
  ARCHIVED: { label: 'Archived', color: 'bg-muted text-muted-foreground border-border', icon: Archive },
  DEPRECATED: { label: 'Deprecated', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: AlertTriangle },
};

const SCOPE_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  ORGANIZATION: { label: 'Organization', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Building2 },
  CLIENT: { label: 'Client', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Users },
  COMPANY: { label: 'Company', color: 'bg-primary/10 text-primary border-primary/20', icon: Store },
};

const PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: SubscriptionPlanStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'bg-muted text-muted-foreground', icon: AlertTriangle };
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border', config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: SubscriptionPlanScope }) {
  const config = SCOPE_CONFIG[scope] || { label: scope, color: 'bg-muted text-muted-foreground', icon: Building2 };
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium', config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'cyan'
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color?: 'cyan' | 'yellow' | 'green' | 'purple';
}) {
  const colorClasses = {
    cyan: 'bg-primary/10 text-primary border-primary/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  return (
    <div className="bg-card/50 border border-border rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs md:text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-xl md:text-2xl font-bold text-foreground">{value}</p>
          {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
        <div className={cn('p-2.5 md:p-3 rounded-xl border', colorClasses[color])}>
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function SubscriptionPlansPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedClientId, selectedCompanyId } = useHierarchy();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SubscriptionPlanStats | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await subscriptionPlansApi.getStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    }
    fetchStats();
  }, []);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: SubscriptionPlanQuery = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        includeArchived: statusFilter === 'ARCHIVED',
      };

      if (search) params.search = search;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter as SubscriptionPlanStatus;
      if (scopeFilter && scopeFilter !== 'all') params.scope = scopeFilter as SubscriptionPlanScope;

      const result = await subscriptionPlansApi.getPlans(params);
      setPlans(result.plans);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch subscription plans:', err);
      setError('Failed to load subscription plans. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, scopeFilter]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, scopeFilter]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleCreatePlan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const displayName = formData.get('displayName') as string;
    const basePriceMonthly = parseFloat(formData.get('basePriceMonthly') as string);
    const scope = formData.get('scope') as SubscriptionPlanScope;

    try {
      const createData: CreateSubscriptionPlanDto = {
        name,
        displayName,
        basePriceMonthly,
        scope,
        currency: 'USD',
        defaultInterval: BillingInterval.MONTHLY,
        availableIntervals: [BillingInterval.MONTHLY],
      };

      // Add the appropriate scope ID based on scope selected
      let scopeId: string | undefined;

      if (scope === SubscriptionPlanScope.ORGANIZATION) {
        // Use user's organization ID - for org-scoped users, organizationId should be set
        scopeId = user?.organizationId;
        if (!scopeId && user?.scopeType === 'ORGANIZATION') {
          scopeId = user.scopeId;
        }
        if (!scopeId) {
          throw new Error('Unable to determine organization. Please ensure you are logged in.');
        }
        createData.organizationId = scopeId;
      } else if (scope === SubscriptionPlanScope.CLIENT) {
        // Use selected client or user's client
        scopeId = selectedClientId || user?.clientId;
        if (!scopeId && user?.scopeType === 'CLIENT') {
          scopeId = user.scopeId;
        }
        if (!scopeId) {
          throw new Error('Please select a client or ensure you have a client association.');
        }
        createData.clientId = scopeId;
      } else if (scope === SubscriptionPlanScope.COMPANY) {
        // Use selected company or user's company
        scopeId = selectedCompanyId || user?.companyId;
        if (!scopeId && user?.scopeType === 'COMPANY') {
          scopeId = user.scopeId;
        }
        if (!scopeId) {
          throw new Error('Please select a company or ensure you have a company association.');
        }
        createData.companyId = scopeId;
      }

      await subscriptionPlansApi.createPlan(createData);
      setShowCreateModal(false);
      fetchPlans();
    } catch (err) {
      console.error('Failed to create plan:', err);
      setCreateError(err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Header
        title="Subscription Plans"
        subtitle={loading ? 'Loading...' : `${total} plans`}
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Plan
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatsCard
            title="Total Plans"
            value={stats?.totalPlans ?? '-'}
            icon={Repeat}
            color="cyan"
          />
          <StatsCard
            title="Active"
            value={stats?.activePlans ?? '-'}
            icon={CheckCircle2}
            color="green"
          />
          <StatsCard
            title="Draft"
            value={stats?.draftPlans ?? '-'}
            icon={Clock}
            color="yellow"
          />
          <StatsCard
            title="Product Links"
            value={stats?.totalProductAssignments ?? '-'}
            icon={Star}
            color="purple"
          />
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by plan name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  showFilters
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-card text-muted-foreground border border-border hover:text-foreground'
                )}
              >
                <Filter className="w-4 h-4" />
                <span className="sm:inline">Filters</span>
                {(statusFilter || scopeFilter) && (
                  <span className="w-2 h-2 bg-primary rounded-full" />
                )}
              </button>

              {/* Refresh */}
              <button
                onClick={fetchPlans}
                className="p-2.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-card/50 border border-border rounded-lg">
              {/* Status Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Scope Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Scope</label>
                <select
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value)}
                  className="px-3 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">All Scopes</option>
                  {Object.entries(SCOPE_CONFIG).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end lg:col-span-2">
                {(statusFilter || scopeFilter) && (
                  <button
                    onClick={() => {
                      setStatusFilter('');
                      setScopeFilter('');
                    }}
                    className="w-full sm:w-auto px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors bg-muted/50 rounded-lg"
                  >
                    Clear all
                  </button>
                )}
              </div>
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
        {loading && plans.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && plans.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Repeat className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No subscription plans found</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {search || statusFilter || scopeFilter
                ? "Try adjusting your search or filters to find what you're looking for."
                : 'Create your first subscription plan to offer recurring products to customers.'}
            </p>
          </div>
        )}

        {/* Plans Table */}
        {plans.length > 0 && (
          <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Scope</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Interval</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Trial</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {plans.map((plan) => (
                    <tr
                      key={plan.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/subscription-plans/${plan.id}`)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">
                                {plan.displayName}
                              </p>
                              {plan.isFeatured && (
                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {plan.name}
                            </p>
                            {plan.shortDescription && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {plan.shortDescription}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={plan.status} />
                      </td>
                      <td className="px-4 py-4">
                        <ScopeBadge scope={plan.scope} />
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-foreground">
                          {formatInterval(plan.defaultInterval)}
                        </p>
                        {plan.availableIntervals.length > 1 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            +{plan.availableIntervals.length - 1} more
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {plan.trialEnabled ? (
                          <p className="text-sm text-primary">
                            {plan.trialDays} days
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">-</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="text-sm font-medium text-foreground">
                          {formatPlanPrice(plan.basePriceMonthly, plan.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          /{formatInterval(plan.defaultInterval).toLowerCase()}
                        </p>
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
                  Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} plans
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

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-card border border-border rounded-xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Create Subscription Plan</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePlan} className="p-4 space-y-4">
              {createError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Internal Name <span className="text-red-400">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g., monthly-basic"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Display Name <span className="text-red-400">*</span>
                </label>
                <input
                  name="displayName"
                  type="text"
                  required
                  placeholder="e.g., Monthly Basic Plan"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Base Price (Monthly) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input
                    name="basePriceMonthly"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Scope <span className="text-red-400">*</span>
                </label>
                <select
                  name="scope"
                  required
                  defaultValue={SubscriptionPlanScope.COMPANY}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value={SubscriptionPlanScope.ORGANIZATION}>Organization</option>
                  <option value={SubscriptionPlanScope.CLIENT}>Client</option>
                  <option value={SubscriptionPlanScope.COMPANY}>Company</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-primary text-foreground rounded-lg text-sm font-medium hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
