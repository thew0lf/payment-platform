'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  Loader2,
  AlertCircle,
  Zap,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  churnApi,
  HighRiskCustomer,
  ChurnRiskScore,
} from '@/lib/api/momentum';

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function RiskLevelBadge({ level }: { level: string }) {
  const config: Record<string, { color: string; bg: string }> = {
    CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    HIGH: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    MEDIUM: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    LOW: { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  };
  const c = config[level] || config.LOW;

  return (
    <Badge variant="outline" className={cn('font-medium', c.color, c.bg)}>
      {level}
    </Badge>
  );
}

function TrendIndicator({ trend }: { trend: 'IMPROVING' | 'STABLE' | 'DECLINING' }) {
  if (trend === 'IMPROVING') {
    return (
      <span className="flex items-center gap-1 text-green-400 text-xs">
        <ArrowDownRight className="w-3 h-3" />
        Improving
      </span>
    );
  }
  if (trend === 'DECLINING') {
    return (
      <span className="flex items-center gap-1 text-red-400 text-xs">
        <ArrowUpRight className="w-3 h-3" />
        Declining
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-muted-foreground text-xs">
      <Minus className="w-3 h-3" />
      Stable
    </span>
  );
}

function RiskScoreGauge({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-red-400';
    if (s >= 60) return 'text-orange-400';
    if (s >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getBgColor = (s: number) => {
    if (s >= 80) return 'bg-red-500';
    if (s >= 60) return 'bg-orange-500';
    if (s >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={cn('relative', size === 'lg' ? 'w-32 h-32' : 'w-16 h-16')}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/30"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={`${score * 2.83} 283`}
          strokeLinecap="round"
          className={getBgColor(score)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', getColor(score), size === 'lg' ? 'text-3xl' : 'text-lg')}>
          {score}
        </span>
        {size === 'lg' && <span className="text-xs text-muted-foreground">Risk Score</span>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function ChurnRiskDashboardPage() {
  const { selectedCompanyId } = useHierarchy();
  const [highRiskCustomers, setHighRiskCustomers] = useState<HighRiskCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>('all');

  // Summary stats (mock for now, would come from API)
  const [stats, setStats] = useState({
    totalAtRisk: 0,
    critical: 0,
    high: 0,
    medium: 0,
    avgRiskScore: 0,
    revenueAtRisk: 0,
    weeklyChange: 0,
  });

  const companyId = selectedCompanyId || 'default';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await churnApi.getHighRiskCustomers(companyId, {
        limit: 50,
        minScore: riskFilter === 'all' ? 30 : riskFilter === 'critical' ? 80 : riskFilter === 'high' ? 60 : 40,
      });

      setHighRiskCustomers(result.items);

      // Calculate summary stats
      const critical = result.items.filter(c => c.riskLevel === 'CRITICAL').length;
      const high = result.items.filter(c => c.riskLevel === 'HIGH').length;
      const medium = result.items.filter(c => c.riskLevel === 'MEDIUM').length;
      const avgScore = result.items.length > 0
        ? Math.round(result.items.reduce((sum, c) => sum + c.riskScore, 0) / result.items.length)
        : 0;
      const revenue = result.items.reduce((sum, c) => sum + (c.lifetimeValue || 0), 0);

      setStats({
        totalAtRisk: result.total,
        critical,
        high,
        medium,
        avgRiskScore: avgScore,
        revenueAtRisk: revenue,
        weeklyChange: 0,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load churn data');
      // Clear data on error - no mock/fake data
      setHighRiskCustomers([]);
      setStats({
        totalAtRisk: 0,
        critical: 0,
        high: 0,
        medium: 0,
        avgRiskScore: 0,
        revenueAtRisk: 0,
        weeklyChange: 0,
      });
      toast.error('Failed to load churn data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, riskFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInitiateSaveFlow = async (customerId: string) => {
    toast.success('Save flow initiated');
    // Would call saveFlowApi.initiate here
  };

  return (
    <>
      <Header
        title="Churn Risk Dashboard"
        subtitle="Monitor and intervene on at-risk customers"
        actions={
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.totalAtRisk}</p>
                  <p className="text-xs text-muted-foreground">At-Risk Customers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Activity className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.avgRiskScore}</p>
                  <p className="text-xs text-muted-foreground">Avg Risk Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">${(stats.revenueAtRisk / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-muted-foreground">Revenue at Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats.weeklyChange}%</p>
                  <p className="text-xs text-muted-foreground">Week over Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Level Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Level Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">Critical: {stats.critical}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm">High: {stats.high}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm">Medium: {stats.medium}</span>
              </div>
            </div>
            <div className="mt-3 flex h-2 rounded-full overflow-hidden bg-muted">
              <div
                className="bg-red-500"
                style={{ width: `${(stats.critical / stats.totalAtRisk) * 100}%` }}
              />
              <div
                className="bg-orange-500"
                style={{ width: `${(stats.high / stats.totalAtRisk) * 100}%` }}
              />
              <div
                className="bg-yellow-500"
                style={{ width: `${(stats.medium / stats.totalAtRisk) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">High-Risk Customers</h2>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="critical">Critical Only</SelectItem>
              <SelectItem value="high">High & Above</SelectItem>
              <SelectItem value="medium">Medium & Above</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Customer List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : highRiskCustomers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No at-risk customers</h3>
              <p className="text-muted-foreground">
                Great news! No customers currently match your risk criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {highRiskCustomers.map((customer) => (
              <Card key={customer.customerId} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <RiskScoreGauge score={customer.riskScore} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/customers/${customer.customerId}`}
                            className="font-medium hover:text-primary"
                          >
                            {customer.customerName}
                          </Link>
                          <RiskLevelBadge level={customer.riskLevel} />
                          <TrendIndicator trend={customer.trend} />
                        </div>
                        <p className="text-sm text-muted-foreground">{customer.customerEmail}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>LTV: ${customer.lifetimeValue.toLocaleString()}</span>
                          {customer.lastOrderDate && (
                            <span>Last order: {new Date(customer.lastOrderDate).toLocaleDateString()}</span>
                          )}
                        </div>
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Top Risk Factors:</p>
                          <div className="flex flex-wrap gap-1">
                            {customer.topFactors.map((factor, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleInitiateSaveFlow(customer.customerId)}
                      >
                        <Zap className="w-4 h-4 mr-1" />
                        Save Flow
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/customers/${customer.customerId}`}>
                          View <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
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
