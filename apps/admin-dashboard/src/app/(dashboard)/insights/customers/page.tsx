'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  UserPlus,
  UserCheck,
  DollarSign,
  Clock,
  Activity,
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

interface CustomerKPIs {
  totalCustomers: number;
  customersChange: number;
  newCustomers: number;
  newChange: number;
  activeCustomers: number;
  activeChange: number;
  averageLTV: number;
  ltvChange: number;
  retentionRate: number;
  retentionChange: number;
  churnedCustomers: number;
  churnRate: number;
}

interface CustomerSegment {
  segment: string;
  count: number;
  percentage: number;
  revenue: number;
}

interface CustomerGrowth {
  date: string;
  total: number;
  new: number;
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

function GrowthChart({ data }: { data: CustomerGrowth[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
        No data available
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total));

  return (
    <div className="h-40">
      <div className="flex items-end h-32 gap-1">
        {data.slice(-30).map((point, i) => {
          const height = (point.total / maxTotal) * 100;
          return (
            <div
              key={i}
              className="flex-1 bg-primary/40 rounded-t hover:bg-primary/60 transition-colors"
              style={{ height: `${Math.max(height, 3)}%` }}
              title={`${point.date}: ${point.total.toLocaleString()} customers`}
            />
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">Customer growth over time</p>
    </div>
  );
}

function SegmentBreakdown({ segments }: { segments: CustomerSegment[] }) {
  if (!segments || segments.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        No segment data available
      </div>
    );
  }

  const colors = ['bg-primary', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500'];

  return (
    <div className="space-y-4">
      {segments.map((segment, i) => (
        <div key={segment.segment} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground font-medium">{segment.segment}</span>
            <div className="text-muted-foreground">
              <span className="text-foreground">{segment.count.toLocaleString()}</span>
              <span className="mx-2">•</span>
              <span>${segment.revenue.toLocaleString()} revenue</span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', colors[i % colors.length])}
              style={{ width: `${segment.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RetentionGrid() {
  // Mock cohort retention data
  const cohorts = [
    { month: 'Oct', m0: 100, m1: 82, m2: 75, m3: 68, m4: 65 },
    { month: 'Nov', m0: 100, m1: 85, m2: 78, m3: 71 },
    { month: 'Dec', m0: 100, m1: 88, m2: 80 },
    { month: 'Jan', m0: 100, m1: 84 },
    { month: 'Feb', m0: 100 },
  ];

  const getColor = (val: number) => {
    if (val >= 80) return 'bg-green-500/30 text-green-400';
    if (val >= 60) return 'bg-yellow-500/30 text-yellow-400';
    return 'bg-red-500/30 text-red-400';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Cohort</th>
            <th className="text-center py-2 px-3 text-muted-foreground font-medium">M0</th>
            <th className="text-center py-2 px-3 text-muted-foreground font-medium">M1</th>
            <th className="text-center py-2 px-3 text-muted-foreground font-medium">M2</th>
            <th className="text-center py-2 px-3 text-muted-foreground font-medium">M3</th>
            <th className="text-center py-2 px-3 text-muted-foreground font-medium">M4</th>
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr key={cohort.month}>
              <td className="py-2 px-3 text-foreground font-medium">{cohort.month}</td>
              {[cohort.m0, cohort.m1, cohort.m2, cohort.m3, cohort.m4].map((val, i) => (
                <td key={i} className="py-2 px-3 text-center">
                  {val !== undefined ? (
                    <span className={cn('px-2 py-1 rounded text-xs font-medium', getColor(val))}>
                      {val}%
                    </span>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function CustomerAnalyticsPage() {
  const { isLoading: authLoading } = useAuth();
  const { selectedCompanyId, accessLevel, isLoading: hierarchyLoading } = useHierarchy();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<CustomerKPIs | null>(null);
  const [growth, setGrowth] = useState<CustomerGrowth[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
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

      // Fetch customer stats
      const statsData = await apiClient.get<any>(
        `/api/customers/stats?${companyParam}`
      );

      setKpis({
        totalCustomers: statsData.total || 0,
        customersChange: statsData.change || 0,
        newCustomers: statsData.newThisMonth || 0,
        newChange: statsData.newChange || 0,
        activeCustomers: statsData.active || 0,
        activeChange: statsData.activeChange || 0,
        averageLTV: statsData.averageLTV || 0,
        ltvChange: statsData.ltvChange || 0,
        retentionRate: statsData.retentionRate || 85,
        retentionChange: statsData.retentionChange || 0,
        churnedCustomers: statsData.churned || 0,
        churnRate: statsData.churnRate || 0,
      });

      // Mock growth data
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const mockGrowth: CustomerGrowth[] = [];
      const baseCustomers = statsData.total || 100;
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        mockGrowth.push({
          date: date.toISOString().split('T')[0],
          total: Math.floor(baseCustomers * (1 - (i / days) * 0.2)),
          new: Math.floor(Math.random() * 10) + 1,
        });
      }
      setGrowth(mockGrowth);

      // Mock segments
      setSegments([
        { segment: 'VIP (>$1000)', count: Math.floor(baseCustomers * 0.05), percentage: 5, revenue: 50000 },
        { segment: 'Regular ($100-$1000)', count: Math.floor(baseCustomers * 0.25), percentage: 25, revenue: 75000 },
        { segment: 'Occasional ($10-$100)', count: Math.floor(baseCustomers * 0.40), percentage: 40, revenue: 40000 },
        { segment: 'New (<$10)', count: Math.floor(baseCustomers * 0.30), percentage: 30, revenue: 5000 },
      ]);
    } catch (err) {
      console.error('Failed to fetch customer analytics:', err);
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
        title="Customer Analytics"
        subtitle="Understand customer behavior and value"
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
              Please select a company from the header to view customer analytics.
            </p>
          </div>
        )}

        {!needsCompanySelection && kpis && (
          <>
            {/* Main KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <KPICard
                title="Total Customers"
                value={kpis.totalCustomers}
                change={kpis.customersChange}
                icon={Users}
                format="number"
                color="cyan"
              />
              <KPICard
                title="New Customers"
                value={kpis.newCustomers}
                change={kpis.newChange}
                icon={UserPlus}
                format="number"
                color="green"
              />
              <KPICard
                title="Active Customers"
                value={kpis.activeCustomers}
                change={kpis.activeChange}
                icon={UserCheck}
                format="number"
                color="purple"
              />
              <KPICard
                title="Avg. Lifetime Value"
                value={kpis.averageLTV}
                change={kpis.ltvChange}
                icon={DollarSign}
                format="currency"
                color="green"
              />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <KPICard
                title="Retention Rate"
                value={kpis.retentionRate}
                change={kpis.retentionChange}
                icon={Activity}
                format="percent"
                color={kpis.retentionRate >= 80 ? 'green' : 'yellow'}
              />
              <KPICard
                title="Churned Customers"
                value={kpis.churnedCustomers}
                icon={Clock}
                format="number"
                color="red"
              />
              <KPICard
                title="Churn Rate"
                value={kpis.churnRate}
                icon={TrendingDown}
                format="percent"
                color={kpis.churnRate <= 5 ? 'green' : 'red'}
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card/50 border border-border rounded-xl p-4">
                <h3 className="text-sm font-medium text-foreground mb-4">Customer Growth</h3>
                <GrowthChart data={growth} />
              </div>

              <div className="bg-card/50 border border-border rounded-xl p-4">
                <h3 className="text-sm font-medium text-foreground mb-4">Customer Segments</h3>
                <SegmentBreakdown segments={segments} />
              </div>
            </div>

            {/* Retention Cohort */}
            <div className="bg-card/50 border border-border rounded-xl p-4">
              <h3 className="text-sm font-medium text-foreground mb-4">Retention Cohorts</h3>
              <RetentionGrid />
            </div>
          </>
        )}

        {!loading && !kpis && !error && !needsCompanySelection && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No customer data available</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Customer analytics will appear here once you have customer data.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
