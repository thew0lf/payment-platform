'use client';

import React from 'react';
import { TrendingUp, Receipt, Users, AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { MetricCard } from '@/components/dashboard/metric-card';
import { ProviderStatus } from '@/components/dashboard/provider-status';
import { RoutingSavings } from '@/components/dashboard/routing-savings';
import { TransactionTable } from '@/components/dashboard/transaction-table';
import { TransactionChart } from '@/components/dashboard/transaction-chart';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { Transaction } from '@/types/transactions';

// Mock data - replace with API calls
const mockMetrics = {
  revenue: { total: 127832, change: 12.5 },
  transactions: { total: 4234, change: 8.2 },
  subscriptions: { active: 1423, change: 3.1 },
  failed: { count: 34, change: -2.3 },
};

const mockProviders = [
  { id: 'pp1', name: 'PayPal Payflow', type: 'PAYFLOW', status: 'healthy' as const, volume: 47832, successRate: 99.2 },
  { id: 'pp2', name: 'Stripe', type: 'STRIPE', status: 'healthy' as const, volume: 62450, successRate: 99.5 },
  { id: 'pp3', name: 'NMI', type: 'NMI', status: 'degraded' as const, volume: 17550, successRate: 97.8 },
];

const mockTransactions: Transaction[] = [
  {
    id: 'txn_1',
    companyId: 'company_1',
    transactionNumber: 'txn_1N2k3L',
    type: 'CHARGE',
    amount: 26.95,
    currency: 'USD',
    status: 'COMPLETED',
    riskFlags: [],
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
    customer: { id: 'c1', email: 'sarah@example.com', firstName: 'Sarah', lastName: 'Chen' },
    company: { id: 'company_1', name: 'CoffeeCo', slug: 'coffeeco' },
    paymentProvider: { id: 'pp1', name: 'PayPal Payflow', type: 'PAYFLOW' },
  },
  {
    id: 'txn_2',
    companyId: 'company_2',
    transactionNumber: 'txn_1N2k3M',
    type: 'CHARGE',
    amount: 49.99,
    currency: 'USD',
    status: 'COMPLETED',
    riskFlags: [],
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
    customer: { id: 'c2', email: 'mike@example.com', firstName: 'Mike', lastName: 'Torres' },
    company: { id: 'company_2', name: 'FitBox', slug: 'fitbox' },
    paymentProvider: { id: 'pp2', name: 'Stripe', type: 'STRIPE' },
  },
  {
    id: 'txn_3',
    companyId: 'company_3',
    transactionNumber: 'txn_1N2k3N',
    type: 'CHARGE',
    amount: 34.95,
    currency: 'USD',
    status: 'PENDING',
    riskFlags: [],
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
    customer: { id: 'c3', email: 'jen@example.com', firstName: 'Jen', lastName: 'Lee' },
    company: { id: 'company_3', name: 'PetPals', slug: 'petpals' },
    paymentProvider: { id: 'pp3', name: 'NMI', type: 'NMI' },
  },
  {
    id: 'txn_4',
    companyId: 'company_1',
    transactionNumber: 'txn_1N2k3O',
    type: 'CHARGE',
    amount: 26.95,
    currency: 'USD',
    status: 'COMPLETED',
    riskFlags: [],
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
    customer: { id: 'c4', email: 'alex@example.com', firstName: 'Alex', lastName: 'Kim' },
    company: { id: 'company_1', name: 'CoffeeCo', slug: 'coffeeco' },
    paymentProvider: { id: 'pp1', name: 'PayPal Payflow', type: 'PAYFLOW' },
  },
  {
    id: 'txn_5',
    companyId: 'company_2',
    transactionNumber: 'txn_1N2k3P',
    type: 'CHARGE',
    amount: 99.99,
    currency: 'USD',
    status: 'FAILED',
    failureReason: 'Card declined',
    riskFlags: [],
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
    customer: { id: 'c5', email: 'chris@example.com', firstName: 'Chris', lastName: 'Wong' },
    company: { id: 'company_2', name: 'FitBox', slug: 'fitbox' },
    paymentProvider: { id: 'pp2', name: 'Stripe', type: 'STRIPE' },
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedCompanyId, selectedClientId, availableCompanies } = useHierarchy();

  // Filter transactions based on hierarchy selection
  const filteredTransactions = React.useMemo(() => {
    let result = [...mockTransactions];

    if (selectedCompanyId) {
      result = result.filter(t => t.companyId === selectedCompanyId);
    } else if (selectedClientId) {
      const clientCompanyIds = availableCompanies
        .filter(c => c.clientId === selectedClientId)
        .map(c => c.id);
      result = result.filter(t => clientCompanyIds.includes(t.companyId));
    }

    return result;
  }, [selectedCompanyId, selectedClientId, availableCompanies]);

  // Adjust metrics based on selection (mock calculation)
  const adjustedMetrics = React.useMemo(() => {
    const factor = selectedCompanyId ? 0.33 : selectedClientId ? 0.6 : 1;
    return {
      revenue: { total: Math.floor(mockMetrics.revenue.total * factor), change: mockMetrics.revenue.change },
      transactions: { total: Math.floor(mockMetrics.transactions.total * factor), change: mockMetrics.transactions.change },
      subscriptions: { active: Math.floor(mockMetrics.subscriptions.active * factor), change: mockMetrics.subscriptions.change },
      failed: { count: Math.floor(mockMetrics.failed.count * factor), change: mockMetrics.failed.change },
    };
  }, [selectedCompanyId, selectedClientId]);

  return (
    <>
      <Header
        title="Dashboard"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
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
            value={adjustedMetrics.revenue.total}
            format="currency"
            change={adjustedMetrics.revenue.change}
            icon={TrendingUp}
            subtitle="This month"
          />
          <MetricCard
            title="Transactions"
            value={adjustedMetrics.transactions.total}
            format="number"
            change={adjustedMetrics.transactions.change}
            icon={Receipt}
            subtitle="This month"
          />
          <MetricCard
            title="Active Subscriptions"
            value={adjustedMetrics.subscriptions.active}
            format="number"
            change={adjustedMetrics.subscriptions.change}
            icon={Users}
            subtitle="Current"
          />
          <MetricCard
            title="Failed Payments"
            value={adjustedMetrics.failed.count}
            format="number"
            change={adjustedMetrics.failed.change}
            trend={adjustedMetrics.failed.change < 0 ? 'down' : 'up'}
            icon={AlertCircle}
            subtitle="Needs attention"
          />
        </div>

        {/* Providers & Routing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ProviderStatus
              providers={mockProviders}
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
          transactions={filteredTransactions}
          showCompany={!selectedCompanyId}
          onFilterClick={() => console.log('Filter')}
          onExportClick={() => console.log('Export')}
        />
      </div>
    </>
  );
}
