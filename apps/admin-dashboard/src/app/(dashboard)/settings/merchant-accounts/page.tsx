'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  ChevronDown,
  DollarSign,
  Shield,
  GitBranch,
  Gauge,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { useHierarchy } from '@/contexts/hierarchy-context';
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
import { LimitsModal, FeesModal, RestrictionsModal, RoutingModal } from '@/components/merchant-accounts';

function StatusBadge({ status }: { status: AccountStatus }) {
  const colors: Record<AccountStatus, string> = {
    [AccountStatus.ACTIVE]: 'bg-green-500/20 text-green-400',
    [AccountStatus.PENDING]: 'bg-yellow-500/20 text-yellow-400',
    [AccountStatus.SUSPENDED]: 'bg-orange-500/20 text-orange-400',
    [AccountStatus.UNDER_REVIEW]: 'bg-orange-500/20 text-orange-400',
    [AccountStatus.INACTIVE]: 'bg-muted/500/20 text-muted-foreground',
    [AccountStatus.CLOSED]: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-muted/500/20 text-muted-foreground'}`}>
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
  const barColor = percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-primary';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>
          {formatNumber(current)} {limit ? `/ ${formatNumber(limit)}` : ''}
        </span>
      </div>
      {limit && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${percentage}%` }} />
        </div>
      )}
    </div>
  );
}

type ModalType = 'limits' | 'fees' | 'restrictions' | 'routing';

function ConfigureDropdown({ onSelect }: { onSelect: (type: ModalType) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { type: 'limits' as const, label: 'Limits', icon: Gauge, description: 'Transaction & volume limits' },
    { type: 'fees' as const, label: 'Fees', icon: DollarSign, description: 'Fee structure configuration' },
    { type: 'restrictions' as const, label: 'Restrictions', icon: Shield, description: 'Currency & geographic rules' },
    { type: 'routing' as const, label: 'Routing', icon: GitBranch, description: 'Priority & weight settings' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <Settings className="w-4 h-4 mr-1" />
        Configure
        <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg z-20 overflow-hidden">
          {options.map(({ type, label, icon: Icon, description }) => (
            <button
              key={type}
              type="button"
              className="w-full px-3 py-2.5 flex items-start gap-3 hover:bg-muted transition-colors text-left"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onSelect(type);
              }}
            >
              <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="block text-sm text-foreground font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{description}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface AccountCardProps {
  account: MerchantAccount;
  onRefresh: () => void;
  onConfigure: (type: ModalType) => void;
}

function AccountCard({ account, onRefresh, onConfigure }: AccountCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card/50 border border-border rounded-lg hover:border-border transition-colors">
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
              <CreditCard className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">{account.name}</h3>
              <p className="text-sm text-muted-foreground">
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
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="font-semibold text-foreground">{formatNumber(account.currentUsage.todayTransactionCount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Success Rate</p>
            <p className="font-semibold text-foreground">{account.health.successRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Volume</p>
            <p className="font-semibold text-foreground">{formatCurrency(account.currentUsage.todayVolume)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Latency</p>
            <p className="font-semibold text-foreground">{account.health.avgLatencyMs.toFixed(0)}ms</p>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 bg-muted/30 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Daily Usage</h4>
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
              <h4 className="text-sm font-medium text-foreground">Monthly Usage</h4>
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
              <p className="text-muted-foreground">Environment</p>
              <p className="font-medium text-foreground capitalize">{account.environment}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Priority</p>
              <p className="font-medium text-foreground">{account.routing.priority}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Default</p>
              <p className="font-medium text-foreground">{account.routing.isDefault ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {account.limits.minTransactionAmount && (
            <div className="text-sm">
              <p className="text-muted-foreground">Transaction Range</p>
              <p className="font-medium text-foreground">
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
            <ConfigureDropdown onSelect={onConfigure} />
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onRefresh(); }}>
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
  const router = useRouter();
  const { accessLevel } = useHierarchy();
  const [accounts, setAccounts] = useState<MerchantAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | AccountStatus>('all');
  const [selectedAccount, setSelectedAccount] = useState<MerchantAccount | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);

  // Organization level goes to /integrations, clients/companies go to /settings/integrations
  const integrationsPath = accessLevel === 'ORGANIZATION' ? '/integrations' : '/settings/integrations';

  const handleConfigure = (account: MerchantAccount, type: ModalType) => {
    setSelectedAccount(account);
    setActiveModal(type);
  };

  const handleModalClose = () => {
    setActiveModal(null);
    setSelectedAccount(null);
  };

  const handleModalSaved = () => {
    loadAccounts();
  };

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
            <Button variant="outline" size="sm" onClick={() => router.push('/settings/merchant-accounts/test-checkout')}>
              <Activity className="w-4 h-4 mr-2" />
              Run Transaction
            </Button>
            <Button size="sm" onClick={() => router.push(integrationsPath)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Integration
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card/50 rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm">Total Accounts</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{summary.total}</p>
          </div>
          <div className="bg-card/50 rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Active</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{summary.active}</p>
          </div>
          <div className="bg-card/50 rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-sm">Healthy</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{summary.healthy}</p>
          </div>
          <div className="bg-card/50 rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Today&apos;s Volume</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{formatCurrency(summary.totalVolume)}</p>
          </div>
          <div className="bg-card/50 rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 text-indigo-400 mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Today&apos;s Txns</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{formatNumber(summary.totalTransactions)}</p>
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
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading accounts...</span>
          </div>
        )}

        {/* Accounts Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {accounts.length === 0 ? (
              <div className="col-span-2 text-center py-12 bg-card/50 rounded-lg border border-border">
                <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Merchant Accounts</h3>
                <p className="text-muted-foreground mb-4">
                  Merchant accounts are created when you add payment gateway integrations.
                </p>
                <Button onClick={() => router.push(integrationsPath)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Integration
                </Button>
              </div>
            ) : (
              accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onRefresh={loadAccounts}
                  onConfigure={(type) => handleConfigure(account, type)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Configuration Modals */}
      {selectedAccount && (
        <>
          <LimitsModal
            isOpen={activeModal === 'limits'}
            onClose={handleModalClose}
            account={selectedAccount}
            onSaved={handleModalSaved}
          />
          <FeesModal
            isOpen={activeModal === 'fees'}
            onClose={handleModalClose}
            account={selectedAccount}
            onSaved={handleModalSaved}
          />
          <RestrictionsModal
            isOpen={activeModal === 'restrictions'}
            onClose={handleModalClose}
            account={selectedAccount}
            onSaved={handleModalSaved}
          />
          <RoutingModal
            isOpen={activeModal === 'routing'}
            onClose={handleModalClose}
            account={selectedAccount}
            onSaved={handleModalSaved}
          />
        </>
      )}
    </>
  );
}
