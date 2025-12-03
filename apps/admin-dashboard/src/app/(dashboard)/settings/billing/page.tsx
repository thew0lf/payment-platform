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
  Shield,
  Check,
  ExternalLink,
  BarChart3,
  Clock,
  Receipt,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  billingApi,
  PricingPlan,
  ClientSubscription,
  UsageSummary,
  Invoice,
  formatCurrency,
  formatNumber,
  getSubscriptionStatusColor,
  getInvoiceStatusColor,
  getFeatureLabel,
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
          <span className="text-zinc-300">{label}</span>
        </div>
        <span className={`text-sm ${isOverage ? 'text-orange-400' : 'text-zinc-400'}`}>
          {format(used)} / {isUnlimited ? 'Unlimited' : format(included)}
        </span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isOverage ? 'bg-orange-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-blue-500'
          }`}
          style={{ width: isUnlimited ? '0%' : `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isOverage && (
        <p className="text-xs text-orange-400">
          Overage: {format(used - included)} additional usage
        </p>
      )}
    </div>
  );
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
  const isEnterprise = plan.metadata && (plan.metadata as any).isCustomPricing;

  return (
    <div
      className={`bg-zinc-900 border rounded-xl p-6 transition-all ${
        isCurrentPlan
          ? 'border-blue-500 ring-1 ring-blue-500/20'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{plan.displayName}</h3>
          <p className="text-sm text-zinc-400">{plan.description}</p>
        </div>
        {isCurrentPlan && (
          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
            Current
          </span>
        )}
      </div>

      <div className="mb-6">
        {isEnterprise ? (
          <div className="text-2xl font-bold text-white">Custom</div>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">
              {formatCurrency(plan.baseCost, plan.currency)}
            </span>
            <span className="text-zinc-400">/mo</span>
          </div>
        )}
      </div>

      <div className="space-y-3 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-zinc-300">
            {formatNumber(plan.included.transactions)} transactions
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-zinc-300">{formatNumber(plan.included.companies)} companies</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-zinc-300">{formatNumber(plan.included.users)} users</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-zinc-300">
            {formatNumber(plan.included.merchantAccounts)} merchant accounts
          </span>
        </div>
      </div>

      {!isCurrentPlan && onSelect && (
        <button
          onClick={onSelect}
          className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {isEnterprise ? 'Contact Sales' : 'Upgrade'}
        </button>
      )}
    </div>
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
        <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Billing & Subscription</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your subscription plan and view usage
          </p>
        </div>
        <Link
          href="/settings/billing/plans"
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Package className="h-4 w-4" />
          Manage Plans
        </Link>
      </div>

      {/* Current Plan Summary */}
      {subscription && currentPlan ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plan Info Card */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-white">{currentPlan.displayName} Plan</h2>
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${getSubscriptionStatusColor(subscription.status)}`}
                  >
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-zinc-400">{currentPlan.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(currentPlan.baseCost, currentPlan.currency)}
                </div>
                <div className="text-sm text-zinc-400">per month</div>
              </div>
            </div>

            {/* Billing Cycle */}
            <div className="flex items-center gap-6 py-4 border-t border-zinc-800 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-zinc-500" />
                <span className="text-zinc-400">Current period:</span>
                <span className="text-white">
                  {new Date(subscription.currentPeriodStart).toLocaleDateString()} -{' '}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
              {usage && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-500" />
                  <span className="text-zinc-400">{usage.period.daysRemaining} days remaining</span>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="pt-4 border-t border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-300 mb-3">Included Features</h3>
              <div className="flex flex-wrap gap-2">
                {currentPlan.features.slice(0, 8).map((feature) => (
                  <span
                    key={feature}
                    className="text-xs px-2 py-1 bg-zinc-800 text-zinc-300 rounded-full"
                  >
                    {getFeatureLabel(feature)}
                  </span>
                ))}
                {currentPlan.features.length > 8 && (
                  <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 rounded-full">
                    +{currentPlan.features.length - 8} more
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Estimated Cost Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Estimated This Period</h3>
            {usage ? (
              <>
                <div className="text-3xl font-bold text-white mb-4">
                  {formatCurrency(usage.estimatedCost.total, 'USD')}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Base subscription</span>
                    <span className="text-white">
                      {formatCurrency(usage.estimatedCost.base, 'USD')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Overages</span>
                    <span
                      className={
                        usage.estimatedCost.overages > 0 ? 'text-orange-400' : 'text-white'
                      }
                    >
                      {formatCurrency(usage.estimatedCost.overages, 'USD')}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <Link
                    href="/settings/billing/usage"
                    className="flex items-center justify-between text-sm text-blue-400 hover:text-blue-300"
                  >
                    View detailed usage
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-zinc-500">Usage data unavailable</div>
            )}
          </div>
        </div>
      ) : (
        /* No Subscription */
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <CreditCard className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Active Subscription</h2>
          <p className="text-zinc-400 mb-6">Choose a plan to get started with the platform.</p>
        </div>
      )}

      {/* Usage Overview */}
      {usage && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Current Usage</h2>
            <Link
              href="/settings/billing/usage"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View Details
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <UsageBar
              label="Transactions"
              used={usage.usage.transactions.used}
              included={usage.usage.transactions.included}
              icon={<CreditCard className="h-4 w-4 text-zinc-500" />}
            />
            <UsageBar
              label="Volume"
              used={usage.usage.volume.used}
              included={usage.usage.volume.included}
              icon={<TrendingUp className="h-4 w-4 text-zinc-500" />}
              format={(val) => formatCurrency(val, 'USD')}
            />
            <UsageBar
              label="Companies"
              used={usage.usage.companies.used}
              included={usage.usage.companies.included}
              icon={<Building2 className="h-4 w-4 text-zinc-500" />}
            />
            <UsageBar
              label="Team Members"
              used={usage.usage.teamMembers.used}
              included={usage.usage.teamMembers.included}
              icon={<Users className="h-4 w-4 text-zinc-500" />}
            />
            <UsageBar
              label="Merchant Accounts"
              used={usage.usage.merchantAccounts.used}
              included={usage.usage.merchantAccounts.included}
              icon={<Server className="h-4 w-4 text-zinc-500" />}
            />
            <UsageBar
              label="API Calls"
              used={usage.usage.apiCalls.used}
              included={usage.usage.apiCalls.included}
              icon={<Zap className="h-4 w-4 text-zinc-500" />}
            />
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Available Plans</h2>
          <Link
            href="/settings/billing/plans"
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Compare all plans
            <ChevronRight className="h-4 w-4" />
          </Link>
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Invoices</h2>
            <Link
              href="/settings/billing/invoices"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-zinc-800">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-4">
                  <Receipt className="h-5 w-5 text-zinc-500" />
                  <div>
                    <div className="text-sm text-white">{invoice.invoiceNumber}</div>
                    <div className="text-xs text-zinc-500">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${getInvoiceStatusColor(invoice.status)}`}
                  >
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                  <span className="text-sm text-white font-medium">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </span>
                  {invoice.pdfUrl && (
                    <a
                      href={invoice.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
