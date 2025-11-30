'use client';

import React, { useState, useEffect } from 'react';
import { Download, Plus, Search, Loader2 } from 'lucide-react';
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
import { transactionsApi } from '@/lib/api/transactions';
import { Transaction } from '@/types/transactions';

export default function TransactionsPage() {
  const { selectedCompanyId, selectedClientId } = useHierarchy();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadTransactions = async () => {
    try {
      const response = await transactionsApi.list({
        companyId: selectedCompanyId || undefined,
        clientId: selectedClientId || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
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
  }, [selectedCompanyId, selectedClientId, statusFilter]);

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
