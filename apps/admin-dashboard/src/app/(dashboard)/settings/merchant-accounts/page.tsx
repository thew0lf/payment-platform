'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  RefreshCw,
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Clock,
  BarChart3,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import {
  merchantAccountsApi,
  MerchantAccount,
  AccountStatus,
  PaymentProviderType,
  getStatusColor,
  getHealthColor,
  formatCurrency,
  formatNumber,
  calculateUsagePercentage,
} from '@/lib/api/merchant-accounts';

function StatusBadge({ status }: { status: AccountStatus }) {
  const colors: Record<AccountStatus, string> = {
    [AccountStatus.ACTIVE]: 'bg-green-100 text-green-800',
    [AccountStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
    [AccountStatus.SUSPENDED]: 'bg-orange-100 text-orange-800',
    [AccountStatus.UNDER_REVIEW]: 'bg-orange-100 text-orange-800',
    [AccountStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
    [AccountStatus.CLOSED]: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function HealthIndicator({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const Icon = status === 'healthy' ? CheckCircle : status === 'degraded' ? AlertTriangle : XCircle;
  const colors = {
    healthy: 'text-green-500',
    degraded: 'text-yellow-500',
    down: 'text-red-500',
  };

  return (
    <div className={`flex items-center gap-1 ${colors[status]}`}>
      <Icon className="w-4 h-4" />
      <span className="text-xs capitalize">{status}</span>
    </div>
  );
}

function UsageBar({ current, limit, label }: { current: number; limit?: number; label: string }) {
  const percentage = calculateUsagePercentage(current, limit);
  const barColor = percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span>
          {formatNumber(current)} {limit ? `/ ${formatNumber(limit)}` : ''}
        </span>
      </div>
      {limit && (
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${percentage}%` }} />
        </div>
      )}
    </div>
  );
}

function AccountCard({ account, onRefresh }: { account: MerchantAccount; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: account.color || '#6366f1' }}
            >
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{account.name}</h3>
              <p className="text-sm text-gray-500">
                {account.providerType} - {account.merchantId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HealthIndicator status={account.health.status} />
            <StatusBadge status={account.status} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Today</p>
            <p className="font-semibold">{formatNumber(account.currentUsage.todayTransactionCount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Success Rate</p>
            <p className="font-semibold">{account.health.successRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Volume</p>
            <p className="font-semibold">{formatCurrency(account.currentUsage.todayVolume)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Latency</p>
            <p className="font-semibold">{account.health.avgLatencyMs.toFixed(0)}ms</p>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t p-4 bg-gray-50 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Daily Usage</h4>
              <UsageBar
                current={account.currentUsage.todayTransactionCount}
                limit={account.limits.dailyTransactionLimit}
                label="Transactions"
              />
              <UsageBar
                current={account.currentUsage.todayVolume}
                limit={account.limits.dailyVolumeLimit}
                label="Volume"
              />
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Monthly Usage</h4>
              <UsageBar
                current={account.currentUsage.monthTransactionCount}
                limit={account.limits.monthlyTransactionLimit}
                label="Transactions"
              />
              <UsageBar
                current={account.currentUsage.monthVolume}
                limit={account.limits.monthlyVolumeLimit}
                label="Volume"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Environment</p>
              <p className="font-medium capitalize">{account.environment}</p>
            </div>
            <div>
              <p className="text-gray-500">Priority</p>
              <p className="font-medium">{account.routing.priority}</p>
            </div>
            <div>
              <p className="text-gray-500">Default</p>
              <p className="font-medium">{account.routing.isDefault ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {account.limits.minTransactionAmount && (
            <div className="text-sm">
              <p className="text-gray-500">Transaction Range</p>
              <p className="font-medium">
                {formatCurrency(account.limits.minTransactionAmount)} - {formatCurrency(account.limits.maxTransactionAmount)}
              </p>
            </div>
          )}

          {account.health.lastError && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm font-medium text-red-800">Last Error</p>
              <p className="text-sm text-red-600">{account.health.lastError.message}</p>
              <p className="text-xs text-red-500">
                {new Date(account.health.lastError.timestamp).toLocaleString()}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1" />
              Configure
            </Button>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MerchantAccountsPage() {
  const [accounts, setAccounts] = useState<MerchantAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | AccountStatus>('all');

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filter !== 'all' ? { status: filter } : undefined;
      const { data } = await merchantAccountsApi.list(params);
      setAccounts(data.accounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [filter]);

  const summary = {
    total: accounts.length,
    active: accounts.filter((a) => a.status === AccountStatus.ACTIVE).length,
    healthy: accounts.filter((a) => a.health.status === 'healthy').length,
    totalVolume: accounts.reduce((sum, a) => sum + a.currentUsage.todayVolume, 0),
    totalTransactions: accounts.reduce((sum, a) => sum + a.currentUsage.todayTransactionCount, 0),
  };

  return (
    <>
      <Header
        title="Merchant Accounts"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadAccounts}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Account
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm">Total Accounts</span>
            </div>
            <p className="text-2xl font-semibold">{summary.total}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Active</span>
            </div>
            <p className="text-2xl font-semibold">{summary.active}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-sm">Healthy</span>
            </div>
            <p className="text-2xl font-semibold">{summary.healthy}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Today&apos;s Volume</span>
            </div>
            <p className="text-2xl font-semibold">{formatCurrency(summary.totalVolume)}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Today&apos;s Txns</span>
            </div>
            <p className="text-2xl font-semibold">{formatNumber(summary.totalTransactions)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === AccountStatus.ACTIVE ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(AccountStatus.ACTIVE)}
          >
            Active
          </Button>
          <Button
            variant={filter === AccountStatus.PENDING ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(AccountStatus.PENDING)}
          >
            Pending
          </Button>
          <Button
            variant={filter === AccountStatus.SUSPENDED ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(AccountStatus.SUSPENDED)}
          >
            Suspended
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-medium">Error loading accounts</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading accounts...</span>
          </div>
        )}

        {/* Accounts Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {accounts.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-white rounded-lg border">
                <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Merchant Accounts</h3>
                <p className="text-gray-500 mb-4">
                  Get started by adding your first payment provider account.
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Account
                </Button>
              </div>
            ) : (
              accounts.map((account) => (
                <AccountCard key={account.id} account={account} onRefresh={loadAccounts} />
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
