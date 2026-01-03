'use client';

import React from 'react';
import { ChevronRight, ShoppingCart, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CartStatusBadge } from './cart-status-badge';
import { Cart } from './cart-table';
import { formatDistanceToNow } from 'date-fns';

interface CartCardProps {
  cart: Cart;
  onClick?: (cart: Cart) => void;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function CartCard({ cart, onClick }: CartCardProps) {
  return (
    <Card
      className="bg-card/50 border-border hover:border-primary/50 transition-colors cursor-pointer touch-manipulation active:bg-muted/50"
      onClick={() => onClick?.(cart)}
    >
      <CardContent className="p-4 min-h-[44px]">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Header with cart ID and status */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm text-muted-foreground">
                {cart.cartNumber}
              </span>
              <CartStatusBadge status={cart.status} />
            </div>

            {/* Customer info */}
            <div className="mb-3">
              <div className="font-medium text-foreground truncate">
                {cart.customerName}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {cart.customerEmail}
              </div>
            </div>

            {/* Cart details */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ShoppingCart className="h-4 w-4" />
                <span>
                  {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="font-medium text-foreground">
                {formatCurrency(cart.total, cart.currency)}
              </div>
            </div>

            {/* Last activity */}
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(cart.lastActivityAt), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Chevron indicator */}
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
        </div>
      </CardContent>
    </Card>
  );
}
