# Implementation Part 5: Dashboard Components

## File: apps/admin-dashboard/src/components/dashboard/metric-card.tsx

```typescript
'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  subtitle?: string;
  format?: 'currency' | 'number' | 'percent' | 'none';
  currency?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel = 'vs last month',
  icon: Icon,
  subtitle,
  format = 'none',
  currency = 'USD',
  trend,
  className,
}: MetricCardProps) {
  // Format value
  let displayValue = value;
  if (typeof value === 'number') {
    switch (format) {
      case 'currency':
        displayValue = formatCurrency(value, currency);
        break;
      case 'number':
        displayValue = formatNumber(value);
        break;
      case 'percent':
        displayValue = `${value.toFixed(1)}%`;
        break;
    }
  }

  // Determine trend direction
  const trendDirection = trend || (change !== undefined ? (change >= 0 ? 'up' : 'down') : 'neutral');
  const isPositiveTrend = trendDirection === 'up';

  return (
    <div className={cn(
      "bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all hover:bg-zinc-900/80",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-zinc-500 text-sm font-medium">{title}</p>
          <p className="text-2xl font-semibold text-white mt-1">{displayValue}</p>
          {subtitle && <p className="text-zinc-600 text-xs mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-2 bg-zinc-800 rounded-lg">
            <Icon className="w-5 h-5 text-zinc-400" />
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className={cn(
          "flex items-center gap-1 mt-3 text-sm",
          isPositiveTrend ? "text-emerald-400" : "text-red-400"
        )}>
          {isPositiveTrend ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
          <span>{Math.abs(change).toFixed(1)}%</span>
          <span className="text-zinc-600">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}
```

---

## File: apps/admin-dashboard/src/components/dashboard/provider-status.tsx

