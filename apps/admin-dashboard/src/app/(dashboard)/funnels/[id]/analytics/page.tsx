'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Percent,
  ShoppingCart,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { funnelsApi, FunnelAnalytics, Funnel } from '@/lib/api/funnels';
import { useHierarchy } from '@/contexts/hierarchy-context';

export default function FunnelAnalyticsPage() {
  const params = useParams();
  const id = (params?.id as string) || '';
  const router = useRouter();
  const { selectedCompanyId } = useHierarchy();
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [analytics, setAnalytics] = useState<FunnelAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [funnelData, analyticsData] = await Promise.all([
          funnelsApi.get(id, selectedCompanyId || undefined),
          funnelsApi.getAnalytics(id, selectedCompanyId || undefined, days),
        ]);
        setFunnel(funnelData);
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, selectedCompanyId, days]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (!funnel || !analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Funnel not found</p>
        <Link href="/funnels" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Funnels
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground">
              {funnel.name} - Analytics
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Performance metrics and insights
            </p>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Visits"
          value={analytics.overview.totalVisits.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Sessions"
          value={analytics.overview.totalSessions.toLocaleString()}
          icon={<BarChart3 className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          title="Conversions"
          value={analytics.overview.completedSessions.toLocaleString()}
          icon={<ShoppingCart className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Conversion Rate"
          value={formatPercent(analytics.overview.conversionRate)}
          icon={<Percent className="h-5 w-5" />}
          color="yellow"
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(analytics.overview.totalRevenue)}
          icon={<DollarSign className="h-5 w-5" />}
          color="emerald"
        />
        <StatCard
          title="Avg. Order Value"
          value={formatCurrency(analytics.overview.averageOrderValue)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="indigo"
        />
      </div>

      {/* Stage Performance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">
          Stage Performance
        </h2>
        <div className="space-y-4">
          {analytics.stagePerformance.map((stage, index) => (
            <div key={stage.stageId} className="flex items-center gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 dark:text-foreground">
                    {stage.stageName}
                  </span>
                  <span className="text-sm text-gray-500">
                    {stage.visits.toLocaleString()} visits
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{
                      width: `${analytics.stagePerformance[0].visits > 0 ? (stage.visits / analytics.stagePerformance[0].visits) * 100 : 0}%`,
                    }}
                  />
                </div>
                {stage.dropoffRate > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                    <TrendingDown className="h-3 w-3" />
                    {formatPercent(stage.dropoffRate)} drop-off
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Variant Performance */}
        {analytics.variantPerformance.length > 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">
              A/B Test Performance
            </h2>
            <div className="space-y-4">
              {analytics.variantPerformance.map((variant) => (
                <div
                  key={variant.variantId}
                  className={`p-4 rounded-lg border ${
                    variant.isControl
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-foreground">
                        {variant.variantName}
                      </span>
                      {variant.isControl && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                          Control
                        </span>
                      )}
                    </div>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatPercent(variant.conversionRate)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Sessions</span>
                      <p className="font-medium">{variant.sessions.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Conversions</span>
                      <p className="font-medium">{variant.conversions.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Revenue</span>
                      <p className="font-medium">{formatCurrency(variant.revenue)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Traffic Sources */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">
            Traffic Sources
          </h2>
          <div className="space-y-3">
            {analytics.trafficSources.length > 0 ? (
              analytics.trafficSources.map((source) => (
                <div
                  key={source.source}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-foreground capitalize">
                      {source.source}
                    </p>
                    <p className="text-sm text-gray-500">
                      {source.visits} visits · {source.conversions} conversions
                    </p>
                  </div>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(source.revenue)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No traffic data yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Daily Chart Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">
          Daily Performance
        </h2>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Chart visualization</p>
            <p className="text-sm">Add Recharts or similar library for charts</p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'green' | 'yellow' | 'emerald' | 'indigo';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-foreground">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
    </div>
  );
}
