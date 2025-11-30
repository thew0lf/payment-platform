'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Plus, Mail, MoreHorizontal, Eye, Loader2 } from 'lucide-react';
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
import { formatDate } from '@/lib/utils';
import { customersApi, Customer } from '@/lib/api/customers';

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

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await customersApi.list({
        search: search || undefined,
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
  }, [search]);

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
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
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
