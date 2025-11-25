'use client';

import React, { useState } from 'react';
import { Filter, Download, Plus, Search } from 'lucide-react';
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
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

// Mock data
const mockTransactions = [
  { id: 'txn_1', number: 'txn_1N2k3L', email: 'sarah@example.com', company: 'CoffeeCo', companyId: 'company_1', amount: 26.95, status: 'COMPLETED', provider: 'PayPal', createdAt: new Date(Date.now() - 2 * 60000) },
  { id: 'txn_2', number: 'txn_1N2k3M', email: 'mike@example.com', company: 'FitBox', companyId: 'company_2', amount: 49.99, status: 'COMPLETED', provider: 'Stripe', createdAt: new Date(Date.now() - 5 * 60000) },
  { id: 'txn_3', number: 'txn_1N2k3N', email: 'jen@example.com', company: 'PetPals', companyId: 'company_3', amount: 34.95, status: 'PENDING', provider: 'NMI', createdAt: new Date(Date.now() - 8 * 60000) },
  { id: 'txn_4', number: 'txn_1N2k3O', email: 'alex@example.com', company: 'CoffeeCo', companyId: 'company_1', amount: 26.95, status: 'COMPLETED', provider: 'PayPal', createdAt: new Date(Date.now() - 12 * 60000) },
  { id: 'txn_5', number: 'txn_1N2k3P', email: 'chris@example.com', company: 'FitBox', companyId: 'company_2', amount: 99.99, status: 'FAILED', provider: 'Stripe', createdAt: new Date(Date.now() - 15 * 60000) },
  { id: 'txn_6', number: 'txn_1N2k3Q', email: 'dana@example.com', company: 'PetPals', companyId: 'company_3', amount: 24.95, status: 'COMPLETED', provider: 'NMI', createdAt: new Date(Date.now() - 18 * 60000) },
  { id: 'txn_7', number: 'txn_1N2k3R', email: 'evan@example.com', company: 'CoffeeCo', companyId: 'company_1', amount: 53.90, status: 'COMPLETED', provider: 'PayPal', createdAt: new Date(Date.now() - 25 * 60000) },
  { id: 'txn_8', number: 'txn_1N2k3S', email: 'fiona@example.com', company: 'FitBox', companyId: 'company_2', amount: 149.99, status: 'REFUNDED', provider: 'Stripe', createdAt: new Date(Date.now() - 45 * 60000) },
];

export default function TransactionsPage() {
  const { selectedCompanyId, selectedClientId, availableCompanies } = useHierarchy();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Filter transactions
  const filteredTransactions = React.useMemo(() => {
    let result = [...mockTransactions];

    // Hierarchy filter
    if (selectedCompanyId) {
      result = result.filter(t => t.companyId === selectedCompanyId);
    } else if (selectedClientId) {
      const clientCompanyIds = availableCompanies
        .filter(c => c.clientId === selectedClientId)
        .map(c => c.id);
      result = result.filter(t => clientCompanyIds.includes(t.companyId));
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(t =>
        t.number.toLowerCase().includes(searchLower) ||
        t.email.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter) {
      result = result.filter(t => t.status === statusFilter);
    }

    return result;
  }, [selectedCompanyId, selectedClientId, availableCompanies, search, statusFilter]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
      COMPLETED: 'success',
      PENDING: 'warning',
      FAILED: 'destructive',
      REFUNDED: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status.toLowerCase()}</Badge>;
  };

  return (
    <>
      <Header
        title="Transactions"
        subtitle={`${filteredTransactions.length} transactions`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Transaction
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
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

        {/* Table */}
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
              {filteredTransactions.map(txn => (
                <TableRow key={txn.id}>
                  <TableCell className="font-mono text-sm">{txn.number}</TableCell>
                  <TableCell>{txn.email}</TableCell>
                  {!selectedCompanyId && <TableCell>{txn.company}</TableCell>}
                  <TableCell className="font-medium">{formatCurrency(txn.amount)}</TableCell>
                  <TableCell>{getStatusBadge(txn.status)}</TableCell>
                  <TableCell className="text-zinc-400">{txn.provider}</TableCell>
                  <TableCell className="text-zinc-500">{formatRelativeTime(txn.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
