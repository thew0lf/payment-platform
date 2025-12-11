'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Workflow,
  Users,
  ShoppingCart,
  Target,
  MousePointer,
  Eye,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { apiClient } from '@/lib/api';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface FunnelKPIs {
  totalFunnels: number;
  activeFunnels: number;
  totalSessions: number;
  sessionsChange: number;
  totalConversions: number;
  conversionsChange: number;
  overallConversionRate: number;
  conversionRateChange: number;
  totalRevenue: number;
  revenueChange: number;
  averageOrderValue: number;
}

interface FunnelPerformance {
  id: string;
  name: string;
  sessions: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
}

interface StageDropoff {
  stage: string;
  visitors: number;
  dropoffRate: number;
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

function FunnelTable({ funnels }: { funnels: FunnelPerformance[] }) {
  if (!funnels || funnels.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        No funnels found. <Link href="/funnels" className="text-primary hover:underline">Create your first funnel</Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Funnel</th>
            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Sessions</th>
            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Conversions</th>
            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Conv. Rate</th>
            <th className="text-right py-3 px-4 text-muted-foreground font-medium">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {funnels.map((funnel) => (
            <tr key={funnel.id} className="border-b border-border/50 hover:bg-muted/30">
              <td className="py-3 px-4">
                <Link href={`/funnels/${funnel.id}/analytics`} className="text-foreground hover:text-primary">
                  {funnel.name}
                </Link>
                <span className={cn(
                  'ml-2 text-xs px-1.5 py-0.5 rounded',
                  funnel.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' :
                  funnel.status === 'DRAFT' ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-muted text-muted-foreground'
                )}>
                  {funnel.status}
                </span>
              </td>
              <td className="text-right py-3 px-4 text-foreground">{funnel.sessions.toLocaleString()}</td>
              <td className="text-right py-3 px-4 text-foreground">{funnel.conversions.toLocaleString()}</td>
              <td className="text-right py-3 px-4">
                <span className={cn(
                  funnel.conversionRate >= 3 ? 'text-green-400' :
                  funnel.conversionRate >= 1 ? 'text-yellow-400' : 'text-red-400'
                )}>
                  {funnel.conversionRate.toFixed(1)}%
                </span>
              </td>
              <td className="text-right py-3 px-4 text-foreground">
                ${funnel.revenue.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DropoffVisualization({ stages }: { stages: StageDropoff[] }) {
  if (!stages || stages.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        No stage data available
      </div>
    );
  }

  const maxVisitors = stages[0]?.visitors || 1;

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => (
        <div key={stage.stage} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">{stage.stage}</span>
            <span className="text-muted-foreground">
              {stage.visitors.toLocaleString()} visitors
              {i > 0 && (
                <span className="text-red-400 ml-2">(-{stage.dropoffRate.toFixed(0)}%)</span>
              )}
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                i === stages.length - 1 ? 'bg-green-500' : 'bg-primary'
              )}
              style={{ width: `${(stage.visitors / maxVisitors) * 100}%` }}
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

export default function FunnelAnalyticsPage() {
  const { isLoading: authLoading } = useAuth();
  const { selectedCompanyId, accessLevel, isLoading: hierarchyLoading } = useHierarchy();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<FunnelKPIs | null>(null);
  const [funnels, setFunnels] = useState<FunnelPerformance[]>([]);
  const [stages, setStages] = useState<StageDropoff[]>([]);
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

      // Fetch funnels list
      const funnelsData = await apiClient.get<{ items: any[] }>(
        `/api/funnels?${companyParam}&limit=100`
      );

      const funnelsList = funnelsData.items || [];

      // Calculate aggregate KPIs from funnels
      let totalSessions = 0;
      let totalConversions = 0;
      let totalRevenue = 0;
      const activeFunnels = funnelsList.filter((f: any) => f.status === 'ACTIVE').length;

      const funnelPerformance: FunnelPerformance[] = funnelsList.map((f: any) => {
        const sessions = f._count?.sessions || 0;
        const conversions = f.conversions || 0;
        const revenue = f.revenue || 0;

        totalSessions += sessions;
        totalConversions += conversions;
        totalRevenue += revenue;

        return {
          id: f.id,
          name: f.name,
          sessions,
          conversions,
          conversionRate: sessions > 0 ? (conversions / sessions) * 100 : 0,
          revenue,
          status: f.status,
        };
      });

      setKpis({
        totalFunnels: funnelsList.length,
        activeFunnels,
        totalSessions,
        sessionsChange: 12.5, // Would come from API
        totalConversions,
        conversionsChange: 8.3,
        overallConversionRate: totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0,
        conversionRateChange: 2.1,
        totalRevenue,
        revenueChange: 15.2,
        averageOrderValue: totalConversions > 0 ? totalRevenue / totalConversions : 0,
      });

      setFunnels(funnelPerformance.sort((a, b) => b.revenue - a.revenue));

      // Mock stage data (would come from aggregate analytics)
      setStages([
        { stage: 'Landing', visitors: 10000, dropoffRate: 0 },
        { stage: 'Product Selection', visitors: 6500, dropoffRate: 35 },
        { stage: 'Checkout', visitors: 3200, dropoffRate: 51 },
        { stage: 'Payment', visitors: 2100, dropoffRate: 34 },
        { stage: 'Success', visitors: 1800, dropoffRate: 14 },
      ]);
    } catch (err) {
      console.error('Failed to fetch funnel analytics:', err);
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
        title="Funnel Analytics"
        subtitle="Monitor funnel performance and conversions"
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
              Please select a company from the header to view funnel analytics.
            </p>
          </div>
        )}

        {!needsCompanySelection && kpis && (
          <>
            {/* Main KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <KPICard
                title="Total Sessions"
                value={kpis.totalSessions}
                change={kpis.sessionsChange}
                icon={Eye}
                format="number"
                color="cyan"
              />
              <KPICard
                title="Conversions"
                value={kpis.totalConversions}
                change={kpis.conversionsChange}
                icon={ShoppingCart}
                format="number"
                color="green"
              />
              <KPICard
                title="Conversion Rate"
                value={kpis.overallConversionRate}
                change={kpis.conversionRateChange}
                icon={Target}
                format="percent"
                color={kpis.overallConversionRate >= 3 ? 'green' : 'yellow'}
              />
              <KPICard
                title="Funnel Revenue"
                value={kpis.totalRevenue}
                change={kpis.revenueChange}
                icon={TrendingUp}
                format="currency"
                color="purple"
              />
            </div>

            {/* Secondary row */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <KPICard
                title="Active Funnels"
                value={kpis.activeFunnels}
                icon={Workflow}
                format="number"
                color="cyan"
              />
              <KPICard
                title="Total Funnels"
                value={kpis.totalFunnels}
                icon={Workflow}
                format="number"
                color="purple"
              />
              <KPICard
                title="Avg Order Value"
                value={kpis.averageOrderValue}
                icon={ShoppingCart}
                format="currency"
                color="green"
              />
            </div>

            {/* Funnel Performance Table */}
            <div className="bg-card/50 border border-border rounded-xl p-4">
              <h3 className="text-sm font-medium text-foreground mb-4">Funnel Performance</h3>
              <FunnelTable funnels={funnels} />
            </div>

            {/* Stage Dropoff */}
            <div className="bg-card/50 border border-border rounded-xl p-4">
              <h3 className="text-sm font-medium text-foreground mb-4">Aggregate Stage Dropoff</h3>
              <DropoffVisualization stages={stages} />
            </div>
          </>
        )}

        {!loading && !kpis && !error && !needsCompanySelection && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Workflow className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No funnel data available</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Create your first funnel to start tracking conversions.
            </p>
            <Link
              href="/funnels"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
            >
              Create Funnel
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
