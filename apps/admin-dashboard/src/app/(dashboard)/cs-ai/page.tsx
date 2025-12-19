'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Bot,
  MessageSquare,
  Phone,
  Users,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Brain,
  Headphones,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { csAiApi, CSSession, CSAnalytics, CSTier } from '@/lib/api/cs-ai';

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function TierBadge({ tier }: { tier: CSTier }) {
  const config: Record<CSTier, { label: string; color: string; icon: typeof Bot }> = {
    AI_REP: { label: 'AI Rep', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Bot },
    AI_MANAGER: { label: 'AI Manager', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Brain },
    HUMAN_AGENT: { label: 'Human', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: Headphones },
  };
  const c = config[tier] || config.AI_REP;
  const Icon = c.icon;

  return (
    <Badge variant="outline" className={cn('font-medium', c.color)}>
      <Icon className="w-3 h-3 mr-1" />
      {c.label}
    </Badge>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    ESCALATED: { label: 'Escalated', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    RESOLVED: { label: 'Resolved', color: 'bg-muted text-muted-foreground border-border' },
    ABANDONED: { label: 'Abandoned', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  };
  const c = config[status] || config.ACTIVE;

  return (
    <Badge variant="outline" className={cn('font-medium', c.color)}>
      {c.label}
    </Badge>
  );
}

function SentimentIndicator({ sentiment }: { sentiment: string }) {
  const config: Record<string, { color: string; bg: string }> = {
    HAPPY: { color: 'bg-green-500', bg: 'bg-green-500/20' },
    SATISFIED: { color: 'bg-green-400', bg: 'bg-green-400/20' },
    NEUTRAL: { color: 'bg-gray-400', bg: 'bg-gray-400/20' },
    FRUSTRATED: { color: 'bg-amber-400', bg: 'bg-amber-400/20' },
    ANGRY: { color: 'bg-orange-500', bg: 'bg-orange-500/20' },
    IRATE: { color: 'bg-red-500', bg: 'bg-red-500/20' },
  };
  const c = config[sentiment] || config.NEUTRAL;

  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-2 h-2 rounded-full', c.color)} />
      <span className="text-xs text-muted-foreground capitalize">{sentiment.toLowerCase()}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function CSAIDashboardPage() {
  const { selectedCompanyId } = useHierarchy();
  const [analytics, setAnalytics] = useState<CSAnalytics | null>(null);
  const [activeSessions, setActiveSessions] = useState<CSSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const companyId = selectedCompanyId || 'default';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const [analyticsData, sessionsData] = await Promise.all([
        csAiApi.getAnalytics(
          companyId,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        ).catch((err) => {
          console.error('Failed to load analytics:', err);
          return null;
        }),
        csAiApi.getSessions(companyId, { status: 'ACTIVE', limit: 10 }).catch((err) => {
          console.error('Failed to load sessions:', err);
          return { items: [], total: 0 };
        }),
      ]);

      setAnalytics(analyticsData);
      setActiveSessions(sessionsData.items);
    } catch (err) {
      console.error('Failed to load CS AI data:', err);
      setAnalytics(null);
      setActiveSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <>
        <Header title="CS AI Dashboard" subtitle="AI-powered customer service" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  const overview = analytics?.overview;
  const hasData = analytics !== null;

  return (
    <>
      <Header
        title="CS AI Dashboard"
        subtitle="AI-powered customer service"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" asChild>
              <Link href="/cs-ai/conversations">
                <MessageSquare className="w-4 h-4 mr-2" />
                View All
              </Link>
            </Button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{overview?.totalSessions?.toLocaleString() ?? '0'}</p>
                  <p className="text-xs text-muted-foreground">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{overview?.resolutionRate ?? 0}%</p>
                  <p className="text-xs text-muted-foreground">Resolution Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{overview?.avgResolutionTime ?? 0}m</p>
                  <p className="text-xs text-muted-foreground">Avg Resolution</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{overview?.customerSatisfactionAvg ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">Satisfaction</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance by Tier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance by Tier</CardTitle>
            <CardDescription>Resolution rates across AI tiers</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.byTier && analytics.byTier.length > 0 ? (
              <div className="space-y-4">
                {analytics.byTier.map((tier) => (
                  <div key={tier.tier} className="flex items-center gap-4">
                    <div className="w-28">
                      <TierBadge tier={tier.tier as CSTier} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">
                          {tier.resolved} / {tier.sessions} resolved
                        </span>
                        <span className="text-sm font-medium">{tier.resolutionRate}%</span>
                      </div>
                      <Progress value={tier.resolutionRate} className="h-2" />
                    </div>
                    <div className="w-20 text-right">
                      <span className="text-sm text-muted-foreground">{tier.avgTime}m avg</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No tier data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Active Sessions</CardTitle>
                  <CardDescription>{activeSessions.length} ongoing conversations</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/cs-ai/conversations">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No active sessions</p>
                </div>
              ) : (
                activeSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/cs-ai/conversations/${session.id}`}
                    className="block p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {session.customer?.firstName} {session.customer?.lastName}
                        </span>
                        <TierBadge tier={session.currentTier as CSTier} />
                      </div>
                      <SessionStatusBadge status={session.status} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                          {session.issueCategory || 'General'}
                        </span>
                        <SentimentIndicator sentiment={session.customerSentiment} />
                      </div>
                      <span className="text-muted-foreground">
                        {Math.round((Date.now() - new Date(session.createdAt).getTime()) / 60000)}m ago
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Escalation Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Escalations This Week</CardTitle>
              <CardDescription>Top reasons for tier escalation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics?.escalations?.byReason && Object.keys(analytics.escalations.byReason).length > 0 ? (
                <>
                  {Object.entries(analytics.escalations.byReason)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between">
                        <span className="text-sm capitalize">
                          {reason.toLowerCase().replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={(count / (analytics.escalations.total || 1)) * 100}
                            className="w-24 h-2"
                          />
                          <span className="text-sm text-muted-foreground w-8">{count}</span>
                        </div>
                      </div>
                    ))}
                  <div className="pt-2 border-t border-border flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Escalations</span>
                    <span className="font-medium">{analytics.escalations.total}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No escalation data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/cs-ai/conversations"
            className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-medium">Conversations</p>
                <p className="text-xs text-muted-foreground">View all chat sessions</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
          <Link
            href="/cs-ai/voice"
            className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Phone className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="font-medium">Voice AI</p>
                <p className="text-xs text-muted-foreground">Call management</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
          <Link
            href="/cs-ai/analytics"
            className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium">Analytics</p>
                <p className="text-xs text-muted-foreground">Performance reports</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </>
  );
}
