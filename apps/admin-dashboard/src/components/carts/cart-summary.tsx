'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CartSummaryProps {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  className?: string;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

interface SummaryRowProps {
  label: string;
  amount: number;
  currency: string;
  isNegative?: boolean;
  isBold?: boolean;
  isLarge?: boolean;
}

function SummaryRow({ label, amount, currency, isNegative, isBold, isLarge }: SummaryRowProps) {
  const formattedAmount = formatCurrency(Math.abs(amount), currency);
  const displayAmount = isNegative && amount > 0 ? `-${formattedAmount}` : formattedAmount;

  return (
    <div
      className={cn(
        'flex items-center justify-between',
        isLarge ? 'text-base' : 'text-sm',
        isBold && 'font-semibold'
      )}
    >
      <span className={cn(isBold ? 'text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
      <span
        className={cn(
          isBold ? 'text-foreground' : 'text-foreground',
          isNegative && amount > 0 && 'text-emerald-500'
        )}
      >
        {displayAmount}
      </span>
    </div>
  );
}

export function CartSummary({
  subtotal,
  tax,
  shipping,
  discount,
  total,
  currency,
  className,
}: CartSummaryProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <SummaryRow label="Subtotal" amount={subtotal} currency={currency} />

      {shipping > 0 && (
        <SummaryRow label="Shipping" amount={shipping} currency={currency} />
      )}

      {tax > 0 && (
        <SummaryRow label="Tax" amount={tax} currency={currency} />
      )}

      {discount > 0 && (
        <SummaryRow
          label="Discount"
          amount={discount}
          currency={currency}
          isNegative
        />
      )}

      <div className="border-t border-border pt-3 mt-3">
        <SummaryRow
          label="Total"
          amount={total}
          currency={currency}
          isBold
          isLarge
        />
      </div>
    </div>
  );
}
