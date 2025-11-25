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
