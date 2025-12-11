'use client';

import React from 'react';
import { GitBranch, TrendingDown, Zap, Shield, Repeat } from 'lucide-react';

interface RoutingSavingsProps {
  totalSaved: number;
  period?: string;
  rules?: Array<{
    name: string;
    description: string;
    saved: number;
  }>;
}

const ruleIcons: Record<string, React.ElementType> = {
  'Low Cost': TrendingDown,
  'Performance': Zap,
  'Failover': Shield,
  'Load Balance': Repeat,
};

export function RoutingSavings({ totalSaved, period = 'this month', rules = [] }: RoutingSavingsProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-medium text-foreground">Smart Routing</h2>
        </div>
        <span className="text-xs text-muted-foreground capitalize">{period}</span>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20 rounded-lg p-4 mb-4">
        <p className="text-xs text-muted-foreground mb-1">Total Savings</p>
        <p className="text-2xl font-semibold text-foreground">
          ${totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-emerald-500 mt-1">
          Optimized routing across {rules.length} active rule{rules.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Rule Cards Grid */}
      {rules.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rules.map((rule, index) => {
            const IconComponent = ruleIcons[rule.name] || GitBranch;
            return (
              <div
                key={index}
                className="p-3 bg-muted/50 rounded-lg border border-border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <IconComponent className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground truncate">{rule.name}</span>
                </div>
                <p className="text-lg font-semibold text-emerald-500">
                  -${rule.saved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground truncate">{rule.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
