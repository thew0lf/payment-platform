'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

export type CartStatus = 'ACTIVE' | 'ABANDONED' | 'CONVERTED' | 'EXPIRED' | 'ARCHIVED';

interface CartStatusBadgeProps {
  status: CartStatus;
  className?: string;
}

const statusConfig: Record<CartStatus, { label: string; variant: 'success' | 'warning' | 'info' | 'default' | 'outline' }> = {
  ACTIVE: {
    label: 'Active',
    variant: 'success',
  },
  ABANDONED: {
    label: 'Abandoned',
    variant: 'warning',
  },
  CONVERTED: {
    label: 'Converted',
    variant: 'info',
  },
  EXPIRED: {
    label: 'Expired',
    variant: 'default',
  },
  ARCHIVED: {
    label: 'Archived',
    variant: 'default',
  },
};

export function CartStatusBadge({ status, className }: CartStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.ACTIVE;

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
