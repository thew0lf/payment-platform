'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Search, Plus, Mail, MoreHorizontal, Eye, Loader2, Calendar, Clock, ChevronDown, X } from 'lucide-react';
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
import { formatDate, cn } from '@/lib/utils';
import { customersApi, Customer } from '@/lib/api/customers';

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

interface CustomerWithCompany extends Customer {
  company?: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function CustomersPage() {
  const { selectedCompanyId } = useHierarchy();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerWithCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateRange = getEffectiveDateRange();
      const response = await customersApi.list({
        search: search || undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: 50,
        offset: 0,
      });
      // API returns { customers, total } but we also handle { items, total }
      const customersList = (response as unknown as { customers?: CustomerWithCompany[] }).customers || response.items || [];
      setCustomers(customersList);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search, dateRangePreset, customStartDate, customEndDate]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchCustomers]);

  const filteredCustomers = React.useMemo(() => {
    if (selectedCompanyId) {
      return customers.filter(c => c.companyId === selectedCompanyId);
    }
    return customers;
  }, [selectedCompanyId, customers]);

  const getCustomerName = (customer: CustomerWithCompany) => {
    if (customer.firstName || customer.lastName) {
      return `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    }
    return customer.email.split('@')[0];
  };

  return (
    <>
      <Header
        title="Customers"
        subtitle={loading ? 'Loading...' : `${total} customers`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search customers..."
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
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                {!selectedCompanyId && <TableHead>Company</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Subscriptions</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={selectedCompanyId ? 6 : 7} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-500" />
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={selectedCompanyId ? 6 : 7} className="text-center py-8 text-zinc-500">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map(customer => (
                  <TableRow key={customer.id} className="hover:bg-zinc-800/50 cursor-pointer">
                    <TableCell>
                      <Link href={`/customers/${customer.id}`} className="block">
                        <p className="font-medium text-white hover:text-cyan-400 transition-colors">
                          {getCustomerName(customer)}
                        </p>
                        <p className="text-sm text-zinc-500">{customer.email}</p>
                      </Link>
                    </TableCell>
                    {!selectedCompanyId && (
                      <TableCell>{customer.company?.name || 'N/A'}</TableCell>
                    )}
                    <TableCell>
                      <Badge variant={customer.status === 'ACTIVE' ? 'success' : 'default'}>
                        {customer.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{customer._count?.transactions || 0}</TableCell>
                    <TableCell>{customer._count?.subscriptions || 0}</TableCell>
                    <TableCell className="text-zinc-500">{formatDate(new Date(customer.createdAt))}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="p-1 text-zinc-500 hover:text-cyan-400 rounded"
                          title="View customer"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button className="p-1 text-zinc-500 hover:text-white rounded">
                          <Mail className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-zinc-500 hover:text-white rounded">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
