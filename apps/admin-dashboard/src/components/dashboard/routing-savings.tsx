'use client';

import React from 'react';
import { GitBranch } from 'lucide-react';

interface RoutingSavingsProps {
  totalSaved: number;
  period?: string;
  rules?: Array<{
    name: string;
    description: string;
    saved: number;
  }>;
}

export function RoutingSavings({ totalSaved, period = 'this month', rules = [] }: RoutingSavingsProps) {
  return (
    <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-medium text-white">Smart Routing</h2>
      </div>
      <p className="text-3xl font-bold text-white mb-1">
        ${totalSaved.toLocaleString()}
      </p>
      <p className="text-sm text-zinc-400 mb-4">Saved in fees {period}</p>

      {rules.length > 0 && (
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">{rule.description}</span>
              <span className="text-emerald-400">-${rule.saved}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
