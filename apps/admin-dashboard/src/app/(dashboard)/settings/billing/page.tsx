'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Loader2,
  Package,
  Users,
  Building2,
  Server,
  Zap,
  Check,
  ExternalLink,
  Clock,
  Receipt,
  ArrowUp,
  ArrowDown,
  X,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  billingApi,
  PricingPlan,
  ClientSubscription,
  UsageSummary,
  Invoice,
  formatCurrency,
  formatNumber,
  getFeatureLabel,
  SubscriptionStatus,
  InvoiceStatus,
  PlanType,
} from '@/lib/api/billing';

// ═══════════════════════════════════════════════════════════════
// USAGE PROGRESS BAR
// ═══════════════════════════════════════════════════════════════

interface UsageBarProps {
  label: string;
  used: number;
  included: number;
  icon: React.ReactNode;
  format?: (val: number) => string;
}

function UsageBar({ label, used, included, icon, format = formatNumber }: UsageBarProps) {
  const isUnlimited = included === 0;
  const percentage = isUnlimited ? 0 : Math.min((used / included) * 100, 100);
  const isOverage = !isUnlimited && used > included;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {icon}
          <span className="text-foreground">{label}</span>
        </div>
        <span className={`text-sm ${isOverage ? 'text-orange-400' : 'text-muted-foreground'}`}>
          {format(used)} / {isUnlimited ? 'Unlimited' : format(included)}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isOverage ? 'bg-orange-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-primary'
          }`}
          style={{ width: isUnlimited ? '0%' : `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isOverage && (
        <p className="text-sm text-orange-400">
          You've gone over by {format(used - included)}—we've got you covered
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STATUS BADGE HELPERS
// ═══════════════════════════════════════════════════════════════

function getSubscriptionBadgeVariant(status: string): 'success' | 'info' | 'warning' | 'destructive' | 'default' {
  switch (status) {
    case SubscriptionStatus.ACTIVE:
      return 'success';
    case SubscriptionStatus.TRIALING:
      return 'info';
    case SubscriptionStatus.PAUSED:
      return 'warning';
    case SubscriptionStatus.PAST_DUE:
      return 'warning';
    case SubscriptionStatus.CANCELED:
      return 'destructive';
    default:
      return 'default';
  }
}

function getInvoiceBadgeVariant(status: string): 'success' | 'info' | 'warning' | 'destructive' | 'default' {
  switch (status) {
    case InvoiceStatus.PAID:
      return 'success';
    case InvoiceStatus.OPEN:
      return 'info';
    case InvoiceStatus.DRAFT:
      return 'default';
    case InvoiceStatus.VOID:
      return 'destructive';
    case InvoiceStatus.UNCOLLECTIBLE:
      return 'warning';
    default:
      return 'default';
  }
}

// ═══════════════════════════════════════════════════════════════
// PLAN COMPARISON CARD
// ═══════════════════════════════════════════════════════════════

interface PlanCardProps {
  plan: PricingPlan;
  currentPlan: PricingPlan | null;
  isCurrentPlan: boolean;
  onUpgrade?: (plan: PricingPlan) => void;
  onDowngrade?: (plan: PricingPlan) => void;
}

function PlanCompareCard({ plan, currentPlan, isCurrentPlan, onUpgrade, onDowngrade }: PlanCardProps) {
  const isEnterprise = Boolean(plan.metadata && (plan.metadata as Record<string, unknown>).isCustomPricing);
  const isCustomPlan = plan.planType === PlanType.CUSTOM;

  // Determine if this is an upgrade or downgrade
  const isUpgrade = currentPlan && plan.baseCost > currentPlan.baseCost;
  const isDowngrade = currentPlan && plan.baseCost < currentPlan.baseCost;
  const canSelfUpgrade = plan.allowSelfUpgrade && isUpgrade;
  const canSelfDowngrade = plan.allowSelfDowngrade && isDowngrade;

  return (
    <Card
      className={`transition-all ${
        isCurrentPlan
          ? 'border-primary ring-1 ring-primary/20'
          : 'hover:border-muted-foreground/30'
      }`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{plan.displayName}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isCurrentPlan && (
              <Badge variant="info">Current</Badge>
            )}
            {isCustomPlan && (
              <Badge variant="default" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                Custom
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          {isEnterprise ? (
            <div className="text-2xl font-bold text-foreground">Custom</div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">
                {formatCurrency(plan.baseCost, plan.currency)}
              </span>
              <span className="text-muted-foreground">/mo</span>
            </div>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            <span className="text-foreground">
              {formatNumber(plan.included?.transactions)} transactions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            <span className="text-foreground">{formatNumber(plan.included?.companies)} companies</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            <span className="text-foreground">{formatNumber(plan.included?.users)} users</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            <span className="text-foreground">
              {formatNumber(plan.included?.merchantAccounts)} merchant accounts
            </span>
          </div>
        </div>

        {!isCurrentPlan && (
          <div className="space-y-2">
            {isUpgrade && onUpgrade && (
              <Button
                onClick={() => onUpgrade(plan)}
                variant={canSelfUpgrade ? 'default' : 'outline'}
                className="w-full"
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                {canSelfUpgrade ? 'Upgrade Now' : 'Request Upgrade'}
              </Button>
            )}
            {isDowngrade && onDowngrade && (
              <Button
                onClick={() => onDowngrade(plan)}
                variant="outline"
                className="w-full"
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                {canSelfDowngrade ? 'Downgrade' : 'Request Downgrade'}
              </Button>
            )}
            {!isUpgrade && !isDowngrade && isEnterprise && (
              <Button
                variant="outline"
                className="w-full"
              >
                Contact Sales
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function BillingPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [subscription, setSubscription] = useState<ClientSubscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PricingPlan | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Plan change modal state
  const [upgradeModal, setUpgradeModal] = useState<{ plan: PricingPlan } | null>(null);
  const [downgradeModal, setDowngradeModal] = useState<{ plan: PricingPlan } | null>(null);
  const [downgradeReason, setDowngradeReason] = useState('');
  const [isPlanChanging, setIsPlanChanging] = useState(false);

  const clientId = user?.clientId;
  const isOrgAdmin = user?.scopeType === 'ORGANIZATION';

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load plans (always available)
      const plansData = await billingApi.getPlans();
      setPlans(plansData.filter((p) => p.status === 'active').sort((a, b) => a.sortOrder - b.sortOrder));

      // If no clientId (org-level user), only load plans
      if (!clientId) {
        setSubscription(null);
        setCurrentPlan(null);
        setUsage(null);
        setInvoices([]);
        return;
      }

      // Load subscription
      try {
        const subscriptionData = await billingApi.getSubscription(clientId);
        setSubscription(subscriptionData);

        // Find current plan
        const plan = plansData.find((p) => p.id === subscriptionData.planId);
        setCurrentPlan(plan || null);
      } catch {
        // No subscription yet
        setSubscription(null);
        setCurrentPlan(null);
      }

      // Load usage
      try {
        const usageData = await billingApi.getUsage(clientId);
        setUsage(usageData);
      } catch {
        setUsage(null);
      }

      // Load invoices
      try {
        const invoicesData = await billingApi.getInvoices(clientId);
        setInvoices(invoicesData.slice(0, 5)); // Recent 5
      } catch {
        setInvoices([]);
      }
    } catch (err) {
      setError('Failed to load billing data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle upgrade request
  const handleUpgrade = async (plan: PricingPlan) => {
    if (!clientId) return;

    // If plan allows self-upgrade, show confirmation modal
    if (plan.allowSelfUpgrade) {
      setUpgradeModal({ plan });
    } else {
      // If requires approval, submit request directly
      setIsPlanChanging(true);
      try {
        const response = await billingApi.requestUpgrade(clientId, { targetPlanId: plan.id });
        if (response.requiresApproval) {
          toast.success(response.message || 'Upgrade request submitted for approval');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to request upgrade');
      } finally {
        setIsPlanChanging(false);
      }
    }
  };

  // Confirm upgrade (self-service via Stripe Checkout)
  const confirmUpgrade = async () => {
    if (!clientId || !upgradeModal) return;

    setIsPlanChanging(true);
    try {
      const response = await billingApi.requestUpgrade(clientId, { targetPlanId: upgradeModal.plan.id });

      if (response.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = response.checkoutUrl;
      } else if (response.requiresApproval) {
        toast.success(response.message || 'Upgrade request submitted');
        setUpgradeModal(null);
      } else {
        // Upgrade completed directly (no Stripe)
        toast.success('Plan upgraded successfully!');
        setUpgradeModal(null);
        await loadData();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upgrade');
    } finally {
      setIsPlanChanging(false);
    }
  };

  // Handle downgrade request
  const handleDowngrade = (plan: PricingPlan) => {
    setDowngradeModal({ plan });
    setDowngradeReason('');
  };

  // Submit downgrade request
  const submitDowngradeRequest = async () => {
    if (!clientId || !downgradeModal) return;

    setIsPlanChanging(true);
    try {
      const response = await billingApi.requestDowngrade(
        clientId,
        { targetPlanId: downgradeModal.plan.id },
        downgradeReason
      );
      toast.success(response.message || 'Downgrade request submitted');
      setDowngradeModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to request downgrade');
    } finally {
      setIsPlanChanging(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title="Billing" />
        <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading your billing info...</span>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header title="Billing" />
        <div className="p-4 md:p-6">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Billing"
        subtitle="Your plan, usage, and invoices—all in one place"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/billing/plans">
              <Package className="h-4 w-4 mr-2" />
              See All Plans
            </Link>
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Current Plan Summary */}
        {subscription && currentPlan ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plan Info Card */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <CardTitle>{currentPlan.displayName} Plan</CardTitle>
                      <Badge variant={getSubscriptionBadgeVariant(subscription.status)}>
                        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1).replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardDescription>{currentPlan.description}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrency(currentPlan.baseCost, currentPlan.currency)}
                    </div>
                    <div className="text-sm text-muted-foreground">per month</div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Billing Cycle */}
                <div className="flex flex-wrap items-center gap-6 py-4 border-t border-border text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Current period:</span>
                    <span className="text-foreground">
                      {new Date(subscription.currentPeriodStart).toLocaleDateString()} -{' '}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </div>
                  {usage && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{usage.period.daysRemaining} days remaining</span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground mb-3">Included Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentPlan.features.slice(0, 8).map((feature) => (
                      <Badge key={feature} variant="default">
                        {getFeatureLabel(feature)}
                      </Badge>
                    ))}
                    {currentPlan.features.length > 8 && (
                      <Badge variant="outline">
                        +{currentPlan.features.length - 8} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estimated Cost Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Estimated This Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usage ? (
                  <>
                    <div className="text-3xl font-bold text-foreground mb-4">
                      {formatCurrency(usage.estimatedCost.total, 'USD')}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base subscription</span>
                        <span className="text-foreground">
                          {formatCurrency(usage.estimatedCost.base, 'USD')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Overages</span>
                        <span
                          className={
                            usage.estimatedCost.overages > 0 ? 'text-orange-400' : 'text-foreground'
                          }
                        >
                          {formatCurrency(usage.estimatedCost.overages, 'USD')}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border">
                      <Link
                        href="/settings/billing/usage"
                        className="flex items-center justify-between text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        See the details
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground">Usage data unavailable</div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* No Subscription or Org Admin View */
          <Card>
            <CardContent className="py-12 text-center">
              {isOrgAdmin ? (
                <>
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">Organization Billing</h2>
                  <p className="text-muted-foreground mb-6">
                    As an organization admin, you can manage all pricing plans and client subscriptions.
                  </p>
                  <Button asChild>
                    <Link href="/settings/billing/plans">
                      <Package className="h-4 w-4 mr-2" />
                      Manage Plans
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">No Active Subscription</h2>
                  <p className="text-muted-foreground mb-6">
                    Pick a plan that fits your business. Upgrade anytime!
                  </p>
                  <Button asChild>
                    <Link href="/settings/billing/plans">
                      <Package className="h-4 w-4 mr-2" />
                      Browse Plans
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Usage Overview */}
        {usage && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>How you're using your plan</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/settings/billing/usage">
                  See Details
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <UsageBar
                  label="Transactions"
                  used={usage.usage.transactions.used}
                  included={usage.usage.transactions.included}
                  icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
                />
                <UsageBar
                  label="Volume"
                  used={usage.usage.volume.used}
                  included={usage.usage.volume.included}
                  icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                  format={(val) => formatCurrency(val, 'USD')}
                />
                <UsageBar
                  label="Companies"
                  used={usage.usage.companies.used}
                  included={usage.usage.companies.included}
                  icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                />
                <UsageBar
                  label="Team Members"
                  used={usage.usage.teamMembers.used}
                  included={usage.usage.teamMembers.included}
                  icon={<Users className="h-4 w-4 text-muted-foreground" />}
                />
                <UsageBar
                  label="Merchant Accounts"
                  used={usage.usage.merchantAccounts.used}
                  included={usage.usage.merchantAccounts.included}
                  icon={<Server className="h-4 w-4 text-muted-foreground" />}
                />
                <UsageBar
                  label="API Calls"
                  used={usage.usage.apiCalls.used}
                  included={usage.usage.apiCalls.included}
                  icon={<Zap className="h-4 w-4 text-muted-foreground" />}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Available Plans</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings/billing/plans" className="flex items-center gap-1">
                Compare all plans
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <PlanCompareCard
                key={plan.id}
                plan={plan}
                currentPlan={currentPlan}
                isCurrentPlan={currentPlan?.id === plan.id}
                onUpgrade={handleUpgrade}
                onDowngrade={handleDowngrade}
              />
            ))}
          </div>
        </div>

        {/* Recent Invoices */}
        {invoices.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/settings/billing/invoices">
                  See All Invoices
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-foreground">{invoice.invoiceNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={getInvoiceBadgeVariant(invoice.status)}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Badge>
                      <span className="text-sm text-foreground font-medium">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </span>
                      {invoice.pdfUrl && (
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={invoice.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upgrade Confirmation Modal */}
      {upgradeModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setUpgradeModal(null)} />
            <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
              <button
                onClick={() => setUpgradeModal(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center mb-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Upgrade to {upgradeModal.plan.displayName}
                </h2>
                <p className="text-muted-foreground">
                  You're about to upgrade your plan. You'll be charged the prorated difference immediately.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">New plan</span>
                  <span className="text-sm font-medium text-foreground">{upgradeModal.plan.displayName}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Monthly price</span>
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(upgradeModal.plan.baseCost, upgradeModal.plan.currency)}
                  </span>
                </div>
                {currentPlan && (
                  <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                    <span className="text-sm text-muted-foreground">Previous plan</span>
                    <span className="text-sm text-muted-foreground line-through">
                      {formatCurrency(currentPlan.baseCost, currentPlan.currency)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setUpgradeModal(null)}
                  disabled={isPlanChanging}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={confirmUpgrade}
                  disabled={isPlanChanging}
                >
                  {isPlanChanging ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Upgrade Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Downgrade Request Modal */}
      {downgradeModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setDowngradeModal(null)} />
            <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
              <button
                onClick={() => setDowngradeModal(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center mb-6">
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                  <ArrowDown className="h-6 w-6 text-orange-500" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Request Downgrade to {downgradeModal.plan.displayName}
                </h2>
                <p className="text-muted-foreground">
                  Downgrade requests require approval. Our team will review your request and get back to you.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Reason for downgrade (optional)
                </label>
                <textarea
                  value={downgradeReason}
                  onChange={(e) => setDowngradeReason(e.target.value)}
                  placeholder="Help us understand why you'd like to downgrade..."
                  className="w-full h-24 px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Requested plan</span>
                  <span className="text-sm font-medium text-foreground">{downgradeModal.plan.displayName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monthly price</span>
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(downgradeModal.plan.baseCost, downgradeModal.plan.currency)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDowngradeModal(null)}
                  disabled={isPlanChanging}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                  onClick={submitDowngradeRequest}
                  disabled={isPlanChanging}
                >
                  {isPlanChanging ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Request Downgrade
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
