'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
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
  isCurrentPlan: boolean;
  onSelect?: () => void;
}

function PlanCompareCard({ plan, isCurrentPlan, onSelect }: PlanCardProps) {
  const isEnterprise = plan.metadata && (plan.metadata as Record<string, unknown>).isCustomPricing;

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
          {isCurrentPlan && (
            <Badge variant="info">Current</Badge>
          )}
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

        {!isCurrentPlan && onSelect && (
          <Button
            onClick={onSelect}
            variant="outline"
            className="w-full"
          >
            {isEnterprise ? "Let's Talk" : 'Switch to This Plan'}
          </Button>
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

  const clientId = user?.clientId;

  const loadData = useCallback(async () => {
    if (!clientId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Load plans (public)
      const plansData = await billingApi.getPlans();
      setPlans(plansData.filter((p) => p.status === 'active').sort((a, b) => a.sortOrder - b.sortOrder));

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
          /* No Subscription */
          <Card>
            <CardContent className="py-12 text-center">
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
                isCurrentPlan={currentPlan?.id === plan.id}
                onSelect={() => {
                  // TODO: Implement plan change modal
                  console.log('Select plan:', plan.id);
                }}
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
    </>
  );
}
