'use client';

import React, { useState, useEffect } from 'react';
import { Plus, GitBranch, ArrowRight, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { routingRulesApi, RoutingRule } from '@/lib/api/routing';

export default function RoutingPage() {
  const { selectedCompanyId } = useHierarchy();
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRules = async () => {
    if (!selectedCompanyId) {
      setRules([]);
      setLoading(false);
      return;
    }

    try {
      const data = await routingRulesApi.list(selectedCompanyId);
      setRules(data);
    } catch (error) {
      console.error('Failed to load routing rules:', error);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadRules();
  }, [selectedCompanyId]);

  const toggleRuleStatus = async (rule: RoutingRule) => {
    try {
      const newStatus = rule.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await routingRulesApi.update(rule.id, { status: newStatus });
      await loadRules();
    } catch (error) {
      console.error('Failed to toggle rule status:', error);
    }
  };

  // Calculate summary stats
  const activeRules = rules.filter(r => r.status === 'ACTIVE').length;
  const totalMatches = rules.reduce((acc, r) => acc + r.matchCount, 0);

  // Format condition for display
  const formatCondition = (rule: RoutingRule): string => {
    const parts: string[] = [];

    if (rule.conditions.amount?.min) parts.push(`amount > $${rule.conditions.amount.min}`);
    if (rule.conditions.amount?.max) parts.push(`amount < $${rule.conditions.amount.max}`);
    if (rule.conditions.geo?.currencies?.length) parts.push(`currency in [${rule.conditions.geo.currencies.join(', ')}]`);
    if (rule.conditions.geo?.countries?.length) parts.push(`country in [${rule.conditions.geo.countries.join(', ')}]`);
    if (rule.conditions.geo?.internationalOnly) parts.push('international only');
    if (rule.conditions.paymentMethod?.cardBrands?.length) parts.push(`card in [${rule.conditions.paymentMethod.cardBrands.join(', ')}]`);
    if (rule.conditions.customer?.isNewCustomer) parts.push('new customer');

    return parts.length > 0 ? parts.join(' && ') : 'All transactions';
  };

  // Format action for display
  const formatAction = (rule: RoutingRule): string => {
    if (rule.actions.length === 0) return 'No action';

    const action = rule.actions[0];
    switch (action.type) {
      case 'ROUTE_TO_POOL': return `Route to Pool`;
      case 'ROUTE_TO_ACCOUNT': return `Route to Account`;
      case 'BLOCK': return `Block: ${action.blockReason || 'Blocked'}`;
      case 'FLAG_FOR_REVIEW': return `Flag for Review`;
      case 'REQUIRE_3DS': return `Require 3DS`;
      case 'APPLY_SURCHARGE': return `+${action.surchargeValue}${action.surchargeType === 'percentage' ? '%' : ''}`;
      default: return action.type.toLowerCase().replace(/_/g, ' ');
    }
  };

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
              <p className="text-2xl font-bold text-white">{activeRules}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Total Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{rules.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Total Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-cyan-400">{totalMatches.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 flex items-center justify-center">
            <div className="flex items-center gap-3 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading routing rules...</span>
            </div>
          </div>
        ) : !selectedCompanyId ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
            <p className="text-zinc-400">Select a company to view routing rules</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
            <GitBranch className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 mb-4">No routing rules configured</p>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Rule
            </Button>
          </div>
        ) : (
          /* Rules List */
          <div className="space-y-4">
            {rules.map(rule => (
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
                          <Badge variant={rule.status === 'ACTIVE' ? 'success' : rule.status === 'TESTING' ? 'warning' : 'default'}>
                            {rule.status.toLowerCase()}
                          </Badge>
                          <span className="text-xs text-zinc-500">Priority: {rule.priority}</span>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-zinc-400 mb-2">{rule.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <code className="px-2 py-1 bg-zinc-800 rounded text-cyan-400">
                            {formatCondition(rule)}
                          </code>
                          <ArrowRight className="w-4 h-4 text-zinc-600" />
                          <span className="text-zinc-300">{formatAction(rule)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {rule.matchCount > 0 && (
                        <div className="text-right">
                          <p className="text-sm text-zinc-400">Matches</p>
                          <p className="text-lg font-semibold text-white">{rule.matchCount.toLocaleString()}</p>
                        </div>
                      )}
                      <button
                        className="p-2 text-zinc-400 hover:text-white"
                        onClick={() => toggleRuleStatus(rule)}
                      >
                        {rule.status === 'ACTIVE' ? (
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
        )}
      </div>
    </>
  );
}
