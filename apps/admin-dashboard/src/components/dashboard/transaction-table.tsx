'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Filter, Download, Check, Clock, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
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
  const router = useRouter();

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
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-5 border-b border-border">
        <h2 className="text-base md:text-lg font-medium text-foreground">Recent Transactions</h2>
        <div className="flex items-center gap-2">
          {onFilterClick && (
            <Button variant="outline" size="sm" onClick={onFilterClick} className="hidden sm:flex">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          )}
          {onExportClick && (
            <Button variant="outline" size="sm" onClick={onExportClick} className="hidden sm:flex">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
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
                    className="font-mono text-sm text-muted-foreground hover:text-foreground"
                  >
                    {txn.transactionNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {txn.customer?.email || '-'}
                  </span>
                </TableCell>
                {showCompany && (
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-medium">
                        {txn.company?.name?.charAt(0) || '?'}
                      </span>
                      {txn.company?.name || '-'}
                    </span>
                  </TableCell>
                )}
                <TableCell>
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(txn.amount, txn.currency)}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={txn.status} />
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {txn.paymentProvider?.name || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatRelativeTime(txn.createdAt)}
                  </span>
                </TableCell>
                <TableCell>
                  <button className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-border">
        {transactions.map(txn => (
          <div
            key={txn.id}
            className="p-4 active:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => router.push(`/transactions/${txn.id}`)}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                {/* Primary row: Amount & Status */}
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-foreground">
                    {formatCurrency(txn.amount, txn.currency)}
                  </span>
                  <StatusBadge status={txn.status} />
                </div>

                {/* Secondary info */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Transaction</span>
                    <span className="font-mono text-muted-foreground">{txn.transactionNumber}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Time</span>
                    <span className="text-foreground">{formatRelativeTime(txn.createdAt)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground block">Customer</span>
                    <span className="text-foreground truncate block">{txn.customer?.email || '-'}</span>
                  </div>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 md:px-5 py-3 border-t border-border">
        <span className="text-sm text-muted-foreground">
          Showing {transactions.length} transactions
        </span>
        <Link
          href="/transactions"
          className="text-sm text-primary hover:text-primary/80"
        >
          View all →
        </Link>
      </div>
    </div>
  );
}
