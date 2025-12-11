'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { IntegrationStatus } from '@/lib/api/integrations';

interface IntegrationStatusBadgeProps {
  status: IntegrationStatus;
  className?: string;
}

const statusConfig: Record<IntegrationStatus, { label: string; color: string; bgColor: string }> = {
  [IntegrationStatus.ACTIVE]: {
    label: 'Active',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  [IntegrationStatus.PENDING]: {
    label: 'Pending',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  [IntegrationStatus.ERROR]: {
    label: 'Error',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
  [IntegrationStatus.DISABLED]: {
    label: 'Disabled',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
};

export function IntegrationStatusBadge({ status, className }: IntegrationStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig[IntegrationStatus.PENDING];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        config.bgColor,
        config.color,
        className
      )}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full mr-1.5', {
          'bg-emerald-400': status === IntegrationStatus.ACTIVE,
          'bg-amber-400': status === IntegrationStatus.PENDING,
          'bg-red-400': status === IntegrationStatus.ERROR,
          'bg-zinc-400': status === IntegrationStatus.DISABLED,
        })}
      />
      {config.label}
    </span>
  );
}
