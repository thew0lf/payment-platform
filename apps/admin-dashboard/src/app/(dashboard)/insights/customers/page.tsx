'use client';

import React, { useEffect, useState } from 'react';
import { Users, UserPlus, UserCheck, DollarSign, Loader2, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { customersApi, CustomerStats } from '@/lib/api/customers';
import { dashboardApi, DashboardMetrics } from '@/lib/api/dashboard';

export default function CustomersInsightsPage() {
  const { selectedCompanyId, selectedClientId } = useHierarchy();
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [statsData, metricsData] = await Promise.all([
        customersApi.getStats(),
        dashboardApi.getMetrics({ companyId: selectedCompanyId || undefined, clientId: selectedClientId || undefined }),
      ]);
      setStats(statsData);
      setDashboardMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load customer stats:', error);
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

  if (loading) {
    return (
      <>
        <Header title="Customer Analytics" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading customer data...</span>
          </div>
        </div>
      </>
    );
  }

  const activeRate = stats && stats.totalCustomers > 0
    ? ((stats.activeCustomers / stats.totalCustomers) * 100).toFixed(1)
    : '0';

  return (
    <>
      <Header
        title="Customer Analytics"
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
          {/* Total Customers */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(stats?.totalCustomers || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Active Customers */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(stats?.activeCustomers || 0).toLocaleString()}
              </p>
              <p className="text-xs text-emerald-600 mt-1">{activeRate}% active rate</p>
            </div>
          </div>

          {/* New This Month */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">New This Month</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(stats?.newCustomersThisMonth || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Average LTV */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Lifetime Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats?.averageLifetimeValue || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Customer Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Customer Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">
                {(stats?.totalCustomers || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Customers</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-3xl font-bold text-emerald-600">
                {(stats?.activeCustomers || 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Active</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-3xl font-bold text-gray-400">
                {((stats?.totalCustomers || 0) - (stats?.activeCustomers || 0)).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Inactive</p>
            </div>
          </div>
        </div>

        {/* Activity Progress Bar */}
        {stats && stats.totalCustomers > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Customer Activity
            </h3>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500 dark:text-gray-400">Active vs Inactive</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {activeRate}% Active
                </span>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${activeRate}%` }}
                />
                <div
                  className="h-full bg-gray-400"
                  style={{ width: `${100 - parseFloat(activeRate)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className="text-emerald-600">
                  {(stats.activeCustomers).toLocaleString()} Active
                </span>
                <span className="text-gray-400">
                  {(stats.totalCustomers - stats.activeCustomers).toLocaleString()} Inactive
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Related Metrics from Dashboard */}
        {dashboardMetrics && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Customer Revenue Impact
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(dashboardMetrics.revenue.total)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Revenue per Customer</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(stats && stats.activeCustomers > 0
                    ? dashboardMetrics.revenue.total / stats.activeCustomers
                    : 0
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Subscriptions</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {(dashboardMetrics.subscriptions.active || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Churn Rate</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {(dashboardMetrics.subscriptions.churnRate || 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
