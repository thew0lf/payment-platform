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
      "bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all hover:bg-zinc-900/80",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-zinc-500 text-sm font-medium">{title}</p>
          <p className="text-2xl font-semibold text-white mt-1">{displayValue}</p>
          {subtitle && <p className="text-zinc-600 text-xs mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="p-2 bg-zinc-800 rounded-lg">
            <Icon className="w-5 h-5 text-zinc-400" />
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className={cn(
          "flex items-center gap-1 mt-3 text-sm",
          isPositiveTrend ? "text-emerald-400" : "text-red-400"
        )}>
          {isPositiveTrend ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
          <span>{Math.abs(change).toFixed(1)}%</span>
          <span className="text-zinc-600">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}
