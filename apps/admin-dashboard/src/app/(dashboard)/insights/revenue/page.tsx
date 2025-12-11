'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  ShoppingCart,
  Repeat,
  ArrowUpRight,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { apiClient } from '@/lib/api';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { useAuth } from '@/contexts/auth-context';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface RevenueKPIs {
  totalRevenue: number;
  revenueChange: number;
  averageOrderValue: number;
  aovChange: number;
  transactionCount: number;
  transactionChange: number;
  subscriptionRevenue: number;
  subscriptionChange: number;
  oneTimeRevenue: number;
  oneTimeChange: number;
  refundedAmount: number;
  refundRate: number;
}

interface RevenueBySource {
  source: string;
  amount: number;
  percentage: number;
  transactions: number;
}

interface RevenueTrend {
  date: string;
  total: number;
  subscriptions: number;
  oneTime: number;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function KPICard({
  title,
  value,
  change,
  icon: Icon,
  format = 'currency',
  color = 'green',
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

  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percent':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString();
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

function RevenueChart({ data }: { data: RevenueTrend[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        No data available
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total));

  return (
    <div className="h-48">
      <div className="flex items-end h-40 gap-1">
        {data.slice(-30).map((point, i) => {
          const totalHeight = (point.total / maxTotal) * 100;
          const subsHeight = (point.subscriptions / maxTotal) * 100;

          return (
            <div key={i} className="flex-1 flex flex-col justify-end" title={`${point.date}: $${point.total.toFixed(0)}`}>
              <div
                className="bg-green-500/30 rounded-t"
                style={{ height: `${(totalHeight - subsHeight)}%` }}
              />
              <div
                className="bg-primary/50 rounded-b"
                style={{ height: `${subsHeight}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary/50" />
          <span className="text-xs text-muted-foreground">Subscriptions</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500/30" />
          <span className="text-xs text-muted-foreground">One-time</span>
        </div>
      </div>
    </div>
  );
}

function SourceBreakdown({ sources }: { sources: RevenueBySource[] }) {
  if (!sources || sources.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        No revenue sources to display
      </div>
    );
  }

  const colors = ['bg-green-500', 'bg-primary', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500'];

  return (
    <div className="space-y-3">
      {sources.map((source, i) => (
        <div key={source.source}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-foreground">{source.source}</span>
            <span className="text-muted-foreground">
              ${source.amount.toLocaleString()} ({source.percentage.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', colors[i % colors.length])}
              style={{ width: `${source.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function RevenueAnalyticsPage() {
  const { isLoading: authLoading } = useAuth();
  const { selectedCompanyId, accessLevel, isLoading: hierarchyLoading } = useHierarchy();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<RevenueKPIs | null>(null);
  const [trend, setTrend] = useState<RevenueTrend[]>([]);
  const [sources, setSources] = useState<RevenueBySource[]>([]);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const needsCompanySelection =
    (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  const fetchData = useCallback(async () => {
    if (authLoading || hierarchyLoading || needsCompanySelection) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const companyParam = selectedCompanyId ? `companyId=${selectedCompanyId}` : '';
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

      // Fetch KPIs - using dashboard stats endpoint
      const statsData = await apiClient.get<any>(
        `/api/dashboard/stats?${companyParam}`
      );

      // Transform dashboard stats to revenue KPIs
      setKpis({
        totalRevenue: statsData.revenue?.total || 0,
        revenueChange: statsData.revenue?.change || 0,
        averageOrderValue: statsData.orders?.averageValue || 0,
        aovChange: statsData.orders?.aovChange || 0,
        transactionCount: statsData.transactions?.total || 0,
        transactionChange: statsData.transactions?.change || 0,
        subscriptionRevenue: statsData.subscriptions?.revenue || 0,
        subscriptionChange: statsData.subscriptions?.change || 0,
        oneTimeRevenue: (statsData.revenue?.total || 0) - (statsData.subscriptions?.revenue || 0),
        oneTimeChange: 0,
        refundedAmount: statsData.refunds?.total || 0,
        refundRate: statsData.refunds?.rate || 0,
      });

      // Fetch trend data from chart endpoint
      const chartData = await apiClient.get<any[]>(
        `/api/dashboard/stats/chart?${companyParam}&days=${days}`
      );

      setTrend(
        chartData.map((d: any) => ({
          date: d.date,
          total: d.amount || 0,
          subscriptions: d.subscriptionAmount || 0,
          oneTime: (d.amount || 0) - (d.subscriptionAmount || 0),
        }))
      );

      // Mock source breakdown for now
      const totalRev = statsData.revenue?.total || 0;
      setSources([
        { source: 'Online Checkout', amount: totalRev * 0.45, percentage: 45, transactions: 0 },
        { source: 'Subscriptions', amount: totalRev * 0.35, percentage: 35, transactions: 0 },
        { source: 'Funnels', amount: totalRev * 0.15, percentage: 15, transactions: 0 },
        { source: 'API', amount: totalRev * 0.05, percentage: 5, transactions: 0 },
      ]);
    } catch (err) {
      console.error('Failed to fetch revenue analytics:', err);
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
        title="Revenue Analytics"
        subtitle="Track revenue performance and trends"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d')}
              className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <button
              onClick={fetchData}
              className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {(loading || authLoading || hierarchyLoading) && !kpis && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}

        {needsCompanySelection && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Building2 className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Select a Company</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Please select a company from the header to view revenue analytics.
            </p>
          </div>
        )}

        {!needsCompanySelection && kpis && (
          <>
            {/* Main KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <KPICard
                title="Total Revenue"
                value={kpis.totalRevenue}
                change={kpis.revenueChange}
                icon={DollarSign}
                format="currency"
                color="green"
              />
              <KPICard
                title="Transactions"
                value={kpis.transactionCount}
                change={kpis.transactionChange}
                icon={CreditCard}
                format="number"
                color="cyan"
              />
              <KPICard
                title="Avg Order Value"
                value={kpis.averageOrderValue}
                change={kpis.aovChange}
                icon={ShoppingCart}
                format="currency"
                color="purple"
              />
              <KPICard
                title="Refund Rate"
                value={kpis.refundRate}
                icon={ArrowUpRight}
                format="percent"
                color={kpis.refundRate > 5 ? 'red' : 'yellow'}
              />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <KPICard
                title="Subscription Revenue"
                value={kpis.subscriptionRevenue}
                change={kpis.subscriptionChange}
                icon={Repeat}
                format="currency"
                color="cyan"
              />
              <KPICard
                title="One-time Revenue"
                value={kpis.oneTimeRevenue}
                change={kpis.oneTimeChange}
                icon={ShoppingCart}
                format="currency"
                color="green"
              />
              <KPICard
                title="Refunded Amount"
                value={kpis.refundedAmount}
                icon={ArrowUpRight}
                format="currency"
                color="red"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card/50 border border-border rounded-xl p-4">
                <h3 className="text-sm font-medium text-foreground mb-4">Revenue Trend</h3>
                <RevenueChart data={trend} />
              </div>

              <div className="bg-card/50 border border-border rounded-xl p-4">
                <h3 className="text-sm font-medium text-foreground mb-4">Revenue by Source</h3>
                <SourceBreakdown sources={sources} />
              </div>
            </div>
          </>
        )}

        {!loading && !kpis && !error && !needsCompanySelection && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No revenue data available</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Revenue analytics will appear here once you have transaction data.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
