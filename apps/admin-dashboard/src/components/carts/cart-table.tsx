'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CartStatusBadge, CartStatus } from './cart-status-badge';
import { formatDistanceToNow } from 'date-fns';

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Cart {
  id: string;
  cartNumber: string;
  customerName: string;
  customerEmail: string;
  items: CartItem[];
  total: number;
  currency: string;
  status: CartStatus;
  lastActivityAt: string;
  createdAt: string;
}

interface CartTableProps {
  carts: Cart[];
  onRowClick?: (cart: Cart) => void;
  isLoading?: boolean;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function CartTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-20 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function CartTable({ carts, onRowClick, isLoading }: CartTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cart ID</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Items</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last Activity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <CartTableSkeleton />
        ) : carts.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
              No carts found
            </TableCell>
          </TableRow>
        ) : (
          carts.map((cart) => (
            <TableRow
              key={cart.id}
              className={onRowClick ? 'cursor-pointer' : undefined}
              onClick={() => onRowClick?.(cart)}
            >
              <TableCell className="font-mono text-sm">
                {cart.cartNumber}
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium text-foreground">{cart.customerName}</div>
                  <div className="text-sm text-muted-foreground">{cart.customerEmail}</div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">
                  {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'}
                </span>
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency(cart.total, cart.currency)}
              </TableCell>
              <TableCell>
                <CartStatusBadge status={cart.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDistanceToNow(new Date(cart.lastActivityAt), { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
