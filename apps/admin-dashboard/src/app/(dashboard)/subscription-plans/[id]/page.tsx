'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Edit2,
  Trash2,
  Copy,
  Send,
  Archive,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  Calendar,
  Users,
  Store,
  Building2,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  subscriptionPlansApi,
  SubscriptionPlan,
  SubscriptionPlanScope,
  SubscriptionPlanStatus,
  BillingInterval,
  formatPlanPrice,
  formatInterval,
} from '@/lib/api/subscription-plans';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';

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

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: SubscriptionPlanStatus }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'bg-muted text-muted-foreground', icon: AlertTriangle };
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border', config.color)}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: SubscriptionPlanScope }) {
  const config = SCOPE_CONFIG[scope] || { label: scope, color: 'bg-muted text-muted-foreground', icon: Building2 };
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium', config.color)}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground text-right">{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function SubscriptionPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params?.id as string;

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function fetchPlan() {
      if (!planId) return;

      setLoading(true);
      setError(null);

      try {
        const data = await subscriptionPlansApi.getPlan(planId);
        setPlan(data);
      } catch (err) {
        console.error('Failed to fetch plan:', err);
        setError('Failed to load subscription plan');
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
  }, [planId]);

  const handlePublish = async () => {
    if (!plan) return;
    setActionLoading(true);
    try {
      const updated = await subscriptionPlansApi.publishPlan(plan.id);
      setPlan(updated);
    } catch (err) {
      console.error('Failed to publish plan:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!plan) return;
    setActionLoading(true);
    try {
      const updated = await subscriptionPlansApi.archivePlan(plan.id);
      setPlan(updated);
    } catch (err) {
      console.error('Failed to archive plan:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!plan) return;
    setActionLoading(true);
    try {
      const newPlan = await subscriptionPlansApi.duplicatePlan(plan.id, `${plan.name}-copy`);
      router.push(`/subscription-plans/${newPlan.id}`);
    } catch (err) {
      console.error('Failed to duplicate plan:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    if (!plan) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!plan) return;
    setActionLoading(true);
    try {
      await subscriptionPlansApi.deletePlan(plan.id);
      toast.success('Plan deleted successfully');
      router.push('/subscription-plans');
    } catch (err) {
      console.error('Failed to delete plan:', err);
      toast.error('Failed to delete plan. Please try again.');
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <>
        <Header
          title="Loading..."
          actions={
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          }
        />
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      </>
    );
  }

  if (error || !plan) {
    return (
      <>
        <Header
          title="Error"
          actions={
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          }
        />
        <div className="p-6">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error || 'Plan not found'}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title={plan.displayName}
        subtitle={plan.name}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {plan.status === 'DRAFT' && (
              <Button size="sm" onClick={handlePublish} disabled={actionLoading}>
                <Send className="w-4 h-4 mr-2" />
                Publish
              </Button>
            )}
            {plan.status === 'ACTIVE' && (
              <Button variant="secondary" size="sm" onClick={handleArchive} disabled={actionLoading}>
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
            )}
          </div>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Status & Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={plan.status} />
            <ScopeBadge scope={plan.scope} />
            {plan.isFeatured && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium bg-yellow-500/10 text-yellow-400">
                <Star className="w-4 h-4 fill-current" />
                Featured
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDuplicate}
              disabled={actionLoading}
              className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => {/* TODO: Edit modal */}}
              className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="p-2 rounded-lg bg-muted text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pricing Section */}
          <div className="bg-card/50 border border-border rounded-xl p-5">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Pricing
            </h3>
            <div className="space-y-1">
              <DetailRow
                label="Monthly Price"
                value={formatPlanPrice(plan.basePriceMonthly, plan.currency)}
              />
              {plan.basePriceAnnual && (
                <DetailRow
                  label="Annual Price"
                  value={formatPlanPrice(plan.basePriceAnnual, plan.currency)}
                />
              )}
              {plan.annualDiscountPct && (
                <DetailRow
                  label="Annual Discount"
                  value={`${plan.annualDiscountPct}%`}
                />
              )}
              <DetailRow label="Currency" value={plan.currency} />
              <DetailRow
                label="Default Interval"
                value={formatInterval(plan.defaultInterval)}
              />
              <DetailRow
                label="Available Intervals"
                value={plan.availableIntervals.map(formatInterval).join(', ')}
              />
            </div>
          </div>

          {/* Trial Settings */}
          <div className="bg-card/50 border border-border rounded-xl p-5">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Trial Settings
            </h3>
            <div className="space-y-1">
              <DetailRow
                label="Trial Enabled"
                value={plan.trialEnabled ? 'Yes' : 'No'}
              />
              {plan.trialEnabled && (
                <>
                  <DetailRow
                    label="Trial Days"
                    value={plan.trialDays || '-'}
                  />
                  <DetailRow
                    label="Includes Shipment"
                    value={plan.trialIncludesShipment ? 'Yes' : 'No'}
                  />
                  <DetailRow
                    label="Start Trigger"
                    value={plan.trialStartTrigger.replace(/_/g, ' ')}
                  />
                  <DetailRow
                    label="Conversion Trigger"
                    value={plan.trialConversionTrigger.replace(/_/g, ' ')}
                  />
                </>
              )}
            </div>
          </div>

          {/* Pause & Skip */}
          <div className="bg-card/50 border border-border rounded-xl p-5">
            <h3 className="text-lg font-semibold text-foreground mb-4">Pause & Skip</h3>
            <div className="space-y-1">
              <DetailRow
                label="Pause Enabled"
                value={plan.pauseEnabled ? 'Yes' : 'No'}
              />
              {plan.pauseEnabled && plan.pauseMaxDuration && (
                <DetailRow
                  label="Max Pause Duration"
                  value={`${plan.pauseMaxDuration} days`}
                />
              )}
              <DetailRow
                label="Skip Enabled"
                value={plan.skipEnabled ? 'Yes' : 'No'}
              />
              {plan.skipEnabled && plan.skipMaxPerYear && (
                <DetailRow
                  label="Max Skips Per Year"
                  value={plan.skipMaxPerYear}
                />
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-card/50 border border-border rounded-xl p-5">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              Metadata
            </h3>
            <div className="space-y-1">
              <DetailRow label="Created" value={formatDate(plan.createdAt)} />
              <DetailRow label="Updated" value={formatDate(plan.updatedAt)} />
              {plan.publishedAt && (
                <DetailRow label="Published" value={formatDate(plan.publishedAt)} />
              )}
              {plan.archivedAt && (
                <DetailRow label="Archived" value={formatDate(plan.archivedAt)} />
              )}
              <DetailRow label="Sort Order" value={plan.sortOrder} />
              <DetailRow label="Public" value={plan.isPublic ? 'Yes' : 'No'} />
            </div>
          </div>
        </div>

        {/* Description */}
        {(plan.description || plan.shortDescription) && (
          <div className="bg-card/50 border border-border rounded-xl p-5">
            <h3 className="text-lg font-semibold text-foreground mb-4">Description</h3>
            {plan.shortDescription && (
              <p className="text-sm text-muted-foreground mb-3">{plan.shortDescription}</p>
            )}
            {plan.description && (
              <p className="text-sm text-foreground">{plan.description}</p>
            )}
          </div>
        )}

        {/* Features */}
        {plan.features && plan.features.length > 0 && (
          <div className="bg-card/50 border border-border rounded-xl p-5">
            <h3 className="text-lg font-semibold text-foreground mb-4">Features</h3>
            <ul className="space-y-2">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Plan?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete &quot;{plan.displayName}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete Plan'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
