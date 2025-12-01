'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Download, Plus, Search, Loader2, Calendar, Clock, ChevronDown, X } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { formatCurrency, formatRelativeTime, cn } from '@/lib/utils';
import { transactionsApi } from '@/lib/api/transactions';
import { Transaction } from '@/types/transactions';

// Date range preset types
type DateRangePreset = 'last_hour' | 'today' | 'this_week' | 'this_month' | 'custom' | 'all_time';

interface DateRange {
  startDate: string | undefined;
  endDate: string | undefined;
}

const dateRangePresets: { value: DateRangePreset; label: string; icon?: React.ReactNode }[] = [
  { value: 'last_hour', label: 'Last Hour', icon: <Clock className="w-3.5 h-3.5" /> },
  { value: 'today', label: 'Today', icon: <Calendar className="w-3.5 h-3.5" /> },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'custom', label: 'Custom' },
  { value: 'all_time', label: 'All Time' },
];

// Helper to calculate date ranges
const getDateRange = (preset: DateRangePreset): DateRange => {
  const now = new Date();

  switch (preset) {
    case 'last_hour': {
      const start = new Date(now.getTime() - 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    case 'this_week': {
      const dayOfWeek = now.getDay();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    case 'all_time':
    default:
      return { startDate: undefined, endDate: undefined };
  }
};

export default function TransactionsPage() {
  const { selectedCompanyId, selectedClientId } = useHierarchy();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Date range state
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all_time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Get display label for current date range
  const dateRangeLabel = useMemo(() => {
    if (dateRangePreset === 'custom' && (customStartDate || customEndDate)) {
      const parts = [];
      if (customStartDate) parts.push(new Date(customStartDate).toLocaleDateString());
      if (customEndDate) parts.push(new Date(customEndDate).toLocaleDateString());
      return parts.join(' - ') || 'Custom';
    }
    return dateRangePresets.find(p => p.value === dateRangePreset)?.label || 'All Time';
  }, [dateRangePreset, customStartDate, customEndDate]);

  // Helper to get current date range for API call
  const getEffectiveDateRange = (): DateRange => {
    if (dateRangePreset === 'custom') {
      return {
        startDate: customStartDate ? new Date(customStartDate).toISOString() : undefined,
        endDate: customEndDate ? new Date(customEndDate + 'T23:59:59').toISOString() : undefined,
      };
    }
    return getDateRange(dateRangePreset);
  };

  const loadTransactions = async () => {
    try {
      const dateRange = getEffectiveDateRange();
      const response = await transactionsApi.list({
        companyId: selectedCompanyId || undefined,
        clientId: selectedClientId || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: 50,
      });
      setTransactions(response.transactions || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadTransactions();
  }, [selectedCompanyId, selectedClientId, statusFilter, dateRangePreset, customStartDate, customEndDate]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTransactions();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
      COMPLETED: 'success',
      PENDING: 'warning',
      PROCESSING: 'warning',
      FAILED: 'destructive',
      REFUNDED: 'default',
      VOIDED: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status.toLowerCase()}</Badge>;
  };

  return (
    <>
      <Header
        title="Transactions"
        subtitle={`${total} transactions`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Transaction
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Date Range Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
                dateRangePreset !== 'all_time'
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600'
              )}
            >
              <Calendar className="w-4 h-4" />
              <span>{dateRangeLabel}</span>
              <ChevronDown className={cn('w-4 h-4 transition-transform', showDateDropdown && 'rotate-180')} />
            </button>

            {showDateDropdown && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDateDropdown(false)}
                />
                {/* Dropdown */}
                <div className="absolute top-full left-0 mt-2 z-20 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
                  {/* Preset options */}
                  <div className="p-2">
                    {dateRangePresets.map(preset => (
                      <button
                        key={preset.value}
                        onClick={() => {
                          setDateRangePreset(preset.value);
                          if (preset.value !== 'custom') {
                            setShowDateDropdown(false);
                          }
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                          dateRangePreset === preset.value
                            ? 'bg-cyan-500/10 text-cyan-400'
                            : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                        )}
                      >
                        {preset.icon || <Calendar className="w-3.5 h-3.5 opacity-50" />}
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Custom date inputs */}
                  {dateRangePreset === 'custom' && (
                    <div className="border-t border-zinc-700 p-3 space-y-3">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={e => setCustomStartDate(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">End Date</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={e => setCustomEndDate(e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                      <button
                        onClick={() => setShowDateDropdown(false)}
                        className="w-full px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Clear date filter button */}
          {dateRangePreset !== 'all_time' && (
            <button
              onClick={() => {
                setDateRangePreset('all_time');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="Clear date filter"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {['COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'].map(status => (
              <Button
                key={status}
                variant={statusFilter === status ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter(statusFilter === status ? null : status)}
              >
                {status.toLowerCase()}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 flex items-center justify-center">
            <div className="flex items-center gap-3 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading transactions...</span>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
            <p className="text-zinc-400">No transactions found</p>
          </div>
        ) : (
          /* Table */
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Customer</TableHead>
                  {!selectedCompanyId && <TableHead>Company</TableHead>}
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(txn => (
                  <TableRow key={txn.id}>
                    <TableCell className="font-mono text-sm">{txn.transactionNumber}</TableCell>
                    <TableCell>{txn.customer?.email || '-'}</TableCell>
                    {!selectedCompanyId && <TableCell>{txn.company?.name || '-'}</TableCell>}
                    <TableCell className="font-medium">{formatCurrency(txn.amount, txn.currency)}</TableCell>
                    <TableCell>{getStatusBadge(txn.status)}</TableCell>
                    <TableCell className="text-zinc-400">{txn.paymentProvider?.name || '-'}</TableCell>
                    <TableCell className="text-zinc-500">{formatRelativeTime(txn.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
