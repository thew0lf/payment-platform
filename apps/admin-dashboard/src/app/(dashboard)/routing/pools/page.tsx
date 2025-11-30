'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Landmark, CreditCard, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { accountPoolsApi, AccountPool, BalancingStrategy } from '@/lib/api/routing';

const strategyLabels: Record<BalancingStrategy, string> = {
  WEIGHTED: 'Weighted',
  ROUND_ROBIN: 'Round Robin',
  LEAST_LOAD: 'Least Load',
  CAPACITY: 'Capacity',
  LOWEST_COST: 'Lowest Cost',
  LOWEST_LATENCY: 'Lowest Latency',
  HIGHEST_SUCCESS: 'Highest Success',
  PRIORITY: 'Priority',
};

export default function AccountPoolsPage() {
  const { selectedCompanyId } = useHierarchy();
  const [pools, setPools] = useState<AccountPool[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPools = async () => {
    if (!selectedCompanyId) {
      setPools([]);
      setLoading(false);
      return;
    }

    try {
      const data = await accountPoolsApi.list(selectedCompanyId);
      setPools(data);
    } catch (error) {
      console.error('Failed to load account pools:', error);
      setPools([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadPools();
  }, [selectedCompanyId]);

  // Calculate summary stats
  const activePools = pools.filter(p => p.status === 'active').length;
  const totalAccounts = pools.reduce((acc, p) => acc + p.accounts.length, 0);

  return (
    <>
      <Header
        title="Account Pools"
        subtitle="Manage merchant account pools for intelligent routing"
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Pool
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Active Pools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{activePools}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Total Pools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{pools.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Total Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-cyan-400">{totalAccounts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">Failover Enabled</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-400">
                {pools.filter(p => p.failover?.enabled).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 flex items-center justify-center">
            <div className="flex items-center gap-3 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading account pools...</span>
            </div>
          </div>
        ) : !selectedCompanyId ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
            <p className="text-zinc-400">Select a company to view account pools</p>
          </div>
        ) : pools.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
            <Landmark className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 mb-4">No account pools configured</p>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Pool
            </Button>
          </div>
        ) : (
          /* Pools List */
          <div className="space-y-4">
            {pools.map(pool => (
              <Card key={pool.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-zinc-800 rounded-lg">
                        <Landmark className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white">{pool.name}</h3>
                          <Badge variant={pool.status === 'active' ? 'success' : pool.status === 'draining' ? 'warning' : 'default'}>
                            {pool.status}
                          </Badge>
                          <Badge variant="outline">
                            {strategyLabels[pool.balancingStrategy] || pool.balancingStrategy}
                          </Badge>
                        </div>
                        {pool.description && (
                          <p className="text-sm text-zinc-400">{pool.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <p className="text-sm text-zinc-400">Accounts</p>
                        <p className="text-lg font-semibold text-white">{pool.accounts.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">Failover</p>
                        <p className={cn(
                          "text-lg font-semibold",
                          pool.failover?.enabled ? "text-emerald-400" : "text-zinc-500"
                        )}>
                          {pool.failover?.enabled ? `${pool.failover.maxAttempts} retries` : 'Off'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Accounts in Pool */}
                  {pool.accounts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      <p className="text-sm text-zinc-500 mb-3">Accounts in Pool</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {pool.accounts.map(account => (
                          <div
                            key={account.accountId}
                            className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800"
                          >
                            <div className="flex items-center gap-3">
                              <CreditCard className="w-4 h-4 text-zinc-500" />
                              <div>
                                <p className="text-sm font-medium text-white">{account.accountName}</p>
                                <p className="text-xs text-zinc-500">{account.providerType}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-400">{account.weight}%</span>
                              {account.isActive ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-yellow-400" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Health Routing Info */}
                  {pool.healthRouting?.enabled && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500">
                        Health routing enabled: Min {pool.healthRouting.minSuccessRate}% success rate,
                        Max {pool.healthRouting.maxLatencyMs}ms latency
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
