'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  Building,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  ChevronRight,
  Loader2,
  UserPlus,
  Copy,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import {
  billingApi,
  PricingPlan,
  ClientSubscription,
  PlanType,
  PlanStatus,
  SubscriptionStatus,
  formatCurrency,
  formatNumber,
  getSubscriptionStatusColor,
} from '@/lib/api/billing';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type Tab = 'plans' | 'subscriptions';
type PlanFilter = 'all' | 'DEFAULT' | 'CUSTOM' | 'LEGACY';

interface Stats {
  totalPlans: number;
  defaultPlans: number;
  customPlans: number;
  activeSubscriptions: number;
  totalMRR: number;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getPlanTypeColor(type: PlanType | string): string {
  switch (type) {
    case PlanType.DEFAULT:
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case PlanType.CUSTOM:
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case PlanType.LEGACY:
      return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
  }
}

function getPlanStatusColor(status: PlanStatus | string): string {
  switch (status) {
    case PlanStatus.ACTIVE:
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case PlanStatus.DEPRECATED:
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case PlanStatus.HIDDEN:
      return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AdminBillingPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Data state
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>('plans');
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>('all');

  // Modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<PricingPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if user is ORG admin
  const isOrgAdmin = user?.scopeType === 'ORGANIZATION';

  // Load data
  const loadData = async () => {
    if (!isOrgAdmin) {
      setError('Only organization admins can access this page');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [plansRes, subsRes] = await Promise.all([
        billingApi.getAllPlansAdmin(),
        billingApi.getAllSubscriptionsAdmin(),
      ]);
      setPlans(plansRes);
      setSubscriptions(subsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
      toast.error('Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isOrgAdmin]);

  // Calculate stats
  const stats: Stats = useMemo(() => {
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === SubscriptionStatus.ACTIVE || s.status === SubscriptionStatus.TRIALING
    );

    // Calculate MRR (Monthly Recurring Revenue)
    let totalMRR = 0;
    activeSubscriptions.forEach((sub) => {
      const plan = plans.find((p) => p.id === sub.planId);
      if (plan) {
        const monthlyPrice = sub.billingInterval === 'annual'
          ? (plan.annualCost || plan.baseCost * 12) / 12
          : plan.baseCost;
        totalMRR += monthlyPrice;
      }
    });

    return {
      totalPlans: plans.length,
      defaultPlans: plans.filter((p) => p.planType === PlanType.DEFAULT).length,
      customPlans: plans.filter((p) => p.planType === PlanType.CUSTOM).length,
      activeSubscriptions: activeSubscriptions.length,
      totalMRR,
    };
  }, [plans, subscriptions]);

  // Filter plans
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = plan.name.toLowerCase().includes(query);
        const matchesDisplayName = plan.displayName?.toLowerCase().includes(query);
        const matchesClient = plan.clientName?.toLowerCase().includes(query);
        if (!matchesName && !matchesDisplayName && !matchesClient) {
          return false;
        }
      }

      // Plan type filter
      if (planFilter !== 'all' && plan.planType !== planFilter) {
        return false;
      }

      return true;
    });
  }, [plans, searchQuery, planFilter]);

