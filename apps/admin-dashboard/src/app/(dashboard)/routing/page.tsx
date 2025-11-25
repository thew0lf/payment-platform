'use client';

import React from 'react';
import { Plus, GitBranch, ArrowRight, ToggleLeft, ToggleRight } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const mockRules = [
  {
    id: 'rule_1',
    name: 'High-Value to NMI',
    description: 'Route transactions over $500 to NMI for lower fees',
    condition: 'amount > 500',
    action: 'route_to_nmi',
    provider: 'NMI',
    isActive: true,
    savings: 156,
    transactions: 234,
  },
  {
    id: 'rule_2',
    name: 'International to PayPal',
    description: 'Route international transactions to PayPal',
    condition: 'currency != USD',
    action: 'route_to_paypal',
    provider: 'PayPal Payflow',
    isActive: true,
    savings: 78,
    transactions: 89,
  },
  {
    id: 'rule_3',
    name: 'Subscription Renewal',
    description: 'Route subscription renewals to Stripe',
    condition: 'type == subscription',
    action: 'route_to_stripe',
    provider: 'Stripe',
    isActive: false,
    savings: 0,
    transactions: 0,
  },
];

export default function RoutingPage() {
  return (
    <>
      <Header
        title="Routing Rules"
        subtitle="Configure intelligent payment routing"
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Rule
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Active Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">
                {mockRules.filter(r => r.isActive).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Total Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-400">
                ${mockRules.reduce((acc, r) => acc + r.savings, 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Routed Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">
                {mockRules.reduce((acc, r) => acc + r.transactions, 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Rules List */}
        <div className="space-y-4">
          {mockRules.map(rule => (
            <Card key={rule.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-zinc-800 rounded-lg">
                      <GitBranch className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-white">{rule.name}</h3>
                        <Badge variant={rule.isActive ? 'success' : 'default'}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-400 mb-2">{rule.description}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <code className="px-2 py-1 bg-zinc-800 rounded text-cyan-400">
                          {rule.condition}
                        </code>
                        <ArrowRight className="w-4 h-4 text-zinc-600" />
                        <span className="text-zinc-300">{rule.provider}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {rule.isActive && (
                      <div className="text-right">
                        <p className="text-sm text-zinc-400">Saved</p>
                        <p className="text-lg font-semibold text-emerald-400">${rule.savings}</p>
                      </div>
                    )}
                    <button className="p-2 text-zinc-400 hover:text-white">
                      {rule.isActive ? (
                        <ToggleRight className="w-6 h-6 text-cyan-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
