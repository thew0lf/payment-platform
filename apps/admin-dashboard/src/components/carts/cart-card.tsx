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
      className="bg-white border-gray-200 hover:border-blue-300 transition-colors cursor-pointer touch-manipulation active:bg-gray-50"
      onClick={() => onClick?.(cart)}
    >
      <CardContent className="p-4 min-h-[44px]">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Header with cart ID and status */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm text-gray-500">
                {cart.cartNumber}
              </span>
              <CartStatusBadge status={cart.status} />
            </div>

            {/* Customer info */}
            <div className="mb-3">
              <div className="font-medium text-gray-900 truncate">
                {cart.customerName}
              </div>
              <div className="text-sm text-gray-500 truncate">
                {cart.customerEmail}
              </div>
            </div>

            {/* Cart details */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-gray-500">
                <ShoppingCart className="h-4 w-4" />
                <span>
                  {cart.items.length} {cart.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="font-medium text-gray-900">
                {formatCurrency(cart.total, cart.currency)}
              </div>
            </div>

            {/* Last activity */}
            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(cart.lastActivityAt), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Chevron indicator */}
          <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
        </div>
      </CardContent>
    </Card>
  );
}
