'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Percent,
  Clock,
  CheckCircle2,
  XCircle,
  PauseCircle,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { apiClient } from '@/lib/api';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { useAuth } from '@/contexts/auth-context';
import { Building2 } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface DashboardKPIs {
  mrr: number;
  mrrChange: number;
  arr: number;
  activeSubscriptions: number;
  activeChange: number;
  churnRate: number;
  churnChange: number;
  trialConversionRate: number;
  conversionChange: number;
  averageSubscriptionValue: number;
  asvChange: number;
  lifetimeValue: number;
  ltvChange: number;
}

interface SubscriptionCounts {
  active: number;
  trialing: number;
  paused: number;
  past_due: number;
  canceled: number;
  expired: number;
}

interface TrendDataPoint {
  date: string;
  value: number;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function KPICard({
  title,
  value,
  change,
  icon: Icon,
  format = 'number',
  color = 'cyan',
}: {
  title: string;
  value: number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  format?: 'number' | 'currency' | 'percent';
  color?: 'cyan' | 'green' | 'yellow' | 'red' | 'purple';
}) {
  const colorClasses = {
    cyan: 'bg-primary/10 text-primary border-primary/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };

  const formatValue = (val: number | undefined | null) => {
    const safeVal = val ?? 0;
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(safeVal);
      case 'percent':
        return `${safeVal.toFixed(1)}%`;
      default:
        return safeVal.toLocaleString();
    }
  };

  return (
    <div className="bg-card/50 border border-border rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs md:text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-xl md:text-2xl font-bold text-foreground">{formatValue(value)}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {change >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <span className={cn('text-xs', change >= 0 ? 'text-green-400' : 'text-red-400')}>
                {change >= 0 ? '+' : ''}
                {change.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">vs last period</span>
            </div>
          )}
        </div>
        <div className={cn('p-2.5 md:p-3 rounded-xl border', colorClasses[color])}>
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  label,
  count,
  icon: Icon,
  color,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <div className={cn('p-2 rounded-lg', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">{(count ?? 0).toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function MiniChart({ data, label }: { data: TrendDataPoint[]; label: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">No data</div>
    );
  }

  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;

  return (
    <div className="h-20">
      <div className="flex items-end h-16 gap-0.5">
        {data.slice(-30).map((point, i) => {
          const height = ((point.value - min) / range) * 100;
          return (
            <div
              key={i}
              className="flex-1 bg-primary/30 rounded-t hover:bg-primary/50 transition-colors"
              style={{ height: `${Math.max(height, 5)}%` }}
              title={`${point.date}: ${(point.value ?? 0).toFixed(2)}`}
            />
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-center">{label}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function SubscriptionAnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { selectedCompanyId, accessLevel, isLoading: hierarchyLoading } = useHierarchy();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [counts, setCounts] = useState<SubscriptionCounts | null>(null);
  const [mrrTrend, setMrrTrend] = useState<TrendDataPoint[]>([]);
  const [subsTrend, setSubsTrend] = useState<TrendDataPoint[]>([]);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  // Determine if user needs to select a company to view analytics
  const needsCompanySelection =
    (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  const fetchData = useCallback(async () => {
    // Don't fetch if auth or hierarchy is still loading
    if (authLoading || hierarchyLoading) {
      return;
    }

    // Don't fetch if org/client user hasn't selected a company
    if (needsCompanySelection) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const companyParam = selectedCompanyId ? `?companyId=${selectedCompanyId}` : '';
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

      // Fetch KPIs
      const kpisData = await apiClient.get<DashboardKPIs>(
        `/api/subscriptions/analytics/kpis${companyParam}`
      );
      setKpis(kpisData);

      // Fetch subscription counts
      const countsData = await apiClient.get<SubscriptionCounts>(
        `/api/subscriptions/analytics/subscriptions/counts${companyParam}`
      );
      setCounts(countsData);

      // Fetch MRR trend
      const mrrData = await apiClient.get<TrendDataPoint[]>(
        `/api/subscriptions/analytics/trends/mrr${companyParam}${companyParam ? '&' : '?'}days=${days}`
      );
      setMrrTrend(mrrData);

      // Fetch subscription count trend
      const subsData = await apiClient.get<TrendDataPoint[]>(
        `/api/subscriptions/analytics/trends/subscriptions${companyParam}${companyParam ? '&' : '?'}days=${days}`
      );
      setSubsTrend(subsData);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, period, needsCompanySelection, authLoading, hierarchyLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <>
      <Header
        title="Subscription Analytics"
        subtitle="Monitor subscription health and trends"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d')}
              className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <button
              onClick={fetchData}
              className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {(loading || authLoading || hierarchyLoading) && !kpis && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}

        {/* Company Selection Required */}
        {!authLoading && !hierarchyLoading && needsCompanySelection && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Building2 className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Select a Company</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Please select a company from the header to view subscription analytics.
              Analytics are scoped to individual companies.
            </p>
          </div>
        )}

        {/* Main KPIs */}
        {!needsCompanySelection && kpis && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <KPICard
                title="Monthly Recurring Revenue"
                value={kpis.mrr}
                change={kpis.mrrChange}
                icon={DollarSign}
                format="currency"
                color="green"
              />
              <KPICard
                title="Active Subscriptions"
                value={kpis.activeSubscriptions}
                change={kpis.activeChange}
                icon={Users}
                format="number"
                color="cyan"
              />
              <KPICard
                title="Churn Rate"
                value={kpis.churnRate}
                change={kpis.churnChange}
                icon={Percent}
                format="percent"
                color={kpis.churnRate > 5 ? 'red' : 'yellow'}
              />
              <KPICard
                title="Trial Conversion"
                value={kpis.trialConversionRate}
                change={kpis.conversionChange}
                icon={TrendingUp}
                format="percent"
                color="purple"
              />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <KPICard
                title="Annual Recurring Revenue"
                value={kpis.arr}
                icon={Calendar}
                format="currency"
                color="green"
              />
              <KPICard
                title="Avg Subscription Value"
                value={kpis.averageSubscriptionValue}
                change={kpis.asvChange}
                icon={DollarSign}
                format="currency"
                color="cyan"
              />
              <KPICard
                title="Customer Lifetime Value"
                value={kpis.lifetimeValue}
                change={kpis.ltvChange}
                icon={Clock}
                format="currency"
                color="purple"
              />
            </div>
          </>
        )}

        {/* Trends & Status Grid */}
        {!needsCompanySelection && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* MRR Trend */}
            <div className="bg-card/50 border border-border rounded-xl p-4">
              <h3 className="text-sm font-medium text-foreground mb-4">MRR Trend</h3>
              <MiniChart data={mrrTrend} label={`Last ${period === '7d' ? '7' : period === '30d' ? '30' : '90'} days`} />
            </div>

            {/* Subscription Count Trend */}
            <div className="bg-card/50 border border-border rounded-xl p-4">
              <h3 className="text-sm font-medium text-foreground mb-4">Subscription Count Trend</h3>
              <MiniChart data={subsTrend} label={`Last ${period === '7d' ? '7' : period === '30d' ? '30' : '90'} days`} />
            </div>
          </div>
        )}

        {/* Subscription Status Breakdown */}
        {!needsCompanySelection && counts && (
          <div className="bg-card/50 border border-border rounded-xl p-4">
            <h3 className="text-sm font-medium text-foreground mb-4">Subscription Status Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatusCard
                label="Active"
                count={counts.active}
                icon={CheckCircle2}
                color="bg-green-500/10 text-green-400"
              />
              <StatusCard
                label="Trialing"
                count={counts.trialing}
                icon={Clock}
                color="bg-primary/10 text-primary"
              />
              <StatusCard
                label="Paused"
                count={counts.paused}
                icon={PauseCircle}
                color="bg-yellow-500/10 text-yellow-400"
              />
              <StatusCard
                label="Past Due"
                count={counts.past_due}
                icon={AlertTriangle}
                color="bg-orange-500/10 text-orange-400"
              />
              <StatusCard
                label="Canceled"
                count={counts.canceled}
                icon={XCircle}
                color="bg-red-500/10 text-red-400"
              />
              <StatusCard
                label="Expired"
                count={counts.expired}
                icon={XCircle}
                color="bg-muted text-muted-foreground"
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !kpis && !error && !needsCompanySelection && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No analytics data available</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Analytics will appear here once you have subscription data.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
