'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  subtitle?: string;
  format?: 'currency' | 'number' | 'percent' | 'none';
  currency?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel = 'vs last month',
  icon: Icon,
  subtitle,
  format = 'none',
  currency = 'USD',
  trend,
  className,
}: MetricCardProps) {
  // Format value
  let displayValue = value;
  if (typeof value === 'number') {
    switch (format) {
      case 'currency':
        displayValue = formatCurrency(value, currency);
        break;
      case 'number':
        displayValue = formatNumber(value);
        break;
      case 'percent':
        displayValue = `${value.toFixed(1)}%`;
        break;
    }
  }

  // Determine trend direction
  const trendDirection = trend || (change !== undefined ? (change >= 0 ? 'up' : 'down') : 'neutral');
  const isPositiveTrend = trendDirection === 'up';

  return (
    <div className={cn(
      "bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all hover:bg-muted/50",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{displayValue}</p>
          {subtitle && <p className="text-muted-foreground/60 text-xs mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-2 bg-muted rounded-lg">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className={cn(
          "flex items-center gap-1 mt-3 text-sm",
          isPositiveTrend ? "text-emerald-500" : "text-red-500"
        )}>
          {isPositiveTrend ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
          <span>{Math.abs(change).toFixed(1)}%</span>
          <span className="text-muted-foreground/60">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}