```typescript
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { PaymentProvider } from '@/types/hierarchy';

interface ProviderStatusProps {
  providers: Array<{
    id: string;
    name: string;
    type: string;
    status: 'healthy' | 'degraded' | 'down';
    volume: number;
    successRate?: number;
  }>;
  onManageClick?: () => void;
}

export function ProviderStatus({ providers, onManageClick }: ProviderStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-emerald-400';
      case 'degraded': return 'bg-amber-400';
      case 'down': return 'bg-red-400';
      default: return 'bg-zinc-400';
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(2)}`;
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-white">Payment Providers</h2>
        {onManageClick && (
          <button
            onClick={onManageClick}
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            Manage
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {providers.map(provider => (
          <div
            key={provider.id}
            className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">{provider.name}</span>
              <span className={cn(
                "w-2 h-2 rounded-full",
                getStatusColor(provider.status)
              )} />
            </div>
            <p className="text-lg font-semibold text-white">
              {formatVolume(provider.volume)}
            </p>
            {provider.successRate !== undefined && (
              <p className="text-xs text-zinc-500">
                {provider.successRate.toFixed(1)}% success rate
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## File: apps/admin-dashboard/src/components/dashboard/routing-savings.tsx

```typescript
'use client';

import React from 'react';
import { GitBranch } from 'lucide-react';

interface RoutingSavingsProps {
  totalSaved: number;
  period?: string;
  rules?: Array<{
    name: string;
    description: string;
    saved: number;
  }>;
}

export function RoutingSavings({ totalSaved, period = 'this month', rules = [] }: RoutingSavingsProps) {
  return (
    <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-medium text-white">Smart Routing</h2>
      </div>
      <p className="text-3xl font-bold text-white mb-1">
        ${totalSaved.toLocaleString()}
      </p>
      <p className="text-sm text-zinc-400 mb-4">Saved in fees {period}</p>
      
      {rules.length > 0 && (
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">{rule.description}</span>
              <span className="text-emerald-400">-${rule.saved}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## File: apps/admin-dashboard/src/components/dashboard/transaction-table.tsx

```typescript
'use client';

import React from 'react';
import Link from 'next/link';
import { MoreHorizontal, Filter, Download, Check, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Transaction, TransactionStatus } from '@/types/transactions';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

interface TransactionTableProps {
  transactions: Transaction[];
  showCompany?: boolean;
  onFilterClick?: () => void;
  onExportClick?: () => void;
}

const statusConfig: Record<TransactionStatus, {
  label: string;
  variant: 'success' | 'warning' | 'destructive' | 'info' | 'default';
  icon: React.ComponentType<{ className?: string }>;
}> = {
  COMPLETED: { label: 'Succeeded', variant: 'success', icon: Check },
  PENDING: { label: 'Pending', variant: 'warning', icon: Clock },
  PROCESSING: { label: 'Processing', variant: 'info', icon: Clock },
  FAILED: { label: 'Failed', variant: 'destructive', icon: XCircle },
  REFUNDED: { label: 'Refunded', variant: 'default', icon: AlertCircle },
  VOIDED: { label: 'Voided', variant: 'default', icon: XCircle },
  DISPUTED: { label: 'Disputed', variant: 'warning', icon: AlertCircle },
};

export function TransactionTable({
  transactions,
  showCompany = true,
  onFilterClick,
  onExportClick,
}: TransactionTableProps) {
  const StatusBadge = ({ status }: { status: TransactionStatus }) => {
    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-zinc-800">
        <h2 className="text-lg font-medium text-white">Recent Transactions</h2>
        <div className="flex items-center gap-2">
          {onFilterClick && (
            <Button variant="outline" size="sm" onClick={onFilterClick}>
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          )}
          {onExportClick && (
            <Button variant="outline" size="sm" onClick={onExportClick}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction</TableHead>
            <TableHead>Customer</TableHead>
            {showCompany && <TableHead>Company</TableHead>}
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Time</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map(txn => (
            <TableRow key={txn.id}>
              <TableCell>
                <Link
                  href={`/transactions/${txn.id}`}
                  className="font-mono text-sm text-zinc-300 hover:text-white"
                >
                  {txn.transactionNumber}
                </Link>
              </TableCell>
              <TableCell>
                <span className="text-sm text-zinc-300">
                  {txn.customer?.email || '-'}
                </span>
              </TableCell>
              {showCompany && (
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-sm text-zinc-400">
                    <span className="w-5 h-5 rounded bg-zinc-700 flex items-center justify-center text-[10px] font-medium">
                      {txn.company?.name?.charAt(0) || '?'}
                    </span>
                    {txn.company?.name || '-'}
                  </span>
                </TableCell>
              )}
              <TableCell>
                <span className="text-sm font-medium text-white">
                  {formatCurrency(txn.amount, txn.currency)}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge status={txn.status} />
              </TableCell>
              <TableCell>
                <span className="text-sm text-zinc-400">
                  {txn.paymentProvider?.name || '-'}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-zinc-500">
                  {formatRelativeTime(txn.createdAt)}
                </span>
              </TableCell>
              <TableCell>
                <button className="p-1 text-zinc-500 hover:text-white rounded transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800">
        <span className="text-sm text-zinc-500">
          Showing {transactions.length} transactions
        </span>
        <Link
          href="/transactions"
          className="text-sm text-cyan-400 hover:text-cyan-300"
        >
          View all →
        </Link>
      </div>
    </div>
  );
}
```

---

## File: apps/admin-dashboard/src/app/(dashboard)/page.tsx

```typescript
'use client';

import React from 'react';
import { TrendingUp, Receipt, Users, AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { MetricCard } from '@/components/dashboard/metric-card';
import { ProviderStatus } from '@/components/dashboard/provider-status';
import { RoutingSavings } from '@/components/dashboard/routing-savings';
import { TransactionTable } from '@/components/dashboard/transaction-table';
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
```

---

Continue to IMPLEMENTATION_06_PAGES.md for all page routes...
