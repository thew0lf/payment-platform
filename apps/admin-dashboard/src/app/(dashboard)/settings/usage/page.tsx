'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  MapPin,
  BarChart3,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  integrationUsageApi,
  UsageSummary,
  MonthlyUsage,
} from '@/lib/api/integration-usage';

// Provider display names
const providerDisplayNames: Record<string, string> = {
  GOOGLE_PLACES: 'Google Places',
  PAYPAL_PAYFLOW: 'PayPal Payflow',
  PAYPAL_REST: 'PayPal REST',
  STRIPE: 'Stripe',
  NMI: 'NMI Gateway',
  AUTHORIZE_NET: 'Authorize.Net',
  TWILIO: 'Twilio',
  SENDGRID: 'SendGrid',
  AWS_SES: 'AWS SES',
  AWS_SNS: 'AWS SNS',
  OPENAI: 'OpenAI',
  CLOUDINARY: 'Cloudinary',
};

// Provider icons
function getProviderIcon(provider: string): string {
  const icons: Record<string, string> = {
    GOOGLE_PLACES: '📍',
    PAYPAL_PAYFLOW: '💳',
    PAYPAL_REST: '💳',
    STRIPE: '💳',
    NMI: '💳',
    AUTHORIZE_NET: '💳',
    TWILIO: '📱',
    SENDGRID: '📧',
    AWS_SES: '📧',
    AWS_SNS: '🔔',
    OPENAI: '🤖',
    CLOUDINARY: '🖼️',
  };
  return icons[provider] || '⚙️';
}

export default function UsageDashboardPage() {
  const { selectedCompanyId } = useHierarchy();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [history, setHistory] = useState<MonthlyUsage[]>([]);

  useEffect(() => {
    loadUsageData();
  }, [selectedCompanyId]);

  const loadUsageData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryData, historyData] = await Promise.all([
        integrationUsageApi.getUsageSummary(selectedCompanyId || undefined),
        integrationUsageApi.getUsageHistory(selectedCompanyId || undefined, 6),
      ]);
      setSummary(summaryData);
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to load usage data:', err);
      setError('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate change percentage
  const getChangePercent = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Usage</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button
          onClick={loadUsageData}
          className="px-4 py-2 bg-blue-600 text-foreground rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const requestChange = summary
    ? getChangePercent(summary.currentMonth.totalRequests, summary.lastMonth.totalRequests)
    : 0;
  const costChange = summary
    ? getChangePercent(summary.currentMonth.totalBillableCost, summary.lastMonth.totalBillableCost)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground">Integration Usage</h1>
          <p className="text-muted-foreground dark:text-muted-foreground">
            Monitor API usage and billing across all integrations
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{summary?.currentMonth.billingPeriod || 'Current Month'}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="bg-white dark:bg-muted rounded-xl border border-border dark:border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
              Total Requests
            </span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-foreground dark:text-foreground">
              {summary?.currentMonth.totalRequests.toLocaleString() || 0}
            </span>
            <div className={`flex items-center gap-1 text-sm ${requestChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {requestChange >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{Math.abs(requestChange)}%</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">vs last month</p>
        </div>

        {/* Billable Amount */}
        <div className="bg-white dark:bg-muted rounded-xl border border-border dark:border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
              Billable Amount
            </span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-foreground dark:text-foreground">
              ${summary?.currentMonth.totalBillableCost.toFixed(2) || '0.00'}
            </span>
            <div className={`flex items-center gap-1 text-sm ${costChange <= 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {costChange <= 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              <span>{Math.abs(costChange)}%</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">vs last month</p>
        </div>

        {/* Base Cost */}
        <div className="bg-white dark:bg-muted rounded-xl border border-border dark:border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
              Base Cost
            </span>
          </div>
          <span className="text-3xl font-bold text-foreground dark:text-foreground">
            ${summary?.currentMonth.totalBaseCost.toFixed(2) || '0.00'}
          </span>
          <p className="mt-2 text-xs text-muted-foreground">Before markup</p>
        </div>

        {/* Active Providers */}
        <div className="bg-white dark:bg-muted rounded-xl border border-border dark:border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
              Active Providers
            </span>
          </div>
          <span className="text-3xl font-bold text-foreground dark:text-foreground">
            {summary?.byProvider.length || 0}
          </span>
          <p className="mt-2 text-xs text-muted-foreground">This billing period</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage by Provider */}
        <div className="bg-white dark:bg-muted rounded-xl border border-border dark:border-border p-6">
          <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-4">
            Usage by Provider
          </h2>
          {summary?.byProvider && summary.byProvider.length > 0 ? (
            <div className="space-y-4">
              {summary.byProvider.map((provider) => (
                <div
                  key={provider.provider}
                  className="flex items-center justify-between p-3 bg-muted/50 dark:bg-card/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getProviderIcon(provider.provider)}</span>
                    <div>
                      <p className="font-medium text-foreground dark:text-foreground">
                        {providerDisplayNames[provider.provider] || provider.provider}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {provider.requestCount.toLocaleString()} requests
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground dark:text-foreground">
                      ${provider.billableCost.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Base: ${provider.baseCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 text-foreground" />
              <p>No usage data for this period</p>
            </div>
          )}
        </div>

        {/* Usage History */}
        <div className="bg-white dark:bg-muted rounded-xl border border-border dark:border-border p-6">
          <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-4">
            Usage History (Last 6 Months)
          </h2>
          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((month) => {
                const maxCost = Math.max(...history.map((h) => h.billableCost), 1);
                const barWidth = (month.billableCost / maxCost) * 100;

                return (
                  <div key={month.period}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-muted-foreground dark:text-foreground">
                        {new Date(month.period + '-01').toLocaleDateString('en-US', {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-muted-foreground">
                        {month.requestCount.toLocaleString()} requests
                      </span>
                    </div>
                    <div className="relative h-8 bg-muted dark:bg-muted rounded-lg overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg transition-all duration-500"
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground dark:text-foreground">
                        ${month.billableCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 text-foreground" />
              <p>No historical data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Endpoints */}
      {summary?.topEndpoints && summary.topEndpoints.length > 0 && (
        <div className="bg-white dark:bg-muted rounded-xl border border-border dark:border-border p-6">
          <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-4">
            Top Endpoints
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-muted-foreground border-b border-border dark:border-border">
                  <th className="pb-3 font-medium">Endpoint</th>
                  <th className="pb-3 font-medium text-right">Request Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border">
                {summary.topEndpoints.map((endpoint, idx) => (
                  <tr key={idx}>
                    <td className="py-3 font-mono text-sm text-muted-foreground dark:text-foreground">
                      {endpoint.endpoint}
                    </td>
                    <td className="py-3 text-right font-medium text-foreground dark:text-foreground">
                      {endpoint.count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100">
              About Integration Usage Billing
            </h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Integration usage is tracked and billed based on API requests. When using platform-provided API keys,
              a 40% markup is applied to the base cost. To reduce costs, you can configure your own API keys
              in Settings → Integrations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
