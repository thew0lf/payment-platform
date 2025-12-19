'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Phone,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  DollarSign,
  Bot,
  Brain,
  Headphones,
  Calendar,
} from 'lucide-react';
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
import { csAiApi, CSAnalytics, CSTier } from '@/lib/api/cs-ai';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface BillingMetrics {
  totalRevenue: number;
  chatMinutes: number;
  voiceMinutes: number;
  avgRevenuePerSession: number;
  byClient: {
    clientId: string;
    clientName: string;
    sessions: number;
    minutes: number;
    revenue: number;
  }[];
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof TrendingUp;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn('p-2 rounded-lg', iconBg)}>
            <Icon className={cn('w-5 h-5', iconColor)} />
          </div>
          {trend && trendValue && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground'
            )}>
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" />}
              {trendValue}
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TierPerformanceBar({
  tier,
  sessions,
  resolved,
  avgTime,
  totalSessions,
}: {
  tier: CSTier;
  sessions: number;
  resolved: number;
  avgTime: number;
  totalSessions: number;
}) {
  const config: Record<CSTier, { label: string; color: string; icon: typeof Bot }> = {
    AI_REP: { label: 'AI Rep', color: 'bg-blue-500', icon: Bot },
    AI_MANAGER: { label: 'AI Manager', color: 'bg-purple-500', icon: Brain },
    HUMAN_AGENT: { label: 'Human Agent', color: 'bg-green-500', icon: Headphones },
  };
  const c = config[tier];
  const Icon = c.icon;
  const percentage = totalSessions > 0 ? Math.round((sessions / totalSessions) * 100) : 0;
  const resolutionRate = sessions > 0 ? Math.round((resolved / sessions) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{c.label}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>{sessions} sessions</span>
          <span className="text-muted-foreground">{resolutionRate}% resolved</span>
          <span className="text-muted-foreground">{avgTime}m avg</span>
        </div>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', c.color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function SentimentDistribution({
  distribution,
}: {
  distribution: Record<string, number>;
}) {
  const colors: Record<string, string> = {
    HAPPY: 'bg-green-500',
    SATISFIED: 'bg-green-400',
    NEUTRAL: 'bg-gray-400',
    FRUSTRATED: 'bg-amber-400',
    ANGRY: 'bg-orange-500',
    IRATE: 'bg-red-500',
  };

  const total = Object.values(distribution).reduce((sum, v) => sum + v, 0);

  return (
    <div className="space-y-3">
      {Object.entries(distribution)
        .sort(([, a], [, b]) => b - a)
        .map(([sentiment, count]) => {
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={sentiment} className="flex items-center gap-3">
              <div className={cn('w-3 h-3 rounded-full', colors[sentiment] || 'bg-gray-400')} />
              <span className="text-sm capitalize w-24">{sentiment.toLowerCase()}</span>
              <div className="flex-1">
                <Progress value={percentage} className="h-2" />
              </div>
              <span className="text-sm text-muted-foreground w-12 text-right">{count}</span>
              <span className="text-sm text-muted-foreground w-12 text-right">{percentage}%</span>
            </div>
          );
        })}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function CSAIAnalyticsPage() {
  const { selectedCompanyId } = useHierarchy();
  const [analytics, setAnalytics] = useState<CSAnalytics | null>(null);
  const [billing, setBilling] = useState<BillingMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  const companyId = selectedCompanyId || 'default';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();

      switch (dateRange) {
        case '24h':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      const data = await csAiApi
        .getAnalytics(companyId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
        .catch((err) => {
          console.error('Failed to load analytics:', err);
          return null;
        });

      setAnalytics(data);
      // Billing data would come from a separate endpoint - set to null until implemented
      setBilling(null);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setAnalytics(null);
      setBilling(null);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <>
        <Header title="CS AI Analytics" subtitle="Performance metrics and insights" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!analytics) {
    return (
      <>
        <Header
          title="CS AI Analytics"
          subtitle="Performance metrics, billing, and insights"
          actions={
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          }
        />
        <div className="p-4 sm:p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BarChart3 className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium mb-2">No Analytics Data</p>
              <p className="text-muted-foreground text-center max-w-md">
                No CS AI analytics data is available for the selected period.
                Start creating support sessions to see metrics here.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const overview = analytics.overview;

  return (
    <>
      <Header
        title="CS AI Analytics"
        subtitle="Performance metrics, billing, and insights"
        actions={
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[130px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Overview Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            title="Total Sessions"
            value={overview?.totalSessions.toLocaleString() || 0}
            subtitle="Support interactions"
            icon={MessageSquare}
            trend="up"
            trendValue="+12%"
          />
          <MetricCard
            title="Resolution Rate"
            value={`${overview?.resolutionRate}%`}
            subtitle="Successfully resolved"
            icon={CheckCircle}
            iconColor="text-green-400"
            iconBg="bg-green-500/10"
            trend="up"
            trendValue="+3%"
          />
          <MetricCard
            title="Avg Resolution"
            value={`${overview?.avgResolutionTime}m`}
            subtitle="Time to resolve"
            icon={Clock}
            iconColor="text-amber-400"
            iconBg="bg-amber-500/10"
            trend="down"
            trendValue="-15%"
          />
          <MetricCard
            title="CSAT Score"
            value={overview?.customerSatisfactionAvg || 0}
            subtitle="Out of 5.0"
            icon={TrendingUp}
            iconColor="text-purple-400"
            iconBg="bg-purple-500/10"
            trend="up"
            trendValue="+0.2"
          />
          <MetricCard
            title="Escalations"
            value={analytics?.escalations.total || 0}
            subtitle={`${analytics?.escalations.escalationRate}% rate`}
            icon={AlertTriangle}
            iconColor="text-orange-400"
            iconBg="bg-orange-500/10"
            trend="down"
            trendValue="-8%"
          />
          <MetricCard
            title="Total Revenue"
            value={`$${billing?.totalRevenue.toLocaleString() || 0}`}
            subtitle="Billable usage"
            icon={DollarSign}
            iconColor="text-green-400"
            iconBg="bg-green-500/10"
            trend="up"
            trendValue="+18%"
          />
        </div>

        {/* Tier Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance by Tier</CardTitle>
            <CardDescription>Resolution rates and efficiency across AI tiers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {analytics?.byTier.map((tier) => (
              <TierPerformanceBar
                key={tier.tier}
                tier={tier.tier as CSTier}
                sessions={tier.sessions}
                resolved={tier.resolved}
                avgTime={tier.avgTime}
                totalSessions={overview?.totalSessions || 0}
              />
            ))}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channel Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By Channel</CardTitle>
              <CardDescription>Sessions by communication channel</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.byChannel.map((channel) => {
                  const percentage = overview?.totalSessions
                    ? Math.round((channel.sessions / overview.totalSessions) * 100)
                    : 0;
                  return (
                    <div key={channel.channel} className="flex items-center gap-4">
                      <div className="w-16 capitalize font-medium text-sm">{channel.channel}</div>
                      <div className="flex-1">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <div className="text-sm text-muted-foreground w-20 text-right">
                        {channel.sessions} ({percentage}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sentiment Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sentiment Distribution</CardTitle>
              <CardDescription>Customer sentiment across sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <SentimentDistribution distribution={analytics?.sentiment.distribution || {}} />
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sentiment Improvement</span>
                <span className="font-medium text-green-400">
                  {analytics?.sentiment.sentimentImprovement}% improved during session
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Issues</CardTitle>
              <CardDescription>Most common support topics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics?.topIssues.map((issue, i) => (
                  <div key={issue.issue} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <span className="text-sm font-medium">{issue.issue}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>{issue.count} sessions</span>
                      <span className="text-muted-foreground">{issue.avgResolutionTime}m avg</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Escalation Reasons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Escalation Reasons</CardTitle>
              <CardDescription>Why sessions escalate to higher tiers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analytics?.escalations.byReason || {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([reason, count]) => {
                    const percentage = analytics?.escalations.total
                      ? Math.round((count / analytics.escalations.total) * 100)
                      : 0;
                    return (
                      <div key={reason} className="flex items-center gap-3">
                        <span className="text-sm capitalize flex-1">
                          {reason.toLowerCase().replace(/_/g, ' ')}
                        </span>
                        <Progress value={percentage} className="w-24 h-2" />
                        <span className="text-sm text-muted-foreground w-16 text-right">
                          {count} ({percentage}%)
                        </span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Billing by Client */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Billing by Client
            </CardTitle>
            <CardDescription>Revenue breakdown for billing purposes</CardDescription>
          </CardHeader>
          <CardContent>
            {billing ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 font-medium text-muted-foreground text-sm">Client</th>
                      <th className="pb-3 font-medium text-muted-foreground text-sm text-right">Sessions</th>
                      <th className="pb-3 font-medium text-muted-foreground text-sm text-right">Minutes</th>
                      <th className="pb-3 font-medium text-muted-foreground text-sm text-right">Revenue</th>
                      <th className="pb-3 font-medium text-muted-foreground text-sm text-right">Avg/Session</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {billing.byClient.map((client) => (
                      <tr key={client.clientId}>
                        <td className="py-3 font-medium">{client.clientName}</td>
                        <td className="py-3 text-right">{client.sessions}</td>
                        <td className="py-3 text-right">{client.minutes.toLocaleString()}</td>
                        <td className="py-3 text-right text-green-400 font-medium">
                          ${client.revenue.toFixed(2)}
                        </td>
                        <td className="py-3 text-right text-muted-foreground">
                          ${(client.revenue / client.sessions).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td className="pt-3 font-semibold">Total</td>
                      <td className="pt-3 text-right font-semibold">
                        {billing.byClient.reduce((sum, c) => sum + c.sessions, 0)}
                      </td>
                      <td className="pt-3 text-right font-semibold">
                        {billing.byClient.reduce((sum, c) => sum + c.minutes, 0).toLocaleString()}
                      </td>
                      <td className="pt-3 text-right font-semibold text-green-400">
                        ${billing.totalRevenue.toFixed(2)}
                      </td>
                      <td className="pt-3 text-right text-muted-foreground">
                        ${billing.avgRevenuePerSession.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No billing data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance by Category</CardTitle>
            <CardDescription>Issue categories and resolution metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Category</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm text-right">Count</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm text-right">Avg Time</th>
                    <th className="pb-3 font-medium text-muted-foreground text-sm">Top Resolutions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analytics?.byCategory.map((cat) => (
                    <tr key={cat.category}>
                      <td className="py-3 font-medium capitalize">
                        {cat.category.toLowerCase().replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 text-right">{cat.count}</td>
                      <td className="py-3 text-right">{cat.avgResolutionTime}m</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {cat.topResolutions.slice(0, 2).map((res, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {res.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
