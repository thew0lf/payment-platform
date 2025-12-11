'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PaymentProvider } from '@/types/hierarchy';

interface ProviderStatusProps {
  providers: Array<{
    id: string;
    name: string;
    type: string;
    status: 'healthy' | 'degraded' | 'down';
    volume: number;
    successRate?: number;
  }>;
  manageHref?: string;
}

export function ProviderStatus({ providers, manageHref = '/integrations' }: ProviderStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-emerald-400';
      case 'degraded': return 'bg-amber-400';
      case 'down': return 'bg-red-400';
      default: return 'bg-muted-foreground';
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(2)}`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-foreground">Payment Providers</h2>
        <Link
          href={manageHref}
          className="text-sm text-primary hover:text-primary/80"
        >
          Manage
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {providers.map(provider => (
          <div
            key={provider.id}
            className="p-3 bg-muted/50 rounded-lg border border-border"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">{provider.name}</span>
              <span className={cn(
                "w-2 h-2 rounded-full",
                getStatusColor(provider.status)
              )} />
            </div>
            <p className="text-lg font-semibold text-foreground">
              {formatVolume(provider.volume)}
            </p>
            {provider.successRate !== undefined && (
              <p className="text-xs text-muted-foreground">
                {provider.successRate.toFixed(1)}% success rate
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
