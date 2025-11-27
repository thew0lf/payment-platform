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
    [AccountStatus.ACTIVE]: 'bg-green-500/20 text-green-400',
    [AccountStatus.PENDING]: 'bg-yellow-500/20 text-yellow-400',
    [AccountStatus.SUSPENDED]: 'bg-orange-500/20 text-orange-400',
    [AccountStatus.UNDER_REVIEW]: 'bg-orange-500/20 text-orange-400',
    [AccountStatus.INACTIVE]: 'bg-zinc-500/20 text-zinc-400',
    [AccountStatus.CLOSED]: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-zinc-500/20 text-zinc-400'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function HealthIndicator({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const Icon = status === 'healthy' ? CheckCircle : status === 'degraded' ? AlertTriangle : XCircle;
  const colors = {
    healthy: 'text-green-400',
    degraded: 'text-yellow-400',
    down: 'text-red-400',
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
  const barColor = percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-cyan-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span>
          {formatNumber(current)} {limit ? `/ ${formatNumber(limit)}` : ''}
        </span>
      </div>
      {limit && (
        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${percentage}%` }} />
        </div>
      )}
    </div>
  );
}

function AccountCard({ account, onRefresh }: { account: MerchantAccount; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
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
              <h3 className="font-medium text-white">{account.name}</h3>
              <p className="text-sm text-zinc-400">
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
            <p className="text-xs text-zinc-500">Today</p>
            <p className="font-semibold text-white">{formatNumber(account.currentUsage.todayTransactionCount)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Success Rate</p>
            <p className="font-semibold text-white">{account.health.successRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Volume</p>
            <p className="font-semibold text-white">{formatCurrency(account.currentUsage.todayVolume)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Latency</p>
            <p className="font-semibold text-white">{account.health.avgLatencyMs.toFixed(0)}ms</p>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-800/30 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-zinc-300">Daily Usage</h4>
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
              <h4 className="text-sm font-medium text-zinc-300">Monthly Usage</h4>
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
              <p className="text-zinc-500">Environment</p>
              <p className="font-medium text-white capitalize">{account.environment}</p>
            </div>
            <div>
              <p className="text-zinc-500">Priority</p>
              <p className="font-medium text-white">{account.routing.priority}</p>
            </div>
            <div>
              <p className="text-zinc-500">Default</p>
              <p className="font-medium text-white">{account.routing.isDefault ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {account.limits.minTransactionAmount && (
            <div className="text-sm">
              <p className="text-zinc-500">Transaction Range</p>
              <p className="font-medium text-white">
                {formatCurrency(account.limits.minTransactionAmount)} - {formatCurrency(account.limits.maxTransactionAmount)}
              </p>
            </div>
          )}

          {account.health.lastError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
              <p className="text-sm font-medium text-red-400">Last Error</p>
              <p className="text-sm text-red-300">{account.health.lastError.message}</p>
              <p className="text-xs text-red-400/70">
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
          <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm">Total Accounts</span>
            </div>
            <p className="text-2xl font-semibold text-white">{summary.total}</p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Active</span>
            </div>
            <p className="text-2xl font-semibold text-white">{summary.active}</p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-cyan-400 mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-sm">Healthy</span>
            </div>
            <p className="text-2xl font-semibold text-white">{summary.healthy}</p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Today&apos;s Volume</span>
            </div>
            <p className="text-2xl font-semibold text-white">{formatCurrency(summary.totalVolume)}</p>
          </div>
          <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Today&apos;s Txns</span>
            </div>
            <p className="text-2xl font-semibold text-white">{formatNumber(summary.totalTransactions)}</p>
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
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
            <p className="font-medium">Error loading accounts</p>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
            <span className="ml-2 text-zinc-500">Loading accounts...</span>
          </div>
        )}

        {/* Accounts Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {accounts.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <CreditCard className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Merchant Accounts</h3>
                <p className="text-zinc-400 mb-4">
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
