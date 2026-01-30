'use client';

import React, { useState } from 'react';
import { Mail, X, Eye, Loader2, ShoppingCart, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { CartStatusBadge } from './cart-status-badge';
import { Cart } from './cart-table';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface RecoveryQueueProps {
  carts: Cart[];
  onSendRecovery?: (cartIds: string[]) => Promise<void>;
  onDismiss?: (cartId: string) => Promise<void>;
  onPreview?: (cart: Cart) => void;
  isLoading?: boolean;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function RecoveryQueueSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 bg-white"
        >
          <Skeleton className="h-4 w-4 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecoveryQueue({
  carts,
  onSendRecovery,
  onDismiss,
  onPreview,
  isLoading,
}: RecoveryQueueProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(carts.map((cart) => cart.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (cartId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(cartId);
    } else {
      newSelected.delete(cartId);
    }
    setSelectedIds(newSelected);
  };

  const handleSendRecovery = async (cartIds: string[]) => {
    if (!onSendRecovery) return;

    const idsSet = new Set(cartIds);
    setSendingIds(idsSet);
    try {
      await onSendRecovery(cartIds);
      // Clear selected after successful send
      setSelectedIds((prev) => {
        const newSelected = new Set(prev);
        cartIds.forEach((id) => newSelected.delete(id));
        return newSelected;
      });
    } finally {
      setSendingIds(new Set());
    }
  };

  const handleDismiss = async (cartId: string) => {
    if (!onDismiss) return;

    setDismissingIds((prev) => new Set(prev).add(cartId));
    try {
      await onDismiss(cartId);
      setSelectedIds((prev) => {
        const newSelected = new Set(prev);
        newSelected.delete(cartId);
        return newSelected;
      });
    } finally {
      setDismissingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cartId);
        return newSet;
      });
    }
  };

  const allSelected = carts.length > 0 && selectedIds.size === carts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < carts.length;

  if (isLoading) {
    return <RecoveryQueueSkeleton />;
  }

  if (carts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-gray-100 p-3 mb-4">
          <ShoppingCart className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No abandoned carts</h3>
        <p className="text-sm text-gray-500">
          Abandoned carts will appear here for recovery
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
            aria-label="Select all carts"
            className={cn(someSelected && 'data-[state=checked]:bg-primary/50')}
            {...(someSelected && { 'data-state': 'checked' })}
          />
          <span className="text-sm text-gray-600">
            {selectedIds.size > 0
              ? `${selectedIds.size} selected`
              : `${carts.length} abandoned ${carts.length === 1 ? 'cart' : 'carts'}`}
          </span>
        </div>

        {selectedIds.size > 0 && (
          <Button
            variant="default"
            size="sm"
            onClick={() => handleSendRecovery(Array.from(selectedIds))}
            disabled={sendingIds.size > 0}
            className="min-h-[36px]"
          >
            {sendingIds.size > 0 ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Recovery ({selectedIds.size})
              </>
            )}
          </Button>
        )}
      </div>

      {/* Cart rows */}
      <div className="space-y-2">
        {carts.map((cart) => {
          const isSelected = selectedIds.has(cart.id);
          const isSending = sendingIds.has(cart.id);
          const isDismissing = dismissingIds.has(cart.id);

          return (
            <div
              key={cart.id}
              className={cn(
                'flex items-center gap-4 p-4 rounded-lg border bg-white transition-colors',
                isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              )}
            >
              {/* Checkbox */}
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => handleSelectOne(cart.id, checked as boolean)}
                aria-label={`Select cart ${cart.cartNumber}`}
                disabled={isSending || isDismissing}
              />

              {/* Cart info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm text-gray-500">
                    {cart.cartNumber}
                  </span>
                  <CartStatusBadge status={cart.status} />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <div className="font-medium text-gray-900 truncate">
                    {cart.customerName}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {cart.customerEmail}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3" />
                    {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(cart.lastActivityAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="text-right hidden sm:block">
                <div className="font-semibold text-gray-900">
                  {formatCurrency(cart.total, cart.currency)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPreview?.(cart)}
                  disabled={isSending || isDismissing}
                  className="min-h-[36px] hidden sm:inline-flex"
                >
                  <Eye className="h-4 w-4" />
                  <span className="ml-2 hidden md:inline">Preview</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendRecovery([cart.id])}
                  disabled={isSending || isDismissing}
                  className="min-h-[36px]"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      <span className="ml-2 hidden md:inline">Send</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(cart.id)}
                  disabled={isSending || isDismissing}
                  className="min-h-[36px] text-gray-500 hover:text-red-600"
                >
                  {isDismissing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
