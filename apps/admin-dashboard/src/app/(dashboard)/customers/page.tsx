'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Search, Plus, Mail, MoreHorizontal, Eye, Loader2, Calendar, Clock, ChevronDown, X, Edit, Trash2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
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
  const router = useRouter();
  const { selectedCompanyId } = useHierarchy();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerWithCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerWithCompany | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Action handlers
  const handleEmailCustomer = (customer: CustomerWithCompany) => {
    window.location.href = `mailto:${customer.email}`;
  };

  const handleEditCustomer = (customer: CustomerWithCompany) => {
    router.push(`/customers/${customer.id}/edit`);
    setOpenMenuId(null);
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await customersApi.delete(customerToDelete.id);
      toast.success(`Customer "${getCustomerName(customerToDelete)}" deleted`);
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (err) {
      console.error('Failed to delete customer:', err);
      toast.error('Failed to delete customer. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddCustomer = () => {
    router.push('/customers/new');
  };

  return (
    <>
      <Header
        title="Customers"
        subtitle={loading ? 'Loading...' : `${total} customers`}
        actions={
          <Button size="sm" onClick={handleAddCustomer}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-muted border-border text-foreground hover:text-foreground hover:border-border'
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
                <div className="absolute top-full left-0 mt-2 z-20 w-64 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
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
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {preset.icon || <Calendar className="w-3.5 h-3.5 opacity-50" />}
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Custom date inputs */}
                  {dateRangePreset === 'custom' && (
                    <div className="border-t border-border p-3 space-y-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={e => setCustomStartDate(e.target.value)}
                          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">End Date</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={e => setCustomEndDate(e.target.value)}
                          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <button
                        onClick={() => setShowDateDropdown(false)}
                        className="w-full px-3 py-2 bg-primary hover:bg-primary text-foreground text-sm font-medium rounded-lg transition-colors"
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
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
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

        <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block">
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
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={selectedCompanyId ? 6 : 7} className="text-center py-8 text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map(customer => (
                    <TableRow key={customer.id} className="hover:bg-muted/50 cursor-pointer">
                      <TableCell>
                        <Link href={`/customers/${customer.id}`} className="block">
                          <p className="font-medium text-foreground hover:text-primary transition-colors">
                            {getCustomerName(customer)}
                          </p>
                          <p className="text-sm text-muted-foreground">{customer.email}</p>
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
                      <TableCell className="text-muted-foreground">{formatDate(new Date(customer.createdAt))}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="p-1 text-muted-foreground hover:text-primary rounded"
                            title="View customer"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            className="p-1 text-muted-foreground hover:text-foreground rounded"
                            title="Email customer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEmailCustomer(customer);
                            }}
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <div className="relative">
                            <button
                              className="p-1 text-muted-foreground hover:text-foreground rounded"
                              title="More actions"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === customer.id ? null : customer.id);
                              }}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {openMenuId === customer.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <div className="absolute right-0 top-full mt-1 z-20 w-36 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                                  <button
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditCustomer(customer);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCustomerToDelete(customer);
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No customers found
              </div>
            ) : (
              filteredCustomers.map(customer => (
                <div
                  key={customer.id}
                  className="p-4 active:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/customers/${customer.id}`)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Primary row: Name & Status */}
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {getCustomerName(customer)}
                        </span>
                        <Badge variant={customer.status === 'ACTIVE' ? 'success' : 'default'} className="flex-shrink-0">
                          {customer.status.toLowerCase()}
                        </Badge>
                      </div>

                      {/* Email */}
                      <p className="text-sm text-muted-foreground truncate">{customer.email}</p>

                      {/* Stats */}
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Transactions: </span>
                          <span className="text-foreground">{customer._count?.transactions || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Subscriptions: </span>
                          <span className="text-foreground">{customer._count?.subscriptions || 0}</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {customerToDelete && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Customer</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete &quot;{getCustomerName(customerToDelete)}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setCustomerToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
