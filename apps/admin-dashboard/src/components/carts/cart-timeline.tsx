'use client';

import React from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  CreditCard,
  Mail,
  Clock,
  XCircle,
  CheckCircle,
  ArrowRight,
  User,
  Package,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export type CartActivityType =
  | 'CART_CREATED'
  | 'ITEM_ADDED'
  | 'ITEM_REMOVED'
  | 'QUANTITY_UPDATED'
  | 'CHECKOUT_STARTED'
  | 'CHECKOUT_ABANDONED'
  | 'PAYMENT_ATTEMPTED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_COMPLETED'
  | 'RECOVERY_EMAIL_SENT'
  | 'CUSTOMER_RETURNED'
  | 'CART_EXPIRED';

export interface CartActivity {
  id: string;
  type: CartActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface CartTimelineProps {
  activities: CartActivity[];
  className?: string;
}

const activityConfig: Record<
  CartActivityType,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  CART_CREATED: {
    icon: ShoppingCart,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  ITEM_ADDED: {
    icon: Plus,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  ITEM_REMOVED: {
    icon: Minus,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  QUANTITY_UPDATED: {
    icon: Package,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  CHECKOUT_STARTED: {
    icon: ArrowRight,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  CHECKOUT_ABANDONED: {
    icon: XCircle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  PAYMENT_ATTEMPTED: {
    icon: CreditCard,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  PAYMENT_FAILED: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
  PAYMENT_COMPLETED: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  RECOVERY_EMAIL_SENT: {
    icon: Mail,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  CUSTOMER_RETURNED: {
    icon: User,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  CART_EXPIRED: {
    icon: Clock,
    color: 'text-gray-400',
    bgColor: 'bg-gray-100',
  },
};

export function CartTimeline({ activities, className }: CartTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        No activity recorded
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Vertical line */}
      <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200" />

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const config = activityConfig[activity.type] || activityConfig.CART_CREATED;
          const Icon = config.icon;
          const isLast = index === activities.length - 1;

          return (
            <div key={activity.id} className="relative flex gap-4">
              {/* Icon */}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full',
                  config.bgColor
                )}
              >
                <Icon className={cn('h-4 w-4', config.color)} />
              </div>

              {/* Content */}
              <div className={cn('flex-1 pb-4', isLast && 'pb-0')}>
                <p className="text-sm text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
