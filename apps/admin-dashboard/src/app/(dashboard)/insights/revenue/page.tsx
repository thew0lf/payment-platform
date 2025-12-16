'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Loader2, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { dashboardApi, DashboardMetrics, ChartResponse } from '@/lib/api/dashboard';
import { TransactionChart } from '@/components/dashboard/transaction-chart';

export default function RevenueInsightsPage() {
  const { selectedCompanyId, selectedClientId } = useHierarchy();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [metricsData, chartResponse] = await Promise.all([
        dashboardApi.getMetrics({ companyId: selectedCompanyId || undefined, clientId: selectedClientId || undefined }),
        dashboardApi.getChartData({ days: 30, companyId: selectedCompanyId || undefined, clientId: selectedClientId || undefined }),
      ]);
      setMetrics(metricsData);
      setChartData(chartResponse);
    } catch (error) {
      console.error('Failed to load revenue data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [selectedCompanyId, selectedClientId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <>
        <Header title="Revenue Analytics" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading revenue data...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Revenue Analytics"
        actions={
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Revenue */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              {metrics?.revenue.change !== undefined && (
                <div className={`flex items-center gap-1 text-sm ${
                  metrics.revenue.change >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {metrics.revenue.change >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {formatPercent(metrics.revenue.change)}
                </div>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(metrics?.revenue.total || 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{metrics?.revenue.period || 'This month'}</p>
            </div>
          </div>

          {/* Transaction Volume */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              {metrics?.transactions.change !== undefined && (
                <div className={`flex items-center gap-1 text-sm ${
                  metrics.transactions.change >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {metrics.transactions.change >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {formatPercent(metrics.transactions.change)}
                </div>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(metrics?.transactions.total || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">This month</p>
            </div>
          </div>

          {/* Average Daily Volume */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Daily Volume</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(chartData?.summary.avgDailyVolume || 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(chartData?.summary.successRate || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <TransactionChart
          companyId={selectedCompanyId || undefined}
          clientId={selectedClientId || undefined}
        />

        {/* Summary Stats */}
        {chartData && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              30-Day Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Volume</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(chartData.summary.totalVolume)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Transactions</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {chartData.summary.totalTransactions.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Successful</p>
                <p className="text-xl font-semibold text-emerald-600">
                  {chartData.summary.successfulTransactions.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
                <p className="text-xl font-semibold text-red-600">
                  {chartData.summary.failedTransactions.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
