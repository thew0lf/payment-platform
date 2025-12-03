'use client';

import { useState, useEffect } from 'react';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  insightsApi,
  paymentPagesApi,
  InsightsSummary,
  CompanyInsightsSummary,
  PaymentPage,
  PageInsight,
  ConversionFunnel,
  INSIGHT_TYPES,
  INSIGHT_CATEGORIES,
  INSIGHT_IMPACTS,
} from '@/lib/api/payment-pages';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  ChevronRight,
  Sparkles,
  ShoppingCart,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════════
// PAYMENT PAGES ANALYTICS DASHBOARD
// ═══════════════════════════════════════════════════════════════

export default function PaymentPagesAnalyticsPage() {
  const { selectedCompanyId, accessLevel } = useHierarchy();
  const [companySummary, setCompanySummary] = useState<CompanyInsightsSummary | null>(null);
  const [pages, setPages] = useState<PaymentPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [pageInsights, setPageInsights] = useState<InsightsSummary | null>(null);
  const [periodDays, setPeriodDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get effective company ID
  const companyId = accessLevel === 'COMPANY' ? undefined : selectedCompanyId || undefined;

  // Load initial data
  useEffect(() => {
    loadData();
  }, [companyId, periodDays]);

  // Load page insights when a page is selected
  useEffect(() => {
    if (selectedPage) {
      loadPageInsights(selectedPage);
    } else {
      setPageInsights(null);
    }
  }, [selectedPage, periodDays]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, pagesData] = await Promise.all([
        insightsApi.getCompanySummary(periodDays, companyId),
        paymentPagesApi.list(companyId, {}, 1, 100),
      ]);
      setCompanySummary(summaryData);
      setPages(pagesData.items);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }

  async function loadPageInsights(pageId: string) {
    setInsightsLoading(true);
    try {
      const data = await insightsApi.getPageInsights(pageId, periodDays, companyId);
      setPageInsights(data);
    } catch (err) {
      console.error('Failed to load page insights:', err);
    } finally {
      setInsightsLoading(false);
    }
  }

  // Helper to format currency
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Helper to format percentage
  function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  // Helper to format time
  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  // Get insight icon
  function getInsightIcon(type: string) {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'suggestion':
        return <Lightbulb className="h-5 w-5 text-blue-400" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Lightbulb className="h-5 w-5 text-zinc-400" />;
    }
  }

  // Get score color
  function getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  }

  // Get score background
  function getScoreBackground(score: number): string {
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-yellow-500/20';
    if (score >= 40) return 'bg-orange-500/20';
    return 'bg-red-500/20';
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-zinc-400 animate-spin" />
          <p className="text-sm text-zinc-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Error Loading Analytics</h2>
          <p className="text-sm text-zinc-400 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Page Analytics</h1>
          <p className="text-sm text-zinc-400 mt-1">
            AI-powered insights and conversion optimization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={loadData}
            className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Company Overview Cards */}
      {companySummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <OverviewCard
            title="Total Revenue"
            value={formatCurrency(companySummary.totalRevenue)}
            icon={<DollarSign className="h-5 w-5 text-green-400" />}
            trend={null}
          />
          <OverviewCard
            title="Conversions"
            value={companySummary.totalConversions.toLocaleString()}
            icon={<ShoppingCart className="h-5 w-5 text-blue-400" />}
            trend={null}
          />
          <OverviewCard
            title="Conversion Rate"
            value={formatPercentage(companySummary.overallConversionRate)}
            icon={<Target className="h-5 w-5 text-purple-400" />}
            trend={companySummary.overallConversionRate > 3.5 ? 'up' : 'down'}
          />
          <OverviewCard
            title="Avg. Optimization Score"
            value={companySummary.averageScore.toString()}
            icon={<Sparkles className="h-5 w-5 text-yellow-400" />}
            trend={companySummary.averageScore >= 60 ? 'up' : 'down'}
            suffix="/100"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Page List */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white">Payment Pages</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select a page to view detailed insights
              </p>
            </div>
            <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
              {pages.length === 0 ? (
                <div className="p-4 text-center text-sm text-zinc-500">
                  No payment pages found
                </div>
              ) : (
                pages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPage(page.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors ${
                      selectedPage === page.id ? 'bg-zinc-800' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{page.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">/{page.slug}</p>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 text-zinc-500 transition-transform ${
                          selectedPage === page.id ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Top Performer */}
          {companySummary?.topPerformer && (
            <div className="mt-4 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-xs font-medium text-green-400 uppercase tracking-wide">
                  Top Performer
                </span>
              </div>
              <p className="text-sm font-medium text-white">
                {companySummary.topPerformer.pageName}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div
                  className={`text-2xl font-bold ${getScoreColor(companySummary.topPerformer.score)}`}
                >
                  {companySummary.topPerformer.score}
                </div>
                <span className="text-xs text-zinc-400">/100 score</span>
              </div>
            </div>
          )}

          {/* Needs Attention */}
          {companySummary?.needsAttention && companySummary.needsAttention.length > 0 && (
            <div className="mt-4 bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-xs font-medium text-red-400 uppercase tracking-wide">
                  Needs Attention
                </span>
              </div>
              <div className="space-y-2">
                {companySummary.needsAttention.map((page) => (
                  <button
                    key={page.pageId}
                    onClick={() => setSelectedPage(page.pageId)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <span className="text-sm text-white">{page.pageName}</span>
                    <span className={`text-sm font-medium ${getScoreColor(page.score)}`}>
                      {page.score}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Insights Detail */}
        <div className="lg:col-span-2">
          {!selectedPage ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
              <BarChart3 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Select a Payment Page
              </h3>
              <p className="text-sm text-zinc-400">
                Choose a payment page from the list to view detailed AI insights and
                optimization recommendations.
              </p>
            </div>
          ) : insightsLoading ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
              <RefreshCw className="h-8 w-8 text-zinc-400 animate-spin mx-auto mb-4" />
              <p className="text-sm text-zinc-400">Loading insights...</p>
            </div>
          ) : pageInsights ? (
            <div className="space-y-4">
              {/* Page Header */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {pageInsights.pageName}
                    </h2>
                    <p className="text-sm text-zinc-400">{pageInsights.period}</p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getScoreBackground(
                        pageInsights.score,
                      )}`}
                    >
                      <Sparkles className={`h-4 w-4 ${getScoreColor(pageInsights.score)}`} />
                      <span className={`text-xl font-bold ${getScoreColor(pageInsights.score)}`}>
                        {pageInsights.score}
                      </span>
                      <span className="text-xs text-zinc-400">/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <MetricCard
                  label="Total Sessions"
                  value={pageInsights.metrics.totalSessions.toLocaleString()}
                  icon={<Users className="h-4 w-4" />}
                />
                <MetricCard
                  label="Conversions"
                  value={pageInsights.metrics.completedSessions.toLocaleString()}
                  icon={<CheckCircle className="h-4 w-4" />}
                />
                <MetricCard
                  label="Conversion Rate"
                  value={formatPercentage(pageInsights.metrics.conversionRate)}
                  icon={<Target className="h-4 w-4" />}
                  trend={pageInsights.metrics.conversionRate > 3.5}
                />
                <MetricCard
                  label="Revenue"
                  value={formatCurrency(pageInsights.metrics.totalRevenue)}
                  icon={<DollarSign className="h-4 w-4" />}
                />
                <MetricCard
                  label="Avg. Order Value"
                  value={formatCurrency(pageInsights.metrics.averageOrderValue)}
                  icon={<CreditCard className="h-4 w-4" />}
                />
                <MetricCard
                  label="Avg. Checkout Time"
                  value={formatTime(pageInsights.metrics.averageTimeToComplete)}
                  icon={<Clock className="h-4 w-4" />}
                  trend={pageInsights.metrics.averageTimeToComplete < 180}
                />
              </div>

              {/* Conversion Funnel */}
              {pageInsights.funnel.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Conversion Funnel</h3>
                  <div className="space-y-3">
                    {pageInsights.funnel.map((stage, index) => (
                      <FunnelStage
                        key={stage.stage}
                        stage={stage}
                        isLast={index === pageInsights.funnel.length - 1}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* AI Insights */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">AI Insights</h3>
                </div>
                <div className="divide-y divide-zinc-800">
                  {pageInsights.insights.length === 0 ? (
                    <div className="p-4 text-center text-sm text-zinc-500">
                      No insights available. Need more session data.
                    </div>
                  ) : (
                    pageInsights.insights.map((insight, index) => (
                      <InsightCard key={index} insight={insight} />
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────

function OverviewCard({
  title,
  value,
  icon,
  trend,
  suffix,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | null;
  suffix?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          {title}
        </span>
        {icon}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white">{value}</span>
        {suffix && <span className="text-sm text-zinc-500">{suffix}</span>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend === 'up' ? (
            <>
              <ArrowUpRight className="h-3 w-3 text-green-400" />
              <span className="text-xs text-green-400">Above average</span>
            </>
          ) : (
            <>
              <ArrowDownRight className="h-3 w-3 text-red-400" />
              <span className="text-xs text-red-400">Below average</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: boolean;
}) {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-zinc-500">{icon}</span>
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-white">{value}</span>
        {trend !== undefined && (
          trend ? (
            <ArrowUpRight className="h-3 w-3 text-green-400" />
          ) : (
            <ArrowDownRight className="h-3 w-3 text-red-400" />
          )
        )}
      </div>
    </div>
  );
}

function FunnelStage({
  stage,
  isLast,
}: {
  stage: ConversionFunnel;
  isLast: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-white">{stage.stage}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">{stage.count.toLocaleString()}</span>
          <span className="text-xs text-zinc-500">({stage.percentage}%)</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              isLast ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${stage.percentage}%` }}
          />
        </div>
        {!isLast && stage.dropOff > 0 && (
          <span className="text-xs text-red-400 whitespace-nowrap">
            -{stage.dropOff}% drop
          </span>
        )}
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: PageInsight }) {
  const typeConfig = INSIGHT_TYPES[insight.type];
  const categoryConfig = INSIGHT_CATEGORIES[insight.category];
  const impactConfig = INSIGHT_IMPACTS[insight.impact];

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${typeConfig.color}`}>
          {insight.type === 'success' && <CheckCircle className="h-4 w-4" />}
          {insight.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
          {insight.type === 'suggestion' && <Lightbulb className="h-4 w-4" />}
          {insight.type === 'critical' && <XCircle className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-white">{insight.title}</h4>
            <span className={`text-xs ${impactConfig.color}`}>{impactConfig.label}</span>
          </div>
          <p className="text-sm text-zinc-400 mb-3">{insight.description}</p>

          {insight.metric && (
            <div className="flex items-center gap-4 mb-3 text-xs">
              <div>
                <span className="text-zinc-500">Current: </span>
                <span className="text-white font-medium">
                  {insight.metric.current}
                  {insight.metric.unit}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Benchmark: </span>
                <span className="text-green-400 font-medium">
                  {insight.metric.benchmark}
                  {insight.metric.unit}
                </span>
              </div>
            </div>
          )}

          {insight.recommendations.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Recommendations
              </p>
              <ul className="space-y-1">
                {insight.recommendations.map((rec, index) => (
                  <li key={index} className="text-xs text-zinc-400 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
