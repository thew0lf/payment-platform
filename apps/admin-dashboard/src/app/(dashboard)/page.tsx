'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, Receipt, Users, AlertCircle, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { MetricCard } from '@/components/dashboard/metric-card';
import { ProviderStatus } from '@/components/dashboard/provider-status';
import { RoutingSavings } from '@/components/dashboard/routing-savings';
import { TransactionTable } from '@/components/dashboard/transaction-table';
import { TransactionChart } from '@/components/dashboard/transaction-chart';
import { Button } from '@/components/ui/button';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { dashboardApi, DashboardMetrics, ProviderMetrics } from '@/lib/api/dashboard';
import { Transaction } from '@/types/transactions';

export default function DashboardPage() {
  const { selectedCompanyId, selectedClientId } = useHierarchy();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [providers, setProviders] = useState<ProviderMetrics[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [metricsData, providersData, transactionsData] = await Promise.all([
        dashboardApi.getMetrics({ companyId: selectedCompanyId || undefined, clientId: selectedClientId || undefined }),
        dashboardApi.getProviders(selectedCompanyId || undefined),
        dashboardApi.getRecentTransactions({ companyId: selectedCompanyId || undefined, limit: 5 }),
      ]);
      setMetrics(metricsData);
      setProviders(providersData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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

  // Transform providers to the format expected by ProviderStatus component
  const providerStatusData = providers.map(p => ({
    id: p.providerId,
    name: p.providerName,
    type: p.providerType,
    status: p.status,
    volume: p.volume,
    successRate: p.successRate,
  }));

  if (loading) {
    return (
      <>
        <Header
          title="Dashboard"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync
              </Button>
              <Button size="sm" disabled>
                <Plus className="w-4 h-4 mr-2" />
                New Transaction
              </Button>
            </div>
          }
        />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading dashboard...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Dashboard"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Transaction
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue"
            value={metrics?.revenue.total || 0}
            format="currency"
            change={metrics?.revenue.change || 0}
            icon={TrendingUp}
            subtitle="This month"
          />
          <MetricCard
            title="Transactions"
            value={metrics?.transactions.total || 0}
            format="number"
            change={metrics?.transactions.change || 0}
            icon={Receipt}
            subtitle="This month"
          />
          <MetricCard
            title="Active Subscriptions"
            value={metrics?.subscriptions.active || 0}
            format="number"
            change={metrics?.subscriptions.change || 0}
            icon={Users}
            subtitle="Current"
          />
          <MetricCard
            title="Failed Payments"
            value={metrics?.transactions.failed || 0}
            format="number"
            change={0}
            trend={metrics?.transactions.failed ? (metrics.transactions.failed > 0 ? 'up' : 'down') : undefined}
            icon={AlertCircle}
            subtitle="This month"
          />
        </div>

        {/* Providers & Routing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ProviderStatus
              providers={providerStatusData}
              onManageClick={() => console.log('Manage providers')}
            />
          </div>
          <RoutingSavings
            totalSaved={234}
            rules={[
              { name: 'high-value', description: 'High-value → NMI', saved: 156 },
              { name: 'intl', description: 'Intl → PayPal', saved: 78 },
            ]}
          />
        </div>

        {/* Transaction Chart */}
        <TransactionChart
          companyId={selectedCompanyId || undefined}
          clientId={selectedClientId || undefined}
        />

        {/* Transactions */}
        <TransactionTable
          transactions={transactions}
          showCompany={!selectedCompanyId}
          onFilterClick={() => console.log('Filter')}
          onExportClick={() => console.log('Export')}
        />
      </div>
    </>
  );
}