  // Filter subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesClient = sub.clientName?.toLowerCase().includes(query);
        const matchesCode = sub.clientCode?.toLowerCase().includes(query);
        const matchesPlan = sub.planName?.toLowerCase().includes(query);
        if (!matchesClient && !matchesCode && !matchesPlan) {
          return false;
        }
      }

      // Status filter
      if (subscriptionFilter !== 'all' && sub.status !== subscriptionFilter) {
        return false;
      }

      return true;
    });
  }, [subscriptions, searchQuery, subscriptionFilter]);

  // Handle delete plan
  const handleDeletePlan = async () => {
    if (!planToDelete) return;

    setIsDeleting(true);
    try {
      await billingApi.deletePlan(planToDelete.id);
      toast.success(`Plan "${planToDelete.displayName}" deleted`);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete plan');
    } finally {
      setIsDeleting(false);
      setPlanToDelete(null);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  if (!isOrgAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            Only organization admins can access billing management.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Billing Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage pricing plans and client subscriptions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/admin/billing/plans/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            <span>New Plan</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <CreditCard className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Plans</p>
              <p className="text-xl font-bold">{stats.totalPlans}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Building className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Custom Plans</p>
              <p className="text-xl font-bold">{stats.customPlans}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Subscriptions</p>
              <p className="text-xl font-bold">{stats.activeSubscriptions}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              <p className="text-xl font-bold">{formatCurrency(stats.totalMRR)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('plans')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'plans'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Pricing Plans
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'subscriptions'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Client Subscriptions
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'plans' ? 'Search plans...' : 'Search subscriptions...'}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {activeTab === 'plans' ? (
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as PlanFilter)}
            className="px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Types</option>
            <option value="DEFAULT">Default Plans</option>
            <option value="CUSTOM">Custom Plans</option>
            <option value="LEGACY">Legacy Plans</option>
          </select>
        ) : (
          <select
            value={subscriptionFilter}
            onChange={(e) => setSubscriptionFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="paused">Paused</option>
            <option value="past_due">Past Due</option>
            <option value="canceled">Canceled</option>
          </select>
        )}
      </div>

      {/* Content */}
      {activeTab === 'plans' ? (
        <PlansTable
          plans={filteredPlans}
          onEdit={(plan) => router.push(`/admin/billing/plans/${plan.id}/edit`)}
          onDelete={setPlanToDelete}
          onDuplicate={(plan) => router.push(`/admin/billing/plans/new?duplicate=${plan.id}`)}
          onViewSubscriptions={(plan) => {
            setActiveTab('subscriptions');
            setSearchQuery(plan.displayName);
          }}
        />
      ) : (
        <SubscriptionsTable
          subscriptions={filteredSubscriptions}
          plans={plans}
          onAssign={() => setShowAssignModal(true)}
          onViewClient={(sub) => router.push(`/clients/${sub.clientId}`)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {planToDelete && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Delete Plan</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Are you sure you want to delete &quot;{planToDelete.displayName}&quot;?
                  {planToDelete.subscriptionCount && planToDelete.subscriptionCount > 0 && (
                    <span className="block mt-2 text-yellow-500">
                      This plan has {planToDelete.subscriptionCount} active subscription(s) and will be hidden instead of deleted.
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setPlanToDelete(null)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlan}
                disabled={isDeleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

interface PlansTableProps {
  plans: PricingPlan[];
  onEdit: (plan: PricingPlan) => void;
  onDelete: (plan: PricingPlan) => void;
  onDuplicate: (plan: PricingPlan) => void;
  onViewSubscriptions: (plan: PricingPlan) => void;
}

function PlansTable({ plans, onEdit, onDelete, onDuplicate, onViewSubscriptions }: PlansTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  if (plans.length === 0) {
    return (
      <div className="bg-card border rounded-xl p-12 text-center">
        <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-1">No plans found</h3>
        <p className="text-sm text-muted-foreground">
          Create your first pricing plan to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Plan
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Type
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Price
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Included
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Subscribers
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium">{plan.displayName}</p>
                    <p className="text-sm text-muted-foreground">{plan.name}</p>
                    {plan.clientName && (
                      <p className="text-xs text-purple-500 mt-1">
                        For: {plan.clientName}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={cn(
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full border',
                    getPlanTypeColor(plan.planType)
                  )}>
                    {plan.planType}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <p className="font-medium">{formatCurrency(plan.baseCost)}/mo</p>
                    {plan.annualCost && (
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(plan.annualCost)}/yr
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm space-y-1">
                    <p>{formatNumber(plan.included?.transactions)} txns</p>
                    <p className="text-muted-foreground">
                      {formatNumber(plan.included?.companies)} companies
                    </p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => onViewSubscriptions(plan)}
                    className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                  >
                    {plan.subscriptionCount || 0}
                    <Users className="h-3 w-3" />
                  </button>
                </td>
                <td className="px-4 py-4">
                  <span className={cn(
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full border',
                    getPlanStatusColor(plan.status)
                  )}>
                    {plan.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end">
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === plan.id ? null : plan.id)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openMenu === plan.id && (
                        <div className="absolute right-0 top-full mt-1 bg-popover border rounded-lg shadow-lg z-10 min-w-[160px] py-1">
                          <button
                            onClick={() => {
                              onEdit(plan);
                              setOpenMenu(null);
                            }}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              onDuplicate(plan);
                              setOpenMenu(null);
                            }}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            Duplicate
                          </button>
                          <button
                            onClick={() => {
                              onViewSubscriptions(plan);
                              setOpenMenu(null);
                            }}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                          >
                            <Users className="h-4 w-4" />
                            View Subscribers
                          </button>
                          <hr className="my-1" />
                          <button
                            onClick={() => {
                              onDelete(plan);
                              setOpenMenu(null);
                            }}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="p-4 active:bg-muted/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{plan.displayName}</p>
                  <span className={cn(
                    'inline-flex px-2 py-0.5 text-xs font-medium rounded-full border',
                    getPlanTypeColor(plan.planType)
                  )}>
                    {plan.planType}
                  </span>
                </div>
                {plan.clientName && (
                  <p className="text-xs text-purple-500 mt-1">For: {plan.clientName}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>{formatCurrency(plan.baseCost)}/mo</span>
                  <span>{plan.subscriptionCount || 0} subscribers</span>
                </div>
              </div>
              <button
                onClick={() => onEdit(plan)}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SubscriptionsTableProps {
  subscriptions: ClientSubscription[];
  plans: PricingPlan[];
  onAssign: () => void;
  onViewClient: (sub: ClientSubscription) => void;
}

function SubscriptionsTable({ subscriptions, plans, onAssign, onViewClient }: SubscriptionsTableProps) {
  if (subscriptions.length === 0) {
    return (
      <div className="bg-card border rounded-xl p-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-1">No subscriptions found</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Assign a plan to a client to create a subscription.
        </p>
        <button
          onClick={onAssign}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Assign Plan
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Client
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Plan
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Billing
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Current Period
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Status
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {subscriptions.map((sub) => {
              const plan = plans.find((p) => p.id === sub.planId);
              const periodStart = new Date(sub.currentPeriodStart);
              const periodEnd = new Date(sub.currentPeriodEnd);

              return (
                <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium">{sub.clientName || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{sub.clientCode}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium">{plan?.displayName || sub.planName}</p>
                      <p className="text-sm text-muted-foreground">
                        {plan && formatCurrency(plan.baseCost)}/mo
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="capitalize">{sub.billingInterval}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <p>{periodStart.toLocaleDateString()} - {periodEnd.toLocaleDateString()}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      'inline-flex px-2 py-1 text-xs font-medium rounded-full border',
                      getSubscriptionStatusColor(sub.status)
                    )}>
                      {sub.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => onViewClient(sub)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="View client"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y">
        {subscriptions.map((sub) => {
          const plan = plans.find((p) => p.id === sub.planId);

          return (
            <button
              key={sub.id}
              onClick={() => onViewClient(sub)}
              className="w-full p-4 text-left active:bg-muted/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{sub.clientName || 'Unknown'}</p>
                    <span className={cn(
                      'inline-flex px-2 py-0.5 text-xs font-medium rounded-full border',
                      getSubscriptionStatusColor(sub.status)
                    )}>
                      {sub.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan?.displayName || sub.planName} - {formatCurrency(plan?.baseCost || 0)}/mo
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
